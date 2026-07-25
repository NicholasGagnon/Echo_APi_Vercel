"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useApp } from "../../context/AppContext";
import { checkQuota, getMessageMaxLength, UserTier } from "../../utils/quota";

export const dynamic = "force-dynamic";

type Currency = "CAD" | "USD" | "EUR";

type EventData = {
  id: string;
  title: string;
  start: string;
  end: string;
  notes: string;
  googleEventId?: string;
  isFromEcho?: boolean;
};

type CalendarEvents = Record<string, EventData[]>;
type ChatMessage = { raw: string; imageB64?: string };

const DAYS_LABELS_FR = ["D", "L", "M", "M", "J", "V", "S"];
const DAYS_LABELS_EN = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const GOOGLE_CALENDAR_SCOPES = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";

const PRICES: Record<Currency, { amount: string; symbol: string }> = {
  CAD: { amount: "3.99", symbol: "CA$" },
  USD: { amount: "3.99", symbol: "US$" },
  EUR: { amount: "3.99", symbol: "€" },
};

const extractProviderTokenFromHash = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const hash = window.location.hash.substring(1);
    if (!hash) return null;
    return new URLSearchParams(hash).get("provider_token") ?? null;
  } catch { return null; }
};

const clearHash = () => {
  if (typeof window !== "undefined")
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
};

function CalendarTutorialPopup({ lang, onClose, onConnect }: {
  lang: string;
  onClose: () => void;
  onConnect: () => void;
}) {
  const fr = lang === "fr";
  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[9998] p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border-2 border-cyan-500/40 rounded-3xl w-full max-w-2xl shadow-[0_0_60px_rgba(6,182,212,0.2)] animate-in zoom-in-95 duration-200 overflow-hidden max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-4 px-7 pt-7 pb-5 border-b border-zinc-800 shrink-0">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_16px_rgba(6,182,212,0.3)] shrink-0">
            <img src="/echo1.png" alt="Echo" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-500/70 mb-1">Echo AI — Calendrier</p>
            <h2 className="text-lg font-black text-zinc-100 leading-tight">
              {fr ? "👑 Synchronisation Google Calendar" : "👑 Google Calendar Sync"}
            </h2>
            <p className="text-zinc-400 text-[12px] mt-1 leading-relaxed">
              {fr
                ? "C'est ici que tu peux synchroniser tes rendez-vous et connecter ton agenda Google."
                : "Sync your appointments and link your Google Calendar here."}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all text-sm font-mono cursor-pointer">✕</button>
        </div>

        <div className="px-7 py-6 overflow-y-auto flex-1 space-y-5">
          <p className="text-zinc-300 text-[13px] leading-relaxed">
            {fr
              ? "Pour commencer, clique sur \"Se connecter\" ci-dessous pour lier ton compte Google."
              : "Click \"Connect\" below to link your Google account."}
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-black">
              {fr ? "📋 Guide d'autorisation" : "📋 Authorization Guide"}
            </p>
            {[
              fr ? "Sélectionnez le compte Google à lier à Echo." : "Select the Google account you wish to link.",
              fr ? 'Sur l\'écran de sécurité, cliquez sur "Paramètres avancés" en bas à gauche.' : 'On the safety prompt, click "Advanced settings" in the lower left.',
              fr ? 'Cliquez ensuite sur le lien "Accéder à echosai.ca (non sécurisé)".' : 'Click "Go to echosai.ca (unsafe)" to proceed.',
              fr ? "Cochez toutes les cases d'autorisations pour votre agenda puis validez." : "Check all calendar permission boxes and confirm.",
            ].map((step, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[10px] font-black font-mono flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                <p className="text-zinc-300 text-[13px] leading-relaxed flex-1">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-7 py-5 border-t border-zinc-800 flex items-center justify-between gap-3 shrink-0">
          <button onClick={onConnect} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs px-6 py-3 rounded-xl uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] font-mono cursor-pointer">
            {fr ? "Se connecter à Google Calendar" : "Connect to Google Calendar"}
          </button>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-[11px] font-mono transition-colors cursor-pointer">
            {fr ? "Plus tard" : "Later"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CalendarContent() {
  const { lang, setLang, userTier, triggerToast } = useApp();
  const fr = lang === "fr";
  const today = new Date();
  const safeTier = (userTier || "connected_free") as UserTier;

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvents>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // Devises & Modales
  const [currency, setCurrency] = useState<Currency>("CAD");
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);

  // Formulaire événement manuel
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");

  // Google Sync
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [needsGoogleReconnect, setNeedsGoogleReconnect] = useState(false);

  // Chat Echo Agentic à droite
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatState, setChatState] = useState<"idle" | "thinking" | "speaking">("idle");
  const bottomRef = useRef<HTMLDivElement>(null);

  const icsInputRef = useRef<HTMLInputElement>(null);
  const isFetchingRef = useRef(false);
  const googleTokenRef = useRef<string | null>(null);

  const getStorageKey = (uid: string) => `echo-calendar-v2-${uid}`;
  const getGoogleTokenKey = (uid: string) => `echo-google-token-${uid}`;
  const TUTO_KEY = "echo-calendar-tuto-seen-v1";

  // ── FETCH EVENTS SUPABASE ──
  const fetchSupabaseEvents = useCallback(async (uid: string) => {
    try {
      const { data: calRows, error } = await supabase.from("echo_calendar").select("*").eq("user_id", uid);
      if (error) throw error;
      if (!calRows) return;
      const rebuilt: CalendarEvents = {};
      calRows.forEach(r => {
        const key = r.start_date;
        if (!rebuilt[key]) rebuilt[key] = [];
        rebuilt[key].push({
          id: r.id, title: r.title,
          start: r.start_time || "", end: r.end_time || "",
          notes: r.notes || "", isFromEcho: r.is_from_echo ?? false,
        });
      });
      setEvents(prev => {
        const updated = { ...prev };
        const allKeys = new Set([...Object.keys(updated), ...Object.keys(rebuilt)]);
        allKeys.forEach(k => {
          const googleOnly = (updated[k] || []).filter(e => !!e.googleEventId);
          const supaOnly = rebuilt[k] || [];
          const seen = new Set(googleOnly.map(e => e.id));
          updated[k] = [...googleOnly, ...supaOnly.filter(e => !seen.has(e.id))];
        });
        return updated;
      });
    } catch (err: any) {
      console.error("[Calendar] fetchSupabaseEvents:", err.message);
    }
  }, []);

  const resolveToken = useCallback(async (uid: string): Promise<string | null> => {
    const ls = localStorage.getItem(getGoogleTokenKey(uid));
    if (ls) { googleTokenRef.current = ls; setGoogleToken(ls); return ls; }
    if (googleTokenRef.current) return googleTokenRef.current;
    try {
      const { data: row } = await supabase.from("user_tokens").select("google_access_token").eq("id", uid).maybeSingle();
      if (row?.google_access_token) {
        googleTokenRef.current = row.google_access_token;
        setGoogleToken(row.google_access_token);
        localStorage.setItem(getGoogleTokenKey(uid), row.google_access_token);
        return row.google_access_token;
      }
    } catch {}
    return null;
  }, []);

  const storeToken = useCallback(async (uid: string, token: string) => {
    googleTokenRef.current = token;
    setGoogleToken(token);
    localStorage.setItem(getGoogleTokenKey(uid), token);
    supabase.auth.getSession().then(({ data: { session } }) => {
      supabase.from("user_tokens").upsert({
        id: uid, google_access_token: token,
        google_refresh_token: session?.refresh_token || null,
        user_tier: safeTier,
        last_request_date: new Date().toISOString().split("T")[0],
      }, { onConflict: "id" });
    });
    setNeedsGoogleReconnect(false);
  }, [safeTier]);

  const clearToken = useCallback(async (uid: string) => {
    googleTokenRef.current = null;
    setGoogleToken(null);
    localStorage.removeItem(getGoogleTokenKey(uid));
    try { await supabase.from("user_tokens").update({ google_access_token: null }).eq("id", uid); } catch {}
    setNeedsGoogleReconnect(true);
  }, []);

  const reconnectGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/calendar` : undefined,
        scopes: GOOGLE_CALENDAR_SCOPES,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  };

  const fetchGoogleEvents = useCallback(async (token: string, uid: string, year?: number, month?: number) => {
    if (!token || !uid || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsSyncing(true);
    const y = year ?? currentYear;
    const m = month ?? currentMonth;
    try {
      const timeMin = new Date(y, m, 1).toISOString();
      const timeMax = new Date(y, m + 1, 0, 23, 59, 59).toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 401 || res.status === 403) { await clearToken(uid); return; }
      if (!res.ok) return;
      setNeedsGoogleReconnect(false);
      const data = await res.json();
      if (!data.items?.length) return;
      const incoming: CalendarEvents = {};
      data.items.forEach((item: any) => {
        const rawStart = item.start?.dateTime || item.start?.date;
        if (!rawStart) return;
        const dateKey = rawStart.split("T")[0];
        const startTime = item.start?.dateTime ? rawStart.split("T")[1]?.substring(0, 5) : "";
        const endTime = item.end?.dateTime ? item.end.dateTime.split("T")[1]?.substring(0, 5) : "";
        if (!incoming[dateKey]) incoming[dateKey] = [];
        incoming[dateKey].push({
          id: item.id, title: item.summary || "Google Event",
          start: startTime, end: endTime, notes: item.description || "",
          googleEventId: item.id,
        });
      });
      setEvents(prev => {
        const updated = { ...prev };
        const prefix = `${y}-${String(m + 1).padStart(2, "0")}`;
        Object.keys(updated).forEach(k => { if (k.startsWith(prefix)) updated[k] = (updated[k] || []).filter(e => !e.googleEventId); });
        Object.keys(incoming).forEach(k => {
          const local = (updated[k] || []).filter(e => !e.googleEventId);
          updated[k] = [...local, ...incoming[k]];
        });
        return updated;
      });
    } catch (err) {
      console.error("[Calendar] fetchGoogleEvents:", err);
    } finally {
      setIsSyncing(false);
      isFetchingRef.current = false;
    }
  }, [currentYear, currentMonth, clearToken]);

  const pushEventToGoogle = useCallback(async (uid: string, dateKey: string, ev: EventData): Promise<string | null> => {
    const token = await resolveToken(uid);
    if (!token) { setNeedsGoogleReconnect(true); return null; }
    try {
      const hasTime = !!(ev.start || ev.end);
      const startObj = hasTime ? { dateTime: new Date(`${dateKey}T${ev.start || "00:00"}:00`).toISOString() } : { date: dateKey };
      const endObj = hasTime ? { dateTime: new Date(`${dateKey}T${ev.end || "23:59"}:00`).toISOString() } : { date: dateKey };
      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ summary: ev.title, description: ev.notes, start: startObj, end: endObj }),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) await clearToken(uid);
        return null;
      }
      const d = await res.json();
      return d.id ?? null;
    } catch (err) {
      console.error("[Calendar] pushEventToGoogle crash:", err);
      return null;
    }
  }, [resolveToken, clearToken]);

  const deleteFromGoogle = useCallback(async (uid: string, googleId: string) => {
    const token = await resolveToken(uid);
    if (!token) return;
    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 401 || res.status === 403) await clearToken(uid);
    } catch (err) { console.error("[Calendar] deleteFromGoogle:", err); }
  }, [resolveToken, clearToken]);

  useEffect(() => {
    let cancelled = false;
    if (!localStorage.getItem(TUTO_KEY)) setShowTutorial(true);

    const bootstrap = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { if (!cancelled) setIsLoaded(true); return; }
      const uid = session.user.id;
      if (!cancelled) setUserId(uid);

      const savedEvents = localStorage.getItem(getStorageKey(uid));
      if (savedEvents && !cancelled) { try { setEvents(JSON.parse(savedEvents)); } catch {} }
      if (!cancelled) await fetchSupabaseEvents(uid);

      let activeToken: string | null = null;
      const hashToken = extractProviderTokenFromHash();
      if (hashToken) { clearHash(); activeToken = hashToken; await storeToken(uid, hashToken); }
      else if (session.provider_token) { activeToken = session.provider_token; await storeToken(uid, session.provider_token); }
      else { activeToken = await resolveToken(uid); }

      if (activeToken && !cancelled) await fetchGoogleEvents(activeToken, uid, today.getFullYear(), today.getMonth());
      if (!cancelled) setIsLoaded(true);
    };

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        setUserId(null); setEvents({}); setGoogleToken(null);
        googleTokenRef.current = null; setNeedsGoogleReconnect(false); setIsLoaded(true); return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const uid = session.user.id; setUserId(uid);
        const savedEvents = localStorage.getItem(getStorageKey(uid));
        setEvents(savedEvents ? JSON.parse(savedEvents) : {});
        await fetchSupabaseEvents(uid);
        const hashToken = extractProviderTokenFromHash();
        const providerToken = hashToken || session.provider_token;
        if (providerToken) { clearHash(); await storeToken(uid, providerToken); await fetchGoogleEvents(providerToken, uid, today.getFullYear(), today.getMonth()); }
        else { const token = await resolveToken(uid); if (token) await fetchGoogleEvents(token, uid, today.getFullYear(), today.getMonth()); }
      }
    });

    return () => { cancelled = true; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (!isLoaded || !userId) return; localStorage.setItem(getStorageKey(userId), JSON.stringify(events)); }, [events, isLoaded, userId]);
  useEffect(() => { if (!isLoaded || !userId) return; const token = googleTokenRef.current; if (token) fetchGoogleEvents(token, userId, currentYear, currentMonth); }, [currentMonth, currentYear]);

  const handleManualSync = async () => {
    if (!userId) return;
    await fetchSupabaseEvents(userId);
    const token = await resolveToken(userId);
    if (!token) { setNeedsGoogleReconnect(true); return; }
    await fetchGoogleEvents(token, userId, currentYear, currentMonth);
    if (typeof triggerToast === "function") triggerToast("info", fr ? "Données synchronisées !" : "Data synchronized!");
  };

  const saveEvent = async () => {
    if (!selectedDateKey || !title.trim() || !userId) return;

    const tempId = Date.now().toString();
    const ev: EventData = { id: tempId, title, start, end, notes };

    setEvents(prev => ({ ...prev, [selectedDateKey]: [...(prev[selectedDateKey] || []), ev] }));
    setShowAddForm(false);
    setTitle(""); setStart(""); setEnd(""); setNotes("");

    try {
      const cloudId = await pushEventToGoogle(userId, selectedDateKey, ev);
      const finalId = cloudId || tempId;

      await supabase.from("echo_calendar").insert({
        id: finalId,
        user_id: userId,
        title,
        start_date: selectedDateKey,
        end_date: selectedDateKey,
        start_time: start || null,
        end_time: end || null,
        notes,
        is_from_echo: false,
      });

      if (cloudId) {
        setEvents(prev => ({
          ...prev,
          [selectedDateKey]: (prev[selectedDateKey] || []).map(e =>
            e.id === tempId ? { ...e, id: cloudId, googleEventId: cloudId } : e
          ),
        }));
      }
    } catch (err) {
      console.error("[Calendar] saveEvent error:", err);
    }
  };

  const deleteEvent = async (dateKey: string, id: string, googleId?: string) => {
    if (!userId) return;
    if (googleId) await deleteFromGoogle(userId, googleId);
    await supabase.from("echo_calendar").delete().eq("id", id).eq("user_id", userId);
    setEvents(prev => ({ ...prev, [dateKey]: (prev[dateKey] || []).filter(e => e.id !== id) }));
  };

  // ── ECHO CHAT AGENTIC INTÉGRÉ & SAUVEGARDE SUPABASE RÉPARÉE ──
  const handleSendEcho = async () => {
    if (!chatInput.trim()) return;
    if (!userId) { setShowSignInModal(true); return; }

    const userMsg = chatInput.trim();
    const userEntry: ChatMessage = { raw: `${fr ? "Toi" : "You"}: ${userMsg}` };
    const baseMessages = [...chatMessages, userEntry];

    setChatState("thinking");
    setChatMessages([...baseMessages, { raw: "Echo: ..." }]);
    setChatInput("");

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: baseMessages.map(m => m.raw),
          userTier: safeTier,
          calendarEvents: events,
          source: "calendar",
        }),
      });

      const data = await response.json();
      setChatState("speaking");
      setChatMessages([...baseMessages, { raw: `Echo: ${data.response || ""}` }]);

      // 💥 FIX AGENTIC : INSERER DANS SUPABASE + GOOGLE CALENDAR
      if (data.action?.type === "ADD_CALENDAR_EVENT") {
        const payload = data.action.payload;
        const eventTitle = payload.title || "Rendez-vous Echo";
        const dateKey = payload.start?.split("T")[0] || new Date().toLocaleDateString("fr-CA");
        const startTime = payload.start?.split("T")[1]?.slice(0, 5) || "";
        const endTime = payload.end?.split("T")[1]?.slice(0, 5) || "";
        const notesStr = payload.notes || "Ajouté par l'agent IA Echo";

        const tempId = Date.now().toString();
        const ev: EventData = { id: tempId, title: eventTitle, start: startTime, end: endTime, notes: notesStr, isFromEcho: true };

        // 1. Pousser vers Google Calendar si disponible
        const cloudId = await pushEventToGoogle(userId, dateKey, ev);
        const finalId = cloudId || tempId;

        // 2. Insérer formellement dans Supabase
        await supabase.from("echo_calendar").insert({
          id: finalId,
          user_id: userId,
          title: eventTitle,
          start_date: dateKey,
          end_date: dateKey,
          start_time: startTime || null,
          end_time: endTime || null,
          notes: notesStr,
          is_from_echo: true,
        });

        // 3. Mettre à jour l'affichage local
        await fetchSupabaseEvents(userId);
      }
    } catch (err) {
      console.error("[Calendar Agentic] Erreur:", err);
      setChatMessages([...baseMessages, { raw: "Echo: Erreur lors de l'enregistrement de l'événement." }]);
    } finally {
      setTimeout(() => setChatState("idle"), 5000);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); };
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); };
  const goToday = () => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); };

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const blanks = Array.from({ length: firstDay });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const makeDateKey = (day: number) => `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const isToday = (day: number) => day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  const selectedEvents = selectedDateKey ? events[selectedDateKey] || [] : [];
  const activeMonthLabel = fr ? MONTHS_FR[currentMonth] : MONTHS_EN[currentMonth];
  const activeDaysLabels = fr ? DAYS_LABELS_FR : DAYS_LABELS_EN;
  const isPaidTier = userTier && userTier !== "connected_free";

  return (
    <main className="h-screen w-screen bg-black text-zinc-50 font-sans selection:bg-cyan-500/20 relative overflow-hidden flex flex-col">

      {/* ── HEADER UNIFIÉ ÉCOSYSTÈME ── */}
      <header className="border-b border-zinc-900 bg-black/90 backdrop-blur-md sticky top-0 z-40 shrink-0">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex justify-between items-center relative">
          
          <div className="flex items-center gap-6">
            <Link href="/outil" className="text-sm font-mono font-black tracking-[0.25em] text-white uppercase">
              ECHOSAI
            </Link>

            <Link
              href="/outil"
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all hover:scale-105 active:scale-95"
            >
              <span>⚡</span>
              <span>{fr ? "RETOUR AUX OUTILS" : "BACK TO TOOLS"}</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-mono relative">
            <div className="flex border border-zinc-800 rounded-lg overflow-hidden font-mono text-[10px] bg-zinc-900">
              {(["CAD", "USD", "EUR"] as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2 py-1 font-bold transition-colors ${currency === c ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:text-white"}`}
                >
                  {c}
                </button>
              ))}
            </div>

            {isPaidTier ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl border border-emerald-500/50 bg-black text-emerald-400 font-mono shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-[10px] uppercase tracking-wider">
                  {fr ? "✓ PLAN PREMIUM ACTIF" : "✓ PREMIUM ACTIVE"}
                </span>
              </div>
            ) : (
              <div 
                onClick={() => setShowPremiumModal(true)} 
                className="cursor-pointer flex items-center gap-2 px-3 py-1 rounded-xl border border-amber-500/40 bg-zinc-900 text-white shadow-lg hover:border-amber-400 transition-all"
              >
                <span className="text-[9px] bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                  ★ PREMIUM ({PRICES[currency].symbol}{PRICES[currency].amount})
                </span>
              </div>
            )}

            <div className="flex border border-zinc-800 rounded-lg overflow-hidden font-mono text-[10px]">
              <button onClick={() => setLang("fr")} className={`px-2 py-1 ${fr ? "bg-zinc-800 text-white font-bold" : "text-zinc-500 hover:text-zinc-300"}`}>FR</button>
              <button onClick={() => setLang("en")} className={`px-2 py-1 ${!fr ? "bg-zinc-800 text-white font-bold" : "text-zinc-500 hover:text-zinc-300"}`}>EN</button>
            </div>

            {userId ? (
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-[11px] text-red-500 hover:text-red-400 transition-colors uppercase font-bold cursor-pointer"
              >
                [ {fr ? "Déconnexion" : "Sign Out"} ]
              </button>
            ) : (
              <button
                onClick={() => setShowSignInModal(true)}
                className="px-3 py-1.5 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl hover:bg-zinc-900 transition-all font-bold tracking-tight shadow-sm cursor-pointer"
              >
                {fr ? "Connexion" : "Sign In"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── BANDEAU AVERTISSEMENT GOOGLE SYNC ── */}
      {needsGoogleReconnect && (
        <div className="bg-amber-950/40 border-b border-amber-500/40 px-6 py-2.5 flex items-center justify-between gap-4 text-xs font-mono text-amber-300 shrink-0">
          <span>⚠️ {fr ? "Connexion Google Calendar expirée. Reconnecte ton compte pour réactiver la synchronisation." : "Google Calendar token expired. Reconnect your account to sync."}</span>
          <button onClick={reconnectGoogle} className="px-4 py-1 rounded-xl bg-amber-500 text-zinc-950 font-black uppercase text-[10px] hover:bg-amber-400 transition-all cursor-pointer">
            {fr ? "Reconnecter Google" : "Reconnect Google"}
          </button>
        </div>
      )}

      {/* ── SPLIT 2 COLONNES (GAUCHE CALENDRIER | DROITE CHAT AGENTIC) ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0 bg-black">

        {/* COLONNE GAUCHE — CALENDRIER ET GRILLE */}
        <section className="lg:col-span-7 border-r border-zinc-900 p-6 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
          
          {/* Navigation Mois & Boutons de Sync */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="p-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-cyan-500 text-xs font-mono cursor-pointer">◀</button>
              <button onClick={goToday} className="text-xl font-black font-mono tracking-tight text-white hover:text-cyan-400 transition-colors cursor-pointer">
                📅 {activeMonthLabel} {currentYear}
              </button>
              <button onClick={nextMonth} className="p-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-cyan-500 text-xs font-mono cursor-pointer">▶</button>
            </div>

            <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 p-1.5 rounded-2xl">
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
              >
                {isSyncing ? "..." : "Google Sync"}
              </button>
              <button onClick={() => icsInputRef.current?.click()} className="px-3 py-1.5 rounded-xl border border-zinc-800 bg-black text-xs font-mono text-zinc-300 hover:text-white cursor-pointer">
                {fr ? "Importer" : "Import"}
              </button>
              <button onClick={() => setShowTutorial(true)} className="w-8 h-8 rounded-xl border border-zinc-800 bg-black text-xs font-mono text-zinc-400 hover:text-white cursor-pointer">
                ?
              </button>
              <input type="file" ref={icsInputRef} accept=".ics" className="hidden" />
            </div>
          </div>

          {/* Grille du Calendrier */}
          <div className="flex-1 flex flex-col justify-start">
            <div className="grid grid-cols-7 gap-2 mb-2 text-center font-mono text-xs font-bold text-zinc-500 uppercase">
              {activeDaysLabels.map((d, i) => <div key={i}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-2 auto-rows-fr flex-1">
              {blanks.map((_, i) => <div key={`b-${i}`} className="bg-zinc-950/40 rounded-2xl border border-zinc-900/40" />)}
              {days.map(day => {
                const key = makeDateKey(day);
                const dayEvents = events[key] || [];
                const mainToday = isToday(day);

                return (
                  <button
                    key={day}
                    onClick={() => { setSelectedDateKey(key); setShowAddForm(false); }}
                    className={`min-h-[85px] border rounded-2xl p-2.5 text-left flex flex-col justify-between transition-all cursor-pointer overflow-hidden ${
                      mainToday
                        ? "border-cyan-400 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                        : "border-zinc-900 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className={`font-mono text-xs font-bold ${mainToday ? "text-cyan-400" : "text-zinc-500"}`}>{day}</div>
                    <div className="space-y-1 w-full mt-1">
                      {dayEvents.slice(0, 2).map(ev => (
                        <div
                          key={ev.id}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-lg truncate border ${
                            ev.isFromEcho
                              ? "bg-purple-950/50 border-purple-500/40 text-purple-300"
                              : ev.googleEventId
                              ? "bg-blue-950/50 border-blue-500/40 text-blue-300"
                              : "bg-zinc-800/80 border-zinc-700 text-zinc-200"
                          }`}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && <div className="text-[9px] font-mono text-cyan-400 font-bold">+{dayEvents.length - 2}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </section>

        {/* COLONNE DROITE — ECHO COMPAGNON AGENTIC CHAT */}
        <section className="lg:col-span-5 bg-black p-6 flex flex-col justify-between h-full overflow-hidden">
          <div className="border-b border-zinc-900 pb-3 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#06b6d4]" />
            <span className="text-xs font-mono font-black uppercase tracking-widest text-cyan-400">AGENT CALENDRIER AGENTIC</span>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-full border border-cyan-500/30 bg-cyan-950/30 flex items-center justify-center text-cyan-400 font-mono text-lg">
                  📅
                </div>
                <p className="text-xs font-mono text-zinc-500 italic">
                  {fr ? "Dictez un rendez-vous (ex: 'Ajoute un médecin demain à 14h')..." : "Schedule an event (e.g. 'Add dentist tomorrow at 2 PM')..."}
                </p>
              </div>
            ) : chatMessages.map((msg, idx) => (
              <div key={idx} className={`text-xs font-mono ${msg.raw.startsWith("You:") || msg.raw.startsWith("Toi:") ? "text-right" : "text-left"}`}>
                <div className={`inline-block p-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                  msg.raw.startsWith("You:") || msg.raw.startsWith("Toi:")
                    ? "bg-zinc-900 border border-zinc-800 text-zinc-200"
                    : "bg-cyan-950/50 border border-cyan-500/40 text-cyan-200"
                }`}>
                  {msg.raw.replace(/^(Echo|You|Toi):\s*/i, "")}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="space-y-3 pt-3 border-t border-zinc-900">
            <textarea
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendEcho(); } }}
              rows={3}
              placeholder={fr ? "Parlez à votre agent calendrier..." : "Talk to your calendar agent..."}
              className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-cyan-400 rounded-2xl p-4 text-xs font-mono text-zinc-100 outline-none resize-none leading-relaxed"
            />
            <button
              onClick={handleSendEcho}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer"
            >
              {fr ? "ENVOYER À ECHO CALENDRIER" : "SEND TO ECHO CALENDAR"}
            </button>
          </div>
        </section>

      </div>

      {/* ── MODAL DE GESTION DU JOUR ÉLÉMENTS ── */}
      {selectedDateKey && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-md" onClick={() => setSelectedDateKey(null)}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
              <h3 className="font-mono text-xs font-bold text-cyan-400 uppercase tracking-widest">📅 {selectedDateKey}</h3>
              <button onClick={() => setSelectedDateKey(null)} className="text-zinc-500 hover:text-white font-mono text-xs">✕</button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
              {selectedEvents.length === 0 ? (
                <p className="text-xs font-mono text-zinc-600 italic py-2">{fr ? "Aucun événement enregistré pour ce jour." : "No events recorded for this day."}</p>
              ) : selectedEvents.map(ev => (
                <div key={ev.id} className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-2xl flex justify-between items-start">
                  <div>
                    <div className="text-xs font-mono font-bold text-zinc-200">{ev.title}</div>
                    <div className="text-[10px] font-mono text-zinc-500">{ev.start} {ev.end ? `→ ${ev.end}` : ""}</div>
                    {ev.notes && <p className="text-[10px] font-mono text-zinc-400 mt-1">{ev.notes}</p>}
                  </div>
                  <button onClick={() => deleteEvent(selectedDateKey, ev.id, ev.googleEventId)} className="text-zinc-600 hover:text-red-400 font-mono text-xs cursor-pointer">✕</button>
                </div>
              ))}
            </div>

            {!showAddForm ? (
              <button onClick={() => setShowAddForm(true)} className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 font-bold rounded-xl cursor-pointer">
                + {fr ? "Ajouter un événement" : "Add event"}
              </button>
            ) : (
              <div className="space-y-3 pt-3 border-t border-zinc-900">
                <input type="text" placeholder="Titre" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs font-mono" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="time" value={start} onChange={e => setStart(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs font-mono" />
                  <input type="time" value={end} onChange={e => setEnd(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs font-mono" />
                </div>
                <textarea placeholder="Notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs font-mono resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => setShowAddForm(false)} className="flex-1 py-2 bg-zinc-900 text-xs font-mono rounded-xl">{fr ? "Annuler" : "Cancel"}</button>
                  <button onClick={saveEvent} className="flex-1 py-2 bg-cyan-600 text-white font-mono font-bold text-xs rounded-xl">{fr ? "Enregistrer" : "Save"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showTutorial && (
        <CalendarTutorialPopup
          lang={lang}
          onClose={() => { setShowTutorial(false); localStorage.setItem(TUTO_KEY, "true"); }}
          onConnect={() => { setShowTutorial(false); localStorage.setItem(TUTO_KEY, "true"); reconnectGoogle(); }}
        />
      )}

    </main>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-cyan-400 font-mono text-xs">Initialisation du Calendrier...</div>}>
      <CalendarContent />
    </Suspense>
  );
}