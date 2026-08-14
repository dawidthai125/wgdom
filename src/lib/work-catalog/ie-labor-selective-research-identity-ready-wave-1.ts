/**
 * IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1
 *
 * One batch for exactly 3 LABOR targets (Tablica · Podejście · Wykwity).
 * A1: TARGET PREFLIGHT → FETCH → PARSE → IDENTITY → SCOPE → QUALIFY
 * A2: partial-safe · Evidence UNION APPEND only
 * A3: Wave-1 exact_normalized → Owner synonym/D1 · ZERO new aliases/maps
 *
 * ZERO Accept · ZERO OUR RATE · ZERO margin · ZERO Catalog mutate · ZERO new hosts.
 */

import {
  assertLaborResearchAllowed,
  classifyEstimatorPricingPlane,
} from "@/lib/intelligent-estimator/classification-gate";
import {
  buildLaborSourceEvidenceObservation,
  upsertLaborSourceEvidenceObservations,
  type LaborSourceEvidenceCasResult,
  type LaborSourceEvidenceObservation,
} from "@/lib/labor-source-evidence";
import { isLaborSourceEvidenceRuntimeSourceId } from "@/lib/labor-source-evidence/host-lock";
import { getWorkByIdFromStore } from "@/lib/work-catalog/catalog-work-utils";
import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import {
  listExactIdentityAliasesForWork,
  listWorkRateIdentityMappings,
  resolveLaborIdentityMapping,
} from "@/lib/work-catalog/work-rate-identity-mapping";
import {
  runSelectiveWorkRateResearch,
  type RunSelectiveWorkRateResearchResult,
  type WorkRateResearchCandidate,
} from "@/lib/work-catalog/work-rate-research";
import type { WorkRateSelectiveLookupPort } from "@/lib/work-catalog/work-rate-selective-lookup-types";
import { listWorkRateMatchNamesPl } from "@/lib/work-catalog/work-rate-synonyms";
import type { WorkRateQualifiedObservation } from "@/lib/work-catalog/work-rate-qualify";
import { lookupWorkRate } from "@/lib/work-catalog/work-rate-lookup";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";

export const IE_LABOR_IR_WAVE1_EPIC_ID =
  "IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1" as const;

/** KEEP-4 only — candidate hosts FORBIDDEN this epic. */
export const IE_LABOR_IR_WAVE1_KEEP4_SOURCE_IDS = Object.freeze([
  "kb_pl",
  "cennikremontow_pl",
  "sccot",
  "extradom",
] as const);

/** Explicitly forbidden candidate hosts / brands (A7 / Owner). */
export const IE_LABOR_IR_WAVE1_FORBIDDEN_CANDIDATE_HOSTS = Object.freeze([
  "kul-bud",
  "kulbud",
  "budowalka",
  "murator",
  "ogarnij remont",
  "ogarnijremont",
  "zleca",
  "cennikibudowlane",
] as const);

export type IeLaborIrWave1IdentityBasis = "wave1_mapping" | "d1_owner_synonym";

export type IeLaborIrWave1TargetDef = {
  key: "tablica" | "podejscie" | "wykwity";
  workId: string;
  namePl: string;
  unit: WgdomCostUnit;
  identityBasis: IeLaborIrWave1IdentityBasis;
  mappingId: string | null;
  primaryObservedName: string | null;
  primarySourceId: string | null;
};

export const IE_LABOR_IR_WAVE1_TARGETS: readonly IeLaborIrWave1TargetDef[] =
  Object.freeze([
    {
      key: "tablica",
      workId: "p2b-tablica-rozdzielcza-mieszkaniowa-szt",
      namePl: "Tablica rozdzielcza mieszkaniowa",
      unit: "szt",
      identityBasis: "wave1_mapping",
      mappingId: "lim-w1-tablica-rozdzielcza-cr",
      primaryObservedName: "Montaż skrzynki rozdzielczej",
      primarySourceId: "cennikremontow_pl",
    },
    {
      key: "podejscie",
      workId: "p2b-podejscie-wod-kan-mb",
      namePl: "Podejście wodociągowo-kanalizacyjne łączone",
      unit: "mb",
      identityBasis: "wave1_mapping",
      mappingId: "lim-w1-podejscie-wod-kan-cr",
      primaryObservedName:
        "Wykonanie podejścia wodno - kanalizacyjnego plastik i miedź",
      primarySourceId: "cennikremontow_pl",
    },
    {
      key: "wykwity",
      workId: "cc-w2-wykwity-zacieki",
      namePl: "Skasowanie wykwitów / zacieków",
      unit: "m2",
      identityBasis: "d1_owner_synonym",
      mappingId: null,
      primaryObservedName: null,
      primarySourceId: null,
    },
  ]);

export type IeLaborIrWave1PreflightStatus =
  | "READY"
  | "BLOCKED"
  | "OUR_RATE_CURRENT";

export type IeLaborIrWave1PreflightResult = {
  targetKey: IeLaborIrWave1TargetDef["key"];
  workId: string;
  status: IeLaborIrWave1PreflightStatus;
  reason:
    | "OK"
    | "CLASSIFICATION_GATE"
    | "IDENTITY_NOT_READY"
    | "UNIT_MISMATCH"
    | "UNKNOWN_WORK"
    | "OUR_RATE_CURRENT"
    | "CANDIDATE_HOST_FORBIDDEN";
  messagePl: string;
  plane: string;
  httpFetchCount: 0;
  mappingId: string | null;
  identityBasis: IeLaborIrWave1IdentityBasis;
  matchNames: readonly string[];
};

export type IeLaborIrWave1TargetOutcome = {
  targetKey: IeLaborIrWave1TargetDef["key"];
  workId: string;
  preflight: IeLaborIrWave1PreflightResult;
  research: RunSelectiveWorkRateResearchResult | null;
  batchStatus:
    | "EVIDENCE_CANDIDATE"
    | "SOURCE_GAP"
    | "BLOCKED"
    | "REUSE"
    | "COOLDOWN"
    | "SKIPPED_PREFLIGHT";
  evidenceObservations: LaborSourceEvidenceObservation[];
};

export type IeLaborIrWave1BatchResult = {
  epicId: typeof IE_LABOR_IR_WAVE1_EPIC_ID;
  targets: IeLaborIrWave1TargetOutcome[];
  evidenceWritten: boolean;
  evidenceCas: LaborSourceEvidenceCasResult | null;
  totalHttpFetchCount: number;
  /** True when ≥1 target produced evidence candidates and ≥1 did not (A2). */
  partial: boolean;
  catalogMutated: false;
  acceptPerformed: false;
  ourRateWritten: false;
  marginWritten: false;
};

export function isIeLaborIrWave1Keep4SourceId(sourceId: string): boolean {
  return isLaborSourceEvidenceRuntimeSourceId(sourceId);
}

export function isIeLaborIrWave1CandidateHostForbidden(
  hostOrSource: string,
): boolean {
  const n = String(hostOrSource || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "");
  if (!n) return false;
  if (IE_LABOR_IR_WAVE1_KEEP4_SOURCE_IDS.some((id) => n === id.replace(/_/g, ""))) {
    return false;
  }
  return IE_LABOR_IR_WAVE1_FORBIDDEN_CANDIDATE_HOSTS.some((h) => {
    const hn = h.replace(/[^a-z0-9]+/g, "");
    return n.includes(hn) || hn.includes(n);
  });
}

function findWave1Mapping(target: IeLaborIrWave1TargetDef) {
  if (!target.mappingId) return null;
  return (
    listWorkRateIdentityMappings().find(
      (r) =>
        r.mappingId === target.mappingId &&
        r.workId === target.workId &&
        r.active &&
        r.ownerApproval,
    ) ?? null
  );
}

/**
 * TARGET PREFLIGHT — eligibility only. Does NOT fetch.
 * Fetch ≠ identity success (A1).
 */
export function preflightIeLaborIrWave1Target(input: {
  target: IeLaborIrWave1TargetDef;
  store: WorkCatalogStore;
  nowMs?: number;
  /** Injected sourceId check — reject candidate hosts before research. */
  probeSourceId?: string | null;
}): IeLaborIrWave1PreflightResult {
  const { target } = input;
  const base = {
    targetKey: target.key,
    workId: target.workId,
    httpFetchCount: 0 as const,
    mappingId: target.mappingId,
    identityBasis: target.identityBasis,
    matchNames: [] as readonly string[],
  };

  if (
    input.probeSourceId &&
    (isIeLaborIrWave1CandidateHostForbidden(input.probeSourceId) ||
      !isIeLaborIrWave1Keep4SourceId(input.probeSourceId))
  ) {
    return {
      ...base,
      status: "BLOCKED",
      reason: "CANDIDATE_HOST_FORBIDDEN",
      messagePl: `Source/host „${input.probeSourceId}” poza KEEP-4 / candidate host zabroniony.`,
      plane: "n/a",
    };
  }

  const classify = classifyEstimatorPricingPlane({
    workId: target.workId,
    namePl: target.namePl,
    unit: target.unit,
  });
  const laborGate = assertLaborResearchAllowed({
    workId: target.workId,
    namePl: target.namePl,
    unit: target.unit,
  });
  if (!laborGate.ok || classify.plane !== "LABOR") {
    return {
      ...base,
      status: "BLOCKED",
      reason: "CLASSIFICATION_GATE",
      messagePl: `Classification Gate — plane=${classify.plane} (wymagane LABOR).`,
      plane: classify.plane,
    };
  }

  const work: CatalogWork | undefined = getWorkByIdFromStore(
    input.store,
    target.workId,
  );
  if (!work) {
    return {
      ...base,
      status: "BLOCKED",
      reason: "UNKNOWN_WORK",
      messagePl: `Brak workId „${target.workId}” w Work Catalog (preflight).`,
      plane: classify.plane,
    };
  }
  if (String(work.unit) !== target.unit) {
    return {
      ...base,
      status: "BLOCKED",
      reason: "UNIT_MISMATCH",
      messagePl: `Unit mismatch catalog=${work.unit} vs target=${target.unit}.`,
      plane: classify.plane,
    };
  }

  let matchNames: readonly string[] = [];
  if (target.identityBasis === "wave1_mapping") {
    const row = findWave1Mapping(target);
    if (!row) {
      return {
        ...base,
        status: "BLOCKED",
        reason: "IDENTITY_NOT_READY",
        messagePl: `Brak aktywnego Wave-1 mapping ${target.mappingId}.`,
        plane: classify.plane,
      };
    }
    const aliases = listExactIdentityAliasesForWork({
      workId: target.workId,
      catalogUnit: target.unit,
      sourceId: target.primarySourceId,
    });
    if (!aliases.length) {
      return {
        ...base,
        status: "BLOCKED",
        reason: "IDENTITY_NOT_READY",
        messagePl: "Wave-1 mapping bez aliasów exact_normalized.",
        plane: classify.plane,
      };
    }
    if (target.primaryObservedName) {
      const hit = resolveLaborIdentityMapping({
        observedName: target.primaryObservedName,
        observedUnit: target.unit,
        catalogUnit: target.unit,
        sourceId: target.primarySourceId || "cennikremontow_pl",
        laborOnly: true,
        includesMaterial: false,
        knownWorkIds: [target.workId],
      });
      if (hit.status === "AMBIGUOUS") {
        return {
          ...base,
          status: "BLOCKED",
          reason: "IDENTITY_NOT_READY",
          messagePl: "Identity AMBIGUOUS — BLOCKED (A3).",
          plane: classify.plane,
          matchNames: aliases,
        };
      }
      if (hit.status !== "HIT" || hit.workId !== target.workId) {
        return {
          ...base,
          status: "BLOCKED",
          reason: "IDENTITY_NOT_READY",
          messagePl: "Primary observedName nie wiąże się exact_normalized do workId.",
          plane: classify.plane,
          matchNames: aliases,
        };
      }
    }
    matchNames = aliases;
  } else {
    // D1 Owner synonyms — no new mapping
    if (target.mappingId) {
      return {
        ...base,
        status: "BLOCKED",
        reason: "IDENTITY_NOT_READY",
        messagePl: "Wykwity: mapping musi być NONE.",
        plane: classify.plane,
      };
    }
    matchNames = listWorkRateMatchNamesPl(target.namePl);
    const hasSynonym = matchNames.length > 1;
    if (!hasSynonym) {
      return {
        ...base,
        status: "BLOCKED",
        reason: "IDENTITY_NOT_READY",
        messagePl: "Brak D1 Owner synonyms dla wykwitów.",
        plane: classify.plane,
        matchNames,
      };
    }
  }

  const nowMs = input.nowMs ?? Date.now();
  const looked = lookupWorkRate(input.store, target.workId, target.unit, nowMs);
  if (looked.status === "CURRENT") {
    return {
      ...base,
      status: "OUR_RATE_CURRENT",
      reason: "OUR_RATE_CURRENT",
      messagePl: "OUR RATE CURRENT — research bez forceRefresh = REUSE (httpFetchCount=0).",
      plane: classify.plane,
      matchNames,
    };
  }

  return {
    ...base,
    status: "READY",
    reason: "OK",
    messagePl: "Preflight READY — można wejść w FETCH→PARSE→IDENTITY→SCOPE→QUALIFY.",
    plane: classify.plane,
    matchNames,
  };
}

export function buildEvidenceFromQualifiedObservation(input: {
  workId: string;
  workNamePl: string;
  observation: WorkRateQualifiedObservation;
  identityMethod: "owner_identity_mapping" | "owner_synonym" | "exact_name";
  synonymUsed?: string | null;
  retrievedAt?: string;
}): LaborSourceEvidenceObservation {
  const o = input.observation;
  const hasRange =
    o.sourceMinPln != null &&
    o.sourceMaxPln != null &&
    Number.isFinite(o.sourceMinPln) &&
    Number.isFinite(o.sourceMaxPln) &&
    o.sourceMinPln !== o.sourceMaxPln;
  return buildLaborSourceEvidenceObservation({
    workId: input.workId,
    workNamePl: input.workNamePl,
    sourceId: o.sourceId,
    sourceUrl: o.sourceUrl,
    observedName: o.workNamePl,
    unit: o.unit,
    priceMin: hasRange ? o.sourceMinPln! : null,
    priceMax: hasRange ? o.sourceMaxPln! : null,
    pricePoint: hasRange ? null : o.ratePln,
    priceKind: hasRange ? "range" : "point",
    region: o.regionScope,
    identityMatched: true,
    identityMethod: input.identityMethod,
    synonymUsed: input.synonymUsed ?? null,
    laborOnly: true,
    includesMaterial: false,
    observedAt: o.observedAt,
    retrievedAt: input.retrievedAt || o.observedAt,
  });
}

function mapResearchToBatchStatus(
  research: RunSelectiveWorkRateResearchResult,
): IeLaborIrWave1TargetOutcome["batchStatus"] {
  if (research.status === "CANDIDATE") return "EVIDENCE_CANDIDATE";
  if (research.status === "GAP") return "SOURCE_GAP";
  if (research.status === "REUSE") return "REUSE";
  if (research.status === "COOLDOWN") return "COOLDOWN";
  return "BLOCKED";
}

function evidenceFromCandidate(
  target: IeLaborIrWave1TargetDef,
  candidate: WorkRateResearchCandidate,
): LaborSourceEvidenceObservation[] {
  const identityMethod =
    target.identityBasis === "wave1_mapping"
      ? ("owner_identity_mapping" as const)
      : ("owner_synonym" as const);
  return candidate.observations.map((o) =>
    buildEvidenceFromQualifiedObservation({
      workId: target.workId,
      workNamePl: target.namePl,
      observation: o,
      identityMethod,
      synonymUsed: candidate.synonymUsed ?? null,
    }),
  );
}

/**
 * Batch orchestrator — partial-safe (A2).
 * Observation pipeline delegated to `runSelectiveWorkRateResearch`
 * (FETCH→PARSE→IDENTITY→SCOPE→QUALIFY). Preflight never counts as fetch success.
 */
export async function runIeLaborSelectiveResearchIdentityReadyWave1(input: {
  store: WorkCatalogStore;
  lookupPort?: WorkRateSelectiveLookupPort;
  /** Persist Evidence via union-by-dedupeKey + CAS. Default true (IMPLEMENT may write Evidence). */
  persistEvidence?: boolean;
  forceRefresh?: boolean;
  bypassCooldown?: boolean;
  nowMs?: number;
}): Promise<IeLaborIrWave1BatchResult> {
  const persistEvidence = input.persistEvidence !== false;
  const targets: IeLaborIrWave1TargetOutcome[] = [];
  const pendingEvidence: LaborSourceEvidenceObservation[] = [];
  let totalHttpFetchCount = 0;

  for (const target of IE_LABOR_IR_WAVE1_TARGETS) {
    const preflight = preflightIeLaborIrWave1Target({
      target,
      store: input.store,
      nowMs: input.nowMs,
    });

    if (preflight.status === "BLOCKED") {
      targets.push({
        targetKey: target.key,
        workId: target.workId,
        preflight,
        research: null,
        batchStatus: "SKIPPED_PREFLIGHT",
        evidenceObservations: [],
      });
      continue;
    }

    // A1 observation pipeline via existing selective research (no second engine)
    const research = await runSelectiveWorkRateResearch({
      store: input.store,
      workId: target.workId,
      unit: target.unit,
      namePl: target.namePl,
      forceRefresh: input.forceRefresh === true,
      bypassCooldown: input.bypassCooldown ?? true,
      nowMs: input.nowMs,
      lookupPort: input.lookupPort,
    });
    totalHttpFetchCount += research.httpFetchCount;

    let evidenceObservations: LaborSourceEvidenceObservation[] = [];
    if (research.status === "CANDIDATE") {
      evidenceObservations = evidenceFromCandidate(target, research.candidate);
      pendingEvidence.push(...evidenceObservations);
    }

    targets.push({
      targetKey: target.key,
      workId: target.workId,
      preflight,
      research,
      batchStatus: mapResearchToBatchStatus(research),
      evidenceObservations,
    });
  }

  let evidenceCas: LaborSourceEvidenceCasResult | null = null;
  let evidenceWritten = false;
  if (persistEvidence && pendingEvidence.length > 0) {
    evidenceCas = upsertLaborSourceEvidenceObservations({
      observations: pendingEvidence,
    });
    evidenceWritten = evidenceCas.ok === true;
  }

  const withEvidence = targets.filter((t) => t.evidenceObservations.length > 0)
    .length;
  const withoutEvidence = targets.length - withEvidence;
  const partial = withEvidence > 0 && withoutEvidence > 0;

  return {
    epicId: IE_LABOR_IR_WAVE1_EPIC_ID,
    targets,
    evidenceWritten,
    evidenceCas,
    totalHttpFetchCount,
    partial,
    catalogMutated: false,
    acceptPerformed: false,
    ourRateWritten: false,
    marginWritten: false,
  };
}
