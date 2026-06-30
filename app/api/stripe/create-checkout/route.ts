import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ── TON MAPPING PARFAIT (5 VARIABLES INTACTES) ──
const PRICE_IDS = {
  basic: process.env.STRIPE_BASIC_PRICE_ID!,
  premium: process.env.STRIPE_PREMIUM_PRICE_ID!,
  ultra: process.env.STRIPE_ULTRA_PRICE_ID!,
  founder: process.env.STRIPE_FOUNDER_PRICE_ID!,
  treasure: process.env.STRIPE_TREASURE_PRICE_ID!, 
} as const;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 🛠️ ON RÉCUPÈRE LE PLAN ET LA DEVISE SOUHAITÉE (CAD PAR DÉFAUT SI RIEN N'EST ENVOYÉ)
    const { plan, userId, userEmail, currency = "CAD" } = body;

    // --- SÉCURITÉ #1 : Validation des données reçues ---
    if (!plan || !PRICE_IDS[plan as keyof typeof PRICE_IDS]) {
      return NextResponse.json({ message: "Invalid or missing plan parameter" }, { status: 400 });
    }
    if (!userId || !userEmail) {
      return NextResponse.json({ message: "User authentication missing" }, { status: 401 });
    }

    const priceId = PRICE_IDS[plan as keyof typeof PRICE_IDS];

    const origin = req.headers.get("origin") ?? "http://localhost:3000";
    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {};

    // --- CONFIGURATION DYNAMIQUE DES MOYENS DE PAIEMENT ---
    let paymentMethodTypes: string[] = ["card"];
    if (currency.toUpperCase() === "EUR") {
      paymentMethodTypes = ["card", "sepa_debit", "bancontact"]; // Active les banques d'Europe
    } else if (currency.toUpperCase() === "USD") {
      paymentMethodTypes = ["card", "link"]; // Active Link pour les USA
    }

    // --- CRÉATION DE LA SESSION CHECKOUT ---
    const session = await stripe.checkout.sessions.create({
      payment_method_types: paymentMethodTypes as any,
      mode: "subscription",
      allow_promotion_codes: true,
      customer_email: userEmail,
      line_items: [
        {
          price: priceId, // C'est ton ID unique qui contient tes 3 devises
          quantity: 1,
        },
      ],

      // ── 🛠️ LA SEULE LIGNE CRITIQUE AJOUTÉE ──
      // C'est ça qui force Stripe à aller lire la ligne EUR ou USD de ton produit !
      currency: currency.toLowerCase(), 

      subscription_data: subscriptionData,
      success_url: `${origin}/services?success=true`,
      cancel_url: `${origin}/services?canceled=true`,
      
      metadata: {
        userId: userId,
        planName: plan,
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error("Stripe Route Error:", error);
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}