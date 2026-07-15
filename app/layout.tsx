import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "../context/AppContext"; 
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "Echo AI | Affinité de projets",
  description:
    "Découvrez de nouvelles façons de propulser vos idées, d'explorer des projets complémentaires, d'obtenir les avis de la communauté ou de l'IA et de réaliser des auditions de sites web.",
  
  // Ta clé de vérification Pinterest conservée ici :
  verification: {
    pinterest: "b8c6e3722e58cd63a982307875f72ea7",
  },

  // Open Graph optimisé pour l'affichage et les partages Facebook
  openGraph: {
    title: "Echo AI | Affinité de projets",
    description: "Découvrez de nouvelles façons de propulser vos idées, d'explorer des projets complémentaires et de collaborer avec la communauté.",
    url: "https://echosai.ca",
    siteName: "Echo AI",
    images: [
      {
        url: "https://echosai.ca/affinity.jpg", // Ton beau visuel avec le double cercle
        width: 1200,
        height: 630,
        alt: "Affinité de projets",
      },
    ],
    locale: "fr_CA",
    type: "website",
  },

  // Mots-clés mis à jour sans les termes spammy d'assistant
  keywords: [
    "Echo AI", "Affinité de projets", "gestion de projets", "collaboration", "entraide informatique", 
    "audition de site web", "avis de la communauté", "analyse IA", "partenariat", "co-creation", "projets", 
    "pinterest", "facebook", "fb", "communauté informatique"
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