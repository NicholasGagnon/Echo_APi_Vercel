"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type ModAction = "kick_1d" | "kick_1w" | "mute_1d" | "mute_1w" | "ban";

type ProfileRow = {
  id: string;
  username: string;
  role: string;
};

export default function AdminConsole() {
  const [currentAdmin, setCurrentAdmin] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [targetUser, setTargetUser] = useState("");
  const [newModUsername, setNewModUsername] = useState("");
  const [reason, setReason] = useState("");
  const [modError, setModError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (session.user.email === 'lafailleestouverte@gmail.com' || session.user.email === 'nicholas@echosai.ca') {
          setIsAuthorized(true);
          setUserRole("admin");
          setCurrentAdmin(profile?.username || "Finalsone");
          await fetchProfiles();
        } else if (profile && (profile.role === "admin" || profile.role === "moderator")) {
          setIsAuthorized(true);
          setUserRole(profile.role);
          setCurrentAdmin(profile.username);
          await fetchProfiles();
        }
      } catch (err) {
        console.error("Erreur auth admin:", err);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, role")
      .not("username", "is", null)
      .neq("username", "");
    if (data) setProfiles(data);
  };

  const cleanUsernameInput = (input: string) => {
    return input.trim().replace(/^@/, "");
  };

  // FIX: on ne crée plus jamais de faux profil avec un UUID inventé
  // (gen_random_uuid_local générait des IDs invalides non liés à un vrai
  // compte auth.users, ce qui cassait la contrainte FK / créait des lignes
  // fantômes impossibles à connecter). On peut seulement PROMOUVOIR un
  // profil qui existe déjà — c-à-d une personne qui s'est déjà connectée
  // au moins une fois sur le site.
  const handleAddModerator = async () => {
    const target = cleanUsernameInput(newModUsername);
    setModError(null);
    if (!target) return;

    if (userRole !== "admin") {
      alert("Droits insuffisants. Seuls les administrateurs peuvent nommer le staff.");
      return;
    }

    try {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", target)
        .maybeSingle();

      if (!existingProfile) {
        setModError(
          `@${target} n'a pas de compte existant. La personne doit d'abord se connecter au moins une fois (via /1/account ou /1/talk) avant de pouvoir être promue.`
        );
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ role: "moderator" })
        .eq("username", target);
      if (error) throw error;

      alert(`@${target} est maintenant modérateur.`);
      setNewModUsername("");
      await fetchProfiles();
    } catch (err) {
      console.error(err);
      setModError("Erreur lors de l'attribution du rôle.");
    }
  };

  const handleRevokeModerator = async (username: string) => {
    if (userRole !== "admin") return;
    if (!confirm(`Retirer les droits de modération de @${username} ?`)) return;
    const { error } = await supabase.from("profiles").update({ role: "user" }).eq("username", username);
    if (!error) await fetchProfiles();
  };

  const applySanction = async (action: ModAction) => {
    const target = cleanUsernameInput(targetUser);
    if (!target) return alert("Spécifie un pseudo cible.");

    const targetProfile = profiles.find(p => p.username?.toLowerCase() === target.toLowerCase());

    if (targetProfile && targetProfile.role === "admin") {
      alert("Action refusée : Impossible de sanctionner un administrateur du système.");
      return;
    }

    let expiresAt: Date | null = new Date();
    if (action === "kick_1d" || action === "mute_1d") expiresAt.setDate(expiresAt.getDate() + 1);
    else if (action === "kick_1w" || action === "mute_1w") expiresAt.setDate(expiresAt.getDate() + 7);
    else if (action === "ban") expiresAt = null;

    const { error } = await supabase.from("moderation_logs").insert({
      target_username: target,
      action_type: action,
      reason: reason.trim() || "Non spécifiée",
      expires_at: expiresAt ? expiresAt.toISOString() : null,
    });

    if (!error) {
      alert(`Sanction [${action}] appliquée avec succès sur @${target}`);
      setTargetUser("");
      setReason("");
    } else {
      alert("Erreur lors de l'envoi de la sanction.");
    }
  };

  if (loading) return (
    <main className="min-h-screen bg-white dark:bg-[#0f0f0f] flex items-center justify-center">
      <p className="text-xs font-mono text-zinc-400">CHARGEMENT...</p>
    </main>
  );

  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-white dark:bg-[#0f0f0f] flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-950 border border-red-500/30 rounded-xl p-6 max-w-sm w-full text-center shadow-sm">
          <span className="text-red-500 dark:text-red-400 text-xs font-mono font-bold tracking-widest uppercase">ACCÈS_INTERDIT</span>
          <p className="text-zinc-500 dark:text-zinc-500 text-xs mt-2">Droits de modération insuffisants.</p>
          <Link href="/1/hall" className="inline-block mt-4 text-xs text-cyan-600 dark:text-cyan-400 underline underline-offset-2">
            ← Retour au hall
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-[#0f0f0f] text-zinc-900 dark:text-zinc-100 font-sans">
      {/* NAV réservée — pas dans les 8 onglets publics, juste un retour rapide */}
      <nav className="border-b border-zinc-100 dark:border-zinc-800/60 px-6 h-14 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-sm z-50">
        <div className="flex items-center gap-6">
          <span className="font-mono text-xs font-bold text-red-500 dark:text-red-400 tracking-wider">TALK_ADMIN_PANEL</span>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/1/talk" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">← Talk</Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <span className="text-zinc-500 dark:text-zinc-400">Admin: <strong className="text-cyan-600 dark:text-cyan-400 font-mono">@{currentAdmin} ({userRole})</strong></span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl w-full mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* RESTRICTIONS */}
        <div className="bg-white dark:bg-zinc-950 border border-cyan-500/20 dark:border-cyan-500/10 rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-900 pb-2">Appliquer une restriction</h2>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-zinc-500 uppercase">Pseudo de la cible</label>
            <input
              type="text"
              placeholder="ex: Finalsone"
              value={targetUser}
              onChange={e => setTargetUser(e.target.value)}
              className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-900 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-red-500/40"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-zinc-500 uppercase">Motif</label>
            <input
              type="text"
              placeholder="Motif du rapport..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-900 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={() => applySanction("mute_1d")} className="py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium transition-colors">🤫 Mute 1 Jour</button>
            <button onClick={() => applySanction("mute_1w")} className="py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium transition-colors">🤫 Mute 1 Semaine</button>
            <button onClick={() => applySanction("kick_1d")} className="py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 border border-amber-300 dark:border-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-medium transition-colors">🥾 Kick 1 Jour</button>
            <button onClick={() => applySanction("kick_1w")} className="py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 border border-amber-300 dark:border-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-medium transition-colors">🥾 Kick 1 Semaine</button>
          </div>

          <button onClick={() => applySanction("ban")} className="w-full py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 border border-red-300 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold transition-colors mt-2">
            💥 Bannissement Définitif (BAN)
          </button>
        </div>

        {/* STAFF */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-900 pb-2">Gestion de l'équipe (Staff)</h2>

          {userRole === "admin" && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Pseudo à promouvoir..."
                  value={newModUsername}
                  onChange={e => { setNewModUsername(e.target.value); setModError(null); }}
                  className="flex-1 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-900 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-cyan-500"
                />
                <button onClick={handleAddModerator} className="px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-lg transition-colors">
                  Ajouter Modo
                </button>
              </div>
              {modError && (
                <p className="text-[11px] text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-lg px-3 py-2">
                  ⚠️ {modError}
                </p>
              )}
              <p className="text-[10px] text-zinc-400 dark:text-zinc-600">
                La personne doit s'être déjà connectée au moins une fois (compte existant) pour pouvoir être promue.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 mt-2 max-h-56 overflow-y-auto">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Membres actuels :</span>
            {profiles.filter(p => p.role !== "user").map(p => (
              <div key={p.id} className="flex justify-between items-center bg-zinc-50 dark:bg-[#121214] p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-900">
                <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">@{p.username}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded tracking-wide font-bold ${p.role === 'admin' ? 'bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20' : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'}`}>
                    {p.role.toUpperCase()}
                  </span>
                  {userRole === "admin" && p.role === "moderator" && (
                    <button onClick={() => handleRevokeModerator(p.username)} className="text-[10px] text-zinc-400 hover:text-red-500 transition-colors">✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}