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

// Hologramme SVG de secours d'Echo si l'image physique n'est pas trouvée (V4 Fallback)
const EchoSvgMascot = ({ className = "w-20 h-20" }: { className?: string }) => (
  <svg className={`${className} animate-pulse drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="url(#cyanGlow)" opacity="0.1" />
    <circle cx="50" cy="50" r="40" stroke="#06b6d4" strokeWidth="2" strokeDasharray="6 6" className="animate-spin [animation-duration:15s]" />
    {/* Casque audio */}
    <rect x="22" y="42" width="8" height="16" rx="4" fill="#06b6d4" />
    <rect x="70" y="42" width="8" height="16" rx="4" fill="#06b6d4" />
    <path d="M26 44 Q50 20 74 44" stroke="#06b6d4" strokeWidth="3" fill="none" />
    {/* Tête robot */}
    <rect x="28" y="36" width="44" height="32" rx="16" fill="#09090b" stroke="#06b6d4" strokeWidth="3" />
    {/* Yeux bleus LED */}
    <circle cx="41" cy="50" r="4" fill="#22d3ee" className="animate-ping [animation-duration:3s]" />
    <circle cx="41" cy="50" r="3" fill="#ffffff" />
    <circle cx="59" cy="50" r="4" fill="#22d3ee" className="animate-ping [animation-duration:3s]" />
    <circle cx="59" cy="50" r="3" fill="#ffffff" />
    {/* Petit sourire */}
    <path d="M46 58 Q50 62 54 58" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* Antennes */}
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

  useEffect(() => {
    const closeOnOutside = (e: MouseEvent) => {
      if (introLangRef.current && !introLangRef.current.contains(e.target as Node)) setIsIntroLangOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  // Détection de l'avatar cassé (Fallback V4)
  const [isAvatarBroken, setIsAvatarBroken] = useState(false);

  // Boutons comportementaux
  const [activeLens, setActiveLens] = useState<"critical" | "expert" | "strategy" | null>(null);

  // Charger la persistance locale et session Supabase
  useEffect(() => {
    // 1. Gérer l'introduction (s'affiche une seule fois par navigateur)
    const introSeen = localStorage.getItem("horizon_intro_seen");
    if (!introSeen) {
      setIsPopupOpen(true);
    }

    // 2. Restaurer la dernière recherche sauvegardée si présente
    const cachedQuery = localStorage.getItem("horizon_last_query");
    const cachedResponse = localStorage.getItem("horizon_last_response");
    const cachedAttributes = localStorage.getItem("horizon_last_attributes");
    const cachedMatrix = localStorage.getItem("horizon_last_matrix");

    if (cachedQuery) setQuery(cachedQuery);
    if (cachedResponse) {
      setEchoResponse(cachedResponse);
      setEchoState("speaking");
    }
    if (cachedAttributes) {
      try { setAttributes(JSON.parse(cachedAttributes)); } catch (e) {}
    }
    if (cachedMatrix) {
      try { setMatrix(JSON.parse(cachedMatrix)); } catch (e) {}
    }

    // 3. Charger le profil utilisateur
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      if (uid) {
        const { data: profile } = await supabase.from("profiles").select("user_tier").eq("id", uid).single();
        if (profile?.user_tier) {
          const raw = profile.user_tier.toLowerCase().trim();
          if (["basic", "premium", "ultra", "founder"].includes(raw)) {
            setUserTier(raw as UserTier);
          }
        }
      }
    });
  }, []);

  // Exécuter l'analyse et gérer la mise en cache locale
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
        body: JSON.stringify({ 
          query: targetQuery, 
          userTier,
          lang, 
          selectedButtons: lensToSend ? [lensToSend] : []
        }),
      });
      const data = await res.json();

      if (data.response) {
        setEchoResponse(data.response);
        setMatrix(data.matrix || null);
        setAttributes(data.attributes || []);
        setEchoState("speaking");

        // Sauvegarder dans le localStorage pour persister après rafraîchissement
        localStorage.setItem("horizon_last_query", targetQuery);
        localStorage.setItem("horizon_last_response", data.response);
        localStorage.setItem("horizon_last_attributes", JSON.stringify(data.attributes || []));
        localStorage.setItem("horizon_last_matrix", JSON.stringify(data.matrix || null));
      } else {
        setAttributes(["erreur_coherence"]);
        setEchoState("idle");
      }
    } catch (err) {
      console.error("Erreur Horizon Search:", err);
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
    if (query) {
      executeHorizonSearch(query, nextLens);
    }
  };

  return (
    <main className="h-screen bg-white dark:bg-black text-black dark:text-white flex overflow-hidden font-sans transition-colors duration-200 selection:bg-cyan-500/30 relative">
      
      {/* 1 - POPUP DE PRÉSENTATION TUTO (PERSISTÉ DANS LOCALSTORAGE) */}
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border-2 border-cyan-500/40 p-6 rounded-2xl max-w-lg w-full relative shadow-[0_0_50px_rgba(6,182,212,0.2)]">
            <button onClick={closePopupAndSave} className="absolute top-4 right-4 text-zinc-500 hover:text-white font-bold font-mono text-lg">X</button>

            <div className="flex justify-between items-center mb-4 pr-8">
              <h3 className="text-sm font-mono uppercase tracking-widest text-cyan-400 font-bold">📡 HorizonWeb Protocol</h3>

              <div ref={introLangRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsIntroLangOpen(o => !o)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-cyan-500/60 hover:text-cyan-400 transition-all text-[11px] font-mono font-bold"
                >
                  🌐 {lang === "fr" ? "Français" : "English"}
                  <svg className={`w-2.5 h-2.5 transition-transform ${isIntroLangOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25 12 15.75 4.5 8.25" />
                  </svg>
                </button>
                {isIntroLangOpen && (
                  <div className="absolute right-0 mt-1.5 w-32 rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-xl z-10">
                    <button
                      type="button"
                      onClick={() => { setLang("fr"); setIsIntroLangOpen(false); }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-semibold text-left transition-colors ${lang === "fr" ? "bg-cyan-500/10 text-cyan-400" : "text-zinc-400 hover:bg-zinc-900"}`}
                    >
                      Français
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLang("en"); setIsIntroLangOpen(false); }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-semibold text-left transition-colors ${lang === "en" ? "bg-cyan-500/10 text-cyan-400" : "text-zinc-400 hover:bg-zinc-900"}`}
                    >
                      English
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed font-mono">
              {lang === "fr" ? (
                <>
                  <p><span className="text-cyan-400 font-bold">HorizonWeb</span> déploie un moteur d'exploration externe ultra-rigoureux.</p>
                  <p>Il ne livre pas de listes de liens publicitaires : il extrait la donnée brute du terrain (prix réels, heures d'ouverture exactes, retours Reddit) pour formuler des conclusions utiles.</p>
                </>
              ) : (
                <>
                  <p><span className="text-cyan-400 font-bold">HorizonWeb</span> deploys an ultra-rigorous external search engine.</p>
                  <p>It doesn't deliver lists of ads or spam: it extracts raw terrain data (real pricing, exact hours, Reddit reviews) to provide actionable conclusions.</p>
                </>
              )}
            </div>
            <button onClick={closePopupAndSave} className="w-full mt-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black tracking-widest text-xs uppercase transition-all">
              {lang === "fr" ? "Démarrer l'exploration" : "Initialize exploration"}
            </button>
          </div>
        </div>
      )}

      {/* 2 - NAVIGATION LATÉRALE (SIDEBAR ALIGNÉE SANS AUCUN SAUT VISUEL) */}
      <aside className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-8 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between hidden md:flex">
        <div className="space-y-20">
          <h2 className="font-bold text-lg">
            <Link href="/" className="hover:text-cyan-500 dark:hover:text-cyan-400">{t.sidebar.home}</Link>
          </h2>
          <div className="space-y-20 text-zinc-800 dark:text-zinc-100 font-medium">
            <Link href="/chat"     className="block hover:text-cyan-500">{t.sidebar.chat}</Link>
            <Link href="/books"    className="block hover:text-cyan-500">{t.sidebar.books}</Link>
            <Link href="/calendar" className="block hover:text-cyan-500">📅 {lang==="fr"?"Calendrier":"Calendar"}</Link>
            <Link href="/vitality" className="block hover:text-cyan-500">📈 {lang==="fr"?"Vitalité":"Vitality"}</Link>
            <Link href="/services" className="block hover:text-cyan-500">💎 {lang==="fr"?"Services":"Services"}</Link>
            <Link href="/account"  className="block hover:text-cyan-500">👤 {lang==="fr"?"Compte":"Account"}</Link>
            <Link href="/horizonweb" className="block text-cyan-600 dark:text-cyan-400 font-bold">📡 HorizonWeb</Link>
            <hr className="border-zinc-200 dark:border-zinc-800 my-4" />
            <Link href="/history"  className="block hover:text-amber-500">⭐ {lang==="fr"?"Historique":"History"}</Link>
          </div>
        </div>
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
          Status : <span className="text-cyan-500 dark:text-cyan-400 uppercase font-bold block">{userTier === "connected_free" ? "Accès libre" : userTier}</span>
        </div>
      </aside>

      {/* 3 - ZONE DE L'EXPLORATEUR UNIVERSEL */}
      <section className="flex-1 flex flex-col min-w-0 bg-white dark:bg-black transition-colors duration-200 relative">
        
        {/* HEADER DE RECHERCHE UNIFIÉ */}
        <div className="p-8 border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center text-center shrink-0 pt-16">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase mb-6 font-mono select-none text-cyan-600 dark:text-cyan-400">
            HORIZON WEB SEARCH
          </h1>

          {/* BARRE DE RECHERCHE */}
          <div className="w-full max-w-3xl relative">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && executeHorizonSearch(query)}
              placeholder={lang === "fr" ? "TAPER VOTRE RECHERCHE ICI..." : "TYPE YOUR SEARCH HERE..."}
              className="w-full bg-white dark:bg-zinc-900 text-black dark:text-white font-mono uppercase text-sm border-2 border-cyan-500/30 focus:border-cyan-500 rounded-2xl py-4 pl-6 pr-32 transition-all outline-none focus:shadow-[0_0_20px_rgba(6,182,212,0.1)]"
            />
            <button 
              onClick={() => executeHorizonSearch(query)}
              className="absolute right-2 top-2 bottom-2 bg-cyan-600 hover:bg-cyan-500 text-white dark:text-black font-black text-xs font-mono px-6 rounded-xl transition-all uppercase tracking-widest"
            >
              EXPLORE
            </button>
          </div>

          {/* 3 BOUTONS COMPORTEMENTAUX DIRECTEMENT SOUS LA RECHERCHE */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full max-w-3xl justify-center font-mono">
            <button 
              onClick={() => handleLensClick("critical")}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-black border transition-all ${
                activeLens === "critical"
                  ? "bg-red-500/10 text-red-500 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-red-400"
              }`}
            >
              3⚔️ {lang === "fr" ? "REGARD CRITIQUE" : "CRITICAL VIEW"}
            </button>
            <button 
              onClick={() => handleLensClick("expert")}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-black border transition-all ${
                activeLens === "expert"
                  ? "bg-cyan-500/10 text-cyan-500 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-cyan-400"
              }`}
            >
              4🎓 {lang === "fr" ? "EXPERT" : "EXPERT"}
            </button>
            <button 
              onClick={() => handleLensClick("strategy")}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-black border transition-all ${
                activeLens === "strategy"
                  ? "bg-purple-500/10 text-purple-500 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-purple-400"
              }`}
            >
              7♟️ {lang === "fr" ? "STRATÉGIE" : "STRATEGY"}
            </button>
          </div>
        </div>

        {/* ZONE DE LECTURE DES RÉSULTATS (AVEC PRIORITÉ CONVERSATIONNELLE) */}
        <div className="flex-1 overflow-y-auto p-8 min-h-0 bg-white dark:bg-black transition-colors duration-200 flex flex-col items-center">
          
          {echoState === "thinking" && (
            <div className="h-64 flex flex-col items-center justify-center gap-4 font-mono">
              <img
                src="/echo1.png"
                alt="Echo Thinking"
                className="w-20 h-20 object-contain echo-thinking"
              />
              <p className="text-cyan-500 dark:text-cyan-400 text-xs uppercase tracking-widest animate-pulse">
                {lang === "fr" ? "Exploration du sillage..." : "Exploring the wake..."}
              </p>
            </div>
          )}

          {/* RÉSULTATS CONVERSATIONNELS D'ÉCHO */}
          {echoState !== "thinking" && echoResponse && (
            <div className="w-full max-w-3xl space-y-8 animate-in fade-in duration-300 pb-12">
              
              {/* CHIPS DE CRITÈRES DÉTECTÉS */}
              {attributes.length > 0 && (
                <div className="flex gap-2 items-center flex-wrap pb-3 border-b border-zinc-200 dark:border-zinc-900 font-mono text-[10px]">
                  <span className="text-zinc-400 uppercase font-bold">{lang === "fr" ? "Attributs Décisionnels :" : "Decision Criteria :"}</span>
                  {attributes.map((attr, idx) => (
                    <span key={idx} className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-md uppercase font-mono">{attr}</span>
                  ))}
                </div>
              )}

              {/* BLOC CONVERSATIONNEL D'ÉCHO (RÉPONSE RESPIRANTE & DIRECTE) */}
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 p-8 rounded-2xl shadow-sm leading-relaxed text-[15px] space-y-4 font-sans text-zinc-800 dark:text-zinc-200 whitespace-pre-line">
                <div className="flex items-center gap-3 mb-4 font-mono text-xs text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider">
                  {isAvatarBroken ? (
                    <EchoSvgMascot className="w-8 h-8" />
                  ) : (
                    <img
                      src="/echo1.png"
                      alt="Echo"
                      className="w-8 h-8 object-contain echo-speaking"
                      onError={() => setIsAvatarBroken(true)}
                    />
                  )}
                  <span>Echo's Analysis</span>
                </div>
                {echoResponse}
              </div>

              {/* ACCORDÉON / DEPLIANT POUR L'ANALYSE DÉTAILLÉE DE LA MATRICE (8 PILIERS) */}
              {matrix && (
                <div className="border border-zinc-200 dark:border-zinc-900 rounded-2xl overflow-hidden shadow-sm">
                  <button 
                    onClick={() => setIsMatrixExpanded(!isMatrixExpanded)}
                    className="w-full py-4 px-6 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all font-mono text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-black border-none outline-none"
                  >
                    <span>🔬 {lang === "fr" ? "Consulter la Matrice Horizon (8 Piliers)" : "View Horizon Matrix (8 Pillars)"}</span>
                    <span className="text-sm">{isMatrixExpanded ? "▲" : "▼"}</span>
                  </button>

                  {isMatrixExpanded && (
                    <div className="p-6 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-900 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                      {[
                        { k: lang === "fr" ? "1. C'est Quoi ?" : "1. What is it?", v: matrix.c_est_quoi },
                        { k: lang === "fr" ? "2. Est-ce Bon ?" : "2. Is it good?", v: matrix.est_ce_bon },
                        { k: lang === "fr" ? "3. Combien ça coûte ?" : "3. Cost breakdown", v: matrix.combien_ca_coute },
                        { k: lang === "fr" ? "4. Heures d'ouverture / Disponibilité" : "4. Hours & Availability", v: matrix.est_ce_disponible },
                        { k: lang === "fr" ? "5. Retour Terrain (Reddit)" : "5. Field feedback (Reddit)", v: matrix.qu_en_pensent_les_gens },
                        { k: lang === "fr" ? "6. Alternatives concrètes" : "6. Direct alternatives", v: matrix.quelles_sont_les_alternatives },
                        { k: lang === "fr" ? "7. Risques & Contraintes" : "7. Risks & Limitations", v: matrix.quels_sont_les_risques },
                        { k: lang === "fr" ? "8. Recommandation tranchée" : "8. Final recommendation", v: matrix.quelle_option_est_recommandee },
                      ].map((item, i) => (
                        <div key={i} className={`p-4 rounded-xl border border-zinc-100 dark:border-zinc-900 ${i === 7 ? "md:col-span-2 bg-cyan-500/5 border-cyan-500/20" : "bg-zinc-50/50 dark:bg-zinc-950"}`}>
                          <h5 className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400 uppercase mb-1">{item.k}</h5>
                          <p className="text-[13px] text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{item.v}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ÉCRAN DE SILLAGE INACTIF (AVATAR ÉCHO VIVANT) */}
          {echoState === "idle" && !echoResponse && (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              {isAvatarBroken ? (
                <EchoSvgMascot className="w-24 h-24 mb-6" />
              ) : (
                <img
                  src="/echo1.png"
                  alt="Echo Idle"
                  className="w-24 h-24 object-contain echo-idle mb-6 select-none"
                  onError={() => setIsAvatarBroken(true)}
                />
              )}
              <h4 className="font-mono text-xs uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-bold mb-1">
                ECHO IDLE
              </h4>
              <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-600 uppercase max-w-xs px-4">
                {lang === "fr" 
                  ? "Entrez une intention pour démarrer la boucle d'exploration." 
                  : "Enter a query to launch the exploration loop."
                }
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}