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
  contacts_visibles: string[] | null;
  email_prive: string | null;
  discord_prive: string | null;
  github_prive: string | null;
  linkedin_prive: string | null;
  site_web_prive: string | null;
  telephone_prive: string | null;
  user_id: string;
  creator_email?: string;
};

const TYPE_COLORS: Record<string, string> = {
  "SaaS": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "App mobile": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Outil SaaS": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Contenu": "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

// ────────────────────────────────────────────────────────────────
// UTILITAIRE: Générer une KEY auto de 3 caractères (A1K style)
// ────────────────────────────────────────────────────────────────
const generateKey = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nums = "0123456789";
  const l1 = chars[Math.floor(Math.random() * chars.length)];
  const n1 = nums[Math.floor(Math.random() * nums.length)];
  const l2 = chars[Math.floor(Math.random() * chars.length)];
  const n2 = nums[Math.floor(Math.random() * nums.length)];
  const l3 = chars[Math.floor(Math.random() * chars.length)];
  return `${l1}${n1}${l2}${n2}${l3}`;
};

export default function FichePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
      setUserEmail(session?.user?.email || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
      setUserEmail(session?.user?.email || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());
  const [sentNotif, setSentNotif] = useState<{ id: string; type: "like" | "interet" } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Champs publics seulement — jamais les coords privées pour tout le monde
      const PUBLIC_FIELDS = "id,user_id,nom_projet,type_projet,type_profil,description,tech,cherche,engagement,temps,distance,avancement,idee,produit,utilisateurs,revenus,objectif_court,objectif_moyen,objectif_long,photo_urls,langue,likes,interets,created_at,contacts_visibles,creator_email";

      const { data, error } = await supabase
        .from("fiches")
        .select(PUBLIC_FIELDS)
        .order("created_at", { ascending: false });
      if (!error && data) {
        const fiches_with_keys = data.map((f: any) => ({
          ...f,
          key: f.key || generateKey(),
          // Champs privés vides par défaut — chargés séparément si autorisé
          email_prive: null, discord_prive: null, github_prive: null,
          linkedin_prive: null, site_web_prive: null, telephone_prive: null,
        }));
        setFiches(fiches_with_keys as Fiche[]);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!userId) {
      setUnlockedIds(new Set());
      return;
    }
    const checkUnlocks = async () => {
      const { data } = await supabase
        .from("tunnels")
        .select("fiche_id")
        .eq("acheteur_id", userId);
      if (data) {
        const ids = new Set(data.map((t: any) => t.fiche_id as string));
        setUnlockedIds(ids);
        // Charger les champs privés pour les fiches débloquées + les siennes
        loadPrivateFields(userId, ids);
      }
    };
    checkUnlocks();
  }, [userId]);

  const loadPrivateFields = async (uid: string, unlockedSet: Set<string>) => {
    // Charger les champs privés pour : mes fiches + fiches débloquées
    const fichesACharger = fiches.filter(f => f.user_id === uid || unlockedSet.has(f.id));
    if (fichesACharger.length === 0) return;

    const ids = fichesACharger.map(f => f.id);
    const { data } = await supabase
      .from("fiches")
      .select("id,key,email_prive,discord_prive,github_prive,linkedin_prive,site_web_prive,telephone_prive")
      .in("id", ids);

    if (data) {
      setFiches(prev => prev.map(f => {
        const priv = data.find((d: any) => d.id === f.id);
        return priv ? { ...f, ...priv } : f;
      }));
    }
  };

  const getOutils = (fiche: Fiche) => {
    if (!fiche.tech) return [];
    return Object.values(fiche.tech).flat().filter(Boolean);
  };

  const getCherche = (fiche: Fiche) => {
    if (!fiche.cherche || fiche.cherche.length === 0) return "";
    return fiche.cherche.join(", ");
  };

  const isOwnFiche = (fiche: Fiche) => userId === fiche.user_id;

  const dict = {
    fr: {
      title: "Fiches projets",
      subtitle: "Des fondateurs solos qui cherchent des synergies.",
      cherche: "Cherche",
      outils: "Outils",
      like: "Intérêt",
      interet: "Très intéressé",
      acheter: "Voir les infos",
      lock: "🔒 Infos de contact",
      notifLike: "Notification d'intérêt envoyée",
      notifInteret: "Notification envoyée — très intéressé",
      myFiche: "C'est ma fiche",
      manage: "Supprimer",
      modifier: "Modifier",
      sendKey: "Envoyer ma clé",
      ownFiche: "Votre fiche",
      regulation: "⚠️ Règlement: Toute info fausse mènera à un bannissement.",
    },
    en: {
      title: "Project listings",
      subtitle: "Solo founders looking for synergies.",
      cherche: "Looking for",
      outils: "Tools",
      like: "Interest",
      interet: "Very interested",
      acheter: "See contact info",
      lock: "🔒 Contact info",
      notifLike: "Interest notification sent",
      notifInteret: "Notification sent — very interested",
      myFiche: "My listing",
      manage: "Delete",
      modifier: "Edit",
      sendKey: "Send my key",
      ownFiche: "Your listing",
      regulation: "⚠️ Policy: Any false info will result in ban.",
    },
  }[lang];

  const handleLike = async (id: string) => {
    if (likedIds.has(id)) return;

    const fiche = fiches.find(f => f.id === id);
    if (!fiche) return;

    setLikedIds(prev => new Set([...prev, id]));
    setSentNotif({ id, type: "like" });
    setTimeout(() => setSentNotif(null), 3000);

    try {
      await fetch("/api/notifications/interet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fiche_id: id,
          fiche_nom: fiche.nom_projet,
          fiche_key: fiche.key,
          sender_email: userEmail || "anonymous@visitor.local",
          creator_email: fiche.creator_email,
          type: "interesse",
        }),
      });
    } catch (e) {
      console.error("Notif like:", e);
    }
  };

  const handleInteret = async (id: string) => {
    if (interestedIds.has(id)) return;

    const fiche = fiches.find(f => f.id === id);
    if (!fiche) return;

    setInterestedIds(prev => new Set([...prev, id]));
    setSentNotif({ id, type: "interet" });
    setTimeout(() => setSentNotif(null), 3000);

    try {
      await fetch("/api/notifications/interet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fiche_id: id,
          fiche_nom: fiche.nom_projet,
          fiche_key: fiche.key,
          sender_email: userEmail || "anonymous@visitor.local",
          creator_email: fiche.creator_email,
          type: "tres_interesse",
        }),
      });
    } catch (e) {
      console.error("Notif interet:", e);
    }
  };

  // ── SAISIE KEY POUR RÉVÉLER LES CONTACTS ─────────────────────────────────
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [keyErrors, setKeyErrors] = useState<Record<string, string>>({});
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // ── CLÉ PERDUE ────────────────────────────────────────────────────────────
  const [lostKeyFicheId, setLostKeyFicheId] = useState<string | null>(null);
  const [lostKeyEmail, setLostKeyEmail] = useState("");
  const [lostKeySending, setLostKeySending] = useState(false);
  const [lostKeyMsg, setLostKeyMsg] = useState<string | null>(null);

  const handleLostKey = async () => {
    if (!lostKeyFicheId || !lostKeyEmail.trim()) return;
    setLostKeySending(true);
    setLostKeyMsg(null);
    try {
      const fiche = fiches.find(f => f.id === lostKeyFicheId);
      if (!fiche) throw new Error("Fiche introuvable");
      const res = await fetch("/api/notifications/cle-perdue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fiche_id: fiche.id,
          fiche_nom: fiche.nom_projet,
          fiche_key: fiche.key,
          email_demandeur: lostKeyEmail.trim(),
          creator_email: fiche.creator_email,
        }),
      });
      if (res.ok) {
        setLostKeyMsg(lang === "fr" ? "✅ Email envoyé ! Vérifie ta boîte mail." : "✅ Email sent! Check your inbox.");
        setTimeout(() => { setLostKeyFicheId(null); setLostKeyEmail(""); setLostKeyMsg(null); }, 3000);
      } else {
        setLostKeyMsg(lang === "fr" ? "❌ Erreur d'envoi." : "❌ Send error.");
      }
    } catch {
      setLostKeyMsg(lang === "fr" ? "❌ Erreur réseau." : "❌ Network error.");
    } finally {
      setLostKeySending(false);
    }
  };

  const handleVerifyKey = (fiche: Fiche) => {
    const entered = (keyInputs[fiche.id] || "").trim();
    if (!entered) {
      setKeyErrors(prev => ({ ...prev, [fiche.id]: lang === "fr" ? "Entre une clé." : "Enter a key." }));
      return;
    }
    if (entered.toUpperCase() !== fiche.key.toUpperCase()) {
      setKeyErrors(prev => ({ ...prev, [fiche.id]: lang === "fr" ? "Clé incorrecte." : "Incorrect key." }));
      return;
    }
    setKeyErrors(prev => {
      const n = { ...prev };
      delete n[fiche.id];
      return n;
    });
    setRevealedIds(prev => new Set([...prev, fiche.id]));
  };

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [authEmailMode, setAuthEmailMode] = useState<"signin"|"signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string|null>(null);
  const [authSuccess, setAuthSuccess] = useState<string|null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/1/fiche`, scopes: "openid profile email", queryParams: { prompt: "select_account" } } });
  };
  const handleMicrosoft = async () => {
    await supabase.auth.signInWithOAuth({ provider: "azure", options: { redirectTo: `${window.location.origin}/1/fiche`, scopes: "openid profile email User.Read" } });
  };
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(null); setAuthSuccess(null); setAuthLoading(true);
    if (authEmailMode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
      if (error) setAuthError(error.message);
      else setShowAuthPopup(false);
    } else {
      const { data, error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword, options: { emailRedirectTo: `${window.location.origin}/1/fiche` } });
      if (error) setAuthError(error.message);
      else if (data?.user && (!data.user.identities || data.user.identities.length === 0)) setAuthError("Compte existant.");
      else setAuthSuccess(lang === "fr" ? "Vérifiez votre boîte mail !" : "Check your inbox!");
    }
    setAuthLoading(false);
  };
  const handleLogout = async () => { await supabase.auth.signOut(); setUserId(null); setUserEmail(null); };

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
        console.error("Reponse non-JSON du serveur");
        alert(lang === "fr" ? "Erreur de configuration du paiement. Reessaie plus tard." : "Payment configuration error. Try again later.");
        return;
      }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.message || (lang === "fr" ? "Erreur lors du paiement." : "Payment error."));
    } catch (e) {
      console.error("Checkout fiche:", e);
      alert(lang === "fr" ? "Erreur reseau." : "Network error.");
    }
  };

  // ── SUPPRESSION FICHE PAR KEY ────────────────────────────────────────────
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [deleteKey, setDeleteKey] = useState("");
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        setDeleteError(data.error || (lang === "fr" ? "Erreur lors de la suppression." : "Error during deletion."));
        return;
      }
      setFiches(prev => prev.filter(f => f.id !== deleteModalId));
      setDeleteModalId(null);
      setDeleteKey("");
      setDeleteEmail("");
    } catch {
      setDeleteError(lang === "fr" ? "Erreur réseau." : "Network error.");
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
        <Link href="/1/hall" className="font-bold text-sm text-zinc-800 dark:text-zinc-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
          Echo AI
        </Link>
        <div className="flex items-center gap-6 text-sm flex-wrap">
          <Link href="/1/hall" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
            {lang === "fr" ? "Hall" : "Hall"}
          </Link>
          <Link href="/1/dashboard" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
            {lang === "fr" ? "Dashboard" : "Dashboard"}
          </Link>
          <Link href="/1/conversation" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
            {lang === "fr" ? "Conversation" : "Conversation"}
          </Link>
          <Link href="/1/form" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
            {lang === "fr" ? "Formulaire" : "Form"}
          </Link>
          <Link href="/1/fiche" className="text-cyan-600 dark:text-cyan-400 font-semibold">
            {lang === "fr" ? "Fiches" : "Listings"}
          </Link>
          <Link href="/1/desktop" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
            {lang === "fr" ? "Bureau" : "Desktop"}
          </Link>
          <Link href="/1/account" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
            {lang === "fr" ? "Compte" : "Account"}
          </Link>
          <button
            onClick={() => setLang(l => (l === "fr" ? "en" : "fr"))}
            className="text-xs text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded-lg hover:border-zinc-400 transition-colors"
          >
            {lang === "fr" ? "EN" : "FR"}
          </button>
          {userId ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                {userEmail}
              </span>
              <button onClick={handleLogout} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">
                ↩
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAuthPopup(true)}
              className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 rounded-full hover:bg-cyan-500/20 transition-colors">
              {lang === "fr" ? "Se connecter" : "Sign in"}
            </button>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-10">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">{dict.title}</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-base">{dict.subtitle}</p>
      </div>

      {/* ── FICHES ── */}
      <div className="max-w-4xl mx-auto px-6 pb-32 flex flex-col gap-8">
        {loading && (
          <div className="text-center py-20 text-zinc-400 text-sm">
            {lang === "fr" ? "Chargement des fiches..." : "Loading listings..."}
          </div>
        )}

        {!loading && fiches.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-400 text-sm mb-4">
              {lang === "fr" ? "Aucune fiche pour le moment." : "No listings yet."}
            </p>
            <Link
              href="/1/form"
              className="text-sm font-semibold text-zinc-900 dark:text-white underline underline-offset-4"
            >
              {lang === "fr" ? "Créer la première →" : "Create the first one →"}
            </Link>
          </div>
        )}

        {!loading &&
          fiches.map(fiche => {
            const isOwn = isOwnFiche(fiche);

            return (
              <div
                key={fiche.id}
                className={`relative group bg-white dark:bg-zinc-900/40 rounded-2xl overflow-hidden transition-all duration-300
                   ${
                     isOwn
                       ? "border-2 border-cyan-500/80 dark:border-cyan-400/70 shadow-lg shadow-cyan-500/20 dark:shadow-cyan-500/30"
                       : "border border-zinc-200 dark:border-zinc-800/60 hover:border-cyan-500/60 dark:hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/10 dark:hover:shadow-cyan-500/20"
                   }`}
              >
                {/* ── BADGE: C'EST MA FICHE ── */}
                {isOwn && (
                  <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-cyan-600/90 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                    <span>✓</span>
                    <span>{dict.ownFiche}</span>
                  </div>
                )}

                {/* ── PHOTO BANNIÈRE ── */}
                <div className="h-36 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 relative overflow-hidden">
                  {fiche.photo_urls && fiche.photo_urls[0] ? (
                    <img src={fiche.photo_urls[0]} alt={fiche.nom_projet} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-5xl font-black text-zinc-200 dark:text-zinc-700 select-none">
                        {(fiche.nom_projet || "?").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span
                    className={`absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-lg border backdrop-blur-sm ${
                      TYPE_COLORS[fiche.type_projet] ||
                      "bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-500 border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    {fiche.type_projet || "—"}
                  </span>
                </div>

                {/* ── CONTENU ── */}
                <div className="p-6 flex flex-col gap-4">
                  {/* En-tête: Titre + Key (PRIVÉE si ce n'est pas ta fiche) */}
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{fiche.nom_projet}</h2>
                    {isOwn ? (
                      <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/30 px-2 py-1 rounded inline-block mt-1 border border-cyan-200/50 dark:border-cyan-800/50">
                        🔑 {fiche.key}
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 px-2 py-1 rounded inline-block mt-1">
                        🔐 {lang === "fr" ? "Clé privée" : "Private key"}
                      </span>
                    )}
                    {(fiche.langue || (fiche as any).pays) && (
                      <div className="flex gap-2 mt-2">
                        {(fiche as any).pays && (
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">📍 {(fiche as any).pays}</span>
                        )}
                        {fiche.langue && (
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">🗣️ {fiche.langue}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{fiche.description}</p>

                  {/* Grid: Profil + Avancement + etc */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {fiche.type_profil && (
                      <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50 hover:border-cyan-400/50 dark:hover:border-cyan-500/40 transition-colors">
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">
                          {lang === "fr" ? "Profil" : "Profile"}
                        </p>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.type_profil}</p>
                      </div>
                    )}
                    {fiche.avancement && (
                      <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50 hover:border-cyan-400/50 dark:hover:border-cyan-500/40 transition-colors">
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">
                          {lang === "fr" ? "Avancement" : "Progress"}
                        </p>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.avancement}</p>
                      </div>
                    )}
                    {fiche.idee && (
                      <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50 hover:border-cyan-400/50 dark:hover:border-cyan-500/40 transition-colors">
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">
                          {lang === "fr" ? "Idée" : "Idea"}
                        </p>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.idee}</p>
                      </div>
                    )}
                    {fiche.produit && (
                      <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50 hover:border-cyan-400/50 dark:hover:border-cyan-500/40 transition-colors">
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">
                          {lang === "fr" ? "Produit" : "Product"}
                        </p>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.produit}</p>
                      </div>
                    )}
                    {fiche.utilisateurs && (
                      <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50 hover:border-cyan-400/50 dark:hover:border-cyan-500/40 transition-colors">
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">
                          {lang === "fr" ? "Utilisateurs" : "Users"}
                        </p>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.utilisateurs}</p>
                      </div>
                    )}
                    {fiche.revenus && (
                      <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50 hover:border-cyan-400/50 dark:hover:border-cyan-500/40 transition-colors">
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">
                          {lang === "fr" ? "Revenus" : "Revenue"}
                        </p>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.revenus}</p>
                      </div>
                    )}
                  </div>

                  {/* Objectifs */}
                  {(fiche.objectif_court || fiche.objectif_moyen || fiche.objectif_long) && (
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium">
                        {lang === "fr" ? "Objectifs" : "Goals"}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {fiche.objectif_court && (
                          <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50 hover:border-cyan-400/50 dark:hover:border-cyan-500/40 transition-colors">
                            <p className="text-[10px] text-zinc-400 mb-0.5">
                              {lang === "fr" ? "Court terme" : "Short"}
                            </p>
                            <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.objectif_court}</p>
                          </div>
                        )}
                        {fiche.objectif_moyen && (
                          <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50 hover:border-cyan-400/50 dark:hover:border-cyan-500/40 transition-colors">
                            <p className="text-[10px] text-zinc-400 mb-0.5">
                              {lang === "fr" ? "Moyen terme" : "Medium"}
                            </p>
                            <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.objectif_moyen}</p>
                          </div>
                        )}
                        {fiche.objectif_long && (
                          <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50 hover:border-cyan-400/50 dark:hover:border-cyan-500/40 transition-colors">
                            <p className="text-[10px] text-zinc-400 mb-0.5">
                              {lang === "fr" ? "Long terme" : "Long"}
                            </p>
                            <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.objectif_long}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Outils */}
                  {getOutils(fiche).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[11px] text-zinc-400 font-medium">{dict.outils} :</span>
                      {getOutils(fiche).map((outil, i) => (
                        <span
                          key={i}
                          className="text-[11px] bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-md font-mono border border-zinc-200/50 dark:border-zinc-700/50 hover:border-cyan-400/50 transition-colors"
                        >
                          {outil}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Cherche */}
                  {getCherche(fiche) && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium">{dict.cherche}</p>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">{getCherche(fiche)}</p>
                    </div>
                  )}

                  {/* Temps + Distance + Engagement */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {fiche.temps && (
                      <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50 hover:border-cyan-400/50 dark:hover:border-cyan-500/40 transition-colors">
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">
                          {lang === "fr" ? "Temps" : "Time"}
                        </p>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.temps}</p>
                      </div>
                    )}
                    {fiche.distance && (
                      <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50 hover:border-cyan-400/50 dark:hover:border-cyan-500/40 transition-colors">
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">
                          {lang === "fr" ? "Distance" : "Location"}
                        </p>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.distance}</p>
                      </div>
                    )}
                    {fiche.engagement && (
                      <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50 hover:border-cyan-400/50 dark:hover:border-cyan-500/40 transition-colors">
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">
                          {lang === "fr" ? "Engagement" : "Commitment"}
                        </p>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300">{fiche.engagement}</p>
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-zinc-100 dark:bg-zinc-800/60" />

                  {/* ── SECTION UNLOCK ── */}
                  {isOwn ? (
                    // Si c'est ta fiche: montrer les infos directement
                    <div className="flex flex-col gap-2 px-4 py-3 rounded-2xl bg-cyan-50/30 dark:bg-cyan-950/20 border border-cyan-400/50 dark:border-cyan-500/40">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">🔓</span>
                        <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-400">
                          {lang === "fr" ? "Coordonnées" : "Contact info"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {fiche.contacts_visibles?.includes("Email") && fiche.email_prive && (
                          <p className="text-sm text-zinc-700 dark:text-zinc-300">
                            <span className="text-zinc-400 text-xs">Email :</span> {fiche.email_prive}
                          </p>
                        )}
                        {fiche.contacts_visibles?.includes("Discord") && fiche.discord_prive && (
                          <p className="text-sm text-zinc-700 dark:text-zinc-300">
                            <span className="text-zinc-400 text-xs">Discord :</span> {fiche.discord_prive}
                          </p>
                        )}
                        {fiche.contacts_visibles?.includes("GitHub") && fiche.github_prive && (
                          <p className="text-sm text-zinc-700 dark:text-zinc-300">
                            <span className="text-zinc-400 text-xs">GitHub :</span> {fiche.github_prive}
                          </p>
                        )}
                        {fiche.contacts_visibles?.includes("LinkedIn") && fiche.linkedin_prive && (
                          <p className="text-sm text-zinc-700 dark:text-zinc-300">
                            <span className="text-zinc-400 text-xs">LinkedIn :</span> {fiche.linkedin_prive}
                          </p>
                        )}
                        {fiche.contacts_visibles?.includes("Site web") && fiche.site_web_prive && (
                          <p className="text-sm text-zinc-700 dark:text-zinc-300">
                            <span className="text-zinc-400 text-xs">{lang === "fr" ? "Site web" : "Website"} :</span>{" "}
                            {fiche.site_web_prive}
                          </p>
                        )}
                        {fiche.contacts_visibles?.includes("Téléphone") && fiche.telephone_prive && (
                          <p className="text-sm text-zinc-700 dark:text-zinc-300">
                            <span className="text-zinc-400 text-xs">{lang === "fr" ? "Téléphone" : "Phone"} :</span>{" "}
                            {fiche.telephone_prive}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : unlockedIds.has(fiche.id) ? (
                    revealedIds.has(fiche.id) ? (
                      <div className="flex flex-col gap-2 px-4 py-3 rounded-2xl bg-cyan-50/30 dark:bg-cyan-950/20 border border-cyan-400/50 dark:border-cyan-500/40">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">🔓</span>
                          <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-400">
                            {lang === "fr" ? "Coordonnées" : "Contact info"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {fiche.contacts_visibles?.includes("Email") && fiche.email_prive && (
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">
                              <span className="text-zinc-400 text-xs">Email :</span> {fiche.email_prive}
                            </p>
                          )}
                          {fiche.contacts_visibles?.includes("Discord") && fiche.discord_prive && (
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">
                              <span className="text-zinc-400 text-xs">Discord :</span> {fiche.discord_prive}
                            </p>
                          )}
                          {fiche.contacts_visibles?.includes("GitHub") && fiche.github_prive && (
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">
                              <span className="text-zinc-400 text-xs">GitHub :</span> {fiche.github_prive}
                            </p>
                          )}
                          {fiche.contacts_visibles?.includes("LinkedIn") && fiche.linkedin_prive && (
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">
                              <span className="text-zinc-400 text-xs">LinkedIn :</span> {fiche.linkedin_prive}
                            </p>
                          )}
                          {fiche.contacts_visibles?.includes("Site web") && fiche.site_web_prive && (
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">
                              <span className="text-zinc-400 text-xs">{lang === "fr" ? "Site web" : "Website"} :</span>{" "}
                              {fiche.site_web_prive}
                            </p>
                          )}
                          {fiche.contacts_visibles?.includes("Téléphone") && fiche.telephone_prive && (
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">
                              <span className="text-zinc-400 text-xs">{lang === "fr" ? "Téléphone" : "Phone"} :</span>{" "}
                              {fiche.telephone_prive}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 px-4 py-3 rounded-2xl bg-cyan-50/30 dark:bg-cyan-950/20 border border-cyan-400/50 dark:border-cyan-500/40">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🔓</span>
                          <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-400">
                            {lang === "fr" ? "Clé requise" : "Key required"}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={keyInputs[fiche.id] || ""}
                            placeholder="Ex: A1K"
                            onChange={e => setKeyInputs(prev => ({ ...prev, [fiche.id]: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === "Enter") handleVerifyKey(fiche);
                            }}
                            className="flex-1 bg-white dark:bg-zinc-900 border border-cyan-400/50 dark:border-cyan-500/40 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                          />
                          <button
                            onClick={() => handleVerifyKey(fiche)}
                            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-cyan-500/30"
                          >
                            {lang === "fr" ? "Voir" : "Show"}
                          </button>
                        </div>
                        {keyErrors[fiche.id] && <p className="text-xs text-red-500">{keyErrors[fiche.id]}</p>}
                        <button
                          type="button"
                          onClick={() => { setLostKeyFicheId(fiche.id); setLostKeyEmail(""); setLostKeyMsg(null); }}
                          className="text-xs text-zinc-400 hover:text-cyan-400 transition-colors mt-1 underline underline-offset-2"
                        >
                          {lang === "fr" ? "Clé perdue ?" : "Lost key?"}
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/40">
                      <span className="text-base">🔒</span>
                      <span className="text-sm text-zinc-400 dark:text-zinc-500">{dict.lock}</span>
                    </div>
                  )}

                  {/* ── ACTIONS ── */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      onClick={() => handleLike(fiche.id)}
                      disabled={isOwn}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                        isOwn
                          ? "opacity-50 cursor-not-allowed"
                          : likedIds.has(fiche.id)
                          ? "bg-rose-500/10 border-rose-500/50 text-rose-400"
                          : "border-zinc-200 dark:border-zinc-700/60 text-zinc-500 hover:border-rose-400/50 hover:text-rose-400 hover:bg-rose-50/20 dark:hover:bg-rose-950/20"
                      }`}
                    >
                      <span>♥</span>
                      <span>{dict.like}</span>
                      <span className="text-[10px] opacity-60">{fiche.likes + (likedIds.has(fiche.id) ? 1 : 0)}</span>
                    </button>

                    <button
                      onClick={() => handleInteret(fiche.id)}
                      disabled={isOwn}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                        isOwn
                          ? "opacity-50 cursor-not-allowed"
                          : interestedIds.has(fiche.id)
                          ? "bg-amber-500/10 border-amber-500/50 text-amber-400"
                          : "border-zinc-200 dark:border-zinc-700/60 text-zinc-500 hover:border-amber-400/50 hover:text-amber-400 hover:bg-amber-50/20 dark:hover:bg-amber-950/20"
                      }`}
                    >
                      <span>★</span>
                      <span>{dict.interet}</span>
                      <span className="text-[10px] opacity-60">
                        {fiche.interets + (interestedIds.has(fiche.id) ? 1 : 0)}
                      </span>
                    </button>

                    <div className="flex-1" />

                    {isOwn ? (
                      <span className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-cyan-600/20 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400 border border-cyan-400/50 dark:border-cyan-500/40">
                        <span>✓</span>
                        <span>{lang === "fr" ? "Votre fiche" : "Your listing"}</span>
                      </span>
                    ) : unlockedIds.has(fiche.id) ? (
                      <span className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-cyan-600/20 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400 border border-cyan-400/50 dark:border-cyan-500/40">
                        <span>✓</span>
                        <span>{lang === "fr" ? "Débloqué" : "Unlocked"}</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAcheter(fiche.id)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-all hover:shadow-lg hover:shadow-cyan-500/30"
                      >
                        <span>🔒</span>
                        <span>{dict.acheter} — 1,50$</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* ── STICKY FOOTER: GÉRER MA FICHE ── */}
                {isOwn && (
                  <div className="sticky bottom-0 left-0 right-0 border-t border-cyan-400/30 dark:border-cyan-500/20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm px-6 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{dict.regulation}</p>
                      <button
                        onClick={() => {
                          setDeleteModalId(fiche.id);
                          setDeleteError(null);
                        }}
                        className="text-sm font-semibold text-red-500 hover:text-red-400 transition-colors"
                      >
                        {dict.manage} →
                      </button>
                      <span className="text-zinc-600">·</span>
                      <button
                        type="button"
                        onClick={() => { setLostKeyFicheId(fiche.id); setLostKeyEmail(userEmail || ""); setLostKeyMsg(null); }}
                        className="text-sm font-semibold text-amber-500 hover:text-amber-400 transition-colors"
                      >
                        🔑 {dict.sendKey}
                      </button>
                      <span className="text-zinc-600">·</span>
                      <Link
                        href={`/1/form?edit=${fiche.id}`}
                        className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors"
                      >
                        ✏️ {dict.modifier}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* ── MODAL CONNEXION REQUISE ── */}
      {/* ── POPUP AUTH ──────────────────────────────────────────────────────── */}
      {showAuthPopup && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAuthPopup(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-zinc-200 dark:border-zinc-700"
            onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="text-3xl mb-2">🔐</div>
              <h3 className="font-bold text-base dark:text-white">
                {lang === "fr" ? "Connexion" : "Sign in"}
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                {lang === "fr" ? "Accédez à votre fiche et vos contacts." : "Access your listing and contacts."}
              </p>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              <button onClick={handleGoogle}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:border-zinc-400 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.18 2.18 5.94l3.66 2.84c.87-2.6 3.3-4.4 6.16-4.4z" fill="#EA4335"/></svg>
                Google
              </button>
              <button onClick={handleMicrosoft}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-800 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors">
                <svg width="16" height="16" viewBox="0 0 23 23" fill="none"><path d="M0 0H11V11H0V0Z" fill="#F25022"/><path d="M12 0H23V11H12V0Z" fill="#7FBA00"/><path d="M0 12H11V23H0V12Z" fill="#00A4EF"/><path d="M12 12H23V23H12V12Z" fill="#FFB900"/></svg>
                Microsoft
              </button>
            </div>
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200 dark:border-zinc-700"/></div>
              <div className="relative flex justify-center"><span className="bg-white dark:bg-zinc-900 px-2 text-xs text-zinc-400">{lang === "fr" ? "ou par email" : "or by email"}</span></div>
            </div>
            <form onSubmit={handleEmailAuth} className="flex flex-col gap-2">
              <input type="email" placeholder={lang === "fr" ? "ton@email.com" : "your@email.com"} value={authEmail} onChange={e => setAuthEmail(e.target.value)} required
                className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm dark:bg-zinc-800 dark:text-white outline-none focus:border-cyan-500" />
              <input type="password" placeholder="••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required
                className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm dark:bg-zinc-800 dark:text-white outline-none focus:border-cyan-500" />
              {authError && <p className="text-xs text-red-400">{authError}</p>}
              {authSuccess && <p className="text-xs text-emerald-400">{authSuccess}</p>}
              <button type="submit" disabled={authLoading}
                className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                {authLoading ? "…" : authEmailMode === "signin" ? (lang === "fr" ? "Se connecter" : "Sign in") : (lang === "fr" ? "Créer un compte" : "Create account")}
              </button>
            </form>
            <button onClick={() => { setAuthEmailMode(m => m === "signin" ? "signup" : "signin"); setAuthError(null); setAuthSuccess(null); }}
              className="w-full mt-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors underline underline-offset-2">
              {authEmailMode === "signin" ? (lang === "fr" ? "Pas de compte ? Créer" : "No account? Create one") : (lang === "fr" ? "Déjà un compte ?" : "Already have an account?")}
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL CLÉ PERDUE ──────────────────────────────────────────────────── */}
      {lostKeyFicheId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLostKeyFicheId(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-zinc-200 dark:border-zinc-700"
            onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">🔑</div>
              <h3 className="font-bold text-base dark:text-white">
                {lang === "fr" ? "Retrouver ma clé" : "Recover my key"}
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                {lang === "fr"
                  ? "Entre l'adresse email utilisée pour créer ta fiche. Ta clé te sera envoyée."
                  : "Enter the email used to create your listing. Your key will be sent to you."}
              </p>
            </div>
            <input
              type="email"
              value={lostKeyEmail}
              onChange={e => setLostKeyEmail(e.target.value)}
              placeholder={lang === "fr" ? "ton@email.com" : "your@email.com"}
              className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm dark:bg-zinc-800 dark:text-white mb-3 outline-none focus:border-cyan-500"
            />
            {lostKeyMsg && (
              <p className={`text-xs mb-3 text-center ${lostKeyMsg.startsWith("✅") ? "text-green-500" : "text-red-400"}`}>
                {lostKeyMsg}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setLostKeyFicheId(null)}
                className="flex-1 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-500 hover:border-zinc-400 transition-colors"
              >
                {lang === "fr" ? "Annuler" : "Cancel"}
              </button>
              <button
                onClick={handleLostKey}
                disabled={lostKeySending || !lostKeyEmail.trim()}
                className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {lostKeySending
                  ? (lang === "fr" ? "Envoi…" : "Sending…")
                  : (lang === "fr" ? "Envoyer ma clé" : "Send my key")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowLoginModal(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-cyan-400/50 dark:border-cyan-500/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-cyan-500/10 relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <img src="/echo1.png" alt="Echo" className="w-8 h-8 rounded-full object-cover" />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLang(l => (l === "fr" ? "en" : "fr"))}
                  className="text-xs text-zinc-400 border border-zinc-200 dark:border-zinc-700 px-2 py-1 rounded-lg hover:border-zinc-400 transition-colors"
                >
                  {lang === "fr" ? "EN" : "FR"}
                </button>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors text-lg leading-none w-6 h-6 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>

            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2 text-center">
              {lang === "fr" ? "Connexion requise" : "Login required"}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-6">
              {lang === "fr"
                ? "Connecte-toi à ton compte pour débloquer cette fiche et accéder aux informations de contact."
                : "Log in to your account to unlock this listing and access contact information."}
            </p>

            <Link
              href="/1/account"
              className="block w-full text-center py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-cyan-500/30"
            >
              {lang === "fr" ? "Se connecter" : "Log in"}
            </Link>
          </div>
        </div>
      )}

      {/* ── MODAL SUPPRESSION ── */}
      {deleteModalId && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setDeleteModalId(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-cyan-400/50 dark:border-cyan-500/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-cyan-500/10"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              {lang === "fr" ? "Supprimer ma fiche" : "Delete my listing"}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              {lang === "fr"
                ? "Entre ta clé et ton courriel pour confirmer que cette fiche t'appartient. Cette action est irréversible."
                : "Enter your key and email to confirm this listing is yours. This action is irreversible."}
            </p>

            {deleteError && (
              <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
                {deleteError}
              </div>
            )}

            <div className="flex flex-col gap-3 mb-5">
              <input
                type="text"
                value={deleteKey}
                onChange={e => setDeleteKey(e.target.value)}
                placeholder="Ex: A1K"
                className="bg-zinc-50 dark:bg-zinc-800 border border-cyan-400/50 dark:border-cyan-500/40 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
              />
              <input
                type="email"
                value={deleteEmail}
                onChange={e => setDeleteEmail(e.target.value)}
                placeholder="toi@exemple.com"
                className="bg-zinc-50 dark:bg-zinc-800 border border-cyan-400/50 dark:border-cyan-500/40 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setDeleteModalId(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                {lang === "fr" ? "Annuler" : "Cancel"}
              </button>
              <button
                onClick={confirmDeleteFiche}
                disabled={deleting || !deleteKey.trim() || !deleteEmail.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {deleting ? (lang === "fr" ? "Suppression..." : "Deleting...") : (lang === "fr" ? "Supprimer" : "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}