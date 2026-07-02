"use client";

import React, { useState, useRef, useEffect } from "react";

// Structure de données pour les résultats d'analyse
interface AnalysisResults {
  productName: string;
  positives: string[];
  negatives: string[];
  amazonLinks: { label: string; url: string }[];
}

// Structure de données pour les messages du chat
interface ChatMessage {
  sender: "user" | "ia";
  text: string;
}

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  
  // États pour le module de chat
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Déterminer l'URL de l'API Flask de manière dynamique et sécurisée
  const getBackendUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
    }
    // Fallback de secours si la variable d'environnement est absente
    return "http://localhost:5000"; 
  };

  // Scroll automatique vers le bas du chat lors de nouveaux messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // Déclencher l'analyse principale via Jina + DeepSeek (Route Python)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setChatMessages([]);

    const backendBaseUrl = getBackendUrl();

    try {
      // Connexion dynamique à ton API Flask Python
      const response = await fetch(`${backendBaseUrl}/api/analyse-avis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur (${response.status}). Vérifie que ton API Flask à ${backendBaseUrl} est bien démarrée et accessible.`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Formatage et sécurisation des données reçues du backend
      const rawProduct = data.product_name || "Produit Analysé";
      
      setResults({
        productName: rawProduct,
        positives: Array.isArray(data.positives) ? data.positives.slice(0, 5) : [],
        negatives: Array.isArray(data.negatives) ? data.negatives.slice(0, 5) : [],
        amazonLinks: [
          {
            label: `Rechercher "${rawProduct}" sur Amazon`,
            url: `https://www.amazon.ca/s?k=${encodeURIComponent(rawProduct)}&tag=tonid-20`
          },
          {
            label: "Offres Amazon Business",
            url: `https://www.amazon.ca/s?k=${encodeURIComponent(rawProduct + " business")}&tag=tonid-20`
          }
        ]
      });

      // Message d'accueil du chat initialisé avec les nouvelles données
      setChatMessages([
        {
          sender: "ia",
          text: `Analyse complétée pour **${rawProduct}** ! J'ai synthétisé les avis les plus bruts. Tu peux me poser des questions précises sur ce que les gens en pensent pour valider ton achat.`
        }
      ]);

    } catch (err: any) {
      console.error("Erreur d'appel API:", err);
      setError(
        err.message === "Failed to fetch" 
          ? `Impossible de se connecter à ton API Flask à l'adresse : ${backendBaseUrl}. Assure-toi d'avoir démarré ton serveur Flask avec 'python main.py' et qu'aucun pare-feu ne bloque le port.`
          : err.message || "Une erreur inattendue est survenue."
      );
    } finally {
      setLoading(false);
    }
  };

  // Envoyer une question de suivi sur le produit à l'IA (Route /chat ou /home de ton Flask)
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !results || chatLoading) return;

    const userText = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { sender: "user", text: userText }]);
    setChatLoading(true);

    const backendBaseUrl = getBackendUrl();

    try {
      // Utilisation de la route /chat dynamique pour la continuité
      const response = await fetch(`${backendBaseUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `L'utilisateur se pose cette question sur le produit "${results.productName}" : "${userText}". Base-toi sur les points forts suivants : ${results.positives.join(", ")} et les points faibles suivants : ${results.negatives.join(", ")} pour lui répondre de manière chirurgicale, neutre et anti-bullshit.`,
          userTier: "connected_free",
          history: []
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la communication avec l'IA.");
      }

      const data = await response.json();
      const iaText = data.response || "Désolé, je n'ai pas pu formuler de réponse.";

      setChatMessages(prev => [...prev, { sender: "ia", text: iaText }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { sender: "ia", text: `⚠️ Erreur de connexion avec l'IA : ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Copier le lien d'affiliation de manière sécurisée
  const handleCopyLink = (textToCopy: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = textToCopy;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error("Échec de la copie", err);
    }
    document.body.removeChild(textArea);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col lg:flex-row font-sans selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* SECTION GAUCHE : Logo & Don Ancré */}
      <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-zinc-800/80 p-6 flex flex-col justify-between shrink-0 bg-[#070707]/90 backdrop-blur-md">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-amber-500 rounded-xl flex items-center justify-center font-black text-black shadow-lg shadow-amber-500/20 text-lg">
              Ø
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-zinc-100">Anti-Bullshit</h1>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Review Engine v3.5</p>
            </div>
          </div>
          
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-2">
            <p className="text-xs font-semibold text-zinc-300">🎯 Notre Mission</p>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Nous scannons la page web que vous donnez via l'API Jina, nettoyons le bruit marketing, et extrayons la vérité absolue grâce à DeepSeek v4.
            </p>
          </div>
        </div>

        {/* Bloc Don sécurisé */}
        <div className="mt-8 lg:mt-0 p-4 rounded-xl border border-dashed border-amber-500/20 bg-amber-500/[0.02] space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
            <span>☕</span>
            <span>Soutenir le serveur libre</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-normal">
            Aucun abonnement forcé. Si l'outil vous a sauvé d'un mauvais achat, laissez une petite contribution.
          </p>
          <button 
            onClick={() => handleCopyLink("https://paypal.me/votre-compte")}
            className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-all active:scale-[0.98] shadow-md shadow-amber-500/10"
          >
            Faire un don via PayPal
          </button>
        </div>
      </aside>

      {/* SECTION CENTRALE : Scanner + Résultats + Module de Chat */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#020202]">
        
        {/* Formulaire de recherche */}
        <header className="p-6 md:p-8 border-b border-zinc-800/80 max-w-4xl w-full mx-auto">
          <form onSubmit={handleSearch} className="space-y-3">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Scanner un lien de produit ou d'avis (Amazon, Forums, Blog)
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                required
                placeholder="Coller l'URL du produit à analyser..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all placeholder:text-zinc-600 font-mono text-xs"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3.5 sm:py-0 bg-zinc-100 hover:bg-zinc-200 text-black font-semibold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 shrink-0 active:scale-[0.98]"
              >
                {loading ? "Scan en cours..." : "Lancer l'extraction"}
              </button>
            </div>
          </form>
        </header>

        {/* Zone centrale de défilement des résultats */}
        <section className="flex-1 p-6 md:p-8 max-w-4xl w-full mx-auto space-y-8 overflow-y-auto">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3">
              <span className="text-base mt-0.5">⚠️</span>
              <div className="space-y-1">
                <p className="font-semibold">Erreur de connexion</p>
                <p className="text-zinc-300 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Squelette de chargement */}
          {loading && (
            <div className="py-16 space-y-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-semibold text-zinc-300">Jina Reader extrait le contenu brut...</p>
                  <p className="text-[10px] text-zinc-500">DeepSeek v4 prépare ensuite l'analyse anti-bullshit</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-30 pointer-events-none">
                <div className="h-40 bg-zinc-900/50 rounded-2xl border border-zinc-800"></div>
                <div className="h-40 bg-zinc-900/50 rounded-2xl border border-zinc-800"></div>
              </div>
            </div>
          )}

          {/* Affichage des résultats */}
          {results && (
            <div className="space-y-8 animate-in fade-in duration-500">
              
              {/* En-tête du produit détecté */}
              <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
                <span className="text-xl">📦</span>
                <h2 className="text-base font-bold text-zinc-100 tracking-tight">
                  {results.productName}
                </h2>
              </div>

              {/* Les deux colonnes de verdicts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Positifs (Vert) */}
                <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Les 5 Points Forts Réels
                  </div>
                  <ul className="space-y-3.5">
                    {results.positives.map((item, idx) => (
                      <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2.5 leading-relaxed">
                        <span className="text-emerald-500/80 font-mono text-[10px] mt-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Négatifs (Rouge) */}
                <div className="bg-red-500/[0.02] border border-red-500/10 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                    <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse"></span>
                    Les 5 Pires Défauts Cachés
                  </div>
                  <ul className="space-y-3.5">
                    {results.negatives.map((item, idx) => (
                      <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2.5 leading-relaxed">
                        <span className="text-red-500/80 font-mono text-[10px] mt-0.5 bg-red-500/10 px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* Bloc Affiliation Amazon */}
              <div className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Liens partenaires d'affiliation</p>
                  <span className="text-[9px] text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-full font-mono">Commission Réduite</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  {results.amazonLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold rounded-xl text-zinc-200 transition-all flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2">
                        <span>🛒</span>
                        <span>{link.label}</span>
                      </span>
                      <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors">→</span>
                    </a>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Pas encore de résultats */}
          {!results && !loading && !error && (
            <div className="py-24 text-center space-y-3">
              <span className="text-3xl grayscale opacity-60">🔍</span>
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-400">En attente d'une URL de produit</p>
                <p className="text-[11px] text-zinc-600">Entrez un lien ci-dessus pour lancer l'extraction des données.</p>
              </div>
            </div>
          )}
        </section>

        {/* BAS : Boîte de chat interactive */}
        <footer className="p-6 md:p-8 border-t border-zinc-800/80 bg-[#040404] max-w-4xl w-full mx-auto rounded-t-3xl">
          <div className="space-y-4">
            
            {/* Zone de messages du chat */}
            {chatMessages.length > 0 && (
              <div className="max-h-60 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-amber-500/10 border border-amber-500/20 text-amber-200"
                          : "bg-zinc-900 border border-zinc-800 text-zinc-300"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-500 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce"></span>
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce delay-100"></span>
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce delay-200"></span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}

            {/* Input du chat */}
            <form onSubmit={handleSendChatMessage} className="flex gap-2">
              <input
                type="text"
                disabled={!results || chatLoading}
                placeholder={results ? "Posez une question sur les défauts cachés ou l'autonomie..." : "Faites d'abord un scan pour poser vos questions"}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-zinc-900/40 border border-zinc-800/80 rounded-xl px-4 py-3 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/30 placeholder:text-zinc-600 disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!results || chatLoading || !chatInput.trim()}
                className="px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-800 transition-all disabled:opacity-30 shrink-0"
              >
                Demander
              </button>
            </form>

          </div>
        </footer>
      </main>

      {/* SECTION DROITE : Nos autres applications */}
      <aside className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-zinc-800/80 p-6 space-y-6 shrink-0 bg-[#070707]/90 backdrop-blur-md">
        <div>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nos plateformes affiliées</h3>
        </div>
        
        <div className="space-y-4">
          
          <div className="group p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/20 hover:border-zinc-700/80 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold group-hover:text-amber-500 transition-colors">Vitality Tracker</span>
              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">Actif</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5 leading-normal">
              Suivi budgétaire intelligent, calculs de calories et d'habitudes connectés.
            </p>
          </div>
          
          <div className="group p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/20 hover:border-zinc-700/80 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold group-hover:text-amber-500 transition-colors">Echo AI Portal</span>
              <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">Bêta</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5 leading-normal">
              Le bac à sable ultime d'écriture et d'exploration avec agents conversationnels.
            </p>
          </div>

        </div>
      </aside>

    </div>
  );
}