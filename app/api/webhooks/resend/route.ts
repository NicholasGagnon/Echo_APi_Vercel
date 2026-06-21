import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const body = await req.json();

    const emailId = body?.data?.email_id;

    let fetchedEmail = {};

    if (emailId) {
      try {
        fetchedEmail = await resend.emails.get(emailId);
      } catch (err) {
        fetchedEmail = {
          error: String(err),
        };
      }
    }

    await resend.emails.send({
      from: "support@echosai.ca",
      to: "lafailleestouverte@gmail.com",
      subject: "DEBUG EMAIL GET",
      text: JSON.stringify(fetchedEmail, null, 2),
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