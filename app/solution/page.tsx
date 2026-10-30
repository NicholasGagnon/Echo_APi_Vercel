"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import Link from "next/link";

type Stage = "language" | "auth" | "app";
type Lang = "fr" | "en";
type CurrencyCode = "CAD" | "USD" | "EUR";

interface AgentResult {
  title: string;
  source: string;
  text: string;
  loading: boolean;
  done: boolean;
}

interface ChatMessage {
  role: "user" | "arbiter";
  text: string;
  timestamp: string;
}

interface SavedSolution {
  id: string;
  question: string;
  doc_text?: string;
  forum_text?: string;
  final_solution: string;
  created_at: string;
}

const MAX_FREE_CREDITS = 5;
const REGEN_3H_MS = 3 * 60 * 60 * 1000;
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";

const MicrosoftLogo = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23" fill="none">
    <path d="M0 0H11V11H0V0Z" fill="#F25022" />
    <path d="M12 0H23V11H12V0Z" fill="#7FBA00" />
    <path d="M0 12H11V23H0V12Z" fill="#00A4EF" />
    <path d="M12 12H23V23H12V12Z" fill="#FFB900" />
  </svg>
);

const GoogleLogo = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 2.18 2.18 4.94l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </svg>
);

function SolutionContent() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [stage, setStage] = useState<Stage>("app");
  const [lang, setLang] = useState<Lang>("fr");
  const [inputMessage, setInputMessage] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // ── RÉSULTATS DES 3 AGENTS ──
  const [agent1, setAgent1] = useState<AgentResult>({
    title: "1 · Source Officielle", source: "Documentation & Dépôts", text: "", loading: false, done: false,
  });
  const [agent2, setAgent2] = useState<AgentResult>({
    title: "2 · Forum Utilisateur", source: "Communauté & Retours", text: "", loading: false, done: false,
  });
  const [agent3, setAgent3] = useState<AgentResult>({
    title: "3 · Solution Finale", source: "Arbitrage & Synthèse", text: "", loading: false, done: false,
  });

  // ── DISCUSSION INTERACTIVE ──
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // ── SAUVEGARDES ──
  const [savedSolutions, setSavedSolutions] = useState<SavedSolution[]>([]);
  const [showSavedDrawer, setShowSavedDrawer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── QUOTAS ──
  const [availableQuota, setAvailableQuota] = useState<number>(MAX_FREE_CREDITS);
  const [userTier, setUserTier] = useState<"free" | "advantage" | "premium">("free");
  const [showQuotaPopup, setShowQuotaPopup] = useState(false);
  const [nextRegenIn, setNextRegenIn] = useState<number>(0);
  const [anonQuestions, setAnonQuestions] = useState(0);

  // ── AUTH ──
  const [authMode, setAuthMode] = useState<"none" | "signin" | "signup">("none");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authLoading2, setAuthLoading2] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const isPaidTier = userTier === "advantage" || userTier === "premium";
  const hasResolved = agent3.done;

  // Auto-scroll pour la discussion avec l'Arbitre
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

  // Initialisation Auth & Sauvegardes
  useEffect(() => {
    try {
      const anonQ = parseInt(localStorage.getItem("solution_anon_questions") || "0");
      setAnonQuestions(anonQ);
      setAvailableQuota(Math.max(0, MAX_FREE_CREDITS - anonQ));
    } catch { }

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await loadQuotaState(session.user.id);
          await fetchSavedSolutions(session.user.id);
        } else {
          loadLocalSavedSolutions();
        }
      } catch {
        loadLocalSavedSolutions();
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (session?.user) {
        setUser(session.user);
        await loadQuotaState(session.user.id);
        await fetchSavedSolutions(session.user.id);
      } else {
        setUser(null);
        loadLocalSavedSolutions();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── CHARGEMENT & GESTION DES SAUVEGARDES ──
  const fetchSavedSolutions = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("solution_saved")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (!error && data) {
        setSavedSolutions(data);
      }
    } catch {
      loadLocalSavedSolutions();
    }
  };

  const loadLocalSavedSolutions = () => {
    try {
      const local = localStorage.getItem("echosai_saved_solutions");
      if (local) setSavedSolutions(JSON.parse(local));
    } catch { }
  };

  const handleSaveCurrent = async () => {
    if (!agent3.text || isSaving) return;
    setIsSaving(true);

    const newItem: SavedSolution = {
      id: crypto.randomUUID(),
      question: currentQuestion || "Problème sans titre",
      doc_text: agent1.text,
      forum_text: agent2.text,
      final_solution: agent3.text,
      created_at: new Date().toISOString(),
    };

    try {
      if (user) {
        const { error } = await supabase.from("solution_saved").insert({
          user_id: user.id,
          question: newItem.question,
          doc_text: newItem.doc_text,
          forum_text: newItem.forum_text,
          final_solution: newItem.final_solution,
        });
        if (!error) {
          await fetchSavedSolutions(user.id);
        }
      } else {
        const updated = [newItem, ...savedSolutions];
        setSavedSolutions(updated);
        localStorage.setItem("echosai_saved_solutions", JSON.stringify(updated));
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error("Erreur sauvegarde :", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSaved = async (id: string) => {
    try {
      if (user) {
        await supabase.from("solution_saved").delete().eq("id", id);
        setSavedSolutions(prev => prev.filter(s => s.id !== id));
      } else {
        const updated = savedSolutions.filter(s => s.id !== id);
        setSavedSolutions(updated);
        localStorage.setItem("echosai_saved_solutions", JSON.stringify(updated));
      }
    } catch { }
  };

  const handleLoadSavedItem = (item: SavedSolution) => {
    setCurrentQuestion(item.question);
    setAgent1({ title: "1 · Source Officielle", source: "Documentation archivée", text: item.doc_text || "", loading: false, done: true });
    setAgent2({ title: "2 · Forum Utilisateur", source: "Forums archivés", text: item.forum_text || "", loading: false, done: true });
    setAgent3({ title: "3 · Solution Finale", source: "Solution enregistrée", text: item.final_solution, loading: false, done: true });
    setChatMessages([]);
    setShowSavedDrawer(false);
  };

  // ── GESTION QUOTAS ──
  const loadQuotaState = async (uid: string) => {
    try {
      const { data } = await supabase.from("solution_quotas").select("*").eq("user_id", uid).maybeSingle();
      const now = Date.now();
      if (data) {
        const tier = (data.tier || "free") as "free" | "advantage" | "premium";
        setUserTier(tier);
        if (tier === "advantage" || tier === "premium") {
          setAvailableQuota(999);
          return;
        }
        const lastRegen = new Date(data.last_regen || data.created_at).getTime();
        const elapsed = now - lastRegen;
        const recovered = Math.floor(elapsed / REGEN_3H_MS);
        const available = Math.min(MAX_FREE_CREDITS, (data.available ?? MAX_FREE_CREDITS) + recovered);
        setAvailableQuota(available);
        if (available < MAX_FREE_CREDITS) {
          setNextRegenIn(REGEN_3H_MS - (elapsed % REGEN_3H_MS));
        }
      }
    } catch {
      setAvailableQuota(MAX_FREE_CREDITS);
    }
  };

  const consumeQuota = async (): Promise<boolean> => {
    if (userTier === "premium" || userTier === "advantage") return true;
    if (!user) {
      const newAnon = anonQuestions + 1;
      if (anonQuestions >= MAX_FREE_CREDITS) {
        setShowQuotaPopup(true);
        return false;
      }
      setAnonQuestions(newAnon);
      setAvailableQuota(Math.max(0, MAX_FREE_CREDITS - newAnon));
      try { localStorage.setItem("solution_anon_questions", String(newAnon)); } catch { }
      return true;
    }
    try {
      const { data } = await supabase.from("solution_quotas").select("*").eq("user_id", user.id).maybeSingle();
      let avail = data?.available ?? availableQuota;
      if (avail < 1) {
        setShowQuotaPopup(true);
        return false;
      }
      const newVal = avail - 1;
      setAvailableQuota(newVal);
      await supabase.from("solution_quotas").upsert({
        user_id: user.id, available: newVal, tier: userTier, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      return true;
    } catch {
      setAvailableQuota(p => Math.max(0, p - 1));
      return true;
    }
  };

  const callBackend = async (endpoint: string, payload: any) => {
    const urls = [`/api${endpoint}`, `${BACKEND_URL}${endpoint}`, `http://127.0.0.1:5000${endpoint}`];
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) return await res.json();
      } catch { }
    }
    throw new Error("Impossible de joindre le serveur de résolution.");
  };

  // ── RÉSOLUTION MULTI-AGENTS ──
  const handleResolve = async () => {
    if (!inputMessage.trim() || isLoading) return;
    const allowed = await consumeQuota();
    if (!allowed) return;

    const q = inputMessage.trim();
    setCurrentQuestion(q);
    setInputMessage("");
    setIsLoading(true);
    setChatMessages([]);

    setAgent1({ title: "1 · Source Officielle", source: "Recherche constructeur...", text: "", loading: true, done: false });
    setAgent2({ title: "2 · Forum Utilisateur", source: "Recherche communautaire...", text: "", loading: true, done: false });
    setAgent3({ title: "3 · Solution Finale", source: "Arbitrage en cours...", text: "", loading: true, done: false });

    setStatusBanner("Extraction des documentations et manuels récents...");

    try {
      const data = await callBackend("/solution/resolve", { question: q, lang, userId: user?.id });

      setStatusBanner("Traitement des retours et synthèse finale...");
      setAgent1({ title: "1 · Source Officielle", source: "Documentation officielle", text: data.docResponse || "Données indisponibles.", loading: false, done: true });
      setAgent2({ title: "2 · Forum Utilisateur", source: "Reddit & GitHub", text: data.forumResponse || "Aucun retour terrain détecté.", loading: false, done: true });
      setAgent3({ title: "3 · Solution Finale", source: "Plan d'action validé", text: data.finalSolution || "Arbitrage indisponible.", loading: false, done: true });
    } catch (err: any) {
      setAgent1(p => ({ ...p, loading: false, done: true, text: "Erreur lors de l'extraction." }));
      setAgent2(p => ({ ...p, loading: false, done: true, text: "Erreur lors de la fouille." }));
      setAgent3(p => ({ ...p, loading: false, done: true, text: `Échec serveur : ${err?.message || "Vérifiez que le serveur Flask tourne."}` }));
    } finally {
      setStatusBanner(null);
      setIsLoading(false);
    }
  };

  // ── CHAT DE SUIVI ──
  const handleFollowupChat = async () => {
    if (!inputMessage.trim() || isChatLoading) return;
    const userText = inputMessage.trim();
    setInputMessage("");
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newHistory: ChatMessage[] = [...chatMessages, { role: "user", text: userText, timestamp: now }];
    setChatMessages(newHistory);
    setIsChatLoading(true);

    try {
      const conversationPrompt = `
CONTEXTE INITIAL :
Question : "${currentQuestion}"
Sources : ${agent1.text}
Forums : ${agent2.text}
Solution : ${agent3.text}

HISTORIQUE :
${newHistory.map(m => `${m.role === "user" ? "Utilisateur" : "Arbitre"}: ${m.text}`).join("\n")}

NOUVELLE QUESTION : "${userText}"
Consigne : Réponds directement de façon concise et pratique.
      `.trim();

      const res = await callBackend("/chat", {
        message: conversationPrompt,
        history: [],
        userTier: isPaidTier ? "premium" : "free",
        source: "chat",
      });

      setChatMessages(prev => [
        ...prev,
        { role: "arbiter", text: res.response || res.message || "Impossible de répondre.", timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      ]);
    } catch {
      setChatMessages(prev => [...prev, { role: "arbiter", text: "Erreur de connexion.", timestamp: now }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleReset = () => {
    setAgent1({ title: "1 · Source Officielle", source: "Documentation & Dépôts", text: "", loading: false, done: false });
    setAgent2({ title: "2 · Forum Utilisateur", source: "Communauté & Retours", text: "", loading: false, done: false });
    setAgent3({ title: "3 · Solution Finale", source: "Arbitrage & Synthèse", text: "", loading: false, done: false });
    setChatMessages([]);
    setCurrentQuestion("");
    setInputMessage("");
  };

  if (stage === "auth") {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-white font-bold text-lg">Connexion requise</h2>
            <button onClick={() => setStage("app")} className="text-zinc-500 hover:text-white text-sm">✕</button>
          </div>
          <button onClick={() => supabase.auth.signInWithOAuth({ provider: "google" })}
            className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl">
            <GoogleLogo />
            <span className="text-white text-sm font-medium">Continuer avec Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-zinc-200 font-sans select-none flex flex-col overflow-hidden z-20">

      {/* 1. HEADER (HAUTEUR NATURELLE FIXE) */}
      <header className="border-b border-zinc-800/80 bg-zinc-950 px-4 py-2 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/outil"
            className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-[11px] font-bold transition-all border border-zinc-700/60"
          >
            ← OUTILS
          </Link>
          <span className="text-xs font-mono font-bold tracking-wider text-zinc-100 uppercase">
            ECHOSAI · SOLUTION
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-xs font-mono">
          <button
            onClick={() => setShowSavedDrawer(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-700 text-[11px] transition-all cursor-pointer"
          >
            <span>📁</span>
            <span>Archives ({savedSolutions.length})</span>
          </button>

          <div
            onClick={() => !isPaidTier && setShowQuotaPopup(true)}
            className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 text-[11px]"
          >
            <span className="text-zinc-500">Analyses :</span>
            <span className={`font-bold ${availableQuota === 0 ? "text-red-400" : "text-emerald-400"}`}>
              {isPaidTier ? "Illimité" : `${availableQuota}/${MAX_FREE_CREDITS}`}
            </span>
          </div>

          {user ? (
            <button onClick={() => supabase.auth.signOut()} className="text-[10px] text-zinc-500 hover:text-red-400 font-mono">
              Déconnexion
            </button>
          ) : (
            <button onClick={() => setStage("auth")} className="px-2 py-0.5 bg-zinc-100 text-zinc-950 rounded text-[10px] font-bold">
              Connexion
            </button>
          )}
        </div>
      </header>

      {/* 2. ESPACE CENTRAL (CONTRAINT PAR LA GRILLE, 100% VISIBLE) */}
      <main className="solution-main flex-1 min-h-0 w-full max-w-7xl mx-auto p-3 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden select-text">

        {/* COLONNE GAUCHE (5/12) : 2 BLOCS EMPILÉS */}
        <div className="lg:col-span-5 h-full min-h-0 grid grid-rows-2 gap-2.5">

          {/* 1 · SOURCE OFFICIELLE */}
          <div className="min-h-0 rounded-xl border border-zinc-800/90 bg-zinc-950/70 p-3 flex flex-col overflow-hidden shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5 mb-1.5 shrink-0">
              <span className="font-mono text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                1 · Source Officielle
              </span>
              <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[150px]">{agent1.source}</span>
            </div>

            <div
              className="flex-1 min-h-0 overflow-y-auto pr-2 text-xs leading-relaxed text-zinc-300 font-normal"
              style={{ scrollbarColor: "#3f3f46 #09090b", scrollbarWidth: "thin" }}
            >
              {agent1.loading ? (
                <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-xs animate-pulse">
                  Consultation des documentations...
                </div>
              ) : agent1.done ? (
                <p className="whitespace-pre-line">{agent1.text}</p>
              ) : (
                <div className="h-full flex items-center justify-center text-center p-3">
                  <p className="text-zinc-600 font-mono text-[11px]">En attente d'une question pour extraire les normes et procédures constructeur.</p>
                </div>
              )}
            </div>
          </div>

          {/* 2 · FORUM UTILISATEUR */}
          <div className="min-h-0 rounded-xl border border-zinc-800/90 bg-zinc-950/70 p-3 flex flex-col overflow-hidden shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5 mb-1.5 shrink-0">
              <span className="font-mono text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                2 · Forum Utilisateur
              </span>
              <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[150px]">{agent2.source}</span>
            </div>

            <div
              className="flex-1 min-h-0 overflow-y-auto pr-2 text-xs leading-relaxed text-zinc-300 font-normal"
              style={{ scrollbarColor: "#3f3f46 #09090b", scrollbarWidth: "thin" }}
            >
              {agent2.loading ? (
                <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-xs animate-pulse">
                  Fouille des retours d'expérience et discussions...
                </div>
              ) : agent2.done ? (
                <p className="whitespace-pre-line">{agent2.text}</p>
              ) : (
                <div className="h-full flex items-center justify-center text-center p-3">
                  <p className="text-zinc-600 font-mono text-[11px]">En attente d'une question pour dénicher les bogues réels et contournements éprouvés.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* COLONNE DROITE (7/12) : SOLUTION FINALE */}
        <div className="lg:col-span-7 h-full min-h-0 flex flex-col rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 overflow-hidden shadow-lg">

          <div className="flex items-center justify-between border-b border-zinc-800/90 pb-2 mb-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                3 · Solution Finale
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasResolved && (
                <button
                  onClick={handleSaveCurrent}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-[10px] font-mono font-medium text-zinc-200 transition-all cursor-pointer"
                >
                  <span>{saveSuccess ? "✓" : "💾"}</span>
                  <span>{saveSuccess ? "Sauvegardé" : "Sauvegarder"}</span>
                </button>
              )}
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                Synthèse validée
              </span>
            </div>
          </div>

          {/* DÉFILEMENT DE LA SOLUTION */}
          <div
            ref={chatScrollRef}
            className="flex-1 min-h-0 overflow-y-auto pr-2 flex flex-col gap-2.5 text-xs sm:text-[13px] leading-relaxed text-zinc-200"
            style={{ scrollbarColor: "#f59e0b #09090b", scrollbarWidth: "thin" }}
          >
            {agent3.loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-500 font-mono">
                <div className="w-5 h-5 rounded-full border border-amber-400 border-t-transparent animate-spin" />
                <span>Arbitrage et construction du plan d'action...</span>
              </div>
            ) : agent3.done ? (
              <div className="space-y-3">
                <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800/80">
                  <p className="whitespace-pre-line font-normal">{agent3.text}</p>
                </div>

                {chatMessages.length > 0 && (
                  <div className="pt-2 border-t border-zinc-800/60 space-y-2">
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Échanges complémentaires :</span>
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-lg text-xs leading-relaxed max-w-[90%] ${msg.role === "user"
                          ? "ml-auto bg-zinc-800/80 text-zinc-100 border border-zinc-700"
                          : "mr-auto bg-zinc-900/90 text-zinc-300 border border-zinc-800"
                          }`}
                      >
                        <div className="text-[9px] font-mono text-zinc-500 mb-0.5">
                          {msg.role === "user" ? "Vous" : "Solution"} · {msg.timestamp}
                        </div>
                        <p className="whitespace-pre-line">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {isChatLoading && (
                  <div className="p-2 text-[11px] font-mono text-amber-400 animate-pulse">
                    Traitement de votre question de suivi...
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-600 font-mono text-xs">
                <p>La solution finale tranchera entre la documentation et les retours du terrain.</p>
                <p className="text-[11px] text-zinc-700 mt-1">Elle délivrera un diagnostic direct et des étapes concrètes à suivre.</p>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* 3. FOOTER ANCRÉ PAR LA GRILLE (IMPOSSIBLE À SORTIR DE L'ÉCRAN) */}
      <footer className="border-t border-zinc-800 bg-zinc-950 px-4 py-2.5 z-30 shrink-0">
        <div className="max-w-4xl w-full mx-auto flex items-center gap-2.5">

          {hasResolved && (
            <button
              onClick={handleReset}
              title="Nouveau cas"
              className="px-3 py-1.5 rounded-lg font-mono text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 transition-all cursor-pointer shrink-0"
            >
              🔄 Nouveau
            </button>
          )}

          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                hasResolved ? handleFollowupChat() : handleResolve();
              }
            }}
            placeholder={hasResolved ? "Posez une question de suivi sur ce cas..." : "Décrivez le bogue, panne ou problème technique..."}
            rows={1}
            disabled={isLoading || isChatLoading}
            className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-amber-500 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none transition-all shadow-inner"
          />

          <button
            onClick={hasResolved ? handleFollowupChat : handleResolve}
            disabled={!inputMessage.trim() || isLoading || isChatLoading}
            className="px-5 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider text-black bg-amber-400 hover:bg-amber-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
          >
            {isLoading || isChatLoading ? "..." : hasResolved ? "Envoyer" : "Résoudre"}
          </button>
        </div>
      </footer>

      {/* TIROIR LATÉRAL DES ARCHIVES */}
      {showSavedDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-zinc-950 border-l border-zinc-800 h-full p-4 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
                <span className="font-mono text-xs font-bold text-zinc-200 flex items-center gap-2">
                  <span>📁</span>
                  <span>Solutions Enregistrées ({savedSolutions.length})</span>
                </span>
                <button onClick={() => setShowSavedDrawer(false)} className="text-zinc-500 hover:text-white text-sm cursor-pointer">
                  ✕
                </button>
              </div>

              <div
                className="max-h-[calc(100vh-120px)] overflow-y-auto space-y-2 pr-1"
                style={{ scrollbarColor: "#3f3f46 #09090b", scrollbarWidth: "thin" }}
              >
                {savedSolutions.length === 0 ? (
                  <p className="text-zinc-600 font-mono text-xs text-center py-12">Aucune solution archivée pour le moment.</p>
                ) : (
                  savedSolutions.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 transition-all flex flex-col gap-1.5"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-xs font-semibold text-zinc-200 line-clamp-2">{item.question}</p>
                        <button
                          onClick={() => handleDeleteSaved(item.id)}
                          className="text-zinc-600 hover:text-red-400 text-xs shrink-0 cursor-pointer"
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 pt-1">
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        <button
                          onClick={() => handleLoadSavedItem(item)}
                          className="text-amber-400 hover:underline cursor-pointer"
                        >
                          Charger →
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={() => setShowSavedDrawer(false)}
              className="w-full py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-mono text-zinc-400 rounded-md cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* POPUP QUOTA */}
      {showQuotaPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-2xl text-center space-y-3">
            <h3 className="text-zinc-100 font-bold text-sm">Quota gratuit atteint</h3>
            <p className="text-zinc-400 text-xs">
              Prochain crédit disponible dans {nextRegenIn > 0 ? Math.ceil(nextRegenIn / 60000) + " min" : "quelques heures"}.
            </p>
            <button
              onClick={() => setShowQuotaPopup(false)}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg cursor-pointer"
            >
              Compris
            </button>
          </div>
        </div>
      )}

    </div>
  );

}

export default function SolutionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 font-mono text-xs">Chargement...</div>}>
      <SolutionContent />
    </Suspense>
  );
}