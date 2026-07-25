import { supabase } from "../app/lib/supabase";

export type UserTier = "free" | "premium" | "connected_free" | "basic" | "ultra" | "founder";

export interface QuotaResult {
  allowed: boolean;
  isUnlimited: boolean;
  tier: UserTier;
  remaining?: number;
  current?: number;
  max?: number;
  error?: string;
}

/**
 * 🛠️ FONCTION DE SECOURS POUR LE CHAT :
 * Retourne la longueur max des messages selon le statut
 */
export const getMessageMaxLength = (tier?: string): number => {
  if (tier === "premium") return 20000;
  return 2000; // Limite par défaut
};

/**
 * Helper de compatibilité
 */
export const isPremiumOrAbove = (tier?: string): boolean => {
  return tier === "premium";
};

/**
 * Vérifie si l'utilisateur possède l'abonnement actif (3,99$)
 */
export async function checkQuota(userId?: string | null): Promise<QuotaResult> {
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

/**
 * Fonction de consommation (neutralisée pour l'illimité)
 */
export async function consumeQuota(userId?: string | null): Promise<{ allowed: boolean }> {
  const result = await checkQuota(userId);
  return { allowed: result.isUnlimited };
}