/**
 * IK-KNR-WC-IDENTITY-BRIDGE P1 — offline harness
 *
 * npx vite-node scripts/test-ik-knr-wc-identity-bridge-p1.mjs
 *
 * ZERO HTTP · ZERO WC/A1/MAPPING/PRICING WRITE · feature ON only in-test override.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCatalogBasisFromSourceRow } from "../src/lib/tenders-bzp-brief.ts";
import {
  buildKnrWcIdentityProposals,
  MOPS_20_NORMALIZED_KEYS,
} from "../src/lib/intelligent-estimator/knr-wc-identity-bridge.ts";
import { KNR_WC_IDENTITY_BRIDGE_P1_ENABLED } from "../src/lib/intelligent-estimator/knr-wc-identity-bridge-feature.ts";
import {
  createKnrCatalogEntrySkeleton,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-catalog-entry-types.ts";
import { emptyKnrCatalogStore } from "../src/lib/intelligent-estimator/knr-knowledge/knr-catalog-store.ts";
import {
  foldIdentityKeyV2,
  parseIdentityPartialFromCatalogBasis,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-identity-v2.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;
function assert(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name, extra ?? "");
  }
}

const TENDER_ID = "mops-08def932";

/** Frozen DF §17 units (fallback if tender row missing). */
const DF_UNITS = {
  "KNNR||1014-07": "m2",
  "KNNR|5|1305-01": "prob",
  "KNNR|5|1305-02": "prob",
  "KNR-W|4-01|0909-04": "szt",
  "KNR-W|5-08|0407-01": "szt",
  "KNR|13-21|0402-03": "szt",
  "KNR|2-02|1505-01": "m2",
  "KNR|2-15|0110-01": "mb",
  "KNR|2-15|0224-03": "kpl",
  "KNR|4-01|1204-02": "m2",
  "KNR|4-02|0233-06": "szt",
  "KNR|4-02|0233-08": "szt",
  "KNR|4-03|1124-01": "szt",
  "KNR|5-08|0501-03": "kpl",
  "KNR|5-08|0504-03": "szt",
  "KNR|5-08|0504-07": "szt",
  "NNRNKB||1134-01": "m2",
  "NNRNKB||1134-02": "m2",
  "KNNR|2|1404-05": "mb",
  "KNR|2-15|0115-05": "szt",
};

function loadMops20KeysFromTender() {
  const tender = JSON.parse(
    readFileSync(join(root, ".tmp/ops-mops-09-tender-item.json"), "utf8"),
  );
  const arts = tender?.tenderDossier?.scanSummary?.branchWinnerArtifacts || [];
  const byKey = new Map();
  let incompleteHoldRows = 0;
  let candidateRows = 0;

  for (const art of arts) {
    for (const row of art?.snapshot?.rows || []) {
      const resolved = resolveCatalogBasisFromSourceRow({
        code: row.code,
        description: row.description,
      });
      if (!resolved) continue;
      if (!resolved.tableCode) {
        incompleteHoldRows += 1;
        continue;
      }
      candidateRows += 1;
      const nk = resolved.normalizedKey;
      if (!MOPS_20_NORMALIZED_KEYS.includes(nk)) continue;
      if (byKey.has(nk)) continue;
      byKey.set(nk, {
        normalizedKey: nk,
        family: resolved.family,
        catalogId: resolved.catalogId,
        tableCode: resolved.tableCode,
        displayCode: resolved.display,
        unitRaw: row.unit || DF_UNITS[nk] || "",
        descriptionPl: row.description,
        officialNamePl: String(row.description || "").slice(0, 120),
        rawCode: row.code,
        lineRefs: [{ dwellingId: "d-mops", lineId: `lp-${row.lp ?? "x"}`, lp: row.lp }],
      });
    }
  }

  // Fill any missing from DF units only (should be 0).
  for (const nk of MOPS_20_NORMALIZED_KEYS) {
    if (byKey.has(nk)) continue;
    const parts = nk.split("|");
    byKey.set(nk, {
      normalizedKey: nk,
      family: parts[0],
      catalogId: parts[1] || null,
      tableCode: parts[2],
      displayCode: `${parts[0]} ${parts[1] || ""} ${parts[2]}`.replace(/\s+/g, " ").trim(),
      unitRaw: DF_UNITS[nk],
      descriptionPl: null,
      officialNamePl: null,
      rawCode: null,
      lineRefs: [],
    });
  }

  return {
    keys: MOPS_20_NORMALIZED_KEYS.map((nk) => byKey.get(nk)),
    candidateRows,
    incompleteHoldRows,
  };
}

function makeCatalogStoreWith1505() {
  const store = emptyKnrCatalogStore("2026-08-22T00:00:00.000Z");
  const basis = {
    family: "KNR",
    catalogId: "2-02",
    tableCode: "1505-01",
    rawCode: "KNR 2-02 1505-01",
    display: "KNR 2-02 1505-01",
    normalizedKey: "KNR|2-02|1505-01",
  };
  const partial = parseIdentityPartialFromCatalogBasis(basis);
  const identityKeyV2 = foldIdentityKeyV2(partial);
  const entry = createKnrCatalogEntrySkeleton(
    {
      identityKeyV2,
      evidenceKeyV1: "KNR|2-02|1505-01",
      identity: partial,
      originalSourceCode: "KNR 2-02 1505-01",
      displayCode: "KNR 2-02 1505-01",
    },
    "2026-08-22T00:00:00.000Z",
  );
  entry.description = "Dwukrotne malowanie farbami emulsyjnymi powierzchni sufitów";
  entry.unit = "m2";
  entry.verificationStatus = "VERIFIED";
  entry.lifecycleState = "ACTIVE";
  store.entries[identityKeyV2] = entry;
  store.aliasIndex["KNR|2-02|1505-01"] = [identityKeyV2];
  return store;
}

function semanticWorks() {
  return [
    { id: "legacy-malowanie-m2", namePl: "Malowanie ścian i sufitów", unit: "m2", tradeId: "malowanie", active: true },
    { id: "legacy-elektryka-szt", namePl: "Roboty elektryczne punkt", unit: "szt", tradeId: "elektryka", active: true },
    { id: "legacy-hydraulika-szt", namePl: "Roboty hydrauliczne", unit: "szt", tradeId: "hydraulika", active: true },
    { id: "malowanie-listew-mb", namePl: "Malowanie listew", unit: "mb", tradeId: "malowanie", active: true },
    { id: "p2b-punkt-oswietleniowy", namePl: "Oprawa oświetleniowa", unit: "szt", tradeId: "elektryka", active: true },
  ];
}

function classifyProposal(p) {
  const tags = [];
  if (p.sourceStatus === "LOCAL_CATALOG") tags.push("A/B_KNR_LOCAL_HIT");
  if (p.sourceStatus === "DISCOVERY_EVIDENCE" || p.sourceStatus === "HARVEST") tags.push("C_HARVEST_OR_EVIDENCE");
  if (p.sourceStatus === "NONE" || p.discoveryStatus === "DISCOVERY_REQUIRED") tags.push("D_CATALOG_MISS_OR_DISCOVERY");
  tags.push("E_WC_IDENTITY_GAP");
  if (p.unitStatus === "HOLD_UNIT") tags.push("F_UNIT_ISSUE");
  if (p.duplicateRisk !== "NONE") tags.push("G_DUPLICATE_SIMILARITY");
  if (p.specialRiskNotes.length) tags.push("H_SPECIAL_FAMILY_RISK");
  return tags.join(",");
}

console.log("=== IK-KNR-WC-IDENTITY-BRIDGE P1 ===\n");
assert("feature default OFF", KNR_WC_IDENTITY_BRIDGE_P1_ENABLED === false);

const { keys: mopsKeys, candidateRows, incompleteHoldRows } = loadMops20KeysFromTender();
assert("MOPS fixture 20 keys loaded", mopsKeys.length === 20, mopsKeys.length);
assert("FT-10 style candidate rows ≈56", candidateRows === 56, candidateRows);
assert("FT-10 style HOLD incomplete ≈32", incompleteHoldRows === 32, incompleteHoldRows);

const catalogStore = makeCatalogStoreWith1505();
const works = semanticWorks();

// --- T-BRIDGE-1 ---
{
  const batch = buildKnrWcIdentityProposals({
    tenderId: TENDER_ID,
    keys: mopsKeys,
    works,
    catalogStore,
    featureEnabled: true,
  });
  assert("T-BRIDGE-1 proposals === 20", batch.proposals.length === 20, batch.proposals.length);
  assert("T-BRIDGE-1 uniqueKeys === 20", batch.metrics.uniqueKeys === 20);
  assert("T-BRIDGE-1 deterministic sort", batch.proposals.every((p, i, arr) =>
    i === 0 || arr[i - 1].normalizedKey <= p.normalizedKey,
  ));
  const again = buildKnrWcIdentityProposals({
    tenderId: TENDER_ID,
    keys: mopsKeys,
    works,
    catalogStore,
    featureEnabled: true,
  });
  assert(
    "T-BRIDGE-1 stable proposalIds",
    JSON.stringify(batch.proposals.map((p) => p.proposalId))
      === JSON.stringify(again.proposals.map((p) => p.proposalId)),
  );
}

// --- T-BRIDGE-2 ---
{
  const batch = buildKnrWcIdentityProposals({
    tenderId: TENDER_ID,
    keys: mopsKeys,
    works,
    catalogStore,
    featureEnabled: true,
  });
  const withSimilar = batch.proposals.filter((p) => p.similarWorks.length > 0);
  assert("T-BRIDGE-2 some similarWorks evidence", withSimilar.length > 0, withSimilar.length);
  assert(
    "T-BRIDGE-2 no ownerDecision bind",
    batch.proposals.every((p) => p.ownerDecision === "unset"),
  );
  assert(
    "T-BRIDGE-2 proposedWorkId is stub only",
    batch.proposals.every((p) =>
      typeof p.proposedWorkId === "string"
      && p.proposedWorkId.startsWith("proposal:")
      && !works.some((w) => w.id === p.proposedWorkId),
    ),
  );
}

// --- T-BRIDGE-3 ---
{
  const batch = buildKnrWcIdentityProposals({
    tenderId: TENDER_ID,
    keys: mopsKeys,
    works,
    catalogStore,
    featureEnabled: true,
  });
  assert(
    "T-BRIDGE-3 never REUSE_EXISTING recommendation",
    batch.proposals.every((p) => p.recommendation !== "REUSE_EXISTING"),
  );
  assert(
    "T-BRIDGE-3 similarWorks do not become catalogWorkId",
    batch.proposals.every((p) =>
      !p.knrEvidenceRefs.some((r) => r.kind === "catalogWork")
      && !String(p.proposedWorkId || "").match(/^(legacy-|p2b-|cc-)/),
    ),
  );
}

// --- T-BRIDGE-4 ---
{
  const batch = buildKnrWcIdentityProposals({
    tenderId: TENDER_ID,
    keys: mopsKeys,
    works,
    catalogStore,
    featureEnabled: true,
  });
  const a = batch.proposals.find((p) => p.normalizedKey === "KNNR|5|1305-01");
  const b = batch.proposals.find((p) => p.normalizedKey === "KNNR|5|1305-02");
  assert("T-BRIDGE-4 1305-01 unitRaw=prob", a?.unitRaw === "prob", a?.unitRaw);
  assert("T-BRIDGE-4 1305-02 unitRaw=prob", b?.unitRaw === "prob", b?.unitRaw);
  assert("T-BRIDGE-4 1305-01 HOLD_UNIT", a?.recommendation === "HOLD_UNIT" && a?.unitStatus === "HOLD_UNIT");
  assert("T-BRIDGE-4 1305-02 HOLD_UNIT", b?.recommendation === "HOLD_UNIT" && b?.unitStatus === "HOLD_UNIT");
  assert("T-BRIDGE-4 no prob→szt", a?.proposedUnit == null && b?.proposedUnit == null);
}

// --- T-BRIDGE-5 ---
{
  const holdKeys = [
    { normalizedKey: "KNR|4-01|", family: "KNR", catalogId: "4-01", tableCode: null, unitRaw: "m2" },
    { normalizedKey: "NNRNKB||", family: "NNRNKB", catalogId: null, tableCode: "", unitRaw: "m2" },
  ];
  const batch = buildKnrWcIdentityProposals({
    tenderId: TENDER_ID,
    keys: [...mopsKeys, ...holdKeys],
    featureEnabled: true,
  });
  assert("T-BRIDGE-5 HOLD incomplete skipped", batch.skippedHoldKeys.length === 2, batch.skippedHoldKeys);
  assert(
    "T-BRIDGE-5 HOLD not in proposals",
    !batch.proposals.some((p) => p.normalizedKey === "KNR|4-01|" || p.normalizedKey === "NNRNKB||"),
  );
  assert("T-BRIDGE-5 still 20 proposals from MOPS", batch.proposals.length === 20, batch.proposals.length);
}

// --- T-BRIDGE-6 + T-BRIDGE-7 ---
{
  const duped = [...mopsKeys, ...mopsKeys, mopsKeys[0]];
  const batch = buildKnrWcIdentityProposals({
    tenderId: TENDER_ID,
    keys: duped,
    works,
    catalogStore,
    featureEnabled: true,
  });
  assert("T-BRIDGE-6 totalKeysInput = 41", batch.metrics.totalKeysInput === 41, batch.metrics.totalKeysInput);
  assert("T-BRIDGE-6 uniqueKeys = 20", batch.metrics.uniqueKeys === 20);
  assert("T-BRIDGE-6 duplicateKeysDropped = 21", batch.metrics.duplicateKeysDropped === 21);
  assert("T-BRIDGE-6 proposals still 20", batch.proposals.length === 20);
  assert("T-BRIDGE-7 catalogIndexBuilds = 1", batch.metrics.catalogIndexBuilds === 1);
  assert(
    "T-BRIDGE-7 catalogLookupCalls ≤ uniqueKeys",
    batch.metrics.catalogLookupCalls <= batch.metrics.uniqueKeys,
    batch.metrics.catalogLookupCalls,
  );
  assert("T-BRIDGE-7 worksScanCalls = 1", batch.metrics.worksScanCalls === 1);
  assert("T-BRIDGE-7 supabaseQueryCount = 0", batch.metrics.supabaseQueryCount === 0);
}

// --- T-BRIDGE-8..13 write / IO guards ---
{
  const batch = buildKnrWcIdentityProposals({
    tenderId: TENDER_ID,
    keys: mopsKeys,
    works,
    catalogStore,
    featureEnabled: true,
  });
  assert("T-BRIDGE-8 WC WRITE = 0", batch.metrics.catalogWorkWritten === 0);
  assert("T-BRIDGE-9 A1 WRITE = 0", batch.metrics.a1Written === 0);
  assert("T-BRIDGE-10 OWNER_MAPPING WRITE = 0", batch.metrics.mappingWritten === 0);
  assert("T-BRIDGE-11 PRICING WRITE = 0", batch.metrics.pricingWritten === 0);
  assert("T-BRIDGE-12 HTTP = 0", batch.metrics.httpRequestCount === 0 && batch.metrics.researchExecuted === false);
  assert("T-BRIDGE-13 SCRAPING = 0", batch.metrics.scraping === 0);
}

// Feature OFF
{
  const batch = buildKnrWcIdentityProposals({
    tenderId: TENDER_ID,
    keys: mopsKeys,
    featureEnabled: false,
  });
  assert("feature OFF → empty proposals", batch.proposals.length === 0);
}

// Local catalog HIT for 1505
{
  const batch = buildKnrWcIdentityProposals({
    tenderId: TENDER_ID,
    keys: mopsKeys,
    catalogStore,
    featureEnabled: true,
  });
  const p = batch.proposals.find((x) => x.normalizedKey === "KNR|2-02|1505-01");
  assert("1505 LOCAL_CATALOG HIT", p?.sourceStatus === "LOCAL_CATALOG", p?.sourceStatus);
  assert("metrics knrLocalHit ≥ 1", batch.metrics.knrLocalHit >= 1);
}

// Pair duplicate advisory
{
  const batch = buildKnrWcIdentityProposals({
    tenderId: TENDER_ID,
    keys: mopsKeys,
    featureEnabled: true,
  });
  const a = batch.proposals.find((p) => p.normalizedKey === "KNR|2-02|1505-01");
  const b = batch.proposals.find((p) => p.normalizedKey === "KNR|4-01|1204-02");
  assert("1505/1204 duplicateRisk HIGH", a?.duplicateRisk === "HIGH" && b?.duplicateRisk === "HIGH");
}

// Static source guards
{
  const src = readFileSync(
    join(root, "src/lib/intelligent-estimator/knr-wc-identity-bridge.ts"),
    "utf8",
  );
  assert("source no fetch(", !src.includes("fetch("));
  assert("source no applyOwnerKnrMapping", !src.includes("applyOwnerKnrMapping"));
  assert("source no persistVerifiedKnrCatalog", !src.includes("persistVerifiedKnrCatalog"));
  assert("source no createCatalogWork", !/\bcreateCatalogWork\b/.test(src));
  assert("source no saveWorkCatalog", !src.includes("saveWorkCatalog"));
}

// ===================== MOPS 20 DRY RUN =====================
console.log("\n=== MOPS 20-KEY DRY RUN ===\n");
const dry = buildKnrWcIdentityProposals({
  tenderId: TENDER_ID,
  keys: mopsKeys,
  works,
  catalogStore,
  featureEnabled: true,
});

for (const p of dry.proposals) {
  console.log(
    [
      p.normalizedKey,
      `unitRaw=${p.unitRaw}`,
      `unitStatus=${p.unitStatus}`,
      `source=${p.sourceStatus}`,
      `discovery=${p.discoveryStatus}`,
      `verify=${p.verificationState}`,
      `rec=${p.recommendation}`,
      `dup=${p.duplicateRisk}`,
      `similar=${p.similarWorks.map((s) => s.workId).join("|") || "-"}`,
      `risks=${p.specialRiskNotes.join(";") || "-"}`,
      `class=${classifyProposal(p)}`,
    ].join(" | "),
  );
}

const m = dry.metrics;
console.log("\n--- DRY RUN TOTALS ---");
console.log(`TOTAL_KEYS = ${m.totalKeysInput}`);
console.log(`UNIQUE_KEYS = ${m.uniqueKeys}`);
console.log(`PROPOSALS = ${m.proposals}`);
console.log(`HOLD_UNIT = ${m.holdUnit}`);
console.log(`DISCOVERY_REQUIRED = ${m.discoveryRequired}`);
console.log(`KNR_LOCAL_HIT = ${m.knrLocalHit}`);
console.log(`EVIDENCE_HIT = ${m.evidenceHit}`);
console.log(`CATALOG_INDEX_BUILDS = ${m.catalogIndexBuilds}`);
console.log(`CATALOG_LOOKUP_CALLS = ${m.catalogLookupCalls}`);
console.log(`WORKS_SCAN_CALLS = ${m.worksScanCalls}`);
console.log(`SUPABASE_QUERY_COUNT = ${m.supabaseQueryCount}`);
console.log(`HTTP = ${m.httpRequestCount}`);
console.log(`SCRAPING = ${m.scraping}`);
console.log(`WC_WRITE = ${m.catalogWorkWritten}`);
console.log(`A1_WRITE = ${m.a1Written}`);
console.log(`OWNER_MAPPING_WRITE = ${m.mappingWritten}`);
console.log(`PRICING_WRITE = ${m.pricingWritten}`);
console.log(`DUPLICATE_KEYS_DROPPED = ${m.duplicateKeysDropped}`);

assert("DRY TOTAL_KEYS=20", m.totalKeysInput === 20);
assert("DRY UNIQUE_KEYS=20", m.uniqueKeys === 20);
assert("DRY PROPOSALS=20", m.proposals === 20);
assert("DRY HOLD_UNIT=2", m.holdUnit === 2, m.holdUnit);
assert("DRY WC_WRITE=0", m.catalogWorkWritten === 0);
assert("DRY HTTP=0", m.httpRequestCount === 0);

console.log(`\nRESULT ${fail === 0 ? "PASS" : "FAIL"} · pass=${pass} fail=${fail}`);
process.exit(fail === 0 ? 0 : 1);
