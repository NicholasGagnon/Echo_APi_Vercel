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

/**
 * Consomme 1 crédit de quota dans Supabase avec paramètres de régénération personnalisés.
 */
export async function consumeToolQuota(
  userId: string,
  tier: UserTier = "free",
  tableName: string,
  supabaseClient: SupabaseClient,
  maxCredits: number = 3,
  regenMs: number = 3 * 60 * 60 * 1000, // 3 heures par défaut
  regenAmount: number = 1 // +1 par cycle
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