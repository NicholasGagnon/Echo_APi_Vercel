"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "../../context/AppContext";
import { supabase } from "../lib/supabase";

export const dynamic = "force-dynamic";

type Lang = "fr" | "en";
type Currency = "CAD" | "USD" | "EUR";

const MAX_FREE_CREDITS = 2;
const REGEN_1H_MS = 60 * 60 * 1000; // 1 heure

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

const T = {
  fr: {
    title: "ANALYSE D'IDÉE",
    sub: "Décris ton idée. L'IA te dit la vérité.",
    placeholder: `Ex: Je veux créer une application qui permet aux plombiers indépendants de gérer leurs factures et rendez-vous depuis leur téléphone. Ils perdent beaucoup de temps sur l'administratif et ratent des clients parce qu'ils ne rappellent pas assez vite.`,
    hint: "Plus tu es précis sur le problème, la cible et la solution, meilleure sera l'analyse.",
    analyse: "ANALYSER L'IDÉE",
    analysing: "ANALYSE EN COURS...",
    howBtn: "💡 COMMENT ÇA MARCHE ?",
    howTitle: "Comment ça marche ?",
    howSteps: [
      { icon: "⚡", title: "Gagnez un temps précieux", desc: "Décrivez votre idée en quelques phrases et obtenez une analyse immédiate, sans formulaire interminable ni questionnaire de 30 minutes." },
      { icon: "🧠", title: "Comprenez le verdict instantanément", desc: "Des explications simples, claires et accessibles, sans jargon technique réservé aux experts ou aux investisseurs." },
      { icon: "🚀", title: "Éliminez la friction dès le départ", desc: "Considérez-le comme le premier test de réalité de votre projet : rapide, léger et suffisamment précis pour savoir si ça vaut la peine d'aller plus loin." },
      { icon: "🎯", title: "Votre idée analysée telle qu'elle existe", desc: "L'outil n'essaie pas de transformer une petite idée en startup à un milliard de dollars. Il évalue exactement ce que vous avez écrit." },
      { icon: "✅", title: "Une opinion honnête, rapide et centralisée", desc: "Une seule description, un seul clic, une seule analyse claire pour savoir si vous avez un bon pari ou un chantier colossal." },
    ],
    howClose: "Fermer",
    reconstruction: "Ce que j'ai compris",
    problem: "Problème détecté",
    solution: "Solution proposée",
    target: "Clientèle cible",
    workflow: "Fonctionnement détecté",
    success: "Condition de succès",
    risks: "Zones d'ombre",
    questions: "Les vraies questions",
    q1: "Est-ce que les gens veulent vraiment ça ?",
    q2: "Est-ce que quelqu'un fait déjà ça ?",
    q3: "Coût pour tester",
    q4: "Difficulté à construire",
    q5: "Plus gros risque",
    q6: "Plus gros point fort",
    q7: "Temps avant de savoir si ça marche",
    q8: "Ça vaut la peine d'essayer ?",
    competitorAnalysis: "Concurrent principal identifié",
    alternative: "Alternative détectée",
    targetAlign: "Alignement cible",
    workflowFriction: "Friction workflow",
    expDepth: "Profondeur d'expérience",
    directCompetitor: "Concurrent direct ?",
    yes: "Oui", no: "Non",
    competitorSimilarity: "Dimensions de similarité",
    sameLabels: ["Même problème", "Même solution", "Même workflow", "Même clientèle", "Même modèle", "Même expérience"],
    viability: "Scores de viabilité",
    demandScore: "Demande utilisateur",
    monetization: "Dépendance monétisation",
    buildScore: "Efficacité de construction",
    defensScore: "Défensabilité",
    assumptions: "Hypothèses critiques",
    assumptionsUsed: "Hypothèses utilisées",
    assumptionsRisk: "Si fausses, tout change",
    verdictLabel: "Verdict final",
    monetizationLevels: { "none_or_low":"Aucune ou faible","medium":"Moyenne","high":"Élevée","critical":"Critique" } as Record<string,string>,
  },
  en: {
    title: "IDEA ANALYSIS",
    sub: "Describe your idea. The AI tells you the truth.",
    placeholder: `Ex: I want to create an app that helps independent plumbers manage invoices and appointments from their phone. They lose a lot of time on admin and miss clients because they don't follow up fast enough.`,
    hint: "The more precise you are about the problem, target, and solution, the better the analysis.",
    analyse: "ANALYZE THE IDEA",
    analysing: "ANALYZING...",
    howBtn: "💡 HOW DOES IT WORK?",
    howTitle: "How does it work?",
    howSteps: [
      { icon: "⚡", title: "Save precious time", desc: "Describe your idea in a few sentences and get an immediate analysis, without endless forms or 30-minute questionnaires." },
      { icon: "🧠", title: "Understand the verdict instantly", desc: "Simple, clear and accessible explanations — no technical jargon reserved for experts or investors." },
      { icon: "🚀", title: "Eliminate friction from the start", desc: "Think of it as the first reality check for your project: fast, light, and precise enough to know if it's worth going further." },
      { icon: "🎯", title: "Your idea analyzed as it really is", desc: "The tool doesn't try to turn a small idea into a billion-dollar startup. It evaluates exactly what you wrote." },
      { icon: "✅", title: "Honest, fast and centralized opinion", desc: "One description, one click, one clear analysis to know if you have a good bet or a massive undertaking." },
    ],
    howClose: "Close",
    reconstruction: "What I understood",
    problem: "Detected problem",
    solution: "Proposed solution",
    target: "Target customer",
    workflow: "Detected workflow",
    success: "Success condition",
    risks: "Blind spots",
    questions: "The real questions",
    q1: "Do people really want this?",
    q2: "Does someone already do this?",
    q3: "Cost to test",
    q4: "Difficulty to build",
    q5: "Biggest risk",
    q6: "Biggest strength",
    q7: "Time to know if it works",
    q8: "Worth trying?",
    competitorAnalysis: "Main competitor identified",
    alternative: "Detected alternative",
    targetAlign: "Target alignment",
    workflowFriction: "Workflow friction",
    expDepth: "Experience depth",
    directCompetitor: "Direct competitor?",
    yes: "Yes", no: "No",
    competitorSimilarity: "Similarity dimensions",
    sameLabels: ["Same problem", "Same solution", "Same workflow", "Same customers", "Same model", "Same experience"],
    viability: "Viability scores",
    demandScore: "User demand",
    monetization: "Monetization dependency",
    buildScore: "Build efficiency",
    defensScore: "Defensibility",
    assumptions: "Critical assumptions",
    assumptionsUsed: "Assumptions used",
    assumptionsRisk: "If wrong, everything changes",
    verdictLabel: "Final verdict",
    monetizationLevels: { "none_or_low":"None or low","medium":"Medium","high":"High","critical":"Critical" } as Record<string,string>,
  },
};

const PRICES: Record<Currency, { amount: string; symbol: string }> = {
  CAD: { amount: "3.99", symbol: "CA$" },
  USD: { amount: "3.99", symbol: "US$" },
  EUR: { amount: "3.99", symbol: "€" },
};

const scoreColor = (s: number) =>
  s >= 8 ? "#10b981" : s >= 6 ? "#f59e0b" : s >= 4 ? "#f97316" : "#ef4444";

const ScoreBar = ({ score, color }: { score: number; color: string }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score * 10}%`, backgroundColor: color }} />
    </div>
    <div className="text-xs font-black font-mono" style={{ color }}>
      {score}<span className="text-[9px] opacity-40">/10</span>
    </div>
  </div>
);

function IdeaContent() {
  const { lang, setLang } = useApp();
  const fr = lang === "fr";
  const searchParams = useSearchParams();

  const [user, setUser] = useState<any>(null);
  const [userTier, setUserTier] = useState<string>("free");

  // Quotas & Timer
  const [availableQuota, setAvailableQuota] = useState<number>(MAX_FREE_CREDITS);
  const [nextRegenIn, setNextRegenIn] = useState<number>(0);

  // Currency & Stripe Premium
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

  // Idea Core
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHow, setShowHow] = useState(false);

  const t = T[lang];
  const api = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        verifierStatutUser(session.user.id);
        chargerQuotaUtilisateur(session.user.id);
        restoreAnalysis(session.user.id);
      } else {
        verifierQuotaAnonyme();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
        verifierStatutUser(session.user.id);
        chargerQuotaUtilisateur(session.user.id);
        restoreAnalysis(session.user.id);
      } else {
        setUser(null);
        setUserTier("free");
        verifierQuotaAnonyme();
      }
    });

    const draft = localStorage.getItem("idea_draft");
    if (draft) { setIdea(draft); localStorage.removeItem("idea_draft"); }

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
      const { data: iData } = await supabase.from("idea_quotas").select("tier").eq("user_id", uid).maybeSingle();
      if (iData?.tier && iData.tier !== "free" && iData.tier !== "connected_free") {
        setUserTier(iData.tier); return;
      }
      setUserTier("free");
    } catch { setUserTier("free"); }
  };

  const chargerQuotaUtilisateur = async (uid: string) => {
    try {
      const { data } = await supabase
        .from("idea_quotas")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();

      const now = Date.now();
      if (data) {
        const tier = (data.tier || "free");
        setUserTier(tier);

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
        await supabase.from("idea_quotas").insert({
          user_id: uid,
          available_credits: MAX_FREE_CREDITS,
          tier: "free",
          last_regen_at: new Date().toISOString(),
        });
        setAvailableQuota(MAX_FREE_CREDITS);
        setUserTier("free");
      }
    } catch {
      setAvailableQuota(MAX_FREE_CREDITS);
    }
  };

  const verifierQuotaAnonyme = () => {
    try {
      const savedAnon = parseInt(localStorage.getItem("idea_anon_used") || "0");
      setAvailableQuota(Math.max(0, MAX_FREE_CREDITS - savedAnon));
    } catch {
      setAvailableQuota(MAX_FREE_CREDITS);
    }
  };

  const consommerUnCredit = async (): Promise<boolean> => {
    if (userTier === "premium" || userTier === "advantage") return true;

    if (!user) {
      const currentUsed = parseInt(localStorage.getItem("idea_anon_used") || "0");
      if (currentUsed >= MAX_FREE_CREDITS) {
        setShowSignInModal(true);
        return false;
      }
      localStorage.setItem("idea_anon_used", String(currentUsed + 1));
      setAvailableQuota(Math.max(0, MAX_FREE_CREDITS - (currentUsed + 1)));
      return true;
    }

    const now = Date.now();
    const { data } = await supabase
      .from("idea_quotas")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    let avail = data?.available_credits ?? MAX_FREE_CREDITS;
    let lastRegen = data ? new Date(data.last_regen_at).getTime() : now;

    if (data && userTier === "free") {
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

    await supabase.from("idea_quotas").upsert({
      user_id: user.id,
      available_credits: newAvail,
      tier: userTier,
      last_regen_at: new Date(lastRegen).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return true;
  };

  const formatRegenTime = (ms: number) => {
    const minutes = Math.ceil(ms / 60000);
    return `${minutes} min`;
  };

  const restoreAnalysis = async (userId: string) => {
    try {
      const { data, error: fetchErr } = await supabase
        .from("idea_analyses")
        .select("data")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!fetchErr && data?.data?.result) setResult(data.data.result);
      if (!fetchErr && data?.data?.idea && !idea) setIdea(data.data.idea);
    } catch {}
  };

  const saveAnalysis = async (userId: string, ideaText: string, analysisResult: any) => {
    try {
      await supabase.from("idea_analyses").insert({
        user_id: userId,
        data: { idea: ideaText, result: analysisResult },
        updated_at: new Date().toISOString(),
      });
    } catch {}
  };

  const handleStripeCheckout = async () => {
    if (!user) {
      setShowPremiumModal(false);
      setShowSignInModal(true);
      return;
    }

    setIsCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-site2", {
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

  const handleAnalyse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      setShowSignInModal(true);
      return;
    }
    if (!idea.trim() || idea.trim().length < 10) return;

    const autorise = await consommerUnCredit();
    if (!autorise) return;

    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${api}/2/analyse-idee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: idea.trim(), lang }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      if (user) saveAnalysis(user.id, idea.trim(), data);
    } catch (err: any) {
      setError(err.message || "Erreur inattendue.");
    } finally { setLoading(false); }
  };

  const handleGoogleConnect = async () => {
    if (idea.trim()) localStorage.setItem("idea_draft", idea);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/idea`, scopes: "openid profile email", queryParams: { prompt: "select_account" } },
    });
  };

  const handleMicrosoftConnect = async () => {
    if (idea.trim()) localStorage.setItem("idea_draft", idea);
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: { redirectTo: `${window.location.origin}/idea`, scopes: "openid profile email User.Read" },
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
      options: { emailRedirectTo: `${window.location.origin}/idea` },
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

  const sameKeys = ["same_problem","same_solution","same_workflow","same_target_customer","same_business_model","same_user_experience"];
  const isPaidTier = userTier && userTier !== "free" && userTier !== "connected_free";

  const Section = ({ title, color = "#06b6d4", children }: { title: string; color?: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <div className="text-[10px] font-mono font-black tracking-widest uppercase" style={{ color }}>
        {title}
      </div>
      {children}
    </div>
  );

  const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 md:p-5 ${className}`}>
      {children}
    </div>
  );

  const Row = ({ label, value }: { label: string; value?: string }) => value ? (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-1.5 border-b border-zinc-800/40 last:border-none">
      <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase shrink-0 sm:w-36">{label}</span>
      <span className="text-xs text-zinc-200 leading-relaxed flex-1">{value}</span>
    </div>
  ) : null;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-cyan-500/20 antialiased relative overflow-x-hidden">
      
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
                <span className="text-[10px] text-zinc-400 font-bold uppercase">{fr ? "Analyses :" : "Analyses:"}</span>
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
            <div className="inline-block text-[10px] font-mono tracking-widest text-cyan-600 font-bold uppercase mb-2 border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 rounded">
              {fr ? "MODULE 11 // ÉVALUATION DE POTENTIEL" : "MODULE 11 // POTENTIAL EVALUATION"}
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 leading-[1.0] mb-3 uppercase">
              {t.title}
            </h1>
            <p className="text-zinc-500 max-w-xl text-xs md:text-sm font-sans leading-relaxed">
              {t.sub}
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

      {/* ── SECTION BASSE NOIRE ── */}
      <section className="bg-zinc-950 text-zinc-50 pb-16 pt-0 relative z-10 -mt-6">
        <div className="max-w-4xl mx-auto px-6 space-y-8">

          {/* FORMULAIRE IDEA */}
          <form onSubmit={e => e.preventDefault()} className="bg-black/90 border-2 border-cyan-500/40 rounded-3xl p-6 md:p-8 shadow-[0_0_30px_rgba(6,182,212,0.15)] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-xs text-cyan-400 font-extrabold tracking-wider uppercase">
                01. {fr ? "VOTRE CONCEPT & VISION" : "YOUR CONCEPT & VISION"}
              </span>
              <button
                type="button"
                onClick={() => setShowHow(true)}
                className="text-[11px] font-mono font-bold text-cyan-400 hover:text-cyan-300 underline"
              >
                {t.howBtn}
              </button>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 text-xs text-zinc-400 font-mono leading-relaxed">
              💡 {t.hint}
            </div>

            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              required
              rows={8}
              placeholder={t.placeholder}
              className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-cyan-400 rounded-2xl p-4 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 outline-none resize-y transition-colors leading-relaxed"
            />

            {error && (
              <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-xs text-red-400 font-mono">
                ⚠️ {error}
              </div>
            )}

            {!user ? (
              <button
                type="button"
                onClick={() => setShowSignInModal(true)}
                className="w-full py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono font-black uppercase text-xs tracking-widest transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] cursor-pointer"
              >
                🔐 {fr ? "Se connecter pour analyser" : "Sign in to analyze"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAnalyse}
                disabled={loading || idea.trim().length < 10}
                className="w-full py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-zinc-950 font-mono font-black uppercase text-xs tracking-widest transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] cursor-pointer"
              >
                {loading ? `▶ ${t.analysing}` : `▶ ${t.analyse}`}
              </button>
            )}
          </form>

          {/* RÉSULTATS DE L'ANALYSE */}
          {result && (
            <div className="bg-black/90 border-2 border-cyan-500/40 rounded-3xl p-6 md:p-8 space-y-8 shadow-[0_0_40px_rgba(6,182,212,0.15)] animate-in fade-in duration-300">
              
              {/* Verdict Final */}
              {result.verdict && (
                <div className="bg-zinc-900/90 border-l-4 border-cyan-400 border-zinc-800 rounded-2xl p-5 md:p-6 space-y-2">
                  <div className="text-[10px] font-mono font-black text-cyan-400 uppercase tracking-widest">
                    02. {t.verdictLabel}
                  </div>
                  <div className="text-sm md:text-base font-bold text-zinc-100 leading-relaxed">
                    {result.verdict}
                  </div>
                </div>
              )}

              {/* Scores de Viabilité */}
              {result.mvp_viability_scores && (
                <Section title={t.viability} color="#a78bfa">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card>
                      <div className="text-[11px] font-mono font-bold text-violet-400 mb-2">{t.demandScore}</div>
                      <ScoreBar score={result.mvp_viability_scores.user_demand_score} color={scoreColor(result.mvp_viability_scores.user_demand_score)} />
                      <div className="text-xs text-zinc-400 mt-3 leading-relaxed">{result.mvp_viability_scores.user_demand_rationale}</div>
                    </Card>
                    <Card>
                      <div className="text-[11px] font-mono font-bold text-violet-400 mb-2">{t.buildScore}</div>
                      <ScoreBar score={result.mvp_viability_scores.build_efficiency_score} color={scoreColor(result.mvp_viability_scores.build_efficiency_score)} />
                      <div className="text-xs text-zinc-400 mt-3 leading-relaxed">{result.mvp_viability_scores.build_efficiency_rationale}</div>
                    </Card>
                    <Card>
                      <div className="text-[11px] font-mono font-bold text-violet-400 mb-2">{t.defensScore}</div>
                      <ScoreBar score={result.mvp_viability_scores.defensibility_score} color={scoreColor(result.mvp_viability_scores.defensibility_score)} />
                      <div className="text-xs text-zinc-400 mt-3 leading-relaxed">{result.mvp_viability_scores.defensibility_rationale}</div>
                    </Card>
                    <Card>
                      <div className="text-[11px] font-mono font-bold text-violet-400 mb-2">{t.monetization}</div>
                      <div className="text-xs font-bold text-zinc-100 mb-1">
                        {t.monetizationLevels[result.mvp_viability_scores.monetization_requirement] || result.mvp_viability_scores.monetization_requirement}
                      </div>
                      <div className="text-xs text-zinc-400 leading-relaxed">{result.mvp_viability_scores.monetization_rationale}</div>
                    </Card>
                  </div>
                </Section>
              )}

              {/* Reconstruction du Modèle */}
              <Section title={t.reconstruction} color="#06b6d4">
                <Card className="space-y-1">
                  <Row label={t.problem}  value={result.reconstructed_model?.problem_user_believes_he_solves} />
                  <Row label={t.solution} value={result.reconstructed_model?.solution_proposed} />
                  <Row label={t.target}   value={result.reconstructed_model?.target_customer_detected} />
                  <Row label={t.workflow} value={result.reconstructed_model?.workflow_detected} />
                  <Row label={t.success}  value={result.reconstructed_model?.success_condition_detected} />
                </Card>
              </Section>

              {/* Zones d'Ombre */}
              {result.understanding_risk?.length > 0 && (
                <Section title={t.risks} color="#f97316">
                  <Card className="space-y-2">
                    {result.understanding_risk.map((r: string, i: number) => (
                      <div key={i} className="flex gap-2.5 items-start text-xs text-zinc-200">
                        <span className="text-orange-500 shrink-0 mt-0.5">⚠️</span>
                        <span className="leading-relaxed">{r}</span>
                      </div>
                    ))}
                  </Card>
                </Section>
              )}

              {/* Les Vraies Questions */}
              <Section title={t.questions} color="#10b981">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([
                    [t.q1, result.questions?.do_people_really_want_this],
                    [t.q2, result.questions?.does_someone_already_do_this],
                    [t.q3, result.questions?.cost_to_test],
                    [t.q4, result.questions?.difficulty_to_build],
                    [t.q5, result.questions?.biggest_risk],
                    [t.q6, result.questions?.biggest_strength],
                    [t.q7, result.questions?.time_to_know_if_it_works],
                    [t.q8, result.questions?.worth_trying],
                  ] as [string, string][]).map(([label, value], i) => (
                    <Card key={i} className="space-y-1">
                      <div className="text-[11px] font-mono font-bold text-emerald-400">{label}</div>
                      <div className="text-xs text-zinc-300 leading-relaxed">{value || "—"}</div>
                    </Card>
                  ))}
                </div>
              </Section>

              {/* Concurrent Principal */}
              {result.competitor_analysis && (
                <Section title={t.competitorAnalysis} color="#f59e0b">
                  <Card className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase block">{t.alternative}</span>
                        <span className="text-sm font-bold text-zinc-100">{result.competitor_analysis.alternative_name}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold border ${
                        result.competitor_analysis.is_direct_product_competitor
                          ? "bg-red-950/50 border-red-500/50 text-red-400"
                          : "bg-emerald-950/50 border-emerald-500/50 text-emerald-400"
                      }`}>
                        {t.directCompetitor} {result.competitor_analysis.is_direct_product_competitor ? t.yes : t.no}
                      </span>
                    </div>

                    {result.competitor_analysis.friction_comparison && (
                      <div className="space-y-1.5 text-xs text-zinc-300">
                        {result.competitor_analysis.friction_comparison.target_alignment && (
                          <div><span className="text-zinc-500 font-mono">{t.targetAlign} :</span> {result.competitor_analysis.friction_comparison.target_alignment}</div>
                        )}
                        {result.competitor_analysis.friction_comparison.workflow_friction && (
                          <div><span className="text-zinc-500 font-mono">{t.workflowFriction} :</span> {result.competitor_analysis.friction_comparison.workflow_friction}</div>
                        )}
                        {result.competitor_analysis.friction_comparison.experience_depth && (
                          <div><span className="text-zinc-500 font-mono">{t.expDepth} :</span> {result.competitor_analysis.friction_comparison.experience_depth}</div>
                        )}
                      </div>
                    )}

                    {result.competitor_analysis.verdict && (
                      <div className="border-t border-zinc-800/80 pt-3 text-xs text-zinc-300 italic leading-relaxed">
                        {result.competitor_analysis.verdict}
                      </div>
                    )}
                  </Card>
                </Section>
              )}

              {/* Similarité */}
              {result.competitor_similarity && (
                <Section title={t.competitorSimilarity} color="#f59e0b">
                  <Card className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {sameKeys.map((key, i) => (
                        <div
                          key={i}
                          className={`px-3 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 ${
                            result.competitor_similarity[key]
                              ? "bg-red-950/40 border-red-500/50 text-red-400"
                              : "bg-zinc-800/50 border-zinc-700/50 text-zinc-400"
                          }`}
                        >
                          <span>{result.competitor_similarity[key] ? "✓" : "✗"}</span>
                          <span>{t.sameLabels[i]}</span>
                        </div>
                      ))}
                    </div>
                    {result.competitor_similarity.verdict && (
                      <div className="border-t border-zinc-800/80 pt-3 text-xs text-zinc-300 italic">
                        {result.competitor_similarity.verdict}
                      </div>
                    )}
                  </Card>
                </Section>
              )}

              {/* Hypothèses Critiques */}
              {(result.analysis_trace?.critical_assumptions_used?.length > 0 || result.analysis_trace?.assumptions_that_if_wrong_change_everything?.length > 0) && (
                <Section title={t.assumptions} color="#f97316">
                  <Card className="space-y-4">
                    {result.analysis_trace?.critical_assumptions_used?.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase">{t.assumptionsUsed}</div>
                        {result.analysis_trace.critical_assumptions_used.map((a: string, i: number) => (
                          <div key={i} className="text-xs text-zinc-300 flex gap-2 items-start leading-relaxed">
                            <span className="text-amber-500 shrink-0">→</span>
                            <span>{a}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {result.analysis_trace?.assumptions_that_if_wrong_change_everything?.length > 0 && (
                      <div className="space-y-2 border-t border-zinc-800/80 pt-3">
                        <div className="text-[10px] font-mono font-bold text-red-400 uppercase">{t.assumptionsRisk}</div>
                        {result.analysis_trace.assumptions_that_if_wrong_change_everything.map((a: string, i: number) => (
                          <div key={i} className="text-xs text-zinc-300 flex gap-2 items-start leading-relaxed">
                            <span className="text-red-500 shrink-0">⚡</span>
                            <span>{a}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </Section>
              )}

            </div>
          )}

        </div>
      </section>

      {/* ── MODALE EXPLICATIVE "COMMENT ÇA MARCHE ?" ── */}
      {showHow && (
        <div onClick={() => setShowHow(false)} className="fixed inset-0 bg-black/85 flex items-center justify-center z-[9999] p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div onClick={e => e.stopPropagation()} className="bg-zinc-950 border border-cyan-500/40 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5 text-zinc-100 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowHow(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white text-sm p-1 cursor-pointer">✕</button>
            
            <h2 className="text-lg font-black text-white font-mono uppercase tracking-wider">{t.howTitle}</h2>
            
            <div className="space-y-4">
              {t.howSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 bg-zinc-900/60 border border-zinc-800/80 p-3.5 rounded-2xl">
                  <span className="text-xl shrink-0 mt-0.5">{step.icon}</span>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-cyan-300">{step.title}</div>
                    <div className="text-[11px] text-zinc-400 leading-relaxed">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setShowHow(false)} className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs font-mono uppercase tracking-wider cursor-pointer">
              {t.howClose}
            </button>
          </div>
        </div>
      )}

      {/* ── MODALE ECHOAI PREMIUM (3,99$) ── */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[99999] p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-amber-500/50 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-100 text-center relative">
            <button type="button" onClick={() => setShowPremiumModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white text-sm p-1 cursor-pointer">✕</button>

            <div className="text-4xl mb-3">⚡</div>
            <h2 className="text-lg font-black text-white uppercase font-mono mb-1">
              {fr ? "Quota de 2 Analyses Atteint" : "2-Analysis Limit Reached"}
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

      {/* ── MODALE CONNEXION (SIGN IN) ── */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-100">
            <form onSubmit={handleEmailSignIn} className="space-y-5">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-base font-bold">{fr ? "Connexion Requise" : "Authentication Required"}</h2>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    {fr ? "Connectez-vous pour analyser votre idée." : "Sign in to analyze your idea."}
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

      {/* ── MODALE INSCRIPTION (SIGN UP) ── */}
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

export default function IdeaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-cyan-400 font-mono text-xs">Initialisation d'Idea Analysis...</div>}>
      <IdeaContent />
    </Suspense>
  );
}