import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_TABLES = new Set(["Results"]);

async function assertProjectOwner(projectId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id,user_id,status,name")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !data) return { ok: false as const, status: 404, error: "Project not found" };
  if (String(data.user_id) !== String(userId)) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, project: data };
}

type Ctx = { params: Promise<{ id: string }> | { id: string } };

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await Promise.resolve(ctx.params);
  const projectId = id;

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  const ownership = await assertProjectOwner(projectId, userId);
  if (!ownership.ok) return NextResponse.json({ error: ownership.error }, { status: ownership.status });

  const url = new URL(req.url);
  const table = url.searchParams.get("table");

  if (table) {
    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 });
    }

    let q = supabaseAdmin.from(table).select("*").eq("project_id", projectId);

    if (table === "Results") {
      q = q.order("a_verif", { ascending: false }).order("id", { ascending: true });
    } else {
      q = q.order("id", { ascending: true });
    }

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ project: ownership.project, table, rows: data ?? [] });
  }

  const [results] = await Promise.all([
    supabaseAdmin.from("Results").select("*").eq("project_id", projectId).order("id", { ascending: true }),
  ]);

  const firstError = results.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  return NextResponse.json({
    project: ownership.project,
    Results: results.data ?? [],
  });
}
