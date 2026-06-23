"use client";

import { useState, useEffect, useRef, useCallback, ReactNode } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { useApp } from "../../context/AppContext";
import { checkQuota, UserTier } from "../../utils/quota";
import LangDropdown from "../components/LangDropdown";
import TutorialHeaderControls from "../components/TutorialHeaderControls";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { TextAlign } from "@tiptap/extension-text-align";

type EchoMode    = "creative" | "ideas" | "critical";
type BookView    = "edit" | "present";
type BookMessage = { role: "user" | "echo"; text: string };
type Chapter     = { id: string; title: string; content: string };

const I: Record<"fr"|"en", Record<string,string>> = {
  fr: {
    home:"Accueil", chat:"Chat", books:"Livres", calendar:"Calendrier",
    vitality:"Vitalite", services:"Services", account:"Compte", history:"Historique",
    mode:"Forfait", edit:"Editer", present:"Lire",
    saved:"Sauvegarde", saving:"Sauvegarde...", unsaved:"Non sauvegarde",
    save:"Sauv.", newChapter:"Nouveau chapitre",
    settings:"Parametres", lightMode:"Mode Clair", darkMode:"Mode Sombre",
    mirror:"Miroir marges", pageNum:"N pages", header:"En-tete",
    justify:"Justifie", lineH:"Interligne", font:"Police", opacity:"Opacite page",
    struct:"struct", texte:"texte", pages:"pages", police:"police",
    media:"media", livre:"livre", presets:"presets", align:"alignement",
    t1:"Titre 1", t2:"Titre 2", t3:"Titre 3", normal:"Texte normal",
    bold:"Gras", italic:"Italique", indent:"Alinea", showMarks:"Marques",
    smaller:"Reduire", larger:"Agrandir",
    importTxt:"Import TXT", openBook:"Ouvrir .echo-book",
    alignLeft:"Gauche", alignCenter:"Centre", alignRight:"Droite", alignJustify:"Justifie",
    creative:"Creatif", ideas:"Idees", critical:"Critique",
    echoPlaceholder:"Demande a Echo d'ecrire un passage...\n\nDis-lui 'injecte' pour qu'il ajoute le texte dans ton livre.",
    echoInput:"Demande a Echo...", export:"Export",
    noContent:"Aucun contenu.", titleHint:"Double-cliquer pour modifier",
    chapterHint:"Double-cliquer pour renommer",
    prevChapter:"Precedent", nextChapter:"Suivant", closePres:"Fermer",
    serverErr:"Impossible de joindre le serveur.",
    presetPrint:"Impression", presetKindle:"Kindle", presetCustom:"Personnalise",
    importFont:"Importer police", pageOf:"sur",
    chapterSelect:"Selectionner chapitre", inject:"Injecter",
    quotaLimit:"Limite d'actions Echo atteinte pour ce cycle.",
  },
  en: {
    home:"Home", chat:"Chat", books:"Books", calendar:"Calendar",
    vitality:"Vitality", services:"Services", account:"Account", history:"History",
    mode:"Plan", edit:"Edit", present:"Present",
    saved:"Saved", saving:"Saving...", unsaved:"Unsaved",
    save:"Save", newChapter:"New chapter",
    settings:"Settings", lightMode:"Light Mode", darkMode:"Dark Mode",
    mirror:"Mirror margins", pageNum:"Page #", header:"Header",
    justify:"Justify", lineH:"Line-h", font:"Font", opacity:"Page opacity",
    struct:"struct", texte:"text", pages:"pages", police:"size",
    media:"media", livre:"book", presets:"presets", align:"align",
    t1:"Title 1", t2:"Title 2", t3:"Title 3", normal:"Normal text",
    bold:"Bold", italic:"Italic", indent:"Indent", showMarks:"Show marks",
    smaller:"Smaller", larger:"Larger",
    importTxt:"Import TXT", openBook:"Open .echo-book",
    alignLeft:"Left", alignCenter:"Center", alignRight:"Right", alignJustify:"Justify",
    creative:"Creative", ideas:"Ideas", critical:"Critical",
    echoPlaceholder:"Ask Echo to write a passage...\n\nSay 'inject' to have Echo add the text into your book.",
    echoInput:"Ask Echo...", export:"Export",
    noContent:"No content yet.", titleHint:"Double-click to edit",
    chapterHint:"Double-click to rename",
    prevChapter:"Previous", nextChapter:"Next", closePres:"Close",
    serverErr:"Cannot reach the server.",
    presetPrint:"Print", presetKindle:"Kindle", presetCustom:"Custom",
    importFont:"Import Font", pageOf:"of",
    chapterSelect:"Select chapter", inject:"Inject",
    quotaLimit:"Echo action limit reached for this cycle.",
  },
};

// ── ECHO MODE TABS — SVG icons so they never disappear ───────────────────────
const ECHO_MODES: { id: EchoMode; key: "creative"|"ideas"|"critical"; icon: ReactNode }[] = [
  {
    id: "creative", key: "creative",
    icon: (
      <svg viewBox="0 0 18 18" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 15l2-5L13 2a2 2 0 0 1 3 3L8 13z"/>
        <line x1="11" y1="4" x2="14" y2="7"/>
        <line x1="3" y1="15" x2="5" y2="10"/>
      </svg>
    ),
  },
  {
    id: "ideas", key: "ideas",
    icon: (
      <svg viewBox="0 0 18 18" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4"/>
        <line x1="9" y1="11" x2="9" y2="13"/>
        <line x1="7" y1="15" x2="11" y2="15"/>
        <line x1="6" y1="13" x2="12" y2="13"/>
      </svg>
    ),
  },
  {
    id: "critical", key: "critical",
    icon: (
      <svg viewBox="0 0 18 18" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="7"/>
        <line x1="9" y1="5" x2="9" y2="9"/>
        <circle cx="9" cy="12" r="0.8" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
];

const A4_W = 860;
const A4_H = 1122;

// ── TOOLBAR SVG ICONS ─────────────────────────────────────────────────────────
const Icons: Record<string, ReactNode> = {
  T1: <span className="font-black text-[12px] leading-none" style={{fontFamily:"Georgia,serif"}}>T<sup className="text-[8px]">1</sup></span>,
  T2: <span className="font-black text-[12px] leading-none" style={{fontFamily:"Georgia,serif"}}>T<sup className="text-[8px]">2</sup></span>,
  T3: <span className="font-bold  text-[12px] leading-none" style={{fontFamily:"Georgia,serif"}}>T<sup className="text-[8px]">3</sup></span>,
  Abc: (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor">
      <path d="M8 2h4v1.2h-1.2V14H9.6V3.2H8a2.8 2.8 0 0 0 0 5.6h.8V10H8a4 4 0 0 1 0-8z"/>
    </svg>
  ),
  B: <span className="font-black text-[15px] leading-none" style={{fontFamily:"Georgia,serif"}}>B</span>,
  I: <span className="font-semibold text-[15px] leading-none" style={{fontFamily:"Georgia,serif", fontStyle:"italic"}}>I</span>,
  indent: (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="2" y1="4" x2="14" y2="4"/>
      <line x1="6" y1="8" x2="14" y2="8"/>
      <line x1="6" y1="12" x2="14" y2="12"/>
      <polyline points="2,7 4,9 2,11" fill="currentColor" stroke="none"/>
    </svg>
  ),
  alignL: (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="7" x2="10" y2="7"/>
      <line x1="2" y1="10" x2="13" y2="10"/><line x1="2" y1="13" x2="8" y2="13"/>
    </svg>
  ),
  alignC: (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="2" y1="4" x2="14" y2="4"/><line x1="4" y1="7" x2="12" y2="7"/>
      <line x1="2" y1="10" x2="14" y2="10"/><line x1="5" y1="13" x2="11" y2="13"/>
    </svg>
  ),
  alignR: (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="2" y1="4" x2="14" y2="4"/><line x1="6" y1="7" x2="14" y2="7"/>
      <line x1="3" y1="10" x2="14" y2="10"/><line x1="8" y1="13" x2="14" y2="13"/>
    </svg>
  ),
  alignJ: (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="7" x2="14" y2="7"/>
      <line x1="2" y1="10" x2="14" y2="10"/><line x1="2" y1="13" x2="14" y2="13"/>
    </svg>
  ),
  pilcrow: (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor">
      <path d="M8 2h4v1.2h-1.2V14H9.6V3.2H8a2.8 2.8 0 0 0 0 5.6h.8V10H8a4 4 0 0 1 0-8z"/>
    </svg>
  ),
  pageBreak: (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="2" y1="5" x2="14" y2="5"/>
      <line x1="2" y1="11" x2="14" y2="11" strokeDasharray="2 1.5"/>
      <line x1="2" y1="8" x2="5" y2="8"/><line x1="11" y1="8" x2="14" y2="8"/>
      <polyline points="6,6 8,8 10,6" fill="none"/><polyline points="6,10 8,8 10,10" fill="none"/>
    </svg>
  ),
  fontSmaller: (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor">
      <text x="1" y="12" fontSize="11" fontFamily="serif" fontWeight="700">A</text>
      <text x="9" y="13" fontSize="7" fontFamily="serif">−</text>
    </svg>
  ),
  fontLarger: (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor">
      <text x="1" y="12" fontSize="11" fontFamily="serif" fontWeight="700">A</text>
      <text x="9" y="13" fontSize="7" fontFamily="serif">+</text>
    </svg>
  ),
  importTxt: (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6z"/>
      <polyline points="9,2 9,6 13,6"/>
      <line x1="8" y1="7" x2="8" y2="11"/><polyline points="6,9 8,7 10,9"/>
    </svg>
  ),
  openBook: (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h4a2 2 0 0 1 2 2v8a1.5 1.5 0 0 0-2-1.5H2z"/>
      <path d="M14 3h-4a2 2 0 0 0-2 2v8a1.5 1.5 0 0 1 2-1.5h4z"/>
    </svg>
  ),
  importFont: (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <text x="1" y="12" fontSize="11" fontFamily="serif" fontWeight="700" fontStyle="italic" fill="currentColor" stroke="none">A</text>
      <line x1="11" y1="8" x2="11" y2="14"/><line x1="8.5" y1="11" x2="13.5" y2="11"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2"/>
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/>
    </svg>
  ),
  addChapter: (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/>
    </svg>
  ),
  presetPrint: (
    <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="10" height="6" rx="1"/>
      <path d="M4 5V3h6v2"/>
      <rect x="4" y="8" width="6" height="1.5" rx="0.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  presetKindle: (
    <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="1" width="10" height="12" rx="1.5"/>
      <line x1="4" y1="4" x2="10" y2="4"/><line x1="4" y1="6" x2="10" y2="6"/>
      <line x1="4" y1="8" x2="8" y2="8"/>
      <circle cx="7" cy="11" r="0.8" fill="currentColor" stroke="none"/>
    </svg>
  ),
  presetCustom: (
    <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="2.2"/>
      <path d="M7 1.5v1.5M7 11v1.5M1.5 7H3M11 7h1.5M3.2 3.2l1 1M9.8 9.8l1 1M3.2 10.8l1-1M9.8 4.2l1-1"/>
    </svg>
  ),
};

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1500);
}

function applyPreset(preset: "print"|"kindle", s: {
  setMirrorMargins:(v:boolean)=>void; setShowPageNumbers:(v:boolean)=>void;
  setShowHeader:(v:boolean)=>void; setLineHeight:(v:number)=>void;
  setFontSize:(v:number)=>void; setIsJustified:(v:boolean)=>void;
}) {
  if (preset === "print") {
    s.setMirrorMargins(true); s.setShowPageNumbers(true); s.setShowHeader(true);
    s.setLineHeight(1.8); s.setFontSize(12); s.setIsJustified(true);
  } else {
    s.setMirrorMargins(false); s.setShowPageNumbers(false); s.setShowHeader(false);
    s.setLineHeight(1.6); s.setFontSize(14); s.setIsJustified(false);
  }
}

export default function BooksPage() {
  const { lang, theme, toggleTheme, userTier } = useApp();
  const fr = lang === "fr";
  const T  = I[lang as "fr"|"en"] ?? I.fr;
  const safeTier = (userTier || "connected_free") as UserTier;

  const [userId,   setUserId]   = useState<string|null>(null);
  const [bookDbId, setBookDbId] = useState<string|null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([{ id:"ch1", title:fr?"Chapitre 1":"Chapter 1", content:"" }]);
  const [activeChapter, setActiveChapter] = useState("ch1");
  const [bookTitle, setBookTitle] = useState(fr?"Mon Premier Livre":"My First Book");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingChapterTitle, setIsEditingChapterTitle] = useState(false);
  const [view, setView] = useState<BookView>("edit");
  const titleInputRef        = useRef<HTMLInputElement>(null);
  const chapterTitleInputRef = useRef<HTMLInputElement>(null);
  const [showChapterDropdown, setShowChapterDropdown] = useState(false);
  const chapterDropRef = useRef<HTMLDivElement>(null);

  const [mirrorMargins, setMirrorMargins]         = useState(false);
  const [showPageNumbers, setShowPageNumbers]     = useState(true);
  const [showHeader, setShowHeader]               = useState(false);
  const [fontSize, setFontSize]                   = useState(14);
  const [fontFamily, setFontFamily]               = useState("Georgia, serif");
  const [customFonts, setCustomFonts]             = useState<string[]>([]);
  const [lineHeight, setLineHeight]               = useState(1.8);
  const [isJustified, setIsJustified]             = useState(true);
  const [activePreset, setActivePreset]           = useState<"print"|"kindle"|"custom"|null>(null);
  const [pageOpacity, setPageOpacity]             = useState(95);
  const [showInvisibleChars, setShowInvisibleChars] = useState(false);
  const [showSettings, setShowSettings]           = useState(true);
  const [showSaveConfirm, setShowSaveConfirm]     = useState(false);
  const [showLimitModal, setShowLimitModal]       = useState(false);
  const [tutorialStep, setTutorialStep]           = useState<number|null>(null);

  useEffect(() => {
    if (!localStorage.getItem("echo-tuto-books-done-v1")) setTutorialStep(1);
  }, []);

  const [pageCount, setPageCount] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePageCount = useCallback(() => {
    if (containerRef.current)
      setPageCount(Math.max(1, Math.ceil(containerRef.current.scrollHeight / A4_H)));
  }, []);

  useEffect(() => { const t = setTimeout(updatePageCount, 150); return () => clearTimeout(t); }, [chapters, activeChapter, view, updatePageCount]);
  useEffect(() => { window.addEventListener("resize", updatePageCount); return () => window.removeEventListener("resize", updatePageCount); }, [updatePageCount]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1,2,3] } }),
      FontFamily,
      TextAlign.configure({ types: ["heading","paragraph"] }),
      TextStyle.extend({
        addAttributes() {
          return { fontSize: { default: null, parseHTML: el => el.style.fontSize || null, renderHTML: attrs => attrs.fontSize ? { style:`font-size:${attrs.fontSize}` } : {} } };
        },
      }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setChapters(prev => prev.map(c => c.id===activeChapter ? {...c, content:html} : c));
      setTimeout(updatePageCount, 50);
    },
  });

  useEffect(() => {
    if (!editor || view !== "edit") return;
    const cur = chapters.find(c => c.id === activeChapter);
    const newContent = cur?.content || "<p></p>";
    if (editor.getHTML() !== newContent) editor.commands.setContent(newContent);
  }, [activeChapter, view]);

  useEffect(() => { if (editor) editor.commands.setFontFamily(fontFamily); }, [fontFamily, editor]);

  const toggleBold   = () => editor?.chain().focus().toggleBold().run();
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run();

  const changeFontSize = (delta: number) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from !== to) {
      const current = parseInt(editor.getAttributes("textStyle").fontSize) || fontSize;
      const next = Math.min(72, Math.max(8, current + delta));
      editor.chain().focus().setMark("textStyle", { fontSize:`${next}px` }).run();
    } else {
      const next = Math.min(72, Math.max(8, fontSize + delta));
      setFontSize(next);
      editor.chain().focus().setMark("textStyle", { fontSize:`${next}px` }).run();
    }
  };

  const insertIndent    = () => { editor?.chain().focus().insertContent('\u00a0\u00a0\u00a0\u00a0').run(); };
  const insertPageBreak = () => {
    editor?.commands.insertContent(
      `<div data-page-break="true" contenteditable="false" style="user-select:none;border-top:2px dashed rgba(6,182,212,0.4);margin:2rem 0;text-align:center;font-size:9px;color:rgba(6,182,212,0.5);letter-spacing:0.3em;padding-top:6px;font-family:monospace;">── ${fr?"SAUT DE PAGE":"PAGE BREAK"} ──</div><p></p>`
    );
  };

  const injectTextAtEnd = (text: string) => {
    if (!editor) return;
    const { doc } = editor.state;
    editor.chain().focus().setTextSelection(doc.content.size - 1).insertContent(`<p>${text}</p>`).run();
  };

  const addChapter = () => {
    const id = `ch${Date.now()}`;
    setChapters(prev => [...prev, { id, title:fr?`Chapitre ${prev.length+1}`:`Chapter ${prev.length+1}`, content:"" }]);
    setActiveChapter(id);
    setShowChapterDropdown(false);
  };

  useEffect(() => {
    const h = (e: MouseEvent) => { if (chapterDropRef.current && !chapterDropRef.current.contains(e.target as Node)) setShowChapterDropdown(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const [saveStatus, setSaveStatus] = useState<"saved"|"saving"|"unsaved">("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const saveToSupabase = useCallback(async (currentChapters: Chapter[], currentTitle: string) => {
    const payload = { bookTitle: currentTitle, chapters: currentChapters };
    localStorage.setItem("echo-books-manuscript", JSON.stringify(payload));
    if (!userId) { setSaveStatus("saved"); return; }
    setSaveStatus("saving");
    try {
      if (bookDbId) {
        await supabase.from("echo_conversations").update({ messages: [payload], updated_at: new Date().toISOString() }).eq("id", bookDbId).eq("user_id", userId);
      } else {
        const { data } = await supabase.from("echo_conversations").insert({ user_id:userId, source:"books", messages:[payload], updated_at:new Date().toISOString() }).select("id").single();
        if (data?.id) setBookDbId(data.id);
      }
    } catch (e) { console.error("[Books] save:", e); }
    setSaveStatus("saved");
  }, [userId, bookDbId]);

  useEffect(() => {
    setSaveStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveToSupabase(chapters, bookTitle), 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [chapters, bookTitle]);

  const manualSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveToSupabase(chapters, bookTitle);
    setShowSaveConfirm(true);
    setTimeout(() => setShowSaveConfirm(false), 2000);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      if (uid) {
        const { data: rows } = await supabase.from("echo_conversations").select("id,messages").eq("user_id", uid).eq("source", "books").order("updated_at", { ascending: false }).limit(1);
        if (rows?.[0]) {
          setBookDbId(rows[0].id);
          try {
            const raw = rows[0].messages?.[0];
            const p = typeof raw === "string" ? JSON.parse(raw) : raw;
            if (p?.bookTitle) setBookTitle(p.bookTitle);
            if (p?.chapters?.length) {
              setChapters(p.chapters); setActiveChapter(p.chapters[0].id);
              setTimeout(() => { if (editor) editor.commands.setContent(p.chapters[0].content || "<p></p>"); }, 100);
            }
            setSaveStatus("saved"); return;
          } catch (e) { console.error("[Books]", e); }
        }
      }
      const raw = localStorage.getItem("echo-books-manuscript");
      if (raw) {
        try {
          const { bookTitle: t, chapters: c } = JSON.parse(raw);
          if (t) setBookTitle(t);
          if (c?.length) { setChapters(c); setActiveChapter(c[0].id); setTimeout(() => { if (editor) editor.commands.setContent(c[0].content || "<p></p>"); }, 100); }
        } catch {}
      }
      setSaveStatus("saved");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_, s) => setUserId(s?.user?.id || null));
    return () => listener.subscription.unsubscribe();
  }, []);

  const [echoPanelWidth, setEchoPanelWidth] = useState(280);
  const [isDesktop, setIsDesktop] = useState(false);
  const resizingRef = useRef(false);

  useEffect(() => {
    const c = () => setIsDesktop(window.innerWidth >= 1024);
    c(); window.addEventListener("resize", c); return () => window.removeEventListener("resize", c);
  }, []);

  const startResizeEcho = (e: React.MouseEvent) => {
    e.preventDefault(); resizingRef.current = true;
    document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
  };
  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (resizingRef.current) setEchoPanelWidth(Math.min(520, Math.max(220, window.innerWidth - e.clientX))); };
    const onUp   = () => { if (!resizingRef.current) return; resizingRef.current = false; document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const fontInputRef  = useRef<HTMLInputElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const importJsonRef = useRef<HTMLInputElement>(null);

  const handleFontImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^.]+$/, "");
    const face = new FontFace(name, `url(${url})`);
    face.load().then(loaded => {
      document.fonts.add(loaded); setCustomFonts(prev => [...prev, name]);
      setFontFamily(`"${name}", serif`); if (editor) editor.commands.setFontFamily(`"${name}", serif`);
    }).catch(err => console.error("[Font]", err));
  };

  const handleImportTxt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const id = `ch${Date.now()}`;
      const html = (reader.result as string).split(/\n\n+/).map(p => `<p>${p.replace(/\n/g,"<br>")}</p>`).join("");
      setChapters(prev => [...prev, {id, title:file.name.replace(/\.[^.]+$/,""), content:html}]);
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
        const { bookTitle: t, chapters: c } = JSON.parse(reader.result as string);
        if (t) setBookTitle(t); if (c?.length) { setChapters(c); setActiveChapter(c[0].id); }
      } catch { alert(fr?"Fichier invalide.":"Invalid file."); }
    };
    reader.readAsText(file);
  };

  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleExport = async (fmt: string) => {
    setShowExportMenu(false);
    const slug = bookTitle.replace(/\s+/g, "_");
    const currentHtml = chapters.find(c => c.id===activeChapter)?.content || "";
    if (fmt === "txt") {
      const txt = chapters.map(c => `=== ${c.title} ===\n\n${c.content.replace(/<[^>]+>/g,"").replace(/&nbsp;/g," ")}`).join("\n\n\n");
      downloadBlob(new Blob([txt], {type:"text/plain"}), `${slug}.txt`); return;
    }
    if (fmt === "json") { downloadBlob(new Blob([JSON.stringify({bookTitle,chapters},null,2)], {type:"application/json"}), `${slug}.echo-book.json`); return; }
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/export`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({format:fmt, title:bookTitle, html:currentHtml}) });
      if (!res.ok) { const err = await res.json(); alert(`Export error: ${err.error}`); return; }
      const blob = await res.blob();
      downloadBlob(blob, `${slug}${fmt==="pdf"?".pdf":fmt==="docx"?".docx":".epub"}`);
    } catch(e) { alert(`Cannot reach export server: ${e}`); }
  };

  const [echoMode, setEchoMode]         = useState<EchoMode|null>(null);
  const [echoMessages, setEchoMessages] = useState<BookMessage[]>([]);
  const [echoInput, setEchoInput]       = useState("");
  const [echoThinking, setEchoThinking] = useState(false);
  const echoBottomRef = useRef<HTMLDivElement>(null);

  const sendEcho = async () => {
    if (!echoInput.trim() || echoThinking) return;
    const quotaStatus = checkQuota("vitality_actions", safeTier);
    if (!quotaStatus.allowed) { setShowLimitModal(true); return; }
    const msg = echoInput.trim(); setEchoInput("");
    setEchoMessages(prev => [...prev, {role:"user", text:msg}]); setEchoThinking(true);
    const history = echoMessages.map(m => m.role==="user" ? `You: ${m.text}` : `Echo: ${m.text}`);
    const excerpt = editor?.getText()?.slice(0, 300) || "";
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/books`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ message:`[Livre: "${bookTitle}" | Extrait: "${excerpt}"]\n\n${msg}`, history, selectedButtons:echoMode?[echoMode]:[], userTier:safeTier, bookTitle }) });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      const reply = data.response || "...";
      if (data.inject && (data.inject_text || data.injected_text)) {
        const injected = data.inject_text || data.injected_text;
        injectTextAtEnd(injected);
        const updatedChapters = chapters.map(c => c.id === activeChapter ? {...c, content: editor?.getHTML() || c.content} : c);
        saveToSupabase(updatedChapters, bookTitle);
        setEchoMessages(prev => [...prev, {role:"echo", text:`${reply}\n\n${fr?"Texte injecte dans le chapitre.":"Text injected into chapter."}`}]);
      } else { setEchoMessages(prev => [...prev, {role:"echo", text:reply}]); }
    } catch { setEchoMessages(prev => [...prev, {role:"echo", text:T.serverErr}]); }
    finally { setEchoThinking(false); }
  };

  const handleManualInject = () => {
    const lastEcho = [...echoMessages].reverse().find(m => m.role==="echo");
    if (!lastEcho) return;
    injectTextAtEnd(lastEcho.text);
    const updatedChapters = chapters.map(c => c.id === activeChapter ? {...c, content: editor?.getHTML() || c.content} : c);
    saveToSupabase(updatedChapters, bookTitle);
    setEchoMessages(prev => [...prev, {role:"echo", text:fr?"Texte injecte a la fin du chapitre.":"Text injected at end of chapter."}]);
  };

  useEffect(() => { echoBottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [echoMessages, echoThinking]);

  const triggerPreset = (p: "print"|"kindle") => {
    applyPreset(p, {setMirrorMargins, setShowPageNumbers, setShowHeader, setLineHeight, setFontSize, setIsJustified});
    setActivePreset(p);
    if (p === "print") editor?.chain().focus().setTextAlign("justify").run();
    else editor?.chain().focus().unsetTextAlign().run();
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setIsSettingsOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const saveLabel = { saved:{dot:"bg-emerald-400",text:T.saved}, saving:{dot:"bg-amber-400 animate-pulse",text:T.saving}, unsaved:{dot:"bg-zinc-500",text:T.unsaved} }[saveStatus];
  const currentChapter = chapters.find(c => c.id === activeChapter);
  const currentContent = currentChapter?.content || "";
  const pageBgStyle    = { backgroundColor:`rgba(${theme==="dark"?"9,9,11":"255,255,255"},${pageOpacity/100})` };

  // ── TOOLBAR BUTTON ────────────────────────────────────────────────────────
  const TB = ({icon, label, active, onClick}: {icon:ReactNode; label:string; active?:boolean; onClick:()=>void}) => (
    <button onClick={onClick} title={label}
      className={`group relative w-[46px] h-9 flex items-center justify-center rounded-lg transition-all border select-none ${
        active ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400" : "border-cyan-500/15 text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100 hover:border-cyan-500/35"
      }`}>
      {icon}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 rounded bg-zinc-800 text-[9px] text-zinc-200 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-zinc-700 shadow-lg">
        {label}
      </span>
    </button>
  );

  // ── PRESENT MODE ──────────────────────────────────────────────────────────
  if (view === "present") return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      <div className="flex items-center justify-between px-8 py-3 border-b border-zinc-800">
        <span className="text-zinc-400 text-sm font-mono">{bookTitle}</span>
        <div className="flex items-center gap-3">
          {chapters.map((ch,i) => (
            <button key={ch.id} onClick={() => setActiveChapter(ch.id)}
              className={`text-[9px] px-2 py-0.5 rounded border transition-all ${activeChapter===ch.id?"border-cyan-500/40 text-cyan-400":"border-zinc-800 text-zinc-600 hover:text-zinc-400"}`}>{i+1}</button>
          ))}
          <button onClick={() => setView("edit")} className="text-[10px] px-3 py-1 rounded border border-zinc-700 text-zinc-400 hover:border-red-500/40 hover:text-red-400 transition-all">✕ {T.closePres}</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto flex items-start justify-center px-8 py-12">
        <div className="w-full max-w-[65ch]" style={{fontSize:`${fontSize+2}px`, fontFamily, lineHeight:lineHeight+0.1, color:"#e4e4e7"}}>
          <h1 className="text-3xl font-bold text-white mb-8 border-b border-zinc-800 pb-4">{bookTitle}</h1>
          <div className="text-[11px] uppercase tracking-widest text-cyan-500/60 font-mono mb-4">{currentChapter?.title}</div>
          <div className="books-present" style={{textAlign:isJustified?"justify":"left"}} dangerouslySetInnerHTML={{__html:currentContent||`<p style="color:rgba(113,113,122,0.3);font-style:italic">${T.noContent}</p>`}}/>
        </div>
      </div>
      <div className="flex justify-between px-8 py-3 border-t border-zinc-800">
        <button onClick={() => { const i=chapters.findIndex(c=>c.id===activeChapter); if(i>0) setActiveChapter(chapters[i-1].id); }} disabled={chapters.findIndex(c=>c.id===activeChapter)===0} className="text-[10px] px-3 py-1 rounded border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-all disabled:opacity-30">← {T.prevChapter}</button>
        <span className="text-[9px] font-mono text-zinc-600">{chapters.findIndex(c=>c.id===activeChapter)+1} {T.pageOf} {chapters.length}</span>
        <button onClick={() => { const i=chapters.findIndex(c=>c.id===activeChapter); if(i<chapters.length-1) setActiveChapter(chapters[i+1].id); }} disabled={chapters.findIndex(c=>c.id===activeChapter)===chapters.length-1} className="text-[10px] px-3 py-1 rounded border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-all disabled:opacity-30">{T.nextChapter} →</button>
      </div>
    </div>
  );

  return (
    <main className="h-screen bg-white dark:bg-black text-black dark:text-white flex overflow-hidden font-sans transition-colors duration-200 selection:bg-cyan-500/30 relative">

      {/* TUTORIAL */}
      {tutorialStep === 1 && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[92vw] max-w-[460px] sm:max-w-[640px] max-h-[85vh] overflow-y-auto bg-zinc-950 text-white dark:bg-white dark:text-black rounded-2xl p-6 shadow-[0_0_35px_rgba(6,182,212,0.6)] border-2 border-cyan-400 dark:border-cyan-500 animate-in fade-in slide-in-from-top-4 duration-300 z-50">
          <TutorialHeaderControls onClose={() => { setTutorialStep(null); localStorage.setItem("echo-tuto-books-done-v1","true"); }} />
          <div className="flex items-center gap-3 mb-4 border-b border-zinc-800 dark:border-zinc-200 pb-2 pr-16">
            <span className="text-xl">📚</span>
            <h4 className="font-black text-sm sm:text-base font-mono uppercase tracking-widest text-cyan-400 dark:text-cyan-600">{fr?"ECHO LIVRES (1/1)":"ECHO BOOKS (1/1)"}</h4>
          </div>
          <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start mb-5">
            <div className="shrink-0 bg-zinc-900 dark:bg-zinc-100 p-1.5 rounded-full border border-zinc-800 dark:border-zinc-200">
              <img src="/echo1.png" alt="Echo Mini" className="w-16 h-16 rounded-full object-cover" />
            </div>
            <div className="text-xs sm:text-[13.5px] text-zinc-200 dark:text-zinc-800 leading-relaxed font-semibold space-y-3 whitespace-pre-line flex-1">
              {fr ? <>Bienvenue dans l'atelier d'écriture ! 📖{"\n"}Texte de présentation à remplacer.</> : <>Welcome to the writing studio! 📖{"\n"}Placeholder presentation text to replace.</>}
            </div>
          </div>
          <button onClick={() => { setTutorialStep(null); localStorage.setItem("echo-tuto-books-done-v1","true"); }}
            className="w-full text-center py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs tracking-widest transition-all shadow-md uppercase">
            {fr?"C'EST PARTI 🚀":"LET'S GO 🚀"}
          </button>
        </div>
      )}

      {/* LIMIT MODAL */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShowLimitModal(false)}>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 text-xl">🔒</div>
            <h3 className="font-bold text-sm mb-2 uppercase font-mono">{fr?"Limite Atteinte":"Limit Reached"}</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">{T.quotaLimit}</p>
            <button onClick={() => setShowLimitModal(false)} className="w-full bg-cyan-600 text-white py-2.5 rounded-xl text-xs font-semibold">OK</button>
          </div>
        </div>
      )}

      {/* NAV SIDEBAR */}
      <aside className="w-44 shrink-0 border-r border-zinc-200 dark:border-zinc-800 px-5 py-6 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between">
        <div className="space-y-20">
          <h2 className="font-bold"><Link href="/" className="text-cyan-600 dark:text-cyan-400">🏢{T.home}</Link></h2>
          <div className="space-y-20 text-zinc-800 dark:text-zinc-100 font-medium text-sm">
            <Link href="/chat"       className="block hover:text-cyan-500">💬{T.chat}</Link>
            <Link href="/books"      className="block text-cyan-500 font-bold">📚{T.books}</Link>
            <Link href="/calendar"   className="block hover:text-cyan-500">📅{T.calendar}</Link>
            <Link href="/vitality"   className="block hover:text-cyan-500">📈{T.vitality}</Link>
            <Link href="/services"   className="block hover:text-cyan-500">💎{T.services}</Link>
            <Link href="/account"    className="block hover:text-cyan-500">👤{T.account}</Link>
            <Link href="/horizonweb" className="block hover:text-cyan-500">📡HorizonWeb</Link>
            <hr className="border-zinc-200 dark:border-zinc-800"/>
            <Link href="/history"    className="block hover:text-amber-500">⭐{T.history}</Link>
          </div>
        </div>
        <div className="text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 pt-3">
          {T.mode} : <span className="text-cyan-500 dark:text-cyan-400 uppercase font-black tracking-wider block">{safeTier === "connected_free" ? "Accès libre" : safeTier}</span>
        </div>
      </aside>

      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* TOOLBAR */}
        <div className="w-[130px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col py-2 overflow-y-auto overflow-x-hidden">

          <div className="px-2 pb-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.struct}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon={Icons.T1}  label={T.t1}     active={editor?.isActive("heading",{level:1})} onClick={() => { editor?.chain().focus().toggleHeading({level:1}).run(); setTimeout(manualSave,500); }}/>
              <TB icon={Icons.T2}  label={T.t2}     active={editor?.isActive("heading",{level:2})} onClick={() => { editor?.chain().focus().toggleHeading({level:2}).run(); setTimeout(manualSave,500); }}/>
              <TB icon={Icons.T3}  label={T.t3}     active={editor?.isActive("heading",{level:3})} onClick={() => { editor?.chain().focus().toggleHeading({level:3}).run(); setTimeout(manualSave,500); }}/>
              <TB icon={Icons.Abc} label={T.normal} active={editor?.isActive("paragraph")}         onClick={() => { editor?.chain().focus().setParagraph().run(); setTimeout(manualSave,500); }}/>
            </div>
          </div>

          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.texte}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon={Icons.B}      label={T.bold}   active={editor?.isActive("bold")}   onClick={toggleBold}/>
              <TB icon={Icons.I}      label={T.italic} active={editor?.isActive("italic")} onClick={toggleItalic}/>
              <TB icon={Icons.indent} label={T.indent} onClick={insertIndent}/>
            </div>
          </div>

          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.align}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon={Icons.alignL} label={T.alignLeft}    active={editor?.isActive({textAlign:"left"})}    onClick={() => { editor?.chain().focus().setTextAlign("left").run();    setIsJustified(false); setActivePreset("custom"); }}/>
              <TB icon={Icons.alignC} label={T.alignCenter}  active={editor?.isActive({textAlign:"center"})}  onClick={() => { editor?.chain().focus().setTextAlign("center").run();  setIsJustified(false); setActivePreset("custom"); }}/>
              <TB icon={Icons.alignR} label={T.alignRight}   active={editor?.isActive({textAlign:"right"})}   onClick={() => { editor?.chain().focus().setTextAlign("right").run();   setIsJustified(false); setActivePreset("custom"); }}/>
              <TB icon={Icons.alignJ} label={T.alignJustify} active={editor?.isActive({textAlign:"justify"})} onClick={() => { editor?.chain().focus().setTextAlign("justify").run(); setIsJustified(true);  setActivePreset("custom"); }}/>
            </div>
          </div>

          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.pages}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon={Icons.pilcrow}   label={T.showMarks}               active={showInvisibleChars} onClick={() => setShowInvisibleChars(v=>!v)}/>
              <TB icon={Icons.pageBreak} label={fr?"Saut de page":"Page break"}                        onClick={insertPageBreak}/>
            </div>
          </div>

          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.police}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon={Icons.fontSmaller} label={T.smaller} onClick={() => changeFontSize(-1)}/>
              <TB icon={Icons.fontLarger}  label={T.larger}  onClick={() => changeFontSize(+1)}/>
            </div>
            <div className="text-center font-mono text-[9px] text-zinc-500 mt-0.5">{fontSize}px</div>
          </div>

          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.media}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon={Icons.importTxt}  label={T.importTxt}  onClick={() => fileInputRef.current?.click()}/>
              <TB icon={Icons.openBook}   label={T.openBook}   onClick={() => importJsonRef.current?.click()}/>
              <TB icon={Icons.importFont} label={T.importFont} onClick={() => fontInputRef.current?.click()}/>
            </div>
          </div>

          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.livre}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon={Icons.settings}   label={T.settings}   active={showSettings} onClick={() => setShowSettings(v=>!v)}/>
              <TB icon={Icons.addChapter} label={T.newChapter} onClick={addChapter}/>
            </div>
          </div>

          <div className="px-2 py-1.5">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.presets}</div>
            <div className="flex flex-col gap-1">
              {(["print","kindle"] as const).map(p => (
                <button key={p} onClick={() => triggerPreset(p)}
                  className={`w-full px-1.5 py-1.5 rounded-lg text-[9px] font-medium border transition-all flex items-center gap-1.5 ${activePreset===p?"bg-cyan-500/15 border-cyan-500/40 text-cyan-400":"border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 hover:border-zinc-700"}`}>
                  <span className="shrink-0">{p==="print"?Icons.presetPrint:Icons.presetKindle}</span>
                  {p==="print"?T.presetPrint:T.presetKindle}
                </button>
              ))}
              <button onClick={() => { setActivePreset("custom"); setShowSettings(true); }}
                className={`w-full px-1.5 py-1.5 rounded-lg text-[9px] font-medium border transition-all flex items-center gap-1.5 ${activePreset==="custom"?"bg-cyan-500/15 border-cyan-500/40 text-cyan-400":"border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 hover:border-zinc-700"}`}>
                <span className="shrink-0">{Icons.presetCustom}</span>
                {T.presetCustom}
              </button>
            </div>
          </div>
        </div>

        {/* EDITOR ZONE */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">

          {/* TOP BAR */}
          <div className="h-9 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center px-3 gap-2">
            {(["edit","present"] as BookView[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${view===v?"bg-cyan-500/10 border-cyan-500/30 text-cyan-400":"border-transparent text-zinc-500 hover:text-zinc-300"}`}>
                {v==="edit"?T.edit:T.present}
              </button>
            ))}

            <div className="relative flex-1 mx-1" ref={chapterDropRef}>
              <button onClick={() => setShowChapterDropdown(v=>!v)}
                className="w-full flex items-center justify-between gap-1 px-2 py-1 rounded-lg border border-zinc-700 text-zinc-300 hover:border-cyan-500/40 hover:text-cyan-400 transition-all text-[9px] font-mono">
                <span className="truncate">{currentChapter?.title || T.chapterSelect}</span>
                <span className="shrink-0">▾</span>
              </button>
              {showChapterDropdown && (
                <div className="absolute top-full left-0 mt-1 w-full min-w-[160px] max-w-[280px] rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-1 z-50 flex flex-col gap-0.5 max-h-60 overflow-y-auto">
                  {chapters.map((ch,i) => (
                    <button key={ch.id} onClick={() => { setActiveChapter(ch.id); setShowChapterDropdown(false); }}
                      className={`w-full text-left px-2.5 py-1.5 text-[10px] rounded-lg transition-all font-mono flex items-center gap-2 ${activeChapter===ch.id?"bg-cyan-500/10 text-cyan-400":"text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"}`}>
                      <span className="text-zinc-600 shrink-0">{i+1}.</span>
                      <span className="truncate">{ch.title}</span>
                    </button>
                  ))}
                  <div className="border-t border-zinc-800 mt-0.5 pt-0.5">
                    <button onClick={addChapter} className="w-full text-left px-2.5 py-1.5 text-[10px] rounded-lg transition-all text-cyan-500 hover:bg-cyan-500/10">+ {T.newChapter}</button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${saveLabel.dot}`}/>
              <span className="text-[9px] font-mono text-zinc-400">{saveLabel.text}</span>
            </div>

            <div className="relative shrink-0">
              <button onClick={manualSave} className="text-[9px] px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:border-cyan-500/40 hover:text-cyan-400 transition-all font-mono">{T.save}</button>
              {showSaveConfirm && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-xl bg-emerald-900/90 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono whitespace-nowrap shadow-lg">✓ {T.saved}</div>
              )}
            </div>

            <div className="relative shrink-0" ref={exportRef}>
              <button onClick={() => setShowExportMenu(v=>!v)}
                className={`text-[9px] px-2 py-1 rounded border transition-all font-mono flex items-center gap-1 ${showExportMenu?"bg-cyan-500/10 border-cyan-500/30 text-cyan-400":"border-zinc-700 text-zinc-400 hover:border-cyan-500/40 hover:text-cyan-400"}`}>
                {T.export} ▾
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-40 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-1 z-50 flex flex-col gap-0.5">
                  {[{key:"pdf",label:"PDF"},{key:"docx",label:"Word (.docx)"},{key:"epub",label:"EPUB"},{key:"txt",label:"TXT"},{key:"json",label:".echo-book"}].map(({key,label}) => (
                    <button key={key} onClick={() => handleExport(key)} className="w-full text-left px-2.5 py-1.5 text-[10px] text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-400 rounded-lg transition-all font-mono">{label}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative ml-1 shrink-0" ref={settingsRef}>
              <button onClick={() => setIsSettingsOpen(v=>!v)} className="text-[10px] px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all flex items-center gap-1">
                <svg viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><circle cx="7" cy="7" r="1.8"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.9 2.9l1 1M10.1 10.1l1 1M2.9 11.1l1-1M10.1 3.9l1-1"/></svg>
                <span className="font-mono text-[8px] bg-cyan-500/15 text-cyan-500 px-1 rounded uppercase">{fr?"FR":"EN"}</span>
              </button>
              {isSettingsOpen && (
                <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xl p-2 flex flex-col gap-1 z-50">
                  <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-400 px-2 py-1 border-b border-zinc-100 dark:border-zinc-900">{T.settings}</div>
                  <button onClick={toggleTheme} className="text-left px-2 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors">{theme==="dark"?T.lightMode:T.darkMode}</button>
                  <div className="px-2 py-1.5"><LangDropdown/></div>
                </div>
              )}
            </div>
          </div>

          {/* SETTINGS ROW */}
          {showSettings && (
            <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/80 px-4 py-2 flex flex-wrap gap-x-4 gap-y-2 items-center text-[10px]">
              {[
                {label:T.mirror,  val:mirrorMargins,   set:(v:boolean)=>{ setMirrorMargins(v); setActivePreset("custom"); }},
                {label:T.pageNum, val:showPageNumbers, set:(v:boolean)=>{ setShowPageNumbers(v); setActivePreset("custom"); }},
                {label:T.header,  val:showHeader,      set:(v:boolean)=>{ setShowHeader(v); setActivePreset("custom"); }},
              ].map(({label,val,set}) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="text-zinc-400">{label}</span>
                  <button onClick={() => set(!val)} className={`w-8 h-4 rounded-full border relative transition-all flex-shrink-0 ${val?"bg-cyan-500/30 border-cyan-500/50":"bg-zinc-800 border-zinc-700"}`}>
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${val?"left-4 bg-cyan-400":"left-0.5 bg-zinc-500"}`}/>
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">{T.lineH}</span>
                <input type="range" min="1.2" max="2.4" step="0.05" value={lineHeight} onChange={e => { setLineHeight(parseFloat(e.target.value)); setActivePreset("custom"); }} className="w-16 accent-cyan-400 h-1"/>
                <span className="font-mono text-zinc-400 text-[9px] w-7">{lineHeight.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">{T.opacity}</span>
                <input type="range" min="0" max="100" step="1" value={pageOpacity} onChange={e => setPageOpacity(parseInt(e.target.value))} className="w-16 accent-cyan-400 h-1"/>
                <span className="font-mono text-zinc-400 text-[9px] w-7">{pageOpacity}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">{T.font}</span>
                <select value={fontFamily} onChange={e => { setFontFamily(e.target.value); setActivePreset("custom"); editor?.commands.setFontFamily(e.target.value); }} className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-[9px] rounded px-1 py-0.5">
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="Garamond, serif">Garamond</option>
                  <option value="system-ui, sans-serif">Sans-serif</option>
                  <option value="'Courier New', monospace">Courier New</option>
                  <option value="Palatino, serif">Palatino</option>
                  {customFonts.map(f => <option key={f} value={`"${f}", serif`}>{f}</option>)}
                </select>
                <button onClick={() => fontInputRef.current?.click()} className="text-[9px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all">+ {T.importFont}</button>
              </div>
              <button onClick={() => setShowSettings(false)} className="ml-auto text-zinc-500 hover:text-zinc-200 text-base leading-none">✕</button>
            </div>
          )}

          {/* EDITOR CANVAS */}
          <div className="flex-1 overflow-hidden min-h-0 relative"
            style={{backgroundImage:"url('/eauplante2.png')", backgroundSize:"cover", backgroundPosition:"center"}}>
            <div className="absolute inset-0 bg-black/55 pointer-events-none z-0"/>
            <div className="absolute inset-0 overflow-y-auto z-[2] py-8 flex flex-col items-center gap-6"
              style={{scrollbarWidth:"thin", scrollbarColor:"rgba(6,182,212,0.2) transparent"}}>

              <div ref={containerRef} className={`relative shadow-2xl ${showInvisibleChars?"echo-editor-show-symbols":""}`}
                style={{
                  width:`${A4_W}px`, minHeight:`${A4_H}px`,
                  paddingTop:"52px", paddingBottom:"64px",
                  paddingLeft:mirrorMargins?"90px":"72px", paddingRight:"72px",
                  ...pageBgStyle,
                  border:"1px solid rgba(255,255,255,0.08)", borderRadius:"2px",
                  boxShadow:"0 4px 40px rgba(0,0,0,0.5)",
                }}>

                {/* ── TITRE DU LIVRE dans la page ── */}
                <div className="mb-6 pb-5 border-b border-zinc-700/20">
                  {isEditingTitle ? (
                    <input ref={titleInputRef} value={bookTitle}
                      onChange={e => setBookTitle(e.target.value)}
                      onBlur={() => setIsEditingTitle(false)}
                      onKeyDown={e => { if (e.key==="Enter") setIsEditingTitle(false); }}
                      className="w-full text-3xl font-bold bg-transparent border-b-2 border-cyan-500 outline-none text-black dark:text-zinc-100 pb-1"
                      style={{fontFamily}} autoFocus/>
                  ) : (
                    <h1
                      onDoubleClick={() => { setIsEditingTitle(true); setTimeout(() => titleInputRef.current?.focus(), 50); }}
                      title={T.titleHint}
                      className="text-3xl font-bold text-black dark:text-zinc-100 cursor-text select-none hover:opacity-80 transition-opacity"
                      style={{fontFamily}}>
                      {bookTitle}
                      <span className="ml-3 text-[10px] text-zinc-400 dark:text-zinc-600 font-normal normal-case tracking-normal font-mono align-middle">({T.titleHint})</span>
                    </h1>
                  )}
                </div>

                {/* ── TITRE DU CHAPITRE — double-clic pour renommer ── */}
                {isEditingChapterTitle ? (
                  <input ref={chapterTitleInputRef}
                    value={currentChapter?.title || ""}
                    onChange={e => setChapters(prev => prev.map(c => c.id===activeChapter ? {...c, title:e.target.value} : c))}
                    onBlur={() => setIsEditingChapterTitle(false)}
                    onKeyDown={e => { if (e.key==="Enter"||e.key==="Escape") setIsEditingChapterTitle(false); }}
                    className="text-[9px] uppercase tracking-[0.18em] font-mono bg-transparent border-b border-cyan-500/60 outline-none text-cyan-400 mb-3 w-full"
                    autoFocus/>
                ) : (
                  <div
                    onDoubleClick={() => { setIsEditingChapterTitle(true); setTimeout(() => chapterTitleInputRef.current?.focus(), 50); }}
                    title={T.chapterHint}
                    className="group text-[9px] uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500 mb-3 font-mono cursor-text hover:text-cyan-500/70 transition-colors select-none flex items-center gap-2">
                    {currentChapter?.title}
                    <svg className="opacity-0 group-hover:opacity-60 transition-opacity" viewBox="0 0 12 12" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 10l1.5-3.5L9 1a1.5 1.5 0 0 1 2 2L4 9.5z"/><line x1="7" y1="3" x2="9" y2="5"/>
                    </svg>
                  </div>
                )}

                {/* Page separators */}
                {Array.from({length: Math.max(0, pageCount - 1)}).map((_,i) => (
                  <div key={i} className="absolute left-0 right-0 pointer-events-none"
                    style={{top:`${(i+1)*A4_H}px`, borderTop:"1px dashed rgba(6,182,212,0.12)", zIndex:10}}>
                    <span style={{position:"absolute",right:"8px",top:"-10px",fontSize:"8px",color:"rgba(6,182,212,0.3)",fontFamily:"monospace"}}>p.{i+2}</span>
                  </div>
                ))}

                {showHeader && (
                  <div className="absolute top-0 left-0 right-0 h-10 border-b border-zinc-700/30 flex items-center px-4">
                    <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-400">{bookTitle}</span>
                  </div>
                )}

                <EditorContent
                  editor={editor}
                  className={`outline-none text-black dark:text-zinc-100 caret-cyan-400 books-editor-tiptap ${isJustified?"text-justify":""}`}
                  style={{fontSize:`${fontSize}px`, lineHeight, fontFamily}}
                />

                {showPageNumbers && Array.from({length: pageCount}).map((_,i) => (
                  <div key={`pn-${i}`} className="absolute left-0 right-0 text-center text-[10px] text-zinc-400 font-mono pointer-events-none"
                    style={{top:`${(i+1)*A4_H - 30}px`, zIndex:10}}>
                    — {i+1} —
                  </div>
                ))}
              </div>
              <div className="h-32 shrink-0"/>
            </div>
          </div>
        </div>

        {/* RESIZER */}
        {isDesktop && (
          <div onMouseDown={startResizeEcho} className="w-2.5 shrink-0 cursor-col-resize flex items-center justify-center group z-10">
            <div className="w-1 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 group-hover:bg-cyan-500 transition-colors"/>
          </div>
        )}

        {/* ECHO PANEL */}
        <aside style={isDesktop?{width:echoPanelWidth,flexBasis:echoPanelWidth}:undefined}
          className="w-72 shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col overflow-hidden">

          <div className="h-10 shrink-0 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-3 gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0"/>
            <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-zinc-300 flex-1">Echo</span>
            <button onClick={handleManualInject} title={T.inject}
              className="px-2 py-1 text-[10px] rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400 transition-all font-mono shrink-0">
              {fr?"Injecter":"Inject"}
            </button>
          </div>

          {/* ── ONGLETS ECHO — SVG icons toujours présents ── */}
          <div className="flex gap-1 p-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            {ECHO_MODES.map(m => (
              <button key={m.id} onClick={() => setEchoMode(echoMode===m.id ? null : m.id)}
                className={`flex-1 py-1.5 rounded-lg border transition-all flex items-center justify-center gap-1.5 text-[11px] font-medium ${
                  echoMode===m.id
                    ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                    : "border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
                }`}>
                <span className="shrink-0">{m.icon}</span>
                <span>{T[m.key]}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0" style={{scrollbarWidth:"thin"}}>
            {echoMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 pb-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border border-zinc-700 shadow-lg echo-idle">
                  <img src="/echo1.png" alt="Echo" className="w-full h-full object-cover"/>
                </div>
                <div className="text-[13px] text-zinc-500 text-center leading-relaxed px-2 whitespace-pre-line">{T.echoPlaceholder}</div>
              </div>
            ) : (
              <>
                {echoMessages.map((msg,i) => (
                  <div key={i} className={`text-[13px] leading-relaxed rounded-xl px-3 py-2 ${
                    msg.role==="user"
                      ?"self-end bg-cyan-500/10 border border-cyan-500/20 text-zinc-200 rounded-br-sm max-w-[90%]"
                      :"self-start bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-sm max-w-[95%]"
                  }`}>{msg.text}</div>
                ))}
                {echoThinking && <div className="self-start text-[13px] text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl rounded-bl-sm px-3 py-2">...</div>}
              </>
            )}
            <div ref={echoBottomRef}/>
          </div>

          <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 flex gap-1.5 shrink-0">
            <textarea value={echoInput} onChange={e => setEchoInput(e.target.value)}
              onKeyDown={e => { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); sendEcho(); } }}
              rows={3} placeholder={T.echoInput}
              className="flex-1 resize-none bg-zinc-900 border border-zinc-800 text-zinc-200 text-[13px] rounded-lg px-2 py-1.5 placeholder-zinc-600 outline-none focus:border-cyan-700/40 leading-relaxed"/>
            <button onClick={sendEcho} disabled={echoThinking}
              className="w-8 self-end bg-cyan-600/15 border border-cyan-500/25 hover:bg-cyan-600/25 disabled:opacity-30 text-cyan-400 rounded-lg text-sm flex items-center justify-center transition-all h-8 shrink-0">OK</button>
          </div>
        </aside>
      </div>

      <input ref={fileInputRef}  type="file" accept=".txt,.md,.markdown"      onChange={handleImportTxt}  className="hidden"/>
      <input ref={importJsonRef} type="file" accept=".json"                   onChange={handleImportJson} className="hidden"/>
      <input ref={fontInputRef}  type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleFontImport} className="hidden"/>

      <style>{`
        .books-editor-tiptap .ProseMirror { min-height:${A4_H - 200}px; outline:none; color:inherit; }
        .books-editor-tiptap .ProseMirror p, .books-present p { margin-top:0!important; margin-bottom:.75em!important; line-height:inherit!important; }
        .books-editor-tiptap .ProseMirror h1 { font-size:1.6em; font-weight:700; margin-top:1.2em!important; margin-bottom:.6em!important; border-bottom:1px solid rgba(6,182,212,0.1); padding-bottom:.12em; }
        .books-editor-tiptap .ProseMirror h2 { font-size:1.2em; font-weight:600; margin-top:1.6em!important; margin-bottom:.5em!important; text-transform:uppercase; color:rgb(6,182,212); }
        .books-editor-tiptap .ProseMirror h3 { font-size:1.05em; font-weight:600; margin-top:1.2em!important; margin-bottom:.4em!important; }
        .echo-editor-show-symbols .ProseMirror p:after { content:" ¶"!important; color:rgba(6,182,212,0.35)!important; font-size:.85em!important; font-family:monospace!important; }
        [contenteditable="false"] { user-select:none; -webkit-user-select:none; cursor:default; pointer-events:none; }
      `}</style>
    </main>
  );
}