"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../../context/AppContext";
import LangDropdown from "../components/LangDropdown";
import ContactModal from "../components/ContactModal";

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

const extractProviderTokenFromHash = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const hash = window.location.hash.substring(1);
    if (!hash) return null;
    return new URLSearchParams(hash).get("provider_token") ?? null;
  } catch {
    return null;
  }
};

const clearHash = () => {
  if (typeof window !== "undefined") {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
};

export default function AccountPage() {
  const { t, lang, userTier, setUserTier } = useApp();
  const fr = lang === "fr";
  
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showGoogleSyncPopup, setShowGoogleSyncPopup] = useState(false);
  const [activeContactModal, setActiveContactModal] = useState<"support" | "contact" | null>(null);
  const [showTreasureModal, setShowTreasureModal] = useState(false);
  const [isLoadingTreasure, setIsLoadingTreasure] = useState(false);

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

  const saveGoogleTokenToDB = async (uid: string, token: string, currentTier: string, refreshToken?: string | null) => {
    await supabase.from("user_tokens").upsert(
      {
        id: uid,
        google_access_token: token,
        google_refresh_token: refreshToken ?? null,
        user_tier: currentTier, 
        last_request_date: new Date().toISOString().split("T")[0],
      },
      { onConflict: "id" }
    );
    localStorage.setItem(`echo-google-token-${uid}`, token);
  };

  useEffect(() => {
    const resolveAndSaveToken = async (session: any) => {
      if (!session?.user) return;
      const uid = session.user.id;
      let activeTier = "connected_free";

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_tier")
          .eq("id", uid)
          .single();

        if (profile?.user_tier) {
          const cleaned = profile.user_tier.toLowerCase().trim();
          activeTier = cleaned === "free" ? "connected_free" : cleaned;
          setUserTier(activeTier as any);
          localStorage.setItem("echo-user-tier", activeTier);
        }
      } catch (err) {
        console.error("[SUPABASE PROFILE ERROR]", err);
      }

      const hashToken = extractProviderTokenFromHash();
      if (hashToken) {
        clearHash();
        await saveGoogleTokenToDB(uid, hashToken, activeTier, session.provider_refresh_token);
        return;
      }

      if (session.provider_token) {
        await saveGoogleTokenToDB(uid, session.provider_token, activeTier, session.provider_refresh_token);
        return;
      }

      const legacyToken = localStorage.getItem("echo-google-token");
      if (legacyToken) {
        await saveGoogleTokenToDB(uid, legacyToken, activeTier);
        localStorage.removeItem("echo-google-token");
      }
    };

    const redeemPendingTreasure = async (u: { id: string; email?: string | null }) => {
      if (!localStorage.getItem("echo-treasure-redirect")) return;
      localStorage.removeItem("echo-treasure-redirect");
      try {
        setIsLoadingTreasure(true);
        const response = await fetch("/api/stripe/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "treasure", userId: u.id, userEmail: u.email }),
        });
        const data = await response.json();
        if (response.ok && data.url) window.location.href = data.url;
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingTreasure(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setActiveProvider(session.user.app_metadata?.provider || "email");
        resolveAndSaveToken(session);
        redeemPendingTreasure(session.user);
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
        resolveAndSaveToken(session);
        redeemPendingTreasure(session.user);
      } else {
        setUser(null);
        setActiveProvider(null);
        setUserTier("connected_free");
        localStorage.setItem("echo-user-tier", "connected_free");
      }
    });

    return () => subscription.unsubscribe();
  }, [setUserTier]);

  const handleMicrosoftConnect = async () => {
    if (activeProvider === "azure") return;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo: `${window.location.origin}/account`,
          scopes: "openid profile email User.Read",
        },
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
        options: {
          redirectTo: `${window.location.origin}/account`,
          scopes: "openid profile email",
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      showToast(err.message || "Authentication error", "error");
    }
  };

  const handleGoogleConnectWithSyncNewTab = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/account`,
          scopes: "openid profile email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      showToast(err.message || "Authentication error", "error");
    }
  };

  const handleEmailSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSignInError(null);
    setSignInSuccess(null);
    if (!email.trim() || !password.trim()) {
      setSignInError(lang === "fr" ? "Veuillez entrer vos identifiants" : "Please enter your credentials");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setSignInError(error.message);
    } else {
      showToast(lang === "fr" ? "Connexion réussie" : "Logged in successfully", "success");
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
      setSignUpError(lang === "fr" ? "Veuillez entrer un courriel et un mot de passe" : "Please enter an email and password");
      return;
    }
    const trimmedEmail = email.trim();
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: { emailRedirectTo: `${window.location.origin}/account` },
    });
    if (error) {
      // Erreur 400 OTP = email déjà utilisé ou rate limit
      if (error.message.includes("rate") || error.status === 429) {
        setSignUpError(lang === "fr" ? "Trop de tentatives. Attendez 60 secondes." : "Too many attempts. Wait 60 seconds.");
      } else if (error.message.includes("already") || error.message.includes("registered")) {
        setSignUpError(lang === "fr" ? "Un compte avec cet e-mail existe déjà. Connectez-vous." : "An account with this email already exists. Sign in instead.");
      } else {
        setSignUpError(error.message);
      }
    } else {
      if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
        setSignUpError(lang === "fr" ? "Un compte avec cet e-mail existe déjà." : "An account with this email already exists.");
        return;
      }
      setResendEmail(trimmedEmail);
      setSignUpSuccess(lang === "fr" ? "Lien envoyé ! Vérifiez votre boîte de réception." : "Link sent! Check your inbox.");
      showToast(lang === "fr" ? "Lien envoyé !" : "Registration link sent!", "success");
      startResendCountdown();
    }
  };

  const handleResendEmail = async () => {
    if (resendCountdown > 0 || !resendEmail) return;
    setSignUpError(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: resendEmail,
      options: { emailRedirectTo: `${window.location.origin}/account` },
    });
    if (error) {
      setSignUpError(error.message);
    } else {
      showToast(lang === "fr" ? "Lien renvoyé !" : "Link resent!", "success");
      startResendCountdown();
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    if (!newPassword.trim() || newPassword.length < 6) {
      setRecoveryError(lang === "fr" ? "Le mot de passe doit faire au moins 6 caractères." : "Password must be at least 6 characters.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword.trim() });
    if (error) {
      setRecoveryError(error.message);
    } else {
      alert(lang === "fr" ? "Mot de passe modifié avec succès !" : "Password modified successfully!");
      setIsRecoveringPassword(false);
      setNewPassword("");
    }
  };

  const handleForgotPassword = async () => {
    setSignInError(null);
    setSignInSuccess(null);
    if (!email.trim()) {
      setSignInError(lang === "fr" ? "Veuillez entrer votre courriel d'abord." : "Please enter your email address first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/account`,
    });
    if (error) {
      setSignInError(error.message);
    } else {
      setSignInSuccess(lang === "fr" ? "Lien de réinitialisation envoyé avec succès !" : "Reset link dispatched successfully!");
      showToast(lang === "fr" ? "Lien envoyé !" : "Reset link sent!", "success");
    }
  };

  const handleDeleteAccountData = async () => {
    if (!user) return;
    try {
      await supabase.from("user_tokens").delete().eq("id", user.id);
      await supabase.from("profiles").delete().eq("id", user.id);
      await supabase.auth.signOut();
      setDeleteStage("purged");
    } catch (err: any) {
      alert(`Error during data purge: ${err.message}`);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveProvider(null);
    setUserTier("connected_free");
    showToast(lang === "fr" ? "Déconnexion sécurisée effectuée." : "Disconnected safely.", "info");
  };

  // TUNNEL DE CAPTURE ET REDIRECTION EN AMONT POUR S'ASSURER QUE STRIPE REÇOIVE L'ID DE SESSION APRÈS AUTH
  const handleTreasureCheckout = async () => {
    if (!user) {
      localStorage.setItem("echo-treasure-redirect", "1");
      setShowTreasureModal(false);
      setShowSignInModal(true);
      return;
    }
    try {
      setIsLoadingTreasure(true);
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "treasure", userId: user.id, userEmail: user.email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Checkout error");
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setIsLoadingTreasure(false);
    }
  };

  const clearInputs = () => {
    setEmail("");
    setPassword("");
    setSignInError(null);
    setSignInSuccess(null);
    setSignUpError(null);
    setSignUpSuccess(null);
  };

  const handleSupportClick = () => {
    if (!userTier || userTier === "connected_free") {
      showToast(
        lang === "fr"
          ? "🔒 Le support est réservé aux plans Basic, Premium, Ultra et Fondateur."
          : "🔒 Support is reserved for Basic, Premium, Ultra, and Founder plans.",
        "info"
      );
      return;
    }
    setActiveContactModal("support");
  };

  return (
    <main className="h-screen bg-white dark:bg-black text-black dark:text-white flex overflow-hidden relative font-sans transition-colors duration-200 selection:bg-cyan-500/30">

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
            <span className={`w-2 h-2 rounded-full ${toast.type === "success" ? "bg-emerald-500" : "bg-zinc-400"}`} />
            {toast.message}
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* SIDEBAR */}
        <aside className="w-55 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-8 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between">
          <div className="space-y-20">
            <h2 className="font-bold text-lg">
              <Link href="/" className="hover:text-cyan-500 dark:hover:text-cyan-400">{t.sidebar.home}</Link>
            </h2>
            <div className="space-y-20 text-zinc-800 dark:text-zinc-100 font-medium">
              <Link href="/chat" className="block hover:text-cyan-500">{t.sidebar.chat}</Link>
              <Link href="/books" className="block hover:text-cyan-500">{t.sidebar.books}</Link>
              <Link href="/calendar" className="block hover:text-cyan-500">📅 {lang === "fr" ? "Calendrier" : "Calendar"}</Link>
              <Link href="/vitality" className="block hover:text-cyan-500">📈 {lang === "fr" ? "Vitalité" : "Vitality"}</Link>
              <Link href="/services" className="block hover:text-cyan-500">💎 {lang === "fr" ? "Services" : "Services"}</Link>
              <Link href="/account" className="block text-cyan-600 dark:text-cyan-400 font-bold">👤 {lang === "fr" ? "Compte" : "Account"}</Link>
              <Link href="/horizonweb" className="block hover:text-cyan-500">📡 HorizonWeb</Link>
              <hr className="border-zinc-200 dark:border-zinc-800 my-4" />
              <Link href="/history" className="block hover:text-amber-500">⭐ {lang === "fr" ? "Historique" : "History"}</Link>
            </div>
          </div>
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
            Status : <span className="text-cyan-500 dark:text-cyan-400 uppercase font-bold block">{!userTier || userTier === "connected_free" ? (lang === "fr" ? "Accès libre" : "FreeConnect") : userTier}</span>
          </div>
        </aside>

        {/* MAIN PANEL */}
        <section className="flex-1 flex flex-col items-center px-6 sm:px-12 py-12 overflow-y-auto bg-white dark:bg-gradient-to-b dark:from-zinc-950 dark:via-black dark:to-black transition-colors duration-200 justify-between">
          <div className="w-full max-w-5xl flex flex-col items-center flex-1">
            <div className="text-center mb-12 shrink-0 w-full max-w-md">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-500 font-mono text-sm shadow-sm">
                idx
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-1.5">
                {lang === "fr" ? "Passerelle de Compte" : "Account Gateway"}
              </h1>
              <p className="text-zinc-500 text-xs tracking-wide">
                {lang === "fr"
                  ? "Orchestrez et synchronisez vos paramètres d'identité au sein de l'écosystème sécurisé."
                  : "Orchestrate and sync identity parameters within the secure ecosystem."}
              </p>

              {user?.email ? (
                <div className="mt-5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-3 inline-flex items-center gap-4 text-left shadow-sm animate-in fade-in duration-300">
                  <div>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block uppercase tracking-wider font-mono">
                      {lang === "fr" ? "Session Authentifiée" : "Authenticated Session"}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold font-mono">{user.email}</span>
                  </div>
                  <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />
                  <button onClick={handleSignOut} className="text-xs text-red-500 hover:text-red-600 font-bold transition-colors">
                    {lang === "fr" ? "Se Déconnecter" : "Sign Out"}
                  </button>
                </div>
              ) : (
                <p className="text-amber-600 dark:text-amber-500 text-xs font-semibold mt-4 bg-amber-500/5 border border-amber-200 dark:border-amber-500/10 rounded-xl py-1.5 px-3 inline-block">
                  ⚠️ {lang === "fr" ? "Aucune session active — Connectez-vous ci-dessous" : "No active session — Connect below"}
                </p>
              )}
            </div>

            {/* GATEWAY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full shrink-0">
              {/* MICROSOFT */}
              <div className={`border rounded-2xl p-6 text-center flex flex-col justify-between h-64 transition-all shadow-sm ${
                activeProvider === "azure"
                  ? "border-emerald-500 bg-emerald-50/10 dark:bg-zinc-900/50 shadow-lg"
                  : "bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-800"
              }`}>
                <div className="mt-4">
                  <MicrosoftLogo />
                  <h2 className="text-sm font-bold mt-4 tracking-wide text-zinc-800 dark:text-zinc-300">Microsoft</h2>
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">Outlook & Directories</p>
                </div>
                <button
                  onClick={handleMicrosoftConnect}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                    activeProvider === "azure"
                      ? "bg-emerald-600 text-white cursor-default"
                      : "bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950"
                  }`}
                >
                  {activeProvider === "azure" ? `✓ ${lang === "fr" ? "Connecté" : "Connected"}` : "Connexion"}
                </button>
              </div>

              {/* GOOGLE CLASSIQUE */}
              <div className={`border rounded-2xl p-6 text-center flex flex-col justify-between h-64 transition-all shadow-sm ${
                activeProvider === "google"
                  ? "border-emerald-500 bg-emerald-50/10 dark:bg-zinc-900/50 shadow-lg"
                  : "bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-800"
              }`}>
                <div className="mt-4">
                  <GoogleLogo />
                  <h2 className="text-sm font-bold mt-4 tracking-wide text-zinc-800 dark:text-zinc-300">Google</h2>
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">Identity & Secure Nodes</p>
                </div>
                <button
                  onClick={handleGoogleConnectNormal}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                    activeProvider === "google"
                      ? "bg-emerald-600 text-white cursor-default"
                      : "bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950"
                  }`}
                >
                  {activeProvider === "google" ? `✓ ${lang === "fr" ? "Connecté" : "Connected"}` : "Connexion"}
                </button>
              </div>

              {/* EMAIL SIGN IN */}
              <div className={`border rounded-2xl p-6 text-center flex flex-col justify-between h-64 transition-all shadow-sm ${
                activeProvider === "email"
                  ? "border-emerald-500 bg-emerald-50/10 dark:bg-zinc-900/50 shadow-lg"
                  : "bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-800"
              }`}>
                <div className="mt-4">
                  <MailIcon />
                  <h2 className="text-sm font-bold mt-4 tracking-wide text-zinc-800 dark:text-zinc-300">
                    {lang === "fr" ? "Connexion E-mail" : "Sign in Email"}
                  </h2>
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">Access Existing Token</p>
                </div>
                <button
                  onClick={() => { if (activeProvider !== "email") setShowSignInModal(true); }}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                    activeProvider === "email"
                      ? "bg-emerald-600 text-white cursor-default"
                      : "bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  {activeProvider === "email" ? `✓ ${lang === "fr" ? "Connecté" : "Connected"}` : (lang === "fr" ? "Ouvrir la Session" : "Open Sign In")}
                </button>
              </div>

              {/* CREATE ACCOUNT */}
              <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-800 rounded-2xl p-6 text-center flex flex-col justify-between h-64 transition-all shadow-sm">
                <div className="mt-4">
                  <UserPlusIcon />
                  <h2 className="text-sm font-bold mt-4 tracking-wide text-zinc-800 dark:text-zinc-300">
                    {lang === "fr" ? "Créer un Compte" : "Create Account"}
                  </h2>
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">Initialize New Profile</p>
                </div>
                <button
                  disabled={activeProvider !== null}
                  onClick={() => setShowSignUpModal(true)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                    activeProvider !== null
                      ? "bg-zinc-200 dark:bg-zinc-950 text-zinc-400 dark:text-zinc-700 border border-zinc-300 dark:border-zinc-900 cursor-not-allowed shadow-inner"
                      : "bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950"
                  }`}
                >
                  {activeProvider !== null ? (lang === "fr" ? "Session Verrouillée" : "Session Locked") : (lang === "fr" ? "S'inscrire" : "Open Sign Up")}
                </button>
              </div>
            </div>

            {/* BANDEROLE DE SYNCHRONISATION AGENDA GOOGLE */}
            <div className="mt-10 w-full border border-dashed border-cyan-500/30 bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900 shadow-sm">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shadow-inner shrink-0 mx-auto sm:mx-0">
                  <GoogleLogo />
                </div>
                <div>
                  <h4 className="text-sm font-black font-mono tracking-wide text-zinc-900 dark:text-zinc-100">Here For Google Connection With calendar Synch</h4>
                  <p className="text-zinc-500 text-xs mt-0.5">{lang === "fr" ? "Configurez les passerelles d'autorisations pour l'agent de liaison." : "Configure high-tier auth bridges for the core cloud connection."}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowGoogleSyncPopup(true)}
                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 font-mono text-xs font-bold rounded-xl text-white uppercase tracking-wider transition-all shadow-md shrink-0 w-full sm:w-auto text-center"
              >
                {lang === "fr" ? "Synchronisation Google Calendar" : "Google Calendar Synchronisation"}
              </button>
            </div>

            {/* SECTION DE PURGE DES DONNÉES */}
            {user && (
              <div className="mt-6 w-full border border-red-500/30 bg-red-500/[0.02] p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm animate-in fade-in duration-200">
                <div className="text-center sm:text-left">
                  <h4 className="text-sm font-bold text-red-600 dark:text-red-400 font-mono uppercase tracking-wide">
                    ⚠️ {lang === "fr" ? "Zone de Suppression des Données" : "Data Deletion Node"}
                  </h4>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {lang === "fr" 
                      ? "Conformément aux protocoles de sécurité, purgez définitivement votre compte, vos jetons cloud et vos configurations." 
                      : "In compliance with platform guidelines, permanently delete your identity token rows and all sync cache."}
                  </p>
                </div>

                {deleteStage === "idle" && (
                  <button 
                    onClick={() => setDeleteStage("confirm")} 
                    className="px-5 py-2.5 bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white border border-red-500/40 font-bold text-xs rounded-xl uppercase tracking-wider transition-all shadow-sm shrink-0 w-full sm:w-auto text-center"
                  >
                    {lang === "fr" ? "Supprimer mon compte" : "Delete My Account"}
                  </button>
                )}

                {deleteStage === "confirm" && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => setDeleteStage("final")} 
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-600 text-white font-bold text-xs rounded-xl uppercase tracking-wider transition-all animate-pulse"
                    >
                      {lang === "fr" ? "Êtes-vous sûr ?" : "Are you sure?"}
                    </button>
                    <button onClick={() => setDeleteStage("idle")} className="px-3 py-2.5 bg-zinc-200 dark:bg-zinc-800 text-xs rounded-xl font-medium">
                      {lang === "fr" ? "Annuler" : "Cancel"}
                    </button>
                  </div>
                )}

                {deleteStage === "final" && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={handleDeleteAccountData} 
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-red-600 text-white font-black text-xs rounded-xl uppercase tracking-widest transition-all"
                    >
                      💥 {lang === "fr" ? "CONFIRMER LA PURGE TOTALE" : "CONFIRM TOTAL PURGE"}
                    </button>
                    <button onClick={() => setDeleteStage("idle")} className="px-3 py-2.5 bg-zinc-200 dark:bg-zinc-800 text-xs rounded-xl font-medium">
                      {lang === "fr" ? "Annuler" : "Cancel"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PROTOCOLE ARCHITECTURE */}
            <div className="mt-6 w-full border border-cyan-500/20 bg-cyan-50/5 dark:bg-cyan-950/5 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left shadow-inner mb-16">
              <div className="space-y-1">
                <h4 className="text-xs font-bold font-mono tracking-widest text-cyan-600 dark:text-cyan-400 uppercase">🛡️ Agentic Architecture Protocol</h4>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed max-w-2xl">
                  Please ensure a persistent passport node link is fully bound. An active profile session is strictly required to route automated background actions into your personal calendar stack and tracking matrix grid.
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-center sm:items-end font-mono">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-600 uppercase tracking-widest block">System Build</span>
                <span className="text-sm font-extrabold text-cyan-600 dark:text-cyan-400 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]">v10.1.10</span>
              </div>
            </div>
          </div>

          {/* GRAND FOOTER */}
          <footer className="w-full shrink-0 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/40 backdrop-blur-md px-6 py-10 mt-12">
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
              <div className="space-y-3">
                <h5 className="font-bold font-mono text-xs uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  {lang === "fr" ? "🔗 Conformité & Conditions" : "🔗 Legal & Compliance"}
                </h5>
                <ul className="space-y-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  <li>
                    <a href="https://echosai.ca/terms" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-500 transition-colors">
                      {lang === "fr" ? "➔ Conditions d'Utilisation (Terms)" : "➔ Terms of Service"}
                    </a>
                  </li>
                  <li>
                    <a href="https://echosai.ca/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-500 transition-colors">
                      {lang === "fr" ? "➔ Politique de Confidentialité (Privacy)" : "➔ Privacy Policy"}
                    </a>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h5 className="font-bold font-mono text-xs uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  {lang === "fr" ? "👥 Entreprise & Réseaux" : "👥 Corporate Ecosystem"}
                </h5>
                <ul className="space-y-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  <li>
                    <a href="https://www.facebook.com/EchoAgentic" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-500 transition-colors flex items-center gap-1.5">
                      <span>📘 Facebook :</span> <span className="text-zinc-400 font-mono">@EchoAgentic</span>
                    </a>
                  </li>
                  <li>
                    <a href="https://www.tiktok.com/@lafailleestouverte?lang=fr" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-500 transition-colors flex items-center gap-1.5">
                      <span>🎵 TikTok :</span> <span className="text-zinc-400 font-mono">@lafailleestouverte</span>
                    </a>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h5 className="font-bold font-mono text-xs uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  {lang === "fr" ? "✉️ Canaux de Contact" : "✉️ Connection Desks"}
                </h5>
                <ul className="space-y-2 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                  <li>
                    <button type="button" onClick={handleSupportClick} className="text-left">
                      <span className="font-sans font-semibold text-zinc-700 dark:text-zinc-300">Support: </span>
                      <span className="text-cyan-600 dark:text-cyan-400 hover:underline">support@echosai.ca</span>
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => setActiveContactModal("contact")} className="text-left">
                      <span className="font-sans font-semibold text-zinc-700 dark:text-zinc-300">General: </span>
                      <span className="text-cyan-600 dark:text-cyan-400 hover:underline">contact@echosai.ca</span>
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            <div className="max-w-5xl mx-auto border-t border-zinc-200 dark:border-zinc-900 mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-600 gap-2">
              <div>© 2026 Echo AI Ecosystem (echosai.ca). All rights reserved.</div>
              <div className="font-mono tracking-widest uppercase">Secured Identity Gateway Dashboard</div>
            </div>
          </footer>

          {/* L'ESPACEUR GÉANT 1 */}
          <div className="shrink-0 w-full h-[1400px] flex items-end justify-center pb-10 px-4">
            <p className="text-zinc-300 dark:text-zinc-800 text-[10px] font-mono uppercase tracking-widest text-center select-none">
              {lang === "fr" ? "... continue de descendre ..." : "... keep scrolling down ..."}
            </p>
          </div>

          {/* L'ESPACEUR GÉANT 2 */}
          <div className="shrink-0 w-full h-[2200px] flex items-end justify-center pb-10 px-4">
            <p className="text-zinc-400 dark:text-zinc-700 text-[10px] font-mono uppercase tracking-widest text-center select-none">
              {lang === "fr" ? "... continue de descendre ..." : "... keep scrolling down ..."}
            </p>
          </div>

          {/* LE TERMINUS DES TRÉSORS */}
          <div className="shrink-0 w-full flex flex-col items-center justify-center pt-20 pb-32 gap-6">
            <p className="text-zinc-500 dark:text-zinc-700 text-[10px] font-mono uppercase tracking-widest text-center select-none">
              ✦ MATRIX TERMINUS REACHED ✦
            </p>
            
            <button 
              type="button"
              onClick={() => setShowTreasureModal(true)}
              className="w-24 h-12 opacity-5 hover:opacity-20 cursor-pointer select-none text-[16px] transition-all duration-200 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.1)]"
              title="..."
            >
              💎
            </button>
          </div>

        </section>
      </div>

      {/* ── MODALS CONTACT / SUPPORT ── */}
      {activeContactModal && (
        <ContactModal
          type={activeContactModal}
          lang={lang}
          onClose={() => setActiveContactModal(null)}
        />
      )}

      {/* RECOVERY MODAL */}
      {isRecoveringPassword && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[9999] p-6 backdrop-blur-md animate-in fade-in duration-300">
          <form onSubmit={handleUpdatePassword} className="bg-white dark:bg-zinc-950 border-2 border-cyan-400 dark:border-cyan-500 rounded-3xl p-8 max-w-md w-full shadow-[0_0_40px_rgba(6,182,212,0.4)] space-y-5 animate-in zoom-in-95 duration-200">
            <div className="border-b border-zinc-200 dark:border-zinc-900 pb-3">
              <h2 className="text-base font-mono uppercase tracking-widest text-cyan-500 font-black">🛠️ {lang === "fr" ? "Mise à Jour Sécurisée" : "Reset Access Token"}</h2>
              <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">{lang === "fr" ? "Veuillez définir votre nouvelle clé de sécurité d'accès." : "Please define your new secure operational password profile key."}</p>
            </div>
            {recoveryError && <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/50 rounded-xl p-3 text-xs text-red-600 dark:text-red-400 font-mono">⚠️ {recoveryError}</div>}
            <div>
              <label className="text-[11px] uppercase font-mono tracking-wider text-zinc-500 block mb-1.5 font-bold">{lang === "fr" ? "Nouveau Mot de Passe" : "New Password Key"}</label>
              <input 
                type="password" 
                placeholder="Minimum 6 caractères" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 focus:outline-none focus:border-cyan-500 shadow-inner" 
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-500 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md">
                {lang === "fr" ? "Enregistrer" : "Save New Key"}
              </button>
              <button type="button" onClick={() => setIsRecoveringPassword(false)} className="px-4 py-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs rounded-xl font-semibold text-zinc-500">
                {lang === "fr" ? "Annuler" : "Cancel"}
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
                <div>
                  <h2 className="text-base font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-bold">🛸 {lang === "fr" ? "Accès Écosystème" : "Account Access"}</h2>
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">{lang === "fr" ? "Entrez vos paramètres d'authentification pour synchroniser votre profil." : "Input your authorized encryption parameters to sync your profile."}</p>
                </div>
                <button type="button" onClick={() => { setShowSignInModal(false); clearInputs(); }} className="text-zinc-400 hover:text-black dark:hover:text-white font-mono text-sm p-2 transition-colors">✕</button>
              </div>
              {signInError && <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/50 rounded-xl p-3 text-xs text-red-600 dark:text-red-400 font-mono">⚠️ {signInError}</div>}
              {signInSuccess && <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-600 dark:text-emerald-400 font-mono">✓ {signInSuccess}</div>}
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] uppercase font-mono tracking-wider text-zinc-500 block mb-1.5 font-bold">{lang === "fr" ? "Adresse Courriel" : "Identity Node (Email)"}</label>
                  <input type="email" placeholder="name@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner" />
                </div>
                <div>
                  <label className="text-[11px] uppercase font-mono tracking-wider text-zinc-500 block mb-1.5 font-bold">{lang === "fr" ? "Mot de Passe" : "Access Token (Password)"}</label>
                  <input type="password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner" />
                </div>
                <button onClick={handleForgotPassword} type="button" className="w-full py-3 rounded-xl text-xs font-mono font-bold border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/50 bg-zinc-50 dark:bg-zinc-900/30 transition-all shadow-sm">{lang === "fr" ? "Mot de passe oublié ? Réinitialiser" : "Forgot password? Reset access link"}</button>
              </div>
              <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md">{lang === "fr" ? "Se connecter à votre compte" : "Login to your account"}</button>
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
                <div>
                  <h2 className="text-base font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-bold">🛸 {lang === "fr" ? "Créer un Profil" : "Initialize Profile"}</h2>
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">{lang === "fr" ? "Initialisez votre nœud d'identité dans l'écosystème Echo." : "Initialize your identity node within the Echo ecosystem."}</p>
                </div>
                <button type="button" onClick={() => { setShowSignUpModal(false); clearInputs(); }} className="text-zinc-400 hover:text-black dark:hover:text-white font-mono text-sm p-2 transition-colors">✕</button>
              </div>
              {signUpError && <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/50 rounded-xl p-3 text-xs text-red-600 dark:text-red-400 font-mono">⚠️ {signUpError}</div>}
              {signUpSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-600 dark:text-emerald-400 font-mono space-y-2">
                  <p>✓ {signUpSuccess}</p>
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={resendCountdown > 0}
                    className="w-full py-2 rounded-lg text-xs font-mono font-bold transition-all border"
                    style={{
                      opacity: resendCountdown > 0 ? 0.5 : 1,
                      cursor: resendCountdown > 0 ? "not-allowed" : "pointer",
                      borderColor: resendCountdown > 0 ? "#10b98140" : "#10b981",
                      color: resendCountdown > 0 ? "#6ee7b7" : "#10b981",
                      background: "transparent",
                    }}
                  >
                    {resendCountdown > 0
                      ? (lang === "fr" ? `Renvoyer dans ${resendCountdown}s` : `Resend in ${resendCountdown}s`)
                      : (lang === "fr" ? "↺ Renvoyer le lien" : "↺ Resend link")}
                  </button>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] uppercase font-mono tracking-wider text-zinc-500 block mb-1.5 font-bold">{lang === "fr" ? "Adresse Courriel" : "Identity Node (Email)"}</label>
                  <input type="email" placeholder="name@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner" />
                </div>
                <div>
                  <label className="text-[11px] uppercase font-mono tracking-wider text-zinc-500 block mb-1.5 font-bold">{lang === "fr" ? "Mot de Passe" : "Access Token (Password)"}</label>
                  <input type="password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner" />
                  <p className="text-zinc-400 dark:text-zinc-600 text-[10px] mt-1.5 font-mono">{lang === "fr" ? "Minimum 6 caractères requis." : "Minimum 6 characters required."}</p>
                </div>
              </div>
              <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md">{lang === "fr" ? "Créer mon compte" : "Create my account"}</button>
              <p className="text-center text-zinc-400 dark:text-zinc-600 text-[10px] font-mono">
                {lang === "fr" ? "Déjà un compte ? " : "Already have an account? "}
                <button type="button" onClick={() => { setShowSignUpModal(false); setShowSignInModal(true); clearInputs(); }} className="text-cyan-500 hover:text-cyan-400 underline transition-colors">
                  {lang === "fr" ? "Se connecter" : "Sign in"}
                </button>
              </p>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP GOOGLE CALENDAR GUIDANCE */}
      {showGoogleSyncPopup && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 sm:p-6 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowGoogleSyncPopup(false)}>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-10 max-w-4xl w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-900 pb-4">
              <div className="flex items-center gap-3">
                <GoogleLogo />
                <div>
                  <h2 className="text-base sm:text-lg font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-black">
                    {lang === "fr" ? "Passerelle d'Autorisation Google Calendar Stack" : "Google Calendar Stack Authorization Bridge"}
                  </h2>
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-0.5 font-medium">
                    {lang === "fr" ? "Protocole d'intégration et de liaison de l'infrastructure" : "Infrastructure integration and synchronization tracking track"}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowGoogleSyncPopup(false)} className="text-zinc-400 hover:text-black dark:hover:text-white font-mono text-sm p-2 transition-colors">✕</button>
            </div>

            <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 space-y-5 leading-relaxed font-semibold">
              {lang === "fr" ? (
                <>
                  <p className="text-amber-600 dark:text-amber-500 font-bold border border-amber-500/20 bg-amber-500/5 rounded-xl p-4">
                    ⚠️ NOTIFICATION DE SÉCURITÉ : Lors du déclenchement du nœud d'authentification, la cellule Google affichera un avertissement indiquant que l'application n'est pas validée C'est le comportement attendu et tout à fait normal puisque l'écosystème Echo AI est en phase active de développement interne.
                  </p>
                  
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-900 rounded-2xl p-5 space-y-3">
                    <p className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 uppercase tracking-widest font-black">📋 Guide d'autorisation pas à pas :</p>
                    <ol className="list-decimal pl-5 space-y-3 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm">
                      <li>Cliquez sur la commande principale de liaison <span className="text-cyan-500 font-bold">"Vers Autorisation Google Agenda"</span> située au bas de cet écran.</li>
                      <li>Sélectionnez l'adresse du compte Google cible que vous désirez lier à vos matrices Echo.</li>
                      <li>Dès l'apparition de l'écran d'avertissement de sécurité de Google, repérez et cliquez sur le petit lien textuel <span className="underline font-bold text-zinc-900 dark:text-white">"Paramètres avancés"</span> (Advanced) situé dans le coin inférieur gauche.</li>
                      <li>Une section masquée va s'étendre : cliquez fermement sur le lien de contournement <span className="underline text-red-500 font-black">"Accéder à echosai.ca (non sécurisé)"</span> pour lier l'agent.</li>
                      <li>Sur l'écran final de consentement, <span className="text-emerald-500 font-bold">cochez impérativement toutes les cases d'autorisations</span> requises pour la lecture, la création et la modification de vos événements d'agenda, puis confirmez la validation.</li>
                    </ol>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-amber-600 dark:text-amber-500 font-bold border border-amber-500/20 bg-amber-500/5 rounded-xl p-4">
                    ⚠️ SECURITY NOTICE: When executing the auth script, Google's stack will issue a warning alert stating that the core application is unverified. This is completely standard as the Echo AI ecosystem is running on a private development track.
                  </p>
                  
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-900 rounded-2xl p-5 space-y-3">
                    <p className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 uppercase tracking-widest font-black">📋 Step-by-Step Authorization Script:</p>
                    <ol className="list-decimal pl-5 space-y-3 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm">
                      <li>Click the main gateway link <span className="text-cyan-500 font-bold">"Vers Autorisation Google Agenda"</span> at the bottom of this modal panel.</li>
                      <li>Select the identity node (Google account) you want to fuse into your Echo system.</li>
                      <li>Once the splash security warning grid loads up, target and click the small text anchor called <span className="underline font-bold text-zinc-900 dark:text-white">"Advanced settings"</span> on the lower left.</li>
                      <li>A hidden drawer node will open: click the routing bypass anchor <span className="underline text-red-500 font-black">"Go to echosai.ca (unsafe)"</span> to bind authorization arrays.</li>
                      <li>On the final consent view, <span className="text-emerald-500 font-bold">you must explicitly check every parameter checkbox</span> to read, write, and patch calendar events before confirming your entry.</li>
                    </ol>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              <button
                onClick={() => {
                  setShowGoogleSyncPopup(false);
                  handleGoogleConnectWithSyncNewTab();
                }}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 py-3.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md text-center"
              >
                {lang === "fr" ? "Vers Autorisation Google Agenda ➔" : "Proceed to Google Auth ➔"}
              </button>
              <button onClick={() => setShowGoogleSyncPopup(false)} className="px-6 py-3.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-xs rounded-xl font-semibold hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                {lang === "fr" ? "Annuler et revenir" : "Cancel and go back"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TREASURE MODAL CORRIGÉ — ROUTAGE SANS POP-UP INTERMÉDIAIRE BLOQUANTE */}
      {showTreasureModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[99999] p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border-2 border-amber-500 p-6 sm:p-8 rounded-3xl max-w-md w-full relative shadow-[0_0_50px_rgba(245,158,11,0.4)] text-white max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-4 right-5 flex items-center gap-2 z-10">
              <LangDropdown />
              <button type="button" onClick={() => setShowTreasureModal(false)} className="text-zinc-500 hover:text-white text-lg font-mono transition-colors p-1">✕</button>
            </div>
            
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce mt-4">👑</div>
            
            <div className="text-center space-y-2 mt-3">
              <h3 className="text-base font-black text-amber-400 tracking-wider font-mono uppercase">
                {fr ? "🎉✨ ACCÈS PORTAIL SECRET ✨🎉" : "🎉✨ SECRET PORTAL ACCESSED ✨🎉"}
              </h3>
              <h4 className="text-white font-bold text-base font-mono uppercase tracking-wide">
                {fr ? "🏆 FÉLICITATIONS !" : "🏆 CONGRATULATIONS!"}
              </h4>
              <p className="text-zinc-300 font-medium text-xs sm:text-sm bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 inline-block leading-relaxed">
                {fr ? "« Le plan Ultra à 40 %, de rabais, passe de 19,99 $ à 11,99 $ »" : "“The Ultra plan with 40% off, goes from $19.99 to $11.99”"}
              </p>
            </div>

            {/* INTEGRATION DES AVANTAGES ULTRA */}
            <div className="mt-5 space-y-2.5 text-left text-xs sm:text-sm text-zinc-300 font-sans border-t border-b border-zinc-900 py-4 max-w-xs mx-auto">
              <p className="text-amber-400 font-bold font-mono tracking-wide mb-1 text-center sm:text-left">
                {fr ? "✨ Ultra débloque :" : "✨ Ultra unlocks:"}
              </p>
              <div className="space-y-1 text-zinc-200 font-medium">
                <p>• {fr ? "1 200 messages IA par cycle 💎" : "1,200 AI messages per cycle 💎"}</p>
                <p>• {fr ? "300 Actions HorizonWeb 💎" : "300 HorizonWeb Actions 💎"}</p>
                <p>• {fr ? "240 prompts comportementales 💎" : "240 behavioral prompts 💎"}</p>
                <p>• {fr ? "120 actions Calendrier 💎" : "120 Calendar actions 💎"}</p>
                <p>• {fr ? "300 actions Budget&Nutrition 💎" : "300 Budget&Nutrition actions 💎"}</p>
                <p>• {fr ? "Support prioritaire 💎" : "Priority support 💎"}</p>
                <p>• {fr ? "Analyse d'image 💎" : "Image analysis 💎"}</p>
                <p>• {fr ? "Historique et chat illimité 💎" : "Unlimited history and chat 💎"}</p>
                <p>• {fr ? "Un mois du 3ième meilleur plan 💎" : "1 month of the 3rd best plan 💎"}</p>
              </div>
              <p className="text-zinc-400 font-bold font-mono text-[11px] mt-2 text-center sm:text-left">
                {fr ? "C'est 3e plus gros plan disponible💎" : "It is the 3rd biggest plan available💎"}
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button type="button" disabled={isLoadingTreasure} onClick={() => handleTreasureCheckout()}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-mono font-bold text-xs py-3.5 rounded-xl uppercase tracking-widest transition shadow-md">
                {isLoadingTreasure 
                  ? (fr ? "CONNEXION..." : "CONNECTING...") 
                  : user 
                    ? (fr ? "RÉCLAMER LE TRÉSOR (11.99$) ➔" : "CLAIM THE TREASURE ($11.99) ➔")
                    : (fr ? "S'authentifier et réclamer l'offre ➔" : "Login to claim offer ➔")}
              </button>
              <button type="button" onClick={() => setShowTreasureModal(false)} className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-500 font-mono text-[11px] py-1.5 rounded-xl transition border border-zinc-800">
                {fr ? "Laisser le secret tranquille" : "Leave the secret alone"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP COMPTE SUPPRIMÉ */}
      {deleteStage === "purged" && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[10000] p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-50 dark:bg-zinc-950 border-2 border-red-500/50 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center relative shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="absolute top-4 right-4">
              <img src="/echo1.png" alt="Echo" className="w-8 h-8 rounded-lg object-contain" />
            </div>
            <div className="pt-4 text-red-600 dark:text-red-400 font-mono text-sm sm:text-base font-bold leading-relaxed">
              {fr
                ? "Voila toute tes donner ont été supprimer dommage :("
                : "There you go, all your data has been deleted, too bad :("}
            </div>
            <button 
              onClick={() => setDeleteStage("idle")}
              className="w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 font-mono text-xs font-bold rounded-xl transition-all shadow-md"
            >
              ✕ {fr ? "Fermer" : "Close"}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}