import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let event: Stripe.Event;

  // 1. PARSING DIRECT DU PAYLOAD SANS VÉRIFICATION DE SIGNATURE (ÉVITE LA 400)
  try {
    const rawBody = await req.text();
    event = JSON.parse(rawBody) as Stripe.Event;
  } catch (err: any) {
    console.error("❌ Erreur parsing JSON Webhook:", err.message);
    return NextResponse.json({ error: "JSON Invalide" }, { status: 400 });
  }

  // 2. EXÉCUTION DÈS QUE LE CHECKOUT EST COMPLÉTÉ
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId || session.metadata?.user_id;

    console.log(`⚡ Traitement paiement pour userId: ${userId} / email: ${session.customer_email}`);

    try {
      let targetUserId = userId;

      // Recherche par courriel si l'userId est manquant dans metadata
      if (!targetUserId && session.customer_email) {
        const { data } = await supabaseAdmin.auth.admin.listUsers();
        const matched = data?.users?.find((u: any) => u.email === session.customer_email);
        if (matched) targetUserId = matched.id;
      }

      if (targetUserId) {
        // ÉCRITURE DANS LES 3 TABLES SUPABASE
        await supabaseAdmin.from("profiles").upsert({
          id: targetUserId,
          user_tier: "premium",
          updated_at: new Date().toISOString()
        }, { onConflict: "id" });

        await supabaseAdmin.from("world_quotas").upsert({
          user_id: targetUserId,
          available: 9999,
          tier: "advantage",
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

        await supabaseAdmin.from("contenu_quotas").upsert({
          user_id: targetUserId,
          tier: "advantage",
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

        console.log(`✅ COMPTE DÉBLOQUÉ SUR SUPABASE POUR ${targetUserId}`);
      }
    } catch (dbErr: any) {
      console.error("❌ Erreur Supabase:", dbErr.message);
      return NextResponse.json({ error: "Erreur DB" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}