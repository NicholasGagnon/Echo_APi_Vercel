"use client";

import Link from "next/link";
import { useApp } from "../../context/AppContext";
import LangDropdown from "../components/LangDropdown";

export default function ConversionPage() {
  const { t, lang, theme, toggleTheme } = useApp();

  // Dictionnaire bilingue pour l'explication de l'écosystème
  const ecosystemFeatures = [
    { fr: "📉 Flux Financier & Budget", en: "📈 Financial Flow & Budget" },
    { fr: "📅 Calendrier & Événements", en: "📅 Calendar & Events" },
    { fr: "🍏 Suivi Nutrition & Santé", en: "🍏 Nutrition & Health Tracking" },
    { fr: "📚 Écriture de Livre", en: "📚 Book Writing" },
    { fr: "✅ Boutons comportementaux", en: "✅ Behavioral Buttons" },
    { fr: "🎯 Crazy WebSearch", en: "🎯 Crazy WebSearch" },
    { fr: "💬 Dialogue actif en continu", en: "💬 Continuous Active Dialogue" },
  ];

  const labels = {
    fr: {
      title: "Connectez-vous à Echo",
      subtitle: "Un écosystème intelligent conçu pour gérer l'essentiel :",
      footer: "Tout est synchronisé.",
      backHome: "Accéder à l'accueil",
      googleLogin: "Se connecter avec Google",
      githubLogin: "Se connecter avec GitHub",
      emailPlaceholder: "Votre adresse email",
      emailLogin: "Continuer avec l'email",
    },
    en: {
      title: "Connect to Echo",
      subtitle: "An intelligent ecosystem designed to manage the essentials:",
      footer: "Everything is synchronized.",
      backHome: "Access Home Page",
      googleLogin: "Sign in with Google",
      githubLogin: "Sign in with GitHub",
      emailPlaceholder: "Your email address",
      emailLogin: "Continue with email",
    },
  };

  const currentLabels = labels[lang === "fr" ? "fr" : "en"];

  return (
    <main className="h-screen w-full bg-white dark:bg-black text-black dark:text-white flex flex-col justify-between relative font-sans overflow-hidden transition-colors duration-200 selection:bg-cyan-500/30">
      
      {/* HEADER CONTROLS (Changement de langue et thème identique à Home) */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
        <LangDropdown />
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-cyan-500 hover:border-cyan-500/50 transition-all text-xs"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      {/* BACKGROUND EFFECTS & PARTICLES WOW */}
      <div className="absolute inset-0 pointer-events-none isolate">
        {/* Halo lumineux cyberpunk cyan en arrière-plan */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-cyan-500/10 dark:bg-cyan-500/5 blur-[80px] sm:blur-[120px]" />
        
        {/* Lignes lasers cyberpunk décoratives */}
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent dark:via-cyan-500/10" />
        <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent dark:via-cyan-500/5" />
      </div>

      {/* CONTENU PRINCIPAL DE LA PAGE */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 max-w-6xl w-full mx-auto px-4 sm:px-6 z-10 py-12">
        
        {/* BLOC DE GAUCHE : L'ECHO FLOTTANT LUMINEUX & SON ÉCOSYSTÈME */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-md">
          {/* Avatar flottant avec lueur pulsante ultra high-tech */}
          <div className="echo-idle relative group mb-6 shrink-0">
            <div className="absolute -inset-1 rounded-full bg-cyan-500/30 dark:bg-cyan-500/40 blur-md group-hover:bg-cyan-400/50 transition duration-500" />
            <img
              src="/Echo.png"
              alt="Echo Core Floating"
              className="w-48 h-48 sm:w-56 sm:h-56 object-cover rounded-full border-2 border-cyan-400 dark:border-cyan-500 relative shadow-[0_0_30px_rgba(6,182,212,0.3)] bg-black"
            />
          </div>

          {/* Présentation de l'écosystème */}
          <h2 className="text-xl sm:text-2xl font-black font-mono tracking-wide uppercase text-cyan-600 dark:text-cyan-400 mb-4">
            ECHO ECOSYSTEM
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4 font-medium">
            {currentLabels.subtitle}
          </p>
          
          <ul className="flex flex-col gap-2.5 text-left text-zinc-800 dark:text-zinc-200 text-[14px] font-medium pl-1 sm:pl-0">
            {ecosystemFeatures.map((feat, i) => (
              <li key={i} className="flex items-center gap-2 transform transition-transform hover:translate-x-1 duration-200">
                <span className="text-cyan-500 font-mono">•</span>
                {lang === "fr" ? feat.fr : feat.en}
              </li>
            ))}
          </ul>
          
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mt-6 font-bold">
            ⚡ {currentLabels.footer}
          </p>
        </div>

        {/* BLOC DE DROITE : LES BOUTONS DE CONNEXION (Style "Bulle" cohérent avec account) */}
        <div className="w-full max-w-sm flex flex-col gap-4">
          
          {/* Bulle Connectez-vous S.V.P */}
          <div className="bg-zinc-50/80 dark:bg-zinc-950/40 backdrop-blur-md border-2 border-zinc-200 dark:border-zinc-900 rounded-2xl p-6 shadow-xl text-center">
            <h1 className="text-lg font-black tracking-wide uppercase text-zinc-800 dark:text-white mb-6">
              {currentLabels.title}
            </h1>
            
            {/* Tous les boutons de connexion formatés de la même façon */}
            <div className="flex flex-col gap-3">
              {/* Google OAuth Button */}
              <button className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-cyan-400 text-zinc-700 dark:text-zinc-300 hover:text-cyan-600 dark:hover:text-cyan-400 font-bold text-xs uppercase tracking-wider bg-white dark:bg-zinc-900 flex items-center justify-center gap-3 transition-all duration-200 shadow-sm hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                <span className="text-base">🌐</span>
                {currentLabels.googleLogin}
              </button>

              {/* GitHub OAuth Button */}
              <button className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-cyan-400 text-zinc-700 dark:text-zinc-300 hover:text-cyan-600 dark:hover:text-cyan-400 font-bold text-xs uppercase tracking-wider bg-white dark:bg-zinc-900 flex items-center justify-center gap-3 transition-all duration-200 shadow-sm hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                <span className="text-base">💻</span>
                {currentLabels.githubLogin}
              </button>

              <div className="flex items-center my-2 text-zinc-300 dark:text-zinc-800">
                <div className="flex-1 h-px bg-current" />
                <span className="px-3 text-[10px] uppercase font-mono tracking-widest font-bold text-zinc-400 dark:text-zinc-600">OR</span>
                <div className="flex-1 h-px bg-current" />
              </div>

              {/* Input Email Magique */}
              <input
                type="email"
                placeholder={currentLabels.emailPlaceholder}
                className="w-full h-11 px-4 rounded-xl bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-500 transition-colors input-neon-cyan"
              />

              {/* Continuer avec l'email button */}
              <button className="w-full h-11 px-5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md btn-glow-cyan">
                {currentLabels.emailLogin}
              </button>
            </div>
          </div>

          {/* Bulle d'accès à l'accueil (Le seul élément cliquable vers /home) */}
          <Link
            href="/"
            className="w-full h-12 rounded-2xl border-2 border-zinc-200 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/20 backdrop-blur-md text-zinc-600 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-400 dark:hover:border-cyan-500 font-extrabold text-xs tracking-widest uppercase flex items-center justify-center transition-all duration-300 shadow-md group hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]"
          >
            <span className="transform group-hover:-translate-x-1 transition-transform duration-200 mr-2">➔</span>
            {currentLabels.backHome}
          </Link>

        </div>
      </div>

      {/* FOOTER DISCRET BRANDING */}
      <div className="w-full text-center py-4 text-[10px] font-mono tracking-widest text-zinc-400 dark:text-zinc-600 z-10 shrink-0 border-t border-zinc-100 dark:border-zinc-950 bg-zinc-50/30 dark:bg-zinc-950/10">
        ECHO SYSTEM CORE HUB v4 // CREATED FOR NICHOLAS
      </div>
    </main>
  );
}