/**
 * COSTORYS-UX-01 WAVE 1 — Sticky Offer Summary Bar (read-only display).
 * COST-REGRESSION-01 EPIC A — opcjonalny copy/CTA F2.
 */

import { Loader2, RefreshCw, Upload } from "lucide-react";
import { TEUX_FONT_CAPTION, TEUX_FONT_META } from "@/lib/tender-ux-tokens";
import type { CostRegressionF2UiCopy } from "@/lib/cost-regression-f2";

export function OfferBoqStickySummaryBar({
  recommendedBidDisplay,
  directCostDisplay,
  reviewRequiredCount,
  reviewOnly,
  onReviewOnlyChange,
  f2Copy = null,
  onAttachPrzedmiar,
  onRetryParse,
  reparseBusy = false,
}: {
  recommendedBidDisplay: string;
  directCostDisplay: string;
  reviewRequiredCount: number;
  reviewOnly: boolean;
  onReviewOnlyChange: (next: boolean) => void;
  f2Copy?: CostRegressionF2UiCopy | null;
  onAttachPrzedmiar?: () => void;
  onRetryParse?: () => void;
  reparseBusy?: boolean;
}) {
  const showF2 = f2Copy != null;
  const reparseDisabled = reparseBusy || f2Copy?.discovery === "parse_running";

  return (
    <div
      className="sticky top-0 z-20 -mx-1 px-1 py-2 mb-2 bg-background/95 backdrop-blur-sm border-b border-border/80"
      data-offer-boq-sticky-summary
      data-cost-regression-f2={showF2 ? "1" : "0"}
      data-cost-regression-discovery={f2Copy?.discovery ?? undefined}
      data-cost-regression-archive={f2Copy?.archiveCandidate ? "1" : undefined}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
        <div className="min-w-0">
          <p className={`${TEUX_FONT_META} font-semibold uppercase tracking-wide text-muted-foreground`}>
            Rekomendacja
          </p>
          <p className="text-sm font-bold text-foreground tabular-nums" data-offer-boq-sticky-recommended>
            {recommendedBidDisplay}
          </p>
        </div>
        <div className="min-w-0">
          <p className={`${TEUX_FONT_META} font-semibold uppercase tracking-wide text-muted-foreground`}>
            Koszt bezpośredni
          </p>
          <p className="text-sm font-semibold text-foreground tabular-nums" data-offer-boq-sticky-direct>
            {directCostDisplay}
          </p>
        </div>
        <div className="min-w-0">
          <p className={`${TEUX_FONT_META} font-semibold uppercase tracking-wide text-muted-foreground`}>
            Do weryfikacji
          </p>
          <p className="text-sm font-semibold text-foreground tabular-nums" data-offer-boq-sticky-review>
            {reviewRequiredCount}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={reviewOnly}
          aria-label="Tylko do weryfikacji"
          onClick={() => onReviewOnlyChange(!reviewOnly)}
          className={`ml-auto min-h-[44px] px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-colors touch-manipulation ${
            reviewOnly
              ? "border-primary bg-primary/15 text-primary"
              : "border-border bg-background text-muted-foreground hover:bg-secondary/40"
          }`}
          data-offer-boq-review-only-filter
        >
          Tylko do weryfikacji
        </button>
      </div>
      {showF2 ? (
        <div className="mt-2 px-1 space-y-2" data-cost-regression-sticky-f2>
          <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>{f2Copy.hintPl}</p>
          <div className="flex flex-wrap gap-2">
            {f2Copy.primaryCta === "reparse" && onRetryParse && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                onClick={onRetryParse}
                disabled={reparseDisabled}
                data-cost-regression-reparse-cta
              >
                {reparseDisabled ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Ponów analizę kosztorysu
              </button>
            )}
            {(f2Copy.primaryCta === "attach" || f2Copy.secondaryCta === "attach") && onAttachPrzedmiar && (
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-md text-xs font-semibold ${
                  f2Copy.primaryCta === "attach"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background"
                }`}
                onClick={onAttachPrzedmiar}
                data-cost-regression-attach-cta
              >
                <Upload size={14} />
                Dołącz przedmiar
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground mt-1 px-1`}>
          Podsumowanie oferty (L2) — widoczne przy przewijaniu pozycji.
        </p>
      )}
    </div>
  );
}
