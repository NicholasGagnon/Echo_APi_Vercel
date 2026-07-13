"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Lang = "fr" | "en";

// ── NAV EN TUILES POUR LES ONGLETS DU COMPOSANT CENTRAL ──
const DASHBOARD_SECTIONS = [
  { id: "outils", labelFr: "Outils", labelEn: "Tools" },
  { id: "events", labelFr: "Événements", labelEn: "Events" },
  { id: "regles", labelFr: "Règlement", labelEn: "Rules" },
  { id: "moderation", labelFr: "Modération", labelEn: "Moderation" },
];

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

const REGLES = {
  fr: [
    { id: 1, title: "Vérité", text: "Les informations de votre projet doivent être réelles et vérifiables." },
    { id: 2, title: "Identité", text: "Interdiction d'utiliser l'identité ou le projet d'une autre personne." },
    { id: 3, title: "Légitimité", text: "Les faux profils et les projets fictifs sont strictement interdits." },
    { id: 4, title: "Harcèlement", text: "Les messages de menaces, d'insultes ou de haine sont interdits." },
    { id: 5, title: "Spam", text: "La publicité abusive et les envois non sollicités sont interdits." },
    { id: 6, title: "Sécurité", text: "Interdiction de contourner ou de pirater les protections du système." },
    { id: 7, title: "Fraude", text: "Toute tentative d'arnaque ou de vol entraîne une exclusion immédiate." },
    { id: 8, title: "Confidentialité", text: "Les données des fiches débloquées doivent rester secrètes." },
    { id: 9, title: "Respect", text: "Les contenus offensants, haineux ou illégaux sont interdits." },
    { id: 10, title: "Modération", text: "L'équipe peut suspendre ou supprimer un compte en cas d'abus." },
  ],
  en: [
    { id: 1, title: "Truth", text: "Project information must be real and verifiable." },
    { id: 2, title: "Identity", text: "Prohibited to use another person's identity or project." },
    { id: 3, title: "Legitimacy", text: "Fake profiles and fictitious projects are strictly prohibited." },
    { id: 4, title: "Harassment", text: "Threats, insults, or hateful messages are prohibited." },
    { id: 5, title: "Spam", text: "Abusive advertising and unsolicited messages are prohibited." },
    { id: 6, title: "Security", text: "Prohibited to bypass or hack system protections." },
    { id: 7, title: "Fraud", text: "Any scam or theft attempt leads to immediate exclusion." },
    { id: 8, title: "Confidentiality", text: "Data from unlocked profiles must remain secret." },
    { id: 9, title: "Respect", text: "Offensive, hateful, or illegal content is prohibited." },
    { id: 10, title: "Moderation", text: "The team may suspend or delete an account in case of abuse." },
  ],
};

const MODERATION = {
  fr: [
    { id: 1, title: "Sécurité", text: "Ne donnez pas d'informations personnelles (téléphone, courriel) en public." },
    { id: 2, title: "Clarté", text: "Décrivez votre projet avec précision, les fiches vides seront refusées." },
    { id: 3, title: "Respect", text: "Les commentaires des membres doivent rester polis et constructifs." },
    { id: 4, title: "Ego", text: "Critiquez l'idée ou le projet, mais ne vous attaquez jamais à la personne." },
    { id: 5, title: "Anti-Scam", text: "Interdiction de démarcher ou de vendre des services en message privé." },
    { id: 6, title: "Intégrité", text: "Interdiction de publier des projets liés au crack ou au piratage." },
    { id: 7, title: "Signalement", text: "Signalez immédiatement tout comportement qui dépasse les bornes." },
    { id: 8, title: "Entraide", text: "Donnez un maximum de contexte pour recevoir une aide efficace." },
    { id: 9, title: "Objectivité", text: "Restez humble et courtois lorsque vous donnez votre avis." },
    { id: 10, title: "Sanctions", text: "Le non-respect de cette charte mène à un avertissement ou un ban." },
  ],
  en: [
    { id: 1, title: "Security", text: "Do not share personal information (phone, email) publicly." },
    { id: 2, title: "Clarity", text: "Describe your project accurately; empty profiles will be rejected." },
    { id: 3, title: "Respect", text: "Member comments must remain polite and constructive." },
    { id: 4, title: "Ego", text: "Critique the idea or project, but never attack the person." },
    { id: 5, title: "Anti-Scam", text: "Prohibited to cold-pitch or sell services in private messages." },
    { id: 6, title: "Integrity", text: "Prohibited to publish projects related to cracks or piracy." },
    { id: 7, title: "Reporting", text: "Immediately report any behavior that crosses the line." },
    { id: 8, title: "Support", text: "Provide maximum context to receive effective help." },
    { id: 9, title: "Objectivity", text: "Remain humble and courteous when giving your opinion." },
    { id: 10, title: "Sanctions", text: "Non-compliance with these guidelines leads to a warning or ban." },
  ]
};

const EVENTS = {
  fr: [
    { date: "2026-07-15", title: "Lancement officiel de la plateforme", desc: "Ouverture publique — les fiches seront visibles par tous les visiteurs." },
    { date: "2026-08-01", title: "Fonctionnalité Bureau v2", desc: "Nouvelles sections dans le bureau : historique complet et statistiques étendues." },
    { date: "2026-09-01", title: "Programme de vérification", desc: "Les comptes vérifiés recevront un badge de confiance sur leurs fiches." },
  ],
  en: [
    { date: "2026-07-15", title: "Official platform launch", desc: "Public opening — listings will be visible to all visitors." },
    { date: "2026-08-01", title: "Desk v2 feature", desc: "New sections in the desk: full history and extended statistics." },
    { date: "2026-09-01", title: "Verification program", desc: "Verified accounts will receive a trust badge on their listings." },
  ],
};

type Stats = { fiches: number; tunnels: number; interets: number };

export default function DashboardPage() {
  const [lang, setLang] = useState<Lang>("fr");
  const [time, setTime] = useState("");
  const [stats, setStats] = useState<Stats>({ fiches: 0, tunnels: 0, interets: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [activeSection, setActiveSection] = useState<"outils"|"events"|"regles"|"moderation">("outils");
  const [activeRow, setActiveRow] = useState<number | null>(0);

  // ── AUTHENTIFICATION ───────────────────────────────────────────────────────
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [pseudo, setPseudo] = useState<string>("");
  const [pseudoInput, setPseudoInput] = useState<string>("");
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [authEmailMode, setAuthEmailMode] = useState<"signin"|"signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string|null>(null);
  const [authSuccess, setAuthSuccess] = useState<string|null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("username").eq("id", uid).maybeSingle();
    setPseudo(data?.username || "");
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUserId(session.user.id); setUserEmail(session.user.email || null); loadProfile(session.user.id); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
      setUserEmail(session?.user?.email || null);
      if (session?.user) loadProfile(session.user.id); else setPseudo("");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const savePseudo = async () => {
    const clean = pseudoInput.trim();
    if (!clean || !userId) return;
    await supabase.from("profiles").upsert({ id: userId, username: clean, updated_at: new Date().toISOString() });
    setPseudo(clean);
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/dashboard`, scopes: "openid profile email", queryParams: { prompt: "select_account" } } });
  };
  const handleMicrosoft = async () => {
    await supabase.auth.signInWithOAuth({ provider: "azure", options: { redirectTo: `${window.location.origin}/dashboard`, scopes: "openid profile email User.Read" } });
  };
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(null); setAuthSuccess(null); setAuthLoading(true);
    if (authEmailMode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
      if (error) setAuthError(error.message); else setShowAuthPopup(false);
    } else {
      const { data, error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
      if (error) setAuthError(error.message);
      else if (data?.user && (!data.user.identities || data.user.identities.length === 0)) setAuthError("Compte existant.");
      else setAuthSuccess(lang === "fr" ? "Vérifiez votre boîte mail !" : "Check your inbox!");
    }
    setAuthLoading(false);
  };
  const handleLogout = async () => { await supabase.auth.signOut(); setUserId(null); setUserEmail(null); setPseudo(""); setShowUserMenu(false); };

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString(lang==="fr"?"fr-CA":"en-CA", { hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false }));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [lang]);

  useEffect(() => {
    const load = async () => {
      setLoadingStats(true);
      const [{ count: f }, { count: t }, { count: i }] = await Promise.all([
        supabase.from("fiches").select("*", { count:"exact", head:true }),
        supabase.from("tunnels").select("*", { count:"exact", head:true }),
        supabase.from("interets_fiches").select("*", { count:"exact", head:true }),
      ]);
      setStats({ fiches: f||0, tunnels: t||0, interets: i||0 });
      setLoadingStats(false);
    };
    load();
  }, []);

  const tools = [
    {
      title: "WORLD",
      tag: lang === "fr" ? "SIMULATION INTERNATIONALE" : "INTERNATIONAL SIMULATION",
      desc: lang === "fr" ? "Soumettez vos thématiques au monde entier et laissez l'IA simuler les réactions en temps réel. Choisissez votre allégeance pour obtenir un verdict final global et structuré." : "Submit your topics to the entire world and let AI simulate real-time reactions. Choose your allegiance to secure a final structured global verdict.",
      actionText: lang === "fr" ? "DÉPLOYER LE MODULE WORLD" : "DEPLOY WORLD MODULE",
      href: "/world",
      toolImage: "/worldmini.png",
      category: lang === "fr" ? "🚀 Outils Echo" : "🚀 Echo Tools",
    },
    {
      title: "HALL",
      tag: lang === "fr" ? "ESPACE ACCUEIL" : "WELCOME AREA",
      desc: lang === "fr" ? "Accédez au hall principal de la plateforme pour suivre le fil des interactions et découvrir les nouveautés de l'écosystème." : "Access the main platform hall to monitor interactions and discover new ecosystem arrivals.",
      actionText: lang === "fr" ? "ENTRER DANS LE HALL" : "ENTER HALL",
      href: "/",
      toolImage: "/affinity.jpg",
      category: lang === "fr" ? "🏛 Affinité de Projets" : "🏛 Project Affinity",
    },
    {
      title: "CONVERSATION",
      tag: lang === "fr" ? "DIALOGUES INTERACTION" : "INTERACTIVE DIALOGUE",
      desc: lang === "fr" ? "Échangez de manière sécurisée et directe avec vos futurs collaborateurs et associés après mise en relation." : "Securely talk with your aligned partners and community peers directly inside your communication logs.",
      actionText: lang === "fr" ? "OUVRIR LA MESSAGERIE" : "OPEN CONVERSATION",
      href: "/conversation",
      toolImage: "/conv.png",
      category: lang === "fr" ? "🏛 Affinité de Projets" : "🏛 Project Affinity",
    },
    {
      title: lang === "fr" ? "FACTURE RAPIDE" : "FASTBILLING",
      tag: lang === "fr" ? "FACTURATION ÉCLAIR" : "LIGHTNING INVOICING",
      desc: lang === "fr" ? "Générez des factures professionnelles impeccables en 30 secondes sans vous casser la tête. Remplissez simplement les variables essentielles et laissez l'intelligence artificielle agir pour créer le document PDF." : "Generate flawless professional invoices in 30 seconds flat with zero hassle. Simply fill in the essential fields and let the AI build your ready-to-export PDF document.",
      actionText: lang === "fr" ? "INITIALISER LA FACTURE" : "INITIALIZE FASTBILLING",
      href: "/fastbilling",
      toolImage: "/fastureicon.jpg",
      category: lang === "fr" ? "🏗 Espaces métier" : "🏗 Business Spaces",
    },
    {
      title: "AVIS DE LA COMMUNAUTÉ (TALK)",
      tag: lang === "fr" ? "RETROACTION CRITIQUE" : "COMMUNITY FEEDBACK",
      desc: lang === "fr" ? "Présentez votre projet à la communauté sous forme de pitch simple pour collecter des avis constructifs et des idées d'amélioration." : "Pitch your project layout directly to the community to collect fast and strategic objective insights.",
      actionText: lang === "fr" ? "OUVRIR LE SALON CRITIQUE" : "OPEN COMMUNITY TALK",
      href: "/talk",
      toolImage: "/talk.png",
      category: lang === "fr" ? "🏗 Espaces métier" : "🏗 Business Spaces",
    },
    {
      title: "CONTRAT RAPIDE PARTICULIER",
      tag: lang === "fr" ? "DOCUMENTATION JURIDIQUE ÉCLAIR" : "PEER TO PEER CONTRACT",
      desc: lang === "fr" ? "Générez un contrat de vente entre particuliers entièrement légal, clair et adapté en seulement 30 secondes pour sécuriser vos transactions quotidiennes." : "Generate a completely legal, clear peer-to-peer sales contract in just 30 seconds flat to secure your daily transactions smoothly.",
      actionText: lang === "fr" ? "GÉNÉRER LE CONTRAT" : "GENERATE CONTRACT",
      href: "/contrat",
      toolImage: "/contrat.png",
      category: lang === "fr" ? "🏗 Espaces métier" : "🏗 Business Spaces",
    },
    {
      title: "AVIS ACHAT",
      tag: lang === "fr" ? "VÉRIFICATION AVANT ACHAT" : "PRE-PURCHASE AUDIT",
      desc: lang === "fr" ? "Obtenez un véritable avis objectif et approfondi avant d'effectuer un investissement ou un achat important. L'intelligence artificielle filtre le faux du vrai pour vous prémunir contre les mauvaises surprises." : "Get a genuine, objective and deep review before making an investment or a major purchase. The artificial intelligence filters out the noise to guard you against unexpected regrets.",
      actionText: lang === "fr" ? "EXÉCUTER L'AUDIT D'AVIS" : "EXECUTE REVIEW AUDIT",
      href: "/avis",
      toolImage: "/avismini.png",
      category: lang === "fr" ? "🔎 Recherche · Compagnons" : "🔎 Research · Companions",
    },
    {
      title: "HORIZON",
      tag: lang === "fr" ? "RECHERCHE WEB PROFONDE" : "DEEP WEB RESEARCH",
      desc: lang === "fr" ? "Effectuez des recherches stratégiques entièrement centrées sur vos besoins réels. Horizon contourne les redirections publicitaires et les pièges SEO pour extraire uniquement la substantifique moelle d'Internet." : "Conduct algorithmic research targeted directly to your actual needs. Horizon smart-scans past advertising clutter and SEO biases to extract only the core valid data from the web.",
      actionText: lang === "fr" ? "INITIALISER HORIZON" : "INITIALIZE HORIZON",
      href: "/horizonweb",
      toolImage: "/horizon.png",
      category: lang === "fr" ? "🔎 Recherche · Compagnons" : "🔎 Research · Companions",
    },
    {
      title: "LIVRES",
      tag: lang === "fr" ? "COMPAGNON DE COMPOSITION" : "COMPOSITION COMPANION",
      desc: lang === "fr" ? "Structurez et écrivez votre prochain livre ou essai sans stress. Avancez main dans la main avec un compagnon d'écriture IA intelligent capable de maintenir une cohérence et une mémoire de vos chapitres." : "Structure and write your next book or essay entirely stress-free. Move smoothly hand in hand with an intelligent AI writing companion capable of maintaining context across all your chapters.",
      actionText: lang === "fr" ? "ACCÉDER AU STUDIO LITTÉRAIRE" : "ACCESS LITERARY STUDIO",
      href: "/books",
      toolImage: "/books.png",
      category: lang === "fr" ? "🔎 Recherche · Compagnons" : "🔎 Research · Companions",
    },
    {
      title: lang === "fr" ? "ANALYSE D'IDÉE IA" : "AI IDEA ANALYSIS",
      tag: lang === "fr" ? "DIAGNOSTIC DE PROJET" : "PROJECT DIAGNOSTIC",
      desc: lang === "fr" ? "Découvrez le plein potentiel de votre concept ou de votre future entreprise. Soumettez votre idée brute pour recevoir un plan d'analyse claire, structuré et modélisé selon les réalités du marché actuel." : "Discover the full potential of your business concept or project. Submit your raw idea to receive a clear, structured analysis roadmap mapped to current market realities.",
      actionText: lang === "fr" ? "LANCER L'ANALYSE CORE" : "LAUNCH CORE ANALYSIS",
      href: "/idea",
      toolImage: "/idea.png",
      category: lang === "fr" ? "🚀 Outils Echo" : "🚀 Echo Tools",
    },
    {
      title: lang === "fr" ? "SUIVI NUTRITION & SANTÉ" : "VITALITY MONITORING",
      tag: lang === "fr" ? "BIO-MONITORING & TRAQUEUR" : "BIO-MONITORING & TRACKER",
      desc: lang === "fr" ? "Gérez intelligemment votre budget financier mensuel tout en surveillant rigoureusement vos objectifs nutritionnels et votre déficit calorique quotidien." : "Smart-manage your monthly financial budget while rigorously monitoring your nutritional goals and daily caloric deficits.",
      actionText: lang === "fr" ? "CHARGER LA CONSOLE" : "LOAD CONSOLE",
      href: "/vitality",
      toolImage: "/vitality.png",
      category: lang === "fr" ? "🚀 Outils Echo" : "🚀 Echo Tools",
    },
    {
      title: "CALENDRIER",
      tag: lang === "fr" ? "SYNCHRONISATION STRATÉGIQUE" : "TIMELINE MANAGEMENT",
      desc: lang === "fr" ? "Planifiez vos créations de contenus, gérez vos tâches complexes et organisez vos rendez-vous de manière unifiée." : "Schedule content delivery tracks and synchronize your strategic personal milestones seamlessly.",
      actionText: lang === "fr" ? "OUVRIR L'AGENDA" : "OPEN CALENDAR",
      href: "/calendar",
      toolImage: "/idea.png",
      category: lang === "fr" ? "🚀 Outils Echo" : "🚀 Echo Tools",
    }
  ];

  const dict = {
    fr: {
      area: "TABLEAU DE BORD",
      title: "DASHBOARD",
      subtitle: "Tous vos outils, un seul espace.",
      eventsTitle: "Événements à venir",
      eventsEmpty: "Aucun événement planifié pour l'instant.",
      reglesTitle: "Règlement de la plateforme",
      moderationTitle: "Charte de Modération",
      reglesNote: "Ce règlement s'applique à tous les membres dès leur inscription.",
      reglesWarn: "Toute fausse déclaration concernant votre identité, votre entreprise ou votre projet peut entraîner la suppression immédiate de votre compte sans préavis.",
    },
    en: {
      area: "CONTROL PANEL",
      title: "DASHBOARD",
      subtitle: "All your tools, one space.",
      eventsTitle: "Upcoming events",
      eventsEmpty: "No events scheduled yet.",
      reglesTitle: "Platform rules",
      moderationTitle: "Moderation Guidelines",
      reglesNote: "These rules apply to all members from the moment they register.",
      reglesWarn: "Any false statement regarding your identity, company or project may result in immediate account deletion without notice.",
    },
  }[lang];

  return (
    <div className="w-full min-h-screen bg-[#08070a] text-zinc-300 flex flex-col font-sans relative overflow-hidden">

      {/* LUMIÈRE D'AMBIANCE HAUTE */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[500px]"
          style={{background:"radial-gradient(ellipse 50% 80% at 50% 0%, rgba(6,182,212,0.06) 0%, transparent 70%)"}}/>
      </div>

      {/* LIGNES D'ACCENT NUMÉRIQUE SUR LES CÔTÉS */}
      {["left","right"].map(side=>(
        <div key={side} className={`pointer-events-none fixed inset-y-0 ${side==="left"?"left-0":"right-0"} z-0 hidden lg:flex gap-10 px-6 items-stretch`}>
          {[0,1,2].map(i=>(
            <div key={i} className="relative w-3 flex flex-col items-center">
              <div className="absolute inset-y-0 w-full bg-gradient-to-b from-zinc-800/20 via-zinc-700/40 to-zinc-800/20 rounded-full border-x border-zinc-600/10"/>
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-cyan-400/15 to-transparent"/>
              <div className="absolute top-10 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/40 shadow-[0_0_8px_2px_rgba(6,182,212,0.2)]"/>
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/40 shadow-[0_0_8px_2px_rgba(6,182,212,0.2)]"/>
            </div>
          ))}
        </div>
      ))}

      {/* NAV — Modèle bilingue complet unifié sur le Hall */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(5,5,5,.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,.06)",
        padding: "12px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
      }}>
        {/* ZONE 1 — logo + onglets complets */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <Link href="/" style={{ fontWeight: 800, fontSize: 14, letterSpacing: 1, color: "#fff", textDecoration: "none", flexShrink: 0 }}>Echo AI</Link>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { labelFr: "Accueil",              labelEn: "Home",             href: "/" },
              { labelFr: "Tous les outils",      labelEn: "All tools",        href: "/dashboard" },
              { labelFr: "AI Chat",              labelEn: "AI Chat",          href: "/conversation" },
              { labelFr: "Créer un projet",      labelEn: "Create project",   href: "/form" },
              { labelFr: "Explorer les projets", labelEn: "Explore projects", href: "/fiche" },
              { labelFr: "Avis de la communauté",labelEn: "Community feedback", href: "/talk" },
              { labelFr: "Audition de site web", labelEn: "Website audit",    href: "/audit" },
              { labelFr: "Avis de l'IA",         labelEn: "AI feedback",      href: "/idea" },
              { labelFr: "Mon compte",           labelEn: "My account",       href: "/account" },
            ].map(tile => {
              const isActive = tile.href === "/dashboard";
              return (
                <Link key={tile.href} href={tile.href} style={{ textDecoration: "none" }}>
                  <div style={{
                    padding: "6px 12px", borderRadius: 8,
                    background: isActive ? "rgba(0,200,255,.12)" : "rgba(255,255,255,.03)",
                    border: `1px solid ${isActive ? "rgba(0,200,255,.4)" : "rgba(255,255,255,.08)"}`,
                    transition: "all .2s", cursor: "pointer",
                  }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,.07)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.18)"; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.08)"; } }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? "#7fe8ff" : "rgba(255,255,255,.65)", whiteSpace: "nowrap" }}>
                      {lang === "fr" ? tile.labelFr : tile.labelEn}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ZONE 2 — Bureau (premium) + langue + profil à droite */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,.12)", flexShrink: 0 }} />

          {/* BUREAU LOCKED */}
          <div style={{ position: "relative" }}>
            <button style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(201,168,76,.08)", border: "1px solid rgba(201,168,76,.25)",
              borderRadius: 8, padding: "6px 12px", cursor: "not-allowed", opacity: .65,
            }}>
              <span style={{ fontSize: 12 }}>🔒</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#c9a84c", whiteSpace: "nowrap" }}>
                {lang === "fr" ? "Mon Bureau" : "My Desk"}
              </span>
            </button>
          </div>

          {/* LANGUE */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowLangMenu(v => !v)}
              style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "6px 10px", fontSize: 11, color: "rgba(255,255,255,.6)", cursor: "pointer", fontWeight: 700 }}>
              {lang === "fr" ? "FR" : "EN"}
            </button>
            {showLangMenu && (
              <>
                <div onClick={() => setShowLangMenu(false)} className="fixed inset-0 z-40" />
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#111", border: "1px solid rgba(255,255,255,.15)", borderRadius: 10, overflow: "hidden", zIndex: 100, minWidth: 110 }}>
                  {(["fr","en"] as const).map(l => (
                    <button key={l} onClick={() => { setLang(l); setShowLangMenu(false); }}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 11, background: lang === l ? "rgba(0,200,255,.1)" : "transparent", color: lang === l ? "#7fe8ff" : "rgba(255,255,255,.7)", border: "none", cursor: "pointer", fontWeight: lang === l ? 700 : 500 }}>
                      {l === "fr" ? "Français" : "English"}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* PSEUDO / AUTH */}
          {userId ? (
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowUserMenu(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,200,255,.1)", border: "1px solid rgba(0,200,255,.3)", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d3ee", display: "inline-block" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#7fe8ff" }}>{pseudo || (lang === "fr" ? "Choisir un pseudo" : "Choose nickname")}</span>
              </button>
              {showUserMenu && (
                <>
                  <div onClick={() => setShowUserMenu(false)} className="fixed inset-0 z-40" />
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#111", border: "1px solid rgba(255,255,255,.15)", borderRadius: 10, padding: 12, zIndex: 100, minWidth: 220 }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginBottom: 8, wordBreak: "break-all" }}>{userEmail}</div>
                    {!pseudo && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                        <input type="text" value={pseudoInput} onChange={e => setPseudoInput(e.target.value.replace(/[^a-zA-Z0-9_\s-]/g, ""))}
                          placeholder={lang === "fr" ? "Ton pseudo" : "Your nickname"}
                          style={{ background: "#000", border: "1px solid rgba(255,255,255,.15)", borderRadius: 6, padding: "6px 10px", fontSize: 11, color: "#fff", outline: "none" }} />
                        <button onClick={savePseudo} style={{ background: "#00c8ff", color: "#000", border: "none", borderRadius: 6, padding: "6px 0", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                          {lang === "fr" ? "Valider" : "Save"}
                        </button>
                      </div>
                    )}
                    <button onClick={handleLogout} style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "#f87171", fontSize: 11, cursor: "pointer", padding: "4px 0" }}>
                      ↩ {lang === "fr" ? "Se déconnecter" : "Sign out"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button onClick={() => setShowAuthPopup(true)}
              style={{ background: "#00c8ff", color: "#000", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {lang === "fr" ? "Se connecter" : "Sign in"}
            </button>
          )}
        </div>
      </nav>

      {/* ZONE CENTRALE DU DASHBOARD */}
      <div className="relative z-10 flex-1 px-4 lg:px-32 py-12">
        
        {/* EN-TÊTE FLUIDE */}
        <div className="text-center mb-12">
          <p className="text-[10px] font-mono tracking-[0.5em] text-cyan-500 font-bold mb-3">{dict.area}</p>
          <h1 className="text-4xl sm:text-5xl font-extralight tracking-[0.15em] text-white uppercase mb-3" style={{textShadow:"0 0 40px rgba(6,182,212,0.2)"}}>
            {dict.title}
          </h1>
          <div className="w-16 h-px mx-auto bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mb-3"/>
          <p className="text-sm text-zinc-500 italic">{dict.subtitle}</p>
        </div>

        {/* ── INTERRUPTEURS DES ONGLETS DU COMPOSANT CENTRAL ── */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 40 }}>
          {DASHBOARD_SECTIONS.map(tile => {
            const isActive = activeSection === tile.id;
            return (
              <div
                key={tile.id}
                onClick={() => setActiveSection(tile.id as any)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: isActive ? "rgba(0,200,255,.12)" : "rgba(255,255,255,.03)",
                  border: `1px solid ${isActive ? "rgba(0,200,255,.4)" : "rgba(255,255,255,.08)"}`,
                  transition: "all .2s",
                  cursor: "pointer",
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,.07)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.18)"; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.08)"; } }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? "#7fe8ff" : "rgba(255,255,255,.65)", whiteSpace: "nowrap" }}>
                  {lang === "fr" ? tile.labelFr : tile.labelEn}
                </span>
              </div>
            );
          })}
          
          <div
            onClick={() => setLang(l => l === "fr" ? "en" : "fr")}
            style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", cursor: "pointer", transition: "all .2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.07)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.18)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.08)"; }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.65)" }}>
              {lang === "fr" ? "EN" : "FR"}
            </span>
          </div>
        </div>

        {/* SECTION DE CONTENU ADAPTATIVE */}
        <div className="max-w-4xl mx-auto">

          {/* ── 1. ZONE DEPLOYABLE DES OUTILS (MÉCANIQUE GRILLE COMPACTE AVEC IMAGES) ── */}
          {activeSection === "outils" && (
            <div className="border border-zinc-900 rounded-3xl bg-zinc-950/80 backdrop-blur-md overflow-hidden shadow-2xl animate-in fade-in duration-200">
              {tools.map((tool, index) => {
                const isOpen = activeRow === index;
                return (
                  <div key={index} onMouseEnter={() => setActiveRow(index)} className={`border-b border-zinc-900 transition-all duration-300 ${isOpen ? "bg-zinc-900/30" : "hover:bg-zinc-900/10"}`}>
                    
                    {/* LIGNE HORIZONTALE COMPACTE */}
                    <div className="px-6 md:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none">
                      <div className="flex flex-col gap-1 sm:w-1/3">
                        <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase">{tool.category}</span>
                        <h3 className={`text-base font-black tracking-tight uppercase transition-colors ${isOpen ? "text-cyan-400" : "text-zinc-300"}`}>{tool.title}</h3>
                      </div>
                      <div className="sm:w-1/2">
                        <p className={`font-sans text-xs truncate max-w-md transition-colors ${isOpen ? "text-zinc-300" : "text-zinc-500"}`}>{tool.desc}</p>
                      </div>
                      <div className="sm:w-1/6 flex sm:justify-end text-[10px] font-bold font-mono tracking-wider shrink-0">
                        <span className={isOpen ? "text-cyan-400 animate-pulse" : "text-zinc-700"}>{isOpen ? `● ${lang === "fr" ? "OUVERT" : "OPEN"}` : `○ ${lang === "fr" ? "ACCÉDER" : "INSPECT"}`}</span>
                      </div>
                    </div>

                    {/* TIROIR ACCORDÉON FLUIDE AVEC IMAGE INCORPORÉE */}
                    <div className={`transition-all duration-500 ease-in-out overflow-hidden bg-zinc-950/90 ${isOpen ? "max-h-[500px] opacity-100 border-t border-dashed border-zinc-900" : "max-h-0 opacity-0 pointer-events-none"}`}>
                      <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                        
                        {/* DESCRIPTION & BOUTON ACTION (COL_SPAN 7) */}
                        <div className="md:col-span-7 flex flex-col justify-between h-full min-h-[160px]">
                          <p className="font-sans text-xs md:text-sm leading-relaxed text-zinc-300 max-w-xl mb-6">{tool.desc}</p>
                          
                          {/* EFFET LEVIER DE VITESSE TACTIQUE */}
                          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 w-full max-w-xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-inner">
                            <span className="text-[11px] font-mono font-bold tracking-wider text-zinc-500 uppercase">{tool.tag}</span>
                            
                            <Link href={tool.href} className="group/lever w-full sm:w-auto shrink-0 bg-zinc-950 border border-zinc-800 hover:border-cyan-500/50 rounded-xl px-5 py-3.5 flex items-center justify-between sm:justify-center gap-4 transition-all duration-300 shadow-xl active:bg-zinc-900">
                              <span className="text-[10px] font-mono font-black tracking-widest text-zinc-200 group-hover/lever:text-cyan-400 transition-colors">{tool.actionText}</span>
                              <div className="w-8 h-4 bg-zinc-900 rounded-full p-0.5 border border-zinc-800 flex items-center relative overflow-hidden shrink-0">
                                <div className="w-3 h-3 bg-zinc-600 rounded-full transition-all duration-300 transform translate-x-0 group-hover/lever:translate-x-4 group-hover/lever:bg-cyan-500 group-hover/lever:shadow-[0_0_10px_#06b6d4]" />
                              </div>
                            </Link>
                          </div>
                        </div>

                        {/* APERÇU DE L'IMAGE À DROITE (COL_SPAN 5) */}
                        <div className="md:col-span-5 flex justify-end">
                          <div className="w-full max-w-[360px] h-48 md:h-56 border border-zinc-800 rounded-2xl relative overflow-hidden bg-zinc-900 shadow-2xl group/img">
                            <div className="absolute inset-0 border border-cyan-500/10 m-1.5 rounded-xl pointer-events-none z-20" />
                            <img 
                              src={tool.toolImage || "/worldmini.png"} 
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
          )}

          {/* ── 2. LOGIQUE DES ÉVÉNEMENTS CONSERVÉE ── */}
          {activeSection === "events" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4">{dict.eventsTitle}</p>
              {EVENTS[lang].length === 0 ? (
                <p className="text-sm text-zinc-600 italic text-center py-10">{dict.eventsEmpty}</p>
              ) : (
                EVENTS[lang].map((ev, i) => (
                  <div key={i} className="border border-zinc-800/80 bg-[#0a0a0d] rounded-2xl p-5 flex gap-5 relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500/50 to-transparent rounded-l-2xl"/>
                    <div className="shrink-0 text-center w-16">
                      <p className="text-[10px] font-mono text-zinc-600">{ev.date.split("-")[0]}</p>
                      <p className="text-lg font-black text-white">{ev.date.split("-")[2]}</p>
                      <p className="text-[10px] font-mono text-cyan-400 uppercase">
                        {new Date(ev.date).toLocaleString(lang === "fr" ? "fr-CA" : "en-CA", { month: "short" })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white mb-1">{ev.title}</p>
                      <p className="text-xs text-zinc-500 leading-relaxed">{ev.desc}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── 3. LOGIQUE DU RÈGLEMENT FORMAT TUILE NETTE ── */}
          {activeSection === "regles" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border border-amber-800/40 bg-amber-900/10 rounded-2xl p-5">
                <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest mb-2">⚠️ {lang === "fr" ? "Avertissement important" : "Important notice"}</p>
                <p className="text-xs text-amber-200/80 leading-relaxed">{dict.reglesWarn}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4">{dict.reglesTitle}</p>
                {REGLES[lang].map(r => (
                  <div key={r.id} className="flex items-start gap-4 border border-zinc-900 bg-black/20 rounded-xl px-4 py-3">
                    <span className="text-[10px] font-mono text-zinc-600 font-bold shrink-0 mt-0.5 w-5 text-right">{String(r.id).padStart(2, "0")}</span>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      <strong className="text-zinc-200">{r.title} :</strong> {r.text}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-zinc-600 font-mono text-center italic">{dict.reglesNote}</p>
            </div>
          )}

          {/* ── 4. NOUVELLE LOGIQUE DE MODÉRATION FORMAT TUILE NETTE ── */}
          {activeSection === "moderation" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border border-cyan-800/40 bg-cyan-900/10 rounded-2xl p-5">
                <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-2">🛡️ {lang === "fr" ? "Cadre de supervision" : "Supervision framework"}</p>
                <p className="text-xs text-cyan-200/80 leading-relaxed">
                  {lang === "fr" 
                    ? "Les règles ci-dessous régissent la validation et la conformité des interactions au sein de la communauté." 
                    : "The guidelines below govern the validation and compliance of community interactions."}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4">{dict.moderationTitle}</p>
                {MODERATION[lang].map(m => (
                  <div key={m.id} className="flex items-start gap-4 border border-zinc-900 bg-black/20 rounded-xl px-4 py-3">
                    <span className="text-[10px] font-mono text-zinc-600 font-bold shrink-0 mt-0.5 w-5 text-right">{String(m.id).padStart(2, "0")}</span>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      <strong className="text-zinc-200">{m.title} :</strong> {m.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* FOOTER AVEC L'HORLOGE TEMPS RÉEL */}
      <footer className="relative z-20 h-10 border-t border-zinc-900 bg-black/40 px-6 flex items-center justify-between text-[10px] font-mono text-zinc-600 shrink-0">
        <p>CONTROL PANEL</p>
        <p className="tracking-widest">{time}</p>
        <p>© 2026 ECHOSAI.CA</p>
      </footer>

      {/* POPUP SÉCURISÉ D'AUTHENTIFICATION COMPLÈTE */}
      {showAuthPopup && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAuthPopup(false)}>
          <div className="bg-zinc-950 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-zinc-800" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <h3 className="font-black text-xs text-white uppercase tracking-wider">{lang === "fr" ? "AUTHENTIFICATION EN LIGNE" : "SYSTEM LOGIN"}</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button onClick={handleGoogle} className="flex items-center justify-center gap-2 px-2 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all">
                <GoogleLogo /> <span className="text-white text-[10px] font-mono font-bold">GOOGLE</span>
              </button>
              <button onClick={handleMicrosoft} className="flex items-center justify-center gap-2 px-2 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all">
                <MicrosoftLogo /> <span className="text-white text-[10px] font-mono font-bold">MICROSOFT</span>
              </button>
            </div>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-900"/></div>
              <div className="relative flex justify-center">
                <span className="bg-zinc-950 px-2 text-[10px] font-mono text-zinc-600">
                  {lang === "fr" ? "OU COURRIEL" : "OR EMAIL"}
                </span>
              </div>
            </div>

            <form onSubmit={handleEmailAuth} className="flex flex-col gap-2">
              <input type="email" placeholder={lang === "fr" ? "ton@email.com" : "your@email.com"} value={authEmail} onChange={e => setAuthEmail(e.target.value)} required className="w-full border border-zinc-800 bg-zinc-900 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500" />
              <input type="password" placeholder="••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required className="w-full border border-zinc-800 bg-zinc-900 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500" />
              {authError && <p className="text-xs text-red-400 font-mono">{authError}</p>}
              {authSuccess && <p className="text-xs text-emerald-400 font-mono">{authSuccess}</p>}
              <button type="submit" disabled={authLoading} className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-zinc-950 text-xs font-mono font-black uppercase tracking-wider transition-colors disabled:opacity-50">
                {authLoading ? "…" : authEmailMode === "signin" ? (lang === "fr" ? "Connexion" : "Sign In") : (lang === "fr" ? "Créer" : "Create")}
              </button>
            </form>
            <button onClick={() => { setAuthEmailMode(m => m === "signin" ? "signup" : "signin"); setAuthError(null); setAuthSuccess(null); }} className="w-full mt-3 text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors underline">
              {authEmailMode === "signin" ? (lang === "fr" ? "Pas de compte ? S'enregistrer" : "No account? Sign Up") : (lang === "fr" ? "Déjà un compte ? Connexion" : "Have account? Sign In")}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}