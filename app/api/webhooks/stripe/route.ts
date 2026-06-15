import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// On initialise un client Supabase avec accès admin pour pouvoir mettre à jour le profil de l'utilisateur
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // On va ajouter cette clé sécurisée dans ton .env juste après
);

export async function POST(req: Request) {
  const body = await req.text(); // Stripe a besoin du body brut (raw) pour la sécurité
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (!signature) throw new Error("Missing stripe-signature header");

    // Vérification de sécurité pour s'assurer que le message vient bien de Stripe et non d'un pirate
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error(`❌ Webhook Error: ${error.message}`);
    return NextResponse.json({ message: `Webhook Error: ${error.message}` }, { status: 400 });
  }

  // L'événement déclenché quand un abonnement est payé ou créé avec succès
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // On récupère les métadonnées magiques qu'on a sauvegardées à l'étape précédente !
    const userId = session.metadata?.userId;
    const planName = session.metadata?.planName;

    if (userId && planName) {
      console.log(`⚡ Paiement réussi détecté pour l'utilisateur ${userId}. Activation du plan [${planName}]...`);

      // 💾 MISE À JOUR DE SUPABASE
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ user_tier: planName })
        .eq("id", userId);

      if (error) {
        console.error(`❌ Erreur lors de la mise à jour du profil Supabase:`, error);
        return NextResponse.json({ message: "Database update failed" }, { status: 500 });
      }

      console.log(`✅ Table 'profiles' mise à jour avec succès pour ${userId} -> ${planName}`);
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}