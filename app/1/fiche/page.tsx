"use client";

import { useState } from "react";
import Link from "next/link";

// ── MOCK DATA ─────────────────────────────────────────────────────────────────
const MOCK_FICHES = [
  {
    id: "1", key: "Key_A1", projet: "EcoAI", type: "SaaS",
    photo: null,
    description: "Assistant IA personnel pour gérer budget, calories, écriture et calendrier depuis une seule plateforme.",
    outils: ["Next.js", "Flask", "Supabase", "DeepSeek"],
    cherche: "Associé marketing, quelqu'un avec une audience dans la productivité",
    likes: 4, interets: 1,
  },
  {
    id: "2", key: "Key_A2", projet: "NutriTrack", type: "App mobile",
    photo: null,
    description: "Application de suivi nutritionnel avec recommandations personnalisées basées sur les objectifs.",
    outils: ["React Native", "Firebase", "Python"],
    cherche: "Associé tech ou quelqu'un dans le domaine de la santé/fitness",
    likes: 7, interets: 3,
  },
  {
    id: "3", key: "Key_A5", projet: "LaunchDeck", type: "Outil SaaS",
    photo: null,
    description: "Outil pour créer des landing pages en quelques minutes sans toucher au code.",
    outils: ["Vue.js", "Node.js", "Stripe", "Vercel"],
    cherche: "Fondateur solo avec une audience de créateurs ou entrepreneurs",
    likes: 12, interets: 5,
  },
];

const TYPE_COLORS: Record<string, string> = {
  "SaaS":        "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "App mobile":  "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Outil SaaS":  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Contenu":     "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function FichePage() {
  const [lang, setLang] = useState<"fr"|"en">("fr");
  const [likedIds,    setLikedIds]    = useState<Set<string>>(new Set());
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());
  const [sentNotif, setSentNotif] = useState<{id:string; type:"like"|"interet"}|null>(null);

  const dict = {
    fr: {
      title:    "Fiches projets",
      subtitle: "Des fondateurs solos qui cherchent des synergies.",
      cherche:  "Cherche",
      outils:   "Outils",
      like:     "Intérêt",
      interet:  "Très intéressé",
      acheter:  "Voir les infos",
      lock:     "🔒 Infos de contact",
      notifLike:   "Notification d'intérêt envoyée",
      notifInteret:"Notification envoyée — très intéressé",
      nav: {
        home: "Accueil", conv: "Conversation", fiches: "Fiches",
        inscription: "Inscription",
      },
    },
    en: {
      title:    "Project listings",
      subtitle: "Solo founders looking for synergies.",
      cherche:  "Looking for",
      outils:   "Tools",
      like:     "Interest",
      interet:  "Very interested",
      acheter:  "See contact info",
      lock:     "🔒 Contact info",
      notifLike:   "Interest notification sent",
      notifInteret:"Notification sent — very interested",
      nav: {
        home: "Home", conv: "Conversation", fiches: "Listings",
        inscription: "Register",
      },
    },
  }[lang];

  const handleLike = (id: string) => {
    if (likedIds.has(id)) return;
    setLikedIds(prev => new Set([...prev, id]));
    setSentNotif({ id, type: "like" });
    setTimeout(() => setSentNotif(null), 3000);
    // TODO: envoyer courriel via API
  };

  const handleInteret = (id: string) => {
    if (interestedIds.has(id)) return;
    setInterestedIds(prev => new Set([...prev, id]));
    setSentNotif({ id, type: "interet" });
    setTimeout(() => setSentNotif(null), 3000);
    // TODO: envoyer courriel via API
  };

  const handleAcheter = (id: string) => {
    // TODO: rediriger vers Stripe
    console.log("Stripe checkout pour fiche", id);
  };

  return (
    <main className="min-h-screen bg-white dark:bg-[#0f0f0f] text-zinc-900 dark:text-zinc-100 font-sans">

      {/* ── NOTIF TOAST ── */}
      {sentNotif && (
        <div className="fixed top-4 right-4 z-50 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm px-4 py-3 rounded-xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          {sentNotif.type === "like" ? dict.notifLike : dict.notifInteret}
        </div>
      )}

      {/* ── NAV ── */}
      <nav className="border-b border-zinc-100 dark:border-zinc-800/60 px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Echo AI</span>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/"              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{dict.nav.home}</Link>
          <Link href="/1/conversation" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{dict.nav.conv}</Link>
          <Link href="/1/fiche"        className="text-zinc-900 dark:text-white font-semibold">{dict.nav.fiches}</Link>
          <Link href="/1/inscription"  className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{dict.nav.inscription}</Link>
          <button onClick={() => setLang(l => l === "fr" ? "en" : "fr")}
            className="text-xs text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded-lg hover:border-zinc-400 transition-colors">
            {lang === "fr" ? "EN" : "FR"}
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-10">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">{dict.title}</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-base">{dict.subtitle}</p>
      </div>

      {/* ── FICHES ── */}
      <div className="max-w-4xl mx-auto px-6 pb-20 flex flex-col gap-8">
        {MOCK_FICHES.map(fiche => (
          <div key={fiche.id}
            className="bg-white dark:bg-zinc-900/40 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-zinc-100 dark:border-zinc-800/40">

            {/* ── PHOTO BANNIÈRE ── */}
            <div className="h-36 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 relative overflow-hidden">
              {fiche.photo ? (
                <img src={fiche.photo} alt={fiche.projet} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-5xl font-black text-zinc-200 dark:text-zinc-700 select-none">{fiche.projet.slice(0,2).toUpperCase()}</span>
                </div>
              )}
              {/* Badge type */}
              <span className={`absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-lg border backdrop-blur-sm ${TYPE_COLORS[fiche.type] || "bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-500 border-zinc-200 dark:border-zinc-700"}`}>
                {fiche.type}
              </span>
            </div>

            {/* ── CONTENU ── */}
            <div className="p-6 flex flex-col gap-4">

              {/* Titre + clé */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{fiche.projet}</h2>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">{fiche.key}</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{fiche.description}</p>

              {/* Outils */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-zinc-400 font-medium">{dict.outils} :</span>
                {fiche.outils.map(outil => (
                  <span key={outil} className="text-[11px] bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-md font-mono">
                    {outil}
                  </span>
                ))}
              </div>

              {/* Cherche */}
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                <span className="text-zinc-400 dark:text-zinc-500 text-[11px] font-medium uppercase tracking-wide mr-2">{dict.cherche}</span>
                {fiche.cherche}
              </p>

              {/* Séparateur */}
              <div className="h-px bg-zinc-100 dark:bg-zinc-800/60"/>

              {/* Section lock */}
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30">
                <span className="text-base">🔒</span>
                <span className="text-sm text-zinc-400 dark:text-zinc-500">{dict.lock}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button onClick={() => handleLike(fiche.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                    likedIds.has(fiche.id)
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                      : "border-zinc-200 dark:border-zinc-700/60 text-zinc-500 hover:border-rose-300 hover:text-rose-400"
                  }`}>
                  <span>♥</span>
                  <span>{dict.like}</span>
                  <span className="text-[10px] opacity-60">{fiche.likes + (likedIds.has(fiche.id) ? 1 : 0)}</span>
                </button>

                <button onClick={() => handleInteret(fiche.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                    interestedIds.has(fiche.id)
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : "border-zinc-200 dark:border-zinc-700/60 text-zinc-500 hover:border-amber-300 hover:text-amber-400"
                  }`}>
                  <span>★</span>
                  <span>{dict.interet}</span>
                  <span className="text-[10px] opacity-60">{fiche.interets + (interestedIds.has(fiche.id) ? 1 : 0)}</span>
                </button>

                <div className="flex-1"/>

                <button onClick={() => handleAcheter(fiche.id)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors shadow-sm">
                  <span>🔓</span>
                  <span>{dict.acheter} — 1,50$</span>
                </button>
              </div>

            </div>
          </div>
        ))}
      </div>
    </main>
  );
}