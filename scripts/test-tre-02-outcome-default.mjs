/**
 * TRE-02 — Outcome First: default ON + R0 (LS=0 → Hub-first).
 * Run: npx vite-node scripts/test-tre-02-outcome-default.mjs
 */
import {
  isTre01SliceAEnabled,
  TRE_01_SLICE_A_DEFAULT,
  TRE_01_SLICE_A_LS_KEY,
} from "../src/lib/tenders-v4-config.ts";

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

assert("T2-F1 default ON", TRE_01_SLICE_A_DEFAULT === true);
assert("T2-F2 LS key unchanged", TRE_01_SLICE_A_LS_KEY === "kw-tre-01-slice-a");

/** Memory LS mock (Node — R0). */
const mem = new Map();
globalThis.localStorage = {
  getItem(key) {
    return mem.has(key) ? mem.get(key) : null;
  },
  setItem(key, value) {
    mem.set(String(key), String(value));
  },
  removeItem(key) {
    mem.delete(String(key));
  },
};

mem.clear();
assert("T2-F3 no LS → mirrors default ON", isTre01SliceAEnabled() === true);

mem.set(TRE_01_SLICE_A_LS_KEY, "0");
assert("T2-R0 LS=0 → Hub-first OFF", isTre01SliceAEnabled() === false);

mem.set(TRE_01_SLICE_A_LS_KEY, "1");
assert("T2-F4 LS=1 → Outcome ON", isTre01SliceAEnabled() === true);

mem.delete(TRE_01_SLICE_A_LS_KEY);
assert("T2-R0b removeItem → default ON", isTre01SliceAEnabled() === true);

console.log(`\nTRE-02 Outcome default: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
