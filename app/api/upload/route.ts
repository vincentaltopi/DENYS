export const runtime = "nodejs"; // plus simple pour débuter

function isExcel(name: string) {
  const lower = name.toLowerCase().replace(/\s+/g, "_");
;
  return lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".xlsb");
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");

  // "file" doit matcher formData.append("file", file) côté front
  if (!file || !(file instanceof File)) {
    return Response.json({ ok: false, error: "No file received (field name must be 'file')" }, { status: 400 });
  }

  if (!isExcel(file.name)) {
    return Response.json({ ok: false, error: "File must be .xlsx or .xls or .xlsb" }, { status: 400 });
  }

  // On lit le fichier en mémoire (pas de sauvegarde disque pour l’instant)
  const buffer = await file.arrayBuffer();

  return Response.json({
    ok: true,
    originalFilename: file.name,
    size: buffer.byteLength,
    type: file.type,
  });
}

// (Optionnel) si quelqu’un ouvre /api/upload dans le navigateur en GET
export function GET() {
  return Response.json({ ok: true, msg: "Use POST to upload a file" });
}
