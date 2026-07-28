/**
 * COSTORYS-UX-01 WAVE 1 — Sticky Offer Summary Bar (read-only display).
 */

import { TEUX_FONT_CAPTION, TEUX_FONT_META } from "@/lib/tender-ux-tokens";

export function OfferBoqStickySummaryBar({
  recommendedBidDisplay,
  directCostDisplay,
  reviewRequiredCount,
  reviewOnly,
  onReviewOnlyChange,
}: {
  recommendedBidDisplay: string;
  directCostDisplay: string;
  reviewRequiredCount: number;
  reviewOnly: boolean;
  onReviewOnlyChange: (next: boolean) => void;
}) {
  return (
    <div
      className="sticky top-0 z-20 -mx-1 px-1 py-2 mb-2 bg-background/95 backdrop-blur-sm border-b border-border/80"
      data-offer-boq-sticky-summary
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
      <p className={`${TEUX_FONT_CAPTION} text-muted-foreground mt-1 px-1`}>
        Podsumowanie oferty (L2) — widoczne przy przewijaniu pozycji.
      </p>
    </div>
  );
}
