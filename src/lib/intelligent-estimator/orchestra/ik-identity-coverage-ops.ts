/**
 * W4-3 — Identity / Coverage ops seam (read-only presentation).
 * REUSE IkIdentityCoverageReport — no auto-match · no % without prod fixture.
 */

import type { IkIdentityCoverageReport } from "@/lib/intelligent-estimator/ik-identity-coverage";

export type IkIdentityCoverageOpsView = {
  report: IkIdentityCoverageReport;
  /** Never fabricate prod coverage % — explicit label only. */
  percentCoverageLabel: "niezmierzone %";
  statusSummaryPl: string;
  trustedCount: number;
  gapCount: number;
  ambiguousCount: number;
  ownerMappingPossibleCount: number;
};

export function buildIkIdentityCoverageOpsView(
  report: IkIdentityCoverageReport | null | undefined,
): IkIdentityCoverageOpsView | null {
  if (!report) return null;
  const c = report.counts;
  const trustedCount =
    c.trustedWorkIdentity
    + c.trustedMaterialIdentity
    + c.approvedAlias;
  const gapCount = c.identityGap + c.unresolved;
  const ambiguousCount = c.ambiguous;
  const ownerMappingPossibleCount = c.ownerMappingPossible;

  const statusSummaryPl = [
    `Wejście ${c.inputLineCount} linii`,
    `TRUSTED=${trustedCount}`,
    `GAP=${gapCount}`,
    `AMBIGUOUS=${ambiguousCount}`,
    `OWNER_MAP=${ownerMappingPossibleCount}`,
    `pokrycie: niezmierzone %`,
  ].join(" · ");

  return {
    report,
    percentCoverageLabel: "niezmierzone %",
    statusSummaryPl,
    trustedCount,
    gapCount,
    ambiguousCount,
    ownerMappingPossibleCount,
  };
}
