/**
 * COST-S5 — panel AI Cost Intelligence z edycją komponentów wyceny.
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
} from "@/lib/tender-offer-boq-explainability";
import {
  approveOfferBoqComponentInDocument,
  OFFER_BOQ_PRICE_ORIGIN_KIND_LABELS_PL,
  patchOfferBoqComponentInDocument,
} from "@/lib/tender-offer-boq-component-edit";
import { OFFER_BOQ_PRICED_CATEGORY_LABELS_PL } from "@/lib/tender-offer-boq-pricing-engine";

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

function FieldLabel({ children }: { children: string }) {
  return <label className={`${TEUX_FONT_META} text-muted-foreground block mb-0.5`}>{children}</label>;
}

function EditableComponentCard({
  lineId,
  component,
  onPatch,
  onApprove,
}: {
  lineId: string;
  component: OfferBoqExplainComponentRow;
  onPatch: (
    lineId: string,
    componentId: string,
    patch: Parameters<typeof patchOfferBoqComponentInDocument>[3],
  ) => void;
  onApprove: (lineId: string, componentId: string) => void;
}) {
  const inputClass =
    "w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground";

  return (
    <li
      className="rounded-lg border border-border bg-background/80 p-2.5 space-y-2"
      data-offer-boq-component-id={component.componentId}
      data-offer-boq-editable="true"
      data-offer-boq-component-editable="true"
    >
      <div className="flex flex-wrap items-center gap-2">
        <EditStatusBadge status={component.editStatus} label={component.editStatusLabelPl} />
        <ConfidenceBadge badge={component.confidenceBadge} />
        {component.changeHistoryCount > 0 ? (
          <span className={`${TEUX_FONT_META} text-muted-foreground`}>
            Historia: {component.changeHistoryCount}
          </span>
        ) : null}
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300"
          onClick={() => onApprove(lineId, component.componentId)}
          data-offer-boq-approve
        >
          <Check className="h-3 w-3" aria-hidden />
          Zatwierdź
        </button>
      </div>

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
    </li>
  );
}

function LineExplainCard({
  line,
  open,
  onToggle,
  onPatch,
  onApprove,
}: {
  line: OfferBoqExplainLineCard;
  open: boolean;
  onToggle: () => void;
  onPatch: (
    lineId: string,
    componentId: string,
    patch: Parameters<typeof patchOfferBoqComponentInDocument>[3],
  ) => void;
  onApprove: (lineId: string, componentId: string) => void;
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
              Komponenty wyceny — edycja ({line.components.length})
            </h4>
            {line.components.length === 0 ? (
              <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>Brak komponentów wyceny.</p>
            ) : (
              <ul className="space-y-2">
                {line.components.map((c) => (
                  <EditableComponentCard
                    key={c.componentId}
                    lineId={line.lineId}
                    component={c}
                    onPatch={onPatch}
                    onApprove={onApprove}
                  />
                ))}
              </ul>
            )}
          </section>

          <p className={`${TEUX_FONT_META} text-muted-foreground`}>
            Zmiany przeliczają koszt bezpośredni od razu. Kp, marża i cena ofertowa — COST-S6 (REUSE Bid Proposal).
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
  pricingCatalogRevision?: number;
}) {
  const baseline = useMemo(
    () => buildOfferBoqExplainabilityView({ item }),
    [item, pricingCatalogRevision],
  );
  const [doc, setDoc] = useState<OfferBoqDocument | null>(null);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setDoc(baseline.document);
    setOpenIds({});
  }, [item.id, pricingCatalogRevision, baseline.builtAt]);

  const view = useMemo(() => {
    if (!baseline.available) return baseline;
    if (!doc) return baseline;
    return presentOfferBoqExplainabilityView(doc, baseline.builtAt);
  }, [baseline, doc]);

  const handlePatch = (
    lineId: string,
    componentId: string,
    patch: Parameters<typeof patchOfferBoqComponentInDocument>[3],
  ) => {
    setDoc((prev) => {
      if (!prev) return prev;
      return patchOfferBoqComponentInDocument(prev, lineId, componentId, patch);
    });
  };

  const handleApprove = (lineId: string, componentId: string) => {
    setDoc((prev) => {
      if (!prev) return prev;
      return approveOfferBoqComponentInDocument(prev, lineId, componentId);
    });
  };

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
      data-offer-boq-editable="components-only"
    >
      <div className="space-y-1">
        <TenderUxSectionTitle>AI Cost Intelligence</TenderUxSectionTitle>
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
          Współtwórz kosztorys z AI — edytuj komponenty i zatwierdzaj. To nie jest cena ofertowa (bez Kp i marży).
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

      <div className="space-y-2" data-offer-boq-lines>
        <h3 className="text-sm font-semibold text-foreground">Pozycje — edycja komponentów</h3>
        {view.lines.map((line) => (
          <LineExplainCard
            key={line.lineId}
            line={line}
            open={Boolean(openIds[line.lineId])}
            onToggle={() =>
              setOpenIds((prev) => ({ ...prev, [line.lineId]: !prev[line.lineId] }))
            }
            onPatch={handlePatch}
            onApprove={handleApprove}
          />
        ))}
      </div>
    </section>
  );
}
