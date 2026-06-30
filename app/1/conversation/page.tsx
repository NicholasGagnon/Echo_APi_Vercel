"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type ChatMessage  = { raw: string; imageB64?: string };
type Conversation = { id: string; title: string; messages: string[]; summary: string; updatedAt: number };
type Lang = "fr" | "en";

const CONV_SOURCE = "echo";

const NAV_ITEMS = [
  { href: "/1",               key: "hall"   },
  { href: "/1/dashboard",     key: "dash"   },
  { href: "/1/conversation",  key: "conv", active: true },
  { href: "/1/form",          key: "form"   },
  { href: "/1/fiche",         key: "fiches" },
  { href: "/1/account",       key: "account" },
];

const LABELS: Record<string, { fr: string; en: string }> = {
  hall:    { fr: "Hall",          en: "Hall" },
  dash:    { fr: "Dashboard",     en: "Dashboard" },
  conv:    { fr: "Conversation",  en: "Conversation" },
  form:    { fr: "Formulaire",    en: "Form" },
  fiches:  { fr: "Fiches",        en: "Listings" },
  account: { fr: "Compte",        en: "Account" },
};

const deriveTitle = (raws: string[], lang: string): string => {
  const first = raws.find(r => /^(You|Toi)\s*:/i.test(r));
  if (first) {
    const clean = first.replace(/^(You|Toi)\s*:\s*/i, "").trim();
    if (clean) return clean.length > 50 ? `${clean.slice(0, 50)}…` : clean;
  }
  return lang === "fr" ? "Nouvelle conversation" : "New conversation";
};

const isDefaultTitle = (t: string) => t === "Nouvelle conversation" || t === "New conversation";

// ── AGENTIC FEED ─────────────────────────────────────────────────────────────
function AgenticFeed({ userId, lang }: { userId: string | null; lang: string }) {
  if (!userId) return <p className="text-[11px] text-zinc-400 dark:text-zinc-600 italic">{lang==="fr"?"Connecte-toi pour voir l'activité":"Log in to see activity"}</p>;
  return <p className="text-[11px] text-zinc-400 dark:text-zinc-600 italic">{lang==="fr"?"À venir":"Coming soon"}</p>;
}

export default function ConversationPage() {
  const [lang, setLang] = useState<Lang>("fr");

  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [input,     setInput]     = useState("");
  const [isLoaded,  setIsLoaded]  = useState(false);
  const [userId,    setUserId]    = useState<string | null>(null);
  const bottomRef     = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [conversations,        setConversations]        = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarOpen,          setSidebarOpen]          = useState(true);

  const [isListening, setIsListening] = useState(false);
  const [selectedImage,     setSelectedImage]     = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState("");
  const [echoState,   setEchoState]   = useState("idle");
  const [chatFontSize, setChatFontSize] = useState(16);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [renamingId,      setRenamingId]      = useState<string | null>(null);
  const [renameValue,     setRenameValue]     = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const [selectedButtons,        setSelectedButtons]        = useState<string[]>([]);
  const [isDoubleRegardUnlocked, setIsDoubleRegardUnlocked] = useState(false);
  const [isSurpriseActive,       setIsSurpriseActive]       = useState(false);

  const [warmupIntent, setWarmupIntent] = useState<string|null>(null);
  const [isWarmingUp, setIsWarmingUp]   = useState(false);
  const warmupRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const triggerWarmup = useCallback((text: string) => {
    if (warmupRef.current) clearTimeout(warmupRef.current);
    if (text.length < 3) { setWarmupIntent(null); setIsWarmingUp(false); return; }
    warmupRef.current = setTimeout(async () => {
      setIsWarmingUp(true);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res  = await fetch(`${API_URL}/horizon-warmup`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ partial: text }) });
        const data = await res.json();
        if (data.intent?.response) {
          try { setWarmupIntent(JSON.parse(data.intent.response)?.intent || null); } catch {}
        }
      } catch {} finally {
        setIsWarmingUp(false);
      }
    }, 400);
  }, []);
  useEffect(() => () => { if (warmupRef.current) clearTimeout(warmupRef.current); }, []);

  const buttonsLabels: Record<string, { fr: string; en: string }> = {
    clarity:    { fr:"Clarté",          en:"Clarity"     },
    humain:     { fr:"Humain",           en:"Human"       },
    critical:   { fr:"Regard Critique",  en:"Critical"    },
    expert:     { fr:"Expert",           en:"Expert"      },
    precision:  { fr:"Précision",        en:"Precision"   },
    philosophy: { fr:"Philosophie",      en:"Philosophy"  },
    strategy:   { fr:"Stratégie",        en:"Strategy"    },
    decompose:  { fr:"Décomposer",       en:"Decompose"   },
    refine:     { fr:"Affiner",          en:"Refine"      },
    double:     { fr:"Double Regard",    en:"Dual Vision" },
  };
  const buttonsOrder = ["clarity","humain","critical","expert","precision","philosophy","strategy","decompose","refine","double"];

  // ── Modes comportementaux — plus de checkQuota Echo, juste la logique de sélection ──
  const handleButtonClick = (id: string) => {
    if (isSurpriseActive) return;
    if (id === "double") { if (selectedButtons.length === 1) setIsDoubleRegardUnlocked(true); return; }
    if (selectedButtons.includes(id)) {
      const next = selectedButtons.filter(b => b !== id);
      setSelectedButtons(next);
      if (next.length < 2) setIsDoubleRegardUnlocked(false);
    } else {
      if (selectedButtons.length === 0) {
        setSelectedButtons([id]); setIsDoubleRegardUnlocked(false);
      } else if (selectedButtons.length === 1 && isDoubleRegardUnlocked) {
        setSelectedButtons(p => [...p, id]);
      }
    }
  };

  const serializeMsgs   = (msgs: ChatMessage[]) => msgs.map(m => m.raw);
  const deserializeMsgs = (raws: string[]): ChatMessage[] => raws.map(r => ({ raw: r }));
  const lastEchoIndex   = messages.findLastIndex(m => /^Echo\s*:/i.test(m.raw));

  const loadConversationsFromDB = async (uid: string) => {
    const { data, error } = await supabase
      .from("echo_conversations").select("id, messages, summary, updated_at")
      .eq("user_id", uid).eq("source", CONV_SOURCE)
      .order("updated_at", { ascending: false });
    if (error) { console.error("[Conv] load:", error.message); return []; }
    return (data || []).map((row: any) => ({
      id: row.id, title: deriveTitle(row.messages || [], lang),
      messages: row.messages || [], summary: row.summary || "",
      updatedAt: new Date(row.updated_at).getTime(),
    })) as Conversation[];
  };

  const saveConversationToDB = async (uid: string, convId: string | null, raws: string[], summary: string) => {
    if (!convId || convId === "new" || convId.startsWith("local-")) return;
    let finalSummary = summary, finalMessages = raws;
    if (raws.length > 10) {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res  = await fetch(`${API_URL}/memory-summary`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ summary, messages: raws.slice(0, 500), userTier: "connected_free" }) });
        const data = await res.json();
        finalSummary  = data.summary || summary;
        finalMessages = raws.slice(-100);
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, summary: finalSummary } : c));
      } catch {}
    }
    const { error } = await supabase.from("echo_conversations").update({
      messages: finalMessages, summary: finalSummary,
      summary_updated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", convId).eq("user_id", uid);
    if (error) console.error("[Conv] save:", error.message);
  };

  // ── BOOTSTRAP ─────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }: any) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      try {
        if (uid) {
          const list = await loadConversationsFromDB(uid);
          const final = list.length > 0 ? list : [{ id:"new", title: lang==="fr"?"Nouvelle conversation":"New conversation", messages:[], summary:"", updatedAt:Date.now() }];
          setConversations(final); setActiveConversationId(final[0].id); setMessages(deserializeMsgs(final[0].messages));
        } else {
          const empty: Conversation = { id:"new", title: lang==="fr"?"Nouvelle conversation":"New conversation", messages:[], summary:"", updatedAt:Date.now() };
          setConversations([empty]); setActiveConversationId("new"); setMessages([]);
        }
      } catch(e) { console.error("Bootstrap:", e); }
      setIsLoaded(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        setUserId(null);
        const empty: Conversation = { id:"new", title: lang==="fr"?"Nouvelle conversation":"New conversation", messages:[], summary:"", updatedAt:Date.now() };
        setConversations([empty]); setActiveConversationId("new"); setMessages([]); return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const uid = session.user.id; setUserId(uid);
        const list = await loadConversationsFromDB(uid);
        const final = list.length > 0 ? list : [{ id:"new", title: lang==="fr"?"Nouvelle conversation":"New conversation", messages:[], summary:"", updatedAt:Date.now() }];
        setConversations(final); setActiveConversationId(final[0].id); setMessages(deserializeMsgs(final[0].messages));
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoaded || !userId || !activeConversationId || activeConversationId === "new" || activeConversationId.startsWith("local-")) return;
    const raws = serializeMsgs(messages);
    const activeConv = conversations.find(c => c.id === activeConversationId);
    setConversations(prev => prev.map(c =>
      c.id === activeConversationId
        ? { ...c, messages: raws, updatedAt: Date.now(), title: raws.length > 0 && isDefaultTitle(c.title) ? deriveTitle(raws, lang) : c.title }
        : c
    ));
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      saveConversationToDB(userId, activeConversationId, raws, activeConv?.summary || "");
    }, 1500);
    return () => { if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current); };
  }, [messages, isLoaded]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const startNewConversation = () => {
    const empty: Conversation = { id:"new", title: lang==="fr"?"Nouvelle conversation":"New conversation", messages:[], summary:"", updatedAt:Date.now() };
    setConversations(p => [empty, ...p.filter(c => c.id !== "new" && c.messages.length > 0)]);
    setActiveConversationId("new"); setMessages([]); setInput(""); setSelectedImage(null); setSelectedImageName("");
  };

  const switchConversation = (id: string) => {
    if (id === activeConversationId) return;
    const target = conversations.find(c => c.id === id);
    if (!target) return;
    setActiveConversationId(id); setMessages(deserializeMsgs(target.messages));
  };

  const confirmDelete = async () => {
    const id = deleteConfirmId; setDeleteConfirmId(null);
    if (!id) return;
    if (userId && id !== "new") await supabase.from("echo_conversations").delete().eq("id", id).eq("user_id", userId);
    setConversations(prev => {
      const remaining = prev.filter(c => c.id !== id);
      const final = remaining.length > 0 ? remaining : [{ id:"new", title: lang==="fr"?"Nouvelle conversation":"New conversation", messages:[], summary:"", updatedAt:Date.now() }];
      if (id === activeConversationId) { setActiveConversationId(final[0].id); setMessages(deserializeMsgs(final[0].messages)); }
      return final;
    });
  };

  const commitRename = async () => {
    if (!renamingId) return;
    const newTitle = renameValue.trim() || (lang==="fr"?"Nouvelle conversation":"New conversation");
    setConversations(prev => prev.map(c => c.id === renamingId ? { ...c, title: newTitle } : c));
    if (userId && renamingId !== "new") await supabase.from("echo_conversations").update({ updated_at: new Date().toISOString() }).eq("id", renamingId).eq("user_id", userId);
    setRenamingId(null);
  };

  // ── SEND — plus de checkQuota Echo qui bloquait silencieusement ────────────
  const sendMessage = async () => {
    if (!input.trim() && !selectedImage) return;

    const userMessage = input.trim() || (lang==="fr"?"Analyse cette image.":"Analyze this image.");
    const imageToSend = selectedImage;
    const userRaw     = `${lang==="fr"?"Toi":"You"}: ${userMessage}`;
    const userEntry: ChatMessage = { raw: userRaw, imageB64: imageToSend ?? undefined };
    const baseMessages = [...messages, userEntry];
    setEchoState("thinking");
    setMessages([...baseMessages, { raw: "Echo: ..." }]);
    setInput(""); setSelectedImage(null); setSelectedImageName(""); setWarmupIntent(null);

    const activeConv = conversations.find(c => c.id === activeConversationId);
    let activeConvoId = activeConversationId;

    if (activeConversationId === "new" && userId) {
      try {
        const { data, error } = await supabase.from("echo_conversations")
          .insert({ user_id: userId, source: CONV_SOURCE, messages: serializeMsgs([userEntry]), summary:"", updated_at: new Date().toISOString() })
          .select("id").single();
        if (error) throw error;
        if ((data as any)?.id) {
          activeConvoId = (data as any).id; setActiveConversationId((data as any).id);
          const newConvo: Conversation = { id: (data as any).id, title: deriveTitle(serializeMsgs([userEntry]), lang), messages: serializeMsgs([userEntry]), summary:"", updatedAt: Date.now() };
          setConversations(prev => [newConvo, ...prev.filter(c => c.id !== "new")]);
        }
      } catch (err) { console.error("[Conv] create:", err); }
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/1/conversation`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          message: userMessage, image: imageToSend,
          history: serializeMsgs(baseMessages), userTier: "connected_free",
          calendarEvents:{}, selectedButtons, summary: activeConv?.summary || "",
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setEchoState("speaking");

      const generatedMsgs = [...baseMessages, { raw: `Echo: ${data.response || ""}` }];
      setMessages(generatedMsgs);
      setConversations(prev => prev.map(c =>
        c.id === activeConvoId
          ? { ...c, messages: serializeMsgs(generatedMsgs), updatedAt: Date.now(), title: isDefaultTitle(c.title) ? deriveTitle(serializeMsgs(generatedMsgs), lang) : c.title }
          : c
      ));

      if (userId && activeConvoId && !activeConvoId.startsWith("local-") && activeConvoId !== "new") {
        if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
        saveDebounceRef.current = setTimeout(() => {
          saveConversationToDB(userId, activeConvoId, serializeMsgs(generatedMsgs), activeConv?.summary||"");
        }, 1500);
      }
    } catch (err) {
      console.error("[Conv] send error:", err);
      setMessages([...baseMessages, { raw:"Echo: Unable to connect to server." }]);
    } finally {
      setTimeout(() => setEchoState("idle"), 10000);
    }
  };

  const handleImageSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value="";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setSelectedImage(reader.result as string); setSelectedImageName(file.name); };
    reader.readAsDataURL(file);
  };

  const lancerDictation = () => {
    const SR = (window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported."); return; }
    const r = new SR();
    r.lang = lang==="fr"?"fr-FR":"en-US";
    r.onstart=()=>setIsListening(true); r.onend=()=>setIsListening(false); r.onerror=()=>setIsListening(false);
    r.onresult=(e:any)=>setInput(p=>p+(p?" ":"")+e.results[0][0].transcript);
    r.start();
  };

  return (
    <main className="h-screen bg-white dark:bg-[#0f0f0f] text-zinc-900 dark:text-zinc-100 flex flex-col overflow-hidden font-sans selection:bg-cyan-500/20">

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-zinc-800 dark:text-zinc-100 mb-1">{lang==="fr"?"Supprimer cette conversation ?":"Delete this conversation?"}</p>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-5">{lang==="fr"?"Cette action est irréversible.":"This action cannot be undone."}</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">{lang==="fr"?"Annuler":"Cancel"}</button>
              <button onClick={confirmDelete} className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-semibold transition-colors">{lang==="fr"?"Supprimer":"Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── NAV EN HAUT — cohérente avec le reste de site2 ── */}
      <nav className="border-b border-zinc-100 dark:border-zinc-800/60 px-6 py-4 flex items-center justify-between shrink-0 bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-sm z-30">
        <span className="font-bold text-sm">Echo AI</span>
        <div className="flex items-center gap-5 text-sm">
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href}
              className={(item as any).active ? "text-cyan-500 font-semibold" : "text-zinc-500 hover:text-cyan-500 transition-colors"}>
              {LABELS[item.key][lang]}
            </Link>
          ))}
          <button onClick={() => setLang(l => l === "fr" ? "en" : "fr")}
            className="text-xs text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded-lg hover:border-zinc-400 transition-colors">
            {lang === "fr" ? "EN" : "FR"}
          </button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* SIDEBAR — conversations */}
        <aside className={`${sidebarOpen?"w-64":"w-0"} shrink-0 transition-all duration-300 overflow-hidden border-r border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/80 dark:bg-zinc-950/80 flex flex-col`}>
          <div className="p-5 shrink-0">
            <button onClick={startNewConversation}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-zinc-400 hover:text-cyan-500 transition-all border border-dashed border-zinc-200 dark:border-zinc-800 mb-3">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
              {lang==="fr"?"Nouvelle conversation":"New conversation"}
            </button>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 px-1 mb-2">{lang==="fr"?"Conversations":"Conversations"}</p>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5 min-h-0">
            {conversations.slice().sort((a,b) => b.updatedAt-a.updatedAt).map(c => (
              <div key={c.id} onClick={() => { if (renamingId !== c.id) switchConversation(c.id); }}
                className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-sm ${
                  c.id === activeConversationId ? "text-cyan-500 bg-cyan-500/5" : "text-zinc-500 dark:text-zinc-400 hover:text-cyan-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}>
                {renamingId === c.id ? (
                  <input ref={renameInputRef} value={renameValue}
                    onChange={e => setRenameValue(e.target.value)} onBlur={commitRename}
                    onKeyDown={e => { if (e.key==="Enter") commitRename(); if (e.key==="Escape") setRenamingId(null); }}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 bg-transparent outline-none min-w-0" autoFocus />
                ) : (
                  <span className="flex-1 truncate">{c.title}</span>
                )}
                {renamingId !== c.id && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); setRenamingId(c.id); setRenameValue(c.title); setTimeout(() => renameInputRef.current?.focus(), 50); }}
                      className="p-1 rounded text-zinc-400 hover:text-cyan-400 transition-colors">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z"/></svg>
                    </button>
                    <button onClick={e => { e.stopPropagation(); setDeleteConfirmId(c.id); }}
                      className="p-1 rounded text-zinc-400 hover:text-red-400 transition-colors">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
            {!userId && (
              <p className="text-[11px] text-zinc-400 italic px-3 py-4">{lang==="fr"?"Connecte-toi pour sauvegarder tes conversations.":"Log in to save your conversations."}</p>
            )}
          </div>
        </aside>

        {/* ZONE PRINCIPALE */}
        <div className="flex-1 flex overflow-hidden min-w-0">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

            <header className="h-11 shrink-0 flex items-center gap-3 px-4 border-b border-zinc-100 dark:border-zinc-800/60">
              <button onClick={() => setSidebarOpen(v => !v)} className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-500 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"/></svg>
              </button>
              <span className="text-sm text-zinc-400 dark:text-zinc-500 truncate flex-1">
                {conversations.find(c => c.id === activeConversationId)?.title || (lang==="fr"?"Nouvelle conversation":"New conversation")}
              </span>
            </header>

            <div className="flex-1 overflow-y-auto min-h-0">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 opacity-40">
                  <img src="/echo1.png" alt="Echo" className="w-12 h-12 rounded-full object-cover" />
                  <p className="text-sm text-zinc-500">{lang==="fr"?"Commence une conversation…":"Start a conversation…"}</p>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col gap-8">
                  {messages.map((msg, index) => {
                    const isEcho     = /^Echo\s*:/i.test(msg.raw);
                    const isUser     = /^(You|Toi)\s*:/i.test(msg.raw);
                    const isLastEcho = isEcho && index === lastEchoIndex;
                    const cleanText  = msg.raw.replace(/^(Echo|You|Toi)\s*:\s*/i, "");

                    if (isEcho) return (
                      <div key={index} className="flex gap-4 items-start animate-in fade-in duration-200">
                        <div className={`shrink-0 w-8 h-8 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700 ${isLastEcho?echoState==="thinking"?"echo-thinking":echoState==="speaking"?"echo-speaking":"":""}`}>
                          <img src="/echo1.png" alt="Echo" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-2 uppercase tracking-widest">Echo</p>
                          <div className="flex flex-col gap-4" style={{ fontSize: chatFontSize, lineHeight: "1.85" }}>
                            {cleanText.split(/\n\n+/).map((block, i) => (
                              <p key={i} className="text-zinc-800 dark:text-zinc-100 whitespace-pre-wrap break-words">{block}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    );

                    if (isUser) return (
                      <div key={index} className="flex justify-end animate-in fade-in duration-150">
                        <div className="max-w-[70%]">
                          {msg.imageB64 && <img src={msg.imageB64} alt="img" className="max-w-[180px] max-h-[140px] rounded-xl border border-zinc-200 dark:border-zinc-700 object-cover shadow mb-2 ml-auto" />}
                          {cleanText && cleanText !== "Analyse cette image." && cleanText !== "Analyze this image." && (
                            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-3 text-zinc-800 dark:text-zinc-100 whitespace-pre-wrap break-words" style={{ fontSize: chatFontSize - 1, lineHeight: "1.75" }}>
                              {cleanText}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                    return null;
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <div className="shrink-0 px-4 pb-6 pt-3 bg-white dark:bg-[#0f0f0f]">
              <div className="max-w-3xl mx-auto">
                {selectedImage && (
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <img src={selectedImage} alt="preview" className="w-8 h-8 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700" />
                    <span className="text-xs text-zinc-500 truncate flex-1">{selectedImageName}</span>
                    <button onClick={() => { setSelectedImage(null); setSelectedImageName(""); }} className="text-zinc-400 hover:text-red-400 text-xs">✕</button>
                  </div>
                )}
                {isWarmingUp && (
                  <div className="flex items-center gap-1.5 mb-1.5 px-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" style={{ animationDuration: "0.8s" }}/>
                    <span className="text-[10px] text-cyan-500/60 font-mono uppercase tracking-widest">
                      {lang==="fr"?"analyse...":"scanning..."}
                    </span>
                  </div>
                )}
                {!isWarmingUp && warmupIntent && warmupIntent !== "autre" && (
                  <div className="flex items-center gap-1.5 mb-1.5 px-1">
                    <span className="w-1 h-1 rounded-full bg-cyan-400"/>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {({recherche_locale:"📍",prix:"💰",comparaison:"⚖️",definition:"📖",actualite:"📰"} as any)[warmupIntent]||"🔍"} {warmupIntent}
                    </span>
                  </div>
                )}
                <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-sm focus-within:border-zinc-400 dark:focus-within:border-zinc-500 transition-colors">
                  <textarea ref={textareaRef} value={input}
                    onChange={e => { setInput(e.target.value); triggerWarmup(e.target.value); }}
                    onKeyDown={e => { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={lang==="fr"?"Parle à Echo…":"Talk to Echo…"}
                    rows={3}
                    className="w-full bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 text-sm leading-relaxed px-4 pt-4 pb-2 resize-none focus:outline-none" />
                  <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1">
                    <div className="flex items-center gap-1">
                      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelection} className="hidden" />
                      <button type="button" onClick={() => imageInputRef.current?.click()}
                        className={`p-1.5 rounded-lg transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${selectedImage?"text-emerald-500":""}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/></svg>
                      </button>
                      <button onClick={lancerDictation}
                        className={`p-1.5 rounded-lg transition-colors ${isListening?"text-red-400 animate-pulse":"text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"/></svg>
                      </button>
                    </div>
                    <button onClick={sendMessage}
                      className="flex items-center justify-center w-8 h-8 bg-zinc-900 dark:bg-white hover:bg-zinc-700 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl transition-colors shadow-sm">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PANNEAU DROIT */}
          <aside className="w-52 shrink-0 border-l border-zinc-100 dark:border-zinc-800/60 flex flex-col bg-zinc-50/50 dark:bg-zinc-950/50 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-3">
                {lang==="fr"?"Upcoming":"Upcoming"}
              </p>
              <AgenticFeed userId={userId} lang={lang} />
            </div>
            <div className="mx-4 h-px bg-zinc-100 dark:bg-zinc-800/60 shrink-0"/>
            <div className="shrink-0 p-4 overflow-y-auto max-h-[55vh]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-3">Modes</p>
              <div className="flex flex-col gap-0.5">
                {buttonsOrder.map(id => {
                  const isSelected = selectedButtons.includes(id);
                  const isDR = id === "double";
                  let locked = false;
                  if (!isDR) { if (selectedButtons.length===1&&!isSelected&&!isDoubleRegardUnlocked) locked=true; else if (selectedButtons.length===2&&!isSelected) locked=true; }
                  else { if (selectedButtons.length===0||selectedButtons.length===2) locked=true; }
                  return (
                    <button key={id} disabled={locked} onClick={() => handleButtonClick(id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all border ${
                        locked ? "opacity-20 cursor-not-allowed text-zinc-500 border-transparent"
                        : isSelected || (isDR && isDoubleRegardUnlocked)
                          ? "border-cyan-500/40 bg-cyan-500/5 text-cyan-400 font-medium"
                          : "border-transparent text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-cyan-500"
                      }`}>
                      {lang==="fr" ? buttonsLabels[id].fr : buttonsLabels[id].en}
                    </button>
                  );
                })}
                <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-800/60"/>
                <button
                  onClick={() => {
                    if (isSurpriseActive) { setIsSurpriseActive(false); setSelectedButtons([]); }
                    else { setIsSurpriseActive(true); setSelectedButtons(["surprise"]); setIsDoubleRegardUnlocked(false); }
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-xs transition-all text-left border ${
                    isSurpriseActive ? "border-purple-500/40 bg-purple-500/5 text-purple-400 font-medium"
                    : "border-transparent text-zinc-400 hover:text-purple-500 hover:bg-purple-500/5"
                  }`}>
                  💎 {lang==="fr"?"Surprise":"Surprise"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}