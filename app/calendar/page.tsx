"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { useApp } from "../../context/AppContext";
import { checkQuota, UserTier } from "../../utils/quota";
import LangDropdown from "../components/LangDropdown";
import QuotaPopup from "../components/QuotaPopup";

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

const DAYS_LABELS_FR = ["D","L","M","M","J","V","S"];
const DAYS_LABELS_EN = ["S","M","T","W","T","F","S"];
const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const GOOGLE_CALENDAR_SCOPES = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";

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

// ── TUTORIAL POPUP ────────────────────────────────────────────────────────────
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
              {fr ? "👑 Hola Roi du Calendrier !" : "👑 Hola, Calendar King!"}
            </h2>
            <p className="text-zinc-400 text-[12px] mt-1 leading-relaxed">
              {fr
                ? "C'est ici que tu peux synchroniser tes rendez-vous et activer ton calendrier connecté."
                : "This is where you can sync your appointments and activate your connected calendar."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LangDropdown />
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all text-sm font-mono">✕</button>
          </div>
        </div>

        <div className="px-7 py-6 overflow-y-auto flex-1 space-y-5">
          <p className="text-zinc-300 text-[13px] leading-relaxed">
            {fr
              ? "Pour commencer, clique sur \"Se connecter\" en bas et connecte ton compte Google. Google va t'envoyer des avertissements, c'est normal."
              : "To get started, click \"Connect\" below and link your Google account. Google will show warnings — that's expected."}
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-black">
              {fr ? "📋 Guide d'autorisation pas à pas" : "📋 Step-by-step authorization guide"}
            </p>
            {[
              fr ? "Sélectionnez l'adresse du compte Google cible que vous désirez lier à vos matrices Echo." : "Select the Google account you want to link to your Echo ecosystem.",
              fr ? 'Dès l\'apparition de l\'écran d\'avertissement de sécurité de Google, repérez et cliquez sur le petit lien textuel "Paramètres avancés" (Advanced) situé dans le coin inférieur gauche.' : 'When the Google security warning screen appears, find and click the small link "Advanced settings" in the lower left corner.',
              fr ? 'Une section masquée va s\'étendre : cliquez fermement sur le lien de contournement "Accéder à echosai.ca (non sécurisé)" pour lier l\'agent.' : 'A hidden section will expand: click the bypass link "Go to echosai.ca (unsafe)" to bind the agent.',
              fr ? "Sur l'écran final de consentement, cochez impérativement toutes les cases d'autorisations requises pour la lecture, la création et la modification de vos événements d'agenda, puis confirmez la validation." : "On the final consent screen, you must check all permission boxes for reading, creating, and modifying your calendar events, then confirm.",
            ].map((step, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[10px] font-black font-mono flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                <p className="text-zinc-300 text-[13px] leading-relaxed flex-1">{step}</p>
              </div>
            ))}
          </div>
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl px-4 py-3">
            <p className="text-zinc-300 text-[13px] leading-relaxed">
              {fr ? "Une fois connecté, Echo pourra gérer et synchroniser tes événements automatiquement." : "Once connected, Echo will be able to manage and sync your events automatically."}
            </p>
            <p className="text-cyan-400 font-bold text-sm mt-1">Adiooo 😎</p>
          </div>
        </div>

        <div className="px-7 py-5 border-t border-zinc-800 flex items-center justify-between gap-3 shrink-0">
          <button onClick={onConnect} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs px-6 py-3 rounded-xl uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] font-mono">
            {fr ? "Se connecter à Google Calendar" : "Connect to Google Calendar"}
          </button>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-[11px] font-mono transition-colors">
            {fr ? "Plus tard" : "Later"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PAGE PRINCIPALE ───────────────────────────────────────────────────────────
export default function CalendarPage() {
  const { t, lang, userTier, triggerToast } = useApp();
  const today    = new Date();
  const safeTier = (userTier || "connected_free") as UserTier;

  const [currentYear,  setCurrentYear]  = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [events,       setEvents]       = useState<CalendarEvents>({});
  const [isLoaded,     setIsLoaded]     = useState(false);
  const [userId,       setUserId]       = useState<string|null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string|null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [title,       setTitle]       = useState("");
  const [start,       setStart]       = useState("");
  const [end,         setEnd]         = useState("");
  const [notes,       setNotes]       = useState("");

  const [googleToken,          setGoogleToken]          = useState<string|null>(null);
  const [isSyncing,            setIsSyncing]            = useState(false);
  const [needsGoogleReconnect, setNeedsGoogleReconnect] = useState(false);

  // ── QUOTA POPUP ───────────────────────────────────────────────────────────
  const [showQuotaPopup,  setShowQuotaPopup]  = useState(false);
  const [quotaPopupLabel, setQuotaPopupLabel] = useState("");
  const triggerQuotaPopup = (label: string) => { setQuotaPopupLabel(label); setShowQuotaPopup(true); };

  const icsInputRef    = useRef<HTMLInputElement>(null);
  const isFetchingRef  = useRef(false);
  const googleTokenRef = useRef<string|null>(null);

  const getStorageKey     = (uid: string) => `echo-calendar-v2-${uid}`;
  const getGoogleTokenKey = (uid: string) => `echo-google-token-${uid}`;
  const TUTO_KEY = "echo-calendar-tuto-seen-v1";

  // ── CHARGER EVENTS SUPABASE ───────────────────────────────────────────────
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
          const supaOnly   = rebuilt[k] || [];
          const seen       = new Set(googleOnly.map(e => e.id));
          updated[k]       = [...googleOnly, ...supaOnly.filter(e => !seen.has(e.id))];
        });
        return updated;
      });
    } catch (err: any) {
      console.error("[Calendar] fetchSupabaseEvents:", err.message);
    }
  }, []);

  // ── TOKEN HELPERS ─────────────────────────────────────────────────────────
  const resolveToken = useCallback(async (uid: string): Promise<string|null> => {
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

  // ── FETCH GOOGLE EVENTS ───────────────────────────────────────────────────
  const fetchGoogleEvents = useCallback(async (token: string, uid: string, year?: number, month?: number) => {
    if (!token || !uid || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsSyncing(true);
    const y = year ?? currentYear;
    const m = month ?? currentMonth;
    try {
      const timeMin = new Date(y, m, 1).toISOString();
      const timeMax = new Date(y, m+1, 0, 23, 59, 59).toISOString();
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
        const dateKey   = rawStart.split("T")[0];
        const startTime = item.start?.dateTime ? rawStart.split("T")[1]?.substring(0,5) : "";
        const endTime   = item.end?.dateTime   ? item.end.dateTime.split("T")[1]?.substring(0,5) : "";
        if (!incoming[dateKey]) incoming[dateKey] = [];
        incoming[dateKey].push({
          id: item.id, title: item.summary || "Google Event",
          start: startTime, end: endTime, notes: item.description || "",
          googleEventId: item.id,
        });
      });
      setEvents(prev => {
        const updated = { ...prev };
        const prefix  = `${y}-${String(m+1).padStart(2,"0")}`;
        Object.keys(updated).forEach(k => { if (k.startsWith(prefix)) updated[k] = (updated[k]||[]).filter(e => !e.googleEventId); });
        Object.keys(incoming).forEach(k => {
          const local = (updated[k]||[]).filter(e => !e.googleEventId);
          updated[k]  = [...local, ...incoming[k]];
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

  // ── PUSH EVENT VERS GOOGLE ────────────────────────────────────────────────
  const pushEventToGoogle = useCallback(async (uid: string, dateKey: string, ev: EventData): Promise<string|null> => {
    const token = await resolveToken(uid);
    if (!token) { setNeedsGoogleReconnect(true); return null; }
    try {
      const hasTime  = !!(ev.start || ev.end);
      const startObj = hasTime ? { dateTime: new Date(`${dateKey}T${ev.start||"00:00"}:00`).toISOString() } : { date: dateKey };
      const endObj   = hasTime ? { dateTime: new Date(`${dateKey}T${ev.end||"23:59"}:00`).toISOString() }   : { date: dateKey };
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

  // ── BOOTSTRAP ─────────────────────────────────────────────────────────────
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

      let activeToken: string|null = null;
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
        const hashToken     = extractProviderTokenFromHash();
        const providerToken = hashToken || session.provider_token;
        if (providerToken) { clearHash(); await storeToken(uid, providerToken); await fetchGoogleEvents(providerToken, uid, today.getFullYear(), today.getMonth()); }
        else { const token = await resolveToken(uid); if (token) await fetchGoogleEvents(token, uid, today.getFullYear(), today.getMonth()); }
      }
    });

    return () => { cancelled = true; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (!isLoaded || !userId) return; localStorage.setItem(getStorageKey(userId), JSON.stringify(events)); }, [events, isLoaded, userId]);
  useEffect(() => { if (!isLoaded || !userId) return; const token = googleTokenRef.current; if (token) fetchGoogleEvents(token, userId, currentYear, currentMonth); }, [currentMonth, currentYear]);

  // ── MANUAL SYNC ───────────────────────────────────────────────────────────
  const handleManualSync = async () => {
    if (!userId) return;
    await fetchSupabaseEvents(userId);
    const token = await resolveToken(userId);
    if (!token) { setNeedsGoogleReconnect(true); return; }
    await fetchGoogleEvents(token, userId, currentYear, currentMonth);
    triggerToast("info", lang==="fr"?"Données synchronisées !":"Data synchronized!");
  };

  // ── ICS ───────────────────────────────────────────────────────────────────
  const exportICS = () => {
    let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Echo Ecosystem//Calendar//EN\n";
    Object.entries(events).forEach(([dateKey, dayEvents]) => {
      dayEvents.forEach(ev => {
        const d  = dateKey.replace(/-/g,"");
        const tS = ev.start ? ev.start.replace(":","")+"00" : "000000";
        const tE = ev.end   ? ev.end.replace(":","")+"00"   : "235900";
        ics += `BEGIN:VEVENT\nUID:${ev.id}@echo.ai\nDTSTART:${d}T${tS}\nDTEND:${d}T${tE}\nSUMMARY:${ev.title}\nDESCRIPTION:${ev.notes.replace(/\n/g,"\\n")}\nEND:VEVENT\n`;
      });
    });
    ics += "END:VCALENDAR";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics],{type:"text/calendar"}));
    a.download = "echo-schedule.ics"; a.click();
  };

  const handleICSRawImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    const reader = new FileReader();
    reader.onload = () => {
      const lines    = (reader.result as string).split(/\r?\n/);
      const imported = { ...events };
      let cur: Partial<EventData> & { dateKey?: string } = {};
      lines.forEach(line => {
        const cl = line.trim();
        if (cl === "BEGIN:VEVENT") { cur = { id: Date.now().toString()+Math.random().toString(36).substring(2,5) }; }
        else if (cl.startsWith("DTSTART:") || cl.startsWith("DTSTART;")) {
          const match     = cl.match(/(\d{8})T(\d{4})/);
          const matchDate = cl.match(/:(\d{8})$|;VALUE=DATE:(\d{8})/);
          if (match) { cur.dateKey=`${match[1].substring(0,4)}-${match[1].substring(4,6)}-${match[1].substring(6,8)}`; cur.start=`${match[2].substring(0,2)}:${match[2].substring(2,4)}`; }
          else if (matchDate) { const d=matchDate[1]||matchDate[2]; cur.dateKey=`${d.substring(0,4)}-${d.substring(4,6)}-${d.substring(6,8)}`; cur.start=""; }
        }
        else if (cl.startsWith("DTEND:") || cl.startsWith("DTEND;")) { const m=cl.match(/(\d{8})T(\d{4})/); if(m) cur.end=`${m[2].substring(0,2)}:${m[2].substring(2,4)}`; }
        else if (cl.startsWith("SUMMARY:"))     { cur.title=cl.replace("SUMMARY:","").trim(); }
        else if (cl.startsWith("DESCRIPTION:")) { cur.notes=cl.replace("DESCRIPTION:","").replace(/\\n/g,"\n").trim(); }
        else if (cl === "END:VEVENT" && cur.dateKey && cur.title) {
          if (!imported[cur.dateKey]) imported[cur.dateKey] = [];
          if (!imported[cur.dateKey].some(e => e.title===cur.title && e.start===cur.start))
            imported[cur.dateKey].push({ id:cur.id!, title:cur.title, start:cur.start||"", end:cur.end||"", notes:cur.notes||"" });
        }
      });
      localStorage.setItem(getStorageKey(userId), JSON.stringify(imported));
      setEvents(imported);
    };
    reader.readAsText(file); e.target.value="";
  };

  // ── NAVIGATION ────────────────────────────────────────────────────────────
  const prevMonth = () => { if(currentMonth===0){setCurrentMonth(11);setCurrentYear(y=>y-1);}else setCurrentMonth(m=>m-1); };
  const nextMonth = () => { if(currentMonth===11){setCurrentMonth(0);setCurrentYear(y=>y+1);}else setCurrentMonth(m=>m+1); };
  const goToday   = () => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); };

  const firstDay    = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth+1, 0).getDate();
  const blanks      = Array.from({ length: firstDay });
  const days        = Array.from({ length: daysInMonth }, (_,i) => i+1);

  const makeDateKey = (day: number) => `${currentYear}-${String(currentMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  const isToday     = (day: number) => day===today.getDate() && currentMonth===today.getMonth() && currentYear===today.getFullYear();

  const openDay   = (day: number) => { setSelectedDateKey(makeDateKey(day)); setShowAddForm(false); resetForm(); };
  const resetForm = () => { setTitle(""); setStart(""); setEnd(""); setNotes(""); };

  // ── SAVE EVENT — avec quota calendar ─────────────────────────────────────
  const saveEvent = async () => {
    if (!selectedDateKey || !title.trim() || !userId) return;

    const quotaStatus = checkQuota("calendar", safeTier, true, userId);
    if (!quotaStatus.allowed) {
      triggerQuotaPopup(lang === "fr" ? "Calendrier" : "Calendar");
      return;
    }

    const tempId = Date.now().toString();
    const ev: EventData = { id: tempId, title, start, end, notes };

    setEvents(prev => ({ ...prev, [selectedDateKey]: [...(prev[selectedDateKey]||[]), ev] }));
    setShowAddForm(false); resetForm();

    try {
      const cloudId = await pushEventToGoogle(userId, selectedDateKey, ev);
      const finalId = cloudId || tempId;

      const { error: supaErr } = await supabase.from("echo_calendar").insert({
        id:           finalId,
        user_id:      userId,
        title,
        start_date:   selectedDateKey,
        end_date:     selectedDateKey,
        start_time:   start || null,
        end_time:     end   || null,
        notes,
        is_from_echo: false,
      });

      if (supaErr) {
        console.error("[Calendar] Supabase insert:", supaErr.message);
        triggerToast("error", `Erreur: ${supaErr.message}`);
      } else {
        triggerToast("info", lang==="fr"?"Événement sauvegardé !":"Event saved!");
      }

      if (cloudId) {
        setEvents(prev => ({
          ...prev,
          [selectedDateKey]: (prev[selectedDateKey]||[]).map(e =>
            e.id===tempId ? { ...e, id:cloudId, googleEventId:cloudId } : e
          ),
        }));
      }
    } catch (err) {
      console.error("[Calendar] saveEvent crash:", err);
    }
  };

  const deleteEvent = async (dateKey: string, id: string, googleId?: string) => {
    if (!userId) return;
    if (googleId) await deleteFromGoogle(userId, googleId);
    const { error } = await supabase.from("echo_calendar").delete().eq("id",id).eq("user_id",userId);
    if (error) console.error("[Calendar] delete:", error.message);
    setEvents(prev => ({ ...prev, [dateKey]: (prev[dateKey]||[]).filter(e => e.id!==id) }));
    triggerToast("info", lang==="fr"?"Événement supprimé.":"Event deleted.");
  };

  const selectedEvents   = selectedDateKey ? events[selectedDateKey]||[] : [];
  const activeMonthLabel = lang==="fr" ? MONTHS_FR[currentMonth] : MONTHS_EN[currentMonth];
  const activeDaysLabels = lang==="fr" ? DAYS_LABELS_FR : DAYS_LABELS_EN;

  return (
    <main className="h-[100dvh] bg-white dark:bg-black text-black dark:text-white flex overflow-hidden relative font-sans transition-colors duration-200 selection:bg-cyan-500/30">
      <input type="file" ref={icsInputRef} accept=".ics" onChange={handleICSRawImport} className="hidden"/>

      {/* POPUP QUOTA */}
      {showQuotaPopup && <QuotaPopup label={quotaPopupLabel} lang={lang} onClose={() => setShowQuotaPopup(false)} />}

      {/* TUTORIAL */}
      {showTutorial && (
        <CalendarTutorialPopup
          lang={lang}
          onClose={() => { setShowTutorial(false); localStorage.setItem(TUTO_KEY, "true"); }}
          onConnect={() => { setShowTutorial(false); localStorage.setItem(TUTO_KEY, "true"); reconnectGoogle(); }}
        />
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* SIDEBAR */}
        <aside className="w-55 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-8 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between">
          <div className="space-y-20">
            <h2 className="font-bold text-lg">
              <Link href="/" className="hover:text-cyan-500 dark:hover:text-cyan-400">{t.sidebar.home}</Link>
            </h2>
            <div className="space-y-20 text-zinc-800 dark:text-zinc-100 font-medium">
              <Link href="/chat"       className="block hover:text-cyan-500">{t.sidebar.chat}</Link>
              <Link href="/books"      className="block hover:text-cyan-500">{t.sidebar.books}</Link>
              <Link href="/calendar"   className="block text-cyan-600 dark:text-cyan-400 font-bold">📅 {lang==="fr"?"Calendrier":"Calendar"}</Link>
              <Link href="/vitality"   className="block hover:text-cyan-500">📈 {lang==="fr"?"Vitalité":"Vitality"}</Link>
              <Link href="/services"   className="block hover:text-cyan-500">💎 Services</Link>
              <Link href="/account"    className="block hover:text-cyan-500">👤 {lang==="fr"?"Compte":"Account"}</Link>
              <Link href="/horizonweb" className="block hover:text-cyan-500">📡 HorizonWeb</Link>
              <hr className="border-zinc-200 dark:border-zinc-800 my-4"/>
              <Link href="/history"    className="block hover:text-amber-500">⭐ {lang==="fr"?"Historique":"History"}</Link>
            </div>
          </div>
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
            Status : <span className="text-cyan-500 dark:text-cyan-400 uppercase font-bold block">{safeTier === "connected_free" ? (lang === "fr" ? "Accès libre" : "FreeConnect") : safeTier}</span>
          </div>
        </aside>

        {/* MAIN */}
        <section className="flex-1 flex flex-col px-4 sm:px-8 py-12 overflow-y-auto bg-white dark:bg-gradient-to-b dark:from-zinc-950 dark:via-black dark:to-black transition-colors duration-200 min-w-0">

          {needsGoogleReconnect && (
            <div className="w-full max-w-7xl mx-auto mb-6 flex items-center justify-between gap-3 flex-wrap bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl px-4 py-3 text-xs">
              <span className="text-amber-700 dark:text-amber-300 font-medium">
                {lang==="fr" ? "Connexion Google Calendar expirée. Reconnecte ton compte pour réactiver la synchronisation." : "Google Calendar connection expired. Reconnect your account to resume syncing."}
              </span>
              <button onClick={reconnectGoogle} className="bg-amber-500 hover:bg-amber-400 text-white font-bold px-4 py-2 rounded-xl text-[11px] transition-colors shrink-0">
                {lang==="fr"?"Reconnecter Google":"Reconnect Google"}
              </button>
            </div>
          )}

          {/* Header */}
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
                className={`text-[11px] font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 border ${isSyncing ? "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 cursor-not-allowed animate-pulse" : "bg-cyan-600 text-white border-transparent hover:bg-cyan-500 shadow-sm"}`}>
                {isSyncing ? "..." : "Google Sync"}
              </button>
              <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1 shrink-0"/>
              <button onClick={() => icsInputRef.current?.click()} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-cyan-500 text-[11px] font-bold px-3 py-2 rounded-lg transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm shrink-0">
                {lang==="fr"?"Importer":"Import"}
              </button>
              <button onClick={exportICS} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-cyan-500 text-[11px] font-bold px-3 py-2 rounded-lg transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm shrink-0">
                {lang==="fr"?"Exporter":"Export"}
              </button>
              <button onClick={() => setShowTutorial(true)} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-cyan-500 text-[11px] font-bold px-3 py-2 rounded-lg transition-colors text-zinc-700 dark:text-zinc-300 shadow-sm shrink-0">?</button>
              {googleTokenRef.current && !needsGoogleReconnect && (
                <div className="text-[10px] text-emerald-500 font-mono font-bold shrink-0 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"/>Google
                </div>
              )}
            </div>
          </div>

          {/* Grille calendrier */}
          <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col">
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-7 gap-2 mb-2 text-center font-bold text-zinc-400 dark:text-zinc-500 text-[11px] uppercase tracking-widest font-mono">
                  {activeDaysLabels.map((d,i) => <div key={i}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-2 auto-rows-fr">
                  {blanks.map((_,i) => <div key={"b"+i} className="bg-zinc-50/20 dark:bg-zinc-950/10 rounded-xl border border-transparent"/>)}
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
                        <div className={`font-mono text-xs font-bold ${mainToday?"text-cyan-500":"text-zinc-400 dark:text-zinc-500"}`}>{day}</div>
                        <div className="flex-1 w-full space-y-1 mt-1 overflow-hidden flex flex-col justify-start">
                          {dayEvents.slice(0,2).map(ev => (
                            <div key={ev.id}
                              className={`text-[10px] border rounded-lg px-1.5 py-0.5 truncate w-full tracking-wide ${
                                ev.isFromEcho
                                  ? "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/60 text-purple-700 dark:text-purple-400 font-medium"
                                  : ev.googleEventId
                                  ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-400"
                                  : "bg-white dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"}`}>
                              <span className="font-bold">{ev.start?`${ev.start} `:""}</span>{ev.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && <div className="text-[9px] text-cyan-600 dark:text-cyan-500 font-mono font-bold pl-1">+{dayEvents.length-2}</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* DAY MODAL */}
      {selectedDateKey && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setSelectedDateKey(null)}>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-900 pb-4">
              <div>
                <h2 className="text-base font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-bold">📅 {selectedDateKey}</h2>
                <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">
                  {lang==="fr"?"Gestion des événements de cette journée.":"Event manager for this day."}
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
                        {ev.isFromEcho && <span className="text-[9px] bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded-md border border-purple-300 dark:border-purple-800 uppercase font-mono font-bold text-purple-700 dark:text-purple-400">Echo</span>}
                        {ev.googleEventId && <span className="text-[9px] bg-blue-100 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-300 dark:border-blue-800 uppercase font-mono font-bold text-blue-600 dark:text-blue-400">Google</span>}
                      </div>
                      <div className="text-zinc-400 dark:text-zinc-500 text-xs font-mono">
                        {ev.start?`${ev.start}${ev.end?` → ${ev.end}`:""}`:lang==="fr"?"Journée complète":"All Day"}
                      </div>
                      {ev.notes && (
                        <p className="text-zinc-600 dark:text-zinc-400 text-xs bg-white dark:bg-black/40 border border-zinc-200 dark:border-zinc-900 rounded-xl p-2.5 mt-2 whitespace-pre-wrap leading-relaxed shadow-inner">{ev.notes}</p>
                      )}
                    </div>
                    <button onClick={() => deleteEvent(selectedDateKey, ev.id, ev.googleEventId)} className="text-zinc-400 hover:text-red-500 font-mono text-sm ml-4 p-1 transition-colors">✕</button>
                  </div>
                ))}
              </div>
            )}

            {selectedEvents.length===0 && !showAddForm && (
              <div className="text-center py-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 dark:text-zinc-600 text-xs">
                {lang==="fr"?"Aucun événement sur cette journée.":"No events on this day."}
              </div>
            )}

            {!showAddForm && (
              <button onClick={() => setShowAddForm(true)} className="w-full bg-zinc-100 dark:bg-zinc-900 hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-600 border border-transparent font-bold py-3 rounded-xl text-xs transition-colors">
                + {lang==="fr"?"Ajouter un événement":"Add event"}
              </button>
            )}

            {showAddForm && (
              <div className="space-y-4 border-t border-zinc-200 dark:border-zinc-900 pt-4 animate-in fade-in duration-200">
                <h3 className="font-mono text-xs uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-bold">
                  + {lang==="fr"?"Nouvel événement":"New event"}
                </h3>
                <input type="text" placeholder={lang==="fr"?"Titre de l'événement":"Event title"} value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"/>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-1.5 font-bold">{lang==="fr"?"Début":"Start"}</label>
                    <input type="time" value={start} onChange={e => setStart(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"/>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-1.5 font-bold">{lang==="fr"?"Fin":"End"}</label>
                    <input type="time" value={end} onChange={e => setEnd(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"/>
                  </div>
                </div>
                <textarea placeholder="Notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner resize-none"/>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowAddForm(false)} className="flex-1 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold py-3 rounded-xl text-xs transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800">
                    {lang==="fr"?"Annuler":"Cancel"}
                  </button>
                  <button onClick={saveEvent} className="flex-1 bg-cyan-600 text-white font-bold py-3 rounded-xl text-xs transition-all hover:bg-cyan-500 shadow-md">
                    {lang==="fr"?"Enregistrer":"Save"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}