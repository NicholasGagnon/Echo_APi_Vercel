"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import LangDropdown from "./LangDropdown";

export default function TutorialHeaderControls({ onClose }: { onClose: () => void }) {
  const { theme, toggleTheme, t } = useApp();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsSettingsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  return (
    <div ref={ref} className="absolute top-3 right-3 z-20 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsSettingsOpen((o) => !o)}
          title={t.settings?.title || "Paramètres"}
          className="w-7 h-7 rounded-lg bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 text-white dark:text-black text-xs flex items-center justify-center transition-colors"
        >
          ⚙️
        </button>
        {isSettingsOpen && (
          <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-3 flex flex-col gap-2 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-1 rounded-xl">
              <LangDropdown />
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full text-left px-2.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 rounded-xl transition-colors"
            >
              {theme === "dark" ? (t.settings?.lightMode || "☀️ Mode Clair") : (t.settings?.darkMode || "🌙 Mode Sombre")}
            </button>
          </div>
        )}
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
