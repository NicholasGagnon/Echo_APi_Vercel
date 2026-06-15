"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";

export default function LangDropdown() {
  const { lang, setLang } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeDropdown = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", closeDropdown);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeDropdown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const selectLanguage = (language: "fr" | "en") => {
    setLang(language);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative inline-block text-left font-sans">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold hover:border-cyan-500/60 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all duration-200 shadow-sm text-xs"
      >
        <span>🌐 {lang === "fr" ? "Français" : "English"}</span>
        <svg
          aria-hidden="true"
          className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25 12 15.75 4.5 8.25" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-36 origin-top-right rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-1.5 shadow-xl z-[60] animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            type="button"
            role="menuitemradio"
            aria-checked={lang === "fr"}
            onClick={() => selectLanguage("fr")}
            className={`w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between ${
              lang === "fr"
                ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                : "text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            }`}
          >
            <span>Français</span>
            {lang === "fr" && <span aria-hidden="true">✓</span>}
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={lang === "en"}
            onClick={() => selectLanguage("en")}
            className={`w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between ${
              lang === "en"
                ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                : "text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            }`}
          >
            <span>English</span>
            {lang === "en" && <span aria-hidden="true">✓</span>}
          </button>
        </div>
      )}
    </div>
  );
}
