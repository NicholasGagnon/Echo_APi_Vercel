"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Fiche = {
  id: string;
  key: string;
  nom_projet: string;
  type_projet: string;
  type_profil: string;
  description: string;
  tech: Record<string, string[]>;
  cherche: string[];
  engagement: string;
  temps: string;
  distance: string;
  avancement: string;
  idee: string;
  produit: string;
  utilisateurs: string;
  revenus: string;
  objectif_court: string;
  objectif_moyen: string;
  objectif_long: string;
  photo_urls: string[] | null;
  langue: string;
  likes: number;
  interets: number;
  created_at: string;
};

const TYPE_COLORS: Record<string, string> = {
  "SaaS":        "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "App mobile":  "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Outil SaaS":  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Contenu":     "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function FichePage() {
  const [userId, setUserId]       = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
      setUserEmail(session?.user?.email || null);
    });
  }, []);

  const [lang, setLang]         = useState<"fr"|"en">("fr");
  const [fiches, setFiches]     = useState<Fiche[]>([]);
  const [loading, setLoading]   = useState(true);
  const [likedIds,      setLikedIds]      = useState<Set<string>>(new Set());
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());
  const [sentNotif, setSentNotif] = useState<{id:string; type:"like"|"interet"}|null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("fiches")
        .select("id, key, nom_projet, type_projet, type_profil, description, tech, cherche, engagement, temps, distance, avancement, idee, produit, utilisateurs, revenus, objectif_court, objectif_moyen, objectif_long, photo_urls, langue, pays, likes, interets, created_at")
        .order("created_at", { ascending: false });
      if (!error && data) setFiches(data as Fiche[]);
      setLoading(false);
    };
    load();
  }, []);

  // ── Vérifier quelles fiches sont déjà débloquées pour cet utilisateur ──────
  useEffect(() => {
    if (!userId) { setUnlockedIds(new Set()); return; }
    const checkUnlocks = async () => {
      const { data } = await supabase
        .from("tunnels")
        .select("fiche_id")
        .eq("acheteur_id", userId);
      if (data) setUnlockedIds(new Set(data.map((t: any) => t.fiche_id)));
    };
    checkUnlocks();
  }, [userId]);

  const getOutils = (fiche: Fiche) => {
    if (!fiche.tech) return [];
    return Object.values(fiche.tech).flat().filter(Boolean);
  };

  const getCherche = (fiche: Fiche) => {
    if (!fiche.cherche || fiche.cherche.length === 0) return "";
    return fiche.cherche.join(", ");
  };

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

  const handleLike = async (id: string) => {
    if (likedIds.has(id)) return;
    setLikedIds(prev => new Set([...prev, id]));
    setSentNotif({ id, type: "like" });
    setTimeout(() => setSentNotif(null), 3000);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      await fetch(`${API_URL}/1/notifier-interet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiche_id: id, sender_key: "Visiteur", type: "like" }),
      });
    } catch (e) { console.error("Notif like:", e); }
  };

  const handleInteret = async (id: string) => {
    if (interestedIds.has(id)) return;
    setInterestedIds(prev => new Set([...prev, id]));
    setSentNotif({ id, type: "interet" });
    setTimeout(() => setSentNotif(null), 3000);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      await fetch(`${API_URL}/1/notifier-interet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiche_id: id, sender_key: "Visiteur", type: "tres_interesse" }),
      });
    } catch (e) { console.error("Notif interet:", e); }
  };

  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleAcheter = async (id: string) => {
    if (!userId) {
      setShowLoginModal(true);
      return;
    }
    try {
      const res = await fetch("/api/stripe/create-checkout-site2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ficheId: id, acheteurId: userId, acheteurEmail: userEmail }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        console.error("Reponse non-JSON du serveur (route checkout-fiche introuvable ?)");
        alert(lang==="fr" ? "Erreur de configuration du paiement. Reessaie plus tard." : "Payment configuration error. Try again later.");
        return;
      }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.message || (lang==="fr"?"Erreur lors du paiement.":"Payment error."));
    } catch (e) {
      console.error("Checkout fiche:", e);
      alert(lang==="fr" ? "Erreur reseau." : "Network error.");
    }
  };

  // ── SUPPRESSION FICHE PAR KEY ────────────────────────────────────────────
  const [deleteModalId, setDeleteModalId] = useState<string|null>(null);
  const [deleteKey, setDeleteKey]         = useState("");
  const [deleteEmail, setDeleteEmail]     = useState("");
  const [deleteError, setDeleteError]     = useState<string|null>(null);
  const [deleting, setDeleting]           = useState(false);

  const confirmDeleteFiche = async () => {
    if (!deleteModalId) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/1/supprimer-fiche`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: deleteKey.trim(), email: deleteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || (lang==="fr"?"Erreur lors de la suppression.":"Error during deletion."));
        return;
      }
      setFiches(prev => prev.filter(f => f.id !== deleteModalId));
      setDeleteModalId(null);
      setDeleteKey(""); setDeleteEmail("");
    } catch {
      setDeleteError(lang==="fr"?"Erreur réseau.":"Network error.");
    } finally {
      setDeleting(false);
    }
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

        {loading && (
          <div className="text-center py-20 text-zinc-400 text-sm">
            {lang==="fr"?"Chargement des fiches...":"Loading listings..."}
          </div>
        )}

        {!loading && fiches.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-400 text-sm mb-4">{lang==="fr"?"Aucune fiche pour le moment.":"No listings yet."}</p>
            <Link href="/1/inscription" className="text-sm font-semibold text-zinc-900 dark:text-white underline underline-offset-4">
              {lang==="fr"?"Créer la première →":"Create the first one →"}
            </Link>
          </div>
        )}

        {!loading && fiches.map(fiche => (
          <div key={fiche.id}
            className="bg-white dark:bg-zinc-900/40 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-zinc-100 dark:border-zinc-800/40">

            {/* PHOTO BANNIÈRE */}
            <div className="h-36 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 relative overflow-hidden">
              {fiche.photo_urls && fiche.photo_urls[0] ? (
                <img src={fiche.photo_urls[0]} alt={fiche.nom_projet} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-5xl font-black text-zinc-200 dark:text-zinc-700 select-none">{(fiche.nom_projet||"?").slice(0,2).toUpperCase()}</span>
                </div>
              )}
              <span className={`absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-lg border backdrop-blur-sm ${TYPE_COLORS[fiche.type_projet] || "bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-500 border-zinc-200 dark:border-zinc-700"}`}>
                {fiche.type_projet || "—"}
              </span>
            </div>

            {/* CONTENU */}
            <div className="p-6 flex flex-col gap-4">

              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{fiche.nom_projet}</h2>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">{fiche.key}</span>
                {(fiche.langue || (fiche as any).pays) && (
                  <div className="flex gap-2 mt-1.5">
                    {(fiche as any).pays && <span className="text-[11px] text-zinc-500 dark:text-zinc-400">📍 {(fiche as any).pays}</span>}
                    {fiche.langue && <span className="text-[11px] text-zinc-500 dark:text-zinc-400">🗣️ {fiche.langue}</span>}
                  </div>
                )}
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{fiche.description}</p>

              {/* Profil + avancement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {fiche.type_profil && (
                  <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">{lang==="fr"?"Profil":"Profile"}</p>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.type_profil}</p>
                  </div>
                )}
                {fiche.avancement && (
                  <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">{lang==="fr"?"Avancement":"Progress"}</p>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.avancement}</p>
                  </div>
                )}
                {fiche.idee && (
                  <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">{lang==="fr"?"Idée":"Idea"}</p>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.idee}</p>
                  </div>
                )}
                {fiche.produit && (
                  <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">{lang==="fr"?"Produit fonctionnel":"Functional product"}</p>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.produit}</p>
                  </div>
                )}
                {fiche.utilisateurs && (
                  <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">{lang==="fr"?"Utilisateurs":"Users"}</p>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.utilisateurs}</p>
                  </div>
                )}
                {fiche.revenus && (
                  <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">{lang==="fr"?"Revenus mensuels":"Monthly revenue"}</p>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.revenus}</p>
                  </div>
                )}
              </div>

              {/* Objectifs */}
              {(fiche.objectif_court || fiche.objectif_moyen || fiche.objectif_long) && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium">{lang==="fr"?"Objectifs":"Goals"}</p>
                  {fiche.objectif_court && (
                    <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] text-zinc-400 mb-0.5">{lang==="fr"?"Court terme":"Short term"}</p>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.objectif_court}</p>
                    </div>
                  )}
                  {fiche.objectif_moyen && (
                    <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] text-zinc-400 mb-0.5">{lang==="fr"?"Moyen terme":"Medium term"}</p>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.objectif_moyen}</p>
                    </div>
                  )}
                  {fiche.objectif_long && (
                    <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] text-zinc-400 mb-0.5">{lang==="fr"?"Long terme":"Long term"}</p>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.objectif_long}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Outils depuis tech */}
              {getOutils(fiche).length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] text-zinc-400 font-medium">{dict.outils} :</span>
                  {getOutils(fiche).map((outil, i) => (
                    <span key={i} className="text-[11px] bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-md font-mono">
                      {outil}
                    </span>
                  ))}
                </div>
              )}

              {/* Cherche + collaboration */}
              {getCherche(fiche) && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium">{dict.cherche}</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{getCherche(fiche)}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {fiche.temps && (
                  <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">{lang==="fr"?"Temps":"Time"}</p>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.temps}</p>
                  </div>
                )}
                {fiche.distance && (
                  <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">{lang==="fr"?"Distance":"Location"}</p>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.distance}</p>
                  </div>
                )}
                {fiche.engagement && (
                  <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">{lang==="fr"?"Engagement":"Commitment"}</p>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.engagement}</p>
                  </div>
                )}
              </div>

              <div className="h-px bg-zinc-100 dark:bg-zinc-800/60"/>

              {/* Section lock — dynamique selon l'état débloqué */}
              {unlockedIds.has(fiche.id) ? (
                <div className="flex flex-col gap-2 px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/40">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔓</span>
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      {lang==="fr"?"Débloqué — contacts disponibles":"Unlocked — contacts available"}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70">
                    {lang==="fr"?"Entre la Key du créateur pour accéder aux coordonnées.":"Enter the creator's Key to access contact info."}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30">
                  <span className="text-base">🔒</span>
                  <span className="text-sm text-zinc-400 dark:text-zinc-500">{dict.lock}</span>
                </div>
              )}

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

                {unlockedIds.has(fiche.id) ? (
                  <span className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white shadow-sm">
                    <span>✓</span>
                    <span>{lang==="fr"?"Débloqué":"Unlocked"}</span>
                  </span>
                ) : (
                  <button onClick={() => handleAcheter(fiche.id)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors shadow-sm">
                    <span>🔒</span>
                    <span>{dict.acheter} — 1,50$</span>
                  </button>
                )}
              </div>

              {/* Gérer ma fiche — visible pour tous, protégé par Key + email */}
              <button onClick={() => { setDeleteModalId(fiche.id); setDeleteError(null); }}
                className="text-[11px] text-zinc-300 dark:text-zinc-700 hover:text-red-400 transition-colors self-start mt-1">
                {lang==="fr"?"C'est ma fiche ? Gérer / supprimer":"Is this your listing? Manage / delete"}
              </button>

            </div>
          </div>
        ))}
      </div>

      {/* ── MODAL CONNEXION REQUISE ── */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowLoginModal(false)}>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>

            {/* Header — logo + langue + fermer */}
            <div className="flex items-center justify-between mb-5">
              <img src="/echo1.png" alt="Echo" className="w-8 h-8 rounded-full object-cover" />
              <div className="flex items-center gap-2">
                <button onClick={() => setLang(l => l === "fr" ? "en" : "fr")}
                  className="text-xs text-zinc-400 border border-zinc-200 dark:border-zinc-700 px-2 py-1 rounded-lg hover:border-zinc-400 transition-colors">
                  {lang === "fr" ? "EN" : "FR"}
                </button>
                <button onClick={() => setShowLoginModal(false)}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors text-lg leading-none w-6 h-6 flex items-center justify-center">
                  ✕
                </button>
              </div>
            </div>

            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2 text-center">
              {lang==="fr" ? "Connexion requise" : "Login required"}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-6">
              {lang==="fr"
                ? "Connecte-toi à ton compte pour débloquer cette fiche et accéder aux informations de contact."
                : "Log in to your account to unlock this listing and access contact information."}
            </p>

            <Link href="/1/account"
              className="block w-full text-center py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-sm hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors">
              {lang==="fr" ? "Se connecter" : "Log in"}
            </Link>
          </div>
        </div>
      )}

      {/* ── MODAL SUPPRESSION ── */}
      {deleteModalId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteModalId(null)}>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">{lang==="fr"?"Supprimer ma fiche":"Delete my listing"}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">{lang==="fr"?"Entre ta clé et ton courriel pour confirmer que cette fiche t'appartient. Cette action est irréversible.":"Enter your key and email to confirm this listing is yours. This action is irreversible."}</p>

            {deleteError && (
              <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
                {deleteError}
              </div>
            )}

            <div className="flex flex-col gap-3 mb-5">
              <input type="text" value={deleteKey} onChange={e => setDeleteKey(e.target.value)} placeholder="Key_A1"
                className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-zinc-400"/>
              <input type="email" value={deleteEmail} onChange={e => setDeleteEmail(e.target.value)} placeholder="toi@exemple.com"
                className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-400"/>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setDeleteModalId(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                {lang==="fr"?"Annuler":"Cancel"}
              </button>
              <button onClick={confirmDeleteFiche} disabled={deleting || !deleteKey.trim() || !deleteEmail.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                {deleting ? (lang==="fr"?"Suppression...":"Deleting...") : (lang==="fr"?"Supprimer":"Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}