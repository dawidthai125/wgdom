/**
 * P0 Identity Coverage Option D — G1 prefill / explicit Accept harness (pure).
 * Run: npx vite-node scripts/test-ik-p0-identity-coverage-g1-prefill.mjs
 *
 * NO production mutations · NO Accept against live · NO OUR RATE / SELL / G3.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildG1ManualOverride,
  upsertManualOverride,
  resolveG1IdentityPrefill,
  resolveSuggestedCatalogWorkIdForG1,
  listDistinctCandidateWorkIds,
  isG1QuantityBlocked,
} from "../src/lib/intelligent-estimator/orchestra/ik-owner-gate-actions.ts";
import { buildIkOwnerActionQueue } from "../src/lib/intelligent-estimator/orchestra/ik-owner-action-queue.ts";
import { computeOfferBoqIdentityPayloadHash } from "../src/lib/intelligent-estimator/orchestra/ik-identity-persist-glue.ts";
import { buildIkExpertAdmissionSummary } from "../src/lib/intelligent-estimator/ik-expert-admission.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra ?? "");
  }
}

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const panelSrc = readSrc("src/app/intelligent-estimator/IkOwnerGateActionsPanel.tsx");
const actionsSrc = readSrc("src/lib/intelligent-estimator/orchestra/ik-owner-gate-actions.ts");
const queueSrc = readSrc("src/lib/intelligent-estimator/orchestra/ik-owner-action-queue.ts");
const hookSrc = readSrc("src/lib/intelligent-estimator/orchestra/use-ik-orchestra.ts");
const admissionSrc = readSrc("src/lib/intelligent-estimator/ik-expert-admission.ts");

ok("panel uses resolveG1IdentityPrefill", panelSrc.includes("resolveG1IdentityPrefill"));
ok("panel SUGGESTION label", panelSrc.includes("SUGGESTION / PREFILL"));
ok("panel competing candidates UI", panelSrc.includes("data-ik-g1-competing-candidates"));
ok("panel no bulk grouping", !panelSrc.includes("apply to similar") && !panelSrc.includes("equivalence"));
ok("actions has resolveG1IdentityPrefill", actionsSrc.includes("export function resolveG1IdentityPrefill"));
ok("actions qty blocked helper", actionsSrc.includes("isG1QuantityBlocked"));
ok("queue skips qty=0", queueSrc.includes("Number(line.quantity) === 0"));
ok("persist still runGatedIdentityPersist", hookSrc.includes("runGatedIdentityPersist"));
ok("g1Accept still buildG1ManualOverride", hookSrc.includes("buildG1ManualOverride"));
ok("line-tolerant admission file untouched contract markers",
  admissionSrc.includes("expertChainMayProceed") || admissionSrc.includes("admittedLineIds"));

function emptyWorkIdentity(status = "NO_IDENTITY") {
  return {
    status,
    statusLabelPl: status,
    workId: status === "OK" ? "work-trusted" : null,
    unit: "m2",
    unitRaw: "m2",
    matchMethod: null,
    matchConfidence: null,
    gaps: [],
    ownerUnitCompatibility: null,
  };
}

function coverageLine(partial) {
  return {
    dwellingId: "d1",
    lineId: partial.lineId ?? "obl_x",
    lp: partial.lp ?? "2",
    description: partial.description ?? "test",
    quantity: partial.quantity ?? 1,
    unit: "m2",
    branch: null,
    sourceDocumentId: null,
    sourceLineKey: null,
    lineProvenance: null,
    plane: "UNKNOWN",
    classify: { plane: "UNKNOWN" },
    workIdentity: partial.workIdentity ?? emptyWorkIdentity(partial.identityStatus ?? "NO_IDENTITY"),
    mapperCatalogWorkId: partial.mapperCatalogWorkId ?? null,
    mapperMatchMethod: partial.mapperMatchMethod ?? null,
    trustedWorkIdentity: partial.trustedWorkIdentity ?? false,
    trustedMaterialIdentity: false,
    materialKey: null,
    materialCatalogWorkId: partial.materialCatalogWorkId ?? null,
    materialVia: null,
    approvedAliasHit: false,
    aliasRuleId: null,
    aliasPackProductId: null,
    aliasResolvedWithQuotes: null,
    aliasMissingWork: false,
    aliasMissingQuotes: false,
    laborIdentityRegistry: partial.laborIdentityRegistry ?? null,
    laborIdentityWorkId: partial.laborIdentityWorkId ?? null,
    ownerMappingPossible: false,
    ownerUnitCompatibilityConfirmed: false,
    ownerUnitCompatibilityGroupId: null,
    status: partial.status ?? "IDENTITY_GAP",
    reasonPl: "t",
    mappingSource: null,
  };
}

function coverageReport(lines) {
  return {
    tenderId: "t-p0",
    status: "ready",
    counts: {
      inputLineCount: lines.length,
      outputLineCount: lines.length,
      nonCost: 0,
      trustedWorkIdentity: 0,
      trustedMaterialIdentity: 0,
      approvedAlias: 0,
      ownerMappingPossible: 0,
      ambiguous: lines.filter((l) => l.status === "AMBIGUOUS").length,
      identityGap: lines.filter((l) => l.status === "IDENTITY_GAP").length,
      unresolved: 0,
      byStatus: {},
    },
    reconciliation: { ok: true, unexplainedLoss: 0, unexplainedDuplication: 0, reasons: [] },
    dwellingPreservation: true,
    branchPreservation: true,
    provenancePreservation: true,
    pricingExecuted: false,
    researchExecuted: false,
    autoAcceptExecuted: false,
    identityInvention: false,
    lines,
    unresolvedExamples: [],
    reasons: [],
    wave2SeedAudit: {
      seedEligibleMissingWork: 0,
      seedCreated: 0,
      alreadyPresentProductIds: [],
      invalidUnitAliasHits: 0,
      unitCompatibilityConfirmed: 0,
      wave2IdsPresentInCatalog: 0,
      wave2IdsExpected: 0,
      source: "existing_work_catalog",
      duplicateWorkIds: [],
    },
  };
}

// 1) Prefill does not mutate / persist — pure function returns suggestion only
const uniqueMapped = {
  catalogWorkId: null,
  matchMethod: "catalog_map",
  matchConfidence: "medium",
  candidateMatches: [
    {
      catalogWorkId: "work-a",
      workNamePl: "A",
      workCategory: "x",
      tradeId: null,
      score: 1,
      role: "candidate",
      matchedBy: "catalog",
      matchConfidence: "medium",
      rationale: "t",
    },
  ],
};
const uniquePrefill = resolveG1IdentityPrefill({
  identityCoverage: coverageReport([
    coverageLine({ lineId: "obl_u1", status: "IDENTITY_GAP" }),
  ]),
  dwellingId: "d1",
  lineId: "obl_u1",
  mappedLine: uniqueMapped,
});
ok("unique prefill kind", uniquePrefill.kind === "unique_suggestion");
ok("unique prefill id", uniquePrefill.suggestedCatalogWorkId === "work-a");
ok("prefill source candidate_unique", uniquePrefill.source === "candidate_unique");

// Competing — no auto-select
const competingMapped = {
  catalogWorkId: null,
  matchMethod: "catalog_map",
  matchConfidence: "medium",
  candidateMatches: [
    {
      catalogWorkId: "work-a",
      workNamePl: "A",
      workCategory: "x",
      tradeId: null,
      score: 2,
      role: "candidate",
      matchedBy: "catalog",
      matchConfidence: "medium",
      rationale: "t",
    },
    {
      catalogWorkId: "work-b",
      workNamePl: "B",
      workCategory: "x",
      tradeId: null,
      score: 1,
      role: "candidate",
      matchedBy: "catalog",
      matchConfidence: "medium",
      rationale: "t",
    },
  ],
};
const competingPrefill = resolveG1IdentityPrefill({
  identityCoverage: coverageReport([
    coverageLine({
      lineId: "obl_c1",
      status: "AMBIGUOUS",
      identityStatus: "AMBIGUOUS",
      laborIdentityWorkId: "work-sneaky",
      laborIdentityRegistry: "HIT",
      mapperCatalogWorkId: "work-sneaky",
    }),
  ]),
  dwellingId: "d1",
  lineId: "obl_c1",
  mappedLine: competingMapped,
});
ok("competing kind", competingPrefill.kind === "competing");
ok("competing no suggested", competingPrefill.suggestedCatalogWorkId === null);
ok(
  "legacy helper null on competing",
  resolveSuggestedCatalogWorkIdForG1(
    coverageReport([
      coverageLine({
        lineId: "obl_c1",
        status: "AMBIGUOUS",
        laborIdentityWorkId: "work-sneaky",
        mapperCatalogWorkId: "work-sneaky",
      }),
    ]),
    "d1",
    "obl_c1",
    competingMapped,
  ) === null,
);
ok(
  "competing lists candidates",
  competingPrefill.candidateWorkIds.join(",") === "work-a,work-b",
);

// No candidate → unresolved
const nonePrefill = resolveG1IdentityPrefill({
  identityCoverage: coverageReport([
    coverageLine({ lineId: "obl_n1", status: "IDENTITY_GAP" }),
  ]),
  dwellingId: "d1",
  lineId: "obl_n1",
  mappedLine: { catalogWorkId: null, matchMethod: "unmatched", matchConfidence: "low", candidateMatches: [] },
});
ok("no candidate kind none", nonePrefill.kind === "none");
ok("no candidate suggested null", nonePrefill.suggestedCatalogWorkId === null);

// LP43 qty=0 blocked
const lp43 = coverageLine({
  lineId: "obl_6008ebc1",
  lp: "43",
  quantity: 0,
  status: "IDENTITY_GAP",
});
ok("qty blocked helper", isG1QuantityBlocked(lp43) === true);
const lp43Prefill = resolveG1IdentityPrefill({
  identityCoverage: coverageReport([lp43]),
  dwellingId: "d1",
  lineId: "obl_6008ebc1",
  mappedLine: uniqueMapped,
});
ok("LP43 prefill qty_blocked", lp43Prefill.kind === "qty_blocked");
ok("LP43 no suggestion", lp43Prefill.suggestedCatalogWorkId === null);

const queue = buildIkOwnerActionQueue({
  tenderId: "t-p0",
  pkg: null,
  store: { work: [], revision: 0 },
  identityCoverage: coverageReport([
    lp43,
    coverageLine({ lineId: "obl_ok", status: "AMBIGUOUS", quantity: 1 }),
  ]),
});
ok(
  "queue excludes LP43 qty=0",
  !queue.items.some((i) => i.lineRef === "obl_6008ebc1"),
);
ok(
  "queue keeps ambiguous qty>0",
  queue.items.some((i) => i.lineRef === "obl_ok" && i.domain === "identity"),
);

// Explicit G1 Accept → manual override (matchMethod manual · lineId canonical)
const ov1 = buildG1ManualOverride({
  dwellingId: "d1",
  lineId: "obl_u1",
  catalogWorkId: "work-a",
});
ok("G1 override matchMethod manual", ov1.matchMethod === "manual");
ok("G1 override lineId canonical", ov1.lineId === "obl_u1");
ok("G1 override workId", ov1.catalogWorkId === "work-a");

let overrides = [];
overrides = upsertManualOverride(overrides, ov1);
overrides = upsertManualOverride(
  overrides,
  buildG1ManualOverride({ dwellingId: "d1", lineId: "obl_u1", catalogWorkId: "work-a" }),
);
ok("idempotent upsert same lineId", overrides.length === 1);

// Identity payload hash stable for same lineId payload (existing contract)
const linesA = [
  {
    lineId: "obl_u1",
    description: "x",
    unit: "m2",
    quantity: 1,
    catalogWorkId: "work-a",
    matchMethod: "manual",
    matchConfidence: "high",
    candidateMatches: [],
    isNoise: false,
  },
];
const h1 = computeOfferBoqIdentityPayloadHash(linesA);
const h2 = computeOfferBoqIdentityPayloadHash(linesA);
ok("identity payload hash idempotent", h1 === h2 && typeof h1 === "string" && h1.length > 0);

// Trusted → no suggestion mutation path
const trustedPrefill = resolveG1IdentityPrefill({
  identityCoverage: coverageReport([
    coverageLine({
      lineId: "obl_t1",
      status: "TRUSTED_WORK",
      trustedWorkIdentity: true,
      identityStatus: "OK",
      mapperCatalogWorkId: "work-trusted",
    }),
  ]),
  dwellingId: "d1",
  lineId: "obl_t1",
});
ok("trusted kind", trustedPrefill.kind === "trusted");
ok("trusted no suggested (no re-G1)", trustedPrefill.suggestedCatalogWorkId === null);

// candidate list helper
ok(
  "listDistinctCandidateWorkIds dedupes",
  listDistinctCandidateWorkIds({
    catalogWorkId: null,
    matchMethod: "catalog_map",
    matchConfidence: "medium",
    candidateMatches: [
      { catalogWorkId: "a", workNamePl: "", workCategory: "", tradeId: null, score: 1, role: "candidate", matchedBy: "catalog", matchConfidence: "medium", rationale: "" },
      { catalogWorkId: "a", workNamePl: "", workCategory: "", tradeId: null, score: 1, role: "candidate", matchedBy: "catalog", matchConfidence: "medium", rationale: "" },
      { catalogWorkId: "b", workNamePl: "", workCategory: "", tradeId: null, score: 1, role: "candidate", matchedBy: "catalog", matchConfidence: "medium", rationale: "" },
    ],
  }).join(",") === "a,b",
);

// Static: no OUR RATE / SELL / G3 in this slice surface
ok("panel no OUR RATE write", !panelSrc.includes("acceptWorkRate") && !panelSrc.includes("OUR_RATE"));
ok("panel no G3 accept", !panelSrc.includes("g3Accept"));
ok("actions no price memory", !actionsSrc.includes("priceMemory") && !actionsSrc.includes("PriceMemory"));

// Line-tolerant regression — admission still separates qty>0 vs qty=0
const admissionProbe = buildIkExpertAdmissionSummary({
  documentStatus: "partial",
  readyForExperts: false,
  lines: [
    { lineId: "a", description: "x", quantity: 1, unit: "m2", isNoise: false },
    { lineId: "obl_6008ebc1", description: "y", quantity: 0, unit: "m2", isNoise: false },
  ],
});
ok("line-tolerant still admits qty>0", admissionProbe.admittedCount >= 1);
ok(
  "line-tolerant keeps qty=0 unresolved",
  admissionProbe.unresolvedLineIds.includes("obl_6008ebc1"),
);

console.log(`\nRESULT ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
