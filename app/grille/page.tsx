"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { supabase } from "../lib/supabase";

// ── LOGOS POUR L'AUTHENTIFICATION MODALE ─────────────────────────────────────
const MicrosoftLogo = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23" fill="none">
    <path d="M0 0H11V11H0V0Z" fill="#F25022"/>
    <path d="M12 0H23V11H12V0Z" fill="#7FBA00"/>
    <path d="M0 12H11V23H0V12Z" fill="#00A4EF"/>
    <path d="M12 12H23V23H12V12Z" fill="#FFB900"/>
  </svg>
);

const GoogleLogo = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 2.18 2.18 4.94l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

export default function Home() {
  const { userTier, lang, setLang } = useApp();
  const [user, setUser] = useState<any>(null);
  const [activeRow, setActiveRow] = useState<number | null>(0);
  
  const [showAuthBox, setShowAuthBox] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ 
      provider: "google", 
      options: { redirectTo: `${window.location.origin}/grille` } 
    });
  };

  const handleMicrosoft = async () => {
    await supabase.auth.signInWithOAuth({ 
      provider: "azure", 
      options: { redirectTo: `${window.location.origin}/grille`, scopes: "openid profile email" } 
    });
  };

  const handleEmailSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
    setAuthLoading(false);
    if (error) setAuthError(error.message);
    else setShowAuthBox(false);
  };

  const handleEmailSignUp = async () => {
    setAuthError(null);
    setAuthLoading(true);
    const { error } = await supabase.auth.signUp({ 
      email: authEmail.trim(), 
      password: authPassword, 
      options: { emailRedirectTo: `${window.location.origin}/grille` } 
    });
    setAuthLoading(false);
    if (error) setAuthError(error.message);
    else setAuthSuccess(lang === "fr" ? "Lien envoyé !" : "Link sent!");
  };

  const tools = [
    {
      id: "01",
      title: "WORLD",
      tag: lang === "fr" ? "SIMULATION INTERNATIONALE" : "INTERNATIONAL SIMULATION",
      desc: lang === "fr" 
        ? "Soumettez vos thématiques au monde entier et laissez l'IA simuler les réactions en temps réel. Choisissez votre allégeance pour obtenir un verdict final global et structuré." 
        : "Submit your topics to the entire world and let AI simulate real-time reactions. Choose your allegiance to secure a final structured global verdict.",
      actionText: lang === "fr" ? "DÉPLOYER LE MODULE WORLD" : "DEPLOY WORLD MODULE",
      toolImage: "/worldmini.png",
      href: "/world",
    },
    {
      id: "02",
      title: "FASTBILLING",
      tag: lang === "fr" ? "FACTURATION ÉCLAIR" : "LIGHTNING INVOICING",
      desc: lang === "fr" 
        ? "Générez des factures professionnelles impeccables en 30 secondes sans vous casser la tête. Remplissez simplement les variables essentielles et laissez l'intelligence artificielle agir pour créer le document PDF." 
        : "Generate flawless professional invoices in 30 seconds flat with zero hassle. Simply fill in the essential fields and let the AI build your ready-to-export PDF document.",
      actionText: lang === "fr" ? "INITIALISER FASTBILLING" : "INITIALIZE FASTBILLING",
      toolImage: "/facturemini.png",
      href: "/fastbilling",
    },
    {
      id: "03",
      title: "AVIS UTILISATEUR",
      tag: lang === "fr" ? "VÉRIFICATION AVANT ACHAT" : "PRE-PURCHASE AUDIT",
      desc: lang === "fr" 
        ? "Obtenez un véritable avis objectif et approfondi avant d'effectuer un investissement ou un achat important. L'intelligence artificielle filtre le faux du vrai pour vous prémunir contre les mauvaises surprises." 
        : "Get a genuine, objective and deep review before making an investment or a major purchase. The artificial intelligence filters out the noise to guard you against unexpected regrets.",
      actionText: lang === "fr" ? "EXÉCUTER L'AUDIT D'AVIS" : "EXECUTE REVIEW AUDIT",
      toolImage: "/avismini.png",
      href: "/avis",
    },
    {
      id: "04",
      title: "ANALYSE IDÉE",
      tag: lang === "fr" ? "DIAGNOSTIC DE PROJET" : "PROJECT DIAGNOSTIC",
      desc: lang === "fr" 
        ? "Découvrez le plein potentiel de votre concept ou de votre future entreprise. Soumettez votre idée brute pour recevoir un plan d'analyse claire, structuré et modélisé selon les réalités du marché actuel." 
        : "Discover the full potential of your business concept or project. Submit your raw idea to receive a clear, structured analysis roadmap mapped to current market realities.",
      actionText: lang === "fr" ? "LANCER L'ANALYSE CORE" : "LAUNCH CORE ANALYSIS",
      toolImage: "/ideamini.png",
      href: "/idea",
    },
    {
      id: "05",
      title: "CLAVARDER & CALENDAR",
      tag: lang === "fr" ? "INTERFACE AGENTIQUE ET COMPORTEMENTALE" : "AGENTIC & BEHAVIORAL INTERFACE",
      desc: lang === "fr" 
        ? "Parlez à Echo, une IA polyvalente dotée de boutons comportementaux exclusifs pour basculer instantanément selon vos besoins précis. Entièrement agentique, elle interagit directement avec votre calendrier pour planifier et synchroniser vos rendez-vous Google Agenda de manière autonome." 
        : "Talk to Echo, a versatile AI powered by exclusive behavioral buttons to instantly shift modes for specific needs. Fully agentic, it actively communicates with your calendar to schedule and synchronize Google Calendar slots autonomously.",
      actionText: lang === "fr" ? "OUVRIR LE PROCESSEUR DE DIALOGUE" : "OPEN DIALOGUE PROCESSOR",
      toolImage: "/talkmini.png",
      href: "/chat",
    },
    {
      id: "06",
      title: "LIVRES",
      tag: lang === "fr" ? "COMPAGNON DE COMPOSITION" : "COMPOSITION COMPANION",
      desc: lang === "fr" 
        ? "Structurez et écrivez votre prochain livre ou essai sans stress. Avancez main dans la main avec un compagnon d'écriture IA intelligent capable de maintenir une cohérence et une mémoire de vos chapitres." 
        : "Structure and write your next book or essay entirely stress-free. Move smoothly hand in hand with an intelligent AI writing companion capable of maintaining context across all your chapters.",
      actionText: lang === "fr" ? "ACCÉDER AU STUDIO LITTÉRAIRE" : "ACCESS LITERARY STUDIO",
      toolImage: "/pub.jpg",
      href: "/books",
    },
    {
      id: "07",
      title: "HORIZON DEEP SEARCH",
      tag: lang === "fr" ? "RECHERCHE WEB PROFONDE" : "DEEP WEB RESEARCH",
      desc: lang === "fr" 
        ? "Effectuez des recherches stratégiques entièrement centrées sur vos besoins réels. Horizon contourne intelligemment les redirections publicitaires et les pièges SEO pour extraire uniquement la substantifique moelle d'Internet." 
        : "Conduct algorithmic research targeted directly to your actual needs. Horizon smart-scans past advertising clutter and SEO biases to extract only the core valid data from the web.",
      actionText: lang === "fr" ? "INITIALISER HORIZON" : "INITIALIZE HORIZON",
      toolImage: "/worldmini.png", // Modifié temporairement selon tes images dispo
      href: "/horizonweb",
    },
    {
      id: "08",
      title: "VITALITÉ",
      tag: lang === "fr" ? "BIO-MONITORING & TRAQUEUR" : "BIO-MONITORING & TRACKER",
      desc: lang === "fr" 
        ? "Gérez intelligemment votre budget financier mensuel tout en surveillant rigoureusement vos objectifs nutritionnels et votre déficit calorique quotidien au sein d'une seule console unifiée." 
        : "Smart-manage your monthly financial budget while rigorously monitoring your nutritional goals and daily caloric deficits inside a single unified tactical dashboard.",
      actionText: lang === "fr" ? "CHARGER VITALITÉ" : "LOAD VITALITY",
      toolImage: "/pub.jpg",
      href: "/vitality",
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-cyan-500/20 selection:text-cyan-900 antialiased relative">
      
      {/* ────────────────────────────────────────────────────────────── */}
      {/* SECTION HAUTE : RÉDUITE DE 30% AVEC BRANDING COMPLET           */}
      {/* ────────────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-zinc-200 pb-12 relative z-30">
        <header className="border-b border-zinc-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center relative">
            <div className="flex items-center gap-6">
              <h1 className="text-sm font-mono font-black tracking-[0.25em] text-zinc-900 uppercase">
                ECHOSAI
              </h1>
              <div className="flex border border-zinc-200 rounded-lg overflow-hidden font-mono text-[10px]">
                <button onClick={() => setLang("fr")} className={`px-2 py-1 ${lang === "fr" ? "bg-zinc-900 text-white font-bold" : "bg-zinc-50 text-zinc-400 hover:text-zinc-600"}`}>FR</button>
                <button onClick={() => setLang("en")} className={`px-2 py-1 ${lang === "en" ? "bg-zinc-900 text-white font-bold" : "bg-zinc-50 text-zinc-400 hover:text-zinc-600"}`}>EN</button>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-mono relative">
              {user ? (
                <div className="flex items-center gap-4">
                  <span className="text-[11px] text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200">
                    🟢 {user.email}
                  </span>
                  <button onClick={() => supabase.auth.signOut()} className="text-[11px] text-red-500 hover:text-red-700 transition-colors uppercase font-bold">
                    [ {lang === "fr" ? "Déconnexion" : "Sign Out"} ]
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <button 
                    onClick={() => setShowAuthBox(!showAuthBox)} 
                    className="px-4 py-2 border border-zinc-900 text-zinc-900 rounded-xl hover:bg-zinc-900 hover:text-white transition-all font-bold tracking-tight shadow-sm"
                  >
                    {lang === "fr" ? "Connexion" : "Sign In"}
                  </button>

                  {/* Boîte d'authentification Dropdown */}
                  {showAuthBox && (
                    <div className="absolute right-0 top-12 w-80 bg-zinc-950 text-zinc-50 rounded-2xl p-5 border border-zinc-800 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                      <div className="text-center mb-2">
                        <h3 className="text-white font-black text-[11px] uppercase tracking-wider">{lang === "fr" ? "AUTHENTIFICATION REQUISE" : "AUTHENTICATION REQUIRED"}</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleGoogle} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all">
                          <GoogleLogo /> <span className="text-white text-[9px] font-bold">GOOGLE</span>
                        </button>
                        <button onClick={handleMicrosoft} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all">
                          <MicrosoftLogo /> <span className="text-white text-[9px] font-bold">MICROSOFT</span>
                        </button>
                      </div>

                      <div className="h-px bg-zinc-900 my-2" />

                      <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder={lang === "fr" ? "Courriel" : "Email"} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white outline-none text-[11px]" />
                      <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder={lang === "fr" ? "Mot de passe" : "Password"} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white outline-none text-[11px]" />
                      {authError && <p className="text-red-400 text-[10px]">{authError}</p>}
                      {authSuccess && <p className="text-emerald-400 text-[10px]">{authSuccess}</p>}
                      
                      <button onClick={authMode === "signin" ? handleEmailSignIn : handleEmailSignUp} className="w-full py-2 bg-cyan-500 text-zinc-950 font-bold rounded-xl uppercase text-[10px] tracking-wider transition-colors hover:bg-cyan-400">
                        {authLoading ? "..." : authMode === "signin" ? (lang === "fr" ? "Se connecter" : "Connect") : (lang === "fr" ? "S'enregistrer" : "Register")}
                      </button>

                      <div className="text-center pt-1">
                        <button onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")} className="text-zinc-500 text-[10px] hover:text-zinc-300 underline">
                          {authMode === "signin" ? (lang === "fr" ? "Pas de compte? Créer" : "No account? SignUp") : (lang === "fr" ? "Déjà un compte? Connexion" : "Have account? SignIn")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="ml-2 px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded-md text-[10px] uppercase font-bold">
                {userTier === "connected_free" ? (lang === "fr" ? "ACCÈS LIBRE" : "FREE TIER") : userTier?.toUpperCase() || (lang === "fr" ? "VISITEUR" : "GUEST")}
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section Épurée */}
        <div className="max-w-7xl mx-auto px-6 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-8">
            <div className="inline-block text-[10px] font-mono tracking-widest text-zinc-400 uppercase mb-3 border border-zinc-200 px-2 py-0.5 rounded">
              {lang === "fr" ? "Statut Écosystème: En Ligne" : "Ecosystem Status: Online"}
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 leading-[1.0] mb-4 uppercase">
              {lang === "fr" ? "Des outils qui te facilitent la vie" : "Tools that make your life easier"}
            </h2>
            <p className="text-zinc-500 max-w-lg text-xs md:text-sm font-light font-sans leading-relaxed">
              {lang === "fr" ? "Survolez un module ci-dessous pour déployer instantanément la console de configuration et inspecter son interface." : "Hover over any module below to instantly deploy the configuration console and inspect its layout."}
            </p>
          </div>

          <div className="lg:col-span-4 flex justify-center lg:justify-end relative min-h-[180px]">
            <img src="/echo1.png" alt="Echo AI Core System" className="w-full max-w-[220px] h-auto object-contain drop-shadow-[0_10px_25px_rgba(6,182,212,0.08)]" />
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* SECTION BASSE : NOIR MINÉRAL ABSOLU                            */}
      {/* ────────────────────────────────────────────────────────────── */}
      <section className="bg-zinc-950 text-zinc-50 py-12 relative overflow-hidden border-t border-zinc-900 z-20">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-0 relative z-10">

          <div className="border-t border-zinc-900">
            {tools.map((tool, index) => {
              const isOpen = activeRow === index;
              return (
                <div
                  key={tool.id}
                  onMouseEnter={() => setActiveRow(index)}
                  className={`border-b border-zinc-900 transition-all duration-300 ${isOpen ? "bg-zinc-900/50" : "hover:bg-zinc-900/10"}`}
                >
                  {/* LIGNE COMPACTE SANS POLLUTION */}
                  <div className="px-6 md:px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none">
                    <div className="flex items-baseline gap-6 md:w-1/3">
                      <h3 className={`text-xl font-black tracking-tight uppercase transition-colors ${isOpen ? "text-cyan-400" : "text-zinc-300"}`}>{tool.title}</h3>
                    </div>
                    <div className="md:w-1/2">
                      <p className={`font-sans text-xs md:text-sm truncate max-w-xl transition-colors ${isOpen ? "text-zinc-100" : "text-zinc-500"}`}>{tool.desc}</p>
                    </div>
                    <div className="md:w-1/6 flex md:justify-end text-[10px] font-bold font-mono tracking-wider">
                      <span className={isOpen ? "text-cyan-400 animate-pulse" : "text-zinc-700"}>{isOpen ? `● ${lang === "fr" ? "ACTIF" : "ACTIVE"}` : `○ ${lang === "fr" ? "INSPECTER" : "INSPECT"}`}</span>
                    </div>
                  </div>

                  {/* TIROIR DE DEPLOYEMENT MAXIMUM (h-72 / max-h-[500px]) */}
                  <div className={`transition-all duration-500 ease-in-out overflow-hidden bg-zinc-950 ${isOpen ? "max-h-[500px] opacity-100 border-t border-dashed border-zinc-900" : "max-h-0 opacity-0 pointer-events-none"}`}>
                    <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                      
                      {/* INSTRUCTIONS DE SÉLECTION & ACTIVATION TACTIQUE */}
                      <div className="md:col-span-7 flex flex-col justify-between h-full min-h-[180px]">
                        <p className="font-sans text-xs md:text-sm leading-relaxed text-zinc-200 max-w-xl mb-6">{tool.desc}</p>
                        
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 w-full max-w-xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-inner">
                          <span className="text-[11px] font-mono font-bold tracking-wider text-zinc-400 uppercase">{tool.tag}</span>
                          
                          <Link href={tool.href} className="group/lever w-full sm:w-auto shrink-0 bg-zinc-950 border-2 border-zinc-800 hover:border-cyan-500/50 rounded-xl px-5 py-3.5 flex items-center justify-between sm:justify-center gap-4 transition-all duration-300 shadow-xl active:bg-zinc-900">
                            <span className="text-[10px] font-mono font-black tracking-widest text-zinc-300 group-hover/lever:text-cyan-400 transition-colors">{tool.actionText}</span>
                            <div className="w-8 h-4 bg-zinc-900 rounded-full p-0.5 border border-zinc-800 flex items-center relative overflow-hidden shrink-0">
                              <div className="w-3 h-3 bg-zinc-600 rounded-full transition-all duration-300 transform translate-x-0 group-hover/lever:translate-x-4 group-hover/lever:bg-cyan-500 group-hover/lever:shadow-[0_0_10px_#06b6d4]" />
                            </div>
                          </Link>
                        </div>
                      </div>

                      {/* APERÇU DE L'IMAGE À RATIO FIXE MAXIMUM (h-72) */}
                      <div className="md:col-span-5 flex justify-end">
                        <div className="w-full max-w-[360px] h-72 border border-zinc-800 rounded-2xl relative overflow-hidden bg-zinc-900 shadow-2xl group/img">
                          <div className="absolute top-2 left-2 text-[8px] text-zinc-500 font-mono z-20 bg-zinc-950/90 px-1.5 py-0.5 rounded border border-zinc-800 tracking-wider">PREVIEW_MODE_FULL</div>
                          <div className="absolute inset-0 border border-cyan-500/10 m-1.5 rounded-xl pointer-events-none z-20" />
                          <img 
                            src={tool.toolImage} 
                            alt={tool.title}
                            className="w-full h-full object-cover object-top transition-transform duration-700 group-hover/img:scale-102"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent pointer-events-none z-10" />
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Sync status footer */}
          <div className="mt-12 mx-6 border border-zinc-900 bg-zinc-900/10 rounded-2xl p-6 font-mono text-[11px] text-zinc-600">
            <div className="flex items-center gap-2 text-cyan-500 font-bold mb-2">
              <span className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse" />
              <span>ECHO_CORE_INTEGRATION : GLOBAL_SYNC</span>
            </div>
            <p className="font-sans text-xs text-zinc-600 leading-relaxed max-w-3xl">
              {lang === "fr" 
                ? "Chaque module ne fait pas qu'ouvrir une application : il charge votre contexte partagé. Les informations de vos terminaux restent connectées de manière transparente." 
                : "Each module does more than launch an app: it loads your shared context. Information across your terminals remains seamlessly interconnected."}
            </p>
          </div>

        </div>
      </section>
    </main>
  );
}