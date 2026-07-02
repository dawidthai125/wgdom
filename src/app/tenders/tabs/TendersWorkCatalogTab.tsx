import { WorkCatalogView } from "@/app/work-catalog/WorkCatalogView";

export function TendersWorkCatalogTab() {
  return (
    <div
      data-mobile-scroll-root="tenders-workcatalog"
      className="mobile-view-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <WorkCatalogView layout="embedded" />
    </div>
  );
}
