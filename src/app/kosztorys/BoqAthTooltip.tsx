import type { ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";
import type { BoqAthPresentationMeta } from "@/lib/tender-kosztorys-boq-ath-presentation";
import { TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";

/** NG-04.3 #006 · NG-04.4 ATH-01/02/M-01 — adapter cache → Radix Tooltip (lookup only). */
export function BoqAthTooltip({
  rowKey,
  cache,
  children,
}: {
  rowKey: string;
  cache: ReadonlyMap<string, BoqAthPresentationMeta>;
  children: ReactNode;
}) {
  const meta = cache.get(rowKey);
  const tooltip = meta?.tooltipPl?.trim() ?? "";

  // ATH-01: priced — brak tooltipu w UI (copy w lib bez zmian)
  if (!tooltip || meta?.athCellState === "priced") {
    return <>{children}</>;
  }

  const showDashed = meta?.athCellState === "no_value_doc" || meta?.athCellState === "no_match";

  return (
    <TooltipPrimitive.Root>
      <span className="inline-flex items-center justify-end gap-0.5">
        <span className={showDashed ? "border-b border-dashed border-muted-foreground/50" : undefined}>
          {children}
        </span>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center shrink-0 min-h-[44px] min-w-[44px] md:min-h-6 md:min-w-6 md:p-0 p-2 -m-1 rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={tooltip}
            data-kosztorys-ath-tooltip={meta?.athCellState}
          >
            <Info size={12} aria-hidden />
          </button>
        </TooltipTrigger>
      </span>
      <TooltipContent side="top" className="max-w-xs">
        {tooltip}
      </TooltipContent>
    </TooltipPrimitive.Root>
  );
}
