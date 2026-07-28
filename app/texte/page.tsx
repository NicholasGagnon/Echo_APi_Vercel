"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";

export default function TextePage() {
  const [text, setText] = useState<string>("");
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const API_URL = "http://localhost:5001";

  // 1. Génération du texte
  const handleGenerate = async () => {
    setLoadingGenerate(true);
    try {
      const res = await fetch(`${API_URL}/texte/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.text) {
        setText(data.text);
        if (editorRef.current) editorRef.current.innerText = data.text;
      }
    } catch (e) {
      console.error(e);
      alert("Erreur de génération");
    } finally {
      setLoadingGenerate(false);
    }
  };

  // 2. NETTOYAGE UNIQUE : Détection des titres, mise en GRAS et Sauts de ligne automatiques
  const handleNettoyageComplet = () => {
    const rawText = editorRef.current ? editorRef.current.innerText : text;
    if (!rawText) return;

    const lines = rawText.split("\n");
    const finalHtml: string[] = [];

    lines.forEach((line) => {
      const stripped = line.trim();
      if (!stripped) return;

      // Détecte si le début du bloc contient un titre en MAJUSCULES
      const match = stripped.match(/^([A-ZÀ-ÖØ-ß0-9\s' \-,:!\.]{5,120}?)(?=\s+[A-ZÀ-ÖØ-ß]?[a-zà-öø-ÿ]|\n|$)/);

      if (match && match[1].trim() === match[1].trim().toUpperCase()) {
        let titre = match[1].trim().replace(/[\.:]$/, "").trim();
        const reste = stripped.slice(match[0].length).trim();

        // 1. On injecte le titre directement en VRAI GRAS (<b>)
        finalHtml.push(`<p><b>${titre}</b></p>`);

        // 2. S'il y avait du texte collé au titre, on le met en paragraphe séparé sous le titre
        if (reste) {
          finalHtml.push(`<p>${reste}</p>`);
        }
      } else {
        // Paragraphe normal
        finalHtml.push(`<p>${stripped}</p>`);
      }
    });

    // Le jointure avec <br/> crée la séparation nette entre le titre et les paragraphes
    const htmlFormatted = finalHtml.join("<br/>");

    if (editorRef.current) {
      editorRef.current.innerHTML = htmlFormatted;
    }
  };

  return (
    <main className="min-h-screen w-screen bg-[#0f0f0f] text-zinc-100 font-sans p-6 flex flex-col gap-6">
      <header className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <h1 className="text-xl font-mono font-black text-cyan-400">OUTIL DE NETTOYAGE LOCAL</h1>
        <Link href="/" className="text-xs font-mono text-zinc-400 hover:text-white">
          ← RETOUR
        </Link>
      </header>

      <div className="max-w-4xl w-full mx-auto flex flex-col gap-4">
        <div className="flex gap-4 items-center flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={loadingGenerate}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono font-bold text-xs uppercase rounded-xl transition-all disabled:opacity-50"
          >
            {loadingGenerate ? "Génération..." : "1. Générer"}
          </button>

          <button
            onClick={handleNettoyageComplet}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-bold text-xs uppercase rounded-xl transition-all"
          >
            2. Nettoyer le texte (Sauts + Titres en Gras)
          </button>
        </div>

        {/* Zone éditable finale avec la même taille de texte partout et le vrai gras sur les titres */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="w-full h-[600px] bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm font-sans text-zinc-200 focus:outline-none focus:border-cyan-500 leading-relaxed overflow-y-auto whitespace-pre-wrap"
        />
      </div>
    </main>
  );
}