/**
 * IK S4-C — P8 Quantity Advisory (OPTION A).
 *
 * Additive / read-only projection of existing S4-B resolver decisions.
 * Does NOT mutate quantity / S2 / S3 / graph / Bid / P7 gate / P8 displayDecision.
 * Does NOT invent a second quantity SSOT — projects resolveBoqPricingQuantity only.
 */

import type { BoqDependencyGraph } from "@/lib/intelligent-estimator/boq-dependency-graph";
import {
  resolveBoqPricingQuantity,
  type BoqPricingQuantityStatus,
} from "@/lib/intelligent-estimator/boq-pricing-quantity-resolver";
import type { OfferBoqLine } from "@/lib/tender-offer-boq";
import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";
import type { ShadowBoqPositionCostResult } from "@/lib/tender-position-cost/boq-shadow-adapter";

export const IK_P8_QUANTITY_ADVISORY_SCHEMA_VERSION = 1 as const;

export type IkP8QuantityAdvisoryStatus = BoqPricingQuantityStatus;

export type IkP8QuantityAdvisoryLine = {
  lineId: string;
  dwellingId: string;
  lp: string;
  status: IkP8QuantityAdvisoryStatus;
  reason: string | null;
  expressionKind: string | null;
  dependencyState: "ok" | "unresolved" | "cycle" | "upstream_unresolved" | "relation_review" | null;
  /** Copied from S4-B resolution only — never recomputed independently. */
  pricingQuantity: number | null;
  /** Ingest SSOT — advisory read of line.quantity (unchanged). */
  ingestQuantity: number;
};

export type IkP8QuantityAdvisoryDwellingSummary = {
  dwellingId: string;
  acceptedCount: number;
  holdCount: number;
  fallbackCount: number;
  lineCount: number;
};

export type IkP8QuantityAdvisoryTotals = {
  acceptedCount: number;
  holdCount: number;
  fallbackCount: number;
  lineCount: number;
};

export type IkP8QuantityAdvisory = {
  schemaVersion: typeof IK_P8_QUANTITY_ADVISORY_SCHEMA_VERSION;
  /** Aggregate: HOLD if any HOLD; else FALLBACK if any FALLBACK; else ACCEPTED. */
  status: IkP8QuantityAdvisoryStatus;
  lines: IkP8QuantityAdvisoryLine[];
  dwellingSummaries: IkP8QuantityAdvisoryDwellingSummary[];
  totals: IkP8QuantityAdvisoryTotals;
};

export type IkP8QuantityAdvisoryLineInput = {
  line: OfferBoqLine;
  dwellingId?: string | null;
  lineIndex?: number;
  dependencyGraph?: BoqDependencyGraph | null;
};

function dependencyStateFromResolution(
  status: BoqPricingQuantityStatus,
  holdReason: string | null,
): IkP8QuantityAdvisoryLine["dependencyState"] {
  if (status !== "HOLD" || !holdReason) return status === "HOLD" ? null : "ok";
  const r = holdReason.toLowerCase();
  if (r.includes("cycle")) return "cycle";
  if (r.includes("upstream")) return "upstream_unresolved";
  if (r.includes("unresolved position") || r.includes("unresolved")) return "unresolved";
  if (r.includes("requires review") || r.includes("relation")) return "relation_review";
  return null;
}

function aggregateStatus(totals: IkP8QuantityAdvisoryTotals): IkP8QuantityAdvisoryStatus {
  if (totals.holdCount > 0) return "HOLD";
  if (totals.fallbackCount > 0) return "FALLBACK";
  if (totals.acceptedCount > 0) return "ACCEPTED";
  return "FALLBACK";
}

/**
 * Project S4-B resolver decisions into P8 advisory DTO.
 * Pure · deterministic · no mutation · no Bid math · no displayDecision.
 */
export function buildIkP8QuantityAdvisory(opts: {
  lines: readonly IkP8QuantityAdvisoryLineInput[];
  /** Optional P7 shadow — used only to cross-check BOQ_QUANTITY_HOLD presence (no new policy). */
  shadow?: ShadowBoqPositionCostResult | null;
}): IkP8QuantityAdvisory {
  const shadowHoldIds = new Set<string>();
  for (const row of opts.shadow?.lines ?? []) {
    if (row.gaps?.includes("BOQ_QUANTITY_HOLD")) {
      shadowHoldIds.add(String(row.lineId ?? "").trim());
    }
  }

  const advisoryLines: IkP8QuantityAdvisoryLine[] = [];
  const byDwelling = new Map<string, IkP8QuantityAdvisoryDwellingSummary>();

  for (let i = 0; i < opts.lines.length; i += 1) {
    const entry = opts.lines[i]!;
    const line = entry.line;
    const lineId = String(line.lineId ?? "").trim();
    if (!lineId) continue;

    const dwellingId = normalizeDwellingId(entry.dwellingId ?? "legacy_single");
    const resolution = resolveBoqPricingQuantity({
      line,
      lineIndex: entry.lineIndex ?? i,
      dependencyGraph: entry.dependencyGraph ?? null,
    });

    // S4-B resolver is sole status authority. Shadow is cross-check only —
    // never invent HOLD/ACCEPTED/FALLBACK policy here (no Option C / no new gate).
    const status = resolution.status;
    let reason = resolution.holdReason ?? resolution.reason;
    if (shadowHoldIds.has(lineId) && status === "HOLD" && !reason) {
      reason = "BOQ_QUANTITY_HOLD";
    }

    const advisory: IkP8QuantityAdvisoryLine = {
      lineId,
      dwellingId,
      lp: String(line.lp ?? "").trim(),
      status,
      reason,
      expressionKind: resolution.expression?.kind ?? line.quantityIntelligence?.expression?.kind ?? null,
      dependencyState: dependencyStateFromResolution(status, resolution.holdReason),
      pricingQuantity: resolution.pricingQuantity,
      ingestQuantity: line.quantity,
    };
    advisoryLines.push(advisory);

    const summary = byDwelling.get(dwellingId) ?? {
      dwellingId,
      acceptedCount: 0,
      holdCount: 0,
      fallbackCount: 0,
      lineCount: 0,
    };
    summary.lineCount += 1;
    if (status === "ACCEPTED") summary.acceptedCount += 1;
    else if (status === "HOLD") summary.holdCount += 1;
    else summary.fallbackCount += 1;
    byDwelling.set(dwellingId, summary);
  }

  const totals: IkP8QuantityAdvisoryTotals = {
    acceptedCount: 0,
    holdCount: 0,
    fallbackCount: 0,
    lineCount: advisoryLines.length,
  };
  for (const row of advisoryLines) {
    if (row.status === "ACCEPTED") totals.acceptedCount += 1;
    else if (row.status === "HOLD") totals.holdCount += 1;
    else totals.fallbackCount += 1;
  }

  return {
    schemaVersion: IK_P8_QUANTITY_ADVISORY_SCHEMA_VERSION,
    status: aggregateStatus(totals),
    lines: advisoryLines,
    dwellingSummaries: [...byDwelling.values()].sort((a, b) =>
      a.dwellingId.localeCompare(b.dwellingId),
    ),
    totals,
  };
}

/**
 * Collect projection inputs from Document Expert master lines + per-dwelling graphs.
 */
export function collectIkP8QuantityAdvisoryInputs(opts: {
  masterBoqLines?: readonly { dwellingId: string; line: OfferBoqLine }[] | null;
  offerBoqLines?: readonly OfferBoqLine[] | null;
  boqDependencyGraph?: BoqDependencyGraph | null;
  boqDependencyGraphsByDwelling?: Record<string, BoqDependencyGraph> | null;
}): IkP8QuantityAdvisoryLineInput[] {
  const graphs = opts.boqDependencyGraphsByDwelling ?? null;
  const primaryGraph = opts.boqDependencyGraph ?? null;

  if (opts.masterBoqLines?.length) {
    return opts.masterBoqLines.map((ref, lineIndex) => {
      const dwellingId = normalizeDwellingId(ref.dwellingId || "legacy_single");
      const graph = graphs?.[dwellingId] ?? primaryGraph;
      return {
        line: ref.line,
        dwellingId,
        lineIndex,
        dependencyGraph: graph,
      };
    });
  }

  const lines = opts.offerBoqLines ?? [];
  return lines.map((line, lineIndex) => ({
    line,
    dwellingId: "legacy_single",
    lineIndex,
    dependencyGraph: primaryGraph,
  }));
}
