/**
 * Autonomous UNKNOWN plane discovery — orchestration seam (fail-closed).
 *
 * REUSE only:
 *  - classifyEstimatorPricingPlane (A1 Owner map / mat.*)
 *  - isExplicitLaborOnlyWork / isExplicitMaterialSupplyWork
 *  - deriveResearchClassification + findCatalogWork (costSplit)
 *  - findTechnologyPacksForWorkId (TechnologyPack binding)
 *  - discoverLaborLeafIdentities + evaluateAutoLaborLeafIdentityEligibility (GO33)
 *
 * ZERO namePl keyword invent as plane authority.
 * ZERO rate/price as classification evidence.
 * ZERO HTTP / Accept / Catalog write / Owner map mutation.
 * Persistence: ephemeral candidate result only (this module).
 */

import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import type { TechnologyPack } from "@/lib/technology-foundation";
import {
  findTechnologyPacksForWorkId,
  LEAF_RESEARCH_PACK_LIFECYCLES,
} from "@/lib/tender-position-cost/bom-technology-adapter";
import { isExplicitLaborOnlyWork } from "@/lib/tender-position-cost/labor-only-classification";
import { isExplicitMaterialSupplyWork } from "@/lib/tender-position-cost/material-supply-classification";
import {
  discoverLaborLeafIdentities,
  evaluateAutoLaborLeafIdentityEligibility,
} from "@/lib/work-catalog/labor-leaf-identity-discovery";
import {
  discoverIdentityLeafCandidates,
  parseAutonomousCanonicalKnrWorkId,
} from "@/lib/work-catalog/autonomous-identity-discovery-adapter";
import {
  IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT,
  IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
} from "@/lib/work-catalog/ik-owner-create-a09-package-catalog";
import {
  buildSepaKnr1301PomiarCatalogWork,
  getSepaKnr1301WorkSpec,
  isSepaKnr1301PomiarWorkId,
} from "@/lib/work-catalog/ik-owner-create-sepa-1301-pomiar-catalog";
import { listActiveWorksForRegion } from "@/lib/work-catalog/catalog-work-utils";
import { classifyEstimatorPricingPlaneA1 } from "./classification-a1-core";
import type {
  EstimatorClassifyInput,
  EstimatorClassifyResult,
  EstimatorPricingPlane,
} from "./classification-types";
import { getOwnerClassificationPlane } from "./owner-classification-map";

const PACKAGE_RATIO_THRESHOLD = 0.25;

function findCatalogWorkLocal(
  store: WorkCatalogStore | null | undefined,
  workId: string,
): CatalogWork | null {
  if (!store?.catalogs) return null;
  const id = String(workId || "").trim();
  for (const region of Object.keys(store.catalogs)) {
    const w = store.catalogs[region]?.works?.find((x) => x.id === id);
    if (w) return w;
  }
  try {
    return listActiveWorksForRegion(store).find((x) => x.id === id) || null;
  } catch {
    return null;
  }
}

/** Trusted costSplit → plane (REUSE semantics from GO30 research profile; no namePl invent). */
function planeFromCostSplit(
  workId: string,
  catalogWork: CatalogWork | null,
): { plane: EstimatorPricingPlane; detail: string } | null {
  const costSplit =
    catalogWork?.costSplit ??
    (workId === IK_OWNER_CREATE_A09_PACKAGE_WORK_ID
      ? { ...IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT }
      : null);
  if (!costSplit) return null;
  const labor = Number(costSplit.laborRatio);
  const material = Number(costSplit.materialRatio);
  if (
    labor >= PACKAGE_RATIO_THRESHOLD &&
    material >= PACKAGE_RATIO_THRESHOLD
  ) {
    return {
      plane: "COMPOUND",
      detail: `costSplit labor=${labor} material=${material} ≥${PACKAGE_RATIO_THRESHOLD}`,
    };
  }
  if (labor === 1 && material === 0) {
    return { plane: "LABOR", detail: "costSplit labor=1 material=0" };
  }
  if (material === 1 && labor === 0) {
    return { plane: "MATERIAL", detail: "costSplit material=1 labor=0" };
  }
  return null;
}

export type AutonomousDiscoveryOutcome =
  | "RESOLVED_AUTONOMOUSLY"
  | "DISCOVERY_NEEDS_RESEARCH"
  | "INSUFFICIENT_DATA"
  | "AMBIGUOUS_OWNER_EXCEPTION"
  | "CONFLICT_OWNER_EXCEPTION"
  | "NO_LEGAL_PATH";

export type AutonomousDiscoveryDownstreamRoute =
  | "LABOR_RESEARCH"
  | "AUT_MAT"
  | "COMPOUND_LEAF"
  | "TRANSPORT_EXCEPTION"
  | "OWNER_EXCEPTION"
  | "NONE";

export type AutonomousDiscoverySourceHit = {
  source:
    | "OWNER_MAP_DEFINITE"
    | "MATERIAL_KEY"
    | "LABOR_ONLY_ALLOWLIST"
    | "MATERIAL_SUPPLY_ALLOWLIST"
    | "CATALOG_COST_SPLIT"
    | "TECHNOLOGY_PACK"
    | "GO33_LEAF_DISCOVERY"
    | "AIDISC_LEAF_DISCOVERY"
    | "KNR_STRUCTURED_ID"
    | "ACLC_CANONICAL_LEAF"
    | "TRANSPORT_SPECIALTY_ID"
    | "VAGUE_LEGACY_HOLD";
  detail: string;
  proposedPlane: EstimatorPricingPlane | null;
};

export type ResolveUnknownPricingPlaneInput = EstimatorClassifyInput & {
  catalogWork?: CatalogWork | null;
  store?: WorkCatalogStore | null;
  packs?: TechnologyPack[] | null;
  /** Default true when store/workId available. */
  enableGo33?: boolean;
  /**
   * After identity research GO: when RESOLVED and no classification evidence,
   * fail-closed INSUFFICIENT_DATA (not DISCOVERY_NEEDS_RESEARCH).
   */
  identityStatus?: "RESOLVED" | "UNRESOLVED" | null;
};

export type ResolveUnknownPricingPlaneResult = {
  classify: EstimatorClassifyResult;
  baseline: EstimatorClassifyResult;
  outcome: AutonomousDiscoveryOutcome;
  downstreamRoute: AutonomousDiscoveryDownstreamRoute;
  sources: AutonomousDiscoverySourceHit[];
  confidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  discoveryRan: true;
  persistence: "EPHEMERAL_ONLY";
  go33?: {
    eligibility: string;
    strongCount: number;
    plausibleCount: number;
  } | null;
};

function trimOrNull(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function isTransportSpecialtyWorkId(workId: string): boolean {
  return /transport_utylizacja/i.test(workId);
}

function isKnrStructuredWorkId(workId: string): boolean {
  return /^(knr-|knnr-|cw\.)/i.test(workId);
}

function isGo33ApplicableParent(workId: string): boolean {
  // GO33 pool is GK/package leaf discovery — not applicable to arbitrary legacy buckets.
  return (
    /pakiet|legacy-gk|plyta.?gk|scianki|g177|gk-technology|gk_partition/i.test(workId) ||
    workId.includes("cc-w2-plyta-gk") ||
    workId.includes("p2b-scianka-gk") ||
    workId.includes("p2b-sufit-podwieszany-gk")
  );
}

function isVagueLegacyBucket(workId: string): boolean {
  return (
    workId === "legacy-roboty_ogolnobudowlane-m2" ||
    workId === "legacy-roboty_ogolnobudowlane-mb" ||
    workId === "legacy-roboty_ogolnobudowlane-szt"
  );
}

function routeForPlane(
  plane: EstimatorPricingPlane,
  workId: string | null,
): AutonomousDiscoveryDownstreamRoute {
  if (workId && isTransportSpecialtyWorkId(workId)) return "TRANSPORT_EXCEPTION";
  switch (plane) {
    case "LABOR":
      return "LABOR_RESEARCH";
    case "MATERIAL":
      return "AUT_MAT";
    case "COMPOUND":
      return "COMPOUND_LEAF";
    case "UNKNOWN":
    default:
      return "OWNER_EXCEPTION";
  }
}

function flagsFor(plane: EstimatorPricingPlane): Pick<
  EstimatorClassifyResult,
  | "allowLaborCatalogLookup"
  | "allowLaborResearch"
  | "allowMaterialCatalogLookup"
  | "allowMaterialResearch"
  | "hold"
  | "holdKind"
> {
  switch (plane) {
    case "LABOR":
      return {
        allowLaborCatalogLookup: true,
        allowLaborResearch: true,
        allowMaterialCatalogLookup: false,
        allowMaterialResearch: false,
        hold: false,
        holdKind: "NONE",
      };
    case "MATERIAL":
      return {
        allowLaborCatalogLookup: false,
        allowLaborResearch: false,
        allowMaterialCatalogLookup: true,
        allowMaterialResearch: true,
        hold: false,
        holdKind: "NONE",
      };
    case "COMPOUND":
      return {
        allowLaborCatalogLookup: false,
        allowLaborResearch: false,
        allowMaterialCatalogLookup: false,
        allowMaterialResearch: false,
        hold: true,
        holdKind: "COMPOUND",
      };
    case "UNKNOWN":
    default:
      return {
        allowLaborCatalogLookup: false,
        allowLaborResearch: false,
        allowMaterialCatalogLookup: false,
        allowMaterialResearch: false,
        hold: true,
        holdKind: "UNKNOWN",
      };
  }
}

function buildResolvedClassify(
  baseline: EstimatorClassifyResult,
  plane: EstimatorPricingPlane,
  reasonPl: string,
): EstimatorClassifyResult {
  return {
    plane,
    reasonCode: plane === "UNKNOWN" ? "DISCOVERY_HELD" : "DISCOVERY_RESOLVED",
    reasonPl,
    workId: baseline.workId,
    materialKey: baseline.materialKey,
    namePl: baseline.namePl,
    unit: baseline.unit,
    ...flagsFor(plane),
    classifiedBy: plane === "UNKNOWN" ? "fallback_unknown" : "autonomous_discovery",
    schemaVersion: 1,
  };
}

/**
 * Canonical UNKNOWN → discovery → plane resolution (fail-closed).
 * Owner map definite LABOR/MATERIAL/COMPOUND is preserved as override.
 */
export function resolveUnknownPricingPlane(
  input: ResolveUnknownPricingPlaneInput,
): ResolveUnknownPricingPlaneResult {
  const baseline = classifyEstimatorPricingPlaneA1(input);
  const sources: AutonomousDiscoverySourceHit[] = [];
  const workId = trimOrNull(input.workId) ?? baseline.workId;

  const ownerPlane = workId ? getOwnerClassificationPlane(workId) : null;

  // 1) Owner map / mat.* definite override (not explicit UNKNOWN)
  if (
    baseline.plane !== "UNKNOWN" &&
    (baseline.classifiedBy === "owner_seed" || baseline.classifiedBy === "material_key") &&
    ownerPlane !== "UNKNOWN"
  ) {
    sources.push({
      source: baseline.classifiedBy === "material_key" ? "MATERIAL_KEY" : "OWNER_MAP_DEFINITE",
      detail: baseline.reasonPl,
      proposedPlane: baseline.plane,
    });
    return {
      classify: baseline,
      baseline,
      outcome: "RESOLVED_AUTONOMOUSLY",
      downstreamRoute: routeForPlane(baseline.plane, workId),
      sources,
      confidence: "HIGH",
      discoveryRan: true,
      persistence: "EPHEMERAL_ONLY",
      go33: null,
    };
  }

  if (ownerPlane === "UNKNOWN") {
    sources.push({
      source: "OWNER_MAP_DEFINITE",
      detail: "Owner map explicit UNKNOWN — discovery may resolve only with trusted evidence",
      proposedPlane: "UNKNOWN",
    });
  }

  if (workId && isTransportSpecialtyWorkId(workId)) {
    sources.push({
      source: "TRANSPORT_SPECIALTY_ID",
      detail: "transport_utylizacja specialty — not labor-rate plane invent",
      proposedPlane: null,
    });
    return {
      classify: buildResolvedClassify(
        baseline,
        "UNKNOWN",
        "TRANSPORT specialty — no autonomous LABOR plane; exception path",
      ),
      baseline,
      outcome: "NO_LEGAL_PATH",
      downstreamRoute: "TRANSPORT_EXCEPTION",
      sources,
      confidence: "HIGH",
      discoveryRan: true,
      persistence: "EPHEMERAL_ONLY",
      go33: null,
    };
  }

  if (workId && isVagueLegacyBucket(workId)) {
    sources.push({
      source: "VAGUE_LEGACY_HOLD",
      detail: "Vague legacy bucket — IDENTITY_SEMANTIC_HOLD",
      proposedPlane: null,
    });
    return {
      classify: buildResolvedClassify(
        baseline,
        "UNKNOWN",
        "Vague legacy bucket — fail-closed Owner exception",
      ),
      baseline,
      outcome: "AMBIGUOUS_OWNER_EXCEPTION",
      downstreamRoute: "OWNER_EXCEPTION",
      sources,
      confidence: "HIGH",
      discoveryRan: true,
      persistence: "EPHEMERAL_ONLY",
      go33: null,
    };
  }

  const proposals: Array<{
    plane: EstimatorPricingPlane;
    source: AutonomousDiscoverySourceHit["source"];
    detail: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
  }> = [];

  // 2) Owner-approved allowlists (not name heuristics)
  if (workId && isExplicitLaborOnlyWork(workId)) {
    proposals.push({
      plane: "LABOR",
      source: "LABOR_ONLY_ALLOWLIST",
      detail: "OWNER_APPROVED_LABOR_ONLY_WORK_IDS",
      confidence: "HIGH",
    });
  }
  if (workId && isExplicitMaterialSupplyWork(workId)) {
    proposals.push({
      plane: "MATERIAL",
      source: "MATERIAL_SUPPLY_ALLOWLIST",
      detail: "OWNER_APPROVED_MATERIAL_SUPPLY_WORK_IDS",
      confidence: "HIGH",
    });
  }

  // 2b) ACLC-v1 canonical leaf (cw.knr.family.code.unit) — Work Catalog labor identity.
  // Structural: ACLC creates rate-binding leaves, not material hosts / not invent rate.
  // TechnologyPack singleton may still propose COMPOUND → conflict fail-closed (correct).
  if (workId && parseAutonomousCanonicalKnrWorkId(workId)) {
    proposals.push({
      plane: "LABOR",
      source: "ACLC_CANONICAL_LEAF",
      detail:
        "ACLC-v1 canonical Work Catalog leaf (cw.knr.*) — LABOR plane for KEEP-4/AUT-R1 research (≠ invent OUR RATE)",
      confidence: "HIGH",
    });
  }

  // 3) Catalog costSplit (trusted numeric split only)
  //    + Owner CREATE SSOT drafts as ephemeral classification evidence (no catalog write)
  let catalogWork =
    input.catalogWork ??
    (input.store && workId ? findCatalogWorkLocal(input.store, workId) : null);
  if (!catalogWork && workId && isSepaKnr1301PomiarWorkId(workId)) {
    const sepaSpec = getSepaKnr1301WorkSpec(workId);
    if (sepaSpec) {
      catalogWork = buildSepaKnr1301PomiarCatalogWork(
        sepaSpec,
        new Date().toISOString(),
      );
      sources.push({
        source: "CATALOG_COST_SPLIT",
        detail:
          "SEPA Owner CREATE SSOT ephemeral costSplit (labor=1) — classification evidence · no catalog persist",
        proposedPlane: "LABOR",
      });
    }
  }
  if (workId) {
    const fromSplit = planeFromCostSplit(workId, catalogWork);
    if (fromSplit) {
      proposals.push({
        plane: fromSplit.plane,
        source: "CATALOG_COST_SPLIT",
        detail: fromSplit.detail,
        confidence: "HIGH",
      });
    }
  }

  // 4) TechnologyPack binding → COMPOUND
  if (workId && input.packs && input.packs.length > 0) {
    const packs = findTechnologyPacksForWorkId(
      workId,
      input.packs,
      LEAF_RESEARCH_PACK_LIFECYCLES,
    );
    if (packs.length === 1) {
      proposals.push({
        plane: "COMPOUND",
        source: "TECHNOLOGY_PACK",
        detail: `pack ${packs[0]!.packId}@${packs[0]!.packVersion}`,
        confidence: "HIGH",
      });
    } else if (packs.length > 1) {
      sources.push({
        source: "TECHNOLOGY_PACK",
        detail: `multiple packs (${packs.length}) — conflict`,
        proposedPlane: "COMPOUND",
      });
      return {
        classify: buildResolvedClassify(
          baseline,
          "UNKNOWN",
          "Multiple TechnologyPack bindings — conflict Owner exception",
        ),
        baseline,
        outcome: "CONFLICT_OWNER_EXCEPTION",
        downstreamRoute: "OWNER_EXCEPTION",
        sources,
        confidence: "HIGH",
        discoveryRan: true,
        persistence: "EPHEMERAL_ONLY",
        go33: null,
      };
    }
  }

  // 5) GO33 leaf discovery — only for GK/package-applicable parents
  let go33Meta: ResolveUnknownPricingPlaneResult["go33"] = null;
  const enableGo33 =
    input.enableGo33 !== false && Boolean(workId) && isGo33ApplicableParent(workId!);
  if (enableGo33 && workId) {
    const go33 = discoverLaborLeafIdentities({
      store: input.store ?? null,
      parentWorkId: workId,
    });
    const eligibility = evaluateAutoLaborLeafIdentityEligibility(go33.candidates);
    const strong = go33.candidates.filter((c) => c.identityClass === "STRONG_CANDIDATE");
    const plausible = go33.candidates.filter((c) => c.identityClass === "PLAUSIBLE_CANDIDATE");
    go33Meta = {
      eligibility: eligibility.status,
      strongCount: strong.length,
      plausibleCount: plausible.length,
    };
    sources.push({
      source: "GO33_LEAF_DISCOVERY",
      detail: `eligibility=${eligibility.status}; strong=${strong.length}; plausible=${plausible.length}`,
      proposedPlane: null,
    });

    if (eligibility.status === "AMBIGUOUS" || eligibility.status === "CONFLICT") {
      return {
        classify: buildResolvedClassify(
          baseline,
          "UNKNOWN",
          `GO33 ${eligibility.status} — Owner exception`,
        ),
        baseline,
        outcome:
          eligibility.status === "CONFLICT"
            ? "CONFLICT_OWNER_EXCEPTION"
            : "AMBIGUOUS_OWNER_EXCEPTION",
        downstreamRoute: "OWNER_EXCEPTION",
        sources,
        confidence: "HIGH",
        discoveryRan: true,
        persistence: "EPHEMERAL_ONLY",
        go33: go33Meta,
      };
    }

    if (eligibility.status === "AUTO_ELIGIBLE_PENDING_POLICY" && strong.length === 1) {
      proposals.push({
        plane: "COMPOUND",
        source: "GO33_LEAF_DISCOVERY",
        detail: `single STRONG leaf ${strong[0]!.candidateWorkId} — parent COMPOUND (persist Owner-gated)`,
        confidence: "MEDIUM",
      });
    }
  }

  // 5b) AIDISC-v1 — leaf discovery for UNKNOWN *parents* only.
  // Skip when workId is already an ACLC canonical leaf (cw.knr.*) — it is the leaf.
  // Self-AIDISC otherwise invents COMPOUND and conflicts with ACLC LABOR.
  if (workId && input.store && !parseAutonomousCanonicalKnrWorkId(workId)) {
    const aidisc = discoverIdentityLeafCandidates({
      parentWorkId: workId,
      store: input.store,
      descriptions: [String(input.namePl || workId)],
      unit: String(input.unit || "m2"),
    });
    sources.push({
      source: "AIDISC_LEAF_DISCOVERY",
      detail: `ran=${aidisc.discoveryRan}; candidates=${aidisc.candidates.length}; clearWinner=${aidisc.clearWinnerWorkId || "none"}; nearTie=${aidisc.nearTie}; providers=${aidisc.providersAttempted.join(",")}`,
      proposedPlane: aidisc.clearWinnerWorkId ? "COMPOUND" : null,
    });
    if (aidisc.nearTie) {
      return {
        classify: buildResolvedClassify(
          baseline,
          "UNKNOWN",
          "AIDISC near-tie — MORE_RESEARCH (no arbitrary pick)",
        ),
        baseline,
        outcome: "DISCOVERY_NEEDS_RESEARCH",
        downstreamRoute: "COMPOUND_LEAF",
        sources,
        confidence: "MEDIUM",
        discoveryRan: true,
        persistence: "EPHEMERAL_ONLY",
        go33: go33Meta,
      };
    }
    if (aidisc.clearWinnerWorkId) {
      proposals.push({
        plane: "COMPOUND",
        source: "AIDISC_LEAF_DISCOVERY",
        detail: `clear winner leaf ${aidisc.clearWinnerWorkId} — route COMPOUND_LEAF → CIV/AIR`,
        confidence: "MEDIUM",
      });
    } else if (aidisc.candidates.length > 0) {
      sources.push({
        source: "AIDISC_LEAF_DISCOVERY",
        detail: `candidates without clear winner: ${aidisc.rankedWorkIds.slice(0, 4).join(",")}`,
        proposedPlane: null,
      });
    }
  } else if (workId && parseAutonomousCanonicalKnrWorkId(workId)) {
    sources.push({
      source: "ACLC_CANONICAL_LEAF",
      detail: "AIDISC parent→leaf skipped — workId is already ACLC canonical leaf",
      proposedPlane: "LABOR",
    });
  }

  for (const p of proposals) {
    sources.push({
      source: p.source,
      detail: p.detail,
      proposedPlane: p.plane,
    });
  }

  const uniquePlanes = [...new Set(proposals.map((p) => p.plane))];
  if (uniquePlanes.length > 1) {
    return {
      classify: buildResolvedClassify(
        baseline,
        "UNKNOWN",
        `Conflicting discovery planes: ${uniquePlanes.join("|")}`,
      ),
      baseline,
      outcome: "CONFLICT_OWNER_EXCEPTION",
      downstreamRoute: "OWNER_EXCEPTION",
      sources,
      confidence: "HIGH",
      discoveryRan: true,
      persistence: "EPHEMERAL_ONLY",
      go33: go33Meta,
    };
  }

  if (uniquePlanes.length === 1) {
    const plane = uniquePlanes[0]!;
    const best = proposals.filter((p) => p.plane === plane);
    const conf = best.some((p) => p.confidence === "HIGH")
      ? "HIGH"
      : best.some((p) => p.confidence === "MEDIUM")
        ? "MEDIUM"
        : "LOW";
    if (conf === "LOW") {
      return {
        classify: buildResolvedClassify(baseline, "UNKNOWN", "Low-confidence discovery held"),
        baseline,
        outcome: "INSUFFICIENT_DATA",
        downstreamRoute: "OWNER_EXCEPTION",
        sources,
        confidence: "LOW",
        discoveryRan: true,
        persistence: "EPHEMERAL_ONLY",
        go33: go33Meta,
      };
    }
    return {
      classify: buildResolvedClassify(
        baseline,
        plane,
        `Autonomous discovery → ${plane} (${best.map((b) => b.source).join("+")})`,
      ),
      baseline,
      outcome: "RESOLVED_AUTONOMOUSLY",
      downstreamRoute: routeForPlane(plane, workId),
      sources,
      confidence: conf,
      discoveryRan: true,
      persistence: "EPHEMERAL_ONLY",
      go33: go33Meta,
    };
  }

  if (workId && isKnrStructuredWorkId(workId)) {
    const identityResolved = input.identityStatus === "RESOLVED";
    sources.push({
      source: "KNR_STRUCTURED_ID",
      detail: identityResolved
        ? "Identity resolved — no trusted classification evidence (costSplit/allowlist/pack) — fail-closed"
        : "Structured KNR/KNNR/cw id — identity research handoff (≠ rate research)",
      proposedPlane: null,
    });
    if (identityResolved) {
      return {
        classify: buildResolvedClassify(
          baseline,
          "UNKNOWN",
          "Identity resolved but classification evidence insufficient — fail-closed",
        ),
        baseline,
        outcome: "INSUFFICIENT_DATA",
        downstreamRoute: "OWNER_EXCEPTION",
        sources,
        confidence: "LOW",
        discoveryRan: true,
        persistence: "EPHEMERAL_ONLY",
        go33: go33Meta,
      };
    }
    return {
      classify: buildResolvedClassify(
        baseline,
        "UNKNOWN",
        "KNR-structured identity — DISCOVERY_NEEDS_RESEARCH (no rate research yet)",
      ),
      baseline,
      outcome: "DISCOVERY_NEEDS_RESEARCH",
      downstreamRoute: "OWNER_EXCEPTION",
      sources,
      confidence: "LOW",
      discoveryRan: true,
      persistence: "EPHEMERAL_ONLY",
      go33: go33Meta,
    };
  }

  return {
    classify: buildResolvedClassify(
      baseline,
      "UNKNOWN",
      "Autonomous discovery insufficient — remain UNKNOWN (fail-closed)",
    ),
    baseline,
    outcome: "INSUFFICIENT_DATA",
    downstreamRoute: "OWNER_EXCEPTION",
    sources,
    confidence: "NONE",
    discoveryRan: true,
    persistence: "EPHEMERAL_ONLY",
    go33: go33Meta,
  };
}

/** Classification with autonomous discovery seam (Orchestra / Experts). */
export function classifyEstimatorPricingPlaneWithDiscovery(
  input: ResolveUnknownPricingPlaneInput,
): EstimatorClassifyResult {
  return resolveUnknownPricingPlane(input).classify;
}
