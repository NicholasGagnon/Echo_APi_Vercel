"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Lang = "fr" | "en";

// NAV — les 8 onglets fixes, identiques à toutes les autres pages /1
const NAV_FR: { label: string; href: string }[] = [
  { label: "Hall",         href: "/1/hall" },
  { label: "Dashboard",    href: "/1/dashboard" },
  { label: "Conversation", href: "/1/conversation" },
  { label: "Formulaire",   href: "/1/form" },
  { label: "Fiches",       href: "/1/fiche" },
  { label: "Talk",         href: "/1/talk" },
  { label: "Bureau",       href: "/1/desktop" },
  { label: "Compte",       href: "/1/account" },
];
const NAV_EN: { label: string; href: string }[] = [
  { label: "Hall",         href: "/1/hall" },
  { label: "Dashboard",    href: "/1/dashboard" },
  { label: "Conversation", href: "/1/conversation" },
  { label: "Form",         href: "/1/form" },
  { label: "Listings",     href: "/1/fiche" },
  { label: "Talk",         href: "/1/talk" },
  { label: "Desk",         href: "/1/desktop" },
  { label: "Account",      href: "/1/account" },
];

const T = {
  fr: {
    welcome: "BIENVENUE",
    title: "AFFINITÉ\nDE PROJETS",
    tagline: "Votre projet n'a pas besoin de tout faire seul.",
    sub: "Découvrez des fondateurs, des compétences et des audiences\nqui peuvent amplifier ce que vous construisez déjà.",
    btn1: "Explorer les projets",
    btn1sub: "Parcourir les fiches compatibles",
    btn2: "Mon Bureau",
    btn2sub: "Votre espace privé",
    btn3: "Dashboard",
    btn3sub: "Tous vos outils réunis",
    howTitle: "Comment fonctionne Affinité de Projets ?",
    steps: [
      { n: "01", title: "Créez votre fiche", desc: "Décrivez votre projet en quelques lignes. Votre fiche devient votre identité sur la plateforme." },
      { n: "02", title: "Décrivez votre projet", desc: "Secteur, compétences recherchées, stade d'avancement. Soyez précis pour attirer les bons profils." },
      { n: "03", title: "Découvrez les projets compatibles", desc: "Explorez les fiches d'autres fondateurs. Filtrez par affinité, secteur ou besoin." },
      { n: "04", title: "Débloquez les coordonnées", desc: "Si une connexion vous intéresse, un paiement ponctuel déverrouille le contact. Pas d'abonnement." },
    ],
    footer: "© 2026 Echo AI · Affinité de Projets",
  },
  en: {
    welcome: "WELCOME",
    title: "PROJECT\nAFFINITY",
    tagline: "Your project doesn't need to do everything alone.",
    sub: "Discover founders, skills and audiences\nthat can amplify what you're already building.",
    btn1: "Explore Projects",
    btn1sub: "Browse compatible profiles",
    btn2: "My Desk",
    btn2sub: "Your private workspace",
    btn3: "Dashboard",
    btn3sub: "All your tools in one place",
    howTitle: "How does Project Affinity work?",
    steps: [
      { n: "01", title: "Create your profile", desc: "Describe your project in a few lines. Your profile becomes your identity on the platform." },
      { n: "02", title: "Describe your project", desc: "Sector, skills needed, stage. Be specific to attract the right people." },
      { n: "03", title: "Discover compatible projects", desc: "Browse other founders' profiles. Filter by affinity, sector or need." },
      { n: "04", title: "Unlock contact details", desc: "If a connection interests you, a one-time payment unlocks the contact. No subscription." },
    ],
    footer: "© 2026 Echo AI · Project Affinity",
  },
};

export default function HallPage() {
  const [lang, setLang] = useState<Lang>("fr");
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const t = T[lang];
  const navItems = lang === "fr" ? NAV_FR : NAV_EN;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUser(data.user); });
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/1/form`, scopes: "openid profile email", queryParams: { prompt: "select_account" } } });
  };
  const handleMicrosoft = async () => {
    await supabase.auth.signInWithOAuth({ provider: "azure", options: { redirectTo: `${window.location.origin}/1/form`, scopes: "openid profile email User.Read" } });
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const accent = "#00c8ff";
  const gold   = "#c9a84c";

  return (
    <div style={{ background: "#050505", color: "#e8e8e8", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", overflowX: "hidden" }}>

      {/* ── NAV ──────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? "rgba(5,5,5,.95)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,.06)" : "none",
        transition: "all .3s",
        padding: "0 40px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/1/hall" style={{ fontWeight: 800, fontSize: 15, letterSpacing: 1, color: "#fff", textDecoration: "none" }}>Echo AI</Link>
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          {navItems.map((item, i) => (
            <Link key={item.href} href={item.href}
              style={{ fontSize: 13, color: i === 0 ? accent : "rgba(255,255,255,.55)", textDecoration: "none", fontWeight: i === 0 ? 700 : 400, letterSpacing: .5, transition: "color .2s" }}
              onMouseEnter={e => { if (i !== 0) (e.target as HTMLElement).style.color = "#fff"; }}
              onMouseLeave={e => { if (i !== 0) (e.target as HTMLElement).style.color = "rgba(255,255,255,.55)"; }}>
              {item.label}
            </Link>
          ))}
          <button onClick={() => setLang(l => l === "fr" ? "en" : "fr")}
            style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "rgba(255,255,255,.6)", cursor: "pointer", fontWeight: 600 }}>
            {lang === "fr" ? "EN" : "FR"}
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "60px 1fr 60px", padding: "100px 0 60px", position: "relative" }}>
        {/* Colonne gauche décorative */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 120, gap: 24 }}>
          <div style={{ width: 1, flex: 1, background: "linear-gradient(to bottom, transparent, rgba(0,200,255,.15), transparent)" }} />
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(0,200,255,.3)" }} />
          <div style={{ width: 1, flex: 1, background: "linear-gradient(to bottom, transparent, rgba(0,200,255,.08), transparent)" }} />
        </div>
        {/* Centre */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>

        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%, -50%)", width: 600, height: 600, background: "radial-gradient(circle, rgba(0,200,255,.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 6, color: accent, marginBottom: 24, opacity: .8 }}>
          {t.welcome}
        </div>

        <div style={{ width: 220, height: 220, marginBottom: 32, position: "relative" }}>
          <img src="/affinity.jpg" alt="Affinité de Projets"
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%", opacity: .9, border: `1px solid rgba(0,200,255,.2)`, boxShadow: "0 0 40px rgba(0,200,255,.15)" }} />
        </div>

        <h1 style={{ fontSize: "clamp(42px, 8vw, 96px)", fontWeight: 900, lineHeight: .95, letterSpacing: -2, color: "#fff", marginBottom: 28, whiteSpace: "pre-line" }}>
          {lang === "fr" ? <>AFFINITÉ<br/><span style={{color: "#7fe8ff"}}>DE PROJETS</span></> : <>PROJECT<br/><span style={{color: "#7fe8ff"}}>AFFINITY</span></>}
        </h1>

        <p style={{ fontSize: 18, color: "rgba(255,255,255,.7)", marginBottom: 8, fontWeight: 300, maxWidth: 560 }}>
          {t.tagline}
        </p>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", marginBottom: 56, whiteSpace: "pre-line", lineHeight: 1.7, maxWidth: 480 }}>
          {t.sub}
        </p>

        {/* 3 Boutons */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 840, width: "100%" }}>

          <Link href="/1/fiche" style={{ textDecoration: "none", flex: "1 1 240px", maxWidth: 280 }}>
            <div style={{
              background: "linear-gradient(135deg, rgba(0,200,255,.12), rgba(0,200,255,.04))",
              border: "1px solid rgba(0,200,255,.25)",
              borderRadius: 16, padding: "28px 24px",
              cursor: "pointer", transition: "all .25s",
              textAlign: "left",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(0,200,255,.2), rgba(0,200,255,.08))"; (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,200,255,.5)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(0,200,255,.12), rgba(0,200,255,.04))"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,200,255,.25)"; }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{t.btn1}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", lineHeight: 1.5 }}>{t.btn1sub}</div>
              <div style={{ marginTop: 18, fontSize: 12, color: accent, fontWeight: 600 }}>Explorer →</div>
            </div>
          </Link>

          <Link href="/1/desktop" style={{ textDecoration: "none", flex: "1 1 240px", maxWidth: 280 }}>
            <div style={{
              background: "linear-gradient(135deg, rgba(201,168,76,.1), rgba(201,168,76,.03))",
              border: "1px solid rgba(201,168,76,.2)",
              borderRadius: 16, padding: "28px 24px",
              cursor: "pointer", transition: "all .25s",
              textAlign: "left",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(201,168,76,.18), rgba(201,168,76,.08))"; (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,.4)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(201,168,76,.1), rgba(201,168,76,.03))"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,.2)"; }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>🔑</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{t.btn2}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", lineHeight: 1.5 }}>{t.btn2sub}</div>
              <div style={{ marginTop: 18, fontSize: 12, color: gold, fontWeight: 600 }}>Accéder →</div>
            </div>
          </Link>

          <Link href="/1/dashboard" style={{ textDecoration: "none", flex: "1 1 240px", maxWidth: 280 }}>
            <div style={{
              background: "linear-gradient(135deg, rgba(139,92,246,.1), rgba(139,92,246,.03))",
              border: "1px solid rgba(139,92,246,.2)",
              borderRadius: 16, padding: "28px 24px",
              cursor: "pointer", transition: "all .25s",
              textAlign: "left",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(139,92,246,.18), rgba(139,92,246,.08))"; (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,.4)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(139,92,246,.1), rgba(139,92,246,.03))"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,.2)"; }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>⚡</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{t.btn3}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", lineHeight: 1.5 }}>{t.btn3sub}</div>
              <div style={{ marginTop: 18, fontSize: 12, color: "#8b5cf6", fontWeight: 600 }}>Ouvrir →</div>
            </div>
          </Link>
        </div>

        {/* CTA TALK — ferme la boucle Hall ↔ Talk */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 20 }}>
          <Link href="/1/talk" style={{ textDecoration: "none" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.55)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 20, padding: "8px 16px", transition: "all .2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,200,255,.4)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,.55)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.12)"; }}>
              🗣️ {lang === "fr" ? "Publier sur Talk" : "Post on Talk"}
            </span>
          </Link>
          <Link href="/1/talk" style={{ textDecoration: "none" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.55)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 20, padding: "8px 16px", transition: "all .2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,.4)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,.55)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.12)"; }}>
              ⭐ {lang === "fr" ? "Voir les avis Talk" : "See Talk feedback"}
            </span>
          </Link>
        </div>

        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: .3, animation: "bounce 2s infinite" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#fff" }}>SCROLL</div>
          <div style={{ width: 1, height: 40, background: "linear-gradient(to bottom, rgba(255,255,255,.5), transparent)" }} />
        </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 120, gap: 24 }}>
          <div style={{ width: 1, flex: 1, background: "linear-gradient(to bottom, transparent, rgba(201,168,76,.15), transparent)" }} />
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(201,168,76,.3)" }} />
          <div style={{ width: 1, flex: 1, background: "linear-gradient(to bottom, transparent, rgba(201,168,76,.08), transparent)" }} />
        </div>
      </section>

      <div style={{ height: 1, background: "linear-gradient(to right, transparent, rgba(255,255,255,.08), transparent)", margin: "0 40px" }} />

      {/* ── COMMENT ÇA MARCHE ────────────────────────────────────────────────── */}
      <section style={{ padding: "100px 40px", maxWidth: 960, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 5, color: accent, marginBottom: 16, opacity: .7 }}>
          PROCESSUS
        </div>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, color: "#fff", marginBottom: 64, letterSpacing: -1 }}>
          {t.howTitle}
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32 }}>
          {t.steps.map((step, i) => (
            <div key={i} style={{ position: "relative" }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: "rgba(255,255,255,.06)", lineHeight: 1, marginBottom: 16, fontVariantNumeric: "tabular-nums" }}>
                {step.n}
              </div>
              <div style={{ width: 32, height: 2, background: `linear-gradient(to right, ${accent}, transparent)`, marginBottom: 16, opacity: .5 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
                {step.title}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", lineHeight: 1.7 }}>
                {step.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ height: 1, background: "linear-gradient(to right, transparent, rgba(255,255,255,.08), transparent)", margin: "0 40px" }} />

      {/* ── CTA FINAL ────────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 40px", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 5, color: gold, marginBottom: 16, opacity: .7 }}>
          COMMENCER
        </div>
        <h2 style={{ fontSize: "clamp(24px, 3vw, 40px)", fontWeight: 900, color: "#fff", marginBottom: 12, letterSpacing: -1 }}>
          {lang === "fr" ? "Votre fiche en 2 minutes." : "Your profile in 2 minutes."}
        </h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", marginBottom: 36, maxWidth: 400, margin: "0 auto 36px" }}>
          {lang === "fr"
            ? "Créez votre présence sur la plateforme et commencez à découvrir des projets compatibles."
            : "Create your presence on the platform and start discovering compatible projects."}
        </p>
        <button
          onClick={() => user ? window.location.href = "/1/form" : setShowAuthPopup(true)}
          style={{ display: "inline-block", background: `linear-gradient(135deg, ${accent}, #0080ff)`, color: "#000", fontWeight: 800, fontSize: 14, padding: "14px 36px", borderRadius: 12, border: "none", cursor: "pointer", letterSpacing: .5, boxShadow: `0 0 30px rgba(0,200,255,.2)`, transition: "transform .2s, box-shadow .2s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 40px rgba(0,200,255,.35)`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px rgba(0,200,255,.2)`; }}>
          {lang === "fr" ? "Créer ma fiche →" : "Create my profile →"}
        </button>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer style={{ padding: "24px 40px", borderTop: "1px solid rgba(255,255,255,.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.2)" }}>{t.footer}</div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {navItems.slice(1).map(item => (
            <Link key={item.href} href={item.href}
              style={{ fontSize: 11, color: "rgba(255,255,255,.2)", textDecoration: "none" }}>
              {item.label}
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
            <a href="/1/account"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", background: "rgba(0,200,255,.1)", border: "1px solid rgba(0,200,255,.25)", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#00c8ff", width: "100%", textDecoration: "none" }}>
              ✉ {lang === "fr" ? "Se connecter par email" : "Sign in with email"}
            </a>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(6px); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }
        @media (max-width: 768px) {
          nav { padding: 0 20px; }
          nav a { display: none; }
          section { padding: 80px 20px 60px; }
        }
      `}</style>
    </div>
  );
}