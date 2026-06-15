import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Configuration stricte de la version pour s'aligner sur la signature de test
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
    console.error("En-tete stripe-signature manquant");
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // ⚡ CLÉ DE TEST FORCÉE EN DUR POUR COURT-CIRCUITER TOUS LES BOGUES DE LIEN VERCEL
    const testWebhookSecret = "whsec_ty2H1QRlonMfPINShkJymkunQCv9cIOz";

    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      testWebhookSecret
    );
  } catch (err: any) {
    console.error(`Echec validation Webhook Stripe: ${err.message}`);
    return NextResponse.json({ error: `Erreur de signature: ${err.message}` }, { status: 400 });
  }

  console.log(`Evenement Stripe recu : ${event.type}`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.userId;
    const planName = session.metadata?.planName;

    if (!userId || !planName) {
      console.error("userId ou planName introuvable dans les metadonnees");
      return NextResponse.json({ error: "Metadonnees manquantes dans Stripe" }, { status: 400 });
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

      console.log(`Profil ${userId} mis a jour au forfait : ${formattedPlan}`);
    } catch (dbError: any) {
      console.error(`Echec mise a jour Supabase: ${dbError.message}`);
      return NextResponse.json({ error: "Echec ecriture base de donnees" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
