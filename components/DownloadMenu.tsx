"use client";

import { useEffect, useRef, useState } from "react";

export default function DownloadMenu({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // ✅ Fermeture au clic extérieur + touche Escape
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group inline-flex items-center gap-2 rounded-xl border border-emerald-950/10 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-950/80 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow-md active:translate-y-0"
      >
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm transition group-hover:bg-emerald-700">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3v10" />
            <path d="M8 9l4 4 4-4" />
            <path d="M4 17v3h16v-3" />
          </svg>
        </span>

        <span className="leading-tight text-left">
          Télécharger
          <span className="block text-xs font-medium text-emerald-950/50">
            Excel
          </span>
        </span>

        <svg
          className={`ml-1 h-4 w-4 transition ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.7a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-xl border border-emerald-950/10 bg-white shadow-lg">
          <a
            href={`/api/projects/${projectId}/results_synthese.pdf`}
            download
            className="block px-4 py-3 text-sm text-emerald-950/80 hover:bg-emerald-50"
            onClick={() => setOpen(false)}
          >
            <div className="font-medium">Synthèse</div>
            <div className="text-xs text-emerald-950/50">PDF (page résultats)</div>
          </a>

          <a
            href={`/api/projects/${projectId}/results.xlsx`}
            className="block px-4 py-3 text-sm text-emerald-950/80 hover:bg-emerald-50"
            onClick={() => setOpen(false)}
          >
            <div className="font-medium">Fichier complet</div>
          </a>

          <div className="h-px bg-emerald-950/10" />

          {[
            "Achat matériel",
            "Location matériel",
            "Location véhicule",
            "Fret",
            "Energie",
            "Prestation",
            "Assurance",
            "Annexe",
          ].map((cat) => (
            <a
              key={cat}
              href={`/api/projects/${projectId}/results_by_category.xlsx?category=${encodeURIComponent(
                cat
              )}`}
              className="block px-4 py-3 text-sm text-emerald-950/80 hover:bg-emerald-50"
              onClick={() => setOpen(false)}
            >
              <div className="font-medium">{cat}</div>
              <div className="text-xs text-emerald-950/50">1 fichier Excel</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
