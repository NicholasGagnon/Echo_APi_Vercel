"use client";

import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";

export default function GrandHallPage() {
  const { lang } = useApp();
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const dict = {
    fr: {
      arch: "STREAM ARCHITECTURE",
      title: "THE GRAND HALL",
      subtitle: "Construit seul ne veut pas dire grandir seul",
      deskTitle: "PRIVATE CONTROL DESK",
      terminal: "Main Terminal 01",
      dynLeft: "DYNAMIC ELEMENT PENDING UPDATE",
      dynRightForm: "NEW REGISTRATION FORM SUBMIT",
      receptionist: "ECHO_IA_RECEPTIONIST_v2",
      welcome: "Welcome to Echo AI. The silver marble and cyan structures are stable. Your virtual law-style office is highly secure and fully synchronized.",
      tier: "Tier: Founder",
      explainTitle: "EXPLICATION DU PRODUIT ET DES PAGE",
      explainForm: "The Form page allows you to fill out your official registration to the network.",
      explainFiche: "The Fiche page helps you browse files and find a strategic project ally.",
      explainFuture: "keep space to explain future pages",
      recentActivity: "RECENT STREAM ACTIVITY",
      noActivity: "No recent activities logged.",
      luxe: "LUXE_STATUS:",
      compression: "PRIME_COMPRESSION",
      volume: "TOTAL VOLUME:",
      status: "SECURE_ECHO_CONNECTED",
      core: "CENTRAL CORE",
      foundation: "Startup foundation",
      foundationSub: "ECHO_FOUNDATION_SILVER_MARBLE",
      seating: "MULTI-FLOW SEATING AREA • LOUNGE",
      dynWarning: "ELEMENT DYNAMIQUE SUJET AU CHANGEMENT"
    },
    en: {
      arch: "STREAM ARCHITECTURE",
      title: "THE GRAND HALL",
      subtitle: "Built alone doesn't mean growing alone",
      deskTitle: "PRIVATE CONTROL DESK",
      terminal: "Main Terminal 01",
      dynLeft: "DYNAMIC ELEMENT PENDING UPDATE",
      dynRightForm: "NEW REGISTRATION FORM SUBMIT",
      receptionist: "ECHO_IA_RECEPTIONIST_v2",
      welcome: "Welcome to Echo AI. The silver marble and cyan structures are stable. Your virtual law-style office is highly secure and fully synchronized.",
      tier: "Tier: Founder",
      explainTitle: "EXPLICATION DU PRODUIT ET DES PAGE",
      explainForm: "The Form page allows you to fill out your official registration to the network.",
      explainFiche: "The Fiche page helps you browse files and find a strategic project ally.",
      explainFuture: "keep space to explain future pages",
      recentActivity: "RECENT STREAM ACTIVITY",
      noActivity: "No recent activities logged.",
      luxe: "LUXE_STATUS:",
      compression: "PRIME_COMPRESSION",
      volume: "TOTAL VOLUME:",
      status: "SECURE_ECHO_CONNECTED",
      core: "CENTRAL CORE",
      foundation: "Startup foundation",
      foundationSub: "ECHO_FOUNDATION_SILVER_MARBLE",
      seating: "MULTI-FLOW SEATING AREA • LOUNGE",
      dynWarning: "ELEMENT DYNAMIQUE SUJET AU CHANGEMENT"
    }
  }[lang === "fr" ? "fr" : "en"];

  const navigationTabs = [
    { name: "Home", href: "/1" },
    { name: "Conversation", href: "/1/conversation", active: true },
    { name: "Books", href: "#" },
    { name: "Calendar", href: "#" },
    { name: "Vitality", href: "#" },
    { name: "Services", href: "#" },
    { name: "Account", href: "#" },
    { name: "HorizonWeb", href: "#" },
    { name: "History", href: "#" }
  ];

  return (
    <div className="w-full h-screen bg-[#030304] text-zinc-300 flex flex-col justify-between overflow-hidden relative font-sans select-none">
      
      {/* ── GRILLE PRINCIPALE ── */}
      <div className="flex-1 w-full grid grid-cols-12 h-full items-stretch min-h-0">
        
        {/* ================= ZONE GAUCHE : NAVIGATION & DESK ================= */}
        <div className="col-span-2 border-r border-zinc-900/50 flex flex-col justify-between p-6 bg-black/40">
          <div className="space-y-8">
            <div className="space-y-1">
              <p className="text-[10px] font-mono tracking-[0.4em] text-cyan-500 font-bold">{dict.arch}</p>
              <h1 className="text-2xl font-light tracking-tight text-white uppercase">{dict.title}</h1>
              <p className="text-[10px] text-zinc-500 italic">{dict.subtitle}</p>
            </div>

            <nav className="flex flex-col gap-3 pt-4 border-t border-zinc-900/80">
              {navigationTabs.map((tab, idx) => (
                <div
                  key={idx}
                  className={`text-xs font-medium tracking-wide transition-colors cursor-pointer py-1 ${
                    tab.active ? "text-cyan-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab.name}
                </div>
              ))}
            </nav>

            <div className="bg-[#09090b] border border-zinc-900 p-4 rounded-xl space-y-2">
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{dict.deskTitle}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-zinc-700 rounded-sm inline-block border border-zinc-600" />
                  <span className="text-xs font-mono text-zinc-400">{dict.terminal}</span>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              </div>
            </div>
          </div>

          <div className="text-[10px] font-mono text-zinc-500 border-t border-zinc-900/60 pt-3 space-y-1">
            <p>{dict.luxe} <span className="text-zinc-300 font-bold">{dict.compression}</span></p>
            <p>{dict.volume} <span className="text-cyan-400 font-bold">12 600 m³</span></p>
          </div>
        </div>

        {/* ================= INTERSTICE VERTICAL : BANDE GAUCHE ================= */}
        <div className="col-span-1 border-r border-zinc-900/40 flex items-center justify-center bg-black/20">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.4em] [writing-mode:vertical-lr] font-medium">
            {dict.dynLeft}
          </p>
        </div>

        {/* ================= ZONE CENTRALE : EFFET PILLIER DE HAUT EN BAS ================= */}
        <div className="col-span-4 flex flex-col items-center justify-center relative bg-black/10 px-6 h-full border-r border-zinc-900/30">
          
          {/* Lignes d'infrastructure s'étirant de tout en haut à tout en bas */}
          <div className="absolute inset-y-0 w-[85%] border-x border-zinc-900/60 bg-gradient-to-b from-zinc-950/20 via-[#060608]/40 to-zinc-950/20 pointer-events-none">
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-cyan-500/30 via-cyan-400 to-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]" />
          </div>

          {/* Conteneur principal (Core + Foundation) */}
          <div className="w-full flex flex-col items-center relative z-10 space-y-0">
            
            {/* Bloc Central Core */}
            <div className="w-full bg-gradient-to-b from-[#08080a] via-[#101014] to-[#0a0a0c] border border-zinc-800/80 shadow-[0_0_80px_rgba(0,0,0,0.9)] relative flex flex-col justify-between py-10 px-4 h-[280px] rounded-t-md">
              <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-b from-zinc-700 via-zinc-500/10 to-zinc-800 border-r border-zinc-600/20" />
              <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-b from-zinc-700 via-zinc-500/10 to-zinc-800 border-l border-zinc-600/20" />
              
              <div className="text-center z-20">
                <span className="text-[11px] font-mono tracking-[0.6em] text-zinc-400 font-bold block bg-black/60 py-1 uppercase">{dict.core}</span>
              </div>

              <p className="text-xs text-center font-mono text-cyan-400 tracking-widest font-medium z-20">
                {dict.foundation}
              </p>

              <div className="text-center z-20">
                <span className="text-[10px] font-mono text-zinc-500 tracking-[0.2em] block uppercase border border-zinc-800/60 bg-zinc-950/90 px-2 py-1 rounded">
                  {dict.foundationSub}
                </span>
              </div>
            </div>

            {/* Assise Transversale Lounging (Ancrage bas du module) */}
            <div className="w-[104%] h-12 bg-gradient-to-r from-zinc-800 via-zinc-600 to-zinc-800 border border-zinc-600/40 shadow-[0_20px_40px_rgba(0,0,0,0.8)] rounded-b-xl p-0.5 relative z-20">
              <div className="w-full h-full bg-zinc-950 rounded-b-lg flex items-center justify-center border border-zinc-900">
                <span className="text-[10px] font-mono text-zinc-400 tracking-[0.4em] font-black uppercase">{dict.seating}</span>
              </div>
            </div>

          </div>
        </div>

        {/* ================= ZONE INTERMÉDIAIRE DROITE : EXPLICS & FORM ================= */}
        <div className="col-span-3 border-r border-zinc-900/50 flex flex-col justify-between p-6 bg-black/40">
          <div className="border border-dashed border-zinc-800 p-4 rounded-xl bg-black/50 space-y-3">
            <div className="space-y-0.5">
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{dict.dynWarning}</p>
              <p className="text-xs font-mono text-cyan-400 font-bold tracking-wide">// {dict.dynRightForm}</p>
            </div>
            <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
              <div className="w-3/5 h-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]" />
            </div>
          </div>

          <div className="bg-[#070709] border border-zinc-900/80 p-5 rounded-xl space-y-5 flex-1 mt-6 flex flex-col justify-center shadow-lg">
            <p className="text-[11px] font-mono text-zinc-400 tracking-[0.15em] uppercase border-b border-zinc-900 pb-3 font-bold">
              📋 {dict.explainTitle}
            </p>
            
            <div className="space-y-4 text-xs font-light leading-relaxed text-zinc-400">
              <div>
                <span className="text-cyan-400 font-mono font-bold block mb-1">la page form :</span>
                <p className="pl-2 border-l border-zinc-900">{dict.explainForm}</p>
              </div>
              <div>
                <span className="text-white font-mono font-bold block mb-1">la page fiche :</span>
                <p className="pl-2 border-l border-zinc-900">{dict.explainFiche}</p>
              </div>
              <div className="pt-3 border-t border-zinc-900/60 text-zinc-600 font-mono italic text-[11px]">
                {dict.explainFuture}
              </div>
            </div>
          </div>
        </div>

        {/* ================= ZONE EXTÉRIEURE DROITE : IA & STREAM ACTIVITY MI-HAUTEUR ================= */}
        <div className="col-span-2 flex flex-col justify-between p-6 bg-black h-full">
          
          <div className="flex-1 flex flex-col justify-start space-y-4 min-h-0">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <div>
                <p className="text-[9px] font-mono text-zinc-600 tracking-wider">SECURITY STATUS</p>
                <span className="text-[10px] text-cyan-400 font-mono font-bold">{dict.status}</span>
              </div>
              <span className="text-xs font-mono text-zinc-500">{time}</span>
            </div>

            {/* Boîtier Réceptionniste IA */}
            <div className="border border-zinc-800/80 bg-[#050507] rounded-xl p-4 space-y-4 shadow-2xl flex-1 max-h-[350px] flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="text-[10px] font-mono text-zinc-400 font-bold tracking-wider">{dict.receptionist}</span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
              </div>
              
              <div className="flex-1 flex items-center">
                <p className="text-xs text-zinc-400 italic leading-relaxed font-light">
                  “{dict.welcome}”
                </p>
              </div>

              <div className="text-[10px] font-mono text-zinc-600 pt-2 border-t border-zinc-900 flex justify-between">
                <span>{dict.tier}</span>
                <span className="text-cyan-500 font-bold tracking-wider">ONLINE</span>
              </div>
            </div>
          </div>

          {/* Réajustement de l'activité à mi-page */}
          <div className="border border-zinc-900 bg-[#040405] p-4 rounded-xl space-y-3 mt-4 mb-8">
            <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-bold">⏱️ {dict.recentActivity}</p>
            <div className="h-24 flex items-center justify-center border border-zinc-900/80 rounded-lg bg-black/40">
              <span className="text-[10px] font-mono text-zinc-600 italic tracking-wide">{dict.noActivity}</span>
            </div>
          </div>

        </div>

      </div>

      {/* FOOTER */}
      <footer className="h-8 border-t border-zinc-950 bg-black px-6 flex items-center justify-between text-[10px] font-mono text-zinc-600 tracking-wider z-20">
        <p>INFRASTRUCTURE: <span className="text-zinc-500 font-bold">SITE_1_ACTIVE</span></p>
        <p>© 2026 ECHOSAI.CA — ALL RIGHTS RESERVED</p>
      </footer>
      
    </div>
  );
}