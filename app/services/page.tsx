"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../../context/AppContext";

const localT = {
  fr: {
    features: "FONCTIONNALITÉS",
    echoAiDoIt: "ECHO IA LE FAIT POUR TOI",
    currentPlan: "PLAN ACTUEL",
    included: "✓ INCLUS",
    connecting: "Connexion...",
    upgrade: "🚀 AMÉLIORER",
    joinFounder: "👑 REJOINDRE",
    plans: {
      free: {
        title: "Free",
        sub: "FOREVER FREE",
        f1: "✅ AI Standard Model",
        f2: "✅ WebSearch Integration",
        f3: "✅ Notes",
        f4: "✅ Calendar",
        f5: "✅ Vitality",
        f6: "✅ Behavioral Prompts Limited",
        f7: "❌ History page",
        ai1: "✅ Calendar Echo AI Limited",
        ai2: "✅ Vitality Echo AI Limited",
      },
      basic: {
        title: "Basic",
        sub: "PER MONTH",
        f1: "✅ AI Advanced Model",
        f2: "✅ WebSearch Integration",
        f3: "✅ Notes",
        f4: "✅ Calendar",
        f5: "✅ Vitality",
        f6: "✅ Behavioral Prompts x4",
        f7: "❌ History page",
        f8: "✅ Email Support",
        ai1: "✅ Calendar Echo AI x4",
        ai2: "✅ Vitality Echo AI x4",
      },
      premium: {
        title: "Premium",
        sub: "PER MONTH",
        badge: "⭐ MOST POPULAR",
        f1: "✅ AI Advanced Model",
        f2: "✅ WebSearch Integration",
        f3: "✅ Notes",
        f4: "✅ Calendar",
        f4_1: "✅ Vitality",
        f5: "✅ History page limited",
        f6: "✅ Email Support",
        f7: "✅ Image Analysis",
        f8: "✅ Behavioral Prompts x10",
        ai1: "✅ Calendar Echo AI x10",
        ai2: "✅ Vitality Echo AI x10",
      },
      ultra: {
        title: "Ultra",
        sub: "PER MONTH",
        power: "Power Users",
        f1: "✅ AI Expert Model",
        f2: "✅ WebSearch Integration",
        f3: "✅ Notes",
        f4: "✅ Calendar",
        f5: "✅ Vitality",
        f6: "✅ History page unlimited",
        f7: "✅ Priority Processing",
        f8: "✅ Email Support",
        f9: "✅ Image Analysis",
        f10: "✅ Behavioral Prompts x30",
        ai1: "✅ Calendar Echo AI x30",
        ai2: "✅ Vitality Echo AI x30",
      },
      founder: {
        title: "Founder",
        sub: "PER MONTH",
        power: "Support Echo Development",
        f1: "✅ AI Expert Model unlimited",
        f2: "✅ WebSearch Integration",
        f3: "✅ Notes",
        f4: "✅ Calendar",
        f5: "✅ Vitality",
        f6: "✅ History page unlimited",
        f7: "✅ Priority Processing",
        f8: "✅ Email Support",
        f9: "✅ Image Analysis",
        f10: "✅ Advanced Capabilities",
        f11: "✅ Unlimited Behavioral Prompts",
        ai1: "✅ Calendar Echo AI unlimited",
        ai2: "✅ Vitality Echo AI unlimited",
      }
    }
  },
  en: {
    features: "FEATURES",
    echoAiDoIt: "ECHO AI DO IT FOR YOU",
    currentPlan: "CURRENT PLAN",
    included: "✓ INCLUDED",
    connecting: "Connecting...",
    upgrade: "🚀 UPGRADE",
    joinFounder: "👑 BECOME A FOUNDER",
    plans: {
      free: {
        title: "Free",
        sub: "FOREVER FREE",
        f1: "✅ AI Standard Model",
        f2: "✅ WebSearch Integration",
        f3: "✅ Notes",
        f4: "✅ Calendar",
        f5: "✅ Vitality",
        f6: "✅ Behavioral Prompts Limited",
        f7: "❌ History page",
        ai1: "✅ Calendar Echo AI Limited",
        ai2: "✅ Vitality Echo AI Limited",
      },
      basic: {
        title: "Basic",
        sub: "PER MONTH",
        f1: "✅ AI Advanced Model",
        f2: "✅ WebSearch Integration",
        f3: "✅ Notes",
        f4: "✅ Calendar",
        f5: "✅ Vitality",
        f6: "✅ Behavioral Prompts x4",
        f7: "❌ History page",
        f8: "✅ Email Support",
        ai1: "✅ Calendar Echo AI x4",
        ai2: "✅ Vitality Echo AI x4",
      },
      premium: {
        title: "Premium",
        sub: "PER MONTH",
        badge: "⭐ MOST POPULAR",
        f1: "✅ AI Advanced Model",
        f2: "✅ WebSearch Integration",
        f3: "✅ Notes",
        f4: "✅ Calendar",
        f4_1: "✅ Vitality",
        f5: "✅ History page limited",
        f6: "✅ Email Support",
        f7: "✅ Image Analysis",
        f8: "✅ Behavioral Prompts x10",
        ai1: "✅ Calendar Echo AI x10",
        ai2: "✅ Vitality Echo AI x10",
      },
      ultra: {
        title: "Ultra",
        sub: "PER MONTH",
        power: "Power Users",
        f1: "✅ AI Expert Model",
        f2: "✅ WebSearch Integration",
        f3: "✅ Notes",
        f4: "✅ Calendar",
        f5: "✅ Vitality",
        f6: "✅ History page unlimited",
        f7: "✅ Priority Processing",
        f8: "✅ Email Support",
        f9: "✅ Image Analysis",
        f10: "✅ Behavioral Prompts x30",
        ai1: "✅ Calendar Echo AI x30",
        ai2: "✅ Vitality Echo AI x30",
      },
      founder: {
        title: "Founder",
        sub: "PER MONTH",
        power: "Support Echo Development",
        f1: "✅ AI Expert Model unlimited",
        f2: "✅ WebSearch Integration",
        f3: "✅ Notes",
        f4: "✅ Calendar",
        f5: "✅ Vitality",
        f6: "✅ History page unlimited",
        f7: "✅ Priority Processing",
        f8: "✅ Email Support",
        f9: "✅ Image Analysis",
        f10: "✅ Advanced Capabilities",
        f11: "✅ Unlimited Behavioral Prompts",
        ai1: "✅ Calendar Echo AI unlimited",
        ai2: "✅ Vitality Echo AI unlimited",
      }
    }
  }
};

const TIER_RANK: Record<string, number> = {
  free: 0,
  basic: 1,
  premium: 2,
  treasure: 2.5,
  ultra: 3,
  founder: 4,
};

export default function ServicesPage() {
  const { t, lang } = useApp();
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userTier, setUserTier] = useState<"free" | "basic" | "premium" | "ultra" | "founder" | string>("free");
  const [isLoadingCheckout, setIsLoadingCheckout] = useState<string | null>(null);

  const [showTreasureModal, setShowTreasureModal] = useState(false);
  const [isLoadingTreasure, setIsLoadingTreasure] = useState(false);

  const activeT = lang === "fr" ? localT.fr : localT.en;

  const fetchProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_tier")
      .eq("id", userId)
      .single();
    if (profile?.user_tier) {
      setUserTier(profile.user_tier);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id);
      }
      setIsLoaded(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setUserTier("free");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleUpgradeWithStripe = async (planName: "basic" | "premium" | "ultra" | "founder" | "treasure") => {
    if (!user) {
      alert(lang === "fr" ? "Veuillez vous connecter avant de mettre à niveau votre plan." : "Please log in before upgrading your plan.");
      return;
    }
    if (planName !== "treasure" && TIER_RANK[planName] <= TIER_RANK[userTier]) {
      return;
    }
    if (planName === "treasure" && TIER_RANK[userTier] >= TIER_RANK["ultra"]) {
      alert(lang === "fr" ? "Tu possèdes déjà un forfait supérieur ou égal à l'offre du coffre !" : "You already own an equal or higher tier than the hidden chest offer!");
      return;
    }

    try {
      if (planName === "treasure") setIsLoadingTreasure(true);
      else setIsLoadingCheckout(planName);

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planName,
          userId: user.id,
          userEmail: user.email,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to initiate Stripe session");
      if (data.url) window.location.href = data.url;
    } catch (error: any) {
      console.error("Stripe checkout error:", error);
      alert(`Error linking to checkout gateway: ${error.message}`);
    } finally {
      setIsLoadingCheckout(null);
      setIsLoadingTreasure(false);
    }
  };

  const handleSupportClick = () => {
    if (userTier === "free") {
      alert(lang === "fr" 
        ? "🔒 Le support par courriel est réservé aux membres des plans Basic, Premium, Ultra et Fondateur. Veuillez améliorer votre forfait." 
        : "🔒 Email support is exclusive to Basic, Premium, Ultra, and Founder tiers. Please upgrade your plan.");
      return;
    }
    window.location.href = "mailto:Nicogag6@gmail.com?subject=Echo%20Platform%20-%20Support%20Request";
  };

  const handleFeedbackClick = () => {
    window.location.href = "mailto:Nicogag6@gmail.com?subject=Echo%20Platform%20-%20Feedback%20and%20Suggestions";
  };

  const getPlanState = (planName: string): "current" | "lower" | "upgrade" => {
    if (planName === userTier) return "current";
    if (TIER_RANK[planName] < TIER_RANK[userTier]) return "lower";
    return "upgrade";
  };

  const renderButton = (
    planName: "basic" | "premium" | "ultra" | "founder",
    upgradeLabel: string,
    upgradeClass: string
  ) => {
    const state = getPlanState(planName);

    if (state === "current") {
      return (
        <button className="mt-6 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-default w-full">
          {activeT.currentPlan}
        </button>
      );
    }

    if (state === "lower") {
      return (
        <button
          disabled
          className="mt-6 bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 border border-zinc-200 dark:border-zinc-800 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed opacity-40 w-full"
        >
          {activeT.included}
        </button>
      );
    }

    return (
      <button
        type="button"
        disabled={isLoadingCheckout !== null}
        onClick={(e) => {
          e.stopPropagation(); // Évite le double déclenchement avec le onClick de la carte parent
          handleUpgradeWithStripe(planName);
        }}
        className={`mt-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition w-full shadow-sm ${upgradeClass}`}
      >
        {isLoadingCheckout === planName ? activeT.connecting : upgradeLabel}
      </button>
    );
  };

  return (
    <main className="h-screen w-full bg-white dark:bg-black text-black dark:text-white flex overflow-hidden relative font-sans transition-colors duration-200 selection:bg-cyan-500/30">
      <div className="flex flex-1 h-full overflow-hidden w-full">

        {/* SIDEBAR GAUCHE — reste fixe, ne scrolle pas */}
        <aside className="w-55 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-8 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between h-full overflow-y-auto">
          <div className="space-y-20">
            <h2 className="font-bold text-lg">
              <Link href="/" className="hover:text-cyan-500 dark:hover:text-cyan-400">{t.sidebar.home}</Link>
            </h2>
            <div className="space-y-20 text-zinc-800 dark:text-zinc-100 font-medium">
              <Link href="/chat" className="block hover:text-cyan-500">{t.sidebar.chat}</Link>
              <Link href="/notes" className="block hover:text-cyan-500">{t.sidebar.notes}</Link>
              <Link href="/calendar" className="block hover:text-cyan-500">📅 {lang === "fr" ? "Calendrier" : "Calendar"}</Link>
              <Link href="/vitality" className="block hover:text-cyan-500">📈 {lang === "fr" ? "Vitalité" : "Vitality"}</Link>
              <Link href="/services" className="block text-cyan-600 dark:text-cyan-400 font-bold">💎 {lang === "fr" ? "Services" : "Services"}</Link>
              <Link href="/account" className="block hover:text-cyan-500">👤 {lang === "fr" ? "Compte" : "Account"}</Link>
              <hr className="border-zinc-200 dark:border-zinc-800 my-4" />
              <Link href="/history" className="block hover:text-amber-500">⭐ {lang === "fr" ? "Historique" : "History"}</Link>
            </div>
          </div>
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
            Status : <span className="text-cyan-500 dark:text-cyan-400 uppercase font-bold block">{userTier}</span>
          </div>
        </aside>

        {/* CONTAINER PRINCIPAL — gère le défilement fluide global */}
        <section className="flex-1 flex flex-col bg-white dark:bg-black transition-colors duration-200 h-full overflow-y-auto w-full">
          <div className="flex-1 p-4 sm:p-6 pt-16 flex items-center justify-center w-full shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-stretch w-full max-w-[95rem] mx-auto pb-12">

              {/* PLAN 1: FREE */}
              <div 
                className={`bg-zinc-50 dark:bg-zinc-900 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 min-h-[580px] select-none ${
                  userTier === "free" 
                    ? "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20" 
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div>
                  <h2 className="text-lg font-black mb-1">{activeT.plans.free.title}</h2>
                  <div className="text-3xl font-black mb-0.5">$0</div>
                  <div className="text-zinc-400 text-[10px] mb-4 font-bold tracking-wide uppercase">{activeT.plans.free.sub}</div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block mb-1">{activeT.features}</span>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.free.f1}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.free.f2}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.free.f3}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.free.f4}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.free.f5}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.free.f6}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.free.f7}</div>
                    </div>
                    <div className="space-y-1.5 pt-3.5 border-t border-zinc-200 dark:border-zinc-800">
                      <span className="text-[11px] font-bold tracking-wide uppercase block text-zinc-400 dark:text-zinc-500">{activeT.echoAiDoIt}</span>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.free.ai1}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.free.ai2}</div>
                    </div>
                  </div>
                </div>
                <button className="mt-6 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-default w-full">
                  {userTier === "free" ? activeT.currentPlan : activeT.included}
                </button>
              </div>

              {/* PLAN 2: BASIC */}
              <div 
                onClick={() => TIER_RANK["basic"] > TIER_RANK[userTier] && handleUpgradeWithStripe("basic")}
                className={`bg-zinc-50 dark:bg-zinc-900 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 min-h-[580px] select-none ${
                  userTier === "basic" 
                    ? "border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20" 
                    : TIER_RANK["basic"] < TIER_RANK[userTier]
                    ? "border-zinc-200 dark:border-zinc-800 opacity-80 cursor-default"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-cyan-500/60 hover:shadow-[0_0_25px_rgba(6,182,212,0.2)] cursor-pointer hover:scale-102"
                }`}
              >
                <div>
                  <h2 className="text-lg font-black mb-1">{activeT.plans.basic.title}</h2>
                  <div className="text-3xl font-black mb-0.5">$5.99</div>
                  <div className="text-zinc-400 text-[10px] mb-4 font-bold tracking-wide uppercase">{activeT.plans.basic.sub}</div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block mb-1">{activeT.features}</span>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.basic.f1}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.basic.f2}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.basic.f3}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.basic.f4}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.basic.f5}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.basic.f6}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.basic.f7}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.basic.f8}</div>
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
              <div 
                onClick={() => TIER_RANK["premium"] > TIER_RANK[userTier] && handleUpgradeWithStripe("premium")}
                className={`bg-zinc-50 dark:bg-zinc-900 border-2 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 min-h-[580px] select-none relative ${
                  userTier === "premium" 
                    ? "border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.2)]" 
                    : TIER_RANK["premium"] < TIER_RANK[userTier]
                    ? "border-cyan-500/80 opacity-80 cursor-default"
                    : "border-cyan-500/80 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.35)] cursor-pointer hover:scale-102"
                }`}
              >
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap z-10">
                  <span className="bg-cyan-500 text-black px-3 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase shadow-sm">{activeT.plans.premium.badge}</span>
                </div>
                <div>
                  <h2 className="text-lg font-black mb-1 mt-1">{activeT.plans.premium.title}</h2>
                  <div className="text-3xl font-black mb-0.5">$9.99</div>
                  <div className="text-zinc-400 text-[10px] mb-4 font-bold tracking-wide uppercase">{activeT.plans.premium.sub}</div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block mb-1">{activeT.features}</span>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.premium.f1}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.premium.f2}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.premium.f3}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.premium.f4}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.premium.f4_1}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.premium.f5}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.premium.f6}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.premium.f7}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.premium.f8}</div>
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
              <div 
                onClick={() => TIER_RANK["ultra"] > TIER_RANK[userTier] && handleUpgradeWithStripe("ultra")}
                className={`bg-zinc-50 dark:bg-zinc-900 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 min-h-[580px] select-none ${
                  userTier === "ultra" 
                    ? "border-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.15)] ring-1 ring-purple-500/20" 
                    : TIER_RANK["ultra"] < TIER_RANK[userTier]
                    ? "border-zinc-200 dark:border-zinc-800 opacity-80 cursor-default"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-purple-500/60 hover:shadow-[0_0_30px_rgba(147,51,234,0.3)] cursor-pointer hover:scale-102"
                }`}
              >
                <div>
                  <h2 className="text-lg font-black mb-1">{activeT.plans.ultra.title}</h2>
                  <div className="text-3xl font-black mb-0.5">$19.99</div>
                  <div className="text-zinc-400 text-[10px] mb-0.5 font-bold tracking-wide uppercase">{activeT.plans.ultra.sub}</div>
                  <div className="text-zinc-400 dark:text-zinc-500 text-[9px] mb-4 italic font-mono">{activeT.plans.ultra.power}</div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block mb-1">{activeT.features}</span>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.ultra.f1}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.ultra.f2}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.ultra.f3}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.ultra.f4}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.ultra.f5}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.ultra.f6}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.ultra.f7}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.ultra.f8}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.ultra.f9}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.ultra.f10}</div>
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
              <div 
                onClick={() => TIER_RANK["founder"] > TIER_RANK[userTier] && handleUpgradeWithStripe("founder")}
                className={`bg-zinc-50 dark:bg-zinc-900 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 min-h-[580px] select-none ${
                  userTier === "founder" 
                    ? "border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20 shadow-md" 
                    : "border-zinc-200 dark:border-zinc-800 hover:border-amber-500/60 hover:shadow-[0_0_35px_rgba(245,158,11,0.35)] cursor-pointer hover:scale-102"
                }`}
              >
                <div>
                  <h2 className="text-lg font-black mb-1 text-amber-500 dark:text-amber-400">{activeT.plans.founder.title}</h2>
                  <div className="text-3xl font-black mb-0.5">$99</div>
                  <div className="text-zinc-400 text-[10px] mb-4 font-bold tracking-wide uppercase">{activeT.plans.founder.sub}</div>
                  <div className="text-zinc-400 dark:text-zinc-500 text-[9px] mb-4 font-mono">{activeT.plans.founder.power}</div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block mb-1">{activeT.features}</span>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.founder.f1}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.founder.f2}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.founder.f3}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.founder.f4}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.founder.f5}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.founder.f6}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.founder.f7}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.founder.f8}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.founder.f9}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.founder.f10}</div>
                      <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{activeT.plans.founder.f11}</div>
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

          {/* FOOTER NORMAL — toujours visible juste après la grille de prix */}
          <footer className="shrink-0 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50/60 dark:bg-zinc-950/60 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3 flex-wrap text-[10px] text-zinc-400 dark:text-zinc-600 transition-colors w-full">
            <div>© {new Date().getFullYear()} Echo Ecosystem. All rights reserved.</div>
            <div className="flex gap-2 flex-wrap justify-start sm:justify-end w-full sm:w-auto">
              <button
                type="button"
                onClick={handleFeedbackClick}
                className="flex items-center gap-1 border border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 px-3 py-1.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white bg-white dark:bg-zinc-900/40 transition font-medium shadow-sm text-[11px]"
              >
                💡 {lang === "fr" ? "Commentaires & Suggestions" : "Feedback & Suggestions"}
              </button>
              <button
                type="button"
                onClick={handleSupportClick}
                className={`flex items-center gap-1 border px-3 py-1.5 rounded-xl font-medium transition shadow-sm text-[11px] ${
                  userTier === "free"
                    ? "border-zinc-200 dark:border-zinc-900 text-zinc-300 dark:text-zinc-700 bg-zinc-100 dark:bg-zinc-950/30 cursor-not-allowed opacity-60"
                    : "border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white bg-white dark:bg-zinc-900/40"
                }`}
              >
                {userTier === "free" ? "🔒" : "✉️"} {lang === "fr" ? "Contacter le Support" : "Contact Support"}
              </button>
            </div>
          </footer>

          {/* 🏴‍☠️ L'ESPACEUR GÉANT "LOIN LOIN" — crée le grand vide sous le footer */}
          <div className="shrink-0 w-full h-[1400px] flex items-end justify-center pb-10 px-4">
            <p className="text-zinc-300 dark:text-zinc-800 text-[10px] font-mono uppercase tracking-widest text-center select-none">
              {lang === "fr" ? "... continue de descendre ..." : "... keep scrolling down ..."}
            </p>
          </div>

          {/* 🏴‍☠️ LE COFFRE AU TRÉSOR — ancré tout au fond du grand vide */}
          <div className="shrink-0 w-full flex items-center justify-center pb-16">
            <button 
              type="button"
              onClick={() => setShowTreasureModal(true)}
              className="w-12 h-6 opacity-0 hover:opacity-40 cursor-pointer select-none text-[12px] transition-opacity duration-200"
              title="..."
            >
              💎
            </button>
          </div>

        </section>
      </div>

      {/* ── 🏴‍☠️ POP-UP SURPRISE DE L'EASTER EGG (ULTRA À -40%) ── */}
      {showTreasureModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[99999] p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border-2 border-amber-500 p-6 sm:p-8 rounded-3xl max-w-md w-full text-center space-y-5 shadow-[0_0_50px_rgba(245,158,11,0.4)] transform animate-in zoom-in-95 duration-200 text-white max-h-[90vh] overflow-y-auto">
            
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
              👑
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-amber-400 tracking-wider font-mono uppercase">
                🎉✨ HOLA, EXPLORATEUR DU NUMÉRIQUE! ✨🎉
              </h3>
              <p className="text-zinc-400 text-[11px] font-semibold leading-relaxed">
                Tu viens de découvrir un Easter Egg caché dans les profondeurs d'Echo AI... et ça mérite une récompense. 😎
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-left text-[12px] sm:text-[13px] leading-relaxed text-zinc-100 font-semibold space-y-3">
              <p className="text-center font-black text-amber-400 text-sm">🏆 FÉLICITATIONS!</p>
              <p>Tu débloques un accès à l'abonnement ULTRA avec une réduction exceptionnelle de 40 % pendant 1 mois.</p>
              <p>Peu de gens tombent sur cette surprise. Encore moins prennent le temps d'explorer suffisamment pour la trouver. 👀</p>
              <div className="pt-1 text-cyan-400 font-mono space-y-0.5">
                <p>💎 Ton bonus :</p>
                <p>• 40 % de réduction sur ULTRA pendant 1 mois</p>
                <p>• Accès complet aux fonctionnalités avancées</p>
                <p>• Le droit officiel de te vanter d'avoir trouvé un secret caché d'Echo AI</p>
              </div>
              <p className="text-[11px] text-zinc-400 italic">⚠️ Cette récompense est valable pour un seul mois d'abonnement ULTRA et ne peut être combinée avec d'autres promotions.</p>
              <p className="text-zinc-300 font-medium">Profites-en tant que le portail est encore ouvert... les Easter Eggs ont tendance à disparaître aussi mystérieusement qu'ils apparaissent. 😉</p>
              <p className="text-center font-bold text-emerald-400 pt-1">🚀 Bien joué. Echo te regardait depuis le début.</p>
            </div>

            <div className="flex flex-col gap-2">
              <button 
                type="button"
                disabled={isLoadingTreasure}
                onClick={() => handleUpgradeWithStripe("treasure")}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-mono font-bold text-xs py-3.5 rounded-xl uppercase tracking-widest transition shadow-md"
              >
                {isLoadingTreasure ? "CONNECTING GATEWAY..." : "RÉCLAMER LE TRÉSOR (9.99$) ➔"}
              </button>
              <button 
                type="button"
                onClick={() => setShowTreasureModal(false)}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-500 font-mono text-[11px] py-1.5 rounded-xl transition border border-zinc-800"
              >
                Laisser le secret tranquille
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}