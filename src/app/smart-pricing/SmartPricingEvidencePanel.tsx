/**
 * SMART-PRICING-01 P1 — panel Price Evidence + Confidence + One-shot + Odrzuć.
 * DF-P1: Quotes RO · session overlay · zero Zapisz / commit / Cloud.
 */

import { TEUX_FONT_CAPTION, TEUX_FONT_META } from "@/lib/tender-ux-tokens";
import type {
  SmartPricingDecisionConfidence,
  SmartPricingOneShotOverlay,
  SmartPricingPriceEvidence,
} from "@/lib/smart-pricing";

const CONF_LABEL_PL: Record<SmartPricingDecisionConfidence, string> = {
  READY: "READY — gotowe do One-shot",
  REVIEW: "REVIEW — sprawdź przed One-shot",
  MANUAL: "MANUAL — wybierz Evidence jawnie",
};

const CONF_CLASS: Record<SmartPricingDecisionConfidence, string> = {
  READY: "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  REVIEW: "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  MANUAL: "border-border bg-secondary/30 text-muted-foreground",
};

function formatPln(n: number): string {
  return n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SmartPricingEvidencePanel({
  lineId,
  lp,
  description,
  regionCode,
  evidence,
  confidence,
  selectedEvidenceId,
  oneShot,
  onSelectEvidence,
  onOneShot,
  onReject,
  onClose,
}: {
  lineId: string;
  lp: string;
  description: string;
  regionCode: string;
  evidence: SmartPricingPriceEvidence[];
  confidence: SmartPricingDecisionConfidence;
  selectedEvidenceId: string | null;
  oneShot: SmartPricingOneShotOverlay | null;
  onSelectEvidence: (evidenceId: string) => void;
  onOneShot: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  const top = evidence[0] ?? null;
  const selected =
    (selectedEvidenceId && evidence.find((e) => e.id === selectedEvidenceId)) || top;
  const canAutoOneShot = confidence === "READY" || confidence === "REVIEW";
  const canManualOneShot = confidence === "MANUAL" && Boolean(selectedEvidenceId);
  const canOneShot = Boolean(selected) && (canAutoOneShot || canManualOneShot);

  return (
    <section
      className="rounded-lg border border-border bg-background/80 p-3 space-y-3"
      data-smart-pricing-01-p1-evidence
      data-smart-pricing-01-p1-line={lineId}
      data-smart-pricing-01-p1-confidence={confidence}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h3 className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>
            Smart Pricing — Evidence
          </h3>
          <p className={`${TEUX_FONT_META} text-muted-foreground`}>
            {lp}. {description.slice(0, 96)}
            {description.length > 96 ? "…" : ""} · region {regionCode} · Product Quotes RO
          </p>
        </div>
        <button
          type="button"
          className={`${TEUX_FONT_META} underline-offset-2 hover:underline min-h-[44px] sm:min-h-0 px-2`}
          onClick={onClose}
          data-smart-pricing-01-p1-close
        >
          Zamknij
        </button>
      </div>

      <div
        className={`inline-flex rounded-md border px-2 py-1 ${TEUX_FONT_META} ${CONF_CLASS[confidence]}`}
        data-smart-pricing-01-p1-confidence-badge
      >
        {CONF_LABEL_PL[confidence]}
      </div>

      {oneShot ? (
        <p
          className={`${TEUX_FONT_META} text-foreground`}
          data-smart-pricing-01-p1-oneshot-active
        >
          One-shot sesji: {formatPln(oneShot.price)} PLN · {oneShot.provider} (znika po reload)
        </p>
      ) : null}

      {evidence.length === 0 ? (
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`} data-smart-pricing-01-p1-empty>
          Brak Evidence z Product Quotes dla tej pozycji (region {regionCode}). Uzupełnij Quotes w
          Bibliotece Robót — bez zapisu z tego panelu.
        </p>
      ) : (
        <ul className="space-y-1.5" data-smart-pricing-01-p1-evidence-list>
          {evidence.map((ev, idx) => {
            const selectedRow =
              selectedEvidenceId === ev.id || (!selectedEvidenceId && idx === 0);
            return (
              <li key={ev.id}>
                <button
                  type="button"
                  className={`w-full text-left rounded-md border px-3 py-2 min-h-[44px] touch-manipulation ${
                    selectedRow
                      ? "border-foreground/40 bg-secondary/40"
                      : "border-border/80 bg-secondary/10 hover:bg-secondary/25"
                  }`}
                  onClick={() => onSelectEvidence(ev.id)}
                  data-smart-pricing-01-p1-evidence-item={ev.id}
                  data-smart-pricing-01-p1-rank={String(idx + 1)}
                >
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`${TEUX_FONT_META} tabular-nums text-muted-foreground`}>
                      #{idx + 1}
                    </span>
                    <span className={`${TEUX_FONT_CAPTION} font-medium text-foreground`}>
                      {ev.provider}
                    </span>
                    <span className={`${TEUX_FONT_CAPTION} tabular-nums text-foreground`}>
                      {formatPln(ev.price)} PLN
                    </span>
                    <span className={`${TEUX_FONT_META} text-muted-foreground`}>
                      conf {(ev.confidence * 100).toFixed(0)}% · {ev.matchMethod}
                    </span>
                  </span>
                  <span className={`${TEUX_FONT_META} text-muted-foreground block mt-0.5`}>
                    {ev.matchDetail}
                    {ev.warnings?.length ? ` · ⚠ ${ev.warnings.join("; ")}` : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {confidence === "REVIEW" && canOneShot ? (
        <p className={`${TEUX_FONT_META} text-amber-800 dark:text-amber-200`}>
          REVIEW — One-shot dozwolony, zweryfikuj cenę przed zastosowaniem w sesji.
        </p>
      ) : null}
      {confidence === "MANUAL" && !selectedEvidenceId ? (
        <p className={`${TEUX_FONT_META} text-muted-foreground`}>
          MANUAL — wybierz Evidence z listy, aby włączyć One-shot.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`${TEUX_FONT_CAPTION} rounded-md border border-border bg-secondary/30 px-3 py-2 min-h-[44px] touch-manipulation disabled:opacity-40`}
          disabled={!canOneShot}
          onClick={onOneShot}
          data-smart-pricing-01-p1-oneshot
        >
          One-shot (sesja)
        </button>
        <button
          type="button"
          className={`${TEUX_FONT_CAPTION} rounded-md border border-border px-3 py-2 min-h-[44px] touch-manipulation`}
          onClick={onReject}
          data-smart-pricing-01-p1-reject
        >
          Odrzuć
        </button>
      </div>

      <p className={`${TEUX_FONT_META} text-muted-foreground`}>
        Bez zapisu do Product Quotes · bez Cloud · bez Market Sync Publish. Overlay tylko w tej
        sesji przeglądarki.
      </p>
    </section>
  );
}
