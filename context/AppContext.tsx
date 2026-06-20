"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../app/lib/supabase";
import { loadQuotasFromSupabase } from "../utils/quota";

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
  chat: { placeholder: string; send: string };
  settings: {
    title: string;
    lightMode: string;
    darkMode: string;
    tutorial: string;
    lang: string;
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
      home:     "🏢 Accueil",
      chat:     "💬 Clavarder",
      books:    "📚 Livres",
      calendar: "📅 Calendrier",
      vitality: "📈 Vitalité",
      services: "💎 Services",
      account:  "👤 Compte",
      history:  "⭐ Historique",
    },
    chat: { placeholder: "Parle à Echo...", send: "🚀 ENVOYER" },
    settings: {
      title:     "Paramètres",
      lightMode: "☀️ Mode Clair",
      darkMode:  "🌙 Mode Sombre",
      tutorial:  "📖 Rejouer le Tutoriel",
      lang:      "Langue",
    },
    tutorial: {
      title:  "Configuration d'Echo",
      text1:  "Voici vos modes comportementaux. Sans aucun bouton activé, vous faites face à la personnalité brute, authentique et profonde d'Echo. (Le Double Regard vous permet d'en combiner deux).",
      text2:  "Cliquez ici sur l'icône de Paramètres pour ajuster la langue, alterner entre le mode clair et sombre, ou relancer ce guide à tout moment !",
      next:   "Suivant ➔",
      finish: "C'est parti ! 🚀",
    },
  },
  en: {
    sidebar: {
      home:     "🏢 Home",
      chat:     "💬 Chat",
      books:    "📚 Books",
      calendar: "📅 Calendar",
      vitality: "📈 Vitality",
      services: "💎 Services",
      account:  "👤 Account",
      history:  "⭐ History",
    },
    chat: { placeholder: "Talk to Echo...", send: "🚀 SEND" },
    settings: {
      title:     "Settings",
      lightMode: "☀️ Light Mode",
      darkMode:  "🌙 Dark Mode",
      tutorial:  "📖 Replay Tutorial",
      lang:      "Language",
    },
    tutorial: {
      title:  "Echo Configuration",
      text1:  "Here are your behavioral modes. With no button active, you face Echo's raw, authentic, deep personality. (Double Regard lets you combine two).",
      text2:  "Click here on the Settings icon to adjust language, switch between light and dark mode, or replay this guide anytime!",
      next:   "Next ➔",
      finish: "Let's go! 🚀",
    },
  },
};

type LangType      = "fr" | "en";
type ThemeType     = "dark" | "light";
type UserTierType  = "connected_free" | "basic" | "premium" | "ultra" | "founder";

interface QuotaNotification {
  type: "error" | "warning" | "info";
  message: string;
}

type AppContextType = {
  lang:         LangType;
  setLang:      (lang: LangType) => void;
  toggleLang:   () => void;
  theme:        ThemeType;
  toggleTheme:  () => void;
  t:            typeof translations.fr;
  userTier:     UserTierType;
  setUserTier:  (tier: UserTierType) => void;
  triggerToast: (type: "error" | "warning" | "info", message: string) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang,     setLangState]    = useState<LangType>("fr");
  const [theme,    setThemeState]   = useState<ThemeType>("dark");
  const [userTier, setUserTierState] = useState<UserTierType>("connected_free");
  const [notification, setNotification] = useState<QuotaNotification | null>(null);

  const applyTheme = (target: ThemeType) => {
    if (typeof window === "undefined") return;
    const root = window.document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(target);
  };

  const normalizeTier = (raw: string): UserTierType => {
    const cleaned = (raw || "").toLowerCase().trim();
    if (cleaned === "free") return "connected_free";
    const valid: UserTierType[] = ["connected_free", "basic", "premium", "ultra", "founder"];
    return valid.includes(cleaned as UserTierType) ? (cleaned as UserTierType) : "connected_free";
  };

  const fetchAndSyncTier = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_tier")
        .eq("id", userId)
        .single();
      if (profile?.user_tier) {
        setUserTierState(normalizeTier(profile.user_tier));
      }
    } catch (err) {
      console.error("Erreur sync forfait :", err);
    }

    loadQuotasFromSupabase(userId).catch(err =>
      console.warn("Quota sync non-critique :", err)
    );
  };

  useEffect(() => {
    const handleQuotaNotif = (e: Event) => {
      const customEvent = e as CustomEvent<QuotaNotification>;
      if (customEvent.detail) {
        setNotification({
          type: customEvent.detail.type,
          message: customEvent.detail.message,
        });
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("echo-quota-notification", handleQuotaNotif);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("echo-quota-notification", handleQuotaNotif);
      }
    };
  }, []);

  // Fermeture automatique des notifications après 5 secondes
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const savedLang  = localStorage.getItem("echo-lang")  as LangType  | null;
    const savedTheme = localStorage.getItem("echo-theme") as ThemeType | null;

    if (savedLang) setLangState(savedLang);

    const activeTheme = savedTheme ?? "dark";
    setThemeState(activeTheme);
    applyTheme(activeTheme);

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) fetchAndSyncTier(data.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchAndSyncTier(session.user.id);
      } else {
        setUserTierState("connected_free");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // ── LANGUE ────────────────────────────────────────────────────────────────────
  const setLang = (newLang: LangType) => {
    setLangState(newLang);
    localStorage.setItem("echo-lang", newLang);
  };

  const toggleLang = () => setLang(lang === "fr" ? "en" : "fr");

  // ── THÈME ─────────────────────────────────────────────────────────────────────
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    localStorage.setItem("echo-theme", next);
    applyTheme(next);
  };

  // ── TIER ──────────────────────────────────────────────────────────────────────
  const setUserTier = (newTier: UserTierType) => setUserTierState(newTier);

  // Permet de déclencher un toast programmatiquement
  const triggerToast = (type: "error" | "warning" | "info", message: string) => {
    setNotification({ type, message });
  };

  const t = translations[lang];

  return (
    <AppContext.Provider value={{ lang, setLang, toggleLang, theme, toggleTheme, t, userTier, setUserTier, triggerToast }}>
      {children}
      
      {/* TOAST SYSTEM GLOBAL D'ECHO */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-[9999] max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl transition-all
            ${theme === "dark" 
              ? "bg-zinc-950/80 border-zinc-800 text-zinc-200" 
              : "bg-white/90 border-zinc-200 text-zinc-800"
            }`}
          >
            {/* Icône dynamique en fonction du type */}
            <div className="flex-shrink-0 mt-0.5">
              {notification.type === "error" && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/10 text-red-500">❌</span>
              )}
              {notification.type === "warning" && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/10 text-amber-500">⚠️</span>
              )}
              {notification.type === "info" && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400">⚡</span>
              )}
            </div>

            {/* Corps du message */}
            <div className="flex-1 space-y-1">
              <p className="text-[11px] font-bold font-mono tracking-wider uppercase opacity-45">
                System Status — {notification.type}
              </p>
              <p className="text-xs leading-relaxed font-medium">
                {notification.message}
              </p>
            </div>

            {/* Bouton de fermeture */}
            <button 
              onClick={() => setNotification(null)}
              className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 text-[10px] transition-colors p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp doit être utilisé dans un AppProvider");
  return context;
};