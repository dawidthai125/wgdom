/**
 * A08-P3 — Owner Gate G1/G2 action helpers (pure + orchestration glue).
 * REUSE existing identity phase + acceptance engines — no parallel engines.
 *
 * P0 Identity Coverage (Option D):
 * deterministic evidence prefill → explicit Owner G1 → existing persist.
 * Prefill NEVER mutates trusted identity / NEVER calls Accept / NEVER persists.
 */

import type {
  OfferBoqConfidence,
  OfferBoqLine,
  OfferBoqMatchCandidate,
} from "@/lib/tender-offer-boq";
import type {
  IkIdentityCoverageLineResult,
  IkIdentityCoverageReport,
} from "@/lib/intelligent-estimator/ik-identity-coverage";
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

/** qty=0 (e.g. Paczka XI LP43) — must stay unresolved; never G1-map. */
export function isG1QuantityBlocked(
  row: Pick<IkIdentityCoverageLineResult, "quantity"> | null | undefined,
): boolean {
  if (!row) return false;
  const q = Number(row.quantity);
  return Number.isFinite(q) && q === 0;
}

export type G1IdentityPrefillKind =
  | "trusted"
  | "unique_suggestion"
  | "competing"
  | "none"
  | "qty_blocked";

export type G1IdentityPrefillSource =
  | "none"
  | "trusted"
  | "mapper_unique"
  | "candidate_unique"
  | "labor_registry_unique"
  | "material_unique"
  | "competing"
  | "qty_blocked";

export type G1IdentityPrefill = {
  kind: G1IdentityPrefillKind;
  /**
   * Non-null ONLY for unique_suggestion.
   * Display/prefill only — never implies trusted identity.
   */
  suggestedCatalogWorkId: string | null;
  candidateWorkIds: readonly string[];
  source: G1IdentityPrefillSource;
  /** Owner-facing hint (SUGGESTION / competing / blocked). */
  prefillLabelPl: string | null;
};

export type G1MappedLineForPrefill = Pick<
  OfferBoqLine,
  "catalogWorkId" | "candidateMatches" | "matchMethod" | "matchConfidence"
>;

/** Distinct catalogWorkId list from mapper candidateMatches (evidence only). */
export function listDistinctCandidateWorkIds(
  mappedLine: G1MappedLineForPrefill | null | undefined,
): string[] {
  if (!mappedLine) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of mappedLine.candidateMatches ?? []) {
    const id = String(c.catalogWorkId ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function findCoverageRow(
  identityCoverage: IkIdentityCoverageReport | null | undefined,
  dwellingId: string,
  lineId: string,
): IkIdentityCoverageLineResult | null {
  return (
    identityCoverage?.lines.find(
      (l) => l.dwellingId === dwellingId && l.lineId === lineId,
    ) ?? null
  );
}

function isTrustedCoverageStatus(status: IkIdentityCoverageLineResult["status"]): boolean {
  return (
    status === "TRUSTED_WORK"
    || status === "TRUSTED_MATERIAL"
    || status === "TRUSTED_BOTH"
  );
}

/**
 * P0 Option D — evidence-backed G1 prefill resolution (pure).
 * candidate ≠ trusted · competing → no auto-select · qty=0 → blocked.
 */
export function resolveG1IdentityPrefill(input: {
  identityCoverage: IkIdentityCoverageReport | null | undefined;
  dwellingId: string;
  lineId: string;
  /** Prefer postIdentityExpert mapped line for candidateMatches. */
  mappedLine?: G1MappedLineForPrefill | null;
}): G1IdentityPrefill {
  const row = findCoverageRow(input.identityCoverage, input.dwellingId, input.lineId);
  const mapped = input.mappedLine ?? null;
  const candidates = listDistinctCandidateWorkIds(mapped);

  if (isG1QuantityBlocked(row)) {
    return {
      kind: "qty_blocked",
      suggestedCatalogWorkId: null,
      candidateWorkIds: candidates,
      source: "qty_blocked",
      prefillLabelPl: "qty=0 — bez mapowania G1 (pozostaje unresolved).",
    };
  }

  if (row && (row.trustedWorkIdentity || isTrustedCoverageStatus(row.status))) {
    const trustedId =
      String(row.workIdentity.workId ?? "").trim()
      || String(row.mapperCatalogWorkId ?? "").trim()
      || null;
    return {
      kind: "trusted",
      suggestedCatalogWorkId: null,
      candidateWorkIds: trustedId ? [trustedId] : candidates,
      source: "trusted",
      prefillLabelPl: "Już trusted — bez ponownego G1.",
    };
  }

  const ambiguous =
    row?.status === "AMBIGUOUS"
    || candidates.length >= 2;

  if (ambiguous) {
    return {
      kind: "competing",
      suggestedCatalogWorkId: null,
      candidateWorkIds: candidates,
      source: "competing",
      prefillLabelPl:
        candidates.length > 0
          ? `Konkurencyjne kandydaty (${candidates.length}) — wybierz jawnie (SUGGESTION ≠ Accept).`
          : "Ambiguous — bez auto-select.",
    };
  }

  if (candidates.length === 1) {
    return {
      kind: "unique_suggestion",
      suggestedCatalogWorkId: candidates[0]!,
      candidateWorkIds: candidates,
      source: "candidate_unique",
      prefillLabelPl: "SUGGESTION / PREFILL — potwierdź G1 Accept (nie trusted).",
    };
  }

  const mapperId = String(row?.mapperCatalogWorkId ?? mapped?.catalogWorkId ?? "").trim();
  if (mapperId && row?.status !== "AMBIGUOUS") {
    return {
      kind: "unique_suggestion",
      suggestedCatalogWorkId: mapperId,
      candidateWorkIds: [mapperId],
      source: "mapper_unique",
      prefillLabelPl: "SUGGESTION / PREFILL (mapper) — potwierdź G1 Accept.",
    };
  }

  const laborId = String(row?.laborIdentityWorkId ?? "").trim();
  if (laborId && row?.laborIdentityRegistry === "HIT") {
    return {
      kind: "unique_suggestion",
      suggestedCatalogWorkId: laborId,
      candidateWorkIds: [laborId],
      source: "labor_registry_unique",
      prefillLabelPl: "SUGGESTION / PREFILL (registry HIT) — potwierdź G1 Accept.",
    };
  }

  const materialId = String(row?.materialCatalogWorkId ?? "").trim();
  if (materialId) {
    return {
      kind: "unique_suggestion",
      suggestedCatalogWorkId: materialId,
      candidateWorkIds: [materialId],
      source: "material_unique",
      prefillLabelPl: "SUGGESTION / PREFILL (material) — potwierdź G1 Accept.",
    };
  }

  return {
    kind: "none",
    suggestedCatalogWorkId: null,
    candidateWorkIds: [],
    source: "none",
    prefillLabelPl: "Brak bezpiecznego kandydata — wpisz catalogWorkId ręcznie lub Reject.",
  };
}

/**
 * Suggested catalogWorkId for G1 — unique evidence only · never auto-Accept.
 * Competing / ambiguous / qty=0 → null (Owner must choose or leave unresolved).
 */
export function resolveSuggestedCatalogWorkIdForG1(
  identityCoverage: IkIdentityCoverageReport | null | undefined,
  dwellingId: string,
  lineId: string,
  mappedLine?: G1MappedLineForPrefill | null,
): string | null {
  const prefill = resolveG1IdentityPrefill({
    identityCoverage,
    dwellingId,
    lineId,
    mappedLine,
  });
  return prefill.kind === "unique_suggestion" ? prefill.suggestedCatalogWorkId : null;
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
