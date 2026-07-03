"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Lang = "fr" | "en";
const T = {
  fr: {
    tagline: "Des avis, pas du marketing",
    sub1: "Le vrai visage d'un produit, en quelques secondes.",
    sub2: "Collez un lien Web et découvrez ce qu'il vaut vraiment.",
    placeholder: "https://www.amazon.ca/... ou walmart.ca/...",
    analyse: "Analyser",
    analysing: "Analyse…",
    empty: "Colle un lien produit ci-dessus",
    pos: "5 Points Forts Réels",
    neg: "5 Pires Défauts Cachés",
    amazon: "Trouver sur Amazon",
    amzBiz: "Amazon Business",
    chatPh: "Pose une question sur ce produit…",
    chatWelcome: "Analyse terminée pour",
    chatWelcome2: ". Pose-moi une question.",
    chatErr: "Erreur de connexion.",
    donTitle: "Soutenir le projet",
    donDesc: "Cet outil est gratuit. Si il t'a sauvé d'un mauvais achat, un petit geste est bienvenu.",
    donBtn: "Faire un don",
    accountTitle: "Mon compte Echo",
    google: "Continuer avec Google",
    microsoft: "Continuer avec Microsoft",
    signin: "Se connecter par email",
    signup: "Créer un compte",
    connected: "Connecté",
    myAccount: "Mon compte",
    logout: "Se déconnecter",
    modalSignin: "🛸 Connexion",
    modalSignup: "🛸 Créer un compte",
    switchToSignup: "Pas encore de compte ? Créer",
    switchToSignin: "Déjà un compte ? Se connecter",
    submitSignin: "Se connecter",
    submitSignup: "Créer mon compte",
    dark: "☾ Sombre",
    light: "☀ Clair",
    footer: "Propulsé par GPT-4o Search",
    loading: "GPT-4o cherche les vrais avis…",
  },
  en: {
    tagline: "Reviews, not marketing",
    sub1: "The real face of a product, in seconds.",
    sub2: "Paste a web link and discover what it's really worth.",
    placeholder: "https://www.amazon.ca/... or walmart.ca/...",
    analyse: "Analyze",
    analysing: "Analyzing…",
    empty: "Paste a product link above",
    pos: "5 Real Strengths",
    neg: "5 Hidden Flaws",
    amazon: "Find on Amazon",
    amzBiz: "Amazon Business",
    chatPh: "Ask a question about this product…",
    chatWelcome: "Analysis done for",
    chatWelcome2: ". Ask me anything.",
    chatErr: "Connection error.",
    donTitle: "Support the project",
    donDesc: "This tool is free. If it saved you from a bad purchase, a small contribution is welcome.",
    donBtn: "Donate",
    accountTitle: "My Echo Account",
    google: "Continue with Google",
    microsoft: "Continue with Microsoft",
    signin: "Sign in by email",
    signup: "Create an account",
    connected: "Connected",
    myAccount: "My account",
    logout: "Sign out",
    modalSignin: "🛸 Sign In",
    modalSignup: "🛸 Create Account",
    switchToSignup: "No account yet? Create one",
    switchToSignin: "Already have an account? Sign in",
    submitSignin: "Sign in",
    submitSignup: "Create my account",
    dark: "☾ Dark",
    light: "☀ Light",
    footer: "Powered by GPT-4o Search",
    loading: "GPT-4o is searching real reviews…",
  },
};

interface AnalysisResults {
  productName: string;
  positives: string[];
  negatives: string[];
  amazonLinks: { label: string; url: string }[];
}

interface ChatMessage {
  sender: "user" | "ia";
  text: string;
}

const DONATION_PLANS = [
  { name: "Avantage", amount: "$5.99", plan: "basic", desc: "Un café offert" },
  { name: "Premium",  amount: "$9.99", plan: "premium", desc: "Soutien réel" },
  { name: "Ultra",    amount: "$19.99", plan: "ultra", desc: "Généreux" },
  { name: "Fondateur",amount: "$99",   plan: "founder", desc: "Tu crois en nous 💛" },
];

export default function AvisPage() {
  const [dark, setDark] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [donOpen, setDonOpen] = useState(false);
  const [donLoading, setDonLoading] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("fr");
  const [showLang, setShowLang] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUser(data.user); });
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setShowUserMenu(false);
  };

  const t = T[lang];

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/avis`, scopes: "openid profile email", queryParams: { prompt: "select_account" } },
    });
    if (error) console.error(error.message);
  };

  const handleMicrosoft = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: { redirectTo: `${window.location.origin}/avis`, scopes: "openid profile email User.Read" },
    });
    if (error) console.error(error.message);
  };

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailMode, setEmailMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null); setAuthSuccess(null);
    if (emailMode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setAuthError(error.message);
      else { router.push("/avis"); setShowEmailModal(false); }
    } else {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/account` } });
      if (error) setAuthError(error.message);
      else if (data?.user && (!data.user.identities || data.user.identities.length === 0)) setAuthError("Un compte avec cet e-mail existe déjà.");
      else setAuthSuccess("Inscription réussie ! Vérifiez votre boîte mail.");
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const api = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true); setError(null); setResults(null); setChatMessages([]);
    try {
      const res = await fetch(`${api}/api/analyse-avis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const name = data.product_name || "Produit";
      setResults({
        productName: name,
        positives: Array.isArray(data.positives) ? data.positives.slice(0, 5) : [],
        negatives: Array.isArray(data.negatives) ? data.negatives.slice(0, 5) : [],
        amazonLinks: [
          { label: t.amazon, url: `https://www.amazon.ca/s?k=${encodeURIComponent(name)}&tag=tonid-20` },
          { label: t.amzBiz, url: `https://www.amazon.ca/s?k=${encodeURIComponent(name + " business")}&tag=tonid-20` },
        ],
      });
      setChatMessages([{ sender: "ia", text: `${t.chatWelcome} **${name}**${t.chatWelcome2}` }]);
    } catch (err: any) {
      setError(err.message || "Erreur inattendue.");
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
          message: `Question sur "${results.productName}" : "${q}". Points forts : ${results.positives.join(", ")}. Défauts : ${results.negatives.join(", ")}. Réponds de façon directe et courte.`,
          userTier: "connected_free",
          history: [],
        }),
      });
      const data = await res.json();
      setChatMessages(p => [...p, { sender: "ia", text: data.response || "Pas de réponse." }]);
    } catch {
      setChatMessages(p => [...p, { sender: "ia", text: "{t.chatErr}" }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDon = async (plan: string) => {
    setDonLoading(plan);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, userId: "guest_don", userEmail: "don@echosai.ca", currency: "CAD" }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      alert("Erreur de paiement, réessaie.");
    } finally {
      setDonLoading(null);
    }
  };

  // ── TOKENS DE COULEUR ────────────────────────────────────────────────────────
  const bg    = dark ? "#1a1917" : "#f0ece4";
  const surf  = dark ? "#242220" : "#fffdf9";
  const surf2 = dark ? "#2d2b28" : "#f5f1e8";
  const bord  = dark ? "#3a3835" : "#e2ddd5";
  const txt   = dark ? "#f0ece4" : "#1a1917";
  const muted = dark ? "#8a8680" : "#7a7570";
  const acc   = "#e07b39";

  return (
    <div style={{ background: bg, color: txt, minHeight: "100dvh", fontFamily: "'Inter', sans-serif", transition: "background .3s, color .3s" }}>

      {/* ── TOGGLE DARK ─────────────────────────────────────────────────────── */}
      {/* ── CONTROLS TOP RIGHT ───────────────────────────────────────────────── */}
      <div style={{ position: "fixed", top: 12, right: 14, zIndex: 200, display: "flex", alignItems: "center", gap: 8 }}>

        {/* Indicateur connecté + menu */}
        {user ? (
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowUserMenu(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "#16a34a", border: "none", borderRadius: 20, padding: "5px 12px", cursor: "pointer", fontSize: 11, color: "#fff", fontWeight: 700 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#86efac", display: "inline-block" }} />
              {t.connected}
              <span style={{ fontSize: 9, opacity: .7 }}>{showUserMenu ? "▲" : "▼"}</span>
            </button>
            {showUserMenu && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: surf, border: `1px solid ${bord}`, borderRadius: 12, overflow: "hidden", minWidth: 160, boxShadow: "0 4px 20px rgba(0,0,0,.15)", zIndex: 300 }}>
                <a href="/account" style={{ display: "block", padding: "9px 14px", fontSize: 12, color: txt, textDecoration: "none", fontWeight: 600, borderBottom: `1px solid ${bord}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = surf2)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  👤 {t.myAccount}
                </a>
                <button onClick={handleLogout} style={{ display: "block", width: "100%", padding: "9px 14px", fontSize: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600, textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.background = surf2)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  ↩ {t.logout}
                </button>
              </div>
            )}
          </div>
        ) : null}

        {/* Sélecteur langue */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowLang(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 5, background: surf2, border: `1px solid ${bord}`, borderRadius: 20, padding: "5px 11px", cursor: "pointer", fontSize: 11, color: txt, fontWeight: 700 }}>
            {lang === "fr" ? "🇫🇷 FR" : "🇬🇧 EN"}
            <span style={{ fontSize: 8, opacity: .6 }}>{showLang ? "▲" : "▼"}</span>
          </button>
          {showLang && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: surf, border: `1px solid ${bord}`, borderRadius: 12, overflow: "hidden", minWidth: 120, boxShadow: "0 4px 20px rgba(0,0,0,.15)", zIndex: 300 }}>
              {(["fr", "en"] as Lang[]).map(l => (
                <button key={l} onClick={() => { setLang(l); setShowLang(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", fontSize: 12, background: lang === l ? (dark ? "#3a3835" : "#f5f1e8") : "transparent", color: lang === l ? acc : txt, border: "none", cursor: "pointer", fontWeight: lang === l ? 700 : 500 }}>
                  {l === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Toggle dark */}
        <button onClick={() => setDark(d => !d)}
          style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 20, padding: "5px 11px", cursor: "pointer", fontSize: 11, color: muted, fontWeight: 600 }}>
          {dark ? t.light : t.dark}
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          LAYOUT : 3 colonnes
      ════════════════════════════════════════════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 200px", gridTemplateRows: "auto auto auto", minHeight: "100dvh", maxWidth: 1280, margin: "0 auto", padding: "0 12px" }}>

        {/* ── COL GAUCHE ─────────────────────────────────────────────────────── */}
        <aside style={{ gridColumn: 1, gridRow: "1 / 4", paddingTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>

          {/* PUB echosai.ca/welcome — portrait */}
          <a href="https://echosai.ca/welcome" target="_blank" rel="noopener noreferrer"
            style={{ display: "block", borderRadius: 14, overflow: "hidden", border: `1px solid ${bord}`, transition: "transform .2s", flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <img src="/pub.jpg" alt="Echo AI" style={{ width: "100%", display: "block", objectFit: "cover" }} />
            <div style={{ background: acc, color: "#fff", textAlign: "center", fontSize: 10, fontWeight: 700, padding: "5px 0", letterSpacing: 1 }}>
              ESSAYER ECHO AI →
            </div>
          </a>

          {/* PUB affinity — bas gauche */}
          <a href="https://echosai.ca/1/hall" target="_blank" rel="noopener noreferrer"
            style={{ display: "block", borderRadius: 14, overflow: "hidden", border: `1px solid ${bord}`, marginTop: "auto", transition: "transform .2s" }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <img src="/affinity.jpg" alt="Affinity Hall" style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 90 }} />
            <div style={{ background: surf2, color: muted, textAlign: "center", fontSize: 9, fontWeight: 600, padding: "4px 0", letterSpacing: 0.8 }}>
              AFFINITY HALL →
            </div>
          </a>
        </aside>

        {/* ── CENTRE HAUT : barre de recherche ──────────────────────────────── */}
        <header style={{ gridColumn: 2, gridRow: 1, padding: "18px 20px 10px" }}>

          {/* Accroche */}
          <div style={{ marginBottom: 14 }}>
            <h1 style={{ fontWeight: 900, fontSize: 20, letterSpacing: -0.5, lineHeight: 1.15, marginBottom: 4 }}>
              {t.tagline}
            </h1>
            <p style={{ fontSize: 12, color: muted, lineHeight: 1.55, marginBottom: 0 }}>
              {t.sub1}<br/>
              {t.sub2}
            </p>
          </div>

          {/* Barre de recherche */}
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
            <input
              type="url"
              required
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder={t.placeholder}
              style={{
                flex: 1, background: surf, border: `1.5px solid ${bord}`,
                borderRadius: 12, padding: "10px 14px", fontSize: 13,
                color: txt, outline: "none", fontFamily: "monospace",
                transition: "border-color .2s",
              }}
              onFocus={e => (e.target.style.borderColor = acc)}
              onBlur={e => (e.target.style.borderColor = bord)}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? muted : acc,
                color: "#fff", border: "none", borderRadius: 12,
                padding: "10px 20px", fontWeight: 700, fontSize: 13,
                cursor: loading ? "not-allowed" : "pointer", whiteSpace: "nowrap",
                transition: "background .2s",
              }}
            >
              {loading ? t.analysing : t.analyse}
            </button>
          </form>

          {error && (
            <div style={{ marginTop: 8, padding: "8px 12px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, fontSize: 12, color: "#b91c1c" }}>
              ⚠️ {error}
            </div>
          )}
        </header>

        {/* ── CENTRE MILIEU : résultats ──────────────────────────────────────── */}
        <main style={{ gridColumn: 2, gridRow: 2, padding: "0 20px 8px" }}>

          {/* Loader */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 80, gap: 8 }}>
              <div style={{ width: 32, height: 32, border: `3px solid ${bord}`, borderTopColor: acc, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <div style={{ fontSize: 12, color: muted }}>{t.loading}</div>
            </div>
          )}

          {/* Résultats */}
          {results && !loading && (
            <div>
              {/* Nom produit */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "7px 12px", background: surf2, borderRadius: 10, border: `1px solid ${bord}` }}>
                <span style={{ fontSize: 16 }}>📦</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{results.productName}</span>
              </div>

              {/* Deux colonnes */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

                {/* Positifs */}
                <div style={{ background: surf, border: `1px solid #86efac`, borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                    {t.pos}
                  </div>
                  <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                    {results.positives.map((p, i) => (
                      <li key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: txt, lineHeight: 1.4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#dcfce7", borderRadius: 4, padding: "1px 5px", flexShrink: 0, alignSelf: "flex-start", marginTop: 1 }}>#{i + 1}</span>
                        {p}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Négatifs */}
                <div style={{ background: surf, border: `1px solid #fca5a5`, borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                    {t.neg}
                  </div>
                  <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                    {results.negatives.map((n, i) => (
                      <li key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: txt, lineHeight: 1.4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fee2e2", borderRadius: 4, padding: "1px 5px", flexShrink: 0, alignSelf: "flex-start", marginTop: 1 }}>#{i + 1}</span>
                        {n}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Liens Amazon */}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {results.amazonLinks.map((l, i) => (
                  <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: surf2, border: `1px solid ${bord}`, borderRadius: 10, fontSize: 11, fontWeight: 600, color: txt, textDecoration: "none", transition: "border-color .2s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = acc)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = bord)}
                  >
                    <span>🛒 {l.label}</span>
                    <span style={{ color: muted }}>→</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* État vide */}
          {!results && !loading && !error && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 80, gap: 5, color: muted }}>
              <span style={{ fontSize: 22, filter: "grayscale(1)", opacity: .4 }}>🔍</span>
              <span style={{ fontSize: 11 }}>{t.empty}</span>
            </div>
          )}

          {/* ── CHAT ──────────────────────────────────────────────────────────── */}
          {results && (
            <div style={{ marginTop: 10, background: surf, border: `1px solid ${bord}`, borderRadius: 12, padding: "12px 14px" }}>
              {chatMessages.length > 0 && (
                <div style={{ maxHeight: 130, overflowY: "auto", display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
                  {chatMessages.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.sender === "user" ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "80%", padding: "7px 11px", borderRadius: 10, fontSize: 12, lineHeight: 1.45,
                        background: m.sender === "user" ? acc : surf2,
                        color: m.sender === "user" ? "#fff" : txt,
                        border: m.sender === "ia" ? `1px solid ${bord}` : "none",
                      }}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display: "flex", gap: 4, padding: "7px 11px" }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: muted, animation: `bounce 1s ${i * 0.15}s infinite` }} />
                      ))}
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
              <form onSubmit={handleChat} style={{ display: "flex", gap: 7 }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  disabled={chatLoading}
                  placeholder="{t.chatPh}"
                  style={{ flex: 1, background: surf2, border: `1px solid ${bord}`, borderRadius: 9, padding: "8px 12px", fontSize: 12, color: txt, outline: "none" }}
                />
                <button type="submit" disabled={chatLoading || !chatInput.trim()}
                  style={{ background: acc, color: "#fff", border: "none", borderRadius: 9, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: chatLoading || !chatInput.trim() ? .5 : 1 }}>
                  ↵
                </button>
              </form>
            </div>
          )}
        </main>

        {/* ── CENTRE BAS : copyright minimaliste ──────────────────────────────── */}
        <footer style={{ gridColumn: 2, gridRow: 3, padding: "0 20px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: muted, opacity: .5 }}>
            © {new Date().getFullYear()} Anti-Bullshit Reviews · {t.footer}
          </div>
        </footer>

        {/* ── COL DROITE ─────────────────────────────────────────────────────── */}
        <aside style={{ gridColumn: 3, gridRow: "1 / 4", paddingTop: 10, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* BOITE DE DON */}
          <div style={{ background: surf, border: `1.5px solid ${bord}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${bord}` }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>☕</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{t.donTitle}</div>
              <div style={{ fontSize: 11, color: muted, lineHeight: 1.4 }}>
                {t.donDesc}
              </div>
            </div>

            <div style={{ padding: "10px 14px" }}>
              <button
                onClick={() => setDonOpen(d => !d)}
                style={{ width: "100%", background: acc, color: "#fff", border: "none", borderRadius: 9, padding: "8px 0", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                {t.donBtn} {donOpen ? "▲" : "▼"}
              </button>

              {donOpen && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {DONATION_PLANS.map(d => (
                    <button
                      key={d.plan}
                      onClick={() => handleDon(d.plan)}
                      disabled={donLoading === d.plan}
                      style={{
                        background: surf2, border: `1px solid ${bord}`,
                        borderRadius: 8, padding: "7px 10px", cursor: "pointer",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        transition: "border-color .2s", opacity: donLoading === d.plan ? .6 : 1,
                        color: txt,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = acc)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = bord)}
                    >
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 11, fontWeight: 700 }}>{d.name}</div>
                        <div style={{ fontSize: 10, color: muted }}>{d.desc}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: acc }}>{d.amount}</div>
                    </button>
                  ))}
                  <div style={{ fontSize: 10, color: muted, textAlign: "center", marginTop: 2 }}>
                    Paiement sécurisé via Stripe
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4 BOUTONS CONNEXION */}
          <div style={{ background: surf, border: `1px solid ${bord}`, borderRadius: 14, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>{t.accountTitle}</div>

            {/* Google */}
            <button onClick={handleGoogle}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", color: "#374151", fontSize: 11, fontWeight: 600, width: "100%", transition: "box-shadow .2s" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.12)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.18 2.18 5.94l3.66 2.84c.87-2.6 3.3-4.4 6.16-4.4z" fill="#EA4335"/>
              </svg>
              {t.google}
            </button>

            {/* Microsoft */}
            <button onClick={handleMicrosoft}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: dark ? "#2d2b28" : "#1a1917", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 600, width: "100%", transition: "opacity .2s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = ".85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <svg width="14" height="14" viewBox="0 0 23 23" fill="none">
                <path d="M0 0H11V11H0V0Z" fill="#F25022"/><path d="M12 0H23V11H12V0Z" fill="#7FBA00"/>
                <path d="M0 12H11V23H0V12Z" fill="#00A4EF"/><path d="M12 12H23V23H12V12Z" fill="#FFB900"/>
              </svg>
              {t.microsoft}
            </button>

            {/* Email connexion */}
            <button onClick={() => { setEmailMode("signin"); setAuthError(null); setAuthSuccess(null); setShowEmailModal(true); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#0ea5e9", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 600, width: "100%", transition: "opacity .2s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = ".85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <span>✉</span> {t.signin}
            </button>

            {/* Créer compte */}
            <button onClick={() => { setEmailMode("signup"); setAuthError(null); setAuthSuccess(null); setShowEmailModal(true); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: surf2, border: `1px solid ${bord}`, borderRadius: 8, cursor: "pointer", color: txt, fontSize: 11, fontWeight: 600, width: "100%", transition: "border-color .2s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = acc)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = bord)}
            >
              <span>✦</span> {t.signup}
            </button>
          </div>

        </aside>
      </div>

      {/* ── MODAL EMAIL ──────────────────────────────────────────────────────── */}
      {showEmailModal && (
        <div onClick={() => setShowEmailModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(4px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: surf, border: `1px solid ${bord}`, borderRadius: 16, padding: "24px 28px", width: 320, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{emailMode === "signin" ? t.modalSignin : t.modalSignup}</div>
              <button onClick={() => setShowEmailModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 16 }}>✕</button>
            </div>
            {authError   && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "8px 10px", fontSize: 11, color: "#b91c1c" }}>⚠️ {authError}</div>}
            {authSuccess && <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "8px 10px", fontSize: 11, color: "#15803d" }}>✓ {authSuccess}</div>}
            <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="email" placeholder="nom@domaine.com" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 9, padding: "9px 12px", fontSize: 12, color: txt, outline: "none" }} />
              <input type="password" placeholder="••••••••••" value={password} onChange={e => setPassword(e.target.value)} required
                style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 9, padding: "9px 12px", fontSize: 12, color: txt, outline: "none" }} />
              <button type="submit" style={{ background: acc, color: "#fff", border: "none", borderRadius: 9, padding: "10px 0", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                {emailMode === "signin" ? t.submitSignin : t.submitSignup}
              </button>
            </form>
            <button onClick={() => { setEmailMode(emailMode === "signin" ? "signup" : "signin"); setAuthError(null); setAuthSuccess(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 11, textDecoration: "underline" }}>
              {emailMode === "signin" ? t.switchToSignup : t.switchToSignin}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #c4bfb8; border-radius: 4px; }
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns"] { grid-template-columns: 1fr !important; }
          aside { display: none !important; }
        }
      `}</style>
    </div>
  );
}