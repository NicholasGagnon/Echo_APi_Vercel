"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Lang = "fr" | "en";

const NAV_FR = [
  { label: "Hall",         href: "/1/hall" },
  { label: "Dashboard",    href: "/1/dashboard" },
  { label: "Conversation", href: "/1/conversation" },
  { label: "Formulaire",   href: "/1/form" },
  { label: "Fiches",       href: "/1/fiche" },
  { label: "Talk",         href: "/1/talk" },
  { label: "Bureau",       href: "/1/desktop" },
  { label: "Compte",       href: "/1/account" },
];
const NAV_EN = [
  { label: "Hall",         href: "/1/hall" },
  { label: "Dashboard",    href: "/1/dashboard" },
  { label: "Conversation", href: "/1/conversation" },
  { label: "Form",         href: "/1/form" },
  { label: "Listings",     href: "/1/fiche" },
  { label: "Talk",         href: "/1/talk" },
  { label: "Desk",         href: "/1/desktop" },
  { label: "Account",      href: "/1/account" },
];

const REGLES = {
  fr: [
    { id: 1,  text: "Les informations fournies doivent être vraies et vérifiables." },
    { id: 2,  text: "Il est interdit d'utiliser l'identité ou le projet d'une autre personne." },
    { id: 3,  text: "Les faux profils et les projets fictifs sont interdits." },
    { id: 4,  text: "Les messages de harcèlement, menaces ou insultes sont interdits." },
    { id: 5,  text: "Le spam, la publicité abusive ou les envois non sollicités sont interdits." },
    { id: 6,  text: "Une seule clé personnelle est autorisée par utilisateur." },
    { id: 7,  text: "Il est interdit de partager ou de revendre sa clé d'accès." },
    { id: 8,  text: "Les données obtenues via les fiches débloquées doivent rester confidentielles." },
    { id: 9,  text: "Il est interdit de contourner les limitations ou protections du système." },
    { id: 10, text: "Les tentatives de fraude ou d'arnaque entraînent une exclusion immédiate." },
    { id: 11, text: "Les contenus illégaux, haineux ou offensants sont interdits." },
    { id: 12, text: "L'équipe peut suspendre ou supprimer un compte en cas d'abus." },
  ],
  en: [
    { id: 1,  text: "All information provided must be true and verifiable." },
    { id: 2,  text: "Using another person's identity or project is prohibited." },
    { id: 3,  text: "Fake profiles and fictitious projects are prohibited." },
    { id: 4,  text: "Harassment, threats or insults are prohibited." },
    { id: 5,  text: "Spam, aggressive advertising or unsolicited bulk messages are prohibited." },
    { id: 6,  text: "Only one personal key is allowed per user." },
    { id: 7,  text: "Sharing or reselling your access key is prohibited." },
    { id: 8,  text: "Data obtained through unlocked listings must remain confidential." },
    { id: 9,  text: "Circumventing system limitations or protections is prohibited." },
    { id: 10, text: "Fraud or scam attempts result in immediate exclusion." },
    { id: 11, text: "Illegal, hateful or offensive content is prohibited." },
    { id: 12, text: "The team may suspend or delete accounts in case of abuse." },
  ],
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

// ── TUILES ─────────────────────────────────────────────────────────────────
const ROWS = [
  {
    labelFr: "🏛 Affinité de Projets",
    labelEn: "🏛 Project Affinity",
    color: "rgba(0,200,255,",
    tools: [
      { icon:"🏠", nameFr:"Hall",         nameEn:"Hall",         href:"/1/hall",         textClass:"text-cyan-400" },
      { icon:"📋", nameFr:"Fiches",       nameEn:"Listings",     href:"/1/fiche",        textClass:"text-cyan-400" },
      { icon:"📝", nameFr:"Formulaire",   nameEn:"Form",         href:"/1/form",         textClass:"text-cyan-400" },
      { icon:"🗄", nameFr:"Bureau",       nameEn:"Desk",         href:"/1/desktop",      textClass:"text-cyan-400" },
      { icon:"💬", nameFr:"Conversation", nameEn:"Conversation", href:"/1/conversation", textClass:"text-cyan-400" },
    ],
  },
  {
    labelFr: "🏗 Espaces métier",
    labelEn: "🏗 Business Spaces",
    color: "rgba(201,168,76,",
    tools: [
      { icon:"🧾", nameFr:"FastBilling", nameEn:"FastBilling", href:"/fastbilling", textClass:"text-yellow-400" },
      { icon:"💬", nameFr:"Talk",        nameEn:"Talk",        href:"/1/talk",      textClass:"text-violet-400" },
    ],
  },
  {
    labelFr: "🔎 Recherche · Compagnons",
    labelEn: "🔎 Research · Companions",
    color: "rgba(167,139,250,",
    tools: [
      { icon:"🧠", nameFr:"Avis Achat",  nameEn:"Reviews",    href:"/avis",       textClass:"text-violet-400" },
      { icon:"🌐", nameFr:"Horizon",     nameEn:"Horizon",    href:"/horizonweb", textClass:"text-cyan-400"   },
      { icon:"💬", nameFr:"Chat",        nameEn:"Chat",       href:"/chat",       textClass:"text-cyan-400"   },
      { icon:"📚", nameFr:"Livres",      nameEn:"Books",      href:"/books",      textClass:"text-violet-400" },
    ],
  },
  {
    labelFr: "🚀 Outils Echo",
    labelEn: "🚀 Echo Tools",
    color: "rgba(249,115,22,",
    tools: [
      { icon:"🧠", nameFr:"Idée",         nameEn:"Idea",        href:"/idea",       textClass:"text-orange-400" },
      { icon:"🌍", nameFr:"World",        nameEn:"World",       href:"/world",      textClass:"text-cyan-400"   },
      { icon:"🔥", nameFr:"Calories",     nameEn:"Calories",    href:"/vitality",   textClass:"text-green-400"  },
      { icon:"📅", nameFr:"Calendrier",   nameEn:"Calendar",    href:"/calendar",   textClass:"text-blue-400"   },
    ],
  },
];

type Stats = { fiches: number; tunnels: number; interets: number };

export default function DashboardPage() {
  const [lang, setLang]               = useState<Lang>("fr");
  const [time, setTime]               = useState("");
  const [stats, setStats]             = useState<Stats>({ fiches: 0, tunnels: 0, interets: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [activeSection, setActiveSection] = useState<"outils"|"events"|"regles">("outils");

  const navItems = lang === "fr" ? NAV_FR : NAV_EN;

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString(lang==="fr"?"fr-CA":"en-CA", { hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false }));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [lang]);

  useEffect(() => {
    const load = async () => {
      setLoadingStats(true);
      // FIX: "fiche_interets" (ancienne table /2, supprimée) → "interets_fiches"
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

  const dict = {
    fr: {
      area: "TABLEAU DE BORD",
      title: "DASHBOARD",
      subtitle: "Tous vos outils, un seul espace.",
      tabs: { outils:"Outils", events:"Événements", regles:"Règlement" },
      eventsTitle: "Événements à venir",
      eventsEmpty: "Aucun événement planifié pour l'instant.",
      reglesTitle: "Règlement de la plateforme",
      reglesNote: "Ce règlement s'applique à tous les membres dès leur inscription.",
      reglesWarn: "Toute fausse déclaration concernant votre identité, votre entreprise ou votre projet peut entraîner la suppression immédiate de votre compte sans préavis.",
    },
    en: {
      area: "CONTROL PANEL",
      title: "DASHBOARD",
      subtitle: "All your tools, one space.",
      tabs: { outils:"Tools", events:"Events", regles:"Rules" },
      eventsTitle: "Upcoming events",
      eventsEmpty: "No events scheduled yet.",
      reglesTitle: "Platform rules",
      reglesNote: "These rules apply to all members from the moment they register.",
      reglesWarn: "Any false statement regarding your identity, company or project may result in immediate account deletion without notice.",
    },
  }[lang];

  return (
    <div className="w-full min-h-screen bg-[#08070a] text-zinc-300 flex flex-col font-sans relative overflow-hidden">

      {/* LUMIÈRE */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[500px]"
          style={{background:"radial-gradient(ellipse 50% 80% at 50% 0%, rgba(6,182,212,0.06) 0%, transparent 70%)"}}/>
      </div>

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

      {/* NAV — 8 onglets fixes, traduits, page active mise en évidence */}
      <nav className="border-b border-zinc-100 dark:border-zinc-800/60 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-sm z-50">
        <Link href="/1/hall" className="font-bold text-sm text-zinc-800 dark:text-zinc-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
          Echo AI
        </Link>
        <div className="flex items-center gap-5 text-sm flex-wrap">
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className={item.href === "/1/dashboard" ? "text-cyan-600 dark:text-cyan-400 font-semibold" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"}>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="relative z-10 flex-1 px-4 lg:px-32 py-12">

        {/* EN-TÊTE */}
        <div className="text-center mb-12">
          <p className="text-[10px] font-mono tracking-[0.5em] text-cyan-500 font-bold mb-3">{dict.area}</p>
          <h1 className="text-4xl sm:text-5xl font-extralight tracking-[0.15em] text-white uppercase mb-3"
            style={{textShadow:"0 0 40px rgba(6,182,212,0.2)"}}>
            {dict.title}
          </h1>
          <div className="w-16 h-px mx-auto bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mb-3"/>
          <p className="text-sm text-zinc-500 italic">{dict.subtitle}</p>
        </div>

        {/* ONGLETS + BOUTON EN/FR */}
        <div className="flex justify-center items-center gap-2 mb-10 flex-wrap">
          {(["outils","events","regles"] as const).map(tab=>(
            <button key={tab} onClick={()=>setActiveSection(tab)}
              className={`px-5 py-2 rounded-xl text-xs font-mono uppercase tracking-widest font-bold transition-all border ${
                activeSection===tab
                  ? "border-cyan-500/50 bg-cyan-950/40 text-cyan-400"
                  : "border-zinc-800 bg-black/20 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
              }`}>
              {dict.tabs[tab]}
            </button>
          ))}
          <button onClick={() => setLang(l => l === "fr" ? "en" : "fr")}
            className="px-3 py-2 rounded-xl text-xs font-mono uppercase tracking-widest font-bold border border-zinc-800 bg-black/20 text-zinc-500 hover:border-cyan-500/50 hover:text-cyan-400 transition-all">
            {lang === "fr" ? "EN" : "FR"}
          </button>
        </div>

        <div className="max-w-2xl mx-auto">

          {/* ── OUTILS ── */}
          {activeSection==="outils" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {ROWS.map((row, ri) => (
                <div key={ri}>
                  <p className="text-[9px] font-mono font-black tracking-[4px] uppercase mb-4 text-center"
                    style={{color:`${row.color}0.5)`}}>
                    {lang==="fr" ? row.labelFr : row.labelEn}
                  </p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    {row.tools.map((tool, ti) => (
                      <a key={ti} href={tool.href}
                        className="group relative w-24 h-24 flex flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all duration-300 overflow-hidden select-none no-underline"
                        style={{
                          background: `linear-gradient(135deg,${row.color}0.12) 0%,${row.color}0.05) 100%)`,
                          borderColor: `${row.color}0.35)`,
                          boxShadow:   `0 0 20px ${row.color}0.1),inset 0 1px 0 ${row.color}0.2)`,
                        }}
                        onMouseEnter={e=>{
                          const el = e.currentTarget as HTMLElement;
                          el.style.boxShadow = `0 0 35px ${row.color}0.4)`;
                          el.style.transform = "translateY(-3px)";
                          el.style.borderColor = `${row.color}0.7)`;
                        }}
                        onMouseLeave={e=>{
                          const el = e.currentTarget as HTMLElement;
                          el.style.boxShadow = `0 0 20px ${row.color}0.1),inset 0 1px 0 ${row.color}0.2)`;
                          el.style.transform = "translateY(0)";
                          el.style.borderColor = `${row.color}0.35)`;
                        }}>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                          style={{background:`linear-gradient(135deg,${row.color}0.18) 0%,${row.color}0.06) 100%)`}}/>
                        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l opacity-40"
                          style={{borderColor:`${row.color}1)`}}/>
                        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r opacity-40"
                          style={{borderColor:`${row.color}1)`}}/>
                        <span className="relative z-10 text-3xl">{tool.icon}</span>
                        <span className={`relative z-10 text-[8px] font-mono font-black tracking-widest uppercase ${tool.textClass}`}>
                          {lang==="fr" ? tool.nameFr : tool.nameEn}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── ÉVÉNEMENTS ── */}
          {activeSection==="events" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-6">{dict.eventsTitle}</p>
              {EVENTS[lang].length===0 ? (
                <p className="text-sm text-zinc-600 italic text-center py-10">{dict.eventsEmpty}</p>
              ) : (
                EVENTS[lang].map((ev,i)=>(
                  <div key={i} className="border border-zinc-800/80 bg-[#0a0a0d] rounded-2xl p-5 flex gap-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500/50 to-transparent rounded-l-2xl"/>
                    <div className="shrink-0 text-center w-16">
                      <p className="text-[10px] font-mono text-zinc-600">{ev.date.split("-")[0]}</p>
                      <p className="text-lg font-black text-white">{ev.date.split("-")[2]}</p>
                      <p className="text-[10px] font-mono text-cyan-400 uppercase">
                        {new Date(ev.date).toLocaleString(lang==="fr"?"fr-CA":"en-CA",{month:"short"})}
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

          {/* ── RÈGLEMENT ── */}
          {activeSection==="regles" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border border-amber-800/40 bg-amber-900/10 rounded-2xl p-5">
                <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest mb-2">⚠️ {lang==="fr"?"Avertissement important":"Important notice"}</p>
                <p className="text-xs text-amber-200/80 leading-relaxed">{dict.reglesWarn}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4">{dict.reglesTitle}</p>
                <div className="flex flex-col gap-2">
                  {REGLES[lang].map(r=>(
                    <div key={r.id} className="flex items-start gap-4 border border-zinc-900 bg-black/20 rounded-xl px-4 py-3">
                      <span className="text-[10px] font-mono text-zinc-600 font-bold shrink-0 mt-0.5 w-5 text-right">{String(r.id).padStart(2,"0")}</span>
                      <p className="text-sm text-zinc-400 leading-relaxed">{r.text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-zinc-600 font-mono text-center italic">{dict.reglesNote}</p>
            </div>
          )}

        </div>
      </div>

      <footer className="relative z-20 h-8 border-t border-zinc-950 bg-black/60 px-6 flex items-center justify-between text-[10px] font-mono text-zinc-600 shrink-0">
        <p>DASHBOARD</p>
        <p>{time}</p>
        <p>© 2026 ECHOSAI.CA</p>
      </footer>
    </div>
  );
}