"use client";

import { useApp } from "../../context/AppContext";

export default function TutorialHeaderControls({ onClose }: { onClose: () => void }) {
  const { lang, setLang } = useApp();
  const isFr = lang === "fr";
  const active   = "text-cyan-400 dark:text-cyan-600";
  const inactive = "text-white/40 dark:text-black/40 hover:text-white/70 dark:hover:text-black/70 transition-colors";

  return (
    <div className="absolute top-3 right-3 z-20 flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wide select-none">
        <button type="button" onClick={() => setLang(isFr ? "fr" : "en")} className={isFr ? active : inactive}>
          {isFr ? "Français" : "English"}
        </button>
        <button type="button" onClick={() => setLang(isFr ? "en" : "fr")} className={!isFr ? active : inactive}>
          {isFr ? "English" : "Français"}
        </button>
      </div>
      <button
        type="button"
        onClick={onClose}
        title="Fermer"
        className="w-7 h-7 rounded-lg bg-white/10 dark:bg-black/10 hover:bg-red-600 hover:text-white dark:hover:bg-red-500 dark:hover:text-white text-white dark:text-black text-xs font-bold flex items-center justify-center transition-colors"
      >
        ✕
      </button>
    </div>
  );
}
