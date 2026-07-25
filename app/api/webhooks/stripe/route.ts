import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

// 🔑 Ton Secret Webhook Stripe (considéré valide)
const ENDPOINT_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_1U3vFgBHw5LMtvb0HSkCF7kdfOtJZLkl";

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, ENDPOINT_SECRET);
  } catch (err: any) {
    console.error(`Échec Webhook Stripe: ${err.message}`);
    return NextResponse.json({ error: `Signature invalide: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    // Récupère l'ID utilisateur sous n'importe quelle forme
    const userId = metadata?.userId || metadata?.user_id;

    if (!userId) {
      console.warn("[WEBHOOK] userId manquant dans la session Stripe - Validation contournée pour éviter 400");
      return NextResponse.json({ received: true, note: "Aucun userId fourni dans metadata" }, { status: 200 });
    }

    console.log(`[WEBHOOK SUCCESS] Activation de l'abonnement pour userId: ${userId}`);

    try {
      // 1. Mise à jour de la table PROFILES (Nouveau système - Statut Premium / Vert)
      await supabaseAdmin
        .from("profiles")
        .update({
          user_tier: "premium",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      // 2. Mise à jour de la table WORLD_QUOTAS (Ancien système - 9999 questions)
      await supabaseAdmin
        .from("world_quotas")
        .upsert({
          user_id: userId,
          available: 9999,
          tier: "advantage",
          last_regen: new Date().toISOString(),
          cycle_start: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      console.log(`[WEBHOOK SUCCESS] Utilisateur ${userId} activé avec succès sur Profiles et World Quotas !`);
    } catch (err: any) {
      console.error(`[WEBHOOK DB ERROR]`, err.message);
      return NextResponse.json({ error: "Erreur DB" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}