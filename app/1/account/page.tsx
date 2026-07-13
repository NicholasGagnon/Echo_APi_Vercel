"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

type Lang = "fr" | "en";

// Nav gérée directement dans le rendu (modèle Hall à 2 zones)

// --- LOGOS ---
const MicrosoftLogo = () => (
  <svg className="w-8 h-8 mx-auto" viewBox="0 0 23 23" fill="none">
    <path d="M0 0H11V11H0V0Z" fill="#F25022"/>
    <path d="M12 0H23V11H12V0Z" fill="#7FBA00"/>
    <path d="M0 12H11V23H0V12Z" fill="#00A4EF"/>
    <path d="M12 12H23V23H12V12Z" fill="#FFB900"/>
  </svg>
);
const GoogleLogo = () => (
  <svg className="w-8 h-8 mx-auto" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 2.18 2.18 4.94l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);
const MailIcon = () => (
  <svg className="w-8 h-8 mx-auto text-zinc-400 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
  </svg>
);
const UserPlusIcon = () => (
  <svg className="w-8 h-8 mx-auto text-zinc-400 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0zM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
  </svg>
);

export default function AccountPage() {
  const [lang, setLang] = useState<Lang>("fr");
  const fr = lang === "fr";
  const [pseudo, setPseudo] = useState<string>("");
  const [pseudoInput, setPseudoInput] = useState<string>("");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const [deleteStage, setDeleteStage] = useState<"idle" | "confirm" | "final" | "purged">("idle");

  const [user, setUser] = useState<any>(null);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const [signInError, setSignInError] = useState<string | null>(null);
  const [signInSuccess, setSignInSuccess] = useState<string | null>(null);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendEmail, setResendEmail] = useState("");

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setActiveProvider(session.user.app_metadata?.provider || "email");
        loadProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveringPassword(true);
        setShowSignInModal(false);
        setShowSignUpModal(false);
      }
      if (session?.user) {
        setUser(session.user);
        setActiveProvider(session.user.app_metadata?.provider || "email");
        loadProfile(session.user.id);
      } else {
        setUser(null);
        setActiveProvider(null);
        setPseudo("");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("username").eq("id", uid).maybeSingle();
    setPseudo(data?.username || "");
  };
  const savePseudo = async () => {
    const clean = pseudoInput.trim();
    if (!clean || !user) return;
    await supabase.from("profiles").upsert({ id: user.id, username: clean, updated_at: new Date().toISOString() });
    setPseudo(clean);
    showToast(fr ? "Pseudo enregistré." : "Nickname saved.", "success");
  };

  const handleMicrosoftConnect = async () => {
    if (activeProvider === "azure") return;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: { redirectTo: `${window.location.origin}/1/account`, scopes: "openid profile email User.Read" },
      });
      if (error) throw error;
    } catch (err: any) {
      showToast(err.message || "Authentication error", "error");
    }
  };

  const handleGoogleConnect = async () => {
    if (activeProvider === "google") return;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/1/account`, scopes: "openid profile email", queryParams: { prompt: "select_account" } },
      });
      if (error) throw error;
    } catch (err: any) {
      showToast(err.message || "Authentication error", "error");
    }
  };

  const handleEmailSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSignInError(null);
    setSignInSuccess(null);
    if (!email.trim() || !password.trim()) {
      setSignInError(fr ? "Veuillez entrer vos identifiants" : "Please enter your credentials");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setSignInError(error.message);
    } else {
      showToast(fr ? "Connexion réussie" : "Logged in successfully", "success");
      setShowSignInModal(false);
      clearInputs();
    }
  };

  const startResendCountdown = () => {
    setResendCountdown(30);
    const interval = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleEmailSignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSignUpError(null);
    setSignUpSuccess(null);
    if (!email.trim() || !password.trim()) {
      setSignUpError(fr ? "Veuillez entrer un courriel et un mot de passe" : "Please enter an email and password");
      return;
    }
    const trimmedEmail = email.trim();
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: { emailRedirectTo: `${window.location.origin}/1/account` },
    });
    if (error) {
      if (error.message.includes("rate") || (error as any).status === 429) {
        setSignUpError(fr ? "Trop de tentatives. Attendez 60 secondes." : "Too many attempts. Wait 60 seconds.");
      } else if (error.message.includes("already") || error.message.includes("registered")) {
        setSignUpError(fr ? "Un compte avec ce courriel existe déjà. Connectez-vous." : "An account with this email already exists. Sign in instead.");
      } else {
        setSignUpError(error.message);
      }
    } else {
      if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
        setSignUpError(fr ? "Un compte avec ce courriel existe déjà." : "An account with this email already exists.");
        return;
      }
      setResendEmail(trimmedEmail);
      setSignUpSuccess(fr ? "Lien envoyé ! Vérifiez votre boîte de réception." : "Link sent! Check your inbox.");
      showToast(fr ? "Lien envoyé !" : "Registration link sent!", "success");
      startResendCountdown();
    }
  };

  const handleResendEmail = async () => {
    if (resendCountdown > 0 || !resendEmail) return;
    setSignUpError(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: resendEmail,
      options: { emailRedirectTo: `${window.location.origin}/1/account` },
    });
    if (error) {
      setSignUpError(error.message);
    } else {
      showToast(fr ? "Lien renvoyé !" : "Link resent!", "success");
      startResendCountdown();
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    if (!newPassword.trim() || newPassword.length < 6) {
      setRecoveryError(fr ? "Le mot de passe doit faire au moins 6 caractères." : "Password must be at least 6 characters.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword.trim() });
    if (error) {
      setRecoveryError(error.message);
    } else {
      showToast(fr ? "Mot de passe modifié avec succès !" : "Password modified successfully!", "success");
      setIsRecoveringPassword(false);
      setNewPassword("");
    }
  };

  const handleForgotPassword = async () => {
    setSignInError(null);
    setSignInSuccess(null);
    if (!email.trim()) {
      setSignInError(fr ? "Veuillez entrer votre courriel d'abord." : "Please enter your email address first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/1/account`,
    });
    if (error) {
      setSignInError(error.message);
    } else {
      setSignInSuccess(fr ? "Lien de réinitialisation envoyé !" : "Reset link sent!");
      showToast(fr ? "Lien envoyé !" : "Reset link sent!", "success");
    }
  };

  const handleDeleteAccountData = async () => {
    if (!user) return;
    try {
      await supabase.from("fiches").delete().eq("user_id", user.id);
      await supabase.from("interets_fiches").delete().eq("user_id", user.id);
      await supabase.from("talk_posts").delete().eq("user_id", user.id);
      await supabase.from("talk_comments").delete().eq("user_id", user.id);
      await supabase.from("profiles").delete().eq("id", user.id);
      await supabase.auth.signOut();
      setDeleteStage("purged");
    } catch (err: any) {
      showToast(`${fr ? "Erreur" : "Error"}: ${err.message}`, "error");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveProvider(null);
    showToast(fr ? "Déconnexion effectuée." : "Disconnected.", "info");
  };

  const clearInputs = () => {
    setEmail("");
    setPassword("");
    setSignInError(null);
    setSignInSuccess(null);
    setSignUpError(null);
    setSignUpSuccess(null);
  };

  return (
    <main className="min-h-screen bg-white dark:bg-[#0f0f0f] text-zinc-900 dark:text-zinc-100 font-sans">

      {/* TOAST */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`px-5 py-3 rounded-xl border text-xs font-medium tracking-wide shadow-2xl backdrop-blur-md flex items-center gap-3 ${
            toast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-500 text-emerald-700 dark:text-emerald-400"
              : toast.type === "error"
              ? "bg-red-50 dark:bg-red-950/80 border-red-300 dark:border-red-500 text-red-700 dark:text-red-400"
              : "bg-zinc-100 dark:bg-zinc-900/90 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
          }`}>
            <span className={`w-2 h-2 rounded-full ${toast.type === "success" ? "bg-emerald-500" : toast.type === "error" ? "bg-red-500" : "bg-zinc-400"}`} />
            {toast.message}
          </div>
        </div>
      )}

      {/* NAV — modèle Hall à 2 zones */}
      <nav className="border-b border-zinc-100 dark:border-zinc-800/60 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-sm z-50 gap-4">
        {/* ZONE 1 — logo + onglets */}
        <div className="flex items-center gap-5 flex-wrap">
          <Link href="/1/hall" className="font-bold text-sm text-zinc-800 dark:text-zinc-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Echo AI</Link>
          <div className="flex items-center gap-5 text-sm flex-wrap">
            <Link href="/1/hall" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{fr ? "Accueil" : "Home"}</Link>
            <Link href="/1/dashboard" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{fr ? "Tous les outils" : "All tools"}</Link>
            <Link href="/1/conversation" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">Conversation</Link>
            <Link href="/1/form" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{fr ? "Créer un projet" : "Create project"}</Link>
            <Link href="/1/fiche" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{fr ? "Explorer les projets" : "Explore projects"}</Link>
            <Link href="/1/talk" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{fr ? "Avis de la communauté" : "Community feedback"}</Link>
            <Link href="/1/audit" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{fr ? "Audition de site web" : "Website audit"}</Link>
            <Link href="/idea" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{fr ? "Avis de l'IA" : "AI feedback"}</Link>
            <Link href="/1/account" className="text-cyan-600 dark:text-cyan-400 font-semibold">{fr ? "Mon compte" : "My account"}</Link>
          </div>
        </div>

        {/* SÉPARATEUR + ZONE 2 — Bureau (premium) + langue + pseudo */}
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800" />

          <div className="relative group">
            <button onClick={() => { /* TODO: activer + ouvrir popup d'avantages une fois le premium prêt */ }}
              className="flex items-center gap-1.5 bg-amber-500/5 border border-amber-500/25 rounded-lg px-3 py-1.5 cursor-not-allowed opacity-65">
              <span className="text-xs">🔒</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-500 whitespace-nowrap">{fr ? "Mon Bureau" : "My Desk"}</span>
            </button>
            <div className="absolute top-full right-0 mt-1.5 bg-zinc-900 border border-zinc-700 rounded-md px-2.5 py-1 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              {fr ? "🚧 En construction" : "🚧 Under construction"}
            </div>
          </div>

          <div className="relative">
            <button onClick={() => setShowLangMenu(v => !v)}
              className="text-xs text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 rounded-lg hover:border-zinc-400 transition-colors font-bold">
              {fr ? "FR" : "EN"}
            </button>
            {showLangMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                <div className="absolute top-full right-0 mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 min-w-28 overflow-hidden">
                  {(["fr","en"] as Lang[]).map(l => (
                    <button key={l} onClick={() => { setLang(l); setShowLangMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-xs ${lang === l ? "bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 font-bold" : "text-zinc-600 dark:text-zinc-400"}`}>
                      {l === "fr" ? "Français" : "English"}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {user ? (
            <div className="relative">
              <button onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">{pseudo || (fr ? "Choisir un pseudo" : "Choose nickname")}</span>
              </button>
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute top-full right-0 mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 min-w-52 p-3">
                    <div className="text-[10px] text-zinc-400 mb-2 break-all">{user.email}</div>
                    <div className="flex flex-col gap-2 mb-2">
                      <input type="text" value={pseudoInput} onChange={e => setPseudoInput(e.target.value.replace(/[^a-zA-Z0-9_\s-]/g, ""))}
                        placeholder={pseudo || (fr ? "Nouveau pseudo" : "New nickname")}
                        className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-cyan-500" />
                      <button onClick={savePseudo} className="bg-cyan-600 text-white text-xs font-bold rounded-lg py-1.5">{fr ? "Valider" : "Save"}</button>
                    </div>
                    <button onClick={handleSignOut} className="w-full text-left text-xs text-red-500 hover:text-red-400 py-1">
                      ↩ {fr ? "Se déconnecter" : "Sign out"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button onClick={() => setShowSignInModal(true)}
              className="bg-cyan-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg hover:bg-cyan-500 transition-colors">
              {fr ? "Se connecter" : "Sign in"}
            </button>
          )}
        </div>
      </nav>

      {/* MAIN PANEL */}
      <section className="flex flex-col items-center px-6 sm:px-12 py-12">
        <div className="w-full max-w-5xl flex flex-col items-center">
          <div className="text-center mb-12 w-full max-w-md">
            <img src="/echo1.png" alt="Echo" className="w-10 h-10 rounded-xl mx-auto mb-4 object-cover" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-1.5">
              {fr ? "Mon Compte" : "My Account"}
            </h1>
            <p className="text-zinc-500 text-xs tracking-wide">
              {fr
                ? "Connecte-toi pour créer ta fiche, publier sur Talk et débloquer des contacts."
                : "Log in to create your listing, post on Talk, and unlock contacts."}
            </p>

            {user?.email ? (
              <div className="mt-5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-3 inline-flex items-center gap-4 text-left shadow-sm animate-in fade-in duration-300">
                <div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block uppercase tracking-wider font-mono">
                    {fr ? "Session active" : "Active session"}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold font-mono">{user.email}</span>
                  {pseudo && <span className="text-cyan-600 dark:text-cyan-400 text-xs font-semibold font-mono block">@{pseudo}</span>}
                </div>
                <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />
                <button onClick={handleSignOut} className="text-xs text-red-500 hover:text-red-600 font-bold transition-colors">
                  {fr ? "Se déconnecter" : "Sign out"}
                </button>
              </div>
            ) : (
              <p className="text-amber-600 dark:text-amber-500 text-xs font-semibold mt-4 bg-amber-500/5 border border-amber-200 dark:border-amber-500/10 rounded-xl py-1.5 px-3 inline-block">
                ⚠️ {fr ? "Aucune session active — connecte-toi ci-dessous" : "No active session — sign in below"}
              </p>
            )}
          </div>

          {/* GATEWAY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {/* MICROSOFT */}
            <div className={`border rounded-2xl p-6 text-center flex flex-col justify-between h-56 transition-all shadow-sm ${
              activeProvider === "azure"
                ? "border-emerald-500 bg-emerald-50/10 dark:bg-zinc-900/50"
                : "bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-800"
            }`}>
              <div className="mt-4">
                <MicrosoftLogo />
                <h2 className="text-sm font-bold mt-4 text-zinc-800 dark:text-zinc-300">Microsoft</h2>
              </div>
              <button onClick={handleMicrosoftConnect}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeProvider === "azure" ? "bg-emerald-600 text-white cursor-default" : "bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950"
                }`}>
                {activeProvider === "azure" ? `✓ ${fr ? "Connecté" : "Connected"}` : (fr ? "Connexion" : "Connect")}
              </button>
            </div>

            {/* GOOGLE */}
            <div className={`border rounded-2xl p-6 text-center flex flex-col justify-between h-56 transition-all shadow-sm ${
              activeProvider === "google"
                ? "border-emerald-500 bg-emerald-50/10 dark:bg-zinc-900/50"
                : "bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-800"
            }`}>
              <div className="mt-4">
                <GoogleLogo />
                <h2 className="text-sm font-bold mt-4 text-zinc-800 dark:text-zinc-300">Google</h2>
              </div>
              <button onClick={handleGoogleConnect}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeProvider === "google" ? "bg-emerald-600 text-white cursor-default" : "bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950"
                }`}>
                {activeProvider === "google" ? `✓ ${fr ? "Connecté" : "Connected"}` : (fr ? "Connexion" : "Connect")}
              </button>
            </div>

            {/* EMAIL */}
            <div className={`border rounded-2xl p-6 text-center flex flex-col justify-between h-56 transition-all shadow-sm ${
              activeProvider === "email"
                ? "border-emerald-500 bg-emerald-50/10 dark:bg-zinc-900/50"
                : "bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-800"
            }`}>
              <div className="mt-4">
                <MailIcon />
                <h2 className="text-sm font-bold mt-4 text-zinc-800 dark:text-zinc-300">{fr ? "Connexion e-mail" : "Sign in via email"}</h2>
              </div>
              <button onClick={() => { if (activeProvider !== "email") setShowSignInModal(true); }}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeProvider === "email" ? "bg-emerald-600 text-white cursor-default" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                }`}>
                {activeProvider === "email" ? `✓ ${fr ? "Connecté" : "Connected"}` : (fr ? "Ouvrir" : "Open")}
              </button>
            </div>

            {/* CREATE ACCOUNT */}
            <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-800 rounded-2xl p-6 text-center flex flex-col justify-between h-56 transition-all shadow-sm">
              <div className="mt-4">
                <UserPlusIcon />
                <h2 className="text-sm font-bold mt-4 text-zinc-800 dark:text-zinc-300">{fr ? "Créer un compte" : "Create Account"}</h2>
              </div>
              <button disabled={activeProvider !== null} onClick={() => setShowSignUpModal(true)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeProvider !== null ? "bg-zinc-200 dark:bg-zinc-950 text-zinc-400 dark:text-zinc-700 cursor-not-allowed" : "bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950"
                }`}>
                {activeProvider !== null ? (fr ? "Verrouillé" : "Locked") : (fr ? "S'inscrire" : "Sign Up")}
              </button>
            </div>
          </div>

          {/* RACCOURCIS */}
          {user && (
            <div className="mt-10 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{fr ? "Gérer ta fiche" : "Manage your listing"}</h4>
                  <p className="text-zinc-500 text-xs mt-0.5">{fr ? "Crée ou consulte ta fiche projet." : "Create or view your project listing."}</p>
                </div>
                <Link href="/1/fiche" className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-xs rounded-xl uppercase tracking-wider transition-all shrink-0 text-center hover:bg-zinc-700 dark:hover:bg-zinc-200">
                  {fr ? "Voir les fiches" : "View listings"}
                </Link>
              </div>
              <div className="border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Talk</h4>
                  <p className="text-zinc-500 text-xs mt-0.5">{fr ? "Partage un pitch, obtiens des retours." : "Share a pitch, get feedback."}</p>
                </div>
                <Link href="/1/talk" className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-xl uppercase tracking-wider transition-all shrink-0 text-center">
                  {fr ? "Aller sur Talk" : "Go to Talk"}
                </Link>
              </div>
            </div>
          )}

          {/* PURGE DES DONNÉES */}
          {user && (
            <div className="mt-6 w-full border border-red-500/30 bg-red-500/[0.02] p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm animate-in fade-in duration-200">
              <div className="text-center sm:text-left">
                <h4 className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">
                  ⚠️ {fr ? "Supprimer mes données" : "Delete my data"}
                </h4>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {fr ? "Supprime définitivement ton compte, tes fiches et tes posts Talk." : "Permanently delete your account, listings, and Talk posts."}
                </p>
              </div>

              {deleteStage === "idle" && (
                <button onClick={() => setDeleteStage("confirm")}
                  className="px-5 py-2.5 bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white border border-red-500/40 font-bold text-xs rounded-xl uppercase tracking-wider transition-all shrink-0 w-full sm:w-auto">
                  {fr ? "Supprimer mon compte" : "Delete My Account"}
                </button>
              )}
              {deleteStage === "confirm" && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => setDeleteStage("final")} className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-600 text-white font-bold text-xs rounded-xl uppercase animate-pulse">
                    {fr ? "Es-tu sûr ?" : "Are you sure?"}
                  </button>
                  <button onClick={() => setDeleteStage("idle")} className="px-3 py-2.5 bg-zinc-200 dark:bg-zinc-800 text-xs rounded-xl font-medium">
                    {fr ? "Annuler" : "Cancel"}
                  </button>
                </div>
              )}
              {deleteStage === "final" && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={handleDeleteAccountData} className="flex-1 sm:flex-none px-4 py-2.5 bg-red-600 text-white font-black text-xs rounded-xl uppercase tracking-widest">
                    💥 {fr ? "CONFIRMER LA PURGE" : "CONFIRM PURGE"}
                  </button>
                  <button onClick={() => setDeleteStage("idle")} className="px-3 py-2.5 bg-zinc-200 dark:bg-zinc-800 text-xs rounded-xl font-medium">
                    {fr ? "Annuler" : "Cancel"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <footer className="w-full shrink-0 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/40 px-6 py-10 mt-12">
          <div className="max-w-5xl mx-auto text-center text-[10px] text-zinc-400 dark:text-zinc-600">
            © 2026 Echo AI Ecosystem (echosai.ca). All rights reserved.
          </div>
        </footer>
      </section>

      {/* RECOVERY MODAL */}
      {isRecoveringPassword && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[9999] p-6 backdrop-blur-md animate-in fade-in duration-300">
          <form onSubmit={handleUpdatePassword} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="border-b border-zinc-200 dark:border-zinc-900 pb-3">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{fr ? "Nouveau mot de passe" : "Reset password"}</h2>
            </div>
            {recoveryError && <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/50 rounded-xl p-3 text-xs text-red-600 dark:text-red-400">⚠️ {recoveryError}</div>}
            <input type="password" placeholder="Minimum 6 caractères" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-500" autoFocus />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-3 rounded-xl text-xs font-bold uppercase tracking-wider">
                {fr ? "Enregistrer" : "Save"}
              </button>
              <button type="button" onClick={() => setIsRecoveringPassword(false)} className="px-4 py-3 bg-zinc-100 dark:bg-zinc-900 text-xs rounded-xl font-semibold text-zinc-500">
                {fr ? "Annuler" : "Cancel"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SIGN IN MODAL */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 max-w-xl w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <form onSubmit={handleEmailSignIn} className="space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-900 pb-4">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{fr ? "Connexion" : "Log in"}</h2>
                <button type="button" onClick={() => { setShowSignInModal(false); clearInputs(); }} className="text-zinc-400 hover:text-black dark:hover:text-white text-sm p-2">✕</button>
              </div>
              {signInError && <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/50 rounded-xl p-3 text-xs text-red-600 dark:text-red-400">⚠️ {signInError}</div>}
              {signInSuccess && <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-600 dark:text-emerald-400">✓ {signInSuccess}</div>}
              <div className="space-y-4">
                <input type="email" placeholder="name@domain.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-500" />
                <input type="password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-500" />
                <button onClick={handleForgotPassword} type="button" className="w-full py-3 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                  {fr ? "Mot de passe oublié ?" : "Forgot password?"}
                </button>
              </div>
              <button type="submit" className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider">
                {fr ? "Se connecter" : "Log in"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SIGN UP MODAL */}
      {showSignUpModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 max-w-xl w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <form onSubmit={handleEmailSignUp} className="space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-900 pb-4">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{fr ? "Créer un compte" : "Create account"}</h2>
                <button type="button" onClick={() => { setShowSignUpModal(false); clearInputs(); }} className="text-zinc-400 hover:text-black dark:hover:text-white text-sm p-2">✕</button>
              </div>
              {signUpError && <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/50 rounded-xl p-3 text-xs text-red-600 dark:text-red-400">⚠️ {signUpError}</div>}
              {signUpSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-600 dark:text-emerald-400 space-y-2">
                  <p>✓ {signUpSuccess}</p>
                  <button type="button" onClick={handleResendEmail} disabled={resendCountdown > 0}
                    className="w-full py-2 rounded-lg text-xs font-bold transition-all border disabled:opacity-50 disabled:cursor-not-allowed border-emerald-400 dark:border-emerald-600 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                    {resendCountdown > 0
                      ? (fr ? `Renvoyer dans ${resendCountdown}s` : `Resend in ${resendCountdown}s`)
                      : (fr ? "↺ Renvoyer le lien" : "↺ Resend link")}
                  </button>
                </div>
              )}
              <div className="space-y-4">
                <input type="email" placeholder="name@domain.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-500" />
                <div>
                  <input type="password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-500" />
                  <p className="text-zinc-400 text-[10px] mt-1.5">{fr ? "Minimum 6 caractères." : "Minimum 6 characters."}</p>
                </div>
              </div>
              <button type="submit" className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider">
                {fr ? "Créer mon compte" : "Create my account"}
              </button>
              <p className="text-center text-zinc-400 text-[10px]">
                {fr ? "Déjà un compte ? " : "Already have an account? "}
                <button type="button" onClick={() => { setShowSignUpModal(false); setShowSignInModal(true); clearInputs(); }} className="text-zinc-700 dark:text-zinc-300 underline">
                  {fr ? "Se connecter" : "Sign in"}
                </button>
              </p>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP COMPTE SUPPRIMÉ */}
      {deleteStage === "purged" && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[10000] p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-50 dark:bg-zinc-950 border-2 border-red-500/50 rounded-3xl p-8 max-w-md w-full text-center relative shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <img src="/echo1.png" alt="Echo" className="w-8 h-8 rounded-lg object-cover mx-auto" />
            <p className="text-red-600 dark:text-red-400 text-sm font-bold">
              {fr ? "Toutes tes données ont été supprimées." : "All your data has been deleted."}
            </p>
            <button onClick={() => setDeleteStage("idle")} className="w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-bold rounded-xl">
              ✕ {fr ? "Fermer" : "Close"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}