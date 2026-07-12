"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

// ── TYPES ─────────────────────────────────────────────────────────────────────
type Stage = "language" | "auth" | "continent" | "allegiance" | "chat";
type Lang  = "fr" | "en" | "zh";
type Continent = "na" | "cn" | "eu";

interface AIMessage {
  continent: Continent;
  round: number;
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

// ── SLOGANS REPROGRAMMÉS POUR CHAIN ──────────────────────────────────────────
const SLOGANS: Record<Lang, { main: string; sub: string }> = {
  fr: {
    main: "15 IA en Cascade. 1 Idée. Évolution Absolue.",
    sub:  "Bienvenue sur Chain. Ici vous faites auditionner votre projet. Les IA le visitent en temps réel et protègent son évolution.",
  },
  en: {
    main: "15 Cascaded AIs. 1 Idea. Pure Optimization.",
    sub:  "Welcome to Chain. Submit your concept for audit. AIs inspect your layout in real time and safeguard its evolution.",
  },
  zh: {
    main: "15个级联AI。1个想法。绝对演化。",
    sub:  "欢迎来到 Chain。在这里审计您的项目。AI实时访问并保护其演化。",
  },
};

const PALIER_CONFIG: Record<Continent, {
  label: Record<Lang, string>;
  subtitle: Record<Lang, string>;
  icon: string;
  color: string;
  glow: string;
  bgGrad: string;
}> = {
  na: {
    label: { fr: "Synapse Alpha", en: "Synapse Alpha", zh: "阿尔法突触" },
    subtitle: { fr: "Modèles éclaireurs · Impulsion initiale brute", en: "Scout models · Initial raw spark", zh: "初级模型 · 原始灵感触发" },
    icon: "🧠",
    color: "#06b6d4",
    glow: "rgba(6,182,212,0.45)",
    bgGrad: "from-cyan-950/40 via-black to-zinc-950",
  },
  cn: {
    label: { fr: "Matrix Compute", en: "Matrix Compute", zh: "矩阵计算" },
    subtitle: { fr: "Modèles architectes · Logique & Structuration", en: "Architect models · Logic & Restructuring", zh: "中级模型 · 架构与逻辑重组" },
    icon: "⚡",
    color: "#d946ef",
    glow: "rgba(217,70,239,0.45)",
    bgGrad: "from-purple-950/40 via-black to-zinc-950",
  },
  eu: {
    label: { fr: "Quantum Core", en: "Quantum Core", zh: "量子核心" },
    subtitle: { fr: "Modèles de raisonnement · Raffinement suprême", en: "Reasoning models · Ultimate refinement", zh: "高级模型 · 终极优化与精雕" },
    icon: "🔮",
    color: "#10b981",
    glow: "rgba(16,185,129,0.45)",
    bgGrad: "from-emerald-950/40 via-black to-zinc-950",
  },
};

const LANGS = [
  { code: "fr" as Lang, label: "Français", sub: "Calcul · Évolution · Réseau" },
  { code: "en" as Lang, label: "English",  sub: "Cascade · Stream · Quantum" },
  { code: "zh" as Lang, label: "中文",      sub: "序列 · 矩阵 · 深度优化" },
];

const copy = {
  fr: {
    authTitle: "Vérification d'accès requise",
    authSub: "Connectez votre terminal au réseau Chain",
    langTitle: "Sélectionnez le décodeur linguistique",
    continentTitle: "Sélectionnez votre Palier d'Ancrage",
    continentSub: "Déterminez à quelle étape de la ruche votre conscience valide la cascade.",
    allegianceTitle: "Configurez vos identifiants réseau",
    allegianceSub: "votre signature sur l'évolution",
    allegianceConfirm: "Injecter mes paramètres",
    allegianceDesc: (name: string) => `Ancrage connecté sur [${name}]. Vous allez observer la pensée s'affiner et se propager en temps réel à travers les 15 couches de calcul.`,
    chatPlaceholder: "Soumettez l'idée de votre projet pour lancer l'audition...",
    pseudoPlaceholder: "Indicatif de l'opérateur (ex: NicholasG)",
    chatSend: "Inoculer",
    thinking: "Calcul synaptique...",
    finalVerdict: "ADN stabilisé",
    change: "Ajuster",
    exit: "Déconnexion",
    advancedModel: "Cascade Multi-Agents",
    round: "Étape",
    enterPseudo: "Entrez un indicatif opérateur pour vous connecter au Brainscan",
    confirm: "Coupler au réseau",
  },
  en: {
    authTitle: "Access Authentication Required",
    authSub: "Connect your terminal to the Chain grid",
    langTitle: "Choose language decoder",
    continentTitle: "Select your Anchoring Tier",
    continentSub: "Determine at which step of the hive mind your signal confirms the cascade.",
    allegianceTitle: "Configure network credentials",
    allegianceSub: "your signature on evolution",
    allegianceConfirm: "Inject parameters",
    allegianceDesc: (name: string) => `You are now anchored on [${name}]. Watch your concept adapt and refine across 15 real-time iterations.`,
    chatPlaceholder: "Submit your project concept to trigger the audition...",
    pseudoPlaceholder: "Operator callsign (e.g., NicholasG)",
    chatSend: "Inoculate",
    thinking: "Synaptic indexing...",
    finalVerdict: "DNA Stabilized",
    change: "Adjust",
    exit: "Disconnect",
    advancedModel: "Multi-Agent Cascade",
    round: "Step",
    enterPseudo: "Enter an operator handle to mount the Brainscan grid",
    confirm: "Link to Grid",
  },
  zh: {
    authTitle: "需要身份验证",
    authSub: "将您的终端连接 to Chain 网络",
    langTitle: "选择语言解码器",
    continentTitle: "选择您的锚定层级",
    continentSub: "确定您的信号在蜂巢思维的哪一步确认级联。",
    allegianceTitle: "配置网络凭证",
    allegianceSub: "您在演化上的签名",
    allegianceConfirm: "注入参数",
    allegianceDesc: (name: string) => `已锚定在 [${name}]。您将目睹想法在15个计算层中实时演化和优化。`,
    chatPlaceholder: "提交您的项目构想以启动审计...",
    pseudoPlaceholder: "操作员呼号（如 NicholasG）",
    chatSend: "注入",
    thinking: "突触计算中...",
    finalVerdict: "DNA 已稳定",
    change: "调整",
    exit: "断开连接",
    advancedModel: "多智能体级联",
    round: "步骤",
    enterPseudo: "输入操作员呼号以挂载脑部扫描网格",
    confirm: "连接 to 网格",
  },
};

const MatrixBackground = ({ continent }: { continent: Continent | null }) => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-zinc-950">
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
      style={{ backgroundImage: "radial-gradient(circle, #fff 10%, transparent 11%)", backgroundSize: "16px 16px" }} />
    <div className="absolute inset-0 transition-opacity duration-1000 opacity-20 flex items-center justify-center">
      <div className="w-[150%] h-[150%] rounded-full bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.12)_0%,transparent_60%)] animate-pulse" />
    </div>
    {continent && (
      <div className="absolute inset-0 transition-all duration-700"
        style={{
          boxShadow: `inset 0 0 120px ${PALIER_CONFIG[continent].glow}`,
          background: `radial-gradient(circle at 50% 30%, ${PALIER_CONFIG[continent].color}08 0%, transparent 70%)`
        }} 
      />
    )}
    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-zinc-950/40 to-black/80" />
  </div>
);

export default function ChainPage() {
  const [user, setUser]               = useState<any>(null);
  const [stage, setStage]             = useState<Stage>("language");
  const [lang, setLang]               = useState<Lang>("fr");
  const [continent, setContinent]     = useState<Continent | null>(null);
  const [hovered, setHovered]         = useState<Continent | null>(null);
  const [pseudo, setPseudo]           = useState("");
  const [question, setQuestion]       = useState("");
  const [messages, setMessages]       = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading]     = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pseudoRef   = useRef<HTMLInputElement>(null);

  const t = copy[lang];

  useEffect(() => {
    const savedLang      = sessionStorage.getItem("chain_lang")      as Lang | null;
    const savedContinent = sessionStorage.getItem("chain_continent")  as Continent | null;
    const savedStage     = sessionStorage.getItem("chain_stage")      as Stage | null;
    const savedPseudo    = sessionStorage.getItem("chain_pseudo")     || "";
    if (savedLang)      setLang(savedLang);
    if (savedContinent) setContinent(savedContinent);
    if (savedPseudo)    setPseudo(savedPseudo);

    try {
      const savedMsgs = localStorage.getItem("chain_messages");
      if (savedMsgs) setMessages(JSON.parse(savedMsgs));
    } catch {}

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const { data: ps } = await supabase.from("world_pseudos").select("pseudo").eq("user_id", session.user.id).maybeSingle();
        if (ps?.pseudo) { setPseudo(ps.pseudo); sessionStorage.setItem("chain_pseudo", ps.pseudo); }
        await loadDebatesFromSupabase(session.user.id);
        setStage(savedStage && savedStage !== "auth" && savedStage !== "language" ? savedStage : "continent");
      } else {
        // Mode Invité libre si non authentifié : pas de blocage !
        setStage(savedStage && savedStage !== "auth" && savedStage !== "language" ? savedStage : "continent");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (session?.user) {
        setUser(session.user);
        const { data: ps } = await supabase.from("world_pseudos").select("pseudo").eq("user_id", session.user.id).maybeSingle();
        if (ps?.pseudo) { setPseudo(ps.pseudo); sessionStorage.setItem("chain_pseudo", ps.pseudo); }
        await loadDebatesFromSupabase(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { sessionStorage.setItem("chain_stage", stage); }, [stage]);
  useEffect(() => { sessionStorage.setItem("chain_lang", lang); }, [lang]);
  useEffect(() => { if (continent) sessionStorage.setItem("chain_continent", continent); }, [continent]);
  useEffect(() => { sessionStorage.setItem("chain_pseudo", pseudo); }, [pseudo]);
  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem("chain_messages", JSON.stringify(messages.filter(m => !m.loading))); } catch {}
    }
  }, [messages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: messages.length > 1 ? "smooth" : "instant" }); }, [messages]);

  const selectLang = (l: Lang) => { setLang(l); setStage("continent"); };
  const selectContinent = (c: Continent) => { setContinent(c); setStage("allegiance"); };
  const confirmAllegiance = async () => {
    if (user && pseudo.trim()) await supabase.from("world_pseudos").upsert({ user_id: user.id, pseudo: pseudo.trim(), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setStage("chat");
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  // 🌟 CHARGEMENT SÉPARÉ ET NETTOYÉ (Filtre strict chain_%)
  const loadDebatesFromSupabase = async (uid: string) => {
    const { data } = await supabase
      .from("world_debates")
      .select("*")
      .eq("user_id", uid)
      .like("continent", "chain_%")
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const allMessages: AIMessage[] = [];
      data.forEach(d => {
        allMessages.push({ continent: "na", round: 0, text: `── ${d.question} ──`, isFinal: false, loading: false });
        allMessages.push(...(d.messages || []));
      });
      setMessages(allMessages);
    }
  };

  const callChainEvolution = async (contextSoFar: string, round: number): Promise<string> => {
    try {
      const res = await fetch("http://127.0.0.1:5001/api/chain/evolution", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ question, context: contextSoFar, round, lang }) 
      });
      const data = await res.json();
      return data.response || "...";
    } catch { return "..."; }
  };

  const handleSubmit = async () => {
    if (!question.trim() || !continent || isLoading) return;
    
    setIsLoading(true);
    const currentQuestion = question;
    setQuestion("");

    // 1. On insère la ligne de séparation de la question
    setMessages(prev => [...prev, { 
      continent: "na", 
      round: 0, 
      text: `── ${currentQuestion} ──`, 
      isFinal: false, 
      loading: false 
    }]);

    const sequence = Array.from({ length: 15 }, (_, i) => ({
      c: i < 5 ? ("na" as Continent) : i < 10 ? ("cn" as Continent) : ("eu" as Continent),
      round: i + 1,
      isFinal: i === 14
    }));

    let contextSoFar = "";

    // 2. On exécute la cascade séquentiellement
    for (const step of sequence) {
      const { c, round, isFinal } = step;

      // On ajoute le bloc de l'étape actuelle en mode chargement
      setMessages(prev => [...prev, { continent: c, round, text: "", isFinal, loading: true }]);
      
      const text = await callChainEvolution(contextSoFar, round);
      contextSoFar += `[Niveau ${round}]: ${text}\n\n`;
      
      // Mise à jour chirurgicale basée sur l'index exact de l'élément à la fin du tableau
      setMessages(prev => {
        const newMessages = [...prev];
        const targetIdx = newMessages.length - 1; // C'est toujours le dernier élément qu'on vient d'ajouter
        if (targetIdx >= 0 && newMessages[targetIdx].loading) {
          newMessages[targetIdx] = { ...newMessages[targetIdx], text, loading: false };
        }
        return newMessages;
      });

      // Petit délai réseau pour laisser souffler le rendering de React
      await new Promise(r => setTimeout(r, 100));
    }

    // Sauvegarde DB autonome
    if (user) {
      const completedMsgs = messages.filter(m => !m.loading);
      const sepIdx = completedMsgs.findLastIndex(m => m.text.startsWith("──"));
      const sessionMsgs = completedMsgs.slice(sepIdx + 1);
      
      supabase.from("world_debates")
        .insert({ 
          id: `${Date.now()}`, 
          user_id: user.id, 
          question: currentQuestion, 
          continent: `chain_${continent}`, 
          lang, 
          messages: sessionMsgs, 
          created_at: new Date().toISOString() 
        })
        .then(({ error }) => { 
          if (error) console.warn("[CHAIN] Erreur DB:", error.message); 
        });
    }

    setIsLoading(false);
  };

  const myC = continent ? PALIER_CONFIG[continent] : null;

  if (stage === "language") return (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col overflow-hidden">
      <MatrixBackground continent={null} />
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 gap-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-tr from-cyan-500 to-purple-500 rounded-2xl flex items-center justify-center font-mono font-black text-white text-2xl shadow-[0_0_30px_rgba(6,182,212,0.4)]">🔗</div>
          <span className="text-white font-black font-mono text-4xl tracking-[0.2em]">CHAIN<span className="text-cyan-400">.AI</span></span>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
          {LANGS.map(({ code, label, sub }) => (
            <button key={code} onClick={() => selectLang(code)}
              className="flex-1 rounded-2xl border-2 border-zinc-900 bg-black/40 hover:bg-zinc-900/60 backdrop-blur-md transition-all duration-300 p-6 text-center group hover:border-cyan-500 shadow-xl">
              <div className="text-white text-xl font-bold mb-1 group-hover:text-cyan-400 transition-colors">{label}</div>
              <div className="text-zinc-500 text-xs font-mono">{sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (stage === "continent") return (
    <div className="fixed inset-0 bg-black flex flex-col font-mono">
      <div className="absolute inset-x-0 top-12 z-20 flex flex-col items-center justify-center text-center pointer-events-none transition-opacity px-6" style={{ opacity: hovered ? 0.1 : 1 }}>
        <h2 className="text-2xl sm:text-4xl font-black tracking-tighter text-white uppercase mb-2">{SLOGANS[lang].main}</h2>
        <p className="text-cyan-400 font-sans text-sm max-w-xl leading-relaxed">{SLOGANS[lang].sub}</p>
        <p className="text-zinc-600 text-xs font-mono mt-4">// {t.continentSub}</p>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row h-full">
        {(Object.keys(PALIER_CONFIG) as Continent[]).map((key) => {
          const conf = PALIER_CONFIG[key];
          const isHov = hovered === key;
          return (
            <button key={key} onClick={() => selectContinent(key)} onMouseEnter={() => setHovered(key)} onMouseLeave={() => setHovered(null)}
              className={`flex-1 relative overflow-hidden flex flex-col items-center justify-center transition-all duration-700 bg-gradient-to-b ${conf.bgGrad} border border-transparent`}
              style={{ boxShadow: isHov ? `inset 0 0 100px ${conf.color}20, 0 0 40px ${conf.color}10` : "none", borderColor: isHov ? conf.color : "transparent" }}>
              <div className="absolute inset-0 opacity-[0.02] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#fff_2px,#fff_4px)]" />
              <div className="relative z-10 text-center px-6 space-y-4">
                <div className="text-4xl md:text-5xl transition-transform duration-500" style={{ transform: isHov ? "scale(1.2) rotate(10deg)" : "none", textShadow: isHov ? `0 0 20px ${conf.color}` : "none" }}>{conf.icon}</div>
                <h3 className="text-white font-black text-2xl tracking-wider uppercase" style={{ color: isHov ? conf.color : "#fff" }}>{conf.label[lang]}</h3>
                <p className="text-xs text-zinc-500 max-w-xs transition-colors font-sans" style={{ color: isHov ? "#d4d4d8" : "#71717a" }}>{conf.subtitle[lang]}</p>
                <div className="text-[10px] tracking-widest border border-zinc-800 rounded-full px-3 py-1 inline-block" style={{ color: isHov ? conf.color : "#52525b", borderColor: isHov ? conf.color : "#27272a" }}>{t.advancedModel}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (stage === "allegiance" && continent) {
    const conf = PALIER_CONFIG[continent];
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center p-6 z-50">
        <MatrixBackground continent={continent} />
        <div className="relative z-10 w-full max-w-md text-center font-mono">
          <div className="text-4xl mb-3">{conf.icon}</div>
          <span className="text-xs uppercase tracking-widest px-3 py-1 rounded-full border inline-block mb-4" style={{ color: conf.color, borderColor: conf.color, boxShadow: `0 0 12px ${conf.color}30` }}>{conf.label[lang]}</span>
          <h2 className="text-white text-2xl font-black uppercase mb-1">{t.allegianceTitle}</h2>
          <p className="text-zinc-500 text-xs mb-6">// {t.allegianceSub}</p>

          <div className="bg-black/60 border border-zinc-800 rounded-2xl p-5 mb-5 text-left backdrop-blur-md">
            <p className="text-zinc-400 font-sans text-xs leading-relaxed mb-4">{t.allegianceDesc(conf.label[lang])}</p>
            <label className="text-[10px] uppercase tracking-wider mb-2 block text-zinc-500">{t.enterPseudo}</label>
            <input ref={pseudoRef} type="text" value={pseudo} onChange={e => setPseudo(e.target.value.slice(0, 20))} onKeyDown={e => { if (e.key === "Enter" && pseudo.trim()) confirmAllegiance(); }}
              placeholder={t.pseudoPlaceholder} className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors" autoFocus />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStage("continent")} className="flex-1 py-3 rounded-xl border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all text-xs font-bold uppercase">{t.change}</button>
            <button onClick={confirmAllegiance} disabled={!pseudo.trim()} className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-black transition-all disabled:opacity-30" style={{ background: conf.color }}>{t.confirm}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col overflow-hidden font-mono text-zinc-200">
      <MatrixBackground continent={continent} />

      {/* NAV COCKPIT */}
      <div className="relative z-30 shrink-0 border-b border-zinc-900 bg-black/40 backdrop-blur-md px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white font-black text-sm tracking-widest uppercase">CHAIN<span className="text-cyan-400">.CORE</span></span>
          <span className="text-zinc-700 text-xs">|</span>
          <p className="text-zinc-500 font-sans text-[11px] hidden lg:block">{SLOGANS[lang].sub}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {myC && (
            <div className="flex items-center gap-2 cursor-pointer bg-zinc-900/60 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs" style={{ borderColor: `${myC.color}30` }} onClick={() => setStage("allegiance")}>
              <span style={{ color: myC.color }}>{myC.icon}</span>
              <span className="text-zinc-300 font-bold">@{pseudo || "Opérateur"}</span>
            </div>
          )}
          <button onClick={() => setShowSettings(s => !s)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-white transition-colors">⚙</button>
          
          {showSettings && (
            <div className="fixed right-6 top-14 w-56 rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden z-[99999]">
              <button onClick={() => { setStage("continent"); setShowSettings(false); }} className="w-full px-4 py-3 text-left hover:bg-zinc-900 text-xs text-zinc-400 hover:text-white border-b border-zinc-900">🌍 Modifier l'ancrage</button>
              <button onClick={() => { supabase.auth.signOut(); setShowSettings(false); }} className="w-full px-4 py-3 text-left hover:bg-zinc-900 text-xs text-red-400">⏏ Interrompre la liaison</button>
            </div>
          )}
        </div>
      </div>

      {/* ECOUTRE DES MESSAGES */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 py-6 space-y-3 max-w-4xl w-full mx-auto">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-16 h-16 rounded-full border border-dashed border-zinc-800 flex items-center justify-center text-2xl animate-spin duration-10000">🧬</div>
            <p className="text-zinc-500 text-xs max-w-sm font-sans">Soumettez l'architecture de votre projet pour lancer la boucle évolutive sans limites.</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          if (msg.text.startsWith("──")) return (
            <div key={idx} className="flex items-center gap-4 py-3 text-zinc-600 text-xs">
              <div className="flex-1 h-px bg-zinc-900" />
              <span>{msg.text}</span>
              <div className="flex-1 h-px bg-zinc-900" />
            </div>
          );

          const isFinal = msg.isFinal;
          const layerColor = msg.round <= 5 ? "text-cyan-400" : msg.round <= 10 ? "text-purple-400" : "text-emerald-400";
          const borderGlow = isFinal ? "border-emerald-500 bg-emerald-950/10" : "border-zinc-900 bg-zinc-900/10";

          return (
            <div key={idx} className={`w-full border rounded-xl p-4 transition-all ${borderGlow}`}>
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-2 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className={`font-black uppercase px-1.5 py-0.5 rounded bg-zinc-900 ${layerColor}`}>
                    {t.round} {msg.round.toString().padStart(2, "0")}
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-400 font-sans">
                    {msg.round <= 5 ? "Initial Spark (Éclaireur)" : msg.round <= 10 ? "Structural Logic (Architecte)" : "Quantum Fine-Tuning (Sage)"}
                  </span>
                </div>
                {isFinal && <span className="text-emerald-400 font-black tracking-widest text-[9px] border border-emerald-500/40 rounded px-1">{t.finalVerdict.toUpperCase()}</span>}
              </div>

              {msg.loading ? (
                <div className="flex items-center gap-2 py-1 text-zinc-600 text-xs animate-pulse">
                  <span>⚡</span>
                  <span>{t.thinking}</span>
                </div>
              ) : (
                <p className={`text-sm leading-relaxed font-sans ${isFinal ? "text-white font-medium" : "text-zinc-300"}`}>
                  {msg.text}
                </p>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* INPUT ZONE */}
      <div className="relative z-10 shrink-0 border-t border-zinc-900 bg-black/40 backdrop-blur-md p-4">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <textarea ref={textareaRef} value={question} onChange={e => setQuestion(e.target.value.slice(0, 500))}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            placeholder={t.chatPlaceholder} rows={2} disabled={isLoading}
            className="flex-1 bg-zinc-950 border border-zinc-900 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-700 resize-none outline-none font-sans leading-relaxed" />
          
          <button onClick={handleSubmit} disabled={!question.trim() || isLoading}
            className="px-6 rounded-xl font-black text-xs uppercase tracking-widest text-black transition-all disabled:opacity-20 shrink-0"
            style={{ background: myC?.color || "#06b6d4" }}>
            {isLoading ? "..." : t.chatSend}
          </button>
        </div>
      </div>
    </div>
  );
}