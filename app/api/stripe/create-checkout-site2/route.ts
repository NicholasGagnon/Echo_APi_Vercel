import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ficheId, acheteurId, acheteurEmail, currency = "CAD" } = body;

    // --- SÉCURITÉ #1 : Validation des données reçues ---
    if (!ficheId) {
      return NextResponse.json({ message: "ficheId manquant" }, { status: 400 });
    }
    if (!acheteurId || !acheteurEmail) {
      return NextResponse.json({ message: "User authentication missing" }, { status: 401 });
    }

    const priceId = process.env.STRIPE_FICHE_PRICE_ID!;
    const origin  = req.headers.get("origin") ?? "http://localhost:3000";

    // --- CONFIGURATION DYNAMIQUE DES MOYENS DE PAIEMENT — même logique que les abonnements ---
    let paymentMethodTypes: string[] = ["card"];
    if (currency.toUpperCase() === "EUR") {
      paymentMethodTypes = ["card", "sepa_debit", "bancontact"]; // Active les banques d'Europe
    } else if (currency.toUpperCase() === "USD") {
      paymentMethodTypes = ["card", "link"]; // Active Link pour les USA
    }

    // --- CRÉATION DE LA SESSION CHECKOUT — paiement unique, pas abonnement ---
    const session = await stripe.checkout.sessions.create({
      payment_method_types: paymentMethodTypes as any,
      mode: "payment",
      allow_promotion_codes: true,
      customer_email: acheteurEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      // Force Stripe à lire la bonne ligne de devise sur le produit
      currency: currency.toLowerCase(),

      success_url: `${origin}/1/fiche?unlocked=true&fiche_id=${ficheId}`,
      cancel_url: `${origin}/1/fiche?canceled=true`,

      metadata: {
        type: "unlock_fiche",
        fiche_id: ficheId,
        acheteur_id: acheteurId,
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error("Stripe checkout fiche error:", error);
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}