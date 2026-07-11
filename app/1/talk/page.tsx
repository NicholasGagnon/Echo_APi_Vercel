"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

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

// ── PALIERS (Bronze/Argent/Or/VIP) — calculés à partir de public.user_badges ──
type BadgeRow = {
  reglement_lu: boolean; fiche_count: number; tunnel_count: number;
  talk_participation: number; comment_count: number; interets_sent: number;
  max_project_interest: number;
};

type Tier = "none" | "bronze" | "argent" | "or" | "vip";
const TIER_EMOJI: Record<Tier, string> = { none: "", bronze: "🥉", argent: "🥈", or: "🥇", vip: "💎" };
const TIER_LABEL: Record<Tier, string> = { none: "", bronze: "Bronze", argent: "Argent", or: "Or", vip: "VIP" };

type Task = { label: string; done: boolean };

const getTierTasks = (row: BadgeRow) => {
  const bronze: Task[] = [
    { label: "Lire le règlement", done: row.reglement_lu },
    { label: "Voter sur 1 projet Talk", done: row.talk_participation >= 1 },
    { label: "Envoyer 1 intérêt", done: row.interets_sent >= 1 },
  ];
  const bronzeDone = bronze.every(t => t.done);

  const argent: Task[] = [
    { label: "Obtenir Bronze", done: bronzeDone },
    { label: "Voter sur 3 projets Talk au total", done: row.talk_participation >= 3 },
    { label: "Débloquer 1 contact", done: row.tunnel_count >= 1 },
  ];
  const argentDone = bronzeDone && row.talk_participation >= 3 && row.tunnel_count >= 1;

  const or: Task[] = [
    { label: "Obtenir Argent", done: argentDone },
    { label: "Voter sur 5 projets Talk au total", done: row.talk_participation >= 5 },
    { label: "Débloquer 2 contacts", done: row.tunnel_count >= 2 },
  ];
  const orDone = argentDone && row.talk_participation >= 5 && row.tunnel_count >= 2;

  const vip: Task[] = [
    { label: "Obtenir Or", done: orDone },
    { label: "Débloquer 5 contacts", done: row.tunnel_count >= 5 },
  ];
  const vipDone = orDone && row.tunnel_count >= 5;

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
  const [isSavingPseudo, setIsSavingPseudo] = useState(false);

  const [input, setInput] = useState("");
  const [posts, setPosts] = useState<CrashPost[]>([]);
  const [badgeMap, setBadgeMap] = useState<Record<string, Tier>>({});
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

  const handleMarkReglementLu = async () => {
    if (!userId) return;
    await supabase.from("profiles").update({ reglement_lu: true }).eq("id", userId);
    setMyBadgeRow(prev => prev ? { ...prev, reglement_lu: true } : prev);
    await refreshMyBadges();
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
    await supabase.from("talk_posts").insert({
      user_id: userId,
      text: input.trim(),
      user_pseudo: pseudo,
    });
    setInput("");
    await fetchFeed();
  };

  const handleVote = async (postId: string, key: string) => {
    if (!userId || !pseudo) return;

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
      <nav className="border-b border-zinc-100 dark:border-zinc-800/60 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-sm z-50">
        <Link href="/1/hall" className="font-bold text-sm text-zinc-800 dark:text-zinc-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
          Echo AI
        </Link>
        <div className="flex items-center gap-5 text-sm flex-wrap">
          <Link href="/1/hall" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Hall" : "Hall"}</Link>
          <Link href="/1/dashboard" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">Dashboard</Link>
          <Link href="/1/conversation" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Conversation" : "Conversation"}</Link>
          <Link href="/1/form" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Formulaire" : "Form"}</Link>
          <Link href="/1/fiche" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Fiches" : "Listings"}</Link>
          <Link href="/1/talk" className="text-cyan-600 dark:text-cyan-400 font-semibold">Talk</Link>
          <Link href="/1/desktop" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Bureau" : "Desktop"}</Link>
          <Link href="/1/account" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Compte" : "Account"}</Link>
          <button onClick={() => setLang(l => (l === "fr" ? "en" : "fr"))}
            className="text-xs text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded-lg hover:border-zinc-400 transition-colors">
            {lang === "fr" ? "EN" : "FR"}
          </button>
        </div>
      </nav>

      <div className="max-w-2xl w-full mx-auto px-4 py-8 flex flex-col gap-6">

        {/* CONFIG PSEUDO */}
        <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
          {!userId ? (
            <div className="text-center py-2">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{lang === "fr" ? "Tu dois être connecté pour participer." : "You must be logged in to participate."}</p>
              <Link href="/1/account" className="inline-block mt-3 px-4 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs rounded-lg font-semibold">
                {lang === "fr" ? "S'authentifier" : "Sign In"}
              </Link>
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
                    <span className="text-sm" title={TIER_LABEL[getTierTasks(myBadgeRow).tier]}>
                      {TIER_EMOJI[getTierTasks(myBadgeRow).tier]} {TIER_LABEL[getTierTasks(myBadgeRow).tier]}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600">{userEmail}</span>
              </div>

              {myBadgeRow && (
                <div className="border-t border-zinc-100 dark:border-zinc-900 pt-2 mt-1">
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-1.5">
                    {lang === "fr" ? "Prochain palier" : "Next tier"}: {TIER_EMOJI[getTierTasks(myBadgeRow).nextTier]} {TIER_LABEL[getTierTasks(myBadgeRow).nextTier]}
                  </p>
                  <div className="flex flex-col gap-1">
                    {getTierTasks(myBadgeRow).nextTasks.map(task => (
                      <div key={task.label} className="flex items-center gap-2 text-[11px]">
                        <span className={task.done ? "text-emerald-500" : "text-zinc-400 dark:text-zinc-600"}>{task.done ? "☑" : "☐"}</span>
                        <span className={task.done ? "text-zinc-400 dark:text-zinc-500 line-through" : "text-zinc-600 dark:text-zinc-400"}>{task.label}</span>
                        {task.label === "Lire le règlement" && !task.done && (
                          <button onClick={handleMarkReglementLu} className="text-cyan-600 dark:text-cyan-400 underline underline-offset-2 ml-1">
                            {lang === "fr" ? "marquer comme lu" : "mark as read"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                          <span title={TIER_LABEL[badgeMap[post.author_pseudo]]}>{TIER_EMOJI[badgeMap[post.author_pseudo]]}</span>
                        )}
                      </span>
                    )}
                    <p className="text-zinc-800 dark:text-zinc-200 text-sm leading-relaxed">{post.text}</p>
                    {post.fiche_id && post.fiche_nom && (
                      <Link href="/1/fiche" className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/50 px-2.5 py-1 rounded-full hover:bg-cyan-100 dark:hover:bg-cyan-950/50 transition-colors">
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

                {/* CONSEILS DÉJÀ LAISSÉS — lecture seule, plus de nouvelle saisie libre */}
                {post.comments.length > 0 && (
                  <div className="bg-white dark:bg-zinc-950 p-4 flex flex-col gap-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
                      {lang === "fr" ? "Conseils reçus" : "Advice received"}
                    </p>
                    {post.comments.map(comment => (
                      <div key={comment.id} className="text-xs text-zinc-500 dark:text-zinc-400 pl-3 border-l border-zinc-200 dark:border-zinc-800 flex justify-between items-start relative group">
                        <div className="flex flex-col flex-1 mr-4">
                          <span className="font-mono text-[9px] text-cyan-600/80 dark:text-cyan-500/70 font-bold flex items-center gap-1">
                            @{comment.author}
                            {badgeMap[comment.author] && badgeMap[comment.author] !== "none" && (
                              <span title={TIER_LABEL[badgeMap[comment.author]]}>{TIER_EMOJI[badgeMap[comment.author]]}</span>
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
                  </div>
                )}

              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}