/**
 * LOCALSTORAGE-ARCH-02 A0–E — smoke tests (Node mock LS + in-memory IDB stub via direct helpers).
 * Run: npx vite-node scripts/test-localstorage-arch-02-ae.mjs
 */

globalThis.localStorage = {
  _m: new Map(),
  setItem(k, v) { this._m.set(String(k), String(v)); },
  getItem(k) { return this._m.has(String(k)) ? this._m.get(String(k)) : null; },
  removeItem(k) { this._m.delete(String(k)); },
  clear() { this._m.clear(); },
  key(i) { return [...this._m.keys()][i] ?? null; },
  get length() { return this._m.size; },
};

// Minimal indexedDB stub — idb adapter will fail open; helpers still exercise strip/budget/telemetry.
globalThis.indexedDB = undefined;

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

const { estimateJsonBytes, STORAGE_LIMIT, budgetStateForTotal, measureLocalStorageBytes } =
  await import("../src/lib/storage/storage-budget.ts");
const { stripTenderPipelineForLocalStorage } =
  await import("../src/lib/storage/tenders-pipeline-cold.ts");
const { installStorageTelemetryGlobals, reportStorageTelemetry, recordStorageWrite } =
  await import("../src/lib/storage/storage-telemetry.ts");

installStorageTelemetryGlobals();

assert("estimateJsonBytes object", estimateJsonBytes({ a: 1 }) > 0);
assert("budget ok empty", budgetStateForTotal(0) === "ok");
assert("budget over limit", budgetStateForTotal(STORAGE_LIMIT + 1) === "over");

localStorage.setItem("kw-test-big", "x".repeat(1000));
const measured = measureLocalStorageBytes();
assert("measure has key", measured.perKey["kw-test-big"] > 0);

recordStorageWrite({ key: "kw-test", bytes: 10, writer: "test", ok: true, tier: 1 });
assert("telemetry report non-empty", reportStorageTelemetry().includes("__WG_STORAGE__"));
assert("telemetry largest", globalThis.__WG_STORAGE__.largest(5).length >= 1);
assert("telemetry budget", globalThis.__WG_STORAGE__.budget().limit === STORAGE_LIMIT);
assert("telemetry writers", globalThis.__WG_STORAGE__.writers().some((w) => w.writer === "test"));
assert("telemetry history", globalThis.__WG_STORAGE__.history().length >= 1);

const lean = stripTenderPipelineForLocalStorage([
  {
    id: "t1",
    noticeHtml: "<html>HEAVY</html>",
    tenderDossier: { kosztorys: { rows: [{ a: 1 }, { a: 2 }, { a: 3 }] } },
    title: "x",
  },
]);
assert("strip removes noticeHtml", !lean[0].noticeHtml);
assert("strip clears kosztorys rows", lean[0].tenderDossier.kosztorys.rows.length === 0);
assert("strip keeps cold count", lean[0].tenderDossier.kosztorys._coldRowsCount === 3);

const { saveLocalDataSnapshot, listLocalDataSnapshots } =
  await import("../src/lib/local-data-backup.ts");
localStorage.setItem("kw-local-snapshot-bundle", JSON.stringify({ at: "2020-01-01", data: { "kw-jobs": [] } }));
saveLocalDataSnapshot();
assert("snapshot removed from LS", localStorage.getItem("kw-local-snapshot-bundle") == null);
assert("snapshot list from mem", listLocalDataSnapshots().length >= 1);

const { saveLocalJobsSnapshot, listLocalJobsSnapshots } =
  await import("../src/lib/jobs-safety.ts");
localStorage.setItem("kw-jobs-local-snaps", JSON.stringify([{ at: "a", jobs: [{ id: "1" }] }]));
saveLocalJobsSnapshot([{ id: "1" }, { id: "2" }]);
assert("jobs snaps removed from LS", localStorage.getItem("kw-jobs-local-snaps") == null);
assert("jobs snaps mem", listLocalJobsSnapshots().length >= 1);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
