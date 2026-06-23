"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { checkQuota, UserTier } from "../../utils/quota";
import { useApp } from "../../context/AppContext";

type HorizonMatrix = {
  c_est_quoi: string;
  est_ce_bon: string;
  combien_ca_coute: string;
  est_ce_disponible: string;
  qu_en_pensent_les_gens: string;
  quelles_sont_les_alternatives: string;
  quels_sont_les_risques: string;
  quelle_option_est_recommandee: string;
};

// Hologramme SVG fallback
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

// ── FORMATEUR DE RÉPONSE RESPIRANTE ─────────────────────────────────────────
// Transforme le texte brut en blocs visuellement aérés
function BreathingResponse({ text, lang }: { text: string; lang: string }) {
  // Nettoyer les \n littéraux et normaliser
  const cleaned = text
    .replace(/\\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const lines = cleaned.split("\n").filter(l => l.trim() !== "");

  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Ligne numérotée (1. 2. etc ou 1- 2-)
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

        // Ligne "Analyse :" ou "Recommandation :" → titre de section
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

        // Ligne avec ** gras **
        if (trimmed.includes("**")) {
          const parts = trimmed.split(/\*\*(.+?)\*\*/g);
          return (
            <p key={i} className="text-[15px] text-zinc-700 dark:text-zinc-200 leading-relaxed">
              {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-zinc-900 dark:text-white font-bold">{p}</strong> : p)}
            </p>
          );
        }

        // Ligne courte seule (titre implicite)
        if (trimmed.length < 60 && !trimmed.endsWith(".") && !trimmed.endsWith(",")) {
          return (
            <p key={i} className="text-[13px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-500 pt-2">
              {trimmed}
            </p>
          );
        }

        // Paragraphe normal
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

  const [query, setQuery] = useState("");
  const [echoResponse, setEchoResponse] = useState("");
  const [matrix, setMatrix] = useState<HorizonMatrix | null>(null);
  const [attributes, setAttributes] = useState<string[]>([]);
  const [echoState, setEchoState] = useState<"idle" | "thinking" | "speaking">("idle");
  const [userId, setUserId] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<UserTier>("connected_free");

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isMatrixExpanded, setIsMatrixExpanded] = useState(false);
  const [isIntroLangOpen, setIsIntroLangOpen] = useState(false);
  const introLangRef = useRef<HTMLDivElement>(null);
  const [isAvatarBroken, setIsAvatarBroken] = useState(false);
  const [activeLens, setActiveLens] = useState<"critical" | "expert" | "strategy" | null>(null);

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
    const cachedMatrix     = localStorage.getItem("horizon_last_matrix");

    if (cachedQuery)      setQuery(cachedQuery);
    if (cachedResponse)   { setEchoResponse(cachedResponse); setEchoState("speaking"); }
    if (cachedAttributes) { try { setAttributes(JSON.parse(cachedAttributes)); } catch {} }
    if (cachedMatrix)     { try { setMatrix(JSON.parse(cachedMatrix)); } catch {} }

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
    setMatrix(null);
    setAttributes([]);

    const lensToSend = overrideLens !== undefined ? overrideLens : activeLens;

    const quotaStatus = checkQuota("horizon", userTier);
    if (!quotaStatus.allowed) {
      setEchoResponse(lang === "fr" ? "Limite de recherches HorizonWeb atteinte pour ce cycle." : "HorizonWeb search limit reached for this cycle.");
      setAttributes(["quota_atteint"]);
      setEchoState("speaking");
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
        setMatrix(data.matrix || null);
        setAttributes(data.attributes || []);
        setEchoState("speaking");

        localStorage.setItem("horizon_last_query",      targetQuery);
        localStorage.setItem("horizon_last_response",   data.response);
        localStorage.setItem("horizon_last_attributes", JSON.stringify(data.attributes || []));
        localStorage.setItem("horizon_last_matrix",     JSON.stringify(data.matrix || null));
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

  const handleLensClick = (lens: "critical" | "expert" | "strategy") => {
    const nextLens = activeLens === lens ? null : lens;
    setActiveLens(nextLens);
    if (query) executeHorizonSearch(query, nextLens);
  };

  return (
    <main className="h-screen bg-white dark:bg-black text-black dark:text-white flex overflow-hidden font-sans transition-colors duration-200 selection:bg-cyan-500/30 relative">

      {/* NEON GLOBAL — ligne traversante en haut */}
      <div className="pointer-events-none fixed top-0 left-0 right-0 h-[2px] z-40"
        style={{background:"linear-gradient(90deg, transparent 0%, #06b6d4 30%, #22d3ee 50%, #06b6d4 70%, transparent 100%)", boxShadow:"0 0 12px 2px rgba(6,182,212,0.6), 0 0 30px 6px rgba(6,182,212,0.2)", animation:"neonSlide 4s ease-in-out infinite alternate"}}/>

      {/* POPUP INTRO */}
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border-2 border-cyan-500/40 p-6 rounded-2xl max-w-lg w-full relative shadow-[0_0_50px_rgba(6,182,212,0.25)]">
            <button onClick={closePopupAndSave} className="absolute top-4 right-4 text-zinc-500 hover:text-white font-bold font-mono text-lg">✕</button>
            <div className="flex justify-between items-center mb-4 pr-8">
              <h3 className="text-sm font-mono uppercase tracking-widest text-cyan-400 font-bold">📡 HorizonWeb Protocol</h3>
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
                        className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-semibold text-left transition-colors ${lang===l?"bg-cyan-500/10 text-cyan-400":"text-zinc-400 hover:bg-zinc-900"}`}>
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
                  <p><span className="text-cyan-400 font-bold">HorizonWeb</span> déploie un moteur d'exploration externe ultra-rigoureux.</p>
                  <p>Il ne livre pas de listes publicitaires : il extrait la donnée brute du terrain pour formuler des conclusions utiles.</p>
                </>
              ) : (
                <>
                  <p><span className="text-cyan-400 font-bold">HorizonWeb</span> deploys an ultra-rigorous external search engine.</p>
                  <p>It doesn't deliver ads or spam — it extracts raw terrain data to provide actionable conclusions.</p>
                </>
              )}
            </div>
            <button onClick={closePopupAndSave} className="w-full mt-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black tracking-widest text-xs uppercase transition-all">
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
            <Link href="/horizonweb" className="block text-cyan-600 dark:text-cyan-400 font-bold">📡 HorizonWeb</Link>
            <hr className="border-zinc-200 dark:border-zinc-800 my-4"/>
            <Link href="/history"    className="block hover:text-amber-500">⭐ {lang==="fr"?"Historique":"History"}</Link>
          </div>
        </div>
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
          Status : <span className="text-cyan-500 dark:text-cyan-400 uppercase font-bold block">{userTier === "connected_free" ? "Accès libre" : userTier}</span>
        </div>
      </aside>

      {/* MAIN */}
      <section className="flex-1 flex flex-col min-w-0 bg-white dark:bg-black transition-colors duration-200 relative overflow-hidden">

        {/* HEADER + SEARCH */}
        <div className="p-8 pb-6 border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center text-center shrink-0 pt-14 relative">

          {/* TITRE avec néon autour */}
          <div className="relative mb-7">
            <h1 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase font-mono select-none text-cyan-500 dark:text-cyan-400"
              style={{textShadow:"0 0 20px rgba(6,182,212,0.5), 0 0 60px rgba(6,182,212,0.2)"}}>
              HORIZON WEB SEARCH
            </h1>
            {/* Ligne néon sous le titre */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-[1px]"
              style={{background:"linear-gradient(90deg, transparent, #06b6d4, #22d3ee, #06b6d4, transparent)", boxShadow:"0 0 8px 2px rgba(6,182,212,0.4)"}}/>
          </div>

          {/* SEARCH BOX avec néon autour */}
          <div className="w-full max-w-3xl relative group">
            {/* Néon border animé */}
            <div className="absolute -inset-[1px] rounded-2xl pointer-events-none z-0"
              style={{background:"linear-gradient(135deg, rgba(6,182,212,0.4), rgba(34,211,238,0.1), rgba(6,182,212,0.4))", boxShadow:"0 0 15px rgba(6,182,212,0.2)", borderRadius:"1rem"}}/>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && executeHorizonSearch(query)}
              placeholder={lang === "fr" ? "TAPER VOTRE RECHERCHE ICI..." : "TYPE YOUR SEARCH HERE..."}
              className="relative z-10 w-full bg-white dark:bg-zinc-900 text-black dark:text-white font-mono uppercase text-sm border-2 border-cyan-500/40 focus:border-cyan-500 rounded-2xl py-4 pl-6 pr-32 transition-all outline-none focus:shadow-[0_0_25px_rgba(6,182,212,0.15)]"
            />
            <button
              onClick={() => executeHorizonSearch(query)}
              className="absolute right-2 top-2 bottom-2 z-10 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-black text-xs font-mono px-6 rounded-xl transition-all uppercase tracking-widest shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              EXPLORE
            </button>
          </div>

          {/* LENS BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-2 mt-4 w-full max-w-3xl justify-center font-mono">
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

        {/* ZONE RÉSULTATS */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 min-h-0 bg-white dark:bg-black flex flex-col items-center"
          style={{scrollbarWidth:"thin", scrollbarColor:"rgba(6,182,212,0.2) transparent"}}>

          {/* THINKING */}
          {echoState === "thinking" && (
            <div className="h-64 flex flex-col items-center justify-center gap-4 font-mono">
              {isAvatarBroken ? <EchoSvgMascot className="w-20 h-20"/> : (
                <img src="/echo1.png" alt="Echo" className="w-20 h-20 object-contain echo-thinking" onError={() => setIsAvatarBroken(true)}/>
              )}
              <p className="text-cyan-500 dark:text-cyan-400 text-xs uppercase tracking-widest animate-pulse">
                {lang === "fr" ? "Exploration du sillage..." : "Exploring the wake..."}
              </p>
            </div>
          )}

          {/* RÉSULTATS */}
          {echoState !== "thinking" && echoResponse && (
            <div className="w-full max-w-3xl space-y-6 animate-in fade-in duration-300 pb-16">

              {/* CHIPS */}
              {attributes.length > 0 && (
                <div className="flex gap-2 items-center flex-wrap font-mono text-[10px]">
                  <span className="text-zinc-400 uppercase font-bold">{lang === "fr" ? "Critères :" : "Criteria :"}</span>
                  {attributes.map((attr, idx) => (
                    <span key={idx} className="bg-cyan-500/8 text-cyan-600 dark:text-cyan-400/80 border border-cyan-500/20 px-2 py-0.5 rounded-md uppercase">{attr}</span>
                  ))}
                </div>
              )}

              {/* RÉPONSE RESPIRANTE — sans boîte compartiment */}
              <div className="space-y-1">
                {/* En-tête Echo minimal */}
                <div className="flex items-center gap-2 mb-5">
                  {isAvatarBroken ? <EchoSvgMascot className="w-7 h-7"/> : (
                    <img src="/echo1.png" alt="Echo" className="w-7 h-7 object-contain echo-speaking rounded-full border border-cyan-500/30" onError={() => setIsAvatarBroken(true)}/>
                  )}
                  <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-500/70 font-bold">
                    {lang === "fr" ? "Analyse Echo" : "Echo's Analysis"}
                  </span>
                  {/* Ligne décorative */}
                  <div className="flex-1 h-[1px]" style={{background:"linear-gradient(90deg, rgba(6,182,212,0.3), transparent)"}}/>
                </div>

                {/* Texte respirant */}
                <BreathingResponse text={echoResponse} lang={lang} />
              </div>

              {/* MATRICE 8 PILIERS — accordéon discret */}
              {matrix && (
                <div className="mt-8 border border-zinc-100 dark:border-zinc-900 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setIsMatrixExpanded(!isMatrixExpanded)}
                    className="w-full py-3.5 px-5 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center hover:bg-zinc-100 dark:hover:bg-zinc-900/80 transition-all font-mono text-[10px] uppercase tracking-wider text-zinc-400 font-black outline-none">
                    <span className="flex items-center gap-2">
                      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><line x1="8" y1="5" x2="8" y2="8"/><circle cx="8" cy="11" r=".6" fill="currentColor" stroke="none"/></svg>
                      {lang === "fr" ? "Matrice Horizon — 8 Piliers" : "Horizon Matrix — 8 Pillars"}
                    </span>
                    <span>{isMatrixExpanded ? "▲" : "▼"}</span>
                  </button>

                  {isMatrixExpanded && (
                    <div className="p-5 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200">
                      {[
                        { k: lang==="fr"?"1. C'est Quoi ?":"1. What is it?",                      v: matrix.c_est_quoi                   },
                        { k: lang==="fr"?"2. Est-ce Bon ?":"2. Is it good?",                       v: matrix.est_ce_bon                   },
                        { k: lang==="fr"?"3. Combien ça coûte ?":"3. Cost breakdown",               v: matrix.combien_ca_coute             },
                        { k: lang==="fr"?"4. Disponibilité / Horaires":"4. Hours & Availability",  v: matrix.est_ce_disponible            },
                        { k: lang==="fr"?"5. Retour Terrain":"5. Field feedback",                  v: matrix.qu_en_pensent_les_gens       },
                        { k: lang==="fr"?"6. Alternatives":"6. Alternatives",                       v: matrix.quelles_sont_les_alternatives},
                        { k: lang==="fr"?"7. Risques":"7. Risks",                                   v: matrix.quels_sont_les_risques       },
                        { k: lang==="fr"?"8. Recommandation finale":"8. Final recommendation",      v: matrix.quelle_option_est_recommandee},
                      ].map((item, i) => (
                        <div key={i} className={`p-4 rounded-xl border ${i===7?"md:col-span-2 border-cyan-500/20 bg-cyan-500/[0.03]":"border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950"}`}>
                          <h5 className="text-[9px] font-mono font-bold text-cyan-500/70 uppercase mb-1.5 tracking-widest">{item.k}</h5>
                          <p className="text-[13px] text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{item.v}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* IDLE */}
          {echoState === "idle" && !echoResponse && (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              {isAvatarBroken ? <EchoSvgMascot className="w-24 h-24 mb-6"/> : (
                <img src="/echo1.png" alt="Echo Idle" className="w-24 h-24 object-contain echo-idle mb-6 select-none" onError={() => setIsAvatarBroken(true)}/>
              )}
              <h4 className="font-mono text-xs uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-bold mb-1">ECHO IDLE</h4>
              <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-600 uppercase max-w-xs px-4">
                {lang === "fr" ? "Entrez une intention pour démarrer la boucle d'exploration." : "Enter a query to launch the exploration loop."}
              </p>
            </div>
          )}
        </div>
      </section>

      <style>{`
        @keyframes neonSlide {
          0%   { opacity: 0.4; transform: scaleX(0.7); }
          50%  { opacity: 1;   transform: scaleX(1); }
          100% { opacity: 0.4; transform: scaleX(0.7); }
        }
        @keyframes neonPulse {
          0%, 100% { box-shadow: 0 0 8px 1px rgba(6,182,212,0.3); }
          50%       { box-shadow: 0 0 20px 4px rgba(6,182,212,0.6); }
        }
      `}</style>
    </main>
  );
}