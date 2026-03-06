import { NextResponse } from "next/server";
import { sendProjectReadyEmail, sendProjectFailedEmail } from "@/lib/email";

/**
 * Webhook appelé par Supabase Database Webhook lorsque le statut d'un projet change.
 *
 * Payload Supabase :
 * { type: "UPDATE", table: "projects", schema: "public",
 *   record: { id, status, name, created_by_email, ... },
 *   old_record: { id, status, ... } }
 */
export async function POST(req: Request) {
  // Authentification par secret partagé
  const token = req.headers.get("x-webhook-secret");
  if (!token || token !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || body.type !== "UPDATE" || body.table !== "projects") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const record = body.record;
  const oldRecord = body.old_record;

  // Ne rien faire si le statut n'a pas changé
  if (!record || !oldRecord || record.status === oldRecord.status) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const email = record.created_by_email;
  if (!email) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no email" });
  }

  const projectName = record.name ?? "Projet sans nom";
  const projectId = String(record.id);

  if (record.status === "ready") {
    await sendProjectReadyEmail({ to: email, projectName, projectId }).catch((err) =>
      console.error("[webhook] Email send error (ready):", err)
    );
  } else if (record.status === "failed") {
    await sendProjectFailedEmail({
      to: email,
      projectName,
      projectId,
      errorMessage: record.error_message ?? undefined,
    }).catch((err) =>
      console.error("[webhook] Email send error (failed):", err)
    );
  }

  return NextResponse.json({ ok: true, status: record.status });
}
