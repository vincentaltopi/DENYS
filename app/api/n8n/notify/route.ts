export const runtime = "nodejs";

import { supabaseServer } from "@/lib/supabaseServer";

type Incoming =
  | { bucket: string; path: string; originalName?: string; tag?: string }
  | { batchId?: string; files: Array<{ bucket: string; path: string; originalName?: string; tag?: string }> };

export async function POST(req: Request) {
  const body: Incoming | null = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });

  const files =
    "files" in body
      ? body.files
      : "bucket" in body && "path" in body
        ? [{ bucket: body.bucket, path: body.path, originalName: body.originalName, tag: body.tag }]
        : null;

  if (!files || files.length === 0) {
    return Response.json({ error: "Missing files (or bucket/path)" }, { status: 400 });
  }

  // Génère une signed download URL pour chaque fichier (utile pour n8n)
  const filesWithUrls = await Promise.all(
    files.map(async (f) => {
      const { data, error } = await supabaseServer.storage
        .from(f.bucket)
        .createSignedUrl(f.path, 60 * 10); // 10 minutes

      if (error) {
        throw new Error(`SignedUrl failed for ${f.bucket}/${f.path}: ${error.message}`);
      }

      return {
        ...f,
        downloadUrl: data.signedUrl,
      };
    })
  );

  const payloadForN8n = {
    batchId: "files" in body ? body.batchId : undefined,
    files: filesWithUrls,
  };

  const webhookUrl = process.env.N8N_WEBHOOK_URL!;
  const secret = process.env.N8N_WEBHOOK_SECRET!;

  const r = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": secret,
    },
    body: JSON.stringify(payloadForN8n),
  });

  const text = await r.text().catch(() => "");
  if (!r.ok) {
    return Response.json({ error: `n8n error ${r.status}: ${text}` }, { status: 502 });
  }

  return Response.json({ ok: true });
}
