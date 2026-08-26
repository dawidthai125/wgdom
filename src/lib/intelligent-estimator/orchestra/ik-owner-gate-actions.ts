/**
 * A08-P3 — Owner Gate G1/G2 action helpers (pure + orchestration glue).
 * REUSE existing identity phase + acceptance engines — no parallel engines.
 */

import type { OfferBoqConfidence, OfferBoqMatchCandidate } from "@/lib/tender-offer-boq";
import type { IkIdentityCoverageReport } from "@/lib/intelligent-estimator/ik-identity-coverage";
import type { IkLaborExpertReport } from "@/lib/intelligent-estimator/ik-labor-expert";
import type { IkMaterialExpertReport } from "@/lib/intelligent-estimator/ik-material-expert";
import type { OwnerManualIdentityOverride } from "./ik-identity-phase";

export type IkOwnerGateG1RejectKey = `${string}|${string}`;

export function buildG1RejectKey(dwellingId: string, lineId: string): IkOwnerGateG1RejectKey {
  return `${dwellingId}|${lineId}`;
}

export function buildG1ManualOverride(input: {
  dwellingId: string;
  lineId: string;
  catalogWorkId: string;
  matchConfidence?: OfferBoqConfidence;
  candidateMatches?: OfferBoqMatchCandidate[];
}): OwnerManualIdentityOverride {
  return {
    dwellingId: input.dwellingId,
    lineId: input.lineId,
    catalogWorkId: input.catalogWorkId.trim(),
    matchMethod: "manual",
    matchConfidence: input.matchConfidence,
    candidateMatches: input.candidateMatches,
  };
}

export function upsertManualOverride(
  existing: readonly OwnerManualIdentityOverride[],
  override: OwnerManualIdentityOverride,
): OwnerManualIdentityOverride[] {
  const next = existing.filter(
    (o) => !(o.dwellingId === override.dwellingId && o.lineId === override.lineId),
  );
  next.push(override);
  return next;
}

export function removeManualOverride(
  existing: readonly OwnerManualIdentityOverride[],
  dwellingId: string,
  lineId: string,
): OwnerManualIdentityOverride[] {
  return existing.filter((o) => !(o.dwellingId === dwellingId && o.lineId === lineId));
}

/** Suggested catalogWorkId for G1 Accept/Edit — never auto-Accept. */
export function resolveSuggestedCatalogWorkIdForG1(
  identityCoverage: IkIdentityCoverageReport | null | undefined,
  dwellingId: string,
  lineId: string,
): string | null {
  const row = identityCoverage?.lines.find(
    (l) => l.dwellingId === dwellingId && l.lineId === lineId,
  );
  if (!row) return null;
  return (
    row.mapperCatalogWorkId
    ?? row.laborIdentityWorkId
    ?? row.materialCatalogWorkId
    ?? row.workIdentity.workId
    ?? null
  );
}

export function findLaborLineCandidate(
  labor: IkLaborExpertReport | null | undefined,
  dwellingId: string,
  lineId: string,
) {
  if (!labor) return null;
  return (
    labor.lines.find(
      (l) =>
        l.dwellingId === dwellingId
        && l.lineId === lineId
        && l.rateStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED"
        && l.candidate,
    ) ?? null
  );
}

export function findMaterialLineCandidate(
  material: IkMaterialExpertReport | null | undefined,
  dwellingId: string,
  lineId: string,
) {
  if (!material) return null;
  return (
    material.lines.find(
      (l) =>
        l.dwellingId === dwellingId
        && l.lineId === lineId
        && l.priceStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED"
        && l.candidate,
    ) ?? null
  );
}

export type IkOwnerGateActionResult =
  | { ok: true; noop?: boolean; reason?: string }
  | { ok: false; reason: string };
