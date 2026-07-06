import { Tags } from "lucide-react";
import { TenderPriceBasePanel } from "@/app/TenderPriceBasePanel";
import { useTendersContext } from "@/app/tenders/context/TendersContext";
import { TENDERS_MODULE_LABELS } from "@/lib/tenders-module-labels";
import { CATALOG_UX_WORK_CATALOG_TAB_LABEL } from "@/lib/tender-catalog-ux-labels";

export function TendersPriceBaseTab() {
  const { bumpProfileVersion } = useTendersContext();

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-3"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-2">
        <Tags size={16} className="text-primary" />
        <h2 className="text-sm font-semibold">{TENDERS_MODULE_LABELS.tabs.pricebase}</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Podgląd stawek kategorii (tylko odczyt) oraz edycja parametrów firmy — ceny pozycji w{" "}
        {CATALOG_UX_WORK_CATALOG_TAB_LABEL}.
      </p>
      <TenderPriceBasePanel onSaved={() => bumpProfileVersion()} />
    </div>
  );
}
