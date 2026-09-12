/**
 * Compound → canonical labor leaf rebind (pure · fail-closed).
 *
 * Upgrades OfferBoQ lines bound to a COMPOUND parent toward a validated
 * CatalogWork LABOR leaf when scope + unit + leaf readiness gates PASS.
 *
 * REUSE: owner classification / plane discovery · verified KNR knowledge ·
 * Catalog First lookup · AUTO_G1 apply provenance (`auto_contract`).
 *
 * Pack context (CLLR-v1.1):
 *   GLOBAL / baseline runPacks ≠ CLLR relevant pack context.
 *   ALLB runs only on packs with exact parent/leaf binding in labour[]|steps[].
 *   relevantPacks.length===0 → NO_RELEVANT_PACK_CONTEXT (≠ ALLB_BLOCK).
 *   relevantPacks.length>0 → ALLB REQUIRED (fail-closed preserved).
 *
 * DOES NOT: invent leaf · fuzzy match · map whole parent · material→labor ·
 * mutate dossier.kosztorys · Owner queue · change OUR RATE · invent labour[] ·
 * remove global baseline packs from shadow/BOM.
 */

import type { OfferBoqLine, OfferBoqMatchCandidate } from "@/lib/tender-offer-boq";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { TechnologyPack } from "@/lib/technology-foundation/types";
import { getWorkByIdFromStore } from "@/lib/work-catalog/catalog-work-utils";
import { lookupWorkRate } from "@/lib/work-catalog/work-rate-lookup";
import { buildAutonomousCanonicalWorkId } from "@/lib/work-catalog/autonomous-canonical-leaf-create";
import { CHATGPT_KNR_RESEARCH_TPI729_VERIFIED } from "@/lib/intelligent-estimator/knr-knowledge/chatgpt-knr-research-knowledge-data";
import { classifyEstimatorPricingPlaneWithDiscovery } from "@/lib/intelligent-estimator/autonomous-unknown-plane-discovery";
import { evaluateAuthorizedLaborLeafBinding } from "@/lib/intelligent-estimator/authorized-labor-leaf-binding";
import { AUTO_G1_MATCH_METHOD } from "@/lib/intelligent-estimator/orchestra/auto-g1-accept-contract";
import { unitsCompatible as unitsCompatiblePm } from "@/lib/price-intelligence/market-material-research-provider";

export const COMPOUND_LABOR_LEAF_REBIND_DECISION_ID =
  "COMPOUND_TO_LABOR_LEAF_REBIND" as const;
export const COMPOUND_LABOR_LEAF_REBIND_POLICY_VERSION = "CLLR-v1.1" as const;

/** Ceiling single-layer gypsum skim — KNR 2-02 0815-05 (generic scope, not TPI-hardcode). */
export const CLLR_RULE_CEILING_SINGLE_GYPSUM_SKIM =
  "cllr.ceiling_single_layer_gypsum_skim.0815_05_v1" as const;

export const CLLR_LEAF_0815_05 = "cw.knr.knr-2-02.0815-05.m2" as const;

export type CompoundLaborLeafRebindDecision =
  | "COMPOUND_LEAF_REBIND_ACCEPT"
  | "COMPOUND_LEAF_REBIND_EXCEPTION"
  | "COMPOUND_LEAF_REBIND_IDEMPOTENT";

export type CompoundLaborLeafRebindResult = {
  decisionId: typeof COMPOUND_LABOR_LEAF_REBIND_DECISION_ID;
  policyVersion: typeof COMPOUND_LABOR_LEAF_REBIND_POLICY_VERSION;
  decision: CompoundLaborLeafRebindDecision;
  ruleId: string | null;
  parentWorkId: string | null;
  leafWorkId: string | null;
  matchConfidence: "high" | "medium" | null;
  reasons: string[];
  evaluatedAtIso: string;
  allbPass: boolean | null;
  /** Packs after exact parent/leaf relevance filter (≠ raw runPacks). */
  relevantPackCount: number | null;
  rateStatus: "CURRENT" | "STALE" | "MISSING" | null;
  ourRatePln: number | null;
  invent: false;
  ownerRuntimeDependency: 0;
};

/**
 * Exact TechnologyPack relevance for CLLR/ALLB — no fuzzy / semantic invent.
 *
 * Relevant iff labourKey or steps.catalogWorkId equals parentWorkId and/or leafWorkId.
 * materials[] alone never makes a pack relevant.
 */
export function selectCllrRelevantTechnologyPacks(input: {
  packs: readonly TechnologyPack[] | null | undefined;
  parentWorkId: string;
  leafWorkId: string;
}): TechnologyPack[] {
  const parent = String(input.parentWorkId || "").trim();
  const leaf = String(input.leafWorkId || "").trim();
  if (!parent && !leaf) return [];
  const out: TechnologyPack[] = [];
  for (const pack of input.packs || []) {
    if (!pack) continue;
    const labourHit = (pack.labour || []).some((l) => {
      const key = String(l.labourKey || "").trim();
      return Boolean(key) && (key === parent || key === leaf);
    });
    const stepHit = (pack.steps || []).some((s) => {
      const id = String(s.catalogWorkId || "").trim();
      return Boolean(id) && (id === parent || id === leaf);
    });
    if (labourHit || stepHit) out.push(pack);
  }
  return out;
}

function normDesc(line: OfferBoqLine): string {
  return String(line.normalizedDescription || line.description || "");
}

/**
 * Exact scope gate — ceiling + single-layer gypsum skim.
 * MUST reject walls (0815-04) and double-layer ceilings (0815-06).
 */
export function isCeilingSingleLayerGypsumSkimActivity(description: string): boolean {
  const d = String(description || "");
  if (!d.trim()) return false;
  if (/\b0815[\s\-\/]*0?4\b/i.test(d)) return false;
  if (/\b0815[\s\-\/]*0?6\b/i.test(d)) return false;
  if (/ścian|scian/i.test(d) && !/sufit/i.test(d)) return false;
  if (/dwuwarstw/i.test(d) && !(/sufit/i.test(d) && /jednowarstw/i.test(d))) {
    return false;
  }

  const hasCode05 = /\b0815[\s\-\/]*0?5\b/i.test(d);
  const hasCeilingSingle =
    /sufit/i.test(d)
    && /jednowarstw/i.test(d)
    && /gład[zź]|gladz/i.test(d);
  return hasCode05 || hasCeilingSingle;
}

function exception(
  reasons: string[],
  evaluatedAtIso: string,
  extra?: Partial<CompoundLaborLeafRebindResult>,
): CompoundLaborLeafRebindResult {
  return {
    decisionId: COMPOUND_LABOR_LEAF_REBIND_DECISION_ID,
    policyVersion: COMPOUND_LABOR_LEAF_REBIND_POLICY_VERSION,
    decision: "COMPOUND_LEAF_REBIND_EXCEPTION",
    ruleId: null,
    parentWorkId: null,
    leafWorkId: null,
    matchConfidence: null,
    reasons,
    evaluatedAtIso,
    allbPass: null,
    relevantPackCount: null,
    rateStatus: null,
    ourRatePln: null,
    invent: false,
    ownerRuntimeDependency: 0,
    ...extra,
  };
}

/**
 * Pure evaluator — ACCEPT only when compound parent + exact ceiling-single scope
 * + durable leaf in WC + Catalog First CURRENT (OUR RATE already proven).
 */
export function evaluateCompoundToLaborLeafRebind(input: {
  line: OfferBoqLine;
  store: WorkCatalogStore;
  packs?: readonly TechnologyPack[] | null;
  nowMs?: number;
  parentWorkId?: string | null;
}): CompoundLaborLeafRebindResult {
  const nowMs = input.nowMs ?? Date.now();
  const evaluatedAtIso = new Date(nowMs).toISOString();
  const line = input.line;
  const desc = normDesc(line);
  const parentWorkId = String(
    input.parentWorkId || line.catalogWorkId || "",
  ).trim();

  if (!parentWorkId) {
    return exception(["NO_PARENT_WORK_ID"], evaluatedAtIso);
  }

  const unit = String(line.unit || "").trim();
  if (!unit) {
    return exception(["NO_UNIT"], evaluatedAtIso, { parentWorkId });
  }

  const currentId = String(line.catalogWorkId || "").trim();
  if (currentId === CLLR_LEAF_0815_05) {
    const lookup = lookupWorkRate(input.store, CLLR_LEAF_0815_05, unit, nowMs);
    return {
      decisionId: COMPOUND_LABOR_LEAF_REBIND_DECISION_ID,
      policyVersion: COMPOUND_LABOR_LEAF_REBIND_POLICY_VERSION,
      decision: "COMPOUND_LEAF_REBIND_IDEMPOTENT",
      ruleId: CLLR_RULE_CEILING_SINGLE_GYPSUM_SKIM,
      parentWorkId,
      leafWorkId: CLLR_LEAF_0815_05,
      matchConfidence: "high",
      reasons: ["ALREADY_BOUND_TO_CANONICAL_LEAF", "IDEMPOTENT_NOOP"],
      evaluatedAtIso,
      allbPass: null,
      relevantPackCount: null,
      rateStatus: lookup.status as CompoundLaborLeafRebindResult["rateStatus"],
      ourRatePln: lookup.ourRatePln ?? null,
      invent: false,
      ownerRuntimeDependency: 0,
    };
  }

  if (!isCeilingSingleLayerGypsumSkimActivity(desc)) {
    return exception(
      ["SCOPE_NOT_CEILING_SINGLE_LAYER_GYPSUM_SKIM", "HOLD_PARENT"],
      evaluatedAtIso,
      { parentWorkId },
    );
  }

  const plane = classifyEstimatorPricingPlaneWithDiscovery({
    workId: parentWorkId,
    unit,
    namePl: desc,
    packs: input.packs ?? [],
    store: input.store,
  }).plane;

  if (plane !== "COMPOUND") {
    return exception(
      [`PARENT_NOT_COMPOUND:${plane}`, "HOLD"],
      evaluatedAtIso,
      { parentWorkId },
    );
  }

  const verified = CHATGPT_KNR_RESEARCH_TPI729_VERIFIED.find(
    (r) => r.tableCode === "0815-05",
  );
  if (!verified) {
    return exception(["VERIFIED_KNR_RECORD_MISSING"], evaluatedAtIso, {
      parentWorkId,
    });
  }
  const leafWorkId = buildAutonomousCanonicalWorkId({
    catalogFamilyPrefix: verified.catalogFamilyPrefix,
    tableCode: verified.tableCode,
    unit: verified.unit,
  });
  if (leafWorkId !== CLLR_LEAF_0815_05) {
    return exception(["LEAF_ID_DRIFT"], evaluatedAtIso, {
      parentWorkId,
      leafWorkId,
    });
  }

  const leaf = getWorkByIdFromStore(input.store, leafWorkId);
  if (!leaf) {
    return exception(["LEAF_NOT_IN_CATALOG"], evaluatedAtIso, {
      parentWorkId,
      leafWorkId,
    });
  }
  const leafUnit = String(leaf.unit || "").trim();
  if (leafUnit && !unitsCompatiblePm(unit, leafUnit)) {
    return exception(["UNIT_MISMATCH"], evaluatedAtIso, {
      parentWorkId,
      leafWorkId,
    });
  }

  const lookup = lookupWorkRate(input.store, leafWorkId, leafUnit || unit, nowMs);
  if (lookup.status !== "CURRENT" || !(Number(lookup.ourRatePln) > 0)) {
    return exception(
      [
        `LEAF_RATE_${lookup.status}`,
        "OUR_RATE_MUST_BE_CURRENT_NO_RESEARCH",
      ],
      evaluatedAtIso,
      {
        parentWorkId,
        leafWorkId,
        rateStatus: lookup.status as CompoundLaborLeafRebindResult["rateStatus"],
        ourRatePln: lookup.ourRatePln ?? null,
      },
    );
  }

  let allbPass: boolean | null = null;
  const runPacks = (input.packs || []).filter(Boolean);
  const relevantPacks = selectCllrRelevantTechnologyPacks({
    packs: runPacks,
    parentWorkId,
    leafWorkId,
  });
  const relevantPackCount = relevantPacks.length;
  // GLOBAL baseline / unrelated runPacks must NOT force ALLB.
  // ALLB is required only when at least one pack exactly binds parent or leaf.
  if (relevantPackCount > 0) {
    let anyPass = false;
    for (const pack of relevantPacks) {
      const allb = evaluateAuthorizedLaborLeafBinding({
        parentWorkId,
        pack,
        store: input.store,
        parentUnit: unit,
        parentNamePl: desc,
        leafWorkId,
        nowMs,
      });
      if (
        allb.decision === "AUTHORIZED_LABOR_LEAF_BINDING"
        && allb.bindings.some((b) => b.leafWorkId === leafWorkId)
      ) {
        anyPass = true;
        break;
      }
    }
    allbPass = anyPass;
    if (!anyPass) {
      return exception(
        ["ALLB_BLOCK", "NO_AUTHORIZED_LABOUR_LEAF_IN_PACKS"],
        evaluatedAtIso,
        {
          parentWorkId,
          leafWorkId,
          allbPass: false,
          relevantPackCount,
          rateStatus: "CURRENT",
          ourRatePln: lookup.ourRatePln ?? null,
        },
      );
    }
  }

  return {
    decisionId: COMPOUND_LABOR_LEAF_REBIND_DECISION_ID,
    policyVersion: COMPOUND_LABOR_LEAF_REBIND_POLICY_VERSION,
    decision: "COMPOUND_LEAF_REBIND_ACCEPT",
    ruleId: CLLR_RULE_CEILING_SINGLE_GYPSUM_SKIM,
    parentWorkId,
    leafWorkId,
    matchConfidence: "high",
    reasons: [
      "SCOPE_CEILING_SINGLE_LAYER_GYPSUM_SKIM",
      "PARENT_COMPOUND",
      "LEAF_IN_CATALOG",
      "CATALOG_FIRST_CURRENT",
      `OUR_RATE=${lookup.ourRatePln}`,
      allbPass === true
        ? "ALLB_PASS"
        : runPacks.length > 0
          ? "NO_RELEVANT_PACK_CONTEXT"
          : "ALLB_OPTIONAL_SKIPPED_NO_PACK",
      "NO_FUZZY",
      "NO_OWNER_QUEUE",
    ],
    evaluatedAtIso,
    allbPass,
    relevantPackCount,
    rateStatus: "CURRENT",
    ourRatePln: lookup.ourRatePln ?? null,
    invent: false,
    ownerRuntimeDependency: 0,
  };
}

/**
 * Apply rebind onto OfferBoq line (pure). Provenance = auto_contract (AUTO_G1 family).
 */
export function applyCompoundLaborLeafRebindToLine(
  line: OfferBoqLine,
  result: CompoundLaborLeafRebindResult,
): OfferBoqLine {
  if (
    result.decision !== "COMPOUND_LEAF_REBIND_ACCEPT"
    || !result.leafWorkId
  ) {
    return line;
  }
  const rationale = [
    `COMPOUND_LEAF_REBIND rule=${result.ruleId}`,
    ...result.reasons,
  ].join(" · ");
  const primary: OfferBoqMatchCandidate = {
    catalogWorkId: result.leafWorkId,
    workNamePl: result.leafWorkId,
    workCategory: "",
    tradeId: null,
    score: 0,
    role: "primary",
    matchedBy: AUTO_G1_MATCH_METHOD,
    matchConfidence: result.matchConfidence ?? "high",
    rationale,
  };
  const parentId = result.parentWorkId;
  const rest = (line.candidateMatches ?? []).filter(
    (c) => c.catalogWorkId !== result.leafWorkId,
  );
  if (
    parentId
    && parentId !== result.leafWorkId
    && !rest.some((c) => c.catalogWorkId === parentId)
  ) {
    rest.unshift({
      catalogWorkId: parentId,
      workNamePl: parentId,
      workCategory: "",
      tradeId: null,
      score: 0,
      role: "secondary",
      matchedBy: line.matchMethod || "catalog_map",
      matchConfidence: "medium",
      rationale: "prior_compound_parent",
    });
  }
  return {
    ...line,
    catalogWorkId: result.leafWorkId,
    matchMethod: AUTO_G1_MATCH_METHOD,
    matchedBy: AUTO_G1_MATCH_METHOD,
    matchConfidence: result.matchConfidence ?? "high",
    aiConfidence: result.matchConfidence ?? "high",
    aiRationale: rationale,
    candidateMatches: [primary, ...rest],
    warnings: (line.warnings ?? []).filter(
      (w) => !String(w).startsWith("COMPOUND_LEAF_REBIND"),
    ),
  };
}
