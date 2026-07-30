/**
 * SMART-PRICING-01 P0 — banner Detect braków cen (RO).
 * Bez Evidence / One-shot / Save / MS.
 */

import { TEUX_FONT_CAPTION, TEUX_FONT_META } from "@/lib/tender-ux-tokens";
import type {
  SmartPricingDetectSummary,
  SmartPricingMissingReason,
} from "@/lib/smart-pricing";

const REASON_LABEL_PL: Record<SmartPricingMissingReason, string> = {
  unmapped: "brak mapowania na Bibliotekę",
  work_missing: "robota nieznaleziona w katalogu",
  no_quote: "brak ceny w Product Quotes",
  low_confidence: "confidence Quotes poniżej progu",
  stale: "cena Quotes przeterminowana (>180 dni)",
};

export function SmartPricingDetectBanner({
  summary,
  onFocusLine,
}: {
  summary: SmartPricingDetectSummary;
  onFocusLine?: (lineId: string) => void;
}) {
  if (summary.lineCount === 0) return null;

  if (summary.missingCount === 0) {
    return (
      <section
        className="rounded-lg border border-border bg-background/70 p-3 space-y-1"
        data-smart-pricing-01-detect
        data-smart-pricing-01-missing-count="0"
      >
        <h3 className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>
          Smart Pricing — ceny rynkowe
        </h3>
        <p className={`${TEUX_FONT_META} text-muted-foreground`}>
          Wszystkie {summary.lineCount} pozycji mają użyteczną cenę w Product Quotes (region{" "}
          {summary.regionCode}, conf ≥ {summary.minConfidence}, ≤ {summary.staleDays} dni).
          Tryb tylko odczyt — bez zapisu Quotes.
        </p>
      </section>
    );
  }

  const preview = summary.missingLines.slice(0, 8);

  return (
    <section
      className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-2"
      data-smart-pricing-01-detect
      data-smart-pricing-01-missing-count={String(summary.missingCount)}
    >
      <h3 className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>
        Smart Pricing — braki cen rynkowych
      </h3>
      <p className={`${TEUX_FONT_META} text-muted-foreground`}>
        {summary.missingCount} z {summary.lineCount} pozycji bez użytecznej ceny w Product Quotes
        (region {summary.regionCode}). Quotes-first · tylko odczyt · uzupełnij Quotes w Bibliotece
        Robót lub Market Sync (osobny proces Publish).
      </p>
      <ul
        className={`${TEUX_FONT_META} text-muted-foreground space-y-0.5`}
        data-smart-pricing-01-missing-list
      >
        {preview.map((row) => (
          <li key={row.lineId}>
            {onFocusLine ? (
              <button
                type="button"
                className="text-left underline-offset-2 hover:underline touch-manipulation min-h-[44px] sm:min-h-0 py-1"
                onClick={() => onFocusLine(row.lineId)}
                data-smart-pricing-01-missing-item={row.lineId}
              >
                {row.lp}. {row.description.slice(0, 72)}
                {row.description.length > 72 ? "…" : ""} ·{" "}
                {row.reason ? REASON_LABEL_PL[row.reason] : "brak"}
              </button>
            ) : (
              <span>
                {row.lp}. {row.description.slice(0, 72)}
                {row.description.length > 72 ? "…" : ""} ·{" "}
                {row.reason ? REASON_LABEL_PL[row.reason] : "brak"}
              </span>
            )}
          </li>
        ))}
        {summary.missingLines.length > preview.length ? (
          <li>… +{summary.missingLines.length - preview.length} kolejnych</li>
        ) : null}
      </ul>
    </section>
  );
}

export function smartPricingMissingBadgeLabel(
  reason: SmartPricingMissingReason | undefined,
): string | null {
  if (!reason) return null;
  return "brak Quotes";
}
