"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Lang = "fr" | "en";

const NAV_ITEMS = [
  { href: "/1",              key: "hall", active: true },
  { href: "/1/dashboard",    key: "dash"   },
  { href: "/1/conversation", key: "conv"   },
  { href: "/1/form",         key: "form"   },
  { href: "/1/fiche",        key: "fiches" },
  { href: "/1/account",      key: "account" },
];
const LABELS: Record<string, { fr: string; en: string }> = {
  hall:    { fr: "Hall",         en: "Hall"         },
  dash:    { fr: "Dashboard",    en: "Dashboard"    },
  conv:    { fr: "Conversation", en: "Conversation" },
  form:    { fr: "Formulaire",   en: "Form"         },
  fiches:  { fr: "Fiches",       en: "Listings"     },
  account: { fr: "Compte",       en: "Account"      },
};

type PortalId = "formulaire" | "fiches" | "dashboard" | "bureau" | "ia" | "compte";

const PORTALS: { id: PortalId; icon: string; label: { fr: string; en: string }; content: { fr: string; en: string } }[] = [
  {
    id: "formulaire", icon: "📝",
    label: { fr: "Le Formulaire", en: "The Form" },
    content: {
      fr: "Tout commence ici. En 6 étapes, tu construis ta fiche projet : ton idée, ton avancement, tes objectifs à court, moyen et long terme, les technologies que tu utilises, et ce que tu cherches comme synergie. Tu choisis aussi quelles informations de contact rendre visibles après déblocage. À la fin, tu reçois ta clé personnelle par courriel.",
      en: "Everything starts here. In 6 steps, you build your project listing: your idea, your progress, your short, medium and long-term goals, your tech stack, and what kind of synergy you're looking for. You also choose which contact info to reveal after unlock. At the end, you receive your personal key by email.",
    },
  },
  {
    id: "fiches", icon: "🗂️",
    label: { fr: "Les Fiches", en: "The Listings" },
    content: {
      fr: "Les fiches sont le cœur du réseau. Chaque fondateur qui s'est inscrit a une fiche publique avec son projet, ses outils, ses objectifs et ce qu'il cherche. Tu peux envoyer un intérêt discret (♥) ou marquer un intérêt fort (★) — le créateur reçoit une notification par courriel. Pour voir ses coordonnées réelles (courriel, Discord, GitHub, etc.), tu débloques sa fiche pour 1,50$. C'est permanent et confidentiel.",
      en: "Listings are the heart of the network. Each registered founder has a public listing with their project, tools, goals and what they're looking for. You can send a soft interest (♥) or a strong interest (★) — the creator gets an email notification. To see their real contact info (email, Discord, GitHub, etc.), you unlock their listing for $1.50. It's permanent and confidential.",
    },
  },
  {
    id: "dashboard", icon: "📊",
    label: { fr: "Le Dashboard", en: "The Dashboard" },
    content: {
      fr: "Le Dashboard est une vue globale de la plateforme, accessible à tous sans connexion. Tu y trouves les statistiques en temps réel (fiches actives, contacts débloqués, intérêts envoyés), les événements à venir annoncés par l'équipe, et le règlement complet de la plateforme. Aucune IA, aucune donnée personnelle — uniquement des informations vérifiables.",
      en: "The Dashboard is a global view of the platform, accessible to everyone without logging in. You'll find real-time stats (active listings, unlocked contacts, interests sent), upcoming events from the team, and the full platform rules. No AI, no personal data — only verifiable information.",
    },
  },
  {
    id: "bureau", icon: "🗝️",
    label: { fr: "Ton Bureau", en: "Your Desk" },
    content: {
      fr: "Le Bureau est ton espace privé, accessible uniquement après connexion. Il contient 5 éléments : ta clé personnelle (cachée jusqu'à ce que tu décides de la révéler), tes propres fiches et leur activité, les contacts que tu as débloqués, les intérêts que tu as envoyés, et les intérêts reçus sur tes fiches. Chaque élément est une plaque interactive — tu cliques pour ouvrir.",
      en: "The Desk is your private space, accessible only after logging in. It contains 5 elements: your personal key (hidden until you choose to reveal it), your own listings and their activity, the contacts you've unlocked, the interests you've sent, and the interests received on your listings. Each element is an interactive panel — click to open.",
    },
  },
  {
    id: "ia", icon: "🤖",
    label: { fr: "L'IA du Hall", en: "The Hall AI" },
    content: {
      fr: "Je suis la réceptionniste de ce Hall. Je connais toutes les fiches disponibles sur la plateforme et je peux te suggérer un projet qui correspond à ce que tu cherches. Je connais aussi toutes les pages du site et je peux t'expliquer comment tout fonctionne. Je ne parle que de ce site — pour une IA généraliste, la page Conversation est faite pour ça. Pose-moi une question dans le panneau à droite.",
      en: "I am the receptionist of this Hall. I know all the listings available on the platform and can suggest a project that matches what you're looking for. I also know every page of the site and can explain how everything works. I only talk about this site — for a general AI, the Conversation page is made for that. Ask me a question in the panel on the right.",
    },
  },
  {
    id: "compte", icon: "👤",
    label: { fr: "Ton Compte", en: "Your Account" },
    content: {
      fr: "La connexion est obligatoire pour créer une fiche, accéder au Bureau, et acheter des contacts. Tu peux te connecter via Google, Microsoft ou courriel/mot de passe. La connexion garantit qu'une seule clé personnelle existe par compte et que tes fiches et contacts débloqués sont conservés de manière sécurisée entre tes visites.",
      en: "Logging in is required to create a listing, access the Desk, and purchase contacts. You can log in via Google, Microsoft or email/password. Login ensures that only one personal key exists per account and that your listings and unlocked contacts are securely preserved between visits.",
    },
  },
];

type ChatMsg = { role: "user" | "assistant"; content: string };

export default function HallPage() {
  const [lang, setLang]         = useState<Lang>("fr");
  const [openPortal, setOpenPortal] = useState<PortalId | null>(null);
  const [chatInput, setChatInput]   = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const sendToReception = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput("");
    const newHistory: ChatMsg[] = [...chatHistory, { role: "user", content: msg }];
    setChatHistory(newHistory);
    setChatLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res  = await fetch(`${API_URL}/1/hall-reception`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: newHistory }),
      });
      const data = await res.json();
      setChatHistory(h => [...h, { role: "assistant", content: data.response || "…" }]);
    } catch {
      setChatHistory(h => [...h, { role: "assistant", content: lang === "fr" ? "Indisponible momentanément." : "Temporarily unavailable." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const dict = {
    fr: {
      welcome_label: "BIENVENUE",
      title: "THE GRAND HALL",
      welcome_msg: "Vous entrez dans un espace pensé pour les fondateurs solos qui construisent en silence mais qui ne veulent plus grandir seuls.",
      about_title: "Ce que vous trouverez ici",
      about_msg: "Une plateforme de mise en relation entre créateurs de projets. Chaque membre possède une fiche, une clé personnelle et un bureau privé. Les contacts sont protégés et ne se débloquent qu'après un paiement ponctuel. Pas de réseaux sociaux. Pas de bruit. Du concret.",
      portals_title: "EXPLORER",
      reception_title: "RÉCEPTIONNISTE",
      reception_sub: "Posez-moi toutes vos questions sur cette plateforme.",
      reception_placeholder: "Comment créer une fiche ? Quel projet me correspond ?",
      send: "Envoyer",
      online: "EN LIGNE",
      close: "Fermer",
    },
    en: {
      welcome_label: "WELCOME",
      title: "THE GRAND HALL",
      welcome_msg: "You are entering a space designed for solo founders who build in silence but no longer want to grow alone.",
      about_title: "What you'll find here",
      about_msg: "A connection platform for project creators. Each member has a listing, a personal key, and a private desk. Contacts are protected and only unlocked after a one-time payment. No social media. No noise. Just substance.",
      portals_title: "EXPLORE",
      reception_title: "RECEPTIONIST",
      reception_sub: "Ask me anything about this platform.",
      reception_placeholder: "How do I create a listing? Which project suits me?",
      send: "Send",
      online: "ONLINE",
      close: "Close",
    },
  }[lang];

  return (
    <div className="w-full min-h-screen bg-[#08070a] text-zinc-300 flex flex-col font-sans relative overflow-hidden">

      {/* LUMIÈRE AMBIANTE */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[600px]"
          style={{ background: "radial-gradient(ellipse 50% 100% at 50% 0%, rgba(6,182,212,0.09) 0%, transparent 65%)" }} />
      </div>

      {/* 3 COLONNES CHAQUE CÔTÉ — pleine hauteur */}
      {["left", "right"].map(side => (
        <div key={side} className={`pointer-events-none fixed inset-y-0 ${side === "left" ? "left-0" : "right-0"} z-0 hidden lg:flex gap-10 px-6 items-stretch`}>
          {[0, 1, 2].map(i => (
            <div key={i} className="relative w-3 flex flex-col items-center">
              <div className="absolute inset-y-0 w-full bg-gradient-to-b from-zinc-800/25 via-zinc-700/45 to-zinc-800/25 rounded-full border-x border-zinc-600/10" />
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-cyan-400/25 to-transparent" />
              <div className="absolute top-12 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/60 shadow-[0_0_10px_3px_rgba(6,182,212,0.3)]" />
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/60 shadow-[0_0_10px_3px_rgba(6,182,212,0.3)]" />
            </div>
          ))}
        </div>
      ))}

      {/* NAV */}
      <nav className="relative z-20 border-b border-zinc-900/60 px-6 py-4 flex items-center justify-between shrink-0 bg-black/50 backdrop-blur-sm">
        <span className="font-bold text-sm text-white tracking-wide">Echo AI</span>
        <div className="flex items-center gap-5 text-sm">
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href}
              className={(item as any).active ? "text-cyan-400 font-semibold" : "text-zinc-500 hover:text-zinc-200 transition-colors"}>
              {LABELS[item.key][lang]}
            </Link>
          ))}
          <button onClick={() => setLang(l => l === "fr" ? "en" : "fr")}
            className="text-xs text-zinc-500 border border-zinc-800 px-2 py-1 rounded-lg hover:border-zinc-600 transition-colors">
            {lang === "fr" ? "EN" : "FR"}
          </button>
        </div>
      </nav>

      {/* CORPS — 2/3 contenu + 1/3 IA */}
      <div className="relative z-10 flex-1 flex overflow-hidden min-h-0">

        {/* ── 2/3 GAUCHE ── */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-20 py-14 lg:pr-10 min-w-0">

          {/* ACCUEIL */}
          <div className="mb-14">
            <p className="text-[10px] font-mono tracking-[0.5em] text-cyan-500 font-bold mb-4">{dict.welcome_label}</p>
            <h1 className="text-5xl sm:text-6xl font-extralight tracking-[0.12em] text-white uppercase mb-5 leading-tight"
              style={{ textShadow: "0 0 60px rgba(6,182,212,0.18)" }}>
              {dict.title}
            </h1>
            <div className="w-20 h-px bg-gradient-to-r from-cyan-500/60 to-transparent mb-5" />
            <p className="text-base text-zinc-400 leading-relaxed max-w-xl font-light">{dict.welcome_msg}</p>
          </div>

          {/* EXPLICATION GLOBALE */}
          <div className="mb-14 border-l-2 border-cyan-500/30 pl-6">
            <p className="text-[10px] font-mono tracking-[0.4em] text-zinc-500 uppercase mb-3">{dict.about_title}</p>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-lg">{dict.about_msg}</p>
          </div>

          {/* PORTAILS */}
          <div className="mb-10">
            <p className="text-[10px] font-mono tracking-[0.4em] text-zinc-500 uppercase mb-6">{dict.portals_title}</p>
            <div className="flex flex-col gap-2">
              {PORTALS.map(portal => {
                const isOpen = openPortal === portal.id;
                return (
                  <div key={portal.id} className={`border rounded-xl transition-all duration-300 overflow-hidden ${isOpen ? "border-cyan-500/40 bg-black/40" : "border-zinc-900 bg-black/20 hover:border-zinc-800"}`}>
                    {/* En-tête du portail — cliquable */}
                    <button
                      onClick={() => setOpenPortal(isOpen ? null : portal.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 text-left">
                      <span className={`text-xl transition-all ${isOpen ? "scale-110" : ""}`}>{portal.icon}</span>
                      <span className={`text-sm font-semibold flex-1 transition-colors ${isOpen ? "text-cyan-400" : "text-zinc-300"}`}>
                        {portal.label[lang]}
                      </span>
                      <svg className={`w-4 h-4 text-zinc-600 transition-transform ${isOpen ? "rotate-180 text-cyan-400" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Contenu du portail */}
                    {isOpen && (
                      <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="h-px bg-zinc-800/60 mb-4" />
                        <p className="text-sm text-zinc-400 leading-relaxed">{portal.content[lang]}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 1/3 DROITE — Réceptionniste IA ── */}
        <div className="w-full lg:w-[360px] shrink-0 border-l border-zinc-900/60 bg-black/50 flex flex-col min-h-0">

          {/* Header */}
          <div className="p-5 border-b border-zinc-900/60 shrink-0 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(6,182,212,0.06) 0%, transparent 70%)" }} />
            <div className="relative flex items-center gap-3 mb-3">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-cyan-400/15 blur-md" />
                <img src="/echo1.png" alt="Echo" className="relative w-10 h-10 rounded-full object-cover border border-zinc-700/60" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-zinc-400 tracking-widest uppercase">{dict.reception_title}</p>
                <span className="inline-flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">{dict.online}</span>
                </span>
              </div>
            </div>
            <p className="relative text-[11px] text-zinc-500 leading-relaxed">{dict.reception_sub}</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {chatHistory.length === 0 && (
              <p className="text-[11px] text-zinc-600 italic text-center pt-6 leading-relaxed">
                {lang === "fr"
                  ? "Posez une question sur les fiches, la clé, le Bureau, ou demandez-moi quel projet pourrait vous intéresser."
                  : "Ask a question about listings, your key, the Desk, or ask me which project might interest you."}
              </p>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-zinc-800 text-zinc-200"
                    : "bg-[#0d1117] border border-zinc-800/60 text-zinc-300"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-[#0d1117] border border-zinc-800/60 rounded-2xl px-3.5 py-3">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1 h-1 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-zinc-900/60 shrink-0">
            <div className="flex gap-2">
              <input
                type="text" value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") sendToReception(); }}
                placeholder={dict.reception_placeholder}
                className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors min-w-0" />
              <button
                onClick={sendToReception} disabled={chatLoading || !chatInput.trim()}
                className="shrink-0 w-9 h-9 flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-xl transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer className="relative z-20 h-8 border-t border-zinc-950 bg-black/60 px-6 flex items-center justify-between text-[10px] font-mono text-zinc-600 shrink-0">
        <p>THE GRAND HALL — <span className="text-zinc-500">SITE_2</span></p>
        <p>© 2026 ECHOSAI.CA</p>
      </footer>
    </div>
  );
}