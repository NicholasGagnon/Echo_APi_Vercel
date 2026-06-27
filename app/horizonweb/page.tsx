"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { checkQuota, UserTier } from "../../utils/quota";
import { useApp } from "../../context/AppContext";

const EchoSvgMascot = ({ className = "w-20 h-20" }: { className?: string }) => (
  <svg className={`${className} animate-pulse drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]`} viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="45" fill="url(#cyanGlow)" opacity="0.1" />
    <circle cx="50" cy="50" r="40" stroke="#06b6d4" strokeWidth="2" strokeDasharray="6 6" className="animate-spin [animation-duration:15s]" />
    <rect x="22" y="42" width="8" height="16" rx="4" fill="#06b6d4" />
    <rect x="70" y="42" width="8" height="16" rx="4" fill="#06b6d4" />
    <path d="M26 44 Q50 20 74 44" stroke="#06b6d4" strokeWidth="3" fill="none" />
    <rect x="28" y="36" width="44" height="32" rx="16" fill="#09090b" stroke="#06b6d4" strokeWidth="3" />
    <circle cx="41" cy="50" r="4" fill="#22d3ee" className="animate-ping [animation-duration:3s]" />
    <circle cx="41" cy="50" r="3" fill="#ffffff" />
    <circle cx="59" cy="50" r="4" fill="#22d3ee" className="animate-ping [animation-duration:3s]" />
    <circle cx="59" cy="50" r="3" fill="#ffffff" />
    <path d="M46 58 Q50 62 54 58" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M50 36 L50 24" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
    <circle cx="50" cy="22" r="3" fill="#22d3ee" />
    <defs>
      <radialGradient id="cyanGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

function BreathingResponse({ text, lang }: { text: string; lang: string }) {
  const cleaned = text
    .replace(/\\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const lines = cleaned.split("\n").filter(l => l.trim() !== "");

  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        const numberedMatch = trimmed.match(/^(\d+)[.\-\)]\s+(.+)/);
        if (numberedMatch) {
          return (
            <div key={i} className="flex gap-3 items-start">
              <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[10px] font-black font-mono flex items-center justify-center mt-0.5">
                {numberedMatch[1]}
              </span>
              <p className="text-[15px] text-zinc-700 dark:text-zinc-200 leading-relaxed flex-1">
                {numberedMatch[2]}
              </p>
            </div>
          );
        }

        const sectionMatch = trimmed.match(/^(Analyse|Recommandation|Analysis|Recommendation|Note|Conclusion)\s*[:–-]/i);
        if (sectionMatch) {
          const rest = trimmed.replace(/^[^:–-]+[:–-]\s*/, "");
          return (
            <div key={i} className="pt-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-500/70 font-bold block mb-1">
                {sectionMatch[1]}
              </span>
              {rest && <p className="text-[15px] text-zinc-700 dark:text-zinc-200 leading-relaxed">{rest}</p>}
            </div>
          );
        }

        if (trimmed.includes("**")) {
          const parts = trimmed.split(/\*\*(.+?)\*\*/g);
          return (
            <p key={i} className="text-[15px] text-zinc-700 dark:text-zinc-200 leading-relaxed">
              {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-zinc-900 dark:text-white font-bold">{p}</strong> : p)}
            </p>
          );
        }

        if (trimmed.length < 60 && !trimmed.endsWith(".") && !trimmed.endsWith(",")) {
          return (
            <p key={i} className="text-[13px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-500 pt-2">
              {trimmed}
            </p>
          );
        }

        return (
          <p key={i} className="text-[15px] text-zinc-700 dark:text-zinc-200 leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export default function HorizonWebPage() {
  const { t, lang, setLang } = useApp();

  const [query, setQuery]               = useState("");
  const [echoResponse, setEchoResponse] = useState("");
  const [attributes, setAttributes]     = useState<string[]>([]);
  const [echoState, setEchoState]       = useState<"idle" | "thinking" | "speaking">("idle");
  const [userId, setUserId]             = useState<string | null>(null);
  const [userTier, setUserTier]         = useState<UserTier>("connected_free");
  const [isPopupOpen, setIsPopupOpen]   = useState(false);
  const [showQuotaPopup, setShowQuotaPopup] = useState(false);
  const [isIntroLangOpen, setIsIntroLangOpen] = useState(false);
  const [isAvatarBroken, setIsAvatarBroken]   = useState(false);
  const [activeLens, setActiveLens]     = useState<"critical" | "expert" | "strategy" | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [isWarming, setIsWarming]       = useState(false);
  const [savedSearches, setSavedSearches] = useState<{ query: string; response: string; date: string }[]>([]);
  const warmupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warmupAbortRef = useRef<AbortController | null>(null);
  const introLangRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnOutside = (e: MouseEvent) => {
      if (introLangRef.current && !introLangRef.current.contains(e.target as Node)) setIsIntroLangOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  useEffect(() => {
    const introSeen = localStorage.getItem("horizon_intro_seen");
    if (!introSeen) setIsPopupOpen(true);

    const cachedQuery      = localStorage.getItem("horizon_last_query");
    const cachedResponse   = localStorage.getItem("horizon_last_response");
    const cachedAttributes = localStorage.getItem("horizon_last_attributes");

    if (cachedQuery)      setQuery(cachedQuery);
    if (cachedResponse)   { setEchoResponse(cachedResponse); setEchoState("speaking"); }
    if (cachedAttributes) { try { setAttributes(JSON.parse(cachedAttributes)); } catch {} }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      if (uid) {
        const { data: profile } = await supabase.from("profiles").select("user_tier").eq("id", uid).single();
        if (profile?.user_tier) {
          const raw = profile.user_tier.toLowerCase().trim();
          if (["basic","premium","ultra","founder"].includes(raw)) setUserTier(raw as UserTier);
        }
      }
    });
  }, []);

  const executeHorizonSearch = async (targetQuery: string, overrideLens?: "critical" | "expert" | "strategy" | null) => {
    if (!targetQuery.trim()) return;
    setQuery(targetQuery);
    setEchoState("thinking");
    setEchoResponse("");
    setAttributes([]);

    const lensToSend = overrideLens !== undefined ? overrideLens : activeLens;

    const quotaStatus = checkQuota("horizon", userTier, true, userId);
    if (!quotaStatus.allowed) {
      setShowQuotaPopup(true);
      setEchoState("idle");
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://echo-api-fixed.onrender.com";
      const res = await fetch(`${API_URL}/horizon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: targetQuery, userTier, lang, selectedButtons: lensToSend ? [lensToSend] : [] }),
      });
      const data = await res.json();

      if (data.response) {
        setEchoResponse(data.response);
        setAttributes(data.attributes || []);
        setEchoState("speaking");

        localStorage.setItem("horizon_last_query",      targetQuery);
        localStorage.setItem("horizon_last_response",   data.response);
        localStorage.setItem("horizon_last_attributes", JSON.stringify(data.attributes || []));
      } else {
        setAttributes(["erreur_coherence"]);
        setEchoState("idle");
      }
    } catch (err) {
      console.error("Erreur Horizon:", err);
      setAttributes(["erreur_reseau"]);
      setEchoState("idle");
    }
  };

  const closePopupAndSave = () => {
    setIsPopupOpen(false);
    localStorage.setItem("horizon_intro_seen", "true");
  };

  const triggerWarmup = () => {
    if (isWarming || echoState === "thinking" || echoState === "speaking") return;

    setIsWarming(true);
    warmupAbortRef.current = new AbortController();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://echo-api-fixed.onrender.com";

    fetch(`${API_URL}/horizon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "...",
        userTier,
        lang,
        selectedButtons: [],
        warmup: true,
      }),
      signal: warmupAbortRef.current.signal,
    }).catch(() => {});

    warmupTimerRef.current = setTimeout(() => {
      if (warmupAbortRef.current) {
        warmupAbortRef.current.abort();
        warmupAbortRef.current = null;
      }
      setIsWarming(false);
    }, 2000);
  };

  const handleInputFocus = () => {
    setInputFocused(true);
    triggerWarmup();
  };

  const handleInputBlur = () => {
    setInputFocused(false);
  };

  const handleLensClick = (lens: "critical" | "expert" | "strategy") => {
    const nextLens = activeLens === lens ? null : lens;
    setActiveLens(nextLens);
    // Prompt injection only — no auto-search triggered here
  };

  // ── Saved searches ──────────────────────────────────────────────────────

  useEffect(() => {
    try {
      const raw = localStorage.getItem("horizon_saved_searches");
      if (raw) setSavedSearches(JSON.parse(raw));
    } catch {}
  }, []);

  const saveCurrentSearch = () => {
    if (!query || !echoResponse) return;
    const entry = { query, response: echoResponse, date: new Date().toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) };
    const updated = [entry, ...savedSearches].slice(0, 20);
    setSavedSearches(updated);
    localStorage.setItem("horizon_saved_searches", JSON.stringify(updated));
  };

  const deleteSaved = (idx: number) => {
    const updated = savedSearches.filter((_, i) => i !== idx);
    setSavedSearches(updated);
    localStorage.setItem("horizon_saved_searches", JSON.stringify(updated));
  };

  const loadSaved = (s: { query: string; response: string }) => {
    setQuery(s.query);
    setEchoResponse(s.response);
    setEchoState("speaking");
  };

  return (
    <main className="h-screen bg-white dark:bg-black text-black dark:text-white flex overflow-hidden font-sans transition-colors duration-200 selection:bg-red-500/30 relative">

      {/* TOP NEON BAR — rouge + cyan split */}
      <div className="pointer-events-none fixed top-0 left-0 right-0 h-[2px] z-40"
        style={{background:"linear-gradient(90deg, transparent 0%, #dc2626 20%, #06b6d4 50%, #dc2626 80%, transparent 100%)", boxShadow:"0 0 12px 2px rgba(220,38,38,0.7), 0 0 30px 6px rgba(220,38,38,0.25)", animation:"neonSlide 4s ease-in-out infinite alternate"}}/>

      {/* QUOTA POPUP */}
      {showQuotaPopup && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border-2 border-red-500/40 p-6 rounded-2xl max-w-md w-full relative shadow-[0_0_50px_rgba(239,68,68,0.15)]">
            <button onClick={() => setShowQuotaPopup(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white font-bold font-mono text-lg">✕</button>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📡</span>
              <h3 className="text-sm font-mono uppercase tracking-widest text-red-400 font-bold">
                {lang === "fr" ? "Limite atteinte" : "Quota reached"}
              </h3>
            </div>
            <p className="text-zinc-300 text-sm font-mono leading-relaxed mb-2">
              {lang === "fr"
                ? "Tu as atteint la limite de recherches HorizonWeb pour ce cycle de 24 heures."
                : "You've reached the HorizonWeb search limit for this 24-hour cycle."}
            </p>
            <p className="text-zinc-500 text-xs font-mono mb-6">
              {lang === "fr"
                ? "Reviens dans 30 minutes pour récupérer 1 crédit, ou passe à un plan supérieur."
                : "Come back in 30 minutes to recover 1 credit, or upgrade your plan."}
            </p>
            <div className="flex gap-3">
              <Link href="/services"
                className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-black text-xs font-mono uppercase tracking-widest text-center transition-all shadow-[0_0_12px_rgba(220,38,38,0.3)]"
                onClick={() => setShowQuotaPopup(false)}>
                {lang === "fr" ? "Voir les plans" : "View plans"}
              </Link>
              <button onClick={() => setShowQuotaPopup(false)}
                className="px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white text-xs font-mono uppercase tracking-widest transition-all">
                {lang === "fr" ? "Fermer" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTRO POPUP */}
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border-2 border-red-500/40 p-6 rounded-2xl max-w-lg w-full relative shadow-[0_0_50px_rgba(220,38,38,0.2),0_0_80px_rgba(6,182,212,0.1)]">
            <button onClick={closePopupAndSave} className="absolute top-4 right-4 text-zinc-500 hover:text-white font-bold font-mono text-lg">✕</button>
            <div className="flex justify-between items-center mb-4 pr-8">
              <h3 className="text-sm font-mono uppercase tracking-widest font-bold">
                <span className="text-cyan-400">📡 Horizon</span>
                <span className="text-red-500"> Deep</span>
                <span className="text-zinc-400"> Protocol</span>
              </h3>
              <div ref={introLangRef} className="relative shrink-0">
                <button type="button" onClick={() => setIsIntroLangOpen(o => !o)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-cyan-500/60 hover:text-cyan-400 transition-all text-[11px] font-mono font-bold">
                  🌐 {lang === "fr" ? "Français" : "English"}
                  <svg className={`w-2.5 h-2.5 transition-transform ${isIntroLangOpen?"rotate-180":""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25 12 15.75 4.5 8.25"/></svg>
                </button>
                {isIntroLangOpen && (
                  <div className="absolute right-0 mt-1.5 w-32 rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-xl z-10">
                    {(["fr","en"] as const).map(l => (
                      <button key={l} type="button" onClick={() => { setLang(l); setIsIntroLangOpen(false); }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-semibold text-left transition-colors ${lang===l?"bg-red-500/10 text-red-400":"text-zinc-400 hover:bg-zinc-900"}`}>
                        {l === "fr" ? "Français" : "English"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed font-mono">
              {lang === "fr" ? (
                <>
                  <p><span className="text-cyan-400 font-bold">Horizon Deep</span> <span className="text-red-400 font-bold">Web Search</span> déploie un moteur d'exploration externe ultra-rigoureux.</p>
                  <p>Il ne livre pas de listes publicitaires : il extrait la donnée brute du terrain pour formuler des conclusions utiles.</p>
                </>
              ) : (
                <>
                  <p><span className="text-cyan-400 font-bold">Horizon Deep</span> <span className="text-red-400 font-bold">Web Search</span> deploys an ultra-rigorous external search engine.</p>
                  <p>It doesn't deliver ads or spam — it extracts raw terrain data to provide actionable conclusions.</p>
                </>
              )}
            </div>
            <button onClick={closePopupAndSave} className="w-full mt-6 py-2 rounded-xl bg-gradient-to-r from-red-700 via-red-600 to-cyan-700 hover:from-red-600 hover:to-cyan-600 text-white font-black tracking-widest text-xs uppercase transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)]">
              {lang === "fr" ? "Démarrer l'exploration" : "Initialize exploration"}
            </button>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-8 bg-zinc-50 dark:bg-zinc-950 flex-col justify-between hidden md:flex">
        <div className="space-y-20">
          <h2 className="font-bold text-lg">
            <Link href="/" className="hover:text-cyan-500 dark:hover:text-cyan-400">{t.sidebar.home}</Link>
          </h2>
          <div className="space-y-20 text-zinc-800 dark:text-zinc-100 font-medium">
            <Link href="/chat"       className="block hover:text-cyan-500">{t.sidebar.chat}</Link>
            <Link href="/books"      className="block hover:text-cyan-500">{t.sidebar.books}</Link>
            <Link href="/calendar"   className="block hover:text-cyan-500">📅 {lang==="fr"?"Calendrier":"Calendar"}</Link>
            <Link href="/vitality"   className="block hover:text-cyan-500">📈 {lang==="fr"?"Vitalité":"Vitality"}</Link>
            <Link href="/services"   className="block hover:text-cyan-500">💎 {lang==="fr"?"Services":"Services"}</Link>
            <Link href="/account"    className="block hover:text-cyan-500">👤 {lang==="fr"?"Compte":"Account"}</Link>
            <Link href="/horizonweb" className="block font-bold" style={{color:"#dc2626"}}>📡 HorizonWeb</Link>
            <hr className="border-zinc-200 dark:border-zinc-800 my-4"/>
            <Link href="/history"    className="block hover:text-amber-500">⭐ {lang==="fr"?"Historique":"History"}</Link>
          </div>
        </div>
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
          Status : <span className="text-cyan-500 dark:text-cyan-400 uppercase font-bold block">{userTier === "connected_free" ? (lang === "fr" ? "Accès libre" : "FreeConnect") : userTier}</span>
        </div>
      </aside>

      {/* MAIN */}
      <section className="flex-1 flex flex-col min-w-0 bg-white dark:bg-black transition-colors duration-200 relative overflow-hidden">

        {/* HEADER ZONE */}
        <div className="p-8 pb-6 border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center text-center shrink-0 pt-14 relative overflow-hidden">

          {/* RED AMBIENT GLOW BACKGROUND */}
          <div className="pointer-events-none absolute inset-0 z-0"
            style={{background:"radial-gradient(ellipse 80% 60% at 50% 0%, rgba(180,20,20,0.08) 0%, transparent 70%)"}}/>

          <div className="relative mb-7 z-10">
            {/* SPLIT TITLE */}
            <h1 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase font-mono select-none">
              <span
                className="text-cyan-500 dark:text-cyan-400"
                style={{textShadow:"0 0 20px rgba(6,182,212,0.6), 0 0 60px rgba(6,182,212,0.25), 0 0 100px rgba(6,182,212,0.1)"}}>
                HORIZON DEEP
              </span>
              {" "}
              <span
                className="text-red-600 dark:text-red-500"
                style={{textShadow:"0 0 20px rgba(220,38,38,0.7), 0 0 60px rgba(220,38,38,0.3), 0 0 100px rgba(220,38,38,0.15)"}}>
                WEB SEARCH
              </span>
            </h1>

            {/* DUAL UNDERLINE — cyan + red */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-[1px]"
              style={{background:"linear-gradient(90deg, transparent, #06b6d4, rgba(220,38,38,0.8), #dc2626, rgba(6,182,212,0.8), #06b6d4, transparent)", boxShadow:"0 0 8px 2px rgba(220,38,38,0.4), 0 0 4px 1px rgba(6,182,212,0.3)"}}/>
          </div>

          {/* LASER INPUT WRAPPER */}
          <div className="w-full max-w-3xl relative z-10">
            {/* Outer glow shell — animates on focus */}
            <div
              className="absolute -inset-[2px] rounded-2xl pointer-events-none z-0 transition-all duration-500"
              style={inputFocused ? {
                background: "transparent",
                boxShadow: "none",
                opacity: 0,
              } : {
                background: "linear-gradient(135deg, rgba(6,182,212,0.5), rgba(220,38,38,0.3), rgba(6,182,212,0.5))",
                boxShadow: "0 0 18px rgba(6,182,212,0.25), 0 0 8px rgba(220,38,38,0.15)",
                borderRadius: "1rem",
                opacity: 1,
              }}/>

            {/* Laser scan beam — hidden on focus */}
            {!inputFocused && (
              <div className="absolute -inset-[1px] rounded-2xl pointer-events-none z-0 overflow-hidden">
                <div style={{
                  position:"absolute", inset:0, borderRadius:"1rem",
                  background:"conic-gradient(from 0deg, transparent 60%, rgba(6,182,212,0.5) 80%, rgba(220,38,38,0.4) 90%, transparent 100%)",
                  animation:"laserOrbit 2.5s linear infinite",
                }}/>
              </div>
            )}

            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && executeHorizonSearch(query)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={lang === "fr" ? "TAPER VOTRE RECHERCHE ICI..." : "TYPE YOUR SEARCH HERE..."}
              className="relative z-10 w-full bg-white dark:bg-zinc-900 text-black dark:text-white font-mono uppercase text-sm border-2 rounded-2xl py-4 pl-6 pr-32 transition-all outline-none"
              style={{
                borderColor: isWarming
                  ? "rgba(220,38,38,0.9)"
                  : inputFocused
                    ? "rgba(6,182,212,0.8)"
                    : "transparent",
                boxShadow: isWarming
                  ? "0 0 0 3px rgba(220,38,38,0.15), 0 0 20px rgba(220,38,38,0.2), inset 0 0 20px rgba(220,38,38,0.04)"
                  : inputFocused
                    ? "0 0 0 3px rgba(6,182,212,0.12), inset 0 0 20px rgba(6,182,212,0.04)"
                    : "none",
                transition: "border-color 0.3s ease, box-shadow 0.3s ease",
              }}
            />
            <button
              onClick={() => executeHorizonSearch(query)}
              className="absolute right-2 top-2 bottom-2 z-10 text-white font-black text-xs font-mono px-6 rounded-xl transition-all uppercase tracking-widest"
              style={{background:"linear-gradient(135deg, #991b1b, #dc2626)", boxShadow:"0 0 12px rgba(220,38,38,0.5)"}}>
              EXPLORE
            </button>
            {isWarming && (
              <div className="absolute right-[calc(6rem+1rem)] top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" style={{animationDuration:"0.8s"}}/>
                <span className="text-[9px] font-mono uppercase text-red-500/70 tracking-widest">warm</span>
              </div>
            )}
          </div>

          {/* LENS BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-2 mt-4 w-full max-w-3xl justify-center font-mono z-10">
            {([
              { id:"critical" as const, label:lang==="fr"?"REGARD CRITIQUE":"CRITICAL VIEW", prefix:"3⚔️", color:"red"   },
              { id:"expert"   as const, label:lang==="fr"?"EXPERT":"EXPERT",                 prefix:"4🎓", color:"cyan"   },
              { id:"strategy" as const, label:lang==="fr"?"STRATÉGIE":"STRATEGY",            prefix:"7♟️", color:"purple" },
            ]).map(btn => {
              const isActive = activeLens === btn.id;
              const colors: Record<string, string> = {
                red:    isActive ? "bg-red-500/10 text-red-400 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.2)]"    : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-red-400/60",
                cyan:   isActive ? "bg-cyan-500/10 text-cyan-400 border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.2)]" : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-cyan-400/60",
                purple: isActive ? "bg-purple-500/10 text-purple-400 border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.2)]" : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-purple-400/60",
              };
              return (
                <button key={btn.id} onClick={() => handleLensClick(btn.id)}
                  className={`flex-1 py-2 px-4 rounded-xl text-[11px] font-black border transition-all bg-white dark:bg-zinc-900/50 ${colors[btn.color]}`}>
                  {btn.prefix} {btn.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* RESULTS ZONE */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 min-h-0 bg-white dark:bg-black flex flex-col items-center relative"
          style={{scrollbarWidth:"thin", scrollbarColor:"rgba(220,38,38,0.2) transparent"}}>

          {/* Subtle red ambient in results area */}
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-32"
            style={{background:"linear-gradient(to bottom, rgba(180,20,20,0.04), transparent)"}}/>

          {echoState === "thinking" && (
            <div className="h-64 flex flex-col items-center justify-center gap-4 font-mono">
              {isAvatarBroken ? <EchoSvgMascot className="w-20 h-20"/> : (
                <img src="/echo1.png" alt="Echo" className="w-20 h-20 object-contain echo-thinking" onError={() => setIsAvatarBroken(true)}/>
              )}
              <p className="text-red-500 dark:text-red-400 text-xs uppercase tracking-widest animate-pulse">
                {lang === "fr" ? "Plongée dans les profondeurs..." : "Diving into the deep..."}
              </p>
            </div>
          )}

          {echoState !== "thinking" && echoResponse && (
            <div className="w-full max-w-3xl space-y-6 animate-in fade-in duration-300 pb-16 relative z-10">

              {attributes.length > 0 && (
                <div className="flex gap-2 items-center flex-wrap font-mono text-[10px]">
                  <span className="text-zinc-400 uppercase font-bold">{lang === "fr" ? "Critères :" : "Criteria :"}</span>
                  {attributes.map((attr, idx) => (
                    <span key={idx} className="bg-red-500/8 text-red-600 dark:text-red-400/80 border border-red-500/20 px-2 py-0.5 rounded-md uppercase">{attr}</span>
                  ))}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-5">
                  {isAvatarBroken ? <EchoSvgMascot className="w-7 h-7"/> : (
                    <img src="/echo1.png" alt="Echo" className="w-7 h-7 object-contain echo-speaking rounded-full border border-cyan-500/30" onError={() => setIsAvatarBroken(true)}/>
                  )}
                  <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-500/70 font-bold">
                    {lang === "fr" ? "Analyse Echo" : "Echo's Analysis"}
                  </span>
                  <div className="flex-1 h-[1px]" style={{background:"linear-gradient(90deg, rgba(220,38,38,0.4), rgba(6,182,212,0.3), transparent)"}}/>
                </div>
                <BreathingResponse text={echoResponse} lang={lang} />
              </div>

              {/* SAVE BUTTON */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={saveCurrentSearch}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/60 text-red-500 dark:text-red-400 text-[11px] font-mono uppercase tracking-widest font-bold transition-all"
                  style={{boxShadow:"0 0 10px rgba(220,38,38,0.05)"}}>
                  <span>💾</span>
                  {lang === "fr" ? "Sauvegarder" : "Save"}
                </button>
              </div>
            </div>
          )}

          {echoState === "idle" && !echoResponse && (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 relative z-10">
              {isAvatarBroken ? <EchoSvgMascot className="w-24 h-24 mb-6"/> : (
                <img src="/echo1.png" alt="Echo Idle" className="w-24 h-24 object-contain echo-idle mb-6 select-none" onError={() => setIsAvatarBroken(true)}/>
              )}
              <h4 className="font-mono text-xs uppercase tracking-widest font-bold mb-1">
                <span className="text-cyan-600 dark:text-cyan-400">ECHO</span>
                <span className="text-red-600 dark:text-red-500"> IDLE</span>
              </h4>
              <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-600 uppercase max-w-xs px-4">
                {lang === "fr" ? "Entrez une intention pour démarrer la boucle d'exploration." : "Enter a query to launch the exploration loop."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* RIGHT PANEL — SAVED SEARCHES */}
      <aside className="w-64 shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex-col hidden lg:flex overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <h3 className="text-[10px] font-mono uppercase tracking-widest font-bold">
            <span className="text-cyan-500">💾 </span>
            <span className="text-zinc-400 dark:text-zinc-300">{lang === "fr" ? "Recherches sauvegardées" : "Saved searches"}</span>
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{scrollbarWidth:"thin", scrollbarColor:"rgba(220,38,38,0.15) transparent"}}>
          {savedSearches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <span className="text-2xl mb-2 opacity-30">📭</span>
              <p className="text-[10px] font-mono uppercase text-zinc-400 dark:text-zinc-600 tracking-widest">
                {lang === "fr" ? "Aucune sauvegarde" : "Nothing saved yet"}
              </p>
            </div>
          ) : (
            savedSearches.map((s, idx) => (
              <div key={idx}
                className="group relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-3 hover:border-red-500/30 hover:bg-red-500/3 transition-all cursor-pointer"
                onClick={() => loadSaved(s)}>
                {/* Delete */}
                <button
                  onClick={e => { e.stopPropagation(); deleteSaved(idx); }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 text-[10px] flex items-center justify-center transition-all font-bold">
                  ✕
                </button>
                <p className="text-[11px] font-mono font-bold text-zinc-700 dark:text-zinc-200 uppercase leading-tight pr-5 line-clamp-2 mb-1">
                  {s.query}
                </p>
                <p className="text-[9px] font-mono text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">
                  {s.date}
                </p>
                {/* Lens tag if present */}
                <div className="absolute bottom-2 right-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500/40"/>
                </div>
              </div>
            ))
          )}
        </div>

        {savedSearches.length > 0 && (
          <div className="px-3 py-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
            <button
              onClick={() => { setSavedSearches([]); localStorage.removeItem("horizon_saved_searches"); }}
              className="w-full py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest text-zinc-400 hover:text-red-400 hover:bg-red-500/5 transition-all border border-transparent hover:border-red-500/20">
              {lang === "fr" ? "Tout effacer" : "Clear all"}
            </button>
          </div>
        )}
      </aside>

      <style>{`
        @keyframes neonSlide {
          0%   { opacity: 0.4; transform: scaleX(0.7); }
          50%  { opacity: 1;   transform: scaleX(1); }
          100% { opacity: 0.4; transform: scaleX(0.7); }
        }
        @keyframes laserOrbit {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}