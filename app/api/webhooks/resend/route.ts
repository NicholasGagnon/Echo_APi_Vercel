import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const body = await req.json();

    console.log("INBOUND EMAIL WEBHOOK:", JSON.stringify(body, null, 2));

    // Retransfère le payload brut immédiatement pour debugging
    await resend.emails.send({
      from: "support@echosai.ca",
      to: "lafailleestouverte@gmail.com",
      subject: "DEBUG RAW PAYLOAD",
      text: JSON.stringify(body, null, 2),
    });

    return NextResponse.json({ success: true });

    // Le webhook Resend envoie { type, created_at, data: { from, to, subject, email_id, ... } }
    const emailData = body.data || {};

    const to = Array.isArray(emailData.to)
      ? emailData.to.join(", ")
      : emailData.to || "";

    const from = emailData.from || "unknown";
    const subject = emailData.subject || "No subject";
    const emailId = emailData.email_id;

    // Le contenu text/html n'est PAS dans le webhook — il faut le fetch via l'API Resend
    let text = "";
    if (emailId) {
      try {
        const fetched = await resend.emails.get(emailId);
        text = (fetched as any).text || (fetched as any).html || "";
      } catch (e) {
        console.warn("Impossible de fetch le contenu de l'email:", e);
        text = `[Contenu non disponible — email_id: ${emailId}]`;
      }
    }

    if (!text) {
      text = JSON.stringify(body, null, 2);
    }

    let prefix = "[EMAIL]";
    if (to.includes("support@echosai.ca")) prefix = "[SUPPORT]";
    if (to.includes("contact@echosai.ca")) prefix = "[CONTACT]";

    await resend.emails.send({
      from: "support@echosai.ca",
      to: "lafailleestouverte@gmail.com",
      subject: `${prefix} ${subject}`,
      text: `FROM: ${from}\nTO: ${to}\n\n${text}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}