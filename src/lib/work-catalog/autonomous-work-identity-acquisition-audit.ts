/**
 * GO34 — Autonomous Work Identity Acquisition (READ-ONLY AUDIT).
 *
 * Question: Can IK safely acquire/construct a new canonical Work Catalog identity
 * autonomously when labor leaf is missing (GO33)?
 *
 * Answer for A09 GK labor leaf: IDENTITY_SOURCE_GAP
 * Existing path = Owner CREATE / KNR Bridge proposal→Owner Accept (DF, P1 NOT AUTHORIZED).
 *
 * NEVER creates CatalogWork · NEVER persist · NEVER pack · NEVER rate.
 */

import {
  IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
  IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ,
  IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT,
  IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
} from "@/lib/work-catalog/ik-owner-create-a09-package-catalog";
import { WORK_CATALOG_SCHEMA_VERSION } from "@/lib/work-catalog/types";
import { getOwnerClassificationPlane } from "@/lib/intelligent-estimator/owner-classification-map";
import { discoverLaborLeafIdentities } from "@/lib/work-catalog/labor-leaf-identity-discovery";

export type IdentityLifecycleStage =
  | "A_DISCOVERED_WORK"
  | "B_IDENTITY_CANDIDATE"
  | "C_CANONICAL_WORK_CANDIDATE"
  | "D_CANONICAL_WORK"
  | "E_OWNER_APPROVED_WORK";

export type SourceAuthorityClass =
  | "AUTHORITATIVE"
  | "DISCOVERY_ONLY"
  | "CANDIDATE_ONLY"
  | "REJECTED"
  | "FORBIDDEN";

export type CreationPathRecord = {
  id: string;
  producer: string;
  input: string;
  authority: string;
  validation: string;
  persistence: string;
  state: string;
  consumer: string;
  createsCanonicalWork: boolean;
  autonomous: boolean;
};

export type IdentitySourceRecord = {
  source: string;
  class: SourceAuthorityClass;
  note: string;
  usableForGkLaborLeaf: boolean;
};

/** Existing Work Catalog creation / seed mechanisms (repo facts). */
export function listWorkCatalogCreationPaths(): CreationPathRecord[] {
  return [
    {
      id: "OWNER_CREATE_A09_PACKAGE",
      producer: "ik-owner-create-a09-package-catalog.ts + ops",
      input: "Owner CREATE_APPROVED_FOR_NEXT_SLICE + G177 provenance",
      authority: "Owner GO",
      validation: "workMatchesOwnerApprovedA09PackageSpec · conflict stop · labor host untouched",
      persistence: "applyA09PackageCatalogSeed → insert/merge → OPS batch-set / saveWorkCatalogRouted",
      state: "active CatalogWork (PACKAGE) · rate PENDING_OWNER · NOT labor leaf",
      consumer: "G1 AUTO winner · GO30 LABOR_COMPOUND · F5 provisional path",
      createsCanonicalWork: true,
      autonomous: false,
    },
    {
      id: "OWNER_CREATE_A01_LP4_LP5",
      producer: "ik-owner-create-a01-lp*-catalog.ts + ops",
      input: "Owner CREATE decision + BOQ evidence",
      authority: "Owner GO",
      validation: "spec match · idempotent seed",
      persistence: "applyA01*CatalogSeed → saveWorkCatalogRouted",
      state: "canonical CatalogWork",
      consumer: "identity mapping slices (separate) · OUR RATE ops (separate)",
      createsCanonicalWork: true,
      autonomous: false,
    },
    {
      id: "OWNER_CREATE_C2_KNR_WC_PROB",
      producer: "ensureC2KnrWcProbOwnerCatalogWorks / SEPA 1301 / Środa A02 / Chrobrego CREATE",
      input: "Owner GO + KNR/tender evidence",
      authority: "Owner GO",
      validation: "field contract · unit · costSplit",
      persistence: "insertWorkBothRegions + saveWorkCatalogRouted",
      state: "canonical CatalogWork",
      consumer: "A1 Owner map (separate GO) · Slice D mappings (separate)",
      createsCanonicalWork: true,
      autonomous: false,
    },
    {
      id: "INSERT_WORK_BOTH_REGIONS",
      producer: "work-catalog-insert.ts",
      input: "CatalogWork draft object",
      authority: "Caller must be Owner-gated OPS",
      validation: "normalize store · region slices",
      persistence: "Does NOT persist — caller saveWorkCatalogRouted / catalog-write-router",
      state: "in-memory store mutation only until routed save",
      consumer: "All Owner CREATE OPS",
      createsCanonicalWork: true,
      autonomous: false,
    },
    {
      id: "CATALOG_WRITE_ROUTER",
      producer: "catalog-write-router.ts",
      input: "WorkCatalogStore",
      authority: "Cloud revision / shrink guards",
      validation: "revision / shrink / route guards",
      persistence: "local + cloud push kw-wgdom-work-catalog",
      state: "persisted store schema v" + String(WORK_CATALOG_SCHEMA_VERSION),
      consumer: "UI / OPS / Accept rate paths",
      createsCanonicalWork: false,
      autonomous: false,
    },
    {
      id: "CATALOG_WAVE_SEED_SCRIPTS",
      producer: "scripts/catalog-wave-2-ops.mjs · catalog-ik-owner-*-ops.mjs",
      input: "CLI dry-run / --execute",
      authority: "Owner execute GO",
      validation: "backup · conflict · PRESENT_OK",
      persistence: "batch-set KV on --execute only",
      state: "seeded regions wroclaw+dolnyslask",
      consumer: "Production catalog",
      createsCanonicalWork: true,
      autonomous: false,
    },
    {
      id: "KNR_WC_IDENTITY_BRIDGE",
      producer: "IK-KNR-WC-IDENTITY-BRIDGE-DESIGN-FREEZE (Variant B)",
      input: "KNR FACT/evidence → proposal",
      authority: "Owner Accept WC (mandatory) — IMPLEMENT P1 NOT AUTHORIZED",
      validation: "proposal ≠ CatalogWork · SimilarWorks evidence only",
      persistence: "TARGET only after Owner Accept + separate IMPLEMENT GO",
      state: "DESIGN FREEZE · zero runtime bridge",
      consumer: "Then A1 · OWNER_KNR_MAPPINGS · Slice D",
      createsCanonicalWork: false,
      autonomous: false,
    },
    {
      id: "KNR_CATALOG_SSOT",
      producer: "knr-knowledge / kw-knr-catalog",
      input: "KNR discovery facts",
      authority: "PENDING_VERIFY / VERIFIED KNR entries — NOT Work Catalog",
      validation: "KNR Expert read-only toward WC",
      persistence: "kw-knr-catalog (separate KV)",
      state: "KNR Catalog ≠ Work Catalog",
      consumer: "Normative BOM L2 / Slice D mapping to EXISTING workId",
      createsCanonicalWork: false,
      autonomous: false,
    },
    {
      id: "WORK_RATE_IDENTITY_MAPPINGS",
      producer: "work-rate-identity-mapping.ts",
      input: "Owner-curated aliases",
      authority: "Owner map rows",
      validation: "exact alias tables",
      persistence: "code-frozen / Owner slices",
      state: "mapping onto EXISTING workId",
      consumer: "selective research match names",
      createsCanonicalWork: false,
      autonomous: false,
    },
    {
      id: "UI_CUSTOM_WORK",
      producer: "Work Catalog UI (source=custom)",
      input: "Admin user form",
      authority: "Human admin session",
      validation: "UI field validation",
      persistence: "saveWorkCatalogRouted",
      state: "canonical CatalogWork",
      consumer: "Estimator / pricing",
      createsCanonicalWork: true,
      autonomous: false,
    },
  ];
}

/** Conceptual lifecycle A–E vs what exists in repo today. */
export function documentIdentityLifecycleBoundaries(): Array<{
  stage: IdentityLifecycleStage;
  definition: string;
  existsInRepo: "YES" | "PARTIAL" | "NO";
  where: string;
}> {
  return [
    {
      stage: "A_DISCOVERED_WORK",
      definition: "Observed work concept from tender/BOQ/KNR/research text — not a CatalogWork id",
      existsInRepo: "PARTIAL",
      where: "OfferBoq description · KNR facts · GO33 discovery pool · G177 verbatim",
    },
    {
      stage: "B_IDENTITY_CANDIDATE",
      definition: "Ranked possible workId or proposed new identity — not accepted",
      existsInRepo: "PARTIAL",
      where: "OfferBoqMatchCandidate · GO33 LaborLeafIdentityCandidate · KNR bridge proposal (TARGET)",
    },
    {
      stage: "C_CANONICAL_WORK_CANDIDATE",
      definition: "Draft CatalogWork-shaped proposal awaiting Owner Accept to persist",
      existsInRepo: "PARTIAL",
      where: "buildIkOwnerCreate*CatalogWork drafts in memory — no first-class draft lifecycle field",
    },
    {
      stage: "D_CANONICAL_WORK",
      definition: "Persisted active CatalogWork.id in kw-wgdom-work-catalog",
      existsInRepo: "YES",
      where: "CatalogWork · insertWorkBothRegions · OPS seeds",
    },
    {
      stage: "E_OWNER_APPROVED_WORK",
      definition: "Canonical work + Owner classification/mapping/rate gates as required",
      existsInRepo: "PARTIAL",
      where: "Owner classification map · OUR RATE Accept · LABOR_ONLY allowlist · identity mappings (separate gates)",
    },
  ];
}

export function listIdentitySourceAuthorityMap(): IdentitySourceRecord[] {
  return [
    {
      source: "Current Work Catalog active works",
      class: "AUTHORITATIVE",
      note: "Canonical D — but GO33 found no authoritative labor leaf for G177",
      usableForGkLaborLeaf: false,
    },
    {
      source: "Legacy catalog buckets (legacy-gk-m2, ogólnobudowlane)",
      class: "CANDIDATE_ONLY",
      note: "Wrong scope / vague — GO33 WRONG_SCOPE / INSUFFICIENT",
      usableForGkLaborLeaf: false,
    },
    {
      source: "KNR 55-01 / G177 verbatim",
      class: "DISCOVERY_ONLY",
      note: "Parent provenance — KNR≠WC identity (Bridge DF)",
      usableForGkLaborLeaf: false,
    },
    {
      source: "Aliases / WORK_RATE_IDENTITY_MAPPINGS",
      class: "CANDIDATE_ONLY",
      note: "No scianki/G177 alias row for labor leaf",
      usableForGkLaborLeaf: false,
    },
    {
      source: "TechnologyPack",
      class: "FORBIDDEN",
      note: "No pack bound; pack consumes identity — does not create it",
      usableForGkLaborLeaf: false,
    },
    {
      source: "External public catalogs / industry DB",
      class: "DISCOVERY_ONLY",
      note: "No WC-canonical integration; KNR catalog separate; PASS4 OFF",
      usableForGkLaborLeaf: false,
    },
    {
      source: "Rejected host p2b-scianka-gk-na-stelazu-m2",
      class: "REJECTED",
      note: "A09 HARD — must not resurrect",
      usableForGkLaborLeaf: false,
    },
    {
      source: "Rate research / Evidence / companyPrice",
      class: "FORBIDDEN",
      note: "Price ≠ identity (GO29/GO33 hard rules)",
      usableForGkLaborLeaf: false,
    },
    {
      source: "Tender documents / previous estimates",
      class: "DISCOVERY_ONLY",
      note: "Evidence for Owner CREATE briefing — not auto WC",
      usableForGkLaborLeaf: false,
    },
    {
      source: "Owner CREATE decision docs (A09)",
      class: "AUTHORITATIVE",
      note: "Authoritative for PACKAGE work — explicitly NOT labor leaf CREATE",
      usableForGkLaborLeaf: false,
    },
  ];
}

export function analyzeGkIdentitySourceGap(): {
  parentWorkId: string;
  laborLeafVerdict: "IDENTITY_SOURCE_GAP";
  packageIdentityExists: true;
  candidateLaborIdentity: null;
  scope: string;
  unit: string;
  technology: string;
  provenance: string;
  authority: null;
  note: string;
} {
  return {
    parentWorkId: IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
    laborLeafVerdict: "IDENTITY_SOURCE_GAP",
    packageIdentityExists: true,
    candidateLaborIdentity: null,
    scope: "LABOR_ONLY for GK partition wall (target) — not established as CatalogWork",
    unit: "m2",
    technology: "GK",
    provenance: IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ,
    authority: null,
    note: "GO33 bucket C + no AUTHORITATIVE source for exact labor leaf → IDENTITY_SOURCE_GAP",
  };
}

export function analyzeKnrG177ForAcquisition(): {
  outcome: "DISCOVERY_ONLY";
  mapsToExactCatalogWork: false;
  externalKnrMappingMechanism: string;
  knrIsCanonicalWorkId: false;
} {
  return {
    outcome: "DISCOVERY_ONLY",
    mapsToExactCatalogWork: false,
    externalKnrMappingMechanism:
      "KNR Bridge DF Variant B (proposal→Owner Accept) + OWNER_KNR_MAPPINGS + Slice D — IMPLEMENT P1 NOT AUTHORIZED; KNR Catalog ≠ WC",
    knrIsCanonicalWorkId: false,
  };
}

export function listExternalCatalogArchitecture(): Array<{
  name: string;
  apiOrSource: string;
  identityKey: string;
  licenseAuthority: string;
  freshness: string;
  mappingMechanism: string;
  usableAsCanonicalIdentity: false;
  discoveryOnly: true;
}> {
  return [
    {
      name: "KNR Catalog (WGDOM)",
      apiOrSource: "kw-knr-catalog / knr-knowledge",
      identityKey: "evidenceKey / tableCode",
      licenseAuthority: "Internal KNR evidence SSOT",
      freshness: "PENDING_VERIFY / VERIFIED lifecycle",
      mappingMechanism: "Slice D exact map to EXISTING CatalogWork.id",
      usableAsCanonicalIdentity: false,
      discoveryOnly: true,
    },
    {
      name: "Public KNR research engines",
      apiOrSource: "ik-public-knr-*-engine (staged facts)",
      identityKey: "KNR codes",
      licenseAuthority: "Public sources — not WC authority",
      freshness: "On-demand discovery",
      mappingMechanism: "Stage to KNR catalog — never auto WC",
      usableAsCanonicalIdentity: false,
      discoveryOnly: true,
    },
    {
      name: "Market / DIY material catalogs",
      apiOrSource: "Price Intelligence / mat.* map",
      identityKey: "materialKey",
      licenseAuthority: "Market quotes — material plane",
      freshness: "Quote timestamps",
      mappingMechanism: "MATERIAL research — not labor WC identity",
      usableAsCanonicalIdentity: false,
      discoveryOnly: true,
    },
    {
      name: "Work-rate allowlisted pricing hosts",
      apiOrSource: "PASS1/PASS2 selective research",
      identityKey: "sourceId + offer name",
      licenseAuthority: "Authorized hosts only",
      freshness: "Retrieved at research time",
      mappingMechanism: "Rate Evidence — FORBIDDEN as identity mint",
      usableAsCanonicalIdentity: false,
      discoveryOnly: true,
    },
  ];
}

export function evaluateAutonomyOptions(): Array<{
  option: "A" | "B" | "C" | "D" | "E";
  title: string;
  autonomy: string;
  falsePositiveRisk: string;
  auditability: string;
  dataQuality: string;
  complexity: string;
  ssotCompatibility: string;
}> {
  return [
    {
      option: "A",
      title: "Owner manually creates/chooses missing WC identity",
      autonomy: "LOW",
      falsePositiveRisk: "LOW",
      auditability: "HIGH",
      dataQuality: "HIGH (Owner)",
      complexity: "NONE (status quo A09/A01)",
      ssotCompatibility: "Exact current Owner CREATE path",
    },
    {
      option: "B",
      title: "AI proposes new WC identity · Owner approves",
      autonomy: "MEDIUM",
      falsePositiveRisk: "MEDIUM (mitigated by Accept gate)",
      auditability: "HIGH",
      dataQuality: "HIGH if Accept strict",
      complexity: "MEDIUM — aligns KNR Bridge Variant B",
      ssotCompatibility: "REUSE Bridge DF + Owner CREATE pattern",
    },
    {
      option: "C",
      title: "AI autonomously creates canonical identity when deterministic",
      autonomy: "HIGH",
      falsePositiveRisk: "HIGH",
      auditability: "MEDIUM",
      dataQuality: "RISKY without external authority",
      complexity: "HIGH",
      ssotCompatibility: "Conflicts Bridge DF Owner-Accept-mandatory today",
    },
    {
      option: "D",
      title: "External authoritative catalog auto-creates identity",
      autonomy: "HIGH",
      falsePositiveRisk: "HIGH without license+exact map",
      auditability: "MEDIUM",
      dataQuality: "Depends on external SSOT",
      complexity: "HIGH — no such WC integration today",
      ssotCompatibility: "GAP — KNR Catalog ≠ WC",
    },
    {
      option: "E",
      title: "Hybrid (propose + optional auto under frozen deterministic rules)",
      autonomy: "MEDIUM–HIGH",
      falsePositiveRisk: "MEDIUM",
      auditability: "HIGH if rules frozen",
      dataQuality: "MEDIUM–HIGH",
      complexity: "HIGH",
      ssotCompatibility: "Requires new Owner policy P1–P9",
    },
  ];
}

export const GO34_RECOMMENDED_ARCHITECTURE = Object.freeze({
  recommendation: "B_PRIMARY_WITH_E_FUTURE",
  pipeline: [
    "G1 trusted package",
    "Identity Research (separate from Rate Research / GO29)",
    "Identity Candidate (B)",
    "Canonical Work Candidate draft (C) — no persist",
    "Owner Accept → Canonical Work (D)",
    "Owner A1 / mappings (E gates)",
    "TechnologyPack bind",
    "Leaf Research → GO29 Rate Candidate",
  ],
  note: "Architecture recommendation only — Owner policy OPEN. Do not implement C/D without explicit GO.",
  safetyRules: [
    "similar label ↛ new canonical identity",
    "KNR ↛ automatic WC identity without authoritative mapping + Owner Accept",
    "research price ↛ new work identity",
    "rejected candidate ↛ resurrected canonical identity",
  ],
});

export function documentCatalogDataModelGaps(): {
  schemaVersion: number;
  supports: Record<string, boolean>;
  minimumExtensionNeeded: string[];
} {
  return {
    schemaVersion: WORK_CATALOG_SCHEMA_VERSION,
    supports: {
      draftIdentityLifecycleField: false,
      candidateIdentityStore: false,
      identityProvenanceField: false,
      identityConfidenceField: false,
      externalMappingOnCatalogWork: false,
      identityVersionLifecycle: false,
      sourceFieldSeedCustomCopied: true,
      costSplit: true,
      ourWorkRate: true,
      descriptionKeywords: true,
    },
    minimumExtensionNeeded: [
      "Separate IdentityCandidate artefact (or KV) with provenance/confidence — not silent CatalogWork",
      "Optional draft/proposal state OR keep proposals outside CatalogWork until Owner Accept (Bridge DF)",
      "Explicit externalMapping refs (KNR key → workId) via OWNER_KNR_MAPPINGS — already separate",
      "Do NOT overload companyPrice/ourWorkRate as identity authority",
    ],
  };
}

export function documentTechnologyPackSequenceGates(): string[] {
  return [
    "Identity Candidate (non-persisted)",
    "Owner Accept → Canonical Work (laborWorkId)",
    "Owner A1 plane LABOR or COMPOUND parent+leaf auth",
    "TechnologyPack DRAFT with steps/labour bound",
    "RECIPE-01A provenance → APPROVED → ACTIVE",
    "assertLeafLaborResearchAllowed",
    "executeLeafResearch → selective rate research",
    "GO29 Rate Candidate (isOurRate=false)",
  ];
}

export function listOwnerPolicyQuestionsP1P9(): Array<{
  id: string;
  question: string;
}> {
  return [
    { id: "P1", question: "May AI propose new Work Catalog identities?" },
    { id: "P2", question: "May AI create canonical identity without Owner Accept?" },
    { id: "P3", question: "What makes an external identity authoritative?" },
    { id: "P4", question: "What is required to distinguish competing identities?" },
    { id: "P5", question: "May KNR provide identity authority (vs discovery only)?" },
    { id: "P6", question: "Identity freshness / versioning rules?" },
    { id: "P7", question: "Owner exception path (manual CREATE)?" },
    { id: "P8", question: "Provenance requirements for proposals?" },
    {
      id: "P9",
      question: "Relationship between identity confidence and any future auto-creation?",
    },
  ];
}

export function auditLegacyIdentityAcquisitionHold(): {
  workId: string;
  verdict: "IDENTITY_SEMANTIC_HOLD";
  mayAutonomousCanonicalIdentity: false;
} {
  return {
    workId: "legacy-roboty_ogolnobudowlane-m2",
    verdict: "IDENTITY_SEMANTIC_HOLD",
    mayAutonomousCanonicalIdentity: false,
  };
}

/**
 * Full GO34 audit — pure / deterministic / no I/O.
 */
export function auditAutonomousWorkIdentityAcquisition(): {
  verdict: "AUTONOMOUS_WORK_IDENTITY_ACQUISITION_AUDIT_PASS_IDENTITY_SOURCE_GAP";
  currentIdentityGap: string;
  creationPaths: CreationPathRecord[];
  lifecycle: ReturnType<typeof documentIdentityLifecycleBoundaries>;
  sourceAuthority: IdentitySourceRecord[];
  gk: ReturnType<typeof analyzeGkIdentitySourceGap>;
  knrG177: ReturnType<typeof analyzeKnrG177ForAcquisition>;
  externalCatalogs: ReturnType<typeof listExternalCatalogArchitecture>;
  autonomyOptions: ReturnType<typeof evaluateAutonomyOptions>;
  recommendedArchitecture: typeof GO34_RECOMMENDED_ARCHITECTURE;
  dataModelGaps: ReturnType<typeof documentCatalogDataModelGaps>;
  technologyPackGates: string[];
  go29Seam: string;
  legacy: ReturnType<typeof auditLegacyIdentityAcquisitionHold>;
  ownerPolicyQuestions: ReturnType<typeof listOwnerPolicyQuestionsP1P9>;
  go33CrossCheck: {
    gkBucket: string;
    strongCount: number;
  };
  autoIdentityEligibleEvidenceNeeded: string[];
  mutationGuard: {
    catalogWrite: false;
    laborWorkIdWrite: false;
    packCreate: false;
    rate: false;
    accept: false;
    classificationMutation: false;
  };
} {
  const go33 = discoverLaborLeafIdentities({});
  const strongCount = go33.candidates.filter((c) => c.identityClass === "STRONG_CANDIDATE").length;

  return {
    verdict: "AUTONOMOUS_WORK_IDENTITY_ACQUISITION_AUDIT_PASS_IDENTITY_SOURCE_GAP",
    currentIdentityGap:
      "Canonical LABOR identity missing for G177 package labor component — PACKAGE exists; labor leaf IDENTITY_SOURCE_GAP",
    creationPaths: listWorkCatalogCreationPaths(),
    lifecycle: documentIdentityLifecycleBoundaries(),
    sourceAuthority: listIdentitySourceAuthorityMap(),
    gk: analyzeGkIdentitySourceGap(),
    knrG177: analyzeKnrG177ForAcquisition(),
    externalCatalogs: listExternalCatalogArchitecture(),
    autonomyOptions: evaluateAutonomyOptions(),
    recommendedArchitecture: GO34_RECOMMENDED_ARCHITECTURE,
    dataModelGaps: documentCatalogDataModelGaps(),
    technologyPackGates: documentTechnologyPackSequenceGates(),
    go29Seam:
      "Identity Candidate accepted → laborWorkId → ResearchWorkProfile → GO29 Rate Candidate only (no rate in GO34)",
    legacy: auditLegacyIdentityAcquisitionHold(),
    ownerPolicyQuestions: listOwnerPolicyQuestionsP1P9(),
    go33CrossCheck: { gkBucket: go33.gkBucket, strongCount },
    autoIdentityEligibleEvidenceNeeded: [
      "exact scope + technology + unit",
      "authoritative external or Owner mapping",
      "no competing identity",
      "no rejected equivalent conflict",
      "deterministic provenance",
      "Owner Accept gate (per Bridge DF) unless future P2 amends",
    ],
    mutationGuard: {
      catalogWrite: false,
      laborWorkIdWrite: false,
      packCreate: false,
      rate: false,
      accept: false,
      classificationMutation: false,
    },
  };
}

/** Safety invariants for tests. */
export const GO34_SAFETY_INVARIANTS = Object.freeze([
  "similar_label_not_canonical",
  "knr_not_automatic_wc_without_mapping_and_accept",
  "price_not_identity",
  "rejected_not_resurrected",
  "a09_package_not_labor_leaf",
  "costSplit_not_workId",
]);
