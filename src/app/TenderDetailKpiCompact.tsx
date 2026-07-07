import { useMemo } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { buildKpiBarCompactCells } from "@/lib/tender-detail-v4-display";
import {
  TEUX_KPI_COMPACT_CELL,
  TEUX_KPI_COMPACT_CONTAINER,
  TEUX_KPI_COMPACT_LABEL,
  TEUX_KPI_COMPACT_SUBVALUE,
  TEUX_KPI_COMPACT_VALUE,
} from "@/lib/tender-ux-tokens";

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
    <div className={TEUX_KPI_COMPACT_CONTAINER} data-tender-kpi-compact>
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
        {cells.map((cell) => (
          <div key={cell.label} className={TEUX_KPI_COMPACT_CELL}>
            <p className={`${TEUX_KPI_COMPACT_LABEL} truncate`}>{cell.label}</p>
            <p className={`${TEUX_KPI_COMPACT_VALUE} mt-0.5`}>{cell.value}</p>
            {cell.subValue && (
              <p className={`${TEUX_KPI_COMPACT_SUBVALUE} mt-0.5`}>{cell.subValue}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
