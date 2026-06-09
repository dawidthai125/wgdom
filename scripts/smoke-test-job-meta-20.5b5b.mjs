/**
 * Sprint 20.5B.5B — Socjalny label (UI-only)
 * Uruchom: npx vite-node scripts/smoke-test-job-meta-20.5b5b.mjs
 */
import {
  HOUSING_TYPES,
  HOUSING_TYPE_LABELS,
  normalizeJobMetaFields,
} from "../src/lib/job-meta.ts";

const results = {};

function log(msg) {
  console.log(msg);
}

function assert(name, cond, detail = "") {
  results[name] = cond ? "PASS" : "FAIL";
  log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

log("=== Sprint 20.5B.5B — Socjalny label ===\n");

// T1 — key unchanged
assert("T1 key komunalny", HOUSING_TYPES.includes("komunalny"));

// T2 — label Socjalny
assert("T2 label Socjalny", HOUSING_TYPE_LABELS.komunalny === "Socjalny");
assert("T2 not Komunalny label", HOUSING_TYPE_LABELS.komunalny !== "Komunalny");

// T3 — normalize preserves key
{
  const job = normalizeJobMetaFields({ housingType: "komunalny" });
  assert("T3 normalize key", job.housingType === "komunalny");
}

const pass = Object.values(results).filter((r) => r === "PASS").length;
const total = Object.keys(results).length;
log(`\n=== ${pass}/${total} PASS ===`);
if (pass !== total) process.exit(1);
