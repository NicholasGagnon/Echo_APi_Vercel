import { supabase } from "../app/lib/supabase";

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
 * 🛠️ signature ultra-souple :
 * Accepte l'ancien format : checkQuota(feature, tier, isAnon, userId)
 * ET le nouveau format  : checkQuota(userId)
 */
export async function checkQuota(
  arg1?: any,
  _arg2?: any,
  _arg3?: any,
  _arg4?: any
): Promise<QuotaResult> {
  // Récupère le userId peu importe la position dans les arguments
  const userId = typeof arg1 === "string" && arg1.length > 20 ? arg1 : _arg4;

  if (!userId) {
    return { allowed: false, isUnlimited: false, tier: "free", remaining: 0, current: 0, max: 0 };
  }

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_tier")
      .eq("id", userId)
      .maybeSingle();

    const isPremium = profile?.user_tier === "premium";

    return {
      allowed: isPremium,
      isUnlimited: isPremium,
      tier: isPremium ? "premium" : "free",
      remaining: isPremium ? 9999 : 0,
      current: 0,
      max: isPremium ? 9999 : 0,
    };
  } catch {
    return { allowed: false, isUnlimited: false, tier: "free", remaining: 0, current: 0, max: 0 };
  }
}

export async function consumeQuota(..._args: any[]): Promise<{ allowed: boolean }> {
  return { allowed: true };
}