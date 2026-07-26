import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = JSON.parse(rawBody) as Stripe.Event;
  } catch (err: any) {
    console.error("❌ Erreur parsing JSON Webhook:", err.message);
    return NextResponse.json({ error: "JSON Invalide" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId || session.metadata?.user_id;

    console.log(`⚡ Traitement paiement pour userId: ${userId} / email: ${session.customer_email}`);

    try {
      let targetUserId = userId;

      if (!targetUserId && session.customer_email) {
        const { data } = await supabaseAdmin.auth.admin.listUsers();
        const matched = data?.users?.find((u: any) => u.email === session.customer_email);
        if (matched) targetUserId = matched.id;
      }

      if (targetUserId) {
        // 1. SOURCE DE VÉRITÉ GLOBALE
        await supabaseAdmin.from("profiles").upsert({
          id: targetUserId,
          user_tier: "premium",
          updated_at: new Date().toISOString()
        }, { onConflict: "id" });

        // 2. DÉBLOCAGE DE TOUTES LES TABLES DE QUOTAS DU SITE
        const quotaTables = [
          "world_quotas",
          "contenu_quotas",
          "chat_quotas",
          "idea_quotas",
          "horizon_quotas",
          "correcteur_quotas",
          "budget_quotas",
          "vitality_quotas",
          "calendar_quotas",
          "avis_quotas",
          "fastbilling_quotas",
          "books_quotas"
        ];

        for (const table of quotaTables) {
          await supabaseAdmin.from(table).upsert({
            user_id: targetUserId,
            available_credits: 9999,
            tier: "advantage",
            updated_at: new Date().toISOString()
          }, { onConflict: "user_id" });
        }

        console.log(`✅ ABONNEMENT GLOBAL DÉBLOQUÉ SUR TOUS LES OUTILS POUR ${targetUserId}`);
      }
    } catch (dbErr: any) {
      console.error("❌ Erreur Supabase Webhook:", dbErr.message);
      return NextResponse.json({ error: "Erreur DB" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}