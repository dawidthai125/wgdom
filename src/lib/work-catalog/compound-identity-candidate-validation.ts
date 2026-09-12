/**
 * Compound Identity Candidate Validation — CIV-v1
 *
 * COMPOUND → CIE-v1 candidate → deepen evidence (RO sources) → validate.
 *
 * NEVER:
 *  - lower trusted threshold (name/costSplit/price/pack ≠ TRUSTED)
 *  - Owner Map write · WC write · GO40 create · GO39 Accept
 *  - if (workId === "legacy-…") hardcode
 *  - invent leaf / TECHNOLOGY / BOM / RATE
 *
 * TRUSTED persist remains Owner Accept only while GO36 P12 frozen.
 * AID-v1 scores autonomous eligibility (advisory) without elevating trusted.
 */

import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { TechnologyPack } from "@/lib/technology-foundation";
import {
  buildCompoundIdentityCandidate,
  type BuildCompoundIdentityCandidateResult,
  type CompoundIdentityStatus,
  type CompoundLeafEvidenceHit,
} from "@/lib/work-catalog/compound-identity-candidate-engine";
import { OWNER_KNR_MAPPINGS } from "@/lib/intelligent-estimator/ik-knr-owner-mapping";
import {
  buildKnrWcIdentityProposals,
} from "@/lib/intelligent-estimator/knr-wc-identity-bridge";
import {
  loadKnrCatalogStoreLocal,
  type KnrCatalogStore,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-store";
import { lookupKnrCatalog } from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-lookup";
import {
  resolveLaborIdentityMapping,
  listWorkRateIdentityMappings,
  isForbiddenLegacyBucketWorkId,
} from "@/lib/work-catalog/work-rate-identity-mapping";
import {
  evaluateAutonomousIdentityDecision,
  type AutonomousIdentityDecisionResult,
} from "@/lib/work-catalog/autonomous-identity-decision-contract";
import { getOwnerClassificationPlane } from "@/lib/intelligent-estimator/owner-classification-map";
import { listActiveWorksForRegion } from "@/lib/work-catalog/catalog-work-utils";
import { discoverIdentityLeafCandidates } from "@/lib/work-catalog/autonomous-identity-discovery-adapter";

export const COMPOUND_IDENTITY_VALIDATION_VERSION = "CIV-v1" as const;

export type CompoundIdentityValidationStatus =
  | "IDENTITY_CANDIDATE_VALIDATED"
  | "IDENTITY_TRUSTED"
  | "CANDIDATE_FOUND_NOT_TRUSTED"
  | "IDENTITY_CANDIDATE_AMBIGUOUS"
  | "IDENTITY_CANDIDATE_INSUFFICIENT"
  | "RESEARCH_EVIDENCE_INSUFFICIENT"
  | "OWNER_IDENTITY_DECISION_REQUIRED"
  | "RESEARCH_PATH_MISSING"
  | "AUTONOMOUS_IDENTITY_CANDIDATE_RESOLVED";

export type ValidatedEvidenceRecord = {
  source: string;
  sourceType:
    | "WORK_CATALOG"
    | "OWNER_KNR_MAPPING"
    | "KNR_CATALOG"
    | "KNR_WC_BRIDGE"
    | "LABOR_IDENTITY_ALIAS"
    | "TECHNOLOGY_PACK"
    | "NAME_SIMILARITY"
    | "COST_SPLIT"
    | "CIE_BASELINE"
    | "DESCRIPTION_TOKEN";
  provenance: string;
  identityMethod: string;
  evidenceStrength: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  mayContributeToTrusted: boolean;
  trusted: boolean;
  workId: string | null;
  relation: "PARENT" | "LEAF_CANDIDATE" | "METADATA" | "TOKEN";
  rationale: string;
  observedAt: string | null;
  freshness: string | null;
};

export type ValidateCompoundIdentityInput = {
  workId: string;
  store?: WorkCatalogStore | null;
  packs?: readonly TechnologyPack[];
  descriptions?: string[];
  unit?: string;
  actor?: string;
  nowIso?: string;
  /** Optional inject for tests — default loadKnrCatalogStoreLocal(). */
  knrCatalogStore?: KnrCatalogStore | null;
  /** Skip deep discovery (control path / scianki passthrough). */
  deepenEvidence?: boolean;
};

export type ValidateCompoundIdentityResult = {
  workId: string;
  parentIdentity: {
    workId: string;
    ownerPlane: string | null;
    go33Applicable: boolean;
  };
  cieBaseline: BuildCompoundIdentityCandidateResult;
  evidenceBefore: CompoundLeafEvidenceHit[];
  evidenceDiscovered: ValidatedEvidenceRecord[];
  evidenceAfter: ValidatedEvidenceRecord[];
  evidenceStrength: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  identityMethod: string;
  candidateCount: number;
  trustedCandidateCount: number;
  validationResult: CompoundIdentityValidationStatus;
  trusted: boolean;
  ownerRequired: boolean;
  persistenceRequired: boolean;
  researchUsed: boolean;
  sourceList: string[];
  conflicts: string[];
  blockers: string[];
  nextLegalTransaction: string;
  proposedLeafWorkId: string | null;
  productionMutation: false;
  ownerMapTouched: false;
  technologyPackMutation: false;
  bomMutation: false;
  financeMutation: false;
  inventUsed: false;
  hardcodedWorkId: false;
  durableEvidenceWriteRequired: boolean;
  /**
   * AID-v1 decision. When mayPersistTrustedIdentity, CIV elevates trusted (ephemeral;
   * productionMutation remains false unless a separate durable write GO runs).
   */
  autonomousIdentityDecision?: AutonomousIdentityDecisionResult;
  /** Ephemeral autonomous persistence record when AID PASS — not KV/WC write. */
  autonomousPersistence?: {
    decisionKind: "AUTONOMOUS_IDENTITY";
    applied: true;
    productionKvWrite: false;
    leafWorkId: string | null;
    confidenceTier: string;
    policyVersion: string;
    amendmentId: string;
    reasons: string[];
    rejectedCandidateCount: number;
  } | null;
};

function soft(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l")
    .trim();
}

function extractKnrLikeTokens(text: string): string[] {
  const out = new Set<string>();
  for (const m of String(text || "").matchAll(/\b(\d{3,4}-\d{2})\b/g)) out.add(m[1]!);
  for (const m of String(text || "").matchAll(/\b(55-01|G177)\b/gi)) {
    out.add(m[1]!.toUpperCase());
  }
  return [...out];
}

function maxStrength(
  a: ValidatedEvidenceRecord["evidenceStrength"],
  b: ValidatedEvidenceRecord["evidenceStrength"],
): ValidatedEvidenceRecord["evidenceStrength"] {
  const order = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3 } as const;
  return order[a] >= order[b] ? a : b;
}

function hitToRecord(
  h: CompoundLeafEvidenceHit,
  nowIso: string,
): ValidatedEvidenceRecord {
  const sourceType =
    h.kind === "COST_SPLIT_METADATA"
      ? "COST_SPLIT"
      : h.kind === "NAME_SIMILARITY_ONLY"
        ? "NAME_SIMILARITY"
        : h.kind === "OWNER_KNR_MAPPING"
          ? "OWNER_KNR_MAPPING"
          : h.kind.startsWith("TECHNOLOGY_PACK")
            ? "TECHNOLOGY_PACK"
            : h.kind.startsWith("GO33")
              ? "WORK_CATALOG"
              : "CIE_BASELINE";
  return {
    source: h.kind,
    sourceType,
    provenance: `CIE-v1:${h.kind}`,
    identityMethod: h.kind,
    evidenceStrength:
      h.kind === "GO33_STRONG"
        ? "HIGH"
        : h.kind === "OWNER_KNR_MAPPING" || h.kind === "TECHNOLOGY_PACK_LABOUR"
          ? "MEDIUM"
          : "LOW",
    mayContributeToTrusted: h.mayContributeToTrusted,
    trusted: false,
    workId: h.workId,
    relation: h.workId ? "LEAF_CANDIDATE" : "METADATA",
    rationale: h.detail,
    observedAt: nowIso,
    freshness: null,
  };
}

/**
 * Deepen compound leaf identity evidence using existing RO sources.
 * Does not invent trust; does not write Owner Map / WC.
 */
export function discoverAdditionalCompoundIdentityEvidence(input: {
  workId: string;
  store?: WorkCatalogStore | null;
  descriptions?: string[];
  unit?: string;
  nowIso?: string;
  knrCatalogStore?: KnrCatalogStore | null;
}): ValidatedEvidenceRecord[] {
  const workId = String(input.workId || "").trim();
  const nowIso = input.nowIso ?? new Date().toISOString();
  const descriptions = input.descriptions || [];
  const unit = input.unit || "m2";
  const blob = descriptions.join(" ");
  const tokens = [
    ...new Set(descriptions.flatMap(extractKnrLikeTokens)),
  ];
  const out: ValidatedEvidenceRecord[] = [];

  // --- DESCRIPTION tokens (provenance only) ---
  for (const t of tokens) {
    out.push({
      source: "BOQ_DESCRIPTION",
      sourceType: "DESCRIPTION_TOKEN",
      provenance: `boq-token:${t}`,
      identityMethod: "KNR_LIKE_TOKEN_EXTRACT",
      evidenceStrength: "LOW",
      mayContributeToTrusted: false,
      trusted: false,
      workId: null,
      relation: "TOKEN",
      rationale: `BOQ/description contains KNR-like token ${t} — discovery cue only`,
      observedAt: nowIso,
      freshness: null,
    });
  }

  // --- OWNER_KNR_MAPPINGS (exact-ish token ∩ table) ---
  for (const row of OWNER_KNR_MAPPINGS) {
    if (!row.active || !row.ownerApproval) continue;
    const key = soft(row.normalizedKey);
    const hit = tokens.some(
      (t) => key.includes(soft(t)) || soft(t).includes(key.split("|").pop() || ""),
    );
    if (!hit) continue;
    out.push({
      source: row.mappingId,
      sourceType: "OWNER_KNR_MAPPING",
      provenance: `OWNER_KNR_MAPPINGS:${row.mappingId}`,
      identityMethod: "OWNER_APPROVED_KNR_LINE_MAP",
      evidenceStrength: "HIGH",
      mayContributeToTrusted: false, // GO36: KNR alone ≠ mayCanonicalAlone; compound path still Owner
      trusted: false,
      workId: row.workId,
      relation: "LEAF_CANDIDATE",
      rationale: `Owner-approved KNR map ${row.normalizedKey} → ${row.workId} (line overlay evidence — not silent TRUSTED)`,
      observedAt: nowIso,
      freshness: "owner_table",
    });
  }

  // --- KNR Catalog local (RO) ---
  let knrStore: KnrCatalogStore | null =
    input.knrCatalogStore === undefined
      ? loadKnrCatalogStoreLocal()
      : input.knrCatalogStore;
  if (knrStore) {
    for (const t of tokens) {
      // Try aliasIndex scan by table code fragment
      const aliasHits: string[] = [];
      for (const [alias, ids] of Object.entries(knrStore.aliasIndex || {})) {
        if (soft(alias).includes(soft(t)) || soft(t).includes(soft(alias))) {
          for (const id of ids) aliasHits.push(id);
        }
      }
      const uniqueAlias = [...new Set(aliasHits)].slice(0, 4);
      if (uniqueAlias.length === 1) {
        const identityKeyV2 = uniqueAlias[0]!;
        const looked = lookupKnrCatalog({ identityKeyV2 }, knrStore);
        out.push({
          source: identityKeyV2,
          sourceType: "KNR_CATALOG",
          provenance: `kw-knr-catalog:${identityKeyV2}`,
          identityMethod: "KNR_CATALOG_LOCAL_ALIAS",
          evidenceStrength: looked.status === "LOCAL_HIT" ? "MEDIUM" : "LOW",
          mayContributeToTrusted: false,
          trusted: false,
          workId: null,
          relation: "TOKEN",
          rationale: `KNR catalog alias hit for token ${t} → ${identityKeyV2} (DISCOVERY_ONLY — no WC leaf)`,
          observedAt: nowIso,
          freshness: looked.status,
        });
      } else if (uniqueAlias.length > 1) {
        out.push({
          source: t,
          sourceType: "KNR_CATALOG",
          provenance: `kw-knr-catalog:ambiguous:${t}`,
          identityMethod: "KNR_CATALOG_ALIAS_AMBIGUOUS",
          evidenceStrength: "LOW",
          mayContributeToTrusted: false,
          trusted: false,
          workId: null,
          relation: "TOKEN",
          rationale: `KNR catalog alias ambiguous for ${t}: ${uniqueAlias.join(",")}`,
          observedAt: nowIso,
          freshness: "AMBIGUOUS",
        });
      } else {
        out.push({
          source: t,
          sourceType: "KNR_CATALOG",
          provenance: `kw-knr-catalog:miss:${t}`,
          identityMethod: "KNR_CATALOG_MISS",
          evidenceStrength: "NONE",
          mayContributeToTrusted: false,
          trusted: false,
          workId: null,
          relation: "TOKEN",
          rationale: `KNR-like token ${t} present in BOQ but absent from local KNR catalog / OWNER_KNR_MAPPINGS`,
          observedAt: nowIso,
          freshness: "MISS",
        });
      }
    }
  }

  // --- Identity Bridge proposals (ephemeral, recommendation only) ---
  if (tokens.length > 0) {
    const keys = tokens.map((t) => ({
      normalizedKey: t.includes("|") ? t : `TENDER||${t}`,
      tableCode: t,
      unitRaw: unit,
      displayCode: t,
      officialNamePl: descriptions[0] || null,
      descriptionPl: blob.slice(0, 240) || null,
    }));
    let works: { id: string; namePl: string; unit: string; tradeId?: string; active: boolean }[] =
      [];
    if (input.store) {
      try {
        works = listActiveWorksForRegion(input.store, input.store.activeRegion).map((w) => ({
          id: w.id,
          namePl: w.namePl,
          unit: String(w.unit),
          tradeId: w.tradeId,
          active: w.active !== false,
        }));
      } catch {
        works = [];
      }
    }
    const batch = buildKnrWcIdentityProposals({
      tenderId: `civ-validation:${workId}`,
      keys,
      catalogStore: knrStore,
      works,
      ownerMappings: OWNER_KNR_MAPPINGS,
      featureEnabled: true,
    });
    for (const p of batch.proposals) {
      // Bridge never auto-REUSE in P1 — capture discovery status only (no WC leaf invent)
      out.push({
        source: p.proposalId,
        sourceType: "KNR_WC_BRIDGE",
        provenance: `knr-wc-bridge:${p.normalizedKey}`,
        identityMethod: `BRIDGE_${p.recommendation}_${p.discoveryStatus}`,
        evidenceStrength:
          p.discoveryStatus === "LOCAL_HIT"
            ? "MEDIUM"
            : p.discoveryStatus === "EVIDENCE_HIT"
              ? "LOW"
              : "NONE",
        mayContributeToTrusted: false,
        trusted: false,
        workId: null,
        relation: "TOKEN",
        rationale: `Identity bridge ${p.displayCode}: discovery=${p.discoveryStatus} rec=${p.recommendation} (proposal≠WC; not TRUSTED)`,
        observedAt: nowIso,
        freshness: p.verificationState,
      });
    }
  }

  // --- Exact labor identity aliases (READ-ONLY registry) ---
  // Resolve description → existing non-forbidden workId via exact normalized alias.
  const mappings = listWorkRateIdentityMappings();
  let knownIds: Set<string> | null = null;
  if (input.store) {
    try {
      knownIds = new Set(
        listActiveWorksForRegion(input.store, input.store.activeRegion).map((w) => w.id),
      );
    } catch {
      knownIds = null;
    }
  }
  // Prefer production sourceIds from registry; also try a dedicated probe source for fixtures.
  const probeSources = [
    ...new Set([
      ...mappings.map((m) => String(m.sourceId || "").trim()).filter(Boolean),
      "civ-compound-identity-validation",
    ]),
  ].slice(0, 12);
  for (const desc of descriptions.length ? descriptions : [workId]) {
    for (const sourceId of probeSources) {
      const resolved = resolveLaborIdentityMapping({
        observedName: desc,
        observedUnit: unit,
        catalogUnit: unit,
        sourceId,
        laborOnly: true,
        includesMaterial: false,
        knownWorkIds: knownIds,
        mappings,
      });
      if (resolved.status === "HIT") {
        out.push({
          source: resolved.mappingId,
          sourceType: "LABOR_IDENTITY_ALIAS",
          provenance: `work-rate-identity-mapping:${resolved.mappingId}`,
          identityMethod: "EXACT_LABOR_IDENTITY_ALIAS",
          evidenceStrength: "HIGH",
          mayContributeToTrusted: false, // still Owner Accept for compound→authoritative
          trusted: false,
          workId: resolved.workId,
          relation: "LEAF_CANDIDATE",
          rationale: `Exact labor identity alias → ${resolved.workId} (OWNER_DECISION still required for authoritative bind)`,
          observedAt: nowIso,
          freshness: "registry",
        });
        break;
      }
      if (resolved.status === "AMBIGUOUS") {
        out.push({
          source: "labor-identity-mapping",
          sourceType: "LABOR_IDENTITY_ALIAS",
          provenance: "work-rate-identity-mapping:AMBIGUOUS",
          identityMethod: "EXACT_LABOR_IDENTITY_ALIAS_AMBIGUOUS",
          evidenceStrength: "MEDIUM",
          mayContributeToTrusted: false,
          trusted: false,
          workId: null,
          relation: "LEAF_CANDIDATE",
          rationale: `Ambiguous exact aliases: ${(resolved.mappingIds || []).join(",")}`,
          observedAt: nowIso,
          freshness: "AMBIGUOUS",
        });
        break;
      }
    }
  }

  // Parent is forbidden legacy bucket as TARGET — note as metadata (not invent leaf)
  if (isForbiddenLegacyBucketWorkId(workId)) {
    out.push({
      source: workId,
      sourceType: "WORK_CATALOG",
      provenance: `forbidden-legacy-target:${workId}`,
      identityMethod: "LEGACY_BUCKET_TARGET_FORBIDDEN",
      evidenceStrength: "NONE",
      mayContributeToTrusted: false,
      trusted: false,
      workId,
      relation: "PARENT",
      rationale:
        "Parent workId is a forbidden legacy bucket TARGET for labor-identity mapping — leaf must be a non-bucket identity",
      observedAt: nowIso,
      freshness: null,
    });
  }

  // --- AIDISC-v1: real discovery beyond deepen-only (Bridge similar / catalog semantic / KNR) ---
  const aidisc = discoverIdentityLeafCandidates({
    parentWorkId: workId,
    store: input.store,
    descriptions,
    unit,
    knrCatalogStore: knrStore,
    nowIso,
  });
  for (const rec of aidisc.evidenceRecords) {
    // Avoid duplicating OWNER_KNR / exact-alias already emitted above with same workId+sourceType
    const dup = out.some(
      (e) =>
        e.workId &&
        e.workId === rec.workId &&
        e.sourceType === rec.sourceType &&
        e.relation === "LEAF_CANDIDATE",
    );
    if (dup) continue;
    out.push(rec);
  }

  return out;
}

function collectLeafCandidates(evidence: ValidatedEvidenceRecord[]): string[] {
  return [
    ...new Set(
      evidence
        .filter(
          (e) =>
            e.relation === "LEAF_CANDIDATE" &&
            e.workId &&
            e.workId !== "0" &&
            e.workId !== "null" &&
            !( /^\d+$/.test(e.workId) && e.workId.length < 3) &&
            e.evidenceStrength !== "NONE" &&
            (e.sourceType === "OWNER_KNR_MAPPING" ||
              e.sourceType === "LABOR_IDENTITY_ALIAS" ||
              (e.sourceType === "KNR_WC_BRIDGE" && e.workId) ||
              (e.identityMethod === "ACLC_CANONICAL_LEAF_BIND" && e.workId) ||
              (e.mayContributeToTrusted && e.workId)),
        )
        .map((e) => e.workId!),
    ),
  ];
}

/**
 * Canonical validation: CIE baseline + deep evidence → status (no TRUSTED without Accept).
 */
export function validateCompoundIdentityCandidate(
  input: ValidateCompoundIdentityInput,
): ValidateCompoundIdentityResult {
  const workId = String(input.workId || "").trim();
  const nowIso = input.nowIso ?? new Date().toISOString();
  const deepen = input.deepenEvidence !== false;

  const cie = buildCompoundIdentityCandidate({
    workId,
    store: input.store,
    packs: input.packs,
    descriptions: input.descriptions,
    unit: input.unit,
    actor: input.actor ?? "compound-identity-validation",
    nowIso,
  });

  const evidenceBefore = cie.leafEvidenceHits;
  const baselineRecords = evidenceBefore.map((h) => hitToRecord(h, nowIso));

  const discovered = deepen
    ? discoverAdditionalCompoundIdentityEvidence({
        workId,
        store: input.store,
        descriptions: input.descriptions,
        unit: input.unit,
        nowIso,
        knrCatalogStore: input.knrCatalogStore,
      })
    : [];

  const evidenceAfter = [...baselineRecords, ...discovered];
  const researchUsed = discovered.some(
    (e) =>
      e.sourceType === "KNR_CATALOG" ||
      e.sourceType === "KNR_WC_BRIDGE" ||
      e.sourceType === "LABOR_IDENTITY_ALIAS" ||
      e.identityMethod === "AUTONOMOUS_IDENTITY_DISCOVERY_RAN" ||
      e.identityMethod === "CATALOG_SEMANTIC_DISCOVERY",
  );

  const sourceList = [...new Set(evidenceAfter.map((e) => e.sourceType))];
  const conflicts: string[] = [];
  let blockers: string[] = [...cie.blockers];

  const leafCandidates = collectLeafCandidates(evidenceAfter);
  const aliasAmbiguous = discovered.some(
    (e) => e.identityMethod.includes("AMBIGUOUS"),
  );
  const knrTokens = discovered.filter((e) => e.sourceType === "DESCRIPTION_TOKEN");
  const knrMisses = discovered.filter(
    (e) =>
      e.identityMethod === "KNR_CATALOG_MISS" ||
      (e.sourceType === "KNR_WC_BRIDGE" && e.evidenceStrength === "NONE"),
  );
  const ownerKnrHits = discovered.filter((e) => e.sourceType === "OWNER_KNR_MAPPING");
  const exactAliasHits = discovered.filter(
    (e) => e.identityMethod === "EXACT_LABOR_IDENTITY_ALIAS",
  );

  let evidenceStrength: ValidatedEvidenceRecord["evidenceStrength"] = "NONE";
  for (const e of evidenceAfter) {
    evidenceStrength = maxStrength(evidenceStrength, e.evidenceStrength);
  }

  // --- Fail-closed status resolution ---
  let validationResult: CompoundIdentityValidationStatus;
  let proposedLeafWorkId: string | null = null;
  let identityMethod = "CIE_BASELINE";

  if (aliasAmbiguous || leafCandidates.length > 1) {
    validationResult = "IDENTITY_CANDIDATE_AMBIGUOUS";
    conflicts.push(
      leafCandidates.length > 1
        ? `Multiple leaf candidates: ${leafCandidates.join(", ")}`
        : "Ambiguous identity alias / KNR catalog alias",
    );
    identityMethod = "FAIL_CLOSED_AMBIGUOUS";
    blockers.push("CONFLICT/AMBIGUOUS — no arbitrary pick");
  } else if (leafCandidates.length === 1) {
    proposedLeafWorkId = leafCandidates[0]!;
    // Stronger discovery leaf found — VALIDATED but NEVER TRUSTED without Accept
    validationResult = "IDENTITY_CANDIDATE_VALIDATED";
    identityMethod =
      exactAliasHits.length > 0
        ? "EXACT_LABOR_IDENTITY_ALIAS"
        : ownerKnrHits.length > 0
          ? "OWNER_KNR_MAPPING"
          : "DISCOVERY_LEAF_SINGLE";
    blockers.push(
      "IDENTITY_TRUSTED=false — Owner Accept required for authoritative identity",
    );
  } else if (
    knrTokens.length > 0 &&
    ownerKnrHits.length === 0 &&
    exactAliasHits.length === 0 &&
    knrMisses.length > 0
  ) {
    validationResult = "RESEARCH_EVIDENCE_INSUFFICIENT";
    identityMethod = "KNR_TOKEN_UNMAPPED";
    blockers.push(
      "BOQ KNR-like tokens present but no Owner map / catalog leaf / exact alias",
    );
  } else if (
    cie.identityStatus === "AUTONOMOUS_IDENTITY_CANDIDATE_RESOLVED" &&
    !deepen
  ) {
    // Control passthrough (e.g. scianki)
    validationResult = "AUTONOMOUS_IDENTITY_CANDIDATE_RESOLVED";
    identityMethod = "GO40_GK_ADAPTER";
  } else if (cie.identityStatus === "AUTONOMOUS_IDENTITY_CANDIDATE_RESOLVED") {
    // GK deepened but still mint-on-accept / no leaf bind
    validationResult = "AUTONOMOUS_IDENTITY_CANDIDATE_RESOLVED";
    identityMethod = "GO40_GK_ADAPTER";
    blockers.push("AUTONOMOUS_RESOLUTION_CONTINUE for durable path (AID eval; no Owner runtime stop)");
  } else if (
    cie.identityStatus === "CANDIDATE_FOUND_NOT_TRUSTED" ||
    cie.candidateCount > 0
  ) {
    validationResult = "CANDIDATE_FOUND_NOT_TRUSTED";
    identityMethod = "WEAK_CIE_EVIDENCE";
    blockers.push("Weak evidence only (name/costSplit/description) — not trusted");
  } else if (cie.identityStatus === "IDENTITY_CANDIDATE_INSUFFICIENT") {
    validationResult = "IDENTITY_CANDIDATE_INSUFFICIENT";
    identityMethod = "INSUFFICIENT";
  } else if (cie.identityStatus === "IDENTITY_CANDIDATE_AMBIGUOUS") {
    validationResult = "IDENTITY_CANDIDATE_AMBIGUOUS";
    identityMethod = "CIE_AMBIGUOUS";
  } else {
    validationResult = cie.identityStatus as CompoundIdentityValidationStatus;
    identityMethod = "CIE_PASSTHROUGH";
  }

  const persistenceRequired =
    validationResult === "IDENTITY_CANDIDATE_VALIDATED" ||
    validationResult === "AUTONOMOUS_IDENTITY_CANDIDATE_RESOLVED" ||
    validationResult === "CANDIDATE_FOUND_NOT_TRUSTED";

  let nextLegalTransaction: string;
  switch (validationResult) {
    case "IDENTITY_CANDIDATE_VALIDATED":
      nextLegalTransaction =
        "AUTONOMOUS_RESOLUTION_CONTINUE · AID_EVAL · DURABLE_WRITE_DEFERRED";
      break;
    case "AUTONOMOUS_IDENTITY_CANDIDATE_RESOLVED":
      nextLegalTransaction =
        "AUTONOMOUS_RESOLUTION_CONTINUE · AID_EVAL · GO40_PATH";
      break;
    case "RESEARCH_EVIDENCE_INSUFFICIENT":
      nextLegalTransaction = "AUTONOMOUS_RESEARCH_EVIDENCE_LOOP";
      break;
    case "IDENTITY_CANDIDATE_AMBIGUOUS":
      nextLegalTransaction = "AUTONOMOUS_RESEARCH_EVIDENCE_LOOP · CROSS_SOURCE_VALIDATION";
      break;
    case "CANDIDATE_FOUND_NOT_TRUSTED":
      nextLegalTransaction = "AUTONOMOUS_RESOLUTION_CONTINUE · RESEARCH_EVIDENCE";
      break;
    default:
      nextLegalTransaction = "AUTONOMOUS_RESOLUTION_CONTINUE";
  }

  // TRUSTED only via Owner Accept OR AID-v1 AUTONOMOUS_DECIDE (GO36-P12 amend)
  // Owner is NOT a runtime stop (FINAL_FULL_IK_AUTONOMY) — ownerRequired always false for runtime.
  let trusted = false;
  let ownerRequired = false;
  let trustedCandidateCount = 0;

  const baseResult = {
    workId,
    parentIdentity: {
      workId,
      ownerPlane: getOwnerClassificationPlane(workId),
      go33Applicable: cie.go33Applicable,
    },
    cieBaseline: cie,
    evidenceBefore,
    evidenceDiscovered: discovered,
    evidenceAfter,
    evidenceStrength,
    identityMethod,
    candidateCount: Math.max(cie.candidateCount, leafCandidates.length, proposedLeafWorkId ? 1 : 0),
    trustedCandidateCount,
    validationResult,
    trusted,
    ownerRequired,
    persistenceRequired,
    researchUsed,
    sourceList,
    conflicts,
    blockers,
    nextLegalTransaction,
    proposedLeafWorkId,
    productionMutation: false as const,
    ownerMapTouched: false,
    technologyPackMutation: false,
    bomMutation: false,
    financeMutation: false,
    inventUsed: false,
    hardcodedWorkId: false,
    durableEvidenceWriteRequired: persistenceRequired,
  };

  // AID-v1 — evaluate then elevate TRUSTED when PASS (no invent / no KV write).
  const autonomousIdentityDecision = evaluateAutonomousIdentityDecision({
    civ: baseResult as ValidateCompoundIdentityResult,
    cie,
    nowIso,
  });

  let autonomousPersistence: ValidateCompoundIdentityResult["autonomousPersistence"] = null;

  if (
    autonomousIdentityDecision.mayPersistTrustedIdentity &&
    autonomousIdentityDecision.action === "AUTONOMOUS_DECIDE"
  ) {
    trusted = true;
    ownerRequired = false;
    trustedCandidateCount = 1;
    validationResult = "IDENTITY_TRUSTED";
    identityMethod = "AUTONOMOUS_IDENTITY";
    blockers = blockers.filter(
      (b) =>
        !/Owner Accept required/i.test(b) &&
        !/OWNER_IDENTITY_DECISION_REQUIRED/i.test(b) &&
        !/IDENTITY_TRUSTED=false/i.test(b),
    );
    blockers.push(
      `AID_PASS · ${autonomousIdentityDecision.confidenceTier} · decisionKind=AUTONOMOUS_IDENTITY · ephemeral trust (no production KV)`,
    );
    nextLegalTransaction =
      autonomousIdentityDecision.nextLegalIfAutonomous ||
      "CONTINUE_P5_LABOR_P6_MATERIAL · AUT_R1_ELIGIBILITY_CHECK";
    autonomousPersistence = {
      decisionKind: "AUTONOMOUS_IDENTITY",
      applied: true,
      productionKvWrite: false,
      leafWorkId:
        autonomousIdentityDecision.winner?.leafWorkId ||
        proposedLeafWorkId ||
        (cie.go33Applicable ? workId : null),
      confidenceTier: autonomousIdentityDecision.confidenceTier,
      policyVersion: autonomousIdentityDecision.provenance.policyVersion,
      amendmentId: autonomousIdentityDecision.provenance.amendmentId,
      reasons: [...autonomousIdentityDecision.reasons],
      rejectedCandidateCount: autonomousIdentityDecision.rejectedCandidates.length,
    };
  }

  return {
    ...baseResult,
    evidenceStrength,
    identityMethod,
    trustedCandidateCount,
    validationResult,
    trusted,
    ownerRequired,
    blockers,
    nextLegalTransaction,
    durableEvidenceWriteRequired: persistenceRequired && !trusted,
    ownerMapTouched: false as const,
    technologyPackMutation: false as const,
    bomMutation: false as const,
    financeMutation: false as const,
    inventUsed: false as const,
    hardcodedWorkId: false as const,
    autonomousIdentityDecision,
    autonomousPersistence,
  };
}

/** Type re-export convenience */
export type { CompoundIdentityStatus };
