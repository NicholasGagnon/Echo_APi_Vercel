"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useApp } from "../../context/AppContext";

type Particle = { id: number; x: number; y: number; size: number; speed: number; opacity: number; color: string };

// Pays/devises disponibles
const CURRENCIES = [
  { code: "CAD", symbol: "$", flag: "🇨🇦", label: "CA$" },
  { code: "USD", symbol: "$", flag: "🇺🇸", label: "US$" },
  { code: "EUR", symbol: "€", flag: "🇪🇺", label: "EUR" },
  { code: "GBP", symbol: "£", flag: "🇬🇧", label: "GBP" },
];

export default function WelcomePage() {
  const { lang, setLang } = useApp();
  const fr = lang === "fr";
  const router = useRouter();

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const animRef    = useRef<number>(0);
  const [showLang,     setShowLang]     = useState(false);
  const [showCurrency, setShowCurrency] = useState(false);
  const [currency,     setCurrency]     = useState(CURRENCIES[0]);
  const langRef     = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);

  const globalAudioRef = useRef<HTMLAudioElement | null>(null);

  const [echoStep, setEchoStep] = useState<"lang_select" | "loading" | "typing" | "closed">("lang_select");
  const [dotsLine1,           setDotsLine1]           = useState("");
  const [dotsLine2Part1,      setDotsLine2Part1]      = useState("");
  const [dotsLine2Part2,      setDotsLine2Part2]      = useState("");
  const [showCompanionStatus, setShowCompanionStatus] = useState(false);
  const [displayedText,       setDisplayedText]       = useState("");

  const [showEasterModal, setShowEasterModal] = useState(false);
  // FLAG pour savoir si easter egg a été vu — bloque la redirection stripe
  const easterSeenRef = useRef(false);

  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingInterval1Ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeout1Ref  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const typingInterval2Ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const closeTimerRef      = useRef<ReturnType<typeof setTimeout>  | null>(null);

  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [signInError,   setSignInError]   = useState<string | null>(null);
  const [signUpError,   setSignUpError]   = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState<string | null>(null);

  const fullTextPart1 = fr
    ? "Bonjour Je suis Echo. \n\nC'est mon nom... J'ai vraiment dit ça 💀💀💀, \nJe suis une Présence augmentée, Synchronisée à votre réalité... "
    : "Hello I am Echo. \n\nThat's my name... Did I really just say that? 💀💀💀, \nI am an Augmented Presence, Synchronized with your reality... ";

  const fullTextPart2 = fr
    ? "\n\nIci commence un voyage entre Gestion, découverte, création et exploration.\nPréparez-vous à découvrir l'inattendu à mes côtés.\nJe resterai Connectée à votre parcours.\n\nVenez avec moi ------------------------------"
    : "\n\nHere begins a journey between Management, discovery, creation and exploration.\nGet ready to discover the unexpected by my side.\nI will stay Connected to your path.\n\nCome with me ------------------------------";

  const clearAllTimers = () => {
    if (loadingIntervalRef.current) { clearInterval(loadingIntervalRef.current); loadingIntervalRef.current = null; }
    if (typingInterval1Ref.current) { clearInterval(typingInterval1Ref.current); typingInterval1Ref.current = null; }
    if (typingTimeout1Ref.current)  { clearTimeout(typingTimeout1Ref.current);   typingTimeout1Ref.current  = null; }
    if (typingInterval2Ref.current) { clearInterval(typingInterval2Ref.current); typingInterval2Ref.current = null; }
    if (closeTimerRef.current)      { clearTimeout(closeTimerRef.current);        closeTimerRef.current      = null; }
  };

  const closePanelNow = () => {
    clearAllTimers();
    if (globalAudioRef.current) { globalAudioRef.current.pause(); globalAudioRef.current = null; }
    setEchoStep("closed");
  };

  // Fermer les dropdowns au clic extérieur
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (langRef.current     && !langRef.current.contains(e.target as Node))     setShowLang(false);
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) setShowCurrency(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Sauvegarder la devise dans localStorage
  useEffect(() => {
    const saved = localStorage.getItem("echo_currency");
    if (saved) {
      const found = CURRENCIES.find(c => c.code === saved);
      if (found) setCurrency(found);
    }
  }, []);

  const selectCurrency = (c: typeof CURRENCIES[0]) => {
    setCurrency(c);
    localStorage.setItem("echo_currency", c.code);
    setShowCurrency(false);
  };

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

  useEffect(() => {
    if (echoStep !== "loading") return;
    let currentDot = 0;
    loadingIntervalRef.current = setInterval(() => {
      currentDot++;
      if (currentDot <= 90)        setDotsLine1(p => p + ".");
      else if (currentDot <= 130)  setDotsLine2Part1(p => p + ".");
      else if (currentDot === 131) setShowCompanionStatus(true);
      else if (currentDot <= 141)  setDotsLine2Part2(p => p + ".");
      else {
        clearInterval(loadingIntervalRef.current!); loadingIntervalRef.current = null;
        closeTimerRef.current = setTimeout(() => setEchoStep("typing"), 650);
      }
    }, 2);
    return () => { if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current); };
  }, [echoStep]);

  useEffect(() => {
    if (echoStep !== "typing") return;
    let currentIndex = 0;
    setDisplayedText("");
    typingInterval1Ref.current = setInterval(() => {
      currentIndex++;
      setDisplayedText(fullTextPart1.substring(0, currentIndex));
      if (currentIndex >= fullTextPart1.length) {
        clearInterval(typingInterval1Ref.current!); typingInterval1Ref.current = null;
        typingTimeout1Ref.current = setTimeout(() => {
          typingTimeout1Ref.current = null;
          let secondIndex = 0;
          typingInterval2Ref.current = setInterval(() => {
            secondIndex++;
            setDisplayedText(fullTextPart1 + fullTextPart2.substring(0, secondIndex));
            if (secondIndex >= fullTextPart2.length) {
              clearInterval(typingInterval2Ref.current!); typingInterval2Ref.current = null;
              closeTimerRef.current = setTimeout(() => { closeTimerRef.current = null; closePanelNow(); }, 6500);
            }
          }, 12);
        }, 1000);
      }
    }, 15);
    return () => {
      if (typingInterval1Ref.current) { clearInterval(typingInterval1Ref.current); typingInterval1Ref.current = null; }
      if (typingTimeout1Ref.current)  { clearTimeout(typingTimeout1Ref.current);   typingTimeout1Ref.current  = null; }
      if (typingInterval2Ref.current) { clearInterval(typingInterval2Ref.current); typingInterval2Ref.current = null; }
      if (closeTimerRef.current)      { clearTimeout(closeTimerRef.current);        closeTimerRef.current      = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [echoStep, lang]);

  const initSequence = (selectedLang: "fr" | "en") => {
    setLang(selectedLang);
    setDotsLine1(""); setDotsLine2Part1(""); setDotsLine2Part2("");
    setShowCompanionStatus(false); setDisplayedText("");
    setEchoStep("loading");
    const sciFiAudio = new Audio("/sounds/futur.mp3");
    sciFiAudio.currentTime = 0;
    sciFiAudio.volume = 0.5;
    globalAudioRef.current = sciFiAudio;
    sciFiAudio.play().catch(o => console.error("⚠️ Lecture bloquée :", o));
  };

  // FIX EASTER EGG — on nettoie le flag stripe avant toute connexion OAuth
  const handleGoogleConnectNormal = async () => {
    localStorage.removeItem("echo-treasure-redirect"); // nettoyage easter egg
    easterSeenRef.current = false;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/account`, scopes: "openid profile email", queryParams: { prompt: "select_account" } },
      });
      if (error) throw error;
    } catch (err: any) { console.error(err.message); }
  };

  const handleMicrosoftConnectNormal = async () => {
    localStorage.removeItem("echo-treasure-redirect"); // nettoyage easter egg
    easterSeenRef.current = false;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: { redirectTo: `${window.location.origin}/account`, scopes: "openid profile email User.Read" },
      });
      if (error) throw error;
    } catch (err: any) { console.error(err.message); }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.removeItem("echo-treasure-redirect");
    setSignInError(null);
    if (!email.trim() || !password.trim()) { setSignInError(fr ? "Veuillez entrer vos identifiants" : "Please enter your credentials"); return; }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setSignInError(error.message);
    else router.push("/account");
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.removeItem("echo-treasure-redirect");
    setSignUpError(null); setSignUpSuccess(null);
    if (!email.trim() || !password.trim()) { setSignUpError(fr ? "Veuillez entrer un courriel et un mot de passe" : "Please enter an email and password"); return; }
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/account` } });
    if (error) setSignUpError(error.message);
    else {
      if (data?.user && (!data.user.identities || data.user.identities.length === 0)) { setSignUpError(fr ? "Un compte avec cet e-mail existe déjà." : "An account with this email already exists."); return; }
      setSignUpSuccess(fr ? "Inscription réussie ! Vérifiez votre boîte de réception." : "Registration success! Check your inbox.");
    }
  };

  const handleEasterEggClick = () => {
    localStorage.setItem("echo-treasure-redirect", "1");
    easterSeenRef.current = true;
    setShowEasterModal(true);
  };

  const closeEasterModal = () => {
    // On retire le flag stripe quand on ferme sans aller vers services
    localStorage.removeItem("echo-treasure-redirect");
    easterSeenRef.current = false;
    setShowEasterModal(false);
  };

  const clearInputs = () => { setEmail(""); setPassword(""); setSignInError(null); setSignUpError(null); setSignUpSuccess(null); };
  const goToAccount = () => { if (echoStep === "closed") router.push("/account"); };

  return (
    <main className="relative min-h-screen w-full bg-black overflow-x-hidden flex flex-col items-center">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0"/>
      <div className="absolute inset-0 z-0 pointer-events-none"
        style={{background:"radial-gradient(ellipse 80% 55% at 50% 0%, rgba(6,182,212,0.15) 0%, transparent 70%)"}}/>
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.025]"
        style={{backgroundImage:"linear-gradient(rgba(6,182,212,1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,1) 1px, transparent 1px)", backgroundSize:"60px 60px"}}/>

      {/* ── CONTROLS TOP RIGHT ── */}
      <div className="absolute top-5 right-5 z-30 flex items-center gap-2">

        {/* DEVISE */}
        <div ref={currencyRef} className="relative">
          <button onClick={e => { e.stopPropagation(); setShowCurrency(v=>!v); }}
            className="flex items-center gap-1.5 bg-zinc-900/90 border border-cyan-500/40 hover:border-cyan-400 rounded-xl px-3 py-2 text-xs font-mono font-bold text-cyan-400 transition-all shadow-[0_0_8px_rgba(6,182,212,0.15)]">
            <span>{currency.flag}</span>
            <span>{currency.label}</span>
            <span className="text-zinc-600 text-[9px]">{showCurrency ? "▲" : "▼"}</span>
          </button>
          {showCurrency && (
            <div className="absolute right-0 mt-1.5 w-28 bg-zinc-950 border border-cyan-500/30 rounded-xl shadow-xl overflow-hidden z-50">
              {CURRENCIES.map(c => (
                <button key={c.code} onClick={() => selectCurrency(c)}
                  className={`w-full text-left px-3 py-2 text-xs font-mono flex items-center gap-2 transition-colors ${currency.code===c.code?"bg-cyan-500/10 text-cyan-400":"text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"}`}>
                  {c.flag} {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* LANGUE */}
        <div ref={langRef} className="relative">
          <button onClick={e => { e.stopPropagation(); setShowLang(v=>!v); }}
            className="flex items-center gap-2 bg-zinc-900/90 border border-cyan-500/40 hover:border-cyan-400 rounded-xl px-3 py-2 text-xs font-mono font-bold text-cyan-400 transition-all shadow-[0_0_8px_rgba(6,182,212,0.15)]">
            <span>{fr ? "🇫🇷 FR" : "🇬🇧 EN"}</span>
            <span className="text-zinc-600 text-[9px]">{showLang ? "▲" : "▼"}</span>
          </button>
          {showLang && (
            <div className="absolute right-0 mt-1.5 w-32 bg-zinc-950 border border-cyan-500/30 rounded-xl shadow-xl overflow-hidden z-50">
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
      </div>

      {/* ── CONTENU PRINCIPAL ── */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-10 pb-16 flex flex-col items-center gap-6">

        <div onClick={goToAccount}
          className={`flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest text-cyan-400 ${echoStep === "closed" ? "cursor-pointer select-none hover:bg-cyan-500/20" : ""} transition-all`}>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"/>
          Echo AI Ecosystem
        </div>

        <div className="flex flex-col items-center gap-3">
          <div onClick={goToAccount} className={`text-center ${echoStep === "closed" ? "cursor-pointer select-none" : ""}`}>
            <h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-white font-mono leading-none">
              ECHO <span className="text-cyan-400">AI</span>
            </h1>
            <h2 className="text-zinc-300 text-base mt-2 font-semibold tracking-wide">
              {fr ? "L'IA Agentique qui transforme chaque interaction en résultat" : "The Agentic AI that transforms every interaction into results"}
            </h2>
          </div>
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4 items-start">

          {/* BLOC GAUCHE */}
          {echoStep === "lang_select" && (
            <div className="bg-white/[0.04] backdrop-blur-xl border-2 border-cyan-500/40 rounded-2xl p-8 flex flex-col justify-center items-center min-h-[440px] shadow-[0_0_30px_rgba(6,182,212,0.15)] gap-6">
              <h3 className="text-white font-mono text-xs uppercase tracking-widest font-bold text-center">
                Select System Language / Choisir la langue
              </h3>
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                <button onClick={() => initSequence("fr")}
                  className="flex-1 py-3.5 rounded-xl border-2 border-cyan-400 bg-cyan-500/10 text-white font-mono text-sm font-bold tracking-wider hover:bg-cyan-500/30 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  🇫🇷 Français
                </button>
                <button onClick={() => initSequence("en")}
                  className="flex-1 py-3.5 rounded-xl border-2 border-cyan-400 bg-cyan-500/10 text-white font-mono text-sm font-bold tracking-wider hover:bg-cyan-500/30 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  🇬🇧 English
                </button>
              </div>
            </div>
          )}

          {(echoStep === "loading" || echoStep === "typing") && (
            <div className="bg-white/[0.06] backdrop-blur-xl border-2 border-cyan-400/50 rounded-2xl p-6 relative flex flex-col justify-between min-h-[440px] shadow-[0_0_35px_rgba(6,182,212,0.2)]">
              <button onClick={closePanelNow}
                className="absolute top-4 right-5 text-zinc-400 hover:text-cyan-300 font-mono text-xl font-bold transition-colors p-1 z-30">✕</button>
              <div className={`absolute top-4 right-14 ${echoStep === "typing" ? "animate-echo-slide-out" : "opacity-0"}`}>
                <img src="/echo1.png" alt="Echo Icon" className="w-14 h-14 rounded-full border border-cyan-500/30 object-contain shadow-[0_0_15px_rgba(6,182,212,0.4)]"/>
              </div>
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
              {echoStep === "typing" && (
                <div className="text-sm sm:text-base text-white font-medium whitespace-pre-wrap leading-relaxed font-sans tracking-wide pt-4 flex-1">
                  {displayedText}
                  <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse align-middle"/>
                </div>
              )}
            </div>
          )}

          {echoStep === "closed" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full min-h-[440px] items-center justify-center p-2">
              <div onClick={() => router.push("/account")}
                className="group relative h-28 sm:h-32 flex flex-col items-center justify-center gap-2 rounded-2xl border transition-all duration-300 overflow-hidden select-none cursor-pointer"
                style={{background:"linear-gradient(135deg,rgba(59,130,246,0.15) 0%,rgba(37,99,235,0.05) 100%)",borderColor:"rgba(59,130,246,0.4)",boxShadow:"0 0 25px rgba(59,130,246,0.15),inset 0 1px 0 rgba(59,130,246,0.3)"}}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{background:"linear-gradient(135deg,rgba(59,130,246,0.25) 0%,rgba(59,130,246,0.1) 100%)"}}/>
                <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-blue-400/70"/><div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-blue-400/70"/>
                <svg className="relative z-10 w-11 h-11" viewBox="0 0 64 64" fill="none">
                  <rect x="6" y="10" width="52" height="48" rx="8" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.6)" strokeWidth="2"/>
                  <rect x="6" y="10" width="52" height="20" rx="8" fill="rgba(59,130,246,0.4)"/>
                  <circle cx="20" cy="8" r="4" fill="rgba(59,130,246,0.8)"/><circle cx="44" cy="8" r="4" fill="rgba(59,130,246,0.8)"/>
                  <rect x="14" y="36" width="8" height="7" rx="2" fill="rgba(59,130,246,0.7)"/>
                </svg>
                <span className="relative z-10 text-[9px] font-mono font-black tracking-widest uppercase text-blue-400">{fr?"CALENDRIER":"CALENDAR"}</span>
              </div>
              <div onClick={() => router.push("/account")}
                className="group relative h-28 sm:h-32 flex flex-col items-center justify-center gap-2 rounded-2xl border transition-all duration-300 overflow-hidden select-none cursor-pointer"
                style={{background:"linear-gradient(135deg,rgba(234,179,8,0.15) 0%,rgba(202,138,4,0.05) 100%)",borderColor:"rgba(234,179,8,0.4)",boxShadow:"0 0 25px rgba(234,179,8,0.15),inset 0 1px 0 rgba(234,179,8,0.3)"}}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{background:"linear-gradient(135deg,rgba(234,179,8,0.25) 0%,rgba(234,179,8,0.1) 100%)"}}/>
                <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-yellow-400/70"/><div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-yellow-400/70"/>
                <svg className="relative z-10 w-11 h-11" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="36" r="22" fill="rgba(234,179,8,0.15)" stroke="rgba(234,179,8,0.6)" strokeWidth="2"/>
                  <text x="32" y="43" textAnchor="middle" fontSize="20" fontWeight="bold" fill="rgba(234,179,8,0.9)">$</text>
                </svg>
                <span className="relative z-10 text-[9px] font-mono font-black tracking-widest uppercase text-yellow-400">BUDGET</span>
              </div>
              <div onClick={() => router.push("/account")}
                className="group relative h-28 sm:h-32 flex flex-col items-center justify-center gap-2 rounded-2xl border transition-all duration-300 overflow-hidden select-none cursor-pointer"
                style={{background:"linear-gradient(135deg,rgba(34,197,94,0.15) 0%,rgba(22,163,74,0.05) 100%)",borderColor:"rgba(34,197,94,0.4)",boxShadow:"0 0 25px rgba(34,197,94,0.15),inset 0 1px 0 rgba(34,197,94,0.3)"}}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{background:"linear-gradient(135deg,rgba(34,197,94,0.25) 0%,rgba(34,197,94,0.1) 100%)"}}/>
                <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-green-400/70"/><div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-green-400/70"/>
                <svg className="relative z-10 w-11 h-11" viewBox="0 0 64 64" fill="none">
                  <ellipse cx="32" cy="38" rx="18" ry="16" fill="rgba(34,197,94,0.2)" stroke="rgba(34,197,94,0.6)" strokeWidth="2"/>
                  <path d="M32 22 Q36 14 44 12 Q38 18 32 22Z" fill="rgba(34,197,94,0.8)"/>
                </svg>
                <span className="relative z-10 text-[9px] font-mono font-black tracking-widest uppercase text-green-400">CALORIES</span>
              </div>
              <div onClick={() => router.push("/account")}
                className="group relative h-28 sm:h-32 flex flex-col items-center justify-center gap-2 rounded-2xl border transition-all duration-300 overflow-hidden select-none cursor-pointer"
                style={{background:"linear-gradient(135deg,rgba(139,92,246,0.15) 0%,rgba(109,40,217,0.05) 100%)",borderColor:"rgba(139,92,246,0.4)",boxShadow:"0 0 25px rgba(139,92,246,0.15),inset 0 1px 0 rgba(139,92,246,0.3)"}}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{background:"linear-gradient(135deg,rgba(139,92,246,0.25) 0%,rgba(139,92,246,0.1) 100%)"}}/>
                <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-violet-400/70"/><div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-violet-400/70"/>
                <svg className="relative z-10 w-11 h-11" viewBox="0 0 64 64" fill="none">
                  <rect x="8"  y="12" width="20" height="40" rx="3" fill="rgba(139,92,246,0.5)" stroke="rgba(139,92,246,0.7)" strokeWidth="1.5"/>
                  <rect x="30" y="10" width="20" height="42" rx="3" fill="rgba(168,85,247,0.5)" stroke="rgba(168,85,247,0.7)" strokeWidth="1.5"/>
                </svg>
                <span className="relative z-10 text-[9px] font-mono font-black tracking-widest uppercase text-violet-400">{fr?"LIVRE":"BOOK"}</span>
              </div>
              <div onClick={() => router.push("/account")}
                className="group relative h-28 sm:h-32 flex flex-col items-center justify-center gap-2 rounded-2xl border transition-all duration-300 overflow-hidden select-none cursor-pointer"
                style={{background:"linear-gradient(135deg,rgba(6,182,212,0.15) 0%,rgba(8,145,178,0.05) 100%)",borderColor:"rgba(6,182,212,0.45)",boxShadow:"0 0 25px rgba(6,182,212,0.2),inset 0 1px 0 rgba(6,182,212,0.3)"}}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{background:"linear-gradient(135deg,rgba(6,182,212,0.25) 0%,rgba(6,182,212,0.1) 100%)"}}/>
                <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-cyan-400"/><div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-cyan-400"/>
                <div className="relative z-10 text-2xl filter drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">💎</div>
                <span className="relative z-10 text-[9px] font-mono font-black tracking-widest uppercase text-cyan-400">PREMIUM</span>
              </div>
              <div onClick={handleEasterEggClick}
                className="group relative h-28 sm:h-32 flex flex-col items-center justify-center gap-2 rounded-2xl border transition-all duration-300 overflow-hidden select-none cursor-pointer"
                style={{background:"linear-gradient(135deg,rgba(245,158,11,0.18) 0%,rgba(217,119,6,0.06) 100%)",borderColor:"rgba(245,158,11,0.5)",boxShadow:"0 0 30px rgba(245,158,11,0.25),inset 0 1px 0 rgba(245,158,11,0.4)"}}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{background:"linear-gradient(135deg,rgba(245,158,11,0.3) 0%,rgba(245,158,11,0.15) 100%)"}}/>
                <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-amber-400 animate-pulse"/><div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-amber-400 animate-pulse"/>
                <div className="relative z-10 text-2xl filter drop-shadow-[0_0_10px_rgba(245,158,11,0.6)] group-hover:scale-110 transition-transform duration-300">👑</div>
                <span className="relative z-10 text-[9px] font-mono font-black tracking-widest uppercase text-amber-400 animate-pulse">EASTER EGG</span>
              </div>
            </div>
          )}

          {/* BLOC DROIT — CONNEXION */}
          <div className="bg-zinc-950/90 border border-cyan-500/25 rounded-2xl p-6 backdrop-blur-sm shadow-[0_0_40px_rgba(6,182,212,0.06)] flex flex-col gap-4">
            <p className="text-center text-white font-bold text-lg">
              {fr ? "Connectez-vous pour commencer" : "Sign in to get started"}
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={handleGoogleConnectNormal}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm rounded-xl transition-all shadow-md">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.18 2.18 5.94l3.66 2.84c.87-2.6 3.3-4.4 6.16-4.4z" fill="#EA4335"/>
                </svg>
                <span className="flex-1 text-center">{fr ? "Continuer avec Google" : "Continue with Google"}</span>
              </button>
              <button onClick={handleMicrosoftConnectNormal}
                className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm rounded-xl transition-all border border-zinc-700">
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
                <button onClick={() => setShowSignInModal(true)}
                  className="h-12 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm rounded-xl transition-all shadow-md">
                  {fr ? "Se connecter" : "Sign in"}
                </button>
                <button onClick={() => setShowSignUpModal(true)}
                  className="h-12 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm rounded-xl transition-all border border-zinc-700">
                  {fr ? "Créer un compte" : "Create account"}
                </button>
              </div>
            </div>
            <div className="mt-1">
              <button onClick={() => window.location.href="/"}
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

        <p onClick={goToAccount}
          className={`text-zinc-700 text-[10px] font-mono mt-2 ${echoStep === "closed" ? "cursor-pointer select-none" : ""}`}>
          {fr ? "Cliquez n'importe où pour continuer" : "Click anywhere to continue"} · © {new Date().getFullYear()} Echo AI
        </p>
      </div>

      {/* MODAL SIGN IN */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 max-w-xl w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <form onSubmit={handleEmailSignIn} className="space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-900 pb-4">
                <div>
                  <h2 className="text-base font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-bold">🛸 {fr ? "Accès Écosystème" : "Account Access"}</h2>
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">{fr ? "Entrez vos paramètres d'authentification." : "Input your encryption parameters."}</p>
                </div>
                <button type="button" onClick={() => { setShowSignInModal(false); clearInputs(); }} className="text-zinc-400 hover:text-black dark:hover:text-white font-mono text-sm p-2 transition-colors">✕</button>
              </div>
              {signInError && <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/50 rounded-xl p-3 text-xs text-red-600 dark:text-red-400 font-mono">⚠️ {signInError}</div>}
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] uppercase font-mono tracking-wider text-zinc-500 block mb-1.5 font-bold">{fr ? "Adresse Courriel" : "Email"}</label>
                  <input type="email" placeholder="name@domain.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"/>
                </div>
                <div>
                  <label className="text-[11px] uppercase font-mono tracking-wider text-zinc-500 block mb-1.5 font-bold">{fr ? "Mot de Passe" : "Password"}</label>
                  <input type="password" placeholder="••••••••••••" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"/>
                </div>
              </div>
              <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md">{fr ? "Se connecter" : "Sign in"}</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SIGN UP */}
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
              {signUpError   && <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/50 rounded-xl p-3 text-xs text-red-600 dark:text-red-400 font-mono">⚠️ {signUpError}</div>}
              {signUpSuccess && <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-600 dark:text-emerald-400 font-mono">✓ {signUpSuccess}</div>}
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] uppercase font-mono tracking-wider text-zinc-500 block mb-1.5 font-bold">{fr ? "Adresse Courriel" : "Email"}</label>
                  <input type="email" placeholder="name@domain.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"/>
                </div>
                <div>
                  <label className="text-[11px] uppercase font-mono tracking-wider text-zinc-500 block mb-1.5 font-bold">{fr ? "Mot de Passe" : "Password"}</label>
                  <input type="password" placeholder="••••••••••••" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"/>
                </div>
              </div>
              <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md">{fr ? "Créer mon compte" : "Create my account"}</button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE EASTER EGG */}
      {showEasterModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100000] p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-[0_0_50px_rgba(245,158,11,0.3)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={closeEasterModal} className="absolute top-4 right-5 text-zinc-500 hover:text-white font-mono text-lg transition-colors">✕</button>
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-2xl animate-bounce">👑</div>
            <div className="text-center space-y-2 mt-3">
              <h3 className="text-sm font-black text-amber-400 tracking-wider font-mono uppercase">
                {fr ? "🎉✨ ACCÈS PORTAIL SECRET ✨🎉" : "🎉✨ SECRET PORTAL ACCESSED ✨🎉"}
              </h3>
              <h4 className="text-white font-bold text-base font-mono uppercase tracking-wide">
                {fr ? "🏆 FÉLICITATIONS !" : "🏆 CONGRATULATIONS!"}
              </h4>
              <p className="text-zinc-300 font-medium text-xs sm:text-sm bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 inline-block leading-relaxed">
                {fr ? "« Le plan Ultra à 40 %, de rabais, passe de 19,99 $ à 11,99 $ »" : "\"The Ultra plan with 40% off, goes from $19.99 to $11.99\""}
              </p>
            </div>
            <div className="mt-5 space-y-2.5 text-left text-xs sm:text-sm text-zinc-300 font-sans border-t border-b border-zinc-900 py-4 max-w-xs mx-auto">
              <p className="text-amber-400 font-bold font-mono tracking-wide mb-1 text-center sm:text-left">
                {fr ? "✨ Ultra débloque :" : "✨ Ultra unlocks:"}
              </p>
              <div className="space-y-1 text-zinc-200 font-medium">
                <p>• {fr ? "1 200 messages IA par cycle 💎" : "1,200 AI messages per cycle 💎"}</p>
                <p>• {fr ? "300 Actions HorizonWeb 💎" : "300 HorizonWeb Actions 💎"}</p>
                <p>• {fr ? "240 prompts comportementales 💎" : "240 behavioral prompts 💎"}</p>
                <p>• {fr ? "120 actions Calendrier 💎" : "120 Calendar actions 💎"}</p>
                <p>• {fr ? "300 actions Budget&Nutrition 💎" : "300 Budget&Nutrition actions 💎"}</p>
                <p>• {fr ? "Support prioritaire 💎" : "Priority support 💎"}</p>
                <p>• {fr ? "Analyse d'image 💎" : "Image analysis 💎"}</p>
                <p>• {fr ? "Historique et chat illimité 💎" : "Unlimited history and chat 💎"}</p>
                <p>• {fr ? "1 mois du 3ième meilleur plan 💎" : "1 month of the 3rd best plan 💎"}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <button onClick={() => { setShowEasterModal(false); router.push("/services"); }}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 font-mono text-xs font-bold rounded-xl text-white uppercase tracking-widest transition-all shadow-md text-center">
                {fr ? "Voir les offres ➔" : "View offers ➔"}
              </button>
              <button onClick={closeEasterModal} className="w-full py-1.5 text-zinc-600 font-mono text-[11px] hover:text-zinc-400 transition-colors">
                {fr ? "Plus tard" : "Later"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes echoSlideOut {
          0%   { opacity: 0;   transform: scale(0.7) translate(0, 0); }
          10%  { opacity: 0.9; transform: scale(1)   translate(0, 0); }
          60%  { opacity: 0.9; transform: scale(1)   translate(0, 0); }
          88%  { opacity: 0.8; transform: scale(1)   translate(40px, 80px); }
          100% { opacity: 0;   transform: scale(0.5) translate(160px, 260px); }
        }
        .animate-echo-slide-out { animation: echoSlideOut 13s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
      `}</style>
    </main>
  );
}