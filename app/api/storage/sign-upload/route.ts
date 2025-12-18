export const runtime = "nodejs";

import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Nettoie une chaîne pour l'utiliser dans un path Supabase
 */
function safe(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "_");
}

/**
 * Vérifie et extrait l'extension
 */
function safeExt(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".xlsx")) return "xlsx";
  if (lower.endsWith(".xls")) return "xls";
  if (lower.endsWith(".xlsb")) return "xlsb";
  return null;
}

export async function POST(req: Request) {
  // Lire le body
  const body = await req.json().catch(() => null);
  if (!body?.filename) {
    return Response.json({ error: "Missing filename" }, { status: 400 });
  }

  const { filename, batchId, fileTag } = body;

  // Vérifier extension
  const ext = safeExt(filename);
  if (!ext) {
    return Response.json({ error: "Only .xlsx/.xlsb/.xls allowed" }, { status: 400 });
  }

  // Préparer les marqueurs (sécurisés)
  const batch = batchId ? safe(batchId) : "no_batch";
  const tag = fileTag ? safe(fileTag) : "untagged";

  // Construire le path FINAL dans Supabase
  // Exemple :
  // raw/uploads/<batchId>/file_a/<uuid>.xlsx
  const bucket = "raw";
  const path = `uploads/${batch}/${tag}/${crypto.randomUUID()}.${ext}`;

  // Créer l'URL d'upload signée
  const { data, error } = await supabaseServer.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error) {
    console.error("Supabase sign-upload error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  // 6️⃣ Retourner au client
  return Response.json({
    bucket,
    path,
    signedUrl: data.signedUrl,
    token: data.token,
  });
}
