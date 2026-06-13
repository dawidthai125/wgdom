import type { LaborBenchmarkComparison, LaborBenchmarkStatus, LaborRateTrend } from "@/lib/labor-benchmark";
import {
  laborBenchmarkStatusClass,
  laborBenchmarkStatusIcon,
} from "@/lib/labor-benchmark";
import {
  formatLaborBenchmarkImpactPln,
  laborBenchmarkImpactClass,
  type LaborBenchmarkImpactResult,
} from "@/lib/labor-benchmark-impact";
import {
  formatLaborBenchmarkEditionDate,
  getActiveLaborBenchmarkEdition,
  type LaborBenchmarkEdition,
} from "@/lib/labor-benchmark-data";
import type { WgdomCostRegion } from "@/lib/wgdom-cost-catalog";

function unitSuffix(unit: string): string {
  if (unit === "m2") return "m²";
  if (unit === "m3") return "m³";
  return unit;
}

export function LaborBenchmarkStatusBadge({
  comparison,
  compact = false,
}: {
  comparison: LaborBenchmarkComparison;
  compact?: boolean;
}) {
  const { status, statusLabelPl } = comparison;
  if (status === "unavailable") {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className={`inline-flex items-center gap-0.5 font-medium ${laborBenchmarkStatusClass(status)}`}>
      <span aria-hidden>{laborBenchmarkStatusIcon(status)}</span>
      {!compact && <span>{statusLabelPl}</span>}
      {compact && status === "ok" && <span>OK</span>}
      {compact && status !== "ok" && <span>{statusLabelPl}</span>}
    </span>
  );
}

function TrendLine({ trend }: { trend: LaborRateTrend | null }) {
  if (!trend) return null;
  const color =
    trend.direction === "up"
      ? "text-orange-700 dark:text-orange-400"
      : trend.direction === "down"
        ? "text-emerald-700 dark:text-emerald-400"
        : "text-muted-foreground";
  return (
    <p>
      <span className="text-muted-foreground">Trend:</span>{" "}
      <span className={`font-medium ${color}`}>
        {trend.icon} {trend.labelPl}
      </span>
    </p>
  );
}

export function LaborBenchmarkCell({
  comparison,
  showOurRate = true,
  showTripleView = false,
  impact,
}: {
  comparison: LaborBenchmarkComparison;
  showOurRate?: boolean;
  showTripleView?: boolean;
  impact?: LaborBenchmarkImpactResult | null;
}) {
  if (comparison.status === "unavailable") {
    return <span className="text-muted-foreground text-[9px]">Brak benchmarku</span>;
  }

  if (showTripleView) {
    return (
      <div className="text-[9px] leading-snug space-y-0.5">
        {showOurRate && (
          <p>
            <span className="text-muted-foreground">Nasza:</span>{" "}
            <strong className="font-mono tabular-nums">
              {comparison.ourLaborPlnPerUnit.toLocaleString("pl-PL")} zł/{unitSuffix(comparison.unit)}
            </strong>
          </p>
        )}
        <p>
          <span className="text-muted-foreground">Rynek:</span>{" "}
          <strong className="font-mono tabular-nums">{comparison.rangeLabelPl}</strong>
        </p>
        {comparison.historyPlnPerUnit != null && comparison.historyDaysAgo != null && (
          <p>
            <span className="text-muted-foreground">{comparison.historyDaysAgo} dni temu:</span>{" "}
            <strong className="font-mono tabular-nums">
              {comparison.historyPlnPerUnit.toLocaleString("pl-PL")} zł/{unitSuffix(comparison.unit)}
            </strong>
          </p>
        )}
        <TrendLine trend={comparison.trend} />
        {impact && !impact.unavailable && impact.quantity > 0 && impact.impactPln !== 0 && (
          <p>
            <span className="text-muted-foreground">Wpływ:</span>{" "}
            <strong className={`font-mono tabular-nums ${laborBenchmarkImpactClass(impact.impactPln)}`}>
              {formatLaborBenchmarkImpactPln(impact.impactPln)}
            </strong>
          </p>
        )}
        <p>
          <span className="text-muted-foreground">Status:</span>{" "}
          <LaborBenchmarkStatusBadge comparison={comparison} />
        </p>
      </div>
    );
  }

  return (
    <div className="text-[9px] leading-snug space-y-0.5">
      {showOurRate && (
        <p>
          <span className="text-muted-foreground">Nasza:</span>{" "}
          <strong className="font-mono tabular-nums">
            {comparison.ourLaborPlnPerUnit.toLocaleString("pl-PL")} zł/{unitSuffix(comparison.unit)}
          </strong>
        </p>
      )}
      <p>
        <span className="text-muted-foreground">Rynek:</span>{" "}
        <strong className="font-mono tabular-nums">{comparison.rangeLabelPl}</strong>
      </p>
      <p>
        <span className="text-muted-foreground">Status:</span>{" "}
        <LaborBenchmarkStatusBadge comparison={comparison} />
      </p>
    </div>
  );
}

export function LaborBenchmarkCompactRow({
  ourLaborPlnPerUnit,
  comparison,
}: {
  ourLaborPlnPerUnit: number;
  comparison: LaborBenchmarkComparison;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
      <span className="font-mono tabular-nums font-medium">
        {ourLaborPlnPerUnit.toLocaleString("pl-PL")} zł/{unitSuffix(comparison.unit)}
      </span>
      <span className="text-muted-foreground">{comparison.rangeLabelPl}</span>
      <LaborBenchmarkStatusBadge comparison={comparison} compact />
      {comparison.trend && (
        <span className="text-muted-foreground">
          {comparison.trend.icon} {comparison.trend.labelPl}
        </span>
      )}
    </div>
  );
}

function sourceTypeLabel(type: LaborBenchmarkEdition["sources"][number]["type"]): string {
  if (type === "market_estimate") return "szacunek rynku";
  if (type === "calibration") return "kalibracja";
  return "wewnętrzne";
}

export function LaborBenchmarkSourcePanel({
  region = "wroclaw",
  coverageLabel,
}: {
  region?: WgdomCostRegion;
  coverageLabel?: string;
}) {
  const edition = getActiveLaborBenchmarkEdition(region);
  return (
    <details className="rounded-lg border border-border/60 bg-secondary/20 px-2.5 py-2 text-[10px]">
      <summary className="cursor-pointer font-semibold text-foreground">
        Źródło benchmarku
      </summary>
      <div className="mt-2 space-y-1.5 text-muted-foreground leading-snug">
        <p>
          <strong className="text-foreground">{edition.labelPl}</strong>
          {" · "}{edition.region === "wroclaw" ? "Wrocław" : "Dolny Śląsk"}
        </p>
        <p>
          Źródła: <strong className="text-foreground">{edition.sources.length}</strong>
          {" · "}Aktualizacja:{" "}
          <strong className="text-foreground">{formatLaborBenchmarkEditionDate(edition.effectiveFrom)}</strong>
        </p>
        {coverageLabel && (
          <p>
            Pokrycie benchmarku: <strong className="text-foreground">{coverageLabel}</strong>
          </p>
        )}
        <p className="text-[9px] opacity-90">{edition.methodologyNote}</p>
        <ul className="list-none space-y-0.5 pt-0.5">
          {edition.sources.map((src) => (
            <li key={src.label}>
              · {src.label}
              <span className="opacity-75">
                {" "}({sourceTypeLabel(src.type)}
                {src.accessedAt ? ` · ${formatLaborBenchmarkEditionDate(src.accessedAt)}` : ""})
              </span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

export type { LaborBenchmarkStatus };
