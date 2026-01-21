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
  const { projectId, batchId, message, executionId } = body || {};

  if (!projectId || !batchId || !message) {
    return NextResponse.json(
      { error: "Missing projectId, batchId or message" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from("project_events").insert({
    project_id: String(projectId),
    batch_id: String(batchId),
    type: "progress",
    message: String(message),
    execution_id: executionId ? String(executionId) : null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
