"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

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
  hall:    { fr: "Hall",          en: "Hall" },
  dash:    { fr: "Dashboard",     en: "Dashboard" },
  conv:    { fr: "Conversation",  en: "Conversation" },
  form:    { fr: "Formulaire",    en: "Form" },
  fiches:  { fr: "Fiches",        en: "Listings" },
  account: { fr: "Compte",        en: "Account" },
};

export default function HallPage() {
  const [lang, setLang] = useState<Lang>("fr");
  const [userId, setUserId]       = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString(lang === "fr" ? "fr-CA" : "en-CA", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lang]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
      setUserEmail(session?.user?.email || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id || null);
      setUserEmail(session?.user?.email || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const dict = {
    fr: {
      arch: "ESPACE D'ACCUEIL",
      title: "THE GRAND HALL",
      subtitle: "Construire seul ne veut pas dire grandir seul",
      receptionist: "RÉCEPTIONNISTE ECHO",
      welcomeConnected: `Bon retour parmi nous${userEmail ? `, ${userEmail}` : ""}. Ton bureau et tes fiches t'attendent.`,
      welcomeGuest: "Bienvenue chez Echo AI. Avant toute chose, connecte-toi — ça nous permet de conserver tes fiches et d'éviter que tu doives recommencer tes conversations à chaque visite.",
      loginCta: "Se connecter",
      sections: {
        form:   { title: "Le Formulaire", desc: "La section pour remplir ta fiche projet et rejoindre le réseau.", cta: "Remplir ma fiche" },
        fiche:  { title: "Les Fiches",     desc: "La section pour consulter les fiches des autres fondateurs.",    cta: "Parcourir les fiches" },
        regles: { title: "Les Règles",     desc: "La section pour comprendre comment fonctionne la plateforme.",   cta: "Bientôt disponible" },
        bureau: { title: "Ton Bureau",     desc: "Ta clé, tes fiches débloquées, ton activité personnelle.",       cta: "Accéder à mon bureau" },
      },
      status: userId ? "CONNECTÉ" : "INVITÉ",
      footer: "INFRASTRUCTURE",
    },
    en: {
      arch: "WELCOME AREA",
      title: "THE GRAND HALL",
      subtitle: "Built alone doesn't mean growing alone",
      receptionist: "ECHO RECEPTIONIST",
      welcomeConnected: `Welcome back${userEmail ? `, ${userEmail}` : ""}. Your desk and listings are waiting.`,
      welcomeGuest: "Welcome to Echo AI. Before anything else, log in — it lets us keep your listings and avoid restarting your conversations every visit.",
      loginCta: "Log in",
      sections: {
        form:   { title: "The Form",     desc: "Fill out your project listing and join the network.",        cta: "Fill my listing" },
        fiche:  { title: "The Listings", desc: "Browse other founders' listings.",                            cta: "Browse listings" },
        regles: { title: "The Rules",    desc: "Understand how the platform works before getting started.",   cta: "Coming soon" },
        bureau: { title: "Your Desk",    desc: "Your key, your unlocked listings, your activity.",            cta: "Access my desk" },
      },
      status: userId ? "CONNECTED" : "GUEST",
      footer: "INFRASTRUCTURE",
    },
  }[lang];

  const doors = [
    { id: "form",   href: "/1/form",      icon: "📝", locked: false, ...dict.sections.form   },
    { id: "fiche",  href: "/1/fiche",     icon: "🗂️", locked: false, ...dict.sections.fiche  },
    { id: "regles", href: "#",            icon: "📜", locked: true,  ...dict.sections.regles },
    { id: "bureau", href: "/1/dashboard", icon: "🗝️", locked: false, ...dict.sections.bureau },
  ];

  return (
    <div className="w-full min-h-screen bg-[#08070a] text-zinc-300 flex flex-col font-sans relative overflow-hidden">

      {/* ── AMBIANCE LUMIÈRE GLOBALE ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[600px]"
          style={{ background: "radial-gradient(ellipse 50% 100% at 50% 0%, rgba(6,182,212,0.10) 0%, transparent 65%)" }} />
        <div className="absolute bottom-0 left-0 w-full h-[300px]"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)" }} />
      </div>

      {/* ── COLONNES ARCHITECTURALES — pleine hauteur, 3 de chaque côté ── */}
      <div className="pointer-events-none fixed inset-y-0 left-0 z-0 hidden lg:flex gap-12 px-8 items-stretch">
        {[0,1,2].map(i => (
          <div key={`l-${i}`} className="relative w-4 flex flex-col items-center">
            <div className="absolute inset-y-0 w-full bg-gradient-to-b from-zinc-800/30 via-zinc-700/50 to-zinc-800/30 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.7)] border-x border-zinc-600/15" />
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent" />
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/60 shadow-[0_0_10px_3px_rgba(6,182,212,0.3)]" />
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/60 shadow-[0_0_10px_3px_rgba(6,182,212,0.3)]" />
          </div>
        ))}
      </div>
      <div className="pointer-events-none fixed inset-y-0 right-0 z-0 hidden lg:flex gap-12 px-8 items-stretch">
        {[0,1,2].map(i => (
          <div key={`r-${i}`} className="relative w-4 flex flex-col items-center">
            <div className="absolute inset-y-0 w-full bg-gradient-to-b from-zinc-800/30 via-zinc-700/50 to-zinc-800/30 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.7)] border-x border-zinc-600/15" />
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent" />
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/60 shadow-[0_0_10px_3px_rgba(6,182,212,0.3)]" />
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/60 shadow-[0_0_10px_3px_rgba(6,182,212,0.3)]" />
          </div>
        ))}
      </div>

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

      {/* ── LE HALL — PERSPECTIVE ARCHITECTURALE ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 lg:px-32 py-10 sm:py-16">

        {/* En-tête du hall */}
        <div className="text-center mb-12 sm:mb-16 relative z-20">
          <p className="text-[10px] font-mono tracking-[0.5em] text-cyan-500 font-bold mb-3">{dict.arch}</p>
          <h1 className="text-4xl sm:text-6xl font-extralight tracking-[0.15em] text-white uppercase mb-3"
            style={{ textShadow: "0 0 40px rgba(6,182,212,0.25)" }}>
            {dict.title}
          </h1>
          <div className="w-24 h-px mx-auto bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent mb-3" />
          <p className="text-sm text-zinc-500 italic">{dict.subtitle}</p>
        </div>

        {/* ── LA SALLE — colonnes + sol marbré + réceptionniste au centre ── */}
        <div className="w-full max-w-6xl relative">

          {/* Sol réfléchissant en perspective */}
          <div className="absolute -bottom-10 left-0 right-0 h-32 opacity-40 pointer-events-none hidden sm:block"
            style={{
              background: "linear-gradient(to bottom, rgba(24,24,27,0.6), transparent)",
              transform: "perspective(400px) rotateX(60deg)",
              transformOrigin: "top",
            }} />

          <div className="grid grid-cols-1 items-stretch relative max-w-3xl mx-auto">

            {/* ── PIÈCE CENTRALE — Réceptionniste ── */}
            <div className="relative">
              {/* Cadre architectural lumineux */}
              <div className="relative rounded-3xl border border-zinc-800/60 bg-gradient-to-b from-[#0c0c10] via-[#0a0a0d] to-[#08080b] shadow-[0_0_100px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.03)] p-8 sm:p-12 overflow-hidden">

                {/* Faisceau de lumière du haut */}
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse, rgba(6,182,212,0.12) 0%, transparent 70%)" }} />

                {/* Ligne lumineuse horizontale (lustre) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

                <div className="relative z-10 text-center">
                  <div className="inline-flex flex-col items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl" />
                      <img src="/echo1.png" alt="Echo" className="relative w-16 h-16 rounded-full object-cover border-2 border-zinc-700/60" />
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-zinc-500 tracking-[0.3em] uppercase">{dict.receptionist}</p>
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold mt-1 ${userId ? "text-cyan-400" : "text-amber-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${userId ? "bg-cyan-400 shadow-[0_0_8px_#06b6d4]" : "bg-amber-400 animate-pulse"}`} />
                        {dict.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm sm:text-base text-zinc-300 leading-relaxed italic max-w-md mx-auto">
                    "{userId ? dict.welcomeConnected : dict.welcomeGuest}"
                  </p>

                  {!userId && (
                    <Link href="/1/account"
                      className="inline-block mt-7 px-7 py-3 bg-gradient-to-b from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white text-xs font-bold rounded-xl uppercase tracking-widest transition-all shadow-[0_0_25px_rgba(6,182,212,0.3)]">
                      {dict.loginCta}
                    </Link>
                  )}
                </div>
              </div>

              {/* Socle / base réfléchissante */}
              <div className="h-3 mx-8 bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent rounded-full blur-sm mt-1" />
            </div>
          </div>
        </div>

        {/* ── LES 4 PORTES — alignées comme des accès dans le hall ── */}
        <div className="w-full max-w-5xl mt-16 sm:mt-20 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative z-20">
          {doors.map((door, i) => (
            door.locked ? (
              <div key={door.id} className="group relative flex flex-col items-center text-center p-5 rounded-2xl border border-zinc-900 bg-black/30 opacity-50 cursor-not-allowed">
                <span className="text-2xl mb-2">{door.icon}</span>
                <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">0{i+1}</span>
                <h3 className="text-xs font-bold text-zinc-400 mb-1">{door.title}</h3>
                <p className="text-[10px] text-zinc-600 leading-snug hidden sm:block">{door.desc}</p>
              </div>
            ) : (
              <Link key={door.id} href={door.href}
                className="group relative flex flex-col items-center text-center p-5 rounded-2xl border border-zinc-900 hover:border-cyan-500/40 bg-black/30 hover:bg-black/50 transition-all hover:shadow-[0_0_25px_rgba(6,182,212,0.1)]">
                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">{door.icon}</span>
                <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">0{i+1}</span>
                <h3 className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors mb-1">{door.title}</h3>
                <p className="text-[10px] text-zinc-500 leading-snug hidden sm:block">{door.desc}</p>
              </Link>
            )
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="relative z-20 h-8 border-t border-zinc-950 bg-black/60 backdrop-blur-sm px-6 flex items-center justify-between text-[10px] font-mono text-zinc-600 tracking-wider shrink-0">
        <p>{dict.footer}: <span className="text-zinc-500 font-bold">SITE_2_ACTIVE</span></p>
        <p className="font-mono">{time}</p>
        <p>© 2026 ECHOSAI.CA</p>
      </footer>

    </div>
  );
}