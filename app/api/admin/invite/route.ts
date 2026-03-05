import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user || user.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  const role = body?.role === "admin" ? "admin" : "user";

  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  // Envoyer l'invitation
  const { data: invited, error: inviteErr } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email);

  if (inviteErr) {
    return NextResponse.json({ error: inviteErr.message }, { status: 500 });
  }

  const newUserId = invited.user.id;

  // Si rôle admin, mettre à jour app_metadata
  if (role === "admin") {
    await supabaseAdmin.auth.admin.updateUserById(newUserId, {
      app_metadata: { role: "admin" },
    });
  }

  // Upsert dans profiles
  await supabaseAdmin.from("profiles").upsert(
    { user_id: newUserId, email, role },
    { onConflict: "user_id" }
  );

  return NextResponse.json({ success: true });
}
