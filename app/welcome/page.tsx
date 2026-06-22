"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useApp } from "../../context/AppContext";

type Particle = { id: number; x: number; y: number; size: number; speed: number; opacity: number; color: string };

const FEATURES = [
  { icon: "📈", fr: "Flux Financier & Budget",     en: "Financial Flow & Budget"     },
  { icon: "📅", fr: "Calendrier & Evenements",      en: "Calendar & Events"           },
  { icon: "🍏", fr: "Suivi Nutrition & Sante",      en: "Nutrition & Health Tracking" },
  { icon: "📚", fr: "Ecriture de Livre",             en: "Book Writing"                },
  { icon: "✅", fr: "Boutons comportementaux",       en: "Behavioral Buttons"          },
  { icon: "🎯", fr: "Crazy WebSearch",               en: "Crazy WebSearch"             },
  { icon: "💬", fr: "Dialogue actif en continu",    en: "Continuous Active Dialogue"  },
];

export default function WelcomePage() {
  const { lang, setLang } = useApp();
  const fr = lang === "fr";
  const router = useRouter();

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const animRef    = useRef<number>(0);
  const [echoPhase, setEchoPhase] = useState(0);
  const [showLang, setShowLang]   = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // ── PARTICULES ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = canvas.width  = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const onResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener("resize", onResize);

    const COLORS = ["#06b6d4","#22d3ee","#10b981","#818cf8","#06b6d4"];
    const particles: Particle[] = Array.from({length:90}, (_,i) => ({
      id:i, x:Math.random()*window.innerWidth, y:Math.random()*window.innerHeight,
      size:Math.random()*2+0.4, speed:Math.random()*0.45+0.08,
      opacity:Math.random()*0.5+0.08, color:COLORS[Math.floor(Math.random()*COLORS.length)],
    }));

    const draw = () => {
      ctx.clearRect(0,0,w,h);
      for (const p of particles) {
        p.y -= p.speed;
        if (p.y < -4) { p.y = h+4; p.x = Math.random()*w; }
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
        ctx.fillStyle = p.color; ctx.globalAlpha = p.opacity; ctx.fill(); ctx.globalAlpha = 1;
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i+1; j < particles.length; j++) {
          const dx = particles[i].x-particles[j].x, dy = particles[i].y-particles[j].y;
          const dist = Math.sqrt(dx*dx+dy*dy);
          if (dist < 90) {
            ctx.beginPath(); ctx.moveTo(particles[i].x,particles[i].y); ctx.lineTo(particles[j].x,particles[j].y);
            ctx.strokeStyle="#06b6d4"; ctx.globalAlpha=(1-dist/90)*0.07; ctx.lineWidth=0.5; ctx.stroke(); ctx.globalAlpha=1;
          }
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", onResize); };
  }, []);

  // ── ECHO PHASE ────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setEchoPhase(p => (p+1)%3), 3000);
    return () => clearInterval(t);
  }, []);

  // ── LANG DROPDOWN CLOSE ───────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => { if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLang(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const echoClass = ["echo-idle","echo-speaking","echo-thinking"][echoPhase];

  // Toute la page est cliquable → /account, SAUF les boutons interactifs
  const handlePageClick = (e: React.MouseEvent) => {
    const tag = (e.target as HTMLElement).closest("button,a,input,select,textarea,[data-stop]");
    if (!tag) router.push("/account");
  };

  return (
    <main
      onClick={handlePageClick}
      className="relative min-h-screen w-full bg-black overflow-x-hidden flex flex-col items-center cursor-pointer"
    >
      {/* CANVAS */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0"/>

      {/* RADIAL GLOW */}
      <div className="absolute inset-0 z-0 pointer-events-none"
        style={{background:"radial-gradient(ellipse 80% 55% at 50% 0%, rgba(6,182,212,0.10) 0%, transparent 70%)"}}/>

      {/* GRID */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.025]"
        style={{backgroundImage:"linear-gradient(rgba(6,182,212,1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,1) 1px, transparent 1px)", backgroundSize:"60px 60px"}}/>

      {/* LANG DROPDOWN — top right */}
      <div ref={langRef} className="absolute top-5 right-5 z-50" data-stop="">
        <button onClick={e => { e.stopPropagation(); setShowLang(v=>!v); }}
          className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-700 hover:border-cyan-500/50 rounded-xl px-3 py-2 text-xs font-mono font-bold text-zinc-300 transition-all">
          <span>{lang === "fr" ? "🇫🇷 FR" : "🇬🇧 EN"}</span>
          <span className="text-zinc-600">{showLang ? "▲" : "▼"}</span>
        </button>
        {showLang && (
          <div className="absolute right-0 mt-1.5 w-32 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50">
            <button onClick={e => { e.stopPropagation(); setLang("fr"); setShowLang(false); }}
              className={`w-full text-left px-3 py-2.5 text-xs font-mono flex items-center gap-2 transition-colors ${lang==="fr"?"bg-cyan-500/10 text-cyan-400":"text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"}`}>
              🇫🇷 Francais
            </button>
            <button onClick={e => { e.stopPropagation(); setLang("en"); setShowLang(false); }}
              className={`w-full text-left px-3 py-2.5 text-xs font-mono flex items-center gap-2 transition-colors ${lang==="en"?"bg-cyan-500/10 text-cyan-400":"text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"}`}>
              🇬🇧 English
            </button>
          </div>
        )}
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-10 pb-16 flex flex-col items-center gap-6">

        {/* BADGE */}
        <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest text-cyan-400">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"/>
          Echo AI Ecosystem
        </div>

        {/* ECHO FLOTTANT — centré en haut */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-44 h-44 flex items-center justify-center">
            {/* Anneau ext */}
            <div className="absolute inset-0 rounded-full"
              style={{background:"conic-gradient(from 0deg, transparent 50%, rgba(6,182,212,0.45) 80%, #06b6d4 100%)", animation:"spinRadar 3s linear infinite"}}/>
            {/* Anneau int inverse */}
            <div className="absolute inset-2 rounded-full"
              style={{background:"conic-gradient(from 180deg, transparent 55%, rgba(16,185,129,0.25) 80%, #10b981 100%)", animation:"spinRadar 5s linear infinite reverse"}}/>
            {/* Fond */}
            <div className="absolute inset-3 rounded-full bg-black/85 border border-cyan-500/20"/>
            {/* Echo */}
            <div className={`relative z-10 w-32 h-32 rounded-full overflow-hidden border-2 border-cyan-500/70 shadow-[0_0_40px_rgba(6,182,212,0.6)] ${echoClass}`}>
              <img src="/Echo.png" alt="Echo" className="w-full h-full object-cover"/>
            </div>
            {/* Orbitaux */}
            {[0,1,2,3,4,5].map(i => (
              <div key={i} className="absolute w-2 h-2 rounded-full bg-cyan-400"
                style={{
                  top:"50%", left:"50%",
                  transform:`rotate(${i*60}deg) translateX(80px) translateY(-50%)`,
                  animation:`spinRadar ${3+i*0.35}s linear infinite`,
                  boxShadow:"0 0 8px rgba(6,182,212,0.9)", opacity:0.75,
                }}/>
            ))}
          </div>

          {/* Titre grand */}
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-white font-mono leading-none">
              ECHO <span className="text-cyan-400">AI</span>
            </h1>
            <p className="text-zinc-300 text-base mt-2 font-semibold tracking-wide">
              {fr
                ? "L'IA Agentique qui transforme chaque interaction en résultat"
                : "The Agentic AI that transforms every interaction into results"}
            </p>
          </div>
        </div>

        {/* DEUX BLOCS COTE A COTE */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-5 mt-2">

          {/* BLOC GAUCHE — ECOSYSTEME */}
          <div className="bg-zinc-950/85 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
            <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-4">
              {fr ? "Un ecosysteme concu pour gerer l'essentiel :" : "An ecosystem built to manage the essentials:"}
            </p>
            <div className="flex flex-col gap-3">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-zinc-200 font-medium">
                  <span className="text-lg w-7 text-center shrink-0">{f.icon}</span>
                  <span>{fr ? f.fr : f.en}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-zinc-800 text-center">
              <span className="text-cyan-400 font-bold text-sm font-mono">
                {fr ? "Tout est synchronise." : "Everything is synchronized."}
              </span>
            </div>
          </div>

          {/* BLOC DROIT — CONNEXION */}
          <div className="bg-zinc-950/90 border border-cyan-500/25 rounded-2xl p-6 backdrop-blur-sm shadow-[0_0_40px_rgba(6,182,212,0.06)] flex flex-col gap-4">
            <p className="text-center text-white font-bold text-lg">
              {fr ? "Connectez-vous pour commencer" : "Sign in to get started"}
            </p>

            <div className="flex flex-col gap-3">
              {/* GOOGLE */}
              <button onClick={e => { e.stopPropagation(); window.location.href="/account"; }}
                className="w-full h-13 flex items-center gap-3 px-4 py-3 bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm rounded-xl transition-all shadow-md">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.18 2.18 5.94l3.66 2.84c.87-2.6 3.3-4.4 6.16-4.4z" fill="#EA4335"/>
                </svg>
                <span className="flex-1 text-center">{fr ? "Continuer avec Google" : "Continue with Google"}</span>
              </button>

              {/* MICROSOFT */}
              <button onClick={e => { e.stopPropagation(); window.location.href="/account"; }}
                className="w-full h-13 flex items-center gap-3 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm rounded-xl transition-all border border-zinc-700">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 23 23" fill="none">
                  <path d="M0 0H11V11H0V0Z" fill="#F25022"/>
                  <path d="M12 0H23V11H12V0Z" fill="#7FBA00"/>
                  <path d="M0 12H11V23H0V12Z" fill="#00A4EF"/>
                  <path d="M12 12H23V23H12V12Z" fill="#FFB900"/>
                </svg>
                <span className="flex-1 text-center">{fr ? "Continuer avec Microsoft" : "Continue with Microsoft"}</span>
              </button>

              {/* DIVIDER */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-800"/>
                <span className="text-zinc-600 text-[10px] font-mono uppercase">{fr ? "ou par email" : "or by email"}</span>
                <div className="flex-1 h-px bg-zinc-800"/>
              </div>

              {/* EMAIL + CREER COMPTE — redirige vers /account */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={e => { e.stopPropagation(); window.location.href="/account"; }}
                  className="h-12 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm rounded-xl transition-all shadow-md">
                  {fr ? "Se connecter" : "Sign in"}
                </button>
                <button onClick={e => { e.stopPropagation(); window.location.href="/account"; }}
                  className="h-12 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm rounded-xl transition-all border border-zinc-700">
                  {fr ? "Creer un compte" : "Create account"}
                </button>
              </div>
            </div>

            {/* ACCUEIL SANS COMPTE */}
            <div className="mt-1">
              <button onClick={e => { e.stopPropagation(); window.location.href="/"; }}
                className="w-full h-11 flex items-center justify-center gap-2 bg-transparent border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 font-semibold text-sm rounded-xl transition-all">
                <span>🏠</span>
                <span>{fr ? "Acceder a l'accueil sans compte" : "Access home without account"}</span>
              </button>
              <p className="text-center text-zinc-600 text-[10px] font-mono mt-1.5">
                {fr ? "Fonctionnalites limitees en mode invite" : "Limited features in guest mode"}
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <p className="text-zinc-700 text-[10px] font-mono mt-2">
          {fr ? "Cliquez n'importe ou pour continuer" : "Click anywhere to continue"} · © {new Date().getFullYear()} Echo AI
        </p>
      </div>

      <style>{`
        @keyframes spinRadar { 100% { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}