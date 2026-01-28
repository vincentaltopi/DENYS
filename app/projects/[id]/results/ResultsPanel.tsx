"use client";

import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useRouter } from "next/navigation";

import { PIE_MONETARY, PIE_FOUND, COLORS } from "@/app/chart.colors";

type PieDatum = { name: string; value: number; lines?: number };
type ResultsPanelProps = { projectId: string };

// ---------- Thème couleurs "éco"
const ECO = {
  emerald: "#059669", // emerald-600
  teal: "#0D9488", // teal-600
  rose: "#E11D48", // rose-600
  slate: "#CBD5E1", // slate-300
};

// ---------- Helpers

const monetaryRe = /kg\s*co2e\s*\/\s*(k?euro|€|k€)/i;

const sumEmissions = (arr: any[]) =>
  arr.reduce((s, r) => s + (getPoidsCarbone(r) ?? 0), 0);

function getCategory(r: any) {
  return String(r?.["catégorie"] ?? r?.categorie ?? r?.category ?? "Sans catégorie").trim();
}

function normalizeCategory(s: string) {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isNotFound(r: any) {
  const v = r?.final_value_q ?? r?.["final_value_q"];
  if (typeof v === "boolean") return v === false;
  return String(v ?? "").toLowerCase() === "false";
}

function isSupplierfe(r: any) {
  const f = r?.associated_q;
  return (
    String(f ?? "").toLowerCase() === "true (fournisseur fe)" ||
    String(f ?? "").toLowerCase() === "true (fournisseur FE)"
  );
}

function isMonetary(r: any) {
  const unit =
    r?.["unité_post"] ??
    r?.unité_post ??
    r?.["unite_post"] ??
    r?.unite_post ??
    "";
  return monetaryRe.test(String(unit));
}

function isDefaultAssurance(r: any) {
  const v = r?.associated_q;
  return (
    String(v ?? "").toLocaleLowerCase() === "fe assurance" 
  );
}

function isDefaultMonetaryUpdate(r: any) {
  const v = r?.associated_q ?? r?.["associated_q"];
  return (
    String(v ?? "").toLowerCase() === "default_monetary_update" ||
    String(v ?? "").toLowerCase() === "monetary_update_default"
  );
}

function formatPct(p: number) {
  return `${p.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}%`;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

const RADIAN = Math.PI / 180;

function makeInsidePercentLabel(data: PieDatum[], colors: string[]) {
  const total = data.reduce((s, d) => s + (d.value ?? 0), 0);

  return (props: any) => {
    const v = Number(props?.value ?? 0);
    if (!total || v <= 0) return "";

    const pct = (v / total) * 100;
    if (pct < 3) return "";

    const { cx, cy, midAngle, innerRadius, outerRadius, index } = props;

    const r = innerRadius + (outerRadius - innerRadius) * 0.62;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);

    const sliceColor = colors[index % colors.length] ?? "#000000";
    const isLight = luminance(sliceColor) > 0.6;

    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={700}
        fill={isLight ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.92)"}
        stroke={isLight ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.45)"}
        strokeWidth={2.5}
        paintOrder="stroke"
      >
        {formatPct(pct)}
      </text>
    );
  };
}

type RechartsTooltipPayloadItem = {
  name?: string;
  value?: number | string;
  payload?: any;
};

function SubcatEmissionsTooltip({
  active,
  payload,
  unit = "kgCO2e",
}: {
  active?: boolean;
  payload?: any[];
  unit?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  console.log(payload)

  const item = payload[0];
  const name = String(item?.name ?? "");
  const emissions = Number(item?.value ?? 0);
  const percent = Number(item?.payload?.percent ?? NaN);
  const lines = Number(item?.payload?.lines ?? NaN);

  return (
    <div className="rounded-xl border border-emerald-950/10 bg-white px-3 py-2 shadow-sm">
      <div className="text-xs font-normal text-emerald-950/80">{name}</div>

      <div className="mt-1 text-xs text-emerald-950/70">
        <span className="font-medium">
          {!Number.isNaN(percent) ? formatPct(percent * 100) : "—"}
        </span>
      </div>

      <div className="mt-1 text-xs text-emerald-950/70">
        Émissions :{" "}
        <span className="font-medium">{emissions.toLocaleString("fr-FR")}</span>{" "}
        {unit}
      </div>

      <div className="mt-1 text-xs text-emerald-950/70">
        Lignes :{" "}
        <span className="font-medium">
          {!Number.isNaN(lines) ? lines.toLocaleString("fr-FR") : "—"}
        </span>
      </div>
    </div>
  );
}

function EmissionsDonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: any[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  const item = payload[0];
  const name = String(item?.name ?? "");
  const kg = Number(item?.value ?? 0);
  const percent = Number(item?.payload?.percent ?? NaN);
  const lines = Number(item?.payload?.lines ?? NaN);

  return (
    <div className="rounded-xl border border-emerald-950/10 bg-white px-3 py-2 shadow-sm">
      <div className="text-xs font-normal text-emerald-950/80">{name}</div>
      <div className="mt-1 text-xs text-emerald-950/70">
        <span className="font-medium">{kg.toLocaleString("fr-FR")}</span> kgCO2e
        {!Number.isNaN(percent) && (
          <>
            {" "}
            • <span className="font-medium">{formatPct(percent * 100)}</span>
          </>
        )}
      </div>
      {!Number.isNaN(lines) && (
        <div className="mt-1 text-xs text-emerald-950/60">
          <span className="font-medium">{lines.toLocaleString("fr-FR")}</span>{" "}
          lignes
        </div>
      )}
    </div>
  );
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: RechartsTooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  const item = payload[0];
  const name = String(item?.name ?? "");
  const value = Number(item?.value ?? 0);
  const percent = Number(item?.payload?.percent ?? NaN);

  return (
    <div className="rounded-xl border border-emerald-950/10 bg-white px-3 py-2 shadow-sm">
      <div className="text-xs font-normal text-emerald-950/80">{name}</div>
      <div className="mt-1 text-xs text-emerald-950/70">
        <span className="font-medium">{value.toLocaleString("fr-FR")}</span>{" "}
        lignes
        {!Number.isNaN(percent) && (
          <>
            {" "}
            • <span className="font-medium">{formatPct(percent * 100)}</span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * EcoDonut V1 (comme ta première version)
 * + Total kgCO2e affiché à 2 décimales (affichage uniquement)
 * + Légende masquée si total=0 OU si moins de 2 parts "réelles"
 */
function EcoDonut({
  title,
  subtitle,
  data,
  colors,
  centerLabel = "Total",
  tooltipContent,
  rightLegend = false,
  unit,
}: {
  title: string;
  subtitle?: string;
  data: PieDatum[];
  colors: string[];
  centerLabel?: string;
  tooltipContent?: any; // Recharts ContentType
  rightLegend?: boolean;
  unit?: string; 
}) {
  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);

  const isKgUnit = String(unit ?? "").toLowerCase().includes("kg");
  const totalDisplay = isKgUnit
    ? total.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : total.toLocaleString("fr-FR");

  const legendItems = data
    .map((d, i) => ({
      value: d.name,
      color: colors[i % colors.length],
      v: Number(d.value) || 0,
      lines: d.lines ?? 0,
    }))
    .filter((x) => x.v > 0 || x.lines > 0);

  const showLegend = total > 0 && legendItems.length >= 1;

  const SmallLegend = ({ payload }: any) => {
    if (!payload?.length) return null;
    return (
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-emerald-950/70">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
            <span className="max-w-[140px] truncate">{p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const LegendExternal = () => {
    if (!showLegend) return null;
    return (
      <div className="max-h-[240px] overflow-y-auto pr-1">
        <div className="space-y-2">
          {data.map((d, i) => {
            const v = Number(d.value) || 0;
            const pct = total > 0 ? (v / total) * 100 : 0;
            const lines = typeof d.lines === "number" ? d.lines : undefined;

            // si part nulle et aucune ligne -> on ne l'affiche pas en légende
            if (v <= 0 && !(lines && lines > 0)) return null;

            const vDisplay = isKgUnit
              ? v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })
              : v.toLocaleString("fr-FR");

            return (
              <div key={`${d.name}-${i}`} className="flex items-start gap-2 text-xs">
                <span
                  className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: colors[i % colors.length] }}
                />
                <div className="min-w-0">
                  <div className="truncate font-medium text-emerald-950/80">{d.name}</div>
                  <div className="text-emerald-950/60">
                    {vDisplay} {unit ?? "kgCO2e"} • {formatPct(pct)}
                    {lines !== undefined ? ` • ${lines.toLocaleString("fr-FR")} lignes` : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ---- Mode "dashboard" (légende à droite)
  if (rightLegend) {
    return (
      <div className="rounded-2xl border border-emerald-950/10 bg-white p-4">
        <div className="mb-1 text-sm font-normal text-emerald-950/80">{title}</div>
        {subtitle && <div className="mb-3 text-xs text-emerald-950/60">{subtitle}</div>}

        <div className="flex items-center gap-20">
          {/* Donut */}
          <div className="relative h-[260px] w-[340px] shrink-0">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-[11px] font-medium text-emerald-950/55">{centerLabel}</div>

                {total > 0 ? (
                  <div className="text-xl font-normal leading-none text-emerald-950/85">
                    {totalDisplay}
                  </div>
                ) : (
                  <div className="text-sm font-normal text-emerald-950/60">
                    Aucune émission
                  </div>
                )}

                {unit && <div className="mt-1 text-[11px] text-emerald-950/50">{unit}</div>}
              </div>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={2}
                  labelLine={false}
                  label={makeInsidePercentLabel(data, colors)}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                </Pie>

                {/* Tooltip content doit être une fonction/composant */}
                <Tooltip content={tooltipContent ?? DonutTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Légende à droite (HTML) */}
          <div className="min-w-0 flex-1">
            <LegendExternal />
          </div>
        </div>
      </div>
    );
  }

  // ---- Mode normal
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-950/10 bg-white p-4">
      <div className="mb-1 text-sm font-normal text-emerald-950/80">{title}</div>
      {subtitle && <div className="mb-3 text-xs text-emerald-950/60">{subtitle}</div>}

      <div className="flex flex-col">
        <div className="relative h-[240px] w-full">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="mt-0.5 text-[11px] font-medium text-emerald-950/55">{centerLabel}</div>

              {total > 0 ? (
                <div className="text-xl font-normal leading-none text-emerald-950/90">
                  {totalDisplay}
                </div>
              ) : (
                <div className="text-sm font-normal text-emerald-950/60">
                  Aucune émission
                </div>
              )}

              {unit && (
                <div className="text-[11px] font-medium tracking-wide text-emerald-950/50">
                  {unit}
                </div>
              )}
            </div>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={84}
                paddingAngle={2}
                labelLine={false}
                label={makeInsidePercentLabel(data, colors)}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>

              <Tooltip content={tooltipContent ?? DonutTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* ✅ Légende masquée si inutile */}
        {showLegend && (
          <div className="mt-2 max-h-[56px] overflow-y-auto">
            <SmallLegend
              payload={legendItems.map((x: any) => ({
                value: x.value,
                color: x.color,
              }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Carbone helpers
function parseMaybeNumber(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;

  const s = String(v)
    .replace(/\s/g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.\-]/g, "");

  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function getPoidsCarbone(row: any): number | null {
  const direct = row?.["émission_totale"];
  const n = parseMaybeNumber(direct);
  return n !== null ? n : null;
}

export default function ResultsPanel({ projectId }: ResultsPanelProps) {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllCats, setShowAllCats] = useState(false);

  

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/projects/${projectId}/results`, { cache: "no-store" });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`API error ${res.status} ${t}`);
        }

        const json = await res.json();
        if (!alive) return;
        setRows(Array.isArray(json?.results) ? json.results : []);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Erreur chargement");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [projectId]);

  // ---------- Stats FE monétaire + taux non trouvées
  const feStats = useMemo(() => {
    const monetaryReLocal = /kg\s*co2e\s*\/\s*(k?euro|€|k€)/i;

    const total = rows.length;

    const isNotFoundLocal = (r: any) => {
      const v = r?.final_value_q ?? r?.["final_value_q"];
      if (typeof v === "boolean") return v === false;
      return String(v ?? "").toLowerCase() === "false";
    };

    const notFound = rows.filter(isNotFoundLocal).length;
    const foundRows = rows.filter((r) => !isNotFoundLocal(r));

    const isMonetaryLocal = (r: any) => {
      const unit =
        r?.["unité_post"] ??
        r?.unité_post ??
        r?.["unite_post"] ??
        r?.unite_post ??
        "";
      return monetaryReLocal.test(String(unit));
    };

    const monetary = foundRows.filter(isMonetaryLocal).length;
    const physique = Math.max(0, foundRows.length - monetary);

    const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);

    return {
      total,
      notFound,
      found: foundRows.length,
      monetary,
      physique,
      rates: {
        notFoundPct: pct(notFound, total),
        monetaryAmongFoundPct: pct(monetary, foundRows.length),
      },
      pieMonetary: [
        { name: "Monétaire ", value: monetary },
        { name: "Physique", value: physique },
      ],
      pieFound: [
        { name: "Valorisées", value: foundRows.length },
        { name: "Non valorisées", value: notFound },
      ],
    };
  }, [rows]);

  // ---------- Donut: émissions par catégorie (top 8 + Autres), sans "Sans catégorie"
  const emissionsParCategorieDonut = useMemo(() => {
    const byCat = new Map<string, { emissions: number; lines: number }>();

    for (const r of rows) {
      const cat = getCategory(r);
      if (cat === "Sans catégorie") continue;

      const v = getPoidsCarbone(r);

      const curr = byCat.get(cat) ?? { emissions: 0, lines: 0 };
      curr.lines += 1;
      curr.emissions += v ?? 0;
      byCat.set(cat, curr);
    }

    const all = Array.from(byCat.entries())
      .map(([name, obj]) => ({ name, value: obj.emissions, lines: obj.lines }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);

    const TOP_N = 8;
    const top = all.slice(0, TOP_N);
    const rest = all.slice(TOP_N);

    if (rest.length > 0) {
      top.push({
        name: "Autres",
        value: rest.reduce((s, d) => s + d.value, 0),
        lines: rest.reduce((s, d) => s + (d.lines ?? 0), 0),
      });
    }

    return top;
  }, [rows]);

  const totalEmissions = useMemo(
    () => emissionsParCategorieDonut.reduce((s, d) => s + d.value, 0),
    [emissionsParCategorieDonut]
  );

  const totalEmissionsDisplay = useMemo(
    () =>
      totalEmissions.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [totalEmissions]
  );

  const totalLignes = useMemo(() => rows.length, [rows]);

  const piesByCategory = useMemo(() => {
    const byCat = new Map<string, any[]>();

    for (const r of rows) {
      const rawCat = String(r?.["catégorie"] ?? r?.categorie ?? r?.category ?? "sans categorie");
      const key = normalizeCategory(rawCat);

      if (!byCat.has(key)) byCat.set(key, []);
      byCat.get(key)!.push(r);
    }

    const achat = byCat.get("achat materiel") ?? [];
    const locMat = byCat.get("location materiel") ?? [];
    const locVeh = byCat.get("location vehicule") ?? [];
    const presta = byCat.get("prestation") ?? [];
    const assurance = byCat.get("assurance") ?? [];
    const energie = byCat.get("energie") ?? [];
    const fret = byCat.get("fret") ?? [];
    const annexe = byCat.get("annexe") ?? [];

    // ---------- Achat matériel:
    const achatNotFoundRows = achat.filter(isNotFound);
    const achatFoundRows = achat.filter((r) => !isNotFound(r));

    const achatMonetaryRows = achatFoundRows.filter(isMonetary);
    const achatRealRows = achatFoundRows.filter((r) => !isMonetary(r));

    const pieAchat: PieDatum[] = [
      { name: "FE monétaire", value: sumEmissions(achatMonetaryRows), lines: achatMonetaryRows.length },
      { name: "FE réel", value: sumEmissions(achatRealRows), lines: achatRealRows.length },
      { name: "Non valorisées", value: sumEmissions(achatNotFoundRows), lines: achatNotFoundRows.length },
    ].filter((d) => d.lines && d.lines > 0);

    // ---------- Location matériel:
    const locMatNotFoundRows = locMat.filter(isNotFound);
    const locMatFoundRows = locMat.filter((r) => !isNotFound(r));
    const locMatMonetaryRows = locMatFoundRows;

    const pieLocMat: PieDatum[] = [
      { name: "FE monétaire", value: sumEmissions(locMatMonetaryRows), lines: locMatMonetaryRows.length },
      { name: "Non valorisées", value: sumEmissions(locMatNotFoundRows), lines: locMatNotFoundRows.length },
    ].filter((d) => d.lines && d.lines > 0);

    // ---------- Location de véhicule:
    const locVehNotFound = locVeh.filter(isNotFound);
    const locVehFoundRows = locVeh.filter((r) => !isNotFound(r));

    const locVehNonMonetaryRows = locVehFoundRows.filter((r) => !isMonetary(r));
    const locVehMonetaryDefaultRows = locVehFoundRows.filter(
      (r) => isMonetary(r) && isDefaultMonetaryUpdate(r)
    );
    const locVehMonetaryNonDefaultRows = locVehFoundRows.filter(
      (r) => isMonetary(r) && !isDefaultMonetaryUpdate(r)
    );

    const pieLocVeh: PieDatum[] = [
      { name: "FE physique", value: sumEmissions(locVehNonMonetaryRows), lines: locVehNonMonetaryRows.length },
      { name: "FE monétaire", value: sumEmissions(locVehMonetaryNonDefaultRows), lines: locVehMonetaryNonDefaultRows.length },
      { name: "FE par défaut", value: sumEmissions(locVehMonetaryDefaultRows), lines: locVehMonetaryDefaultRows.length },
      { name: "Non valorisées", value: sumEmissions(locVehNotFound), lines: locVehNotFound.length },
    ].filter((d) => d.lines && d.lines > 0);

    // ----------------- Prestation:
    const prestanotfound = presta.filter(isNotFound);
    const prestafound = presta.filter((r) => !isNotFound(r));
    const prestabydefault = prestafound.filter((r) => isDefaultMonetaryUpdate(r));
    const prestabysupplier = prestafound.filter((r) => isSupplierfe(r));
    const prestamonetary = prestafound.filter((r) => !isDefaultMonetaryUpdate(r) && !isSupplierfe(r));

    const piePresta: PieDatum[] = [
      { name: "FE monétaire", value: sumEmissions(prestamonetary), lines: prestamonetary.length },
      { name: "Non valorisées", value: sumEmissions(prestanotfound), lines: prestanotfound.length },
      { name: "FE Fournisseur", value: sumEmissions(prestabysupplier), lines: prestabysupplier.length },
      { name: "FE par défaut", value: sumEmissions(prestabydefault), lines: prestabydefault.length },
    ].filter((d) => d.lines && d.lines > 0);

    // ---------------- Assurance
    const assurancenotfoud = assurance.filter(isNotFound);
    const assurancefound = assurance.filter((r) => !isNotFound(r));
    const assurancedefault = assurancefound.filter((r) => isDefaultAssurance(r));
    const assurancemonetary = assurancefound.filter((r) => !isDefaultAssurance(r));

    const pieAssurance: PieDatum[] = [
      { name: "Non valorisées", value: sumEmissions(assurancenotfoud), lines: assurancenotfoud.length },
      { name: "FE monétaire", value: sumEmissions(assurancemonetary), lines: assurancemonetary.length },
      { name: "FE par défaut", value: sumEmissions(assurancedefault), lines: assurancedefault.length },
    ].filter((d) => d.lines && d.lines > 0);

    // ------------------- Energie
    const energienotfound = energie.filter(isNotFound);
    const energiefound = energie.filter((r) => !isNotFound(r));

    const pieEnergie: PieDatum[] = [
      { name: "Non valorisées", value: sumEmissions(energienotfound), lines: energienotfound.length },
      { name: "FE Physique", value: sumEmissions(energiefound), lines: energiefound.length },
    ].filter((d) => d.lines && d.lines > 0);

    // ------------------- Fret
    const fretnotfound = fret.filter(isNotFound);
    const fretfound = fret.filter((r) => !isNotFound(r));
    const fretmonetary = fretfound.filter((r) => isMonetary(r) && !isDefaultMonetaryUpdate(r));
    const fretbydefault = fretfound.filter((r) => isDefaultMonetaryUpdate(r));
    const fretphysic = fretfound.filter((r) => !isMonetary(r));

    const pieFret: PieDatum[] = [
      { name: "Non valorisées", value: sumEmissions(fretnotfound), lines: fretnotfound.length },
      { name: "FE physique", value: sumEmissions(fretphysic), lines: fretphysic.length },
      { name: "FE monétaire", value: sumEmissions(fretmonetary), lines: fretmonetary.length },
      { name: "FE par défaut", value: sumEmissions(fretbydefault), lines: fretbydefault.length },
    ].filter((d) => d.lines && d.lines > 0);

    const pieAnnexe: PieDatum[] = [{ name: "Annexe", value: sumEmissions(annexe), lines: annexe.length }];

    const totalAchatKg = sumEmissions(achat);
    const totalLocMatKg = sumEmissions(locMat);
    const totalLocVehKg = sumEmissions(locVeh);
    const totalPresta = sumEmissions(presta);
    const totalAssurance = sumEmissions(assurance);
    const totalEnergie = sumEmissions(energie);
    const totalFret = sumEmissions(fret);
    const totalAnnexe = sumEmissions(annexe);

    return {
      counts: {
        achatTotal: achat.length,
        locMatTotal: locMat.length,
        locVehTotal: locVeh.length,
        prestaTotal: presta.length,
        assuranceTotal: assurance.length,
        energieTotal: energie.length,
        fretTotal: fret.length,
        annexeTotal: annexe.length,
      },
      totalsKg: {
        achat: totalAchatKg,
        locMat: totalLocMatKg,
        locVeh: totalLocVehKg,
        presta: totalPresta,
        assurance: totalAssurance,
        energie: totalEnergie,
        fret: totalFret,
        annexe: totalAnnexe,
      },
      pieAchat,
      pieLocMat,
      pieLocVeh,
      piePresta,
      pieAssurance,
      pieEnergie,
      pieFret,
      pieAnnexe,
    };
  }, [rows]);

  type CatKey =
    | "achat"
    | "locMat"
    | "locVeh"
    | "presta"
    | "assurance"
    | "energie"
    | "fret"
    | "annexe";

  type DonutCard = {
    key: CatKey;
    title: string;
    totalKg: number;
    lines: number;
    data: PieDatum[];
    colors: string[];
  };

  const categoryDonutCards = useMemo<DonutCard[]>(() => {
    const cards: DonutCard[] = [
      {
        key: "achat",
        title: "Achat matériel",
        totalKg: piesByCategory.totalsKg.achat,
        lines: piesByCategory.counts.achatTotal,
        data: piesByCategory.pieAchat,
        colors: [COLORS.emerald, COLORS.stone, COLORS.clay],
      },
      {
        key: "locMat",
        title: "Location matériel",
        totalKg: piesByCategory.totalsKg.locMat,
        lines: piesByCategory.counts.locMatTotal,
        data: piesByCategory.pieLocMat,
        colors: [COLORS.emerald, COLORS.clay],
      },
      {
        key: "locVeh",
        title: "Location de véhicule",
        totalKg: piesByCategory.totalsKg.locVeh,
        lines: piesByCategory.counts.locVehTotal,
        data: piesByCategory.pieLocVeh,
        colors: [COLORS.stone, COLORS.teal, COLORS.forest],
      },
      {
        key: "presta",
        title: "Prestation",
        totalKg: piesByCategory.totalsKg.presta,
        lines: piesByCategory.counts.prestaTotal,
        data: piesByCategory.piePresta,
        colors: [COLORS.stone, COLORS.teal, COLORS.forest],
      },
      {
        key: "assurance",
        title: "Assurance",
        totalKg: piesByCategory.totalsKg.assurance,
        lines: piesByCategory.counts.assuranceTotal,
        data: piesByCategory.pieAssurance,
        colors: [COLORS.stone, COLORS.teal, COLORS.forest],
      },
      {
        key: "energie",
        title: "Energie",
        totalKg: piesByCategory.totalsKg.energie,
        lines: piesByCategory.counts.energieTotal,
        data: piesByCategory.pieEnergie,
        colors: [COLORS.stone, COLORS.teal, COLORS.forest],
      },
      {
        key: "fret",
        title: "Fret",
        totalKg: piesByCategory.totalsKg.fret,
        lines: piesByCategory.counts.fretTotal,
        data: piesByCategory.pieFret,
        colors: [COLORS.stone, COLORS.teal, COLORS.forest],
      },
      {
        key: "annexe",
        title: "Annexe",
        totalKg: piesByCategory.totalsKg.annexe,
        lines: piesByCategory.counts.annexeTotal,
        data: piesByCategory.pieAnnexe,
        colors: [COLORS.stone, COLORS.teal, COLORS.forest],
      },
    ];

    return cards
      .filter((c) => c.lines > 0) 
      .sort((a, b) => b.totalKg - a.totalKg); 
  }, [piesByCategory]);

  const shownCats = useMemo(
    () => (showAllCats ? categoryDonutCards : categoryDonutCards.slice(0, 6)),
    [categoryDonutCards, showAllCats]
  );


  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="rounded-xl border border-emerald-950/10 bg-emerald-50 p-3 text-sm text-emerald-950/70">
          Aucun résultat pour ce projet.
        </div>
      )}

      {/* Donut: émissions par catégorie */}
      {!loading && !error && rows.length > 0 && (
        <EcoDonut
          title="Émissions par catégorie"
          subtitle={`${totalEmissionsDisplay} kgCO2e • ${totalLignes.toLocaleString("fr-FR")} lignes`}
          data={emissionsParCategorieDonut}
          colors={[COLORS.emerald, COLORS.teal, COLORS.forest, COLORS.clay, COLORS.stone]}
          centerLabel="Total"
          tooltipContent={(props: any) => <EmissionsDonutTooltip {...props} />}
          rightLegend
          unit="kgCO2e"
        />
      )}

      {/* Donuts FE (2 colonnes) */}
      {!loading && !error && rows.length > 0 && (
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
          {feStats.found === 0 ? (
            <div className="relative rounded-2xl border border-emerald-950/10 overflow-visible">
              <div className="absolute inset-0 rounded-2xl bg-white overflow-hidden" />
              <div className="relative p-4">
                <div className="mb-1 text-sm font-normal text-emerald-950/80">
                  Part de FE monétaire (sur lignes valorisées)
                </div>
                <div className="text-xs text-emerald-950/60">
                  Aucune ligne trouvée → impossible de calculer la part monétaire.
                </div>
              </div>
            </div>
          ) : (
            <EcoDonut
              title="Part de FE monétaire (sur lignes valorisées)"
              subtitle={`${feStats.rates.monetaryAmongFoundPct.toLocaleString("fr-FR", {
                maximumFractionDigits: 1,
              })}% monétaire • ${feStats.found} lignes valorisées`}
              data={feStats.pieMonetary}
              colors={PIE_MONETARY}
              centerLabel="Valorisées"
            />
          )}

          <EcoDonut
            title="Taux de lignes valorisées"
            subtitle={`${feStats.rates.notFoundPct.toLocaleString("fr-FR", {
              maximumFractionDigits: 1,
            })}% non valorisées • ${feStats.notFound}/${feStats.total}`}
            data={feStats.pieFound}
            colors={PIE_FOUND}
            centerLabel="Total"
          />
        </div>
      )}

      {/* Donuts catégories */}
        {!loading && !error && rows.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-normal text-emerald-950/80">Détails par catégorie</div>

              {categoryDonutCards.length > 6 && (
                <button
                  className="text-xs font-medium text-emerald-700 hover:underline"
                  onClick={() => setShowAllCats((v) => !v)}
                >
                  {showAllCats ? "Réduire" : "Voir tout"}
                </button>
              )}
            </div>

            <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
              {shownCats.map((c) => (
                <EcoDonut
                  key={c.key}
                  title={c.title}
                  subtitle={`${c.totalKg.toLocaleString("fr-FR")} kgCO2e • ${c.lines} lignes`}
                  data={c.data}
                  colors={c.colors}
                  centerLabel="Total"
                  unit="kgCO2e"
                  tooltipContent={(props: any) => <SubcatEmissionsTooltip {...props} unit="kgCO2e" />}
                />
              ))}
            </div>
          </div>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={() => router.push("/home")}
          className="inline-flex items-center rounded-xl border border-emerald-950/15 bg-white px-4 py-2 text-sm font-medium text-emerald-950/80 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
        >
          ← Retour à l’accueil
        </button>
        </div>

    </div>
  );
}
