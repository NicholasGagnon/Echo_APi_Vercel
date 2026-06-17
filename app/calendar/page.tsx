"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import LangDropdown from "../components/LangDropdown";
import { useApp } from "../../context/AppContext";
import { UserTier } from "../../utils/quota";

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

const DAYS_LABELS_FR = ["D", "L", "M", "M", "J", "V", "S"];
const DAYS_LABELS_EN = ["S", "M", "T", "W", "T", "F", "S"];

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const GOOGLE_CALENDAR_SCOPES = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";

const extractProviderTokenFromHash = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const hash = window.location.hash.substring(1);
    if (!hash) return null;
    const params = new URLSearchParams(hash);
    return params.get("provider_token") ?? null;
  } catch { return null; }
};

const clearHash = () => {
  if (typeof window !== "undefined")
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
};

export default function CalendarPage() {
  const { t, lang, theme, toggleTheme, userTier } = useApp();
  const today = new Date();

  // ── Safe tier ─────────────────────────────────────────────────────────────
  const safeTier = (userTier || "connected_free") as UserTier;

  const [currentYear, setCurrentYear]   = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [events, setEvents]             = useState<CalendarEvents>({});
  const [isLoaded, setIsLoaded]         = useState(false);
  const [userId, setUserId]             = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd]     = useState("");
  const [notes, setNotes] = useState("");

  const [googleToken, setGoogleToken]               = useState<string | null>(null);
  const [isSyncing, setIsSyncing]                   = useState(false);
  const [needsGoogleReconnect, setNeedsGoogleReconnect] = useState(false);
  const [showLimitModal, setShowLimitModal]         = useState(false);
  const icsInputRef = useRef<HTMLInputElement>(null);

  const getStorageKey     = (uid: string) => `echo-calendar-v2-${uid}`;
  const getGoogleTokenKey = (uid: string) => `echo-google-token-${uid}`;

  const getActiveToken = async (uid: string): Promise<string | null> => {
    if (googleToken) return googleToken;
    const { data: row } = await supabase.from("user_tokens").select("google_access_token").eq("id", uid).maybeSingle();
    if (row?.google_access_token) return row.google_access_token;
    return localStorage.getItem(getGoogleTokenKey(uid));
  };

  const saveTokenToDB = async (uid: string, token: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    await supabase.from("user_tokens").upsert({
      id: uid,
      google_access_token: token,
      google_refresh_token: sessionData.session?.refresh_token || null,
      user_tier: safeTier,
      last_request_date: new Date().toISOString().split("T")[0],
    }, { onConflict: "id" });
  };

  const storeToken = async (uid: string, token: string) => {
    setGoogleToken(token);
    localStorage.setItem(getGoogleTokenKey(uid), token);
    await saveTokenToDB(uid, token);
    setNeedsGoogleReconnect(false);
  };

  const clearStoredGoogleToken = async (uid: string) => {
    setGoogleToken(null);
    localStorage.removeItem(getGoogleTokenKey(uid));
    try { await supabase.from("user_tokens").update({ google_access_token: null }).eq("id", uid); } catch {}
  };

  const reconnectGoogle = async () => {
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/calendar` : undefined;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, scopes: GOOGLE_CALENDAR_SCOPES, queryParams: { access_type: "offline", prompt: "consent" } },
    });
  };

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { if (!cancelled) setIsLoaded(true); return; }

      const uid = session.user.id;
      setUserId(uid);

      const savedEvents = localStorage.getItem(getStorageKey(uid));
      if (savedEvents) { try { setEvents(JSON.parse(savedEvents)); } catch { setEvents({}); } }

      let activeToken: string | null = null;
      const hashToken = extractProviderTokenFromHash();
      if (hashToken) {
        clearHash();
        activeToken = hashToken;
        await storeToken(uid, hashToken);
      } else if (session.provider_token) {
        activeToken = session.provider_token;
        await storeToken(uid, session.provider_token);
      } else {
        const { data: row } = await supabase.from("user_tokens").select("google_access_token").eq("id", uid).maybeSingle();
        const saved = row?.google_access_token || localStorage.getItem(getGoogleTokenKey(uid));
        if (saved) { activeToken = saved; setGoogleToken(saved); localStorage.setItem(getGoogleTokenKey(uid), saved); }
      }

      if (activeToken) await fetchGoogleEvents(activeToken, uid);
      if (!cancelled) setIsLoaded(true);
    };

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        setUserId(null); setEvents({}); setGoogleToken(null); setNeedsGoogleReconnect(false); setIsLoaded(true); return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const uid = session.user.id;
        setUserId(uid);
        const savedEvents = localStorage.getItem(getStorageKey(uid));
        setEvents(savedEvents ? JSON.parse(savedEvents) : {});
        const hashToken = extractProviderTokenFromHash();
        const providerToken = hashToken || session.provider_token;
        if (providerToken) {
          clearHash();
          await storeToken(uid, providerToken);
          fetchGoogleEvents(providerToken, uid);
        } else {
          const { data: row } = await supabase.from("user_tokens").select("google_access_token").eq("id", uid).maybeSingle();
          const token = row?.google_access_token || localStorage.getItem(getGoogleTokenKey(uid));
          if (token) setGoogleToken(token);
        }
      }
    });

    return () => { cancelled = true; listener.subscription.unsubscribe(); };
  }, []);

  // ── Persistence ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !userId) return;
    localStorage.setItem(getStorageKey(userId), JSON.stringify(events));
  }, [events, isLoaded, userId]);

  // ── Refetch on month change ────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !userId || !googleToken) return;
    fetchGoogleEvents(googleToken, userId);
  }, [currentMonth, currentYear, isLoaded, userId, googleToken]);

  // ── Google fetch ──────────────────────────────────────────────────────────
  const fetchGoogleEvents = async (token: string, uid?: string) => {
    if (!token) return;
    setIsSyncing(true);
    try {
      const timeMin = new Date(currentYear, currentMonth, 1).toISOString();
      const timeMax = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status === 401 || res.status === 403) {
        if (uid) await clearStoredGoogleToken(uid);
        setNeedsGoogleReconnect(true);
        return;
      }
      if (!res.ok) { console.error("Google Calendar sync failed", res.status); return; }

      setNeedsGoogleReconnect(false);
      const data = await res.json();
      if (uid) await saveTokenToDB(uid, token);
      if (!data.items) return;

      const incomingEvents: CalendarEvents = {};
      data.items.forEach((item: any) => {
        const dateTimeStr = item.start?.dateTime || item.start?.date;
        if (!dateTimeStr) return;
        const dateKey   = dateTimeStr.split("T")[0];
        const startTime = item.start?.dateTime ? dateTimeStr.split("T")[1].substring(0, 5) : "";
        const endTime   = item.end?.dateTime ? item.end.dateTime.split("T")[1].substring(0, 5) : "";
        const ev: EventData = { id: item.id, title: item.summary || "Google Event", start: startTime, end: endTime, notes: item.description || "", googleEventId: item.id };
        if (!incomingEvents[dateKey]) incomingEvents[dateKey] = [];
        incomingEvents[dateKey].push(ev);
      });

      setEvents(prev => {
        const updated = { ...prev };
        const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
        Object.keys(updated).forEach(k => { if (k.startsWith(monthPrefix)) updated[k] = (updated[k] || []).filter(e => !e.googleEventId); });
        Object.keys(incomingEvents).forEach(k => {
          const local = (updated[k] || []).filter(e => !e.googleEventId);
          updated[k] = [...local, ...incomingEvents[k]];
        });
        return updated;
      });
    } catch (err) { console.error("fetchGoogleEvents error:", err); }
    finally { setIsSyncing(false); }
  };

  const handleManualSync = async () => {
    if (!userId) return;
    const token = await getActiveToken(userId);
    if (!token) { setNeedsGoogleReconnect(true); return; }
    fetchGoogleEvents(token, userId);
  };

  const pushEventToGoogle = async (dateKey: string, event: EventData): Promise<string | null> => {
    if (!userId) return null;
    const token = await getActiveToken(userId);
    if (!token) { setNeedsGoogleReconnect(true); return null; }
    try {
      const startObj = !event.start && !event.end ? { date: dateKey } : { dateTime: new Date(`${dateKey}T${event.start || "00:00"}:00`).toISOString() };
      const endObj   = !event.start && !event.end ? { date: dateKey } : { dateTime: new Date(`${dateKey}T${event.end || "23:59"}:00`).toISOString() };
      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ summary: event.title, description: event.notes, start: startObj, end: endObj }),
      });
      if (res.status === 401 || res.status === 403) { await clearStoredGoogleToken(userId); setNeedsGoogleReconnect(true); return null; }
      const d = await res.json();
      return d.id ?? null;
    } catch { return null; }
  };

  const deleteFromGoogle = async (eventId: string) => {
    if (!userId) return;
    const token = await getActiveToken(userId);
    if (!token) { setNeedsGoogleReconnect(true); return; }
    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401 || res.status === 403) { await clearStoredGoogleToken(userId); setNeedsGoogleReconnect(true); }
    } catch (err) { console.error(err); }
  };

  // ── ICS import/export ─────────────────────────────────────────────────────
  const exportICS = () => {
    let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Echo Ecosystem//Calendar//EN\n";
    Object.entries(events).forEach(([dateKey, dayEvents]) => {
      dayEvents.forEach(ev => {
        const d = dateKey.replace(/-/g, "");
        const tS = ev.start ? ev.start.replace(":", "") + "00" : "000000";
        const tE = ev.end ? ev.end.replace(":", "") + "00" : "235900";
        ics += `BEGIN:VEVENT\nUID:${ev.id}@echo.ai\nDTSTART:${d}T${tS}\nDTEND:${d}T${tE}\nSUMMARY:${ev.title}\nDESCRIPTION:${ev.notes.replace(/\n/g, "\\n")}\nEND:VEVENT\n`;
      });
    });
    ics += "END:VCALENDAR";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = "echo-schedule.ics";
    a.click();
  };

  const handleICSRawImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    const reader = new FileReader();
    reader.onload = () => {
      const lines = (reader.result as string).split(/\r?\n/);
      const imported: CalendarEvents = { ...events };
      let cur: Partial<EventData> & { dateKey?: string } = {};
      lines.forEach(line => {
        const cl = line.trim();
        if (cl === "BEGIN:VEVENT") { cur = { id: Date.now().toString() + Math.random().toString(36).substring(2, 5) }; }
        else if (cl.startsWith("DTSTART:") || cl.startsWith("DTSTART;")) {
          const match = cl.match(/(\d{8})T(\d{4})/);
          const matchDate = cl.match(/:(\d{8})$|;VALUE=DATE:(\d{8})/);
          if (match) { cur.dateKey = `${match[1].substring(0,4)}-${match[1].substring(4,6)}-${match[1].substring(6,8)}`; cur.start = `${match[2].substring(0,2)}:${match[2].substring(2,4)}`; }
          else if (matchDate) { const d = matchDate[1] || matchDate[2]; cur.dateKey = `${d.substring(0,4)}-${d.substring(4,6)}-${d.substring(6,8)}`; cur.start = ""; }
        }
        else if (cl.startsWith("DTEND:") || cl.startsWith("DTEND;")) { const m = cl.match(/(\d{8})T(\d{4})/); if (m) cur.end = `${m[2].substring(0,2)}:${m[2].substring(2,4)}`; }
        else if (cl.startsWith("SUMMARY:"))     { cur.title = cl.replace("SUMMARY:", "").trim(); }
        else if (cl.startsWith("DESCRIPTION:")) { cur.notes = cl.replace("DESCRIPTION:", "").replace(/\\n/g, "\n").trim(); }
        else if (cl === "END:VEVENT") {
          if (cur.dateKey && cur.title) {
            if (!imported[cur.dateKey]) imported[cur.dateKey] = [];
            if (!imported[cur.dateKey].some(e => e.title === cur.title && e.start === cur.start))
              imported[cur.dateKey].push({ id: cur.id!, title: cur.title, start: cur.start || "", end: cur.end || "", notes: cur.notes || "" });
          }
        }
      });
      localStorage.setItem(getStorageKey(userId), JSON.stringify(imported));
      setEvents(imported);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); };
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); };
  const goToday   = () => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); };

  const firstDay    = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const blanks      = Array.from({ length: firstDay });
  const days        = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const makeDateKey = (day: number) => `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const isToday     = (day: number) => day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const openDay  = (day: number) => { setSelectedDateKey(makeDateKey(day)); setShowAddForm(false); resetForm(); };
  const resetForm = () => { setTitle(""); setStart(""); setEnd(""); setNotes(""); };

  const saveEvent = async () => {
    if (!selectedDateKey || !title.trim()) return;
    const tempId = Date.now().toString();
    const ev: EventData = { id: tempId, title, start, end, notes };
    setEvents(prev => ({ ...prev, [selectedDateKey]: [...(prev[selectedDateKey] || []), ev] }));
    setShowAddForm(false);
    resetForm();
    if (userId) {
      try {
        const cloudId = await pushEventToGoogle(selectedDateKey, ev);
        if (cloudId) {
          setEvents(prev => {
            const dayEvs = prev[selectedDateKey] || [];
            return { ...prev, [selectedDateKey]: dayEvs.map(e => e.id === tempId ? { ...e, id: cloudId, googleEventId: cloudId } : e) };
          });
        }
      } catch (err) { console.error("Google push error:", err); }
    }
  };

  const deleteEvent = async (dateKey: string, id: string, googleId?: string) => {
    if (googleId) await deleteFromGoogle(googleId);
    setEvents(prev => ({ ...prev, [dateKey]: prev[dateKey].filter(e => e.id !== id) }));
  };

  const selectedEvents   = selectedDateKey ? events[selectedDateKey] || [] : [];
  const activeMonthLabel = lang === "fr" ? MONTHS_FR[currentMonth] : MONTHS_EN[currentMonth];
  const activeDaysLabels = lang === "fr" ? DAYS_LABELS_FR : DAYS_LABELS_EN;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="h-screen bg-white dark:bg-black text-black dark:text-white flex overflow-hidden relative font-sans transition-colors duration-200 selection:bg-cyan-500/30">
      <input type="file" ref={icsInputRef} accept=".ics" onChange={handleICSRawImport} className="hidden" />

      {/* TOP-RIGHT MENU */}
      <div className="absolute top-4 right-4 z-50 bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-300 dark:border-zinc-700 p-2 rounded-xl text-xs flex gap-3 items-center shadow-md">
        <LangDropdown />
        <span className="text-zinc-300 dark:text-zinc-700">|</span>
        <button onClick={toggleTheme} className="font-bold text-zinc-700 dark:text-zinc-300 hover:text-cyan-500 transition-colors">
          {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── SIDEBAR ── */}
        <aside className="w-55 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-8 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between">
          <div className="space-y-20">
            <h2 className="font-bold text-lg">
              <Link href="/" className="hover:text-cyan-500 dark:hover:text-cyan-400">{t.sidebar.home}</Link>
            </h2>
            <div className="space-y-20 text-zinc-800 dark:text-zinc-100 font-medium">
              <Link href="/chat"     className="block hover:text-cyan-500">{t.sidebar.chat}</Link>
              <Link href="/notes"    className="block hover:text-cyan-500">{t.sidebar.notes}</Link>
              <Link href="/calendar" className="block text-cyan-600 dark:text-cyan-400 font-bold">📅 {lang === "fr" ? "Calendrier" : "Calendar"}</Link>
              <Link href="/vitality" className="block hover:text-cyan-500">📈 {lang === "fr" ? "Vitalité" : "Vitality"}</Link>
              <Link href="/services" className="block hover:text-cyan-500">💎 Services</Link>
              <Link href="/account"  className="block hover:text-cyan-500">👤 {lang === "fr" ? "Compte" : "Account"}</Link>
              <hr className="border-zinc-200 dark:border-zinc-800 my-4" />
              <Link href="/history"  className="block hover:text-amber-500">⭐ {lang === "fr" ? "Historique" : "History"}</Link>
            </div>
          </div>
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
            Status : <span className="text-cyan-500 dark:text-cyan-400 uppercase font-bold block">{safeTier}</span>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <section className="flex-1 flex flex-col px-4 sm:px-8 py-12 overflow-y-auto bg-white dark:bg-gradient-to-b dark:from-zinc-950 dark:via-black dark:to-black transition-colors duration-200 min-w-0">

          {/* Reconnect banner */}
          {needsGoogleReconnect && (
            <div className="w-full max-w-7xl mx-auto mb-6 flex items-center justify-between gap-3 flex-wrap bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl px-4 py-3 text-xs">
              <span className="text-amber-700 dark:text-amber-300 font-medium">
                {lang === "fr" ? "⚠️ Connexion Google Calendar expirée. Reconnecte ton compte pour réactiver la synchronisation." : "⚠️ Your Google Calendar connection has expired. Reconnect your account to resume syncing."}
              </span>
              <button onClick={reconnectGoogle} className="bg-amber-500 hover:bg-amber-400 text-white font-bold px-4 py-2 rounded-xl text-[11px] transition-colors shrink-0">
                {lang === "fr" ? "🔗 Reconnecter Google" : "🔗 Reconnect Google"}
              </button>
            </div>
          )}

          {/* Calendar header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-start gap-4 mb-8 shrink-0 w-full max-w-7xl mx-auto border-b border-zinc-100 dark:border-zinc-900 pb-5">
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:text-cyan-500 transition-colors text-xs">◀</button>
              <button onClick={goToday} className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 hover:text-cyan-500 transition-colors">
                📅 {activeMonthLabel} {currentYear}
              </button>
              <button onClick={nextMonth} className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:text-cyan-500 transition-colors text-xs">▶</button>
            </div>

            <div className="flex items-center gap-2 bg-zinc-50/80 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 p-1.5 rounded-xl shadow-sm ml-0 lg:ml-6 overflow-x-auto max-w-full">
              <button onClick={handleManualSync} disabled={isSyncing}
                className={`text-[11px] font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 border ${
                  isSyncing ? "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 cursor-not-allowed animate-pulse"
                            : "bg-cyan-600 text-white border-transparent hover:bg-cyan-500 shadow-sm"}`}>
                {isSyncing ? "⏳..." : "🔄 Sync Google"}
              </button>
              <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1 shrink-0" />
              <button onClick={() => icsInputRef.current?.click()}
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-cyan-500 text-[11px] font-bold px-3 py-2 rounded-lg transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm shrink-0">
                📥 {lang === "fr" ? "Importer" : "Import"}
              </button>
              <button onClick={exportICS}
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-cyan-500 text-[11px] font-bold px-3 py-2 rounded-lg transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm shrink-0">
                📤 {lang === "fr" ? "Exporter" : "Export"}
              </button>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col min-h-0 overflow-x-auto">
            <div className="min-w-[600px] flex-1 flex flex-col">

              <div className="grid grid-cols-7 gap-2 mb-2 text-center font-bold text-zinc-400 dark:text-zinc-500 text-[11px] uppercase tracking-widest font-mono">
                {activeDaysLabels.map((d, i) => <div key={i}>{d}</div>)}
              </div>

              <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
                {blanks.map((_, i) => <div key={"b" + i} className="bg-zinc-50/20 dark:bg-zinc-950/10 rounded-xl border border-transparent" />)}
                {days.map(day => {
                  const key       = makeDateKey(day);
                  const dayEvents = events[key] || [];
                  const mainToday = isToday(day);
                  return (
                    <button key={day} onClick={() => openDay(day)}
                      className={`min-h-[90px] border rounded-xl p-2 text-left flex flex-col justify-between transition-all overflow-hidden ${
                        mainToday
                          ? "border-cyan-500 bg-cyan-50/5 dark:bg-zinc-900/60 shadow-md shadow-cyan-500/5 drop-shadow-[0_0_4px_rgba(6,182,212,0.15)]"
                          : "border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/20 hover:border-zinc-400 dark:hover:border-zinc-800"}`}>
                      <div className={`font-mono text-xs font-bold ${mainToday ? "text-cyan-500" : "text-zinc-400 dark:text-zinc-500"}`}>{day}</div>
                      <div className="flex-1 w-full space-y-1 mt-1 overflow-hidden flex flex-col justify-start">
                        {dayEvents.slice(0, 2).map(ev => (
                          <div key={ev.id}
                            onClick={e => { e.stopPropagation(); setSelectedDateKey(key); setTitle(ev.title || ""); setStart(ev.start || ""); setEnd(ev.end || ""); setNotes(ev.notes || ""); setShowAddForm(true); }}
                            className={`text-[10px] border rounded-lg px-1.5 py-0.5 truncate w-full tracking-wide transition-colors ${
                              ev.isFromEcho
                                ? "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/60 text-purple-700 dark:text-purple-400 font-medium"
                                : "bg-white dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"}`}>
                            <span className="font-bold">{ev.start ? `${ev.start} ` : ""}</span>{ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && <div className="text-[9px] text-cyan-600 dark:text-cyan-500 font-mono font-bold pl-1">+{dayEvents.length - 2} items</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── DAY MODAL ── */}
      {selectedDateKey && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setSelectedDateKey(null)}>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-900 pb-4">
              <div>
                <h2 className="text-base font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-bold">📅 {selectedDateKey}</h2>
                <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">
                  {lang === "fr" ? "Gestion des événements de ce nœud temporel." : "Event orchestrator for this specific time node."}
                </p>
              </div>
              <button onClick={() => setSelectedDateKey(null)} className="text-zinc-400 hover:text-black dark:hover:text-white font-mono text-sm p-2 transition-colors">✕</button>
            </div>

            {selectedEvents.length > 0 && (
              <div className="space-y-3">
                {selectedEvents.map(ev => (
                  <div key={ev.id} className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex justify-between items-start">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2 flex-wrap">
                        {ev.title}
                        {ev.isFromEcho && <span className="text-[9px] bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded-md border border-purple-300 dark:border-purple-800 uppercase tracking-widest font-mono font-bold text-purple-700 dark:text-purple-400">Echo Agent</span>}
                        {ev.googleEventId && <span className="text-[9px] bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-300 dark:border-zinc-700 uppercase tracking-widest font-mono font-bold text-zinc-500">Google</span>}
                      </div>
                      <div className="text-zinc-400 dark:text-zinc-500 text-xs font-mono">
                        🕒 {ev.start ? `${ev.start}${ev.end ? ` → ${ev.end}` : ""}` : (lang === "fr" ? "Journée Complète" : "All Day")}
                      </div>
                      {ev.notes && (
                        <p className="text-zinc-600 dark:text-zinc-400 text-xs bg-white dark:bg-black/40 border border-zinc-200 dark:border-zinc-900 rounded-xl p-2.5 mt-2 whitespace-pre-wrap leading-relaxed shadow-inner">
                          {ev.notes}
                        </p>
                      )}
                    </div>
                    <button onClick={() => deleteEvent(selectedDateKey, ev.id, ev.googleEventId)} className="text-zinc-400 hover:text-red-500 font-mono text-sm ml-4 p-1 transition-colors">🗑️</button>
                  </div>
                ))}
              </div>
            )}

            {selectedEvents.length === 0 && !showAddForm && (
              <div className="text-center py-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 dark:text-zinc-600 text-xs">
                {lang === "fr" ? "Aucun événement enregistré sur ce segment." : "No active events bound to this grid segment."}
              </div>
            )}

            {!showAddForm && (
              <button onClick={() => setShowAddForm(true)}
                className="w-full bg-zinc-100 dark:bg-zinc-900 hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-600 border border-transparent font-bold py-3 rounded-xl text-xs transition-colors">
                ➕ {lang === "fr" ? "Ajouter un événement" : "Add event"}
              </button>
            )}

            {showAddForm && (
              <div className="space-y-4 border-t border-zinc-200 dark:border-zinc-900 pt-4 animate-in fade-in duration-200">
                <h3 className="font-mono text-xs uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-bold">
                  ➕ {lang === "fr" ? "Nouveau Paramètre" : "New Parameter"}
                </h3>
                <input type="text" placeholder={lang === "fr" ? "Désignation de la tâche" : "Event Title"} value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-1.5 font-bold">{lang === "fr" ? "Début" : "Start Time"}</label>
                    <input type="time" value={start} onChange={e => setStart(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-1.5 font-bold">{lang === "fr" ? "Fin" : "End Time"}</label>
                    <input type="time" value={end} onChange={e => setEnd(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-1.5 font-bold">Notes</label>
                  <textarea placeholder="..." value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                    className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner resize-none" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowAddForm(false)}
                    className="flex-1 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold py-3 rounded-xl text-xs transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800">
                    {lang === "fr" ? "Annuler" : "Cancel"}
                  </button>
                  <button onClick={saveEvent}
                    className="flex-1 bg-cyan-600 text-white font-bold py-3 rounded-xl text-xs transition-all hover:bg-cyan-500 shadow-md shadow-cyan-500/10">
                    {lang === "fr" ? "Enregistrer" : "Save Node"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LIMIT MODAL ── */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowLimitModal(false)}>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="text-3xl">💎</div>
            <h3 className="text-lg font-bold tracking-tight">{lang === "fr" ? "Module d'extension requis" : "Upgrade Required"}</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
              {lang === "fr" ? "La synchronisation bidirectionnelle automatique Google Calendar nécessite un compte Premium ou supérieur." : "Bi-directional Google Calendar syncing is restricted to higher infrastructure tiers."}
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/services" onClick={() => setShowLimitModal(false)} className="bg-cyan-600 text-white font-bold py-3 rounded-xl text-xs transition-all hover:bg-cyan-500 block shadow-md shadow-cyan-500/10">
                {lang === "fr" ? "Voir les plans" : "Review Access Tiers"}
              </Link>
              <button onClick={() => setShowLimitModal(false)} className="text-zinc-400 dark:text-zinc-600 hover:text-black dark:hover:text-white font-mono text-[10px] uppercase font-bold tracking-wider transition-colors py-2">
                {lang === "fr" ? "Fermer" : "Dismiss"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}