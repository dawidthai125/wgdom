import { useMemo } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { buildKpiBarProCells } from "@/lib/tender-detail-v4-display";

export function TenderDetailKpiBar({
  item,
  swz,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
}) {
  const cells = useMemo(() => buildKpiBarProCells(item, swz), [item, swz]);

  return (
    <div className="rounded-xl border border-border bg-card/80 overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
        {cells.map((cell) => (
          <div key={cell.label} className="px-3 py-2.5 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
              {cell.label}
            </p>
            <p className="text-xs sm:text-sm font-medium text-foreground mt-0.5 tabular-nums break-words">
              {cell.value}
            </p>
            {cell.subValue && (
              <p className="text-[10px] font-semibold text-primary mt-0.5 tabular-nums">{cell.subValue}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
