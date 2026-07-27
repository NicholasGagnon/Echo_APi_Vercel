"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { marked } from "marked";
import TurndownService from "turndown";
import { useApp } from "../../context/AppContext";
import { supabase } from "../lib/supabase";
import { consumeToolQuota, isPaidTier, UserTier } from "../../utils/quota";

const turndownService = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

function markdownToHtml(md: string): string {
  return marked.parse(md || "", { breaks: true, gfm: true }) as string;
}

function htmlToMarkdown(html: string): string {
  return turndownService.turndown(html || "");
}

function nettoyerMarkdown(brut: string): string {
  if (!brut) return brut;

  let t = brut.replace(/\r\n/g, "\n");

  t = t.replace(/^#{1,6}\s*/gm, "");
  t = t.replace(/^[ \t]*(CHAPITRE\s+\d+[^\n]*)$/gim, "\n\n# $1\n\n");
  t = t.replace(/^([A-ZÀ-Ÿ0-9][A-ZÀ-Ÿ0-9\s\-':,]{3,79})$/gm, (match, p1) => {
    if (/^CHAPITRE\s+\d+/i.test(p1)) return match;
    return `\n\n## ${p1.trim()}\n\n`;
  });

  t = t.replace(/([.!?])\s*(\d+\.\s+|[-•*]\s+)/g, "$1\n\n$2");
  t = t.replace(/[ \t]{2,}/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");

  return t.trim();
}

export const dynamic = "force-dynamic";

interface FormatOption {
  id: string;
  titre: string;
  titreEn: string;
  sousTitre: string;
  sousTitreEn: string;
  pagesEstimees: string;
  motsCible: string;
  nbBlocs: number;
  nbPoints: number;
  icon: string;
}

const FORMATS: FormatOption[] = [
  {
    id: "blog",
    titre: "Article de Blog / Lead Magnet",
    titreEn: "Blog Article / Lead Magnet",
    sousTitre: "Contenu concis, percutant et hautement optimisé.",
    sousTitreEn: "Concise, punchy, and highly optimized content.",
    pagesEstimees: "5 à 20 pages",
    motsCible: "~1 000 à 6 000 mots",
    nbBlocs: 1,
    nbPoints: 200,
    icon: "📝",
  },
  {
    id: "guide_100",
    titre: "Manuel de Formation ou Guide",
    titreEn: "Training Manual or Guide",
    sousTitre: "Ouvrage complet et structuré avec cas pratiques ou petit livre.",
    sousTitreEn: "Comprehensive structured guide with case studies.",
    pagesEstimees: "40 à 100 pages",
    motsCible: "~10 000 à 30 000 mots",
    nbBlocs: 6,
    nbPoints: 800,
    icon: "📚",
  },
  {
    id: "livre_200",
    titre: "Livre Majeur (Grand Format)",
    titreEn: "Major Book (Full Length)",
    sousTitre: "Configuration haute densité pour les ouvrages d'envergure.",
    sousTitreEn: "High-density configuration for large scale manuscripts.",
    pagesEstimees: "150 à 300 pages",
    motsCible: "~40 000 à 75 000 mots",
    nbBlocs: 18,
    nbPoints: 1800,
    icon: "📘",
  },
];

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

const MAX_FREE_CREDITS = 2; // 2 max
const REGEN_3H_MS = 3 * 60 * 60 * 1000; // 3 heures

type CurrencyCode = "CAD" | "USD" | "EUR";
const CURRENCIES: CurrencyCode[] = ["CAD", "USD", "EUR"];

const PRICES: Record<CurrencyCode, { amount: string; symbol: string; cents: number }> = {
  CAD: { amount: "3.99", symbol: "CA$", cents: 399 },
  USD: { amount: "3.99", symbol: "US$", cents: 399 },
  EUR: { amount: "3.99", symbol: "€", cents: 399 },
};

function ContenuContent() {
  const { lang, setLang } = useApp();
  const fr = lang === "fr";

  const [formKey, setFormKey] = useState(0);
  
  // Auth & Storage
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Quotas, Devise & Abonnements
  const [availableQuota, setAvailableQuota] = useState<number>(MAX_FREE_CREDITS);
  const [userTier, setUserTier] = useState<UserTier>("free");
  const [nextRegenIn, setNextRegenIn] = useState<number>(0);
  const [showPremiumModal, setShowPremiumModal] = useState<boolean>(false);
  const [currency, setCurrency] = useState<CurrencyCode>("CAD");
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // Projets
  const [historique, setHistorique] = useState<any[]>([]);
  const [loadingHistorique, setLoadingHistorique] = useState(false);

  // Formulaire & Sélection
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [sujet, setSujet] = useState("");
  const [formatSelectionne, setFormatSelectionne] = useState<FormatOption>(FORMATS[1]);

  // Sorties
  const [promptMaitre, setPromptMaitre] = useState("");
  const [listePoints, setListePoints] = useState("");
  const [texteFinal, setTexteFinal] = useState("");
  const [nbMots, setNbMots] = useState<number | null>(null);

  // Mode d'affichage
  const [modeApercu, setModeApercu] = useState(true);

  // UX Avancement
  const [runningStep, setRunningStep] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  const LOCAL_STORAGE_KEY = "echo-contenu-drafts";

  const skipNextSyncRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "print-book prose prose-zinc max-w-none prose-headings:font-black prose-h1:text-3xl prose-h2:text-2xl prose-p:text-base prose-p:leading-relaxed focus:outline-none min-h-[400px]",
      },
    },
    onUpdate: ({ editor }) => {
      const md = htmlToMarkdown(editor.getHTML());
      skipNextSyncRef.current = true;
      setTexteFinal(md);
      setNbMots(md.split(/\s+/).filter(Boolean).length);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    const currentMd = htmlToMarkdown(editor.getHTML());
    if (currentMd.trim() === (texteFinal || "").trim()) return;
    editor.commands.setContent(markdownToHtml(texteFinal || ""), { emitUpdate: false });
  }, [texteFinal, editor]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        chargerHistorique(session.user.id);
        chargerQuotaUtilisateur(session.user.id);
      } else {
        setUser(null);
        setAvailableQuota(MAX_FREE_CREDITS);
        loadLocalDrafts();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
        setShowAuthModal(false);
        chargerHistorique(session.user.id);
        chargerQuotaUtilisateur(session.user.id);
      } else {
        setUser(null);
        setHistorique([]);
        setAvailableQuota(MAX_FREE_CREDITS);
        loadLocalDrafts();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadLocalDrafts = () => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) setHistorique(JSON.parse(raw));
    } catch {}
  };

  const saveLocalDrafts = (items: any[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch {}
  };

  // Charge le quota en utilisant la table Supabase `contenu_quotas`
  const chargerQuotaUtilisateur = async (uid: string) => {
    try {
      const { data } = await supabase
        .from("contenu_quotas")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();

      const tier = (data?.tier || "free") as UserTier;
      setUserTier(tier);

      if (isPaidTier(tier)) {
        setAvailableQuota(999);
        return;
      }

      const now = Date.now();
      const lastRegen = data ? new Date(data.last_regen_at || data.created_at).getTime() : now;
      const elapsed = now - lastRegen;
      const recovered = Math.floor(elapsed / REGEN_3H_MS);
      const available = Math.min(MAX_FREE_CREDITS, (data?.available_credits ?? MAX_FREE_CREDITS) + recovered);

      setAvailableQuota(available);

      if (available < MAX_FREE_CREDITS) {
        setNextRegenIn(REGEN_3H_MS - (elapsed % REGEN_3H_MS));
      }
    } catch {
      setAvailableQuota(MAX_FREE_CREDITS);
    }
  };

  // Consomme le crédit avec la fonction consumeToolQuota
  const consommerUnCredit = async (): Promise<boolean> => {
    if (!user) {
      setShowAuthModal(true);
      return false;
    }

    const res = await consumeToolQuota(
      user.id,
      userTier,
      "contenu_quotas",
      supabase,
      MAX_FREE_CREDITS,
      REGEN_3H_MS,
      1
    );

    if (!res.allowed) {
      if (res.nextRegenMs > 0) setNextRegenIn(res.nextRegenMs);
      setShowPremiumModal(true);
      return false;
    }

    if (!res.isUnlimited) {
      setAvailableQuota(res.remaining);
    }

    return true;
  };

  const formatRegenTime = (ms: number) => {
    const minutes = Math.ceil(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins} min`;
  };

  const chargerHistorique = async (userId?: string) => {
    const uid = userId || user?.id;
    if (!uid) {
      loadLocalDrafts();
      return;
    }
    setLoadingHistorique(true);
    const { data } = await supabase
      .from("contenu_historique")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (data) setHistorique(data);
    setLoadingHistorique(false);
  };

  const nouveauProjet = () => {
    setCurrentId(null);
    setSujet("");
    setPromptMaitre("");
    setListePoints("");
    setTexteFinal("");
    setNbMots(null);
    setError(null);
    setRunningStep(0);
    setProgressPercent(0);
    setStatusMessage("");
    setFormKey((p) => p + 1);
  };

  const supprimerProjet = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(fr ? "Supprimer cet ouvrage définitivement ?" : "Delete this manuscript permanently?")) return;

    if (user) {
      await supabase.from("contenu_historique").delete().eq("id", id).eq("user_id", user.id);
      chargerHistorique(user.id);
    } else {
      const updated = historique.filter(h => h.id !== id);
      setHistorique(updated);
      saveLocalDrafts(updated);
    }

    if (currentId === id) nouveauProjet();
  };

  const handleGoogleConnect = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/contenu`, scopes: "openid profile email" },
    });
  };

  const handleMicrosoftConnect = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: { redirectTo: `${window.location.origin}/contenu`, scopes: "openid profile email User.Read" },
    });
  };

  const handleStripeCheckout = async () => {
    if (!user) {
      setShowPremiumModal(false);
      setShowAuthModal(true);
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

  const lancerFabrication = async () => {
    setError(null);

    // OBLIGATION STRICTE : L'utilisateur doit être connecté avant même de tenter la consommation
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!sujet.trim()) {
      setError(fr ? "Veuillez saisir votre sujet d'ouvrage." : "Please enter your book topic.");
      return;
    }

    const autorise = await consommerUnCredit();
    if (!autorise) return;

    setPromptMaitre("");
    setListePoints("");
    setTexteFinal("");
    setNbMots(null);

    try {
      setRunningStep(1);
      setProgressPercent(10);
      setStatusMessage(fr ? "Phase 1/3 — Analyse de la vision et rédaction du brief maître..." : "Phase 1/3 — Vision analysis and master brief creation...");
      const res1 = await fetch(`${API_BASE}/api/contenu/prompt-maitre`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sujet, type_contenu: formatSelectionne.id }),
      });
      const data1 = await res1.json();
      if (!res1.ok || data1.error) throw new Error(data1.error || "Erreur lors de la formulation.");

      const pMaitre = data1.prompt_maitre;
      setPromptMaitre(pMaitre);

      setRunningStep(2);
      setProgressPercent(25);
      setStatusMessage(fr ? `Phase 2/3 — Cartographie des ${formatSelectionne.nbPoints} points d'ancrage...` : `Phase 2/3 — Mapping ${formatSelectionne.nbPoints} anchor points...`);
      const res2 = await fetch(`${API_BASE}/api/contenu/decoupage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt_maitre: pMaitre, nb_points: formatSelectionne.nbPoints }),
      });
      const data2 = await res2.json();
      if (!res2.ok || data2.error) throw new Error(data2.error || "Erreur lors du découpage.");

      const lPoints = data2.liste_points;
      setListePoints(lPoints);

      setRunningStep(3);
      const lignes = lPoints.split("\n").filter((l: string) => l.trim() !== "");
      const tailleTranche = Math.max(1, Math.floor(lignes.length / formatSelectionne.nbBlocs));

      const tranches: string[] = [];
      for (let b = 0; b < formatSelectionne.nbBlocs; b++) {
        if (b === formatSelectionne.nbBlocs - 1) {
          tranches.push(lignes.slice(b * tailleTranche).join("\n"));
        } else {
          tranches.push(lignes.slice(b * tailleTranche, (b + 1) * tailleTranche).join("\n"));
        }
      }

      const blocsBruts: string[] = [];
      let cumulMotsActuel = 0;

      for (let i = 0; i < tranches.length; i++) {
        const stepPct = Math.round(25 + ((i + 1) / tranches.length) * 65);
        setProgressPercent(stepPct);
        setStatusMessage(
          fr
            ? `Phase 3/3 — Rédaction du Volume ${i + 1}/${formatSelectionne.nbBlocs} [Cumul : ~${cumulMotsActuel.toLocaleString()} mots]...`
            : `Phase 3/3 — Writing Volume ${i + 1}/${formatSelectionne.nbBlocs} [Total: ~${cumulMotsActuel.toLocaleString()} words]...`
        );
        const resBloc = await fetch(`${API_BASE}/api/contenu/generer-bloc`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt_maitre: pMaitre,
            tranche: tranches[i],
            numero: i + 1,
            total: formatSelectionne.nbBlocs,
            type_contenu: formatSelectionne.id,
          }),
        });
        const dataBloc = await resBloc.json();
        if (!resBloc.ok || dataBloc.error) throw new Error(dataBloc.error || `Erreur sur le volume ${i + 1}`);

        blocsBruts.push(dataBloc.texte_bloc);
        cumulMotsActuel += dataBloc.texte_bloc.split(/\s+/).length;
      }

      setProgressPercent(95);
      let tFinal = "";
      if (blocsBruts.length === 1) {
        tFinal = blocsBruts[0];
      } else {
        const livreAssemble: string[] = [];
        const motsB1 = blocsBruts[0].split(/\s+/);
        livreAssemble.push(motsB1.slice(0, -300).join(" "));

        for (let i = 0; i < blocsBruts.length - 1; i++) {
          setStatusMessage(
            fr
              ? `Phase Finalisation — Soudure de la jonction ${i + 1}/${blocsBruts.length - 1}...`
              : `Finalization — Smoothing transition ${i + 1}/${blocsBruts.length - 1}...`
          );
          const finA = blocsBruts[i].split(/\s+/).slice(-300).join(" ");
          const debutB = blocsBruts[i + 1].split(/\s+/).slice(0, 300).join(" ");

          const resRaccord = await fetch(`${API_BASE}/api/contenu/generer-raccord`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fin_a: finA, debut_b: debutB }),
          });
          const dataRaccord = await resRaccord.json();
          if (!resRaccord.ok || dataRaccord.error) throw new Error(dataRaccord.error);

          livreAssemble.push(dataRaccord.texte_raccord);

          const motsSuiv = blocsBruts[i + 1].split(/\s+/);
          if (i + 1 < blocsBruts.length - 1) {
            livreAssemble.push(motsSuiv.slice(300, -300).join(" "));
          } else {
            livreAssemble.push(motsSuiv.slice(300).join(" "));
          }
        }
        tFinal = livreAssemble.join("\n\n");
      }

      setProgressPercent(100);
      setTexteFinal(tFinal);
      setNbMots(tFinal.split(/\s+/).length);

      const record = {
        titre: sujet.slice(0, 40) || "Sans titre",
        sujet_depart: sujet,
        prompt_maitre: pMaitre,
        liste_500_points: lPoints,
        texte_final: tFinal,
        created_at: new Date().toISOString(),
      };

      if (user) {
        const { data: newRow } = await supabase.from("contenu_historique").insert({
          user_id: user.id,
          ...record,
        }).select("id").single();

        if (newRow?.id) setCurrentId(newRow.id);
        chargerHistorique(user.id);
      }

    } catch (e: any) {
      setError(e.message || "Un obstacle est survenu lors de la confection.");
    } finally {
      setRunningStep(0);
      setStatusMessage("");
    }
  };

  const copierTexte = (texte: string, stepName: string) => {
    navigator.clipboard.writeText(texte);
    setCopiedStep(stepName);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const nettoyerEtFixerTexte = async () => {
    if (!texteFinal || !editor) return;

    const mdActuel = htmlToMarkdown(editor.getHTML()).trim() || texteFinal;
    const textePropre = nettoyerMarkdown(mdActuel);

    skipNextSyncRef.current = false;
    editor.commands.setContent(markdownToHtml(textePropre), { emitUpdate: false });

    setTexteFinal(textePropre);
    setNbMots(textePropre.split(/\s+/).filter(Boolean).length);

    if (currentId && user) {
      await supabase
        .from("contenu_historique")
        .update({ texte_final: textePropre })
        .eq("id", currentId);
      chargerHistorique(user.id);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-cyan-500/20 antialiased relative overflow-x-hidden">
      
      {/* ── HEADER ── */}
      <section className="bg-white text-zinc-900 relative z-30">
        <header className="border-b border-zinc-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center relative">
            
            <div className="flex items-center gap-6">
              <Link href="/outil" className="text-sm font-mono font-black tracking-[0.25em] text-zinc-900 uppercase">
                ECHOSAI
              </Link>
              
              <Link
                href="/outil"
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all hover:scale-105 active:scale-95"
              >
                <span>⚡</span>
                <span>{fr ? "RETOUR AUX OUTILS" : "BACK TO TOOLS"}</span>
              </Link>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-mono relative">
              <div className="flex border border-zinc-300 rounded-lg overflow-hidden font-mono text-[10px] bg-zinc-100">
                {CURRENCIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-2 py-1 font-bold transition-colors ${currency === c ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* INDICE DU QUOTA ET BANNIÈRE ILLIMITÉ */}
              <div 
                onClick={() => !isPaidTier(userTier) && setShowPremiumModal(true)} 
                className="cursor-pointer flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-amber-500/40 bg-zinc-900 text-white shadow-lg hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
              >
                <span className="text-[10px] text-zinc-400 font-bold uppercase">{fr ? "Livres :" : "Books:"}</span>
                <span className={`font-bold font-mono ${availableQuota === 0 ? "text-red-400" : "text-cyan-400"}`}>
                  {isPaidTier(userTier) ? "∞ ILLIMITÉ" : `${availableQuota}/${MAX_FREE_CREDITS} ${fr ? "disponibles" : "available"}`}
                </span>
                {!isPaidTier(userTier) && (
                  <span className="text-[9px] bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm animate-pulse">
                    ★ ILLIMITÉ ({PRICES[currency].symbol}{PRICES[currency].amount})
                  </span>
                )}
              </div>

              <div className="flex border border-zinc-200 rounded-lg overflow-hidden font-mono text-[10px]">
                <button onClick={() => setLang("fr")} className={`px-2 py-1 ${lang === "fr" ? "bg-zinc-900 text-white font-bold" : "bg-zinc-50 text-zinc-400 hover:text-zinc-600"}`}>FR</button>
                <button onClick={() => setLang("en")} className={`px-2 py-1 ${lang === "en" ? "bg-zinc-900 text-white font-bold" : "bg-zinc-50 text-zinc-400 hover:text-zinc-600"}`}>EN</button>
              </div>

              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200 font-mono">
                    🟢 {user.email}
                  </span>
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="text-[11px] text-red-500 hover:text-red-700 transition-colors uppercase font-bold cursor-pointer"
                  >
                    [ {fr ? "Déconnexion" : "Sign Out"} ]
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 border border-zinc-900 text-zinc-900 rounded-xl hover:bg-zinc-900 hover:text-white transition-all font-bold tracking-tight shadow-sm cursor-pointer"
                >
                  {fr ? "Connexion" : "Sign In"}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* HERO BANNER */}
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <div className="inline-block text-[10px] font-mono tracking-widest text-cyan-600 font-bold uppercase mb-2 border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 rounded">
              {fr ? "MODULE 01 // CRÉATION D'OUVRAGE & IMPRESSION" : "MODULE 01 // MANUSCRIPT CREATION & PRINT"}
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 leading-[1.0] mb-3 uppercase">
              {fr ? "Studio Éditorial" : "Editorial Studio"}
            </h1>
            <p className="text-zinc-500 max-w-xl text-xs md:text-sm font-sans leading-relaxed">
              {fr
                ? "Concevez des manuscrits prêts pour l'impression. L'intelligence artificielle gère le plan, le découpage et la rédaction haute densité."
                : "Design print-ready manuscripts. Artificial intelligence handles outlining, mapping, and high-density writing."}
            </p>
          </div>
          <div className="lg:col-span-4 flex justify-center lg:justify-end">
            <img src="/echo1.png" alt="Echo AI System" className="w-full max-w-[180px] h-auto object-contain drop-shadow-[0_10px_25px_rgba(6,182,212,0.15)]" />
          </div>
        </div>
      </section>

      {/* ── SEPARATEUR VISUEL ── */}
      <div className="relative w-full h-20 bg-zinc-950 overflow-hidden -mt-1 z-20">
        <svg className="absolute top-0 left-0 w-full h-full text-white fill-current" viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path d="M0,0 L1440,0 L1440,30 Q1080,90 720,50 Q360,0 0,60 Z" />
        </svg>

        <svg className="absolute top-0 left-0 w-full h-full text-transparent fill-none pointer-events-none z-22" viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path d="M0,60 Q360,0 720,50 Q1080,90 1440,30" stroke="#06b6d4" strokeWidth="6" className="drop-shadow-[0_0_12px_#06b6d4]" />
        </svg>
      </div>

      {/* ── SECTION PRINCIPALE ── */}
      <section className="bg-zinc-950 text-zinc-50 pb-16 pt-0 relative z-10 -mt-6">
        <div className="max-w-7xl mx-auto px-6 space-y-8">

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* BIBLIOTHÈQUE ET OPTIONS DOCUMENT */}
            <aside className="w-full lg:w-80 border-2 border-cyan-500/30 bg-black/90 rounded-2xl p-5 shrink-0 space-y-4 shadow-[0_0_25px_rgba(6,182,212,0.1)]">
              <button
                onClick={nouveauProjet}
                className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
              >
                + {fr ? "NOUVEL OUVRAGE" : "NEW MANUSCRIPT"}
              </button>

              <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold border-b border-zinc-800 pb-2 flex justify-between items-center">
                <span>{fr ? "BIBLIOTHÈQUE DU STUDIO" : "STUDIO LIBRARY"}</span>
                <span className="text-[9px] text-zinc-500">({historique.length})</span>
              </div>

              <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {loadingHistorique ? (
                  <div className="p-3 font-mono text-xs text-zinc-500 animate-pulse">{fr ? "Chargement..." : "Loading..."}</div>
                ) : historique.length === 0 ? (
                  <div className="p-3 font-mono text-xs text-zinc-600 italic">{fr ? "Aucun ouvrage sauvegardé." : "No saved works."}</div>
                ) : (
                  historique.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setCurrentId(item.id);
                        setSujet(item.sujet_depart || "");
                        setPromptMaitre(item.prompt_maitre || "");
                        setListePoints(item.liste_500_points || "");
                        setTexteFinal(item.texte_final || "");
                        setNbMots(item.texte_final ? item.texte_final.split(/\s+/).length : null);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center group ${
                        currentId === item.id
                          ? "bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                          : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                      }`}
                    >
                      <div className="truncate flex-1 pr-2">
                        <span className="block text-xs font-bold truncate">📖 {item.titre || "Ouvrage"}</span>
                        <span className="block text-[9px] font-mono text-zinc-500 mt-0.5">
                          {new Date(item.created_at).toLocaleDateString("fr-CA")}
                        </span>
                      </div>

                      <button
                        onClick={(e) => supprimerProjet(item.id, e)}
                        title={fr ? "Supprimer l'ouvrage" : "Delete manuscript"}
                        className="text-zinc-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-mono cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </aside>

            {/* SELECTION FORMATS */}
            <div className="flex-1 space-y-3 w-full">
              <span className="font-mono text-xs text-cyan-400 font-extrabold tracking-wider uppercase block">
                01. {fr ? "CHOISISSEZ LE FORMAT ET LE VOLUME DU MANUSCRIT" : "CHOOSE MANUSCRIPT FORMAT & VOLUME"}
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {FORMATS.map((f) => {
                  const isSelected = formatSelectionne.id === f.id;
                  return (
                    <div
                      key={f.id}
                      onClick={() => !runningStep && setFormatSelectionne(f)}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "bg-cyan-950/40 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.4)] scale-[1.02]"
                          : "bg-black/80 border-zinc-800 hover:border-zinc-700 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{f.icon}</span>
                        <div>
                          <h3 className="text-sm font-bold text-zinc-100">{fr ? f.titre : f.titreEn}</h3>
                          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{fr ? f.sousTitre : f.sousTitreEn}</p>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-zinc-800/80 flex items-center justify-between font-mono text-xs">
                        <span className="text-amber-400 font-bold">{f.pagesEstimees}</span>
                        <span className="text-cyan-400 font-bold">{f.motsCible}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* FORMULAIRE & ACTIONS */}
          <div key={formKey} className="w-full space-y-8">
            <div className="bg-black/90 border-2 border-cyan-500/40 rounded-3xl p-6 shadow-[0_0_30px_rgba(6,182,212,0.15)] space-y-4 w-full">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-cyan-400 font-extrabold tracking-wider uppercase block">
                  02. {fr ? "VISION & THÉMATIQUE DE L'OUVRAGE" : "MANUSCRIPT VISION & SUBJECT"}
                </span>
                
                <span className="text-xs font-mono text-zinc-400">
                  {fr ? "Crédits disponibles : " : "Available credits: "}
                  <strong className={availableQuota === 0 ? "text-red-400" : "text-cyan-400"}>
                    {isPaidTier(userTier) ? "∞ Illimité" : `${availableQuota}/${MAX_FREE_CREDITS}`}
                  </strong>
                </span>
              </div>

              <textarea
                value={sujet}
                onChange={(e) => setSujet(e.target.value)}
                disabled={runningStep > 0}
                placeholder={
                  fr
                    ? "Ex: Manuel complet sur la création de livre avec l'IA et publication sur Draft2Digital..."
                    : "Ex: Complete guide on AI book creation and publishing on Draft2Digital..."
                }
                rows={3}
                className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-cyan-400 rounded-2xl p-4 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none resize-none transition-colors"
              />

              {runningStep > 0 && (
                <div className="space-y-2 pt-2 border-t border-zinc-800/80 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center text-xs font-mono font-bold text-cyan-400">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      <span>{statusMessage}</span>
                    </span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-cyan-500/30 p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-300 rounded-full transition-all duration-500 shadow-[0_0_15px_#06b6d4]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={lancerFabrication}
                disabled={runningStep > 0 || !sujet.trim()}
                className="w-full py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-black uppercase text-xs tracking-widest transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] cursor-pointer"
              >
                {runningStep > 0
                  ? `▶ ${statusMessage}`
                  : `▶ ${fr ? "LANCER LA FABRICATION" : "START GENERATION"} (${formatSelectionne.pagesEstimees.toUpperCase()} / ${formatSelectionne.motsCible})`}
              </button>
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-500/50 rounded-2xl p-4 font-mono text-xs text-red-400">
                ⚠️ {error}
              </div>
            )}

            {/* BRIEF MAÎTRE */}
            {(promptMaitre || runningStep === 1) && (
              <div className="bg-black/90 border border-zinc-800 rounded-2xl p-6 space-y-3 w-full shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-cyan-400 font-bold flex items-center gap-2">
                    <span>{fr ? "DESIGN — MASTER BOOK BRIEF" : "DESIGN — MASTER BOOK BRIEF"}</span>
                    {runningStep === 1 && <span className="text-[10px] text-cyan-400 animate-pulse">[{fr ? "En cours..." : "In progress..."}]</span>}
                  </span>
                  {promptMaitre && (
                    <button
                      onClick={() => copierTexte(promptMaitre, "step1")}
                      className="text-[10px] px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-cyan-400 text-zinc-300 font-mono cursor-pointer"
                    >
                      {copiedStep === "step1" ? (fr ? "✓ Copié !" : "✓ Copied!") : (fr ? "📋 Copier" : "📋 Copy")}
                    </button>
                  )}
                </div>
                <textarea
                  value={promptMaitre || (fr ? "Formulation du brief en cours..." : "Generating brief...")}
                  readOnly
                  rows={4}
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-300 outline-none resize-y"
                />
              </div>
            )}

            {/* CARTOGRAPHIE */}
            {(listePoints || runningStep === 2) && (
              <div className="bg-black/90 border border-zinc-800 rounded-2xl p-6 space-y-3 w-full shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-amber-400 font-bold flex items-center gap-2">
                    <span>{fr ? `ARCHITECTURE — ${formatSelectionne.nbPoints} ANCHOR POINTS` : `ARCHITECTURE — ${formatSelectionne.nbPoints} ANCHOR POINTS`}</span>
                    {runningStep === 2 && <span className="text-[10px] text-amber-400 animate-pulse">[{fr ? "En cours..." : "In progress..."}]</span>}
                  </span>
                  {listePoints && (
                    <button
                      onClick={() => copierTexte(listePoints, "step2")}
                      className="text-[10px] px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-amber-400 text-zinc-300 font-mono cursor-pointer"
                    >
                      {copiedStep === "step2" ? (fr ? "✓ Copié !" : "✓ Copied!") : (fr ? "📋 Copier" : "📋 Copy")}
                    </button>
                  )}
                </div>
                <textarea
                  value={listePoints || (fr ? "Découpage des points d'ancrage en cours..." : "Mapping anchor points...")}
                  readOnly
                  rows={6}
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-300 outline-none resize-y"
                />
              </div>
            )}

            {/* MANUSCRIT FINAL */}
            {(texteFinal || runningStep === 3) && (
              <div className="bg-black/90 border-2 border-emerald-500/40 rounded-3xl p-8 space-y-5 shadow-[0_0_40px_rgba(16,185,129,0.15)] w-full">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-emerald-400 font-extrabold uppercase">
                      {fr ? "MANUSCRIT FINAL (Rendu d'Édition)" : "FINAL MANUSCRIPT (Print Render)"}
                    </span>
                    {nbMots && (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                        {nbMots.toLocaleString()} {fr ? "mots" : "words"} (~{Math.round(nbMots / 280)} {fr ? "pages" : "pages"})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {texteFinal && (
                      <button
                        onClick={nettoyerEtFixerTexte}
                        className="text-xs px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/20 text-amber-300 font-mono font-bold cursor-pointer transition-all"
                      >
                        🧹 {fr ? "Nettoyer & Réaligner" : "Clean & Realign"}
                      </button>
                    )}

                    <button
                      onClick={() => setModeApercu(!modeApercu)}
                      className="text-xs px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-emerald-400 text-zinc-300 font-mono font-bold cursor-pointer transition-all"
                    >
                      {modeApercu ? (fr ? "📝 Mode Brut" : "📝 Raw Mode") : (fr ? "📖 Mode Livre" : "📖 Book Mode")}
                    </button>

                    {texteFinal && (
                      <button
                        onClick={() => copierTexte(texteFinal, "step3")}
                        className="text-xs px-4 py-2 rounded-xl bg-emerald-950 border border-emerald-500 hover:bg-emerald-900 text-emerald-300 font-mono font-black cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                      >
                        {copiedStep === "step3" ? (fr ? "✓ Copié !" : "✓ Copied!") : (fr ? "📋 Copier Tout" : "📋 Copy All")}
                      </button>
                    )}
                  </div>
                </div>

                {runningStep === 3 ? (
                  <div className="w-full h-80 bg-zinc-900/60 border border-emerald-800/40 rounded-2xl p-6 text-sm text-zinc-400 italic animate-pulse font-mono flex flex-col items-center justify-center gap-3 text-center">
                    <span className="text-emerald-400 font-bold text-base">{statusMessage}</span>
                    <span className="text-xs text-zinc-500 font-mono">{fr ? "Génération longue en cours... veuillez ne pas fermer la page." : "High density writing in progress... please hold."}</span>
                  </div>
                ) : modeApercu ? (
                  <div
                    onClick={() => editor?.chain().focus().run()}
                    className="w-full max-h-[850px] overflow-y-auto bg-white text-zinc-900 border border-zinc-200 rounded-2xl p-10 shadow-inner select-text cursor-text"
                  >
                    <EditorContent editor={editor} />
                  </div>
                ) : (
                  <textarea
                    value={texteFinal}
                    onChange={(e) => {
                      setTexteFinal(e.target.value);
                    }}
                    rows={25}
                    className="w-full bg-zinc-900/90 border border-emerald-800/40 rounded-2xl p-6 text-sm leading-relaxed outline-none resize-y font-mono text-zinc-100"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* MODALE D'ABONNEMENT */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[99999] p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-amber-500/50 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-100 text-center relative">
            <button type="button" onClick={() => setShowPremiumModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white text-sm p-1 cursor-pointer">✕</button>

            <div className="text-4xl mb-3">⚡</div>
            <h2 className="text-lg font-black text-white uppercase font-mono mb-1">
              {fr ? "Quota Gratuit Épuisé" : "Free Quota Reached"}
            </h2>
            <p className="text-xs text-zinc-400 mb-4 font-sans">
              {fr
                ? `Prochain crédit disponible dans environ ${formatRegenTime(nextRegenIn)}. Ou débloquez l'accès illimité.`
                : `Next credit available in about ${formatRegenTime(nextRegenIn)}. Or unlock unlimited access now.`}
            </p>

            <div className="flex justify-center gap-2 mb-4 font-mono text-xs">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-3 py-1 rounded-lg font-bold border transition-all ${
                    currency === c
                      ? "bg-amber-500 text-zinc-950 border-amber-400"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                  }`}
                >
                  {c} ({PRICES[c].symbol})
                </button>
              ))}
            </div>

            <div className="bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/40 rounded-2xl p-5 mb-6 text-left space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-amber-400 font-bold text-xs font-mono uppercase">★ ACCÈS ILLIMITÉ</span>
                <span className="text-white font-black text-sm font-mono">
                  {PRICES[currency].symbol}{PRICES[currency].amount}/{fr ? "mois" : "mo"}
                </span>
              </div>
              <ul className="text-zinc-300 text-xs space-y-2 font-mono">
                <li className="flex items-center gap-2 text-emerald-400">✓ <strong>Accès Illimité</strong> sur les 12 outils</li>
                <li className="flex items-center gap-2 text-emerald-400">✓ Vitesse maximale prioritaires</li>
                <li className="flex items-center gap-2 text-zinc-400">✓ Historique et sauvegardes</li>
              </ul>
            </div>

            <button
              onClick={handleStripeCheckout}
              disabled={isCheckoutLoading}
              className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 transition-all shadow-[0_0_25px_rgba(245,158,11,0.3)] cursor-pointer disabled:opacity-50"
            >
              {isCheckoutLoading
                ? (fr ? "CHARGEMENT DE STRIPE..." : "LOADING STRIPE...")
                : (fr ? `Passer en Illimité (${PRICES[currency].symbol}${PRICES[currency].amount}/mois)` : `Unlock Unlimited (${PRICES[currency].symbol}${PRICES[currency].amount}/mo)`)}
            </button>
          </div>
        </div>
      )}

      {/* MODALE CONNEXION */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-100">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold">{fr ? "Connexion Requise" : "Authentication Required"}</h2>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  {fr ? "Connectez-vous pour utiliser le studio éditorial." : "Sign in to use the editorial studio."}
                </p>
              </div>
              <button type="button" onClick={() => setShowAuthModal(false)} className="text-zinc-400 hover:text-white text-sm p-1 cursor-pointer">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button type="button" onClick={handleGoogleConnect} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 cursor-pointer">
                <GoogleLogo /><span className="text-white text-[9px] font-bold">GOOGLE</span>
              </button>
              <button type="button" onClick={handleMicrosoftConnect} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 cursor-pointer">
                <MicrosoftLogo /><span className="text-white text-[9px] font-bold">MICROSOFT</span>
              </button>
            </div>

            <div className="h-px bg-zinc-900 my-3" />

            <div className="space-y-3">
              <input
                type="email"
                placeholder="name@domain.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500"
              />
              <input
                type="password"
                placeholder="••••••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500"
              />
              {authError && <p className="text-red-400 text-xs font-mono">⚠️ {authError}</p>}

              <button
                onClick={async () => {
                  setAuthError(null);
                  const { error } = await supabase.auth.signInWithPassword({
                    email: authEmail,
                    password: authPassword,
                  });
                  if (error) setAuthError(error.message);
                }}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                {fr ? "Se connecter" : "Log in"}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

export default function ContenuPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-cyan-400 font-mono text-xs">Chargement du Studio Éditorial...</div>}>
      <ContenuContent />
    </Suspense>
  );
}