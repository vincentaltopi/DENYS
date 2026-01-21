"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";

/* ===================== TYPES ===================== */

type InfoLine = {
  label: string;
  value: any;
  right?: any;
};

type ReviewPanelProps = {
  projectId: string;
};

type Row = Record<string, any>;

type ApiResponse = {
  project?: { status?: "processing" | "ready" | "error" | string };
  top30_euros_ia?: Row[];
  top30_emissions_ia?: Row[];
  Results?: Row[]; // table des statuts de vérif/retraitement
};

type ResultsResponse = {
  project?: { status?: string };
  table?: string;
  rows?: Row[];
};

type TableKey = "results";

type SelectionCommand = { token: number; type: "all" | "none" };

const ACTIVITY_CATEGORIES = [
  "Achat matériel",
  "Location matériel",
  "Location véhicule",
  "Fret",
  "Prestation",
  "Assurance",
  "Energie",
  "Annexe",
] as const;

type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

/* ===================== COLUMNS (CENTRALISÉ) ===================== */

const DISPLAY_ORDER = [
  "catégorie",
  "activité",
  "fournisseur",
  "prix_total(euro)",
  "nombre_activité",
  "unité_activité",
  "émission_totale",
  "unité_émission_totale",
  "commentaire",
  "score_émission",
  "unité_post",
  "nom_base",
  "code_catégorie",
  "tag",
  "nom_attribut",
  "nom_frontière",
  "commentaire_base",
] as const;

const HIDDEN_COLUMNS = [
  "id",
  "a_verif",
  "associated_q",
  "Bon_commande",
  "final_value_q",
  "prix_unitaire_activité",
  "statut_verif",
  "project_id",
  "score certitude",
] as const;

function buildColumns(rows: Row[]): string[] {
  const keys = new Set<string>();

  (rows ?? []).forEach((row) => Object.keys(row || {}).forEach((k) => keys.add(k)));

  // Colonnes "virtuelles" toujours présentes
  keys.add("statut");
  keys.add("reprocess_status");

  // Supprime les colonnes cachées
  HIDDEN_COLUMNS.forEach((k) => keys.delete(k));

  // Ordonne
  const ordered: string[] = [];

  if (keys.has("statut")) {
    ordered.push("statut");
    keys.delete("statut");
  }
  if (keys.has("reprocess_status")) {
    ordered.push("reprocess_status");
    keys.delete("reprocess_status");
  }

  for (const k of DISPLAY_ORDER) {
    if (keys.has(k)) {
      ordered.push(k);
      keys.delete(k);
    }
  }

  const rest = Array.from(keys).sort((a, b) => a.localeCompare(b, "fr"));
  return [...ordered, ...rest];
}

/* ===================== RETRAITEMENT LABELS ===================== */

function mapRetraitementStatus(raw: any): {
  label: string;
  tone: "empty" | "running" | "done" | "failed";
  spinning: boolean;
} {
  const v = String(raw ?? "").trim();
  if (!v) return { label: "—", tone: "empty", spinning: false };

  const low = v.toLowerCase();

  if (low === "done") return { label: "Retraitement effectué", tone: "done", spinning: false };
  if (low === "failed") return { label: "Retraitement échoué", tone: "failed", spinning: false };
  if (low === "processing") return { label: "Retraitement…", tone: "running", spinning: true };

  // fallback: si tu as d'autres statuts serveurs
  return { label: v, tone: "running", spinning: false };
}

function stripDiacritics(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/* ===================== MAIN ===================== */

export default function ReviewPanel({ projectId }: ReviewPanelProps) {
  const [showResults, setShowResults] = useState(false);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [resultsRows, setResultsRows] = useState<Row[]>([]);

  // ----- sélection (checkbox)
  const [selectedByTable, setSelectedByTable] = useState<Record<TableKey, string[]>>({
    results: [],
  });

  const [selectionCmd, setSelectionCmd] = useState<SelectionCommand | null>(null);

  type ProjectEvent = {
    id: number;
    type: "progress" | "error" | "info" | "done" | string;
    message: string;
    created_at: string;
  };

  const [events, setEvents] = useState<ProjectEvent[]>([]);


  useEffect(() => {
  if (data?.project?.status === "ready") {
    setShowResults(true);
  }
}, [data?.project?.status]);


  const onSelectionChange = useCallback((tableKey: TableKey, ids: string[]) => {
    setSelectedByTable((p) => ({ ...p, [tableKey]: ids }));
  }, []);

  const selectedResults = selectedByTable.results ?? [];

  const verif: Row[] = data?.Results ?? [];

  // map : id -> reprocess_status (source de vérité)
  const retraitementById = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of verif) {
      const id = String(r?.id ?? "");
      if (!id) continue;
      m.set(id, String(r?.reprocess_status ?? "").trim());
    }
    return m;
  }, [verif]);

  /* ===================== RETRAITEMENT (UNITAIRE) ===================== */

  const [retryModalOpen, setRetryModalOpen] = useState(false);
  const [retryDraft, setRetryDraft] = useState<{ rowId: string; row: Row } | null>(null);
  const [retryHint, setRetryHint] = useState("");
  const [retryCategory, setRetryCategory] = useState<ActivityCategory>("Annexe");
  const [forcePollUntil, setForcePollUntil] = useState<number>(0);

  const [sendingRowId, setSendingRowId] = useState<string | null>(null);
  const [trackedProcessing, setTrackedProcessing] = useState<Record<string, true>>({});

  const sendSingleToN8n = useCallback(
    async (rowId: string, category: ActivityCategory, userHint: string) => {
      try {
        setSendingRowId(rowId);
        setTrackedProcessing((prev) => ({ ...prev, [String(rowId)]: true }));

        // Optimistic UI: passe la ligne en "processing"
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            Results: (prev.Results ?? []).map((r: Row) =>
              String(r.id) === String(rowId) ? { ...r, reprocess_status: "processing" } : r
            ),
          };
        });

        setResultsRows((prev) =>
          (prev ?? []).map((r) => (String(r.id) === String(rowId) ? { ...r, reprocess_status: "processing" } : r))
        );


        const payload = {
          items: [
            {
              id: rowId,
              catégorie: category,
              texte: userHint.trim(),
            },
          ],
        };

        const res = await fetch(`/api/projects/${projectId}/reprocess`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const t = await res.text().catch(() => "");

          // UI fallback si l'API ne met pas failed côté DB
          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              Results: (prev.Results ?? []).map((r: Row) =>
                String(r.id) === String(rowId) ? { ...r, reprocess_status: "failed" } : r
              ),
            };
          });

          setResultsRows((prev) =>
            (prev ?? []).map((r) => (String(r.id) === String(rowId) ? { ...r, reprocess_status: "failed" } : r))
          );


          throw new Error(`API error ${res.status} ${t}`);
        }

        alert("Ligne envoyée à n8n.");
      } catch (e: any) {
        alert(e?.message ?? "Erreur lors de l'envoi à n8n");
      } finally {
        setSendingRowId(null);
      }
    },
    [projectId]
  );

  const openRetryModal = useCallback((rowId: string, row: Row) => {
    setRetryDraft({ rowId, row });
    setRetryHint("");

    const existing = String(row?.["catégorie"] ?? row?.["Catégorie"] ?? "");
    const match = ACTIVITY_CATEGORIES.find((c) => c === existing);
    setRetryCategory(match ?? "Annexe");

    setRetryModalOpen(true);
  }, []);

  const closeRetryModal = useCallback(() => {
    setRetryModalOpen(false);
    setRetryDraft(null);
    setRetryHint("");
    setRetryCategory("Annexe");
  }, []);

  /* ===================== TRI + FILTRES ===================== */

  type SortKey = "none" | "prix_total_euro" | "emission_totale";
  type SortDir = "asc" | "desc";

  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "none",
    dir: "desc",
  });

  const [filterStatut, setFilterStatut] = useState<string>("all");
  const [filterCategorie, setFilterCategorie] = useState<string>("all");

  const getCategorie = useCallback((row: Row) => {
    return String(row?.["catégorie"] ?? row?.["Catégorie"] ?? "").trim();
  }, []);

  const getStatutLabel = useCallback((row: Row) => {
    const needsCheck = !!row?.a_verif;
    return needsCheck ? String(row?.statut_verif ?? row?.statut ?? "Non validée") : "Validée";
  }, []);

  const parseMaybeNumber = useCallback((v: any): number | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === "number" && Number.isFinite(v)) return v;

    const s = String(v)
      .replace(/\s/g, "")
      .replace(/€/g, "")
      .replace(/,/g, ".")
      .replace(/[^0-9.\-]/g, "");

    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }, []);

  const getPrixTotalEuro = useCallback(
    (row: Row) => {
      const raw =
        row?.["prix_total(euro)"]
      return parseMaybeNumber(raw);
    },
    [parseMaybeNumber]
  );

  const getEmissionTotale = useCallback(
    (row: Row) => {
      const raw =
        row?.["émission_totale"]
      return parseMaybeNumber(raw);
    },
    [parseMaybeNumber]
  );

  const getStatutNormalized = (row: Row): "Validée" | "À valider" => {
    const needsCheck = !!row?.a_verif;
    if (!needsCheck) return "Validée";

      const s = String(row?.statut_verif ?? "").toLowerCase();
      return s === "validée" ? "Validée" : "À valider";
    };


  const columnToSortKey = useCallback((col: string): SortKey => {
    const k = String(col ?? "").trim().toLowerCase();
    const kn = stripDiacritics(k);

    if (k.includes("prix_total") || k.includes("prix total") || (k.includes("prix") && k.includes("euro"))) {
      return "prix_total_euro";
    }

    if (
      kn.includes("emission_totale") ||
      kn.includes("emissions_totales") ||
      (kn.includes("emission") && kn.includes("totale"))
    ) {
      return "emission_totale";
    }

    return "none";
  }, []);

  const onHeaderSortClick = useCallback(
    (col: string) => {
      const key = columnToSortKey(col);
      if (key === "none") return;

      setSort((prev) => {
        if (prev.key !== key) return { key, dir: "desc" };
        return { key, dir: prev.dir === "desc" ? "asc" : "desc" };
      });
    },
    [columnToSortKey]
  );

  const sortedResults = useMemo(() => {
    const base = [...(resultsRows ?? [])];

    const filtered = base.filter((row) => {
      const cat = getCategorie(row);
      const statut = getStatutLabel(row);

      const okCat = filterCategorie === "all" ? true : cat === filterCategorie;
      const okStatut =
        filterStatut === "all"
          ? true
          : statut.trim().toLowerCase() === filterStatut.trim().toLowerCase();

      return okCat && okStatut;
    });

    const dirFactor = sort.dir === "asc" ? 1 : -1;

    return filtered
      .map((row, idx) => ({ row, idx }))
      .sort((a, b) => {
        // 1) a_verif en premier
        const av = !!a.row?.a_verif;
        const bv = !!b.row?.a_verif;
        if (av !== bv) return av ? -1 : 1;

        // 2) tri utilisateur
        if (sort.key !== "none") {
          const aVal = sort.key === "prix_total_euro" ? getPrixTotalEuro(a.row) : getEmissionTotale(a.row);
          const bVal = sort.key === "prix_total_euro" ? getPrixTotalEuro(b.row) : getEmissionTotale(b.row);

          const aNull = aVal === null;
          const bNull = bVal === null;
          if (aNull !== bNull) return aNull ? 1 : -1;

          if (aVal !== null && bVal !== null && aVal !== bVal) {
            return (aVal - bVal) * dirFactor;
          }
        }

        // 3) stable
        return a.idx - b.idx;
      })
      .map((x) => x.row);
  }, [
    resultsRows,
    filterCategorie,
    filterStatut,
    sort.key,
    sort.dir,
    getCategorie,
    getStatutLabel,
    getPrixTotalEuro,
    getEmissionTotale,
  ]);

  const availableStatuts = useMemo(() => {
    const s = new Set<string>();
    (resultsRows ?? []).forEach((r) => {
      const v = getStatutLabel(r);
      if (v) s.add(v);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "fr"));
  }, [resultsRows, getStatutLabel]);

  const allVerified = useMemo(() => {
    const needCheck = sortedResults.filter((r) => !!r?.a_verif);
    if (needCheck.length === 0) return true;
    return needCheck.every((r) => {
      const s = String(r?.statut_verif ?? r?.statut ?? "Non validée").toLowerCase();
      return s === "validée";
    });
  }, [sortedResults]);

  // Colonnes stables (basées sur resultsRows, pas sur les rows filtrées)
  const resultsColumns = useMemo(() => buildColumns(resultsRows), [resultsRows]);

  /* ---------- bulk status (uniquement lignes a_verif) ---------- */
  const setVerifStatus = async (ids: string[], status: "Validée" | "Non validée") => {
    await fetch(`/api/projects/${projectId}/lignes-verif/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, status }),
    });

    setResultsRows((prev) =>
      (prev ?? []).map((r: Row) => (ids.includes(String(r.id)) ? { ...r, statut_verif: status } : r))
    );

    setSelectedByTable((p) => ({ ...p, results: [] }));
  };

  const toggleRetryRowVerif = useCallback(async () => {
    if (!retryDraft) return;

    const needsCheck = !!retryDraft.row?.a_verif;
    if (!needsCheck) return; // ligne "fixe"

    const current = String(retryDraft.row?.statut_verif ?? "").trim().toLowerCase();
    const isValidated = current === "validée";

    await setVerifStatus([retryDraft.rowId], isValidated ? "Non validée" : "Validée");
    closeRetryModal();
  }, [retryDraft, closeRetryModal]);


  /* ---------- poll ---------- */
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!projectId) return;

    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const [resPreval, resResults, resEvents] = await Promise.all([
          fetch(`/api/projects/${projectId}/prevalidation`, { cache: "no-store" }),
          fetch(`/api/projects/${projectId}/prevalidation?table=Results`, { cache: "no-store" }),
          fetch(`/api/projects/${projectId}/events?limit=15`, { cache: "no-store" }),
        ]);

        const json: ApiResponse = await resPreval.json();
        const jsonResults: ResultsResponse = await resResults.json();
        const jsonEvents = await resEvents.json().catch(() => null);
        setEvents(Array.isArray(jsonEvents?.events) ? jsonEvents.events : []);


        if (cancelled) return;

        setData(json);
        setResultsRows(jsonResults.rows ?? []);

        setTrackedProcessing((prev) => {
          const ids = Object.keys(prev);
          if (ids.length === 0) return prev;

          const next = { ...prev };

          for (const id of ids) {
            const status = String(
              (json.Results ?? []).find((r: any) => String(r?.id) === String(id))?.reprocess_status ?? ""
            )
              .trim()
              .toLowerCase();

            // Si on a un statut et qu'il n'est plus processing => on arrête de suivre
            if (status && status !== "processing") {
              delete next[id];
            }
          }

          return next;
        });

        const hasRunning = (json.Results ?? []).some((r: any) => {
          const s = String(r?.reprocess_status ?? "").trim().toLowerCase();
          return s === "processing";
        });

        if (!showResults) {
          if (json.project?.status !== "ready") {
            pollTimerRef.current = setTimeout(poll, 2000);
          }
          return;
        }

        // En Results: on continue tant que du retraitement tourne
        const shouldKeepPolling = hasRunning || Object.keys(trackedProcessing).length > 0;

        if (shouldKeepPolling) {
          pollTimerRef.current = setTimeout(poll, 2000);
        }
      } catch {
        if (!cancelled) pollTimerRef.current = setTimeout(poll, 3000);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [projectId, showResults, trackedProcessing]);

  return (
    <div className="space-y-4">
    {data?.project?.status !== "ready" ? (
      <div className="rounded-xl border bg-white p-3">
        <div className="mb-2 text-sm font-medium text-emerald-950/80">
          Traitement en cours…
        </div>

        <div className="max-h-40 overflow-y-auto rounded-lg border border-emerald-950/10 bg-emerald-50/30 p-2 text-xs">
          {events.length === 0 ? (
            <div className="text-emerald-950/60">En attente des premiers messages…</div>
          ) : (
            <div className="space-y-1">
              {events.map((e) => (
                <div key={e.id} className="flex gap-2">
                  <div className="w-[70px] shrink-0 font-mono text-emerald-950/50">
                    {new Date(e.created_at).toLocaleTimeString("fr-FR")}
                  </div>
                  <div className={String(e.type).toLowerCase() === "error" ? "text-rose-700" : "text-emerald-950/80"}>
                    {e.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    ) : null}


      {showResults && (
        <>
          {/* CONTROLES (FILTRES UNIQUEMENT) */}
          <div className="rounded-xl border bg-white p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[160px]">
                <label className="block text-[11px] font-normal text-emerald-950/70">Filtrer: Statut</label>
                <select
                  value={filterStatut}
                  onChange={(e) => setFilterStatut(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-emerald-950/15 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-600/20"
                >
                  <option value="all">Tous</option>
                  {availableStatuts.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-[220px]">
                <label className="block text-[11px] font-normal text-emerald-950/70">Filtrer: catégorie</label>
                <select
                  value={filterCategorie}
                  onChange={(e) => setFilterCategorie(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-emerald-950/15 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-600/20"
                >
                  <option value="all">Toutes</option>
                  {ACTIVITY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFilterStatut("all");
                  setFilterCategorie("all");
                }}
                className="rounded-xl border border-emerald-950/15 bg-white px-3 py-2 text-xs font-normal text-slate-600 hover:bg-emerald-50"
                title="Réinitialiser les filtres"
              >
                Réinitialiser les filtres
              </button>
            </div>
          </div>

          {/* RESULTS */}
          <Section
            tableKey="results"
            title={`Results (${sortedResults.length})`}
            rows={sortedResults}
            columns={resultsColumns}
            sortKey={sort.key}
            sortDir={sort.dir}
            onHeaderSortClick={onHeaderSortClick}
            enableSelection
            enableRetry
            onRetry={openRetryModal}
            onSelectionChange={onSelectionChange}
            selectionCommand={selectionCmd}
            collapsible={false}
            retraitementById={retraitementById}
            footer={
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setSelectionCmd({ type: "all", token: Date.now() })}
                    className="rounded-lg border px-2 py-1 text-[11px]"
                  >
                    Tout sélectionner
                  </button>
                  <button
                    onClick={() => setSelectionCmd({ type: "none", token: Date.now() })}
                    className="rounded-lg border px-2 py-1 text-[11px]"
                  >
                    Tout désélectionner
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">

                  <button
                    disabled={!selectedResults.length}
                    onClick={() => setVerifStatus(selectedResults, "Validée")}
                    className="rounded-lg bg-emerald-800 px-2 py-1 text-[11px] text-white"
                  >
                    Marquer Validée
                  </button>
                </div>
              </div>
            }
          />

          {/* CTA final */}
          <div className="sticky bottom-0 mt-4 flex flex-wrap items-center justify-end gap-2 bg-white/70 pt-3 backdrop-blur">
            <Link
              href={`/projects/${projectId}/results`}
              className={[
                "rounded-xl px-3 py-2 text-sm font-medium shadow-sm transition",
                allVerified
                  ? "bg-emerald-800 text-white hover:bg-emerald-900"
                  : "bg-emerald-800/40 text-white/70 pointer-events-none cursor-not-allowed",
              ].join(" ")}
              aria-disabled={!allVerified}
              title={allVerified ? "Voir les résultats finaux" : "Valide toutes les lignes à vérifier pour continuer"}
            >
              Voir les résultats finaux
            </Link>
          </div>

          {/* MODALE RETRAITEMENT */}
          {retryModalOpen && retryDraft && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/30" onClick={closeRetryModal} />

              <div className="relative w-full max-w-lg rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-xl">
              <button
                type="button"
                onClick={closeRetryModal}
                className="absolute right-3 top-3 rounded-lg p-1 text-emerald-950/60 hover:bg-emerald-100 hover:text-emerald-950"
                aria-label="Fermer"
              >
                ✕
              </button>

                <div className="mb-2 text-sm font-medium text-emerald-950/80">{retryDraft.row?.["activité"]}</div>



                <div className="mb-3 rounded-xl border border-emerald-950/10 bg-emerald-50 p-3">
                  <div className="space-y-1 text-xs text-emerald-950/75">
                    {(
                      [ 
                        { label: "Statut", value: getStatutNormalized(retryDraft.row)},
                        { label: "Catégorie", value: retryDraft.row?.["catégorie"]},
                        {
                          label: "Prix (euros)",
                          value: retryDraft.row?.["prix_total(euro)"]?.toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }),
                        }
                        ,

                        {
                          label: "FE",
                          value:
                            retryDraft.row?.["score_émission"],
                          right:
                            retryDraft.row?.["unité_post"]
                        },

                        {
                          label: "Nom du FE",
                          value: retryDraft.row?.["nom_base"]
                        },

                        {
                          label: "Emission",
                          value:
                            retryDraft.row?.["émission_totale"],
                          right:
                              retryDraft.row?.["unité_émission_totale"]
                        },
                      ] as InfoLine[]
                    ).map((it) => (
                      <div key={it.label} className="grid grid-cols-[140px_1fr] gap-2">
                        <div className="font-normal text-emerald-950/70">{it.label}</div>

                        <div className="flex items-center gap-2">
                          <div className="font-normal text-emerald-950/70">{formatCell(it.value)}</div>

                          {it.right !== undefined && it.right !== null && (
                            <div className="font-normal text-emerald-950/70">
                              {formatCell(it.right)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <label className="block text-xs font-normal text-slate-600">Modifier la catégorie</label>
                <select
                  value={retryCategory}
                  onChange={(e) => setRetryCategory(e.target.value as ActivityCategory)}
                  className="mt-1 w-full rounded-xl border border-emerald-950/15 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-600/20"
                >
                  {ACTIVITY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <label className="mt-4 block text-xs font-normal text-slate-600">
                  Informations pour affiner le calcul d'impact
                </label>
                <textarea
                  value={retryHint}
                  onChange={(e) => setRetryHint(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-emerald-950/15 p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-600/20"
                  placeholder="Ex: Préciser le matériau… / Prendre en compte que …"
                />

                <div className="mt-4 flex items-center justify-end gap-2">

                  {(() => {
                const needsCheck = !!retryDraft.row?.a_verif;
                const current = String(retryDraft.row?.statut_verif ?? retryDraft.row?.statut ?? "").trim().toLowerCase();
                const isValidated = current === "validée";

                const label = !needsCheck ? "Validée" : isValidated ? "Remettre à valider" : "Valider l'activité";



                return (
                  <button
                    type="button"
                    disabled={!needsCheck}
                    onClick={toggleRetryRowVerif}
                    className={[
                      "rounded-xl px-4 py-2 text-sm font-medium",
                      !needsCheck
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                        : isValidated
                        ? "bg-amber-600 text-white hover:bg-amber-700"
                        : "bg-emerald-700 text-white hover:bg-emerald-800",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                );
              })()}


                  <button
                    type="button"
                    disabled={sendingRowId === retryDraft.rowId}
                    onClick={async () => {
                      if (!retryDraft) return;
                      await sendSingleToN8n(retryDraft.rowId, retryCategory, retryHint);
                      closeRetryModal();
                    }}
                    className={[
                      "rounded-xl px-4 py-2 text-sm font-medium",
                      sendingRowId === retryDraft.rowId
                        ? "bg-emerald-300 text-emerald-700 cursor-not-allowed"
                        : "bg-emerald-700 text-white hover:bg-emerald-800",
                    ].join(" ")}
                  >
                    {sendingRowId === retryDraft.rowId ? "Envoi…" : "Relancer le calcul d'impact"}
                  </button>

                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ===================== SECTION ===================== */

function Section({
  tableKey,
  title,
  rows,
  columns,
  sortKey,
  sortDir,
  onHeaderSortClick,
  enableSelection = false,
  enableRetry = false,
  retraitementById,
  onRetry,
  onSelectionChange,
  selectionCommand,
  footer,
  collapsible = false,
  defaultOpen = true,
}: {
  tableKey: TableKey;
  title: string;
  rows: Row[];
  columns?: string[];
  sortKey?: "none" | "prix_total_euro" | "emission_totale";
  sortDir?: "asc" | "desc";
  onHeaderSortClick?: (col: string) => void;
  enableSelection?: boolean;
  enableRetry?: boolean;
  retraitementById?: Map<string, string>;
  onRetry?: (rowId: string, row: Row) => void;
  onSelectionChange?: (tableKey: TableKey, ids: string[]) => void;
  selectionCommand?: SelectionCommand | null;
  footer?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState<boolean>(collapsible ? !!defaultOpen : true);

  useEffect(() => {
    if (!collapsible) setOpen(true);
  }, [collapsible]);

  const innerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    if (!collapsible) return;
    const el = innerRef.current;
    if (!el) return;

    const update = () => setHeight(el.scrollHeight || 0);
    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, [collapsible, rows.length]);

  return (
    <div className="rounded-xl border bg-white p-3">
      <button
        type="button"
        onClick={() => collapsible && setOpen((v) => !v)}
        className={[
          "mb-2 flex w-full items-center justify-between gap-3",
          collapsible ? "cursor-pointer select-none" : "cursor-default",
        ].join(" ")}
        aria-expanded={open}
      >
        <div className="font-medium text-slate-800">{title}</div>

        {collapsible && (
          <span
            className={[
              "inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-emerald-900/60 transition-transform",
              open ? "rotate-180" : "rotate-0",
            ].join(" ")}
            aria-hidden="true"
          >
            ▾
          </span>
        )}
      </button>

      {!collapsible ? (
        <>
          <DataTable
            tableKey={tableKey}
            rows={rows}
            columns={columns}
            sortKey={sortKey}
            sortDir={sortDir}
            onHeaderSortClick={onHeaderSortClick}
            enableSelection={enableSelection}
            enableRetry={enableRetry}
            onRetry={onRetry}
            onSelectionChange={onSelectionChange}
            selectionCommand={selectionCommand}
            retraitementById={retraitementById}
          />
          {footer && <div className="mt-2">{footer}</div>}
        </>
      ) : (
        <div
          className="overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
          style={{ maxHeight: open ? height : 0, opacity: open ? 1 : 0 }}
        >
          <div ref={innerRef} className="pt-1">
            <DataTable
              tableKey={tableKey}
              rows={rows}
              columns={columns}
              sortKey={sortKey}
              sortDir={sortDir}
              onHeaderSortClick={onHeaderSortClick}
              enableSelection={enableSelection}
              enableRetry={enableRetry}
              onRetry={onRetry}
              onSelectionChange={onSelectionChange}
              selectionCommand={selectionCommand}
              retraitementById={retraitementById}
            />
            {footer && <div className="mt-2">{footer}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== DATATABLE ===================== */

function DataTable({
  tableKey,
  rows,
  columns,
  sortKey,
  sortDir,
  onHeaderSortClick,
  enableSelection,
  enableRetry,
  onRetry,
  onSelectionChange,
  selectionCommand,
  retraitementById,
}: {
  tableKey: TableKey;
  rows: Row[];
  columns?: string[];
  sortKey?: "none" | "prix_total_euro" | "emission_totale";
  sortDir?: "asc" | "desc";
  onHeaderSortClick?: (col: string) => void;
  enableSelection: boolean;
  enableRetry: boolean;
  onRetry?: (rowId: string, row: Row) => void;
  onSelectionChange?: (tableKey: TableKey, ids: string[]) => void;
  selectionCommand?: SelectionCommand | null;
  retraitementById?: Map<string, string>;
}) {
  const getRowId = (row: Row) => String(row?.id);

  // ✅ fallback local si on ne passe pas "columns"
  const computedColumns = useMemo(() => buildColumns(rows), [rows]);
  const columnsToUse = columns && columns.length ? columns : computedColumns;

  const COLUMN_LABELS: Record<string, string> = {
    statut: "Statut",
    reprocess_status: "Statut retraitement",
    activité: "Activité",
    catégorie: "Catégorie",
    fournisseur: "Fournisseur",
    "prix_total(euro)": "Prix total (€)",
    nombre_activité: "Nombre activité",
    unité_activité: "Unité activité",
    émission_totale: "Émissions totales",
    unité_émission_totale: "Unité émission totales",
    commentaire: "Commentaire",
    score_émission: "FE",
    unité_post: "Unité FE",
    nom_base: "Nom_base",
    code_catégorie: "Code catégorie",
    tag: "Tag",
    nom_attribut: "Nom attribut",
    nom_frontière: "Nom frontière",
    commentaire_base: "Commentaire base",
  };

  const rowIds = useMemo(() => rows.map((r: Row) => getRowId(r)), [rows]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sortKeyForColumn = useCallback(
    (col: string): "prix_total_euro" | "emission_totale" | "none" => {
      const k = String(col ?? "").trim().toLowerCase();
      const kn = stripDiacritics(k);

      if (k.includes("prix_total") || k.includes("prix total") || (k.includes("prix") && k.includes("euro"))) {
        return "prix_total_euro";
      }

      if (
        kn.includes("emission_totale") ||
        kn.includes("emissions_totales") ||
        (kn.includes("emission") && kn.includes("totale"))
      ) {
        return "emission_totale";
      }

      return "none";
    },
    []
  );

  useEffect(() => {
    if (!selectionCommand) return;

    if (selectionCommand.type === "all") setSelected(new Set(rowIds));
    if (selectionCommand.type === "none") setSelected(new Set());
  }, [selectionCommand?.token, selectionCommand, rowIds]);

  useEffect(() => {
    onSelectionChange?.(tableKey, Array.from(selected).filter(Boolean));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, tableKey]);

  const toggle = (id: string) =>
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <div className="w-full max-h-[70vh] overflow-x-auto overflow-y-auto rounded-lg border border-emerald-950/10">
      <div className="min-w-max">
        <table className="w-full text-xs font-normal text-slate-700 border-collapse">
          <thead className="sticky top-0 bg-emerald-50">
            <tr>
              {enableSelection && <th className="w-10 px-2 py-2 text-left" />}
              {enableRetry && <th className="w-10 px-2 py-2 text-left" />}

              {columnsToUse.map((c) => (
                <th key={c} className="px-2 py-2 text-left text-xs font-normal text-slate-600 whitespace-nowrap">
                  {(() => {
                    const label = COLUMN_LABELS[c] ?? c;

                    const k = sortKeyForColumn(c);
                    const isSortable = k !== "none" && !!onHeaderSortClick;
                    const active = isSortable && sortKey === k;
                    const arrow = active ? (sortDir === "desc" ? "▼" : "▲") : "↕";

                    if (!isSortable) return label;

                    return (
                      <button
                        type="button"
                        onClick={() => onHeaderSortClick?.(c)}
                        className={[
                          "inline-flex items-center gap-2 rounded-lg px-2 py-1 transition",
                          "border",
                          active
                            ? "border-emerald-600/30 bg-emerald-100 text-emerald-800 shadow-sm"
                            : "border-transparent hover:border-emerald-950/10 hover:bg-emerald-100/50",
                        ].join(" ")}
                        title={
                          active
                            ? `Tri: ${sortDir === "desc" ? "décroissant" : "croissant"}`
                            : "Trier (1er clic: décroissant, 2e: croissant)"
                        }
                      >
                        <span className={active ? "underline decoration-emerald-700/40 underline-offset-4" : ""}>
                          {label}
                        </span>
                        <span className={active ? "opacity-100" : "opacity-40"}>{arrow}</span>
                        {active && (
                          <span className="ml-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-emerald-900/80">
                            {sortDir === "desc" ? "DESC" : "ASC"}
                          </span>
                        )}
                      </button>
                    );
                  })()}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={(enableSelection ? 1 : 0) + (enableRetry ? 1 : 0) + columnsToUse.length}
                  className="px-3 py-6 text-center text-emerald-950/60"
                >
                  Aucun résultat pour ces filtres.
                </td>
              </tr>
            ) : (
              rows.map((row: Row, idx: number) => {
                const id = getRowId(row);
                const checked = selected.has(id);

                const needsCheck = !!row?.a_verif;
                const selectable = needsCheck;

                const verifLabel = needsCheck ? String(row?.statut_verif ?? row?.statut ?? "Non validée") : "Validée";
                const ok = verifLabel.toLowerCase() === "validée";

                return (
                  <tr
                    key={String(row?.id ?? idx)}
                    onClick={() => {
                      if (!enableSelection) return;
                      if (!selectable) return;
                      toggle(id);
                    }}
                    className={[
                      "transition-all duration-300 ease-out",
                      "odd:bg-white even:bg-emerald-50/40",
                      enableSelection && selectable ? "cursor-pointer" : "",
                      ok && needsCheck ? "bg-emerald-100/70 text-emerald-900 animate-validated" : "",
                    ].join(" ")}
                  >
                    {enableSelection && (
                      <td className="px-2 py-2 w-10">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!selectable}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => selectable && toggle(id)}
                          className="h-4 w-4 accent-emerald-700 disabled:opacity-30"
                          title={selectable ? "Sélectionner pour action" : "Ligne fixe (Validée)"}
                        />
                      </td>
                    )}

                    {enableRetry && (
                      <td className="px-2 py-2 w-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRetry?.(id, row);
                          }}
                          className="rounded-md border border-emerald-950/15 bg-white px-2 py-1 text-[11px] font-medium text-emerald-950/70 hover:bg-emerald-50"
                          title="Ouvrir le détail / retraiter"
                        >
                          👁
                        </button>
                      </td>
                    )}

                    {columnsToUse.map((col) => {
                      if (col === "statut") {
                        return (
                          <td key={col} className="px-2 py-2 whitespace-nowrap">
                            <span
                              className={[
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                                ok ? "bg-emerald-200 text-emerald-900" : "bg-amber-200 text-amber-900",
                                selectable ? "" : "opacity-70",
                              ].join(" ")}
                              title={selectable ? "Statut modifiable" : "Statut fixé (Validée)"}
                            >
                              {verifLabel}
                            </span>
                          </td>
                        );
                      }

                      if (col === "reprocess_status") {
                        const server = String(row?.reprocess_status ?? retraitementById?.get(String(id)) ?? "").trim();

                        const mapped = mapRetraitementStatus(server);

                        return (
                          <td key={col} className="px-2 py-2 whitespace-nowrap">
                            <span
                              className={[
                                "inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-[11px] font-medium",
                                mapped.tone === "empty"
                                  ? "bg-slate-100 text-slate-500"
                                  : mapped.tone === "running"
                                  ? "bg-slate-200 text-slate-900"
                                  : mapped.tone === "failed"
                                  ? "bg-rose-200 text-rose-900"
                                  : "bg-emerald-200 text-emerald-900",
                              ].join(" ")}
                            >
                              {mapped.spinning && (
                                <span
                                  className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
                                  aria-label="Retraitement en cours"
                                  title="Retraitement en cours"
                                />
                              )}
                              {mapped.label}
                            </span>
                          </td>
                        );
                      }

                      const v = row?.[col];
                      return (
                        <td key={col} className="px-2 py-2 whitespace-nowrap">
                          {formatCell(v)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===================== UTILS ===================== */

function formatCell(v: any) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return v.toLocaleString("fr-FR");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
