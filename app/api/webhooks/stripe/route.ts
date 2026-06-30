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
    console.error("En-tête stripe-signature manquant");
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Échec validation Webhook Stripe: ${err.message}`);
    return NextResponse.json({ error: `Erreur de signature: ${err.message}` }, { status: 400 });
  }

  console.log(`Événement Stripe reçu : ${event.type}`);

  // ── CAS INTERMÉDIAIRE SEPA : LE PAIEMENT COMMENCE À TRAITER ──────────────────
  if (event.type === "payment_intent.processing") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const userId = paymentIntent.metadata?.userId;

    if (userId) {
      console.log(`[SEPA] Prélèvement en cours pour l'utilisateur ${userId}. Passage en état pending...`);
      try {
        await supabaseAdmin
          .from("profiles")
          .update({ user_tier: "pending" })
          .eq("id", userId);
      } catch (dbError: any) {
        console.error(`Échec mise à jour temporaire SEPA: ${dbError.message}`);
      }
    }
  }

  // ── CAS 1 : STRIPE CHECKOUT COMPLET ───────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    // ── BRANCHE A : Déblocage de fiche (site2 — paiement unique 1,50$) ─────────
    if (metadata.type === "unlock_fiche") {
      const ficheId    = metadata.fiche_id;
      const acheteurId = metadata.acheteur_id;

      if (!ficheId || !acheteurId) {
        console.error("[FICHE] fiche_id ou acheteur_id manquant dans les métadonnées");
        return NextResponse.json({ error: "Métadonnées fiche manquantes" }, { status: 400 });
      }

      try {
        // Récupérer le propriétaire de la fiche
        const { data: ficheRow, error: ficheError } = await supabaseAdmin
          .from("fiches")
          .select("user_id")
          .eq("id", ficheId)
          .maybeSingle();

        if (ficheError) throw ficheError;

        const inscritId = ficheRow?.user_id || null;

        // Créer le tunnel — débloque la fiche pour cet acheteur
        const { error: tunnelError } = await supabaseAdmin
          .from("tunnels")
          .insert({ fiche_id: ficheId, acheteur_id: acheteurId, inscrit_id: inscritId });

        if (tunnelError) throw tunnelError;

        console.log(`[FICHE] Tunnel ouvert — fiche ${ficheId} débloquée pour ${acheteurId}`);
      } catch (dbError: any) {
        console.error(`[FICHE] Échec ouverture tunnel: ${dbError.message}`);
        return NextResponse.json({ error: "Échec déblocage fiche" }, { status: 500 });
      }

      return NextResponse.json({ received: true }, { status: 200 });
    }

    // ── BRANCHE B : Abonnement Echo (existant, inchangé) ──────────────────────
    const userId = metadata.userId;
    const planName = metadata.planName;
    const subscriptionId = session.subscription as string;

    if (!userId || !planName) {
      console.error("userId ou planName introuvable dans les métadonnées");
      return NextResponse.json({ error: "Métadonnées manquantes dans Stripe" }, { status: 400 });
    }

    const formattedPlan = planName.trim().toLowerCase();
    console.log(`Activation en cours... Utilisateur: ${userId} | Plan: ${formattedPlan}`);

    if (formattedPlan === "treasure" && subscriptionId) {
      try {
        await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
        console.log(`[AUTO-DESTRUCTION ACTIVÉE] Le coffre ${subscriptionId} s'annulera seul à la fin de la période.`);
      } catch (cancelError: any) {
        console.error(`Erreur lors de la planification de la fermeture du coffre: ${cancelError.message}`);
      }
    }

    const tierToAssign = formattedPlan === "treasure" ? "ultra" : formattedPlan;

    try {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ user_tier: tierToAssign })
        .eq("id", userId);

      if (error) throw error;

      console.log(`Profil ${userId} mis à jour au forfait : ${tierToAssign}`);
    } catch (dbError: any) {
      console.error(`Échec mise à jour Supabase: ${dbError.message}`);
      return NextResponse.json({ error: "Échec écriture base de données" }, { status: 500 });
    }
  }

  // ── CAS 2 : VALIDATION FINALE DE FACTURE AVEC NOTIFICATION DIFFÉRÉE (SEPA) ───
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as any;

    const subscriptionId = typeof invoice.subscription === "object"
      ? invoice.subscription?.id
      : (invoice.subscription as string);

    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata?.userId;
        const planName = subscription.metadata?.planName;

        if (userId && planName) {
          const formattedPlan = planName.trim().toLowerCase();
          const tierToAssign = formattedPlan === "treasure" ? "ultra" : formattedPlan;

          console.log(`[SEPA VALIDÉ] Fonds reçus pour l'abonnement ${subscriptionId}. Activation de ${userId} au plan ${tierToAssign}`);

          const { error } = await supabaseAdmin
            .from("profiles")
            .update({ user_tier: tierToAssign })
            .eq("id", userId);

          if (error) throw error;
        }
      } catch (err: any) {
        console.error(`Erreur lors de la libération des accès suite au succès de la facture SEPA: ${err.message}`);
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}