"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { UserTier } from "../../utils/quota";
import { useApp } from "../../context/AppContext";

export const dynamic = "force-dynamic";

type ChatMessage = { raw: string; imageB64?: string };
type Conversation = { id: string; title: string; messages: string[]; summary: string; updatedAt: number };
type Currency = "CAD" | "USD" | "EUR";

const CONV_SOURCE = "echo";
const LOCAL_CONV_KEY = "echo-conversation-v2";
const LOCAL_CONVOS_KEY = "echo-chat-local-convos";

const PRICES: Record<Currency, { amount: string; symbol: string }> = {
  CAD: { amount: "3.99", symbol: "CA$" },
  USD: { amount: "3.99", symbol: "US$" },
  EUR: { amount: "3.99", symbol: "€" },
};

const normalizeTier = (raw: string | null): UserTier => {
  if (!raw) return "connected_free";
  const c = raw.toLowerCase().trim();
  if (c === "free" || c === "connected_free") return "connected_free";
  if (["basic", "premium", "ultra", "founder"].includes(c)) return c as UserTier;
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
  const [userTier, setUserTier] = useState<UserTier>("connected_free");

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
      if (uid) {
        const { data: profile } = await supabase.from("profiles").select("user_tier").eq("id", uid).maybeSingle();
        if (profile?.user_tier) setUserTier(normalizeTier(profile.user_tier));
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        setUserId(null);
        await initForUser(null);
        setUserTier("connected_free");
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const uid = session.user.id;
        setUserId(uid);
        await initForUser(uid);
        const { data: profile } = await supabase.from("profiles").select("user_tier").eq("id", uid).maybeSingle();
        if (profile?.user_tier) setUserTier(normalizeTier(profile.user_tier));
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
          userTier,
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

  const isPaidTier = userTier && userTier !== "connected_free";

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

            {isPaidTier ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl border border-emerald-500/50 bg-black text-emerald-400 font-mono shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-[10px] uppercase tracking-wider">
                  {fr ? "✓ PLAN PREMIUM ACTIF" : "✓ PREMIUM ACTIVE"}
                </span>
              </div>
            ) : (
              <div 
                onClick={() => setShowPremiumModal(true)} 
                className="cursor-pointer flex items-center gap-2 px-3 py-1 rounded-xl border border-amber-500/40 bg-zinc-900 text-white shadow-lg hover:border-amber-400 transition-all"
              >
                <span className="text-[9px] bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                  ★ PREMIUM ({PRICES[currency].symbol}{PRICES[currency].amount})
                </span>
              </div>
            )}

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

          {/* SAISIE ANCRÉE EN BAS - ALIGNÉE SUR LES MESSAGES */}
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