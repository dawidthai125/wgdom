/**
 * KL-3 ATH RMS → canonical Discovery Evidence persist CONNECT — Owner GO tests A–K (2.66.230).
 * npx vite-node scripts/test-kl3-discovery-evidence-persist.mjs
 *
 * Isolation: fake localStorage (Node) + injected persist io (no network, no cloud push).
 * The canonical writer `saveKnrDiscoveryEvidenceStore` cloud path is covered by ARCH review
 * (merges only with cloud) — here we assert the CONNECT invariant `saved ⊇ local`.
 */
import { buildCatalogBasisFromRawCode } from "../src/lib/tenders-bzp-brief.ts";
import {
  buildSyntheticAthFixture,
  emptyKnrCatalogStore,
  emptyKnrDiscoveryEvidenceStore,
  resolveHostKnrKnowledgeLookupOnly,
} from "../src/lib/intelligent-estimator/knr-knowledge/index.ts";
import {
  loadKnrDiscoveryEvidenceStoreLocal,
  normalizeKnrDiscoveryEvidenceStore,
  saveKnrDiscoveryEvidenceStoreLocal,
  upsertKnrDiscoveryEvidenceOffline,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-store.ts";
import { KNR_DISCOVERY_EVIDENCE_STORAGE_KEY } from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-types.ts";
import {
  executeKl3KnowledgeLookup,
  persistKl3DiscoveryEvidence,
} from "../src/lib/intelligent-estimator/orchestra/ik-orchestra-runtime.ts";
import { evaluateLaborOnlyAutoBomV1Contract } from "../src/lib/intelligent-estimator/orchestra/labor-only-auto-bom-v1-contract.ts";
import { evaluateAutoBomContract } from "../src/lib/intelligent-estimator/orchestra/auto-g2-accept-contract.ts";

// ——— fake localStorage (Node) ———
const ls = new Map();
globalThis.localStorage = {
  getItem: (k) => (ls.has(k) ? ls.get(k) : null),
  setItem: (k, v) => ls.set(k, String(v)),
  removeItem: (k) => ls.delete(k),
  clear: () => ls.clear(),
  key: (i) => [...ls.keys()][i] ?? null,
  get length() {
    return ls.size;
  },
};

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else console.log("PASS:", msg);
}

const NOW = Date.parse("2026-09-16T06:00:00.000Z");
const TS = new Date(NOW).toISOString();
const CODE = "KNR 4-01 0909-04";
const WORK_ID = "cw.knr.knr-4-01.0909-04.szt";
const EVIDENCE_KEY = "KNR|4-01|0909-04";
const basis = buildCatalogBasisFromRawCode(CODE);
const superActor = { actorId: "dawid", role: "super_admin", displayName: "Dawid" };

function athFile(displayCode = CODE) {
  return {
    bytes: buildSyntheticAthFixture({ displayCode, includePln: false, withR: true, withM: false, withS: false }),
    sourceFilename: "synthetic-persist.ath",
    targetDisplayCode: displayCode,
  };
}

/** Real host KL-3 ATH RMS wire result (in-memory, discovery HTTP off). */
async function realAthWire(tenderId = "t-persist") {
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId,
    lines: [{ lineId: "L1", catalogBasis: basis, workId: WORK_ID, positionUnit: "szt" }],
    catalogStore: emptyKnrCatalogStore(TS),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(TS),
    actor: superActor,
    athFiles: [athFile()],
    discoveryFeatureEnabled: false,
    nowIso: TS,
  });
  return out.athRmsWire;
}

/** Owner HARD-like record (mirrors prod shape: owner_hard source, ACTIVE). */
function ownerHardRecord(evidenceKeyV1, family, opts = {}) {
  const [, table, pos] = evidenceKeyV1.split("|");
  return {
    schemaVersion: 1,
    evidenceKeyV1,
    family,
    displayCode: `${family} ${table} ${pos}`.trim(),
    unit: opts.unit ?? "szt",
    discoveryStatus: opts.status ?? "DISCOVERED",
    lifecycleState: "ACTIVE",
    sources: [
      {
        sourceId: `owner_hard:${evidenceKeyV1.replace(/\W/g, "").toLowerCase()}`,
        urlHash: `oh-${pos || table}`,
        contentHash: `ohc-${pos || table}`,
        fetchedAt: "2026-09-12T15:18:40.257Z",
        priority: "OTHER",
      },
    ],
    norms: opts.norms ?? { laborNorms: [{ kind: "R", unit: "r-g", quantity: 1.23 }], materialNorms: [] },
    queryHashes: [],
    contentHash: opts.contentHash ?? `owner-hard-${pos || table}`,
    createdAt: "2026-09-12T15:18:40.257Z",
    updatedAt: "2026-09-12T15:18:40.257Z",
  };
}

const PROD_LIKE_KEYS = [
  ["KNR|4-03|", "KNR"],
  ["KNR|35|216-10", "KNR"],
  ["KNR|4-01|0349-02", "KNR"],
  ["KNR|4-01|0909-04", "KNR"], // collides with ATH target → Owner HARD must win
  ["KNR|4-03|1205-02", "KNR"],
  ["KNR|4-03|1205-05", "KNR"],
  ["KNR|5-08|0401-11", "KNR"],
  ["KNR|K-04|0602-01", "KNR"],
  ["KNR|K-04|0602-02", "KNR"],
  ["KNR-W|2-15|0135-01", "KNR-W"],
  ["KNR-W|4-01|0621-01", "KNR-W"],
  ["KNR|INSTAL|0205-01", "KNR"],
];

function buildProdLikeLocal() {
  let store = emptyKnrDiscoveryEvidenceStore(TS);
  for (const [key, family] of PROD_LIKE_KEYS) {
    store = upsertKnrDiscoveryEvidenceOffline({
      record: ownerHardRecord(key, family),
      nowIso: "2026-09-12T15:18:40.257Z",
      storeOverride: store,
    }).store;
  }
  return normalizeKnrDiscoveryEvidenceStore(store);
}

/** io: real local reader + real local writer standing in for the cloud writer (no network). */
function localIo(calls) {
  return {
    loadLocal: () => loadKnrDiscoveryEvidenceStoreLocal(),
    save: async (store, options) => {
      calls.push({ store, options });
      saveKnrDiscoveryEvidenceStoreLocal(store, options.updatedAtIso);
    },
  };
}

function keysOf(store) {
  return Object.keys(store.entries).sort();
}

const wire = await realAthWire();
ok(wire.adaptedCount === 1 && Boolean(wire.discoveryStore?.entries[EVIDENCE_KEY]), "fixture: real host wire adapted ATH evidence");

// ——— A. empty local + ATH → saved ———
{
  ls.clear();
  const calls = [];
  const out = await persistKl3DiscoveryEvidence({ athRmsWire: wire, nowIso: TS }, localIo(calls));
  ok(out.status === "SAVED", `A SAVED (${out.status})`);
  ok(calls.length === 1 && Boolean(calls[0].store.entries[EVIDENCE_KEY]), "A saved store contains ATH record");
  ok(calls[0]?.options.updatedAtIso === TS, "A updatedAtIso = KL-3 nowIso");
  const persisted = loadKnrDiscoveryEvidenceStoreLocal();
  ok(persisted.entries[EVIDENCE_KEY]?.sources.some((s) => s.sourceId.startsWith("ath_l1_aux_")), "A ATH provenance persisted");
}

// ——— B. local 12 (prod-like) + ATH new key → local ∪ ATH ———
{
  ls.clear();
  const local = buildProdLikeLocal();
  saveKnrDiscoveryEvidenceStoreLocal(local, local.updatedAt);
  ok(keysOf(loadKnrDiscoveryEvidenceStoreLocal()).length === 12, "B baseline 12 local records");
  const newWire = await (async () => {
    const other = "KNR 4-01 0920-14";
    const out = await resolveHostKnrKnowledgeLookupOnly({
      tenderId: "t-persist-b",
      lines: [{ lineId: "L1", catalogBasis: buildCatalogBasisFromRawCode(other), positionUnit: "m2" }],
      catalogStore: emptyKnrCatalogStore(TS),
      discoveryStore: emptyKnrDiscoveryEvidenceStore(TS),
      actor: superActor,
      athFiles: [athFile(other)],
      discoveryFeatureEnabled: false,
      nowIso: TS,
    });
    return out.athRmsWire;
  })();
  ok(newWire.adaptedCount === 1, "B fixture: second ATH target adapted");
  const calls = [];
  const out = await persistKl3DiscoveryEvidence({ athRmsWire: newWire, nowIso: TS }, localIo(calls));
  ok(out.status === "SAVED" && out.localCount === 12 && out.mergedCount === 13, `B SAVED 12→13 (${out.status} ${out.localCount}→${out.mergedCount})`);
  const after = loadKnrDiscoveryEvidenceStoreLocal();
  const allLocalKept = PROD_LIKE_KEYS.every(([k]) => after.entries[k]?.contentHash === local.entries[k]?.contentHash);
  ok(allLocalKept, "B all 12 local records preserved byte-for-byte (contentHash)");
  ok(Boolean(after.entries["KNR|4-01|0920-14"]), "B ATH new key added (local ∪ ATH)");
}

// ——— C. local ACTIVE Owner HARD + ATH conflict (same key, different hash) → local wins ———
{
  ls.clear();
  const local = buildProdLikeLocal();
  saveKnrDiscoveryEvidenceStoreLocal(local, local.updatedAt);
  const ownerHash = local.entries[EVIDENCE_KEY].contentHash;
  ok(wire.discoveryStore.entries[EVIDENCE_KEY].contentHash !== ownerHash, "C fixture: ATH hash ≠ Owner HARD hash");
  const calls = [];
  const out = await persistKl3DiscoveryEvidence({ athRmsWire: wire, nowIso: TS }, localIo(calls));
  // Only colliding key in ATH store → merged == local → NO-OP (no write at all).
  ok(out.status === "NOOP_ETAG", `C conflict-only → NOOP_ETAG (${out.status})`);
  ok(calls.length === 0, "C no write on conflict-only run");
  const after = loadKnrDiscoveryEvidenceStoreLocal();
  ok(after.entries[EVIDENCE_KEY]?.contentHash === ownerHash, "C Owner HARD record intact");
  ok(after.entries[EVIDENCE_KEY]?.sources.every((s) => !s.sourceId.startsWith("ath_l1_aux_")), "C no ATH override of Owner HARD");
}

// ——— C2. conflict + new key in same store → SAVED, local wins on conflict, new key added ———
{
  ls.clear();
  const local = buildProdLikeLocal();
  saveKnrDiscoveryEvidenceStoreLocal(local, local.updatedAt);
  const ownerHash = local.entries[EVIDENCE_KEY].contentHash;
  let mixed = normalizeKnrDiscoveryEvidenceStore(wire.discoveryStore);
  mixed = upsertKnrDiscoveryEvidenceOffline({
    record: { ...wire.discoveryStore.entries[EVIDENCE_KEY], evidenceKeyV1: "KNR|4-01|0920-14", displayCode: "KNR 4-01 0920-14", contentHash: "ath-0920-14" },
    nowIso: TS,
    storeOverride: mixed,
  }).store;
  const calls = [];
  const out = await persistKl3DiscoveryEvidence({ athRmsWire: { ...wire, discoveryStore: mixed }, nowIso: TS }, localIo(calls));
  ok(out.status === "SAVED" && out.mergedCount === 13, `C2 SAVED with conflict+new (${out.status} ${out.mergedCount})`);
  const after = loadKnrDiscoveryEvidenceStoreLocal();
  ok(after.entries[EVIDENCE_KEY]?.contentHash === ownerHash, "C2 Owner HARD wins on contentHash conflict");
  ok(Boolean(after.entries["KNR|4-01|0920-14"]), "C2 new ATH key added alongside");
}

// ——— D. family mismatch → existing merge/conflict contract preserved (local kept, no ATH override) ———
{
  ls.clear();
  const local = normalizeKnrDiscoveryEvidenceStore(
    upsertKnrDiscoveryEvidenceOffline({
      record: ownerHardRecord(EVIDENCE_KEY, "KNR-W"),
      nowIso: "2026-09-12T15:18:40.257Z",
      storeOverride: emptyKnrDiscoveryEvidenceStore(TS),
    }).store,
  );
  saveKnrDiscoveryEvidenceStoreLocal(local, local.updatedAt);
  const calls = [];
  const out = await persistKl3DiscoveryEvidence({ athRmsWire: wire, nowIso: TS }, localIo(calls));
  // Existing contract: FAMILY_MISMATCH → kept local entry (+CONFLICT status), contentHash unchanged → etag equal → NO-OP.
  ok(out.status === "NOOP_ETAG", `D family mismatch → local kept, NO-OP (${out.status})`);
  const after = loadKnrDiscoveryEvidenceStoreLocal();
  ok(after.entries[EVIDENCE_KEY]?.family === "KNR-W", "D local family preserved");
  ok(after.entries[EVIDENCE_KEY]?.contentHash === local.entries[EVIDENCE_KEY].contentHash, "D local record not overwritten by ATH");
}

// ——— E. second identical run → NO-OP ———
{
  ls.clear();
  const calls = [];
  const first = await persistKl3DiscoveryEvidence({ athRmsWire: wire, nowIso: TS }, localIo(calls));
  const wire2 = await realAthWire("t-persist-e2");
  ok(wire2.discoveryStore.entries[EVIDENCE_KEY].contentHash === wire.discoveryStore.entries[EVIDENCE_KEY].contentHash, "E ATH contentHash stable across runs");
  const second = await persistKl3DiscoveryEvidence({ athRmsWire: wire2, nowIso: new Date(NOW + 60_000).toISOString() }, localIo(calls));
  ok(first.status === "SAVED" && second.status === "NOOP_ETAG", `E first SAVED, second NOOP_ETAG (${first.status}/${second.status})`);
  ok(calls.length === 1, "E exactly one write across two identical runs");
}

// ——— F. adaptedCount = 0 → no persistence ———
{
  ls.clear();
  const calls = [];
  const out = await persistKl3DiscoveryEvidence(
    { athRmsWire: { ...wire, adaptedCount: 0 }, nowIso: TS },
    { loadLocal: () => { throw new Error("must not read"); }, save: async () => { calls.push(1); } },
  );
  ok(out.status === "SKIPPED_NO_ADAPTED" && calls.length === 0, `F adaptedCount=0 → SKIPPED_NO_ADAPTED (${out.status})`);
}

// ——— G. empty / null ATH store → no persistence ———
{
  const calls = [];
  const io = { loadLocal: () => { throw new Error("must not read"); }, save: async () => { calls.push(1); } };
  const a = await persistKl3DiscoveryEvidence({ athRmsWire: { ...wire, discoveryStore: emptyKnrDiscoveryEvidenceStore(TS) }, nowIso: TS }, io);
  const b = await persistKl3DiscoveryEvidence({ athRmsWire: { ...wire, discoveryStore: null }, nowIso: TS }, io);
  ok(a.status === "SKIPPED_EMPTY_STORE" && b.status === "SKIPPED_EMPTY_STORE" && calls.length === 0, "G empty/null store → SKIPPED_EMPTY_STORE");
}

// ——— H. writer throws → KL-3 path intact, failure logged ———
{
  ls.clear();
  const warns = [];
  const origWarn = console.warn;
  console.warn = (...args) => warns.push(args);
  let knrSet = 0;
  let hostDone = 0;
  let result = null;
  try {
    result = await executeKl3KnowledgeLookup({
      tenderId: "t-persist-h",
      knr: {
        tenderId: "t-persist-h",
        status: "ready",
        lines: [{ lineId: "L1", dwellingId: "d1", catalogBasis: basis, lookupStatus: null }],
        reasons: [],
      },
      athFiles: [athFile()],
      isCancelled: () => false,
      setKnrKnowledge: (v) => { if (v) knrSet += 1; },
      setKnowledgeBusy: () => {},
      onHostComplete: () => { hostDone += 1; },
      discoveryPersistIo: {
        loadLocal: () => emptyKnrDiscoveryEvidenceStore(TS),
        save: async () => { throw new Error("simulated destructive_discovery_replace"); },
      },
    });
  } finally {
    await new Promise((r) => setTimeout(r, 0));
    console.warn = origWarn;
  }
  ok(result !== null && result.athRmsWire.adaptedCount === 1, "H KL-3 result returned despite writer failure");
  ok(knrSet === 1 && hostDone === 1, "H setKnrKnowledge + onHostComplete still invoked");
  ok(warns.some((w) => String(w[0]).includes("[kl3-discovery-persist]")), "H failure logged via console.warn [kl3-discovery-persist]");
  const direct = await persistKl3DiscoveryEvidence(
    { athRmsWire: wire, nowIso: TS },
    { loadLocal: () => emptyKnrDiscoveryEvidenceStore(TS), save: async () => { throw new Error("boom"); } },
  );
  ok(direct.status === "FAILED" && direct.error === "boom", "H outcome FAILED with error (no throw)");
}

// ——— I. MIXED store (ATH + public on-demand record) → whole store persisted, no ATH-only filter ———
{
  ls.clear();
  let mixed = normalizeKnrDiscoveryEvidenceStore(wire.discoveryStore);
  mixed = upsertKnrDiscoveryEvidenceOffline({
    record: {
      schemaVersion: 1,
      evidenceKeyV1: "KNR|4-01|0349-02",
      family: "KNR",
      displayCode: "KNR 4-01 0349-02",
      unit: "m3",
      discoveryStatus: "DISCOVERED",
      lifecycleState: "ACTIVE",
      sources: [{ sourceId: "ext_gpt_www_gov_pl_deadbeef", urlHash: "u1", contentHash: "c1", fetchedAt: TS, priority: "GOVERNMENT" }],
      norms: { laborNorms: [], materialNorms: [] },
      queryHashes: [],
      contentHash: "ondemand-0349-02",
      createdAt: TS,
      updatedAt: TS,
    },
    nowIso: TS,
    storeOverride: mixed,
  }).store;
  const calls = [];
  const out = await persistKl3DiscoveryEvidence({ athRmsWire: { ...wire, discoveryStore: mixed }, nowIso: TS }, localIo(calls));
  ok(out.status === "SAVED" && out.mergedCount === 2, `I MIXED → SAVED 2 records (${out.status} ${out.mergedCount})`);
  const after = loadKnrDiscoveryEvidenceStoreLocal();
  ok(Boolean(after.entries[EVIDENCE_KEY]) && Boolean(after.entries["KNR|4-01|0349-02"]), "I both ATH and on-demand records persisted (no ATH-only filter)");
}

// ——— J. V1 compatibility — production default path reads persisted local store ———
{
  ls.clear();
  const before = evaluateLaborOnlyAutoBomV1Contract({ workId: WORK_ID, unit: "szt", discoveryStore: loadKnrDiscoveryEvidenceStoreLocal(), nowMs: NOW });
  ok(before.decision !== "LABOR_ONLY_AUTO_BOM_ACCEPT", `J before persist: V1 no accept (${before.decision})`);
  const calls = [];
  await persistKl3DiscoveryEvidence({ athRmsWire: wire, nowIso: TS }, localIo(calls));
  const v1 = evaluateLaborOnlyAutoBomV1Contract({ workId: WORK_ID, unit: "szt", discoveryStore: loadKnrDiscoveryEvidenceStoreLocal(), nowMs: NOW });
  ok(v1.decision === "LABOR_ONLY_AUTO_BOM_ACCEPT", `J V1 ACCEPT after persist (${v1.decision} ${v1.reasons})`);
  // Production default: evaluateAutoBomContract without discoveryStore → loadKnrDiscoveryEvidenceStoreLocal()
  const g2 = evaluateAutoBomContract({
    line: { lineId: "L1", catalogWorkId: WORK_ID, unit: "szt", quantity: 3 },
    nowMs: NOW,
    positionQuantity: 3,
    requireTrustedIdentity: false,
  });
  ok(g2.decision === "AUTO_BOM_ACCEPT" && g2.reasons.includes("LABOR_ONLY_AUTO_BOM_V1"), `J Auto-G2 default store path → AUTO_BOM_ACCEPT (${g2.decision} ${g2.reasons})`);
  ok(localStorage.getItem(KNR_DISCOVERY_EVIDENCE_STORAGE_KEY) !== null, "J persisted under canonical key kw-knr-discovery-evidence");
}

// ——— K2. cancelled run → no persist ———
{
  ls.clear();
  const calls = [];
  const result = await executeKl3KnowledgeLookup({
    tenderId: "t-persist-k",
    knr: { tenderId: "t-persist-k", status: "ready", lines: [{ lineId: "L1", dwellingId: "d1", catalogBasis: basis, lookupStatus: null }], reasons: [] },
    athFiles: [athFile()],
    isCancelled: () => true,
    setKnrKnowledge: () => {},
    setKnowledgeBusy: () => {},
    discoveryPersistIo: { loadLocal: () => emptyKnrDiscoveryEvidenceStore(TS), save: async () => { calls.push(1); } },
  });
  ok(result === null && calls.length === 0, "K2 cancelled → null result, no persist");
}

if (failed > 0) {
  console.error(`\nFAILED ${failed}`);
  process.exit(1);
}
console.log("\nALL PASS — KL-3 discovery evidence persist CONNECT A–K (ARCH-001 = scripts/audit-import-cycles.mjs)");
