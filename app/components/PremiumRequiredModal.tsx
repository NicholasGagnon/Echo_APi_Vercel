"use client";

import Link from "next/link";
import { useApp } from "../../context/AppContext";

export default function PremiumRequiredModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useApp();
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[10000] p-6 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-zinc-50 dark:bg-zinc-950 border-2 border-violet-500/50 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center relative shadow-2xl space-y-4 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-4 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-lg font-mono transition-colors p-1"
          title={lang === "fr" ? "Fermer" : "Close"}
        >
          ✕
        </button>
        <img src="/echo1.png" alt="Echo" className="w-16 h-16 rounded-full object-cover mx-auto border border-violet-500/30 shadow-md" />
        <p className="text-zinc-900 dark:text-zinc-100 font-sans text-sm font-semibold leading-relaxed">
          {lang === "fr"
            ? "Oh désolé ! 😅 L'analyse d'image est réservée aux membres Premium."
            : "Oh sorry! 😅 Image analysis is reserved for Premium members."}
        </p>
        <Link
          href="/services"
          onClick={onClose}
          className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 font-mono text-xs font-bold rounded-xl text-white uppercase tracking-wider transition-all shadow-md text-center block"
        >
          {lang === "fr" ? "Voir les forfaits ➔" : "View plans ➔"}
        </Link>
      </div>
    </div>
  );
}
