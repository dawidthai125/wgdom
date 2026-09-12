/**
 * AUTONOMOUS_TECHNOLOGY_ACCEPT — pure fail-closed contract.
 *
 * ATA-v1.1 BOM_ONLY: OUR RATE is NOT an accept precondition (technology/BOM track).
 * Position Cost / financeReady still require OUR RATE downstream — not this contract.
 *
 * validated technology candidate → may build ACTIVE TechnologyPack (caller dry/persist).
 * ZERO invent · ZERO TPI-specific packId · ZERO incomplete accept · ZERO Owner runtime.
 */

import type { TechnologyPack } from "@/lib/technology-foundation/types";
import { findActiveTechnologyPacksForWorkId } from "@/lib/tender-position-cost/bom-technology-adapter";
import { unitsCompatible as unitsCompatiblePm } from "@/lib/price-intelligence/market-material-research-provider";

export const AUTONOMOUS_TECHNOLOGY_ACCEPT_DECISION_ID =
  "AUTONOMOUS_TECHNOLOGY_ACCEPT" as const;
export const AUTONOMOUS_TECHNOLOGY_ACCEPT_RULE_ID =
  "autonomous_technology.accept_candidate_v1" as const;
/** ATA-v1.1 — BOM_ONLY track; OUR RATE not required for technology accept. */
export const AUTONOMOUS_TECHNOLOGY_ACCEPT_POLICY_VERSION = "ATA-v1.1" as const;
/** Accept track: technology/BOM only — never writes labor/OUR RATE/material market price. */
export const AUTONOMOUS_TECHNOLOGY_ACCEPT_TRACK = "BOM_ONLY" as const;

export type AutonomousTechnologyAcceptDecision =
  | "AUTONOMOUS_TECHNOLOGY_ACCEPT"
  | "AUTONOMOUS_TECHNOLOGY_EXCEPTION";

export type AutonomousTechnologyAcceptReason =
  | "NO_CANDIDATE"
  | "NO_WORK_ID"
  | "NO_UNIT"
  | "UNIT_MISMATCH"
  | "IDENTITY_MISMATCH"
  | "TECHNOLOGY_INCOMPATIBLE"
  | "SCOPE_INCOMPATIBLE"
  | "MATERIAL_INCOMPATIBLE"
  | "MISSING_QTY_FACTOR_EVIDENCE"
  | "MISSING_PROVENANCE"
  | "MISSING_EVIDENCE"
  | "MISSING_STEPS"
  | "INCOMPLETE_TECHNOLOGY_DEFINITION"
  | "GUESSED_FIELDS"
  | "UNRESOLVED_CONFLICT"
  | "VALIDATION_FAILED"
  | "AMBIGUOUS_EXISTING_PACK"
  | "IDEMPOTENT_NOOP"
  | "INVENT_FORBIDDEN";

export type AutonomousTechnologyMaterialLine = {
  materialKey: string;
  namePl: string;
  unit: string;
  qtyFactor: number;
  factorSourceRef: string;
  evidenceRefs: string[];
};

export type AutonomousTechnologyStep = {
  stepId: string;
  namePl: string;
  order: number;
};

export type AutonomousTechnologyCandidate = {
  workId: string;
  unit: string;
  technologyIdentity: string;
  technologyDescription: string;
  steps: AutonomousTechnologyStep[];
  materials: AutonomousTechnologyMaterialLine[];
  sourceId: string;
  sourceUrl: string | null;
  provenance: string;
  evidenceRefs: string[];
  sourceDateIso: string;
  applicability: string;
  confidence: number;
  validationState: "VALIDATED" | "UNVERIFIED" | "REJECTED";
  invent: false;
  /** Family/code binding — must match canonical workId when present. */
  knrFamily?: string | null;
  knrCode?: string | null;
  conflict?: boolean;
  guessedFields?: string[];
};

export type AutonomousTechnologyAcceptResult = {
  decisionId: typeof AUTONOMOUS_TECHNOLOGY_ACCEPT_DECISION_ID;
  ruleId: typeof AUTONOMOUS_TECHNOLOGY_ACCEPT_RULE_ID;
  policyVersion: typeof AUTONOMOUS_TECHNOLOGY_ACCEPT_POLICY_VERSION;
  /** BOM_ONLY — technology accept independent of OUR RATE (labor track separate). */
  acceptTrack: typeof AUTONOMOUS_TECHNOLOGY_ACCEPT_TRACK;
  decision: AutonomousTechnologyAcceptDecision;
  reasons: AutonomousTechnologyAcceptReason[];
  evaluatedAtIso: string;
  mayBuildActivePack: boolean;
  idempotentNoop: boolean;
  workId: string | null;
  packId: string | null;
  packVersion: string | null;
  auditWhy: string[];
  ownerRuntimeDependency: 0;
};

function isoNow(nowMs: number): string {
  return new Date(nowMs).toISOString();
}

function foldUnit(u: string): string {
  return String(u || "")
    .trim()
    .toLowerCase()
    .replace(/²/g, "2")
    .replace(/m\^?2\b/g, "m2")
    .replace(/\s+/g, "");
}

function unitsOk(a: string, b: string): boolean {
  if (unitsCompatiblePm(a, b)) return true;
  const fa = foldUnit(a);
  const fb = foldUnit(b);
  return Boolean(fa && fb && fa === fb);
}

/** Reusable pack identity — NEVER tender-scoped (no TPI/729 in packId). */
export function buildReusableAutonomousTechnologyPackId(
  technologyIdentity: string,
): string {
  const raw = String(technologyIdentity || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 72);
  const slug = raw || "unnamed";
  if (/tpi[_-]?729/i.test(slug) || /tender/i.test(slug)) {
    throw new Error("ATA: tender-scoped packId forbidden");
  }
  return `pack.autotech.${slug}`;
}

function exception(
  reasons: AutonomousTechnologyAcceptReason[],
  nowMs: number,
  auditWhy: string[],
  extra?: Partial<AutonomousTechnologyAcceptResult>,
): AutonomousTechnologyAcceptResult {
  return {
    decisionId: AUTONOMOUS_TECHNOLOGY_ACCEPT_DECISION_ID,
    ruleId: AUTONOMOUS_TECHNOLOGY_ACCEPT_RULE_ID,
    policyVersion: AUTONOMOUS_TECHNOLOGY_ACCEPT_POLICY_VERSION,
    acceptTrack: AUTONOMOUS_TECHNOLOGY_ACCEPT_TRACK,
    decision: "AUTONOMOUS_TECHNOLOGY_EXCEPTION",
    reasons,
    evaluatedAtIso: isoNow(nowMs),
    mayBuildActivePack: false,
    idempotentNoop: false,
    workId: null,
    packId: null,
    packVersion: null,
    auditWhy,
    ownerRuntimeDependency: 0,
    ...extra,
  };
}

/**
 * Validate candidate gates A–J (fail-closed).
 */
export function validateAutonomousTechnologyCandidate(
  candidate: AutonomousTechnologyCandidate | null | undefined,
  expected?: { workId?: string; unit?: string },
): { ok: boolean; reasons: AutonomousTechnologyAcceptReason[]; auditWhy: string[] } {
  const reasons: AutonomousTechnologyAcceptReason[] = [];
  const auditWhy: string[] = [];
  if (!candidate) {
    return { ok: false, reasons: ["NO_CANDIDATE"], auditWhy: ["missing candidate"] };
  }
  if (candidate.invent !== false) {
    reasons.push("INVENT_FORBIDDEN");
  }
  if (candidate.validationState !== "VALIDATED") {
    reasons.push("VALIDATION_FAILED");
    auditWhy.push(`validationState=${candidate.validationState}`);
  }
  if (candidate.conflict === true) {
    reasons.push("UNRESOLVED_CONFLICT");
  }
  if (candidate.guessedFields && candidate.guessedFields.length > 0) {
    reasons.push("GUESSED_FIELDS");
    auditWhy.push(`guessed=${candidate.guessedFields.join(",")}`);
  }
  const workId = String(candidate.workId || "").trim();
  if (!workId) reasons.push("NO_WORK_ID");
  const unit = String(candidate.unit || "").trim();
  if (!unit) reasons.push("NO_UNIT");
  if (expected?.workId && workId && expected.workId !== workId) {
    reasons.push("IDENTITY_MISMATCH");
  }
  if (expected?.unit && unit && !unitsOk(expected.unit, unit)) {
    reasons.push("UNIT_MISMATCH");
  }
  if (!String(candidate.technologyIdentity || "").trim()) {
    reasons.push("INCOMPLETE_TECHNOLOGY_DEFINITION");
    auditWhy.push("missing technologyIdentity");
  }
  if (!candidate.steps?.length) {
    reasons.push("MISSING_STEPS");
  }
  if (!candidate.materials?.length) {
    reasons.push("MATERIAL_INCOMPATIBLE");
    auditWhy.push("empty materials — LABOR_ONLY must use allowlist, not invent pack");
  }
  if (!candidate.evidenceRefs?.length || !String(candidate.provenance || "").trim()) {
    reasons.push("MISSING_PROVENANCE");
  }
  if (!candidate.evidenceRefs?.length) {
    reasons.push("MISSING_EVIDENCE");
  }

  // Family/code must not contradict canonical workId (0829 KNR 2-02 vs 0-12)
  if (candidate.knrFamily && workId) {
    const fam = candidate.knrFamily.toUpperCase().replace(/\s+/g, " ").trim();
    const wid = workId.toLowerCase();
    const isKnnr = /\bKNNR\b/.test(fam);
    const num = fam.replace(/^KNR-?W?\s*/i, "").replace(/^KNNR\s*/i, "").trim();
    if (num) {
      const expectToken = isKnnr
        ? `knnr-${num}`.toLowerCase().replace(/\s+/g, "")
        : `knr-${num}`.toLowerCase().replace(/\s+/g, "");
      const compact = expectToken.replace(/-/g, "");
      const widCompact = wid.replace(/-/g, "");
      if (!wid.includes(expectToken) && !widCompact.includes(compact)) {
        reasons.push("SCOPE_INCOMPATIBLE");
        auditWhy.push(
          `family mismatch candidate=${candidate.knrFamily} workId=${workId}`,
        );
      }
    }
  }

  for (const mat of candidate.materials || []) {
    if (!String(mat.materialKey || "").trim()) {
      reasons.push("MATERIAL_INCOMPATIBLE");
      auditWhy.push("materialKey empty");
    }
    if (!String(mat.unit || "").trim()) {
      reasons.push("UNIT_MISMATCH");
    }
    if (!Number.isFinite(mat.qtyFactor) || mat.qtyFactor < 0) {
      reasons.push("MISSING_QTY_FACTOR_EVIDENCE");
    }
    if (!String(mat.factorSourceRef || "").trim() || !(mat.evidenceRefs?.length > 0)) {
      reasons.push("MISSING_QTY_FACTOR_EVIDENCE");
      auditWhy.push(`qty provenance missing for ${mat.materialKey}`);
    }
  }

  if (candidate.confidence < 0.85) {
    reasons.push("VALIDATION_FAILED");
    auditWhy.push(`confidence ${candidate.confidence} < 0.85`);
  }

  const uniq = [...new Set(reasons)];
  return { ok: uniq.length === 0, reasons: uniq, auditWhy };
}

export function evaluateAutonomousTechnologyAcceptContract(input: {
  candidate: AutonomousTechnologyCandidate | null;
  expectedWorkId: string;
  expectedUnit: string;
  packs?: readonly TechnologyPack[];
  nowMs?: number;
}): AutonomousTechnologyAcceptResult {
  const nowMs = input.nowMs ?? Date.now();
  const workId = String(input.expectedWorkId || "").trim();
  const unit = String(input.expectedUnit || "").trim();
  if (!workId) {
    return exception(["NO_WORK_ID"], nowMs, ["expectedWorkId empty"]);
  }
  if (!unit) {
    return exception(["NO_UNIT"], nowMs, ["expectedUnit empty"], { workId });
  }

  const v = validateAutonomousTechnologyCandidate(input.candidate, {
    workId,
    unit,
  });
  if (!v.ok || !input.candidate) {
    return exception(v.reasons.length ? v.reasons : ["VALIDATION_FAILED"], nowMs, v.auditWhy, {
      workId,
    });
  }

  const cand = input.candidate;
  let packId: string;
  try {
    packId = buildReusableAutonomousTechnologyPackId(cand.technologyIdentity);
  } catch {
    return exception(["INCOMPLETE_TECHNOLOGY_DEFINITION"], nowMs, [
      "tender-scoped or invalid technologyIdentity",
    ], { workId });
  }
  const packVersion = "1.0";

  const existing = findActiveTechnologyPacksForWorkId(workId, input.packs);
  if (existing.length > 1) {
    return exception(["AMBIGUOUS_EXISTING_PACK"], nowMs, [
      `multiple ACTIVE packs for ${workId}`,
    ], { workId, packId, packVersion });
  }
  if (existing.length === 1) {
    const p = existing[0]!;
    if (p.packId === packId && p.packVersion === packVersion) {
      return {
        decisionId: AUTONOMOUS_TECHNOLOGY_ACCEPT_DECISION_ID,
        ruleId: AUTONOMOUS_TECHNOLOGY_ACCEPT_RULE_ID,
        policyVersion: AUTONOMOUS_TECHNOLOGY_ACCEPT_POLICY_VERSION,
        acceptTrack: AUTONOMOUS_TECHNOLOGY_ACCEPT_TRACK,
        decision: "AUTONOMOUS_TECHNOLOGY_ACCEPT",
        reasons: ["IDEMPOTENT_NOOP"],
        evaluatedAtIso: isoNow(nowMs),
        mayBuildActivePack: false,
        idempotentNoop: true,
        workId,
        packId,
        packVersion,
        auditWhy: ["existing identical ACTIVE pack", "acceptTrack=BOM_ONLY"],
        ownerRuntimeDependency: 0,
      };
    }
    return exception(["AMBIGUOUS_EXISTING_PACK"], nowMs, [
      `ACTIVE pack already bound: ${p.packId}@${p.packVersion}`,
    ], { workId, packId, packVersion });
  }

  return {
    decisionId: AUTONOMOUS_TECHNOLOGY_ACCEPT_DECISION_ID,
    ruleId: AUTONOMOUS_TECHNOLOGY_ACCEPT_RULE_ID,
    policyVersion: AUTONOMOUS_TECHNOLOGY_ACCEPT_POLICY_VERSION,
    acceptTrack: AUTONOMOUS_TECHNOLOGY_ACCEPT_TRACK,
    decision: "AUTONOMOUS_TECHNOLOGY_ACCEPT",
    reasons: [],
    evaluatedAtIso: isoNow(nowMs),
    mayBuildActivePack: true,
    idempotentNoop: false,
    workId,
    packId,
    packVersion,
    auditWhy: [
      "validated candidate · reusable packId · singleton free · provenance ok",
      `policy=${AUTONOMOUS_TECHNOLOGY_ACCEPT_POLICY_VERSION}`,
      "acceptTrack=BOM_ONLY · OUR RATE not required for technology accept",
    ],
    ownerRuntimeDependency: 0,
  };
}

/**
 * Build ACTIVE TechnologyPack from accepted candidate (caller decides persist).
 * Uses norm_ref provenance — never fixture invent.
 */
export function buildActiveTechnologyPackFromAcceptedCandidate(
  candidate: AutonomousTechnologyCandidate,
  accept: AutonomousTechnologyAcceptResult,
): TechnologyPack | null {
  if (accept.decision !== "AUTONOMOUS_TECHNOLOGY_ACCEPT" || !accept.mayBuildActivePack) {
    return null;
  }
  if (!accept.packId || !accept.packVersion) return null;
  const nowIso = accept.evaluatedAtIso;
  return {
    packId: accept.packId,
    packVersion: accept.packVersion,
    definitionId: "def.autonomous.technology.v1",
    packCapabilities: ["cap.autonomous_technology"],
    lifecycle: "ACTIVE",
    namePl: candidate.technologyDescription.slice(0, 120),
    stages: [{ stageId: "stage.autotech", order: 1, namePl: "Technologia" }],
    steps: candidate.steps.map((s, i) => ({
      stepId: s.stepId || `step.autotech.${i + 1}`,
      stageId: "stage.autotech",
      order: s.order || i + 1,
      namePl: s.namePl,
      catalogWorkId: candidate.workId,
      quantityFromBoq: true,
    })),
    dependencies: [],
    materials: candidate.materials.map((m) => ({
      materialKey: m.materialKey,
      namePl: m.namePl,
      unit: m.unit,
      qtyFactor: m.qtyFactor,
      factorSourceKind: "norm_ref" as const,
      factorSourceRef: m.factorSourceRef,
      factorApprovedAt: nowIso,
      wastePolicy: "included_in_factor" as const,
    })),
    equipment: [],
    labour: [],
    regulatory: [],
  };
}
