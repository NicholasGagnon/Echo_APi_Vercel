"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Lang = "fr" | "en";
const STEPS = 7;

// ── LOGOS ──────────────────────────────────────────────────────────────────
const MicrosoftLogo = () => (
  <svg width="16" height="16" viewBox="0 0 23 23" fill="none">
    <path d="M0 0H11V11H0V0Z" fill="#F25022"/>
    <path d="M12 0H23V11H12V0Z" fill="#7FBA00"/>
    <path d="M0 12H11V23H0V12Z" fill="#00A4EF"/>
    <path d="M12 12H23V23H12V12Z" fill="#FFB900"/>
  </svg>
);
const GoogleLogo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.18 2.18 5.94l3.66 2.84c.87-2.6 3.3-4.4 6.16-4.4z" fill="#EA4335"/>
  </svg>
);

// ── DICTIONNAIRE ───────────────────────────────────────────────────────────
const D = {
  nav: {
    fr: { home:"Accueil", conv:"Conversation", fiches:"Fiches", inscription:"Inscription" },
    en: { home:"Home",    conv:"Conversation", fiches:"Listings", inscription:"Register"  },
  },
  titre:    { fr:"Créer ma fiche",   en:"Create my listing"   },
  suivant:  { fr:"Suivant",          en:"Next"                 },
  precedent:{ fr:"Précédent",        en:"Back"                 },
  soumettre:{ fr:"Créer ma fiche",   en:"Create my listing"   },
  chargement:{ fr:"Création...",     en:"Creating..."          },
  erreur:   { fr:"Une erreur est survenue. Réessaie.", en:"An error occurred. Please try again." },

  // ── ÉTAPE 7 — Choix des destinations ──────────────────────────────────────
  pubTitle:      { fr:"Où veux-tu publier ?", en:"Where do you want to publish?" },
  pubSub:        { fr:"Coche au moins une option. Tu peux en choisir plusieurs.", en:"Check at least one option. You can choose several." },
  pubFicheLabel: { fr:"🔍 Explorer les projets", en:"🔍 Explore projects" },
  pubFicheDesc:  { fr:"Ta fiche complète, visible publiquement — les gens t'envoient un intérêt.", en:"Your full listing, publicly visible — people send you interest." },
  pubTalkLabel:  { fr:"💬 Avis de la communauté", en:"💬 Community feedback" },
  pubTalkDesc:   { fr:"Obtiens des réactions rapides de la communauté sur ton pitch.", en:"Get quick community reactions to your pitch." },
  pubAuditLabel: { fr:"🔎 Audition de site web", en:"🔎 Website audit" },
  pubAuditDesc:  { fr:"Soumets ton site pour un vrai retour visuel — accueil, message, tunnel.", en:"Submit your site for real visual feedback — homepage, message, funnel." },
  pubNone:       { fr:"Choisis au moins une destination avant de continuer.", en:"Choose at least one destination before continuing." },
  pseudoNeeded:  { fr:"Un pseudo est nécessaire pour Talk et Audit.", en:"A nickname is required for Talk and Audit." },
  auditUrlLabel: { fr:"URL du site à auditer *", en:"URL of the site to audit *" },
  auditImgLabel: { fr:"Images de ton site (accueil, tunnel, etc.)", en:"Images of your site (homepage, funnel, etc.)" },
  auditImgHint:  { fr:"Ajoute plusieurs captures pour créer une vraie cartographie de ton site.", en:"Add several screenshots to create a real map of your site." },
  auditImgAdd:   { fr:"+ Ajouter une image", en:"+ Add an image" },

  etapes: {
    fr: ["Projet","Avancement","Objectifs","Collaboration","Technologies","Profil","Publier"],
    en: ["Project","Progress","Goals","Collaboration","Technologies","Profile","Publish"],
  },

  nom_projet:   { fr:"Nom du projet *",    en:"Project name *"      },
  description:  { fr:"Description *",      en:"Description *"       },
  desc_hint:    { fr:"Explique ton projet comme si tu l'expliquais à un ami.", en:"Explain your project as if talking to a friend." },
  type_projet:  { fr:"Type de projet",     en:"Project type"        },
  type_profil:  { fr:"Type de profil",     en:"Profile type"        },

  types_projet: {
    fr: ["SaaS","App mobile","Contenu","E-commerce","Communauté","Outil interne","Autre"],
    en: ["SaaS","Mobile app","Content","E-commerce","Community","Internal tool","Other"],
  },
  profil_options: {
    fr: ["Je fais tout moi-même et je suis seul.","Je fais tout moi-même mais je suis déjà accompagné.","Nous sommes deux sur le projet.","Nous sommes plusieurs sur le projet.","Autre."],
    en: ["I do everything myself and I'm alone.","I do everything myself but I already have someone.","We are two on the project.","We are several on the project.","Other."],
  },

  idee_label:   { fr:"L'idée globale est :",      en:"The overall idea is:"    },
  avanc_label:  { fr:"Le projet est :",           en:"The project is:"         },
  produit_label:{ fr:"Produit fonctionnel :",     en:"Functional product:"     },
  users_label:  { fr:"Nombre d'utilisateurs :",   en:"Number of users:"        },
  revenus_label:{ fr:"Revenus mensuels :",        en:"Monthly revenue:"        },

  idee_options: {
    fr: ["Je découvre encore mon idée.","J'ai une idée assez claire.","Mon idée est bien définie.","Autre."],
    en: ["I'm still exploring my idea.","I have a fairly clear idea.","My idea is well defined.","Other."],
  },
  avancement_options: {
    fr: ["Encore sur papier.","En cours de construction.","Partiellement fonctionnel.","Utilisable par certaines personnes.","Accessible au public.","Autre."],
    en: ["Still on paper.","Under construction.","Partially functional.","Usable by some people.","Publicly accessible.","Other."],
  },
  produit_options: {
    fr: ["Non.","Partiellement.","Oui.","Autre."],
    en: ["No.","Partially.","Yes.","Other."],
  },
  utilisateurs_options: {
    fr: ["Aucun pour le moment.","Quelques utilisateurs.","Quelques dizaines.","Quelques centaines.","Plus de 1000.","Je préfère ne pas répondre."],
    en: ["None yet.","A few users.","A few dozen.","A few hundred.","More than 1000.","I'd rather not say."],
  },
  revenus_options: {
    fr: ["Aucun.","Quelques dollars.","Quelques centaines.","Quelques milliers.","Plus.","Je préfère ne pas répondre."],
    en: ["None.","A few dollars.","A few hundred.","A few thousand.","More.","I'd rather not say."],
  },

  court_label:  { fr:"Court terme (1 à 3 mois)",   en:"Short term (1 to 3 months)"   },
  moyen_label:  { fr:"Moyen terme (6 à 12 mois)",  en:"Medium term (6 to 12 months)" },
  long_label:   { fr:"Long terme",                  en:"Long term"                    },
  court_hint:   { fr:"Finir le prototype, trouver un collaborateur...", en:"Finish the prototype, find a collaborator..." },

  cherche_label:   { fr:"Qu'est-ce que tu recherches ?", en:"What are you looking for?"    },
  temps_label:     { fr:"Temps disponible par semaine :", en:"Time available per week:"     },
  distance_label:  { fr:"Collaboration recherchée :",    en:"Preferred collaboration:"      },
  engagement_label:{ fr:"Niveau d'engagement :",        en:"Engagement level:"             },

  cherche_options: {
    fr: ["Échange d'audience","Partenariat commercial","Motivation mutuelle","Accountability partner","Brainstorming","Partage d'expérience","Co-développement","Intégration entre projets","Autre"],
    en: ["Audience exchange","Commercial partnership","Mutual motivation","Accountability partner","Brainstorming","Experience sharing","Co-development","Project integration","Other"],
  },
  temps_options: {
    fr: ["Quelques heures.","Quelques soirées.","Une dizaine d'heures.","Temps partiel important.","Temps plein.","Variable."],
    en: ["A few hours.","A few evenings.","About ten hours.","Significant part-time.","Full-time.","Variable."],
  },
  distance_options: {
    fr: ["À distance uniquement.","Locale uniquement.","Les deux.","Peu importe."],
    en: ["Remote only.","Local only.","Both.","Doesn't matter."],
  },
  engagement_options: {
    fr: ["Discussion occasionnelle.","Quelques heures par mois.","Quelques heures par semaine.","Collaboration régulière.","Partenariat long terme.","Association potentielle."],
    en: ["Occasional discussion.","A few hours per month.","A few hours per week.","Regular collaboration.","Long-term partnership.","Potential association."],
  },

  tech_labels: {
    fr: { backend:"Backend", frontend:"Frontend", paiement:"Paiement", ia:"IA", infra:"Infrastructure", automatisation:"Automatisation" },
    en: { backend:"Backend", frontend:"Frontend", paiement:"Payment",  ia:"AI", infra:"Infrastructure", automatisation:"Automation"     },
  },

  nom_complet_label:  { fr:"Nom complet",         en:"Full name"          },
  pays_label:         { fr:"Pays",                en:"Country"            },
  langue_label:       { fr:"Langue principale",   en:"Primary language"   },
  photo_label:        { fr:"Photo du projet",     en:"Project photo"      },
  photo_hint:         { fr:"Panorama de ta fiche — photo du projet, de toi, ce que tu veux.", en:"Your listing banner — project screenshot, your photo, anything you want." },
  photo_btn:          { fr:"Importer une photo",  en:"Import a photo"     },
  photo_change:       { fr:"Changer la photo",    en:"Change photo"       },
  contacts_titre:     { fr:"Contacts privés",     en:"Private contacts"   },
  contacts_hint:      { fr:"Visibles uniquement après achat. Tu choisis ce que tu rends disponible.", en:"Visible only after purchase. You choose what to share." },
  contacts_label:     { fr:"Que veux-tu rendre visible ?", en:"What do you want to make visible?" },
  email_required:     { fr:"Le courriel est obligatoire.", en:"Email is required."                 },
  email_invalid:      { fr:"Adresse courriel invalide.",   en:"Invalid email address."             },
  email_missing:      { fr:"Un courriel est obligatoire pour créer une fiche.", en:"An email is required to create a listing." },

  confirme_titre: { fr:"Ta fiche est en ligne ! 🎉", en:"Your listing is live! 🎉"             },
  confirme_texte: { fr:"Ta clé personnelle est :",   en:"Your personal key is:"                 },
  confirme_note:  { fr:"Garde-la précieusement — elle t'identifie sur la plateforme.", en:"Keep it safe — it identifies you on the platform." },
  voir_fiches:    { fr:"Voir les fiches",            en:"See listings"                          },

  auth_required_title: { fr:"Connexion requise", en:"Login required" },
  auth_required_text:  { fr:"Tu dois être connecté(e) pour créer ou modifier une fiche. Connecte-toi ou crée un compte pour continuer.", en:"You must be signed in to create or edit a listing. Sign in or create an account to continue." },
  auth_required_btn:   { fr:"Se connecter / S'inscrire", en:"Sign in / Sign up" },

  tab_signin: { fr:"Se connecter", en:"Sign in" },
  tab_signup: { fr:"Créer un compte", en:"Create account" },
  or_email:   { fr:"ou par email", en:"or by email" },
  email_ph:   { fr:"ton@email.com", en:"your@email.com" },
  pass_ph:    { fr:"Mot de passe", en:"Password" },
  create_account_btn: { fr:"Créer mon compte", en:"Create my account" },
  signin_btn: { fr:"Se connecter", en:"Sign in" },
  signup_success: { fr:"Vérifie ta boîte mail pour confirmer ton compte.", en:"Check your inbox to confirm your account." },
  resend_link: { fr:"Renvoyer le lien", en:"Resend link" },
  resend_wait: { fr:"Renvoyer dans", en:"Resend in" },
};

const t = (key: keyof typeof D, lang: Lang): any => (D[key] as any)[lang];

const LANG_LABELS: Record<Lang, string> = { fr: "Français", en: "English" };

const TECH: Record<string, string[]> = {
  backend:       ["Supabase","Firebase","PostgreSQL","MongoDB","Appwrite","Autre"],
  frontend:      ["React","Next.js","Vue","Flutter","Svelte","Autre"],
  paiement:      ["Stripe","Paddle","LemonSqueezy","Aucun","Autre"],
  ia:            ["OpenAI","Gemini","DeepSeek","Anthropic","Local LLM","Aucun","Autre"],
  infra:         ["Vercel","Cloudflare","Railway","Render","VPS","Docker","Autre"],
  automatisation:["Webhooks","N8N","Make","Zapier","Aucun","Autre"],
};
const CONTACTS_OPTIONS = ["Email","Discord","GitHub","LinkedIn","Site web","Téléphone"];

type FormData = {
  nom_projet: string; description: string; type_projet: string; type_profil: string;
  idee: string; avancement: string; produit: string; utilisateurs: string; revenus: string;
  objectif_court: string; objectif_moyen: string; objectif_long: string;
  cherche: string[]; temps: string; distance: string; engagement: string;
  tech: Record<string, string[]>;
  nom_complet: string; pays: string; langue: string;
  photo_url: string;
  contacts_visibles: string[];
  email: string; discord: string; github: string; linkedin: string; site_web: string; telephone: string;
  // Destinations de publication — au moins une obligatoire
  pub_fiche: boolean; pub_talk: boolean; pub_audit: boolean;
  // Spécifique Audit
  audit_url: string; audit_images: string[];
};

const INITIAL: FormData = {
  nom_projet:"", description:"", type_projet:"", type_profil:"",
  idee:"", avancement:"", produit:"", utilisateurs:"", revenus:"",
  objectif_court:"", objectif_moyen:"", objectif_long:"",
  cherche:[], temps:"", distance:"", engagement:"",
  tech:{ backend:[], frontend:[], paiement:[], ia:[], infra:[], automatisation:[] },
  nom_complet:"", pays:"", langue:"", photo_url:"",
  contacts_visibles:["Email"],
  email:"", discord:"", github:"", linkedin:"", site_web:"", telephone:"",
  pub_fiche: true, pub_talk: false, pub_audit: false,
  audit_url: "", audit_images: [],
};

// ── COMPOSANTS UI ──────────────────────────────────────────────────────────
function Radio({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {options.map(opt => (
        <div key={opt} onClick={() => onChange(opt)}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer border transition-all select-none ${value === opt ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800" : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600"}`}>
          <div className={`w-4 h-4 rounded-full border-2 shrink-0 transition-all ${value === opt ? "border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white" : "border-zinc-300 dark:border-zinc-600"}`}/>
          <span className="text-sm text-zinc-700 dark:text-zinc-300">{opt}</span>
        </div>
      ))}
    </div>
  );
}

function MultiCheck({ options, values, onChange }: { options: string[]; values: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => onChange(values.includes(opt) ? values.filter(v => v !== opt) : [...values, opt]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => toggle(opt)}
          className={`px-3 py-2 rounded-xl text-sm border transition-all ${values.includes(opt) ? "border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400"}`}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, multiline, type="text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; type?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-500 resize-none transition-colors"/>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-500 transition-colors"/>
      )}
    </div>
  );
}

// Dropdown FR/EN
function LangDropdown({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-zinc-500 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 rounded-lg hover:border-zinc-400 transition-colors">
        {LANG_LABELS[lang]}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 min-w-32 overflow-hidden">
            {(["fr","en"] as Lang[]).map(l => (
              <button key={l} onClick={() => { setLang(l); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${lang === l ? "font-bold text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-400"}`}>
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── AUTH POPUP (3 vrais boutons + email + création de compte) ─────────────
function AuthPopup({ lang, onClose, onAuthed }: { lang: Lang; onClose: () => void; onAuthed: () => void }) {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/1/form`, scopes: "openid profile email", queryParams: { prompt: "select_account" } } });
  };
  const handleMicrosoft = async () => {
    await supabase.auth.signInWithOAuth({ provider: "azure", options: { redirectTo: `${window.location.origin}/1/form`, scopes: "openid profile email User.Read" } });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSuccess(null); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message); else onAuthed();
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSuccess(null); setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { emailRedirectTo: `${window.location.origin}/1/form` },
    });
    if (error) {
      setError(error.message);
    } else if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
      setError(lang === "fr" ? "Un compte avec ce courriel existe déjà." : "An account with this email already exists.");
    } else {
      setSuccess(t("signup_success", lang));
      setCooldown(30);
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email.trim()) return;
    setError(null);
    const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
    if (error) setError(error.message);
    else { setSuccess(t("signup_success", lang)); setCooldown(30); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-zinc-200 dark:border-zinc-700" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🔐</div>
          <h3 className="font-bold text-base dark:text-white">
            {lang === "fr" ? "Connexion" : "Sign in"}
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            {lang === "fr" ? "Ta fiche sera liée à ton compte." : "Your listing will be linked to your account."}
          </p>
        </div>

        {/* TABS */}
        <div className="flex mb-5 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1">
          {(["signin","signup"] as const).map(tb => (
            <button key={tb} type="button"
              onClick={() => { setTab(tb); setError(null); setSuccess(null); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${tab === tb ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500"}`}>
              {tb === "signin" ? t("tab_signin", lang) : t("tab_signup", lang)}
            </button>
          ))}
        </div>

        {/* PROVIDERS */}
        <div className="flex flex-col gap-2 mb-4">
          <button onClick={handleGoogle} type="button"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:border-zinc-400 transition-colors">
            <GoogleLogo /> Google
          </button>
          <button onClick={handleMicrosoft} type="button"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-800 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors">
            <MicrosoftLogo /> Microsoft
          </button>
        </div>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200 dark:border-zinc-700"/></div>
          <div className="relative flex justify-center"><span className="bg-white dark:bg-zinc-900 px-2 text-xs text-zinc-400">{t("or_email", lang)}</span></div>
        </div>

        {error && <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">{error}</div>}
        {success && <div className="mb-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-600 dark:text-emerald-400">{success}</div>}

        {tab === "signin" ? (
          <form onSubmit={handleSignIn} className="flex flex-col gap-2">
            <input type="email" placeholder={t("email_ph", lang)} value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm dark:bg-zinc-800 dark:text-white outline-none focus:border-cyan-500" />
            <input type="password" placeholder={t("pass_ph", lang)} value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm dark:bg-zinc-800 dark:text-white outline-none focus:border-cyan-500" />
            <button type="submit" disabled={loading}
              className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold transition-colors disabled:opacity-50">
              {loading ? "…" : t("signin_btn", lang)}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="flex flex-col gap-2">
            <input type="email" placeholder={t("email_ph", lang)} value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm dark:bg-zinc-800 dark:text-white outline-none focus:border-cyan-500" />
            <input type="password" placeholder={t("pass_ph", lang)} value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm dark:bg-zinc-800 dark:text-white outline-none focus:border-cyan-500" />
            <button type="submit" disabled={loading}
              className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold transition-colors disabled:opacity-50">
              {loading ? "…" : t("create_account_btn", lang)}
            </button>

            {success && (
              <button type="button" onClick={handleResend} disabled={cooldown > 0}
                className="w-full py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-white disabled:opacity-50 transition-colors">
                {cooldown > 0 ? `${t("resend_wait", lang)} ${cooldown}s` : t("resend_link", lang)}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

// ── PAGE ──────────────────────────────────────────────────────────────────
function InscriptionPageInner() {
  const [lang, setLang]       = useState<Lang>("fr");
  const [step, setStep]       = useState(1);
  const [form, setForm]       = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [myKey, setMyKey]     = useState<string | null>(null);
  const [createdFicheId, setCreatedFicheId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const auditImageInputRef = useRef<HTMLInputElement>(null);

  // ── TALK CROSSPOST (choix sur l'écran de confirmation) ─────────────────
  const [pseudo, setPseudo] = useState<string>("");
  const [pseudoInput, setPseudoInput] = useState<string>("");
  const [talkText, setTalkText] = useState<string>("");
  const [talkPosted, setTalkPosted] = useState(false);
  const [talkPosting, setTalkPosting] = useState(false);
  const [talkError, setTalkError] = useState<string | null>(null);

  // ── AUTH ─────────────────────────────────────────────────────────────────
  const [userId, setUserId]   = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [showAuthRequired, setShowAuthRequired] = useState(false);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
      setUserEmail(session?.user?.email || null);
      setAuthChecked(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id || null);
      setUserEmail(session?.user?.email || null);
      setAuthChecked(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) { setPseudo(""); return; }
    supabase.from("profiles").select("username").eq("id", userId).maybeSingle()
      .then(({ data }) => { if (data?.username) setPseudo(data.username); });
  }, [userId]);

  const handleLogout = async () => { await supabase.auth.signOut(); setUserId(null); setUserEmail(null); setMesfiches([]); };

  // ── MES FICHES ───────────────────────────────────────────────────────────
  const [mesFiches, setMesfiches] = useState<{id:string; nom_projet:string}[]>([]);
  const [ficheActive, setFicheActive] = useState<string|null>(null);
  const [showFichesMenu, setShowFichesMenu] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!userId) return;
    supabase.from("fiches")
      .select("id, nom_projet")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setMesfiches(data); });
  }, [userId]);

  const chargerFiche = async (id: string) => {
    const { data } = await supabase.from("fiches").select("*").eq("id", id).single();
    if (!data) return;
    setFicheActive(id);
    setStep(1);
    setMyKey(null);
    setError(null);
    setForm({
      nom_projet: data.nom_projet || "",
      description: data.description || "",
      type_projet: data.type_projet || "",
      type_profil: data.type_profil || "",
      idee: data.idee || "",
      avancement: data.avancement || "",
      produit: data.produit || "",
      utilisateurs: data.utilisateurs || "",
      revenus: data.revenus || "",
      objectif_court: data.objectif_court || "",
      objectif_moyen: data.objectif_moyen || "",
      objectif_long: data.objectif_long || "",
      cherche: data.cherche || [],
      temps: data.temps || "",
      distance: data.distance || "",
      engagement: data.engagement || "",
      tech: data.tech || { backend:[], frontend:[], paiement:[], ia:[], infra:[], automatisation:[] },
      nom_complet: data.nom_complet || "",
      pays: data.pays || "",
      langue: data.langue || "",
      photo_url: data.photo_urls?.[0] || "",
      contacts_visibles: data.contacts_visibles || ["Email"],
      email: data.email_prive || "",
      discord: data.discord_prive || "",
      github: data.github_prive || "",
      linkedin: data.linkedin_prive || "",
      site_web: data.site_web_prive || "",
      telephone: data.telephone_prive || "",
      // Pas utilisés en mode édition (étape 7 est sautée), mais requis par le type FormData
      pub_fiche: true, pub_talk: false, pub_audit: false,
      audit_url: "", audit_images: [],
    });
    setShowFichesMenu(false);
  };

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && userId) chargerFiche(editId);
  }, [searchParams, userId]);

  const set     = (key: keyof FormData, value: any) => setForm(f => ({ ...f, [key]: value }));
  const setTech = (cat: string, vals: string[])     => setForm(f => ({ ...f, tech: { ...f.tech, [cat]: vals } }));

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // ── UPLOAD PHOTO ──────────────────────────────────────────────────────────
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const ext      = file.name.split(".").pop();
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage
        .from("fiche-photos")
        .upload(filename, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("fiche-photos").getPublicUrl(data.path);
      set("photo_url", urlData.publicUrl);
    } catch (e) {
      console.error("Upload photo:", e);
    } finally {
      setUploading(false);
    }
  };

  // Upload multi-images pour Audit — s'ajoute au tableau au lieu de remplacer
  const [uploadingAudit, setUploadingAudit] = useState(false);
  const handleAuditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingAudit(true);
    try {
      const ext      = file.name.split(".").pop();
      const filename = `audit-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage
        .from("fiche-photos")
        .upload(filename, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("fiche-photos").getPublicUrl(data.path);
      set("audit_images", [...form.audit_images, urlData.publicUrl]);
    } catch (e) {
      console.error("Upload image audit:", e);
    } finally {
      setUploadingAudit(false);
    }
  };
  const removeAuditImage = (url: string) => {
    set("audit_images", form.audit_images.filter(u => u !== url));
  };

  // ── SUBMIT ────────────────────────────────────────────────────────────────
  const [published, setPublished] = useState<{ fiche: boolean; talk: boolean; audit: boolean }>({ fiche: false, talk: false, audit: false });

  const handleSubmit = async () => {
    setError(null);

    if (!userId) {
      setShowAuthRequired(true);
      return;
    }

    // Au moins une destination obligatoire
    if (!ficheActive && !form.pub_fiche && !form.pub_talk && !form.pub_audit) {
      setError(t("pubNone", lang));
      return;
    }
    if ((form.pub_talk || form.pub_audit) && !pseudo) {
      setError(t("pseudoNeeded", lang));
      return;
    }

    if (form.pub_audit && !form.audit_url.trim()) {
      setError(lang === "fr" ? "Ajoute l'URL du site à auditer." : "Add the URL of the site to audit.");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || null;
      if (!currentUserId) {
        setLoading(false);
        setShowAuthRequired(true);
        return;
      }

      // ── ÉDITION D'UNE FICHE EXISTANTE — traite aussi Talk/Audit si cochés ──
      if (ficheActive) {
        const { error: updateError } = await supabase.from("fiches").update({
          nom_projet: form.nom_projet, description: form.description,
          type_projet: form.type_projet, type_profil: form.type_profil,
          idee: form.idee, avancement: form.avancement, produit: form.produit,
          utilisateurs: form.utilisateurs, revenus: form.revenus,
          objectif_court: form.objectif_court, objectif_moyen: form.objectif_moyen, objectif_long: form.objectif_long,
          cherche: form.cherche, temps: form.temps, distance: form.distance, engagement: form.engagement,
          tech: form.tech, nom_complet: form.nom_complet, pays: form.pays, langue: form.langue,
          photo_urls: form.photo_url ? [form.photo_url] : null,
          // Coordonnées volontairement omises — plus de section Contacts dans le
          // formulaire, donc on ne touche jamais aux valeurs déjà en base pour
          // ne pas les écraser silencieusement avec des champs vides.
        }).eq("id", ficheActive);
        if (updateError) throw updateError;

        setCreatedFicheId(ficheActive);
        setTalkText(`${form.nom_projet} — ${form.description}`.slice(0, 500));
        const { data: existingTalkPost } = await supabase.from("talk_posts").select("id").eq("fiche_id", ficheActive).maybeSingle();
        const alreadyOnTalk = !!existingTalkPost;
        setTalkPosted(alreadyOnTalk);

        // Publie sur Talk maintenant seulement si coché ET pas déjà fait
        let talkJustPublished = false;
        if (form.pub_talk && !alreadyOnTalk && pseudo) {
          await supabase.from("talk_posts").insert({
            user_id: currentUserId,
            text: `${form.nom_projet} — ${form.description}`.slice(0, 500),
            user_pseudo: pseudo,
            fiche_id: ficheActive,
          });
          talkJustPublished = true;
          setTalkPosted(true);
        }

        // Publie sur Audit si coché
        let auditJustPublished = false;
        if (form.pub_audit && pseudo && form.audit_url.trim()) {
          const { error: auditError } = await supabase.from("audit_posts").insert({
            user_id: currentUserId,
            user_pseudo: pseudo,
            url: form.audit_url.trim(),
            description: form.description || null,
            images: form.audit_images.length ? form.audit_images : null,
          });
          if (auditError) {
            console.error("[Audit insert]", auditError);
            setError(lang === "fr"
              ? `La fiche a été sauvegardée, mais l'envoi vers Audit a échoué : ${auditError.message}`
              : `The listing was saved, but publishing to Audit failed: ${auditError.message}`);
          } else {
            auditJustPublished = true;
          }
        }

        setPublished({ fiche: true, talk: talkJustPublished, audit: auditJustPublished });
        setMyKey("UPDATED");
        setLoading(false);
        return;
      }

      // ── NOUVELLE PUBLICATION — branche selon les cases cochées ───────────
      let newFicheId: string | null = null;
      let generatedKey: string | null = null;

      if (form.pub_fiche) {
        const { data: keyData, error: keyError } = await supabase.rpc("generate_fiche_key");
        if (keyError) throw keyError;
        generatedKey = keyData as string;

        const { data: insertedFiche, error: insertError } = await supabase.from("fiches").insert({
          key: generatedKey, user_id: currentUserId,
          creator_email: userEmail,
          nom_projet: form.nom_projet, description: form.description,
          type_projet: form.type_projet, type_profil: form.type_profil,
          idee: form.idee, avancement: form.avancement, produit: form.produit,
          utilisateurs: form.utilisateurs, revenus: form.revenus,
          objectif_court: form.objectif_court, objectif_moyen: form.objectif_moyen, objectif_long: form.objectif_long,
          cherche: form.cherche, temps: form.temps, distance: form.distance, engagement: form.engagement,
          tech: form.tech,
          nom_complet: form.nom_complet, pays: form.pays, langue: form.langue,
          photo_urls: form.photo_url ? [form.photo_url] : [],
          contacts_visibles: [],
          email_prive: null, discord_prive: null,
          github_prive: null, linkedin_prive: null,
          site_web_prive: null, telephone_prive: null,
        }).select("id").single();
        if (insertError) throw insertError;
        newFicheId = insertedFiche?.id || null;
        setCreatedFicheId(newFicheId);
        setTalkText(`${form.nom_projet} — ${form.description}`.slice(0, 500));
      }

      if (form.pub_talk) {
        await supabase.from("talk_posts").insert({
          user_id: currentUserId,
          text: `${form.nom_projet} — ${form.description}`.slice(0, 500),
          user_pseudo: pseudo,
          fiche_id: newFicheId,
        });
      }
      setTalkPosted(form.pub_talk);

      let auditOk = false;
      if (form.pub_audit) {
        const { error: auditError } = await supabase.from("audit_posts").insert({
          user_id: currentUserId,
          user_pseudo: pseudo,
          url: form.audit_url.trim(),
          description: form.description || null,
          images: form.audit_images.length ? form.audit_images : null,
        });
        if (auditError) {
          console.error("[Audit insert]", auditError);
          setError(lang === "fr"
            ? `Publié ailleurs avec succès, mais l'envoi vers Audit a échoué : ${auditError.message}`
            : `Published elsewhere successfully, but publishing to Audit failed: ${auditError.message}`);
        } else {
          auditOk = true;
        }
      }

      setPublished({ fiche: form.pub_fiche, talk: form.pub_talk, audit: auditOk });
      setMyKey(generatedKey || "PUBLISHED");
    } catch (e: any) {
      console.error(e);
      setError(t("erreur", lang));
    } finally {
      setLoading(false);
    }
  };

  // ── CROSSPOST TALK (depuis l'écran de confirmation) ─────────────────────
  const handleSaveTalkPseudo = async () => {
    const clean = pseudoInput.trim();
    if (!clean || !userId) return;
    await supabase.from("profiles").upsert({ id: userId, username: clean, updated_at: new Date().toISOString() });
    setPseudo(clean);
  };

  const handlePostToTalk = async () => {
    if (!userId || !pseudo || !talkText.trim() || talkPosted) return; // sécurité client
    setTalkPosting(true);
    setTalkError(null);
    try {
      const { error } = await supabase.from("talk_posts").insert({
        user_id: userId,
        text: talkText.trim(),
        fiche_id: createdFicheId,
        user_pseudo: pseudo,
      });
      if (error) {
        // Sécurité serveur : contrainte unique sur talk_posts.fiche_id — si ça a déjà
        // été posté (même via une autre session/onglet), on ne duplique jamais.
        if ((error as any).code === "23505") {
          setTalkPosted(true);
          return;
        }
        throw error;
      }
      setTalkPosted(true);
    } catch (e: any) {
      console.error(e);
      setTalkError(lang === "fr" ? "Erreur lors de la publication sur Talk." : "Error posting to Talk.");
    } finally {
      setTalkPosting(false);
    }
  };

  // ── CONFIRMATION ─────────────────────────────────────────────────────────
  if (myKey) return (
    <main className="min-h-screen bg-white dark:bg-[#0f0f0f] flex items-center justify-center p-6">
      <div className="text-center max-w-md w-full">
        <div className="text-5xl mb-6">{myKey === "UPDATED" ? "✅" : "🎉"}</div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          {myKey === "UPDATED"
            ? (lang === "fr" ? "Fiche mise à jour !" : "Listing updated!")
            : myKey === "PUBLISHED"
            ? (lang === "fr" ? "Publié !" : "Published!")
            : t("confirme_titre", lang)}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">
          {myKey === "UPDATED"
            ? (lang === "fr" ? "Vos modifications ont été sauvegardées." : "Your changes have been saved.")
            : myKey === "PUBLISHED"
            ? (lang === "fr" ? "Ta publication est en ligne." : "Your submission is live.")
            : t("confirme_texte", lang)}
        </p>

        {/* Résumé de ce qui a été publié */}
        {(published.talk || published.audit || (myKey !== "UPDATED" && published.fiche)) && (
          <div className="flex flex-col gap-1.5 mb-6 text-left bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
            {published.fiche && myKey !== "UPDATED" && <p className="text-xs text-zinc-600 dark:text-zinc-400">✓ {t("pubFicheLabel",lang)}</p>}
            {published.talk  && <p className="text-xs text-zinc-600 dark:text-zinc-400">✓ {t("pubTalkLabel",lang)}</p>}
            {published.audit && <p className="text-xs text-zinc-600 dark:text-zinc-400">✓ {t("pubAuditLabel",lang)}</p>}
          </div>
        )}

        {myKey !== "UPDATED" && myKey !== "PUBLISHED" && (
          <>
            <div className="bg-zinc-900 dark:bg-zinc-800 text-white rounded-2xl px-6 py-4 mb-3 font-mono text-2xl font-bold tracking-wider">{myKey}</div>
            <p className="text-zinc-400 text-xs mb-8">{t("confirme_note", lang)}</p>
          </>
        )}

        {/* ── CROSSPOST TALK — optionnel, en plus de la fiche (création OU mise à jour) ── */}
        {!talkPosted && createdFicheId && (
          <div className="mb-8 text-left bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">
              {lang === "fr" ? "🗣️ Partager aussi sur Talk ?" : "🗣️ Also share on Talk?"}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
              {lang === "fr"
                ? "Optionnel — obtiens des retours rapides de la communauté sur ton pitch."
                : "Optional — get quick feedback from the community on your pitch."}
            </p>

            {!pseudo ? (
              <div className="flex flex-col gap-2 mb-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {lang === "fr" ? "Choisis d'abord un pseudo pour Talk :" : "Pick a Talk nickname first:"}
                </p>
                <div className="flex gap-2">
                  <input type="text" value={pseudoInput} onChange={e => setPseudoInput(e.target.value.replace(/[^a-zA-Z0-9_\s-]/g, ""))}
                    placeholder={lang === "fr" ? "Pseudo" : "Nickname"}
                    className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
                  <button onClick={handleSaveTalkPseudo} className="px-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs rounded-lg font-semibold">
                    {lang === "fr" ? "Valider" : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <textarea value={talkText} onChange={e => setTalkText(e.target.value)} rows={3}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-cyan-500 resize-none mb-2" />
                {talkError && <p className="text-xs text-red-500 mb-2">{talkError}</p>}
                <button onClick={handlePostToTalk} disabled={talkPosting || !talkText.trim()}
                  className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors disabled:opacity-50">
                  {talkPosting ? "…" : (lang === "fr" ? "Publier sur Talk" : "Post to Talk")}
                </button>
              </>
            )}
          </div>
        )}
        {talkPosted && (
          <div className="mb-8 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
            ✓ {lang === "fr" ? "Cette fiche est déjà publiée sur Talk." : "This listing is already posted on Talk."}{" "}
            <Link href="/1/talk" className="underline underline-offset-2 font-semibold">{lang === "fr" ? "Voir" : "View"}</Link>
          </div>
        )}

        <Link href="/1/fiche" className="inline-block w-full px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-semibold text-sm hover:bg-zinc-700 transition-colors text-center">
          {t("voir_fiches", lang)}
        </Link>
      </div>
    </main>
  );

  const etapes = t("etapes", lang) as string[];

  // ── GATE: pendant la vérification de session ────────────────────────────
  if (!authChecked) {
    return (
      <main className="min-h-screen bg-white dark:bg-[#0f0f0f] flex items-center justify-center">
        <p className="text-zinc-400 text-sm">{lang === "fr" ? "Chargement..." : "Loading..."}</p>
      </main>
    );
  }

  // ── GATE: connexion obligatoire avant de commencer la fiche ─────────────
  if (!userId) {
    return (
      <main className="min-h-screen bg-white dark:bg-[#0f0f0f] text-zinc-900 dark:text-zinc-100 font-sans">
        <nav className="border-b border-zinc-100 dark:border-zinc-800/60 px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-sm">Echo AI</span>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/1/hall" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Accueil" : "Home"}</Link>
            <Link href="/1/fiche" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Explorer les projets" : "Explore projects"}</Link>
            <LangDropdown lang={lang} setLang={setLang} />
          </div>
        </nav>

        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-3">{t("auth_required_title", lang)}</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-8">
            {lang === "fr"
              ? "Connecte-toi ou crée un compte avant de commencer à remplir ta fiche. Ça évite les fiches orphelines et protège tes données."
              : "Sign in or create an account before starting your listing. This prevents orphan listings and protects your data."}
          </p>
          <button onClick={() => setShowAuthPopup(true)}
            className="px-6 py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors shadow-sm">
            {t("auth_required_btn", lang)}
          </button>
        </div>

        {showAuthPopup && (
          <AuthPopup
            lang={lang}
            onClose={() => setShowAuthPopup(false)}
            onAuthed={() => setShowAuthPopup(false)}
          />
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-[#0f0f0f] text-zinc-900 dark:text-zinc-100 font-sans">

      {/* NAV */}
      <nav className="border-b border-zinc-100 dark:border-zinc-800/60 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-sm z-10 gap-4">
        {/* ZONE 1 — logo + onglets */}
        <div className="flex items-center gap-5 flex-wrap">
          <span className="font-bold text-sm">Echo AI</span>
          <div className="flex items-center gap-5 text-sm flex-wrap">
            <Link href="/1/hall"          className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Accueil" : "Home"}</Link>
            <Link href="/1/dashboard"     className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Tous les outils" : "All tools"}</Link>
            <Link href="/1/conversation"  className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">Conversation</Link>
            <Link href="/1/form"          className="text-zinc-900 dark:text-white font-semibold">{lang === "fr" ? "Créer un projet" : "Create project"}</Link>
            <Link href="/1/fiche"         className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Explorer les projets" : "Explore projects"}</Link>
            <Link href="/1/talk"          className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Avis de la communauté" : "Community feedback"}</Link>
            <Link href="/1/audit"         className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Audition de site web" : "Website audit"}</Link>
            <Link href="/idea"            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Avis de l'IA" : "AI feedback"}</Link>
            <Link href="/1/account"       className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{lang === "fr" ? "Mon compte" : "My account"}</Link>
          </div>
        </div>

        {/* SÉPARATEUR + ZONE 2 — Bureau (premium) + langue + Mes fiches + pseudo */}
        <div className="flex items-center gap-3.5 shrink-0 flex-wrap">
          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800" />

          {/* BUREAU — verrouillé pour l'instant */}
          <div className="relative group">
            <button
              onClick={() => { /* TODO: activer + ouvrir popup d'avantages une fois le premium prêt */ }}
              className="flex items-center gap-1.5 bg-amber-500/5 border border-amber-500/25 rounded-lg px-3 py-1.5 cursor-not-allowed opacity-65">
              <span className="text-xs">🔒</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-500 whitespace-nowrap">{lang === "fr" ? "Mon Bureau" : "My Desk"}</span>
            </button>
            <div className="absolute top-full right-0 mt-1.5 bg-zinc-900 border border-zinc-700 rounded-md px-2.5 py-1 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              {lang === "fr" ? "🚧 En construction" : "🚧 Under construction"}
            </div>
          </div>

          <LangDropdown lang={lang} setLang={setLang} />

          {userId ? (
            <div className="flex items-center gap-2 relative">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                {pseudo || userEmail}
              </span>
              {mesFiches.length > 0 && (
                <div className="relative">
                  <button onClick={() => setShowFichesMenu(v => !v)}
                    className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/20 px-3 py-1 rounded-full hover:bg-cyan-100 dark:hover:bg-cyan-950/40 transition-colors">
                    {ficheActive ? "✏️ " + (mesFiches.find(f=>f.id===ficheActive)?.nom_projet || "Fiche") : (lang === "fr" ? "Mes fiches ▼" : "My listings ▼")}
                  </button>
                  {showFichesMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 min-w-48 overflow-hidden">
                      <button onClick={() => { setFicheActive(null); setForm(INITIAL); setStep(1); setMyKey(null); setShowFichesMenu(false); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-700">
                        + {lang === "fr" ? "Nouvelle fiche" : "New listing"}
                      </button>
                      {mesFiches.map(f => (
                        <button key={f.id} onClick={() => chargerFiche(f.id)}
                          className={`w-full text-left px-4 py-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${ficheActive === f.id ? "font-bold text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-800" : "text-zinc-600 dark:text-zinc-400"}`}>
                          {f.nom_projet}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button onClick={handleLogout} className="text-xs text-zinc-400 hover:text-red-400 transition-colors">↩</button>
            </div>
          ) : (
            <button onClick={() => setShowAuthPopup(true)}
              className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/20 px-3 py-1 rounded-full hover:bg-cyan-100 dark:hover:bg-cyan-950/40 transition-colors">
              {lang === "fr" ? "Se connecter" : "Sign in"}
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-8">{t("titre", lang)}</h1>

        {!userId && (
          <div className="mb-8 px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400 flex items-center justify-between gap-3">
            <span>⚠️ {lang === "fr" ? "Tu n'es pas connecté. Connecte-toi avant de soumettre." : "You're not signed in. Sign in before submitting."}</span>
            <button onClick={() => setShowAuthPopup(true)} className="shrink-0 text-xs font-bold underline underline-offset-2">
              {lang === "fr" ? "Se connecter" : "Sign in"}
            </button>
          </div>
        )}

        {/* PROGRESS */}
        <div className="flex items-center mb-10 gap-0">
          {etapes.map((label, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i + 1 < step ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                  : i + 1 === step ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 ring-4 ring-zinc-200 dark:ring-zinc-700"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                }`}>{i + 1 < step ? "✓" : i + 1}</div>
                <span className={`text-[10px] hidden sm:block text-center ${i + 1 === step ? "text-zinc-900 dark:text-white font-semibold" : "text-zinc-400"}`}>{label}</span>
              </div>
              {i < etapes.length - 1 && <div className={`flex-1 h-px mx-2 mt-[-10px] ${i + 1 < step ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700"}`}/>}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        <div className="flex flex-col gap-6">

          {/* ÉTAPE 1 */}
          {step === 1 && <>
            <Field label={t("nom_projet",lang)} value={form.nom_projet} onChange={v => set("nom_projet",v)} placeholder="Ex: EcoAI, NutriTrack..." />
            <Field label={t("description",lang)} value={form.description} onChange={v => set("description",v)} placeholder={t("desc_hint",lang)} multiline />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("type_projet",lang)}</label>
              <div className="flex flex-wrap gap-2">
                {t("types_projet",lang).map((tp: string) => (
                  <button key={tp} type="button" onClick={() => set("type_projet",tp)}
                    className={`px-3 py-2 rounded-xl text-sm border transition-all ${form.type_projet===tp ? "border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400"}`}>
                    {tp}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("type_profil",lang)}</label>
              <Radio options={t("profil_options",lang)} value={form.type_profil} onChange={v => set("type_profil",v)} />
            </div>
          </>}

          {/* ÉTAPE 2 */}
          {step === 2 && <>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("idee_label",lang)}</label>
              <Radio options={t("idee_options",lang)} value={form.idee} onChange={v => set("idee",v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("avanc_label",lang)}</label>
              <Radio options={t("avancement_options",lang)} value={form.avancement} onChange={v => set("avancement",v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("produit_label",lang)}</label>
              <Radio options={t("produit_options",lang)} value={form.produit} onChange={v => set("produit",v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("users_label",lang)}</label>
              <Radio options={t("utilisateurs_options",lang)} value={form.utilisateurs} onChange={v => set("utilisateurs",v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("revenus_label",lang)}</label>
              <Radio options={t("revenus_options",lang)} value={form.revenus} onChange={v => set("revenus",v)} />
            </div>
          </>}

          {/* ÉTAPE 3 */}
          {step === 3 && <>
            <Field label={t("court_label",lang)} value={form.objectif_court} onChange={v => set("objectif_court",v)} placeholder={t("court_hint",lang)} multiline />
            <Field label={t("moyen_label",lang)} value={form.objectif_moyen} onChange={v => set("objectif_moyen",v)} placeholder="" multiline />
            <Field label={t("long_label",lang)}  value={form.objectif_long}  onChange={v => set("objectif_long",v)}  placeholder="" multiline />
          </>}

          {/* ÉTAPE 4 */}
          {step === 4 && <>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("cherche_label",lang)}</label>
              <MultiCheck options={t("cherche_options",lang)} values={form.cherche} onChange={v => set("cherche",v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("temps_label",lang)}</label>
              <Radio options={t("temps_options",lang)} value={form.temps} onChange={v => set("temps",v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("distance_label",lang)}</label>
              <Radio options={t("distance_options",lang)} value={form.distance} onChange={v => set("distance",v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("engagement_label",lang)}</label>
              <Radio options={t("engagement_options",lang)} value={form.engagement} onChange={v => set("engagement",v)} />
            </div>
          </>}

          {/* ÉTAPE 5 */}
          {step === 5 && <>
            {Object.entries(TECH).map(([cat, opts]) => (
              <div key={cat} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{(t("tech_labels",lang) as any)[cat] || cat}</label>
                <MultiCheck options={opts} values={form.tech[cat]||[]} onChange={v => setTech(cat,v)} />
              </div>
            ))}
          </>}

          {/* ÉTAPE 6 */}
          {step === 6 && <>
            <Field label={t("nom_complet_label",lang)} value={form.nom_complet} onChange={v => set("nom_complet",v)} />
            <Field label={t("pays_label",lang)}        value={form.pays}        onChange={v => set("pays",v)}        />
            <Field label={t("langue_label",lang)}      value={form.langue}      onChange={v => set("langue",v)}      />

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("photo_label",lang)}</label>
              <p className="text-xs text-zinc-400">{t("photo_hint",lang)}</p>

              <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />

              {form.photo_url ? (
                <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                  <img src={form.photo_url} alt="preview" className="w-full h-full object-cover"/>
                  <button type="button" onClick={() => photoInputRef.current?.click()}
                    className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white text-xs font-medium rounded-xl backdrop-blur-sm transition-colors">
                    {uploading ? "..." : t("photo_change",lang)}
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => photoInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-44 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-2 text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                  {uploading ? (
                    <span className="text-sm">Chargement...</span>
                  ) : (
                    <>
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"/></svg>
                      <span className="text-sm font-medium">{t("photo_btn",lang)}</span>
                      <span className="text-xs">JPG, PNG, WEBP</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </>}

          {/* ÉTAPE 7 — Où publier ? */}
          {step === 7 && <>
            <div className="text-center mb-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{t("pubTitle",lang)}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {ficheActive
                  ? (lang === "fr" ? "Ta fiche est déjà publiée. Ajoute-la aussi ailleurs si tu veux." : "Your listing is already published. Add it elsewhere too if you want.")
                  : t("pubSub",lang)}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {([
                { key:"pub_fiche" as const, label:t("pubFicheLabel",lang), desc:t("pubFicheDesc",lang), locked: ficheActive },
                { key:"pub_talk" as const,  label:t("pubTalkLabel",lang),  desc: ficheActive && talkPosted ? (lang === "fr" ? "Déjà publié sur Talk." : "Already published on Talk.") : t("pubTalkDesc",lang), locked: ficheActive && talkPosted },
                { key:"pub_audit" as const, label:t("pubAuditLabel",lang), desc:t("pubAuditDesc",lang) },
              ]).map(opt => (
                <div key={opt.key} onClick={() => !opt.locked && set(opt.key, !form[opt.key])}
                  className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-all select-none ${opt.locked ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${form[opt.key] ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"}`}>
                  <div className={`w-5 h-5 rounded-md border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${form[opt.key] ? "border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white" : "border-zinc-300 dark:border-zinc-600"}`}>
                    {form[opt.key] && <span className="text-white dark:text-zinc-900 text-xs">✓</span>}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{opt.label}{opt.locked ? " 🔒" : ""}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pseudo requis pour Talk/Audit */}
            {(form.pub_talk || form.pub_audit) && !pseudo && (
              <div className="mt-2 flex flex-col gap-2 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">{lang === "fr" ? "Un pseudo est requis pour publier sur Talk/Audit :" : "A nickname is required to publish on Talk/Audit:"}</p>
                <div className="flex gap-2">
                  <input type="text" value={pseudoInput} onChange={e => setPseudoInput(e.target.value.replace(/[^a-zA-Z0-9_\s-]/g, ""))}
                    placeholder={lang === "fr" ? "Pseudo" : "Nickname"}
                    className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-cyan-500" />
                  <button type="button" onClick={handleSaveTalkPseudo} className="px-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs rounded-lg font-semibold">{lang === "fr" ? "Valider" : "Save"}</button>
                </div>
              </div>
            )}

            {/* Champs spécifiques Audit */}
            {form.pub_audit && (
              <div className="mt-2 flex flex-col gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
                <Field label={t("auditUrlLabel",lang)} value={form.audit_url} onChange={v => set("audit_url", v)} placeholder="https://tonsite.com" />

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("auditImgLabel",lang)}</label>
                  <p className="text-xs text-zinc-400">{t("auditImgHint",lang)}</p>

                  {form.audit_images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {form.audit_images.map(url => (
                        <div key={url} className="relative group aspect-video rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeAuditImage(url)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input ref={auditImageInputRef} type="file" accept="image/*" onChange={handleAuditImageUpload} className="hidden" />
                  <button type="button" onClick={() => auditImageInputRef.current?.click()} disabled={uploadingAudit}
                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                    {uploadingAudit ? "…" : t("auditImgAdd",lang)}
                  </button>
                </div>
              </div>
            )}
          </>}

        </div>

        {/* NAVIGATION */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-zinc-100 dark:border-zinc-800">
          {step > 1 ? (
            <button onClick={() => setStep(s => s-1)}
              className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 transition-colors">
              ← {t("precedent",lang)}
            </button>
          ) : <div/>}

          {step < STEPS ? (
            <button onClick={() => setStep(s => s+1)} disabled={step===1 && !form.nom_projet.trim()}
              className="px-6 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
              {t("suivant",lang)} →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors shadow-sm disabled:opacity-60">
              {loading
                ? t("chargement",lang)
                : ficheActive
                  ? (lang === "fr" ? "Sauvegarder les modifications ✓" : "Save changes ✓")
                  : `${t("soumettre",lang)} ✓`}
            </button>
          )}
        </div>

      </div>

      {/* POPUP "CONNEXION REQUISE" */}
      {showAuthRequired && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAuthRequired(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-zinc-200 dark:border-zinc-700 text-center"
            onClick={e => e.stopPropagation()}>
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="font-bold text-base dark:text-white mb-2">{t("auth_required_title", lang)}</h3>
            <p className="text-xs text-zinc-500 mb-5">{t("auth_required_text", lang)}</p>
            <div className="flex gap-2">
              <button onClick={() => setShowAuthRequired(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 transition-colors">
                {lang === "fr" ? "Annuler" : "Cancel"}
              </button>
              <button onClick={() => { setShowAuthRequired(false); setShowAuthPopup(true); }}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors">
                {t("auth_required_btn", lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP AUTH (3 boutons + email + création de compte avec resend) */}
      {showAuthPopup && (
        <AuthPopup
          lang={lang}
          onClose={() => setShowAuthPopup(false)}
          onAuthed={() => setShowAuthPopup(false)}
        />
      )}

    </main>
  );
}

export default function InscriptionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><p className="text-zinc-500 font-mono text-sm">Chargement...</p></div>}>
      <InscriptionPageInner />
    </Suspense>
  );
}