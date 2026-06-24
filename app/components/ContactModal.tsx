"use client";

import { useState } from "react";

type ContactModalType = "support" | "contact";

const CATEGORY_OPTIONS: Record<ContactModalType, { value: string; fr: string; en: string }[]> = {
  support: [
    { value: "support_technique", fr: "Support Technique", en: "Technical Support" },
    { value: "bug", fr: "Bug / Erreur", en: "Bug / Error" },
    { value: "connexion", fr: "Problème de connexion", en: "Login Issue" },
    { value: "facturation", fr: "Facturation", en: "Billing" },
    { value: "compte", fr: "Compte utilisateur", en: "User Account" },
    { value: "suggestion", fr: "Suggestion d'amélioration", en: "Feature Suggestion" },
    { value: "autre", fr: "Autre", en: "Other" },
  ],
  contact: [
    { value: "question", fr: "Question générale", en: "General Question" },
    { value: "partenariat", fr: "Partenariat", en: "Partnership" },
    { value: "entreprise", fr: "Affaires / Entreprise", en: "Business / Enterprise" },
    { value: "medias", fr: "Médias / Presse", en: "Media / Press" },
    { value: "information", fr: "Demande d'information", en: "Information Request" },
    { value: "commentaires", fr: "Commentaires", en: "Feedback" },
    { value: "autre", fr: "Autre", en: "Other" },
  ],
};

const STR = {
  fr: {
    supportTitle: "Support Technique",
    contactTitle: "Nous Contacter",
    supportDesc: "Une question sur ton abonnement ou un problème technique ? L'équipe Echo est là pour toi.",
    contactDesc: "Une idée, une suggestion, un partenariat ? On veut t'entendre.",
    yourEmail: "Ton adresse courriel",
    category: "Catégorie",
    categoryPlaceholder: "Sélectionne une catégorie",
    subject: "Sujet",
    subjectPlaceholder: "Résumé de ta demande",
    message: "Message",
    messagePlaceholder: "Décris ta demande en détail...",
    send: "Envoyer",
    sending: "Envoi en cours...",
    sent: "✓ Message envoyé !",
    sentDesc: "On reviendra vers toi dans les plus brefs délais.",
    errorSend: "Échec de l'envoi. Réessaie dans un moment.",
    close: "Fermer",
  },
  en: {
    supportTitle: "Technical Support",
    contactTitle: "Contact Us",
    supportDesc: "Got a question about your subscription or a technical issue? The Echo team is here for you.",
    contactDesc: "An idea, a suggestion, a partnership? We want to hear from you.",
    yourEmail: "Your email address",
    category: "Category",
    categoryPlaceholder: "Select a category",
    subject: "Subject",
    subjectPlaceholder: "Summary of your request",
    message: "Message",
    messagePlaceholder: "Describe your request in detail...",
    send: "Send",
    sending: "Sending...",
    sent: "✓ Message sent!",
    sentDesc: "We'll get back to you as soon as possible.",
    errorSend: "Failed to send. Please try again in a moment.",
    close: "Close",
  },
};

export default function ContactModal({
  type,
  lang,
  onClose,
}: {
  type: ContactModalType;
  lang: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const isSupport = type === "support";
  const S = lang === "fr" ? STR.fr : STR.en;
  const categories = CATEGORY_OPTIONS[type];

  const handleSend = async () => {
    if (!email.trim() || !category || !subject.trim() || !message.trim()) return;
    setStatus("sending");
    try {
      const categoryOption = categories.find(c => c.value === category);
      const categoryLabel = lang === "fr" ? categoryOption?.fr : categoryOption?.en;
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          email: email.trim(),
          category: categoryLabel ?? category,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border-2 border-cyan-500/40 rounded-3xl w-full max-w-2xl shadow-[0_0_60px_rgba(6,182,212,0.2)] animate-in zoom-in-95 duration-200 overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="relative flex items-center gap-4 px-8 pt-8 pb-6 border-b border-zinc-800">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.3)] shrink-0">
            <img src="/echo1.png" alt="Echo" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-500/70 mb-0.5">Echo AI</p>
            <h2 className="text-xl font-black text-zinc-100 tracking-tight">
              {isSupport ? S.supportTitle : S.contactTitle}
            </h2>
            <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
              {isSupport ? S.supportDesc : S.contactDesc}
            </p>
          </div>
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all text-sm font-mono"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="px-8 py-7">
          {status === "sent" ? (
            <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl">
                ✓
              </div>
              <div>
                <p className="text-emerald-400 font-black text-lg font-mono">{S.sent}</p>
                <p className="text-zinc-500 text-sm mt-1.5">{S.sentDesc}</p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-7 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs rounded-xl hover:text-zinc-200 transition-all font-mono"
              >
                {S.close}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* EMAIL */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mb-1.5 font-bold">
                    {S.yourEmail}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nom@domaine.com"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500/60 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
                  />
                </div>

                {/* CATEGORY DROPDOWN */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mb-1.5 font-bold">
                    {S.category}
                  </label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full appearance-none bg-zinc-900 border border-zinc-800 focus:border-cyan-500/60 rounded-xl px-4 py-3 pr-10 text-sm text-zinc-100 outline-none transition-colors cursor-pointer"
                    >
                      <option value="" disabled>{S.categoryPlaceholder}</option>
                      {categories.map(c => (
                        <option key={c.value} value={c.value}>
                          {lang === "fr" ? c.fr : c.en}
                        </option>
                      ))}
                    </select>
                    <svg
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25 12 15.75 4.5 8.25" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* SUBJECT */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mb-1.5 font-bold">
                  {S.subject}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder={S.subjectPlaceholder}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500/60 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
                />
              </div>

              {/* MESSAGE */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mb-1.5 font-bold">
                  {S.message}
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={S.messagePlaceholder}
                  rows={7}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500/60 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors resize-none leading-relaxed"
                />
              </div>

              {/* ERROR */}
              {status === "error" && (
                <p className="text-red-400 text-[11px] font-mono bg-red-950/30 border border-red-500/20 rounded-lg px-3 py-2">
                  ⚠️ {S.errorSend}
                </p>
              )}

              {/* FOOTER */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleSend}
                  disabled={status === "sending" || !email || !category || !subject || !message}
                  className="flex-1 py-3.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] font-mono"
                >
                  {status === "sending" ? S.sending : S.send}
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs rounded-xl hover:text-zinc-200 hover:border-zinc-700 transition-all font-mono"
                >
                  {S.close}
                </button>
              </div>

              {/* Destination info */}
              <p className="text-zinc-600 text-[10px] font-mono text-center">
                → {isSupport ? "support@echosai.ca" : "contact@echosai.ca"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
