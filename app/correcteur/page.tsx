"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "../../context/AppContext";
import { supabase } from "../lib/supabase";

export const dynamic = "force-dynamic";

type Lang = "fr" | "en";
type Currency = "CAD" | "USD" | "EUR";
type StepNum = 1 | 2 | 3 | 4;

interface StepResult {
  step: StepNum;
  texte: string;
  erreurs: string[];
  timestamp: string;
}

const MAX_FREE_CREDITS = 8;
const REGEN_1H_MS = 60 * 60 * 1000; // 1 heure

// On utilise TOUJOURS la variable globale de ton .env.local :
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

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

const I18N = {
  fr: {
    title: "STUDIO CORRECTEUR",
    subTitle: "PIPELINE D'ÉDITION MULTI-AGENTS EN 4 PASSES",
    originalTitle: "TEXTE ORIGINAL",
    resultTitle: "RÉSULTAT SÉLECTIONNÉ",
    importBtn: "📁 Importer fichier",
    copyBtn: "📋 Copier",
    copied: "✓ Copié",
    executeAll: "▶ LANCER PIPELINE COMPLET",
    executeSingle: "▶ LANCER ÉTAPE",
    running: "TRAITEMENT EN COURS...",
    stepNames: {
      1: "01. Ortho & Grammaire",
      2: "02. Sémantique & Sens",
      3: "03. Lissage Universel",
      4: "04. Typo / BAT Final",
    },
    historyTitle: "HISTORIQUE DES CORRECTIONS",
    noErrors: "Aucune modification enregistrée sur cette passe.",
    words: "MOTS",
    chars: "CARACTÈRES",
    dropPlaceholder: "Glissez votre fichier ici ou collez votre chapitre brut (~3000 mots)...",
  },
  en: {
    title: "PROOFREADING STUDIO",
    subTitle: "4-STAGE MULTI-AGENT EDITING PIPELINE",
    originalTitle: "ORIGINAL SOURCE",
    resultTitle: "SELECTED REVISION",
    importBtn: "📁 Import File",
    copyBtn: "📋 Copy",
    copied: "✓ Copied",
    executeAll: "▶ RUN FULL PIPELINE",
    executeSingle: "▶ RUN STEP",
    running: "PROCESSING...",
    stepNames: {
      1: "01. Grammar & Ortho",
      2: "02. Semantics & Sense",
      3: "03. Universal Style",
      4: "04. Typo / BAT Final",
    },
    historyTitle: "CORRECTION LOGS",
    noErrors: "No edits recorded on this pass.",
    words: "WORDS",
    chars: "CHARS",
    dropPlaceholder: "Drop your document here or paste raw chapter text (~3000 words max)...",
  },
};

const PRICES: Record<Currency, { amount: string; symbol: string }> = {
  CAD: { amount: "3.99", symbol: "CA$" },
  USD: { amount: "3.99", symbol: "US$" },
  EUR: { amount: "3.99", symbol: "€" },
};

function CorrecteurContent() {
  const { lang, setLang } = useApp();
  const fr = lang === "fr";
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<any>(null);
  const [currentUserTier, setCurrentUserTier] = useState<string>("free");

  // Quotas
  const [availableQuota, setAvailableQuota] = useState<number>(MAX_FREE_CREDITS);
  const [nextRegenIn, setNextRegenIn] = useState<number>(0);

  // Devise & Stripe Premium
  const [currency, setCurrency] = useState<Currency>("CAD");
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // Auth Modals
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Interface & Drawer
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  // Pipeline Core State
  const [originalText, setOriginalText] = useState("");
  const [versions, setVersions] = useState<StepResult[]>([]);
  const [activeStepTab, setActiveStepTab] = useState<StepNum>(1);
  const [runningStep, setRunningStep] = useState<StepNum | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [stopAtStep] = useState<StepNum>(4);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const t = I18N[lang];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        verifierStatutUser(session.user.id);
        chargerQuotaUtilisateur(session.user.id);
      } else {
        verifierQuotaAnonyme();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
        verifierStatutUser(session.user.id);
        chargerQuotaUtilisateur(session.user.id);
      } else {
        setUser(null);
        setCurrentUserTier("free");
        verifierQuotaAnonyme();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (searchParams.get("premium") === "success" && user) {
      const timer = setTimeout(() => {
        verifierStatutUser(user.id);
        chargerQuotaUtilisateur(user.id);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [searchParams, user]);

  const verifierStatutUser = async (uid: string) => {
    try {
      const { data: corData } = await supabase.from("correcteur_quotas").select("tier").eq("user_id", uid).maybeSingle();
      if (corData?.tier && corData.tier !== "free" && corData.tier !== "connected_free") {
        setCurrentUserTier(corData.tier); return;
      }
      setCurrentUserTier("free");
    } catch { setCurrentUserTier("free"); }
  };

  const chargerQuotaUtilisateur = async (uid: string) => {
    try {
      const { data } = await supabase
        .from("correcteur_quotas")
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
        const recovered = Math.floor(elapsed / REGEN_1H_MS);
        const available = Math.min(MAX_FREE_CREDITS, (data.available_credits ?? MAX_FREE_CREDITS) + recovered);

        setAvailableQuota(available);

        if (available < MAX_FREE_CREDITS) {
          setNextRegenIn(REGEN_1H_MS - (elapsed % REGEN_1H_MS));
        }
      } else {
        await supabase.from("correcteur_quotas").insert({
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
      const savedAnon = parseInt(localStorage.getItem("correcteur_anon_used") || "0");
      setAvailableQuota(Math.max(0, MAX_FREE_CREDITS - savedAnon));
    } catch {
      setAvailableQuota(MAX_FREE_CREDITS);
    }
  };

  const consommerUnCredit = async (): Promise<boolean> => {
    if (currentUserTier === "premium" || currentUserTier === "advantage") return true;

    if (!user) {
      const currentUsed = parseInt(localStorage.getItem("correcteur_anon_used") || "0");
      if (currentUsed >= MAX_FREE_CREDITS) {
        setShowSignInModal(true);
        return false;
      }
      localStorage.setItem("correcteur_anon_used", String(currentUsed + 1));
      setAvailableQuota(Math.max(0, MAX_FREE_CREDITS - (currentUsed + 1)));
      return true;
    }

    const now = Date.now();
    const { data } = await supabase
      .from("correcteur_quotas")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    let avail = data?.available_credits ?? MAX_FREE_CREDITS;
    let lastRegen = data ? new Date(data.last_regen_at).getTime() : now;

    if (data && currentUserTier === "free") {
      const elapsed = now - lastRegen;
      const recovered = Math.floor(elapsed / REGEN_1H_MS);
      avail = Math.min(MAX_FREE_CREDITS, avail + recovered);
      if (recovered > 0) lastRegen = now;
    }

    if (avail < 1) {
      const elapsed = now - lastRegen;
      setNextRegenIn(REGEN_1H_MS - (elapsed % REGEN_1H_MS));
      setShowPremiumModal(true);
      return false;
    }

    const newAvail = avail - 1;
    setAvailableQuota(newAvail);

    await supabase.from("correcteur_quotas").upsert({
      user_id: user.id,
      available_credits: newAvail,
      tier: currentUserTier,
      last_regen_at: new Date(lastRegen).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return true;
  };

  const formatRegenTime = (ms: number) => {
    const minutes = Math.ceil(ms / 60000);
    return `${minutes} min`;
  };

  const handleStripeCheckout = async () => {
    if (!user) {
      setShowPremiumModal(false);
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

  const executeStep = async (step: StepNum): Promise<StepResult> => {
    const previous = versions.find(v => v.step === step - 1);
    
    const res = await fetch(`${API_BASE}/api/correcteur/step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        original: originalText,
        family: "deepseek",
        step,
        previous_text: previous?.texte || "",
        previous_errors: previous?.erreurs || [],
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Erreur de traitement.");

    return {
      step,
      texte: data.texte,
      erreurs: data.erreurs || [],
      timestamp: new Date().toLocaleTimeString(fr ? "fr-CA" : "en-US"),
    };
  };

  const runSingleStep = async (step: StepNum) => {
    if (!user) { setShowSignInModal(true); return; }
    setErrorMsg(null);
    if (!originalText.trim()) { setErrorMsg(fr ? "Veuillez d'abord fournir le texte original." : "Please provide the original text first."); return; }
    
    const autorise = await consommerUnCredit();
    if (!autorise) return;

    setRunningStep(step);
    try {
      const result = await executeStep(step);
      setVersions(prev => [...prev.filter(v => v.step !== step), result]);
      setActiveStepTab(step);
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur réseau.");
    } finally {
      setRunningStep(null);
    }
  };

  const runAllPipeline = async () => {
    if (!user) { setShowSignInModal(true); return; }
    setErrorMsg(null);
    if (!originalText.trim()) { 
      setErrorMsg(fr ? "Veuillez d'abord fournir le texte original." : "Please provide the original text first."); 
      return; 
    }

    const autorise = await consommerUnCredit();
    if (!autorise) return;

    setRunningAll(true);
    setVersions([]);

    try {
      const accumulated: StepResult[] = [];
      let lastText = ""; // 👈 On garde le texte en mémoire locale pour la boucle
      let lastErrors: string[] = [];

      for (let s = 1; s <= stopAtStep; s++) {
        const stepNum = s as StepNum;
        setRunningStep(stepNum);

        // Appel direct avec la mémoire locale instantanée
        const res = await fetch(`${API_BASE}/api/correcteur/step`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            original: originalText,
            family: "deepseek",
            step: stepNum,
            previous_text: stepNum === 1 ? "" : lastText, // 👈 Utilise le texte de la passe précédente
            previous_errors: stepNum === 1 ? [] : lastErrors,
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || `Erreur à l'étape ${stepNum}.`);

        const result: StepResult = {
          step: stepNum,
          texte: data.texte,
          erreurs: data.erreurs || [],
          timestamp: new Date().toLocaleTimeString(fr ? "fr-CA" : "en-US"),
        };

        // Mise à jour de la mémoire locale pour le prochain tour de boucle
        lastText = result.texte;
        lastErrors = result.erreurs;

        // Mise à jour de l'affichage UI
        accumulated.push(result);
        setVersions([...accumulated]);
        setActiveStepTab(stepNum);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur pendant le pipeline.");
    } finally {
      setRunningAll(false);
      setRunningStep(null);
    }
  };

  const copyStepText = (text: string, stepIndex: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepIndex);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const handleGoogleConnect = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/correcteur`, scopes: "openid profile email", queryParams: { prompt: "select_account" } },
    });
  };

  const handleMicrosoftConnect = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: { redirectTo: `${window.location.origin}/correcteur`, scopes: "openid profile email User.Read" },
    });
  };

  const handleEmailSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null); setAuthSuccess(null);
    if (!email.trim() || !password.trim()) {
      setAuthError(fr ? "Veuillez entrer vos identifiants." : "Please enter credentials.");
      return;
    }
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) setAuthError(err.message);
    else setShowSignInModal(false);
  };

  const handleEmailSignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null); setAuthSuccess(null);
    if (!email.trim() || !password.trim()) {
      setAuthError(fr ? "Veuillez entrer un courriel et un mot de passe." : "Please enter email and password.");
      return;
    }
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/correcteur` },
    });
    if (err) {
      setAuthError(err.message);
    } else {
      if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
        setAuthError(fr ? "Un compte avec ce courriel existe déjà." : "An account with this email already exists.");
        return;
      }
      setAuthSuccess(fr ? "Lien de confirmation envoyé ! Vérifiez votre boîte mail." : "Confirmation link sent! Check your inbox.");
    }
  };

  const activeVersion = versions.find(v => v.step === activeStepTab);
  const isPaidTier = currentUserTier && currentUserTier !== "free" && currentUserTier !== "connected_free";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-cyan-500/20 antialiased relative overflow-x-hidden flex flex-col">
      
      {/* ── HEADER BLANC UNIFIÉ ── */}
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
                {(["CAD", "USD", "EUR"] as Currency[]).map((c) => (
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
                onClick={() => !isPaidTier && setShowPremiumModal(true)} 
                className="cursor-pointer flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-amber-500/40 bg-zinc-900 text-white shadow-lg hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
              >
                <span className="text-[10px] text-zinc-400 font-bold uppercase">{fr ? "Corrections :" : "Corrections:"}</span>
                <span className={`font-bold font-mono ${availableQuota === 0 ? "text-red-400" : "text-cyan-400"}`}>
                  {isPaidTier ? "∞ ILLIMITÉ" : `${availableQuota}/${MAX_FREE_CREDITS} ${fr ? "disponibles" : "available"}`}
                </span>
                {!isPaidTier && (
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
                    className="text-[11px] text-red-500 hover:text-red-700 transition-colors uppercase font-bold"
                  >
                    [ {fr ? "Déconnexion" : "Sign Out"} ]
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSignInModal(true)}
                    className="px-4 py-2 border border-zinc-900 text-zinc-900 rounded-xl hover:bg-zinc-900 hover:text-white transition-all font-bold tracking-tight shadow-sm"
                  >
                    {fr ? "Connexion" : "Sign In"}
                  </button>
                  <button
                    onClick={() => setShowSignUpModal(true)}
                    className="px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all font-bold tracking-tight shadow-sm"
                  >
                    {fr ? "S'inscrire" : "Sign Up"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* HERO BANNER DE L'OUTIL */}
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 leading-[1.0] mb-3 uppercase">
              {t.title}
            </h1>
            <p className="text-zinc-500 max-w-xl text-xs md:text-sm font-sans leading-relaxed">
              {t.subTitle}
            </p>
          </div>
          <div className="lg:col-span-4 flex justify-center lg:justify-end">
            <img src="/echo1.png" alt="Echo AI Core System" className="w-full max-w-[180px] h-auto object-contain drop-shadow-[0_10px_25px_rgba(6,182,212,0.15)]" />
          </div>
        </div>
      </section>

      {/* ── SEPARATION VAGUE BLANCHE ET STRIC CYAN ── */}
      <div className="relative w-full h-20 bg-zinc-950 overflow-hidden -mt-1 z-20">
        <svg className="absolute top-0 left-0 w-full h-full text-white fill-current" viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path d="M0,0 L1440,0 L1440,30 Q1080,90 720,50 Q360,0 0,60 Z" />
        </svg>

        <svg className="absolute top-0 left-0 w-full h-full text-transparent fill-none pointer-events-none z-22" viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path d="M0,60 Q360,0 720,50 Q1080,90 1440,30" stroke="#06b6d4" strokeWidth="6" className="drop-shadow-[0_0_12px_#06b6d4]" />
        </svg>
      </div>

      {/* ── SECTION BASSE NOIRE : APPLICATION ET WORKSPACE ── */}
      <section className="bg-zinc-950 text-zinc-50 pb-16 pt-0 relative z-10 -mt-6 flex-1 flex flex-col">
        <div className="max-w-7xl mx-auto px-6 w-full space-y-6 flex-1 flex flex-col">

          {/* BARRE D'ACTIONS ET DE CONTRÔLE DE PIPELINE */}
          <div className="bg-black/90 border-2 border-cyan-500/40 rounded-3xl p-4 md:p-6 shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-wrap items-center justify-between gap-4">
            
            <div className="flex items-center gap-3">
              <button
                onClick={runAllPipeline}
                disabled={runningAll || runningStep !== null}
                className={`px-5 py-3 rounded-2xl font-mono text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer ${
                  runningAll
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                    : "bg-cyan-500 hover:bg-cyan-400 text-zinc-950"
                }`}
              >
                {runningAll ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    {t.running} ({runningStep}/4)
                  </span>
                ) : (
                  t.executeAll
                )}
              </button>

              <button
                onClick={() => setShowHistoryDrawer(true)}
                className="px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>⚡</span>
                <span>{fr ? `Historique (${versions.length})` : `Logs (${versions.length})`}</span>
              </button>
            </div>

            {/* MÉTROLOGIE */}
            <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 bg-zinc-900/80 px-4 py-2 rounded-xl border border-zinc-800">
              <span>{t.words}: <strong className="text-cyan-400">{originalText.trim() ? originalText.trim().split(/\s+/).length : 0}</strong></span>
              <span className="text-zinc-700">|</span>
              <span>{t.chars}: <strong className="text-cyan-400">{originalText.length}</strong></span>
            </div>
          </div>

          {/* SÉLECTEUR D'ÉTAPES DU PIPELINE */}
          <div className="flex flex-wrap items-center gap-2 bg-black/80 border border-zinc-800/80 rounded-2xl p-2">
            {([1, 2, 3, 4] as StepNum[]).map((sNum) => {
              const hasResult = versions.some(v => v.step === sNum);
              const isTabActive = activeStepTab === sNum;

              return (
                <button
                  key={sNum}
                  onClick={() => setActiveStepTab(sNum)}
                  className={`flex-1 min-w-[140px] flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                    isTabActive
                      ? "bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                      : hasResult
                      ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {sNum}
                    </span>
                    <span>{t.stepNames[sNum]}</span>
                  </div>
                  {hasResult && <span className="text-emerald-400 text-xs">✓</span>}
                </button>
              );
            })}
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-2xl text-xs font-mono text-red-400">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* WORKSPACE DOUBLE COLONNE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[500px]">
            
            {/* COLONNE GAUCHE — ORIGINE */}
            <div className="bg-black/90 border-2 border-zinc-800 rounded-3xl p-6 flex flex-col space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  {t.originalTitle}
                </span>
              </div>

              <textarea
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                placeholder={t.dropPlaceholder}
                className="w-full flex-1 bg-transparent resize-none outline-none font-serif text-zinc-200 text-base leading-relaxed placeholder:text-zinc-700 placeholder:font-sans custom-scrollbar min-h-[350px]"
              />
            </div>

            {/* COLONNE DROITE — RÉSULTAT ET ACTION */}
            <div className="bg-black/90 border-2 border-cyan-500/40 rounded-3xl p-6 flex flex-col space-y-4 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                  {t.resultTitle} — ÉTAPE {activeStepTab}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runSingleStep(activeStepTab)}
                    disabled={runningAll || runningStep !== null}
                    className="px-3 py-1.5 rounded-xl border border-cyan-500/50 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {runningStep === activeStepTab ? (
                      <span>⏳ Traitement...</span>
                    ) : (
                      <span>{t.executeSingle} {activeStepTab}</span>
                    )}
                  </button>

                  {activeVersion && (
                    <button
                      onClick={() => copyStepText(activeVersion.texte, activeStepTab)}
                      className="px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedStep === activeStepTab ? t.copied : `${t.copyBtn} Étape ${activeStepTab}`}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 bg-zinc-900/40 rounded-2xl p-4 overflow-y-auto custom-scrollbar min-h-[350px]">
                {activeVersion ? (
                  <div className="font-serif text-zinc-100 text-base leading-relaxed whitespace-pre-wrap selection:bg-cyan-500/30">
                    {activeVersion.texte}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 font-mono text-xs gap-3 text-center p-6">
                    <div className="w-10 h-10 rounded-2xl border border-zinc-800 flex items-center justify-center text-cyan-400 font-bold">
                      ✦
                    </div>
                    <span>CLIQUEZ SUR « {t.executeSingle} {activeStepTab} » POUR GÉNÉRER CETTE PASSE DE CORRECTION</span>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── DRAWER HISTORIQUE RÉTRACTABLE ── */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-zinc-950 border-l border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-black">
              <span className="font-mono text-xs font-black text-zinc-200 flex items-center gap-2">
                <span>⚡</span> {t.historyTitle}
              </span>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="text-zinc-500 hover:text-white text-xs font-mono cursor-pointer"
              >
                ✕ FERMER
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              {versions.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-600 font-mono text-xs italic">
                  Aucune passe exécutée pour le moment.
                </div>
              ) : (
                versions.sort((a,b) => a.step - b.step).map((v) => (
                  <div key={v.step} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span className="font-mono text-xs font-bold text-cyan-400">Étape {v.step} — {t.stepNames[v.step]}</span>
                      <span className="text-zinc-500 font-mono text-[10px]">{v.timestamp}</span>
                    </div>

                    {v.erreurs.length > 0 ? (
                      <ul className="list-disc list-inside text-zinc-300 font-mono text-xs space-y-1 py-1">
                        {v.erreurs.map((err, i) => (
                          <li key={i} className="leading-normal">{err}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-zinc-500 font-mono text-xs py-1">{t.noErrors}</span>
                    )}

                    <button
                      onClick={() => copyStepText(v.texte, v.step)}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer"
                    >
                      {copiedStep === v.step ? t.copied : `${t.copyBtn} le résultat de l'Étape ${v.step}`}
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── MODALE ECHOAI PREMIUM ── */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[99999] p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-amber-500/50 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-100 text-center relative">
            <button type="button" onClick={() => setShowPremiumModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white text-sm p-1 cursor-pointer">✕</button>

            <div className="text-4xl mb-3">⚡</div>
            <h2 className="text-lg font-black text-white uppercase font-mono mb-1">
              {fr ? "Quota de 8 Corrections Atteint" : "8-Correction Limit Reached"}
            </h2>
            <p className="text-xs text-zinc-400 mb-4 font-sans">
              {fr
                ? `Prochain crédit dans environ ${formatRegenTime(nextRegenIn)}. Ou débloquez l'accès illimité dès maintenant.`
                : `Next credit in about ${formatRegenTime(nextRegenIn)}. Or unlock unlimited access now.`}
            </p>

            <div className="flex justify-center gap-2 mb-4 font-mono text-xs">
              {(["CAD", "USD", "EUR"] as Currency[]).map((c) => (
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
                <span className="text-amber-400 font-bold text-xs font-mono uppercase">★ ECHOAI PREMIUM</span>
                <span className="text-white font-black text-sm font-mono">
                  {PRICES[currency].symbol}{PRICES[currency].amount}/{fr ? "mois" : "mo"}
                </span>
              </div>
              <ul className="text-zinc-300 text-xs space-y-2 font-mono">
                <li className="flex items-center gap-2 text-emerald-400">✓ <strong>Accès Illimité</strong> à tous les outils EchoAI</li>
                <li className="flex items-center gap-2 text-emerald-400">✓ Génération haute vitesse prioritaire</li>
                <li className="flex items-center gap-2 text-zinc-400">✓ Sauvegarde permanente de vos projets</li>
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

      {/* ── MODALE CONNEXION ── */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-100">
            <form onSubmit={handleEmailSignIn} className="space-y-5">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-base font-bold">{fr ? "Connexion Requise" : "Authentication Required"}</h2>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    {fr ? "Connectez-vous pour corriger vos textes." : "Sign in to correct your texts."}
                  </p>
                </div>
                <button type="button" onClick={() => setShowSignInModal(false)} className="text-zinc-400 hover:text-white text-sm p-1 cursor-pointer">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={handleGoogleConnect} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 cursor-pointer">
                  <GoogleLogo /><span className="text-white text-[9px] font-bold">GOOGLE</span>
                </button>
                <button type="button" onClick={handleMicrosoftConnect} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 cursor-pointer">
                  <MicrosoftLogo /><span className="text-white text-[9px] font-bold">MICROSOFT</span>
                </button>
              </div>

              <div className="h-px bg-zinc-900 my-2" />

              {authError && <div className="bg-red-950/50 border border-red-500/50 rounded-xl p-3 text-xs text-red-400">⚠️ {authError}</div>}

              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="nom@domaine.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer">
                {fr ? "Se connecter" : "Log in"}
              </button>

              <p className="text-center text-zinc-500 text-xs pt-1">
                {fr ? "Pas encore de compte ? " : "Don't have an account? "}
                <button type="button" onClick={() => { setShowSignInModal(false); setShowSignUpModal(true); }} className="text-cyan-400 underline">
                  {fr ? "S'inscrire" : "Sign up"}
                </button>
              </p>
            </form>
          </div>
        </div>
      )}

      {/* ── MODALE INSCRIPTION ── */}
      {showSignUpModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-100">
            <form onSubmit={handleEmailSignUp} className="space-y-5">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-base font-bold">{fr ? "Créer un compte" : "Create account"}</h2>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    {fr ? "Inscrivez-vous pour débloquer les fonctionnalités." : "Sign up to unlock features."}
                  </p>
                </div>
                <button type="button" onClick={() => setShowSignUpModal(false)} className="text-zinc-400 hover:text-white text-sm p-1 cursor-pointer">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={handleGoogleConnect} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 cursor-pointer">
                  <GoogleLogo /><span className="text-white text-[9px] font-bold">GOOGLE</span>
                </button>
                <button type="button" onClick={handleMicrosoftConnect} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 cursor-pointer">
                  <MicrosoftLogo /><span className="text-white text-[9px] font-bold">MICROSOFT</span>
                </button>
              </div>

              <div className="h-px bg-zinc-900 my-2" />

              {authError && <div className="bg-red-950/50 border border-red-500/50 rounded-xl p-3 text-xs text-red-400">⚠️ {authError}</div>}
              {authSuccess && <div className="bg-emerald-950/50 border border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-400">✓ {authSuccess}</div>}

              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="nom@domaine.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer">
                {fr ? "Créer mon compte" : "Create my account"}
              </button>

              <p className="text-center text-zinc-500 text-xs pt-1">
                {fr ? "Déjà un compte ? " : "Already have an account? "}
                <button type="button" onClick={() => { setShowSignUpModal(false); setShowSignInModal(true); }} className="text-cyan-400 underline">
                  {fr ? "Se connecter" : "Sign in"}
                </button>
              </p>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}

export default function CorrecteurEchoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-cyan-400 font-mono text-xs">Initialisation du Studio Correcteur...</div>}>
      <CorrecteurContent />
    </Suspense>
  );
}