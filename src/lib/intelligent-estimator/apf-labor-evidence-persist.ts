/**
 * APF live labor Evidence → canonical `kw-wgdom-labor-source-evidence`.
 *
 * Same store / writer as KEEP-5 research Evidence
 * (`upsertLaborSourceEvidenceObservations`).
 * APF hosts authorized for Evidence plane only — NOT KEEP-4 NORMAL research.
 *
 * ZERO OUR RATE · ZERO Accept · ZERO Finance · ZERO Catalog rate write · ZERO cloud push.
 */

import {
  buildLaborSourceEvidenceObservation,
  deriveLaborSourceEvidenceMidpoint,
  filterLaborSourceEvidenceForAggregation,
  loadLaborSourceEvidenceStoreLocal,
  upsertLaborSourceEvidenceObservations,
  type LaborSourceEvidenceCasResult,
  type LaborSourceEvidenceIdentityMethod,
  type LaborSourceEvidenceObservation,
} from "@/lib/labor-source-evidence";
import {
  isApfAuthorizedSourceId,
  resolveApfAuthorizedRouteByUrl,
} from "@/lib/tender-position-cost/autonomous-pricing-fallback/apf-source-authorization";
import type {
  ApfLaborMarketObservation,
  ApfResearchEvidence,
} from "@/lib/tender-position-cost/autonomous-pricing-fallback/types";
import {
  isApfLaborOnlyUnit,
} from "@/lib/tender-position-cost/autonomous-pricing-fallback/labor-units";
import {
  calculateRepresentativeWorkRate,
  normalizeWorkRateUnitToken,
  type WorkRateQualifiedObservation,
} from "@/lib/work-catalog/work-rate-qualify";
import { computeProposedWorkRatePln } from "@/lib/work-catalog/work-rate-market-base";
import type { WorkRateResearchCandidate } from "@/lib/work-catalog/work-rate-research";
import { lookupReusableLaborResearchEvidence } from "@/lib/work-catalog/work-rate-research-evidence-persist";
import { matchLaborIdentityMappingForWork } from "@/lib/work-catalog/work-rate-identity-mapping";
import type { WorkRateSourceId } from "@/lib/work-catalog/work-rate-selective-lookup-types";
import type { WorkRateRegionScope } from "@/lib/work-catalog/work-rate-types";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";

export const APF_EVIDENCE_PERSIST_SEAM_ID =
  "APF-LABOR-EVIDENCE-CANONICAL-PERSIST-V1" as const;

export const APF_EVIDENCE_PARSER_VERSION =
  "apf-ephemeral-selective-research-v1" as const;

export const APF_EVIDENCE_RESEARCH_METHOD =
  "APF_EPHEMERAL_SELECTIVE_RESEARCH" as const;

export const APF_EVIDENCE_WRITER =
  "upsertLaborSourceEvidenceObservations" as const;

export const APF_EVIDENCE_STORAGE_KEY =
  "kw-wgdom-labor-source-evidence" as const;

/**
 * Catalog / Evidence unit for APF measurement works.
 * Do NOT alias pomiar→prob here (that is Position Cost engine-only).
 * Evidence / Catalog / AUT-R1 must keep `pomiar`.
 */
export function resolveApfEvidenceCatalogUnit(unitRaw: string): WgdomCostUnit | null {
  const u = normalizeWorkRateUnitToken(unitRaw);
  if (!u) return null;
  if (u === "pomiar" || u === "prob") return "pomiar";
  if (isApfLaborOnlyUnit(unitRaw)) return "pomiar";
  return u as WgdomCostUnit;
}

export type PersistApfLaborEvidenceFailReason =
  | "NO_WORK_ID"
  | "INVALID_UNIT"
  | "NO_APF_OBSERVATIONS"
  | "INVALID_IDENTITY"
  | "MISSING_PROVENANCE"
  | "MISSING_OBSERVED_AT"
  | "UNAUTHORIZED_SOURCE"
  | "PRICE_CONFLICT"
  | "IDENTITY_MAPPING_AMBIGUOUS"
  | "IDENTITY_MAPPING_BLOCKED"
  | "HOST_REJECTED"
  | "CAS_FAILED"
  | "EMPTY_AFTER_MAP";

export type PersistApfLaborEvidenceInput = {
  workId: string;
  workNamePl: string;
  unit: string;
  apfEvidence?: readonly ApfResearchEvidence[] | null;
  marketObservations?: readonly ApfLaborMarketObservation[] | null;
  identityTrusted: boolean;
  nowIso?: string;
  marginPct?: number;
  /** Default true. Tests may dry-map with persist=false. */
  persist?: boolean;
};

export type PersistApfLaborEvidenceResult = {
  seamId: typeof APF_EVIDENCE_PERSIST_SEAM_ID;
  ok: boolean;
  failReason: PersistApfLaborEvidenceFailReason | null;
  messagePl: string | null;
  writer: typeof APF_EVIDENCE_WRITER;
  storageKey: typeof APF_EVIDENCE_STORAGE_KEY;
  built: LaborSourceEvidenceObservation[];
  cas: LaborSourceEvidenceCasResult | null;
  readBack: LaborSourceEvidenceObservation[];
  candidateFromDurable: WorkRateResearchCandidate | null;
  acceptExecuted: false;
  ourRateWritten: false;
  workCatalogMutated: false;
  productionCloudPush: false;
  researchMethod: typeof APF_EVIDENCE_RESEARCH_METHOD;
  p527Unchanged: true;
  keep4Unchanged: true;
};

function fail(
  reason: PersistApfLaborEvidenceFailReason,
  messagePl: string,
  built: LaborSourceEvidenceObservation[] = [],
  cas: LaborSourceEvidenceCasResult | null = null,
  readBack: LaborSourceEvidenceObservation[] = [],
): PersistApfLaborEvidenceResult {
  return {
    seamId: APF_EVIDENCE_PERSIST_SEAM_ID,
    ok: false,
    failReason: reason,
    messagePl,
    writer: APF_EVIDENCE_WRITER,
    storageKey: APF_EVIDENCE_STORAGE_KEY,
    built,
    cas,
    readBack,
    candidateFromDurable: null,
    acceptExecuted: false,
    ourRateWritten: false,
    workCatalogMutated: false,
    productionCloudPush: false,
    researchMethod: APF_EVIDENCE_RESEARCH_METHOD,
    p527Unchanged: true,
    keep4Unchanged: true,
  };
}

function enrichApfProvenance(
  o: LaborSourceEvidenceObservation,
  apfEvidenceId: string | null,
): LaborSourceEvidenceObservation {
  return {
    ...o,
    parserVersion: APF_EVIDENCE_PARSER_VERSION,
    categoryKey: o.categoryKey ?? "electrical_measurement",
    provenance: {
      ...o.provenance,
      fetchTraceId: apfEvidenceId || o.provenance.fetchTraceId || null,
      sectionHint: APF_EVIDENCE_RESEARCH_METHOD,
    },
  };
}

/**
 * Map APF MARKET_LABOR_OBS → canonical LaborSourceEvidenceObservation
 * without inventing price / identity / OWNER provenance.
 */
export function mapApfEvidenceToCanonicalObservations(input: {
  workId: string;
  workNamePl: string;
  unit: string;
  apfEvidence?: readonly ApfResearchEvidence[] | null;
  marketObservations?: readonly ApfLaborMarketObservation[] | null;
  nowIso?: string;
}):
  | { ok: true; observations: LaborSourceEvidenceObservation[] }
  | { ok: false; reason: PersistApfLaborEvidenceFailReason; messagePl: string } {
  const workId = String(input.workId || "").trim();
  const unitRaw = String(input.unit || "").trim();
  if (!workId) {
    return { ok: false, reason: "NO_WORK_ID", messagePl: "Brak workId." };
  }
  if (!unitRaw) {
    return { ok: false, reason: "INVALID_UNIT", messagePl: "Brak unit." };
  }
  const catalogUnit = resolveApfEvidenceCatalogUnit(unitRaw);
  if (!catalogUnit) {
    return {
      ok: false,
      reason: "INVALID_UNIT",
      messagePl: `Unit „${unitRaw}” nie jest legalną jednostką Evidence/Catalog.`,
    };
  }

  type Row = {
    sourceId: string;
    sourceUrl: string;
    ratePln: number;
    observedAt: string;
    observedName: string;
    apfEvidenceId: string | null;
  };
  const rows: Row[] = [];

  for (const e of input.apfEvidence || []) {
    if (e.kind !== "MARKET_LABOR_OBS") continue;
    const rate = Number(e.marketUnitRatePln);
    const sourceId = String(e.sourceId || "").trim();
    const sourceUrl = String(e.sourceUrl || "").trim();
    const observedAt = String(e.retrievedAt || "").trim();
    if (!Number.isFinite(rate) || !(rate > 0)) continue;
    rows.push({
      sourceId,
      sourceUrl,
      ratePln: Math.round(rate * 100) / 100,
      observedAt,
      observedName: String(e.summaryPl || input.workNamePl || "").trim(),
      apfEvidenceId: e.evidenceId || null,
    });
  }

  for (const o of input.marketObservations || []) {
    const rate = Number(o.unitRatePln);
    const sourceId = String(o.sourceId || "").trim();
    const sourceUrl = String(o.sourceUrl || o.sourceId || "").trim();
    const observedAt = String(o.observedAt || "").trim();
    if (!Number.isFinite(rate) || !(rate > 0)) continue;
    rows.push({
      sourceId,
      sourceUrl,
      ratePln: Math.round(rate * 100) / 100,
      observedAt,
      observedName: String(o.summaryPl || input.workNamePl || "").trim(),
      apfEvidenceId: o.evidenceId || null,
    });
  }

  if (rows.length === 0) {
    return {
      ok: false,
      reason: "NO_APF_OBSERVATIONS",
      messagePl: "Brak MARKET_LABOR_OBS z APF.",
    };
  }

  const built: LaborSourceEvidenceObservation[] = [];
  const priceKeys = new Set<string>();

  for (const row of rows) {
    if (!row.sourceId || !row.sourceUrl) {
      return {
        ok: false,
        reason: "MISSING_PROVENANCE",
        messagePl: "APF observation bez sourceId/sourceUrl.",
      };
    }
    if (!row.observedAt) {
      return {
        ok: false,
        reason: "MISSING_OBSERVED_AT",
        messagePl: "APF observation bez observedAt/retrievedAt.",
      };
    }
    if (!isApfAuthorizedSourceId(row.sourceId)) {
      return {
        ok: false,
        reason: "UNAUTHORIZED_SOURCE",
        messagePl: `sourceId „${row.sourceId}” nie jest APF-authorized (nie OWNER invent).`,
      };
    }
    if (!resolveApfAuthorizedRouteByUrl(row.sourceUrl)) {
      return {
        ok: false,
        reason: "UNAUTHORIZED_SOURCE",
        messagePl: `URL „${row.sourceUrl}” poza APF authorize.`,
      };
    }

    priceKeys.add(String(row.ratePln));

    // Owner V2: exact_normalized identity mapping → owner_identity_mapping.
    // Without HIT: keep names_loosely (still insufficient for AUT-R1 — fail-closed).
    const mapHit = matchLaborIdentityMappingForWork({
      workId,
      catalogUnit,
      observedName: row.observedName || input.workNamePl,
      observedUnit: catalogUnit,
      sourceId: row.sourceId,
      laborOnly: true,
      includesMaterial: false,
      regionScope: "POLSKA",
      knownWorkIds: [workId],
    });
    if (mapHit.status === "AMBIGUOUS") {
      return {
        ok: false,
        reason: "IDENTITY_MAPPING_AMBIGUOUS",
        messagePl: "Konflikt Owner identity mapping — fail-closed.",
      };
    }
    if (mapHit.status === "BLOCKED") {
      return {
        ok: false,
        reason: "IDENTITY_MAPPING_BLOCKED",
        messagePl: mapHit.messagePl,
      };
    }

    let identityMethod: LaborSourceEvidenceIdentityMethod = "names_loosely";
    let synonymUsed: string | null = null;
    if (mapHit.status === "HIT" && mapHit.workId === workId) {
      identityMethod = "owner_identity_mapping";
      synonymUsed = mapHit.matchedAlias;
    }

    const obs = enrichApfProvenance(
      buildLaborSourceEvidenceObservation({
        workId,
        workNamePl: input.workNamePl,
        sourceId: row.sourceId,
        sourceUrl: row.sourceUrl,
        categoryKey: "electrical_measurement",
        observedName: row.observedName || input.workNamePl,
        unit: catalogUnit,
        pricePoint: row.ratePln,
        priceKind: "point",
        region: "POLSKA",
        identityMatched: true,
        identityMethod,
        synonymUsed,
        laborOnly: true,
        includesMaterial: false,
        observedAt: row.observedAt,
        retrievedAt: input.nowIso || row.observedAt,
      }),
      row.apfEvidenceId,
    );
    built.push(obs);
  }

  if (priceKeys.size > 1) {
    return {
      ok: false,
      reason: "PRICE_CONFLICT",
      messagePl: "Konflikt cen APF Evidence — fail-closed (bez uśredniania).",
    };
  }

  return { ok: true, observations: built };
}

/**
 * Rebuild WorkRate-shaped Candidate from durable Evidence (no Accept).
 */
export function buildCandidateFromDurableLaborEvidence(input: {
  workId: string;
  workNamePl: string;
  unit: string;
  observations: readonly LaborSourceEvidenceObservation[];
  marginPct?: number;
}): WorkRateResearchCandidate | null {
  const catalogUnit = resolveApfEvidenceCatalogUnit(input.unit);
  if (!catalogUnit) return null;
  const marginPct = input.marginPct ?? 20;
  const qualified: WorkRateQualifiedObservation[] = [];
  for (const o of input.observations) {
    if (o.qualityStatus !== "VALID") continue;
    if (o.workId !== input.workId) continue;
    const mid = deriveLaborSourceEvidenceMidpoint(o);
    if (mid == null || !(mid > 0)) continue;
    if (!o.sourceId || !o.sourceUrl || !o.observedAt) continue;
    qualified.push({
      sourceId: o.sourceId as WorkRateSourceId,
      workNamePl: o.observedName || input.workNamePl,
      ratePln: mid,
      unit: catalogUnit,
      regionScope: (o.region || "POLSKA") as WorkRateRegionScope,
      laborOnly: true,
      sourceUrl: o.sourceUrl,
      observedAt: o.observedAt,
      netGross: "unknown",
      sourceMinPln: o.priceMin,
      sourceMaxPln: o.priceMax,
      marketBaseKind: o.priceKind === "range" ? "range_midpoint" : "point",
    });
  }
  if (!qualified.length) return null;
  const rep = calculateRepresentativeWorkRate(qualified);
  if (rep.status !== "ok" || rep.medianPln == null) return null;
  const proposed = computeProposedWorkRatePln(rep.medianPln, marginPct);
  if (proposed == null) return null;
  return {
    workId: input.workId,
    unit: catalogUnit,
    namePl: input.workNamePl,
    suggestedRatePln: proposed,
    marketBaseRatePln: rep.medianPln,
    wgdomMarginPct: marginPct,
    proposedOurRatePln: proposed,
    sourceMinPln: null,
    sourceMaxPln: null,
    regionScope: rep.regionScope,
    countryScope: "POLSKA",
    widthClaim: "NOT_SPECIFIED",
    sampleSize: rep.sampleSize,
    lowSample: rep.lowSample === true,
    observations: qualified,
    previousOurRatePln: null,
    previousFreshness: "MISSING",
  };
}

function canonicalReadBack(input: {
  workId: string;
  workNamePl: string;
  unit: WgdomCostUnit;
}): LaborSourceEvidenceObservation[] {
  const lookup = lookupReusableLaborResearchEvidence({
    workId: input.workId,
    workNamePl: input.workNamePl,
    unit: input.unit,
  });
  if (lookup.observations.length > 0) return [...lookup.observations];
  const store = loadLaborSourceEvidenceStoreLocal();
  const aggregated = filterLaborSourceEvidenceForAggregation(store.observations, {
    workId: input.workId,
    namePl: input.workNamePl,
  });
  const unitNorm = String(input.unit).toLowerCase();
  return aggregated.filter(
    (o) => String(o.unit || "").trim().toLowerCase() === unitNorm,
  );
}

/**
 * APF Evidence → canonical durable Evidence → read-back → optional Candidate.
 * Never Accept / OUR RATE / cloud push.
 */
export function persistApfLaborEvidenceToCanonical(
  input: PersistApfLaborEvidenceInput,
): PersistApfLaborEvidenceResult {
  if (!input.identityTrusted) {
    return fail("INVALID_IDENTITY", "Identity not trusted — fail-closed.");
  }

  const mapped = mapApfEvidenceToCanonicalObservations({
    workId: input.workId,
    workNamePl: input.workNamePl,
    unit: input.unit,
    apfEvidence: input.apfEvidence,
    marketObservations: input.marketObservations,
    nowIso: input.nowIso,
  });
  if (!mapped.ok) {
    return fail(mapped.reason, mapped.messagePl);
  }

  const catalogUnit = resolveApfEvidenceCatalogUnit(input.unit);
  if (!catalogUnit) {
    return fail("INVALID_UNIT", "Invalid unit after map.");
  }

  if (input.persist === false) {
    return {
      seamId: APF_EVIDENCE_PERSIST_SEAM_ID,
      ok: true,
      failReason: null,
      messagePl: "Dry-map only — no durable write.",
      writer: APF_EVIDENCE_WRITER,
      storageKey: APF_EVIDENCE_STORAGE_KEY,
      built: mapped.observations,
      cas: null,
      readBack: [],
      candidateFromDurable: buildCandidateFromDurableLaborEvidence({
        workId: input.workId,
        workNamePl: input.workNamePl,
        unit: input.unit,
        observations: mapped.observations,
        marginPct: input.marginPct,
      }),
      acceptExecuted: false,
      ourRateWritten: false,
      workCatalogMutated: false,
      productionCloudPush: false,
      researchMethod: APF_EVIDENCE_RESEARCH_METHOD,
      p527Unchanged: true,
      keep4Unchanged: true,
    };
  }

  const cas = upsertLaborSourceEvidenceObservations({
    observations: mapped.observations,
    nowIso: input.nowIso || new Date().toISOString(),
  });

  if (!cas.ok) {
    return fail(
      cas.reason === "host_rejected" ? "HOST_REJECTED" : "CAS_FAILED",
      cas.messagePl,
      mapped.observations,
      cas,
    );
  }

  const readBack = canonicalReadBack({
    workId: input.workId,
    workNamePl: input.workNamePl,
    unit: catalogUnit,
  });

  if (readBack.length === 0) {
    return fail(
      "EMPTY_AFTER_MAP",
      "Write returned ok but canonical read-back empty.",
      mapped.observations,
      cas,
    );
  }

  const hasApfTrace = readBack.every(
    (o) =>
      isApfAuthorizedSourceId(o.sourceId) &&
      (o.parserVersion === APF_EVIDENCE_PARSER_VERSION ||
        o.provenance.sectionHint === APF_EVIDENCE_RESEARCH_METHOD ||
        Boolean(o.provenance.fetchTraceId)),
  );
  if (!hasApfTrace) {
    return fail(
      "MISSING_PROVENANCE",
      "Read-back missing APF research method / provenance markers.",
      mapped.observations,
      cas,
      readBack,
    );
  }

  const candidateFromDurable = buildCandidateFromDurableLaborEvidence({
    workId: input.workId,
    workNamePl: input.workNamePl,
    unit: input.unit,
    observations: readBack,
    marginPct: input.marginPct,
  });

  return {
    seamId: APF_EVIDENCE_PERSIST_SEAM_ID,
    ok: true,
    failReason: null,
    messagePl: `APF Evidence durable persisted=${readBack.length} (≠ OUR RATE).`,
    writer: APF_EVIDENCE_WRITER,
    storageKey: APF_EVIDENCE_STORAGE_KEY,
    built: mapped.observations,
    cas,
    readBack,
    candidateFromDurable,
    acceptExecuted: false,
    ourRateWritten: false,
    workCatalogMutated: false,
    productionCloudPush: false,
    researchMethod: APF_EVIDENCE_RESEARCH_METHOD,
    p527Unchanged: true,
    keep4Unchanged: true,
  };
}
