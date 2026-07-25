export type UserTier = "free" | "premium" | "connected_free" | "basic" | "ultra" | "founder" | "advantage";

export interface QuotaResult {
  allowed: boolean;
  isUnlimited: boolean;
  tier: UserTier;
  remaining?: number;
  current?: number;
  max?: number;
  error?: string;
}

export const getMessageMaxLength = (tier?: string): number => {
  if (tier === "premium") return 20000;
  return 2000;
};

export const isPremiumOrAbove = (tier?: string): boolean => {
  return tier === "premium";
};

/**
 * 🛠️ Version synchrone ultra-compatible :
 * Ne renvoie pas une Promise pour éviter de casser les 'const check = checkQuota()'
 */
export function checkQuota(
  arg1?: any,
  _arg2?: any,
  _arg3?: any,
  _arg4?: any
): QuotaResult {
  // Récupère le tier ou le statut s'il est passé en 2e argument
  const tier = typeof _arg2 === "string" ? _arg2 : "free";
  const isPremium = tier === "premium" || tier === "advantage";

  return {
    allowed: true, // Autorise l'action par défaut
    isUnlimited: isPremium,
    tier: isPremium ? "premium" : "free",
    remaining: 9999,
    current: 0,
    max: 9999,
  };
}

export function consumeQuota(..._args: any[]): { allowed: boolean } {
  return { allowed: true };
}