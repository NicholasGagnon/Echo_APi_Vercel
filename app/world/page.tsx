"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../../context/AppContext";
import Link from "next/link";

// ── TYPES ────────────────────────────────────────────────────────────────────
type Stage = "auth" | "language" | "continent" | "allegiance" | "chat";
type Lang  = "fr" | "en" | "zh";
type Continent = "na" | "cn" | "eu";

// ── AUTH ICONS (copié du account.tsx) ────────────────────────────────────────
const MicrosoftLogo = () => (
  <svg className="w-6 h-6" viewBox="0 0 23 23" fill="none">
    <path d="M0 0H11V11H0V0Z" fill="#F25022"/>
    <path d="M12 0H23V11H12V0Z" fill="#7FBA00"/>
    <path d="M0 12H11V23H0V12Z" fill="#00A4EF"/>
    <path d="M12 12H23V23H12V12Z" fill="#FFB900"/>
  </svg>
);

const GoogleLogo = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 2.18 2.18 4.94l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

// ── COPY ─────────────────────────────────────────────────────────────────────
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
    continentSub: "Votre continent répondra en dernier — son verdict clôt le débat.",
    allegianceTitle: "Choisissez votre allégeance",
    allegianceSub: "pour ta question au monde entier",
    allegianceConfirm: "Confirmer mon allégeance",
    chatPlaceholder: "Posez votre question au monde...",
    chatSend: "Envoyer",
    waiting: "En attente...",
    finalVerdict: "Verdict final",
    askAnother: "Nouvelle question",
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
    chatPlaceholder: "Ask your question to the world...",
    chatSend: "Send",
    waiting: "Waiting...",
    finalVerdict: "Final verdict",
    askAnother: "New question",
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
    chatPlaceholder: "向世界提出您的问题...",
    chatSend: "发送",
    waiting: "等待中...",
    finalVerdict: "最终裁决",
    askAnother: "新问题",
  },
};

// ── CONTINENT CONFIG ──────────────────────────────────────────────────────────
const CONTINENTS: Record<Continent, { label: Record<Lang, string>; img: string; color: string; glow: string }> = {
  na: {
    label: { fr: "Amérique du Nord", en: "North America", zh: "北美洲" },
    img: "/usa.png",
    color: "#3b82f6",
    glow: "rgba(59,130,246,0.5)",
  },
  cn: {
    label: { fr: "Chine", en: "China", zh: "中国" },
    img: "/chinoix.png",
    color: "#ef4444",
    glow: "rgba(239,68,68,0.5)",
  },
  eu: {
    label: { fr: "Europe", en: "Europe", zh: "欧洲" },
    img: "/france.png",
    color: "#10b981",
    glow: "rgba(16,185,129,0.5)",
  },
};

const LANGS: { code: Lang; label: string; sub: string }[] = [
  { code: "fr", label: "Français", sub: "France · Québec · Afrique" },
  { code: "en", label: "English",  sub: "USA · UK · Australia" },
  { code: "zh", label: "中文",     sub: "中国 · 台湾 · 新加坡" },
];

// ── CASCADE CONFIG (séquentiel, continent choisi en dernier) ─────────────────
// Les modèles sont appelés depuis l'API backend /api/world/conversation
// NA:  grok-4-fast-non-reasoning → gemini-3.1-flash-lite → gpt-4o-mini
// CN:  deepseek-v4-flash → GLM-4.5-Air
// EU:  mistral/mistral-small-latest → mistralai/mistral-small-2603 → mistral/mistral-small-2603

// ── RESPONSE TYPE ─────────────────────────────────────────────────────────────
interface AIResponse {
  continent: Continent;
  text: string;
  model: string;
  isFinal: boolean;
  loading: boolean;
}

// ── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────
export default function WorldPage() {
  const { lang: appLang } = useApp?.() ?? { lang: "fr" };

  const [user, setUser]                     = useState<any>(null);
  const [stage, setStage]                   = useState<Stage>("auth");
  const [lang, setLang]                     = useState<Lang>("fr");
  const [continent, setContinent]           = useState<Continent | null>(null);
  const [hoveredContinent, setHoveredContinent] = useState<Continent | null>(null);
  const [question, setQuestion]             = useState("");
  const [responses, setResponses]           = useState<AIResponse[]>([]);
  const [isLoading, setIsLoading]           = useState(false);
  const [authLoading, setAuthLoading]       = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const t = copy[lang];

  // ── AUTH CHECK ──────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setStage("language");
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
        setStage("language");
      } else {
        setUser(null);
        setStage("auth");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── AUTH HANDLERS ───────────────────────────────────────────────────────────
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

  // ── CONTINENT SELECTION ─────────────────────────────────────────────────────
  const handleContinentClick = (c: Continent) => {
    setContinent(c);
    setStage("allegiance");
  };

  const handleAllegianceConfirm = () => {
    setStage("chat");
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  // ── AI CALL ─────────────────────────────────────────────────────────────────
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
      return "Erreur de connexion.";
    }
  };

  const handleSubmit = async () => {
    if (!question.trim() || !continent || isLoading) return;
    setIsLoading(true);

    // Ordre aléatoire — continent choisi TOUJOURS en dernier
    const others = (Object.keys(CONTINENTS) as Continent[]).filter(k => k !== continent);
    const shuffled = others.sort(() => Math.random() - 0.5);
    const order: Continent[] = [...shuffled, continent];

    // Init toutes les réponses en loading
    setResponses(order.map(c => ({
      continent: c,
      text: "",
      model: "",
      isFinal: c === continent,
      loading: true,
    })));

    let contextSoFar = `Question: ${question}\n\n`;

    for (let i = 0; i < order.length; i++) {
      const c = order[i];
      const isFinal = c === continent;

      // Première réponse du continent
      const text1 = await callContinent(c, contextSoFar, false);
      contextSoFar += `[${CONTINENTS[c].label.en} — response 1]: ${text1}\n\n`;

      setResponses(prev => prev.map(r =>
        r.continent === c ? { ...r, text: text1, loading: false } : r
      ));

      // Deuxième réponse — visible après un délai
      await new Promise(res => setTimeout(res, 600));
      const text2 = await callContinent(c, contextSoFar, isFinal);
      contextSoFar += `[${CONTINENTS[c].label.en} — response 2${isFinal ? " (FINAL VERDICT)" : ""}]: ${text2}\n\n`;

      setResponses(prev => prev.map(r =>
        r.continent === c ? { ...r, text: r.text + "\n\n" + text2 } : r
      ));
    }

    setIsLoading(false);
  };

  // ── RESET ───────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setQuestion("");
    setResponses([]);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // ── RENDER: AUTH ────────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  if (stage === "auth") return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent)", filter: "blur(80px)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #ef4444, transparent)", filter: "blur(80px)" }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full opacity-10 -translate-x-1/2 -translate-y-1/2"
          style={{ background: "radial-gradient(circle, #10b981, transparent)", filter: "blur(80px)" }} />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🌍</div>
          <h1 className="text-4xl font-black text-white tracking-widest font-mono uppercase">WORLD</h1>
          <p className="text-zinc-500 text-xs mt-2 font-mono tracking-wider uppercase">Global AI Debate Platform</p>
        </div>

        {/* Auth card */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-white font-bold text-lg">{t.authTitle}</h2>
            <p className="text-zinc-500 text-sm mt-1">{t.authSub}</p>
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={authLoading}
            className="w-full flex items-center gap-4 px-5 py-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-cyan-500/50 rounded-xl transition-all duration-200 group">
            <GoogleLogo />
            <span className="text-white text-sm font-medium flex-1 text-left">{t.google}</span>
            <span className="text-zinc-600 group-hover:text-cyan-500 text-xs">→</span>
          </button>

          {/* Microsoft */}
          <button onClick={handleMicrosoft} disabled={authLoading}
            className="w-full flex items-center gap-4 px-5 py-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-cyan-500/50 rounded-xl transition-all duration-200 group">
            <MicrosoftLogo />
            <span className="text-white text-sm font-medium flex-1 text-left">{t.microsoft}</span>
            <span className="text-zinc-600 group-hover:text-cyan-500 text-xs">→</span>
          </button>

          <div className="flex gap-3">
            {/* Email sign in */}
            <Link href="/account" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-cyan-500/50 rounded-xl transition-all text-sm text-zinc-300 font-medium">
              ✉ {t.email}
            </Link>
            {/* Sign up */}
            <Link href="/account" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/30 hover:border-cyan-500/60 rounded-xl transition-all text-sm text-cyan-400 font-medium">
              + {t.signup}
            </Link>
          </div>
        </div>

        <p className="text-center text-zinc-700 text-xs mt-6 font-mono">echosai.ca · WORLD v1.0</p>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // ── RENDER: LANGUAGE ────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  if (stage === "language") return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-3">🌍 WORLD</p>
        <h2 className="text-white text-3xl font-black tracking-tight">{t.langTitle}</h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
        {LANGS.map(({ code, label, sub }) => (
          <button key={code} onClick={() => { setLang(code); setStage("continent"); }}
            className="flex-1 group relative overflow-hidden rounded-2xl border-2 border-zinc-800 hover:border-cyan-500 bg-zinc-950 hover:bg-zinc-900 transition-all duration-300 p-8 text-center"
            style={{ boxShadow: "none" }}
            onMouseOver={e => (e.currentTarget.style.boxShadow = "0 0 30px rgba(6,182,212,0.15)")}
            onMouseOut={e => (e.currentTarget.style.boxShadow = "none")}
          >
            <div className="text-white text-3xl font-black mb-2">{label}</div>
            <div className="text-zinc-500 text-xs font-mono">{sub}</div>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-cyan-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
          </button>
        ))}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // ── RENDER: CONTINENT (3 immenses boutons plein écran) ──────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  if (stage === "continent") return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="shrink-0 text-center pt-8 pb-4 z-10">
        <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-1">🌍 WORLD</p>
        <h2 className="text-white text-2xl font-black tracking-tight">{t.continentTitle}</h2>
        <p className="text-zinc-600 text-xs mt-1 max-w-sm mx-auto">{t.continentSub}</p>
      </div>

      {/* 3 immenses boutons */}
      <div className="flex-1 flex flex-col sm:flex-row min-h-0">
        {(Object.keys(CONTINENTS) as Continent[]).map((key) => {
          const c = CONTINENTS[key];
          const isHovered = hoveredContinent === key;
          return (
            <button
              key={key}
              onClick={() => handleContinentClick(key)}
              onMouseEnter={() => setHoveredContinent(key)}
              onMouseLeave={() => setHoveredContinent(null)}
              className="flex-1 relative overflow-hidden flex flex-col items-center justify-center transition-all duration-500 group"
              style={{
                border: `2px solid ${isHovered ? c.color : "transparent"}`,
                boxShadow: isHovered ? `inset 0 0 60px ${c.glow}, 0 0 40px ${c.glow}` : "none",
                outline: "none",
              }}
            >
              {/* Background flag image */}
              <div className="absolute inset-0 transition-all duration-500"
                style={{
                  backgroundImage: `url(${c.img})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: isHovered ? 0.35 : 0.15,
                  filter: isHovered ? "saturate(1.2)" : "saturate(0.3) brightness(0.6)",
                }} />

              {/* Scanline overlay */}
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)",
                  opacity: 0.3,
                }} />

              {/* Cyan top/bottom border accent on hover */}
              <div className="absolute inset-x-0 top-0 h-0.5 transition-all duration-300"
                style={{ background: isHovered ? c.color : "transparent", boxShadow: isHovered ? `0 0 12px ${c.color}` : "none" }} />
              <div className="absolute inset-x-0 bottom-0 h-0.5 transition-all duration-300"
                style={{ background: isHovered ? c.color : "transparent", boxShadow: isHovered ? `0 0 12px ${c.color}` : "none" }} />

              {/* Content */}
              <div className="relative z-10 text-center px-6">
                <div className="text-6xl sm:text-8xl mb-4 transition-transform duration-300"
                  style={{ transform: isHovered ? "scale(1.15)" : "scale(1)", filter: isHovered ? `drop-shadow(0 0 20px ${c.color})` : "none" }}>
                  {key === "na" ? "🇺🇸" : key === "cn" ? "🇨🇳" : "🇪🇺"}
                </div>
                <div className="text-white font-black text-2xl sm:text-4xl font-mono tracking-wider uppercase"
                  style={{ textShadow: isHovered ? `0 0 20px ${c.color}` : "none" }}>
                  {c.label[lang]}
                </div>
                <div className="mt-3 px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-widest transition-all duration-300"
                  style={{
                    border: `1px solid ${isHovered ? c.color : "rgba(255,255,255,0.1)"}`,
                    color: isHovered ? c.color : "rgba(255,255,255,0.3)",
                    boxShadow: isHovered ? `0 0 10px ${c.glow}` : "none",
                  }}>
                  {key === "na" ? "3 AI Models" : key === "cn" ? "2 AI Models" : "3 AI Models"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // ── RENDER: ALLEGIANCE (pop-up confirmation) ─────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  if (stage === "allegiance" && continent) {
    const c = CONTINENTS[continent];
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-50">
        {/* Background continent image subtile */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${c.img})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.06,
            filter: "saturate(0.4)",
          }} />

        <div className="relative z-10 w-full max-w-lg text-center">
          {/* Flag big */}
          <div className="text-8xl mb-6"
            style={{ filter: `drop-shadow(0 0 30px ${c.color})` }}>
            {continent === "na" ? "🇺🇸" : continent === "cn" ? "🇨🇳" : "🇪🇺"}
          </div>

          <div className="mb-2">
            <span className="text-xs font-mono uppercase tracking-widest px-3 py-1 rounded-full border"
              style={{ color: c.color, borderColor: c.color, boxShadow: `0 0 10px ${c.glow}` }}>
              {c.label[lang]}
            </span>
          </div>

          <h2 className="text-white text-4xl font-black mt-4 mb-2 font-mono uppercase tracking-wider">
            {t.allegianceTitle}
          </h2>
          <p className="text-zinc-400 text-sm mb-8">{t.allegianceSub}</p>

          <div className="bg-zinc-950 border rounded-2xl p-6 mb-6"
            style={{ borderColor: c.color, boxShadow: `0 0 40px ${c.glow}` }}>
            <p className="text-zinc-300 text-sm leading-relaxed">
              {lang === "fr" && `Vous représentez l'${c.label.fr}. Les autres continents parleront en premier — votre région aura le dernier mot.`}
              {lang === "en" && `You represent ${c.label.en}. The other continents speak first — your region gets the final word.`}
              {lang === "zh" && `您代表${c.label.zh}。其他大陆先发言——您的地区拥有最终决定权。`}
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStage("continent")}
              className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all text-sm font-medium">
              {lang === "fr" ? "Changer" : lang === "en" ? "Change" : "更改"}
            </button>
            <button onClick={handleAllegianceConfirm}
              className="flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200"
              style={{
                background: c.color,
                color: "white",
                boxShadow: `0 0 20px ${c.glow}`,
              }}
              onMouseOver={e => (e.currentTarget.style.boxShadow = `0 0 35px ${c.glow}`)}
              onMouseOut={e => (e.currentTarget.style.boxShadow = `0 0 20px ${c.glow}`)}
            >
              {t.allegianceConfirm}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ── RENDER: CHAT (3 colonnes, 6 réponses en direct) ─────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  const myContinent = continent ? CONTINENTS[continent] : null;

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      {/* Topbar */}
      <div className="shrink-0 border-b border-zinc-900 px-6 py-3 flex items-center justify-between bg-zinc-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-white font-black font-mono text-lg">🌍 WORLD</span>
          {continent && (
            <span className="text-xs font-mono px-2 py-0.5 rounded-full border"
              style={{ color: myContinent?.color, borderColor: myContinent?.color }}>
              {continent === "na" ? "🇺🇸" : continent === "cn" ? "🇨🇳" : "🇪🇺"} {myContinent?.label[lang]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setStage("continent"); setResponses([]); setQuestion(""); }}
            className="text-zinc-600 hover:text-zinc-300 text-xs font-mono transition-colors">
            {lang === "fr" ? "Changer" : lang === "en" ? "Change" : "更改"}
          </button>
          <button onClick={() => { supabase.auth.signOut(); setStage("auth"); }}
            className="text-zinc-700 hover:text-red-500 text-xs font-mono transition-colors">
            ⏏ {lang === "fr" ? "Quitter" : lang === "en" ? "Exit" : "退出"}
          </button>
        </div>
      </div>

      {/* 3 colonnes */}
      <div className="flex-1 grid grid-cols-3 min-h-0 divide-x divide-zinc-900 overflow-hidden">
        {(Object.keys(CONTINENTS) as Continent[]).map((key) => {
          const c = CONTINENTS[key];
          const resp = responses.find(r => r.continent === key);
          const isMine = key === continent;

          return (
            <div key={key} className="flex flex-col overflow-hidden relative"
              style={{ borderTop: isMine ? `2px solid ${c.color}` : "2px solid transparent" }}>
              {/* Column header */}
              <div className="shrink-0 px-4 py-3 border-b border-zinc-900 flex items-center gap-2"
                style={{ background: isMine ? `${c.color}08` : "transparent" }}>
                <span className="text-xl">{key === "na" ? "🇺🇸" : key === "cn" ? "🇨🇳" : "🇪🇺"}</span>
                <span className="text-white text-xs font-mono font-bold uppercase tracking-wider">{c.label[lang]}</span>
                {isMine && (
                  <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full"
                    style={{ background: `${c.color}20`, color: c.color }}>
                    {t.finalVerdict}
                  </span>
                )}
              </div>

              {/* Response area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {!resp && !isLoading && (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-zinc-700 text-xs font-mono text-center">
                      {lang === "fr" ? "En attente de la question..." : lang === "en" ? "Waiting for question..." : "等待问题..."}
                    </p>
                  </div>
                )}
                {!resp && isLoading && (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl mb-2 animate-pulse">{key === "na" ? "🇺🇸" : key === "cn" ? "🇨🇳" : "🇪🇺"}</div>
                      <p className="text-xs font-mono" style={{ color: c.color }}>{t.waiting}</p>
                    </div>
                  </div>
                )}
                {resp && (
                  <div className="space-y-3">
                    {resp.text.split("\n\n").filter(Boolean).map((chunk, i) => (
                      <div key={i} className="rounded-xl p-3 text-sm leading-relaxed"
                        style={{
                          background: i === 1 && isMine ? `${c.color}10` : "rgba(255,255,255,0.03)",
                          border: i === 1 && isMine ? `1px solid ${c.color}40` : "1px solid rgba(255,255,255,0.05)",
                          color: "#e4e4e7",
                        }}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-xs font-mono" style={{ color: c.color }}>
                            [{i === 0 ? "1" : "2"}]
                          </span>
                          {i === 1 && isMine && (
                            <span className="text-xs font-mono font-bold" style={{ color: c.color }}>★ VERDICT</span>
                          )}
                        </div>
                        {chunk}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Question input */}
      <div className="shrink-0 border-t border-zinc-900 bg-zinc-950/90 backdrop-blur-sm p-4">
        {responses.length === 0 ? (
          <div className="flex gap-3 max-w-4xl mx-auto">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={e => setQuestion(e.target.value.slice(0, 500))}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder={t.chatPlaceholder}
              rows={2}
              className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 resize-none outline-none transition-colors font-sans"
            />
            <button
              onClick={handleSubmit}
              disabled={!question.trim() || isLoading}
              className="px-6 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 disabled:opacity-30"
              style={{
                background: myContinent?.color || "#06b6d4",
                color: "white",
                boxShadow: `0 0 15px ${myContinent?.glow || "rgba(6,182,212,0.4)"}`,
              }}
            >
              {isLoading ? "..." : t.chatSend}
            </button>
          </div>
        ) : (
          <div className="text-center">
            <button onClick={handleReset} disabled={isLoading}
              className="px-6 py-2.5 rounded-xl border border-zinc-700 hover:border-cyan-500/50 text-zinc-400 hover:text-white text-sm font-medium transition-all disabled:opacity-30">
              {t.askAnother}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}