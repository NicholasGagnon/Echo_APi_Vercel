export type UserTier = "free" | "basic" | "premium" | "ultra" | "founder";

/**
 * Retourne la limite stricte de caractères par message selon le forfait.
 * Free = 1000, Basic = 10000, Premium/Ultra/Founder = 20000
 */
export const getMessageMaxLength = (tier: UserTier): number => {
  if (tier === "free") return 1000;
  if (tier === "basic") return 10000;
  return 20000;
};

interface QuotaResult {
  allowed: boolean;
  remaining: number;
  current: number;
  max: number;
}

/**
 * Vérifie et gère les quotas d'utilisation de l'écosystème Echo.
 * @param actionType La catégorie de l'action ('vitality' | 'calendar' | 'prompts')
 * @param tier Le forfait actuel de l'utilisateur
 * @param consume Si TRUE, déduit un crédit du quota. Si FALSE, effectue une simple lecture (ReadOnly).
 */
export const checkQuota = (
  actionType: 'vitality' | 'calendar' | 'prompts', 
  tier: UserTier,
  consume = true
): QuotaResult => {
  if (typeof window === 'undefined') {
    return { allowed: true, remaining: 1, current: 0, max: 1 };
  }

  const trackerRaw = localStorage.getItem('echo-usage-tracker');
  let tracker = JSON.parse(trackerRaw || '{}');
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  // ── 📅 SYNCHRONISATION DU CYCLE UNIQUE DE 30 JOURS ──
  if (!tracker.cycleStartTime || (now - tracker.cycleStartTime > THIRTY_DAYS)) {
    tracker = {
      cycleStartTime: now,
      prompts: { count: 0 },
      calendar: { count: 0 },
      vitality: { count: 0 }
    };
  }

  // Sécurité si une sous-structure de catégorie est absente dans le localStorage
  if (!tracker[actionType]) {
    tracker[actionType] = { count: 0 };
  }

  // ── 📊 CONFIGURATION DES LIMITES (BARÈME DE PROGRESSION STRICT) ──
  const limits: Record<UserTier, Record<'vitality' | 'calendar' | 'prompts', number>> = {
    free: { vitality: 10, calendar: 5, prompts: 200 },           // Free fixe à 200 prompts
    basic: { vitality: 40, calendar: 20, prompts: 2000 },        // Basic monte à 2000 prompts
    premium: { vitality: 100, calendar: 50, prompts: 99999 },    // Illimité / Ouverture complète
    ultra: { vitality: 300, calendar: 150, prompts: 99999 },     // Illimité
    founder: { vitality: 9999, calendar: 9999, prompts: 99999 }  // Illimité
  };

  const limitConfig = limits[tier] || limits.free;
  const maxAllowed = limitConfig[actionType];
  const currentCount = tracker[actionType].count ?? 0;

  if (currentCount >= maxAllowed) {
    console.log(`❌ [QUOTA REACHED] ${actionType} bloqué (${currentCount}/${maxAllowed})`);
    return { allowed: false, remaining: 0, current: currentCount, max: maxAllowed };
  }

  if (consume) {
    tracker[actionType].count = currentCount + 1;
    localStorage.setItem('echo-usage-tracker', JSON.stringify(tracker));
    console.log(`✅ [QUOTA CONSUMED] ${actionType} incrémenté : ${tracker[actionType].count}/${maxAllowed}`);
  } else {
    console.log(`🔍 [QUOTA READ-ONLY] ${actionType} vérifié : ${currentCount}/${maxAllowed}`);
  }

  const finalCount = consume ? currentCount + 1 : currentCount;
  return { 
    allowed: true, 
    remaining: maxAllowed - finalCount,
    current: finalCount,
    max: maxAllowed
  };
};