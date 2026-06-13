import type { MaterialRateHistoryView } from "@/lib/material-history";
import { formatMaterialRateLabel } from "@/lib/material-history";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import type { MaterialHistoryImpactResult } from "@/lib/material-impact";
import { formatMaterialImpactPln, materialImpactClass } from "@/lib/material-impact";

export function MaterialHistoryCell({
  view,
  impact,
  compact = false,
}: {
  view: MaterialRateHistoryView;
  impact?: MaterialHistoryImpactResult | null;
  compact?: boolean;
}) {
  if (!view.hasHistory && compact) {
    return <span className="text-muted-foreground text-[9px]">—</span>;
  }

  if (compact) {
    return (
      <div className="text-[9px] leading-snug space-y-0.5">
        <span className="font-mono tabular-nums font-medium">
          {formatMaterialRateLabel(view.ourMaterialPlnPerUnit, view.unit)}
        </span>
        {view.trend && (
          <span className="text-muted-foreground ml-1">
            {view.trend.icon} {view.trend.labelPl}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="text-[9px] leading-snug space-y-0.5">
      <p>
        <span className="text-muted-foreground">Nasza:</span>{" "}
        <strong className="font-mono tabular-nums">
          {formatMaterialRateLabel(view.ourMaterialPlnPerUnit, view.unit)}
        </strong>
      </p>
      {view.hasHistory && view.historicalPlnPerUnit != null && view.historyDaysAgo != null && (
        <p>
          <span className="text-muted-foreground">{view.historyDaysAgo} dni temu:</span>{" "}
          <strong className="font-mono tabular-nums">
            {formatMaterialRateLabel(view.historicalPlnPerUnit, view.unit)}
          </strong>
        </p>
      )}
      {view.trend && (
        <p>
          <span className="text-muted-foreground">Trend:</span>{" "}
          <span className={`font-medium ${
            view.trend.direction === "up"
              ? "text-orange-700 dark:text-orange-400"
              : view.trend.direction === "down"
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-muted-foreground"
          }`}>
            {view.trend.icon} {view.trend.labelPl}
          </span>
        </p>
      )}
      {impact && !impact.unavailable && impact.impactPln !== 0 && (
        <p>
          <span className="text-muted-foreground">Wpływ:</span>{" "}
          <strong className={`font-mono tabular-nums ${materialImpactClass(impact.impactPln)}`}>
            {formatMaterialImpactPln(impact.impactPln)}
          </strong>
        </p>
      )}
      {!view.hasHistory && (
        <p className="text-muted-foreground">Brak historii</p>
      )}
    </div>
  );
}

export function formatMaterialUnit(unit: WgdomCostUnit): string {
  if (unit === "m2") return "m²";
  if (unit === "m3") return "m³";
  return unit;
}
