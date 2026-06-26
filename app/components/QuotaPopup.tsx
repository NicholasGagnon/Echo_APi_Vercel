"use client";

import Link from "next/link";

interface QuotaPopupProps {
  label: string;
  lang: string;
  onClose: () => void;
}

export default function QuotaPopup({ label, lang, onClose }: QuotaPopupProps) {
  const isAnon    = label === "anon_limit" || label === "anon_blocked";
const isBlocked = label === "anon_blocked";

const title = isAnon
  ? (
      lang === "fr"
        ? "Le portail est verrouillé 🔐"
        : "The portal is locked 🔐"
    )
  : (
      lang === "fr"
        ? "Echo recharge ses batteries ⚡"
        : "Echo is recharging ⚡"
    );

const body = isAnon
  ? (
      lang === "fr"
        ? (
            isBlocked
              ? "Cette fonctionnalité fait partie de l'expérience Echo complète et nécessite simplement un compte gratuit."
              : "Vous avez utilisé vos messages de découverte. La bonne nouvelle : un compte gratuit suffit pour poursuivre l'aventure."
          )
        : (
            isBlocked
              ? "This feature is part of the complete Echo experience and simply requires a free account."
              : "You've used your discovery messages. The good news: a free account is all you need to continue the adventure."
          )
    )
  : (
      lang === "fr"
        ? (
            label === "chat_ia"
              ? "La conversation fait une petite pause pendant qu'Echo récupère quelques crédits."
            : label === "vitality_actions"
              ? "Le laboratoire Vitalité se recharge doucement après ses dernières analyses."
            : label === "calendar"
              ? "L'agenda prend une petite respiration avant de repartir."
            : label === "horizon"
              ? "Les antennes Horizon refroidissent un instant après leurs dernières explorations."
            : label === "buttons"
              ? "Les modes avancés se rechargent progressivement."
            : "Cette partie d'Echo est momentanément en train de se recharger."
          )
        : (
            label === "chat_ia"
              ? "The conversation is taking a short break while Echo recovers a few credits."
            : label === "vitality_actions"
              ? "The Vitality laboratory is slowly recharging after its latest analyses."
            : label === "calendar"
              ? "The calendar is taking a short breath before getting back to work."
            : label === "horizon"
              ? "Horizon's antennas are cooling down after their latest explorations."
            : label === "buttons"
              ? "Advanced modes are gradually recharging."
            : "This part of Echo is temporarily recharging."
          )
    );

const sub = isAnon
  ? (
      lang === "fr"
        ? "✨ Gratuit • Aucun paiement requis • Activation immédiate."
        : "✨ Free • No payment required • Instant access."
    )
  : (
      lang === "fr"
        ? "Les crédits reviennent automatiquement chaque heure. Revenez un peu plus tard ou découvrez les plans supérieurs pour un accès continu."
        : "Credits regenerate automatically every hour. Come back a little later or explore higher plans for uninterrupted access."
    );

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-950 border-2 border-red-500/40 p-6 rounded-2xl max-w-md w-full relative shadow-[0_0_50px_rgba(239,68,68,0.15)]">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white font-bold font-mono text-lg">✕</button>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">
  {isAnon ? "🔐" : "🔋"}
</span>
          <h3 className="text-sm font-mono uppercase tracking-widest text-red-400 font-bold">{title}</h3>
        </div>
        <p className="text-zinc-300 text-sm font-mono leading-relaxed mb-1">{body}</p>
        <p className="text-zinc-500 text-xs font-mono mb-6">{sub}</p>
        <div className="flex gap-3">
          <Link
  href={isAnon ? "/welcome" : "/services"}
  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs font-mono uppercase tracking-widest text-center transition-all"
  onClick={onClose}
>
  {isAnon
    ? (
        lang === "fr"
          ? "Débloquer Echo ✨"
          : "Unlock Echo ✨"
      )
    : (
        lang === "fr"
          ? "Découvrir les plans 🚀"
          : "Explore plans 🚀"
      )}
</Link>

<button
  onClick={onClose}
  className="px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white text-xs font-mono uppercase tracking-widest transition-all"
>
  {lang === "fr" ? "Vous pouvez attendre un peu ou découvrir les plans Premium." : " "}
</button>
        </div>
      </div>
    </div>
  );
}