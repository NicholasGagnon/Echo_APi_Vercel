import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16" as any,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const endpointSecret = "whsec_91ouSePttTSmS1saQvxPWrpYO9lfRR73";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text(); // Stripe exige le body brut pour vérifier la signature
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: any) {
    console.error(`Erreur de signature Webhook Site2: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session  = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (metadata && metadata.type === "unlock_fiche") {
      const ficheId    = metadata.fiche_id;
      const acheteurId = metadata.acheteur_id;

      console.log(`[SITE2 WEBHOOK] Déblocage fiche ${ficheId} pour acheteur ${acheteurId}`);

      try {
        // Récupérer le propriétaire de la fiche (inscrit_id)
        const { data: ficheRow, error: ficheError } = await supabaseAdmin
          .from("fiches")
          .select("user_id")
          .eq("id", ficheId)
          .maybeSingle();

        if (ficheError) {
          console.error("[SITE2 WEBHOOK] Erreur lecture fiche:", ficheError.message, "ficheId:", ficheId);
          return NextResponse.json({ error: "Fiche introuvable", details: ficheError.message }, { status: 500 });
        }

        if (!ficheRow) {
          console.error("[SITE2 WEBHOOK] Aucune fiche trouvée pour id:", ficheId);
        }

        const inscritId = ficheRow?.user_id || null;

        // Créer le tunnel — idempotent: si déjà débloqué (tests répétés), on ignore l'erreur de doublon
        const { error: insertError } = await supabaseAdmin
          .from("tunnels")
          .upsert(
            { fiche_id: ficheId, acheteur_id: acheteurId, inscrit_id: inscritId },
            { onConflict: "fiche_id,acheteur_id", ignoreDuplicates: true }
          );

        if (insertError) {
          console.error("[SITE2 WEBHOOK] Erreur insertion tunnel:", insertError.message, JSON.stringify(insertError));
          return NextResponse.json({ error: "Erreur base de données", details: insertError.message }, { status: 500 });
        }

        console.log(`[SITE2 WEBHOOK] Tunnel ouvert avec succès — fiche ${ficheId}`);
      } catch (dbError: any) {
        console.error("[SITE2 WEBHOOK] Erreur serveur:", dbError.message);
        return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}