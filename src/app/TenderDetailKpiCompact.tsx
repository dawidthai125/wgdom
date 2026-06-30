import { useMemo } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { buildKpiBarCompactCells } from "@/lib/tender-detail-v4-display";

/** NG-03.2 — KPI Compact: Termin · Wartość · Dokumenty · Wycena (Command Layer). */
export function TenderDetailKpiCompact({
  item,
  swz,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
}) {
  const cells = useMemo(() => buildKpiBarCompactCells(item, swz), [item, swz]);

  return (
    <div
      className="rounded-lg border border-border/70 bg-card/60 overflow-hidden"
      data-tender-kpi-compact
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
        {cells.map((cell) => (
          <div key={cell.label} className="px-2.5 py-2 min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
              {cell.label}
            </p>
            <p className="text-[11px] sm:text-xs font-medium text-foreground mt-0.5 tabular-nums break-words leading-snug">
              {cell.value}
            </p>
            {cell.subValue && (
              <p className="text-[9px] font-semibold text-primary mt-0.5 tabular-nums line-clamp-1">
                {cell.subValue}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
