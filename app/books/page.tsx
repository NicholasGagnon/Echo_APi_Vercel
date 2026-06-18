"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useApp } from "../../context/AppContext";

// ── TYPES ──────────────────────────────────────────────────────────────────────
type EchoMode = "creative" | "ideas" | "critical";
type BookFormat = "a5" | "6x9" | "custom";
type SaveStatus = "saved" | "saving" | "unsaved";
type Preset = "print" | "kindle";

type BookMessage = { role: "user" | "echo"; text: string };
type Chapter = { id: string; title: string; content: string };

// ── ECHO MODES ─────────────────────────────────────────────────────────────────
const ECHO_MODES: { id: EchoMode; labelFr: string; labelEn: string; emoji: string; system: string }[] = [
  {
    id: "creative", labelFr: "Créatif", labelEn: "Creative", emoji: "✍️",
    system: "Tu es en mode Créatif pour l'écriture. Aide avec imagination, métaphores, suggestions stylistiques originales. Propose des formulations poétiques et inattendues.",
  },
  {
    id: "ideas", labelFr: "Idées", labelEn: "Ideas", emoji: "💡",
    system: "Tu es en mode Idées. Génère des pistes narratives, rebondissements, personnages ou thèmes à explorer pour enrichir l'oeuvre.",
  },
  {
    id: "critical", labelFr: "Critique", labelEn: "Critical", emoji: "🔍",
    system: "Tu es en mode Critique. Analyse le texte avec rigueur : rythme, cohérence, clarté, redondances. Signale ce qui affaiblit le propos sans ménagements.",
  },
];

// ── BOOK FORMATS ───────────────────────────────────────────────────────────────
const BOOK_FORMATS: { id: BookFormat; label: string; maxW: string }[] = [
  { id: "a5",    label: "A5",    maxW: "480px" },
  { id: "6x9",   label: "6×9",  maxW: "540px" },
  { id: "custom",label: "Custom",maxW: "640px" },
];

// ── WATER GLYPHS (eau plate décorative) ────────────────────────────────────────
const WATER = [
  { g: "〰", top: "6%",  left: "2%",  rot: "-18deg", sz: "62px" },
  { g: "∿",  top: "20%", right:"3%",  rot: "12deg",  sz: "78px" },
  { g: "〜", top: "42%", left: "1%",  rot: "-8deg",  sz: "54px" },
  { g: "≈",  top: "63%", right:"2%",  rot: "20deg",  sz: "70px" },
  { g: "∾",  top: "80%", left: "4%",  rot: "-14deg", sz: "58px" },
  { g: "〰", top: "91%", right:"4%",  rot: "6deg",   sz: "48px" },
];

// ── PRESETS ────────────────────────────────────────────────────────────────────
function applyPreset(preset: Preset, s: {
  setBookFormat:(v:BookFormat)=>void; setMirrorMargins:(v:boolean)=>void;
  setShowPageNumbers:(v:boolean)=>void; setShowHeader:(v:boolean)=>void;
  setShowFooter:(v:boolean)=>void; setLineHeight:(v:number)=>void; setFontSize:(v:number)=>void;
}) {
  if (preset === "print") {
    s.setBookFormat("a5"); s.setMirrorMargins(true); s.setShowPageNumbers(true);
    s.setShowHeader(true); s.setShowFooter(true); s.setLineHeight(1.8); s.setFontSize(12);
  } else {
    s.setBookFormat("6x9"); s.setMirrorMargins(false); s.setShowPageNumbers(false);
    s.setShowHeader(false); s.setShowFooter(false); s.setLineHeight(1.6); s.setFontSize(14);
  }
}

// ───────────────────────────────────────────────────────────────────────────────
export default function BooksPage() {
  const { lang, theme, toggleTheme } = useApp();
  const fr = lang === "fr";

  // ── CHAPTERS ──────────────────────────────────────────────────────────────────
  const [chapters, setChapters] = useState<Chapter[]>([
    { id: "ch1", title: fr ? "Chapitre 1" : "Chapter 1", content: "" },
  ]);
  const [activeChapter, setActiveChapter] = useState("ch1");
  const [bookTitle, setBookTitle] = useState(fr ? "Mon Premier Livre" : "My First Book");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // ── SAVE ──────────────────────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveManuscript = useCallback(() => {
    setSaveStatus("saving");
    localStorage.setItem("echo-books-manuscript", JSON.stringify({ bookTitle, chapters }));
    setTimeout(() => setSaveStatus("saved"), 600);
  }, [bookTitle, chapters]);

  useEffect(() => {
    setSaveStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveManuscript, 2500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [chapters, bookTitle]);

  useEffect(() => {
    const raw = localStorage.getItem("echo-books-manuscript");
    if (!raw) return;
    try {
      const { bookTitle: t, chapters: c } = JSON.parse(raw);
      if (t) setBookTitle(t);
      if (c?.length) { setChapters(c); setActiveChapter(c[0].id); }
    } catch { /* ignore */ }
    setSaveStatus("saved");
  }, []);

  // ── BOOK SETTINGS ─────────────────────────────────────────────────────────────
  const [bookFormat, setBookFormat] = useState<BookFormat>("a5");
  const [mirrorMargins, setMirrorMargins] = useState(false);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [showHeader, setShowHeader] = useState(false);
  const [showFooter, setShowFooter] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState("Georgia, serif");
  const [lineHeight, setLineHeight] = useState(1.8);
  const [isJustified, setIsJustified] = useState(true);
  const [paraSpacing, setParaSpacing] = useState(0.75);
  const [showSettings, setShowSettings] = useState(true);

  // ── TOOLBAR STATE ─────────────────────────────────────────────────────────────
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  // ── ECHO ──────────────────────────────────────────────────────────────────────
  const [echoMode, setEchoMode] = useState<EchoMode>("creative");
  const [echoMessages, setEchoMessages] = useState<BookMessage[]>([]);
  const [echoInput, setEchoInput] = useState("");
  const [echoThinking, setEchoThinking] = useState(false);
  const [echoMsgCount, setEchoMsgCount] = useState(0);
  const echoBottomRef = useRef<HTMLDivElement>(null);

  // ── SETTINGS OPEN ─────────────────────────────────────────────────────────────
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ── FILE INPUTS ───────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef  = useRef<HTMLInputElement>(null);

  // ── SYNC EDITOR ───────────────────────────────────────────────────────────────
  const handleEditorInput = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    setChapters(prev => prev.map(c => c.id === activeChapter ? { ...c, content: html } : c));
  }, [activeChapter]);

  useEffect(() => {
    if (!editorRef.current || isPreview) return;
    const current = chapters.find(c => c.id === activeChapter);
    if (current && editorRef.current.innerHTML !== current.content) {
      editorRef.current.innerHTML = current.content;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChapter, isPreview]);

  // ── EDITOR COMMANDS ───────────────────────────────────────────────────────────
  const execCmd = (cmd: string, val?: string) => { editorRef.current?.focus(); document.execCommand(cmd, false, val); };
  const applyBlock = (tag: string) => execCmd("formatBlock", tag);
  const toggleBold   = () => { execCmd("bold");   setIsBold(v => !v); };
  const toggleItalic = () => { execCmd("italic"); setIsItalic(v => !v); };
  const toggleJustify = () => { execCmd(isJustified ? "justifyLeft" : "justifyFull"); setIsJustified(v => !v); };
  const applyIndent  = () => execCmd("indent");

  const insertPageBreak = () => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false,
      `<div style="border-top:1px dashed rgba(6,182,212,0.22);margin:2rem 0;text-align:center;font-size:9px;color:rgba(6,182,212,0.38);letter-spacing:0.25em;padding-top:6px;">— ${fr ? "SAUT DE PAGE" : "PAGE BREAK"} —</div><p><br></p>`);
  };

  const insertTOC = () => {
    const rows = chapters.map((c, i) =>
      `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11px;border-bottom:1px dotted rgba(120,120,120,0.18);">${c.title}<span>${i + 1}</span></div>`
    ).join("");
    editorRef.current?.focus();
    document.execCommand("insertHTML", false,
      `<div style="border:1px dashed rgba(6,182,212,0.18);padding:14px;border-radius:3px;margin:18px 0;"><div style="font-size:9px;text-transform:uppercase;letter-spacing:0.12em;opacity:0.38;margin-bottom:10px;">${fr ? "Table des matières" : "Table of Contents"}</div>${rows}</div>`);
  };

  const insertImage = () => imgInputRef.current?.click();

  const handleImgFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { editorRef.current?.focus(); document.execCommand("insertImage", false, reader.result as string); };
    reader.readAsDataURL(file);
  };

  const addChapter = () => {
    const id = `ch${Date.now()}`;
    const num = chapters.length + 1;
    setChapters(prev => [...prev, { id, title: fr ? `Chapitre ${num}` : `Chapter ${num}`, content: "" }]);
    setActiveChapter(id);
  };

  // ── IMPORT TXT / MD ───────────────────────────────────────────────────────────
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const id = `ch${Date.now()}`;
      const html = text.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
      setChapters(prev => [...prev, { id, title: file.name.replace(/\.[^.]+$/, ""), content: html }]);
      setActiveChapter(id);
    };
    reader.readAsText(file);
  };

  // ── ECHO ──────────────────────────────────────────────────────────────────────
  const sendEcho = async () => {
    if (!echoInput.trim() || echoThinking) return;
    const msg = echoInput.trim();
    setEchoInput("");
    setEchoMessages(prev => [...prev, { role: "user", text: msg }]);
    setEchoMsgCount(c => c + 1);
    setEchoThinking(true);
    const excerpt = editorRef.current?.innerText?.slice(0, 400) || "";
    const modeInfo = ECHO_MODES.find(m => m.id === echoMode);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: [],
          systemOverride: `${modeInfo?.system || ""}\n\nContexte : livre "${bookTitle}". Extrait :\n"${excerpt}"`,
        }),
      });
      const data = await res.json();
      setEchoMessages(prev => [...prev, { role: "echo", text: data.response || "..." }]);
    } catch {
      setEchoMessages(prev => [...prev, { role: "echo", text: fr ? "Impossible de joindre le serveur." : "Cannot reach the server." }]);
    } finally {
      setEchoThinking(false);
    }
  };

  useEffect(() => { echoBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [echoMessages, echoThinking]);

  // ── EXPORT ────────────────────────────────────────────────────────────────────
  const handleExport = (fmt: "docx" | "pdf" | "epub") =>
    alert(`Export ${fmt.toUpperCase()} — "${bookTitle}" (à brancher sur le backend)`);

  // ── PRESET ────────────────────────────────────────────────────────────────────
  const triggerPreset = (p: Preset) =>
    applyPreset(p, { setBookFormat, setMirrorMargins, setShowPageNumbers, setShowHeader, setShowFooter, setLineHeight, setFontSize });

  // ── SAVE LABEL ────────────────────────────────────────────────────────────────
  const saveLabel = {
    saved:   { dot: "bg-emerald-400",            text: fr ? "Sauvegardé" : "Saved" },
    saving:  { dot: "bg-amber-400 animate-pulse", text: fr ? "Sauvegarde..." : "Saving..." },
    unsaved: { dot: "bg-zinc-500",               text: fr ? "Non sauvegardé" : "Unsaved" },
  }[saveStatus];

  const pageMaxW = BOOK_FORMATS.find(f => f.id === bookFormat)?.maxW || "480px";

  // ── TOOLBAR BTN ───────────────────────────────────────────────────────────────
  const TB = ({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick: () => void }) => (
    <button onClick={onClick} title={label}
      className={`group relative w-[42px] h-7 flex items-center justify-center rounded-lg text-[13px] transition-all border select-none
        ${active ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400" : "border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 hover:border-zinc-700"}`}>
      {icon}
      <span className="pointer-events-none absolute left-[46px] top-1/2 -translate-y-1/2 bg-zinc-950 text-white text-[9px] px-1.5 py-0.5 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 border border-zinc-800 z-50 shadow-lg transition-opacity">
        {label}
      </span>
    </button>
  );

  // ── TOGGLE ────────────────────────────────────────────────────────────────────
  const Toggle = ({ val, set }: { val: boolean; set: (v: boolean) => void }) => (
    <button onClick={() => set(!val)}
      className={`w-8 h-4 rounded-full border relative transition-all flex-shrink-0 ${val ? "bg-cyan-500/30 border-cyan-500/50" : "bg-zinc-800 border-zinc-700"}`}>
      <span className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${val ? "left-4 bg-cyan-400" : "left-0.5 bg-zinc-500"}`} />
    </button>
  );

  // ── RENDER ─────────────────────────────────────────────────────────────────────
  return (
    <main className="h-screen bg-white dark:bg-black text-black dark:text-white flex overflow-hidden font-sans transition-colors duration-200 selection:bg-cyan-500/30">

      {/* NAV SIDEBAR */}
      <aside className="w-44 shrink-0 border-r border-zinc-200 dark:border-zinc-800 px-5 py-6 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between">
        <div className="space-y-20">
          <h2 className="font-bold">
            <Link href="/" className="text-cyan-600 dark:text-cyan-400">🏠 {fr ? "Accueil" : "Home"}</Link>
          </h2>
          <div className="space-y-20 text-zinc-800 dark:text-zinc-100 font-medium text-sm">
            <Link href="/chat"     className="block hover:text-cyan-500">💬 Chat</Link>
            <Link href="/books"    className="block text-cyan-500 font-bold">📚 {fr ? "Livres" : "Books"}</Link>
            <Link href="/calendar" className="block hover:text-cyan-500">📅 {fr ? "Calendrier" : "Calendar"}</Link>
            <Link href="/vitality" className="block hover:text-cyan-500">📈 {fr ? "Vitalité" : "Vitality"}</Link>
            <Link href="/services" className="block hover:text-cyan-500">💎 {fr ? "Services" : "Services"}</Link>
            <Link href="/account"  className="block hover:text-cyan-500">👤 {fr ? "Compte" : "Account"}</Link>
            <hr className="border-zinc-200 dark:border-zinc-800" />
            <Link href="/history"  className="block hover:text-amber-500">⭐ {fr ? "Historique" : "History"}</Link>
          </div>
        </div>
        <div className="text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 pt-3">
          Mode : <span className="text-cyan-400 uppercase font-bold block">books</span>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* TOOLBAR — 2 colonnes, no scroll */}
        <div className="w-[100px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col py-2 overflow-hidden">

          <div className="px-2 pb-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono px-0.5">struct</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="T¹" label={fr ? "Titre 1" : "Title 1"} onClick={() => applyBlock("h1")} />
              <TB icon="T²" label={fr ? "Titre 2" : "Title 2"} onClick={() => applyBlock("h2")} />
              <TB icon="T³" label={fr ? "Titre 3" : "Title 3"} onClick={() => applyBlock("h3")} />
              <TB icon="¶"  label={fr ? "Texte normal" : "Normal"} onClick={() => applyBlock("p")} />
            </div>
          </div>

          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono px-0.5">texte</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="B"  label={fr ? "Gras" : "Bold"} active={isBold} onClick={toggleBold} />
              <TB icon="I"  label={fr ? "Italique" : "Italic"} active={isItalic} onClick={toggleItalic} />
              <TB icon="≡"  label={fr ? "Justifié" : "Justify"} active={isJustified} onClick={toggleJustify} />
              <TB icon="→"  label={fr ? "Alinéa" : "Indent"} onClick={applyIndent} />
            </div>
          </div>

          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono px-0.5">pages</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="⊟"  label={fr ? "Saut de page" : "Page break"} onClick={insertPageBreak} />
              <TB icon="📑" label={fr ? "Table matières" : "TOC"} onClick={insertTOC} />
            </div>
          </div>

          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono px-0.5">police</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="A-" label={fr ? "Réduire" : "Smaller"} onClick={() => setFontSize(v => Math.max(10, v - 1))} />
              <TB icon="A+" label={fr ? "Agrandir" : "Larger"}  onClick={() => setFontSize(v => Math.min(24, v + 1))} />
            </div>
            <div className="text-center font-mono text-[9px] text-zinc-500 mt-0.5">{fontSize}px</div>
          </div>

          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono px-0.5">media</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="🖼️" label={fr ? "Image" : "Image"} onClick={insertImage} />
              <TB icon="📥" label={fr ? "Import" : "Import"} onClick={() => fileInputRef.current?.click()} />
            </div>
          </div>

          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono px-0.5">livre</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="⚙️" label={fr ? "Paramètres" : "Settings"} active={showSettings} onClick={() => setShowSettings(v => !v)} />
              <TB icon="+"  label={fr ? "Nouveau chapitre" : "New chapter"} onClick={addChapter} />
            </div>
          </div>

          <div className="px-2 py-1.5">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono px-0.5">presets</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="📖" label={fr ? "Livre imprimé" : "Print book"} onClick={() => triggerPreset("print")} />
              <TB icon="📱" label="Kindle" onClick={() => triggerPreset("kindle")} />
            </div>
          </div>
        </div>

        {/* EDITOR ZONE */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">

          {/* Topbar */}
          <div className="h-9 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center px-3 gap-2">
            <button onClick={() => setIsPreview(false)}
              className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${!isPreview ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>
              ✏️ {fr ? "Éditer" : "Edit"}
            </button>
            <button onClick={() => setIsPreview(true)}
              className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${isPreview ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>
              👁️ {fr ? "Aperçu" : "Preview"}
            </button>

            {/* Chapter tabs */}
            <div className="flex-1 flex items-center gap-1 overflow-x-auto mx-1" style={{scrollbarWidth:"none"}}>
              {chapters.map(ch => (
                <button key={ch.id} onClick={() => setActiveChapter(ch.id)}
                  className={`text-[9px] px-2 py-0.5 rounded border whitespace-nowrap transition-all ${activeChapter === ch.id ? "border-zinc-600 text-zinc-200 bg-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>
                  {ch.title}
                </button>
              ))}
            </div>

            {/* Save */}
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${saveLabel.dot}`} />
              <span className="text-[9px] font-mono text-zinc-400">{saveLabel.text}</span>
            </div>
            <button onClick={saveManuscript}
              className="text-[9px] px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:border-cyan-500/40 hover:text-cyan-400 transition-all font-mono">
              💾 {fr ? "Sauv." : "Save"}
            </button>

            {/* Exports */}
            {(["docx","pdf","epub"] as const).map(fmt => (
              <button key={fmt} onClick={() => handleExport(fmt)}
                className="text-[9px] px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:border-cyan-500/40 hover:text-cyan-400 transition-all uppercase font-mono">
                {fmt}
              </button>
            ))}

            {/* Settings gear */}
            <div className="relative ml-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => setIsSettingsOpen(v => !v)}
                className="text-[10px] px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all">
                ⚙️ <span className="font-mono text-[8px] bg-cyan-500/15 text-cyan-500 px-1 rounded uppercase ml-0.5">{fr ? "FR" : "EN"}</span>
              </button>
              {isSettingsOpen && (
                <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xl p-2 flex flex-col gap-1 z-50">
                  <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-400 px-2 py-1 border-b border-zinc-100 dark:border-zinc-900">
                    {fr ? "Configuration" : "Settings"}
                  </div>
                  <button onClick={toggleTheme}
                    className="text-left px-2 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors">
                    {theme === "dark" ? "☀️ Mode Clair" : "🌙 Mode Sombre"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Book settings panel */}
          {showSettings && (
            <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/80 px-4 py-2 flex flex-wrap gap-x-5 gap-y-2 items-center text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 font-mono uppercase text-[9px] mr-1">Format</span>
                {BOOK_FORMATS.map(f => (
                  <button key={f.id} onClick={() => setBookFormat(f.id)}
                    className={`px-2 py-0.5 rounded border transition-all ${bookFormat === f.id ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                    {f.label}
                  </button>
                ))}
              </div>

              {[
                { label: fr ? "Miroir" : "Mirror",    val: mirrorMargins,   set: setMirrorMargins },
                { label: fr ? "N° pages" : "Page #",  val: showPageNumbers, set: setShowPageNumbers },
                { label: "Header", val: showHeader, set: setShowHeader },
                { label: "Footer", val: showFooter, set: setShowFooter },
                { label: fr ? "Justifié" : "Justify", val: isJustified,     set: setIsJustified },
              ].map(({ label, val, set }) => (
                <label key={label} className="flex items-center gap-1.5 cursor-pointer">
                  <span className="text-zinc-400">{label}</span>
                  <Toggle val={val} set={set} />
                </label>
              ))}

              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">{fr ? "Interligne" : "Line-h"}</span>
                <input type="range" min="1.2" max="2.4" step="0.05" value={lineHeight}
                  onChange={e => setLineHeight(parseFloat(e.target.value))}
                  className="w-16 accent-cyan-400 h-1" />
                <span className="font-mono text-zinc-400 text-[9px] w-7">{lineHeight.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">{fr ? "Para" : "Para"}</span>
                <input type="range" min="0.2" max="2" step="0.05" value={paraSpacing}
                  onChange={e => setParaSpacing(parseFloat(e.target.value))}
                  className="w-12 accent-cyan-400 h-1" />
                <span className="font-mono text-zinc-400 text-[9px] w-7">{paraSpacing.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">{fr ? "Police" : "Font"}</span>
                <select value={fontFamily} onChange={e => setFontFamily(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-[9px] rounded px-1 py-0.5">
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="Garamond, serif">Garamond</option>
                  <option value="system-ui, sans-serif">Sans-serif</option>
                </select>
              </div>

              <button onClick={() => setShowSettings(false)}
                className="ml-auto text-zinc-500 hover:text-zinc-200 text-base">✕</button>
            </div>
          )}

          {/* Editor scroll area */}
          <div className="flex-1 overflow-y-auto min-h-0 bg-zinc-100 dark:bg-zinc-900 flex justify-center px-6 py-8 relative"
            style={{scrollbarWidth:"thin", scrollbarColor:"rgba(6,182,212,0.2) transparent"}}>

            {/* Water decoration */}
            {WATER.map((d, i) => (
              <span key={i} aria-hidden="true" className="absolute pointer-events-none select-none"
                style={{ top:d.top, left:d.left, right:d.right, fontSize:d.sz,
                  transform:`rotate(${d.rot})`, opacity:0.055, filter:"blur(1.2px)",
                  color:"#06b6d4", lineHeight:1, zIndex:0 }}>
                {d.g}
              </span>
            ))}

            {/* Page sheet */}
            <div className="w-full bg-white dark:bg-zinc-950 shadow-md border border-zinc-200 dark:border-zinc-800 rounded-sm relative z-10"
              style={{
                maxWidth: pageMaxW,
                minHeight: "calc(100% - 2rem)",
                paddingTop: showHeader ? 0 : "48px",
                paddingBottom: showFooter ? 0 : "56px",
                paddingLeft: mirrorMargins ? "68px" : "48px",
                paddingRight: "48px",
              }}>

              {/* Margin line */}
              <div className="absolute left-9 top-0 bottom-0 w-px pointer-events-none" style={{background:"rgba(6,182,212,0.07)"}} />

              {/* Header */}
              {showHeader && (
                <div className="h-9 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-3 mb-4">
                  <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-400">{bookTitle}</span>
                </div>
              )}

              {/* Book title */}
              {isEditingTitle ? (
                <input ref={titleInputRef} value={bookTitle}
                  onChange={e => setBookTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={e => { if (e.key === "Enter") setIsEditingTitle(false); }}
                  className="w-full text-xl font-bold bg-transparent border-b border-cyan-500/40 outline-none text-black dark:text-white mb-5 pb-1"
                  autoFocus />
              ) : (
                <h1 onDoubleClick={() => { setIsEditingTitle(true); setTimeout(() => titleInputRef.current?.focus(), 50); }}
                  title={fr ? "Double-cliquer pour modifier" : "Double-click to edit"}
                  className="text-xl font-bold text-black dark:text-white mb-5 cursor-text pb-1 border-b border-transparent hover:border-cyan-500/12 transition-colors">
                  {bookTitle}
                </h1>
              )}

              {/* Chapter label */}
              <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500 mb-2 font-mono">
                {chapters.find(c => c.id === activeChapter)?.title}
              </div>

              {/* Content */}
              {!isPreview ? (
                <div ref={editorRef} contentEditable suppressContentEditableWarning
                  onInput={handleEditorInput}
                  data-placeholder={fr ? "Commencez à écrire votre histoire..." : "Start writing your story..."}
                  className="outline-none min-h-[360px] text-black dark:text-zinc-100 caret-cyan-400 books-editor"
                  style={{ fontSize:`${fontSize}px`, fontFamily, lineHeight, textAlign: isJustified ? "justify" : "left" }}
                />
              ) : (
                <div className="min-h-[360px] text-black dark:text-zinc-100 books-preview"
                  style={{ fontSize:`${fontSize}px`, fontFamily, lineHeight }}
                  dangerouslySetInnerHTML={{
                    __html: chapters.find(c => c.id === activeChapter)?.content
                      || `<p style="color:rgba(113,113,122,0.4);font-style:italic">${fr ? "Aucun contenu." : "No content yet."}</p>`,
                  }}
                />
              )}

              {/* Page number */}
              {showPageNumbers && (
                <div className="absolute bottom-4 left-0 right-0 text-center text-[9px] text-zinc-400 font-mono pointer-events-none">
                  — {chapters.findIndex(c => c.id === activeChapter) + 1} —
                </div>
              )}

              {/* Footer */}
              {showFooter && (
                <div className="h-7 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-center mt-6">
                  <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-400">{bookTitle}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ECHO PANEL */}
        <aside className="w-60 shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col overflow-hidden">

          <div className="h-9 shrink-0 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-3 gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-zinc-300">
              Echo — {fr ? "Écriture" : "Writing"}
            </span>
          </div>

          {/* Modes */}
          <div className="flex gap-1 p-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            {ECHO_MODES.map(m => (
              <button key={m.id} onClick={() => setEchoMode(m.id)}
                className={`flex-1 text-[9px] py-1 rounded-lg border transition-all text-center ${echoMode === m.id ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" : "border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"}`}>
                {m.emoji} {fr ? m.labelFr : m.labelEn}
              </button>
            ))}
          </div>

          {/* Quotas */}
          <div className="px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800 shrink-0 flex gap-5">
            <div>
              <div className="text-[8px] text-zinc-500 font-mono uppercase">{fr ? "Contexte" : "Context"}</div>
              <div className="text-[9px] text-zinc-400 font-mono">0k / 32k</div>
            </div>
            <div>
              <div className="text-[8px] text-zinc-500 font-mono uppercase">{fr ? "Messages" : "Messages"}</div>
              <div className="text-[9px] text-zinc-400 font-mono">{echoMsgCount} / 200</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2 min-h-0" style={{scrollbarWidth:"thin"}}>
            {echoMessages.length === 0 && (
              <div className="text-[10px] text-zinc-500 text-center mt-4 italic leading-relaxed px-2">
                {fr
                  ? "Demande à Echo d'améliorer un paragraphe, suggérer une tournure, critiquer un passage..."
                  : "Ask Echo to improve a paragraph, suggest a phrase, critique a passage..."}
              </div>
            )}
            {echoMessages.map((msg, i) => (
              <div key={i} className={`text-[10px] leading-relaxed rounded-xl px-2.5 py-1.5 ${
                msg.role === "user"
                  ? "self-end bg-cyan-500/10 border border-cyan-500/20 text-zinc-200 rounded-br-sm max-w-[88%]"
                  : "self-start bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-bl-sm max-w-[92%]"
              }`}>
                {msg.text}
              </div>
            ))}
            {echoThinking && (
              <div className="self-start text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl rounded-bl-sm px-2.5 py-1.5">
                ...
              </div>
            )}
            <div ref={echoBottomRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 flex gap-1.5 shrink-0">
            <textarea value={echoInput} onChange={e => setEchoInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendEcho(); } }}
              rows={2} placeholder={fr ? "Demande à Echo..." : "Ask Echo..."}
              className="flex-1 resize-none bg-zinc-900 border border-zinc-800 text-zinc-200 text-[10px] rounded-lg px-2 py-1.5 placeholder-zinc-600 outline-none focus:border-cyan-700/40 leading-relaxed"
            />
            <button onClick={sendEcho} disabled={echoThinking}
              className="w-7 self-end bg-cyan-600/15 border border-cyan-500/25 hover:bg-cyan-600/25 disabled:opacity-30 text-cyan-400 rounded-lg text-xs flex items-center justify-center transition-all h-7 shrink-0">
              ➤
            </button>
          </div>
        </aside>
      </div>

      {/* Hidden inputs */}
      <input ref={fileInputRef} type="file" accept=".txt,.md,.markdown" onChange={handleImportFile} className="hidden" />
      <input ref={imgInputRef}  type="file" accept="image/*" onChange={handleImgFile} className="hidden" />

      {/* Overlay close settings */}
      {isSettingsOpen && <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />}

      {/* Styles */}
      <style>{`
        .books-editor:empty:before {
          content: attr(data-placeholder);
          color: rgba(113,113,122,0.4);
          pointer-events: none;
          font-style: italic;
        }
        .books-editor h1, .books-preview h1 {
          font-size: 1.55em; font-weight: 700;
          margin: 0.5em 0 0.3em;
          border-bottom: 1px solid rgba(6,182,212,0.12);
          padding-bottom: 0.12em;
        }
        .books-editor h2, .books-preview h2 {
          font-size: 1.2em; font-weight: 600;
          margin: 0.9em 0 0.2em;
          text-transform: uppercase; letter-spacing: 0.07em;
          color: rgb(6,182,212);
        }
        .books-editor h3, .books-preview h3 {
          font-size: 1.05em; font-weight: 600;
          margin: 0.7em 0 0.15em;
          color: rgba(6,182,212,0.65);
        }
        .books-editor p, .books-preview p { margin-bottom: ${paraSpacing}em; }
        .books-editor img, .books-preview img { max-width: 100%; border-radius: 3px; margin: 0.5em 0; }
      `}</style>
    </main>
  );
}