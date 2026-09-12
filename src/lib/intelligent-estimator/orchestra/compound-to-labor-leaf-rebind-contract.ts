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
 * Multi-rule (CLLR-v1.2 mappings): exact scope gates — NEVER parent-global.
 *   0815-05 ceiling · 0815-04 walls · 2006-04 GK · 1205-09 panels ·
 *   1118-09 stone tiles · 0829-03 wall tiles.
 *
 * DOES NOT: invent leaf · fuzzy match · map whole parent · material→labor ·
 * mutate dossier.kosztorys · Owner queue · change OUR RATE · invent labour[] ·
 * remove global baseline packs from shadow/BOM · KNR r-g → PLN.
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
/** Policy id stays CLLR-v1.1 (pack relevance); mapping set extended under same contract. */
export const COMPOUND_LABOR_LEAF_REBIND_POLICY_VERSION = "CLLR-v1.1" as const;

/** Ceiling single-layer gypsum skim — KNR 2-02 0815-05 (CLOSED benchmark · immutable leaf/pack). */
export const CLLR_RULE_CEILING_SINGLE_GYPSUM_SKIM =
  "cllr.ceiling_single_layer_gypsum_skim.0815_05_v1" as const;
export const CLLR_LEAF_0815_05 = "cw.knr.knr-2-02.0815-05.m2" as const;

export const CLLR_RULE_WALLS_DOUBLE_GYPSUM_SKIM =
  "cllr.walls_double_layer_gypsum_skim.0815_04_v1" as const;
export const CLLR_LEAF_0815_04 = "cw.knr.knr-2-02.0815-04.m2" as const;

export const CLLR_RULE_GK_CEILING_SINGLE_ON_GRID =
  "cllr.gk_ceiling_single_on_grid.2006_04_v1" as const;
export const CLLR_LEAF_2006_04 = "cw.knr.knr-2-02.2006-04.m2" as const;

/** KNNR 2 convention (repo SSOT) — not knr-2-02 duplicate. */
export const CLLR_RULE_FLOOR_PANELS =
  "cllr.floor_panels.1205_09_v1" as const;
export const CLLR_LEAF_1205_09 = "cw.knr.knnr-2.1205-09.m2" as const;

export const CLLR_RULE_STONE_TILE_FLOOR =
  "cllr.stone_tile_floor_on_glue.1118_09_v1" as const;
export const CLLR_LEAF_1118_09 = "cw.knr.knr-2-02.1118-09.m2" as const;

export const CLLR_RULE_WALL_TILES_ON_GLUE =
  "cllr.wall_tiles_on_glue.0829_03_v1" as const;
export const CLLR_LEAF_0829_03 = "cw.knr.knr-2-02.0829-03.m2" as const;

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

type CllrScopeRule = {
  ruleId: string;
  tableCode: string;
  leafWorkId: string;
  scopeReason: string;
  /** Exact activity gate — never parent-global. */
  matchScope: (description: string, parentWorkId: string) => boolean;
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

/** Walls double-layer gypsum skim — KNR 2-02 0815-04 (≠ 0815-05 ceiling). */
export function isWallsDoubleLayerGypsumSkimActivity(description: string): boolean {
  const d = String(description || "");
  if (!d.trim()) return false;
  if (/\b0815[\s\-\/]*0?5\b/i.test(d)) return false;
  if (/\b0815[\s\-\/]*0?6\b/i.test(d)) return false;
  if (/sufit/i.test(d) && !/ścian|scian/i.test(d)) return false;
  const hasCode04 = /\b0815[\s\-\/]*0?4\b/i.test(d);
  const hasWallsDouble =
    /ścian|scian/i.test(d)
    && /dwuwarstw/i.test(d)
    && /gład[zź]|gladz|tynk/i.test(d);
  return hasCode04 || hasWallsDouble;
}

/** GK single cladding on ceiling grid — KNR 2-02 2006-04 (≠ silikat package labor). */
export function isGkCeilingSingleOnGridActivity(
  description: string,
  parentWorkId: string,
): boolean {
  const d = String(description || "");
  if (!d.trim()) return false;
  const hasCode = /\b2006[\s\-\/]*0?4\b/i.test(d);
  const hasGkCeiling =
    /okładzin|okladzin|gipsowo-karton|suche tynki/i.test(d)
    && /strop|ruszt/i.test(d);
  if (!(hasCode || hasGkCeiling)) return false;
  // Prefer scianki package parent; allow description-only when already rebound mid-flight.
  if (/scianki|ścianki/i.test(parentWorkId) || hasCode || hasGkCeiling) return true;
  return false;
}

/** Floor panels install — KNNR 2 1205-09 (≠ foam / demontage / stone). */
export function isFloorPanelsActivity(description: string): boolean {
  const d = String(description || "");
  if (!d.trim()) return false;
  if (/rozebranie|demonta/i.test(d)) return false;
  if (/piank|izolacj/i.test(d)) return false;
  if (/kamieni sztucz|gres|1118/i.test(d)) return false;
  const hasCode = /\b1205[\s\-\/]*0?9\b/i.test(d);
  const hasPanels = /posadzka z paneli|paneli podłogowych|prospanel/i.test(d);
  return hasCode || hasPanels;
}

/** Stone / artificial-stone tile floor on glue — KNR 2-02 1118-09. */
export function isStoneTileFloorActivity(description: string): boolean {
  const d = String(description || "");
  if (!d.trim()) return false;
  if (/\b1205[\s\-\/]*0?9\b/i.test(d)) return false;
  if (/paneli podłogowych|prospanel/i.test(d) && !/kamieni|1118/i.test(d)) {
    return false;
  }
  const hasCode = /\b1118[\s\-\/]*0?9\b/i.test(d);
  const hasStone =
    /kamieni sztucz|płytek z kamieni|gres/i.test(d)
    && /posadzk|układ/i.test(d);
  return hasCode || hasStone;
}

/** Wall tiles on glue — KNR 2-02 0829-03 (≠ 0829-01 substrate prep). */
export function isWallTilesOnGlueActivity(description: string): boolean {
  const d = String(description || "");
  if (!d.trim()) return false;
  if (/\b0829[\s\-\/]*0?1\b/i.test(d)) return false;
  if (/przygotowanie podłoża/i.test(d) && !/\b0829[\s\-\/]*0?3\b/i.test(d)) {
    return false;
  }
  const hasCode = /\b0829[\s\-\/]*0?3\b/i.test(d);
  const hasTiles = /licowanie ścian płytkami|licowanie scian plytkami/i.test(d);
  return hasCode || hasTiles;
}

function resolveVerifiedLeafId(tableCode: string): string | null {
  const verified = CHATGPT_KNR_RESEARCH_TPI729_VERIFIED.find(
    (r) => r.tableCode === tableCode,
  );
  if (!verified) return null;
  return buildAutonomousCanonicalWorkId({
    catalogFamilyPrefix: verified.catalogFamilyPrefix,
    tableCode: verified.tableCode,
    unit: verified.unit,
  });
}

/** Ordered rules — more specific first where scopes could overlap. */
export function listCllrScopeRules(): CllrScopeRule[] {
  const leaf05 = resolveVerifiedLeafId("0815-05") || CLLR_LEAF_0815_05;
  const leaf04 = resolveVerifiedLeafId("0815-04") || CLLR_LEAF_0815_04;
  const leaf2006 = resolveVerifiedLeafId("2006-04") || CLLR_LEAF_2006_04;
  const leaf1205 = resolveVerifiedLeafId("1205-09") || CLLR_LEAF_1205_09;
  const leaf1118 = resolveVerifiedLeafId("1118-09") || CLLR_LEAF_1118_09;
  const leaf0829 = resolveVerifiedLeafId("0829-03") || CLLR_LEAF_0829_03;

  return [
    {
      ruleId: CLLR_RULE_CEILING_SINGLE_GYPSUM_SKIM,
      tableCode: "0815-05",
      leafWorkId: leaf05,
      scopeReason: "SCOPE_CEILING_SINGLE_LAYER_GYPSUM_SKIM",
      matchScope: (d) => isCeilingSingleLayerGypsumSkimActivity(d),
    },
    {
      ruleId: CLLR_RULE_WALLS_DOUBLE_GYPSUM_SKIM,
      tableCode: "0815-04",
      leafWorkId: leaf04,
      scopeReason: "SCOPE_WALLS_DOUBLE_LAYER_GYPSUM_SKIM",
      matchScope: (d) => isWallsDoubleLayerGypsumSkimActivity(d),
    },
    {
      ruleId: CLLR_RULE_GK_CEILING_SINGLE_ON_GRID,
      tableCode: "2006-04",
      leafWorkId: leaf2006,
      scopeReason: "SCOPE_GK_CEILING_SINGLE_ON_GRID",
      matchScope: (d, p) => isGkCeilingSingleOnGridActivity(d, p),
    },
    {
      ruleId: CLLR_RULE_FLOOR_PANELS,
      tableCode: "1205-09",
      leafWorkId: leaf1205,
      scopeReason: "SCOPE_FLOOR_PANELS",
      matchScope: (d) => isFloorPanelsActivity(d),
    },
    {
      ruleId: CLLR_RULE_STONE_TILE_FLOOR,
      tableCode: "1118-09",
      leafWorkId: leaf1118,
      scopeReason: "SCOPE_STONE_TILE_FLOOR",
      matchScope: (d) => isStoneTileFloorActivity(d),
    },
    {
      ruleId: CLLR_RULE_WALL_TILES_ON_GLUE,
      tableCode: "0829-03",
      leafWorkId: leaf0829,
      scopeReason: "SCOPE_WALL_TILES_ON_GLUE",
      matchScope: (d) => isWallTilesOnGlueActivity(d),
    },
  ];
}

function selectMatchingRule(
  description: string,
  parentWorkId: string,
): CllrScopeRule | null {
  for (const rule of listCllrScopeRules()) {
    if (rule.matchScope(description, parentWorkId)) return rule;
  }
  return null;
}

const KNOWN_LEAF_IDS = () =>
  new Set(listCllrScopeRules().map((r) => r.leafWorkId));

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
 * Pure evaluator — ACCEPT when compound parent + exact scope rule + leaf in WC
 * + Catalog First CURRENT (OUR RATE already proven · no research inside CLLR).
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
  const knownLeaves = KNOWN_LEAF_IDS();
  if (knownLeaves.has(currentId)) {
    const boundRule =
      listCllrScopeRules().find((r) => r.leafWorkId === currentId) || null;
    const lookup = lookupWorkRate(input.store, currentId, unit, nowMs);
    return {
      decisionId: COMPOUND_LABOR_LEAF_REBIND_DECISION_ID,
      policyVersion: COMPOUND_LABOR_LEAF_REBIND_POLICY_VERSION,
      decision: "COMPOUND_LEAF_REBIND_IDEMPOTENT",
      ruleId: boundRule?.ruleId ?? null,
      parentWorkId,
      leafWorkId: currentId,
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

  const rule = selectMatchingRule(desc, parentWorkId);
  if (!rule) {
    return exception(
      ["SCOPE_NO_CLLR_RULE", "HOLD_PARENT"],
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
      { parentWorkId, ruleId: rule.ruleId },
    );
  }

  const leafWorkId = rule.leafWorkId;
  if (!leafWorkId) {
    return exception(["LEAF_ID_UNRESOLVED"], evaluatedAtIso, {
      parentWorkId,
      ruleId: rule.ruleId,
    });
  }

  const verified = CHATGPT_KNR_RESEARCH_TPI729_VERIFIED.find(
    (r) => r.tableCode === rule.tableCode,
  );
  if (!verified) {
    return exception(["VERIFIED_KNR_RECORD_MISSING"], evaluatedAtIso, {
      parentWorkId,
      ruleId: rule.ruleId,
      leafWorkId,
    });
  }
  const expectedId = buildAutonomousCanonicalWorkId({
    catalogFamilyPrefix: verified.catalogFamilyPrefix,
    tableCode: verified.tableCode,
    unit: verified.unit,
  });
  if (leafWorkId !== expectedId) {
    return exception(["LEAF_ID_DRIFT"], evaluatedAtIso, {
      parentWorkId,
      leafWorkId,
      ruleId: rule.ruleId,
    });
  }

  const leaf = getWorkByIdFromStore(input.store, leafWorkId);
  if (!leaf) {
    return exception(["LEAF_NOT_IN_CATALOG"], evaluatedAtIso, {
      parentWorkId,
      leafWorkId,
      ruleId: rule.ruleId,
    });
  }
  const leafUnit = String(leaf.unit || "").trim();
  if (leafUnit && !unitsCompatiblePm(unit, leafUnit)) {
    return exception(["UNIT_MISMATCH"], evaluatedAtIso, {
      parentWorkId,
      leafWorkId,
      ruleId: rule.ruleId,
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
        ruleId: rule.ruleId,
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
          ruleId: rule.ruleId,
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
    ruleId: rule.ruleId,
    parentWorkId,
    leafWorkId,
    matchConfidence: "high",
    reasons: [
      rule.scopeReason,
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
      "NO_PARENT_GLOBAL_MAP",
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
