/**
 * IK Full Autonomy GO#6 — discovery DISCOVERED ≠ TRUSTED + promote.
 * npx vite-node scripts/test-labor-source-discovery-01.mjs
 */
import {
  assertDiscoveryUrlSafe,
  clearLaborSourceDiscoveryStoreForTests,
  enqueueDiscoveredSource,
  loadLaborSourceDiscoveryStoreLocal,
  markDiscoveredFetchValidated,
  promoteDiscoveredSourceToTrustedEvidenceRoute,
} from "../src/lib/labor-source-discovery/index.ts";
import {
  assertLaborSourceEvidenceHostLock,
  upsertLaborSourceEvidenceObservations,
  clearLaborSourceEvidenceStoreLocalForTests,
  buildLaborSourceEvidenceObservation,
} from "../src/lib/labor-source-evidence/index.ts";
import { DATA_KEYS, BOOTSTRAP_DEFERRED_KEYS } from "../src/lib/cloud-sync.ts";

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};
globalThis.fetch = async () => {
  throw new Error("UNEXPECTED_LIVE_FETCH");
};

let passed = 0;
let failed = 0;
function ok(name, cond, extra) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

clearLaborSourceDiscoveryStoreForTests();
clearLaborSourceEvidenceStoreLocalForTests();

ok("ssrf_rejects_http", !assertDiscoveryUrlSafe("http://example.com/x").ok);
ok("ssrf_rejects_localhost", !assertDiscoveryUrlSafe("https://localhost/secret").ok);
ok("ssrf_rejects_private", !assertDiscoveryUrlSafe("https://192.168.1.1/x").ok);
ok("ssrf_rejects_creds", !assertDiscoveryUrlSafe("https://user:pass@example.com/x").ok);
ok("ssrf_accepts_https", assertDiscoveryUrlSafe("https://example.com/path").ok);

const arb = enqueueDiscoveredSource({
  url: "https://example.com/labor-cennik",
  provenance: { enqueuedBy: "CHATGPT", notePl: "candidate" },
});
ok("enqueue_discovered", arb.ok && arb.record.status === "DISCOVERED");

const lockBefore = assertLaborSourceEvidenceHostLock({
  sourceId: "example_com_arbitrary",
  sourceUrl: "https://example.com/labor-cennik",
});
ok("arbitrary_cannot_evidence_before_promote", !lockBefore.ok, lockBefore);

const blocked = upsertLaborSourceEvidenceObservations({
  observations: [
    buildLaborSourceEvidenceObservation({
      workId: "cw.test.leaf.m2",
      sourceId: "example_com_arbitrary",
      sourceUrl: "https://example.com/labor-cennik",
      observedName: "test",
      unit: "m2",
      pricePoint: 10,
      region: "PL",
      identityMatched: true,
      identityMethod: "exact_name",
      laborOnly: true,
      includesMaterial: false,
    }),
  ],
});
ok("evidence_upsert_blocked_pre_promote", blocked.ok === false, blocked);

ok(
  "discovered_neq_evidence_store",
  loadLaborSourceDiscoveryStoreLocal().discoveries.length === 1
    && loadLaborSourceDiscoveryStoreLocal().promotedRoutes.length === 0,
);

const validated = markDiscoveredFetchValidated({
  discoveryId: arb.record.discoveryId,
  contentType: "text/html; charset=utf-8",
});
ok("fetch_validated", validated.ok && validated.record.status === "FETCH_VALIDATED");

const promo = promoteDiscoveredSourceToTrustedEvidenceRoute({
  discoveryId: arb.record.discoveryId,
  workId: "cw.test.leaf.m2",
  unit: "m2",
  identityLabelPl: "Test leaf labor",
  laborOnly: true,
  actor: "test",
});
ok("promote_ok", promo.ok, promo);
ok(
  "promoted_in_store",
  promo.ok && loadLaborSourceDiscoveryStoreLocal().promotedRoutes.length === 1,
);

const lockAfter = assertLaborSourceEvidenceHostLock({
  sourceId: promo.ok ? promo.route.sourceId : "",
  sourceUrl: "https://example.com/labor-cennik",
});
ok("host_lock_ok_after_promote", lockAfter.ok, lockAfter);

if (promo.ok) {
  const up = upsertLaborSourceEvidenceObservations({
    observations: [
      buildLaborSourceEvidenceObservation({
        workId: "cw.test.leaf.m2",
        sourceId: promo.route.sourceId,
        sourceUrl: promo.route.url,
        observedName: "Test leaf labor",
        unit: "m2",
        pricePoint: 12.5,
        region: "PL",
        identityMatched: true,
        identityMethod: "owner_identity_mapping",
        laborOnly: true,
        includesMaterial: false,
      }),
    ],
  });
  ok("evidence_ok_after_promote", up.ok !== false && (up.store?.observations?.length ?? 0) >= 1, up);
}

ok("data_key", DATA_KEYS.includes("kw-labor-source-discovery"));
ok("deferred", BOOTSTRAP_DEFERRED_KEYS.includes("kw-labor-source-discovery"));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
