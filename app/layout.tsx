"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "../context/AppContext"; // 👈 On utilise le chemin d'importation propre de ton architecture

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
    // 🎯 On enlève la classe statique "dark" d'ici pour laisser l'AppContext piloter le HTML !
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white dark:bg-black text-black dark:text-white transition-colors duration-200">
        
        <AppProvider>
          {children}
        </AppProvider>

      </body>
    </html>
  );
}