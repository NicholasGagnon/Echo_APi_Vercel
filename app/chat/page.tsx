"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { checkQuota, getMessageMaxLength, UserTier } from "../../utils/quota";
import LangDropdown from "../components/LangDropdown";
import TutorialHeaderControls from "../components/TutorialHeaderControls";
import { useApp } from "../../context/AppContext";

type ChatMessage = { raw: string; imageB64?: string };
type Conversation = { id: string; title: string; messages: string[]; updatedAt: number };

const normalizeTier = (raw: string | null): UserTier => {
  if (!raw) return "connected_free";
  const c = raw.toLowerCase().trim();
  if (c === "free" || c === "connected_free") return "connected_free";
  if (["basic","premium","ultra","founder"].includes(c)) return c as UserTier;
  return "connected_free";
};

const deriveTitle = (raws: string[], lang: string): string => {
  const first = raws.find(r => /^(You|Toi)\s*:/i.test(r));
  if (first) {
    const clean = first.replace(/^(You|Toi)\s*:\s*/i, "").trim();
    if (clean) return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean;
  }
  return lang === "fr" ? "Nouvelle conversation" : "New conversation";
};

const isDefaultTitle = (title: string) =>
  title === "Nouvelle conversation" || title === "New conversation";

// ── LOCAL STORAGE HELPERS ─────────────────────────────────────────────────
const LOCAL_CONVOS_KEY = "echo-chat-local-convos";

const saveLocalConvos = (convos: Conversation[]) => {
  try {
    const localOnly = convos.filter(c => c.id.startsWith("local-") || c.id === "new");
    localStorage.setItem(LOCAL_CONVOS_KEY, JSON.stringify(localOnly));
  } catch (e) { console.error("localStorage save:", e); }
};

const loadLocalConvos = (): Conversation[] => {
  try {
    const raw = localStorage.getItem(LOCAL_CONVOS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Conversation[];
  } catch { return []; }
};

export default function ChatPage() {
  const { t, lang, theme, toggleTheme } = useApp();

  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [input,     setInput]     = useState("");
  const [isLoaded,   setIsLoaded]   = useState(false);
  const [userId,     setUserId]    = useState<string | null>(null);
  const bottomRef     = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [conversations,        setConversations]        = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isConvoPanelOpen,     setIsConvoPanelOpen]     = useState(true);
  const [convoPanelWidth,      setConvoPanelWidth]      = useState(240);
  const convoPanelRef    = useRef<HTMLDivElement>(null);
  const convoResizingRef = useRef(false);

  const [userTier,   setUserTier]   = useState<UserTier>("connected_free");
  const [isListening, setIsListening] = useState(false);
  const [selectedImage,     setSelectedImage]     = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState("");
  const [echoState, setEchoState] = useState("idle");
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [activeLimitCategory, setActiveLimitCategory] = useState<"vitality_actions"|"calendar"|"surprise">("vitality_actions");
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // ── DELETE CONFIRM MODAL ──────────────────────────────────────────────────
  const [deleteConfirmId,    setDeleteConfirmId]    = useState<string | null>(null);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<React.MouseEvent | null>(null);

  // ── RENAME STATE ──────────────────────────────────────────────────────────
  const [renamingId,    setRenamingId]    = useState<string | null>(null);
  const [renameValue,   setRenameValue]   = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // ── INPUT HEIGHT ──────────────────────────────────────────────────────────
  const DEFAULT_INPUT_HEIGHT = 80; // 1 - déjà bas par défaut pour un look plus propre
  const [inputHeight, setInputHeight] = useState(DEFAULT_INPUT_HEIGHT);

  const shrinkInput = () => {
    const el = textareaRef.current;
    const current = el ? el.getBoundingClientRect().height : inputHeight;
    const next = Math.max(48, Math.round(current / 2));
    if (el) el.style.height = `${next}px`;
    setInputHeight(next);
  };
  const resetInput = () => {
    if (textareaRef.current) textareaRef.current.style.height = `${DEFAULT_INPUT_HEIGHT}px`;
    setInputHeight(DEFAULT_INPUT_HEIGHT);
  };

  const [selectedButtons,        setSelectedButtons]        = useState<string[]>([]);
  const [isDoubleRegardUnlocked, setIsDoubleRegardUnlocked] = useState(false);
  const [isSurpriseActive,       setIsSurpriseActive]       = useState(false);
  const [isPressingSurprise,     setIsPressingSurprise]     = useState(false);

  const buttonsLabels: Record<string, { fr: string; en: string }> = {
    clarity:    { fr:"1🧠 Clarté",         en:"1🧠 Clarity"      },
    humain:     { fr:"2👤 Humain",          en:"2👤 Human"        },
    critical:   { fr:"3⚔️ Regard Critique", en:"3⚔️ Critical View"},
    expert:     { fr:"4🎓 Expert",          en:"4🎓 Expert"       },
    precision:  { fr:"5🎯 Précision",       en:"5🎯 Precision"    },
    philosophy: { fr:"6🏛️ Philosophie",    en:"6🏛️ Philosophy"  },
    strategy:   { fr:"7♟️ Stratégie",      en:"7♟️ Strategy"     },
    decompose:  { fr:"8🧩 Décomposer",     en:"8🧩 Decompose"    },
    refine:     { fr:"9❓ Affiner",         en:"9❓ Refine"        },
    double:     { fr:"10⚡ Double Regard",  en:"10⚡ Dual Vision" },
  };
  const buttonsOrder = ["clarity","humain","critical","expert","precision","philosophy","strategy","decompose","refine","double"];

  const handleButtonClick = (id: string) => {
    if (isSurpriseActive) return;
    if (id === "double") { if (selectedButtons.length === 1) setIsDoubleRegardUnlocked(true); return; }
    if (selectedButtons.includes(id)) {
      const next = selectedButtons.filter(b => b !== id);
      setSelectedButtons(next);
      if (next.length < 2) setIsDoubleRegardUnlocked(false);
    } else {
      if (selectedButtons.length === 0) { setSelectedButtons([id]); setIsDoubleRegardUnlocked(false); }
      else if (selectedButtons.length === 1 && isDoubleRegardUnlocked) setSelectedButtons(p => [...p, id]);
    }
  };

  const handleSurpriseToggle = () => {
    if (userTier === "connected_free" || userTier === "basic") {
      setActiveLimitCategory("surprise"); setShowLimitModal(true); return;
    }
    if (isSurpriseActive) { setIsSurpriseActive(false); setSelectedButtons([]); }
    else { setIsSurpriseActive(true); setSelectedButtons(["surprise"]); setIsDoubleRegardUnlocked(false); }
  };

  const serializeMsgs   = (msgs: ChatMessage[]) => msgs.map(m => m.raw);
  const deserializeMsgs = (raws: string[]): ChatMessage[] => raws.map(r => ({ raw: r }));
  const lastEchoIndex   = messages.findLastIndex(m => /^Echo\s*:/i.test(m.raw));

  // ── SUPABASE ──────────────────────────────────────────────────────────────
  const loadConversationsFromDB = async (uid: string) => {
    const { data, error } = await supabase
      .from("echo_conversations").select("id, messages, updated_at")
      .eq("user_id", uid).eq("source", "chat")
      .order("updated_at", { ascending: false });
    if (error) { console.error("[Chat] load:", error.message); return []; }
    return (data || []).map(row => ({
      id: row.id, title: deriveTitle(row.messages || [], lang),
      messages: row.messages || [], updatedAt: new Date(row.updated_at).getTime(),
    })) as Conversation[];
  };

  const saveConversationToDB = async (uid: string, convId: string | null, raws: string[]) => {
    if (!convId || convId === "new") return null;
    if (convId.startsWith("local-")) return convId;
    
    const { error } = await supabase.from("echo_conversations")
      .update({ messages: raws, updated_at: new Date().toISOString() })
      .eq("id", convId).eq("user_id", uid);
    if (error) console.error("[Chat] update:", error.message);
    return convId;
  };

  // ── BOOTSTRAP ─────────────────────────────────────────────────────────────
  const initForUser = async (uid: string | null) => {
    if (!uid) {
      // FIX 1 : charger les convos locales depuis localStorage pour les visiteurs
      const localConvos = loadLocalConvos();
      if (localConvos.length > 0) {
        setConversations(localConvos);
        setActiveConversationId(localConvos[0].id);
        setMessages(deserializeMsgs(localConvos[0].messages));
      } else {
        const empty: Conversation = { id: "new", title: lang === "fr" ? "Nouvelle conversation" : "New conversation", messages: [], updatedAt: Date.now() };
        setConversations([empty]); setActiveConversationId("new"); setMessages([]);
      }
      return;
    }
    const list = await loadConversationsFromDB(uid);
    let finalList: Conversation[];
    if (list.length === 0) {
      finalList = [{ id: "new", title: lang === "fr" ? "Nouvelle conversation" : "New conversation", messages: [], updatedAt: Date.now() }];
    } else { finalList = list; }
    setConversations(finalList);
    setActiveConversationId(finalList[0].id);
    setMessages(deserializeMsgs(finalList[0].messages));
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      try {
        await initForUser(uid);
        if (uid) {
          const { data: profile } = await supabase.from("profiles").select("user_tier").eq("id", uid).single();
          if (profile?.user_tier) setUserTier(normalizeTier(profile.user_tier));
        }
        if (!localStorage.getItem("echo-tuto-chat-done-v1")) setTutorialStep(1);
      } catch(e) { console.error("Bootstrap:", e); }
      setIsLoaded(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        setUserId(null); await initForUser(null); setUserTier("connected_free"); return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const uid = session.user.id; setUserId(uid); await initForUser(uid);
        const { data: profile } = await supabase.from("profiles").select("user_tier").eq("id", uid).single();
        if (profile?.user_tier) setUserTier(normalizeTier(profile.user_tier));
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // FIX 1 : sync conversations locales dans localStorage à chaque changement
  useEffect(() => {
    if (!isLoaded || userId) return; // seulement pour les visiteurs non connectés
    saveLocalConvos(conversations);
  }, [conversations, isLoaded, userId]);

  useEffect(() => {
    if (!isLoaded || !userId || !activeConversationId || activeConversationId === "new" || activeConversationId.startsWith("local-")) return;
    const raws = serializeMsgs(messages);
    setConversations(prev => prev.map(c =>
      c.id === activeConversationId
        ? { ...c, messages: raws, updatedAt: Date.now(), title: raws.length > 0 && isDefaultTitle(c.title) ? deriveTitle(raws, lang) : c.title }
        : c
    ));
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(async () => {
      await saveConversationToDB(userId, activeConversationId, raws);
    }, 1500);
    return () => { if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current); };
  }, [messages, isLoaded]);

  // FIX 1 : sync convos locales quand les messages changent et qu'on est en mode visiteur
  useEffect(() => {
    if (!isLoaded || userId || !activeConversationId || activeConversationId === "new") return;
    const raws = serializeMsgs(messages);
    setConversations(prev => prev.map(c =>
      c.id === activeConversationId
        ? { ...c, messages: raws, updatedAt: Date.now(), title: raws.length > 0 && isDefaultTitle(c.title) ? deriveTitle(raws, lang) : c.title }
        : c
    ));
  }, [messages, isLoaded, userId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── PANEL RESIZE ──────────────────────────────────────────────────────────
  useEffect(() => {
    const savedOpen  = localStorage.getItem("echo-chat-convo-open");
    const savedWidth = parseInt(localStorage.getItem("echo-chat-convo-width") || "", 10);
    if (savedOpen !== null) setIsConvoPanelOpen(savedOpen === "true");
    if (Number.isFinite(savedWidth)) setConvoPanelWidth(Math.min(360, Math.max(200, savedWidth)));
  }, []);
  useEffect(() => { localStorage.setItem("echo-chat-convo-open",  String(isConvoPanelOpen)); }, [isConvoPanelOpen]);
  useEffect(() => { localStorage.setItem("echo-chat-convo-width", String(convoPanelWidth));  }, [convoPanelWidth]);

  const startConvoResize = (e: React.MouseEvent) => {
    e.preventDefault(); convoResizingRef.current = true;
    document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
  };
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!convoResizingRef.current || !convoPanelRef.current) return;
      const rect = convoPanelRef.current.getBoundingClientRect();
      setConvoPanelWidth(Math.min(360, Math.max(200, e.clientX - rect.left)));
    };
    const onUp = () => {
      if (!convoResizingRef.current) return;
      convoResizingRef.current = false; document.body.style.cursor = ""; document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // ── SETTINGS DROPDOWN ─────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => { if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setIsSettingsOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── CONVERSATIONS ─────────────────────────────────────────────────────────
  const startNewConversation = () => {
    if (activeConversationId === "new") {
      setInput(""); setSelectedImage(null); setSelectedImageName(""); return;
    }
    const emptyDraft = conversations.find(c => c.id === "new" || c.messages.length === 0);
    if (emptyDraft) {
      setActiveConversationId(emptyDraft.id);
      setMessages(deserializeMsgs(emptyDraft.messages));
      setInput(""); setSelectedImage(null); setSelectedImageName(""); return;
    }
    const empty: Conversation = { id: "new", title: lang === "fr" ? "Nouvelle conversation" : "New conversation", messages: [], updatedAt: Date.now() };
    setConversations(p => [empty, ...p.filter(c => c.id !== "new")]);
    setActiveConversationId("new"); setMessages([]);
    setInput(""); setSelectedImage(null); setSelectedImageName("");
  };

  const switchConversation = (id: string) => {
    if (id === activeConversationId) return;
    const target = conversations.find(c => c.id === id);
    if (!target) return;
    setActiveConversationId(id); setMessages(deserializeMsgs(target.messages));
  };

  // FIX 2 : demander confirmation avant de supprimer
  const askDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
    setDeleteConfirmEvent(e);
  };

  const confirmDeleteConversation = async () => {
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    if (!id) return;
    if (userId && id !== "local" && id !== "new") {
      const { error } = await supabase.from("echo_conversations").delete().eq("id", id).eq("user_id", userId);
      if (error) console.error("[Chat] delete:", error.message);
    }
    setConversations(prev => {
      const remaining = prev.filter(c => c.id !== id);
      const finalList = remaining.length > 0 ? remaining : [{ id: "new", title: lang === "fr" ? "Nouvelle conversation" : "New conversation", messages: [], updatedAt: Date.now() }];
      if (id === activeConversationId) { setActiveConversationId(finalList[0].id); setMessages(deserializeMsgs(finalList[0].messages)); }
      return finalList;
    });
  };

  // FIX 3 : renommer une conversation
  const startRenaming = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(id);
    setRenameValue(currentTitle);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const commitRename = async () => {
    if (!renamingId) return;
    const newTitle = renameValue.trim() || (lang === "fr" ? "Nouvelle conversation" : "New conversation");
    setConversations(prev => prev.map(c => c.id === renamingId ? { ...c, title: newTitle } : c));
    // Persiste en base si connecté
    if (userId && renamingId !== "new" && !renamingId.startsWith("local-")) {
      await supabase.from("echo_conversations").update({ updated_at: new Date().toISOString() }).eq("id", renamingId).eq("user_id", userId);
    }
    setRenamingId(null);
  };

  // ── PASTE IMAGE ───────────────────────────────────────────────────────────
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          if (userTier === "connected_free" || userTier === "basic") { event.preventDefault(); return; }
          const file = items[i].getAsFile(); if (!file) return;
          const reader = new FileReader();
          reader.onload = () => { setSelectedImage(reader.result as string); setSelectedImageName(lang === "fr" ? "Capture collée.png" : "Pasted screenshot.png"); };
          reader.readAsDataURL(file);
          event.preventDefault(); break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [userTier, lang]);

  // ── SEND ──────────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() && !selectedImage) return;
    
    const userMessage = input.trim() || (lang === "fr" ? "Analyse cette image." : "Analyze this image.");
    const imageToSend = selectedImage;
    const userRaw     = `${lang === "fr" ? "Toi" : "You"}: ${userMessage}`;
    const userEntry: ChatMessage = { raw: userRaw, imageB64: imageToSend ?? undefined };
    const baseMessages = [...messages, userEntry];
    setEchoState("thinking");
    setMessages([...baseMessages, { raw: "Echo: ..." }]);
    setInput(""); setSelectedImage(null); setSelectedImageName("");

    let activeConvoId = activeConversationId;
    if (activeConversationId === "new") {
      try {
        if (userId) {
          const { data, error } = await supabase.from("echo_conversations")
            .insert({ user_id: userId, source: "chat", messages: serializeMsgs([userEntry]), updated_at: new Date().toISOString() })
            .select("id").single();
          if (error) throw error;
          if (data?.id) {
            activeConvoId = data.id;
            setActiveConversationId(data.id);
            const newConvo: Conversation = { id: data.id, title: deriveTitle(serializeMsgs([userEntry]), lang), messages: serializeMsgs([userEntry]), updatedAt: Date.now() };
            setConversations(prev => [newConvo, ...prev.filter(c => c.id !== "new")]);
          }
        } else {
          const localId = `local-${Date.now()}`;
          activeConvoId = localId;
          setActiveConversationId(localId);
          const newConvo: Conversation = { id: localId, title: deriveTitle(serializeMsgs([userEntry]), lang), messages: serializeMsgs([userEntry]), updatedAt: Date.now() };
          setConversations(prev => [newConvo, ...prev.filter(c => c.id !== "new")]);
          // FIX 1 : save immédiate pour visiteur
          saveLocalConvos([newConvo, ...conversations.filter(c => c.id !== "new")]);
        }
      } catch (err) {
        console.error("[Chat] Échec de la création à la volée :", err);
        setMessages([...messages, { raw: "Echo: Échec d'initialisation de la session." }]);
        setEchoState("idle"); return;
      }
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, image: imageToSend, history: serializeMsgs(baseMessages), userTier, calendarEvents: {}, selectedButtons, web_search: true }),
      });
      const data = await response.json();
      setEchoState("speaking");

      let isActionBlocked = false;
      let blockedCategory: "vitality_actions"|"calendar"|null = null;
      if (data.action) {
        const { type } = data.action;
        const qCat: "vitality_actions"|"calendar" = (type === "ADD_BUDGET_EXPENSE" || type === "ADD_CALORIE_LOG" || type === "SET_CALORIE_GOAL" || type === "UPDATE_CALORIE_GOAL") ? "vitality_actions" : "calendar";
        const status = checkQuota(qCat, userTier);
        if (!status.allowed) { setActiveLimitCategory(qCat); setShowLimitModal(true); isActionBlocked = true; blockedCategory = qCat; }
      }

      const generatedMsgs = [...baseMessages, { raw: `Echo: ${data.response || ""}${isActionBlocked ? `\n\n[🔒 Action bloquée par quota "${blockedCategory}"]` : ""}` }];
      setMessages(generatedMsgs);

      setConversations(prev => prev.map(c =>
        c.id === activeConvoId
          ? { ...c, messages: serializeMsgs(generatedMsgs), updatedAt: Date.now(), title: isDefaultTitle(c.title) ? deriveTitle(serializeMsgs(generatedMsgs), lang) : c.title }
          : c
      ));

      if (data.action && !isActionBlocked && userId) {
        const { type, payload } = data.action;
        if (type === "ADD_BUDGET_EXPENSE") {
          const { title, amount, spent, date, paymentDate, paidAt } = payload;
          await supabase.from("echo_expenses").insert({ user_id: userId, title: title || "Purchase", amount: parseFloat(amount ?? spent) || 0, date: paymentDate || paidAt || date || new Date().toLocaleDateString("fr-CA") });
        }
        if (type === "ADD_CALORIE_LOG") {
          const { foodName, meal, title, calories } = payload;
          await supabase.from("echo_calories").insert({ user_id: userId, food_name: foodName || meal || title || "Food Item", calories: parseInt(calories) || 0, date: new Date().toLocaleDateString("fr-CA") });
        }
        if (type === "SET_CALORIE_GOAL" || type === "UPDATE_CALORIE_GOAL") {
          const { goal, calorieGoal, calories } = payload;
          const nextGoal = parseInt(goal ?? calorieGoal ?? calories);
          if (Number.isFinite(nextGoal) && nextGoal > 0) localStorage.setItem("echo-calorie-goal", nextGoal.toString());
        }
        if (type === "ADD_CALENDAR_EVENT") {
          const { title, start, notes = "" } = payload;
          const dateKey = start?.split("T")[0] || start || "";
          if (dateKey) await supabase.from("echo_calendar").insert({ user_id: userId, title: title || "Untitled Event", start_date: dateKey, end_date: dateKey, notes: notes || "", is_from_echo: true });
        }
      }
    } catch {
      setMessages([...baseMessages, { raw: "Echo: Unable to connect to backend server." }]);
    } finally {
      setTimeout(() => setEchoState("idle"), 10000);
    }
  };

  const handleImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setSelectedImage(reader.result as string); setSelectedImageName(file.name); };
    reader.readAsDataURL(file);
  };

  const lancerDictation = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition is not supported."); return; }
    const r = new SR();
    r.lang = lang === "fr" ? "fr-FR" : "en-US";
    r.onstart = () => setIsListening(true); r.onend = () => setIsListening(false); r.onerror = () => setIsListening(false);
    r.onresult = (e: any) => setInput(p => p + (p ? " " : "") + e.results[0][0].transcript);
    r.start();
  };

  const isImageLocked = userTier === "connected_free" || userTier === "basic";

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <main className="h-screen bg-white dark:bg-black text-black dark:text-white flex overflow-hidden font-sans transition-colors duration-200 selection:bg-cyan-500/30 relative">

      {/* FIX 2 : DELETE CONFIRM MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-7 rounded-2xl max-w-sm w-full shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200" onClick={e => e.stopPropagation()}>
            {/* Echo avatar */}
            <div className="flex flex-col items-center gap-3 mb-5">
              <div className="w-16 h-16 rounded-full border-2 border-cyan-400/60 overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                <img src="/Echo.png" alt="Echo" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <p className="text-cyan-500 font-mono text-[10px] uppercase tracking-widest font-bold mb-1">Echo</p>
                {lang === "fr" ? (
                  <p className="text-zinc-800 dark:text-zinc-100 font-bold text-base leading-snug">
                    Hé hé… attention ! 👀
                  </p>
                ) : (
                  <p className="text-zinc-800 dark:text-zinc-100 font-bold text-base leading-snug">
                    Hey hey… hold on! 👀
                  </p>
                )}
              </div>
            </div>

            <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center leading-relaxed mb-6">
              {lang === "fr"
                ? <>Tout ce qu'il y a dans cette conversation… <span className="text-rose-400 font-semibold">poof</span> — ça disparaît à jamais. T'es vraiment sûr·e de vouloir faire ça ? 😉</>
                : <>Everything in this conversation… <span className="text-rose-400 font-semibold">poof</span> — gone forever. You really sure about this? 😉</>}
            </p>

            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                {lang === "fr" ? "Annuler" : "Cancel"}
              </button>
              <button onClick={confirmDeleteConversation}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors shadow-md">
                {lang === "fr" ? "Oui, supprimer 🗑️" : "Yes, delete 🗑️"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TUTORIAL */}
      {tutorialStep === 1 && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[92vw] max-w-[460px] sm:max-w-[640px] max-h-[85vh] overflow-y-auto bg-zinc-950 text-white dark:bg-white dark:text-black rounded-2xl p-6 shadow-[0_0_35px_rgba(6,182,212,0.6)] border-2 border-cyan-400 dark:border-cyan-500 animate-in fade-in slide-in-from-top-4 duration-300 z-50">
          <TutorialHeaderControls onClose={() => { setTutorialStep(null); localStorage.setItem("echo-tuto-chat-done-v1","true"); }} />
          <div className="flex items-center gap-3 mb-4 border-b border-zinc-800 dark:border-zinc-200 pb-2 pr-16">
            <span className="text-xl">💬</span>
            <h4 className="font-black text-sm sm:text-base font-mono uppercase tracking-widest text-cyan-400 dark:text-cyan-600">
              {lang === "fr" ? "CHAPITRE 2 : L'ESPACE IMMERSIF" : "CHAPTER 2: IMMERSIVE SPACE"}
            </h4>
          </div>
          <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start mb-5">
            <div className="shrink-0 bg-zinc-900 dark:bg-zinc-100 p-1.5 rounded-full border border-zinc-800 dark:border-zinc-200">
              <img src="/Echo.png" alt="Echo Mini" className="w-16 h-16 rounded-full object-cover" />
            </div>
            <div className="text-xs sm:text-[13.5px] text-zinc-200 dark:text-zinc-800 leading-relaxed font-semibold space-y-3 whitespace-pre-line flex-1">
              {lang === "fr"
                ? <>Rebonjour ! Bienvenue dans mon espace de discussion pure. 👋{"\n"}Le canal direct avec ma conscience. Tu peux tout me demander.{"\n"}Laisse la fluidité faire son œuvre. On commence ? ✨</>
                : <>Welcome back! Welcome to my pure chat space. 👋{"\n"}The direct channel to my core frequency. Ask me anything.{"\n"}Let the fluidity take over. Shall we begin? ✨</>}
            </div>
          </div>
          <button onClick={() => { setTutorialStep(null); localStorage.setItem("echo-tuto-chat-done-v1","true"); }}
            className="w-full text-center py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs tracking-widest transition-all shadow-md uppercase">
            {lang === "fr" ? "OUVRIR LE CANAL 🚀" : "OPEN CHANNEL 🚀"}
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* NAV SIDEBAR */}
        <aside className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-8 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between">
          <div className="space-y-20">
            <h2 className="font-bold text-lg">
              <Link href="/" className="hover:text-cyan-500 dark:hover:text-cyan-400">{t.sidebar.home}</Link>
            </h2>
            <div className="space-y-20 text-zinc-800 dark:text-zinc-100 font-medium">
              <Link href="/chat"     className="block text-cyan-600 dark:text-cyan-400 font-bold">{t.sidebar.chat}</Link>
              <Link href="/books"    className="block hover:text-cyan-500">{t.sidebar.books}</Link>
              <Link href="/calendar" className="block hover:text-cyan-500">📅 {lang==="fr"?"Calendrier":"Calendar"}</Link>
              <Link href="/vitality" className="block hover:text-cyan-500">📈 {lang==="fr"?"Vitalité":"Vitality"}</Link>
              <Link href="/services" className="block hover:text-cyan-500">💎 {lang==="fr"?"Services":"Services"}</Link>
              <Link href="/account"  className="block hover:text-cyan-500">👤 {lang==="fr"?"Compte":"Account"}</Link>
              <Link href="/horizonweb" className="block hover:text-cyan-500">📡 HorizonWeb</Link>
              <hr className="border-zinc-200 dark:border-zinc-800 my-4" />
              <Link href="/history"  className="block hover:text-amber-500">⭐ {lang==="fr"?"Historique":"History"}</Link>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <button
              onMouseDown={() => { if (!selectedButtons.filter(b => b !== "surprise").length) setIsPressingSurprise(true); }}
              onMouseUp={() => setIsPressingSurprise(false)}
              onMouseLeave={() => setIsPressingSurprise(false)}
              onTouchStart={() => { if (!selectedButtons.filter(b => b !== "surprise").length) setIsPressingSurprise(true); }}
              onTouchEnd={() => setIsPressingSurprise(false)}
              onClick={handleSurpriseToggle}
              disabled={selectedButtons.length > 0 && !isSurpriseActive}
              className={`w-full py-3.5 px-3 rounded-xl text-[10px] font-black tracking-widest font-mono uppercase transition-all duration-300 border text-center select-none shadow-sm ${
                selectedButtons.length > 0 && !isSurpriseActive
                  ? "opacity-25 cursor-not-allowed bg-transparent border-zinc-200 dark:border-zinc-900 text-zinc-500"
                  : isSurpriseActive
                    ? "bg-gradient-to-r from-purple-500/30 to-cyan-500/30 text-purple-400 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                    : "bg-purple-500/[0.04] dark:bg-purple-950/[0.06] text-purple-600 dark:text-purple-400 border-purple-700/40 hover:border-purple-400 hover:bg-purple-500/10"}`}>
              {isPressingSurprise ? "💎 Émergence 💎" : "💎 Surprise 💎"}
            </button>
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
              Status : <span className="text-cyan-500 dark:text-cyan-400 uppercase font-bold block">{userTier}</span>
            </div>
          </div>
        </aside>

        {/* PANNEAU CONVERSATIONS */}
        {isConvoPanelOpen ? (
          <>
            <div ref={convoPanelRef} style={{ width: convoPanelWidth, flexBasis: convoPanelWidth }}
              className="shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col overflow-hidden">
              <div className="h-12 shrink-0 flex items-center justify-between px-3 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 font-bold">
                  {lang==="fr"?"Conversations":"Conversations"}
                </span>
                <button onClick={() => setIsConvoPanelOpen(false)} className="text-zinc-400 hover:text-cyan-500 transition-colors text-sm p-1">◂</button>
              </div>
              
              <button onClick={startNewConversation}
                className="m-2 shrink-0 flex items-center justify-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-2.5 rounded-xl transition-colors">
                + {lang==="fr"?"Nouvelle conversation":"New conversation"}
              </button>

              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 min-h-0">
                {conversations.slice().sort((a,b) => b.updatedAt - a.updatedAt).map(c => (
                  <div key={c.id} onClick={() => { if (renamingId !== c.id) switchConversation(c.id); }}
                    className={`group w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-1 cursor-pointer ${
                      c.id === activeConversationId
                        ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400"
                        : "border border-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}>

                    {/* FIX 3 : inline rename input */}
                    {renamingId === c.id ? (
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingId(null); }}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 bg-white dark:bg-zinc-900 border border-cyan-400/60 rounded-md px-1.5 py-0.5 text-xs text-black dark:text-white outline-none min-w-0"
                      />
                    ) : (
                      <span className="truncate flex-1">{c.title}</span>
                    )}

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Rename pencil — visible on hover */}
                      {renamingId !== c.id && (
                        <button
                          onClick={e => startRenaming(c.id, c.title, e)}
                          title={lang === "fr" ? "Renommer" : "Rename"}
                          className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-cyan-400 transition-opacity text-[10px] p-0.5">
                          ✏️
                        </button>
                      )}
                      {/* Delete X */}
                      <button onClick={e => askDeleteConversation(c.id, e)}
                        title={lang === "fr" ? "Supprimer" : "Delete"}
                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity text-[10px] p-0.5">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div onMouseDown={startConvoResize} className="hidden lg:flex w-2.5 shrink-0 cursor-col-resize items-center justify-center group">
              <div className="w-1 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 group-hover:bg-cyan-500 transition-colors" />
            </div>
          </>
        ) : (
          <button onClick={() => setIsConvoPanelOpen(true)}
            className="shrink-0 w-7 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-cyan-500 transition-colors">
            ▸
          </button>
        )}

        {/* CHAT SECTION */}
        <section className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-black transition-colors duration-200 min-w-0">
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 w-full">

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-white dark:bg-black">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  {!tutorialStep && (
                    <div className="w-16 h-16 shrink-0 border border-zinc-200 dark:border-zinc-900 rounded-full shadow-md overflow-hidden bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center echo-idle">
                      <img src="/Echo.png" alt="Echo Avatar" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <p className="text-zinc-400 dark:text-zinc-700 text-sm italic">
                    {lang==="fr"?"Commence une conversation avec Echo...":"Start a conversation with Echo..."}
                  </p>
                </div>
              )}
              <div className="max-w-4xl mx-auto pl-10 pr-6 py-10 flex flex-col gap-10 w-full">
                {messages.map((msg, index) => {
                  const isEcho = /^Echo\s*:/i.test(msg.raw);
                  const isUser = /^(You|Toi)\s*:/i.test(msg.raw);
                  const isLastEcho = isEcho && index === lastEchoIndex;
                  const cleanText = isEcho ? msg.raw.replace(/^Echo\s*:\s*/i,"") : msg.raw.replace(/^(You|Toi)\s*:\s*/i,"");

                  if (isEcho) return (
                    <div key={index} className="flex flex-col gap-4 animate-in fade-in duration-300 max-w-3xl">
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 shrink-0 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-sm overflow-hidden bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center ${isLastEcho ? echoState==="thinking"?"echo-thinking":echoState==="speaking"?"echo-speaking":"echo-idle":"echo-idle"}`}>
                          <img src="/Echo.png" alt="Echo Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-zinc-500 dark:text-zinc-300 text-sm font-mono uppercase tracking-widest font-bold">Echo</span>
                          <span className="text-zinc-400 dark:text-zinc-600 text-[10px] font-mono">Core Frequency</span>
                        </div>
                      </div>
                      <div className="text-zinc-800 dark:text-zinc-200 text-[15px] leading-8 font-normal tracking-wide selection:bg-cyan-500/30 flex flex-col gap-5 pl-2 sm:pl-20 overflow-hidden">
                        {cleanText.split(/\n\n+/).map((block,i) => <p key={i} className="whitespace-pre-wrap break-words">{block}</p>)}
                      </div>
                    </div>
                  );

                  if (isUser) return (
                    <div key={index} className="flex justify-start animate-in fade-in duration-200 max-w-3xl sm:pl-20">
                      <div className="max-w-xl min-w-0 flex flex-col items-start gap-2">
                        {msg.imageB64 && <img src={msg.imageB64} alt="img" className="max-w-[160px] max-h-[120px] rounded-xl border border-zinc-700 object-cover shadow-md" />}
                        {cleanText && cleanText !== "Analyse cette image." && cleanText !== "Analyze this image." && (
                          <p className="text-zinc-800 dark:text-zinc-300 text-[14px] leading-7 tracking-wide bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 inline-block text-left break-words whitespace-pre-wrap shadow-inner selection:bg-cyan-500/30 max-w-full">{cleanText}</p>
                        )}
                      </div>
                    </div>
                  );
                  return null;
                })}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* BOUTONS COMPORTEMENTAUX + SETTINGS */}
            <div className="w-full lg:w-64 shrink-0 border-t lg:border-t-0 lg:border-l border-zinc-100 dark:border-zinc-900/60 flex flex-col bg-zinc-50/20 dark:bg-zinc-950/10 overflow-hidden max-h-[42vh] lg:max-h-none lg:h-full">
              <div className="p-3 border-b border-zinc-100 dark:border-zinc-900/80 flex items-center justify-between shrink-0">
                <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 font-bold">Modes</span>
                <div className="relative" ref={settingsRef}>
                  <button onClick={() => setIsSettingsOpen(v => !v)}
                    className="p-1.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-cyan-500 hover:border-cyan-500/50 transition-all text-xs flex items-center gap-1">
                    ⚙️ <span className="font-mono text-[9px] bg-cyan-500/15 text-cyan-500 px-1 rounded uppercase">{lang}</span>
                  </button>
                  {isSettingsOpen && (
                    <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xl p-2 flex flex-col gap-1 z-50">
                      <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-400 px-2 py-1 border-b border-zinc-100 dark:border-zinc-900">
                        {lang==="fr"?"Paramètres":"Settings"}
                      </div>
                      <button onClick={toggleTheme} className="text-left px-2 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors">
                        {theme==="dark"?"☀️ Mode Clair":"🌙 Mode Sombre"}
                      </button>
                      <div className="px-2 py-1.5"><LangDropdown /></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 p-3 overflow-y-auto grid grid-cols-2 lg:flex lg:flex-col gap-2 content-start">
                {buttonsOrder.map(id => {
                  const isSelected     = selectedButtons.includes(id);
                  const isDoubleRegard = id === "double";
                  let isLocked = false;
                  if (!isDoubleRegard) {
                    if (selectedButtons.length === 1 && !isSelected && !isDoubleRegardUnlocked) isLocked = true;
                    else if (selectedButtons.length === 2 && !isSelected) isLocked = true;
                  } else {
                    if (selectedButtons.length === 0 || selectedButtons.length === 2) isLocked = true;
                  }
                  return (
                    <button key={id} disabled={isLocked} onClick={() => handleButtonClick(id)}
                      className={`w-full h-10 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 border text-left select-none truncate ${
                        isLocked
                          ? "opacity-30 cursor-not-allowed bg-transparent border-zinc-200 dark:border-zinc-900 text-zinc-400"
                          : isSelected || (isDoubleRegard && isDoubleRegardUnlocked)
                            ? "bg-cyan-500 text-white border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]"
                            : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-400"}`}>
                      {lang==="fr" ? buttonsLabels[id].fr : buttonsLabels[id].en}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* INPUT ZONE */}
          <div className="border-t border-zinc-200 dark:border-zinc-900 px-4 py-4 shrink-0 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-200">
            <div className="max-w-4xl mx-auto flex flex-col gap-3">
              {selectedImage && (
                <div className="flex items-center gap-3 bg-violet-500/10 border border-violet-500/20 rounded-xl px-3 py-2">
                  <img src={selectedImage} alt="preview" className="w-10 h-10 rounded-lg object-cover border border-violet-500/30" />
                  <span className="text-[11px] text-violet-400 font-medium truncate flex-1">{selectedImageName}</span>
                  <button onClick={() => { setSelectedImage(null); setSelectedImageName(""); }} className="text-zinc-400 hover:text-red-500 font-bold shrink-0">✕</button>
                </div>
              )}

              <textarea ref={textareaRef} value={input} maxLength={getMessageMaxLength(userTier)}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={t.chat.placeholder}
                style={{ height: inputHeight }}
                className="w-full bg-white dark:bg-zinc-900 text-black dark:text-white border border-zinc-200 dark:border-zinc-900 rounded-xl p-4 resize-y text-sm focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 placeholder-zinc-400 dark:placeholder-zinc-700 transition-colors leading-relaxed shadow-inner" />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="grid grid-cols-3 gap-3 flex-1">
                  <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelection} className="hidden" />
                  <button type="button" disabled={isImageLocked} onClick={() => imageInputRef.current?.click()}
                    className={`h-12 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                      isImageLocked
                        ? "cursor-not-allowed bg-zinc-200 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-500"
                        : selectedImage
                          ? "bg-emerald-600/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                          : "bg-violet-600/10 border-violet-500/30 hover:bg-violet-600/20 text-violet-600 dark:text-violet-400"}`}>
                    <span>{isImageLocked?"🔒":selectedImage?"✓":"🖼️"}</span>
                    <span>{selectedImage?(lang==="fr"?"Image":"Image"):(lang==="fr"?"Analyse image":"Image")}</span>
                  </button>

                  <button onClick={lancerDictation}
                    className={`h-12 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border ${isListening?"bg-red-600 border-red-500 animate-pulse text-white":"bg-cyan-600/10 border-cyan-500/30 hover:bg-cyan-600/20 text-cyan-700 dark:text-cyan-400"}`}>
                    {isListening ? <><span>🔴</span><span>Stop</span></> : <><span>🎤</span><span>{lang==="fr"?"Parler":"Speak"}</span></>}
                  </button>

                  <button onClick={sendMessage}
                    className="h-12 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold text-sm text-white transition-all shadow-md uppercase tracking-wider">
                    {t.chat.send}
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0 justify-center sm:justify-end">
                  <button type="button" onClick={shrinkInput} title={lang === "fr" ? "Réduire l'éditeur" : "Shrink input"}
                    className="h-12 w-12 rounded-xl border border-zinc-200 dark:border-zinc-300 bg-zinc-100/30 dark:bg-zinc-900/40 text-zinc-500 hover:border-cyan-500/50 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors flex items-center justify-center text-sm shadow-sm">
                    ➖
                  </button>
                  <button type="button" onClick={resetInput} title={lang === "fr" ? "Réinitialiser la taille" : "Reset size"}
                    className="h-12 w-12 rounded-xl border border-zinc-200 dark:border-zinc-300 bg-zinc-100/30 dark:bg-zinc-900/40 text-zinc-500 hover:border-cyan-500/50 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors flex items-center justify-center text-sm shadow-sm">
                    ↺
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* LIMIT MODAL */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShowLimitModal(false)}>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 ${activeLimitCategory==="surprise"?"bg-emerald-500/10 text-emerald-500":"bg-amber-500/10 text-amber-500"}`}>
              {activeLimitCategory==="surprise"?"🌿":"🔒"}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 capitalize">
              {activeLimitCategory==="surprise"?(lang==="fr"?"Émergence":"Emergence"):`${activeLimitCategory} Limit`}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6">
              {activeLimitCategory==="surprise"
                ?(lang==="fr"?"L'émergence nécessite un abonnement Premium.":"Emergence requires a Premium subscription.")
                :(lang==="fr"?`Limite atteinte pour [${activeLimitCategory}].`:`Limit reached for [${activeLimitCategory}].`)}
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/services" onClick={() => setShowLimitModal(false)} className="w-full bg-cyan-600 hover:bg-cyan-500 py-3 rounded-xl font-bold text-sm transition-all text-center text-white">
                🚀 {lang==="fr"?"Améliorer le plan":"Upgrade Plan Tier"}
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}