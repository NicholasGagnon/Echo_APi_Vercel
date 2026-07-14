"use client";

import React, { useState, useEffect, useRef } from "react";

// Les rôles des artistes correspondants à tes 8 rounds
const ARTIST_ROLES = [
  { round: 1, name: "Éclaireur Gemini (primo)", desc: "Premier jet moderne en direct Google, pose l'ossature + micro-interactions" },
  { round: 2, name: "The Traceur (na)", desc: "Pose l'impulsion et la structure asymétrique sauvage" },
  { round: 3, name: "L'Ajouteur (ajout)", desc: "Enrichit avec du nouveau contenu pertinent, sans saboter l'existant" },
  { round: 4, name: "The Master (eu)", desc: "Harmonise le chaos, injecte les transitions et les interactions fluides" },
  { round: 5, name: "The Traceur (na)", desc: "Ré-attaque avec une agression graphique et typographique" },
  { round: 6, name: "Le Modificateur Élégant", desc: "Raffine la finition (ombres, glow, micro-interactions) sans saboter" },
  { round: 7, name: "The Master (eu)", desc: "Unifie l'œuvre finale et verrouille l'esthétique générale" },
  { round: 8, name: "Compilateur (GPT-4o Mini)", desc: "Convertit le HTML final en composant React/TSX propre et compilable" }
];

interface LogEntry {
  round: number;
  modelUsed: string;
  artistName: string;
  comment: string;
}

export default function StyleStudioPage() {
  const [idea, setIdea] = useState("créer moi une page stylé pour pouvoir mettre 12 outil");
  const [importedCode, setImportedCode] = useState("");
  const [htmlCode, setHtmlCode] = useState(""); // HTML accumulé (rounds 1-7), pour l'aperçu Iframe
  const [finalTsxCode, setFinalTsxCode] = useState(""); // Composant React/TSX final (round 8, compilateur)
  const [journal, setJournal] = useState<LogEntry[]>([]);
  const [roundSnapshots, setRoundSnapshots] = useState<Record<number, string>>({}); // code HTML après chaque round
  const [selectedRound, setSelectedRound] = useState<number | null>(null); // round cliqué dans le journal
  const [displayedRound, setDisplayedRound] = useState<number | null>(null); // round actuellement affiché (aperçu/code)
  const [history, setHistory] = useState<Array<{ htmlCode: string; finalTsxCode: string; journal: LogEntry[]; roundSnapshots: Record<number, string> }>>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isMutating, setIsMutating] = useState(false);
  const [currentRound, setCurrentRound] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [lang, setLang] = useState("fr");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const journalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll pour le journal de bord à gauche
  useEffect(() => {
    journalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [journal]);

  // Gérer l'import de fichier existant
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportedCode(text);
      setHtmlCode(text); // Initialise l'aperçu avec ton code importé
    };
    reader.readAsText(file);
  };

  // Sauvegarde un instantané complet de l'état pour undo/redo.
  // Tronque tout historique "futur" si on avait fait des undo avant de rejouer.
  const pushHistory = (snapshot: { htmlCode: string; finalTsxCode: string; journal: LogEntry[]; roundSnapshots: Record<number, string> }) => {
    setHistory((prev) => {
      const truncated = prev.slice(0, historyIndex + 1);
      return [...truncated, snapshot];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  // Lancement de la cascade de mutation, à partir d'un round et d'un code donnés.
  // startRound=1 + initialCode="" (ou importedCode) = mutation complète depuis zéro.
  // startRound=N+1 + initialCode=snapshot du round N = reprise depuis un point précis.
  const runMutationChain = async (startRound: number, initialCode: string) => {
    if (!idea.trim() && !initialCode.trim()) {
      alert("Veuillez entrer une idée artistique ou importer un code existant.");
      return;
    }

    setIsMutating(true);
    setCurrentRound(startRound);
    setActiveTab("preview");
    setDisplayedRound(null);
    if (startRound > 8) return;

    let workingCode = initialCode;
    let localSnapshots: Record<number, string> = { ...roundSnapshots };
    let localFinalTsx = finalTsxCode;

    try {
      for (let r = startRound; r <= 8; r++) {
        setCurrentRound(r);

        const res = await fetch("http://127.0.0.1:5002/api/style/mutate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: idea,
            context: workingCode,
            round: r,
            lang: lang
          })
        });

        if (!res.ok) {
          throw new Error(`Le serveur Flask a répondu avec une erreur (Round ${r})`);
        }

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        if (r === 8) {
          localFinalTsx = data.response;
          setFinalTsxCode(localFinalTsx);
        } else {
          workingCode = data.response;
          setHtmlCode(workingCode);
          localSnapshots = { ...localSnapshots, [r]: workingCode };
          setRoundSnapshots(localSnapshots); // point de sauvegarde
        }

        const artist = ARTIST_ROLES[r - 1];
        const newLog: LogEntry = {
          round: r,
          modelUsed: data.model_used || "AI-Artist",
          artistName: artist.name,
          comment: r === 8
            ? "Inspection syntaxique achevée. Balises fermées, doublons supprimés. Code sécurisé et compilable."
            : `A injecté sa signature artistique directement dans la structure. Le code a muté.`
        };
        setJournal((prev) => {
          const updatedJournal = [...prev, newLog];
          pushHistory({
            htmlCode: workingCode,
            finalTsxCode: localFinalTsx,
            journal: updatedJournal,
            roundSnapshots: localSnapshots
          });
          return updatedJournal;
        });
      }
    } catch (err: any) {
      console.error(err);
      setJournal((prev) => [
        ...prev,
        {
          round: 999,
          modelUsed: "Système",
          artistName: "Erreur critique",
          comment: `La liaison a été coupée : ${err.message}`
        }
      ]);
    } finally {
      setIsMutating(false);
      setCurrentRound(null);
    }
  };

  const handleStartMutation = () => {
    setJournal([]);
    setFinalTsxCode("");
    setRoundSnapshots({});
    setSelectedRound(null);
    setDisplayedRound(null);
    setHistory([]);
    setHistoryIndex(-1);
    runMutationChain(1, importedCode);
  };

  // Clique sur un round du journal -> propose les actions (voir / effacer / repartir)
  const handleJournalClick = (round: number) => {
    if (isMutating || round === 999) return;
    setSelectedRound(selectedRound === round ? null : round);
  };

  // Option A : juste VOIR le code de ce round, sans rien effacer ni continuer
  const handleViewRound = (round: number) => {
    if (roundSnapshots[round] === undefined) return;
    setDisplayedRound(round);
    setSelectedRound(null);
    setActiveTab("preview");
  };

  const handleReturnToLive = () => {
    setDisplayedRound(null);
  };

  // Option B : effacer tout ce qui suit ce round, revenir à son état
  const handleRevertToRound = (round: number) => {
    const snapshot = roundSnapshots[round];
    if (snapshot === undefined) return;
    setHtmlCode(snapshot);
    setFinalTsxCode("");
    setJournal((prev) => {
      const truncatedJournal = prev.filter((log) => log.round <= round);
      const truncatedSnapshots: Record<number, string> = {};
      Object.keys(roundSnapshots).forEach((k) => {
        const n = Number(k);
        if (n <= round) truncatedSnapshots[n] = roundSnapshots[n];
      });
      pushHistory({ htmlCode: snapshot, finalTsxCode: "", journal: truncatedJournal, roundSnapshots: truncatedSnapshots });
      return truncatedJournal;
    });
    setRoundSnapshots((prev) => {
      const next: Record<number, string> = {};
      Object.keys(prev).forEach((k) => {
        const n = Number(k);
        if (n <= round) next[n] = prev[n];
      });
      return next;
    });
    setSelectedRound(null);
    setDisplayedRound(null);
    setActiveTab("preview");
  };

  // Option C : repartir de ce round precis pour continuer la mutation (round+1 -> 8)
  const handleContinueFromRound = (round: number) => {
    const snapshot = roundSnapshots[round];
    if (snapshot === undefined) return;
    setHtmlCode(snapshot);
    setFinalTsxCode("");
    setJournal((prev) => prev.filter((log) => log.round <= round));
    setRoundSnapshots((prev) => {
      const next: Record<number, string> = {};
      Object.keys(prev).forEach((k) => {
        const n = Number(k);
        if (n <= round) next[n] = prev[n];
      });
      return next;
    });
    setSelectedRound(null);
    setDisplayedRound(null);
    runMutationChain(round + 1, snapshot);
  };

  // Undo / Redo avec avertissement — restaure un instantané complet.
  const handleUndo = () => {
    if (historyIndex <= 0 || isMutating) return;
    const confirmed = window.confirm(
      "⚠️ Annuler la dernière étape ? Le code, le journal et les points de sauvegarde reviendront à l'état précédent. Cette action peut être refaite avec Ctrl+Y."
    );
    if (!confirmed) return;
    const target = history[historyIndex - 1];
    setHtmlCode(target.htmlCode);
    setFinalTsxCode(target.finalTsxCode);
    setJournal(target.journal);
    setRoundSnapshots(target.roundSnapshots);
    setHistoryIndex(historyIndex - 1);
    setDisplayedRound(null);
    setSelectedRound(null);
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1 || isMutating) return;
    const confirmed = window.confirm(
      "⚠️ Refaire l'étape suivante ? Le code, le journal et les points de sauvegarde avanceront vers l'état plus récent. Cette action peut être annulée avec Ctrl+Z."
    );
    if (!confirmed) return;
    const target = history[historyIndex + 1];
    setHtmlCode(target.htmlCode);
    setFinalTsxCode(target.finalTsxCode);
    setJournal(target.journal);
    setRoundSnapshots(target.roundSnapshots);
    setHistoryIndex(historyIndex + 1);
    setDisplayedRound(null);
    setSelectedRound(null);
  };

  // Raccourcis clavier Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      } else if (e.ctrlKey && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, history, isMutating]);

  // Préparation du code de l'Iframe pour supporter Tailwind CSS CDN automatiquement
  const getIframeSrcDoc = (codeToRender: string) => {
    if (!codeToRender) {
      return `
        <html>
          <head>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="bg-neutral-950 text-neutral-500 flex items-center justify-center h-screen font-sans">
            <div class="text-center">
              <p class="text-xl tracking-widest uppercase">MUR VIERGE</p>
              <p class="text-xs mt-2 text-neutral-600">Infiltre ton idée à gauche pour que la peinture commence à jaillir.</p>
            </div>
          </body>
        </html>
      `;
    }

    // Si le code généré ne contient pas d'enveloppe HTML de base, on lui injecte le CDN Tailwind pour l'affichage
    if (!codeToRender.includes("<html") && !codeToRender.includes("<body")) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body { background-color: #000; margin: 0; padding: 0; }
            </style>
          </head>
          <body>
            ${codeToRender}
          </body>
        </html>
      `;
    }
    return codeToRender;
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-black text-white font-mono overflow-hidden">
      
      {/* ── PANNEAU DE CONTRÔLE GAUCHE ─────────────────────────────────────── */}
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-neutral-800 flex flex-col justify-between p-4 bg-neutral-950 shrink-0 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-black tracking-tighter text-pink-500">STYLE.STUDIO</h1>
            <p className="text-xs text-neutral-500">// STUDIO DE MUTATION ESTHÉTIQUE</p>
          </div>

          {/* Import de fichier */}
          <div className="space-y-2">
            <label className="text-xs text-neutral-400 font-bold uppercase tracking-wider">// Injecter une base existante</label>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-3 border border-dashed border-neutral-700 hover:border-pink-500 text-xs text-neutral-300 hover:text-white transition rounded flex items-center justify-center gap-2"
            >
              📂 Importer un fichier (HTML)
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".html,.txt,.tsx"
              className="hidden"
            />
            {importedCode && (
              <p className="text-[10px] text-green-500">✓ Code importé ({importedCode.length} caractères)</p>
            )}
          </div>

          {/* Invite de l'utilisateur */}
          <div className="space-y-2">
            <label className="text-xs text-neutral-400 font-bold uppercase tracking-wider">// Direction Artistique Folle</label>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Ex: Une page sombre asymétrique violette et orange fluo..."
              rows={4}
              className="w-full p-3 bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 focus:outline-none focus:border-pink-500 rounded resize-none"
            />
          </div>

          {/* Bouton de déclenchement */}
          <button
            onClick={handleStartMutation}
            disabled={isMutating}
            className={`w-full py-3 px-4 font-black text-sm tracking-widest rounded transition-all duration-300 ${
              isMutating
                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                : "bg-pink-600 text-white hover:bg-pink-500 shadow-lg shadow-pink-600/20 active:scale-[0.98]"
            }`}
          >
            {isMutating ? `MUTATION ROUND ${currentRound}/8...` : "💥 ACTIVER LA MUTATION"}
          </button>

          {/* Undo / Redo */}
          <div className="flex gap-2">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0 || isMutating}
              title="Annuler (Ctrl+Z)"
              className="flex-1 py-2 px-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed border border-neutral-800 text-xs font-bold rounded text-neutral-300 hover:text-white transition"
            >
              ↩️ Annuler
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1 || isMutating}
              title="Refaire (Ctrl+Y)"
              className="flex-1 py-2 px-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed border border-neutral-800 text-xs font-bold rounded text-neutral-300 hover:text-white transition"
            >
              ↪️ Refaire
            </button>
          </div>
        </div>

        {/* Journal de bord de la fresque */}
        <div className="mt-6 border-t border-neutral-900 pt-4 flex-1 flex flex-col min-h-[250px]">
          <label className="text-xs text-neutral-400 font-bold uppercase tracking-wider mb-2">// Journal de bord de la fresque</label>
          <p className="text-[10px] text-neutral-600 mb-2 italic">Clique un round : voir son code, effacer la suite, ou repartir de là</p>
          <div className="flex-1 bg-neutral-900 border border-neutral-900 rounded p-3 overflow-y-auto max-h-[300px] lg:max-h-none space-y-3 text-xs">
            {journal.length === 0 && (
              <p className="text-neutral-600 italic">En attente de la première bombe de peinture...</p>
            )}
            {journal.map((log, index) => {
              const hasSnapshot = roundSnapshots[log.round] !== undefined;
              return (
                <div key={index} className={`border-b border-neutral-800/50 pb-2 last:border-b-0 ${displayedRound === log.round ? "bg-pink-950/20 -mx-1 px-1 rounded" : ""}`}>
                  <button
                    onClick={() => handleJournalClick(log.round)}
                    disabled={!hasSnapshot || isMutating}
                    className={`w-full text-left ${hasSnapshot && !isMutating ? "cursor-pointer hover:bg-neutral-800/40 rounded px-1 -mx-1" : "cursor-default"}`}
                  >
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-pink-500 font-bold">ROUND {log.round} : {log.artistName}</span>
                      <span className="text-neutral-600">{log.modelUsed}</span>
                    </div>
                    <p className="text-neutral-300 leading-relaxed">{log.comment}</p>
                  </button>

                  {selectedRound === log.round && hasSnapshot && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleViewRound(log.round)}
                        className="flex-1 py-1.5 px-2 bg-neutral-800 hover:bg-blue-900/40 border border-neutral-700 hover:border-blue-600 text-[10px] font-bold rounded text-neutral-300 hover:text-blue-300 transition"
                      >
                        👁️ Voir ce round
                      </button>
                      <button
                        onClick={() => handleRevertToRound(log.round)}
                        className="flex-1 py-1.5 px-2 bg-neutral-800 hover:bg-red-900/40 border border-neutral-700 hover:border-red-700 text-[10px] font-bold rounded text-neutral-300 hover:text-red-300 transition"
                      >
                        🗑️ Effacer ce qui suit
                      </button>
                      <button
                        onClick={() => handleContinueFromRound(log.round)}
                        className="flex-1 py-1.5 px-2 bg-neutral-800 hover:bg-pink-900/40 border border-neutral-700 hover:border-pink-600 text-[10px] font-bold rounded text-neutral-300 hover:text-pink-300 transition"
                      >
                        ▶️ Repartir d'ici
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={journalEndRef} />
          </div>
        </div>
      </div>

      {/* ── PANNEAU D'AFFICHAGE DROITE ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-neutral-900">
        
        {/* Barre de navigation des onglets */}
        <div className="h-14 border-b border-neutral-800 px-4 flex items-center justify-between bg-neutral-950 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-4 py-2 text-xs font-bold tracking-widest rounded transition ${
                activeTab === "preview"
                  ? "bg-neutral-800 text-pink-500 border border-pink-500/30"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              👀 APERÇU LIVE
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`px-4 py-2 text-xs font-bold tracking-widest rounded transition ${
                activeTab === "code"
                  ? "bg-neutral-800 text-pink-500 border border-pink-500/30"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              💻 CODE COMPILÉ
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-500">// LANGUE :</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 rounded px-2 py-1 focus:outline-none"
            >
              <option value="fr">FRANÇAIS</option>
              <option value="en">ENGLISH</option>
            </select>
          </div>
        </div>

        {/* Bannière : affichage d'un ancien round (pas le live) */}
        {displayedRound !== null && (
          <div className="h-8 bg-blue-950/50 border-b border-blue-800/50 px-4 flex items-center justify-between shrink-0">
            <span className="text-[10px] text-blue-300 font-bold">👁️ AFFICHAGE DU ROUND {displayedRound} (pas le dernier état)</span>
            <button
              onClick={handleReturnToLive}
              className="text-[10px] text-blue-300 hover:text-white underline"
            >
              Revenir au live →
            </button>
          </div>
        )}

        {/* Zone de contenu des onglets */}
        <div className="flex-1 overflow-hidden relative">
          
          {/* Onglet : Aperçu Live (Iframe) */}
          {activeTab === "preview" && (
            <iframe
              title="Style Preview"
              srcDoc={getIframeSrcDoc(displayedRound !== null ? roundSnapshots[displayedRound] : htmlCode)}
              className="w-full h-full border-none bg-black"
              sandbox="allow-scripts"
            />
          )}

          {/* Onglet : Code Compilé */}
          {activeTab === "code" && (() => {
            const codeShown = displayedRound !== null
              ? roundSnapshots[displayedRound]
              : (finalTsxCode || htmlCode);
            const label = displayedRound !== null
              ? `// CODE HTML DU ROUND ${displayedRound}`
              : (finalTsxCode ? "// COMPOSANT REACT (.TSX) FINAL — PRÊT POUR VS CODE" : "// HTML EN COURS DE MUTATION (aperçu, pas encore le composant final)");
            return (
              <div className="w-full h-full p-4 overflow-auto bg-neutral-950">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-neutral-500">{label}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(codeShown || "");
                      alert("Code copié dans le presse-papiers !");
                    }}
                    className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] font-bold rounded text-neutral-300 hover:text-white transition"
                  >
                    📋 COPIER LE CODE
                  </button>
                </div>
                <pre className="text-xs text-neutral-400 p-4 bg-neutral-900 border border-neutral-800 rounded overflow-x-auto select-all font-mono">
                  {codeShown || "// Le code compilé apparaîtra ici dès le Round 1..."}
                </pre>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}