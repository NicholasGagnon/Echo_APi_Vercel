"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "./lib/supabase";

type Lang = "fr" | "en";

// ── NAV EN TUILES — texte seulement, pas d'emoji ──
const NAV_TILES: { labelFr: string; labelEn: string; href: string; locked?: boolean }[] = [
  { labelFr: "Accueil",              labelEn: "Home",             href: "/" },
  { labelFr: "Tous les outils",      labelEn: "All tools",        href: "/dashboard" },
  { labelFr: "Créer un projet",      labelEn: "Create project",   href: "/form" },
  { labelFr: "Explorer les projets", labelEn: "Explore projects", href: "/fiche" },
  { labelFr: "Avis de la communauté",labelEn: "Community feedback", href: "/talk" },
  { labelFr: "Audition de site web", labelEn: "Website audit",    href: "/audit" },
  { labelFr: "Avis de l'IA",         labelEn: "AI feedback",      href: "/idea" },
  { labelFr: "Mon compte",           labelEn: "My account",       href: "/account" },
];

const T = {
  fr: {
    welcome: "BIENVENUE",
    title: "AFFINITÉ\nDE PROJETS",
    tagline1: "Votre projet n'a pas besoin de tout faire seul.",
    tagline2: "Découvrez des façons de montrer votre projet.",

    startLabel: "Vous pouvez commencer par",
    formBannerTitle: "Commencer la continuité de votre projet.",
    formBannerDesc: "Remplissez votre formulaire en quelques minutes.",

    findTitle: "Trouvez les bonnes personnes",
    findSub: "Ensuite vous aurez la possibilité de publier",
    talkCardTitle: "Talk",
    talkCardDesc: "Obtenez l'avis rapide de la communauté sur votre message et votre idée.",
    ficheCardTitle: "Fiches",
    ficheCardDesc: "Présentez votre projet aux personnes qui veulent vraiment collaborer.",

    aiLabel: "Vous pouvez aussi le faire analyser par l'IA",
    aiBannerDesc: "Une analyse honnête de votre idée en quelques secondes.",

    bureauTitle: "Votre Bureau",
    bureauIntro: "Vous avez accès à un espace représentant votre Bureau Personnel.",
    bureauSub: "Vous y trouverez :",
    bureauItems: [
      { icon: "🏅", label: "Vos badges",         desc: "Ton niveau actuel — Bronze, Argent, Or ou VIP — selon ton implication réelle." },
      { icon: "📄", label: "Vos fiches",          desc: "Toutes les fiches que vous avez créées, réunies au même endroit." },
      { icon: "📊", label: "Vos statistiques Talk", desc: "Ce que la communauté pense vraiment de vos projets." },
      { icon: "🔓", label: "Contacts débloqués",  desc: "Les personnes que vous avez contactées après avoir payé ou reçu une clé." },
      { icon: "🤝", label: "Intérêts envoyés",    desc: "Les projets pour lesquels vous avez manifesté de l'intérêt." },
      { icon: "💌", label: "Intérêts reçus",      desc: "Who s'intéresse à vos projets en ce moment." },
    ],

    badgesTitle: "Les badges",
    badgesSub: "Les badges représentent votre participation sur la plateforme.",
    badgeLabels: { bronze: "Bronze", argent: "Argent", or: "Or", vip: "VIP" },

    cta: "Créer ma fiche",
    footer: "© 2026 Echo AI · Affinité de Projets",
  },
  en: {
    welcome: "WELCOME",
    title: "PROJECT\nAFFINITY",
    tagline1: "Your project doesn't need to do everything alone.",
    tagline2: "Discover ways to showcase your project.",

    startLabel: "You can start with",
    formBannerTitle: "Start your project's continuity.",
    formBannerDesc: "Fill out your form in a few minutes.",

    findTitle: "Find the right people",
    findSub: "Then you'll be able to publish it on",
    talkCardTitle: "Talk",
    talkCardDesc: "Get quick community feedback on your message and idea.",
    ficheCardTitle: "Listings",
    ficheCardDesc: "Present your project to people who genuinely want to collaborate.",

    aiLabel: "You can also have it analyzed by AI",
    aiBannerDesc: "An honest analysis of your idea in a few seconds.",

    bureauTitle: "Your Desk",
    bureauIntro: "You have access to a space representing your Personal Desk.",
    bureauSub: "You'll find there:",
    bureauItems: [
      { icon: "🏅", label: "Your badges",       desc: "Your current tier — Bronze, Silver, Gold or VIP — based on your real involvement." },
      { icon: "📄", label: "Your listings",     desc: "All the listings you've created, gathered in one place." },
      { icon: "📊", label: "Your Talk stats",   desc: "What the community really thinks of your projects." },
      { icon: "🔓", label: "Unlocked contacts", desc: "The people you've reached after paying or receiving a key." },
      { icon: "🤝", label: "Interests sent",    desc: "The projects you've expressed interest in." },
      { icon: "💌", label: "Interests received",desc: "Who's interested in your projects right now." },
    ],

    badgesTitle: "Badges",
    badgesSub: "Badges represent your participation on the platform.",
    badgeLabels: { bronze: "Bronze", argent: "Silver", or: "Gold", vip: "VIP" },

    cta: "Create my listing",
    footer: "© 2026 Echo AI · Project Affinity",
  },
};

export default function HallPage() {
  const [lang, setLang] = useState<Lang>("fr");
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [pseudo, setPseudo] = useState<string>("");
  const [pseudoInput, setPseudoInput] = useState<string>("");
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const t = T[lang];

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("username").eq("id", uid).maybeSingle();
    setPseudo(data?.username || "");
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) { setUser(data.user); loadProfile(data.user.id); } });
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id); else setPseudo("");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const savePseudo = async () => {
    const clean = pseudoInput.trim();
    if (!clean || !user) return;
    await supabase.from("profiles").upsert({ id: user.id, username: clean, updated_at: new Date().toISOString() });
    setPseudo(clean);
  };

  // REDIRECTION FORCÉE ET EXPLICITE VERS LE FORMULAIRE (/form) APRES CONNEXION
  const handleGoogle = async () => {
    const redirectUrl = `${window.location.origin}/form`;
    await supabase.auth.signInWithOAuth({ 
      provider: "google", 
      options: { 
        redirectTo: redirectUrl, 
        scopes: "openid profile email", 
        queryParams: { prompt: "select_account" } 
      } 
    });
  };

  const handleMicrosoft = async () => {
    const redirectUrl = `${window.location.origin}/form`;
    await supabase.auth.signInWithOAuth({ 
      provider: "azure", 
      options: { 
        redirectTo: redirectUrl, 
        scopes: "openid profile email User.Read" 
      } 
    });
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setPseudo(""); setShowUserMenu(false); };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const accent = "#00c8ff";
  const gold   = "#c9a84c";

  return (
    <div style={{ background: "#050505", color: "#e8e8e8", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", overflowX: "hidden" }}>

      {/* ── NAV EN TUILES (texte seulement) ─────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: scrolled ? "rgba(5,5,5,.97)" : "rgba(5,5,5,.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,.06)",
        padding: "12px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
      }}>
        {/* ZONE 1 — logo + onglets */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <Link href="/" style={{ fontWeight: 800, fontSize: 14, letterSpacing: 1, color: "#fff", textDecoration: "none", flexShrink: 0 }}>Echo AI</Link>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {NAV_TILES.map(tile => {
              const isActive = tile.href === "/";
              const isLocked = !!tile.locked;
              const tileContent = (
                <div style={{
                  position: "relative",
                  padding: "6px 12px", borderRadius: 8,
                  background: isActive ? "rgba(0,200,255,.12)" : "rgba(255,255,255,.03)",
                  border: `1px solid ${isActive ? "rgba(0,200,255,.4)" : "rgba(255,255,255,.08)"}`,
                  transition: "all .2s", cursor: isLocked ? "not-allowed" : "pointer",
                  opacity: isLocked ? .55 : 1,
                }}
                  onMouseEnter={e => { if (!isActive && !isLocked) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.07)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.18)"; } }}
                  onMouseLeave={e => { if (!isActive && !isLocked) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.03)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.08)"; } }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? "#7fe8ff" : "rgba(255,255,255,.65)", whiteSpace: "nowrap" }}>
                    {isLocked && "🔒 "}{lang === "fr" ? tile.labelFr : tile.labelEn}
                  </span>
                  {isLocked && (
                    <div className="lockTooltip" style={{
                      position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
                      background: "#111", border: "1px solid rgba(255,255,255,.15)", borderRadius: 6, padding: "4px 10px",
                      fontSize: 10, color: "#fff", whiteSpace: "nowrap", opacity: 0, pointerEvents: "none",
                      transition: "opacity .15s", zIndex: 50,
                    }}>
                      {lang === "fr" ? "🚧 En construction" : "🚧 Under construction"}
                    </div>
                  )}
                </div>
              );
              return isLocked ? (
                <div key={tile.href} className="lockedTileWrap" style={{ position: "relative" }}>{tileContent}</div>
              ) : (
                <Link key={tile.href} href={tile.href} style={{ textDecoration: "none" }}>{tileContent}</Link>
              );
            })}
          </div>
        </div>

        {/* SÉPARATEUR + ZONE 2 */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,.12)", flexShrink: 0 }} />

          <div className="bureauLockedWrap" style={{ position: "relative" }}>
            <button
              onClick={() => {}}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(201,168,76,.08)", border: "1px solid rgba(201,168,76,.25)",
                borderRadius: 8, padding: "6px 12px", cursor: "not-allowed", opacity: .65,
              }}>
              <span style={{ fontSize: 12 }}>🔒</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: gold, whiteSpace: "nowrap" }}>
                {lang === "fr" ? "Mon Bureau" : "My Desk"}
              </span>
            </button>
            <div className="lockTooltip" style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              background: "#111", border: "1px solid rgba(255,255,255,.15)", borderRadius: 6, padding: "4px 10px",
              fontSize: 10, color: "#fff", whiteSpace: "nowrap", opacity: 0, pointerEvents: "none",
              transition: "opacity .15s", zIndex: 50,
            }}>
              {lang === "fr" ? "🚧 En construction" : "🚧 Under construction"}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowLangMenu(v => !v)}
                style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "6px 10px", fontSize: 11, color: "rgba(255,255,255,.6)", cursor: "pointer", fontWeight: 700 }}>
                {lang === "fr" ? "FR" : "EN"}
              </button>
              {showLangMenu && (
                <>
                  <div onClick={() => setShowLangMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#111", border: "1px solid rgba(255,255,255,.15)", borderRadius: 10, overflow: "hidden", zIndex: 100, minWidth: 110 }}>
                    {(["fr","en"] as Lang[]).map(l => (
                      <button key={l} onClick={() => { setLang(l); setShowLangMenu(false); }}
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 11, background: lang === l ? "rgba(0,200,255,.1)" : "transparent", color: lang === l ? "#7fe8ff" : "rgba(255,255,255,.7)", border: "none", cursor: "pointer", fontWeight: lang === l ? 700 : 500 }}>
                        {l === "fr" ? "Français" : "English"}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {user ? (
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowUserMenu(v => !v)}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,200,255,.1)", border: "1px solid rgba(0,200,255,.3)", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d3ee", display: "inline-block" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#7fe8ff" }}>{pseudo || (lang === "fr" ? "Choisir un pseudo" : "Choose nickname")}</span>
                </button>
                {showUserMenu && (
                  <>
                    <div onClick={() => setShowUserMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
                    <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#111", border: "1px solid rgba(255,255,255,.15)", borderRadius: 10, padding: 12, zIndex: 100, minWidth: 220 }}>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginBottom: 8, wordBreak: "break-all" }}>{user.email}</div>
                      {!pseudo && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                          <input type="text" value={pseudoInput} onChange={e => setPseudoInput(e.target.value.replace(/[^a-zA-Z0-9_\s-]/g, ""))}
                            placeholder={lang === "fr" ? "Ton pseudo" : "Your nickname"}
                            style={{ background: "#000", border: "1px solid rgba(255,255,255,.15)", borderRadius: 6, padding: "6px 10px", fontSize: 11, color: "#fff", outline: "none" }} />
                          <button onClick={savePseudo} style={{ background: accent, color: "#000", border: "none", borderRadius: 6, padding: "6px 0", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                            {lang === "fr" ? "Valider" : "Save"}
                          </button>
                        </div>
                      )}
                      <button onClick={handleLogout} style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "#f87171", fontSize: 11, cursor: "pointer", padding: "4px 0" }}>
                        ↩ {lang === "fr" ? "Se déconnecter" : "Sign out"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button onClick={() => setShowAuthPopup(true)}
                style={{ background: accent, color: "#000", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                {lang === "fr" ? "Se connecter" : "Sign in"}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px 60px", position: "relative", textAlign: "center" }}>
        <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translate(-50%, 0)", width: 600, height: 500, background: "radial-gradient(circle, rgba(0,200,255,.07) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 6, color: accent, marginBottom: 24, opacity: .8 }}>
          {t.welcome}
        </div>

        <div style={{ width: 380, height: 380, margin: "0 auto 36px", position: "relative" }}>
          <img src="/affinity.jpg" alt="Affinité de Projets"
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%", opacity: .92, border: `1px solid rgba(0,200,255,.25)`, boxShadow: "0 0 60px rgba(0,200,255,.18)" }} />
        </div>

        <h1 style={{ fontSize: "clamp(42px, 8vw, 96px)", fontWeight: 900, lineHeight: .95, letterSpacing: -2, color: "#fff", marginBottom: 28, whiteSpace: "pre-line" }}>
          {lang === "fr" ? <>AFFINITÉ<br/><span style={{color: "#7fe8ff"}}>DE PROJETS</span></> : <>PROJECT<br/><span style={{color: "#7fe8ff"}}>AFFINITY</span></>}
        </h1>

        <p style={{ fontSize: 18, color: "rgba(255,255,255,.75)", fontWeight: 300, marginBottom: 6 }}>{t.tagline1}</p>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,.5)" }}>{t.tagline2}</p>
      </section>

      {/* ── COMMENCER PAR — bannière formulaire ──────────────────────────────── */}
      <section style={{ padding: "20px 24px 70px", maxWidth: 800, margin: "0 auto" }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,.4)", textTransform: "uppercase", textAlign: "center", marginBottom: 20 }}>
          {t.startLabel}
        </p>
        <Link href="/form" style={{ textDecoration: "none" }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(0,200,255,.16), rgba(0,128,255,.06))",
            border: "1px solid rgba(0,200,255,.4)", borderRadius: 20, padding: "32px 36px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap",
            transition: "all .25s", cursor: "pointer",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 40px rgba(0,200,255,.25)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{t.formBannerTitle}</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,.6)" }}>{t.formBannerDesc}</p>
            </div>
            <span style={{ fontSize: 28, color: accent }}>→</span>
          </div>
        </Link>
      </section>

      <div style={{ height: 1, background: "linear-gradient(to right, transparent, rgba(255,255,255,.08), transparent)", margin: "0 40px" }} />

      {/* ── TROUVEZ LES BONNES PERSONNES ────────────────────────────────────── */}
      <section style={{ padding: "70px 24px", maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 900, color: "#fff", marginBottom: 8, textAlign: "center", letterSpacing: -0.5 }}>
          {t.findTitle}
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,.5)", textAlign: "center", marginBottom: 32 }}>{t.findSub}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          <Link href="/talk" style={{ textDecoration: "none" }}>
            <div style={{
              background: "linear-gradient(150deg, rgba(0,220,255,.22), rgba(0,180,255,.08))",
              border: "1px solid rgba(0,220,255,.5)", borderRadius: 24, padding: 36, height: "100%",
              minHeight: 180, display: "flex", flexDirection: "column", justifyContent: "center",
              transition: "all .25s", cursor: "pointer",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-5px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 10px 50px rgba(0,220,255,.3)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
              <h3 style={{ fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 10 }}>{t.talkCardTitle}</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,.75)", lineHeight: 1.6 }}>{t.talkCardDesc}</p>
            </div>
          </Link>

          <Link href="/fiche" style={{ textDecoration: "none" }}>
            <div style={{
              background: "linear-gradient(150deg, rgba(255,200,80,.2), rgba(255,180,60,.07))",
              border: "1px solid rgba(255,200,80,.5)", borderRadius: 24, padding: 36, height: "100%",
              minHeight: 180, display: "flex", flexDirection: "column", justifyContent: "center",
              transition: "all .25s", cursor: "pointer",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-5px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 10px 50px rgba(255,200,80,.3)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
              <h3 style={{ fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 10 }}>{t.ficheCardTitle}</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,.75)", lineHeight: 1.6 }}>{t.ficheCardDesc}</p>
            </div>
          </Link>
        </div>
      </section>

      {/* ── ANALYSE IA ──────────────────────────────────────────────────────── */}
      <section style={{ padding: "20px 24px 70px", maxWidth: 800, margin: "0 auto" }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,.4)", textTransform: "uppercase", textAlign: "center", marginBottom: 20 }}>
          {t.aiLabel}
        </p>
        <a href="/idea" style={{ textDecoration: "none" }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(167,139,250,.18), rgba(139,92,246,.06))",
            border: "1px solid rgba(167,139,250,.4)", borderRadius: 20, padding: "32px 36px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap",
            transition: "all .25s", cursor: "pointer",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 40px rgba(167,139,250,.25)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,.8)", fontWeight: 500 }}>{t.aiBannerDesc}</p>
            <span style={{ fontSize: 28, color: "#a78bfa" }}>→</span>
          </div>
        </a>
      </section>

      <div style={{ height: 1, background: "linear-gradient(to right, transparent, rgba(255,255,255,.08), transparent)", margin: "0 40px" }} />

      {/* ── VOTRE BUREAU ────────────────────────────────────────────────────── */}
      <div style={{ background: "rgba(255,255,255,.02)", position: "relative" }}>
        <section style={{ padding: "80px 24px", maxWidth: 1000, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, color: "#fff", marginBottom: 14, letterSpacing: -0.5 }}>{t.bureauTitle}</h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.65)", marginBottom: 4, maxWidth: 500, margin: "0 auto 4px" }}>{t.bureauIntro}</p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginBottom: 36 }}>{t.bureauSub}</p>

          <div style={{
            background: "rgba(34,211,153,.04)", border: "1px solid rgba(34,211,153,.4)",
            borderRadius: 28, padding: 24, boxShadow: "inset 0 1px 0 rgba(255,255,255,.04), 0 20px 60px rgba(34,211,153,.08)",
          }}>
            <div className="bureau-grid" style={{ display: "grid", gap: 14 }}>
              {t.bureauItems.map((item, i) => (
                <div key={i} style={{
                  background: "linear-gradient(150deg, rgba(0,200,255,.06), rgba(255,255,255,.02))",
                  border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, padding: 22, textAlign: "left",
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{item.label}</div>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.5)", lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div style={{ height: 1, background: "linear-gradient(to right, transparent, rgba(255,255,255,.08), transparent)", margin: "0 40px" }} />

      {/* ── LES BADGES ──────────────────────────────────────────────────────── */}
      <section style={{ padding: "70px 24px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 900, color: "#fff", marginBottom: 12, letterSpacing: -0.5 }}>{t.badgesTitle}</h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 32 }}>{t.badgesSub}</p>
        <div style={{
          background: "rgba(255,215,0,.04)", border: "1px solid rgba(255,215,0,.4)",
          borderRadius: 28, padding: 24, boxShadow: "inset 0 1px 0 rgba(255,255,255,.04), 0 20px 60px rgba(255,215,0,.08)",
          maxWidth: 700, margin: "0 auto",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
            {(["bronze", "argent", "or", "vip"] as const).map(tier => (
              <div key={tier} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 20 }}>
                <img src={`/${tier}.png`} alt={t.badgeLabels[tier]} style={{ width: 100, height: 100, objectFit: "contain", margin: "0 auto 10px" }} />
                <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{t.badgeLabels[tier]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────────────── */}
      <section style={{ padding: "50px 24px 90px", textAlign: "center" }}>
        <button
          onClick={() => user ? window.location.href = "/form" : setShowAuthPopup(true)}
          style={{ display: "inline-block", background: `linear-gradient(135deg, ${accent}, #0080ff)`, color: "#000", fontWeight: 800, fontSize: 14, padding: "14px 40px", borderRadius: 12, border: "none", cursor: "pointer", letterSpacing: .5, boxShadow: `0 0 30px rgba(0,200,255,.2)`, transition: "transform .2s, box-shadow .2s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 40px rgba(0,200,255,.35)`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px rgba(0,200,255,.2)`; }}>
          {t.cta} →
        </button>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer style={{ padding: "24px 40px", borderTop: "1px solid rgba(255,255,255,.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.2)" }}>{t.footer}</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {NAV_TILES.slice(1).map(tile => (
            <Link key={tile.href} href={tile.href} style={{ fontSize: 11, color: "rgba(255,255,255,.2)", textDecoration: "none" }}>
              {lang === "fr" ? tile.labelFr : tile.labelEn}
            </Link>
          ))}
        </div>
      </footer>

      {/* ── POPUP AUTH ──────────────────────────────────────────────────────── */}
      {showAuthPopup && (
        <div onClick={() => setShowAuthPopup(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, backdropFilter: "blur(8px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#111", border: "1px solid rgba(0,200,255,.2)", borderRadius: 20, padding: "28px 28px 22px", width: 320, display: "flex", flexDirection: "column", gap: 14, position: "relative" }}>
            <button onClick={() => setShowAuthPopup(false)} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.4)", fontSize: 18 }}>✕</button>
            <div style={{ textAlign: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#fff", marginBottom: 4 }}>
                {lang === "fr" ? "Crée ton compte pour commencer" : "Create an account to get started"}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", lineHeight: 1.5 }}>
                {lang === "fr" ? "Gratuit · Aucune carte requise" : "Free · No card required"}
              </div>
            </div>
            <button onClick={handleGoogle}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#374151", width: "100%" }}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.18 2.18 5.94l3.66 2.84c.87-2.6 3.3-4.4 6.16-4.4z" fill="#EA4335"/></svg>
              {lang === "fr" ? "Continuer avec Google" : "Continue with Google"}
            </button>
            <button onClick={handleMicrosoft}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#1a1917", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#fff", width: "100%" }}>
              <svg width="16" height="16" viewBox="0 0 23 23" fill="none"><path d="M0 0H11V11H0V0Z" fill="#F25022"/><path d="M12 0H23V11H12V0Z" fill="#7FBA00"/><path d="M0 12H11V23H0V12Z" fill="#00A4EF"/><path d="M12 12H23V23H12V12Z" fill="#FFB900"/></svg>
              {lang === "fr" ? "Continuer avec Microsoft" : "Continue with Microsoft"}
            </button>
            {/* REDIRIGE DESORMAIS VERS /form AU LIEU DE /account POUR AVOIR L'ECRAN EMAIL DEBUTANT LE QUESTIONNAIRE */}
            <a href="/form"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", background: "rgba(0,200,255,.1)", border: "1px solid rgba(0,200,255,.25)", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#00c8ff", width: "100%", textDecoration: "none" }}>
              ✉ {lang === "fr" ? "Se connecter par email" : "Sign in with email"}
            </a>
          </div>
        </div>
      )}

      <style>{`
        .bureau-grid { grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 820px) { .bureau-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 520px) { .bureau-grid { grid-template-columns: 1fr; } }
        .lockedTileWrap:hover .lockTooltip { opacity: 1 !important; }
        .bureauLockedWrap:hover .lockTooltip { opacity: 1 !important; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }
      `}</style>
    </div>
  );
}