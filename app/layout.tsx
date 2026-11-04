import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "../context/AppContext"; 
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";

export const metadata = {
  metadataBase: new URL("https://echosai.ca"),
  title: "EchoAI | La Librairie d'Auteur - Romans, Thrillers & IA",
  description:
    "Découvrez les romans, thrillers psychologiques et œuvres sur la conscience artificielle de Nicholas Gagnon. Lecture intégrale en ligne et téléchargement d'EPUB.",
  
  verification: {
    pinterest: "b8c6e3722e58cd63a982307875f72ea7",
  },

  openGraph: {
    title: "EchoAI | La Librairie d'Auteur - Romans & Thrillers",
    description:
      "Plongez dans les romans, sagas et thrillers de Nicholas Gagnon au format EPUB. Extrait gratuit en ligne et achat immédiat.",
    url: "https://echosai.ca",
    siteName: "EchoAI Librairie",
    images: [
      {
        url: "https://echosai.ca/jojo.png",
        width: 1200,
        height: 630,
        alt: "La Librairie d'Auteur EchoAI",
      },
    ],
    locale: "fr_CA",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "EchoAI | La Librairie d'Auteur",
    description:
      "Romans, thrillers psychologiques et récits sur l'IA par Nicholas Gagnon.",
    images: ["https://echosai.ca/jojo.png"],
  },

  keywords: [
    "EchoAI", "Librairie d'auteur", "Nicholas Gagnon", "La Proposition", "Le Sang du Fauve", 
    "Les Enfants Rois", "L'enfant intouchable", "thriller psychologique", "roman policier", 
    "livre EPUB", "science-fiction", "intelligence artificielle", "lecture en ligne"
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
        
        {/* Pixel de suivi X (Twitter) */}
        <Script
          id="x-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
              },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
              a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
              twq('config','rhzsa');
            `,
          }}
        />

        {/* Un seul Provider global propre pour l'état de l'application */}
        <AppProvider>
          {children}
        </AppProvider>

        {/* 📊 Suivi d'audience Vercel */}
        <Analytics />

      </body>
    </html>
  );
}