import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, userEmail, currency = "CAD" } = body;

    if (!userId || !userEmail) {
      return NextResponse.json(
        { message: "Utilisateur non authentifié" },
        { status: 401 }
      );
    }

    // Normalisation du code de devise pour Stripe (cad, usd, eur)
    const normalizedCurrency = currency.toLowerCase().trim();

    const origin = req.headers.get("origin") ?? "https://echosai.ca";
    const referer = req.headers.get("referer");

    // Détermine l'URL de retour vers l'outil d'origine
    const returnUrl = referer || origin;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: userEmail,
      allow_promotion_codes: true,
      line_items: [
        {
          price_data: {
            currency: normalizedCurrency,
            product_data: {
              name: "Abonnement EchoAI Premium",
              description: "Accès illimité à l'ensemble des modules d'IA Echo",
            },
            unit_amount: 399, // 3.99 dans la devise choisie
            recurring: {
              interval: "month",
            },
          },
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