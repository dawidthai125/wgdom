/**
 * Authorized Labor Leaf Binding — pure fail-closed contract (shadow / design).
 *
 * REUSE (no second engine):
 *   assertLeafLaborResearchAllowed · TechnologyPack.labour[] / steps[] ·
 *   getWorkByIdFromStore · classifyEstimatorPricingPlane
 *
 * DOES NOT: invent leaf · write pack · write OUR RATE · fuzzy-map parent→rate
 * materials[] NEVER authorizes labor · steps[] self-bind WITHOUT labour[] BLOCK
 *
 * Persistence of bindings = separate Owner GO (this module is evaluate-only).
 */

import type { TechnologyPack } from "@/lib/technology-foundation/types";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import { getWorkByIdFromStore } from "@/lib/work-catalog/catalog-work-utils";
import {
  assertLeafLaborResearchAllowed,
  IK_LEAF_RESEARCH_CALL_SITE,
  type IkLeafLaborResearchBlockReason,
} from "@/lib/intelligent-estimator/classification-gate";
import { classifyEstimatorPricingPlaneWithDiscovery } from "@/lib/intelligent-estimator/autonomous-unknown-plane-discovery";
import { unitsCompatible as unitsCompatiblePm } from "@/lib/price-intelligence/market-material-research-provider";

export const AUTHORIZED_LABOR_LEAF_BINDING_DECISION_ID =
  "AUTHORIZED_LABOR_LEAF_BINDING" as const;
export const AUTHORIZED_LABOR_LEAF_BINDING_RULE_ID =
  "technology.authorized_labor_leaf_binding_v1" as const;
export const AUTHORIZED_LABOR_LEAF_BINDING_POLICY_VERSION = "ALLB-v1.0" as const;

export type AuthorizedLaborLeafBindingDecision =
  | "AUTHORIZED_LABOR_LEAF_BINDING"
  | "AUTHORIZED_LABOR_LEAF_EXCEPTION";

export type AuthorizedLaborLeafBindingReason =
  | "NO_PACK"
  | "NO_PARENT_WORK_ID"
  | "PARENT_NOT_COMPOUND"
  | "LEAF_GATE_BLOCK"
  | "LEAF_EQUALS_PARENT_WITHOUT_LABOUR"
  | "LEAF_NOT_IN_CATALOG"
  | "UNIT_MISMATCH"
  | "MISSING_QTY_FACTOR_EVIDENCE"
  | "MATERIAL_ONLY_PACK"
  | "STEPS_ONLY_NO_LABOR_AUTH"
  | "HOURS_ONLY_WITHOUT_WORK_ID"
  | "MISSING_PROVENANCE"
  | "CONFLICT"
  | "GUESSED_FIELDS"
  | "INVENT_FORBIDDEN"
  | "IDEMPOTENT_NOOP";

export type AuthorizedLaborLeafBinding = {
  parentWorkId: string;
  leafWorkId: string;
  leafNamePl: string;
  leafUnit: string;
  packId: string;
  packVersion: string;
  packLifecycle: TechnologyPack["lifecycle"];
  source: "labour+step" | "labour_only" | "step_distinct" | "labour_self_bind";
  qtyFactor: number;
  qtyFactorEvidence:
    | "pack.labour.hoursPerUnit"
    | "quantityFromBoq_implicit_1_with_labour_auth"
    | "quantityFromBoq_implicit_1_distinct_step";
  provenance: string;
  gateCallSite: typeof IK_LEAF_RESEARCH_CALL_SITE;
  invent: false;
  mayPersistBinding: false;
  mayWriteOurRate: false;
};

export type EvaluateAuthorizedLaborLeafBindingInput = {
  parentWorkId: string;
  pack: TechnologyPack | null;
  store: WorkCatalogStore;
  /** When set, evaluate this leaf only; otherwise enumerate pack candidates. */
  leafWorkId?: string | null;
  parentUnit?: string | null;
  parentNamePl?: string | null;
  nowMs?: number;
  /** Explicit conflict from upstream evidence resolver. */
  conflict?: boolean;
  guessedFields?: string[];
};

export type EvaluateAuthorizedLaborLeafBindingResult = {
  decisionId: typeof AUTHORIZED_LABOR_LEAF_BINDING_DECISION_ID;
  ruleId: typeof AUTHORIZED_LABOR_LEAF_BINDING_RULE_ID;
  policyVersion: typeof AUTHORIZED_LABOR_LEAF_BINDING_POLICY_VERSION;
  decision: AuthorizedLaborLeafBindingDecision;
  reasons: AuthorizedLaborLeafBindingReason[];
  evaluatedAtIso: string;
  parentWorkId: string | null;
  packId: string | null;
  bindings: AuthorizedLaborLeafBinding[];
  blockedCandidates: Array<{
    leafWorkId: string | null;
    reasons: AuthorizedLaborLeafBindingReason[];
    gateBlock?: IkLeafLaborResearchBlockReason | null;
  }>;
  mayAuthorize: boolean;
  invent: false;
  persistence: "NONE";
};

type PackLeafCandidate = {
  leafWorkId: string;
  source: AuthorizedLaborLeafBinding["source"];
  namePl: string;
  quantityFromBoq: boolean;
  hoursPerUnit: number | null;
  factorSourceKind: string | null;
  factorSourceRef: string | null;
};

function exception(
  reasons: AuthorizedLaborLeafBindingReason[],
  nowMs: number,
  partial: Partial<EvaluateAuthorizedLaborLeafBindingResult> = {},
): EvaluateAuthorizedLaborLeafBindingResult {
  return {
    decisionId: AUTHORIZED_LABOR_LEAF_BINDING_DECISION_ID,
    ruleId: AUTHORIZED_LABOR_LEAF_BINDING_RULE_ID,
    policyVersion: AUTHORIZED_LABOR_LEAF_BINDING_POLICY_VERSION,
    decision: "AUTHORIZED_LABOR_LEAF_EXCEPTION",
    reasons,
    evaluatedAtIso: new Date(nowMs).toISOString(),
    parentWorkId: partial.parentWorkId ?? null,
    packId: partial.packId ?? null,
    bindings: [],
    blockedCandidates: partial.blockedCandidates ?? [],
    mayAuthorize: false,
    invent: false,
    persistence: "NONE",
  };
}

/**
 * Enumerate labor-leaf candidates from TechnologyPack only (no fuzzy description).
 */
export function enumeratePackLaborLeafCandidates(
  parentWorkId: string,
  pack: TechnologyPack,
): PackLeafCandidate[] {
  const parent = String(parentWorkId || "").trim();
  const out: PackLeafCandidate[] = [];
  const labourByKey = new Map(
    (pack.labour || [])
      .map((l) => [String(l.labourKey || "").trim(), l] as const)
      .filter(([k]) => Boolean(k)),
  );

  for (const step of pack.steps || []) {
    const id = String(step.catalogWorkId || "").trim();
    if (!id) continue;
    const lab = labourByKey.get(id);
    if (id === parent) {
      if (lab) {
        out.push({
          leafWorkId: parent,
          source: "labour_self_bind",
          namePl: String(lab.namePl || step.namePl || parent),
          quantityFromBoq: step.quantityFromBoq !== false,
          hoursPerUnit: Number.isFinite(lab.hoursPerUnit) ? lab.hoursPerUnit : null,
          factorSourceKind: lab.factorSourceKind ?? null,
          factorSourceRef: lab.factorSourceRef ?? null,
        });
      }
      continue;
    }
    out.push({
      leafWorkId: id,
      source: lab ? "labour+step" : "step_distinct",
      namePl: String(lab?.namePl || step.namePl || id),
      quantityFromBoq: step.quantityFromBoq !== false,
      hoursPerUnit: lab && Number.isFinite(lab.hoursPerUnit) ? lab.hoursPerUnit : null,
      factorSourceKind: lab?.factorSourceKind ?? null,
      factorSourceRef: lab?.factorSourceRef ?? null,
    });
  }

  for (const [id, lab] of labourByKey) {
    if (out.some((c) => c.leafWorkId === id)) continue;
    if (id === parent) {
      out.push({
        leafWorkId: parent,
        source: "labour_self_bind",
        namePl: String(lab.namePl || parent),
        quantityFromBoq: true,
        hoursPerUnit: Number.isFinite(lab.hoursPerUnit) ? lab.hoursPerUnit : null,
        factorSourceKind: lab.factorSourceKind ?? null,
        factorSourceRef: lab.factorSourceRef ?? null,
      });
      continue;
    }
    out.push({
      leafWorkId: id,
      source: "labour_only",
      namePl: String(lab.namePl || id),
      quantityFromBoq: true,
      hoursPerUnit: Number.isFinite(lab.hoursPerUnit) ? lab.hoursPerUnit : null,
      factorSourceKind: lab.factorSourceKind ?? null,
      factorSourceRef: lab.factorSourceRef ?? null,
    });
  }

  return out;
}

function resolveQtyFactor(
  c: PackLeafCandidate,
): {
  ok: boolean;
  qtyFactor: number | null;
  evidence: AuthorizedLaborLeafBinding["qtyFactorEvidence"] | null;
  reason?: AuthorizedLaborLeafBindingReason;
} {
  if (c.hoursPerUnit != null && c.hoursPerUnit > 0) {
    // hoursPerUnit is technology norm evidence — NOT OUR RATE PLN.
    // Used as qtyFactor only when labour identity is CatalogWork-bound.
    if (!c.factorSourceKind && !c.factorSourceRef) {
      return { ok: false, qtyFactor: null, evidence: null, reason: "MISSING_PROVENANCE" };
    }
    return {
      ok: true,
      qtyFactor: c.hoursPerUnit,
      evidence: "pack.labour.hoursPerUnit",
    };
  }
  if (c.source === "step_distinct" && c.quantityFromBoq) {
    // Distinct step catalogWorkId + quantityFromBoq — implicit factor 1 (BOQ qty).
    return {
      ok: true,
      qtyFactor: 1,
      evidence: "quantityFromBoq_implicit_1_distinct_step",
    };
  }
  if (c.source === "labour_self_bind" || c.source === "labour+step" || c.source === "labour_only") {
    if (c.quantityFromBoq) {
      return {
        ok: true,
        qtyFactor: 1,
        evidence: "quantityFromBoq_implicit_1_with_labour_auth",
      };
    }
  }
  return { ok: false, qtyFactor: null, evidence: null, reason: "MISSING_QTY_FACTOR_EVIDENCE" };
}

/**
 * Pure evaluator — AuthorizedLaborLeafBinding[] or EXCEPTION.
 * Never invents leaf identities from parent description / materials[].
 */
export function evaluateAuthorizedLaborLeafBinding(
  input: EvaluateAuthorizedLaborLeafBindingInput,
): EvaluateAuthorizedLaborLeafBindingResult {
  const nowMs = input.nowMs ?? Date.now();
  const parentWorkId = String(input.parentWorkId || "").trim();
  if (!parentWorkId) {
    return exception(["NO_PARENT_WORK_ID"], nowMs);
  }
  if (input.conflict) {
    return exception(["CONFLICT"], nowMs, { parentWorkId });
  }
  if (input.guessedFields && input.guessedFields.length > 0) {
    return exception(["GUESSED_FIELDS", "INVENT_FORBIDDEN"], nowMs, { parentWorkId });
  }
  if (!input.pack) {
    return exception(["NO_PACK"], nowMs, { parentWorkId });
  }

  const pack = input.pack;
  // Same discovery seam as leaf gate / P5 — Owner map alone may be UNKNOWN
  // while pack-bound technology upgrades plane to COMPOUND.
  const plane = classifyEstimatorPricingPlaneWithDiscovery({
    workId: parentWorkId,
    unit: input.parentUnit,
    namePl: input.parentNamePl,
    packs: [pack],
  }).plane;
  if (plane !== "COMPOUND") {
    return exception(["PARENT_NOT_COMPOUND"], nowMs, {
      parentWorkId,
      packId: pack.packId,
    });
  }

  const hasMaterials = (pack.materials || []).length > 0;
  const hasLabour = (pack.labour || []).length > 0;
  const hasDistinctSteps = (pack.steps || []).some(
    (s) => String(s.catalogWorkId || "").trim() && String(s.catalogWorkId).trim() !== parentWorkId,
  );

  if (hasMaterials && !hasLabour && !hasDistinctSteps) {
    const selfBind = (pack.steps || []).some(
      (s) => String(s.catalogWorkId || "").trim() === parentWorkId,
    );
    return exception(
      selfBind
        ? ["MATERIAL_ONLY_PACK", "LEAF_EQUALS_PARENT_WITHOUT_LABOUR", "STEPS_ONLY_NO_LABOR_AUTH"]
        : ["MATERIAL_ONLY_PACK"],
      nowMs,
      {
        parentWorkId,
        packId: pack.packId,
        blockedCandidates: selfBind
          ? [
              {
                leafWorkId: parentWorkId,
                reasons: ["LEAF_EQUALS_PARENT_WITHOUT_LABOUR", "MATERIAL_ONLY_PACK"],
                gateBlock: "LEAF_SELF_BIND_REQUIRES_LABOUR",
              },
            ]
          : [],
      },
    );
  }

  let candidates = enumeratePackLaborLeafCandidates(parentWorkId, pack);
  const focusLeaf = String(input.leafWorkId || "").trim();
  if (focusLeaf) {
    candidates = candidates.filter((c) => c.leafWorkId === focusLeaf);
  }

  // steps-only self-bind with empty labour → explicit block (no candidates from enumerator)
  if (
    candidates.length === 0
    && !hasLabour
    && (pack.steps || []).some((s) => String(s.catalogWorkId || "").trim() === parentWorkId)
  ) {
    return exception(["LEAF_EQUALS_PARENT_WITHOUT_LABOUR", "STEPS_ONLY_NO_LABOR_AUTH"], nowMs, {
      parentWorkId,
      packId: pack.packId,
      blockedCandidates: [
        {
          leafWorkId: parentWorkId,
          reasons: ["LEAF_EQUALS_PARENT_WITHOUT_LABOUR"],
          gateBlock: "LEAF_SELF_BIND_REQUIRES_LABOUR",
        },
      ],
    });
  }

  if (candidates.length === 0 && hasLabour) {
    return exception(["HOURS_ONLY_WITHOUT_WORK_ID"], nowMs, {
      parentWorkId,
      packId: pack.packId,
    });
  }

  if (candidates.length === 0) {
    return exception(["STEPS_ONLY_NO_LABOR_AUTH"], nowMs, {
      parentWorkId,
      packId: pack.packId,
    });
  }

  const bindings: AuthorizedLaborLeafBinding[] = [];
  const blocked: EvaluateAuthorizedLaborLeafBindingResult["blockedCandidates"] = [];

  for (const c of candidates) {
    const gate = assertLeafLaborResearchAllowed({
      leafWorkId: c.leafWorkId,
      parentWorkId,
      pack,
      callSite: IK_LEAF_RESEARCH_CALL_SITE,
      namePl: c.namePl,
      unit: input.parentUnit,
    });
    if (!gate.ok) {
      blocked.push({
        leafWorkId: c.leafWorkId,
        reasons: ["LEAF_GATE_BLOCK"],
        gateBlock: gate.blockReason,
      });
      continue;
    }

    const cw = getWorkByIdFromStore(input.store, c.leafWorkId);
    if (!cw) {
      blocked.push({
        leafWorkId: c.leafWorkId,
        reasons: ["LEAF_NOT_IN_CATALOG"],
      });
      continue;
    }

    const leafUnit = String(cw.unit || "").trim();
    const parentUnit = String(input.parentUnit || cw.unit || "").trim();
    if (parentUnit && leafUnit && !unitsCompatiblePm(parentUnit, leafUnit)) {
      // Distinct leaf may intentionally use different unit only with qtyFactor conversion evidence.
      // Without hoursPerUnit or explicit conversion → BLOCK.
      if (c.hoursPerUnit == null) {
        blocked.push({
          leafWorkId: c.leafWorkId,
          reasons: ["UNIT_MISMATCH"],
        });
        continue;
      }
    }

    const qty = resolveQtyFactor(c);
    if (!qty.ok || qty.qtyFactor == null || !qty.evidence) {
      blocked.push({
        leafWorkId: c.leafWorkId,
        reasons: [qty.reason ?? "MISSING_QTY_FACTOR_EVIDENCE"],
      });
      continue;
    }

    bindings.push({
      parentWorkId,
      leafWorkId: c.leafWorkId,
      leafNamePl: String(cw.namePl || c.namePl),
      leafUnit,
      packId: pack.packId,
      packVersion: pack.packVersion,
      packLifecycle: pack.lifecycle,
      source: c.source,
      qtyFactor: qty.qtyFactor,
      qtyFactorEvidence: qty.evidence,
      provenance: `pack:${pack.packId}@${pack.packVersion}|${c.source}|gate:${IK_LEAF_RESEARCH_CALL_SITE}`,
      gateCallSite: IK_LEAF_RESEARCH_CALL_SITE,
      invent: false,
      mayPersistBinding: false,
      mayWriteOurRate: false,
    });
  }

  if (bindings.length === 0) {
    const reasons: AuthorizedLaborLeafBindingReason[] = [
      ...new Set(blocked.flatMap((b) => b.reasons)),
    ];
    return exception(reasons.length ? reasons : ["LEAF_GATE_BLOCK"], nowMs, {
      parentWorkId,
      packId: pack.packId,
      blockedCandidates: blocked,
    });
  }

  return {
    decisionId: AUTHORIZED_LABOR_LEAF_BINDING_DECISION_ID,
    ruleId: AUTHORIZED_LABOR_LEAF_BINDING_RULE_ID,
    policyVersion: AUTHORIZED_LABOR_LEAF_BINDING_POLICY_VERSION,
    decision: "AUTHORIZED_LABOR_LEAF_BINDING",
    reasons: [],
    evaluatedAtIso: new Date(nowMs).toISOString(),
    parentWorkId,
    packId: pack.packId,
    bindings,
    blockedCandidates: blocked,
    mayAuthorize: true,
    invent: false,
    persistence: "NONE",
  };
}
