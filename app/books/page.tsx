"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useApp } from "../../context/AppContext";

// ── TYPES ──────────────────────────────────────────────────────────────────────
type EchoMode = "creative" | "ideas" | "critical";
type BookView  = "edit" | "preview" | "present";

type BookMessage = { role: "user" | "echo"; text: string };
type Chapter    = { id: string; title: string; content: string };

// ── i18n DICTIONARY ────────────────────────────────────────────────────────────
const I: Record<"fr"|"en", Record<string,string>> = {
  fr: {
    home:"🏠 Accueil", chat:"💬 Chat", books:"📚 Livres", calendar:"📅 Calendrier",
    vitality:"📈 Vitalité", services:"💎 Services", account:"👤 Compte", history:"⭐ Historique",
    mode:"Mode", edit:"✏️ Éditer", preview:"👁️ Aperçu", present:"📖 Lire",
    saved:"Sauvegardé", saving:"Sauvegarde...", unsaved:"Non sauvegardé",
    save:"Sauv.", inject:"Injection", newChapter:"Nouveau chapitre",
    settings:"Paramètres", lightMode:"☀️ Mode Clair", darkMode:"🌙 Mode Sombre",
    lang:"Langue",
    mirror:"Miroir", pageNum:"N° pages", header:"Header", footer:"Footer",
    justify:"Justifié", lineH:"Interligne", para:"Para", font:"Police",
    opacity:"Opacité page", editorBg:"Fond éditeur",
    struct:"struct", texte:"texte", pages:"pages", police:"police",
    media:"media", livre:"livre", presets:"presets",
    t1:"Titre 1", t2:"Titre 2", t3:"Titre 3", normal:"Texte normal",
    bold:"Gras", italic:"Italique", indent:"Alinéa",
    pageBreak:"Saut de page", toc:"Table matières",
    smaller:"Réduire", larger:"Agrandir",
    image:"Image", importTxt:"Import TXT/MD", openBook:"Ouvrir .echo-book",
    exportHtml:"Export HTML",
    creative:"Créatif", ideas:"Idées", critical:"Critique",
    echoPlaceholder:"Demande à Echo d'améliorer un paragraphe, suggérer une tournure, critiquer un passage...",
    echoInput:"Demande à Echo...",
    export:"Export", exportMenu:"Exporter...",
    noContent:"Aucun contenu.", titleHint:"Double-cliquer pour modifier",
    prevChapter:"Précédent", nextChapter:"Suivant", closePres:"Fermer",
    serverErr:"Impossible de joindre le serveur.",
    printPreset:"Livre imprimé (miroir, pages, header...)",
    kindlePreset:"Kindle (EPUB, pas de pagination...)",
    close:"Fermer",
  },
  en: {
    home:"🏠 Home", chat:"💬 Chat", books:"📚 Books", calendar:"📅 Calendar",
    vitality:"📈 Vitality", services:"💎 Services", account:"👤 Account", history:"⭐ History",
    mode:"Mode", edit:"✏️ Edit", preview:"👁️ Preview", present:"📖 Present",
    saved:"Saved", saving:"Saving...", unsaved:"Unsaved",
    save:"Save", inject:"Inject", newChapter:"New chapter",
    settings:"Settings", lightMode:"☀️ Light Mode", darkMode:"🌙 Dark Mode",
    lang:"Language",
    mirror:"Mirror", pageNum:"Page #", header:"Header", footer:"Footer",
    justify:"Justify", lineH:"Line-h", para:"Para", font:"Font",
    opacity:"Page opacity", editorBg:"Editor bg",
    struct:"struct", texte:"text", pages:"pages", police:"size",
    media:"media", livre:"book", presets:"presets",
    t1:"Title 1", t2:"Title 2", t3:"Title 3", normal:"Normal text",
    bold:"Bold", italic:"Italic", indent:"Indent",
    pageBreak:"Page break", toc:"TOC",
    smaller:"Smaller", larger:"Larger",
    image:"Image", importTxt:"Import TXT/MD", openBook:"Open .echo-book",
    exportHtml:"Export HTML",
    creative:"Creative", ideas:"Ideas", critical:"Critical",
    echoPlaceholder:"Ask Echo to improve a paragraph, suggest a phrase, critique a passage...",
    echoInput:"Ask Echo...",
    export:"Export", exportMenu:"Export...",
    noContent:"No content yet.", titleHint:"Double-click to edit",
    prevChapter:"Previous", nextChapter:"Next", closePres:"Close",
    serverErr:"Cannot reach the server.",
    printPreset:"Print book (mirror, page #, header...)",
    kindlePreset:"Kindle (EPUB, no pagination...)",
    close:"Close",
  },
};

// ── ECHO MODES ─────────────────────────────────────────────────────────────────
const ECHO_MODES: { id: EchoMode; key: "creative"|"ideas"|"critical"; emoji: string; system: string }[] = [
  { id:"creative", key:"creative", emoji:"✍️", system:"Tu es en mode Créatif pour l'écriture. Aide avec imagination, métaphores et suggestions stylistiques originales." },
  { id:"ideas",    key:"ideas",    emoji:"💡", system:"Tu es en mode Idées. Génère des pistes narratives, rebondissements, personnages ou thèmes à explorer." },
  { id:"critical", key:"critical", emoji:"🔍", system:"Tu es en mode Critique. Analyse le texte avec rigueur : rythme, cohérence, clarté, redondances." },
];

// ── WATER GLYPHS ───────────────────────────────────────────────────────────────
const WATER = [
  { g:"〰", top:"6%",  left:"1%",   rot:"-18deg", sz:"58px" },
  { g:"∿",  top:"20%", right:"2%",  rot:"12deg",  sz:"70px" },
  { g:"〜", top:"44%", left:"0.5%", rot:"-8deg",  sz:"50px" },
  { g:"≈",  top:"67%", right:"1.5%",rot:"18deg",  sz:"64px" },
  { g:"∾",  top:"83%", left:"2%",   rot:"-12deg", sz:"54px" },
];

// ── DOWNLOAD HELPER ────────────────────────────────────────────────────────────
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1500);
}
function downloadText(content: string, filename: string, mime = "text/plain") {
  downloadBlob(new Blob([content], { type: mime }), filename);
}

// ── PRESET (touche uniquement le contenu, PAS la taille de la boîte) ──────────
function applyPreset(preset: "print"|"kindle", s:{
  setMirrorMargins:(v:boolean)=>void; setShowPageNumbers:(v:boolean)=>void;
  setShowHeader:(v:boolean)=>void;    setShowFooter:(v:boolean)=>void;
  setLineHeight:(v:number)=>void;     setFontSize:(v:number)=>void;
  setIsJustified:(v:boolean)=>void;   setParaSpacing:(v:number)=>void;
}) {
  if (preset === "print") {
    s.setMirrorMargins(true);  s.setShowPageNumbers(true);
    s.setShowHeader(true);     s.setShowFooter(true);
    s.setLineHeight(1.8);      s.setFontSize(12);
    s.setIsJustified(true);    s.setParaSpacing(0.8);
  } else {
    s.setMirrorMargins(false); s.setShowPageNumbers(false);
    s.setShowHeader(false);    s.setShowFooter(false);
    s.setLineHeight(1.6);      s.setFontSize(14);
    s.setIsJustified(false);   s.setParaSpacing(0.6);
  }
}

// ───────────────────────────────────────────────────────────────────────────────
export default function BooksPage() {
  const { lang, theme, toggleTheme } = useApp();
  const fr = lang === "fr";
  const T  = I[lang as "fr"|"en"] ?? I.fr;

  // ── CHAPTERS ──────────────────────────────────────────────────────────────────
  const [chapters, setChapters] = useState<Chapter[]>([
    { id:"ch1", title: fr ? "Chapitre 1" : "Chapter 1", content:"" },
  ]);
  const [activeChapter, setActiveChapter] = useState("ch1");
  const [bookTitle, setBookTitle]         = useState(fr ? "Mon Premier Livre" : "My First Book");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [view, setView]                   = useState<BookView>("edit");
  const editorRef    = useRef<HTMLDivElement>(null);
  const titleInputRef= useRef<HTMLInputElement>(null);

  // ── SAVE ──────────────────────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<"saved"|"saving"|"unsaved">("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const autoSave = useCallback(() => {
    setSaveStatus("saving");
    localStorage.setItem("echo-books-manuscript", JSON.stringify({ bookTitle, chapters }));
    setTimeout(() => setSaveStatus("saved"), 500);
  }, [bookTitle, chapters]);

  const saveToFile = () => {
    downloadText(JSON.stringify({ bookTitle, chapters }, null, 2),
      `${bookTitle.replace(/\s+/g,"_")}.echo-book.json`, "application/json");
    setSaveStatus("saved");
  };

  useEffect(() => {
    setSaveStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(autoSave, 2500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [chapters, bookTitle]);

  useEffect(() => {
    const raw = localStorage.getItem("echo-books-manuscript");
    if (!raw) return;
    try {
      const { bookTitle:t, chapters:c } = JSON.parse(raw);
      if (t) setBookTitle(t);
      if (c?.length) { setChapters(c); setActiveChapter(c[0].id); }
    } catch { /* ignore */ }
    setSaveStatus("saved");
  }, []);

  // ── BOOK CONTENT SETTINGS ─────────────────────────────────────────────────────
  const [mirrorMargins,   setMirrorMargins]   = useState(false);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [showHeader,      setShowHeader]      = useState(false);
  const [showFooter,      setShowFooter]      = useState(false);
  const [fontSize,        setFontSize]        = useState(14);
  const [fontFamily,      setFontFamily]      = useState("Georgia, serif");
  const [lineHeight,      setLineHeight]      = useState(1.8);
  const [isJustified,     setIsJustified]     = useState(true);
  const [paraSpacing,     setParaSpacing]     = useState(0.75);
  const [showSettings,    setShowSettings]    = useState(true);

  // ── PAGE OPACITY + BG MODE ────────────────────────────────────────────────────
  // pageOpacity: 0 = transparent, 100 = opaque noir (mode nuit full)
  const [pageOpacity, setPageOpacity] = useState(95);

  // ── RESIZE (livre | echo) ─────────────────────────────────────────────────────
  const [echoPanelWidth, setEchoPanelWidth]   = useState(240);
  const [isDesktop, setIsDesktop]             = useState(false);
  const resizingRef = useRef(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const startResizeEcho = (e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const next = Math.min(480, Math.max(180, window.innerWidth - e.clientX));
      setEchoPanelWidth(next);
    };
    const onUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // ── TOOLBAR STATE ─────────────────────────────────────────────────────────────
  const [isBold,   setIsBold]   = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  // ── ECHO ──────────────────────────────────────────────────────────────────────
  const [echoMode,     setEchoMode]     = useState<EchoMode>("creative");
  const [echoMessages, setEchoMessages] = useState<BookMessage[]>([]);
  const [echoInput,    setEchoInput]    = useState("");
  const [echoThinking, setEchoThinking] = useState(false);
  const echoBottomRef = useRef<HTMLDivElement>(null);

  // ── EXPORT DROPDOWN ───────────────────────────────────────────────────────────
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── SETTINGS MENU ─────────────────────────────────────────────────────────────
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setIsSettingsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── FILE INPUTS ───────────────────────────────────────────────────────────────
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const imgInputRef    = useRef<HTMLInputElement>(null);
  const importJsonRef  = useRef<HTMLInputElement>(null);

  // ── SYNC EDITOR ───────────────────────────────────────────────────────────────
  const handleEditorInput = useCallback(() => {
    if (!editorRef.current) return;
    setChapters(prev => prev.map(c => c.id === activeChapter ? { ...c, content: editorRef.current!.innerHTML } : c));
  }, [activeChapter]);

  useEffect(() => {
    if (!editorRef.current || view !== "edit") return;
    const current = chapters.find(c => c.id === activeChapter);
    if (current && editorRef.current.innerHTML !== current.content) {
      editorRef.current.innerHTML = current.content;
    }
    editorRef.current.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChapter, view]);

  // ── EDITOR COMMANDS ───────────────────────────────────────────────────────────
  const execCmd     = (cmd: string, val?: string) => { editorRef.current?.focus(); document.execCommand(cmd, false, val); };
  const applyBlock  = (tag: string) => execCmd("formatBlock", tag);
  const toggleBold   = () => { execCmd("bold");   setIsBold(v => !v); };
  const toggleItalic = () => { execCmd("italic"); setIsItalic(v => !v); };
  const toggleJustify= () => { execCmd(isJustified ? "justifyLeft" : "justifyFull"); setIsJustified(v => !v); };
  const applyIndent  = () => execCmd("indent");

  const insertPageBreak = () => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false,
      `<div style="border-top:1px dashed rgba(6,182,212,0.22);margin:2rem 0;text-align:center;font-size:9px;color:rgba(6,182,212,0.38);letter-spacing:0.25em;padding-top:6px;">— ${T.pageBreak} —</div><p><br></p>`);
  };

  // Injection en fin de page (textarea en bas de la boîte)
  const insertEndInjection = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    // Move cursor to end
    const range = document.createRange();
    const sel   = window.getSelection();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
    document.execCommand("insertHTML", false,
      `<div style="margin-top:3rem;padding-top:1rem;border-top:1px solid rgba(6,182,212,0.15);font-size:9px;color:rgba(6,182,212,0.35);text-align:center;letter-spacing:0.2em;">— ${T.inject} —</div><p><br></p>`);
  };

  const insertTOC = () => {
    const rows = chapters.map((c, i) =>
      `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11px;border-bottom:1px dotted rgba(120,120,120,0.18);">${c.title}<span>${i+1}</span></div>`
    ).join("");
    editorRef.current?.focus();
    document.execCommand("insertHTML", false,
      `<div style="border:1px dashed rgba(6,182,212,0.18);padding:14px;border-radius:3px;margin:18px 0;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.12em;opacity:0.38;margin-bottom:10px;">${T.toc}</div>
        ${rows}
      </div>`);
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
    const id  = `ch${Date.now()}`;
    const num = chapters.length + 1;
    setChapters(prev => [...prev, { id, title: fr ? `Chapitre ${num}` : `Chapter ${num}`, content:"" }]);
    setActiveChapter(id);
  };

  // ── IMPORTS ───────────────────────────────────────────────────────────────────
  const handleImportTxt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const id   = `ch${Date.now()}`;
      const html = (reader.result as string).split(/\n\n+/).map(p => `<p>${p.replace(/\n/g,"<br>")}</p>`).join("");
      setChapters(prev => [...prev, { id, title: file.name.replace(/\.[^.]+$/, ""), content: html }]);
      setActiveChapter(id);
    };
    reader.readAsText(file);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { bookTitle:t, chapters:c } = JSON.parse(reader.result as string);
        if (t) setBookTitle(t);
        if (c?.length) { setChapters(c); setActiveChapter(c[0].id); }
      } catch { alert(fr ? "Fichier invalide." : "Invalid file."); }
    };
    reader.readAsText(file);
  };

  // ── EXPORTS ───────────────────────────────────────────────────────────────────
  // Génère un HTML complet (ouvre le sélecteur de fichiers natif du navigateur)
  const buildHTML = (target: string) => {
    const body = chapters.map(c => `<section>\n<h2>${c.title}</h2>\n${c.content}\n</section>`).join("\n\n");
    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="export-target" content="${target}">
  <title>${bookTitle}</title>
  <style>
    body{font-family:${fontFamily};font-size:${fontSize}px;line-height:${lineHeight};max-width:65ch;margin:3rem auto;padding:2rem;color:#1a1a1a}
    h1{font-size:2em;border-bottom:1px solid #ccc;padding-bottom:.3em;margin-bottom:1em}
    h2{font-size:1.3em;text-transform:uppercase;letter-spacing:.08em;color:#0891b2;margin-top:2.5em}
    h3{font-size:1.1em;color:#0e7490;margin-top:1.5em}
    p{text-align:${isJustified?"justify":"left"};margin-bottom:${paraSpacing}em;${mirrorMargins?"text-indent:1.5em":""}}
    img{max-width:100%;border-radius:4px;margin:.5em 0}
    section{break-before:page}
    @media print{section{page-break-before:always}}
  </style>
</head>
<body>
  <h1>${bookTitle}</h1>
  ${body}
</body>
</html>`;
  };

  const handleExport = (fmt: string) => {
    setShowExportMenu(false);
    const slug = bookTitle.replace(/\s+/g,"_");
    if (fmt === "txt") {
      const txt = chapters.map(c => `=== ${c.title} ===\n\n${c.content.replace(/<[^>]+>/g,"").replace(/&nbsp;/g," ").replace(/&amp;/g,"&")}`).join("\n\n\n");
      downloadText(txt, `${slug}.txt`);
    } else if (fmt === "json") {
      downloadText(JSON.stringify({ bookTitle, chapters }, null, 2), `${slug}.echo-book.json`, "application/json");
    } else {
      // html / docx-ready / pdf-ready / epub-ready → même HTML, extension différente selon usage
      const ext = fmt === "html" ? "html" : `${fmt}_ready.html`;
      downloadText(buildHTML(fmt), `${slug}.${ext}`, "text/html");
    }
  };

  // ── ECHO ──────────────────────────────────────────────────────────────────────
  const sendEcho = async () => {
    if (!echoInput.trim() || echoThinking) return;
    const msg = echoInput.trim();
    setEchoInput("");
    setEchoMessages(prev => [...prev, { role:"user", text:msg }]);
    setEchoThinking(true);
    const excerpt = editorRef.current?.innerText?.slice(0, 400) || "";
    const modeInfo = ECHO_MODES.find(m => m.id === echoMode);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/chat`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          message: msg,
          history: [],
          systemOverride: `${modeInfo?.system || ""}\n\nContexte : livre "${bookTitle}". Extrait :\n"${excerpt}"`,
        }),
      });
      const data = await res.json();
      setEchoMessages(prev => [...prev, { role:"echo", text: data.response || "..." }]);
    } catch {
      setEchoMessages(prev => [...prev, { role:"echo", text: T.serverErr }]);
    } finally {
      setEchoThinking(false);
    }
  };

  useEffect(() => { echoBottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [echoMessages, echoThinking]);

  // ── PRESETS ───────────────────────────────────────────────────────────────────
  const triggerPreset = (p: "print"|"kindle") =>
    applyPreset(p, { setMirrorMargins, setShowPageNumbers, setShowHeader, setShowFooter, setLineHeight, setFontSize, setIsJustified, setParaSpacing });

  // ── SAVE LABEL ────────────────────────────────────────────────────────────────
  const saveLabel = {
    saved:   { dot:"bg-emerald-400",            text: T.saved },
    saving:  { dot:"bg-amber-400 animate-pulse", text: T.saving },
    unsaved: { dot:"bg-zinc-500",               text: T.unsaved },
  }[saveStatus];

  const currentContent = chapters.find(c => c.id === activeChapter)?.content || "";

  // ── TOOLBAR BTN ───────────────────────────────────────────────────────────────
  const TB = ({ icon, label, active, onClick }: { icon:string; label:string; active?:boolean; onClick:()=>void }) => (
    <button onClick={onClick} title={label}
      className={`group relative w-[42px] h-7 flex items-center justify-center rounded-lg text-[13px] transition-all border select-none
        ${active ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400" : "border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 hover:border-zinc-700"}`}>
      {icon}
      <span className="pointer-events-none absolute left-[46px] top-1/2 -translate-y-1/2 bg-zinc-950 text-white text-[9px] px-1.5 py-0.5 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 border border-zinc-800 z-50 shadow-lg transition-opacity">
        {label}
      </span>
    </button>
  );

  const Toggle = ({ val, set }: { val:boolean; set:(v:boolean)=>void }) => (
    <button onClick={() => set(!val)}
      className={`w-8 h-4 rounded-full border relative transition-all flex-shrink-0 ${val ? "bg-cyan-500/30 border-cyan-500/50" : "bg-zinc-800 border-zinc-700"}`}>
      <span className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${val ? "left-4 bg-cyan-400" : "left-0.5 bg-zinc-500"}`} />
    </button>
  );

  // ── PAGE BG STYLE (opacity slider) ────────────────────────────────────────────
  // 0 = full transparent (see background image), 100 = solid dark
  const pageBgStyle = {
    backgroundColor: `rgba(${theme==="dark"?"9,9,11":"255,255,255"},${pageOpacity/100})`,
  };

  // ── PRESENT MODE ──────────────────────────────────────────────────────────────
  if (view === "present") {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50">
        <div className="flex items-center justify-between px-8 py-3 border-b border-zinc-800">
          <span className="text-zinc-400 text-sm font-mono">{bookTitle}</span>
          <div className="flex items-center gap-3">
            <span className="text-zinc-500 text-xs font-mono">{chapters.find(c=>c.id===activeChapter)?.title}</span>
            <div className="flex gap-1">
              {chapters.map((ch,i) => (
                <button key={ch.id} onClick={() => setActiveChapter(ch.id)}
                  className={`text-[9px] px-2 py-0.5 rounded border transition-all ${activeChapter===ch.id ? "border-cyan-500/40 text-cyan-400" : "border-zinc-800 text-zinc-600 hover:text-zinc-400"}`}>
                  {i+1}
                </button>
              ))}
            </div>
            <button onClick={() => setView("edit")}
              className="text-[10px] px-3 py-1 rounded border border-zinc-700 text-zinc-400 hover:border-red-500/40 hover:text-red-400 transition-all">
              ✕ {T.closePres}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto flex justify-center px-8 py-12" style={{scrollbarWidth:"thin",scrollbarColor:"rgba(6,182,212,0.15) transparent"}}>
          <div className="w-full max-w-[65ch]" style={{fontSize:`${fontSize+2}px`,fontFamily,lineHeight:lineHeight+0.1,color:"#e4e4e7"}}>
            <h1 className="text-3xl font-bold text-white mb-8 border-b border-zinc-800 pb-4">{bookTitle}</h1>
            <div className="text-[11px] uppercase tracking-widest text-cyan-500/60 font-mono mb-4">
              {chapters.find(c=>c.id===activeChapter)?.title}
            </div>
            <div className="books-present" style={{textAlign:isJustified?"justify":"left"}}
              dangerouslySetInnerHTML={{__html: currentContent || `<p style="color:rgba(113,113,122,0.3);font-style:italic">${T.noContent}</p>`}} />
          </div>
        </div>
        <div className="flex justify-between px-8 py-3 border-t border-zinc-800">
          <button onClick={() => { const i=chapters.findIndex(c=>c.id===activeChapter); if(i>0) setActiveChapter(chapters[i-1].id); }}
            disabled={chapters.findIndex(c=>c.id===activeChapter)===0}
            className="text-[10px] px-3 py-1 rounded border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-all disabled:opacity-30">
            ← {T.prevChapter}
          </button>
          <span className="text-[9px] font-mono text-zinc-600">{chapters.findIndex(c=>c.id===activeChapter)+1} / {chapters.length}</span>
          <button onClick={() => { const i=chapters.findIndex(c=>c.id===activeChapter); if(i<chapters.length-1) setActiveChapter(chapters[i+1].id); }}
            disabled={chapters.findIndex(c=>c.id===activeChapter)===chapters.length-1}
            className="text-[10px] px-3 py-1 rounded border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-all disabled:opacity-30">
            {T.nextChapter} →
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN ──────────────────────────────────────────────────────────────────────
  return (
    <main className="h-screen bg-white dark:bg-black text-black dark:text-white flex overflow-hidden font-sans transition-colors duration-200 selection:bg-cyan-500/30">

      {/* NAV SIDEBAR */}
      <aside className="w-44 shrink-0 border-r border-zinc-200 dark:border-zinc-800 px-5 py-6 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between">
        <div className="space-y-20">
          <h2 className="font-bold"><Link href="/" className="text-cyan-600 dark:text-cyan-400">{T.home}</Link></h2>
          <div className="space-y-20 text-zinc-800 dark:text-zinc-100 font-medium text-sm">
            <Link href="/chat"     className="block hover:text-cyan-500">{T.chat}</Link>
            <Link href="/books"    className="block text-cyan-500 font-bold">{T.books}</Link>
            <Link href="/calendar" className="block hover:text-cyan-500">{T.calendar}</Link>
            <Link href="/vitality" className="block hover:text-cyan-500">{T.vitality}</Link>
            <Link href="/services" className="block hover:text-cyan-500">{T.services}</Link>
            <Link href="/account"  className="block hover:text-cyan-500">{T.account}</Link>
            <hr className="border-zinc-200 dark:border-zinc-800" />
            <Link href="/history"  className="block hover:text-amber-500">{T.history}</Link>
          </div>
        </div>
        <div className="text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 pt-3">
          {T.mode} : <span className="text-cyan-400 uppercase font-bold block">books</span>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* TOOLBAR 2 colonnes */}
        <div className="w-[100px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col py-2 overflow-hidden">

          <div className="px-2 pb-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.struct}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="T¹" label={T.t1} onClick={() => applyBlock("h1")} />
              <TB icon="T²" label={T.t2} onClick={() => applyBlock("h2")} />
              <TB icon="T³" label={T.t3} onClick={() => applyBlock("h3")} />
              <TB icon="¶"  label={T.normal} onClick={() => applyBlock("p")} />
            </div>
          </div>

          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.texte}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="B"  label={T.bold}   active={isBold}   onClick={toggleBold} />
              <TB icon="I"  label={T.italic} active={isItalic} onClick={toggleItalic} />
              <TB icon="≡"  label={T.justify} active={isJustified} onClick={toggleJustify} />
              <TB icon="→"  label={T.indent} onClick={applyIndent} />
            </div>
          </div>

          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.pages}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="⊟"  label={T.pageBreak} onClick={insertPageBreak} />
              <TB icon="📑" label={T.toc}       onClick={insertTOC} />
              <TB icon="↓"  label={T.inject}    onClick={insertEndInjection} />
            </div>
          </div>

          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.police}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="A-" label={T.smaller} onClick={() => setFontSize(v => Math.max(10, v-1))} />
              <TB icon="A+" label={T.larger}  onClick={() => setFontSize(v => Math.min(24, v+1))} />
            </div>
            <div className="text-center font-mono text-[9px] text-zinc-500 mt-0.5">{fontSize}px</div>
          </div>

          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.media}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="🖼️" label={T.image}     onClick={insertImage} />
              <TB icon="📥" label={T.importTxt} onClick={() => fileInputRef.current?.click()} />
              <TB icon="📂" label={T.openBook}  onClick={() => importJsonRef.current?.click()} />
            </div>
          </div>

          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.livre}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="⚙️" label={T.settings}   active={showSettings} onClick={() => setShowSettings(v => !v)} />
              <TB icon="+"  label={T.newChapter} onClick={addChapter} />
            </div>
          </div>

          <div className="px-2 py-1.5">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.presets}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="📖" label={T.printPreset}  onClick={() => triggerPreset("print")} />
              <TB icon="📱" label={T.kindlePreset} onClick={() => triggerPreset("kindle")} />
            </div>
          </div>
        </div>

        {/* EDITOR ZONE */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">

          {/* Topbar */}
          <div className="h-9 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center px-3 gap-2">

            {/* View tabs */}
            {(["edit","preview","present"] as BookView[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${view===v ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>
                {v==="edit" ? T.edit : v==="preview" ? T.preview : T.present}
              </button>
            ))}

            {/* Chapter tabs */}
            <div className="flex-1 flex items-center gap-1 overflow-x-auto mx-1" style={{scrollbarWidth:"none"}}>
              {chapters.map(ch => (
                <button key={ch.id} onClick={() => setActiveChapter(ch.id)}
                  className={`text-[9px] px-2 py-0.5 rounded border whitespace-nowrap transition-all ${activeChapter===ch.id ? "border-zinc-600 text-zinc-200 bg-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>
                  {ch.title}
                </button>
              ))}
            </div>

            {/* Save */}
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${saveLabel.dot}`} />
              <span className="text-[9px] font-mono text-zinc-400">{saveLabel.text}</span>
            </div>
            <button onClick={saveToFile}
              className="text-[9px] px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:border-cyan-500/40 hover:text-cyan-400 transition-all font-mono"
              title={fr ? "Télécharger le manuscrit" : "Download manuscript"}>
              💾 {T.save}
            </button>

            {/* Export dropdown */}
            <div className="relative" ref={exportRef}>
              <button onClick={() => setShowExportMenu(v => !v)}
                className={`text-[9px] px-2 py-1 rounded border transition-all font-mono flex items-center gap-1 ${showExportMenu ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "border-zinc-700 text-zinc-400 hover:border-cyan-500/40 hover:text-cyan-400"}`}>
                {T.export} ▾
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-36 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-1 z-50 flex flex-col gap-0.5">
                  {[
                    { key:"html",  label:"HTML" },
                    { key:"docx",  label:"DOCX (HTML)" },
                    { key:"pdf",   label:"PDF (HTML)" },
                    { key:"epub",  label:"EPUB (HTML)" },
                    { key:"txt",   label:"TXT" },
                    { key:"json",  label:"JSON (.echo-book)" },
                  ].map(({ key, label }) => (
                    <button key={key} onClick={() => handleExport(key)}
                      className="w-full text-left px-2.5 py-1.5 text-[10px] text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-400 rounded-lg transition-all font-mono">
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Settings gear — avec changement de langue */}
            <div className="relative ml-1" ref={settingsRef}>
              <button onClick={() => setIsSettingsOpen(v => !v)}
                className="text-[10px] px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all">
                ⚙️ <span className="font-mono text-[8px] bg-cyan-500/15 text-cyan-500 px-1 rounded uppercase ml-0.5">{fr ? "FR" : "EN"}</span>
              </button>
              {isSettingsOpen && (
                <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xl p-2 flex flex-col gap-1 z-50">
                  <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-400 px-2 py-1 border-b border-zinc-100 dark:border-zinc-900">{T.settings}</div>
                  <button onClick={toggleTheme}
                    className="text-left px-2 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors">
                    {theme==="dark" ? T.lightMode : T.darkMode}
                  </button>
                  {/* Changement de langue */}
                  <div className="px-2 py-1.5 flex items-center gap-2">
                    <span className="text-xs text-zinc-500">{T.lang} :</span>
                    <button
                      onClick={() => { /* toggle lang via AppContext */ }}
                      className="text-[10px] px-2 py-0.5 rounded border border-zinc-700 text-zinc-400 hover:border-cyan-500/40 hover:text-cyan-400 font-mono transition-all">
                      {fr ? "🇫🇷 FR → EN" : "🇬🇧 EN → FR"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Book settings panel */}
          {showSettings && (
            <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/80 px-4 py-2 flex flex-wrap gap-x-4 gap-y-2 items-center text-[10px]">
              {[
                { label:T.mirror,  val:mirrorMargins,   set:setMirrorMargins },
                { label:T.pageNum, val:showPageNumbers, set:setShowPageNumbers },
                { label:T.header,  val:showHeader,      set:setShowHeader },
                { label:T.footer,  val:showFooter,      set:setShowFooter },
                { label:T.justify, val:isJustified,     set:setIsJustified },
              ].map(({ label, val, set }) => (
                <label key={label} className="flex items-center gap-1.5 cursor-pointer">
                  <span className="text-zinc-400">{label}</span>
                  <Toggle val={val} set={set} />
                </label>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">{T.lineH}</span>
                <input type="range" min="1.2" max="2.4" step="0.05" value={lineHeight}
                  onChange={e => setLineHeight(parseFloat(e.target.value))} className="w-16 accent-cyan-400 h-1" />
                <span className="font-mono text-zinc-400 text-[9px] w-7">{lineHeight.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">{T.para}</span>
                <input type="range" min="0.2" max="2" step="0.05" value={paraSpacing}
                  onChange={e => setParaSpacing(parseFloat(e.target.value))} className="w-12 accent-cyan-400 h-1" />
                <span className="font-mono text-zinc-400 text-[9px] w-7">{paraSpacing.toFixed(2)}</span>
              </div>
              {/* Opacity slider */}
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">{T.opacity}</span>
                <input type="range" min="0" max="100" step="1" value={pageOpacity}
                  onChange={e => setPageOpacity(parseInt(e.target.value))} className="w-16 accent-cyan-400 h-1" />
                <span className="font-mono text-zinc-400 text-[9px] w-7">{pageOpacity}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">{T.font}</span>
                <select value={fontFamily} onChange={e => setFontFamily(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-[9px] rounded px-1 py-0.5">
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="Garamond, serif">Garamond</option>
                  <option value="system-ui, sans-serif">Sans-serif</option>
                </select>
              </div>
              <button onClick={() => setShowSettings(false)} className="ml-auto text-zinc-500 hover:text-zinc-200 text-base">✕</button>
            </div>
          )}

          {/* Editor area — background = eauplante.png */}
          <div className="flex-1 overflow-hidden min-h-0 relative"
            style={{ backgroundImage:"url('/eauplante2.png')", backgroundSize:"cover", backgroundPosition:"center" }}>

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50 pointer-events-none z-0" />

            {/* Water glyphs */}
            {WATER.map((d,i) => (
              <span key={i} aria-hidden="true" className="absolute pointer-events-none select-none z-[1]"
                style={{ top:d.top, left:d.left, right:d.right, fontSize:d.sz,
                  transform:`rotate(${d.rot})`, opacity:0.06, filter:"blur(1px)", color:"#06b6d4", lineHeight:1 }}>
                {d.g}
              </span>
            ))}

            {/* Scroll zone */}
            <div className="absolute inset-0 overflow-y-auto flex justify-center px-4 py-4 z-[2]"
              style={{ scrollbarWidth:"thin", scrollbarColor:"rgba(6,182,212,0.2) transparent" }}>

              {/* PAGE SHEET — grande, opacité contrôlée */}
              <div className="w-full shadow-2xl border border-zinc-200/10 dark:border-zinc-700/20 rounded-sm relative"
                style={{
                  maxWidth:"860px",
                  minHeight:"calc(100% - 2rem)",
                  paddingTop:   showHeader ? 0 : "52px",
                  paddingBottom:showFooter ? 0 : "64px",
                  paddingLeft:  mirrorMargins ? "72px" : "56px",
                  paddingRight: "56px",
                  ...pageBgStyle,
                }}>

                {/* Margin line */}
                <div className="absolute left-10 top-0 bottom-0 w-px pointer-events-none" style={{background:"rgba(6,182,212,0.06)"}} />

                {/* Header */}
                {showHeader && (
                  <div className="h-9 border-b border-zinc-700/30 flex items-center px-4 mb-4">
                    <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-400">{bookTitle}</span>
                  </div>
                )}

                {/* Book title */}
                {isEditingTitle ? (
                  <input ref={titleInputRef} value={bookTitle}
                    onChange={e => setBookTitle(e.target.value)}
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={e => { if (e.key==="Enter") setIsEditingTitle(false); }}
                    className="w-full text-2xl font-bold bg-transparent border-b border-cyan-500/40 outline-none text-black dark:text-white mb-6 pb-1"
                    autoFocus />
                ) : (
                  <h1 onDoubleClick={() => { setIsEditingTitle(true); setTimeout(()=>titleInputRef.current?.focus(),50); }}
                    title={T.titleHint}
                    className="text-2xl font-bold text-black dark:text-white mb-6 cursor-text pb-1 border-b border-transparent hover:border-cyan-500/10 transition-colors">
                    {bookTitle}
                  </h1>
                )}

                {/* Chapter label */}
                <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500 mb-3 font-mono">
                  {chapters.find(c=>c.id===activeChapter)?.title}
                </div>

                {/* Editor / Preview */}
                {view==="edit" ? (
                  <div ref={editorRef} contentEditable suppressContentEditableWarning
                    onInput={handleEditorInput}
                    data-placeholder={fr ? "Commencez à écrire votre histoire..." : "Start writing your story..."}
                    className="outline-none min-h-[400px] text-black dark:text-zinc-100 caret-cyan-400 books-editor"
                    style={{fontSize:`${fontSize}px`,fontFamily,lineHeight,textAlign:isJustified?"justify":"left"}}
                  />
                ) : (
                  <div className="min-h-[400px] text-black dark:text-zinc-100 books-preview"
                    style={{fontSize:`${fontSize}px`,fontFamily,lineHeight,textAlign:isJustified?"justify":"left"}}
                    dangerouslySetInnerHTML={{__html: currentContent || `<p style="color:rgba(113,113,122,0.35);font-style:italic">${T.noContent}</p>`}}
                  />
                )}

                {/* Page number */}
                {showPageNumbers && (
                  <div className="absolute bottom-5 left-0 right-0 text-center text-[9px] text-zinc-400 font-mono pointer-events-none">
                    — {chapters.findIndex(c=>c.id===activeChapter)+1} —
                  </div>
                )}

                {/* Footer */}
                {showFooter && (
                  <div className="h-7 border-t border-zinc-700/30 flex items-center justify-center mt-6">
                    <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-400">{bookTitle}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RESIZE HANDLE between editor and echo */}
        {isDesktop && (
          <div onMouseDown={startResizeEcho}
            className="w-2.5 shrink-0 cursor-col-resize flex items-center justify-center group z-10">
            <div className="w-1 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 group-hover:bg-cyan-500 transition-colors" />
          </div>
        )}

        {/* ECHO PANEL */}
        <aside
          style={isDesktop ? { width: echoPanelWidth, flexBasis: echoPanelWidth } : undefined}
          className="w-60 shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col overflow-hidden">

          {/* Header */}
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
                className={`flex-1 text-[9px] py-1 rounded-lg border transition-all text-center ${echoMode===m.id ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" : "border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"}`}>
                {m.emoji} {T[m.key]}
              </button>
            ))}
          </div>

          {/* Messages or idle */}
          <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2 min-h-0" style={{scrollbarWidth:"thin"}}>
            {echoMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 pb-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border border-zinc-700 shadow-lg echo-idle">
                  <img src="/Echo.png" alt="Echo" className="w-full h-full object-cover" />
                </div>
                <div className="text-[10px] text-zinc-500 text-center italic leading-relaxed px-2">{T.echoPlaceholder}</div>
              </div>
            ) : (
              <>
                {echoMessages.map((msg,i) => (
                  <div key={i} className={`text-[10px] leading-relaxed rounded-xl px-2.5 py-1.5 ${
                    msg.role==="user"
                      ? "self-end bg-cyan-500/10 border border-cyan-500/20 text-zinc-200 rounded-br-sm max-w-[88%]"
                      : "self-start bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-bl-sm max-w-[92%]"
                  }`}>{msg.text}</div>
                ))}
                {echoThinking && (
                  <div className="self-start text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl rounded-bl-sm px-2.5 py-1.5">...</div>
                )}
              </>
            )}
            <div ref={echoBottomRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 flex gap-1.5 shrink-0">
            <textarea value={echoInput} onChange={e => setEchoInput(e.target.value)}
              onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendEcho(); } }}
              rows={2} placeholder={T.echoInput}
              className="flex-1 resize-none bg-zinc-900 border border-zinc-800 text-zinc-200 text-[10px] rounded-lg px-2 py-1.5 placeholder-zinc-600 outline-none focus:border-cyan-700/40 leading-relaxed" />
            <button onClick={sendEcho} disabled={echoThinking}
              className="w-7 self-end bg-cyan-600/15 border border-cyan-500/25 hover:bg-cyan-600/25 disabled:opacity-30 text-cyan-400 rounded-lg text-xs flex items-center justify-center transition-all h-7 shrink-0">
              ➤
            </button>
          </div>
        </aside>
      </div>

      {/* Hidden inputs */}
      <input ref={fileInputRef}  type="file" accept=".txt,.md,.markdown" onChange={handleImportTxt}  className="hidden" />
      <input ref={imgInputRef}   type="file" accept="image/*"            onChange={handleImgFile}    className="hidden" />
      <input ref={importJsonRef} type="file" accept=".json"              onChange={handleImportJson} className="hidden" />

      {/* Styles */}
      <style>{`
        .books-editor:empty:before{content:attr(data-placeholder);color:rgba(113,113,122,0.38);pointer-events:none;font-style:italic}
        .books-editor h1,.books-preview h1,.books-present h1{font-size:1.6em;font-weight:700;margin:.5em 0 .3em;border-bottom:1px solid rgba(6,182,212,0.1);padding-bottom:.12em}
        .books-editor h2,.books-preview h2,.books-present h2{font-size:1.2em;font-weight:600;margin:.9em 0 .2em;text-transform:uppercase;letter-spacing:.07em;color:rgb(6,182,212)}
        .books-editor h3,.books-preview h3,.books-present h3{font-size:1.05em;font-weight:600;margin:.7em 0 .15em;color:rgba(6,182,212,.6)}
        .books-editor p,.books-preview p,.books-present p{margin-bottom:${paraSpacing}em}
        .books-editor br{display:block;content:"";margin-bottom:0}
        .books-editor img,.books-preview img{max-width:100%;border-radius:3px;margin:.5em 0}
        .books-editor:focus{outline:none}
        .books-editor div{min-height:1.4em}
      `}</style>
    </main>
  );
}