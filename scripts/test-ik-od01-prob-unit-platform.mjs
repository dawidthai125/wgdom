#!/usr/bin/env node
/**
 * OD-01 M2 — platform `prob` as first-class WgdomCostUnit.
 * npx vite-node scripts/test-ik-od01-prob-unit-platform.mjs
 */
import { normalizeWgdomCostUnit } from "../src/lib/wgdom-cost-catalog.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import {
  detectUnitConversionReview,
  resolveProvisionalMapperLinePatch,
} from "../src/lib/intelligent-estimator/ik-provisional-estimation.ts";
import { buildKnrWcIdentityProposals } from "../src/lib/intelligent-estimator/knr-wc-identity-bridge.ts";
import { preserveOfferBoqLineIfTrusted } from "../src/lib/intelligent-estimator/ik-identity-trusted-preserve.ts";
import { buildWorkRateIdentityKey } from "../src/lib/work-catalog/work-rate-types.ts";
import { lookupWorkRate } from "../src/lib/work-catalog/work-rate-lookup.ts";
import { forceIkProvisionalEstimationForTests } from "../src/lib/intelligent-estimator/ik-entry-flag.ts";

let pass = 0;
let fail = 0;
function assert(name, cond, extra = "") {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra);
  }
}

function isValidUnit(value) {
  return normalizeWgdomCostUnit(value) != null;
}

// T-C2-05a
assert(
  "T-C2-05a normalize prob",
  normalizeWgdomCostUnit("prob") === "prob",
  normalizeWgdomCostUnit("prob"),
);

// T-C2-05b
assert(
  "T-C2-05b normalize prób.",
  normalizeWgdomCostUnit("prób.") === "prob",
  normalizeWgdomCostUnit("prób."),
);

// T-C2-05c
assert(
  "T-C2-05c prob != szt",
  normalizeWgdomCostUnit("prob") !== "szt",
);

// T-C2-05d
assert("T-C2-05d isValidUnit prob", isValidUnit("prob") === true);

// T-C2-05e
{
  const now = new Date().toISOString();
  const store = normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: now,
    catalogs: {
      wroclaw: {
        region: "wroclaw",
        updatedAt: now,
        works: [
          {
            id: "test-prob-draft",
            tradeId: "ELEKTRYKA",
            namePl: "Test próba",
            unit: "prob",
            companyPricePln: 0,
            updatedAt: now,
          },
        ],
      },
      dolnyslask: { region: "dolnyslask", updatedAt: now, works: [] },
    },
  });
  const work = store.catalogs.wroclaw.works.find((w) => w.id === "test-prob-draft");
  assert("T-C2-05e CatalogWork draft valid", work != null && work.unit === "prob", work?.unit);
}

// T-C2-05f
assert(
  "T-C2-05f detectUnitConversionReview prob,prob",
  detectUnitConversionReview("prob", "prob") === false,
);

// T-C2-05g — trusted identity preserves unit prob
{
  const trustedLine = {
    lineId: "obl_test_prob",
    description: "Sprawdzenie RCD — pierwsza próba",
    unit: "prob",
    qty: 12,
    catalogWorkId: "knnr-wc-knnr-5-1305-01-prob",
    matchMethod: "exact_knr",
    matchConfidence: "high",
    isNoise: false,
  };
  const preserved = preserveOfferBoqLineIfTrusted(trustedLine);
  assert("T-C2-05g trusted unit prob", preserved?.unit === "prob", preserved?.unit);
}

// T-C2-05h — qty unchanged by provisional mapper guard
{
  forceIkProvisionalEstimationForTests(true);
  const line = {
    lineId: "obl_test_prob_qty",
    description: "Sprawdzenie samoczynnego wyłączania — pierwsza próba",
    unit: "prob",
    qty: 7,
    catalogWorkId: "knnr-wc-knnr-5-1305-01-prob",
    matchMethod: "exact_knr",
    matchConfidence: "high",
    isNoise: false,
  };
  const patch = resolveProvisionalMapperLinePatch(line, { status: "NO_IDENTITY", workId: null }, []);
  assert(
    "T-C2-05h no legacy-elektryka bind",
    patch?.catalogWorkId !== "legacy-elektryka-szt",
    patch?.catalogWorkId,
  );
  assert("T-C2-05h qty unchanged", line.qty === 7, String(line.qty));
  forceIkProvisionalEstimationForTests(null);
}

// Bridge unitStatus via proposal batch
{
  const batch = buildKnrWcIdentityProposals({
    tenderId: "od01-test",
    keys: [
      {
        normalizedKey: "KNNR|5|1305-01",
        family: "KNNR",
        catalogId: "5",
        tableCode: "1305-01",
        unitRaw: "prob",
      },
    ],
    works: [],
    featureEnabled: true,
  });
  const p = batch.proposals[0];
  assert(
    "bridge unitStatus OK",
    p?.unitStatus === "OK" && p?.proposedUnit === "prob",
    JSON.stringify(p),
  );
}

// OUR RATE strict identity workId|prob != workId|szt
{
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
    clear: () => mem.clear(),
  };
  const now = new Date().toISOString();
  const store = normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: now,
    catalogs: {
      wroclaw: {
        region: "wroclaw",
        updatedAt: now,
        works: [
          {
            id: "legacy-elektryka-szt",
            tradeId: "ELEKTRYKA",
            namePl: "Legacy elektryka szt",
            unit: "szt",
            companyPricePln: 187,
            updatedAt: now,
            ourWorkRate: {
              workId: "legacy-elektryka-szt",
              unit: "szt",
              ourRatePln: 187,
              sourceType: "OWNER",
              regionScope: "WROCLAW",
              observedAt: now,
              updatedAt: now,
            },
          },
        ],
      },
      dolnyslask: { region: "dolnyslask", updatedAt: now, works: [] },
    },
  });
  const keyProb = buildWorkRateIdentityKey("legacy-elektryka-szt", "prob");
  const keySzt = buildWorkRateIdentityKey("legacy-elektryka-szt", "szt");
  assert("identity keys differ", keyProb !== keySzt);
  const hitSzt = lookupWorkRate(store, "legacy-elektryka-szt", "szt", Date.now());
  const hitProb = lookupWorkRate(store, "legacy-elektryka-szt", "prob", Date.now());
  assert("strict lookup szt", hitSzt.status !== "MISSING");
  assert("strict lookup prob miss", hitProb.status === "MISSING");
}

forceIkProvisionalEstimationForTests(null);

console.log(`\n=== OD-01 M2: ${pass} PASS / ${fail} FAIL ===\n`);
process.exit(fail > 0 ? 1 : 0);
