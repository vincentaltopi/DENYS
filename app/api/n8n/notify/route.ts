import { NextResponse } from "next/server";

/**
 * Utilitaire simple pour garantir qu'une variable d'env existe
 */
function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return v;
}

export async function POST(req: Request) {
  let payload: any;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Log de preuve : ce que Next reçoit
  console.log("DEBUG /api/n8n/notify received:", payload);

  const { projectId, batchId, files } = payload || {};

  if (!projectId || !batchId) {
    return NextResponse.json(
      {
        error: "Missing required fields",
        required: ["projectId", "batchId"],
        received: payload,
      },
      { status: 400 }
    );
  }

  const webhookUrl = requiredEnv("N8N_WEBHOOK_URL");
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET; // optionnel

  try {
    // Forward vers n8n
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookSecret ? { "x-webhook-secret": webhookSecret } : {}),
      },
      body: JSON.stringify({
        projectId,
        batchId,
        files,
        source: "nextjs",
        sentAt: new Date().toISOString(),
      }),
      cache: "no-store",
    });

    const text = await res.text().catch(() => "");

    // Logs de preuve côté Next
    console.log("FORWARD TO N8N URL =", webhookUrl);
    console.log("N8N status =", res.status);
    console.log("N8N response =", text);

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "n8n webhook failed",
          status: res.status,
          response: text,
        },
        { status: 502 }
      );
    }

    // Si n8n renvoie du JSON, on le parse, sinon on renvoie le texte brut
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }

    return NextResponse.json({
      ok: true,
      forwarded: true,
      n8n: parsed,
    });
  } catch (err: any) {
    console.error("ERROR calling n8n webhook:", err);

    return NextResponse.json(
      {
        error: "Failed to reach n8n",
        message: err?.message ?? String(err),
      },
      { status: 502 }
    );
  }
}
