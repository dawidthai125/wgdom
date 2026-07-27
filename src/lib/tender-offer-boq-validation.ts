/**
 * AI-COST-01 / COST-S7 — AI Validation & Offer Quality (read-only).
 * Silnik wykrywa ryzyka i ocenia gotowość oferty bez modyfikacji danych wejściowych.
 */

import type {
  OfferBoqComponentEditStatus,
  OfferBoqConfidence,
  OfferBoqDocument,
  OfferBoqLine,
  OfferBoqPricedComponent,
} from "@/lib/tender-offer-boq";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";

export type OfferBoqValidationSeverity = "critical" | "warning" | "info";
export type OfferBoqValidationPriority = "high" | "medium" | "low";
export type OfferBoqReadinessStatus = "ready" | "review_required" | "not_ready";

export interface OfferBoqValidationIssue {
  id: string;
  severity: OfferBoqValidationSeverity;
  code:
    | "line_unrecognized"
    | "line_unclassified"
    | "component_unpriced"
    | "component_low_confidence"
    | "component_review_required"
    | "component_quantity_inconsistent"
    | "component_unit_inconsistent"
    | "component_missing_price_source"
    | "line_not_priced"
    | "bid_not_available";
  lineId: string | null;
  componentId: string | null;
  titlePl: string;
  detailPl: string;
}

export interface OfferBoqValidationRecommendation {
  id: string;
  priority: OfferBoqValidationPriority;
  titlePl: string;
  detailPl: string;
  issueCode: OfferBoqValidationIssue["code"] | "quality_score";
  /** STAB-01 — liczność problemów w grupie. */
  occurrenceCount: number;
  /** Przykładowe LP / opisy do rozwinięcia w UI. */
  sampleLabelsPl: string[];
  expandable: boolean;
}

export interface OfferBoqValidationCompleteness {
  recognizedPct: number;
  classifiedPct: number;
  pricedPct: number;
 passedToBidPct: number;
  overallPct: number;
}

export interface OfferBoqQualityFactor {
  labelPl: string;
  impactScore: number;
  detailPl: string;
}

export interface OfferBoqQualityExplainability {
  reasoningPl: string[];
  loweredBy: OfferBoqQualityFactor[];
  increasedBy: OfferBoqQualityFactor[];
}

export interface OfferBoqValidationSummary {
  completenessPct: number;
  qualityScore: number;
  warningCount: number;
  criticalCount: number;
  recommendationCount: number;
  status: OfferBoqReadinessStatus;
  statusLabelPl: string;
}

export interface OfferBoqValidationReport {
  summary: OfferBoqValidationSummary;
  completeness: OfferBoqValidationCompleteness;
  issues: OfferBoqValidationIssue[];
  recommendations: OfferBoqValidationRecommendation[];
  qualityExplainability: OfferBoqQualityExplainability;
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function toPct(part: number, total: number): number {
  if (!(total > 0)) return 0;
  return clampPct((part / total) * 100);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function confidenceScore(c: OfferBoqConfidence): number {
  if (c === "high") return 100;
  if (c === "medium") return 65;
  return 35;
}

function issuePriorityFromSeverity(
  severity: OfferBoqValidationSeverity,
): OfferBoqValidationPriority {
  if (severity === "critical") return "high";
  if (severity === "warning") return "medium";
  return "low";
}

function hasPriceSource(component: OfferBoqPricedComponent): boolean {
  return (
    component.priceOrigin.kind !== "unknown"
    && Boolean(component.priceOrigin.labelPl?.trim())
  );
}

function pushIssue(
  out: OfferBoqValidationIssue[],
  issue: OfferBoqValidationIssue,
): void {
  out.push(issue);
}

function pushLineIssues(out: OfferBoqValidationIssue[], line: OfferBoqLine): void {
  const ci = line.costIntelligence;
  const pricing = line.linePricing;

  if (!line.catalogWorkId) {
    pushIssue(out, {
      id: `line_unrecognized:${line.lineId}`,
      severity: "warning",
      code: "line_unrecognized",
      lineId: line.lineId,
      componentId: null,
      titlePl: "Pozycja bez dopasowania katalogowego",
      detailPl: `Pozycja ${line.lp} nie ma przypisanego katalogWorkId.`,
    });
  }

  if (!ci || ci.lineKind === "Unknown") {
    pushIssue(out, {
      id: `line_unclassified:${line.lineId}`,
      severity: "warning",
      code: "line_unclassified",
      lineId: line.lineId,
      componentId: null,
      titlePl: "Pozycja bez klasyfikacji AI",
      detailPl: `Pozycja ${line.lp} nie została jednoznacznie sklasyfikowana.`,
    });
  }

  if (!pricing || pricing.aggregates.lineDirectPln == null || pricing.aggregates.lineDirectPln <= 0) {
    pushIssue(out, {
      id: `line_not_priced:${line.lineId}`,
      severity: "critical",
      code: "line_not_priced",
      lineId: line.lineId,
      componentId: null,
      titlePl: "Pozycja bez kosztu bezpośredniego",
      detailPl: `Pozycja ${line.lp} nie ma kompletnej wyceny lineDirect.`,
    });
  }
}

function pushComponentIssues(out: OfferBoqValidationIssue[], line: OfferBoqLine): void {
  const components = line.linePricing?.components ?? [];
  for (const c of components) {
    const editStatus: OfferBoqComponentEditStatus = c.editStatus ?? "ai_proposal";
    const userLocked = editStatus === "user_approved" || editStatus === "user_changed";

    if (
      !userLocked &&
      (c.unitPricePln == null || !(c.unitPricePln > 0) || c.totalPln == null || !(c.totalPln > 0))
    ) {
      pushIssue(out, {
        id: `component_unpriced:${line.lineId}:${c.componentId}`,
        severity: "critical",
        code: "component_unpriced",
        lineId: line.lineId,
        componentId: c.componentId,
        titlePl: "Komponent bez ceny",
        detailPl: `Komponent „${c.namePl}” (${line.lp}) nie ma kompletnej ceny jednostkowej lub wartości.`,
      });
    }

    if (!userLocked && c.confidence === "low") {
      pushIssue(out, {
        id: `component_low_confidence:${line.lineId}:${c.componentId}`,
        severity: "warning",
        code: "component_low_confidence",
        lineId: line.lineId,
        componentId: c.componentId,
        titlePl: "Niska pewność komponentu",
        detailPl: `Komponent „${c.namePl}” ma niski poziom pewności AI.`,
      });
    }

    // STAB-01 — nie oznaczaj każdego ai_proposal; tylko realny requiresUserReview
    if (!userLocked && c.requiresUserReview) {
      pushIssue(out, {
        id: `component_review_required:${line.lineId}:${c.componentId}`,
        severity: "warning",
        code: "component_review_required",
        lineId: line.lineId,
        componentId: c.componentId,
        titlePl: "Komponent wymaga weryfikacji",
        detailPl: `Komponent „${c.namePl}” wymaga weryfikacji użytkownika.`,
      });
    }

    if (!Number.isFinite(c.quantity) || !(c.quantity > 0)) {
      pushIssue(out, {
        id: `component_quantity_inconsistent:${line.lineId}:${c.componentId}`,
        severity: "critical",
        code: "component_quantity_inconsistent",
        lineId: line.lineId,
        componentId: c.componentId,
        titlePl: "Niespójna ilość komponentu",
        detailPl: `Komponent „${c.namePl}” ma niepoprawną ilość (${String(c.quantity)}).`,
      });
    }

    if (!c.unit?.trim()) {
      pushIssue(out, {
        id: `component_unit_inconsistent:${line.lineId}:${c.componentId}`,
        severity: "warning",
        code: "component_unit_inconsistent",
        lineId: line.lineId,
        componentId: c.componentId,
        titlePl: "Brak jednostki komponentu",
        detailPl: `Komponent „${c.namePl}” nie ma uzupełnionej jednostki.`,
      });
    }

    if (!userLocked && !hasPriceSource(c)) {
      pushIssue(out, {
        id: `component_missing_price_source:${line.lineId}:${c.componentId}`,
        severity: "warning",
        code: "component_missing_price_source",
        lineId: line.lineId,
        componentId: c.componentId,
        titlePl: "Brak źródła wyceny",
        detailPl: `Komponent „${c.namePl}” nie ma wiarygodnego źródła ceny.`,
      });
    }
  }
}

const ISSUE_TITLE_PL: Record<OfferBoqValidationIssue["code"], string> = {
  line_unrecognized: "Pozycje bez dopasowania katalogowego",
  line_unclassified: "Pozycje bez klasyfikacji AI",
  component_unpriced: "Komponenty bez ceny",
  component_low_confidence: "Komponenty z niską pewnością",
  component_review_required: "Komponenty wymagające weryfikacji",
  component_quantity_inconsistent: "Niespójne ilości komponentów",
  component_unit_inconsistent: "Brak jednostki komponentu",
  component_missing_price_source: "Brak źródła wyceny",
  line_not_priced: "Pozycje bez kosztu bezpośredniego",
  bid_not_available: "Oferta końcowa niedostępna",
};

function sampleLabelFromIssue(issue: OfferBoqValidationIssue, doc: OfferBoqDocument): string {
  if (!issue.lineId) return issue.detailPl.slice(0, 80);
  const line = doc.lines.find((l) => l.lineId === issue.lineId);
  if (!line) return issue.detailPl.slice(0, 80);
  const desc = String(line.description || "").slice(0, 48);
  return `LP ${line.lp}: ${desc}${desc.length >= 48 ? "…" : ""}`;
}

/**
 * STAB-01 — grupuj podobne rekomendacje zamiast 1:1 na każdy issue.
 */
export function buildGroupedRecommendations(
  issues: OfferBoqValidationIssue[],
  doc: OfferBoqDocument,
  qualityScore: number,
): OfferBoqValidationRecommendation[] {
  const byCode = new Map<OfferBoqValidationIssue["code"], OfferBoqValidationIssue[]>();
  for (const issue of issues) {
    const list = byCode.get(issue.code) ?? [];
    list.push(issue);
    byCode.set(issue.code, list);
  }

  const severityRank = (code: OfferBoqValidationIssue["code"]): number => {
    const sample = byCode.get(code)?.[0];
    if (!sample) return 9;
    if (sample.severity === "critical") return 0;
    if (sample.severity === "warning") return 1;
    return 2;
  };

  const codes = Array.from(byCode.keys()).sort((a, b) => severityRank(a) - severityRank(b));
  const recommendations: OfferBoqValidationRecommendation[] = [];

  for (const code of codes) {
    const group = byCode.get(code) ?? [];
    if (!group.length) continue;
    const count = group.length;
    const priority = issuePriorityFromSeverity(group[0].severity);
    const baseTitle = ISSUE_TITLE_PL[code] ?? group[0].titlePl;
    const titlePl = count === 1 ? group[0].titlePl : `${baseTitle} — ${count} wystąpień`;
    const samples = group.slice(0, 8).map((i) => sampleLabelFromIssue(i, doc));
    recommendations.push({
      id: `rec:group:${code}`,
      priority,
      titlePl,
      detailPl:
        count === 1
          ? group[0].detailPl
          : `Wykryto ${count} podobnych problemów. Rozwiń listę, aby zobaczyć przykłady (LP). Najpierw krytyczne / bez ceny.`,
      issueCode: code,
      occurrenceCount: count,
      sampleLabelsPl: samples,
      expandable: count > 1,
    });
  }

  if (qualityScore < 75) {
    recommendations.push({
      id: "rec:quality_score",
      priority: "high",
      titlePl: "Wzmocnij jakość przed wysłaniem oferty",
      detailPl: "Score AI Quality jest niski — priorytetowo usuń błędy krytyczne i pozycje bez cen.",
      issueCode: "quality_score",
      occurrenceCount: 1,
      sampleLabelsPl: [],
      expandable: false,
    });
  }

  return recommendations;
}

function buildRecommendations(
  issues: OfferBoqValidationIssue[],
  qualityScore: number,
  doc: OfferBoqDocument,
): OfferBoqValidationRecommendation[] {
  return buildGroupedRecommendations(issues, doc, qualityScore);
}

function dedupeIssues(issues: OfferBoqValidationIssue[]): OfferBoqValidationIssue[] {
  const map = new Map<string, OfferBoqValidationIssue>();
  for (const i of issues) {
    if (!map.has(i.id)) map.set(i.id, i);
  }
  return Array.from(map.values());
}

function calcCompleteness(opts: {
  doc: OfferBoqDocument;
  bidProposal: TenderBidProposal | null | undefined;
}): OfferBoqValidationCompleteness {
  const lineCount = Math.max(opts.doc.lines.length, 1);
  const recognized = opts.doc.lines.filter((l) => Boolean(l.catalogWorkId)).length;
  const classified = opts.doc.lines.filter(
    (l) => l.costIntelligence && l.costIntelligence.lineKind !== "Unknown",
  ).length;
  const priced = opts.doc.lines.filter((l) => {
    const d = l.linePricing?.aggregates.lineDirectPln;
    return d != null && d > 0;
  }).length;
  const passedToBid =
    opts.bidProposal?.ok && opts.bidProposal.recommendedBidPln != null ? lineCount : 0;

  const recognizedPct = toPct(recognized, lineCount);
  const classifiedPct = toPct(classified, lineCount);
  const pricedPct = toPct(priced, lineCount);
  const passedToBidPct = toPct(passedToBid, lineCount);
  return {
    recognizedPct: round1(recognizedPct),
    classifiedPct: round1(classifiedPct),
    pricedPct: round1(pricedPct),
    passedToBidPct: round1(passedToBidPct),
    overallPct: round1((recognizedPct + classifiedPct + pricedPct + passedToBidPct) / 4),
  };
}

function countByEditStatus(
  doc: OfferBoqDocument,
): { componentCount: number; changedCount: number; reviewPendingCount: number } {
  let componentCount = 0;
  let changedCount = 0;
  let reviewPendingCount = 0;

  for (const line of doc.lines) {
    const comps = line.linePricing?.components ?? [];
    for (const c of comps) {
      componentCount += 1;
      const status: OfferBoqComponentEditStatus = c.editStatus ?? "ai_proposal";
      if (status === "user_changed") changedCount += 1;
      if (c.requiresUserReview && status === "ai_proposal") reviewPendingCount += 1;
    }
  }

  return { componentCount, changedCount, reviewPendingCount };
}

function buildStatus(opts: {
  criticalCount: number;
  warningCount: number;
  completenessPct: number;
  qualityScore: number;
}): { status: OfferBoqReadinessStatus; labelPl: string } {
  if (opts.criticalCount > 0 || opts.completenessPct < 70) {
    return { status: "not_ready", labelPl: "Niegotowa" };
  }
  if (opts.warningCount > 0 || opts.qualityScore < 80) {
    return { status: "review_required", labelPl: "Wymaga przeglądu" };
  }
  return { status: "ready", labelPl: "Gotowa do wysłania" };
}

export function evaluateOfferBoqValidation(opts: {
  doc: OfferBoqDocument;
  bidProposal: TenderBidProposal | null | undefined;
  averageConfidence: OfferBoqConfidence;
  companyKnowledgeHitCount: number;
}): OfferBoqValidationReport {
  const issues: OfferBoqValidationIssue[] = [];
  for (const line of opts.doc.lines) {
    pushLineIssues(issues, line);
    pushComponentIssues(issues, line);
  }
  if (!opts.bidProposal?.ok || opts.bidProposal.recommendedBidPln == null) {
    issues.push({
      id: "bid_not_available",
      severity: "critical",
      code: "bid_not_available",
      lineId: null,
      componentId: null,
      titlePl: "Oferta końcowa niedostępna",
      detailPl: "Bid Proposal nie zwrócił pełnej ceny końcowej dla kosztorysu.",
    });
  }

  const uniqueIssues = dedupeIssues(issues);
  const criticalCount = uniqueIssues.filter((i) => i.severity === "critical").length;
  const warningCount = uniqueIssues.filter((i) => i.severity === "warning").length;

  const completeness = calcCompleteness({
    doc: opts.doc,
    bidProposal: opts.bidProposal,
  });

  const edit = countByEditStatus(opts.doc);
  const pricingStats = opts.doc.pricingStats;
  const componentCount = Math.max(edit.componentCount || pricingStats?.componentCount || 0, 1);
  const pricedComponentCount = pricingStats?.pricedComponentCount ?? 0;
  const unpricedComponentCount = pricingStats?.unpricedComponentCount ?? 0;
  const lowCount = pricingStats?.lowCount ?? 0;
  const companyKnowledgeRatio = clampPct((opts.companyKnowledgeHitCount / componentCount) * 100);

  const confidencePct = confidenceScore(opts.averageConfidence);
  const pricingCoveragePct = toPct(pricedComponentCount, componentCount);
  const reviewReadinessPct = clampPct(100 - toPct(edit.reviewPendingCount, componentCount));
  const pipelinePct = opts.bidProposal?.ok ? 100 : 0;
  const manualPenalty = Math.min(20, toPct(edit.changedCount, componentCount) * 0.25);
  const lowConfidencePenalty = Math.min(18, toPct(lowCount, Math.max(opts.doc.lines.length, 1)) * 0.18);
  const unresolvedPenalty = Math.min(22, toPct(unpricedComponentCount, componentCount) * 0.22);
  const issueGroupCount = new Set(uniqueIssues.map((i) => i.code)).size;
  const issuePenalty = Math.min(26, criticalCount * 2 + issueGroupCount * 3);

  const rawScore =
    completeness.overallPct * 0.32
    + confidencePct * 0.2
    + pricingCoveragePct * 0.16
    + reviewReadinessPct * 0.12
    + pipelinePct * 0.1
    + companyKnowledgeRatio * 0.1
    - manualPenalty
    - lowConfidencePenalty
    - unresolvedPenalty
    - issuePenalty;
  const qualityScore = Math.round(clampPct(rawScore));

  const recommendations = buildRecommendations(uniqueIssues, qualityScore, opts.doc);
  const status = buildStatus({
    criticalCount,
    warningCount,
    completenessPct: completeness.overallPct,
    qualityScore,
  });

  const qualityExplainability: OfferBoqQualityExplainability = {
    reasoningPl: [
      `Score opiera się na kompletności (${completeness.overallPct}%), pewności AI, pokryciu cen oraz przejściu do Bid Proposal.`,
      `Wiedza firmy zwiększa wiarygodność (${opts.companyKnowledgeHitCount} trafień), a ręczne korekty i komponenty bez ceny obniżają wynik.`,
      "Wynik ma charakter pomocniczy i nie zastępuje decyzji biznesowej.",
    ],
    loweredBy: [
      {
        labelPl: "Niewycenione komponenty",
        impactScore: Math.round(unresolvedPenalty),
        detailPl: `${unpricedComponentCount} komponentów bez pełnej ceny.`,
      },
      {
        labelPl: "Ryzyka jakościowe",
        impactScore: Math.round(issuePenalty),
        detailPl: `${criticalCount} krytycznych i ${warningCount} ostrzeżeń.`,
      },
      {
        labelPl: "Ręczne korekty / review",
        impactScore: Math.round(manualPenalty + lowConfidencePenalty),
        detailPl: `${edit.changedCount} ręcznych korekt, ${edit.reviewPendingCount} komponentów do przeglądu.`,
      },
    ].filter((x) => x.impactScore > 0),
    increasedBy: [
      {
        labelPl: "Kompletność pipeline",
        impactScore: Math.round(completeness.overallPct * 0.32),
        detailPl: `Rozpoznanie/klasyfikacja/wycena/przekazanie: ${completeness.overallPct}%.`,
      },
      {
        labelPl: "Pewność AI",
        impactScore: Math.round(confidencePct * 0.2),
        detailPl: `Średnia pewność: ${opts.averageConfidence}.`,
      },
      {
        labelPl: "Wiedza firmy",
        impactScore: Math.round(companyKnowledgeRatio * 0.1),
        detailPl: `Trafienia knowledge: ${opts.companyKnowledgeHitCount}.`,
      },
    ].filter((x) => x.impactScore > 0),
  };

  return {
    summary: {
      completenessPct: completeness.overallPct,
      qualityScore,
      warningCount,
      criticalCount,
      recommendationCount: recommendations.length,
      status: status.status,
      statusLabelPl: status.labelPl,
    },
    completeness,
    issues: uniqueIssues,
    recommendations,
    qualityExplainability,
  };
}
