export const runtime = "nodejs";

import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  // (optionnel mais recommandé) Auth
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const bucket = String(body?.bucket ?? "raw");
  const path = typeof body?.path === "string" ? body.path : "";

  if (!path) {
    return Response.json({ error: "Missing path" }, { status: 400 });
  }

  // 10 minutes
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 10);

  if (error || !data?.signedUrl) {
    return Response.json({ error: error?.message ?? "Failed to sign download" }, { status: 500 });
  }

  return Response.json({ bucket, path, signedUrl: data.signedUrl });
}
