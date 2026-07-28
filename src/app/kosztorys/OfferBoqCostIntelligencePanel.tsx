/**
 * COST-S5 / S5.1 — panel AI Cost Intelligence: edycja komponentów + wiedza firmy.
 * Edycja tylko komponentów · natychmiastowe przeliczenie lineDirect · bez Kp/marży/oferty.
 */

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Info } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { OfferBoqDocument, OfferBoqPriceOriginKind, OfferBoqPricedComponentCategory } from "@/lib/tender-offer-boq";
import { TenderUxSectionTitle } from "@/app/tenders/design-system/TenderUxSectionTitle";
import { TEUX_FONT_BODY, TEUX_FONT_CAPTION, TEUX_FONT_META } from "@/lib/tender-ux-tokens";
import {
  buildOfferBoqExplainabilityView,
  presentOfferBoqExplainabilityView,
  type OfferBoqExplainConfidenceBadge,
  type OfferBoqExplainComponentRow,
  type OfferBoqExplainLineCard,
  type OfferBoqAiQualitySection,
  type OfferBoqBidImpactSection,
  type OfferBoqOfferReadinessSection,
  type OfferBoqOfferSummarySection,
} from "@/lib/tender-offer-boq-explainability";
import type { OfferBoqValidationRecommendation } from "@/lib/tender-offer-boq-validation";
import {
  approveOfferBoqComponentInDocument,
  OFFER_BOQ_PRICE_ORIGIN_KIND_LABELS_PL,
  patchOfferBoqComponentInDocument,
} from "@/lib/tender-offer-boq-component-edit";
import { OFFER_BOQ_PRICED_CATEGORY_LABELS_PL } from "@/lib/tender-offer-boq-pricing-engine";
import {
  computeCompanyKnowledgeStats,
  loadCompanyKnowledgeStoreLocal,
  type CompanyKnowledgeStats,
} from "@/lib/tender-offer-boq-company-knowledge";
import { OfferBoqStickySummaryBar } from "@/app/kosztorys/OfferBoqStickySummaryBar";
import {
  buildOfferBoqVisibleLines,
  defaultOfferBoqDensity,
  type OfferBoqDensityMode,
  type OfferBoqSortDir,
  type OfferBoqSortKey,
} from "@/app/kosztorys/offer-boq-ux-wave2";
import {
  resolveCostRegressionF2Presentation,
  type CostRegressionF2UiCopy,
} from "@/lib/cost-regression-f2";

const CATEGORY_OPTIONS = Object.keys(OFFER_BOQ_PRICED_CATEGORY_LABELS_PL) as OfferBoqPricedComponentCategory[];
const ORIGIN_OPTIONS = Object.keys(OFFER_BOQ_PRICE_ORIGIN_KIND_LABELS_PL) as OfferBoqPriceOriginKind[];

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

function EditStatusBadge({ status, label }: { status: string; label: string }) {
  const tone =
    status === "user_approved"
      ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/25"
      : status === "user_changed"
        ? "bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/25"
        : "bg-secondary text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${tone}`}
      data-offer-boq-edit-status={status}
    >
      {label}
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

function BidImpactSection({ section }: { section: OfferBoqBidImpactSection }) {
  return (
    <section
      className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2"
      data-offer-boq-bid-impact
    >
      <h3 className={`${TEUX_FONT_CAPTION} font-semibold text-foreground flex items-center gap-1.5`}>
        <Info className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
        Wpływ AI na ofertę
      </h3>
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        <SummaryKpi label="Koszt bezpośredni → Bid Proposal" value={section.directCostDisplay} />
        <SummaryKpi
          label="Pewność AI"
          value={`${section.averageConfidenceBadge.emoji} ${section.averageConfidenceLabelPl}`}
        />
        <SummaryKpi
          label="Wiedza firmy"
          value={String(section.companyKnowledgeHitCount)}
          sub="komponentów z trafieniem"
        />
        <SummaryKpi
          label="Źródło oferty"
          value={section.bidProposalSourceLabelPl ?? "Bid Proposal"}
        />
      </div>
      <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>{section.computedByBidProposalPl}</p>
      {section.auditTrail.length > 0 ? (
        <ol className="space-y-2" data-offer-boq-audit-trail>
          {section.auditTrail.map((step) => (
            <li
              key={step.id}
              className="rounded-md border border-border/70 bg-background/60 px-2.5 py-2"
              data-offer-boq-audit-step={step.id}
            >
              <p className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>{step.labelPl}</p>
              <p className={`${TEUX_FONT_META} text-muted-foreground mt-0.5`}>{step.detailPl}</p>
              {step.valueDisplay ? (
                <p className={`${TEUX_FONT_CAPTION} font-medium text-foreground mt-1 tabular-nums`}>
                  {step.valueDisplay}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function OfferSummarySection({ section }: { section: OfferBoqOfferSummarySection }) {
  if (!section.available) {
    return (
      <section
        className="rounded-lg border border-dashed border-border bg-secondary/10 p-3"
        data-offer-boq-offer-summary
        data-offer-boq-offer-empty
      >
        <h3 className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>Podsumowanie oferty</h3>
        <p className={`${TEUX_FONT_META} text-muted-foreground mt-1`}>
          Brak pełnej wyceny ofertowej — uzupełnij koszt bezpośredni AI Cost.
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border border-border bg-background/60 p-3 space-y-3"
      data-offer-boq-offer-summary
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>Podsumowanie oferty (Bid Proposal)</h3>
        {section.qualityLabelPl ? (
          <span className={`${TEUX_FONT_META} rounded-md border border-border px-2 py-0.5 text-muted-foreground`}>
            Jakość: {section.qualityLabelPl}
          </span>
        ) : null}
      </div>
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
        <SummaryKpi label="Koszt bezpośredni" value={section.directCostDisplay} />
        <SummaryKpi label="Kp" value={section.kpDisplay} />
        <SummaryKpi label="Koszty poboczne" value={section.ancillaryDisplay} />
        <SummaryKpi label="Stałe firmy (KZP)" value={section.overheadDisplay} />
        <SummaryKpi label="Zysk" value={section.profitDisplay} />
        <SummaryKpi label="Koszt własny" value={section.costPriceDisplay} />
        <SummaryKpi label="Marża (netto)" value={section.marginDisplay} />
        <SummaryKpi label="Rentowność" value={section.profitabilityDisplay} />
        <SummaryKpi
          label="Cena rekomendowana"
          value={section.recommendedBidDisplay}
          sub="netto · Bid Proposal SSOT"
        />
      </div>
      {section.costStack.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse" data-offer-boq-cost-stack>
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-1 pr-2 font-semibold">Składnik</th>
                <th className="py-1 pr-2 font-semibold text-right">PLN</th>
                <th className="py-1 font-semibold">Szczegóły</th>
              </tr>
            </thead>
            <tbody>
              {section.costStack.map((row) => (
                <tr key={row.label} className="border-b border-border/50">
                  <td className="py-1 pr-2 text-foreground">{row.label}</td>
                  <td className="py-1 pr-2 text-right tabular-nums font-medium">{row.pln.toLocaleString("pl-PL")}</td>
                  <td className="py-1 text-muted-foreground">{row.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function readinessTone(status: OfferBoqOfferReadinessSection["status"]): string {
  if (status === "ready") {
    return "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 border-emerald-500/30";
  }
  if (status === "review_required") {
    return "bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/30";
  }
  return "bg-rose-500/12 text-rose-800 dark:text-rose-300 border-rose-500/30";
}

function OfferReadinessSection({ section }: { section: OfferBoqOfferReadinessSection }) {
  if (!section.available) return null;
  return (
    <section
      className="rounded-lg border border-border bg-background/60 p-3 space-y-3"
      data-offer-boq-offer-readiness
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>Gotowość oferty</h3>
        <span
          className={`${TEUX_FONT_META} rounded-md border px-2 py-0.5 ${readinessTone(section.status)}`}
          data-offer-boq-readiness-status={section.status}
        >
          {section.statusLabelPl}
        </span>
      </div>
      <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <SummaryKpi label="Kompletność" value={`${section.completenessPct.toFixed(1)}%`} />
        <SummaryKpi label="AI Quality Score" value={`${section.qualityScore}/100`} />
        <SummaryKpi label="Ostrzeżenia" value={String(section.warningCount)} />
        <SummaryKpi label="Błędy krytyczne" value={String(section.criticalCount)} />
        <SummaryKpi label="Rekomendacje" value={String(section.recommendationCount)} />
        <SummaryKpi label="Status" value={section.statusLabelPl} />
      </div>
    </section>
  );
}

function RecommendationGroupRow({ rec }: { rec: OfferBoqValidationRecommendation }) {
  const [open, setOpen] = useState(false);
  const priorityLabel =
    rec.priority === "high" ? "Wysoki" : rec.priority === "medium" ? "Średni" : "Niski";
  return (
    <li className="rounded-md border border-border/70 bg-background/70 px-2 py-1.5">
      <button
        type="button"
        className="w-full text-left"
        onClick={() => rec.expandable && setOpen((v) => !v)}
        data-offer-boq-rec-group={rec.issueCode}
        aria-expanded={rec.expandable ? open : undefined}
      >
        <p className={`${TEUX_FONT_CAPTION} font-semibold text-foreground flex items-center gap-1`}>
          {rec.expandable ? (
            open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          ) : null}
          [{priorityLabel}] {rec.titlePl}
          {rec.occurrenceCount > 1 ? (
            <span className={`${TEUX_FONT_META} text-muted-foreground font-normal`}>
              ({rec.occurrenceCount})
            </span>
          ) : null}
        </p>
        <p className={`${TEUX_FONT_META} text-muted-foreground`}>{rec.detailPl}</p>
      </button>
      {open && rec.sampleLabelsPl.length > 0 ? (
        <ul className="mt-1.5 space-y-0.5 border-t border-border/50 pt-1.5" data-offer-boq-rec-samples>
          {rec.sampleLabelsPl.map((label, idx) => (
            <li key={`${rec.id}-s-${idx}`} className={`${TEUX_FONT_META} text-muted-foreground`}>
              • {label}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function AiQualitySection({ section }: { section: OfferBoqAiQualitySection }) {
  if (!section.available) return null;
  return (
    <section
      className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-3"
      data-offer-boq-ai-quality
    >
      <h3 className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>Ocena jakości AI</h3>
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        <SummaryKpi label="Rozpoznane" value={`${section.completeness.recognizedPct.toFixed(1)}%`} />
        <SummaryKpi label="Sklasyfikowane" value={`${section.completeness.classifiedPct.toFixed(1)}%`} />
        <SummaryKpi label="Wycenione" value={`${section.completeness.pricedPct.toFixed(1)}%`} />
        <SummaryKpi label="Przekazane do oferty" value={`${section.completeness.passedToBidPct.toFixed(1)}%`} />
      </div>

      <div className="space-y-1">
        {section.qualityExplainability.reasoningPl.map((line, idx) => (
          <p key={`reason-${idx}`} className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
            {line}
          </p>
        ))}
      </div>

      {section.qualityExplainability.loweredBy.length > 0 ? (
        <div className="space-y-1.5">
          <p className={`${TEUX_FONT_META} font-semibold uppercase tracking-wide text-rose-800 dark:text-rose-300`}>
            Co obniżyło ocenę
          </p>
          <ul className="space-y-1">
            {section.qualityExplainability.loweredBy.map((f) => (
              <li key={`low-${f.labelPl}`} className="rounded-md border border-rose-500/25 bg-rose-500/10 px-2 py-1.5">
                <p className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>{f.labelPl} (−{f.impactScore})</p>
                <p className={`${TEUX_FONT_META} text-muted-foreground`}>{f.detailPl}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {section.qualityExplainability.increasedBy.length > 0 ? (
        <div className="space-y-1.5">
          <p className={`${TEUX_FONT_META} font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300`}>
            Co zwiększyło wiarygodność
          </p>
          <ul className="space-y-1">
            {section.qualityExplainability.increasedBy.map((f) => (
              <li key={`up-${f.labelPl}`} className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1.5">
                <p className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>{f.labelPl} (+{f.impactScore})</p>
                <p className={`${TEUX_FONT_META} text-muted-foreground`}>{f.detailPl}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {section.recommendations.length > 0 ? (
        <div className="space-y-1.5" data-offer-boq-recommendations>
          <p className={`${TEUX_FONT_META} font-semibold uppercase tracking-wide text-muted-foreground`}>
            Rekomendacje przed wysłaniem ({section.recommendations.length} grup)
          </p>
          <ul className="space-y-1">
            {section.recommendations.map((rec) => (
              <RecommendationGroupRow key={rec.id} rec={rec} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <label className={`${TEUX_FONT_META} text-muted-foreground block mb-0.5`}>{children}</label>;
}

function EditableComponentFields({
  lineId,
  component,
  onPatch,
}: {
  lineId: string;
  component: OfferBoqExplainComponentRow;
  onPatch: (
    lineId: string,
    componentId: string,
    patch: Parameters<typeof patchOfferBoqComponentInDocument>[3],
  ) => void;
}) {
  const inputClass =
    "w-full rounded-md border border-border bg-background px-2 py-1.5 text-base sm:text-xs text-foreground";

  return (
    <div className="space-y-2" data-offer-boq-component-fields>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldLabel>Nazwa</FieldLabel>
          <input
            className={inputClass}
            value={component.namePl}
            onChange={(e) =>
              onPatch(lineId, component.componentId, { namePl: e.target.value })
            }
          />
        </div>
        <div>
          <FieldLabel>Kategoria</FieldLabel>
          <select
            className={inputClass}
            value={component.category}
            onChange={(e) =>
              onPatch(lineId, component.componentId, {
                category: e.target.value as OfferBoqPricedComponentCategory,
              })
            }
          >
            {CATEGORY_OPTIONS.map((id) => (
              <option key={id} value={id}>
                {OFFER_BOQ_PRICED_CATEGORY_LABELS_PL[id]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Źródło wyceny</FieldLabel>
          <select
            className={inputClass}
            value={component.sourceKind}
            onChange={(e) => {
              const kind = e.target.value as OfferBoqPriceOriginKind;
              onPatch(lineId, component.componentId, {
                priceOriginKind: kind,
                priceOriginLabelPl: OFFER_BOQ_PRICE_ORIGIN_KIND_LABELS_PL[kind],
              });
            }}
          >
            {ORIGIN_OPTIONS.map((id) => (
              <option key={id} value={id}>
                {OFFER_BOQ_PRICE_ORIGIN_KIND_LABELS_PL[id]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Ilość</FieldLabel>
          <input
            className={inputClass}
            type="number"
            step="any"
            min="0"
            value={Number.isFinite(component.quantity) ? component.quantity : 0}
            onChange={(e) =>
              onPatch(lineId, component.componentId, {
                quantity: parseFloat(e.target.value.replace(",", ".")) || 0,
              })
            }
          />
        </div>
        <div>
          <FieldLabel>Jednostka</FieldLabel>
          <input
            className={inputClass}
            value={component.unit === "—" ? "" : component.unit}
            onChange={(e) =>
              onPatch(lineId, component.componentId, { unit: e.target.value })
            }
          />
        </div>
        <div>
          <FieldLabel>Cena jednostkowa (PLN)</FieldLabel>
          <input
            className={inputClass}
            type="number"
            step="0.01"
            min="0"
            value={component.unitPricePln ?? ""}
            onChange={(e) => {
              const raw = e.target.value.trim();
              onPatch(lineId, component.componentId, {
                unitPricePln: raw === "" ? null : parseFloat(raw.replace(",", ".")) || 0,
              });
            }}
          />
        </div>
        <div>
          <FieldLabel>Wartość (auto)</FieldLabel>
          <p className={`${TEUX_FONT_CAPTION} font-semibold tabular-nums text-foreground pt-1`}>
            {component.totalDisplay}
          </p>
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            id={`review-${component.componentId}`}
            type="checkbox"
            checked={component.requiresUserReview}
            onChange={(e) =>
              onPatch(lineId, component.componentId, {
                requiresUserReview: e.target.checked,
              })
            }
          />
          <label htmlFor={`review-${component.componentId}`} className={TEUX_FONT_CAPTION}>
            Wymaga weryfikacji użytkownika
          </label>
        </div>
      </div>

      <p className={`${TEUX_FONT_META} text-muted-foreground`}>{component.aiRationale}</p>
      {component.companyKnowledgeExplainPl ? (
        <p
          className={`${TEUX_FONT_CAPTION} text-teal-900 dark:text-teal-200`}
          data-offer-boq-company-knowledge-explain
        >
          {component.companyKnowledgeExplainPl}
        </p>
      ) : null}
    </div>
  );
}

/** WAVE 2.2 — collapsed component row + inline expand (bez Drawer). */
function CollapsedComponentRow({
  lineId,
  component,
  editing,
  onToggleEdit,
  onPatch,
  onApprove,
}: {
  lineId: string;
  component: OfferBoqExplainComponentRow;
  editing: boolean;
  onToggleEdit: () => void;
  onPatch: (
    lineId: string,
    componentId: string,
    patch: Parameters<typeof patchOfferBoqComponentInDocument>[3],
  ) => void;
  onApprove: (lineId: string, componentId: string) => void;
}) {
  const catShort =
    OFFER_BOQ_PRICED_CATEGORY_LABELS_PL[
      component.category as OfferBoqPricedComponentCategory
    ] ?? component.categoryLabelPl;
  const unitPrice =
    component.unitPricePln == null
      ? "—"
      : component.unitPriceDisplay || String(component.unitPricePln);

  return (
    <li
      className="rounded-lg border border-border bg-background/80 overflow-hidden"
      data-offer-boq-component-id={component.componentId}
      data-offer-boq-editable="true"
      data-offer-boq-component-collapsed={editing ? "false" : "true"}
    >
      <div
        className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-2.5 py-2 min-h-[44px]"
        data-offer-boq-component-row
      >
        <EditStatusBadge status={component.editStatus} label={component.editStatusLabelPl} />
        <span
          className={`${TEUX_FONT_CAPTION} font-medium text-foreground line-clamp-1 min-w-0 flex-1`}
          title={component.namePl}
        >
          {component.namePl}
        </span>
        <span className={`${TEUX_FONT_META} text-muted-foreground shrink-0`}>{catShort}</span>
        <span className={`${TEUX_FONT_META} tabular-nums text-muted-foreground shrink-0`}>
          {component.quantityDisplay} {component.unit}
        </span>
        <span className={`${TEUX_FONT_META} tabular-nums text-muted-foreground shrink-0`}>
          {unitPrice}
        </span>
        <span className={`${TEUX_FONT_CAPTION} font-semibold tabular-nums text-foreground shrink-0`}>
          {component.totalDisplay}
        </span>
        <ConfidenceBadge badge={component.confidenceBadge} />
        {component.companyKnowledgeUsed ? (
          <span
            className={`${TEUX_FONT_META} text-teal-800 dark:text-teal-200`}
            data-offer-boq-company-knowledge
            title="Wiedza firmy"
          >
            ★
          </span>
        ) : null}
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 min-h-[44px] sm:min-h-0 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 touch-manipulation"
          onClick={() => onApprove(lineId, component.componentId)}
          data-offer-boq-approve
        >
          <Check className="h-3 w-3" aria-hidden />
          Zatwierdź
        </button>
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-border bg-secondary/40 px-2 py-1.5 min-h-[44px] sm:min-h-0 text-[10px] font-semibold text-foreground touch-manipulation"
          onClick={onToggleEdit}
          aria-expanded={editing}
          data-offer-boq-component-edit-toggle
        >
          {editing ? "Zamknij edycję" : "Edytuj"}
        </button>
      </div>

      {editing ? (
        <div
          className="border-t border-border/70 px-2.5 py-2.5 bg-secondary/10"
          data-offer-boq-component-inline-edit
        >
          <EditableComponentFields lineId={lineId} component={component} onPatch={onPatch} />
        </div>
      ) : null}
    </li>
  );
}

function LineExplainCard({
  line,
  open,
  density,
  editingComponentId,
  onToggle,
  onPatch,
  onApprove,
  onToggleComponentEdit,
}: {
  line: OfferBoqExplainLineCard;
  open: boolean;
  density: OfferBoqDensityMode;
  editingComponentId: string | null;
  onToggle: () => void;
  onPatch: (
    lineId: string,
    componentId: string,
    patch: Parameters<typeof patchOfferBoqComponentInDocument>[3],
  ) => void;
  onApprove: (lineId: string, componentId: string) => void;
  onToggleComponentEdit: (componentId: string) => void;
}) {
  const [whyAiOpen, setWhyAiOpen] = useState(false);
  const compact = density === "compact";

  return (
    <article
      className="rounded-xl border border-border bg-card/40 overflow-hidden"
      data-offer-boq-line-id={line.lineId}
      data-offer-boq-editable="false"
      data-offer-boq-line-density={density}
    >
      <button
        type="button"
        className={`w-full text-left px-3 flex items-center gap-2 hover:bg-secondary/30 transition-colors touch-manipulation min-h-[44px] ${
          compact ? "py-2" : "py-2.5 items-start"
        }`}
        onClick={onToggle}
        aria-expanded={open}
        data-offer-boq-line-toggle
      >
        <span className={`${compact ? "" : "mt-0.5"} text-muted-foreground shrink-0`}>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>

        {compact ? (
          <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-xs text-muted-foreground w-8 shrink-0">{line.lp}</span>
            <span
              className={`${TEUX_FONT_CAPTION} font-medium text-foreground line-clamp-1 min-w-0 flex-1`}
              title={line.description}
            >
              {line.description}
            </span>
            <span className={`${TEUX_FONT_CAPTION} tabular-nums text-foreground font-semibold shrink-0`}>
              {line.lineDirectDisplay}
            </span>
            <ConfidenceBadge badge={line.confidenceBadge} />
            {line.requiresUserReview ? (
              <span className={`${TEUX_FONT_META} text-amber-700 dark:text-amber-300 shrink-0`}>
                rev
              </span>
            ) : null}
            <span className={`${TEUX_FONT_META} text-muted-foreground shrink-0`}>
              {line.componentCount} komp.
            </span>
          </div>
        ) : (
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
              <span>
                Typ: <strong className="text-foreground">{line.lineKindLabelPl}</strong>
              </span>
              <span>
                Komponenty: <strong className="text-foreground">{line.componentCount}</strong>
              </span>
              <span>
                Koszt bezp.:{" "}
                <strong className="text-foreground tabular-nums">{line.lineDirectDisplay}</strong>
              </span>
            </div>
          </div>
        )}
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
          </div>

          <div
            className="rounded-lg border border-border/80 bg-background/60 overflow-hidden"
            data-offer-boq-why-ai
          >
            <button
              type="button"
              className="w-full text-left px-3 py-2 flex items-center gap-1.5 hover:bg-secondary/30 min-h-[44px] touch-manipulation"
              onClick={() => setWhyAiOpen((v) => !v)}
              aria-expanded={whyAiOpen}
              data-offer-boq-why-ai-toggle
            >
              {whyAiOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-primary shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
              <Info className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
              <span className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>
                Uzasadnienie AI
              </span>
            </button>
            {whyAiOpen ? (
              <p className={`${TEUX_FONT_BODY} text-muted-foreground px-3 pb-3`}>
                {line.whyAiDecisionPl}
              </p>
            ) : null}
          </div>

          <section className="space-y-2" data-offer-boq-components>
            <h4 className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>
              Komponenty wyceny ({line.components.length})
            </h4>
            {line.components.length === 0 ? (
              <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>Brak komponentów wyceny.</p>
            ) : (
              <ul className="space-y-2">
                {line.components.map((c) => (
                  <CollapsedComponentRow
                    key={c.componentId}
                    lineId={line.lineId}
                    component={c}
                    editing={editingComponentId === c.componentId}
                    onToggleEdit={() => onToggleComponentEdit(c.componentId)}
                    onPatch={onPatch}
                    onApprove={onApprove}
                  />
                ))}
              </ul>
            )}
          </section>

          <p className={`${TEUX_FONT_META} text-muted-foreground`}>
            Zmiany przeliczają koszt bezpośredni i ofertę końcową (Bid Proposal REUSE).
          </p>
        </div>
      ) : null}
    </article>
  );
}

export function OfferBoqCostIntelligencePanel({
  item,
  pricingCatalogRevision = 0,
  f2Signals,
  onAttachPrzedmiar,
  onRetryParse,
}: {
  item: TenderPipelineItem;
  pricingCatalogRevision?: number;
  /** COST-REGRESSION-01 — sygnały parse do discovery F2. */
  f2Signals?: {
    dossierBuilding?: boolean;
    dossierSaving?: boolean;
    autoRunning?: boolean;
    dossierParseFailed?: boolean;
  };
  onAttachPrzedmiar?: () => void;
  onRetryParse?: () => void;
}) {
  const baseline = useMemo(
    () => buildOfferBoqExplainabilityView({ item }),
    [item, pricingCatalogRevision],
  );
  const [doc, setDoc] = useState<OfferBoqDocument | null>(null);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [knowledgeRevision, setKnowledgeRevision] = useState(0);
  /** COSTORYS-UX-01 W1 — UI-only. */
  const [reviewOnly, setReviewOnly] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  /** COSTORYS-UX-01 W2 — UI-only. */
  const [density, setDensity] = useState<OfferBoqDensityMode>("comfort");
  const [densityUserOverride, setDensityUserOverride] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<OfferBoqSortKey>("lp");
  const [sortDir, setSortDir] = useState<OfferBoqSortDir>("asc");
  const [editingKey, setEditingKey] = useState<string | null>(null);

  useEffect(() => {
    setDoc(baseline.document);
    setOpenIds({});
    setReviewOnly(false);
    setDetailsOpen(false);
    setSearchQuery("");
    setSortKey("lp");
    setSortDir("asc");
    setEditingKey(null);
    setDensityUserOverride(false);
    const lineCount = baseline.available ? baseline.lines.length : 0;
    setDensity(defaultOfferBoqDensity(lineCount));
  }, [item.id, pricingCatalogRevision, baseline.builtAt]);

  const view = useMemo(() => {
    if (!baseline.available) return baseline;
    if (!doc) return baseline;
    return presentOfferBoqExplainabilityView(doc, baseline.builtAt, { item });
  }, [baseline, doc, item]);

  useEffect(() => {
    if (densityUserOverride || !view.available) return;
    setDensity(defaultOfferBoqDensity(view.lines.length));
  }, [view.available, view.lines.length, densityUserOverride]);

  const knowledgeStats: CompanyKnowledgeStats = useMemo(
    () => computeCompanyKnowledgeStats(loadCompanyKnowledgeStoreLocal()),
    [knowledgeRevision, doc, item.id],
  );

  const visibleLines = useMemo(
    () =>
      buildOfferBoqVisibleLines({
        lines: view.lines,
        reviewOnly,
        searchQuery,
        sortKey,
        sortDir,
      }),
    [view.lines, reviewOnly, searchQuery, sortKey, sortDir],
  );

  const handlePatch = (
    lineId: string,
    componentId: string,
    patch: Parameters<typeof patchOfferBoqComponentInDocument>[3],
  ) => {
    setDoc((prev) => {
      if (!prev) return prev;
      return patchOfferBoqComponentInDocument(prev, lineId, componentId, patch);
    });
    setKnowledgeRevision((n) => n + 1);
  };

  const handleApprove = (lineId: string, componentId: string) => {
    setDoc((prev) => {
      if (!prev) return prev;
      return approveOfferBoqComponentInDocument(prev, lineId, componentId);
    });
    setKnowledgeRevision((n) => n + 1);
  };

  const handleDensityToggle = (next: OfferBoqDensityMode) => {
    setDensityUserOverride(true);
    setDensity(next);
  };

  const handleToggleComponentEdit = (lineId: string, componentId: string) => {
    const key = `${lineId}:${componentId}`;
    setEditingKey((prev) => (prev === key ? null : key));
  };

  if (!view.available || !view.summary) {
    const emptyF2: CostRegressionF2UiCopy | null = resolveCostRegressionF2Presentation({
      item,
      dossierBuilding: f2Signals?.dossierBuilding,
      dossierSaving: f2Signals?.dossierSaving,
      autoRunning: f2Signals?.autoRunning,
      dossierParseFailed: f2Signals?.dossierParseFailed,
    });
    return (
      <section
        className="rounded-xl border border-dashed border-border bg-secondary/10 p-4 space-y-2"
        data-offer-boq-explainability
        data-offer-boq-empty
        data-cost-regression-f2={emptyF2 ? "1" : "0"}
        data-cost-regression-discovery={emptyF2?.discovery ?? undefined}
        data-cost-regression-archive={emptyF2?.archiveCandidate ? "1" : undefined}
      >
        <TenderUxSectionTitle>Kosztorys ofertowy (AI Cost)</TenderUxSectionTitle>
        <p className={`${TEUX_FONT_BODY} text-muted-foreground`}>
          {emptyF2
            ? `${emptyF2.phaseLabelPl}. ${emptyF2.hintPl}`
            : (view.emptyReasonPl ?? "Brak danych do wyjaśnienia wyceny AI.")}
        </p>
        {emptyF2 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {emptyF2.primaryCta === "reparse" && onRetryParse && (
              <button
                type="button"
                className="inline-flex items-center min-h-[44px] px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                onClick={onRetryParse}
                disabled={emptyF2.discovery === "parse_running" || Boolean(f2Signals?.dossierBuilding)}
                data-cost-regression-reparse-cta
              >
                Ponów analizę kosztorysu
              </button>
            )}
            {(emptyF2.primaryCta === "attach" || emptyF2.secondaryCta === "attach") && onAttachPrzedmiar && (
              <button
                type="button"
                className="inline-flex items-center min-h-[44px] px-3 rounded-md border border-border bg-background text-xs font-semibold"
                onClick={onAttachPrzedmiar}
                data-cost-regression-attach-cta
              >
                Dołącz przedmiar
              </button>
            )}
          </div>
        )}
      </section>
    );
  }

  const s = view.summary;
  const f2Copy: CostRegressionF2UiCopy | null = resolveCostRegressionF2Presentation({
    item,
    dossierBuilding: f2Signals?.dossierBuilding,
    dossierSaving: f2Signals?.dossierSaving,
    autoRunning: f2Signals?.autoRunning,
    dossierParseFailed: f2Signals?.dossierParseFailed,
  });
  const hasRecommended =
    Boolean(view.offerSummary?.available && view.offerSummary.recommendedBidDisplay);
  const recommendedDisplay = hasRecommended
    ? view.offerSummary!.recommendedBidDisplay
    : f2Copy
      ? f2Copy.phaseLabelPl
      : "Brak rekomendowanej ceny";
  const filterActive = reviewOnly || searchQuery.trim().length > 0;

  return (
    <section
      className="rounded-xl border border-border bg-secondary/15 p-4 space-y-4"
      data-offer-boq-explainability
      data-offer-boq-editable="components-only"
      data-costorys-ux-wave1="true"
      data-costorys-ux-wave2="true"
      data-offer-boq-density={density}
    >
      <OfferBoqStickySummaryBar
        recommendedBidDisplay={recommendedDisplay}
        directCostDisplay={s.directCostDisplay}
        reviewRequiredCount={s.reviewRequiredCount}
        reviewOnly={reviewOnly}
        onReviewOnlyChange={setReviewOnly}
        f2Copy={!hasRecommended ? f2Copy : null}
        onAttachPrzedmiar={onAttachPrzedmiar}
        onRetryParse={onRetryParse}
        reparseBusy={Boolean(f2Signals?.dossierBuilding || f2Signals?.dossierSaving || f2Signals?.autoRunning)}
      />

      <div
        className="flex flex-col gap-2 rounded-lg border border-border bg-background/60 p-2.5"
        data-offer-boq-scan-toolbar
      >
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Szukaj pozycji (LP, opis)…"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm text-foreground min-h-[44px]"
          data-offer-boq-search
          aria-label="Szukaj pozycji kosztorysu"
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className={`${TEUX_FONT_META} text-muted-foreground shrink-0`} htmlFor="offer-boq-sort">
            Sort
          </label>
          <select
            id="offer-boq-sort"
            className="rounded-md border border-border bg-background px-2 py-2 text-sm min-h-[44px]"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as OfferBoqSortKey)}
            data-offer-boq-sort-key
          >
            <option value="lp">LP</option>
            <option value="direct">Direct</option>
            <option value="confidence">Pewność</option>
          </select>
          <button
            type="button"
            className="rounded-md border border-border bg-secondary/40 px-2.5 py-2 text-xs font-semibold min-h-[44px] touch-manipulation"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            data-offer-boq-sort-dir={sortDir}
            aria-label={sortDir === "asc" ? "Rosnąco" : "Malejąco"}
          >
            {sortDir === "asc" ? "↑" : "↓"}
          </button>
          <div
            className="ml-auto inline-flex rounded-md border border-border overflow-hidden"
            role="group"
            aria-label="Gęstość listy"
          >
            <button
              type="button"
              className={`px-3 py-2 text-xs font-semibold min-h-[44px] touch-manipulation ${
                density === "compact" ? "bg-primary/15 text-foreground" : "bg-background text-muted-foreground"
              }`}
              onClick={() => handleDensityToggle("compact")}
              data-offer-boq-density-toggle="compact"
              aria-pressed={density === "compact"}
            >
              Zwarty
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-xs font-semibold min-h-[44px] touch-manipulation border-l border-border ${
                density === "comfort" ? "bg-primary/15 text-foreground" : "bg-background text-muted-foreground"
              }`}
              onClick={() => handleDensityToggle("comfort")}
              data-offer-boq-density-toggle="comfort"
              aria-pressed={density === "comfort"}
            >
              Komfort
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <TenderUxSectionTitle>Kosztorys ofertowy (AI Cost)</TenderUxSectionTitle>
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
          Główny kosztorys ofertowy WGDOM — edytuj komponenty, zatwierdzaj. Kp, marża i cena ofertowa: Bid Proposal (L2).
        </p>
      </div>

      <div
        className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
        data-offer-boq-summary
      >
        <SummaryKpi label="Pozycje" value={String(s.lineCount)} />
        <SummaryKpi label="Do weryfikacji" value={String(s.reviewRequiredCount)} />
        <SummaryKpi label="Zatwierdzone" value={String(s.approvedCount)} sub="przez użytkownika" />
        <SummaryKpi label="Zmienione" value={String(s.changedCount)} sub="korekta użytkownika" />
        <SummaryKpi label="Tylko AI" value={String(s.aiOnlyCount)} sub="bez ingerencji" />
        <SummaryKpi
          label="Koszt bezpośredni"
          value={s.directCostDisplay}
          sub={`${s.averageConfidenceBadge.emoji} ${s.averageConfidenceLabelPl}`}
        />
      </div>

      <div
        className="rounded-lg border border-border bg-background/60 overflow-hidden"
        data-offer-boq-details-accordion
      >
        <button
          type="button"
          className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-secondary/30 touch-manipulation min-h-[44px]"
          onClick={() => setDetailsOpen((v) => !v)}
          aria-expanded={detailsOpen}
          data-offer-boq-details-toggle
        >
          {detailsOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>
            Szczegóły wyceny
          </span>
          <span className={`${TEUX_FONT_META} text-muted-foreground`}>
            Jakość · Wiedza · Explainability · Readiness
          </span>
        </button>

        {detailsOpen ? (
          <div className="border-t border-border/70 p-3 space-y-3" data-offer-boq-details-body>
            <section
              className="rounded-lg border border-border bg-background/60 p-3 space-y-2"
              data-offer-boq-company-knowledge-stats
            >
              <h3 className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>
                Baza wiedzy firmy (tylko odczyt)
              </h3>
              <p className={`${TEUX_FONT_META} text-muted-foreground`}>
                Lokalna wiedza z zatwierdzeń i korekt — bez synchronizacji chmurowej. W tym kosztorysie
                wiedza firmy użyta w {s.companyKnowledgeHitCount} komponentach.
              </p>
              <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                <SummaryKpi label="Zapisane komponenty" value={String(knowledgeStats.entryCount)} />
                <SummaryKpi
                  label="Potwierdzone przez użytkownika"
                  value={String(knowledgeStats.userConfirmedEntryCount)}
                />
                <SummaryKpi
                  label="Zgodność AI ↔ użytkownik"
                  value={
                    knowledgeStats.aiUserAgreementPct == null
                      ? "—"
                      : `${knowledgeStats.aiUserAgreementPct}%`
                  }
                  sub="zatwierdzenia / decyzje"
                />
                <SummaryKpi
                  label="Obserwacje"
                  value={String(knowledgeStats.observationCount)}
                  sub={`zatw. ${knowledgeStats.approvedObservationCount} · zm. ${knowledgeStats.changedObservationCount}`}
                />
              </div>
              {knowledgeStats.topMaterials.length > 0 ? (
                <div className="space-y-1">
                  <p className={`${TEUX_FONT_META} font-semibold text-muted-foreground uppercase tracking-wide`}>
                    Najczęściej wykorzystywane materiały
                  </p>
                  <ul className={`${TEUX_FONT_CAPTION} text-foreground space-y-0.5`}>
                    {knowledgeStats.topMaterials.map((m) => (
                      <li key={`${m.namePl}-${m.category}`}>
                        {m.namePl}{" "}
                        <span className="text-muted-foreground">({m.occurrenceCount}×)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
                  Brak zapisanych materiałów — zatwierdź lub skoryguj komponenty, aby budować wiedzę.
                </p>
              )}
            </section>

            {view.bidImpact?.available ? <BidImpactSection section={view.bidImpact} /> : null}

            {view.offerSummary ? <OfferSummarySection section={view.offerSummary} /> : null}

            {view.offerReadiness ? <OfferReadinessSection section={view.offerReadiness} /> : null}

            {view.aiQuality ? <AiQualitySection section={view.aiQuality} /> : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-2" data-offer-boq-lines>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Pozycje — edycja komponentów</h3>
          {filterActive ? (
            <span className={`${TEUX_FONT_META} text-muted-foreground`} data-offer-boq-filter-active>
              Widoczne: {visibleLines.length}
              {reviewOnly ? " · tylko do weryfikacji" : ""}
              {searchQuery.trim() ? " · wyszukiwanie" : ""}
            </span>
          ) : null}
        </div>
        {visibleLines.length === 0 ? (
          <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`} data-offer-boq-review-only-empty>
            {filterActive
              ? "Brak pozycji dla filtra / wyszukiwania."
              : "Brak pozycji kosztorysu."}
          </p>
        ) : (
          visibleLines.map((line) => (
            <LineExplainCard
              key={line.lineId}
              line={line}
              open={Boolean(openIds[line.lineId])}
              density={density}
              editingComponentId={
                editingKey?.startsWith(`${line.lineId}:`)
                  ? editingKey.slice(line.lineId.length + 1)
                  : null
              }
              onToggle={() => {
                setOpenIds((prev) => ({ ...prev, [line.lineId]: !prev[line.lineId] }));
                setEditingKey(null);
              }}
              onPatch={handlePatch}
              onApprove={handleApprove}
              onToggleComponentEdit={(componentId) =>
                handleToggleComponentEdit(line.lineId, componentId)
              }
            />
          ))
        )}
      </div>
    </section>
  );
}
