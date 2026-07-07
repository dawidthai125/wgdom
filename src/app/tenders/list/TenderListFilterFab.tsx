import { SlidersHorizontal } from "lucide-react";
import { TEUX_FONT_CAPTION, TEUX_TRANSITION_FAST } from "@/lib/tender-ux-tokens";

export function TenderListFilterFab({
  activeCount,
  onClick,
}: {
  activeCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`lg:hidden fixed right-4 z-40 inline-flex items-center justify-center gap-2 min-w-[48px] min-h-[48px] px-4 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 ${TEUX_TRANSITION_FAST}`}
      style={{ bottom: "max(5.5rem, calc(4.5rem + env(safe-area-inset-bottom)))" }}
      aria-label={activeCount > 0 ? `Filtry (${activeCount} aktywnych)` : "Filtry listy"}
      data-teux7a-filter-fab
    >
      <SlidersHorizontal size={20} className="shrink-0" />
      {activeCount > 0 && (
        <span className={`${TEUX_FONT_CAPTION} font-semibold tabular-nums`}>{activeCount}</span>
      )}
    </button>
  );
}
