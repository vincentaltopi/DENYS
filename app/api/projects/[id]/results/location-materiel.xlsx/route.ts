// app/api/projects/[id]/results/location-materiel.xlsx/route.ts
import { NextRequest } from "next/server";
import { buildXlsxResponseByCategory, runtime, dynamic } from "../_export";

export { runtime, dynamic };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  return buildXlsxResponseByCategory(projectId, "Location matériel", "location-materiel");
}