
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";


// Initialisation de Stripe avec la clé secrète
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Initialisation du client Supabase d'administration (Service Role) pour contourner les règles RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Clé secrète d'administration requise
);

// Configuration Next.js App Router pour forcer le traitement dynamique
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const payload = await req.text(); // Stripe nécessite le body brut pour valider la signature
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("❌ En-tête stripe-signature manquant");
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // Validation stricte de l'origine du webhook avec la clé secrète Stripe
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`❌ Échec de la validation du Webhook Stripe: ${err.message}`);
    return NextResponse.json({ error: `Erreur de signature: ${err.message}` }, { status: 400 });
  }

  console.log(`⚡ Événement Stripe intercepté avec succès : ${event.type}`);

  // Traitement du paiement d'abonnement validé
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Récupération sécurisée des métadonnées de notre session de paiement
    const userId = session.metadata?.userId;
    const planName = session.metadata?.planName;

    if (!userId || !planName) {
      console.error("❌ Erreur critique : userId ou planName introuvable dans les métadonnées de la session");
      return NextResponse.json({ error: "Métadonnées manquantes dans Stripe" }, { status: 400 });
    }

    // Sécurisation et formatage de la chaîne de caractères (Correction JS: trim au lieu de strip)
    const formattedPlan = planName.trim().toLowerCase();

    console.log(`⚡ Activation en cours... Utilisateur: ${userId} | Plan cible: ${formattedPlan}`);

    try {
      // Écriture forcée avec les privilèges Service Role dans Supabase
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ user_tier: formattedPlan })
        .eq("id", userId);

      if (error) {
        throw error;
      }

      console.log(`✅ Profil utilisateur '${userId}' mis à jour avec succès au forfait : [${formattedPlan}]`);
    } catch (dbError: any) {
      console.error(`❌ Échec de la mise à jour Supabase: ${dbError.message}`);
      return NextResponse.json({ error: "Échec de l'écriture en base de données" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}