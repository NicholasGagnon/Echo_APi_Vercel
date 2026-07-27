"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "../../context/AppContext";
import { supabase } from "../lib/supabase";

export const dynamic = "force-dynamic";

type Lang = "fr" | "en";
type Currency = "CAD" | "USD" | "EUR";
type CalorieLog = { id: string; foodName: string; calories: number; date: string };
type VitalityMessage = { raw: string; imageB64?: string };

const MAX_FREE_CREDITS = 8;
const REGEN_1H_MS = 60 * 60 * 1000;

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
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 2.18 2.18 4.94l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

const PRICES: Record<Currency, { amount: string; symbol: string }> = {
  CAD: { amount: "3.99", symbol: "CA$" },
  USD: { amount: "3.99", symbol: "US$" },
  EUR: { amount: "3.99", symbol: "€" },
};

function VitalityContent() {
  const { lang, setLang } = useApp();
  const fr = lang === "fr";
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<any>(null);
  const [currentUserTier, setCurrentUserTier] = useState<string>("free");

  // Quotas & Premium
  const [availableQuota, setAvailableQuota] = useState<number>(MAX_FREE_CREDITS);
  const [nextRegenIn, setNextRegenIn] = useState<number>(0);
  const [currency, setCurrency] = useState<Currency>("CAD");
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // Auth Modals
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Core Vitality
  const [caloriesList, setCaloriesList] = useState<CalorieLog[]>([]);
  const [calorieGoal, setCalorieGoal] = useState(2300);
  const [isEditingCalories, setIsEditingCalories] = useState(false);
  const [inputCalorieGoal, setInputCalorieGoal] = useState("2300");
  const [manualFoodName, setManualFoodName] = useState("");
  const [manualCalories, setManualCalories] = useState("");

  // Profil Métabolique & Calculateur Déficit
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userWeight, setUserWeight] = useState("");
  const [userHeight, setUserHeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [modalWeight, setModalWeight] = useState("");
  const [modalHeight, setModalHeight] = useState("");
  const [modalHeightInches, setModalHeightInches] = useState("");
  const [modalAge, setModalAge] = useState("30");
  const [modalGender, setModalGender] = useState("homme");

  // Agent Echo & Mémoire
  const [inputEcho, setInputEcho] = useState("");
  const [echoMessages, setEchoMessages] = useState<VitalityMessage[]>([]);
  const [memorySummary, setMemorySummary] = useState("");
  const [echoState, setEchoState] = useState("idle");
  const [isListening, setIsListening] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const getCalorieGoalKey = (uid: string | null) => (uid ? `echo-calorie-goal-${uid}` : "echo-calorie-goal");
  const getVitalityProfileKey = (uid: string | null) => (uid ? `echo-vitality-profile-${uid}` : "echo-vitality-profile");
  const getVitalityConvoKey = (uid: string | null) => (uid ? `echo-vitality-conversation-${uid}` : "echo-vitality-conversation");
  const getVitalitySummaryKey = (uid: string | null) => (uid ? `echo-vitality-summary-${uid}` : "echo-vitality-summary");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id || null;
      if (session?.user) {
        setUser(session.user);
        verifierStatutUser(session.user.id);
        chargerQuotaUtilisateur(session.user.id);
        const { data: calRows } = await supabase.from("echo_calories").select("*").eq("user_id", uid).order("date", { ascending: false });
        setCaloriesList((calRows || []).map(r => ({ id: r.id, foodName: r.food_name, calories: r.calories, date: r.date })));
      } else {
        verifierQuotaAnonyme();
        const guestCal = localStorage.getItem("echo-calorie-logs-guest");
        if (guestCal) setCaloriesList(JSON.parse(guestCal));
      }

      const savedCGoal = localStorage.getItem(getCalorieGoalKey(uid)) || localStorage.getItem("echo-calorie-goal");
      if (savedCGoal) { setCalorieGoal(Number(savedCGoal)); setInputCalorieGoal(savedCGoal); }

      const savedConvo = localStorage.getItem(getVitalityConvoKey(uid));
      if (savedConvo) setEchoMessages(JSON.parse(savedConvo).map((r: string) => ({ raw: r })));

      const savedSummary = localStorage.getItem(getVitalitySummaryKey(uid));
      if (savedSummary) setMemorySummary(savedSummary);

      const savedProfile = localStorage.getItem(getVitalityProfileKey(uid));
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        setUserWeight(p.weight || ""); setUserHeight(p.height || "");
        setModalWeight(p.weight || ""); setModalHeight(p.height || "");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
        verifierStatutUser(session.user.id);
        chargerQuotaUtilisateur(session.user.id);
      } else {
        setUser(null);
        setCurrentUserTier("free");
        verifierQuotaAnonyme();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [echoMessages]);

  const verifierStatutUser = async (uid: string) => {
    try {
      const { data: vData } = await supabase.from("vitality_quotas").select("tier").eq("user_id", uid).maybeSingle();
      if (vData?.tier && vData.tier !== "free" && vData.tier !== "connected_free") {
        setCurrentUserTier(vData.tier); return;
      }
      setCurrentUserTier("free");
    } catch { setCurrentUserTier("free"); }
  };

  const chargerQuotaUtilisateur = async (uid: string) => {
    try {
      const { data } = await supabase
        .from("vitality_quotas")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();

      const now = Date.now();
      if (data) {
        const tier = (data.tier || "free");
        setCurrentUserTier(tier);

        if (tier === "premium" || tier === "advantage") {
          setAvailableQuota(999);
          return;
        }

        const lastRegen = new Date(data.last_regen_at || data.created_at).getTime();
        const elapsed = now - lastRegen;
        const recovered = Math.floor(elapsed / REGEN_1H_MS);
        const available = Math.min(MAX_FREE_CREDITS, (data.available_credits ?? MAX_FREE_CREDITS) + recovered);

        setAvailableQuota(available);

        if (available < MAX_FREE_CREDITS) {
          setNextRegenIn(REGEN_1H_MS - (elapsed % REGEN_1H_MS));
        }
      } else {
        await supabase.from("vitality_quotas").insert({
          user_id: uid,
          available_credits: MAX_FREE_CREDITS,
          tier: "free",
          last_regen_at: new Date().toISOString(),
        });
        setAvailableQuota(MAX_FREE_CREDITS);
        setCurrentUserTier("free");
      }
    } catch {
      setAvailableQuota(MAX_FREE_CREDITS);
    }
  };

  const verifierQuotaAnonyme = () => {
    try {
      const savedAnon = parseInt(localStorage.getItem("vitality_anon_used") || "0");
      setAvailableQuota(Math.max(0, MAX_FREE_CREDITS - savedAnon));
    } catch {
      setAvailableQuota(MAX_FREE_CREDITS);
    }
  };

  const consommerUnCredit = async (): Promise<boolean> => {
    if (currentUserTier === "premium" || currentUserTier === "advantage") return true;

    if (!user) {
      const currentUsed = parseInt(localStorage.getItem("vitality_anon_used") || "0");
      if (currentUsed >= MAX_FREE_CREDITS) {
        setShowSignInModal(true);
        return false;
      }
      localStorage.setItem("vitality_anon_used", String(currentUsed + 1));
      setAvailableQuota(Math.max(0, MAX_FREE_CREDITS - (currentUsed + 1)));
      return true;
    }

    const now = Date.now();
    const { data } = await supabase
      .from("vitality_quotas")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    let avail = data?.available_credits ?? MAX_FREE_CREDITS;
    let lastRegen = data ? new Date(data.last_regen_at).getTime() : now;

    if (data && currentUserTier === "free") {
      const elapsed = now - lastRegen;
      const recovered = Math.floor(elapsed / REGEN_1H_MS);
      avail = Math.min(MAX_FREE_CREDITS, avail + recovered);
      if (recovered > 0) lastRegen = now;
    }

    if (avail < 1) {
      const elapsed = now - lastRegen;
      setNextRegenIn(REGEN_1H_MS - (elapsed % REGEN_1H_MS));
      setShowPremiumModal(true);
      return false;
    }

    const newAvail = avail - 1;
    setAvailableQuota(newAvail);

    await supabase.from("vitality_quotas").upsert({
      user_id: user.id,
      available_credits: newAvail,
      tier: currentUserTier,
      last_regen_at: new Date(lastRegen).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return true;
  };

  const formatRegenTime = (ms: number) => {
    const minutes = Math.ceil(ms / 60000);
    return `${minutes} min`;
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
    await addCalorie({ foodName: manualFoodName.trim(), calories: parseInt(manualCalories) || 0, date: new Date().toLocaleDateString("fr-CA") });
    setManualFoodName(""); setManualCalories("");
  };

  const compressImage = (base64: string): Promise<string> =>
    new Promise(resolve => {
      const img = document.createElement("img");
      img.onload = () => {
        const MAX = 1200; let w = img.width, h = img.height;
        if (w > MAX || h > MAX) { if (w > h) { h = Math.round(h * MAX / w); w = MAX; } else { w = Math.round(w * MAX / h); h = MAX; } }
        const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = base64;
    });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onloadend = async () => { const c = await compressImage(reader.result as string); setImageBase64(c); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const lancerDictation = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Reconnaissance vocale non supportée sur ce navigateur."); return; }
    const r = new SR();
    r.lang = lang === "fr" ? "fr-FR" : "en-US";
    r.onstart = () => setIsListening(true);
    r.onend = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    r.onresult = (e: any) => setInputEcho(p => p + (p ? " " : "") + e.results[0][0].transcript);
    r.start();
  };

  const runMemoryCron = async (raws: string[]): Promise<string> => {
    if (raws.length <= 10) return memorySummary;
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";
      const res = await fetch(`${API_URL}/memory-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: memorySummary, messages: raws.slice(0, 500), userTier: isPaidTier ? "premium" : "free" }),
      });
      const data = await res.json();
      const newSummary = data.summary || memorySummary;
      setMemorySummary(newSummary);
      const uid = user?.id || null;
      localStorage.setItem(getVitalitySummaryKey(uid), newSummary);
      return newSummary;
    } catch {
      return memorySummary;
    }
  };

  const saveConvoLocally = (msgs: VitalityMessage[]) => {
    const uid = user?.id || null;
    localStorage.setItem(getVitalityConvoKey(uid), JSON.stringify(msgs.map(m => m.raw)));
  };

  const saveCalorieGoal = () => {
    const nextGoal = parseInt(inputCalorieGoal) || 2300;
    setCalorieGoal(nextGoal);
    setIsEditingCalories(false);
    const uid = user?.id || null;
    localStorage.setItem(getCalorieGoalKey(uid), nextGoal.toString());
  };

  const handleSubmitModalProfile = (e: React.FormEvent) => {
    e.preventDefault();
    let weightInKg = parseFloat(modalWeight);
    if (weightUnit === "lbs") weightInKg = weightInKg / 2.20462;
    let heightInCm = parseFloat(modalHeight);
    if (heightUnit === "ft") heightInCm = (parseFloat(modalHeight) || 0) * 30.48 + (parseFloat(modalHeightInches) || 0) * 2.54;
    const a = parseInt(modalAge);
    if (!weightInKg || !heightInCm || !a) return;
    let bmr = (10 * weightInKg) + (6.25 * heightInCm) - (5 * a);
    bmr = modalGender === "homme" ? bmr + 5 : bmr - 161;
    const tdee = Math.round(bmr * 1.35);
    setUserWeight(String(Math.round(weightInKg)));
    setUserHeight(String(Math.round(heightInCm)));
    setCalorieGoal(tdee); setInputCalorieGoal(String(tdee));
    const uid = user?.id || null;
    localStorage.setItem(getCalorieGoalKey(uid), tdee.toString());
    localStorage.setItem(getVitalityProfileKey(uid), JSON.stringify({ weight: Math.round(weightInKg), height: Math.round(heightInCm) }));
    setShowProfileModal(false);
    handleSendEcho(`[SYNCHRONISATION PROFIL] : Poids: ${Math.round(weightInKg)}kg, Taille: ${Math.round(heightInCm)}cm, Age: ${a}ans, Sexe: ${modalGender}. TDEE estimé: ${tdee} kcal. Calcule et recommande mon objectif de déficit calorique optimal.`);
  };

  const totalCaloriesEaten = caloriesList.reduce((s, i) => s + i.calories, 0);
  const calorieRemaining = Math.max(calorieGoal - totalCaloriesEaten, 0);

  const handleSendEcho = async (forcedText?: string) => {
    if (echoState === "thinking") return;
    const textToSubmit = forcedText ?? inputEcho.trim();
    if (!textToSubmit && !imageBase64) return;

    const autorise = await consommerUnCredit();
    if (!autorise) return;

    const currentImage = imageBase64;
    const currentName = imageName;
    const userRaw = forcedText ? `You: ${forcedText}` : textToSubmit
      ? `You: ${textToSubmit}`
      : `You: Analyse cette image${currentName ? ` (${currentName})` : ""}`;

    const userEntry: VitalityMessage = { raw: userRaw, imageB64: currentImage ?? undefined };
    const baseMessages = [...echoMessages, userEntry];

    setEchoState("thinking");
    setEchoMessages([...baseMessages, { raw: "Echo: ..." }]);
    saveConvoLocally(baseMessages);

    if (!forcedText) setInputEcho("");
    setImageBase64(null); setImageName(null);

    const currentSummary = await runMemoryCron(baseMessages.map(m => m.raw));

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";
      const response = await fetch(`${API_URL}/vitality`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSubmit || `Analyse cette image${currentName ? ` (${currentName})` : ""}`,
          image: currentImage ?? null,
          history: baseMessages.map(m => m.raw),
          summary: currentSummary,
          userTier: isPaidTier ? "premium" : "free",
          currentCalories: caloriesList,
          calorieGoal,
          vitalityProfile: { weight: userWeight, height: userHeight },
          source: "vitality",
        }),
      });

      const data = await response.json();
      setEchoState("speaking");

      const finalMessages = [...baseMessages, { raw: `Echo: ${data.response || ""}` }];
      setEchoMessages(finalMessages);
      saveConvoLocally(finalMessages);

      if (data.action) {
        const { type, payload } = data.action;

        if (type === "ADD_CALORIE_LOG") {
          const rawFoodName = payload.foodName || payload.food_name || payload.meal || payload.title || payload.name || textToSubmit || "Aliment";
          const finalFood = rawFoodName.length > 60 ? rawFoodName.slice(0, 60) : rawFoodName;
          const finalCalories = parseInt(payload.calories ?? payload.kcal) || 0;
          await addCalorie({ foodName: finalFood, calories: finalCalories, date: new Date().toLocaleDateString("fr-CA") });
        }

        if (type === "DELETE_CALORIE_LOG" && payload.id) {
          await deleteCalorie(payload.id);
        }

        if (type === "SET_CALORIE_GOAL" || type === "UPDATE_CALORIE_GOAL") {
          const nextGoal = parseInt(payload.goal ?? payload.calorieGoal ?? payload.calories);
          if (payload.weight) setUserWeight(String(payload.weight));
          if (payload.height) setUserHeight(String(payload.height));
          if (Number.isFinite(nextGoal) && nextGoal > 0) {
            setCalorieGoal(nextGoal);
            setInputCalorieGoal(nextGoal.toString());
            const uid = user?.id || null;
            localStorage.setItem(getCalorieGoalKey(uid), nextGoal.toString());
          }
        }
      }
    } catch {
      const errorMessages = [...baseMessages, { raw: "Echo: Connexion au serveur impossible." }];
      setEchoMessages(errorMessages);
      saveConvoLocally(errorMessages);
    } finally {
      setTimeout(() => setEchoState("idle"), 5000);
    }
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

              {/* INDICE DU QUOTA ET BANNIÈRE ILLIMITÉ */}
              <div 
                onClick={() => !isPaidTier && setShowPremiumModal(true)} 
                className="cursor-pointer flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-amber-500/40 bg-zinc-900 text-white shadow-lg hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
              >
                <span className="text-[10px] text-zinc-400 font-bold uppercase">{fr ? "Vitalité :" : "Vitality:"}</span>
                <span className={`font-bold font-mono ${availableQuota === 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {isPaidTier ? "∞ ILLIMITÉ" : `${availableQuota}/${MAX_FREE_CREDITS} ${fr ? "disponibles" : "available"}`}
                </span>
                {!isPaidTier && (
                  <span className="text-[9px] bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm animate-pulse">
                    ★ ILLIMITÉ ({PRICES[currency].symbol}{PRICES[currency].amount})
                  </span>
                )}
              </div>

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
                    className="text-[11px] text-red-500 hover:text-red-700 transition-colors uppercase font-bold cursor-pointer"
                  >
                    [ {fr ? "Déconnexion" : "Sign Out"} ]
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSignInModal(true)}
                    className="px-4 py-2 border border-zinc-900 text-zinc-900 rounded-xl hover:bg-zinc-900 hover:text-white transition-all font-bold tracking-tight shadow-sm cursor-pointer"
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

      {/* ── SÉPARATION VAGUE BLANCHE ET STRIC VERT ── */}
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
                {isEditingCalories ? (
                  <input
                    type="number"
                    value={inputCalorieGoal}
                    onChange={e => setInputCalorieGoal(e.target.value)}
                    onBlur={saveCalorieGoal}
                    onKeyDown={e => e.key === "Enter" && saveCalorieGoal()}
                    className="w-20 bg-zinc-900 border border-zinc-700 text-center text-xs text-white rounded p-1 font-mono font-bold focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <span
                    onClick={() => setIsEditingCalories(true)}
                    className="text-xs font-mono font-bold text-zinc-400 cursor-pointer hover:text-emerald-400 transition-colors"
                  >
                    Objectif: <strong className="text-emerald-400">{calorieGoal} kcal</strong> ✏️
                  </span>
                )}
              </div>

              <div className="text-3xl font-black text-emerald-400 font-mono">
                {totalCaloriesEaten} <span className="text-xs font-normal text-zinc-500">kcal consommées</span>
              </div>

              <div className="w-full bg-zinc-900 h-3 rounded-full overflow-hidden border border-zinc-800">
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${Math.min((totalCaloriesEaten / calorieGoal) * 100, 100)}%` }} />
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
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-black text-emerald-400 uppercase tracking-wider">AGENT VITALITÉ AGENTIC</span>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                {fr ? "Crédits : " : "Credits: "}
                <strong className={availableQuota === 0 ? "text-red-400" : "text-emerald-400"}>
                  {isPaidTier ? "∞ Illimité" : `${availableQuota}/${MAX_FREE_CREDITS}`}
                </strong>
              </span>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar">
              {echoMessages.map((msg, idx) => {
                const isUser = msg.raw.startsWith("You:") || msg.raw.startsWith("Toi:");
                const cleanText = msg.raw.replace(/^(Echo|You|Toi):\s*/i, "");
                if (cleanText.startsWith("[SYNCHRONISATION PROFIL]")) return null;
                return (
                  <div key={idx} className={`text-xs font-mono ${isUser ? "text-right" : "text-left"}`}>
                    {msg.imageB64 && (
                      <img src={msg.imageB64} alt="upload" className="max-w-[140px] max-h-[100px] rounded-xl border border-zinc-700 object-cover shadow-md mb-1 ml-auto" />
                    )}
                    <div className={`inline-block p-3 rounded-2xl max-w-[85%] whitespace-pre-wrap ${isUser ? "bg-zinc-900 border border-zinc-800 text-zinc-200" : "bg-emerald-950/40 border border-emerald-500/30 text-emerald-300"}`}>
                      {cleanText}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="space-y-3 pt-3 border-t border-zinc-800">
              {imageBase64 && (
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-[11px] text-emerald-400 font-mono">
                  <div className="flex items-center gap-2 truncate">
                    <img src={imageBase64} alt="preview" className="w-7 h-7 rounded object-cover border border-emerald-500/30" />
                    <span className="truncate">{imageName || "Image prête"}</span>
                  </div>
                  <button onClick={() => { setImageBase64(null); setImageName(null); }} className="text-zinc-400 hover:text-red-400 font-bold ml-2">✕</button>
                </div>
              )}
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

              <div className="flex gap-2 items-end">
                <textarea
                  value={inputEcho}
                  onChange={e => setInputEcho(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendEcho(); } }}
                  rows={2}
                  placeholder={fr ? "Entrez vos repas ou posez une question (ex: Pizza 600 kcal)..." : "Log a meal or ask a question (e.g., Pizza 600 kcal)..."}
                  className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl p-3 text-xs font-mono text-zinc-100 outline-none resize-none"
                />
                
                <div className="flex flex-col gap-1.5 w-12 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-8 w-full rounded-xl flex items-center justify-center border font-mono text-[10px] transition-all cursor-pointer ${
                      imageBase64
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    IMG
                  </button>

                  <button
                    type="button"
                    onClick={lancerDictation}
                    className={`h-8 w-full rounded-xl flex items-center justify-center border font-mono text-[10px] transition-all cursor-pointer ${
                      isListening
                        ? "bg-red-600 border-red-500 text-white animate-pulse"
                        : "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:border-emerald-400"
                    }`}
                  >
                    MIC
                  </button>
                </div>
              </div>

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

      {/* ── MODALE CALCUL METABOLIQUE / DÉFICIT CALORIQUE ── */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSubmitModalProfile} className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl max-w-sm w-full shadow-2xl flex flex-col gap-4 text-xs font-sans text-zinc-100 relative">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-mono font-black text-emerald-400 uppercase tracking-wider">Configuration Métabolique</h3>
              <button type="button" onClick={() => setShowProfileModal(false)} className="text-zinc-500 hover:text-white font-bold text-sm">✕</button>
            </div>

            <p className="text-zinc-400 text-[11px] font-sans leading-relaxed">
              Entrez vos données corporelles. Echo calculera vos besoins énergétiques (BMR / TDEE) et ajustera votre objectif de déficit calorique.
            </p>

            <div className="space-y-1">
              <div className="flex justify-between items-center mb-1">
                <label className="font-mono text-zinc-400 text-[10px] uppercase font-bold">Poids</label>
                <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800 text-[10px] font-mono">
                  {(["kg", "lbs"] as const).map(u => (
                    <button key={u} type="button" onClick={() => setWeightUnit(u)} className={`px-2 py-0.5 rounded uppercase font-bold ${weightUnit === u ? "bg-emerald-500 text-zinc-950" : "text-zinc-500"}`}>{u}</button>
                  ))}
                </div>
              </div>
              <input required type="number" step="0.1" value={modalWeight} onChange={e => setModalWeight(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 font-mono text-sm text-zinc-100 focus:outline-none focus:border-emerald-500" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center mb-1">
                <label className="font-mono text-zinc-400 text-[10px] uppercase font-bold">Taille</label>
                <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800 text-[10px] font-mono">
                  {(["cm", "ft"] as const).map(u => (
                    <button key={u} type="button" onClick={() => setHeightUnit(u)} className={`px-2 py-0.5 rounded uppercase font-bold ${heightUnit === u ? "bg-emerald-500 text-zinc-950" : "text-zinc-500"}`}>{u}</button>
                  ))}
                </div>
              </div>
              {heightUnit === "cm" ? (
                <input required type="number" value={modalHeight} onChange={e => setModalHeight(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 font-mono text-sm text-zinc-100 focus:outline-none focus:border-emerald-500" />
              ) : (
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <input required type="number" placeholder="ft" value={modalHeight} onChange={e => setModalHeight(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-sm text-center text-zinc-100 focus:outline-none focus:border-emerald-500" />
                  <input type="number" placeholder="in" value={modalHeightInches} onChange={e => setModalHeightInches(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-sm text-center text-zinc-100 focus:outline-none focus:border-emerald-500" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-zinc-400 text-[10px] uppercase font-bold mb-1">Âge</label>
                <input required type="number" value={modalAge} onChange={e => setModalAge(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 font-mono text-sm text-zinc-100 focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block font-mono text-zinc-400 text-[10px] uppercase font-bold mb-1">Sexe</label>
                <select value={modalGender} onChange={e => setModalGender(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 font-mono text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 h-[38px] cursor-pointer">
                  <option value="homme">Homme</option>
                  <option value="femme">Femme</option>
                </select>
              </div>
            </div>

            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-black py-3 rounded-xl transition shadow-[0_0_15px_rgba(16,185,129,0.3)] uppercase tracking-wider text-xs mt-2 cursor-pointer">
              Calculer & Synchroniser Echo
            </button>
          </form>
        </div>
      )}

      {/* ── MODALE PREMIUM ── */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[99999] p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-amber-500/50 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-100 text-center relative">
            <button type="button" onClick={() => setShowPremiumModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white text-sm p-1 cursor-pointer">✕</button>

            <div className="text-4xl mb-3">⚡</div>
            <h2 className="text-lg font-black text-white uppercase font-mono mb-1">
              {fr ? "Quota de 8 Requêtes Atteint" : "8-Request Limit Reached"}
            </h2>
            <p className="text-xs text-zinc-400 mb-4 font-sans">
              {fr
                ? `Prochain crédit dans environ ${formatRegenTime(nextRegenIn)}. Ou débloquez l'accès illimité dès maintenant.`
                : `Next credit in about ${formatRegenTime(nextRegenIn)}. Or unlock unlimited access now.`}
            </p>

            <div className="flex justify-center gap-2 mb-4 font-mono text-xs">
              {(["CAD", "USD", "EUR"] as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-3 py-1 rounded-lg font-bold border transition-all ${
                    currency === c ? "bg-amber-500 text-zinc-950 border-amber-400" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                  }`}
                >
                  {c} ({PRICES[c].symbol})
                </button>
              ))}
            </div>

            <div className="bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/40 rounded-2xl p-5 mb-6 text-left space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-amber-400 font-bold text-xs font-mono uppercase">★ ECHOAI PREMIUM</span>
                <span className="text-white font-black text-sm font-mono">
                  {PRICES[currency].symbol}{PRICES[currency].amount}/{fr ? "mois" : "mo"}
                </span>
              </div>
              <ul className="text-zinc-300 text-xs space-y-2 font-mono">
                <li className="flex items-center gap-2 text-emerald-400">✓ <strong>Accès Illimité</strong> à tous les outils EchoAI</li>
                <li className="flex items-center gap-2 text-emerald-400">✓ Génération haute vitesse prioritaire</li>
                <li className="flex items-center gap-2 text-zinc-400">✓ Sauvegarde permanente de vos projets</li>
              </ul>
            </div>

            <button
              onClick={async () => {
                if (!user) { setShowPremiumModal(false); setShowSignInModal(true); return; }
                setIsCheckoutLoading(true);
                try {
                  const res = await fetch("/api/stripe/create-checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ plan: "world_advantage", currency: currency.toUpperCase(), userId: user.id, userEmail: user.email }),
                  });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                } catch { alert("Erreur de paiement."); } finally { setIsCheckoutLoading(false); }
              }}
              disabled={isCheckoutLoading}
              className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 transition-all shadow-[0_0_25px_rgba(245,158,11,0.3)] cursor-pointer disabled:opacity-50"
            >
              {isCheckoutLoading ? "CHARGEMENT DE STRIPE..." : `Activer EchoAI Premium (${PRICES[currency].symbol}${PRICES[currency].amount}/mois)`}
            </button>
          </div>
        </div>
      )}

      {/* ── MODALE CONNEXION ── */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-zinc-100">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold">{fr ? "Connexion Requise" : "Authentication Required"}</h2>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{fr ? "Connectez-vous pour enregistrer votre profil." : "Sign in to save your profile."}</p>
              </div>
              <button type="button" onClick={() => setShowSignInModal(false)} className="text-zinc-400 hover:text-white text-sm p-1 cursor-pointer">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button type="button" onClick={async () => { await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/vitality` } }); }} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 cursor-pointer">
                <GoogleLogo /><span className="text-white text-[9px] font-bold">GOOGLE</span>
              </button>
              <button type="button" onClick={async () => { await supabase.auth.signInWithOAuth({ provider: "azure", options: { redirectTo: `${window.location.origin}/vitality` } }); }} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 cursor-pointer">
                <MicrosoftLogo /><span className="text-white text-[9px] font-bold">MICROSOFT</span>
              </button>
            </div>

            <div className="h-px bg-zinc-900 my-3" />

            <div className="space-y-3">
              <input type="email" placeholder="nom@domaine.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500" />
              <input type="password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500" />
              {authError && <p className="text-red-400 text-xs font-mono">⚠️ {authError}</p>}

              <button
                onClick={async () => {
                  setAuthError(null);
                  const { error } = await supabase.auth.signInWithPassword({ email, password });
                  if (error) setAuthError(error.message);
                  else setShowSignInModal(false);
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                {fr ? "Se connecter" : "Log in"}
              </button>
            </div>
          </div>
        </div>
      )}

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