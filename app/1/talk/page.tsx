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

const CRITIQUES = [
  { key: "exist",    emoji: "🧠", text: "Je comprends le projet, mais pas pourquoi il existe." },
  { key: "already",  emoji: "🔄", text: "Ça ressemble trop à quelque chose qui existe déjà." },
  { key: "no_pay",   emoji: "💰", text: "Je l'utiliserais, mais je ne paierais jamais pour ça." },
  { key: "wish",     emoji: "🔥", text: "J'aurais aimé avoir eu cette idée." },
  { key: "blurry",   emoji: "🌫️", text: "Le message est flou." },
  { key: "numb",     emoji: "💤", text: "Je ne ressens rien." },
  { key: "lost",     emoji: "🤔", text: "Je suis intrigué mais perdu." },
  { key: "client",   emoji: "💳", text: "Je pourrais devenir client." },
  { key: "clone",    emoji: "🥸", text: "Ça sent le clone" },
  { key: "spark",    emoji: "🧪", text: "Il y a quelque chose ici, continue de creuser" },
  { key: "big",      emoji: "🧨", text: "Cette idée pourrait devenir grosse" },
  { key: "fail",     emoji: "🩻", text: "Je pense savoir exactement pourquoi ça ne marchera pas." },
];

export default function TalkPage() {
  const [lang, setLang] = useState<Lang>("fr");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [pseudo, setPseudo] = useState<string>("");
  const [pseudoInput, setPseudoInput] = useState<string>("");
  const [isSavingPseudo, setIsSavingPseudo] = useState(false);

  const [input, setInput] = useState("");
  const [posts, setPosts] = useState<CrashPost[]>([]);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
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

        if (profile?.username) setPseudo(profile.username);

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

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text || !pseudo) return;

    await supabase.from("talk_comments").insert({
      post_id: postId,
      user_id: userId,
      user_email: pseudo,
      text: text
    });

    setCommentInputs(prev => ({ ...prev, [postId]: "" }));
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
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]" />
                <span className="font-bold text-cyan-600 dark:text-cyan-400 font-mono">{pseudo}</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600">{userEmail}</span>
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
            const totalVotes = Object.values(post.votes).reduce((sum, curr) => sum + curr.length, 0) || 1;

            return (
              <div key={post.id} className="bg-white dark:bg-zinc-950 border border-cyan-500/20 dark:border-cyan-500/10 rounded-xl overflow-hidden flex flex-col shadow-sm">

                <div className="p-4 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/60 dark:bg-zinc-900/10 flex justify-between items-start relative">
                  <div className="flex-1 mr-4">
                    {post.author_pseudo && (
                      <span className="text-[10px] font-mono font-bold text-cyan-600/80 dark:text-cyan-500/70 block mb-1">@{post.author_pseudo}</span>
                    )}
                    <p className="text-zinc-800 dark:text-zinc-200 text-sm leading-relaxed">{post.text}</p>
                    {post.fiche_id && post.fiche_nom && (
                      <Link href="/1/fiche" className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline">
                        🔗 {lang === "fr" ? "Fiche liée" : "Linked listing"}: {post.fiche_nom}
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

                {/* SONDAGES */}
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 flex flex-col gap-1">
                  {CRITIQUES.map(crit => {
                    const voters = post.votes[crit.key] || [];
                    const count = voters.length;
                    const hasVoted = voters.includes(pseudo);
                    const ratio = Math.round((count / totalVotes) * 100);

                    return (
                      <button key={crit.key} onClick={() => handleVote(post.id, crit.key)}
                        className={`w-full h-7 rounded-lg relative overflow-hidden text-left border transition-all ${hasVoted ? "border-cyan-500/40 bg-cyan-500/[0.04]" : "border-zinc-100 dark:border-zinc-900/40 bg-zinc-50/50 dark:bg-zinc-900/5 hover:border-zinc-300 dark:hover:border-zinc-800"}`}>
                        <div className={`absolute left-0 top-0 bottom-0 ${hasVoted ? "bg-cyan-500/10" : "bg-zinc-200/40 dark:bg-zinc-900/20"}`} style={{ width: `${count > 0 ? ratio : 0}%` }} />
                        <div className="absolute inset-0 flex items-center justify-between px-3 text-[11px]">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-xs shrink-0">{crit.emoji}</span>
                            <span className="truncate text-zinc-600 dark:text-zinc-400">{crit.text}</span>
                          </div>
                          {count > 0 && <span className="font-mono text-[9px] text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-1 py-0.5 rounded">{count}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* COMMENTAIRES */}
                <div className="bg-white dark:bg-zinc-950 p-4 flex flex-col gap-4">
                  {post.comments.length > 0 && (
                    <div className="flex flex-col gap-2.5 border-b border-zinc-100 dark:border-zinc-900 pb-3">
                      {post.comments.map(comment => (
                        <div key={comment.id} className="text-xs text-zinc-500 dark:text-zinc-400 pl-3 border-l border-zinc-200 dark:border-zinc-800 flex justify-between items-start relative group">
                          <div className="flex flex-col flex-1 mr-4">
                            <span className="font-mono text-[9px] text-cyan-600/80 dark:text-cyan-500/70 font-bold">@{comment.author}</span>
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

                  <div className="flex gap-2">
                    <input type="text" disabled={!pseudo} value={commentInputs[post.id] || ""} onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter") handleAddComment(post.id); }}
                      placeholder={lang === "fr" ? "Ajoute un avis ou un conseil..." : "Add your advice..."}
                      className="flex-1 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-900 rounded-lg px-3 py-1 h-8 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
                    <button onClick={() => handleAddComment(post.id)} className="px-3 h-8 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 text-[11px] rounded-lg hover:border-cyan-400 transition-colors">Écrire</button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}