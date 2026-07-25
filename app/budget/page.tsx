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
type BudgetExpense = { id: string; title: string; amount: number; currency: "$"|"US$"|"€"; date: string };
type BudgetMessage = { raw: string };

const GoogleLogo = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 2.18 2.18 4.94l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

const MicrosoftLogo = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23" fill="none">
    <path d="M0 0H11V11H0V0Z" fill="#F25022"/>
    <path d="M12 0H23V11H12V0Z" fill="#7FBA00"/>
    <path d="M0 12H11V23H0V12Z" fill="#00A4EF"/>
    <path d="M12 12H23V23H12V12Z" fill="#FFB900"/>
  </svg>
);

const PRICES: Record<Currency, { amount: string; symbol: string }> = {
  CAD: { amount: "3.99", symbol: "CA$" },
  USD: { amount: "3.99", symbol: "US$" },
  EUR: { amount: "3.99", symbol: "€" },
};

function BudgetContent() {
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

  // Core Budget
  const [expenses, setExpenses] = useState<BudgetExpense[]>([]);
  const [budgetGoal, setBudgetGoal] = useState(3000);
  const [manualExpenseTitle, setManualExpenseTitle] = useState("");
  const [manualExpenseAmount, setManualExpenseAmount] = useState("");
  const [manualExpenseCurrency, setManualExpenseCurrency] = useState<"$"|"US$"|"€">("$");
  const [manualExpenseDate, setManualExpenseDate] = useState(new Date().toLocaleDateString("fr-CA"));

  // Agent Echo
  const [inputEcho, setInputEcho] = useState("");
  const [echoMessages, setEchoMessages] = useState<BudgetMessage[]>([]);
  const [echoState, setEchoState] = useState("idle");
  const bottomRef = useRef<HTMLDivElement>(null);

  const safeTier = (userTier || "connected_free") as UserTier;

  const getBudgetGoalKey = (uid: string|null) => uid ? `echo-budget-goal-${uid}` : "echo-budget-goal";
  const getBudgetConvoKey = (uid: string|null) => uid ? `echo-budget-conversation-${uid}` : "echo-budget-conversation";

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id || null;
      if (session?.user) {
        setUser(session.user);
        verifierStatutUser(session.user.id);
        const { data: expRows } = await supabase.from("echo_expenses").select("*").eq("user_id", uid).order("date", { ascending: false });
        setExpenses((expRows||[]).map(r => ({ id: r.id, title: r.title, amount: r.amount, currency: (r.currency||"$") as "$"|"US$"|"€", date: r.date })));
      } else {
        const guestExp = localStorage.getItem("echo-budget-expenses-guest");
        if (guestExp) setExpenses(JSON.parse(guestExp));
      }

      const savedBGoal = localStorage.getItem(getBudgetGoalKey(uid)) || localStorage.getItem("echo-budget-goal");
      if (savedBGoal) setBudgetGoal(Number(savedBGoal));

      const savedConvo = localStorage.getItem(getBudgetConvoKey(uid));
      if (savedConvo) setEchoMessages(JSON.parse(savedConvo).map((r: string) => ({ raw: r })));
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

  const addExpense = async (exp: Omit<BudgetExpense, "id">) => {
    if (!user) {
      const e: BudgetExpense = { id: Date.now().toString(), ...exp };
      setExpenses(prev => {
        const n = [e, ...prev];
        localStorage.setItem("echo-budget-expenses-guest", JSON.stringify(n));
        return n;
      });
      return;
    }
    const { data, error } = await supabase.from("echo_expenses").insert({
      user_id: user.id, title: exp.title, amount: exp.amount, currency: exp.currency, date: exp.date,
    }).select().single();
    if (!error && data) {
      setExpenses(prev => [{ id: data.id, title: data.title, amount: data.amount, currency: (data.currency||"$") as "$"|"US$"|"€", date: data.date }, ...prev]);
    }
  };

  const deleteExpense = async (id: string) => {
    if (user) { await supabase.from("echo_expenses").delete().eq("id", id).eq("user_id", user.id); }
    setExpenses(prev => {
      const n = prev.filter(i => i.id !== id);
      if (!user) localStorage.setItem("echo-budget-expenses-guest", JSON.stringify(n));
      return n;
    });
  };

  const handleManualExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualExpenseTitle.trim() || !manualExpenseAmount) return;
    await addExpense({ title: manualExpenseTitle.trim(), amount: parseFloat(manualExpenseAmount)||0, currency: manualExpenseCurrency, date: manualExpenseDate||new Date().toLocaleDateString("fr-CA") });
    setManualExpenseTitle(""); setManualExpenseAmount("");
  };

  const totalSpentUSD = expenses.filter(i => i.currency === "$" || i.currency === "US$").reduce((s, i) => s + i.amount, 0);
  const totalSpentEUR = expenses.filter(i => i.currency === "€").reduce((s, i) => s + i.amount, 0);
  const totalSpentCombined = totalSpentUSD + totalSpentEUR;
  const budgetPercentage = Math.min((totalSpentCombined / budgetGoal) * 100, 100);

  const handleSendEcho = async (forcedText?: string) => {
    if (echoState === "thinking") return;
    const textToSubmit = forcedText ?? inputEcho.trim();
    if (!textToSubmit) return;

    if (!user) { setShowSignInModal(true); return; }

    const userEntry: BudgetMessage = { raw: `You: ${textToSubmit}` };
    const baseMessages = [...echoMessages, userEntry];

    setEchoState("thinking");
    setEchoMessages([...baseMessages, { raw: "Echo: ..." }]);
    if (!forcedText) setInputEcho("");

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/vitality`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSubmit,
          history: baseMessages.map(m => m.raw),
          userTier: safeTier,
          currentExpenses: expenses,
          budgetGoal,
          source: "budget",
        }),
      });

      const data = await response.json();
      setEchoState("speaking");

      setEchoMessages([...baseMessages, { raw: `Echo: ${data.response || ""}` }]);

      if (data.action?.type === "ADD_BUDGET_EXPENSE") {
        const payload = data.action.payload;
        await addExpense({
          title: payload.title || payload.name || textToSubmit || "Achat",
          amount: parseFloat(payload.amount ?? payload.price) || 0,
          currency: payload.currency || "$",
          date: payload.date || new Date().toLocaleDateString("fr-CA"),
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
          <div className="max-w-[1500px] mx-auto px-6 py-4 flex justify-between items-center relative">
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

        <div className="max-w-[1500px] mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <div className="inline-block text-[10px] font-mono tracking-widest text-cyan-600 font-bold uppercase mb-2 border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 rounded">
              {fr ? "MODULE 06 // FINANCES & GESTION DU BUDGET" : "MODULE 06 // FINANCIAL & BUDGET TRACKER"}
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 leading-[1.0] mb-2 uppercase">
              ECHO BUDGET
            </h1>
            <p className="text-zinc-500 max-w-2xl text-xs md:text-sm font-sans leading-relaxed">
              {fr ? "Gérez votre budget, enregistrez vos dépenses et laissez l'agent IA suivre vos finances." : "Manage your budget, log expenses and let the AI agent track your financial goals."}
            </p>
          </div>
          <div className="lg:col-span-4 flex justify-center lg:justify-end">
            <img src="/echo1.png" alt="Echo AI Core System" className="w-full max-w-[150px] h-auto object-contain drop-shadow-[0_10px_25px_rgba(6,182,212,0.15)]" />
          </div>
        </div>
      </section>

      {/* ── SEPARATION VAGUE BLANCHE ET STRIC CYAN ── */}
      <div className="relative w-full h-16 bg-zinc-950 overflow-hidden -mt-1 z-20">
        <svg className="absolute top-0 left-0 w-full h-full text-white fill-current" viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path d="M0,0 L1440,0 L1440,30 Q1080,90 720,50 Q360,0 0,60 Z" />
        </svg>

        <svg className="absolute top-0 left-0 w-full h-full text-transparent fill-none pointer-events-none z-22" viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path d="M0,60 Q360,0 720,50 Q1080,90 1440,30" stroke="#06b6d4" strokeWidth="6" className="drop-shadow-[0_0_12px_#06b6d4]" />
        </svg>
      </div>

      {/* ── SECTION BASSE NOIRE : GRAND OUTIL BUDGET ── */}
      <section className="bg-zinc-950 text-zinc-50 pb-16 pt-0 relative z-10 -mt-4 flex-1">
        <div className="max-w-[1500px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* COLONNE GAUCHE (DASHBOARD FINANCES) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-black/90 border-2 border-cyan-500/40 rounded-3xl p-8 shadow-[0_0_35px_rgba(6,182,212,0.15)] space-y-5">
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs text-cyan-400 font-extrabold uppercase tracking-wider">OBJECTIF FINANCIER MENSUEL</span>
                <span className="text-sm font-mono font-bold text-zinc-400">
                  Objectif: <strong className="text-cyan-400">${budgetGoal}</strong>
                </span>
              </div>

              <div className="text-4xl font-black text-cyan-400 font-mono">
                ${totalSpentCombined.toFixed(2)} <span className="text-sm font-normal text-zinc-500">dépensés</span>
              </div>

              <div className="w-full bg-zinc-900 h-4 rounded-full overflow-hidden border border-zinc-800">
                <div className="bg-cyan-500 h-full transition-all duration-500" style={{ width: `${budgetPercentage}%` }} />
              </div>
            </div>

            {/* FORMULAIRE DÉPENSE MANUELLE */}
            <form onSubmit={handleManualExpenseSubmit} className="bg-black/90 border border-zinc-800 rounded-2xl p-5 flex gap-3 flex-wrap items-center">
              <input
                type="text"
                placeholder={fr ? "Description de la dépense" : "Expense title"}
                value={manualExpenseTitle}
                onChange={e => setManualExpenseTitle(e.target.value)}
                className="flex-1 min-w-[160px] bg-zinc-900 border border-zinc-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none text-zinc-100"
              />
              <input
                type="number"
                placeholder="Montant"
                value={manualExpenseAmount}
                onChange={e => setManualExpenseAmount(e.target.value)}
                className="w-24 bg-zinc-900 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-3 text-sm font-mono text-center focus:outline-none text-zinc-100"
              />
              <select
                value={manualExpenseCurrency}
                onChange={e => setManualExpenseCurrency(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-800 text-sm font-mono rounded-xl px-3 py-3 text-zinc-200 cursor-pointer"
              >
                <option value="$">CA$</option>
                <option value="US$">US$</option>
                <option value="€">€</option>
              </select>
              <button type="submit" className="px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono font-black text-sm rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)]">+</button>
            </form>

            {/* LISTE DES TRANSACTIONS */}
            <div className="bg-black/80 border border-zinc-800 rounded-3xl p-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              <div className="text-xs font-mono font-extrabold text-cyan-400 uppercase tracking-widest">
                HISTORIQUE DES TRANSACTIONS
              </div>
              {expenses.length === 0 ? (
                <div className="text-sm font-mono text-zinc-600 italic py-4">{fr ? "Aucune dépense enregistrée." : "No transactions logged."}</div>
              ) : expenses.map(exp => (
                <div key={exp.id} className="flex justify-between items-center bg-zinc-900/70 border border-zinc-800 px-5 py-3.5 rounded-2xl hover:border-cyan-500/30 transition-colors">
                  <div>
                    <div className="text-sm font-bold text-zinc-200">{exp.title}</div>
                    <div className="text-xs font-mono text-zinc-500">{exp.date}</div>
                  </div>
                  <div className="flex items-center gap-4 font-mono">
                    <span className="text-sm font-bold text-cyan-400">{exp.currency}{exp.amount.toFixed(2)}</span>
                    <button onClick={() => deleteExpense(exp.id)} className="text-zinc-500 hover:text-red-400 text-sm cursor-pointer font-bold">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COLONNE DROITE (ECHO COMPAGNON AGENTIC BUDGET GRAND FORMAT) */}
          <div className="lg:col-span-7 bg-black/90 border-2 border-cyan-500/40 rounded-3xl p-7 flex flex-col justify-between min-h-[720px] shadow-[0_0_40px_rgba(6,182,212,0.15)]">
            <div className="border-b border-zinc-800 pb-4 flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#06b6d4]" />
              <span className="text-xs font-mono font-black text-cyan-400 uppercase tracking-widest">AGENT BUDGET AGENTIC</span>
            </div>

            <div className="flex-1 overflow-y-auto py-6 space-y-5 custom-scrollbar">
              {echoMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="w-12 h-12 rounded-full border border-cyan-500/30 bg-cyan-950/30 flex items-center justify-center text-cyan-400 font-mono text-lg">
                    ✦
                  </div>
                  <p className="text-xs font-mono text-zinc-500 italic">
                    {fr ? "Posez une question ou dictez vos dépenses à votre agent budget..." : "Ask a question or log expenses with your budget agent..."}
                  </p>
                </div>
              ) : echoMessages.map((msg, idx) => (
                <div key={idx} className={`text-sm font-mono ${msg.raw.startsWith("You:") ? "text-right" : "text-left"}`}>
                  <div className={`inline-block p-4 rounded-2xl max-w-[85%] leading-relaxed ${msg.raw.startsWith("You:") ? "bg-zinc-900 border border-zinc-800 text-zinc-200" : "bg-cyan-950/50 border border-cyan-500/40 text-cyan-200"}`}>
                    {msg.raw.replace(/^(Echo|You):\s*/i, "")}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <textarea
                value={inputEcho}
                onChange={e => setInputEcho(e.target.value)}
                onKeyDown={e => { if(e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendEcho(); } }}
                rows={3}
                placeholder={fr ? "Notez une dépense (ex: Café 5$)..." : "Log an expense (e.g. Coffee $5)..."}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-400 rounded-2xl p-4 text-sm font-mono text-zinc-100 outline-none resize-none leading-relaxed"
              />
              <button
                onClick={() => handleSendEcho()}
                className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] cursor-pointer"
              >
                {fr ? "ENVOYER À ECHO BUDGET" : "SEND TO ECHO BUDGET"}
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ── MODALE ECHOAI PREMIUM (3,99$) ── */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[99999] p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-amber-500/50 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-100 text-center relative">
            <button type="button" onClick={() => setShowPremiumModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white text-sm p-1 cursor-pointer">✕</button>

            <div className="text-4xl mb-3">⚡</div>
            <h2 className="text-lg font-black text-white uppercase font-mono mb-1">
              {fr ? "Abonnement EchoAI Premium" : "EchoAI Premium Subscription"}
            </h2>
            <p className="text-xs text-zinc-400 mb-4 font-sans">
              {fr ? "Débloquez l'accès illimité à l'ensemble des modules d'intelligence artificielle." : "Unlock unlimited access to all artificial intelligence modules."}
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
                  const res = await fetch("/api/stripe/create-checkout-site2", {
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
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{fr ? "Connectez-vous pour enregistrer votre budget." : "Sign in to save your budget."}</p>
              </div>
              <button type="button" onClick={() => setShowSignInModal(false)} className="text-zinc-400 hover:text-white text-sm p-1 cursor-pointer">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button type="button" onClick={async () => { await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/budget` } }); }} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 cursor-pointer">
                <GoogleLogo /><span className="text-white text-[9px] font-bold">GOOGLE</span>
              </button>
              <button type="button" onClick={async () => { await supabase.auth.signInWithOAuth({ provider: "azure", options: { redirectTo: `${window.location.origin}/budget` } }); }} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 cursor-pointer">
                <MicrosoftLogo /><span className="text-white text-[9px] font-bold">MICROSOFT</span>
              </button>
            </div>

            <div className="h-px bg-zinc-900 my-3" />

            <div className="space-y-3">
              <input type="email" placeholder="nom@domaine.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500" />
              <input type="password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500" />
              {authError && <p className="text-red-400 text-xs font-mono">⚠️ {authError}</p>}

              <button
                onClick={async () => {
                  setAuthError(null);
                  const { error } = await supabase.auth.signInWithPassword({ email, password });
                  if (error) setAuthError(error.message);
                  else setShowSignInModal(false);
                }}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
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

export default function BudgetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-cyan-400 font-mono text-xs">Chargement de Budget...</div>}>
      <BudgetContent />
    </Suspense>
  );
}