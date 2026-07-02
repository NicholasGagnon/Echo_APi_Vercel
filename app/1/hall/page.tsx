"use client";

import { useState, useEffect, useRef } from "react";
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

const PAGES_INFO = {
  fr: [
    { href:"/1/dashboard",    icon:"📊", title:"Dashboard",    desc:"Statistiques globales de la plateforme, événements à venir et règlement complet. Visible par tous." },
    { href:"/1/conversation", icon:"💬", title:"Conversation", desc:"Un canal direct avec Echo AI. Pose tes questions, explore des idées, teste le système." },
    { href:"/1/form",         icon:"📝", title:"Formulaire",   desc:"Crée ta fiche projet en 6 étapes. Projet, avancement, objectifs, technologies, profil et contacts." },
    { href:"/1/fiche",        icon:"🗂️", title:"Fiches",       desc:"Consulte les fiches des fondateurs. Envoie un intérêt ou débloque les coordonnées pour 1,50$." },
    { href:"/1/bureau",       icon:"🗝️", title:"Bureau",       desc:"Ton espace privé. Ta clé, tes fiches, tes contacts débloqués et les intérêts reçus." },
    { href:"/1/account",      icon:"👤", title:"Compte",       desc:"Connecte-toi via Google, Microsoft ou courriel. Obligatoire pour créer une fiche ou acheter." },
  ],
  en: [
    { href:"/1/dashboard",    icon:"📊", title:"Dashboard",    desc:"Global platform statistics, upcoming events and full rules. Visible to everyone." },
    { href:"/1/conversation", icon:"💬", title:"Conversation", desc:"A direct channel with Echo AI. Ask questions, explore ideas, test the system." },
    { href:"/1/form",         icon:"📝", title:"Form",         desc:"Create your project listing in 6 steps. Project, progress, goals, tech, profile and contacts." },
    { href:"/1/fiche",        icon:"🗂️", title:"Listings",     desc:"Browse founder listings. Send interest or unlock contact info for $1.50." },
    { href:"/1/bureau",       icon:"🗝️", title:"Desk",         desc:"Your private space. Your key, your listings, unlocked contacts and received interests." },
    { href:"/1/account",      icon:"👤", title:"Account",      desc:"Log in via Google, Microsoft or email. Required to create a listing or purchase." },
  ],
};

type ChatMsg = { role: "user"|"assistant"; content: string };

export default function HallPage() {
  const [lang, setLang] = useState<Lang>("fr");

  // ── Chat réceptionniste ──────────────────────────────────────────────────
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  const sendToReception = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput("");
    const newHistory: ChatMsg[] = [...chatHistory, { role:"user", content:msg }];
    setChatHistory(newHistory);
    setChatLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res  = await fetch(`${API_URL}/1/hall-reception`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ message: msg, history: newHistory }),
      });
      const data = await res.json();
      setChatHistory(h => [...h, { role:"assistant", content: data.response || "…" }]);
    } catch {
      setChatHistory(h => [...h, { role:"assistant", content: lang==="fr"?"Indisponible momentanément.":"Temporarily unavailable." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const dict = {
    fr: {
      welcome_label: "BIENVENUE",
      welcome_title: "THE GRAND HALL",
      welcome_msg: "Vous entrez dans un espace pensé pour les fondateurs solos qui construisent en silence mais qui ne veulent plus grandir seuls.",
      about_title: "Ce que vous trouverez ici",
      about_msg: "Une plateforme de mise en relation entre créateurs de projets. Chaque membre possède une fiche, une clé personnelle et un bureau privé. Les contacts sont protégés et ne se débloquent qu'après un paiement ponctuel. Pas de réseaux sociaux. Pas de bruit. Du concret.",
      pages_title: "Explorer le Hall",
      reception_title: "RÉCEPTIONNISTE",
      reception_sub: "Posez-moi toutes vos questions sur cette plateforme.",
      reception_placeholder: "Comment créer une fiche ? Comment fonctionne la clé ?…",
      send: "Envoyer",
    },
    en: {
      welcome_label: "WELCOME",
      welcome_title: "THE GRAND HALL",
      welcome_msg: "You are entering a space designed for solo founders who build in silence but no longer want to grow alone.",
      about_title: "What you'll find here",
      about_msg: "A connection platform for project creators. Each member has a listing, a personal key, and a private desk. Contacts are protected and only unlocked after a one-time payment. No social media. No noise. Just substance.",
      pages_title: "Explore the Hall",
      reception_title: "RECEPTIONIST",
      reception_sub: "Ask me anything about this platform.",
      reception_placeholder: "How do I create a listing? How does the key work?…",
      send: "Send",
    },
  }[lang];

  return (
    <div className="w-full min-h-screen bg-[#08070a] text-zinc-300 flex flex-col font-sans relative overflow-hidden">

      {/* LUMIÈRE AMBIANTE */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[600px]"
          style={{background:"radial-gradient(ellipse 50% 100% at 50% 0%, rgba(6,182,212,0.09) 0%, transparent 65%)"}}/>
        <div className="absolute bottom-0 left-0 w-full h-[200px]"
          style={{background:"linear-gradient(to top, rgba(0,0,0,0.5), transparent)"}}/>
      </div>

      {/* 3 COLONNES DE CHAQUE CÔTÉ */}
      {["left","right"].map(side=>(
        <div key={side} className={`pointer-events-none fixed inset-y-0 ${side==="left"?"left-0":"right-0"} z-0 hidden lg:flex gap-10 px-6 items-stretch`}>
          {[0,1,2].map(i=>(
            <div key={i} className="relative w-3 flex flex-col items-center">
              <div className="absolute inset-y-0 w-full bg-gradient-to-b from-zinc-800/25 via-zinc-700/45 to-zinc-800/25 rounded-full border-x border-zinc-600/12"/>
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-cyan-400/25 to-transparent"/>
              <div className="absolute top-12 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/60 shadow-[0_0_10px_3px_rgba(6,182,212,0.3)]"/>
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/60 shadow-[0_0_10px_3px_rgba(6,182,212,0.3)]"/>
            </div>
          ))}
        </div>
      ))}

      {/* NAV */}
      <nav className="relative z-20 border-b border-zinc-900/60 px-6 py-4 flex items-center justify-between shrink-0 bg-black/50 backdrop-blur-sm">
        <span className="font-bold text-sm text-white tracking-wide">Echo AI</span>
        <div className="flex items-center gap-5 text-sm">
          {NAV_ITEMS.map(item=>(
            <Link key={item.href} href={item.href}
              className={(item as any).active?"text-cyan-400 font-semibold":"text-zinc-500 hover:text-zinc-200 transition-colors"}>
              {LABELS[item.key][lang]}
            </Link>
          ))}
          <button onClick={()=>setLang(l=>l==="fr"?"en":"fr")} className="text-xs text-zinc-500 border border-zinc-800 px-2 py-1 rounded-lg hover:border-zinc-600 transition-colors">
            {lang==="fr"?"EN":"FR"}
          </button>
        </div>
      </nav>

      {/* CORPS — 2/3 contenu + 1/3 IA */}
      <div className="relative z-10 flex-1 flex overflow-hidden">

        {/* ── 2/3 GAUCHE — Contenu visiteur ── */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-20 py-14 lg:pr-10 min-w-0">

          {/* ACCUEIL */}
          <div className="mb-16">
            <p className="text-[10px] font-mono tracking-[0.5em] text-cyan-500 font-bold mb-4">{dict.welcome_label}</p>
            <h1 className="text-5xl sm:text-7xl font-extralight tracking-[0.12em] text-white uppercase mb-6 leading-tight"
              style={{textShadow:"0 0 60px rgba(6,182,212,0.20)"}}>
              {dict.welcome_title}
            </h1>
            <div className="w-20 h-px bg-gradient-to-r from-cyan-500/60 to-transparent mb-6"/>
            <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-xl font-light">
              {dict.welcome_msg}
            </p>
          </div>

          {/* EXPLICATION GLOBALE */}
          <div className="mb-16 border-l-2 border-cyan-500/30 pl-6">
            <p className="text-[10px] font-mono tracking-[0.4em] text-zinc-500 uppercase mb-3">{dict.about_title}</p>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-lg">{dict.about_msg}</p>
          </div>

          {/* PAGES */}
          <div className="mb-10">
            <p className="text-[10px] font-mono tracking-[0.4em] text-zinc-500 uppercase mb-6">{dict.pages_title}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PAGES_INFO[lang].map((page,i)=>(
                <Link key={i} href={page.href}
                  className="group flex gap-4 items-start p-4 rounded-xl border border-zinc-900 hover:border-zinc-700 bg-black/20 hover:bg-black/40 transition-all">
                  <span className="text-xl shrink-0 mt-0.5 group-hover:scale-110 transition-transform">{page.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors mb-1">{page.title}</p>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">{page.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── 1/3 DROITE — Réceptionniste IA ── */}
        <div className="w-full lg:w-[380px] shrink-0 border-l border-zinc-900/60 bg-black/40 flex flex-col">

          {/* Header réceptionniste */}
          <div className="p-5 border-b border-zinc-900/60 shrink-0 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none"
              style={{background:"radial-gradient(ellipse 80% 60% at 50% 0%, rgba(6,182,212,0.06) 0%, transparent 70%)"}}/>
            <div className="relative flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-md"/>
                <img src="/echo1.png" alt="Echo" className="relative w-10 h-10 rounded-full object-cover border border-zinc-700"/>
              </div>
              <div>
                <p className="text-[10px] font-mono text-zinc-400 tracking-widest uppercase">{dict.reception_title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]"/>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">EN LIGNE</span>
                </div>
              </div>
            </div>
            <p className="relative text-[11px] text-zinc-500 mt-3 leading-relaxed">{dict.reception_sub}</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {chatHistory.length === 0 && (
              <div className="text-center py-10 space-y-2">
                <p className="text-[11px] text-zinc-600 italic">
                  {lang==="fr"
                    ? "Posez une question sur le Hall, les fiches, la clé ou le fonctionnement de la plateforme."
                    : "Ask a question about the Hall, listings, your key, or how the platform works."}
                </p>
              </div>
            )}
            {chatHistory.map((msg,i)=>(
              <div key={i} className={`flex ${msg.role==="user"?"justify-end":"justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  msg.role==="user"
                    ? "bg-zinc-800 text-zinc-200"
                    : "bg-[#0d1117] border border-zinc-800/60 text-zinc-300"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-[#0d1117] border border-zinc-800/60 rounded-2xl px-3.5 py-2.5">
                  <div className="flex gap-1 items-center h-4">
                    {[0,1,2].map(i=>(
                      <div key={i} className="w-1 h-1 rounded-full bg-cyan-500 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatBottomRef}/>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-zinc-900/60 shrink-0">
            <div className="flex gap-2">
              <input type="text" value={chatInput}
                onChange={e=>setChatInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter") sendToReception(); }}
                placeholder={dict.reception_placeholder}
                className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors min-w-0"/>
              <button onClick={sendToReception} disabled={chatLoading||!chatInput.trim()}
                className="shrink-0 w-9 h-9 flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-xl transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"/></svg>
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