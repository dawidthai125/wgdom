import { useMemo } from "react";
import type { CatalogWork } from "@/lib/work-catalog";
import { workCatalogUnitLabelPl } from "@/app/work-catalog/work-catalog-list";
import { formatCompanyPricePlnLabel } from "@/app/work-catalog/work-catalog-bulk-price";
import { buildEngineMarketComparisonForWork } from "@/app/work-catalog/work-catalog-market-engine";

type Props = {
  work: CatalogWork;
};

export function WorkCatalogMarketComparison({ work }: Props) {
  // WC-P3.3-S2: status i cena rynkowa liczone WYŁĄCZNIE przez Public API Engine (S1).
  // UI nie robi własnych obliczeń — band 🟢🟡🔴 pochodzi z engine.comparison (reuse P2.5).
  const comparison = useMemo(
    () => buildEngineMarketComparisonForWork(work).comparison,
    [work.companyPricePln, work.marketAvgPln, work.marketQuotes, work.updatedAt],
  );

  const unitSuffix = workCatalogUnitLabelPl(work.unit);

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
    </div>
  );
}
