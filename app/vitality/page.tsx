"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase"; 
import { checkQuota, getMessageMaxLength } from "../../utils/quota"; 
import { useApp } from "../../context/AppContext"; 

type BudgetExpense = {
  id: string;
  title: string;
  amount: number;
  currency: "$" | "€";
  date: string;
};

type CalorieLog = {
  id: string;
  foodName: string;
  calories: number;
  date: string;
};

type VitalityMessage = {
  raw: string;         // "You: ..." | "Echo: ..."
  imageB64?: string;   // miniature base64 attachée au message user
};

export default function VitalityPage() {
  const { t, lang, theme, userTier } = useApp(); 
  const [isLoaded, setIsLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null); 
  const [inputEcho, setInputEcho] = useState("");
  const [echoMessages, setEchoMessages] = useState<VitalityMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [echoState, setEchoState] = useState("idle"); 
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [activeLimitCategory, setActiveLimitCategory] = useState<"vitality" | "calendar" | "prompts">("vitality");
  const [isListening, setIsListening] = useState(false);

  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageName, setImageName]     = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expenses, setExpenses] = useState<BudgetExpense[]>([]);
  const [caloriesList, setCaloriesList] = useState<CalorieLog[]>([]);

  const [manualExpenseTitle, setManualExpenseTitle] = useState("");
  const [manualExpenseAmount, setManualExpenseAmount] = useState("");
  const [manualExpenseCurrency, setManualExpenseCurrency] = useState<"$" | "€">("$");
  const [manualExpenseDate, setManualExpenseDate] = useState(new Date().toLocaleDateString("fr-CA"));
  const [manualFoodName, setManualFoodName] = useState("");
  const [manualCalories, setManualCalories] = useState("");

  const [budgetGoal, setBudgetGoal] = useState(3000);
  const [calorieGoal, setCalorieGoal] = useState(2300);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [isEditingCalories, setIsEditingCalories] = useState(false);
  const [inputBudgetGoal, setInputBudgetGoal] = useState("3000");
  const [inputCalorieGoal, setInputCalorieGoal] = useState("2300");
  const [userWeight, setUserWeight] = useState("");
  const [userHeight, setUserHeight] = useState("");

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  
  const [modalWeight, setModalWeight] = useState("");
  const [modalHeight, setModalHeight] = useState(""); 
  const [modalHeightInches, setModalHeightInches] = useState(""); 
  const [modalAge, setModalAge] = useState("30");
  const [modalGender, setModalGender] = useState("homme");

  const dict = {
    fr: {
      title: "Configuration Métabolique",
      desc: "Entrez vos données de base ici. Echo se chargera d'analyser vos besoins énergétiques et d'orchestrer votre stratégie de déficit calorique avec vous au fil de vos discussions.",
      weight: "Poids",
      height: "Taille",
      age: "Âge",
      gender: "Sexe biologique",
      male: "Homme",
      female: "Femme",
      btnApply: "💾 Appliquer et Synchroniser Echo",
      btnCalc: "⚖️ Calculer mon Déficit",
      spent: "Dépensé",
      remaining: "Restant",
      goal: "Objectif",
      fluxFin: "📋 FINANCIAL FLOW",
      regVit: "🍏 VITALITY LOG",
      ctrlTitle: "🤖 ECHO VITALITY CONTROLLER",
      noTrans: "No transactions recorded.",
      noMeal: "No meals logged."
    },
    en: {
      title: "Metabolic Configuration",
      desc: "Enter your primary body data here. Echo will take care of analyzing your energy needs and personalizing your target calorie deficit with you over chat.",
      weight: "Weight",
      height: "Height",
      age: "Age",
      gender: "Biological Sex",
      male: "Male",
      female: "Female",
      btnApply: "💾 Apply and Sync Echo",
      btnCalc: "⚖️ Calculate My Deficit",
      spent: "Spent",
      remaining: "Remaining",
      goal: "Goal",
      fluxFin: "📋 FINANCIAL FLOW",
      regVit: "🍏 VITALITY LOG",
      ctrlTitle: "🤖 ECHO VITALITY CONTROLLER",
      noTrans: "No transactions recorded.",
      noMeal: "No meals logged."
    }
  }[lang === "fr" ? "fr" : "en"];

  const getVitalityConvoKey  = (uid: string | null) => uid ? `echo-vitality-conversation-${uid}` : "echo-vitality-conversation";
  const getExpensesKey       = (uid: string | null) => uid ? `echo-budget-expenses-${uid}`      : "echo-budget-expenses";
  const getCaloriesKey       = (uid: string | null) => uid ? `echo-calorie-logs-${uid}`         : "echo-calorie-logs";
  const getBudgetGoalKey     = (uid: string | null) => uid ? `echo-budget-goal-${uid}`          : "echo-budget-goal";
  const getCalorieGoalKey    = (uid: string | null) => uid ? `echo-calorie-goal-${uid}`         : "echo-calorie-goal";
  const getVitalityProfileKey= (uid: string | null) => uid ? `echo-vitality-profile-${uid}`    : "echo-vitality-profile";

  const lastEchoIndex = echoMessages.findLastIndex((m) => /^Echo\s*:/i.test(m.raw));

  const serializeMsgs = (msgs: VitalityMessage[]) => msgs.map(m => m.raw);
  const deserializeMsgs = (raws: string[]): VitalityMessage[] => raws.map(r => ({ raw: r }));

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      try {
        const savedExpenses = localStorage.getItem(getExpensesKey(uid));
        if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
        else if (!uid) setExpenses(JSON.parse(localStorage.getItem("echo-budget-expenses") || "[]"));

        const savedCalories = localStorage.getItem(getCaloriesKey(uid));
        if (savedCalories) setCaloriesList(JSON.parse(savedCalories));
        else if (!uid) setCaloriesList(JSON.parse(localStorage.getItem("echo-calorie-logs") || "[]"));

        const savedConvo = localStorage.getItem(getVitalityConvoKey(uid));
        if (savedConvo) setEchoMessages(deserializeMsgs(JSON.parse(savedConvo)));
        else setEchoMessages([]);

        const savedBGoal = localStorage.getItem(getBudgetGoalKey(uid)) || localStorage.getItem("echo-budget-goal");
        if (savedBGoal) { setBudgetGoal(Number(savedBGoal)); setInputBudgetGoal(savedBGoal); }

        const savedCGoal = localStorage.getItem(getCalorieGoalKey(uid)) || localStorage.getItem("echo-calorie-goal");
        if (savedCGoal) { setCalorieGoal(Number(savedCGoal)); setInputCalorieGoal(savedCGoal); }

        const savedProfile = localStorage.getItem(getVitalityProfileKey(uid));
        if (savedProfile) {
          const p = JSON.parse(savedProfile);
          setUserWeight(p.weight || "");
          setUserHeight(p.height || "");
          setModalWeight(p.weight || "");
          setModalHeight(p.height || "");
        }
      } catch (e) { console.error("Init error", e); }
      setIsLoaded(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        setUserId(null); setExpenses([]); setCaloriesList([]); setEchoMessages([]);
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const uid = session.user.id;
        setUserId(uid);
        setExpenses(JSON.parse(localStorage.getItem(getExpensesKey(uid)) || "[]"));
        setCaloriesList(JSON.parse(localStorage.getItem(getCaloriesKey(uid)) || "[]"));
        const savedConvo = localStorage.getItem(getVitalityConvoKey(uid));
        setEchoMessages(savedConvo ? deserializeMsgs(JSON.parse(savedConvo)) : []);
        const bGoal = localStorage.getItem(getBudgetGoalKey(uid));
        if (bGoal) { setBudgetGoal(Number(bGoal)); setInputBudgetGoal(bGoal); }
        const rGoal = localStorage.getItem(getCalorieGoalKey(uid));
        if (rGoal) { setCalorieGoal(Number(rGoal)); setInputCalorieGoal(rGoal); }
        const profile = JSON.parse(localStorage.getItem(getVitalityProfileKey(uid)) || "{}");
        setUserWeight(profile.weight || ""); setUserHeight(profile.height || "");
        setModalWeight(profile.weight || ""); setModalHeight(profile.height || "");
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (!isLoaded) return; localStorage.setItem(getExpensesKey(userId), JSON.stringify(expenses)); }, [expenses, isLoaded, userId]);
  useEffect(() => { if (!isLoaded) return; localStorage.setItem(getCaloriesKey(userId), JSON.stringify(caloriesList)); }, [caloriesList, isLoaded, userId]);
  useEffect(() => { if (!isLoaded) return; localStorage.setItem(getBudgetGoalKey(userId), budgetGoal.toString()); }, [budgetGoal, isLoaded, userId]);
  useEffect(() => { if (!isLoaded) return; localStorage.setItem(getCalorieGoalKey(userId), calorieGoal.toString()); }, [calorieGoal, isLoaded, userId]);
  useEffect(() => { if (!isLoaded) return; localStorage.setItem(getVitalityProfileKey(userId), JSON.stringify({ weight: userWeight, height: userHeight })); }, [userWeight, userHeight, isLoaded, userId]);
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(getVitalityConvoKey(userId), JSON.stringify(serializeMsgs(echoMessages)));
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [echoMessages, isLoaded, userId]);

  const totalSpentUSD      = expenses.filter(i => i.currency === "$").reduce((s, i) => s + i.amount, 0);
  const totalSpentEUR      = expenses.filter(i => i.currency === "€").reduce((s, i) => s + i.amount, 0);
  const totalSpentCombined = totalSpentUSD + totalSpentEUR;
  const budgetPercentage   = Math.min((totalSpentCombined / budgetGoal) * 100, 100);
  const totalCaloriesEaten = caloriesList.reduce((s, i) => s + i.calories, 0);
  const calorieRemaining   = Math.max(calorieGoal - totalCaloriesEaten, 0);

  const handleSendEcho = async (forcedText?: string) => {
    // 🚀 SÉCURITÉ ANTI-CONCURRENCE : Si l'IA est déjà en train de réfléchir, on bloque les requêtes dupliquées !
    if (echoState === "thinking") return;

    const textToSubmit = forcedText ?? inputEcho.trim();
    if (!textToSubmit && !imageBase64) return;

    const quotaStatus = checkQuota("prompts", userTier || "free");
    if (!quotaStatus.allowed) {
      // ... (Reste de ton code de quota inchangé)
      const lockMessage = lang === "fr"
        ? 'Echo: 🔒 Limite mensuelle de requêtes atteinte pour votre forfait. Passez au plan supérieur pour continuer à échanger.'
        : 'Echo: 🔒 Monthly prompt request limit reached for your plan. Please upgrade to continue chatting.';
      
      setEchoMessages((prev) => [...prev, { raw: lockMessage }]);
      setActiveLimitCategory("prompts");
      setShowLimitModal(true);
      return;
    }

    const currentImage = imageBase64;
    const currentName  = imageName;

    const userRaw = forcedText 
      ? `You: ${forcedText}`
      : textToSubmit
        ? `You: ${textToSubmit}`
        : `You: Analyse cette image${currentName ? ` (${currentName})` : ""}.`;

    const userEntry: VitalityMessage = {
      raw: userRaw,
      imageB64: currentImage ?? undefined,
    };

    const baseMessages: VitalityMessage[] = [...echoMessages, userEntry];
    const thinkingEntry: VitalityMessage  = { raw: "Echo: ..." };

    setEchoState("thinking");
    setEchoMessages([...baseMessages, thinkingEntry]);
    if (!forcedText) setInputEcho("");
    setImageBase64(null);
    setImageName(null);

    const historyForBackend = serializeMsgs(baseMessages);

    try {
      const response = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSubmit || `Analyse cette image${currentName ? ` (${currentName})` : ""}.`,
          image: currentImage ?? null,
          history: historyForBackend,
          userTier: userTier || "free",
          currentExpenses: expenses,
          currentCalories: caloriesList,
          budgetGoal,
          calorieGoal,
          vitalityProfile: { weight: userWeight, height: userHeight },
          source: "vitality",
        }),
      });

      const data = await response.json();
      setEchoState("speaking");

      if (data.action) {
        const quotaStatusAction = checkQuota("vitality", userTier || "free");
        if (!quotaStatusAction.allowed) {
          setEchoMessages([...baseMessages, { raw: `Echo: 🔒 Limit reached for [vitality].` }]);
          setActiveLimitCategory("vitality");
          setShowLimitModal(true);
          return;
        }
      }

      const echoText = data.response || (typeof data === "string" ? data : "");
      setEchoMessages([...baseMessages, { raw: `Echo: ${echoText}` }]);

      if (data.action) {
        const { type, payload } = data.action;

        if (type === "ADD_BUDGET_EXPENSE") {
          const { title, amount, spent, date, paymentDate, paidAt, currency } = payload;
          const entryDate = paymentDate || paidAt || date || new Date().toLocaleDateString("fr-CA");
          const detectedCurrency = currency || (textToSubmit.toLowerCase().includes("euro") || textToSubmit.includes("€") ? "€" : "$");
          setExpenses(prev => [...prev, { id: Date.now().toString(), title: title || "Purchase", amount: parseFloat(amount ?? spent) || 0, currency: detectedCurrency, date: entryDate }]);
        }

        if (type === "UPDATE_BUDGET_EXPENSE") {
          const { id, title, amount, currency, date } = payload;
          setExpenses(prev => prev.map(exp => exp.id === id ? {
            ...exp,
            title: title || exp.title,
            amount: amount !== undefined ? parseFloat(amount) : exp.amount,
            currency: currency || exp.currency,
            date: date || exp.date
          } : exp));
        }

        if (type === "DELETE_BUDGET_EXPENSE") {
          if (payload.id) deleteExpense(payload.id);
        }

        if (type === "ADD_CALORIE_LOG") {
          const { foodName, meal, title, calories } = payload;
          setCaloriesList(prev => [...prev, { id: Date.now().toString(), foodName: foodName || meal || title || "Food Item", calories: parseInt(calories) || 0, date: new Date().toLocaleDateString("fr-CA") }]);
        }

        if (type === "DELETE_CALORIE_LOG") {
          if (payload.id) deleteCalorie(payload.id);
        }

        if (type === "SET_BUDGET_GOAL" || type === "UPDATE_BUDGET_GOAL") {
          const { goal, budgetGoal: bg, amount, spent } = payload;
          const nextGoal = parseInt(goal ?? bg ?? amount ?? spent);
          if (Number.isFinite(nextGoal) && nextGoal > 0) { setBudgetGoal(nextGoal); setInputBudgetGoal(nextGoal.toString()); }
        }

        if (type === "SET_CALORIE_GOAL" || type === "UPDATE_CALORIE_GOAL") {
          const { goal, calorieGoal: cg, calories, weight, height } = payload;
          const nextGoal = parseInt(goal ?? cg ?? calories);
          if (weight) setUserWeight(String(weight));
          if (height) setUserHeight(String(height));
          if (Number.isFinite(nextGoal) && nextGoal > 0) { setCalorieGoal(nextGoal); setInputCalorieGoal(nextGoal.toString()); }
        }
      }

    } catch {
      setEchoMessages([...baseMessages, { raw: "Echo: Unable to reach backend server." }]);
    }
    setTimeout(() => setEchoState("idle"), 10000);
  };

  const handleSubmitModalProfile = (e: React.FormEvent) => {
    e.preventDefault();
    let weightInKg = parseFloat(modalWeight);
    if (weightUnit === "lbs") weightInKg = weightInKg / 2.20462;

    let heightInCm = parseFloat(modalHeight);
    if (heightUnit === "ft") {
      const feet = parseFloat(modalHeight) || 0;
      const inches = parseFloat(modalHeightInches) || 0;
      heightInCm = (feet * 30.48) + (inches * 2.54);
    }

    const a = parseInt(modalAge);
    if (!weightInKg || !heightInCm || !a) return;

    let bmr = (10 * weightInKg) + (6.25 * heightInCm) - (5 * a);
    bmr = modalGender === "homme" ? bmr + 5 : bmr - 161;
    const tdee = Math.round(bmr * 1.35);

    setUserWeight(String(Math.round(weightInKg)));
    setUserHeight(String(Math.round(heightInCm)));
    setCalorieGoal(tdee);
    setInputCalorieGoal(String(tdee));
    setShowProfileModal(false);

    const contextPrompt = `[SYNCHRONISATION PROFIL] : Poids: ${Math.round(weightInKg)}kg (${modalWeight}${weightUnit}), Taille: ${Math.round(heightInCm)}cm, Âge: ${a}ans, Sexe: ${modalGender}. Mon maintien métabolique (TDEE) estimé est de ${tdee} kcal. Calcule et recommande-moi mon objectif de déficit calorique optimal en fonction de mes objectifs.`;
    handleSendEcho(contextPrompt);
  };

  const handleManualExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualExpenseTitle.trim() || !manualExpenseAmount) return;
    setExpenses(prev => [...prev, { id: Date.now().toString(), title: manualExpenseTitle.trim(), amount: parseFloat(manualExpenseAmount) || 0, currency: manualExpenseCurrency, date: manualExpenseDate || new Date().toLocaleDateString("fr-CA") }]);
    setManualExpenseTitle(""); setManualExpenseAmount("");
  };

  const handleManualCalorieSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualFoodName.trim() || !manualCalories) return;
    setCaloriesList(prev => [...prev, { id: Date.now().toString(), foodName: manualFoodName.trim(), calories: parseInt(manualCalories) || 0, date: new Date().toLocaleDateString("fr-CA") }]);
    setManualFoodName(""); setManualCalories("");
  };

  const saveBudgetGoal  = () => { setBudgetGoal(parseInt(inputBudgetGoal) || 3000);  setIsEditingBudget(false); };
  const saveCalorieGoal = () => { setCalorieGoal(parseInt(inputCalorieGoal) || 2300); setIsEditingCalories(false); };

  const deleteExpense = (id: string) => setExpenses(prev => prev.filter(i => i.id !== id));
  const deleteCalorie = (id: string) => setCaloriesList(prev => prev.filter(i => i.id !== id));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => setImageBase64(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const lancerDictation = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition is not supported."); return; }
    const r = new SR();
    r.lang = "fr-FR";
    r.onstart = () => setIsListening(true);
    r.onend   = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    r.onresult = (e: any) => setInputEcho(p => p + (p ? " " : "") + e.results[0][0].transcript);
    r.start();
  };

  return (
    <main className="vitality-page h-screen w-full bg-white dark:bg-black text-black dark:text-white flex overflow-hidden font-sans relative transition-colors duration-200 selection:bg-cyan-500/30">
      <div className="flex flex-1 overflow-hidden min-h-0 w-full">
        
        {/* SIDEBAR GAUCHE */}
        <aside className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-8 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between">
          <div className="space-y-20">
            <h2 className="font-bold text-lg">
              <Link href="/" className="hover:text-cyan-500 dark:hover:text-cyan-400">{t.sidebar.home}</Link>
            </h2>
            <div className="space-y-20 text-zinc-800 dark:text-zinc-100 font-medium">
              <Link href="/chat"     className="block hover:text-cyan-500">{t.sidebar.chat}</Link>
              <Link href="/notes"    className="block hover:text-cyan-500">{t.sidebar.notes}</Link>
              <Link href="/calendar" className="block hover:text-cyan-500">📅 {lang === "fr" ? "Calendrier" : "Calendar"}</Link>
              <Link href="/vitality" className="block text-cyan-600 dark:text-cyan-400 font-bold">📈 {lang === "fr" ? "Vitalité" : "Vitality"}</Link>
              <Link href="/services" className="block hover:text-cyan-500">💎 Services</Link>
              <Link href="/account"  className="block hover:text-cyan-500">👤 {lang === "fr" ? "Compte" : "Account"}</Link>
              <hr className="border-zinc-200 dark:border-zinc-800 my-4" />
              <Link href="/history"  className="block hover:text-amber-500">⭐ {lang === "fr" ? "Historique" : "History"}</Link>
            </div>
          </div>
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
            Status : <span className="text-cyan-500 dark:text-cyan-400 uppercase font-bold block">{userTier || "free"}</span>
          </div>
        </aside>

        {/* 🚀 GRILLE CENTRALISÉE RÉALIGNÉE AVEC CHAT MAXIMISÉ ([1fr_1fr_2.5fr]) */}
        <div className="vitality-shell flex-1 grid grid-cols-1 xl:grid-cols-[1fr_1fr_2.5fr] overflow-hidden bg-white dark:bg-black transition-colors duration-200 h-full w-full">
          
          {/* ── FINANCES (FLUX FINANCIER) ── */}
          <section className="vitality-panel min-w-0 xl:border-r border-b xl:border-b-0 border-zinc-200 dark:border-zinc-900 bg-zinc-50/10 dark:bg-zinc-950/5 p-4 flex flex-col h-full overflow-hidden">
            <div className="bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-transparent rounded-2xl p-3 flex flex-col items-center shrink-0 h-40 justify-center mb-3 shadow-sm">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke={theme === "dark" ? "#18181b" : "#e4e4e7"} strokeWidth="9" fill="transparent" />
                  <circle cx="50" cy="50" r="40" stroke="#06b6d4" strokeWidth="9" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * budgetPercentage) / 100} className="transition-all duration-500 stroke-cyan-500 filter drop-shadow-[0_0_4px_rgba(6,182,212,0.6)]" />
                </svg>
                <div className="absolute text-center px-1 z-20 bg-white dark:bg-zinc-950/90 rounded-full w-[76%] h-[76%] flex flex-col justify-center items-center border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-400 dark:text-zinc-500 text-[10px] block uppercase font-bold tracking-wider">{dict.spent}</span>
                  <div className="flex flex-col items-center leading-none">
                    {(totalSpentUSD > 0 || totalSpentEUR === 0) && <span className="text-lg font-black text-cyan-400">${totalSpentUSD.toFixed(2)}</span>}
                    {totalSpentEUR > 0 && <span className="text-sm font-black text-emerald-400">{totalSpentEUR.toFixed(2)}€</span>}
                  </div>
                  {isEditingBudget ? (
                    <input type="number" value={inputBudgetGoal} onChange={(e) => setInputBudgetGoal(e.target.value)} onBlur={saveBudgetGoal} onKeyDown={(e) => e.key === "Enter" && saveBudgetGoal()} className="w-16 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-center text-sm text-black dark:text-white rounded p-1 mt-1 focus:outline-none font-bold" autoFocus />
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-500 text-sm block cursor-pointer hover:text-cyan-500 font-bold mt-1" onClick={() => setIsEditingBudget(true)}>
                      / {budgetGoal} ✏️
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full shrink-0 border-b border-zinc-200 dark:border-zinc-900 pb-3 min-h-[92px] flex flex-col justify-center">
              <form onSubmit={handleManualExpenseSubmit} className="flex flex-col gap-1.5">
                <div className="grid grid-cols-[1fr_5rem_3rem] gap-1.5">
                  <input type="text" placeholder="Titre" value={manualExpenseTitle} onChange={(e) => setManualExpenseTitle(e.target.value)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none shadow-inner" />
                  <input type="number" placeholder="Montant" value={manualExpenseAmount} onChange={(e) => setManualExpenseAmount(e.target.value)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-2 text-xs text-center focus:outline-none font-mono shadow-inner" />
                  <select value={manualExpenseCurrency} onChange={(e) => setManualExpenseCurrency(e.target.value as any)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-center font-bold cursor-pointer focus:outline-none">
                    <option value="$">$</option>
                    <option value="€">€</option>
                  </select>
                </div>
                <div className="grid grid-cols-[1fr_2.5rem] gap-1.5">
                  <input type="date" value={manualExpenseDate} onChange={(e) => setManualExpenseDate(e.target.value)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none shadow-inner" />
                  <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-xl font-bold transition flex items-center justify-center">+</button>
                </div>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto mt-3 space-y-1.5 pr-1 min-h-0">
              <h3 className="text-xs font-bold text-cyan-400 mb-1.5 uppercase tracking-wide">{dict.fluxFin}</h3>
              {expenses.length === 0 ? (
                <p className="text-zinc-400 dark:text-zinc-700 text-xs italic text-center pt-4">{dict.noTrans}</p>
              ) : expenses.map((exp) => (
                <div key={exp.id} className="flex justify-between items-center bg-white dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-900/80 px-3 py-2 rounded-xl text-[13px] hover:border-cyan-500/30 shadow-sm transition">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-700 dark:text-zinc-200 truncate">{exp.title}</p>
                    <span className="text-[10px] text-zinc-400 block">📅 {exp.date} <span className="text-zinc-500 opacity-60 font-mono">id:{exp.id.slice(-4)}</span></span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={`font-mono font-bold text-sm ${exp.currency === "€" ? "text-emerald-400" : "text-cyan-400"}`}>
                      {exp.currency === "$" ? `$${exp.amount.toFixed(2)}` : `${exp.amount.toFixed(2)}€`}
                    </span>
                    <button onClick={() => deleteExpense(exp.id)} className="text-zinc-400 hover:text-red-500 text-xs ml-1">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── NUTRITION (REGISTRE VITALITÉ) ── */}
          <section className="vitality-panel min-w-0 xl:border-r border-b xl:border-b-0 border-zinc-200 dark:border-zinc-900 bg-zinc-50/10 dark:bg-zinc-950/5 p-4 flex flex-col h-full overflow-hidden">
            <div className="bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-transparent rounded-2xl p-3 flex flex-col justify-center shrink-0 h-40 w-full relative mb-3 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Calories</span>
                {isEditingCalories ? (
                  <input type="number" value={inputCalorieGoal} onChange={(e) => setInputCalorieGoal(e.target.value)} onBlur={saveCalorieGoal} onKeyDown={(e) => e.key === "Enter" && saveCalorieGoal()} className="w-18 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-center text-sm text-black dark:text-white rounded p-1 focus:outline-none font-bold" autoFocus />
                ) : (
                  <span className="text-sm font-bold text-zinc-400 dark:text-zinc-500 font-mono cursor-pointer hover:text-emerald-500" onClick={() => setIsEditingCalories(true)}>
                    {dict.goal}: <span className="text-emerald-400 font-black">{calorieGoal}</span> ✏️
                  </span>
                )}
              </div>
              <h4 className="text-2xl font-black text-emerald-400 my-0.5">{totalCaloriesEaten} <span className="text-xs font-normal text-zinc-400">kcal</span></h4>
              <div className="w-full bg-zinc-200 dark:bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-800 my-1 shadow-inner">
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${Math.min((totalCaloriesEaten / calorieGoal) * 100, 100)}%` }} />
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold">{dict.remaining} : <span className="font-mono text-emerald-400 font-black">{calorieRemaining} kcal</span></div>
              
              <button 
                type="button" 
                onClick={() => setShowProfileModal(true)} 
                className="mt-2 w-full bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/40 text-emerald-500 rounded-xl py-1.5 text-[11px] font-mono tracking-wider font-bold uppercase transition shadow-sm"
              >
                {dict.btnCalc}
              </button>
            </div>

            <div className="w-full shrink-0 border-b border-zinc-200 dark:border-zinc-900 pb-3 min-h-[92px] flex flex-col justify-center">
              <form onSubmit={handleManualCalorieSubmit} className="grid grid-cols-[1fr_5rem_2.5rem] gap-1.5 items-stretch">
                <input type="text" placeholder="Repas" value={manualFoodName} onChange={(e) => setManualFoodName(e.target.value)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none shadow-inner" />
                <input type="number" placeholder="kcal" value={manualCalories} onChange={(e) => setManualCalories(e.target.value)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-2 text-xs text-center focus:outline-none font-mono shadow-inner" />
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-xl font-bold transition flex items-center justify-center">+</button>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto mt-3 space-y-1.5 pr-1 min-h-0">
              <h3 className="text-xs font-bold text-emerald-400 mb-1.5 uppercase tracking-wide">{dict.regVit}</h3>
              {caloriesList.length === 0 ? (
                <p className="text-zinc-400 dark:text-zinc-700 text-xs italic text-center pt-4">{dict.noMeal}</p>
              ) : caloriesList.map((cal) => (
                <div key={cal.id} className="flex justify-between items-center bg-white dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-900/80 px-3 py-2 rounded-xl text-[13px] hover:border-emerald-500/30 shadow-sm transition">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-700 dark:text-zinc-300 truncate">{cal.foodName}</p>
                    <span className="text-[10px] text-zinc-400 block">📅 {cal.date} <span className="text-zinc-500 opacity-60 font-mono">id:{cal.id.slice(-4)}</span></span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="font-mono text-emerald-400 font-bold text-sm">{cal.calories} kcal</span>
                    <button onClick={() => deleteCalorie(cal.id)} className="text-zinc-400 hover:text-red-500 text-xs ml-1">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── CHAT CONTROLLER AVEC LE GRAND CHAT ACCENTUÉ ── */}
          <aside className="vitality-panel min-w-0 xl:border-l border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden relative h-full w-full">
            
            {/* EN-TÊTE SANS BOUTON */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-900/60 shrink-0 flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              <h2 className="font-bold text-xs text-zinc-800 dark:text-zinc-100 uppercase font-mono tracking-wider">{dict.ctrlTitle}</h2>
            </div>

            {/* FLUX DE CONVERSATION */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 p-4 min-h-0 bg-white dark:bg-black/20">
              {echoMessages.length === 0 ? (
                <p className="text-zinc-400 dark:text-zinc-600 text-xs italic text-center mt-4">En attente de commandes...</p>
              ) : echoMessages.map((msg, idx) => {
                const isEcho  = /^Echo\s*:/i.test(msg.raw);
                const isUser  = /^(You|Toi)\s*:/i.test(msg.raw);
                const isLastE = isEcho && idx === lastEchoIndex;
                const text    = msg.raw.replace(/^(Echo|You|Toi)\s*:\s*/i, "");

                return (
                  <div key={idx} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                    {isUser && msg.imageB64 && (
                      <img src={msg.imageB64} alt="upload" className="max-w-[160px] max-h-[120px] rounded-xl border border-zinc-700 object-cover shadow-md mb-1" />
                    )}
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm font-medium leading-relaxed tracking-wide transition-all break-words overflow-hidden ${
                      isUser
                        ? "bg-cyan-600 text-white rounded-br-none shadow-sm"
                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-bl-none border border-zinc-200 dark:border-zinc-800/80"
                    } ${isLastE && echoState === "thinking" ? "animate-pulse" : ""}`}>
                      {text}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* BARRE DE SAISIE ET RACCOURCIS ÉPURÉS */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shrink-0">
              {imageBase64 && (
                <div className="mb-2 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-xl text-[11px] text-emerald-400">
                  <div className="flex items-center gap-2 truncate">
                    <img src={imageBase64} alt="preview" className="w-8 h-8 rounded object-cover border border-emerald-500/30" />
                    <span className="truncate font-medium">{imageName || "Image prête"}</span>
                  </div>
                  <button onClick={() => { setImageBase64(null); setImageName(null); }} className="text-zinc-400 hover:text-red-500 font-bold ml-2">✕</button>
                </div>
              )}

              <div className="flex flex-col gap-2 relative">
                <div className="flex gap-2 items-center relative w-full">
                  <input
                    type="text"
                    placeholder="Rentre une transaction ou une modification (ex: Change l'assurance pour 100)..."
                    maxLength={getMessageMaxLength(userTier || "free")}
                    value={inputEcho}
                    onChange={(e) => setInputEcho(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendEcho(); } }}
                    className="flex-1 bg-white dark:bg-zinc-900 text-black dark:text-white border border-zinc-200 dark:border-zinc-800 rounded-xl pl-4 pr-12 py-4 text-xs focus:outline-none transition-all shadow-inner placeholder-zinc-400"
                  />
                  <div className="absolute right-2 flex items-center">
                    <button onClick={() => handleSendEcho()} className="bg-cyan-600 text-white font-bold h-9 w-9 text-xs rounded-xl flex items-center justify-center hover:bg-cyan-500 transition-colors shadow-md">➔</button>
                  </div>
                </div>

                {/* LIENS COMPACTS EN DESSOUS */}
                <div className="flex items-center justify-end gap-2 text-[11px] font-mono pr-1">
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                  <button type="button" onClick={lancerDictation} className={`hover:text-red-500 transition ${isListening ? "text-red-500 font-bold animate-pulse" : "text-zinc-400"}`}>🎙️ Vocal</button>
                  <span className="text-zinc-700">|</span>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className={`hover:text-emerald-500 transition ${imageBase64 ? "text-emerald-400 font-bold" : "text-zinc-400"}`}>🖼️ Photo</button>
                </div>
              </div>
            </div>

          </aside>
        </div>
      </div>

      {/* POP-UP MODAL PROFIL */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <form 
            onSubmit={handleSubmitModalProfile}
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 text-xs text-zinc-800 dark:text-zinc-100"
          >
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900/60 pb-2">
              <h3 className="text-base font-bold text-emerald-400 flex items-center gap-1.5">⚖️ {dict.title}</h3>
              <button type="button" onClick={() => setShowProfileModal(false)} className="text-zinc-400 hover:text-red-500 font-bold text-sm">✕</button>
            </div>
            
            <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed text-[11px]">
              {dict.desc}
            </p>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center mb-0.5">
                <label className="font-bold text-zinc-600 dark:text-zinc-400">{dict.weight}</label>
                <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <button type="button" onClick={() => setWeightUnit("kg")} className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all ${weightUnit === "kg" ? "bg-emerald-500 text-white shadow-sm" : "text-zinc-400"}`}>Kg</button>
                  <button type="button" onClick={() => setWeightUnit("lbs")} className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all ${weightUnit === "lbs" ? "bg-emerald-500 text-white shadow-sm" : "text-zinc-400"}`}>Lbs</button>
                </div>
              </div>
              <div className="relative">
                <input required type="number" step="0.1" value={modalWeight} onChange={(e) => setModalWeight(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 font-mono font-bold text-sm focus:outline-none" />
                <span className="absolute right-3 top-3 font-mono font-bold text-zinc-400 uppercase text-[11px]">{weightUnit}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center mb-0.5">
                <label className="font-bold text-zinc-600 dark:text-zinc-400">{dict.height}</label>
                <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <button type="button" onClick={() => setHeightUnit("cm")} className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all ${heightUnit === "cm" ? "bg-emerald-500 text-white shadow-sm" : "text-zinc-400"}`}>Cm</button>
                  <button type="button" onClick={() => setHeightUnit("ft")} className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all ${heightUnit === "ft" ? "bg-emerald-500 text-white shadow-sm" : "text-zinc-400"}`}>Pieds</button>
                </div>
              </div>
              
              {heightUnit === "cm" ? (
                <div className="relative">
                  <input required type="number" value={modalHeight} onChange={(e) => setModalHeight(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 font-mono font-bold text-sm focus:outline-none" />
                  <span className="absolute right-3 top-3 font-mono font-bold text-zinc-400 uppercase text-[11px]">cm</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input required type="number" placeholder="Pieds" value={modalHeight} onChange={(e) => setModalHeight(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 font-mono font-bold text-sm focus:outline-none text-center" />
                    <span className="absolute right-3 top-3 font-mono font-bold text-zinc-400 text-[11px]">ft</span>
                  </div>
                  <div className="relative">
                    <input type="number" placeholder="Pouces" value={modalHeightInches} onChange={(e) => setModalHeightInches(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 font-mono font-bold text-sm focus:outline-none text-center" />
                    <span className="absolute right-3 top-3 font-mono font-bold text-zinc-400 text-[11px]">in</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pb-2">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-600 dark:text-zinc-400">{dict.age}</label>
                <input required type="number" value={modalAge} onChange={(e) => setModalAge(e.target.value)} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 font-mono font-bold text-sm focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-600 dark:text-zinc-400">{dict.gender}</label>
                <select value={modalGender} onChange={(e) => setModalGender(e.target.value)} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 font-bold focus:outline-none h-[39px] cursor-pointer text-sm">
                  <option value="homme">{dict.male}</option>
                  <option value="femme">{dict.female}</option>
                </select>
              </div>
            </div>

            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition shadow-md uppercase tracking-wide text-xs">
              {dict.btnApply}
            </button>
          </form>
        </div>
      )}

      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center text-xs">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 text-xl">🔒</div>
            <h3 className="font-bold text-base mb-1">Limite atteinte</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed">Votre forfait a saturé ses requêtes.</p>
            <Link href="/services" onClick={() => setShowLimitModal(false)} className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl py-2.5 px-4 font-bold transition block text-center">Voir les abonnements</Link>
          </div>
        </div>
      )}
    </main>
  );
}