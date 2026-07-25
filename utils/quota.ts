import { supabase } from "../app/lib/supabase"; // 👈 Ton chemin d'import Supabase exact

export type UserTier = "free" | "premium";

export interface QuotaResult {
  allowed: boolean;
  isUnlimited: boolean;
  tier: UserTier;
}

/**
  * Vérifie si l'utilisateur possède l'abonnement actif (3,99$)
 */
export async function checkQuota(userId?: string | null): Promise<QuotaResult> {
  // Visiteur non connecté -> Pas d'accès illimité
  if (!userId) {
    return { allowed: false, isUnlimited: false, tier: "free" };
  }

  try {
    // Lecture directe du statut de l'utilisateur dans Supabase
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("user_tier")
      .eq("id", userId)
      .maybeSingle();

    if (error || !profile) {
      console.warn("[Quota] Impossible de récupérer le profil Supabase:", error?.message);
      return { allowed: false, isUnlimited: false, tier: "free" };
    }

    const isPremium = profile.user_tier === "premium";

    return {
      allowed: isPremium,
      isUnlimited: isPremium,
      tier: isPremium ? "premium" : "free",
    };
  } catch (err) {
    console.error("[Quota] Erreur serveur lors de la vérification:", err);
    return { allowed: false, isUnlimited: false, tier: "free" };
  }
}

/**
 * Fonction de consommation (neutralisée pour l'illimité) :
 * Conservée pour ne pas briser tes composants UI existants, elle valide 
 * directement l'accès si l'utilisateur est 'premium'.
 */
export async function consumeQuota(userId?: string | null): Promise<{ allowed: boolean }> {
  const result = await checkQuota(userId);
  return { allowed: result.isUnlimited };
}