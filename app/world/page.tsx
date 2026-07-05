"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import Link from "next/link";

// ── TYPES ─────────────────────────────────────────────────────────────────────
type Stage = "auth" | "language" | "continent" | "allegiance" | "chat";
type Lang  = "fr" | "en" | "zh";
type Continent = "na" | "cn" | "eu";

interface AIMessage {
  continent: Continent;
  round: 1 | 2;
  text: string;
  isFinal: boolean;
  loading: boolean;
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
    chatSend: "Envoyer",
    waiting: "En attente...",
    thinking: "Réflexion en cours...",
    finalVerdict: "Verdict final",
    askAnother: "Nouvelle question",
    change: "Changer",
    exit: "Quitter",
    advancedModel: "Advanced AI Model",
    round: "Tour",
    verdict: "★ VERDICT",
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
    chatSend: "Send",
    waiting: "Waiting...",
    thinking: "Thinking...",
    finalVerdict: "Final verdict",
    askAnother: "New question",
    change: "Change",
    exit: "Exit",
    advancedModel: "Advanced AI Model",
    round: "Round",
    verdict: "★ VERDICT",
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
    chatSend: "发送",
    waiting: "等待中...",
    thinking: "思考中...",
    finalVerdict: "最终裁决",
    askAnother: "新问题",
    change: "更改",
    exit: "退出",
    advancedModel: "Advanced AI Model",
    round: "轮",
    verdict: "★ 裁决",
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

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function WorldPage() {
  const [user, setUser]               = useState<any>(null);
  const [stage, setStage]             = useState<Stage>("auth");
  const [lang, setLang]               = useState<Lang>("fr");
  const [continent, setContinent]     = useState<Continent | null>(null);
  const [hovered, setHovered]         = useState<Continent | null>(null);
  const [question, setQuestion]       = useState("");
  const [messages, setMessages]       = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading]     = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const t = copy[lang];

  // ── Persist stage across tab switches ───────────────────────────────────────
  useEffect(() => {
    const saved = sessionStorage.getItem("world_stage") as Stage | null;
    const savedLang = sessionStorage.getItem("world_lang") as Lang | null;
    const savedContinent = sessionStorage.getItem("world_continent") as Continent | null;
    if (savedLang) setLang(savedLang);
    if (savedContinent) setContinent(savedContinent as Continent);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        // Restore stage only if user is logged in
        if (saved && saved !== "auth") setStage(saved);
        else setStage("language");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
        const s = sessionStorage.getItem("world_stage") as Stage | null;
        setStage(s && s !== "auth" ? s : "language");
      } else {
        setUser(null);
        setStage("auth");
        sessionStorage.removeItem("world_stage");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Persist stage/lang/continent to sessionStorage
  useEffect(() => { sessionStorage.setItem("world_stage", stage); }, [stage]);
  useEffect(() => { sessionStorage.setItem("world_lang", lang); }, [lang]);
  useEffect(() => { if (continent) sessionStorage.setItem("world_continent", continent); }, [continent]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── AUTH ─────────────────────────────────────────────────────────────────────
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

  // ── FLOW ──────────────────────────────────────────────────────────────────────
  const selectLang = (l: Lang) => { setLang(l); setStage("continent"); };
  const selectContinent = (c: Continent) => { setContinent(c); setStage("allegiance"); };
  const confirmAllegiance = () => {
    setStage("chat");
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  // ── AI CALL ───────────────────────────────────────────────────────────────────
  const callContinent = async (
    c: Continent,
    contextSoFar: string,
    isFinal: boolean
  ): Promise<string> => {
    try {
      const res = await fetch("/api/world/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          continent: c,
          lang,
          context: contextSoFar,
          isFinal,
          userId: user?.id,
          maxChars: 300,
        }),
      });
      const data = await res.json();
      return (data.response || data.error || "...").substring(0, 300);
    } catch {
      return lang === "fr" ? "Erreur de connexion." : lang === "en" ? "Connection error." : "连接错误。";
    }
  };

  const handleSubmit = async () => {
    if (!question.trim() || !continent || isLoading) return;
    setIsLoading(true);
    setMessages([]);

    const others = (Object.keys(CONTINENTS) as Continent[]).filter(k => k !== continent);
    const shuffled = others.sort(() => Math.random() - 0.5);
    const order: Continent[] = [...shuffled, continent];

    let contextSoFar = `Question: ${question}\n\n`;

    for (const c of order) {
      const isFinal = c === continent;

      // Round 1 — add loading bubble
      setMessages(prev => [...prev, {
        continent: c, round: 1, text: "", isFinal: false, loading: true,
      }]);

      const text1 = await callContinent(c, contextSoFar, false);
      contextSoFar += `[${CONTINENTS[c].label.en} — round 1]: ${text1}\n\n`;

      setMessages(prev => prev.map(m =>
        m.continent === c && m.round === 1 ? { ...m, text: text1, loading: false } : m
      ));

      await new Promise(r => setTimeout(r, 500));

      // Round 2 — add loading bubble
      setMessages(prev => [...prev, {
        continent: c, round: 2, text: "", isFinal, loading: true,
      }]);

      const text2 = await callContinent(c, contextSoFar, isFinal);
      contextSoFar += `[${CONTINENTS[c].label.en} — round 2${isFinal ? " VERDICT" : ""}]: ${text2}\n\n`;

      setMessages(prev => prev.map(m =>
        m.continent === c && m.round === 2 ? { ...m, text: text2, loading: false } : m
      ));

      await new Promise(r => setTimeout(r, 300));
    }

    setIsLoading(false);
  };

  const handleReset = () => {
    setQuestion("");
    setMessages([]);
    setIsLoading(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: AUTH
  // ══════════════════════════════════════════════════════════════════════════════
  if (stage === "auth") return (
    <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {(["#3b82f6","#ef4444","#10b981"] as const).map((c, i) => (
          <div key={i} className="absolute w-96 h-96 rounded-full opacity-8"
            style={{
              background: `radial-gradient(circle, ${c}, transparent)`,
              filter: "blur(90px)",
              top: i === 0 ? "20%" : i === 1 ? "60%" : "40%",
              left: i === 0 ? "15%" : i === 1 ? "65%" : "40%",
            }} />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌍</div>
          <h1 className="text-3xl font-black text-white tracking-widest font-mono">WORLD</h1>
          <p className="text-zinc-600 text-xs mt-1 font-mono tracking-wider uppercase">Global AI Debate Platform</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-3">
          <div className="text-center mb-4">
            <h2 className="text-white font-bold">{t.authTitle}</h2>
            <p className="text-zinc-500 text-sm mt-0.5">{t.authSub}</p>
          </div>

          <button onClick={handleGoogle} disabled={authLoading}
            className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-cyan-500/40 rounded-xl transition-all duration-200 group disabled:opacity-50">
            <GoogleLogo />
            <span className="text-white text-sm font-medium flex-1 text-left">{t.google}</span>
            <span className="text-zinc-600 group-hover:text-cyan-500 text-xs transition-colors">→</span>
          </button>

          <button onClick={handleMicrosoft} disabled={authLoading}
            className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-cyan-500/40 rounded-xl transition-all duration-200 group disabled:opacity-50">
            <MicrosoftLogo />
            <span className="text-white text-sm font-medium flex-1 text-left">{t.microsoft}</span>
            <span className="text-zinc-600 group-hover:text-cyan-500 text-xs transition-colors">→</span>
          </button>

          <div className="flex gap-2 pt-1">
            <Link href="/account"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-xl transition-all text-xs text-zinc-400 hover:text-white font-medium">
              ✉ {t.email}
            </Link>
            <Link href="/account"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/20 hover:border-cyan-500/50 rounded-xl transition-all text-xs text-cyan-500 font-medium">
              + {t.signup}
            </Link>
          </div>
        </div>
        <p className="text-center text-zinc-800 text-xs mt-5 font-mono">echosai.ca · WORLD v1.0</p>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: LANGUAGE
  // ══════════════════════════════════════════════════════════════════════════════
  if (stage === "language") return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <p className="text-zinc-600 text-xs font-mono uppercase tracking-widest mb-2">🌍 WORLD</p>
        <h2 className="text-white text-2xl font-black tracking-tight">{t.langTitle}</h2>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xl">
        {LANGS.map(({ code, label, sub }) => (
          <button key={code} onClick={() => selectLang(code)}
            className="flex-1 group relative overflow-hidden rounded-2xl border-2 border-zinc-800 hover:border-cyan-500 bg-zinc-950 hover:bg-zinc-900 transition-all duration-300 p-7 text-center"
            onMouseOver={e => (e.currentTarget.style.boxShadow = "0 0 25px rgba(6,182,212,0.12)")}
            onMouseOut={e => (e.currentTarget.style.boxShadow = "none")}
          >
            <div className="text-white text-2xl font-black mb-1">{label}</div>
            <div className="text-zinc-600 text-xs font-mono">{sub}</div>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-cyan-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
          </button>
        ))}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: CONTINENT — 3 immenses boutons plein écran
  // ══════════════════════════════════════════════════════════════════════════════
  if (stage === "continent") return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <div className="shrink-0 text-center pt-6 pb-3">
        <p className="text-zinc-600 text-xs font-mono uppercase tracking-widest mb-1">🌍 WORLD</p>
        <h2 className="text-white text-xl font-black">{t.continentTitle}</h2>
        <p className="text-zinc-700 text-xs mt-1">{t.continentSub}</p>
      </div>

      <div className="flex-1 flex flex-col sm:flex-row min-h-0">
        {(Object.keys(CONTINENTS) as Continent[]).map((key) => {
          const c = CONTINENTS[key];
          const isHov = hovered === key;
          return (
            <button key={key}
              onClick={() => selectContinent(key)}
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered(null)}
              className="flex-1 relative overflow-hidden flex flex-col items-center justify-center transition-all duration-400 outline-none"
              style={{
                border: `2px solid ${isHov ? c.color : "transparent"}`,
                boxShadow: isHov ? `inset 0 0 80px ${c.glow}, 0 0 30px ${c.glow}` : "none",
              }}
            >
              {/* Flag bg */}
              <div className="absolute inset-0 transition-all duration-500"
                style={{
                  backgroundImage: `url(${c.img})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: isHov ? 0.3 : 0.12,
                  filter: isHov ? "saturate(1.1)" : "saturate(0.2) brightness(0.5)",
                }} />
              {/* Scanlines */}
              <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{ background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.15) 2px,rgba(0,0,0,0.15) 4px)" }} />
              {/* Top/bottom glow lines */}
              <div className="absolute inset-x-0 top-0 h-px transition-all duration-300"
                style={{ background: isHov ? c.color : "transparent", boxShadow: isHov ? `0 0 8px ${c.color}` : "none" }} />
              <div className="absolute inset-x-0 bottom-0 h-px transition-all duration-300"
                style={{ background: isHov ? c.color : "transparent", boxShadow: isHov ? `0 0 8px ${c.color}` : "none" }} />

              <div className="relative z-10 text-center px-4">
                <div className="text-7xl sm:text-8xl mb-3 transition-transform duration-300"
                  style={{
                    transform: isHov ? "scale(1.12)" : "scale(1)",
                    filter: isHov ? `drop-shadow(0 0 16px ${c.color})` : "none",
                  }}>
                  {c.flag}
                </div>
                <div className="text-white font-black text-xl sm:text-3xl font-mono tracking-wider uppercase mb-2"
                  style={{ textShadow: isHov ? `0 0 15px ${c.color}` : "none" }}>
                  {c.label[lang]}
                </div>
                <div className="text-xs font-mono uppercase tracking-widest px-3 py-1 rounded-full transition-all duration-300 inline-block"
                  style={{
                    border: `1px solid ${isHov ? c.color : "rgba(255,255,255,0.08)"}`,
                    color: isHov ? c.color : "rgba(255,255,255,0.25)",
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
  // RENDER: ALLEGIANCE
  // ══════════════════════════════════════════════════════════════════════════════
  if (stage === "allegiance" && continent) {
    const c = CONTINENTS[continent];
    return (
      <div className="fixed inset-0 bg-black/92 backdrop-blur-md flex items-center justify-center p-6 z-50">
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${c.img})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.05,
          }} />
        <div className="relative z-10 w-full max-w-md text-center">
          <div className="text-8xl mb-5" style={{ filter: `drop-shadow(0 0 25px ${c.color})` }}>
            {c.flag}
          </div>
          <span className="text-xs font-mono uppercase tracking-widest px-3 py-1 rounded-full border inline-block mb-4"
            style={{ color: c.color, borderColor: c.color, boxShadow: `0 0 8px ${c.glow}` }}>
            {c.label[lang]}
          </span>
          <h2 className="text-white text-3xl font-black font-mono uppercase tracking-wide mb-1">
            {t.allegianceTitle}
          </h2>
          <p className="text-zinc-500 text-sm mb-6">{t.allegianceSub}</p>

          <div className="bg-zinc-950 border rounded-2xl p-5 mb-5"
            style={{ borderColor: `${c.color}60`, boxShadow: `0 0 30px ${c.glow}` }}>
            <p className="text-zinc-300 text-sm leading-relaxed">
              {t.allegianceDesc(c.label[lang])}
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStage("continent")}
              className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all text-sm font-medium">
              {t.change}
            </button>
            <button onClick={confirmAllegiance}
              className="flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wider text-white transition-all duration-200"
              style={{ background: c.color, boxShadow: `0 0 15px ${c.glow}` }}
              onMouseOver={e => (e.currentTarget.style.boxShadow = `0 0 30px ${c.glow}`)}
              onMouseOut={e => (e.currentTarget.style.boxShadow = `0 0 15px ${c.glow}`)}
            >
              {t.allegianceConfirm}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: CHAT — flux vertical, tous les pays sur la même page
  // ══════════════════════════════════════════════════════════════════════════════
  const myC = continent ? CONTINENTS[continent] : null;

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      {/* Topbar */}
      <div className="shrink-0 border-b border-zinc-900 px-5 py-2.5 flex items-center justify-between bg-zinc-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <span className="text-white font-black font-mono">🌍 WORLD</span>
          {myC && (
            <span className="text-xs font-mono px-2 py-0.5 rounded-full border"
              style={{ color: myC.color, borderColor: `${myC.color}60` }}>
              {myC.flag} {myC.label[lang]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
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

      {/* Messages — flux vertical */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <div className="flex gap-3 justify-center text-3xl">
                {(Object.keys(CONTINENTS) as Continent[]).map(k => (
                  <span key={k} style={{ filter: k === continent ? `drop-shadow(0 0 8px ${CONTINENTS[k].color})` : "none" }}>
                    {CONTINENTS[k].flag}
                  </span>
                ))}
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
          return (
            <div key={idx}
              className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ justifyContent: "flex-start" }}
            >
              {/* Avatar */}
              <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm border"
                style={{
                  background: `${c.color}15`,
                  borderColor: `${c.color}40`,
                  boxShadow: isMine ? `0 0 8px ${c.glow}` : "none",
                }}>
                {c.flag}
              </div>

              {/* Bubble */}
              <div className="flex-1 max-w-2xl">
                {/* Header */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold uppercase" style={{ color: c.color }}>
                    {c.label[lang]}
                  </span>
                  <span className="text-zinc-700 text-xs font-mono">
                    [{t.round} {msg.round}]
                  </span>
                  {msg.isFinal && !msg.loading && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${c.color}20`, color: c.color }}>
                      {t.verdict}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed"
                  style={{
                    background: msg.isFinal && !msg.loading
                      ? `${c.color}12`
                      : "rgba(255,255,255,0.03)",
                    border: `1px solid ${msg.isFinal && !msg.loading ? `${c.color}40` : "rgba(255,255,255,0.06)"}`,
                    color: "#e4e4e7",
                    boxShadow: msg.isFinal && !msg.loading ? `0 0 20px ${c.glow}` : "none",
                  }}>
                  {msg.loading ? (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[0,1,2].map(i => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{ background: c.color, animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                      <span className="text-xs font-mono" style={{ color: c.color }}>{t.thinking}</span>
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-zinc-900 bg-zinc-950/90 backdrop-blur-sm p-3">
        {messages.length > 0 && !isLoading ? (
          <div className="text-center">
            <button onClick={handleReset}
              className="px-5 py-2 rounded-xl border border-zinc-700 hover:border-cyan-500/40 text-zinc-400 hover:text-white text-sm font-medium transition-all">
              {t.askAnother}
            </button>
          </div>
        ) : (
          <div className="flex gap-2 max-w-3xl mx-auto">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={e => setQuestion(e.target.value.slice(0, 500))}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder={t.chatPlaceholder}
              rows={2}
              disabled={isLoading}
              className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-cyan-500/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 resize-none outline-none transition-colors disabled:opacity-50"
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
        )}
      </div>
    </div>
  );
}