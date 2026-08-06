/**
 * NG-TENDERS-KNOWLEDGE-FOUNDATION-01 — Decision & Constraint Policy (TS-A0).
 * Pure gate before knowledge_qualified — nie Bid / AI-COST / Command Center.
 */

import type { CostKnowledgeConfidenceLevel } from "@/lib/cost-knowledge/confidence";
import { isKnowledgeKpiQualified } from "@/lib/cost-knowledge/confidence";
import type { KnowledgeCompatibilityStatus } from "@/lib/cost-knowledge/compatibility-c1";
import { isC1Compatible } from "@/lib/cost-knowledge/compatibility-c1";

export type FoundationDecisionKind = "allow_qualify" | "degrade" | "deny";

export interface FoundationDecisionInput {
  knowledge: CostKnowledgeConfidenceLevel;
  price: CostKnowledgeConfidenceLevel;
  overall: CostKnowledgeConfidenceLevel;
  priceOriginKind?: string | null;
  /** RULE-C1 status (Library ↔ Market). */
  compatibilityStatus: KnowledgeCompatibilityStatus;
  compatibilityReasons?: readonly string[];
}

export interface FoundationDecisionResult {
  decision: FoundationDecisionKind;
  mayKnowledgeQualify: boolean;
  reasons: string[];
  /** Confidence-layer qualify (A0) before / beside Compatibility constraint. */
  confidenceWouldQualify: boolean;
}

/**
 * Confidence Gate + RULE-C1 constraint.
 * Order: C1 NOT_* → deny · C1 DEGRADED → degrade · else Confidence must allow.
 * allow_qualify only when C1 COMPATIBLE AND A0 KPI qualify.
 */
export function evaluateFoundationDecisionPolicy(
  input: FoundationDecisionInput,
): FoundationDecisionResult {
  const reasons: string[] = [];
  if (input.compatibilityReasons?.length) {
    reasons.push(...input.compatibilityReasons);
  }

  const confidenceWouldQualify = isKnowledgeKpiQualified({
    overall: input.overall,
    priceOriginKind: input.priceOriginKind,
  });

  const c1 = input.compatibilityStatus;

  if (c1 === "NOT_READY" || c1 === "NOT_COMPATIBLE") {
    reasons.push(`decision: deny (C1 ${c1})`);
    return {
      decision: "deny",
      mayKnowledgeQualify: false,
      reasons,
      confidenceWouldQualify,
    };
  }

  if (c1 === "DEGRADED") {
    reasons.push("decision: degrade (C1 DEGRADED)");
    return {
      decision: "degrade",
      mayKnowledgeQualify: false,
      reasons,
      confidenceWouldQualify,
    };
  }

  if (!isC1Compatible(c1)) {
    reasons.push(`decision: deny (C1 ${c1})`);
    return {
      decision: "deny",
      mayKnowledgeQualify: false,
      reasons,
      confidenceWouldQualify,
    };
  }

  if (!confidenceWouldQualify) {
    reasons.push("confidence: not kpi-qualified");
    if (input.overall === "low") reasons.push("confidence: overall low");
    return {
      decision: "deny",
      mayKnowledgeQualify: false,
      reasons,
      confidenceWouldQualify,
    };
  }

  reasons.push("decision: allow_qualify");
  return {
    decision: "allow_qualify",
    mayKnowledgeQualify: true,
    reasons,
    confidenceWouldQualify,
  };
}
