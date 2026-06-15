"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../app/lib/supabase"; 

export const translations: Record<"fr" | "en", {
  sidebar: {
    home: string;
    chat: string;
    notes: string;
    calendar: string;
    vitality: string;
    services: string;
    account: string;
    history: string;
  };
  chat: { placeholder: string; send: string; };
}> = {
  fr: {
    sidebar: { 
      home: "🏢 Accueil", 
      chat: "💬 Clavarder", 
      notes: "📝 Notes",
      calendar: "📅 Calendrier",
      vitality: "📈 Vitalité",
      services: "💎 Services",
      account: "👤 Compte",
      history: "⭐ Historique"
    },
    chat: { placeholder: "Parle à Echo...", send: "🚀 ENVOYER" },
  },
  en: {
    sidebar: { 
      home: "🏢 Home", 
      chat: "💬 Chat", 
      notes: "📝 Notes",
      calendar: "📅 Calendar",
      vitality: "📈 Vitality",
      services: "Services",
      account: "👤 Account",
      history: "⭐ History"
    },
    chat: { placeholder: "Talk to Echo...", send: "🚀 SEND" },
  },
};

type LangType = "fr" | "en";
type ThemeType = "dark" | "light";
type UserTierType = "free" | "basic" | "premium" | "ultra" | "founder";

type AppContextType = {
  lang: LangType;
  setLang: (lang: LangType) => void;
  theme: ThemeType;
  toggleTheme: () => void;
  t: typeof translations.fr; 
  userTier: UserTierType;     
  setUserTier: (tier: UserTierType) => void; // ⚡ AJOUTÉ : Le type du setter est maintenant exposé !
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<LangType>("fr");
  const [theme, setThemeState] = useState<ThemeType>("dark");
  const [userTier, setUserTierState] = useState<UserTierType>("free"); 

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
        setUserTierState(profile.user_tier.toLowerCase().trim() as UserTierType);
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
        setUserTierState("free"); 
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

  // ⚡ AJOUTÉ : La fonction pour permettre à n'importe quelle page de modifier le forfait globalement
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