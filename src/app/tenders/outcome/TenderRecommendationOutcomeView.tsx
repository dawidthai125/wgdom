/**
 * TRE-01 Slice A — Outcome UI MVP (rekomendowana cena oferty).
 * Konsumuje wyłącznie TenderRecommendationResult — bez Foundation w UI.
 */

import { ArrowLeft, FileText, LayoutDashboard } from "lucide-react";
import {
  formatRecommendedOfferPln,
  type TenderRecommendationResult,
} from "@/lib/tender-recommendation-result";
import {
  TEUX_FONT_BODY,
  TEUX_FONT_CAPTION,
  TEUX_FONT_DISPLAY,
  TEUX_FONT_HEADLINE,
} from "@/lib/tender-ux-tokens";

const STATUS_TONE: Record<TenderRecommendationResult["qualityStatus"], string> = {
  ready: "text-emerald-700 dark:text-emerald-300",
  review_required: "text-amber-800 dark:text-amber-200",
  running: "text-muted-foreground",
  insufficient_data: "text-red-700 dark:text-red-300",
  failed: "text-red-700 dark:text-red-300",
};

export function TenderRecommendationOutcomeView({
  result,
  onBack,
  onShowCostEstimate,
  onOpenHub,
}: {
  result: TenderRecommendationResult;
  onBack: () => void;
  onShowCostEstimate: () => void;
  onOpenHub: () => void;
}) {
  const priceLabel = formatRecommendedOfferPln(result.recommendedOfferPln);
  const showPrice =
    result.hasBidRecommendation && result.recommendedOfferPln != null;

  return (
    <div
      className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background text-foreground"
      data-tre-01-outcome
      data-tre-01-quality={result.qualityStatus}
      data-tre-01-has-price={showPrice ? "1" : "0"}
    >
      <header className="shrink-0 border-b border-border px-4 sm:px-6 py-3 flex items-center gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary min-h-11"
          onClick={onBack}
          aria-label="Powrót do listy przetargów"
        >
          <ArrowLeft size={18} />
          Lista
        </button>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-medium ${TEUX_FONT_CAPTION}`} title={result.tenderTitle}>
            {result.tenderTitle}
          </p>
          <p className={`truncate text-xs text-muted-foreground ${TEUX_FONT_CAPTION}`}>
            {result.bzpRef}
          </p>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="max-w-xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-6">
          <div>
            <p className={`text-xs uppercase tracking-wide text-muted-foreground mb-2 ${TEUX_FONT_CAPTION}`}>
              Rekomendowana cena oferty
            </p>
            {showPrice ? (
              <p
                className={`text-4xl sm:text-5xl font-semibold tabular-nums tracking-tight ${TEUX_FONT_DISPLAY}`}
                data-tre-01-recommended-pln={String(result.recommendedOfferPln)}
              >
                {priceLabel}
              </p>
            ) : (
              <p className={`text-2xl sm:text-3xl font-semibold ${TEUX_FONT_HEADLINE} ${STATUS_TONE[result.qualityStatus]}`}>
                {result.runPhaseLabelPl}
              </p>
            )}
          </div>

          <p className={`text-sm leading-relaxed ${TEUX_FONT_BODY} ${STATUS_TONE[result.qualityStatus]}`}>
            {result.statusLabelPl}
          </p>

          {result.qualityStatus === "review_required" && (
            <p className={`text-xs text-muted-foreground ${TEUX_FONT_CAPTION}`}>
              Poziom zaufania: {result.trustLabelPl}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              onClick={onShowCostEstimate}
              disabled={!result.canShowCostEstimate}
              data-tre-01-cta-kosztorys
            >
              <FileText size={16} />
              Pokaż pełny kosztorys
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-md border border-border bg-card text-sm font-medium"
              onClick={onOpenHub}
              data-tre-01-cta-hub
            >
              <LayoutDashboard size={16} />
              Szczegóły / Hub
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
