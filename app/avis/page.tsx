"use client";

import Link from "next/link";
import React, { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "../../context/AppContext";
import { supabase } from "../lib/supabase";

export const dynamic = "force-dynamic";

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

type CurrencyCode = "CAD" | "USD" | "EUR";

const CURRENCIES: CurrencyCode[] = ["CAD", "USD", "EUR"];
const PRICES: Record<CurrencyCode, { amount: string; symbol: string }> = {
  CAD: { amount: "3.99", symbol: "CA$" },
  USD: { amount: "3.99", symbol: "US$" },
  EUR: { amount: "3.99", symbol: "€" },
};

interface AnalysisResults {
  productName: string;
  positives: string[];
  negatives: string[];
}

interface ChatMessage {
  sender: "user" | "ia";
  text: string;
}

function AvisContent() {
  const { lang, setLang } = useApp();
  const fr = lang === "fr";
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<any>(null);
  const [userTier, setUserTier] = useState<string>("free");

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResults | null>(null);

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const [currency, setCurrency] = useState<CurrencyCode>("CAD");
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [signInError, setSignInError] = useState<string | null>(null);
  const [signInSuccess, setSignInSuccess] = useState<string | null>(null);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState<string | null>(null);

  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendEmail, setResendEmail] = useState("");
  const [sessionId, setSessionId] = useState<string>("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    let sid = localStorage.getItem("avis_session_id");
    if (!sid) {
      sid = `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("avis_session_id", sid);
    }
    setSessionId(sid);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        verifierStatutUser(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
        verifierStatutUser(session.user.id);
      } else {
        setUser(null);
        setUserTier("free");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const verifierStatutUser = async (uid: string) => {
    try {
      const { data: cData } = await supabase
        .from("contenu_quotas")
        .select("tier")
        .eq("user_id", uid)
        .maybeSingle();

      if (cData?.tier && cData.tier !== "free" && cData.tier !== "connected_free") {
        setUserTier(cData.tier);
        return;
      }

      const { data: wData } = await supabase
        .from("world_quotas")
        .select("tier")
        .eq("user_id", uid)
        .maybeSingle();

      if (wData?.tier && wData.tier !== "free" && wData.tier !== "connected_free") {
        setUserTier(wData.tier);
        return;
      }

      setUserTier("free");
    } catch (e) {
      console.warn("Erreur verif statut:", e);
    }
  };

  const api = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setChatMessages([]);

    try {
      const res = await fetch(`${api}/api/analyse-avis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), lang }),
      });

      if (!res.ok) throw new Error(fr ? "Erreur serveur" : "Server error");
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const name = data.product_name || "Produit";
      const pos = Array.isArray(data.positives) ? data.positives.slice(0, 5) : [];
      const neg = Array.isArray(data.negatives) ? data.negatives.slice(0, 5) : [];

      setResults({ productName: name, positives: pos, negatives: neg });
      setChatMessages([{ sender: "ia", text: fr ? `Analyse terminée pour **${name}**. Posez-moi une question !` : `Analysis completed for **${name}**. Ask me any question!` }]);

      try {
        const sid = sessionId || localStorage.getItem("avis_session_id");
        await supabase.from("avis_analyses").upsert({
          id: `${sid}_${Date.now()}`,
          user_id: user?.id || null,
          session_id: sid,
          data: {
            url: url.trim(),
            results: { productName: name, positives: pos, negatives: neg },
            chatMessages: [{ sender: "ia", text: fr ? `Analyse terminée pour **${name}**.` : `Analysis finished for **${name}**.` }],
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
      } catch (e) {}

    } catch (err: any) {
      setError(err.message || (fr ? "Erreur inattendue." : "Unexpected error."));
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !results || chatLoading) return;
    const q = chatInput.trim();
    setChatInput("");
    setChatMessages(p => [...p, { sender: "user", text: q }]);
    setChatLoading(true);

    try {
      const res = await fetch(`${api}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: fr
            ? `Question sur "${results.productName}" : "${q}". Points forts : ${results.positives.join(", ")}. Défauts : ${results.negatives.join(", ")}. Réponds en français, directement.`
            : `Question regarding "${results.productName}": "${q}". Strengths: ${results.positives.join(", ")}. Flaws: ${results.negatives.join(", ")}. Answer directly in English.`,
          userTier: isPaidTier ? "premium" : "free",
          history: [],
        }),
      });
      const data = await res.json();
      setChatMessages(p => [...p, { sender: "ia", text: data.response || (fr ? "Erreur de connexion." : "Connection error.") }]);
    } catch {
      setChatMessages(p => [...p, { sender: "ia", text: fr ? "Erreur de connexion." : "Connection error." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleGoogleConnect = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/avis`, scopes: "openid profile email", queryParams: { prompt: "select_account" } },
    });
  };

  const handleMicrosoftConnect = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: { redirectTo: `${window.location.origin}/avis`, scopes: "openid profile email User.Read" },
    });
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
        alert(fr ? "Erreur de redirection." : "Redirection error.");
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
      setSignInError(fr ? "Veuillez entrer vos identifiants." : "Please enter credentials.");
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
      setSignUpError(fr ? "Champs manquants." : "Missing fields.");
      return;
    }
    const trimmedEmail = email.trim();
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: { emailRedirectTo: `${window.location.origin}/avis` },
    });

    if (error) {
      setSignUpError(error.message);
    } else {
      setResendEmail(trimmedEmail);
      setSignUpSuccess(fr ? "Lien de confirmation envoyé ! Pensez aux spams." : "Confirmation link sent! Check spam folder.");
      startResendCountdown();
    }
  };

  const clearInputs = () => {
    setEmail("");
    setPassword("");
    setSignInError(null);
    setSignInSuccess(null);
    setSignUpError(null);
    setSignUpSuccess(null);
  };

  const isPaidTier = userTier && userTier !== "free" && userTier !== "connected_free";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-cyan-500/20 antialiased relative overflow-x-hidden">
      {/* ── SECTION DU HAUT : BLANCHE AVEC MASCOTTE, BRANDING ET NAVIGATION ── */}
      <section className="bg-white text-zinc-900 relative z-30">
        <header className="border-b border-zinc-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center relative">
            
            {/* BOUTON RETOUR AUX OUTILS ET LOGO ECHOSAI */}
            <div className="flex items-center gap-4">
              <Link
                href="/outil"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] animate-pulse"
              >
                ⚡ {fr ? "RETOUR AUX OUTILS" : "BACK TO TOOLS"}
              </Link>
              <Link href="/outil" className="text-sm font-mono font-black tracking-[0.25em] text-zinc-900 uppercase hidden sm:block">
                ECHOSAI
              </Link>
            </div>

            {/* CONTROLES / DEVISES / PREMIUM / AUTH */}
            <div className="flex items-center gap-4 text-xs font-mono relative">
              
              {/* DEVISES */}
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

              {/* BADGE PREMIUM NOIR ET VERT NÉON */}
              {isPaidTier ? (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-emerald-500/50 bg-black text-emerald-400 font-mono shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                  <span className="font-bold text-[11px] uppercase tracking-wider">
                    {fr ? "✓ PLAN PREMIUM ACTIF" : "✓ PREMIUM ACTIVE"}
                  </span>
                </div>
              ) : (
                <div 
                  onClick={() => setShowPremiumModal(true)} 
                  className="cursor-pointer flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-amber-500/40 bg-zinc-900 text-white shadow-lg hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
                >
                  <span className="text-[9px] bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm animate-pulse">
                    ★ ECHOAI PREMIUM ({PRICES[currency].symbol}{PRICES[currency].amount})
                  </span>
                </div>
              )}

              {/* TRADUCTION FR / EN */}
              <div className="flex border border-zinc-200 rounded-lg overflow-hidden font-mono text-[10px]">
                <button onClick={() => setLang("fr")} className={`px-2 py-1 ${lang === "fr" ? "bg-zinc-900 text-white font-bold" : "bg-zinc-50 text-zinc-400 hover:text-zinc-600"}`}>FR</button>
                <button onClick={() => setLang("en")} className={`px-2 py-1 ${lang === "en" ? "bg-zinc-900 text-white font-bold" : "bg-zinc-50 text-zinc-400 hover:text-zinc-600"}`}>EN</button>
              </div>

              {/* PROFIL / CONNEXION */}
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200">
                    🟢 {user.email}
                  </span>
                  <button onClick={() => supabase.auth.signOut()} className="text-[11px] text-red-500 hover:text-red-700 font-bold uppercase">
                    [ {fr ? "Déconnexion" : "Sign Out"} ]
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setShowSignInModal(true)} className="px-3.5 py-1.5 border border-zinc-900 text-zinc-900 rounded-xl hover:bg-zinc-900 hover:text-white transition-all font-bold">
                    {fr ? "Connexion" : "Sign In"}
                  </button>
                  <button onClick={() => setShowSignUpModal(true)} className="px-3.5 py-1.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all font-bold">
                    {fr ? "S'inscrire" : "Sign Up"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* BANNIÈRE DE PRÉSENTATION DE L'OUTIL AVIS */}
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <div className="inline-block text-[10px] font-mono tracking-widest text-zinc-400 uppercase mb-2 border border-zinc-200 px-2 py-0.5 rounded">
              {fr ? "MODULE 03 // ANALYSE D'AVIS ACHAts" : "MODULE 03 // BUYING REVIEWS ANALYSIS"}
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 leading-[1.0] mb-3 uppercase">
              {fr ? "DÉCOUVREZ LA VÉRITÉ SUR UN PRODUIT" : "DISCOVER THE TRUTH ABOUT A PRODUCT"}
            </h2>
            <p className="text-zinc-500 max-w-lg text-xs md:text-sm font-sans leading-relaxed">
              {fr
                ? "Ne vous fiez plus aux avis truqués. Collez l'URL d'une fiche produit pour extraire les vrais points forts et les défauts cachés."
                : "Don't trust fake reviews. Paste any product link to extract true strengths and hidden flaws."}
            </p>
          </div>
          <div className="lg:col-span-4 flex justify-center lg:justify-end">
            <img src="/echo1.png" alt="Echo AI Core" className="w-full max-w-[180px] h-auto object-contain drop-shadow-[0_10px_25px_rgba(6,182,212,0.15)]" />
          </div>
        </div>
      </section>

      {/* ── TRANSITION COURBE NEON CYAN ── */}
      <div className="relative w-full h-20 bg-zinc-950 overflow-hidden -mt-1 z-20">
        <svg className="absolute top-0 left-0 w-full h-full text-white fill-current" viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path d="M0,0 L1440,0 L1440,30 Q1080,90 720,50 Q360,0 0,60 Z" />
        </svg>
        <svg className="absolute top-0 left-0 w-full h-full text-transparent fill-none pointer-events-none z-22" viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path d="M0,60 Q360,0 720,50 Q1080,90 1440,30" stroke="#06b6d4" strokeWidth="6" className="drop-shadow-[0_0_12px_#06b6d4]" />
        </svg>
      </div>

      
      {/* ── SECTION DU BAS : FORMULAIRE, RÉSULTATS & CHAT ── */}
      <section className="bg-zinc-950 text-zinc-50 pb-16 pt-12 relative z-10">
        <div className="max-w-4xl mx-auto px-6 space-y-8">
          
          {/* BARRE DE RECHERCHE PRODUIT */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={fr ? "https://www.amazon.ca/... ou walmart.ca/..." : "https://www.amazon.com/... or Walmart link..."}
              className="flex-1 bg-zinc-900 border-2 border-cyan-500/40 rounded-2xl px-5 py-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-black px-8 py-4 rounded-2xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.4)]"
            >
              {loading ? (fr ? "ANALYSE EN COURS..." : "ANALYZING...") : (fr ? "ANALYSER LE PRODUIT" : "ANALYZE PRODUCT")}
            </button>
          </form>

          {error && (
            <div className="bg-red-950/60 border border-red-500/50 rounded-2xl p-4 text-xs text-red-400 font-mono">
              ⚠️ {error}
            </div>
          )}

          {/* INDICATEUR DE CHARGEMENT */}
          {loading && (
            <div className="flex items-center justify-center gap-3 py-12 text-cyan-400 font-mono text-xs">
              <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span>{fr ? "Recherche et analyse en cours..." : "Search and analysis in progress..."}</span>
            </div>
          )}

          {/* AFFICHAGE DES RÉSULTATS */}
          {results && !loading && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3 font-mono">
                <span className="text-xl">📦</span>
                <span className="font-bold text-sm text-cyan-300">{results.productName}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* POINTS FORTS */}
                <div className="bg-zinc-900/60 border border-emerald-500/40 rounded-3xl p-6 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                  <h3 className="text-emerald-400 font-mono font-bold text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {fr ? "5 Points Forts Réels" : "5 Real Strengths"}
                  </h3>
                  <ol className="space-y-3 font-sans text-xs text-zinc-300">
                    {results.positives.map((p, i) => (
                      <li key={i} className="flex gap-3 items-start">
                        <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-bold text-[10px]">#{i + 1}</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* DÉFAUTS CACHÉS */}
                <div className="bg-zinc-900/60 border border-rose-500/40 rounded-3xl p-6 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                  <h3 className="text-rose-400 font-mono font-bold text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    {fr ? "5 Pires Défauts Cachés" : "5 Hidden Flaws"}
                  </h3>
                  <ol className="space-y-3 font-sans text-xs text-zinc-300">
                    {results.negatives.map((n, i) => (
                      <li key={i} className="flex gap-3 items-start">
                        <span className="bg-rose-950 text-rose-400 border border-rose-500/40 px-2 py-0.5 rounded font-mono font-bold text-[10px]">#{i + 1}</span>
                        <span>{n}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* MODULE CHAT PRODUIT */}
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 space-y-4">
                <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                  💬 {fr ? "Posez une question à l'agent sur ce produit" : "Ask the agent about this product"}
                </h4>

                {chatMessages.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-3 p-3 bg-zinc-950/60 rounded-2xl border border-zinc-800 font-sans text-xs">
                    {chatMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl ${m.sender === "user" ? "bg-cyan-500 text-zinc-950 font-medium" : "bg-zinc-800 text-zinc-200"}`}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {chatLoading && <div className="text-zinc-500 text-[10px] font-mono animate-pulse">{fr ? "Réflexion..." : "Thinking..."}</div>}
                    <div ref={chatEndRef} />
                  </div>
                )}

                <form onSubmit={handleChat} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={chatLoading}
                    placeholder={fr ? "Ex: Est-ce adapté pour un usage intensif ?" : "Ex: Is it suited for heavy use?"}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold px-5 py-3 rounded-xl text-xs uppercase cursor-pointer disabled:opacity-50"
                  >
                    ↵
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* ÉTAT VIDE */}
          {!results && !loading && !error && (
            <div className="text-center py-16 border border-dashed border-zinc-800 rounded-3xl space-y-2">
              <span className="text-3xl opacity-40">🔍</span>
              <p className="text-xs text-zinc-500 font-mono">
                {fr ? "Collez un lien produit ci-dessus pour lancer le scanner d'avis." : "Paste a product link above to run the review scanner."}
              </p>
            </div>
          )}

        </div>
      </section>

      {/* ── MODAL PREMIUM ── */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[99999] p-6 backdrop-blur-md">
          <div className="bg-zinc-950 border border-amber-500/50 rounded-3xl p-8 max-w-md w-full shadow-2xl text-zinc-100 text-center relative">
            <button type="button" onClick={() => setShowPremiumModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white text-sm p-1">✕</button>

            <div className="text-4xl mb-3">⚡</div>
            <h2 className="text-lg font-black text-white uppercase font-mono mb-1">
              {fr ? "Abonnement EchoAI Premium" : "EchoAI Premium Subscription"}
            </h2>
            <p className="text-xs text-zinc-400 mb-4 font-sans">
              {fr ? "Débloquez l'accès illimité à l'ensemble des modules." : "Unlock unlimited access to all modules."}
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
              </ul>
            </div>

            <button
              onClick={handleStripeCheckout}
              disabled={isCheckoutLoading}
              className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 shadow-[0_0_25px_rgba(245,158,11,0.3)] disabled:opacity-50"
            >
              {isCheckoutLoading
                ? (fr ? "CHARGEMENT..." : "LOADING...")
                : (fr ? `Activer Premium (${PRICES[currency].symbol}{PRICES[currency].amount}/mois)` : `Activate Premium (${PRICES[currency].symbol}{PRICES[currency].amount}/mo)`)}
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL CONNEXION (SIGN IN) ── */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6 backdrop-blur-md">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-zinc-100">
            <form onSubmit={handleEmailSignIn} className="space-y-5">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-base font-bold">{fr ? "Connexion Requise" : "Authentication Required"}</h2>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{fr ? "Connectez-vous pour continuer." : "Sign in to continue."}</p>
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

              <p className="text-center text-zinc-500 text-xs pt-1">
                {fr ? "Pas de compte ? " : "No account? "}
                <button type="button" onClick={() => { setShowSignInModal(false); setShowSignUpModal(true); clearInputs(); }} className="text-cyan-400 underline">
                  {fr ? "S'inscrire" : "Sign up"}
                </button>
              </p>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL INSCRIPTION (SIGN UP) ── */}
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
    </main>
  );
}

export default function AvisPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-cyan-400 font-mono text-xs">Chargement...</div>}>
      <AvisContent />
    </Suspense>
  );
}