"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Lang = "fr" | "en";

type Comment = {
  id: string;
  author: string;
  text: string;
  created_at: string;
};

type CrashPost = {
  id: string;
  text: string;
  created_at: string;
  fiche_id: string | null;
  fiche_nom: string | null;
  author_pseudo: string | null;
  votes: Record<string, string[]>;
  comments: Comment[];
};

const RESSENTI = [
  { key: "wish",     emoji: "🔥", text: "J'aurais aimé avoir eu cette idée." },
  { key: "client",   emoji: "💳", text: "Je pourrais devenir client." },
  { key: "lost",     emoji: "🤔", text: "Je suis intrigué mais perdu." },
  { key: "spark",    emoji: "🧪", text: "Il y a quelque chose ici, continue de creuser" },
  { key: "big",      emoji: "🧨", text: "Cette idée pourrait devenir grosse" },
];

const EXPLICATIONS = [
  { key: "fail",     emoji: "🩻", text: "Je pense savoir exactement pourquoi ça ne marchera pas." },
  { key: "blurry",   emoji: "🌫️", text: "Le message est flou." },
  { key: "already",  emoji: "🔄", text: "Ça ressemble trop à quelque chose qui existe déjà." },
  { key: "clone",    emoji: "🥸", text: "Ça sent le clone" },
  { key: "exist",    emoji: "🧠", text: "Je comprends le projet, mais pas pourquoi il existe." },
  { key: "no_pay",   emoji: "💰", text: "Je l'utiliserais, mais je ne paierais jamais pour ça." },
  { key: "numb",     emoji: "💤", text: "Je ne ressens rien." },
];

const CRITIQUES = [...RESSENTI, ...EXPLICATIONS]; // gardé pour totalVotes / lookup pratique

// Détection basique de partage de coordonnées — même règle que sur Fiche/Audit
const CONTACT_PATTERN = /[\w.+-]+@[\w-]+\.[a-z]{2,}|(\+?\d[\d\s.-]{8,}\d)/i;

// ── PALIERS (Bronze/Argent/Or/VIP) — calculés à partir de get_user_badges() ──
type BadgeRow = { comment_count: number; talk_clicks: number; places_published: number };

type Tier = "none" | "bronze" | "argent" | "or" | "vip";
const TIER_LABEL: Record<Tier, string> = { none: "", bronze: "Bronze", argent: "Argent", or: "Or", vip: "VIP" };
const TIER_IMG = (tier: Tier) => `/${tier}.png`;

type Task = { label: string; done: boolean };

const getTierTasks = (row: BadgeRow) => {
  const bronze: Task[] = [
    { label: "Publier à 2 endroits (Fiche/Talk/Audit)", done: row.places_published >= 2 },
    { label: "4 commentaires au total", done: row.comment_count >= 4 },
    { label: "10 réactions cliquées sur Talk", done: row.talk_clicks >= 10 },
  ];
  const bronzeDone = bronze.every(t => t.done);

  const argent: Task[] = [
    { label: "Obtenir Bronze", done: bronzeDone },
    { label: "20 commentaires au total", done: row.comment_count >= 20 },
    { label: "20 réactions cliquées sur Talk", done: row.talk_clicks >= 20 },
  ];
  const argentDone = bronzeDone && row.comment_count >= 20 && row.talk_clicks >= 20;

  const or: Task[] = [
    { label: "Obtenir Argent", done: argentDone },
    { label: "150 commentaires au total", done: row.comment_count >= 150 },
    { label: "50 réactions cliquées sur Talk", done: row.talk_clicks >= 50 },
  ];
  const orDone = argentDone && row.comment_count >= 150 && row.talk_clicks >= 50;

  const vip: Task[] = [
    { label: "Obtenir Or", done: orDone },
    { label: "500 commentaires au total", done: row.comment_count >= 500 },
    { label: "100 réactions cliquées sur Talk", done: row.talk_clicks >= 100 },
  ];
  const vipDone = orDone && row.comment_count >= 500 && row.talk_clicks >= 100;

  let tier: Tier = "none";
  if (vipDone) tier = "vip";
  else if (orDone) tier = "or";
  else if (argentDone) tier = "argent";
  else if (bronzeDone) tier = "bronze";

  const nextTier: Tier = tier === "none" ? "bronze" : tier === "bronze" ? "argent" : tier === "argent" ? "or" : tier === "or" ? "vip" : "vip";
  const nextTasks = { bronze, argent, or, vip }[nextTier];

  return { tier, nextTier, nextTasks };
};

const TIER_RANK: Record<Tier, number> = { none: 0, bronze: 1, argent: 2, or: 3, vip: 4 };

// Compare le palier fraîchement calculé au dernier palier connu (persisté en
// base). S'il a progressé, on envoie le courriel et on met à jour la valeur
// stockée — sinon on ne fait rien (évite les doublons de courriel).
const checkAndNotifyBadgeUpgrade = async (userId: string, email: string | null, row: BadgeRow) => {
  const newTier = getTierTasks(row).tier;
  if (newTier === "none") return;

  const { data: prof } = await supabase.from("profiles").select("current_tier,username").eq("id", userId).maybeSingle();
  const storedTier = (prof?.current_tier || "none") as Tier;

  if (TIER_RANK[newTier] <= TIER_RANK[storedTier]) return; // pas de progression

  await supabase.from("profiles").update({ current_tier: newTier }).eq("id", userId);

  if (email) {
    try {
      await fetch("/api/notifications/badge-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pseudo: prof?.username || null, tier: newTier }),
      });
    } catch (e) {
      console.error("[badge-upgrade email]", e);
    }
  }
};

export default function TalkPage() {
  const [lang, setLang] = useState<Lang>("fr");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [pseudo, setPseudo] = useState<string>("");
  const [myBadgeRow, setMyBadgeRow] = useState<BadgeRow | null>(null);
  const [pseudoInput, setPseudoInput] = useState<string>("");
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [authEmailMode, setAuthEmailMode] = useState<"signin"|"signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string|null>(null);
  const [authSuccess, setAuthSuccess] = useState<string|null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [isSavingPseudo, setIsSavingPseudo] = useState(false);

  const [input, setInput] = useState("");
  const [posts, setPosts] = useState<CrashPost[]>([]);
  const [badgeMap, setBadgeMap] = useState<Record<string, Tier>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);

        const { data: profile } = await supabase
          .from("profiles")
          .select("username, role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile?.username) {
          setPseudo(profile.username);
          const { data: badgeRows } = await supabase.rpc("get_user_badges", { p_usernames: [profile.username] });
          const badgeRow = badgeRows?.[0];
          if (badgeRow) {
            setMyBadgeRow(badgeRow as BadgeRow);
            await checkAndNotifyBadgeUpgrade(session.user.id, session.user.email || null, badgeRow as BadgeRow);
          }
        }

        if (session.user.email === 'lafailleestouverte@gmail.com' || session.user.email === 'nicholas@echosai.ca') {
          setUserRole("admin");
        } else if (profile?.role) {
          setUserRole(profile.role);
        }
      }
    });
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    const { data: dbPosts, error } = await supabase
      .from("talk_posts")
      .select("*, talk_votes(critique_key, user_email), talk_comments(*), fiches(nom_projet)")
      .order("created_at", { ascending: false });

    if (error || !dbPosts) return;

    const formatted = dbPosts.map((p: any) => {
      const votesStructure: Record<string, string[]> = {};
      p.talk_votes?.forEach((v: any) => {
        votesStructure[v.critique_key] = [...(votesStructure[v.critique_key] || []), v.user_email];
      });
      return {
        id: p.id,
        text: p.text,
        created_at: p.created_at,
        fiche_id: p.fiche_id || null,
        fiche_nom: p.fiches?.nom_projet || null,
        author_pseudo: p.user_pseudo || null,
        votes: votesStructure,
        comments: (p.talk_comments || []).map((c: any) => ({
          id: c.id,
          author: c.user_email,
          text: c.text,
          created_at: c.created_at
        }))
      };
    });
    setPosts(formatted);
    await loadBadges(formatted);
  };

  // Charge les badges de tous les pseudos visibles dans le feed en un seul appel
  const loadBadges = async (feedPosts: CrashPost[]) => {
    const pseudos = new Set<string>();
    feedPosts.forEach(p => {
      if (p.author_pseudo) pseudos.add(p.author_pseudo);
      p.comments.forEach(c => { if (c.author) pseudos.add(c.author); });
    });
    if (pseudos.size === 0) return;

    const { data } = await supabase.rpc("get_user_badges", { p_usernames: Array.from(pseudos) });

    const map: Record<string, Tier> = {};
    (data || []).forEach((row: any) => { map[row.username] = getTierTasks(row).tier; });
    setBadgeMap(map);
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/talk`, scopes: "openid profile email", queryParams: { prompt: "select_account" } } });
  };
  const handleMicrosoft = async () => {
    await supabase.auth.signInWithOAuth({ provider: "azure", options: { redirectTo: `${window.location.origin}/talk`, scopes: "openid profile email User.Read" } });
  };
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(null); setAuthSuccess(null); setAuthLoading(true);
    if (authEmailMode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
      if (error) setAuthError(error.message); else setShowAuthPopup(false);
    } else {
      const { data, error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword, options: { emailRedirectTo: `${window.location.origin}/talk` } });
      if (error) setAuthError(error.message);
      else if (data?.user && (!data.user.identities || data.user.identities.length === 0)) setAuthError("Compte existant.");
      else setAuthSuccess(lang === "fr" ? "Vérifiez votre boîte mail !" : "Check your inbox!");
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUserId(null); setUserEmail(null); setPseudo(""); setShowUserMenu(false); };

  const savePseudo = async () => {
    const cleanPseudo = pseudoInput.trim();
    if (!cleanPseudo || !userId || isSavingPseudo) return;
    setIsSavingPseudo(true);
    try {
      await supabase.from("profiles").upsert({ id: userId, username: cleanPseudo, updated_at: new Date().toISOString() });
      setPseudo(cleanPseudo);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingPseudo(false);
    }
  };

  const refreshMyBadges = async () => {
    if (!userId || !pseudo) return;
    const { data: badgeRows } = await supabase.rpc("get_user_badges", { p_usernames: [pseudo] });
    const badgeRow = badgeRows?.[0];
    if (badgeRow) {
      setMyBadgeRow(badgeRow as BadgeRow);
      await checkAndNotifyBadgeUpgrade(userId, userEmail, badgeRow as BadgeRow);
    }
  };

  const handleModAction = async (actionType: string, targetPseudo: string, targetId: string, isComment: boolean) => {
    setActiveMenuId(null);
    if (userRole !== "admin" && userRole !== "moderator") return;

    if (actionType === "delete") {
      if (confirm(lang === "fr" ? "Confirmer la suppression ?" : "Confirm deletion?")) {
        if (isComment) {
          await supabase.from("talk_comments").delete().eq("id", targetId);
        } else {
          await supabase.from("talk_posts").delete().eq("id", targetId);
        }
        await fetchFeed();
      }
      return;
    }

    let expiresAt: Date | null = new Date();
    if (actionType === "mute_1d") expiresAt.setDate(expiresAt.getDate() + 1);
    else if (actionType === "mute_1w") expiresAt.setDate(expiresAt.getDate() + 7);
    else if (actionType === "ban") expiresAt = null;

    const { error } = await supabase.from("moderation_logs").insert({
      target_username: targetPseudo,
      action_type: actionType,
      reason: "Action rapide depuis le feed",
      expires_at: expiresAt ? expiresAt.toISOString() : null,
    });

    if (!error) alert(`Action [${actionType}] enregistrée pour @${targetPseudo}`);
  };

  const launchPost = async () => {
    if (!input.trim() || !pseudo) return;
    const sanctionMsg = await checkSanction("comment");
    if (sanctionMsg) { alert(sanctionMsg); return; }
    await supabase.from("talk_posts").insert({
      user_id: userId,
      text: input.trim(),
      user_pseudo: pseudo,
    });
    setInput("");
    await fetchFeed();
  };

  // Vérifie si le pseudo a une sanction ACTIVE (non graciée, non expirée) avant
  // de laisser passer une action. Renvoie null si aucune restriction, ou un
  // message d'erreur prêt à afficher sinon.
  const checkSanction = async (kind: "comment" | "vote"): Promise<string | null> => {
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
    if (kind === "comment" && active.some(r => r.action_type.startsWith("mute"))) {
      return lang === "fr" ? "🤐 Tu es muet temporairement — impossible de commenter." : "🤐 You're temporarily muted — can't comment.";
    }
    return null;
  };

  const handleAddComment = async (postId: string) => {
    if (!userId) return;
    if (!pseudo) { setCommentErrors(prev => ({ ...prev, [postId]: lang === "fr" ? "Choisis un pseudo d'abord." : "Choose a nickname first." })); return; }
    const text = (commentInputs[postId] || "").trim();
    if (!text) return;

    const sanctionMsg = await checkSanction("comment");
    if (sanctionMsg) { setCommentErrors(prev => ({ ...prev, [postId]: sanctionMsg })); return; }

    if (CONTACT_PATTERN.test(text)) {
      setCommentErrors(prev => ({ ...prev, [postId]: lang === "fr"
        ? "🚫 Ne partage pas d'informations de contact ici — le règlement l'interdit."
        : "🚫 Don't share contact info here — the rules forbid it." }));
      return;
    }
    setCommentErrors(prev => { const n = { ...prev }; delete n[postId]; return n; });

    await supabase.from("talk_comments").insert({
      post_id: postId, user_id: userId, user_email: pseudo, text,
    });
    setCommentInputs(prev => ({ ...prev, [postId]: "" }));
    await fetchFeed();
  };

  const handleVote = async (postId: string, key: string) => {
    if (!userId || !pseudo) return;
    const sanctionMsg = await checkSanction("vote");
    if (sanctionMsg) { alert(sanctionMsg); return; }

    const { data: existing } = await supabase
      .from("talk_votes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .eq("critique_key", key)
      .maybeSingle();

    if (existing) {
      await supabase.from("talk_votes").delete().eq("id", existing.id);
    } else {
      await supabase.from("talk_votes").insert({
        post_id: postId,
        user_id: userId,
        user_email: pseudo,
        critique_key: key
      });
    }
    await fetchFeed();
    await refreshMyBadges();
  };

  return (
    <main className="min-h-screen bg-white dark:bg-[#0f0f0f] text-zinc-900 dark:text-zinc-100 font-sans">

      {/* NAV — les 9 onglets fixes, identiques sur toutes les pages /1 */}
      <nav className="border-b border-zinc-100 dark:border-zinc-800/60 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-sm z-50 gap-4">
        {/* ZONE 1 — logo + onglets */}
        <div className="flex items-center gap-5 flex-wrap">
          <Link href="/" className="font-bold text-sm text-zinc-800 dark:text-zinc-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Echo AI</Link>
          <div className="flex items-center gap-5 text-sm flex-wrap">
            <Link href="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Accueil" : "Home"}</Link>
            <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Tous les outils" : "All tools"}</Link>
            <Link href="/conversation" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">AI Chat</Link>
            <Link href="/form" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Créer un projet" : "Create project"}</Link>
            <Link href="/fiche" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Explorer les projets" : "Explore projects"}</Link>
            <Link href="/talk" className="text-cyan-600 dark:text-cyan-400 font-semibold">{lang === "fr" ? "Avis de la communauté" : "Community feedback"}</Link>
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
                className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">{pseudo || (lang === "fr" ? "Choisir un pseudo" : "Choose nickname")}</span>
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
            <button onClick={() => setShowAuthPopup(true)}
              className="bg-cyan-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg hover:bg-cyan-500 transition-colors">
              {lang === "fr" ? "Se connecter" : "Sign in"}
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-2xl w-full mx-auto px-4 py-8 flex flex-col gap-6">

        {/* CONFIG PSEUDO */}
        <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
          {!userId ? (
            <div className="text-center py-2">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{lang === "fr" ? "Tu dois être connecté pour participer." : "You must be logged in to participate."}</p>
              <button onClick={() => setShowAuthPopup(true)} className="inline-block mt-3 px-4 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs rounded-lg font-semibold">
                {lang === "fr" ? "S'authentifier" : "Sign In"}
              </button>
            </div>
          ) : !pseudo ? (
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{lang === "fr" ? "Choisis ton nom ou pseudo" : "Choose your name or nickname"}</h3>
              <div className="flex gap-2">
                <input type="text" placeholder="Nom ou pseudo" value={pseudoInput} onChange={e => setPseudoInput(e.target.value.replace(/[^a-zA-Z0-9_\s-]/g, ""))}
                  className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
                <button onClick={savePseudo} className="px-4 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded-lg font-semibold transition-colors">Valider</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]" />
                  <span className="font-bold text-cyan-600 dark:text-cyan-400 font-mono">{pseudo}</span>
                  {myBadgeRow && getTierTasks(myBadgeRow).tier !== "none" && (
                    <img src={TIER_IMG(getTierTasks(myBadgeRow).tier)} alt={TIER_LABEL[getTierTasks(myBadgeRow).tier]} title={TIER_LABEL[getTierTasks(myBadgeRow).tier]} className="w-4 h-4 object-contain" />
                  )}
                </div>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600">{userEmail}</span>
              </div>
            </div>
          )}
        </div>

        {/* TEXTAREA */}
        <div className={`bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm ${!pseudo ? "opacity-25 pointer-events-none select-none" : ""}`}>
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={lang === "fr" ? "Écris ton idée ou ton pitch brut..." : "Write your raw idea..."}
            className="w-full h-16 bg-transparent text-sm text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none resize-none" />
          <div className="flex justify-end pt-2 border-t border-zinc-200 dark:border-zinc-900 mt-2">
            <button onClick={launchPost} className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-lg transition-colors">Lancer</button>
          </div>
        </div>

        {/* FEED */}
        <div className={`flex flex-col gap-5 ${!pseudo ? "opacity-30 pointer-events-none select-none" : ""}`}>
          {posts.map(post => {
            // Chaque réaction est un sondage indépendant "oui/non" — le dénominateur
            // est le nombre de PERSONNES uniques ayant réagi au post (pas la somme des
            // votes), donc les catégories ne se volent plus de points entre elles.
            const uniqueVoters = new Set<string>();
            Object.values(post.votes).forEach(voters => voters.forEach(v => uniqueVoters.add(v)));
            const totalParticipants = uniqueVoters.size;
            const CONFIDENCE_THRESHOLD = 30; // en dessous, on affiche des comptes bruts, pas des %
            const showPercent = totalParticipants >= CONFIDENCE_THRESHOLD;
            const confidence = totalParticipants >= 100 ? "high" : totalParticipants >= 10 ? "medium" : "low";

            return (
              <div key={post.id} className="bg-white dark:bg-zinc-950 border border-cyan-500/20 dark:border-cyan-500/10 rounded-xl overflow-hidden flex flex-col shadow-sm">

                <div className="p-4 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/60 dark:bg-zinc-900/10 flex justify-between items-start relative">
                  <div className="flex-1 mr-4">
                    {post.author_pseudo && (
                      <span className="text-[10px] font-mono font-bold text-cyan-600/80 dark:text-cyan-500/70 mb-1 flex items-center gap-1.5">
                        @{post.author_pseudo}
                        {badgeMap[post.author_pseudo] && badgeMap[post.author_pseudo] !== "none" && (
                          <img src={TIER_IMG(badgeMap[post.author_pseudo])} alt={TIER_LABEL[badgeMap[post.author_pseudo]]} title={TIER_LABEL[badgeMap[post.author_pseudo]]} className="w-4 h-4 object-contain inline-block" />
                        )}
                      </span>
                    )}
                    <p className="text-zinc-800 dark:text-zinc-200 text-sm leading-relaxed">{post.text}</p>
                    {post.fiche_id && post.fiche_nom && (
                      <Link href="/fiche" className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/50 px-2.5 py-1 rounded-full hover:bg-cyan-100 dark:hover:bg-cyan-950/50 transition-colors">
                        🔗 {lang === "fr" ? "Voir la fiche" : "See listing"}: {post.fiche_nom}
                      </Link>
                    )}
                  </div>

                  {(userRole === "admin" || userRole === "moderator") && (
                    <div className="relative">
                      <button onClick={() => setActiveMenuId(activeMenuId === post.id ? null : post.id)} className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400 font-bold text-xs p-1">⠇</button>
                      {activeMenuId === post.id && (
                        <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl py-1 z-20 text-[11px] font-mono">
                          <button onClick={() => handleModAction("delete", "", post.id, false)} className="w-full text-left px-3 py-1.5 text-red-500 hover:bg-zinc-50 dark:hover:bg-zinc-800">✕ Supprimer</button>
                          <button onClick={() => handleModAction("mute_1d", "Auteur", post.id, false)} className="w-full text-left px-3 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800">🤫 Mute 1j</button>
                          <button onClick={() => handleModAction("mute_1w", "Auteur", post.id, false)} className="w-full text-left px-3 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800">🤫 Mute 1s</button>
                          <button onClick={() => handleModAction("ban", "Auteur", post.id, false)} className="w-full text-left px-3 py-1.5 text-amber-500 hover:bg-zinc-50 dark:hover:bg-zinc-800">💥 Ban Perm</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Indice de confiance — évite qu'un tout petit nombre de votes soit pris pour une vraie tendance */}
                <div className="px-4 pt-3 pb-1 bg-white dark:bg-zinc-950 flex items-center gap-1.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    confidence === "high" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : confidence === "medium" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400"
                  }`}>
                    {confidence === "high" ? "🟢" : confidence === "medium" ? "🟡" : "🔴"}{" "}
                    {totalParticipants} {lang === "fr" ? (totalParticipants > 1 ? "personnes ont réagi" : "personne a réagi") : (totalParticipants === 1 ? "person reacted" : "people reacted")}
                  </span>
                </div>

                {/* RÉACTIONS — 2 colonnes avec un rôle distinct chacune */}
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-1">
                        {lang === "fr" ? "Ce que les gens ressentent" : "What people feel"}
                      </p>
                      {RESSENTI.map(crit => {
                        const voters = post.votes[crit.key] || [];
                        const count = voters.length;
                        const hasVoted = voters.includes(pseudo);
                        const ratio = Math.round((count / (totalParticipants || 1)) * 100);
                        return (
                          <button key={crit.key} onClick={() => handleVote(post.id, crit.key)}
                            className={`w-full h-8 rounded-lg relative overflow-hidden text-left border transition-all ${hasVoted ? "border-cyan-500/40 bg-cyan-500/[0.04]" : "border-zinc-100 dark:border-zinc-900/40 bg-zinc-50/50 dark:bg-zinc-900/5 hover:border-zinc-300 dark:hover:border-zinc-800"}`}>
                            <div className={`absolute left-0 top-0 bottom-0 ${hasVoted ? "bg-cyan-500/10" : "bg-zinc-200/40 dark:bg-zinc-900/20"}`} style={{ width: `${count > 0 ? ratio : 0}%` }} />
                            <div className="absolute inset-0 flex items-center justify-between px-3 text-[11px]">
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-xs shrink-0">{crit.emoji}</span>
                                <span className="truncate text-zinc-600 dark:text-zinc-400">{crit.text}</span>
                              </div>
                              <span className="font-mono text-[10px] font-bold text-cyan-600 dark:text-cyan-400 shrink-0">{count === 0 ? "—" : showPercent ? `${ratio}%` : `${count} ${lang === "fr" ? (count > 1 ? "pers." : "pers.") : "ppl"}`}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500 mb-1">
                        {lang === "fr" ? "Ce qu'ils expliquent" : "What they explain"}
                      </p>
                      {EXPLICATIONS.map(crit => {
                        const voters = post.votes[crit.key] || [];
                        const count = voters.length;
                        const hasVoted = voters.includes(pseudo);
                        const ratio = Math.round((count / (totalParticipants || 1)) * 100);
                        return (
                          <button key={crit.key} onClick={() => handleVote(post.id, crit.key)}
                            className={`w-full h-8 rounded-lg relative overflow-hidden text-left border transition-all ${hasVoted ? "border-amber-500/40 bg-amber-500/[0.04]" : "border-zinc-100 dark:border-zinc-900/40 bg-zinc-50/50 dark:bg-zinc-900/5 hover:border-zinc-300 dark:hover:border-zinc-800"}`}>
                            <div className={`absolute left-0 top-0 bottom-0 ${hasVoted ? "bg-amber-500/10" : "bg-zinc-200/40 dark:bg-zinc-900/20"}`} style={{ width: `${count > 0 ? ratio : 0}%` }} />
                            <div className="absolute inset-0 flex items-center justify-between px-3 text-[11px]">
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-xs shrink-0">{crit.emoji}</span>
                                <span className="truncate text-zinc-600 dark:text-zinc-400">{crit.text}</span>
                              </div>
                              <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-500 shrink-0">{count === 0 ? "—" : showPercent ? `${ratio}%` : `${count} ${lang === "fr" ? (count > 1 ? "pers." : "pers.") : "ppl"}`}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* CONSEILS — chat actif */}
                <div className="bg-white dark:bg-zinc-950 p-4 flex flex-col gap-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
                    {lang === "fr" ? "Conseils" : "Advice"}
                  </p>
                  {post.comments.length === 0 && (
                    <p className="text-xs text-zinc-400 text-center py-2">{lang === "fr" ? "Aucun conseil pour l'instant." : "No advice yet."}</p>
                  )}
                  {post.comments.map(comment => (
                      <div key={comment.id} className="text-xs text-zinc-500 dark:text-zinc-400 pl-3 border-l border-zinc-200 dark:border-zinc-800 flex justify-between items-start relative group">
                        <div className="flex flex-col flex-1 mr-4">
                          <span className="font-mono text-[9px] text-cyan-600/80 dark:text-cyan-500/70 font-bold flex items-center gap-1">
                            @{comment.author}
                            {badgeMap[comment.author] && badgeMap[comment.author] !== "none" && (
                              <img src={TIER_IMG(badgeMap[comment.author])} alt={TIER_LABEL[badgeMap[comment.author]]} title={TIER_LABEL[badgeMap[comment.author]]} className="w-4 h-4 object-contain inline-block" />
                            )}
                          </span>
                          <p className="font-normal text-zinc-700 dark:text-zinc-300 mt-0.5">{comment.text}</p>
                        </div>

                        {(userRole === "admin" || userRole === "moderator") && (
                          <div className="relative">
                            <button onClick={() => setActiveMenuId(activeMenuId === comment.id ? null : comment.id)} className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-700 dark:hover:text-zinc-500 text-[10px] p-0.5 font-bold">⠇</button>
                            {activeMenuId === comment.id && (
                              <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-2xl py-1 z-30 text-[10px] font-mono">
                                <button onClick={() => handleModAction("delete", comment.author, comment.id, true)} className="w-full text-left px-2.5 py-1 text-red-500 hover:bg-zinc-50 dark:hover:bg-zinc-800">✕ Supprimer</button>
                                <button onClick={() => handleModAction("mute_1d", comment.author, comment.id, true)} className="w-full text-left px-2.5 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800">🤫 Mute 1j</button>
                                <button onClick={() => handleModAction("ban", comment.author, comment.id, true)} className="w-full text-left px-2.5 py-1 text-amber-500 hover:bg-zinc-50 dark:hover:bg-zinc-800">💥 Ban</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                  {commentErrors[post.id] && <p className="text-xs text-red-500">{commentErrors[post.id]}</p>}
                  <div className="flex gap-2 pt-1">
                    <input type="text" disabled={!pseudo} value={commentInputs[post.id] || ""} onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter") handleAddComment(post.id); }}
                      placeholder={lang === "fr" ? "Ajoute un conseil... (pas de coordonnées ici)" : "Add advice... (no contact info here)"}
                      className="flex-1 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-900 rounded-lg px-3 py-1 h-8 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
                    <button onClick={() => handleAddComment(post.id)} className="px-3 h-8 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 text-[11px] rounded-lg hover:border-cyan-400 transition-colors">Écrire</button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* ── POPUP AUTH — reste sur Talk après connexion ── */}
      {showAuthPopup && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAuthPopup(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-zinc-200 dark:border-zinc-700" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="text-3xl mb-2">🔐</div>
              <h3 className="font-bold text-base dark:text-white">{lang === "fr" ? "Connexion" : "Sign in"}</h3>
              <p className="text-xs text-zinc-500 mt-1">{lang === "fr" ? "Nécessaire pour voter et discuter." : "Required to vote and chat."}</p>
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

    </main>
  );
}