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

    // 1. On détecte uniquement le préfixe pour savoir d'où ça vient
    let prefix = "[EMAIL]";
    const toLower = toFormatted.toLowerCase();
    
    if (toLower.includes("support@echosai.ca")) {
      prefix = "[SUPPORT]";
    } else if (toLower.includes("contact@echosai.ca")) {
      prefix = "[CONTACT]";
    }

    let messageContent = "[Message vide]";

    // 2. Récupération robuste du contenu (SDK + Fallback HTTP)
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

    // 3. ENVOI SÉCURISÉ : On livre tout à ton Gmail. Le tag [CONTACT] ou [SUPPORT] fait le tri pour toi.
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