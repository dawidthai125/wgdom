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
 * Multi-rule (CLLR-v1.2 + paint/prime): exact scope gates — NEVER parent-global.
 *   0815-05 ceiling · 0815-04 walls · 2006-04 GK · 1205-09 panels ·
 *   1118-09 stone tiles · 0829-03 wall tiles ·
 *   1204-02 walls paint · 1505-01 ceiling paint (COMPOUND adapter) ·
 *   1134-01/02 priming via LABOR→canonical adapter (umbrella).
 *
 * Umbrella: evaluateCanonicalLaborLeafRebind (common engine · two adapters).
 * Primitive: evaluateExactCanonicalLaborLeafRebind.
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
import {
  evaluateExactCanonicalLaborLeafRebind,
  rawIdentityDescription,
} from "@/lib/intelligent-estimator/orchestra/canonical-labor-leaf-rebind-contract";

export const COMPOUND_LABOR_LEAF_REBIND_DECISION_ID =
  "COMPOUND_TO_LABOR_LEAF_REBIND" as const;
/** Policy id stays CLLR-v1.1 (pack relevance); mapping set extended under same contract. */
export const COMPOUND_LABOR_LEAF_REBIND_POLICY_VERSION = "CLLR-v1.1" as const;

/** Umbrella decision id — same persist/apply seam as CLLR; adapters share result shape. */
export const CANONICAL_LABOR_LEAF_REBIND_UMBRELLA_ID =
  "CANONICAL_LABOR_LEAF_REBIND" as const;

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

/** Walls emulsion paint — KNR 4-01 1204-02 (≠ 1204-01 ceilings · ≠ 1505-01). */
export const CLLR_RULE_WALLS_EMULSION_PAINT =
  "cllr.walls_emulsion_paint.1204_02_v1" as const;
export const CLLR_LEAF_1204_02 = "cw.knr.knr-4-01.1204-02.m2" as const;

/** Ceiling emulsion paint smooth plaster — KNR 2-02 1505-01 (≠ 1204-02 walls). */
export const CLLR_RULE_CEILING_EMULSION_PAINT =
  "cllr.ceiling_emulsion_paint.1505_01_v1" as const;
export const CLLR_LEAF_1505_01 = "cw.knr.knr-2-02.1505-01.m2" as const;

/** Horizontal priming — NNRNKB 202 1134-01 (LABOR→canonical · ≠ 1134-02). */
export const CLLR_RULE_PRIMING_HORIZONTAL =
  "cllr.priming_horizontal.1134_01_v1" as const;
export const CLLR_LEAF_1134_01 = "cw.knr.nnrnkb.1134-01.m2" as const;

/** Vertical priming — NNRNKB 202 1134-02 (LABOR→canonical · ≠ 1134-01). */
export const CLLR_RULE_PRIMING_VERTICAL =
  "cllr.priming_vertical.1134_02_v1" as const;
export const CLLR_LEAF_1134_02 = "cw.knr.nnrnkb.1134-02.m2" as const;

/** Non-canonical LABOR parents eligible for LABOR→canonical adapter. */
export const CLLR_LABOR_TO_CANONICAL_SOURCE_ALLOWLIST: ReadonlySet<string> =
  new Set(["legacy-malowanie-m2"]);

/** COMPOUND parents eligible for paint exact-token rebind (≠ parent-global). */
export const CLLR_COMPOUND_PAINT_SOURCE_ALLOWLIST: ReadonlySet<string> = new Set([
  "legacy-gladzie_tynki-m2",
]);

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

/** @deprecated Prefer rawIdentityDescription — normalizer strips KNR table codes. */
function normDesc(line: OfferBoqLine): string {
  return rawIdentityDescription(line) || String(line.normalizedDescription || "");
}

/** Exact table-code token in raw text (policy-gated · not free-text scrape). */
export function hasExactKnrTableCodeToken(
  description: string,
  tableCode: string,
): boolean {
  const code = String(tableCode || "").trim();
  const m = /^(\d{3,4})-(\d{2})$/.exec(code);
  if (!m) return false;
  const major = m[1];
  const minor = m[2];
  const minorNum = String(Number(minor));
  const re = new RegExp(
    `\\b${major}[\\s\\-\\/]*0?${minorNum}\\b`,
    "i",
  );
  return re.test(String(description || ""));
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

/**
 * Walls emulsion paint — KNR 4-01 1204-02.
 * Exact code required (no fuzzy / no normalized-only). Mutual exclusion vs 1505-01 / 1204-01.
 */
export function isWallsEmulsionPaint120402Activity(description: string): boolean {
  const d = String(description || "");
  if (!hasExactKnrTableCodeToken(d, "1204-02")) return false;
  if (hasExactKnrTableCodeToken(d, "1505-01")) return false;
  if (hasExactKnrTableCodeToken(d, "1204-01")) return false;
  return true;
}

/**
 * Ceiling emulsion paint on smooth plaster — KNR 2-02 1505-01.
 * Exact code required. Mutual exclusion vs 1204-02.
 */
export function isCeilingEmulsionPaint150501Activity(description: string): boolean {
  const d = String(description || "");
  if (!hasExactKnrTableCodeToken(d, "1505-01")) return false;
  if (hasExactKnrTableCodeToken(d, "1204-02")) return false;
  return true;
}

/**
 * Horizontal priming — NNRNKB 202 1134-01 (≠ 1134-02).
 * Requires exact 1134-01 + family token 202|NNRNKB. Both 1134 codes → false (ambiguous).
 */
export function isPrimingHorizontal113401Activity(description: string): boolean {
  const d = String(description || "");
  const has01 = hasExactKnrTableCodeToken(d, "1134-01");
  const has02 = hasExactKnrTableCodeToken(d, "1134-02");
  if (has01 && has02) return false;
  if (!has01) return false;
  if (!/\b202\b/i.test(d) && !/nnrnkb/i.test(d)) return false;
  return true;
}

/**
 * Vertical priming — NNRNKB 202 1134-02 (≠ 1134-01).
 * Requires exact 1134-02 + family token. Both 1134 codes → false (ambiguous).
 */
export function isPrimingVertical113402Activity(description: string): boolean {
  const d = String(description || "");
  const has01 = hasExactKnrTableCodeToken(d, "1134-01");
  const has02 = hasExactKnrTableCodeToken(d, "1134-02");
  if (has01 && has02) return false;
  if (!has02) return false;
  if (!/\b202\b/i.test(d) && !/nnrnkb/i.test(d)) return false;
  return true;
}

export function isAmbiguous1134PrimingIdentity(description: string): boolean {
  const d = String(description || "");
  return (
    hasExactKnrTableCodeToken(d, "1134-01")
    && hasExactKnrTableCodeToken(d, "1134-02")
  );
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
  const leaf1204 = resolveVerifiedLeafId("1204-02") || CLLR_LEAF_1204_02;
  const leaf1505 = resolveVerifiedLeafId("1505-01") || CLLR_LEAF_1505_01;

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
    {
      ruleId: CLLR_RULE_WALLS_EMULSION_PAINT,
      tableCode: "1204-02",
      leafWorkId: leaf1204,
      scopeReason: "SCOPE_WALLS_EMULSION_PAINT_1204_02",
      matchScope: (d, p) =>
        CLLR_COMPOUND_PAINT_SOURCE_ALLOWLIST.has(p)
        && isWallsEmulsionPaint120402Activity(d),
    },
    {
      ruleId: CLLR_RULE_CEILING_EMULSION_PAINT,
      tableCode: "1505-01",
      leafWorkId: leaf1505,
      scopeReason: "SCOPE_CEILING_EMULSION_PAINT_1505_01",
      matchScope: (d, p) =>
        CLLR_COMPOUND_PAINT_SOURCE_ALLOWLIST.has(p)
        && isCeilingEmulsionPaint150501Activity(d),
    },
  ];
}

/** LABOR→canonical exact scope rules (never in COMPOUND list). */
export function listLaborToCanonicalScopeRules(): CllrScopeRule[] {
  const leaf113401 = resolveVerifiedLeafId("1134-01") || CLLR_LEAF_1134_01;
  const leaf113402 = resolveVerifiedLeafId("1134-02") || CLLR_LEAF_1134_02;
  return [
    {
      ruleId: CLLR_RULE_PRIMING_HORIZONTAL,
      tableCode: "1134-01",
      leafWorkId: leaf113401,
      scopeReason: "SCOPE_PRIMING_HORIZONTAL_1134_01",
      matchScope: (d) => isPrimingHorizontal113401Activity(d),
    },
    {
      ruleId: CLLR_RULE_PRIMING_VERTICAL,
      tableCode: "1134-02",
      leafWorkId: leaf113402,
      scopeReason: "SCOPE_PRIMING_VERTICAL_1134_02",
      matchScope: (d) => isPrimingVertical113402Activity(d),
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

function selectLaborMatchingRule(
  description: string,
  parentWorkId: string,
): CllrScopeRule | null {
  for (const rule of listLaborToCanonicalScopeRules()) {
    if (rule.matchScope(description, parentWorkId)) return rule;
  }
  return null;
}

const KNOWN_LEAF_IDS = () =>
  new Set(listCllrScopeRules().map((r) => r.leafWorkId));

const KNOWN_LABOR_LEAF_IDS = () =>
  new Set(listLaborToCanonicalScopeRules().map((r) => r.leafWorkId));

function isCanonicalKnrWorkId(id: string): boolean {
  return /^cw\.knr\./i.test(String(id || "").trim());
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

function mapExactToCompoundFacade(
  exact: ReturnType<typeof evaluateExactCanonicalLaborLeafRebind>,
  parentWorkId: string,
  scopeReason?: string,
): CompoundLaborLeafRebindResult {
  const decision: CompoundLaborLeafRebindDecision =
    exact.decision === "CANONICAL_LEAF_REBIND_ACCEPT"
      ? "COMPOUND_LEAF_REBIND_ACCEPT"
      : exact.decision === "CANONICAL_LEAF_REBIND_IDEMPOTENT"
        ? "COMPOUND_LEAF_REBIND_IDEMPOTENT"
        : "COMPOUND_LEAF_REBIND_EXCEPTION";
  const reasons = [
    ...(scopeReason && exact.ok ? [scopeReason] : []),
    ...exact.reason,
    "SOURCE_MODE=LABOR_TO_CANONICAL",
  ];
  return {
    decisionId: COMPOUND_LABOR_LEAF_REBIND_DECISION_ID,
    policyVersion: COMPOUND_LABOR_LEAF_REBIND_POLICY_VERSION,
    decision,
    ruleId: exact.ruleId,
    parentWorkId,
    leafWorkId: exact.targetWorkId,
    matchConfidence: exact.confidence,
    reasons,
    evaluatedAtIso: exact.evaluatedAtIso,
    allbPass: null,
    relevantPackCount: null,
    rateStatus: exact.rateStatus,
    ourRatePln: exact.ourRatePln,
    invent: false,
    ownerRuntimeDependency: 0,
  };
}

/**
 * Adapter B — non-canonical LABOR → canonical labor leaf.
 * Does NOT classify as COMPOUND · does NOT run ALLB · never demotes cw.knr.*.
 */
export function evaluateLaborToCanonicalLeafRebind(input: {
  line: OfferBoqLine;
  store: WorkCatalogStore;
  packs?: readonly TechnologyPack[] | null;
  nowMs?: number;
  parentWorkId?: string | null;
}): CompoundLaborLeafRebindResult {
  const nowMs = input.nowMs ?? Date.now();
  const evaluatedAtIso = new Date(nowMs).toISOString();
  const line = input.line;
  const raw = rawIdentityDescription(line);
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
  const laborLeaves = KNOWN_LABOR_LEAF_IDS();
  if (laborLeaves.has(currentId)) {
    const boundRule =
      listLaborToCanonicalScopeRules().find((r) => r.leafWorkId === currentId)
      || null;
    const lookup = lookupWorkRate(input.store, currentId, unit, nowMs);
    return {
      decisionId: COMPOUND_LABOR_LEAF_REBIND_DECISION_ID,
      policyVersion: COMPOUND_LABOR_LEAF_REBIND_POLICY_VERSION,
      decision: "COMPOUND_LEAF_REBIND_IDEMPOTENT",
      ruleId: boundRule?.ruleId ?? null,
      parentWorkId,
      leafWorkId: currentId,
      matchConfidence: "high",
      reasons: [
        "ALREADY_BOUND_TO_CANONICAL_LEAF",
        "IDEMPOTENT_NOOP",
        "SOURCE_MODE=LABOR_TO_CANONICAL",
      ],
      evaluatedAtIso,
      allbPass: null,
      relevantPackCount: null,
      rateStatus: lookup.status as CompoundLaborLeafRebindResult["rateStatus"],
      ourRatePln: lookup.ourRatePln ?? null,
      invent: false,
      ownerRuntimeDependency: 0,
    };
  }

  // Never demote / hop away from a different canonical leaf
  if (isCanonicalKnrWorkId(currentId) && !laborLeaves.has(currentId)) {
    return exception(
      ["SOURCE_PLANE_UNSUPPORTED", "CANONICAL_DEMOTION_FORBIDDEN"],
      evaluatedAtIso,
      { parentWorkId },
    );
  }

  const sourceParent =
    CLLR_LABOR_TO_CANONICAL_SOURCE_ALLOWLIST.has(parentWorkId)
      ? parentWorkId
      : CLLR_LABOR_TO_CANONICAL_SOURCE_ALLOWLIST.has(currentId)
        ? currentId
        : "";
  if (!sourceParent) {
    return exception(
      ["SOURCE_PLANE_UNSUPPORTED", "LABOR_SOURCE_NOT_ALLOWLISTED"],
      evaluatedAtIso,
      { parentWorkId },
    );
  }

  const plane = classifyEstimatorPricingPlaneWithDiscovery({
    workId: sourceParent,
    unit,
    namePl: raw,
    packs: input.packs ?? [],
    store: input.store,
  }).plane;

  if (plane !== "LABOR") {
    return exception(
      [`SOURCE_PLANE_UNSUPPORTED:${plane}`, "LABOR_ADAPTER_REQUIRES_LABOR"],
      evaluatedAtIso,
      { parentWorkId: sourceParent },
    );
  }

  if (isAmbiguous1134PrimingIdentity(raw)) {
    return exception(
      ["AMBIGUOUS_IDENTITY", "1134_MUTUAL_EXCLUSION", "HOLD"],
      evaluatedAtIso,
      { parentWorkId: sourceParent },
    );
  }

  const rule = selectLaborMatchingRule(raw, sourceParent);
  if (!rule) {
    return exception(
      ["SCOPE_NO_CLLR_RULE", "NO_EXACT_IDENTITY", "HOLD_PARENT"],
      evaluatedAtIso,
      { parentWorkId: sourceParent },
    );
  }

  const verified = CHATGPT_KNR_RESEARCH_TPI729_VERIFIED.find(
    (r) => r.tableCode === rule.tableCode,
  );
  if (!verified) {
    return exception(["VERIFIED_KNR_RECORD_MISSING", "NO_EXACT_IDENTITY"], evaluatedAtIso, {
      parentWorkId: sourceParent,
      ruleId: rule.ruleId,
    });
  }

  if (!hasExactKnrTableCodeToken(raw, rule.tableCode)) {
    return exception(["NO_EXACT_IDENTITY", "CODE_MISMATCH"], evaluatedAtIso, {
      parentWorkId: sourceParent,
      ruleId: rule.ruleId,
    });
  }

  const expectedId = buildAutonomousCanonicalWorkId({
    catalogFamilyPrefix: verified.catalogFamilyPrefix,
    tableCode: verified.tableCode,
    unit: verified.unit,
  });
  if (rule.leafWorkId !== expectedId) {
    return exception(["LEAF_ID_DRIFT", "CODE_MISMATCH"], evaluatedAtIso, {
      parentWorkId: sourceParent,
      leafWorkId: rule.leafWorkId,
      ruleId: rule.ruleId,
    });
  }

  const exact = evaluateExactCanonicalLaborLeafRebind({
    lineId: String(line.lineId || ""),
    currentCatalogWorkId: currentId || null,
    currentPlane: plane,
    rawDescription: raw,
    normalizedDescription: line.normalizedDescription ?? null,
    unit,
    targetCatalogWorkId: rule.leafWorkId,
    targetFamily: verified.catalogFamilyPrefix,
    targetCode: verified.tableCode,
    targetUnit: verified.unit,
    identityAttested: true,
    identityMethod: "ckrk_exact_token_raw_description",
    ruleId: rule.ruleId,
    sourceMode: "LABOR_TO_CANONICAL",
    store: input.store,
    nowMs,
    forbidCanonicalDemotion: true,
  });

  return mapExactToCompoundFacade(exact, sourceParent, rule.scopeReason);
}

/**
 * Umbrella — one engine · two adapters (COMPOUND + LABOR).
 * IdentityPhase should call this instead of COMPOUND-only entry.
 */
export function evaluateCanonicalLaborLeafRebind(input: {
  line: OfferBoqLine;
  store: WorkCatalogStore;
  packs?: readonly TechnologyPack[] | null;
  nowMs?: number;
  parentWorkId?: string | null;
}): CompoundLaborLeafRebindResult {
  const nowMs = input.nowMs ?? Date.now();
  const evaluatedAtIso = new Date(nowMs).toISOString();
  const currentId = String(input.line.catalogWorkId || "").trim();

  if (KNOWN_LEAF_IDS().has(currentId)) {
    return evaluateCompoundToLaborLeafRebind(input);
  }
  if (KNOWN_LABOR_LEAF_IDS().has(currentId)) {
    return evaluateLaborToCanonicalLeafRebind(input);
  }

  const parentWorkId = String(
    input.parentWorkId || input.line.catalogWorkId || "",
  ).trim();
  const unit = String(input.line.unit || "").trim();
  const raw = rawIdentityDescription(input.line);

  if (!parentWorkId) {
    return exception(["NO_PARENT_WORK_ID"], evaluatedAtIso);
  }
  if (!unit) {
    return exception(["NO_UNIT"], evaluatedAtIso, { parentWorkId });
  }

  const plane = classifyEstimatorPricingPlaneWithDiscovery({
    workId: parentWorkId,
    unit,
    namePl: raw,
    packs: input.packs ?? [],
    store: input.store,
  }).plane;

  if (plane === "COMPOUND") {
    return evaluateCompoundToLaborLeafRebind(input);
  }
  if (plane === "LABOR") {
    return evaluateLaborToCanonicalLeafRebind(input);
  }

  return exception(
    [`SOURCE_PLANE_UNSUPPORTED:${plane}`, "HOLD"],
    evaluatedAtIso,
    { parentWorkId },
  );
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
      (w) =>
        !String(w).startsWith("COMPOUND_LEAF_REBIND")
        && !String(w).startsWith("CANONICAL_LEAF_REBIND"),
    ),
  };
}
