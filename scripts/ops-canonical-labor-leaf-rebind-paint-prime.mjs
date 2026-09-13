/**
 * MOPS 08def932 — canonical labor leaf rebind (paint/prime) ops.
 *
 * Dry-run: npx vite-node scripts/ops-canonical-labor-leaf-rebind-paint-prime.mjs
 * Execute:  npx vite-node scripts/ops-canonical-labor-leaf-rebind-paint-prime.mjs --execute
 *
 * Persist only OfferBoq identity via runGatedIdentityPersist.
 * Does NOT write OUR RATE · does NOT force BidCutover/G3.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { loadEnv } from "vite";

const EXECUTE = process.argv.includes("--execute");
const OUT = path.join(process.cwd(), ".tmp");
const REPORT = path.join(OUT, "go-canonical-labor-leaf-rebind-paint-prime-report.json");
const PKG_PATH = path.join(OUT, "c2-m9-mops-package-persisted.json");
const TS = new Date().toISOString();
const NOW_MS = Date.parse(TS);
const CATALOG_KEY = "kw-wgdom-work-catalog";

const TARGET_LEAVES = {
  "1204-02": "cw.knr.knr-4-01.1204-02.m2",
  "1505-01": "cw.knr.knr-2-02.1505-01.m2",
  "1134-01": "cw.knr.nnrnkb.1134-01.m2",
  "1134-02": "cw.knr.nnrnkb.1134-02.m2",
};

const IMMUTABLE = {
  "cw.knr.knr-2-02.0815-05.m2": 22.88,
  "cw.knr.knr-2-02.0815-04.m2": 13.15,
  "cw.knr.knr-2-02.2006-04.m2": 9.62,
  "cw.knr.knr-2-02.1118-09.m2": 48.2,
  "cw.knr.knr-2-02.0829-03.m2": 61.12,
  "cw.knr.knr-4-01.1204-02.m2": 3.72,
  "cw.knr.knr-2-02.1505-01.m2": 1.18,
  "cw.knr.nnrnkb.1134-01.m2": 1.04,
  "cw.knr.nnrnkb.1134-02.m2": 1.39,
};

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

const env = loadEnv("", process.cwd(), "");
Object.assign(process.env, env);
const anon = env.VITE_SUPABASE_ANON_KEY;
const edge = `https://${env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys"}.supabase.co/functions/v1/make-server-0afb8820`;

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

async function batchGet(keys) {
  const res = await fetch(`${edge}/batch-get`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anon}`,
      apikey: anon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ keys }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`batch-get ${res.status}`);
  return res.json();
}

const head = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
console.log(
  `=== canonical labor leaf rebind paint/prime · HEAD=${head.slice(0, 8)} · execute=${EXECUTE} ===`,
);

if (!anon) {
  console.error("STOP: brak VITE_SUPABASE_ANON_KEY");
  process.exit(2);
}
if (!fs.existsSync(PKG_PATH)) {
  console.error("STOP: brak", PKG_PATH);
  process.exit(2);
}

const {
  normalizeWorkCatalogStore,
  loadWorkCatalogStoreLocal,
  getWorkByIdFromStore,
} = await import("../src/lib/work-catalog/index.ts");
const { lookupWorkRate } = await import("../src/lib/work-catalog/work-rate-lookup.ts");
const {
  evaluateCanonicalLaborLeafRebind,
  applyCompoundLaborLeafRebindToLine,
  CLLR_LEAF_0815_05,
} = await import(
  "../src/lib/intelligent-estimator/orchestra/compound-to-labor-leaf-rebind-contract.ts"
);
const { runIkIdentityPhase } = await import(
  "../src/lib/intelligent-estimator/orchestra/ik-identity-phase.ts"
);
const { runGatedIdentityPersist } = await import(
  "../src/lib/intelligent-estimator/orchestra/ik-identity-persist-glue.ts"
);
const { buildIkExpertAdmissionSummary } = await import(
  "../src/lib/intelligent-estimator/ik-expert-admission.ts"
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
const { MULTI_DWELLING_PACKAGE_LS_KEY } = await import("../src/lib/multi-dwelling/constants.ts");
const { upsertTenderPackage, getTenderPackage } = await import("../src/lib/multi-dwelling/store.ts");
const { overlayTrustedPackageIdentityOntoOfferBoq } = await import(
  "../src/lib/tender-offer-boq-g1-package-identity-connect.ts"
);

const kv = await batchGet([CATALOG_KEY]);
const catalog = unwrap(Array.isArray(kv.values) ? kv.values[0] : null);
if (!catalog) throw new Error("brak catalog");
localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
const store = normalizeWorkCatalogStore(loadWorkCatalogStoreLocal());

clearPackRegistryForTests();
clearDefinitionRegistryForTests();
clearCapabilityRegistryForTests();
seedB0Fixtures();
seedScreedEconomyWetCementV1();
ensureBaselineTechnologyPacksRegistered();
const packs = listAllPacks();

const pkgRaw = JSON.parse(fs.readFileSync(PKG_PATH, "utf8"));
const tenderId = pkgRaw.tenderId || pkgRaw.package?.tenderId;
const tenderPkg = structuredClone(pkgRaw.package || pkgRaw);
const storeBlob = {
  byTenderId: { [tenderId]: tenderPkg },
  updatedAt: TS,
};
localStorage.setItem(MULTI_DWELLING_PACKAGE_LS_KEY, JSON.stringify(storeBlob));
upsertTenderPackage(tenderPkg);

function gapHistFromShadow(shadow) {
  const gaps = {};
  let positionComplete = 0;
  let billable = 0;
  let complete = 0;
  let blocking = 0;
  for (const p of shadow?.positions || []) {
    for (const g of p.gaps || []) {
      const k = g.code || g.gapCode || g.type || "OTHER";
      gaps[k] = (gaps[k] || 0) + 1;
    }
    if (p.positionComplete) positionComplete += 1;
    if (p.billable) billable += 1;
    if (p.complete) complete += 1;
    if (p.blocking) blocking += 1;
  }
  return {
    gaps,
    brakStawkiRobot: gaps.BRAK_STAWKI_ROBOT || gaps.BRAK_STAWKI || 0,
    brakTechnologiiBom: gaps.BRAK_TECHNOLOGII_BOM || 0,
    nieprawidlowaJednostka: gaps.NIEPRAWIDLOWA_JEDNOSTKA || gaps["NIEPRAWIDŁOWA_JEDNOSTKA"] || 0,
    positionComplete,
    billable,
    complete,
    blocking,
    positionCount: (shadow?.positions || []).length,
  };
}

function runFinance(localStore) {
  const live = getTenderPackage(tenderId);
  let positionComplete = 0;
  let billable = 0;
  let complete = 0;
  let blocking = 0;
  const gaps = {};
  let brakStawkiRobot = 0;
  let brakTechnologiiBom = 0;
  let nieprawidlowaJednostka = 0;
  let gatePass = true;
  for (const d of live.dwellings || []) {
    const overlaid = overlayTrustedPackageIdentityOntoOfferBoq(d.offerBoq, live);
    const shadow = computeShadowPositionCostsForOfferBoq({
      doc: overlaid.document,
      store: localStore,
      nowMs: NOW_MS,
      packs,
      tenderId,
      dwellingId: d.dwellingId,
      pricingAuthority: "finance",
      ensureOwnerQuestions: false,
      discoveryStore: null,
    });
    const hist = gapHistFromShadow(shadow);
    for (const [k, v] of Object.entries(hist.gaps)) gaps[k] = (gaps[k] || 0) + v;
    brakStawkiRobot += hist.brakStawkiRobot;
    brakTechnologiiBom += hist.brakTechnologiiBom;
    nieprawidlowaJednostka += hist.nieprawidlowaJednostka;
    positionComplete += hist.positionComplete;
    billable += hist.billable;
    complete += hist.complete;
    blocking += hist.blocking;
    const gate = evaluateBidCutoverGate(shadow);
    if (!gate.pass) gatePass = false;
  }
  return {
    gaps,
    brakStawkiRobot,
    brakTechnologiiBom,
    nieprawidlowaJednostka,
    positionComplete,
    billable,
    complete,
    blocking,
    bidCutoverPass: gatePass,
  };
}

function classifyTarget(desc) {
  if (/\b1204[\s\-\/]*0?2\b/i.test(desc) && !/\b1505[\s\-\/]*0?1\b/i.test(desc)) {
    return "1204-02";
  }
  if (/\b1505[\s\-\/]*0?1\b/i.test(desc) && !/\b1204[\s\-\/]*0?2\b/i.test(desc)) {
    return "1505-01";
  }
  if (/\b1134[\s\-\/]*0?1\b/i.test(desc) && !/\b1134[\s\-\/]*0?2\b/i.test(desc)) {
    return "1134-01";
  }
  if (/\b1134[\s\-\/]*0?2\b/i.test(desc) && !/\b1134[\s\-\/]*0?1\b/i.test(desc)) {
    return "1134-02";
  }
  return null;
}

const financeBefore = runFinance(store);

const auditRows = [];
const counts = { "1204-02": 0, "1505-01": 0, "1134-01": 0, "1134-02": 0 };
const acceptCounts = { "1204-02": 0, "1505-01": 0, "1134-01": 0, "1134-02": 0 };
const skipped = [];

const live0 = getTenderPackage(tenderId);
for (const d of live0.dwellings || []) {
  const lines = d.offerBoq?.document?.lines || d.offerBoq?.lines || [];
  for (const line of lines) {
    const code = classifyTarget(String(line.description || ""));
    if (!code) continue;
    counts[code] += 1;
    const evalR = evaluateCanonicalLaborLeafRebind({
      line,
      store,
      packs,
      nowMs: NOW_MS,
    });
    auditRows.push({
      dwellingId: d.dwellingId,
      lineId: line.lineId,
      code,
      before: line.catalogWorkId,
      decision: evalR.decision,
      leafWorkId: evalR.leafWorkId,
      reasons: evalR.reasons,
      ourRatePln: evalR.ourRatePln,
    });
    if (evalR.decision === "COMPOUND_LEAF_REBIND_ACCEPT") {
      acceptCounts[code] += 1;
    } else if (evalR.decision !== "COMPOUND_LEAF_REBIND_IDEMPOTENT") {
      skipped.push({
        dwellingId: d.dwellingId,
        lineId: line.lineId,
        code,
        reasons: evalR.reasons,
      });
    }
  }
}

// Build structural expert-like input for IdentityPhase from package lines
function buildStructuralFromPackage(pkg) {
  const masterBoqLines = [];
  for (const d of pkg.dwellings || []) {
    const lines = d.offerBoq?.document?.lines || d.offerBoq?.lines || [];
    for (const line of lines) {
      masterBoqLines.push({
        dwellingId: d.dwellingId,
        line,
        provenance: { source: "ops-canonical-labor-rebind" },
      });
    }
  }
  const admission = buildIkExpertAdmissionSummary({
    documentStatus: "ready",
    readyForExperts: true,
    lines: masterBoqLines.map((r) => r.line),
  });
  return {
    tenderId,
    status: "ready",
    masterBoq: {
      lineCount: masterBoqLines.length,
      status: "ready",
      readyForExperts: true,
    },
    masterBoqLines,
    expertAdmission: admission,
  };
}

let persistOutcome = null;
let phaseContext = null;
if (EXECUTE) {
  const live = getTenderPackage(tenderId);
  const structuralReport = buildStructuralFromPackage(live);
  const phase = runIkIdentityPhase({
    structuralReport,
    sliceDExpert: structuralReport,
    item: { id: tenderId, tenderId, title: "MOPS paint/prime canonical rebind" },
    package: live,
    manualOverrides: [],
    nowMs: NOW_MS,
    packs,
  });
  phaseContext = {
    status: phase.context?.status,
    trustedOkCount: phase.context?.trustedOkCount,
    persistPlanCount: phase.context?.persistPlans?.length ?? 0,
  };
  persistOutcome = runGatedIdentityPersist({
    tenderId,
    package: getTenderPackage(tenderId),
    plans: phase.context.persistPlans,
    sessionGate: new Map(),
  });

  // Write updated package snapshot for cold-start verify
  const afterPkg = getTenderPackage(tenderId);
  fs.writeFileSync(
    path.join(OUT, "c2-m9-mops-package-after-canonical-labor-rebind.json"),
    JSON.stringify({ tenderId, package: afterPkg, rebuiltAt: TS }, null, 2),
  );
}

const financeAfter = runFinance(store);

// Immutable rate regression
const immutableCheck = {};
for (const [workId, expected] of Object.entries(IMMUTABLE)) {
  const lr = lookupWorkRate(store, workId, "m2", NOW_MS);
  immutableCheck[workId] = {
    expected,
    ourRatePln: lr.ourRatePln ?? null,
    status: lr.status,
    ok: lr.status === "CURRENT" && Number(lr.ourRatePln) === expected,
  };
}

// Second-run idempotency on after package if execute
let secondRun = null;
if (EXECUTE) {
  const afterPkg = getTenderPackage(tenderId);
  let accept2 = 0;
  let idem2 = 0;
    for (const d of afterPkg.dwellings || []) {
      const lines = d.offerBoq?.document?.lines || d.offerBoq?.lines || [];
      for (const line of lines) {
        const code = classifyTarget(String(line.description || ""));
        if (!code) continue;
        const evalR = evaluateCanonicalLaborLeafRebind({
          line,
          store,
          packs,
          nowMs: NOW_MS,
        });
        if (evalR.decision === "COMPOUND_LEAF_REBIND_ACCEPT") accept2 += 1;
        if (evalR.decision === "COMPOUND_LEAF_REBIND_IDEMPOTENT") idem2 += 1;
      }
    }
  secondRun = { accept2, idem2, expectAccept0: accept2 === 0 };
}

const report = {
  version: "CANONICAL-LABOR-LEAF-REBIND-PAINT-PRIME-v1",
  ts: TS,
  head,
  execute: EXECUTE,
  tenderId,
  countsAudited: counts,
  countsAccept: acceptCounts,
  eligibleTotal: Object.values(counts).reduce((a, b) => a + b, 0),
  acceptTotal: Object.values(acceptCounts).reduce((a, b) => a + b, 0),
  skipped,
  auditRows,
  financeBefore,
  financeAfter,
  persistOutcome,
  phaseContext,
  secondRun,
  immutableCheck,
  leaf081505: {
    workId: CLLR_LEAF_0815_05,
    rate: lookupWorkRate(store, CLLR_LEAF_0815_05, "m2", NOW_MS).ourRatePln,
  },
  targetLeaves: TARGET_LEAVES,
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      report: REPORT,
      countsAudited: counts,
      countsAccept: acceptCounts,
      acceptTotal: report.acceptTotal,
      skipped: skipped.length,
      financeBefore: {
        brakStawki: financeBefore.brakStawkiRobot,
        positionComplete: financeBefore.positionComplete,
        bidCutover: financeBefore.bidCutoverPass,
      },
      financeAfter: {
        brakStawki: financeAfter.brakStawkiRobot,
        positionComplete: financeAfter.positionComplete,
        bidCutover: financeAfter.bidCutoverPass,
      },
      persist: persistOutcome,
      secondRun,
      immutableOk: Object.values(immutableCheck).every((x) => x.ok),
    },
    null,
    2,
  ),
);

if (!EXECUTE && report.acceptTotal < 12) {
  console.warn("WARN: dry-run acceptTotal < 12 — check catalog CURRENT leaves");
}
