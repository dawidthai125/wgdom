import { X } from "lucide-react";
import { TEUX_FONT_CAPTION, TEUX_FONT_TITLE, TEUX_TRANSITION_FAST } from "@/lib/tender-ux-tokens";
import {
  TenderListFiltersPanel,
  type TenderListFiltersPanelProps,
} from "@/app/tenders/list/TenderListFiltersPanel";

export function TenderListFilterSheet({
  open,
  onClose,
  panelProps,
}: {
  open: boolean;
  onClose: () => void;
  panelProps: TenderListFiltersPanelProps;
}) {
  if (!open) return null;

  return (
    <div
      className="lg:hidden fixed inset-0 z-50"
      data-tender-list-filter-sheet
      role="dialog"
      aria-modal="true"
      aria-label="Filtry listy przetargów"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        aria-label="Zamknij filtry"
        onClick={onClose}
      />
      <div
        className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl px-4 pt-4 max-h-[85dvh] flex flex-col"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 shrink-0">
          <p className={TEUX_FONT_TITLE}>Filtry listy</p>
          <button
            type="button"
            onClick={onClose}
            className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground ${TEUX_TRANSITION_FAST}`}
            aria-label="Zamknij"
          >
            <X size={18} />
          </button>
        </div>
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground mb-3 shrink-0`}>
          Kolejka, klienci, zakres i presety — bez utraty funkcji z wersji desktop.
        </p>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-1 px-1 pb-2">
          <TenderListFiltersPanel {...panelProps} />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full min-h-[44px] rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shrink-0"
        >
          Gotowe
        </button>
      </div>
    </div>
  );
}
