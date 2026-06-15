import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16" as any,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ⚡ CRITIQUE : Empêche Next.js de parser le body avant nous
// Sans ça, Stripe reçoit un body altéré et la signature ne matche jamais
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  // Lire le raw body comme ArrayBuffer puis convertir en string
  // req.text() peut être transformé par Vercel — on bypass ça
  const buf = await req.arrayBuffer();
  const payload = Buffer.from(buf).toString("utf8");

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("[WEBHOOK] stripe-signature manquant");
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    console.error("[WEBHOOK] STRIPE_WEBHOOK_SECRET non défini dans les variables d'environnement");
    return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    console.error(`[WEBHOOK] Échec validation signature: ${err.message}`);
    return NextResponse.json({ error: `Erreur de signature: ${err.message}` }, { status: 400 });
  }

  console.log(`[WEBHOOK] Événement reçu : ${event.type}`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.userId;
    const planName = session.metadata?.planName;

    if (!userId || !planName) {
      console.error("[WEBHOOK] userId ou planName manquant dans les métadonnées");
      return NextResponse.json({ error: "Métadonnées manquantes" }, { status: 400 });
    }

    const formattedPlan = planName.trim().toLowerCase();
    console.log(`[WEBHOOK] Activation : user=${userId} | plan=${formattedPlan}`);

    try {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ user_tier: formattedPlan })
        .eq("id", userId);

      if (error) throw error;

      console.log(`[WEBHOOK] Profil ${userId} mis à jour → ${formattedPlan}`);
    } catch (dbError: any) {
      console.error(`[WEBHOOK] Échec Supabase: ${dbError.message}`);
      return NextResponse.json({ error: "Échec base de données" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}