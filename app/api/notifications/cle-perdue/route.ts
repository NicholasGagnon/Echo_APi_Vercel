// app/api/notifications/cle-perdue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { fiche_id, fiche_nom, fiche_key, email_demandeur, creator_email } = await req.json();

    if (!fiche_key || !email_demandeur) {
      return NextResponse.json({ error: "Champs manquants." }, { status: 400 });
    }

    // Envoyer la clé à l'email du demandeur
    const { error } = await resend.emails.send({
      from: "Echo AI <noreply@echosai.ca>",
      to: email_demandeur,
      subject: `🔑 Votre clé pour la fiche "${fiche_nom || "Affinité de Projets"}"`,
      html: `
        <div style="font-family: monospace; background: #09090b; color: #e4e4e7; padding: 32px; border-radius: 12px; max-width: 600px;">
          <div style="border-bottom: 1px solid #27272a; padding-bottom: 16px; margin-bottom: 24px;">
            <p style="color: #06b6d4; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 4px;">
              Echo AI — Affinité de Projets
            </p>
            <h2 style="color: #f4f4f5; font-size: 18px; margin: 0;">Récupération de clé</h2>
          </div>

          <div style="margin-bottom: 24px;">
            <p style="color: #71717a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px;">Fiche</p>
            <p style="color: #f4f4f5; margin: 0;">${fiche_nom || fiche_id}</p>
          </div>

          <div style="margin-bottom: 32px;">
            <p style="color: #71717a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 12px;">Votre clé personnelle</p>
            <div style="background: #18181b; border: 2px solid #06b6d4; border-radius: 10px; padding: 20px; text-align: center;">
              <span style="font-size: 36px; font-weight: 900; letter-spacing: 0.3em; color: #22d3ee;">${fiche_key}</span>
            </div>
            <p style="color: #52525b; font-size: 11px; margin-top: 10px; text-align: center;">
              Conservez cette clé précieusement. Elle donne accès à vos coordonnées.
            </p>
          </div>

          <div style="background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 14px; margin-bottom: 24px;">
            <p style="color: #71717a; font-size: 11px; margin: 0 0 6px;">Comment utiliser votre clé :</p>
            <p style="color: #d4d4d8; font-size: 13px; margin: 0;">
              Rendez-vous sur <a href="https://echosai.ca/1/fiche" style="color: #22d3ee;">echosai.ca/1/fiche</a>,
              trouvez votre fiche et entrez cette clé dans le champ prévu.
            </p>
          </div>

          <p style="color: #3f3f46; font-size: 10px; margin-top: 24px; border-top: 1px solid #27272a; padding-top: 16px;">
            Echo AI Ecosystem — echosai.ca · Si vous n'avez pas demandé cette clé, ignorez cet email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[CLE-PERDUE] Resend error:", error);
      return NextResponse.json({ error: "Échec de l'envoi." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[CLE-PERDUE] Crash:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}