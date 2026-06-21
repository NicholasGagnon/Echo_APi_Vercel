import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = await req.json();

    const emailData = body.data || {};
    const emailId = emailData.email_id;

    if (!emailId) {
      return NextResponse.json({ success: false, error: "No email ID" });
    }

    const from        = emailData.from    || "Inconnu";
    const subject     = emailData.subject || "Sans objet";
    const toArray     = Array.isArray(emailData.to) ? emailData.to : [emailData.to || ""];
    const toFormatted = toArray.join(", ");

    // 1. Détection dynamique du préfixe et de l'adresse cible
    let prefix = "[EMAIL]";
    let targetEmail = "support@echosai.ca"; // Fallback par défaut si jamais
    
    const toLower = toFormatted.toLowerCase();
    
    if (toLower.includes("support@echosai.ca")) {
      prefix = "[SUPPORT]";
      targetEmail = "support@echosai.ca";
    } else if (toLower.includes("contact@echosai.ca")) {
      prefix = "[CONTACT]";
      targetEmail = "contact@echosai.ca"; // Envoie directement à contact si le mail visait contact
    }

    let messageContent = "[Message vide]";

    // 2. Récupération robuste du contenu (SDK avec fallback HTTP direct)
    try {
      const received = await (resend.emails as any).receiving.get(emailId);
      const emailContent = received?.data || received || {};
      messageContent = emailContent.text || emailContent.html || "[Message vide]";
    } catch (err: any) {
      console.error("receiving.get failed:", err?.message);

      try {
        const res = await fetch(`https://api.resend.com/inbound/emails/${emailId}`, {
          headers: { 
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
          },
        });
        if (res.ok) {
          const result = await res.json();
          const data = result.data || result;
          messageContent = data.text || data.html || "[Message vide]";
        }
      } catch (err2: any) {
        console.error("HTTP fallback failed:", err2?.message);
      }
    }

    // 3. Envoi miroir : targetEmail s'adapte automatiquement
    await resend.emails.send({
      from: "support@echosai.ca",
      to: targetEmail, // Envoie à support@ ou contact@ selon qui a reçu le message
      subject: `${prefix} ${subject}`,
      text: `De: ${from}\nPour: ${toFormatted}\n\nMessage:\n${messageContent}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur Webhook:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}