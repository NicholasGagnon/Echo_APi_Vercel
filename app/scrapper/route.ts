import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "L'URL est requise" }, { status: 400 });
    }

    // On appelle l'API Reader de Jina en lui collant l'URL cible
    const response = await fetch(`https://r.jina.ai/${url}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${process.env.JINA_API_KEY}`,
        "Accept": "text/plain", // On veut du Markdown/texte propre
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur Jina: ${response.statusText}`);
    }

    const data = await response.text();

    // On renvoie le texte propre au frontend
    return NextResponse.json({ text: data });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}