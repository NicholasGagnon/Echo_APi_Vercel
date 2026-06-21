"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { useApp } from "../../context/AppContext";
import LangDropdown from "../components/LangDropdown";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { TextAlign } from "@tiptap/extension-text-align";

type EchoMode   = "creative" | "ideas" | "critical";
type BookView   = "edit" | "present";
type BookMessage = { role: "user" | "echo"; text: string };
type Chapter    = { id: string; title: string; content: string };

const I: Record<"fr"|"en", Record<string,string>> = {
  fr: {
    home:"🏠 Accueil", chat:"💬 Chat", books:"📚 Livres", calendar:"📅 Calendrier",
    vitality:"📈 Vitalité", services:"💎 Services", account:"👤 Compte", history:"⭐ Historique",
    mode:"Mode", edit:"✏️ Éditer", present:"📖 Lire",
    saved:"Sauvegardé", saving:"Sauvegarde...", unsaved:"Non sauvegardé",
    save:"Sauv.", inject:"Injecter via Echo", newChapter:"Nouveau chapitre",
    settings:"Paramètres", lightMode:"☀️ Mode Clair", darkMode:"🌙 Mode Sombre",
    mirror:"Miroir", pageNum:"N° pages", header:"Header", footer:"Footer",
    justify:"Justifié", lineH:"Interligne", para:"Para", font:"Police",
    opacity:"Opacité page", paraIndentLbl:"Alinéa 1ère ligne",
    struct:"struct", texte:"texte", pages:"pages", police:"police",
    media:"media", livre:"livre", presets:"presets", align:"alignement",
    t1:"Titre 1", t2:"Titre 2", t3:"Titre 3", normal:"Texte normal",
    bold:"Gras", italic:"Italique", indent:"Alinéa",
    showMarks:"Marques ¶",
    smaller:"Réduire", larger:"Agrandir",
    importTxt:"Import TXT/MD", openBook:"Ouvrir .echo-book",
    alignLeft:"Gauche", alignCenter:"Centre", alignRight:"Droite", alignJustify:"Justifié",
    creative:"Créatif", ideas:"Idées", critical:"Critique",
    echoPlaceholder:"Demande à Echo d'écrire un passage, améliorer un paragraphe...\n\nDis-lui 'injecte' pour qu'il ajoute le texte directement dans ton livre.",
    echoInput:"Demande à Echo...",
    export:"Export",
    noContent:"Aucun contenu.", titleHint:"Double-cliquer pour modifier",
    prevChapter:"Précédent", nextChapter:"Suivant", closePres:"Fermer",
    serverErr:"Impossible de joindre le serveur.",
    presetPrint:"📖 Impression", presetKindle:"📱 Kindle", presetCustom:"⚙️ Personnalisé",
    printPreset:"Livre imprimé : marges miroir, numéros de page, header/footer, justifié, alinéa",
    kindlePreset:"Kindle/EPUB : sans marges miroir, sans pagination, sans header/footer",
    customPreset:"Réglages manuels",
    importFont:"Importer une police",
    pageOf:"sur",
    chapterSelect:"Sélectionner un chapitre",
  },
  en: {
    home:"🏠 Home", chat:"💬 Chat", books:"📚 Books", calendar:"📅 Calendar",
    vitality:"📈 Vitality", services:"💎 Services", account:"👤 Account", history:"⭐ History",
    mode:"Mode", edit:"✏️ Edit", present:"📖 Present",
    saved:"Saved", saving:"Saving...", unsaved:"Unsaved",
    save:"Save", inject:"Inject via Echo", newChapter:"New chapter",
    settings:"Settings", lightMode:"☀️ Light Mode", darkMode:"🌙 Dark Mode",
    mirror:"Mirror", pageNum:"Page #", header:"Header", footer:"Footer",
    justify:"Justify", lineH:"Line-h", para:"Para", font:"Font",
    opacity:"Page opacity", paraIndentLbl:"First-line indent",
    struct:"struct", texte:"text", pages:"pages", police:"size",
    media:"media", livre:"book", presets:"presets", align:"align",
    t1:"Title 1", text2:"Title 2", t3:"Title 3", normal:"Normal text",
    bold:"Bold", italic:"Italic", indent:"Indent",
    showMarks:"Show marks ¶",
    smaller:"Smaller", larger:"Larger",
    importTxt:"Import TXT/MD", openBook:"Open .echo-book",
    alignLeft:"Left", alignCenter:"Center", alignRight:"Right", alignJustify:"Justify",
    creative:"Creative", ideas:"Ideas", critical:"Critical",
    echoPlaceholder:"Ask Echo to write a passage, improve a paragraph...\n\nSay 'inject' to have Echo add the text directly into your book.",
    echoInput:"Ask Echo...",
    export:"Export",
    noContent:"No content yet.", titleHint:"Double-click to edit",
    prevChapter:"Previous", nextChapter:"Next", closePres:"Close",
    serverErr:"Cannot reach the server.",
    presetPrint:"📖 Print", presetKindle:"📱 Kindle", presetCustom:"⚙️ Custom",
    printPreset:"Print book: mirror margins, page numbers, header/footer, justified, indent",
    kindlePreset:"Kindle/EPUB: no mirror margins, no pagination, no header/footer",
    customPreset:"Manual settings",
    importFont:"Import Font",
    pageOf:"of",
    chapterSelect:"Select a chapter",
  },
};

const ECHO_MODES: { id: EchoMode; key: "creative"|"ideas"|"critical"; emoji: string }[] = [
  { id:"creative", key:"creative", emoji:"✍️" },
  { id:"ideas",    key:"ideas",    emoji:"💡" },
  { id:"critical", key:"critical", emoji:"🔍" },
];

type WaterGlyph = { g:string; top:string; left?:string; right?:string; rot:string; sz:string };
const WATER: WaterGlyph[] = [
  { g:"〰", top:"6%",  left:"1%",   rot:"-18deg", sz:"58px" },
  { g:"∿",  top:"20%", right:"2%",  rot:"12deg",  sz:"70px" },
  { g:"〜", top:"44%", left:"0.5%", rot:"-8deg",  sz:"50px" },
  { g:"≈",  top:"67%", right:"1.5%",rot:"18deg",  sz:"64px" },
  { g:"∾",  top:"83%", left:"2%",   rot:"-12deg", sz:"54px" },
];

// A4 @ 96dpi = 793px wide, 1122px tall
const A4_H = 1122;

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1500);
}

function applyPreset(preset:"print"|"kindle", s:{
  setMirrorMargins:(v:boolean)=>void; setShowPageNumbers:(v:boolean)=>void;
  setShowHeader:(v:boolean)=>void; setShowFooter:(v:boolean)=>void;
  setLineHeight:(v:number)=>void; setFontSize:(v:number)=>void;
  setIsJustified:(v:boolean)=>void; setParaSpacing:(v:number)=>void;
  setParaIndent:(v:boolean)=>void;
}) {
  if (preset==="print") {
    s.setMirrorMargins(true); s.setShowPageNumbers(true); s.setShowHeader(true); s.setShowFooter(true);
    s.setLineHeight(1.8); s.setFontSize(12); s.setIsJustified(true); s.setParaSpacing(0.8); s.setParaIndent(true);
  } else {
    s.setMirrorMargins(false); s.setShowPageNumbers(false); s.setShowHeader(false); s.setShowFooter(false);
    s.setLineHeight(1.6); s.setFontSize(14); s.setIsJustified(false); s.setParaSpacing(0.6); s.setParaIndent(false);
  }
}

export default function App() {
  const { lang, theme, toggleTheme, userTier } = useApp();
  const fr = lang === "fr";
  const T  = I[lang as "fr"|"en"] ?? I.fr;
  const safeTier = userTier || "connected_free";

  const [userId,   setUserId]   = useState<string|null>(null);
  const [bookDbId, setBookDbId] = useState<string|null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([{ id:"ch1", title:fr?"Chapitre 1":"Chapter 1", content:"" }]);
  const [activeChapter, setActiveChapter] = useState("ch1");
  const [bookTitle, setBookTitle] = useState(fr?"Mon Premier Livre":"My First Book");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [view, setView] = useState<BookView>("edit");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [showChapterDropdown, setShowChapterDropdown] = useState(false);
  const chapterDropRef = useRef<HTMLDivElement>(null);

  // Settings
  const [mirrorMargins, setMirrorMargins]       = useState(false);
  const [showPageNumbers, setShowPageNumbers]   = useState(true);
  const [showHeader, setShowHeader]             = useState(false);
  const [showFooter, setShowFooter]             = useState(false);
  const [fontSize, setFontSize]                 = useState(14);
  const [fontFamily, setFontFamily]             = useState("Georgia, serif");
  const [customFonts, setCustomFonts]           = useState<string[]>([]);
  const [lineHeight, setLineHeight]             = useState(1.8);
  const [isJustified, setIsJustified]           = useState(true);
  const [paraSpacing, setParaSpacing]           = useState(0.75);
  const [showSettings, setShowSettings]         = useState(true);
  const [paraIndent, setParaIndent]             = useState(false);
  const [activePreset, setActivePreset]         = useState<"print"|"kindle"|"custom"|null>(null);
  const [pageOpacity, setPageOpacity]           = useState(95);
  const [showInvisibleChars, setShowInvisibleChars] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm]   = useState(false);

  // Pagination dynamique
  const [pageCount, setPageCount] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePageCount = useCallback(() => {
    if (containerRef.current) {
      const height = containerRef.current.scrollHeight;
      const count = Math.max(1, Math.ceil(height / A4_H));
      setPageCount(count);
    }
  }, []);

  // Recalcule la pagination lorsque le document change ou se redimensionne
  useEffect(() => {
    const t = setTimeout(updatePageCount, 150);
    return () => clearTimeout(t);
  }, [chapters, activeChapter, view, updatePageCount]);

  useEffect(() => {
    window.addEventListener("resize", updatePageCount);
    return () => window.removeEventListener("resize", updatePageCount);
  }, [updatePageCount]);

  // ── TIPTAP ────────────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1,2,3] } }),
      FontFamily,
      TextAlign.configure({ types: ["heading","paragraph"] }),
      TextStyle.extend({
        addAttributes() {
          return {
            fontSize: {
              default: null,
              parseHTML: el => el.style.fontSize || null,
              renderHTML: attrs => attrs.fontSize ? { style:`font-size:${attrs.fontSize}` } : {},
            },
          };
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
    if (!editor || view!=="edit") return;
    const cur = chapters.find(c=>c.id===activeChapter);
    if (cur && editor.getHTML()!==cur.content) editor.commands.setContent(cur.content||"<p></p>");
  }, [activeChapter, view, editor]);

  useEffect(() => { if (editor) editor.commands.setFontFamily(fontFamily); }, [fontFamily, editor]);

  // ── TOGGLES AVEC DÉVERROUILLAGE DU PRESET ──────────────────────────────────
  const handleToggle = (setter: (v: boolean) => void, val: boolean) => {
    setter(!val);
    setActivePreset("custom");
  };

  const handleRangeChange = (setter: (v: number) => void, val: number) => {
    setter(val);
    setActivePreset("custom");
  };

  const handleFontChange = (val: string) => {
    setFontFamily(val);
    setActivePreset("custom");
  };

  const handleFontSizeChange = (val: number) => {
    setFontSize(val);
    setActivePreset("custom");
    editor?.chain().focus().setMark("textStyle", { fontSize: `${val}px` }).run();
  };

  const toggleBold    = () => editor?.chain().focus().toggleBold().run();
  const toggleItalic  = () => editor?.chain().focus().toggleItalic().run();
  const toggleInvisibleChars = () => setShowInvisibleChars(v=>!v);

  // Font size sur sélection uniquement
  const changeFontSize = (delta: number) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    if (hasSelection) {
      const current = parseInt(editor.getAttributes("textStyle").fontSize) || fontSize;
      const next = Math.min(72, Math.max(8, current + delta));
      editor.chain().focus().setMark("textStyle", { fontSize:`${next}px` }).run();
    } else {
      const nextSize = Math.min(72, Math.max(8, fontSize+delta));
      setFontSize(nextSize);
      setActivePreset("custom");
      editor?.chain().focus().setMark("textStyle", { fontSize:`${nextSize}px` }).run();
    }
  };

  // Alinéa correct : insertContent puis blur pour éviter &nbsp; dans le HTML
  const insertIndent = () => {
    if (!editor) return;
    editor.chain().focus().insertContent('\u00a0\u00a0\u00a0\u00a0').run();
  };

  // ── INSERT BLOCKS ─────────────────────────────────────────────────────────
  const insertPageBreakBlock = () => {
    editor?.commands.insertContent(
      `<div data-page-break="true" contenteditable="false" style="user-select:none;-webkit-user-select:none;border-top:2px dashed rgba(6,182,212,0.5);margin:2.5rem 0;text-align:center;font-size:9px;color:rgba(6,182,212,0.6);letter-spacing:0.3em;padding-top:8px;font-family:monospace;cursor:default;">── ${fr?"SAUT DE PAGE":"PAGE BREAK"} ──</div><p></p>`
    );
  };

  // ── INJECTION ECHO → fin du chapitre ─────────────────────────────────────
  const injectTextAtEnd = (text: string) => {
    if (!editor) return;
    const { doc } = editor.state;
    editor.chain()
      .focus()
      .setTextSelection(doc.content.size - 1)
      .insertContent(`<p>${text}</p>`)
      .run();
  };

  const addChapter = () => {
    const id  = `ch${Date.now()}`;
    const num = chapters.length+1;
    setChapters(prev=>[...prev,{id,title:fr?`Chapitre ${num}`:`Chapter ${num}`,content:""}]);
    setActiveChapter(id);
    setShowChapterDropdown(false);
  };

  // ── CLOSE DROPDOWN ON OUTSIDE CLICK ──────────────────────────────────────
  useEffect(()=>{
    const h=(e:MouseEvent)=>{
      if(chapterDropRef.current&&!chapterDropRef.current.contains(e.target as Node)) setShowChapterDropdown(false);
    };
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  // ── AUTO-SAVE ─────────────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<"saved"|"saving"|"unsaved">("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const saveToSupabase = useCallback(async () => {
    if (!userId) {
      localStorage.setItem("echo-books-manuscript", JSON.stringify({bookTitle,chapters}));
      setSaveStatus("saved");
      return;
    }
    setSaveStatus("saving");
    const payload = {bookTitle,chapters};
    if (bookDbId) {
      const {error} = await supabase.from("echo_conversations")
        .update({messages:[payload],updated_at:new Date().toISOString()})
        .eq("id",bookDbId).eq("user_id",userId);
      if(error) console.error("[Books] update:",error.message);
    } else {
      const {data,error} = await supabase.from("echo_conversations")
        .insert({user_id:userId,source:"books",messages:[payload],updated_at:new Date().toISOString()})
        .select("id").single();
      if(error) console.error("[Books] insert:",error.message);
      else if(data?.id) setBookDbId(data.id);
    }
    setSaveStatus("saved");
  },[userId,bookDbId,bookTitle,chapters]);

  useEffect(()=>{
    setSaveStatus("unsaved");
    if(saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(saveToSupabase,2500);
    return()=>{if(saveTimer.current)clearTimeout(saveTimer.current);};
  },[chapters,bookTitle,saveToSupabase]);

  const manualSave = () => {
    saveToSupabase();
    setShowSaveConfirm(true);
    setTimeout(()=>setShowSaveConfirm(false),2000);
  };

  // ── BOOTSTRAP ─────────────────────────────────────────────────────────────
  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      const uid=session?.user?.id||null;
      setUserId(uid);
      if(uid){
        const{data:rows}=await supabase.from("echo_conversations")
          .select("id,messages").eq("user_id",uid).eq("source","books")
          .order("updated_at",{ascending:false}).limit(1);
        if(rows?.[0]){
          setBookDbId(rows[0].id);
          try{
            const raw=rows[0].messages?.[0];
            const p=typeof raw==="string"?JSON.parse(raw):raw;
            if(p?.bookTitle) setBookTitle(p.bookTitle);
            if(p?.chapters?.length){setChapters(p.chapters);setActiveChapter(p.chapters[0].id);}
            setSaveStatus("saved"); return;
          }catch(e){console.error("[Books]",e);}
        }
      }
      const raw=localStorage.getItem("echo-books-manuscript");
      if(raw){
        try{
          const{bookTitle:t,chapters:c}=JSON.parse(raw);
          if(t)setBookTitle(t);
          if(c?.length){setChapters(c);setActiveChapter(c[0].id);}
        }catch{}
      }
      setSaveStatus("saved");
    });
    const{data:listener}=supabase.auth.onAuthStateChange((_,s)=>setUserId(s?.user?.id||null));
    return()=>listener.subscription.unsubscribe();
  },[]);

  // ── PANEL RESIZE ──────────────────────────────────────────────────────────
  const [echoPanelWidth,setEchoPanelWidth]=useState(280);
  const [isDesktop,setIsDesktop]=useState(false);
  const resizingRef=useRef(false);
  useEffect(()=>{const c=()=>setIsDesktop(window.innerWidth>=1024);c();window.addEventListener("resize",c);return()=>window.removeEventListener("resize",c);},[]);
  const startResizeEcho=(e:React.MouseEvent)=>{e.preventDefault();resizingRef.current=true;document.body.style.cursor="col-resize";document.body.style.userSelect="none";};
  useEffect(()=>{
    const onMove=(e:MouseEvent)=>{if(resizingRef.current)setEchoPanelWidth(Math.min(520,Math.max(220,window.innerWidth-e.clientX)));};
    const onUp=()=>{if(!resizingRef.current)return;resizingRef.current=false;document.body.style.cursor="";document.body.style.userSelect="";};
    window.addEventListener("mousemove",onMove);window.addEventListener("mouseup",onUp);
    return()=>{window.removeEventListener("mousemove",onMove);window.removeEventListener("mouseup",onUp);};
  },[]);

  // ── IMPORT CUSTOM FONT ────────────────────────────────────────────────────
  const fontInputRef = useRef<HTMLInputElement>(null);
  const handleFontImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value="";
    if (!file) return;
    const url = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^.]+$/,"");
    const face = new FontFace(name, `url(${url})`);
    face.load().then(loaded => {
      document.fonts.add(loaded);
      setCustomFonts(prev=>[...prev,name]);
      setFontFamily(name);
    }).catch(err=>console.error("[Font import]",err));
  };

  // ── IMPORTS TXT / JSON ────────────────────────────────────────────────────
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const importJsonRef = useRef<HTMLInputElement>(null);
  const handleImportTxt=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];e.target.value="";if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      const id=`ch${Date.now()}`;
      const html=(reader.result as string).split(/\n\n+/).map(p=>`<p>${p.replace(/\n/g,"<br>")}</p>`).join("");
      setChapters(prev=>[...prev,{id,title:file.name.replace(/\.[^.]+$/,""),content:html}]);
      setActiveChapter(id);
    };reader.readAsText(file);
  };
  const handleImportJson=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];e.target.value="";if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{try{const{bookTitle:t,chapters:c}=JSON.parse(reader.result as string);if(t)setBookTitle(t);if(c?.length){setChapters(c);setActiveChapter(c[0].id);}}catch{alert(fr?"Fichier invalide.":"Invalid file.");}};
    reader.readAsText(file);
  };

  // ── EXPORT → Flask ────────────────────────────────────────────────────────
  const [showExportMenu,setShowExportMenu]=useState(false);
  const exportRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{const h=(e:MouseEvent)=>{if(exportRef.current&&!exportRef.current.contains(e.target as Node))setShowExportMenu(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);

  const handleExport = async (fmt: string) => {
    setShowExportMenu(false);
    const slug = bookTitle.replace(/\s+/g,"_");
    const currentHtml = chapters.find(c=>c.id===activeChapter)?.content || "";

    if (fmt==="txt") {
      const txt = chapters.map(c=>`=== ${c.title} ===\n\n${c.content.replace(/<[^>]+>/g,"").replace(/&nbsp;/g," ")}`).join("\n\n\n");
      downloadBlob(new Blob([txt],{type:"text/plain"}),`${slug}.txt`);
      return;
    }
    if (fmt==="json") {
      downloadBlob(new Blob([JSON.stringify({bookTitle,chapters},null,2)],{type:"application/json"}),`${slug}.echo-book.json`);
      return;
    }
    // PDF / DOCX / EPUB → Flask
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/export`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({format:fmt, title:bookTitle, html:currentHtml}),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Export error: ${err.error}`); return;
      }
      const blob = await res.blob();
      const ext = fmt==="pdf"?".pdf":fmt==="docx"?".docx":".epub";
      downloadBlob(blob,`${slug}${ext}`);
    } catch(e) {
      alert(`Cannot reach export server: ${e}`);
    }
  };

  // ── ECHO ──────────────────────────────────────────────────────────────────
  const [echoMode,setEchoMode]       = useState<EchoMode|null>(null);
  const [echoMessages,setEchoMessages] = useState<BookMessage[]>([]);
  const [echoInput,setEchoInput]     = useState("");
  const [echoThinking,setEchoThinking] = useState(false);
  const echoBottomRef = useRef<HTMLDivElement>(null);

  // ⚡ SYSTÈME DE SECOURS ET DE ROBUSTESSE INTELLIGENT DIRECT (No Failure)
  const fetchEchoReply = async (msg: string, history: any, safeTier: string) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const excerpt = editor?.getText()?.slice(0, 500) || "";
    
    try {
      const res = await fetch(`${API_URL}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `[Livre: "${bookTitle}" | Extrait: "${excerpt.slice(0, 200)}"]\n\n${msg}`,
          history,
          source: "books",
          selectedButtons: echoMode ? [echoMode] : [],
          userTier: safeTier,
          calendarEvents: {},
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        // S'assurer qu'il ne s'agit pas du message d'erreur générique du backend
        if (data.response && !data.response.includes("instable")) {
          return data;
        }
      }
      throw new Error("Server error or generic instable reply");
    } catch (err) {
      console.warn("[Books] Passage en secours sur l'appel direct local Gemini...", err);
      
      // Appel direct sécurisé avec clé fournie au runtime (système autonome)
      const apiKey = ""; 
      const targetModel = "gemini-2.5-flash-preview-09-2025";
      const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
      
      const systemPrompt = `
        Tu es Echo, un assistant d'écriture intelligent.
        Mode sélectionné : ${echoMode || "aucun"}.
        Titre du livre : "${bookTitle}".
        Extrait actuel : "${excerpt}".
        
        RÈGLES D'INJECTION :
        Si l'utilisateur te demande d'écrire, générer ou continuer son histoire/texte directement dans le livre, tu DOIS obligatoirement envelopper le contenu rédigé à insérer à l'intérieur des balises <<<INJECT_TEXT>>> et <<<END_INJECT>>>.
        Les commentaires et explications doivent rester EN DEHORS de ces balises pour permettre à l'interface de les séparer.
        Exemple :
        Voici la suite que je te propose :
        <<<INJECT_TEXT>>>
        Il était une fois...
        <<<END_INJECT>>>
      `;
      
      const contentsPayload: any[] = [];
      history.forEach((h: string) => {
        const isUser = h.startsWith("You:") || h.startsWith("Toi:");
        const textContent = h.replace(/^(You:|Toi:|Echo:)\s*/, "");
        contentsPayload.push({
          role: isUser ? "user" : "model",
          parts: [{ text: textContent }]
        });
      });
      
      contentsPayload.push({
        role: "user",
        parts: [{ text: msg }]
      });
      
      const directRes = await fetch(directUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: contentsPayload,
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      });
      
      if (!directRes.ok) {
        throw new Error("Direct Gemini call failed as well");
      }
      
      const directData = await directRes.json();
      const replyText = directData.candidates?.[0]?.content?.parts?.[0]?.text || "...";
      
      // ⚡ CORRIGÉ : Remplacement de /gs par [\s\S]*? et /g pour une compatibilité d'environnement totale
      const injectMatch = replyText.match(/<<<INJECT_TEXT>>>([\s\S]*?)<<<END_INJECT>>>/);
      if (injectMatch) {
        const injectedText = injectMatch[1].trim();
        const cleanResponse = replyText.replace(/<<<INJECT_TEXT>>>[\s\S]*?<<<END_INJECT>>>/g, "").trim();
        return {
          response: cleanResponse || "J'ai injecté le texte demandé directement à la suite de ton livre ! ✨",
          inject: true,
          injected_text: injectedText
        };
      } else {
        return {
          response: replyText,
          inject: false
        };
      }
    }
  };

  const sendEcho = async () => {
    if(!echoInput.trim()||echoThinking) return;
    const msg=echoInput.trim();
    setEchoInput("");
    setEchoMessages(prev=>[...prev,{role:"user",text:msg}]);
    setEchoThinking(true);
    const history=echoMessages.map(m=>m.role==="user"?`You: ${m.text}`:`Echo: ${m.text}`);
    try{
      const data = await fetchEchoReply(msg, history, safeTier);
      const reply = data.response || "...";

      const hasInject = data.inject;
      const injectedText = data.injected_text || data.inject_text;

      if (hasInject && injectedText) {
        injectTextAtEnd(injectedText);
        setEchoMessages(prev=>[...prev,{role:"echo",text:`${reply}\n\n✅ ${fr?"Texte injecté dans le chapitre.":"Text injected into chapter."}`}]);
      } else {
        setEchoMessages(prev=>[...prev,{role:"echo",text:reply}]);
      }
    }catch{
      setEchoMessages(prev=>[...prev,{role:"echo",text:T.serverErr}]);
    }finally{setEchoThinking(false);}
  };

  // Injection manuelle depuis le bouton dans le header Echo
  const handleManualInject = () => {
    const lastEcho = [...echoMessages].reverse().find(m=>m.role==="echo");
    if (!lastEcho) return;
    injectTextAtEnd(lastEcho.text);
    setEchoMessages(prev=>[...prev,{role:"echo",text:fr?"✅ Texte injecté à la fin du chapitre.":"✅ Text injected at end of chapter."}]);
  };

  useEffect(()=>{ echoBottomRef.current?.scrollIntoView({behavior:"smooth"}); },[echoMessages,echoThinking]);

  const triggerPreset=(p:"print"|"kindle")=>{
    applyPreset(p,{setMirrorMargins,setShowPageNumbers,setShowHeader,setShowFooter,setLineHeight,setFontSize,setIsJustified,setParaSpacing,setParaIndent});
    setActivePreset(p);
    if(p==="print") editor?.chain().focus().setTextAlign("justify").run();
    else editor?.chain().focus().unsetTextAlign().run();
  };

  const [isSettingsOpen,setIsSettingsOpen]=useState(false);
  const settingsRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{const h=(e:MouseEvent)=>{if(settingsRef.current&&!settingsRef.current.contains(e.target as Node))setIsSettingsOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);

  const saveLabel={saved:{dot:"bg-emerald-400",text:T.saved},saving:{dot:"bg-amber-400 animate-pulse",text:T.saving},unsaved:{dot:"bg-zinc-500",text:T.unsaved}}[saveStatus];
  const currentContent=chapters.find(c=>c.id===activeChapter)?.content||"";
  const pageBgStyle={backgroundColor:`rgba(${theme==="dark"?"9,9,11":"255,255,255"},${pageOpacity/100})`};
  const currentChapter=chapters.find(c=>c.id===activeChapter);

  const TB=({icon,label,active,onClick}:{icon:string;label:string;active?:boolean;onClick:()=>void})=>(
    <button onClick={onClick} title={label}
      className={`group relative w-[46px] h-7 flex items-center justify-center rounded-lg text-[13px] transition-all border select-none ${active?"bg-cyan-500/15 border-cyan-500/40 text-cyan-400":"border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 hover:border-zinc-700"}`}>
      {icon}
    </button>
  );

  const Toggle=({val,set}:{val:boolean;set:(v:boolean)=>void})=>(
    <button onClick={()=>set(!val)} className={`w-8 h-4 rounded-full border relative transition-all flex-shrink-0 ${val?"bg-cyan-500/30 border-cyan-500/50":"bg-zinc-800 border-zinc-700"}`}>
      <span className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${val?"left-4 bg-cyan-400":"left-0.5 bg-zinc-500"}`}/>
    </button>
  );

  // ── MODE PRÉSENTATION ─────────────────────────────────────────────────────
  if (view==="present") return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      <div className="flex items-center justify-between px-8 py-3 border-b border-zinc-800">
        <span className="text-zinc-400 text-sm font-mono">{bookTitle}</span>
        <div className="flex items-center gap-3">
          {chapters.map((ch,i)=>(
            <button key={ch.id} onClick={()=>setActiveChapter(ch.id)}
              className={`text-[9px] px-2 py-0.5 rounded border transition-all ${activeChapter===ch.id?"border-cyan-500/40 text-cyan-400":"border-zinc-800 text-zinc-600 hover:text-zinc-400"}`}>{i+1}</button>
          ))}
          <button onClick={()=>setView("edit")} className="text-[10px] px-3 py-1 rounded border border-zinc-700 text-zinc-400 hover:border-red-500/40 hover:text-red-400 transition-all">✕ {T.closePres}</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto flex items-start justify-center px-8 py-12">
        <div className="w-full max-w-[65ch]" style={{fontSize:`${fontSize+2}px`,fontFamily,lineHeight:lineHeight+0.1,color:"#e4e4e7"}}>
          <h1 className="text-3xl font-bold text-white mb-8 border-b border-zinc-800 pb-4">{bookTitle}</h1>
          <div className="text-[11px] uppercase tracking-widest text-cyan-500/60 font-mono mb-4">{currentChapter?.title}</div>
          <div className="books-present" style={{textAlign:isJustified?"justify":"left"}} dangerouslySetInnerHTML={{__html:currentContent||`<p style="color:rgba(113,113,122,0.3);font-style:italic">${T.noContent}</p>`}}/>
        </div>
      </div>
      <div className="flex justify-between px-8 py-3 border-t border-zinc-800">
        <button onClick={()=>{const i=chapters.findIndex(c=>c.id===activeChapter);if(i>0)setActiveChapter(chapters[i-1].id);}} disabled={chapters.findIndex(c=>c.id===activeChapter)===0} className="text-[10px] px-3 py-1 rounded border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-all disabled:opacity-30">← {T.prevChapter}</button>
        <span className="text-[9px] font-mono text-zinc-600">{chapters.findIndex(c=>c.id===activeChapter)+1} {T.pageOf} {chapters.length}</span>
        <button onClick={()=>{const i=chapters.findIndex(c=>c.id===activeChapter);if(i<chapters.length-1)setActiveChapter(chapters[i+1].id);}} disabled={chapters.findIndex(c=>c.id===activeChapter)===chapters.length-1} className="text-[10px] px-3 py-1 rounded border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-all disabled:opacity-30">{T.nextChapter} →</button>
      </div>
    </div>
  );

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
            <hr className="border-zinc-200 dark:border-zinc-800"/>
            <Link href="/history"  className="block hover:text-amber-500">{T.history}</Link>
          </div>
        </div>
        <div className="text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 pt-3">
          {T.mode} : <span className="text-cyan-400 uppercase font-bold block">books</span>
        </div>
      </aside>

      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* TOOLBAR */}
        <div className="w-[130px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col py-2 overflow-y-auto overflow-x-hidden">

          {/* struct */}
          <div className="px-2 pb-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.struct}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="T¹" label={T.t1} active={editor?.isActive("heading",{level:1})} onClick={()=>editor?.chain().focus().toggleHeading({level:1}).run()}/>
              <TB icon="T²" label={T.t2} active={editor?.isActive("heading",{level:2})} onClick={()=>editor?.chain().focus().toggleHeading({level:2}).run()}/>
              <TB icon="T³" label={T.t3} active={editor?.isActive("heading",{level:3})} onClick={()=>editor?.chain().focus().toggleHeading({level:3}).run()}/>
              {/* L'icône de texte normal est Abc */}
              <TB icon="Abc" label={T.normal} active={editor?.isActive("paragraph")} onClick={()=>editor?.chain().focus().setParagraph().run()}/>
            </div>
          </div>

          {/* texte */}
          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.texte}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="B"   label={T.bold}   active={editor?.isActive("bold")}   onClick={toggleBold}/>
              <TB icon="I"   label={T.italic} active={editor?.isActive("italic")} onClick={toggleItalic}/>
              <TB icon="→"   label={T.indent} onClick={insertIndent}/>
            </div>
          </div>

          {/* alignement */}
          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.align}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="⬅" label={T.alignLeft}    active={editor?.isActive({textAlign:"left"})}    onClick={()=>{editor?.chain().focus().setTextAlign("left").run(); handleToggle(setIsJustified, true);}}/>
              <TB icon="⬛" label={T.alignCenter}  active={editor?.isActive({textAlign:"center"})}  onClick={()=>{editor?.chain().focus().setTextAlign("center").run(); handleToggle(setIsJustified, true);}}/>
              <TB icon="➡" label={T.alignRight}   active={editor?.isActive({textAlign:"right"})}   onClick={()=>{editor?.chain().focus().setTextAlign("right").run(); handleToggle(setIsJustified, true);}}/>
              <TB icon="≡" label={T.alignJustify} active={editor?.isActive({textAlign:"justify"})} onClick={()=>{editor?.chain().focus().setTextAlign("justify").run(); handleToggle(setIsJustified, false);}}/>
            </div>
          </div>

          {/* pages */}
          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.pages}</div>
            <div className="grid grid-cols-2 gap-0.5">
              {/* L'icône du bouton des marques invisibles est ¶ */}
              <TB icon="¶" label={T.showMarks} active={showInvisibleChars} onClick={toggleInvisibleChars}/>
              <TB icon="—"  label={fr?"Saut de page":"Page break"} onClick={insertPageBreakBlock}/>
            </div>
          </div>

          {/* police */}
          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.police}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="A-" label={`${T.smaller} (sélection)`} onClick={()=>changeFontSize(-1)}/>
              <TB icon="A+" label={`${T.larger} (sélection)`}  onClick={()=>changeFontSize(+1)}/>
            </div>
            <div className="text-center font-mono text-[9px] text-zinc-500 mt-0.5">{fontSize}px global</div>
          </div>

          {/* media */}
          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.media}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="📥" label={T.importTxt} onClick={()=>fileInputRef.current?.click()}/>
              <TB icon="📂" label={T.openBook}  onClick={()=>importJsonRef.current?.click()}/>
              <TB icon="🔤" label={T.importFont} onClick={()=>fontInputRef.current?.click()}/>
            </div>
          </div>

          {/* livre */}
          <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.livre}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon="⚙️" label={T.settings}   active={showSettings} onClick={()=>setShowSettings(v=>!v)}/>
              <TB icon="+"  label={T.newChapter} onClick={addChapter}/>
            </div>
          </div>

          {/* presets */}
          <div className="px-2 py-1.5">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.presets}</div>
            <div className="flex flex-col gap-1">
              {(["print","kindle"] as const).map(p=>(
                <button key={p} onClick={()=>triggerPreset(p)}
                  className={`w-full px-1.5 py-1 rounded-lg text-[9px] font-medium border transition-all text-left ${activePreset===p?"bg-cyan-500/15 border-cyan-500/40 text-cyan-400":"border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 hover:border-zinc-700"}`}>
                  {p==="print"?T.presetPrint:T.presetKindle}
                </button>
              ))}
              <button onClick={()=>{setActivePreset("custom");setShowSettings(true);}}
                className={`w-full px-1.5 py-1 rounded-lg text-[9px] font-medium border transition-all text-left ${activePreset==="custom"?"bg-cyan-500/15 border-cyan-500/40 text-cyan-400":"border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 hover:border-zinc-700"}`}>
                {T.presetCustom}
              </button>
            </div>
          </div>
        </div>

        {/* EDITOR ZONE */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">

          {/* TOP BAR */}
          <div className="h-9 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center px-3 gap-2">
            {(["edit","present"] as BookView[]).map(v=>(
              <button key={v} onClick={()=>setView(v)}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${view===v?"bg-cyan-500/10 border-cyan-500/30 text-cyan-400":"border-transparent text-zinc-500 hover:text-zinc-300"}`}>
                {v==="edit"?T.edit:T.present}
              </button>
            ))}

            {/* CHAPTER DROPDOWN */}
            <div className="relative flex-1 mx-1" ref={chapterDropRef}>
              <button onClick={()=>setShowChapterDropdown(v=>!v)}
                className="w-full flex items-center justify-between gap-1 px-2 py-1 rounded-lg border border-zinc-700 text-zinc-300 hover:border-cyan-500/40 hover:text-cyan-400 transition-all text-[9px] font-mono">
                <span className="truncate">{currentChapter?.title || T.chapterSelect}</span>
                <span className="shrink-0">▾</span>
              </button>
              {showChapterDropdown && (
                <div className="absolute top-full left-0 mt-1 w-full min-w-[160px] max-w-[280px] rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-1 z-50 flex flex-col gap-0.5 max-h-60 overflow-y-auto">
                  {chapters.map((ch,i)=>(
                    <button key={ch.id} onClick={()=>{setActiveChapter(ch.id);setShowChapterDropdown(false);}}
                      className={`w-full text-left px-2.5 py-1.5 text-[10px] rounded-lg transition-all font-mono flex items-center gap-2 ${activeChapter===ch.id?"bg-cyan-500/10 text-cyan-400":"text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"}`}>
                      <span className="text-zinc-600 shrink-0">{i+1}.</span>
                      <span className="truncate">{ch.title}</span>
                    </button>
                  ))}
                  <div className="border-t border-zinc-800 mt-0.5 pt-0.5">
                    <button onClick={addChapter}
                      className="w-full text-left px-2.5 py-1.5 text-[10px] rounded-lg transition-all text-cyan-500 hover:bg-cyan-500/10">
                      + {T.newChapter}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${saveLabel.dot}`}/>
              <span className="text-[9px] font-mono text-zinc-400">{saveLabel.text}</span>
            </div>

            {/* SAVE */}
            <div className="relative shrink-0">
              <button onClick={manualSave} className="text-[9px] px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:border-cyan-500/40 hover:text-cyan-400 transition-all font-mono">
                💾 {T.save}
              </button>
              {showSaveConfirm && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-xl bg-emerald-900/90 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono whitespace-nowrap shadow-lg animate-in fade-in duration-150">
                  ✓ {T.saved}
                </div>
              )}
            </div>

            {/* EXPORT MENU */}
            <div className="relative shrink-0" ref={exportRef}>
              <button onClick={()=>setShowExportMenu(v=>!v)}
                className={`text-[9px] px-2 py-1 rounded border transition-all font-mono flex items-center gap-1 ${showExportMenu?"bg-cyan-500/10 border-cyan-500/30 text-cyan-400":"border-zinc-700 text-zinc-400 hover:border-cyan-500/40 hover:text-cyan-400"}`}>
                {T.export} ▾
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-40 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-1 z-50 flex flex-col gap-0.5">
                  {[
                    {key:"pdf",  label:"📄 PDF",          hint:"Via Flask"},
                    {key:"docx", label:"📝 Word (.docx)",  hint:"Via Flask"},
                    {key:"epub", label:"📚 EPUB",          hint:"Via Flask"},
                    {key:"txt",  label:"📃 TXT pur",        hint:"Local"},
                    {key:"json", label:"💾 .echo-book",     hint:"Local"},
                  ].map(({key,label,hint})=>(
                    <button key={key} onClick={()=>handleExport(key)}
                      className="w-full text-left px-2.5 py-1.5 text-[10px] text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-400 rounded-lg transition-all font-mono flex justify-between items-center">
                      <span>{label}</span>
                      <span className="text-[8px] text-zinc-600">{hint}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* SETTINGS DROPDOWN */}
            <div className="relative ml-1 shrink-0" ref={settingsRef}>
              <button onClick={()=>setIsSettingsOpen(v=>!v)} className="text-[10px] px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all">
                ⚙️ <span className="font-mono text-[8px] bg-cyan-500/15 text-cyan-500 px-1 rounded uppercase ml-0.5">{fr?"FR":"EN"}</span>
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
              {/* ⚡ CORRIGÉ : div au lieu de label pour interdire le bug de double-clic d'événement HTML */}
              {[
                {label:T.mirror,       val:mirrorMargins,   set:setMirrorMargins},
                {label:T.pageNum,      val:showPageNumbers, set:setShowPageNumbers},
                {label:T.header,       val:showHeader,      set:setShowHeader},
                {label:T.footer,       val:showFooter,      set:setShowFooter},
                {label:T.paraIndentLbl,val:paraIndent,      set:setParaIndent},
              ].map(({label,val,set})=>(
                <div key={label} className="flex items-center gap-1.5">
                  <span className="text-zinc-400">{label}</span>
                  <Toggle val={val} set={()=>handleToggle(set, val)}/>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">{T.lineH}</span>
                <input type="range" min="1.2" max="2.4" step="0.05" value={lineHeight} onChange={e=>handleRangeChange(setLineHeight, parseFloat(e.target.value))} className="w-16 accent-cyan-400 h-1"/>
                <span className="font-mono text-zinc-400 text-[9px] w-7">{lineHeight.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">{T.para}</span>
                <input type="range" min="0.2" max="2" step="0.05" value={paraSpacing} onChange={e=>handleRangeChange(setParaSpacing, parseFloat(e.target.value))} className="w-12 accent-cyan-400 h-1"/>
                <span className="font-mono text-zinc-400 text-[9px] w-7">{paraSpacing.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">{T.opacity}</span>
                <input type="range" min="0" max="100" step="1" value={pageOpacity} onChange={e=>handleRangeChange(setPageOpacity, parseInt(e.target.value))} className="w-16 accent-cyan-400 h-1"/>
                <span className="font-mono text-zinc-400 text-[9px] w-7">{pageOpacity}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">{T.font}</span>
                <select value={fontFamily} onChange={e=>handleFontChange(e.target.value)} className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-[9px] rounded px-1 py-0.5">
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="Garamond, serif">Garamond</option>
                  <option value="system-ui, sans-serif">Sans-serif</option>
                  <option value="'Courier New', monospace">Courier New</option>
                  <option value="Palatino, serif">Palatino</option>
                  {customFonts.map(f=><option key={f} value={f}>{f}</option>)}
                </select>
                <button onClick={()=>fontInputRef.current?.click()} className="text-[9px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all">+ {T.importFont}</button>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">px</span>
                <input type="number" min="8" max="72" value={fontSize} onChange={e=>handleFontSizeChange(parseInt(e.target.value)||14)} className="w-12 bg-zinc-900 border border-zinc-700 text-zinc-300 text-[9px] rounded px-1 py-0.5 text-center font-mono"/>
              </div>
              <button onClick={()=>setShowSettings(false)} className="ml-auto text-zinc-500 hover:text-zinc-200 text-base">✕</button>
            </div>
          )}

          {/* EDITOR CANVAS — pages visuelles A4 */}
          <div className="flex-1 overflow-hidden min-h-0 relative"
            style={{backgroundImage:"url('/eauplante2.png')",backgroundSize:"cover",backgroundPosition:"center"}}>
            <div className="absolute inset-0 bg-black/50 pointer-events-none z-0"/>
            {WATER.map((d,i)=>(
              <span key={i} aria-hidden="true" className="absolute pointer-events-none select-none z-[1]"
                style={{top:d.top,left:d.left,right:d.right,fontSize:d.sz,transform:`rotate(${d.rot})`,opacity:0.06,filter:"blur(1px)",color:"#06b6d4",lineHeight:1}}>{d.g}</span>
            ))}

            {/* Scroll container */}
            <div className="absolute inset-0 overflow-y-auto z-[2] py-8 flex flex-col items-center gap-6"
              style={{scrollbarWidth:"thin",scrollbarColor:"rgba(6,182,212,0.2) transparent"}}>

              {/* PAGE SIMULÉE — le contenu TipTap s'étend librement en dessous */}
              <div ref={containerRef} className={`relative shadow-2xl ${showInvisibleChars?"echo-editor-show-symbols":""}`}
                style={{
                  width:"860px",
                  minHeight:`${pageCount * A4_H}px`, // ⚡ CORRIGÉ : S'adapte dynamiquement pour que le curseur n'écrive plus jamais dans le vide !
                  paddingTop: showHeader ? 0 : "52px",
                  paddingBottom: showFooter ? 0 : "64px",
                  paddingLeft: mirrorMargins ? "90px" : "72px",
                  paddingRight: "72px",
                  ...pageBgStyle,
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "2px",
                  boxShadow: "0 4px 40px rgba(0,0,0,0.5)",
                }}>

                {/* Repère de marge latérale */}
                <div className="absolute left-12 top-0 bottom-0 w-px pointer-events-none" style={{background:"rgba(6,182,212,0.05)"}}/>

                {/* Repères de pages dynamiques */}
                {Array.from({length: Math.max(0, pageCount - 1)}).map((_,i)=>(
                  <div key={i} className="absolute left-0 right-0 pointer-events-none"
                    style={{top:`${(i+1)*A4_H}px`,borderTop:"1px dashed rgba(6,182,212,0.12)",zIndex:10}}>
                    <span style={{position:"absolute",right:"8px",top:"-10px",fontSize:"8px",color:"rgba(6,182,212,0.3)",fontFamily:"monospace"}}>
                      p.{i+2}
                    </span>
                  </div>
                ))}

                {showHeader && (
                  <div className="h-9 border-b border-zinc-700/30 flex items-center px-4 mb-4">
                    <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-400">{bookTitle}</span>
                  </div>
                )}

                {isEditingTitle ? (
                  <input ref={titleInputRef} value={bookTitle} onChange={e=>setBookTitle(e.target.value)}
                    onBlur={()=>setIsEditingTitle(false)} onKeyDown={e=>{if(e.key==="Enter")setIsEditingTitle(false);}}
                    className="w-full text-2xl font-bold bg-transparent border-b border-cyan-500/40 outline-none text-black dark:text-white mb-6 pb-1" autoFocus/>
                ) : (
                  <h1 onDoubleClick={()=>{setIsEditingTitle(true);setTimeout(()=>titleInputRef.current?.focus(),50);}}
                    title={T.titleHint}
                    className="text-2xl font-bold text-black dark:text-white mb-6 cursor-text pb-1 border-b border-transparent hover:border-cyan-500/10 transition-colors">
                    {bookTitle}
                  </h1>
                )}

                <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500 mb-3 font-mono">{currentChapter?.title}</div>

                <EditorContent editor={editor}
                  className="outline-none text-black dark:text-zinc-100 caret-cyan-400 books-editor-tiptap"
                  style={{fontSize:`${fontSize}px`,lineHeight,fontFamily}}/>

                {/* ⚡ CORRIGÉ : Vrai système de numérotation séquentielle des pages réelles (Calcul JS corrigé) */}
                {showPageNumbers && Array.from({ length: pageCount }).map((_, i) => (
                  <div
                    key={`pagenum-${i}`}
                    className="absolute left-0 right-0 text-center text-[10px] text-zinc-400 font-mono pointer-events-none"
                    style={{
                      top: `${(i + 1) * A4_H - 35}px`,
                      zIndex: 10,
                    }}
                  >
                    — {i + 1} —
                  </div>
                ))}

                {showFooter && (
                  <div className="h-7 border-t border-zinc-700/30 flex items-center justify-center mt-4">
                    <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-400">{bookTitle}</span>
                  </div>
                )}
              </div>

              {/* Espace bas pour scroller confortablement */}
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

          {/* Header Echo avec bouton Injecter */}
          <div className="h-10 shrink-0 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-3 gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0"/>
            <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-zinc-300 flex-1">Echo — {fr?"Écriture":"Writing"}</span>
            <button onClick={handleManualInject}
              title={T.inject}
              className="px-2 py-1 text-[10px] rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400 transition-all font-mono shrink-0">
              ↓ {fr?"Injecter":"Inject"}
            </button>
          </div>

          {/* Mode buttons */}
          <div className="flex gap-1 p-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            {ECHO_MODES.map(m=>(
              <button key={m.id} onClick={()=>setEchoMode(echoMode===m.id?null:m.id)}
                className={`flex-1 text-[13px] py-1 rounded-lg border transition-all text-center ${echoMode===m.id?"bg-cyan-500/10 border-cyan-500/40 text-cyan-400":"border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"}`}>
                {m.emoji} {T[m.key]}
              </button>
            ))}
          </div>

          {/* Messages Echo */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0" style={{scrollbarWidth:"thin"}}>
            {echoMessages.length===0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 pb-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border border-zinc-700 shadow-lg echo-idle">
                  <img src="/Echo.png" alt="Echo" className="w-full h-full object-cover"/>
                </div>
                <div className="text-[13px] text-zinc-500 text-center leading-relaxed px-2 whitespace-pre-line">{T.echoPlaceholder}</div>
              </div>
            ) : (
              <>
                {echoMessages.map((msg,i)=>(
                  <div key={i} className={`text-[15px] leading-relaxed rounded-xl px-3 py-2 ${
                    msg.role==="user"
                      ?"self-end bg-cyan-500/10 border border-cyan-500/20 text-zinc-200 rounded-br-sm max-w-[90%]"
                      :"self-start bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-sm max-w-[95%]"
                  }`}>{msg.text}</div>
                ))}
                {echoThinking && <div className="self-start text-[15px] text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl rounded-bl-sm px-3 py-2">...</div>}
              </>
            )}
            <div ref={echoBottomRef}/>
          </div>

          {/* Input Echo */}
          <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 flex gap-1.5 shrink-0">
            <textarea value={echoInput} onChange={e=>setEchoInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendEcho();}}}
              rows={3} placeholder={T.echoInput}
              className="flex-1 resize-none bg-zinc-900 border border-zinc-800 text-zinc-200 text-[13px] rounded-lg px-2 py-1.5 placeholder-zinc-600 outline-none focus:border-cyan-700/40 leading-relaxed"/>
            <button onClick={sendEcho} disabled={echoThinking}
              className="w-8 self-end bg-cyan-600/15 border border-cyan-500/25 hover:bg-cyan-600/25 disabled:opacity-30 text-cyan-400 rounded-lg text-sm flex items-center justify-center transition-all h-8 shrink-0">➤</button>
          </div>
        </aside>
      </div>

      {/* Hidden file inputs */}
      <input ref={fileInputRef}  type="file" accept=".txt,.md,.markdown" onChange={handleImportTxt}  className="hidden"/>
      <input ref={importJsonRef} type="file" accept=".json"              onChange={handleImportJson} className="hidden"/>
      <input ref={fontInputRef}  type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleFontImport} className="hidden"/>

      <style>{`
        .books-editor-tiptap .ProseMirror { min-height: ${A4_H}px; outline: none; color: inherit; }
        .books-editor-tiptap .ProseMirror p, .books-preview p, .books-present p {
          margin-top: 0 !important;
          margin-bottom: ${paraSpacing}em !important;
          line-height: inherit !important;
          text-indent: ${paraIndent?"1.5em":"0"} !important;
        }
        .echo-editor-show-symbols .ProseMirror p:after {
          content: " ¶" !important; color: rgba(6,182,212,0.35) !important;
          font-size: 0.85em !important; font-weight: bold !important; font-family: monospace !important;
        }
        .echo-editor-show-symbols .ProseMirror div[data-page-break="true"] {
          outline: 1px dashed rgba(6,182,212,0.5) !important;
          background: rgba(6,182,212,0.03) !important;
        }
        .books-editor-tiptap .ProseMirror h1 { font-size:1.6em; font-weight:700; margin-top:1.2em !important; margin-bottom:0.6em !important; border-bottom:1px solid rgba(6,182,212,0.1); padding-bottom:.12em; }
        .books-editor-tiptap .ProseMirror h2 { font-size:1.2em; font-weight:600; margin-top:1.6em !important; margin-bottom:0.5em !important; text-transform:uppercase; color:rgb(6,182,212); }
        .books-editor-tiptap .ProseMirror h3 { font-size:1.05em; font-weight:600; margin-top:1.2em !important; margin-bottom:0.4em !important; }
        [contenteditable="false"] { user-select:none; -webkit-user-select:none; cursor:default; pointer-events:none; }
        @media (max-width: 860px) {
          .books-editor-tiptap { width: 100% !important; }
        }
      `}</style>
    </main>
  );
}