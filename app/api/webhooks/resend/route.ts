import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("📩 Webhook reçu :", JSON.stringify(body, null, 2));

    const emailData = body.data || {};
    const emailId = emailData.email_id;

    if (!emailId) {
      console.error("❌ Aucun email_id reçu");
      return NextResponse.json(
        { success: false, error: "No email ID" },
        { status: 400 }
      );
    }

    const from = emailData.from || "Inconnu";
    const subject = emailData.subject || "Sans objet";

    const toArray = Array.isArray(emailData.to)
      ? emailData.to
      : [emailData.to || ""];

    const toFormatted = toArray.join(", ");

    let prefix = "[EMAIL]";
    const lowerTo = toFormatted.toLowerCase();

    if (lowerTo.includes("support@echosai.ca")) {
      prefix = "[SUPPORT]";
    }

    if (lowerTo.includes("contact@echosai.ca")) {
      prefix = "[CONTACT]";
    }

    let messageContent = "[Message vide]";

    // ======================================================
    // MÉTHODE SDK
    // ======================================================
    try {
      console.log("🔍 Tentative SDK receiving.get()", emailId);

      const received = await (resend.emails as any).receiving.get(emailId);

      console.log(
        "✅ SDK Response:",
        JSON.stringify(received, null, 2)
      );

      const emailContent = received?.data || received || {};

      messageContent =
        emailContent.text ||
        emailContent.html ||
        "[Message vide via SDK]";
    } catch (sdkError: any) {
      console.error(
        "❌ receiving.get() failed:",
        sdkError?.message
      );

      // ======================================================
      // FALLBACK HTTP
      // ======================================================
      try {
        console.log("🔍 Tentative HTTP fallback");

        const response = await fetch(
          `https://api.resend.com/inbound/emails/${emailId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("HTTP Status:", response.status);

        if (response.ok) {
          const result = await response.json();

          console.log(
            "✅ HTTP Response:",
            JSON.stringify(result, null, 2)
          );

          const data = result.data || result;

          messageContent =
            data.text ||
            data.html ||
            "[Message vide via HTTP]";
        } else {
          const errorText = await response.text();
          console.error("❌ HTTP Error:", errorText);
        }
      } catch (httpError: any) {
        console.error(
          "❌ HTTP fallback failed:",
          httpError?.message
        );
      }
    }

    console.log("📨 Message récupéré :", messageContent);

    const sendResult = await resend.emails.send({
      from: "support@echosai.ca",
      to: ["lafailleestouverte@gmail.com"],
      subject: `${prefix} ${subject}`,
      text: `
De: ${from}
Pour: ${toFormatted}

Message:
${messageContent}
      `,
    });

    console.log(
      "✅ Email retransféré :",
      JSON.stringify(sendResult, null, 2)
    );

    return NextResponse.json({
      success: true,
      emailId,
    });
  } catch (error: any) {
    console.error("🔥 Erreur webhook :", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}