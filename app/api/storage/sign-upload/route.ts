export const runtime = "nodejs";

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  const supabaseServer = await createSupabaseServerClient();
  const { data: { user }, error: userErr } = await supabaseServer.auth.getUser();
  if (userErr || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.filename) return Response.json({ error: "Missing filename" }, { status: 400 });

  const { filename, batchId, fileTag, projectName } = body;

  const ext = safeExt(filename);
  if (!ext) return Response.json({ error: "Only .xlsx/.xlsb/.xls allowed" }, { status: 400 });

  const batch = batchId ? safe(batchId) : "no_batch";
  const tag = fileTag ? safe(fileTag) : "untagged";
  const project = projectName ? safe(projectName) : "sans_nom";

  const bucket = "raw";
  // (optionnel mais recommandé) lie au user
  const path = `uploads/${user.id}/${project}/${batch}/${tag}/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ bucket, path, signedUrl: data.signedUrl, token: data.token });
}
