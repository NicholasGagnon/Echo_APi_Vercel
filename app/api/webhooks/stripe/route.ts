import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Initialisation de Stripe avec la clé d'API et alignement de version stable
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16" as any,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("En-tête stripe-signature manquant");
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // 🛡️ PROTECTION ABSOLUE : Zéro clé en dur. Lecture dynamique depuis ton .env + nettoyage des espaces parasites
    const cleanWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";

    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      cleanWebhookSecret
    );
  } catch (err: any) {
    console.error(`Échec validation Webhook Stripe: ${err.message}`);
    return NextResponse.json({ error: `Erreur de signature: ${err.message}` }, { status: 400 });
  }

  console.log(`Événement Stripe reçu : ${event.type}`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.userId;
    const planName = session.metadata?.planName;

    if (!userId || !planName) {
      console.error("userId ou planName introuvable dans les métadonnées");
      return NextResponse.json({ error: "Métadonnées manquantes dans Stripe" }, { status: 400 });
    }

    const formattedPlan = planName.trim().toLowerCase();

    console.log(`Activation en cours... Utilisateur: ${userId} | Plan: ${formattedPlan}`);

    try {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ user_tier: formattedPlan })
        .eq("id", userId);

      if (error) {
        throw error;
      }

      console.log(`Profil ${userId} mis à jour au forfait : ${formattedPlan}`);
    } catch (dbError: any) {
      console.error(`Échec mise à jour Supabase : ${dbError.message}`);
      return NextResponse.json({ error: "Échec écriture base de données" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}