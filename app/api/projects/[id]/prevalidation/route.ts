import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_TABLES = new Set(["Results"]);

type Ctx = { params: Promise<{ id: string }> | { id: string } };

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await Promise.resolve(ctx.params);
  const projectId = id;

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ plus d’ownership check : on vérifie juste que le projet existe
  const { data: project, error: projectErr } = await supabaseAdmin
    .from("projects")
    .select("id,status,name,user_id") // mets les champs que tu veux renvoyer
    .eq("id", projectId)
    .maybeSingle();

  if (projectErr) return NextResponse.json({ error: projectErr.message }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const url = new URL(req.url);
  const table = url.searchParams.get("table");

  if (table) {
    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 });
    }

      const page = Number(url.searchParams.get("page") ?? "0");
      const pageSize = Math.min(Number(url.searchParams.get("pageSize") ?? "1000"), 5000);

      const from = page * pageSize;
      const to = from + pageSize - 1;

      let q = supabaseAdmin
        .from(table)
        .select("*")
        .eq("project_id", projectId)
        .range(from, to);

      if (table === "Results") {
        q = q.order("a_verif", { ascending: true }).order("id", { ascending: true });
      } else {
        q = q.order("id", { ascending: true });
      }

      const { data, error } = await q;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({ project, table, rows: data ?? [], page, pageSize });

  }

  const { data: results, error: resultsErr } = await supabaseAdmin
    .from("Results")
    .select("*")
    .eq("project_id", projectId)
    .order("a_verif", { ascending: true }).limit(5000);

  if (resultsErr) return NextResponse.json({ error: resultsErr.message }, { status: 500 });

  return NextResponse.json({
    project,
    Results: results ?? [],
  });
}
