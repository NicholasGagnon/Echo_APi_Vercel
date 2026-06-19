"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useApp } from "../../context/AppContext";
import LangDropdown from "../components/LangDropdown";

// ── IMPORTATIONS TIPTAP NETTOYÉES ET SANS DOUBLONS ─────────────────────────────
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { TextAlign } from "@tiptap/extension-text-align";

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
    opacity:"Opacité page", editorBg:"Fond éditeur", paraIndentLbl:"Alinéa 1ère ligne",
    struct:"struct", texte:"texte", pages:"pages", police:"police",
    media:"media", livre:"livre", presets:"presets",
    t1:"Titre 1", t2:"Titre 2", t3:"Titre 3", normal:"Texte normal",
    bold:"Gras", italic:"Italique", indent:"Alinéa",
    pageBreak:"Afficher les marques (¶)", toc:"Table matières",
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
    presetPrint:"📖 Impression", presetKindle:"📱 Kindle", presetCustom:"⚙️ Personnalisé",
    printPreset:"Livre imprimé : marges miroir, numéros de page, header/footer, justifié, alinéa",
    kindlePreset:"Kindle/EPUB : sans marges miroir, sans pagination, sans header/footer",
    customPreset:"Réglages manuels — ouvre le panneau de paramètres",
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
    opacity:"Page opacity", editorBg:"Editor bg", paraIndentLbl:"First-line indent",
    struct:"struct", text:"text", pages:"pages", police:"size",
    media:"media", livre:"book", presets:"presets",
    t1:"Title 1", texte:"text", t3:"Title 3", normal:"Normal text",
    bold:"Bold", italic:"Italic", indent:"Indent",
    pageBreak:"Toggle marks (¶)", toc:"TOC",
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
    printPreset:"Print book: mirror margins, page numbers, header/footer, justified, indent",
    kindlePreset:"Kindle/EPUB: no mirror margins, no pagination, no header/footer",
    customPreset:"Manual settings — opens the settings panel",
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

function applyPreset(preset: "print"|"kindle", s:{
  setMirrorMargins:(v:boolean)=>void; setShowPageNumbers:(v:boolean)=>void;
  setShowHeader:(v:boolean)=>void;    setShowFooter:(v:boolean)=>void;
  setLineHeight:(v:number)=>void;     setFontSize:(v:number)=>void;
  setIsJustified:(v:boolean)=>void;   setParaSpacing:(v:number)=>void;
  setParaIndent:(v:boolean)=>void;
}) {
  if (preset === "print") {
    s.setMirrorMargins(true);  s.setShowPageNumbers(true);
    s.setShowHeader(true);     s.setShowFooter(true);
    s.setLineHeight(1.8);      s.setFontSize(12);
    s.setIsJustified(true);    s.setParaSpacing(0.8);
    s.setParaIndent(true);
  } else {
    s.setMirrorMargins(false); s.setShowPageNumbers(false);
    s.setShowHeader(false);    s.setShowFooter(false);
    s.setLineHeight(1.6);      s.setFontSize(14);
    s.setIsJustified(false);   s.setParaSpacing(0.6);
    s.setParaIndent(false);
  }
}

export default function BooksPage() {
  const { lang, theme, toggleTheme } = useApp();
  const fr = lang === "fr";
  const T  = I[lang as "fr"|"en"] ?? I.fr;

  // ── CHAPTERS STATE ────────────────────────────────────────────────────────────
  const [chapters, setChapters] = useState<Chapter[]>([
    { id:"ch1", title: fr ? "Chapitre 1" : "Chapter 1", content:"" },
  ]);
  const [activeChapter, setActiveChapter] = useState("ch1");
  const [bookTitle, setBookTitle]         = useState(fr ? "Mon Premier Livre" : "My First Book");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [view, setView]                   = useState<BookView>("edit");
  const titleInputRef= useRef<HTMLInputElement>(null);

  // ── LAYOUT & TYPOGRAPHY SETTINGS ──────────────────────────────────────────────
  const [mirrorMargins,   setMirrorMargins]   = useState(false);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [showHeader,       setShowHeader]      = useState(false);
  const [showFooter,       setShowFooter]      = useState(false);
  const [fontSize,        setFontSize]        = useState(14);
  const [fontFamily,      setFontFamily]      = useState("Georgia, serif");
  const [lineHeight,      setLineHeight]      = useState(1.8);
  const [isJustified,      setIsJustified]     = useState(true);
  const [paraSpacing,      setParaSpacing]     = useState(0.75);
  const [showSettings,     setShowSettings]    = useState(true);
  const [paraIndent,      setParaIndent]      = useState(false);
  const [activePreset,     setActivePreset]    = useState<"print"|"kindle"|"custom"|null>(null);
  const [pageOpacity, setPageOpacity] = useState(95);
  const [showInvisibleChars, setShowInvisibleChars] = useState(false);

  // ── CONFIGURATION ET INITIALISATION TIPTAP ─────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      FontFamily,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle.extend({
        addAttributes() {
          return {
            fontSize: {
              default: null,
              parseHTML: element => element.style.fontSize,
              renderHTML: attributes => {
                if (!attributes.fontSize) return {};
                return { style: `font-size: ${attributes.fontSize}` };
              },
            },
          };
        },
      }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setChapters(prev => prev.map(c => c.id === activeChapter ? { ...c, content: html } : c));
    },
  });

  // Synchroniser le contenu de l'éditeur lors du changement de chapitre ou de vue
  useEffect(() => {
    if (!editor || view !== "edit") return;
    const current = chapters.find(c => c.id === activeChapter);
    if (current && editor.getHTML() !== current.content) {
      editor.commands.setContent(current.content || "<p></p>");
    }
  }, [activeChapter, view, editor, chapters]);

  // Synchroniser l'alignement justifié / gauche global avec Tiptap
  useEffect(() => {
    if (!editor) return;
    if (isJustified) {
      editor.commands.setTextAlign("justify");
    } else {
      editor.commands.unsetTextAlign();
    }
  }, [isJustified, editor]);

  // Synchroniser la police globale sélectionnée avec Tiptap
  useEffect(() => {
    if (!editor) return;
    editor.commands.setFontFamily(fontFamily);
  }, [fontFamily, editor]);

  // ── AUTO-SAVE LOGIC ───────────────────────────────────────────────────────────
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
  }, [chapters, bookTitle, autoSave]);

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

  // ── PANEL RESIZING ────────────────────────────────────────────────────────────
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

  // ── COMMANDES STRUCTURELLES TIPTAP SÉCURISÉES ──────────────────────────────────
  const toggleBold   = () => editor?.commands.toggleBold();
  const toggleItalic = () => editor?.commands.toggleItalic();
  const toggleJustify= () => setIsJustified(v => !v);
  const applyIndent  = () => editor?.commands.sinkListItem("listItem");

  const toggleInvisibleChars = () => {
    setShowInvisibleChars(!showInvisibleChars);
  };

  const insertTOC = () => {
    if (!editor) return;
    const rows = chapters.map((c, i) =>
      `<div style="display:flex; justify-content:space-between; padding:4px 0; font-size:11px; border-bottom:1px dotted rgba(120,120,120,0.2);">${c.title}<span>${i+1}</span></div>`
    ).join("");
    
    const tocHtml = `<div class="echo-toc-block" style="border:1px dashed rgba(6,182,212,0.25); padding:16px; border-radius:6px; margin:2rem 0; background:rgba(6,182,212,0.02);">
      <div style="font-size:9px; text-transform:uppercase; letter-spacing:0.12em; opacity:0.45; margin-bottom:10px; font-weight:bold;">${T.toc}</div>
      ${rows}
    </div><p></p>`;
    editor.commands.insertContent(tocHtml);
  };

  const insertEndInjection = () => {
    if (!editor) return;
    const injectHtml = `<div class="echo-injection-block" style="margin-top:3.5rem; margin-bottom:2.5rem; padding-top:1.5rem; border-top:1px solid rgba(6,182,212,0.25); font-size:10px; color:rgba(6,182,212,0.55); text-align:center; letter-spacing:0.25em;">— ${T.inject} —</div><p></p>`;
    editor.commands.insertContent(injectHtml);
  };

  const addChapter = () => {
    const id  = `ch${Date.now()}`;
    const num = chapters.length + 1;
    setChapters(prev => [...prev, { id, title: fr ? `Chapitre ${num}` : `Chapter ${num}`, content:"" }]);
    setActiveChapter(id);
  };

  // ── IMPORTS & EXPORTS ─────────────────────────────────────────────────────────
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const imgInputRef    = useRef<HTMLInputElement>(null);
  const importJsonRef  = useRef<HTMLInputElement>(null);

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
      const ext = fmt === "html" ? "html" : `${fmt}_ready.html`;
      downloadText(buildHTML(fmt), `${slug}.${ext}`, "text/html");
    }
  };

  // ── SYNCHRONISATION TAILLE POLICE AVEC LA MARQUE TEXTSTYLE TIPTAP ───────────────
  useEffect(() => {
    if (!editor) return;
    editor.commands.setMark('textStyle', { fontSize: `${fontSize}px` });
  }, [fontSize, editor]);

  // ── ECHO STREAM LOGIC ─────────────────────────────────────────────────────────
  const [echoMode,     setEchoMode]     = useState<EchoMode>("creative");
  const [echoMessages, setEchoMessages] = useState<BookMessage[]>([]);
  const [echoInput,    setEchoInput]    = useState("");
  const [echoThinking, setEchoThinking] = useState(false);
  const echoBottomRef = useRef<HTMLDivElement>(null);

  const sendEcho = async () => {
    if (!echoInput.trim() || echoThinking) return;
    const msg = echoInput.trim();
    setEchoInput("");
    setEchoMessages(prev => [...prev, { role:"user", text:msg }]);
    setEchoThinking(true);

    const excerpt = editor?.getText()?.slice(0, 500) || "";
    const echoHistory = echoMessages.map(m => m.role === "user" ? `You: ${m.text}` : `Echo: ${m.text}`);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `[Livre: "${bookTitle}" | Chapitre actuel extrait: "${excerpt.slice(0,200)}"]\n\n${msg}`,
          history: echoHistory,
          source: "books",
          selectedButtons: [echoMode],
          userTier: "connected_free",
          calendarEvents: {},
        }),
      });
      const data = await res.json();
      const reply = data.response || (typeof data === "string" ? data : "...");
      setEchoMessages(prev => [...prev, { role:"echo", text: reply }]);
    } catch {
      setEchoMessages(prev => [...prev, { role:"echo", text: T.serverErr }]);
    } finally {
      setEchoThinking(false);
    }
  };

  useEffect(() => { echoBottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [echoMessages, echoThinking]);

  const triggerPreset = (p: "print"|"kindle") => {
    applyPreset(p, { setMirrorMargins, setShowPageNumbers, setShowHeader, setShowFooter, setLineHeight, setFontSize, setIsJustified, setParaSpacing, setParaIndent });
    setActivePreset(p);
  };
  const triggerCustomPreset = () => {
    setActivePreset("custom");
    setShowSettings(true);
  };

  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setIsSettingsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const saveLabel = {
    saved:   { dot:"bg-emerald-400",             text: T.saved },
    saving:  { dot:"bg-amber-400 animate-pulse", text: T.saving },
    unsaved: { dot:"bg-zinc-500",               text: T.unsaved },
  }[saveStatus];

  const currentContent = chapters.find(c => c.id === activeChapter)?.content || "";

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

  const pageBgStyle = {
    backgroundColor: `rgba(${theme==="dark"?"9,9,11":"255,255,255"},${pageOpacity/100})`,
  };

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
        <div className="flex-1 overflow-y-auto flex items-start justify-center px-8 py-12" style={{scrollbarWidth:"thin",scrollbarColor:"rgba(6,182,212,0.15) transparent"}}>
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

      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* TOOLBAR */}
        <div className="w-[100px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col py-2 overflow-hidden">
          <div className="px-2 pb-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.struct}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <button onClick={() => editor?.commands.setHeading({ level: 1 })} className="p-1 text-xs border border-transparent hover:bg-zinc-800 rounded">T¹</button>
              <button onClick={() => editor?.commands.setHeading({ level: 2 })} className="p-1 text-xs border border-transparent hover:bg-zinc-800 rounded">T²</button>
              <button onClick={() => editor?.commands.setHeading({ level: 3 })} className="p-1 text-xs border border-transparent hover:bg-zinc-800 rounded">T³</button>
              <button onClick={() => editor?.commands.setParagraph()} className="p-1 text-xs border border-transparent hover:bg-zinc-800 rounded">¶</button>
            </div>
          </div>

          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.texte}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="B"  label={T.bold}   active={editor?.isActive("bold")}   onClick={toggleBold} />
              <TB icon="I"  label={T.italic} active={editor?.isActive("italic")} onClick={toggleItalic} />
              <TB icon="≡"  label={T.justify} active={isJustified} onClick={toggleJustify} />
              <TB icon="→"  label={T.indent} onClick={applyIndent} />
            </div>
          </div>

          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.pages}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="⊟"  label={T.pageBreak} active={showInvisibleChars} onClick={toggleInvisibleChars} />
              <TB icon="📑" label={T.toc}       onClick={insertTOC} />
              <TB icon="↓"  label={T.inject}    onClick={insertEndInjection} />
            </div>
          </div>

          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.police}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="A-" label={T.smaller} onClick={() => setFontSize(v => Math.max(10, v-1))} />
              <TB icon="A+" label={T.larger}  onClick={() => setFontSize(v => Math.min(32, v+1))} />
            </div>
            <div className="text-center font-mono text-[9px] text-zinc-500 mt-0.5">{fontSize}px</div>
          </div>

          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.media}</div>
            <div className="grid grid-cols-2 gap-0.5">
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
            <div className="flex flex-col gap-1">
              <button onClick={() => triggerPreset("print")} title={T.printPreset}
                className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded-lg text-[9px] font-medium border transition-all ${
                  activePreset === "print" ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400" : "border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 hover:border-zinc-700"
                }`}>
                <span className="truncate">{T.presetPrint}</span>
              </button>
              <button onClick={() => triggerPreset("kindle")} title={T.kindlePreset}
                className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded-lg text-[9px] font-medium border transition-all ${
                  activePreset === "kindle" ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400" : "border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 hover:border-zinc-700"
                }`}>
                <span className="truncate">{T.presetKindle}</span>
              </button>
              <button onClick={triggerCustomPreset} title={T.customPreset}
                className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded-lg text-[9px] font-medium border transition-all ${
                  activePreset === "custom" ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400" : "border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 hover:border-zinc-700"
                }`}>
                <span className="truncate">{T.presetCustom}</span>
              </button>
            </div>
          </div>
        </div>

        {/* EDITOR ZONE */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="h-9 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center px-3 gap-2">
            {(["edit","preview","present"] as BookView[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${view===v ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>
                {v==="edit" ? T.edit : v==="preview" ? T.preview : T.present}
              </button>
            ))}

            <div className="flex-1 flex items-center gap-1 overflow-x-auto mx-1" style={{scrollbarWidth:"none"}}>
              {chapters.map(ch => (
                <button key={ch.id} onClick={() => setActiveChapter(ch.id)}
                  className={`text-[9px] px-2 py-0.5 rounded border whitespace-nowrap transition-all ${activeChapter===ch.id ? "border-zinc-600 text-zinc-200 bg-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>
                  {ch.title}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${saveLabel.dot}`} />
              <span className="text-[9px] font-mono text-zinc-400">{saveLabel.text}</span>
            </div>
            <button onClick={saveToFile}
              className="text-[9px] px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:border-cyan-500/40 hover:text-cyan-400 transition-all font-mono">
              💾 {T.save}
            </button>

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
                  <div className="px-2 py-1.5">
                    <LangDropdown />
                  </div>
                </div>
              )}
            </div>
          </div>

          {showSettings && (
            <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/80 px-4 py-2 flex flex-wrap gap-x-4 gap-y-2 items-center text-[10px]">
              {[
                { label:T.mirror,  val:mirrorMargins,   set:setMirrorMargins },
                { label:T.pageNum, val:showPageNumbers, set:setShowPageNumbers },
                { label:T.header,  val:showHeader,      set:setShowHeader },
                { label:T.footer,  val:showFooter,      set:setShowFooter },
                { label:T.justify, val:isJustified,     set:setIsJustified },
                { label:T.paraIndentLbl, val:paraIndent, set:setParaIndent },
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

          <div className="flex-1 overflow-hidden min-h-0 relative"
            style={{ backgroundImage:"url('/eauplante2.png')", backgroundSize:"cover", backgroundPosition:"center" }}>
            <div className="absolute inset-0 bg-black/50 pointer-events-none z-0" />

            {WATER.map((d,i) => (
              <span key={i} aria-hidden="true" className="absolute pointer-events-none select-none z-[1]"
                style={{ top:d.top, left:d.left, right:d.right, fontSize:d.sz,
                  transform:`rotate(${d.rot})`, opacity:0.06, filter:"blur(1px)", color:"#06b6d4", lineHeight:1 }}>
                {d.g}
              </span>
            ))}

            <div className="absolute inset-0 overflow-y-auto flex items-start justify-center px-4 py-4 z-[2]"
              style={{ scrollbarWidth:"thin", scrollbarColor:"rgba(6,182,212,0.2) transparent" }}>

              <div className={`w-full shadow-2xl border border-zinc-200/10 dark:border-zinc-700/20 rounded-sm relative ${showInvisibleChars ? 'echo-editor-show-symbols' : ''}`}
                style={{
                  maxWidth:"860px",
                  minHeight:"calc(100% - 2rem)",
                  paddingTop:   showHeader ? 0 : "52px",
                  paddingBottom:showFooter ? 0 : "64px",
                  paddingLeft:  mirrorMargins ? "72px" : "56px",
                  paddingRight: "56px",
                  ...pageBgStyle,
                }}>

                <div className="absolute left-10 top-0 bottom-0 w-px pointer-events-none" style={{background:"rgba(6,182,212,0.06)"}} />

                {showHeader && (
                  <div className="h-9 border-b border-zinc-700/30 flex items-center px-4 mb-4">
                    <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-400">{bookTitle}</span>
                  </div>
                )}

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

                <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500 mb-3 font-mono">
                  {chapters.find(c=>c.id===activeChapter)?.title}
                </div>

                {view==="edit" ? (
                  <EditorContent 
                    editor={editor} 
                    className="outline-none min-h-[400px] text-black dark:text-zinc-100 caret-cyan-400 books-editor-tiptap"
                    style={{ fontSize: `${fontSize}px`, lineHeight }}
                  />
                ) : (
                  <div className="min-h-[400px] text-black dark:text-zinc-100 books-preview"
                    style={{ fontSize: `${fontSize}px`, fontFamily, lineHeight, textAlign: isJustified ? "justify" : "left" }}
                    dangerouslySetInnerHTML={{ __html: currentContent || `<p style="color:rgba(113,113,122,0.35);font-style:italic">${T.noContent}</p>` }}
                  />
                )}

                {showPageNumbers && (
                  <div className="absolute bottom-5 left-0 right-0 text-center text-[9px] text-zinc-400 font-mono pointer-events-none">
                    — {chapters.findIndex(c=>c.id===activeChapter)+1} —
                  </div>
                )}

                {showFooter && (
                  <div className="h-7 border-t border-zinc-700/30 flex items-center justify-center mt-6">
                    <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-400">{bookTitle}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

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
          <div className="h-9 shrink-0 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-3 gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-zinc-300">
              Echo — {fr ? "Écriture" : "Writing"}
            </span>
          </div>

          <div className="flex gap-1 p-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            {ECHO_MODES.map(m => (
              <button key={m.id} onClick={() => setEchoMode(m.id)}
                className={`flex-1 text-[9px] py-1 rounded-lg border transition-all text-center ${echoMode===m.id ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" : "border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"}`}>
                {m.emoji} {T[m.key]}
              </button>
            ))}
          </div>

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

      <input ref={fileInputRef}  type="file" accept=".txt,.md,.markdown" onChange={handleImportTxt}  className="hidden" />
      <input ref={imgInputRef}   type="file" accept="image/*"            className="hidden" />
      <input ref={importJsonRef} type="file" accept=".json"              onChange={handleImportJson} className="hidden" />

      {/* ── DESIGN CHIRURGICAL ET STRUCTURE DE RENDU TIPTAP ── */}
      <style>{`
        .books-editor-tiptap .ProseMirror {
          min-height: 400px;
          outline: none;
          color: inherit;
        }

        .books-editor-tiptap .ProseMirror p, .books-preview p, .books-present p {
          margin-top: 0 !important;
          margin-bottom: ${paraSpacing}em !important;
          line-height: inherit !important;
          text-indent: ${paraIndent ? "1.5em" : "0"};
        }

        .echo-editor-show-symbols .ProseMirror p:after {
          content: " ¶" !important;
          color: rgba(6, 182, 212, 0.35) !important;
          font-size: 0.95em !important;
          font-weight: bold !important;
          font-family: monospace !important;
        }

        .books-editor-tiptap .ProseMirror h1, .books-preview h1 {
          font-size: 1.6em;
          font-weight: 700;
          margin-top: 1.2em !important;
          margin-bottom: 0.6em !important;
          border-bottom: 1px solid rgba(6,182,212,0.1);
          padding-bottom: .12em;
        }
        .books-editor-tiptap .ProseMirror h2, .books-preview h2 {
          font-size: 1.2em;
          font-weight: 600;
          margin-top: 1.6em !important;
          margin-bottom: 0.5em !important;
          text-transform: uppercase;
          color: rgb(6,182,212);
        }

        .echo-injection-block {
          user-select: none;
          -webkit-user-select: none;
        }

        .echo-toc-block {
          user-select: none;
          -webkit-user-select: none;
        }
      `}</style>
    </main>
  );
}