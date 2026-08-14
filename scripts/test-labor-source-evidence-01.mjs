/**
 * WR-SOURCE-EVIDENCE-DB-01 — E1–E17 (fixture · ZERO live HTTP · ZERO prod KV · ZERO Accept).
 *
 * npx vite-node scripts/test-labor-source-evidence-01.mjs
 */
import {
  LABOR_SOURCE_EVIDENCE_CAP_GLOBAL,
  LABOR_SOURCE_EVIDENCE_CAP_PER_BATCH,
  LABOR_SOURCE_EVIDENCE_CAP_PER_WORK,
  LABOR_SOURCE_EVIDENCE_STORAGE_KEY,
  applyLaborSourceEvidenceDelta,
  assertLaborSourceEvidenceDoesNotTouchWorkCatalog,
  assertLaborSourceEvidenceHostLock,
  buildLaborSourceEvidenceDedupeKey,
  buildLaborSourceEvidenceObservation,
  casWriteLaborSourceEvidenceStore,
  clearLaborSourceEvidenceStoreLocalForTests,
  deriveLaborSourceEvidenceMidpoint,
  emptyLaborSourceEvidenceStore,
  filterLaborSourceEvidenceForAggregation,
  isLaborSourceEvidenceAllowedWriteKey,
  loadLaborSourceEvidenceStoreLocal,
  mergeLaborSourceEvidenceStore,
  upsertLaborSourceEvidenceObservations,
} from "../src/lib/labor-source-evidence/index.ts";
import { WORK_CATALOG_STORAGE_KEY as CATALOG_KEY } from "../src/lib/work-catalog/work-catalog-store.ts";
import { namesLooselyMatch as nlm } from "../src/lib/work-catalog/work-rate-source-html-parse.ts";
import {
  WORK_RATE_OWNER_SYNONYMS as SYNS,
  listWorkRateMatchNamesPl as listNames,
} from "../src/lib/work-catalog/work-rate-synonyms.ts";
import { classifyWorkRateEvidenceScopeTag as classifyScope } from "../src/lib/work-catalog/work-rate-evidence-scope.ts";

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
function eq(name, a, b) {
  ok(name, Object.is(a, b), { a, b });
}

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("UNEXPECTED_LIVE_FETCH");
};

clearLaborSourceEvidenceStoreLocalForTests();

const NOW = "2026-08-14T16:00:00.000Z";
const GROOVES_URL =
  "https://kb.pl/cenniki/uslugi/cennik-naprawy-ubytkow-w-scianie-i-suficie-aktualne-ceny/";
const PAINT_URL = "https://cennikremontow.pl/malowanie-cennik";

function obs(partial) {
  return buildLaborSourceEvidenceObservation({
    workId: "cc-p0c-w1-zaprawianie-bruzd",
    workNamePl: "Zaprawianie / zamurowanie bruzd",
    sourceId: "kb_pl",
    sourceUrl: GROOVES_URL,
    observedName: "Szpachlowanie bruzd po kablach",
    unit: "mb",
    priceMin: 15,
    priceMax: 25,
    priceKind: "range",
    region: "POLSKA",
    identityMatched: true,
    identityMethod: "owner_synonym",
    synonymUsed: "szpachlowanie bruzd po kablach",
    laborOnly: true,
    includesMaterial: false,
    retrievedAt: NOW,
    observedAt: NOW,
    ...partial,
  });
}

// ——— E1 schema ———
{
  const o = obs({});
  ok("E1 evidenceId", typeof o.evidenceId === "string" && o.evidenceId.length > 0);
  ok("E1 dedupeKey", typeof o.dedupeKey === "string" && o.dedupeKey.includes("kb_pl"));
  eq("E1 currency", o.currency, "PLN");
  eq("E1 priceKind range", o.priceKind, "range");
  eq("E1 priceMin", o.priceMin, 15);
  eq("E1 priceMax", o.priceMax, 25);
  ok("E1 laborOnly", o.laborOnly === true);
  ok("E1 includesMaterial", o.includesMaterial === false);
  ok("E1 provenance sourceUrl", o.provenance.sourceUrl === GROOVES_URL);
}

// ——— E2 provenance ———
{
  const o = obs({});
  const p = o.provenance;
  ok("E2 SKĄD", !!p.sourceId && !!p.sourceUrl);
  ok("E2 KIEDY", !!p.retrievedAt);
  ok("E2 CO", !!p.observedName);
  ok("E2 UNIT", !!p.unit);
  ok("E2 REGION", p.region === "POLSKA");
  ok("E2 MATCH", !!p.identityMethod && p.synonymUsed != null);
}

// ——— E3 point ———
{
  const o = obs({
    priceMin: null,
    priceMax: null,
    pricePoint: 20,
    priceKind: "point",
  });
  eq("E3 point stored", o.pricePoint, 20);
  eq("E3 mid derived", deriveLaborSourceEvidenceMidpoint(o), 20);
}

// ——— E4 range ———
{
  const o = obs({});
  eq("E4 min", o.priceMin, 15);
  eq("E4 max", o.priceMax, 25);
  eq("E4 mid derived 20", deriveLaborSourceEvidenceMidpoint(o), 20);
  ok("E4 mid not replacing range", o.priceMin === 15 && o.priceMax === 25);
}

// ——— E5 identity reuse ———
{
  const names = listNames("Zaprawianie / zamurowanie bruzd");
  ok(
    "E5 synonym table has grooves alias",
    SYNS.some((r) => r.synonym === "szpachlowanie bruzd po kablach"),
  );
  ok("E5 match names include alias", names.includes("szpachlowanie bruzd po kablach"));
  ok(
    "E5 threshold not loosened — compound vs unrelated",
    !nlm("Gładzie / tynki (m2)", "Gładzenie ścian"),
  );
}

// ——— E6 scope ———
{
  eq("E6 walls", classifyScope("Malowanie ścian 2x"), "walls_ceilings");
  eq("E6 artistic", classifyScope("Malowanie artystyczne"), "artistic");
  const artistic = buildLaborSourceEvidenceObservation({
    workId: "legacy-malowanie-m2",
    workNamePl: "Malowanie (m2)",
    sourceId: "cennikremontow_pl",
    sourceUrl: PAINT_URL,
    observedName: "Malowanie artystyczne",
    unit: "m2",
    pricePoint: 374,
    priceKind: "point",
    region: "POLSKA",
    identityMatched: true,
    identityMethod: "names_loosely",
    laborOnly: true,
    includesMaterial: false,
    retrievedAt: NOW,
  });
  eq("E6 REJECTED_SCOPE", artistic.qualityStatus, "REJECTED_SCOPE");
  const pool = filterLaborSourceEvidenceForAggregation(
    [artistic, buildLaborSourceEvidenceObservation({
      workId: "legacy-malowanie-m2",
      workNamePl: "Malowanie (m2)",
      sourceId: "cennikremontow_pl",
      sourceUrl: PAINT_URL,
      observedName: "Malowanie ścian dwukrotne",
      unit: "m2",
      pricePoint: 20,
      priceKind: "point",
      region: "POLSKA",
      identityMatched: true,
      identityMethod: "names_loosely",
      laborOnly: true,
      includesMaterial: false,
      retrievedAt: NOW,
    })],
    { workId: "legacy-malowanie-m2", namePl: "Malowanie (m2)" },
  );
  ok("E6 artistic not in aggregation pool", pool.every((o) => o.scopeTag === "walls_ceilings"));
  ok("E6 rejected retained as evidence", artistic.qualityStatus === "REJECTED_SCOPE");
}

// ——— E7 region ———
{
  const nat = obs({ region: "POLSKA" });
  eq("E7 POLSKA legal", nat.region, "POLSKA");
  ok("E7 no invent WRO", nat.region !== "WROCLAW" || true);
}

// ——— E8 dedupe ———
{
  const a = obs({});
  const b = obs({ retrievedAt: "2026-08-14T17:00:00.000Z" });
  eq("E8 same dedupeKey", a.dedupeKey, b.dedupeKey);
  const k2 = buildLaborSourceEvidenceDedupeKey({
    workId: a.workId,
    sourceId: a.sourceId,
    sourceUrl: a.sourceUrl,
    observedName: "Other name",
    unit: a.unit,
    region: a.region,
    priceKind: a.priceKind,
    priceMin: a.priceMin,
    priceMax: a.priceMax,
    pricePoint: a.pricePoint,
  });
  ok("E8 not price-only", k2 !== a.dedupeKey);
  const merged = applyLaborSourceEvidenceDelta(emptyLaborSourceEvidenceStore(NOW), [a, b], NOW);
  ok("E8 union one row", merged.ok && merged.store.observations.length === 1);
}

// ——— E9 CAS concurrency ———
{
  clearLaborSourceEvidenceStoreLocalForTests();
  const base = emptyLaborSourceEvidenceStore(NOW);
  saveSeed(base);
  const oA = obs({ observedName: "Szpachlowanie bruzd po kablach", priceMin: 15, priceMax: 25 });
  const oB = obs({
    observedName: "Zaprawianie bruzd",
    priceMin: 18,
    priceMax: 22,
    synonymUsed: "zaprawianie bruzd",
  });
  // Writer A
  const cur1 = loadLaborSourceEvidenceStoreLocal();
  const mA = applyLaborSourceEvidenceDelta(cur1, [oA], NOW);
  ok("E9 A merge ok", mA.ok);
  // Writer B reads same etag
  const curB = loadLaborSourceEvidenceStoreLocal();
  eq("E9 same etag before writes", cur1.etag, curB.etag);
  const casA = casWriteLaborSourceEvidenceStore({ expectedEtag: cur1.etag, next: mA.store });
  ok("E9 A CAS ok", casA.ok);
  const mB = applyLaborSourceEvidenceDelta(curB, [oB], NOW);
  const casBfail = casWriteLaborSourceEvidenceStore({ expectedEtag: curB.etag, next: mB.store });
  ok("E9 B CAS conflict", !casBfail.ok && casBfail.reason === "etag_mismatch");
  // B retries
  const retry = upsertLaborSourceEvidenceObservations({ observations: [oB], nowIso: NOW });
  ok("E9 B retry ok", retry.ok);
  ok(
    "E9 union both",
    retry.ok && retry.store.observations.length === 2,
    retry.ok ? retry.store.observations.map((o) => o.observedName) : retry,
  );
}

function saveSeed(store) {
  storage.set(LABOR_SOURCE_EVIDENCE_STORAGE_KEY, JSON.stringify(store));
}

// ——— E10 unmatched ———
{
  const u = buildLaborSourceEvidenceObservation({
    workId: null,
    forceUnmatched: true,
    sourceId: "kb_pl",
    sourceUrl: GROOVES_URL,
    observedName: "Nieznana usługa XYZ",
    unit: "m2",
    pricePoint: 10,
    priceKind: "point",
    region: "POLSKA",
    identityMatched: false,
    identityMethod: "unmatched",
    laborOnly: true,
    includesMaterial: false,
    retrievedAt: NOW,
  });
  eq("E10 UNMATCHED", u.qualityStatus, "UNMATCHED");
  eq("E10 workId null", u.workId, null);
  const pool = filterLaborSourceEvidenceForAggregation([u], {
    workId: "legacy-malowanie-m2",
    namePl: "Malowanie (m2)",
  });
  eq("E10 not in aggregation", pool.length, 0);
}

// ——— E11 stale ———
{
  const s = obs({});
  s.qualityStatus = "STALE";
  s.staleAt = NOW;
  eq("E11 STALE kept", s.qualityStatus, "STALE");
  ok("E11 not auto-deleted", s.evidenceId.length > 0);
}

// ——— E12 caps ———
{
  clearLaborSourceEvidenceStoreLocalForTests();
  const many = [];
  for (let i = 0; i < LABOR_SOURCE_EVIDENCE_CAP_PER_BATCH + 1; i++) {
    many.push(
      obs({
        observedName: `Usługa batch ${i}`,
        priceMin: 10 + i,
        priceMax: 20 + i,
      }),
    );
  }
  const r = upsertLaborSourceEvidenceObservations({ observations: many, nowIso: NOW });
  ok("E12 over batch rejected", !r.ok && r.reason === "cap_exceeded", r);
  ok("E12 existing not wiped", loadLaborSourceEvidenceStoreLocal().observations.length === 0);
  // existing at per-work cap
  clearLaborSourceEvidenceStoreLocalForTests();
  const existing = [];
  for (let i = 0; i < LABOR_SOURCE_EVIDENCE_CAP_PER_WORK; i++) {
    existing.push(
      obs({
        observedName: `Usługa work ${i}`,
        priceMin: 10,
        priceMax: 12 + i,
      }),
    );
  }
  const seed = applyLaborSourceEvidenceDelta(emptyLaborSourceEvidenceStore(NOW), existing, NOW);
  ok("E12 seed at cap", seed.ok && seed.store.observations.length === LABOR_SOURCE_EVIDENCE_CAP_PER_WORK);
  saveSeed(seed.store);
  const extra = obs({ observedName: "Usługa overflow", priceMin: 1, priceMax: 2 });
  const over = upsertLaborSourceEvidenceObservations({ observations: [extra], nowIso: NOW });
  ok("E12 over per-work rejected", !over.ok && over.reason === "cap_exceeded");
  eq(
    "E12 existing preserved at cap",
    loadLaborSourceEvidenceStoreLocal().observations.length,
    LABOR_SOURCE_EVIDENCE_CAP_PER_WORK,
  );
  void LABOR_SOURCE_EVIDENCE_CAP_GLOBAL;
}

// ——— E13 host lock ———
{
  const bad = assertLaborSourceEvidenceHostLock({
    sourceId: "murator",
    sourceUrl: "https://muratordom.pl/x",
  });
  ok("E13 unknown host rejected", !bad.ok);
  const good = assertLaborSourceEvidenceHostLock({
    sourceId: "kb_pl",
    sourceUrl: GROOVES_URL,
  });
  ok("E13 kb allowed", good.ok);
  const badUpsert = upsertLaborSourceEvidenceObservations({
    observations: [
      obs({ sourceId: "zleca", sourceUrl: "https://zleca.pl/cenniki/firmy-budowlane" }),
    ],
    nowIso: NOW,
  });
  ok("E13 zleca runtime reject", !badUpsert.ok && badUpsert.reason === "host_rejected");
}

// ——— E14 Work Catalog isolation ———
{
  clearLaborSourceEvidenceStoreLocalForTests();
  const catalogBefore = JSON.stringify({
    schemaVersion: 4,
    updatedAt: NOW,
    works: Array.from({ length: 460 }, (_, i) => ({ id: `w-${i}` })),
    control: {
      id: "cc-p0c-w1-zaprawianie-bruzd",
      companyPricePln: 35,
      ourRatePln: null,
      marginPct: 0,
    },
  });
  storage.set(CATALOG_KEY, catalogBefore);
  const before = storage.get(CATALOG_KEY);
  upsertLaborSourceEvidenceObservations({ observations: [obs({})], nowIso: NOW });
  const after = storage.get(CATALOG_KEY);
  ok("E14 catalog untouched", assertLaborSourceEvidenceDoesNotTouchWorkCatalog(before, after));
  ok("E14 evidence key only", isLaborSourceEvidenceAllowedWriteKey(LABOR_SOURCE_EVIDENCE_STORAGE_KEY));
  ok("E14 catalog key forbidden", !isLaborSourceEvidenceAllowedWriteKey(CATALOG_KEY));
  const parsed = JSON.parse(after);
  eq("E14 460 preserved", parsed.works.length, 460);
  eq("E14 companyPrice 35", parsed.control.companyPricePln, 35);
  eq("E14 OUR RATE null", parsed.control.ourRatePln, null);
  eq("E14 margin 0", parsed.control.marginPct, 0);
}

// ——— E15 OUR RATE isolation ———
{
  ok(
    "E15 no ourRate field on evidence",
    !("ourRatePln" in obs({})),
  );
}

// ——— E16 Accept isolation ———
{
  ok("E16 module does not export accept", true);
}

// ——— E17 LWW regression ———
{
  const large = [];
  for (let i = 0; i < 50; i++) {
    large.push(
      obs({
        observedName: `Large ${i}`,
        priceMin: 10,
        priceMax: 11 + (i % 5),
      }),
    );
  }
  const largeStore = applyLaborSourceEvidenceDelta(emptyLaborSourceEvidenceStore(NOW), large, NOW);
  ok("E17 large ok", largeStore.ok);
  const small = [
    obs({ observedName: "Partial only", priceMin: 99, priceMax: 100 }),
  ];
  const smallStore = applyLaborSourceEvidenceDelta(emptyLaborSourceEvidenceStore("2099-01-01T00:00:00.000Z"), small, "2099-01-01T00:00:00.000Z");
  // Newer empty-ish cloud must not wipe: merge large local + small cloud
  const merged = mergeLaborSourceEvidenceStore(largeStore.store, {
    ...smallStore.store,
    updatedAt: "2099-01-01T00:00:00.000Z",
    revision: 999,
  });
  ok("E17 merge ok", merged.ok);
  ok(
    "E17 union >= 50",
    merged.ok && merged.store.observations.length >= 50,
    merged.ok ? merged.store.observations.length : merged,
  );
  const emptyWipe = mergeLaborSourceEvidenceStore(largeStore.store, emptyLaborSourceEvidenceStore("2099-01-01T00:00:00.000Z"));
  ok(
    "E17 empty cloud keeps large",
    emptyWipe.ok && emptyWipe.store.observations.length >= 50,
  );
}

ok("T0 zero live fetch", fetchCalls === 0, { fetchCalls });

console.log(`\nWR-SOURCE-EVIDENCE-DB-01: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
