"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Lang = "fr" | "en";

const NAV_ITEMS = [
  { href: "/1/hall",         key: "hall"    },
  { href: "/1/dashboard",    key: "dash"    },
  { href: "/1/conversation", key: "conv"    },
  { href: "/1/form",         key: "form"    },
  { href: "/1/fiche",        key: "fiches"  },
  { href: "/1/desktop",      key: "bureau"  },
  { href: "/1/account",      key: "account" },
];
const LABELS: Record<string, { fr: string; en: string }> = {
  hall:    { fr: "Hall",         en: "Hall"         },
  dash:    { fr: "Dashboard",    en: "Dashboard"    },
  conv:    { fr: "Conversation", en: "Conversation" },
  form:    { fr: "Formulaire",   en: "Form"         },
  fiches:  { fr: "Fiches",       en: "Listings"     },
  bureau:  { fr: "Bureau",        en: "Desk"         },
  account: { fr: "Compte",       en: "Account"      },
};

// ── SVG ICONS CUSTOM ─────────────────────────────────────────────────────────
const IconKey = ({ glow }: { glow?: boolean }) => (
  <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
    <circle cx="30" cy="32" r="16" stroke={glow?"#06b6d4":"#52525b"} strokeWidth="4" />
    <circle cx="30" cy="32" r="8"  stroke={glow?"#06b6d4":"#3f3f46"} strokeWidth="2" strokeDasharray="4 3" />
    <line x1="42" y1="38" x2="70" y2="58" stroke={glow?"#06b6d4":"#52525b"} strokeWidth="4" strokeLinecap="round"/>
    <line x1="58" y1="50" x2="58" y2="62" stroke={glow?"#a1a1aa":"#3f3f46"} strokeWidth="3" strokeLinecap="round"/>
    <line x1="65" y1="55" x2="65" y2="65" stroke={glow?"#a1a1aa":"#3f3f46"} strokeWidth="3" strokeLinecap="round"/>
    {glow && <circle cx="30" cy="32" r="20" fill="rgba(6,182,212,0.08)"/>}
  </svg>
);

const IconFiche = ({ glow }: { glow?: boolean }) => (
  <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
    <rect x="14" y="10" width="38" height="50" rx="4" stroke={glow?"#06b6d4":"#52525b"} strokeWidth="3.5" fill={glow?"rgba(6,182,212,0.04)":"none"}/>
    <rect x="22" y="18" width="38" height="50" rx="4" stroke={glow?"#0891b2":"#3f3f46"} strokeWidth="3" fill={glow?"rgba(6,182,212,0.02)":"none"}/>
    <line x1="22" y1="26" x2="46" y2="26" stroke={glow?"#22d3ee":"#52525b"} strokeWidth="2" strokeLinecap="round"/>
    <line x1="22" y1="33" x2="52" y2="33" stroke={glow?"#06b6d4":"#3f3f46"} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="22" y1="39" x2="48" y2="39" stroke={glow?"#06b6d4":"#3f3f46"} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="22" y1="45" x2="42" y2="45" stroke={glow?"#06b6d4":"#3f3f46"} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconUnlock = ({ glow }: { glow?: boolean }) => (
  <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
    <rect x="18" y="36" width="44" height="32" rx="5" stroke={glow?"#06b6d4":"#52525b"} strokeWidth="3.5" fill={glow?"rgba(6,182,212,0.05)":"none"}/>
    <path d="M28 36V26a12 12 0 0 1 24 0" stroke={glow?"#22d3ee":"#3f3f46"} strokeWidth="3.5" strokeLinecap="round"/>
    <circle cx="40" cy="50" r="5" fill={glow?"#06b6d4":"#52525b"}/>
    <line x1="40" y1="55" x2="40" y2="62" stroke={glow?"#06b6d4":"#52525b"} strokeWidth="3" strokeLinecap="round"/>
    {glow && <rect x="18" y="36" width="44" height="32" rx="5" fill="rgba(6,182,212,0.06)"/>}
  </svg>
);

const IconSent = ({ glow }: { glow?: boolean }) => (
  <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
    <path d="M10 40 L70 15 L50 70 L38 48 Z" stroke={glow?"#06b6d4":"#52525b"} strokeWidth="3" strokeLinejoin="round" fill={glow?"rgba(6,182,212,0.05)":"none"}/>
    <line x1="38" y1="48" x2="70" y2="15" stroke={glow?"#22d3ee":"#3f3f46"} strokeWidth="2" strokeLinecap="round"/>
    <circle cx="38" cy="48" r="3" fill={glow?"#06b6d4":"#52525b"}/>
  </svg>
);

const IconReceived = ({ glow }: { glow?: boolean }) => (
  <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
    <path d="M12 20 L40 44 L68 20" stroke={glow?"#06b6d4":"#52525b"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="12" y="20" width="56" height="40" rx="4" stroke={glow?"#06b6d4":"#52525b"} strokeWidth="3" fill={glow?"rgba(6,182,212,0.05)":"none"}/>
    <path d="M30 44 L12 60" stroke={glow?"#0891b2":"#3f3f46"} strokeWidth="2" strokeLinecap="round"/>
    <path d="M50 44 L68 60" stroke={glow?"#0891b2":"#3f3f46"} strokeWidth="2" strokeLinecap="round"/>
    <circle cx="40" cy="44" r="4" fill={glow?"#06b6d4":"#52525b"}/>
  </svg>
);

type PanelId = "key" | "fiches" | "unlocked" | "sent" | "received";

type MyFiche = { id:string; key:string; nom_projet:string; likes:number; interets:number };
type UnlockedFiche = { fiche_id:string; nom_projet:string; key:string };
type Interet = { id:string; type:string; sender_key:string; created_at:string; nom_projet:string; fiche_id:string };

export default function BureauPage() {
  const [lang, setLang] = useState<Lang>("fr");
  const [userId, setUserId]     = useState<string|null>(null);
  const [userEmail, setUserEmail] = useState<string|null>(null);
  const [myKey, setMyKey]       = useState<string|null>(null);
  const [myFiches, setMyFiches] = useState<MyFiche[]>([]);
  const [unlocked, setUnlocked] = useState<UnlockedFiche[]>([]);
  const [sentInterets, setSentInterets] = useState<Interet[]>([]);
  const [receivedInterets, setReceivedInterets] = useState<Interet[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPanel, setOpenPanel] = useState<PanelId|null>(null);
  const [globalStats, setGlobalStats] = useState({ fiches: 0, tunnels: 0, interets: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [keyRevealed, setKeyRevealed] = useState(false);
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString(lang==="fr"?"fr-CA":"en-CA",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}));
    tick(); const id = setInterval(tick,1000); return ()=>clearInterval(id);
  },[lang]);

  useEffect(() => {
    supabase.auth.getSession().then(({data:{session}})=>{ setUserId(session?.user?.id||null); setUserEmail(session?.user?.email||null); });
    const {data:listener} = supabase.auth.onAuthStateChange((_e,session)=>{ setUserId(session?.user?.id||null); setUserEmail(session?.user?.email||null); });
    return ()=>listener.subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!userId){setLoading(false);return;}
    const load = async()=>{
      setLoading(true);
      const {data:fd} = await supabase.from("fiches").select("id,key,nom_projet,likes,interets").eq("user_id",userId).order("created_at",{ascending:false});
      const fiches = (fd||[]) as MyFiche[];
      setMyFiches(fiches);
      if(fiches.length>0) setMyKey(fiches[0].key);

      const {data:td} = await supabase.from("tunnels").select("fiche_id").eq("acheteur_id",userId);
      if(td&&td.length>0){
        const ids = td.map((t:any)=>t.fiche_id);
        const {data:ud} = await supabase.from("fiches").select("id,key,nom_projet").in("id",ids);
        setUnlocked((ud||[]).map((f:any)=>({fiche_id:f.id,...f})));
      }

      // Intérêts que J'AI envoyés (sur des fiches d'autres personnes)
      const {data:sid} = await supabase.from("fiche_interets").select("id,type,sender_key,created_at,fiche_id").eq("sender_key", fiches[0]?.key||"NONE").order("created_at",{ascending:false}).limit(8);
      // Pour les intérêts reçus
      if(fiches.length>0){
        const ficheIds = fiches.map(f=>f.id);
        const {data:rid} = await supabase.from("fiche_interets").select("id,type,sender_key,created_at,fiche_id").in("fiche_id",ficheIds).order("created_at",{ascending:false}).limit(8);
        setReceivedInterets((rid||[]).map((it:any)=>({...it, nom_projet: fiches.find(f=>f.id===it.fiche_id)?.nom_projet||"—"})));
      }
      setSentInterets((sid||[]) as Interet[]);
      setLoading(false);
    };
    load();
  },[userId]);

  useEffect(()=>{
    const loadGlobal = async()=>{
      setLoadingStats(true);
      const [{ count: f }, { count: t }, { count: i }] = await Promise.all([
        supabase.from("fiches").select("*", { count:"exact", head:true }),
        supabase.from("tunnels").select("*", { count:"exact", head:true }),
        supabase.from("fiche_interets").select("*", { count:"exact", head:true }),
      ]);
      setGlobalStats({ fiches: f||0, tunnels: t||0, interets: i||0 });
      setLoadingStats(false);
    };
    loadGlobal();
  },[]);

  const panels: { id:PanelId; label:{fr:string;en:string}; icon: React.FC<{glow?:boolean}>; count?:number }[] = [
    { id:"key",      label:{fr:"Ma Clé",       en:"My Key"    }, icon:IconKey,      count:undefined },
    { id:"fiches",   label:{fr:"Mes Fiches",   en:"My Listings"}, icon:IconFiche,   count:myFiches.length },
    { id:"unlocked", label:{fr:"Contacts",     en:"Contacts"  }, icon:IconUnlock,   count:unlocked.length },
    { id:"sent",     label:{fr:"Envoyés",      en:"Sent"      }, icon:IconSent,     count:sentInterets.length },
    { id:"received", label:{fr:"Reçus",        en:"Received"  }, icon:IconReceived, count:receivedInterets.length },
  ];

  const toggle = (id:PanelId) => {
    if(id==="key" && openPanel!=="key"){ setKeyRevealed(false); }
    setOpenPanel(p => p===id ? null : id);
  };

  return (
    <div className="w-full min-h-screen bg-[#08070a] text-zinc-300 flex flex-col font-sans relative overflow-hidden">

      {/* LUMIÈRE */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[500px]"
          style={{background:"radial-gradient(ellipse 50% 80% at 50% 0%, rgba(6,182,212,0.07) 0%, transparent 70%)"}}/>
      </div>

      {/* 3 COLONNES CHAQUE CÔTÉ */}
      {["left","right"].map(side=>(
        <div key={side} className={`pointer-events-none fixed inset-y-0 ${side==="left"?"left-0":"right-0"} z-0 hidden lg:flex gap-10 px-6 items-stretch`}>
          {[0,1,2].map(i=>(
            <div key={i} className="relative w-3 flex flex-col items-center">
              <div className="absolute inset-y-0 w-full bg-gradient-to-b from-zinc-800/20 via-zinc-700/40 to-zinc-800/20 rounded-full border-x border-zinc-600/10"/>
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-cyan-400/15 to-transparent"/>
              <div className="absolute top-10 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/40 shadow-[0_0_8px_2px_rgba(6,182,212,0.2)]"/>
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/40 shadow-[0_0_8px_2px_rgba(6,182,212,0.2)]"/>
            </div>
          ))}
        </div>
      ))}

      {/* NAV */}
      <nav className="relative z-20 border-b border-zinc-900/60 px-6 py-4 flex items-center justify-between shrink-0 bg-black/50 backdrop-blur-sm">
        <span className="font-bold text-sm text-white tracking-wide">Echo AI</span>
        <div className="flex items-center gap-5 text-sm">
          {NAV_ITEMS.map(item=>(
            <Link key={item.href} href={item.href} className="text-zinc-500 hover:text-zinc-200 transition-colors">
              {LABELS[item.key][lang]}
            </Link>
          ))}
          <button onClick={()=>setLang(l=>l==="fr"?"en":"fr")} className="text-xs text-zinc-500 border border-zinc-800 px-2 py-1 rounded-lg hover:border-zinc-600 transition-colors">
            {lang==="fr"?"EN":"FR"}
          </button>
        </div>
      </nav>

      <div className="relative z-10 flex-1 px-4 lg:px-32 py-12 flex flex-col items-center">

        {/* EN-TÊTE */}
        <div className="text-center mb-14">
          <p className="text-[10px] font-mono tracking-[0.5em] text-cyan-500 font-bold mb-3">{lang==="fr"?"ESPACE PRIVÉ":"PRIVATE SPACE"}</p>
          <h1 className="text-4xl sm:text-5xl font-extralight tracking-[0.15em] text-white uppercase mb-3"
            style={{textShadow:"0 0 40px rgba(6,182,212,0.2)"}}>
            {lang==="fr"?"MON BUREAU":"MY DESK"}
          </h1>
          <div className="w-16 h-px mx-auto bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mb-3"/>
          {userEmail && <p className="text-xs text-zinc-500 font-mono">{userEmail}</p>}
        </div>

        {!userId ? (
          <div className="max-w-md mx-auto text-center border border-zinc-800 bg-[#0a0a0d] rounded-2xl p-10 shadow-2xl">
            <div className="w-20 h-20 mx-auto mb-6"><IconKey/></div>
            <p className="text-base font-semibold text-white mb-2">{lang==="fr"?"Accès privé":"Private access"}</p>
            <p className="text-sm text-zinc-500 mb-6">{lang==="fr"?"Connecte-toi pour accéder à ton bureau.":"Log in to access your desk."}</p>
            <Link href="/1/account" className="inline-block px-6 py-3 bg-gradient-to-b from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white text-xs font-bold rounded-xl uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              {lang==="fr"?"Se connecter":"Log in"}
            </Link>
          </div>
        ) : (
          <div className="w-full max-w-5xl">

            {/* ── STATS PLATEFORME ── */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { value: globalStats.fiches,   label: lang==="fr"?"Fiches actives":"Active listings",    color:"text-cyan-400",    shadow:"rgba(6,182,212," },
                { value: globalStats.tunnels,  label: lang==="fr"?"Contacts débloqués":"Contacts unlocked", color:"text-emerald-400", shadow:"rgba(52,211,153," },
                { value: globalStats.interets, label: lang==="fr"?"Intérêts envoyés":"Interests sent",   color:"text-amber-400",   shadow:"rgba(251,191,36," },
              ].map((s,i)=>(
                <div key={i} className="border border-zinc-800/80 bg-[#0a0a0d] rounded-2xl p-5 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent"/>
                  <p className={`text-4xl font-black mb-1.5 ${s.color} ${loadingStats?"opacity-20":""}`}
                    style={{textShadow: loadingStats?"none":`0 0 20px ${s.shadow}0.5)`}}>
                    {loadingStats?"—":s.value}
                  </p>
                  <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>

            {/* ── 5 PLAQUES ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              {panels.map(panel=>{
                const isOpen = openPanel===panel.id;
                const Icon = panel.icon;
                return (
                  <button key={panel.id} onClick={()=>toggle(panel.id)}
                    className={`group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all duration-300 ${
                      isOpen
                        ? "border-cyan-500/60 bg-gradient-to-b from-cyan-950/40 to-black/60 shadow-[0_0_40px_rgba(6,182,212,0.15)]"
                        : "border-zinc-800/80 bg-[#0a0a0d] hover:border-zinc-700 hover:bg-zinc-900/40"
                    }`}>
                    <div className={`w-16 h-16 transition-all duration-300 ${isOpen?"scale-110 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]":"opacity-70 group-hover:opacity-100"}`}>
                      <Icon glow={isOpen}/>
                    </div>
                    <span className={`text-[10px] font-mono uppercase tracking-widest font-bold transition-colors ${isOpen?"text-cyan-400":"text-zinc-500 group-hover:text-zinc-300"}`}>
                      {panel.label[lang]}
                    </span>
                    {panel.count !== undefined && (
                      <span className={`absolute top-3 right-3 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md ${isOpen?"bg-cyan-500/20 text-cyan-400":"bg-zinc-800 text-zinc-500"}`}>
                        {panel.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── PANNEAU OUVERT ── */}
            {openPanel && (
              <div className="border border-zinc-800/60 bg-[#0a0a0d] rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"/>

                {/* ── MA CLÉ ── */}
                {openPanel==="key" && (
                  <div className="text-center py-4">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-6">{lang==="fr"?"Ta clé personnelle":"Your personal key"}</p>
                    {keyRevealed ? (
                      <div>
                        <div className="inline-block bg-black/60 border border-cyan-500/40 rounded-2xl px-10 py-5 font-mono text-4xl font-black text-white tracking-widest"
                          style={{textShadow:"0 0 30px rgba(6,182,212,0.5)"}}>
                          {myKey||"—"}
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-4 italic">{lang==="fr"?"Garde-la précieusement — c'est ton identité sur la plateforme.":"Keep it safe — it's your identity on the platform."}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="inline-block bg-black/40 border border-zinc-800 rounded-2xl px-10 py-5 font-mono text-4xl font-black text-zinc-700 tracking-widest select-none blur-sm">
                          Key_A00
                        </div>
                        <div>
                          <button onClick={()=>setKeyRevealed(true)}
                            className="mt-4 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl uppercase tracking-widest transition-colors shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                            {lang==="fr"?"🗝️ Révéler ma clé":"🗝️ Reveal my key"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── MES FICHES ── */}
                {openPanel==="fiches" && (
                  <div>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4">{lang==="fr"?"Mes fiches projets":"My project listings"}</p>
                    {myFiches.length===0 ? (
                      <div className="text-center py-6">
                        <p className="text-sm text-zinc-500 mb-3">{lang==="fr"?"Aucune fiche créée.":"No listing created."}</p>
                        <Link href="/1/form" className="text-xs text-cyan-400 hover:text-cyan-300">{lang==="fr"?"Créer ma fiche →":"Create my listing →"}</Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {myFiches.map(f=>(
                          <div key={f.id} className="bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm text-white font-semibold">{f.nom_projet}</p>
                              <p className="text-[10px] font-mono text-zinc-500">{f.key}</p>
                            </div>
                            <div className="text-right text-[10px] text-zinc-500">
                              <p>♥ {f.likes}</p>
                              <p>★ {f.interets}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── CONTACTS DÉBLOQUÉS ── */}
                {openPanel==="unlocked" && (
                  <div>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4">{lang==="fr"?"Contacts débloqués (achetés)":"Unlocked contacts (purchased)"}</p>
                    {unlocked.length===0 ? (
                      <div className="text-center py-6">
                        <p className="text-sm text-zinc-500 mb-3">{lang==="fr"?"Aucun contact débloqué.":"No contacts unlocked."}</p>
                        <Link href="/1/fiche" className="text-xs text-cyan-400 hover:text-cyan-300">{lang==="fr"?"Parcourir les fiches →":"Browse listings →"}</Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {unlocked.map(f=>(
                          <div key={f.fiche_id} className="bg-emerald-900/10 border border-emerald-800/30 rounded-xl px-4 py-3">
                            <p className="text-sm text-emerald-300 font-semibold">{f.nom_projet}</p>
                            <p className="text-[10px] font-mono text-zinc-500">{f.key}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── INTÉRÊTS ENVOYÉS ── */}
                {openPanel==="sent" && (
                  <div>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4">{lang==="fr"?"Intérêts envoyés":"Interests sent"}</p>
                    {sentInterets.length===0 ? (
                      <p className="text-sm text-zinc-500 text-center py-6">{lang==="fr"?"Aucun intérêt envoyé.":"No interests sent."}</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {sentInterets.map(it=>(
                          <div key={it.id} className="bg-black/40 border border-zinc-800 rounded-xl px-4 py-2.5 flex items-center gap-3">
                            <span>{it.type==="tres_interesse"?"🔥":"💌"}</span>
                            <div>
                              <p className="text-xs text-zinc-300">{it.nom_projet||it.fiche_id}</p>
                              <p className="text-[10px] text-zinc-600">{new Date(it.created_at).toLocaleDateString(lang==="fr"?"fr-CA":"en-CA")}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── INTÉRÊTS REÇUS ── */}
                {openPanel==="received" && (
                  <div>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4">{lang==="fr"?"Intérêts reçus":"Interests received"}</p>
                    {receivedInterets.length===0 ? (
                      <p className="text-sm text-zinc-500 text-center py-6">{lang==="fr"?"Aucune activité.":"No activity."}</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {receivedInterets.map(it=>(
                          <div key={it.id} className="bg-black/40 border border-zinc-800 rounded-xl px-4 py-2.5 flex items-center gap-3">
                            <span>{it.type==="tres_interesse"?"🔥":"💌"}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-cyan-400 font-mono font-bold">{it.sender_key}</p>
                              <p className="text-[10px] text-zinc-500 truncate">{it.nom_projet}</p>
                            </div>
                            <p className="text-[10px] text-zinc-600 shrink-0">{new Date(it.created_at).toLocaleDateString(lang==="fr"?"fr-CA":"en-CA")}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="relative z-20 h-8 border-t border-zinc-950 bg-black/60 px-6 flex items-center justify-between text-[10px] font-mono text-zinc-600 shrink-0">
        <p>BUREAU — <span className="text-zinc-500">SITE_2</span></p>
        <p>{time}</p>
        <p>© 2026 ECHOSAI.CA</p>
      </footer>
    </div>
  );
}