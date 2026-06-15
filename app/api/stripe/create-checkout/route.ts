import { NextResponse } from "next/server";
import Stripe from "stripe";

// Initialisation propre et simplifiée (sans accolades vides)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Le mapping sécurisé entre tes forfaits et tes Price IDs Stripe
const PRICE_IDS = {
  basic: process.env.STRIPE_BASIC_PRICE_ID!,
  premium: process.env.STRIPE_PREMIUM_PRICE_ID!,
  ultra: process.env.STRIPE_ULTRA_PRICE_ID!,
  founder: process.env.STRIPE_FOUNDER_PRICE_ID!,
} as const;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { plan, userId, userEmail } = body;

    // --- SÉCURITÉ #1 : Validation des données reçues ---
    if (!plan || !PRICE_IDS[plan as keyof typeof PRICE_IDS]) {
      return NextResponse.json({ message: "Invalid or missing plan parameter" }, { status: 400 });
    }
    if (!userId || !userEmail) {
      return NextResponse.json({ message: "User authentication missing" }, { status: 401 });
    }

    const priceId = PRICE_IDS[plan as keyof typeof PRICE_IDS];

    // --- SÉCURITÉ #2 : Gestion de l'URL de redirection ---
    // Si l'origine est manquante, on utilise localhost par défaut pour ton dev
    const origin = req.headers.get("origin") ?? "http://localhost:3000";

    // --- SÉCURITÉ #3 : Création de la session Checkout de Stripe ---
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/services?success=true`,
      cancel_url: `${origin}/services?canceled=true`,
      
      // Métadonnées cruciales pour l'activation dans Supabase plus tard
      metadata: {
        userId: userId,
        planName: plan,
      },
    });

    // On renvoie l'URL magique de Stripe au frontend
    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error("Stripe Route Error:", error);
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}