"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "../../context/AppContext";
import { supabase } from "../lib/supabase";
import { checkQuota, getMessageMaxLength, UserTier } from "../../utils/quota";

export const dynamic = "force-dynamic";

type Lang = "fr" | "en";
type Currency = "CAD" | "USD" | "EUR";
type CalorieLog = { id: string; foodName: string; calories: number; date: string };
type VitalityMessage = { raw: string; imageB64?: string };

const MicrosoftLogo = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23" fill="none">
    <path d="M0 0H11V11H0V0Z" fill="#F25022"/>
    <path d="M12 0H23V11H12V0Z" fill="#7FBA00"/>
    <path d="M0 12H11V23H0V12Z" fill="#00A4EF"/>
    <path d="M12 12H23V23H12V12Z" fill="#FFB900"/>
  </svg>
);

const GoogleLogo = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 2.18 2.18 4.94l3.66 2.84c.87-2.6 3.3-4.4 6.16-4.4z" fill="#EA4335"/>
  </svg>
);

const PRICES: Record<Currency, { amount: string; symbol: string }> = {
  CAD: { amount: "3.99", symbol: "CA$" },
  USD: { amount: "3.99", symbol: "US$" },
  EUR: { amount: "3.99", symbol: "€" },
};

function VitalityContent() {
  const { lang, setLang, userTier } = useApp();
  const fr = lang === "fr";
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<any>(null);
  const [currentUserTier, setCurrentUserTier] = useState<string>("free");

  // Devises & Premium
  const [currency, setCurrency] = useState<Currency>("CAD");
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // Auth Modals
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Core Vitality
  const [caloriesList, setCaloriesList] = useState<CalorieLog[]>([]);
  const [calorieGoal, setCalorieGoal] = useState(2300);
  const [isEditingCalories, setIsEditingCalories] = useState(false);
  const [inputCalorieGoal, setInputCalorieGoal] = useState("2300");
  const [manualFoodName, setManualFoodName] = useState("");
  const [manualCalories, setManualCalories] = useState("");

  // Profil Métabolique
  const [userWeight, setUserWeight] = useState("");
  const [userHeight, setUserHeight] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [weightUnit, setWeightUnit] = useState<"kg"|"lbs">("kg");
  const [heightUnit, setHeightUnit] = useState<"cm"|"ft">("cm");
  const [modalWeight, setModalWeight] = useState("");
  const [modalHeight, setModalHeight] = useState("");
  const [modalHeightInches, setModalHeightInches] = useState("");
  const [modalAge, setModalAge] = useState("30");
  const [modalGender, setModalGender] = useState("homme");

  // Agent Echo
  const [inputEcho, setInputEcho] = useState("");
  const [echoMessages, setEchoMessages] = useState<VitalityMessage[]>([]);
  const [memorySummary, setMemorySummary] = useState("");
  const [echoState, setEchoState] = useState("idle");
  const [isListening, setIsListening] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const safeTier = (userTier || "connected_free") as UserTier;
  const isImageButtonLocked = safeTier === "connected_free" || safeTier === "basic";

  const getCalorieGoalKey = (uid: string|null) => uid ? `echo-calorie-goal-${uid}` : "echo-calorie-goal";
  const getVitalityProfileKey = (uid: string|null) => uid ? `echo-vitality-profile-${uid}` : "echo-vitality-profile";
  const getVitalityConvoKey = (uid: string|null) => uid ? `echo-vitality-conversation-${uid}` : "echo-vitality-conversation";

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id || null;
      if (session?.user) {
        setUser(session.user);
        verifierStatutUser(session.user.id);
        const { data: calRows } = await supabase.from("echo_calories").select("*").eq("user_id", uid).order("date", { ascending: false });
        setCaloriesList((calRows||[]).map(r => ({ id: r.id, foodName: r.food_name, calories: r.calories, date: r.date })));
      } else {
        const guestCal = localStorage.getItem("echo-calorie-logs-guest");
        if (guestCal) setCaloriesList(JSON.parse(guestCal));
      }

      const savedCGoal = localStorage.getItem(getCalorieGoalKey(uid)) || localStorage.getItem("echo-calorie-goal");
      if (savedCGoal) { setCalorieGoal(Number(savedCGoal)); setInputCalorieGoal(savedCGoal); }

      const savedConvo = localStorage.getItem(getVitalityConvoKey(uid));
      if (savedConvo) setEchoMessages(JSON.parse(savedConvo).map((r: string) => ({ raw: r })));

      const savedProfile = localStorage.getItem(getVitalityProfileKey(uid));
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        setUserWeight(p.weight||""); setUserHeight(p.height||"");
        setModalWeight(p.weight||""); setModalHeight(p.height||"");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
        verifierStatutUser(session.user.id);
      } else {
        setUser(null);
        setCurrentUserTier("free");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const verifierStatutUser = async (uid: string) => {
    try {
      const { data: cData } = await supabase.from("contenu_quotas").select("tier").eq("user_id", uid).maybeSingle();
      if (cData?.tier && cData.tier !== "free" && cData.tier !== "connected_free") {
        setCurrentUserTier(cData.tier); return;
      }
      const { data: wData } = await supabase.from("world_quotas").select("tier").eq("user_id", uid).maybeSingle();
      if (wData?.tier && wData.tier !== "free" && wData.tier !== "connected_free") {
        setCurrentUserTier(wData.tier); return;
      }
      setCurrentUserTier("free");
    } catch { setCurrentUserTier("free"); }
  };

  const addCalorie = async (cal: Omit<CalorieLog, "id">) => {
    if (!user) {
      const c: CalorieLog = { id: Date.now().toString(), ...cal };
      setCaloriesList(prev => {
        const n = [c, ...prev];
        localStorage.setItem("echo-calorie-logs-guest", JSON.stringify(n));
        return n;
      });
      return;
    }
    const { data, error } = await supabase.from("echo_calories").insert({
      user_id: user.id, food_name: cal.foodName, calories: cal.calories, date: cal.date,
    }).select().single();
    if (!error && data) {
      setCaloriesList(prev => [{ id: data.id, foodName: data.food_name, calories: data.calories, date: data.date }, ...prev]);
    }
  };

  const deleteCalorie = async (id: string) => {
    if (user) { await supabase.from("echo_calories").delete().eq("id", id).eq("user_id", user.id); }
    setCaloriesList(prev => {
      const n = prev.filter(i => i.id !== id);
      if (!user) localStorage.setItem("echo-calorie-logs-guest", JSON.stringify(n));
      return n;
    });
  };

  const handleManualCalorieSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualFoodName.trim() || !manualCalories) return;
    await addCalorie({ foodName: manualFoodName.trim(), calories: parseInt(manualCalories)||0, date: new Date().toLocaleDateString("fr-CA") });
    setManualFoodName(""); setManualCalories("");
  };

  const totalCaloriesEaten = caloriesList.reduce((s, i) => s + i.calories, 0);
  const calorieRemaining = Math.max(calorieGoal - totalCaloriesEaten, 0);

  const handleSendEcho = async (forcedText?: string) => {
    if (echoState === "thinking") return;
    const textToSubmit = forcedText ?? inputEcho.trim();
    if (!textToSubmit && !imageBase64) return;

    if (!user) { setShowSignInModal(true); return; }

    const userEntry: VitalityMessage = { raw: `You: ${textToSubmit}`, imageB64: imageBase64 ?? undefined };
    const baseMessages = [...echoMessages, userEntry];

    setEchoState("thinking");
    setEchoMessages([...baseMessages, { raw: "Echo: ..." }]);
    if (!forcedText) setInputEcho("");
    setImageBase64(null); setImageName(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/vitality`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSubmit,
          image: imageBase64 ?? null,
          history: baseMessages.map(m => m.raw),
          userTier: safeTier,
          currentCalories: caloriesList,
          calorieGoal,
          vitalityProfile: { weight: userWeight, height: userHeight },
          source: "vitality",
        }),
      });

      const data = await response.json();
      setEchoState("speaking");

      setEchoMessages([...baseMessages, { raw: `Echo: ${data.response || ""}` }]);

      if (data.action?.type === "ADD_CALORIE_LOG") {
        const payload = data.action.payload;
        await addCalorie({
          foodName: payload.foodName || payload.food_name || textToSubmit || "Repas",
          calories: parseInt(payload.calories ?? payload.kcal) || 0,
          date: new Date().toLocaleDateString("fr-CA"),
        });
      }
    } catch {
      setEchoMessages([...baseMessages, { raw: "Echo: Serveur indisponible." }]);
    }
    setTimeout(() => setEchoState("idle"), 5000);
  };

  const isPaidTier = currentUserTier && currentUserTier !== "free" && currentUserTier !== "connected_free";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-cyan-500/20 antialiased relative overflow-x-hidden flex flex-col">
      
      {/* ── HEADER BLANC UNIFIÉ ── */}
      <section className="bg-white text-zinc-900 relative z-30">
        <header className="border-b border-zinc-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center relative">
            <div className="flex items-center gap-6">
              <Link href="/outil" className="text-sm font-mono font-black tracking-[0.25em] text-zinc-900 uppercase">
                ECHOSAI
              </Link>

              <Link
                href="/outil"
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all hover:scale-105 active:scale-95"
              >
                <span>⚡</span>
                <span>{fr ? "RETOUR AUX OUTILS" : "BACK TO TOOLS"}</span>
              </Link>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-mono relative">
              <div className="flex border border-zinc-300 rounded-lg overflow-hidden font-mono text-[10px] bg-zinc-100">
                {(["CAD", "USD", "EUR"] as Currency[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-2 py-1 font-bold transition-colors ${currency === c ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {isPaidTier ? (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-emerald-500/50 bg-black text-emerald-400 font-mono shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                  <span className="font-bold text-[11px] uppercase tracking-wider">
                    {fr ? "✓ PLAN PREMIUM ACTIF" : "✓ PREMIUM ACTIVE"}
                  </span>
                </div>
              ) : (
                <div 
                  onClick={() => setShowPremiumModal(true)} 
                  className="cursor-pointer flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-amber-500/40 bg-zinc-900 text-white shadow-lg hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
                >
                  <span className="text-[9px] bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm animate-pulse">
                    ★ ECHOAI PREMIUM ({PRICES[currency].symbol}{PRICES[currency].amount})
                  </span>
                </div>
              )}

              <div className="flex border border-zinc-200 rounded-lg overflow-hidden font-mono text-[10px]">
                <button onClick={() => setLang("fr")} className={`px-2 py-1 ${lang === "fr" ? "bg-zinc-900 text-white font-bold" : "bg-zinc-50 text-zinc-400 hover:text-zinc-600"}`}>FR</button>
                <button onClick={() => setLang("en")} className={`px-2 py-1 ${lang === "en" ? "bg-zinc-900 text-white font-bold" : "bg-zinc-50 text-zinc-400 hover:text-zinc-600"}`}>EN</button>
              </div>

              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200 font-mono">
                    🟢 {user.email}
                  </span>
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="text-[11px] text-red-500 hover:text-red-700 transition-colors uppercase font-bold"
                  >
                    [ {fr ? "Déconnexion" : "Sign Out"} ]
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSignInModal(true)}
                    className="px-4 py-2 border border-zinc-900 text-zinc-900 rounded-xl hover:bg-zinc-900 hover:text-white transition-all font-bold tracking-tight shadow-sm"
                  >
                    {fr ? "Connexion" : "Sign In"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <div className="inline-block text-[10px] font-mono tracking-widest text-emerald-600 font-bold uppercase mb-2 border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 rounded">
              {fr ? "MODULE 07 // CALORIES & SUIVI NUTRITION" : "MODULE 07 // CALORIES & NUTRITION TRACKER"}
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 leading-[1.0] mb-3 uppercase">
              ECHO VITALITY
            </h1>
            <p className="text-zinc-500 max-w-xl text-xs md:text-sm font-sans leading-relaxed">
              {fr ? "Suivez vos apports caloriques, vos repas et laissez l'agent IA calculer votre déficit." : "Track your calories, meals, and let the AI agent calculate your metabolic deficit."}
            </p>
          </div>
          <div className="lg:col-span-4 flex justify-center lg:justify-end">
            <img src="/echo1.png" alt="Echo AI Core System" className="w-full max-w-[180px] h-auto object-contain drop-shadow-[0_10px_25px_rgba(16,185,129,0.15)]" />
          </div>
        </div>
      </section>

      {/* ── SEPARATION VAGUE BLANCHE ET STRIC CYAN ── */}
      <div className="relative w-full h-20 bg-zinc-950 overflow-hidden -mt-1 z-20">
        <svg className="absolute top-0 left-0 w-full h-full text-white fill-current" viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path d="M0,0 L1440,0 L1440,30 Q1080,90 720,50 Q360,0 0,60 Z" />
        </svg>

        <svg className="absolute top-0 left-0 w-full h-full text-transparent fill-none pointer-events-none z-22" viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path d="M0,60 Q360,0 720,50 Q1080,90 1440,30" stroke="#10b981" strokeWidth="6" className="drop-shadow-[0_0_12px_#10b981]" />
        </svg>
      </div>

      {/* ── SECTION BASSE NOIRE : VITALITY & COMPAGNON ── */}
      <section className="bg-zinc-950 text-zinc-50 pb-16 pt-0 relative z-10 -mt-6 flex-1">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* COLONNE GAUCHE (DASHBOARD CALORIES) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-black/90 border-2 border-emerald-500/40 rounded-3xl p-6 shadow-[0_0_30px_rgba(16,185,129,0.15)] space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs text-emerald-400 font-extrabold uppercase">OBJECTIF NUTRITIONNEL</span>
                <span className="text-xs font-mono font-bold text-zinc-400">
                  Objectif: <strong className="text-emerald-400">{calorieGoal} kcal</strong>
                </span>
              </div>

              <div className="text-3xl font-black text-emerald-400 font-mono">
                {totalCaloriesEaten} <span className="text-xs font-normal text-zinc-500">kcal consommées</span>
              </div>

              <div className="w-full bg-zinc-900 h-3 rounded-full overflow-hidden border border-zinc-800">
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${Math.min((totalCaloriesEaten/calorieGoal)*100, 100)}%` }} />
              </div>

              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-400">Restant : <strong className="text-emerald-400">{calorieRemaining} kcal</strong></span>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(true)}
                  className="px-3 py-1 bg-emerald-950 border border-emerald-500/40 text-emerald-400 rounded-lg font-bold hover:bg-emerald-900 transition-all cursor-pointer"
                >
                  ⚙️ {fr ? "Calculer métabolisme" : "Calculate TDEE"}
                </button>
              </div>
            </div>

            {/* FORMULAIRE AJOUT MANUEL */}
            <form onSubmit={handleManualCalorieSubmit} className="bg-black/90 border border-zinc-800 rounded-2xl p-4 flex gap-2">
              <input
                type="text"
                placeholder={fr ? "Repas / Aliment" : "Meal / Food"}
                value={manualFoodName}
                onChange={e => setManualFoodName(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
              <input
                type="number"
                placeholder="kcal"
                value={manualCalories}
                onChange={e => setManualCalories(e.target.value)}
                className="w-20 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-center focus:outline-none focus:border-emerald-500"
              />
              <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs rounded-xl transition-all cursor-pointer">+</button>
            </form>

            {/* LISTE DES REPAS */}
            <div className="bg-black/80 border border-zinc-800 rounded-2xl p-5 space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
              <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider mb-2">
                JOURNAL DE VITALITÉ
              </div>
              {caloriesList.length === 0 ? (
                <div className="text-xs font-mono text-zinc-600 italic">{fr ? "Aucun repas enregistré." : "No meals logged."}</div>
              ) : caloriesList.map(cal => (
                <div key={cal.id} className="flex justify-between items-center bg-zinc-900/60 border border-zinc-800 px-4 py-3 rounded-xl">
                  <div>
                    <div className="text-xs font-bold text-zinc-200">{cal.foodName}</div>
                    <div className="text-[10px] font-mono text-zinc-500">{cal.date}</div>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-xs font-bold text-emerald-400">{cal.calories} kcal</span>
                    <button onClick={() => deleteCalorie(cal.id)} className="text-zinc-500 hover:text-red-400 text-xs cursor-pointer">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COLONNE DROITE (ECHO COMPAGNON AGENTIC) */}
          <div className="lg:col-span-6 bg-black/90 border-2 border-emerald-500/40 rounded-3xl p-6 flex flex-col justify-between h-[600px] shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <div className="border-b border-zinc-800 pb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-black text-emerald-400 uppercase tracking-wider">AGENT VITALITÉ AGENTIC</span>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar">
              {echoMessages.map((msg, idx) => (
                <div key={idx} className={`text-xs font-mono ${msg.raw.startsWith("You:") ? "text-right" : "text-left"}`}>
                  <div className={`inline-block p-3 rounded-2xl max-w-[85%] ${msg.raw.startsWith("You:") ? "bg-zinc-900 border border-zinc-800 text-zinc-200" : "bg-emerald-950/40 border border-emerald-500/30 text-emerald-300"}`}>
                    {msg.raw.replace(/^(Echo|You):\s*/i, "")}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="space-y-3 pt-3 border-t border-zinc-800">
              <textarea
                value={inputEcho}
                onChange={e => setInputEcho(e.target.value)}
                onKeyDown={e => { if(e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendEcho(); } }}
                rows={2}
                placeholder={fr ? "Entrez vos repas ou posez une question (ex: Pizza 600 kcal)..." : "Log a meal or ask a question (e.g., Pizza 600 kcal)..."}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl p-3 text-xs font-mono text-zinc-100 outline-none resize-none"
              />
              <button
                onClick={() => handleSendEcho()}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
              >
                {fr ? "ENVOYER À ECHO VITALITY" : "SEND TO ECHO VITALITY"}
              </button>
            </div>
          </div>

        </div>
      </section>

    </main>
  );
}

export default function VitalityPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-emerald-400 font-mono text-xs">Chargement de Vitality...</div>}>
      <VitalityContent />
    </Suspense>
  );
}