type LegendItem = {
  value: string;
  color: string;
  lines?: number;
  v?: number;
};

type SmallLegendProps = {
  payload: LegendItem[];
};

export default function SmallLegend({ payload }: SmallLegendProps) {
  if (!payload || payload.length === 0) return null;

  return (
    <ul className="space-y-1 text-xs text-emerald-950/80">
      {payload.map((item, i) => (
        <li key={i} className="flex items-center gap-2">
          {/* Couleur */}
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />

          {/* Libellé */}
          <span className="truncate">{item.value}</span>

          {/* Infos complémentaires */}
          {typeof item.v === "number" && item.v > 0 && (
            <span className="ml-auto text-emerald-950/60">
              {item.v.toLocaleString("fr-FR", {
                maximumFractionDigits: 2,
              })}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
