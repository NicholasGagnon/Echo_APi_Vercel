"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../../context/AppContext";
import LangDropdown from "../components/LangDropdown";

// ── TYPES ─────────────────────────────────────────────────────────────────────
type ModalType = "support" | "contact" | null;

const localT = {
  fr: {
    features: "FONCTIONNALITÉS",
    echoAiDoIt: "ECHO IA LE FAIT POUR TOI",
    currentPlan: "PLAN ACTUEL",
    included: "✓ INCLUS",
    connecting: "Connexion...",
    upgrade: "🚀 AMÉLIORER",
    joinFounder: "👑 REJOINDRE",
    // Modals contact
    supportTitle: "Support Technique",
    contactTitle: "Nous Contacter",
    supportDesc: "Une question sur ton abonnement ou un problème technique ? L'équipe Echo est là.",
    contactDesc: "Une idée, une suggestion, un partenariat ? On veut t'entendre.",
    yourEmail: "Ton adresse courriel",
    subject: "Sujet",
    subjectPlaceholder: "Résumé de ta demande",
    message: "Message",
    messagePlaceholder: "Décris ta demande en détail...",
    send: "Envoyer",
    sending: "Envoi en cours...",
    sent: "✓ Message envoyé !",
    sentDesc: "On reviendra vers toi dans les plus brefs délais.",
    errorSend: "Échec de l'envoi. Réessaie dans un moment.",
    close: "Fermer",
    supportLocked: "🔒 Le support est réservé aux plans Basic, Premium, Ultra et Fondateur.",
    // Easter egg
    treasureEgg: {
      closePortal: "Fermer le portail",
      title: "🎉✨ HOLA, EXPLORATEUR DU NUMÉRIQUE! ✨🎉",
      subtitle: "Tu viens de découvrir un Easter Egg caché dans les profondeurs d'Echo AI... et ça mérite une récompense. 😎",
      congrats: "🏆 FÉLICITATIONS!",
      unlock: "Tu débloques un accès à l'abonnement ULTRA avec une réduction exceptionnelle de 40 % pendant 1 mois.",
      rare: "Peu de gens tombent sur cette surprise. Encore moins prennent le temps d'explorer suffisamment pour la trouver. 👀",
      bonusTitle: "💎 Ton bonus :",
      bonus1: "• 40 % de réduction sur ULTRA pendant 1 mois",
      bonus2: "• Accès complet aux fonctionnalités avancées",
      bonus3: "• Le droit officiel de te vanter d'avoir trouvé un secret caché d'Echo AI",
      disclaimer: "⚠️ Cette récompense est valable pour un seul mois d'abonnement ULTRA et ne peut être combinée avec d'autres promotions.",
      urgency: "Profites-en tant que le portail est encore ouvert... les Easter Eggs ont tendance à disparaître aussi mystérieusement qu'ils apparaissent. 😉",
      outro: "🚀 Bien joué. Echo te regardait depuis le début.",
      claim: "RÉCLAMER LE TRÉSOR (9.99$) ➔",
      connecting: "CONNEXION...",
      leaveIt: "Laisser le secret tranquille",
    },
    plans: {
      connected_free: { title: "Accès libre", sub: "GRATUIT À VIE", f1: "✅ AI Standard Model", f2: "✅ Intégration Recherche Web", f3: "✅ Écrire un Livre", f4: "✅ Calendrier", f5: "✅ Vitalité", f6: "✅ Invites Comportementales Limitées", f7: "❌ Page Historique", ai1: "✅ Calendrier Echo AI Limité", ai2: "✅ Vitalité Echo AI Limité" },
      basic: { title: "Avantage", sub: "PAR MOIS", f1: "✅ AI Enhanced Models", f2: "✅ Intégration Recherche Web", f3: "✅ Écrire un Livre", f4: "✅ Calendrier", f5: "✅ Vitalité", f6: "✅ Invites Comportementales x4", f7: "❌ Page Historique", f8: "✅ Support par Courriel", ai1: "✅ Calendrier Echo AI x4", ai2: "✅ Vitalité Echo AI x4" },
      premium: { title: "Premium", sub: "PAR MOIS", badge: "⭐ LE PLUS POPULAIRE", f1: "✅ AI Advanced Model", f2: "✅ Intégration Recherche Web", f3: "✅ Écrire un Livre", f4: "✅ Calendrier", f4_1: "✅ Vitalité", f5: "✅ Page Historique Limitée", f6: "✅ Support par Courriel", f7: "✅ Analyse d'Image", f8: "✅ Invites Comportementales x10", ai1: "✅ Calendrier Echo AI x10", ai2: "✅ Vitalité Echo AI x10" },
      ultra: { title: "Ultra", sub: "PAR MOIS", power: "Utilisateurs Avancés", f1: "✅ AI Pro Models", f2: "✅ Intégration Recherche Web", f3: "✅ Écrire un Livre", f4: "✅ Calendrier", f5: "✅ Vitalité", f6: "✅ Page Historique Illimitée", f7: "✅ Traitement Prioritaire", f8: "✅ Support par Courriel", f9: "✅ Analyse d'Image", f10: "✅ Invites Comportementales x30", ai1: "✅ Calendrier Echo AI x30", ai2: "✅ Vitalité Echo AI x30" },
      founder: { title: "Fondateur", sub: "PAR MOIS", power: "Soutenir le Développement d'Echo", f1: "✅ AI Expert Model illimité", f2: "✅ Intégration Recherche Web", f3: "✅ Écrire un Livre", f4: "✅ Calendrier", f5: "✅ Vitalité", f6: "✅ Page Historique Illimitée", f7: "✅ Traitement Prioritaire", f8: "✅ Support par Courriel", f9: "✅ Analyse d'Image", f10: "✅ Capacités Avancées", f11: "✅ Invites Comportementales Illimitées", ai1: "✅ Calendrier Echo AI Illimité", ai2: "✅ Vitalité Echo AI Illimité" },
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
    supportTitle: "Technical Support",
    contactTitle: "Contact Us",
    supportDesc: "Got a question about your subscription or a technical issue? The Echo team is here.",
    contactDesc: "An idea, a suggestion, a partnership? We want to hear from you.",
    yourEmail: "Your email address",
    subject: "Subject",
    subjectPlaceholder: "Summary of your request",
    message: "Message",
    messagePlaceholder: "Describe your request in detail...",
    send: "Send",
    sending: "Sending...",
    sent: "✓ Message sent!",
    sentDesc: "We'll get back to you as soon as possible.",
    errorSend: "Failed to send. Please try again in a moment.",
    close: "Close",
    supportLocked: "🔒 Support is reserved for Basic, Premium, Ultra, and Founder plans.",
    treasureEgg: {
      closePortal: "Close the portal",
      title: "🎉✨ HEY THERE, DIGITAL EXPLORER! ✨🎉",
      subtitle: "You just discovered an Easter Egg hidden deep within Echo AI... and that deserves a reward. 😎",
      congrats: "🏆 CONGRATULATIONS!",
      unlock: "You're unlocking access to the ULTRA subscription with an exceptional 40% discount for 1 month.",
      rare: "Few people stumble onto this surprise. Even fewer take the time to explore enough to find it. 👀",
      bonusTitle: "💎 Your bonus:",
      bonus1: "• 40% off ULTRA for 1 month",
      bonus2: "• Full access to advanced features",
      bonus3: "• The official right to brag about finding a hidden Echo AI secret",
      disclaimer: "⚠️ This reward is valid for a single month of ULTRA subscription and cannot be combined with other promotions.",
      urgency: "Take advantage while the portal is still open... Easter Eggs tend to vanish as mysteriously as they appear. 😉",
      outro: "🚀 Well played. Echo was watching you the whole time.",
      claim: "CLAIM THE TREASURE ($9.99) ➔",
      connecting: "CONNECTING...",
      leaveIt: "Leave the secret alone",
    },
    plans: {
      connected_free: { title: "FreeConnect", sub: "FOREVER FREE", f1: "✅ AI Standard Model", f2: "✅ WebSearch Integration", f3: "✅ Write A Book", f4: "✅ Calendar", f5: "✅ Vitality", f6: "✅ Behavioral Prompts Limited", f7: "❌ History page", ai1: "✅ Calendar Echo AI Limited", ai2: "✅ Vitality Echo AI Limited" },
      basic: { title: "Advantage", sub: "PER MONTH", f1: "✅ AI Enhanced Models", f2: "✅ WebSearch Integration", f3: "✅ Write A Book", f4: "✅ Calendar", f5: "✅ Vitality", f6: "✅ Behavioral Prompts x4", f7: "❌ History page", f8: "✅ Email Support", ai1: "✅ Calendar Echo AI x4", ai2: "✅ Vitality Echo AI x4" },
      premium: { title: "Premium", sub: "PER MONTH", badge: "⭐ MOST POPULAR", f1: "✅ AI Advanced Model", f2: "✅ WebSearch Integration", f3: "✅ Write A Book", f4: "✅ Calendar", f4_1: "✅ Vitality", f5: "✅ History page limited", f6: "✅ Email Support", f7: "✅ Image Analysis", f8: "✅ Behavioral Prompts x10", ai1: "✅ Calendar Echo AI x10", ai2: "✅ Vitality Echo AI x10" },
      ultra: { title: "Ultra", sub: "PER MONTH", power: "Power Users", f1: "✅ AI Pro Models", f2: "✅ WebSearch Integration", f3: "✅ Write A Book", f4: "✅ Calendar", f5: "✅ Vitality", f6: "✅ History page unlimited", f7: "✅ Priority Processing", f8: "✅ Email Support", f9: "✅ Image Analysis", f10: "✅ Behavioral Prompts x30", ai1: "✅ Calendar Echo AI x30", ai2: "✅ Vitality Echo AI x30" },
      founder: { title: "Founder", sub: "PER MONTH", power: "Support Echo Development", f1: "✅ AI Expert Model unlimited", f2: "✅ WebSearch Integration", f3: "✅ Write A Book", f4: "✅ Calendar", f5: "✅ Vitality", f6: "✅ History page unlimited", f7: "✅ Priority Processing", f8: "✅ Email Support", f9: "✅ Image Analysis", f10: "✅ Advanced Capabilities", f11: "✅ Unlimited Behavioral Prompts", ai1: "✅ Calendar Echo AI unlimited", ai2: "✅ Vitality Echo AI unlimited" },
    },
  },
};

const TIER_RANK: Record<string, number> = {
  connected_free: 0, basic: 1, premium: 2, treasure: 2.5, ultra: 3, founder: 4,
};

// ── MODAL CONTACT/SUPPORT ─────────────────────────────────────────────────────
function ContactModal({ type, lang, T, onClose }: {
  type: "support" | "contact";
  lang: string;
  T: typeof localT["fr"];
  onClose: () => void;
}) {
  const [email,   setEmail]   = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status,  setStatus]  = useState<"idle" | "sending" | "sent" | "error">("idle");

  const isSupport = type === "support";

  const handleSend = async () => {
    if (!email.trim() || !subject.trim() || !message.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, email: email.trim(), subject: subject.trim(), message: message.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border-2 border-cyan-500/40 rounded-3xl w-full max-w-lg shadow-[0_0_60px_rgba(6,182,212,0.2)] animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="relative flex items-center gap-4 px-7 pt-7 pb-5 border-b border-zinc-800">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.3)] shrink-0">
            <img src="/echo1.png" alt="Echo" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-500/70 mb-0.5">Echo AI</p>
            <h2 className="text-base font-black text-zinc-100 tracking-tight">
              {isSupport ? T.supportTitle : T.contactTitle}
            </h2>
            <p className="text-zinc-500 text-[11px] mt-0.5 leading-relaxed">
              {isSupport ? T.supportDesc : T.contactDesc}
            </p>
          </div>
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all text-sm font-mono"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="px-7 py-6">
          {status === "sent" ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl">
                ✓
              </div>
              <div>
                <p className="text-emerald-400 font-black text-base font-mono">{T.sent}</p>
                <p className="text-zinc-500 text-xs mt-1">{T.sentDesc}</p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs rounded-xl hover:text-zinc-200 transition-all font-mono"
              >
                {T.close}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* EMAIL */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mb-1.5 font-bold">
                  {T.yourEmail}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nom@domaine.com"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500/60 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
                />
              </div>

              {/* SUBJECT */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mb-1.5 font-bold">
                  {T.subject}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder={T.subjectPlaceholder}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500/60 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
                />
              </div>

              {/* MESSAGE */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mb-1.5 font-bold">
                  {T.message}
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={T.messagePlaceholder}
                  rows={5}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500/60 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors resize-none leading-relaxed"
                />
              </div>

              {/* ERROR */}
              {status === "error" && (
                <p className="text-red-400 text-[11px] font-mono bg-red-950/30 border border-red-500/20 rounded-lg px-3 py-2">
                  ⚠️ {T.errorSend}
                </p>
              )}

              {/* FOOTER */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleSend}
                  disabled={status === "sending" || !email || !subject || !message}
                  className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] font-mono"
                >
                  {status === "sending" ? T.sending : T.send}
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs rounded-xl hover:text-zinc-200 hover:border-zinc-700 transition-all font-mono"
                >
                  {T.close}
                </button>
              </div>

              {/* Destination info */}
              <p className="text-zinc-600 text-[10px] font-mono text-center">
                → {isSupport ? "support@echosai.ca" : "contact@echosai.ca"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PAGE PRINCIPALE ───────────────────────────────────────────────────────────
export default function ServicesPage() {
  const { t, lang } = useApp();
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userTier, setUserTier] = useState<string>("connected_free");
  const [isLoadingCheckout, setIsLoadingCheckout] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [showSupportLocked, setShowSupportLocked] = useState(false);

  const [showTreasureModal, setShowTreasureModal] = useState(false);
  const [isLoadingTreasure, setIsLoadingTreasure] = useState(false);
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);

  const activeT = lang === "fr" ? localT.fr : localT.en;

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
    if (!user) { setShowLoginRequiredModal(true); return; }
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
        body: JSON.stringify({ plan: planName, userId: user.id, userEmail: user.email }),
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
              <Link href="/chat" className="block hover:text-cyan-500">{t.sidebar.chat}</Link>
              <Link href="/books" className="block hover:text-cyan-500">{t.sidebar.books}</Link>
              <Link href="/calendar" className="block hover:text-cyan-500">📅 {lang === "fr" ? "Calendrier" : "Calendar"}</Link>
              <Link href="/vitality" className="block hover:text-cyan-500">📈 {lang === "fr" ? "Vitalité" : "Vitality"}</Link>
              <Link href="/services" className="block text-cyan-600 dark:text-cyan-400 font-bold">💎 {lang === "fr" ? "Services" : "Services"}</Link>
              <Link href="/account" className="block hover:text-cyan-500">👤 {lang === "fr" ? "Compte" : "Account"}</Link>
              <Link href="/horizonweb" className="block hover:text-cyan-500">📡 HorizonWeb</Link>
              <hr className="border-zinc-200 dark:border-zinc-800 my-4" />
              <Link href="/history" className="block hover:text-amber-500">⭐ {lang === "fr" ? "Historique" : "History"}</Link>
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
                  <div className="text-3xl font-black mb-0.5">$5.99</div>
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
                  <div className="text-3xl font-black mb-0.5">$9.99</div>
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
                  <div className="text-3xl font-black mb-0.5">$19.99</div>
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
                  <div className="text-3xl font-black mb-0.5">$99</div>
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
          T={activeT}
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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[99999] p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border-2 border-amber-500 p-6 sm:p-8 rounded-3xl max-w-md w-full text-center space-y-5 shadow-[0_0_50px_rgba(245,158,11,0.4)] transform animate-in zoom-in-95 duration-200 text-white max-h-[90vh] overflow-y-auto relative">
            <div className="absolute top-4 right-5 flex items-center gap-2 z-10">
              <LangDropdown />
              <button type="button" onClick={() => setShowTreasureModal(false)} className="text-zinc-500 hover:text-white text-lg font-mono transition-colors p-1">✕</button>
            </div>
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">👑</div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-amber-400 tracking-wider font-mono uppercase">{activeT.treasureEgg.title}</h3>
              <p className="text-zinc-400 text-[11px] font-semibold leading-relaxed">{activeT.treasureEgg.subtitle}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-left text-[12px] sm:text-[13px] leading-relaxed text-zinc-100 font-semibold space-y-3">
              <p className="text-center font-black text-amber-400 text-sm">{activeT.treasureEgg.congrats}</p>
              <p>{activeT.treasureEgg.unlock}</p>
              <p>{activeT.treasureEgg.rare}</p>
              <div className="pt-1 text-cyan-400 font-mono space-y-0.5">
                <p>{activeT.treasureEgg.bonusTitle}</p>
                <p>{activeT.treasureEgg.bonus1}</p>
                <p>{activeT.treasureEgg.bonus2}</p>
                <p>{activeT.treasureEgg.bonus3}</p>
              </div>
              <p className="text-[11px] text-zinc-400 italic">{activeT.treasureEgg.disclaimer}</p>
              <p className="text-zinc-300 font-medium">{activeT.treasureEgg.urgency}</p>
              <p className="text-center font-bold text-emerald-400 pt-1">{activeT.treasureEgg.outro}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" disabled={isLoadingTreasure} onClick={() => handleUpgradeWithStripe("treasure")}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-mono font-bold text-xs py-3.5 rounded-xl uppercase tracking-widest transition shadow-md">
                {isLoadingTreasure ? activeT.treasureEgg.connecting : activeT.treasureEgg.claim}
              </button>
              <button type="button" onClick={() => setShowTreasureModal(false)} className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-500 font-mono text-[11px] py-1.5 rounded-xl transition border border-zinc-800">
                {activeT.treasureEgg.leaveIt}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}