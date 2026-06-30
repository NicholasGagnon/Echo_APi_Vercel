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

    // Extraction de l'origine pour les redirections success/cancel
    const origin = req.headers.get("origin") ?? "http://localhost:3000";

    // ── CONFIGURATION DE LA SESSION DE PAIEMENT UNIQUE À 9,99$ ──
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment", // Mode ponctuel (achat unique obligatoire pour ton coupon)
      allow_promotion_codes: true, // Active la case code promo/coupon sur l'interface
      customer_email: acheteurEmail || undefined,
      
      line_items: [
        {
          price_data: {
            currency: "cad", // Ajuste en "usd" ou "eur" selon la devise de tes tests
            product_data: {
              name: `Déblocage Coordonnées — Fiche #${ficheId}`,
              description: "Accès définitif et illimité aux informations de contact du projet.",
            },
            unit_amount: 999, // 9,99$ (999 centimes) -> Permet le coupon à 99% !
          },
          quantity: 1,
        },
      ],

      // 🎯 Métadonnées capitales pour ton webhook site 2
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