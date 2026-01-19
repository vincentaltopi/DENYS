import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

type Body = {
  ids: (string | number)[];
  status?: string; // optionnel
};

function getSupabaseAdmin() {
  // ✅ serveur: utiliser NEXT_PUBLIC_SUPABASE_URL (pas NEXT_PUBLIC_*)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function timingSafeEqual(a: string, b: string) {
  // évite de throw si longueurs différentes
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

type Ctx = { params: { id: string } | Promise<{ id: string }> };

// Ajuste la whitelist à TES statuts réels
const ALLOWED_STATUSES = new Set(["processing", "done", "failed"]);

export async function POST(req: Request, ctx: Ctx) {
  const { id: projectId } = await Promise.resolve(ctx.params);

  // ✅ Sécurité: secret machine-to-machine (n8n -> ton app)
  const expected = process.env.REPROCESS_CALLBACK_SECRET;
  const provided = req.headers.get("x-reprocess-secret") ?? "";

  if (!expected || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { ids, status }: Body = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Missing ids[]" }, { status: 400 });
    }

    const finalStatus = String(status ?? "done").trim().toLowerCase();

    // ✅ évite d'écrire des valeurs inattendues
    if (!ALLOWED_STATUSES.has(finalStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${Array.from(ALLOWED_STATUSES).join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const stringIds = ids.map((x) => String(x));

    // ⚠️ On met à jour UNIQUEMENT le statut de retraitement
    const { error } = await supabase
      .from("Results")
      .update({ reprocess_status: finalStatus })
      .eq("project_id", projectId)
      .in("id", stringIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      updated: stringIds.length,
      reprocess_status: finalStatus,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
