/**
 * WORK-CATALOG-P3.3 · S5 — Market coverage strip (flag-gated w View).
 */

import type { MarketCoverageSummary } from "@/app/work-catalog/work-catalog-market-coverage";
import {
  isMarketRegionCode,
  marketRegionLabelPl,
  type MarketRegionCode,
} from "@/lib/work-catalog";

type Props = {
  summary: MarketCoverageSummary;
};

export function WorkCatalogMarketCoveragePanel({ summary }: Props) {
  if (summary.total === 0) return null;

  const regionLabel = isMarketRegionCode(summary.startRegionCode)
    ? marketRegionLabelPl(summary.startRegionCode as MarketRegionCode)
    : summary.startRegionCode;

  return (
    <div
      className="mt-3 rounded-xl border border-border bg-card px-3 py-3 sm:px-4"
      data-wc-p33-coverage
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-foreground">Pokrycie rynku</p>
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {summary.enginePct}%
        </p>
        <p className="w-full text-xs text-muted-foreground">
          {summary.engine} z {summary.total} robót ma cenę z silnika (region startu: {regionLabel})
        </p>
      </div>
      <ul
        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
        aria-label="Rozkład pochodzenia ceny rynkowej"
      >
        <CoverageStat label="Silnik" value={summary.engine} />
        <CoverageStat label="Seed" value={summary.legacySeed} />
        <CoverageStat label="Legacy avg" value={summary.legacyAvg} />
        <CoverageStat label="Brak" value={summary.none} />
      </ul>
    </div>
  );
}

function CoverageStat({ label, value }: { label: string; value: number }) {
  return (
    <li className="rounded-lg border border-border/70 bg-background/60 px-2.5 py-2 min-h-[44px] flex flex-col justify-center">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
    </li>
  );
}
