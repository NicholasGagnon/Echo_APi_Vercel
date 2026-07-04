import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "../context/AppContext"; 
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "Echo AI | Assistant IA personnel pour calendrier, budget et productivité",
  description:
    "Echo AI est un assistant intelligent conçu pour gérer le calendrier, le budget, la nutrition, l'écriture, les projets et la productivité depuis une seule plateforme.",
  // Ta clé de vérification Pinterest ajoutée proprement ici :
  verification: {
    pinterest: "b8c6e3722e58cd63a982307875f72ea7",
  },
  keywords: [
    "Echo AI", "assistant IA", "assistant intelligent", "calendrier", "budget", "nutrition", "productivité",
    "organisation", "écriture", "gestion de projets", "chatgpt", "chat gpt", "gemini", "gemini ai", "canva",
    "deepseek", "google translate", "translate", "traductor", "speed test", "calculator", "google maps", "maps",
    "gmail", "yahoo mail", "aol mail", "outlook", "youtube", "yt", "facebook", "fb", "instagram", "ig",
    "tiktok", "tik tok", "twitter", "x", "pinterest", "whatsapp", "whatsapp web", "wsp web", "telegram",
    "discord", "netflix", "spotify", "twitch", "weather", "weather tomorrow", "clima", "meteo", "hava durumu",
    "погода", "restaurants", "restaurants near me", "food near me", "hotels", "walmart", "amazon", "ebay",
    "shein", "temu", "craigslist", "etsy", "zillow", "usps tracking", "fedex tracking", "wordle", "roblox",
    "poki", "blooket", "solitaire", "nba", "nfl", "premier league", "serie a", "real madrid", "fc barcelona",
    "australian open", "cricbuzz", "ind vs nz", "india vs new zealand", "what is my ip", "what time is it",
    "where am i", "what day is it", "how to tie a tie", "how to delete instagram account", "why am i so tired"
  ]
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white dark:bg-black text-black dark:text-white transition-colors duration-200">
        
        <AppProvider>
          {children}
        </AppProvider>

        {/* 📊 Suivi d'audience Vercel Analytics */}
        <Analytics />

      </body>
    </html>
  );
}