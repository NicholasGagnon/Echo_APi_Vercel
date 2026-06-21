import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = await req.json();

    console.log("INBOUND EMAIL WEBHOOK RECEIVED");

    const emailData = body.data || {};

    // 1. Extraction simple et directe (comme le sujet)
    const from = emailData.from || "Inconnu";
    const subject = emailData.subject || "Sans objet";
    
    const toArray = Array.isArray(emailData.to) ? emailData.to : [emailData.to || ""];
    const toFormatted = toArray.join(", ");

    // 2. Les vrais champs Inbound de Resend : text_body ou html_body
    const messageContent = emailData.text_body || emailData.html_body || emailData.text || "[Message vide]";

    // 3. Détermination du préfixe selon le destinataire
    let prefix = "[EMAIL]";
    const toLower = toFormatted.toLowerCase();
    if (toLower.includes("support@echosai.ca")) prefix = "[SUPPORT]";
    if (toLower.includes("contact@echosai.ca")) prefix = "[CONTACT]";

    // 4. Envoi de l'email épuré
    await resend.emails.send({
      from: "support@echosai.ca",
      to: "lafailleestouverte@gmail.com",
      subject: `${prefix} ${subject}`,
      text: `De: ${from}\nPour: ${toFormatted}\n\nMessage:\n${messageContent}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur Webhook:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}