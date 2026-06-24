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

// ── BARÈME ────────────────────────────────────────────────────────────────────
// chat_ia / horizon / buttons / calendar / vitality_actions
// Accès libre = base | basic(Avantage) x4 | premium x10 | ultra x30 | founder illimité
const LIMITS: Record<UserTier, Record<"chat_ia" | "horizon" | "buttons" | "calendar" | "vitality_actions", number>> = {
  connected_free: { chat_ia: 40,    horizon: 10,    buttons: 8,     calendar: 4,     vitality_actions: 10    },
  basic:          { chat_ia: 160,   horizon: 40,    buttons: 32,    calendar: 12,    vitality_actions: 40    },
  premium:        { chat_ia: 400,   horizon: 100,   buttons: 80,    calendar: 40,    vitality_actions: 100   },
  ultra:          { chat_ia: 1200,  horizon: 300,   buttons: 240,   calendar: 120,   vitality_actions: 300   },
  founder:        { chat_ia: 99999, horizon: 99999, buttons: 99999, calendar: 99999, vitality_actions: 99999 },
};

// Délai de régénération : 1 crédit par heure
const REGEN_INTERVAL_MS = 60 * 60 * 1000;
const THIRTY_DAYS_MS    = 30 * 24 * 60 * 60 * 1000;

const LOCAL_KEY_ANON    = "echo-usage-tracker";
const LOCAL_KEY_USER    = (uid: string) => `echo-usage-tracker-${uid}`;

const triggerQuotaNotification = (type: "error" | "warning" | "info", message: string) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("echo-quota-notification", { detail: { type, message } }));
  }
};

function getTracker(uid?: string | null) {
  if (typeof window === "undefined") return {};
  const key = uid ? LOCAL_KEY_USER(uid) : LOCAL_KEY_ANON;
  try { return JSON.parse(localStorage.getItem(key) || "{}"); }
  catch { return {}; }
}

function setTracker(tracker: object, uid?: string | null) {
  if (typeof window === "undefined") return;
  const key = uid ? LOCAL_KEY_USER(uid) : LOCAL_KEY_ANON;
  localStorage.setItem(key, JSON.stringify(tracker));
}

function emptyTracker(now: number) {
  return {
    cycleStartTime:   now,
    chat_ia:          { count: 0, lastRegenTime: now },
    horizon:          { count: 0, lastRegenTime: now },
    buttons:          { count: 0, lastRegenTime: now },
    calendar:         { count: 0, lastRegenTime: now },
    vitality_actions: { count: 0, lastRegenTime: now },
  };
}

// ── RÉGÉNÉRATION PROGRESSIVE (+1 crédit / heure) ──────────────────────────────
function applyRegen(
  tracker: any,
  actionType: "chat_ia" | "horizon" | "buttons" | "calendar" | "vitality_actions",
  max: number,
  now: number
): any {
  if (!tracker[actionType]) tracker[actionType] = { count: 0, lastRegenTime: now };

  const entry        = tracker[actionType];
  const lastRegen    = entry.lastRegenTime ?? now;
  const elapsed      = now - lastRegen;
  const creditsToAdd = Math.floor(elapsed / REGEN_INTERVAL_MS);

  if (creditsToAdd > 0 && entry.count > 0) {
    entry.count        = Math.max(0, entry.count - creditsToAdd);
    entry.lastRegenTime = lastRegen + creditsToAdd * REGEN_INTERVAL_MS;
    tracker[actionType] = entry;
  }

  return tracker;
}

// ── SYNC SUPABASE (non-bloquant) ──────────────────────────────────────────────
async function syncToSupabase(userId: string, tracker: any) {
  try {
    const { supabase } = await import("../app/lib/supabase");
    const { error } = await supabase.from("user_quotas").upsert({
      user_id:                userId,
      cycle_start_time:       new Date(tracker.cycleStartTime).toISOString(),
      chat_ia_count:          tracker.chat_ia?.count          ?? 0,
      horizon_count:          tracker.horizon?.count          ?? 0,
      buttons_count:          tracker.buttons?.count          ?? 0,
      calendar_count:         tracker.calendar?.count         ?? 0,
      vitality_actions_count: tracker.vitality_actions?.count ?? 0,
    }, { onConflict: "user_id" });
    if (error) throw error;
  } catch (err) {
    console.warn("[Quota] Sync Supabase non-bloquant:", err);
  }
}

// ── FUSION ANONYME → COMPTE FREE ─────────────────────────────────────────────
// Si l'user se connecte en mode free : additionne les counts anonymes + compte
// Si l'user a un abonnement : repart à 0 (comptes payants commencent frais)
function mergeAnonIntoAccount(userId: string, tier: UserTier, now: number) {
  if (typeof window === "undefined") return;

  const anonTracker = getTracker(null);
  if (!anonTracker.cycleStartTime) return; // Pas de tracker anonyme, rien à fusionner

  const userTracker = getTracker(userId);

  if (tier !== "connected_free") {
    // Abonnement : repart à 0, efface le tracker anonyme
    const fresh = emptyTracker(now);
    setTracker(fresh, userId);
    localStorage.removeItem(LOCAL_KEY_ANON);
    return;
  }

  // Free : additionner les counts anonymes + compte
  const types: Array<"chat_ia" | "horizon" | "buttons" | "calendar" | "vitality_actions"> =
    ["chat_ia", "horizon", "buttons", "calendar", "vitality_actions"];

  const merged = userTracker.cycleStartTime ? userTracker : emptyTracker(now);

  for (const t of types) {
    const anonCount = anonTracker[t]?.count ?? 0;
    const userCount = merged[t]?.count ?? 0;
    merged[t] = {
      count:         anonCount + userCount,
      lastRegenTime: now,
    };
  }

  setTracker(merged, userId);
  localStorage.removeItem(LOCAL_KEY_ANON);
}

// ── CHARGEMENT AU LOGIN ───────────────────────────────────────────────────────
export async function loadQuotasFromSupabase(userId: string, tier: UserTier = "connected_free"): Promise<void> {
  try {
    const { supabase } = await import("../app/lib/supabase");
    const now = Date.now();

    // Fusion anonyme → compte avant tout
    mergeAnonIntoAccount(userId, tier, now);

    const { data: uq, error } = await supabase
      .from("user_quotas")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    if (uq) {
      const cycleStart = new Date(uq.cycle_start_time).getTime();
      const expired    = now - cycleStart > THIRTY_DAYS_MS;

      if (tier !== "connected_free") {
        // Abonnement : toujours repartir à 0 si les données Supabase datent d'un autre cycle
        if (expired) {
          const fresh = emptyTracker(now);
          setTracker(fresh, userId);
          await syncToSupabase(userId, fresh);
        } else {
          const tracker = {
            cycleStartTime:   cycleStart,
            chat_ia:          { count: uq.chat_ia_count          ?? 0, lastRegenTime: now },
            horizon:          { count: uq.horizon_count          ?? 0, lastRegenTime: now },
            buttons:          { count: uq.buttons_count          ?? 0, lastRegenTime: now },
            calendar:         { count: uq.calendar_count         ?? 0, lastRegenTime: now },
            vitality_actions: { count: uq.vitality_actions_count ?? 0, lastRegenTime: now },
          };
          setTracker(tracker, userId);
        }
      } else {
        // Free : prend le max entre Supabase et localStorage (pour pas perdre la fusion)
        const local    = getTracker(userId);
        const tracker  = expired ? emptyTracker(now) : {
          cycleStartTime:   cycleStart,
          chat_ia:          { count: Math.max(uq.chat_ia_count ?? 0,          local.chat_ia?.count ?? 0),          lastRegenTime: now },
          horizon:          { count: Math.max(uq.horizon_count ?? 0,           local.horizon?.count ?? 0),          lastRegenTime: now },
          buttons:          { count: Math.max(uq.buttons_count ?? 0,           local.buttons?.count ?? 0),          lastRegenTime: now },
          calendar:         { count: Math.max(uq.calendar_count ?? 0,          local.calendar?.count ?? 0),         lastRegenTime: now },
          vitality_actions: { count: Math.max(uq.vitality_actions_count ?? 0,  local.vitality_actions?.count ?? 0), lastRegenTime: now },
        };
        setTracker(tracker, userId);
      }

      console.log("[Quota] Chargé depuis Supabase");
    }

  } catch (err) {
    console.warn("[Quota] Chargement Supabase echoue, fallback localStorage:", err);
  }
}

// ── CHECK QUOTA ───────────────────────────────────────────────────────────────
export const checkQuota = (
  actionType: "chat_ia" | "horizon" | "buttons" | "calendar" | "vitality_actions",
  tier: UserTier,
  consume = true,
  userId?: string | null
): QuotaResult => {
  if (typeof window === "undefined") {
    return { allowed: true, remaining: 1, current: 0, max: 1 };
  }

  const now        = Date.now();
  let tracker      = getTracker(userId) || {};

  // Init ou reset cycle 30 jours
  if (!tracker.cycleStartTime) {
    tracker = emptyTracker(now);
  } else if (now - tracker.cycleStartTime > THIRTY_DAYS_MS) {
    console.log("[QUOTA RESET] Cycle 30 jours expire.");
    tracker = emptyTracker(now);
  }

  const maxAllowed = LIMITS[tier]?.[actionType] ?? LIMITS.connected_free[actionType];

  // Appliquer la régénération
  tracker = applyRegen(tracker, actionType, maxAllowed, now);

  if (!tracker[actionType]) tracker[actionType] = { count: 0, lastRegenTime: now };

  const currentCount = tracker[actionType].count ?? 0;

  if (currentCount >= maxAllowed) {
    const labels: Record<string, string> = {
      chat_ia:          "Chat IA",
      horizon:          "HorizonWeb",
      buttons:          "Invites comportementales",
      calendar:         "Calendrier",
      vitality_actions: "Vitalité",
    };
    const label    = labels[actionType] ?? actionType;
    const errorMsg = `Limite ${label} atteinte pour ce cycle.`;
    // Ne pas déclencher le toast global — chaque page gère son propre popup
    return { allowed: false, remaining: 0, current: currentCount, max: maxAllowed, error: errorMsg };
  }

  if (consume) {
    tracker[actionType].count = currentCount + 1;
    setTracker(tracker, userId);
    if (userId) syncToSupabase(userId, tracker);
  }

  const finalCount = consume ? currentCount + 1 : currentCount;
  return { allowed: true, remaining: maxAllowed - finalCount, current: finalCount, max: maxAllowed };
};

// ── LECTURE SEULE (pour affichage) ───────────────────────────────────────────
export const getQuotaInfo = (
  actionType: "chat_ia" | "horizon" | "buttons" | "calendar" | "vitality_actions",
  tier: UserTier,
  userId?: string | null
): { current: number; max: number; remaining: number } => {
  const result = checkQuota(actionType, tier, false, userId);
  return { current: result.current, max: result.max, remaining: result.remaining };
};