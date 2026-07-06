import { supabase } from "../app/lib/supabase";

export type UserTier = "connected_free" | "basic" | "premium" | "ultra" | "founder";
export type WorldTier = "free" | "premium";

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

  let available: number;
  if (consume) {
    tracker = applyRegenAndSave(tracker, actionType, maxAllowed, now, tier);
    if (!tracker[actionType]) tracker[actionType] = { available: maxAllowed, lastRegenTime: now };
    available = Math.floor(Math.min(maxAllowed, tracker[actionType].available ?? maxAllowed));
  } else {
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

// ══════════════════════════════════════════════════════════════════════════════
// ── WORLD QUOTA — séparé d'Echo, n'interfère pas ─────────────────────────────
// Logique: 3 questions de base + 1 par heure, max 3 en stock
// Premium: 400 questions/mois
// ══════════════════════════════════════════════════════════════════════════════

const WORLD_FREE_MAX     = 3;
const WORLD_PREMIUM_MAX  = 400;
const WORLD_LOCAL_KEY    = (uid: string) => `world-quota-${uid}`;

interface WorldQuotaLocal {
  available:     number;
  lastRegenTime: number;
  cycleStart:    number;
  tier:          WorldTier;
}

function getWorldLocal(uid: string): WorldQuotaLocal | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(WORLD_LOCAL_KEY(uid)) || "null"); }
  catch { return null; }
}

function setWorldLocal(uid: string, data: WorldQuotaLocal) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WORLD_LOCAL_KEY(uid), JSON.stringify(data));
}

export interface WorldQuotaState {
  available:    number;
  max:          number;
  tier:         WorldTier;
  nextRegenIn?: number; // ms avant prochaine regen (free seulement)
}

// Charger depuis Supabase au login
export async function loadWorldQuota(uid: string): Promise<WorldQuotaState> {
  const now = Date.now();
  try {
    const { data } = await supabase
      .from("world_quotas")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();

    if (data) {
      const tier       = (data.tier || "free") as WorldTier;
      const max        = tier === "premium" ? WORLD_PREMIUM_MAX : WORLD_FREE_MAX;
      const lastRegen  = new Date(data.last_regen).getTime();
      let available    = data.available ?? max;

      // Regen pour free
      if (tier === "free") {
        const elapsed   = now - lastRegen;
        const recovered = Math.floor(elapsed / ONE_HOUR_MS);
        available = Math.min(WORLD_FREE_MAX, available + recovered);
      }

      // Reset cycle mensuel pour premium
      if (tier === "premium") {
        const cycleStart = new Date(data.cycle_start).getTime();
        if (now - cycleStart > THIRTY_DAYS_MS) {
          available = WORLD_PREMIUM_MAX;
          await supabase.from("world_quotas").upsert({
            user_id: uid, available: WORLD_PREMIUM_MAX, tier: "premium",
            last_regen: new Date().toISOString(),
            cycle_start: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
        }
      }

      const local: WorldQuotaLocal = { available, lastRegenTime: lastRegen, cycleStart: new Date(data.cycle_start).getTime(), tier };
      setWorldLocal(uid, local);
      return { available, max, tier };
    }
  } catch {}

  // Pas de données — fresh free
  const fresh: WorldQuotaLocal = { available: WORLD_FREE_MAX, lastRegenTime: now, cycleStart: now, tier: "free" };
  setWorldLocal(uid, fresh);
  return { available: WORLD_FREE_MAX, max: WORLD_FREE_MAX, tier: "free" };
}

// Vérifier + consommer 1 question World
export async function consumeWorldQuestion(uid: string): Promise<{ allowed: boolean; nextRegenIn?: number }> {
  const now    = Date.now();
  const local  = getWorldLocal(uid);
  const tier   = local?.tier ?? "free";
  const max    = tier === "premium" ? WORLD_PREMIUM_MAX : WORLD_FREE_MAX;

  // Calculer disponible avec regen
  let available    = local?.available ?? max;
  let lastRegen    = local?.lastRegenTime ?? now;

  if (tier === "free" && local) {
    const elapsed   = now - local.lastRegenTime;
    const recovered = Math.floor(elapsed / ONE_HOUR_MS);
    if (recovered > 0) {
      available = Math.min(WORLD_FREE_MAX, available + recovered);
      lastRegen = now;
    }
  }

  if (available < 1) {
    const elapsed     = now - lastRegen;
    const nextRegenIn = ONE_HOUR_MS - (elapsed % ONE_HOUR_MS);
    return { allowed: false, nextRegenIn };
  }

  const newAvailable = available - 1;
  const updated: WorldQuotaLocal = {
    available:     newAvailable,
    lastRegenTime: lastRegen,
    cycleStart:    local?.cycleStart ?? now,
    tier,
  };
  setWorldLocal(uid, updated);

  // Sync Supabase non-bloquant
  supabase.from("world_quotas").upsert({
    user_id:     uid,
    available:   newAvailable,
    tier,
    last_regen:  new Date(lastRegen).toISOString(),
    cycle_start: new Date(updated.cycleStart).toISOString(),
    updated_at:  new Date().toISOString(),
  }, { onConflict: "user_id" }).then(({ error }) => {
    if (error) console.warn("[WorldQuota] Sync error:", error.message);
  });

  return { allowed: true };
}

// Activer Premium (appelé après succès Stripe depuis page)
export async function activateWorldPremium(uid: string): Promise<void> {
  const now = Date.now();
  const updated: WorldQuotaLocal = { available: WORLD_PREMIUM_MAX, lastRegenTime: now, cycleStart: now, tier: "premium" };
  setWorldLocal(uid, updated);
  await supabase.from("world_quotas").upsert({
    user_id: uid, available: WORLD_PREMIUM_MAX, tier: "premium",
    last_regen: new Date().toISOString(),
    cycle_start: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}

// Formater le temps restant
export function formatWorldRegen(ms: number, lang: string): string {
  const minutes = Math.ceil(ms / 60000);
  const hours   = Math.floor(minutes / 60);
  const mins    = minutes % 60;
  if (lang === "fr") return hours > 0 ? `${hours}h ${mins}min` : `${mins} min`;
  if (lang === "zh") return hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`;
  return hours > 0 ? `${hours}h ${mins}min` : `${mins} min`;
}