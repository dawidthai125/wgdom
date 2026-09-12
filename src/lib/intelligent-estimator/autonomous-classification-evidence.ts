/**
 * Autonomous classification evidence — IDENTITY → CLASSIFICATION EVIDENCE seam.
 *
 * REUSE only:
 *  - SEPA KNNR 1301 Owner CREATE CatalogWork draft (costSplit labor=1)
 *  - existing Work Catalog store entries (costSplit)
 *  - labor-only / material-supply allowlists
 *  - TechnologyPack bindings (via caller packs → discovery)
 *
 * ZERO namePl invent · ZERO rate/price as classification evidence · ZERO Accept ·
 * ZERO Owner map write · ZERO Catalog persist · ZERO OUR RATE / BOM / Finance.
 *
 * Persistence: ephemeral evidence only. Production catalog seed remains Owner OPS GO.
 */

import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import type { TechnologyPack } from "@/lib/technology-foundation";
import { isExplicitLaborOnlyWork } from "@/lib/tender-position-cost/labor-only-classification";
import { isExplicitMaterialSupplyWork } from "@/lib/tender-position-cost/material-supply-classification";
import {
  buildSepaKnr1301PomiarCatalogWork,
  getSepaKnr1301WorkSpec,
  isSepaKnr1301PomiarWorkId,
} from "@/lib/work-catalog/ik-owner-create-sepa-1301-pomiar-catalog";
import { listActiveWorksForRegion } from "@/lib/work-catalog/catalog-work-utils";
import type { EstimatorPricingPlane } from "./classification-types";
import {
  resolveUnknownPricingPlane,
  type ResolveUnknownPricingPlaneInput,
  type ResolveUnknownPricingPlaneResult,
} from "./autonomous-unknown-plane-discovery";

export type ClassificationEvidenceStrength = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export type ClassificationEvidenceHit = {
  source:
    | "SEPA_OWNER_CREATE_COST_SPLIT"
    | "CATALOG_STORE_COST_SPLIT"
    | "LABOR_ONLY_ALLOWLIST"
    | "MATERIAL_SUPPLY_ALLOWLIST"
    | "TECHNOLOGY_PACK_BINDING"
    | "KNR_NORMS_R_ONLY"
    | "KNR_NORMS_M_ONLY"
    | "KNR_NORMS_RM_BOTH"
    | "NONE";
  detail: string;
  proposedPlane: EstimatorPricingPlane | null;
  strength: ClassificationEvidenceStrength;
};

export type KnrNormsClassificationInput = {
  laborNormCount: number;
  materialNormCount: number;
  equipmentNormCount?: number;
  identityKey?: string | null;
  sourceRef?: string | null;
};

/**
 * Trusted KNR/KNNR norms → classification evidence (not PLN, not namePl).
 * R>0 & M=0 → LABOR · M>0 & R=0 → MATERIAL · R>0 & M>0 → COMPOUND · else null.
 */
export function classificationEvidenceFromKnrNorms(
  norms: KnrNormsClassificationInput | null | undefined,
): ClassificationEvidenceHit | null {
  if (!norms) return null;
  const r = Number(norms.laborNormCount) || 0;
  const m = Number(norms.materialNormCount) || 0;
  if (r <= 0 && m <= 0) return null;
  const key = norms.identityKey ? ` key=${norms.identityKey}` : "";
  const src = norms.sourceRef ? ` src=${norms.sourceRef}` : "";
  if (r > 0 && m === 0) {
    return {
      source: "KNR_NORMS_R_ONLY",
      detail: `KNR norms labor=${r} material=0 → LABOR (robocizna-only)${key}${src}`,
      proposedPlane: "LABOR",
      strength: "HIGH",
    };
  }
  if (m > 0 && r === 0) {
    return {
      source: "KNR_NORMS_M_ONLY",
      detail: `KNR norms labor=0 material=${m} → MATERIAL${key}${src}`,
      proposedPlane: "MATERIAL",
      strength: "HIGH",
    };
  }
  if (r > 0 && m > 0) {
    return {
      source: "KNR_NORMS_RM_BOTH",
      detail: `KNR norms labor=${r} material=${m} → COMPOUND${key}${src}`,
      proposedPlane: "COMPOUND",
      strength: "HIGH",
    };
  }
  return null;
}

export type CollectClassificationEvidenceInput = {
  workId: string;
  store?: WorkCatalogStore | null;
  packs?: TechnologyPack[] | null;
  catalogWork?: CatalogWork | null;
  /** ISO timestamp for ephemeral SEPA draft (no persist). */
  nowIso?: string;
  /** Optional KNR/KNNR norms counts — never derived from namePl. */
  knrNorms?: KnrNormsClassificationInput | null;
};

export type CollectClassificationEvidenceResult = {
  workId: string;
  hits: ClassificationEvidenceHit[];
  /** Ephemeral CatalogWork for costSplit handoff (NOT written). */
  ephemeralCatalogWork: CatalogWork | null;
  strength: ClassificationEvidenceStrength;
  productionWriteRequired: false;
  productionWriteNote: string;
};

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

function strengthMax(
  a: ClassificationEvidenceStrength,
  b: ClassificationEvidenceStrength,
): ClassificationEvidenceStrength {
  const order = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3 } as const;
  return order[a] >= order[b] ? a : b;
}

/**
 * Collect trusted classification evidence for a resolved identity.
 * Does not invent plane from description/namePl.
 */
export function collectAutonomousClassificationEvidence(
  input: CollectClassificationEvidenceInput,
): CollectClassificationEvidenceResult {
  const workId = String(input.workId || "").trim();
  const hits: ClassificationEvidenceHit[] = [];
  let ephemeral: CatalogWork | null = input.catalogWork ?? null;
  let strength: ClassificationEvidenceStrength = "NONE";

  if (!workId) {
    return {
      workId: "",
      hits: [{ source: "NONE", detail: "missing workId", proposedPlane: null, strength: "NONE" }],
      ephemeralCatalogWork: null,
      strength: "NONE",
      productionWriteRequired: false,
      productionWriteNote:
        "No production write in this GO — classification evidence is ephemeral only",
    };
  }

  if (isExplicitLaborOnlyWork(workId)) {
    hits.push({
      source: "LABOR_ONLY_ALLOWLIST",
      detail: "OWNER_APPROVED_LABOR_ONLY_WORK_IDS / C2 prob allowlist",
      proposedPlane: "LABOR",
      strength: "HIGH",
    });
    strength = strengthMax(strength, "HIGH");
  }
  if (isExplicitMaterialSupplyWork(workId)) {
    hits.push({
      source: "MATERIAL_SUPPLY_ALLOWLIST",
      detail: "OWNER_APPROVED_MATERIAL_SUPPLY_WORK_IDS",
      proposedPlane: "MATERIAL",
      strength: "HIGH",
    });
    strength = strengthMax(strength, "HIGH");
  }

  const knrHit = classificationEvidenceFromKnrNorms(input.knrNorms);
  if (knrHit) {
    hits.push(knrHit);
    strength = strengthMax(strength, knrHit.strength);
    // Ephemeral costSplit handoff for existing planeFromCostSplit — NOT catalog persist
    if (!ephemeral?.costSplit && knrHit.proposedPlane) {
      const split =
        knrHit.proposedPlane === "LABOR"
          ? { laborRatio: 1, materialRatio: 0 }
          : knrHit.proposedPlane === "MATERIAL"
            ? { laborRatio: 0, materialRatio: 1 }
            : { laborRatio: 0.5, materialRatio: 0.5 };
      ephemeral = {
        id: workId,
        tradeId: "MALOWANIE",
        namePl: workId,
        unit: "m2",
        companyPricePln: 0,
        commercialPricing: {
          marginPct: 0,
          updatedAt: input.nowIso || new Date().toISOString(),
          source: "owner",
        },
        updatedAt: input.nowIso || new Date().toISOString(),
        freshnessStatus: "missing",
        keywords: [],
        active: true,
        favorite: false,
        usageCount: 0,
        source: "custom",
        costSplit: split,
      };
    }
  }

  const fromStore =
    ephemeral ?? (input.store ? findCatalogWorkLocal(input.store, workId) : null);
  if (fromStore?.costSplit) {
    ephemeral = fromStore;
    hits.push({
      source: "CATALOG_STORE_COST_SPLIT",
      detail: `store costSplit labor=${fromStore.costSplit.laborRatio} material=${fromStore.costSplit.materialRatio}`,
      proposedPlane: null,
      strength: "HIGH",
    });
    strength = strengthMax(strength, "HIGH");
  } else if (isSepaKnr1301PomiarWorkId(workId)) {
    const spec = getSepaKnr1301WorkSpec(workId);
    if (spec) {
      const draft = buildSepaKnr1301PomiarCatalogWork(
        spec,
        input.nowIso || new Date().toISOString(),
      );
      ephemeral = draft;
      hits.push({
        source: "SEPA_OWNER_CREATE_COST_SPLIT",
        detail:
          "Owner CREATE SSOT buildSepaKnr1301PomiarCatalogWork · costSplit labor=1 material=0 · ephemeral (no catalog persist)",
        proposedPlane: "LABOR",
        strength: "HIGH",
      });
      strength = strengthMax(strength, "HIGH");
    }
  }

  if (input.packs && input.packs.length > 0) {
    hits.push({
      source: "TECHNOLOGY_PACK_BINDING",
      detail: `packs provided (${input.packs.length}) — evaluated by resolveUnknownPricingPlane`,
      proposedPlane: null,
      strength: "MEDIUM",
    });
    strength = strengthMax(strength, "MEDIUM");
  }

  if (hits.length === 0) {
    hits.push({
      source: "NONE",
      detail:
        "No trusted classification evidence (no costSplit / allowlist / SEPA SSOT / pack) — fail-closed",
      proposedPlane: null,
      strength: "NONE",
    });
  }

  return {
    workId,
    hits,
    ephemeralCatalogWork: ephemeral,
    strength,
    productionWriteRequired: false,
    productionWriteNote:
      "SEPA draft / store read are ephemeral for plane routing. Catalog seed write = separate Owner OPS GO (catalog-ik-owner-sepa-1301-pomiar-ops). Owner classification map write = separate GO.",
  };
}

export type ResolvePlaneAfterIdentityInput = ResolveUnknownPricingPlaneInput & {
  /** After AUTONOMOUS_IDENTITY_RESEARCH — identity already resolved. */
  identityStatus?: "RESOLVED" | "UNRESOLVED" | null;
  nowIso?: string;
  knrNorms?: KnrNormsClassificationInput | null;
};

/**
 * IDENTITY (resolved) → classification evidence → existing discovery/classification gate.
 * Does not start rate research / Accept / Finance.
 */
export function resolvePlaneAfterIdentity(
  input: ResolvePlaneAfterIdentityInput,
): {
  evidence: CollectClassificationEvidenceResult;
  discovery: ResolveUnknownPricingPlaneResult;
} {
  const workId = String(input.workId || "").trim();
  const evidence = collectAutonomousClassificationEvidence({
    workId,
    store: input.store,
    packs: input.packs,
    catalogWork: input.catalogWork,
    nowIso: input.nowIso,
    knrNorms: input.knrNorms,
  });

  const discovery = resolveUnknownPricingPlane({
    ...input,
    catalogWork: evidence.ephemeralCatalogWork ?? input.catalogWork ?? null,
    identityStatus: input.identityStatus ?? "RESOLVED",
  });

  return { evidence, discovery };
}
