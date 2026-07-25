import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

// 🔑 METS TA VRAIE CLÉ STRIPE ICI
const ENDPOINT_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_1U3vFgBHw5LMtvb0HSkCF7kdfOtJZLkl";

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("❌ Signature Stripe manquante dans le header");
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // Validation officielle Stripe
    event = stripe.webhooks.constructEvent(payload, signature, ENDPOINT_SECRET);
  } catch (err: any) {
    console.error(`❌ Échec signature Webhook: ${err.message}`);
    return NextResponse.json({ error: `Signature invalide: ${err.message}` }, { status: 400 });
  }

  // Si on arrive ici, l'événement est 100% valide
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId || session.metadata?.user_id;

    console.log(`⚡ Traitement paiement pour userId: ${userId} / email: ${session.customer_email}`);

    try {
      // 1. Recherche de l'utilisateur dans Supabase (par metadata ou par courriel)
      let targetUserId = userId;

      if (!targetUserId && session.customer_email) {
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        const matched = usersData?.users.find(u => u.email === session.customer_email);
        if (matched) targetUserId = matched.id;
      }

      if (targetUserId) {
        // 2. ÉCRITURE DANS PROFILES
        await supabaseAdmin.from("profiles").upsert({
          id: targetUserId,
          user_tier: "premium",
          updated_at: new Date().toISOString()
        }, { onConflict: "id" });

        // 3. ÉCRITURE DANS WORLD_QUOTAS
        await supabaseAdmin.from("world_quotas").upsert({
          user_id: targetUserId,
          available: 9999,
          tier: "advantage",
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

        // 4. ÉCRITURE DANS CONTENU_QUOTAS
        await supabaseAdmin.from("contenu_quotas").upsert({
          user_id: targetUserId,
          tier: "advantage",
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

        console.log(`✅ TOUTES LES TABLES SUPABASE ONT ÉTÉ MISES À JOUR POUR ${targetUserId} !`);
      }
    } catch (dbErr: any) {
      console.error("❌ Erreur écriture Supabase:", dbErr.message);
      return NextResponse.json({ error: "Erreur Supabase" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}