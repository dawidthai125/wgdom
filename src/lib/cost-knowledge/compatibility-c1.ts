/**
 * NG-TENDERS-KNOWLEDGE-FOUNDATION-01 — RULE-C1 Library ↔ Market (COND-6 thin).
 * Pure — bez Pack/BOM (C2–C7 OUT).
 */

import { isKpiQualifiedPriceOrigin } from "@/lib/cost-knowledge/confidence";

/** Compatibility statuses (DF COND-6 contract). */
export type KnowledgeCompatibilityStatus =
  | "COMPATIBLE"
  | "DEGRADED"
  | "NOT_COMPATIBLE"
  | "NOT_READY";

export interface LibraryMarketC1Input {
  /** Catalog / Library work id (SSOT WC). */
  libraryWorkId?: string | null;
  /** When workId set: default true if omitted. */
  libraryWorkActive?: boolean;
  priceOriginKind?: string | null;
  freshness?: "fresh" | "stale" | "missing" | "ok" | null;
  hasPositiveUnitPrice?: boolean;
}

export interface LibraryMarketC1Result {
  status: KnowledgeCompatibilityStatus;
  ruleIds: readonly ["RULE-C1"];
  reasons: string[];
}

/**
 * RULE-C1 — Market observation may qualify a Library work only when:
 * work active · origin allowlist · freshness fresh|ok · positive price.
 * Stale/missing → DEGRADED (never silent qualify).
 */
export function checkLibraryMarketCompatibility(
  input: LibraryMarketC1Input,
): LibraryMarketC1Result {
  const ruleIds = ["RULE-C1"] as const;
  const reasons: string[] = [];
  const workId = input.libraryWorkId?.trim() || null;

  if (!workId) {
    reasons.push("c1: missing libraryWorkId");
    return { status: "NOT_READY", ruleIds, reasons };
  }

  const active = input.libraryWorkActive !== false;
  if (!active) {
    reasons.push("c1: library work inactive");
    return { status: "NOT_COMPATIBLE", ruleIds, reasons };
  }

  const origin = input.priceOriginKind ?? "unknown";
  if (!isKpiQualifiedPriceOrigin(origin)) {
    reasons.push(`c1: origin not allowlisted (${origin})`);
    return { status: "NOT_COMPATIBLE", ruleIds, reasons };
  }

  if (!input.hasPositiveUnitPrice) {
    reasons.push("c1: missing positive unit price");
    return { status: "NOT_READY", ruleIds, reasons };
  }

  const fresh = input.freshness ?? null;
  if (fresh === "stale" || fresh === "missing") {
    reasons.push(`c1: freshness ${fresh} → degraded`);
    return { status: "DEGRADED", ruleIds, reasons };
  }
  if (fresh !== "fresh" && fresh !== "ok") {
    reasons.push(`c1: freshness unknown/null → degraded`);
    return { status: "DEGRADED", ruleIds, reasons };
  }

  reasons.push("c1: library↔market compatible");
  return { status: "COMPATIBLE", ruleIds, reasons };
}

export function isC1Compatible(status: KnowledgeCompatibilityStatus): boolean {
  return status === "COMPATIBLE";
}
