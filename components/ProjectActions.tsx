"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProjectActions({
  projectId,
  currentName,
  disabled,
}: {
  projectId: string;
  currentName: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rename() {
    if (disabled) return;

    const next = window.prompt("Nouveau nom du projet", currentName)?.trim();
    if (!next || next === currentName) return;

    try {
      setError(null);
      setBusy(true);

      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `API error ${res.status}`);
      }

      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (disabled) return;

    const ok = window.confirm("Archiver ce projet ?");
    if (!ok) return;

    try {
      setError(null);
      setBusy(true);

      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `API error ${res.status}`);
      }

      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={rename}
        disabled={busy || disabled}
        className="rounded-lg border border-emerald-950/15 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        Renommer
      </button>

      <button
        type="button"
        onClick={archive}
        disabled={busy || disabled}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        Archiver
      </button>

      {error && <span className="ml-2 text-xs text-red-700">{error}</span>}
    </div>
  );
}
