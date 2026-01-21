import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

const supabaseAdmin = createClient(
  requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requiredEnv("SUPABASE_SERVICE_ROLE_KEY")
);

export async function POST(req: Request) {
  const token = req.headers.get("x-n8n-token");
  if (!token || token !== process.env.N8N_CALLBACK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  let projectId = body?.projectId ? String(body.projectId) : null;
  let batchId = body?.batchId ? String(body.batchId) : null;
  const executionId = body?.executionId ? String(body.executionId) : null;

  const message =
    body?.message ??
    body?.error?.message ??
    "Erreur inconnue (n8n)";

  // Si pas de projectId/batchId, on essaye via executionId
  if ((!projectId || !batchId) && executionId) {
    const { data } = await supabaseAdmin
      .from("project_events")
      .select("project_id, batch_id")
      .eq("execution_id", executionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      projectId = String(data.project_id);
      batchId = String(data.batch_id);
    }
  }

  if (!projectId || !batchId) {
    return NextResponse.json(
      { error: "Cannot resolve projectId/batchId (provide projectId+batchId or executionId)" },
      { status: 400 }
    );
  }

  await Promise.all([
    supabaseAdmin.from("project_events").insert({
      project_id: projectId,
      batch_id: batchId,
      type: "error",
      message: String(message),
      execution_id: executionId,
    }),
    supabaseAdmin.from("projects").update({ status: "failed" }).eq("id", projectId),
  ]);

  return NextResponse.json({ ok: true });
}
