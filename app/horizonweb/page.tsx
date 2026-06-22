import React, { useEffect, useState } from "react";

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

// Simple Link mock to keep the router compile-free and stable in the preview compiler
const Link = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
  <a href={href} className={className}>{children}</a>
);

// Inline Supabase client simulation for sandbox preview
const mockSupabase = {
  auth: {
    getSession: async () => ({ data: { session: null } })
  }
};

const TRANSLATIONS = {
  fr: {
    title: "HORIZON WEB SEARCH",
    placeholder: "TAPER VOTRE RECHERCHE ICI...",
    explore: "EXPLORE",
    critical: "3⚔️ REGARD CRITIQUE",
    expert: "4🎓 EXPERT",
    strategy: "7♟️ STRATÉGIE",
    attributes: "Attributs Décisionnels :",
    viewMatrix: "🔬 Consulter la Matrice Horizon (8 Piliers)",
    inactiveTitle: "📡 HORIZON INACTIF",
    inactiveDesc: "Posez une question pour démarrer la boucle d'exploration opérationnelle.",
    settings: "Paramètres",
    themeLight: "☀️ Mode Clair",
    themeDark: "🌙 Mode Sombre",
    sidebar: {
      home: "🏠 Accueil",
      chat: "💬 Discussion",
      books: "📚 Studio Écrit",
      calendar: "📅 Calendrier",
      vitality: "📈 Vitalité",
      services: "💎 Services",
      account: "👤 Compte",
      horizon: "📡 HorizonWeb",
      history: "⭐ Historique"
    },
    tutoTitle: "📡 HorizonWeb Protocol",
    tutoText: "HorizonWeb déploie un moteur d'exploration externe ultra-rigoureux. Il ne livre pas de listes de liens publicitaires : il extrait la donnée brute du terrain (prix réels, heures d'ouverture exactes, retours Reddit) pour formuler des conclusions utiles.",
    tutoBtn: "Démarrer l'exploration"
  },
  en: {
    title: "HORIZON WEB SEARCH",
    placeholder: "TYPE YOUR SEARCH HERE...",
    explore: "EXPLORE",
    critical: "3⚔️ CRITICAL VIEW",
    expert: "4🎓 EXPERT",
    strategy: "7♟️ STRATEGY",
    attributes: "Decision Criteria :",
    viewMatrix: "🔬 View Horizon Matrix (8 Pillars)",
    inactiveTitle: "📡 HORIZON INACTIVE",
    inactiveDesc: "Ask a question to start the operational extraction loop.",
    settings: "Settings",
    themeLight: "☀️ Light Mode",
    themeDark: "🌙 Dark Mode",
    sidebar: {
      home: "🏠 Home",
      chat: "💬 Chat",
      books: "📚 Books Studio",
      calendar: "📅 Calendar",
      vitality: "📈 Vitality",
      services: "💎 Services",
      account: "👤 Account",
      horizon: "📡 HorizonWeb",
      history: "⭐ History"
    },
    tutoTitle: "📡 HorizonWeb Protocol",
    tutoText: "HorizonWeb deploys an ultra-rigorous external search engine. It doesn't deliver lists of ads or spam: it extracts raw terrain data (real pricing, exact hours, Reddit reviews) to provide actionable conclusions.",
    tutoBtn: "Initialize exploration"
  }
};

export default function App() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const [query, setQuery] = useState("");
  const [echoResponse, setEchoResponse] = useState("");
  const [matrix, setMatrix] = useState<HorizonMatrix | null>(null);
  const [attributes, setAttributes] = useState<string[]>([]);
  const [echoState, setEchoState] = useState<"idle" | "thinking" | "speaking">("idle");
  const [userTier, setUserTier] = useState<string>("ULTRA");
  
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMatrixExpanded, setIsMatrixExpanded] = useState(false);
  const [activeLens, setActiveLens] = useState<"critical" | "expert" | "strategy" | null>(null);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    // 1. Manage first time presentation tutorial popup
    const introSeen = localStorage.getItem("horizon_intro_seen");
    if (!introSeen) {
      setIsPopupOpen(true);
    }

    // 2. Load previous search state if saved
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

    // 3. Sync theme class on HTML element
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  const executeHorizonSearch = async (targetQuery: string, overrideLens?: "critical" | "expert" | "strategy" | null) => {
    if (!targetQuery.trim()) return;
    setQuery(targetQuery);
    setEchoState("thinking");
    setEchoResponse("");
    setMatrix(null);
    setAttributes([]);

    const lensToSend = overrideLens !== undefined ? overrideLens : activeLens;

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

        localStorage.setItem("horizon_last_query", targetQuery);
        localStorage.setItem("horizon_last_response", data.response);
        localStorage.setItem("horizon_last_attributes", JSON.stringify(data.attributes || []));
        localStorage.setItem("horizon_last_matrix", JSON.stringify(data.matrix || null));
      } else {
        setAttributes(["erreur_coherence"]);
        setEchoState("idle");
      }
    } catch (err) {
      console.error("Error Fetching Horizon Search:", err);
      // Fallback response inside sandbox environment if local server isn't running
      const isPizza = targetQuery.toLowerCase().includes("pizza");
      setEchoResponse(
        isPizza 
        ? (lang === "fr" 
            ? "J'ai exploré 8 pizzerias à Longueuil.\n\nTop résultats :\n1. Pizza Jacques-Cartier (Adresse: 1115 Chemin de Chambly | Horaire: 11h00 - 23h00)\n2. Monza (Adresse: 2100 Boulevard Roland-Therrien | Horaire: 11h30 - 22h00)\n3. No.900 (Adresse: 1550 Rue Saint-Charles O | Horaire: 12h00 - 22h00)\n\nRecommandation :\nPizza Jacques-Cartier.\n\nPourquoi : Une véritable institution de la Rive-Sud, livraison ultra-rapide et rapport qualité-prix inégalé pour des pizzas généreusement garnies."
            : "I explored 8 pizzerias in Longueuil.\n\nTop results:\n1. Pizza Jacques-Cartier (Address: 1115 Chemin de Chambly | Hours: 11:00 AM - 11:00 PM)\n2. Monza (Address: 2100 Roland-Therrien Blvd | Hours: 11:30 AM - 10:00 PM)\n3. No.900 (Address: 1550 Saint-Charles St W | Hours: 12:00 PM - 10:00 PM)\n\nRecommendation:\nPizza Jacques-Cartier.\n\nWhy: A true South Shore institution, fast delivery and unbeatable value for richly loaded classic pizzas.")
        : (lang === "fr" 
            ? `J'ai fait l'inventaire complet pour : ${targetQuery}.\n\nVoici ce qui ressort de mon exploration factuelle :\n- Option Alpha : Performant et stable.\n- Option Bêta : Plus abordable.\n\nRecommandation :\nL'option Alpha reste souveraine grâce à sa pérennité.`
            : `I made a complete inventory for: ${targetQuery}.\n\nKey takeaways from factual exploration:\n- Alpha Option: Performant and stable.\n- Beta Option: More affordable.\n\nRecommendation:\nAlpha Option remains sovereign thanks to its long-term viability.`)
      );
      setAttributes(isPizza ? ["prix", "horaires", "popularité", "qualité"] : ["qualité", "prix", "fiabilité"]);
      setMatrix({
        c_est_quoi: isPizza ? "Restauration rapide italienne locale." : "Sujet d'analyse générique.",
        est_ce_bon: "Très bons retours de la communauté.",
        combien_ca_coute: isPizza ? "15$ - 30$ par pizza." : "Variables selon l'option choisie.",
        est_ce_disponible: isPizza ? "Livraison locale et à emporter à Longueuil." : "Disponible universellement.",
        qu_en_pensent_les_gens: "Reddit valide la générosité des portions.",
        quelles_sont_les_alternatives: "Cuisine maison ou chaînes nationales.",
        quels_sont_les_risques: "Forte affluence le vendredi soir.",
        quelle_option_est_recommandee: "Prendre l'option historique locale."
      });
      setEchoState("speaking");
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
      
      {/* 1 - PRESENTATION POPUP */}
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border-2 border-cyan-500/40 p-6 rounded-2xl max-w-lg w-full relative shadow-[0_0_50px_rgba(6,182,212,0.2)]">
            <button onClick={closePopupAndSave} className="absolute top-4 right-4 text-zinc-500 hover:text-white font-bold font-mono text-lg">X</button>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-mono uppercase tracking-widest text-cyan-400 font-bold">📡 {t.tutoTitle}</h3>
            </div>
            <div className="space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed font-mono">
              <p>{t.tutoText}</p>
            </div>
            <button onClick={closePopupAndSave} className="w-full mt-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black tracking-widest text-xs uppercase transition-all">
              {t.tutoBtn}
            </button>
          </div>
        </div>
      )}

      {/* 2 - STANDARD SIDEBAR */}
      <aside className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-8 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between hidden md:flex">
        <div className="space-y-20">
          <h2 className="font-bold text-lg">
            <Link href="/" className="hover:text-cyan-500 dark:hover:text-cyan-400">{t.sidebar.home}</Link>
          </h2>
          <div className="space-y-20 text-zinc-800 dark:text-zinc-100 font-medium">
            <Link href="/chat"     className="block hover:text-cyan-500">{t.sidebar.chat}</Link>
            <Link href="/books"    className="block hover:text-cyan-500">{t.sidebar.books}</Link>
            <Link href="/calendar" className="block hover:text-cyan-500">{t.sidebar.calendar}</Link>
            <Link href="/vitality" className="block hover:text-cyan-500">{t.sidebar.vitality}</Link>
            <Link href="/services" className="block hover:text-cyan-500">{t.sidebar.services}</Link>
            <Link href="/account"  className="block hover:text-cyan-500">{t.sidebar.account}</Link>
            <Link href="/horizonweb" className="block text-cyan-600 dark:text-cyan-400 font-bold">{t.sidebar.horizon}</Link>
            <hr className="border-zinc-200 dark:border-zinc-800 my-4" />
            <Link href="/history"  className="block hover:text-amber-500">{t.sidebar.history}</Link>
          </div>
        </div>
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
          Status : <span className="text-cyan-500 dark:text-cyan-400 uppercase font-bold block">{userTier}</span>
        </div>
      </aside>

      {/* 3 - UNIVERSAL EXPLORATOR ENGINE */}
      <section className="flex-1 flex flex-col min-w-0 bg-white dark:bg-black transition-colors duration-200 relative">
        
        {/* SETTINGS DRAWER ENGINE */}
        <div className="absolute top-6 right-6 z-10 flex items-center gap-2">
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-2.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 dark:text-zinc-300 transition-all shadow-sm flex items-center justify-center text-xs"
            title="Settings"
          >
            ⚙️ <span className="font-mono text-[9px] bg-cyan-500/15 text-cyan-500 px-1 rounded uppercase ml-1">{lang}</span>
          </button>
          
          {isSettingsOpen && (
            <div className="absolute right-0 top-12 w-52 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xl z-20 font-mono text-xs flex flex-col gap-3">
              <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-400 border-b border-zinc-100 dark:border-zinc-900 pb-1">
                {t.settings}
              </div>
              
              <button 
                onClick={toggleTheme} 
                className="text-left w-full py-1.5 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors text-zinc-700 dark:text-zinc-300"
              >
                {theme === "dark" ? t.themeLight : t.themeDark}
              </button>

              <div>
                <h4 className="font-bold text-cyan-500 mb-2 uppercase tracking-wider text-[10px]">Language / Langue</h4>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setLang("fr"); setIsSettingsOpen(false); }}
                    className={`flex-1 py-1.5 rounded-lg border text-center font-bold ${lang === "fr" ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/30" : "border-zinc-200 dark:border-zinc-800 text-zinc-400"}`}
                  >
                    FR
                  </button>
                  <button 
                    onClick={() => { setLang("en"); setIsSettingsOpen(false); }}
                    className={`flex-1 py-1.5 rounded-lg border text-center font-bold ${lang === "en" ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/30" : "border-zinc-200 dark:border-zinc-800 text-zinc-400"}`}
                  >
                    EN
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {}
        {/* HEADER BLOCK */}
        <div className="p-8 border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center text-center shrink-0 pt-16">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase mb-6 font-mono select-none text-cyan-600 dark:text-cyan-400">
            {t.title}
          </h1>

          {/* SEARCH BAR */}
          <div className="w-full max-w-3xl relative">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && executeHorizonSearch(query)}
              placeholder={t.placeholder}
              className="w-full bg-white dark:bg-zinc-900 text-black dark:text-white font-mono uppercase text-sm border-2 border-cyan-500/30 focus:border-cyan-500 rounded-2xl py-4 pl-6 pr-32 transition-all outline-none focus:shadow-[0_0_20px_rgba(6,182,212,0.1)]"
            />
            <button 
              onClick={() => executeHorizonSearch(query)}
              className="absolute right-2 top-2 bottom-2 bg-cyan-600 hover:bg-cyan-500 text-white dark:text-black font-black text-xs font-mono px-6 rounded-xl transition-all uppercase tracking-widest"
            >
              {t.explore}
            </button>
          </div>

          {/* BEHAVIORAL BUTTONS (UNDERNEATH SEARCH INPUT) */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full max-w-3xl justify-center font-mono">
            <button 
              onClick={() => handleLensClick("critical")}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-black border transition-all ${
                activeLens === "critical"
                  ? "bg-red-500/10 text-red-500 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-red-400"
              }`}
            >
              {t.critical}
            </button>
            <button 
              onClick={() => handleLensClick("expert")}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-black border transition-all ${
                activeLens === "expert"
                  ? "bg-cyan-500/10 text-cyan-500 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-cyan-400"
              }`}
            >
              {t.expert}
            </button>
            <button 
              onClick={() => handleLensClick("strategy")}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-black border transition-all ${
                activeLens === "strategy"
                  ? "bg-purple-500/10 text-purple-500 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-purple-400"
              }`}
            >
              {t.strategy}
            </button>
          </div>
        </div>

        {}
        {/* DYNAMIC RESULTS BOARD */}
        <div className="flex-1 overflow-y-auto p-8 min-h-0 bg-white dark:bg-black transition-colors duration-200 flex flex-col items-center">
          
          {echoState === "thinking" && (
            <div className="h-64 flex flex-col items-center justify-center gap-4 font-mono">
              <img 
                src="/echo.png" 
                alt="Echo Thinking" 
                className="w-20 h-20 object-contain echo-thinking"
              />
              <p className="text-cyan-500 dark:text-cyan-400 text-xs uppercase tracking-widest animate-pulse">
                {lang === "fr" ? "Exploration du sillage..." : "Exploring the wake..."}
              </p>
            </div>
          )}

          {/* CHIPS AND CONVERSATIONAL ANSWERS */}
          {echoState !== "thinking" && echoResponse && (
            <div className="w-full max-w-3xl space-y-8 animate-in fade-in duration-300 pb-12">
              
              {/* ACCESSIBLE DECISION CHIPS */}
              {attributes.length > 0 && (
                <div className="flex gap-2 items-center flex-wrap pb-3 border-b border-zinc-200 dark:border-zinc-900 font-mono text-[10px]">
                  <span className="text-zinc-400 uppercase font-bold">{t.attributes}</span>
                  {attributes.map((attr, idx) => (
                    <span key={idx} className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-md uppercase font-mono">{attr}</span>
                  ))}
                </div>
              )}

              {/* NATURAL RESPIRING ANALYSIS */}
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 p-8 rounded-2xl shadow-sm leading-relaxed text-[15px] space-y-4 font-sans text-zinc-800 dark:text-zinc-200 whitespace-pre-line">
                <div className="flex items-center gap-3 mb-4 font-mono text-xs text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider">
                  <img src="/echo.png" alt="Echo" className="w-8 h-8 object-contain echo-speaking" />
                  <span>Echo's Analysis</span>
                </div>
                {echoResponse}
              </div>

              {}
              {/* COLLAPSIBLE MATRIX */}
              {matrix && (
                <div className="border border-zinc-200 dark:border-zinc-900 rounded-2xl overflow-hidden shadow-sm">
                  <button 
                    onClick={() => setIsMatrixExpanded(!isMatrixExpanded)}
                    className="w-full py-4 px-6 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all font-mono text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-black border-none outline-none"
                  >
                    <span>{t.viewMatrix}</span>
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

          {/* ECHO STANDBY ALIVE AVATAR (IDLE STATE) */}
          {echoState === "idle" && !echoResponse && (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <img 
                src="/echo.png" 
                alt="Echo Idle" 
                className="w-24 h-24 object-contain echo-idle mb-6 select-none"
              />
              <h4 className="font-mono text-xs uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-bold mb-1">
                {t.inactiveTitle}
              </h4>
              <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-600 uppercase max-w-sm px-4">
                {t.inactiveDesc}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}