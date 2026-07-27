/**
 * COST-S4.1 — panel RO AI Cost Intelligence / Explainability.
 * Tylko odczyt — bez edycji cen, źródeł i przeliczeń.
 */

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { TenderUxSectionTitle } from "@/app/tenders/design-system/TenderUxSectionTitle";
import { TEUX_FONT_BODY, TEUX_FONT_CAPTION, TEUX_FONT_META } from "@/lib/tender-ux-tokens";
import {
  buildOfferBoqExplainabilityView,
  type OfferBoqExplainConfidenceBadge,
  type OfferBoqExplainLineCard,
} from "@/lib/tender-offer-boq-explainability";

function ConfidenceBadge({ badge }: { badge: OfferBoqExplainConfidenceBadge }) {
  const tone =
    badge.status === "high"
      ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
      : badge.status === "review"
        ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
        : "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${tone}`}
      data-offer-boq-confidence={badge.status}
    >
      <span aria-hidden>{badge.emoji}</span>
      {badge.labelPl}
    </span>
  );
}

function SummaryKpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/70 px-3 py-2 min-w-0">
      <p className={`${TEUX_FONT_META} font-semibold uppercase tracking-wide text-muted-foreground`}>
        {label}
      </p>
      <p className="text-base font-bold text-foreground mt-0.5 tabular-nums break-words">{value}</p>
      {sub ? <p className={`${TEUX_FONT_META} text-muted-foreground mt-0.5`}>{sub}</p> : null}
    </div>
  );
}

function LineExplainCard({
  line,
  open,
  onToggle,
}: {
  line: OfferBoqExplainLineCard;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <article
      className="rounded-xl border border-border bg-card/40 overflow-hidden"
      data-offer-boq-line-id={line.lineId}
      data-offer-boq-editable="false"
    >
      <button
        type="button"
        className="w-full text-left px-3 py-2.5 flex items-start gap-2 hover:bg-secondary/30 transition-colors"
        onClick={onToggle}
        aria-expanded={open}
        data-offer-boq-line-toggle
      >
        <span className="mt-0.5 text-muted-foreground shrink-0">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{line.lp}</span>
            <ConfidenceBadge badge={line.confidenceBadge} />
            {line.requiresUserReview ? (
              <span className={`${TEUX_FONT_META} text-amber-700 dark:text-amber-300`}>
                {line.reviewLabelPl}
              </span>
            ) : null}
          </div>
          <p className={`${TEUX_FONT_BODY} font-medium text-foreground line-clamp-2`}>
            {line.description}
          </p>
          <div className={`flex flex-wrap gap-x-3 gap-y-1 ${TEUX_FONT_CAPTION} text-muted-foreground`}>
            <span>Typ: <strong className="text-foreground">{line.lineKindLabelPl}</strong></span>
            <span>Komponenty: <strong className="text-foreground">{line.componentCount}</strong></span>
            <span>Koszt bezp.: <strong className="text-foreground tabular-nums">{line.lineDirectDisplay}</strong></span>
          </div>
        </div>
      </button>

      {open ? (
        <div className="border-t border-border/70 px-3 py-3 space-y-3 bg-secondary/10" data-offer-boq-line-details>
          <div className="grid gap-2 sm:grid-cols-2">
            <p className={TEUX_FONT_CAPTION}>
              <span className="text-muted-foreground">Strategia wyceny: </span>
              <span className="text-foreground">{line.pricingStrategyLabelPl}</span>
            </p>
            <p className={TEUX_FONT_CAPTION}>
              <span className="text-muted-foreground">Dekompozycja: </span>
              <span className="text-foreground">{line.decompositionLabelPl}</span>
            </p>
            <p className={`${TEUX_FONT_CAPTION} sm:col-span-2`}>
              <span className="text-muted-foreground">Źródła wyceny: </span>
              <span className="text-foreground">
                {line.sourceLabelsPl.length ? line.sourceLabelsPl.join(" · ") : "—"}
              </span>
            </p>
          </div>

          <section
            className="rounded-lg border border-border/80 bg-background/60 p-3 space-y-1.5"
            data-offer-boq-why-ai
          >
            <h4 className={`${TEUX_FONT_CAPTION} font-semibold text-foreground flex items-center gap-1.5`}>
              <Info className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
              Dlaczego AI podjęło taką decyzję?
            </h4>
            <p className={`${TEUX_FONT_BODY} text-muted-foreground`}>{line.whyAiDecisionPl}</p>
          </section>

          <section className="space-y-2" data-offer-boq-components>
            <h4 className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>
              Komponenty wyceny ({line.components.length})
            </h4>
            {line.components.length === 0 ? (
              <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>Brak komponentów wyceny.</p>
            ) : (
              <ul className="space-y-2">
                {line.components.map((c) => (
                  <li
                    key={c.componentId}
                    className="rounded-lg border border-border bg-background/80 p-2.5 space-y-1"
                    data-offer-boq-component-id={c.componentId}
                    data-offer-boq-component-editable="false"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>{c.namePl}</span>
                      <span className={`${TEUX_FONT_META} rounded bg-secondary px-1.5 py-0.5`}>
                        {c.categoryLabelPl}
                      </span>
                      <ConfidenceBadge badge={c.confidenceBadge} />
                    </div>
                    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-1 ${TEUX_FONT_META} text-muted-foreground`}>
                      <span>Ilość: <strong className="text-foreground tabular-nums">{c.quantityDisplay}</strong> {c.unit}</span>
                      <span>Cena j.: <strong className="text-foreground tabular-nums">{c.unitPriceDisplay}</strong></span>
                      <span>Wartość: <strong className="text-foreground tabular-nums">{c.totalDisplay}</strong></span>
                      <span>Źródło: <strong className="text-foreground">{c.sourceLabelPl}</strong></span>
                    </div>
                    <p className={`${TEUX_FONT_META} text-muted-foreground`}>{c.aiRationale}</p>
                    <p className={`${TEUX_FONT_META} ${c.requiresUserReview ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>
                      {c.reviewLabelPl}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className={`${TEUX_FONT_META} text-muted-foreground`}>
            Tryb tylko do odczytu — edycja komponentów i źródeł w kolejnych Slice.
          </p>
        </div>
      ) : null}
    </article>
  );
}

export function OfferBoqCostIntelligencePanel({
  item,
  pricingCatalogRevision = 0,
}: {
  item: TenderPipelineItem;
  /** Invalidacja gdy zmieni się Biblioteka Robót / model kosztów. */
  pricingCatalogRevision?: number;
}) {
  const view = useMemo(
    () => buildOfferBoqExplainabilityView({ item }),
    [item, pricingCatalogRevision],
  );
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  if (!view.available || !view.summary) {
    return (
      <section
        className="rounded-xl border border-dashed border-border bg-secondary/10 p-4 space-y-2"
        data-offer-boq-explainability
        data-offer-boq-empty
      >
        <TenderUxSectionTitle>AI Cost Intelligence</TenderUxSectionTitle>
        <p className={`${TEUX_FONT_BODY} text-muted-foreground`}>
          {view.emptyReasonPl ?? "Brak danych do wyjaśnienia wyceny AI."}
        </p>
      </section>
    );
  }

  const s = view.summary;

  return (
    <section
      className="rounded-xl border border-border bg-secondary/15 p-4 space-y-4"
      data-offer-boq-explainability
      data-offer-boq-editable="false"
    >
      <div className="space-y-1">
        <TenderUxSectionTitle>AI Cost Intelligence</TenderUxSectionTitle>
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
          Transparentność decyzji AI — tylko podgląd. To nie jest cena ofertowa (bez Kp i marży).
        </p>
      </div>

      <div
        className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
        data-offer-boq-summary
      >
        <SummaryKpi label="Pozycje" value={String(s.lineCount)} />
        <SummaryKpi label="Rozpoznane" value={String(s.recognizedCount)} />
        <SummaryKpi label="Do weryfikacji" value={String(s.reviewRequiredCount)} />
        <SummaryKpi label="Zdekomponowane" value={String(s.decomposedCount)} />
        <SummaryKpi
          label="Pewność AI"
          value={`${s.averageConfidenceBadge.emoji} ${s.averageConfidenceLabelPl}`}
          sub={`🟢${s.highCount} · 🟡${s.mediumCount} · 🔴${s.lowCount}`}
        />
        <SummaryKpi
          label="Koszt bezpośredni"
          value={s.directCostDisplay}
          sub={`${s.pricedComponentCount} komp. z ceną`}
        />
      </div>

      <div className="space-y-2" data-offer-boq-lines>
        <h3 className="text-sm font-semibold text-foreground">Pozycje — wyjaśnienie AI</h3>
        {view.lines.map((line) => (
          <LineExplainCard
            key={line.lineId}
            line={line}
            open={Boolean(openIds[line.lineId])}
            onToggle={() =>
              setOpenIds((prev) => ({ ...prev, [line.lineId]: !prev[line.lineId] }))
            }
          />
        ))}
      </div>
    </section>
  );
}
