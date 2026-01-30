import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

type Ctx = { params: { id: string } | Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id: projectId } = await Promise.resolve(ctx.params);

  // 1) Auth (Supabase)
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Payload
  const body = await req.json().catch(() => null);
  const items = body?.items;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "Invalid payload: expected { items: [...] }" },
      { status: 400 }
    );
  }

  // 3) IDs
  const ids = items
    .map((it: any) => it?.id)
    .filter((x: any) => x !== undefined && x !== null)
    .map((x: any) => String(x));

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Invalid payload: items[].id missing" },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  // ✅ 3bis) plus d’ownership : on vérifie juste que le projet existe
  const { data: projectRow, error: projErr } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();

  if (projErr) {
    return NextResponse.json({ error: projErr.message }, { status: 500 });
  }
  if (!projectRow) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // 4) Source de vérité: on met "processing" en base
  const { error: updErr } = await supabaseAdmin
    .from("Results")
    .update({ reprocess_status: "processing" })
    .eq("project_id", projectId)
    .in("id", ids);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // 5) URL webhook n8n
  const webhookUrl = process.env.N8N_REPROCESS_WEBHOOK_URL;
  if (!webhookUrl) {
    await supabaseAdmin
      .from("Results")
      .update({ reprocess_status: "failed" })
      .eq("project_id", projectId)
      .in("id", ids);

    return NextResponse.json(
      { error: "Missing N8N_REPROCESS_WEBHOOK_URL" },
      { status: 500 }
    );
  }

  // 6) callbackUrl
  const baseUrl =
    process.env.APP_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const callbackUrl = `${baseUrl}/api/projects/${projectId}/reprocess/callback`;

  // 7) Forward vers n8n
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      callbackUrl,
      user: {
        id: user.id,
        email: user.email,
        name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          null,
      },
      items,
    }),
  });

  // 8) Si n8n KO -> failed
  if (!res.ok) {
    const t = await res.text().catch(() => "");

    await supabaseAdmin
      .from("Results")
      .update({ reprocess_status: "failed" })
      .eq("project_id", projectId)
      .in("id", ids);

    return NextResponse.json(
      { error: `n8n error ${res.status}`, details: t },
      { status: 502 }
    );
  }

  const text = await res.text().catch(() => "");
  try {
    return NextResponse.json({ ok: true, n8n: JSON.parse(text), callbackUrl });
  } catch {
    return NextResponse.json({ ok: true, n8n: text, callbackUrl });
  }
}
