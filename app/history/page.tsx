"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { checkQuota, getMessageMaxLength, UserTier } from "../../utils/quota";
import LangDropdown from "../components/LangDropdown";
import { useApp } from "../../context/AppContext";

type HistoryEntry = {
  id: string;       // UUID Supabase
  title: string;
  date: string;
  messages: string[];
};

const normalizeTier = (raw: string | null | undefined): UserTier => {
  if (!raw) return "connected_free";
  const c = raw.toLowerCase().trim();
  if (c === "free" || c === "connected_free") return "connected_free";
  if (["basic","premium","ultra","founder"].includes(c)) return c as UserTier;
  return "connected_free";
};

export default function HistoryPage() {
  const { t, lang, theme, toggleTheme } = useApp();
  const [history,        setHistory]        = useState<HistoryEntry[]>([]);
  const [viewingHistory, setViewingHistory] = useState<HistoryEntry | null>(null);
  const [chatMessages,   setChatMessages]   = useState<string[]>([]);
  const [activeChatId,   setActiveChatId]   = useState<string | null>(null);
  const [input,          setInput]          = useState("");
  const [isLoaded,       setIsLoaded]       = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [user,          setUser]          = useState<any>(null);
  const [userTier,      setUserTier]      = useState<UserTier>("connected_free");
  const [isPageBlocked, setIsPageBlocked] = useState(true);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [activeLimitCategory, setActiveLimitCategory] = useState<"vitality_actions"|"calendar">("vitality_actions");

  const [leftWidth, setLeftWidth] = useState(450);
  const isResizing = useRef(false);

  const lastEchoIndex = chatMessages.findLastIndex(m => /^Echo\s*:/i.test(m));

  // ── BOOTSTRAP ─────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setIsPageBlocked(true); setIsLoaded(true); return; }

      const uid = data.user.id;
      setUser(data.user);

      // Tier depuis profiles
      const { data: profile } = await supabase.from("profiles").select("user_tier").eq("id", uid).single();
      const tier = normalizeTier(profile?.user_tier);
      setUserTier(tier);
      setIsPageBlocked(tier === "connected_free" || tier === "basic");

      if (tier !== "connected_free" && tier !== "basic") {
        // 1. Charger les entrées History depuis echo_conversations source="history"
        const { data: histRows } = await supabase
          .from("echo_conversations")
          .select("id, messages, updated_at")
          .eq("user_id", uid)
          .eq("source", "history")
          .order("updated_at", { ascending: false });

        if (histRows?.length) {
          setHistory(histRows.map(r => ({
            id:       r.id,
            title:    `History - ${new Date(r.updated_at).toLocaleString("fr-CA")}`,
            date:     new Date(r.updated_at).toLocaleString("fr-CA"),
            messages: r.messages || [],
          })));
        }

        // 2. Charger la conversation Chat active (source="chat", la plus récente)
        const { data: chatRows } = await supabase
          .from("echo_conversations")
          .select("id, messages")
          .eq("user_id", uid)
          .eq("source", "chat")
          .order("updated_at", { ascending: false })
          .limit(1);

        if (chatRows?.[0]) {
          setActiveChatId(chatRows[0].id);
          setChatMessages(chatRows[0].messages || []);
        }
      }

      setIsLoaded(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) {
        setUser(null); setUserTier("connected_free"); setIsPageBlocked(true);
        setChatMessages([]); setHistory([]); setActiveChatId(null);
        return;
      }
      const uid = session.user.id;
      setUser(session.user);
      const { data: profile } = await supabase.from("profiles").select("user_tier").eq("id", uid).single();
      const tier = normalizeTier(profile?.user_tier);
      setUserTier(tier);
      setIsPageBlocked(tier === "connected_free" || tier === "basic");
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  // ── SAUVEGARDER UNE ENTRÉE HISTORY dans Supabase ─────────────────────────
  const saveHistoryEntry = async (msgs: string[]) => {
    if (!user || msgs.length === 0) return;
    const { data, error } = await supabase
      .from("echo_conversations")
      .insert({
        user_id:    user.id,
        source:     "history",
        messages:   msgs,
        updated_at: new Date().toISOString(),
      })
      .select("id, updated_at")
      .single();
    if (error) { console.error("[History] save entry:", error.message); return; }
    const entry: HistoryEntry = {
      id:       data.id,
      title:    `History - ${new Date(data.updated_at).toLocaleString("fr-CA")}`,
      date:     new Date(data.updated_at).toLocaleString("fr-CA"),
      messages: msgs,
    };
    setHistory(prev => [entry, ...prev]);
  };

  // ── SUPPRIMER UNE ENTRÉE ──────────────────────────────────────────────────
  const deleteEntry = async (id: string) => {
    if (user) {
      const { error } = await supabase
        .from("echo_conversations")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) console.error("[History] delete entry:", error.message);
    }
    setHistory(prev => prev.filter(e => e.id !== id));
    if (viewingHistory?.id === id) setViewingHistory(null);
  };

  // ── SAUVEGARDER LES MESSAGES CHAT ACTIFS en Supabase (debounce) ──────────
  const chatSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChatToDB = (msgs: string[]) => {
    if (!user || !activeChatId) return;
    if (chatSaveRef.current) clearTimeout(chatSaveRef.current);
    chatSaveRef.current = setTimeout(async () => {
      const { error } = await supabase
        .from("echo_conversations")
        .update({ messages: msgs, updated_at: new Date().toISOString() })
        .eq("id", activeChatId)
        .eq("user_id", user.id);
      if (error) console.error("[History] update chat:", error.message);

      // Auto-archive tous les 2000 chars
      const totalChars = msgs.join("").length;
      const threshold  = Math.floor(totalChars / 2000) * 2000;
      if (threshold > 0 && threshold % 2000 === 0) {
        await saveHistoryEntry(msgs);
      }
    }, 1500);
  };

  // ── RESIZE ────────────────────────────────────────────────────────────────
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      setLeftWidth(Math.max(300, Math.min(800, ev.clientX - 224)));
    };
    const onUp = () => { isResizing.current = false; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // ── SEND MESSAGE ──────────────────────────────────────────────────────────
  const sendMessage = async (forcedText?: string) => {
    const textToSubmit = forcedText ?? input;
    if (!textToSubmit.trim() || !user || isPageBlocked) return;

    

    const baseMessages = [...chatMessages, `You: ${textToSubmit}`];
    setChatMessages([...baseMessages, "Echo: ..."]);
    if (!forcedText) setInput("");

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSubmit,
          image: null,
          history: baseMessages,
          userTier,
          calendarEvents: {},
        }),
      });
      const data = await response.json();
      const echoText = data.response || "";

      if (data.action) {
        const { type } = data.action;
        const qCat: "vitality_actions"|"calendar" = (type === "ADD_BUDGET_EXPENSE" || type === "ADD_CALORIE_LOG" || type === "SET_CALORIE_GOAL" || type === "UPDATE_CALORIE_GOAL") ? "vitality_actions" : "calendar";
        const status = checkQuota(qCat, userTier);
        if (!status.allowed) {
          setChatMessages([...baseMessages, `Echo: ${echoText}\n\n[Action bloquee — quota ${qCat}]`]);
          setActiveLimitCategory(qCat); setShowLimitModal(true); return;
        }
      }

      const finalMsgs = [...baseMessages, `Echo: ${echoText}`];
      setChatMessages(finalMsgs);
      saveChatToDB(finalMsgs);

      // ── Actions Echo → Supabase ──────────────────────────────────────────
      if (data.action && user) {
        const { type, payload } = data.action;

        if (type === "ADD_BUDGET_EXPENSE") {
          const { title, amount, spent, date, paymentDate, paidAt } = payload;
          await supabase.from("echo_expenses").insert({
            user_id: user.id,
            title:   title || "Purchase",
            amount:  parseFloat(amount ?? spent) || 0,
            date:    paymentDate || paidAt || date || new Date().toLocaleDateString("fr-CA"),
          });
        }

        if (type === "ADD_CALORIE_LOG") {
          const { foodName, calories } = payload;
          await supabase.from("echo_calories").insert({
            user_id:   user.id,
            food_name: foodName || "Food",
            calories:  parseInt(calories) || 0,
            date:      new Date().toLocaleDateString("fr-CA"),
          });
        }

        if (type === "SET_CALORIE_GOAL" || type === "UPDATE_CALORIE_GOAL") {
          const { goal, calorieGoal, calories } = payload;
          const nextGoal = parseInt(goal ?? calorieGoal ?? calories);
          if (Number.isFinite(nextGoal) && nextGoal > 0)
            localStorage.setItem(`echo-calorie-goal-${user.id}`, nextGoal.toString());
        }

        if (type === "ADD_CALENDAR_EVENT") {
          const { title, start, end, notes } = payload;
          const dateKey = start?.split("T")[0] || start || "";
          if (dateKey) {
            await supabase.from("echo_calendar").insert({
              user_id:      user.id,
              title:        title || "Untitled Event",
              start_date:   dateKey,
              end_date:     dateKey,
              notes:        notes || "",
              is_from_echo: true,
            });
          }
        }
      }
    } catch {
      setChatMessages([...chatMessages, "Echo: Unable to reach the server."]);
    }
  };

  const handleSendToEcho = (entry: HistoryEntry) => {
    const ctx = lang === "fr"
      ? `[CONTEXTE HISTORIQUE ARCHIVÉ - ${entry.date}]\n${(entry.messages||[]).join("\n")}`
      : `[ARCHIVED HISTORICAL CONTEXT - ${entry.date}]\n${(entry.messages||[]).join("\n")}`;
    setViewingHistory(null);
    sendMessage(ctx);
  };

  const handleSendToChatBox = (entry: HistoryEntry) => {
    const clean = (entry.messages||[]).map(m => m.replace(/^(Echo|You|Toi)\s*:\s*/i,"")).join("\n\n");
    setInput(clean);
    setViewingHistory(null);
  };

  if (!isLoaded) return (
    <main className="h-screen bg-white dark:bg-black text-black dark:text-white flex items-center justify-center font-sans">
      <div className="text-zinc-400 dark:text-zinc-500 text-sm animate-pulse">{lang==="fr"?"Vérification des accès systèmes...":"Verifying core access credentials..."}</div>
    </main>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <main className="h-screen bg-white dark:bg-black text-black dark:text-white flex overflow-hidden relative font-sans transition-colors duration-200">

      <div className="absolute top-4 right-4 z-50 bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-300 dark:border-zinc-700 p-2 rounded-xl text-xs flex gap-3 items-center shadow-md">
        <LangDropdown />
        <span className="text-zinc-300 dark:text-zinc-700">|</span>
        <button onClick={toggleTheme} className="font-bold text-zinc-700 dark:text-zinc-300 hover:text-cyan-500 transition-colors">
          {theme==="dark"?"☀️ Light Mode":"🌙 Dark Mode"}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* SIDEBAR */}
        <aside className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-8 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between">
          <div className="space-y-20">
            <h2 className="font-bold text-lg">
              <Link href="/" className="hover:text-cyan-500 dark:hover:text-cyan-400">{t.sidebar.home}</Link>
            </h2>
            <div className="space-y-20 text-zinc-800 dark:text-zinc-100 font-medium">
              <Link href="/chat"     className="block hover:text-cyan-500">{t.sidebar.chat}</Link>
              <Link href="/books"    className="block hover:text-cyan-500">{t.sidebar.books}</Link>
              <Link href="/calendar" className="block hover:text-cyan-500">📅 {lang==="fr"?"Calendrier":"Calendar"}</Link>
              <Link href="/vitality" className="block hover:text-cyan-500">📈 {lang==="fr"?"Vitalité":"Vitality"}</Link>
              <Link href="/services" className="block hover:text-cyan-500">💎 {lang==="fr"?"Services":"Services"}</Link>
              <Link href="/account"  className="block hover:text-cyan-500">👤 {lang==="fr"?"Compte":"Account"}</Link>
              <Link href="/horizonweb" className="block hover:text-cyan-500">📡 HorizonWeb</Link>
              <hr className="border-zinc-200 dark:border-zinc-800 my-4" />
              <Link href="/history"  className="block text-amber-600 dark:text-amber-400 font-bold">⭐ {lang==="fr"?"Historique":"History"}</Link>
            </div>
          </div>
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
            Status : <span className="text-cyan-500 dark:text-cyan-400 uppercase font-bold block">{userTier === "connected_free" ? (lang === "fr" ? "Accès libre" : "FreeConnect") : userTier}</span>
          </div>
        </aside>

        {/* CONTENU VERROUILLÉ */}
        {isPageBlocked ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-zinc-50 dark:bg-gradient-to-b dark:from-black dark:to-zinc-950 relative transition-colors duration-200">
            <div className="w-20 h-20 bg-amber-500/10 text-amber-500 border border-amber-300 dark:border-amber-500/30 rounded-full flex items-center justify-center text-4xl mb-6 shadow-md">🔒</div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white uppercase tracking-wider mb-2">{lang==="fr"?"Plan Supérieur Requis":"Higher Plan Required"}</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-md leading-relaxed mb-6">
              {lang==="fr"?"L'accès au registre de l'historique global et à la structure mémorielle d'Echo nécessite un plan Premium, Ultra ou Founder actif.":"Access to global history and Echo's memory structure requires activating a Premium, Ultra, or Founder plan."}
            </p>
            <Link href="/services" className="bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition duration-200 shadow-md uppercase tracking-widest">
              💎 {lang==="fr"?"Activer un plan":"Activate a plan"}
            </Link>
          </div>
        ) : (
          <>
            {/* ARCHIVES GAUCHE */}
            <div style={{width:`${leftWidth}px`}} className="shrink-0 p-4 flex flex-col overflow-hidden bg-white dark:bg-black transition-colors duration-200">
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                <h1 className="text-3xl font-bold text-amber-600 dark:text-amber-400">⭐ {lang==="fr"?"Historique":"History"}</h1>
                <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">{lang==="fr"?"Sauvegarde automatique tous les 2000 caractères":"Automatic backup every 2000 characters"}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {history.length===0 && (
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs italic">{lang==="fr"?"Aucune conversation archivée.":"No saved conversations found."}</p>
                )}
                {history.map(entry => (
                  <div key={entry.id} onClick={()=>setViewingHistory(entry)}
                    className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 cursor-pointer hover:border-amber-400 dark:hover:border-amber-400 transition shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <h2 className="text-base font-bold text-amber-600 dark:text-amber-300 flex-1 pr-2">{entry.title}</h2>
                      <button onClick={e=>{e.stopPropagation();deleteEntry(entry.id);}} className="text-zinc-400 hover:text-red-500 shrink-0 text-sm">🗑️</button>
                    </div>
                    <p className="text-zinc-400 dark:text-zinc-500 text-xs mb-2">📅 {entry.date}</p>
                    <p className="text-zinc-600 dark:text-zinc-400 text-xs line-clamp-2 leading-relaxed">
                      {entry.messages.slice(0,2).join(" • ")}
                    </p>
                    <button onClick={e=>{e.stopPropagation();setViewingHistory(entry);}}
                      className="mt-3 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 px-3 py-1 rounded text-xs text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-600 flex items-center gap-2 font-semibold shadow-sm">
                      👁️ {lang==="fr"?"Consulter l'archive":"Read Context"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* SPLITTER */}
            <div onMouseDown={startResizing}
              className="w-1.5 shrink-0 bg-zinc-200 dark:bg-zinc-800 cursor-col-resize hover:bg-cyan-500 dark:hover:bg-cyan-500 transition-colors duration-150 h-full relative z-10" />

            {/* DISCUSSION DROITE */}
            <section className="flex-1 flex flex-col overflow-hidden min-w-0 bg-white dark:bg-black transition-colors duration-200">
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shrink-0 shadow-sm">
                <h2 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                  💬 {lang==="fr"?"Discussion Active":"Active Conversation"}
                </h2>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                  {lang==="fr"?"Il s'agit du fil actuel en cours avec Echo. Consulter une archive n'interrompt pas ce fil.":"This is the ongoing discussion with Echo. Reading an archive will not interrupt it."}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 p-4 min-h-0 bg-white dark:bg-black/10">
                {chatMessages.length===0 && (
                  <p className="text-zinc-400 dark:text-zinc-600 text-xs italic">{lang==="fr"?"Aucune donnée de télémétrie.":"No operational telemetry messages logged."}</p>
                )}
                {chatMessages.map((msg, index) => {
                  const isEcho = /^Echo\s*:/i.test(msg);
                  const isUser = /^(You|Toi)\s*:/i.test(msg);
                  const isLastE = isEcho && index === lastEchoIndex;
                  return (
                    <div key={index} className="whitespace-pre-wrap">
                      {isEcho ? (
                        <div className="flex items-start gap-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 shadow-sm">
                          <img src="/echo1.png" alt="Echo Avatar" className="w-8 h-8 rounded-full object-cover shrink-0 border border-zinc-300 dark:border-zinc-700 mt-0.5" />
                          <div className="flex-1 min-w-0 break-words text-zinc-800 dark:text-zinc-100 text-[14px] font-medium leading-relaxed">
                            <span className="text-cyan-600 dark:text-cyan-400 font-extrabold block mb-1 text-[10px] uppercase tracking-wider">Echo:</span>
                            {msg.replace(/^Echo\s*:\s*/i,"")}
                          </div>
                        </div>
                      ) : isUser ? (
                        <div className="p-3.5 break-words text-zinc-700 dark:text-zinc-300 text-[14px] font-medium bg-zinc-50/50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-inner">
                          <span className="text-cyan-600 dark:text-cyan-400 font-bold">You:</span> {msg.replace(/^(You|Toi)\s*:/i,"")}
                        </div>
                      ) : (
                        <div className="p-2 break-words text-xs italic text-zinc-400 dark:text-zinc-500">{msg}</div>
                      )}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-2 shrink-0 bg-zinc-50 dark:bg-black">
                <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                  <textarea value={input} maxLength={getMessageMaxLength(userTier)}
                    onChange={e=>setInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}}
                    className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded p-3 resize-none text-sm text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
                    rows={3}
                    placeholder={lang==="fr"?"Discuter avec Echo...":"Talk to Echo..."} />
                  <button onClick={()=>sendMessage()}
                    className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded text-white font-bold text-xs transition-colors flex items-center justify-center sm:w-28 shadow-md uppercase tracking-wide">
                    {t.chat.send}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {/* OVERLAY ARCHIVE */}
        {viewingHistory && !isPageBlocked && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={()=>setViewingHistory(null)}>
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e=>e.stopPropagation()}>
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900 shrink-0">
                <div>
                  <h3 className="font-bold text-amber-600 dark:text-amber-400 text-sm flex items-center gap-2">
                    📖 {lang==="fr"?`Mode Lecture : ${viewingHistory.title}`:`Reading Mode: ${viewingHistory.title}`}
                  </h3>
                  <p className="text-zinc-400 dark:text-zinc-500 text-[11px] mt-1">Archived on {viewingHistory.date}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button onClick={()=>handleSendToChatBox(viewingHistory)}
                    className="bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-[11px] font-mono tracking-wide uppercase px-3 py-2 rounded-lg border-2 border-cyan-500/80 shadow-[0_0_10px_rgba(6,182,212,0.25)] transition duration-200">
                    📥 Send to Chat Box
                  </button>
                  <button onClick={()=>handleSendToEcho(viewingHistory)}
                    className="bg-cyan-500/10 dark:bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-bold text-[11px] font-mono tracking-wide uppercase px-3 py-2 rounded-lg border-2 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)] transition duration-200">
                    ⚡ Send to Echo
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-800 font-light mx-1">|</span>
                  <button onClick={()=>setViewingHistory(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition text-sm shadow-sm">✕</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white dark:bg-black/10">
                {viewingHistory.messages.map((msg, index) => {
                  const isEcho = /^Echo\s*:/i.test(msg);
                  const isUser = /^(You|Toi)\s*:/i.test(msg);
                  return (
                    <div key={index} className="whitespace-pre-wrap text-xs">
                      {isEcho ? (
                        <div className="flex items-start gap-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 shadow-sm">
                          <span className="text-cyan-600 dark:text-cyan-500 font-bold shrink-0">Echo:</span>
                          <div className="flex-1 text-zinc-700 dark:text-zinc-300 leading-relaxed">{msg.replace(/^Echo\s*:\s*/i,"")}</div>
                        </div>
                      ) : isUser ? (
                        <div className="p-2 break-words text-zinc-600 dark:text-zinc-400">
                          <span className="text-amber-600 dark:text-amber-500 font-bold">You:</span> {msg.replace(/^(You|Toi)\s*:\s*/i,"")}
                        </div>
                      ) : (
                        <div className="p-2 break-words text-zinc-400 dark:text-zinc-600 italic">{msg}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LIMIT MODAL */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={()=>setShowLimitModal(false)}>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🔒</div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 capitalize">{activeLimitCategory} Limit</h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6">
              {lang==="fr"?"Limite d'actions automatisees atteinte.":"Automated action limit reached."}
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/services" onClick={()=>setShowLimitModal(false)} className="w-full bg-cyan-600 hover:bg-cyan-500 py-3 rounded-xl font-bold text-sm transition-all text-center text-white">🚀 Upgrade Plan</Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}