import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { BoqAthDocumentMeta } from "@/lib/tender-kosztorys-boq-ath-presentation";
import {
  costDocumentTypeLabel,
  shortenAthSourceFilename,
} from "@/lib/tender-kosztorys-boq-ath-presentation";
import { TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import { BoqAthExplainLink } from "@/app/kosztorys/BoqAthExplainLink";

/** NG-04.3 #009 · NG-04.4 ATH-04 — document-level source chip + optional CTA. */
export function BoqAthSourceStrip({
  meta,
  onOpenAthPreview,
  showExplainLink = false,
}: {
  meta: BoqAthDocumentMeta;
  onOpenAthPreview?: () => void;
  showExplainLink?: boolean;
}) {
  const shortName = shortenAthSourceFilename(meta.sourceFilename);
  const fileAriaLabel = `Plik źródłowy: ${meta.sourceFilename}`;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      data-kosztorys-ath-source-strip
    >
      <span className="inline-flex items-center min-h-[28px] px-2 py-0.5 rounded-full text-[10px] font-semibold border border-primary/30 bg-primary/10 text-primary">
        {costDocumentTypeLabel(meta.sourceType)}
      </span>

      {meta.confidenceLabel && (
        <span className="inline-flex items-center min-h-[28px] px-2 py-0.5 rounded-full text-[10px] font-medium border border-border bg-secondary/40 text-muted-foreground">
          Pewność: {meta.confidenceLabel}
        </span>
      )}

      <TooltipPrimitive.Root>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center min-h-[28px] px-2 py-0.5 rounded-full text-[10px] font-mono border border-border bg-background text-muted-foreground cursor-help max-w-[200px] truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={fileAriaLabel}
          >
            {shortName}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm font-mono text-[10px]">
          {meta.sourceFilename}
        </TooltipContent>
      </TooltipPrimitive.Root>

      {meta.pdfCaseLabel && (
        <span className="text-[10px] text-amber-700 dark:text-amber-400">
          {meta.pdfCaseLabel}
        </span>
      )}

      {showExplainLink && onOpenAthPreview && (
        <BoqAthExplainLink onOpenAthPreview={onOpenAthPreview} />
      )}
    </div>
  );
}
