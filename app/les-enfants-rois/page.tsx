"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type CurrencyCode = "EUR" | "CAD" | "USD";

// ── 1. FICHE DU LIVRE (PERSONNALISE CET OBJET POUR CHAQUE PAGE) ──
const BOOK_INFO = {
  id: "les-enfants-rois-fr",
  titre: "Les Enfants Rois",
  auteur: "Nicholas Gagnon",
  categorie: "Drame Psychologique",
  pages: 230,
  couverture: "/livres/couvertureterminer.png",
  epubUrl: "/livres/Les-Enfants-Rois.epub",
  badge: "POPULAIRE",
  accroche: "Dans certaines familles, le refus n'a plus le droit d'exister. Que se passe-t-il quand les enfants prennent le contrôle ?",
  description: `Tout le monde a déjà croisé le regard d'un « enfant-roi ». Tout le monde a déjà jugé, de loin, ces parents qui semblent avoir abandonné toute forme d'autorité. Mais que se passe-t-il réellement derrière les portes closes lorsque le refus n'a plus le droit d'exister ?

Dans une époque qui martèle sans cesse qu'imposer une limite est une violence et que chaque émotion d'un enfant doit être sacralisée, Ariane a choisi la voie moderne. Celle qu'on applaudit sur les réseaux, celle des théories bienveillantes et des certitudes inattaquables.

Pourtant, lorsque l'adulte s'efface totalement, le vide ne reste jamais intact. Sans repères pour se heurter au monde, Kyan et Nola ne grandissent pas apaisés : ils comblent l'espace. Insidieusement, la cellule familiale s'inverse. Ce qui commence par des caprices invisibles se transforme peu à peu en un pouvoir froid, absolu...`,
};

const CURRENCIES: CurrencyCode[] = ["EUR", "CAD", "USD"];

const PRICES: Record<CurrencyCode, { amount: string; symbol: string }> = {
  EUR: { amount: "2.50", symbol: "€" },
  CAD: { amount: "2.50", symbol: "CA$" },
  USD: { amount: "2.50", symbol: "US$" },
};

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

export default function BookLandingPage() {
  const [currency, setCurrency] = useState<CurrencyCode>("EUR"); // Par défaut en EURO
  const [user, setUser] = useState<any>(null);
  const [isOwned, setIsOwned] = useState<boolean>(false);
  const [isBuying, setIsBuying] = useState<boolean>(false);
  const [showReader, setShowReader] = useState<boolean>(false);

  // Authentification
  const [showSignInModal, setShowSignInModal] = useState<boolean>(false);
  const [showSignUpModal, setShowSignUpModal] = useState<boolean>(false);
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signInSuccess, setSignInSuccess] = useState<string | null>(null);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState<string | null>(null);

  const clearAuthInputs = () => {
    setAuthEmail("");
    setAuthPassword("");
    setSignInError(null);
    setSignInSuccess(null);
    setSignUpError(null);
    setSignUpSuccess(null);
  };

  const triggerXEvent = (eventId: string, params: Record<string, any> = {}) => {
    if (typeof window !== "undefined" && (window as any).twq) {
      (window as any).twq("event", eventId, params);
    }
  };

  const chargerAchat = async (uid: string) => {
    try {
      const { data } = await supabase
        .from("user_books")
        .select("book_id")
        .eq("user_id", uid)
        .eq("book_id", BOOK_INFO.id)
        .maybeSingle();

      if (data) setIsOwned(true);
    } catch {}
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        chargerAchat(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
        setShowSignInModal(false);
        setShowSignUpModal(false);
        clearAuthInputs();
        chargerAchat(session.user.id);
      } else {
        setUser(null);
        setIsOwned(false);
      }
    });

    // Tracking de consultation du livre
    triggerXEvent("tw-rhzsa-rih44", {
      content_name: BOOK_INFO.titre,
      content_id: BOOK_INFO.id,
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleConnect = async () => {
    const cleanOrigin = window.location.origin + window.location.pathname;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: cleanOrigin, scopes: "openid profile email", queryParams: { prompt: "select_account" } },
    });
  };

  const handleMicrosoftConnect = async () => {
    const cleanOrigin = window.location.origin + window.location.pathname;
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: { redirectTo: cleanOrigin, scopes: "openid profile email User.Read" },
    });
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    if (!authEmail.trim() || !authPassword.trim()) {
      setSignInError("Veuillez renseigner votre courriel et mot de passe.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword,
    });
    if (error) {
      setSignInError(error.message);
    } else {
      setShowSignInModal(false);
      clearAuthInputs();
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);
    if (!authEmail.trim() || !authPassword.trim()) {
      setSignUpError("Veuillez entrer un courriel et un mot de passe.");
      return;
    }
    const cleanOrigin = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.signUp({
      email: authEmail.trim(),
      password: authPassword,
      options: { emailRedirectTo: cleanOrigin },
    });

    if (error) {
      setSignUpError(error.message);
    } else {
      setSignUpSuccess("Compte créé avec succès !");
    }
  };

  const handleBuy = async () => {
    triggerXEvent("tw-rhzsa-rih5p", { content_name: BOOK_INFO.titre });

    if (!user) {
      triggerXEvent("tw-rhzsa-rih5l", {});
      setShowSignInModal(true);
      return;
    }

    triggerXEvent("tw-rhzsa-rih5s", {
      content_name: BOOK_INFO.titre,
      value: PRICES[currency].amount,
      currency: currency,
    });

    setIsBuying(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          currency: currency.toUpperCase(),
          bookId: BOOK_INFO.id,
          bookTitle: BOOK_INFO.titre,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Erreur lors de la création de la session d'achat.");
      }
    } catch {
      alert("Impossible de joindre le service de paiement.");
    } finally {
      setIsBuying(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = encodeURI(BOOK_INFO.epubUrl);
    link.download = `${BOOK_INFO.titre}.epub`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 font-sans antialiased selection:bg-cyan-500/20">
      {/* ── HEADER ── */}
      <header className="border-b border-zinc-800/80 bg-black/40 backdrop-blur-md px-6 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-4 flex-wrap">
          <Link href="/" className="font-mono font-black text-xs md:text-sm tracking-widest uppercase hover:text-cyan-400 transition-colors">
            ← CATALOGUE ECHOSAI
          </Link>

          <div className="flex items-center gap-4 text-xs font-mono">
            {/* SÉLECTEUR DE DEVISES AVEC DÉFAUT EN EURO */}
            <div className="flex border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900 text-[10px]">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2.5 py-1 font-bold transition-colors ${
                    currency === c ? "bg-cyan-400 text-zinc-950" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {c} ({PRICES[c].symbol})
                </button>
              ))}
            </div>

            {/* ZONE UTILISATEUR */}
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-zinc-400 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                  🟢 {user.email}
                </span>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="text-red-400 hover:text-red-300 font-bold"
                >
                  [ Sortir ]
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  triggerXEvent("tw-rhzsa-rih5l", {});
                  clearAuthInputs();
                  setShowSignInModal(true);
                }}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold border border-zinc-700 transition-colors"
              >
                Connexion
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── CORPS DU LIVRE ── */}
      <main className="max-w-5xl mx-auto px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-14 items-start">
          
          {/* COUVERTURE */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-[340px] aspect-[2/3] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] border border-zinc-800">
              <img
                src={BOOK_INFO.couverture}
                alt={BOOK_INFO.titre}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-cyan-400 text-zinc-950 font-black font-mono text-[10px] uppercase px-3 py-1 rounded-full shadow-lg">
                {BOOK_INFO.badge}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs font-mono text-zinc-400 text-center">
              <span>📖 {BOOK_INFO.pages} pages</span>
              <span>•</span>
              <span>⚡ Format .EPUB universel</span>
              <span>•</span>
              <span>🔓 Sans DRM</span>
            </div>
          </div>

          {/* DÉTAILS ET PAIEMENT */}
          <div className="md:col-span-7 space-y-6">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400 mb-2 block">
                {BOOK_INFO.categorie}
              </span>
              <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                {BOOK_INFO.titre}
              </h1>
              <p className="text-sm font-mono text-zinc-400 mt-1">
                Roman écrit par <strong>{BOOK_INFO.auteur}</strong>
              </p>
            </div>

            <p className="text-base text-zinc-300 font-medium leading-relaxed italic border-l-2 border-cyan-400 pl-4">
              « {BOOK_INFO.accroche} »
            </p>

            {/* ENCADRÉ D'ACHAT DIRECT */}
            <div className="p-6 rounded-3xl bg-zinc-900/90 border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.15)] space-y-5">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-[11px] font-mono uppercase text-zinc-400 block">Prix de l'ouvrage complet :</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white font-mono">
                      {PRICES[currency].amount} {PRICES[currency].symbol}
                    </span>
                    <span className="text-xs font-mono text-zinc-500 uppercase">
                      ({currency})
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                  ✓ Téléchargement direct
                </span>
              </div>

              {isOwned ? (
                <button
                  onClick={handleDownload}
                  className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black font-mono text-sm uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>📥</span>
                  <span>TÉLÉCHARGER MON FICHIER EPUB (DÉJÀ ACQUIS)</span>
                </button>
              ) : (
                <button
                  onClick={handleBuy}
                  disabled={isBuying}
                  className="w-full py-4 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-black font-mono text-sm uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>🛒</span>
                  <span>
                    {isBuying
                      ? "PRÉPARATION DU PAIEMENT..."
                      : `ACHETER MAINTENANT (${PRICES[currency].amount} ${PRICES[currency].symbol})`}
                  </span>
                </button>
              )}

              {/* BOUTON EXTRAIT */}
              <button
                onClick={() => setShowReader(true)}
                className="w-full py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-cyan-300 font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border border-zinc-700"
              >
                <span>📖</span>
                <span>LIRE UN EXTRAIT GRATUIT</span>
              </button>

              <div className="text-[11px] text-center font-mono text-zinc-500 pt-1 space-y-1">
                <p>Compatible liseuses Kobo, Kindle, iPhone, iPad, Android et ordinateurs.</p>
                <p>Paiement sécurisé crypté par Stripe.</p>
              </div>
            </div>

            {/* SYNOPSIS */}
            <div className="pt-4 space-y-3">
              <h2 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
                À propos de l'histoire
              </h2>
              <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line space-y-3">
                {BOOK_INFO.description}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── MODALE CONNEXION ── */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6 backdrop-blur-md">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-zinc-100">
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <div>
                  <h2 className="text-base font-bold">Connexion requise</h2>
                  <p className="text-[11px] text-zinc-500 font-mono">Connectez-vous pour finaliser votre commande.</p>
                </div>
                <button type="button" onClick={() => setShowSignInModal(false)} className="text-zinc-400 hover:text-white">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleGoogleConnect}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 cursor-pointer"
                >
                  <GoogleLogo />
                  <span className="text-white text-[10px] font-bold">GOOGLE</span>
                </button>
                <button
                  type="button"
                  onClick={handleMicrosoftConnect}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 cursor-pointer"
                >
                  <MicrosoftLogo />
                  <span className="text-white text-[10px] font-bold">MICROSOFT</span>
                </button>
              </div>

              <div className="h-px bg-zinc-900 my-2" />

              {signInError && (
                <div className="bg-red-950/50 border border-red-500/50 rounded-xl p-3 text-xs text-red-400 font-mono">
                  ⚠️ {signInError}
                </div>
              )}

              <input
                type="email"
                placeholder="Votre adresse courriel"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-cyan-500"
              />
              <input
                type="password"
                placeholder="Votre mot de passe"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-cyan-500"
              />

              <button
                type="submit"
                className="w-full bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Se connecter et continuer
              </button>

              <p className="text-center text-zinc-500 text-xs pt-1">
                Pas encore de compte ?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setShowSignInModal(false);
                    clearAuthInputs();
                    setShowSignUpModal(true);
                  }}
                  className="text-cyan-400 underline font-bold cursor-pointer"
                >
                  S'inscrire
                </button>
              </p>
            </form>
          </div>
        </div>
      )}

      {/* ── MODALE CRÉATION DE COMPTE ── */}
      {showSignUpModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6 backdrop-blur-md">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-zinc-100">
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <div>
                  <h2 className="text-base font-bold">Créer un compte</h2>
                  <p className="text-[11px] text-zinc-500 font-mono">Accédez à votre fichier EPUB immédiatement.</p>
                </div>
                <button type="button" onClick={() => setShowSignUpModal(false)} className="text-zinc-400 hover:text-white">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleGoogleConnect}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 cursor-pointer"
                >
                  <GoogleLogo />
                  <span className="text-white text-[10px] font-bold">GOOGLE</span>
                </button>
                <button
                  type="button"
                  onClick={handleMicrosoftConnect}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 cursor-pointer"
                >
                  <MicrosoftLogo />
                  <span className="text-white text-[10px] font-bold">MICROSOFT</span>
                </button>
              </div>

              <div className="h-px bg-zinc-900 my-2" />

              {signUpError && (
                <div className="bg-red-950/50 border border-red-500/50 rounded-xl p-3 text-xs text-red-400 font-mono">
                  ⚠️ {signUpError}
                </div>
              )}
              {signUpSuccess && (
                <div className="bg-emerald-950/50 border border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-400 font-mono">
                  ✓ {signUpSuccess}
                </div>
              )}

              <input
                type="email"
                placeholder="Votre adresse courriel"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-cyan-500"
              />
              <input
                type="password"
                placeholder="Mot de passe (6 caractères min.)"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-cyan-500"
              />

              <button
                type="submit"
                className="w-full bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Créer mon compte
              </button>

              <p className="text-center text-zinc-500 text-xs pt-1">
                Déjà inscrit ?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setShowSignUpModal(false);
                    clearAuthInputs();
                    setShowSignInModal(true);
                  }}
                  className="text-cyan-400 underline font-bold cursor-pointer"
                >
                  Se connecter
                </button>
              </p>
            </form>
          </div>
        </div>
      )}

      {/* ── MODALE EXTRAIT GRATUIT ── */}
      {showReader && (
        <SimpleReaderModal
          epubUrl={BOOK_INFO.epubUrl}
          titre={BOOK_INFO.titre}
          onClose={() => setShowReader(false)}
          onBuy={handleBuy}
          prix={`${PRICES[currency].amount} ${PRICES[currency].symbol}`}
        />
      )}
    </div>
  );
}

// ── COMPOSANT LISEUSE EPUB D'EXTRAIT ──
function SimpleReaderModal({
  epubUrl,
  titre,
  onClose,
  onBuy,
  prix,
}: {
  epubUrl: string;
  titre: string;
  onClose: () => void;
  onBuy: () => void;
  prix: string;
}) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const [pages, setPages] = useState<number>(0);
  const [limit, setLimit] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const ePub = (await import("epubjs")).default;
        const res = await fetch(encodeURI(epubUrl));
        const buffer = await res.arrayBuffer();
        if (!isMounted || !viewerRef.current) return;

        const book = ePub(buffer);
        const rendition = book.renderTo(viewerRef.current, {
          width: "100%",
          height: "100%",
          flow: "paginated",
        });
        renditionRef.current = rendition;

        rendition.themes.override("color", "#2c2222");
        rendition.themes.override("background", "#f4ecd8");
        rendition.themes.fontSize("18px");

        await rendition.display();
      } catch {}
    })();

    return () => {
      isMounted = false;
      try { renditionRef.current?.destroy(); } catch {}
    };
  }, [epubUrl]);

  const next = () => {
    if (pages >= 6) {
      setLimit(true);
      return;
    }
    renditionRef.current?.next();
    setPages((p) => p + 1);
  };

  const prev = () => {
    renditionRef.current?.prev();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-3xl h-[85vh] bg-[#f4ecd8] text-[#2c2222] rounded-3xl overflow-hidden flex flex-col relative shadow-2xl">
        <div className="px-6 py-3 border-b border-[#e2d5b8] flex justify-between items-center text-xs font-mono font-bold">
          <span>EXTRAIT : {titre}</span>
          <button onClick={onClose} className="text-sm cursor-pointer hover:opacity-60">✕ Fermer</button>
        </div>

        <div className="flex-1 relative p-4">
          <div ref={viewerRef} className="w-full h-full" />
          {limit && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 text-center text-white">
              <div className="max-w-md space-y-4">
                <h3 className="text-base font-bold font-mono text-cyan-400 uppercase">Fin de l'échantillon gratuit</h3>
                <p className="text-xs text-zinc-300">
                  Débloquez le livre complet en format .EPUB pour continuer votre lecture sans interruption.
                </p>
                <button
                  onClick={onBuy}
                  className="w-full py-3.5 rounded-xl bg-cyan-400 text-zinc-950 font-black font-mono text-xs uppercase cursor-pointer hover:bg-cyan-300 shadow-lg"
                >
                  Acheter le roman ({prix})
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-[#e2d5b8] flex justify-between items-center text-xs font-mono">
          <button onClick={prev} className="px-3 py-1 rounded border border-zinc-400 cursor-pointer hover:bg-black/5">← Précédent</button>
          <span>Page extrait {pages + 1} / 7</span>
          <button onClick={next} className="px-3 py-1 rounded border border-zinc-400 cursor-pointer hover:bg-black/5">Suivant →</button>
        </div>
      </div>
    </div>
  );
}