import type { ReactNode } from "react";
import { Info } from "lucide-react";
import type { BoqAthPresentationMeta } from "@/lib/tender-kosztorys-boq-ath-presentation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";

/** NG-04.3 #006 — jedyny adapter cache → Radix Tooltip (lookup only). */
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

  if (!tooltip) {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex items-center justify-end gap-0.5 cursor-help min-h-[44px] md:min-h-0"
          data-kosztorys-ath-tooltip={meta?.athCellState}
        >
          <span className={meta?.athCellState === "no_value_doc" || meta?.athCellState === "no_match"
            ? "border-b border-dashed border-muted-foreground/50"
            : undefined}
          >
            {children}
          </span>
          <Info size={12} className="shrink-0 text-muted-foreground" aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
