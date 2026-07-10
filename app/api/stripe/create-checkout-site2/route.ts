// app/api/stripe/create-checkout-site2/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16" as any,
});

const ALLOWED_CURRENCIES = ["CAD", "USD", "EUR"];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const origin = req.headers.get("origin") ?? "http://localhost:3000";

    // ── PLAN WORLD PREMIUM ────────────────────────────────────────────────────
    if (body.plan === "world" || body.plan === "world_advantage") {
      const { userId, userEmail, currency = "CAD" } = body;

      if (!userId) {
        return NextResponse.json({ message: "userId requis" }, { status: 400 });
      }

      const plan = body.plan as string;
      const isAdvantage = plan === "world_advantage";

      const WORLD_PRICE_IDS: Record<string, string> = {
        CAD: process.env.STRIPE_WORLD_PRICE_ID || "",
        USD: process.env.STRIPE_WORLD_PRICE_ID || "",
        EUR: process.env.STRIPE_WORLD_PRICE_ID || "",
        CNY: process.env.STRIPE_WORLD_PRICE_ID || "",
      };
      const ADVANTAGE_PRICE_IDS: Record<string, string> = {
        CAD: process.env.STRIPE_WORLDBASIC_PRICE_ID || "",
        USD: process.env.STRIPE_WORLDBASIC_PRICE_ID || "",
        EUR: process.env.STRIPE_WORLDBASIC_PRICE_ID || "",
        CNY: process.env.STRIPE_WORLDBASIC_PRICE_ID || "",
      };

      const priceId = isAdvantage
        ? (ADVANTAGE_PRICE_IDS[currency] || ADVANTAGE_PRICE_IDS.CAD)
        : (WORLD_PRICE_IDS[currency] || WORLD_PRICE_IDS.CAD);

      if (!priceId) {
        return NextResponse.json({ message: "STRIPE_WORLD_PRICE_ID non configuré" }, { status: 500 });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        allow_promotion_codes: true,
        customer_email: userEmail || undefined,

        line_items: [{ price: priceId, quantity: 1 }],

        metadata: {
          type:      isAdvantage ? "world_advantage" : "world_premium",
          user_id:   userId,
          currency,
        },

        success_url: `${origin}/world?world_premium=success`,
        cancel_url:  `${origin}/world?world_premium=canceled`,
      });

      return NextResponse.json({ url: session.url });
    }

    // ── PLAN UNLOCK FICHE ──────────────────────────────────────────────────────
    const { ficheId, acheteurId, acheteurEmail, currency = "CAD" } = body;

    if (!ficheId || !acheteurId) {
      return NextResponse.json(
        { message: "ficheId et acheteurId requis" },
        { status: 400 }
      );
    }

    const selectedCurrency = ALLOWED_CURRENCIES.includes((currency || "").toUpperCase())
      ? currency.toUpperCase()
      : "CAD";

    const basePriceId = process.env.STRIPE_FICHE_PRICE_ID!;

    // On récupère le produit Stripe lié au price existant, pour rester
    // rattaché au même produit dans le dashboard/rapports, peu importe
    // la devise choisie. Le montant reste fixe (1,50$) dans les 3 devises
    // — pas de conversion de taux, juste 150 (cents) tel quel.
    const basePrice = await stripe.prices.retrieve(basePriceId);
    const productId = typeof basePrice.product === "string" ? basePrice.product : basePrice.product?.id;

    if (!productId) {
      return NextResponse.json({ message: "Produit Stripe introuvable pour STRIPE_FICHE_PRICE_ID" }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      allow_promotion_codes: true,
      customer_email: acheteurEmail || undefined,

      line_items: [{
        price_data: {
          currency: selectedCurrency.toLowerCase(),
          product: productId,
          unit_amount: 150, // toujours 1,50 — peu importe la devise choisie
        },
        quantity: 1,
      }],

      metadata: {
        type:        "unlock_fiche",
        fiche_id:    ficheId,
        acheteur_id: acheteurId,
        currency:    selectedCurrency,
      },

      success_url: `${origin}/1/fiche?success=true&fiche_id=${ficheId}`,
      cancel_url:  `${origin}/1/fiche?canceled=true`,
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error("Erreur Checkout Site2:", error);
    return NextResponse.json(
      { message: "Erreur interne", error: error.message },
      { status: 500 }
    );
  }
}