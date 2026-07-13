"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Fiche = {
  id: string;
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

type Comment = { id: string; user_pseudo: string; text: string; created_at: string };

type Tier = "none" | "bronze" | "argent" | "or" | "vip";
const TIER_LABEL: Record<Tier, string> = { none: "", bronze: "Bronze", argent: "Argent", or: "Or", vip: "VIP" };
const TIER_IMG = (tier: Tier) => `/${tier}.png`;

const TYPE_COLORS: Record<string, string> = {
  "Application ou site web":       "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Boutique en ligne":             "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Blog ou site d'articles":       "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Vidéos ou podcast":             "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Livre numérique":               "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "Formation et apprentissage":    "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

// ────────────────────────────────────────────────────────────────
// TRADUCTIONS "HUMAINES"
// ────────────────────────────────────────────────────────────────
const friendlyProduit = (raw: string, lang: "fr" | "en"): string => {
  const v = (raw || "").toLowerCase();
  const map: Record<string, { fr: string; en: string }> = {
    "non.":          { fr: "Pas encore de produit",      en: "No product yet" },
    "partiellement.":{ fr: "MVP en cours",                en: "MVP in progress" },
    "oui.":          { fr: "Produit disponible",          en: "Product available" },
  };
  for (const key in map) if (v === key || v.startsWith(key.replace(".", ""))) return map[key][lang];
  return raw;
};
const friendlyUtilisateurs = (raw: string, lang: "fr" | "en"): string => {
  const v = (raw || "").toLowerCase();
  if (v.startsWith("aucun")) return lang === "fr" ? "Premiers utilisateurs recherchés" : "Looking for first users";
  if (v.includes("préfère") || v.includes("rather")) return lang === "fr" ? "Non communiqué" : "Not disclosed";
  return raw;
};
const friendlyRevenus = (raw: string, lang: "fr" | "en"): string => {
  const v = (raw || "").toLowerCase();
  if (v.startsWith("aucun")) return lang === "fr" ? "Pas encore monétisé" : "Not monetized yet";
  if (v.includes("préfère") || v.includes("rather")) return lang === "fr" ? "Non communiqué" : "Not disclosed";
  return raw;
};

const TECH_HIDE = new Set(["aucun", "autre", "none", "other"]);

// Détection basique de partage de coordonnées — première ligne de défense,
// pas une garantie absolue (les gens contournent avec "point"/"arobase").
const CONTACT_PATTERN = /[\w.+-]+@[\w-]+\.[a-z]{2,}|(\+?\d[\d\s.-]{8,}\d)/i;

export default function FichePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [pseudo, setPseudo] = useState<string>("");
  const [pseudoInput, setPseudoInput] = useState<string>("");

  useEffect(() => {
    const loadSession = async (uid: string | null, email: string | null) => {
      setUserId(uid);
      setUserEmail(email);
      if (uid) {
        const { data } = await supabase.from("profiles").select("username").eq("id", uid).maybeSingle();
        if (data?.username) setPseudo(data.username);
      } else {
        setPseudo("");
      }
    };
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadSession(session?.user?.id || null, session?.user?.email || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      loadSession(session?.user?.id || null, session?.user?.email || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const savePseudo = async () => {
    const clean = pseudoInput.trim();
    if (!clean || !userId) return;
    await supabase.from("profiles").upsert({ id: userId, username: clean, updated_at: new Date().toISOString() });
    setPseudo(clean);
  };

  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [loading, setLoading] = useState(true);
  const [myInteretIds, setMyInteretIds] = useState<Set<string>>(new Set()); // fiches où j'ai déjà cliqué "Intérêt"
  const [sentNotif, setSentNotif] = useState<string | null>(null);

  // Chat par fiche
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});
  const [ownerPseudos, setOwnerPseudos] = useState<Record<string, string>>({});
  const [badgeMap, setBadgeMap] = useState<Record<string, Tier>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const PUBLIC_FIELDS = "id,user_id,nom_projet,type_projet,type_profil,description,tech,cherche,engagement,temps,distance,avancement,idee,produit,utilisateurs,revenus,objectif_court,objectif_moyen,objectif_long,photo_urls,langue,interets,created_at,contacts_visibles,creator_email";
      const { data, error } = await supabase.from("fiches").select(PUBLIC_FIELDS).order("created_at", { ascending: false });
      if (!error && data) {
        const withDefaults = data.map((f: any) => ({
          ...f,
          email_prive: null, discord_prive: null, github_prive: null,
          linkedin_prive: null, site_web_prive: null, telephone_prive: null,
        }));
        setFiches(withDefaults as Fiche[]);

        // Récupère le pseudo du créateur de chaque fiche
        const uniqueUserIds = Array.from(new Set(withDefaults.map((f: any) => f.user_id).filter(Boolean)));
        if (uniqueUserIds.length > 0) {
          const { data: profilesData } = await supabase.from("profiles").select("id, username").in("id", uniqueUserIds);
          const map: Record<string, string> = {};
          (profilesData || []).forEach((p: any) => { if (p.username) map[p.id] = p.username; });
          setOwnerPseudos(map);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  // Charge mes propres coordonnées (uniquement pour mes fiches, jamais celles des autres)
  useEffect(() => {
    if (!userId || fiches.length === 0) return;
    const loadMyPrivateFields = async () => {
      const mine = fiches.filter(f => f.user_id === userId);
      if (mine.length === 0) return;
      const results = await Promise.all(
        mine.map(async f => {
          const { data } = await supabase.rpc("get_fiche_private_fields", { p_fiche_id: f.id });
          return data && data.length > 0 ? { id: f.id, ...data[0] } : null;
        })
      );
      setFiches(prev => prev.map(f => {
        const priv = results.find(r => r && r.id === f.id);
        return priv ? { ...f, ...priv } : f;
      }));
    };
    loadMyPrivateFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, fiches.length]);

  // Charge mes intérêts déjà envoyés
  useEffect(() => {
    if (!userId) { setMyInteretIds(new Set()); return; }
    supabase.from("interets_fiches").select("fiche_id").eq("user_id", userId).eq("type", "interesse")
      .then(({ data }) => { if (data) setMyInteretIds(new Set(data.map((r: any) => r.fiche_id))); });
  }, [userId]);

  const getOutils = (fiche: Fiche) => {
    if (!fiche.tech) return [];
    const EXCLUDED = ["_manque_methode", "_manque_outil", "_lien_produit", "_lien_site", "_lien_portfolio"];
    return Object.entries(fiche.tech)
      .filter(([key]) => !EXCLUDED.includes(key))
      .flatMap(([, vals]) => vals)
      .filter(Boolean).filter(v => !TECH_HIDE.has(v.trim().toLowerCase()));
  };
  const getManqueMethode = (fiche: Fiche) => fiche.tech?.["_manque_methode"]?.[0] || "";
  const getManqueOutil   = (fiche: Fiche) => fiche.tech?.["_manque_outil"]?.[0] || "";
  const getLienProduit   = (fiche: Fiche) => fiche.tech?.["_lien_produit"]?.[0] || "";
  const getLienSite      = (fiche: Fiche) => fiche.tech?.["_lien_site"]?.[0] || "";
  const getLienPortfolio = (fiche: Fiche) => fiche.tech?.["_lien_portfolio"]?.[0] || "";
  const getCherche = (fiche: Fiche) => (fiche.cherche && fiche.cherche.length > 0 ? fiche.cherche.join(", ") : "");
  const isOwnFiche = (fiche: Fiche) => !!userId && userId === fiche.user_id;

  const dict = {
    fr: {
      title: "Fiches projets", subtitle: "Des fondateurs solos qui cherchent des synergies.",
      cherche: "Cherche", outils: "Outils", interet: "Intérêt",
      notifInteret: "Intérêt envoyé", ownFiche: "Votre fiche",
      alreadyInteret: "Tu as déjà exprimé ton intérêt pour cette fiche.",
      regulation: "⚠️ Règlement: Toute info fausse mènera à un bannissement.",
      chat: "Discussion", chatPh: "Écris un message... (pas de coordonnées ici)",
      chatSend: "Envoyer", chatEmpty: "Aucun message pour l'instant.",
      contactWarn: "🚫 Ne partage pas d'informations de contact ici — utilise la discussion pour te coordonner, la modération y veille.",
    },
    en: {
      title: "Project listings", subtitle: "Solo founders looking for synergies.",
      cherche: "Looking for", outils: "Tools", interet: "Interest",
      notifInteret: "Interest sent", ownFiche: "Your listing",
      alreadyInteret: "You already expressed interest in this listing.",
      regulation: "⚠️ Policy: Any false info will result in ban.",
      chat: "Discussion", chatPh: "Write a message... (no contact info here)",
      chatSend: "Send", chatEmpty: "No messages yet.",
      contactWarn: "🚫 Don't share contact info here — use the discussion to coordinate, moderators watch for this.",
    },
  }[lang];

  const canInteract = (): boolean => {
    if (!userId) { setShowLoginModal(true); return false; }
    return true;
  };

  const handleInteret = async (fiche: Fiche) => {
    if (!canInteract()) return;
    if (isOwnFiche(fiche)) return;

    if (myInteretIds.has(fiche.id)) {
      setSentNotif(`already:${fiche.id}`);
      setTimeout(() => setSentNotif(null), 2500);
      return;
    }

    if (pseudo) {
      const { data } = await supabase.from("moderation_logs")
        .select("action_type, expires_at, revoked_at")
        .eq("target_username", pseudo)
        .is("revoked_at", null);
      const active = (data || []).filter((r: any) => !r.expires_at || new Date(r.expires_at) > new Date());
      if (active.some((r: any) => r.action_type === "ban" || r.action_type.startsWith("kick"))) {
        alert(lang === "fr" ? "🚫 Action impossible — ton compte est restreint." : "🚫 Action not possible — your account is restricted.");
        return;
      }
    }

    const { error } = await supabase.from("interets_fiches").insert({ fiche_id: fiche.id, user_id: userId, type: "interesse" });
    if (error) {
      if ((error as any).code === "23505") setMyInteretIds(prev => new Set([...prev, fiche.id])); // déjà envoyé, on sync juste l'UI
      return;
    }
    setMyInteretIds(prev => new Set([...prev, fiche.id]));
    setFiches(prev => prev.map(f => f.id === fiche.id ? { ...f, interets: f.interets + 1 } : f));
    setSentNotif(fiche.id);
    setTimeout(() => setSentNotif(null), 2500);

    // La fiche de l'expéditeur (s'il en a une) apparaît dans le courriel envoyé au créateur
    const senderFicheIds = fiches.filter(f => f.user_id === userId).map(f => f.id);

    try {
      await fetch("/api/notifications/interet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fiche_id: fiche.id, fiche_nom: fiche.nom_projet,
          sender_id: userId, sender_fiche_ids: senderFicheIds,
          creator_email: fiche.creator_email, type: "interesse",
        }),
      });
    } catch (e) { console.error("Notif intérêt:", e); }
  };

  // ── CHAT / COMMENTAIRES — toujours visible, chargé pour toutes les fiches d'un coup ──
  useEffect(() => {
    if (fiches.length === 0) return;
    const ids = fiches.map(f => f.id);
    supabase.from("fiche_comments").select("id,fiche_id,user_pseudo,text,created_at").in("fiche_id", ids).order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!data) return;
        const grouped: Record<string, Comment[]> = {};
        data.forEach((c: any) => { (grouped[c.fiche_id] ||= []).push(c); });
        setComments(grouped);

        const pseudosSet = new Set<string>(Object.values(ownerPseudos));
        data.forEach((c: any) => { if (c.user_pseudo) pseudosSet.add(c.user_pseudo); });
        if (pseudosSet.size > 0) {
          supabase.rpc("get_user_badges", { p_usernames: Array.from(pseudosSet) }).then(({ data: badgeRows }) => {
            const map: Record<string, Tier> = {};
            (badgeRows || []).forEach((row: any) => {
              const bronzeDone = row.places_published >= 2 && row.comment_count >= 4 && row.talk_clicks >= 10;
              const argentDone = bronzeDone && row.comment_count >= 20 && row.talk_clicks >= 20;
              const orDone = argentDone && row.comment_count >= 150 && row.talk_clicks >= 50;
              const vipDone = orDone && row.comment_count >= 500 && row.talk_clicks >= 100;
              map[row.username] = vipDone ? "vip" : orDone ? "or" : argentDone ? "argent" : bronzeDone ? "bronze" : "none";
            });
            setBadgeMap(map);
          });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiches.length, ownerPseudos]);

  // Vérifie si le pseudo a une sanction ACTIVE (non graciée, non expirée)
  const checkSanction = async (): Promise<string | null> => {
    if (!pseudo) return null;
    const { data } = await supabase.from("moderation_logs")
      .select("action_type, expires_at, revoked_at")
      .eq("target_username", pseudo)
      .is("revoked_at", null);
    const active = (data || []).filter(r => !r.expires_at || new Date(r.expires_at) > new Date());
    if (active.some(r => r.action_type === "ban")) {
      return lang === "fr" ? "🚫 Ton compte est banni — action impossible." : "🚫 Your account is banned — action not possible.";
    }
    if (active.some(r => r.action_type.startsWith("kick"))) {
      return lang === "fr" ? "🚫 Tu es temporairement exclu — action impossible pour l'instant." : "🚫 You're temporarily kicked — action not possible right now.";
    }
    if (active.some(r => r.action_type.startsWith("mute"))) {
      return lang === "fr" ? "🤐 Tu es muet temporairement — impossible de commenter." : "🤐 You're temporarily muted — can't comment.";
    }
    return null;
  };

  const handleSendComment = async (ficheId: string) => {
    if (!canInteract()) return;
    if (!pseudo) { setCommentErrors(prev => ({ ...prev, [ficheId]: lang === "fr" ? "Choisis un pseudo d'abord." : "Choose a nickname first." })); return; }
    const text = (commentInputs[ficheId] || "").trim();
    if (!text) return;

    const sanctionMsg = await checkSanction();
    if (sanctionMsg) { setCommentErrors(prev => ({ ...prev, [ficheId]: sanctionMsg })); return; }

    if (CONTACT_PATTERN.test(text)) {
      setCommentErrors(prev => ({ ...prev, [ficheId]: dict.contactWarn }));
      return;
    }
    setCommentErrors(prev => { const n = { ...prev }; delete n[ficheId]; return n; });

    const flagged = CONTACT_PATTERN.test(text); // toujours false ici (bloqué au-dessus), gardé pour défense en profondeur si le pattern évolue
    const { data, error } = await supabase.from("fiche_comments")
      .insert({ fiche_id: ficheId, user_id: userId, user_pseudo: pseudo, text, flagged })
      .select("id,user_pseudo,text,created_at").single();
    if (error) { console.error(error); return; }

    setComments(prev => ({ ...prev, [ficheId]: [...(prev[ficheId] || []), data as Comment] }));
    setCommentInputs(prev => ({ ...prev, [ficheId]: "" }));
  };

  // ── AUTH POPUP ────────────────────────────────────────────────────────────
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [authEmailMode, setAuthEmailMode] = useState<"signin"|"signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string|null>(null);
  const [authSuccess, setAuthSuccess] = useState<string|null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/fiche`, scopes: "openid profile email", queryParams: { prompt: "select_account" } } });
  };
  const handleMicrosoft = async () => {
    await supabase.auth.signInWithOAuth({ provider: "azure", options: { redirectTo: `${window.location.origin}/fiche`, scopes: "openid profile email User.Read" } });
  };
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(null); setAuthSuccess(null); setAuthLoading(true);
    if (authEmailMode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
      if (error) setAuthError(error.message);
      else setShowAuthPopup(false);
    } else {
      const { data, error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword, options: { emailRedirectTo: `${window.location.origin}/fiche` } });
      if (error) setAuthError(error.message);
      else if (data?.user && (!data.user.identities || data.user.identities.length === 0)) setAuthError("Compte existant.");
      else setAuthSuccess(lang === "fr" ? "Vérifiez votre boîte mail !" : "Check your inbox!");
    }
    setAuthLoading(false);
  };
  const handleLogout = async () => { await supabase.auth.signOut(); setUserId(null); setUserEmail(null); setPseudo(""); };

  // ── SUPPRESSION ───────────────────────────────────────────────────────────
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDeleteFiche = async () => {
    if (!deleteModalId || !userId) return;
    setDeleteError(null); setDeleting(true);
    try {
      const { error } = await supabase.from("fiches").delete().eq("id", deleteModalId).eq("user_id", userId);
      if (error) { setDeleteError(lang === "fr" ? "Erreur lors de la suppression." : "Error during deletion."); return; }
      setFiches(prev => prev.filter(f => f.id !== deleteModalId));
      setDeleteModalId(null);
    } catch { setDeleteError(lang === "fr" ? "Erreur réseau." : "Network error."); }
    finally { setDeleting(false); }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-[#0f0f0f] text-zinc-900 dark:text-zinc-100 font-sans">
      {sentNotif && (
        <div className="fixed top-4 right-4 z-50 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm px-4 py-3 rounded-xl shadow-xl">
          {sentNotif.startsWith("already:") ? dict.alreadyInteret : dict.notifInteret}
        </div>
      )}

      <nav className="border-b border-zinc-100 dark:border-zinc-800/60 px-6 py-4 flex items-center justify-between gap-4">
        {/* ZONE 1 — logo + onglets */}
        <div className="flex items-center gap-6 flex-wrap">
          <Link href="/" className="font-bold text-sm text-zinc-800 dark:text-zinc-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Echo AI</Link>
          <div className="flex items-center gap-6 text-sm flex-wrap">
            <Link href="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Accueil" : "Home"}</Link>
            <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Tous les outils" : "All tools"}</Link>
            <Link href="/conversation" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">AI Chat</Link>
            <Link href="/form" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Créer un projet" : "Create project"}</Link>
            <Link href="/fiche" className="text-cyan-600 dark:text-cyan-400 font-semibold">{lang === "fr" ? "Explorer les projets" : "Explore projects"}</Link>
            <Link href="/talk" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Avis de la communauté" : "Community feedback"}</Link>
            <Link href="/audit" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Audition de site web" : "Website audit"}</Link>
            <Link href="/idea" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Avis de l'IA" : "AI feedback"}</Link>
            <Link href="/account" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Mon compte" : "My account"}</Link>
          </div>
        </div>

        {/* SÉPARATEUR + ZONE 2 — Bureau (premium) + langue + pseudo */}
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800" />

          {/* BUREAU — verrouillé pour l'instant */}
          <div className="relative group">
            <button
              onClick={() => { /* TODO: activer + ouvrir popup d'avantages une fois le premium prêt */ }}
              className="flex items-center gap-1.5 bg-amber-500/5 border border-amber-500/25 rounded-lg px-3 py-1.5 cursor-not-allowed opacity-65">
              <span className="text-xs">🔒</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-500 whitespace-nowrap">{lang === "fr" ? "Mon Bureau" : "My Desk"}</span>
            </button>
            <div className="absolute top-full right-0 mt-1.5 bg-zinc-900 border border-zinc-700 rounded-md px-2.5 py-1 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              {lang === "fr" ? "🚧 En construction" : "🚧 Under construction"}
            </div>
          </div>

          <div className="relative">
            <button onClick={() => setShowLangMenu(v => !v)}
              className="text-xs text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 rounded-lg hover:border-zinc-400 transition-colors font-bold">
              {lang === "fr" ? "FR" : "EN"}
            </button>
            {showLangMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                <div className="absolute top-full right-0 mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 min-w-28 overflow-hidden">
                  {(["fr","en"] as const).map(l => (
                    <button key={l} onClick={() => { setLang(l); setShowLangMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-xs ${lang === l ? "bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 font-bold" : "text-zinc-600 dark:text-zinc-400"}`}>
                      {l === "fr" ? "Français" : "English"}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {userId ? (
            <div className="relative">
              <button onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span className="text-xs font-semibold text-emerald-500">{pseudo || (lang === "fr" ? "Choisir un pseudo" : "Choose nickname")}</span>
              </button>
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute top-full right-0 mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 min-w-52 p-3">
                    <div className="text-[10px] text-zinc-400 mb-2 break-all">{userEmail}</div>
                    <button onClick={handleLogout} className="w-full text-left text-xs text-red-500 hover:text-red-400 py-1">
                      ↩ {lang === "fr" ? "Se déconnecter" : "Sign out"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button onClick={() => setShowAuthPopup(true)} className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 rounded-full hover:bg-cyan-500/20 transition-colors">
              {lang === "fr" ? "Se connecter" : "Sign in"}
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-14 pb-10">
        <h1 className="text-3xl font-bold mb-2">{dict.title}</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-base">{dict.subtitle}</p>
      </div>

      {/* Carte pseudo — nécessaire pour la discussion */}
      {userId && !pseudo && (
        <div className="max-w-4xl mx-auto px-6 mb-6">
          <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex gap-2 items-center">
            <input type="text" placeholder={lang === "fr" ? "Choisis ton pseudo pour discuter" : "Choose your nickname to chat"} value={pseudoInput}
              onChange={e => setPseudoInput(e.target.value.replace(/[^a-zA-Z0-9_\s-]/g, ""))}
              className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-cyan-500" />
            <button onClick={savePseudo} className="px-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs rounded-lg font-semibold">{lang === "fr" ? "Valider" : "Save"}</button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 pb-32 flex flex-col gap-5">
        {loading && <div className="text-center py-20 text-zinc-400 text-sm">{lang === "fr" ? "Chargement des fiches..." : "Loading listings..."}</div>}

        {!loading && fiches.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-400 text-sm mb-4">{lang === "fr" ? "Aucune fiche pour le moment." : "No listings yet."}</p>
            <Link href="/form" className="text-sm font-semibold text-zinc-900 dark:text-white underline underline-offset-4">{lang === "fr" ? "Créer la première →" : "Create the first one →"}</Link>
          </div>
        )}

        {!loading && fiches.map(fiche => {
          const isOwn = isOwnFiche(fiche);
          const outils = getOutils(fiche);

          return (
            <div key={fiche.id}
              className={`relative bg-white dark:bg-zinc-900/40 rounded-2xl overflow-hidden transition-all duration-300 ${
                isOwn ? "border-2 border-cyan-500/80 dark:border-cyan-400/70 shadow-lg shadow-cyan-500/20"
                : "border border-zinc-200 dark:border-zinc-800/60 hover:border-cyan-500/60 hover:shadow-lg hover:shadow-cyan-500/10"
              }`}>
              {isOwn && (
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-cyan-600/90 backdrop-blur-sm text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
                  <span>✓</span><span>{dict.ownFiche}</span>
                </div>
              )}

              <div className="p-4 flex flex-col gap-2.5">
                {/* Header : grande miniature + infos essentielles */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-[400px] h-[280px] sm:h-[400px] shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 relative group">
                    {fiche.photo_urls && fiche.photo_urls[0] ? (
                      <div className="w-full h-full cursor-zoom-in" onClick={() => setLightboxUrl(fiche.photo_urls![0])}>
                        <img src={fiche.photo_urls[0]} alt={fiche.nom_projet} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-6xl font-black text-zinc-200 dark:text-zinc-700 select-none">{(fiche.nom_projet || "?").slice(0, 2).toUpperCase()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 sm:h-[400px] flex flex-col justify-start gap-2">
                    {ownerPseudos[fiche.user_id] && (
                      <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-cyan-600/80 dark:text-cyan-500/70">
                        @{ownerPseudos[fiche.user_id]}
                        {badgeMap[ownerPseudos[fiche.user_id]] && badgeMap[ownerPseudos[fiche.user_id]] !== "none" && (
                          <img src={TIER_IMG(badgeMap[ownerPseudos[fiche.user_id]])} alt={TIER_LABEL[badgeMap[ownerPseudos[fiche.user_id]]]} title={TIER_LABEL[badgeMap[ownerPseudos[fiche.user_id]]]} className="w-4 h-4 object-contain" />
                        )}
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">{fiche.nom_projet}</h2>
                      <span className="flex items-center gap-1 text-xs font-semibold text-cyan-600 bg-cyan-500/5 border border-cyan-500/20 px-2 py-0.5 rounded-lg shrink-0">
                        🤝 {fiche.interets}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-snug line-clamp-4">{fiche.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border ${TYPE_COLORS[fiche.type_projet] || "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700"}`}>
                        {fiche.type_projet || "—"}
                      </span>
                    </div>

                    {/* Toutes les infos essentielles regroupées dans la colonne, à côté de la photo */}
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      {fiche.type_profil && (
                        <div className="px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50">
                          <p className="text-[9px] text-zinc-400 uppercase font-medium mb-0">{lang === "fr" ? "Profil" : "Profile"}</p>
                          <p className="text-[11px] text-zinc-700 dark:text-zinc-300">{fiche.type_profil}</p>
                        </div>
                      )}
                      {fiche.avancement && (
                        <div className="px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50">
                          <p className="text-[9px] text-zinc-400 uppercase font-medium mb-0">{lang === "fr" ? "Avancement" : "Progress"}</p>
                          <p className="text-[11px] text-zinc-700 dark:text-zinc-300">{fiche.avancement}</p>
                        </div>
                      )}
                      {fiche.produit && (
                        <div className="px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50">
                          <p className="text-[9px] text-zinc-400 uppercase font-medium mb-0">{lang === "fr" ? "Produit" : "Product"}</p>
                          <p className="text-[11px] text-zinc-700 dark:text-zinc-300">{friendlyProduit(fiche.produit, lang)}</p>
                        </div>
                      )}
                      {fiche.utilisateurs && (
                        <div className="px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50">
                          <p className="text-[9px] text-zinc-400 uppercase font-medium mb-0">{lang === "fr" ? "Utilisateurs" : "Users"}</p>
                          <p className="text-[11px] text-zinc-700 dark:text-zinc-300">{friendlyUtilisateurs(fiche.utilisateurs, lang)}</p>
                        </div>
                      )}
                      {fiche.revenus && (
                        <div className="px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50">
                          <p className="text-[9px] text-zinc-400 uppercase font-medium mb-0">{lang === "fr" ? "Revenus" : "Revenue"}</p>
                          <p className="text-[11px] text-zinc-700 dark:text-zinc-300">{friendlyRevenus(fiche.revenus, lang)}</p>
                        </div>
                      )}
                      {fiche.idee && (
                        <div className="px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50">
                          <p className="text-[9px] text-zinc-400 uppercase font-medium mb-0">{lang === "fr" ? "Idée" : "Idea"}</p>
                          <p className="text-[11px] text-zinc-700 dark:text-zinc-300">{fiche.idee}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {(fiche.objectif_court || fiche.objectif_moyen || fiche.objectif_long) && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] text-zinc-400 uppercase font-medium">{lang === "fr" ? "Objectifs" : "Goals"}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      {fiche.objectif_court && <div className="px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50"><p className="text-[10px] text-zinc-400 mb-0.5">{lang === "fr" ? "Court terme" : "Short"}</p><p className="text-[11px] text-zinc-700 dark:text-zinc-300">{fiche.objectif_court}</p></div>}
                      {fiche.objectif_moyen && <div className="px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50"><p className="text-[10px] text-zinc-400 mb-0.5">{lang === "fr" ? "Moyen terme" : "Medium"}</p><p className="text-[11px] text-zinc-700 dark:text-zinc-300">{fiche.objectif_moyen}</p></div>}
                      {fiche.objectif_long && <div className="px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50"><p className="text-[10px] text-zinc-400 mb-0.5">{lang === "fr" ? "Long terme" : "Long"}</p><p className="text-[11px] text-zinc-700 dark:text-zinc-300">{fiche.objectif_long}</p></div>}
                    </div>
                  </div>
                )}

                {(getLienProduit(fiche) || getLienSite(fiche) || getLienPortfolio(fiche)) && (
                  <div className="flex flex-wrap gap-2">
                    {getLienProduit(fiche) && (() => {
                      const url = getLienProduit(fiche);
                      const ext = url.split(".").pop()?.toLowerCase().split("?")[0] || "";
                      const fileLabel =
                        ext === "pdf" ? (lang === "fr" ? "📄 Voir le PDF" : "📄 View PDF") :
                        ext === "epub" ? (lang === "fr" ? "📕 Télécharger l'EPUB" : "📕 Download EPUB") :
                        ext === "docx" ? (lang === "fr" ? "📝 Télécharger le DOCX" : "📝 Download DOCX") :
                        ["jpg","jpeg","png","webp","gif"].includes(ext) ? (lang === "fr" ? "🖼️ Voir l'image" : "🖼️ View image") :
                        (lang === "fr" ? "📖 Voir le projet" : "📖 View project");
                      return (
                        <a href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-500/5 border border-cyan-500/20 px-3 py-1.5 rounded-lg hover:bg-cyan-500/10 transition-colors">
                          {fileLabel}
                        </a>
                      );
                    })()}
                    {getLienSite(fiche) && (
                      <a href={getLienSite(fiche)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-lg hover:border-zinc-400 transition-colors">
                        🌐 {lang === "fr" ? "Site web" : "Website"}
                      </a>
                    )}
                    {getLienPortfolio(fiche) && (
                      <a href={getLienPortfolio(fiche)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-lg hover:border-zinc-400 transition-colors">
                        💼 Portfolio
                      </a>
                    )}
                  </div>
                )}

                {outils.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[11px] text-zinc-400 font-medium">{dict.outils} :</span>
                    {outils.map((outil, i) => <span key={i} className="text-[11px] bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-md font-mono border border-zinc-200/50 dark:border-zinc-700/50">{outil}</span>)}
                  </div>
                )}

                {(getManqueMethode(fiche) || getManqueOutil(fiche)) && (
                  <div className="flex flex-col gap-1">
                    {getManqueMethode(fiche) && <p className="text-xs text-zinc-500 dark:text-zinc-400">💡 {getManqueMethode(fiche)}</p>}
                    {getManqueOutil(fiche) && <p className="text-xs text-zinc-500 dark:text-zinc-400">🛠️ {getManqueOutil(fiche)}</p>}
                  </div>
                )}

                {getCherche(fiche) && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] text-zinc-400 uppercase font-medium">{lang === "fr" ? "Besoins" : "Needs"}</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{getCherche(fiche)}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {fiche.temps && <div className="px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50"><p className="text-[9px] text-zinc-400 uppercase font-medium mb-0">{lang === "fr" ? "Temps" : "Time"}</p><p className="text-[11px] text-zinc-700 dark:text-zinc-300">{fiche.temps}</p></div>}
                  {fiche.distance && <div className="px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50"><p className="text-[9px] text-zinc-400 uppercase font-medium mb-0">{lang === "fr" ? "Distance" : "Location"}</p><p className="text-[11px] text-zinc-700 dark:text-zinc-300">{fiche.distance}</p></div>}
                  {fiche.engagement && <div className="px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50"><p className="text-[9px] text-zinc-400 uppercase font-medium mb-0">{lang === "fr" ? "Engagement" : "Commitment"}</p><p className="text-[11px] text-zinc-700 dark:text-zinc-300">{fiche.engagement}</p></div>}
                </div>

                <div className="h-px bg-zinc-100 dark:bg-zinc-800/60" />

                {/* Bouton unique Intérêt */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <button onClick={() => handleInteret(fiche)} disabled={isOwn}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      isOwn ? "opacity-50 cursor-not-allowed border-zinc-200 dark:border-zinc-700"
                      : myInteretIds.has(fiche.id) ? "bg-cyan-600/20 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400 border-cyan-400/50 dark:border-cyan-500/40"
                      : "border-zinc-200 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300 hover:border-cyan-400/60 hover:text-cyan-600 hover:bg-cyan-50/30 dark:hover:bg-cyan-950/20"
                    }`}>
                    <span>{myInteretIds.has(fiche.id) ? "✓" : "🤝"}</span>
                    <span>{myInteretIds.has(fiche.id) ? dict.notifInteret : dict.interet}</span>
                  </button>

                  <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                    💬 {dict.chat} {comments[fiche.id]?.length ? `(${comments[fiche.id].length})` : ""}
                  </span>
                </div>

                {/* ── CHAT — toujours visible ── */}
                <div className="flex flex-col gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                      {(comments[fiche.id] || []).length === 0 && <p className="text-xs text-zinc-400 text-center py-3">{dict.chatEmpty}</p>}
                      {(comments[fiche.id] || []).map(c => (
                        <div key={c.id} className="text-xs text-zinc-600 dark:text-zinc-400 pl-3 border-l border-zinc-200 dark:border-zinc-800">
                          <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                            @{c.user_pseudo}
                            {badgeMap[c.user_pseudo] && badgeMap[c.user_pseudo] !== "none" && (
                              <img src={TIER_IMG(badgeMap[c.user_pseudo])} alt={TIER_LABEL[badgeMap[c.user_pseudo]]} title={TIER_LABEL[badgeMap[c.user_pseudo]]} className="w-3.5 h-3.5 object-contain" />
                            )}
                          </span>
                          <p className="text-zinc-700 dark:text-zinc-300 mt-0.5">{c.text}</p>
                        </div>
                      ))}
                    </div>
                    {commentErrors[fiche.id] && <p className="text-xs text-red-500">{commentErrors[fiche.id]}</p>}
                    <div className="flex gap-2">
                      <input type="text" value={commentInputs[fiche.id] || ""} placeholder={dict.chatPh}
                        onChange={e => setCommentInputs(prev => ({ ...prev, [fiche.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") handleSendComment(fiche.id); }}
                        className="flex-1 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500" />
                      <button onClick={() => handleSendComment(fiche.id)} className="px-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs rounded-lg font-semibold">{dict.chatSend}</button>
                    </div>
                  </div>
              </div>

              {isOwn && (
                <div className="sticky bottom-0 left-0 right-0 border-t border-cyan-400/30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm px-6 py-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{dict.regulation}</p>
                    <button onClick={() => { setDeleteModalId(fiche.id); setDeleteError(null); }} className="text-sm font-semibold text-red-500 hover:text-red-400 transition-colors">Supprimer →</button>
                    <span className="text-zinc-600">·</span>
                    <Link href={`/form?edit=${fiche.id}`} className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors">✏️ Modifier</Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── POPUP AUTH ── */}
      {showAuthPopup && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAuthPopup(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-zinc-200 dark:border-zinc-700" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="text-3xl mb-2">🔐</div>
              <h3 className="font-bold text-base dark:text-white">{lang === "fr" ? "Connexion" : "Sign in"}</h3>
              <p className="text-xs text-zinc-500 mt-1">{lang === "fr" ? "Nécessaire pour envoyer un intérêt et discuter." : "Required to send interest and chat."}</p>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              <button onClick={handleGoogle} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:border-zinc-400 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.18 2.18 5.94l3.66 2.84c.87-2.6 3.3-4.4 6.16-4.4z" fill="#EA4335"/></svg>
                Google
              </button>
              <button onClick={handleMicrosoft} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-800 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors">
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
              <button type="submit" disabled={authLoading} className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold transition-colors disabled:opacity-50">
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

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowLoginModal(false)}>
          <div className="bg-white dark:bg-zinc-900 border border-cyan-400/50 dark:border-cyan-500/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-cyan-500/10 relative" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <img src="/echo1.png" alt="Echo" className="w-8 h-8 rounded-full object-cover" />
              <button onClick={() => setShowLoginModal(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors text-lg leading-none w-6 h-6 flex items-center justify-center">✕</button>
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2 text-center">{lang === "fr" ? "Connexion requise" : "Login required"}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-6">{lang === "fr" ? "Connecte-toi pour envoyer un intérêt ou discuter." : "Log in to send interest or chat."}</p>
            <button onClick={() => { setShowLoginModal(false); setShowAuthPopup(true); }} className="block w-full text-center py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-all">
              {lang === "fr" ? "Se connecter" : "Log in"}
            </button>
          </div>
        </div>
      )}

      {deleteModalId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteModalId(null)}>
          <div className="bg-white dark:bg-zinc-900 border border-red-400/50 dark:border-red-500/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">{lang === "fr" ? "Supprimer ma fiche" : "Delete my listing"}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">{lang === "fr" ? "Cette action est définitive et ne peut pas être annulée." : "This action is permanent and cannot be undone."}</p>
            {deleteError && <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">{deleteError}</div>}
            <div className="flex gap-2">
              <button onClick={() => setDeleteModalId(null)} className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400">{lang === "fr" ? "Annuler" : "Cancel"}</button>
              <button onClick={confirmDeleteFiche} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-semibold disabled:opacity-50">
                {deleting ? "…" : (lang === "fr" ? "Supprimer" : "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setLightboxUrl(null)}>
          <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full bg-white/10">✕</button>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </main>
  );
}