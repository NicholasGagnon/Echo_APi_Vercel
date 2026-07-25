"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

// ── TYPES & CONFIGURATION ───────────────────────────────────────────────────
type Lang = "fr" | "en";
type StepNum = 1 | 2 | 3 | 4;

interface StepResult {
  step: StepNum;
  texte: string;
  erreurs: string[];
  timestamp: string;
}

const API_BASE = process.env.NEXT_PUBLIC_CORRECTEUR_API || "http://localhost:5003";

// ── LOGOS VECTORIELS ────────────────────────────────────────────────────────
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

// ── TRADUCTIONS (I18N) ───────────────────────────────────────────────────────
const I18N = {
  fr: {
    title: "ECHO AI",
    subTitle: "PIPELINE D'ÉDITION MULTI-AGENTS",
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
    login: "Se connecter",
    logout: "Déconnexion",
    premiumActive: "✓ Plan Actif",
    premiumGet: "★ Passer Premium",
    historyTitle: "HISTORIQUE DES CORRECTIONS",
    noErrors: "Aucune modification enregistrée sur cette passe.",
    words: "MOTS",
    chars: "CARACTÈRES",
    dropPlaceholder: "Glissez votre fichier ici ou collez votre chapitre brut (~3000 mots)...",
  },
  en: {
    title: "ECHO AI",
    subTitle: "MULTI-AGENT EDITING PIPELINE",
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
    login: "Sign In",
    logout: "Sign Out",
    premiumActive: "✓ Plan Active",
    premiumGet: "★ Get Premium",
    historyTitle: "CORRECTION LOGS",
    noErrors: "No edits recorded on this pass.",
    words: "WORDS",
    chars: "CHARS",
    dropPlaceholder: "Drop your document here or paste raw chapter text (~3000 words max)...",
  },
};

export default function CorrecteurEchoPage() {
  // ── ÉTATS GLOBAUX & AUTH ──────────────────────────────────────────────────
  const [user, setUser] = useState<any>(null);
  const [lang, setLang] = useState<Lang>("fr");
  const [currency, setCurrency] = useState("CAD");
  const [isPremium, setIsPremium] = useState(false);
  
  // Interface & Modales
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showQuotaPopup, setShowQuotaPopup] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  // Authentification Form State
  const [authMode, setAuthMode] = useState<"none" | "signin" | "signup">("none");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // ── ÉTATS DU PIPELINE ─────────────────────────────────────────────────────
  const [originalText, setOriginalText] = useState("");
  const [versions, setVersions] = useState<StepResult[]>([]);
  const [activeStepTab, setActiveStepTab] = useState<StepNum>(1);
  const [runningStep, setRunningStep] = useState<StepNum | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [stopAtStep] = useState<StepNum>(4);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = I18N[lang];

  // ── CHARGEMENT DE LA SESSION SUPABASE ──────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        checkUserSubscription(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        checkUserSubscription(session.user.id);
        setShowAuthModal(false);
      } else {
        setUser(null);
        setIsPremium(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserSubscription = async (uid: string) => {
    try {
      const { data } = await supabase
        .from("world_quotas")
        .select("tier")
        .eq("user_id", uid)
        .maybeSingle();
      if (data?.tier === "premium" || data?.tier === "advantage") {
        setIsPremium(true);
      }
    } catch {}
  };

  // ── GESTION DE L'AUTHENTIFICATION ─────────────────────────────────────────
  const getRedirectUrl = () => typeof window !== "undefined" ? window.location.href : "https://echosai.ca";

  const handleGoogle = async () => {
    setAuthLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getRedirectUrl() },
    });
  };

  const handleMicrosoft = async () => {
    setAuthLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: { redirectTo: getRedirectUrl(), scopes: "openid profile email" },
    });
  };

  const handleEmailSignIn = async () => {
    setAuthError(null);
    if (!authEmail.trim() || !authPassword.trim()) { setAuthError("Champs requis."); return; }
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
    setAuthLoading(false);
    if (error) setAuthError(error.message);
  };

  const handleEmailSignUp = async () => {
    setAuthError(null);
    if (!authEmail.trim() || !authPassword.trim()) { setAuthError("Champs requis."); return; }
    setAuthLoading(true);
    const { error } = await supabase.auth.signUp({
      email: authEmail.trim(),
      password: authPassword,
      options: { emailRedirectTo: getRedirectUrl() },
    });
    setAuthLoading(false);
    if (error) setAuthError(error.message);
    else setAuthSuccess("Lien envoyé par courriel.");
  };

  // ── IMPORTATION DE FICHIER ───────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) setOriginalText(content);
    };
    reader.readAsText(file);
  };

  // ── EXECUTION DU PIPELINE D'ÉDITION ──────────────────────────────────────
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
      timestamp: new Date().toLocaleTimeString("fr-CA"),
    };
  };

  // Lancer EXPLICITEMENT une seule étape
  const runSingleStep = async (step: StepNum) => {
    if (!user) { setShowAuthModal(true); return; }
    setErrorMsg(null);
    if (!originalText.trim()) { setErrorMsg("Veuillez d'abord fournir le texte original."); return; }
    
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

  // Lancer le pipeline complet
  const runAllPipeline = async () => {
    if (!user) { setShowAuthModal(true); return; }
    setErrorMsg(null);
    if (!originalText.trim()) { setErrorMsg("Veuillez d'abord fournir le texte original."); return; }

    setRunningAll(true);
    setVersions([]);
    try {
      const accumulated: StepResult[] = [];
      for (let s = 1; s <= stopAtStep; s++) {
        const stepNum = s as StepNum;
        setRunningStep(stepNum);
        const result = await executeStep(stepNum);
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

  // Copier le texte
  const copyStepText = (text: string, stepIndex: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepIndex);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const activeVersion = versions.find(v => v.step === activeStepTab);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0B0F17] text-slate-100 font-sans overflow-hidden antialiased select-none">
      
      {/* ── HEADER NAVIGATION ────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-slate-800/80 px-6 flex items-center justify-between bg-[#0B0F17]/90 backdrop-blur-md z-20">
        
        {/* Branding Echo AI */}
        <div className="flex items-center gap-3">
          <img src="/echo2.png" alt="Echo AI" className="w-6 h-6 rounded object-contain" />
          <div className="flex flex-col">
            <span className="font-mono font-bold text-xs tracking-widest text-slate-200">{t.title}</span>
            <span className="text-[9px] font-mono text-cyan-400/80 tracking-tight">{t.subTitle}</span>
          </div>
        </div>

        {/* Action Lancer Tout */}
        <div className="flex items-center gap-3">
          <button
            onClick={runAllPipeline}
            disabled={runningAll || runningStep !== null}
            className={`px-4 py-1.5 rounded-md text-xs font-mono font-semibold transition-all duration-200 flex items-center gap-2 ${
              runningAll
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/10"
            }`}
          >
            {runningAll ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                {t.running} ({runningStep}/4)
              </>
            ) : (
              t.executeAll
            )}
          </button>
        </div>

        {/* Contrôles Haut-Droite */}
        <div className="flex items-center gap-3">
          
          {/* Bouton Ouverture Panneau Historique */}
          <button
            onClick={() => setShowHistoryDrawer(true)}
            className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-mono transition-all flex items-center gap-1.5"
          >
            <span>⚡</span>
            <span>Historique ({versions.length})</span>
          </button>

          {/* Statut Connexion */}
          {user ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">
                {user.email.split("@")[0].slice(0, 6)}...@{user.email.split("@")[1]}
              </span>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono transition-all"
            >
              {t.login}
            </button>
          )}

          {/* Bouton Premium */}
          {isPremium ? (
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold tracking-wider">
              {t.premiumActive}
            </span>
          ) : (
            <button
              onClick={() => setShowQuotaPopup(true)}
              className="px-2.5 py-1 rounded-md bg-gradient-to-r from-amber-500/20 to-red-500/20 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold hover:brightness-125 transition-all"
            >
              {t.premiumGet}
            </button>
          )}

          {/* Menu Déroulant ⚙️ */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white text-xs transition-colors"
            >
              ⚙
            </button>

            {showSettings && (
              <div className="absolute right-0 top-10 w-52 bg-[#0D121F] border border-slate-800 rounded-xl shadow-2xl py-2 z-50 text-xs font-mono">
                <div className="px-4 py-2 border-b border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-500">LANGUE</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setLang("fr")}
                      className={`px-1.5 py-0.5 rounded ${lang === "fr" ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-slate-500"}`}
                    >
                      FR
                    </button>
                    <button
                      onClick={() => setLang("en")}
                      className={`px-1.5 py-0.5 rounded ${lang === "en" ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-slate-500"}`}
                    >
                      EN
                    </button>
                  </div>
                </div>

                <div className="px-4 py-2 border-b border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-500">DEVISE</span>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="bg-transparent text-slate-300 outline-none cursor-pointer"
                  >
                    <option value="CAD" className="bg-slate-900">CAD ($)</option>
                    <option value="USD" className="bg-slate-900">USD ($)</option>
                    <option value="EUR" className="bg-slate-900">EUR (€)</option>
                  </select>
                </div>

                {user && (
                  <button
                    onClick={() => { supabase.auth.signOut(); setShowSettings(false); }}
                    className="w-full text-left px-4 py-2 text-red-400 hover:bg-slate-800/50 transition-colors"
                  >
                    ⏏ {t.logout}
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </header>

      {/* ── BARRE DE SÉLECTION DE L'ÉTAPE ─────────────────────────────────────── */}
      <div className="bg-[#0D121F] border-b border-slate-800/60 px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {([1, 2, 3, 4] as StepNum[]).map((sNum) => {
            const hasResult = versions.some(v => v.step === sNum);
            const isTabActive = activeStepTab === sNum;

            return (
              <button
                key={sNum}
                onClick={() => setActiveStepTab(sNum)} // <-- CHANGEMENT : N'EXÉCUTE PLUS, RESTE EN SIMPLE SELECTION
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs transition-all cursor-pointer ${
                  isTabActive
                    ? "bg-slate-800 border-cyan-500/50 text-cyan-300 shadow-sm"
                    : hasResult
                    ? "bg-slate-900/60 border-emerald-500/30 text-emerald-400"
                    : "bg-slate-900/20 border-slate-800/60 text-slate-500 hover:border-slate-700"
                }`}
              >
                <span className="font-mono text-[10px] px-1 rounded bg-slate-800 text-slate-400">
                  {sNum}
                </span>
                <span className="font-medium">{t.stepNames[sNum]}</span>
                {hasResult && <span className="text-[10px] text-emerald-400">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Métriques */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
          <span>{t.words}: <strong className="text-slate-300">{originalText.trim() ? originalText.trim().split(/\s+/).length : 0}</strong></span>
          <span>{t.chars}: <strong className="text-slate-300">{originalText.length}</strong></span>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-950/50 border-b border-red-800 px-6 py-2 text-xs font-mono text-red-400">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* ── ZONE DE TRAVAIL PRINCIPALE (FULL HEIGHT) ─────────────────────────── */}
      <main className="flex-1 grid grid-cols-2 gap-[1px] bg-slate-800/40 overflow-hidden">
        
        {/* COLONNE GAUCHE — TEXTE ORIGINAL */}
        <section className="flex flex-col bg-[#0B0F17] overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-800/60 flex items-center justify-between bg-[#0D121F]/40">
            <span className="text-xs font-mono tracking-wider text-slate-400 uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              {t.originalTitle}
            </span>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1 rounded border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-mono transition-colors"
            >
              {t.importBtn}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.md,.doc,.docx"
              className="hidden"
            />
          </div>

          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            <textarea
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              placeholder={t.dropPlaceholder}
              className="w-full h-full bg-transparent resize-none focus:outline-none font-serif text-slate-300 text-lg leading-relaxed placeholder:text-slate-700 placeholder:font-sans"
            />
          </div>
        </section>

        {/* COLONNE DROITE — RÉSULTAT ET ACTION DE LANCEMENT DÉDIÉE */}
        <section className="flex flex-col bg-[#0E1422] overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-800/60 flex items-center justify-between bg-[#0D121F]/80">
            
            <span className="text-xs font-mono text-cyan-400 uppercase">
              {t.resultTitle} — ÉTAPE {activeStepTab}
            </span>

            {/* BOUTONS D'ACTION SPECIFIQUES */}
            <div className="flex items-center gap-2">
              {/* BOUTON LANCER SEULEMENT CETTE ETAPE */}
              <button
                onClick={() => runSingleStep(activeStepTab)}
                disabled={runningAll || runningStep !== null}
                className="px-3 py-1 rounded border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono transition-all flex items-center gap-1.5"
              >
                {runningStep === activeStepTab ? (
                  <span>⏳ Traitement...</span>
                ) : (
                  <span>{t.executeSingle} {activeStepTab}</span>
                )}
              </button>

              {/* BOUTON COPIER */}
              {activeVersion && (
                <button
                  onClick={() => copyStepText(activeVersion.texte, activeStepTab)}
                  className="px-3 py-1 rounded border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors flex items-center gap-1.5"
                >
                  {copiedStep === activeStepTab ? t.copied : `${t.copyBtn} Étape ${activeStepTab}`}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#0B0F17]/30">
            {activeVersion ? (
              <div className="font-serif text-slate-100 text-lg leading-relaxed whitespace-pre-wrap selection:bg-cyan-500/30">
                {activeVersion.texte}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 font-mono text-xs gap-3">
                <div className="w-8 h-8 rounded-full border border-slate-800 flex items-center justify-center">
                  ✦
                </div>
                <span>CLIQUEZ SUR « {t.executeSingle} {activeStepTab} » POUR CORRIGER CETTE PASSE</span>
              </div>
            )}
          </div>
        </section>

      </main>

      {/* ── PANNEAU LATÉRAL RÉTRACTABLE (DRAWER HISTORIQUE) ────────────────────── */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-[#0D121F] border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            
            {/* Header Drawer */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0B0F17]">
              <span className="font-mono text-xs font-bold text-slate-200 flex items-center gap-2">
                <span>⚡</span> {t.historyTitle}
              </span>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="text-slate-500 hover:text-slate-200 text-xs font-mono"
              >
                ✕ FERMER
              </button>
            </div>

            {/* Contenu Historique */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {versions.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600 font-mono text-xs italic">
                  Aucune passe exécutée pour le moment.
                </div>
              ) : (
                versions.sort((a,b) => a.step - b.step).map((v) => (
                  <div key={v.step} className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                      <span className="font-mono text-xs font-bold text-cyan-400">Étape {v.step} — {t.stepNames[v.step]}</span>
                      <span className="text-slate-500 font-mono text-[10px]">{v.timestamp}</span>
                    </div>

                    {/* Liste des erreurs */}
                    {v.erreurs.length > 0 ? (
                      <ul className="list-disc list-inside text-slate-300 font-mono text-xs space-y-1 py-1">
                        {v.erreurs.map((err, i) => (
                          <li key={i} className="leading-normal">{err}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-500 font-mono text-xs py-1">{t.noErrors}</span>
                    )}

                    <button
                      onClick={() => copyStepText(v.texte, v.step)}
                      className="mt-1 w-full py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono transition-colors"
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

      {/* ── MODALE AUTHENTIFICATION ─────────────────────────────────────────── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-[#0D121F] border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 text-xs font-mono"
            >
              ✕
            </button>

            <div className="flex items-center justify-center gap-2 mb-6">
              <img src="/echo2.png" alt="Echo AI" className="w-5 h-5 rounded object-contain" />
              <span className="text-white font-mono font-bold text-sm tracking-widest">
                ECHO AI <span className="text-slate-500">//</span> AUTH
              </span>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleGoogle}
                disabled={authLoading}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all text-slate-200 text-xs font-medium"
              >
                <GoogleLogo />
                <span>Continuer avec Google</span>
              </button>

              <button
                onClick={handleMicrosoft}
                disabled={authLoading}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all text-slate-200 text-xs font-medium"
              >
                <MicrosoftLogo />
                <span>Continuer avec Microsoft</span>
              </button>
            </div>

            <div className="flex items-center my-4 gap-3">
              <div className="flex-1 h-[1px] bg-slate-800" />
              <span className="text-[10px] font-mono text-slate-600">OU</span>
              <div className="flex-1 h-[1px] bg-slate-800" />
            </div>

            {authMode === "none" ? (
              <div className="flex gap-2">
                <button
                  onClick={() => { setAuthMode("signin"); setAuthError(null); }}
                  className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-mono"
                >
                  ✉ Connexion
                </button>
                <button
                  onClick={() => { setAuthMode("signup"); setAuthError(null); }}
                  className="flex-1 py-2 rounded-xl border border-cyan-500/30 text-cyan-400 text-xs font-mono"
                >
                  Créer un compte
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="Courriel"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 outline-none"
                />
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Mot de passe"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 outline-none"
                />
                {authError && <p className="text-red-400 text-[10px] font-mono">{authError}</p>}
                {authSuccess && <p className="text-emerald-400 text-[10px] font-mono">✓ {authSuccess}</p>}
                <button
                  onClick={authMode === "signin" ? handleEmailSignIn : handleEmailSignUp}
                  disabled={authLoading}
                  className="w-full py-2 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300"
                >
                  {authLoading ? "..." : authMode === "signin" ? "Se connecter" : "Créer le compte"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODALE PREMIUM / STRIPE ─────────────────────────────────────────── */}
      {showQuotaPopup && (
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-[#0D121F] border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
            <button
              onClick={() => setShowQuotaPopup(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 text-xs font-mono"
            >
              ✕
            </button>

            <h3 className="text-white font-bold text-base mb-1">Plan Premium Echo AI</h3>
            <p className="text-slate-400 text-xs mb-6">Correction illimitée et pipeline haute vitesse</p>

            <button
              onClick={async () => {
                if (!user) { setShowAuthModal(true); return; }
                const res = await fetch("/api/stripe/create-checkout-site2", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ plan: "world", currency, userId: user.id, userEmail: user.email }),
                });
                const d = await res.json();
                if (d.url) window.location.href = d.url;
              }}
              className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 shadow-lg shadow-amber-500/10"
            >
              Activer Premium — 9.99$ / mois
            </button>
          </div>
        </div>
      )}

    </div>
  );
}