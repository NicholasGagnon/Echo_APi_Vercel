// app/api/style/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const question      = body.question || body.idea || "";
    const previous_code = body.previous_code || "";
    const round         = body.round || 1;
    const lang          = body.lang || "fr";
    const context        = body.context || "";

    let response: Response;
    try {
      response = await fetch("http://127.0.0.1:5002/api/style/mutate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, previous_code, round, lang, context }),
      });
    } catch (fetchErr: any) {
      // Le serveur Flask n'est probablement pas lancé du tout
      return NextResponse.json(
        { error: "Impossible de joindre /api/style/mutate sur le port 5002. Le serveur Flask est-il bien lancé (python style_agent.py) ?" },
        { status: 502 }
      );
    }

    const rawText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { error: `Le serveur de style a répondu avec une erreur (${response.status}) : ${rawText.slice(0, 300)}` },
        { status: response.status }
      );
    }

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      // Flask a répondu 200 mais avec du contenu non-JSON (ex: une page HTML)
      return NextResponse.json(
        { error: `Réponse Flask non-JSON reçue : ${rawText.slice(0, 300)}` },
        { status: 502 }
      );
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("[API_STYLE_ROUTE_ERROR]:", error);
    return NextResponse.json(
      { error: "Erreur interne côté Next.js : " + error.message },
      { status: 500 }
    );
  }
}