/**
 * TRE-01 Slice A — Outcome UI MVP (rekomendowana cena oferty).
 * Konsumuje wyłącznie TenderRecommendationResult — bez Foundation w UI.
 * COST-REGRESSION-01 EPIC A — CTA F2 (Dołącz / Ponów).
 */

import { ArrowLeft, FileText, LayoutDashboard, Loader2, RefreshCw, Upload } from "lucide-react";
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
import { useAdminAccess } from "@/app/admin-access";
import { resolveTenderExpertEffective } from "@/lib/tender-expert-effective";
import { resolveAuthoritativeOfferPln } from "@/lib/tender-offer-pln-authority";
import {
  BID_PLN_SOURCE_BADGE_PL,
  OFFER_BID_MISMATCH_BADGE_PL,
  OFFER_PLN_SOURCE_BADGE_PL,
} from "@/lib/decision-workspace-ui";

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
  onAttachPrzedmiar,
  onRetryParse,
  reparseBusy = false,
  /** S3 — Offer Expert PLN when session available (badge/primary only). */
  offerPricePln = null,
}: {
  result: TenderRecommendationResult;
  onBack: () => void;
  onShowCostEstimate: () => void;
  onOpenHub: () => void;
  onAttachPrzedmiar?: () => void;
  onRetryParse?: () => void;
  reparseBusy?: boolean;
  offerPricePln?: number | null;
}) {
  const { session } = useAdminAccess();
  const expertEffective = resolveTenderExpertEffective(session?.role);
  const auth = resolveAuthoritativeOfferPln({
    expertEffective,
    offerPricePln,
    recommendedBidPln: result.recommendedOfferPln,
  });
  // S3 DF: Expert ON + Offer null → NO PRIMARY (Hub parity). Never Bid→primary fallback.
  const displayPln = auth.primaryPln;
  const priceLabel = formatRecommendedOfferPln(displayPln);
  const showPrice = displayPln != null && auth.source !== "none";
  const noPrimaryOffer =
    expertEffective && auth.source === "none" && auth.primaryPln == null;
  const sourceBadge =
    auth.source === "offer_expert"
      ? OFFER_PLN_SOURCE_BADGE_PL
      : auth.source === "bid_legacy"
        ? BID_PLN_SOURCE_BADGE_PL
        : null;
  const f2 = result.costRegressionF2;
  const showAttach =
    Boolean(onAttachPrzedmiar) &&
    f2 != null &&
    (f2.primaryCta === "attach" || f2.secondaryCta === "attach");
  const showReparse =
    Boolean(onRetryParse) && f2 != null && f2.primaryCta === "reparse";
  const reparseDisabled = reparseBusy || f2?.discovery === "parse_running";

  return (
    <div
      className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background text-foreground"
      data-tre-01-outcome
      data-tre-01-quality={result.qualityStatus}
      data-tre-01-has-price={showPrice ? "1" : "0"}
      data-s3-primary-source={auth.source}
      data-s3-tre-no-primary={noPrimaryOffer ? "1" : "0"}
      data-cost-regression-f2={f2 ? "1" : "0"}
      data-cost-regression-discovery={f2?.discovery ?? undefined}
      data-cost-regression-archive={f2?.archiveCandidate ? "1" : undefined}
      data-cost-parser-zip-state={f2?.zipState ?? undefined}
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
            {sourceBadge && (
              <p
                className={`text-[10px] text-muted-foreground mb-1 ${TEUX_FONT_CAPTION}`}
                data-s3-tre-source-badge
              >
                {sourceBadge}
              </p>
            )}
            <p
              className={`text-[10px] text-muted-foreground mb-3 ${TEUX_FONT_CAPTION}`}
              data-s2-tre-demote-note
            >
              Rekomendacja ceny / procesu — nie decyzja Decydenta
            </p>
            {showPrice ? (
              <p
                className={`text-4xl sm:text-5xl font-semibold tabular-nums tracking-tight ${TEUX_FONT_DISPLAY}`}
                data-tre-01-recommended-pln={String(displayPln)}
                data-s3-tre-primary-pln={String(displayPln)}
              >
                {priceLabel}
              </p>
            ) : (
              <p
                className={`text-2xl sm:text-3xl font-semibold ${TEUX_FONT_HEADLINE} ${STATUS_TONE[result.qualityStatus]}`}
                data-s3-tre-no-primary-headline={noPrimaryOffer ? "1" : undefined}
              >
                {result.runPhaseLabelPl}
              </p>
            )}
            {expertEffective &&
              !noPrimaryOffer &&
              auth.secondaryBidPln != null &&
              auth.primaryPln != null &&
              auth.secondaryBidPln !== auth.primaryPln && (
                <p
                  className={`text-[10px] text-muted-foreground mt-2 ${TEUX_FONT_CAPTION}`}
                  data-s3-tre-bid-secondary
                >
                  {BID_PLN_SOURCE_BADGE_PL}:{" "}
                  {formatRecommendedOfferPln(auth.secondaryBidPln)}
                </p>
              )}
            {auth.mismatch && (
              <p
                className={`text-[10px] text-amber-700 dark:text-amber-300 mt-1 ${TEUX_FONT_CAPTION}`}
                data-s3-tre-mismatch
              >
                {OFFER_BID_MISMATCH_BADGE_PL}
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

          {(showAttach || showReparse) && (
            <div className="flex flex-col sm:flex-row gap-3" data-cost-regression-cta-row>
              {showReparse && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                  onClick={onRetryParse}
                  disabled={reparseDisabled}
                  data-cost-regression-reparse-cta
                >
                  {reparseDisabled ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  Ponów analizę kosztorysu
                </button>
              )}
              {showAttach && (
                <button
                  type="button"
                  className={`inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-md text-sm font-medium ${
                    f2?.primaryCta === "attach"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card"
                  }`}
                  onClick={onAttachPrzedmiar}
                  data-cost-regression-attach-cta
                >
                  <Upload size={16} />
                  Dołącz przedmiar
                </button>
              )}
            </div>
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
              Pokaż pełny kosztorys ofertowy
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
