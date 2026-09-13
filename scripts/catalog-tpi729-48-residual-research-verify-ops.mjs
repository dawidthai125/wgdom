/**
 * TPI/729 — 48 residual research GO verify (no invent AUT-R1).
 * Confirms live IDs + Finance BRAK_STAWKI_ROBOT + register status.
 *
 * npx vite-node scripts/catalog-tpi729-48-residual-research-verify-ops.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { loadEnv } from "vite";

const OUT = path.join(process.cwd(), ".tmp", "go-tpi729-48-residual-research-verify.json");
const PKG_PATH = path.join(process.cwd(), ".tmp", "goa-tpi729-package-payload-v1.json");
const NOW_MS = Date.now();

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

function gapHistFromShadow(shadow) {
  const hist = {};
  let billable = 0;
  let complete = 0;
  for (const L of shadow.lines || []) {
    if (L.identity?.status === "NOISE_SKIP") continue;
    billable += 1;
    if (L.positionComplete || L.positionCost?.complete) {
      complete += 1;
      continue;
    }
    const key = (L.gaps || [])[0] || "UNKNOWN";
    hist[key] = (hist[key] || 0) + 1;
  }
  return { billable, complete, blocking: billable - complete, gap_histogram: hist };
}

const head = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const {
  TPI729_48_RESIDUAL_RESEARCH_ROWS,
  TPI729_48_RESIDUAL_HARD_RULES,
  summarizeTpi72948ResidualResearch,
  TPI729_48_RESIDUAL_RESEARCH_VERSION,
} = await import(
  "../src/lib/intelligent-estimator/knr-knowledge/tpi729-48-residual-labor-research-v1.ts"
);
const { normalizeWorkCatalogStore, getWorkByIdFromStore } = await import(
  "../src/lib/work-catalog/index.ts"
);
const { lookupWorkRate } = await import("../src/lib/work-catalog/work-rate-lookup.ts");
const { evaluateAutR1LaborAcceptContract } = await import(
  "../src/lib/work-catalog/aut-r1-accept-contract.ts"
);
const { buildCandidateFromDurableLaborEvidence } = await import(
  "../src/lib/intelligent-estimator/apf-labor-evidence-persist.ts"
);
const { loadLaborSourceEvidenceStoreLocal, normalizeLaborSourceEvidenceStore } = await import(
  "../src/lib/labor-source-evidence/index.ts"
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
const { computeShadowPositionCostsForOfferBoq } = await import(
  "../src/lib/tender-position-cost/boq-shadow-adapter.ts"
);
const { evaluateBidCutoverGate } = await import(
  "../src/lib/tender-position-cost/bid-position-cost-cutover.ts"
);
const { buildIkExpertAdmissionSummary } = await import(
  "../src/lib/intelligent-estimator/ik-expert-admission.ts"
);
const { runIkIdentityPhase } = await import(
  "../src/lib/intelligent-estimator/orchestra/ik-identity-phase.ts"
);
const { runGatedIdentityPersist } = await import(
  "../src/lib/intelligent-estimator/orchestra/ik-identity-persist-glue.ts"
);
const { evaluateCompoundToLaborLeafRebind } = await import(
  "../src/lib/intelligent-estimator/orchestra/compound-to-labor-leaf-rebind-contract.ts"
);

if (!anon) {
  console.error("STOP: brak VITE_SUPABASE_ANON_KEY");
  process.exit(2);
}

const kv = await batchGet(["kw-wgdom-work-catalog", "kw-wgdom-labor-source-evidence"]);
const catalog = unwrap(kv.values?.[0]);
const evidenceRaw = unwrap(kv.values?.[1]);
if (!catalog) throw new Error("no catalog");
localStorage.setItem("kw-wgdom-work-catalog", JSON.stringify(catalog));
if (evidenceRaw) localStorage.setItem("kw-wgdom-labor-source-evidence", JSON.stringify(evidenceRaw));
const store = normalizeWorkCatalogStore(catalog);
const evidenceStore = normalizeLaborSourceEvidenceStore(loadLaborSourceEvidenceStoreLocal());

const identityChecks = [];
for (const row of TPI729_48_RESIDUAL_RESEARCH_ROWS) {
  if (!row.liveWorkId || row.class === "EXCLUDED_SPECIAL" || row.class === "COMPOUND_LABOR_LEAF") {
    continue;
  }
  if (!row.tableCode) continue;
  const work = getWorkByIdFromStore(store, row.liveWorkId);
  const rate = work
    ? lookupWorkRate(store, row.liveWorkId, row.unit || "m2", NOW_MS)
    : { status: "MISSING", ourRatePln: null, sourceType: null };
  const obs = evidenceStore.observations.filter((o) => o.workId === row.liveWorkId);
  let autR1 = null;
  if (obs.length && work) {
    const cand = buildCandidateFromDurableLaborEvidence({
      workId: row.liveWorkId,
      workNamePl: work.namePl || row.descriptionPl,
      unit: row.unit || "m2",
      observations: obs,
    });
    const contract = evaluateAutR1LaborAcceptContract({
      store,
      candidate: cand,
      identityTrusted: true,
      evidenceObservations: obs,
      nowMs: NOW_MS,
    });
    autR1 = {
      candidateBuilt: Boolean(cand),
      decision: contract.decision,
      reasons: contract.reasons,
      marketBaseRatePln: contract.marketBaseRatePln,
    };
  }
  identityChecks.push({
    tableCode: row.tableCode,
    liveWorkId: row.liveWorkId,
    goProposedWorkId: row.goProposedWorkId,
    inCatalog: Boolean(work),
    registerStatus: row.status,
    rateStatus: rate.status,
    ourRatePln: rate.ourRatePln ?? null,
    sourceType: rate.sourceType ?? null,
    durableObsCount: obs.length,
    autR1,
    goProposedRejected:
      row.goProposedWorkId && row.goProposedWorkId !== row.liveWorkId
        ? "GO_PROPOSED_ID_NOT_USED"
        : null,
  });
}

clearPackRegistryForTests();
clearDefinitionRegistryForTests();
clearCapabilityRegistryForTests();
seedB0Fixtures();
seedScreedEconomyWetCementV1();
ensureBaselineTechnologyPacksRegistered();
const packs = listAllPacks();

let finance = null;
let cllrSample = null;
let bidCutover = null;
if (fs.existsSync(PKG_PATH)) {
  const pkgPayload = JSON.parse(fs.readFileSync(PKG_PATH, "utf8"));
  const tenderId = Object.keys(pkgPayload.store.byTenderId)[0];
  const tenderPkg = structuredClone(pkgPayload.store.byTenderId[tenderId]);
  localStorage.setItem(MULTI_DWELLING_PACKAGE_LS_KEY, JSON.stringify(pkgPayload.store));
  upsertTenderPackage(tenderPkg);
  const dwellingId = tenderPkg.dwellings[0].dwellingId;

  const masterBoqLines = (getTenderPackage(tenderId).dwellings[0].offerBoq?.lines || []).map(
    (line) => ({ dwellingId, line, provenance: { source: "48-residual-verify" } }),
  );
  const admission = buildIkExpertAdmissionSummary({
    documentStatus: "ready",
    readyForExperts: true,
    lines: masterBoqLines.map((r) => r.line),
  });
  const structuralReport = {
    tenderId,
    status: "ready",
    masterBoq: { lineCount: masterBoqLines.length, status: "ready", readyForExperts: true },
    masterBoqLines,
    expertAdmission: admission,
  };
  const phase = runIkIdentityPhase({
    structuralReport,
    sliceDExpert: structuralReport,
    item: { id: tenderId, tenderId, title: "TPI/729 48 residual verify" },
    package: getTenderPackage(tenderId),
    manualOverrides: [],
    nowMs: NOW_MS,
    packs: undefined,
  });
  runGatedIdentityPersist({
    tenderId,
    package: getTenderPackage(tenderId),
    plans: phase.context.persistPlans,
    sessionGate: new Map(),
  });

  const live = getTenderPackage(tenderId);
  const overlaid = overlayTrustedPackageIdentityOntoOfferBoq(live.dwellings[0].offerBoq, live);
  const shadow = computeShadowPositionCostsForOfferBoq({
    doc: overlaid.document,
    store,
    nowMs: NOW_MS,
    packs,
    tenderId,
    dwellingId,
    pricingAuthority: "finance",
    ensureOwnerQuestions: false,
    discoveryStore: null,
  });
  finance = gapHistFromShadow(shadow);
  const gate = evaluateBidCutoverGate(shadow);
  bidCutover = { pass: Boolean(gate.pass), reasons: gate.reasons || null };

  const lines = live.dwellings[0].offerBoq?.lines || [];
  const sample = [];
  for (const line of lines) {
    const parent = String(line.catalogWorkId || "");
    const desc = String(line.description || "");
    if (
      ![
        "legacy-gladzie_tynki-m2",
        "cc-w2-scianki-dzialowe-gr-pakiet-m2",
        "legacy-podlogi-m2",
        "legacy-glazura-m2",
        "legacy-stolarka-szt",
      ].includes(parent) &&
      !/0815-04|2006-04|1205-09|1118-09|0829-03|0815-05/.test(desc) &&
      !/^cw\.knr\.(knr-2-02\.(0815-04|0815-05|2006-04|1118-09|0829-03)|knnr-2\.1205-09)/.test(parent)
    ) {
      continue;
    }
    const cllr = evaluateCompoundToLaborLeafRebind({
      line,
      store,
      packs: undefined,
      nowMs: NOW_MS,
      parentWorkId: parent || line.catalogWorkId,
    });
    sample.push({
      lineId: line.lineId,
      parent,
      decision: cllr.decision,
      leafWorkId: cllr.leafWorkId,
      reasons: cllr.reasons,
      rateStatus: cllr.rateStatus,
      ourRatePln: cllr.ourRatePln,
    });
  }
  cllrSample = {
    count: sample.length,
    byDecision: sample.reduce((a, x) => {
      a[x.decision] = (a[x.decision] || 0) + 1;
      return a;
    }, {}),
    identityPersistPlans: phase.context?.persistPlans?.length ?? null,
    rows: sample.slice(0, 40),
  };
}

const report = {
  go: "TPI/729 48 residual labor research verify",
  version: TPI729_48_RESIDUAL_RESEARCH_VERSION,
  head,
  hardRules: TPI729_48_RESIDUAL_HARD_RULES,
  summary: summarizeTpi72948ResidualResearch(),
  identityChecks,
  newlyCurrentThisGo: 0,
  inventedRates: false,
  finance,
  bidCutover,
  cllrSample,
  ssotMd: "docs/architecture/IK-LABOR-RATE-RESEARCH-TPI729-48-RESIDUALS-V1.md",
  ssotTs: "src/lib/intelligent-estimator/knr-knowledge/tpi729-48-residual-labor-research-v1.ts",
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      head: head.slice(0, 8),
      finance,
      summary: report.summary,
      identityChecks: identityChecks.map((x) => ({
        tableCode: x.tableCode,
        inCatalog: x.inCatalog,
        status: x.registerStatus,
        rate: x.rateStatus,
        ourRatePln: x.ourRatePln,
        goId: x.goProposedRejected,
      })),
      out: OUT,
    },
    null,
    2,
  ),
);
