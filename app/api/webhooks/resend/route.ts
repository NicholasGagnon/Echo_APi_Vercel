import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = await req.json();

    console.log("INBOUND EMAIL WEBHOOK RECEIVED");

    const emailData = body.data || {};

    // 1. Extraction des infos de base
    const from = emailData.from || "Inconnu";
    const subject = emailData.subject || "Sans objet";
    
    const toArray = Array.isArray(emailData.to) ? emailData.to : [emailData.to || ""];
    const toFormatted = toArray.join(", ");

    // 2. Extraction et désencapsulation du vrai message
    let messageContent = "[Message vide]";

    // Si Resend a mis une string JSON imbriquée dans le champ text
    if (emailData.text && emailData.text.trim().startsWith("{")) {
      try {
        const nestedPayload = JSON.parse(emailData.text);
        const nestedData = nestedPayload.data || {};
        messageContent = nestedData.text || nestedData.html || "[Message vide dans l'objet imbriqué]";
      } catch (e) {
        // Si le parse échoue, on garde le texte brut
        messageContent = emailData.text;
      }
    } else {
      // Fallbacks classiques si ce n'est pas du JSON imbriqué
      messageContent = emailData.text || emailData.html || body.text || "[Message vide]";
    }

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