#!/usr/bin/env node
/**
 * IK provisional estimation — MOPS OPS-SMOKE-09 regression (minimal).
 *
 * npx vite-node scripts/test-ik-provisional-mops-smoke.mjs
 *
 * Requires: .tmp/ops-mops-09-tender-item.json · .tmp/ops-mops-09-item-pkg.json
 * Network: batch-get kw-wgdom-work-catalog (read-only).
 */
import { loadEnv } from "vite";
Object.assign(process.env, loadEnv("", process.cwd(), ""));
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runIkDocumentExpert } from "../src/lib/intelligent-estimator/ik-document-expert.ts";
import { runIkKnrExpert } from "../src/lib/intelligent-estimator/ik-knr-expert.ts";
import { applyOwnerKnrMapping } from "../src/lib/intelligent-estimator/ik-knr-owner-mapping.ts";
import { promoteSliceDHitToTrustedTuple } from "../src/lib/intelligent-estimator/orchestra/ik-knr-wc-p4-trust-seam.ts";
import { runIkIdentityPhase } from "../src/lib/intelligent-estimator/orchestra/ik-identity-phase.ts";
import { runIkP7PositionCostBid } from "../src/lib/intelligent-estimator/ik-p7-position-cost-bid.ts";
import { synchronizePackageOfferBoqsFromMasterLines } from "../src/lib/intelligent-estimator/boq-offer-master-sync.ts";
import { computeShadowPositionCostsForOfferBoq } from "../src/lib/tender-position-cost/boq-shadow-adapter.ts";
import {
  forceIkEntryEnabledForTests,
  forceIkF5E2eForTests,
  forceIkProvisionalEstimationForTests,
} from "../src/lib/intelligent-estimator/ik-entry-flag.ts";
import {
  isIkProvisionalEstimationEnabled,
  PROVISIONAL_REVIEW_TAG_UNIT,
  tryResolveProvisionalLaborInput,
} from "../src/lib/intelligent-estimator/ik-provisional-estimation.ts";
import {
  loadWorkCatalogStoreLocal,
  normalizeWorkCatalogStore,
  saveWorkCatalogStoreLocal,
} from "../src/lib/work-catalog/work-catalog-store.ts";
import { listActiveWorksForRegion } from "../src/lib/work-catalog/catalog-work-utils.ts";
import { resolveLaborInputFromOurWorkRate } from "../src/lib/tender-position-cost/our-rate-labor-adapter.ts";
import { normalizeWgdomCostUnit } from "../src/lib/wgdom-cost-catalog.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_ITEM = join(ROOT, ".tmp/ops-mops-09-tender-item.json");
const FIXTURE_PKG = join(ROOT, ".tmp/ops-mops-09-item-pkg.json");

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

function catalogFingerprint(store) {
  return createHash("sha256")
    .update(JSON.stringify(store))
    .digest("hex")
    .slice(0, 16);
}

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => mem.get(k) ?? null,
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
};

function unwrap(r) {
  if (!r) return null;
  if (typeof r === "string") {
    try {
      return JSON.parse(r);
    } catch {
      return r;
    }
  }
  return r;
}

async function loadCatalogReadOnly() {
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!anon) throw new Error("VITE_SUPABASE_ANON_KEY missing");
  const edge = `https://${process.env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys"}.supabase.co/functions/v1/make-server-0afb8820`;
  const res = await fetch(`${edge}/batch-get`, {
    method: "POST",
    headers: { Authorization: `Bearer ${anon}`, apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ keys: ["kw-wgdom-work-catalog"] }),
  });
  const j = await res.json();
  const raw = Array.isArray(j.values) ? j.values[0] : j.values?.["kw-wgdom-work-catalog"];
  mem.clear();
  saveWorkCatalogStoreLocal(normalizeWorkCatalogStore(unwrap(raw)));
}

function runMopsPipeline({ provisionalOn, store, works, item, pkg, nowMs }) {
  forceIkEntryEnabledForTests(true);
  forceIkF5E2eForTests("ON");
  forceIkProvisionalEstimationForTests(provisionalOn ? true : false);

  const report = runIkDocumentExpert({ item, package: pkg });
  const knr = runIkKnrExpert({ tenderId: item.id, documentExpert: report, historicalIndex: null });
  const knrMapped = applyOwnerKnrMapping({ documentExpert: report, knr });
  const sliceDTrusted = promoteSliceDHitToTrustedTuple({ sliceD: knrMapped, enabled: true });
  const identityPhase = runIkIdentityPhase({
    structuralReport: report,
    sliceDExpert: sliceDTrusted.expert,
    item,
    package: pkg,
    works,
    nowMs,
  });
  const expert = identityPhase.postIdentityExpert;
  const pkgWithBoq = {
    ...pkg,
    dwellings: pkg.dwellings.map((d) => {
      const plan = identityPhase.context.persistPlans.find((p) => p.dwellingId === d.dwellingId);
      if (!plan) return d;
      return { ...d, offerBoq: plan.offerBoq };
    }),
  };
  const p7 = runIkP7PositionCostBid({ item, expert, package: pkgWithBoq, store, nowMs });
  const syncedPkg = synchronizePackageOfferBoqsFromMasterLines(pkgWithBoq, expert.masterBoqLines ?? []);
  const shadowLines = [];
  for (const d of syncedPkg.dwellings) {
    if (!d.offerBoq?.lines?.length) continue;
    const shadow = computeShadowPositionCostsForOfferBoq({
      doc: d.offerBoq,
      store,
      nowMs,
      tenderId: item.id,
      dwellingId: d.dwellingId,
      boqDependencyGraph:
        expert.boqDependencyGraphsByDwelling?.[d.dwellingId] ?? expert.boqDependencyGraph ?? null,
      ensureOwnerQuestions: false,
    });
    shadowLines.push(...shadow.lines);
  }
  return { identityPhase, p7, shadowLines, expert };
}

async function main() {
  console.log("\n=== IK PROVISIONAL MOPS OPS-SMOKE-09 ===\n");

  if (!existsSync(FIXTURE_ITEM) || !existsSync(FIXTURE_PKG)) {
    console.error("Missing MOPS fixtures in .tmp/ — copy ops-mops-09-* fixtures first.");
    process.exit(1);
  }

  await loadCatalogReadOnly();
  const store = loadWorkCatalogStoreLocal();
  const catalogBefore = catalogFingerprint(store);
  const works = listActiveWorksForRegion(store, store.activeRegion);
  const item = JSON.parse(readFileSync(FIXTURE_ITEM, "utf8"));
  const pkg = JSON.parse(readFileSync(FIXTURE_PKG, "utf8")).pkg;
  const nowMs = Date.now();

  // OFF — no provisional behavior
  forceIkProvisionalEstimationForTests(false);
  assert("OFF flag disabled", isIkProvisionalEstimationEnabled() === false);
  const offSample = runMopsPipeline({ provisionalOn: false, store, works, item, pkg, nowMs });
  assert(
    "OFF no provisional binding",
    offSample.identityPhase.context.provisionalBindingCount === 0,
    `got ${offSample.identityPhase.context.provisionalBindingCount}`,
  );
  const offProv = tryResolveProvisionalLaborInput(store, {
    workId: "cc-w2-oczyszczenie-podloza",
    unit: "m2",
    description: "test",
    nowMs,
    existingOurRate: resolveLaborInputFromOurWorkRate(store, "cc-w2-oczyszczenie-podloza", "m2", nowMs),
  });
  assert("OFF tryResolve returns null", offProv === null);
  assert("OFF P7 summary null", offSample.p7.provisionalPricingSummary === null);

  // ON — MOPS smoke
  const on = runMopsPipeline({ provisionalOn: true, store, works, item, pkg, nowMs });
  const { identityPhase, p7, shadowLines } = on;
  const prov = p7.provisionalPricingSummary;

  assert("ON flag enabled", isIkProvisionalEstimationEnabled() === true);
  assert("88 billable lines", p7.billableLineCount === 88, `got ${p7.billableLineCount}`);
  assert("gap 0", p7.gapLineCount === 0, `got ${p7.gapLineCount}`);
  assert("P7 ready", p7.status === "ready", `got ${p7.status}`);
  assert("bidOk", p7.bidOk === true);
  assert("bid > 0", (p7.recommendedBidPln ?? 0) > 0, String(p7.recommendedBidPln));
  assert(
    "bid ≈ 288100",
    Math.abs((p7.recommendedBidPln ?? 0) - 288_100) < 500,
    String(p7.recommendedBidPln),
  );
  assert(
    "direct ≈ 164913.32",
    Math.abs((p7.directPln ?? 0) - 164_913.32) < 50,
    String(p7.directPln),
  );

  const shadowDirect = shadowLines.reduce(
    (s, row) => s + (row.position?.totalPositionCostPln ?? 0),
    0,
  );
  assert(
    "direct = sum shadow lines",
    Math.abs(shadowDirect - (p7.directPln ?? 0)) < 1,
    `shadow=${shadowDirect} p7=${p7.directPln}`,
  );

  assert("catalog unchanged", catalogFingerprint(loadWorkCatalogStoreLocal()) === catalogBefore);

  assert("provisional summary present", prov != null);
  assert(
    "88/88 priced",
    prov?.pricedLineCount === 88,
    JSON.stringify(prov),
  );
  assert(
    "verified + provisional + proxy = priced",
    (prov?.verifiedCount ?? 0) + (prov?.provisionalCount ?? 0) + (prov?.proxyCount ?? 0) === prov?.pricedLineCount,
    JSON.stringify(prov),
  );

  const wykwity = shadowLines.filter((row) => /wykwit|zaciek/i.test(row.description ?? ""));
  assert("wykwity lines exist", wykwity.length >= 3, `count=${wykwity.length}`);
  for (const row of wykwity) {
    assert(
      `wykwity ${row.lineId} not VERIFIED`,
      row.provisionalAttestation?.pricingStatus !== "VERIFIED",
      row.provisionalAttestation?.pricingStatus,
    );
    assert(
      `wykwity ${row.lineId} proxy/review`,
      row.provisionalAttestation?.pricingStatus === "PROVISIONAL_PROXY"
        || row.provisionalAttestation?.uiLineStatus === "REVIEW_REQUIRED",
      JSON.stringify(row.provisionalAttestation),
    );
  }

  const probLines = shadowLines.filter((row) => String(row.unitRaw ?? "").toLowerCase() === "prob");
  assert("prob lines exist", probLines.length >= 1, `count=${probLines.length}`);
  for (const row of probLines) {
    assert(
      `prob ${row.lineId} UNIT_CONVERSION_REVIEW`,
      (row.provisionalAttestation?.reviewTags ?? []).includes(PROVISIONAL_REVIEW_TAG_UNIT),
      JSON.stringify(row.provisionalAttestation?.reviewTags),
    );
  }

  assert(
    "identity trusted < priced (patched bindings)",
    identityPhase.context.trustedOkCount < prov.pricedLineCount,
    `trusted=${identityPhase.context.trustedOkCount}`,
  );
  assert(
    "provisionalBindingCount > 0",
    identityPhase.context.provisionalBindingCount > 0,
    String(identityPhase.context.provisionalBindingCount),
  );

  forceIkProvisionalEstimationForTests(null);
  console.log(`\n=== RESULT: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
