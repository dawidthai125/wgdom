/**
 * WC-P3.2-S3 — golden/integration: commitMarketQuotesImport (orchestration).
 * npx vite-node scripts/test-work-catalog-commit-p3.2s3.mjs
 *
 * Deps I/O wstrzykiwane (in-memory) — bez cloud/localStorage.
 * Scenariusze: successful · no-op · rollback after failed save ·
 * fingerprint verification · read-merge-write · router modes · idempotence.
 */
import {
  commitMarketQuotesImport,
  normalizeWorkCatalogStore,
  mergeWorkCatalogStore,
} from "../src/lib/work-catalog/index.ts";

const T1 = "2026-06-20T10:00:00.000Z";
const T2 = "2026-06-25T10:00:00.000Z";
const T3 = "2026-06-30T10:00:00.000Z";

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass += 1; console.log("PASS", name); }
  else { fail += 1; console.log("FAIL", name); }
}
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function snap(origin, regionCode, price, confidence, updatedAt, coverage = "full") {
  return { origin, regionCode, price, confidence, updatedAt, coverage };
}
function makePreview(rows) {
  return { mode: "preview", parse: {}, matched: rows, lowConfidence: [], unmatched: [], rejected: [], summary: {} };
}
function baseStore(updatedAt = T1) {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt,
    catalogs: {
      wroclaw: {
        region: "wroclaw",
        updatedAt,
        works: [
          {
            id: "malowanie-scian-m2", tradeId: "MALOWANIE", namePl: "Malowanie ścian",
            unit: "m2", companyPricePln: 30, updatedAt,
            marketQuotes: { kb_pl: { wroclaw: snap("kb_pl", "wroclaw", 40, 0.8, T1) } },
          },
          {
            id: "montaz-wc-szt", tradeId: "HYDRAULIKA", namePl: "Montaż WC",
            unit: "szt", companyPricePln: 200, updatedAt,
          },
        ],
      },
      dolnyslask: { region: "dolnyslask", updatedAt, works: [] },
    },
  });
}
function qOf(store, region, workId) {
  return store.catalogs[region].works.find((w) => w.id === workId)?.marketQuotes;
}
function saveNormalize(s, opts) {
  return normalizeWorkCatalogStore({ ...s, updatedAt: opts?.updatedAtIso ?? s.updatedAt });
}

/** In-memory backend imitujący router + cloud-sync. */
function makeBackend({ local, cloud = null, mode = "work_only", saveImpl } = {}) {
  const be = { local: clone(local), cloud: cloud ? clone(cloud) : null, saveCalls: 0, saveLocalCalls: 0 };
  be.deps = {
    load: async () => {
      if (be.cloud == null) return normalizeWorkCatalogStore(be.local);
      const merged = mergeWorkCatalogStore(be.local, be.cloud);
      be.local = clone(merged);
      return merged;
    },
    save: async (s, opts) => {
      be.saveCalls += 1;
      if (saveImpl) return saveImpl(be, s, opts);
      if (mode === "legacy_only") return { ok: true, saved: false, blocked: "legacy_only_blocks_work" };
      const next = saveNormalize(s, opts);
      be.local = next;
      be.cloud = clone(next);
      return { ok: true, saved: true };
    },
    loadLocal: () => normalizeWorkCatalogStore(be.local),
    saveLocal: (s, opts) => { be.saveLocalCalls += 1; be.local = saveNormalize(s, opts); },
  };
  return be;
}

console.log("=== WC-P3.2-S3 COMMIT ORCHESTRATION ===\n");

// ─── 1. SUCCESSFUL COMMIT ───────────────────────────────────────────────────
{
  const be = makeBackend({ local: baseStore() });
  const report = await commitMarketQuotesImport(
    makePreview([{ workId: "malowanie-scian-m2", snapshot: snap("sekocenbud", "wroclaw", 55, 0.7, T1) }]),
    { updatedAtIso: T2, deps: be.deps },
  );
  assert("success status committed", report.status === "committed" && report.saved === true);
  assert("success apply worksTouched=1", report.apply.worksTouched === 1);
  assert("success persistVerified", report.persistVerified === true);
  assert("success fingerprint changed", report.preFingerprint !== report.postFingerprint);
  assert("success local has sekocenbud", qOf(be.local, "wroclaw", "malowanie-scian-m2")?.sekocenbud?.wroclaw?.price === 55);
  assert("success local keeps kb_pl", qOf(be.local, "wroclaw", "malowanie-scian-m2")?.kb_pl?.wroclaw?.price === 40);
}

// ─── 2. NO-OP COMMIT (apply nic nie zmienił) ────────────────────────────────
{
  const be = makeBackend({ local: baseStore() });
  const before = clone(be.local);
  const report = await commitMarketQuotesImport(
    makePreview([{ workId: "malowanie-scian-m2", snapshot: snap("kb_pl", "wroclaw", 999, 0.8, T1) }]), // pełny remis → keep
    { updatedAtIso: T2, deps: be.deps },
  );
  assert("noop status", report.status === "noop" && report.saved === false);
  assert("noop apply worksTouched=0", report.apply.worksTouched === 0);
  assert("noop save NOT called", be.saveCalls === 0);
  assert("noop fingerprint unchanged", report.preFingerprint === report.postFingerprint);
  assert("noop local unchanged", JSON.stringify(be.local) === JSON.stringify(before));
}

// ─── 3. ROLLBACK AFTER FAILED SAVE (lokalny) ────────────────────────────────
{
  const be = makeBackend({
    local: baseStore(),
    // save zapisuje lokalnie, po czym pada (cloud persist error)
    saveImpl: (b, s, opts) => { b.local = saveNormalize(s, opts); throw new Error("cloud down"); },
  });
  const report = await commitMarketQuotesImport(
    makePreview([{ workId: "malowanie-scian-m2", snapshot: snap("sekocenbud", "wroclaw", 55, 0.7, T1) }]),
    { updatedAtIso: T2, deps: be.deps },
  );
  assert("rollback status", report.status === "rolled-back" && report.saved === false);
  assert("rollback rolledBack=true", report.rolledBack === true);
  assert("rollback saveLocal invoked", be.saveLocalCalls === 1);
  assert("rollback local reverted (no sekocenbud)", qOf(be.local, "wroclaw", "malowanie-scian-m2")?.sekocenbud === undefined);
  assert("rollback local keeps kb_pl", qOf(be.local, "wroclaw", "malowanie-scian-m2")?.kb_pl?.wroclaw?.price === 40);
}

// ─── 4. FINGERPRINT VERIFICATION (persist mismatch wykryty) ─────────────────
{
  const be = makeBackend({
    local: baseStore(),
    // save zwraca ok, ale NIE utrwala lokalnie (loadLocal zwróci stary stan)
    saveImpl: () => ({ ok: true, saved: true }),
  });
  const report = await commitMarketQuotesImport(
    makePreview([{ workId: "malowanie-scian-m2", snapshot: snap("sekocenbud", "wroclaw", 55, 0.7, T1) }]),
    { updatedAtIso: T2, deps: be.deps },
  );
  assert("fp-verify status committed", report.status === "committed" && report.saved === true);
  assert("fp-verify persistVerified=false (mismatch)", report.persistVerified === false);
}

// ─── 5. READ-MERGE-WRITE (nie klobuje współbieżnej zmiany z cloud) ──────────
{
  // local starszy (T1), cloud nowszy (T3) z quote dla montaz-wc → LWW: load bierze cloud
  const cloud = baseStore(T3);
  cloud.catalogs.wroclaw.works[1].marketQuotes = { wgdom: { wroclaw: snap("wgdom", "wroclaw", 210, 0.9, T3) } };
  const be = makeBackend({ local: baseStore(T1), cloud: normalizeWorkCatalogStore(cloud) });

  const report = await commitMarketQuotesImport(
    makePreview([{ workId: "malowanie-scian-m2", snapshot: snap("sekocenbud", "wroclaw", 55, 0.7, T1) }]),
    { updatedAtIso: T3, deps: be.deps },
  );
  assert("rmw status committed", report.status === "committed");
  assert("rmw keeps cloud montaz quote", qOf(be.local, "wroclaw", "montaz-wc-szt")?.wgdom?.wroclaw?.price === 210);
  assert("rmw adds new sekocenbud", qOf(be.local, "wroclaw", "malowanie-scian-m2")?.sekocenbud?.wroclaw?.price === 55);
}

// ─── 6. ROUTER MODES (catalogWriteMode = legacy_only → blocked) ─────────────
{
  const beBlocked = makeBackend({ local: baseStore(), mode: "legacy_only" });
  const before = clone(beBlocked.local);
  const blocked = await commitMarketQuotesImport(
    makePreview([{ workId: "malowanie-scian-m2", snapshot: snap("sekocenbud", "wroclaw", 55, 0.7, T1) }]),
    { updatedAtIso: T2, deps: beBlocked.deps },
  );
  assert("router legacy_only → blocked", blocked.status === "blocked" && blocked.saved === false);
  assert("router blocked reason", blocked.blocked === "legacy_only_blocks_work");
  assert("router blocked local unchanged", JSON.stringify(beBlocked.local) === JSON.stringify(before));

  const beOk = makeBackend({ local: baseStore(), mode: "work_only" });
  const ok = await commitMarketQuotesImport(
    makePreview([{ workId: "malowanie-scian-m2", snapshot: snap("sekocenbud", "wroclaw", 55, 0.7, T1) }]),
    { updatedAtIso: T2, deps: beOk.deps },
  );
  assert("router work_only → committed", ok.status === "committed" && ok.saved === true);
}

// ─── 7. IDEMPOTENCE (drugi commit tego samego preview = no-op) ──────────────
{
  const be = makeBackend({ local: baseStore() });
  const preview = makePreview([
    { workId: "malowanie-scian-m2", snapshot: snap("sekocenbud", "wroclaw", 55, 0.7, T1) },
    { workId: "montaz-wc-szt", snapshot: snap("wgdom", "wroclaw", 205, 0.92, T2) },
  ]);
  const first = await commitMarketQuotesImport(preview, { updatedAtIso: T2, deps: be.deps });
  const afterFirst = clone(be.local);
  const second = await commitMarketQuotesImport(preview, { updatedAtIso: T3, deps: be.deps });

  assert("idempotence first committed", first.status === "committed");
  assert("idempotence second noop", second.status === "noop" && second.saved === false);
  assert("idempotence store stable after 2nd", JSON.stringify(be.local) === JSON.stringify(afterFirst));
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
