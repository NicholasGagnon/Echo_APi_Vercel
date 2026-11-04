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

  if (event.type === "checkout.session.completed" || event.type === "invoice.payment_succeeded") {
    const sessionOrInvoice = event.data.object as any;

    const customerEmail = sessionOrInvoice.customer_email || sessionOrInvoice.customer_details?.email;
    const userId = sessionOrInvoice.metadata?.userId || sessionOrInvoice.metadata?.user_id;
    const paymentType = sessionOrInvoice.metadata?.type;
    const bookId = sessionOrInvoice.metadata?.bookId;

    console.log(`⚡ Traitement paiement (${paymentType || "abonnement"}) pour userId: ${userId} / email: ${customerEmail}`);

    try {
      let targetUserId = userId;

      if (!targetUserId && customerEmail) {
        const { data } = await supabaseAdmin.auth.admin.listUsers();
        const matched = data?.users?.find((u: any) => u.email === customerEmail);
        if (matched) targetUserId = matched.id;
      }

      if (!targetUserId) {
        console.warn(`⚠️ Aucun utilisateur Supabase trouvé pour ce paiement (email: ${customerEmail})`);
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // ── CAS 1 : ACHAT PONCTUEL D'UN LIVRE (TÉLÉCHARGEMENT DÉFINITIF) ──
      if (paymentType === "book_purchase" && bookId) {
        const { error: bookInsertErr } = await supabaseAdmin.from("user_books").upsert(
          {
            user_id: targetUserId,
            book_id: bookId,
          },
          { onConflict: "user_id, book_id" }
        );

        if (bookInsertErr) {
          console.error("❌ Erreur insertion user_books:", bookInsertErr.message);
          return NextResponse.json({ error: "Erreur DB livre" }, { status: 500 });
        }

        console.log(`✅ LIVRE "${bookId}" DÉBLOQUÉ POUR TÉLÉCHARGEMENT DÉFINITIF (User: ${targetUserId})`);
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // ── CAS 2 : ABONNEMENT GLOBAL (LECTURE ILLIMITÉE EN LIGNE) ──
      await supabaseAdmin.from("profiles").upsert(
        {
          id: targetUserId,
          user_tier: "premium",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

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
        "books_quotas",
      ];

      for (const table of quotaTables) {
        try {
          let payload: any = {
            user_id: targetUserId,
            available_credits: 9999,
            tier: "advantage",
            updated_at: new Date().toISOString(),
          };

          if (table === "world_quotas") {
            payload = {
              user_id: targetUserId,
              available: 9999,
              tier: "advantage",
              updated_at: new Date().toISOString(),
            };
          }

          await supabaseAdmin.from(table).upsert(payload, { onConflict: "user_id" });
        } catch (tableErr: any) {
          console.warn(`⚠️ Impossible de mettre à jour la table ${table}:`, tableErr.message);
        }
      }

      console.log(`✅ ABONNEMENT GLOBAL DÉBLOQUÉ SUR TOUS LES OUTILS POUR ${targetUserId}`);
    } catch (dbErr: any) {
      console.error("❌ Erreur Supabase Webhook:", dbErr.message);
      return NextResponse.json({ error: "Erreur DB" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}