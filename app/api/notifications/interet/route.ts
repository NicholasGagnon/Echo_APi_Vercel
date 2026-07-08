// app/api/notifications/interet/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { fiche_id, fiche_nom, fiche_key, sender_email, creator_email, type } = await req.json();

    if (!creator_email || !fiche_nom) {
      return NextResponse.json({ error: "Champs manquants." }, { status: 400 });
    }

    const isTresInteresse = type === "tres_interesse";

    const subjectLine = isTresInteresse
      ? `⭐ Quelqu'un est très intéressé par "${fiche_nom}"`
      : `💛 Quelqu'un a marqué un intérêt pour "${fiche_nom}"`;

    const { error } = await resend.emails.send({
      from: "Echo AI <noreply@echosai.ca>",
      to: creator_email,
      replyTo: sender_email !== "anonymous@visitor.local" ? sender_email : undefined,
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

          <div style="margin-bottom: 20px;">
            <p style="color: #71717a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px;">De la part de</p>
            <p style="color: ${sender_email !== "anonymous@visitor.local" ? "#22d3ee" : "#52525b"}; margin: 0;">
              ${sender_email !== "anonymous@visitor.local" ? sender_email : "Visiteur anonyme"}
            </p>
          </div>

          <div style="background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 14px; margin-bottom: 24px;">
            <p style="color: #d4d4d8; font-size: 13px; margin: 0;">
              ${isTresInteresse
                ? "Cette personne est <strong style='color:#22d3ee'>très intéressée</strong> par votre projet et souhaite entrer en contact."
                : "Cette personne a marqué un <strong style='color:#facc15'>intérêt</strong> pour votre projet."}
            </p>
          </div>

          <a href="https://echosai.ca/1/fiche" style="display:inline-block; background:#06b6d4; color:#000; font-weight:bold; font-size:13px; padding:10px 20px; border-radius:8px; text-decoration:none; margin-bottom:24px;">
            Voir les fiches →
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