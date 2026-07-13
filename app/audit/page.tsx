"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Lang = "fr" | "en";

const CONTACT_PATTERN = /[\w.+-]+@[\w-]+\.[a-z]{2,}|(\+?\d[\d\s.-]{8,}\d)/i;

type Tier = "none" | "bronze" | "argent" | "or" | "vip";
const TIER_IMG = (tier: Tier) => `/${tier}.png`;
const TIER_LABEL: Record<Tier, string> = { none: "", bronze: "Bronze", argent: "Argent", or: "Or", vip: "VIP" };

type Comment = { id: string; user_pseudo: string; text: string; created_at: string };
type AuditPost = {
  id: string; url: string; description: string | null; created_at: string;
  images: string[] | null; user_id: string;
  author_pseudo: string; votes: Record<string, string[]>; comments: Comment[];
};

export default function AuditPage() {
  const [lang, setLang] = useState<Lang>("fr");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [pseudo, setPseudo] = useState<string>("");
  const [pseudoInput, setPseudoInput] = useState<string>("");

  const [newUrl, setNewUrl] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [posting, setPosting] = useState(false);

  const [posts, setPosts] = useState<AuditPost[]>([]);
  const [badgeMap, setBadgeMap] = useState<Record<string, Tier>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // État de la visionneuse d'image (Lightbox) en temps réel
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  // Connexion inline — reste sur Audit après authentification
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [authEmailMode, setAuthEmailMode] = useState<"signin"|"signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string|null>(null);
  const [authSuccess, setAuthSuccess] = useState<string|null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Modification de son propre audit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
        const { data: profile } = await supabase.from("profiles").select("username, role").eq("id", session.user.id).maybeSingle();
        if (profile?.username) setPseudo(profile.username);
        if (session.user.email === "lafailleestouverte@gmail.com" || session.user.email === "nicholas@echosai.ca") setUserRole("admin");
        else if (profile?.role) setUserRole(profile.role);
      }
    });
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    const { data, error } = await supabase
      .from("audit_posts")
      .select("*, audit_votes(critique_key, user_email), audit_comments(*)")
      .order("created_at", { ascending: false });
    if (error || !data) return;

    const formatted: AuditPost[] = data.map((p: any) => {
      const votesStructure: Record<string, string[]> = {};
      p.audit_votes?.forEach((v: any) => { votesStructure[v.critique_key] = [...(votesStructure[v.critique_key] || []), v.user_email]; });
      return {
        id: p.id, url: p.url, description: p.description, created_at: p.created_at,
        images: p.images || null,
        author_pseudo: p.user_pseudo,
        user_id: p.user_id,
        votes: votesStructure,
        comments: (p.audit_comments || []).map((c: any) => ({ id: c.id, user_pseudo: c.user_pseudo, text: c.text, created_at: c.created_at })),
      };
    });
    setPosts(formatted);
    await loadBadges(formatted);
  };

  const loadBadges = async (feedPosts: AuditPost[]) => {
    const pseudos = new Set<string>();
    feedPosts.forEach(p => { pseudos.add(p.author_pseudo); p.comments.forEach(c => pseudos.add(c.user_pseudo)); });
    if (pseudos.size === 0) return;
    const { data } = await supabase.rpc("get_user_badges", { p_usernames: Array.from(pseudos) });
    const map: Record<string, Tier> = {};
    (data || []).forEach((row: any) => {
      const bronzeDone = row.places_published >= 2 && row.comment_count >= 4 && row.talk_clicks >= 10;
      const argentDone = bronzeDone && row.comment_count >= 20 && row.talk_clicks >= 20;
      const orDone = argentDone && row.comment_count >= 150 && row.talk_clicks >= 50;
      const vipDone = orDone && row.comment_count >= 500 && row.talk_clicks >= 100;
      map[row.username] = vipDone ? "vip" : orDone ? "or" : argentDone ? "argent" : bronzeDone ? "bronze" : "none";
    });
    setBadgeMap(map);
  };

  const savePseudo = async () => {
    const clean = pseudoInput.trim();
    if (!clean || !userId) return;
    await supabase.from("profiles").upsert({ id: userId, username: clean, updated_at: new Date().toISOString() });
    setPseudo(clean);
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/audit`, scopes: "openid profile email", queryParams: { prompt: "select_account" } } });
  };
  const handleMicrosoft = async () => {
    await supabase.auth.signInWithOAuth({ provider: "azure", options: { redirectTo: `${window.location.origin}/audit`, scopes: "openid profile email User.Read" } });
  };
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(null); setAuthSuccess(null); setAuthLoading(true);
    if (authEmailMode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
      if (error) setAuthError(error.message); else setShowAuthPopup(false);
    } else {
      const { data, error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword, options: { emailRedirectTo: `${window.location.origin}/audit` } });
      if (error) setAuthError(error.message);
      else if (data?.user && (!data.user.identities || data.user.identities.length === 0)) setAuthError("Compte existant.");
      else setAuthSuccess(lang === "fr" ? "Vérifiez votre boîte mail !" : "Check your inbox!");
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUserId(null); setUserEmail(null); setPseudo(""); setShowUserMenu(false); };

  // Modifier sa propre soumission (URL + description) — les images restent gérées depuis Form
  const startEdit = (post: AuditPost) => {
    setEditingId(post.id);
    setEditUrl(post.url);
    setEditDesc(post.description || "");
  };
  const cancelEdit = () => { setEditingId(null); setEditUrl(""); setEditDesc(""); };
  const saveEdit = async (postId: string) => {
    if (!editUrl.trim()) return;
    let url = editUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    setSavingEdit(true);
    try {
      await supabase.from("audit_posts").update({ url, description: editDesc.trim() || null }).eq("id", postId).eq("user_id", userId);
      cancelEdit();
      await fetchFeed();
    } finally { setSavingEdit(false); }
  };

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
      return lang === "fr" ? "🤐 Tu es muet temporairement — impossible de publier ou commenter." : "🤐 You're temporarily muted — can't post or comment.";
    }
    return null;
  };

  const handlePublish = async () => {
    if (!userId || !pseudo || !newUrl.trim()) return;
    const sanctionMsg = await checkSanction();
    if (sanctionMsg) { alert(sanctionMsg); return; }
    let url = newUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    setPosting(true);
    try {
      await supabase.from("audit_posts").insert({ user_id: userId, user_pseudo: pseudo, url, description: newDesc.trim() || null });
      setNewUrl(""); setNewDesc("");
      await fetchFeed();
    } finally { setPosting(false); }
  };

  const handleAddComment = async (postId: string) => {
    if (!userId) return;
    if (!pseudo) { setCommentErrors(prev => ({ ...prev, [postId]: lang === "fr" ? "Indicatif requis." : "Callsign required." })); return; }
    const text = (commentInputs[postId] || "").trim();
    if (!text) return;
    const sanctionMsg = await checkSanction();
    if (sanctionMsg) { setCommentErrors(prev => ({ ...prev, [postId]: sanctionMsg })); return; }
    if (CONTACT_PATTERN.test(text)) {
      setCommentErrors(prev => ({ ...prev, [postId]: lang === "fr" ? "🚫 Partage de coordonnées interdit." : "🚫 Contact info sharing forbidden." }));
      return;
    }
    setCommentErrors(prev => { const n = { ...prev }; delete n[postId]; return n; });
    await supabase.from("audit_comments").insert({ post_id: postId, user_id: userId, user_pseudo: pseudo, text });
    setCommentInputs(prev => ({ ...prev, [postId]: "" }));
    await fetchFeed();
  };

  const handleModAction = async (actionType: string, targetPseudo: string, targetId: string, isComment: boolean) => {
    setActiveMenuId(null);
    if (userRole !== "admin" && userRole !== "moderator") return;
    if (actionType === "delete") {
      if (confirm(lang === "fr" ? "Purger définitivement ?" : "Purge permanently?")) {
        if (isComment) await supabase.from("audit_comments").delete().eq("id", targetId);
        else await supabase.from("audit_posts").delete().eq("id", targetId);
        await fetchFeed();
      }
      return;
    }
    let expiresAt: Date | null = new Date();
    if (actionType === "mute_1d") expiresAt.setDate(expiresAt.getDate() + 1);
    else if (actionType === "ban") expiresAt = null;
    await supabase.from("moderation_logs").insert({ target_username: targetPseudo, action_type: actionType, reason: "Modération Vaisseau", expires_at: expiresAt ? expiresAt.toISOString() : null });
  };

  return (
    <main className="min-h-screen bg-zinc-900 text-zinc-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-400 antialiased relative">

      {/* VISIONNEUSE D'IMAGE GÉANTE EN TEMPS RÉEL (LIGHTBOX) */}
      {activeLightboxImage && (
        <div 
          className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setActiveLightboxImage(null)}
        >
          <div className="absolute top-4 right-4 text-zinc-400 font-mono text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1">
            {lang === "fr" ? "CLIQUEZ N'IMPORTE OÙ POUR FERMER" : "CLICK ANYWHERE TO CLOSE"}
          </div>
          <img 
            src={activeLightboxImage} 
            alt="Expanded Preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-zinc-800 animate-in zoom-in-95 duration-200"
          />
        </div>
      )}

      {/* NAV */}
      <nav className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between gap-4">
        {/* ZONE 1 — logo + onglets */}
        <div className="flex items-center gap-5 flex-wrap">
          <Link href="/" className="font-mono font-black text-sm tracking-[0.3em] text-white uppercase">
            ECHO<span className="text-cyan-500">.CORE</span>
          </Link>
          <div className="flex items-center gap-5 text-xs font-mono flex-wrap">
            <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors">{lang === "fr" ? "Accueil" : "Home"}</Link>
            <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300 transition-colors">{lang === "fr" ? "Tous les outils" : "All tools"}</Link>
            <Link href="/conversation" className="text-zinc-500 hover:text-zinc-300 transition-colors">AI Chat</Link>
            <Link href="/form" className="text-zinc-500 hover:text-zinc-300 transition-colors">{lang === "fr" ? "Créer un projet" : "Create project"}</Link>
            <Link href="/fiche" className="text-zinc-500 hover:text-zinc-300 transition-colors">{lang === "fr" ? "Explorer les projets" : "Explore projects"}</Link>
            <Link href="/talk" className="text-zinc-500 hover:text-zinc-300 transition-colors">{lang === "fr" ? "Avis de la communauté" : "Community feedback"}</Link>
            <Link href="/audit" className="text-cyan-400 font-bold border-b-2 border-cyan-500 pb-1">{lang === "fr" ? "Audition de site web" : "Website audit"}</Link>
            <Link href="/idea" className="text-zinc-500 hover:text-zinc-300 transition-colors">{lang === "fr" ? "Avis de l'IA" : "AI feedback"}</Link>
            <Link href="/account" className="text-zinc-500 hover:text-zinc-300 transition-colors">{lang === "fr" ? "Mon compte" : "My account"}</Link>
          </div>
        </div>

        {/* SÉPARATEUR + ZONE 2 — Bureau (premium) + langue + pseudo */}
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="w-px h-6 bg-zinc-800" />

          {/* BUREAU — verrouillé pour l'instant */}
          <div className="relative group">
            <button
              onClick={() => { /* TODO: activer + ouvrir popup d'avantages une fois le premium prêt */ }}
              className="flex items-center gap-1.5 bg-amber-500/5 border border-amber-500/25 rounded-lg px-3 py-1.5 cursor-not-allowed opacity-65">
              <span className="text-xs">🔒</span>
              <span className="text-[11px] font-mono font-bold text-amber-500 whitespace-nowrap">{lang === "fr" ? "Mon Bureau" : "My Desk"}</span>
            </button>
            <div className="absolute top-full right-0 mt-1.5 bg-zinc-900 border border-zinc-700 rounded-md px-2.5 py-1 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              {lang === "fr" ? "🚧 En construction" : "🚧 Under construction"}
            </div>
          </div>

          <div className="relative">
            <button onClick={() => setShowLangMenu(v => !v)}
              className="text-[10px] text-zinc-400 border border-zinc-800 px-2.5 py-1.5 rounded hover:border-zinc-600 transition-colors font-mono font-bold">
              {lang === "fr" ? "FR" : "EN"}
            </button>
            {showLangMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                <div className="absolute top-full right-0 mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 min-w-28 overflow-hidden">
                  {(["fr","en"] as const).map(l => (
                    <button key={l} onClick={() => { setLang(l); setShowLangMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-xs font-mono ${lang === l ? "bg-cyan-950/40 text-cyan-400 font-bold" : "text-zinc-400"}`}>
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
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block animate-pulse" />
                <span className="text-[11px] font-mono font-bold text-cyan-400">{pseudo || (lang === "fr" ? "Choisir un pseudo" : "Choose nickname")}</span>
              </button>
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute top-full right-0 mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 min-w-52 p-3">
                    <div className="text-[10px] text-zinc-500 mb-2 break-all font-mono">{userEmail}</div>
                    <button onClick={handleLogout} className="w-full text-left text-xs font-mono text-red-400 hover:text-red-300 py-1">
                      ↩ {lang === "fr" ? "Se déconnecter" : "Sign out"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button onClick={() => setShowAuthPopup(true)}
              className="bg-cyan-500 text-zinc-950 text-xs font-mono font-black px-3.5 py-1.5 rounded-lg hover:bg-cyan-400 transition-colors">
              {lang === "fr" ? "Se connecter" : "Sign in"}
            </button>
          )}
        </div>
      </nav>

      {/* INTERFACE ÉLARGIE */}
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* CONSOLE DE CONTRÔLE GAUCHE */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="border border-zinc-800 bg-gradient-to-b from-zinc-800/40 to-zinc-900 rounded-2xl p-6 shadow-xl">
            <div className="text-[9px] font-mono tracking-[0.25em] text-cyan-500 uppercase mb-2">{lang === "fr" ? "AUDIT DE SITE WEB" : "WEBSITE AUDIT"}</div>
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase mb-3 leading-none">
              AUDIT
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              {lang === "fr" 
                ? "Bienvenue sur Audit. Ici vous faites auditionner votre projet. Les gens le visitent en temps réel et vous disent ce qui pourrait être amélioré." 
                : "Welcome to Audit. This is where your project gets reviewed. People explore it in real time and let you know exactly what could be improved."}
            </p>
          </div>

          {/* COMPTE COMMANDE */}
          <div className="border border-zinc-800 bg-zinc-800/20 backdrop-blur-sm rounded-2xl p-5 font-mono text-xs shadow-md">
            {!userId ? (
              <div className="space-y-3 py-1">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest text-center">{lang === "fr" ? "Authentification requise" : "Sign-in required"}</p>
                <button onClick={() => setShowAuthPopup(true)} className="block w-full text-center py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs rounded-xl font-black uppercase tracking-wider transition-all">
                  {lang === "fr" ? "Se connecter" : "Sign in"}
                </button>
              </div>
            ) : !pseudo ? (
              <div className="space-y-3">
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{lang === "fr" ? "Choisis ton indicatif" : "Choose your callsign"}</div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input type="text" placeholder="Callsign / Pseudo" value={pseudoInput} onChange={e => setPseudoInput(e.target.value.replace(/[^a-zA-Z0-9_\s-]/g, ""))}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none focus:border-cyan-500 transition-colors" />
                  <button onClick={savePseudo} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs rounded-xl font-black uppercase tracking-wider transition-colors">
                    OK
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_#06b6d4]" />
                  <span className="font-black text-white uppercase tracking-wider">@{pseudo}</span>
                </div>
                <span className="text-[10px] text-zinc-500 text-right max-w-[140px] truncate">{userEmail}</span>
              </div>
            )}
          </div>

          {/* BOÎTE D'INJECTION DE SITES */}
          <div className={`border border-zinc-800 bg-zinc-900 rounded-2xl p-5 space-y-4 shadow-xl transition-all ${!pseudo ? "opacity-20 pointer-events-none" : ""}`}>
            <div className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">{lang === "fr" ? "Soumettre un site" : "Submit a site"}</div>
            <div className="space-y-2.5">
              <input type="text" value={newUrl} onChange={e => setNewUrl(e.target.value)}
                placeholder="https://votre-site-web.com"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-white outline-none focus:border-cyan-500 transition-colors shadow-inner" />
              
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3}
                placeholder={lang === "fr" ? "Sur quoi voulez-vous des critiques ? (Ex. Pourquoi mon bouton de connexion bloque la conversion ?)" : "What elements require scrutiny? (e.g., Why does my auth step kill funnel conversion?)"}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-300 outline-none focus:border-cyan-500 resize-none font-sans leading-relaxed shadow-inner" />
            </div>
            <button onClick={handlePublish} disabled={posting || !newUrl.trim()} 
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-900 disabled:text-zinc-700 text-zinc-950 font-mono font-black text-xs rounded-xl uppercase tracking-widest transition-all shadow-md">
              {posting ? "..." : (lang === "fr" ? "DÉPLOYER LE SITE SUR LE RADAR" : "SCAN INTERFACE NOW")}
            </button>
          </div>
        </div>

        {/* FLUX DE JUGEMENT PRINCIPAL ÉLARGI */}
        <div className={`lg:col-span-8 flex flex-col gap-8 ${!pseudo ? "opacity-20 pointer-events-none" : ""}`}>
          
          {posts.map(post => {
            const uniqueVoters = new Set<string>();
            Object.values(post.votes).forEach(voters => voters.forEach(v => uniqueVoters.add(v)));
            const totalParticipants = uniqueVoters.size;

            return (
              <div key={post.id} className="border border-zinc-800 bg-zinc-900 rounded-2xl overflow-hidden flex flex-col shadow-2xl transition-all hover:border-zinc-700 relative">
                
                {/* L'ENTÊTE - LE SITE EN MAJESTÉ */}
                <div className="p-6 border-b border-zinc-800 bg-zinc-800/10 flex justify-between items-start relative">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 font-mono text-[10px] font-bold text-zinc-500">
                      <span>{lang === "fr" ? "AUTEUR:" : "AUTHOR:"}</span>
                      <span className="text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-900/30">@{post.author_pseudo}</span>
                      {badgeMap[post.author_pseudo] && badgeMap[post.author_pseudo] !== "none" && (
                        <img src={TIER_IMG(badgeMap[post.author_pseudo])} alt={TIER_LABEL[badgeMap[post.author_pseudo]]} title={TIER_LABEL[badgeMap[post.author_pseudo]]} className="w-4 h-4 object-contain inline-block" />
                      )}
                    </div>

                    {editingId === post.id ? (
                      <div className="flex flex-col gap-2 mt-1">
                        <input type="text" value={editUrl} onChange={e => setEditUrl(e.target.value)}
                          className="bg-zinc-950 border border-cyan-500/40 rounded-lg px-3 py-2 text-sm font-mono text-white outline-none focus:border-cyan-400" />
                        <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2}
                          className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none focus:border-cyan-500 resize-none font-sans" />
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(post.id)} disabled={savingEdit || !editUrl.trim()}
                            className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs rounded-lg font-black uppercase tracking-wider transition-colors disabled:opacity-50">
                            {savingEdit ? "…" : (lang === "fr" ? "Enregistrer" : "Save")}
                          </button>
                          <button onClick={cancelEdit} className="px-4 py-1.5 border border-zinc-700 text-zinc-400 text-xs rounded-lg font-semibold hover:border-zinc-500 transition-colors">
                            {lang === "fr" ? "Annuler" : "Cancel"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <a href={post.url} target="_blank" rel="noopener noreferrer"
                          className="text-2xl md:text-3xl font-black text-white hover:text-cyan-400 transition-colors break-all tracking-tight block group">
                          <span className="text-cyan-500 inline-block transition-transform group-hover:translate-x-1 mr-1">🔗</span>
                          {post.url.replace(/^https?:\/\//i, "")}
                        </a>

                        {post.description && (
                          <p className="text-zinc-300 font-sans text-sm mt-4 leading-relaxed border-l-2 border-cyan-500/50 pl-4 bg-zinc-800/10 py-2 rounded-r-xl">
                            {post.description}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 ml-4 shrink-0">
                    {editingId !== post.id && userId === post.user_id && (
                      <button onClick={() => startEdit(post)} title={lang === "fr" ? "Modifier" : "Edit"}
                        className="text-zinc-600 hover:text-cyan-400 text-sm px-2 transition-colors">✏️</button>
                    )}
                    {(userRole === "admin" || userRole === "moderator") && (
                      <div className="relative">
                        <button onClick={() => setActiveMenuId(activeMenuId === post.id ? null : post.id)} className="text-zinc-600 hover:text-white font-bold text-lg px-2 transition-colors">⠇</button>
                        {activeMenuId === post.id && (
                          <div className="absolute right-0 mt-2 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1.5 z-30 text-[11px] font-mono text-zinc-400">
                            <button onClick={() => handleModAction("delete", post.author_pseudo, post.id, false)} className="w-full text-left px-3 py-2 text-red-400 hover:bg-zinc-800 transition-colors">✕ Supprimer l'audit</button>
                            <button onClick={() => handleModAction("mute_1d", post.author_pseudo, post.id, false)} className="w-full text-left px-3 py-2 hover:bg-zinc-800 transition-colors">🤫 Mute 24 heures</button>
                            <button onClick={() => handleModAction("ban", post.author_pseudo, post.id, false)} className="w-full text-left px-3 py-2 text-amber-500 hover:bg-zinc-800 transition-colors">💥 Bannir l'auteur</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* VISUALISATION DES IMAGES CLICQUABLES EN TEMPS RÉEL (SANS REDIRECTION) */}
                {post.images && post.images.length > 0 && (
                  <div className="px-6 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-900">
                    {post.images.map((img, i) => (
                      <div 
                        key={i} 
                        onClick={() => setActiveLightboxImage(img)}
                        className="aspect-video rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 block relative group shadow-lg cursor-zoom-in"
                      >
                        <img src={img} alt={`${post.url} — View ${i + 1}`} className="w-full h-full object-cover object-top group-hover:scale-102 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-transparent to-transparent opacity-60" />
                        <div className="absolute bottom-3 right-3 bg-cyan-500/20 backdrop-blur-md border border-cyan-500/30 rounded-xl px-3 py-1 font-mono text-[9px] text-cyan-400 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                          {lang === "fr" ? "GROSSIR L'IMAGE" : "ZOOM IMAGE"}
                        </div>
                        <div className="absolute top-3 left-3 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded px-2 py-0.5 font-mono text-[9px] text-zinc-400">
                          {lang === "fr" ? "Vue" : "View"} {i + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="px-6 pt-4 flex items-center">
                  <div className="text-[9px] font-mono font-bold tracking-widest text-zinc-500 bg-zinc-800/40 border border-zinc-800 rounded-md px-2.5 py-1 uppercase">
                    💬 {post.comments.length} {lang === "fr" ? (post.comments.length > 1 ? "critiques reçues" : "critique reçue") : (post.comments.length === 1 ? "review received" : "reviews received")}
                  </div>
                </div>

                {/* DOSSIER DE DISCUSSIONS CRITIQUES */}
                <div className="p-6 flex flex-col gap-5 bg-zinc-900 border-t border-zinc-800/60">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-500/60 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-cyan-500" />
                    <span>{lang === "fr" ? "Critiques" : "Reviews"}</span>
                  </div>
                  
                  {post.comments.length === 0 && (
                    <div className="text-center py-6 text-xs font-mono text-zinc-600 italic border border-dashed border-zinc-900 rounded-xl">
                      {lang === "fr" ? "[ En attente d'avis : critiquez l'accueil, les boutons de connexion et les performances ]" : "[ No critical logs found : evaluate landing, auth placement, or performance ]"}
                    </div>
                  )}

                  {/* LOGS INDIVIDUELS */}
                  <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
                    {post.comments.map(comment => (
                      <div key={comment.id} className="text-xs bg-zinc-800/20 border border-zinc-800/60 rounded-xl p-4 flex justify-between items-start relative transition-all hover:border-zinc-700">
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-mono text-[10px] text-cyan-400 font-bold flex items-center gap-1.5 mb-1">
                            @{comment.user_pseudo}
                            {badgeMap[comment.user_pseudo] && badgeMap[comment.user_pseudo] !== "none" && <img src={TIER_IMG(badgeMap[comment.user_pseudo])} alt={TIER_LABEL[badgeMap[comment.user_pseudo]]} title={TIER_LABEL[badgeMap[comment.user_pseudo]]} className="w-4 h-4 object-contain inline-block" />}
                          </span>
                          <p className="text-zinc-300 font-sans leading-relaxed break-words text-sm">{comment.text}</p>
                        </div>

                        {(userRole === "admin" || userRole === "moderator") && (
                          <div className="relative shrink-0 ml-3">
                            <button onClick={() => setActiveMenuId(activeMenuId === comment.id ? null : comment.id)} className="text-zinc-600 hover:text-white text-xs p-1 font-bold transition-colors">⠇</button>
                            {activeMenuId === comment.id && (
                              <div className="absolute right-0 mt-1 w-32 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 z-30 text-[10px] font-mono text-zinc-400">
                                <button onClick={() => handleModAction("delete", comment.user_pseudo, comment.id, true)} className="w-full text-left px-2.5 py-1.5 text-red-400 hover:bg-zinc-800 transition-colors">✕ Purger</button>
                                <button onClick={() => handleModAction("mute_1d", comment.user_pseudo, comment.id, true)} className="w-full text-left px-2.5 py-1.5 hover:bg-zinc-800 transition-colors">🤫 Mute 24h</button>
                                <button onClick={() => handleModAction("ban", comment.user_pseudo, comment.id, true)} className="w-full text-left px-2.5 py-1.5 text-amber-500 hover:bg-zinc-800 transition-colors">💥 Ban</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* SAISIE DE CRITIQUE RAPIDE */}
                  {commentErrors[post.id] && <p className="text-xs font-mono text-red-400">{commentErrors[post.id]}</p>}
                  
                  <div className="flex gap-2 pt-2">
                    <input type="text" disabled={!pseudo} value={commentInputs[post.id] || ""} onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter") handleAddComment(post.id); }}
                      placeholder={lang === "fr" ? "Analysez l'accueil, la conversion, l'emplacement de connexion, le design..." : "Analyse the landing layout, conversion flaws, auth placement, colors..."}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-100 outline-none focus:border-cyan-500/50 placeholder-zinc-600 transition-all font-sans" />
                    
                    <button onClick={() => handleAddComment(post.id)} 
                      className="px-5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono font-black text-xs rounded-xl uppercase tracking-wider transition-colors shrink-0 shadow-md">
                      {lang === "fr" ? "Injecter" : "Inject"}
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* POPUP AUTH — reste sur Audit après connexion */}
      {showAuthPopup && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAuthPopup(false)}>
          <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-zinc-800" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="text-3xl mb-2">🔐</div>
              <h3 className="font-bold text-base text-white">{lang === "fr" ? "Connexion" : "Sign in"}</h3>
              <p className="text-xs text-zinc-500 mt-1">{lang === "fr" ? "Nécessaire pour soumettre un site et discuter." : "Required to submit a site and chat."}</p>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              <button onClick={handleGoogle} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-zinc-700 bg-white text-sm font-semibold text-zinc-700 hover:border-zinc-500 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.18 2.18 5.94l3.66 2.84c.87-2.6 3.3-4.4 6.16-4.4z" fill="#EA4335"/></svg>
                Google
              </button>
              <button onClick={handleMicrosoft} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-zinc-950 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors">
                <svg width="16" height="16" viewBox="0 0 23 23" fill="none"><path d="M0 0H11V11H0V0Z" fill="#F25022"/><path d="M12 0H23V11H12V0Z" fill="#7FBA00"/><path d="M0 12H11V23H0V12Z" fill="#00A4EF"/><path d="M12 12H23V23H12V12Z" fill="#FFB900"/></svg>
                Microsoft
              </button>
            </div>
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-700"/></div>
              <div className="relative flex justify-center"><span className="bg-zinc-900 px-2 text-xs text-zinc-500">{lang === "fr" ? "ou par email" : "or by email"}</span></div>
            </div>
            <form onSubmit={handleEmailAuth} className="flex flex-col gap-2">
              <input type="email" placeholder={lang === "fr" ? "ton@email.com" : "your@email.com"} value={authEmail} onChange={e => setAuthEmail(e.target.value)} required
                className="w-full border border-zinc-700 rounded-lg px-3 py-2 text-sm bg-zinc-800 text-white outline-none focus:border-cyan-500" />
              <input type="password" placeholder="••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required
                className="w-full border border-zinc-700 rounded-lg px-3 py-2 text-sm bg-zinc-800 text-white outline-none focus:border-cyan-500" />
              {authError && <p className="text-xs text-red-400">{authError}</p>}
              {authSuccess && <p className="text-xs text-emerald-400">{authSuccess}</p>}
              <button type="submit" disabled={authLoading} className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                {authLoading ? "…" : authEmailMode === "signin" ? (lang === "fr" ? "Se connecter" : "Sign in") : (lang === "fr" ? "Créer un compte" : "Create account")}
              </button>
            </form>
            <button onClick={() => { setAuthEmailMode(m => m === "signin" ? "signup" : "signin"); setAuthError(null); setAuthSuccess(null); }}
              className="w-full mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2">
              {authEmailMode === "signin" ? (lang === "fr" ? "Pas de compte ? Créer" : "No account? Create one") : (lang === "fr" ? "Déjà un compte ?" : "Already have an account?")}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}