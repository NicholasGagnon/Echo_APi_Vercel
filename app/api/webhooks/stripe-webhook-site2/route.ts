// app/api/webhooks/stripe-webhook-site2/route.ts
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
  const body      = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: any) {
    console.error(`Erreur signature Webhook Site2: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session  = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    // ── WORLD PREMIUM ─────────────────────────────────────────────────────────
    if (metadata?.type === "world_premium" || metadata?.type === "world_advantage") {
      const userId    = metadata.user_id;
      const isAdv     = metadata.type === "world_advantage";
      const available = isAdv ? 100 : 400;
      const tier      = isAdv ? "advantage" : "premium";
      console.log(`[SITE2 WEBHOOK] World ${tier} activé pour user ${userId}`);

      try {
        await supabaseAdmin.from("world_quotas").upsert({
          user_id:     userId,
          available,
          tier,
          last_regen:  new Date().toISOString(),
          cycle_start: new Date().toISOString(),
          updated_at:  new Date().toISOString(),
        }, { onConflict: "user_id" });

        console.log(`[SITE2 WEBHOOK] World ${tier} — quota mis à jour pour ${userId}`);
      } catch (err: any) {
        console.error(`[SITE2 WEBHOOK] Erreur World ${tier}:`, err.message);
        return NextResponse.json({ error: "Erreur DB" }, { status: 500 });
      }

      return NextResponse.json({ received: true }, { status: 200 });
    }

    // ── UNLOCK FICHE (existant — inchangé) ────────────────────────────────────
    if (metadata?.type === "unlock_fiche") {
      const ficheId    = metadata.fiche_id;
      const acheteurId = metadata.acheteur_id;

      console.log(`[SITE2 WEBHOOK] Déblocage fiche ${ficheId} pour acheteur ${acheteurId}`);

      try {
        const { data: ficheRow, error: ficheError } = await supabaseAdmin
          .from("fiches")
          .select("user_id")
          .eq("id", ficheId)
          .maybeSingle();

        if (ficheError) {
          console.error("[SITE2 WEBHOOK] Erreur lecture fiche:", ficheError.message);
          return NextResponse.json({ error: "Fiche introuvable", details: ficheError.message }, { status: 500 });
        }

        const inscritId = ficheRow?.user_id || null;

        const { error: insertError } = await supabaseAdmin
          .from("tunnels")
          .upsert(
            { fiche_id: ficheId, acheteur_id: acheteurId, inscrit_id: inscritId },
            { onConflict: "fiche_id,acheteur_id", ignoreDuplicates: true }
          );

        if (insertError) {
          console.error("[SITE2 WEBHOOK] Erreur tunnel:", insertError.message);
          return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
        }

        console.log(`[SITE2 WEBHOOK] Tunnel ouvert — fiche ${ficheId}`);
      } catch (dbError: any) {
        console.error("[SITE2 WEBHOOK] Erreur serveur:", dbError.message);
        return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
      }
    }
  }

  // ── SUBSCRIPTION RENOUVELÉE — reset quota mensuel ─────────────────────────
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const subId   = (invoice as any).subscription as string | null;
    if (!subId) return NextResponse.json({ received: true });

    try {
      const sub      = await stripe.subscriptions.retrieve(subId);
      const metadata = sub.metadata;
      if (metadata?.type === "world_premium" || sub.items.data.some(i =>
        i.price.id === (process.env.STRIPE_WORLD_PRICE_ID || "")
      )) {
        const userId = metadata?.user_id || (sub as any).customer_metadata?.user_id;
        if (userId) {
          await supabaseAdmin.from("world_quotas").upsert({
            user_id:     userId,
            available:   400,
            tier:        "premium",
            last_regen:  new Date().toISOString(),
            cycle_start: new Date().toISOString(),
            updated_at:  new Date().toISOString(),
          }, { onConflict: "user_id" });
          console.log(`[SITE2 WEBHOOK] World Premium — renouvellement quota ${userId}`);
        }
      }
    } catch (e: any) {
      console.warn("[SITE2 WEBHOOK] Renouvellement World:", e.message);
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}