"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../../context/AppContext";
import LangDropdown from "../components/LangDropdown";
import ContactModal from "../components/ContactModal";

// ── TYPES ─────────────────────────────────────────────────────────────────────
type ModalType = "support" | "contact" | null;
type Currency = "CAD" | "USD" | "EUR";

// ── PAYS / DEVISE ─────────────────────────────────────────────────────────────
const COUNTRY_OPTIONS: { code: Currency; flag: string; label_fr: string; label_en: string; symbol: string }[] = [
  { code: "CAD", flag: "🇨🇦", label_fr: "Canada (CAD)",   label_en: "Canada (CAD)",   symbol: "CA$" },
  { code: "USD", flag: "🇺🇸", label_fr: "États-Unis (USD)", label_en: "United States (USD)", symbol: "US$" },
  { code: "EUR", flag: "🇪🇺", label_fr: "Europe (EUR)",   label_en: "Europe (EUR)",   symbol: "€"   },
];

// ── PRIX PAR DEVISE ───────────────────────────────────────────────────────────
const PRICES: Record<string, Record<Currency, string>> = {
  basic:    { CAD: "CA$5.99",  USD: "US$4.49",  EUR: "€3.99"  },
  premium:  { CAD: "CA$9.99",  USD: "US$7.49",  EUR: "€6.99"  },
  ultra:    { CAD: "CA$19.99", USD: "US$14.99",  EUR: "€13.99" },
  founder:  { CAD: "CA$99",    USD: "US$74",    EUR: "€69"    },
  treasure: { CAD: "CA$11.99", USD: "US$8.99",  EUR: "€8.49"  },
};

const detectCurrency = (): Currency => {
  if (typeof window === "undefined") return "CAD";
  const loc = navigator.language?.toLowerCase() || "";
  if (
    loc.startsWith("fr-fr") || loc.startsWith("de") || loc.startsWith("es") ||
    loc.startsWith("it")    || loc.startsWith("nl") || loc.startsWith("pt-pt") ||
    loc.startsWith("pl")    || loc.startsWith("sv") || loc.startsWith("fi")
  ) return "EUR";
  if (loc.startsWith("en-us")) return "USD";
  return "CAD";
};

const localT = {
  fr: {
    features: "FONCTIONNALITÉS",
    echoAiDoIt: "ECHO IA LE FAIT POUR TOI",
    currentPlan: "PLAN ACTUEL",
    included: "✓ INCLUS",
    connecting: "Connexion...",
    upgrade: "🚀 AMÉLIORER",
    joinFounder: "👑 REJOINDRE",
    supportLocked: "🔒 Le support est réservé aux plans Basic, Premium, Ultra et Fondateur.",
    countryBtn: "🌍 Pays / Devise",
    plans: {
      connected_free: { title: "Accès libre", sub: "GRATUIT À VIE", f1: "✅ AI Standard Model", f2: "✅ Intégration Recherche Web", f3: "✅ Écrire un Livre", f4: "✅ Calendrier", f5: "✅ Vitalité", f6: "✅ Invites Comportementales Limitées", f7: "❌ Page Historique", ai1: "✅ Calendrier Echo AI Limité", ai2: "✅ Vitalité Echo AI Limité" },
      basic:          { title: "Avantage", sub: "PAR MOIS", f1: "✅ AI Enhanced Models", f2: "✅ Intégration Recherche Web", f3: "✅ Écrire un Livre", f4: "✅ Calendrier", f5: "✅ Vitalité", f6: "✅ Invites Comportementales x4", f7: "❌ Page Historique", f8: "✅ Support par Courriel", ai1: "✅ Calendrier Echo AI x4", ai2: "✅ Vitalité Echo AI x4" },
      premium:        { title: "Premium", sub: "PAR MOIS", badge: "⭐ LE PLUS POPULAIRE", f1: "✅ AI Advanced Model", f2: "✅ Intégration Recherche Web", f3: "✅ Écrire un Livre", f4: "✅ Calendrier", f4_1: "✅ Vitalité", f5: "✅ Page Historique Limitée", f6: "✅ Support par Courriel", f7: "✅ Analyse d'Image", f8: "✅ Invites Comportementales x10", ai1: "✅ Calendrier Echo AI x10", ai2: "✅ Vitalité Echo AI x10" },
      ultra:          { title: "Ultra", sub: "PAR MOIS", power: "Utilisateurs Avancés", f1: "✅ AI Pro Models", f2: "✅ Intégration Recherche Web", f3: "✅ Écrire un Livre", f4: "✅ Calendrier", f5: "✅ Vitalité", f6: "✅ Page Historique Illimitée", f7: "✅ Traitement Prioritaire", f8: "✅ Support par Courriel", f9: "✅ Analyse d'Image", f10: "✅ Invites Comportementales x30", ai1: "✅ Calendrier Echo AI x30", ai2: "✅ Vitalité Echo AI x30" },
      founder:        { title: "Fondateur", sub: "PAR MOIS", power: "Soutenir le Développement d'Echo", f1: "✅ AI Expert Model illimité", f2: "✅ Intégration Recherche Web", f3: "✅ Écrire un Livre", f4: "✅ Calendrier", f5: "✅ Vitalité", f6: "✅ Page Historique Illimitée", f7: "✅ Traitement Prioritaire", f8: "✅ Support par Courriel", f9: "✅ Analyse d'Image", f10: "✅ Capacités Avancées", f11: "✅ Invites Comportementales Illimitées", ai1: "✅ Calendrier Echo AI Illimité", ai2: "✅ Vitalité Echo AI Illimité" },
    },
  },
  en: {
    features: "FEATURES",
    echoAiDoIt: "ECHO AI DO IT FOR YOU",
    currentPlan: "CURRENT PLAN",
    included: "✓ INCLUDED",
    connecting: "Connecting...",
    upgrade: "🚀 UPGRADE",
    joinFounder: "👑 BECOME A FOUNDER",
    supportLocked: "🔒 Support is reserved for Basic, Premium, Ultra, and Founder plans.",
    countryBtn: "🌍 Country / Currency",
    plans: {
      connected_free: { title: "FreeConnect", sub: "FOREVER FREE", f1: "✅ AI Standard Model", f2: "✅ WebSearch Integration", f3: "✅ Write A Book", f4: "✅ Calendar", f5: "✅ Vitality", f6: "✅ Behavioral Prompts Limited", f7: "❌ History page", ai1: "✅ Calendar Echo AI Limited", ai2: "✅ Vitality Echo AI Limited" },
      basic:          { title: "Advantage", sub: "PER MONTH", f1: "✅ AI Enhanced Models", f2: "✅ WebSearch Integration", f3: "✅ Write A Book", f4: "✅ Calendar", f5: "✅ Vitality", f6: "✅ Behavioral Prompts x4", f7: "❌ History page", f8: "✅ Email Support", ai1: "✅ Calendar Echo AI x4", ai2: "✅ Vitality Echo AI x4" },
      premium:        { title: "Premium", sub: "PER MONTH", badge: "⭐ MOST POPULAR", f1: "✅ AI Advanced Model", f2: "✅ WebSearch Integration", f3: "✅ Write A Book", f4: "✅ Calendar", f4_1: "✅ Vitality", f5: "✅ History page limited", f6: "✅ Email Support", f7: "✅ Image Analysis", f8: "✅ Behavioral Prompts x10", ai1: "✅ Calendar Echo AI x10", ai2: "✅ Vitality Echo AI x10" },
      ultra:          { title: "Ultra", sub: "PER MONTH", power: "Power Users", f1: "✅ AI Pro Models", f2: "✅ WebSearch Integration", f3: "✅ Write A Book", f4: "✅ Calendar", f5: "✅ Vitality", f6: "✅ History page unlimited", f7: "✅ Priority Processing", f8: "✅ Email Support", f9: "✅ Image Analysis", f10: "✅ Behavioral Prompts x30", ai1: "✅ Calendar Echo AI x30", ai2: "✅ Vitality Echo AI x30" },
      founder:        { title: "Founder", sub: "PER MONTH", power: "Support Echo Development", f1: "✅ AI Expert Model unlimited", f2: "✅ WebSearch Integration", f3: "✅ Write A Book", f4: "✅ Calendar", f5: "✅ Vitality", f6: "✅ History page unlimited", f7: "✅ Priority Processing", f8: "✅ Email Support", f9: "✅ Image Analysis", f10: "✅ Advanced Capabilities", f11: "✅ Unlimited Behavioral Prompts", ai1: "✅ Calendar Echo AI unlimited", ai2: "✅ Vitality Echo AI unlimited" },
    },
  },
};

const TIER_RANK: Record<string, number> = {
  connected_free: 0, basic: 1, premium: 2, treasure: 2.5, ultra: 3, founder: 4,
};

// ── PAGE PRINCIPALE ───────────────────────────────────────────────────────────
export default function ServicesPage() {
  const { t, lang } = useApp();
  const [isLoaded, setIsLoaded]   = useState(false);
  const [user, setUser]           = useState<any>(null);
  const [userTier, setUserTier]   = useState<string>("connected_free");
  const [isLoadingCheckout, setIsLoadingCheckout] = useState<string | null>(null);
  const [activeModal, setActiveModal]             = useState<ModalType>(null);
  const [showSupportLocked, setShowSupportLocked] = useState(false);
  const [showTreasureModal, setShowTreasureModal] = useState(false);
  const [isLoadingTreasure, setIsLoadingTreasure] = useState(false);
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);

  // ── Devise / Pays ──────────────────────────────────────────────────────────
  const [currency, setCurrency]           = useState<Currency>("CAD");
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  useEffect(() => {
    setCurrency(detectCurrency());
  }, []);

  const activeT = lang === "fr" ? localT.fr : localT.en;
  const currentCountry = COUNTRY_OPTIONS.find(c => c.code === currency) || COUNTRY_OPTIONS[0];

  const fetchProfile = async (userId: string) => {
    const { data: profile } = await supabase.from("profiles").select("user_tier").eq("id", userId).single();
    if (profile?.user_tier) {
      const cleaned = profile.user_tier.toLowerCase().trim();
      setUserTier(cleaned === "free" ? "connected_free" : cleaned);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) { setUser(data.user); await fetchProfile(data.user.id); }
      setIsLoaded(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) { setUser(session.user); await fetchProfile(session.user.id); }
      else { setUser(null); setUserTier("connected_free"); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleUpgradeWithStripe = async (planName: "basic" | "premium" | "ultra" | "founder" | "treasure") => {
    if (!user) {
      if (planName === "treasure") {
        localStorage.setItem("echo-treasure-redirect", "1");
        window.location.href = "/account";
      } else {
        setShowLoginRequiredModal(true);
      }
      return;
    }
    if (planName !== "treasure" && TIER_RANK[planName] <= TIER_RANK[userTier]) return;
    if (planName === "treasure" && TIER_RANK[userTier] >= TIER_RANK["ultra"]) {
      alert(lang === "fr" ? "Tu possèdes déjà un forfait supérieur !" : "You already own a higher tier!");
      return;
    }
    try {
      if (planName === "treasure") setIsLoadingTreasure(true);
      else setIsLoadingCheckout(planName);
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planName, userId: user.id, userEmail: user.email, currency }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed");
      if (data.url) window.location.href = data.url;
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoadingCheckout(null);
      setIsLoadingTreasure(false);
    }
  };

  const handleSupportClick = () => {
    if (userTier === "connected_free") { setShowSupportLocked(true); setTimeout(() => setShowSupportLocked(false), 3500); return; }
    setActiveModal("support");
  };

  const getPlanState = (planName: string): "current" | "lower" | "upgrade" => {
    if (planName === userTier) return "current";
    if (TIER_RANK[planName] < TIER_RANK[userTier]) return "lower";
    return "upgrade";
  };

  const renderButton = (planName: "basic" | "premium" | "ultra" | "founder", upgradeLabel: string, upgradeClass: string) => {
    const state = getPlanState(planName);
    if (state === "current") return (
      <button className="mt-6 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-default w-full">
        {activeT.currentPlan}
      </button>
    );
    if (state === "lower") return (
      <button disabled className="mt-6 bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 border border-zinc-200 dark:border-zinc-800 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed opacity-40 w-full">
        {activeT.included}
      </button>
    );
    return (
      <button type="button" disabled={isLoadingCheckout !== null}
        onClick={e => { e.stopPropagation(); handleUpgradeWithStripe(planName); }}
        className={`mt-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition w-full shadow-sm ${upgradeClass}`}>
        {isLoadingCheckout === planName ? activeT.connecting : upgradeLabel}
      </button>
    );
  };

  // ── Prix affiché selon devise ──────────────────────────────────────────────
  const price = (plan: string) => PRICES[plan]?.[currency] ?? PRICES[plan]?.CAD ?? "";

  return (
    <main className="h-screen w-full bg-white dark:bg-black text-black dark:text-white flex overflow-hidden relative font-sans transition-colors duration-200 selection:bg-cyan-500/30">
      <div className="flex flex-1 h-full overflow-hidden w-full">

        {/* SIDEBAR */}
        <aside className="w-55 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-8 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between h-full overflow-y-auto">
          <div className="space-y-20">
            <h2 className="font-bold text-lg">
              <Link href="/" className="hover:text-cyan-500 dark:hover:text-cyan-400">{t.sidebar.home}</Link>
            </h2>
            <div className="space-y-20 text-zinc-800 dark:text-zinc-100 font-medium">
              <Link href="/chat"       className="block hover:text-cyan-500">{t.sidebar.chat}</Link>
              <Link href="/books"      className="block hover:text-cyan-500">{t.sidebar.books}</Link>
              <Link href="/calendar"   className="block hover:text-cyan-500">📅 {lang === "fr" ? "Calendrier" : "Calendar"}</Link>
              <Link href="/vitality"   className="block hover:text-cyan-500">📈 {lang === "fr" ? "Vitalité" : "Vitality"}</Link>
              <Link href="/services"   className="block text-cyan-600 dark:text-cyan-400 font-bold">💎 {lang === "fr" ? "Services" : "Services"}</Link>
              <Link href="/account"    className="block hover:text-cyan-500">👤 {lang === "fr" ? "Compte" : "Account"}</Link>
              <Link href="/horizonweb" className="block hover:text-cyan-500">📡 HorizonWeb</Link>
              <hr className="border-zinc-200 dark:border-zinc-800 my-4" />
              <Link href="/history"    className="block hover:text-amber-500">⭐ {lang === "fr" ? "Historique" : "History"}</Link>
            </div>
          </div>
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
            Status : <span className="text-cyan-500 dark:text-cyan-400 uppercase font-bold block">{userTier === "connected_free" ? (lang === "fr" ? "Accès libre" : "FreeConnect") : userTier}</span>
          </div>
        </aside>

        {/* CONTAINER PRINCIPAL */}
        <section className="flex-1 flex flex-col bg-white dark:bg-black transition-colors duration-200 h-full overflow-y-auto w-full">
          <div className="flex-1 p-4 sm:p-6 pt-16 flex items-center justify-center w-full shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-stretch w-full max-w-[95rem] mx-auto pb-12">

              {/* PLAN 1: CONNECTED FREE */}
              <div className={`bg-zinc-50 dark:bg-zinc-900 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 min-h-[580px] select-none ${userTier === "connected_free" ? "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20" : "border-zinc-200 dark:border-zinc-800"}`}>
                <div>
                  <h2 className="text-lg font-black mb-1">{activeT.plans.connected_free.title}</h2>
                  <div className="text-3xl font-black mb-0.5">$0</div>
                  <div className="text-zinc-400 text-[10px] mb-4 font-bold tracking-wide uppercase">{activeT.plans.connected_free.sub}</div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block mb-1">{activeT.features}</span>
                      {["f1","f2","f3","f4","f5","f6","f7"].map(k => <div key={k} className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{(activeT.plans.connected_free as any)[k]}</div>)}
                    </div>
                    <div className="space-y-1.5 pt-3.5 border-t border-zinc-200 dark:border-zinc-800">
                      <span className="text-[11px] font-bold tracking-wide uppercase block text-zinc-400 dark:text-zinc-500">{activeT.echoAiDoIt}</span>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.connected_free.ai1}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.connected_free.ai2}</div>
                    </div>
                  </div>
                </div>
                <button className="mt-6 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-default w-full">
                  {userTier === "connected_free" ? activeT.currentPlan : activeT.included}
                </button>
              </div>

              {/* PLAN 2: BASIC */}
              <div onClick={() => TIER_RANK["basic"] > TIER_RANK[userTier] && handleUpgradeWithStripe("basic")}
                className={`bg-zinc-50 dark:bg-zinc-900 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 min-h-[580px] select-none ${userTier === "basic" ? "border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20" : TIER_RANK["basic"] < TIER_RANK[userTier] ? "border-zinc-200 dark:border-zinc-800 opacity-80 cursor-default" : "border-zinc-200 dark:border-zinc-800 hover:border-cyan-500/60 hover:shadow-[0_0_25px_rgba(6,182,212,0.2)] cursor-pointer hover:scale-102"}`}>
                <div>
                  <h2 className="text-lg font-black mb-1">{activeT.plans.basic.title}</h2>
                  <div className="text-3xl font-black mb-0.5">{price("basic")}</div>
                  <div className="text-zinc-400 text-[10px] mb-4 font-bold tracking-wide uppercase">{activeT.plans.basic.sub}</div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block mb-1">{activeT.features}</span>
                      {["f1","f2","f3","f4","f5","f6","f7","f8"].map(k => <div key={k} className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{(activeT.plans.basic as any)[k]}</div>)}
                    </div>
                    <div className="space-y-1.5 pt-3.5 border-t border-zinc-200 dark:border-zinc-800">
                      <span className="text-[11px] font-bold tracking-wide uppercase block text-emerald-800 dark:text-emerald-600">{activeT.echoAiDoIt}</span>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.basic.ai1}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.basic.ai2}</div>
                    </div>
                  </div>
                </div>
                {renderButton("basic", activeT.upgrade, "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_2px_8px_rgba(6,182,212,0.2)] hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]")}
              </div>

              {/* PLAN 3: PREMIUM */}
              <div onClick={() => TIER_RANK["premium"] > TIER_RANK[userTier] && handleUpgradeWithStripe("premium")}
                className={`bg-zinc-50 dark:bg-zinc-900 border-2 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 min-h-[580px] select-none relative ${userTier === "premium" ? "border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.2)]" : TIER_RANK["premium"] < TIER_RANK[userTier] ? "border-cyan-500/80 opacity-80 cursor-default" : "border-cyan-500/80 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.35)] cursor-pointer hover:scale-102"}`}>
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap z-10">
                  <span className="bg-cyan-500 text-black px-3 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase shadow-sm">{activeT.plans.premium.badge}</span>
                </div>
                <div>
                  <h2 className="text-lg font-black mb-1 mt-1">{activeT.plans.premium.title}</h2>
                  <div className="text-3xl font-black mb-0.5">{price("premium")}</div>
                  <div className="text-zinc-400 text-[10px] mb-4 font-bold tracking-wide uppercase">{activeT.plans.premium.sub}</div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block mb-1">{activeT.features}</span>
                      {["f1","f2","f3","f4","f4_1","f5","f6","f7","f8"].map(k => <div key={k} className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{(activeT.plans.premium as any)[k]}</div>)}
                    </div>
                    <div className="space-y-1.5 pt-3.5 border-t border-zinc-200 dark:border-zinc-800">
                      <span className="text-[11px] font-bold tracking-wide uppercase block text-cyan-600 dark:text-cyan-400">{activeT.echoAiDoIt}</span>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.premium.ai1}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.premium.ai2}</div>
                    </div>
                  </div>
                </div>
                {renderButton("premium", activeT.upgrade, "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_2px_8px_rgba(6,182,212,0.2)] hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]")}
              </div>

              {/* PLAN 4: ULTRA */}
              <div onClick={() => TIER_RANK["ultra"] > TIER_RANK[userTier] && handleUpgradeWithStripe("ultra")}
                className={`bg-zinc-50 dark:bg-zinc-900 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 min-h-[580px] select-none ${userTier === "ultra" ? "border-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.15)] ring-1 ring-purple-500/20" : TIER_RANK["ultra"] < TIER_RANK[userTier] ? "border-zinc-200 dark:border-zinc-800 opacity-80 cursor-default" : "border-zinc-200 dark:border-zinc-800 hover:border-purple-500/60 hover:shadow-[0_0_30px_rgba(147,51,234,0.3)] cursor-pointer hover:scale-102"}`}>
                <div>
                  <h2 className="text-lg font-black mb-1">{activeT.plans.ultra.title}</h2>
                  <div className="text-3xl font-black mb-0.5">{price("ultra")}</div>
                  <div className="text-zinc-400 text-[10px] mb-0.5 font-bold tracking-wide uppercase">{activeT.plans.ultra.sub}</div>
                  <div className="text-zinc-400 dark:text-zinc-500 text-[9px] mb-4 italic font-mono">{activeT.plans.ultra.power}</div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block mb-1">{activeT.features}</span>
                      {["f1","f2","f3","f4","f5","f6","f7","f8","f9","f10"].map(k => <div key={k} className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{(activeT.plans.ultra as any)[k]}</div>)}
                    </div>
                    <div className="space-y-1.5 pt-3.5 border-t border-zinc-200 dark:border-zinc-800">
                      <span className="text-[11px] font-bold tracking-wide uppercase block text-purple-600 dark:text-purple-400">{activeT.echoAiDoIt}</span>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.ultra.ai1}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.ultra.ai2}</div>
                    </div>
                  </div>
                </div>
                {renderButton("ultra", activeT.upgrade, "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_2px_8px_rgba(147,51,234,0.2)] hover:shadow-[0_0_15px_rgba(147,51,234,0.5)]")}
              </div>

              {/* PLAN 5: FOUNDER */}
              <div onClick={() => TIER_RANK["founder"] > TIER_RANK[userTier] && handleUpgradeWithStripe("founder")}
                className={`bg-zinc-50 dark:bg-zinc-900 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 min-h-[580px] select-none ${userTier === "founder" ? "border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20 shadow-md" : "border-zinc-200 dark:border-zinc-800 hover:border-amber-500/60 hover:shadow-[0_0_35px_rgba(245,158,11,0.35)] cursor-pointer hover:scale-102"}`}>
                <div>
                  <h2 className="text-lg font-black mb-1 text-amber-500 dark:text-amber-400">{activeT.plans.founder.title}</h2>
                  <div className="text-3xl font-black mb-0.5">{price("founder")}</div>
                  <div className="text-zinc-400 text-[10px] mb-4 font-bold tracking-wide uppercase">{activeT.plans.founder.sub}</div>
                  <div className="text-zinc-400 dark:text-zinc-500 text-[9px] mb-4 font-mono">{activeT.plans.founder.power}</div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block mb-1">{activeT.features}</span>
                      {["f1","f2","f3","f4","f5","f6","f7","f8","f9","f10","f11"].map(k => <div key={k} className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{(activeT.plans.founder as any)[k]}</div>)}
                    </div>
                    <div className="space-y-1.5 pt-3.5 border-t border-zinc-200 dark:border-zinc-800">
                      <span className="text-[11px] font-bold tracking-wide uppercase block text-amber-500 dark:text-amber-400">{activeT.echoAiDoIt}</span>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.founder.ai1}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.founder.ai2}</div>
                    </div>
                  </div>
                </div>
                {renderButton("founder", activeT.joinFounder, "bg-amber-600 hover:bg-amber-500 text-white shadow-[0_2px_8px_rgba(245,158,11,0.2)] hover:shadow-[0_0_15px_rgba(245,158,11,0.5)]")}
              </div>

            </div>
          </div>

          {/* FOOTER */}
          <footer className="shrink-0 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50/60 dark:bg-zinc-950/60 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3 flex-wrap text-[10px] text-zinc-400 dark:text-zinc-600 transition-colors w-full">
            <div>© {new Date().getFullYear()} Echo Ecosystem. All rights reserved.</div>

            <div className="flex gap-2 flex-wrap justify-start sm:justify-end w-full sm:w-auto items-center relative">

              {/* SÉLECTEUR PAYS / DEVISE */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCountryPicker(v => !v)}
                  className="flex items-center gap-1.5 border border-zinc-300 dark:border-zinc-800 hover:border-cyan-500/50 hover:text-cyan-500 px-3 py-1.5 rounded-xl text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900/40 transition-all font-medium shadow-sm text-[11px]"
                >
                  <span>{currentCountry.flag}</span>
                  <span>{lang === "fr" ? currentCountry.label_fr : currentCountry.label_en}</span>
                  <svg className={`w-2.5 h-2.5 transition-transform ${showCountryPicker ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25 12 15.75 4.5 8.25"/>
                  </svg>
                </button>
                {showCountryPicker && (
                  <div className="absolute bottom-full mb-2 right-0 w-52 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50">
                    {COUNTRY_OPTIONS.map(opt => (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => { setCurrency(opt.code); setShowCountryPicker(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-mono font-semibold transition-colors text-left ${
                          currency === opt.code
                            ? "bg-cyan-500/10 text-cyan-500"
                            : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-800 dark:hover:text-zinc-200"
                        }`}
                      >
                        <span className="text-base">{opt.flag}</span>
                        <span>{lang === "fr" ? opt.label_fr : opt.label_en}</span>
                        {currency === opt.code && <span className="ml-auto text-cyan-500">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Toast support locked */}
              {showSupportLocked && (
                <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-[10px] text-zinc-300 whitespace-nowrap font-mono shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                  {activeT.supportLocked}
                </div>
              )}

              {/* BOUTON CONTACT */}
              <button
                type="button"
                onClick={() => setActiveModal("contact")}
                className="flex items-center gap-1.5 border border-zinc-300 dark:border-zinc-800 hover:border-cyan-500/50 hover:text-cyan-500 px-3 py-1.5 rounded-xl text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900/40 transition-all font-medium shadow-sm text-[11px]"
              >
                💡 {lang === "fr" ? "Contact & Suggestions" : "Contact & Feedback"}
              </button>

              {/* BOUTON SUPPORT */}
              <button
                type="button"
                onClick={handleSupportClick}
                className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-xl font-medium transition-all shadow-sm text-[11px] ${
                  userTier === "connected_free"
                    ? "border-zinc-200 dark:border-zinc-900 text-zinc-300 dark:text-zinc-700 bg-zinc-100 dark:bg-zinc-950/30 cursor-not-allowed opacity-60"
                    : "border-zinc-300 dark:border-zinc-800 hover:border-cyan-500/50 hover:text-cyan-500 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900/40"
                }`}
              >
                {userTier === "connected_free" ? "🔒" : "✉️"} {lang === "fr" ? "Support" : "Support"}
              </button>
            </div>
          </footer>

          {/* ESPACEURS + EASTER EGG */}
          <div className="shrink-0 w-full h-[1400px] flex items-end justify-center pb-10 px-4">
            <p className="text-zinc-300 dark:text-zinc-800 text-[10px] font-mono uppercase tracking-widest text-center select-none">{lang === "fr" ? "... continue de descendre ..." : "... keep scrolling down ..."}</p>
          </div>
          <div className="shrink-0 w-full h-[2200px] flex items-end justify-center pb-10 px-4">
            <p className="text-zinc-400 dark:text-zinc-700 text-[10px] font-mono uppercase tracking-widest text-center select-none">{lang === "fr" ? "... continue de descendre ..." : "... keep scrolling down ..."}</p>
          </div>
          <div className="shrink-0 w-full flex flex-col items-center justify-center pt-20 pb-32 gap-6">
            <p className="text-zinc-500 dark:text-zinc-700 text-[10px] font-mono uppercase tracking-widest text-center select-none">✦ MATRIX TERMINUS REACHED ✦</p>
            <button type="button" onClick={() => setShowTreasureModal(true)}
              className="w-24 h-12 opacity-5 hover:opacity-20 cursor-pointer select-none text-[16px] transition-all duration-200 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.1)]" title="...">
              💎
            </button>
          </div>
        </section>
      </div>

      {/* ── MODALS CONTACT / SUPPORT ── */}
      {activeModal && (
        <ContactModal
          type={activeModal}
          lang={lang}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* ── LOGIN REQUIRED ── */}
      {showLoginRequiredModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100000] p-6 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowLoginRequiredModal(false)}>
          <div className="bg-zinc-50 dark:bg-zinc-950 border-2 border-cyan-500/50 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center relative shadow-2xl space-y-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <img src="/echo1.png" alt="Echo" className="w-16 h-16 rounded-full object-cover mx-auto border border-cyan-500/30 shadow-md" />
            <p className="text-zinc-900 dark:text-zinc-100 font-sans text-sm font-semibold leading-relaxed">
              {lang === "fr" ? "Connecte-toi d'abord, je te garde la surprise au chaud ! 😉" : "Log in first, I'll keep the surprise warm for you! 😉"}
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/account" onClick={() => { localStorage.setItem("echo-treasure-redirect","1"); setShowLoginRequiredModal(false); }}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 font-mono text-xs font-bold rounded-xl text-white uppercase tracking-wider transition-all shadow-md text-center">
                {lang === "fr" ? "Se connecter" : "Log in"}
              </Link>
              <button onClick={() => setShowLoginRequiredModal(false)} className="w-full py-1.5 text-zinc-500 font-mono text-[11px] hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                {lang === "fr" ? "Plus tard" : "Later"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EASTER EGG TRÉSOR ── */}
      {showTreasureModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100000] p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-[0_0_50px_rgba(245,158,11,0.3)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setShowTreasureModal(false)} className="absolute top-4 right-5 text-zinc-500 hover:text-white font-mono text-lg transition-colors">✕</button>

            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-2xl animate-bounce">👑</div>

            <div className="text-center space-y-2 mt-3">
              <h3 className="text-sm font-black text-amber-400 tracking-wider font-mono uppercase">
                {lang === "fr" ? "🎉✨ ACCÈS PORTAIL SECRET ✨🎉" : "🎉✨ SECRET PORTAL ACCESSED ✨🎉"}
              </h3>
              <h4 className="text-white font-bold text-base font-mono uppercase tracking-wide">
                {lang === "fr" ? "🏆 FÉLICITATIONS !" : "🏆 CONGRATULATIONS!"}
              </h4>
              <p className="text-zinc-300 font-medium text-xs sm:text-sm bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 inline-block leading-relaxed">
                {lang === "fr"
                  ? `« Le plan Ultra à 40 % de rabais, passe de 19,99 $ à ${price("treasure")} »`
                  : `"The Ultra plan with 40% off, goes from $19.99 to ${price("treasure")}"`}
              </p>
            </div>

            <div className="mt-5 space-y-2.5 text-left text-xs sm:text-sm text-zinc-300 font-sans border-t border-b border-zinc-900 py-4 max-w-xs mx-auto">
              <p className="text-amber-400 font-bold font-mono tracking-wide mb-1 text-center sm:text-left">
                {lang === "fr" ? "✨ Ultra débloque :" : "✨ Ultra unlocks:"}
              </p>
              <div className="space-y-1 text-zinc-200 font-medium">
                <p>• {lang === "fr" ? "1 200 messages IA par cycle 💎" : "1,200 AI messages per cycle 💎"}</p>
                <p>• {lang === "fr" ? "300 Actions HorizonWeb 💎" : "300 HorizonWeb Actions 💎"}</p>
                <p>• {lang === "fr" ? "240 prompts comportementales 💎" : "240 behavioral prompts 💎"}</p>
                <p>• {lang === "fr" ? "120 actions Calendrier 💎" : "120 Calendar actions 💎"}</p>
                <p>• {lang === "fr" ? "300 actions Budget & Nutrition 💎" : "300 Budget & Nutrition actions 💎"}</p>
                <p>• {lang === "fr" ? "Support prioritaire 💎" : "Priority support 💎"}</p>
                <p>• {lang === "fr" ? "Analyse d'image 💎" : "Image analysis 💎"}</p>
                <p>• {lang === "fr" ? "Historique et chat illimité 💎" : "Unlimited history and chat 💎"}</p>
                <p>• {lang === "fr" ? "1 mois du 3ième meilleur plan 💎" : "1 month of the 3rd best plan 💎"}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button type="button" disabled={isLoadingTreasure} onClick={() => handleUpgradeWithStripe("treasure")}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 font-mono text-xs font-bold rounded-xl text-white uppercase tracking-widest transition-all shadow-md text-center">
                {isLoadingTreasure
                  ? (lang === "fr" ? "CONNEXION..." : "CONNECTING...")
                  : user
                    ? (lang === "fr" ? `Réclamer le trésor (${price("treasure")}) ➔` : `Claim the treasure (${price("treasure")}) ➔`)
                    : (lang === "fr" ? "Se connecter pour en profiter ➔" : "Log in to claim ➔")}
              </button>
              <button type="button" onClick={() => setShowTreasureModal(false)} className="w-full py-1.5 text-zinc-600 font-mono text-[11px] hover:text-zinc-400 transition-colors">
                {lang === "fr" ? "Plus tard" : "Later"}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}