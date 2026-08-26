#!/usr/bin/env node
/**
 * C2 batch M3–M8 — CREATE · A1 · OWNER_KNR_MAPPINGS · trusted precedence.
 * npx vite-node scripts/test-ik-c2-batch-m3-m8.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID = "mock-c2-batch";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-c2-batch";

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
Object.assign(process.env, loadEnv("", process.cwd(), ""));

import { runIkDocumentExpert } from "../src/lib/intelligent-estimator/ik-document-expert.ts";
import { runIkKnrExpert } from "../src/lib/intelligent-estimator/ik-knr-expert.ts";
import { applyOwnerKnrMapping, OWNER_KNR_MAPPINGS } from "../src/lib/intelligent-estimator/ik-knr-owner-mapping.ts";
import { promoteSliceDHitToTrustedTuple } from "../src/lib/intelligent-estimator/orchestra/ik-knr-wc-p4-trust-seam.ts";
import { runIkIdentityPhase } from "../src/lib/intelligent-estimator/orchestra/ik-identity-phase.ts";
import {
  C2_KNR_WC_1305_01_WORK_ID,
  C2_KNR_WC_1305_02_WORK_ID,
  C2_MOPS_LINE_TABLE_CODE,
  buildC2KnrWcProbCatalogWork,
  buildC2KnrWcProbProposal,
  ensureC2KnrWcProbOwnerCatalogWorks,
  executeC2KnrWcProbOwnerCreate,
} from "../src/lib/intelligent-estimator/c2-knr-wc-prob-owner-create.ts";
import {
  getOwnerClassificationPlane,
  ESTIMATOR_OWNER_CLASSIFICATION_MAP,
} from "../src/lib/intelligent-estimator/owner-classification-map.ts";
import {
  forceIkEntryEnabledForTests,
  forceIkF5E2eForTests,
  forceIkProvisionalEstimationForTests,
} from "../src/lib/intelligent-estimator/ik-entry-flag.ts";
import { forceKnrWcIdentityBridgeRuntimeForTests } from "../src/lib/intelligent-estimator/knr-wc-identity-bridge-feature.ts";
import {
  hasProvisionalSeamRationale,
  resolveProvisionalMapperLinePatch,
} from "../src/lib/intelligent-estimator/ik-provisional-estimation.ts";
import { lookupWorkRate } from "../src/lib/work-catalog/work-rate-lookup.ts";
import { getWorkByIdFromStore } from "../src/lib/work-catalog/catalog-work-utils.ts";
import { listActiveWorksForRegion } from "../src/lib/work-catalog/catalog-work-utils.ts";
import {
  loadWorkCatalogStoreLocal,
  normalizeWorkCatalogStore,
  saveWorkCatalogStoreLocal,
  WORK_CATALOG_STORAGE_KEY,
} from "../src/lib/work-catalog/work-catalog-store.ts";
import { defaultWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-migrate.ts";
import { catalogWorkExistsInStore } from "../src/lib/work-catalog/work-catalog-insert.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_ITEM = join(ROOT, ".tmp/ops-mops-09-tender-item.json");
const FIXTURE_PKG = join(ROOT, ".tmp/ops-mops-09-item-pkg.json");
const NOW = "2026-08-26T12:00:00.000Z";

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

function catalogFingerprint(store) {
  return createHash("sha256").update(JSON.stringify(store)).digest("hex").slice(0, 16);
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

function legacyElektrykaSnapshot(store) {
  const w = getWorkByIdFromStore(store, "legacy-elektryka-szt", store.activeRegion);
  if (!w) return null;
  return JSON.stringify({
    id: w.id,
    unit: w.unit,
    companyPricePln: w.companyPricePln,
    ourWorkRate: w.ourWorkRate ?? null,
  });
}

async function main() {
  console.log("\n=== C2 BATCH M3–M8 ===\n");

  forceKnrWcIdentityBridgeRuntimeForTests(true);
  forceIkEntryEnabledForTests(true);

  // --- M3 proposals gate ---
  const p01 = buildC2KnrWcProbProposal("1305-01");
  const p02 = buildC2KnrWcProbProposal("1305-02");
  assert("M3 proposal 1305-01 unit OK", p01.unitStatus === "OK" && p01.proposedUnit === "prob");
  assert("M3 proposal 1305-02 unit OK", p02.unitStatus === "OK" && p02.proposedUnit === "prob");

  await loadProdCatalogBaseline();
  const beforeFp = catalogFingerprint(loadWorkCatalogStoreLocal());
  const legacyBefore = legacyElektrykaSnapshot(loadWorkCatalogStoreLocal());

  // --- M3 CREATE both works ---
  let store = loadWorkCatalogStoreLocal();
  const r01 = await executeC2KnrWcProbOwnerCreate({
    tableCode: "1305-01",
    store,
    nowIso: NOW,
    runtimeP3Enabled: true,
  });
  assert("M3 CREATE 1305-01 saved", r01.ok && r01.saved === true, JSON.stringify(r01));
  store = loadWorkCatalogStoreLocal();

  const r02 = await executeC2KnrWcProbOwnerCreate({
    tableCode: "1305-02",
    store,
    nowIso: NOW,
    runtimeP3Enabled: true,
  });
  assert("M3 CREATE 1305-02 saved", r02.ok && r02.saved === true, JSON.stringify(r02));
  store = loadWorkCatalogStoreLocal();

  assert("M3 work 01 exists", catalogWorkExistsInStore(store, C2_KNR_WC_1305_01_WORK_ID));
  assert("M3 work 02 exists", catalogWorkExistsInStore(store, C2_KNR_WC_1305_02_WORK_ID));

  const w01 = getWorkByIdFromStore(store, C2_KNR_WC_1305_01_WORK_ID, store.activeRegion);
  const w02 = getWorkByIdFromStore(store, C2_KNR_WC_1305_02_WORK_ID, store.activeRegion);
  assert("M3 unit prob 01", w01?.unit === "prob", w01?.unit);
  assert("M3 unit prob 02", w02?.unit === "prob", w02?.unit);
  assert("M3 active 01", w01?.active === true);
  assert("M3 active 02", w02?.active === true);
  assert("M3 companyPrice 0 01", w01?.companyPricePln === 0);
  assert("M3 companyPrice 0 02", w02?.companyPricePln === 0);
  assert("M3 no OUR RATE 01", w01?.ourWorkRate == null);
  assert("M3 no OUR RATE 02", w02?.ourWorkRate == null);
  assert("M3 trade ELEKTRYKA 01", w01?.tradeId === "ELEKTRYKA");
  assert("M3 legacyCategory ELEKTRYKA 01", w01?.legacyCategoryId === "ELEKTRYKA");
  assert("M3 namePl 01", w01?.namePl?.includes("pierwsza próba"));
  assert("M3 namePl 02", w02?.namePl?.includes("następna próba"));

  const ensure = await ensureC2KnrWcProbOwnerCatalogWorks(store, { nowIso: NOW });
  assert("M3 ensure idempotent", ensure.created.length === 0);

  // --- M4 classification ---
  assert("M4 01 LABOR", getOwnerClassificationPlane(C2_KNR_WC_1305_01_WORK_ID) === "LABOR");
  assert("M4 02 LABOR", getOwnerClassificationPlane(C2_KNR_WC_1305_02_WORK_ID) === "LABOR");
  assert(
    "M4 map contains 01",
    ESTIMATOR_OWNER_CLASSIFICATION_MAP[C2_KNR_WC_1305_01_WORK_ID] === "LABOR",
  );
  assert(
    "M4 legacy-elektryka-szt still UNKNOWN",
    getOwnerClassificationPlane("legacy-elektryka-szt") === "UNKNOWN",
  );

  // --- M6 mappings ---
  const m01 = OWNER_KNR_MAPPINGS.find((r) => r.normalizedKey === "KNNR|5|1305-01");
  const m02 = OWNER_KNR_MAPPINGS.find((r) => r.normalizedKey === "KNNR|5|1305-02");
  assert("M6 mapping 01 workId", m01?.workId === C2_KNR_WC_1305_01_WORK_ID);
  assert("M6 mapping 02 workId", m02?.workId === C2_KNR_WC_1305_02_WORK_ID);
  assert("M6 mapping 01 unit prob", m01?.catalogUnit === "prob");
  assert("M6 wykwity mapping preserved", OWNER_KNR_MAPPINGS.some((r) => r.mappingId === "owner-knr-wykwity-1202-07"));

  // --- M8 trusted precedence unit ---
  const trustedLine = {
    lineId: "obl_443daba",
    description: "Sprawdzenie samoczynnego wyłączania — pierwsza próba",
    unit: "prob",
    qty: 12,
    catalogWorkId: C2_KNR_WC_1305_01_WORK_ID,
    matchMethod: "exact_knr",
    matchConfidence: "high",
    isNoise: false,
  };
  forceIkProvisionalEstimationForTests(true);
  const patch = resolveProvisionalMapperLinePatch(
    trustedLine,
    { status: "NO_IDENTITY", workId: null },
    listActiveWorksForRegion(store, store.activeRegion),
  );
  assert("M8 no provisional patch trusted C2", patch === null);
  assert(
    "M8 no DESCRIPTION_BIND rationale",
    !hasProvisionalSeamRationale(trustedLine.aiRationale ?? []),
  );

  // --- C2 six-line fixture (no M9 persist) ---
  if (existsSync(FIXTURE_ITEM) && existsSync(FIXTURE_PKG)) {
    const item = JSON.parse(readFileSync(FIXTURE_ITEM, "utf8"));
    const pkg = JSON.parse(readFileSync(FIXTURE_PKG, "utf8")).pkg;
    forceIkF5E2eForTests("ON");
    forceIkProvisionalEstimationForTests(true);

    const report = runIkDocumentExpert({ item, package: pkg });
    const knr = runIkKnrExpert({ tenderId: item.id, documentExpert: report, historicalIndex: null });
    const knrMapped = applyOwnerKnrMapping({
      documentExpert: report,
      knr,
      works: listActiveWorksForRegion(store, store.activeRegion),
    });
    const sliceDTrusted = promoteSliceDHitToTrustedTuple({ sliceD: knrMapped, enabled: true });
    const identityPhase = runIkIdentityPhase({
      structuralReport: report,
      sliceDExpert: sliceDTrusted.expert,
      item,
      package: pkg,
      works: listActiveWorksForRegion(store, store.activeRegion),
      nowMs: Date.parse(NOW),
    });

    const lineById = new Map();
    for (const plan of identityPhase.context.persistPlans) {
      for (const line of plan.offerBoq.lines ?? []) {
        lineById.set(line.lineId, line);
      }
    }

    for (const [lineId, tableCode] of Object.entries(C2_MOPS_LINE_TABLE_CODE)) {
      const line = lineById.get(lineId);
      const expectedWorkId =
        tableCode === "1305-01" ? C2_KNR_WC_1305_01_WORK_ID : C2_KNR_WC_1305_02_WORK_ID;
      assert(`C2 line ${lineId} mapped`, line?.catalogWorkId === expectedWorkId, line?.catalogWorkId);
      assert(`C2 line ${lineId} unit prob`, String(line.unit ?? "").toLowerCase() === "prob");
      assert(`C2 line ${lineId} not legacy`, line?.catalogWorkId !== "legacy-elektryka-szt");
      assert(
        `C2 line ${lineId} no DESCRIPTION_BIND`,
        !(line?.aiRationale ?? []).some((r) => String(r).includes("IK_PROVISIONAL_DESCRIPTION_BIND")),
      );
      if (line) {
        assert(
          `C2 line ${lineId} qty preserved`,
          typeof line.quantity === "number" && line.quantity > 0,
          String(line.quantity),
        );
      }
    }

    const c2Applied = sliceDTrusted.appliedLineIds.filter((id) => id in C2_MOPS_LINE_TABLE_CODE);
    assert("C2 owner mapping applied >= 6", c2Applied.length >= 6, String(c2Applied.length));

    for (const workId of [C2_KNR_WC_1305_01_WORK_ID, C2_KNR_WC_1305_02_WORK_ID]) {
      const rate = lookupWorkRate(store, workId, "prob", Date.parse(NOW));
      assert(`economic OUR RATE MISSING ${workId}`, rate.status === "MISSING");
    }
  } else {
    console.log("SKIP C2 fixture pipeline — missing .tmp/ops-mops-09-*");
  }

  // --- collateral ---
  const afterStore = loadWorkCatalogStoreLocal();
  const legacyAfter = legacyElektrykaSnapshot(afterStore);
  assert("collateral legacy-elektryka-szt unchanged", legacyBefore === legacyAfter, legacyAfter);
  assert(
    "collateral only +2 works",
    afterStore.catalogs.wroclaw.works.length === cloudSnapshot.catalogs.wroclaw.works.length + 2,
  );

  if (legacyBefore) {
    const rcd = getWorkByIdFromStore(afterStore, "legacy-elektryka-szt", afterStore.activeRegion);
    assert("collateral legacy still exists", rcd?.id === "legacy-elektryka-szt");
  } else {
    console.log("SKIP collateral legacy exists — baseline catalog has no legacy-elektryka-szt");
  }

  forceIkProvisionalEstimationForTests(null);
  forceKnrWcIdentityBridgeRuntimeForTests(null);

  console.log(`\n=== RESULT: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
