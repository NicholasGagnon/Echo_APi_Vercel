"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type CurrencyCode = "EUR" | "CAD" | "USD";

interface Tome {
  id: string;
  numero: number;
  titre: string;
  soustitre: string;
  pages: number;
  couverture: string;
  epubUrl: string;
  badge?: string;
  accroche: string;
  description: string;
}

const TOMES_TRILOGIE: Tome[] = [
  {
    id: "lenfant-intouchable-1",
    numero: 1,
    titre: "L'enfant intouchable",
    soustitre: "Tome 1",
    pages: 280,
    couverture: "/livres/enfant%20couverture%20reel%201.png",
    epubUrl: "/livres/Lenfant-intouchable.epub",
    badge: "TOME 1",
    accroche: "Une maison d'un blanc immaculé. Une fillette de onze ans au sourire d'ange que tout le monde veut protéger... à ses dépens.",
    description: `Une maison d'un blanc immaculé. Une lumière aveuglante. Et au milieu, une petite fille de onze ans au sourire d'ange que le monde entier veut protéger... à ses propres dépens.

Sandrine aime sa fille, Maggie, d'un amour viscéral, absolu et profondément maladif. Pour ne pas risquer de perdre un seul millimètre de l'affection de son enfant, Sandrine s'épuise à maintenir l'illusion d'un foyer parfait. Elle nettoie, elle récure, elle efface frénétiquement la moindre imperfection physique ou morale de leur quotidien.

Mais sous la candeur de Maggie se cache une mécanique d'une froideur clinique. L'enfant ne subit pas son monde ; elle le façonne. Avec une intelligence machiavélique, elle tisse sa toile autour d'une mère dépendante, manipule les adultes et pousse un à un les hommes qui l'approchent vers leur propre destruction. Le nouveau prétendant un peu trop moralisateur, l'adolescent arrogant du voisinage, le simple livreur de pizza improvisé en héros d'un jour... tous deviennent les pions d'un jeu dont elle seule connaît les règles.

Le plus terrifiant ? Ce sont les institutions elles-mêmes — la police, les travailleurs sociaux — qui, aveuglées par l'apparente innocence de Maggie, se transforment en complices de son impunité et condamnent ses victimes.

Pendant que Sandrine nettoie les dégâts en surface par amour, Maggie descend au sous-sol pour reboucher les trous. Derrière le mur de gypse, dans l'obscurité, repose l'erreur originelle. Celle qu'elle a scellée pour toujours.`,
  },
  {
    id: "lenfant-intouchable-2",
    numero: 2,
    titre: "L'enfant intouchable 2",
    soustitre: "Tome 2",
    pages: 295,
    couverture: "/livres/Enfant%20Intouchable%202.png",
    epubUrl: "/livres/Lenfant-intouchable-2.epub",
    badge: "TOME 2",
    accroche: "Le mal a le visage de l'innocence. Quand une simple soirée de courses bascule dans une hystérie collective orchestrée.",
    description: `Le mal a le visage de l'innocence.

Dans leur grande maison épurée, Sandrine croit enfin avoir trouvé le bonheur et la sérénité. Elle vit pour sa fille Maggie, une fillette de onze ans à la beauté angélique et au charme irrésistible. Pour Sandrine, chaque geste, chaque repas et chaque attention est une offrande pour préserver ce sanctuaire parfait, loin des ombres du passé.

Mais sous la surface lisse de cette relation fusionnelle se cache une réalité bien plus sombre. Maggie n'est pas une enfant ordinaire. Derrière son regard clair et ses élans d'affection se terre une composante glaçante : une capacité hors norme à orchestrer le chaos, à tordre la réalité et à manipuler les adultes avec une précision chirurgicale.

Ce qui devait être une simple soirée de courses au supermarché local bascule rapidement dans l'horreur. Un conflit banal dans un stationnement, un mot d'appel au secours mystérieux laissé dans une cabine d'essayage, et une série de fausses accusations... En quelques minutes, Maggie allume la mèche d'une bombe psychologique.

Alors que la foule cède à l'hystérie collective, que les clients s'érigent en juges et que la police s'englue dans un réseau de mensonges, le piège de la fillette se referme sur des victimes innocentes. Prête à tout pour protéger son ange, Sandrine s'enfonce aveuglément dans cette spirale de violence, incapable de percevoir le véritable monstre qui guide ses pas.`,
  },
  {
    id: "lenfant-intouchable-3",
    numero: 3,
    titre: "L'enfant intouchable 3",
    soustitre: "Tome 3",
    pages: 310,
    couverture: "/livres/couverture3rose.png",
    epubUrl: "/livres/Lenfant-intouchable-3.epub",
    badge: "FINAL",
    accroche: "Le dénouement. Une nouvelle venue entre dans l'histoire... alliée providentielle ou menace fatale ?",
    description: `Le danger n'a pas dit son dernier mot…

Dans ce troisième tome de L'Enfant intouchable, les tensions montent et les apparences deviennent de plus en plus trompeuses. Alors que les événements prennent une tournure inquiétante, Sandrine, Maggie et Roxanne se retrouvent entraînées dans une succession de situations où la confiance peut devenir une faiblesse et où chaque décision risque d'avoir des conséquences.

Mais une nouvelle venue pourrait bien changer la donne… Camille fait son entrée dans l'histoire. Derrière son attitude et son intuition se cache une jeune fille qui pourrait se révéler bien plus importante qu'on ne le croit. Mais qui est-elle vraiment? Jusqu'où est-elle capable d'aller? Et surtout… est-elle une alliée sur laquelle on peut compter, ou une menace dont il faudrait se méfier?

Entre secrets, confrontations et alliances incertaines, les blessures du passé et les dangers du présent se croisent. Dans cette histoire, les apparences peuvent être trompeuses, et il suffit parfois d'une seule personne pour tout bouleverser. Camille est-elle là pour aider… ou pour compliquer les choses? Une chose est certaine : personne ne sortira indemne de cette histoire.`,
  },
];

const AUTRES_LIVRES_RECOMMANDES = [
  {
    titre: "Les Enfants Rois",
    categorie: "Drame Psychologique",
    couverture: "/livres/couvertureterminer.png",
    lien: "/les-enfants-rois",
  },
  {
    titre: "La Proposition",
    categorie: "Roman & Suspense",
    couverture: "/livres/La Proposition.png",
    lien: "https://echosai.ca",
  },
  {
    titre: "Le Sang du Fauve",
    categorie: "Roman & Suspense",
    couverture: "/livres/Le sang du fauve couverture2.png",
    lien: "https://echosai.ca",
  },
  {
    titre: "Fracture Cognitive",
    categorie: "Thriller Psychologique",
    couverture: "/livres/Couverture.png",
    lien: "https://echosai.ca",
  },
];

const CURRENCIES: CurrencyCode[] = ["EUR", "CAD", "USD"];

const PRICES: Record<CurrencyCode, { amount: string; symbol: string }> = {
  EUR: { amount: "2.50", symbol: "€" },
  CAD: { amount: "2.50", symbol: "CA$" },
  USD: { amount: "2.50", symbol: "US$" },
};

const MicrosoftLogo = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 23 23" fill="none">
    <path d="M0 0H11V11H0V0Z" fill="#F25022"/>
    <path d="M12 0H23V11H12V0Z" fill="#7FBA00"/>
    <path d="M0 12H11V23H0V12Z" fill="#00A4EF"/>
    <path d="M12 12H23V23H12V12Z" fill="#FFB900"/>
  </svg>
);

const GoogleLogo = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 2.18 2.18 4.94l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

export default function TrilogieEnfantIntouchablePage() {
  const [currency, setCurrency] = useState<CurrencyCode>("EUR");
  const [user, setUser] = useState<any>(null);
  const [ownedBookIds, setOwnedBookIds] = useState<string[]>([]);
  const [selectedTomeIndex, setSelectedTomeIndex] = useState<number>(0);
  const [isBuying, setIsBuying] = useState<boolean>(false);
  const [readingTome, setReadingTome] = useState<Tome | null>(null);

  // Authentification
  const [showSignInModal, setShowSignInModal] = useState<boolean>(false);
  const [showSignUpModal, setShowSignUpModal] = useState<boolean>(false);
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signInSuccess, setSignInSuccess] = useState<string | null>(null);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState<string | null>(null);

  const currentTome = TOMES_TRILOGIE[selectedTomeIndex];
  const isCurrentOwned = ownedBookIds.includes(currentTome.id);

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

  const chargerAchats = async (uid: string) => {
    try {
      const { data } = await supabase
        .from("user_books")
        .select("book_id")
        .eq("user_id", uid);

      if (data) {
        setOwnedBookIds(data.map((r: any) => r.book_id));
      }
    } catch {}
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        chargerAchats(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
        setShowSignInModal(false);
        setShowSignUpModal(false);
        clearAuthInputs();
        chargerAchats(session.user.id);
      } else {
        setUser(null);
        setOwnedBookIds([]);
      }
    });

    triggerXEvent("tw-rhzsa-rih44", {
      content_name: "Trilogie L'enfant intouchable",
      content_id: "trilogie-enfant-intouchable",
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
      setSignInError("Veuillez renseigner votre courriel et votre mot de passe.");
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
      setSignUpError("Veuillez renseigner un courriel et un mot de passe.");
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

  const handleBuyTome = async (tome: Tome) => {
    setReadingTome(null);
    triggerXEvent("tw-rhzsa-rih5p", { content_name: tome.titre });

    if (!user) {
      triggerXEvent("tw-rhzsa-rih5l", {});
      setShowSignInModal(true);
      return;
    }

    setIsBuying(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          currency: currency.toUpperCase(),
          bookId: tome.id,
          bookTitle: tome.titre,
        }),
      });

      const data = await res.json();
      if (data && typeof data.url === "string" && data.url.startsWith("https://")) {
        triggerXEvent("tw-rhzsa-rih5s", {
          content_name: tome.titre,
          value: PRICES[currency].amount,
          currency: currency,
        });
        setTimeout(() => {
          window.location.href = data.url;
        }, 300);
      } else {
        setIsBuying(false);
        alert("Erreur lors de la création de la session d'achat.");
      }
    } catch {
      setIsBuying(false);
      alert("Impossible de joindre le service de paiement.");
    }
  };

  const handleDownload = (tome: Tome) => {
    const link = document.createElement("a");
    link.href = encodeURI(tome.epubUrl);
    link.download = `${tome.titre}.epub`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 font-sans antialiased selection:bg-cyan-500/20">
      
      {/* ── HEADER ── */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md px-6 lg:px-12 py-4 sticky top-0 z-40 shadow-2xl">
        <div className="max-w-[1700px] mx-auto flex justify-between items-center gap-4 flex-wrap">
          
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-zinc-900 border border-zinc-700 hover:border-cyan-400 text-zinc-200 hover:text-white font-mono text-xs font-black transition-all shadow-md group"
            >
              <span className="text-base group-hover:scale-110 transition-transform">🏠</span>
              <span>Accueil</span>
            </Link>

            <Link
              href="/"
              className="hidden md:flex items-center gap-2 font-mono font-bold text-xs text-zinc-400 hover:text-cyan-400 transition-colors"
            >
              <span>←</span>
              <span>Catalogue Librairie</span>
            </Link>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
            <div className="flex border border-zinc-700 rounded-2xl overflow-hidden bg-zinc-900 text-xs font-mono font-bold shadow-sm">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-4 py-2 transition-colors cursor-pointer ${
                    currency === c ? "bg-cyan-400 text-zinc-950 shadow-inner font-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {c} ({PRICES[c].symbol})
                </button>
              ))}
            </div>

            <div className="flex border border-zinc-700 rounded-2xl overflow-hidden bg-zinc-900 text-xs font-mono font-bold shadow-sm">
              <span className="px-4 py-2 bg-zinc-800 text-cyan-400 font-black">FR</span>
              <Link
                href="/the-untouchable-child"
                className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
              >
                EN
              </Link>
            </div>

            {user ? (
              <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-2xl text-xs font-mono">
                <span className="text-zinc-300 font-bold">🟢 {user.email}</span>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="text-red-400 hover:text-red-300 font-bold ml-2 cursor-pointer"
                >
                  [ Déconnexion ]
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 font-mono text-xs">
                <button
                  onClick={() => {
                    triggerXEvent("tw-rhzsa-rih5l", {});
                    clearAuthInputs();
                    setShowSignInModal(true);
                  }}
                  className="px-5 py-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold transition-all cursor-pointer shadow-sm"
                >
                  Connexion
                </button>
                <button
                  onClick={() => {
                    clearAuthInputs();
                    setShowSignUpModal(true);
                  }}
                  className="px-6 py-2 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-black transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.35)]"
                >
                  Créer un compte
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── CONTENU PRINCIPAL ── */}
      <main className="max-w-[1700px] mx-auto px-6 lg:px-12 py-8 lg:py-10 space-y-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12 items-start">
          
          {/* ── COLONNE GAUCHE ── */}
          <aside className="lg:col-span-4 xl:col-span-3 bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="border-b border-zinc-800/80 pb-3">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-black block">
                Autres Sélections
              </span>
              <h2 className="text-sm font-black uppercase text-zinc-100 mt-1">
                Autres livres de l'auteur
              </h2>
            </div>

            <div className="space-y-3">
              {AUTRES_LIVRES_RECOMMANDES.map((autre, index) => (
                <a
                  key={index}
                  href={autre.lien}
                  className="group flex gap-4 items-center p-2.5 rounded-2xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/80 hover:border-cyan-500/60 transition-all shadow-md"
                >
                  <div className="w-14 h-20 rounded-xl overflow-hidden shrink-0 bg-zinc-950 border border-zinc-800 shadow-md">
                    <img
                      src={autre.couverture}
                      alt={autre.titre}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-mono uppercase text-cyan-400 block truncate font-black">
                      {autre.categorie}
                    </span>
                    <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate mt-0.5">
                      {autre.titre}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs font-mono text-zinc-400 group-hover:text-cyan-400 font-semibold">
                        Voir la fiche
                      </span>
                      <span className="text-xs text-zinc-500 group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <div className="pt-2">
              <Link
                href="/"
                className="w-full py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-mono text-xs flex items-center justify-center transition-colors font-bold shadow-sm"
              >
                Tout le catalogue (17) →
              </Link>
            </div>
          </aside>

          {/* ── ZONE CENTRALE : COUVERTURE + ACTIONS D'ACHAT & LECTURE ── */}
          <div className="lg:col-span-8 xl:col-span-9 grid grid-cols-1 md:grid-cols-12 gap-8 xl:gap-12 items-start">
            
            <div className="md:col-span-5 flex flex-col items-center">
              <div className="relative w-full max-w-[360px] aspect-[2/3] rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-zinc-800 group">
                <img
                  src={currentTome.couverture}
                  alt={currentTome.titre}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 bg-cyan-400 text-zinc-950 font-black font-mono text-xs uppercase px-3.5 py-1.5 rounded-full shadow-xl">
                  {currentTome.badge}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs font-mono text-zinc-400 text-center font-bold">
                <span>📖 {currentTome.pages} pages</span>
                <span>•</span>
                <span>⚡ Format .EPUB sans DRM</span>
              </div>
            </div>

            <div className="md:col-span-7 space-y-5">
              <div>
                <span className="text-xs font-mono font-black uppercase tracking-widest text-cyan-400 block mb-1">
                  Trilogie Complète · {currentTome.soustitre}
                </span>
                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                  {currentTome.titre}
                </h1>
                <p className="text-xs font-mono text-zinc-400 mt-1">
                  Roman thriller de <strong className="text-zinc-200">Nicholas Gagnon</strong>
                </p>
              </div>

              <p className="text-sm md:text-base text-zinc-200 font-medium leading-relaxed italic border-l-4 border-cyan-400 pl-4 bg-zinc-950/40 py-2 rounded-r-2xl">
                « {currentTome.accroche} »
              </p>

              {/* ENCADRÉ D'ACHAT DIRECT */}
              <div className="p-6 rounded-3xl bg-zinc-900/90 border-2 border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.18)] space-y-4">
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="text-xs font-mono uppercase text-zinc-400 block font-black tracking-wider">
                      Prix du tome complet :
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-4xl md:text-5xl font-black text-white font-mono tracking-tight">
                        {PRICES[currency].amount} {PRICES[currency].symbol}
                      </span>
                      <span className="text-xs font-mono text-zinc-500 uppercase font-bold">
                        ({currency})
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-xl font-black">
                    ✓ Téléchargement permanent
                  </span>
                </div>

                {isCurrentOwned ? (
                  <div className="space-y-3">
                    {/* BOUTON 1 : LISEUSE INTÉGRALE DÉBLOQUÉE */}
                    <button
                      onClick={() => setReadingTome(currentTome)}
                      className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black font-mono text-sm uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>📖</span>
                      <span>LIRE CE TOME EN LIGNE (INTÉGRALITÉ)</span>
                    </button>

                    {/* BOUTON 2 : TÉLÉCHARGEMENT DIRECT EPUB */}
                    <button
                      onClick={() => handleDownload(currentTome)}
                      className="w-full py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-emerald-500/40 font-mono text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>📥</span>
                      <span>TÉLÉCHARGER LE FICHIER .EPUB (ACHETÉ)</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* BOUTON ACHAT STRIPE */}
                    <button
                      onClick={() => handleBuyTome(currentTome)}
                      disabled={isBuying}
                      className="w-full py-4.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-black font-mono text-sm md:text-base uppercase tracking-wider transition-all shadow-[0_0_30px_rgba(6,182,212,0.45)] hover:scale-[1.01] flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                    >
                      <span className="text-lg">🛒</span>
                      <span>
                        {isBuying
                          ? "PRÉPARATION DU PAIEMENT..."
                          : `ACHETER CE TOME (${PRICES[currency].amount} ${PRICES[currency].symbol})`}
                      </span>
                    </button>

                    {/* BOUTON EXTRAIT */}
                    <button
                      onClick={() => setReadingTome(currentTome)}
                      className="w-full py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-cyan-300 font-mono text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border border-zinc-700 shadow-md"
                    >
                      <span>📖</span>
                      <span>LIRE UN EXTRAIT GRATUIT</span>
                    </button>
                  </div>
                )}

                <div className="text-[11px] text-center font-mono text-zinc-400 pt-0.5 space-y-0.5">
                  <p>Format .EPUB universel sans DRM · Liseuse en ligne, Kobo, Kindle, Apple Books, Android.</p>
                  <p className="text-zinc-500">Paiement sécurisé crypté par Stripe.</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── LES 3 TOMES CÔTE À CÔTE ── */}
        <section className="pt-6 border-t border-zinc-800/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs font-mono font-black uppercase tracking-widest text-cyan-400 block">
                Trilogie complète
              </span>
              <h2 className="text-lg font-black uppercase text-white">
                Sélectionnez votre tome (1, 2 ou 3)
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-500">
              3 tomes disponibles
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TOMES_TRILOGIE.map((tome, idx) => {
              const isSelected = selectedTomeIndex === idx;
              const isTomeOwned = ownedBookIds.includes(tome.id);

              return (
                <div
                  key={tome.id}
                  onClick={() => {
                    setSelectedTomeIndex(idx);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`cursor-pointer rounded-3xl p-4 border transition-all duration-300 flex items-center gap-4 relative group ${
                    isSelected
                      ? "bg-zinc-900 border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)] scale-[1.02]"
                      : "bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-600 hover:bg-zinc-900/50"
                  }`}
                >
                  <div className="relative w-20 h-28 rounded-xl overflow-hidden shrink-0 shadow-lg border border-zinc-800 bg-zinc-950">
                    <img
                      src={tome.couverture}
                      alt={tome.titre}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-1.5 left-1.5 bg-cyan-400 text-zinc-950 font-black font-mono text-[9px] uppercase px-1.5 py-0.5 rounded shadow">
                      {tome.badge}
                    </div>
                    {isTomeOwned && (
                      <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-zinc-950 font-black font-mono text-[9px] uppercase px-1.5 py-0.5 rounded shadow">
                        ✓
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold block">
                      {tome.soustitre} · {tome.pages} p.
                    </span>
                    <h3 className="text-sm font-black text-white uppercase truncate mt-0.5">
                      {tome.titre}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-black font-mono text-white">
                        {isTomeOwned ? (
                          <span className="text-emerald-400 font-bold">✓ ACHETÉ</span>
                        ) : (
                          `${PRICES[currency].amount} ${PRICES[currency].symbol}`
                        )}
                      </span>
                      <span className={`text-[11px] font-mono font-bold ${isSelected ? "text-cyan-400" : "text-zinc-500"}`}>
                        {isSelected ? "● Affiché" : "Choisir →"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── SYNOPSIS COMPLET DU TOME ── */}
        <section className="bg-zinc-950/60 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 space-y-3">
          <h3 className="text-xs font-mono font-black text-cyan-400 uppercase tracking-widest">
            À propos de {currentTome.titre} ({currentTome.soustitre})
          </h3>
          <div className="text-sm md:text-base text-zinc-300 leading-relaxed whitespace-pre-line space-y-4">
            {currentTome.description}
          </div>
        </section>

      </main>

      {/* ── MODALE CONNEXION ── */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 sm:p-6 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 sm:p-12 max-w-xl w-full shadow-2xl text-zinc-100 relative space-y-6">
            <button
              type="button"
              onClick={() => setShowSignInModal(false)}
              className="absolute top-6 right-6 text-zinc-400 hover:text-white text-lg p-2 cursor-pointer"
            >
              ✕
            </button>

            <div className="border-b border-zinc-800 pb-4">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">Connexion requise</h2>
              <p className="text-sm text-zinc-400 font-sans mt-1">
                Connectez-vous pour finaliser votre commande et accéder à votre fichier.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGoogleConnect}
                className="flex items-center justify-center gap-3 px-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 cursor-pointer transition-colors shadow-sm"
              >
                <GoogleLogo />
                <span className="text-white text-xs font-bold uppercase tracking-wider font-mono">GOOGLE</span>
              </button>
              <button
                type="button"
                onClick={handleMicrosoftConnect}
                className="flex items-center justify-center gap-3 px-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 cursor-pointer transition-colors shadow-sm"
              >
                <MicrosoftLogo />
                <span className="text-white text-xs font-bold uppercase tracking-wider font-mono">MICROSOFT</span>
              </button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="flex-shrink mx-4 text-xs font-mono text-zinc-500 uppercase">ou par courriel</span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            {signInError && (
              <div className="bg-red-950/60 border border-red-500/60 rounded-2xl p-4 text-xs text-red-300 font-mono">
                ⚠️ {signInError}
              </div>
            )}

            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5 font-bold">
                  Adresse courriel
                </label>
                <input
                  type="email"
                  placeholder="nom@exemple.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-cyan-400 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5 font-bold">
                  Mot de passe
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-cyan-400 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-black py-4 rounded-2xl text-sm uppercase tracking-wider font-mono transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.3)] mt-2"
              >
                Se connecter et continuer
              </button>
            </form>

            <p className="text-center text-zinc-400 text-xs pt-2">
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
                Créer un compte
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ── MODALE CRÉATION DE COMPTE ── */}
      {showSignUpModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 sm:p-6 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 sm:p-12 max-w-xl w-full shadow-2xl text-zinc-100 relative space-y-6">
            <button
              type="button"
              onClick={() => setShowSignUpModal(false)}
              className="absolute top-6 right-6 text-zinc-400 hover:text-white text-lg p-2 cursor-pointer"
            >
              ✕
            </button>

            <div className="border-b border-zinc-800 pb-4">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">Créer mon compte</h2>
              <p className="text-sm text-zinc-400 font-sans mt-1">
                Enregistrez-vous en quelques secondes pour débloquer votre accès EPUB permanent.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGoogleConnect}
                className="flex items-center justify-center gap-3 px-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 cursor-pointer transition-colors shadow-sm"
              >
                <GoogleLogo />
                <span className="text-white text-xs font-bold uppercase tracking-wider font-mono">GOOGLE</span>
              </button>
              <button
                type="button"
                onClick={handleMicrosoftConnect}
                className="flex items-center justify-center gap-3 px-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 cursor-pointer transition-colors shadow-sm"
              >
                <MicrosoftLogo />
                <span className="text-white text-xs font-bold uppercase tracking-wider font-mono">MICROSOFT</span>
              </button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="flex-shrink mx-4 text-xs font-mono text-zinc-500 uppercase">ou par courriel</span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            {signUpError && (
              <div className="bg-red-950/60 border border-red-500/60 rounded-2xl p-4 text-xs text-red-300 font-mono">
                ⚠️ {signUpError}
              </div>
            )}
            {signUpSuccess && (
              <div className="bg-emerald-950/60 border border-emerald-500/60 rounded-2xl p-4 text-xs text-emerald-300 font-mono">
                ✓ {signUpSuccess}
              </div>
            )}

            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5 font-bold">
                  Votre adresse courriel
                </label>
                <input
                  type="email"
                  placeholder="nom@exemple.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-cyan-400 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5 font-bold">
                  Mot de passe (minimum 6 caractères)
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-cyan-400 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-black py-4 rounded-2xl text-sm uppercase tracking-wider font-mono transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.3)] mt-2"
              >
                Créer mon compte
              </button>
            </form>

            <p className="text-center text-zinc-400 text-xs pt-2">
              Déjà un compte ?{" "}
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
          </div>
        </div>
      )}

      {/* ── LISEUSE EPUB (EXTRAIT OU VERSION INTÉGRALE DÉBLOQUÉE) ── */}
      {readingTome && (
        <SimpleReaderModal
          epubUrl={readingTome.epubUrl}
          titre={readingTome.titre}
          isFullVersion={ownedBookIds.includes(readingTome.id)}
          onClose={() => setReadingTome(null)}
          onBuy={() => handleBuyTome(readingTome)}
          prix={`${PRICES[currency].amount} ${PRICES[currency].symbol}`}
        />
      )}

    </div>
  );
}

// ── COMPOSANT LISEUSE EPUB D'EXTRAIT (16 PAGES) ──
function SimpleReaderModal({
  epubUrl,
  titre,
  isFullVersion = false,
  onClose,
  onBuy,
  prix,
}: {
  epubUrl: string;
  titre: string;
  isFullVersion?: boolean;
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
    // Limite fixée à 16 pages pour les extraits (indices 0 à 15)
    if (!isFullVersion && pages >= 15) {
      setLimit(true);
      return;
    }
    renditionRef.current?.next();
    setPages((p) => p + 1);
  };

  const prev = () => {
    if (pages > 0) {
      renditionRef.current?.prev();
      setPages((p) => p - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-3xl h-[85vh] bg-[#f4ecd8] text-[#2c2222] rounded-3xl overflow-hidden flex flex-col relative shadow-2xl">
        <div className="px-6 py-3 border-b border-[#e2d5b8] flex justify-between items-center text-xs font-mono font-bold">
          <div className="flex items-center gap-2">
            <span>{isFullVersion ? "LECTURE INTÉGRALE :" : "EXTRAIT :"} {titre}</span>
            {isFullVersion && (
              <span className="bg-emerald-600 text-white text-[9px] px-2 py-0.5 rounded-full uppercase">
                ✓ Version Complète
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-sm cursor-pointer hover:opacity-60">✕ Fermer</button>
        </div>

        <div className="flex-1 relative p-4">
          <div ref={viewerRef} className="w-full h-full" />
          {limit && !isFullVersion && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 text-center text-white z-10">
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
          <span>
            {isFullVersion
              ? `Page lue : ${pages + 1}`
              : `Page extrait ${pages + 1} / 16`}
          </span>
          <button onClick={next} className="px-3 py-1 rounded border border-zinc-400 cursor-pointer hover:bg-black/5">Suivant →</button>
        </div>
      </div>
    </div>
  );
}