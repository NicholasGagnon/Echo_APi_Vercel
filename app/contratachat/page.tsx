"use client";

import Link from "next/link";
import React, { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "../../context/AppContext";
import { supabase } from "../lib/supabase";

export const dynamic = "force-dynamic";

const MicrosoftLogo = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23" fill="none">
    <path d="M0 0H11V11H0V0Z" fill="#F25022"/>
    <path d="M12 0H23V11H12V0Z" fill="#7FBA00"/>
    <path d="M0 12H11V23H0V12Z" fill="#00A4EF"/>
    <path d="M12 12H23V23H12V12Z" fill="#FFB900"/>
  </svg>
);

const GoogleLogo = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 2.18 2.18 4.94l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

type CurrencyCode = "CAD" | "USD" | "EUR";
const CURRENCIES: CurrencyCode[] = ["CAD", "USD", "EUR"];
const PRICES: Record<CurrencyCode, { amount: string; symbol: string }> = {
  CAD: { amount: "3.99", symbol: "CA$" },
  USD: { amount: "3.99", symbol: "US$" },
  EUR: { amount: "3.99", symbol: "€" },
};

type TypeBien = "vehicule" | "bijoux" | "electro" | "animal" | "autre";

const TYPE_BIEN: Record<TypeBien, { icon: string; labelFr: string; labelEn: string }> = {
  vehicule: { icon: "🚗", labelFr: "Véhicule",   labelEn: "Vehicle" },
  bijoux:   { icon: "💎", labelFr: "Bijoux",     labelEn: "Jewelry" },
  electro:  { icon: "📺", labelFr: "Électro",    labelEn: "Electronics" },
  animal:   { icon: "🐾", labelFr: "Animal",     labelEn: "Pet" },
  autre:    { icon: "📦", labelFr: "Autre",      labelEn: "Other" },
};

type ContratData = {
  vendeur_nom: string; vendeur_adresse: string;
  acheteur_nom: string; acheteur_adresse: string;
  description_bien: string; prix_total: string;
  modalites_paiement: string; date: string; notes: string;
  type_bien: TypeBien; model_used?: string;
};

function ContratContent() {
  const { lang, setLang } = useApp();
  const fr = lang === "fr";
  const router = useRouter();
  const searchParams = useSearchParams();

  // User & Auth State
  const [user, setUser] = useState<any>(null);
  const [userTier, setUserTier] = useState<string>("free");

  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [targetHref, setTargetHref] = useState<string | null>(null);

  const [currency, setCurrency] = useState<CurrencyCode>("CAD");
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [signInError, setSignInError] = useState<string | null>(null);
  const [signInSuccess, setSignInSuccess] = useState<string | null>(null);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState<string | null>(null);

  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendEmail, setResendEmail] = useState("");

  // Tool State
  const [loading, setLoading] = useState(false);
  const [contrat, setContrat] = useState<ContratData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contratRef = useRef<HTMLDivElement>(null);

  const [vendeurNom, setVendeurNom] = useState("");
  const [vendeurAdresse, setVendeurAdresse] = useState("");
  const [acheteurNom, setAcheteurNom] = useState("");
  const [acheteurAdresse, setAcheteurAdresse] = useState("");
  const [description, setDescription] = useState("");
  const [prixModalites, setPrixModalites] = useState("");
  const [typeBien, setTypeBien] = useState<TypeBien>("vehicule");

  const api = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        verifierStatutUser(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
        verifierStatutUser(session.user.id);
      } else {
        setUser(null);
        setUserTier("free");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (searchParams.get("premium") === "success" && user) {
      const timer = setTimeout(() => {
        verifierStatutUser(user.id);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [searchParams, user]);

  const verifierStatutUser = async (uid: string) => {
    try {
      const { data: cData, error: cErr } = await supabase
        .from("contenu_quotas")
        .select("tier")
        .eq("user_id", uid)
        .maybeSingle();

      if (!cErr && cData?.tier && cData.tier !== "free" && cData.tier !== "connected_free") {
        setUserTier(cData.tier);
        return;
      }

      const { data: wData, error: wErr } = await supabase
        .from("world_quotas")
        .select("tier")
        .eq("user_id", uid)
        .maybeSingle();

      if (!wErr && wData?.tier && wData.tier !== "free" && wData.tier !== "connected_free") {
        setUserTier(wData.tier);
        return;
      }

      setUserTier("free");
    } catch (e) {
      console.warn("Erreur verif statut:", e);
    }
  };

  const handleGoogleConnect = async () => {
    const redirectUrl = targetHref ? `${window.location.origin}${targetHref}` : `${window.location.origin}/contratachat`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl, scopes: "openid profile email", queryParams: { prompt: "select_account" } },
    });
  };

  const handleMicrosoftConnect = async () => {
    const redirectUrl = targetHref ? `${window.location.origin}${targetHref}` : `${window.location.origin}/contratachat`;
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: { redirectTo: redirectUrl, scopes: "openid profile email User.Read" },
    });
  };

  const handleStripeCheckout = async () => {
    if (!user) {
      setShowPremiumModal(false);
      setShowSignInModal(true);
      return;
    }

    setIsCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "world_advantage",
          currency: currency.toUpperCase(),
          userId: user.id,
          userEmail: user.email,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(fr ? "Erreur de redirection vers la caisse." : "Checkout redirection error.");
      }
    } catch {
      alert(fr ? "Impossible d'initier le paiement." : "Unable to initiate payment.");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const handleEmailSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSignInError(null);
    setSignInSuccess(null);
    if (!email.trim() || !password.trim()) {
      setSignInError(fr ? "Veuillez entrer vos identifiants." : "Please enter your credentials.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setSignInError(error.message);
    } else {
      setShowSignInModal(false);
      clearInputs();
      if (targetHref) {
        router.push(targetHref);
      }
    }
  };

  const startResendCountdown = () => {
    setResendCountdown(120);
    const interval = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleEmailSignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSignUpError(null);
    setSignUpSuccess(null);
    if (!email.trim() || !password.trim()) {
      setSignUpError(fr ? "Veuillez entrer un courriel et un mot de passe." : "Please enter an email and password.");
      return;
    }
    const trimmedEmail = email.trim();
    const redirectUrl = targetHref ? `${window.location.origin}${targetHref}` : `${window.location.origin}/contratachat`;
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: { emailRedirectTo: redirectUrl },
    });

    if (error) {
      if (error.message.includes("rate") || (error as any).status === 429) {
        setSignUpError(fr ? "Trop de tentatives. Veuillez patienter." : "Too many attempts. Please wait.");
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
      setSignUpSuccess(
        fr
          ? "Lien de confirmation envoyé ! Veuillez vérifier votre boîte de réception ainsi que votre dossier de courriels indésirables (spam)."
          : "Confirmation link sent! Please check your inbox and your spam/junk folder."
      );
      startResendCountdown();
    }
  };

  const handleResendEmail = async () => {
    if (resendCountdown > 0 || !resendEmail) return;
    setSignUpError(null);
    const redirectUrl = targetHref ? `${window.location.origin}${targetHref}` : `${window.location.origin}/contratachat`;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: resendEmail,
      options: { emailRedirectTo: redirectUrl },
    });
    if (error) {
      setSignUpError(error.message);
    } else {
      setSignUpSuccess(
        fr
          ? "Un nouveau lien a été envoyé. Pensez à vérifier votre dossier de courriels indésirables (spam)."
          : "A new link has been sent. Remember to check your spam/junk folder."
      );
      startResendCountdown();
    }
  };

  const handleForgotPassword = async () => {
    setSignInError(null);
    setSignInSuccess(null);
    if (!email.trim()) {
      setSignInError(fr ? "Veuillez entrer votre courriel d'abord." : "Please enter your email address first.");
      return;
    }
    const redirectUrl = targetHref ? `${window.location.origin}${targetHref}` : `${window.location.origin}/contratachat`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl,
    });
    if (error) {
      setSignInError(error.message);
    } else {
      setSignInSuccess(
        fr
          ? "Lien de réinitialisation envoyé ! Pensez à vérifier vos indésirables."
          : "Reset link sent! Please check your spam folder."
      );
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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !prixModalites.trim()) return;
    setLoading(true); setError(null); setContrat(null);
    try {
      const dateStr = new Date().toISOString().split("T")[0];
      const freeText = `
Vendeur: ${vendeurNom} - ${vendeurAdresse}
Acheteur: ${acheteurNom} - ${acheteurAdresse}
Bien: ${description}
Prix et modalités: ${prixModalites}
Type: ${TYPE_BIEN[typeBien][fr ? "labelFr" : "labelEn"]}
      `.trim();
      const res = await fetch(`${api}/1/generate-contrat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freeText, lang, dateStr }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setContrat({ ...data, type_bien: typeBien });
    } catch (err: any) {
      setError(err.message || (fr ? "Erreur inattendue." : "Unexpected error."));
    } finally { setLoading(false); }
  };

  const handleExportPdf = async () => {
    if (!contratRef.current) return;
    const { default: html2canvas } = await import("html2canvas");
    const { default: jsPDF } = await import("jspdf");
    const canvas = await html2canvas(contratRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    const dateStr = contrat?.date || new Date().toISOString().split("T")[0];
    pdf.save(`Contrat-${vendeurNom.replace(/\s+/g, "_") || "vente"}-${dateStr}.pdf`);
  };

  const renderContrat = () => {
    if (!contrat) return null;
    const tb = TYPE_BIEN[contrat.type_bien || typeBien];
    return (
      <div ref={contratRef} className="bg-white text-zinc-900 font-serif rounded-2xl overflow-hidden border border-zinc-200 shadow-2xl p-8 md:p-12 leading-relaxed">
        <div className="text-center mb-8 border-b-2 border-zinc-900 pb-5">
          <div className="text-[11px] tracking-[0.25em] uppercase text-zinc-500 mb-2 font-sans">Québec, Canada</div>
          <h1 className="text-xl md:text-2xl font-black tracking-wide uppercase mb-1 font-sans">
            {fr ? "Contrat de vente entre particuliers" : "Bill of sale between individuals"}
          </h1>
          <div className="text-xs text-zinc-500 font-sans">
            {tb.icon} {fr ? tb.labelFr : tb.labelEn} · Date : <strong>{contrat.date}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-7 font-sans">
          <div className="bg-zinc-50 rounded-xl p-5 border border-zinc-200">
            <div className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase mb-2">{fr ? "Vendeur" : "Seller"}</div>
            <div className="text-sm font-bold text-zinc-900">{contrat.vendeur_nom || vendeurNom}</div>
            <div className="text-xs text-zinc-600 mt-1 leading-relaxed">{contrat.vendeur_adresse || vendeurAdresse}</div>
          </div>
          <div className="bg-zinc-50 rounded-xl p-5 border border-zinc-200">
            <div className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase mb-2">{fr ? "Acheteur" : "Buyer"}</div>
            <div className="text-sm font-bold text-zinc-900">{contrat.acheteur_nom || acheteurNom}</div>
            <div className="text-xs text-zinc-600 mt-1 leading-relaxed">{contrat.acheteur_adresse || acheteurAdresse}</div>
          </div>
        </div>

        <div className="mb-6 font-sans">
          <div className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase mb-2">{fr ? "Description du bien" : "Item description"}</div>
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 text-xs md:text-sm leading-relaxed text-zinc-800">
            {contrat.description_bien || description}
          </div>
        </div>

        <div className="mb-7 bg-emerald-50 border border-emerald-200 rounded-xl p-5 font-sans">
          <div className="text-[10px] font-bold text-emerald-800 tracking-wider uppercase mb-2">{fr ? "Prix et modalités de paiement" : "Price & payment terms"}</div>
          <div className="text-base font-black text-emerald-900 mb-1">{contrat.prix_total}</div>
          <div className="text-xs text-zinc-700 leading-relaxed">{contrat.modalites_paiement || prixModalites}</div>
        </div>

        {contrat.notes && (
          <div className="mb-7 p-5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed font-sans">
            <div className="font-bold mb-1 text-[10px] uppercase tracking-wider">{fr ? "Notes" : "Notes"}</div>
            {contrat.notes}
          </div>
        )}

        <div className="mb-7 border-t border-zinc-200 pt-6 font-sans">
          <div className="text-xs leading-relaxed text-zinc-700 space-y-3">
            <p>
              <strong>{fr ? "Clause de renonciation" : "Waiver clause"} :</strong>{" "}
              {fr
                ? "L'acheteur déclare avoir vérifié le bien et l'accepte dans l'état où il se trouve. Le présent bien est vendu sans aucune garantie légale, aux risques et périls de l'acheteur."
                : "The buyer declares having inspected the item and accepts it in its current condition. This item is sold without any legal warranty, at the buyer's sole risk."}
            </p>
            <p>
              <strong>{fr ? "Clause de vente sans garantie légale" : "Sale without legal warranty"} :</strong>{" "}
              {fr
                ? "Le vendeur affirme que le bien fourni est sa propriété, libre de toutes charges et restrictions. Le bien est livré dans l'état dans lequel il a été décrit lors de la conclusion de ce contrat."
                : "The seller affirms that the item is their property, free of all charges and restrictions. The item is delivered in the condition described at the time this contract was concluded."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10 mt-8 pt-6 border-t border-zinc-200 font-sans">
          <div>
            <div className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase mb-6">{fr ? "Signature vendeur" : "Seller signature"}</div>
            <div className="border-b border-zinc-900 min-w-[180px] mb-1.5">&nbsp;</div>
            <div className="text-xs text-zinc-500">{contrat.vendeur_nom || vendeurNom}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase mb-6">{fr ? "Signature acheteur" : "Buyer signature"}</div>
            <div className="border-b border-zinc-900 min-w-[180px] mb-1.5">&nbsp;</div>
            <div className="text-xs text-zinc-500">{contrat.acheteur_nom || acheteurNom}</div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-zinc-100 flex justify-between font-sans text-[10px] text-zinc-400">
          <div>Généré par echosai.ca/contratachat</div>
          <div>{contrat.date}</div>
        </div>
      </div>
    );
  };

  const isPaidTier = userTier && userTier !== "free" && userTier !== "connected_free";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-cyan-500/20 antialiased relative overflow-x-hidden">
      {/* SECTION DU HAUT : BLANCHE AVEC HEADER ET TITRE DE L'OUTIL */}
      <section className="bg-white text-zinc-900 relative z-30">
        <header className="border-b border-zinc-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center relative">
            <div className="flex items-center gap-6">
              <Link href="/outil" className="text-sm font-mono font-black tracking-[0.25em] text-zinc-900 uppercase">
                ECHOSAI
              </Link>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-mono relative">
              {/* SÉLECTEUR DE DEVISES */}
              <div className="flex border border-zinc-300 rounded-lg overflow-hidden font-mono text-[10px] bg-zinc-100">
                {CURRENCIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-2 py-1 font-bold transition-colors ${currency === c ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* BADGE D'ACTIVATION / ACCÈS PREMIUM */}
              {isPaidTier ? (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-emerald-500/50 bg-black text-emerald-400 font-mono shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                  <span className="font-bold text-[11px] uppercase tracking-wider">
                    {fr ? "✓ PLAN PREMIUM ACTIF" : "✓ PREMIUM ACTIVE"}
                  </span>
                </div>
              ) : (
                <div 
                  onClick={() => setShowPremiumModal(true)} 
                  className="cursor-pointer flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-amber-500/40 bg-zinc-900 text-white shadow-lg hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
                >
                  <span className="text-[9px] bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm animate-pulse">
                    ★ ECHOAI PREMIUM ({PRICES[currency].symbol}{PRICES[currency].amount})
                  </span>
                </div>
              )}

              {/* SÉLECTEUR FR/EN */}
              <div className="flex border border-zinc-200 rounded-lg overflow-hidden font-mono text-[10px]">
                <button onClick={() => setLang("fr")} className={`px-2 py-1 ${lang === "fr" ? "bg-zinc-900 text-white font-bold" : "bg-zinc-50 text-zinc-400 hover:text-zinc-600"}`}>FR</button>
                <button onClick={() => setLang("en")} className={`px-2 py-1 ${lang === "en" ? "bg-zinc-900 text-white font-bold" : "bg-zinc-50 text-zinc-400 hover:text-zinc-600"}`}>EN</button>
              </div>

              {/* IDENTIFIANT UTILISATEUR OU BOUTONS D'AUTH */}
              {user ? (
                <div className="flex items-center gap-4">
                  <span className="text-[11px] text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200">
                    🟢 {user.email}
                  </span>
                  <button onClick={() => supabase.auth.signOut()} className="text-[11px] text-red-500 hover:text-red-700 transition-colors uppercase font-bold">
                    [ {fr ? "Déconnexion" : "Sign Out"} ]
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setShowSignInModal(true)} className="px-4 py-2 border border-zinc-900 text-zinc-900 rounded-xl hover:bg-zinc-900 hover:text-white transition-all font-bold tracking-tight shadow-sm">
                    {fr ? "Connexion" : "Sign In"}
                  </button>
                  <button onClick={() => setShowSignUpModal(true)} className="px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all font-bold tracking-tight shadow-sm">
                    {fr ? "S'inscrire" : "Sign Up"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-6 py-10 text-center">
          <div className="inline-block text-[10px] font-mono tracking-widest text-zinc-400 uppercase mb-2 border border-zinc-200 px-2 py-0.5 rounded">
            {fr ? "AGENT D'ÉCRITURE LÉGALE" : "LEGAL DRAFTING AGENT"}
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-zinc-900 leading-tight mb-2 uppercase">
            {fr ? "📄 Un contrat de vente en 30 secondes." : "📄 A bill of sale in 30 seconds."}
          </h2>
          <p className="text-zinc-500 max-w-lg mx-auto text-xs md:text-sm font-sans leading-relaxed">
            {fr ? "Entre les informations. L'IA génère le contrat légal complet." : "Enter the information. AI generates the complete legal contract."}
          </p>
        </div>
      </section>

      {/* TRANSITION COURBE + LUEUR DE COULEUR */}
      <div className="relative w-full h-20 bg-zinc-950 overflow-hidden -mt-1 z-20">
        <svg className="absolute top-0 left-0 w-full h-full text-white fill-current" viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path d="M0,0 L1440,0 L1440,30 Q1080,90 720,50 Q360,0 0,60 Z" />
        </svg>

        <svg className="absolute top-0 left-0 w-full h-full text-transparent fill-none pointer-events-none z-22" viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path d="M0,60 Q360,0 720,50 Q1080,90 1440,30" stroke="#06b6d4" strokeWidth="6" className="drop-shadow-[0_0_12px_#06b6d4]" />
        </svg>
      </div>

      {/* SECTION DU BAS : FORMULAIRE ET PRÉVISUALISATION DU CONTRAT */}
      <section className="bg-zinc-950 text-zinc-50 pb-16 pt-0 relative z-10 -mt-6">
        <div className="max-w-3xl mx-auto px-4">
          <div className="relative rounded-2xl border-2 border-cyan-500/40 bg-black/95 p-6 md:p-8 shadow-[0_0_25px_rgba(6,182,212,0.18)]">
            
            <form onSubmit={handleGenerate} className="space-y-6">
              
              {/* Type de bien */}
              <div>
                <label className="block text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider mb-2">
                  {fr ? "Type de bien" : "Item type"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(TYPE_BIEN) as [TypeBien, typeof TYPE_BIEN[TypeBien]][]).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTypeBien(key)}
                      className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                        typeBien === key
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                          : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      {val.icon} {fr ? val.labelFr : val.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vendeur & Acheteur */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="block text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                    {fr ? "Vendeur" : "Seller"}
                  </label>
                  <input
                    type="text"
                    value={vendeurNom}
                    onChange={(e) => setVendeurNom(e.target.value)}
                    placeholder={fr ? "Nom complet" : "Full name"}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  <textarea
                    value={vendeurAdresse}
                    onChange={(e) => setVendeurAdresse(e.target.value)}
                    placeholder={fr ? "Adresse complète" : "Full address"}
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors resize-none font-sans"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                    {fr ? "Acheteur" : "Buyer"}
                  </label>
                  <input
                    type="text"
                    value={acheteurNom}
                    onChange={(e) => setAcheteurNom(e.target.value)}
                    placeholder={fr ? "Nom complet" : "Full name"}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  <textarea
                    value={acheteurAdresse}
                    onChange={(e) => setAcheteurAdresse(e.target.value)}
                    placeholder={fr ? "Adresse complète" : "Full address"}
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors resize-none font-sans"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
                  {fr ? "Description précise du bien" : "Precise description of the item"}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={fr ? "Marque, modèle, année, état, numéro de série si applicable…" : "Brand, model, year, condition, serial number if applicable…"}
                  rows={4}
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors font-sans leading-relaxed"
                />
              </div>

              {/* Prix et modalités */}
              <div>
                <label className="block text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
                  {fr ? "Prix et modalités de paiement" : "Price and payment terms"}
                </label>
                <textarea
                  value={prixModalites}
                  onChange={(e) => setPrixModalites(e.target.value)}
                  placeholder={fr ? "Ex: 1 500 $ comptant / 200 $ par semaine pendant 8 semaines / 500 $ de dépôt + solde à la livraison" : "Ex: $1,500 cash / $200/week for 8 weeks / $500 deposit + balance on delivery"}
                  rows={3}
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono leading-relaxed"
                />
              </div>

              {error && (
                <div className="bg-red-950/50 border border-red-500/50 rounded-xl p-3 text-xs text-red-400">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !description.trim() || !prixModalites.trim()}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono font-black py-4 rounded-xl text-xs uppercase tracking-wider transition-colors shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    {fr ? "Génération du contrat via la cascade IA..." : "AI Cascade generating contract..."}
                  </span>
                ) : (
                  fr ? "Générer le contrat" : "Generate contract"
                )}
              </button>
            </form>

            {/* CONTRAT PREVIEW */}
            {contrat && (
              <div className="mt-10 space-y-4 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                    {fr ? "Aperçu du contrat généré" : "Generated contract preview"} {contrat.model_used && `(${contrat.model_used})`}
                  </span>
                  <button
                    onClick={handleExportPdf}
                    className="bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    {fr ? "⬇ Exporter en PDF" : "⬇ Export as PDF"}
                  </button>
                </div>

                <div className="relative">
                  {renderContrat()}

                  {!user && (
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent flex items-end justify-center pb-6 rounded-b-2xl">
                      <div className="text-center p-4">
                        <div className="text-sm font-bold text-cyan-300 mb-1">
                          🔒 {fr ? "Connecte-toi pour exporter" : "Sign in to export"}
                        </div>
                        <p className="text-xs text-zinc-400 mb-3">PDF · Sauvegarde automatique</p>
                        <button
                          onClick={() => setShowSignInModal(true)}
                          className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors"
                        >
                          {fr ? "Créer un compte gratuit →" : "Create a free account →"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-12 border border-zinc-900 bg-zinc-900/40 rounded-2xl p-6 font-mono text-[11px] text-zinc-500 text-center">
            <span className="text-cyan-400 font-bold">ECHO_TOTEM_NETWORK // CONTRAT_MODULE</span> — Générateur de contrats d’achat sécurisé. © 2026 Echo Totem Network — Tous droits réservés.
          </div>
        </div>
      </section>

      {/* MODAL STRIPE / PREMIUM */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[99999] p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-amber-500/50 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-100 text-center relative">
            <button type="button" onClick={() => setShowPremiumModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white text-sm p-1 cursor-pointer">✕</button>

            <div className="text-4xl mb-3">⚡</div>
            <h2 className="text-lg font-black text-white uppercase font-mono mb-1">
              {fr ? "Abonnement EchoAI Premium" : "EchoAI Premium Subscription"}
            </h2>
            <p className="text-xs text-zinc-400 mb-4 font-sans">
              {fr
                ? "Débloquez l'accès illimité à l'ensemble des modules d'intelligence artificielle."
                : "Unlock unlimited access to all artificial intelligence modules."}
            </p>

            <div className="flex justify-center gap-2 mb-4 font-mono text-xs">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-3 py-1 rounded-lg font-bold border transition-all ${
                    currency === c
                      ? "bg-amber-500 text-zinc-950 border-amber-400"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                  }`}
                >
                  {c} ({PRICES[c].symbol})
                </button>
              ))}
            </div>

            <div className="bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/40 rounded-2xl p-5 mb-6 text-left space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-amber-400 font-bold text-xs font-mono uppercase">★ ECHOAI PREMIUM</span>
                <span className="text-white font-black text-sm font-mono">
                  {PRICES[currency].symbol}{PRICES[currency].amount}/{fr ? "mois" : "mo"}
                </span>
              </div>
              <ul className="text-zinc-300 text-xs space-y-2 font-mono">
                <li className="flex items-center gap-2 text-emerald-400">✓ <strong>Accès Illimité</strong> à tous les outils EchoAI</li>
                <li className="flex items-center gap-2 text-emerald-400">✓ Génération haute vitesse prioritaire</li>
                <li className="flex items-center gap-2 text-zinc-400">✓ Sauvegarde permanente de vos projets</li>
              </ul>
            </div>

            <button
              onClick={handleStripeCheckout}
              disabled={isCheckoutLoading}
              className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 transition-all shadow-[0_0_25px_rgba(245,158,11,0.3)] cursor-pointer disabled:opacity-50"
            >
              {isCheckoutLoading
                ? (fr ? "CHARGEMENT DE STRIPE..." : "LOADING STRIPE...")
                : (fr ? `Activer EchoAI Premium (${PRICES[currency].symbol}${PRICES[currency].amount}/mois)` : `Activate EchoAI Premium (${PRICES[currency].symbol}${PRICES[currency].amount}/mo)`)}
            </button>
          </div>
        </div>
      )}

      {/* MODAL CONNEXION (SIGN IN) */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-100">
            <form onSubmit={handleEmailSignIn} className="space-y-5">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-base font-bold">{fr ? "Connexion Requise" : "Authentication Required"}</h2>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    {fr ? "Connectez-vous pour déployer cet outil." : "Sign in to deploy this tool."}
                  </p>
                </div>
                <button type="button" onClick={() => { setShowSignInModal(false); clearInputs(); }} className="text-zinc-400 hover:text-white text-sm p-1">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={handleGoogleConnect} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800">
                  <GoogleLogo /><span className="text-white text-[9px] font-bold">GOOGLE</span>
                </button>
                <button type="button" onClick={handleMicrosoftConnect} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800">
                  <MicrosoftLogo /><span className="text-white text-[9px] font-bold">MICROSOFT</span>
                </button>
              </div>

              <div className="h-px bg-zinc-900 my-2" />

              {signInError && <div className="bg-red-950/50 border border-red-500/50 rounded-xl p-3 text-xs text-red-400">⚠️ {signInError}</div>}
              {signInSuccess && <div className="bg-emerald-950/50 border border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-400">✓ {signInSuccess}</div>}

              <div className="space-y-3">
                <input type="email" placeholder="name@domain.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500" />
                <input type="password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500" />
                <button onClick={handleForgotPassword} type="button" className="text-xs text-zinc-500 hover:text-cyan-400 transition-colors">
                  {fr ? "Mot de passe oublié ?" : "Forgot password?"}
                </button>
              </div>

              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors">
                {fr ? "Se connecter & Accéder" : "Log in & Deploy"}
              </button>

              <p className="text-center text-zinc-500 text-xs pt-1">
                {fr ? "Pas encore de compte ? " : "Don't have an account? "}
                <button type="button" onClick={() => { setShowSignInModal(false); setShowSignUpModal(true); clearInputs(); }} className="text-cyan-400 underline">
                  {fr ? "S'inscrire" : "Sign up"}
                </button>
              </p>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INSCRIPTION (SIGN UP) */}
      {showSignUpModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-100">
            <form onSubmit={handleEmailSignUp} className="space-y-5">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-base font-bold">{fr ? "Créer un compte" : "Create account"}</h2>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    {fr ? "Inscrivez-vous pour débloquer les modules." : "Sign up to unlock modules."}
                  </p>
                </div>
                <button type="button" onClick={() => { setShowSignUpModal(false); clearInputs(); }} className="text-zinc-400 hover:text-white text-sm p-1">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={handleGoogleConnect} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800">
                  <GoogleLogo /><span className="text-white text-[9px] font-bold">GOOGLE</span>
                </button>
                <button type="button" onClick={handleMicrosoftConnect} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800">
                  <MicrosoftLogo /><span className="text-white text-[9px] font-bold">MICROSOFT</span>
                </button>
              </div>

              <div className="h-px bg-zinc-900 my-2" />

              {signUpError && <div className="bg-red-950/50 border border-red-500/50 rounded-xl p-3 text-xs text-red-400">⚠️ {signUpError}</div>}
              {signUpSuccess && (
                <div className="bg-emerald-950/50 border border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-400 space-y-3">
                  <p>✓ {signUpSuccess}</p>
                  <button type="button" onClick={handleResendEmail} disabled={resendCountdown > 0}
                    className="w-full py-2 rounded-lg text-xs font-bold transition-all border disabled:opacity-50 disabled:cursor-not-allowed border-emerald-500/50 text-emerald-400 hover:bg-emerald-950/40">
                    {resendCountdown > 0
                      ? (fr ? `Renvoyer dans ${resendCountdown}s` : `Resend in ${resendCountdown}s`)
                      : (fr ? "↺ Renvoyer le lien de confirmation" : "↺ Resend confirmation link")}
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <input type="email" placeholder="name@domain.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500" />
                <div>
                  <input type="password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500" />
                  <p className="text-zinc-500 text-[10px] mt-1">{fr ? "Minimum 6 caractères." : "Minimum 6 characters."}</p>
                </div>
              </div>

              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors">
                {fr ? "Créer mon compte" : "Create my account"}
              </button>

              <p className="text-center text-zinc-500 text-xs pt-1">
                {fr ? "Déjà un compte ? " : "Already have an account? "}
                <button type="button" onClick={() => { setShowSignUpModal(false); setShowSignInModal(true); clearInputs(); }} className="text-cyan-400 underline">
                  {fr ? "Se connecter" : "Sign in"}
                </button>
              </p>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ContratPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-cyan-400 font-mono text-xs">Chargement...</div>}>
      <ContratContent />
    </Suspense>
  );
}