export type UserTier = "connected_free" | "basic" | "premium" | "ultra" | "founder";

/**
 * Retourne la limite stricte de caractères par message selon le forfait.
 */
export const getMessageMaxLength = (tier: UserTier): number => {
  if (tier === "connected_free") return 1000;
  if (tier === "basic") return 10000;
  return 20000;
};

/**
 * Vérifie si le tier permet l'accès à une fonctionnalité premium minimum.
 * Utilisé pour bloquer : History, bouton Surprise / Émergence.
 */
export const isPremiumOrAbove = (tier: UserTier): boolean => {
  return tier === "premium" || tier === "ultra" || tier === "founder";
};

interface QuotaResult {
  allowed: boolean;
  remaining: number;
  current: number;
  max: number;
}

/**
 * Vérifie et gère les quotas d'utilisation de l'écosystème Echo.
 *
 * @param actionType
 *   'prompts'  — messages envoyés à Echo (chat, home, books...)
 *   'buttons'  — utilisations des boutons comportementaux (clarity, expert, ideas, creative...)
 *   'calendar' — actions calendrier automatisées
 *   'vitality' — actions budget / calories automatisées
 *
 * @param tier     Le forfait actuel de l'utilisateur
 * @param consume  Si TRUE, déduit un crédit. Si FALSE, lecture seule (ReadOnly).
 */
export const checkQuota = (
  actionType: "prompts" | "buttons" | "calendar" | "vitality",
  tier: UserTier,
  consume = true
): QuotaResult => {
  if (typeof window === "undefined") {
    return { allowed: true, remaining: 1, current: 0, max: 1 };
  }

  const trackerRaw = localStorage.getItem("echo-usage-tracker");
  let tracker = JSON.parse(trackerRaw || "{}");
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  // ── Réinitialisation du cycle de 30 jours ──
  if (!tracker.cycleStartTime || now - tracker.cycleStartTime > THIRTY_DAYS) {
    tracker = {
      cycleStartTime: now,
      prompts:  { count: 0 },
      buttons:  { count: 0 },
      calendar: { count: 0 },
      vitality: { count: 0 },
    };
  }

  if (!tracker[actionType]) {
    tracker[actionType] = { count: 0 };
  }

  // ── Barème par catégorie et par tier ──
  const limits: Record<UserTier, Record<"prompts" | "buttons" | "calendar" | "vitality", number>> = {
    //                prompts   buttons  calendar  vitality
    connected_free: { prompts: 200,   buttons: 8,    calendar: 4,    vitality: 10   },
    basic:          { prompts: 2000,  buttons: 32,   calendar: 12,   vitality: 40   },
    premium:        { prompts: 99999, buttons: 80,   calendar: 40,   vitality: 100  },
    ultra:          { prompts: 99999, buttons: 240,  calendar: 120,  vitality: 300  },
    founder:        { prompts: 99999, buttons: 99999,calendar: 99999,vitality: 99999},
  };

  const maxAllowed   = limits[tier]?.[actionType] ?? limits.connected_free[actionType];
  const currentCount = tracker[actionType].count ?? 0;

  if (currentCount >= maxAllowed) {
    console.log(`❌ [QUOTA REACHED] ${actionType} bloqué (${currentCount}/${maxAllowed})`);
    return { allowed: false, remaining: 0, current: currentCount, max: maxAllowed };
  }

  if (consume) {
    tracker[actionType].count = currentCount + 1;
    localStorage.setItem("echo-usage-tracker", JSON.stringify(tracker));
    console.log(`✅ [QUOTA CONSUMED] ${actionType} : ${tracker[actionType].count}/${maxAllowed}`);
  } else {
    console.log(`🔍 [QUOTA READ-ONLY] ${actionType} : ${currentCount}/${maxAllowed}`);
  }

  const finalCount = consume ? currentCount + 1 : currentCount;
  return {
    allowed: true,
    remaining: maxAllowed - finalCount,
    current: finalCount,
    max: maxAllowed,
  };
};