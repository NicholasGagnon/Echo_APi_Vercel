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
  const [newModUid, setNewModUid] = useState("");
  const [selectedRole, setSelectedRole] = useState<"moderator" | "admin">("moderator");
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
          setCurrentAdmin(profile?.username || "Admin Core");
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
      .select("id, username, role");
    if (data) setProfiles(data);
  };

  const handleAssignRole = async () => {
    const targetUid = newModUid.trim();
    setModError(null);
    if (!targetUid) return;

    if (userRole !== "admin") {
      alert("Droits insuffisants. Seuls les administrateurs peuvent nommer le staff.");
      return;
    }

    try {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", targetUid)
        .maybeSingle();

      if (existingProfile) {
        const { error } = await supabase
          .from("profiles")
          .update({ role: selectedRole })
          .eq("id", targetUid);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("profiles")
          .insert({
            id: targetUid,
            role: selectedRole,
            username: `Staff_${targetUid.substring(0, 5)}`
          });
        if (error) throw error;
      }

      alert(`Le rôle [${selectedRole.toUpperCase()}] a été attribué avec succès.`);
      setNewModUid("");
      await fetchProfiles();
    } catch (err) {
      console.error(err);
      setModError("Erreur d'attribution. Vérifiez la validité de l'UID.");
    }
  };

  const handleRevokeStaff = async (uid: string) => {
    if (userRole !== "admin") return;
    if (!confirm(`Retirer les droits du compte ayant l'UID ${uid} ?`)) return;
    const { error } = await supabase.from("profiles").update({ role: "user" }).eq("id", uid);
    if (!error) await fetchProfiles();
  };

  const applySanction = async (action: ModAction) => {
    const target = targetUser.trim();
    if (!target) return alert("Spécifiez un pseudo cible.");

    const targetProfile = profiles.find(p => p.username?.toLowerCase() === target.toLowerCase());

    if (targetProfile && targetProfile.role === "admin") {
      alert("Action refusée : Impossible de sanctionner un administrateur.");
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
      alert(`Sanction [${action}] appliquée sur @${target}`);
      setTargetUser("");
      setReason("");
    } else {
      alert("Erreur lors de l'envoi de la sanction.");
    }
  };

  if (loading) return (
    <main className="min-h-screen bg-[#08070a] flex items-center justify-center">
      <p className="text-xs font-mono text-zinc-500 tracking-widest animate-pulse">CHARGEMENT DE LA CONSOLE...</p>
    </main>
  );

  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-[#08070a] flex flex-col items-center justify-center p-4">
        <div className="bg-zinc-950 border border-red-500/20 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
          <span className="text-red-400 text-xs font-mono font-bold tracking-widest uppercase block mb-2">ACCÈS RESTREINT</span>
          <p className="text-zinc-500 text-xs">Votre compte ne possède pas les autorisations nécessaires.</p>
          <Link href="/1/hall" className="inline-block mt-5 text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-4 transition-colors">
            ← Retourner à l'accueil
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#08070a] text-zinc-300 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100%] h-[300px] bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />

      <nav className="border-b border-zinc-900/60 px-6 h-16 flex items-center justify-between bg-[#0f0f0f]/90 backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-6">
          <span className="font-bold text-sm tracking-wider text-white">Console de Contrôle</span>
          <div className="h-4 w-px bg-zinc-800" />
          <span className="text-xs text-zinc-500">
            Session : <strong className="text-cyan-400 font-mono font-normal">{currentAdmin} ({userRole})</strong>
          </span>
        </div>
        <Link href="/1/hall" className="text-xs text-zinc-400 hover:text-white transition-colors">
          Quitter la console →
        </Link>
      </nav>

      <div className="max-w-4xl w-full mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        {/* SECTION 1 : MODÉRATION */}
        <div className="bg-zinc-950/80 border border-zinc-900 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col gap-5">
          <div className="border-b border-zinc-900 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Sanctionner un profil</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">Appliquez des restrictions de parole ou des exclusions.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide">Pseudo du membre</label>
            <input
              type="text"
              placeholder="Ex: Nicolas"
              value={targetUser}
              onChange={e => setTargetUser(e.target.value)}
              className="bg-black/40 border border-zinc-900 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide">Raison du signalement</label>
            <input
              type="text"
              placeholder="Indiquez le motif précis..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="bg-black/40 border border-zinc-900 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={() => applySanction("mute_1d")} className="py-2.5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition-colors">Mute 1 Jour</button>
            <button onClick={() => applySanction("mute_1w")} className="py-2.5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition-colors">Mute 1 Semaine</button>
            <button onClick={() => applySanction("kick_1d")} className="py-2.5 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-semibold transition-colors">Kick 1 Jour</button>
            <button onClick={() => applySanction("kick_1w")} className="py-2.5 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-semibold transition-colors">Kick 1 Semaine</button>
          </div>

          <button onClick={() => applySanction("ban")} className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors mt-2">
            Bannissement Définitif
          </button>
        </div>

        {/* SECTION 2 : GESTION DU STAFF PAR UID */}
        <div className="bg-zinc-950/80 border border-zinc-900 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col gap-5">
          <div className="border-b border-zinc-900 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Équipe du site</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">Attribuez ou révoquez les privilèges grâce à l'UID Supabase.</p>
          </div>

          {userRole === "admin" && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide">Nommer via l'UID de l'utilisateur</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Copier l'UID Supabase ici..."
                  value={newModUid}
                  onChange={e => { setNewModUid(e.target.value); setModError(null); }}
                  className="flex-1 bg-black/40 border border-zinc-900 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
                
                <select 
                  value={selectedRole} 
                  onChange={e => setSelectedRole(e.target.value as "moderator" | "admin")}
                  className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-xl px-2 outline-none focus:border-cyan-500/50 transition-colors cursor-pointer"
                >
                  <option value="moderator">Modo</option>
                  <option value="admin">Admin</option>
                </select>

                <button onClick={handleAssignRole} className="px-4 bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs rounded-xl transition-colors">
                  Accorder
                </button>
              </div>
              {modError && <p className="text-[11px] text-red-400 bg-red-500/5 border border-red-500/20 rounded-xl px-3 py-2 mt-1">{modError}</p>}
            </div>
          )}

          <div className="flex flex-col gap-2 mt-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Membres du staff actifs :</span>
            
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {profiles.filter(p => p.role !== "user" && p.role !== null && p.role !== "").map(p => (
                <div key={p.id} className="flex justify-between items-center bg-black/30 p-3 rounded-xl border border-zinc-900/60">
                  <div className="flex flex-col gap-0.5 max-w-[70%]">
                    <span className="text-xs font-bold text-white">@{p.username || "Sans pseudo"}</span>
                    <span className="text-[9px] font-mono text-zinc-500 truncate" title={p.id}>ID: {p.id}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${p.role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'}`}>
                      {p.role.toUpperCase()}
                    </span>
                    {userRole === "admin" && (
                      <button onClick={() => handleRevokeStaff(p.id)} className="text-zinc-600 hover:text-red-400 transition-colors text-xs px-1">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}