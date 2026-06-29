import { WorkCatalogView } from "@/app/work-catalog/WorkCatalogView";

export function TendersWorkCatalogTab() {
  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <WorkCatalogView embedded />
    </div>
  );
}
