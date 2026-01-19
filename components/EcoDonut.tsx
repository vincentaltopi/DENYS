import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Label } from "recharts";
import type { TooltipProps } from "recharts";
import SmallLegend from "./charts/SmallLegend";

type DonutDatum = {
  name: string;
  value: number;
  lines?: number;
};

type EcoDonutProps = {
  title: string;
  subtitle?: string;
  data: DonutDatum[];
  colors: string[];
  centerLabel?: string;
  tooltipContent?: (props: TooltipProps<number, string>) => React.ReactNode;
  rightLegend?: boolean;
  unit?: string;
};

export default function EcoDonut({
  title,
  subtitle,
  data,
  colors,
  centerLabel = "Total",
  tooltipContent,
  rightLegend = false,
  unit = "",
}: EcoDonutProps) {
  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);

  const totalDisplay = total.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const legendItems = data
    .map((d, i) => ({
      value: d.name,
      color: colors[i % colors.length],
      lines: d.lines ?? 0,
      v: Number(d.value) || 0,
    }))
    .filter((x) => x.v > 0 || x.lines > 0);

  const showLegend = legendItems.length >= 2;

  return (
    <div className="flex w-full flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-emerald-950">{title}</h3>
        {subtitle && <p className="text-xs text-emerald-950/60">{subtitle}</p>}
      </div>

      <div className={rightLegend ? "flex gap-4" : ""}>
        <div className="relative h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="65%"
                outerRadius="85%"
                paddingAngle={1}
                stroke="none"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}

                <Label
                  position="center"
                  content={() => (
                    <div className="text-center">
                      <div className="text-xs text-emerald-950/60">{centerLabel}</div>
                      <div className="text-lg font-semibold text-emerald-950">{totalDisplay}</div>
                      {unit && <div className="text-xs text-emerald-950/60">{unit}</div>}
                    </div>
                  )}
                />
              </Pie>

              <Tooltip content={tooltipContent} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {rightLegend && showLegend && (
          <div className="mt-2 max-h-[56px] overflow-y-auto">
            <SmallLegend payload={legendItems} />
          </div>
        )}
      </div>
    </div>
  );
}
