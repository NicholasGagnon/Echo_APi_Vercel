"use client";

import { useState, useEffect, useRef, useCallback, ReactNode, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useApp } from "../../context/AppContext";
import QuotaPopup from "../components/QuotaPopup";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { TextAlign } from "@tiptap/extension-text-align";

export const dynamic = "force-dynamic";

type EchoMode    = "creative" | "ideas" | "critical";
type BookView    = "edit" | "present";
type BookMessage = { role: "user" | "echo"; text: string; imageB64?: string };
type Chapter     = { id: string; title: string; content: string };
type CurrencyCode = "CAD" | "USD" | "EUR";

const MAX_FREE_CREDITS = 20;
const REGEN_1H_MS = 60 * 60 * 1000; // 1 heure
const REGEN_ADD_AMOUNT = 2; // +2 crédits par heure

const CURRENCIES: CurrencyCode[] = ["CAD", "USD", "EUR"];
const PRICES: Record<CurrencyCode, { amount: string; symbol: string }> = {
  CAD: { amount: "3.99", symbol: "CA$" },
  USD: { amount: "3.99", symbol: "US$" },
  EUR: { amount: "3.99", symbol: "€" },
};

const MicrosoftLogo = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23" fill="none">
    <path d="M0 0H11V11H0V0Z" fill="#F25022"/>
    <path d="M12 0H23V11H12V0Z" fill="#7FBA00"/>
    <path d="M0 12H11V23H0V12Z" fill="#00A4EF"/>
    <path d="M12 12H23V23H12V12Z" fill="#FFB900"/>
  </svg>
);

const GoogleLogo = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 2.18 2.18 4.94l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

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
    undo:"Annuler", redo:"Refaire",
    injectConfirmTitle:"Injection de texte",
    injectConfirmBody:"Vous allez injecter du texte dans votre livre.",
    injectConfirmWarning:"Assurez-vous de placer votre curseur sur la ligne souhaitée avant de confirmer.",
    injectOk:"OK — Injecter",
    injectCancel:"Annuler",
    injectUndo:"⬅️ Annuler (Ctrl+Z)",
    injectRedo:"➡️ Refaire (Ctrl+Y)",
    recontextBtn:"📖 Remettre en contexte",
    recontextWarning:"Echo va lire l'extrait actuel du livre pour se remettre en contexte. Cela consommera 1 crédit.",
    recontextConfirm:"Confirmer",
    recontextCancel:"Annuler",
    recontextDone:"Echo a relu le livre. Il est maintenant à jour.",
    loginPopupTitle:"Atelier d'écriture Echo",
    loginPopupBody:"Connectez-vous pour sauvegarder vos livres, retrouver votre progression et continuer sur tous vos appareils.",
    loginPopupBtn:"Se connecter",
    loginPopupSkip:"Continuer sans compte",
    tutoTitle:"ECHO LIVRES",
    tutoWelcome:"Bienvenue dans l'atelier d'écriture ! 📖\n\nÉcris, structure et donne vie à ton livre avec l'aide d'Echo.\n\nDis-lui \"injecte\" pour qu'il ajoute directement du texte dans ton chapitre.",
    tutoStart:"C'EST PARTI 🚀",
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
    undo:"Undo", redo:"Redo",
    injectConfirmTitle:"Text Injection",
    injectConfirmBody:"You are about to inject text into your book.",
    injectConfirmWarning:"Make sure to place your cursor on the desired line before confirming.",
    injectOk:"OK — Inject",
    injectCancel:"Cancel",
    injectUndo:"⬅️ Undo (Ctrl+Z)",
    injectRedo:"➡️ Redo (Ctrl+Y)",
    recontextBtn:"📖 Reload context",
    recontextWarning:"Echo will read the current book excerpt to get back in context. This will use 1 credit.",
    recontextConfirm:"Confirm",
    recontextCancel:"Cancel",
    recontextDone:"Echo has re-read the book and is now up to date.",
    loginPopupTitle:"Echo Writing Studio",
    loginPopupBody:"Sign in to save your books, pick up where you left off, and continue on any device.",
    loginPopupBtn:"Sign in",
    loginPopupSkip:"Continue without account",
    tutoTitle:"ECHO BOOKS",
    tutoWelcome:"Welcome to the writing studio! 📖\n\nWrite, structure and bring your book to life with Echo's help.\n\nTell him \"inject\" to add text directly into your chapter.",
    tutoStart:"LET'S GO 🚀",
  },
};

const ECHO_MODES: { id: EchoMode; key: "creative"|"ideas"|"critical"; icon: ReactNode }[] = [
  { id:"creative", key:"creative", icon:(<svg viewBox="0 0 18 18" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 15l2-5L13 2a2 2 0 0 1 3 3L8 13z"/><line x1="11" y1="4" x2="14" y2="7"/><line x1="3" y1="15" x2="5" y2="10"/></svg>) },
  { id:"ideas",    key:"ideas",    icon:(<svg viewBox="0 0 18 18" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><line x1="9" y1="11" x2="9" y2="13"/><line x1="7" y1="15" x2="11" y2="15"/><line x1="6" y1="13" x2="12" y2="13"/></svg>) },
  { id:"critical", key:"critical", icon:(<svg viewBox="0 0 18 18" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="7"/><line x1="9" y1="5" x2="9" y2="9"/><circle cx="9" cy="12" r="0.8" fill="currentColor" stroke="none"/></svg>) },
];

const A4_W = 860;
const A4_H = 1122;

const Icons: Record<string, ReactNode> = {
  T1: <span className="font-black text-[12px] leading-none" style={{fontFamily:"Georgia,serif"}}>T<sup className="text-[8px]">1</sup></span>,
  T2: <span className="font-black text-[12px] leading-none" style={{fontFamily:"Georgia,serif"}}>T<sup className="text-[8px]">2</sup></span>,
  T3: <span className="font-bold  text-[12px] leading-none" style={{fontFamily:"Georgia,serif"}}>T<sup className="text-[8px]">3</sup></span>,
  Abc:(<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor"><path d="M8 2h4v1.2h-1.2V14H9.6V3.2H8a2.8 2.8 0 0 0 0 5.6h.8V10H8a4 4 0 0 1 0-8z"/></svg>),
  B:  <span className="font-black text-[15px] leading-none" style={{fontFamily:"Georgia,serif"}}>B</span>,
  I:  <span className="font-semibold text-[15px] leading-none" style={{fontFamily:"Georgia,serif",fontStyle:"italic"}}>I</span>,
  indent:    (<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="6" y1="8" x2="14" y2="8"/><line x1="6" y1="12" x2="14" y2="12"/><polyline points="2,7 4,9 2,11" fill="currentColor" stroke="none"/></svg>),
  undo:      (<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7H10a4 4 0 0 1 0 8H6"/><polyline points="6,4 3,7 6,10"/></svg>),
  redo:      (<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 7H6a4 4 0 0 0 0 8h4"/><polyline points="10,4 13,7 10,10"/></svg>),
  alignL:    (<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="7" x2="10" y2="7"/><line x1="2" y1="10" x2="13" y2="10"/><line x1="2" y1="13" x2="8" y2="13"/></svg>),
  alignC:    (<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="4" y1="7" x2="12" y2="7"/><line x1="2" y1="10" x2="14" y2="10"/><line x1="5" y1="13" x2="11" y2="13"/></svg>),
  alignR:    (<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="6" y1="7" x2="14" y2="7"/><line x1="3" y1="10" x2="14" y2="10"/><line x1="8" y1="13" x2="14" y2="13"/></svg>),
  alignJ:    (<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="7" x2="14" y2="7"/><line x1="2" y1="10" x2="14" y2="10"/><line x1="2" y1="13" x2="14" y2="13"/></svg>),
  pilcrow:   (<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor"><path d="M8 2h4v1.2h-1.2V14H9.6V3.2H8a2.8 2.8 0 0 0 0 5.6h.8V10H8a4 4 0 0 1 0-8z"/></svg>),
  pageBreak: (<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="2" y1="5" x2="14" y2="5"/><line x1="2" y1="11" x2="14" y2="11" strokeDasharray="2 1.5"/><line x1="2" y1="8" x2="5" y2="8"/><line x1="11" y1="8" x2="14" y2="8"/><polyline points="6,6 8,8 10,6" fill="none"/><polyline points="6,10 8,8 10,10" fill="none"/></svg>),
  fontSmaller:(<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor"><text x="1" y="12" fontSize="11" fontFamily="serif" fontWeight="700">A</text><text x="9" y="13" fontSize="7" fontFamily="serif">−</text></svg>),
  fontLarger: (<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor"><text x="1" y="12" fontSize="11" fontFamily="serif" fontWeight="700">A</text><text x="9" y="13" fontSize="7" fontFamily="serif">+</text></svg>),
  importTxt: (<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6z"/><polyline points="9,2 9,6 13,6"/><line x1="8" y1="7" x2="8" y2="11"/><polyline points="6,9 8,7 10,9"/></svg>),
  openBook:  (<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h4a2 2 0 0 1 2 2v8a1.5 1.5 0 0 0-2-1.5H2z"/><path d="M14 3h-4a2 2 0 0 0-2 2v8a1.5 1.5 0 0 1 2-1.5h4z"/></svg>),
  importFont:(<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><text x="1" y="12" fontSize="11" fontFamily="serif" fontWeight="700" fontStyle="italic" fill="currentColor" stroke="none">A</text><line x1="11" y1="8" x2="11" y2="14"/><line x1="8.5" y1="11" x2="13.5" y2="11"/></svg>),
  insertImg:(<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="10" rx="1.5"/><circle cx="5.5" cy="6.5" r="1"/><polyline points="2,12 5,8 8,11 10,9 14,12"/></svg>),
  settings:  (<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/></svg>),
  addChapter:(<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>),
  presetPrint:  (<svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="10" height="6" rx="1"/><path d="M4 5V3h6v2"/><rect x="4" y="8" width="6" height="1.5" rx="0.5" fill="currentColor" stroke="none"/></svg>),
  presetKindle: (<svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="1" width="10" height="12" rx="1.5"/><line x1="4" y1="4" x2="10" y2="4"/><line x1="4" y1="6" x2="10" y2="6"/><line x1="4" y1="8" x2="8" y2="8"/><circle cx="7" cy="11" r="0.8" fill="currentColor" stroke="none"/></svg>),
  presetCustom: (<svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="2.2"/><path d="M7 1.5v1.5M7 11v1.5M1.5 7H3M11 7h1.5M3.2 3.2l1 1M9.8 9.8l1 1M3.2 10.8l1-1M9.8 4.2l1-1"/></svg>),
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

const LS_KEY = (uid: string | null) => uid ? `echo-books-${uid}` : "echo-books-anon";

function BooksContent() {
  const { lang, setLang, theme, toggleTheme } = useApp();
  const fr = lang === "fr";
  const T  = I[lang as "fr"|"en"] ?? I.fr;

  const [user, setUser] = useState<any>(null);
  const [currentUserTier, setCurrentUserTier] = useState<string>("free");

  // Quotas
  const [availableQuota, setAvailableQuota] = useState<number>(MAX_FREE_CREDITS);
  const [nextRegenIn, setNextRegenIn] = useState<number>(0);

  const [currency, setCurrency] = useState<CurrencyCode>("CAD");
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendEmail, setResendEmail] = useState("");

  const isPaidTier = currentUserTier && currentUserTier !== "free" && currentUserTier !== "connected_free";
  const isImageButtonLocked = !isPaidTier;

  const [userId,   setUserId]   = useState<string|null>(null);
  const [bookDbId, setBookDbId] = useState<string|null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([{ id:"ch1", title:fr?"Chapitre 1":"Chapter 1", content:"" }]);
  const [activeChapter, setActiveChapter] = useState("ch1");
  const [bookTitle, setBookTitle] = useState(fr?"Mon Premier Livre":"My First Book");
  const [isEditingTitle, setIsEditingTitle]         = useState(false);
  const [isEditingChapterTitle, setIsEditingChapterTitle] = useState(false);
  const [view, setView] = useState<BookView>("edit");
  const titleInputRef        = useRef<HTMLInputElement>(null);
  const chapterTitleInputRef = useRef<HTMLInputElement>(null);
  const [showChapterDropdown, setShowChapterDropdown] = useState(false);
  const chapterDropRef = useRef<HTMLDivElement>(null);

  const [showInjectConfirm, setShowInjectConfirm] = useState(false);
  const [pendingInjectText, setPendingInjectText] = useState<string|null>(null);

  const [mirrorMargins,     setMirrorMargins]     = useState(false);
  const [showPageNumbers,   setShowPageNumbers]   = useState(true);
  const [showHeader,        setShowHeader]        = useState(false);
  const [headerText,        setHeaderText]        = useState("");
  const [isEditingHeader,   setIsEditingHeader]   = useState(false);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const [fontSize,          setFontSize]          = useState(15);
  const [fontFamily,        setFontFamily]        = useState("Georgia, serif");
  const [customFonts,       setCustomFonts]       = useState<string[]>([]);
  const [lineHeight,        setLineHeight]        = useState(1.8);
  const [isJustified,       setIsJustified]       = useState(true);
  const [activePreset,      setActivePreset]      = useState<"print"|"kindle"|"custom"|null>(null);
  const [pageOpacity,       setPageOpacity]       = useState(95);
  const [showInvisibleChars,setShowInvisibleChars]= useState(false);
  const [showSettings,      setShowSettings]      = useState(true);
  const [showSaveConfirm,   setShowSaveConfirm]   = useState(false);
  const [showQuotaPopup,    setShowQuotaPopup]    = useState(false);
  const [memorySummary,     setMemorySummary]     = useState("");
  const [dataLoaded,        setDataLoaded]        = useState(false);
  const [showLoginPopup,    setShowLoginPopup]    = useState(false);

  const getBooksSummaryKey = (uid: string|null) => uid ? `echo-books-summary-${uid}` : "echo-books-summary";

  useEffect(() => {
    localStorage.setItem("echo-tuto-books-done-v1", "true");
  }, []);

  const [pageCount,   setPageCount]   = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePageCount = useCallback(() => {
    if (!containerRef.current) return;
    const pmEl = containerRef.current.querySelector('.ProseMirror') as HTMLElement | null;
    const h = pmEl ? pmEl.scrollHeight + 52 + 64 : containerRef.current.scrollHeight;
    setPageCount(Math.max(1, Math.ceil(h / A4_H)));
  }, []);

  useEffect(() => { const t = setTimeout(updatePageCount, 150); return () => clearTimeout(t); }, [chapters, activeChapter, view, updatePageCount]);
  useEffect(() => { window.addEventListener("resize", updatePageCount); return () => window.removeEventListener("resize", updatePageCount); }, [updatePageCount]);

  const activeChapterRef = useRef(activeChapter);
  useEffect(() => { activeChapterRef.current = activeChapter; }, [activeChapter]);

  const chaptersRef = useRef(chapters);
  useEffect(() => { chaptersRef.current = chapters; }, [chapters]);

  const isLoadingRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
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
    onSelectionUpdate: ({ editor }) => {
      if (isLoadingRef.current) return;
      const { $from, empty } = editor.state.selection;

      const stored = editor.state.storedMarks;
      if (stored) {
        const m = stored.find((m: any) => m.type.name === "textStyle");
        if (m?.attrs?.fontSize) {
          const n = parseInt(m.attrs.fontSize, 10);
          if (!isNaN(n)) { setFontSize(n); return; }
        }
      }

      if ($from.pos > 0) {
        const marksAt = $from.doc.resolve(Math.max(0, $from.pos - 1)).marks();
        const m = marksAt.find((m: any) => m.type.name === "textStyle");
        if (m?.attrs?.fontSize) {
          const n = parseInt(m.attrs.fontSize, 10);
          if (!isNaN(n)) { setFontSize(n); return; }
        }
      }

      if (!empty) {
        const attrs = editor.getAttributes("textStyle");
        if (attrs?.fontSize) {
          const n = parseInt(attrs.fontSize, 10);
          if (!isNaN(n)) { setFontSize(n); return; }
        }
      }

      const saved = localStorage.getItem(`echo-book-base-size-${activeChapterRef.current}`);
      setFontSize(saved ? parseInt(saved, 10) : 15);
    },
    onUpdate: ({ editor }) => {
      if (isLoadingRef.current) return;
      const html = editor.getHTML();
      const chId = activeChapterRef.current;
      setChapters(prev => {
        const existing = prev.find(c => c.id === chId);
        const normalize = (s: string) => s.replace(/<p><br\s*\/?><\/p>/g,"<p></p>").replace(/\s+/g," ").trim();
        if (normalize(existing?.content || "") === normalize(html)) return prev;
        return prev.map(c => c.id === chId ? { ...c, content: html } : c);
      });
      setTimeout(updatePageCount, 50);
    },
  });

  useEffect(() => {
    if (!editor || view !== "edit") return;
    const cur = chaptersRef.current.find(c => c.id === activeChapter);
    const newContent = cur?.content || "<p></p>";
    if (editor.getHTML() === newContent) return;
    editor.commands.setContent(newContent);
  }, [activeChapter, view, editor]);

  useEffect(() => {
    if (editor) editor.commands.setFontFamily(fontFamily);
  }, [fontFamily, editor]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault(); editor?.commands.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault(); editor?.commands.redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editor]);

  const toggleBold   = () => editor?.chain().focus().toggleBold().run();
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run();

  const changeFontSize = (delta: number) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from !== to) {
      const current = parseInt(editor.getAttributes("textStyle").fontSize) || fontSize;
      const next = Math.min(72, Math.max(8, current + delta));
      editor.chain().focus().setMark("textStyle", { fontSize:`${next}px` }).run();
      setFontSize(next);
    } else {
      const next = Math.min(72, Math.max(8, fontSize + delta));
      setFontSize(next);
      localStorage.setItem(`echo-book-base-size-${activeChapterRef.current}`, next.toString());
    }
  };

  const insertIndent    = () => { editor?.chain().focus().insertContent('\u00a0\u00a0\u00a0\u00a0').run(); };
  const insertPageBreak = () => {
    editor?.commands.insertContent(
      `<div data-page-break="true" contenteditable="false" style="user-select:none;border-top:2px dashed rgba(6,182,212,0.4);margin:2rem 0;text-align:center;font-size:9px;color:rgba(6,182,212,0.5);letter-spacing:0.3em;padding-top:6px;font-family:monospace;">── ${fr?"SAUT DE PAGE":"PAGE BREAK"} ──</div><p></p>`
    );
  };

  const injectTextAtEnd = useCallback((text: string) => {
    if (!editor) return;
    const { doc } = editor.state;
    editor.chain().focus().setTextSelection(doc.content.size - 1).insertContent(`<p>${text}</p>`).run();
  }, [editor]);

  const requestInject = (text: string) => {
    setPendingInjectText(text);
    setShowInjectConfirm(true);
  };

  const confirmInject = () => {
    if (!pendingInjectText) return;
    injectTextAtEnd(pendingInjectText);
    const updatedChapters = chaptersRef.current.map(c =>
      c.id === activeChapterRef.current ? { ...c, content: editor?.getHTML() || c.content } : c
    );
    saveBook(updatedChapters, bookTitle);
    setEchoMessages(prev => [...prev, { role:"echo", text: fr?"Texte injecté dans le chapitre.":"Text injected into chapter." }]);
    setShowInjectConfirm(false);
    setPendingInjectText(null);
  };

  const addChapter = () => {
    const id = `ch${Date.now()}`;
    setChapters(prev => [...prev, { id, title:fr?`Chapitre ${prev.length+1}`:`Chapter ${prev.length+1}`, content:"" }]);
    setActiveChapter(id);
    setShowChapterDropdown(false);
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (chapterDropRef.current && !chapterDropRef.current.contains(e.target as Node)) setShowChapterDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const [saveStatus, setSaveStatus] = useState<"saved"|"saving"|"unsaved">("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const userIdRef = useRef<string|null>(null);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  const sanitizeChapters = (chs: Chapter[]): Chapter[] =>
    chs.map(c => ({
      ...c,
      content: c.content.replace(/src="data:[^"]{100,}"/g, 'src="[image]"'),
    }));

  const saveBook = useCallback(async (currentChapters: Chapter[], currentTitle: string) => {
    const uid = userIdRef.current;
    const payload = { bookTitle: currentTitle, chapters: currentChapters, savedAt: Date.now() };

    try { localStorage.setItem(LS_KEY(uid), JSON.stringify(payload)); } catch {}

    if (!uid) { setSaveStatus("saved"); return; }
    setSaveStatus("saving");

    const safeChapters = sanitizeChapters(currentChapters);

    try {
      const { error } = await supabase.from("echo_books").upsert({
        user_id:    uid,
        book_title: currentTitle,
        chapters:   safeChapters,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      if (error) {
        const safePayload = { ...payload, chapters: safeChapters };
        if (bookDbId) {
          await supabase.from("echo_conversations")
            .update({ messages:[safePayload], updated_at:new Date().toISOString() })
            .eq("id", bookDbId).eq("user_id", uid);
        } else {
          const { data } = await supabase.from("echo_conversations")
            .insert({ user_id:uid, source:"books", messages:[safePayload], updated_at:new Date().toISOString() })
            .select("id").single();
          if (data?.id) setBookDbId(data.id);
        }
      }
    } catch (e) { console.error("[Books] save:", e); }
    setSaveStatus("saved");
  }, [bookDbId]);

  useEffect(() => {
    if (!dataLoaded) return;
    setSaveStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveBook(chapters, bookTitle), 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [chapters, bookTitle, saveBook, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    const interval = setInterval(() => saveBook(chaptersRef.current, bookTitle), 10000);
    return () => clearInterval(interval);
  }, [dataLoaded, saveBook]);

  const manualSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveBook(chapters, bookTitle);
    setShowSaveConfirm(true);
    setTimeout(() => setShowSaveConfirm(false), 2000);
  };

  const verifierStatutUser = async (uid: string) => {
    try {
      const { data: bData } = await supabase.from("books_quotas").select("tier").eq("user_id", uid).maybeSingle();
      if (bData?.tier && bData.tier !== "free" && bData.tier !== "connected_free") {
        setCurrentUserTier(bData.tier); return;
      }
      setCurrentUserTier("free");
    } catch { setCurrentUserTier("free"); }
  };

  const chargerQuotaUtilisateur = async (uid: string) => {
    try {
      const { data } = await supabase
        .from("books_quotas")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();

      const now = Date.now();
      if (data) {
        const tier = (data.tier || "free");
        setCurrentUserTier(tier);

        if (tier === "premium" || tier === "advantage") {
          setAvailableQuota(999);
          return;
        }

        const lastRegen = new Date(data.last_regen_at || data.created_at).getTime();
        const elapsed = now - lastRegen;
        const cycles = Math.floor(elapsed / REGEN_1H_MS);
        const available = Math.min(MAX_FREE_CREDITS, (data.available_credits ?? MAX_FREE_CREDITS) + (cycles * REGEN_ADD_AMOUNT));

        setAvailableQuota(available);

        if (available < MAX_FREE_CREDITS) {
          setNextRegenIn(REGEN_1H_MS - (elapsed % REGEN_1H_MS));
        }
      } else {
        await supabase.from("books_quotas").insert({
          user_id: uid,
          available_credits: MAX_FREE_CREDITS,
          tier: "free",
          last_regen_at: new Date().toISOString(),
        });
        setAvailableQuota(MAX_FREE_CREDITS);
        setCurrentUserTier("free");
      }
    } catch {
      setAvailableQuota(MAX_FREE_CREDITS);
    }
  };

  const verifierQuotaAnonyme = () => {
    try {
      const savedAnon = parseInt(localStorage.getItem("books_anon_used") || "0");
      setAvailableQuota(Math.max(0, MAX_FREE_CREDITS - savedAnon));
    } catch {
      setAvailableQuota(MAX_FREE_CREDITS);
    }
  };

  const consommerUnCredit = async (): Promise<boolean> => {
    if (currentUserTier === "premium" || currentUserTier === "advantage") return true;

    if (!user) {
      const currentUsed = parseInt(localStorage.getItem("books_anon_used") || "0");
      if (currentUsed >= MAX_FREE_CREDITS) {
        setShowSignInModal(true);
        return false;
      }
      localStorage.setItem("books_anon_used", String(currentUsed + 1));
      setAvailableQuota(Math.max(0, MAX_FREE_CREDITS - (currentUsed + 1)));
      return true;
    }

    const now = Date.now();
    const { data } = await supabase
      .from("books_quotas")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    let avail = data?.available_credits ?? MAX_FREE_CREDITS;
    let lastRegen = data ? new Date(data.last_regen_at).getTime() : now;

    if (data && currentUserTier === "free") {
      const elapsed = now - lastRegen;
      const cycles = Math.floor(elapsed / REGEN_1H_MS);
      avail = Math.min(MAX_FREE_CREDITS, avail + (cycles * REGEN_ADD_AMOUNT));
      if (cycles > 0) lastRegen = now;
    }

    if (avail < 1) {
      const elapsed = now - lastRegen;
      setNextRegenIn(REGEN_1H_MS - (elapsed % REGEN_1H_MS));
      setShowStripeModal(true);
      return false;
    }

    const newAvail = avail - 1;
    setAvailableQuota(newAvail);

    await supabase.from("books_quotas").upsert({
      user_id: user.id,
      available_credits: newAvail,
      tier: currentUserTier,
      last_regen_at: new Date(lastRegen).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return true;
  };

  const loadBook = useCallback(async (uid: string | null) => {
    let loaded = false;

    if (uid) {
      try {
        const { data: row } = await supabase.from("echo_books")
          .select("book_title,chapters,updated_at")
          .eq("user_id", uid)
          .maybeSingle();
        if (row?.chapters?.length) {
          const chs: Chapter[] = row.chapters as Chapter[];
          setBookTitle(row.book_title || (fr?"Mon Premier Livre":"My First Book"));
          setChapters(chs);
          setActiveChapter(chs[0].id);
          isLoadingRef.current = true;
          setTimeout(() => { editor?.commands.setContent(chs[0].content || "<p></p>"); isLoadingRef.current = false; }, 150);
          loaded = true;
        }
      } catch {}

      if (!loaded) {
        try {
          const { data: rows } = await supabase.from("echo_conversations")
            .select("id,messages")
            .eq("user_id", uid)
            .eq("source", "books")
            .order("updated_at", { ascending: false })
            .limit(1);
          if (rows?.[0]) {
            setBookDbId(rows[0].id);
            const raw = rows[0].messages?.[0];
            const p = typeof raw === "string" ? JSON.parse(raw) : raw;
            if (p?.chapters?.length) {
              const chs: Chapter[] = p.chapters;
              if (p.bookTitle) setBookTitle(p.bookTitle);
              setChapters(chs);
              setActiveChapter(chs[0].id);
              setTimeout(() => { isLoadingRef.current = true; editor?.commands.setContent(chs[0].content || "<p></p>"); isLoadingRef.current = false; }, 150);
              loaded = true;
            }
          }
        } catch {}
      }
    }

    if (!loaded) {
      try {
        const raw = localStorage.getItem(LS_KEY(uid));
        if (raw) {
          const p = JSON.parse(raw);
          if (p?.chapters?.length) {
            if (p.bookTitle) setBookTitle(p.bookTitle);
            setChapters(p.chapters);
            setActiveChapter(p.chapters[0].id);
            setTimeout(() => { isLoadingRef.current = true; editor?.commands.setContent(p.chapters[0].content || "<p></p>"); isLoadingRef.current = false; }, 150);
            loaded = true;
          }
        }
      } catch {}
    }

    const savedSummary = localStorage.getItem(getBooksSummaryKey(uid));
    if (savedSummary) setMemorySummary(savedSummary);
    setSaveStatus("saved");
    setDataLoaded(true);
  }, [editor, fr]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      if (session?.user) {
        setUser(session.user);
        verifierStatutUser(session.user.id);
        chargerQuotaUtilisateur(session.user.id);
      } else {
        verifierQuotaAnonyme();
      }
      loadBook(uid);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, s) => {
      const uid = s?.user?.id || null;
      setUserId(uid);
      if (s?.user) {
        setUser(s.user);
        verifierStatutUser(s.user.id);
        chargerQuotaUtilisateur(s.user.id);
      } else {
        setUser(null);
        setCurrentUserTier("free");
        verifierQuotaAnonyme();
      }
      if (!dataLoaded) loadBook(uid);
    });

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
  const insertImgRef  = useRef<HTMLInputElement>(null);

  const [showRecontextModal, setShowRecontextModal] = useState(false);

  const handleInsertImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file || !editor) return;
    const uid = userIdRef.current;
    if (!uid) {
      alert(fr ? "Connectez-vous pour insérer des images (stockage permanent requis)." : "Please log in to insert images (permanent storage required).");
      return;
    }
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${uid}/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from("book-media").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("book-media").getPublicUrl(data.path);
      editor.chain().focus().insertContent(`<img src="${publicUrl}" style="max-width:100%;height:auto;border-radius:4px;margin:0.5em 0;" />`).run();
    } catch (err) {
      console.error("[Storage Upload Error]:", err);
      alert(fr ? "Erreur lors de l'enregistrement de l'image." : "Error uploading image.");
    }
  };

  const handleRecontext = async () => {
    if (!editor) return;
    const autorise = await consommerUnCredit();
    if (!autorise) return;

    const { from, to } = editor.state.selection;
    const textToSync = from !== to
      ? editor.state.doc.textBetween(from, to, " ")
      : editor.getText();
    if (!textToSync.trim()) return;
    setEchoMessages(prev => [...prev, { role:"user" as const, text: fr?"📖 Synchronisation du contexte...":"📖 Syncing context..." }]);
    setEchoThinking(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/memory-summary`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          summary: memorySummary,
          messages: [{ role:"user", text:`Met à jour ton contexte immédiat avec cet extrait : ${textToSync.slice(0,4000)}` }],
          userTier: isPaidTier ? "premium" : "free",
        }),
      });
      const data = await res.json();
      if (data.summary) {
        setMemorySummary(data.summary);
        localStorage.setItem(getBooksSummaryKey(userId), data.summary);
      }
      setEchoMessages(prev => { const u = [...prev, {role:"echo" as const, text:T.recontextDone}]; saveEchoConvo(u); return u; });
    } catch {
      setEchoMessages(prev => [...prev, {role:"echo" as const, text:T.serverErr}]);
    } finally {
      setEchoThinking(false);
    }
  };

  const handleFontImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^.]+$/, "");
    const face = new FontFace(name, `url(${url})`);
    face.load().then(loaded => {
      document.fonts.add(loaded); setCustomFonts(prev => [...prev, name]);
      setFontFamily(`"${name}", serif`);
      if (editor) editor.commands.setFontFamily(`"${name}", serif`);
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
    if (fmt === "json") {
      downloadBlob(new Blob([JSON.stringify({bookTitle,chapters},null,2)], {type:"application/json"}), `${slug}.echo-book.json`); return;
    }
    const formattedHtml = `<div style="font-size:${fontSize}px;font-family:${fontFamily};line-height:${lineHeight};">${currentHtml}</div>`;
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/export`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ format:fmt, title:bookTitle, html:formattedHtml })
      });
      if (!res.ok) { const err = await res.json(); alert(`Export error: ${err.error}`); return; }
      const blob = await res.blob();
      downloadBlob(blob, `${slug}${fmt==="pdf"?".pdf":fmt==="docx"?".docx":".epub"}`);
    } catch(e) { alert(`Cannot reach export server: ${e}`); }
  };

  const [echoMode,      setEchoMode]      = useState<EchoMode|null>(null);
  const [echoMessages,  setEchoMessages]  = useState<BookMessage[]>([]);
  const [echoInput,     setEchoInput]     = useState("");
  const [echoThinking,  setEchoThinking]  = useState(false);
  const [isListening,   setIsListening]   = useState(false);
  const [imageBase64,   setImageBase64]   = useState<string|null>(null);
  const [imageName,     setImageName]     = useState<string|null>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const echoBottomRef = useRef<HTMLDivElement>(null);

  const getEchoConvoKey = (uid: string|null) => uid ? `echo-books-convo-${uid}` : "echo-books-convo-anon";

  const saveEchoConvo = useCallback(async (msgs: BookMessage[]) => {
    const uid = userIdRef.current;
    try { localStorage.setItem(getEchoConvoKey(uid), JSON.stringify(msgs.slice(-50))); } catch {}
    if (!uid) return;
    try {
      const { data: existing } = await supabase.from("echo_conversations")
        .select("id").eq("user_id", uid).eq("source", "books_chat").maybeSingle();
      const payload = msgs.slice(-50).map(m => ({ role: m.role, text: m.text }));
      if (existing?.id) {
        await supabase.from("echo_conversations")
          .update({ messages: payload, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("echo_conversations")
          .insert({ user_id: uid, source: "books_chat", messages: payload, updated_at: new Date().toISOString() });
      }
    } catch(e) { console.error("[Books convo save]", e); }
  }, []);

  useEffect(() => {
    const uid = userIdRef.current;
    try {
      const raw = localStorage.getItem(getEchoConvoKey(uid));
      if (raw) { const msgs = JSON.parse(raw); if (msgs?.length) setEchoMessages(msgs); }
    } catch {}
    if (uid) {
      supabase.from("echo_conversations")
        .select("messages").eq("user_id", uid).eq("source", "books_chat").maybeSingle()
        .then(({ data }) => {
          if (data?.messages?.length) setEchoMessages(data.messages as BookMessage[]);
        });
    }
  }, [dataLoaded]);

  const sendEcho = async () => {
    if ((!echoInput.trim() && !imageBase64) || echoThinking) return;

    const autorise = await consommerUnCredit();
    if (!autorise) return;

    let currentSummary = memorySummary;
    if (echoMessages.length > 10) {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const memRes = await fetch(`${API_URL}/memory-summary`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            summary:  memorySummary,
            messages: echoMessages.map(m => `${m.role==="user"?"You":"Echo"}: ${m.text}`).slice(0,500),
            userTier: isPaidTier ? "premium" : "free",
          }),
        });
        const memData  = await memRes.json();
        currentSummary = memData.summary || memorySummary;
        setMemorySummary(currentSummary);
        localStorage.setItem(getBooksSummaryKey(userId), currentSummary);
      } catch(e) { console.error("[MEMORY Books]", e); }
    }

    const msg = echoInput.trim() || (fr?"Analyse cette image.":"Analyze this image.");
    const currentImage = imageBase64;
    setEchoInput(""); setImageBase64(null); setImageName(null);
    setEchoMessages(prev => [...prev, {role:"user", text:msg, imageB64: currentImage ?? undefined}]);
    setEchoThinking(true);
    const history = echoMessages.map(m => m.role==="user" ? `You: ${m.text}` : `Echo: ${m.text}`);
    const excerpt = editor?.getText()?.slice(0,300) || "";

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/books`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          message:`[Livre: "${bookTitle}" | Extrait: "${excerpt}"]\n\n${msg}`,
          image:   currentImage ?? null,
          history,
          selectedButtons: echoMode ? [echoMode] : [],
          userTier: isPaidTier ? "premium" : "free",
          bookTitle,
          summary: currentSummary,
        }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      const reply = data.response || "...";
      if (data.inject && (data.inject_text || data.injected_text)) {
        requestInject(data.inject_text || data.injected_text);
        setEchoMessages(prev => {
          const updated = [...prev, {role:"echo" as const, text:reply}];
          saveEchoConvo(updated);
          return updated;
        });
      } else {
        setEchoMessages(prev => {
          const updated = [...prev, {role:"echo" as const, text:reply}];
          saveEchoConvo(updated);
          return updated;
        });
      }
    } catch {
      setEchoMessages(prev => [...prev, {role:"echo" as const, text:T.serverErr}]);
    } finally {
      setEchoThinking(false);
    }
  };

  const handleManualInject = () => {
    const lastEcho = [...echoMessages].reverse().find(m => m.role==="echo");
    if (!lastEcho) return;
    requestInject(lastEcho.text);
  };

  useEffect(() => { echoBottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [echoMessages, echoThinking]);

  const lancerDictation = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition is not supported."); return; }
    const r = new SR();
    r.lang = fr ? "fr-FR" : "en-US";
    r.onstart = () => setIsListening(true); r.onend = () => setIsListening(false); r.onerror = () => setIsListening(false);
    r.onresult = (e: any) => setEchoInput(p => p + (p ? " " : "") + e.results[0][0].transcript);
    r.start();
  };

  const compressEchoImage = (base64: string): Promise<string> =>
    new Promise(resolve => {
      const img = document.createElement("img");
      img.onload = () => {
        const MAX = 1200; let w = img.width, h = img.height;
        if (w > MAX || h > MAX) { if (w > h) { h = Math.round(h*MAX/w); w = MAX; } else { w = Math.round(w*MAX/h); h = MAX; } }
        const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = base64;
    });

  const handleEchoImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onloadend = async () => { const c = await compressEchoImage(reader.result as string); setImageBase64(c); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const triggerPreset = (p: "print"|"kindle") => {
    applyPreset(p, {setMirrorMargins, setShowPageNumbers, setShowHeader, setLineHeight, setFontSize, setIsJustified});
    setActivePreset(p);
    if (p === "print") editor?.chain().focus().setTextAlign("justify").run();
    else editor?.chain().focus().unsetTextAlign().run();
  };

  const handleGoogleConnect = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/books`, scopes: "openid profile email", queryParams: { prompt: "select_account" } },
    });
  };

  const handleMicrosoftConnect = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: { redirectTo: `${window.location.origin}/books`, scopes: "openid profile email User.Read" },
    });
  };

  const handleStripeCheckout = async () => {
    if (!user) {
      setShowStripeModal(false);
      setShowSignInModal(true);
      return;
    }

    setIsCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "world_advantage",
          currency: currency.toUpperCase(),
          userId: user.id,
          userEmail: user.email,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(fr ? "Erreur de redirection vers la caisse." : "Checkout redirection error.");
      }
    } catch {
      alert(fr ? "Impossible d'initier le paiement." : "Unable to initiate payment.");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const handleEmailSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSignInError(null);
    if (!email.trim() || !password.trim()) {
      setSignInError(fr ? "Veuillez entrer vos identifiants." : "Please enter your credentials.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setSignInError(error.message);
    } else {
      setShowSignInModal(false);
      clearInputs();
    }
  };

  const startResendCountdown = () => {
    setResendCountdown(120);
    const interval = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleEmailSignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSignUpError(null);
    setSignUpSuccess(null);
    if (!email.trim() || !password.trim()) {
      setSignUpError(fr ? "Veuillez entrer un courriel et un mot de passe." : "Please enter an email and password.");
      return;
    }
    const trimmedEmail = email.trim();
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: { emailRedirectTo: `${window.location.origin}/books` },
    });

    if (error) {
      setSignUpError(error.message);
    } else {
      if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
        setSignUpError(fr ? "Un compte avec ce courriel existe déjà." : "An account with this email already exists.");
        return;
      }
      setResendEmail(trimmedEmail);
      setSignUpSuccess(
        fr
          ? "Lien de confirmation envoyé ! Veuillez vérifier votre boîte de réception ainsi que vos indésirables."
          : "Confirmation link sent! Please check your inbox and spam folder."
      );
      startResendCountdown();
    }
  };

  const clearInputs = () => {
    setEmail("");
    setPassword("");
    setSignInError(null);
    setSignUpError(null);
    setSignUpSuccess(null);
  };

  const saveLabel = { saved:{dot:"bg-emerald-400",text:T.saved}, saving:{dot:"bg-amber-400 animate-pulse",text:T.saving}, unsaved:{dot:"bg-zinc-500",text:T.unsaved} }[saveStatus];
  const currentChapter = chapters.find(c => c.id === activeChapter);
  const currentContent = currentChapter?.content || "";
  const pageBgStyle    = { backgroundColor:`rgba(${theme==="dark"?"9,9,11":"255,255,255"},${pageOpacity/100})` };

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
    <main className="h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col overflow-hidden font-sans transition-colors duration-200 selection:bg-cyan-500/30 relative">

      {/* ── HEADER ULTRA-MINCE UNIFIÉ ── */}
      <header className="border-b border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 px-4 py-2 shrink-0 z-40">
        <div className="max-w-full mx-auto flex justify-between items-center relative">
          
          <div className="flex items-center gap-3">
            <Link
              href="/outil"
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-black text-[11px] uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(6,182,212,0.4)] animate-pulse"
            >
              ⚡ {fr ? "RETOUR AUX OUTILS" : "BACK TO TOOLS"}
            </Link>
            <Link href="/outil" className="text-xs font-mono font-black tracking-[0.2em] text-zinc-900 dark:text-white uppercase">
              ECHOSAI
            </Link>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono relative">
            <div className="flex border border-zinc-300 dark:border-zinc-800 rounded-lg overflow-hidden font-mono text-[10px] bg-zinc-100 dark:bg-zinc-900">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2 py-0.5 font-bold transition-colors ${currency === c ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* QUOTA COMPTEUR */}
            <div 
              onClick={() => !isPaidTier && setShowStripeModal(true)} 
              className="cursor-pointer flex items-center gap-2 px-3 py-1 rounded-xl border border-amber-500/40 bg-zinc-900 text-white shadow-lg hover:border-amber-400 transition-all"
            >
              <span className="text-[10px] text-zinc-400 font-bold uppercase">{fr ? "Envois :" : "Sends:"}</span>
              <span className={`font-bold font-mono ${availableQuota === 0 ? "text-red-400" : "text-cyan-400"}`}>
                {isPaidTier ? "∞ ILLIMITÉ" : `${availableQuota}/${MAX_FREE_CREDITS} ${fr ? "disponibles" : "available"}`}
              </span>
              {!isPaidTier && (
                <span className="text-[9px] bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-black px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                  ★ ILLIMITÉ ({PRICES[currency].symbol}{PRICES[currency].amount})
                </span>
              )}
            </div>

            <div className="flex border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden font-mono text-[10px]">
              <button onClick={() => setLang("fr")} className={`px-2 py-0.5 ${lang === "fr" ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-bold" : "bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-zinc-600"}`}>FR</button>
              <button onClick={() => setLang("en")} className={`px-2 py-0.5 ${lang === "en" ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-bold" : "bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-zinc-600"}`}>EN</button>
            </div>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800">
                  🟢 {user.email}
                </span>
                <button onClick={() => supabase.auth.signOut()} className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase">
                  [ {fr ? "Déconnexion" : "Sign Out"} ]
                </button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <button onClick={() => setShowSignInModal(true)} className="px-2.5 py-1 border border-zinc-900 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-lg hover:bg-zinc-900 hover:text-white transition-all font-bold text-[10px]">
                  {fr ? "Connexion" : "Sign In"}
                </button>
                <button onClick={() => setShowSignUpModal(true)} className="px-2.5 py-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-lg hover:bg-zinc-800 transition-all font-bold text-[10px]">
                  {fr ? "S'inscrire" : "Sign Up"}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── ATELIER D'ÉCRITATION & ÉDITEUR ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* TOOLBAR VERTICALE */}
        <div className="w-[130px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col py-2 overflow-y-auto overflow-x-hidden">
          <div className="px-2 pb-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[8px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">{T.struct}</div>
            <div className="grid grid-cols-2 gap-0.5">
              <TB icon={Icons.T1}  label={T.t1}     active={editor?.isActive("heading",{level:1})} onClick={() => editor?.chain().focus().toggleHeading({level:1}).run()}/>
              <TB icon={Icons.T2}  label={T.t2}     active={editor?.isActive("heading",{level:2})} onClick={() => editor?.chain().focus().toggleHeading({level:2}).run()}/>
              <TB icon={Icons.T3}  label={T.t3}     active={editor?.isActive("heading",{level:3})} onClick={() => editor?.chain().focus().toggleHeading({level:3}).run()}/>
              <TB icon={Icons.Abc} label={T.normal} active={editor?.isActive("paragraph")}         onClick={() => editor?.chain().focus().setParagraph().run()}/>
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
            <div className="mt-1.5 flex items-center justify-between px-1">
              <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">p.</span>
              <span className="text-[11px] font-black font-mono text-cyan-400">{currentPage}</span>
              <span className="text-[8px] font-mono text-zinc-600">/ {pageCount}</span>
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
              <TB icon={Icons.insertImg}  label={fr?"Insérer image":"Insert image"} onClick={() => insertImgRef.current?.click()}/>
              <TB icon={Icons.importFont} label={T.importFont} onClick={() => fontInputRef.current?.click()}/>
              <TB icon={Icons.undo} label={`${T.undo} (Ctrl+Z)`} onClick={() => editor?.commands.undo()}/>
              <TB icon={Icons.redo} label={`${T.redo} (Ctrl+Y)`} onClick={() => editor?.commands.redo()}/>
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

        {/* BLOC CENTRAL */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
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
            <div className="relative ml-1 shrink-0">
              <button onClick={toggleTheme} className="text-[10px] px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-cyan-400 transition-all font-mono">
                {theme === "dark" ? "☀ Light" : "☾ Dark"}
              </button>
            </div>
          </div>

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

          <div className="flex-1 overflow-hidden min-h-0 relative"
            style={{backgroundImage:"url('/eauplante2.png')", backgroundSize:"cover", backgroundPosition:"center"}}>
            <div className="absolute inset-0 bg-black/55 pointer-events-none z-0"/>
            <div className="absolute inset-0 overflow-y-auto z-[2] py-8 flex flex-col items-center gap-6"
              style={{scrollbarWidth:"thin", scrollbarColor:"rgba(6,182,212,0.2) transparent"}}
              onScroll={(e) => { const st = e.currentTarget.scrollTop; setCurrentPage(Math.min(pageCount, Math.max(1, Math.floor(Math.max(0, st - 32) / A4_H) + 1))); }}>
              <div ref={containerRef} className={`relative shadow-2xl ${showInvisibleChars?"echo-editor-show-symbols":""}`}
                style={{
                  width:`${A4_W}px`,
                  minHeight:`${pageCount * A4_H}px`,
                  paddingTop:"52px",
                  paddingBottom:"64px",
                  paddingLeft: mirrorMargins ? (currentPage % 2 === 1 ? "90px" : "60px") : "72px",
                  paddingRight: mirrorMargins ? (currentPage % 2 === 1 ? "60px" : "90px") : "72px",
                  ...pageBgStyle,
                  border:"1px solid rgba(255,255,255,0.08)",
                  borderRadius:"2px",
                  boxShadow:"0 4px 40px rgba(0,0,0,0.5)"
                }}>
                <div className="mb-6 pb-5 border-b border-zinc-700/20">
                  {isEditingTitle ? (
                    <input ref={titleInputRef} value={bookTitle} onChange={e => setBookTitle(e.target.value)} onBlur={() => setIsEditingTitle(false)} onKeyDown={e => { if (e.key==="Enter") setIsEditingTitle(false); }} className="w-full text-3xl font-bold bg-transparent border-b-2 border-cyan-500 outline-none text-black dark:text-zinc-100 pb-1" style={{fontFamily}} autoFocus/>
                  ) : (
                    <h1 onDoubleClick={() => { setIsEditingTitle(true); setTimeout(() => titleInputRef.current?.focus(), 50); }} title={T.titleHint} className="text-3xl font-bold text-black dark:text-zinc-100 cursor-text select-none hover:opacity-80 transition-opacity" style={{fontFamily}}>
                      {bookTitle}
                      <span className="ml-3 text-[10px] text-zinc-400 dark:text-zinc-600 font-normal normal-case tracking-normal font-mono align-middle">({T.titleHint})</span>
                    </h1>
                  )}
                </div>
                {isEditingChapterTitle ? (
                  <input ref={chapterTitleInputRef} value={currentChapter?.title || ""} onChange={e => setChapters(prev => prev.map(c => c.id===activeChapter ? {...c, title:e.target.value} : c))} onBlur={() => setIsEditingChapterTitle(false)} onKeyDown={e => { if (e.key==="Enter"||e.key==="Escape") setIsEditingChapterTitle(false); }} className="text-[9px] uppercase tracking-[0.18em] font-mono bg-transparent border-b border-cyan-500/60 outline-none text-cyan-400 mb-3 w-full" autoFocus/>
                ) : (
                  <div onDoubleClick={() => { setIsEditingChapterTitle(true); setTimeout(() => chapterTitleInputRef.current?.focus(), 50); }} title={T.chapterHint} className="group text-[9px] uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500 mb-3 font-mono cursor-text hover:text-cyan-500/70 transition-colors select-none flex items-center gap-2">
                    {currentChapter?.title}
                    <svg className="opacity-0 group-hover:opacity-60 transition-opacity" viewBox="0 0 12 12" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1 10l1.5-3.5L9 1a1.5 1.5 0 0 1 2 2L4 9.5z"/><line x1="7" y1="3" x2="9" y2="5"/></svg>
                  </div>
                )}
                {Array.from({length: Math.max(0, pageCount - 1)}).map((_,i) => (
                  <div key={i} className="absolute left-0 right-0 pointer-events-none select-none" style={{top:`${(i+1)*A4_H}px`, zIndex:10}}>
                    <div style={{borderTop:"2px dashed rgba(6,182,212,0.25)"}}/>
                    <div className="flex items-center justify-between px-4 pt-3 pb-2" style={{...pageBgStyle}}>
                      <span style={{fontSize:"9px",color:"rgba(6,182,212,0.55)",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:"0.12em"}}>Page {i+2}</span>
                      <span style={{fontSize:"8px",color:"rgba(113,113,122,0.5)",fontFamily:"monospace"}}>{bookTitle}</span>
                    </div>
                    <div style={{borderBottom:"1px solid rgba(6,182,212,0.08)"}}/>
                  </div>
                ))}
                {showHeader && (
                  <div className="absolute top-0 left-0 right-0 h-10 border-b border-zinc-700/30 flex items-center px-4">
                    {isEditingHeader ? (
                      <input
                        ref={headerInputRef}
                        value={headerText}
                        onChange={e => setHeaderText(e.target.value)}
                        onBlur={() => setIsEditingHeader(false)}
                        onKeyDown={e => { if (e.key==="Enter"||e.key==="Escape") setIsEditingHeader(false); }}
                        className="w-full text-[9px] font-mono tracking-widest uppercase bg-transparent border-b border-cyan-500/60 outline-none text-cyan-400"
                        autoFocus
                      />
                    ) : (
                      <span
                        onDoubleClick={() => { setIsEditingHeader(true); setTimeout(() => headerInputRef.current?.focus(), 50); }}
                        title={T.titleHint}
                        className="text-[9px] font-mono tracking-widest uppercase text-zinc-400 cursor-text hover:text-cyan-400 transition-colors select-none w-full"
                      >
                        {headerText || bookTitle}
                        <span className="ml-2 text-zinc-600 text-[8px] normal-case tracking-normal">(double-clic)</span>
                      </span>
                    )}
                  </div>
                )}
                <EditorContent editor={editor} className={`outline-none text-black dark:text-zinc-100 caret-cyan-400 books-editor-tiptap ${isJustified?"text-justify":""}`} style={{fontSize:`${fontSize}px`, lineHeight, fontFamily}}/>
                {showPageNumbers && Array.from({length: pageCount}).map((_,i) => (
                  <div key={`pn-${i}`} className="absolute left-0 right-0 text-center text-[10px] text-zinc-400 font-mono pointer-events-none" style={{top:`${(i+1)*A4_H - 30}px`, zIndex:10}}>— {i+1} —</div>
                ))}
              </div>
              <div className="h-32 shrink-0"/>
            </div>
          </div>
        </div>

        {/* DRAGGER DE REDIMENSIONNEMENT AGENT ECHO */}
        {isDesktop && (
          <div onMouseDown={startResizeEcho} className="w-2.5 shrink-0 cursor-col-resize flex items-center justify-center group z-10">
            <div className="w-1 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 group-hover:bg-cyan-500 transition-colors"/>
          </div>
        )}

        {/* PANNEAU AGENT ECHO */}
        <aside style={isDesktop?{width:echoPanelWidth,flexBasis:echoPanelWidth}:undefined}
          className="w-72 shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col overflow-hidden">
          <div className="h-10 shrink-0 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-3 gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0"/>
            <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-zinc-300 flex-1">Echo</span>
            <button onClick={handleRecontext} disabled={echoThinking} title={T.recontextWarning}
              className="px-2 py-1 text-[10px] rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-400 transition-all font-mono shrink-0 flex items-center gap-1 disabled:opacity-30">
              🧠 {fr?"Recadrer":"Context"}
            </button>
            <button onClick={handleManualInject} title={T.inject}
              className="px-2 py-1 text-[10px] rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400 transition-all font-mono shrink-0">
              {fr?"Injecter":"Inject"}
            </button>
          </div>
          <div className="flex gap-1 p-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            {ECHO_MODES.map(m => (
              <button key={m.id} onClick={() => setEchoMode(echoMode===m.id ? null : m.id)}
                className={`flex-1 py-1.5 rounded-lg border transition-all flex items-center justify-center gap-1.5 text-[11px] font-medium ${echoMode===m.id?"bg-cyan-500/10 border-cyan-500/40 text-cyan-400":"border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"}`}>
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
                  <div key={i} className={`text-[13px] leading-relaxed rounded-xl px-3 py-2 ${msg.role==="user"?"self-end bg-cyan-500/10 border border-cyan-500/20 text-zinc-200 rounded-br-sm max-w-[90%]":"self-start bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-sm max-w-[95%]"}`}>
                    {msg.imageB64 && <img src={msg.imageB64} alt="upload" className="max-w-[140px] max-h-[110px] rounded-lg border border-zinc-700 object-cover shadow-md mb-1.5" />}
                    {msg.text}
                  </div>
                ))}
                {echoThinking && <div className="self-start text-[13px] text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl rounded-bl-sm px-3 py-2">...</div>}
              </>
            )}
            <div ref={echoBottomRef}/>
          </div>
          <input ref={imageFileInputRef} type="file" accept="image/*" onChange={handleEchoImageChange} className="hidden"/>
          {imageBase64 && (
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 mx-2 mb-1.5 px-2.5 py-1.5 rounded-xl text-[11px] text-emerald-400 shrink-0">
              <div className="flex items-center gap-2 truncate min-w-0">
                <img src={imageBase64} alt="preview" className="w-8 h-8 rounded object-cover border border-emerald-500/30 shrink-0"/>
                <span className="truncate font-medium">{imageName || (fr?"Image prête":"Image ready")}</span>
              </div>
              <button onClick={() => { setImageBase64(null); setImageName(null); }} className="text-zinc-500 hover:text-red-400 font-bold ml-2 shrink-0">✕</button>
            </div>
          )}
          <div className="flex gap-1.5 px-2 pt-2 shrink-0">
            <button type="button" onClick={() => isImageButtonLocked ? setShowStripeModal(true) : imageFileInputRef.current?.click()}
              className={`flex-1 h-7 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 border transition-all ${isImageButtonLocked?"cursor-not-allowed bg-zinc-900 border-zinc-800 text-zinc-500":imageBase64?"bg-emerald-600/15 border-emerald-500/40 text-emerald-400":"bg-violet-600/10 border-violet-500/30 hover:bg-violet-600/20 text-violet-400"}`}>
              <span>{isImageButtonLocked?"🔒":imageBase64?"✓":"🖼️"}</span>
              <span>{isImageButtonLocked?(fr?"Image":"Image"):imageBase64?(fr?"Prête":"Ready"):(fr?"Image":"Image")}</span>
            </button>
            <button type="button" onClick={lancerDictation}
              className={`flex-1 h-7 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 border transition-all ${isListening?"bg-red-600 border-red-500 text-white animate-pulse":"bg-cyan-600/10 border-cyan-500/30 hover:bg-cyan-600/20 text-cyan-400"}`}>
              <span>{isListening?"🔴":"🎤"}</span>
              <span>{isListening?"Stop":(fr?"Parler":"Speak")}</span>
            </button>
          </div>
          <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-1.5 shrink-0">
            <textarea value={echoInput} onChange={e => setEchoInput(e.target.value)} onKeyDown={e => { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); sendEcho(); } }} rows={3} placeholder={T.echoInput} className="w-full resize-none bg-zinc-900 border border-zinc-800 text-zinc-200 text-[13px] rounded-lg px-2 py-1.5 placeholder-zinc-600 outline-none focus:border-cyan-700/40 leading-relaxed"/>
            <button onClick={sendEcho} disabled={echoThinking} className="w-full bg-cyan-600/15 border border-cyan-500/25 hover:bg-cyan-600/25 disabled:opacity-30 text-cyan-400 rounded-lg text-sm flex items-center justify-center transition-all h-8 font-bold">OK</button>
          </div>
        </aside>
      </div>

      {/* ── MODALS STRIPE & AUTH ── */}
      {showStripeModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[99999] p-6 backdrop-blur-md">
          <div className="bg-zinc-950 border border-amber-500/50 rounded-3xl p-8 max-w-md w-full shadow-2xl text-zinc-100 text-center relative">
            <button type="button" onClick={() => setShowStripeModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white text-sm p-1 cursor-pointer">✕</button>

            <div className="text-4xl mb-3">⚡</div>
            <h2 className="text-lg font-black text-white uppercase font-mono mb-1">
              {fr ? "Quota de 20 Envois Atteint" : "20-Send Limit Reached"}
            </h2>
            <p className="text-xs text-zinc-400 mb-4 font-sans">
              {fr ? "Débloquez l'accès illimité à l'ensemble des modules d'intelligence artificielle." : "Unlock unlimited access to all AI modules."}
            </p>

            <div className="flex justify-center gap-2 mb-4 font-mono text-xs">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-3 py-1 rounded-lg font-bold border transition-all ${
                    currency === c ? "bg-amber-500 text-zinc-950 border-amber-400" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                  }`}
                >
                  {c} ({PRICES[c].symbol})
                </button>
              ))}
            </div>

            <div className="bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/40 rounded-2xl p-5 mb-6 text-left space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-amber-400 font-bold text-xs font-mono uppercase">★ ECHOAI PREMIUM</span>
                <span className="text-white font-black text-sm font-mono">
                  {PRICES[currency].symbol}{PRICES[currency].amount}/{fr ? "mois" : "mo"}
                </span>
              </div>
              <ul className="text-zinc-300 text-xs space-y-2 font-mono">
                <li className="flex items-center gap-2 text-emerald-400">✓ <strong>Accès Illimité</strong> à tous les outils EchoAI</li>
                <li className="flex items-center gap-2 text-emerald-400">✓ Génération haute vitesse prioritaire</li>
                <li className="flex items-center gap-2 text-zinc-400">✓ Sauvegarde permanente de vos livres</li>
              </ul>
            </div>

            <button
              onClick={handleStripeCheckout}
              disabled={isCheckoutLoading}
              className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 shadow-[0_0_25px_rgba(245,158,11,0.3)] cursor-pointer disabled:opacity-50"
            >
              {isCheckoutLoading
                ? (fr ? "CHARGEMENT DE STRIPE..." : "LOADING STRIPE...")
                : (fr ? `Activer EchoAI Premium (${PRICES[currency].symbol}${PRICES[currency].amount}/mois)` : `Activate EchoAI Premium (${PRICES[currency].symbol}${PRICES[currency].amount}/mo)`)}
            </button>
          </div>
        </div>
      )}

      {showSignInModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6 backdrop-blur-md">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-zinc-100">
            <form onSubmit={handleEmailSignIn} className="space-y-5">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-base font-bold">{fr ? "Connexion Requise" : "Authentication Required"}</h2>
                </div>
                <button type="button" onClick={() => { setShowSignInModal(false); clearInputs(); }} className="text-zinc-400 hover:text-white text-sm p-1">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={handleGoogleConnect} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800">
                  <GoogleLogo /><span className="text-white text-[9px] font-bold">GOOGLE</span>
                </button>
                <button type="button" onClick={handleMicrosoftConnect} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800">
                  <MicrosoftLogo /><span className="text-white text-[9px] font-bold">MICROSOFT</span>
                </button>
              </div>

              {signInError && <div className="bg-red-950/50 border border-red-500/50 rounded-xl p-3 text-xs text-red-400">⚠️ {signInError}</div>}

              <div className="space-y-3">
                <input type="email" placeholder="name@domain.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500" />
                <input type="password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500" />
              </div>

              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors">
                {fr ? "Se connecter" : "Log in"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showSignUpModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6 backdrop-blur-md">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-zinc-100">
            <form onSubmit={handleEmailSignUp} className="space-y-5">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-base font-bold">{fr ? "Créer un compte" : "Create account"}</h2>
                </div>
                <button type="button" onClick={() => { setShowSignUpModal(false); clearInputs(); }} className="text-zinc-400 hover:text-white text-sm p-1">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={handleGoogleConnect} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800">
                  <GoogleLogo /><span className="text-white text-[9px] font-bold">GOOGLE</span>
                </button>
                <button type="button" onClick={handleMicrosoftConnect} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800">
                  <MicrosoftLogo /><span className="text-white text-[9px] font-bold">MICROSOFT</span>
                </button>
              </div>

              {signUpError && <div className="bg-red-950/50 border border-red-500/50 rounded-xl p-3 text-xs text-red-400">⚠️ {signUpError}</div>}
              {signUpSuccess && <div className="bg-emerald-950/50 border border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-400">✓ {signUpSuccess}</div>}

              <div className="space-y-3">
                <input type="email" placeholder="name@domain.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500" />
                <input type="password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500" />
              </div>

              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors">
                {fr ? "Créer mon compte" : "Create my account"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALS RECONTEXTE & INJECTION */}
      {showRecontextModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <span className="text-lg">📖</span>
              <h3 className="font-black text-sm font-mono uppercase tracking-widest text-zinc-200">{T.recontextBtn}</h3>
            </div>
            <p className="text-zinc-300 text-sm leading-relaxed">{T.recontextWarning}</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowRecontextModal(false)}
                className="flex-1 py-2 rounded-xl border border-zinc-700 text-zinc-400 font-bold text-sm hover:bg-zinc-800 transition-all">
                {T.recontextCancel}
              </button>
              <button onClick={handleRecontext}
                className="flex-1 py-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 font-bold text-sm hover:bg-cyan-500/20 transition-all">
                {T.recontextConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {showInjectConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <span className="text-lg">📝</span>
              <h3 className="font-black text-sm font-mono uppercase tracking-widest text-zinc-200">{T.injectConfirmTitle}</h3>
            </div>
            <p className="text-zinc-300 text-sm leading-relaxed">{T.injectConfirmBody}</p>
            <p className="text-red-400 text-xs font-semibold border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2 leading-relaxed">
              ⚠️ {T.injectConfirmWarning}
            </p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setShowInjectConfirm(false); setPendingInjectText(null); }}
                className="flex-1 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold text-sm hover:bg-emerald-500/20 transition-all">
                {T.injectCancel}
              </button>
              <button onClick={confirmInject}
                className="flex-1 py-2 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 font-bold text-sm hover:bg-red-500/20 transition-all">
                {T.injectOk}
              </button>
            </div>
          </div>
        </div>
      )}

      {showQuotaPopup && <QuotaPopup label="Books" lang={lang} onClose={() => setShowQuotaPopup(false)} />}

      <input ref={fileInputRef}  type="file" accept=".txt,.md,.markdown"      onChange={handleImportTxt}  className="hidden"/>
      <input ref={fontInputRef}  type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleFontImport} className="hidden"/>
      <input ref={insertImgRef}  type="file" accept="image/*"                 onChange={handleInsertImage} className="hidden"/>

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

export default function BooksPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-cyan-400 font-mono text-xs">Chargement...</div>}>
      <BooksContent />
    </Suspense>
  );
}