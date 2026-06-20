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
const LIMITS: Record<UserTier, Record<"prompts"|"buttons"|"calendar"|"vitality", number>> = {
  connected_free: { prompts: 50,    buttons: 8,     calendar: 4,     vitality: 10    },
  basic:          { prompts: 2000,  buttons: 32,    calendar: 12,    vitality: 40    },
  premium:        { prompts: 99999, buttons: 80,    calendar: 40,    vitality: 100   },
  ultra:          { prompts: 99999, buttons: 240,   calendar: 120,   vitality: 300   },
  founder:        { prompts: 99999, buttons: 99999, calendar: 99999, vitality: 99999 },
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

// ── SYNC SUPABASE (non-bloquant — double écriture user_quotas + global_api_quotas) ──
async function syncToSupabase(userId: string, tracker: any) {
  try {
    const { supabase } = await import("../app/lib/supabase");

    // 1. user_quotas — table dédiée, structure propre
    const { error } = await supabase.from("user_quotas").upsert({
      user_id:           userId,
      cycle_start_time:  new Date(tracker.cycleStartTime).toISOString(),
      prompts_count:     tracker.prompts?.count        ?? 0,
      prompts_available: tracker.prompts?.availableCount ?? 50,
      prompts_last_used: tracker.prompts?.lastUsedTime
        ? new Date(tracker.prompts.lastUsedTime).toISOString()
        : new Date().toISOString(),
      buttons_count:  tracker.buttons?.count  ?? 0,
      calendar_count: tracker.calendar?.count ?? 0,
      vitality_count: tracker.vitality?.count ?? 0,
    }, { onConflict: "user_id" });
    if (error) throw error;

    // 2. global_api_quotas — fallback legacy pour compatibilité
    const total = (tracker.prompts?.count  ?? 0)
                + (tracker.buttons?.count  ?? 0)
                + (tracker.calendar?.count ?? 0)
                + (tracker.vitality?.count ?? 0);
    await supabase.from("global_api_quotas").upsert({
      id:              userId,
      request_count:   total,
      last_reset_date: new Date().toISOString().split("T")[0],
      updated_at:      new Date().toISOString(),
    }, { onConflict: "id" });

  } catch (err) {
    console.warn("[Quota] Sync Supabase non-bloquant:", err);
    triggerQuotaNotification("warning", "Échec de synchronisation cloud. Quotas sauvegardés localement.");
  }
}

// ── CHARGEMENT AU LOGIN ───────────────────────────────────────────────────────
// Priorité : user_quotas > global_api_quotas > localStorage existant
export async function loadQuotasFromSupabase(userId: string): Promise<void> {
  try {
    const { supabase } = await import("../app/lib/supabase");
    const now = Date.now();

    // 1. Essayer user_quotas en premier
    const { data: uq, error: uqErr } = await supabase
      .from("user_quotas")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (uqErr) throw uqErr;

    if (uq) {
      const cycleStart = new Date(uq.cycle_start_time).getTime();
      const expired    = now - cycleStart > THIRTY_DAYS;

      const tracker = expired
        ? { cycleStartTime: now, prompts: { count: 0, availableCount: 50, lastUsedTime: now }, buttons: { count: 0 }, calendar: { count: 0 }, vitality: { count: 0 } }
        : {
            cycleStartTime: cycleStart,
            prompts:  { count: uq.prompts_count ?? 0, availableCount: uq.prompts_available ?? 50, lastUsedTime: new Date(uq.prompts_last_used).getTime() },
            buttons:  { count: uq.buttons_count  ?? 0 },
            calendar: { count: uq.calendar_count ?? 0 },
            vitality: { count: uq.vitality_count ?? 0 },
          };

      setTracker(tracker, userId);
      console.log("[Quota] ✅ Chargé depuis user_quotas");
      return;
    }

    // 2. Fallback global_api_quotas
    const { data: gaq } = await supabase
      .from("global_api_quotas")
      .select("request_count, last_reset_date")
      .eq("id", userId)
      .maybeSingle();

    if (gaq) {
      const cycleStart = new Date(gaq.last_reset_date).getTime();
      if (now - cycleStart <= THIRTY_DAYS) {
        const tracker = getTracker(userId);
        if (!tracker.cycleStartTime) { tracker.cycleStartTime = cycleStart; setTracker(tracker, userId); }
      }
      console.log("[Quota] ✅ Fallback global_api_quotas");
    }

  } catch (err) {
    console.warn("[Quota] Chargement Supabase échoué, fallback localStorage:", err);
    triggerQuotaNotification("warning", "Échec de connexion au serveur Echo. Reprise avec vos quotas locaux.");
  }
}

// ── RECHARGE TEMPORELLE (connected_free uniquement) ───────────────────────────
const calculateDynamicFreeQuota = (tracker: any, now: number): { currentAvailable: number; maxAllowed: number } => {
  const INITIAL_POOL = 50;
  const MAX_LIMIT    = 500;

  if (!tracker.prompts || tracker.prompts.availableCount === undefined) {
    return { currentAvailable: INITIAL_POOL, maxAllowed: MAX_LIMIT };
  }

  const elapsedHours = (now - (tracker.prompts.lastUsedTime || now)) / (1000 * 60 * 60);
  let regained = 0;

  if      (elapsedHours >= 4) regained = 30 + 30 + Math.floor(elapsedHours - 3) * 30;
  else if (elapsedHours >= 3) regained = 60;
  else if (elapsedHours >= 2) regained = 30;

  return {
    currentAvailable: Math.min(MAX_LIMIT, (tracker.prompts.availableCount ?? INITIAL_POOL) + regained),
    maxAllowed: MAX_LIMIT,
  };
};

// ── CHECK QUOTA ───────────────────────────────────────────────────────────────
export const checkQuota = (
  actionType: "prompts" | "buttons" | "calendar" | "vitality",
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
    console.log("🔄 [QUOTA RESET] Cycle 30 jours expiré.");
    tracker = { cycleStartTime: now, prompts: { count: 0, availableCount: 50, lastUsedTime: now }, buttons: { count: 0 }, calendar: { count: 0 }, vitality: { count: 0 } };
  }

  if (!tracker[actionType]) tracker[actionType] = { count: 0 };

  // ── CAS SPÉCIAL : Recharge dynamique pour connected_free / prompts ──────────
  if (tier === "connected_free" && actionType === "prompts") {
    const { currentAvailable, maxAllowed } = calculateDynamicFreeQuota(tracker, now);

    if (currentAvailable <= 0) {
      const errorMsg = "Énergie Echo épuisée. Attendez qu'un sillage de recharge se forme (+30 d'ici peu). ⚡";
      triggerQuotaNotification("error", errorMsg);
      return { allowed: false, remaining: 0, current: 0, max: maxAllowed, error: errorMsg };
    }

    if (consume) {
      tracker.prompts = { availableCount: currentAvailable - 1, lastUsedTime: now, count: (tracker.prompts?.count ?? 0) + 1 };
      setTracker(tracker, userId);
      if (userId) syncToSupabase(userId, tracker);
    }

    const finalAvailable = consume ? currentAvailable - 1 : currentAvailable;
    return { allowed: true, remaining: finalAvailable, current: maxAllowed - finalAvailable, max: maxAllowed };
  }

  // ── LOGIQUE STANDARD (tous les autres cas) ────────────────────────────────
  const maxAllowed   = LIMITS[tier]?.[actionType] ?? LIMITS.connected_free[actionType];
  const currentCount = tracker[actionType].count ?? 0;

  if (currentCount >= maxAllowed) {
    const errorMsg = `Limite atteinte pour '${actionType}' (${currentCount}/${maxAllowed}).`;
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