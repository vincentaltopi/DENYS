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


// 3) Read ALL results for this project (pagination Supabase)
  const PAGE_SIZE = 1000;
  let page = 0;
  let all: any[] = [];

  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("Results")
      .select("*")
      .eq("project_id", projectId)
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const chunk = data ?? [];
    all = all.concat(chunk);

    if (chunk.length < PAGE_SIZE) break;
    page += 1;

    // sécurité anti boucle infinie
    if (page > 100) break;
  }
  console.log(all.length)

  return NextResponse.json({ results: all });

}
