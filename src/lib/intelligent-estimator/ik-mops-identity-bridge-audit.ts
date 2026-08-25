/**
 * IK-MOPS-IDENTITY-BRIDGE-AUDIT-S1 — deterministic MOPS benchmark audit.
 * READ-ONLY · reuses existing IK normalization + discovery + Slice D contracts.
 * NOT a parallel MOPS pipeline — benchmark seam for Document Expert → KNR Expert.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildCatalogBasisFromRawCode } from "@/lib/tenders-bzp-brief";
import { OWNER_KNR_MAPPINGS } from "@/lib/intelligent-estimator/ik-knr-owner-mapping";
import {
  KNR_DISCOVERY_SOURCE_SELECTION_BY_FAMILY,
  KNR_DISCOVERY_SOURCE_SELECTION_BY_KEY,
  selectKnrDiscoverySourceIds,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-discovery-source-selection";

/** Phase 2E discovery key — frozen; used for family-relation candidate only. */
export const PHASE_2E_BY_KEY = "KNR-W|4-01|1202-07" as const;
/** Phase 2D discovery key — frozen regression anchor. */
export const PHASE_2D_BY_KEY = "KNR-W|4-01|0701-05" as const;
/** MOPS BOQ normalized key for 1202-07 wykwity case. */
export const MOPS_1202_07_BY_KEY = "KNR|4-01|1202-07" as const;

export type MopsExpressionType =
  | "LITERAL"
  | "SUM"
  | "PRODUCT"
  | "BRACKET_EXPR"
  | "POSITION_REF"
  | "MULTIPLIER"
  | "ROOM_TAG"
  | "UNRESOLVED";

export type MopsBasisType = "CATALOG" | "ANALOGY" | "CUSTOM_CALC" | "ANALYSIS";

export type MopsIdentityStatus =
  | "MATCH_PHASE_2E"
  | "MATCH_SLICE_D"
  | "FAMILY_RELATION_CANDIDATE"
  | "CATALOG_ONLY"
  | "UNRESOLVED_IDENTITY";

export type MopsBenchmarkFixtureItem = {
  nr: number;
  dept: string;
  sub: string | null;
  podstawa: string;
  opis: string;
  jm: string;
  ilosc: number;
  calc?: string;
  notes?: string[];
  ambiguous?: boolean;
};

export type MopsBenchmarkFixture = {
  fixtureId: string;
  label: string;
  sourceNote?: string;
  departments: unknown[];
  items: MopsBenchmarkFixtureItem[];
};

export type MopsPositionAuditRow = {
  fixtureId: string;
  positionNo: number;
  department: string;
  subsection: string | null;
  rawBasis: string;
  normalizedIdentity: string | null;
  catalogFamily: string | null;
  basisType: MopsBasisType;
  description: string;
  unit: string;
  rawQuantityExpression: string;
  pdfTotal: number;
  expressionTypes: MopsExpressionType[];
  positionRefs: number[];
  roomTags: string[];
  analogy: boolean;
  customCalculation: boolean;
  analysis: boolean;
  phase2eMatch: boolean;
  sliceDMatch: boolean;
  identityStatus: MopsIdentityStatus;
  familyRelationCandidate: string | null;
  familyRelationStatus: "REQUIRES_OWNER" | null;
  ikEntryPoint: "DOCUMENT_EXPERT" | "HOLD";
  unresolvedQuantity: boolean;
  unresolvedIdentity: boolean;
};

export type MopsDependencyEdge = {
  fromPosition: number;
  toPosition: number;
  fixtureId: string;
  evidence: string;
  rel: "DEPENDS_ON";
};

export type MopsIdentityBridgeAuditSummary = {
  total: number;
  miernicza: number;
  maslicka: number;
  catalogFamilyCounts: Record<string, number>;
  expressionTypeCounts: Record<MopsExpressionType, number>;
  positionRefCount: number;
  dependencyEdgeCount: number;
  analogyCount: number;
  customCalculationCount: number;
  analysisCount: number;
  phase2eMatches: number;
  sliceDMatches: number;
  familyRelationCandidates: number;
  unresolvedIdentities: number;
  unresolvedQuantityExpressions: number;
  key1202_07: {
    mopsNormalized: string;
    phase2eKey: string;
    sliceDKey: string;
    equal: boolean;
    mopsOccurrences: number;
    phase2eMatchCount: number;
    sliceDMatchCount: number;
    familyRelationRequired: boolean;
  };
};

export type MopsIdentityBridgeAuditReport = {
  version: "S1";
  generatedAt: string;
  fixtures: string[];
  positions: MopsPositionAuditRow[];
  dependencies: MopsDependencyEdge[];
  summary: MopsIdentityBridgeAuditSummary;
};

export type IkArchitectureIntegrationRow = {
  capability: string;
  currentOwner: string;
  currentFiles: string;
  currentStatus: string;
  futureOwner: string;
  integrationPoint: string;
  s1Action: string;
  futureSlice: string;
};

/** SSOT architecture integration map — S1 audit output, not runtime config. */
export const IK_ARCHITECTURE_INTEGRATION_MAP: readonly IkArchitectureIntegrationRow[] = [
  {
    capability: "BOQ ingest / przedmiar structure",
    currentOwner: "Document Expert (upstream parsers)",
    currentFiles: "pdf-przedmiar-heuristic.ts · ath-parser.ts · ik-document-expert.ts · tender-offer-boq.ts",
    currentStatus: "PARTIAL — heuristics + OfferBoq v5, no Norma layout SSOT in IK",
    futureOwner: "Document Expert",
    integrationPoint: "runIkDocumentExpert → masterBoqLines",
    s1Action: "MOPS fixtures as regression input only",
    futureSlice: "S3 — Norma BOQ ingest seam",
  },
  {
    capability: "Quantity expression understanding",
    currentOwner: "OfferBoq line quantity (numeric parse only)",
    currentFiles: "tender-offer-boq.ts · ik-document-expert.ts",
    currentStatus: "MISSING — no expression AST",
    futureOwner: "Document Expert / Quantity Intelligence seam",
    integrationPoint: "Extend OfferBoqLine or IkMasterBoqLineRef metadata",
    s1Action: "Audit expression types from MOPS calc/opis",
    futureSlice: "S2 — BOQ Quantity Expression Engine",
  },
  {
    capability: "Position dependency graph",
    currentOwner: "not present",
    currentFiles: "—",
    currentStatus: "MISSING",
    futureOwner: "BOQ semantic layer (Orchestrator-coordinated)",
    integrationPoint: "Between Document Expert and KNR Expert in orchestra",
    s1Action: "Extract poz.N edges audit-only",
    futureSlice: "S3 — BOQ Dependency Graph",
  },
  {
    capability: "RAW catalog identity",
    currentOwner: "Document Expert / OfferBoq catalogBasis",
    currentFiles: "tender-offer-boq.ts · tenders-bzp-brief.ts",
    currentStatus: "PARTIAL — rawCode on basis",
    futureOwner: "Document Expert",
    integrationPoint: "catalogBasis.rawCode on each line",
    s1Action: "Preserve podstawa as RAW_IDENTITY",
    futureSlice: "S1 complete",
  },
  {
    capability: "NORMALIZED catalog identity",
    currentOwner: "KNR Expert / buildCatalogBasisFromRawCode",
    currentFiles: "tenders-bzp-brief.ts · ik-knr-expert.ts",
    currentStatus: "PRESENT",
    futureOwner: "KNR Expert",
    integrationPoint: "runIkKnrExpert line classification",
    s1Action: "Reuse buildCatalogBasisFromRawCode on MOPS podstawa",
    futureSlice: "S1 complete",
  },
  {
    capability: "FAMILY_RELATION (KNR↔KNR-W)",
    currentOwner: "not present",
    currentFiles: "knr-wc-identity-bridge.ts (WC only, not family)",
    currentStatus: "MISSING — 1202-07 proves gap",
    futureOwner: "KNR Expert (Owner-gated)",
    integrationPoint: "After normalization, before discovery lookup",
    s1Action: "Report FAMILY_RELATION_CANDIDATE REQUIRES_OWNER",
    futureSlice: "S4 — CatalogIdentityStack design freeze",
  },
  {
    capability: "KNR discovery",
    currentOwner: "KNR Expert / knr-knowledge",
    currentFiles: "knr-discovery-source-selection.ts · knr-discovery-on-demand.ts",
    currentStatus: "PRESENT — Phase 2D+2E frozen",
    futureOwner: "KNR Expert (unchanged)",
    integrationPoint: "selectKnrDiscoverySourceIds on MISS",
    s1Action: "Regression assert 2D/2E unchanged",
    futureSlice: "no change without Owner GO",
  },
  {
    capability: "Slice D Owner KNR→Work Catalog",
    currentOwner: "Orchestrator / ik-knr-owner-mapping",
    currentFiles: "ik-knr-owner-mapping.ts · ik-orchestra-engine.ts",
    currentStatus: "PARTIAL — 1 row KNR-W 1202-07",
    futureOwner: "Owner/KL-6 boundary",
    integrationPoint: "applyOwnerKnrMapping after KNR Expert",
    s1Action: "Report MOPS KNR lines miss Slice D",
    futureSlice: "Owner map expansion (separate GO)",
  },
  {
    capability: "Classification (LABOR/MATERIAL/COMPOUND)",
    currentOwner: "Classification Expert",
    currentFiles: "ik-classification.ts · owner-classification-map.ts",
    currentStatus: "PARTIAL",
    futureOwner: "Classification Expert",
    integrationPoint: "runIkMasterBoqClassification after identity",
    s1Action: "Basis-type audit feeds future gate",
    futureSlice: "S5 — analogy/kalk router",
  },
  {
    capability: "F5 / Bid",
    currentOwner: "P7 Position Cost Bid",
    currentFiles: "ik-p7-position-cost-bid.ts · tender-position-cost/",
    currentStatus: "PRESENT — gated",
    futureOwner: "unchanged",
    integrationPoint: "After labor/material rates",
    s1Action: "No S1 mutation",
    futureSlice: "downstream of S2/S3",
  },
  {
    capability: "Owner / KL-6 verify",
    currentOwner: "KNR verify orchestrator",
    currentFiles: "knr-verify-orchestrator.ts · KnrVerifyAdminView",
    currentStatus: "PRODUCTION VERIFIED CLOSED",
    futureOwner: "unchanged",
    integrationPoint: "PENDING_VERIFY → Owner only",
    s1Action: "No S1 mutation",
    futureSlice: "no change",
  },
];

const FIXTURE_DIR = join(process.cwd(), "test-infra/fixtures/mops-benchmark");

export function mopsBenchmarkFixturePath(fixtureId: string): string {
  if (fixtureId === "miernicza-15-7") {
    return join(FIXTURE_DIR, "miernicza-15-7.json");
  }
  if (fixtureId === "maslicka-8a-5") {
    return join(FIXTURE_DIR, "maslicka-8a-5.json");
  }
  throw new Error(`Unknown MOPS fixture: ${fixtureId}`);
}

export function loadMopsBenchmarkFixture(fixtureId: string): MopsBenchmarkFixture {
  const raw = readFileSync(mopsBenchmarkFixturePath(fixtureId), "utf8");
  const parsed = JSON.parse(raw) as MopsBenchmarkFixture;
  return { ...parsed, fixtureId };
}

export function loadAllMopsBenchmarkFixtures(): MopsBenchmarkFixture[] {
  return [loadMopsBenchmarkFixture("miernicza-15-7"), loadMopsBenchmarkFixture("maslicka-8a-5")];
}

export function extractPositionRefs(text: string): number[] {
  const refs = new Set<number>();
  for (const m of text.matchAll(/\bpoz\.?\s*(\d+)\b/gi)) {
    const n = Number.parseInt(m[1] ?? "", 10);
    if (Number.isFinite(n) && n > 0) refs.add(n);
  }
  return [...refs].sort((a, b) => a - b);
}

export function extractRoomTags(text: string): string[] {
  const tags: string[] = [];
  for (const m of text.matchAll(/<([^>]+)>/g)) {
    const t = String(m[1] ?? "").trim();
    if (t) tags.push(t);
  }
  return tags;
}

export function detectExpressionTypes(calc: string, opis: string): MopsExpressionType[] {
  const text = `${calc} ${opis}`.trim();
  const types = new Set<MopsExpressionType>();
  if (!text) {
    types.add("UNRESOLVED");
    return [...types];
  }
  if (/\bpoz\.?\s*\d+/i.test(text)) types.add("POSITION_REF");
  if (/Krotność\s*=\s*\d+/i.test(text)) types.add("MULTIPLIER");
  if (/<[^>]+>/.test(text)) types.add("ROOM_TAG");
  if (/\[[^\]]+\]/.test(text)) types.add("BRACKET_EXPR");
  if (/\d[\d,.]*\s*\*\s*\d/.test(text)) types.add("PRODUCT");
  if (/\d[\d,.]*\s*\+\s*\d/.test(text)) types.add("SUM");
  const calcOnly = calc.trim();
  if (calcOnly && /^[\d,.]+$/.test(calcOnly)) types.add("LITERAL");
  if (types.size === 0) types.add("UNRESOLVED");
  return [...types];
}

export function classifyMopsBasisType(
  podstawa: string,
  notes: string[] | undefined,
  opis: string,
): MopsBasisType {
  const p = podstawa.toLowerCase();
  const noteText = (notes ?? []).join(" ").toLowerCase();
  const o = opis.toLowerCase();
  if (/kalk\.?\s*własna|\/\s*kalk\./i.test(podstawa) || /kalk\.?\s*własna/i.test(noteText)) {
    return "CUSTOM_CALC";
  }
  if (/\/\s*analiza\b/i.test(podstawa) || /\banaliza\b/i.test(p)) return "ANALYSIS";
  if (/\banalogia\b/i.test(noteText) || /\banalogia\b/i.test(o) || /\banalogia\b/i.test(podstawa)) {
    return "ANALOGY";
  }
  return "CATALOG";
}

function basisToRawCode(podstawa: string): string {
  return String(podstawa ?? "")
    .replace(/\s*\/\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveMopsNormalizedIdentity(podstawa: string): {
  rawBasis: string;
  normalizedIdentity: string | null;
  catalogFamily: string | null;
} {
  const rawBasis = String(podstawa ?? "").trim();
  const basis = buildCatalogBasisFromRawCode(basisToRawCode(rawBasis));
  return {
    rawBasis,
    normalizedIdentity: basis?.normalizedKey ?? null,
    catalogFamily: basis?.family ?? null,
  };
}

function resolveIdentityStatus(
  normalizedIdentity: string | null,
): {
  identityStatus: MopsIdentityStatus;
  phase2eMatch: boolean;
  sliceDMatch: boolean;
  familyRelationCandidate: string | null;
  familyRelationStatus: "REQUIRES_OWNER" | null;
} {
  const nk = normalizedIdentity ?? "";
  const phase2eMatch = nk === PHASE_2E_BY_KEY;
  const sliceDMatch = OWNER_KNR_MAPPINGS.some(
    (m) => m.active && m.ownerApproval && m.normalizedKey === nk,
  );
  const discoverySel = selectKnrDiscoverySourceIds({ normalizedKey: nk });
  const discoveryMatch = discoverySel.sourceIds.length > 0;

  if (phase2eMatch || discoveryMatch) {
    return {
      identityStatus: "MATCH_PHASE_2E",
      phase2eMatch: true,
      sliceDMatch,
      familyRelationCandidate: null,
      familyRelationStatus: null,
    };
  }
  if (sliceDMatch) {
    return {
      identityStatus: "MATCH_SLICE_D",
      phase2eMatch: false,
      sliceDMatch: true,
      familyRelationCandidate: null,
      familyRelationStatus: null,
    };
  }
  if (nk === MOPS_1202_07_BY_KEY) {
    return {
      identityStatus: "FAMILY_RELATION_CANDIDATE",
      phase2eMatch: false,
      sliceDMatch: false,
      familyRelationCandidate: PHASE_2E_BY_KEY,
      familyRelationStatus: "REQUIRES_OWNER",
    };
  }
  if (nk) {
    return {
      identityStatus: "CATALOG_ONLY",
      phase2eMatch: false,
      sliceDMatch: false,
      familyRelationCandidate: null,
      familyRelationStatus: null,
    };
  }
  return {
    identityStatus: "UNRESOLVED_IDENTITY",
    phase2eMatch: false,
    sliceDMatch: false,
    familyRelationCandidate: null,
    familyRelationStatus: null,
  };
}

export function auditMopsPosition(
  fixtureId: string,
  item: MopsBenchmarkFixtureItem,
): MopsPositionAuditRow {
  const { rawBasis, normalizedIdentity, catalogFamily } = resolveMopsNormalizedIdentity(item.podstawa);
  const calc = String(item.calc ?? "").trim();
  const opis = String(item.opis ?? "").trim();
  const rawQuantityExpression = calc || opis;
  const expressionTypes = detectExpressionTypes(calc, opis);
  const positionRefs = extractPositionRefs(`${calc} ${opis}`);
  const roomTags = extractRoomTags(`${calc} ${opis}`);
  const basisType = classifyMopsBasisType(item.podstawa, item.notes, opis);
  const id = resolveIdentityStatus(normalizedIdentity);

  const analogy = basisType === "ANALOGY";
  const customCalculation = basisType === "CUSTOM_CALC";
  const analysis = basisType === "ANALYSIS";
  const unresolvedQuantity =
    expressionTypes.includes("UNRESOLVED")
    && basisType === "CATALOG"
    && !positionRefs.length;
  const unresolvedIdentity = id.identityStatus === "UNRESOLVED_IDENTITY";

  return {
    fixtureId,
    positionNo: item.nr,
    department: item.dept,
    subsection: item.sub,
    rawBasis,
    normalizedIdentity,
    catalogFamily,
    basisType,
    description: opis,
    unit: item.jm,
    rawQuantityExpression,
    pdfTotal: item.ilosc,
    expressionTypes,
    positionRefs,
    roomTags,
    analogy,
    customCalculation,
    analysis,
    phase2eMatch: id.phase2eMatch,
    sliceDMatch: id.sliceDMatch,
    identityStatus: id.identityStatus,
    familyRelationCandidate: id.familyRelationCandidate,
    familyRelationStatus: id.familyRelationStatus,
    ikEntryPoint: unresolvedIdentity ? "HOLD" : "DOCUMENT_EXPERT",
    unresolvedQuantity,
    unresolvedIdentity,
  };
}

export function extractMopsDependencyEdges(
  positions: readonly MopsPositionAuditRow[],
): MopsDependencyEdge[] {
  const edges: MopsDependencyEdge[] = [];
  for (const row of positions) {
    for (const ref of row.positionRefs) {
      edges.push({
        fromPosition: row.positionNo,
        toPosition: ref,
        fixtureId: row.fixtureId,
        evidence: row.rawQuantityExpression,
        rel: "DEPENDS_ON",
      });
    }
  }
  return edges;
}

export function runMopsIdentityBridgeAudit(
  nowIso: string = new Date().toISOString(),
): MopsIdentityBridgeAuditReport {
  const fixtures = loadAllMopsBenchmarkFixtures();
  const positions: MopsPositionAuditRow[] = [];
  for (const fx of fixtures) {
    for (const item of fx.items) {
      positions.push(auditMopsPosition(fx.fixtureId, item));
    }
  }
  const dependencies = extractMopsDependencyEdges(positions);

  const expressionTypeCounts: Record<MopsExpressionType, number> = {
    LITERAL: 0,
    SUM: 0,
    PRODUCT: 0,
    BRACKET_EXPR: 0,
    POSITION_REF: 0,
    MULTIPLIER: 0,
    ROOM_TAG: 0,
    UNRESOLVED: 0,
  };
  const catalogFamilyCounts: Record<string, number> = {};
  let positionRefCount = 0;
  let analogyCount = 0;
  let customCalculationCount = 0;
  let analysisCount = 0;
  let phase2eMatches = 0;
  let sliceDMatches = 0;
  let familyRelationCandidates = 0;
  let unresolvedIdentities = 0;
  let unresolvedQuantityExpressions = 0;
  let mops1202Occurrences = 0;
  let phase2e1202 = 0;
  let sliceD1202 = 0;

  for (const row of positions) {
    const fam = row.catalogFamily ?? "OTHER";
    catalogFamilyCounts[fam] = (catalogFamilyCounts[fam] ?? 0) + 1;
    for (const t of row.expressionTypes) expressionTypeCounts[t] += 1;
    positionRefCount += row.positionRefs.length;
    if (row.analogy) analogyCount += 1;
    if (row.customCalculation) customCalculationCount += 1;
    if (row.analysis) analysisCount += 1;
    if (row.phase2eMatch) phase2eMatches += 1;
    if (row.sliceDMatch) sliceDMatches += 1;
    if (row.identityStatus === "FAMILY_RELATION_CANDIDATE") familyRelationCandidates += 1;
    if (row.unresolvedIdentity) unresolvedIdentities += 1;
    if (row.unresolvedQuantity) unresolvedQuantityExpressions += 1;
    if (row.normalizedIdentity === MOPS_1202_07_BY_KEY) {
      mops1202Occurrences += 1;
      if (row.phase2eMatch) phase2e1202 += 1;
      if (row.sliceDMatch) sliceD1202 += 1;
    }
  }

  const miernicza = fixtures.find((f) => f.fixtureId === "miernicza-15-7")?.items.length ?? 0;
  const maslicka = fixtures.find((f) => f.fixtureId === "maslicka-8a-5")?.items.length ?? 0;

  return {
    version: "S1",
    generatedAt: nowIso,
    fixtures: fixtures.map((f) => f.fixtureId),
    positions,
    dependencies,
    summary: {
      total: positions.length,
      miernicza,
      maslicka,
      catalogFamilyCounts,
      expressionTypeCounts,
      positionRefCount,
      dependencyEdgeCount: dependencies.length,
      analogyCount,
      customCalculationCount,
      analysisCount,
      phase2eMatches,
      sliceDMatches,
      familyRelationCandidates,
      unresolvedIdentities,
      unresolvedQuantityExpressions,
      key1202_07: {
        mopsNormalized: MOPS_1202_07_BY_KEY,
        phase2eKey: PHASE_2E_BY_KEY,
        sliceDKey: PHASE_2E_BY_KEY,
        equal: false,
        mopsOccurrences: mops1202Occurrences,
        phase2eMatchCount: phase2e1202,
        sliceDMatchCount: sliceD1202,
        familyRelationRequired: mops1202Occurrences > 0 && phase2e1202 === 0,
      },
    },
  };
}

/** Frozen Phase 2D/2E/BY_FAMILY/Edge regression — read-only. */
export function assertMopsS1DiscoveryFrozenContract(): {
  phase2d: boolean;
  phase2e: boolean;
  byFamilyEmpty: boolean;
  edgeEmpty: boolean;
  catalogVerifiedFalse: true;
} {
  const phase2d =
    KNR_DISCOVERY_SOURCE_SELECTION_BY_KEY[PHASE_2D_BY_KEY]?.[0] === "l3_bip_malopolska_1646919";
  const phase2e =
    KNR_DISCOVERY_SOURCE_SELECTION_BY_KEY[PHASE_2E_BY_KEY]?.[0] === "l3_rckik_wroclaw_1202_07";
  const byFamilyEmpty = Object.keys(KNR_DISCOVERY_SOURCE_SELECTION_BY_FAMILY).length === 0;
  const edgeSrc = readFileSync(
    join(process.cwd(), "supabase/functions/make-server-0afb8820/index.tsx"),
    "utf8",
  );
  const edgeEmpty = /KNR_DISCOVERY_EDGE_ALLOWLIST[^=]*=\s*Object\.freeze\(\[\]\)/.test(edgeSrc);
  return {
    phase2d,
    phase2e,
    byFamilyEmpty,
    edgeEmpty,
    catalogVerifiedFalse: true,
  };
}
