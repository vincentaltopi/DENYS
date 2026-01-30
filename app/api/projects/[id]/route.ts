import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";



type Ctx = { params: { id: string } | Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { id: projectId } = await Promise.resolve(ctx.params);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: project, error: projectError } = await supabase
  .from("projects")
  .select("id,name,status")
  .eq("id", projectId)
  .maybeSingle();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }


  const body = await req.json().catch(() => null);

  const nameRaw = body?.name;
  const archivedRaw = body?.archived;

  const update: Record<string, any> = {};

  // Renommer
  if (nameRaw !== undefined) {
    const name = String(nameRaw ?? "").trim();
    if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });
    if (name.length > 120) return NextResponse.json({ error: "Name too long" }, { status: 400 });
    update.name = name;
  }

  // Archiver / restaurer
  if (archivedRaw !== undefined) {
    const archived = Boolean(archivedRaw);
    update.archived_at = archived ? new Date().toISOString() : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { error } = await supabase.from("projects").update(update).eq("id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: projectId, ...update });
}

