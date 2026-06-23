"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "../../context/AppContext";

type SidebarProps = {
  userTier?: string;
};

export default function Sidebar({ userTier = "free" }: SidebarProps) {
  const { t, lang } = useApp();
  const pathname = usePathname();

  // Helper to determine if a route is active
  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  const navLinks = [
    { href: "/chat", label: t.sidebar.chat },
    { href: "/books", label: t.sidebar.books },
    { href: "/calendar", label: lang === "fr" ? "📅 Calendrier" : "📅 Calendar" },
    { href: "/vitality", label: lang === "fr" ? "📈 Vitalité" : "📈 Vitality" },
    { href: "/services", label: lang === "fr" ? "💎 Services" : "💎 Services" },
    { href: "/account", label: lang === "fr" ? "👤 Compte" : "👤 Account" },
  ];

  return (
    <aside className="w-55 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-8 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between h-full">
      <div className="flex flex-col gap-6">
        <h2 className="font-bold text-lg">
          <Link
            href="/"
            className={`transition-colors ${
              isActive("/")
                ? "text-cyan-500 dark:text-cyan-400 font-bold"
                : "text-zinc-800 dark:text-zinc-100 hover:text-cyan-500"
            }`}
          >
            {t.sidebar.home}
          </Link>
        </h2>
        
        <div className="flex flex-col gap-y-[1.8vh] min-h-0 text-zinc-800 dark:text-zinc-100 font-medium">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block transition-colors ${
                  active
                    ? "text-cyan-600 dark:text-cyan-400 font-bold"
                    : "hover:text-cyan-500"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <hr className="border-zinc-200 dark:border-zinc-800" />
          <Link
            href="/history"
            className={`block transition-colors ${
              isActive("/history")
                ? "text-amber-500 font-bold"
                : "hover:text-amber-500"
            }`}
          >
            ⭐ {lang === "fr" ? "Historique" : "History"}
          </Link>
        </div>
      </div>
      
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
        {lang === "fr" ? "Statut" : "Status"} :{" "}
        <span className="text-cyan-500 dark:text-cyan-400 uppercase font-bold block">
          {userTier === "connected_free" || userTier === "free" ? "Accès libre" : userTier}
        </span>
      </div>
    </aside>
  );
}
