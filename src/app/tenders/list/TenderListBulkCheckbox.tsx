import type { MouseEvent } from "react";
import { CheckSquare, Square } from "lucide-react";

/** Bulk checkbox — touch target ≥44px (TEUX-3). */
export function TenderListBulkCheckbox({
  selected,
  onToggle,
}: {
  selected: boolean;
  onToggle: (e: MouseEvent) => void;
}) {
  return (
    <span
      role="checkbox"
      aria-checked={selected}
      className="shrink-0 inline-flex items-center justify-center min-h-[44px] min-w-[44px] touch-manipulation"
      onClick={onToggle}
    >
      {selected ? (
        <CheckSquare size={16} className="text-primary" />
      ) : (
        <Square size={16} className="text-muted-foreground" />
      )}
    </span>
  );
}
