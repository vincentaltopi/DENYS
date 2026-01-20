export const runtime = "nodejs";

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const supabaseServer = await createSupabaseServerClient();
  const { data: { user } } = await supabaseServer.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const bucket = String(body?.bucket ?? "raw");
  const path = typeof body?.path === "string" ? body.path : "";
  if (!path) return Response.json({ error: "Missing path" }, { status: 400 });

  const expiresIn = 60 * 10;
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    return Response.json({ error: error?.message ?? "Failed to sign download" }, { status: 500 });
  }

  return Response.json({ signedDownloadUrl: data.signedUrl, expiresIn });
}
