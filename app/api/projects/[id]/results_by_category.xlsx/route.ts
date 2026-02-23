import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "Achat matériel",
  "Location matériel",
  "Location véhicule",
  "Fret",
  "Energie",
  "Prestation",
  "Assurance",
  "Annexe",
]);

const CATEGORY_FIELD = "catégorie";

async function fetchAllByCategory(projectId: string, category: string) {
  const pageSize = 1000;
  let from = 0;
  const all: any[] = [];

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("Results")
      .select("*")
      .eq("project_id", projectId)
      .eq(CATEGORY_FIELD, category)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);

    const rows = data ?? [];
    all.push(...rows);

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

function filenameSlug(category: string) {
  return category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // enlève les accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const category = req.nextUrl.searchParams.get("category") ?? "";
    if (!ALLOWED.has(category)) {
      return new Response("Catégorie invalide", { status: 400 });
    }

    const rows = await fetchAllByCategory(projectId, category);

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const slug = filenameSlug(category);

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="results-${projectId}-${slug}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return new Response(e?.message ?? "Export error", { status: 500 });
  }
}