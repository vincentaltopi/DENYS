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

export async function GET(req: Request, ctx: { params: { projectId: string } }) {
  const projectId = ctx.params.projectId;
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "15") || 15, 50);

  const { data, error } = await supabaseAdmin
    .from("project_events")
    .select("id,type,message,created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // UI: on veut souvent afficher du plus ancien -> plus récent
  const events = (data ?? []).slice().reverse();

  return NextResponse.json({ events });
}
