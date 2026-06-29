"use client";

import { useState } from "react";
import Link from "next/link";

type Lang = "fr" | "en";

const STEPS = 6;

const TYPES_PROJET = ["SaaS", "App mobile", "Contenu", "E-commerce", "Communauté", "Outil interne", "Autre"];

const PROFIL_OPTIONS = {
  fr: ["Je fais tout moi-même et je suis seul.", "Je fais tout moi-même mais je suis déjà accompagné.", "Nous sommes deux sur le projet.", "Nous sommes plusieurs sur le projet.", "Autre."],
  en: ["I do everything myself and I'm alone.", "I do everything myself but I already have someone.", "We are two on the project.", "We are several on the project.", "Other."],
};
const IDEE_OPTIONS = {
  fr: ["Je découvre encore mon idée.", "J'ai une idée assez claire.", "Mon idée est bien définie.", "Autre."],
  en: ["I'm still exploring my idea.", "I have a fairly clear idea.", "My idea is well defined.", "Other."],
};
const AVANCEMENT_OPTIONS = {
  fr: ["Encore sur papier.", "En cours de construction.", "Partiellement fonctionnel.", "Utilisable par certaines personnes.", "Accessible au public.", "Autre."],
  en: ["Still on paper.", "Under construction.", "Partially functional.", "Usable by some people.", "Publicly accessible.", "Other."],
};
const PRODUIT_OPTIONS = {
  fr: ["Non.", "Partiellement.", "Oui.", "Autre."],
  en: ["No.", "Partially.", "Yes.", "Other."],
};
const UTILISATEURS_OPTIONS = {
  fr: ["Aucun pour le moment.", "Quelques utilisateurs.", "Quelques dizaines.", "Quelques centaines.", "Plus de 1000.", "Je préfère ne pas répondre."],
  en: ["None yet.", "A few users.", "A few dozen.", "A few hundred.", "More than 1000.", "I'd rather not say."],
};
const REVENUS_OPTIONS = {
  fr: ["Aucun.", "Quelques dollars.", "Quelques centaines.", "Quelques milliers.", "Plus.", "Je préfère ne pas répondre."],
  en: ["None.", "A few dollars.", "A few hundred.", "A few thousand.", "More.", "I'd rather not say."],
};
const CHERCHE_OPTIONS = {
  fr: ["Échange d'audience", "Partenariat commercial", "Motivation mutuelle", "Accountability partner", "Brainstorming", "Partage d'expérience", "Co-développement", "Intégration entre projets", "Autre"],
  en: ["Audience exchange", "Commercial partnership", "Mutual motivation", "Accountability partner", "Brainstorming", "Experience sharing", "Co-development", "Project integration", "Other"],
};
const TEMPS_OPTIONS = {
  fr: ["Quelques heures.", "Quelques soirées.", "Une dizaine d'heures.", "Temps partiel important.", "Temps plein.", "Variable."],
  en: ["A few hours.", "A few evenings.", "About ten hours.", "Significant part-time.", "Full-time.", "Variable."],
};
const DISTANCE_OPTIONS = {
  fr: ["À distance uniquement.", "Locale uniquement.", "Les deux.", "Peu importe."],
  en: ["Remote only.", "Local only.", "Both.", "Doesn't matter."],
};
const ENGAGEMENT_OPTIONS = {
  fr: ["Discussion occasionnelle.", "Quelques heures par mois.", "Quelques heures par semaine.", "Collaboration régulière.", "Partenariat long terme.", "Association potentielle."],
  en: ["Occasional discussion.", "A few hours per month.", "A few hours per week.", "Regular collaboration.", "Long-term partnership.", "Potential association."],
};

const TECH = {
  backend:      ["Supabase","Firebase","PostgreSQL","MongoDB","Appwrite","Autre"],
  frontend:     ["React","Next.js","Vue","Flutter","Svelte","Autre"],
  paiement:     ["Stripe","Paddle","LemonSqueezy","Aucun","Autre"],
  ia:           ["OpenAI","Gemini","DeepSeek","Anthropic","Local LLM","Aucun","Autre"],
  infra:        ["Vercel","Cloudflare","Railway","Render","VPS","Docker","Autre"],
  automatisation:["Webhooks","N8N","Make","Zapier","Aucun","Autre"],
};

const CONTACTS_OPTIONS = ["Email","Discord","GitHub","LinkedIn","Site web","Téléphone"];

type FormData = {
  // Étape 1
  nom_projet: string;
  description: string;
  type_projet: string;
  type_profil: string;
  // Étape 2
  idee: string;
  avancement: string;
  produit: string;
  utilisateurs: string;
  revenus: string;
  // Étape 3
  objectif_court: string;
  objectif_moyen: string;
  objectif_long: string;
  // Étape 4
  cherche: string[];
  temps: string;
  distance: string;
  engagement: string;
  // Étape 5
  tech: Record<string, string[]>;
  // Étape 6
  nom_complet: string;
  pays: string;
  langue: string;
  photo: string | null;
  // Contacts privés
  contacts_visibles: string[];
  email: string;
  discord: string;
  github: string;
  linkedin: string;
  site_web: string;
  telephone: string;
};

const INITIAL: FormData = {
  nom_projet:"", description:"", type_projet:"", type_profil:"",
  idee:"", avancement:"", produit:"", utilisateurs:"", revenus:"",
  objectif_court:"", objectif_moyen:"", objectif_long:"",
  cherche:[], temps:"", distance:"", engagement:"",
  tech:{ backend:[], frontend:[], paiement:[], ia:[], infra:[], automatisation:[] },
  nom_complet:"", pays:"", langue:"", photo:null,
  contacts_visibles:[], email:"", discord:"", github:"", linkedin:"", site_web:"", telephone:"",
};

// ── COMPOSANTS UTILITAIRES ────────────────────────────────────────────────────
function Radio({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {options.map(opt => (
        <label key={opt} className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer border transition-all ${value === opt ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800" : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600"}`}>
          <div className={`w-4 h-4 rounded-full border-2 shrink-0 transition-all ${value === opt ? "border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white" : "border-zinc-300 dark:border-zinc-600"}`}/>
          <span className="text-sm text-zinc-700 dark:text-zinc-300">{opt}</span>
        </label>
      ))}
    </div>
  );
}

function MultiCheck({ options, values, onChange }: { options: string[]; values: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => {
    onChange(values.includes(opt) ? values.filter(v => v !== opt) : [...values, opt]);
  };
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

function Input({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-400 resize-none transition-colors"/>
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-400 transition-colors"/>
      )}
    </div>
  );
}

// ── PAGE PRINCIPALE ───────────────────────────────────────────────────────────
export default function InscriptionPage() {
  const [lang, setLang]   = useState<Lang>("fr");
  const [step, setStep]   = useState(1);
  const [form, setForm]   = useState<FormData>(INITIAL);
  const [submitted, setSubmitted] = useState(false);

  const set = (key: keyof FormData, value: any) => setForm(f => ({ ...f, [key]: value }));
  const setTech = (cat: string, vals: string[]) => setForm(f => ({ ...f, tech: { ...f.tech, [cat]: vals } }));

  const dict = {
    fr: {
      titre: "Créer ma fiche",
      etapes: ["Le projet", "Avancement", "Objectifs", "Collaboration", "Technologies", "Profil & Contacts"],
      suivant: "Suivant", precedent: "Précédent", soumettre: "Créer ma fiche",
      nav: { home:"Accueil", conv:"Conversation", fiches:"Fiches", inscription:"Inscription" },
      confirme: { titre:"Fiche créée !", texte:"Ta fiche est en ligne. Ta clé personnelle t'a été envoyée par courriel.", btn:"Voir les fiches" },
    },
    en: {
      titre: "Create my listing",
      etapes: ["The project", "Progress", "Goals", "Collaboration", "Technologies", "Profile & Contacts"],
      suivant: "Next", precedent: "Back", soumettre: "Create my listing",
      nav: { home:"Home", conv:"Conversation", fiches:"Listings", inscription:"Register" },
      confirme: { titre:"Listing created!", texte:"Your listing is live. Your personal key was sent by email.", btn:"See listings" },
    },
  }[lang];

  const handleSubmit = async () => {
    // TODO: envoyer vers Supabase + générer Key + envoyer courriel
    console.log("Form submitted:", form);
    setSubmitted(true);
  };

  if (submitted) return (
    <main className="min-h-screen bg-white dark:bg-[#0f0f0f] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">{dict.confirme.titre}</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">{dict.confirme.texte}</p>
        <Link href="/1/fiche" className="inline-block px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-semibold text-sm hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors">
          {dict.confirme.btn}
        </Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-white dark:bg-[#0f0f0f] text-zinc-900 dark:text-zinc-100 font-sans">

      {/* NAV */}
      <nav className="border-b border-zinc-100 dark:border-zinc-800/60 px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Echo AI</span>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/"               className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{dict.nav.home}</Link>
          <Link href="/1/conversation" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{dict.nav.conv}</Link>
          <Link href="/1/fiche"        className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">{dict.nav.fiches}</Link>
          <Link href="/1/inscription"  className="text-zinc-900 dark:text-white font-semibold">{dict.nav.inscription}</Link>
          <button onClick={() => setLang(l => l === "fr" ? "en" : "fr")}
            className="text-xs text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded-lg hover:border-zinc-400 transition-colors">
            {lang === "fr" ? "EN" : "FR"}
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* TITRE */}
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-8">{dict.titre}</h1>

        {/* PROGRESS */}
        <div className="flex items-center gap-2 mb-10">
          {dict.etapes.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 ${i < dict.etapes.length - 1 ? "flex-1" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  i + 1 < step ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                  : i + 1 === step ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 ring-4 ring-zinc-200 dark:ring-zinc-700"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                }`}>{i + 1 < step ? "✓" : i + 1}</div>
                <span className={`text-xs hidden md:block ${i + 1 === step ? "text-zinc-900 dark:text-zinc-100 font-medium" : "text-zinc-400"}`}>{label}</span>
              </div>
              {i < dict.etapes.length - 1 && <div className={`flex-1 h-px mx-1 ${i + 1 < step ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700"}`}/>}
            </div>
          ))}
        </div>

        {/* CONTENU PAR ÉTAPE */}
        <div className="flex flex-col gap-6">

          {/* ── ÉTAPE 1 — Le projet ── */}
          {step === 1 && <>
            <Input label={lang==="fr"?"Nom du projet":"Project name"} value={form.nom_projet} onChange={v => set("nom_projet", v)} placeholder={lang==="fr"?"Ex: EcoAI, NutriTrack...":"Ex: EcoAI, NutriTrack..."} />
            <Input label={lang==="fr"?"Description":"Description"} value={form.description} onChange={v => set("description", v)} placeholder={lang==="fr"?"Explique ton projet comme si tu l'expliquais à un ami.":"Explain your project as if talking to a friend."} multiline />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{lang==="fr"?"Type de projet":"Project type"}</label>
              <div className="flex flex-wrap gap-2">
                {TYPES_PROJET.map(t => (
                  <button key={t} type="button" onClick={() => set("type_projet", t)}
                    className={`px-3 py-2 rounded-xl text-sm border transition-all ${form.type_projet === t ? "border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{lang==="fr"?"Type de profil":"Profile type"}</label>
              <Radio options={PROFIL_OPTIONS[lang]} value={form.type_profil} onChange={v => set("type_profil", v)} />
            </div>
          </>}

          {/* ── ÉTAPE 2 — Avancement ── */}
          {step === 2 && <>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{lang==="fr"?"L'idée globale est :":"The overall idea is:"}</label>
              <Radio options={IDEE_OPTIONS[lang]} value={form.idee} onChange={v => set("idee", v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{lang==="fr"?"Le projet est :":"The project is:"}</label>
              <Radio options={AVANCEMENT_OPTIONS[lang]} value={form.avancement} onChange={v => set("avancement", v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{lang==="fr"?"Produit fonctionnel :":"Functional product:"}</label>
              <Radio options={PRODUIT_OPTIONS[lang]} value={form.produit} onChange={v => set("produit", v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{lang==="fr"?"Nombre d'utilisateurs :":"Number of users:"}</label>
              <Radio options={UTILISATEURS_OPTIONS[lang]} value={form.utilisateurs} onChange={v => set("utilisateurs", v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{lang==="fr"?"Revenus mensuels :":"Monthly revenue:"}</label>
              <Radio options={REVENUS_OPTIONS[lang]} value={form.revenus} onChange={v => set("revenus", v)} />
            </div>
          </>}

          {/* ── ÉTAPE 3 — Objectifs ── */}
          {step === 3 && <>
            <Input label={lang==="fr"?"Court terme (1 à 3 mois)":"Short term (1 to 3 months)"} value={form.objectif_court} onChange={v => set("objectif_court", v)} placeholder={lang==="fr"?"Finir le prototype. Trouver un collaborateur...":"Finish the prototype. Find a collaborator..."} multiline />
            <Input label={lang==="fr"?"Moyen terme (6 à 12 mois)":"Medium term (6 to 12 months)"} value={form.objectif_moyen} onChange={v => set("objectif_moyen", v)} placeholder="" multiline />
            <Input label={lang==="fr"?"Long terme":"Long term"} value={form.objectif_long} onChange={v => set("objectif_long", v)} placeholder="" multiline />
          </>}

          {/* ── ÉTAPE 4 — Collaboration ── */}
          {step === 4 && <>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{lang==="fr"?"Qu'est-ce que tu recherches ?":"What are you looking for?"}</label>
              <MultiCheck options={CHERCHE_OPTIONS[lang]} values={form.cherche} onChange={v => set("cherche", v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{lang==="fr"?"Temps disponible par semaine :":"Time available per week:"}</label>
              <Radio options={TEMPS_OPTIONS[lang]} value={form.temps} onChange={v => set("temps", v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{lang==="fr"?"Collaboration recherchée :":"Preferred collaboration:"}</label>
              <Radio options={DISTANCE_OPTIONS[lang]} value={form.distance} onChange={v => set("distance", v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{lang==="fr"?"Niveau d'engagement recherché :":"Desired engagement level:"}</label>
              <Radio options={ENGAGEMENT_OPTIONS[lang]} value={form.engagement} onChange={v => set("engagement", v)} />
            </div>
          </>}

          {/* ── ÉTAPE 5 — Technologies ── */}
          {step === 5 && <>
            {Object.entries(TECH).map(([cat, opts]) => (
              <div key={cat} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 capitalize">{cat}</label>
                <MultiCheck options={opts} values={form.tech[cat] || []} onChange={v => setTech(cat, v)} />
              </div>
            ))}
          </>}

          {/* ── ÉTAPE 6 — Profil & Contacts ── */}
          {step === 6 && <>
            <Input label={lang==="fr"?"Nom complet":"Full name"} value={form.nom_complet} onChange={v => set("nom_complet", v)} />
            <Input label={lang==="fr"?"Pays":"Country"} value={form.pays} onChange={v => set("pays", v)} />
            <Input label={lang==="fr"?"Langue principale":"Primary language"} value={form.langue} onChange={v => set("langue", v)} />

            <div className="h-px bg-zinc-100 dark:bg-zinc-800"/>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">🔒 {lang==="fr"?"Contacts privés — visibles après achat":"Private contacts — visible after purchase"}</p>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{lang==="fr"?"Que veux-tu rendre visible ?":"What do you want to make visible?"}</label>
              <MultiCheck options={CONTACTS_OPTIONS} values={form.contacts_visibles} onChange={v => set("contacts_visibles", v)} />
            </div>
            {form.contacts_visibles.includes("Email")     && <Input label="Email"    value={form.email}    onChange={v => set("email", v)}    placeholder="toi@exemple.com" />}
            {form.contacts_visibles.includes("Discord")   && <Input label="Discord"  value={form.discord}  onChange={v => set("discord", v)}  placeholder="username#0000" />}
            {form.contacts_visibles.includes("GitHub")    && <Input label="GitHub"   value={form.github}   onChange={v => set("github", v)}   placeholder="github.com/toi" />}
            {form.contacts_visibles.includes("LinkedIn")  && <Input label="LinkedIn" value={form.linkedin} onChange={v => set("linkedin", v)} placeholder="linkedin.com/in/toi" />}
            {form.contacts_visibles.includes("Site web")  && <Input label={lang==="fr"?"Site web":"Website"} value={form.site_web} onChange={v => set("site_web", v)} placeholder="https://monsite.com" />}
            {form.contacts_visibles.includes("Téléphone") && <Input label={lang==="fr"?"Téléphone (optionnel)":"Phone (optional)"} value={form.telephone} onChange={v => set("telephone", v)} placeholder="+1 555 000 0000" />}
          </>}

        </div>

        {/* NAVIGATION */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-zinc-100 dark:border-zinc-800">
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)}
              className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 transition-colors">
              ← {dict.precedent}
            </button>
          ) : <div/>}

          {step < STEPS ? (
            <button onClick={() => setStep(s => s + 1)}
              className="px-6 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors shadow-sm">
              {dict.suivant} →
            </button>
          ) : (
            <button onClick={handleSubmit}
              className="px-6 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors shadow-sm">
              {dict.soumettre} ✓
            </button>
          )}
        </div>

      </div>
    </main>
  );
}