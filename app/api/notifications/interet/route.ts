// app/api/notifications/interet/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

// Client public (clé anon) — suffisant pour lire les champs publics d'une fiche
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { fiche_id, fiche_nom, fiche_key, sender_id, sender_fiche_ids, creator_email, type } = await req.json();

    if (!creator_email || !fiche_nom || !sender_id) {
      return NextResponse.json({ error: "Champs manquants." }, { status: 400 });
    }

    // On va chercher TOUTES les fiches du visiteur (jamais son email — juste un aperçu public)
    let senderFiches: { nom_projet: string; type_projet: string; description: string; key: string }[] = [];
    if (Array.isArray(sender_fiche_ids) && sender_fiche_ids.length > 0) {
      const { data } = await supabase
        .from("fiches")
        .select("nom_projet,type_projet,description,key")
        .in("id", sender_fiche_ids);
      senderFiches = data || [];
    }

    const isTresInteresse = type === "tres_interesse";

    const subjectLine = isTresInteresse
      ? `⭐ Quelqu'un est très intéressé par "${fiche_nom}"`
      : `💛 Quelqu'un a marqué un intérêt pour "${fiche_nom}"`;

    const snippet = (desc: string) => desc && desc.length > 140 ? desc.slice(0, 140).trim() + "…" : desc;

    const senderFichesHtml = senderFiches.map(f => `
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 14px; margin-bottom: 10px;">
        <p style="color: #22d3ee; font-size: 13px; font-weight: bold; margin: 0 0 4px;">
          ${f.nom_projet} ${f.type_projet ? `<span style="color:#52525b; font-weight: normal;">· ${f.type_projet}</span>` : ""}
        </p>
        ${f.description ? `<p style="color: #a1a1aa; font-size: 12px; margin: 0;">${snippet(f.description)}</p>` : ""}
      </div>
    `).join("");

    const { error } = await resend.emails.send({
      from: "Echo AI <noreply@echosai.ca>",
      to: creator_email,
      // Plus de replyTo vers l'email du visiteur : l'identité reste protégée
      // tant que le destinataire n'a pas débloqué sa fiche.
      subject: subjectLine,
      html: `
        <div style="font-family: monospace; background: #09090b; color: #e4e4e7; padding: 32px; border-radius: 12px; max-width: 600px;">
          <div style="border-bottom: 1px solid #27272a; padding-bottom: 16px; margin-bottom: 24px;">
            <p style="color: #06b6d4; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 4px;">
              Echo AI — Affinité de Projets
            </p>
            <h2 style="color: #f4f4f5; font-size: 18px; margin: 0;">
              ${isTresInteresse ? "⭐ Très intéressé" : "💛 Intérêt reçu"}
            </h2>
          </div>

          <div style="margin-bottom: 20px;">
            <p style="color: #71717a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px;">Fiche concernée</p>
            <p style="color: #f4f4f5; font-size: 15px; font-weight: bold; margin: 0;">${fiche_nom}</p>
            ${fiche_key ? `<p style="color: #52525b; font-size: 11px; margin: 4px 0 0;">Clé : ${fiche_key}</p>` : ""}
          </div>

          <div style="background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
            <p style="color: #d4d4d8; font-size: 13px; margin: 0;">
              ${isTresInteresse
                ? "Une personne est <strong style='color:#22d3ee'>très intéressée</strong> par votre projet."
                : "Une personne a marqué un <strong style='color:#facc15'>intérêt</strong> pour votre projet."}
            </p>
          </div>

          ${senderFiches.length > 0 ? `
          <div style="margin-bottom: 24px;">
            <p style="color: #71717a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px;">
              ${senderFiches.length > 1 ? "Ses projets" : "Son projet"}
            </p>
            ${senderFichesHtml}
            <p style="color: #71717a; font-size: 11px; margin: 10px 0 0;">
              Débloquez ${senderFiches.length > 1 ? "une de ses fiches" : "sa fiche"} pour accéder à ${senderFiches.length > 1 ? "ses" : "ses"} coordonnées et lui répondre directement.
            </p>
          </div>
          ` : `
          <p style="color: #71717a; font-size: 11px; margin-bottom: 24px;">
            Cette personne n'a pas encore de fiche active — consultez les fiches pour en savoir plus.
          </p>
          `}

          <a href="https://echosai.ca/1/fiche" style="display:inline-block; background:#06b6d4; color:#000; font-weight:bold; font-size:13px; padding:10px 20px; border-radius:8px; text-decoration:none; margin-bottom:24px;">
            ${senderFiches.length > 0 ? "Débloquer sa fiche →" : "Voir les fiches →"}
          </a>

          <p style="color: #3f3f46; font-size: 10px; margin-top: 16px; border-top: 1px solid #27272a; padding-top: 16px;">
            Echo AI Ecosystem — echosai.ca · Affinité de Projets
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[INTERET] Resend error:", error);
      return NextResponse.json({ error: "Échec de l'envoi." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[INTERET] Crash:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}