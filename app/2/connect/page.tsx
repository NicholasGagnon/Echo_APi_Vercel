"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

// --- LOGOS & ICONS ---
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

type Lang = "fr" | "en";

export default function ConnectPage() {
  const [lang, setLang] = useState<Lang>("fr");
  const fr = lang === "fr";

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
      } else {
        setUser(null);
        setActiveProvider(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── ROUTING SECURE DIRECTEMENT SUR /2/CONNECT ──
  const handleMicrosoftConnect = async () => {
    if (activeProvider === "azure") return;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: { redirectTo: `${window.location.origin}/2/connect`, scopes: "openid profile email User.Read" },
      });
      if (error) throw error;
    } catch (err: any) {
      showToast(err.message || "Authentication error", "error");
    }
  };

  const handleGoogleConnectNormal = async () => {
    if (activeProvider === "google") return;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/2/connect`, scopes: "openid profile email", queryParams: { prompt: "select_account" } },
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

  const handleEmailSignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSignUpError(null);
    setSignUpSuccess(null);
    if (!email.trim() || !password.trim()) {
      setSignUpError(fr ? "Veuillez entrer un courriel et un mot de passe" : "Please enter an email and password");
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/2/connect` },
    });
    if (error) {
      setSignUpError(error.message);
    } else {
      if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
        setSignUpError(fr ? "Un compte avec cet e-mail existe déjà." : "An account with this email already exists.");
        return;
      }
      setSignUpSuccess(fr ? "Inscription réussie ! Vérifiez votre boîte de réception." : "Registration success! Check your e-mail confirmation link.");
      showToast(fr ? "Lien envoyé !" : "Registration link transmitted!", "success");
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
      alert(fr ? "Mot de passe modifié avec succès !" : "Password modified successfully!");
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
      redirectTo: `${window.location.origin}/2/connect`,
    });
    if (error) {
      setSignInError(error.message);
    } else {
      setSignInSuccess(fr ? "Lien de réinitialisation envoyé avec succès !" : "Reset link dispatched successfully!");
      showToast(fr ? "Lien envoyé !" : "Reset link sent!", "success");
    }
  };

  const handleDeleteAccountData = async () => {
    if (!user) return;
    try {
      await supabase.from("profiles").delete().eq("id", user.id);
      await supabase.auth.signOut();
      setDeleteStage("purged");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveProvider(null);
    showToast(fr ? "Déconnexion sécurisée effectuée." : "Disconnected safely.", "info");
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
    <main className="h-screen bg-[#121214] text-zinc-300 flex flex-col overflow-hidden relative font-sans selection:bg-cyan-500/20">

      {/* TOAST */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`px-5 py-3 rounded-xl border text-xs font-medium tracking-wide shadow-2xl backdrop-blur-md flex items-center gap-3 ${
            toast.type === "success"
              ? "bg-[#0b0b0d] border-cyan-500/30 text-cyan-400"
              : toast.type === "error"
              ? "bg-[#0b0b0d] border-red-500/30 text-red-400"
              : "bg-[#0b0b0d] border-zinc-800 text-zinc-400"
          }`}>
            <span className={`w-2 h-2 rounded-full ${toast.type === "success" ? "bg-cyan-500" : "bg-zinc-600"}`} />
            {toast.message}
          </div>
        </div>
      )}

      {/* NAV UNIFIÉE AVEC LIGNE DARK ET LISERÉ CYAN */}
      <nav className="border-b border-zinc-800 bg-[#0b0b0d] px-6 h-14 flex items-center justify-between sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-6">
          <span className="font-mono text-xs font-bold text-cyan-500 tracking-wider">TALK_LAB</span>
          <div className="flex items-center gap-5 text-sm font-medium">
            <Link href="/2/talk" className="text-zinc-500 hover:text-zinc-200 transition-colors">Talk</Link>
            <Link href="/2/connect" className="text-cyan-400 font-semibold">Connexion</Link>
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

      {/* PANEL PRINCIPAL */}
      <section className="flex-1 flex flex-col items-center px-6 sm:px-12 py-12 overflow-y-auto bg-[#121214]">
        <div className="w-full max-w-5xl flex flex-col items-center flex-1">
          <div className="text-center mb-12 shrink-0 w-full max-w-md">
            <img src="/echo1.png" alt="Echo" className="w-10 h-10 rounded-xl mx-auto mb-4 object-cover" />
            <h1 className="text-xl font-semibold tracking-tight text-white mb-1.5">
              {fr ? "Espace Authentification" : "Authentication Space"}
            </h1>
            <p className="text-zinc-500 text-xs leading-relaxed">
              {fr
                ? "Connectez-vous pour configurer votre pseudo réseau et participer aux crash-tests."
                : "Sign in to configure your network alias and join the active crash-tests."}
            </p>

            {user?.email ? (
              <div className="mt-5 bg-zinc-950 border border-cyan-500/10 rounded-2xl p-3 inline-flex items-center gap-4 text-left shadow-xl">
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-mono">
                    {fr ? "Session active" : "Active session"}
                  </span>
                  <span className="text-cyan-400 text-xs font-semibold font-mono">{user.email}</span>
                </div>
                <div className="h-6 w-px bg-zinc-800" />
                <button onClick={handleSignOut} className="text-xs text-red-500 hover:text-red-400 font-bold transition-colors">
                  {fr ? "Déconnexion" : "Sign out"}
                </button>
              </div>
            ) : (
              <p className="text-amber-500 text-[11px] font-mono mt-4 bg-zinc-950 border border-zinc-900 rounded-xl py-1.5 px-3 inline-block">
                ⚠️ {fr ? "Aucune session active" : "No active session"}
              </p>
            )}
          </div>

          {/* GRILLE DES OPTIONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full shrink-0">
            <div className={`border rounded-xl p-6 text-center flex flex-col justify-between h-56 transition-all shadow-xl bg-zinc-950 ${
              activeProvider === "azure" ? "border-cyan-500/30" : "border-zinc-900 hover:border-zinc-800"
            }`}>
              <div className="mt-2">
                <MicrosoftLogo />
                <h2 className="text-xs font-semibold mt-4 text-zinc-300">Microsoft</h2>
              </div>
              <button onClick={handleMicrosoftConnect}
                className={`w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg transition-colors border border-zinc-800 ${
                  activeProvider === "azure" ? "opacity-30 cursor-default" : ""
                }`}>
                {activeProvider === "azure" ? `✓ ${fr ? "Connecté" : "Connected"}` : fr ? "Connexion" : "Sign In"}
              </button>
            </div>

            <div className={`border rounded-xl p-6 text-center flex flex-col justify-between h-56 transition-all shadow-xl bg-zinc-950 ${
              activeProvider === "google" ? "border-cyan-500/30" : "border-zinc-900 hover:border-zinc-800"
            }`}>
              <div className="mt-2">
                <GoogleLogo />
                <h2 className="text-xs font-semibold mt-4 text-zinc-300">Google</h2>
              </div>
              <button onClick={handleGoogleConnectNormal}
                className={`w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg transition-colors border border-zinc-800 ${
                  activeProvider === "google" ? "opacity-30 cursor-default" : ""
                }`}>
                {activeProvider === "google" ? `✓ ${fr ? "Connecté" : "Connected"}` : fr ? "Connexion" : "Sign In"}
              </button>
            </div>

            <div className={`border rounded-xl p-6 text-center flex flex-col justify-between h-56 transition-all shadow-xl bg-zinc-950 ${
              activeProvider === "email" ? "border-cyan-500/30" : "border-zinc-900 hover:border-zinc-800"
            }`}>
              <div className="mt-2">
                <MailIcon />
                <h2 className="text-xs font-semibold mt-4 text-zinc-300">{fr ? "Connexion E-mail" : "Email Login"}</h2>
              </div>
              <button onClick={() => { if (activeProvider !== "email") setShowSignInModal(true); }}
                className={`w-full py-2 text-xs font-medium rounded-lg transition-colors border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-white`}>
                {activeProvider === "email" ? `✓ ${fr ? "Connecté" : "Connected"}` : fr ? "Ouvrir" : "Open"}
              </button>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-xl p-6 text-center flex flex-col justify-between h-56 transition-all shadow-xl">
              <div className="mt-2">
                <UserPlusIcon />
                <h2 className="text-xs font-semibold mt-4 text-zinc-300">{fr ? "Créer un Compte" : "Create Account"}</h2>
              </div>
              <button disabled={activeProvider !== null} onClick={() => setShowSignUpModal(true)}
                className={`w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg border border-zinc-800 transition-colors ${
                  activeProvider !== null ? "opacity-20 cursor-not-allowed" : ""
                }`}>
                {activeProvider !== null ? (fr ? "Verrouillé" : "Locked") : (fr ? "S'inscrire" : "Sign Up")}
              </button>
            </div>
          </div>

          {/* LIEN RETOUR VERS LE TALK LAB */}
          {user && (
            <div className="mt-10 w-full border border-cyan-500/10 bg-zinc-950 p-5 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl">
              <div className="text-left">
                <h4 className="text-xs font-bold text-zinc-200">{fr ? "Prêt à participer" : "Ready to engage"}</h4>
                <p className="text-zinc-500 text-[11px] mt-0.5">{fr ? "Retournez sur le labo de crash-test pour configurer votre pseudo." : "Go back to the crash-test lab to complete your configuration."}</p>
              </div>
              <Link href="/2/talk" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-lg transition-colors shrink-0 text-center">
                {fr ? "Accéder au Talk Lab" : "Go to Talk Lab"}
              </Link>
            </div>
          )}

          {/* ZONE DANGER PURGE */}
          {user && (
            <div className="mt-6 w-full border border-red-500/10 bg-zinc-950 p-5 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl">
              <div className="text-center sm:text-left">
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-wide">⚠️ {fr ? "Supprimer les données" : "Delete profile data"}</h4>
                <p className="text-zinc-500 text-[11px] mt-0.5">{fr ? "Efface définitivement votre pseudo associé au projet 3." : "Permanently erase your nickname profile for project 3."}</p>
              </div>

              {deleteStage === "idle" && (
                <button onClick={() => setDeleteStage("confirm")} className="px-4 py-2 bg-red-950/40 hover:bg-red-900 text-red-400 font-medium text-xs rounded-lg border border-red-900/40 transition-colors">
                  {fr ? "Supprimer mes profils" : "Delete My Data"}
                </button>
              )}
              {deleteStage === "confirm" && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => setDeleteStage("final")} className="flex-1 sm:flex-none px-4 py-2 bg-amber-600 text-white font-bold text-xs rounded-lg uppercase animate-pulse">
                    {fr ? "Es-tu sûr ?" : "Are you sure?"}
                  </button>
                  <button onClick={() => setDeleteStage("idle")} className="px-3 py-2 bg-zinc-900 text-xs rounded-lg font-medium">
                    {fr ? "Annuler" : "Cancel"}
                  </button>
                </div>
              )}
              {deleteStage === "final" && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={handleDeleteAccountData} className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white font-black text-xs rounded-lg uppercase tracking-wider">
                    {fr ? "CONFIRMER EFFACEMENT" : "CONFIRM PURGE"}
                  </button>
                  <button onClick={() => setDeleteStage("idle")} className="px-3 py-2 bg-zinc-900 text-xs rounded-lg font-medium">
                    {fr ? "Annuler" : "Cancel"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* SIGN IN MODAL */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                <h2 className="text-sm font-semibold text-white">{fr ? "Connexion" : "Log in"}</h2>
                <button type="button" onClick={() => { setShowSignInModal(false); clearInputs(); }} className="text-zinc-500 hover:text-zinc-300 text-xs">✕</button>
              </div>
              {signInError && <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-3 text-[11px] text-red-400 font-mono">⚠️ {signInError}</div>}
              <input type="email" placeholder="email@domain.com" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#121214] border border-zinc-900 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-200" />
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#121214] border border-zinc-900 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-200" />
              <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-xl text-xs font-semibold tracking-wide transition-colors">
                {fr ? "Se connecter" : "Log in"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SIGN UP MODAL */}
      {showSignUpModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                <h2 className="text-sm font-semibold text-white">{fr ? "Créer un compte" : "Create account"}</h2>
                <button type="button" onClick={() => { setShowSignUpModal(false); clearInputs(); }} className="text-zinc-500 hover:text-zinc-300 text-xs">✕</button>
              </div>
              {signUpError && <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-3 text-[11px] text-red-400 font-mono">⚠️ {signUpError}</div>}
              {signUpSuccess && <div className="bg-cyan-950/20 border border-cyan-900/40 rounded-xl p-3 text-[11px] text-cyan-400 font-mono">✓ {signUpSuccess}</div>}
              <input type="email" placeholder="email@domain.com" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#121214] border border-zinc-900 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-200" />
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#121214] border border-zinc-900 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-200" />
              <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-xl text-xs font-semibold tracking-wide transition-colors">
                {fr ? "S'inscrire" : "Sign Up"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}