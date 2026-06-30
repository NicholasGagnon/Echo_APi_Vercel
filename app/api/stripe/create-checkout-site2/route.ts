import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16" as any,
});

export async function POST(req: Request) {
  try {
    const { ficheId, acheteurId, acheteurEmail } = await req.json();

    if (!ficheId || !acheteurId) {
      return NextResponse.json(
        { message: "ficheId et acheteurId requis" },
        { status: 400 }
      );
    }

    const priceId = process.env.STRIPE_FICHE_PRICE_ID!;
    const origin  = req.headers.get("origin") ?? "http://localhost:3000";

    // ── CONFIGURATION DE LA SESSION DE PAIEMENT UNIQUE — 1,50$ ──
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment", // Paiement ponctuel
      allow_promotion_codes: true,
      customer_email: acheteurEmail || undefined,

      line_items: [
        {
          price: priceId, // Produit Stripe existant — STRIPE_FICHE_PRICE_ID
          quantity: 1,
        },
      ],

      // Métadonnées lues par le webhook site2 pour ouvrir le tunnel
      metadata: {
        type: "unlock_fiche",
        fiche_id: ficheId,
        acheteur_id: acheteurId,
      },

      success_url: `${origin}/1/fiche?success=true&fiche_id=${ficheId}`,
      cancel_url: `${origin}/1/fiche?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Erreur lors de la création de la session Checkout Site 2:", error);
    return NextResponse.json(
      { message: "Erreur interne du serveur", error: error.message },
      { status: 500 }
    );
  }
}