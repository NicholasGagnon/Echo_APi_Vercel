"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { jsPDF } from "jspdf";
import LangDropdown from "../components/LangDropdown";
import { useApp } from "../../context/AppContext"; // 🚀 Chemin ajusté avec succès !

type Note = {
  id: string;
  content: string;
  date: string;
};

export default function NotesPage() {
  const { t, lang, theme, toggleTheme } = useApp(); // Utilisation du dictionnaire global
  const [input, setInput] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [userTier, setUserTier] = useState<"free" | "basic" | "premium" | "ultra" | "founder">("free");

  useEffect(() => {
    const saved = localStorage.getItem("echo-notes-v2");
    if (saved) setNotes(JSON.parse(saved));

    const savedTier = localStorage.getItem("echo-user-tier");
    if (savedTier) setUserTier(savedTier as any);

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("echo-notes-v2", JSON.stringify(notes));
  }, [notes, loaded]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("echo-user-tier", userTier);
  }, [userTier, loaded]);

  const saveNote = () => {
    if (!input.trim()) return;
    const newNote: Note = {
      id: Date.now().toString(),
      content: input.trim(),
      date: new Date().toLocaleString("fr-CA"),
    };
    setNotes((prev) => [newNote, ...prev]);
    setInput("");
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const loadNoteIntoEditor = (note: Note) => {
    setInput(note.content);
  };

  const lancerDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(lang === "fr" ? "La reconnaissance vocale n'est pas supportée par votre navigateur." : "Speech recognition is not supported by your current browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR"; 
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const textResult = event.results[0][0].transcript;
      setInput((prev) => prev + (prev ? " " : "") + textResult);
    };

    recognition.start();
  };

  const exportTXT = () => {
    const blob = new Blob([input], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "echo-note.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const exportMD = () => {
    const blob = new Blob([input], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "echo-note.md"; a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ content: input }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "echo-note.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const exportDOCX = async () => {
    const html = `<html><head><meta charset="utf-8"></head><body><p>${input.replace(/\n/g, "</p><p>")}</p></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "echo-note.docx"; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (!input.trim()) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(11);
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxLineWidth = pageWidth - (margin * 2);
    const splitText = doc.splitTextToSize(input, maxLineWidth);
    doc.text(splitText, margin, margin);
    doc.save("echo-note.pdf");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      if (ext === "json") {
        try {
          const parsed = JSON.parse(text);
          setInput(parsed.content ?? text);
        } catch { setInput(text); }
      } else { setInput(text); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <main className="h-screen bg-white dark:bg-black text-black dark:text-white flex overflow-hidden relative font-sans transition-colors duration-200 selection:bg-cyan-500/30">
      
      {/* 🌐 INTERFACE MENU SUPÉRIEUR DROIT ALIGNÉ */}
      <div className="absolute top-4 right-4 z-50 bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-300 dark:border-zinc-700 p-2 rounded-xl text-xs flex gap-3 items-center shadow-md">
        <LangDropdown />
        <span className="text-zinc-300 dark:text-zinc-700">|</span>
        <button onClick={toggleTheme} className="font-bold text-zinc-700 dark:text-zinc-300 hover:text-cyan-500 transition-colors">
          {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        
        {/* SIDEBAR GAUCHE - INCORPORÉE DE MANIÈRE 100% IDENTIQUE AU MASTER TEMPLATE */}
        <aside className="w-55 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-8 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between">
          <div className="space-y-20">
            <h2 className="font-bold text-lg">
              <Link href="/" className="hover:text-cyan-500 dark:hover:text-cyan-400">{t.sidebar.home}</Link>
            </h2>
            <div className="space-y-20 text-zinc-800 dark:text-zinc-100 font-medium">
              <Link href="/chat" className="block hover:text-cyan-500">{t.sidebar.chat}</Link>
              <Link href="/notes" className="block text-cyan-600 dark:text-cyan-400 font-bold">{t.sidebar.notes}</Link>
              <Link href="/calendar" className="block hover:text-cyan-500">📅 {lang === "fr" ? "Calendrier" : "Calendar"}</Link>
              <Link href="/vitality" className="block hover:text-cyan-500">📈 {lang === "fr" ? "Vitalité" : "Vitality"}</Link>
              <Link href="/services" className="block hover:text-cyan-500">💎 {lang === "fr" ? "Services" : "Services"}</Link>
              <Link href="/account" className="block hover:text-cyan-500">👤 {lang === "fr" ? "Compte" : "Account"}</Link>
              <hr className="border-zinc-200 dark:border-zinc-800 my-4" />
              <Link href="/history" className="block hover:text-amber-500">⭐ {lang === "fr" ? "Historique" : "History"}</Link>
            </div>
          </div>
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
            Status : <span className="text-cyan-500 dark:text-cyan-400 uppercase font-bold block">{userTier}</span>
          </div>
        </aside>

        {/* WORKSPACE AXIS */}
        <div className="flex flex-1 overflow-hidden min-w-0">
          
          {/* EDITOR WINDOW */}
          <section className="flex flex-col flex-1 p-6 overflow-hidden min-w-0 bg-white dark:bg-black transition-colors duration-200">
            <h1 className="text-3xl font-bold mb-4">📝 {lang === "fr" ? "Espace Notes" : "Notes Workspace"}</h1>

            <div className="neon-laser-wire flex-1 w-full rounded-2xl flex items-center justify-center min-h-0">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    e.preventDefault();
                    saveNote();
                  }
                }}
                placeholder={lang === "fr" ? "Écris tes notes ici... (Ctrl+Enter pour sauvegarder)" : "Type your notes here... (Ctrl+Enter to save)"}
                className="neon-laser-content flex-1 h-[calc(100%-6px)] bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-transparent rounded-xl p-4 text-black dark:text-white resize-none focus:outline-none text-sm leading-relaxed"
              />
            </div>

            {/* CONTROL BAR */}
            <div className="mt-4 bg-zinc-100 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-2xl p-4 flex flex-col gap-4 shrink-0">
              <div className="flex justify-between items-center flex-wrap gap-3">
                
                {/* Actions principales */}
                <div className="flex gap-2">
                  <button 
                    onClick={lancerDictation}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                      isListening ? "bg-red-600 animate-pulse text-white" : "bg-cyan-600 hover:bg-cyan-500 text-white"
                    }`}
                  >
                    {isListening ? (lang === "fr" ? "🔴 Écoute..." : "🔴 Listening...") : (lang === "fr" ? "🎤 Parler" : "🎤 Speak")}
                  </button>
                  
                  <button
                    onClick={saveNote}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-md"
                  >
                    💾 {lang === "fr" ? "Sauvegarder la note" : "Save Note"}
                  </button>
                </div>

                {/* Groupe Import */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-inner">
                  <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mr-1">Import:</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.json"
                    className="hidden"
                    onChange={handleImport}
                  />
                  {["TXT", "MD", "JSON"].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] font-bold px-2.5 py-1 rounded transition text-zinc-700 dark:text-zinc-300"
                    >
                      {fmt}
                    </button>
                  ))}
                </div>

                {/* Groupe Export */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-inner">
                  <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mr-1">Export:</span>
                  <button onClick={exportTXT} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] font-bold px-2 py-1 rounded transition text-zinc-700 dark:text-zinc-300">TXT</button>
                  <button onClick={exportMD}  className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] font-bold px-2 py-1 rounded transition text-zinc-700 dark:text-zinc-300">MD</button>
                  <button onClick={exportJSON} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] font-bold px-2 py-1 rounded transition text-zinc-700 dark:text-zinc-300">JSON</button>
                  <button onClick={exportDOCX} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] font-bold px-2 py-1 rounded transition text-zinc-700 dark:text-zinc-300">DOCX</button>
                  <button onClick={exportPDF} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] font-bold px-2 py-1 rounded transition text-zinc-700 dark:text-zinc-300">PDF</button>
                </div>

              </div>
            </div>
          </section>

          {/* HISTORIQUE SIDEBAR DROITE */}
          <aside className="w-80 shrink-0 border-l border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 flex items-center gap-2 mt-12">
                <span className="w-2 h-2 rounded-full bg-cyan-500" /> {lang === "fr" ? "Registre Notes" : "Storage Log"}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {notes.length === 0 && (
                <p className="text-zinc-400 dark:text-zinc-600 text-xs italic text-center mt-4">{lang === "fr" ? "Aucune note sauvegardée." : "No saved notes found."}</p>
              )}
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="neon-laser-wire rounded-xl cursor-pointer transition group relative border border-zinc-200 dark:border-transparent shadow-sm"
                  onClick={() => loadNoteIntoEditor(note)}
                >
                  <div className="neon-laser-content bg-white dark:bg-zinc-900/90 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-zinc-400 dark:text-zinc-500 text-[9px] font-medium">📅 {note.date}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                        className="text-zinc-400 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete note"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap line-clamp-3 leading-relaxed">{note.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </aside>

        </div>
      </div>
    </main>
  );
}