import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function makeBatchId() {
  return (
    new Date().toISOString().replace(/[:.]/g, "-") +
    "_" +
    crypto.randomUUID().slice(0, 8)
  );
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Lire le body envoyé par l'upload
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Missing project name" }, { status: 400 });
  }

  const userId = user.id;
  const batchId = makeBatchId();

  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert([
      {
        user_id: userId,
        batch_id: batchId,
        status: "processing",
        name, 
      },
    ])
    .select("id, batch_id, name")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    projectId: data.id,
    batchId: data.batch_id,
    projectName: data.name,
  });
}
