import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const projectId = id;

  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(Number(limitRaw ?? "15") || 15, 50);

  const { data, error } = await supabaseAdmin
    .from("project_events")
    .select("project_id,message,created_at,execution_id,type,source_node,source_workflow")
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: (data ?? []).slice().reverse() });
}
