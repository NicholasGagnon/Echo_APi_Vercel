"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Lang = "fr" | "en";

const T = {
  fr: {
    tagline: "Ne vous faites pas avoir. Achetez intelligemment.",
    sub1: "Le vrai visage d'un produit, en quelques secondes.",
    sub2: "Collez un lien Web et découvrez ce qu'il vaut vraiment.",
    placeholder: "https://www.amazon.ca/... ou walmart.ca/...",
    analyse: "Analyser",
    analysing: "Analyser…",
    loading: "Recherche en cours, peut prendre quelques secondes…",
    empty: "Colle un lien produit ci-dessus",
    pos: "5 Points Forts Réels",
    neg: "5 Pires Défauts Cachés",
    amazon: "Trouver sur Amazon",
    amzBiz: "Offres du Jour Amazon",
    amzAffiliate: "Produit recommandé",
    chatPh: "Pose une question sur ce produit…",
    chatWelcome: "Analyse terminée pour",
    chatWelcome2: ". Pose-moi une question.",
    chatErr: "Erreur de connexion.",
    donTitle: "Soutenir le projet",
    donDesc: "Cet outil est gratuit. Si il t'a sauvé d'un mauvais achat, un petit geste est bienvenu.",
    donBtn: "Faire un don ▼",
    donClose: "Fermer ▲",
    accountTitle: "Mon compte Echo",
    google: "Google",
    microsoft: "Microsoft",
    signin: "Se connecter",
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
    dark: "☾",
    light: "☀",
    footer: "© Anti-Bullshit Reviews",
    errPrefix: "Erreur",
  },
  en: {
    tagline: "Don't Be Fooled. Buy Smart.",
    sub1: "The real face of a product, in seconds.",
    sub2: "Paste a web link and discover what it's really worth.",
    placeholder: "https://www.amazon.ca/... or walmart.ca/...",
    analyse: "Analyze",
    analysing: "Analyzing…",
    loading: "Search in progress, may take a few seconds…",
    empty: "Paste a product link above",
    pos: "5 Real Strengths",
    neg: "5 Hidden Flaws",
    amazon: "Find on Amazon",
    amzBiz: "Amazon Daily Deals",
    amzAffiliate: "Recommended product",
    chatPh: "Ask a question about this product…",
    chatWelcome: "Analysis done for",
    chatWelcome2: ". Ask me anything.",
    chatErr: "Connection error.",
    donTitle: "Support the project",
    donDesc: "This tool is free. If it saved you from a bad purchase, a small contribution is welcome.",
    donBtn: "Donate ▼",
    donClose: "Close ▲",
    accountTitle: "My Echo Account",
    google: "Google",
    microsoft: "Microsoft",
    signin: "Sign in",
    signup: "Create account",
    connected: "Connected",
    myAccount: "My account",
    logout: "Sign out",
    modalSignin: "🛸 Sign In",
    modalSignup: "🛸 Create Account",
    switchToSignup: "No account? Create one",
    switchToSignin: "Already have an account? Sign in",
    submitSignin: "Sign in",
    submitSignup: "Create my account",
    dark: "☾",
    light: "☀",
    footer: "© Anti-Bullshit Reviews",
    errPrefix: "Error",
  },
};

const DONATION_PLANS = [
  { name: "Avantage",  nameEn: "Advantage", amount: "$5.99",  plan: "basic",   desc: "Un café offert",        descEn: "Buy me a coffee" },
  { name: "Premium",   nameEn: "Premium",   amount: "$9.99",  plan: "premium", desc: "Soutien réel",          descEn: "Real support" },
  { name: "Ultra",     nameEn: "Ultra",     amount: "$19.99", plan: "ultra",   desc: "Généreux 💛",           descEn: "Generous 💛" },
  { name: "Fondateur", nameEn: "Founder",   amount: "$99",    plan: "founder", desc: "Tu crois en nous",      descEn: "You believe in us" },
];

interface AnalysisResults {
  productName: string;
  positives: string[];
  negatives: string[];
}

interface ChatMessage { sender: "user" | "ia"; text: string; }

export default function AvisPage() {
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState<Lang>("fr");
  const [showLang, setShowLang] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [donOpen, setDonOpen] = useState(false);
  const [donLoading, setDonLoading] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailMode, setEmailMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const t = T[lang];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUser(data.user); });
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const api = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true); setError(null); setResults(null); setChatMessages([]);
    try {
      const res = await fetch(`${api}/api/analyse-avis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), lang }),
      });
      if (!res.ok) throw new Error(`${t.errPrefix} ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const name = data.product_name || "Produit";
      setResults({
        productName: name,
        positives: Array.isArray(data.positives) ? data.positives.slice(0, 5) : [],
        negatives: Array.isArray(data.negatives) ? data.negatives.slice(0, 5) : [],
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
          message: lang === "fr"
            ? `Question sur "${results.productName}" : "${q}". Points forts : ${results.positives.join(", ")}. Défauts : ${results.negatives.join(", ")}. Réponds en français, de façon directe et courte.`
            : `Question about "${results.productName}": "${q}". Strengths: ${results.positives.join(", ")}. Flaws: ${results.negatives.join(", ")}. Answer in English, directly and concisely.`,
          userTier: "connected_free",
          history: [],
        }),
      });
      const data = await res.json();
      setChatMessages(p => [...p, { sender: "ia", text: data.response || t.chatErr }]);
    } catch {
      setChatMessages(p => [...p, { sender: "ia", text: t.chatErr }]);
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
        body: JSON.stringify({ plan, userId: user?.id || "guest_don", userEmail: user?.email || "don@echosai.ca", currency: "CAD" }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { alert("Erreur Stripe, réessaie."); }
    finally { setDonLoading(null); }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/avis`, scopes: "openid profile email", queryParams: { prompt: "select_account" } } });
  };
  const handleMicrosoft = async () => {
    await supabase.auth.signInWithOAuth({ provider: "azure", options: { redirectTo: `${window.location.origin}/avis`, scopes: "openid profile email User.Read" } });
  };
  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setShowUserMenu(false); };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null); setAuthSuccess(null);
    if (emailMode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setAuthError(error.message);
      else { setShowEmailModal(false); router.push("/avis"); }
    } else {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/avis` } });
      if (error) setAuthError(error.message);
      else if (data?.user && (!data.user.identities || data.user.identities.length === 0)) setAuthError(lang === "fr" ? "Un compte avec cet e-mail existe déjà." : "An account with this email already exists.");
      else setAuthSuccess(lang === "fr" ? "Vérifiez votre boîte mail !" : "Check your inbox!");
    }
  };

  // ── TOKENS ──────────────────────────────────────────────────────────────────
  const bg    = dark ? "#1a1917" : "#f0ece4";
  const surf  = dark ? "#242220" : "#fffdf9";
  const surf2 = dark ? "#2d2b28" : "#f5f1e8";
  const bord  = dark ? "#3a3835" : "#e2ddd5";
  const txt   = dark ? "#f0ece4" : "#1a1917";
  const muted = dark ? "#8a8680" : "#7a7570";
  const acc   = "#e07b39";

  const btn = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
    width: "100%", padding: "8px 10px", border: `1px solid ${bord}`,
    borderRadius: 9, cursor: "pointer", fontSize: 11, fontWeight: 600,
    background: surf2, color: txt, transition: "border-color .2s", ...extra,
  });

  const AMAZON_GOLDBOX = "https://www.amazon.ca/-/fr/gp/goldbox?ie=UTF8&linkCode=ll2&tag=echoai-20&linkId=9642833136b9884646516fb24e8d1e73&ref_=as_li_ss_tl";
  const AMAZON_AFFILIATE = "https://amzn.to/3SJj8Gz";

  return (
    <div style={{ background: bg, color: txt, minHeight: "100dvh", fontFamily: "'Inter', system-ui, sans-serif", transition: "background .3s, color .3s" }}>

      {/* ══ LAYOUT 3 COLONNES ══════════════════════════════════════════════════ */}
      <div className="layout-grid" style={{ display: "grid", gridTemplateColumns: "190px 1fr 190px", maxWidth: 1240, margin: "0 auto", padding: "0 10px", minHeight: "100dvh" }}>

        {/* ── COL GAUCHE : les deux pubs ──────────────────────────────────────── */}
        <aside className="col-left" style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 10, paddingRight: 10 }}>
          <a href="https://echosai.ca/welcome" target="_blank" rel="noopener noreferrer"
            style={{ display: "block", borderRadius: 12, overflow: "hidden", border: `1px solid ${bord}`, flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.opacity = ".9")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            <img src="/pub.jpg" alt="Echo AI" style={{ width: "100%", display: "block" }} />
            <div style={{ background: acc, color: "#fff", textAlign: "center", fontSize: 9, fontWeight: 800, padding: "5px 0", letterSpacing: 1 }}>
              ESSAYER ECHO AI →
            </div>
          </a>

          <a href="https://echosai.ca/1/hall" target="_blank" rel="noopener noreferrer"
            style={{ display: "block", borderRadius: 12, overflow: "hidden", border: `1px solid ${bord}` }}
            onMouseEnter={e => (e.currentTarget.style.opacity = ".9")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            <img src="/affinity.jpg" alt="Affinity Hall" style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 80 }} />
            <div style={{ background: surf2, color: muted, textAlign: "center", fontSize: 9, fontWeight: 600, padding: "4px 0", letterSpacing: .8 }}>
              AFFINITY HALL →
            </div>
          </a>
        </aside>

        {/* ── CENTRE ──────────────────────────────────────────────────────────── */}
        <div className="col-centre" style={{ display: "flex", flexDirection: "column", padding: "14px 14px 10px" }}>

          {/* Accroche + barre */}
          <div style={{ marginBottom: 12 }}>
            <h1 style={{ fontWeight: 900, fontSize: 22, letterSpacing: -.5, lineHeight: 1.15, marginBottom: 3 }}>{t.tagline}</h1>
            <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: 10 }}>{t.sub1}<br />{t.sub2}</p>
            <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
              <input type="url" required value={url} onChange={e => setUrl(e.target.value)} placeholder={t.placeholder}
                style={{ flex: 1, background: surf, border: `1.5px solid ${bord}`, borderRadius: 11, padding: "9px 13px", fontSize: 12, color: txt, outline: "none", fontFamily: "monospace" }}
                onFocus={async e => {
                  e.target.style.borderColor = acc;
                  if (!url) {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text.startsWith("http")) setUrl(text);
                    } catch {}
                  }
                }}
                onBlur={e => (e.target.style.borderColor = bord)} />
              <button type="submit" disabled={loading}
                style={{ background: loading ? muted : acc, color: "#fff", border: "none", borderRadius: 11, padding: "9px 18px", fontWeight: 700, fontSize: 12, cursor: loading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
                {loading ? t.analysing : t.analyse}
              </button>
            </form>
            {error && <div style={{ marginTop: 7, padding: "7px 11px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 9, fontSize: 11, color: "#b91c1c" }}>⚠️ {error}</div>}
          </div>

          {/* ── PUBS MOBILE — visibles seulement sur mobile ──────────────────── */}
          <div className="mobile-pubs" style={{ display: "none", gap: 8, marginBottom: 10 }}>
            <a href="https://echosai.ca/welcome" target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, display: "block", borderRadius: 10, overflow: "hidden", border: `1px solid ${bord}`, textDecoration: "none" }}>
              <img src="/pub.jpg" alt="Echo AI" style={{ width: "100%", display: "block", maxHeight: 80, objectFit: "cover", objectPosition: "top" }} />
              <div style={{ background: acc, color: "#fff", textAlign: "center", fontSize: 9, fontWeight: 800, padding: "4px 0", letterSpacing: 1 }}>
                ESSAYER ECHO AI →
              </div>
            </a>
            <a href="https://echosai.ca/1/hall" target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, display: "block", borderRadius: 10, overflow: "hidden", border: `1px solid ${bord}`, textDecoration: "none" }}>
              <img src="/affinity.jpg" alt="Affinity Hall" style={{ width: "100%", display: "block", maxHeight: 80, objectFit: "cover" }} />
              <div style={{ background: surf2, color: muted, textAlign: "center", fontSize: 9, fontWeight: 600, padding: "4px 0" }}>
                AFFINITY HALL →
              </div>
            </a>
          </div>

          {/* Loader */}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0", color: muted, fontSize: 12 }}>
              <div style={{ width: 20, height: 20, border: `2px solid ${bord}`, borderTopColor: acc, borderRadius: "50%", animation: "spin .8s linear infinite", flexShrink: 0 }} />
              {t.loading}
            </div>
          )}

          {/* Résultats */}
          {results && !loading && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "7px 11px", background: surf2, borderRadius: 9, border: `1px solid ${bord}` }}>
                <span>📦</span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{results.productName}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                {/* Positifs */}
                <div style={{ background: surf, border: "1px solid #86efac", borderRadius: 11, padding: "11px 13px" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#16a34a", letterSpacing: 1, textTransform: "uppercase", marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />{t.pos}
                  </div>
                  <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                    {results.positives.map((p, i) => (
                      <li key={i} style={{ display: "flex", gap: 7, fontSize: 11, color: txt, lineHeight: 1.4 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#16a34a", background: "#dcfce7", borderRadius: 3, padding: "1px 4px", flexShrink: 0, alignSelf: "flex-start", marginTop: 1 }}>#{i+1}</span>{p}
                      </li>
                    ))}
                  </ol>
                </div>
                {/* Négatifs */}
                <div style={{ background: surf, border: "1px solid #fca5a5", borderRadius: 11, padding: "11px 13px" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#dc2626", letterSpacing: 1, textTransform: "uppercase", marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />{t.neg}
                  </div>
                  <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                    {results.negatives.map((n, i) => (
                      <li key={i} style={{ display: "flex", gap: 7, fontSize: 11, color: txt, lineHeight: 1.4 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#dc2626", background: "#fee2e2", borderRadius: 3, padding: "1px 4px", flexShrink: 0, alignSelf: "flex-start", marginTop: 1 }}>#{i+1}</span>{n}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Liens affiliés Amazon */}
              <div style={{ display: "flex", gap: 7, marginBottom: 8 }}>
                <a href={`https://www.amazon.ca/s?k=${encodeURIComponent(results.productName)}&tag=echoai-20`} target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 11px", background: surf2, border: `1px solid ${bord}`, borderRadius: 9, fontSize: 11, fontWeight: 600, color: txt, textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = acc)} onMouseLeave={e => (e.currentTarget.style.borderColor = bord)}>
                  <span>🛒 {t.amazon}</span><span style={{ color: muted }}>→</span>
                </a>
                <a href={AMAZON_GOLDBOX} target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 11px", background: surf2, border: `1px solid ${bord}`, borderRadius: 9, fontSize: 11, fontWeight: 600, color: txt, textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = acc)} onMouseLeave={e => (e.currentTarget.style.borderColor = bord)}>
                  <span>🏷 {t.amzBiz}</span><span style={{ color: muted }}>→</span>
                </a>
                <a href={AMAZON_AFFILIATE} target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 11px", background: "#fff8e1", border: "1px solid #fbbf24", borderRadius: 9, fontSize: 11, fontWeight: 600, color: "#92400e", textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = acc)} onMouseLeave={e => (e.currentTarget.style.borderColor = "#fbbf24")}>
                  <span>⭐ {t.amzAffiliate}</span><span>→</span>
                </a>
              </div>
            </div>
          )}

          {/* État vide */}
          {!results && !loading && !error && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px 0", gap: 5, color: muted }}>
              <span style={{ fontSize: 24, filter: "grayscale(1)", opacity: .4 }}>🔍</span>
              <span style={{ fontSize: 11 }}>{t.empty}</span>
            </div>
          )}

          {/* Chat */}
          {results && (
            <div style={{ background: surf, border: `1px solid ${bord}`, borderRadius: 11, padding: "11px 13px", marginTop: 2 }}>
              {chatMessages.length > 0 && (
                <div style={{ maxHeight: 120, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                  {chatMessages.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.sender === "user" ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "80%", padding: "6px 10px", borderRadius: 9, fontSize: 11, lineHeight: 1.45, background: m.sender === "user" ? acc : surf2, color: m.sender === "user" ? "#fff" : txt, border: m.sender === "ia" ? `1px solid ${bord}` : "none" }}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && <div style={{ display: "flex", gap: 4, padding: "6px 10px" }}>{[0,1,2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: muted, animation: `bounce 1s ${i*.15}s infinite` }} />)}</div>}
                  <div ref={chatEndRef} />
                </div>
              )}
              <form onSubmit={handleChat} style={{ display: "flex", gap: 6 }}>
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} disabled={chatLoading} placeholder={t.chatPh}
                  style={{ flex: 1, background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "7px 11px", fontSize: 11, color: txt, outline: "none" }} />
                <button type="submit" disabled={chatLoading || !chatInput.trim()}
                  style={{ background: acc, color: "#fff", border: "none", borderRadius: 8, padding: "7px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: chatLoading || !chatInput.trim() ? .5 : 1 }}>↵</button>
              </form>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: "auto", paddingTop: 10, fontSize: 10, color: muted, opacity: .5, textAlign: "center" }}>{t.footer} · {t.loading.split(",")[1]?.trim() || "GPT-4o Search"}</div>
        </div>

        {/* ── COL DROITE : contrôles + don + connexion ─────────────────────── */}
        <aside className="col-right" style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 8, paddingLeft: 10 }}>

          {/* Rangée dark + langue */}
          <div style={{ display: "flex", gap: 6 }}>
            {/* Dark toggle */}
            <button onClick={() => setDark(d => !d)}
              style={{ flex: "none", background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 13, color: muted, fontWeight: 700 }}>
              {dark ? t.light : t.dark}
            </button>

            {/* Lang dropdown */}
            <div style={{ position: "relative", flex: 1 }}>
              <button onClick={() => setShowLang(v => !v)}
                style={{ width: "100%", background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 11, color: txt, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{lang === "fr" ? "🇫🇷 FR" : "🇬🇧 EN"}</span>
                <span style={{ fontSize: 8, opacity: .6 }}>{showLang ? "▲" : "▼"}</span>
              </button>
              {showLang && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, left: 0, background: surf, border: `1px solid ${bord}`, borderRadius: 9, overflow: "hidden", zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,.12)" }}>
                  {(["fr", "en"] as Lang[]).map(l => (
                    <button key={l} onClick={() => { setLang(l); setShowLang(false); }}
                      style={{ width: "100%", padding: "8px 12px", fontSize: 11, background: lang === l ? surf2 : "transparent", color: lang === l ? acc : txt, border: "none", cursor: "pointer", fontWeight: lang === l ? 700 : 500, textAlign: "left", display: "flex", alignItems: "center", gap: 6 }}>
                      {l === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Indicateur connecté */}
          {user && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowUserMenu(v => !v)}
                style={{ width: "100%", background: "#16a34a", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 11, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#86efac", display: "inline-block" }} />
                {t.connected}
                <span style={{ marginLeft: "auto", fontSize: 8, opacity: .7 }}>{showUserMenu ? "▲" : "▼"}</span>
              </button>
              {showUserMenu && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: surf, border: `1px solid ${bord}`, borderRadius: 9, overflow: "hidden", zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,.12)" }}>
                  <a href="/account" style={{ display: "block", padding: "8px 12px", fontSize: 11, color: txt, textDecoration: "none", fontWeight: 600, borderBottom: `1px solid ${bord}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = surf2)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    👤 {t.myAccount}
                  </a>
                  <button onClick={handleLogout} style={{ width: "100%", display: "block", padding: "8px 12px", fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600, textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget.style.background = surf2)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    ↩ {t.logout}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* DON */}
          <div style={{ background: surf, border: `1px solid ${bord}`, borderRadius: 11, overflow: "hidden" }}>
            <div style={{ padding: "10px 12px 8px" }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 3 }}>☕ {t.donTitle}</div>
              <div style={{ fontSize: 10, color: muted, lineHeight: 1.4, marginBottom: 8 }}>{t.donDesc}</div>
              <button onClick={() => setDonOpen(d => !d)}
                style={{ width: "100%", background: acc, color: "#fff", border: "none", borderRadius: 8, padding: "7px 0", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                {donOpen ? t.donClose : t.donBtn}
              </button>
            </div>
            {donOpen && (
              <div style={{ borderTop: `1px solid ${bord}`, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
                {DONATION_PLANS.map(d => (
                  <button key={d.plan} onClick={() => handleDon(d.plan)} disabled={donLoading === d.plan}
                    style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 7, padding: "6px 9px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: donLoading === d.plan ? .6 : 1, color: txt }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = acc)} onMouseLeave={e => (e.currentTarget.style.borderColor = bord)}>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>{lang === "fr" ? d.name : d.nameEn}</div>
                      <div style={{ fontSize: 9, color: muted }}>{lang === "fr" ? d.desc : d.descEn}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: acc }}>{d.amount}</div>
                  </button>
                ))}
                <div style={{ fontSize: 9, color: muted, textAlign: "center" }}>🔒 Stripe</div>
              </div>
            )}
          </div>

          {/* CONNEXION */}
          {!user && (
            <div style={{ background: surf, border: `1px solid ${bord}`, borderRadius: 11, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 1 }}>{t.accountTitle}</div>
              <button onClick={handleGoogle} style={{ ...btn({ background: "#fff", border: "1px solid #e5e7eb", color: "#374151" }) }}>
                <svg width="13" height="13" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.18 2.18 5.94l3.66 2.84c.87-2.6 3.3-4.4 6.16-4.4z" fill="#EA4335"/></svg>
                {t.google}
              </button>
              <button onClick={handleMicrosoft} style={{ ...btn({ background: dark ? "#2d2b28" : "#1a1917", border: "none", color: "#fff" }) }}>
                <svg width="13" height="13" viewBox="0 0 23 23" fill="none"><path d="M0 0H11V11H0V0Z" fill="#F25022"/><path d="M12 0H23V11H12V0Z" fill="#7FBA00"/><path d="M0 12H11V23H0V12Z" fill="#00A4EF"/><path d="M12 12H23V23H12V12Z" fill="#FFB900"/></svg>
                {t.microsoft}
              </button>
              <button onClick={() => { setEmailMode("signin"); setAuthError(null); setAuthSuccess(null); setShowEmailModal(true); }}
                style={{ ...btn({ background: "#0ea5e9", border: "none", color: "#fff" }) }}>
                ✉ {t.signin}
              </button>
              <button onClick={() => { setEmailMode("signup"); setAuthError(null); setAuthSuccess(null); setShowEmailModal(true); }}
                style={{ ...btn() }}>
                ✦ {t.signup}
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* ── BARRE MOBILE FIXÉE EN BAS ──────────────────────────────────────── */}
      <div className="mobile-bar" style={{ "--surf": dark ? "#242220" : "#fffdf9", "--bord": dark ? "#3a3835" : "#e2ddd5" } as React.CSSProperties}>
        {/* Dark toggle */}
        <button onClick={() => setDark(d => !d)}
          style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "7px 11px", fontSize: 13, color: muted, fontWeight: 700, cursor: "pointer" }}>
          {dark ? t.light : t.dark}
        </button>

        {/* Lang */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowLang(v => !v)}
            style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "7px 11px", fontSize: 11, color: txt, fontWeight: 700, cursor: "pointer" }}>
            {lang === "fr" ? "🇫🇷 FR" : "🇬🇧 EN"} {showLang ? "▲" : "▼"}
          </button>
          {showLang && (
            <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, background: surf, border: `1px solid ${bord}`, borderRadius: 9, overflow: "hidden", zIndex: 200, boxShadow: "0 -4px 16px rgba(0,0,0,.12)", minWidth: 130 }}>
              {(["fr", "en"] as Lang[]).map(l => (
                <button key={l} onClick={() => { setLang(l); setShowLang(false); }}
                  style={{ width: "100%", padding: "9px 13px", fontSize: 12, background: lang === l ? surf2 : "transparent", color: lang === l ? acc : txt, border: "none", cursor: "pointer", fontWeight: lang === l ? 700 : 500, textAlign: "left", display: "flex", gap: 8 }}>
                  {l === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Don rapide */}
        <button onClick={() => setDonOpen(d => !d)}
          style={{ background: acc, color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          ☕
        </button>

        {/* Don dropdown mobile */}
        {donOpen && (
          <div style={{ position: "fixed", bottom: 60, left: 14, right: 14, background: surf, border: `1px solid ${bord}`, borderRadius: 12, padding: "12px", zIndex: 300, boxShadow: "0 -4px 24px rgba(0,0,0,.15)" }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              ☕ {t.donTitle}
              <button onClick={() => setDonOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 14 }}>✕</button>
            </div>
            {DONATION_PLANS.map(d => (
              <button key={d.plan} onClick={() => handleDon(d.plan)} disabled={donLoading === d.plan}
                style={{ width: "100%", background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "8px 10px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, color: txt, opacity: donLoading === d.plan ? .6 : 1 }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{lang === "fr" ? d.name : d.nameEn}</div>
                  <div style={{ fontSize: 10, color: muted }}>{lang === "fr" ? d.desc : d.descEn}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: acc }}>{d.amount}</div>
              </button>
            ))}
            <div style={{ fontSize: 10, color: muted, textAlign: "center" }}>🔒 Stripe</div>
          </div>
        )}

        {/* Connexion / compte */}
        {user ? (
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowUserMenu(v => !v)}
              style={{ background: "#16a34a", border: "none", borderRadius: 8, padding: "7px 11px", fontSize: 11, color: "#fff", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#86efac", display: "inline-block" }} />
              {t.connected}
            </button>
            {showUserMenu && (
              <div style={{ position: "absolute", bottom: "calc(100% + 6px)", right: 0, background: surf, border: `1px solid ${bord}`, borderRadius: 9, overflow: "hidden", zIndex: 200, minWidth: 150, boxShadow: "0 -4px 16px rgba(0,0,0,.12)" }}>
                <a href="/account" style={{ display: "block", padding: "9px 13px", fontSize: 12, color: txt, textDecoration: "none", fontWeight: 600, borderBottom: `1px solid ${bord}` }}>👤 {t.myAccount}</a>
                <button onClick={handleLogout} style={{ width: "100%", padding: "9px 13px", fontSize: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600, textAlign: "left" }}>↩ {t.logout}</button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => { setEmailMode("signin"); setAuthError(null); setAuthSuccess(null); setShowEmailModal(true); }}
            style={{ background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            {t.signin}
          </button>
        )}
      </div>

      {/* ── MODAL EMAIL ─────────────────────────────────────────────────────── */}
      {showEmailModal && (
        <div onClick={() => setShowEmailModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(4px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: surf, border: `1px solid ${bord}`, borderRadius: 16, padding: "22px 26px", width: 300, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{emailMode === "signin" ? t.modalSignin : t.modalSignup}</div>
              <button onClick={() => setShowEmailModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 16 }}>✕</button>
            </div>
            {authError   && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "7px 10px", fontSize: 11, color: "#b91c1c" }}>⚠️ {authError}</div>}
            {authSuccess && <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "7px 10px", fontSize: 11, color: "#15803d" }}>✓ {authSuccess}</div>}
            <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <input type="email" placeholder="nom@domaine.com" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "8px 11px", fontSize: 12, color: txt, outline: "none" }} />
              <input type="password" placeholder="••••••••••" value={password} onChange={e => setPassword(e.target.value)} required
                style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "8px 11px", fontSize: 12, color: txt, outline: "none" }} />
              <button type="submit" style={{ background: acc, color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                {emailMode === "signin" ? t.submitSignin : t.submitSignup}
              </button>
            </form>
            <button onClick={() => { setEmailMode(emailMode === "signin" ? "signup" : "signin"); setAuthError(null); setAuthSuccess(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 10, textDecoration: "underline" }}>
              {emailMode === "signin" ? t.switchToSignup : t.switchToSignin}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #c4bfb8; border-radius: 3px; }

        /* ── MOBILE ──────────────────────────────────────────────────────── */
        @media (max-width: 768px) {
          .layout-grid { grid-template-columns: 1fr !important; }
          .col-left  { display: none !important; }
          .col-right { display: none !important; }
          .col-centre { padding: 12px 14px 80px !important; }

          /* Barre de contrôles mobile fixée en bas */
          .mobile-bar {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-bar { display: none !important; }
        }
        @media (max-width: 768px) {
          .mobile-pubs { display: flex !important; }
        }

        .mobile-bar {
          position: fixed; bottom: 0; left: 0; right: 0;
          display: none;
          background: var(--surf, #fffdf9);
          border-top: 1px solid var(--bord, #e2ddd5);
          padding: 8px 14px 12px;
          gap: 8px;
          z-index: 50;
          align-items: center;
          justify-content: space-between;
        }
      `}</style>
    </div>
  );
}