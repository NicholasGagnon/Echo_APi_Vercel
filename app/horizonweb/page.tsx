"use client";

import React, { useEffect, useRef, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useApp } from "../../context/AppContext";

export const dynamic = "force-dynamic";

type Currency = "CAD" | "USD" | "EUR";

const MAX_FREE_CREDITS = 3;
const REGEN_1H_MS = 60 * 60 * 1000;

const GoogleLogo = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 2.18 2.18 4.94l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

const MicrosoftLogo = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23" fill="none">
    <path d="M0 0H11V11H0V0Z" fill="#F25022"/>
    <path d="M12 0H23V11H12V0Z" fill="#7FBA00"/>
    <path d="M0 12H11V23H0V12Z" fill="#00A4EF"/>
    <path d="M12 12H23V23H12V12Z" fill="#FFB900"/>
  </svg>
);

const PRICES: Record<Currency, { amount: string; symbol: string }> = {
  CAD: { amount: "3.99", symbol: "CA$" },
  USD: { amount: "3.99", symbol: "US$" },
  EUR: { amount: "3.99", symbol: "€" },
};

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
  const cleaned = text.replace(/\\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const lines = cleaned.split("\n").filter(l => l.trim() !== "");

  return (
    <div className="space-y-4">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        const numberedMatch = trimmed.match(/^(\d+)[.\-\)]\s+(.+)/);
        if (numberedMatch) return (
          <div key={i} className="flex gap-3 items-start">
            <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-black font-mono flex items-center justify-center mt-0.5">{numberedMatch[1]}</span>
            <p className="text-base text-zinc-200 leading-relaxed flex-1">{numberedMatch[2]}</p>
          </div>
        );
        const sectionMatch = trimmed.match(/^(Analyse|Recommandation|Analysis|Recommendation|Note|Conclusion)\s*[:–-]/i);
        if (sectionMatch) {
          const rest = trimmed.replace(/^[^:–-]+[:–-]\s*/, "");
          return (
            <div key={i} className="pt-2">
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold block mb-1">{sectionMatch[1]}</span>
              {rest && <p className="text-base text-zinc-200 leading-relaxed">{rest}</p>}
            </div>
          );
        }
        if (trimmed.includes("**")) {
          const parts = trimmed.split(/\*\*(.+?)\*\*/g);
          return (
            <p key={i} className="text-base text-zinc-200 leading-relaxed">
              {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-white font-bold">{p}</strong> : p)}
            </p>
          );
        }
        if (trimmed.length < 60 && !trimmed.endsWith(".") && !trimmed.endsWith(",")) {
          return <p key={i} className="text-xs font-mono uppercase tracking-widest text-zinc-400 pt-2">{trimmed}</p>;
        }
        return <p key={i} className="text-base text-zinc-200 leading-relaxed">{trimmed}</p>;
      })}
    </div>
  );
}

function HorizonWebContent() {
  const { lang, setLang } = useApp();
  const fr = lang === "fr";
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<any>(null);
  const [currentUserTier, setCurrentUserTier] = useState<string>("free");

  // Quotas
  const [availableQuota, setAvailableQuota] = useState<number>(MAX_FREE_CREDITS);
  const [nextRegenIn, setNextRegenIn] = useState<number>(0);

  const [query, setQuery] = useState("");
  const [echoResponse, setEchoResponse] = useState("");
  const [attributes, setAttributes] = useState<string[]>([]);
  const [echoState, setEchoState] = useState<"idle" | "thinking" | "speaking">("idle");
  const [userId, setUserId] = useState<string | null>(null);

  // Modales & Devises
  const [currency, setCurrency] = useState<Currency>("CAD");
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showQuotaPopup, setShowQuotaPopup] = useState(false);
  const [activeLens, setActiveLens] = useState<"critical" | "expert" | "strategy" | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [savedSearches, setSavedSearches] = useState<{ query: string; response: string; date: string }[]>([]);
  const [showSavedDrawer, setShowSavedDrawer] = useState(false);

  // Warmup intention
  const [warmupIntent, setWarmupIntent] = useState<string | null>(null);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cachedQuery = localStorage.getItem("horizon_last_query");
    const cachedResponse = localStorage.getItem("horizon_last_response");
    const cachedAttributes = localStorage.getItem("horizon_last_attributes");

    if (cachedQuery) setQuery(cachedQuery);
    if (cachedResponse) { setEchoResponse(cachedResponse); setEchoState("speaking"); }
    if (cachedAttributes) { try { setAttributes(JSON.parse(cachedAttributes)); } catch {} }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      if (session?.user) {
        setUser(session.user);
        verifierStatutUser(session.user.id);
        chargerQuotaUtilisateur(session.user.id);
      } else {
        verifierQuotaAnonyme();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      if (session?.user) {
        setUser(session.user);
        verifierStatutUser(session.user.id);
        chargerQuotaUtilisateur(session.user.id);
      } else {
        setUser(null);
        setCurrentUserTier("free");
        verifierQuotaAnonyme();
      }
    });

    try {
      const rawSaved = localStorage.getItem("horizon_saved_searches");
      if (rawSaved) setSavedSearches(JSON.parse(rawSaved));
    } catch {}

    return () => listener.subscription.unsubscribe();
  }, []);

  const verifierStatutUser = async (uid: string) => {
    try {
      const { data: hData } = await supabase.from("horizon_quotas").select("tier").eq("user_id", uid).maybeSingle();
      if (hData?.tier && hData.tier !== "free" && hData.tier !== "connected_free") {
        setCurrentUserTier(hData.tier); return;
      }
      setCurrentUserTier("free");
    } catch { setCurrentUserTier("free"); }
  };

  const chargerQuotaUtilisateur = async (uid: string) => {
    try {
      const { data } = await supabase
        .from("horizon_quotas")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();

      const now = Date.now();
      if (data) {
        const tier = (data.tier || "free");
        setCurrentUserTier(tier);

        if (tier === "premium" || tier === "advantage") {
          setAvailableQuota(999);
          return;
        }

        const lastRegen = new Date(data.last_regen_at || data.created_at).getTime();
        const elapsed = now - lastRegen;
        const recovered = Math.floor(elapsed / REGEN_1H_MS);
        const available = Math.min(MAX_FREE_CREDITS, (data.available_credits ?? MAX_FREE_CREDITS) + recovered);

        setAvailableQuota(available);

        if (available < MAX_FREE_CREDITS) {
          setNextRegenIn(REGEN_1H_MS - (elapsed % REGEN_1H_MS));
        }
      } else {
        await supabase.from("horizon_quotas").insert({
          user_id: uid,
          available_credits: MAX_FREE_CREDITS,
          tier: "free",
          last_regen_at: new Date().toISOString(),
        });
        setAvailableQuota(MAX_FREE_CREDITS);
        setCurrentUserTier("free");
      }
    } catch {
      setAvailableQuota(MAX_FREE_CREDITS);
    }
  };

  const verifierQuotaAnonyme = () => {
    try {
      const savedAnon = parseInt(localStorage.getItem("horizon_anon_used") || "0");
      setAvailableQuota(Math.max(0, MAX_FREE_CREDITS - savedAnon));
    } catch {
      setAvailableQuota(MAX_FREE_CREDITS);
    }
  };

  const consommerUnCredit = async (): Promise<boolean> => {
    if (currentUserTier === "premium" || currentUserTier === "advantage") return true;

    if (!user) {
      const currentUsed = parseInt(localStorage.getItem("horizon_anon_used") || "0");
      if (currentUsed >= MAX_FREE_CREDITS) {
        setShowSignInModal(true);
        return false;
      }
      localStorage.setItem("horizon_anon_used", String(currentUsed + 1));
      setAvailableQuota(Math.max(0, MAX_FREE_CREDITS - (currentUsed + 1)));
      return true;
    }

    const now = Date.now();
    const { data } = await supabase
      .from("horizon_quotas")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    let avail = data?.available_credits ?? MAX_FREE_CREDITS;
    let lastRegen = data ? new Date(data.last_regen_at).getTime() : now;

    if (data && currentUserTier === "free") {
      const elapsed = now - lastRegen;
      const recovered = Math.floor(elapsed / REGEN_1H_MS);
      avail = Math.min(MAX_FREE_CREDITS, avail + recovered);
      if (recovered > 0) lastRegen = now;
    }

    if (avail < 1) {
      const elapsed = now - lastRegen;
      setNextRegenIn(REGEN_1H_MS - (elapsed % REGEN_1H_MS));
      setShowQuotaPopup(true);
      return false;
    }

    const newAvail = avail - 1;
    setAvailableQuota(newAvail);

    await supabase.from("horizon_quotas").upsert({
      user_id: user.id,
      available_credits: newAvail,
      tier: currentUserTier,
      last_regen_at: new Date(lastRegen).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return true;
  };

  const formatRegenTime = (ms: number) => {
    const minutes = Math.ceil(ms / 60000);
    return `${minutes} min`;
  };

  const triggerWarmup = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 3) { setWarmupIntent(null); return; }

    debounceRef.current = setTimeout(async () => {
      setIsWarmingUp(true);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://echo-api-fixed.onrender.com";
        const res = await fetch(`${API_URL}/horizon-warmup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partial: text }),
        });
        const data = await res.json();
        if (data.intent?.response) {
          try {
            const parsed = JSON.parse(data.intent.response);
            setWarmupIntent(parsed.intent || null);
          } catch {
            setWarmupIntent(null);
          }
        }
      } catch {
      } finally {
        setIsWarmingUp(false);
      }
    }, 400);
  }, []);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const executeHorizonSearch = async (targetQuery: string, overrideLens?: "critical" | "expert" | "strategy" | null) => {
    if (!targetQuery.trim()) return;

    const autorise = await consommerUnCredit();
    if (!autorise) return;

    localStorage.removeItem("horizon_last_response");
    localStorage.removeItem("horizon_last_attributes");

    setQuery(targetQuery);
    setEchoState("thinking");
    setEchoResponse("");
    setAttributes([]);
    setWarmupIntent(null);

    const lensToSend = overrideLens !== undefined ? overrideLens : activeLens;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://echo-api-fixed.onrender.com";
      const res = await fetch(`${API_URL}/horizon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: targetQuery, userTier: isPaidTier ? "premium" : "free", lang, selectedButtons: lensToSend ? [lensToSend] : [] }),
      });
      const data = await res.json();

      if (data.response) {
        setEchoResponse(data.response);
        setAttributes(data.attributes || []);
        setEchoState("speaking");
        localStorage.setItem("horizon_last_query", targetQuery);
        localStorage.setItem("horizon_last_response", data.response);
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

  const saveCurrentSearch = () => {
    if (!query || !echoResponse) return;
    const entry = { query, response: echoResponse, date: new Date().toLocaleDateString(fr ? "fr-CA" : "en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) };
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
    setShowSavedDrawer(false);
  };

  const isPaidTier = currentUserTier && currentUserTier !== "free" && currentUserTier !== "connected_free";

  return (
    <main className="h-screen w-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-red-500/30 relative overflow-hidden flex flex-col">

      {/* BARRE NÉON SUPÉRIEURE DE SÉCURITÉ */}
      <div className="pointer-events-none fixed top-0 left-0 right-0 h-[2px] z-50"
        style={{background:"linear-gradient(90deg, transparent 0%, #dc2626 20%, #06b6d4 50%, #dc2626 80%, transparent 100%)", boxShadow:"0 0 12px 2px rgba(220,38,38,0.7)"}}/>

      {/* ── HEADER UNIFIÉ ÉCOSYSTÈME DISCRET ── */}
      <header className="border-b border-zinc-900 bg-black/80 backdrop-blur-md sticky top-0 z-40 shrink-0">
        <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex justify-between items-center relative">
          
          <div className="flex items-center gap-6">
            <Link href="/outil" className="text-sm font-mono font-black tracking-[0.25em] text-white uppercase">
              ECHOSAI
            </Link>

            <Link
              href="/outil"
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all hover:scale-105 active:scale-95"
            >
              <span>⚡</span>
              <span>{fr ? "RETOUR AUX OUTILS" : "BACK TO TOOLS"}</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-mono relative">
            <div className="flex border border-zinc-800 rounded-lg overflow-hidden font-mono text-[10px] bg-zinc-900">
              {(["CAD", "USD", "EUR"] as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2 py-1 font-bold transition-colors ${currency === c ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:text-white"}`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* QUOTA COMPTEUR */}
            <div 
              onClick={() => !isPaidTier && setShowPremiumModal(true)} 
              className="cursor-pointer flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-amber-500/40 bg-zinc-900 text-white shadow-lg hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
            >
              <span className="text-[10px] text-zinc-400 font-bold uppercase">{fr ? "Recherches :" : "Searches:"}</span>
              <span className={`font-bold font-mono ${availableQuota === 0 ? "text-red-400" : "text-cyan-400"}`}>
                {isPaidTier ? "∞ ILLIMITÉ" : `${availableQuota}/${MAX_FREE_CREDITS} ${fr ? "disponibles" : "available"}`}
              </span>
              {!isPaidTier && (
                <span className="text-[9px] bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm animate-pulse">
                  ★ ILLIMITÉ ({PRICES[currency].symbol}{PRICES[currency].amount})
                </span>
              )}
            </div>

            <div className="flex border border-zinc-800 rounded-lg overflow-hidden font-mono text-[10px]">
              <button onClick={() => setLang("fr")} className={`px-2 py-1 ${fr ? "bg-zinc-800 text-white font-bold" : "text-zinc-500 hover:text-zinc-300"}`}>FR</button>
              <button onClick={() => setLang("en")} className={`px-2 py-1 ${!fr ? "bg-zinc-800 text-white font-bold" : "text-zinc-500 hover:text-zinc-300"}`}>EN</button>
            </div>

            <button
              onClick={() => setShowSavedDrawer(!showSavedDrawer)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-red-500/40 text-zinc-300 text-xs font-mono font-bold transition-all flex items-center gap-1.5"
            >
              <span>💾</span>
              <span>{savedSearches.length}</span>
            </button>

            {userId ? (
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-[11px] text-red-500 hover:text-red-400 transition-colors uppercase font-bold"
              >
                [ {fr ? "Déconnexion" : "Sign Out"} ]
              </button>
            ) : (
              <button
                onClick={() => setShowSignInModal(true)}
                className="px-3 py-1.5 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl hover:bg-zinc-900 transition-all font-bold tracking-tight shadow-sm"
              >
                {fr ? "Connexion" : "Sign In"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── ZONE DE RECHERCHE PRINCIPALE (FULL-SCREEN DARK) ── */}
      <section className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative overflow-hidden">
        
        {/* BANNIÈRE MOTEUR DE RECHERCHE */}
        <div className="px-6 pt-8 pb-6 bg-black/60 border-b border-zinc-900 flex flex-col items-center justify-center text-center shrink-0 relative">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase font-mono select-none mb-4">
            <span className="text-cyan-400" style={{textShadow:"0 0 20px rgba(6,182,212,0.6)"}}>
              HORIZON DEEP
            </span>
            {" "}
            <span className="text-red-500" style={{textShadow:"0 0 20px rgba(220,38,38,0.7)"}}>
              WEB SEARCH
            </span>
          </h1>

          {/* BARRE D'ENTRÉE DU PROMPT */}
          <div className="w-full max-w-4xl relative">
            <input
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                triggerWarmup(e.target.value);
              }}
              onKeyDown={e => e.key === "Enter" && executeHorizonSearch(query)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={fr ? "QUEL EST LE VRAI PROBLÈME DES CHATS AGRESSIFS..." : "TYPE YOUR SEARCH HERE..."}
              className="w-full bg-zinc-900/90 text-white font-mono uppercase text-sm md:text-base border-2 border-zinc-800 focus:border-cyan-400 rounded-2xl py-4 pl-6 pr-36 transition-all outline-none shadow-[0_0_30px_rgba(0,0,0,0.8)]"
            />
            <button
              onClick={() => executeHorizonSearch(query)}
              className="absolute right-2 top-2 bottom-2 text-white font-black text-xs font-mono px-6 rounded-xl transition-all uppercase tracking-widest cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.5)]"
              style={{background:"linear-gradient(135deg, #991b1b, #dc2626)"}}
            >
              EXPLORE
            </button>
          </div>

          {/* FILTRES "LENS" DE RECHERCHE */}
          <div className="flex flex-wrap gap-2 mt-4 w-full max-w-4xl justify-center font-mono text-xs">
            {([
              { id:"critical" as const, label: fr ? "3⚔️ REGARD CRITIQUE" : "3⚔️ CRITICAL VIEW", color:"border-red-500/50 text-red-400" },
              { id:"expert"   as const, label: fr ? "4🎓 EXPERT" : "4🎓 EXPERT", color:"border-cyan-500/50 text-cyan-400" },
              { id:"strategy" as const, label: fr ? "7♟️ STRATÉGIE" : "7♟️ STRATEGY", color:"border-purple-500/50 text-purple-400" },
            ]).map(btn => (
              <button
                key={btn.id}
                onClick={() => setActiveLens(activeLens === btn.id ? null : btn.id)}
                className={`py-2 px-5 rounded-xl border font-bold transition-all bg-zinc-900/80 cursor-pointer ${
                  activeLens === btn.id ? "bg-zinc-800 border-white text-white shadow-md" : btn.color
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* ZONE DE RÉSULTATS DÉROULANTE */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 min-h-0 bg-zinc-950 flex flex-col items-center custom-scrollbar">

          {echoState === "thinking" && (
            <div className="h-64 flex flex-col items-center justify-center gap-4 font-mono">
              <EchoSvgMascot className="w-20 h-20"/>
              <p className="text-red-400 text-xs uppercase tracking-widest animate-pulse">
                {fr ? "Plongée dans les profondeurs du web..." : "Diving into the deep web..."}
              </p>
            </div>
          )}

          {echoState !== "thinking" && echoResponse && (
            <div className="w-full max-w-4xl space-y-6 animate-in fade-in duration-300 pb-16">
              <div className="bg-black/90 border-2 border-cyan-500/40 rounded-3xl p-6 md:p-8 shadow-[0_0_40px_rgba(6,182,212,0.15)] space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs font-mono font-black uppercase text-cyan-400 tracking-widest">
                      {fr ? "ANALYSE ECHO" : "ECHO ANALYSIS"}
                    </span>
                  </div>
                  <button
                    onClick={saveCurrentSearch}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/40 bg-red-950/40 hover:bg-red-900 text-red-300 text-xs font-mono font-bold transition-all cursor-pointer"
                  >
                    💾 {fr ? "Sauvegarder" : "Save"}
                  </button>
                </div>

                <BreathingResponse text={echoResponse} lang={lang} />
              </div>
            </div>
          )}

          {echoState === "idle" && !echoResponse && (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <EchoSvgMascot className="w-24 h-24 mb-6"/>
              <h4 className="font-mono text-xs uppercase tracking-widest font-bold text-zinc-400 mb-1">
                ECHO HORIZON READY
              </h4>
              <p className="text-xs font-mono text-zinc-600 max-w-sm">
                {fr ? "Entrez votre question ci-dessus pour lancer la recherche synthétique." : "Enter your prompt above to launch synthetic search."}
              </p>
            </div>
          )}

        </div>
      </section>

      {/* ── DRAWER HISTORIQUE RECHERCHES SAUVEGARDÉES ── */}
      {showSavedDrawer && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-zinc-950 border-l border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-black">
              <span className="font-mono text-xs font-black text-zinc-200 flex items-center gap-2">
                <span>💾</span> {fr ? "RECHERCHES SAUVEGARDÉES" : "SAVED SEARCHES"}
              </span>
              <button
                onClick={() => setShowSavedDrawer(false)}
                className="text-zinc-500 hover:text-white text-xs font-mono cursor-pointer"
              >
                ✕ FERMER
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
              {savedSearches.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-600 font-mono text-xs italic">
                  {fr ? "Aucune recherche sauvegardée." : "No saved searches."}
                </div>
              ) : (
                savedSearches.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => loadSaved(s)}
                    className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-cyan-500/40 transition-all cursor-pointer space-y-1 relative group"
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSaved(idx); }}
                      className="absolute top-3 right-3 text-zinc-600 hover:text-red-400 text-xs font-bold"
                    >
                      ✕
                    </button>
                    <div className="text-xs font-bold text-zinc-200 pr-6 truncate">{s.query}</div>
                    <div className="text-[10px] font-mono text-zinc-500">{s.date}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE QUOTA POPUP ── */}
      {showQuotaPopup && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[99999] p-4">
          <div className="bg-zinc-950 border-2 border-amber-500/40 p-6 rounded-2xl max-w-md w-full relative shadow-[0_0_50px_rgba(245,158,11,0.15)] text-center space-y-4">
            <div className="text-3xl">📡</div>
            <h3 className="text-sm font-mono uppercase tracking-widest text-amber-400 font-bold">
              {fr ? "Quota de 3 Recherches Atteint" : "3-Search Limit Reached"}
            </h3>
            <p className="text-zinc-300 text-xs font-mono leading-relaxed">
              {fr
                ? `Prochain crédit disponible dans environ ${formatRegenTime(nextRegenIn)}. Ou débloquez l'accès illimité.`
                : `Next credit available in about ${formatRegenTime(nextRegenIn)}. Or unlock unlimited access.`}
            </p>
            <button
              onClick={() => setShowQuotaPopup(false)}
              className="w-full py-3 rounded-xl bg-amber-500 text-zinc-950 font-mono font-black text-xs uppercase cursor-pointer"
            >
              {fr ? "Fermer" : "Close"}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}

export default function HorizonWebPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-cyan-400 font-mono text-xs">Initialisation d'HorizonWeb...</div>}>
      <HorizonWebContent />
    </Suspense>
  );
}