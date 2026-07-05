// app/api/world/conversation/route.ts
// Simple proxy vers Flask — toute la logique de cascade est dans site2.py

import { NextRequest, NextResponse } from "next/server";

const FLASK_URL = process.env.FLASK_API_URL || "http://localhost:5000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(`${FLASK_URL}/world/conversation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });

  } catch (e: any) {
    console.error("[WORLD PROXY] Erreur:", e);
    return NextResponse.json({ error: "Erreur de connexion au serveur IA" }, { status: 503 });
  }
}