// app/api/notifications/badge-upgrade/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const TIER_INFO: Record<string, { emoji: string; label: string; color: string }> = {
  bronze: { emoji: "🥉", label: "Bronze", color: "#cd7f32" },
  argent: { emoji: "🥈", label: "Argent", color: "#c0c0c0" },
  or:     { emoji: "🥇", label: "Or",     color: "#ffd700" },
  vip:    { emoji: "💎", label: "VIP",    color: "#22d3ee" },
};

export async function POST(req: NextRequest) {
  try {
    const { email, pseudo, tier } = await req.json();

    if (!email || !tier || !TIER_INFO[tier]) {
      return NextResponse.json({ error: "Champs manquants ou palier invalide." }, { status: 400 });
    }

    const info = TIER_INFO[tier];

    const { error } = await resend.emails.send({
      from: "Echo AI <noreply@echosai.ca>",
      to: email,
      subject: `${info.emoji} Tu viens d'atteindre le palier ${info.label} sur Talk !`,
      html: `
        <div style="font-family: monospace; background: #09090b; color: #e4e4e7; padding: 32px; border-radius: 12px; max-width: 600px;">
          <div style="border-bottom: 1px solid #27272a; padding-bottom: 16px; margin-bottom: 24px;">
            <p style="color: #06b6d4; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 4px;">
              Echo AI — Talk
            </p>
            <h2 style="color: #f4f4f5; font-size: 18px; margin: 0;">
              ${info.emoji} Palier ${info.label} débloqué
            </h2>
          </div>

          <p style="color: #d4d4d8; font-size: 14px; margin: 0 0 20px;">
            Félicitations${pseudo ? ` @${pseudo}` : ""} — ton implication dans l'écosystème vient d'être reconnue avec le palier
            <strong style="color: ${info.color};">${info.label}</strong>.
          </p>

          <div style="background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 14px; margin-bottom: 24px;">
            <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
              Ce badge apparaît maintenant à côté de ton pseudo partout sur Talk — c'est une trace visible de ta participation réelle, pas juste un score.
            </p>
          </div>

          <a href="https://echosai.ca/1/talk" style="display:inline-block; background:#06b6d4; color:#000; font-weight:bold; font-size:13px; padding:10px 20px; border-radius:8px; text-decoration:none; margin-bottom:24px;">
            Voir sur Talk →
          </a>

          <p style="color: #3f3f46; font-size: 10px; margin-top: 16px; border-top: 1px solid #27272a; padding-top: 16px;">
            Echo AI Ecosystem — echosai.ca
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[BADGE_UPGRADE] Resend error:", error);
      return NextResponse.json({ error: "Échec de l'envoi." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[BADGE_UPGRADE] Crash:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}