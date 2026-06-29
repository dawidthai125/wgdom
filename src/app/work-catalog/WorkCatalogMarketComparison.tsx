import { useMemo } from "react";
import type { CatalogWork } from "@/lib/work-catalog";
import { workCatalogUnitLabelPl } from "@/app/work-catalog/work-catalog-list";
import { formatCompanyPricePlnLabel } from "@/app/work-catalog/work-catalog-bulk-price";
import { buildMarketComparisonForWork } from "@/app/work-catalog/work-catalog-market-comparison";

type Props = {
  work: CatalogWork;
};

export function WorkCatalogMarketComparison({ work }: Props) {
  const comparison = useMemo(
    () => buildMarketComparisonForWork(work),
    [work.companyPricePln, work.marketAvgPln, work.updatedAt],
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
