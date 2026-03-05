import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user || user.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await Promise.resolve(params);
  const body = await req.json().catch(() => ({}));
  const role: "admin" | "user" = body?.role === "admin" ? "admin" : "user";

  // Mettre à jour app_metadata dans auth.users (source de vérité pour les droits)
  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(id, {
    app_metadata: { role },
  });

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Synchroniser la table profiles
  await supabaseAdmin
    .from("profiles")
    .update({ role })
    .eq("user_id", id);

  return NextResponse.json({ success: true, role });
}
