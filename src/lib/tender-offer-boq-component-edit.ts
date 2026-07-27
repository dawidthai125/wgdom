/**
 * AI-COST-01 / COST-S5 — edycja komponentów wyceny (pure).
 * Bez przebudowy Pricing Engine · bez Kp / marży / ceny ofertowej.
 */

import {
  computeOfferBoqRecomputeToken,
  emptyOfferBoqTotals,
  type OfferBoqComponentChangeRecord,
  type OfferBoqComponentEditStatus,
  type OfferBoqDocument,
  type OfferBoqLine,
  type OfferBoqLinePricing,
  type OfferBoqPriceOrigin,
  type OfferBoqPriceOriginKind,
  type OfferBoqPricedComponent,
  type OfferBoqPricedComponentCategory,
  type OfferBoqUserEditStats,
} from "@/lib/tender-offer-boq";
import { aggregateOfferBoqPricedComponents } from "@/lib/tender-offer-boq-pricing-engine";
import { learnFromOfferBoqComponentDecision } from "@/lib/tender-offer-boq-company-knowledge";

export const OFFER_BOQ_COMPONENT_EDIT_STATUS_LABELS_PL: Record<OfferBoqComponentEditStatus, string> = {
  ai_proposal: "Propozycja AI",
  user_approved: "Zatwierdzony przez użytkownika",
  user_changed: "Zmieniony przez użytkownika",
};

export const OFFER_BOQ_PRICE_ORIGIN_KIND_LABELS_PL: Record<OfferBoqPriceOriginKind, string> = {
  work_catalog: "Biblioteka Robót WGDOM",
  company_model: "Model kosztów firmy",
  category_rate: "Stawka kategorii",
  heuristic_estimate: "Heurystyka / szacunek",
  company_knowledge: "Wiedza firmy (kosztorysy)",
  external_future: "Przyszła integracja",
  unknown: "Nieznane / ręczne",
};

function roundPln(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function serializeValue(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function normalizeOfferBoqPricedComponent(
  component: OfferBoqPricedComponent,
): OfferBoqPricedComponent {
  return {
    ...component,
    editStatus: component.editStatus ?? "ai_proposal",
    changeHistory: component.changeHistory ? [...component.changeHistory] : [],
  };
}

export function normalizeOfferBoqDocumentForEdit(doc: OfferBoqDocument): OfferBoqDocument {
  const lines = doc.lines.map((line) => {
    const pricing = line.linePricing;
    if (!pricing) return line;
    const components = pricing.components.map(normalizeOfferBoqPricedComponent);
    return {
      ...line,
      linePricing: { ...pricing, components },
    };
  });
  return {
    ...doc,
    lines,
    userEditStats: computeOfferBoqUserEditStats({ ...doc, lines }),
  };
}

export function computeOfferBoqUserEditStats(
  doc: OfferBoqDocument,
): OfferBoqUserEditStats {
  let componentCount = 0;
  let aiOnlyCount = 0;
  let approvedCount = 0;
  let changedCount = 0;
  for (const line of doc.lines) {
    for (const c of line.linePricing?.components ?? []) {
      componentCount += 1;
      const status = c.editStatus ?? "ai_proposal";
      if (status === "user_approved") approvedCount += 1;
      else if (status === "user_changed") changedCount += 1;
      else aiOnlyCount += 1;
    }
  }
  return { componentCount, aiOnlyCount, approvedCount, changedCount };
}

function recomputeComponentTotal(component: OfferBoqPricedComponent): OfferBoqPricedComponent {
  const qty = component.quantity;
  const unit = component.unitPricePln;
  const totalPln =
    unit != null && Number.isFinite(unit) && Number.isFinite(qty) && qty > 0
      ? roundPln(unit * qty)
      : unit != null && Number.isFinite(unit) && qty === 0
        ? 0
        : null;
  return { ...component, totalPln };
}

function rebuildLinePricing(
  line: OfferBoqLine,
  components: OfferBoqPricedComponent[],
  pricedAt: string,
): OfferBoqLinePricing {
  const normalized = components.map(recomputeComponentTotal).map(normalizeOfferBoqPricedComponent);
  const aggregates = aggregateOfferBoqPricedComponents(normalized);
  const pricedComponentCount = normalized.filter((c) => c.totalPln != null).length;
  return {
    components: normalized,
    aggregates,
    pricedAt,
    confidence: line.linePricing?.confidence ?? "medium",
    aiRationale:
      line.linePricing?.aiRationale ??
      "Wycena komponentowa — koszty bezpośrednie (bez Kp / marży / oferty).",
    componentCount: normalized.length,
    pricedComponentCount,
  };
}

function syncLineMoneyFields(line: OfferBoqLine, pricing: OfferBoqLinePricing): OfferBoqLine {
  const aggregates = pricing.aggregates;
  return {
    ...line,
    linePricing: pricing,
    materialCostPln: aggregates.materialsPln,
    laborCostPln: aggregates.laborPln,
    equipmentCostPln: aggregates.equipmentPln,
    directCostPln: aggregates.lineDirectPln,
    lineTotalPln: aggregates.lineDirectPln,
    // Prep S6 — nie wypełniać
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    userEdited: true,
  };
}

function rollupDocumentTotals(doc: OfferBoqDocument, lines: OfferBoqLine[]): OfferBoqDocument {
  let materials = 0;
  let labor = 0;
  let equipment = 0;
  let direct = 0;
  let hasM = false;
  let hasL = false;
  let hasE = false;
  let hasD = false;
  let pricedLineCount = 0;

  for (const l of lines) {
    const a = l.linePricing?.aggregates;
    if (!a) continue;
    if (a.materialsPln != null) {
      materials += a.materialsPln;
      hasM = true;
    }
    if (a.laborPln != null) {
      labor += a.laborPln;
      hasL = true;
    }
    if (a.equipmentPln != null) {
      equipment += a.equipmentPln;
      hasE = true;
    }
    if (a.lineDirectPln != null) {
      direct += a.lineDirectPln;
      hasD = true;
      pricedLineCount += 1;
    }
  }

  const nextDoc: OfferBoqDocument = {
    ...doc,
    lines,
    totals: {
      ...emptyOfferBoqTotals(lines.length),
      materialsPln: hasM ? roundPln(materials) : null,
      laborPln: hasL ? roundPln(labor) : null,
      equipmentPln: hasE ? roundPln(equipment) : null,
      directPln: hasD ? roundPln(direct) : null,
      costPricePln: hasD ? roundPln(direct) : null,
      kpPln: null,
      overheadPln: null,
      marginPln: null,
      recommendedBidPln: null,
      pricedLineCount,
    },
    recomputeToken: computeOfferBoqRecomputeToken(lines),
    version: doc.version + 1,
    buildStatus: pricedLineCount > 0 ? "partially_priced" : doc.buildStatus,
  };
  nextDoc.userEditStats = computeOfferBoqUserEditStats(nextDoc);
  return nextDoc;
}

export type OfferBoqComponentPatch = {
  namePl?: string;
  quantity?: number;
  unit?: string;
  unitPricePln?: number | null;
  category?: OfferBoqPricedComponentCategory;
  requiresUserReview?: boolean;
  priceOriginKind?: OfferBoqPriceOriginKind;
  priceOriginLabelPl?: string;
};

function appendHistory(
  history: OfferBoqComponentChangeRecord[],
  field: string,
  previousValue: unknown,
  nextValue: unknown,
  changedAt: string,
): OfferBoqComponentChangeRecord[] {
  const prev = serializeValue(previousValue);
  const next = serializeValue(nextValue);
  if (prev === next) return history;
  return [...history, { field, previousValue: prev, nextValue: next, changedAt }];
}

/**
 * Patch komponentu + natychmiastowe przeliczenie pozycji i dokumentu.
 * Przy zmianie zapisuje wiedzę firmy (COST-S5.1).
 */
export function patchOfferBoqComponentInDocument(
  doc: OfferBoqDocument,
  lineId: string,
  componentId: string,
  patch: OfferBoqComponentPatch,
  changedAt = new Date().toISOString(),
): OfferBoqDocument {
  let learned: OfferBoqPricedComponent | null = null;
  let learnedFromAi = false;
  let learnedFields: string[] = [];

  const lines = doc.lines.map((line) => {
    if (line.lineId !== lineId || !line.linePricing) return line;
    const components = line.linePricing.components.map((raw) => {
      const c = normalizeOfferBoqPricedComponent(raw);
      if (c.componentId !== componentId) return c;

      let history = [...(c.changeHistory ?? [])];
      let next: OfferBoqPricedComponent = { ...c };
      const histBefore = history.length;

      if (patch.namePl !== undefined && patch.namePl !== c.namePl) {
        history = appendHistory(history, "namePl", c.namePl, patch.namePl, changedAt);
        next.namePl = patch.namePl;
      }
      if (patch.quantity !== undefined && patch.quantity !== c.quantity) {
        history = appendHistory(history, "quantity", c.quantity, patch.quantity, changedAt);
        next.quantity = patch.quantity;
      }
      if (patch.unit !== undefined && patch.unit !== c.unit) {
        history = appendHistory(history, "unit", c.unit, patch.unit, changedAt);
        next.unit = patch.unit;
      }
      if (patch.unitPricePln !== undefined && patch.unitPricePln !== c.unitPricePln) {
        history = appendHistory(history, "unitPricePln", c.unitPricePln, patch.unitPricePln, changedAt);
        next.unitPricePln = patch.unitPricePln;
      }
      if (patch.category !== undefined && patch.category !== c.category) {
        history = appendHistory(history, "category", c.category, patch.category, changedAt);
        next.category = patch.category;
      }
      if (
        patch.requiresUserReview !== undefined &&
        patch.requiresUserReview !== c.requiresUserReview
      ) {
        history = appendHistory(
          history,
          "requiresUserReview",
          c.requiresUserReview,
          patch.requiresUserReview,
          changedAt,
        );
        next.requiresUserReview = patch.requiresUserReview;
      }
      if (patch.priceOriginKind !== undefined || patch.priceOriginLabelPl !== undefined) {
        const origin: OfferBoqPriceOrigin = {
          ...c.priceOrigin,
          kind: patch.priceOriginKind ?? c.priceOrigin.kind,
          labelPl:
            patch.priceOriginLabelPl ??
            (patch.priceOriginKind
              ? OFFER_BOQ_PRICE_ORIGIN_KIND_LABELS_PL[patch.priceOriginKind] ??
                c.priceOrigin.labelPl
              : c.priceOrigin.labelPl),
        };
        if (
          origin.kind !== c.priceOrigin.kind ||
          origin.labelPl !== c.priceOrigin.labelPl
        ) {
          history = appendHistory(history, "priceOrigin", c.priceOrigin, origin, changedAt);
          next.priceOrigin = origin;
        }
      }

      const touched = history.length > histBefore;
      next.changeHistory = history;
      if (touched) {
        next.editStatus = "user_changed";
        if (patch.requiresUserReview === undefined) {
          next.requiresUserReview = false;
        }
        learned = recomputeComponentTotal(next);
        learnedFromAi = (c.editStatus ?? "ai_proposal") === "ai_proposal";
        learnedFields = history.slice(histBefore).map((h) => h.field);
      }
      return next;
    });

    const pricing = rebuildLinePricing(line, components, changedAt);
    return syncLineMoneyFields(line, pricing);
  });

  const nextDoc = rollupDocumentTotals(doc, lines);
  if (learned) {
    learnFromOfferBoqComponentDecision({
      component: learned,
      decision: "changed",
      fromAi: learnedFromAi,
      fieldsChanged: learnedFields,
      tenderId: doc.tenderId,
      lineId,
      observedAt: changedAt,
    });
  }
  return nextDoc;
}

/** Zatwierdzenie komponentu bez zmiany wartości. */
export function approveOfferBoqComponentInDocument(
  doc: OfferBoqDocument,
  lineId: string,
  componentId: string,
  changedAt = new Date().toISOString(),
): OfferBoqDocument {
  let approvedComp: OfferBoqPricedComponent | null = null;
  let fromAi = false;

  const lines = doc.lines.map((line) => {
    if (line.lineId !== lineId || !line.linePricing) return line;
    const components = line.linePricing.components.map((raw) => {
      const c = normalizeOfferBoqPricedComponent(raw);
      if (c.componentId !== componentId) return c;
      if (c.editStatus === "user_approved") return c;
      fromAi = (c.editStatus ?? "ai_proposal") === "ai_proposal";
      const history = appendHistory(
        c.changeHistory ?? [],
        "editStatus",
        c.editStatus ?? "ai_proposal",
        "user_approved",
        changedAt,
      );
      const next = {
        ...c,
        editStatus: "user_approved" as const,
        requiresUserReview: false,
        changeHistory: history,
      };
      approvedComp = next;
      return next;
    });
    const pricing = rebuildLinePricing(line, components, changedAt);
    return syncLineMoneyFields(line, pricing);
  });
  const nextDoc = rollupDocumentTotals(doc, lines);
  if (approvedComp) {
    learnFromOfferBoqComponentDecision({
      component: approvedComp,
      decision: "approved",
      fromAi,
      fieldsChanged: ["editStatus"],
      tenderId: doc.tenderId,
      lineId,
      observedAt: changedAt,
    });
  }
  return nextDoc;
}
