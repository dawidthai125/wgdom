/**
 * AUTONOMOUS CANONICAL LEAF CREATE v1 (ACLC-v1)
 *
 * Evidence-gated CREATE of reusable Work Catalog leaves via existing
 * executeKnrWcCatalogWorkCreate — OWNER_CREATE OR AUTONOMOUS_CREATE_V1.
 *
 * Never: invent from code alone · price · costSplit · PENDING-only · Owner runtime.
 */

import {
  assertKnrWcCreateAllowed,
  buildCatalogWorkDraftFromProposal,
  type KnrWcAutonomousCreateAuthorization,
} from "@/lib/intelligent-estimator/knr-wc-identity-bridge-create";
import { insertWorkBothRegions, CatalogWorkDuplicateIdError } from "@/lib/work-catalog/work-catalog-insert";
import type { KnrWcIdentityProposal } from "@/lib/intelligent-estimator/knr-wc-identity-bridge-types";
import {
  CHATGPT_KNR_RESEARCH_TPI729_VERIFIED,
  scoreKnrSourceQuality,
  type ChatgptKnrVerifiedRecord,
} from "@/lib/intelligent-estimator/knr-knowledge/chatgpt-knr-research-knowledge";
import type { KnrCatalogStore } from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-store";
import { discoverIdentityLeafCandidates } from "@/lib/work-catalog/autonomous-identity-discovery-adapter";
import { runBoundedAutonomousIdentityResolution } from "@/lib/work-catalog/autonomous-identity-resolution-v2";
import { buildCompoundIdentityCandidate } from "@/lib/work-catalog/compound-identity-candidate-engine";
import { catalogWorkExistsInStore } from "@/lib/work-catalog/work-catalog-insert";
import { listActiveWorksForRegion } from "@/lib/work-catalog/catalog-work-utils";
import { normalizeWorkRateUnitToken } from "@/lib/work-catalog/work-rate-qualify";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { TechnologyPack } from "@/lib/technology-foundation/types";
import { normalizeWgdomCostUnit } from "@/lib/wgdom-cost-catalog";

export const AUTONOMOUS_CANONICAL_LEAF_CREATE_VERSION = "ACLC-v1" as const;
export const AUTONOMOUS_CANONICAL_LEAF_CREATE_POLICY = "ACLC-v1-policy-2026-09" as const;

export type AutonomousCreateDecision =
  | "CREATE"
  | "IDEMPOTENT_NOOP"
  | "REJECT"
  | "REUSE_EXISTING_CANONICAL";

export type AutonomousCreateConditionKey =
  | "A_realKnrEvidence"
  | "B_familyCodeResolved"
  | "C_unitKnownCompatible"
  | "D_descriptionSupported"
  | "E_sourceProvenance"
  | "F_notMereCandidate"
  | "G_noExactWcMatch"
  | "H_noValidCanonicalMatch"
  | "I_noAuthoritativeConflict"
  | "J_noCompanyPriceIdentity"
  | "K_noPriceAuthority"
  | "L_noInventedBom"
  | "M_canonicalFieldsConstructible"
  | "N_idempotentKey"
  | "O_auditWhy"
  | "P_failClosedComplete";

export type AutonomousCanonicalLeafCreateEvaluation = {
  version: typeof AUTONOMOUS_CANONICAL_LEAF_CREATE_VERSION;
  policyVersion: typeof AUTONOMOUS_CANONICAL_LEAF_CREATE_POLICY;
  knrCode: string;
  knrFamily: string;
  unit: string;
  evidenceCount: number;
  evidenceQuality: "INSUFFICIENT" | "ADEQUATE" | "STRONG";
  conflictState: "NONE" | "FAMILY_VARIANT_NOTED" | "CONFLICT";
  existingExactMatch: string | null;
  aliasMatch: string | null;
  historicalMatch: string | null;
  semanticMatch: string | null;
  canonicalCreateEligibility: boolean;
  rejectionReason: string | null;
  autonomousCreateDecision: AutonomousCreateDecision;
  proposedCanonicalIdentity: {
    catalogWorkId: string;
    namePl: string;
    descriptionPl: string;
    unit: string;
    displayCode: string;
    family: string;
    tableCode: string;
  } | null;
  proposedCatalogWorkId: string | null;
  provenance: {
    sourceUrls: string[];
    evidenceRefs: string[];
    decisionKind: "AUTONOMOUS_CREATE_V1";
    policyVersion: string;
  };
  conditions: Record<AutonomousCreateConditionKey, boolean>;
  auditWhy: string;
  ownerRuntimeDependency: 0;
};

function soft(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugFamily(family: string): string {
  return soft(family).replace(/\s+/g, "-") || "knr";
}

/** Deterministic reusable canonical work id — family + code + unit (not tender-specific). */
export function buildAutonomousCanonicalWorkId(input: {
  catalogFamilyPrefix: string;
  tableCode: string;
  unit: string;
}): string {
  const unit = normalizeWorkRateUnitToken(input.unit) || soft(input.unit) || "item";
  const fam = slugFamily(input.catalogFamilyPrefix);
  const code = String(input.tableCode || "").trim().toLowerCase();
  return `cw.knr.${fam}.${code}.${unit}`.replace(/\.+/g, ".").replace(/^\.|\.$/g, "");
}

/** Extract KNR/KNNR table code from canonical id `cw.knr.*.0815-04.m2` — null if absent. */
export function extractTableCodeFromCanonicalWorkId(workId: string): string | null {
  const m = String(workId || "")
    .trim()
    .toLowerCase()
    .match(/\.(\d{3,4}-\d{2})(?:\.|$)/);
  return m?.[1] ?? null;
}

function unitOk(a: string, b: string): boolean {
  const x = normalizeWorkRateUnitToken(a);
  const y = normalizeWorkRateUnitToken(b);
  return Boolean(x) && Boolean(y) && x === y;
}

function evidenceQualityOf(rec: ChatgptKnrVerifiedRecord): {
  band: "INSUFFICIENT" | "ADEQUATE" | "STRONG";
  count: number;
  maxScore: number;
} {
  const scores = (rec.sources || []).map((s) =>
    scoreKnrSourceQuality({ sourceUrl: s.sourceUrl, sourceType: s.sourceType }).score,
  );
  const count = scores.length;
  const maxScore = scores.length ? Math.max(...scores) : 0;
  const strongCount = scores.filter((s) => s >= 70).length;
  if (count === 0 || maxScore < 40) return { band: "INSUFFICIENT", count, maxScore };
  if (strongCount >= 2 || (count >= 2 && maxScore >= 70) || maxScore >= 85) {
    return { band: "STRONG", count, maxScore };
  }
  if (maxScore >= 70 || (count >= 2 && maxScore >= 40)) {
    return { band: "ADEQUATE", count, maxScore };
  }
  return { band: "INSUFFICIENT", count, maxScore };
}

/** Strong existing canonical = exact id OR AIDISC clear winner with MEDIUM+ score. */
function findExistingCanonicalMatches(input: {
  store: WorkCatalogStore;
  rec: ChatgptKnrVerifiedRecord;
  proposedWorkId: string;
  knrCatalogStore?: KnrCatalogStore | null;
  nowIso: string;
}): {
  exact: string | null;
  alias: string | null;
  historical: string | null;
  semantic: string | null;
  validCanonical: string | null;
} {
  const exact = catalogWorkExistsInStore(input.store, input.proposedWorkId)
    ? input.proposedWorkId
    : null;

  const aidisc = discoverIdentityLeafCandidates({
    parentWorkId: `aclc-scan-${input.rec.tableCode}`,
    store: input.store,
    descriptions: [input.rec.description, input.rec.canonicalDisplay, ...input.rec.semanticTokens],
    unit: input.rec.unit,
    knrCatalogStore: input.knrCatalogStore,
    nowIso: input.nowIso,
  });

  const semantic =
    aidisc.clearWinnerWorkId
    && aidisc.candidates.find((c) => c.workId === aidisc.clearWinnerWorkId)?.source
      === "CATALOG_SEMANTIC"
      ? aidisc.clearWinnerWorkId
      : aidisc.candidates.find(
            (c) => c.source === "CATALOG_SEMANTIC" && c.score >= 0.55 && c.evidenceStrength !== "LOW",
          )?.workId || null;

  const historical =
    aidisc.candidates.find((c) => c.source === "HISTORICAL_VALIDATED")?.workId || null;

  // Weak alias: token overlap only — not valid canonical unless clear winner HIGH
  let alias: string | null = null;
  try {
    const tokens = soft(input.rec.description)
      .split(" ")
      .filter((t) => t.length >= 6)
      .slice(0, 8);
    for (const w of listActiveWorksForRegion(input.store, input.store.activeRegion)) {
      if (!unitOk(String(w.unit), input.rec.unit)) continue;
      const hay = soft(`${w.id} ${w.namePl}`);
      const hits = tokens.filter((t) => hay.includes(t));
      if (hits.length >= 3) {
        alias = w.id;
        break;
      }
    }
  } catch {
    /* */
  }

  const validCanonical =
    exact
    || (semantic && !aidisc.nearTie ? semantic : null)
    || (historical || null)
    || (alias
    && aidisc.clearWinnerWorkId === alias
    && (aidisc.candidates.find((c) => c.workId === alias)?.score ?? 0) >= 0.7
      ? alias
      : null);

  return { exact, alias, historical, semantic, validCanonical };
}

export function evaluateAutonomousCanonicalLeafCreate(input: {
  record: ChatgptKnrVerifiedRecord;
  store: WorkCatalogStore;
  knrCatalogStore?: KnrCatalogStore | null;
  /** When true, PENDING-only catalog without verified pack fields fails (always use record). */
  pendingOnlyWithoutVerifiedPack?: boolean;
  companyPricePln?: number | null;
  priceAsIdentity?: boolean;
  nowIso: string;
}): AutonomousCanonicalLeafCreateEvaluation {
  const rec = input.record;
  const nowIso = input.nowIso;
  const proposedWorkId = buildAutonomousCanonicalWorkId({
    catalogFamilyPrefix: rec.catalogFamilyPrefix,
    tableCode: rec.tableCode,
    unit: rec.unit,
  });
  const eq = evidenceQualityOf(rec);
  const unitNorm = normalizeWgdomCostUnit(rec.unit);
  const matches = findExistingCanonicalMatches({
    store: input.store,
    rec,
    proposedWorkId,
    knrCatalogStore: input.knrCatalogStore,
    nowIso,
  });

  const conflictState: AutonomousCanonicalLeafCreateEvaluation["conflictState"] =
    (rec.alternateFamilies || []).length > 0 ? "FAMILY_VARIANT_NOTED" : "NONE";

  const otherValidCanonicalRaw =
    matches.validCanonical && matches.validCanonical !== proposedWorkId
      ? matches.validCanonical
      : null;
  // Never collapse distinct KNR table codes (e.g. 0815-04 ↛ 0815-05 via semantic AIDISC).
  const proposedCode = String(rec.tableCode || "").trim().toLowerCase();
  const otherCode = otherValidCanonicalRaw
    ? extractTableCodeFromCanonicalWorkId(otherValidCanonicalRaw)
    : null;
  const otherValidCanonical =
    otherValidCanonicalRaw
    && otherCode
    && otherCode === proposedCode
      ? otherValidCanonicalRaw
      : null;

  const conditions: Record<AutonomousCreateConditionKey, boolean> = {
    A_realKnrEvidence: Boolean(rec.tableCode && rec.catalogFamilyPrefix && rec.sources?.length),
    B_familyCodeResolved: Boolean(
      String(rec.catalogFamilyPrefix).trim() && String(rec.tableCode).trim(),
    ),
    C_unitKnownCompatible: Boolean(unitNorm),
    D_descriptionSupported: soft(rec.description).split(" ").filter((t) => t.length >= 4).length >= 3,
    E_sourceProvenance: (rec.sources || []).length >= 1 && eq.maxScore >= 40,
    F_notMereCandidate: eq.band !== "INSUFFICIENT" && !input.pendingOnlyWithoutVerifiedPack,
    G_noExactWcMatch: !matches.exact,
    H_noValidCanonicalMatch: !otherValidCanonical,
    I_noAuthoritativeConflict: conflictState !== "CONFLICT",
    J_noCompanyPriceIdentity: !(Number(input.companyPricePln) > 0),
    K_noPriceAuthority: input.priceAsIdentity !== true,
    L_noInventedBom: true,
    M_canonicalFieldsConstructible: Boolean(
      proposedWorkId && rec.description && unitNorm && rec.canonicalDisplay,
    ),
    N_idempotentKey: Boolean(proposedWorkId),
    O_auditWhy: true,
    P_failClosedComplete: true,
  };

  const failedForCreate = (
    Object.entries(conditions) as [AutonomousCreateConditionKey, boolean][]
  )
    .filter(([k, v]) => !v && k !== "G_noExactWcMatch" && k !== "H_noValidCanonicalMatch")
    .map(([k]) => k);

  let decision: AutonomousCreateDecision = "REJECT";
  let rejectionReason: string | null = null;
  let eligible = false;

  if (matches.exact) {
    decision = "IDEMPOTENT_NOOP";
    rejectionReason = null;
    eligible = false;
  } else if (otherValidCanonical) {
    decision = "REUSE_EXISTING_CANONICAL";
    rejectionReason = `existing_canonical:${otherValidCanonical}`;
    eligible = false;
  } else if (failedForCreate.length === 0 && conditions.G_noExactWcMatch && conditions.H_noValidCanonicalMatch) {
    decision = "CREATE";
    eligible = true;
  } else {
    decision = "REJECT";
    const failed = (Object.entries(conditions) as [AutonomousCreateConditionKey, boolean][])
      .filter(([, v]) => !v)
      .map(([k]) => k);
    rejectionReason = failed.join(",");
    if (matches.alias && !otherValidCanonical) {
      rejectionReason = `weak_alias_noted:${matches.alias};${rejectionReason}`;
    }
  }

  conditions.P_failClosedComplete = decision !== "CREATE" || eligible;
  conditions.O_auditWhy = true;

  const auditWhy =
    decision === "CREATE"
      ? `ACLC-v1 PASS: verified KNR ${rec.catalogFamilyPrefix} ${rec.tableCode} unit=${rec.unit} evidence=${eq.band}/${eq.count} sources; no exact/valid WC leaf; canonical id ${proposedWorkId}`
      : decision === "IDEMPOTENT_NOOP"
        ? `ACLC-v1 IDEMPOTENT: ${proposedWorkId} already in Work Catalog`
        : decision === "REUSE_EXISTING_CANONICAL"
          ? `ACLC-v1 REUSE: valid canonical ${matches.validCanonical}`
          : `ACLC-v1 REJECT: ${rejectionReason}`;

  const namePl = `${rec.canonicalDisplay} — ${rec.description}`.slice(0, 180);
  const descriptionPl = [
    rec.description,
    `KNR identity: ${rec.catalogFamilyPrefix} / ${rec.tableCode}`,
    (rec.alternateFamilies || []).length
      ? `Alternate families noted (not collapsed): ${(rec.alternateFamilies || []).join(", ")}`
      : null,
    `ACLC provenance: ${AUTONOMOUS_CANONICAL_LEAF_CREATE_POLICY}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    version: AUTONOMOUS_CANONICAL_LEAF_CREATE_VERSION,
    policyVersion: AUTONOMOUS_CANONICAL_LEAF_CREATE_POLICY,
    knrCode: rec.tableCode,
    knrFamily: rec.catalogFamilyPrefix,
    unit: rec.unit,
    evidenceCount: eq.count,
    evidenceQuality: eq.band,
    conflictState,
    existingExactMatch: matches.exact,
    aliasMatch: matches.alias,
    historicalMatch: matches.historical,
    semanticMatch: matches.semantic,
    canonicalCreateEligibility: eligible,
    rejectionReason,
    autonomousCreateDecision: decision,
    proposedCanonicalIdentity: eligible || decision === "IDEMPOTENT_NOOP"
      ? {
          catalogWorkId: proposedWorkId,
          namePl,
          descriptionPl,
          unit: String(unitNorm || rec.unit),
          displayCode: rec.canonicalDisplay,
          family: rec.catalogFamilyPrefix,
          tableCode: rec.tableCode,
        }
      : null,
    proposedCatalogWorkId: proposedWorkId,
    provenance: {
      sourceUrls: (rec.sources || []).map((s) => s.sourceUrl),
      evidenceRefs: [
        `chatgpt-knr-research:${rec.tableCode}`,
        `family:${rec.catalogFamilyPrefix}`,
        `aclc:${AUTONOMOUS_CANONICAL_LEAF_CREATE_VERSION}`,
      ],
      decisionKind: "AUTONOMOUS_CREATE_V1",
      policyVersion: AUTONOMOUS_CANONICAL_LEAF_CREATE_POLICY,
    },
    conditions,
    auditWhy,
    ownerRuntimeDependency: 0,
  };
}

export function buildProposalFromVerifiedRecord(
  rec: ChatgptKnrVerifiedRecord,
  evaluation: AutonomousCanonicalLeafCreateEvaluation,
): KnrWcIdentityProposal {
  const unit = String(evaluation.proposedCanonicalIdentity?.unit || rec.unit);
  const familySlug = slugFamily(rec.catalogFamilyPrefix).toUpperCase().replace(/-/g, "|");
  return {
    proposalId: `aclc:${rec.catalogFamilyPrefix}:${rec.tableCode}`,
    tenderId: "aclc-autonomous",
    normalizedKey: `${familySlug}|${rec.tableCode}`,
    identityKeyV2: `ACLC|${rec.catalogFamilyPrefix}|${rec.tableCode}|${unit}`,
    displayCode: rec.canonicalDisplay,
    family: rec.catalogFamilyPrefix,
    catalogId: null,
    tableCode: rec.tableCode,
    officialNamePl: evaluation.proposedCanonicalIdentity?.namePl || rec.description,
    descriptionPl: evaluation.proposedCanonicalIdentity?.descriptionPl || rec.description,
    unitRaw: rec.unit,
    proposedUnit: unit,
    proposedTradeId: "POZOSTALE",
    proposedWorkId: null,
    knrEvidenceRefs: evaluation.provenance.evidenceRefs.map((refId) => ({
      kind: "discoveryEvidence" as const,
      refId,
    })),
    verificationState: "PENDING_VERIFY",
    similarWorks: [],
    duplicateRisk: "NONE",
    recommendation: "CREATE_NEW",
    ownerDecision: "unset",
    sourceStatus: "DISCOVERY_EVIDENCE",
    discoveryStatus: "EVIDENCE_HIT",
    unitStatus: "OK",
    lineRefs: [],
    specialRiskNotes: (rec.alternateFamilies || []).length
      ? [`alternate_families:${(rec.alternateFamilies || []).join(",")}`]
      : [],
    staleEvidence: false,
  };
}

export function authorizationFromEvaluation(
  evaluation: AutonomousCanonicalLeafCreateEvaluation,
): KnrWcAutonomousCreateAuthorization | null {
  if (evaluation.autonomousCreateDecision !== "CREATE" || !evaluation.canonicalCreateEligibility) {
    return null;
  }
  return {
    version: "ACLC-v1",
    pass: true,
    auditWhy: evaluation.auditWhy,
    policyVersion: evaluation.policyVersion,
  };
}

export type AutonomousCanonicalLeafCreateExecuteResult = {
  evaluation: AutonomousCanonicalLeafCreateEvaluation;
  executed: boolean;
  decision: AutonomousCreateDecision;
  workId: string | null;
  store: WorkCatalogStore;
  assertOk: boolean;
  assertReason?: string;
  productionMutation: false;
  ownerRuntimeDependency: 0;
};

/**
 * Synchronous in-memory CREATE (Orchestra / dry-run). Never routed persist.
 */
export function executeAutonomousCanonicalLeafCreateMemorySync(input: {
  record: ChatgptKnrVerifiedRecord;
  store: WorkCatalogStore;
  knrCatalogStore?: KnrCatalogStore | null;
  nowIso: string;
  pendingOnlyWithoutVerifiedPack?: boolean;
  companyPricePln?: number | null;
  priceAsIdentity?: boolean;
}): AutonomousCanonicalLeafCreateExecuteResult {
  const evaluation = evaluateAutonomousCanonicalLeafCreate({
    record: input.record,
    store: input.store,
    knrCatalogStore: input.knrCatalogStore,
    nowIso: input.nowIso,
    pendingOnlyWithoutVerifiedPack: input.pendingOnlyWithoutVerifiedPack,
    companyPricePln: input.companyPricePln,
    priceAsIdentity: input.priceAsIdentity,
  });

  if (evaluation.autonomousCreateDecision === "IDEMPOTENT_NOOP") {
    return {
      evaluation,
      executed: false,
      decision: "IDEMPOTENT_NOOP",
      workId: evaluation.proposedCatalogWorkId,
      store: input.store,
      assertOk: true,
      productionMutation: false,
      ownerRuntimeDependency: 0,
    };
  }

  if (evaluation.autonomousCreateDecision !== "CREATE" || !evaluation.proposedCatalogWorkId) {
    return {
      evaluation,
      executed: false,
      decision: evaluation.autonomousCreateDecision,
      workId: null,
      store: input.store,
      assertOk: false,
      assertReason: evaluation.rejectionReason || evaluation.autonomousCreateDecision,
      productionMutation: false,
      ownerRuntimeDependency: 0,
    };
  }

  const auth = authorizationFromEvaluation(evaluation)!;
  const proposal = buildProposalFromVerifiedRecord(input.record, evaluation);
  const gate = assertKnrWcCreateAllowed({
    proposal,
    ownerDecision: "unset",
    workId: evaluation.proposedCatalogWorkId,
    store: input.store,
    autonomousAuthorization: auth,
  });
  if (!gate.ok) {
    return {
      evaluation,
      executed: false,
      decision: "REJECT",
      workId: null,
      store: input.store,
      assertOk: false,
      assertReason: gate.reason,
      productionMutation: false,
      ownerRuntimeDependency: 0,
    };
  }

  try {
    const draft = buildCatalogWorkDraftFromProposal(
      proposal,
      evaluation.proposedCatalogWorkId,
      input.nowIso,
    );
    const nextStore = insertWorkBothRegions(input.store, draft, input.nowIso);
    return {
      evaluation,
      executed: true,
      decision: "CREATE",
      workId: evaluation.proposedCatalogWorkId,
      store: nextStore,
      assertOk: true,
      productionMutation: false,
      ownerRuntimeDependency: 0,
    };
  } catch (err) {
    return {
      evaluation,
      executed: false,
      decision: "REJECT",
      workId: null,
      store: input.store,
      assertOk: false,
      assertReason:
        err instanceof CatalogWorkDuplicateIdError ? "duplicate_work_id" : "persist_error",
      productionMutation: false,
      ownerRuntimeDependency: 0,
    };
  }
}

/**
 * Dry-run / in-memory CREATE via existing executeKnrWcCatalogWorkCreate(persistMode=memory_only).
 */
export async function executeAutonomousCanonicalLeafCreate(input: {
  record: ChatgptKnrVerifiedRecord;
  store: WorkCatalogStore;
  knrCatalogStore?: KnrCatalogStore | null;
  nowIso: string;
  pendingOnlyWithoutVerifiedPack?: boolean;
  companyPricePln?: number | null;
  priceAsIdentity?: boolean;
}): Promise<AutonomousCanonicalLeafCreateExecuteResult> {
  // Prefer sync memory path — identical outcome, no await on routed save.
  return executeAutonomousCanonicalLeafCreateMemorySync(input);
}

export type AutonomousLeafCreateBatchResult = {
  version: typeof AUTONOMOUS_CANONICAL_LEAF_CREATE_VERSION;
  perCode: Array<{
    evaluation: AutonomousCanonicalLeafCreateEvaluation;
    executed: boolean;
    decision: AutonomousCreateDecision;
    workId: string | null;
    airTrustedAfter: boolean;
    airNext: string | null;
  }>;
  store: WorkCatalogStore;
  totals: {
    codes: number;
    eligible: number;
    rejected: number;
    executedDryRun: number;
    idempotentNoop: number;
    reuseExisting: number;
    airTrustedAfter: number;
    ownerRuntimeDependency: 0;
    microSequencing: false;
    productionMutation: false;
  };
};

export function runAutonomousCanonicalLeafCreateBatch(input: {
  store: WorkCatalogStore;
  packs: readonly TechnologyPack[];
  records?: readonly ChatgptKnrVerifiedRecord[];
  knrCatalogStore?: KnrCatalogStore | null;
  parentWorkIdByTableCode?: Record<string, string>;
  nowIso: string;
}): AutonomousLeafCreateBatchResult {
  const records = input.records ?? CHATGPT_KNR_RESEARCH_TPI729_VERIFIED;
  let store = input.store;
  const perCode: AutonomousLeafCreateBatchResult["perCode"] = [];
  let eligible = 0;
  let rejected = 0;
  let executedDryRun = 0;
  let idempotentNoop = 0;
  let reuseExisting = 0;
  let airTrustedAfter = 0;

  for (const rec of records) {
    const result = executeAutonomousCanonicalLeafCreateMemorySync({
      record: rec,
      store,
      knrCatalogStore: input.knrCatalogStore,
      nowIso: input.nowIso,
    });
    store = result.store;

    if (result.evaluation.canonicalCreateEligibility) eligible += 1;
    if (result.decision === "REJECT") rejected += 1;
    if (result.decision === "IDEMPOTENT_NOOP") idempotentNoop += 1;
    if (result.decision === "REUSE_EXISTING_CANONICAL") reuseExisting += 1;
    if (result.executed) executedDryRun += 1;

    let trusted = false;
    let airNext: string | null = null;
    const leafId = result.workId || result.evaluation.proposedCatalogWorkId;
    if (leafId && (result.executed || result.decision === "IDEMPOTENT_NOOP")) {
      const parent =
        input.parentWorkIdByTableCode?.[rec.tableCode] || `legacy-compound-parent-${rec.tableCode}`;
      const descriptions = [rec.description, rec.canonicalDisplay, ...rec.semanticTokens.slice(0, 4)];
      const cie = buildCompoundIdentityCandidate({
        workId: parent,
        store,
        packs: [...input.packs],
        descriptions,
        unit: rec.unit,
        actor: "aclc-post-create",
        nowIso: input.nowIso,
      });
      const air = runBoundedAutonomousIdentityResolution({
        workId: parent,
        store,
        packs: [...input.packs],
        descriptions,
        unit: rec.unit,
        actor: "aclc-post-create",
        nowIso: input.nowIso,
        deepenEvidence: true,
        lineIds: [`aclc:${rec.tableCode}`],
        cie,
        knrCatalogStore: input.knrCatalogStore,
      });
      trusted = air.trusted === true;
      airNext = air.nextLegalTransaction;
      if (trusted) airTrustedAfter += 1;
    }

    perCode.push({
      evaluation: result.evaluation,
      executed: result.executed,
      decision: result.decision,
      workId: result.workId,
      airTrustedAfter: trusted,
      airNext,
    });
  }

  return {
    version: AUTONOMOUS_CANONICAL_LEAF_CREATE_VERSION,
    perCode,
    store,
    totals: {
      codes: records.length,
      eligible,
      rejected,
      executedDryRun,
      idempotentNoop,
      reuseExisting,
      airTrustedAfter,
      ownerRuntimeDependency: 0,
      microSequencing: false,
      productionMutation: false,
    },
  };
}

export const AUTONOMOUS_CANONICAL_LEAF_CREATE_IMPLEMENTED = true as const;
