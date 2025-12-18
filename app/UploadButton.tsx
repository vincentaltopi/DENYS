"use client";

import { useState } from "react";

type SignResponse =
  | { bucket: string; path: string; signedUrl: string; token?: string }
  | { error: string };

function safeTag(tag: string) {
  return tag.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "_");
}

export default function UploadButton() {
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [supplierFile, setSupplierFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");

  async function uploadToSupabase(f: File, batchId: string, fileTag: string) {
    const signRes = await fetch("/api/storage/sign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: f.name,
        batchId,
        fileTag,
      }),
    });

    const signed: SignResponse = await signRes
      .json()
      .catch(() => ({ error: "Bad JSON from server" }));

    if (!signRes.ok || "error" in signed) {
      throw new Error(("error" in signed && signed.error) || "sign-upload failed");
    }

    const putRes = await fetch(signed.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": f.type || "application/octet-stream" },
      body: f,
    });

    if (!putRes.ok) {
      const errText = await putRes.text().catch(() => "");
      throw new Error(`Upload to Supabase failed (${putRes.status}) ${errText}`);
    }

    return { bucket: signed.bucket, path: signed.path };
  }

  async function notifyN8n(payload: any) {
    const r = await fetch("/api/n8n/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`n8n notify failed (${r.status}) ${t}`);
    }
  }

  async function handleUpload() {
    if (!projectFile || !supplierFile) {
      setStatus("Sélectionne les 2 fichiers : Projet + Fournisseurs.");
      return;
    }

    const batchId =
      new Date().toISOString().replace(/[:.]/g, "-") +
      "_" +
      crypto.randomUUID().slice(0, 8);

    setStatus("Upload vers Supabase...");

    try {
      const proj = await uploadToSupabase(projectFile, batchId, safeTag("project"));
      setStatus(`Projet stocké: ${proj.bucket}/${proj.path}`);

      const sup = await uploadToSupabase(supplierFile, batchId, safeTag("suppliers"));
      setStatus(`Fournisseurs stocké: ${sup.bucket}/${sup.path}`);

      setStatus("Envoi à n8n...");
      await notifyN8n({
        batchId,
        files: [
          { tag: "project", bucket: proj.bucket, path: proj.path, originalName: projectFile.name },
          { tag: "suppliers", bucket: sup.bucket, path: sup.path, originalName: supplierFile.name },
        ],
      });

      setStatus("Upload terminé + n8n déclenché.");
    } catch (e: any) {
      setStatus(`${e?.message || "Erreur upload"}`);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-emerald-950/10 bg-white/90 p-4 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-emerald-950/80">
          Fichier projet
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept=".xlsx,.xls,.xlsb,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={(e) => setProjectFile(e.target.files?.[0] ?? null)}
            className="block w-full max-w-md rounded-xl border border-emerald-950/15 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-700 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
          />

          {projectFile && (
            <span className="inline-flex items-center rounded-full border border-emerald-700/15 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-950/80">
              {projectFile.name}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-950/10 bg-white/90 p-4 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-emerald-950/80">
          Fichier fournisseurs
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept=".xlsx,.xls,.xlsb,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={(e) => setSupplierFile(e.target.files?.[0] ?? null)}
            className="block w-full max-w-md rounded-xl border border-emerald-950/15 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-700 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
          />

          {supplierFile && (
            <span className="inline-flex items-center rounded-full border border-emerald-700/15 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-950/80">
              {supplierFile.name}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleUpload}
          disabled={!projectFile || !supplierFile}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Uploader
        </button>

        <button
          type="button"
          onClick={() => {
            setProjectFile(null);
            setSupplierFile(null);
            setStatus("");
          }}
          disabled={!projectFile && !supplierFile && !status}
          className="inline-flex items-center justify-center rounded-xl border border-emerald-950/15 bg-white px-4 py-2 text-sm font-semibold text-emerald-950/80 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Réinitialiser
        </button>
      </div>

      {status && (
        <div className="rounded-xl border border-emerald-700/15 bg-emerald-50 p-3 text-sm text-emerald-950/80">
          <div className="font-semibold">Statut</div>
          <div className="mt-1">{status}</div>
        </div>
      )}
    </div>
  );
}
