// app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const DESTINATIONS: Record<string, string> = {
  support: "support@echosai.ca",
  contact: "contact@echosai.ca",
};

export async function POST(req: NextRequest) {
  try {
    const { type, email, category, subject, message } = await req.json();

    if (!type || !email || !category || !subject || !message) {
      return NextResponse.json({ error: "Champs manquants." }, { status: 400 });
    }

    const to = DESTINATIONS[type];
    if (!to) {
      return NextResponse.json({ error: "Type invalide." }, { status: 400 });
    }

    const { error } = await resend.emails.send({
      from: "Echo AI <noreply@echosai.ca>",
      to,
      replyTo: email,
      subject: `[Echo ${type === "support" ? "Support" : "Contact"} — ${category}] ${subject}`,
      html: `
        <div style="font-family: monospace; background: #09090b; color: #e4e4e7; padding: 32px; border-radius: 12px; max-width: 600px;">
          <div style="border-bottom: 1px solid #27272a; padding-bottom: 16px; margin-bottom: 24px;">
            <p style="color: #06b6d4; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 4px;">
              Echo AI — ${type === "support" ? "Demande de support" : "Message de contact"}
            </p>
            <h2 style="color: #f4f4f5; font-size: 18px; margin: 0;">${subject}</h2>
          </div>
          <div style="margin-bottom: 24px;">
            <p style="color: #71717a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px;">Catégorie</p>
            <p style="color: #f4f4f5; margin: 0;">${category}</p>
          </div>
          <div style="margin-bottom: 24px;">
            <p style="color: #71717a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px;">De</p>
            <p style="color: #22d3ee; margin: 0;">${email}</p>
          </div>
          <div>
            <p style="color: #71717a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px;">Message</p>
            <div style="background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; white-space: pre-wrap; color: #d4d4d8; font-size: 14px; line-height: 1.7;">
${message}
            </div>
          </div>
          <p style="color: #3f3f46; font-size: 10px; margin-top: 32px; border-top: 1px solid #27272a; padding-top: 16px;">
            Echo AI Ecosystem — echosai.ca
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[CONTACT] Resend error:", error);
      return NextResponse.json({ error: "Échec de l'envoi." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[CONTACT] Crash:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}