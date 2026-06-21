import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = await req.json();

    console.log("INBOUND EMAIL WEBHOOK RECEIVED");

    const emailData = body.data || {};
    const emailId = emailData.email_id;

    if (!emailId) {
      console.error("Aucun email_id trouvé dans le webhook");
      return NextResponse.json({ success: false, error: "No email ID" });
    }

    // 1. Récupération des métadonnées de base
    const from = emailData.from || "Inconnu";
    const subject = emailData.subject || "Sans objet";
    
    const toArray = Array.isArray(emailData.to) ? emailData.to : [emailData.to || ""];
    const toFormatted = toArray.join(", ");

    // 2. APPEL API : On va chercher le vrai contenu du message chez Resend avec l'ID
    const fullEmail = await resend.emails.get(emailId);
    
    // Extraction du texte ou du HTML récupéré
    const messageContent = fullEmail.data?.text || fullEmail.data?.html || "[Message vide ou impossible à récupérer]";

    // 3. Détermination du préfixe selon le destinataire
    let prefix = "[EMAIL]";
    const toLower = toFormatted.toLowerCase();
    if (toLower.includes("support@echosai.ca")) prefix = "[SUPPORT]";
    if (toLower.includes("contact@echosai.ca")) prefix = "[CONTACT]";

    // 4. Envoi de l'email final épuré avec le VRAI message
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