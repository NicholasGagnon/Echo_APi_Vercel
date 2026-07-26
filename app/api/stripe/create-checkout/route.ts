import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, userEmail } = body;

    if (!userId || !userEmail) {
      return NextResponse.json(
        { message: "Utilisateur non authentifié" },
        { status: 401 }
      );
    }

    // ID du tarif à 3,99$ (World Advantage / Basic)
    const priceId = process.env.STRIPE_WORLDBASIC_PRICE_ID || process.env.STRIPE_BASIC_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        { message: "Identifiant de prix 3.99$ manquant dans le .env" },
        { status: 500 }
      );
    }

    const origin = req.headers.get("origin") ?? "https://echosai.ca";
    const referer = req.headers.get("referer");

    // Détermine l'URL de retour : utilise la page exacte d'origine (ex: /idea, /books) ou le domaine
    const returnUrl = referer || origin;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: userEmail,
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // 🎯 REDIRECTION DYNAMIQUE VERS L'OUTIL EN COURS
      success_url: `${returnUrl}?premium=success`,
      cancel_url: `${returnUrl}?premium=canceled`,
      metadata: {
        userId: userId,
      },
      subscription_data: {
        metadata: {
          userId: userId,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json(
      { message: error.message || "Erreur interne" },
      { status: 500 }
    );
  }
}