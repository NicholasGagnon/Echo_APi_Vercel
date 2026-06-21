import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = await req.json();

    console.log("DEBUG WEBHOOK INBOUND");

    // Envoie l'intégralité de ce que Resend donne à ton serveur
    await resend.emails.send({
      from: "support@echosai.ca",
      to: "lafailleestouverte@gmail.com",
      subject: "DEBUG RAW PAYLOAD",
      text: JSON.stringify(body, null, 2),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}