/**
 * IK-KNR-WC-IDENTITY-BRIDGE P2.1 — local proposal persistence / reuse cache tests
 *
 * npx vite-node scripts/test-ik-knr-wc-identity-bridge-p21-persist.mjs
 *
 * ZERO HTTP · ZERO WC/A1/MAPPING/PRICING WRITE · features ON only in-test override.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCatalogBasisFromSourceRow } from "../src/lib/tenders-bzp-brief.ts";
import { buildKnrWcIdentityProposalsWithCache } from "../src/lib/intelligent-estimator/knr-wc-identity-bridge-cache.ts";
import {
  KNR_WC_IDENTITY_BRIDGE_P1_ENABLED,
  KNR_WC_IDENTITY_BRIDGE_P21_PERSIST_ENABLED,
} from "../src/lib/intelligent-estimator/knr-wc-identity-bridge-feature.ts";
import { MOPS_20_NORMALIZED_KEYS } from "../src/lib/intelligent-estimator/knr-wc-identity-bridge.ts";
import {
  emptyKnrWcIdentityProposalStore,
  stableKnrWcProposalId,
} from "../src/lib/intelligent-estimator/knr-wc-identity-proposal-store.ts";

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

const TENDER_A = "mops-tender-a";
const TENDER_B = "mops-tender-b";
const TENDER_C = "mops-tender-c";
const NOW = "2026-08-22T12:00:00.000Z";

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
  for (const art of arts) {
    for (const row of art?.snapshot?.rows || []) {
      const resolved = resolveCatalogBasisFromSourceRow({
        code: row.code,
        description: row.description,
      });
      if (!resolved?.tableCode) continue;
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
      });
    }
  }
  return MOPS_20_NORMALIZED_KEYS.map((nk) => byKey.get(nk));
}

function cacheRun(opts) {
  return buildKnrWcIdentityProposalsWithCache({
    persistToLocalStorage: false,
    nowIso: NOW,
    featureEnabled: true,
    persistEnabled: true,
    ...opts,
  });
}

const mopsKeys = loadMops20KeysFromTender();
const sharedStore = emptyKnrWcIdentityProposalStore(NOW);

console.log("=== IK-KNR-WC-IDENTITY-BRIDGE P2.1 PERSIST ===\n");
assert("P1 feature default ON (enablement)", KNR_WC_IDENTITY_BRIDGE_P1_ENABLED === true);
assert("P2.1 feature default ON (enablement)", KNR_WC_IDENTITY_BRIDGE_P21_PERSIST_ENABLED === true);
assert("MOPS fixture 20 keys", mopsKeys.length === 20, mopsKeys.length);

// T-BRIDGE-PERSIST-1 — first run persists
const first = cacheRun({
  tenderId: TENDER_A,
  keys: mopsKeys,
  proposalStoreOverride: sharedStore,
});
assert("T-BRIDGE-PERSIST-1 proposals=20", first.proposals.length === 20);
assert("T-BRIDGE-PERSIST-1 store entries=20", Object.keys(sharedStore.entries).length === 20);
assert("T-BRIDGE-PERSIST-1 cacheMisses=20", first.cacheMetrics.cacheMisses === 20);
assert("T-BRIDGE-PERSIST-1 proposalsBuilt=20", first.cacheMetrics.proposalsBuilt === 20);

// T-BRIDGE-PERSIST-2 — same key cache hit
const second = cacheRun({
  tenderId: TENDER_A,
  keys: [mopsKeys.find((k) => k.normalizedKey === "KNR|2-15|0110-01")],
  proposalStoreOverride: sharedStore,
});
assert("T-BRIDGE-PERSIST-2 cacheHits=1", second.cacheMetrics.cacheHits === 1);
assert("T-BRIDGE-PERSIST-2 proposalsBuilt=0", second.cacheMetrics.proposalsBuilt === 0);
assert("T-BRIDGE-PERSIST-2 discoveryCalls=0", second.cacheMetrics.discoveryCalls === 0);

// T-BRIDGE-PERSIST-3 — another tender reuses
const third = cacheRun({
  tenderId: TENDER_B,
  keys: [mopsKeys.find((k) => k.normalizedKey === "KNR|2-15|0110-01")],
  proposalStoreOverride: sharedStore,
});
const reused = third.proposals[0];
assert("T-BRIDGE-PERSIST-3 tenderId=B", reused?.tenderId === TENDER_B);
assert(
  "T-BRIDGE-PERSIST-3 stable proposalId",
  reused?.proposalId === stableKnrWcProposalId("KNR|2-15|0110-01"),
);
assert("T-BRIDGE-PERSIST-3 cacheHits=1", third.cacheMetrics.cacheHits === 1);

// T-BRIDGE-PERSIST-4 — full MOPS second run zero discovery
const mopsSecond = cacheRun({
  tenderId: TENDER_C,
  keys: mopsKeys,
  proposalStoreOverride: sharedStore,
});
assert("T-BRIDGE-PERSIST-4 proposals=20", mopsSecond.proposals.length === 20);
assert("T-BRIDGE-PERSIST-4 cacheHits=20", mopsSecond.cacheMetrics.cacheHits === 20);
assert("T-BRIDGE-PERSIST-4 proposalsBuilt=0", mopsSecond.cacheMetrics.proposalsBuilt === 0);
assert("T-BRIDGE-PERSIST-4 discoveryCalls=0", mopsSecond.cacheMetrics.discoveryCalls === 0);
assert("T-BRIDGE-PERSIST-4 catalogLookups=0", mopsSecond.cacheMetrics.catalogLookups === 0);
assert("T-BRIDGE-PERSIST-4 catalogIndexBuilds=0", mopsSecond.metrics.catalogIndexBuilds === 0);
assert("T-BRIDGE-PERSIST-4 worksScanCalls=0", mopsSecond.metrics.worksScanCalls === 0);

// T-BRIDGE-PERSIST-5 — mixed 15/5
const fiveNew = [
  {
    normalizedKey: "KNR|9-99|0001-01",
    family: "KNR",
    catalogId: "9-99",
    tableCode: "0001-01",
    unitRaw: "szt",
    descriptionPl: "Synthetic extra key 1",
  },
  {
    normalizedKey: "KNR|9-99|0002-01",
    family: "KNR",
    catalogId: "9-99",
    tableCode: "0002-01",
    unitRaw: "szt",
    descriptionPl: "Synthetic extra key 2",
  },
  {
    normalizedKey: "KNR|9-99|0003-01",
    family: "KNR",
    catalogId: "9-99",
    tableCode: "0003-01",
    unitRaw: "szt",
    descriptionPl: "Synthetic extra key 3",
  },
  {
    normalizedKey: "KNR|9-99|0004-01",
    family: "KNR",
    catalogId: "9-99",
    tableCode: "0004-01",
    unitRaw: "szt",
    descriptionPl: "Synthetic extra key 4",
  },
  {
    normalizedKey: "KNR|9-99|0005-01",
    family: "KNR",
    catalogId: "9-99",
    tableCode: "0005-01",
    unitRaw: "szt",
    descriptionPl: "Synthetic extra key 5",
  },
];
const mixedKeys = [...mopsKeys.slice(0, 15), ...fiveNew];
const mixed = cacheRun({
  tenderId: "mixed-tender",
  keys: mixedKeys,
  proposalStoreOverride: sharedStore,
});
assert("T-BRIDGE-PERSIST-5 uniqueKeys=20", mixed.metrics.uniqueKeys === 20);
assert("T-BRIDGE-PERSIST-5 cacheHits=15", mixed.cacheMetrics.cacheHits === 15);
assert("T-BRIDGE-PERSIST-5 cacheMisses=5", mixed.cacheMetrics.cacheMisses === 5);
assert("T-BRIDGE-PERSIST-5 proposalsBuilt=5", mixed.cacheMetrics.proposalsBuilt === 5);

// T-BRIDGE-PERSIST-6 — proposalId ≠ CatalogWork id
assert(
  "T-BRIDGE-PERSIST-6 all proposalIds prefixed",
  first.proposals.every((p) => p.proposalId.startsWith("knr-wc-proposal:")),
);
assert(
  "T-BRIDGE-PERSIST-6 no legacy work ids",
  first.proposals.every((p) => !p.proposalId.startsWith("legacy-") && !p.proposalId.startsWith("p2b-")),
);

// T-BRIDGE-PERSIST-7..11 — write guards
assert("T-BRIDGE-PERSIST-7 WC WRITE=0", mopsSecond.cacheMetrics.catalogWorkWritten === 0);
assert("T-BRIDGE-PERSIST-8 A1 WRITE=0", mopsSecond.cacheMetrics.a1Written === 0);
assert("T-BRIDGE-PERSIST-9 OWNER_MAPPING WRITE=0", mopsSecond.cacheMetrics.mappingWritten === 0);
assert("T-BRIDGE-PERSIST-10 PRICING WRITE=0", mopsSecond.cacheMetrics.pricingWritten === 0);
assert(
  "T-BRIDGE-PERSIST-11 HTTP/SCRAPING=0",
  mopsSecond.cacheMetrics.httpCalls === 0 && mopsSecond.cacheMetrics.scraping === 0,
);

// T-BRIDGE-PERSIST-11 — incomplete never persisted
const holdBatch = cacheRun({
  tenderId: "hold-tender",
  keys: [
    { normalizedKey: "KNR|4-01|", family: "KNR", catalogId: "4-01", tableCode: null, unitRaw: "m2" },
    { normalizedKey: "NNRNKB||", family: "NNRNKB", catalogId: null, tableCode: "", unitRaw: "m2" },
    ...mopsKeys.slice(0, 2),
  ],
  proposalStoreOverride: emptyKnrWcIdentityProposalStore(NOW),
});
assert("T-BRIDGE-PERSIST-11 skippedHold=2", holdBatch.skippedHoldKeys.length === 2);
assert(
  "T-BRIDGE-PERSIST-11 incomplete not in store",
  !holdBatch.skippedHoldKeys.some((k) => holdBatch.proposals.some((p) => p.normalizedKey === k)),
);

// T-BRIDGE-PERSIST-12 — HOLD_UNIT preserved on reuse
const probReuse = cacheRun({
  tenderId: TENDER_B,
  keys: mopsKeys.filter((k) => k.normalizedKey === "KNNR|5|1305-01"),
  proposalStoreOverride: sharedStore,
});
const probP = probReuse.proposals[0];
assert("T-BRIDGE-PERSIST-12 unitRaw=prob", probP?.unitRaw === "prob");
assert("T-BRIDGE-PERSIST-12 HOLD_UNIT", probP?.recommendation === "HOLD_UNIT" && probP?.unitStatus === "HOLD_UNIT");

// T-BRIDGE-PERSIST-13 — duplicate risk evidence only
const dupPair = cacheRun({
  tenderId: TENDER_A,
  keys: mopsKeys.filter((k) =>
    k.normalizedKey === "KNR|2-02|1505-01" || k.normalizedKey === "KNR|4-01|1204-02",
  ),
  proposalStoreOverride: sharedStore,
});
assert(
  "T-BRIDGE-PERSIST-13 duplicateRisk HIGH preserved",
  dupPair.proposals.every((p) => p.duplicateRisk === "HIGH"),
);
assert(
  "T-BRIDGE-PERSIST-13 ownerDecision unset",
  dupPair.proposals.every((p) => p.ownerDecision === "unset"),
);

// Static source guards
for (const rel of [
  "src/lib/intelligent-estimator/knr-wc-identity-proposal-store.ts",
  "src/lib/intelligent-estimator/knr-wc-identity-bridge-cache.ts",
]) {
  const src = readFileSync(join(root, rel), "utf8");
  assert(`${rel} no fetch(`, !src.includes("fetch("));
  assert(`${rel} no cloud-sync import`, !src.includes("fetchKeysFromCloud"));
  assert(`${rel} no applyOwnerKnrMapping`, !src.includes("applyOwnerKnrMapping"));
}

console.log("\n=== MOPS METRICS SUMMARY ===\n");
console.log("FIRST RUN:");
console.log(`  uniqueKeys=${first.metrics.uniqueKeys} cacheMisses=${first.cacheMetrics.cacheMisses} proposalsBuilt=${first.cacheMetrics.proposalsBuilt}`);
console.log(`  discoveryCalls=${first.cacheMetrics.discoveryCalls} catalogLookups=${first.cacheMetrics.catalogLookups}`);
console.log("SECOND RUN (same 20 keys):");
console.log(`  uniqueKeys=${mopsSecond.metrics.uniqueKeys} cacheHits=${mopsSecond.cacheMetrics.cacheHits} proposalsBuilt=${mopsSecond.cacheMetrics.proposalsBuilt}`);
console.log(`  discoveryCalls=${mopsSecond.cacheMetrics.discoveryCalls} catalogLookups=${mopsSecond.cacheMetrics.catalogLookups}`);
console.log("MIXED 15/5:");
console.log(`  cacheHits=${mixed.cacheMetrics.cacheHits} cacheMisses=${mixed.cacheMetrics.cacheMisses} proposalsBuilt=${mixed.cacheMetrics.proposalsBuilt}`);

console.log(`\nRESULT ${fail === 0 ? "PASS" : "FAIL"} · pass=${pass} fail=${fail}`);
process.exit(fail === 0 ? 0 : 1);
