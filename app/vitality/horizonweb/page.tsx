"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { UserTier } from "../../../utils/quota";
import { useApp } from "../../../context/AppContext";

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
  const { t, lang } = useApp();

  // États structurels
  const [query, setQuery] = useState("");
  const [matrix, setMatrix] = useState<HorizonMatrix | null>(null);
  const [attributes, setAttributes] = useState<string[]>([]);
  const [echoState, setEchoState] = useState("idle"); // idle | thinking
  const [userId, setUserId] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<UserTier>("connected_free");
  
  // États de l'interface
  const [isPopupOpen, setIsPopupOpen] = useState(true);
  const [popupLang, setPopupLang] = useState<"fr" | "en">("fr");
  const [isChatShrunk, setIsChatShrunk] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
  }, []);

  const executeHorizonSearch = async (targetQuery: string) => {
    if (!targetQuery.trim()) return;
    setEchoState("thinking");
    setMatrix(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/horizon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: targetQuery, userTier }),
      });
      const data = await res.json();

      if (data.matrix) {
        setMatrix(data.matrix);
        setAttributes(data.attributes || []);
        setEchoState("idle");
      }
    } catch (err) {
      console.error("Erreur Horizon Search:", err);
      setEchoState("idle");
    }
  };

  return (
    <main className="h-screen bg-black text-white flex overflow-hidden font-sans selection:bg-cyan-500/30 relative">
      
      {/* 5 - POPUP DE PRÉSENTATION COMPLET */}
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border-2 border-cyan-500/40 p-6 rounded-2xl max-w-lg w-full relative shadow-[0_0_50px_rgba(6,182,212,0.2)]">
            <button onClick={() => setIsPopupOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white font-bold font-mono text-lg">X</button>
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-mono uppercase tracking-widest text-cyan-400 font-bold">📡 HorizonWeb Protocol</h3>
              <select 
                value={popupLang} 
                onChange={(e) => setPopupLang(e.target.value as "fr" | "en")}
                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed font-mono">
              {popupLang === "fr" ? (
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
              {popupLang === "fr" ? "Lancer l'exploration" : "Initialize exploration"}
            </button>
          </div>
        </div>
      )}

      {/* 1 - MES ONGLETS HABITUELS */}
      <aside className="w-56 shrink-0 border-r border-zinc-900 p-8 bg-zinc-950 flex flex-col justify-between hidden md:flex">
        <div className="space-y-20">
          <h2 className="font-bold text-lg tracking-wider text-zinc-400">ECHO</h2>
          <nav className="space-y-6 text-zinc-400 font-medium font-mono text-sm">
            <Link href="/" className="block hover:text-white">Home</Link>
            <Link href="/chat" className="block hover:text-white">Chat</Link>
            <Link href="/books" className="block hover:text-white">Books</Link>
            <Link href="/calendar" className="block hover:text-white">📅 Calendar</Link>
            <Link href="/vitality" className="block hover:text-white">📈 Vitality</Link>
            <Link href="/horizonweb" className="block text-cyan-400 font-bold">📡 HorizonWeb</Link>
          </nav>
        </div>
        <div className="text-xs text-zinc-600 font-mono">STATUS: <span className="text-cyan-500 font-bold uppercase">{userTier}</span></div>
      </aside>

      {/* ZONE CENTRALE PRINCIPALE */}
      <section className="flex-1 flex flex-col min-w-0 bg-black">
        
        {/* HEADER & INPUT BARRE DE RECHERCHE */}
        <div className="p-8 border-b border-zinc-900 bg-gradient-to-b from-zinc-950 to-black flex flex-col items-center justify-center text-center shrink-0">
          
          {/* 2 - GROS HORIZON WEB SEARCH EN HAUT EN COURBE CAPS LOCK CYAN 2 TON */}
          <h1 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase mb-6 font-mono select-none drop-shadow-[0_2px_10px_rgba(6,182,212,0.15)]">
            <span className="text-cyan-500">HORIZON</span>
            <span className="text-cyan-300 ml-2">WEB SEARCH</span>
          </h1>

          <div className="w-full max-w-3xl relative">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && executeHorizonSearch(query)}
              placeholder="QU'EXPLORONS-NOUS AUJOURD'HUI ?" 
              className="w-full bg-zinc-950 text-white font-mono uppercase text-sm border-2 border-cyan-500/30 focus:border-cyan-400 rounded-2xl py-4 pl-6 pr-32 transition-all shadow-[inner_0_4px_12px_rgba(0,0,0,0.9)] focus:shadow-[0_0_20px_rgba(6,182,212,0.1)] outline-none"
            />
            <button 
              onClick={() => executeHorizonSearch(query)}
              className="absolute right-2 top-2 bottom-2 bg-cyan-600 hover:bg-cyan-500 text-black font-black text-xs font-mono px-6 rounded-xl transition-all uppercase tracking-widest"
            >
              EXPLORE
            </button>
          </div>

          {/* 3 - LES 3 BOUTONS ACTION DÉJÀ LIÉS */}
          <div className="flex gap-4 mt-4 w-full max-w-3xl">
            <button onClick={() => executeHorizonSearch("Meilleur CRM PME")} className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-mono transition-all truncate">⚡ CRM PME</button>
            <button onClick={() => executeHorizonSearch("Meilleur déjeuner à Longueuil")} className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-mono transition-all truncate">🍳 RESTOS LONGUEUIL</button>
            <button onClick={() => executeHorizonSearch("Licence musique Facebook Ads 2026")} className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-mono transition-all truncate">🎨 LICENCE PUBLICITAIRE</button>
          </div>
        </div>

        {/* AFFICHAGE DES RÉSULTATS UNIVERSELS (Grand espace alloué) */}
        <div className="flex-1 overflow-y-auto p-8 min-h-0 bg-black flex flex-col items-center">
          {echoState === "thinking" && (
            <div className="h-64 flex flex-col items-center justify-center gap-4 font-mono">
              <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-cyan-400 text-xs uppercase tracking-widest animate-pulse">Extraction des attributs décisionnels & filtrage...</p>
            </div>
          )}

          {matrix ? (
            <div className="w-full max-w-4xl space-y-6 animate-in fade-in duration-300">
              
              {/* Affichage des attributs détectés à la volée */}
              {attributes.length > 0 && (
                <div className="flex gap-2 items-center flex-wrap pb-2 border-b border-zinc-900 font-mono text-[11px]">
                  <span className="text-zinc-600 uppercase font-bold">Attributs Décisionnels :</span>
                  {attributes.map((attr, idx) => (
                    <span key={idx} className="bg-cyan-950/40 text-cyan-400 border border-cyan-800/30 px-2 py-0.5 rounded-md uppercase">{attr}</span>
                  ))}
                </div>
              )}

              {/* Grille de la matrice universelle en 8 points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { k: "1. C'EST QUOI ?", v: matrix.c_est_quoi },
                  { k: "2. EST-CE BON ?", v: matrix.est_ce_bon },
                  { k: "3. COMBIEN ÇA COÛTE ?", v: matrix.combien_ca_coute },
                  { k: "4. EST-CE DISPONIBLE ?", v: matrix.est_ce_disponible },
                  { k: "5. QU'EN PENSENT LES GENS ?", v: matrix.qu_en_pensent_les_gens },
                  { k: "6. QUELLES SONT LES ALTERNATIVES ?", v: matrix.quelles_sont_les_alternatives },
                  { k: "7. QUELS SONT LES RISQUES ?", v: matrix.quels_sont_les_risques },
                ].map((item, i) => (
                  <div key={i} className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl shadow-sm hover:border-zinc-800 transition-all">
                    <h4 className="text-xs font-mono font-black text-cyan-400/90 tracking-wider mb-2 uppercase">{item.k}</h4>
                    <p className="text-zinc-300 text-[13.5px] leading-relaxed whitespace-pre-wrap">{item.v}</p>
                  </div>
                ))}

                {/* Point 8 occupant toute la largeur (Recommandation d'Echo) */}
                <div className="md:col-span-2 bg-gradient-to-r from-cyan-950/20 to-zinc-950 border-2 border-cyan-500/20 p-6 rounded-2xl shadow-md">
                  <h4 className="text-sm font-mono font-black text-cyan-400 tracking-widest mb-3 uppercase">8. QUELLE OPTION EST RECOMMANDÉE ?</h4>
                  <p className="text-white text-[14px] leading-relaxed whitespace-pre-wrap">{matrix.quelle_option_est_recommandee}</p>
                </div>
              </div>
            </div>
          ) : (
            echoState === "idle" && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-700 font-mono text-xs uppercase tracking-widest">
                Aucune analyse active sur le sillage.
              </div>
            )
          )}
        </div>
      </section>

      {/* 4 - COMPAGNON CHAT INTEGRÉ AVEC BOUTON SHRINK */}
      <aside 
        style={{ width: isChatShrunk ? "64px" : "320px" }}
        className="shrink-0 border-l border-zinc-900 bg-zinc-950 flex flex-col justify-between transition-all duration-300 ease-in-out font-mono"
      >
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between overflow-hidden">
          {!isChatShrunk && <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Perspective Echo</span>}
          <button 
            onClick={() => setIsChatShrunk(!isChatShrunk)}
            className="p-1 text-xs bg-zinc-900 hover:bg-zinc-800 text-cyan-400 rounded-md border border-zinc-800 mx-auto lg:mx-0"
          >
            {isChatShrunk ? "◂" : "➖"}
          </button>
        </div>

        {!isChatShrunk ? (
          <>
            {/* Zone des messages de raffinement */}
            <div className="flex-1 p-4 overflow-y-auto text-xs space-y-4">
              {chatHistory.length === 0 ? (
                <p className="text-zinc-600 italic">Pose des questions de suivi sur les résultats de l'exploration.</p>
              ) : (
                chatHistory.map((h, i) => (
                  <div key={i} className={`p-2.5 rounded-xl ${h.startsWith("You:") ? "bg-zinc-900 text-zinc-300" : "bg-cyan-950/20 text-cyan-400 border border-cyan-900/40"}`}>
                    {h}
                  </div>
                ))
              )}
            </div>

            {/* Input Chat */}
            <div className="p-4 border-t border-zinc-900 bg-zinc-950">
              <input 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && chatInput.trim()) {
                    setChatHistory(p => [...p, `You: ${chatInput}`, `Echo: Analyse de la perspective en cours...`]);
                    setChatInput("");
                  }
                }}
                placeholder="Affiner l'analyse..."
                className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs focus:outline-none focus:border-cyan-500 text-white"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center [writing-mode:vertical-lr] text-[10px] tracking-widest text-zinc-600 font-bold uppercase select-none">
            ECHO CHAT CLOSED
          </div>
        )}
      </aside>
    </main>
  );
}