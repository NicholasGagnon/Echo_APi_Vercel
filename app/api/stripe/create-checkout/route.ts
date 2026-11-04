import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, userEmail, currency = "CAD", bookId, bookTitle } = body;

    if (!userId || !userEmail) {
      return NextResponse.json(
        { message: "Utilisateur non authentifié" },
        { status: 401 }
      );
    }

    const normalizedCurrency = currency.toLowerCase().trim();
    const origin = req.headers.get("origin") ?? "https://echosai.ca";
    const referer = req.headers.get("referer");
    const returnUrl = referer || origin;

    // ── CAS 1 : ACHAT UNITAIRE D'UN LIVRE (TÉLÉCHARGEMENT DÉFINITIF) ──
    if (bookId) {
      const bookPriceId = process.env.STRIPE_ACHAT_DE_LIVRE_PRICE_ID;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: userEmail,
        allow_promotion_codes: true,
        line_items: bookPriceId
          ? [{ price: bookPriceId, quantity: 1 }]
          : [
              {
                price_data: {
                  currency: normalizedCurrency,
                  product_data: {
                    name: bookTitle ? `Livre : ${bookTitle}` : "Achat de livre",
                    description: "Accès et téléchargement EPUB définitif",
                  },
                  unit_amount: 250, // 2.50 $CA
                },
                quantity: 1,
              },
            ],
        success_url: `${returnUrl}?book_purchase=success&book_id=${encodeURIComponent(bookId)}`,
        cancel_url: `${returnUrl}?book_purchase=canceled`,
        metadata: {
          type: "book_purchase",
          userId: userId,
          bookId: bookId,
        },
      });

      return NextResponse.json({ url: session.url });
    }

    // ── CAS 2 : ABONNEMENT RÉCURRENT STANDARD (LECTURE ILLIMITÉE) ──
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
            unit_amount: 399,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
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