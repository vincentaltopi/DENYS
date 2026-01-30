// app/api/projects/[id]/results/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type Ctx = { params: { id: string } | Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id: projectId } = await Promise.resolve(ctx.params);

  // 1) Auth user (Supabase)
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Ownership check (important: service role bypass RLS)
  const { data: projectRow, error: projErr } = await supabase
    .from("projects")
    .select("id,user_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projErr) {
    return NextResponse.json({ error: projErr.message }, { status: 500 });
  }
  if (!projectRow) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }


  // 3) Read results for this project only
  const { data, error } = await supabase
    .from("Results")
    .select("*")
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ results: data ?? [] });
}
