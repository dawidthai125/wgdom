import type { CatalogWork } from "@/lib/work-catalog";
import { tradeLabelPl } from "@/lib/work-catalog";
import { workCatalogUnitLabelPl } from "@/app/work-catalog/work-catalog-list";
import { WorkCatalogActiveToggle } from "@/app/work-catalog/WorkCatalogActiveToggle";
import { WorkCatalogCompanyPriceField } from "@/app/work-catalog/WorkCatalogCompanyPriceField";
import { WorkCatalogMarketComparison } from "@/app/work-catalog/WorkCatalogMarketComparison";
import type { UpdateCompanyPriceResult, UpdateWorkActiveResult } from "@/app/hooks/useWorkCatalog";

type Props = {
  work: CatalogWork;
  onSaveCompanyPrice: (
    workId: string,
    companyPricePln: number,
  ) => Promise<UpdateCompanyPriceResult>;
  onToggleActive: (workId: string, active: boolean) => Promise<UpdateWorkActiveResult>;
  bulkEditMode?: boolean;
  bulkSelected?: boolean;
  onBulkSelectToggle?: (workId: string, selected: boolean) => void;
};

export function WorkCatalogWorkRow({
  work,
  onSaveCompanyPrice,
  onToggleActive,
  bulkEditMode = false,
  bulkSelected = false,
  onBulkSelectToggle,
}: Props) {
  return (
    <li className="rounded-xl border border-border bg-card px-3 py-3 sm:px-4">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {bulkEditMode && onBulkSelectToggle && (
            <label className="flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center">
              <input
                type="checkbox"
                checked={bulkSelected}
                onChange={(e) => onBulkSelectToggle(work.id, e.target.checked)}
                className="h-5 w-5 rounded border-border accent-primary"
                aria-label={`Zaznacz ${work.namePl}`}
              />
            </label>
          )}
          <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{work.namePl}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {tradeLabelPl(work.tradeId)}
            <span className="mx-1.5 text-border">·</span>
            {workCatalogUnitLabelPl(work.unit)}
          </p>
          </div>
        </div>
        {!bulkEditMode && <WorkCatalogActiveToggle work={work} onToggle={onToggleActive} />}
      </div>
      {!bulkEditMode && (
        <>
          <WorkCatalogCompanyPriceField work={work} onSave={onSaveCompanyPrice} />
          <WorkCatalogMarketComparison work={work} />
        </>
      )}
    </li>
  );
}
