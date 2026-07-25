import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

const ENDPOINT_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_1U3vFgBHw5LMtvb0HSkCF7kdfOtJZLk1";

export async function POST(req: Request) {
  // 🎯 LECTURE DIRECTE DU BUFFER POUR ÉVITER QUE NEXT.JS N'ALTÈRE LE PAYLOAD
  const arrayBuffer = await req.arrayBuffer();
  const rawPayload = Buffer.from(arrayBuffer);
  
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("❌ Signature Stripe manquante dans le header");
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // On passe directement le Buffer à Stripe
    event = stripe.webhooks.constructEvent(rawPayload, signature, ENDPOINT_SECRET);
  } catch (err: any) {
    console.error(`❌ Échec signature Webhook: ${err.message}`);
    return NextResponse.json({ error: `Signature invalide: ${err.message}` }, { status: 400 });
  }

  // ── TRAITEMENT DE L'ÉVÉNEMENT ──────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId || session.metadata?.user_id;

    console.log(`⚡ Traitement paiement pour userId: ${userId} / email: ${session.customer_email}`);

    try {
      let targetUserId = userId;

      if (!targetUserId && session.customer_email) {
        const { data } = await supabaseAdmin.auth.admin.listUsers();
        const matched = data?.users?.find((u: any) => u.email === session.customer_email);
        if (matched) targetUserId = matched.id;
      }

      if (targetUserId) {
        // 1. ÉCRITURE PROFILES
        await supabaseAdmin.from("profiles").upsert({
          id: targetUserId,
          user_tier: "premium",
          updated_at: new Date().toISOString()
        }, { onConflict: "id" });

        // 2. ÉCRITURE WORLD_QUOTAS
        await supabaseAdmin.from("world_quotas").upsert({
          user_id: targetUserId,
          available: 9999,
          tier: "advantage",
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

        // 3. ÉCRITURE CONTENU_QUOTAS
        await supabaseAdmin.from("contenu_quotas").upsert({
          user_id: targetUserId,
          tier: "advantage",
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

        console.log(`✅ TOUTES LES TABLES SUPABASE ONT ÉTÉ MISES À JOUR POUR ${targetUserId} !`);
      }
    } catch (dbErr: any) {
      console.error("❌ Erreur écriture Supabase:", dbErr.message);
      return NextResponse.json({ error: "Erreur Supabase" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}