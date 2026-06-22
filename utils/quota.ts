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
// /chat /home /vitality /history = JAMAIS bloqués (illimité)
// Chaque quota est totalement indépendant
const LIMITS: Record<UserTier, Record<"horizon" | "buttons" | "calendar" | "vitality_actions", number>> = {
  connected_free: { horizon: 10,    buttons: 8,     calendar: 4,     vitality_actions: 10    },
  basic:          { horizon: 40,    buttons: 32,    calendar: 12,    vitality_actions: 40    },
  premium:        { horizon: 100,   buttons: 80,    calendar: 40,    vitality_actions: 100   },
  ultra:          { horizon: 300,   buttons: 240,   calendar: 120,   vitality_actions: 300   },
  founder:        { horizon: 99999, buttons: 99999, calendar: 99999, vitality_actions: 99999 },
};

const LOCAL_KEY   = (uid?: string | null) => uid ? `echo-usage-tracker-${uid}` : "echo-usage-tracker";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

// ── ÉMETTEUR D'ALERTE POUR L'UI ──────────────────────────────────────────────
const triggerQuotaNotification = (type: "error" | "warning" | "info", message: string) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("echo-quota-notification", { detail: { type, message } }));
  }
};

function getTracker(uid?: string | null) {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY(uid)) || "{}"); }
  catch { return {}; }
}
function setTracker(tracker: object, uid?: string | null) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_KEY(uid), JSON.stringify(tracker));
}

// ── SYNC SUPABASE (non-bloquant) ──────────────────────────────────────────────
async function syncToSupabase(userId: string, tracker: any) {
  try {
    const { supabase } = await import("../app/lib/supabase");

    const { error } = await supabase.from("user_quotas").upsert({
      user_id:                userId,
      cycle_start_time:       new Date(tracker.cycleStartTime).toISOString(),
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

// ── CHARGEMENT AU LOGIN ───────────────────────────────────────────────────────
export async function loadQuotasFromSupabase(userId: string): Promise<void> {
  try {
    const { supabase } = await import("../app/lib/supabase");
    const now = Date.now();

    const { data: uq, error } = await supabase
      .from("user_quotas")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    if (uq) {
      const cycleStart = new Date(uq.cycle_start_time).getTime();
      const expired    = now - cycleStart > THIRTY_DAYS;

      const tracker = expired
        ? {
            cycleStartTime:  now,
            horizon:         { count: 0 },
            buttons:         { count: 0 },
            calendar:        { count: 0 },
            vitality_actions: { count: 0 },
          }
        : {
            cycleStartTime:  cycleStart,
            horizon:         { count: uq.horizon_count          ?? 0 },
            buttons:         { count: uq.buttons_count          ?? 0 },
            calendar:        { count: uq.calendar_count         ?? 0 },
            vitality_actions: { count: uq.vitality_actions_count ?? 0 },
          };

      setTracker(tracker, userId);
      console.log("[Quota] Charge depuis user_quotas");
    }

  } catch (err) {
    console.warn("[Quota] Chargement Supabase echoue, fallback localStorage:", err);
    triggerQuotaNotification("warning", "Echec de connexion au serveur Echo. Reprise avec vos quotas locaux.");
  }
}

// ── CHECK QUOTA ───────────────────────────────────────────────────────────────
// actionType "prompts" n'existe plus — /chat /home /vitality /history sont illimites
export const checkQuota = (
  actionType: "horizon" | "buttons" | "calendar" | "vitality_actions",
  tier: UserTier,
  consume = true,
  userId?: string | null
): QuotaResult => {
  if (typeof window === "undefined") {
    return { allowed: true, remaining: 1, current: 0, max: 1 };
  }

  let tracker = getTracker(userId) || {};
  const now   = Date.now();

  // Init ou reset cycle 30 jours
  if (!tracker.cycleStartTime) {
    tracker.cycleStartTime = now;
  } else if (now - tracker.cycleStartTime > THIRTY_DAYS) {
    console.log("[QUOTA RESET] Cycle 30 jours expire.");
    tracker = {
      cycleStartTime:   now,
      horizon:          { count: 0 },
      buttons:          { count: 0 },
      calendar:         { count: 0 },
      vitality_actions: { count: 0 },
    };
  }

  if (!tracker[actionType]) tracker[actionType] = { count: 0 };

  const maxAllowed   = LIMITS[tier]?.[actionType] ?? LIMITS.connected_free[actionType];
  const currentCount = tracker[actionType].count ?? 0;

  if (currentCount >= maxAllowed) {
    const messages: Record<string, string> = {
      horizon:          "Limite de recherches HorizonWeb atteinte pour ce cycle.",
      buttons:          "Limite de prompts comportementaux atteinte pour ce cycle.",
      calendar:         "Limite d'actions calendrier atteinte pour ce cycle.",
      vitality_actions: "Limite d'actions Vitalite atteinte pour ce cycle.",
    };
    const errorMsg = messages[actionType] ?? "Limite atteinte pour ce cycle.";
    triggerQuotaNotification("error", errorMsg);
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