import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const body = await req.json();

    console.log("INBOUND EMAIL:", body);

    const to = body.to || "";
    const from = body.from || "unknown";
    const subject = body.subject || "No subject";
    const text =
      body.text ||
      body.html ||
      JSON.stringify(body, null, 2);

    let prefix = "[EMAIL]";

    if (to.includes("support@echosai.ca")) {
      prefix = "[SUPPORT]";
    }

    if (to.includes("contact@echosai.ca")) {
      prefix = "[CONTACT]";
    }

    await resend.emails.send({
      from: "support@echosai.ca",
      to: "lafailleestouverte@gmail.com",
      subject: `${prefix} ${subject}`,
      text: `FROM: ${from}\nTO: ${to}\n\n${text}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}