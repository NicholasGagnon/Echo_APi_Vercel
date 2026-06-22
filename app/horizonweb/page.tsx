"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { UserTier } from "../../utils/quota";
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

export default function HorizonWebPage() {
  const { t, lang, setLang } = useApp();

  const [query, setQuery] = useState("");
  const [matrix, setMatrix] = useState<HorizonMatrix | null>(null);
  const [attributes, setAttributes] = useState<string[]>([]);
  const [echoState, setEchoState] = useState("idle"); // idle | thinking
  const [userId, setUserId] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<UserTier>("connected_free");
  
  const [isPopupOpen, setIsPopupOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Buttons comportementaux intégrés sous la barre de recherche
  const [activeLens, setActiveLens] = useState<"critical" | "expert" | "strategy" | null>(null);

  useEffect(() => {
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

  const executeHorizonSearch = async (targetQuery: string, overrideLens?: "critical" | "expert" | "strategy" | null) => {
    if (!targetQuery.trim()) return;
    setQuery(targetQuery);
    setEchoState("thinking");
    setMatrix(null);

    const lensToSend = overrideLens !== undefined ? overrideLens : activeLens;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/horizon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: targetQuery, 
          userTier,
          lang, // On envoie la langue active à l'API
          selectedButtons: lensToSend ? [lensToSend] : []
        }),
      });
      const data = await res.json();

      if (data.matrix) {
        setMatrix(data.matrix);
        setAttributes(data.attributes || []);
      } else {
        setAttributes(["erreur_coherence"]);
      }
    } catch (err) {
      console.error("Erreur Horizon Search:", err);
      setAttributes(["erreur_reseau"]);
    } finally {
      setEchoState("idle");
    }
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
      
      {/* POPUP DE PRÉSENTATION UNIVERSEL */}
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border-2 border-cyan-500/40 p-6 rounded-2xl max-w-lg w-full relative shadow-[0_0_50px_rgba(6,182,212,0.2)]">
            <button onClick={() => setIsPopupOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white font-bold font-mono text-lg">X</button>
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-mono uppercase tracking-widest text-cyan-400 font-bold">📡 HorizonWeb Protocol</h3>
              <select 
                value={lang} 
                onChange={(e) => setLang(e.target.value as "fr" | "en")}
                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed font-mono">
              {lang === "fr" ? (
                <>
                  <p><span className="text-cyan-400 font-bold">HorizonWeb</span> n'est pas un moteur de recherche traditionnel.</p>
                  <p>Il déploie une boucle agentique automatique qui arpente le monde extérieur à ta place selon <span className="text-cyan-400">10 filtres universels</span> rigoureux.</p>
                  <p>Il ne livre pas de listes de liens promotionnels : il extrait la donnée brute, valide sa cohérence intrinsèque, et la fragmente en 8 piliers structurels.</p>
                </>
              ) : (
                <>
                  <p><span className="text-cyan-400 font-bold">HorizonWeb</span> is not a traditional search engine.</p>
                  <p>It deploys an automatic agentic loop that explores the outside world based on <span className="text-cyan-400">10 strict universal filters</span>.</p>
                  <p>Instead of promotional link spam, it extracts raw data, tests it for coherence, and structures it into 8 decision pillars.</p>
                </>
              )}
            </div>
            <button onClick={() => setIsPopupOpen(false)} className="w-full mt-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black tracking-widest text-xs uppercase transition-all">
              {lang === "fr" ? "Lancer l'exploration" : "Initialize exploration"}
            </button>
          </div>
        </div>
      )}

      {}
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
          Status : <span className="text-cyan-500 dark:text-cyan-400 uppercase font-bold block">{userTier}</span>
        </div>
      </aside>

      {/* ZONE CENTRALE PRINCIPALE AVEC EFFET IMMERSIF */}
      <section className="flex-1 flex flex-col min-w-0 bg-white dark:bg-black transition-colors duration-200 relative">
        
        {/* BOUTON PARAMÈTRES / SETTINGS EN HAUT À DROITE */}
        <div className="absolute top-6 right-6 z-10 flex items-center gap-2">
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-2.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 dark:text-zinc-300 transition-all shadow-sm"
            title="Settings"
          >
            ⚙️
          </button>
          
          {isSettingsOpen && (
            <div className="absolute right-0 top-12 w-48 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xl z-20 font-mono text-xs">
              <h4 className="font-bold text-cyan-500 mb-2 uppercase tracking-wider">Language / Langue</h4>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setLang("fr"); setIsSettingsOpen(false); }}
                  className={`flex-1 py-1.5 rounded-lg border text-center font-bold ${lang === "fr" ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/30" : "border-zinc-200 dark:border-zinc-800"}`}
                >
                  FR
                </button>
                <button 
                  onClick={() => { setLang("en"); setIsSettingsOpen(false); }}
                  className={`flex-1 py-1.5 rounded-lg border text-center font-bold ${lang === "en" ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/30" : "border-zinc-200 dark:border-zinc-800"}`}
                >
                  EN
                </button>
              </div>
            </div>
          )}
        </div>

        {/* HEADER & CONTROLEUR DE RECHERCHE */}
        <div className="p-8 border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center text-center shrink-0 pt-16">
          
          {/* GROS TITRE HORIZON WEB SEARCH */}
          <h1 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase mb-6 font-mono select-none drop-shadow-[0_2px_10px_rgba(6,182,212,0.15)] text-cyan-600 dark:text-cyan-400">
            HORIZON WEB SEARCH
          </h1>

          {/* BARRE DE RECHERCHE PRINCIPALE */}
          <div className="w-full max-w-3xl relative">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && executeHorizonSearch(query)}
              placeholder={lang === "fr" ? "TAPER VOTRE RECHERCHE ICI..." : "TYPE YOUR SEARCH HERE..."}
              className="w-full bg-white dark:bg-zinc-900 text-black dark:text-white font-mono uppercase text-sm border-2 border-cyan-500/30 focus:border-cyan-500 rounded-2xl py-4 pl-6 pr-32 transition-all shadow-[inner_0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[inner_0_4px_12px_rgba(0,0,0,0.9)] focus:shadow-[0_0_20px_rgba(6,182,212,0.1)] outline-none"
            />
            <button 
              onClick={() => executeHorizonSearch(query)}
              className="absolute right-2 top-2 bottom-2 bg-cyan-600 hover:bg-cyan-500 text-white dark:text-black font-black text-xs font-mono px-6 rounded-xl transition-all uppercase tracking-widest"
            >
              EXPLORE
            </button>
          </div>

          {}
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

          {/* EXEMPLES UNIVERSELS SECONDAIRES */}
          <div className="flex gap-2 mt-4 w-full max-w-3xl flex-wrap justify-center">
            <button onClick={() => { setQuery("CRM PME"); executeHorizonSearch("CRM PME"); }} className="py-1 px-3 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-lg text-[10px] font-mono transition-all">⚡ CRM PME</button>
            <button onClick={() => { setQuery("Réglementation IA Europe"); executeHorizonSearch("Réglementation IA Europe"); }} className="py-1 px-3 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-lg text-[10px] font-mono transition-all">🛡️ {lang === "fr" ? "RÉGLEMENTATION IA" : "AI REGULATION"}</button>
            <button onClick={() => { setQuery("Voitures électriques autonomie"); executeHorizonSearch("Voitures électriques autonomie"); }} className="py-1 px-3 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-lg text-[10px] font-mono transition-all">🚗 {lang === "fr" ? "COMPARAISON AUTONOMIE" : "AUTONOMY COMPARISON"}</button>
          </div>
        </div>

        {/* AFFICHAGE DES RÉSULTATS UNIVERSELS (Grand espace de lecture optimisé) */}
        <div className="flex-1 overflow-y-auto p-8 min-h-0 bg-white dark:bg-black transition-colors duration-200 flex flex-col items-center">
          {echoState === "thinking" && (
            <div className="h-64 flex flex-col items-center justify-center gap-4 font-mono">
              <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-cyan-500 dark:text-cyan-400 text-xs uppercase tracking-widest animate-pulse">
                {lang === "fr" ? "Analyse agentique et filtrage opérationnel..." : "Agentic analysis and operational filtering..."}
              </p>
            </div>
          )}

          {}
          {matrix ? (
            <div className="w-full max-w-4xl space-y-6 animate-in fade-in duration-300">
              
              {attributes.length > 0 && (
                <div className="flex gap-2 items-center flex-wrap pb-2 border-b border-zinc-200 dark:border-zinc-900 font-mono text-[11px]">
                  <span className="text-zinc-500 uppercase font-bold">{lang === "fr" ? "Critères détectés :" : "Detected criteria :"}</span>
                  {attributes.map((attr, idx) => (
                    <span key={idx} className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-md uppercase">{attr}</span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { k: lang === "fr" ? "1. C'EST QUOI ?" : "1. WHAT IS IT?", v: matrix.c_est_quoi },
                  { k: lang === "fr" ? "2. EST-CE BON ?" : "2. IS IT GOOD?", v: matrix.est_ce_bon },
                  { k: lang === "fr" ? "3. COMBIEN ÇA COÛTE ?" : "3. HOW MUCH DOES IT COST?", v: matrix.combien_ca_coute },
                  { k: lang === "fr" ? "4. EST-CE DISPONIBLE ?" : "4. IS IT AVAILABLE?", v: matrix.est_ce_disponible },
                  { k: lang === "fr" ? "5. QU'EN PENSENT LES GENS ?" : "5. WHAT ARE PEOPLE SAYING?", v: matrix.qu_en_pensent_les_gens },
                  { k: lang === "fr" ? "6. QUELLES SONT LES ALTERNATIVES ?" : "6. WHAT ARE THE ALTERNATIVES?", v: matrix.quelles_sont_les_alternatives },
                  { k: lang === "fr" ? "7. QUELS SONT LES RISQUES ?" : "7. WHAT ARE THE RISQUES?", v: matrix.quels_sont_les_risques },
                ].map((item, i) => (
                  <div key={i} className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 p-5 rounded-2xl shadow-sm hover:border-zinc-300 dark:hover:border-zinc-800 transition-all">
                    <h4 className="text-xs font-mono font-black text-cyan-600 dark:text-cyan-400 tracking-wider mb-2 uppercase">{item.k}</h4>
                    <p className="text-zinc-700 dark:text-zinc-300 text-[13.5px] leading-relaxed whitespace-pre-wrap">{item.v}</p>
                  </div>
                ))}

                <div className="md:col-span-2 bg-gradient-to-r from-cyan-500/5 to-zinc-50 dark:from-cyan-950/20 dark:to-zinc-950 border-2 border-cyan-500/20 p-6 rounded-2xl shadow-md">
                  <h4 className="text-sm font-mono font-black text-cyan-600 dark:text-cyan-400 tracking-widest mb-3 uppercase">
                    {lang === "fr" ? "8. QUELLE OPTION EST RECOMMANDÉE ?" : "8. WHICH OPTION IS RECOMMENDED?"}
                  </h4>
                  <p className="text-black dark:text-white text-[14px] leading-relaxed whitespace-pre-wrap">{matrix.quelle_option_est_recommandee}</p>
                </div>
              </div>
            </div>
          ) : (
            echoState === "idle" && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-700 font-mono text-xs uppercase tracking-widest text-center max-w-md gap-2">
                <div>📡 {lang === "fr" ? "Sillage Horizon inactif" : "Horizon wake inactive"}</div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-600 uppercase tracking-normal">
                  {lang === "fr" ? "Posez une question pour démarrer la boucle d'extraction opérationnelle." : "Ask a question to start the operational extraction loop."}
                </div>
              </div>
            )
          )}
        </div>
      </section>
    </main>
  );
}