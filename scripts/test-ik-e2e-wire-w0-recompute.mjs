/**
 * INTELLIGENT-COST-ESTIMATOR-E2E-WIRE-01 W0 — dual bump after Accept persist.
 *
 * npx vite-node scripts/test-ik-e2e-wire-w0-recompute.mjs
 */
import {
  notifyIkPricingAccepted,
  notifyIkPricingAcceptedIfPersistOk,
} from "../src/lib/ik-pricing-orchestrator/index.ts";

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

function makeCounters() {
  let pricing = 0;
  let chief = 0;
  return {
    get pricing() {
      return pricing;
    },
    get chief() {
      return chief;
    },
    input: {
      bumpPricingCatalogRevision: () => {
        pricing += 1;
      },
      bumpChiefRefresh: () => {
        chief += 1;
      },
    },
  };
}

// T1 — successful notify bumps both
{
  const c = makeCounters();
  const r = notifyIkPricingAccepted(c.input);
  ok("T1 result ok", r.ok === true);
  ok("T1 pricing +1", c.pricing === 1);
  ok("T1 chief +1", c.chief === 1);
}

// T2 — material Accept mock: persist success → dual bump
{
  const c = makeCounters();
  const persistOk = true;
  const r = notifyIkPricingAcceptedIfPersistOk(persistOk, c.input);
  ok("T2 persist ok path", r.ok === true);
  ok("T2 pricing +1", c.pricing === 1);
  ok("T2 chief +1", c.chief === 1);
  ok("T2 recompute triggered (both tokens)", c.pricing === 1 && c.chief === 1);
}

// T3 — persist FAIL → ZERO bump
{
  const c = makeCounters();
  const r = notifyIkPricingAcceptedIfPersistOk(false, c.input);
  ok("T3 persist fail result", r.ok === false && r.reason === "PERSIST_FAILED");
  ok("T3 pricing ZERO", c.pricing === 0);
  ok("T3 chief ZERO", c.chief === 0);
}

// T4 — double success = +2 each (no cache coalescing required)
{
  const c = makeCounters();
  notifyIkPricingAcceptedIfPersistOk(true, c.input);
  notifyIkPricingAcceptedIfPersistOk(true, c.input);
  ok("T4 pricing +2", c.pricing === 2);
  ok("T4 chief +2", c.chief === 2);
}

console.log(`\nW0 recompute: ${passed} PASS · ${failed} FAIL`);
if (failed > 0) process.exit(1);
