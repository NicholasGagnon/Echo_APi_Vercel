"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useApp } from "../../context/AppContext";

export const dynamic = "force-dynamic";

type ChatMessage = { raw: string; imageB64?: string };
type Conversation = { id: string; title: string; messages: string[]; summary: string; updatedAt: number };
type Currency = "CAD" | "USD" | "EUR";

const MAX_FREE_CREDITS = 20;
const REGEN_1H_MS = 60 * 60 * 1000; // 1 heure
const REGEN_ADD_AMOUNT = 3; // +3 crédits par heure

const CONV_SOURCE = "echo";
const LOCAL_CONV_KEY = "echo-conversation-v2";
const LOCAL_CONVOS_KEY = "echo-chat-local-convos";

const PRICES: Record<Currency, { amount: string; symbol: string }> = {
  CAD: { amount: "3.99", symbol: "CA$" },
  USD: { amount: "3.99", symbol: "US$" },
  EUR: { amount: "3.99", symbol: "€" },
};

const deriveTitle = (raws: string[], lang: string): string => {
  const first = raws.find(r => /^(You|Toi)\s*:/i.test(r));
  if (first) {
    const clean = first.replace(/^(You|Toi)\s*:\s*/i, "").trim();
    if (clean) return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean;
  }
  return lang === "fr" ? "Nouvelle conversation" : "New conversation";
};

const saveLocalConvos = (convos: Conversation[]) => {
  try { localStorage.setItem(LOCAL_CONVOS_KEY, JSON.stringify(convos.filter(c => c.id.startsWith("local-") || c.id === "new"))); }
  catch (e) { console.error("localStorage save:", e); }
};

const loadLocalConvos = (): Conversation[] => {
  try { const raw = localStorage.getItem(LOCAL_CONVOS_KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
};

function ChatContent() {
  const { t, lang, setLang } = useApp();
  const fr = lang === "fr";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [currentUserTier, setCurrentUserTier] = useState<string>("free");

  // Quotas
  const [availableQuota, setAvailableQuota] = useState<number>(MAX_FREE_CREDITS);
  const [nextRegenIn, setNextRegenIn] = useState<number>(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isConvoPanelOpen, setIsConvoPanelOpen] = useState(true);

  // Modales & Auth
  const [currency, setCurrency] = useState<Currency>("CAD");
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);

  // Tailles
  const [chatFontSize, setChatFontSize] = useState(15);
  const DEFAULT_INPUT_HEIGHT = 70;
  const [inputHeight, setInputHeight] = useState(DEFAULT_INPUT_HEIGHT);

  const increaseFontSize = () => setChatFontSize(s => Math.min(s + 1, 22));
  const decreaseFontSize = () => setChatFontSize(s => Math.max(s - 1, 11));

  const shrinkInput = () => {
    setInputHeight(prev => {
      const next = Math.max(44, Math.round(prev / 1.4));
      if (textareaRef.current) textareaRef.current.style.height = `${next}px`;
      return next;
    });
  };

  const resetInput = () => {
    setInputHeight(DEFAULT_INPUT_HEIGHT);
    setChatFontSize(15);
    if (textareaRef.current) textareaRef.current.style.height = `${DEFAULT_INPUT_HEIGHT}px`;
  };

  // Media
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [echoState, setEchoState] = useState("idle");

  const [selectedButtons, setSelectedButtons] = useState<string[]>([]);

  const buttonsLabels: Record<string, { fr: string; en: string }> = {
    clarity:    { fr: "1🧠 Clarté",          en: "1🧠 Clarity"       },
    humain:     { fr: "2👤 Humain",           en: "2👤 Human"         },
    critical:   { fr: "3⚔️ Regard Critique",  en: "3⚔️ Critical View" },
    expert:     { fr: "4🎓 Expert",           en: "4🎓 Expert"        },
    precision:  { fr: "5🎯 Précision",        en: "5🎯 Precision"     },
    philosophy: { fr: "6🏛️ Philosophie",     en: "6🏛️ Philosophy"   },
    strategy:   { fr: "7♟️ Stratégie",       en: "7♟️ Strategy"      },
    decompose:  { fr: "8🧩 Décomposer",      en: "8🧩 Decompose"     },
    refine:     { fr: "9❓ Affiner",          en: "9❓ Refine"         },
    double:     { fr: "10⚡ Double Regard",   en: "10⚡ Dual Vision"  },
  };
  const buttonsOrder = ["clarity", "humain", "critical", "expert", "precision", "philosophy", "strategy", "decompose", "refine", "double"];

  const serializeMsgs = (msgs: ChatMessage[]) => msgs.map(m => m.raw);
  const deserializeMsgs = (raws: string[]): ChatMessage[] => raws.map(r => ({ raw: r }));

  const verifierStatutUser = async (uid: string) => {
    try {
      const { data: cData } = await supabase.from("chat_quotas").select("tier").eq("user_id", uid).maybeSingle();
      if (cData?.tier && cData.tier !== "free" && cData.tier !== "connected_free") {
        setCurrentUserTier(cData.tier); return;
      }
      setCurrentUserTier("free");
    } catch { setCurrentUserTier("free"); }
  };

  const chargerQuotaUtilisateur = async (uid: string) => {
    try {
      const { data } = await supabase
        .from("chat_quotas")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();

      const now = Date.now();
      if (data) {
        const tier = (data.tier || "free");
        setCurrentUserTier(tier);

        if (tier === "premium" || tier === "advantage") {
          setAvailableQuota(999);
          return;
        }

        const lastRegen = new Date(data.last_regen_at || data.created_at).getTime();
        const elapsed = now - lastRegen;
        const cycles = Math.floor(elapsed / REGEN_1H_MS);
        const available = Math.min(MAX_FREE_CREDITS, (data.available_credits ?? MAX_FREE_CREDITS) + (cycles * REGEN_ADD_AMOUNT));

        setAvailableQuota(available);

        if (available < MAX_FREE_CREDITS) {
          setNextRegenIn(REGEN_1H_MS - (elapsed % REGEN_1H_MS));
        }
      } else {
        await supabase.from("chat_quotas").insert({
          user_id: uid,
          available_credits: MAX_FREE_CREDITS,
          tier: "free",
          last_regen_at: new Date().toISOString(),
        });
        setAvailableQuota(MAX_FREE_CREDITS);
        setCurrentUserTier("free");
      }
    } catch {
      setAvailableQuota(MAX_FREE_CREDITS);
    }
  };

  const verifierQuotaAnonyme = () => {
    try {
      const savedAnon = parseInt(localStorage.getItem("chat_anon_used") || "0");
      setAvailableQuota(Math.max(0, MAX_FREE_CREDITS - savedAnon));
    } catch {
      setAvailableQuota(MAX_FREE_CREDITS);
    }
  };

  const consommerUnCredit = async (): Promise<boolean> => {
    if (currentUserTier === "premium" || currentUserTier === "advantage") return true;

    if (!user) {
      const currentUsed = parseInt(localStorage.getItem("chat_anon_used") || "0");
      if (currentUsed >= MAX_FREE_CREDITS) {
        setShowSignInModal(true);
        return false;
      }
      localStorage.setItem("chat_anon_used", String(currentUsed + 1));
      setAvailableQuota(Math.max(0, MAX_FREE_CREDITS - (currentUsed + 1)));
      return true;
    }

    const now = Date.now();
    const { data } = await supabase
      .from("chat_quotas")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    let avail = data?.available_credits ?? MAX_FREE_CREDITS;
    let lastRegen = data ? new Date(data.last_regen_at).getTime() : now;

    if (data && currentUserTier === "free") {
      const elapsed = now - lastRegen;
      const cycles = Math.floor(elapsed / REGEN_1H_MS);
      avail = Math.min(MAX_FREE_CREDITS, avail + (cycles * REGEN_ADD_AMOUNT));
      if (cycles > 0) lastRegen = now;
    }

    if (avail < 1) {
      const elapsed = now - lastRegen;
      setNextRegenIn(REGEN_1H_MS - (elapsed % REGEN_1H_MS));
      setShowPremiumModal(true);
      return false;
    }

    const newAvail = avail - 1;
    setAvailableQuota(newAvail);

    await supabase.from("chat_quotas").upsert({
      user_id: user.id,
      available_credits: newAvail,
      tier: currentUserTier,
      last_regen_at: new Date(lastRegen).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return true;
  };

  const formatRegenTime = (ms: number) => {
    const minutes = Math.ceil(ms / 60000);
    return `${minutes} min`;
  };

  const loadConversationsFromDB = async (uid: string) => {
    const { data, error } = await supabase
      .from("echo_conversations").select("id, messages, summary, updated_at")
      .eq("user_id", uid).eq("source", CONV_SOURCE)
      .order("updated_at", { ascending: false });
    if (error) return [];
    return (data || []).map(row => ({
      id: row.id,
      title: deriveTitle(row.messages || [], lang),
      messages: row.messages || [],
      summary: row.summary || "",
      updatedAt: new Date(row.updated_at).getTime(),
    })) as Conversation[];
  };

  const saveConversationToDB = async (uid: string, convId: string | null, raws: string[], currentSummary: string) => {
    if (!convId || convId === "new" || convId.startsWith("local-")) return;
    await supabase.from("echo_conversations").update({
      messages: raws,
      summary: currentSummary,
      updated_at: new Date().toISOString(),
    }).eq("id", convId).eq("user_id", uid);
  };

  const initForUser = async (uid: string | null) => {
    if (!uid) {
      const sharedRaw = localStorage.getItem(LOCAL_CONV_KEY);
      const sharedMsgs = sharedRaw ? JSON.parse(sharedRaw) : [];
      const localConvos = loadLocalConvos();

      if (localConvos.length > 0) {
        setConversations(localConvos);
        setActiveConversationId(localConvos[0].id);
        setMessages(deserializeMsgs(localConvos[0].messages));
      } else if (sharedMsgs.length > 0) {
        const localId = `local-${Date.now()}`;
        const conv: Conversation = { id: localId, title: deriveTitle(sharedMsgs, lang), messages: sharedMsgs, summary: "", updatedAt: Date.now() };
        setConversations([conv]);
        setActiveConversationId(localId);
        setMessages(deserializeMsgs(sharedMsgs));
        saveLocalConvos([conv]);
      } else {
        const empty: Conversation = { id: "new", title: fr ? "Nouvelle conversation" : "New conversation", messages: [], summary: "", updatedAt: Date.now() };
        setConversations([empty]);
        setActiveConversationId("new");
        setMessages([]);
      }
      return;
    }
    const list = await loadConversationsFromDB(uid);
    const finalList = list.length > 0 ? list : [{ id: "new", title: fr ? "Nouvelle conversation" : "New conversation", messages: [], summary: "", updatedAt: Date.now() }];
    setConversations(finalList);
    setActiveConversationId(finalList[0].id);
    setMessages(deserializeMsgs(finalList[0].messages));
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      await initForUser(uid);
      if (session?.user) {
        setUser(session.user);
        verifierStatutUser(uid);
        chargerQuotaUtilisateur(uid);
      } else {
        verifierQuotaAnonyme();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null);
        setUserId(null);
        await initForUser(null);
        setCurrentUserTier("free");
        verifierQuotaAnonyme();
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const uid = session.user.id;
        setUser(session.user);
        setUserId(uid);
        await initForUser(uid);
        verifierStatutUser(uid);
        chargerQuotaUtilisateur(uid);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setSelectedImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleButtonClick = (id: string) => {
    if (selectedButtons.includes(id)) {
      setSelectedButtons(selectedButtons.filter(b => b !== id));
    } else {
      if (selectedButtons.length < 2) {
        setSelectedButtons([...selectedButtons, id]);
      }
    }
  };

  const sendMessage = async () => {
    if (!input.trim() && !selectedImage) return;

    const autorise = await consommerUnCredit();
    if (!autorise) return;

    const userMessage = input.trim() || (fr ? "Analyse cette image." : "Analyze this image.");
    const imageToSend = selectedImage;
    const userRaw = `${fr ? "Toi" : "You"}: ${userMessage}`;
    const userEntry: ChatMessage = { raw: userRaw, imageB64: imageToSend ?? undefined };

    const baseMessages = [...messages, userEntry];
    setEchoState("thinking");
    setMessages([...baseMessages, { raw: "Echo: ..." }]);

    setInput("");
    setSelectedImage(null);
    setSelectedImageName("");

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          image: imageToSend,
          history: serializeMsgs(baseMessages),
          userTier: isPaidTier ? "premium" : "free",
          selectedButtons,
          source: "chat",
        }),
      });

      const data = await response.json();
      setEchoState("speaking");

      const generatedMsgs = [...baseMessages, { raw: `Echo: ${data.response || ""}` }];
      setMessages(generatedMsgs);

      if (userId && activeConversationId && activeConversationId !== "new") {
        await saveConversationToDB(userId, activeConversationId, serializeMsgs(generatedMsgs), "");
      }
    } catch {
      setMessages([...baseMessages, { raw: "Echo: Connexion au serveur impossible." }]);
    } finally {
      setTimeout(() => setEchoState("idle"), 5000);
    }
  };

  const lancerDictation = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition non supportée."); return; }
    const r = new SR();
    r.lang = fr ? "fr-FR" : "en-US";
    r.onstart = () => setIsListening(true);
    r.onend = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    r.onresult = (e: any) => setInput(p => p + (p ? " " : "") + e.results[0][0].transcript);
    r.start();
  };

  const isPaidTier = currentUserTier && currentUserTier !== "free" && currentUserTier !== "connected_free";

  return (
    <main className="h-screen w-screen bg-black text-zinc-50 font-sans selection:bg-cyan-500/20 relative overflow-hidden flex flex-col">

      {/* ── HEADER UNIFIÉ ÉCOSYSTÈME ── */}
      <header className="border-b border-zinc-900 bg-black/90 backdrop-blur-md sticky top-0 z-40 shrink-0">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex justify-between items-center relative">
          
          <div className="flex items-center gap-6">
            <Link href="/outil" className="text-sm font-mono font-black tracking-[0.25em] text-white uppercase">
              ECHOSAI
            </Link>

            <Link
              href="/outil"
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all hover:scale-105 active:scale-95"
            >
              <span>⚡</span>
              <span>{fr ? "RETOUR AUX OUTILS" : "BACK TO TOOLS"}</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-mono relative">
            <div className="flex border border-zinc-800 rounded-lg overflow-hidden font-mono text-[10px] bg-zinc-900">
              {(["CAD", "USD", "EUR"] as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2 py-1 font-bold transition-colors ${currency === c ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:text-white"}`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* QUOTA COMPTEUR */}
            <div 
              onClick={() => !isPaidTier && setShowPremiumModal(true)} 
              className="cursor-pointer flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-amber-500/40 bg-zinc-900 text-white shadow-lg hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
            >
              <span className="text-[10px] text-zinc-400 font-bold uppercase">{fr ? "Messages :" : "Messages:"}</span>
              <span className={`font-bold font-mono ${availableQuota === 0 ? "text-red-400" : "text-cyan-400"}`}>
                {isPaidTier ? "∞ ILLIMITÉ" : `${availableQuota}/${MAX_FREE_CREDITS} ${fr ? "disponibles" : "available"}`}
              </span>
              {!isPaidTier && (
                <span className="text-[9px] bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm animate-pulse">
                  ★ ILLIMITÉ ({PRICES[currency].symbol}{PRICES[currency].amount})
                </span>
              )}
            </div>

            <div className="flex border border-zinc-800 rounded-lg overflow-hidden font-mono text-[10px]">
              <button onClick={() => setLang("fr")} className={`px-2 py-1 ${fr ? "bg-zinc-800 text-white font-bold" : "text-zinc-500 hover:text-zinc-300"}`}>FR</button>
              <button onClick={() => setLang("en")} className={`px-2 py-1 ${!fr ? "bg-zinc-800 text-white font-bold" : "text-zinc-500 hover:text-zinc-300"}`}>EN</button>
            </div>

            {userId ? (
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-[11px] text-red-500 hover:text-red-400 transition-colors uppercase font-bold"
              >
                [ {fr ? "Déconnexion" : "Sign Out"} ]
              </button>
            ) : (
              <button
                onClick={() => setShowSignInModal(true)}
                className="px-3 py-1.5 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl hover:bg-zinc-900 transition-all font-bold tracking-tight shadow-sm"
              >
                {fr ? "Connexion" : "Sign In"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── LAYOUT 3 COLONNES VOLETS CONTINUS ── */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative bg-black">

        {/* 1. PANNEAU CONVERSATIONS GAUCHE */}
        {isConvoPanelOpen ? (
          <div className="w-64 border-r border-zinc-900 bg-black flex flex-col shrink-0 h-full">
            <div className="p-3 border-b border-zinc-900 flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 font-bold">
                {fr ? "CONVERSATIONS" : "CONVERSATIONS"}
              </span>
              <button onClick={() => setIsConvoPanelOpen(false)} className="text-zinc-500 hover:text-white text-xs p-1">◂</button>
            </div>

            <button
              onClick={() => {
                setActiveConversationId("new");
                setMessages([]);
              }}
              className="m-3 p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold transition-all text-center shadow-[0_0_12px_rgba(6,182,212,0.2)]"
            >
              + {fr ? "Nouvelle conversation" : "New conversation"}
            </button>

            <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800">
              {conversations.map(c => (
                <div
                  key={c.id}
                  onClick={() => {
                    setActiveConversationId(c.id);
                    setMessages(deserializeMsgs(c.messages));
                  }}
                  className={`p-2.5 rounded-xl text-xs font-mono transition-all cursor-pointer truncate ${
                    activeConversationId === c.id ? "bg-cyan-950/60 border border-cyan-500/40 text-cyan-300" : "text-zinc-400 hover:bg-zinc-900/80"
                  }`}
                >
                  {c.title}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsConvoPanelOpen(true)}
            className="w-8 border-r border-zinc-900 bg-black flex items-center justify-center text-zinc-500 hover:text-white transition-colors h-full shrink-0"
          >
            ▸
          </button>
        )}

        {/* 2. ZONE CENTRALE (MESSAGES + SAISIE ANCRÉE) */}
        <section className="flex-1 flex flex-col min-w-0 bg-black relative h-full overflow-hidden">
          
          {/* MESSAGES DÉROULANTS */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
            <div className="max-w-3xl w-full mx-auto flex flex-col space-y-6">
              
              {messages.length === 0 && (
                <div className="h-64 flex flex-col items-center justify-center gap-3 text-center my-auto">
                  <div className="w-12 h-12 rounded-2xl border border-cyan-500/30 bg-cyan-950/30 flex items-center justify-center text-cyan-400 font-mono text-xl">
                    ✦
                  </div>
                  <p className="text-xs font-mono text-zinc-500 italic">
                    {fr ? "Posez votre question ou déposez une image à analyser..." : "Ask your question or upload an image..."}
                  </p>
                </div>
              )}

              {messages.map((msg, index) => {
                const isEcho = /^Echo\s*:/i.test(msg.raw);
                const isUser = /^(You|Toi)\s*:/i.test(msg.raw);
                const cleanText = msg.raw.replace(/^(Echo|You|Toi):\s*/i, "");

                if (isEcho) return (
                  <div key={index} className="flex gap-4 items-start w-full">
                    <div className="w-10 h-10 rounded-full border border-cyan-500/40 bg-zinc-900 flex items-center justify-center shrink-0">
                      <img src="/echo3.png" alt="Echo" className="w-full h-full object-cover rounded-full" />
                    </div>
                    <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 space-y-2 flex-1 shadow-lg">
                      <div className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">ECHO IA</div>
                      <div className="text-zinc-200 leading-relaxed font-sans" style={{ fontSize: chatFontSize }}>
                        {cleanText}
                      </div>
                    </div>
                  </div>
                );

                if (isUser) return (
                  <div key={index} className="flex justify-end w-full ml-auto">
                    <div className="bg-cyan-950/50 border border-cyan-500/40 rounded-3xl p-5 space-y-2 max-w-xl">
                      {msg.imageB64 && (
                        <img src={msg.imageB64} alt="Upload" className="max-w-xs max-h-60 rounded-2xl border border-cyan-500/40 object-cover mb-2" />
                      )}
                      <div className="text-cyan-100 leading-relaxed font-sans" style={{ fontSize: chatFontSize - 1 }}>
                        {cleanText}
                      </div>
                    </div>
                  </div>
                );

                return null;
              })}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* SAISIE ANCRÉE EN BAS */}
          <div className="border-t border-zinc-900 p-4 bg-black/95 shrink-0">
            <div className="max-w-3xl mx-auto space-y-3">
              
              {selectedImage && (
                <div className="flex items-center gap-3 bg-cyan-950/40 border border-cyan-500/40 rounded-2xl p-2.5 max-w-md">
                  <img src={selectedImage} alt="Preview" className="w-10 h-10 rounded-xl object-cover border border-cyan-400" />
                  <span className="text-xs font-mono text-cyan-300 truncate flex-1">{selectedImageName}</span>
                  <button onClick={() => { setSelectedImage(null); setSelectedImageName(""); }} className="text-zinc-500 hover:text-red-400 text-xs font-bold px-2">✕</button>
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={t.chat.placeholder}
                style={{ height: inputHeight, minHeight: 44 }}
                className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-cyan-400 rounded-2xl p-4 text-sm font-mono text-zinc-100 outline-none resize-y transition-all leading-relaxed shadow-inner"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                  <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelection} className="hidden" />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className={`px-4 py-3 rounded-xl font-mono font-bold text-xs flex items-center gap-2 border transition-all cursor-pointer ${
                      selectedImage
                        ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-400"
                        : "bg-zinc-900 border-zinc-800 hover:border-cyan-500/40 text-zinc-300"
                    }`}
                  >
                    <span>🖼️</span>
                    <span>{selectedImage ? (fr ? "Image Chargée" : "Image Ready") : (fr ? "Analyse Image" : "Analyze Image")}</span>
                  </button>

                  <button
                    onClick={lancerDictation}
                    className={`px-4 py-3 rounded-xl font-mono font-bold text-xs flex items-center gap-2 border transition-all cursor-pointer ${
                      isListening ? "bg-red-600 border-red-500 text-white animate-pulse" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-cyan-500/40"
                    }`}
                  >
                    🎤 {fr ? "Parler" : "Speak"}
                  </button>

                  <button
                    onClick={sendMessage}
                    className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
                  >
                    {t.chat.send}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={decreaseFontSize}
                    className="w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-cyan-500/50 text-zinc-400 hover:text-white font-mono text-xs font-bold transition-colors cursor-pointer"
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    onClick={increaseFontSize}
                    className="w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-cyan-500/50 text-zinc-400 hover:text-white font-mono text-xs font-bold transition-colors cursor-pointer"
                  >
                    A+
                  </button>
                  <button
                    type="button"
                    onClick={shrinkInput}
                    title={fr ? "Réduire la hauteur" : "Shrink input"}
                    className="w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-cyan-500/50 text-zinc-400 hover:text-white font-mono text-xs font-bold transition-colors cursor-pointer"
                  >
                    ➖
                  </button>
                  <button
                    type="button"
                    onClick={resetInput}
                    title={fr ? "Réinitialiser" : "Reset input"}
                    className="w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-cyan-500/50 text-zinc-400 hover:text-white font-mono text-xs font-bold transition-colors cursor-pointer"
                  >
                    ↺
                  </button>
                </div>
              </div>

            </div>
          </div>

        </section>

        {/* 3. PANNEAU MODES D'ANALYSE DROIT */}
        <div className="w-64 border-l border-zinc-900 bg-black p-4 shrink-0 flex flex-col space-y-3 h-full overflow-hidden">
          <div className="text-[10px] font-mono font-black text-zinc-500 uppercase tracking-widest pb-2 border-b border-zinc-900">
            MODES D'ANALYSE
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
            {buttonsOrder.map(id => {
              const isSelected = selectedButtons.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => handleButtonClick(id)}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-mono font-bold border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-cyan-500 text-zinc-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                      : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                  }`}
                >
                  {fr ? buttonsLabels[id].fr : buttonsLabels[id].en}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── MODALE PREMIUM ── */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[99999] p-6 backdrop-blur-md">
          <div className="bg-zinc-950 border border-amber-500/50 rounded-3xl p-8 max-w-md w-full shadow-2xl text-zinc-100 text-center relative">
            <button type="button" onClick={() => setShowPremiumModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white text-sm p-1 cursor-pointer">✕</button>

            <div className="text-4xl mb-3">⚡</div>
            <h2 className="text-lg font-black text-white uppercase font-mono mb-1">
              {fr ? "Quota de 20 Messages Atteint" : "20-Message Limit Reached"}
            </h2>
            <p className="text-xs text-zinc-400 mb-4 font-sans">
              {fr
                ? `Prochain crédit dans environ ${formatRegenTime(nextRegenIn)}. Ou débloquez l'accès illimité dès maintenant.`
                : `Next credit in about ${formatRegenTime(nextRegenIn)}. Or unlock unlimited access now.`}
            </p>

            <div className="flex justify-center gap-2 mb-4 font-mono text-xs">
              {(["CAD", "USD", "EUR"] as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-3 py-1 rounded-lg font-bold border transition-all ${
                    currency === c ? "bg-amber-500 text-zinc-950 border-amber-400" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                  }`}
                >
                  {c} ({PRICES[c].symbol})
                </button>
              ))}
            </div>

            <div className="bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/40 rounded-2xl p-5 mb-6 text-left space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-amber-400 font-bold text-xs font-mono uppercase">★ ECHOAI PREMIUM</span>
                <span className="text-white font-black text-sm font-mono">
                  {PRICES[currency].symbol}{PRICES[currency].amount}/{fr ? "mois" : "mo"}
                </span>
              </div>
              <ul className="text-zinc-300 text-xs space-y-2 font-mono">
                <li className="flex items-center gap-2 text-emerald-400">✓ <strong>Accès Illimité</strong> à tous les outils EchoAI</li>
                <li className="flex items-center gap-2 text-emerald-400">✓ Réponses prioritaires ultra-rapides</li>
              </ul>
            </div>

            <button
              onClick={async () => {
                if (!userId) { setShowPremiumModal(false); setShowSignInModal(true); return; }
                try {
                  const res = await fetch("/api/stripe/create-checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ plan: "world_advantage", currency: currency.toUpperCase(), userId, userEmail: user?.email }),
                  });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                } catch { alert("Erreur Stripe."); }
              }}
              className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 shadow-[0_0_25px_rgba(245,158,11,0.3)] cursor-pointer"
            >
              {fr ? `Activer EchoAI Premium (${PRICES[currency].symbol}${PRICES[currency].amount}/mois)` : `Activate EchoAI Premium (${PRICES[currency].symbol}${PRICES[currency].amount}/mo)`}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-cyan-400 font-mono text-xs">Initialisation du Chat...</div>}>
      <ChatContent />
    </Suspense>
  );
}