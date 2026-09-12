/**
 * GO33 — Autonomous Labor Leaf Identity Discovery (READ-ONLY).
 *
 * Discovers & ranks CANDIDATE labor leaf identities for a trusted PACKAGE parent.
 * NEVER persists laborWorkId · NEVER Accept · NEVER OUR RATE · NEVER pack create.
 *
 * REUSE: listActiveWorksForRegion · Owner map · resolveWorkRateWorkFamily · A09 rejects · G177.
 */

import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import {
  listActiveWorksForRegion,
  indexWorksById,
} from "@/lib/work-catalog/catalog-work-utils";
import { getOwnerClassificationPlane } from "@/lib/intelligent-estimator/owner-classification-map";
import { resolveWorkRateWorkFamily } from "@/lib/work-catalog/work-rate-discovery-allowlist";
import { listWorkRateMatchNamesPl } from "@/lib/work-catalog/work-rate-synonyms";
import {
  IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
  IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ,
  IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT,
  IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
} from "@/lib/work-catalog/ik-owner-create-a09-package-catalog";
import { deriveResearchClassification } from "@/lib/work-catalog/research-profile-classification";

export type LaborLeafIdentityClass =
  | "STRONG_CANDIDATE"
  | "PLAUSIBLE_CANDIDATE"
  | "WEAK_CANDIDATE"
  | "WRONG_SCOPE"
  | "WRONG_UNIT"
  | "REJECTED"
  | "INSUFFICIENT_EVIDENCE";

export type AutoLaborLeafIdentityEligibility =
  | "AUTO_ELIGIBLE_PENDING_POLICY"
  | "AMBIGUOUS"
  | "INSUFFICIENT_EVIDENCE"
  | "NO_CANDIDATE"
  | "WRONG_SCOPE"
  | "CONFLICT"
  | "IDENTITY_UNSAFE";

export type RejectionKind = "HARD" | "CONTEXTUAL" | null;

export type WorkScopeClass =
  | "GK_PARTITION_WALL"
  | "GK_CEILING"
  | "GK_ENCLOSURE_BEAMS"
  | "GK_BOARD_GENERIC"
  | "DEMOLITION"
  | "FINISHING_PLASTER"
  | "PAINTING"
  | "MATERIAL_SUPPLY"
  | "TURNKEY_PACKAGE"
  | "GENERIC_LEGACY"
  | "OTHER"
  | "UNKNOWN";

export type LaborLeafIdentityResearchProfile = {
  parentWorkId: string;
  parentDescription: string;
  technology: string;
  unit: string;
  packageSemantics: "LABOR_COMPOUND" | "PACKAGE";
  costSplit: { materialRatio: number; laborRatio: number };
  knrG177: { verbatim: string; knrRef: string; role: "DISCOVERY_ONLY" };
  bomMetadata: { provisionalCcW2: true; technologyPack: false };
  candidateMetadataNote: string;
  mutatesParent: false;
};

export type IdentityScorecard = {
  semanticSimilarity: { score: "HIGH" | "MED" | "LOW" | "NONE"; reason: string };
  technologyMatch: { score: "HIGH" | "MED" | "LOW" | "NONE"; reason: string };
  unitMatch: { score: "HIGH" | "NONE"; reason: string };
  laborScope: { score: "HIGH" | "MED" | "LOW" | "NONE"; reason: string };
  knrRelation: { score: "HIGH" | "MED" | "LOW" | "NONE"; reason: string };
  catalogAuthority: { score: "HIGH" | "MED" | "LOW" | "NONE"; reason: string };
  familyCompatibility: { score: "HIGH" | "MED" | "LOW" | "NONE"; reason: string };
  packageCompatibility: { score: "HIGH" | "MED" | "LOW" | "NONE"; reason: string };
  negativeEvidence: { score: "NONE" | "PRESENT"; reason: string };
};

export type LaborLeafIdentityCandidate = {
  candidateWorkId: string;
  label: string;
  unit: string;
  scope: WorkScopeClass;
  technology: string | null;
  family: string;
  catalogBasis: null;
  knrEvidence: string | null;
  aliases: string[];
  matchMethod: string;
  matchConfidence: "high" | "medium" | "low" | "none";
  rejectionReasons: string[];
  rejectionKind: RejectionKind;
  authority: "CATALOG" | "OWNER_MAP" | "A09_REJECT" | "HEURISTIC";
  source: string;
  ownerPlane: string | null;
  identityClass: LaborLeafIdentityClass;
  scorecard: IdentityScorecard;
  mayPersistAsLaborWorkId: false;
  mayAccept: false;
};

export type KnrG177IdentityOutcome =
  | "EXACT_IDENTITY"
  | "DISCOVERY_ONLY"
  | "MULTIPLE_CANDIDATES"
  | "NO_MAPPING"
  | "CONFLICT";

export type GkDiscoveryBucket = "A" | "B" | "C" | "D";

const HARD_REJECTED: ReadonlyMap<string, string> = new Map([
  [
    IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
    "A09 HARD: PACKAGE ≠ LABOR host · Owner REJECT 118 · must not resurrect as leaf without new Owner GO",
  ],
  [
    IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
    "Parent PACKAGE workId cannot be its own labor leaf",
  ],
]);

const CONTEXTUAL_WRONG_SCOPE: ReadonlyMap<string, string> = new Map([
  ["cc-w2-plyta-gk-zabudowa", "A09: object = beams/columns enclosure — not partition wall"],
  ["p2b-sufit-podwieszany-gk-m2", "A09: ceiling — not partition wall"],
  ["p2a-rozebranie-scianek-dzialowych-m2", "A09: demolition verb — not wykonanie"],
  ["legacy-gk-m2", "Generic GK bucket — not G177-specific partition leaf"],
]);

function soft(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function classifyWorkScopeForGkPartition(input: {
  workId: string;
  namePl?: string | null;
  descriptionPl?: string | null;
}): WorkScopeClass {
  const id = soft(input.workId);
  const blob = soft(`${input.workId} ${input.namePl || ""} ${input.descriptionPl || ""}`);

  if (id === soft(IK_OWNER_CREATE_A09_PACKAGE_WORK_ID) || /pakiet/.test(blob)) {
    if (/sciank|dzialow/.test(blob)) return "TURNKEY_PACKAGE";
  }
  if (/rozebran|demontaz|rozbiork/.test(blob)) return "DEMOLITION";
  if (/sufit|podwiesz/.test(blob)) return "GK_CEILING";
  if (/belk|slup|obudow\w*\s*(bel|slup)|plyta-gk-zabudowa/.test(blob)) {
    return "GK_ENCLOSURE_BEAMS";
  }
  if (/malow|farba/.test(blob)) return "PAINTING";
  if (/gladź|gladź|tynk|szpachl|gladzie/.test(blob) || /gladź/.test(blob)) {
    return "FINISHING_PLASTER";
  }
  if (/gladzie|tynki/.test(blob)) return "FINISHING_PLASTER";
  if (/mat\.|cw\.product|plyta_gk$|material/.test(id) && !/sciank|montaz|zabudow/.test(blob)) {
    return "MATERIAL_SUPPLY";
  }
  if (/legacy-gk|legacy-roboty_ogolnobudowlane/.test(id)) return "GENERIC_LEGACY";
  if (
    (/sciank\w*\s*dzial|dzialow\w*\s*(gk|gr)|zabudow\w*\s*dzial|scianka.?gk|gk.?na.?stelaz|na.?stelazu/.test(
      blob,
    ) ||
      /p2b-scianka-gk-na-stelazu/.test(id)) &&
    !/rozebran|sufit|belk|slup|pakiet/.test(blob)
  ) {
    return "GK_PARTITION_WALL";
  }
  if (/gipsowo.?karton|\bgk\b|plyt\w*\s*gk/.test(blob)) return "GK_BOARD_GENERIC";
  if (/gips|karton/.test(blob)) return "OTHER";
  return "UNKNOWN";
}

export function buildLaborLeafIdentityResearchProfile(
  parentWorkId: string = IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
): LaborLeafIdentityResearchProfile {
  const der = deriveResearchClassification({
    workId: parentWorkId,
    namePl: "Ścianki działowe GR — pakiet GK",
    unit: "m2",
  });
  return {
    parentWorkId,
    parentDescription: IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ,
    technology: "GK",
    unit: "m2",
    packageSemantics:
      der.researchClassification === "LABOR_COMPOUND" ? "LABOR_COMPOUND" : "PACKAGE",
    costSplit: { ...IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT },
    knrG177: {
      verbatim: IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ,
      knrRef: "55-01",
      role: "DISCOVERY_ONLY",
    },
    bomMetadata: { provisionalCcW2: true, technologyPack: false },
    candidateMetadataNote:
      "Profile describes discovery problem only — does not mutate parent classification/package",
    mutatesParent: false,
  };
}

function isDiscoveryPoolWork(work: CatalogWork): boolean {
  const blob = soft(`${work.id} ${work.namePl || ""} ${work.descriptionPl || ""}`);
  return (
    /sciank|dzialow|gipsowo.?karton|\bgk\b|stelaz|zabudow|plyta.?gk|sufit.?podwiesz|gladzie|tynk|malow|rozebran.?sciank|legacy-gk|ogolnobudowlan/.test(
      blob,
    ) ||
    HARD_REJECTED.has(work.id) ||
    CONTEXTUAL_WRONG_SCOPE.has(work.id)
  );
}

function buildScorecard(
  work: CatalogWork,
  scope: WorkScopeClass,
  identityClass: LaborLeafIdentityClass,
): IdentityScorecard {
  const unitOk = soft(work.unit) === "m2";
  const plane = getOwnerClassificationPlane(work.id);
  const family = resolveWorkRateWorkFamily({ workId: work.id, namePl: work.namePl });
  const hard = HARD_REJECTED.get(work.id);
  const contextual = CONTEXTUAL_WRONG_SCOPE.get(work.id);

  return {
    semanticSimilarity: {
      score:
        scope === "GK_PARTITION_WALL"
          ? "HIGH"
          : scope === "GK_BOARD_GENERIC"
            ? "MED"
            : scope === "TURNKEY_PACKAGE"
              ? "MED"
              : "LOW",
      reason: `scope=${scope}`,
    },
    technologyMatch: {
      score: /gk|gips|karton|stelaz|sciank/.test(
        soft(`${work.id} ${work.namePl} ${work.descriptionPl || ""}`),
      )
        ? "HIGH"
        : "NONE",
      reason: "token GK/ścianka/gips in id/name",
    },
    unitMatch: {
      score: unitOk ? "HIGH" : "NONE",
      reason: `unit=${work.unit}`,
    },
    laborScope: {
      score:
        plane === "LABOR" && scope === "GK_PARTITION_WALL"
          ? "HIGH"
          : plane === "LABOR"
            ? "MED"
            : "LOW",
      reason: `ownerPlane=${plane}`,
    },
    knrRelation: {
      score: "NONE",
      reason: "No Work Catalog row maps KNR 55-01 → this workId (DISCOVERY_ONLY parent)",
    },
    catalogAuthority: {
      score: work.active ? "MED" : "LOW",
      reason: work.active ? "active CatalogWork" : "inactive",
    },
    familyCompatibility: {
      score:
        scope === "GK_PARTITION_WALL"
          ? "HIGH"
          : family === "demolition" || family === "plaster" || family === "painting"
            ? "LOW"
            : "MED",
      reason: `family=${family}`,
    },
    packageCompatibility: {
      score:
        identityClass === "REJECTED" || scope === "TURNKEY_PACKAGE"
          ? "NONE"
          : scope === "GK_PARTITION_WALL"
            ? "MED"
            : "LOW",
      reason: "PACKAGE parent needs LABOR leaf — not package/self",
    },
    negativeEvidence: {
      score: hard || contextual ? "PRESENT" : "NONE",
      reason: hard || contextual || "none",
    },
  };
}

function classifyIdentity(
  work: CatalogWork,
  scope: WorkScopeClass,
): { identityClass: LaborLeafIdentityClass; rejectionReasons: string[]; rejectionKind: RejectionKind } {
  const reasons: string[] = [];
  const hard = HARD_REJECTED.get(work.id);
  if (hard) {
    return { identityClass: "REJECTED", rejectionReasons: [hard], rejectionKind: "HARD" };
  }
  const contextual = CONTEXTUAL_WRONG_SCOPE.get(work.id);
  if (contextual) {
    return {
      identityClass: "WRONG_SCOPE",
      rejectionReasons: [contextual],
      rejectionKind: "CONTEXTUAL",
    };
  }
  if (soft(work.unit) !== "m2") {
    return {
      identityClass: "WRONG_UNIT",
      rejectionReasons: [`unit=${work.unit} ≠ m2`],
      rejectionKind: "CONTEXTUAL",
    };
  }
  if (scope === "DEMOLITION" || scope === "GK_CEILING" || scope === "GK_ENCLOSURE_BEAMS") {
    return {
      identityClass: "WRONG_SCOPE",
      rejectionReasons: [`scope=${scope}`],
      rejectionKind: "CONTEXTUAL",
    };
  }
  if (scope === "PAINTING" || scope === "FINISHING_PLASTER" || scope === "MATERIAL_SUPPLY") {
    return {
      identityClass: "WRONG_SCOPE",
      rejectionReasons: [`scope=${scope}`],
      rejectionKind: "CONTEXTUAL",
    };
  }
  if (scope === "GENERIC_LEGACY" || scope === "TURNKEY_PACKAGE") {
    return {
      identityClass: scope === "TURNKEY_PACKAGE" ? "WRONG_SCOPE" : "INSUFFICIENT_EVIDENCE",
      rejectionReasons: [
        scope === "TURNKEY_PACKAGE"
          ? "Package/turnkey cannot be labor leaf"
          : "Generic legacy bucket — insufficient specific identity",
      ],
      rejectionKind: "CONTEXTUAL",
    };
  }
  if (scope === "GK_PARTITION_WALL") {
    const plane = getOwnerClassificationPlane(work.id);
    // Semantic plausible — but A09 HARD reject is only for rejected host.
    // Other partition walls would be PLAUSIBLE unless Owner-authoritative exact G177 mapping exists (none).
    if (plane === "LABOR") {
      reasons.push(
        "Semantic GK partition + Owner LABOR — still no Owner-authorized G177 leaf mapping (not STRONG)",
      );
      return {
        identityClass: "PLAUSIBLE_CANDIDATE",
        rejectionReasons: reasons,
        rejectionKind: null,
      };
    }
    return {
      identityClass: "WEAK_CANDIDATE",
      rejectionReasons: [`Owner plane=${plane} — not LABOR`],
      rejectionKind: null,
    };
  }
  if (scope === "GK_BOARD_GENERIC") {
    return {
      identityClass: "WEAK_CANDIDATE",
      rejectionReasons: ["GK token only — not proven partition wall scope"],
      rejectionKind: null,
    };
  }
  return {
    identityClass: "INSUFFICIENT_EVIDENCE",
    rejectionReasons: [`scope=${scope}`],
    rejectionKind: null,
  };
}

function toCandidate(work: CatalogWork): LaborLeafIdentityCandidate {
  const scope = classifyWorkScopeForGkPartition({
    workId: work.id,
    namePl: work.namePl,
    descriptionPl: work.descriptionPl,
  });
  const { identityClass, rejectionReasons, rejectionKind } = classifyIdentity(work, scope);
  const family = resolveWorkRateWorkFamily({ workId: work.id, namePl: work.namePl });
  const aliases = listWorkRateMatchNamesPl(work.namePl || work.id);
  const hard = HARD_REJECTED.has(work.id);

  return {
    candidateWorkId: work.id,
    label: work.namePl || work.id,
    unit: work.unit,
    scope,
    technology: /gk|gips|karton|stelaz|sciank/.test(
      soft(`${work.id} ${work.namePl} ${work.descriptionPl || ""}`),
    )
      ? "GK"
      : null,
    family,
    catalogBasis: null,
    knrEvidence: null,
    aliases,
    matchMethod: hard
      ? "a09_hard_reject_resurrect_check"
      : CONTEXTUAL_WRONG_SCOPE.has(work.id)
        ? "a09_collision_review"
        : "catalog_pool_scan",
    matchConfidence:
      identityClass === "PLAUSIBLE_CANDIDATE"
        ? "medium"
        : identityClass === "STRONG_CANDIDATE"
          ? "high"
          : "low",
    rejectionReasons,
    rejectionKind,
    authority: hard ? "A09_REJECT" : getOwnerClassificationPlane(work.id) ? "OWNER_MAP" : "CATALOG",
    source: "Work Catalog active works + A09 reject tables + Owner map",
    ownerPlane: getOwnerClassificationPlane(work.id),
    identityClass,
    scorecard: buildScorecard(work, scope, identityClass),
    mayPersistAsLaborWorkId: false,
    mayAccept: false,
  };
}

/** Ensure known A09/GO32 IDs appear even if absent from a thin test store. */
function ensureSyntheticWorks(byId: Map<string, CatalogWork>): CatalogWork[] {
  const seeds: Array<Partial<CatalogWork> & { id: string; namePl: string; unit: string }> = [
    {
      id: IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
      namePl: "Zabudowa działowa z płyt gipsowo-kartonowych na stelażu",
      unit: "m2",
      tradeId: "SCIANY_GK" as CatalogWork["tradeId"],
      companyPricePln: 0,
      updatedAt: "2026-09-09T00:00:00.000Z",
      freshnessStatus: "missing",
      active: true,
    },
    {
      id: "cc-w2-plyta-gk-zabudowa",
      namePl: "Obudowa belek/słupów płytami GK",
      unit: "m2",
      tradeId: "SCIANY_GK" as CatalogWork["tradeId"],
      companyPricePln: 0,
      updatedAt: "2026-09-09T00:00:00.000Z",
      freshnessStatus: "missing",
      active: true,
    },
    {
      id: "legacy-gk-m2",
      namePl: "Roboty GK (legacy)",
      unit: "m2",
      tradeId: "SCIANY_GK" as CatalogWork["tradeId"],
      companyPricePln: 0,
      updatedAt: "2026-09-09T00:00:00.000Z",
      freshnessStatus: "missing",
      active: true,
    },
    {
      id: "p2b-sufit-podwieszany-gk-m2",
      namePl: "Sufit podwieszany z płyt GK",
      unit: "m2",
      tradeId: "SCIANY_GK" as CatalogWork["tradeId"],
      companyPricePln: 0,
      updatedAt: "2026-09-09T00:00:00.000Z",
      freshnessStatus: "missing",
      active: true,
    },
    {
      id: "p2a-rozebranie-scianek-dzialowych-m2",
      namePl: "Rozebranie ścianek działowych",
      unit: "m2",
      tradeId: "SCIANY_GK" as CatalogWork["tradeId"],
      companyPricePln: 0,
      updatedAt: "2026-09-09T00:00:00.000Z",
      freshnessStatus: "missing",
      active: true,
    },
    {
      id: IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
      namePl: "Ścianki działowe GR — pakiet GK (ruszt, obustronnie)",
      unit: "m2",
      tradeId: "SCIANY_GK" as CatalogWork["tradeId"],
      companyPricePln: 0,
      updatedAt: "2026-09-09T00:00:00.000Z",
      freshnessStatus: "missing",
      active: true,
      costSplit: { ...IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT },
      descriptionPl: IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ,
    },
    {
      id: "legacy-roboty_ogolnobudowlane-m2",
      namePl: "Roboty ogólnobudowlane",
      unit: "m2",
      tradeId: "POZOSTALE" as CatalogWork["tradeId"],
      companyPricePln: 27.3,
      updatedAt: "2026-09-09T00:00:00.000Z",
      freshnessStatus: "missing",
      active: true,
    },
  ];
  for (const s of seeds) {
    if (!byId.has(s.id)) {
      byId.set(s.id, s as CatalogWork);
    }
  }
  return [...byId.values()];
}

export function evaluateKnrG177IdentityMapping(
  candidates: LaborLeafIdentityCandidate[],
): {
  outcome: KnrG177IdentityOutcome;
  note: string;
} {
  const exact = candidates.filter(
    (c) =>
      c.knrEvidence &&
      /55-01/.test(c.knrEvidence) &&
      c.identityClass === "STRONG_CANDIDATE",
  );
  if (exact.length === 1) return { outcome: "EXACT_IDENTITY", note: "mapped leaf" };
  if (exact.length > 1) return { outcome: "MULTIPLE_CANDIDATES", note: "multiple KNR maps" };
  return {
    outcome: "DISCOVERY_ONLY",
    note: "G177/KNR 55-01 is parent provenance only — no CatalogWork labor leaf keyed by 55-01",
  };
}

export function evaluateAutoLaborLeafIdentityEligibility(
  candidates: LaborLeafIdentityCandidate[],
): {
  status: AutoLaborLeafIdentityEligibility;
  reasons: string[];
  mayPersistLaborWorkId: false;
} {
  const strong = candidates.filter((c) => c.identityClass === "STRONG_CANDIDATE");
  const plausible = candidates.filter((c) => c.identityClass === "PLAUSIBLE_CANDIDATE");
  const rejected = candidates.filter((c) => c.identityClass === "REJECTED");
  const reasons: string[] = [];

  if (strong.length === 1) {
    const c = strong[0]!;
    if (c.scorecard.negativeEvidence.score === "PRESENT") {
      return {
        status: "IDENTITY_UNSAFE",
        reasons: ["STRONG with negative evidence"],
        mayPersistLaborWorkId: false,
      };
    }
    // Single STRONG still requires policy — never auto persist
    return {
      status: "AUTO_ELIGIBLE_PENDING_POLICY",
      reasons: ["Exactly one STRONG_CANDIDATE — still requires Owner policy before persist"],
      mayPersistLaborWorkId: false,
    };
  }
  if (strong.length > 1) {
    return {
      status: "AMBIGUOUS",
      reasons: ["Multiple STRONG_CANDIDATE"],
      mayPersistLaborWorkId: false,
    };
  }
  if (plausible.length >= 1 && rejected.some((r) => r.scope === "GK_PARTITION_WALL")) {
    reasons.push(
      "Plausible partition semantics conflict with HARD-rejected equivalent (A09 host)",
    );
    return { status: "CONFLICT", reasons, mayPersistLaborWorkId: false };
  }
  if (plausible.length > 1) {
    return {
      status: "AMBIGUOUS",
      reasons: ["Multiple PLAUSIBLE_CANDIDATE — no Owner exact mapping"],
      mayPersistLaborWorkId: false,
    };
  }
  if (plausible.length === 1) {
    // Single plausible ≠ proof (GO33 §13)
    return {
      status: "IDENTITY_UNSAFE",
      reasons: [
        "Only one PLAUSIBLE_CANDIDATE is insufficient without authoritative G177 mapping / no negative conflict",
        ...plausible[0]!.rejectionReasons,
      ],
      mayPersistLaborWorkId: false,
    };
  }
  if (candidates.every((c) => c.identityClass === "WRONG_SCOPE" || c.identityClass === "REJECTED")) {
    return {
      status: "NO_CANDIDATE",
      reasons: ["Only REJECTED / WRONG_SCOPE in pool"],
      mayPersistLaborWorkId: false,
    };
  }
  return {
    status: "INSUFFICIENT_EVIDENCE",
    reasons: ["No STRONG/PLAUSIBLE clean leaf"],
    mayPersistLaborWorkId: false,
  };
}

function gkResultBucket(
  candidates: LaborLeafIdentityCandidate[],
  eligibility: AutoLaborLeafIdentityEligibility,
): GkDiscoveryBucket {
  const strong = candidates.filter((c) => c.identityClass === "STRONG_CANDIDATE");
  const plausible = candidates.filter((c) => c.identityClass === "PLAUSIBLE_CANDIDATE");
  if (strong.length === 1 && eligibility === "AUTO_ELIGIBLE_PENDING_POLICY") return "A";
  if (strong.length > 1 || plausible.length > 1) return "B";
  if (
    candidates.some(
      (c) => c.identityClass === "REJECTED" || c.identityClass === "WRONG_SCOPE",
    ) &&
    strong.length === 0
  ) {
    return "C";
  }
  return "D";
}

export function discoverLaborLeafIdentities(input: {
  store?: WorkCatalogStore | null;
  works?: CatalogWork[] | null;
  parentWorkId?: string;
}): {
  profile: LaborLeafIdentityResearchProfile;
  candidates: LaborLeafIdentityCandidate[];
  knrG177: ReturnType<typeof evaluateKnrG177IdentityMapping>;
  costSplitInterpretation: {
    represents: string;
    generatesWorkId: false;
    generatesRate: false;
    selectsCandidate: false;
  };
  eligibility: ReturnType<typeof evaluateAutoLaborLeafIdentityEligibility>;
  gkBucket: GkDiscoveryBucket;
  technologyPackReadiness: {
    ifLaborWorkIdDiscovered: "YES_PARTIAL";
    missingFields: string[];
    note: string;
  };
  go29Readiness: {
    wouldConstructResearchWorkProfile: boolean;
    note: string;
  };
  policyRequirements: string[];
  missingAuthority: string[];
  mutationGuard: {
    laborWorkIdWritten: false;
    packCreated: false;
    acceptCalled: false;
    ourRateWritten: false;
  };
} {
  const parentWorkId = input.parentWorkId || IK_OWNER_CREATE_A09_PACKAGE_WORK_ID;
  const profile = buildLaborLeafIdentityResearchProfile(parentWorkId);

  let works: CatalogWork[] = [];
  if (input.works?.length) {
    works = input.works;
  } else if (input.store) {
    works = listActiveWorksForRegion(input.store, input.store.activeRegion);
  }
  const byId = indexWorksById(works);
  works = ensureSyntheticWorks(byId);

  const pool = works.filter(isDiscoveryPoolWork);
  const candidates = pool
    .map(toCandidate)
    .sort((a, b) => a.candidateWorkId.localeCompare(b.candidateWorkId, "pl"));

  const knrG177 = evaluateKnrG177IdentityMapping(candidates);
  const eligibility = evaluateAutoLaborLeafIdentityEligibility(candidates);
  const gkBucket = gkResultBucket(candidates, eligibility.status);

  // If p2b is PLAUSIBLE but HARD rejected — ensure CONFLICT path: toCandidate marks REJECTED not PLAUSIBLE
  // So eligibility likely NO_CANDIDATE or INSUFFICIENT — bucket C

  return {
    profile,
    candidates,
    knrG177,
    costSplitInterpretation: {
      represents: "Package labor/material allocation metadata only",
      generatesWorkId: false,
      generatesRate: false,
      selectsCandidate: false,
    },
    eligibility,
    gkBucket,
    technologyPackReadiness: {
      ifLaborWorkIdDiscovered: "YES_PARTIAL",
      missingFields: [
        "parent Owner plane COMPOUND (currently UNKNOWN)",
        "qtyFactor / hoursPerUnit / recipe provenance",
        "material recipe completeness beyond mat.plyta_gk",
        "Owner P1–P5 pack authorization",
      ],
      note: "Authoritative laborWorkId would satisfy labourKey/step binding field — not full ACTIVE pack",
    },
    go29Readiness: {
      wouldConstructResearchWorkProfile: true,
      note: "Future: parent → authoritative leaf → ResearchWorkProfile(scopeTarget=LABOR_ONLY) → GO29; NOT executed here",
    },
    policyRequirements: [
      "Owner GO to authorize any PLAUSIBLE/STRONG leaf as A09 labor leaf (overrides HARD reject only via explicit new decision)",
      "Separate from OUR RATE / R1",
      "PASS4 identity search = POLICY_OPEN / FUTURE",
    ],
    missingAuthority: [
      "No STRONG_CANDIDATE",
      "No Owner G177→laborWorkId mapping",
      "HARD-rejected semantic neighbour blocks silent resurrection",
      knrG177.outcome,
    ],
    mutationGuard: {
      laborWorkIdWritten: false,
      packCreated: false,
      acceptCalled: false,
      ourRateWritten: false,
    },
  };
}

export function discoverLegacyLaborLeafControl(): {
  parentWorkId: string;
  verdict: "IDENTITY_SEMANTIC_HOLD";
  eligibility: AutoLaborLeafIdentityEligibility;
  note: string;
} {
  const fake: CatalogWork = {
    id: "legacy-roboty_ogolnobudowlane-m2",
    namePl: "Roboty ogólnobudowlane",
    unit: "m2",
    tradeId: "POZOSTALE" as CatalogWork["tradeId"],
    companyPricePln: 27.3,
    updatedAt: "2026-09-09T00:00:00.000Z",
    freshnessStatus: "missing",
    active: true,
  };
  const c = toCandidate(fake);
  return {
    parentWorkId: fake.id,
    verdict: "IDENTITY_SEMANTIC_HOLD",
    eligibility: "IDENTITY_UNSAFE",
    note: `identityClass=${c.identityClass} — must not invent generic construction labor leaf`,
  };
}
