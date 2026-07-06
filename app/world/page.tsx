"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import Link from "next/link";


// ── TYPES ─────────────────────────────────────────────────────────────────────
type Stage = "language" | "auth" | "continent" | "allegiance" | "chat";
type Lang  = "fr" | "en" | "zh";
type Continent = "na" | "cn" | "eu";

interface AIMessage {
  continent: Continent;
  round: 1 | 2;
  text: string;
  isFinal: boolean;
  loading: boolean;
}

interface DebateSession {
  id: string;
  question: string;
  continent: Continent;
  lang: Lang;
  messages: AIMessage[];
  created_at: string;
}

// ── LOGOS ─────────────────────────────────────────────────────────────────────
const MicrosoftLogo = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 23 23" fill="none">
    <path d="M0 0H11V11H0V0Z" fill="#F25022"/>
    <path d="M12 0H23V11H12V0Z" fill="#7FBA00"/>
    <path d="M0 12H11V23H0V12Z" fill="#00A4EF"/>
    <path d="M12 12H23V23H12V12Z" fill="#FFB900"/>
  </svg>
);

const GoogleLogo = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 2.18 2.18 4.94l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

// ── SLOGAN PAR LANGUE ─────────────────────────────────────────────────────────
const SLOGANS: Record<Lang, { main: string; sub: string }> = {
  fr: {
    main: "3 Empires. 1 Question. Alliance ou Chaos ?",
    sub:  "Trois civilisations. Une seule vérité à trouver.",
  },
  en: {
    main: "3 Empires. 1 Question. Alliance or Chaos?",
    sub:  "Three civilizations. One truth to uncover.",
  },
  zh: {
    main: "3个帝国。1个问题。联盟还是混沌？",
    sub:  "三大文明。一个真理待揭晓。",
  },
};

// ── MANTRAS PAR CONTINENT ─────────────────────────────────────────────────────
const MANTRAS: Record<Continent, Record<Lang, string>> = {
  na: {
    fr: "Do. Ship. Iterate. Agis.",
    en: "Do. Ship. Iterate. Act.",
    zh: "行动。发布。迭代。去做。",
  },
  cn: {
    fr: "La constance dépasse le talent. Persévère.",
    en: "Consistency beats talent. Persevere.",
    zh: "持之以恒胜过天赋。坚持。",
  },
  eu: {
    fr: "Comprendre avant d'agir. Réfléchis.",
    en: "Understand before acting. Think.",
    zh: "行动前先理解。深思。",
  },
};

// ── COPY ──────────────────────────────────────────────────────────────────────
const copy = {
  fr: {
    authTitle: "Connexion requise",
    authSub: "Accède au débat mondial",
    google: "Continuer avec Google",
    microsoft: "Continuer avec Microsoft",
    email: "Connexion par courriel",
    signup: "Créer un compte",
    langTitle: "Choisissez votre langue",
    continentTitle: "Choisissez votre continent",
    continentSub: "Votre continent répond en dernier — son verdict clôt le débat.",
    allegianceTitle: "Choisissez votre allégeance",
    allegianceSub: "pour ta question au monde entier",
    allegianceConfirm: "Confirmer mon allégeance",
    allegianceDesc: (name: string) => `Vous représentez ${name}. Les autres continents parlent en premier — votre région a le dernier mot.`,
    chatPlaceholder: "Posez votre question au monde...",
    pseudoPlaceholder: "Votre pseudo (ex: NicholasG)",
    chatSend: "Envoyer",
    thinking: "Réflexion en cours...",
    finalVerdict: "Verdict final",
    change: "Changer",
    exit: "Quitter",
    advancedModel: "Advanced AI Model",
    round: "Tour",
    verdict: "★ VERDICT",
    enterPseudo: "Choisissez un pseudo pour entrer dans l'arène",
    confirm: "Entrer dans l'arène",
  },
  en: {
    authTitle: "Sign in required",
    authSub: "Access the global debate",
    google: "Continue with Google",
    microsoft: "Continue with Microsoft",
    email: "Sign in with email",
    signup: "Create account",
    langTitle: "Choose your language",
    continentTitle: "Choose your continent",
    continentSub: "Your continent responds last — its verdict closes the debate.",
    allegianceTitle: "Choose your allegiance",
    allegianceSub: "for your question to the entire world",
    allegianceConfirm: "Confirm my allegiance",
    allegianceDesc: (name: string) => `You represent ${name}. The other continents speak first — your region gets the final word.`,
    chatPlaceholder: "Ask your question to the world...",
    pseudoPlaceholder: "Your handle (e.g. NicholasG)",
    chatSend: "Send",
    thinking: "Thinking...",
    finalVerdict: "Final verdict",
    change: "Change",
    exit: "Exit",
    advancedModel: "Advanced AI Model",
    round: "Round",
    verdict: "★ VERDICT",
    enterPseudo: "Choose a handle to enter the arena",
    confirm: "Enter the arena",
  },
  zh: {
    authTitle: "需要登录",
    authSub: "进入全球辩论",
    google: "使用 Google 继续",
    microsoft: "使用 Microsoft 继续",
    email: "邮件登录",
    signup: "创建账户",
    langTitle: "选择您的语言",
    continentTitle: "选择您的大陆",
    continentSub: "您的大陆最后回应——其裁决将结束辩论。",
    allegianceTitle: "选择您的阵营",
    allegianceSub: "向全世界提出您的问题",
    allegianceConfirm: "确认我的阵营",
    allegianceDesc: (name: string) => `您代表${name}。其他大陆先发言——您的地区拥有最终决定权。`,
    chatPlaceholder: "向世界提出您的问题...",
    pseudoPlaceholder: "您的昵称（例如 NicholasG）",
    chatSend: "发送",
    thinking: "思考中...",
    finalVerdict: "最终裁决",
    change: "更改",
    exit: "退出",
    advancedModel: "Advanced AI Model",
    round: "轮",
    verdict: "★ 裁决",
    enterPseudo: "选择昵称进入竞技场",
    confirm: "进入竞技场",
  },
};

// ── CONTINENTS ────────────────────────────────────────────────────────────────
const CONTINENTS: Record<Continent, {
  label: Record<Lang, string>;
  flag: string;
  img: string;
  color: string;
  glow: string;
}> = {
  na: {
    label: { fr: "Amérique du Nord", en: "North America", zh: "北美洲" },
    flag: "🇺🇸",
    img: "/usa.png",
    color: "#3b82f6",
    glow: "rgba(59,130,246,0.45)",
  },
  cn: {
    label: { fr: "Chine", en: "China", zh: "中国" },
    flag: "🇨🇳",
    img: "/chinoix.png",
    color: "#ef4444",
    glow: "rgba(239,68,68,0.45)",
  },
  eu: {
    label: { fr: "Europe", en: "Europe", zh: "欧洲" },
    flag: "🇪🇺",
    img: "/france.png",
    color: "#10b981",
    glow: "rgba(16,185,129,0.45)",
  },
};

const LANGS = [
  { code: "fr" as Lang, label: "Français", sub: "France · Québec · Afrique" },
  { code: "en" as Lang, label: "English",  sub: "USA · UK · Australia" },
  { code: "zh" as Lang, label: "中文",     sub: "中国 · 台湾 · 新加坡" },
];

// ── BACKGROUND DRAPEAUX — visible sur toutes les pages ───────────────────────
const FlagBackground = ({ stage, continent }: { stage: Stage; continent: Continent | null }) => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    {(Object.keys(CONTINENTS) as Continent[]).map((key, i) => {
      const c = CONTINENTS[key];
      const isActive = continent === key;
      const positions = [
        { top: "0", left: "0", width: "33.33%" },
        { top: "0", left: "33.33%", width: "33.33%" },
        { top: "0", left: "66.66%", width: "33.34%" },
      ];
      const pos = positions[i];
      // Sur langue et auth — tous les 3 drapeaux égaux, subtils mais visibles
      const isLangOrAuth = stage === "language" || stage === "auth";
      return (
        <div key={key} className="absolute h-full transition-all duration-700"
          style={{
            ...pos,
            backgroundImage: `url(${c.img})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: isLangOrAuth ? 0.32 : isActive ? 0.15 : stage === "chat" ? 0.05 : 0.08,
            filter: isLangOrAuth
              ? "saturate(0.8) brightness(0.55)"
              : isActive
                ? "saturate(0.6) brightness(0.4)"
                : "saturate(0.15) brightness(0.3)",
          }} />
      );
    })}
    {/* Overlay gradient pour lisibilité */}
    <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/55" />
  </div>
);

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function WorldPage() {
  const [user, setUser]               = useState<any>(null);
  const [stage, setStage]             = useState<Stage>("language");
  const [lang, setLang]               = useState<Lang>("fr");
  const [continent, setContinent]     = useState<Continent | null>(null);
  const [hovered, setHovered]         = useState<Continent | null>(null);
  const [pseudo, setPseudo]           = useState("");
  const [question, setQuestion]       = useState("");
  const [messages, setMessages]       = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading]     = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [sessions, setSessions]       = useState<DebateSession[]>([]);
  // ── QUOTA ────────────────────────────────────────────────────────────────────
  const [worldAvailable, setWorldAvailable] = useState(3);
  const [worldMax, setWorldMax]             = useState(3);
  const [worldTier, setWorldTier]           = useState<"free"|"premium">("free");
  const [showQuotaPopup, setShowQuotaPopup] = useState(false);
  const [nextRegenIn, setNextRegenIn]       = useState(0);
  const [currency, setCurrency]             = useState("CAD");
  // ── DEVISE ───────────────────────────────────────────────────────────────────
  const CURRENCIES = ["CAD","USD","EUR","CNY"];
  const PRICES: Record<string, {amount:string;symbol:string}> = {
    CAD: { amount:"9.99",  symbol:"CA$" },
    USD: { amount:"7.99",  symbol:"US$" },
    EUR: { amount:"7.49",  symbol:"€"   },
    CNY: { amount:"59.00", symbol:"¥"   },
  };
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pseudoRef   = useRef<HTMLInputElement>(null);

  const t = copy[lang];

  // ── Persist ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const savedLang      = sessionStorage.getItem("world_lang")      as Lang | null;
    const savedContinent = sessionStorage.getItem("world_continent")  as Continent | null;
    const savedStage     = sessionStorage.getItem("world_stage")      as Stage | null;
    const savedPseudo    = sessionStorage.getItem("world_pseudo")     || "";
    if (savedLang)      setLang(savedLang);
    if (savedContinent) setContinent(savedContinent as Continent);
    if (savedPseudo)    setPseudo(savedPseudo);

    try {
      const saved = localStorage.getItem("world_sessions");
      if (saved) setSessions(JSON.parse(saved));
    } catch {}

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        // Charger pseudo depuis Supabase
        const { data: ps } = await supabase.from("world_pseudos")
          .select("pseudo").eq("user_id", session.user.id).maybeSingle();
        if (ps?.pseudo) { setPseudo(ps.pseudo); sessionStorage.setItem("world_pseudo", ps.pseudo); }
        // Charger quota
        await loadWorldQuotaState(session.user.id);
        if (savedStage && savedStage !== "auth" && savedStage !== "language") {
          setStage(savedStage);
        } else {
          setStage("continent");
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
        const s = sessionStorage.getItem("world_stage") as Stage | null;
        // Après OAuth redirect — si on était sur auth, aller au continent
        setStage(s && s !== "auth" && s !== "language" ? s : "continent");
      } else {
        setUser(null);
        setStage("language");
        sessionStorage.removeItem("world_stage");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { sessionStorage.setItem("world_stage", stage); }, [stage]);
  useEffect(() => { sessionStorage.setItem("world_lang", lang); }, [lang]);
  useEffect(() => { if (continent) sessionStorage.setItem("world_continent", continent); }, [continent]);
  useEffect(() => { sessionStorage.setItem("world_pseudo", pseudo); }, [pseudo]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Auth ──────────────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setAuthLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/world` },
    });
  };

  const handleMicrosoft = async () => {
    setAuthLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: { redirectTo: `${window.location.origin}/world`, scopes: "openid profile email" },
    });
  };

  // ── Quota helpers ─────────────────────────────────────────────────────────────
  const loadWorldQuotaState = async (uid: string) => {
    try {
      const { data } = await supabase.from("world_quotas")
        .select("*").eq("user_id", uid).maybeSingle();
      if (data) {
        const tier = (data.tier || "free") as "free"|"premium";
        setWorldTier(tier);
        const max = tier === "premium" ? 400 : 3;
        setWorldMax(max);
        if (tier === "free") {
          const now = Date.now();
          const elapsed = now - new Date(data.last_regen).getTime();
          const recovered = Math.floor(elapsed / 3600000);
          const available = Math.min(3, (data.available || 0) + recovered);
          setWorldAvailable(available);
        } else {
          setWorldAvailable(data.available || 400);
        }
      }
    } catch {}
  };

  const consumeWorldQuota = async (): Promise<boolean> => {
    if (!user) return false;
    if (worldTier === "premium") {
      const newVal = Math.max(0, worldAvailable - 1);
      setWorldAvailable(newVal);
      await supabase.from("world_quotas").upsert({
        user_id: user.id, available: newVal, tier: "premium",
        last_regen: new Date().toISOString(), cycle_start: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      return true;
    }
    // Free — vérifier le stock + regen
    const { data } = await supabase.from("world_quotas")
      .select("*").eq("user_id", user.id).maybeSingle();
    const now = Date.now();
    let available = 0;
    let lastRegen = now;
    if (data) {
      const elapsed = now - new Date(data.last_regen).getTime();
      const recovered = Math.floor(elapsed / 3600000);
      available = Math.min(3, (data.available || 0) + recovered);
      lastRegen = recovered > 0 ? now : new Date(data.last_regen).getTime();
    } else {
      available = 3; // première fois
    }
    if (available < 1) {
      // Calculer temps restant
      const elapsed = now - lastRegen;
      setNextRegenIn(3600000 - (elapsed % 3600000));
      setShowQuotaPopup(true);
      return false;
    }
    const newVal = available - 1;
    setWorldAvailable(newVal);
    await supabase.from("world_quotas").upsert({
      user_id: user.id, available: newVal, tier: "free",
      last_regen: new Date(lastRegen).toISOString(),
      cycle_start: data?.cycle_start || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    return true;
  };

  const formatRegen = (ms: number) => {
    const m = Math.ceil(ms / 60000);
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (lang === "fr") return h > 0 ? `${h}h ${min}min` : `${min} min`;
    if (lang === "zh") return h > 0 ? `${h}小时${min}分钟` : `${min}分钟`;
    return h > 0 ? `${h}h ${min}min` : `${min} min`;
  };

  // ── Flow ──────────────────────────────────────────────────────────────────────
  const selectLang = (l: Lang) => {
    setLang(l);
    setStage(user ? "continent" : "auth");
  };

  const selectContinent = (c: Continent) => { setContinent(c); setStage("allegiance"); };

  const confirmAllegiance = async () => {
    // Sauvegarder pseudo dans Supabase
    if (user && pseudo.trim()) {
      await supabase.from("world_pseudos").upsert({
        user_id: user.id, pseudo: pseudo.trim(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    }
    setStage("chat");
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  // ── Save session ──────────────────────────────────────────────────────────────
  const saveSession = async (q: string, msgs: AIMessage[]) => {
    if (!continent || !user) return;
    const session: DebateSession = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      question: q, continent, lang,
      messages: msgs.filter(m => !m.loading),
      created_at: new Date().toISOString(),
    };
    setSessions(prev => {
      const updated = [session, ...prev].slice(0, 50);
      try { localStorage.setItem("world_sessions", JSON.stringify(updated)); } catch {}
      return updated;
    });
    try {
      await supabase.from("world_debates").insert({
        id: session.id, user_id: user.id, question: session.question,
        continent: session.continent, lang: session.lang,
        messages: session.messages, created_at: session.created_at,
      });
    } catch (e) { console.warn("[WORLD] Supabase save error:", e); }
  };

  // ── AI Call ───────────────────────────────────────────────────────────────────
  const callContinent = async (c: Continent, contextSoFar: string, isFinal: boolean, round: 1 | 2): Promise<string> => {
    try {
      const res = await fetch("/api/world/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question, continent: c, lang, context: contextSoFar,
          isFinal, round, userId: user?.id, maxChars: 672,
        }),
      });
      const data = await res.json();
      return (data.response || data.error || "...").substring(0, 672);
    } catch {
      return lang === "fr" ? "Erreur de connexion." : lang === "en" ? "Connection error." : "连接错误。";
    }
  };

  const handleSubmit = async () => {
    if (!question.trim() || !continent || isLoading) return;
    const allowed = await consumeWorldQuota();
    if (!allowed) return;
    setIsLoading(true);
    const currentQuestion = question;
    setQuestion("");

    setMessages(prev => prev.length > 0 ? [...prev, {
      continent: "na" as Continent, round: 1,
      text: `── ${currentQuestion} ──`, isFinal: false, loading: false,
    }] : prev);

    const others = (Object.keys(CONTINENTS) as Continent[]).filter(k => k !== continent);
    const [first, second] = others.sort(() => Math.random() - 0.5);
    const sequence: { c: Continent; round: 1 | 2; isFinal: boolean }[] = [
      { c: first,     round: 1, isFinal: false },
      { c: second,    round: 1, isFinal: false },
      { c: continent, round: 1, isFinal: false },
      { c: first,     round: 2, isFinal: false },
      { c: second,    round: 2, isFinal: false },
      { c: continent, round: 2, isFinal: true  },
    ];

    let contextSoFar = `Question: ${currentQuestion}\n\n`;

    for (const step of sequence) {
      const { c, round, isFinal } = step;
      setMessages(prev => [...prev, { continent: c, round, text: "", isFinal, loading: true }]);
      const text = await callContinent(c, contextSoFar, isFinal, round);
      contextSoFar += `[${CONTINENTS[c].label.en} — round ${round}${isFinal ? " VERDICT" : ""}]: ${text}\n\n`;
      setMessages(prev => {
        const idx = [...prev].reverse().findIndex(m => m.continent === c && m.round === round && m.loading);
        if (idx === -1) return prev;
        const realIdx = prev.length - 1 - idx;
        return prev.map((m, i) => i === realIdx ? { ...m, text, loading: false } : m);
      });
      await new Promise(r => setTimeout(r, 350));
    }

    setMessages(prev => {
      const completedMsgs = prev.filter(m => !m.loading);
      const sepIdx = completedMsgs.findLastIndex(m => m.text.startsWith("──"));
      const sessionMsgs = completedMsgs.slice(sepIdx + 1);
      saveSession(currentQuestion, sessionMsgs);
      return prev;
    });
    setIsLoading(false);
  };

  // ── Shared: background flags always visible ───────────────────────────────────
  const myC = continent ? CONTINENTS[continent] : null;

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: LANGUAGE — première page, slogan magistral
  // ══════════════════════════════════════════════════════════════════════════════
  if (stage === "language") return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      <FlagBackground stage="language" continent={null} />

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 gap-10">
        {/* Logo Echo + WORLD */}
        <div className="flex items-center gap-3">
          <img src="/echo2.png" alt="Echo" className="w-8 h-8 rounded-lg object-contain" />
          <span className="text-white font-black font-mono text-xl tracking-widest">WORLD</span>
        </div>

        {/* Slogan magistral */}
        <div className="text-center max-w-3xl">
          <h1 className="font-black text-white tracking-tight leading-none mb-4"
            style={{
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              textShadow: "0 0 60px rgba(255,255,255,0.15), 0 0 120px rgba(255,255,255,0.05)",
              letterSpacing: "-0.02em",
            }}>
            {SLOGANS[lang].main}
          </h1>
          <p className="text-zinc-500 text-sm font-mono tracking-widest uppercase">
            {SLOGANS[lang].sub}
          </p>
        </div>

        {/* 3 mantras */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
          {(Object.keys(CONTINENTS) as Continent[]).map(key => {
            const c = CONTINENTS[key];
            return (
              <div key={key} className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ border: `1px solid ${c.color}25`, background: `${c.color}08` }}>
                <div className="shrink-0 overflow-hidden rounded" style={{ width: 32, height: 21, border: `1px solid ${c.color}40` }}>
                  <img src={c.img} alt={c.label[lang]} className="w-full h-full object-cover" />
                </div>
                <p className="text-xs font-mono" style={{ color: c.color }}>
                  {MANTRAS[key][lang]}
                </p>
              </div>
            );
          })}
        </div>

        {/* Sélecteur langue */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xl">
          {LANGS.map(({ code, label, sub }) => (
            <button key={code} onClick={() => selectLang(code)}
              className="flex-1 group relative overflow-hidden rounded-2xl border-2 border-zinc-800 hover:border-cyan-500 bg-black/60 hover:bg-zinc-900/80 backdrop-blur-sm transition-all duration-300 p-6 text-center"
              onMouseOver={e => (e.currentTarget.style.boxShadow = "0 0 25px rgba(6,182,212,0.15)")}
              onMouseOut={e => (e.currentTarget.style.boxShadow = "none")}
            >
              <div className="text-white text-xl font-black mb-1">{label}</div>
              <div className="text-zinc-600 text-xs font-mono">{sub}</div>
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-cyan-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            </button>
          ))}
        </div>

        <p className="text-zinc-800 text-xs font-mono">echosai.ca · WORLD v1.0</p>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: AUTH
  // ══════════════════════════════════════════════════════════════════════════════
  if (stage === "auth") return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      <FlagBackground stage={stage} continent={continent} />

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 gap-6">
        {/* Slogan en arrière-plan haut */}
        <div className="text-center mb-2">
          <p className="font-black text-white/20 tracking-tight"
            style={{ fontSize: "clamp(1rem, 2.5vw, 1.5rem)" }}>
            {SLOGANS[lang].main}
          </p>
        </div>

        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src="/echo2.png" alt="Echo" className="w-7 h-7 rounded-lg object-contain" />
            <span className="text-white font-black font-mono text-lg tracking-widest">WORLD</span>
          </div>

          <div className="bg-black/70 border border-zinc-800 rounded-2xl p-6 space-y-3 backdrop-blur-md">
            <div className="text-center mb-4">
              <h2 className="text-white font-bold">{t.authTitle}</h2>
              <p className="text-zinc-500 text-sm mt-0.5">{t.authSub}</p>
            </div>

            <button onClick={handleGoogle} disabled={authLoading}
              className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 hover:border-cyan-500/40 rounded-xl transition-all duration-200 group disabled:opacity-50">
              <GoogleLogo />
              <span className="text-white text-sm font-medium flex-1 text-left">{t.google}</span>
              <span className="text-zinc-600 group-hover:text-cyan-500 text-xs transition-colors">→</span>
            </button>

            <button onClick={handleMicrosoft} disabled={authLoading}
              className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 hover:border-cyan-500/40 rounded-xl transition-all duration-200 group disabled:opacity-50">
              <MicrosoftLogo />
              <span className="text-white text-sm font-medium flex-1 text-left">{t.microsoft}</span>
              <span className="text-zinc-600 group-hover:text-cyan-500 text-xs transition-colors">→</span>
            </button>

            <div className="flex gap-2 pt-1">
              <Link href="/account"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-xl transition-all text-xs text-zinc-400 hover:text-white font-medium">
                ✉ {t.email}
              </Link>
              <Link href="/account"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/20 hover:border-cyan-500/50 rounded-xl transition-all text-xs text-cyan-500 font-medium">
                + {t.signup}
              </Link>
            </div>
          </div>

          <button onClick={() => setStage("language")}
            className="w-full mt-3 text-zinc-700 hover:text-zinc-400 text-xs font-mono transition-colors text-center">
            ← {t.change}
          </button>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: CONTINENT — 3 immenses boutons + slogan flottant
  // ══════════════════════════════════════════════════════════════════════════════
  if (stage === "continent") return (
    <div className="fixed inset-0 bg-black flex flex-col">

      {/* Slogan flottant PAR-DESSUS les drapeaux — disparaît au hover */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-start pt-8 pointer-events-none transition-opacity duration-500"
        style={{ opacity: hovered ? 0 : 1 }}>
        <div className="flex items-center gap-2 mb-3">
          <img src="/echo2.png" alt="Echo" className="w-6 h-6 rounded object-contain opacity-60" />
          <span className="text-zinc-500 text-xs font-mono uppercase tracking-widest">WORLD</span>
        </div>
        {/* Slogan — chaque segment avec le drapeau de son continent clipé dans les lettres */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-6 mb-2"
          style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.8rem)" }}>
          {/* "3 Empires." — drapeau USA */}
          <span className="font-black"
            style={{
              backgroundImage: "url(/usa.png)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              color: "transparent",
              filter: "drop-shadow(0 0 12px rgba(59,130,246,0.8)) brightness(1.4) saturate(1.5)",
            }}>
            {lang === "fr" ? "3 Empires." : lang === "en" ? "3 Empires." : "3个帝国。"}
          </span>
          {/* "1 Question." — drapeau Chine */}
          <span className="font-black"
            style={{
              backgroundImage: "url(/chinoix.png)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              color: "transparent",
              filter: "drop-shadow(0 0 12px rgba(239,68,68,0.8)) brightness(1.4) saturate(1.5)",
            }}>
            {lang === "fr" ? "1 Question." : lang === "en" ? "1 Question." : "1个问题。"}
          </span>
          {/* "Alliance ou Chaos ?" — drapeau Europe */}
          <span className="font-black"
            style={{
              backgroundImage: "url(/france.png)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              color: "transparent",
              filter: "drop-shadow(0 0 12px rgba(16,185,129,0.8)) brightness(1.4) saturate(1.5)",
            }}>
            {lang === "fr" ? "Alliance ou Chaos ?" : lang === "en" ? "Alliance or Chaos?" : "联盟还是混沌？"}
          </span>
        </div>
        <p className="text-white font-black text-center px-6 mt-1"
          style={{
            fontSize: "clamp(1rem, 2vw, 1.4rem)",
            textShadow: "0 0 20px rgba(255,255,255,0.15), 0 2px 10px rgba(0,0,0,0.9)",
            opacity: 0.7,
          }}>
          {t.continentTitle}
        </p>
        <p className="text-zinc-500 text-xs mt-2 font-mono">{t.continentSub}</p>
      </div>

      {/* 3 immenses boutons plein écran — drapeau en background comme avant */}
      <div className="relative z-10 flex flex-col sm:flex-row" style={{ height: "100%" }}>
        {(Object.keys(CONTINENTS) as Continent[]).map((key) => {
          const c = CONTINENTS[key];
          const isHov = hovered === key;
          return (
            <button key={key}
              onClick={() => selectContinent(key)}
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered(null)}
              className="flex-1 relative overflow-hidden flex flex-col items-center justify-center transition-all duration-500 outline-none"
              style={{
                border: `2px solid ${isHov ? c.color : "transparent"}`,
                boxShadow: isHov ? `inset 0 0 80px ${c.glow}, 0 0 40px ${c.glow}` : "none",
              }}
            >
              {/* Drapeau en fond plein — LA MAGIE */}
              <div className="absolute inset-0 transition-all duration-500"
                style={{
                  backgroundImage: `url(${c.img})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: isHov ? 0.35 : 0.12,
                  filter: isHov ? "saturate(1.1)" : "saturate(0.2) brightness(0.5)",
                }} />
              {/* Scanlines */}
              <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{ background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.15) 2px,rgba(0,0,0,0.15) 4px)" }} />
              {/* Lignes colorées top/bottom */}
              <div className="absolute inset-x-0 top-0 h-px transition-all duration-300"
                style={{ background: isHov ? c.color : "transparent", boxShadow: isHov ? `0 0 8px ${c.color}` : "none" }} />
              <div className="absolute inset-x-0 bottom-0 h-px transition-all duration-300"
                style={{ background: isHov ? c.color : "transparent", boxShadow: isHov ? `0 0 8px ${c.color}` : "none" }} />

              <div className="relative z-10 text-center px-4">
                {/* Drapeau miniature au centre */}
                <div className="mx-auto mb-4 overflow-hidden transition-all duration-300"
                  style={{
                    width: isHov ? 110 : 80, height: isHov ? 72 : 52,
                    borderRadius: "8px",
                    border: `2px solid ${isHov ? c.color : c.color + "50"}`,
                    boxShadow: isHov ? `0 0 25px ${c.glow}` : "none",
                  }}>
                  <img src={c.img} alt={c.label[lang]} className="w-full h-full object-cover" />
                </div>
                <div className="text-white font-black text-2xl sm:text-4xl font-mono tracking-wider uppercase"
                  style={{ textShadow: isHov ? `0 0 20px ${c.color}` : "none" }}>
                  {c.label[lang]}
                </div>
                <p className="text-xs font-mono italic mt-2 mb-3 transition-all duration-300"
                  style={{ color: isHov ? c.color : "rgba(255,255,255,0.15)" }}>
                  {MANTRAS[key][lang]}
                </p>
                <div className="text-xs font-mono uppercase tracking-widest px-3 py-1 rounded-full inline-block transition-all duration-300"
                  style={{
                    border: `1px solid ${isHov ? c.color : "rgba(255,255,255,0.08)"}`,
                    color: isHov ? c.color : "rgba(255,255,255,0.2)",
                  }}>
                  {t.advancedModel}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: ALLEGIANCE + PSEUDO
  // ══════════════════════════════════════════════════════════════════════════════
  if (stage === "allegiance" && continent) {
    const c = CONTINENTS[continent];
    return (
      <div className="fixed inset-0 bg-black/92 backdrop-blur-md flex items-center justify-center p-6 z-50">
        <FlagBackground stage={stage} continent={continent} />

        <div className="relative z-10 w-full max-w-md text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/echo2.png" alt="Echo" className="w-6 h-6 rounded object-contain opacity-70" />
            <span className="text-zinc-600 text-xs font-mono uppercase tracking-widest">WORLD</span>
          </div>

          {/* Drapeau grand */}
          <div className="mx-auto mb-4 overflow-hidden rounded-xl"
            style={{ width: 120, height: 78, border: `2px solid ${c.color}`, boxShadow: `0 0 30px ${c.glow}` }}>
            <img src={c.img} alt={c.label[lang]} className="w-full h-full object-cover" />
          </div>

          <span className="text-xs font-mono uppercase tracking-widest px-3 py-1 rounded-full border inline-block mb-3"
            style={{ color: c.color, borderColor: c.color, boxShadow: `0 0 8px ${c.glow}` }}>
            {c.label[lang]}
          </span>

          <h2 className="text-white text-2xl font-black font-mono uppercase tracking-wide mb-1">
            {t.allegianceTitle}
          </h2>
          <p className="text-zinc-500 text-sm mb-5">{t.allegianceSub}</p>

          <div className="bg-black/80 border rounded-2xl p-5 mb-4 text-left"
            style={{ borderColor: `${c.color}60`, boxShadow: `0 0 30px ${c.glow}` }}>
            <p className="text-zinc-300 text-sm leading-relaxed mb-4">
              {t.allegianceDesc(c.label[lang])}
            </p>
            {/* Pseudo */}
            <label className="text-xs font-mono uppercase tracking-wider mb-1.5 block" style={{ color: c.color }}>
              {t.enterPseudo}
            </label>
            <input
              ref={pseudoRef}
              type="text"
              value={pseudo}
              onChange={e => setPseudo(e.target.value.slice(0, 20))}
              onKeyDown={e => { if (e.key === "Enter" && pseudo.trim()) confirmAllegiance(); }}
              placeholder={t.pseudoPlaceholder}
              className="w-full bg-zinc-900/80 border rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors"
              style={{ borderColor: `${c.color}40` }}
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStage("continent")}
              className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all text-sm font-medium">
              {t.change}
            </button>
            <button
              onClick={confirmAllegiance}
              disabled={!pseudo.trim()}
              className="flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wider text-white transition-all disabled:opacity-30"
              style={{ background: c.color, boxShadow: `0 0 15px ${c.glow}` }}
            >
              {t.confirm}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: CHAT
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      <FlagBackground stage={stage} continent={continent} />

      {/* Topbar */}
      <div className="relative z-10 shrink-0 border-b border-zinc-900/80 px-5 py-2.5 flex items-center justify-between bg-black/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <img src="/echo2.png" alt="Echo" className="w-6 h-6 rounded object-contain" />
          <span className="text-white font-black font-mono">WORLD</span>
          {myC && (
            <div className="flex items-center gap-2">
              <div className="overflow-hidden rounded shrink-0" style={{ width: 28, height: 18, border: `1px solid ${myC.color}60` }}>
                <img src={myC.img} alt={myC.label[lang]} className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full border"
                style={{ color: myC.color, borderColor: `${myC.color}60` }}>
                {pseudo || myC.label[lang]}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Quota indicator */}
          {worldTier === "free" && (
            <span className="text-xs font-mono" style={{ color: worldAvailable === 0 ? "#ef4444" : "#52525b" }}>
              {worldAvailable}/{worldMax}
            </span>
          )}
          {/* Bouton PREMIUM */}
          {worldTier === "free" && (
            <button onClick={() => setShowQuotaPopup(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all"
              style={{
                background: "linear-gradient(135deg, #f59e0b20, #ef444420)",
                border: "1px solid #f59e0b50",
                color: "#f59e0b",
              }}>
              ★ Premium
            </button>
          )}
          {worldTier === "premium" && (
            <span className="text-xs font-mono px-2 py-0.5 rounded-lg"
              style={{ background: "#f59e0b15", color: "#f59e0b", border: "1px solid #f59e0b40" }}>
              ★ Premium
            </span>
          )}
          {/* Devise */}
          <select value={currency} onChange={e => setCurrency(e.target.value)}
            className="bg-transparent text-zinc-600 text-xs font-mono border-0 outline-none cursor-pointer hover:text-zinc-300 transition-colors">
            {CURRENCIES.map(c => <option key={c} value={c} className="bg-zinc-950">{c}</option>)}
          </select>
          {/* Sélecteur langue */}
          <div className="flex items-center gap-0.5 bg-zinc-900/80 border border-zinc-800 rounded-lg px-1 py-0.5">
            {(["fr","en","zh"] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className="px-2 py-0.5 rounded text-xs font-mono transition-all"
                style={{
                  background: lang === l ? (myC?.color || "#06b6d4") + "25" : "transparent",
                  color: lang === l ? (myC?.color || "#06b6d4") : "#52525b",
                  fontWeight: lang === l ? 700 : 400,
                }}>
                {l === "fr" ? "FR" : l === "en" ? "EN" : "中"}
              </button>
            ))}
          </div>
          {/* Changer pseudo */}
          <button onClick={() => setStage("allegiance")}
            className="text-zinc-600 hover:text-zinc-300 text-xs font-mono transition-colors">
            {lang === "fr" ? "Pseudo" : lang === "en" ? "Handle" : "昵称"}
          </button>
          <button onClick={() => setStage("continent")}
            className="text-zinc-600 hover:text-zinc-300 text-xs font-mono transition-colors">
            {t.change}
          </button>
          <button onClick={() => { supabase.auth.signOut(); }}
            className="text-zinc-700 hover:text-red-500 text-xs font-mono transition-colors">
            ⏏ {t.exit}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 py-4 space-y-1">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-6">
              {/* Slogan flottant dans le chat aussi */}
              <p className="font-black text-white/10 tracking-tight"
                style={{ fontSize: "clamp(1.2rem, 3vw, 2rem)" }}>
                {SLOGANS[lang].main}
              </p>
              <div className="flex gap-6 justify-center items-end">
                {(Object.keys(CONTINENTS) as Continent[]).map(k => {
                  const cc = CONTINENTS[k];
                  const isMe = k === continent;
                  return (
                    <div key={k} className="flex flex-col items-center gap-2">
                      <div className="overflow-hidden transition-all duration-300"
                        style={{
                          width: isMe ? 80 : 56, height: isMe ? 52 : 36,
                          borderRadius: "6px",
                          border: `2px solid ${isMe ? cc.color : cc.color + "30"}`,
                          boxShadow: isMe ? `0 0 16px ${cc.glow}` : "none",
                        }}>
                        <img src={cc.img} alt={cc.label[lang]} className="w-full h-full object-cover"
                          style={{ filter: isMe ? "saturate(1.2)" : "saturate(0.3) brightness(0.5)" }} />
                      </div>
                      <span className="text-xs font-mono"
                        style={{ color: isMe ? cc.color : "#3f3f46", fontSize: "10px" }}>
                        {cc.label[lang]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-zinc-700 text-xs font-mono">
                {lang === "fr" ? "Posez votre question pour lancer le débat" : lang === "en" ? "Ask a question to start the debate" : "提问以开始辩论"}
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const c = CONTINENTS[msg.continent];
          const isMine = msg.continent === continent;
          const isSep = msg.text.startsWith("──");

          // Séparateur entre débats
          if (isSep) return (
            <div key={idx} className="flex items-center gap-3 py-4">
              <div className="flex-1 h-px bg-zinc-900" />
              <span className="text-zinc-700 text-xs font-mono px-2">{msg.text}</span>
              <div className="flex-1 h-px bg-zinc-900" />
            </div>
          );

          const order = messages
            .filter((m, i) => i <= idx && !m.text.startsWith("──"))
            .reduce<Continent[]>((acc, m) => acc.includes(m.continent) ? acc : [...acc, m.continent], []);
          const posIdx = order.indexOf(msg.continent);
          const isLeft   = posIdx === 0;
          const isRight  = posIdx === 1;

          return (
            <div key={idx}
              className="animate-in fade-in slide-in-from-bottom-1 duration-400 w-full py-1"
              style={{
                paddingLeft:  isLeft   ? "0"   : isRight ? "25%" : "12%",
                paddingRight: isRight  ? "0"   : isLeft  ? "25%" : "12%",
              }}
            >
              <div className="py-2.5"
                style={{
                  borderLeft: isMine && msg.isFinal
                    ? `3px solid ${c.color}`
                    : `1px solid ${c.color}20`,
                  paddingLeft: "14px",
                }}>
                <div className="flex items-center gap-2 mb-1.5">
                  {/* Miniature drapeau */}
                  <div className="shrink-0 overflow-hidden"
                    style={{
                      width: 38, height: 25, borderRadius: "4px",
                      border: `1px solid ${c.color}`,
                      boxShadow: isMine ? `0 0 6px ${c.glow}` : "none",
                    }}>
                    <img src={c.img} alt={c.label[lang]} className="w-full h-full object-cover"
                      style={{ filter: "saturate(1.1) brightness(0.9)" }} />
                  </div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: c.color }}>
                    {c.label[lang]}
                  </span>
                  <span className="text-zinc-800 text-xs font-mono">· {msg.round}</span>
                  {/* Signature discrète — toujours visible */}
                  <span className="font-mono" style={{ color: c.color, opacity: 0.65, fontSize: "9px", letterSpacing: "0.04em" }}>
                    🛰️ {msg.continent === "cn" ? "Real AI · China" : msg.continent === "na" ? "Real AI · North America" : "Real AI · Europe"}
                  </span>
                  {msg.isFinal && !msg.loading && (
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${c.color}20`, color: c.color }}>
                      {t.verdict}
                    </span>
                  )}
                </div>

                {msg.loading ? (
                  <div className="flex items-center gap-2 py-0.5">
                    <span className="text-xs animate-pulse" style={{ opacity: 0.4 }}>🛰️</span>
                    <span className="font-mono"
                      style={{ color: c.color, opacity: 0.45, fontSize: "10px", letterSpacing: "0.05em" }}>
                      {msg.continent === "cn"
                        ? "Real AI models from China. Connection established."
                        : msg.continent === "na"
                        ? "Real AI models from North America. Connection established."
                        : "Real AI models from Europe. Connection established."}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed"
                    style={{
                      color: msg.isFinal ? "#f4f4f5" : "#a1a1aa",
                      fontWeight: msg.isFinal ? 500 : 400,
                      textShadow: msg.isFinal ? `0 0 30px ${c.glow}` : "none",
                    }}>
                    {msg.text}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── POP-UP QUOTA ATTEINT ── */}
      {showQuotaPopup && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
          onClick={() => setShowQuotaPopup(false)}>
          <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-center shadow-2xl"
            onClick={e => e.stopPropagation()}>
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <img src="/echo2.png" alt="Echo" className="w-5 h-5 rounded object-contain opacity-70" />
              <span className="text-zinc-500 text-xs font-mono uppercase tracking-widest">WORLD</span>
            </div>

            {worldAvailable === 0 ? (
              <>
                <div className="text-3xl mb-3">⏳</div>
                <h3 className="text-white font-black text-lg mb-1">
                  {lang === "fr" ? "Limite atteinte" : lang === "en" ? "Limit reached" : "已达上限"}
                </h3>
                <p className="text-zinc-400 text-sm mb-4">
                  {lang === "fr"
                    ? `Reviens dans ${formatRegen(nextRegenIn)} pour une question de plus.`
                    : lang === "en"
                    ? `Come back in ${formatRegen(nextRegenIn)} for another question.`
                    : `${formatRegen(nextRegenIn)}后再回来提问。`}
                </p>
              </>
            ) : (
              <>
                <div className="text-3xl mb-3">★</div>
                <h3 className="text-white font-black text-lg mb-1">World Premium</h3>
                <p className="text-zinc-400 text-sm mb-4">
                  {lang === "fr" ? "400 questions par mois. Illimité." : lang === "en" ? "400 questions per month. Unlimited." : "每月400个问题。无限制。"}
                </p>
              </>
            )}

            {/* Prix */}
            <div className="bg-zinc-900 rounded-xl p-4 mb-4">
              <div className="text-2xl font-black text-white mb-0.5">
                {PRICES[currency].symbol}{PRICES[currency].amount}
                <span className="text-sm font-normal text-zinc-500">
                  {lang === "fr" ? "/mois" : lang === "en" ? "/month" : "/月"}
                </span>
              </div>
              <p className="text-zinc-600 text-xs">
                {lang === "fr" ? "400 questions · Annulation à tout moment" : lang === "en" ? "400 questions · Cancel anytime" : "400次提问 · 随时取消"}
              </p>
            </div>

            <button
              onClick={async () => {
                if (!user) return;
                const res = await fetch("/api/stripe/create-checkout", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    plan: "world",
                    currency,
                    userId: user.id,
                    userEmail: user.email,
                  }),
                });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
              }}
              className="w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider text-black transition-all mb-2"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                boxShadow: "0 0 20px rgba(245,158,11,0.3)",
              }}>
              {lang === "fr" ? "Passer à Premium →" : lang === "en" ? "Go Premium →" : "升级Premium →"}
            </button>

            <button onClick={() => setShowQuotaPopup(false)}
              className="w-full py-2 text-zinc-700 hover:text-zinc-400 text-xs font-mono transition-colors">
              {lang === "fr" ? "Fermer" : lang === "en" ? "Close" : "关闭"}
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="relative z-10 shrink-0 border-t border-zinc-900/80 bg-black/60 backdrop-blur-sm p-3">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <textarea
            ref={textareaRef}
            value={question}
            onChange={e => setQuestion(e.target.value.slice(0, 500))}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            placeholder={t.chatPlaceholder}
            rows={2}
            disabled={isLoading}
            className="flex-1 bg-zinc-900/60 border border-zinc-800 focus:border-cyan-500/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 resize-none outline-none transition-colors disabled:opacity-50 backdrop-blur-sm"
          />
          <button
            onClick={handleSubmit}
            disabled={!question.trim() || isLoading}
            className="px-5 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all disabled:opacity-30"
            style={{
              background: myC?.color || "#06b6d4",
              boxShadow: isLoading ? "none" : `0 0 12px ${myC?.glow || "rgba(6,182,212,0.4)"}`,
            }}
          >
            {isLoading ? "..." : t.chatSend}
          </button>
        </div>
      </div>
    </div>
  );
}