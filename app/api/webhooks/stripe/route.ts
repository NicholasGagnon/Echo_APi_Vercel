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
    // ⚡ CLÉ DE TEST INTERNE SÉCURISÉE VIA TON COMPTE STRIPE
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
    const subscriptionId = session.subscription as string;

    if (!userId || !planName) {
      console.error("userId ou planName introuvable dans les metadonnees");
      return NextResponse.json({ error: "Metadonnees manquantes dans Stripe" }, { status: 400 });
    }

    const formattedPlan = planName.trim().toLowerCase();
    console.log(`Activation en cours... Utilisateur: ${userId} | Plan: ${formattedPlan}`);

    // ── 🏴‍☠️ INTERCEPTION DU COFFRE CACHÉ : CONFIGURATION DE L'AUTO-DESTRUCTION ──
    if (formattedPlan === "treasure" && subscriptionId) {
      try {
        // On force directement l'objet Subscription actif à s'annuler à la fin du premier mois payé
        await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
        console.log(`[AUTO-DESTRUCTION ACTIVÉE] Le coffre ${subscriptionId} s'annulera seul à la fin de la période.`);
      } catch (cancelError: any) {
        console.error(`Erreur lors de la planification de la fermeture du coffre: ${cancelError.message}`);
        // On ne retourne pas d'erreur HTTP ici pour laisser l'utilisateur avoir son accès Supabase quoi qu'il arrive
      }
    }

    // Si c'est l'achat du coffre, on lui attribue le forfait premium (ou ultra selon ton choix) dans ton sillage
    const tierToAssign = formattedPlan === "treasure" ? "ultra" : formattedPlan;

    try {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ user_tier: tierToAssign })
        .eq("id", userId);

      if (error) throw error;

      console.log(`Profil ${userId} mis a jour au forfait : ${tierToAssign}`);
    } catch (dbError: any) {
      console.error(`Echec mise a jour Supabase: ${dbError.message}`);
      return NextResponse.json({ error: "Echec ecriture base de donnees" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}