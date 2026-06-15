"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image"; 
import { supabase } from "../lib/supabase";
import { checkQuota, getMessageMaxLength } from "../../utils/quota";
import LangDropdown from "../components/LangDropdown";
import { useApp } from "../../context/AppContext";

type HistoryEntry = { id: string; title: string; date: string; messages: string[]; };
type BudgetExpense = { id: string; title: string; amount: number; date: string; };
type CalorieLog = { id: string; foodName: string; calories: number; date: string; };

type ChatMessage = {
  raw: string;        // "You: ..." ou "Echo: ..."
  imageB64?: string;  // miniature base64 si message user avec image
};

export default function ChatPage() {
  const { t, lang, theme, toggleTheme } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const lastSavedLength = useRef(0);
  const [userTier, setUserTier] = useState<"free" | "basic" | "premium" | "ultra" | "founder">("free");
  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState("");
  const [echoState, setEchoState] = useState("idle");
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [activeLimitCategory, setActiveLimitCategory] = useState<"vitality" | "calendar" | "prompts">("vitality");

  // ── ÉTATS POUR LA MATRIX DE BOUTONS ──
  const [selectedButtons, setSelectedButtons] = useState<string[]>([]);
  const [isDoubleRegardUnlocked, setIsDoubleRegardUnlocked] = useState(false);

  // ── ÉTATS DÉDIÉS AU BOUTON SURPRISE / ÉMERGENCE ──
  const [isSurpriseActive, setIsSurpriseActive] = useState(false);
  const [isPressingSurprise, setIsPressingSurprise] = useState(false);

  // Dictionnaire bilingue complet pour les boutons de la Matrix (Aligné sur "humain")
  const buttonsLabels: Record<string, { fr: string; en: string }> = {
    clarity: { fr: "1🧠 Clarté", en: "1🧠 Clarity" },
    humain: { fr: "2👤 Humain", en: "2👤 Human" },
    critical: { fr: "3⚔️ Regard Critique", en: "3⚔️ Critical View" },
    expert: { fr: "4🎓 Expert", en: "4🎓 Expert" },
    precision: { fr: "5🎯 Précision", en: "5🎯 Precision" },
    philosophy: { fr: "6🏛️ Philosophie", en: "6🏛️ Philosophy" },
    strategy: { fr: "7♟️ Stratégie", en: "7♟️ Strategy" },
    decompose: { fr: "8🧩 Décomposer", en: "8🧩 Decompose" },
    refine: { fr: "9❓ Affiner", en: "9❓ Refine" },
    double: { fr: "10⚡ Double Regard", en: "10⚡ Dual Vision" },
  };

  const buttonsOrder = [
    "clarity", "humain", "critical", "expert", "precision",
    "philosophy", "strategy", "decompose", "refine", "double"
  ];

  const handleButtonClick = (id: string) => {
    if (isSurpriseActive) return;

    if (id === "double") {
      if (selectedButtons.length === 1) {
        setIsDoubleRegardUnlocked(true);
      }
      return;
    }

    if (selectedButtons.includes(id)) {
      const nextSelection = selectedButtons.filter(bId => bId !== id);
      setSelectedButtons(nextSelection);
      if (nextSelection.length < 2) {
        setIsDoubleRegardUnlocked(false);
      }
    } else {
      if (selectedButtons.length === 0) {
        setSelectedButtons([id]);
        setIsDoubleRegardUnlocked(false);
      } else if (selectedButtons.length === 1 && isDoubleRegardUnlocked) {
        setSelectedButtons(prev => [...prev, id]);
      }
    }
  };

  const handleSurpriseToggle = () => {
    if (userTier === "free" || userTier === "basic") {
      alert(lang === "fr" 
        ? "🔒 Le mode Surprise / Émergence est réservé aux membres Premium et supérieurs." 
        : "🔒 Surprise / Emergence mode is exclusive to Premium plans and above."
      );
      return;
    }

    if (isSurpriseActive) {
      setIsSurpriseActive(false);
      setSelectedButtons([]);
    } else {
      setIsSurpriseActive(true);
      setSelectedButtons(["surprise"]);
      setIsDoubleRegardUnlocked(false);
    }
  };

  const getConversationKey = (uid: string | null) => uid ? `echo-conversation-v2-${uid}` : "echo-conversation-v2";
  const getStorageKey = (uid: string) => `echo-calendar-v2-${uid}`;
  const getTierKey = (uid: string) => `echo-user-tier-${uid}`;
  const getHistoryKey = (uid: string | null) => uid ? `echo-history-${uid}` : "echo-history";

  const lastEchoIndex = messages.findLastIndex((m) => /^Echo\s*:/i.test(m.raw));

  const serializeMessages = (msgs: ChatMessage[]) => msgs.map(m => m.raw);
  const deserializeMessages = (raws: string[]): ChatMessage[] => raws.map(r => ({ raw: r }));

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      try {
        const convoKey = getConversationKey(uid);
        const saved = localStorage.getItem(convoKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          const msgs = deserializeMessages(parsed);
          setMessages(msgs);
          lastSavedLength.current = Math.floor(parsed.join("").length / 2000) * 2000;
        } else {
          setMessages([]);
        }
        const savedTier = uid ? localStorage.getItem(getTierKey(uid)) : localStorage.getItem("echo-user-tier");
        if (savedTier) setUserTier(savedTier as any);
      } catch (e) { console.error("Load error", e); }
      setIsLoaded(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) { 
        setUserId(null); setMessages([]); setUserTier("free"); return; 
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const uid = session.user.id;
        setUserId(uid);
        const convoKey = getConversationKey(uid);
        const savedMessages = localStorage.getItem(convoKey);
        setMessages(savedMessages ? deserializeMessages(JSON.parse(savedMessages)) : []);
        const savedTier = localStorage.getItem(getTierKey(uid));
        if (savedTier) setUserTier(savedTier as any);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const raws = serializeMessages(messages);
    localStorage.setItem(getConversationKey(userId), JSON.stringify(raws));
    checkAndSaveHistory(raws);
  }, [messages, isLoaded, userId]);

  useEffect(() => {
    if (!isLoaded) return;
    if (userId) localStorage.setItem(getTierKey(userId), userTier);
    localStorage.setItem("echo-user-tier", userTier);
  }, [userTier, isLoaded, userId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          if (userTier === "free" || userTier === "basic") {
            alert(lang === "fr" ? "L'analyse d'image est disponible avec le plan Premium ou supérieur." : "Image analysis is available on Premium plans and above.");
            event.preventDefault();
            return;
          }

          const file = items[i].getAsFile();
          if (!file) return;

          if (file.size > 5 * 1024 * 1024) {
            alert(lang === "fr" ? "L'image doit faire moins de 5 Mo." : "The image must be smaller than 5 MB.");
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            setSelectedImage(reader.result as string);
            setSelectedImageName(lang === "fr" ? "Capture d'écran collée.png" : "Pasted screenshot.png");
          };
          reader.readAsDataURL(file);
          event.preventDefault();
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [userTier, lang]);

  const checkAndSaveHistory = (raws: string[]) => {
    const totalChars = raws.join("").length;
    const threshold = Math.floor(totalChars / 2000) * 2000;
    if (threshold > lastSavedLength.current && threshold > 0) {
      lastSavedLength.current = threshold;
      const date = new Date().toLocaleString("fr-CA");
      const entry: HistoryEntry = { id: Date.now().toString(), title: `History - ${date}`, date, messages: [...raws] };
      const historyKey = getHistoryKey(userId);
      const history: HistoryEntry[] = JSON.parse(localStorage.getItem(historyKey) || "[]");
      history.unshift(entry);
      localStorage.setItem(historyKey, JSON.stringify(history));
    }
  };

  const lancerDictation = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition is not supported."); return; }
    const r = new SR();
    r.lang = lang === "fr" ? "fr-FR" : "en-US";
    r.onstart = () => setIsListening(true);
    r.onend = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    r.onresult = (e: any) => setInput((p) => p + (p ? " " : "") + e.results[0][0].transcript);
    r.start();
  };

  const handleImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert(lang === "fr" ? "Choisis un fichier image." : "Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(lang === "fr" ? "L'image doit faire moins de 5 Mo." : "The image must be smaller than 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setSelectedImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async () => {
    if (!input.trim() && !selectedImage) return;

    const quotaStatus = checkQuota("prompts", userTier);
    if (!quotaStatus.allowed) {
      const lockMessage = lang === "fr"
        ? 'Echo: 🔒 Limite mensuelle de requêtes atteinte pour votre forfait. Passez au plan supérieur pour continuer à échanger.'
        : 'Echo: 🔒 Monthly prompt request limit reached for your plan. Please upgrade to continue chatting.';
      
      setMessages((prev) => [...prev, { raw: lockMessage }]);
      setActiveLimitCategory("prompts");
      setShowLimitModal(true);
      return;
    }

    const userMessage = input.trim() || (lang === "fr" ? "Analyse cette image." : "Analyze this image.");
    const imageToSend = selectedImage;

    const userRaw = `${lang === "fr" ? "Toi" : "You"}: ${userMessage}`;
    const userEntry: ChatMessage = {
      raw: userRaw,
      imageB64: imageToSend ?? undefined,
    };

    const baseMessages: ChatMessage[] = [...messages, userEntry];
    const thinkingEntry: ChatMessage = { raw: "Echo: ..." };

    setEchoState("thinking");
    setMessages([...baseMessages, thinkingEntry]);
    setInput("");
    setSelectedImage(null);
    setSelectedImageName("");

    const historyForBackend = serializeMessages(baseMessages);
    const calendarEvents = JSON.parse(localStorage.getItem(userId ? getStorageKey(userId) : "echo-calendar-v2") || "{}");

    try {
      const response = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMessage, 
          image: imageToSend, 
          history: historyForBackend, 
          userTier, 
          calendarEvents,
          selectedButtons
        }),
      });
      const data = await response.json();
      setEchoState("speaking");

      if (data.action) {
        const { type } = data.action;
        const quotaCategory = (type === "ADD_BUDGET_EXPENSE" || type === "ADD_CALORIE_LOG" || type === "SET_CALORIE_GOAL" || type === "UPDATE_CALORIE_GOAL") ? "vitality" : "calendar";
        const status = checkQuota(quotaCategory, userTier);
        if (!status.allowed) {
          setMessages([...baseMessages, { raw: `Echo: 🔒 "Do It For You" automated action limit reached for [${quotaCategory}] on this 24h cycle.` }]);
          setActiveLimitCategory(quotaCategory);
          setShowLimitModal(true);
          return;
        }
      }

      setMessages([...baseMessages, { raw: `Echo: ${data.response || ""}` }]);

      if (data.action?.type === "ADD_BUDGET_EXPENSE") {
        const { title, amount, spent, date, paymentDate, paidAt } = data.action.payload;
        const expenses: BudgetExpense[] = JSON.parse(localStorage.getItem("echo-budget-expenses") || "[]");
        localStorage.setItem("echo-budget-expenses", JSON.stringify([...expenses, { id: Date.now().toString(), title: title || "Purchase", amount: parseFloat(amount ?? spent) || 0, date: paymentDate || paidAt || date || new Date().toLocaleDateString("fr-CA") }]));
      }
      if (data.action?.type === "ADD_CALORIE_LOG") {
        const { foodName, meal, title, calories } = data.action.payload;
        const logs: CalorieLog[] = JSON.parse(localStorage.getItem("echo-calorie-logs") || "[]");
        localStorage.setItem("echo-calorie-logs", JSON.stringify([...logs, { id: Date.now().toString(), foodName: foodName || meal || title || "Food Item", calories: parseInt(calories) || 0, date: new Date().toLocaleDateString("fr-CA") }]));
      }
      if (data.action?.type === "SET_CALORIE_GOAL" || data.action?.type === "UPDATE_CALORIE_GOAL") {
        const { goal, calorieGoal, calories } = data.action.payload;
        const nextGoal = parseInt(goal ?? calorieGoal ?? calories);
        if (Number.isFinite(nextGoal) && nextGoal > 0) localStorage.setItem("echo-calorie-goal", nextGoal.toString());
      }
      if (data.action?.type === "ADD_CALENDAR_EVENT") {
        const { title, start, end, notes = "" } = data.action.payload;
        const newEvent = { id: Date.now().toString(), title: title || "Untitled Event", start: start || "", end: end || "", notes: notes || "", isFromEcho: true };
        const storageKey = userId ? getStorageKey(userId) : "echo-calendar-v2";
        const dateKey = start?.split("T")[0] || start || "";
        if (dateKey) {
          const existing = JSON.parse(localStorage.getItem(storageKey) || "{}");
          existing[dateKey] = [...(existing[dateKey] || []), newEvent];
          localStorage.setItem(storageKey, JSON.stringify(existing));
        }
      }
    } catch {
      setMessages([...baseMessages, { raw: "Echo: Unable to connect to backend server." }]);
    }
    setTimeout(() => setEchoState("idle"), 10000);
  };

  const isMatrixLockedBySurprise = isSurpriseActive;

  return (
    <main className="h-screen bg-white dark:bg-black text-black dark:text-white flex overflow-hidden font-sans transition-colors duration-200 selection:bg-cyan-500/30">

      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* SIDEBAR GAUCHE PROPRE AVEC BOUTON SURPRISE INTÉGRÉ AU-DESSUS DE ULTRA */}
        <aside className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-8 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between">
          <div className="space-y-20">
            <h2 className="font-bold text-lg">
              <Link href="/" className="hover:text-cyan-500 dark:hover:text-cyan-400">{t.sidebar.home}</Link>
            </h2>
            <div className="space-y-20 text-zinc-800 dark:text-zinc-100 font-medium">
              <Link href="/chat" className="block text-cyan-600 dark:text-cyan-400 font-bold">{t.sidebar.chat}</Link>
              <Link href="/notes" className="block hover:text-cyan-500">{t.sidebar.notes}</Link>
              <Link href="/calendar" className="block hover:text-cyan-500">📅 {lang === "fr" ? "Calendrier" : "Calendar"}</Link>
              <Link href="/vitality" className="block hover:text-cyan-500">📈 {lang === "fr" ? "Vitalité" : "Vitality"}</Link>
              <Link href="/services" className="block hover:text-cyan-500">💎 {lang === "fr" ? "Services" : "Services"}</Link>
              <Link href="/account" className="block hover:text-cyan-500">👤 {lang === "fr" ? "Compte" : "Account"}</Link>
              <hr className="border-zinc-200 dark:border-zinc-800 my-4" />
              <Link href="/history" className="block hover:text-amber-500">⭐ {lang === "fr" ? "Historique" : "History"}</Link>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            {/* ── 💎 LE BOUTON SURPRISE PREND SA PLACE PARFAITE AU-DESSUS DU STATUT ── */}
            <button
              onMouseDown={() => { if (!selectedButtons.filter(b => b !== "surprise").length) setIsPressingSurprise(true); }}
              onMouseUp={() => setIsPressingSurprise(false)}
              onMouseLeave={() => setIsPressingSurprise(false)}
              onTouchStart={() => { if (!selectedButtons.filter(b => b !== "surprise").length) setIsPressingSurprise(true); }}
              onTouchEnd={() => setIsPressingSurprise(false)}
              onClick={handleSurpriseToggle}
              disabled={selectedButtons.length > 0 && !isSurpriseActive}
              className={`
                w-full py-3.5 px-3 rounded-xl text-[10px] font-black tracking-widest font-mono uppercase transition-all duration-300 border text-center select-none shadow-sm
                ${selectedButtons.length > 0 && !isSurpriseActive
                  ? "opacity-25 cursor-not-allowed bg-transparent border-zinc-200 dark:border-zinc-900 text-zinc-500 shadow-none"
                  : isSurpriseActive
                    ? "bg-gradient-to-r from-purple-500/30 to-cyan-500/30 text-purple-400 dark:text-purple-300 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-102"
                    : "bg-purple-500/[0.04] dark:bg-purple-950/[0.06] text-purple-600 dark:text-purple-400 border-purple-700/40 dark:border-purple-900/50 hover:border-purple-400 hover:shadow-[0_0_12px_rgba(168,85,247,0.3)] hover:bg-purple-500/10"
                }
              `}
            >
              {isPressingSurprise ? "💎 Émergence 💎" : "💎 Surprise 💎"}
            </button>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
              Status : <span className="text-cyan-500 dark:text-cyan-400 uppercase font-bold block">{userTier}</span>
            </div>
          </div>
        </aside>

        {/* ── INTERFACE CENTRALE : LE CHAT ── */}
        <section className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-black transition-colors duration-200 min-w-0">
          
          <div className="flex-1 flex flex-row overflow-hidden min-h-0 w-full">
            
            {/* ZONE DE MESSAGES GAUCHE RESPIRANTE */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-white dark:bg-black">
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <p className="text-zinc-400 dark:text-zinc-700 text-sm italic">{lang === "fr" ? "Commence une conversation avec Echo..." : "Start a conversation with Echo..."}</p>
                </div>
              )}

              <div className="max-w-4xl mx-auto pl-10 pr-6 py-10 flex flex-col gap-10 w-full">
                {messages.map((msg, index) => {
                  const isEcho = /^Echo\s*:/i.test(msg.raw);
                  const isUser = /^(You|Toi)\s*:/i.test(msg.raw);
                  const isLastEcho = isEcho && index === lastEchoIndex;
                  const cleanText = isEcho
                    ? msg.raw.replace(/^Echo\s*:\s*/i, "")
                    : msg.raw.replace(/^(You|Toi)\s*:\s*/i, "");

                  if (isEcho) {
                    return (
                      <div key={index} className="flex flex-col gap-4 animate-in fade-in duration-300 max-w-3xl">
                        <div className="flex items-center gap-6">
                          <div className={`shrink-0 border-2 border-zinc-200 dark:border-zinc-800 rounded-full shadow-md overflow-hidden ${
                            isLastEcho
                              ? echoState === "thinking" ? "echo-thinking" : echoState === "speaking" ? "echo-speaking" : "echo-idle"
                              : "echo-idle"
                          }`}>
                            <Image src="/echo.png" alt="Echo Avatar" width={96} height={96} className="object-cover rounded-full" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-zinc-500 dark:text-zinc-300 text-sm font-mono uppercase tracking-widest font-bold">Echo</span>
                            <span className="text-zinc-400 dark:text-zinc-600 text-[10px] font-mono">Core Frequency</span>
                          </div>
                        </div>
                        <div className="text-zinc-800 dark:text-zinc-200 text-[15px] leading-8 font-normal tracking-wide selection:bg-cyan-500/30 flex flex-col gap-5 pl-2 sm:pl-28 overflow-hidden">
                          {cleanText.split(/\n\n+/).map((block, i) => (
                            <p key={i} className="whitespace-pre-wrap break-words">{block}</p>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (isUser) {
                    return (
                      <div key={index} className="flex justify-start animate-in fade-in duration-200 max-w-3xl :pl-28">
                        <div className="max-w-xl min-w-0 flex flex-col items-start gap-2">
                          {msg.imageB64 && (
                            <img
                              src={msg.imageB64}
                              alt="image envoyée"
                              className="max-w-[160px] max-h-[120px] rounded-xl border border-zinc-700 object-cover shadow-md"
                            />
                          )}
                          {cleanText && cleanText !== "Analyse cette image." && cleanText !== "Analyze this image." && (
                            <p className="text-zinc-800 dark:text-zinc-300 text-[14px] leading-7 tracking-wide bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 inline-block text-left break-words whitespace-pre-wrap shadow-inner selection:bg-cyan-500/30 max-w-full">
                              {cleanText}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* ── COLONNE DE DROITE : SANS LE TITRE POUR ÉVITER TOUT OVERFLOW ── */}
            <div className="w-64 shrink-0 border-l border-zinc-100 dark:border-zinc-900/60 flex flex-col bg-zinc-50/20 dark:bg-zinc-950/10 overflow-hidden h-full">
              
              {/* PANNEAU LANGUE & THÈME */}
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-900/80 bg-transparent flex gap-3 items-center justify-between shadow-sm shrink-0">
                <LangDropdown />
                <button onClick={toggleTheme} className="font-bold text-[11px] text-zinc-700 dark:text-zinc-300 hover:text-cyan-500 transition-colors bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 py-1.5 px-2.5 rounded-lg">
                  {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
                </button>
              </div>

              {/* LISTE PURIFIÉE DES BOUTONS DE LA MATRIX (AUCUNE SCROLL BAR) */}
              <div className="flex-1 p-4 overflow-hidden flex flex-col gap-2 justify-start">
                {buttonsOrder.map((id) => {
                  const isSelected = selectedButtons.includes(id);
                  const isDoubleRegard = id === "double";
                  let isLocked = isMatrixLockedBySurprise;

                  if (!isLocked) {
                    if (!isDoubleRegard) {
                      if (selectedButtons.length === 1) {
                        if (!isSelected && !isDoubleRegardUnlocked) {
                          isLocked = true;
                        }
                      } else if (selectedButtons.length === 2) {
                        if (!isSelected) {
                          isLocked = true;
                        }
                      }
                    } else {
                      if (selectedButtons.length === 0 || selectedButtons.length === 2) {
                        isLocked = true;
                      }
                    }
                  }

                  return (
                    <button
                      key={id}
                      disabled={isLocked}
                      onClick={() => handleButtonClick(id)}
                      className={`
                        w-full py-2.5 px-3 rounded-xl text-xs font-bold font-mono tracking-wide uppercase transition-all duration-300 border text-left select-none truncate
                        ${isLocked 
                          ? "opacity-20 cursor-not-allowed bg-transparent border-zinc-200 dark:border-zinc-900 text-zinc-500 shadow-none" 
                          : isSelected || (isDoubleRegard && isDoubleRegardUnlocked)
                            ? "bg-cyan-500/30 text-cyan-400 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-102"
                            : "bg-cyan-500/[0.03] dark:bg-cyan-950/[0.05] text-cyan-600 dark:text-cyan-400 border-cyan-700/40 dark:border-cyan-900/60 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.35)] hover:bg-cyan-500/10"
                        }
                      `}
                    >
                      {lang === "fr" ? buttonsLabels[id].fr : buttonsLabels[id].en}
                    </button>
                  );
                })}
              </div>

            </div>

          </div>

          {/* INPUT COMPOSANT */}
          <div className="border-t border-zinc-200 dark:border-zinc-900 px-6 py-5 shrink-0 bg-zinc-50 dark:bg-black transition-colors duration-200">
            <div className="max-w-4xl mx-auto flex flex-col gap-3">

              {selectedImage && (
                <div className="flex items-center gap-3 bg-violet-500/10 border border-violet-500/20 rounded-xl px-3 py-2">
                  <img src={selectedImage} alt="preview" className="w-10 h-10 rounded-lg object-cover border border-violet-500/30" />
                  <span className="text-[11px] text-violet-400 font-medium truncate flex-1">{selectedImageName}</span>
                  <button onClick={() => { setSelectedImage(null); setSelectedImageName(""); }} className="text-zinc-400 hover:text-red-500 font-bold text-sm shrink-0">✕</button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end w-full">
                <textarea
                  value={input}
                  maxLength={getMessageMaxLength(userTier)}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={t.chat.placeholder}
                  className="flex-1 bg-white dark:bg-zinc-950 text-black dark:text-white border border-zinc-200 dark:border-zinc-900 rounded-xl p-4 resize-y min-h-[136px] max-h-[220px] text-sm focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 placeholder-zinc-400 dark:placeholder-zinc-700 transition-colors leading-relaxed shadow-inner"
                />

                <div className="flex sm:flex-col gap-2 sm:w-40 shrink-0 sm:h-[136px]">
                  <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelection} className="hidden" />

                  <button
                    type="button"
                    disabled={userTier === "free" || userTier === "basic"}
                    onClick={() => imageInputRef.current?.click()}
                    title={userTier === "free" || userTier === "basic" ? (lang === "fr" ? "Disponible avec le plan Premium ou supérieur" : "Available on Premium plans and above") : selectedImageName}
                    className={`w-full flex-1 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all shadow-sm ${
                      userTier === "free" || userTier === "basic"
                        ? "cursor-not-allowed bg-zinc-200 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-500"
                        : selectedImage
                          ? "bg-emerald-600/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                          : "bg-violet-600/10 border-violet-500/30 hover:bg-violet-600/20 text-violet-600 dark:text-violet-400"
                    }`}
                  >
                    <span>{userTier === "free" || userTier === "basic" ? "🔒" : selectedImage ? "✓" : "🖼️"}</span>
                    <span className="truncate">{selectedImage ? (lang === "fr" ? "Image prête" : "Image Ready") : (lang === "fr" ? "Analyse d'image" : "Image Analysis")}</span>
                  </button>

                  <button
                    onClick={lancerDictation}
                    className={`w-full flex-1 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 border shadow-sm ${
                      isListening
                        ? "bg-red-600 border-red-500 animate-pulse text-white"
                        : "bg-cyan-600/10 border-cyan-500/30 hover:bg-cyan-600/20 text-cyan-700 dark:text-cyan-400"
                    }`}
                  >
                    {isListening ? "🔴 Stop" : (lang === "fr" ? "🎤 Parler" : "🎤 Speak")}
                  </button>

                  <button
                    onClick={sendMessage}
                    className="w-full flex-1 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold text-xs text-white transition-all shadow-md uppercase tracking-wider"
                  >
                    {t.chat.send}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showLimitModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShowLimitModal(false)}>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🔒</div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 capitalize">{activeLimitCategory} Limit</h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6">
              {activeLimitCategory === "prompts"
                ? (lang === "fr" 
                    ? "Votre quota mensuel de messages est épuisé. Élevez votre sillage vers un forfait supérieur pour continuer l'expérience." 
                    : "Your monthly message quota has been reached. Upgrade your tier to unlock unlimited interactions.")
                : (lang === "fr"
                    ? `Vous avez épuisé votre limite d'actions automatisées pour le module ${activeLimitCategory} sur ce plan.`
                    : `You have exhausted your automated action limit for the ${activeLimitCategory} module on this plan tier.`)
              }
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/services" onClick={() => setShowLimitModal(false)} className="w-full bg-cyan-600 hover:bg-cyan-500 py-3 rounded-xl font-bold text-sm transition-all text-center text-white">🚀 {lang === "fr" ? "Améliorer le plan" : "Upgrade Plan Tier"}</Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}