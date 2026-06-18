"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useApp } from "../../context/AppContext";

// ── TYPES ──────────────────────────────────────────────────────────────────────
type EchoMode = "creative" | "ideas" | "critical" | "neutral";
type BookFormat = "a5" | "6x9" | "custom";

type BookMessage = {
  role: "user" | "echo";
  text: string;
};

type Chapter = {
  id: string;
  title: string;
  content: string;
};

// ── WATER DECORATION ───────────────────────────────────────────────────────────
// Petits SVG transparents en PNG-like base64 simulant des vagues d'eau plate
const WATER_GLYPHS = ["〰", "〜", "∿", "≈", "∾", "〰", "〜"];

// ── ECHO MODES CONFIG ──────────────────────────────────────────────────────────
const ECHO_MODES: { id: EchoMode; label: string; labelFr: string; emoji: string }[] = [
  { id: "creative", label: "Creative", labelFr: "Créatif", emoji: "✍️" },
  { id: "ideas",    label: "Ideas",    labelFr: "Idées",   emoji: "💡" },
  { id: "critical", label: "Critical", labelFr: "Critique", emoji: "🔍" },
  { id: "neutral",  label: "Neutral",  labelFr: "Neutre",  emoji: "🌐" },
];

// ── BOOK FORMATS ───────────────────────────────────────────────────────────────
const BOOK_FORMATS: { id: BookFormat; label: string; width: string; desc: string }[] = [
  { id: "a5",     label: "A5",      width: "max-w-[480px]", desc: "148 × 210 mm" },
  { id: "6x9",   label: "6 × 9",   width: "max-w-[540px]", desc: "15.2 × 22.8 cm" },
  { id: "custom", label: "Custom",  width: "max-w-[600px]", desc: "Personnalisé" },
];

// ── MOCK EXPORT FUNCTION ────────────────────────────────────────────────────────
const triggerExport = (format: "pdf" | "epub" | "docx", title: string) => {
  alert(`Export ${format.toUpperCase()} — "${title}" (fonctionnalité à brancher sur le backend)`);
};

// ───────────────────────────────────────────────────────────────────────────────
export default function BooksPage() {
  const { t, lang, theme, toggleTheme } = useApp();

  // ── EDITOR STATE ──────────────────────────────────────────────────────────────
  const [chapters, setChapters] = useState<Chapter[]>([
    { id: "ch1", title: "Chapitre 1", content: "" },
  ]);
  const [activeChapter, setActiveChapter] = useState("ch1");
  const [bookTitle, setBookTitle] = useState(
    lang === "fr" ? "Mon Premier Livre" : "My First Book"
  );
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // ── TOOLBAR STATE ─────────────────────────────────────────────────────────────
  const [activeFormat, setActiveFormat] = useState<string>("p");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isJustified, setIsJustified] = useState(true);

  // ── BOOK SETTINGS ─────────────────────────────────────────────────────────────
  const [bookFormat, setBookFormat] = useState<BookFormat>("a5");
  const [showSettings, setShowSettings] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [mirrorMargins, setMirrorMargins] = useState(false);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [showHeader, setShowHeader] = useState(false);
  const [showFooter, setShowFooter] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState("Georgia, serif");
  const [lineHeight, setLineHeight] = useState(1.85);

  // ── SCROLL BAR POSITION ────────────────────────────────────────────────────────
  // "left" = scrollbar à gauche de l'éditeur, "right" = à droite (défaut)
  const [scrollbarSide, setScrollbarSide] = useState<"left" | "right">("right");

  // ── PREVIEW MODE ──────────────────────────────────────────────────────────────
  const [isPreview, setIsPreview] = useState(false);

  // ── ECHO PANEL ────────────────────────────────────────────────────────────────
  const [echoMode, setEchoMode] = useState<EchoMode>("creative");
  const [echoMessages, setEchoMessages] = useState<BookMessage[]>([]);
  const [echoInput, setEchoInput] = useState("");
  const [echoThinking, setEchoThinking] = useState(false);
  const echoBottomRef = useRef<HTMLDivElement>(null);

  // ── SETTINGS PANEL STATE ──────────────────────────────────────────────────────
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ── WATER DECORATION POSITIONS (stables, calculées une seule fois) ────────────
  const waterDecos = useRef(
    WATER_GLYPHS.map((g, i) => ({
      glyph: g,
      top: `${8 + i * 12}%`,
      left: i % 2 === 0 ? `${4 + i * 3}%` : undefined,
      right: i % 2 !== 0 ? `${2 + i * 2}%` : undefined,
      rotate: `${-20 + i * 8}deg`,
      fontSize: `${50 + i * 15}px`,
    }))
  ).current;

  // ── SYNC CHAPTER CONTENT ──────────────────────────────────────────────────────
  const handleEditorInput = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    setChapters((prev) =>
      prev.map((c) => (c.id === activeChapter ? { ...c, content: html } : c))
    );
  }, [activeChapter]);

  useEffect(() => {
    if (!editorRef.current) return;
    const current = chapters.find((c) => c.id === activeChapter);
    if (current && editorRef.current.innerHTML !== current.content) {
      editorRef.current.innerHTML = current.content;
    }
  }, [activeChapter]);

  // ── TOOLBAR COMMANDS ──────────────────────────────────────────────────────────
  const execCmd = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  const applyBlock = (tag: string) => {
    execCmd("formatBlock", tag);
    setActiveFormat(tag);
  };

  const toggleBold = () => { execCmd("bold"); setIsBold((v) => !v); };
  const toggleItalic = () => { execCmd("italic"); setIsItalic((v) => !v); };
  const applyJustify = () => { execCmd("justifyFull"); setIsJustified(true); };
  const applyIndent = () => execCmd("indent");
  const insertPageBreak = () => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, '<div class="page-break" style="border-top:2px dashed rgba(6,182,212,0.3);margin:2rem 0;text-align:center;font-size:10px;color:rgba(6,182,212,0.5);letter-spacing:0.2em;">— SAUT DE PAGE —</div>');
  };
  const insertTOC = () => {
    const tocLines = chapters.map((c, i) => `<div style="display:flex;justify-content:space-between;border-bottom:1px dotted rgba(100,100,100,0.3);padding:3px 0;font-size:12px;">${c.title}<span>${i + 1}</span></div>`).join("");
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, `<div style="border:1px dashed rgba(6,182,212,0.2);padding:12px;border-radius:4px;margin:16px 0;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.5;margin-bottom:8px;">Table des matières</div>${tocLines}</div>`);
  };

  const insertImage = () => {
    const url = prompt(lang === "fr" ? "URL de l'image :" : "Image URL:");
    if (url) execCmd("insertImage", url);
  };

  const addChapter = () => {
    const newId = `ch${Date.now()}`;
    const num = chapters.length + 1;
    const newChapter: Chapter = {
      id: newId,
      title: lang === "fr" ? `Chapitre ${num}` : `Chapter ${num}`,
      content: "",
    };
    setChapters((prev) => [...prev, newChapter]);
    setActiveChapter(newId);
  };

  // ── ECHO SEND ─────────────────────────────────────────────────────────────────
  const sendEchoMessage = async () => {
    if (!echoInput.trim()) return;
    const userMsg = echoInput.trim();
    setEchoInput("");
    setEchoMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setEchoThinking(true);

    const currentText = editorRef.current?.innerText?.slice(0, 500) || "";

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const modeInstructions: Record<EchoMode, string> = {
        creative: lang === "fr"
          ? "Tu es en mode Créatif. Tu aides l'auteur avec imagination, métaphores et suggestions stylistiques originales. Tu proposes des formulations poétiques et inattendues."
          : "You are in Creative mode. Help the author with imagination, metaphors and original stylistic suggestions. Propose poetic and unexpected formulations.",
        ideas: lang === "fr"
          ? "Tu es en mode Idées. Tu génères des pistes narratives, des rebondissements, des personnages ou des thèmes à explorer pour enrichir l'œuvre."
          : "You are in Ideas mode. Generate narrative directions, plot twists, characters or themes to explore to enrich the work.",
        critical: lang === "fr"
          ? "Tu es en mode Critique. Tu analyses le texte avec rigueur : rythme, cohérence, clarté, redondances. Tu signales ce qui affaiblit le propos."
          : "You are in Critical mode. Analyze the text rigorously: rhythm, coherence, clarity, redundancies. Point out what weakens the argument.",
        neutral: lang === "fr"
          ? "Tu es en mode Neutre. Tu réponds factuellement aux questions sur l'écriture sans style particulier imposé."
          : "You are in Neutral mode. Answer factually about writing without imposing any particular style.",
      };

      const systemPrompt = `${modeInstructions[echoMode]}\n\nContexte du livre : Titre = "${bookTitle}". Voici un extrait du texte actuel :\n"${currentText}"`;

      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: [],
          systemOverride: systemPrompt,
        }),
      });
      const data = await response.json();
      const reply = data.response || (typeof data === "string" ? data : "...");
      setEchoMessages((prev) => [...prev, { role: "echo", text: reply }]);
    } catch {
      setEchoMessages((prev) => [...prev, {
        role: "echo",
        text: lang === "fr"
          ? "Je ne peux pas me connecter au serveur pour le moment."
          : "Cannot connect to the server right now.",
      }]);
    } finally {
      setEchoThinking(false);
    }
  };

  useEffect(() => {
    echoBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [echoMessages, echoThinking]);

  // ── BOOK FORMAT WIDTH ─────────────────────────────────────────────────────────
  const formatWidth = BOOK_FORMATS.find((f) => f.id === bookFormat)?.width || "max-w-[480px]";

  // ── TOOLBAR BUTTON HELPER ──────────────────────────────────────────────────────
  const ToolBtn = ({
    icon, label, active, onClick, className = "",
  }: {
    icon: string; label: string; active?: boolean; onClick: () => void; className?: string;
  }) => (
    <button
      onClick={onClick}
      title={label}
      className={`
        group relative w-9 h-8 flex items-center justify-center rounded-lg
        text-sm transition-all duration-150 border
        ${active
          ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400"
          : "bg-transparent border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 hover:border-zinc-700"
        }
        ${className}
      `}
    >
      <span className="text-[15px]">{icon}</span>
      <span className="
        pointer-events-none absolute left-10 top-1/2 -translate-y-1/2
        bg-zinc-900 dark:bg-zinc-950 text-white text-[10px]
        px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100
        border border-zinc-700 z-50 transition-opacity duration-100
        shadow-lg
      ">
        {label}
      </span>
    </button>
  );

  // ── RENDER ─────────────────────────────────────────────────────────────────────
  return (
    <main className="h-screen bg-white dark:bg-black text-black dark:text-white flex overflow-hidden relative font-sans transition-colors duration-200 selection:bg-cyan-500/30">

      {/* ── NAV SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className="w-55 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-8 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between">
        <div className="space-y-20">
          <h2 className="font-bold text-lg">
            <Link href="/" className="text-cyan-600 dark:text-cyan-400 font-bold">
              {lang === "fr" ? "🏠 Accueil" : "🏠 Home"}
            </Link>
          </h2>
          <div className="space-y-20 text-zinc-800 dark:text-zinc-100 font-medium">
            <Link href="/chat" className="block hover:text-cyan-500">💬 {lang === "fr" ? "Chat" : "Chat"}</Link>
            <Link href="/books" className="block text-cyan-500 font-bold">📚 {lang === "fr" ? "Livres" : "Books"}</Link>
            <Link href="/calendar" className="block hover:text-cyan-500">📅 {lang === "fr" ? "Calendrier" : "Calendar"}</Link>
            <Link href="/vitality" className="block hover:text-cyan-500">📈 {lang === "fr" ? "Vitalité" : "Vitality"}</Link>
            <Link href="/services" className="block hover:text-cyan-500">💎 {lang === "fr" ? "Services" : "Services"}</Link>
            <Link href="/account" className="block hover:text-cyan-500">👤 {lang === "fr" ? "Compte" : "Account"}</Link>
            <hr className="border-zinc-200 dark:border-zinc-800 my-4" />
            <Link href="/history" className="block hover:text-amber-500">⭐ {lang === "fr" ? "Historique" : "History"}</Link>
          </div>
        </div>
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
          {lang === "fr" ? "Mode" : "Mode"} : <span className="text-cyan-500 dark:text-cyan-400 uppercase font-bold block">books</span>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── TOOLBAR VERTICAL ────────────────────────────────────────────── */}
        <div className="w-12 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center py-2 overflow-y-auto scrollbar-none">

          {/* Structure */}
          <div className="w-full flex flex-col items-center py-2 border-b border-zinc-200 dark:border-zinc-800 gap-0.5">
            <span className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">struct</span>
            <ToolBtn icon="T" label={lang === "fr" ? "Titre" : "Title"} active={activeFormat === "h1"} onClick={() => applyBlock("h1")} />
            <ToolBtn icon="🔖" label={lang === "fr" ? "Chapitre" : "Chapter"} active={activeFormat === "h2"} onClick={() => applyBlock("h2")} />
            <ToolBtn icon="¶" label={lang === "fr" ? "Texte normal" : "Normal text"} active={activeFormat === "p"} onClick={() => applyBlock("p")} />
          </div>

          {/* Texte */}
          <div className="w-full flex flex-col items-center py-2 border-b border-zinc-200 dark:border-zinc-800 gap-0.5">
            <span className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">texte</span>
            <ToolBtn icon="B" label={lang === "fr" ? "Gras" : "Bold"} active={isBold} onClick={toggleBold} className="font-bold" />
            <ToolBtn icon="I" label={lang === "fr" ? "Italique" : "Italic"} active={isItalic} onClick={toggleItalic} className="italic" />
            <ToolBtn icon="≡" label={lang === "fr" ? "Justifié" : "Justified"} active={isJustified} onClick={applyJustify} />
            <ToolBtn icon="→" label={lang === "fr" ? "Alinéa" : "Indent"} onClick={applyIndent} />
          </div>

          {/* Pages */}
          <div className="w-full flex flex-col items-center py-2 border-b border-zinc-200 dark:border-zinc-800 gap-0.5">
            <span className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">pages</span>
            <ToolBtn icon="⊟" label={lang === "fr" ? "Saut de page" : "Page break"} onClick={insertPageBreak} />
            <ToolBtn icon="📑" label={lang === "fr" ? "Table des matières" : "Table of contents"} onClick={insertTOC} />
          </div>

          {/* Police */}
          <div className="w-full flex flex-col items-center py-2 border-b border-zinc-200 dark:border-zinc-800 gap-0.5">
            <span className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">police</span>
            <button
              title={lang === "fr" ? "Réduire la taille" : "Decrease size"}
              onClick={() => setFontSize((v) => Math.max(10, v - 1))}
              className="w-9 h-8 flex items-center justify-center rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-all border border-transparent hover:border-zinc-700"
            >A-</button>
            <span className="text-[9px] font-mono text-zinc-500">{fontSize}</span>
            <button
              title={lang === "fr" ? "Augmenter la taille" : "Increase size"}
              onClick={() => setFontSize((v) => Math.min(24, v + 1))}
              className="w-9 h-8 flex items-center justify-center rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-all border border-transparent hover:border-zinc-700"
            >A+</button>
          </div>

          {/* Image */}
          <div className="w-full flex flex-col items-center py-2 border-b border-zinc-200 dark:border-zinc-800 gap-0.5">
            <span className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">image</span>
            <ToolBtn icon="🖼️" label={lang === "fr" ? "Insérer une image" : "Insert image"} onClick={insertImage} />
          </div>

          {/* Livre */}
          <div className="w-full flex flex-col items-center py-2 gap-0.5">
            <span className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">livre</span>
            <ToolBtn icon="📖" label={lang === "fr" ? "Format livre" : "Book format"} onClick={() => setShowSettings(!showSettings)} />
            <ToolBtn icon="+" label={lang === "fr" ? "Nouveau chapitre" : "New chapter"} onClick={addChapter} />
          </div>
        </div>

        {/* ── EDITOR ZONE ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">

          {/* Topbar */}
          <div className="h-9 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center px-3 gap-2">

            {/* Mode tabs */}
            <button
              onClick={() => setIsPreview(false)}
              className={`text-[11px] px-3 py-1 rounded-lg border transition-all ${!isPreview ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "border-transparent text-zinc-400 hover:text-zinc-200"}`}
            >
              ✏️ {lang === "fr" ? "Éditer" : "Edit"}
            </button>
            <button
              onClick={() => setIsPreview(true)}
              className={`text-[11px] px-3 py-1 rounded-lg border transition-all ${isPreview ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "border-transparent text-zinc-400 hover:text-zinc-200"}`}
            >
              👁️ {lang === "fr" ? "Prévisualisation" : "Preview"}
            </button>

            {/* Chapter tabs */}
            <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-none px-2">
              {chapters.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setActiveChapter(ch.id)}
                  className={`text-[10px] px-2 py-1 rounded-md border whitespace-nowrap transition-all ${activeChapter === ch.id ? "border-zinc-600 text-zinc-200 bg-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
                >
                  {ch.title}
                </button>
              ))}
            </div>

            {/* Scrollbar side toggle */}
            <button
              onClick={() => setScrollbarSide((s) => s === "right" ? "left" : "right")}
              title={lang === "fr" ? "Déplacer la scrollbar" : "Move scrollbar"}
              className="text-[10px] px-2 py-1 rounded-md border border-zinc-700 text-zinc-500 hover:text-cyan-400 hover:border-cyan-500/40 transition-all font-mono"
            >
              {scrollbarSide === "right" ? "⟵" : "⟶"}
            </button>

            {/* Exports */}
            <div className="flex gap-1 ml-1">
              {(["docx", "pdf", "epub"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => triggerExport(fmt === "docx" ? "docx" : fmt, bookTitle)}
                  className="text-[10px] px-2 py-1 rounded-md border border-zinc-700 text-zinc-400 hover:border-cyan-500/40 hover:text-cyan-400 transition-all uppercase font-mono"
                >
                  {fmt}
                </button>
              ))}
            </div>

            {/* Settings toggle */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="text-[11px] px-2 py-1 rounded-md border border-zinc-700 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-all ml-1"
                title={lang === "fr" ? "Paramètres" : "Settings"}
              >
                ⚙️ <span className="font-mono text-[9px] bg-cyan-500/15 text-cyan-500 px-1 rounded uppercase ml-0.5">
                  {lang === "fr" ? "FR" : "EN"}
                </span>
              </button>

              {isSettingsOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-3 flex flex-col gap-2 z-50 animate-in slide-in-from-top-2 duration-200">
                  <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-widest text-zinc-400 border-b border-zinc-100 dark:border-zinc-900">
                    {lang === "fr" ? "Configuration" : "Settings"}
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="w-full text-left px-2 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-colors"
                  >
                    {theme === "dark" ? "☀️ Mode Clair" : "🌙 Mode Sombre"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── BOOK SETTINGS PANEL ─────────────────────────────────────── */}
          {showSettings && (
            <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 flex flex-wrap gap-6 items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-mono uppercase text-[10px]">Format</span>
                <div className="flex gap-1">
                  {BOOK_FORMATS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setBookFormat(f.id)}
                      title={f.desc}
                      className={`px-2 py-1 rounded-md border text-[10px] transition-all ${bookFormat === f.id ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {[
                { label: lang === "fr" ? "Marges miroir" : "Mirror margins", val: mirrorMargins, set: setMirrorMargins },
                { label: lang === "fr" ? "Numéros" : "Page numbers", val: showPageNumbers, set: setShowPageNumbers },
                { label: "Header", val: showHeader, set: setShowHeader },
                { label: "Footer", val: showFooter, set: setShowFooter },
              ].map(({ label, val, set }) => (
                <label key={label} className="flex items-center gap-2 cursor-pointer">
                  <span className="text-zinc-400">{label}</span>
                  <button
                    onClick={() => set(!val)}
                    className={`w-8 h-4 rounded-full border transition-all relative ${val ? "bg-cyan-500/30 border-cyan-500/50" : "bg-zinc-800 border-zinc-700"}`}
                  >
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${val ? "left-4 bg-cyan-400" : "left-0.5 bg-zinc-500"}`} />
                  </button>
                </label>
              ))}
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">{lang === "fr" ? "Interligne" : "Line height"}</span>
                <input type="range" min="1.2" max="2.4" step="0.05" value={lineHeight}
                  onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                  className="w-20 accent-cyan-400" />
                <span className="font-mono text-zinc-400 text-[10px]">{lineHeight.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">{lang === "fr" ? "Police" : "Font"}</span>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-[10px] rounded-md px-1 py-0.5"
                >
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="Garamond, serif">Garamond</option>
                  <option value="var(--font-sans), sans-serif">Sans-serif</option>
                </select>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="ml-auto text-zinc-500 hover:text-zinc-200 text-lg leading-none"
              >✕</button>
            </div>
          )}

          {/* ── EDITOR SCROLL AREA ─────────────────────────────────────── */}
          <div
            className={`flex-1 overflow-y-auto min-h-0 bg-zinc-100 dark:bg-zinc-900 flex justify-center p-8 relative ${scrollbarSide === "left" ? "direction-rtl" : ""}`}
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(6,182,212,0.3) transparent" }}
          >
            {/* ── WATER DECORATION ────────────────────────────────────── */}
            {waterDecos.map((d, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="absolute pointer-events-none select-none"
                style={{
                  top: d.top,
                  left: d.left,
                  right: d.right,
                  fontSize: d.fontSize,
                  transform: `rotate(${d.rotate})`,
                  opacity: 0.045,
                  filter: "blur(1px)",
                  color: "var(--color-text-secondary, #6b7280)",
                  lineHeight: 1,
                }}
              >
                {d.glyph}
              </span>
            ))}

            {/* ── BOOK PAGE SHEET ─────────────────────────────────────── */}
            <div
              className={`direction-ltr w-full ${formatWidth} bg-white dark:bg-zinc-950 shadow-lg border border-zinc-200 dark:border-zinc-800 rounded-sm relative`}
              style={{
                paddingTop: showHeader ? 0 : "52px",
                paddingBottom: showFooter ? 0 : "60px",
                paddingLeft: mirrorMargins ? "72px" : "52px",
                paddingRight: "52px",
                minHeight: "100%",
              }}
            >
              {/* Marge cyan gauche décorative */}
              <div className="absolute left-10 top-0 bottom-0 w-px bg-cyan-500/10 pointer-events-none" />

              {/* Header optionnel */}
              {showHeader && (
                <div className="h-10 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-3 text-[10px] text-zinc-400 font-mono tracking-widest uppercase mb-4">
                  {bookTitle}
                </div>
              )}

              {/* Titre du livre (éditable) */}
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => { if (e.key === "Enter") setIsEditingTitle(false); }}
                  className="w-full text-2xl font-bold bg-transparent border-b border-cyan-500/40 outline-none text-black dark:text-white mb-6 pb-1"
                  autoFocus
                />
              ) : (
                <h1
                  onDoubleClick={() => { setIsEditingTitle(true); setTimeout(() => titleInputRef.current?.focus(), 0); }}
                  className="text-2xl font-bold text-black dark:text-white mb-6 cursor-text select-text border-b border-transparent hover:border-cyan-500/20 pb-1 transition-colors"
                  title={lang === "fr" ? "Double-cliquer pour modifier" : "Double-click to edit"}
                >
                  {bookTitle}
                </h1>
              )}

              {/* Chapter label */}
              <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500 mb-2 font-mono">
                {chapters.find((c) => c.id === activeChapter)?.title}
              </div>

              {/* Éditeur contentEditable */}
              {!isPreview ? (
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleEditorInput}
                  className="outline-none min-h-[400px] text-black dark:text-zinc-200 focus:outline-none"
                  style={{
                    fontSize: `${fontSize}px`,
                    fontFamily,
                    lineHeight,
                    textAlign: isJustified ? "justify" : "left",
                  }}
                  data-placeholder={lang === "fr" ? "Commencez à écrire votre histoire..." : "Start writing your story..."}
                />
              ) : (
                <div
                  className="min-h-[400px] text-black dark:text-zinc-200 prose prose-zinc dark:prose-invert max-w-none"
                  style={{ fontSize: `${fontSize}px`, fontFamily, lineHeight }}
                  dangerouslySetInnerHTML={{
                    __html: chapters.find((c) => c.id === activeChapter)?.content || `<p class="text-zinc-400">${lang === "fr" ? "Aucun contenu pour l'instant." : "No content yet."}</p>`,
                  }}
                />
              )}

              {/* Page number */}
              {showPageNumbers && (
                <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-zinc-400 font-mono pointer-events-none">
                  — {chapters.findIndex((c) => c.id === activeChapter) + 1} —
                </div>
              )}

              {/* Footer optionnel */}
              {showFooter && (
                <div className="h-8 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 font-mono mt-6">
                  {bookTitle}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── ECHO PANEL ──────────────────────────────────────────────────── */}
        <aside className="w-64 shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col overflow-hidden">

          {/* Echo header */}
          <div className="h-9 shrink-0 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-3 gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-zinc-300">
              Echo — {lang === "fr" ? "Écriture" : "Writing"}
            </span>
          </div>

          {/* Mode chips */}
          <div className="flex flex-wrap gap-1.5 p-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            {ECHO_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setEchoMode(m.id)}
                className={`text-[10px] px-2 py-1 rounded-full border transition-all ${echoMode === m.id ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" : "border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"}`}
              >
                {m.emoji} {lang === "fr" ? m.labelFr : m.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0" style={{ scrollbarWidth: "thin" }}>
            {echoMessages.length === 0 && (
              <div className="text-[11px] text-zinc-500 text-center mt-4 italic leading-relaxed">
                {lang === "fr"
                  ? "Demande à Echo d'améliorer un paragraphe, suggérer une tournure, critiquer un passage..."
                  : "Ask Echo to improve a paragraph, suggest a phrase, critique a passage..."}
              </div>
            )}
            {echoMessages.map((msg, i) => (
              <div
                key={i}
                className={`text-[11px] leading-relaxed rounded-xl px-3 py-2 ${
                  msg.role === "user"
                    ? "self-end bg-cyan-500/10 border border-cyan-500/20 text-zinc-200 rounded-br-sm max-w-[85%]"
                    : "self-start bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-bl-sm max-w-[90%]"
                }`}
              >
                {msg.text}
              </div>
            ))}
            {echoThinking && (
              <div className="self-start text-[11px] text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl rounded-bl-sm px-3 py-2">
                ...
              </div>
            )}
            <div ref={echoBottomRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 flex gap-2 shrink-0">
            <textarea
              value={echoInput}
              onChange={(e) => setEchoInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendEchoMessage(); } }}
              rows={2}
              placeholder={lang === "fr" ? "Demande à Echo..." : "Ask Echo..."}
              className="flex-1 resize-none bg-zinc-900 border border-zinc-800 text-zinc-200 text-[11px] rounded-lg px-2 py-1.5 placeholder-zinc-600 outline-none focus:border-zinc-600 leading-relaxed"
            />
            <button
              onClick={sendEchoMessage}
              disabled={echoThinking}
              className="w-8 self-end bg-cyan-600/20 border border-cyan-500/30 hover:bg-cyan-600/30 text-cyan-400 rounded-lg text-sm flex items-center justify-center transition-all h-8 shrink-0"
            >
              ➤
            </button>
          </div>
        </aside>
      </div>

      {/* ── SETTINGS CLOSE ON OUTSIDE CLICK ─────────────────────────────── */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />
      )}

      {/* ── CONTENTEDITABLE PLACEHOLDER STYLE ────────────────────────── */}
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: rgba(113, 113, 122, 0.5);
          pointer-events: none;
        }
        [contenteditable] h1 {
          font-size: 1.6em;
          font-weight: bold;
          margin: 0.6em 0 0.4em;
          border-bottom: 1px solid rgba(6,182,212,0.15);
          padding-bottom: 0.2em;
        }
        [contenteditable] h2 {
          font-size: 1.2em;
          font-weight: 600;
          margin: 1em 0 0.3em;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgb(6,182,212);
        }
        [contenteditable] p {
          margin: 0 0 0.75em;
        }
        .direction-rtl { direction: rtl; }
        .direction-ltr { direction: ltr; }
        .scrollbar-none { scrollbar-width: none; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
      `}</style>
    </main>
  );
}