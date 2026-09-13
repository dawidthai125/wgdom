/**
 * Quick finance delta for paint/prime rebind before/after packages.
 * npx vite-node scripts/ops-canonical-labor-rebind-finance-delta.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";

const OUT = path.join(process.cwd(), ".tmp");
const env = loadEnv("", process.cwd(), "");
Object.assign(process.env, env);
const anon = env.VITE_SUPABASE_ANON_KEY;
const projectId = env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys";
const edge = `https://${projectId}.supabase.co/functions/v1/make-server-0afb8820`;

const ls = new Map();
globalThis.localStorage = {
  getItem: (k) => (ls.has(k) ? ls.get(k) : null),
  setItem: (k, v) => ls.set(k, String(v)),
  removeItem: (k) => ls.delete(k),
  clear: () => ls.clear(),
  key: (i) => [...ls.keys()][i] ?? null,
  get length() {
    return ls.size;
  },
};

async function batchGet(keys) {
  const res = await fetch(`${edge}/batch-get`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anon}`,
      apikey: anon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ keys }),
  });
  if (!res.ok) throw new Error(`batch-get ${res.status}`);
  return res.json();
}

function unwrap(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

const kv = await batchGet(["kw-wgdom-work-catalog"]);
const catalog = unwrap(Array.isArray(kv.values) ? kv.values[0] : null);
localStorage.setItem("kw-wgdom-work-catalog", JSON.stringify(catalog));

const { normalizeWorkCatalogStore, loadWorkCatalogStoreLocal } = await import(
  "../src/lib/work-catalog/index.ts"
);
const store = normalizeWorkCatalogStore(loadWorkCatalogStoreLocal());
const { MULTI_DWELLING_PACKAGE_LS_KEY } = await import(
  "../src/lib/multi-dwelling/constants.ts"
);
const { upsertTenderPackage, getTenderPackage } = await import(
  "../src/lib/multi-dwelling/store.ts"
);
const { overlayTrustedPackageIdentityOntoOfferBoq } = await import(
  "../src/lib/tender-offer-boq-g1-package-identity-connect.ts"
);
const { computeShadowPositionCostsForOfferBoq } = await import(
  "../src/lib/tender-position-cost/boq-shadow-adapter.ts"
);
const { evaluateBidCutoverGate } = await import(
  "../src/lib/tender-position-cost/bid-position-cost-cutover.ts"
);
const {
  clearPackRegistryForTests,
  clearDefinitionRegistryForTests,
  clearCapabilityRegistryForTests,
  listAllPacks,
  seedB0Fixtures,
  seedScreedEconomyWetCementV1,
} = await import("../src/lib/technology-foundation/index.ts");
const { ensureBaselineTechnologyPacksRegistered } = await import(
  "../src/lib/technology-foundation/ensure-baseline-technology-packs.ts"
);

clearPackRegistryForTests();
clearDefinitionRegistryForTests();
clearCapabilityRegistryForTests();
seedB0Fixtures();
seedScreedEconomyWetCementV1();
ensureBaselineTechnologyPacksRegistered();
const packs = listAllPacks();

function loadPkg(file) {
  const raw = JSON.parse(fs.readFileSync(path.join(OUT, file), "utf8"));
  const tid = raw.tenderId;
  const pkg = raw.package || raw;
  localStorage.setItem(
    MULTI_DWELLING_PACKAGE_LS_KEY,
    JSON.stringify({ byTenderId: { [tid]: pkg }, updatedAt: new Date().toISOString() }),
  );
  upsertTenderPackage(pkg);
  return tid;
}

function summarize(label, tid) {
  const live = getTenderPackage(tid);
  const gapHist = {};
  let positionComplete = 0;
  let billable = 0;
  let complete = 0;
  let blocking = 0;
  let positionCount = 0;
  let gatePass = true;
  const targetSamples = [];

  for (const d of live.dwellings || []) {
    const overlaid = overlayTrustedPackageIdentityOntoOfferBoq(d.offerBoq, live);
    const doc = overlaid.document || overlaid;
    const shadow = computeShadowPositionCostsForOfferBoq({
      doc,
      store,
      nowMs: Date.now(),
      packs,
      tenderId: tid,
      dwellingId: d.dwellingId,
      pricingAuthority: "finance",
      ensureOwnerQuestions: false,
      discoveryStore: null,
    });

    const positions =
      shadow?.positions
      || shadow?.positionCosts
      || shadow?.lines
      || [];
    if (!Array.isArray(positions) && shadow) {
      console.log(label, "shadow keys", Object.keys(shadow));
    }
    for (const p of positions) {
      positionCount += 1;
      const gaps = p.gaps || p.blockingGaps || p.gapCodes || [];
      for (const g of gaps) {
        const k = typeof g === "string" ? g : g.code || g.gapCode || g.type || "OTHER";
        gapHist[k] = (gapHist[k] || 0) + 1;
      }
      if (p.positionComplete || p.isComplete || p.complete) positionComplete += 1;
      if (p.billable) billable += 1;
      if (p.complete) complete += 1;
      if (p.blocking || (gaps && gaps.length)) blocking += 1;
      const wid = p.catalogWorkId || p.workId || "";
      if (/1204-02|1505-01|1134-01|1134-02/.test(wid)) {
        targetSamples.push({
          dwellingId: d.dwellingId,
          workId: wid,
          gaps: gaps.slice?.(0, 5) || gaps,
          rateStatus: p.laborRateStatus || p.rateStatus || null,
          positionComplete: p.positionComplete ?? null,
          billable: p.billable ?? null,
        });
      }
    }
    const gate = evaluateBidCutoverGate(shadow);
    if (!gate.pass) gatePass = false;
  }

  console.log(
    JSON.stringify(
      {
        label,
        positionCount,
        gapHist,
        positionComplete,
        billable,
        complete,
        blocking,
        bidCutoverPass: gatePass,
        targetSamples: targetSamples.slice(0, 8),
      },
      null,
      2,
    ),
  );
}

summarize("BEFORE", loadPkg("c2-m9-mops-package-persisted.json"));
summarize("AFTER", loadPkg("c2-m9-mops-package-after-canonical-labor-rebind.json"));
