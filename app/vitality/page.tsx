"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { checkQuota, getMessageMaxLength, UserTier } from "../../utils/quota";
import TutorialHeaderControls from "../components/TutorialHeaderControls";
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
  raw: string;
  imageB64?: string;
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
  const [imageName, setImageName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);

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

  // ── Safe tier helper ─────────────────────────────────────────────────────
  const safeTier = (userTier || "connected_free") as UserTier;

  const dict = {
    fr: {
      title: "Configuration Métabolique",
      desc: "Entrez vos données de base ici. Echo analysera vos besoins énergétiques et orchestrera votre stratégie de déficit calorique.",
      weight: "Poids", height: "Taille", age: "Âge", gender: "Sexe biologique",
      male: "Homme", female: "Femme",
      btnApply: "💾 Appliquer et Synchroniser Echo",
      btnCalc: "⚖️ Calculer mon Déficit",
      spent: "Dépensé", remaining: "Restant", goal: "Objectif",
      fluxFin: "📋 FINANCIAL FLOW", regVit: "🍏 VITALITY LOG",
      ctrlTitle: "🤖 ECHO VITALITY CONTROLLER",
      noTrans: "Aucune transaction enregistrée.", noMeal: "Aucun repas enregistré.",
      placeholder: "Rentre une transaction ou un repas (ex: Pizza 600 kcal)...",
    },
    en: {
      title: "Metabolic Configuration",
      desc: "Enter your primary body data here. Echo will analyze your energy needs and personalize your calorie target.",
      weight: "Weight", height: "Height", age: "Age", gender: "Biological Sex",
      male: "Male", female: "Female",
      btnApply: "💾 Apply and Sync Echo",
      btnCalc: "⚖️ Calculate My Deficit",
      spent: "Spent", remaining: "Remaining", goal: "Goal",
      fluxFin: "📋 FINANCIAL FLOW", regVit: "🍏 VITALITY LOG",
      ctrlTitle: "🤖 ECHO VITALITY CONTROLLER",
      noTrans: "No transactions recorded.", noMeal: "No meals logged.",
      placeholder: "Log a transaction or meal (e.g. Pizza 600 kcal)...",
    },
  }[lang === "fr" ? "fr" : "en"];

  // ── Storage keys ──────────────────────────────────────────────────────────
  const getVitalityConvoKey   = (uid: string | null) => uid ? `echo-vitality-conversation-${uid}` : "echo-vitality-conversation";
  const getExpensesKey        = (uid: string | null) => uid ? `echo-budget-expenses-${uid}` : "echo-budget-expenses";
  const getCaloriesKey        = (uid: string | null) => uid ? `echo-calorie-logs-${uid}` : "echo-calorie-logs";
  const getBudgetGoalKey      = (uid: string | null) => uid ? `echo-budget-goal-${uid}` : "echo-budget-goal";
  const getCalorieGoalKey     = (uid: string | null) => uid ? `echo-calorie-goal-${uid}` : "echo-calorie-goal";
  const getVitalityProfileKey = (uid: string | null) => uid ? `echo-vitality-profile-${uid}` : "echo-vitality-profile";

  const lastEchoIndex = echoMessages.findLastIndex((m) => /^Echo\s*:/i.test(m.raw));
  const serializeMsgs   = (msgs: VitalityMessage[]) => msgs.map(m => m.raw);
  const deserializeMsgs = (raws: string[]): VitalityMessage[] => raws.map(r => ({ raw: r }));

  // ── Init ──────────────────────────────────────────────────────────────────
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

        const savedBGoal = localStorage.getItem(getBudgetGoalKey(uid)) || localStorage.getItem("echo-budget-goal");
        if (savedBGoal) { setBudgetGoal(Number(savedBGoal)); setInputBudgetGoal(savedBGoal); }

        const savedCGoal = localStorage.getItem(getCalorieGoalKey(uid)) || localStorage.getItem("echo-calorie-goal");
        if (savedCGoal) { setCalorieGoal(Number(savedCGoal)); setInputCalorieGoal(savedCGoal); }

        const savedProfile = localStorage.getItem(getVitalityProfileKey(uid));
        if (savedProfile) {
          const p = JSON.parse(savedProfile);
          setUserWeight(p.weight || ""); setUserHeight(p.height || "");
          setModalWeight(p.weight || ""); setModalHeight(p.height || "");
        }

        if (!localStorage.getItem("echo-tuto-vitality-done-v1")) setTutorialStep(1);
      } catch (e) { console.error("Init error", e); }
      setIsLoaded(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        setUserId(null); setExpenses([]); setCaloriesList([]); setEchoMessages([]); return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const uid = session.user.id;
        setUserId(uid);
        setExpenses(JSON.parse(localStorage.getItem(getExpensesKey(uid)) || "[]"));
        setCaloriesList(JSON.parse(localStorage.getItem(getCaloriesKey(uid)) || "[]"));
        const convo = localStorage.getItem(getVitalityConvoKey(uid));
        setEchoMessages(convo ? deserializeMsgs(JSON.parse(convo)) : []);
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

  // ── Persistence ───────────────────────────────────────────────────────────
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

  // ── Computed ──────────────────────────────────────────────────────────────
  const totalSpentUSD      = expenses.filter(i => i.currency === "$").reduce((s, i) => s + i.amount, 0);
  const totalSpentEUR      = expenses.filter(i => i.currency === "€").reduce((s, i) => s + i.amount, 0);
  const totalSpentCombined = totalSpentUSD + totalSpentEUR;
  const budgetPercentage   = Math.min((totalSpentCombined / budgetGoal) * 100, 100);
  const totalCaloriesEaten = caloriesList.reduce((s, i) => s + i.calories, 0);
  const calorieRemaining   = Math.max(calorieGoal - totalCaloriesEaten, 0);

  // ── Image compression ─────────────────────────────────────────────────────
  const compressImage = (base64: string): Promise<string> =>
    new Promise((resolve) => {
      const img = document.createElement("img");
      img.onload = () => {
        const MAX = 1200;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round((h * MAX) / w); w = MAX; }
          else { w = Math.round((w * MAX) / h); h = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = base64;
    });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string);
      setImageBase64(compressed);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSendEcho = async (forcedText?: string) => {
    if (echoState === "thinking") return;
    const textToSubmit = forcedText ?? inputEcho.trim();
    if (!textToSubmit && !imageBase64) return;

    // ── Quota check — use connected_free as fallback, never "free" ──
    const quotaStatus = checkQuota("prompts", safeTier);
    if (!quotaStatus.allowed) {
      const lockMsg = lang === "fr"
        ? "Echo: 🔒 Limite mensuelle de requêtes atteinte. Passez au plan supérieur pour continuer."
        : "Echo: 🔒 Monthly prompt limit reached. Please upgrade to continue.";
      setEchoMessages(prev => [...prev, { raw: lockMsg }]);
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

    const userEntry: VitalityMessage = { raw: userRaw, imageB64: currentImage ?? undefined };
    const baseMessages = [...echoMessages, userEntry];

    setEchoState("thinking");
    setEchoMessages([...baseMessages, { raw: "Echo: ..." }]);
    if (!forcedText) setInputEcho("");
    setImageBase64(null);
    setImageName(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSubmit || `Analyse cette image${currentName ? ` (${currentName})` : ""}.`,
          image: currentImage ?? null,
          history: serializeMsgs(baseMessages),
          userTier: safeTier,
          currentExpenses: expenses,
          currentCalories: caloriesList,
          budgetGoal, calorieGoal,
          vitalityProfile: { weight: userWeight, height: userHeight },
          source: "vitality",
        }),
      });

      const data = await response.json();
      setEchoState("speaking");

      let isActionBlocked = false;
      if (data.action) {
        // ── Quota check for action — same fix ──
        const actionQuota = checkQuota("vitality", safeTier);
        if (!actionQuota.allowed) {
          setActiveLimitCategory("vitality");
          setShowLimitModal(true);
          isActionBlocked = true;
        }
      }

      const quotaNotice = isActionBlocked ? `\n\n[🔒 Action automatique bloquée par quota Vitalité]` : "";
      const echoText = data.response || (typeof data === "string" ? data : "");
      setEchoMessages([...baseMessages, { raw: `Echo: ${echoText}${quotaNotice}` }]);

      if (data.action && !isActionBlocked) {
        const { type, payload } = data.action;

        if (type === "ADD_BUDGET_EXPENSE") {
          const { title, amount, spent, date, paymentDate, paidAt, currency } = payload;
          const entryDate = paymentDate || paidAt || date || new Date().toLocaleDateString("fr-CA");
          const detectedCurrency = currency || (textToSubmit.toLowerCase().includes("euro") || textToSubmit.includes("€") ? "€" : "$");
          setExpenses(prev => [...prev, { id: Date.now().toString(), title: title || "Purchase", amount: parseFloat(amount ?? spent) || 0, currency: detectedCurrency, date: entryDate }]);
        }
        if (type === "UPDATE_BUDGET_EXPENSE") {
          const { id, title, amount, currency, date } = payload;
          setExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, title: title || exp.title, amount: amount !== undefined ? parseFloat(amount) : exp.amount, currency: currency || exp.currency, date: date || exp.date } : exp));
        }
        if (type === "DELETE_BUDGET_EXPENSE" && payload.id) deleteExpense(payload.id);
        if (type === "ADD_CALORIE_LOG") {
          const { foodName, meal, title, calories } = payload;
          setCaloriesList(prev => [...prev, { id: Date.now().toString(), foodName: foodName || meal || title || "Food Item", calories: parseInt(calories) || 0, date: new Date().toLocaleDateString("fr-CA") }]);
        }
        if (type === "DELETE_CALORIE_LOG" && payload.id) deleteCalorie(payload.id);
        if (type === "SET_BUDGET_GOAL" || type === "UPDATE_BUDGET_GOAL") {
          const nextGoal = parseInt(payload.goal ?? payload.budgetGoal ?? payload.amount ?? payload.spent);
          if (Number.isFinite(nextGoal) && nextGoal > 0) { setBudgetGoal(nextGoal); setInputBudgetGoal(nextGoal.toString()); }
        }
        if (type === "SET_CALORIE_GOAL" || type === "UPDATE_CALORIE_GOAL") {
          const nextGoal = parseInt(payload.goal ?? payload.calorieGoal ?? payload.calories);
          if (payload.weight) setUserWeight(String(payload.weight));
          if (payload.height) setUserHeight(String(payload.height));
          if (Number.isFinite(nextGoal) && nextGoal > 0) { setCalorieGoal(nextGoal); setInputCalorieGoal(nextGoal.toString()); }
        }
      }
    } catch {
      setEchoMessages([...baseMessages, { raw: "Echo: Unable to reach backend server." }]);
    }
    setTimeout(() => setEchoState("idle"), 10000);
  };

  // ── Profile modal submit ──────────────────────────────────────────────────
  const handleSubmitModalProfile = (e: React.FormEvent) => {
    e.preventDefault();
    let weightInKg = parseFloat(modalWeight);
    if (weightUnit === "lbs") weightInKg = weightInKg / 2.20462;
    let heightInCm = parseFloat(modalHeight);
    if (heightUnit === "ft") {
      heightInCm = (parseFloat(modalHeight) || 0) * 30.48 + (parseFloat(modalHeightInches) || 0) * 2.54;
    }
    const a = parseInt(modalAge);
    if (!weightInKg || !heightInCm || !a) return;
    let bmr = (10 * weightInKg) + (6.25 * heightInCm) - (5 * a);
    bmr = modalGender === "homme" ? bmr + 5 : bmr - 161;
    const tdee = Math.round(bmr * 1.35);
    setUserWeight(String(Math.round(weightInKg)));
    setUserHeight(String(Math.round(heightInCm)));
    setCalorieGoal(tdee); setInputCalorieGoal(String(tdee));
    setShowProfileModal(false);
    const contextPrompt = `[SYNCHRONISATION PROFIL] : Poids: ${Math.round(weightInKg)}kg, Taille: ${Math.round(heightInCm)}cm, Âge: ${a}ans, Sexe: ${modalGender}. TDEE estimé: ${tdee} kcal. Calcule et recommande mon objectif de déficit calorique optimal.`;
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

  const saveBudgetGoal  = () => { setBudgetGoal(parseInt(inputBudgetGoal) || 3000); setIsEditingBudget(false); };
  const saveCalorieGoal = () => { setCalorieGoal(parseInt(inputCalorieGoal) || 2300); setIsEditingCalories(false); };
  const deleteExpense   = (id: string) => setExpenses(prev => prev.filter(i => i.id !== id));
  const deleteCalorie   = (id: string) => setCaloriesList(prev => prev.filter(i => i.id !== id));

  const lancerDictation = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported."); return; }
    const r = new SR();
    r.lang = lang === "fr" ? "fr-FR" : "en-US";
    r.onstart = () => setIsListening(true);
    r.onend   = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    r.onresult = (e: any) => setInputEcho(p => p + (p ? " " : "") + e.results[0][0].transcript);
    r.start();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="vitality-page h-screen w-full bg-white dark:bg-black text-black dark:text-white flex overflow-hidden font-sans relative transition-colors duration-200 selection:bg-cyan-500/30">

      {/* ── TUTORIAL BUBBLES ── */}
      {tutorialStep === 1 && (
        <div className="absolute top-44 left-6 sm:left-72 w-80 sm:w-[460px] max-h-[85vh] overflow-y-auto bg-zinc-950 text-white dark:bg-white dark:text-black rounded-2xl p-5 shadow-[0_0_30px_rgba(6,182,212,0.6)] border-2 border-cyan-400 dark:border-cyan-500 animate-in fade-in duration-300 z-50">
          <TutorialHeaderControls onClose={() => { setTutorialStep(null); localStorage.setItem("echo-tuto-vitality-done-v1", "true"); }} />
          <div className="flex items-center gap-2.5 mb-3 border-b border-zinc-800 dark:border-zinc-200 pb-2 pr-16">
            <span>💸</span>
            <h4 className="font-black text-xs font-mono uppercase tracking-widest text-cyan-400 dark:text-cyan-600">
              {lang === "fr" ? "ECHO BUDGET (1/2)" : "ECHO BUDGET (1/2)"}
            </h4>
          </div>
          <div className="text-xs text-zinc-200 dark:text-zinc-800 leading-relaxed font-semibold mb-4 space-y-2">
            {lang === "fr" ? (
              <p>Hey! 👋 Je suis aussi là pour garder le contrôle sur ton budget. Définis ton objectif financier en haut, puis parle-moi dans le chat — je m'occupe du reste. ✨<br /><br />
              <span className="text-cyan-400 dark:text-cyan-600 font-mono text-[11px]">EXEMPLES :</span><br />
              • "Ajoute une facture d'électricité de 200$"<br />• "Épicerie 145$"<br />• "60$ d'essence"</p>
            ) : (
              <p>Hey! 👋 I'm here to help you stay on track with finances. Set your goal above, then just tell me what you spent — I'll handle the rest. ✨<br /><br />
              <span className="text-cyan-400 dark:text-cyan-600 font-mono text-[11px]">EXAMPLES:</span><br />
              • "Add a $200 electricity bill"<br />• "Groceries $145"<br />• "Gas $60"</p>
            )}
          </div>
          <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800 dark:border-zinc-200">
            <button onClick={() => setTutorialStep(2)} className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs tracking-widest uppercase transition-all shadow-md">
              {lang === "fr" ? "SUIVANT ➔" : "NEXT ➔"}
            </button>
          </div>
        </div>
      )}

      {tutorialStep === 2 && (
        <div className="absolute top-64 left-6 sm:left-[450px] w-80 sm:w-[460px] max-h-[85vh] overflow-y-auto bg-zinc-950 text-white dark:bg-white dark:text-black rounded-2xl p-5 shadow-[0_0_30px_rgba(16,185,129,0.5)] border-2 border-emerald-400 dark:border-emerald-500 animate-in fade-in duration-300 z-50">
          <TutorialHeaderControls onClose={() => { setTutorialStep(null); localStorage.setItem("echo-tuto-vitality-done-v1", "true"); }} />
          <div className="flex items-center gap-2.5 mb-3 border-b border-zinc-800 dark:border-zinc-200 pb-2 pr-16">
            <span>🔥</span>
            <h4 className="font-black text-xs font-mono uppercase tracking-widest text-emerald-400 dark:text-emerald-600">
              {lang === "fr" ? "ECHO CALORIES (2/2)" : "ECHO CALORIES (2/2)"}
            </h4>
          </div>
          <div className="text-xs text-zinc-200 dark:text-zinc-800 leading-relaxed font-semibold mb-4">
            {lang === "fr" ? (
              <p>Salut! 😋 Chaque repas devient une donnée utile. Parle-moi de ce que tu manges et je calcule tout automatiquement.<br /><br />
              <span className="text-emerald-400 dark:text-emerald-600 font-mono text-[11px]">EXEMPLES :</span><br />
              • "Fish &amp; Chips, calcule les calories"<br />• "Deux pointes de pizza"<br />• "Barre protéinée 200 calories"</p>
            ) : (
              <p>Hi! 😋 Every meal is useful data. Tell me what you ate and I'll calculate everything automatically.<br /><br />
              <span className="text-emerald-400 dark:text-emerald-600 font-mono text-[11px]">EXAMPLES:</span><br />
              • "Fish &amp; Chips, evaluate calories"<br />• "Two pizza slices"<br />• "Protein bar 200 calories"</p>
            )}
          </div>
          <button onClick={() => { setTutorialStep(null); localStorage.setItem("echo-tuto-vitality-done-v1", "true"); }} className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs tracking-widest uppercase transition-all shadow-md">
            {lang === "fr" ? "C'EST PARTI ! 🚀" : "LET'S LOG ! 🚀"}
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden min-h-0 w-full">

        {/* ── SIDEBAR ── */}
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
            Status : <span className="text-cyan-500 dark:text-cyan-400 uppercase font-bold block">{safeTier}</span>
          </div>
        </aside>

        {/* ── 3-COLUMN GRID ── */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1.1fr_1.1fr_2.8fr] overflow-hidden bg-white dark:bg-black h-full w-full">

          {/* ── FINANCES ── */}
          <section className="min-w-0 xl:border-r border-b xl:border-b-0 border-zinc-200 dark:border-zinc-900 bg-zinc-50/10 dark:bg-zinc-950/5 p-4 flex flex-col h-full overflow-hidden">

            {/* Ring chart */}
            <div className="bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-transparent rounded-2xl p-3 flex flex-col items-center shrink-0 h-40 justify-center mb-3 shadow-sm">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke={theme === "dark" ? "#18181b" : "#e4e4e7"} strokeWidth="9" fill="transparent" />
                  <circle cx="50" cy="50" r="40" stroke="#06b6d4" strokeWidth="9" fill="transparent"
                    strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * budgetPercentage) / 100}
                    className="transition-all duration-500 stroke-cyan-500 filter drop-shadow-[0_0_4px_rgba(6,182,212,0.6)]" />
                </svg>
                <div className="absolute z-20 bg-white dark:bg-zinc-950/90 rounded-full w-[76%] h-[76%] flex flex-col justify-center items-center border border-zinc-200 dark:border-zinc-800 text-center px-1">
                  <span className="text-zinc-400 dark:text-zinc-500 text-[9px] uppercase font-bold tracking-wider">{dict.spent}</span>
                  <div className="flex flex-col items-center leading-none">
                    {(totalSpentUSD > 0 || totalSpentEUR === 0) && <span className="text-lg font-black text-cyan-400">${totalSpentUSD.toFixed(2)}</span>}
                    {totalSpentEUR > 0 && <span className="text-sm font-black text-emerald-400">{totalSpentEUR.toFixed(2)}€</span>}
                  </div>
                  {isEditingBudget ? (
                    <input type="number" value={inputBudgetGoal} onChange={e => setInputBudgetGoal(e.target.value)}
                      onBlur={saveBudgetGoal} onKeyDown={e => e.key === "Enter" && saveBudgetGoal()}
                      className="w-16 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-center text-sm text-black dark:text-white rounded p-1 mt-1 focus:outline-none font-bold" autoFocus />
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-500 text-sm cursor-pointer hover:text-cyan-500 font-bold mt-1" onClick={() => setIsEditingBudget(true)}>
                      / {budgetGoal} ✏️
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Manual form */}
            <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-900 pb-3">
              <form onSubmit={handleManualExpenseSubmit} className="flex flex-col gap-1.5">
                <div className="grid grid-cols-[1fr_5rem_3rem] gap-1.5">
                  <input type="text" placeholder="Titre" value={manualExpenseTitle} onChange={e => setManualExpenseTitle(e.target.value)}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none shadow-inner" />
                  <input type="number" placeholder="Montant" value={manualExpenseAmount} onChange={e => setManualExpenseAmount(e.target.value)}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-2 text-xs text-center focus:outline-none font-mono shadow-inner" />
                  <select value={manualExpenseCurrency} onChange={e => setManualExpenseCurrency(e.target.value as any)}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-center font-bold cursor-pointer focus:outline-none">
                    <option value="$">$</option><option value="€">€</option>
                  </select>
                </div>
                <div className="grid grid-cols-[1fr_2.5rem] gap-1.5">
                  <input type="date" value={manualExpenseDate} onChange={e => setManualExpenseDate(e.target.value)}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none shadow-inner" />
                  <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-xl font-bold transition flex items-center justify-center">+</button>
                </div>
              </form>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto mt-3 space-y-1.5 pr-1 min-h-0">
              <h3 className="text-xs font-bold text-cyan-400 mb-1.5 uppercase tracking-wide">{dict.fluxFin}</h3>
              {expenses.length === 0 ? (
                <p className="text-zinc-400 dark:text-zinc-700 text-xs italic text-center pt-4">{dict.noTrans}</p>
              ) : expenses.map(exp => (
                <div key={exp.id} className="flex justify-between items-center bg-white dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-900/80 px-3 py-2 rounded-xl hover:border-cyan-500/30 shadow-sm transition">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-700 dark:text-zinc-200 truncate text-[13px]">{exp.title}</p>
                    <span className="text-[10px] text-zinc-400">📅 {exp.date} <span className="opacity-50 font-mono">#{exp.id.slice(-4)}</span></span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={`font-mono font-bold text-sm ${exp.currency === "€" ? "text-emerald-400" : "text-cyan-400"}`}>
                      {exp.currency === "$" ? `$${exp.amount.toFixed(2)}` : `${exp.amount.toFixed(2)}€`}
                    </span>
                    <button onClick={() => deleteExpense(exp.id)} className="text-zinc-400 hover:text-red-500 text-xs">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── NUTRITION ── */}
          <section className="min-w-0 xl:border-r border-b xl:border-b-0 border-zinc-200 dark:border-zinc-900 bg-zinc-50/10 dark:bg-zinc-950/5 p-4 flex flex-col h-full overflow-hidden">

            {/* Calorie card */}
            <div className="bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-transparent rounded-2xl p-3 flex flex-col justify-center shrink-0 h-40 w-full mb-3 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Calories</span>
                {isEditingCalories ? (
                  <input type="number" value={inputCalorieGoal} onChange={e => setInputCalorieGoal(e.target.value)}
                    onBlur={saveCalorieGoal} onKeyDown={e => e.key === "Enter" && saveCalorieGoal()}
                    className="w-20 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-center text-sm text-black dark:text-white rounded p-1 focus:outline-none font-bold" autoFocus />
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
              <button type="button" onClick={() => setShowProfileModal(true)}
                className="mt-2 w-full bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/40 text-emerald-500 rounded-xl py-1.5 text-[11px] font-mono tracking-wider font-bold uppercase transition shadow-sm">
                {dict.btnCalc}
              </button>
            </div>

            {/* Manual calorie form */}
            <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-900 pb-3">
              <form onSubmit={handleManualCalorieSubmit} className="grid grid-cols-[1fr_5rem_2.5rem] gap-1.5 items-stretch">
                <input type="text" placeholder="Repas" value={manualFoodName} onChange={e => setManualFoodName(e.target.value)}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none shadow-inner" />
                <input type="number" placeholder="kcal" value={manualCalories} onChange={e => setManualCalories(e.target.value)}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-2 text-xs text-center focus:outline-none font-mono shadow-inner" />
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-xl font-bold transition flex items-center justify-center">+</button>
              </form>
            </div>

            {/* Calorie list */}
            <div className="flex-1 overflow-y-auto mt-3 space-y-1.5 pr-1 min-h-0">
              <h3 className="text-xs font-bold text-emerald-400 mb-1.5 uppercase tracking-wide">{dict.regVit}</h3>
              {caloriesList.length === 0 ? (
                <p className="text-zinc-400 dark:text-zinc-700 text-xs italic text-center pt-4">{dict.noMeal}</p>
              ) : caloriesList.map(cal => (
                <div key={cal.id} className="flex justify-between items-center bg-white dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-900/80 px-3 py-2 rounded-xl hover:border-emerald-500/30 shadow-sm transition">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-700 dark:text-zinc-300 truncate text-[13px]">{cal.foodName}</p>
                    <span className="text-[10px] text-zinc-400">📅 {cal.date} <span className="opacity-50 font-mono">#{cal.id.slice(-4)}</span></span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="font-mono text-emerald-400 font-bold text-sm">{cal.calories} kcal</span>
                    <button onClick={() => deleteCalorie(cal.id)} className="text-zinc-400 hover:text-red-500 text-xs">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── CHAT CONTROLLER ── */}
          <aside className="min-w-0 xl:border-l border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden relative h-full w-full">

            {/* Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-900/60 shrink-0 flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              <h2 className="font-bold text-xs text-zinc-800 dark:text-zinc-100 uppercase font-mono tracking-wider">{dict.ctrlTitle}</h2>
            </div>

            {/* Messages — same layout as ChatPage */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-white dark:bg-black/20">
              {echoMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 p-6">
                  {!tutorialStep && (
                    <div className={`w-12 h-12 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full flex items-center justify-center shadow-inner ${echoState === "idle" ? "echo-idle" : echoState === "thinking" ? "echo-thinking" : "echo-speaking"}`}>
                      <img src="/Echo.png" alt="Echo" className="w-full h-full object-cover rounded-full" />
                    </div>
                  )}
                  <p className="text-zinc-400 dark:text-zinc-600 text-xs italic text-center">
                    {lang === "fr" ? "En attente d'instructions financières ou métaboliques..." : "Awaiting financial or metabolic commands..."}
                  </p>
                </div>
              ) : (
                <div className="max-w-none px-5 py-6 flex flex-col gap-7">
                  {echoMessages.map((msg, idx) => {
                    const isEcho  = /^Echo\s*:/i.test(msg.raw);
                    const isUser  = /^(You|Toi)\s*:/i.test(msg.raw);
                    const isLastE = isEcho && idx === lastEchoIndex;
                    const text    = msg.raw.replace(/^(Echo|You|Toi)\s*:\s*/i, "");

                    // Hide profile sync system messages
                    if (text.startsWith("[SYNCHRONISATION PROFIL]")) return null;

                    if (isEcho) {
                      return (
                        <div key={idx} className="flex flex-col gap-3 animate-in fade-in duration-300">
                          <div className="flex items-center gap-2">
                            <img src="/Echo.png" alt="Echo"
                              className={`w-6 h-6 rounded-full object-contain shrink-0 border border-zinc-200 dark:border-zinc-800 ${isLastE ? echoState === "thinking" ? "echo-thinking" : echoState === "speaking" ? "echo-speaking" : "echo-idle" : "echo-idle"}`} />
                            <span className="text-zinc-500 dark:text-zinc-400 text-[11px] font-mono uppercase tracking-widest font-bold">Echo</span>
                          </div>
                          <div className="text-zinc-800 dark:text-zinc-200 text-[14px] leading-7 font-normal tracking-wide selection:bg-cyan-500/30 flex flex-col gap-4 pl-8">
                            {text.split(/\n\n+/).map((block, i) => (
                              <p key={i} className="whitespace-pre-wrap break-words">{block}</p>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (isUser) {
                      return (
                        <div key={idx} className="flex flex-col items-end animate-in fade-in duration-200">
                          {msg.imageB64 && (
                            <img src={msg.imageB64} alt="upload" className="max-w-[150px] max-h-[120px] rounded-xl border border-zinc-700 object-cover shadow-md mb-1.5" />
                          )}
                          <div className="max-w-[80%] text-right">
                            <p className="text-zinc-700 dark:text-zinc-300 text-[13px] leading-6 tracking-wide bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 inline-block text-left whitespace-pre-wrap break-words selection:bg-cyan-500/30">
                              {text}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Input zone */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shrink-0">

              {/* Image preview */}
              {imageBase64 && (
                <div className="mb-2 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-xl text-[11px] text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-center gap-2 truncate">
                    <img src={imageBase64} alt="preview" className="w-8 h-8 rounded object-cover border border-emerald-500/30 shrink-0" />
                    <span className="truncate font-medium">{imageName || (lang === "fr" ? "Image prête" : "Image ready")}</span>
                  </div>
                  <button onClick={() => { setImageBase64(null); setImageName(null); }} className="text-zinc-400 hover:text-red-500 font-bold ml-2 shrink-0">✕</button>
                </div>
              )}

              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

              <div className="flex gap-2 items-end">
                <textarea
                  value={inputEcho}
                  maxLength={getMessageMaxLength(safeTier)}
                  onChange={e => setInputEcho(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendEcho(); } }}
                  rows={3}
                  placeholder={dict.placeholder}
                  className="flex-1 bg-white dark:bg-zinc-900 text-black dark:text-white border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs resize-none focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 transition-colors leading-relaxed shadow-inner placeholder-zinc-400"
                />
                <div className="flex flex-col gap-2 w-12 shrink-0 self-end">
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className={`h-9 w-full rounded-xl flex items-center justify-center border text-sm transition-all ${imageBase64 ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900"}`}
                    title={lang === "fr" ? "Importer une image" : "Import image"}>
                    {imageBase64 ? "✓" : "🖼️"}
                  </button>
                  <button type="button" onClick={lancerDictation}
                    className={`h-9 w-full rounded-xl flex items-center justify-center border text-sm transition-all ${isListening ? "bg-red-600 border-red-500 text-white animate-pulse" : "border-cyan-500/30 text-cyan-500 bg-cyan-500/10 hover:border-cyan-400"}`}>
                    {isListening ? "🔴" : "🎤"}
                  </button>
                  <button onClick={() => handleSendEcho()}
                    className="h-9 w-full bg-cyan-600 hover:bg-cyan-500 rounded-xl flex items-center justify-center text-white text-sm font-bold transition-all shadow-md">
                    ➔
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── PROFILE MODAL ── */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSubmitModalProfile}
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 text-xs text-zinc-800 dark:text-zinc-100">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900/60 pb-2">
              <h3 className="text-base font-bold text-emerald-400 flex items-center gap-1.5">⚖️ {dict.title}</h3>
              <button type="button" onClick={() => setShowProfileModal(false)} className="text-zinc-400 hover:text-red-500 font-bold text-sm">✕</button>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed text-[11px]">{dict.desc}</p>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center mb-0.5">
                <label className="font-bold text-zinc-600 dark:text-zinc-400">{dict.weight}</label>
                <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-800">
                  {(["kg", "lbs"] as const).map(u => (
                    <button key={u} type="button" onClick={() => setWeightUnit(u)}
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all ${weightUnit === u ? "bg-emerald-500 text-white" : "text-zinc-400"}`}>{u}</button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <input required type="number" step="0.1" value={modalWeight} onChange={e => setModalWeight(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 font-mono font-bold text-sm focus:outline-none" />
                <span className="absolute right-3 top-3 font-mono font-bold text-zinc-400 uppercase text-[11px]">{weightUnit}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center mb-0.5">
                <label className="font-bold text-zinc-600 dark:text-zinc-400">{dict.height}</label>
                <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-800">
                  {(["cm", "ft"] as const).map(u => (
                    <button key={u} type="button" onClick={() => setHeightUnit(u)}
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all ${heightUnit === u ? "bg-emerald-500 text-white" : "text-zinc-400"}`}>{u}</button>
                  ))}
                </div>
              </div>
              {heightUnit === "cm" ? (
                <div className="relative">
                  <input required type="number" value={modalHeight} onChange={e => setModalHeight(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 font-mono font-bold text-sm focus:outline-none" />
                  <span className="absolute right-3 top-3 font-mono font-bold text-zinc-400 uppercase text-[11px]">cm</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input required type="number" placeholder="Pieds" value={modalHeight} onChange={e => setModalHeight(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 font-mono font-bold text-sm focus:outline-none text-center" />
                    <span className="absolute right-3 top-3 font-mono font-bold text-zinc-400 text-[11px]">ft</span>
                  </div>
                  <div className="relative">
                    <input type="number" placeholder="Pouces" value={modalHeightInches} onChange={e => setModalHeightInches(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 font-mono font-bold text-sm focus:outline-none text-center" />
                    <span className="absolute right-3 top-3 font-mono font-bold text-zinc-400 text-[11px]">in</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pb-2">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-600 dark:text-zinc-400">{dict.age}</label>
                <input required type="number" value={modalAge} onChange={e => setModalAge(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 font-mono font-bold text-sm focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-600 dark:text-zinc-400">{dict.gender}</label>
                <select value={modalGender} onChange={e => setModalGender(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 font-bold focus:outline-none h-[39px] cursor-pointer text-sm">
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

      {/* ── QUOTA MODAL ── */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setShowLimitModal(false)}>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center text-xs" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 text-xl">🔒</div>
            <h3 className="font-bold text-sm mb-2 uppercase font-mono tracking-wider">
              {lang === "fr" ? "Limite de Quota Atteinte" : "Plan Cycle Limit Reached"}
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed font-medium">
              {activeLimitCategory === "prompts"
                ? (lang === "fr" ? "Votre quota mensuel d'échanges avec Echo est saturé pour ce forfait." : "Your monthly prompt quota has been saturated on this tier.")
                : (lang === "fr"
                    ? `Limite d'actions automatisées atteinte pour [${activeLimitCategory}]. La réponse d'Echo a été générée mais la donnée n'a pas pu s'enregistrer.`
                    : `Automated action limit reached for [${activeLimitCategory}]. Echo's response was generated but data sync is locked.`)}
            </p>
            <Link href="/services" onClick={() => setShowLimitModal(false)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl py-2.5 px-4 font-bold transition block text-center uppercase tracking-wider text-[11px]">
              {lang === "fr" ? "Voir les abonnements 🚀" : "Upgrade Plan Tier 🚀"}
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}