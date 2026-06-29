import { supabase } from "../app/lib/supabase";

export type UserTier = "connected_free" | "basic" | "premium" | "ultra" | "founder";

export const getMessageMaxLength = (tier: UserTier): number => {
  if (tier === "connected_free") return 1000;
  if (tier === "basic") return 10000;
  return 20000;
};

export const isPremiumOrAbove = (tier: UserTier): boolean => {
  return tier === "premium" || tier === "ultra" || tier === "founder";
};

interface QuotaResult {
  allowed: boolean;
  remaining: number;
  current: number;
  max: number;
  error?: string;
}

type ActionType = "chat_ia" | "horizon" | "buttons" | "calendar" | "vitality_actions";

const LIMITS: Record<UserTier, Record<ActionType, number>> = {
  connected_free: { chat_ia: 30,    horizon: 14,    buttons: 10,    calendar: 5,     vitality_actions: 10    },
  basic:          { chat_ia: 160,   horizon: 40,    buttons: 32,    calendar: 12,    vitality_actions: 40    },
  premium:        { chat_ia: 400,   horizon: 100,   buttons: 80,    calendar: 40,    vitality_actions: 100   },
  ultra:          { chat_ia: 1200,  horizon: 300,   buttons: 240,   calendar: 120,   vitality_actions: 300   },
  founder:        { chat_ia: 99999, horizon: 99999, buttons: 99999, calendar: 99999, vitality_actions: 99999 },
};

const ANON_LIMITS: Record<ActionType, number> = {
  chat_ia: 5, horizon: 0, buttons: 0, calendar: 0, vitality_actions: 0,
};

const FREE_REGEN_PER_HOUR: Record<ActionType, number> = {
  chat_ia: 5, horizon: 2, buttons: 1, calendar: 1, vitality_actions: 3,
};

const ONE_HOUR_MS    = 60 * 60 * 1000;
const TWENTY_FOUR_H  = 24 * ONE_HOUR_MS;
const THIRTY_DAYS_MS = 30 * 24 * ONE_HOUR_MS;

const LOCAL_KEY_ANON = "echo-usage-tracker";
const LOCAL_KEY_USER = (uid: string) => `echo-usage-tracker-${uid}`;

function emptyTracker(now: number, tier: string = "connected_free") {
  const limits = LIMITS[tier as UserTier] ?? LIMITS.connected_free;
  return {
    cycleStartTime:   now,
    chat_ia:          { available: limits.chat_ia,          lastRegenTime: now },
    horizon:          { available: limits.horizon,          lastRegenTime: now },
    buttons:          { available: limits.buttons,          lastRegenTime: now },
    calendar:         { available: limits.calendar,         lastRegenTime: now },
    vitality_actions: { available: limits.vitality_actions, lastRegenTime: now },
  };
}

function getTracker(uid?: string | null) {
  if (typeof window === "undefined") return null;
  const key = uid ? LOCAL_KEY_USER(uid) : LOCAL_KEY_ANON;
  try { return JSON.parse(localStorage.getItem(key) || "null"); }
  catch { return null; }
}

function setTracker(tracker: object, uid?: string | null) {
  if (typeof window === "undefined") return;
  const key = uid ? LOCAL_KEY_USER(uid) : LOCAL_KEY_ANON;
  localStorage.setItem(key, JSON.stringify(tracker));
}

// ── FIX QUOTA : applyRegen ne met à jour lastRegenTime que si consume=true ──
// Quand consume=false (lecture seule), on calcule la valeur SANS modifier le tracker
function computeAvailable(entry: any, maxLimit: number, now: number, tier: string): number {
  if (tier !== "connected_free") return Math.floor(entry?.available ?? maxLimit);
  if (!entry) return maxLimit;
  const elapsed = now - (entry.lastRegenTime ?? now);
  if (elapsed <= 0) return Math.floor(Math.min(maxLimit, entry.available ?? maxLimit));
  const regenPerHour = FREE_REGEN_PER_HOUR[entry._type as ActionType] ?? 1;
  const recovered = (elapsed / ONE_HOUR_MS) * regenPerHour;
  return Math.floor(Math.min(maxLimit, (entry.available ?? 0) + recovered));
}

function applyRegenAndSave(tracker: any, actionType: ActionType, maxLimit: number, now: number, tier: string): any {
  if (tier !== "connected_free") return tracker;
  if (!tracker[actionType]) {
    tracker[actionType] = { available: maxLimit, lastRegenTime: now };
    return tracker;
  }
  const entry = tracker[actionType];
  const elapsed = now - (entry.lastRegenTime ?? now);
  if (elapsed > 0) {
    const regenPerHour = FREE_REGEN_PER_HOUR[actionType] ?? 1;
    const recovered = (elapsed / ONE_HOUR_MS) * regenPerHour;
    if (recovered > 0) {
      entry.available = Math.min(maxLimit, (entry.available ?? 0) + recovered);
    }
    // Met à jour lastRegenTime SEULEMENT ici (lors d'une vraie consommation)
    entry.lastRegenTime = now;
    tracker[actionType] = entry;
  }
  return tracker;
}

function getCycleDuration(tier: string): number {
  return tier === "connected_free" ? TWENTY_FOUR_H : THIRTY_DAYS_MS;
}

async function syncToSupabase(userId: string, tracker: any) {
  try {
    const { error } = await supabase.from("user_quotas").upsert({
      user_id:                userId,
      cycle_start_time:       new Date(tracker.cycleStartTime).toISOString(),
      chat_ia_count:          Math.floor(tracker.chat_ia?.available          ?? 0),
      horizon_count:          Math.floor(tracker.horizon?.available          ?? 0),
      buttons_count:          Math.floor(tracker.buttons?.available          ?? 0),
      calendar_count:         Math.floor(tracker.calendar?.available         ?? 0),
      vitality_actions_count: Math.floor(tracker.vitality_actions?.available ?? 0),
    }, { onConflict: "user_id" });
    if (error) console.warn("[Quota] Sync Supabase:", error.message);
  } catch (err) {
    console.warn("[Quota] Sync Supabase non-bloquant:", err);
  }
}

function mergeAnonIntoAccount(userId: string, tier: UserTier, now: number) {
  if (typeof window === "undefined") return;
  const anonTracker = getTracker(null);
  if (!anonTracker?.cycleStartTime) return;
  if (tier !== "connected_free") {
    setTracker(emptyTracker(now, tier), userId);
    localStorage.removeItem(LOCAL_KEY_ANON);
    return;
  }
  const userTracker = getTracker(userId);
  const merged = userTracker?.cycleStartTime ? userTracker : emptyTracker(now, tier);
  const types: ActionType[] = ["chat_ia", "horizon", "buttons", "calendar", "vitality_actions"];
  for (const t of types) {
    const maxLimit  = LIMITS.connected_free[t];
    const anonAvail = anonTracker[t]?.available ?? maxLimit;
    const userAvail = merged[t]?.available      ?? maxLimit;
    merged[t] = {
      available:    Math.min(anonAvail, userAvail),
      lastRegenTime: Math.min(anonTracker[t]?.lastRegenTime ?? now, merged[t]?.lastRegenTime ?? now),
    };
  }
  setTracker(merged, userId);
  localStorage.removeItem(LOCAL_KEY_ANON);
}

export async function loadQuotasFromSupabase(userId: string, tier: UserTier = "connected_free"): Promise<void> {
  try {
    const now = Date.now();
    mergeAnonIntoAccount(userId, tier, now);
    const { data: uq, error } = await supabase.from("user_quotas").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (uq) {
      const cycleStart    = new Date(uq.cycle_start_time).getTime();
      const cycleDuration = getCycleDuration(tier);
      const expired       = now - cycleStart > cycleDuration;
      if (expired) {
        const fresh = emptyTracker(now, tier);
        setTracker(fresh, userId);
        await syncToSupabase(userId, fresh);
        return;
      }
      const local = getTracker(userId);
      const buildEntry = (supabaseAvail: number, actionType: ActionType) => ({
        available: Math.floor(Math.min(
          supabaseAvail ?? LIMITS[tier][actionType],
          local?.[actionType]?.available ?? supabaseAvail ?? LIMITS[tier][actionType]
        )),
        lastRegenTime: local?.[actionType]?.lastRegenTime ?? now,
      });
      setTracker({
        cycleStartTime:   cycleStart,
        chat_ia:          buildEntry(uq.chat_ia_count,          "chat_ia"),
        horizon:          buildEntry(uq.horizon_count,          "horizon"),
        buttons:          buildEntry(uq.buttons_count,          "buttons"),
        calendar:         buildEntry(uq.calendar_count,         "calendar"),
        vitality_actions: buildEntry(uq.vitality_actions_count, "vitality_actions"),
      }, userId);
      console.log("[Quota] Chargé depuis Supabase");
    }
  } catch (err) {
    console.warn("[Quota] Chargement Supabase echoue, fallback localStorage:", err);
  }
}

export const checkQuota = (
  actionType: ActionType,
  tier: UserTier,
  consume = true,
  userId?: string | null
): QuotaResult => {
  if (typeof window === "undefined") {
    return { allowed: true, remaining: 1, current: 0, max: 1 };
  }

  const now = Date.now();

  // ── ANONYME ───────────────────────────────────────────────────────────────
  if (!userId) {
    const anonMax = ANON_LIMITS[actionType];
    if (anonMax === 0) return { allowed: false, remaining: 0, current: 0, max: 0, error: "anon_blocked" };
    const tracker   = getTracker(null) || {};
    const entry     = tracker[actionType] || { available: anonMax, lastRegenTime: now };
    const available = Math.floor(Math.min(anonMax, entry.available ?? anonMax));
    if (available < 1) return { allowed: false, remaining: 0, current: anonMax, max: anonMax, error: "anon_limit" };
    if (consume) {
      tracker[actionType] = { available: available - 1, lastRegenTime: entry.lastRegenTime };
      if (!tracker.cycleStartTime) tracker.cycleStartTime = now;
      setTracker(tracker, null);
    }
    const final = consume ? available - 1 : available;
    return { allowed: true, remaining: final, current: anonMax - final, max: anonMax };
  }

  const cycleDuration = getCycleDuration(tier);
  const maxAllowed    = LIMITS[tier]?.[actionType] ?? LIMITS.connected_free[actionType];
  let tracker = getTracker(userId);

  if (!tracker?.cycleStartTime || now - tracker.cycleStartTime > cycleDuration) {
    tracker = emptyTracker(now, tier);
  }

  // ── FIX CLÉ : lecture seule = pas de modification du tracker ─────────────
  let available: number;
  if (consume) {
    // On applique la regen ET on met à jour lastRegenTime
    tracker = applyRegenAndSave(tracker, actionType, maxAllowed, now, tier);
    if (!tracker[actionType]) tracker[actionType] = { available: maxAllowed, lastRegenTime: now };
    available = Math.floor(Math.min(maxAllowed, tracker[actionType].available ?? maxAllowed));
  } else {
    // Lecture seule : calcule sans modifier le tracker
    if (!tracker[actionType]) tracker[actionType] = { available: maxAllowed, lastRegenTime: now };
    available = computeAvailable({ ...tracker[actionType], _type: actionType }, maxAllowed, now, tier);
  }

  console.log(`[Quota] ${actionType} | tier=${tier} | available=${available}/${maxAllowed} | consume=${consume}`);

  if (available < 1) {
    const labels: Record<ActionType, string> = {
      chat_ia: "Chat IA", horizon: "HorizonWeb", buttons: "Invites comportementales",
      calendar: "Calendrier", vitality_actions: "Vitalité",
    };
    return { allowed: false, remaining: 0, current: maxAllowed, max: maxAllowed, error: `Limite ${labels[actionType]} atteinte.` };
  }

  if (consume) {
    tracker[actionType].available = available - 1;
    setTracker(tracker, userId);
    syncToSupabase(userId, tracker);
  }

  const final = consume ? available - 1 : available;
  return { allowed: true, remaining: final, current: maxAllowed - final, max: maxAllowed };
};

export const getQuotaInfo = (
  actionType: ActionType,
  tier: UserTier,
  userId?: string | null
): { current: number; max: number; remaining: number } => {
  const result = checkQuota(actionType, tier, false, userId);
  return { current: result.current, max: result.max, remaining: result.remaining };
};