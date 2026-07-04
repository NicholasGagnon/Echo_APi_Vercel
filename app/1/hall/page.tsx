"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

type Lang = "fr" | "en";

const T = {
  fr: {
    nav: ["Hall", "Dashboard", "Conversation", "Formulaire", "Fiches", "Compte"],
    navHref: ["/1/hall", "/1/dashboard", "/1/conversation", "/1/formulaire", "/1/fiches", "/account"],
    welcome: "BIENVENUE",
    title: "AFFINITÉ\nDE PROJETS",
    tagline: "Votre projet n'a pas besoin de tout faire seul.",
    sub: "Bienvenue dans Affinité de Projets, cet espace existe pour aider les fondateurs de projets à trouver quelqu'un avec qui s'associer.",
    btn1: "Explorer les projets",
    btn1sub: "Parcourir les fiches compatibles",
    btn2: "Mon Bureau",
    btn2sub: "Votre espace privé",
    btn3: "Dashboard",
    btn3sub: "Tous vos outils réunis",
    howTitle: "Comment fonctionne Affinité de Projets ?",
    steps: [
      { n: "01", title: "Créez votre fiches", desc: "Décrivez votre projet en quelques lignes. Votre fiche devient votre identité sur la plateforme." },
      { n: "02", title: "Décrivez votre projet", desc: "Secteur, compétences recherchées, stade d'avancement. Soyez précis pour attirer les bons profils." },
      { n: "03", title: "Découvrez les projets compatibles", desc: "Explorez les fiches d'autres fondateurs. Filtrez par affinité, secteur ou besoin." },
      { n: "04", title: "Débloquez les coordonnées", desc: "Si une connexion vous intéresse, un paiement ponctuel déverrouille le contact. Pas d'abonnement." },
    ],
    footer: "© 2026 Echo AI · Affinité de Projets",
  },
  en: {
    nav: ["Hall", "Dashboard", "Conversation", "Form", "Profiles", "Account"],
    navHref: ["/1/hall", "/1/dashboard", "/1/conversation", "/1/formulaire", "/1/fiche", "/account"],
    welcome: "WELCOME",
    title: "PROJECT\nAFFINITY",
    tagline: "Your project doesn't need to do everything alone.",
    sub: "Welcome to Project Affinity, a space designed to help project founders find someone to collaborate with.",
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
  const t = T[lang];

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
        <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 1, color: "#fff" }}>Echo AI</div>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {t.nav.map((label, i) => (
            <Link key={i} href={t.navHref[i]}
              style={{ fontSize: 13, color: i === 0 ? accent : "rgba(255,255,255,.55)", textDecoration: "none", fontWeight: i === 0 ? 700 : 400, letterSpacing: .5, transition: "color .2s" }}
              onMouseEnter={e => { if (i !== 0) (e.target as HTMLElement).style.color = "#fff"; }}
              onMouseLeave={e => { if (i !== 0) (e.target as HTMLElement).style.color = "rgba(255,255,255,.55)"; }}>
              {label}
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

        {/* Glow background */}
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%, -50%)", width: 600, height: 600, background: "radial-gradient(circle, rgba(0,200,255,.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Welcome */}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 6, color: accent, marginBottom: 24, opacity: .8 }}>
          {t.welcome}
        </div>

        {/* Image affinity */}
        <div style={{ width: 220, height: 220, marginBottom: 32, position: "relative" }}>
          <img src="/affinity.jpg" alt="Affinité de Projets"
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%", opacity: .9, border: `1px solid rgba(0,200,255,.2)`, boxShadow: "0 0 40px rgba(0,200,255,.15)" }} />
        </div>

        {/* Titre */}
        <h1 style={{ fontSize: "clamp(42px, 8vw, 96px)", fontWeight: 900, lineHeight: .95, letterSpacing: -2, color: "#fff", marginBottom: 28, whiteSpace: "pre-line" }}>
          {lang === "fr" ? <>AFFINITÉ<br/><span style={{color: "#7fe8ff"}}>DE PROJETS</span></> : <>PROJECT<br/><span style={{color: "#7fe8ff"}}>AFFINITY</span></>}
        </h1>

        {/* Tagline */}
        <p style={{ fontSize: 18, color: "rgba(255,255,255,.7)", marginBottom: 8, fontWeight: 300, maxWidth: 560 }}>
          {t.tagline}
        </p>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", marginBottom: 56, whiteSpace: "pre-line", lineHeight: 1.7, maxWidth: 480 }}>
          {t.sub}
        </p>

        {/* 3 Boutons */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 840, width: "100%" }}>

          {/* Explorer */}
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

          {/* Bureau */}
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

          {/* Dashboard */}
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

        {/* Scroll indicator */}
        <div style={{ marginTop: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: .3, animation: "bounce 2s infinite" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#fff" }}>SCROLL</div>
          <div style={{ width: 1, height: 40, background: "linear-gradient(to bottom, rgba(255,255,255,.5), transparent)" }} />
        </div>
        </div>{/* fin centre */}
        {/* Colonne droite décorative */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 120, gap: 24 }}>
          <div style={{ width: 1, flex: 1, background: "linear-gradient(to bottom, transparent, rgba(201,168,76,.15), transparent)" }} />
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(201,168,76,.3)" }} />
          <div style={{ width: 1, flex: 1, background: "linear-gradient(to bottom, transparent, rgba(201,168,76,.08), transparent)" }} />
        </div>
      </section>

      {/* ── SÉPARATEUR ───────────────────────────────────────────────────────── */}
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
              {/* Ligne de connexion */}
              {i < t.steps.length - 1 && (
                <div style={{ position: "absolute", top: 22, left: "calc(100% + 16px)", width: 32, height: 1, background: "rgba(255,255,255,.1)", display: "none" }} className="step-line" />
              )}
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

      {/* ── SÉPARATEUR ───────────────────────────────────────────────────────── */}
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
        <Link href="/1/form"
          style={{ display: "inline-block", background: `linear-gradient(135deg, ${accent}, #0080ff)`, color: "#000", fontWeight: 800, fontSize: 14, padding: "14px 36px", borderRadius: 12, textDecoration: "none", letterSpacing: .5, boxShadow: `0 0 30px rgba(0,200,255,.2)`, transition: "transform .2s, box-shadow .2s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 40px rgba(0,200,255,.35)`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px rgba(0,200,255,.2)`; }}>
          {lang === "fr" ? "Créer ma fiche →" : "Create my profile →"}
        </Link>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer style={{ padding: "24px 40px", borderTop: "1px solid rgba(255,255,255,.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.2)" }}>{t.footer}</div>
        <div style={{ display: "flex", gap: 20 }}>
          {t.nav.slice(1).map((label, i) => (
            <Link key={i} href={t.navHref[i + 1]}
              style={{ fontSize: 11, color: "rgba(255,255,255,.2)", textDecoration: "none" }}>
              {label}
            </Link>
          ))}
        </div>
      </footer>

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