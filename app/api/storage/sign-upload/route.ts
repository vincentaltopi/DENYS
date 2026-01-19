export const runtime = "nodejs";

import { createSupabaseServerClient } from "@/lib/supabaseServer";


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

function slugify(value: string) {
  return value
    .toLowerCase()                      // minuscules
    .normalize("NFD")                   // sépare accents
    .replace(/[\u0300-\u036f]/g, "")    // supprime accents
    .replace(/[^a-z0-9]+/g, "-")        // remplace caractères spéciaux par -
    .replace(/^-+|-+$/g, "");           // trim des -
}


export async function POST(req: Request) {
  try {
    const supabaseServer = await createSupabaseServerClient();
    const { data: { user }, error: userErr } = await supabaseServer.auth.getUser();

    if (userErr || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }


    const body = await req.json().catch(() => null);
    if (!body?.filename) {
      return Response.json({ error: "Missing filename" }, { status: 400 });
    }


  const { filename, batchId, fileTag, projectName } = body;

  // Vérifier extension
  const ext = safeExt(filename);
  if (!ext) {
    return Response.json({ error: "Only .xlsx/.xlsb/.xls allowed" }, { status: 400 });
  }

  // Préparer les marqueurs (sécurisés)
  const batch = batchId ? safe(batchId) : "no_batch";
  const tag = fileTag ? safe(fileTag) : "untagged";
  const project = projectName ? safe(projectName) : "sans_nom";



  // Construire le path FINAL dans Supabase
  // Exemple :
  // raw/uploads/<batchId>/file_a/<uuid>.xlsx
  const bucket = "raw";
  const path = `uploads/${project}/${batch}/${tag}/${crypto.randomUUID()}.${ext}`;

  // Créer l'URL d'upload signée
  const { data, error } = await supabaseServer.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error) {
    console.error("Supabase sign-upload error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Retourner au client
  return Response.json({
    bucket,
    path,
    signedUrl: data.signedUrl,
    token: data.token,
  });
}
catch (e: any) {
    console.error("sign-upload fatal:", e);
    return Response.json(
      { error: "sign-upload fatal", message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
