import type { KeyboardEvent, MouseEvent } from "react";
import { CheckSquare, Square } from "lucide-react";
import { TEUX_TOUCH_TARGET } from "@/lib/tender-ux-tokens";

/** Bulk checkbox — touch ≥44px (TEUX-3) · keyboard + aria-label (TEUX-7c). */
export function TenderListBulkCheckbox({
  selected,
  onToggle,
  ariaLabel,
}: {
  selected: boolean;
  onToggle: (e: MouseEvent<HTMLButtonElement>) => void;
  ariaLabel: string;
}) {
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      onToggle(e as unknown as MouseEvent<HTMLButtonElement>);
    }
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={ariaLabel}
      className={`shrink-0 inline-flex items-center justify-center min-h-[44px] min-w-[44px] touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md ${TEUX_TOUCH_TARGET}`}
      data-teux7c-bulk-checkbox
      onClick={(e) => {
        e.stopPropagation();
        onToggle(e);
      }}
      onKeyDown={handleKeyDown}
    >
      {selected ? (
        <CheckSquare size={16} className="text-primary" aria-hidden />
      ) : (
        <Square size={16} className="text-muted-foreground" aria-hidden />
      )}
    </button>
  );
}
