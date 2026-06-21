import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ── LE MAPPING SÉCURISÉ INCLUANT TON ID DE COFFRE PROD ──
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
    const { plan, userId, userEmail } = body;

    // --- SÉCURITÉ #1 : Validation des données reçues ---
    if (!plan || !PRICE_IDS[plan as keyof typeof PRICE_IDS]) {
      return NextResponse.json({ message: "Invalid or missing plan parameter" }, { status: 400 });
    }
    if (!userId || !userEmail) {
      return NextResponse.json({ message: "User authentication missing" }, { status: 401 });
    }

    const priceId = PRICE_IDS[plan as keyof typeof PRICE_IDS];

console.log("PLAN REÇU =", plan);
console.log("PRICE ID UTILISÉ =", priceId);
console.log("STRIPE KEY =", process.env.STRIPE_SECRET_KEY?.slice(0, 12));
console.log("BASIC =", process.env.STRIPE_BASIC_PRICE_ID);
console.log("PRICE_IDS =", PRICE_IDS);


    
    const origin = req.headers.get("origin") ?? "http://localhost:3000";

    // --- SÉCURITÉ #2 : Configuration simplifiée pour le Checkout ---
    // On laisse l'objet d'abonnement standard à la création pour éviter les bogues TypeScript
    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {};

    // --- SÉCURITÉ #3 : Création de la session Checkout ---
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
      subscription_data: subscriptionData,
      success_url: `${origin}/services?success=true`,
      cancel_url: `${origin}/services?canceled=true`,
      
      metadata: {
        userId: userId,
        planName: plan, // Transmis au Webhook pour déclencher la suite
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