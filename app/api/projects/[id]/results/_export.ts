import * as XLSX from "xlsx";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function buildXlsxResponseByCategory(
  projectId: string,
  category: string,
  filenameSlug: string
) {
  const rows = await fetchAllByCategory(projectId, category);

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Results");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="results-${projectId}-${filenameSlug}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}