/**
 * AI-COST-01 / COST-S6 — adapter OfferBoq → Bid Proposal (pure, bez logiki Kp/marży).
 * REUSE: computeTenderBidProposal — jedyny silnik oferty końcowej.
 */

import type { TenderFitAssessment } from "@/lib/tenders-bzp-fit";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderCompanyCostModel } from "@/lib/tenders-bzp-company";
import {
  computeTenderBidProposal,
  type TenderBidOfferBoqDirectInput,
  type TenderBidProposal,
} from "@/lib/tenders-bid-calculator";
import { computeBidMarginPct } from "@/lib/tender-bid-ux";
import { countCompanyKnowledgeHits } from "@/lib/tender-offer-boq-company-knowledge";
import type {
  OfferBoqConfidence,
  OfferBoqDocument,
  OfferBoqTotals,
} from "@/lib/tender-offer-boq";
import type { TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";

export type OfferBoqBidAuditStepId =
  | "ai_cost"
  | "adapter"
  | "bid_proposal"
  | "result";

export interface OfferBoqBidAuditStep {
  id: OfferBoqBidAuditStepId;
  labelPl: string;
  detailPl: string;
  valueDisplay?: string | null;
}

export interface OfferBoqBidAdapterPayload {
  directInput: TenderBidOfferBoqDirectInput;
  averageConfidence: OfferBoqConfidence;
  companyKnowledgeHitCount: number;
  componentCount: number;
  pricedComponentCount: number;
  builtAt: string;
}

export interface OfferBoqBidIntegrationResult {
  proposal: TenderBidProposal;
  payload: OfferBoqBidAdapterPayload;
  auditTrail: OfferBoqBidAuditStep[];
  documentWithTotals: OfferBoqDocument;
}

function roundPln(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function sumCategoryFromDocument(
  doc: OfferBoqDocument,
  key: "materialsPln" | "laborPln" | "equipmentPln" | "transportPln" | "auxiliaryPln",
): number {
  let sum = 0;
  let has = false;
  for (const line of doc.lines) {
    const agg = line.linePricing?.aggregates;
    if (!agg || agg[key] == null) continue;
    sum += agg[key] ?? 0;
    has = true;
  }
  return has ? roundPln(sum) : 0;
}

function averageLineConfidence(doc: OfferBoqDocument): OfferBoqConfidence {
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const line of doc.lines) {
    const c = line.linePricing?.confidence;
    if (!c) continue;
    if (c === "high") high += 1;
    else if (c === "medium") medium += 1;
    else low += 1;
  }
  const total = high + medium + low;
  if (total <= 0) return "low";
  const score = (high * 3 + medium * 2 + low) / total;
  if (score >= 2.5) return "high";
  if (score >= 1.75) return "medium";
  return "low";
}

/**
 * Buduje payload adaptera z dokumentu AI Cost — bez wyliczeń ofertowych.
 */
export function buildOfferBoqBidAdapterPayload(
  doc: OfferBoqDocument,
  builtAt = new Date().toISOString(),
): OfferBoqBidAdapterPayload | null {
  const directPln = doc.totals.directPln;
  if (directPln == null || !(directPln > 0)) return null;

  const materialsPln = doc.totals.materialsPln ?? sumCategoryFromDocument(doc, "materialsPln");
  const laborPln = doc.totals.laborPln ?? sumCategoryFromDocument(doc, "laborPln");
  const equipmentPln = doc.totals.equipmentPln ?? sumCategoryFromDocument(doc, "equipmentPln");
  const transportPln = sumCategoryFromDocument(doc, "transportPln");
  const auxiliaryPln = sumCategoryFromDocument(doc, "auxiliaryPln");

  const stats = doc.pricingStats;
  const componentCount = stats?.componentCount ?? 0;
  const pricedComponentCount = stats?.pricedComponentCount ?? 0;
  const averageConfidence = averageLineConfidence(doc);
  const companyKnowledgeHitCount = countCompanyKnowledgeHits(doc);

  const directInput: TenderBidOfferBoqDirectInput = {
    directPln: roundPln(directPln),
    materialsPln: roundPln(materialsPln),
    laborPln: roundPln(laborPln),
    equipmentPln: roundPln(equipmentPln),
    transportPln: roundPln(transportPln),
    auxiliaryPln: roundPln(auxiliaryPln),
    componentCount,
    pricedComponentCount,
    averageConfidence,
    companyKnowledgeHitCount,
    sourceLabelPl: "AI Cost Intelligence — koszt bezpośredni z komponentów",
  };

  return {
    directInput,
    averageConfidence,
    companyKnowledgeHitCount,
    componentCount,
    pricedComponentCount,
    builtAt,
  };
}

function extractKpFromProposal(proposal: TenderBidProposal): number | null {
  if (!proposal.ok) return null;
  const kpLine = proposal.costStack.find((l) => /\bkp\b|pośredn/i.test(l.label));
  return kpLine?.pln ?? null;
}

function extractProfitFromProposal(proposal: TenderBidProposal): number | null {
  if (!proposal.ok) return null;
  const profitLine = proposal.costStack.find((l) => /zysk/i.test(l.label));
  return profitLine?.pln ?? null;
}

/**
 * Wypełnia OfferBoqTotals wartościami z TenderBidProposal (SSOT oferty).
 */
export function mergeOfferBoqBidProposalIntoDocument(
  doc: OfferBoqDocument,
  proposal: TenderBidProposal,
): OfferBoqDocument {
  if (!proposal.ok) {
    return {
      ...doc,
      totals: {
        ...doc.totals,
        kpPln: null,
        overheadPln: null,
        costPricePln: doc.totals.directPln,
        marginPln: null,
        recommendedBidPln: null,
        profitPln: null,
        profitabilityPct: null,
      },
      warnings: [
        ...doc.warnings,
        ...(proposal.warnings.length ? proposal.warnings : ["Bid Proposal — brak pełnej wyceny ofertowej."]),
      ],
    };
  }

  const kpPln = extractKpFromProposal(proposal);
  const overheadLine = proposal.costStack.find((l) => /stałe firmy|kzP/i.test(l.label));
  const profitPln = extractProfitFromProposal(proposal);
  const costPricePln = proposal.costPricePln;
  const recommendedBidPln = proposal.recommendedBidPln;
  const marginPln =
    recommendedBidPln != null && costPricePln != null
      ? roundPln(recommendedBidPln - costPricePln)
      : null;
  const profitabilityPct = computeBidMarginPct(recommendedBidPln, costPricePln);

  const totals: OfferBoqTotals = {
    ...doc.totals,
    kpPln,
    overheadPln: overheadLine?.pln ?? null,
    costPricePln,
    marginPln,
    recommendedBidPln,
    profitPln,
    profitabilityPct,
  };

  return {
    ...doc,
    totals,
    buildStatus: recommendedBidPln != null ? "priced" : doc.buildStatus,
  };
}

export function buildOfferBoqBidAuditTrail(opts: {
  payload: OfferBoqBidAdapterPayload;
  proposal: TenderBidProposal;
}): OfferBoqBidAuditStep[] {
  const { payload, proposal } = opts;
  const d = payload.directInput;

  return [
    {
      id: "ai_cost",
      labelPl: "AI Cost Intelligence",
      detailPl:
        `Koszt bezpośredni z ${d.componentCount} komponentów` +
        ` (${d.pricedComponentCount} z ceną).` +
        ` Pewność: ${d.averageConfidence}.` +
        (d.companyKnowledgeHitCount > 0
          ? ` Wiedza firmy: ${d.companyKnowledgeHitCount} trafień.`
          : ""),
      valueDisplay: `${d.directPln.toLocaleString("pl-PL")} zł`,
    },
    {
      id: "adapter",
      labelPl: "Adapter AI Cost → Bid Proposal",
      detailPl:
        `Przekazano: materiały ${d.materialsPln.toLocaleString("pl-PL")} zł · ` +
        `robocizna ${d.laborPln.toLocaleString("pl-PL")} zł · ` +
        `sprzęt ${d.equipmentPln.toLocaleString("pl-PL")} zł · ` +
        `transport ${d.transportPln.toLocaleString("pl-PL")} zł · ` +
        `pomocnicze ${d.auxiliaryPln.toLocaleString("pl-PL")} zł. Bez logiki Kp/marży w adapterze.`,
      valueDisplay: d.sourceLabelPl ?? null,
    },
    {
      id: "bid_proposal",
      labelPl: "Bid Proposal (SSOT oferty)",
      detailPl: proposal.ok
        ? `Tryb ${proposal.pricingMode ?? "—"}. Kp, narzuty, marża i cena rekomendowana — wyłącznie moduł Bid Proposal.`
        : proposal.warnings[0] ?? "Bid Proposal nie zwrócił pełnej wyceny.",
      valueDisplay: proposal.sourceLabelPl ?? null,
    },
    {
      id: "result",
      labelPl: "Wynik końcowy",
      detailPl: proposal.ok
        ? "Koszt własny i cena rekomendowana pochodzą z Bid Proposal — nie z AI Cost."
        : "Brak pełnego wyniku — zweryfikuj koszt bezpośredni i profil firmy.",
      valueDisplay:
        proposal.recommendedBidPln != null
          ? `${proposal.recommendedBidPln.toLocaleString("pl-PL")} zł (rekomendowana)`
          : null,
    },
  ];
}

/**
 * Pełna integracja: adapter → computeTenderBidProposal → merge totals + audit trail.
 */
export function integrateOfferBoqWithBidProposal(opts: {
  doc: OfferBoqDocument;
  kosztorys: TenderKosztorysSnapshot | null | undefined;
  swz: TenderSwzAnalysis | null | undefined;
  fit: TenderFitAssessment | null | undefined;
  costModel: TenderCompanyCostModel;
  minProjectDays?: number;
  maxConcurrentProjects?: number;
  builtAt?: string;
}): OfferBoqBidIntegrationResult | null {
  const builtAt = opts.builtAt ?? new Date().toISOString();
  const payload = buildOfferBoqBidAdapterPayload(opts.doc, builtAt);
  if (!payload) return null;

  const proposal = computeTenderBidProposal({
    kosztorys: opts.kosztorys,
    swz: opts.swz,
    fit: opts.fit,
    costModel: opts.costModel,
    minProjectDays: opts.minProjectDays ?? 14,
    maxConcurrentProjects: opts.maxConcurrentProjects ?? 2,
    offerBoqDirect: payload.directInput,
  });

  const documentWithTotals = mergeOfferBoqBidProposalIntoDocument(opts.doc, proposal);
  const auditTrail = buildOfferBoqBidAuditTrail({ payload, proposal });

  return {
    proposal,
    payload,
    auditTrail,
    documentWithTotals,
  };
}
