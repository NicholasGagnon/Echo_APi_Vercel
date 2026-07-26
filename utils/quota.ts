import { SupabaseClient } from "@supabase/supabase-js";

export type UserTier =
  | "free"
  | "premium"
  | "connected_free"
  | "basic"
  | "ultra"
  | "founder"
  | "advantage";

export interface QuotaResult {
  allowed: boolean;
  isUnlimited: boolean;
  tier: UserTier;
  remaining: number;
  max: number;
  nextRegenMs: number;
  error?: string;
}

export const PAID_TIERS: UserTier[] = [
  "advantage",
  "premium",
  "ultra",
  "founder"
];

export const isPaidTier = (tier?: string): boolean => {
  return PAID_TIERS.includes(tier as UserTier);
};

export const getMessageMaxLength = (tier?: string): number => {
  return isPaidTier(tier) ? 20000 : 2000;
};

/**
 * Version synchrone rétrocompatible
 */
export function checkQuota(
  _action?: string,
  tier?: string,
  _consume?: boolean,
  _userId?: string | null
): { allowed: boolean; remaining: number } {
  return {
    allowed: true,
    remaining: isPaidTier(tier) ? 9999 : 8,
  };
}

/**
 * Consomme 1 crédit de quota dans Supabase avec paramètres de régénération personnalisés.
 */
export async function consumeToolQuota(
  userId: string,
  tier: UserTier = "free",
  tableName: string,
  supabaseClient: SupabaseClient,
  maxCredits: number = 8,
  regenMs: number = 60 * 60 * 1000, // 1 heure
  regenAmount: number = 1 // +1 par heure
): Promise<QuotaResult> {
  const isUnlimited = isPaidTier(tier);

  if (isUnlimited) {
    return {
      allowed: true,
      isUnlimited: true,
      tier,
      remaining: Infinity,
      max: Infinity,
      nextRegenMs: 0,
    };
  }

  const now = Date.now();

  const { data, error } = await supabaseClient
    .from(tableName)
    .select("available_credits, last_regen_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return {
      allowed: false,
      isUnlimited: false,
      tier,
      remaining: 0,
      max: maxCredits,
      nextRegenMs: 0,
      error: "Erreur lors de la lecture du quota Supabase.",
    };
  }

  let currentCredits = data?.available_credits ?? maxCredits;
  let lastRegenAt = data ? new Date(data.last_regen_at).getTime() : now;

  const elapsed = now - lastRegenAt;
  const cycles = Math.floor(elapsed / regenMs);

  if (cycles > 0) {
    currentCredits = Math.min(maxCredits, currentCredits + (cycles * regenAmount));
    lastRegenAt = now;
  }

  if (currentCredits < 1) {
    const nextRegenMs = regenMs - (elapsed % regenMs);
    return {
      allowed: false,
      isUnlimited: false,
      tier,
      remaining: 0,
      max: maxCredits,
      nextRegenMs,
      error: "Quota gratuit épuisé.",
    };
  }

  const newCredits = currentCredits - 1;

  const { error: updateError } = await supabaseClient.from(tableName).upsert(
    {
      user_id: userId,
      available_credits: newCredits,
      tier,
      last_regen_at: new Date(lastRegenAt).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (updateError) {
    return {
      allowed: false,
      isUnlimited: false,
      tier,
      remaining: currentCredits,
      max: maxCredits,
      nextRegenMs: 0,
      error: "Erreur lors de la mise à jour des crédits.",
    };
  }

  const nextRegenMs = newCredits < maxCredits ? regenMs - ((now - lastRegenAt) % regenMs) : 0;

  return {
    allowed: true,
    isUnlimited: false,
    tier,
    remaining: newCredits,
    max: maxCredits,
    nextRegenMs,
  };
}