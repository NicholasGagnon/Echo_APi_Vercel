"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Lang = "fr" | "en";

const NAV_ITEMS = [
  { href: "/1",              key: "hall"   },
  { href: "/1/dashboard",    key: "dash",   active: true },
  { href: "/1/conversation", key: "conv"   },
  { href: "/1/form",         key: "form"   },
  { href: "/1/fiche",        key: "fiches" },
  { href: "/1/account",      key: "account" },
];

const LABELS: Record<string, { fr: string; en: string }> = {
  hall:    { fr: "Hall",          en: "Hall" },
  dash:    { fr: "Dashboard",     en: "Dashboard" },
  conv:    { fr: "Conversation",  en: "Conversation" },
  form:    { fr: "Formulaire",    en: "Form" },
  fiches:  { fr: "Fiches",        en: "Listings" },
  account: { fr: "Compte",        en: "Account" },
};

type MyFiche = {
  id: string;
  key: string;
  nom_projet: string;
  type_projet: string;
  likes: number;
  interets: number;
  created_at: string;
};

type Interet = {
  id: string;
  type: string;
  sender_key: string;
  created_at: string;
  nom_projet: string;
};

export default function DashboardPage() {
  const [lang, setLang] = useState<Lang>("fr");
  const [time, setTime] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [myFiches, setMyFiches]   = useState<MyFiche[]>([]);
  const [interets, setInterets]   = useState<Interet[]>([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString(lang === "fr" ? "fr-CA" : "en-CA", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lang]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
      setUserEmail(session?.user?.email || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id || null);
      setUserEmail(session?.user?.email || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) { setMyFiches([]); setInterets([]); setUnlockedCount(0); setLoading(false); return; }
    const load = async () => {
      setLoading(true);

      // Mes fiches
      const { data: fichesData } = await supabase
        .from("fiches")
        .select("id, key, nom_projet, type_projet, likes, interets, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      const fiches = (fichesData || []) as MyFiche[];
      setMyFiches(fiches);

      // Intérêts reçus sur mes fiches
      if (fiches.length > 0) {
        const ficheIds = fiches.map(f => f.id);
        const { data: interetsData } = await supabase
          .from("fiche_interets")
          .select("id, type, sender_key, created_at, fiche_id")
          .in("fiche_id", ficheIds)
          .order("created_at", { ascending: false })
          .limit(8);
        const enriched = (interetsData || []).map((it: any) => ({
          ...it,
          nom_projet: fiches.find(f => f.id === it.fiche_id)?.nom_projet || "—",
        }));
        setInterets(enriched);
      }

      // Fiches débloquées par moi (achats)
      const { data: tunnelsData } = await supabase
        .from("tunnels")
        .select("id")
        .eq("acheteur_id", userId);
      setUnlockedCount((tunnelsData || []).length);

      setLoading(false);
    };
    load();
  }, [userId]);

  const dict = {
    fr: {
      arch: "TABLEAU DE BORD",
      title: "DASHBOARD",
      subtitle: "Construire seul ne veut pas dire grandir seul",
      deskTitle: "POSTE DE CONTRÔLE",
      terminal: "Terminal principal",
      myListings: "MES FICHES",
      noListings: "Aucune fiche créée.",
      createOne: "Créer ma fiche →",
      receptionist: "ECHO_IA_RECEPTIONIST_v2",
      welcome: userEmail
        ? `Connecté en tant que ${userEmail}. Structures synchronisées et stables.`
        : "Connecte-toi pour synchroniser tes données.",
      status: userId ? "CONNECTÉ" : "DÉCONNECTÉ",
      explainTitle: "GUIDE RAPIDE",
      explainForm: "La page Formulaire te permet de créer ta fiche projet officielle.",
      explainFiche: "La page Fiches te permet de parcourir les projets et trouver un allié stratégique.",
      explainFuture: "D'autres outils arriveront bientôt ici.",
      recentActivity: "ACTIVITÉ RÉCENTE",
      noActivity: "Aucune activité récente.",
      core: "STATISTIQUES",
      foundation: "Vue d'ensemble du compte",
      seating: "DONNÉES SUPABASE • TEMPS RÉEL",
      stats: { fiches: "Fiches créées", unlocked: "Fiches débloquées", interets: "Intérêts reçus" },
      like: "intérêt", tresInteresse: "très intéressé",
      loginPrompt: "Connecte-toi pour voir ton dashboard.",
      login: "Se connecter",
    },
    en: {
      arch: "DASHBOARD",
      title: "DASHBOARD",
      subtitle: "Built alone doesn't mean growing alone",
      deskTitle: "CONTROL DESK",
      terminal: "Main terminal",
      myListings: "MY LISTINGS",
      noListings: "No listing created yet.",
      createOne: "Create my listing →",
      receptionist: "ECHO_IA_RECEPTIONIST_v2",
      welcome: userEmail
        ? `Logged in as ${userEmail}. Structures synced and stable.`
        : "Log in to sync your data.",
      status: userId ? "CONNECTED" : "DISCONNECTED",
      explainTitle: "QUICK GUIDE",
      explainForm: "The Form page lets you create your official project listing.",
      explainFiche: "The Listings page lets you browse projects and find a strategic ally.",
      explainFuture: "More tools coming soon.",
      recentActivity: "RECENT ACTIVITY",
      noActivity: "No recent activity.",
      core: "STATISTICS",
      foundation: "Account overview",
      seating: "SUPABASE DATA • REAL TIME",
      stats: { fiches: "Listings created", unlocked: "Listings unlocked", interets: "Interests received" },
      like: "interest", tresInteresse: "very interested",
      loginPrompt: "Log in to see your dashboard.",
      login: "Log in",
    },
  }[lang];

  return (
    <div className="w-full min-h-screen bg-[#030304] text-zinc-300 flex flex-col font-sans">

      {/* NAV */}
      <nav className="border-b border-zinc-900/60 px-6 py-4 flex items-center justify-between shrink-0 bg-black/40">
        <span className="font-bold text-sm text-white">Echo AI</span>
        <div className="flex items-center gap-5 text-sm">
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href}
              className={(item as any).active ? "text-cyan-400 font-semibold" : "text-zinc-500 hover:text-zinc-200 transition-colors"}>
              {LABELS[item.key][lang]}
            </Link>
          ))}
          <button onClick={() => setLang(l => l === "fr" ? "en" : "fr")}
            className="text-xs text-zinc-500 border border-zinc-800 px-2 py-1 rounded-lg hover:border-zinc-600 transition-colors">
            {lang === "fr" ? "EN" : "FR"}
          </button>
        </div>
      </nav>

      {/* GRILLE PRINCIPALE */}
      <div className="flex-1 w-full grid grid-cols-12 min-h-0">

        {/* ================= ZONE GAUCHE : NAV INFO & DESK ================= */}
        <div className="col-span-12 lg:col-span-2 border-r border-zinc-900/50 flex flex-col justify-between p-6 bg-black/40">
          <div className="space-y-8">
            <div className="space-y-1">
              <p className="text-[10px] font-mono tracking-[0.4em] text-cyan-500 font-bold">{dict.arch}</p>
              <h1 className="text-2xl font-light tracking-tight text-white uppercase">{dict.title}</h1>
              <p className="text-[10px] text-zinc-500 italic">{dict.subtitle}</p>
            </div>

            <div className="bg-[#09090b] border border-zinc-900 p-4 rounded-xl space-y-2">
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{dict.deskTitle}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-sm inline-block border ${userId ? "bg-cyan-500 border-cyan-400" : "bg-zinc-700 border-zinc-600"}`} />
                  <span className="text-xs font-mono text-zinc-400">{dict.terminal}</span>
                </div>
                <span className={`w-1.5 h-1.5 rounded-full ${userId ? "bg-cyan-400 shadow-[0_0_6px_#06b6d4]" : "bg-zinc-600"}`} />
              </div>
            </div>
          </div>

          <div className="text-[10px] font-mono text-zinc-500 border-t border-zinc-900/60 pt-3 space-y-1">
            <p>STATUS: <span className={userId ? "text-cyan-400 font-bold" : "text-zinc-500 font-bold"}>{dict.status}</span></p>
            <p>TIME: <span className="text-zinc-300 font-bold">{time}</span></p>
          </div>
        </div>

        {/* ================= ZONE CENTRALE : STATS ================= */}
        <div className="col-span-12 lg:col-span-4 flex flex-col items-center justify-center relative bg-black/10 px-6 py-10 lg:py-0 border-r border-zinc-900/30">

          <div className="absolute inset-y-0 w-[85%] border-x border-zinc-900/60 bg-gradient-to-b from-zinc-950/20 via-[#060608]/40 to-zinc-950/20 pointer-events-none hidden lg:block">
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-cyan-500/30 via-cyan-400 to-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]" />
          </div>

          <div className="w-full flex flex-col items-center relative z-10">
            <div className="w-full bg-gradient-to-b from-[#08080a] via-[#101014] to-[#0a0a0c] border border-zinc-800/80 shadow-[0_0_80px_rgba(0,0,0,0.9)] relative flex flex-col justify-between py-8 px-6 rounded-t-md">
              <div className="text-center z-20 mb-4">
                <span className="text-[11px] font-mono tracking-[0.6em] text-zinc-400 font-bold block bg-black/60 py-1 uppercase">{dict.core}</span>
              </div>

              {!userId ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm text-zinc-500">{dict.loginPrompt}</p>
                  <Link href="/1/account" className="inline-block px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-colors">
                    {dict.login}
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 py-2">
                  <div className="text-center">
                    <p className="text-3xl font-black text-cyan-400">{myFiches.length}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-1">{dict.stats.fiches}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-black text-emerald-400">{unlockedCount}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-1">{dict.stats.unlocked}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-black text-amber-400">{interets.length}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-1">{dict.stats.interets}</p>
                  </div>
                </div>
              )}

              <p className="text-xs text-center font-mono text-cyan-400 tracking-widest font-medium z-20 mt-4">
                {dict.foundation}
              </p>
            </div>

            <div className="w-[104%] h-12 bg-gradient-to-r from-zinc-800 via-zinc-600 to-zinc-800 border border-zinc-600/40 shadow-[0_20px_40px_rgba(0,0,0,0.8)] rounded-b-xl p-0.5 relative z-20">
              <div className="w-full h-full bg-zinc-950 rounded-b-lg flex items-center justify-center border border-zinc-900">
                <span className="text-[10px] font-mono text-zinc-400 tracking-[0.4em] font-black uppercase">{dict.seating}</span>
              </div>
            </div>
          </div>

          {/* MES FICHES */}
          {userId && (
            <div className="w-full mt-6 bg-[#070709] border border-zinc-900/80 rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold mb-2">{dict.myListings}</p>
              {loading ? (
                <p className="text-xs text-zinc-600 italic">...</p>
              ) : myFiches.length === 0 ? (
                <Link href="/1/form" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">{dict.createOne}</Link>
              ) : (
                <div className="space-y-1.5">
                  {myFiches.map(f => (
                    <div key={f.id} className="flex items-center justify-between text-xs bg-black/30 rounded-lg px-3 py-2">
                      <span className="text-zinc-300 truncate">{f.nom_projet}</span>
                      <span className="text-zinc-600 font-mono text-[10px] shrink-0 ml-2">{f.key}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================= ZONE DROITE : GUIDE ================= */}
        <div className="col-span-12 lg:col-span-3 border-r border-zinc-900/50 flex flex-col justify-start p-6 bg-black/40 gap-6">
          <div className="bg-[#070709] border border-zinc-900/80 p-5 rounded-xl space-y-5 shadow-lg">
            <p className="text-[11px] font-mono text-zinc-400 tracking-[0.15em] uppercase border-b border-zinc-900 pb-3 font-bold">
              📋 {dict.explainTitle}
            </p>
            <div className="space-y-4 text-xs font-light leading-relaxed text-zinc-400">
              <div>
                <span className="text-cyan-400 font-mono font-bold block mb-1">{lang==="fr"?"Formulaire :":"Form:"}</span>
                <p className="pl-2 border-l border-zinc-900">{dict.explainForm}</p>
              </div>
              <div>
                <span className="text-white font-mono font-bold block mb-1">{lang==="fr"?"Fiches :":"Listings:"}</span>
                <p className="pl-2 border-l border-zinc-900">{dict.explainFiche}</p>
              </div>
              <div className="pt-3 border-t border-zinc-900/60 text-zinc-600 font-mono italic text-[11px]">
                {dict.explainFuture}
              </div>
            </div>
          </div>
        </div>

        {/* ================= ZONE EXTÉRIEURE DROITE : IA & ACTIVITÉ ================= */}
        <div className="col-span-12 lg:col-span-3 flex flex-col justify-between p-6 bg-black gap-4">

          <div className="flex-1 flex flex-col justify-start space-y-4 min-h-0">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <div>
                <p className="text-[9px] font-mono text-zinc-600 tracking-wider">SECURITY STATUS</p>
                <span className={`text-[10px] font-mono font-bold ${userId ? "text-cyan-400" : "text-zinc-600"}`}>
                  {userId ? "SECURE_ECHO_CONNECTED" : "AWAITING_CONNECTION"}
                </span>
              </div>
              <span className="text-xs font-mono text-zinc-500">{time}</span>
            </div>

            <div className="border border-zinc-800/80 bg-[#050507] rounded-xl p-4 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="text-[10px] font-mono text-zinc-400 font-bold tracking-wider">{dict.receptionist}</span>
                <span className={`w-2 h-2 rounded-full ${userId ? "bg-cyan-400 shadow-[0_0_8px_#06b6d4]" : "bg-zinc-700"}`} />
              </div>
              <p className="text-xs text-zinc-400 italic leading-relaxed font-light">
                "{dict.welcome}"
              </p>
            </div>
          </div>

          {/* ACTIVITÉ RÉCENTE — réelle */}
          <div className="border border-zinc-900 bg-[#040405] p-4 rounded-xl space-y-3">
            <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-bold">⏱️ {dict.recentActivity}</p>
            {!userId || interets.length === 0 ? (
              <div className="h-20 flex items-center justify-center border border-zinc-900/80 rounded-lg bg-black/40">
                <span className="text-[10px] font-mono text-zinc-600 italic tracking-wide">{dict.noActivity}</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {interets.map(it => (
                  <div key={it.id} className="flex items-center gap-2 text-[11px] bg-black/30 rounded-lg px-2.5 py-1.5">
                    <span>{it.type === "tres_interesse" ? "🔥" : "💌"}</span>
                    <span className="text-zinc-400 truncate flex-1">
                      <span className="text-cyan-400 font-mono">{it.sender_key}</span> — {it.nom_projet}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* FOOTER */}
      <footer className="h-8 border-t border-zinc-950 bg-black px-6 flex items-center justify-between text-[10px] font-mono text-zinc-600 tracking-wider shrink-0">
        <p>INFRASTRUCTURE: <span className="text-zinc-500 font-bold">SITE_2_ACTIVE</span></p>
        <p>© 2026 ECHOSAI.CA — ALL RIGHTS RESERVED</p>
      </footer>

    </div>
  );
}