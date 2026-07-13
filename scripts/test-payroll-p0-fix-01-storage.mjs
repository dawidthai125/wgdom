/**
 * PAYROLL-P0-FIX-01 — storage failure ≠ bootstrap FAILED
 * Run: npx vite-node scripts/test-payroll-p0-fix-01-storage.mjs
 */

const mem = new Map();
let throwOnKeys = new Set();
let throwAll = false;

globalThis.localStorage = {
  setItem(key, value) {
    if (throwAll || throwOnKeys.has(String(key))) {
      const err = new DOMException("Quota exceeded", "QuotaExceededError");
      throw err;
    }
    mem.set(String(key), String(value));
  },
  getItem(key) {
    return mem.has(String(key)) ? mem.get(String(key)) : null;
  },
  removeItem(key) {
    mem.delete(String(key));
  },
  clear() {
    mem.clear();
  },
  key() {
    return null;
  },
  get length() {
    return mem.size;
  },
};

if (typeof globalThis.DOMException !== "function") {
  globalThis.DOMException = class DOMException extends Error {
    constructor(message, name) {
      super(message);
      this.name = name || "Error";
    }
  };
}

const {
  safeSetLocalStorageJson,
  safeSetLocalStorageRaw,
  persistBootstrapMergedKey,
} = await import("../src/lib/cloud-sync.ts");
const {
  clearBootstrapPayrollHandoffForTests,
  peekBootstrapPayrollHandoff,
  publishBootstrapPayrollHandoff,
} = await import("../src/lib/cloud-bootstrap.ts");
const {
  isCloudBootstrapReady,
  resolveBootstrapPhaseOpen,
} = await import("../src/lib/cloud-loader-bootstrap-gate.ts");

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

function resetMem() {
  mem.clear();
  throwOnKeys = new Set();
  throwAll = false;
}

resetMem();
const ok = safeSetLocalStorageJson("kw-test-ok", { a: 1 });
assert("safeSet ok", ok.ok === true && ok.storageFailure === false);
assert("safeSet wrote", mem.get("kw-test-ok") === JSON.stringify({ a: 1 }));

resetMem();
throwOnKeys = new Set(["kw-week-employees"]);
const failWrite = safeSetLocalStorageJson("kw-week-employees", [{ id: "1" }]);
assert("quota → storageFailure", failWrite.ok === false && failWrite.storageFailure === true);
assert("quota → QuotaExceededError name", failWrite.errorName === "QuotaExceededError");

const persistSkips = persistBootstrapMergedKey("kw-week-employees", []);
assert("empty roster skip persist ok", persistSkips.ok === true && persistSkips.storageFailure === false);

resetMem();
throwOnKeys = new Set(["kw-week-employees"]);
const persistFail = persistBootstrapMergedKey("kw-week-employees", [{ id: "e1" }, { id: "e2" }]);
assert("persistBootstrapMergedKey swallows quota", persistFail.ok === false && persistFail.storageFailure === true);

let phase = "PENDING";
phase = resolveBootstrapPhaseOpen(phase, "SUCCESS");
assert("SUCCESS after storage-ok path", phase === "SUCCESS" && isCloudBootstrapReady(phase));
phase = resolveBootstrapPhaseOpen(phase, "FAILED");
assert("first phase wins (SUCCESS not overwritten by FAILED)", phase === "SUCCESS");

clearBootstrapPayrollHandoffForTests();
publishBootstrapPayrollHandoff({
  weekEmployees: Array.from({ length: 14 }, (_, i) => ({ id: `e${i}` })),
  weekFrom: "2026-07-06",
  weekTo: "2026-07-12",
});
const h = peekBootstrapPayrollHandoff();
assert("handoff count 14", h?.weekEmployees.length === 14);
assert("handoff week", h?.weekFrom === "2026-07-06" && h?.weekTo === "2026-07-12");

resetMem();
const raw = safeSetLocalStorageRaw("wg-flag", "1");
assert("raw flag ok", raw.ok && mem.get("wg-flag") === "1");

clearBootstrapPayrollHandoffForTests();

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
