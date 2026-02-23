import { NextRequest } from "next/server";
import chromium from "@sparticuz/chromium-min";
import puppeteerCore from "puppeteer-core";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { access } from "node:fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── Types ─────────────────────────────────────────────────────────────────────
type DonutSlice = { label: string; value: number; color: string; lines?: number };

// ─── Couleurs (chart.colors.ts) ────────────────────────────────────────────────
const C = {
  emerald: "#047857",
  teal:    "#0D9488",
  forest:  "#0F3D2E",
  clay:    "#9F2D20",
  stone:   "#CBD5E1",
  slate:   "#475569",
  amber:   "#F59E0B",
  sage:    "#84A98C",
  moss:    "#3F6212",
};
const PIE_MONETARY = [C.amber, C.sage];
const PIE_FOUND    = [C.forest, C.clay];

// ─── Helpers data ──────────────────────────────────────────────────────────────
const monetaryRe = /kg\s*co2e\s*\/\s*(k?euro|€|k€)/i;

function parseMaybeNumber(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number" && isFinite(v)) return v;
  const s = String(v).replace(/\s/g, "").replace(/,/g, ".").replace(/[^0-9.\-]/g, "");
  const n = Number(s);
  return isFinite(n) ? n : null;
}
function getKg(r: any): number { return parseMaybeNumber(r?.["émission_totale"]) ?? 0; }
function sumKg(arr: any[]) { return arr.reduce((s, r) => s + getKg(r), 0); }

function isNotFound(r: any) {
  const v = r?.final_value_q ?? r?.["final_value_q"];
  if (typeof v === "boolean") return !v;
  return String(v ?? "").toLowerCase() === "false";
}
function isMonetary(r: any) {
  return monetaryRe.test(String(r?.["unité_post"] ?? r?.unité_post ?? r?.["unite_post"] ?? r?.unite_post ?? ""));
}
function isSupplierfe(r: any) {
  return String(r?.associated_q ?? "").toLowerCase() === "true (fournisseur fe)";
}
function isDefaultAssurance(r: any) {
  return String(r?.associated_q ?? "").toLowerCase() === "fe assurance";
}
function isDefaultMonetaryUpdate(r: any) {
  const s = String(r?.associated_q ?? "").toLowerCase();
  return s === "default_monetary_update" || s === "monetary_update_default";
}
function normCat(s: string) {
  return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function getCat(r: any) {
  return String(r?.["catégorie"] ?? r?.categorie ?? r?.category ?? "Sans catégorie").trim();
}

// ─── Helpers format ────────────────────────────────────────────────────────────
const fmtInt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
const fmtKg  = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (p: number) => p.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + "%";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ─── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchAll(projectId: string) {
  const pageSize = 1000;
  let from = 0;
  const all: any[] = [];
  while (true) {
    const { data, error } = await supabaseAdmin
      .from("Results").select("*").eq("project_id", projectId)
      .order("id", { ascending: true }).range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    all.push(...(data ?? []));
    if ((data?.length ?? 0) < pageSize) break;
    from += pageSize;
  }
  return all;
}

// ─── SVG donut ─────────────────────────────────────────────────────────────────
function donutSvg(
  slices: DonutSlice[],
  w: number, h: number,
  rOuter: number, rInner: number,
  centerLabel: string, centerValue: string, centerUnit?: string,
  small = false
): string {
  const cx = w / 2, cy = h / 2;
  const total = slices.reduce((s, d) => s + (d.value || 0), 0);
  const active = slices.filter((s) => (s.value || 0) > 0).length;
  const GAP = active > 1 ? (1.8 * Math.PI) / 180 : 0;

  const paths: string[] = [];
  const texts: string[] = [];
  let start = -Math.PI / 2;

  if (!total) {
    paths.push(`<circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="#e5e7eb"/>`);
    paths.push(`<circle cx="${cx}" cy="${cy}" r="${rInner}" fill="white"/>`);
  } else {
    for (const sl of slices) {
      const v = Math.max(0, sl.value || 0);
      if (!v) continue;
      const raw = (v / total) * Math.PI * 2;
      const pct = (v / total) * 100;

      // Tranche à 100% → SVG arc dégénéré (point → même point) : utiliser 2 cercles
      if (pct >= 99.9) {
        paths.push(`<circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="${sl.color}"/>`);
        paths.push(`<circle cx="${cx}" cy="${cy}" r="${rInner}" fill="white"/>`);
        start += raw;
        continue;
      }

      const ds = start + GAP;
      const de = start + raw - GAP;
      if (de > ds) {
        const la = (de - ds) > Math.PI ? 1 : 0;
        const x1 = cx + rOuter * Math.cos(ds), y1 = cy + rOuter * Math.sin(ds);
        const x2 = cx + rOuter * Math.cos(de), y2 = cy + rOuter * Math.sin(de);
        const x3 = cx + rInner * Math.cos(de), y3 = cy + rInner * Math.sin(de);
        const x4 = cx + rInner * Math.cos(ds), y4 = cy + rInner * Math.sin(ds);
        paths.push(
          `<path d="M${x1} ${y1} A${rOuter} ${rOuter} 0 ${la} 1 ${x2} ${y2} L${x3} ${y3} A${rInner} ${rInner} 0 ${la} 0 ${x4} ${y4}Z" fill="${sl.color}"/>`
        );
        if (pct >= 4) {
          const mid = start + raw / 2;
          const r   = rInner + (rOuter - rInner) * 0.58;
          const lx  = cx + r * Math.cos(mid);
          const ly  = cy + r * Math.sin(mid);
          texts.push(
            `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" font-size="${small ? 9 : 11}" font-weight="700" fill="rgba(255,255,255,.93)" stroke="rgba(0,0,0,.4)" stroke-width="2.5" paint-order="stroke">${esc(fmtPct(pct))}</text>`
          );
        }
      }
      start += raw;
    }
  }

  const vfs = small ? 15 : 20;
  const lfs = small ? 10 : 11;
  const ufs = small ? 9  : 10;
  const off = small ? 12 : 15;

  const center = [
    `<text x="${cx}" y="${cy - off}" text-anchor="middle" font-size="${lfs}" fill="rgba(5,46,22,.55)">${esc(centerLabel)}</text>`,
    `<text x="${cx}" y="${cy + (small ? 3 : 4)}" text-anchor="middle" font-size="${vfs}" font-weight="600" fill="#052e16">${esc(centerValue)}</text>`,
    centerUnit ? `<text x="${cx}" y="${cy + (small ? 17 : 22)}" text-anchor="middle" font-size="${ufs}" fill="rgba(5,46,22,.5)">${esc(centerUnit)}</text>` : "",
  ].join("");

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${paths.join("")}${texts.join("")}${center}</svg>`;
}

// ─── Légende HTML ──────────────────────────────────────────────────────────────
function legendHtml(slices: DonutSlice[], unit: string, fmtVal: (n: number) => string): string {
  const total = slices.reduce((s, d) => s + (d.value || 0), 0);
  return slices
    .filter((s) => (s.value || 0) > 0 || (s.lines ?? 0) > 0)
    .map((sl) => {
      const pct = total > 0 ? (sl.value / total) * 100 : 0;
      const vDisplay = fmtVal(sl.value);
      const lDisplay = sl.lines !== undefined ? ` &bull; ${fmtInt(sl.lines)} lgn` : "";
      return `
        <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
          <span style="width:10px;height:10px;border-radius:50%;background:${sl.color};flex-shrink:0;margin-top:3px;"></span>
          <div>
            <div style="font-size:12px;font-weight:600;color:rgba(5,46,22,.8);">${esc(sl.label)}</div>
            <div style="font-size:11px;color:rgba(5,46,22,.6);">${esc(vDisplay)} ${unit} &bull; ${esc(fmtPct(pct))}${lDisplay}</div>
          </div>
        </div>`;
    })
    .join("");
}

function smallLegendHtml(slices: DonutSlice[], unit: string): string {
  const total = slices.reduce((s, d) => s + (d.value || 0), 0);
  return slices
    .filter((s) => (s.value || 0) > 0 || (s.lines ?? 0) > 0)
    .map((sl) => {
      const pct = total > 0 ? (sl.value / total) * 100 : 0;
      const vDisplay = unit.toLowerCase().includes("kg") ? fmtKg(sl.value) : fmtInt(sl.value);
      return `
        <div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:5px;">
          <span style="width:8px;height:8px;border-radius:50%;background:${sl.color};flex-shrink:0;margin-top:2px;"></span>
          <div>
            <div style="font-size:10.5px;font-weight:600;color:rgba(5,46,22,.8);">${esc(sl.label)}</div>
            <div style="font-size:9.5px;color:rgba(5,46,22,.6);">${esc(vDisplay)} ${unit} &bull; ${esc(fmtPct(pct))}</div>
          </div>
        </div>`;
    })
    .join("");
}

// ─── Calcul données catégories ─────────────────────────────────────────────────
function buildCategories(rows: any[]) {
  const byCat = new Map<string, any[]>();
  for (const r of rows) {
    const key = normCat(String(r?.["catégorie"] ?? r?.categorie ?? r?.category ?? "sans categorie"));
    if (!byCat.has(key)) byCat.set(key, []);
    byCat.get(key)!.push(r);
  }

  const get = (k: string) => byCat.get(k) ?? [];
  const achat     = get("achat materiel");
  const locMat    = get("location materiel");
  const locVeh    = get("location vehicule");
  const presta    = get("prestation");
  const assurance = get("assurance");
  const energie   = get("energie");
  const fret      = get("fret");
  const annexe    = get("annexe");

  function pie(rows: any[], fn: (r: any) => boolean, label: string, color: string): DonutSlice | null {
    const arr = rows.filter(fn);
    if (!arr.length) return null;
    return { label, value: sumKg(arr), color, lines: arr.length };
  }

  const achatNF = achat.filter(isNotFound), achatF = achat.filter(r => !isNotFound(r));
  const locMatNF = locMat.filter(isNotFound), locMatF = locMat.filter(r => !isNotFound(r));
  const locVehNF = locVeh.filter(isNotFound), locVehF = locVeh.filter(r => !isNotFound(r));
  const prestaNF = presta.filter(isNotFound), prestaF = presta.filter(r => !isNotFound(r));
  const assurNF  = assurance.filter(isNotFound), assurF = assurance.filter(r => !isNotFound(r));
  const energieNF = energie.filter(isNotFound), energieF = energie.filter(r => !isNotFound(r));
  const fretNF   = fret.filter(isNotFound), fretF = fret.filter(r => !isNotFound(r));

  const filterNonNull = (arr: (DonutSlice | null)[]): DonutSlice[] =>
    arr.filter((x): x is DonutSlice => x !== null);

  return [
    {
      key: "achat", title: "Achat matériel", rows: achat,
      slices: filterNonNull([
        pie(achatF.filter(isMonetary),          r => isMonetary(r),    "FE monétaire",   C.emerald),
        pie(achatF.filter(r => !isMonetary(r)), r => !isMonetary(r),   "FE réel",        C.teal),
        pie(achatNF, isNotFound,                                        "Non valorisées", C.clay),
      ]),
    },
    {
      key: "locMat", title: "Location matériel", rows: locMat,
      slices: filterNonNull([
        pie(locMatF,  r => !isNotFound(r), "FE monétaire",   C.emerald),
        pie(locMatNF, isNotFound,          "Non valorisées", C.clay),
      ]),
    },
    {
      key: "locVeh", title: "Location de véhicule", rows: locVeh,
      slices: filterNonNull([
        pie(locVehF.filter(r => !isMonetary(r)),                               r => !isMonetary(r),                               "FE physique",    C.teal),
        pie(locVehF.filter(r => isMonetary(r) && !isDefaultMonetaryUpdate(r)), r => isMonetary(r) && !isDefaultMonetaryUpdate(r), "FE monétaire",   C.amber),
        pie(locVehF.filter(r => isDefaultMonetaryUpdate(r)),                   isDefaultMonetaryUpdate,                           "FE par défaut",  C.forest),
        pie(locVehNF, isNotFound, "Non valorisées", C.clay),
      ]),
    },
    {
      key: "presta", title: "Prestation", rows: presta,
      slices: filterNonNull([
        pie(prestaF.filter(r => !isDefaultMonetaryUpdate(r) && !isSupplierfe(r)), () => true, "FE monétaire",   C.emerald),
        pie(prestaF.filter(isSupplierfe),            isSupplierfe,            "FE Fournisseur", C.teal),
        pie(prestaF.filter(isDefaultMonetaryUpdate), isDefaultMonetaryUpdate, "FE par défaut",  C.forest),
        pie(prestaNF, isNotFound, "Non valorisées", C.clay),
      ]),
    },
    {
      key: "assurance", title: "Assurance", rows: assurance,
      slices: filterNonNull([
        pie(assurF.filter(r => !isDefaultAssurance(r)), r => !isDefaultAssurance(r), "FE monétaire",   C.moss),
        pie(assurF.filter(isDefaultAssurance),           isDefaultAssurance,          "FE par défaut",  C.teal),
        pie(assurNF, isNotFound, "Non valorisées", C.clay),
      ]),
    },
    {
      key: "energie", title: "Energie", rows: energie,
      slices: filterNonNull([
        pie(energieF,  r => !isNotFound(r), "FE Physique",    C.emerald),
        pie(energieNF, isNotFound,          "Non valorisées", C.clay),
      ]),
    },
    {
      key: "fret", title: "Fret", rows: fret,
      slices: filterNonNull([
        pie(fretF.filter(r => !isMonetary(r)),                               r => !isMonetary(r),                               "FE physique",    C.forest),
        pie(fretF.filter(r => isMonetary(r) && !isDefaultMonetaryUpdate(r)), r => isMonetary(r) && !isDefaultMonetaryUpdate(r), "FE monétaire",   C.teal),
        pie(fretF.filter(isDefaultMonetaryUpdate),                           isDefaultMonetaryUpdate,                           "FE par défaut",  C.amber),
        pie(fretNF, isNotFound, "Non valorisées", C.clay),
      ]),
    },
    {
      key: "annexe", title: "Annexe", rows: annexe,
      slices: filterNonNull([
        pie(annexe, () => true, "Annexe", C.sage),
      ]),
    },
  ]
    .filter((c) => c.rows.length > 0)
    .sort((a, b) => sumKg(b.rows) - sumKg(a.rows));
}

// ─── HTML principal ────────────────────────────────────────────────────────────
function buildHtml(
  projectId: string,
  rows: any[],
  totalKg: number,
  notFoundRows: any[],
  foundRows: any[],
  monetaryRows: any[],
  physiqueRows: any[],
  catData: ReturnType<typeof buildCategories>
): string {
  const totalLines      = rows.length;
  const notFoundPct     = totalLines > 0 ? (notFoundRows.length / totalLines) * 100 : 0;
  const monetaryPct     = foundRows.length > 0 ? (monetaryRows.length / foundRows.length) * 100 : 0;

  // ── Émissions par catégorie (top 8)
  const byCatEmit = new Map<string, { v: number; lines: number }>();
  for (const r of rows) {
    const cat = getCat(r);
    if (cat === "Sans catégorie") continue;
    const curr = byCatEmit.get(cat) ?? { v: 0, lines: 0 };
    curr.lines++;
    curr.v += getKg(r);
    byCatEmit.set(cat, curr);
  }
  const emitAll = [...byCatEmit.entries()]
    .map(([name, o]) => ({ name, value: o.v, lines: o.lines }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  const top8 = emitAll.slice(0, 8);
  const rest = emitAll.slice(8);
  if (rest.length) top8.push({ name: "Autres", value: rest.reduce((s, d) => s + d.value, 0), lines: rest.reduce((s, d) => s + d.lines, 0) });

  const emitColors = [C.emerald, C.teal, C.forest, C.clay, C.amber, C.moss, C.sage, C.slate, C.stone];
  const emitSlices: DonutSlice[] = top8.map((d, i) => ({ label: d.name, value: d.value, color: emitColors[i % emitColors.length], lines: d.lines }));

  // ── Slices FE
  const slicesMon: DonutSlice[] = [
    { label: "Monétaire", value: monetaryRows.length,  color: PIE_MONETARY[0] },
    { label: "Physique",  value: physiqueRows.length,  color: PIE_MONETARY[1] },
  ];
  const slicesFound: DonutSlice[] = [
    { label: "Valorisées",     value: foundRows.length,   color: PIE_FOUND[0] },
    { label: "Non valorisées", value: notFoundRows.length, color: PIE_FOUND[1] },
  ];

  // ── Table recap
  const groupByCat = new Map<string, any[]>();
  for (const r of rows) {
    const cat = getCat(r);
    if (!groupByCat.has(cat)) groupByCat.set(cat, []);
    groupByCat.get(cat)!.push(r);
  }
  const CATS = ["Achat matériel","Location matériel","Location véhicule","Fret","Energie","Prestation","Assurance","Annexe"];
  const allCats = [...CATS, ...[...groupByCat.keys()].filter(c => !CATS.includes(c))];
  let tableRows = "";
  let tKg = 0, tLines = 0, idx = 0;
  for (const cat of allCats) {
    const list = groupByCat.get(cat) ?? [];
    if (!list.length) continue;
    const kg = sumKg(list);
    tKg += kg; tLines += list.length;
    const bg = idx % 2 === 1 ? "background:rgba(5,46,22,.025)" : "";
    tableRows += `<tr style="${bg}">
      <td style="padding:6px 8px;font-size:12px;color:#052e16;">${esc(cat)}</td>
      <td style="padding:6px 8px;font-size:12px;text-align:right;color:rgba(5,46,22,.7);">${fmtInt(list.length)}</td>
      <td style="padding:6px 8px;font-size:12px;text-align:right;color:#052e16;font-weight:600;">${fmtKg(kg)}</td>
    </tr>`;
    idx++;
  }

  // ── SVGs
  const svgEmit   = donutSvg(emitSlices,   260, 260, 88, 56, "Total", fmtKg(totalKg), "kgCO2e");
  const svgMon    = donutSvg(slicesMon,    180, 180, 60, 38, "Valorisées", fmtInt(foundRows.length), "lignes");
  const svgFound  = donutSvg(slicesFound,  180, 180, 60, 38, "Total", fmtInt(totalLines), "lignes");
  const catSvgs   = catData.map((c) =>
    donutSvg(c.slices, 130, 130, 46, 29, "Total", fmtKg(sumKg(c.rows)), "kgCO2e", true)
  );

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
    background: #f9fafb;
    color: #052e16;
    padding: 28px 32px;
    font-size: 13px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ─ Cards */
  .card {
    background: white;
    border-radius: 14px;
    border: 1px solid rgba(5,46,22,.12);
    padding: 16px;
  }

  /* ─ KPI */
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
  .kpi-card { background: white; border-radius: 14px; border: 1px solid rgba(5,46,22,.12); padding: 14px 16px 14px 20px; position: relative; overflow: hidden; }
  .kpi-accent { position: absolute; left: 0; top: 14px; bottom: 14px; width: 4px; border-radius: 0 3px 3px 0; background: #047857; }
  .kpi-label { font-size: 11px; color: rgba(5,46,22,.55); margin-bottom: 4px; }
  .kpi-value { font-size: 22px; font-weight: 700; color: #052e16; line-height: 1.1; }
  .kpi-sub   { font-size: 11px; color: rgba(5,46,22,.55); margin-top: 4px; }

  /* ─ Sections */
  .section-title { font-size: 17px; font-weight: 700; margin-bottom: 4px; }
  .section-sub   { font-size: 11px; color: rgba(5,46,22,.55); margin-bottom: 14px; }

  /* ─ Grand donut */
  .big-donut-card { display: flex; align-items: center; gap: 28px; margin-bottom: 16px; }
  .big-donut-legend { flex: 1; }

  /* ─ FE grid */
  .fe-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .fe-card { display: flex; align-items: center; gap: 20px; }
  .fe-legend { flex: 1; }

  /* ─ Catégories */
  .cat-title { font-size: 13px; font-weight: 700; margin-bottom: 14px; margin-top: 24px; }
  .cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .cat-card { padding: 12px 14px; }
  .cat-card-title { font-size: 11px; font-weight: 700; margin-bottom: 2px; }
  .cat-card-sub   { font-size: 10px; color: rgba(5,46,22,.55); margin-bottom: 8px; }
  .cat-donut-row  { display: flex; justify-content: center; margin-bottom: 8px; }

  /* ─ Table */
  .table-section { margin-top: 28px; }
  .table-title { font-size: 15px; font-weight: 700; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  thead th { font-size: 11px; font-weight: 600; color: rgba(5,46,22,.55); padding: 6px 8px; text-align: left; border-bottom: 2px solid #047857; }
  thead th:not(:first-child) { text-align: right; }
  tbody tr:last-child td { border-bottom: none; }
  tbody td { border-bottom: 1px solid rgba(5,46,22,.08); }
  tfoot td { border-top: 2px solid #0F3D2E; padding: 7px 8px; font-size: 12px; font-weight: 700; }
  tfoot td:not(:first-child) { text-align: right; }

  /* ─ Print */
  @page { size: A4; margin: 18px 26px; }
  @media print {
    .page-break { page-break-before: always; }
    .no-break   { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<!-- ══ PAGE 1 : Synthèse ══════════════════════════════════════════════════════ -->
<div class="section-title">Synthèse des résultats</div>
<div class="section-sub">Projet&nbsp;: ${esc(projectId)}</div>

<!-- KPI -->
<div class="kpi-grid">
  <div class="kpi-card no-break">
    <div class="kpi-accent"></div>
    <div class="kpi-label">Total lignes</div>
    <div class="kpi-value">${fmtInt(totalLines)}</div>
  </div>
  <div class="kpi-card no-break">
    <div class="kpi-accent"></div>
    <div class="kpi-label">Total émissions</div>
    <div class="kpi-value">${fmtKg(totalKg)}</div>
    <div class="kpi-sub">kgCO2e</div>
  </div>
  <div class="kpi-card no-break">
    <div class="kpi-accent" style="background:#9F2D20;"></div>
    <div class="kpi-label">Non valorisées</div>
    <div class="kpi-value">${fmtInt(notFoundRows.length)}</div>
    <div class="kpi-sub">${fmtPct(notFoundPct)}</div>
  </div>
</div>

<!-- Grand donut émissions par catégorie -->
<div class="card big-donut-card no-break">
  <div>
    <div style="font-size:12px;font-weight:700;margin-bottom:4px;">Émissions par catégorie</div>
    <div style="font-size:10px;color:rgba(5,46,22,.55);margin-bottom:12px;">${fmtKg(totalKg)} kgCO2e &bull; ${fmtInt(totalLines)} lignes</div>
    ${svgEmit}
  </div>
  <div class="big-donut-legend">
    ${legendHtml(emitSlices, "kgCO2e", fmtKg)}
  </div>
</div>

<!-- 2 donuts FE -->
<div class="fe-grid">
  <div class="card fe-card no-break">
    <div>${svgMon}</div>
    <div class="fe-legend">
      <div style="font-size:11px;font-weight:700;margin-bottom:3px;">Part de FE monétaire</div>
      <div style="font-size:10px;color:rgba(5,46,22,.55);margin-bottom:10px;">${fmtPct(monetaryPct)} moné. &bull; ${fmtInt(foundRows.length)} lgn valorisées</div>
      ${legendHtml(slicesMon, "lignes", fmtInt)}
    </div>
  </div>
  <div class="card fe-card no-break">
    <div>${svgFound}</div>
    <div class="fe-legend">
      <div style="font-size:11px;font-weight:700;margin-bottom:3px;">Taux de lignes valorisées</div>
      <div style="font-size:10px;color:rgba(5,46,22,.55);margin-bottom:10px;">${fmtPct(notFoundPct)} non valorisées &bull; ${fmtInt(notFoundRows.length)}/${fmtInt(totalLines)}</div>
      ${legendHtml(slicesFound, "lignes", fmtInt)}
    </div>
  </div>
</div>

<!-- ══ PAGE 2 : Détails par catégorie ════════════════════════════════════════ -->
<div class="page-break">
  <div class="section-title" style="margin-bottom:4px;">Détails par catégorie</div>
  <div class="section-sub">Toutes les catégories &bull; Donuts par type de valorisation</div>

  <div class="cat-grid">
    ${catData.map((c, i) => `
    <div class="card cat-card no-break">
      <div class="cat-card-title">${esc(c.title)}</div>
      <div class="cat-card-sub">${fmtKg(sumKg(c.rows))} kgCO2e &bull; ${fmtInt(c.rows.length)} lignes</div>
      <div class="cat-donut-row">${catSvgs[i]}</div>
      <div>${smallLegendHtml(c.slices, "kgCO2e")}</div>
    </div>`).join("")}
  </div>
</div>

<!-- ══ PAGE 3 : Table ════════════════════════════════════════════════════════ -->
<div class="page-break table-section">
  <div class="table-title">Récapitulatif par catégorie</div>
  <table>
    <thead>
      <tr>
        <th>Catégorie</th>
        <th style="text-align:right;">Lignes</th>
        <th style="text-align:right;">kgCO2e</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr>
        <td>Total</td>
        <td style="text-align:right;">${fmtInt(tLines)}</td>
        <td style="text-align:right;">${fmtKg(tKg)}</td>
      </tr>
    </tfoot>
  </table>
</div>

</body>
</html>`;
}

// ─── GET ───────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;

    const [rows, projectRow] = await Promise.all([
      fetchAll(projectId),
      supabaseAdmin.from("projects").select("name").eq("id", projectId).maybeSingle(),
    ]);
    const projectName = projectRow.data?.name ?? projectId;

    const totalKg       = sumKg(rows);
    const notFoundRows  = rows.filter(isNotFound);
    const foundRows     = rows.filter((r) => !isNotFound(r));
    const monetaryRows  = foundRows.filter(isMonetary);
    const physiqueRows  = foundRows.filter((r) => !isMonetary(r));
    const catData       = buildCategories(rows);

    const html = buildHtml(
      projectName, rows, totalKg,
      notFoundRows, foundRows, monetaryRows, physiqueRows,
      catData
    );

    // ── Puppeteer
    const isDev = process.env.NODE_ENV !== "production";
    let executablePath: string;
    let launchArgs: string[];

    if (isDev) {
      // Cherche Chrome/Chromium installé localement (macOS)
      const candidates = [
        process.env.CHROME_EXECUTABLE_PATH,
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
      ].filter(Boolean) as string[];

      let found: string | undefined;
      for (const p of candidates) {
        try { await access(p); found = p; break; } catch {}
      }
      if (!found) throw new Error(
        "Aucun Chrome/Chromium trouvé. Définir CHROME_EXECUTABLE_PATH dans .env.local"
      );
      executablePath = found;
      launchArgs = ["--no-sandbox", "--disable-setuid-sandbox"];
    } else {
      const chromiumUrl =
        process.env.CHROMIUM_PACK_URL ??
        "https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar";
      executablePath = await chromium.executablePath(chromiumUrl);
      launchArgs = chromium.args;
    }

    const browser = await puppeteerCore.launch({
      args: launchArgs,
      defaultViewport: { width: 1200, height: 900 },
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "18px", bottom: "18px", left: "26px", right: "26px" },
    });

    await browser.close();

    // Buffer → ArrayBuffer (BodyInit-compatible)
    const ab = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;

    return new Response(ab, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="synthese-${projectName.replace(/[^a-z0-9]/gi, "-")}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("[pdf]", e);
    return new Response(e?.message ?? "PDF error", { status: 500 });
  }
}
