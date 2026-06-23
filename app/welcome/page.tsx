"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useApp } from "../../context/AppContext";

type Particle = { id: number; x: number; y: number; size: number; speed: number; opacity: number; color: string };

const FEATURES = [
  { icon: "📈", fr: "Flux Financier & Budget",      en: "Financial Flow & Budget"     },
  { icon: "📅", fr: "Calendrier & Evenements",       en: "Calendar & Events"           },
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

  // RÉFÉRENCE DE SÉCURITÉ POUR L'AUDIO GLOBAL
  const globalAudioRef = useRef<HTMLAudioElement | null>(null);

  // ÉTATS DE SÉQUENCE INTERNE D'ECHO
  const [echoStep, setEchoStep] = useState<"lang_select" | "loading" | "typing" | "closed">("lang_select");
  const [dotsLine1, setDotsLine1] = useState("");
  const [dotsLine2Part1, setDotsLine2Part1] = useState("");
  const [dotsLine2Part2, setDotsLine2Part2] = useState("");
  const [showCompanionStatus, setShowCompanionStatus] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [showSecondBlock, setShowSecondBlock] = useState(false);

  // MODALS D'AUTHENTIFICATION SUPABASE
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState<string | null>(null);

  const fullTextPart1 = fr 
    ? "Bonjour Je suis Echo. \n\nC'est mon nom... J'ai vraiment dit ça 💀💀💀, \nJe suis une Présence augmentée, Synchronisée à votre réalité... "
    : "Hello I am Echo. \n\nThat's my name... Did I really just say that? 💀💀💀, \nI am an Augmented Presence, Synchronized with your reality... ";

  const fullTextPart2 = fr
    ? "\n\nIci commence un voyage entre Gestion, découverte, création et exploration.\nPréparez-vous à découvrir l'inattendu à mes côtés.\nJe resterai Connectée à votre parcours.\n\nVenez avec moi ------------------------------"
    : "\n\nHere begins a journey between Management, discovery, creation and exploration.\nGet ready to discover the unexpected by my side.\nI will stay Connected to your path.\n\nCome with me ------------------------------";

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

  // ── SÉQUENCE SYNCHRONISATION PRÉCISE DES POINTS ───────────────────────────
  useEffect(() => {
    if (echoStep !== "loading") return;

    let currentDot = 0;
    const interval = setInterval(() => {
      currentDot++;
      
      if (currentDot <= 90) {
        setDotsLine1((prev) => prev + ".");
      } else if (currentDot <= 130) {
        setDotsLine2Part1((prev) => prev + ".");
      } else if (currentDot === 131) {
        setShowCompanionStatus(true);
      } else if (currentDot <= 141) {
        setDotsLine2Part2((prev) => prev + ".");
      } else {
        clearInterval(interval);
        setTimeout(() => setEchoStep("typing"), 650);
      }
    }, 2);

    return () => clearInterval(interval);
  }, [echoStep]);

  // ── SÉQUENCE MACHINE À ÉCRIRE ─────────────────────────────────────────────
  useEffect(() => {
    if (echoStep !== "typing") return;
    let currentIndex = 0;
    const typeInterval = setInterval(() => {
      if (currentIndex < fullTextPart1.length) {
        setDisplayedText(fullTextPart1.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
        setTimeout(() => {
          setShowSecondBlock(true);
          let secondIndex = 0;
          const secondInterval = setInterval(() => {
            if (secondIndex < fullTextPart2.length) {
              setDisplayedText(fullTextPart1 + fullTextPart2.substring(0, secondIndex + 1));
              secondIndex++;
            } else {
              clearInterval(secondInterval);
            }
          }, 12);
        }, 1000);
      }
    }, 15);
    return () => clearInterval(typeInterval);
  }, [echoStep, lang]);

  useEffect(() => {
    if (echoStep === "closed" && globalAudioRef.current) {
      globalAudioRef.current.pause();
      globalAudioRef.current = null;
    }
  }, [echoStep]);

  // ── AUTRES EFFETS ET UTILS ────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setEchoPhase(p => (p+1)%3), 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLang(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const echoClass = ["echo-idle","echo-speaking","echo-thinking"][echoPhase];

  const handleGoogleConnectNormal = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/account`,
          scopes: "openid profile email",
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err.message);
    }
  };

  const handleMicrosoftConnectNormal = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo: `${window.location.origin}/account`,
          scopes: "openid profile email User.Read",
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err.message);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    if (!email.trim() || !password.trim()) {
      setSignInError(fr ? "Veuillez entrer vos identifiants" : "Please enter your credentials");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setSignInError(error.message);
    } else {
      router.push("/account");
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);
    setSignUpSuccess(null);
    if (!email.trim() || !password.trim()) {
      setSignUpError(fr ? "Veuillez entrer un courriel et un mot de passe" : "Please enter an email and password");
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/account` },
    });
    if (error) {
      setSignUpError(error.message);
    } else {
      if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
        setSignUpError(fr ? "Un compte avec cet e-mail existe déjà." : "An account with this email already exists.");
        return;
      }
      setSignUpSuccess(fr ? "Inscription réussie ! Vérifiez votre boîte de réception." : "Registration success! Check your inbox.");
    }
  };

  const clearInputs = () => {
    setEmail("");
    setPassword("");
    setSignInError(null);
    setSignUpError(null);
    setSignUpSuccess(null);
  };

  // ── GESTION CORRIGÉE ET INFAILLIBLE DES CLICS DE REDIRECTION ──
  const handlePageClick = (e: React.MouseEvent) => {
    // Si l'overlay de démarrage ou le sélecteur initial est là, on bloque.
    if (echoStep !== "closed") return; 

    // On vérifie si l'utilisateur a cliqué sur un bouton, un input, ou dans un modal Supabase ouvert
    const targetElement = e.target as HTMLElement;
    const isActionButton = targetElement.closest("button, a, input, textarea, [role='button']");
    const isInsideModal = targetElement.closest(".fixed.inset-0.z-50"); // Repère nos fenêtres d'inscriptions

    // Si ce n'est NI un bouton NI l'intérieur d'un modal d'inscription, REDIRECTION !
    if (!isActionButton && !isInsideModal) {
      router.push("/account");
    }
  };

  const initSequence = (selectedLang: "fr" | "en") => {
    setLang(selectedLang);
    setEchoStep("loading");

    console.log("🔊 Tentative de lecture audio lancée...");
    const sciFiAudio = new Audio("/sounds/futur.mp3");
    sciFiAudio.currentTime = 0; 
    sciFiAudio.volume = 0.5; // Ajusté à 50% comme convenu !
    globalAudioRef.current = sciFiAudio;

    sciFiAudio.onloadeddata = () => console.log("✅ Fichier audio chargé.");
    sciFiAudio.onerror = (e) => console.error("❌ Erreur chargement audio.", e);

    sciFiAudio.play()
      .then(() => console.log("🎉 Audio en cours de lecture !"))
      .catch(o => console.error("⚠️ Lecture bloquée :", o));
  };

  return (
    <main
      onClick={handlePageClick}
      className="relative min-h-screen w-full bg-black overflow-x-hidden flex flex-col items-center cursor-pointer"
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0"/>

      <div className="absolute inset-0 z-0 pointer-events-none"
        style={{background:"radial-gradient(ellipse 80% 55% at 50% 0%, rgba(6,182,212,0.10) 0%, transparent 70%)"}}/>

      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.025]"
        style={{backgroundImage:"linear-gradient(rgba(6,182,212,1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,1) 1px, transparent 1px)", backgroundSize:"60px 60px"}}/>

      {/* LANG DROPDOWN COIN DROIT */}
      <div ref={langRef} className="absolute top-5 right-5 z-50">
        <button onClick={e => { e.stopPropagation(); setShowLang(v=>!v); }}
          className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-700 hover:border-cyan-500/50 rounded-xl px-3 py-2 text-xs font-mono font-bold text-zinc-300 transition-all">
          <span>{fr ? "🇫🇷 FR" : "🇬🇧 EN"}</span>
          <span className="text-zinc-600">{showLang ? "▲" : "▼"}</span>
        </button>
        {showLang && (
          <div className="absolute right-0 mt-1.5 w-32 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50">
            <button onClick={e => { e.stopPropagation(); setLang("fr"); setShowLang(false); }}
              className={`w-full text-left px-3 py-2.5 text-xs font-mono flex items-center gap-2 transition-colors ${lang==="fr"?"bg-cyan-500/10 text-cyan-400":"text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"}`}>
              🇫🇷 Français
            </button>
            <button onClick={e => { e.stopPropagation(); setLang("en"); setShowLang(false); }}
              className={`w-full text-left px-3 py-2.5 text-xs font-mono flex items-center gap-2 transition-colors ${lang==="en"?"bg-cyan-500/10 text-cyan-400":"text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"}`}>
              🇬🇧 English
            </button>
          </div>
        )}
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-10 pb-16 flex flex-col items-center gap-6">

        {/* BADGE */}
        <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest text-cyan-400">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"/>
          Echo AI Ecosystem
        </div>

        {/* ECHO FLOTTANT CENTRAL */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full"
              style={{background:"conic-gradient(from 0deg, transparent 50%, rgba(6,182,212,0.45) 80%, #06b6d4 100%)", animation:"spinRadar 3s linear infinite"}}/>
            <div className="absolute inset-2 rounded-full"
              style={{background:"conic-gradient(from 180deg, transparent 55%, rgba(16,185,129,0.25) 80%, #10b981 100%)", animation:"spinRadar 5s linear infinite reverse"}}/>
            <div className="absolute inset-3 rounded-full bg-black/85 border border-cyan-500/20"/>
            <div className={`relative z-10 w-32 h-32 rounded-full overflow-hidden border-2 border-cyan-500/70 shadow-[0_0_40px_rgba(6,182,212,0.6)] ${echoClass}`}>
              <img src="/echo1.png" alt="Echo" className="w-full h-full object-cover"/>
            </div>
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

          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-white font-mono leading-none">
              ECHO <span className="text-cyan-400">AI</span>
            </h1>
            <h2 className="text-zinc-300 text-base mt-2 font-semibold tracking-wide">
              {fr
                ? "L'IA Agentique qui transforme chaque interaction en résultat"
                : "The Agentic AI that transforms every interaction into results"}
            </h2>
          </div>
        </div>

        {/* DEUX BLOCS COTE A COTE */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2 items-start">

          {/* BLOC GAUCHE — PANNEAU INTERACTIF D'ECHO */}
          {echoStep === "lang_select" && (
            <div className="bg-white/[0.04] backdrop-blur-xl border-2 border-cyan-500/40 rounded-2xl p-8 flex flex-col justify-center items-center min-h-[380px] -mt-8 lg:-ml-6 shadow-[0_0_30px_rgba(6,182,212,0.15)] gap-6">
              <h3 className="text-white font-mono text-xs uppercase tracking-widest font-bold text-center">
                Select System Language / Choisir la langue
              </h3>
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                <button onClick={(e) => { e.stopPropagation(); initSequence("fr"); }} className="flex-1 py-3.5 rounded-xl border-2 border-cyan-400 bg-cyan-500/10 text-white font-mono text-sm font-bold tracking-wider hover:bg-cyan-500/30 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  🇫🇷 Français
                </button>
                <button onClick={(e) => { e.stopPropagation(); initSequence("en"); }} className="flex-1 py-3.5 rounded-xl border-2 border-cyan-400 bg-cyan-500/10 text-white font-mono text-sm font-bold tracking-wider hover:bg-cyan-500/30 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  🇬🇧 English
                </button>
              </div>
            </div>
          )}

          {echoStep !== "lang_select" && echoStep !== "closed" && (
            <div className="bg-white/[0.06] backdrop-blur-xl border-2 border-cyan-400/50 rounded-2xl p-6 relative flex flex-col justify-between min-h-[380px] -mt-8 lg:-ml-6 shadow-[0_0_35px_rgba(6,182,212,0.2)]">
              <button onClick={(e) => { e.stopPropagation(); setEchoStep("closed"); }}
                className="absolute top-4 right-5 text-zinc-400 hover:text-cyan-300 font-mono text-xl font-bold transition-colors p-1 z-30">
                ✕
              </button>

              {/* Bébé Echo Flottant Unique */}
              <div className={`absolute top-4 right-14 ${echoStep === "typing" ? "animate-echo-slide-out" : "opacity-0"}`}>
                <img src="/echo1.png" alt="Echo Icon" className="w-14 h-14 rounded-full border border-cyan-500/30 object-contain shadow-[0_0_15px_rgba(6,182,212,0.4)]" />
              </div>

              {/* Terminal de points millimétré */}
              <div className="text-xs font-mono select-none text-zinc-400 break-all leading-relaxed pr-8">
                <div>{fr ? "Synchronisation du système en cours" : "System synchronization in progress"}</div>
                <div className="tracking-tighter opacity-70">{dotsLine1}</div>
                <div className="inline tracking-tighter opacity-70">{dotsLine2Part1}</div>
                {showCompanionStatus && (
                  <span className="text-cyan-300 font-bold mx-1 font-mono tracking-wide">
                    {fr ? "Compagnon numérique activé..." : "Digital companion activated..."}
                  </span>
                )}
                <div className="inline tracking-tighter opacity-70">{dotsLine2Part2}</div>
              </div>

              {/* Zone Machine à écrire */}
              {echoStep === "typing" && (
                <div className="text-sm sm:text-base text-white font-medium whitespace-pre-wrap leading-relaxed font-sans tracking-wide pt-4 flex-1">
                  {displayedText}
                </div>
              )}
            </div>
          )}

          {echoStep === "closed" && (
            <div className="bg-zinc-950/85 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
              <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-4">
                {fr ? "Un écosystème conçu pour gérer l'essentiel :" : "An ecosystem built to manage the essentials:"}
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
                  {fr ? "Tout est synchronisé." : "Everything is synchronized."}
                </span>
              </div>
            </div>
          )}

          {/* BLOC DROIT — FORMULAIRE DE CONNEXION */}
          <div className="bg-zinc-950/90 border border-cyan-500/25 rounded-2xl p-6 backdrop-blur-sm shadow-[0_0_40px_rgba(6,182,212,0.06)] flex flex-col gap-4">
            <p className="text-center text-white font-bold text-lg">
              {fr ? "Connectez-vous pour commencer" : "Sign in to get started"}
            </p>

            <div className="flex flex-col gap-3">
              <button onClick={e => { e.stopPropagation(); handleGoogleConnectNormal(); }}
                className="w-full h-13 flex items-center gap-3 px-4 py-3 bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm rounded-xl transition-all shadow-md">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.18 2.18 5.94l3.66 2.84c.87-2.6 3.3-4.4 6.16-4.4z" fill="#EA4335"/>
                </svg>
                <span className="flex-1 text-center">{fr ? "Continuer avec Google" : "Continue with Google"}</span>
              </button>

              <button onClick={e => { e.stopPropagation(); handleMicrosoftConnectNormal(); }}
                className="w-full h-13 flex items-center gap-3 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm rounded-xl transition-all border border-zinc-700">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 23 23" fill="none">
                  <path d="M0 0H11V11H0V0Z" fill="#F25022"/>
                  <path d="M12 0H23V11H12V0Z" fill="#7FBA00"/>
                  <path d="M0 12H11V23H0V12Z" fill="#00A4EF"/>
                  <path d="M12 12H23V23H12V12Z" fill="#FFB900"/>
                </svg>
                <span className="flex-1 text-center">{fr ? "Continuer avec Microsoft" : "Continue with Microsoft"}</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-800"/>
                <span className="text-zinc-600 text-[10px] font-mono uppercase">{fr ? "ou par email" : "or by email"}</span>
                <div className="flex-1 h-px bg-zinc-800"/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={e => { e.stopPropagation(); setShowSignInModal(true); }}
                  className="h-12 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm rounded-xl transition-all shadow-md">
                  {fr ? "Se connecter" : "Sign in"}
                </button>
                <button onClick={e => { e.stopPropagation(); setShowSignUpModal(true); }}
                  className="h-12 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm rounded-xl transition-all border border-zinc-700">
                  {fr ? "Créer un compte" : "Create account"}
                </button>
              </div>
            </div>

            <div className="mt-1">
              <button onClick={e => { e.stopPropagation(); window.location.href="/"; }}
                className="w-full h-11 flex items-center justify-center gap-2 bg-transparent border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 font-semibold text-sm rounded-xl transition-all">
                <span>🏠</span>
                <span>{fr ? "Accéder à l'accueil sans compte" : "Access home without account"}</span>
              </button>
              <p className="text-center text-zinc-600 text-[10px] font-mono mt-1.5">
                {fr ? "Fonctionnalités limitées en mode invité" : "Limited features in guest mode"}
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <p className="text-zinc-700 text-[10px] font-mono mt-2">
          {fr ? "Cliquez n'importe où pour continuer" : "Click anywhere to continue"} · © {new Date().getFullYear()} Echo AI
        </p>
      </div>

      {/* MODAL SUPABASE SIGN IN */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 max-w-xl w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <form onSubmit={handleEmailSignIn} className="space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-900 pb-4">
                <div>
                  <h2 className="text-base font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-bold">🛸 {fr ? "Accès Écosystème" : "Account Access"}</h2>
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">{fr ? "Entrez vos paramètres d'authentification pour synchroniser votre profil." : "Input your encryption parameters to sync your profile."}</p>
                </div>
                <button type="button" onClick={() => { setShowSignInModal(false); clearInputs(); }} className="text-zinc-400 hover:text-black dark:hover:text-white font-mono text-sm p-2 transition-colors">✕</button>
              </div>
              {signInError && <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/50 rounded-xl p-3 text-xs text-red-600 dark:text-red-400 font-mono">⚠️ {signInError}</div>}
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] uppercase font-mono tracking-wider text-zinc-500 block mb-1.5 font-bold">{fr ? "Adresse Courriel" : "Identity Node (Email)"}</label>
                  <input type="email" placeholder="name@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner" />
                </div>
                <div>
                  <label className="text-[11px] uppercase font-mono tracking-wider text-zinc-500 block mb-1.5 font-bold">{fr ? "Mot de Passe" : "Access Token (Password)"}</label>
                  <input type="password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner" />
                </div>
              </div>
              <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md">{fr ? "Se connecter à votre compte" : "Login to your account"}</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUPABASE SIGN UP */}
      {showSignUpModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 max-w-xl w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <form onSubmit={handleEmailSignUp} className="space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-900 pb-4">
                <div>
                  <h2 className="text-base font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-bold">🛸 {fr ? "Créer un Profil" : "Initialize Profile"}</h2>
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">{fr ? "Initialisez votre nœud d'identité dans l'écosystème Echo." : "Initialize your identity node within the Echo ecosystem."}</p>
                </div>
                <button type="button" onClick={() => { setShowSignUpModal(false); clearInputs(); }} className="text-zinc-400 hover:text-black dark:hover:text-white font-mono text-sm p-2 transition-colors">✕</button>
              </div>
              {signUpError && <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/50 rounded-xl p-3 text-xs text-red-600 dark:text-red-400 font-mono">⚠️ {signUpError}</div>}
              {signUpSuccess && <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-600 dark:text-emerald-400 font-mono">✓ {signUpSuccess}</div>}
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] uppercase font-mono tracking-wider text-zinc-500 block mb-1.5 font-bold">{fr ? "Adresse Courriel" : "Identity Node (Email)"}</label>
                  <input type="email" placeholder="name@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner" />
                </div>
                <div>
                  <label className="text-[11px] uppercase font-mono tracking-wider text-zinc-500 block mb-1.5 font-bold">{fr ? "Mot de Passe" : "Access Token (Password)"}</label>
                  <input type="password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner" />
                </div>
              </div>
              <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md">{fr ? "Créer mon compte" : "Create my account"}</button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spinRadar { 100% { transform: rotate(360deg); } }
        
        @keyframes echoSlideOut {
          0% {
            opacity: 0;
            transform: scale(0.7) translate(0, 0);
          }
          10% {
            opacity: 0.9;
            transform: scale(1) translate(0, 0);
          }
          60% {
            opacity: 0.9;
            transform: scale(1) translate(0, 0);
          }
          88% {
            opacity: 0.8;
            transform: scale(1) translate(40px, 80px);
          }
          100% {
            opacity: 0;
            transform: scale(0.5) translate(160px, 260px);
          }
        }

        .animate-echo-slide-out {
          animation: echoSlideOut 13s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}</style>
    </main>
  );
}