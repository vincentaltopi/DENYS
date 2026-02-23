// app/api/projects/[id]/results/achat-materiel.xlsx/route.ts
import { NextRequest } from "next/server";
import { buildXlsxResponseByCategory } from "../_export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  return buildXlsxResponseByCategory(projectId, "Achat matériel", "achat-materiel");
}