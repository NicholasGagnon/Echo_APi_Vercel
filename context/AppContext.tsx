"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../app/lib/supabase"; 

export const translations: Record<"fr" | "en", {
  sidebar: {
    home: string;
    chat: string;
    books: string;
    calendar: string;
    vitality: string;
    services: string;
    account: string;
    history: string;
  };
  chat: { placeholder: string; send: string; };
  settings: {
    title: string;
    lightMode: string;
    darkMode: string;
    tutorial: string;
  };
  tutorial: {
    title: string;
    text1: string;
    text2: string;
    next: string;
    finish: string;
  };
}> = {
  fr: {
    sidebar: { 
      home: "🏢 Accueil",
      chat: "💬 Clavarder",
      books: "📚 Livres",
      calendar: "📅 Calendrier",
      vitality: "📈 Vitalité",
      services: "💎 Services",
      account: "👤 Compte",
      history: "⭐ Historique"
    },
    chat: { placeholder: "Parle à Echo...", send: "🚀 ENVOYER" },
    settings: {
      title: "Paramètres",
      lightMode: "☀️ Mode Clair",
      darkMode: "🌙 Mode Sombre",
      tutorial: "📖 Rejouer le Tutoriel",
    },
    tutorial: {
      title: "Configuration d'Echo",
      text1: "Voici vos modes comportementaux. Sans aucun bouton activé, vous faites face à la personnalité brute, authentique et profonde d'Echo. (Le Double Regard vous permet d'en combiner deux).",
      text2: "Cliquez ici sur l'icône de Paramètres pour ajuster la langue, alterner entre le mode clair et sombre, ou relancer ce guide à tout moment !",
      next: "Suivant ➔",
      finish: "C'est parti ! 🚀",
    },
  },
  en: {
    sidebar: { 
      home: "🏢 Home",
      chat: "💬 Chat",
      books: "📚 Books",
      calendar: "📅 Calendar",
      vitality: "📈 Vitality",
      services: "Services",
      account: "👤 Account",
      history: "⭐ History"
    },
    chat: { placeholder: "Talk to Echo...", send: "🚀 SEND" },
    settings: {
      title: "Settings",
      lightMode: "☀️ Light Mode",
      darkMode: "🌙 Dark Mode",
      tutorial: "📖 Replay Tutorial",
    },
    tutorial: {
      title: "Echo Configuration",
      text1: "Here are your behavioral modes. With no button active, you face Echo's raw, authentic, deep personality. (Double Regard lets you combine two).",
      text2: "Click here on the Settings icon to adjust language, switch between light and dark mode, or replay this guide anytime!",
      next: "Next ➔",
      finish: "Let's go! 🚀",
    },
  },
};

type LangType = "fr" | "en";
type ThemeType = "dark" | "light";

// ── EXTINCTION FINALE DE "free" ET REMPLACEMENT PAR "connected_free" ──
type UserTierType = "connected_free" | "basic" | "premium" | "ultra" | "founder";

type AppContextType = {
  lang: LangType;
  setLang: (lang: LangType) => void;
  theme: ThemeType;
  toggleTheme: () => void;
  t: typeof translations.fr; 
  userTier: UserTierType;     
  setUserTier: (tier: UserTierType) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<LangType>("fr");
  const [theme, setThemeState] = useState<ThemeType>("dark");
  const [userTier, setUserTierState] = useState<UserTierType>("connected_free"); 

  const applyTheme = (targetTheme: ThemeType) => {
    if (typeof window === "undefined") return;
    const root = window.document.documentElement;
    if (targetTheme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
  };

  const fetchAndSyncTier = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_tier")
        .eq("id", userId)
        .single();
      
      if (profile?.user_tier) {
        const cleaned = profile.user_tier.toLowerCase().trim();
        // Interception fluide si la BDD renvoie encore l'ancien nom de forfait
        const normalized = cleaned === "free" ? "connected_free" : cleaned;
        setUserTierState(normalized as UserTierType);
      }
    } catch (err) {
      console.error("Erreur de synchronisation du forfait global :", err);
    }
  };

  useEffect(() => {
    const savedLang = localStorage.getItem("echo-lang") as LangType;
    const savedTheme = localStorage.getItem("echo-theme") as ThemeType;
    
    if (savedLang) setLangState(savedLang);
    
    if (savedTheme) {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme("dark");
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        fetchAndSyncTier(data.user.id);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        fetchAndSyncTier(session.user.id);
      } else {
        setUserTierState("connected_free"); 
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const setLang = (newLang: LangType) => {
    setLangState(newLang);
    localStorage.setItem("echo-lang", newLang);
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setThemeState(newTheme);
    localStorage.setItem("echo-theme", newTheme);
    applyTheme(newTheme);
  };

  const setUserTier = (newTier: UserTierType) => {
    setUserTierState(newTier);
  };

  const t = translations[lang];

  return (
    <AppContext.Provider value={{ lang, setLang, theme, toggleTheme, t, userTier, setUserTier }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp doit être utilisé dans un AppProvider");
  return context;
};