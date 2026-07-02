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
  const [pseudo, setPseudo] = useState<string>("");
  const [pseudoInput, setPseudoInput] = useState<string>("");
  const [isSavingPseudo, setIsSavingPseudo] = useState(false);
  
  const [input, setInput] = useState("");
  const [posts, setPosts] = useState<CrashPost[]>([]);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .maybeSingle();
          
        if (profile?.username) {
          setPseudo(profile.username);
        }
      }
    });
  }, []);

  useEffect(() => {
    setPosts([
      {
        id: "1",
        text: "salut j,ai un projet un petit echo qui veut pas pogner au pres du public , ya lagentic , livre , chat , websearch et tout mais pogne pas",
        created_at: new Date().toISOString(),
        votes: {
          lost: ["melissa.landry@horizon.net"],
          blurry: ["samia.cherif@bureau.com"]
        },
        comments: [
          { id: "c1", author: "MelissaL", text: "Si le message d'entrée est flou, les gens partent avant d'avoir cliqué sur tes modules.", created_at: new Date().toISOString() },
        ],
      }
    ]);
  }, []);

  // ── SAUVEGARDE SÉCURISÉE AVEC STRATÉGIE DE REPLI ──
  const savePseudo = async () => {
    const cleanPseudo = pseudoInput.trim();
    if (!cleanPseudo || !userId || isSavingPseudo) return;
    setIsSavingPseudo(true);

    try {
      // Étape 1 : On tente un update si le profil existe déjà
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ username: cleanPseudo, updated_at: new Date().toISOString() })
        .eq("id", userId);

      // Étape 2 : Si l'update ne touche rien, on insère la ligne
      if (updateError) {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({ id: userId, username: cleanPseudo, updated_at: new Date().toISOString() });
        
        if (insertError) throw insertError;
      }

      setPseudo(cleanPseudo);
    } catch (err) {
      console.error("Erreur sauvegarde pseudo:", err);
      alert(lang === "fr" ? "Erreur de liaison avec la table profiles. Vérifie les RLS." : "Profiles table error. Check your RLS permissions.");
    } finally {
      setIsSavingPseudo(false);
    }
  };

  const handleVote = (postId: string, key: string) => {
    if (!userId || !pseudo) return; 
    const identifier = pseudo;

    setPosts(prev => prev.map(post => {
      if (post.id !== postId) return post;

      const currentVotes = { ...post.votes };
      const userVotedKeys = Object.keys(currentVotes).filter(k => currentVotes[k]?.includes(identifier));
      const alreadyVotedThisKey = currentVotes[key]?.includes(identifier);

      if (alreadyVotedThisKey) {
        currentVotes[key] = currentVotes[key].filter(u => u !== identifier);
        return { ...post, votes: currentVotes };
      }

      if (userVotedKeys.length >= 6) {
        alert(lang === "fr" ? "Maximum 6 choix par projet." : "Maximum 6 choices per project.");
        return post;
      }

      currentVotes[key] = [...(currentVotes[key] || []), identifier];
      return { ...post, votes: currentVotes };
    }));
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text || !pseudo) return;

    setPosts(prev => prev.map(post => {
      if (post.id !== postId) return post;
      return {
        ...post,
        comments: [
          ...post.comments,
          { id: `c-${Date.now()}`, author: pseudo, text, created_at: new Date().toISOString() }
        ]
      };
    }));

    setCommentInputs(prev => ({ ...prev, [postId]: "" }));
  };

  const launchPost = () => {
    if (!input.trim() || !pseudo) return;
    const newPost: CrashPost = {
      id: `post-${Date.now()}`,
      text: input.trim(),
      created_at: new Date().toISOString(),
      votes: {},
      comments: [],
    };
    setPosts(prev => [newPost, ...prev]);
    setInput("");
  };

  return (
    <main className="w-full min-h-screen bg-[#121214] text-zinc-300 flex flex-col font-sans selection:bg-cyan-500/20">
      
      {/* HEADER NAV */}
      <nav className="border-b border-zinc-800 bg-[#0b0b0d] px-6 h-14 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <span className="font-mono text-xs font-bold text-cyan-500 tracking-wider">TALK_LAB</span>
          <div className="flex items-center gap-5 text-sm font-medium">
            <Link href="/2/talk" className="text-cyan-400 font-semibold">Talk</Link>
            <Link href="/2/connect" className="text-zinc-500 hover:text-zinc-200 transition-colors">Connexion</Link>
          </div>
        </div>
        
        <div className="flex items-center">
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value as Lang)}
            className="bg-transparent text-xs text-zinc-500 hover:text-zinc-300 font-mono focus:outline-none cursor-pointer uppercase tracking-wider">
            <option value="fr" className="bg-[#121214] text-zinc-300">FR</option>
            <option value="en" className="bg-[#121214] text-zinc-300">EN</option>
          </select>
        </div>
      </nav>

      <div className="max-w-2xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        
        {/* ENCADRÉ CONTEXTUEL — CONFIGURATION DU PSEUDO OU DU NOM */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 shadow-xl">
          {!userId ? (
            <div className="text-center py-2">
              <p className="text-xs text-zinc-500">
                {lang === "fr" ? "Tu dois être connecté pour participer aux crash-tests." : "You must be logged in to participate in crash-tests."}
              </p>
              <Link href="/2/connect" className="inline-block mt-3 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-800 transition-colors">
                {lang === "fr" ? "S'authentifier" : "Sign In"}
              </Link>
            </div>
          ) : !pseudo ? (
            <div className="flex flex-col gap-3">
              <div>
                <span className="text-[10px] font-mono text-zinc-600 block uppercase tracking-wider">Compte actif : {userEmail}</span>
                <h3 className="text-xs font-bold text-zinc-300 mt-1">
                  {lang === "fr" ? "Choisis ton nom ou pseudo" : "Choose your name or nickname"}
                </h3>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={25}
                  placeholder={lang === "fr" ? "Nom ou pseudo" : "Name or nickname"}
                  value={pseudoInput}
                  onChange={e => setPseudoInput(e.target.value.replace(/[^a-zA-Z0-9_\s-]/g, ""))} 
                  className="flex-1 bg-[#121214] border border-zinc-900 rounded-lg px-3 py-1.5 h-9 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-cyan-500/30"
                />
                <button 
                  onClick={savePseudo}
                  disabled={!pseudoInput.trim() || isSavingPseudo}
                  className="px-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-20 text-white font-medium text-xs rounded-lg transition-colors h-9">
                  {lang === "fr" ? "Valider" : "Confirm"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]" />
                <span className="font-mono text-zinc-500">{lang === "fr" ? "Auteur actif :" : "Active author :"}</span>
                <span className="font-bold text-cyan-400 font-mono">{pseudo}</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-600 max-w-[180px] truncate">{userEmail}</span>
            </div>
          )}
        </div>

        {/* COMPOSANT TEXTAREA */}
        <div className={`bg-zinc-950 border border-zinc-900 rounded-xl p-4 shadow-xl transition-opacity duration-300 ${!pseudo ? "opacity-25 pointer-events-none select-none" : ""}`}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={!pseudo}
            placeholder={lang === "fr" ? "Écris ton idée ou ton pitch brut..." : "Write your raw idea or pitch..."}
            className="w-full h-16 bg-transparent text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none resize-none leading-relaxed"
          />
          <div className="flex justify-end pt-2 border-t border-zinc-900 mt-2">
            <button onClick={launchPost} disabled={!pseudo} className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-lg transition-colors">
              {lang === "fr" ? "Lancer l'analyse" : "Launch"}
            </button>
          </div>
        </div>

        {/* FEED COMPACT */}
        <div className={`flex flex-col gap-5 transition-opacity duration-300 ${!pseudo ? "opacity-30 pointer-events-none select-none" : ""}`}>
          {posts.map(post => {
            const totalVotes = Object.values(post.votes).reduce((sum, curr) => sum + curr.length, 0) || 1;

            return (
              <div key={post.id} className="bg-zinc-950 border border-cyan-500/10 rounded-xl overflow-hidden flex flex-col shadow-xl">
                
                <div className="p-4 border-b border-zinc-900 bg-zinc-900/10">
                  <p className="text-zinc-200 text-sm leading-relaxed font-normal">{post.text}</p>
                </div>

                <div className="p-4 border-b border-zinc-900 bg-zinc-950 flex flex-col gap-1">
                  {CRITIQUES.map(crit => {
                    const voters = post.votes[crit.key] || [];
                    const count = voters.length;
                    const hasVoted = voters.includes(pseudo);
                    const ratio = Math.round((count / totalVotes) * 100);

                    return (
                      <button
                        key={crit.key}
                        disabled={!pseudo}
                        onClick={() => handleVote(post.id, crit.key)}
                        className={`w-full h-7 rounded-lg relative overflow-hidden text-left border transition-all ${
                          hasVoted ? "border-cyan-500/30 bg-cyan-500/[0.02]" : "border-zinc-900/40 bg-zinc-900/5 hover:border-zinc-800"
                        }`}>
                        
                        <div 
                          className={`absolute left-0 top-0 bottom-0 transition-all duration-300 ${hasVoted ? "bg-cyan-500/10" : "bg-zinc-900/20"}`}
                          style={{ width: `${count > 0 ? ratio : 0}%` }}
                        />
                        
                        <div className="absolute inset-0 flex items-center justify-between px-3 text-[11px]">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-xs shrink-0">{crit.emoji}</span>
                            <span className="truncate text-zinc-400 font-normal">{crit.text}</span>
                          </div>
                          {count > 0 && (
                            <span className="font-mono text-[9px] text-zinc-500 bg-zinc-900 px-1 py-0.5 rounded">
                              {count}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* LOG DE COMMENTAIRES */}
                <div className="bg-zinc-950 p-4 flex flex-col gap-4">
                  {post.comments.length > 0 && (
                    <div className="flex flex-col gap-2.5 border-b border-zinc-900 pb-3">
                      {post.comments.map(comment => (
                        <div key={comment.id} className="text-xs text-zinc-400 pl-3 border-l border-zinc-800 flex flex-col">
                          <span className="font-mono text-[9px] text-cyan-500/70 font-bold tracking-tight">@{comment.author}</span>
                          <p className="font-normal text-zinc-300 mt-0.5">{comment.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      disabled={!pseudo}
                      value={commentInputs[post.id] || ""}
                      onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter") handleAddComment(post.id); }}
                      placeholder={lang === "fr" ? "Ajoute un avis ou un conseil à la file..." : "Add your advice to the thread..."}
                      className="flex-1 bg-zinc-900/30 border border-zinc-900 rounded-lg px-3 py-1 h-8 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-800 font-normal"
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      disabled={!pseudo}
                      className="px-3 h-8 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 text-[11px] font-medium rounded-lg transition-colors">
                      {lang === "fr" ? "Écrire" : "Comment"}
                    </button>
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