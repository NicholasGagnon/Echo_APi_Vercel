"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "./lib/supabase";
import { checkQuota, getMessageMaxLength, UserTier } from "../utils/quota"; 
import LangDropdown from "./components/LangDropdown";
import TutorialHeaderControls from "./components/TutorialHeaderControls";
import { useApp } from "../context/AppContext";

type HistoryEntry = {
  id: string;
  title: string;
  date: string;
  messages: string[];
};

type EchoMessage = {
  raw: string;         // "You: ..." | "Echo: ..."
  imageB64?: string;   // miniature base64 attachée au message user
};

type StickyNote = {
  id: string;
  text: string;
  color: "yellow" | "blue" | "green" | "pink";
};

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  notes: string;
};

type CalendarEvents = Record<string, CalendarEvent[]>;

type UpcomingEvent = CalendarEvent & {
  dateKey: string;
  diffDays: number;
};

type BudgetExpense = { id: string; title: string; amount: number; date: string; };
type CalorieLog = { id: string; foodName: string; calories: number; date: string; };

const USER_TIERS: UserTier[] = ["connected_free", "basic", "premium", "ultra", "founder"];

const isUserTier = (value: unknown): value is UserTier =>
  typeof value === "string" && USER_TIERS.includes(value as UserTier);

// Normalise toute ancienne valeur de tier (ex: "free", venant de Supabase ou
// d'un vieux localStorage) vers le nouveau schéma où "connected_free" est le
// palier d'entrée gratuit pour l'utilisateur, mais routé sur l'infra payante
// côté backend (cause de l'ancien bug de quota / clé API gratuite cassée).
const normalizeTier = (raw: unknown): UserTier => {
  if (typeof raw !== "string") return "connected_free";
  const cleaned = raw.toLowerCase().trim();
  if (cleaned === "free" || cleaned === "connected_free") return "connected_free";
  if (isUserTier(cleaned)) return cleaned;
  return "connected_free";
};

const fetchUserTier = async (uid: string): Promise<UserTier> => {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_tier")
    .eq("id", uid)
    .single();

  if (!error && profile?.user_tier) {
    const tier = normalizeTier(profile.user_tier);
    localStorage.setItem(`echo-user-tier-${uid}`, tier);
    localStorage.setItem("echo-user-tier", tier);
    return tier;
  }

  const cachedTier = localStorage.getItem(`echo-user-tier-${uid}`);
  return normalizeTier(cachedTier);
};

const STICKY_STYLES = {
  yellow: { bg: "bg-yellow-950/40 dark:bg-yellow-950", border: "border-yellow-600/50 dark:border-yellow-600", text: "text-yellow-900 dark:text-yellow-200", dot: "bg-yellow-400" },
  blue: { bg: "bg-blue-950/40 dark:bg-blue-950", border: "border-blue-500/50 dark:border-blue-500", text: "text-blue-900 dark:text-blue-200", dot: "bg-blue-400" },
  green: { bg: "bg-green-950/40 dark:bg-green-950", border: "border-green-600/50 dark:border-green-600", text: "text-green-900 dark:text-green-200", dot: "bg-green-400" },
  pink: { bg: "bg-pink-950/40 dark:bg-pink-950", border: "border-pink-600/50 dark:border-pink-600", text: "text-pink-900 dark:text-pink-200", dot: "bg-pink-400" },
};

const EVENT_DOT_COLORS = ["bg-cyan-400", "bg-green-400", "bg-yellow-400"];

export default function Home() {
  const { t, lang, theme, toggleTheme } = useApp();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<EchoMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null); 
  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSavedLength = useRef(0);

  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState("");

  // ── COLONNES GAUCHE/DROITE REDIMENSIONNABLES À LA SOURIS ──
  const [leftPanelWidth, setLeftPanelWidth] = useState(220);
  const [rightPanelWidth, setRightPanelWidth] = useState(272);
  const [isDesktop, setIsDesktop] = useState(false);
  const resizingSideRef = useRef<"left" | "right" | null>(null);

  useEffect(() => {
    const savedLeft = parseInt(localStorage.getItem("echo-home-left-width") || "", 10);
    if (Number.isFinite(savedLeft)) setLeftPanelWidth(Math.min(340, Math.max(180, savedLeft)));
    const savedRight = parseInt(localStorage.getItem("echo-home-panel-width") || "", 10);
    if (Number.isFinite(savedRight)) setRightPanelWidth(Math.min(440, Math.max(220, savedRight)));

    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const startPanelResize = (side: "left" | "right") => (e: React.MouseEvent) => {
    e.preventDefault();
    resizingSideRef.current = side;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const side = resizingSideRef.current;
      if (!side) return;
      if (side === "left") {
        setLeftPanelWidth(Math.min(340, Math.max(180, e.clientX)));
      } else {
        setRightPanelWidth(Math.min(440, Math.max(220, window.innerWidth - e.clientX)));
      }
    };
    const onUp = () => {
      if (!resizingSideRef.current) return;
      resizingSideRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("echo-home-left-width", String(leftPanelWidth));
  }, [leftPanelWidth]);

  useEffect(() => {
    localStorage.setItem("echo-home-panel-width", String(rightPanelWidth));
  }, [rightPanelWidth]);

  const [stickies, setStickies] = useState<StickyNote[]>([]);
  const [newStickyText, setNewStickyText] = useState("");
  const [selectedColor, setSelectedColor] = useState<StickyNote["color"]>("yellow");
  
  const [expandedSticky, setExpandedSticky] = useState<StickyNote | null>(null);
  const [editText, setEditText] = useState("");

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvents>({});
  const [userTier, setUserTier] = useState<UserTier>("connected_free");
  const [echoState, setEchoState] = useState("idle");

  // ── CONFIGURATION DES COMPTEURS & MENUS DROPDOWN ──
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);

  // ── ÉTATS POUR LA MATRIX DE BOUTONS ──
  const [selectedButtons, setSelectedButtons] = useState<string[]>([]);
  const [isDoubleRegardUnlocked, setIsDoubleRegardUnlocked] = useState(false);

  // Dictionnaire de secours multilingue local pour les libellés des boutons comportementaux
  const localButtonsLabels: Record<"fr" | "en", Record<string, string>> = {
    fr: {
      clarity: "1🧠 Clarté",
      humain: "2👤 Humain",
      critical: "3⚔️ Regard critique",
      expert: "4🎓 Expert",
      precision: "5🎯 Précision",
      philosophy: "6🏛️ Philosophie",
      strategy: "7♟️ Stratégie",
      decompose: "8🧩 Décomposer",
      refine: "9❓ Affiner",
      double: "10⚡ Double Regard"
    },
    en: {
      clarity: "1🧠 Clarity",
      humain: "2👤 Human",
      critical: "3⚔️ Critical View",
      expert: "4🎓 Expert",
      precision: "5🎯 Precision",
      philosophy: "6🏛️ Philosophy",
      strategy: "7♟️ Strategy",
      decompose: "8🧩 Decompose",
      refine: "9❓ Refine",
      double: "10⚡ Double Regard"
    }
  };

  const buttonsData = [
    { id: "clarity" },
    { id: "humain" },
    { id: "critical" },
    { id: "expert" },
    { id: "precision" },
    { id: "philosophy" },
    { id: "strategy" },
    { id: "decompose" },
    { id: "refine" },
    { id: "double" },
  ];

  const handleButtonClick = (id: string) => {
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

  const getConversationKey = (uid: string | null) => uid ? `echo-conversation-v2-${uid}` : "echo-conversation-v2";
  const getStorageKey = (uid: string) => `echo-calendar-v2-${uid}`;
  const getTierKey = (uid: string) => `echo-user-tier-${uid}`;
  const getStickyKey = (uid: string | null) => uid ? `echo-stickies-v2-${uid}` : "echo-stickies-v2";
  const getHistoryKey = (uid: string | null) => uid ? `echo-history-${uid}` : "echo-history";

  const [showLimitModal, setShowLimitModal] = useState(false);
  const [activeLimitCategory, setActiveLimitCategory] = useState<"vitality" | "calendar" | "prompts" >("vitality");

  const lastEchoIndex = messages.findLastIndex((m) => /^Echo\s*:/i.test(m.raw));

  const serializeMsgs = (msgs: EchoMessage[]) => msgs.map((m) => m.raw);
  const deserializeMsgs = (raws: string[]): EchoMessage[] => raws.map((r) => ({ raw: r }));

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id || null;
      setUserId(uid);

      try {
        const convoKey = getConversationKey(uid);
        const savedMessages = localStorage.getItem(convoKey);
        if (savedMessages) {
          const parsed: string[] = JSON.parse(savedMessages);
          setMessages(deserializeMsgs(parsed));
          const totalChars = parsed.join("").length;
          lastSavedLength.current = Math.floor(totalChars / 2000) * 2000;
        } else {
          setMessages([]);
        }

        const stickyKey = getStickyKey(uid);
        const savedStickies = localStorage.getItem(stickyKey);
        if (savedStickies) {
          setStickies(JSON.parse(savedStickies));
        }

        const key = uid ? getStorageKey(uid) : "echo-calendar-v2";
        const savedCalendar = localStorage.getItem(key);
        if (savedCalendar) {
          setCalendarEvents(JSON.parse(savedCalendar));
        }

        if (uid) {
          setUserTier(await fetchUserTier(uid));
        } else {
          setUserTier("connected_free");
        }

        // ── SYNC DE L'ONBOARDING TUTORIEL ──
        const isTutoDone = localStorage.getItem("echo-tuto-done-v1");
        if (!isTutoDone) {
          setTutorialStep(1);
        }
      } catch (e) {
        console.error("Load error", e);
      }
      setIsLoaded(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        setUserId(null);
        setCalendarEvents({});
        setStickies([]); 
        setMessages([]); 
        setUserTier("connected_free");
        return;
      }
      if (session?.user) {
        const uid = session.user.id;
        setUserId(uid);

        const savedConvo = localStorage.getItem(getConversationKey(uid));
        setMessages(savedConvo ? deserializeMsgs(JSON.parse(savedConvo)) : []);
        setCalendarEvents(localStorage.getItem(getStorageKey(uid)) ? JSON.parse(localStorage.getItem(getStorageKey(uid))!) : {});
        setStickies(localStorage.getItem(getStickyKey(uid)) ? JSON.parse(localStorage.getItem(getStickyKey(uid))!) : []);
        
        setUserTier(await fetchUserTier(uid));
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const raws = serializeMsgs(messages);
    localStorage.setItem(getConversationKey(userId), JSON.stringify(raws));
    checkAndSaveHistory(raws);
  }, [messages, isLoaded, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(getStickyKey(userId), JSON.stringify(stickies));
  }, [stickies, isLoaded, userId]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(userId ? getStorageKey(userId) : "echo-calendar-v2", JSON.stringify(calendarEvents));
  }, [calendarEvents, isLoaded, userId]);

  useEffect(() => {
    if (!isLoaded) return;
    if (userId) localStorage.setItem(getTierKey(userId), userTier);
    localStorage.setItem("echo-user-tier", userTier);
  }, [userTier, isLoaded, userId]);

  const checkAndSaveHistory = async (msgs: string[]) => {
    const totalChars = msgs.join("").length;
    const threshold = Math.floor(totalChars / 2000) * 2000;
    if (threshold > lastSavedLength.current && threshold > 0) {
      lastSavedLength.current = threshold;
      const date = new Date().toLocaleString("fr-CA");
      const entry: HistoryEntry = { id: Date.now().toString(), title: `History - ${date}`, date, messages: [...msgs] };
      const saved = localStorage.getItem(getHistoryKey(userId));
      const history: HistoryEntry[] = saved ? JSON.parse(saved) : [];
      history.unshift(entry);
      localStorage.setItem(getHistoryKey(userId), JSON.stringify(history));
    }
  };

  const upcomingEvents: UpcomingEvent[] = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const results: UpcomingEvent[] = [];
    for (const [dateKey, evts] of Object.entries(calendarEvents)) {
      const d = new Date(dateKey + "T00:00:00");
      const diffDays = Math.floor((d.getTime() - today.getTime()) / 86400000);
      if (diffDays >= 0 && diffDays <= 30) {
        evts.forEach((ev) => results.push({ ...ev, dateKey, diffDays }));
      }
    }
    return results.sort((a, b) => a.diffDays - b.diffDays).slice(0, 6);
  })();

  const compressImage = (base64: string): Promise<string> =>
    new Promise((resolve) => {
      const img = document.createElement("img");
      img.onload = () => {
        const MAX = 1200;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round((h * MAX) / w); w = MAX; }
          else       { w = Math.round((w * MAX) / h); h = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = base64;
    });

  const envoyer = async () => {
    if (!message.trim() && !selectedImage) return;

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

    const userMessage  = message.trim();
    const currentImage = selectedImage;
    const currentName  = selectedImageName;

    const userRaw = userMessage
      ? `You: ${userMessage}`
      : `You: ${lang === "fr" ? "Analyse cette image" : "Analyze this image"}${currentName ? ` (${currentName})` : ""}.`;

    const userEntry: EchoMessage = {
      raw: userRaw,
      imageB64: currentImage ?? undefined,
    };

    const baseMessages: EchoMessage[] = [...messages, userEntry];
    const thinkingEntry: EchoMessage  = { raw: "Echo: ..." };

    setEchoState("thinking");
    setMessages([...baseMessages, thinkingEntry]);
    setMessage("");
    setSelectedImage(null);
    setSelectedImageName("");

    const historyForBackend = serializeMsgs(baseMessages);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage || `${lang === "fr" ? "Analyse cette image" : "Analyze this image"}${currentName ? ` (${currentName})` : ""}.`,
          image: currentImage ?? null,
          history: historyForBackend,
          userTier: userTier,
          calendarEvents,
          selectedButtons,
        }),
      });
      
      const data = await response.json();
      setEchoState("speaking");

      let isActionBlocked = false;
      let blockedCategory: "vitality" | "calendar" | null = null;
      if (data.action) {
        const { type } = data.action;
        const quotaCategory = (type === "ADD_BUDGET_EXPENSE" || type === "ADD_CALORIE_LOG") ? "vitality" : "calendar";
        const status = checkQuota(quotaCategory, userTier);
        
        if (!status.allowed) {
          setActiveLimitCategory(quotaCategory);
          setShowLimitModal(true);
          isActionBlocked = true;
          blockedCategory = quotaCategory;
        }
      }

      const echoText = data.response || (typeof data === "string" ? data : "");
      const actionNotice = isActionBlocked ? `\n\n[🔒 Action bloquée par quota "${blockedCategory}"]` : "";
      setMessages([...baseMessages, { raw: `Echo: ${echoText}${actionNotice}` }]);

      if (data.action && !isActionBlocked) {
        if (data.action.type === "ADD_BUDGET_EXPENSE") {
          const { title, amount, spent, date, paymentDate, paidAt } = data.action.payload;
          const expenses: BudgetExpense[] = JSON.parse(localStorage.getItem("echo-budget-expenses") || "[]");
          localStorage.setItem("echo-budget-expenses", JSON.stringify([...expenses, { id: Date.now().toString(), title: title || "Purchase", amount: parseFloat(amount ?? spent) || 0, date: paymentDate || paidAt || date || new Date().toLocaleDateString("fr-CA") }]));
        }

        if (data.action.type === "ADD_CALORIE_LOG") {
          const { foodName, calories } = data.action.payload;
          const caloriesLogs: CalorieLog[] = JSON.parse(localStorage.getItem("echo-calorie-logs") || "[]");
          localStorage.setItem("echo-calorie-logs", JSON.stringify([...caloriesLogs, { id: Date.now().toString(), foodName: foodName || "Food Item", calories: parseInt(calories) || 0, date: new Date().toLocaleDateString("fr-CA") }]));
        }

        if (data.action.type === "SET_CALORIE_GOAL" || data.action.type === "UPDATE_CALORIE_GOAL") {
          const { goal, calorieGoal, calories } = data.action.payload;
          const nextGoal = parseInt(goal ?? calorieGoal ?? calories);
          if (Number.isFinite(nextGoal) && nextGoal > 0) {
            localStorage.setItem("echo-calorie-goal", nextGoal.toString());
          }
        }

        if (data.action.type === "ADD_CALENDAR_EVENT") {
          const { title, start, end, notes } = data.action.payload;
          const newEvent = { id: Date.now().toString(), title: title || "Untitled Event", start: start || "", end: end || "", notes: notes || "", isFromEcho: true };
          const storageKey = userId ? `echo-calendar-v2-${userId}` : "echo-calendar-v2";
          const dateKey = start?.split("T")[0] || start || "";
          
          if (dateKey) {
            const existing = JSON.parse(localStorage.getItem(storageKey) || "{}");
            existing[dateKey] = [...(existing[dateKey] || []), newEvent];
            localStorage.setItem(storageKey, JSON.stringify(existing));
          }

          setCalendarEvents((prev) => ({ ...prev, [dateKey]: [...(prev[dateKey] || []), newEvent] }));
        }
      }
    } catch {
      setMessages([...baseMessages, { raw: "Echo: LOCAL SERVER CONNECTION ERROR" }]);
    } finally {
      setTimeout(() => setEchoState("idle"), 10000);
    }
  };

  const lancerDictation = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition is not supported."); return; }
    const recognition = new SR();
    recognition.lang = "fr-FR";
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => setMessage((prev) => prev + (prev ? " " : "") + event.results[0][0].transcript);
    recognition.start();
  };

  const isImageButtonLocked = userTier === "connected_free" || userTier === "basic";

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
    reader.onload = async () => {
      const compressed = await compressImage(reader.result as string);
      setSelectedImage(compressed);
      setSelectedImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (isImageButtonLocked) return;
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) continue;
        event.preventDefault();

        if (file.size > 5 * 1024 * 1024) {
          alert(lang === "fr" ? "L'image doit faire moins de 5 Mo." : "The image must be smaller than 5 MB.");
          return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
          const compressed = await compressImage(reader.result as string);
          setSelectedImage(compressed);
          setSelectedImageName(`screenshot-${Date.now()}.png`);
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  };

  const addSticky = () => {
    if (!newStickyText.trim()) return;
    const newNote: StickyNote = { id: Date.now().toString(), text: newStickyText.trim(), color: selectedColor };
    setStickies((prev) => [...prev, newNote]);
    setNewStickyText("");
  };

  const deleteSticky = (id: string) => setStickies((prev) => prev.filter((s) => s.id !== id));

  const saveStickyEdit = () => {
    if (!expandedSticky) return;
    setStickies((prev) => prev.map((s) => (s.id === expandedSticky.id ? { ...s, text: editText } : s)));
    setExpandedSticky(null);
  };

  const diffDaysLabel = (d: number) => {
    if (d === 0) return lang === "fr" ? "Aujourd'hui" : "Today";
    if (d === 1) return lang === "fr" ? "Demain" : "Tomorrow";
    return lang === "fr" ? `Dans ${d} jours` : `In ${d} days`;
  };

  // Fermer le menu lors du clic à l'extérieur
  useEffect(() => {
    const handleOutsideClick = () => setIsSettingsOpen(false);
    if (isSettingsOpen) {
      window.addEventListener("click", handleOutsideClick);
    }
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [isSettingsOpen]);

  return (
    <main className="h-screen bg-white dark:bg-black text-black dark:text-white flex overflow-hidden relative font-sans transition-colors duration-200 selection:bg-cyan-500/30">

      <div className="flex flex-1 overflow-hidden min-h-0">

        <aside
          style={isDesktop ? { width: leftPanelWidth, flexBasis: leftPanelWidth } : undefined}
          className="w-55 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-8 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between"
        >
          <div className="space-y-20">
            <h2 className="font-bold text-lg">
              <Link href="/" className="text-cyan-600 dark:text-cyan-400 font-bold">{t.sidebar.home}</Link>
            </h2>
            <div className="space-y-20 text-zinc-800 dark:text-zinc-100 font-medium">
              <Link href="/chat" className="block hover:text-cyan-500">{t.sidebar.chat}</Link>
              <Link href="/books" className="block hover:text-cyan-500">{t.sidebar.books}</Link>
              <Link href="/calendar" className="block hover:text-cyan-500">📅 {lang === "fr" ? "Calendrier" : "Calendar"}</Link>
              <Link href="/vitality" className="block hover:text-cyan-500">📈 {lang === "fr" ? "Vitalité" : "Vitality"}</Link>
              <Link href="/services" className="block hover:text-cyan-500">💎 {lang === "fr" ? "Services" : "Services"}</Link>
              <Link href="/account" className="block hover:text-cyan-500">👤 {lang === "fr" ? "Compte" : "Account"}</Link>
              <hr className="border-zinc-200 dark:border-zinc-800 my-4" />
              <Link href="/history" className="block hover:text-amber-500">⭐ {lang === "fr" ? "Historique" : "History"}</Link>
            </div>
          </div>
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
            Status : <span className="text-cyan-500 dark:text-cyan-400 uppercase font-bold block">{userTier}</span>
          </div>
        </aside>

        {/* ── POIGNÉE DE REDIMENSIONNEMENT GAUCHE (DESKTOP UNIQUEMENT) ── */}
        <div
          onMouseDown={startPanelResize("left")}
          className="hidden lg:flex w-2.5 shrink-0 cursor-col-resize items-center justify-center group"
        >
          <div className="w-1 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 group-hover:bg-cyan-500 transition-colors" />
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

          <section className="flex-1 flex flex-col p-4 min-w-0 overflow-hidden relative">
            
            {/* ── INTERFACE 10 BOUTONS MATRIX (AVEC SYNC DU DICTIONNAIRE MULTILINGUE) ── */}
            <div className="w-full max-w-4xl mx-auto bg-zinc-50/50 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200 dark:border-zinc-900 rounded-2xl p-3 shadow-lg relative">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
                {buttonsData.map((btn) => {
                  const isSelected = selectedButtons.includes(btn.id);
                  const isDoubleRegard = btn.id === "double";

                  let isLocked = false;

                  if (!isDoubleRegard) {
                    if (selectedButtons.length === 1) {
                      if (!isSelected && !isDoubleRegardUnlocked) {
                        isLocked = true;
                      }
                    } 
                    else if (selectedButtons.length === 2) {
                      if (!isSelected) {
                        isLocked = true;
                      }
                    }
                  } else {
                    if (selectedButtons.length === 0 || selectedButtons.length === 2) {
                      isLocked = true;
                    }
                  }

                  // Résolution dynamique du libellé selon la langue active de l'écosystème Echo
                  const currentLabel = localButtonsLabels[lang]?.[btn.id] || localButtonsLabels.fr[btn.id];

                  return (
                    <button
                      key={btn.id}
                      disabled={isLocked}
                      onClick={() => handleButtonClick(btn.id)}
                      title={currentLabel}
                      className={`
                        h-9 px-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 border select-none truncate flex items-center justify-center
                        ${isLocked
                          ? "opacity-30 cursor-not-allowed bg-transparent border-zinc-200 dark:border-zinc-900 text-zinc-400"
                          : isSelected || (isDoubleRegard && isDoubleRegardUnlocked)
                            ? "bg-cyan-500 text-white border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]"
                            : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-400"
                        }
                      `}
                    >
                      {currentLabel}
                    </button>
                  );
                })}
              </div>

              {/* ── 📖 PAROLE D'ECHO — AVATAR EN COLONNE FIXE À GAUCHE, TEXTE À DROITE (ANTI-CHEVAUCHEMENT) ── */}
              {tutorialStep === 1 && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-4 w-[92vw] max-w-[460px] sm:max-w-[700px] max-h-[85vh] overflow-y-auto bg-zinc-950 text-white dark:bg-white dark:text-black rounded-2xl p-5 sm:p-6 shadow-[0_0_35px_rgba(6,182,212,0.6)] border-2 border-cyan-400 dark:border-cyan-500 animate-in fade-in slide-in-from-top-4 duration-300 z-50">
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-zinc-950 dark:bg-white rotate-45 border-l-2 border-t-2 border-cyan-400 dark:border-cyan-500" />
                  <TutorialHeaderControls onClose={() => { setTutorialStep(null); localStorage.setItem("echo-tuto-done-v1", "true"); }} />

                  <div className="flex items-center gap-3 mb-4 border-b border-zinc-800 dark:border-zinc-200 pb-2 pr-16">
                    <span className="text-xl">✨</span>
                    <h4 className="font-black text-sm sm:text-base font-mono uppercase tracking-widest text-cyan-400 dark:text-cyan-600">
                      {lang === "fr" ? "ECHO AI" : "ECHO AI"} (1/2)
                    </h4>
                  </div>

                  <div className="grid grid-cols-[72px_1fr] sm:grid-cols-[96px_1fr] gap-4 sm:gap-5 mb-5 items-start">
                    <div className="relative w-[72px] h-[72px] sm:w-[96px] sm:h-[96px] shrink-0 bg-zinc-900 dark:bg-zinc-100 rounded-full border border-zinc-800 dark:border-zinc-200 shadow-inner overflow-hidden isolate">
                      <img 
                        src="/Echo.png" 
                        alt="Echo Avatar" 
                        className="block w-full h-full object-cover"
                      />
                    </div>

                    <div className="text-xs sm:text-[13.5px] text-zinc-200 dark:text-zinc-800 leading-relaxed font-semibold space-y-3 whitespace-pre-line min-w-0">
                      {lang === "fr" ? (
                        <>
                          Hey bienvenue ! 👋
                          Je suis Echo, l'IA un peu légèrement déjantée qui se promène partout sur ce site.
                          {"\n"}
                          Les boutons que tu vois en haut influencent ma façon de voir les choses. Certains me rendent plus sérieux, d'autres me poussent à explorer des chemins différents.
                          {"\n"}
                          Si tu ne sélectionnes rien, tu me rencontres dans mon état naturel : Un partenaire curieux et espiègle, convaincu que les idées les plus intéressantes se trouvent rarement là où tout le monde regarde. 😄
                          {"\n"}
                          Et si tu actives le bouton Double Regard, tu peux combiner deux perspectives à la fois. Là, ça devient parfois surprenant. 👀
                          {"\n"}
                          On se recroise sûrement sur les autres pages. J'espère que tu vas avoir du plaisir !
                          {"\n"}
                          Adiooo ! ✨
                        </>
                      ) : (
                        <>
                          Hey, welcome! 👋
                          I am Echo, the slightly crazy AI roaming around this entire site.
                          {"\n"}
                          The buttons you see right above shape how I see things. Some make me more serious, others push me to explore unique paths.
                          {"\n"}
                          If you don't select anything, you meet me in my natural state: a curious companion who loves to talk, reflect, have fun, and jump into unexpected directions! 😄
                          {"\n"}
                          And if you unlock Double Regard, you can merge two perspectives at once. That's where things get truly surprising. 👀
                          {"\n"}
                          See you around on the other pages. Hope you have an awesome time!
                          {"\n"}
                          Adiooo! ✨
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2.5 items-center justify-center border-t border-zinc-800 dark:border-zinc-200 pt-4">
                    <button
                      onClick={() => setTutorialStep(2)}
                      className="w-full text-center px-8 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-extrabold text-xs tracking-widest transition-all shadow-md uppercase"
                    >
                      {lang === "fr" ? "SUIVANT ➔" : "NEXT ➔"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 mt-3 px-2">
  {messages.length === 0 ? (
    <div className="h-full flex flex-col items-center justify-center text-center">
      
      {!tutorialStep && (
        <div className={echoState === "idle" ? "echo-idle" : echoState === "thinking" ? "echo-thinking" : "echo-speaking"}>
          <img
            src="/Echo.png"
            alt="Echo Core"
            className="w-[350px] h-[350px] object-cover rounded-full border border-zinc-200 dark:border-zinc-900 shadow-lg"
          />
          <span className="text-zinc-400 dark:text-zinc-600 text-[10px] block mt-4 tracking-widest uppercase font-mono">
            System Hub Status: {echoState}
          </span>
        </div>
      )}

    </div>
  ) : (
                <div className="max-w-4xl mx-auto py-4 flex flex-col gap-10 min-w-0">
                  {messages.map((msg, index) => {
                    const isEcho = /^Echo\s*:/i.test(msg.raw);
                    const isUser = /^(You|Toi)\s*:/i.test(msg.raw);
                    const isLastEcho = isEcho && index === lastEchoIndex;
                    const cleanText = msg.raw.replace(/^(Echo|You|Toi)\s*:\s*/i, "");

                    const defaultImgText = `${lang === "fr" ? "Analyse cette image" : "Analyze this image"}${selectedImageName ? ` (${selectedImageName})` : ""}.`;
                    const isDefaultImgText = cleanText === "Analyse cette image." || cleanText === "Analyze this image." || cleanText === defaultImgText;

                    if (isEcho) {
                      return (
                        <div key={index} className="flex flex-col gap-4 animate-in fade-in duration-300 min-w-0">
                          <div className="flex items-center gap-4">
                            <img
                              src="/Echo.png"
                              alt="Echo"
                              className={`w-14 h-14 rounded-full object-cover shrink-0 border border-zinc-300 dark:border-zinc-800 shadow-md ${
                                isLastEcho ? echoState === "thinking" ? "echo-thinking" : echoState === "speaking" ? "echo-speaking" : "echo-idle" : "echo-idle"
                              }`}
                            />
                            <div className="flex flex-col">
                              <span className="text-zinc-500 dark:text-zinc-400 text-xs font-mono uppercase tracking-widest font-bold">Echo</span>
                              <span className="text-zinc-400 dark:text-zinc-600 text-[10px] font-mono">Core Frequency</span>
                            </div>
                          </div>
                          <div className="text-zinc-800 dark:text-zinc-200 text-[15px] leading-8 font-normal tracking-wide selection:bg-cyan-500/30 flex flex-col gap-5 pl-2 sm:pl-18 break-words min-w-0">
                            {cleanText.split(/\n\n+/).map((block, i) => (
                              <p key={i} className="whitespace-pre-wrap break-words">{block}</p>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (isUser) {
                      return (
                        <div key={index} className="flex flex-col items-end animate-in fade-in duration-200 min-w-0">
                          {msg.imageB64 && (
                            <img
                              src={msg.imageB64}
                              alt="image envoyée"
                              className="max-w-[180px] max-h-[140px] rounded-xl border border-zinc-300 dark:border-zinc-700 object-cover shadow-md mb-1"
                            />
                          )}

                          {!(msg.imageB64 && isDefaultImgText) && (
                            <div className="max-w-xl text-right">
                              <p className="text-zinc-700 dark:text-zinc-300 text-[14px] leading-7 tracking-wide bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 inline-block text-left whitespace-pre-wrap break-words selection:bg-cyan-500/30">
                                {cleanText}
                              </p>
                            </div>
                          )}

                          {msg.imageB64 && isDefaultImgText && (
                            <span className="text-zinc-500 dark:text-zinc-600 text-[10px] italic mt-0.5">
                              {lang === "fr" ? "Analyse cette image." : "Analyze this image."}
                            </span>
                          )}
                        </div>
                      );
                    }
                    return <div key={index} className="p-2 break-words text-xs italic text-zinc-400">{msg.raw}</div>;
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 mt-4 shrink-0 px-2 min-w-0">
              <div className="max-w-4xl w-full mx-auto flex flex-col gap-2 min-w-0">
                {selectedImage && (
                  <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-xl text-[11px] text-emerald-600 dark:text-emerald-400 max-w-full">
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <img src={selectedImage} alt="preview" className="w-8 h-8 rounded object-cover border border-emerald-500/30 shrink-0" />
                      <span className="truncate font-medium">{selectedImageName || (lang === "fr" ? "Image prête" : "Image ready")}</span>
                    </div>
                    <button onClick={() => { setSelectedImage(null); setSelectedImageName(""); }} className="text-zinc-400 hover:text-red-500 font-bold ml-2 shrink-0">✕</button>
                  </div>
                )}

                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-2xl shadow-inner focus-within:border-cyan-500/40 transition-colors overflow-hidden">
                  <textarea
                    ref={textareaRef}
                    className="w-full bg-transparent text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 text-sm leading-relaxed resize-y min-h-[56px] max-h-[300px] h-28 p-4 focus:outline-none break-words whitespace-pre-wrap"
                    maxLength={getMessageMaxLength(userTier)}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); } }}
                    placeholder={t.chat.placeholder}
                  />

                  <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-zinc-200 dark:border-zinc-900">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelection} className="hidden" />
                      <button
                        type="button"
                        disabled={isImageButtonLocked}
                        onClick={() => imageInputRef.current?.click()}
                        title={isImageButtonLocked ? (lang === "fr" ? "Disponible avec le plan Premium ou supérieur" : "Available on Premium plans and above") : (selectedImageName || (lang === "fr" ? "Importer ou coller (Ctrl+V) une image" : "Import or paste (Ctrl+V) an image"))}
                        className={`h-8 px-3 rounded-lg font-bold text-[11px] flex items-center gap-1.5 border transition-all shrink-0 ${
                          isImageButtonLocked
                            ? "cursor-not-allowed bg-zinc-200 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-500"
                            : selectedImage
                              ? "bg-emerald-600/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                              : "bg-violet-600/10 border-violet-500/30 hover:bg-violet-600/20 text-violet-600 dark:text-violet-400"
                        }`}
                      >
                        <span>{isImageButtonLocked ? "🔒" : selectedImage ? "✓" : "🖼️"}</span>
                        <span className="truncate hidden sm:inline">{selectedImage ? (lang === "fr" ? "Image prête" : "Image Ready") : (lang === "fr" ? "Analyse d'image" : "Image Analysis")}</span>
                      </button>
                      <button
                        onClick={lancerDictation}
                        className={`h-8 px-3 rounded-lg font-bold text-[11px] flex items-center gap-1.5 border transition-all shrink-0 ${
                          isListening ? "bg-red-600 border-red-500 animate-pulse text-white" : "bg-cyan-600/10 border-cyan-500/30 hover:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400"
                        }`}
                      >
                        <span>{isListening ? "🔴" : "🎤"}</span>
                        <span className="hidden sm:inline">{isListening ? "Stop" : (lang === "fr" ? "Parler" : "Speak")}</span>
                      </button>
                    </div>
                    <button onClick={envoyer} className="h-8 px-5 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-bold text-[11px] text-white transition-all shadow-md uppercase tracking-wider shrink-0">
                      {t.chat.send}
                    </button>
                  </div>
                </div>
              </div>
              {!isImageButtonLocked && (
                <p className="max-w-4xl w-full mx-auto text-[10px] text-zinc-400 dark:text-zinc-600 italic">
                  {lang === "fr" ? "💡 Astuce : tu peux coller un screenshot (Ctrl+V) directement dans le champ de texte." : "💡 Tip: you can paste a screenshot (Ctrl+V) directly into the text field."}
                </p>
              )}
            </div>
          </section>

          {/* ── POIGNÉE DE REDIMENSIONNEMENT DROITE (DESKTOP UNIQUEMENT) ── */}
          <div
            onMouseDown={startPanelResize("right")}
            className="hidden lg:flex w-2.5 shrink-0 cursor-col-resize items-center justify-center group"
          >
            <div className="w-1 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 group-hover:bg-cyan-500 transition-colors" />
          </div>

          <aside
            style={isDesktop ? { width: rightPanelWidth, flexBasis: rightPanelWidth } : undefined}
            className="w-full lg:w-64 shrink-0 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50 dark:bg-zinc-950 max-h-[50vh] lg:max-h-none overflow-y-auto lg:overflow-visible">

            {/* ── ⚙️ BARRE PARAMÈTRES, INTÉGRÉE EN HAUT DE LA COLONNE (PLUS DE FLOTTEMENT ABSOLU) ── */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0" onClick={(e) => e.stopPropagation()}>
              <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 dark:text-zinc-500 font-bold">Hub</span>
              <div className="relative">
                <button
                  id="settings-trigger"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className="p-1.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-300 dark:border-zinc-700 font-bold text-zinc-700 dark:text-zinc-300 hover:text-cyan-500 hover:border-cyan-500/50 transition-all shadow-sm flex items-center justify-center text-xs"
                >
                  ⚙️ <span className="ml-1 font-mono text-[10px] bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 px-1 py-0.5 rounded-md uppercase font-bold">{lang}</span>
                </button>

                {isSettingsOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-3 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200 z-50">
                    <div className="px-2 py-1.5 text-[10px] uppercase font-mono tracking-widest text-zinc-400 dark:text-zinc-500 font-bold border-b border-zinc-100 dark:border-zinc-900">
                      {t.settings?.title || "Configuration"}
                    </div>
                    <div className="p-1 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors">
                      <LangDropdown />
                    </div>
                    <button
                      onClick={toggleTheme}
                      className="w-full text-left px-2.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 rounded-xl transition-colors"
                    >
                      {theme === "dark" ? (t.settings?.lightMode || "☀️ Mode Clair") : (t.settings?.darkMode || "🌙 Mode Sombre")}
                    </button>
                    <button
                      onClick={() => { setTutorialStep(1); setIsSettingsOpen(false); }}
                      className="w-full text-left px-2.5 py-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-colors"
                    >
                      {t.settings?.tutorial || "📖 Rejouer le Tutoriel"}
                    </button>
                  </div>
                )}

                {/* ── 📖 POP-OVER ÉTAPE 2 : EXPLICATION DES PARAMÈTRES ── */}
                {tutorialStep === 2 && (
                  <div className="absolute right-0 top-10 w-72 bg-zinc-950 text-white dark:bg-white dark:text-black rounded-2xl p-5 shadow-[0_0_30px_rgba(6,182,212,0.5)] border-2 border-cyan-400 dark:border-cyan-500 animate-in zoom-in-95 duration-300 z-50">
                    <div className="absolute -top-2.5 right-6 w-4 h-4 bg-zinc-950 dark:bg-white rotate-45 border-l-2 border-t-2 border-cyan-400 dark:border-cyan-500" />
                    <button
                      type="button"
                      onClick={() => { setTutorialStep(null); localStorage.setItem("echo-tuto-done-v1", "true"); }}
                      title="Fermer"
                      className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-white/10 dark:bg-black/10 hover:bg-red-600 hover:text-white dark:hover:bg-red-500 text-white dark:text-black text-xs font-bold flex items-center justify-center transition-colors"
                    >
                      ✕
                    </button>
                    <h4 className="font-extrabold text-xs sm:text-sm font-mono uppercase tracking-wider text-cyan-500 dark:text-cyan-600 mb-2 pr-8">
                      🤖 {lang === "fr" ? "PARAMÈTRES GLOBAUX" : "GLOBAL SETTINGS"} (2/2)
                    </h4>
                    <p className="text-xs sm:text-sm text-zinc-200 dark:text-zinc-800 leading-relaxed mb-4 font-semibold">
                      {t.tutorial?.text2 || "Cliquez ici sur l'icône de Paramètres pour ajuster la langue, alterner entre le mode clair et sombre, ou relancer ce guide à tout moment !"}
                    </p>
                    <button
                      onClick={() => { setTutorialStep(null); localStorage.setItem("echo-tuto-done-v1", "true"); }}
                      className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-extrabold text-xs transition-colors shadow-md uppercase tracking-wider"
                    >
                      {t.tutorial?.finish || "C'est parti ! 🚀"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col flex-1 overflow-y-auto lg:overflow-visible min-h-0">
              <div className="flex-1 p-3 border-b sm:border-b-0 sm:border-r lg:border-r-0 lg:border-b border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden min-h-0">
                <h2 className="font-bold text-xs mb-2 shrink-0">📅 {lang === "fr" ? "Événements à venir" : "Upcoming Events"}</h2>
                <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 max-h-36 sm:max-h-none">
                  {upcomingEvents.length === 0 ? (
                    <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs flex items-center gap-2 text-zinc-500">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />{lang === "fr" ? "Aucun événement" : "No upcoming events"}
                    </div>
                  ) : (
                    upcomingEvents.map((ev, i) => (
                      <Link key={ev.id + ev.dateKey} href="/calendar" className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-cyan-500 hover:bg-zinc-200/40 dark:hover:bg-zinc-900/60 transition-all cursor-pointer block text-xs group">
                        <div className="flex items-center gap-2 font-semibold text-cyan-600 dark:text-cyan-400 mb-0.5 group-hover:text-cyan-500">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${EVENT_DOT_COLORS[i % EVENT_DOT_COLORS.length]}`} />
                          {ev.title}
                        </div>
                        <div className="text-zinc-500 dark:text-zinc-400 text-[11px]">{diffDaysLabel(ev.diffDays)} · {ev.dateKey}</div>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div className="flex-1 p-3 flex flex-col overflow-hidden min-h-0">
                <h2 className="font-bold text-xs mb-2 shrink-0">🟨 {lang === "fr" ? "Notes" : "Sticky Notes"}</h2>
                <div className="flex gap-2 mb-2 shrink-0">
                  {(["yellow", "blue", "green", "pink"] as StickyNote["color"][]).map((color) => (
                    <button key={color} onClick={() => setSelectedColor(color)} className={`w-5 h-5 rounded-full border-2 transition-all ${STICKY_STYLES[color].dot} ${selectedColor === color ? "border-black dark:border-white scale-110" : "border-transparent opacity-50"}`} />
                  ))}
                </div>
                <div className="flex gap-2 mb-2 shrink-0">
                  <textarea value={newStickyText} onChange={(e) => setNewStickyText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addSticky(); } }} placeholder={lang === "fr" ? "Note rapide..." : "Quick note..."} rows={2} className={`flex-1 resize-none rounded-lg border p-1.5 text-xs bg-transparent focus:outline-none ${STICKY_STYLES[selectedColor].border} ${STICKY_STYLES[selectedColor].text}`} />
                  <button onClick={addSticky} className="bg-cyan-600 hover:bg-cyan-500 text-white px-2.5 rounded-lg text-xs font-bold">+{` `}{lang === "fr" ? "Ajouter" : "Add"}</button>
                </div>
                <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 max-h-36 sm:max-h-none">
                  {stickies.map((sticky) => {
                    const s = STICKY_STYLES[sticky.color];
                    return (
                      <div key={sticky.id} onDoubleClick={() => { setExpandedSticky(sticky); setEditText(sticky.text); }} className={`relative rounded-lg border p-2 text-xs cursor-pointer group transition-transform hover:scale-102 ${s.bg} ${s.border} ${s.text}`}>
                        <div className="whitespace-pre-wrap line-clamp-3">{sticky.text}</div>
                        <button onClick={(e) => { e.stopPropagation(); deleteSticky(sticky.id); }} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-zinc-500 dark:text-white text-xs">✕</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

        </div>
      </div>

      {expandedSticky && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setExpandedSticky(null)}>
          <div className={`max-w-md w-full rounded-2xl p-6 shadow-2xl border ${STICKY_STYLES[expandedSticky.color].bg} ${STICKY_STYLES[expandedSticky.color].border} ${STICKY_STYLES[expandedSticky.color].text}`} onClick={(e) => e.stopPropagation()}>
            <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={6} className="w-full bg-transparent resize-none focus:outline-none text-sm" autoFocus />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setExpandedSticky(null)} className="px-3 py-1.5 text-xs rounded-lg border border-current opacity-70 hover:opacity-100">{lang === "fr" ? "Annuler" : "Cancel"}</button>
              <button onClick={saveStickyEdit} className="px-3 py-1.5 text-xs rounded-lg bg-cyan-600 text-white font-bold">{lang === "fr" ? "Sauvegarder" : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {showLimitModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShowLimitModal(false)}>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 capitalize">{activeLimitCategory} Limit</h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6">
              {activeLimitCategory === "prompts"
                ? (lang === "fr" ? "Votre quota mensuel de messages est épuisé. Élevez votre sillage vers un forfait supérieur pour continuer l'expérience." : "Your monthly message quota has been reached. Upgrade your tier to unlock unlimited interactions.")
                : (lang === "fr" ? `Limite d'actions automatisées atteinte pour la section [${activeLimitCategory}]. Le message texte d'Echo a été généré, mais les données n'ont pas pu s'enregistrer pour ce cycle.` : `Automated action limit reached for [${activeLimitCategory}]. Echo's text response was generated, but data could not be saved for this cycle.`)
              }
            </p>
            <button onClick={() => setShowLimitModal(false)} className="w-full bg-cyan-600 text-white py-2.5 rounded-xl text-xs font-semibold">OK</button>
          </div>
        </div>
      )}
    </main>
  );
}