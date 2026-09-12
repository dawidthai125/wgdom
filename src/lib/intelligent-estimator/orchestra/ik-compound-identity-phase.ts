/**
 * Orchestra compound/identity phase — CIE-v1 + CIV-v1 + AIR-v2 (+ AIDISC discovery).
 *
 * Runs AFTER Classification for COMPOUND / UNKNOWN / selected legacy LABOR·MATERIAL parents.
 * Does NOT: Accept · WC write · GO39 · Pack · Rate · Finance · G3.
 * Does NOT bypass GO33 applicability (CIE routes GO33 vs general).
 *
 * Identity Bridge + AIDISC-v1 are consumed inside CIV deepen (read-only candidates).
 */

import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { TechnologyPack } from "@/lib/technology-foundation";
import {
  buildCompoundIdentityCandidate,
  type BuildCompoundIdentityCandidateResult,
} from "@/lib/work-catalog/compound-identity-candidate-engine";
import {
  validateCompoundIdentityCandidate,
  type ValidateCompoundIdentityResult,
  type CompoundIdentityValidationStatus,
} from "@/lib/work-catalog/compound-identity-candidate-validation";
import type { IkClassificationReport } from "@/lib/intelligent-estimator/ik-classification";
import { ensureBaselineTechnologyPacksRegistered } from "@/lib/technology-foundation/ensure-baseline-technology-packs";
import { listAllPacks } from "@/lib/technology-foundation";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import {
  AIR_RUNTIME,
  runBoundedAutonomousIdentityResolution,
  type AutonomousResolutionQueueItem,
} from "@/lib/work-catalog/autonomous-identity-resolution-v2";
import { executeAutonomousCanonicalLeafCreateMemorySync } from "@/lib/work-catalog/autonomous-canonical-leaf-create";
import { normalizeWorkRateUnitToken } from "@/lib/work-catalog/work-rate-qualify";

function unitCompatibleLoose(a: string, b: string): boolean {
  const x = normalizeWorkRateUnitToken(a);
  const y = normalizeWorkRateUnitToken(b);
  if (x && y) return x === y;
  return softDesc(a).toLowerCase() === softDesc(b).toLowerCase();
}

export const IK_COMPOUND_IDENTITY_PHASE_VERSION = "ORCH-CIE-CIV-AIR-v2" as const;

export type IkCompoundIdentityParentResult = {
  parentWorkId: string;
  lineIds: string[];
  lineCount: number;
  descriptions: string[];
  unit: string;
  cie: BuildCompoundIdentityCandidateResult;
  civ: ValidateCompoundIdentityResult;
  validationResult: CompoundIdentityValidationStatus;
  trusted: boolean;
  /** @deprecated Owner is not runtime stop — kept for UI correction hint only */
  ownerRequired: boolean;
  nextLegalTransaction: string;
  go33Applicable: boolean;
  identityBridgeUsed: boolean;
  autonomousIdentityDecision: import("@/lib/work-catalog/autonomous-identity-decision-contract").AutonomousIdentityDecisionResult | null;
  airV2: import("@/lib/work-catalog/autonomous-identity-resolution-v2").AutonomousIdentityResolutionV2Result | null;
  queueItem: AutonomousResolutionQueueItem | null;
  productionMutation: false;
};

export type IkCompoundIdentityPhaseResult = {
  version: typeof IK_COMPOUND_IDENTITY_PHASE_VERSION;
  status: "ready" | "skipped" | "partial";
  parentCount: number;
  parents: IkCompoundIdentityParentResult[];
  /** Orchestra-level next legal after compound identity re-evaluation. */
  nextLegalTransaction: string | null;
  /** Always false for normal runtime — Owner is UI correction only. */
  ownerBoundaryReached: false;
  ownerRuntimeDependency: false;
  autonomousResolutionQueue: AutonomousResolutionQueueItem[];
  trustedCount: number;
  unresolvedCount: number;
  exhaustedCount: number;
  reasons: string[];
  productionMutation: false;
  parallelOrchestra: false;
  microSequencingRequired: false;
};

export type RunIkCompoundIdentityPhaseInput = {
  classification: IkClassificationReport;
  store?: WorkCatalogStore | null;
  packs?: readonly TechnologyPack[] | null;
  nowIso?: string;
  /** When false, skip (tests / feature gate). Default true. */
  enabled?: boolean;
  /**
   * Optional verified KNR evidence pack for ACLC-v1 after AWCLR/AIR exhaust.
   * In-memory CREATE only (productionMutation remains false).
   */
  verifiedKnrEvidence?: readonly import("@/lib/intelligent-estimator/knr-knowledge/chatgpt-knr-research-knowledge").ChatgptKnrVerifiedRecord[] | null;
  /** Default true when verifiedKnrEvidence provided. */
  allowAutonomousLeafCreate?: boolean;
};

function softDesc(s: string): string {
  return String(s || "").trim();
}

/**
 * Collect unique COMPOUND parents from classification (by catalogWorkId).
 * Generalizable — no per-workId hardcode.
 */
export function collectCompoundParentsFromClassification(
  classification: IkClassificationReport,
): Array<{
  parentWorkId: string;
  lineIds: string[];
  descriptions: string[];
  unit: string;
}> {
  const map = new Map<
    string,
    { lineIds: string[]; descriptions: string[]; unit: string }
  >();
  for (const row of classification.lines || []) {
    const wid = String(row.catalogWorkId || row.classify?.workId || "").trim();
    if (!wid) continue;
    // COMPOUND + BOTH_HOLD (legacy) + UNKNOWN / unresolved legacy parents needing leaf discovery
    const plane = String(row.plane || "");
    const needsDiscovery =
      plane === "COMPOUND" ||
      row.handoff === "BOTH_HOLD" ||
      plane === "UNKNOWN" ||
      (plane === "LABOR" && /^legacy-/i.test(wid)) ||
      (plane === "MATERIAL" && (/^legacy-/i.test(wid) || /^cw\.etics\./i.test(wid)));
    if (!needsDiscovery) continue;
    const cur = map.get(wid) || { lineIds: [], descriptions: [], unit: row.unit || "m2" };
    cur.lineIds.push(row.lineId);
    const d = softDesc(row.description);
    if (d && !cur.descriptions.includes(d)) cur.descriptions.push(d);
    if (row.unit) cur.unit = row.unit;
    map.set(wid, cur);
  }
  return [...map.entries()].map(([parentWorkId, v]) => ({
    parentWorkId,
    lineIds: v.lineIds,
    descriptions: v.descriptions,
    unit: v.unit,
  }));
}

function rankNextLegal(parents: IkCompoundIdentityParentResult[]): {
  next: string | null;
  trustedCount: number;
  unresolvedCount: number;
  exhaustedCount: number;
} {
  if (parents.length === 0) {
    return { next: null, trustedCount: 0, unresolvedCount: 0, exhaustedCount: 0 };
  }

  const trusted = parents.filter((p) => p.trusted);
  const unresolved = parents.filter((p) => !p.trusted);
  const exhausted = unresolved.filter((p) => p.queueItem?.exhausted === true);

  // Partial execution: trusted items continue; unresolved stay in autonomous queue
  if (trusted.length > 0 && unresolved.length === 0) {
    return {
      next: AIR_RUNTIME.CONTINUE_TRUSTED,
      trustedCount: trusted.length,
      unresolvedCount: 0,
      exhaustedCount: 0,
    };
  }
  if (trusted.length > 0 && unresolved.length > 0) {
    return {
      next: AIR_RUNTIME.CONTINUE_PARTIAL,
      trustedCount: trusted.length,
      unresolvedCount: unresolved.length,
      exhaustedCount: exhausted.length,
    };
  }
  if (unresolved.length > 0 && exhausted.length === unresolved.length) {
    return {
      next: AIR_RUNTIME.EXHAUSTED,
      trustedCount: 0,
      unresolvedCount: unresolved.length,
      exhaustedCount: exhausted.length,
    };
  }
  if (unresolved.length > 0) {
    return {
      next: AIR_RUNTIME.QUEUE,
      trustedCount: 0,
      unresolvedCount: unresolved.length,
      exhaustedCount: exhausted.length,
    };
  }
  return {
    next: AIR_RUNTIME.CONTINUE_TRUSTED,
    trustedCount: trusted.length,
    unresolvedCount: 0,
    exhaustedCount: 0,
  };
}

function emptyPhase(
  status: IkCompoundIdentityPhaseResult["status"],
  reasons: string[],
): IkCompoundIdentityPhaseResult {
  return {
    version: IK_COMPOUND_IDENTITY_PHASE_VERSION,
    status,
    parentCount: 0,
    parents: [],
    nextLegalTransaction: null,
    ownerBoundaryReached: false,
    ownerRuntimeDependency: false,
    autonomousResolutionQueue: [],
    trustedCount: 0,
    unresolvedCount: 0,
    exhaustedCount: 0,
    reasons,
    productionMutation: false,
    parallelOrchestra: false,
    microSequencingRequired: false,
  };
}

/**
 * Canonical Orchestra phase: Classification COMPOUND → CIE → CIV → AIR-v2 → next legal.
 * Partial execution: unresolved items enter autonomous queue; do not stop trusted paths.
 */
export function runIkCompoundIdentityPhase(
  input: RunIkCompoundIdentityPhaseInput,
): IkCompoundIdentityPhaseResult {
  if (input.enabled === false) {
    return emptyPhase("skipped", ["compound_identity_phase_disabled"]);
  }

  const classification = input.classification;
  if (!classification || classification.status === "blocked") {
    return emptyPhase("skipped", ["classification_blocked_or_missing"]);
  }

  const parentsIn = collectCompoundParentsFromClassification(classification);
  if (parentsIn.length === 0) {
    return emptyPhase("skipped", ["no_compound_parents"]);
  }

  ensureBaselineTechnologyPacksRegistered();
  let store = input.store === undefined ? loadWorkCatalogStoreLocal() : input.store;
  if (!store) {
    return emptyPhase("skipped", ["work_catalog_store_missing"]);
  }
  const packs = input.packs ?? listAllPacks();
  const nowIso = input.nowIso ?? new Date().toISOString();
  const evidencePack = input.verifiedKnrEvidence || null;
  const allowCreate =
    input.allowAutonomousLeafCreate !== false && Array.isArray(evidencePack) && evidencePack.length > 0;

  const parents: IkCompoundIdentityParentResult[] = [];
  const queue: AutonomousResolutionQueueItem[] = [];

  for (const p of parentsIn) {
    let cie = buildCompoundIdentityCandidate({
      workId: p.parentWorkId,
      store,
      packs,
      descriptions: p.descriptions,
      unit: p.unit,
      actor: "orchestra-compound-identity-phase",
      nowIso,
    });
    let air = runBoundedAutonomousIdentityResolution({
      workId: p.parentWorkId,
      store,
      packs,
      descriptions: p.descriptions,
      unit: p.unit,
      actor: "orchestra-compound-identity-phase",
      nowIso,
      deepenEvidence: !cie.go33Applicable,
      lineIds: p.lineIds,
      cie,
    });

    // After AIR exhaust: ACLC-v1 memory CREATE when verified evidence matches KNR tokens
    if (
      allowCreate
      && evidencePack
      && !air.trusted
      && /EXHAUSTED_DATA_GAP|CANONICAL_LEAF|NO_CANDIDATE|INSUFFICIENT/i.test(
        `${air.nextLegalTransaction} ${air.civ?.validationResult || ""}`,
      )
    ) {
      const blob = p.descriptions.join(" ");
      const codes = [...blob.matchAll(/\b(\d{3,4}-\d{2})\b/g)].map((m) => m[1]!);
      for (const code of codes) {
        const rec = evidencePack.find((r) => r.tableCode === code);
        if (!rec) continue;
        if (!unitCompatibleLoose(rec.unit, p.unit)) continue;
        const created = executeAutonomousCanonicalLeafCreateMemorySync({
          record: rec,
          store,
          nowIso,
        });
        store = created.store;
        if (created.executed || created.decision === "IDEMPOTENT_NOOP") {
          cie = buildCompoundIdentityCandidate({
            workId: p.parentWorkId,
            store,
            packs,
            descriptions: p.descriptions,
            unit: p.unit,
            actor: "orchestra-compound-identity-phase-aclc",
            nowIso,
          });
          air = runBoundedAutonomousIdentityResolution({
            workId: p.parentWorkId,
            store,
            packs,
            descriptions: [...p.descriptions, rec.description, rec.canonicalDisplay],
            unit: p.unit,
            actor: "orchestra-compound-identity-phase-aclc",
            nowIso,
            deepenEvidence: true,
            lineIds: p.lineIds,
            cie,
          });
          break;
        }
      }
    }

    const civ = air.civ;
    const identityBridgeUsed = civ.evidenceDiscovered.some(
      (e) => e.sourceType === "KNR_WC_BRIDGE",
    );
    const aid = air.aid;
    if (air.queueItem) queue.push(air.queueItem);
    parents.push({
      parentWorkId: p.parentWorkId,
      lineIds: p.lineIds,
      lineCount: p.lineIds.length,
      descriptions: p.descriptions,
      unit: p.unit,
      cie,
      civ,
      validationResult: civ.validationResult,
      trusted: air.trusted === true,
      ownerRequired: false,
      nextLegalTransaction: air.nextLegalTransaction,
      go33Applicable: cie.go33Applicable,
      identityBridgeUsed,
      autonomousIdentityDecision: aid ?? null,
      airV2: air,
      queueItem: air.queueItem,
      productionMutation: false,
    });
  }

  const ranked = rankNextLegal(parents);
  const status: IkCompoundIdentityPhaseResult["status"] =
    ranked.trustedCount > 0 && ranked.unresolvedCount > 0
      ? "partial"
      : parents.length > 0
        ? "ready"
        : "skipped";

  return {
    version: IK_COMPOUND_IDENTITY_PHASE_VERSION,
    status,
    parentCount: parents.length,
    parents,
    nextLegalTransaction: ranked.next,
    ownerBoundaryReached: false,
    ownerRuntimeDependency: false,
    autonomousResolutionQueue: queue,
    trustedCount: ranked.trustedCount,
    unresolvedCount: ranked.unresolvedCount,
    exhaustedCount: ranked.exhaustedCount,
    reasons: [
      `compound_parents=${parents.length}`,
      `trusted=${ranked.trustedCount}`,
      `unresolved=${ranked.unresolvedCount}`,
      `exhausted=${ranked.exhaustedCount}`,
      ...parents.map((p) => `${p.parentWorkId}:${p.validationResult}:${p.trusted ? "TRUSTED" : "QUEUE"}`),
    ],
    productionMutation: false,
    parallelOrchestra: false,
    microSequencingRequired: false,
  };
}

/**
 * Re-evaluate Orchestra next legal transaction from classification + compound phase.
 * Deterministic — no GPT/Cursor micro-sequencing · no Owner runtime stop.
 */
export function deriveOrchestraNextLegalTransaction(input: {
  classification: IkClassificationReport | null;
  compoundIdentity: IkCompoundIdentityPhaseResult | null;
  knrDownstreamDeferred?: boolean;
  postMayProceed?: boolean;
}): {
  nextLegalTransaction: string;
  source: string;
  ownerBoundaryReached: false;
  ownerRuntimeDependency: false;
  microSequencingRequired: false;
} {
  if (input.knrDownstreamDeferred) {
    return {
      nextLegalTransaction: "AWAIT_KNR_KNOWLEDGE_ENVELOPE",
      source: "knr_defer",
      ownerBoundaryReached: false,
      ownerRuntimeDependency: false,
      microSequencingRequired: false,
    };
  }
  if (input.postMayProceed === false) {
    return {
      nextLegalTransaction: "EXPERT_ADMISSION_BLOCKED",
      source: "admission",
      ownerBoundaryReached: false,
      ownerRuntimeDependency: false,
      microSequencingRequired: false,
    };
  }

  const compound = input.compoundIdentity;
  if (compound && (compound.status === "ready" || compound.status === "partial") && compound.nextLegalTransaction) {
    return {
      nextLegalTransaction: compound.nextLegalTransaction,
      source: "compound_identity_phase",
      ownerBoundaryReached: false,
      ownerRuntimeDependency: false,
      microSequencingRequired: false,
    };
  }

  const classif = input.classification;
  if (classif && classif.status !== "blocked") {
    const unknown = classif.lines.filter((l) => l.plane === "UNKNOWN");
    const discoveryHeld = unknown.filter(
      (l) =>
        l.classify.reasonCode === "DISCOVERY_HELD" ||
        l.classify.classifiedBy === "fallback_unknown",
    );
    if (discoveryHeld.length > 0 && unknown.length === discoveryHeld.length) {
      return {
        nextLegalTransaction: AIR_RUNTIME.UNKNOWN_DISCOVERY,
        source: "unknown_plane_autonomous_discovery",
        ownerBoundaryReached: false,
        ownerRuntimeDependency: false,
        microSequencingRequired: false,
      };
    }
    if (classif.counts.LABOR > 0 || classif.counts.MATERIAL > 0) {
      return {
        nextLegalTransaction: "CONTINUE_P5_LABOR_P6_MATERIAL",
        source: "classification_handoff",
        ownerBoundaryReached: false,
        ownerRuntimeDependency: false,
        microSequencingRequired: false,
      };
    }
    if (classif.counts.COMPOUND > 0) {
      return {
        nextLegalTransaction: "COMPOUND_IDENTITY_PHASE",
        source: "classification_compound",
        ownerBoundaryReached: false,
        ownerRuntimeDependency: false,
        microSequencingRequired: false,
      };
    }
  }

  return {
    nextLegalTransaction: "CONTINUE_P7_P8",
    source: "default_pipeline",
    ownerBoundaryReached: false,
    ownerRuntimeDependency: false,
    microSequencingRequired: false,
  };
}
