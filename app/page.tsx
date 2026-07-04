"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { supabase } from "./lib/supabase";
import { checkQuota, getMessageMaxLength, UserTier } from "../utils/quota";
import TutorialHeaderControls from "./components/TutorialHeaderControls";
import PremiumRequiredModal from "./components/PremiumRequiredModal";
import QuotaPopup from "./components/QuotaPopup";
import { useApp } from "../context/AppContext";

type EchoMessage   = { raw: string; imageB64?: string };
type StickyNote    = { id: string; text: string; color: "yellow"|"blue"|"green"|"pink" };
type CalendarEvent  = { id: string; title: string; start: string; end: string; notes: string };
type CalendarEvents = Record<string, CalendarEvent[]>;
type UpcomingEvent  = CalendarEvent & { dateKey: string; diffDays: number };
type Currency = "CAD" | "USD" | "EUR";

const COUNTRY_OPTIONS: { code: Currency; flag: string; label_fr: string; label_en: string }[] = [
  { code: "CAD", flag: "🇨🇦", label_fr: "Canada",      label_en: "Canada"        },
  { code: "USD", flag: "🇺🇸", label_fr: "États-Unis",  label_en: "United States" },
  { code: "EUR", flag: "🇪🇺", label_fr: "Europe",      label_en: "Europe"        },
];

const detectCurrency = (): Currency => {
  if (typeof window === "undefined") return "CAD";
  const loc = navigator.language?.toLowerCase() || "";
  if (loc.startsWith("fr-fr") || loc.startsWith("de") || loc.startsWith("es") ||
      loc.startsWith("it") || loc.startsWith("nl") || loc.startsWith("pt-pt")) return "EUR";
  if (loc.startsWith("en-us")) return "USD";
  return "CAD";
};

const normalizeTier = (raw: unknown): UserTier => {
  if (typeof raw !== "string") return "connected_free";
  const c = raw.toLowerCase().trim();
  if (c === "free" || c === "connected_free") return "connected_free";
  const valid: UserTier[] = ["connected_free","basic","premium","ultra","founder"];
  return valid.includes(c as UserTier) ? (c as UserTier) : "connected_free";
};

const fetchUserTier = async (uid: string): Promise<UserTier> => {
  const { data, error } = await supabase.from("profiles").select("user_tier").eq("id", uid).single();
  if (!error && data?.user_tier) return normalizeTier(data.user_tier);
  return "connected_free";
};

const STICKY_STYLES = {
  yellow: { bg:"bg-yellow-950/40 dark:bg-yellow-950", border:"border-yellow-600/50", text:"text-yellow-900 dark:text-yellow-200", dot:"bg-yellow-400" },
  blue:   { bg:"bg-blue-950/40 dark:bg-blue-950",     border:"border-blue-500/50",   text:"text-blue-900 dark:text-blue-200",   dot:"bg-blue-400"   },
  green:  { bg:"bg-green-950/40 dark:bg-green-950",   border:"border-green-600/50",  text:"text-green-900 dark:text-green-200", dot:"bg-green-400"  },
  pink:   { bg:"bg-pink-950/40 dark:bg-pink-950",     border:"border-pink-600/50",   text:"text-pink-900 dark:text-pink-200",   dot:"bg-pink-400"   },
};

const EVENT_DOT_COLORS = ["bg-cyan-400","bg-green-400","bg-yellow-400"];

const CONV_SOURCE   = "echo";
const LOCAL_CONV_KEY = "echo-conversation-v2";

export default function Home() {
  const { t, lang, setLang, theme, toggleTheme, triggerToast } = useApp();

  const [message,       setMessage]       = useState("");
  const [messages,      setMessages]      = useState<EchoMessage[]>([]);
  const [isLoaded,      setIsLoaded]      = useState(false);
  const [userId,        setUserId]        = useState<string|null>(null);
  const [activeConvId,  setActiveConvId]  = useState<string|null>(null);
  const [memorySummary, setMemorySummary] = useState("");

  const bottomRef     = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef  = useRef<ReturnType<typeof setTimeout>|null>(null);

  const [isListening,       setIsListening]       = useState(false);
  const [selectedImage,     setSelectedImage]      = useState<string|null>(null);
  const [selectedImageName, setSelectedImageName]  = useState("");
  const [showPremiumModal,  setShowPremiumModal]   = useState(false);
  const [showQuotaPopup,    setShowQuotaPopup]     = useState(false);
  const [quotaPopupLabel,   setQuotaPopupLabel]    = useState("");
  const [showWelcomePopup,  setShowWelcomePopup]   = useState(false);
  const triggerQuotaPopup = (label: string) => { setQuotaPopupLabel(label); setShowQuotaPopup(true); };

  const [chatFontSize, setChatFontSize] = useState(15);
  const increaseFontSize = () => setChatFontSize(s => Math.min(s + 1, 22));
  const decreaseFontSize = () => setChatFontSize(s => Math.max(s - 1, 11));

  const DEFAULT_INPUT_HEIGHT = 112;
  const [inputHeight, setInputHeight] = useState(DEFAULT_INPUT_HEIGHT);
  const shrinkInput = () => {
    const el = textareaRef.current;
    const cur = el ? el.getBoundingClientRect().height : inputHeight;
    const next = Math.max(48, Math.round(cur / 2));
    if (el) el.style.height = `${next}px`;
    setInputHeight(next);
  };
  const resetInput = () => {
    if (textareaRef.current) textareaRef.current.style.height = `${DEFAULT_INPUT_HEIGHT}px`;
    setInputHeight(DEFAULT_INPUT_HEIGHT);
  };

  const [leftPanelWidth,  setLeftPanelWidth]  = useState(220);
  const [rightPanelWidth, setRightPanelWidth] = useState(272);
  const [isDesktop, setIsDesktop] = useState(false);
  const resizingSideRef = useRef<"left"|"right"|null>(null);

  useEffect(() => {
    const sl = parseInt(localStorage.getItem("echo-home-left-width")  || "", 10);
    const sr = parseInt(localStorage.getItem("echo-home-panel-width") || "", 10);
    if (Number.isFinite(sl)) setLeftPanelWidth(Math.min(340, Math.max(180, sl)));
    if (Number.isFinite(sr)) setRightPanelWidth(Math.min(440, Math.max(220, sr)));
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const startPanelResize = (side: "left"|"right") => (e: React.MouseEvent) => {
    e.preventDefault();
    resizingSideRef.current = side;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const s = resizingSideRef.current;
      if (!s) return;
      if (s === "left") setLeftPanelWidth(Math.min(340, Math.max(180, e.clientX)));
      else setRightPanelWidth(Math.min(440, Math.max(220, window.innerWidth - e.clientX)));
    };
    const onUp = () => {
      if (!resizingSideRef.current) return;
      resizingSideRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  useEffect(() => { localStorage.setItem("echo-home-left-width",  String(leftPanelWidth));  }, [leftPanelWidth]);
  useEffect(() => { localStorage.setItem("echo-home-panel-width", String(rightPanelWidth)); }, [rightPanelWidth]);

  const [stickies,       setStickies]       = useState<StickyNote[]>([]);
  const [newStickyText,  setNewStickyText]  = useState("");
  const [selectedColor,  setSelectedColor]  = useState<StickyNote["color"]>("yellow");
  const [expandedSticky, setExpandedSticky] = useState<StickyNote|null>(null);
  const [editText,       setEditText]       = useState("");

  const [calendarEvents,         setCalendarEvents]         = useState<CalendarEvents>({});
  const [userTier,               setUserTier]               = useState<UserTier>("connected_free");
  const [echoState,              setEchoState]              = useState("idle");
  const [isSettingsOpen,         setIsSettingsOpen]         = useState(false);
  const [tutorialStep,           setTutorialStep]           = useState<number|null>(null);
  const [selectedButtons,        setSelectedButtons]        = useState<string[]>([]);
  const [isDoubleRegardUnlocked, setIsDoubleRegardUnlocked] = useState(false);
  const [showEasterModal,        setShowEasterModal]        = useState(false);
  const [isLoadingTreasure,      setIsLoadingTreasure]      = useState(false);

  // ── Menu Hub ──────────────────────────────────────────────────────────────
  const [hubMenuOpen, setHubMenuOpen] = useState(false);
  const hubMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (hubMenuRef.current && !hubMenuRef.current.contains(e.target as Node))
        setHubMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Pays / Devise — partagé via localStorage ──────────────────────────────
  const [currency, setCurrencyState] = useState<Currency>("CAD");

  useEffect(() => {
    const saved = localStorage.getItem("echo-currency") as Currency | null;
    setCurrencyState(saved || detectCurrency());
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem("echo-currency", c);
    window.dispatchEvent(new StorageEvent("storage", { key: "echo-currency", newValue: c }));
  };

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "echo-currency" && e.newValue) setCurrencyState(e.newValue as Currency);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const currentCountry = COUNTRY_OPTIONS.find(c => c.code === currency) || COUNTRY_OPTIONS[0];

  // ── Warmup ling ───────────────────────────────────────────────────────────
  const [warmupIntent, setWarmupIntent] = useState<string|null>(null);
  const warmupDebounceRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  const triggerLingWarmup = useCallback((text: string) => {
    if (warmupDebounceRef.current) clearTimeout(warmupDebounceRef.current);
    if (text.length < 3) { setWarmupIntent(null); return; }
    warmupDebounceRef.current = setTimeout(async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_URL}/horizon-warmup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partial: text }),
        });
        const data = await res.json();
        if (data.intent?.response) {
          try { setWarmupIntent(JSON.parse(data.intent.response)?.intent || null); } catch {}
        }
      } catch {}
    }, 400);
  }, []);

  useEffect(() => () => { if (warmupDebounceRef.current) clearTimeout(warmupDebounceRef.current); }, []);

  const localButtonsLabels: Record<"fr"|"en", Record<string,string>> = {
    fr: { clarity:"1🧠 Clarté", humain:"2👤 Humain", critical:"3⚔️ Regard critique", expert:"4🎓 Expert", precision:"5🎯 Précision", philosophy:"6🏛️ Philosophie", strategy:"7♟️ Stratégie", decompose:"8🧩 Décomposer", refine:"9❓ Affiner", double:"10⚡ Double Regard" },
    en: { clarity:"1🧠 Clarity", humain:"2👤 Human", critical:"3⚔️ Critical View", expert:"4🎓 Expert", precision:"5🎯 Precision", philosophy:"6🏛️ Philosophy", strategy:"7♟️ Strategy", decompose:"8🧩 Decompose", refine:"9❓ Refine", double:"10⚡ Double Regard" },
  };

  const handleButtonClick = (id: string) => {
    if (!selectedButtons.includes(id) && id !== "double") {
      const status = checkQuota("buttons", userTier, false, userId);
      if (!status.allowed) { triggerQuotaPopup(lang === "fr" ? "Invites comportementales" : "Behavioral prompts"); return; }
    }
    if (id === "double") { if (selectedButtons.length === 1) setIsDoubleRegardUnlocked(true); return; }
    if (selectedButtons.includes(id)) {
      const next = selectedButtons.filter(b => b !== id);
      setSelectedButtons(next);
      if (next.length < 2) setIsDoubleRegardUnlocked(false);
    } else {
      if (selectedButtons.length === 0) {
        checkQuota("buttons", userTier, true, userId);
        setSelectedButtons([id]);
        setIsDoubleRegardUnlocked(false);
      } else if (selectedButtons.length === 1 && isDoubleRegardUnlocked) {
        setSelectedButtons(p => [...p, id]);
      }
    }
  };

  const serializeMsgs   = (msgs: EchoMessage[]) => msgs.map(m => m.raw);
  const deserializeMsgs = (raws: string[]): EchoMessage[] => raws.map(r => ({ raw: r }));
  const lastEchoIndex   = messages.findLastIndex(m => /^Echo\s*:/i.test(m.raw));

  const saveToSupabase = async (uid: string, convId: string|null, raws: string[]): Promise<string|null> => {
    let finalSummary  = memorySummary;
    let finalMessages = raws;
    if (raws.length > 10) {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_URL}/memory-summary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ summary: memorySummary, messages: raws.slice(0, 500), userTier }),
        });
        const data = await res.json();
        finalSummary  = data.summary || memorySummary;
        finalMessages = raws.slice(-100);
        setMemorySummary(finalSummary);
      } catch (e) { console.error("[MEMORY Home]", e); }
    }
    const payload = {
      messages: finalMessages, summary: finalSummary,
      summary_updated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    if (convId) {
      await supabase.from("echo_conversations").update(payload).eq("id", convId).eq("user_id", uid);
      return convId;
    } else {
      const { data, error } = await supabase.from("echo_conversations")
        .insert({ user_id: uid, source: CONV_SOURCE, ...payload }).select("id").single();
      if (error) { console.error("[Home] insert conv:", error.message); return null; }
      return data?.id ?? null;
    }
  };

  const pushEchoEventToGoogle = async (uid: string, dateKey: string, title: string, startTime: string, endTime: string, notes: string): Promise<string|null> => {
    let token = localStorage.getItem(`echo-google-token-${uid}`);
    if (!token) {
      try {
        const { data: row } = await supabase.from("user_tokens").select("google_access_token").eq("id", uid).maybeSingle();
        token = row?.google_access_token || null;
      } catch { token = null; }
    }
    if (!token) return null;
    try {
      const hasTime  = !!(startTime || endTime);
      const startObj = hasTime ? { dateTime: new Date(`${dateKey}T${startTime || "00:00"}:00`).toISOString() } : { date: dateKey };
      const endObj   = hasTime ? { dateTime: new Date(`${dateKey}T${endTime   || "23:59"}:00`).toISOString() } : { date: dateKey };
      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ summary: title, description: notes, start: startObj, end: endObj }),
      });
      if (!res.ok) return null;
      const d = await res.json();
      return d.id ?? null;
    } catch { return null; }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      try {
        if (uid) {
          const { data: convRows } = await supabase.from("echo_conversations")
            .select("id, messages, summary").eq("user_id", uid).eq("source", CONV_SOURCE)
            .order("updated_at", { ascending: false }).limit(1);
          if (convRows?.length) {
            setActiveConvId(convRows[0].id);
            setMessages(deserializeMsgs(convRows[0].messages || []));
            setMemorySummary(convRows[0].summary || "");
          }
          const { data: stickyRows } = await supabase.from("echo_stickies").select("*").eq("user_id", uid).order("created_at", { ascending: true });
          if (stickyRows?.length) setStickies(stickyRows.map(r => ({ id: r.id, text: r.text, color: r.color as StickyNote["color"] })));
          const { data: calRows } = await supabase.from("echo_calendar").select("*").eq("user_id", uid);
          if (calRows?.length) {
            const rebuilt: CalendarEvents = {};
            calRows.forEach(r => {
              const key = r.start_date;
              if (!rebuilt[key]) rebuilt[key] = [];
              rebuilt[key].push({ id: r.id, title: r.title, start: r.start_time||"", end: r.end_time||"", notes: r.notes||"" });
            });
            setCalendarEvents(rebuilt);
          }
          setUserTier(await fetchUserTier(uid));
        } else {
          // Chat croisé navigateur — charge seulement si chat n'a pas de conv propre
          const chatConvos = localStorage.getItem("echo-chat-local-convos");
          const hasChatConvos = chatConvos && JSON.parse(chatConvos).some((c: any) => c.messages?.length > 0);
          if (!hasChatConvos) {
            const saved = localStorage.getItem(LOCAL_CONV_KEY);
            if (saved) setMessages(deserializeMsgs(JSON.parse(saved)));
          }
        }
        if (!localStorage.getItem("echo-welcome-seen")) setShowWelcomePopup(true);
      } catch(e) { console.error("Bootstrap error", e); }
      setIsLoaded(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        setUserId(null); setCalendarEvents({}); setStickies([]);
        setMessages([]); setUserTier("connected_free"); setActiveConvId(null); setMemorySummary(""); return;
      }
      if (session?.user) {
        const uid = session.user.id;
        setUserId(uid);
        const { data: convRows } = await supabase.from("echo_conversations").select("id, messages, summary")
          .eq("user_id", uid).eq("source", CONV_SOURCE).order("updated_at", { ascending: false }).limit(1);
        if (convRows?.length) {
          setActiveConvId(convRows[0].id);
          setMessages(deserializeMsgs(convRows[0].messages || []));
          setMemorySummary(convRows[0].summary || "");
        }
        setUserTier(await fetchUserTier(uid));
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const raws = serializeMsgs(messages);
    if (userId) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const newId = await saveToSupabase(userId, activeConvId, raws);
        if (newId && !activeConvId) setActiveConvId(newId);
      }, 1500);
    } else {
      localStorage.setItem(LOCAL_CONV_KEY, JSON.stringify(raws));
    }
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [messages, isLoaded]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const upcomingEvents: UpcomingEvent[] = (() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const results: UpcomingEvent[] = [];
    for (const [dateKey, evts] of Object.entries(calendarEvents)) {
      const d = new Date(dateKey + "T00:00:00");
      const diffDays = Math.floor((d.getTime() - today.getTime()) / 86400000);
      if (diffDays >= 0 && diffDays <= 30) evts.forEach(ev => results.push({ ...ev, dateKey, diffDays }));
    }
    return results.sort((a,b) => a.diffDays - b.diffDays).slice(0,6);
  })();

  const compressImage = (base64: string): Promise<string> =>
    new Promise(resolve => {
      const img = document.createElement("img");
      img.onload = () => {
        const MAX = 1200; let w = img.width, h = img.height;
        if (w > MAX || h > MAX) { if (w > h) { h = Math.round(h*MAX/w); w = MAX; } else { w = Math.round(w*MAX/h); h = MAX; } }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = base64;
    });

  const envoyer = async () => {
    if (!message.trim() && !selectedImage) return;
    const userMessage  = message.trim();
    const currentImage = selectedImage;
    const currentName  = selectedImageName;
    const userRaw = userMessage
      ? `You: ${userMessage}`
      : `You: ${lang === "fr" ? "Analyse cette image" : "Analyze this image"}${currentName ? ` (${currentName})` : ""}.`;
    const userEntry: EchoMessage = { raw: userRaw, imageB64: currentImage ?? undefined };
    const baseMessages = [...messages, userEntry];
    setEchoState("thinking");
    setMessages([...baseMessages, { raw: "Echo: ..." }]);
    setMessage(""); setSelectedImage(null); setSelectedImageName("");
    setWarmupIntent(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/home`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage || `${lang === "fr" ? "Analyse cette image" : "Analyze this image"}${currentName ? ` (${currentName})` : ""}.`,
          image: currentImage ?? null,
          history: serializeMsgs(baseMessages),
          userTier, calendarEvents, selectedButtons, summary: memorySummary,
        }),
      });
      const data = await response.json();
      setEchoState("speaking");

      let isActionBlocked = false;
      if (data.action) {
        const { type } = data.action;
        const qCat: "vitality_actions"|"calendar" =
          (type === "ADD_BUDGET_EXPENSE" || type === "ADD_CALORIE_LOG" || type === "SET_CALORIE_GOAL" || type === "UPDATE_CALORIE_GOAL")
            ? "vitality_actions" : "calendar";
        const status = checkQuota(qCat, userTier, true, userId);
        if (!status.allowed) {
          const label = status.error === "anon_blocked" || status.error === "anon_limit"
            ? status.error
            : qCat === "calendar" ? (lang === "fr" ? "Calendrier" : "Calendar") : (lang === "fr" ? "Vitalité" : "Vitality");
          triggerQuotaPopup(label);
          isActionBlocked = true;
        }
      }

      const echoText     = data.response || "";
      const actionNotice = isActionBlocked ? `\n\n[🔒 ${lang === "fr" ? "Action bloquée — quota atteint" : "Action blocked — quota reached"}]` : "";
      setMessages([...baseMessages, { raw: `Echo: ${echoText}${actionNotice}` }]);

      if (data.action && !isActionBlocked) {
        const { type, payload } = data.action;

        if (type === "ADD_BUDGET_EXPENSE") {
          const { title, amount, spent, date, paymentDate, paidAt } = payload;
          if (userId) await supabase.from("echo_expenses").insert({
            user_id: userId, title: title || "Achat",
            amount: parseFloat(amount ?? spent) || 0,
            date: paymentDate || paidAt || date || new Date().toLocaleDateString("fr-CA"),
          });
        }

        if (type === "ADD_CALORIE_LOG") {
          const { foodName, food_name, meal, title, calories } = payload;
          if (userId) await supabase.from("echo_calories").insert({
            user_id: userId, food_name: foodName || food_name || meal || title || "Aliment",
            calories: parseInt(calories) || 0, date: new Date().toLocaleDateString("fr-CA"),
          });
        }

        if (type === "SET_CALORIE_GOAL" || type === "UPDATE_CALORIE_GOAL") {
          const { goal, calorieGoal, calories } = payload;
          const nextGoal = parseInt(goal ?? calorieGoal ?? calories);
          if (Number.isFinite(nextGoal) && nextGoal > 0)
            localStorage.setItem("echo-calorie-goal", nextGoal.toString());
        }

        if (type === "ADD_CALENDAR_EVENT") {
          const { title, start, end, notes } = payload;
          let dateKey = "", startTime = "", endTime = "";
          if (start) {
            if (start.includes("T")) { dateKey = start.split("T")[0]; startTime = start.split("T")[1]?.slice(0, 5) || ""; }
            else { dateKey = start; }
          }
          if (!dateKey) dateKey = new Date().toLocaleDateString("fr-CA");
          if (end?.includes("T")) endTime = end.split("T")[1]?.slice(0, 5) || "";
          const finalTitle = title || "Rendez-vous sans titre";
          const finalNotes = notes || "";
          if (dateKey && userId) {
            try {
              const googleEventId = await pushEchoEventToGoogle(userId, dateKey, finalTitle, startTime, endTime, finalNotes);
              const insertPayload: any = { user_id: userId, title: finalTitle, start_date: dateKey, end_date: dateKey, notes: finalNotes, is_from_echo: true };
              if (startTime) insertPayload.start_time = startTime;
              if (endTime)   insertPayload.end_time   = endTime;
              if (googleEventId) insertPayload.google_event_id = googleEventId;
              const { data: insertedList, error } = await supabase.from("echo_calendar").insert(insertPayload).select();
              const finalId = (!error && insertedList?.length) ? insertedList[0].id : `temp-${Date.now()}`;
              setCalendarEvents(prev => {
                const currentList = prev[dateKey] || [];
                if (currentList.some(ev => ev.title === finalTitle && ev.notes === finalNotes)) return prev;
                return { ...prev, [dateKey]: [...currentList, { id: finalId, title: finalTitle, start: startTime, end: endTime, notes: finalNotes }] };
              });
              if (googleEventId) triggerToast("info", lang === "fr" ? "Rendez-vous ajouté dans Google Calendar ✓" : "Event added to Google Calendar ✓");
            } catch (err) { console.error("[Home] Crash insertion calendrier:", err); }
          }
        }
      }
    } catch {
      setMessages([...baseMessages, { raw: "Echo: Impossible de joindre le serveur." }]);
    } finally {
      setTimeout(() => setEchoState("idle"), 10000);
    }
  };

  const addSticky = async () => {
    if (!newStickyText.trim()) return;
    if (!userId) { setStickies(prev => [...prev, { id: `local-${Date.now()}`, text: newStickyText.trim(), color: selectedColor }]); setNewStickyText(""); return; }
    const { data: inserted, error } = await supabase.from("echo_stickies").insert({ user_id: userId, text: newStickyText.trim(), color: selectedColor }).select().single();
    if (error) { console.error("[Home] echo_stickies insert:", error.message); return; }
    setStickies(prev => [...prev, { id: inserted.id, text: inserted.text, color: inserted.color }]);
    setNewStickyText("");
  };

  const deleteSticky = async (id: string) => {
    if (userId && !id.startsWith("local-")) await supabase.from("echo_stickies").delete().eq("id", id).eq("user_id", userId);
    setStickies(prev => prev.filter(s => s.id !== id));
  };

  const saveStickyEdit = async () => {
    if (!expandedSticky) return;
    if (userId && !expandedSticky.id.startsWith("local-"))
      await supabase.from("echo_stickies").update({ text: editText }).eq("id", expandedSticky.id).eq("user_id", userId);
    setStickies(prev => prev.map(s => s.id === expandedSticky.id ? { ...s, text: editText } : s));
    setExpandedSticky(null);
  };

  const isImageButtonLocked = userTier === "connected_free" || userTier === "basic";

  const lancerDictation = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition is not supported."); return; }
    const recognition = new SR();
    recognition.lang     = lang === "fr" ? "fr-FR" : "en-US";
    recognition.onstart  = () => setIsListening(true);
    recognition.onend    = () => setIsListening(false);
    recognition.onresult = (e: any) => setMessage(p => p + (p?" ":"") + e.results[0][0].transcript);
    recognition.start();
  };

  const handleEasterEggClick = () => setShowEasterModal(true);

  const handleEasterCheckout = async () => {
    setShowEasterModal(false);
    if (!userId) { localStorage.setItem("echo-treasure-redirect", "1"); window.location.href = "/account"; return; }
    try {
      setIsLoadingTreasure(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "treasure", userId, userEmail: session?.user?.email, currency }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch { localStorage.setItem("echo-treasure-redirect", "1"); window.location.href = "/account"; }
    finally { setIsLoadingTreasure(false); }
  };

  const handleImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert(lang==="fr"?"Choisis un fichier image.":"Please choose an image file."); return; }
    if (file.size > 5*1024*1024) { alert(lang==="fr"?"L'image doit faire moins de 5 Mo.":"The image must be smaller than 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = async () => { const c = await compressImage(reader.result as string); setSelectedImage(c); setSelectedImageName(file.name); };
    reader.readAsDataURL(file);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (isImageButtonLocked) return;
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile(); if (!file) continue;
        event.preventDefault();
        if (file.size > 5*1024*1024) { alert(lang==="fr"?"L'image doit faire moins de 5 Mo.":"The image must be smaller than 5 MB."); return; }
        const reader = new FileReader();
        reader.onload = async () => { const c = await compressImage(reader.result as string); setSelectedImage(c); setSelectedImageName(`screenshot-${Date.now()}.png`); };
        reader.readAsDataURL(file);
        return;
      }
    }
  };

  const diffDaysLabel = (d: number) => {
    if (d === 0) return lang==="fr"?"Aujourd'hui":"Today";
    if (d === 1) return lang==="fr"?"Demain":"Tomorrow";
    return lang==="fr"?`Dans ${d} jours`:`In ${d} days`;
  };

  useEffect(() => {
    const handleOutsideClick = () => setIsSettingsOpen(false);
    if (isSettingsOpen) window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [isSettingsOpen]);

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <main className="h-screen bg-white dark:bg-black text-black dark:text-white flex overflow-hidden relative font-sans transition-colors duration-200 selection:bg-cyan-500/30">
<meta name="p:domain_verify" content="b8c6e3722e58cd63a982307875f72ea7"/>
      {showQuotaPopup && <QuotaPopup label={quotaPopupLabel} lang={lang} onClose={() => setShowQuotaPopup(false)} />}

      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* SIDEBAR */}
        <aside
          style={isDesktop ? { width: leftPanelWidth, flexBasis: leftPanelWidth } : undefined}
          className="w-55 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-8 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between">
          <div className="space-y-20">
            <h2 className="font-bold text-lg">
              <Link href="/" className="text-cyan-600 dark:text-cyan-400 font-bold">{t.sidebar.home}</Link>
            </h2>
            <div className="space-y-20 text-zinc-800 dark:text-zinc-100 font-medium">
              <Link href="/chat"       className="block hover:text-cyan-500">{t.sidebar.chat}</Link>
              <Link href="/books"      className="block hover:text-cyan-500">{t.sidebar.books}</Link>
              <Link href="/calendar"   className="block hover:text-cyan-500">📅 {lang==="fr"?"Calendrier":"Calendar"}</Link>
              <Link href="/vitality"   className="block hover:text-cyan-500">📈 {lang==="fr"?"Vitalité":"Vitality"}</Link>
              <Link href="/services"   className="block hover:text-cyan-500">💎 {lang==="fr"?"Services":"Services"}</Link>
              <Link href="/account"    className="block hover:text-cyan-500">👤 {lang==="fr"?"Compte":"Account"}</Link>
              <Link href="/horizonweb" className="block hover:text-cyan-500">📡 HorizonWeb</Link>
              <hr className="border-zinc-200 dark:border-zinc-800 my-4" />
              <Link href="/history"    className="block hover:text-amber-500">⭐ {lang==="fr"?"Historique":"History"}</Link>
            </div>
          </div>
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
            Status : <span className="text-cyan-500 dark:text-cyan-400 uppercase font-bold block">{userTier === "connected_free" ? (lang === "fr" ? "Accès libre" : "FreeConnect") : userTier}</span>
          </div>
        </aside>

        <div onMouseDown={startPanelResize("left")} className="hidden lg:flex w-2.5 shrink-0 cursor-col-resize items-center justify-center group">
          <div className="w-1 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 group-hover:bg-cyan-500 transition-colors" />
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

          {/* MAIN DASHBOARD */}
          <section className="flex-1 flex flex-col p-4 min-w-0 overflow-hidden relative">

            {/* ECHO SEUL — centre de l'écosystème */}
            <div className="flex flex-col items-center justify-center py-4 shrink-0">
              <div className={`relative shrink-0 flex flex-col items-center ${echoState==="idle"?"echo-idle":echoState==="thinking"?"echo-thinking":"echo-speaking"}`}>
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full" style={{background:"conic-gradient(from 0deg, transparent 50%, rgba(6,182,212,0.3) 80%, #06b6d4 100%)", animation:"spinDash 4s linear infinite"}}/>
                  <div className="absolute inset-1.5 rounded-full bg-black/80"/>
                  <img src="/echo1.png" alt="Echo" className="relative z-10 w-20 h-20 object-cover rounded-full border border-cyan-500/30 shadow-lg"/>
                  <button type="button" onClick={handleEasterEggClick} className="absolute inset-0 z-20 rounded-full opacity-0 cursor-default" />
                </div>
                <span className="text-zinc-600 text-[8px] mt-1 tracking-widest uppercase font-mono">{echoState}</span>
              </div>
            </div>
            <style>{`@keyframes spinDash { 100% { transform: rotate(360deg); } }`}</style>

            {/* GRILLE D'OUTILS */}
            <div className="flex-1 overflow-y-auto min-h-0 pb-6">
              <div className="max-w-2xl mx-auto space-y-6 px-2">

                {/* Compagnons d'analyse */}
                <div>
                  <div className="text-[9px] font-mono font-black tracking-[4px] uppercase mb-3 text-center" style={{color:"rgba(0,200,255,0.5)"}}>
                    {lang==="fr" ? "🧠 Compagnons d'analyse" : "🧠 Analysis Companions"}
                  </div>
                  <div className="flex gap-2 justify-center flex-wrap">
                      <a href="/vitality"
                        className="group relative w-24 h-24 flex flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all duration-300 overflow-hidden select-none no-underline"
                        style={{background:`linear-gradient(135deg,rgba(234,179,8,0.12) 0%,rgba(234,179,8,0.05) 100%)`,borderColor:`rgba(234,179,8,0.35)`,boxShadow:`0 0 20px rgba(234,179,8,0.1),inset 0 1px 0 rgba(234,179,8,0.2)`}}
                        onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 30px rgba(234,179,8,0.35)`;el.style.transform="translateY(-2px)";}}
                        onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 20px rgba(234,179,8,0.1),inset 0 1px 0 rgba(234,179,8,0.2)`;el.style.transform="translateY(0)";}}>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{background:`linear-gradient(135deg,rgba(234,179,8,0.2) 0%,rgba(234,179,8,0.08) 100%)`}}/>
                        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l" style={{borderColor:`rgba(234,179,8,0.6)`}}/>
                        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r" style={{borderColor:`rgba(234,179,8,0.6)`}}/>
                        <span className="relative z-10 text-3xl">💰</span>
                        <span className="relative z-10 text-[8px] font-mono font-black tracking-widest uppercase text-yellow-400">BUDGET</span>
                      </a>
                      <a href="/vitality"
                        className="group relative w-24 h-24 flex flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all duration-300 overflow-hidden select-none no-underline"
                        style={{background:`linear-gradient(135deg,rgba(34,197,94,0.12) 0%,rgba(34,197,94,0.05) 100%)`,borderColor:`rgba(34,197,94,0.35)`,boxShadow:`0 0 20px rgba(34,197,94,0.1),inset 0 1px 0 rgba(34,197,94,0.2)`}}
                        onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 30px rgba(34,197,94,0.35)`;el.style.transform="translateY(-2px)";}}
                        onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 20px rgba(34,197,94,0.1),inset 0 1px 0 rgba(34,197,94,0.2)`;el.style.transform="translateY(0)";}}>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{background:`linear-gradient(135deg,rgba(34,197,94,0.2) 0%,rgba(34,197,94,0.08) 100%)`}}/>
                        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l" style={{borderColor:`rgba(34,197,94,0.6)`}}/>
                        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r" style={{borderColor:`rgba(34,197,94,0.6)`}}/>
                        <span className="relative z-10 text-3xl">🔥</span>
                        <span className="relative z-10 text-[8px] font-mono font-black tracking-widest uppercase text-green-400">CALORIES</span>
                      </a>
                      <a href="/books"
                        className="group relative w-24 h-24 flex flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all duration-300 overflow-hidden select-none no-underline"
                        style={{background:`linear-gradient(135deg,rgba(139,92,246,0.12) 0%,rgba(139,92,246,0.05) 100%)`,borderColor:`rgba(139,92,246,0.35)`,boxShadow:`0 0 20px rgba(139,92,246,0.1),inset 0 1px 0 rgba(139,92,246,0.2)`}}
                        onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 30px rgba(139,92,246,0.35)`;el.style.transform="translateY(-2px)";}}
                        onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 20px rgba(139,92,246,0.1),inset 0 1px 0 rgba(139,92,246,0.2)`;el.style.transform="translateY(0)";}}>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{background:`linear-gradient(135deg,rgba(139,92,246,0.2) 0%,rgba(139,92,246,0.08) 100%)`}}/>
                        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l" style={{borderColor:`rgba(139,92,246,0.6)`}}/>
                        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r" style={{borderColor:`rgba(139,92,246,0.6)`}}/>
                        <span className="relative z-10 text-3xl">📚</span>
                        <span className="relative z-10 text-[8px] font-mono font-black tracking-widest uppercase text-violet-400">{lang==="fr"?"LIVRES":"BOOKS"}</span>
                      </a>
                      <a href="/calendar"
                        className="group relative w-24 h-24 flex flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all duration-300 overflow-hidden select-none no-underline"
                        style={{background:`linear-gradient(135deg,rgba(59,130,246,0.12) 0%,rgba(59,130,246,0.05) 100%)`,borderColor:`rgba(59,130,246,0.35)`,boxShadow:`0 0 20px rgba(59,130,246,0.1),inset 0 1px 0 rgba(59,130,246,0.2)`}}
                        onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 30px rgba(59,130,246,0.35)`;el.style.transform="translateY(-2px)";}}
                        onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 20px rgba(59,130,246,0.1),inset 0 1px 0 rgba(59,130,246,0.2)`;el.style.transform="translateY(0)";}}>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{background:`linear-gradient(135deg,rgba(59,130,246,0.2) 0%,rgba(59,130,246,0.08) 100%)`}}/>
                        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l" style={{borderColor:`rgba(59,130,246,0.6)`}}/>
                        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r" style={{borderColor:`rgba(59,130,246,0.6)`}}/>
                        <span className="relative z-10 text-3xl">📅</span>
                        <span className="relative z-10 text-[8px] font-mono font-black tracking-widest uppercase text-blue-400">{lang==="fr"?"CALENDRIER":"CALENDAR"}</span>
                      </a>
                      <a href="/chat"
                        className="group relative w-24 h-24 flex flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all duration-300 overflow-hidden select-none no-underline"
                        style={{background:`linear-gradient(135deg,rgba(6,182,212,0.12) 0%,rgba(6,182,212,0.05) 100%)`,borderColor:`rgba(6,182,212,0.35)`,boxShadow:`0 0 20px rgba(6,182,212,0.1),inset 0 1px 0 rgba(6,182,212,0.2)`}}
                        onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 30px rgba(6,182,212,0.35)`;el.style.transform="translateY(-2px)";}}
                        onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 20px rgba(6,182,212,0.1),inset 0 1px 0 rgba(6,182,212,0.2)`;el.style.transform="translateY(0)";}}>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{background:`linear-gradient(135deg,rgba(6,182,212,0.2) 0%,rgba(6,182,212,0.08) 100%)`}}/>
                        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l" style={{borderColor:`rgba(6,182,212,0.6)`}}/>
                        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r" style={{borderColor:`rgba(6,182,212,0.6)`}}/>
                        <span className="relative z-10 text-3xl">💬</span>
                        <span className="relative z-10 text-[8px] font-mono font-black tracking-widest uppercase text-cyan-400">CHAT</span>
                      </a>
                  </div>
                </div>

                {/* Espaces métier */}
                <div>
                  <div className="text-[9px] font-mono font-black tracking-[4px] uppercase mb-3 text-center" style={{color:"rgba(201,168,76,0.5)"}}>
                    {lang==="fr" ? "🏗 Espaces métier" : "🏗 Business Spaces"}
                  </div>
                  <div className="flex gap-2 justify-center flex-wrap">
                      <a href="/fastbilling"
                        className="group relative w-24 h-24 flex flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all duration-300 overflow-hidden select-none no-underline"
                        style={{background:`linear-gradient(135deg,rgba(234,179,8,0.12) 0%,rgba(234,179,8,0.05) 100%)`,borderColor:`rgba(234,179,8,0.35)`,boxShadow:`0 0 20px rgba(234,179,8,0.1),inset 0 1px 0 rgba(234,179,8,0.2)`}}
                        onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 30px rgba(234,179,8,0.35)`;el.style.transform="translateY(-2px)";}}
                        onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 20px rgba(234,179,8,0.1),inset 0 1px 0 rgba(234,179,8,0.2)`;el.style.transform="translateY(0)";}}>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{background:`linear-gradient(135deg,rgba(234,179,8,0.2) 0%,rgba(234,179,8,0.08) 100%)`}}/>
                        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l" style={{borderColor:`rgba(234,179,8,0.6)`}}/>
                        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r" style={{borderColor:`rgba(234,179,8,0.6)`}}/>
                        <span className="relative z-10 text-3xl">🧾</span>
                        <span className="relative z-10 text-[8px] font-mono font-black tracking-widest uppercase text-yellow-400">FASTBILLING</span>
                      </a>
                      <a href="/1/hall"
                        className="group relative w-24 h-24 flex flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all duration-300 overflow-hidden select-none no-underline"
                        style={{background:`linear-gradient(135deg,rgba(0,200,255,0.12) 0%,rgba(0,200,255,0.05) 100%)`,borderColor:`rgba(0,200,255,0.35)`,boxShadow:`0 0 20px rgba(0,200,255,0.1),inset 0 1px 0 rgba(0,200,255,0.2)`}}
                        onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 30px rgba(0,200,255,0.35)`;el.style.transform="translateY(-2px)";}}
                        onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 20px rgba(0,200,255,0.1),inset 0 1px 0 rgba(0,200,255,0.2)`;el.style.transform="translateY(0)";}}>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{background:`linear-gradient(135deg,rgba(0,200,255,0.2) 0%,rgba(0,200,255,0.08) 100%)`}}/>
                        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l" style={{borderColor:`rgba(0,200,255,0.6)`}}/>
                        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r" style={{borderColor:`rgba(0,200,255,0.6)`}}/>
                        <span className="relative z-10 text-3xl">🏛</span>
                        <span className="relative z-10 text-[8px] font-mono font-black tracking-widest uppercase text-cyan-400">{lang==="fr"?"AFFINITÉ":"AFFINITY"}</span>
                      </a>
                      <a href="/2/talk"
                        className="group relative w-24 h-24 flex flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all duration-300 overflow-hidden select-none no-underline"
                        style={{background:`linear-gradient(135deg,rgba(139,92,246,0.12) 0%,rgba(139,92,246,0.05) 100%)`,borderColor:`rgba(139,92,246,0.35)`,boxShadow:`0 0 20px rgba(139,92,246,0.1),inset 0 1px 0 rgba(139,92,246,0.2)`}}
                        onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 30px rgba(139,92,246,0.35)`;el.style.transform="translateY(-2px)";}}
                        onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 20px rgba(139,92,246,0.1),inset 0 1px 0 rgba(139,92,246,0.2)`;el.style.transform="translateY(0)";}}>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{background:`linear-gradient(135deg,rgba(139,92,246,0.2) 0%,rgba(139,92,246,0.08) 100%)`}}/>
                        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l" style={{borderColor:`rgba(139,92,246,0.6)`}}/>
                        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r" style={{borderColor:`rgba(139,92,246,0.6)`}}/>
                        <span className="relative z-10 text-3xl">💬</span>
                        <span className="relative z-10 text-[8px] font-mono font-black tracking-widest uppercase text-violet-400">TALK</span>
                      </a>
                  </div>
                </div>

                {/* Mon espace */}
                <div>
                  <div className="text-[9px] font-mono font-black tracking-[4px] uppercase mb-3 text-center" style={{color:"rgba(52,211,153,0.5)"}}>
                    {lang==="fr" ? "🔐 Mon espace" : "🔐 My Space"}
                  </div>
                  <div className="flex gap-2 justify-center flex-wrap">
                      <a href="/1/fiche"
                        className="group relative w-24 h-24 flex flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all duration-300 overflow-hidden select-none no-underline"
                        style={{background:`linear-gradient(135deg,rgba(52,211,153,0.12) 0%,rgba(52,211,153,0.05) 100%)`,borderColor:`rgba(52,211,153,0.35)`,boxShadow:`0 0 20px rgba(52,211,153,0.1),inset 0 1px 0 rgba(52,211,153,0.2)`}}
                        onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 30px rgba(52,211,153,0.35)`;el.style.transform="translateY(-2px)";}}
                        onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 20px rgba(52,211,153,0.1),inset 0 1px 0 rgba(52,211,153,0.2)`;el.style.transform="translateY(0)";}}>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{background:`linear-gradient(135deg,rgba(52,211,153,0.2) 0%,rgba(52,211,153,0.08) 100%)`}}/>
                        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l" style={{borderColor:`rgba(52,211,153,0.6)`}}/>
                        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r" style={{borderColor:`rgba(52,211,153,0.6)`}}/>
                        <span className="relative z-10 text-3xl">👤</span>
                        <span className="relative z-10 text-[8px] font-mono font-black tracking-widest uppercase text-emerald-400">{lang==="fr"?"FICHE":"PROFILE"}</span>
                      </a>
                      <a href="/1/form"
                        className="group relative w-24 h-24 flex flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all duration-300 overflow-hidden select-none no-underline"
                        style={{background:`linear-gradient(135deg,rgba(52,211,153,0.12) 0%,rgba(52,211,153,0.05) 100%)`,borderColor:`rgba(52,211,153,0.35)`,boxShadow:`0 0 20px rgba(52,211,153,0.1),inset 0 1px 0 rgba(52,211,153,0.2)`}}
                        onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 30px rgba(52,211,153,0.35)`;el.style.transform="translateY(-2px)";}}
                        onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 20px rgba(52,211,153,0.1),inset 0 1px 0 rgba(52,211,153,0.2)`;el.style.transform="translateY(0)";}}>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{background:`linear-gradient(135deg,rgba(52,211,153,0.2) 0%,rgba(52,211,153,0.08) 100%)`}}/>
                        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l" style={{borderColor:`rgba(52,211,153,0.6)`}}/>
                        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r" style={{borderColor:`rgba(52,211,153,0.6)`}}/>
                        <span className="relative z-10 text-3xl">📝</span>
                        <span className="relative z-10 text-[8px] font-mono font-black tracking-widest uppercase text-emerald-400">{lang==="fr"?"FORMULAIRE":"FORM"}</span>
                      </a>
                      <a href="/1/desktop"
                        className="group relative w-24 h-24 flex flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all duration-300 overflow-hidden select-none no-underline"
                        style={{background:`linear-gradient(135deg,rgba(52,211,153,0.12) 0%,rgba(52,211,153,0.05) 100%)`,borderColor:`rgba(52,211,153,0.35)`,boxShadow:`0 0 20px rgba(52,211,153,0.1),inset 0 1px 0 rgba(52,211,153,0.2)`}}
                        onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 30px rgba(52,211,153,0.35)`;el.style.transform="translateY(-2px)";}}
                        onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 20px rgba(52,211,153,0.1),inset 0 1px 0 rgba(52,211,153,0.2)`;el.style.transform="translateY(0)";}}>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{background:`linear-gradient(135deg,rgba(52,211,153,0.2) 0%,rgba(52,211,153,0.08) 100%)`}}/>
                        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l" style={{borderColor:`rgba(52,211,153,0.6)`}}/>
                        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r" style={{borderColor:`rgba(52,211,153,0.6)`}}/>
                        <span className="relative z-10 text-3xl">🗄</span>
                        <span className="relative z-10 text-[8px] font-mono font-black tracking-widest uppercase text-emerald-400">BUREAU</span>
                      </a>
                  </div>
                </div>

                {/* Recherche augmentée */}
                <div>
                  <div className="text-[9px] font-mono font-black tracking-[4px] uppercase mb-3 text-center" style={{color:"rgba(167,139,250,0.5)"}}>
                    {lang==="fr" ? "🔎 Recherche augmentée" : "🔎 Augmented Research"}
                  </div>
                  <div className="flex gap-2 justify-center flex-wrap">
                      <a href="/avis"
                        className="group relative w-24 h-24 flex flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all duration-300 overflow-hidden select-none no-underline"
                        style={{background:`linear-gradient(135deg,rgba(167,139,250,0.12) 0%,rgba(167,139,250,0.05) 100%)`,borderColor:`rgba(167,139,250,0.35)`,boxShadow:`0 0 20px rgba(167,139,250,0.1),inset 0 1px 0 rgba(167,139,250,0.2)`}}
                        onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 30px rgba(167,139,250,0.35)`;el.style.transform="translateY(-2px)";}}
                        onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 20px rgba(167,139,250,0.1),inset 0 1px 0 rgba(167,139,250,0.2)`;el.style.transform="translateY(0)";}}>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{background:`linear-gradient(135deg,rgba(167,139,250,0.2) 0%,rgba(167,139,250,0.08) 100%)`}}/>
                        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l" style={{borderColor:`rgba(167,139,250,0.6)`}}/>
                        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r" style={{borderColor:`rgba(167,139,250,0.6)`}}/>
                        <span className="relative z-10 text-3xl">🧠</span>
                        <span className="relative z-10 text-[8px] font-mono font-black tracking-widest uppercase text-violet-400">AVIS</span>
                      </a>
                      <a href="/horizonweb"
                        className="group relative w-24 h-24 flex flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all duration-300 overflow-hidden select-none no-underline"
                        style={{background:`linear-gradient(135deg,rgba(6,182,212,0.12) 0%,rgba(6,182,212,0.05) 100%)`,borderColor:`rgba(6,182,212,0.35)`,boxShadow:`0 0 20px rgba(6,182,212,0.1),inset 0 1px 0 rgba(6,182,212,0.2)`}}
                        onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 30px rgba(6,182,212,0.35)`;el.style.transform="translateY(-2px)";}}
                        onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=`0 0 20px rgba(6,182,212,0.1),inset 0 1px 0 rgba(6,182,212,0.2)`;el.style.transform="translateY(0)";}}>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{background:`linear-gradient(135deg,rgba(6,182,212,0.2) 0%,rgba(6,182,212,0.08) 100%)`}}/>
                        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l" style={{borderColor:`rgba(6,182,212,0.6)`}}/>
                        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r" style={{borderColor:`rgba(6,182,212,0.6)`}}/>
                        <span className="relative z-10 text-3xl">🌐</span>
                        <span className="relative z-10 text-[8px] font-mono font-black tracking-widest uppercase text-cyan-400">HORIZON</span>
                      </a>
                  </div>
                </div>

              </div>
            </div>
          </section>

          <div onMouseDown={startPanelResize("right")} className="hidden lg:flex w-2.5 shrink-0 cursor-col-resize items-center justify-center group">
            <div className="w-1 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 group-hover:bg-cyan-500 transition-colors" />
          </div>

          {/* HUB */}
          <aside
            style={isDesktop ? { width: rightPanelWidth, flexBasis: rightPanelWidth } : undefined}
            className="w-full lg:w-64 shrink-0 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 p-3 flex flex-col bg-zinc-50 dark:bg-zinc-950 max-h-[50vh] lg:max-h-none overflow-y-auto lg:overflow-visible">

            {/* ── HUB HEADER — menu déroulant unifié ── */}
            <div className="flex items-center px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0" onClick={e => e.stopPropagation()}>
              <div ref={hubMenuRef} className="relative w-full">

                {/* Bouton déclencheur */}
                <button
                  type="button"
                  onClick={() => setHubMenuOpen(v => !v)}
                  className="flex items-center gap-1.5 text-[10px] uppercase font-mono tracking-widest text-zinc-400 dark:text-zinc-500 font-bold hover:text-cyan-500 transition-colors w-full"
                >
                  <span>{currentCountry.flag}</span>
                  <span className="truncate">{lang === "fr" ? currentCountry.label_fr : currentCountry.label_en}</span>
                  <span className="text-zinc-600 ml-auto">·</span>
                  <span>{lang === "fr" ? "FR" : "EN"}</span>
                  <span>{theme === "dark" ? "🌙" : "☀️"}</span>
                  <svg className={`w-2 h-2 transition-transform ${hubMenuOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25 12 15.75 4.5 8.25"/>
                  </svg>
                </button>

                {/* Dropdown */}
                {hubMenuOpen && (
                  <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-[200] animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden">

                    {/* LANGUE */}
                    <div className="px-3 pt-3 pb-1">
                      <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-600 font-bold mb-1.5">
                        {lang === "fr" ? "Langue" : "Language"}
                      </p>
                      <div className="flex gap-1.5">
                        {(["fr","en"] as const).map(l => (
                          <button key={l} type="button" onClick={() => setLang(l)}
                            className={`flex-1 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-colors ${lang === l ? "bg-cyan-500/10 text-cyan-500 border border-cyan-500/30" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent"}`}>
                            {l === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mx-3 my-2 h-px bg-zinc-100 dark:bg-zinc-800"/>

                    {/* PAYS */}
                    <div className="px-3 pb-1">
                      <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-600 font-bold mb-1.5">
                        {lang === "fr" ? "Pays" : "Country"}
                      </p>
                      <div className="flex flex-col gap-1">
                        {COUNTRY_OPTIONS.map(opt => (
                          <button key={opt.code} type="button" onClick={() => setCurrency(opt.code)}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-semibold transition-colors text-left ${currency === opt.code ? "bg-cyan-500/10 text-cyan-500 border border-cyan-500/30" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent"}`}>
                            <span>{opt.flag}</span>
                            <span>{lang === "fr" ? opt.label_fr : opt.label_en}</span>
                            {currency === opt.code && <span className="ml-auto text-cyan-500 text-[10px]">✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mx-3 my-2 h-px bg-zinc-100 dark:bg-zinc-800"/>

                    {/* APPARENCE */}
                    <div className="px-3 pb-3">
                      <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-600 font-bold mb-1.5">
                        {lang === "fr" ? "Apparence" : "Appearance"}
                      </p>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => { if (theme !== "light") toggleTheme(); }}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-colors flex items-center justify-center gap-1 ${theme === "light" ? "bg-amber-500/10 text-amber-500 border border-amber-500/30" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent"}`}>
                          ☀️ {lang === "fr" ? "Clair" : "Light"}
                        </button>
                        <button type="button" onClick={() => { if (theme !== "dark") toggleTheme(); }}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-colors flex items-center justify-center gap-1 ${theme === "dark" ? "bg-blue-500/10 text-blue-400 border border-blue-500/30" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent"}`}>
                          🌙 {lang === "fr" ? "Sombre" : "Dark"}
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>
            {/* ── FIN HUB HEADER ── */}

            {tutorialStep === 2 && (
              <div className="absolute right-4 top-16 w-72 bg-zinc-950 text-white dark:bg-white dark:text-black rounded-2xl p-5 shadow-[0_0_30px_rgba(6,182,212,0.5)] border-2 border-cyan-400 dark:border-cyan-500 animate-in zoom-in-95 duration-300 z-50">
                <button type="button" onClick={() => { setTutorialStep(null); localStorage.setItem("echo-tuto-done-v1","true"); }}
                  className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-white/10 dark:bg-black/10 hover:bg-red-600 hover:text-white text-white dark:text-black text-xs font-bold flex items-center justify-center transition-colors">✕</button>
                <h4 className="font-extrabold text-xs sm:text-sm font-mono uppercase tracking-wider text-cyan-500 dark:text-cyan-600 mb-2 pr-8">
                  🤖 {lang==="fr"?"PARAMÈTRES GLOBAUX":"GLOBAL SETTINGS"} (2/2)
                </h4>
                <p className="text-xs sm:text-sm text-zinc-200 dark:text-zinc-800 leading-relaxed mb-4 font-semibold">{t.tutorial?.text2}</p>
                <button onClick={() => { setTutorialStep(null); localStorage.setItem("echo-tuto-done-v1","true"); }}
                  className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs transition-colors shadow-md uppercase tracking-wider">
                  {t.tutorial?.finish}
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row lg:flex-col flex-1 overflow-y-auto lg:overflow-visible min-h-0">

              {/* UPCOMING EVENTS */}
              <div className="flex-1 p-3 border-b sm:border-b-0 sm:border-r lg:border-r-0 lg:border-b border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden min-h-0">
                <h2 className="font-bold text-xs mb-2 shrink-0">📅 {lang==="fr"?"Événements à venir":"Upcoming Events"}</h2>
                <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 max-h-36 sm:max-h-none">
                  {upcomingEvents.length === 0 ? (
                    <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs flex items-center gap-2 text-zinc-500">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />{lang==="fr"?"Aucun événement":"No upcoming events"}
                    </div>
                  ) : (
                    upcomingEvents.map((ev,i) => (
                      <Link key={ev.id+ev.dateKey} href="/calendar" className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-cyan-500 transition-all cursor-pointer block text-xs group">
                        <div className="flex items-center gap-2 font-semibold text-cyan-600 dark:text-cyan-400 mb-0.5 group-hover:text-cyan-500">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${EVENT_DOT_COLORS[i%EVENT_DOT_COLORS.length]}`} />{ev.title}
                        </div>
                        <div className="text-zinc-500 dark:text-zinc-400 text-[11px]">{diffDaysLabel(ev.diffDays)} · {ev.dateKey}</div>
                        {ev.start && <div className="text-zinc-400 text-[10px] mt-0.5">🕐 {ev.start}{ev.end ? ` → ${ev.end}` : ""}</div>}
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {/* STICKIES */}
              <div className="flex-1 p-3 flex flex-col overflow-hidden min-h-0">
                <h2 className="font-bold text-xs mb-2 shrink-0">🟨 {lang==="fr"?"Notes":"Sticky Notes"}</h2>
                <div className="flex gap-2 mb-2 shrink-0">
                  {(["yellow","blue","green","pink"] as StickyNote["color"][]).map(color => (
                    <button key={color} onClick={() => setSelectedColor(color)}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${STICKY_STYLES[color].dot} ${selectedColor===color?"border-black dark:border-white scale-110":"border-transparent opacity-50"}`} />
                  ))}
                </div>
                <div className="flex gap-2 mb-2 shrink-0">
                  <textarea value={newStickyText} onChange={e => setNewStickyText(e.target.value)}
                    onKeyDown={e => { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); addSticky(); } }}
                    placeholder={lang==="fr"?"Note rapide...":"Quick note..."} rows={2}
                    className={`flex-1 resize-none rounded-lg border p-1.5 text-xs bg-transparent focus:outline-none ${STICKY_STYLES[selectedColor].border} ${STICKY_STYLES[selectedColor].text}`} />
                  <button onClick={addSticky} className="bg-cyan-600 hover:bg-cyan-500 text-white px-2.5 rounded-lg text-xs font-bold">+ {lang==="fr"?"Ajouter":"Add"}</button>
                </div>
                <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 max-h-36 sm:max-h-none">
                  {stickies.map(sticky => {
                    const s = STICKY_STYLES[sticky.color];
                    return (
                      <div key={sticky.id} onDoubleClick={() => { setExpandedSticky(sticky); setEditText(sticky.text); }}
                        className={`relative rounded-lg border p-2 text-xs cursor-pointer group transition-transform hover:scale-102 ${s.bg} ${s.border} ${s.text}`}>
                        <div className="whitespace-pre-wrap line-clamp-3">{sticky.text}</div>
                        <button onClick={e => { e.stopPropagation(); deleteSticky(sticky.id); }} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-zinc-500 dark:text-white text-xs">✕</button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </aside>

        </div>
      </div>

      {/* EXPANDED STICKY */}
      {expandedSticky && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setExpandedSticky(null)}>
          <div className={`max-w-md w-full rounded-2xl p-6 shadow-2xl border ${STICKY_STYLES[expandedSticky.color].bg} ${STICKY_STYLES[expandedSticky.color].border} ${STICKY_STYLES[expandedSticky.color].text}`} onClick={e => e.stopPropagation()}>
            <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={6} className="w-full bg-transparent resize-none focus:outline-none text-sm" autoFocus />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setExpandedSticky(null)} className="px-3 py-1.5 text-xs rounded-lg border border-current opacity-70 hover:opacity-100">{lang==="fr"?"Annuler":"Cancel"}</button>
              <button onClick={saveStickyEdit} className="px-3 py-1.5 text-xs rounded-lg bg-cyan-600 text-white font-bold">{lang==="fr"?"Sauvegarder":"Save"}</button>
            </div>
          </div>
        </div>
      )}

      {/* EASTER EGG MODAL */}
      {showEasterModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100000] p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-[0_0_50px_rgba(245,158,11,0.3)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setShowEasterModal(false)} className="absolute top-4 right-5 text-zinc-500 hover:text-white font-mono text-lg transition-colors">✕</button>
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-2xl animate-bounce mt-4">👑</div>
            <div className="text-center space-y-2 mt-3">
              <h3 className="text-sm font-black text-amber-400 tracking-wider font-mono uppercase">
                {lang === "fr" ? "🎉✨ ACCÈS PORTAIL SECRET ✨🎉" : "🎉✨ SECRET PORTAL ACCESSED ✨🎉"}
              </h3>
              <h4 className="text-white font-bold text-base font-mono uppercase tracking-wide">
                {lang === "fr" ? "🏆 FÉLICITATIONS !" : "🏆 CONGRATULATIONS!"}
              </h4>
              <p className="text-zinc-300 font-medium text-xs sm:text-sm bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 inline-block leading-relaxed">
                {lang === "fr"
                  ? "« Le plan Ultra à 40 % de rabais, passe de 19,99 $ à 11,99 $ »"
                  : "The Ultra plan with 40% off, goes from $19.99 to $11.99"}
              </p>
            </div>
            <div className="mt-5 space-y-2.5 text-left text-xs sm:text-sm text-zinc-300 font-sans border-t border-b border-zinc-900 py-4 max-w-xs mx-auto">
              <p className="text-amber-400 font-bold font-mono tracking-wide mb-1 text-center sm:text-left">
                {lang === "fr" ? "✨ Ultra débloque :" : "✨ Ultra unlocks:"}
              </p>
              <div className="space-y-1 text-zinc-200 font-medium">
                <p>• {lang === "fr" ? "1 200 messages IA par cycle 💎" : "1,200 AI messages per cycle 💎"}</p>
                <p>• {lang === "fr" ? "300 Actions HorizonWeb 💎" : "300 HorizonWeb Actions 💎"}</p>
                <p>• {lang === "fr" ? "240 prompts comportementales 💎" : "240 behavioral prompts 💎"}</p>
                <p>• {lang === "fr" ? "120 actions Calendrier 💎" : "120 Calendar actions 💎"}</p>
                <p>• {lang === "fr" ? "300 actions Budget & Nutrition 💎" : "300 Budget & Nutrition actions 💎"}</p>
                <p>• {lang === "fr" ? "Support prioritaire 💎" : "Priority support 💎"}</p>
                <p>• {lang === "fr" ? "Analyse d'image 💎" : "Image analysis 💎"}</p>
                <p>• {lang === "fr" ? "Historique et chat illimité 💎" : "Unlimited history and chat 💎"}</p>
                <p>• {lang === "fr" ? "1 mois du 3ième meilleur plan 💎" : "1 month of the 3rd best plan 💎"}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <button type="button" disabled={isLoadingTreasure} onClick={handleEasterCheckout}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 font-mono text-xs font-bold rounded-xl text-white uppercase tracking-widest transition-all shadow-md text-center">
                {isLoadingTreasure
                  ? (lang === "fr" ? "CONNEXION..." : "CONNECTING...")
                  : userId
                    ? (lang === "fr" ? "Réclamer le trésor (11.99$) ➔" : "Claim the treasure ($11.99) ➔")
                    : (lang === "fr" ? "Se connecter pour en profiter ➔" : "Log in to claim ➔")}
              </button>
              <button type="button" onClick={() => setShowEasterModal(false)} className="w-full py-1.5 text-zinc-600 font-mono text-[11px] hover:text-zinc-400 transition-colors">
                {lang === "fr" ? "Plus tard" : "Later"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PremiumRequiredModal open={showPremiumModal} onClose={() => setShowPremiumModal(false)} />

      {showWelcomePopup && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center pb-12 sm:items-center sm:pb-0">
          <div className="absolute inset-0 pointer-events-auto" style={{background:"transparent"}} />
          <div className="relative pointer-events-auto bg-zinc-950/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.25)] p-7 w-full max-w-md mx-4 flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
              <h3 className="font-black text-base font-mono uppercase tracking-widest text-cyan-400">{lang === "fr" ? "BIENVENUE" : "WELCOME"}</h3>
              <button type="button" onClick={() => { setShowWelcomePopup(false); localStorage.setItem("echo-welcome-seen","true"); }}
                className="text-zinc-500 hover:text-white font-bold text-sm p-1 transition-colors">✕</button>
            </div>
            <div className="flex gap-4 items-start">
              <div className="shrink-0 bg-zinc-900 p-1.5 rounded-full border border-zinc-800">
                <img src="/echo1.png" alt="Echo" className="w-14 h-14 rounded-full object-cover"/>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed flex-1 whitespace-pre-line">
                {lang === "fr"
                  ? <>Hey bienvenue ! 👋 Je suis Echo. Je traîne un peu partout sur ce site. Les boutons là-haut influencent ma façon de voir les choses. Si tu ne sélectionnes rien, tu me rencontres dans mon état naturel : curieux, espiègle et légèrement chaotique. 😄 Et si tu actives le Double Regard, tu combines deux perspectives. 👀 Ça devient souvent intéressant. 💀 Adiooo ! ✨</>
                  : <>Hey welcome! 👋 I'm Echo. I hang around all over this site. The buttons up there influence how I see things. If you select nothing, you meet me in my natural state: curious, mischievous and slightly chaotic. 😄 And if you activate Double Vision, you combine two perspectives. 👀 Things often get interesting. 💀 Adiooo ! ✨</>}
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <Link href="/account" onClick={() => localStorage.setItem("echo-welcome-seen","true")}
                className="w-full text-center block py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-sm tracking-widest transition-all shadow-md uppercase">
                {lang === "fr" ? "SE CONNECTER" : "SIGN IN"}
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}