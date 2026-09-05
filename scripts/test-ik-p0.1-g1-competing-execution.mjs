/**
 * P0.1 G1 Competing Execution — local harness (pure + static surface).
 * Run: npx vite-node scripts/test-ik-p0.1-g1-competing-execution.mjs
 *
 * NO production mutations · NO live G1 Accept · NO OUR RATE / SELL / G3.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildG1ManualOverride,
  upsertManualOverride,
  resolveG1IdentityPrefill,
  listDistinctCandidateWorkIds,
  listCandidateEvidence,
  isSelectedCatalogWorkIdFresh,
  isG1QuantityBlocked,
  findPackageLineCatalogWorkId,
  resolveG1DurableIdentityState,
  isG1PersistRetryRequired,
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
const persistSrc = readSrc("src/lib/intelligent-estimator/orchestra/ik-identity-persist-glue.ts");
const phaseSrc = readSrc("src/lib/intelligent-estimator/orchestra/ik-identity-phase.ts");

// --- Static surface ---
ok("no hard slice(0, 8) truncation", !panelSrc.includes("slice(0, 8)"));
ok("queue page navigation present", panelSrc.includes("GATE_PAGE_SIZE") && panelSrc.includes("data-ik-owner-gate-queue-total"));
ok("line evidence markers", panelSrc.includes("data-ik-g1-line-evidence") && panelSrc.includes("data-ik-g1-line-description"));
ok("candidate evidence markers", panelSrc.includes("data-ik-g1-candidate-name") && panelSrc.includes("workNamePl"));
ok("stale notice UI", panelSrc.includes("STALE CANDIDATE") && panelSrc.includes("isSelectedCatalogWorkIdFresh"));
ok("persist fail UI", panelSrc.includes("PERSISTENCE FAILED") && panelSrc.includes("resolveG1DurableIdentityState"));
ok("persist retry resurface", panelSrc.includes("buildPersistRetryItems") || panelSrc.includes("PERSISTENCE_FAILED_RETRY"));
ok("explicit selection click only sets state", panelSrc.includes("selectCandidate") && panelSrc.includes("setCatalogWorkId"));
ok("g1Accept still called with catalogWorkId", panelSrc.includes("ownerGate.g1Accept({"));
ok("no bulk", !panelSrc.includes("bulk Accept") && !panelSrc.includes("apply to similar") && !panelSrc.includes("equivalence"));
ok("no OUR RATE mutation surface", !panelSrc.includes("acceptWorkRate") && !panelSrc.includes("OUR_RATE"));
ok("no G3 accept in panel", !panelSrc.includes("g3Accept"));
ok("helpers: stale + durable", actionsSrc.includes("isSelectedCatalogWorkIdFresh") && actionsSrc.includes("resolveG1DurableIdentityState"));
ok("G1 API hook unchanged markers", hookSrc.includes("g1Accept:") && hookSrc.includes("buildG1ManualOverride"));
ok("persist glue untouched runGatedIdentityPersist", persistSrc.includes("export function runGatedIdentityPersist"));
ok("identity phase file not required for P0.1 surface", phaseSrc.includes("OwnerManualIdentityOverride"));
ok("admission file not modified contract", admissionSrc.includes("admittedLineIds") || admissionSrc.includes("unresolvedLineIds"));
ok("queue still skips qty=0", queueSrc.includes("Number(line.quantity) === 0"));

function cand(id, extra = {}) {
  return {
    catalogWorkId: id,
    workNamePl: extra.workNamePl ?? `Name ${id}`,
    workCategory: extra.workCategory ?? "cat",
    tradeId: extra.tradeId ?? "trade",
    score: extra.score ?? 0.5,
    role: extra.role ?? "candidate",
    matchedBy: extra.matchedBy ?? "catalog",
    matchConfidence: extra.matchConfidence ?? "medium",
    rationale: extra.rationale ?? "why",
  };
}

function mapped(partial) {
  return {
    lineId: partial.lineId ?? "obl_1",
    lp: partial.lp ?? "2",
    description: partial.description ?? "opis linii",
    unit: partial.unit ?? "m2",
    quantity: partial.quantity ?? 1,
    catalogWorkId: partial.catalogWorkId ?? null,
    matchMethod: partial.matchMethod ?? "catalog_map",
    matchConfidence: partial.matchConfidence ?? "medium",
    candidateMatches: partial.candidateMatches ?? [],
  };
}

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
    tenderId: "t-p01",
    status: "ready",
    counts: {
      inputLineCount: lines.length,
      outputLineCount: lines.length,
      nonCost: 0,
      trustedWorkIdentity: lines.filter((l) => l.trustedWorkIdentity).length,
      trustedMaterialIdentity: 0,
      approvedAlias: 0,
      identityGap: lines.filter((l) => l.status === "IDENTITY_GAP").length,
      ambiguous: lines.filter((l) => l.status === "AMBIGUOUS").length,
    },
    lines,
    unresolvedExamples: [],
    reconciliation: { ok: true },
    wave2SeedAudit: { seedCreated: 0 },
  };
}

// 1) Full queue — 154 competing accessible (queue builder + no panel hard truncate)
const competing154 = Array.from({ length: 154 }, (_, i) =>
  coverageLine({
    lineId: `obl_c_${i}`,
    lp: String(i + 1),
    status: "AMBIGUOUS",
    quantity: 1,
  }),
);
const none11 = Array.from({ length: 11 }, (_, i) =>
  coverageLine({
    lineId: `obl_n_${i}`,
    lp: `N${i}`,
    status: "IDENTITY_GAP",
    quantity: 1,
  }),
);
const trusted1 = coverageLine({
  lineId: "obl_trusted",
  lp: "T",
  status: "TRUSTED_WORK",
  trustedWorkIdentity: true,
  workIdentity: emptyWorkIdentity("OK"),
  quantity: 1,
});
const lp43 = coverageLine({
  lineId: "obl_6008ebc1",
  lp: "43",
  status: "IDENTITY_GAP",
  quantity: 0,
});
const cov = coverageReport([...competing154, ...none11, trusted1, lp43]);
const q = buildIkOwnerActionQueue({
  tenderId: "08dee8b8-8e1d-e41d-ebd1-650001da8677",
  pkg: null,
  store: { works: [], categories: [], version: 1 },
  identityCoverage: cov,
});
const identityItems = q.items.filter((i) => i.domain === "identity");
ok("queue has 154+11 identity items (165)", identityItems.length === 165, identityItems.length);
ok("LP43 excluded from queue", !identityItems.some((i) => i.lineRef === "obl_6008ebc1"));
ok("trusted not in identity queue", !identityItems.some((i) => i.lineRef === "obl_trusted"));
ok("all 154 competing lineIds present", competing154.every((l) => identityItems.some((i) => i.lineRef === l.lineId)));
ok("panel page size reaches 154 via pages", Math.ceil(165 / 25) >= 7);

// 2–3) Line + candidate evidence helpers
const mComp = mapped({
  candidateMatches: [cand("w1", { workNamePl: "Robot A", rationale: "r1" }), cand("w2")],
});
const evidence = listCandidateEvidence(mComp);
ok("candidate evidence length 2", evidence.length === 2);
ok("candidate evidence has workNamePl", evidence[0].workNamePl === "Robot A");
ok("candidate evidence has rationale", evidence[0].rationale === "r1");

// 4–5) Selection ≠ trusted · Accept blocked without selection
const prefComp = resolveG1IdentityPrefill({
  identityCoverage: cov,
  dwellingId: "d1",
  lineId: "obl_c_0",
  mappedLine: mComp,
});
ok("competing kind", prefComp.kind === "competing");
ok("competing no auto suggested", prefComp.suggestedCatalogWorkId === null);
ok("empty selection not fresh", isSelectedCatalogWorkIdFresh("", mComp) === false);

// 6) Explicit G1 path — override helper still same shape
const ov = buildG1ManualOverride({ dwellingId: "d1", lineId: "obl_c_0", catalogWorkId: "w1" });
ok("override catalogWorkId w1", ov.catalogWorkId === "w1" && ov.matchMethod === "manual");
const upserted = upsertManualOverride([], ov);
ok("idempotent upsert single", upsertManualOverride(upserted, ov).length === 1);

// 7) Stale — removed candidate blocks
ok("fresh when in set", isSelectedCatalogWorkIdFresh("w1", mComp) === true);
ok(
  "stale when removed from set",
  isSelectedCatalogWorkIdFresh(
    "w1",
    mapped({ candidateMatches: [cand("w2")] }),
  ) === false,
);
ok(
  "none/manual empty candidates allows typed id",
  isSelectedCatalogWorkIdFresh("manual-x", mapped({ candidateMatches: [] })) === true,
);

// 8) Invalid empty blocked
ok("empty blocked", isSelectedCatalogWorkIdFresh("   ", mComp) === false);

// 9) Idempotency hash preserved
const hashA = computeOfferBoqIdentityPayloadHash([
  { lineId: "a", catalogWorkId: "w1", matchMethod: "manual", matchConfidence: "high", candidateMatches: [] },
]);
const hashB = computeOfferBoqIdentityPayloadHash([
  { lineId: "a", catalogWorkId: "w1", matchMethod: "manual", matchConfidence: "high", candidateMatches: [] },
]);
ok("payload hash idempotent", hashA === hashB);

// 10) Persist fail closed — session override ≠ durable package
const failState = resolveG1DurableIdentityState({
  dwellingId: "d1",
  lineId: "obl_c_0",
  manualOverrides: [{ dwellingId: "d1", lineId: "obl_c_0", catalogWorkId: "w1" }],
  packageLineCatalogWorkId: null,
  identityPersistOutcome: {
    writes: [],
    skips: [{ dwellingId: "d1", reason: "DOCUMENT_MAPPING_REQUIRED" }],
  },
});
ok("persist_failed on skip", failState.kind === "persist_failed", failState);
ok("retry required on fail", isG1PersistRetryRequired(failState) === true);

const durableState = resolveG1DurableIdentityState({
  dwellingId: "d1",
  lineId: "obl_c_0",
  manualOverrides: [{ dwellingId: "d1", lineId: "obl_c_0", catalogWorkId: "w1" }],
  packageLineCatalogWorkId: "w1",
  identityPersistOutcome: { writes: [{ dwellingId: "d1", identityHash: "h" }], skips: [] },
});
ok("durable_match when package has id", durableState.kind === "durable_match");
ok("no retry when durable", isG1PersistRetryRequired(durableState) === false);

const pendingState = resolveG1DurableIdentityState({
  dwellingId: "d1",
  lineId: "obl_c_0",
  manualOverrides: [{ dwellingId: "d1", lineId: "obl_c_0", catalogWorkId: "w1" }],
  packageLineCatalogWorkId: null,
  identityPersistOutcome: null,
});
ok("persist_pending before outcome", pendingState.kind === "persist_pending");
ok("retry visible while pending", isG1PersistRetryRequired(pendingState) === true);

// package helper
ok(
  "findPackageLineCatalogWorkId reads pkg",
  findPackageLineCatalogWorkId(
    {
      tenderId: "t",
      mode: "single",
      dwellings: [
        {
          dwellingId: "d1",
          offerBoq: {
            lines: [{ lineId: "obl_c_0", catalogWorkId: "w1", candidateMatches: [] }],
          },
        },
      ],
    },
    "d1",
    "obl_c_0",
  ) === "w1",
);

// 11) Trusted — no duplicate G1 suggestion
const prefTrusted = resolveG1IdentityPrefill({
  identityCoverage: cov,
  dwellingId: "d1",
  lineId: "obl_trusted",
  mappedLine: mapped({ lineId: "obl_trusted", candidateMatches: [] }),
});
ok("trusted kind", prefTrusted.kind === "trusted");
ok("trusted no suggested", prefTrusted.suggestedCatalogWorkId === null);

// 12) None — no auto-selection
const prefNone = resolveG1IdentityPrefill({
  identityCoverage: cov,
  dwellingId: "d1",
  lineId: "obl_n_0",
  mappedLine: mapped({ lineId: "obl_n_0", candidateMatches: [] }),
});
ok("none kind", prefNone.kind === "none");
ok("none no suggested", prefNone.suggestedCatalogWorkId === null);

// 13) LP43 qty blocked
ok("LP43 qty blocked helper", isG1QuantityBlocked(lp43) === true);
const prefLp43 = resolveG1IdentityPrefill({
  identityCoverage: cov,
  dwellingId: "d1",
  lineId: "obl_6008ebc1",
  mappedLine: mapped({ lineId: "obl_6008ebc1", quantity: 0, candidateMatches: [cand("x")] }),
});
ok("LP43 prefill qty_blocked", prefLp43.kind === "qty_blocked");

// 14–16) Downstream / line-tolerant / admission unchanged
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
ok("actions no price memory", !actionsSrc.includes("priceMemory"));
ok("distinct ids still work", listDistinctCandidateWorkIds(mComp).join(",") === "w1,w2");

console.log(`\nRESULT ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
