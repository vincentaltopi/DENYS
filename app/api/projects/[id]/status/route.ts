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
  if (String(data.user_id) !== String(userId)) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }
  return { ok: true as const, project: data };
}

type Ctx = { params: { id: string } | Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { id: projectId } = await Promise.resolve(ctx.params);

  // Auth
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
  const status = String(body?.status ?? "").trim();

  // Tu peux restreindre si tu veux (ici: seulement locked)
  const allowed = new Set(["locked"]);
  if (!allowed.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Idempotent: si déjà locked, on renvoie ok
  const current = String(ownership.project.status ?? "").trim().toLowerCase();
  if (current === "locked") {
    return NextResponse.json({ ok: true, status: "locked", already: true });
  }

  const { error } = await supabaseAdmin
    .from("projects")
    .update({ status: "locked" })
    .eq("id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "locked" });
}
