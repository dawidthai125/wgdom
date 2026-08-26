#!/usr/bin/env node
/**
 * C2 batch M5→M10 — OUR RATE · MOPS rebind · VERIFIED · economics.
 * npx vite-node scripts/test-ik-c2-batch-m5-m10.mjs
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
Object.assign(process.env, loadEnv("", process.cwd(), ""));

import { runIkDocumentExpert } from "../src/lib/intelligent-estimator/ik-document-expert.ts";
import { runIkKnrExpert } from "../src/lib/intelligent-estimator/ik-knr-expert.ts";
import { applyOwnerKnrMapping } from "../src/lib/intelligent-estimator/ik-knr-owner-mapping.ts";
import { promoteSliceDHitToTrustedTuple } from "../src/lib/intelligent-estimator/orchestra/ik-knr-wc-p4-trust-seam.ts";
import { runIkIdentityPhase } from "../src/lib/intelligent-estimator/orchestra/ik-identity-phase.ts";
import { runIkP7PositionCostBid } from "../src/lib/intelligent-estimator/ik-p7-position-cost-bid.ts";
import { synchronizePackageOfferBoqsFromMasterLines } from "../src/lib/intelligent-estimator/boq-offer-master-sync.ts";
import {
  C2_KNR_WC_1305_01_WORK_ID,
  C2_KNR_WC_1305_02_WORK_ID,
  C2_MOPS_LINE_TABLE_CODE,
  ensureC2KnrWcProbOwnerCatalogWorks,
} from "../src/lib/intelligent-estimator/c2-knr-wc-prob-owner-create.ts";
import {
  C2_OWNER_OUR_RATE_PLN,
  applyC2KnrWcProbOurRateOwnerSeed,
  assertC2OurRateLookupCurrent,
  workHasExpectedC2OurRate,
} from "../src/lib/intelligent-estimator/c2-knr-wc-prob-our-rate-ops.ts";
import {
  forceIkEntryEnabledForTests,
  forceIkF5E2eForTests,
  forceIkProvisionalEstimationForTests,
} from "../src/lib/intelligent-estimator/ik-entry-flag.ts";
import { forceKnrWcIdentityBridgeRuntimeForTests } from "../src/lib/intelligent-estimator/knr-wc-identity-bridge-feature.ts";
import { PROVISIONAL_REVIEW_TAG_UNIT } from "../src/lib/intelligent-estimator/ik-provisional-estimation.ts";
import { computeShadowPositionCostsForOfferBoq } from "../src/lib/tender-position-cost/boq-shadow-adapter.ts";
import { resolveLaborInputFromOurWorkRate } from "../src/lib/tender-position-cost/our-rate-labor-adapter.ts";
import { lookupWorkRate } from "../src/lib/work-catalog/work-rate-lookup.ts";
import { getWorkByIdFromStore, listActiveWorksForRegion } from "../src/lib/work-catalog/catalog-work-utils.ts";
import {
  loadWorkCatalogStoreLocal,
  normalizeWorkCatalogStore,
  saveWorkCatalogStoreLocal,
  WORK_CATALOG_STORAGE_KEY,
} from "../src/lib/work-catalog/work-catalog-store.ts";
import { defaultWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-migrate.ts";
import { saveWorkCatalogRouted } from "../src/lib/catalog-write-router.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_ITEM = join(ROOT, ".tmp/ops-mops-09-tender-item.json");
const FIXTURE_PKG = join(ROOT, ".tmp/ops-mops-09-item-pkg.json");
const NOW = "2026-08-26T20:00:00.000Z";
const NOW_MS = Date.parse(NOW);
const C2_LINE_IDS = Object.keys(C2_MOPS_LINE_TABLE_CODE);
const PROVISIONAL_BASELINE_PLN = 11_220;

const C2_KNR_BY_LINE = {
  obl_443daba: "KNNR|5|1305-01",
  obl_98c5edeb: "KNNR|5|1305-01",
  obl_8c5285d0: "KNNR|5|1305-01",
  obl_9cfa9270: "KNNR|5|1305-02",
  obl_255b64ed: "KNNR|5|1305-02",
  obl_1816d62a: "KNNR|5|1305-02",
};

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

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(String(k), String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

let cloudSnapshot = null;
globalThis.fetch = async (url, init) => {
  const urlStr = String(url);
  if (urlStr.includes("batch-get")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    const keys = Array.isArray(body.keys) ? body.keys : [];
    return new Response(
      JSON.stringify({
        values: keys.map((key) => (key === WORK_CATALOG_STORAGE_KEY ? cloudSnapshot : null)),
      }),
      { status: 200 },
    );
  }
  if (urlStr.includes("batch-set")) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

function workSnapshot(store, workId) {
  const w = getWorkByIdFromStore(store, workId, store.activeRegion);
  if (!w) return null;
  return JSON.stringify({
    id: w.id,
    unit: w.unit,
    companyPricePln: w.companyPricePln,
    ourWorkRate: w.ourWorkRate ?? null,
    marginPct: w.commercialPricing?.marginPct ?? null,
  });
}

async function loadProdCatalogBaseline() {
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!anon || anon.startsWith("mock-")) {
    cloudSnapshot = defaultWorkCatalogStore();
    saveWorkCatalogStoreLocal(cloudSnapshot);
    return;
  }
  const edge = `https://${process.env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys"}.supabase.co/functions/v1/make-server-0afb8820`;
  const res = await fetch(`${edge}/batch-get`, {
    method: "POST",
    headers: { Authorization: `Bearer ${anon}`, apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ keys: ["kw-wgdom-work-catalog"] }),
  });
  const j = await res.json();
  const raw = Array.isArray(j.values) ? j.values[0] : j.values?.["kw-wgdom-work-catalog"];
  cloudSnapshot = normalizeWorkCatalogStore(typeof raw === "string" ? JSON.parse(raw) : raw);
  storage.clear();
  saveWorkCatalogStoreLocal(cloudSnapshot);
}

function runC2Pipeline(store, item, pkg) {
  forceIkEntryEnabledForTests(true);
  forceIkF5E2eForTests("ON");
  forceIkProvisionalEstimationForTests(true);
  const works = listActiveWorksForRegion(store, store.activeRegion);

  const report = runIkDocumentExpert({ item, package: pkg });
  const qtyBefore = new Map();
  for (const ref of report.masterBoqLines ?? []) {
    if (C2_LINE_IDS.includes(ref.line.lineId)) {
      qtyBefore.set(ref.line.lineId, ref.line.quantity);
    }
  }

  const knr = runIkKnrExpert({ tenderId: item.id, documentExpert: report, historicalIndex: null });
  const knrMapped = applyOwnerKnrMapping({ documentExpert: report, knr, works });
  const sliceDTrusted = promoteSliceDHitToTrustedTuple({ sliceD: knrMapped, enabled: true });
  const identityPhase = runIkIdentityPhase({
    structuralReport: report,
    sliceDExpert: sliceDTrusted.expert,
    item,
    package: pkg,
    works,
    nowMs: NOW_MS,
  });

  const lineById = new Map();
  for (const plan of identityPhase.context.persistPlans) {
    for (const line of plan.offerBoq.lines ?? []) {
      lineById.set(line.lineId, line);
    }
  }

  const pkgWithBoq = {
    ...pkg,
    dwellings: pkg.dwellings.map((d) => {
      const plan = identityPhase.context.persistPlans.find((p) => p.dwellingId === d.dwellingId);
      if (!plan) return d;
      return { ...d, offerBoq: plan.offerBoq };
    }),
  };
  const expert = identityPhase.postIdentityExpert;
  const p7 = runIkP7PositionCostBid({ item, expert, package: pkgWithBoq, store, nowMs: NOW_MS });
  const syncedPkg = synchronizePackageOfferBoqsFromMasterLines(pkgWithBoq, expert.masterBoqLines ?? []);

  const shadowByLine = new Map();
  for (const d of syncedPkg.dwellings) {
    if (!d.offerBoq?.lines?.length) continue;
    const shadow = computeShadowPositionCostsForOfferBoq({
      doc: d.offerBoq,
      store,
      nowMs: NOW_MS,
      tenderId: item.id,
      dwellingId: d.dwellingId,
      boqDependencyGraph:
        expert.boqDependencyGraphsByDwelling?.[d.dwellingId] ?? expert.boqDependencyGraph ?? null,
      ensureOwnerQuestions: false,
    });
    for (const row of shadow.lines) {
      shadowByLine.set(row.lineId, row);
    }
  }

  return { qtyBefore, lineById, shadowByLine, identityPhase, p7, sliceDTrusted, knr };
}

async function main() {
  console.log("\n=== C2 BATCH M5→M10 ===\n");

  if (!existsSync(FIXTURE_ITEM) || !existsSync(FIXTURE_PKG)) {
    console.error("Missing MOPS fixtures");
    process.exit(1);
  }

  forceKnrWcIdentityBridgeRuntimeForTests(true);
  await loadProdCatalogBaseline();

  let store = loadWorkCatalogStoreLocal();
  const legacyBefore = workSnapshot(store, "legacy-elektryka-szt");
  const legacyLookupBefore = lookupWorkRate(store, "legacy-elektryka-szt", "szt", NOW_MS);
  const worksCountBefore = store.catalogs.wroclaw.works.length;

  const item = JSON.parse(readFileSync(FIXTURE_ITEM, "utf8"));
  const pkg = JSON.parse(readFileSync(FIXTURE_PKG, "utf8")).pkg;

  // Bootstrap M3 works if absent (harness only)
  const ensured = await ensureC2KnrWcProbOwnerCatalogWorks(store, { nowIso: NOW });
  store = ensured.store;
  saveWorkCatalogStoreLocal(store);

  // --- M5 OUR RATE ---
  const rateSeed = applyC2KnrWcProbOurRateOwnerSeed(store, NOW);
  store = rateSeed.store;
  const saveResult = await saveWorkCatalogRouted(store, {
    previousStore: loadWorkCatalogStoreLocal(),
    updatedAtIso: NOW,
  });
  assert("M5 save ok", saveResult.ok === true, JSON.stringify(saveResult));
  store = loadWorkCatalogStoreLocal();

  try {
    assertC2OurRateLookupCurrent(store, NOW_MS);
    assert("M5 lookup assert helper", true);
  } catch (e) {
    assert("M5 lookup assert helper", false, String(e));
  }

  for (const [tableCode, pln] of Object.entries(C2_OWNER_OUR_RATE_PLN)) {
    const workId =
      tableCode === "1305-01" ? C2_KNR_WC_1305_01_WORK_ID : C2_KNR_WC_1305_02_WORK_ID;
    const w = getWorkByIdFromStore(store, workId, store.activeRegion);
    assert(`M5 ourRate ${tableCode}`, workHasExpectedC2OurRate(w, pln), w?.ourWorkRate);
    const hit = lookupWorkRate(store, workId, "prob", NOW_MS);
    assert(`M5 lookup CURRENT ${tableCode}`, hit.status === "CURRENT" && hit.ourRatePln === pln);
    const missSzt = lookupWorkRate(store, workId, "szt", NOW_MS);
    assert(`M5 no szt alias ${tableCode}`, missSzt.status === "MISSING");
  }

  const rateReapply = applyC2KnrWcProbOurRateOwnerSeed(store, NOW);
  assert("M5 idempotent", rateReapply.changed === false);

  // --- M9 + M10 pipeline ---
  const pipeline = runC2Pipeline(store, item, pkg);
  const economicsRows = [];
  let subtotal01 = 0;
  let subtotal02 = 0;
  let qty01 = 0;
  let qty02 = 0;

  for (const lineId of C2_LINE_IDS) {
    const tableCode = C2_MOPS_LINE_TABLE_CODE[lineId];
    const expectedWorkId =
      tableCode === "1305-01" ? C2_KNR_WC_1305_01_WORK_ID : C2_KNR_WC_1305_02_WORK_ID;
    const expectedKnr = C2_KNR_BY_LINE[lineId];
    const basePln = C2_OWNER_OUR_RATE_PLN[tableCode];

    const line = pipeline.lineById.get(lineId);
    const shadow = pipeline.shadowByLine.get(lineId);
    const qtyBefore = pipeline.qtyBefore.get(lineId);
    const qtyAfter = line?.quantity;

    const knrRow = pipeline.knr.lines?.find((r) => r.lineId === lineId);
    const knrKey = knrRow?.catalogBasis?.normalizedKey;

    assert(`M9 ${lineId} mapped workId`, line?.catalogWorkId === expectedWorkId, line?.catalogWorkId);
    assert(`M9 ${lineId} exact KNR`, knrKey === expectedKnr, knrKey);
    assert(`M9 ${lineId} unit prob`, String(line?.unit ?? "").toLowerCase() === "prob");
    assert(`M9 ${lineId} qty unchanged`, qtyBefore === qtyAfter, `${qtyBefore}→${qtyAfter}`);
    assert(`M9 ${lineId} not legacy`, line?.catalogWorkId !== "legacy-elektryka-szt");
    assert(
      `M9 ${lineId} no DESCRIPTION_BIND`,
      !(line?.aiRationale ?? []).some((r) => String(r).includes("IK_PROVISIONAL_DESCRIPTION_BIND")),
    );

    const labor = resolveLaborInputFromOurWorkRate(store, expectedWorkId, "prob", NOW_MS);
    assert(`M10 ${lineId} OUR RATE CURRENT`, labor.status === "CURRENT" && labor.ourRatePln === basePln);
    assert(`M10 ${lineId} margin present`, labor.marginPct != null, String(labor.marginPct));
    assert(`M10 ${lineId} SELL from OUR RATE`, labor.sellPricePln === basePln, String(labor.sellPricePln));

    const att = shadow?.provisionalAttestation;
    assert(`M10 ${lineId} VERIFIED`, att?.pricingStatus === "VERIFIED", att?.pricingStatus);
    assert(
      `M10 ${lineId} no UNIT_CONVERSION_REVIEW`,
      !(att?.reviewTags ?? []).includes(PROVISIONAL_REVIEW_TAG_UNIT),
    );
    assert(`M10 ${lineId} positionComplete`, shadow?.positionComplete === true, String(shadow?.positionComplete));

    const lineTotal = shadow?.position?.totalPositionCostPln ?? 0;
    if (tableCode === "1305-01") {
      subtotal01 += lineTotal;
      qty01 += qtyAfter ?? 0;
    } else {
      subtotal02 += lineTotal;
      qty02 += qtyAfter ?? 0;
    }

    economicsRows.push({
      lineId,
      knr: expectedKnr,
      workId: expectedWorkId,
      unit: "prob",
      qty: qtyAfter,
      ourRate: basePln,
      margin: labor.marginPct,
      sell: labor.sellPricePln,
      total: lineTotal,
      status: att?.pricingStatus ?? "GAP",
    });
  }

  const c2Total = subtotal01 + subtotal02;
  const delta = c2Total - PROVISIONAL_BASELINE_PLN;

  console.log("\n--- C2 ECONOMICS TABLE ---");
  console.log(
    "| lineId | KNR | workId | unit | qty | OUR RATE | margin | SELL | total | status |",
  );
  for (const r of economicsRows) {
    console.log(
      `| ${r.lineId} | ${r.knr} | ${r.workId} | ${r.unit} | ${r.qty} | ${r.ourRate} | ${r.margin}% | ${r.sell} | ${r.total?.toFixed(2)} | ${r.status} |`,
    );
  }
  console.log(`\n1305-01 qty=${qty01} subtotal=${subtotal01.toFixed(2)} PLN`);
  console.log(`1305-02 qty=${qty02} subtotal=${subtotal02.toFixed(2)} PLN`);
  console.log(`C2 TOTAL=${c2Total.toFixed(2)} PLN`);
  console.log(`Delta vs provisional ${PROVISIONAL_BASELINE_PLN} PLN = ${delta.toFixed(2)} PLN`);

  assert("economics C2 total > 0", c2Total > 0);
  assert("economics not forced to 11220", Math.abs(c2Total - PROVISIONAL_BASELINE_PLN) > 1);

  // Collateral
  const legacyAfter = workSnapshot(store, "legacy-elektryka-szt");
  assert("collateral legacy unchanged", legacyBefore === legacyAfter, legacyAfter);
  const legacyLookupAfter = lookupWorkRate(store, "legacy-elektryka-szt", "szt", NOW_MS);
  assert(
    "collateral legacy szt lookup unchanged",
    legacyLookupBefore.status === legacyLookupAfter.status &&
      legacyLookupBefore.ourRatePln === legacyLookupAfter.ourRatePln,
  );
  assert(
    "collateral only +2 works max",
    store.catalogs.wroclaw.works.length <= worksCountBefore + 2,
    String(store.catalogs.wroclaw.works.length),
  );

  forceIkProvisionalEstimationForTests(null);
  forceKnrWcIdentityBridgeRuntimeForTests(null);

  console.log(`\n=== RESULT: ${pass} PASS / ${fail} FAIL ===`);
  console.log(fail === 0 ? "\nFINAL GATE: C2_M5_M10_COMPLETE_VERIFIED\n" : "\nFINAL GATE: C2_M5_M10_BLOCKED\n");
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
