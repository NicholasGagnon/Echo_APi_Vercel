"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { useApp } from "../../context/AppContext";

const MicrosoftLogo = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 23 23" fill="none">
    <path d="M0 0H11V11H0V0Z" fill="#F25022"/>
    <path d="M12 0H23V11H12V0Z" fill="#7FBA00"/>
    <path d="M0 12H11V23H0V12Z" fill="#00A4EF"/>
    <path d="M12 12H23V23H12V12Z" fill="#FFB900"/>
  </svg>
);

const GoogleLogo = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.18 2.18 5.94l3.66 2.84c.87-2.6 3.3-4.4 6.16-4.4z" fill="#EA4335"/>
  </svg>
);

type Particle = { id: number; x: number; y: number; size: number; speed: number; opacity: number; color: string };

const FEATURES = [
  { icon: "📈", fr: "Flux Financier & Budget",    en: "Financial Flow & Budget"      },
  { icon: "📅", fr: "Calendrier & Evenements",     en: "Calendar & Events"            },
  { icon: "🍏", fr: "Suivi Nutrition & Sante",     en: "Nutrition & Health Tracking"  },
  { icon: "📚", fr: "Ecriture de Livre",            en: "Book Writing"                 },
  { icon: "✅", fr: "Boutons comportementaux",      en: "Behavioral Buttons"           },
  { icon: "🎯", fr: "Crazy WebSearch",              en: "Crazy WebSearch"              },
  { icon: "💬", fr: "Dialogue actif en continu",   en: "Continuous Active Dialogue"   },
];

export default function WelcomePage() {
  const { lang } = useApp();
  const fr = lang === "fr";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const [echoPhase, setEchoPhase] = useState(0); // 0=idle, cycles
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── PARTICULES CANVAS ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = canvas.width  = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const onResize = () => {
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const COLORS = ["#06b6d4","#22d3ee","#10b981","#818cf8","#06b6d4"];
    const particles: Particle[] = Array.from({length: 80}, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.4 + 0.1,
      opacity: Math.random() * 0.5 + 0.1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.y -= p.speed;
        if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Connexion lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = "#06b6d4";
            ctx.globalAlpha = (1 - dist/80) * 0.08;
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // ── ECHO PHASE CYCLE ─────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setEchoPhase(p => (p + 1) % 3), 3000);
    return () => clearInterval(t);
  }, []);

  const echoClass = ["echo-idle","echo-speaking","echo-thinking"][echoPhase];

  // ── AUTH ─────────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setIsLoggingIn(true); setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) { setError(error.message); setIsLoggingIn(false); }
  };

  const handleMicrosoft = async () => {
    setIsLoggingIn(true); setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: { redirectTo: `${window.location.origin}/`, scopes: "openid profile email" },
    });
    if (error) { setError(error.message); setIsLoggingIn(false); }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSuccess(null);
    if (!email.trim() || !password.trim()) { setError(fr ? "Remplissez tous les champs." : "Fill in all fields."); return; }
    setIsLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setError(error.message); setIsLoggingIn(false); }
    else window.location.href = "/";
  };

  const handleEmailSignUp = async () => {
    setError(null); setSuccess(null);
    if (!email.trim() || !password.trim()) { setError(fr ? "Remplissez tous les champs." : "Fill in all fields."); return; }
    setIsLoggingIn(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (error) { setError(error.message); }
    else setSuccess(fr ? "Lien de confirmation envoye !" : "Confirmation link sent!");
    setIsLoggingIn(false);
  };

  return (
    <main className="relative min-h-screen w-full bg-black overflow-hidden flex flex-col items-center justify-start">

      {/* CANVAS PARTICULES */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* FOND RADIAL CYAN */}
      <div className="absolute inset-0 z-0 pointer-events-none"
        style={{background:"radial-gradient(ellipse 70% 60% at 50% 0%, rgba(6,182,212,0.08) 0%, transparent 70%)"}}/>

      {/* GRID OVERLAY */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{backgroundImage:"linear-gradient(rgba(6,182,212,1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,1) 1px, transparent 1px)", backgroundSize:"60px 60px"}}/>

      {/* CONTENU */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4 py-12 flex flex-col items-center gap-8">

        {/* BADGE */}
        <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest text-cyan-400">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"/>
          Echo AI Ecosystem
        </div>

        {/* ECHO FLOTTANT */}
        <div className="flex flex-col items-center gap-4">
          {/* Anneau externe rotatif */}
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* Anneau externe */}
            <div className="absolute inset-0 rounded-full"
              style={{
                background: "conic-gradient(from 0deg, transparent 50%, rgba(6,182,212,0.4) 80%, #06b6d4 100%)",
                animation: "spinRadar 3s linear infinite",
              }}/>
            {/* Anneau secondaire inverse */}
            <div className="absolute inset-2 rounded-full"
              style={{
                background: "conic-gradient(from 180deg, transparent 50%, rgba(16,185,129,0.2) 80%, #10b981 100%)",
                animation: "spinRadar 5s linear infinite reverse",
              }}/>
            {/* Cercle fond */}
            <div className="absolute inset-3 rounded-full bg-black/80 border border-cyan-500/20"/>
            {/* Echo image */}
            <div className={`relative z-10 w-28 h-28 rounded-full overflow-hidden border-2 border-cyan-500/60 shadow-[0_0_30px_rgba(6,182,212,0.5)] ${echoClass}`}>
              <img src="/Echo.png" alt="Echo" className="w-full h-full object-cover"/>
            </div>
            {/* Particules orbitales */}
            {[0,1,2,3,4,5].map(i => (
              <div key={i} className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400"
                style={{
                  top: "50%", left: "50%",
                  transform: `rotate(${i*60}deg) translateX(72px) translateY(-50%)`,
                  animation: `spinRadar ${3 + i*0.3}s linear infinite`,
                  boxShadow: "0 0 6px rgba(6,182,212,0.8)",
                  opacity: 0.7,
                }}/>
            ))}
          </div>

          {/* Titre */}
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tighter text-white font-mono">
              ECHO <span className="text-cyan-400">AI</span>
            </h1>
            <p className="text-zinc-400 text-sm mt-1 font-mono tracking-widest uppercase">
              {fr ? "Votre ecosysteme intelligent" : "Your intelligent ecosystem"}
            </p>
          </div>
        </div>

        {/* BULLE DESCRIPTION ECOSYSTEME */}
        <div className="w-full bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 backdrop-blur-sm">
          <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-3">
            {fr ? "Un ecosysteme concu pour gerer l'essentiel :" : "An ecosystem built to manage the essentials:"}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-zinc-300 font-medium">
                <span className="text-base w-6 text-center shrink-0">{f.icon}</span>
                <span>{fr ? f.fr : f.en}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800 text-center">
            <span className="text-cyan-400 font-bold text-sm font-mono">
              {fr ? "Tout est synchronise." : "Everything is synchronized."}
            </span>
          </div>
        </div>

        {/* BULLE CONNEXION */}
        <div className="w-full bg-zinc-950/90 border border-cyan-500/20 rounded-2xl p-6 backdrop-blur-sm shadow-[0_0_30px_rgba(6,182,212,0.05)]">
          <p className="text-center text-white font-bold text-base mb-5">
            {fr ? "Connectez-vous pour commencer" : "Sign in to get started"}
          </p>

          {error && (
            <div className="mb-4 bg-red-950/60 border border-red-500/40 rounded-xl px-3 py-2 text-xs text-red-400 font-mono">{error}</div>
          )}
          {success && (
            <div className="mb-4 bg-emerald-950/60 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono">{success}</div>
          )}

          <div className="flex flex-col gap-3">
            {/* GOOGLE */}
            <button onClick={handleGoogle} disabled={isLoggingIn}
              className="w-full h-12 flex items-center gap-3 px-4 bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm rounded-xl transition-all shadow-md disabled:opacity-50">
              <GoogleLogo/>
              <span className="flex-1 text-center">{fr ? "Continuer avec Google" : "Continue with Google"}</span>
            </button>

            {/* MICROSOFT */}
            <button onClick={handleMicrosoft} disabled={isLoggingIn}
              className="w-full h-12 flex items-center gap-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm rounded-xl transition-all border border-zinc-700 disabled:opacity-50">
              <MicrosoftLogo/>
              <span className="flex-1 text-center">{fr ? "Continuer avec Microsoft" : "Continue with Microsoft"}</span>
            </button>

            {/* DIVIDER */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-zinc-800"/>
              <span className="text-zinc-600 text-[10px] font-mono uppercase">{fr ? "ou par email" : "or by email"}</span>
              <div className="flex-1 h-px bg-zinc-800"/>
            </div>

            {/* EMAIL TOGGLE / FORM */}
            {!showEmailForm ? (
              <button onClick={() => setShowEmailForm(true)}
                className="w-full h-12 flex items-center justify-center gap-2 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-sm rounded-xl transition-all border border-zinc-700">
                ✉️ <span>{fr ? "Connexion par email" : "Sign in with email"}</span>
              </button>
            ) : (
              <form onSubmit={handleEmailSignIn} className="flex flex-col gap-2">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={fr ? "Adresse email" : "Email address"}
                  className="w-full h-11 bg-zinc-900 border border-zinc-700 focus:border-cyan-500 outline-none rounded-xl px-3 text-sm text-white placeholder-zinc-500 transition-colors"/>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={fr ? "Mot de passe" : "Password"}
                  className="w-full h-11 bg-zinc-900 border border-zinc-700 focus:border-cyan-500 outline-none rounded-xl px-3 text-sm text-white placeholder-zinc-500 transition-colors"/>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button type="submit" disabled={isLoggingIn}
                    className="h-10 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50">
                    {fr ? "Se connecter" : "Sign in"}
                  </button>
                  <button type="button" onClick={handleEmailSignUp} disabled={isLoggingIn}
                    className="h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-all border border-zinc-700 disabled:opacity-50">
                    {fr ? "Creer un compte" : "Create account"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* BULLE ACCEDER A L'ACCUEIL */}
        <div className="w-full">
          <Link href="/"
            className="w-full h-12 flex items-center justify-center gap-2 bg-transparent border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 font-semibold text-sm rounded-xl transition-all">
            <span className="text-base">🏠</span>
            <span>{fr ? "Acceder a l'accueil sans compte" : "Access home without account"}</span>
          </Link>
          <p className="text-center text-zinc-600 text-[10px] font-mono mt-2">
            {fr ? "Fonctionnalites limitees en mode invite" : "Limited features in guest mode"}
          </p>
        </div>

        {/* FOOTER */}
        <div className="text-center text-zinc-700 text-[10px] font-mono">
          © {new Date().getFullYear()} Echo AI — echosai.ca
        </div>
      </div>

      <style>{`
        @keyframes spinRadar { 100% { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}