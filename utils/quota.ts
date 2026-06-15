export type UserTier = "free" | "basic" | "premium" | "ultra" | "founder";

/**
 * Retourne la limite stricte de caractères par message selon le forfait.
 * Multiplicateur x2 appliqué uniquement sur les forfaits payants.
 * Free = 1000, Basic = 10000 (5k x2), Premium/Ultra/Founder = 20000 (10k x2)
 */
export const getMessageMaxLength = (tier: UserTier): number => {
  if (tier === "free") {
    return 1000;
  }
  if (tier === "basic") {
    return 10000;
  }
  return 20000;
};

interface QuotaResult {
  allowed: boolean;
  remaining: number;
  current: number;
  max: number;
}

/**
 * Vérifie et gère les quotas d'utilisation d'un utilisateur.
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
  const tracker = JSON.parse(trackerRaw || '{}');
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  if (!tracker[actionType] || !tracker[actionType].startTime || (now - tracker[actionType].startTime > THIRTY_DAYS)) {
    tracker[actionType] = { count: 0, startTime: now };
  }

  const limits: Record<UserTier, Record<'vitality' | 'calendar' | 'prompts', number>> = {
    free: { vitality: 10, calendar: 5, prompts: 15 },
    basic: { vitality: 40, calendar: 20, prompts: 60 },
    premium: { vitality: 100, calendar: 50, prompts: 250 },
    ultra: { vitality: 300, calendar: 150, prompts: 450 },
    founder: { vitality: 9999, calendar: 9999, prompts: 99999 }
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

/**
 * --- GUIDE D'INTÉGRATION FRONTEND ---
 * * 1. Pour afficher les compteurs (sans consommer) :
 * const state = checkQuota('prompts', userTier, false);
 * console.log(`Il te reste ${state.remaining} messages.`);
 * * 2. Pour valider et déduire le quota lors d'un envoi :
 * const status = checkQuota('prompts', userTier, true);
 * if (!status.allowed) {
 * // Alerte : "Limite atteinte"
 * } else {
 * // Envoi de la requête
 * }
 */