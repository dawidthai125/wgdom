import { useMemo } from "react";
import type { CatalogWork } from "@/lib/work-catalog";
import { workCatalogUnitLabelPl } from "@/app/work-catalog/work-catalog-list";
import { formatCompanyPricePlnLabel } from "@/app/work-catalog/work-catalog-bulk-price";
import { buildEngineMarketComparisonForWork } from "@/app/work-catalog/work-catalog-market-engine";
import { formatMarketPriceDisplayPl } from "@/app/work-catalog/work-catalog-market-comparison";
import { formatCsvPreviewConfidence } from "@/app/work-catalog/work-catalog-csv-import-preview";

type Props = {
  work: CatalogWork;
};

// WC-P3.3-S3: podpis pochodzenia ceny gdy silnik nie miał źródeł produktowych
// (fallback zgodny z S1/S2). Bez logiki — czysta etykieta z priceOrigin.
const PRICE_ORIGIN_HINT_PL: Partial<Record<string, string>> = {
  legacy_seed: "Dane orientacyjne (seed)",
  legacy_avg: "Dane orientacyjne (legacy)",
};

export function WorkCatalogMarketComparison({ work }: Props) {
  // WC-P3.3-S2/S3: status, cena, źródła i confidence pochodzą WYŁĄCZNIE z Public
  // API Engine (S1). UI nie robi własnych obliczeń ani nie definiuje progów.
  const engine = useMemo(
    () => buildEngineMarketComparisonForWork(work),
    [work.companyPricePln, work.marketAvgPln, work.marketQuotes, work.updatedAt],
  );
  const comparison = engine.comparison;
  const unitSuffix = workCatalogUnitLabelPl(work.unit);
  const originHint = PRICE_ORIGIN_HINT_PL[engine.priceOrigin];

  return (
    <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Cena firmy</p>
        <p className="mt-0.5 text-sm text-foreground">
          {work.companyPricePln > 0
            ? `${formatCompanyPricePlnLabel(work.companyPricePln)} / ${unitSuffix}`
            : "—"}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground">Cena rynkowa</p>
        <p className="mt-0.5 text-sm text-foreground">
          {comparison.marketPricePln != null
            ? `${comparison.marketDisplayPl} / ${unitSuffix}`
            : "—"}
        </p>
        {comparison.marketPricePln != null && originHint && (
          <p className="mt-0.5 text-xs text-muted-foreground">{originHint}</p>
        )}
      </div>

      {comparison.band !== "unavailable" && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Status</p>
          <p className="mt-1 flex min-h-[44px] items-center gap-2 text-sm text-foreground">
            <span className="text-base leading-none" aria-hidden>
              {comparison.statusEmoji}
            </span>
            <span>{comparison.statusLabelPl}</span>
          </p>
        </div>
      )}

      {engine.sources.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Źródła rynkowe ({engine.sources.length})
          </p>
          <ul className="mt-1 space-y-1.5">
            {engine.sources.map((source) => (
              <li
                key={`${source.origin}-${source.regionCode}`}
                className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-foreground"
              >
                <span className="font-medium">{source.originLabelPl}</span>
                <span className="tabular-nums">
                  {formatMarketPriceDisplayPl(source.pricePln)} / {unitSuffix}
                </span>
                <span className="text-xs text-muted-foreground">
                  {source.regionLabelPl}
                  {source.fallbackUsed ? " (fallback)" : ""}
                </span>
                <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                  Pewność {formatCsvPreviewConfidence(source.confidence)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
