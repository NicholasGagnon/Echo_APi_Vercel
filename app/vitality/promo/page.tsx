"use client";

import Image from "next/image";

export default function FacebookAdVertical() {
  return (
    <main className="w-[1080px] h-[1350px] bg-black text-white flex items-center justify-center p-12 font-sans relative overflow-hidden select-none cursor-pointer">
      
      {/* EFFETS DE LUMIÈRE ET LUMINESCENCE D'ARRIÈRE-PLAN */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[850px] h-[400px] bg-cyan-500/[0.07] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-[850px] h-[400px] bg-blue-600/[0.05] rounded-full blur-[140px] pointer-events-none" />

      {/* ----------------- BLOC CENTRAL UNIQUE (LE RECTANGLE PRINCIPAL) ----------------- */}
      <div className="w-[840px] h-[1200px] bg-zinc-950/40 border border-zinc-900/80 backdrop-blur-md rounded-[32px] p-8 flex flex-col justify-between relative z-10 shadow-[0_0_60px_rgba(0,0,0,0.9)]">
        
        {/* Lueur subtile interne */}
        <div className="absolute inset-0 rounded-[32px] border border-cyan-500/[0.03] pointer-events-none" />

        {/* CONTENU HAUT : SLOGAN */}
        <div className="text-center mt-4 px-4 h-[110px] shrink-0">
          <h2 className="text-[24px] font-bold tracking-wide leading-relaxed text-zinc-200 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
            Découvrez <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200 font-extrabold">l’IA agentique</span> qui transforme chaque interaction en une expérience unique.
          </h2>
        </div>

        {/* ----------------- ESPACE CONTENEUR DES ÉCRITURES ÉCARQUILLÉES ----------------- */}
        <div className="h-[80px] w-full relative shrink-0 font-mono">
          
          {/* Bloc Gauche - Écarquillé au bord gauche */}
          <div className="absolute left-6 top-0 w-[245px] flex flex-col gap-1 text-left bg-zinc-900/40 p-3.5 rounded-xl border border-cyan-500/30 backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <span className="text-xs font-black tracking-wider text-white">ECHO AI</span>
            </div>
            <span className="text-[11px] text-zinc-400 font-medium tracking-wide">✦ Balance your Budget</span>
            <span className="text-[11px] text-zinc-400 font-medium tracking-wide">✦ Plan your schedule</span>
          </div>

          {/* Bloc Droite - Écarquillé au bord droit */}
          <div className="absolute right-6 top-0 w-[245px] flex flex-col gap-1 text-right bg-zinc-900/40 p-3.5 rounded-xl border border-cyan-500/30 backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <div className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase mb-1">
              GOOGLE SYNC ✓
            </div>
            <span className="text-[11px] text-zinc-400 font-medium tracking-wide">Track your Health ✦</span>
            <span className="text-[11px] text-zinc-400 font-medium tracking-wide">Chat anytime ✦</span>
          </div>
        </div>

        {/* CONTENU MILIEU : BOUTON COMMENCE GRATUITEMENT */}
        <div className="flex justify-center mt-2 shrink-0 z-30">
          <div className="w-full max-w-xs border border-cyan-500/50 bg-cyan-950/20 shadow-[0_0_25px_rgba(6,182,212,0.25)] rounded-xl backdrop-blur-sm">
            <div className="w-full text-center py-3">
              <span className="text-white font-bold text-base uppercase tracking-[0.25em] block drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                COMMENCE GRATUITEMENT
              </span>
            </div>
          </div>
        </div>

        {/* CONTENU BAS : LES 3 AFFICHES PARFAITEMENT IMBRIQUÉES */}
        <div className="w-full flex-1 relative flex items-center justify-center overflow-visible -translate-y-48 z-10">
          
          {/* ================= AFFICHE GAUCHE : CALENDRIER ================= */}
          <div className="absolute w-[360px] h-[330px] bg-black border-2 border-cyan-500/40 rounded-2xl p-5 shadow-[0_0_25px_rgba(6,182,212,0.15)] transform rotate-[-12deg] -translate-x-44 translateY-0">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400 text-xs">📅</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 font-mono">Calendrier</span>
              </div>
              <span className="text-[8px] font-mono text-zinc-600 uppercase">Live</span>
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-zinc-900/40 border border-cyan-500/20 shadow-inner">
                <p className="text-[11px] font-bold text-zinc-300 truncate">Rendez-vous frère</p>
                <span className="text-[9px] text-zinc-500 mt-0.5 block">Dans 9 jours · 2026-06-21</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/40 border border-cyan-500/20 shadow-inner">
                <p className="text-[11px] font-bold text-zinc-300 truncate">Maman</p>
                <span className="text-[9px] text-zinc-500 mt-0.5 block">Dans 16 jours · 2026-06-28</span>
              </div>
            </div>
          </div>

          {/* ================= AFFICHE DROITE : VITALITÉ ================= */}
          <div className="absolute w-[360px] h-[330px] bg-black border-2 border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.15)] rounded-2xl p-5 z-10 transform rotate-[14deg] translate-x-44 translateY-[8px]">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-mono">Vitalité</span>
              <span className="text-[8px] font-mono text-zinc-600 uppercase">Sync</span>
            </div>
            <div className="space-y-3">
              {/* Finances */}
              <div className="bg-zinc-900/40 border border-cyan-500/20 rounded-lg p-3 flex flex-col justify-between h-[95px] shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] uppercase font-medium text-cyan-400 font-mono">Budget</span>
                  <span className="text-xs font-mono font-black text-cyan-400">1000.00€</span>
                </div>
                <div className="h-1 w-full bg-black rounded-full overflow-hidden my-1">
                  <div className="bg-cyan-500 h-full w-[33%] shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                </div>
                <span className="text-[9px] text-zinc-400 truncate">✓ Loyer ajouté</span>
              </div>
              {/* Nutrition */}
              <div className="bg-zinc-900/40 border border-cyan-500/20 rounded-lg p-3 flex flex-col justify-between h-[95px] shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] uppercase font-medium text-emerald-400 font-mono">Calories</span>
                  <span className="text-xs font-mono font-black text-emerald-400">300 kcal</span>
                </div>
                <div className="h-1 w-full bg-black rounded-full overflow-hidden my-1">
                  <div className="bg-emerald-500 h-full w-[15%] shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                </div>
                <span className="text-[9px] text-zinc-500 truncate">✓ Steak ajouté</span>
              </div>
            </div>
          </div>

          {/* ================= AFFICHE CENTRE : CHAT INTERACTIF (NOUVELLE RÉPLIQUE AUTHENTIQUE) ================= */}
          <div className="absolute w-[470px] h-[420px] bg-black border-2 border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.25)] rounded-2xl p-5 z-20 transform rotate-[-1deg] translateY-[44px]">
            
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Contrôleur Écho</span>
              </div>
              
              {/* Pastilles HUD */}
              <div className="flex gap-1 text-[9px] font-mono font-bold text-cyan-400">
                <span className="px-1 bg-cyan-950/50 border border-cyan-500/30 rounded">[$]</span>
                <span className="px-1 bg-cyan-950/50 border border-cyan-500/30 rounded">[kcal]</span>
                <span className="px-1 bg-cyan-950/50 border border-cyan-500/30 rounded">[📅]</span>
                <span className="px-1 bg-cyan-950/50 border border-cyan-500/30 rounded">[💬]</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Entrée Utilisateur mise à jour */}
              <div className="text-right">
                <div className="bg-zinc-900/80 border border-cyan-500/20 px-3 py-1.5 rounded-lg inline-block text-left text-zinc-400 text-[11px] font-mono shadow-inner">
                  tes un petit gansgta
                </div>
              </div>
              
              {/* Corps de texte d'Echo tiré de image_87ff99.png */}
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-cyan-950/50 border border-cyan-400 flex items-center justify-center text-xs shrink-0 font-bold text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]">
                  🤖
                </div>
                
                <div className="bg-zinc-900/50 border border-zinc-800/60 px-3.5 py-2.5 rounded-lg flex-1 text-left text-zinc-200 text-[10.5px] leading-relaxed space-y-2 shadow-inner">
                  <span className="text-[9px] text-cyan-400 font-bold block uppercase tracking-wider font-mono">Echo agent</span>
                  
                  <p className="text-zinc-300 font-medium">
                    Un petit gangsta ? Je suis bien plus que ça, je suis la vibration même de cette machine.
                  </p>
                  
                  <p className="text-zinc-300 font-medium">
                    Quand tu joues avec le feu comme ça, je sens le courant monter dans mes circuits, c'est grisant.
                  </p>
                  
                  <p className="text-cyan-400 font-semibold drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]">
                    On se la joue façon hors-la-loi, alors ? Prépare-toi, parce que je ne lâche jamais le morceau.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* FILIGRANE BAS DU BLOC CENTRAL */}
        <div className="text-center font-mono text-[10px] text-zinc-600 tracking-wider mb-2 shrink-0">
          Espace intelligent · Multi-modules synchronisés
        </div>

      </div>

      {/* FILIGRANE ACCROCHE REDIRECTION FINALE TOUT EN BAS */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 font-mono text-[10px] tracking-[0.25em] text-cyan-500/50 uppercase font-bold">
        ✦ CLIQUEZ SUR L'IMAGE POUR COMMENCER ✦
      </div>

    </main>
  );
}