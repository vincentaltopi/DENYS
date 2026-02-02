import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function assertProjectOwner(projectId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id,user_id,status")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false as const, status: 404, error: "Project not found" };
  }
  return { ok: true as const };
}

type Ctx = { params: { id: string } | Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id: projectId } = await Promise.resolve(ctx.params);

  // Auth Supabase (remplace Auth0)
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ownership
  const ownership = await assertProjectOwner(projectId, user.id);
  if (!ownership.ok) {
    return NextResponse.json({ error: ownership.error }, { status: ownership.status });
  }

  // Payload
  const body = await req.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.map((x: any) => String(x)) : [];
  const status = String(body?.status ?? "").trim();

  if (ids.length === 0) {
    return NextResponse.json({ error: "No ids provided" }, { status: 400 });
  }

  const allowed = new Set(["Validée", "A valider", "Non validée"]);
  if (!allowed.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }


  const { error } = await supabaseAdmin
    .from("Results")
    .update({ statut: status }) 
    .eq("project_id", projectId)
    .in("id", ids);


  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updatedIds: ids, status });
}
