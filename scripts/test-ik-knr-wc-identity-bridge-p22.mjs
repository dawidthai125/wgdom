/**
 * IK-KNR-WC-IDENTITY-BRIDGE P2.2 — hardening + Supabase load guard tests
 *
 * npx vite-node scripts/test-ik-knr-wc-identity-bridge-p22.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCatalogBasisFromSourceRow } from "../src/lib/tenders-bzp-brief.ts";
import { buildKnrWcIdentityProposalsWithCache } from "../src/lib/intelligent-estimator/knr-wc-identity-bridge-cache.ts";
import {
  KNR_WC_IDENTITY_BRIDGE_P1_ENABLED,
  KNR_WC_IDENTITY_BRIDGE_P21_PERSIST_ENABLED,
  KNR_WC_IDENTITY_BRIDGE_P22_HARDENING_ENABLED,
} from "../src/lib/intelligent-estimator/knr-wc-identity-bridge-feature.ts";
import { isProposalStale } from "../src/lib/intelligent-estimator/knr-wc-identity-bridge-freshness.ts";
import { resolveBridgeStoresLazy } from "../src/lib/intelligent-estimator/knr-wc-identity-bridge-stores-lazy.ts";
import { MOPS_20_NORMALIZED_KEYS } from "../src/lib/intelligent-estimator/knr-wc-identity-bridge.ts";
import {
  computeKnrWcIdentityProposalContentHash,
  emptyKnrWcIdentityProposalStore,
  normalizeKnrWcIdentityProposalStore,
  proposalToPersistedRecord,
  resolveProposalRecordForCacheHit,
  sanitizeAdvisoryProposalRecord,
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
const NOW = "2026-08-22T14:00:00.000Z";

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
    p22HardeningEnabled: true,
    ...opts,
  });
}

const mopsKeys = loadMops20KeysFromTender();
const sharedStore = emptyKnrWcIdentityProposalStore(NOW);

console.log("=== IK-KNR-WC-IDENTITY-BRIDGE P2.2 ===\n");
assert("P1 feature default ON (enablement)", KNR_WC_IDENTITY_BRIDGE_P1_ENABLED === true);
assert("P2.1 feature default ON (enablement)", KNR_WC_IDENTITY_BRIDGE_P21_PERSIST_ENABLED === true);
assert("P2.2 feature default ON (enablement)", KNR_WC_IDENTITY_BRIDGE_P22_HARDENING_ENABLED === true);
assert("MOPS fixture 20 keys", mopsKeys.length === 20, mopsKeys.length);

// Seed store for reuse tests
const first = cacheRun({
  tenderId: TENDER_A,
  keys: mopsKeys,
  proposalStoreOverride: sharedStore,
});
assert("seed proposals=20", first.proposals.length === 20);

// T-P22-1 — tampered REUSE_EXISTING sanitized
{
  const base = { ...sharedStore.entries["KNR|2-15|0110-01"] };
  const tampered = {
    ...base,
    recommendation: "REUSE_EXISTING",
    contentHash: computeKnrWcIdentityProposalContentHash({
      ...base,
      recommendation: "REUSE_EXISTING",
    }),
  };
  const resolved = resolveProposalRecordForCacheHit(tampered, NOW, { p22Hardening: true });
  assert("T-P22-1 resolved", resolved != null);
  assert("T-P22-1 not REUSE", resolved?.recommendation !== "REUSE_EXISTING", resolved?.recommendation);
  const sanitized = sanitizeAdvisoryProposalRecord(tampered);
  assert("T-P22-1 sanitize CREATE_NEW", sanitized.recommendation === "CREATE_NEW");
}

// T-P22-2 — tampered VERIFIED without knrCatalog evidence
{
  const base = { ...sharedStore.entries["KNR|2-15|0110-01"] };
  const tampered = {
    ...base,
    verificationState: "VERIFIED",
    sourceStatus: "TENDER",
    knrEvidenceRefs: base.knrEvidenceRefs.filter((r) => r.kind !== "knrCatalog"),
    contentHash: computeKnrWcIdentityProposalContentHash({
      ...base,
      verificationState: "VERIFIED",
      sourceStatus: "TENDER",
      knrEvidenceRefs: base.knrEvidenceRefs.filter((r) => r.kind !== "knrCatalog"),
    }),
  };
  const resolved = resolveProposalRecordForCacheHit(tampered, NOW, { p22Hardening: true });
  assert("T-P22-2 resolved", resolved != null);
  assert(
    "T-P22-2 downgraded",
    resolved?.verificationState === "TENDER_ONLY",
    resolved?.verificationState,
  );
}

// T-P22-3 — contentHash mismatch → MISS for one key only
{
  const storeCopy = emptyKnrWcIdentityProposalStore(NOW);
  storeCopy.entries = { ...sharedStore.entries };
  const bad = { ...storeCopy.entries["KNR|4-03|1124-01"], contentHash: "deadbeef" };
  storeCopy.entries["KNR|4-03|1124-01"] = bad;
  const batch = cacheRun({
    tenderId: TENDER_B,
    keys: mopsKeys,
    proposalStoreOverride: storeCopy,
  });
  assert("T-P22-3 cacheMisses>=1", batch.cacheMetrics.cacheMisses >= 1, batch.cacheMetrics.cacheMisses);
  assert("T-P22-3 cacheHits=19", batch.cacheMetrics.cacheHits === 19, batch.cacheMetrics.cacheHits);
  assert("T-P22-3 proposalsBuilt=1", batch.cacheMetrics.proposalsBuilt === 1, batch.cacheMetrics.proposalsBuilt);
}

// T-P22-4 — quota failure graceful
{
  const orig = globalThis.localStorage?.setItem;
  if (typeof localStorage !== "undefined" && orig) {
    localStorage.setItem = () => {
      const err = new DOMException("quota", "QuotaExceededError");
      throw err;
    };
    try {
      const batch = buildKnrWcIdentityProposalsWithCache({
        tenderId: "quota-tender",
        keys: [mopsKeys[0]],
        featureEnabled: true,
        persistEnabled: true,
        p22HardeningEnabled: true,
        persistToLocalStorage: true,
        proposalStoreOverride: emptyKnrWcIdentityProposalStore(NOW),
        nowIso: NOW,
      });
      assert("T-P22-4 proposals returned", batch.proposals.length === 1);
      assert("T-P22-4 persist fail", batch.persistResult?.ok === false);
      assert("T-P22-4 reason quota", batch.persistResult?.reason === "QUOTA_EXCEEDED");
      assert("T-P22-4 WC=0", batch.cacheMetrics.catalogWorkWritten === 0);
      assert("T-P22-4 A1=0", batch.cacheMetrics.a1Written === 0);
    } finally {
      localStorage.setItem = orig;
    }
  } else {
    assert("T-P22-4 skip no localStorage", true);
  }
}

// T-P22-5 — 20/20 HIT zero remote
{
  const hit = cacheRun({
    tenderId: TENDER_C,
    keys: mopsKeys,
    proposalStoreOverride: sharedStore,
  });
  assert("T-P22-5 cacheHits=20", hit.cacheMetrics.cacheHits === 20);
  assert("T-P22-5 proposalsBuilt=0", hit.cacheMetrics.proposalsBuilt === 0);
  assert("T-P22-5 remoteStoreLoads=0", hit.cacheMetrics.remoteStoreLoads === 0);
  assert("T-P22-5 supabaseQueries=0", hit.cacheMetrics.supabaseQueries === 0);
  assert("T-P22-5 discoveryCalls=0", hit.cacheMetrics.discoveryCalls === 0);
}

// T-P22-6 — 15 HIT + 5 MISS
{
  const fiveNew = [1, 2, 3, 4, 5].map((n) => ({
    normalizedKey: `KNR|9-99|000${n}-01`,
    family: "KNR",
    catalogId: "9-99",
    tableCode: `000${n}-01`,
    unitRaw: "szt",
    descriptionPl: `Synthetic extra key ${n}`,
  }));
  const mixed = cacheRun({
    tenderId: "mixed-tender",
    keys: [...mopsKeys.slice(0, 15), ...fiveNew],
    proposalStoreOverride: sharedStore,
  });
  assert("T-P22-6 cacheHits=15", mixed.cacheMetrics.cacheHits === 15);
  assert("T-P22-6 cacheMisses=5", mixed.cacheMetrics.cacheMisses === 5);
  assert("T-P22-6 proposalsBuilt=5", mixed.cacheMetrics.proposalsBuilt === 5);
}

// T-P22-7 — 19 HIT + 1 MISS
{
  const store19 = emptyKnrWcIdentityProposalStore(NOW);
  for (let i = 0; i < 19; i += 1) {
    const nk = mopsKeys[i].normalizedKey;
    store19.entries[nk] = sharedStore.entries[nk];
  }
  const oneNew = {
    normalizedKey: "KNR|9-99|0099-01",
    family: "KNR",
    catalogId: "9-99",
    tableCode: "0099-01",
    unitRaw: "szt",
    descriptionPl: "Single new key",
  };
  const batch = cacheRun({
    tenderId: "one-new",
    keys: [...mopsKeys.slice(0, 19), oneNew],
    proposalStoreOverride: store19,
  });
  assert("T-P22-7 cacheHits=19", batch.cacheMetrics.cacheHits === 19);
  assert("T-P22-7 cacheMisses=1", batch.cacheMetrics.cacheMisses === 1);
  assert("T-P22-7 proposalsBuilt=1", batch.cacheMetrics.proposalsBuilt === 1);
}

// T-P22-8 — upstream etag change → staleEvidence, still HIT
{
  const rec = sharedStore.entries["KNR|2-15|0110-01"];
  const stale = isProposalStale(
    rec,
    { knrCatalogEtag: "changed-etag", discoveryEtag: null },
    mopsKeys.find((k) => k.normalizedKey === "KNR|2-15|0110-01"),
  );
  assert("T-P22-8 staleEvidence", stale.staleEvidence === true);
  assert("T-P22-8 not forceMiss", stale.forceMiss === false);
  const batch = cacheRun({
    tenderId: TENDER_B,
    keys: [mopsKeys.find((k) => k.normalizedKey === "KNR|2-15|0110-01")],
    proposalStoreOverride: sharedStore,
    catalogStore: { schemaVersion: 1, updatedAt: NOW, etag: "changed-etag", entries: {}, aliasIndex: {} },
  });
  assert("T-P22-8 still HIT", batch.cacheMetrics.cacheHits === 1);
  assert("T-P22-8 proposal stale flag", batch.proposals[0]?.staleEvidence === true);
  assert("T-P22-8 proposalsBuilt=0", batch.cacheMetrics.proposalsBuilt === 0);
}

// T-P22-9 — force refresh single key
{
  const batch = cacheRun({
    tenderId: TENDER_B,
    keys: [mopsKeys.find((k) => k.normalizedKey === "KNR|2-15|0110-01")],
    proposalStoreOverride: sharedStore,
    forceRefreshKeys: ["KNR|2-15|0110-01"],
  });
  assert("T-P22-9 force MISS", batch.cacheMetrics.cacheMisses === 1);
  assert("T-P22-9 proposalsBuilt=1", batch.cacheMetrics.proposalsBuilt === 1);
}

// T-P22-10 — schemaVersion bump → empty store / all MISS
{
  const badStore = normalizeKnrWcIdentityProposalStore({ schemaVersion: 99, entries: sharedStore.entries });
  assert("T-P22-10 empty store", Object.keys(badStore.entries).length === 0);
  const batch = cacheRun({
    tenderId: "schema-bump",
    keys: mopsKeys.slice(0, 3),
    proposalStoreOverride: badStore,
  });
  assert("T-P22-10 all MISS", batch.cacheMetrics.cacheMisses === 3);
}

// T-P22-11 — incomplete skipped
{
  const batch = cacheRun({
    tenderId: "hold-tender",
    keys: [
      { normalizedKey: "KNR|4-01|", family: "KNR", catalogId: "4-01", tableCode: null, unitRaw: "m2" },
      { normalizedKey: "NNRNKB||", family: "NNRNKB", catalogId: null, tableCode: "", unitRaw: "m2" },
      ...mopsKeys.slice(0, 2),
    ],
    proposalStoreOverride: emptyKnrWcIdentityProposalStore(NOW),
  });
  assert("T-P22-11 skippedHold=2", batch.skippedHoldKeys.length === 2);
}

// T-P22-12 — feature OFF → zero cache path (P1 OFF)
{
  const off = buildKnrWcIdentityProposalsWithCache({
    tenderId: TENDER_A,
    keys: mopsKeys,
    featureEnabled: false,
    persistEnabled: true,
    p22HardeningEnabled: true,
    proposalStoreOverride: sharedStore,
  });
  assert("T-P22-12 proposals=0", off.proposals.length === 0);
}

// T-P22-14 — static guard no fetch/cloud-sync
{
  const files = [
    "src/lib/intelligent-estimator/knr-wc-identity-bridge-cache.ts",
    "src/lib/intelligent-estimator/knr-wc-identity-proposal-store.ts",
    "src/lib/intelligent-estimator/knr-wc-identity-bridge-freshness.ts",
    "src/lib/intelligent-estimator/knr-wc-identity-bridge-stores-lazy.ts",
  ];
  for (const f of files) {
    const src = readFileSync(join(root, f), "utf8");
    assert(`${f} no fetch(`, !src.includes("fetch("));
    assert(`${f} no cloud-sync`, !src.includes("cloud-sync"));
    assert(`${f} no supabase`, !/from\s+[\"']@?\/?.*supabase/i.test(src));
  }
}

// T-P22-15 — MOPS FIRST → SECOND
{
  const storeFresh = emptyKnrWcIdentityProposalStore(NOW);
  const firstRun = cacheRun({ tenderId: TENDER_A, keys: mopsKeys, proposalStoreOverride: storeFresh });
  assert("T-P22-15 FIRST misses=20", firstRun.cacheMetrics.cacheMisses === 20);
  const secondRun = cacheRun({ tenderId: TENDER_B, keys: mopsKeys, proposalStoreOverride: storeFresh });
  assert("T-P22-15 SECOND hits=20", secondRun.cacheMetrics.cacheHits === 20);
  assert("T-P22-15 SECOND discovery=0", secondRun.cacheMetrics.discoveryCalls === 0);
  assert("T-P22-15 SECOND supabase=0", secondRun.cacheMetrics.supabaseQueries === 0);
  assert("T-P22-15 SECOND remote=0", secondRun.cacheMetrics.remoteStoreLoads === 0);
}

// lazy helper — full HIT path
{
  const lazy = resolveBridgeStoresLazy({ cacheMissKeys: [] });
  assert("lazy empty miss remote=0", lazy.remoteStoreLoads === 0);
  assert("lazy empty miss supabase=0", lazy.supabaseQueries === 0);
}

// HOLD_UNIT preserved
{
  const prob = cacheRun({
    tenderId: TENDER_B,
    keys: mopsKeys.filter((k) => k.normalizedKey === "KNNR|5|1305-01"),
    proposalStoreOverride: sharedStore,
  });
  assert("1305-01 HOLD_UNIT", prob.proposals[0]?.recommendation === "HOLD_UNIT");
  assert("1305-01 unitRaw prob", prob.proposals[0]?.unitRaw === "prob");
}

console.log(`\nRESULT ${fail === 0 ? "PASS" : "FAIL"} · pass=${pass} fail=${fail}`);
process.exit(fail === 0 ? 0 : 1);
