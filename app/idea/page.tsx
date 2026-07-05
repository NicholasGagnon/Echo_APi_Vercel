"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

type Lang = "fr" | "en";

const T = {
  fr: {
    title: "Analyse d'idée",
    sub: "Décris ton idée. L'IA te dit la vérité.",
    placeholder: `Ex: Je veux créer une application qui permet aux plombiers indépendants de gérer leurs factures et rendez-vous depuis leur téléphone. Ils perdent beaucoup de temps sur l'administratif et ratent des clients parce qu'ils ne rappellent pas assez vite.`,
    hint: "Plus tu es précis sur le problème, la cible et la solution, meilleure sera l'analyse.",
    analyse: "Analyser l'idée",
    analysing: "Analyse en cours…",
    howBtn: "💡 Comment ça marche ?",
    howTitle: "Comment ça marche ?",
    howSteps: [
      { icon: "⚡", title: "Gagnez un temps précieux", desc: "Décrivez votre idée en quelques phrases et obtenez une analyse immédiate, sans formulaire interminable ni questionnaire de 30 minutes." },
      { icon: "🧠", title: "Comprenez le verdict instantanément", desc: "Des explications simples, claires et accessibles, sans jargon technique réservé aux experts ou aux investisseurs." },
      { icon: "🚀", title: "Éliminez la friction dès le départ", desc: "Considérez-le comme le premier test de réalité de votre projet : rapide, léger et suffisamment précis pour savoir si ça vaut la peine d'aller plus loin." },
      { icon: "🎯", title: "Votre idée analysée telle qu'elle existe", desc: "L'outil n'essaie pas de transformer une petite idée en startup à un milliard de dollars. Il évalue exactement ce que vous avez écrit." },
      { icon: "✅", title: "Une opinion honnête, rapide et centralisée", desc: "Une seule description, un seul clic, une seule analyse claire pour savoir si vous avez un bon pari ou un chantier colossal." },
    ],
    howClose: "Fermer",
    authTitle: "Connecte-toi pour analyser",
    authSub: "Gratuit · Ton texte est conservé · Aucune carte requise",
    authGoogle: "Continuer avec Google",
    authMicrosoft: "Continuer avec Microsoft",
    authEmail: "Se connecter par email",
    authSignup: "Créer un compte gratuit",
    modalSignin: "🛸 Connexion",
    modalSignup: "🛸 Créer un compte",
    submitSignin: "Se connecter",
    submitSignup: "Créer mon compte",
    switchToSignup: "Pas de compte ? Créer",
    switchToSignin: "Déjà un compte ? Se connecter",
    reconstruction: "Ce que j'ai compris",
    problem: "Problème détecté",
    solution: "Solution proposée",
    target: "Clientèle cible",
    workflow: "Fonctionnement détecté",
    success: "Condition de succès",
    risks: "Zones d'ombre",
    questions: "Les vraies questions",
    q1: "Est-ce que les gens veulent vraiment ça ?",
    q2: "Est-ce que quelqu'un fait déjà ça ?",
    q3: "Coût pour tester",
    q4: "Difficulté à construire",
    q5: "Plus gros risque",
    q6: "Plus gros point fort",
    q7: "Temps avant de savoir si ça marche",
    q8: "Ça vaut la peine d'essayer ?",
    competitorAnalysis: "Concurrent principal identifié",
    alternative: "Alternative détectée",
    targetAlign: "Alignement cible",
    workflowFriction: "Friction workflow",
    expDepth: "Profondeur d'expérience",
    directCompetitor: "Concurrent direct ?",
    yes: "Oui", no: "Non",
    competitorVerdict: "Verdict concurrentiel",
    competitorSimilarity: "Dimensions de similarité",
    sameLabels: ["Même problème", "Même solution", "Même workflow", "Même clientèle", "Même modèle", "Même expérience"],
    viability: "Scores de viabilité",
    demandScore: "Demande utilisateur",
    monetization: "Dépendance monétisation",
    buildScore: "Efficacité de construction",
    defensScore: "Défensabilité",
    assumptions: "Hypothèses critiques",
    assumptionsUsed: "Hypothèses utilisées",
    assumptionsRisk: "Si fausses, tout change",
    verdictLabel: "Verdict final",
    donTitle: "Soutenir l'outil",
    donDesc: "Outil gratuit. Un don maintient le service en ligne.",
    donBtn: "Faire un don ▼",
    donClose: "Fermer ▲",
    amazonTitle: "Valide ton idée avec les vrais avis",
    amazonLink: "Rechercher sur Amazon →",
    connected: "Connecté", myAccount: "Mon compte", logout: "Se déconnecter",
    dark: "☾", light: "☀",
    monetizationLevels: { "none_or_low":"Aucune ou faible","medium":"Moyenne","high":"Élevée","critical":"Critique" } as Record<string,string>,
  },
  en: {
    title: "Idea Analysis",
    sub: "Describe your idea. The AI tells you the truth.",
    placeholder: `Ex: I want to create an app that helps independent plumbers manage invoices and appointments from their phone. They lose a lot of time on admin and miss clients because they don't follow up fast enough.`,
    hint: "The more precise you are about the problem, target, and solution, the better the analysis.",
    analyse: "Analyze the idea",
    analysing: "Analyzing…",
    howBtn: "💡 How does it work?",
    howTitle: "How does it work?",
    howSteps: [
      { icon: "⚡", title: "Save precious time", desc: "Describe your idea in a few sentences and get an immediate analysis, without endless forms or 30-minute questionnaires." },
      { icon: "🧠", title: "Understand the verdict instantly", desc: "Simple, clear and accessible explanations — no technical jargon reserved for experts or investors." },
      { icon: "🚀", title: "Eliminate friction from the start", desc: "Think of it as the first reality check for your project: fast, light, and precise enough to know if it's worth going further." },
      { icon: "🎯", title: "Your idea analyzed as it really is", desc: "The tool doesn't try to turn a small idea into a billion-dollar startup. It evaluates exactly what you wrote." },
      { icon: "✅", title: "Honest, fast and centralized opinion", desc: "One description, one click, one clear analysis to know if you have a good bet or a massive undertaking." },
    ],
    howClose: "Close",
    authTitle: "Sign in to analyze",
    authSub: "Free · Your text is preserved · No card required",
    authGoogle: "Continue with Google",
    authMicrosoft: "Continue with Microsoft",
    authEmail: "Sign in with email",
    authSignup: "Create a free account",
    modalSignin: "🛸 Sign In",
    modalSignup: "🛸 Create Account",
    submitSignin: "Sign in",
    submitSignup: "Create my account",
    switchToSignup: "No account? Create one",
    switchToSignin: "Already have an account?",
    reconstruction: "What I understood",
    problem: "Detected problem",
    solution: "Proposed solution",
    target: "Target customer",
    workflow: "Detected workflow",
    success: "Success condition",
    risks: "Blind spots",
    questions: "The real questions",
    q1: "Do people really want this?",
    q2: "Does someone already do this?",
    q3: "Cost to test",
    q4: "Difficulty to build",
    q5: "Biggest risk",
    q6: "Biggest strength",
    q7: "Time to know if it works",
    q8: "Worth trying?",
    competitorAnalysis: "Main competitor identified",
    alternative: "Detected alternative",
    targetAlign: "Target alignment",
    workflowFriction: "Workflow friction",
    expDepth: "Experience depth",
    directCompetitor: "Direct competitor?",
    yes: "Yes", no: "No",
    competitorVerdict: "Competitive verdict",
    competitorSimilarity: "Similarity dimensions",
    sameLabels: ["Same problem", "Same solution", "Same workflow", "Same customers", "Same model", "Same experience"],
    viability: "Viability scores",
    demandScore: "User demand",
    monetization: "Monetization dependency",
    buildScore: "Build efficiency",
    defensScore: "Defensibility",
    assumptions: "Critical assumptions",
    assumptionsUsed: "Assumptions used",
    assumptionsRisk: "If wrong, everything changes",
    verdictLabel: "Final verdict",
    donTitle: "Support the tool",
    donDesc: "Free tool. A donation keeps it running.",
    donBtn: "Donate ▼",
    donClose: "Close ▲",
    amazonTitle: "Validate your idea with real reviews",
    amazonLink: "Search on Amazon →",
    connected: "Connected", myAccount: "My account", logout: "Sign out",
    dark: "☾", light: "☀",
    monetizationLevels: { "none_or_low":"None or low","medium":"Medium","high":"High","critical":"Critical" } as Record<string,string>,
  },
};

const DONATION_PLANS = [
  { name:"Avantage",  nameEn:"Advantage", amount:"$5.99",  plan:"basic",   desc:"Un café",          descEn:"A coffee" },
  { name:"Premium",   nameEn:"Premium",   amount:"$9.99",  plan:"premium", desc:"Vrai soutien",     descEn:"Real support" },
  { name:"Ultra",     nameEn:"Ultra",     amount:"$19.99", plan:"ultra",   desc:"Généreux 💛",      descEn:"Generous 💛" },
  { name:"Fondateur", nameEn:"Founder",   amount:"$99",    plan:"founder", desc:"Tu crois en nous", descEn:"You believe in us" },
];

const scoreColor = (s: number) =>
  s >= 8 ? "#22c55e" : s >= 6 ? "#eab308" : s >= 4 ? "#f97316" : "#ef4444";

const ScoreBar = ({ score, color }: { score: number; color: string }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
    <div style={{ flex:1, height:6, background:"rgba(255,255,255,.1)", borderRadius:3, overflow:"hidden" }}>
      <div style={{ width:`${score*10}%`, height:"100%", background:color, borderRadius:3, transition:"width .6s ease" }} />
    </div>
    <div style={{ fontSize:14, fontWeight:900, color, minWidth:32, textAlign:"right" }}>
      {score}<span style={{ fontSize:10, opacity:.5 }}>/10</span>
    </div>
  </div>
);

export default function IdeaPage() {
  const [dark, setDark]                 = useState(true);
  const [lang, setLang]                 = useState<Lang>("fr");
  const [user, setUser]                 = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHow, setShowHow]           = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailMode, setEmailMode]       = useState<"signin"|"signup">("signin");
  const [authEmail, setAuthEmail]       = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError]       = useState<string|null>(null);
  const [authSuccess, setAuthSuccess]   = useState<string|null>(null);
  const [donOpen, setDonOpen]           = useState(false);
  const [donLoading, setDonLoading]     = useState<string|null>(null);
  const [idea, setIdea]                 = useState("");
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState<any>(null);
  const [error, setError]               = useState<string|null>(null);
  const t = T[lang];

  const bg    = dark ? "#08070a" : "#f5f2ee";
  const surf  = dark ? "#111118" : "#fffdf9";
  const surf2 = dark ? "#1a1a24" : "#f0ece4";
  const bord  = dark ? "rgba(255,255,255,.08)" : "#e2ddd5";
  const txt   = dark ? "#e8e8f0" : "#1a1917";
  const muted = dark ? "rgba(255,255,255,.35)" : "#7a7570";
  const acc   = "#00c8ff";

  const api = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

  // ── AUTH + RESTORE ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Sauvegarder le texte avant OAuth
    const draft = localStorage.getItem("idea_draft");
    if (draft) { setIdea(draft); localStorage.removeItem("idea_draft"); }

    supabase.auth.getUser().then(({ data: authData }) => {
      if (authData?.user) { setUser(authData.user); restoreAnalysis(authData.user.id); }
    });

    const { data: l } = supabase.auth.onAuthStateChange(async (_, s) => {
      setUser(s?.user ?? null);
      if (s?.user) restoreAnalysis(s.user.id);
    });
    return () => l.subscription.unsubscribe();
  }, []);

  const restoreAnalysis = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("idea_analyses")
        .select("data")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error && data?.data?.result) setResult(data.data.result);
      if (!error && data?.data?.idea && !idea) setIdea(data.data.idea);
    } catch {}
  };

  const saveAnalysis = async (userId: string, ideaText: string, analysisResult: any) => {
    try {
      await supabase.from("idea_analyses").insert({
        user_id: userId,
        data: { idea: ideaText, result: analysisResult },
        updated_at: new Date().toISOString(),
      });
    } catch {}
  };

  // ── OAUTH ──────────────────────────────────────────────────────────────────
  const saveBeforeRedirect = () => { if (idea.trim()) localStorage.setItem("idea_draft", idea); };
  const handleGoogle    = async () => { saveBeforeRedirect(); await supabase.auth.signInWithOAuth({ provider:"google",  options:{ redirectTo:`${window.location.origin}/idea`, scopes:"openid profile email", queryParams:{ prompt:"select_account" } } }); };
  const handleMicrosoft = async () => { saveBeforeRedirect(); await supabase.auth.signInWithOAuth({ provider:"azure",   options:{ redirectTo:`${window.location.origin}/idea`, scopes:"openid profile email User.Read" } }); };
  const handleLogout    = async () => { await supabase.auth.signOut(); setUser(null); setShowUserMenu(false); };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(null); setAuthSuccess(null);
    if (emailMode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
      if (error) setAuthError(error.message); else setShowEmailModal(false);
    } else {
      const { data, error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword, options:{ emailRedirectTo:`${window.location.origin}/idea` } });
      if (error) setAuthError(error.message);
      else if (data?.user && (!data.user.identities || data.user.identities.length === 0)) setAuthError("Compte existant.");
      else setAuthSuccess(lang === "fr" ? "Vérifiez votre boîte mail !" : "Check your inbox!");
    }
  };

  const handleDon = async (plan: string) => {
    setDonLoading(plan);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ plan, userId: user?.id||"guest_don", userEmail: user?.email||"don@echosai.ca", currency:"CAD" }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {} finally { setDonLoading(null); }
  };

  // ── ANALYSE ────────────────────────────────────────────────────────────────
  const handleAnalyse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!idea.trim() || idea.trim().length < 10) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${api}/2/analyse-idee`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ idea: idea.trim(), lang }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      if (user) saveAnalysis(user.id, idea.trim(), data);
    } catch (err: any) {
      setError(err.message || "Erreur inattendue.");
    } finally { setLoading(false); }
  };

  // ── HELPERS UI ─────────────────────────────────────────────────────────────
  const sameKeys = ["same_problem","same_solution","same_workflow","same_target_customer","same_business_model","same_user_experience"];

  const Section = ({ title, color=acc, children }: { title:string; color?:string; children:React.ReactNode }) => (
    <div style={{ marginBottom:24 }}>
      <div style={{ fontSize:9, fontWeight:800, letterSpacing:4, textTransform:"uppercase", color, marginBottom:12, opacity:.8 }}>{title}</div>
      {children}
    </div>
  );

  const Card = ({ children, style={} }: { children:React.ReactNode; style?:React.CSSProperties }) => (
    <div style={{ background:surf, border:`1px solid ${bord}`, borderRadius:13, padding:"14px 18px", ...style }}>{children}</div>
  );

  const Row = ({ label, value }: { label:string; value?:string }) => value ? (
    <div style={{ display:"flex", gap:12, marginBottom:10, alignItems:"flex-start" }}>
      <div style={{ fontSize:10, fontWeight:700, color:muted, textTransform:"uppercase", letterSpacing:.5, flexShrink:0, width:140, paddingTop:2 }}>{label}</div>
      <div style={{ fontSize:13, color:txt, lineHeight:1.5, flex:1 }}>{value}</div>
    </div>
  ) : null;

  const btnOAuth = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
    borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:600, width:"100%", border:"none", ...extra,
  });

  // ── RENDU ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:bg, color:txt, minHeight:"100dvh", fontFamily:"'Inter', system-ui, sans-serif", transition:"background .3s" }}>

      {/* NAV */}
      <nav style={{ borderBottom:`1px solid ${bord}`, padding:"0 24px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, background: dark?"rgba(8,7,10,.96)":"rgba(245,242,238,.96)", backdropFilter:"blur(12px)", zIndex:50 }}>
        <div style={{ fontWeight:800, fontSize:14, color:txt }}><span style={{ color:acc }}>Idea</span>Analysis</div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={() => setShowHow(true)} style={{ background:surf2, border:`1px solid ${bord}`, borderRadius:7, padding:"4px 10px", fontSize:11, color:acc, cursor:"pointer", fontWeight:700 }}>{t.howBtn}</button>
          <button onClick={() => setLang(l => l==="fr"?"en":"fr")} style={{ background:surf2, border:`1px solid ${bord}`, borderRadius:7, padding:"4px 10px", fontSize:11, color:muted, cursor:"pointer", fontWeight:700 }}>
            {lang==="fr"?"EN":"FR"}
          </button>
          <button onClick={() => setDark(d => !d)} style={{ background:surf2, border:`1px solid ${bord}`, borderRadius:7, padding:"4px 10px", fontSize:12, color:muted, cursor:"pointer" }}>{dark?t.light:t.dark}</button>
          {user ? (
            <div style={{ position:"relative" }}>
              <button onClick={() => setShowUserMenu(v => !v)} style={{ background:"#16a34a", border:"none", borderRadius:8, padding:"5px 12px", fontSize:11, color:"#fff", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#86efac", display:"inline-block" }} />{t.connected}
              </button>
              {showUserMenu && (
                <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, background:surf, border:`1px solid ${bord}`, borderRadius:10, overflow:"hidden", zIndex:100, minWidth:140 }}>
                  <button onClick={handleLogout} style={{ width:"100%", padding:"9px 14px", fontSize:12, color:"#ef4444", background:"none", border:"none", cursor:"pointer", fontWeight:600, textAlign:"left" }}>↩ {t.logout}</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowAuthPopup(true)} style={{ background:acc, color:"#000", border:"none", borderRadius:8, padding:"5px 14px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              {lang==="fr"?"Se connecter":"Sign in"}
            </button>
          )}
        </div>
      </nav>

      {/* LAYOUT 3 COLONNES */}
      <div style={{ display:"grid", gridTemplateColumns:"180px 1fr 180px", maxWidth:1200, margin:"0 auto", padding:"0 10px", minHeight:"calc(100dvh - 52px)" }} className="idea-layout">

        {/* COL GAUCHE — pubs */}
        <aside className="idea-col-left" style={{ paddingTop:16, display:"flex", flexDirection:"column", gap:10, paddingRight:10 }}>
          {[
            { href:"https://echosai.ca/1/hall",  src:"/affinity.jpg", label:"AFFINITY HALL →", bg:surf2, color:muted },
            { href:"https://echosai.ca/avis",    src:"/avis.png",     label:"AVIS PRODUITS →", bg:acc,   color:"#000" },
            { href:"https://echosai.ca/fastbilling", src:"/facture.png", label:"FASTBILLING →", bg:"#1a1917", color:"#fff" },
            { href:"https://echosai.ca/2/talk",  src:"/commun.png",   label:"", bg:"transparent", color:"#fff" },
          ].map((p,i) => (
            <a key={i} href={p.href} target="_blank" rel="noopener noreferrer"
              style={{ display:"block", borderRadius:12, overflow:"hidden", border:`1px solid ${bord}` }}
              onMouseEnter={e => (e.currentTarget.style.opacity=".9")} onMouseLeave={e => (e.currentTarget.style.opacity="1")}>
              <img src={p.src} alt="" style={{ width:"100%", display:"block", objectFit:"cover", maxHeight: i===0?999:70 }} />
              {p.label && <div style={{ background:p.bg, color:p.color, textAlign:"center", fontSize:9, fontWeight:800, padding:"4px 0", letterSpacing:1 }}>{p.label}</div>}
            </a>
          ))}
        </aside>

        {/* CENTRE */}
        <div className="idea-col-centre" style={{ padding:"24px 14px 60px" }}>

          {/* Header */}
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:5, color:acc, marginBottom:8, opacity:.7 }}>ANALYSE D'IDÉE</div>
            <h1 style={{ fontSize:"clamp(24px, 4vw, 42px)", fontWeight:900, letterSpacing:-1, marginBottom:6, color: dark?"#fff":"#1a1917" }}>{t.title}</h1>
            <p style={{ fontSize:13, color:muted }}>{t.sub}</p>
          </div>

          {/* Pubs mobile */}
          <div className="idea-mobile-pubs" style={{ display:"none", gap:8, marginBottom:12 }}>
            <a href="https://echosai.ca/avis" target="_blank" rel="noopener noreferrer" style={{ flex:1, display:"block", borderRadius:10, overflow:"hidden", border:`1px solid ${bord}`, textDecoration:"none" }}>
              <img src="/avis.png" alt="" style={{ width:"100%", display:"block", maxHeight:70, objectFit:"cover" }} />
              <div style={{ background:acc, color:"#000", textAlign:"center", fontSize:9, fontWeight:800, padding:"4px 0" }}>AVIS →</div>
            </a>
            <a href="https://echosai.ca/fastbilling" target="_blank" rel="noopener noreferrer" style={{ flex:1, display:"block", borderRadius:10, overflow:"hidden", border:`1px solid ${bord}`, textDecoration:"none" }}>
              <img src="/facture.png" alt="" style={{ width:"100%", display:"block", maxHeight:70, objectFit:"cover" }} />
              <div style={{ background:"#1a1917", color:"#fff", textAlign:"center", fontSize:9, fontWeight:800, padding:"4px 0" }}>FASTBILLING →</div>
            </a>
          </div>

          {/* Formulaire */}
          <form onSubmit={e => e.preventDefault()} style={{ marginBottom:0 }}>
            <div style={{ fontSize:11, color:muted, marginBottom:8, lineHeight:1.6 }}>💡 {t.hint}</div>
            <textarea value={idea} onChange={e => setIdea(e.target.value)} required rows={8} placeholder={t.placeholder}
              style={{ width:"100%", background:surf, border:`1.5px solid ${bord}`, borderRadius:14, padding:"14px 16px", fontSize:13, color:txt, outline:"none", resize:"vertical", fontFamily:"inherit", lineHeight:1.7 }}
              onFocus={e => (e.target.style.borderColor=acc)} onBlur={e => (e.target.style.borderColor=bord)} />
            {error && <div style={{ marginTop:8, padding:"8px 12px", background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:9, fontSize:12, color:"#b91c1c" }}>⚠️ {error}</div>}
          </form>

          {/* Bouton principal — hors du form pour éviter les conflits disabled */}
          {!user ? (
            <button type="button" onClick={() => setShowAuthPopup(true)}
              style={{ width:"100%", background:`linear-gradient(135deg,${acc},#0080ff)`, color:"#000", border:"none", borderRadius:12, padding:"14px 0", fontWeight:900, fontSize:15, cursor:"pointer", marginBottom:16 }}>
              {lang==="fr"?"🔐 Se connecter pour analyser":"🔐 Sign in to analyze"}
            </button>
          ) : (
            <button type="button" onClick={handleAnalyse} disabled={loading || idea.trim().length < 10}
              style={{ width:"100%", background: loading ? muted : `linear-gradient(135deg,${acc},#0080ff)`, color:"#000", border:"none", borderRadius:12, padding:"14px 0", fontWeight:900, fontSize:15, cursor: loading||idea.trim().length<10?"not-allowed":"pointer", marginBottom:16 }}>
              {loading
                ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, color:"#fff" }}>
                    <span style={{ width:18, height:18, border:"2px solid rgba(255,255,255,.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin .7s linear infinite", display:"inline-block" }} />
                    {t.analysing}
                  </span>
                : t.analyse}
            </button>
          )}

          {/* RÉSULTATS */}
          {result && (
            <div style={{ animation:"fadeIn .4s ease" }}>

              {/* Verdict */}
              {result.verdict && (
                <div style={{ background:surf, border:`1.5px solid ${bord}`, borderRadius:14, padding:"18px 22px", marginBottom:24, borderLeft:`4px solid ${acc}` }}>
                  <div style={{ fontSize:9, fontWeight:800, letterSpacing:3, color:acc, marginBottom:8, textTransform:"uppercase" }}>{t.verdictLabel}</div>
                  <div style={{ fontSize:15, fontWeight:700, color:txt, lineHeight:1.6 }}>{result.verdict}</div>
                </div>
              )}

              {/* Scores viabilité */}
              {result.mvp_viability_scores && (
                <Section title={t.viability} color="#a78bfa">
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    <Card>
                      <div style={{ fontSize:10, fontWeight:700, color:"#a78bfa", marginBottom:8 }}>{t.demandScore}</div>
                      <ScoreBar score={result.mvp_viability_scores.user_demand_score} color={scoreColor(result.mvp_viability_scores.user_demand_score)} />
                      <div style={{ fontSize:11, color:muted, marginTop:8, lineHeight:1.4 }}>{result.mvp_viability_scores.user_demand_rationale}</div>
                    </Card>
                    <Card>
                      <div style={{ fontSize:10, fontWeight:700, color:"#a78bfa", marginBottom:8 }}>{t.buildScore}</div>
                      <ScoreBar score={result.mvp_viability_scores.build_efficiency_score} color={scoreColor(result.mvp_viability_scores.build_efficiency_score)} />
                      <div style={{ fontSize:11, color:muted, marginTop:8, lineHeight:1.4 }}>{result.mvp_viability_scores.build_efficiency_rationale}</div>
                    </Card>
                    <Card>
                      <div style={{ fontSize:10, fontWeight:700, color:"#a78bfa", marginBottom:8 }}>{t.defensScore}</div>
                      <ScoreBar score={result.mvp_viability_scores.defensibility_score} color={scoreColor(result.mvp_viability_scores.defensibility_score)} />
                      <div style={{ fontSize:11, color:muted, marginTop:8, lineHeight:1.4 }}>{result.mvp_viability_scores.defensibility_rationale}</div>
                    </Card>
                    <Card>
                      <div style={{ fontSize:10, fontWeight:700, color:"#a78bfa", marginBottom:8 }}>{t.monetization}</div>
                      <div style={{ fontSize:13, fontWeight:700, color:txt, marginBottom:6 }}>{t.monetizationLevels[result.mvp_viability_scores.monetization_requirement] || result.mvp_viability_scores.monetization_requirement}</div>
                      <div style={{ fontSize:11, color:muted, lineHeight:1.4 }}>{result.mvp_viability_scores.monetization_rationale}</div>
                    </Card>
                  </div>
                </Section>
              )}

              {/* Reconstruction */}
              <Section title={t.reconstruction} color={acc}>
                <Card>
                  <Row label={t.problem}  value={result.reconstructed_model?.problem_user_believes_he_solves} />
                  <Row label={t.solution} value={result.reconstructed_model?.solution_proposed} />
                  <Row label={t.target}   value={result.reconstructed_model?.target_customer_detected} />
                  <Row label={t.workflow} value={result.reconstructed_model?.workflow_detected} />
                  <Row label={t.success}  value={result.reconstructed_model?.success_condition_detected} />
                </Card>
              </Section>

              {/* Zones d'ombre */}
              {result.understanding_risk?.length > 0 && (
                <Section title={t.risks} color="#f97316">
                  <Card>
                    {result.understanding_risk.map((r: string, i: number) => (
                      <div key={i} style={{ display:"flex", gap:10, marginBottom:7, fontSize:12, color:txt, alignItems:"flex-start" }}>
                        <span style={{ color:"#f97316", flexShrink:0 }}>⚠</span>
                        <span style={{ lineHeight:1.5 }}>{r}</span>
                      </div>
                    ))}
                  </Card>
                </Section>
              )}

              {/* Vraies questions */}
              <Section title={t.questions} color="#34d399">
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {([
                    [t.q1, result.questions?.do_people_really_want_this],
                    [t.q2, result.questions?.does_someone_already_do_this],
                    [t.q3, result.questions?.cost_to_test],
                    [t.q4, result.questions?.difficulty_to_build],
                    [t.q5, result.questions?.biggest_risk],
                    [t.q6, result.questions?.biggest_strength],
                    [t.q7, result.questions?.time_to_know_if_it_works],
                    [t.q8, result.questions?.worth_trying],
                  ] as [string,string][]).map(([label,value],i) => (
                    <Card key={i} style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:"#34d399" }}>{label}</div>
                      <div style={{ fontSize:12, color:txt, lineHeight:1.5 }}>{value||"—"}</div>
                    </Card>
                  ))}
                </div>
              </Section>

              {/* Concurrent principal */}
              {result.competitor_analysis && (
                <Section title={t.competitorAnalysis} color="#f59e0b">
                  <Card>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                      <div>
                        <div style={{ fontSize:10, color:muted, marginBottom:2 }}>{t.alternative}</div>
                        <div style={{ fontSize:14, fontWeight:700, color:txt }}>{result.competitor_analysis.alternative_name}</div>
                      </div>
                      <div style={{ padding:"4px 12px", borderRadius:20, background: result.competitor_analysis.is_direct_product_competitor?"rgba(239,68,68,.15)":"rgba(34,197,94,.15)", border:`1px solid ${result.competitor_analysis.is_direct_product_competitor?"#ef4444":"#22c55e"}`, fontSize:11, fontWeight:700, color: result.competitor_analysis.is_direct_product_competitor?"#ef4444":"#22c55e" }}>
                        {t.directCompetitor} {result.competitor_analysis.is_direct_product_competitor?t.yes:t.no}
                      </div>
                    </div>
                    {result.competitor_analysis.friction_comparison && (
                      <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:12 }}>
                        {result.competitor_analysis.friction_comparison.target_alignment && <div style={{ fontSize:12, color:txt }}><span style={{ color:muted, marginRight:8 }}>{t.targetAlign} :</span>{result.competitor_analysis.friction_comparison.target_alignment}</div>}
                        {result.competitor_analysis.friction_comparison.workflow_friction && <div style={{ fontSize:12, color:txt }}><span style={{ color:muted, marginRight:8 }}>{t.workflowFriction} :</span>{result.competitor_analysis.friction_comparison.workflow_friction}</div>}
                        {result.competitor_analysis.friction_comparison.experience_depth && <div style={{ fontSize:12, color:txt }}><span style={{ color:muted, marginRight:8 }}>{t.expDepth} :</span>{result.competitor_analysis.friction_comparison.experience_depth}</div>}
                      </div>
                    )}
                    {result.competitor_analysis.verdict && <div style={{ borderTop:`1px solid ${bord}`, paddingTop:10, fontSize:12, color:txt, fontStyle:"italic", lineHeight:1.5 }}>{result.competitor_analysis.verdict}</div>}
                  </Card>
                </Section>
              )}

              {/* Similarité */}
              {result.competitor_similarity && (
                <Section title={t.competitorSimilarity} color="#f59e0b">
                  <Card>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
                      {sameKeys.map((key,i) => (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, background: result.competitor_similarity[key]?"rgba(239,68,68,.12)":surf2, border:`1px solid ${result.competitor_similarity[key]?"#ef4444":bord}`, fontSize:11, color: result.competitor_similarity[key]?"#ef4444":muted }}>
                          <span>{result.competitor_similarity[key]?"✓":"✗"}</span>
                          <span>{t.sameLabels[i]}</span>
                        </div>
                      ))}
                    </div>
                    {result.competitor_similarity.verdict && <div style={{ borderTop:`1px solid ${bord}`, paddingTop:10, fontSize:12, color:txt, fontStyle:"italic" }}>{result.competitor_similarity.verdict}</div>}
                  </Card>
                </Section>
              )}

              {/* Hypothèses */}
              {(result.analysis_trace?.critical_assumptions_used?.length > 0 || result.analysis_trace?.assumptions_that_if_wrong_change_everything?.length > 0) && (
                <Section title={t.assumptions} color="#f97316">
                  <Card>
                    {result.analysis_trace?.critical_assumptions_used?.length > 0 && (
                      <div style={{ marginBottom:14 }}>
                        <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>{t.assumptionsUsed}</div>
                        {result.analysis_trace.critical_assumptions_used.map((a: string, i: number) => (
                          <div key={i} style={{ fontSize:12, color:txt, marginBottom:5, display:"flex", gap:8, lineHeight:1.5 }}>
                            <span style={{ color:"#f59e0b", flexShrink:0 }}>→</span>{a}
                          </div>
                        ))}
                      </div>
                    )}
                    {result.analysis_trace?.assumptions_that_if_wrong_change_everything?.length > 0 && (
                      <div>
                        <div style={{ fontSize:10, fontWeight:700, color:"#ef4444", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>{t.assumptionsRisk}</div>
                        {result.analysis_trace.assumptions_that_if_wrong_change_everything.map((a: string, i: number) => (
                          <div key={i} style={{ fontSize:12, color:txt, marginBottom:5, display:"flex", gap:8, lineHeight:1.5 }}>
                            <span style={{ color:"#ef4444", flexShrink:0 }}>⚡</span>{a}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </Section>
              )}

              {/* Amazon */}
              <div style={{ background:surf, border:`1px solid ${bord}`, borderRadius:13, padding:"14px 18px", marginBottom:24, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                <div style={{ fontSize:12, color:muted }}>{t.amazonTitle}</div>
                <a href={`https://www.amazon.ca/s?k=${encodeURIComponent(idea.slice(0,80))}`} target="_blank" rel="noopener noreferrer"
                  style={{ background:"#f90", color:"#111", border:"none", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer", textDecoration:"none", whiteSpace:"nowrap" }}>
                  {t.amazonLink}
                </a>
              </div>

            </div>
          )}

          <div style={{ marginTop:"auto", paddingTop:10, fontSize:10, color:muted, opacity:.4, textAlign:"center" }}>© IdeaAnalysis · echosai.ca</div>
        </div>

        {/* COL DROITE */}
        <aside className="idea-col-right" style={{ paddingTop:16, display:"flex", flexDirection:"column", gap:8, paddingLeft:10 }}>
          {/* Dark + Lang */}
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={() => setDark(d => !d)} style={{ background:surf2, border:`1px solid ${bord}`, borderRadius:8, padding:"6px 10px", cursor:"pointer", fontSize:13, color:muted, fontWeight:700 }}>{dark?t.light:t.dark}</button>
            <button onClick={() => setLang(l => l==="fr"?"en":"fr")} style={{ flex:1, background:surf2, border:`1px solid ${bord}`, borderRadius:8, padding:"6px 8px", cursor:"pointer", fontSize:11, color:txt, fontWeight:700 }}>
              {lang==="fr"?"🇫🇷 FR":"🇬🇧 EN"}
            </button>
          </div>

          {/* Connecté */}
          {user && (
            <div style={{ position:"relative" }}>
              <button onClick={() => setShowUserMenu(v => !v)} style={{ width:"100%", background:"#16a34a", border:"none", borderRadius:8, padding:"6px 10px", cursor:"pointer", fontSize:11, color:"#fff", fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#86efac", display:"inline-block" }} />
                {t.connected}<span style={{ marginLeft:"auto", fontSize:8, opacity:.7 }}>{showUserMenu?"▲":"▼"}</span>
              </button>
              {showUserMenu && (
                <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:surf, border:`1px solid ${bord}`, borderRadius:9, overflow:"hidden", zIndex:100 }}>
                  <button onClick={handleLogout} style={{ width:"100%", padding:"8px 12px", fontSize:11, color:"#ef4444", background:"none", border:"none", cursor:"pointer", fontWeight:600, textAlign:"left" }}>↩ {t.logout}</button>
                </div>
              )}
            </div>
          )}

          {/* Don */}
          <div style={{ background:surf, border:`1px solid ${bord}`, borderRadius:11, overflow:"hidden" }}>
            <div style={{ padding:"10px 12px 8px" }}>
              <div style={{ fontWeight:800, fontSize:13, marginBottom:4 }}>☕ {t.donTitle}</div>
              <div style={{ fontSize:11, color:muted, lineHeight:1.5, marginBottom:10 }}>{t.donDesc}</div>
              <button onClick={() => setDonOpen(d => !d)} style={{ width:"100%", background:acc, color:"#000", border:"none", borderRadius:9, padding:"9px 0", fontWeight:800, fontSize:12, cursor:"pointer" }}>
                {donOpen ? t.donClose : t.donBtn}
              </button>
            </div>
            {donOpen && (
              <div style={{ borderTop:`1px solid ${bord}`, padding:"8px 12px", display:"flex", flexDirection:"column", gap:5 }}>
                {DONATION_PLANS.map(d => (
                  <button key={d.plan} onClick={() => handleDon(d.plan)} disabled={donLoading===d.plan}
                    style={{ background:surf2, border:`1px solid ${bord}`, borderRadius:7, padding:"7px 9px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", opacity: donLoading===d.plan?.6:1, color:txt }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700 }}>{lang==="fr"?d.name:d.nameEn}</div>
                      <div style={{ fontSize:10, color:muted }}>{lang==="fr"?d.desc:d.descEn}</div>
                    </div>
                    <div style={{ fontSize:14, fontWeight:900, color:acc }}>{d.amount}</div>
                  </button>
                ))}
                <div style={{ fontSize:9, color:muted, textAlign:"center" }}>🔒 Stripe</div>
              </div>
            )}
          </div>

          {/* Connexion si pas connecté */}
          {!user && (
            <div style={{ background:surf, border:`1px solid ${bord}`, borderRadius:11, padding:"10px 12px", display:"flex", flexDirection:"column", gap:6 }}>
              <div style={{ fontSize:9, fontWeight:700, color:muted, letterSpacing:1, textTransform:"uppercase", marginBottom:1 }}>Compte Echo</div>
              <button onClick={handleGoogle} style={{ ...btnOAuth({ background:"#fff", color:"#374151" }) }}>
                <svg width="13" height="13" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.18 2.18 5.94l3.66 2.84c.87-2.6 3.3-4.4 6.16-4.4z" fill="#EA4335"/></svg>
                Google
              </button>
              <button onClick={handleMicrosoft} style={{ ...btnOAuth({ background: dark?"#2d2b28":"#1a1917", color:"#fff" }) }}>
                <svg width="13" height="13" viewBox="0 0 23 23" fill="none"><path d="M0 0H11V11H0V0Z" fill="#F25022"/><path d="M12 0H23V11H12V0Z" fill="#7FBA00"/><path d="M0 12H11V23H0V12Z" fill="#00A4EF"/><path d="M12 12H23V23H12V12Z" fill="#FFB900"/></svg>
                Microsoft
              </button>
              <button onClick={() => { setEmailMode("signin"); setAuthError(null); setAuthSuccess(null); setShowEmailModal(true); }} style={{ ...btnOAuth({ background:"#0ea5e9", color:"#fff" }) }}>✉ {lang==="fr"?"Se connecter":"Sign in"}</button>
              <button onClick={() => { setEmailMode("signup"); setAuthError(null); setAuthSuccess(null); setShowEmailModal(true); }} style={{ ...btnOAuth({ background:surf2 }) }}>✦ {lang==="fr"?"Créer un compte":"Create account"}</button>
            </div>
          )}
        </aside>
      </div>

      {/* BARRE MOBILE */}
      <div className="idea-mobile-bar" style={{ "--surf": dark?"#111118":"#fffdf9","--bord": dark?"rgba(255,255,255,.08)":"#e2ddd5" } as React.CSSProperties}>
        <button onClick={() => setDark(d => !d)} style={{ background:surf2, border:`1px solid ${bord}`, borderRadius:8, padding:"7px 11px", fontSize:13, color:muted, fontWeight:700, cursor:"pointer" }}>{dark?t.light:t.dark}</button>
        <button onClick={() => setLang(l => l==="fr"?"en":"fr")} style={{ background:surf2, border:`1px solid ${bord}`, borderRadius:8, padding:"7px 11px", fontSize:11, color:txt, fontWeight:700, cursor:"pointer" }}>
          {lang==="fr"?"🇫🇷 FR":"🇬🇧 EN"}
        </button>
        <div style={{ position:"relative", flex:1, display:"flex", justifyContent:"center" }}>
          <button onClick={() => setDonOpen(d => !d)} style={{ background:acc, color:"#000", border:"none", borderRadius:10, padding:"9px 16px", fontSize:12, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
            ☕ {lang==="fr"?"Don café":"Buy coffee"}
          </button>
          {donOpen && (
            <div style={{ position:"absolute", bottom:"calc(100% + 8px)", left:"50%", transform:"translateX(-50%)", background:surf, border:`1px solid ${bord}`, borderRadius:14, padding:"14px", zIndex:300, minWidth:250, boxShadow:"0 -4px 28px rgba(0,0,0,.2)" }}>
              <div style={{ fontWeight:800, fontSize:12, marginBottom:10, display:"flex", justifyContent:"space-between", color:txt }}>
                ☕ {lang==="fr"?"Soutenir l'outil":"Support the tool"}
                <button onClick={() => setDonOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:muted, fontSize:16 }}>✕</button>
              </div>
              {DONATION_PLANS.map(d => (
                <button key={d.plan} onClick={() => handleDon(d.plan)} style={{ width:"100%", background:surf2, border:`1px solid ${bord}`, borderRadius:9, padding:"8px 12px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6, color:txt }}>
                  <div><div style={{ fontSize:12, fontWeight:700 }}>{lang==="fr"?d.name:d.nameEn}</div><div style={{ fontSize:10, color:muted }}>{lang==="fr"?d.desc:d.descEn}</div></div>
                  <div style={{ fontSize:14, fontWeight:900, color:acc }}>{d.amount}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        {user
          ? <button onClick={handleLogout} style={{ background:"#16a34a", border:"none", borderRadius:8, padding:"7px 11px", fontSize:11, color:"#fff", fontWeight:700, cursor:"pointer" }}>{t.connected}</button>
          : <button onClick={() => setShowAuthPopup(true)} style={{ background:acc, color:"#000", border:"none", borderRadius:8, padding:"7px 12px", fontSize:11, fontWeight:700, cursor:"pointer" }}>{lang==="fr"?"Se connecter":"Sign in"}</button>
        }
      </div>

      {/* POPUP AUTH */}
      {showAuthPopup && (
        <div onClick={() => setShowAuthPopup(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, backdropFilter:"blur(8px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background:surf, border:`1px solid ${bord}`, borderRadius:20, padding:"28px 28px 22px", width:320, display:"flex", flexDirection:"column", gap:14, position:"relative" }}>
            <button onClick={() => setShowAuthPopup(false)} style={{ position:"absolute", top:14, right:16, background:"none", border:"none", cursor:"pointer", color:muted, fontSize:18 }}>✕</button>
            <div style={{ textAlign:"center", marginBottom:4 }}>
              <div style={{ fontSize:28, marginBottom:8 }}>💡</div>
              <div style={{ fontWeight:800, fontSize:15, color:txt, marginBottom:4 }}>{t.authTitle}</div>
              <div style={{ fontSize:12, color:muted, lineHeight:1.5 }}>{t.authSub}</div>
            </div>
            <button onClick={() => { handleGoogle(); setShowAuthPopup(false); }} style={{ ...btnOAuth({ background:"#fff", color:"#374151" }) }}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.18 2.18 5.94l3.66 2.84c.87-2.6 3.3-4.4 6.16-4.4z" fill="#EA4335"/></svg>
              {t.authGoogle}
            </button>
            <button onClick={() => { handleMicrosoft(); setShowAuthPopup(false); }} style={{ ...btnOAuth({ background: dark?"#2d2b28":"#1a1917", color:"#fff" }) }}>
              <svg width="16" height="16" viewBox="0 0 23 23" fill="none"><path d="M0 0H11V11H0V0Z" fill="#F25022"/><path d="M12 0H23V11H12V0Z" fill="#7FBA00"/><path d="M0 12H11V23H0V12Z" fill="#00A4EF"/><path d="M12 12H23V23H12V12Z" fill="#FFB900"/></svg>
              {t.authMicrosoft}
            </button>
            <button onClick={() => { setEmailMode("signin"); setAuthError(null); setAuthSuccess(null); setShowEmailModal(true); setShowAuthPopup(false); }} style={{ ...btnOAuth({ background:"#0ea5e9", color:"#fff" }) }}>✉ {t.authEmail}</button>
            <button onClick={() => { setEmailMode("signup"); setAuthError(null); setAuthSuccess(null); setShowEmailModal(true); setShowAuthPopup(false); }} style={{ ...btnOAuth({ background:surf2 }) }}>✦ {t.authSignup}</button>
            <div style={{ fontSize:10, color:muted, textAlign:"center" }}>{lang==="fr"?"Gratuit · Aucune carte requise":"Free · No card required"}</div>
          </div>
        </div>
      )}

      {/* POPUP COMMENT ÇA MARCHE */}
      {showHow && (
        <div onClick={() => setShowHow(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, backdropFilter:"blur(8px)", padding:20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:surf, border:`1px solid ${bord}`, borderRadius:20, padding:"28px 28px 22px", width:"100%", maxWidth:480, display:"flex", flexDirection:"column", gap:20, position:"relative", maxHeight:"90vh", overflowY:"auto" }}>
            <button onClick={() => setShowHow(false)} style={{ position:"absolute", top:14, right:16, background:"none", border:"none", cursor:"pointer", color:muted, fontSize:18 }}>✕</button>
            <div style={{ fontWeight:900, fontSize:18, color: dark?"#fff":"#1a1917" }}>{t.howTitle}</div>
            {t.howSteps.map((step, i) => (
              <div key={i} style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                <div style={{ fontSize:24, flexShrink:0, marginTop:2 }}>{step.icon}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color: dark?"#fff":"#1a1917", marginBottom:4 }}>{step.title}</div>
                  <div style={{ fontSize:13, color:muted, lineHeight:1.6 }}>{step.desc}</div>
                </div>
              </div>
            ))}
            <button onClick={() => setShowHow(false)} style={{ background:acc, color:"#000", border:"none", borderRadius:10, padding:"11px 0", fontWeight:800, fontSize:14, cursor:"pointer", marginTop:4 }}>{t.howClose}</button>
          </div>
        </div>
      )}

      {/* MODAL EMAIL */}
      {showEmailModal && (
        <div onClick={() => setShowEmailModal(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:400, backdropFilter:"blur(6px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background:surf, border:`1px solid ${bord}`, borderRadius:16, padding:"22px 26px", width:300, display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontWeight:700, fontSize:13 }}>{emailMode==="signin"?t.modalSignin:t.modalSignup}</div>
              <button onClick={() => setShowEmailModal(false)} style={{ background:"none", border:"none", cursor:"pointer", color:muted, fontSize:16 }}>✕</button>
            </div>
            {authError   && <div style={{ background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:8, padding:"7px 10px", fontSize:11, color:"#b91c1c" }}>⚠️ {authError}</div>}
            {authSuccess && <div style={{ background:"#f0fdf4", border:"1px solid #86efac", borderRadius:8, padding:"7px 10px", fontSize:11, color:"#15803d" }}>✓ {authSuccess}</div>}
            <form onSubmit={handleEmailAuth} style={{ display:"flex", flexDirection:"column", gap:9 }}>
              <input type="email" placeholder="nom@domaine.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required style={{ background:surf2, border:`1px solid ${bord}`, borderRadius:8, padding:"8px 11px", fontSize:12, color:txt, outline:"none" }} />
              <input type="password" placeholder="••••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required style={{ background:surf2, border:`1px solid ${bord}`, borderRadius:8, padding:"8px 11px", fontSize:12, color:txt, outline:"none" }} />
              <button type="submit" style={{ background:acc, color:"#000", border:"none", borderRadius:8, padding:"9px 0", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                {emailMode==="signin"?t.submitSignin:t.submitSignup}
              </button>
            </form>
            <button onClick={() => { setEmailMode(emailMode==="signin"?"signup":"signin"); setAuthError(null); setAuthSuccess(null); }} style={{ background:"none", border:"none", cursor:"pointer", color:muted, fontSize:10, textDecoration:"underline" }}>
              {emailMode==="signin"?t.switchToSignup:t.switchToSignin}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea, input, select { font-family: inherit; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }
        @media (max-width: 768px) {
          .idea-layout { grid-template-columns: 1fr !important; }
          .idea-col-left, .idea-col-right { display: none !important; }
          .idea-col-centre { padding: 16px 14px 80px !important; }
          .idea-mobile-bar { display: flex !important; }
          .idea-mobile-pubs { display: flex !important; }
        }
        @media (min-width: 769px) { .idea-mobile-bar { display: none !important; } }
        .idea-mobile-bar {
          position: fixed; bottom: 0; left: 0; right: 0; display: none;
          background: var(--surf, #111118); border-top: 1px solid var(--bord, rgba(255,255,255,.08));
          padding: 8px 14px 12px; gap: 8px; z-index: 50;
          align-items: center; justify-content: space-between;
        }
        @media (max-width: 600px) {
          div[style*="gridTemplateColumns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}