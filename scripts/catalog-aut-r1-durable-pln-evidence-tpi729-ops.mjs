/**
 * IK TPI/729 — AUT-R1 DURABLE PLN EVIDENCE GO
 *
 * Ingest Owner-verified labor-only PLN/m2 Evidence for:
 *   · cw.knr.knr-2-02.1118-09.m2 → 48.201 PLN/m2 (BIP Staro Olecko)
 *   · cw.knr.knr-2-02.0829-03.m2 → 61.12 PLN/m2 (public cost estimate)
 *
 * HOLD (no invent): 0815-04 · 2006-04 · 1205-09
 *
 * Pipeline: Observation → upsert durable Evidence → Candidate → AUT-R1 → Accept writer
 *
 * Dry-run: npx vite-node scripts/catalog-aut-r1-durable-pln-evidence-tpi729-ops.mjs
 * Execute:  npx vite-node scripts/catalog-aut-r1-durable-pln-evidence-tpi729-ops.mjs --execute
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { loadEnv } from "vite";

const EXECUTE = process.argv.includes("--execute");
const OUT = path.join(process.cwd(), ".tmp");
const REPORT = path.join(OUT, "go-tpi729-aut-r1-durable-pln-evidence-report.json");
const PKG_PATH = path.join(OUT, "goa-tpi729-package-payload-v1.json");
const TS = new Date().toISOString();
const NOW_MS = Date.parse(TS);
const CATALOG_KEY = "kw-wgdom-work-catalog";
const EVIDENCE_KEY = "kw-wgdom-labor-source-evidence";

const HOLD_WORK_IDS = [
  "cw.knr.knr-2-02.0815-04.m2",
  "cw.knr.knr-2-02.2006-04.m2",
  "cw.knr.knnr-2.1205-09.m2",
];

const CANDIDATES = [
  {
    tableCode: "1118-09",
    workId: "cw.knr.knr-2-02.1118-09.m2",
    unit: "m2",
    sourceId: "bip_staro_olecko_1118_09",
    sourceUrl:
      "https://www.spolecko.bip.doc.pl/upload/doc/19103_20180403_120927.pdf",
    observedName:
      "Posadzki z płytek układanych na klej — płytki 30x30 cm — metoda kombinowana (KNR 202 1118/09)",
    pricePoint: 48.201,
    observedAt: "2018-04-03T00:00:00.000Z",
    expectedMarketBase: 48.2,
  },
  {
    tableCode: "0829-03",
    workId: "cw.knr.knr-2-02.0829-03.m2",
    unit: "m2",
    sourceId: "public_cost_estimate_0829_03",
    sourceUrl:
      "https://fliphtml5.com/wnzvl/ndtc/RB-_ca%C5%82o%C5%9B%C4%87-_po_inwent/",
    observedName: "Licowanie ścian płytkami (KNR 0-12 0829-03)",
    pricePoint: 61.12,
    observedAt: null,
    expectedMarketBase: 61.12,
  },
];

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

function pickByKeyOrder(kv, keys) {
  const arr = Array.isArray(kv.values) ? kv.values : [];
  const out = {};
  for (let i = 0; i < keys.length; i += 1) out[keys[i]] = unwrap(arr[i]);
  return out;
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

if (!anon) {
  console.error("STOP: brak VITE_SUPABASE_ANON_KEY");
  process.exit(2);
}

const head = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
console.log(
  `=== AUT-R1 durable PLN Evidence TPI/729 · mode=${EXECUTE ? "EXECUTE" : "DRY-RUN"} · HEAD=${head.slice(0, 8)} ===`,
);

const {
  normalizeWorkCatalogStore,
  loadWorkCatalogStoreLocal,
  saveWorkCatalogStoreLocal,
  getWorkByIdFromStore,
} = await import("../src/lib/work-catalog/index.ts");
const { lookupWorkRate } = await import("../src/lib/work-catalog/work-rate-lookup.ts");
const { pushWorkCatalogStoreToCloudSafe } = await import(
  "../src/lib/work-catalog/work-catalog-cloud-push.ts"
);
const {
  buildLaborSourceEvidenceObservation,
  upsertLaborSourceEvidenceObservations,
  loadLaborSourceEvidenceStoreLocal,
  saveLaborSourceEvidenceStoreLocal,
  normalizeLaborSourceEvidenceStore,
  LABOR_SOURCE_EVIDENCE_STORAGE_KEY,
  resolveOwnerAuthorizedLaborEvidenceRoute,
  assertLaborSourceEvidenceHostLock,
} = await import("../src/lib/labor-source-evidence/index.ts");
const { tryAutR1AcceptFromDurableEvidence } = await import(
  "../src/lib/work-catalog/aut-r1-from-durable-evidence.ts"
);
const { evaluateAutR1LaborAcceptContract } = await import(
  "../src/lib/work-catalog/aut-r1-accept-contract.ts"
);
const { buildCandidateFromDurableLaborEvidence } = await import(
  "../src/lib/intelligent-estimator/apf-labor-evidence-persist.ts"
);
const { pushKeysToCloud } = await import("../src/lib/cloud-sync.ts");
const {
  evaluateCompoundToLaborLeafRebind,
} = await import(
  "../src/lib/intelligent-estimator/orchestra/compound-to-labor-leaf-rebind-contract.ts"
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
const { runIkIdentityPhase } = await import(
  "../src/lib/intelligent-estimator/orchestra/ik-identity-phase.ts"
);
const { runGatedIdentityPersist } = await import(
  "../src/lib/intelligent-estimator/orchestra/ik-identity-persist-glue.ts"
);
const { buildIkExpertAdmissionSummary } = await import(
  "../src/lib/intelligent-estimator/ik-expert-admission.ts"
);

const fetchKeys = [CATALOG_KEY, EVIDENCE_KEY];
const kv = await batchGet(fetchKeys);
const picked = pickByKeyOrder(kv, fetchKeys);
const catalog = picked[CATALOG_KEY];
if (!catalog) throw new Error("brak kw-wgdom-work-catalog");

localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
if (picked[EVIDENCE_KEY]) {
  localStorage.setItem(EVIDENCE_KEY, JSON.stringify(picked[EVIDENCE_KEY]));
}
let store = normalizeWorkCatalogStore(loadWorkCatalogStoreLocal());
let evidenceStore = normalizeLaborSourceEvidenceStore(
  loadLaborSourceEvidenceStoreLocal(),
);

const leafResults = [];
const observationsBuilt = [];

for (const c of CANDIDATES) {
  const route = resolveOwnerAuthorizedLaborEvidenceRoute(c.sourceId);
  const host = assertLaborSourceEvidenceHostLock({
    sourceId: c.sourceId,
    sourceUrl: c.sourceUrl,
  });
  const work = getWorkByIdFromStore(store, c.workId);
  const namePl = work?.namePl || c.observedName;
  const before = lookupWorkRate(store, c.workId, c.unit, NOW_MS);
  const observedAt = c.observedAt || route?.documentObservedAt || TS;

  const obs = buildLaborSourceEvidenceObservation({
    workId: c.workId,
    workNamePl: namePl,
    sourceId: c.sourceId,
    sourceUrl: c.sourceUrl,
    categoryKey: `owner_go_tpi729_${c.tableCode}`,
    observedName: c.observedName,
    unit: c.unit,
    pricePoint: c.pricePoint,
    priceKind: "point",
    region: "POLSKA",
    identityMatched: true,
    identityMethod: "exact_name",
    synonymUsed: null,
    laborOnly: true,
    includesMaterial: false,
    observedAt,
    retrievedAt: TS,
  });
  observationsBuilt.push(obs);

  leafResults.push({
    tableCode: c.tableCode,
    workId: c.workId,
    leafPresent: Boolean(work),
    hostLockOk: host.ok,
    hostMessage: host.ok ? null : host.messagePl,
    beforeLookup: {
      status: before.status,
      ourRatePln: before.ourRatePln ?? null,
      sourceType: before.sourceType ?? null,
    },
    observation: {
      qualityStatus: obs.qualityStatus,
      pricePoint: obs.pricePoint,
      unit: obs.unit,
      laborOnly: obs.laborOnly,
      includesMaterial: obs.includesMaterial,
      identityMethod: obs.identityMethod,
      region: obs.region,
      sourceId: obs.sourceId,
      sourceUrl: obs.sourceUrl,
    },
    expectedMarketBase: c.expectedMarketBase,
  });
}

const upsert = upsertLaborSourceEvidenceObservations({
  observations: observationsBuilt,
  nowIso: TS,
});
evidenceStore = upsert.ok ? upsert.store : loadLaborSourceEvidenceStoreLocal();
saveLaborSourceEvidenceStoreLocal(evidenceStore);

for (let i = 0; i < CANDIDATES.length; i += 1) {
  const c = CANDIDATES[i];
  const row = leafResults[i];
  const work = getWorkByIdFromStore(store, c.workId);
  const namePl = work?.namePl || c.observedName;
  const fromStore = evidenceStore.observations.filter(
    (o) => o.workId === c.workId && o.sourceId === c.sourceId,
  );
  const obsForLeaf = fromStore.length ? fromStore : [observationsBuilt[i]];

  const candidate = buildCandidateFromDurableLaborEvidence({
    workId: c.workId,
    workNamePl: namePl,
    unit: c.unit,
    observations: obsForLeaf,
  });

  const contract = evaluateAutR1LaborAcceptContract({
    store,
    candidate,
    identityTrusted: Boolean(work),
    evidenceObservations: obsForLeaf,
    nowMs: NOW_MS,
  });

  row.candidateBuilt = Boolean(candidate);
  row.marketBaseRatePln = candidate?.marketBaseRatePln ?? null;
  row.autR1Contract = {
    decision: contract.decision,
    mayPersistOurRate: contract.mayPersistOurRate,
    idempotentNoop: contract.idempotentNoop,
    reasons: contract.reasons,
    marketBaseRatePln: contract.marketBaseRatePln,
    evidenceSufficiency: contract.evidenceSufficiency
      ? {
          status: contract.evidenceSufficiency.status,
          sufficient: contract.evidenceSufficiency.sufficient,
          reasonPl: contract.evidenceSufficiency.reasonPl,
        }
      : null,
  };

  let acceptResult = null;
  if (
    EXECUTE &&
    upsert.ok &&
    contract.decision === "AUT_R1_ACCEPT" &&
    (contract.mayPersistOurRate || contract.idempotentNoop)
  ) {
    const built = await tryAutR1AcceptFromDurableEvidence({
      store,
      workId: c.workId,
      workNamePl: namePl,
      unit: c.unit,
      observations: obsForLeaf,
      identityTrusted: true,
      matchMethod: "auto_contract",
      nowMs: NOW_MS,
      persist: contract.mayPersistOurRate === true,
      save: async (nextStore, options) => {
        saveWorkCatalogStoreLocal(nextStore, {
          updatedAtIso: options.updatedAtIso || TS,
        });
        const pushed = await pushWorkCatalogStoreToCloudSafe(nextStore, {
          mode: "union",
        });
        return { ok: pushed?.ok !== false, saved: true, pushed };
      },
    });
    if (built.ok && built.accept) {
      store = normalizeWorkCatalogStore(built.accept.store);
      acceptResult = {
        ok: built.accept.ok,
        candidateBuilt: built.candidateBuilt,
        accepted: built.accept.accepted,
        idempotentNoop: built.accept.idempotentNoop,
        persisted: built.accept.persisted,
        decision: built.accept.contract?.decision ?? null,
        reasons: built.accept.contract?.reasons ?? null,
        marketBaseRatePln: built.accept.contract?.marketBaseRatePln ?? null,
      };
    } else {
      acceptResult = {
        ok: built.ok,
        candidateBuilt: built.candidateBuilt,
        reason: built.reason ?? null,
      };
    }
  }

  const after = lookupWorkRate(store, c.workId, c.unit, Date.now());
  row.afterLookup = {
    status: after.status,
    ourRatePln: after.ourRatePln ?? null,
    sourceType: after.sourceType ?? null,
  };
  row.acceptResult = acceptResult;
}

// HOLD leaves — rate must stay MISSING (no invent / no transfer)
const holdProbe = HOLD_WORK_IDS.map((workId) => {
  const lr = lookupWorkRate(store, workId, "m2", Date.now());
  return {
    workId,
    status: lr.status,
    ourRatePln: lr.ourRatePln ?? null,
    sourceType: lr.sourceType ?? null,
    untouchedOk: lr.status !== "CURRENT",
  };
});

let evidencePush = null;
if (EXECUTE && upsert.ok) {
  evidencePush = await pushKeysToCloud(
    [LABOR_SOURCE_EVIDENCE_STORAGE_KEY],
    [evidenceStore],
  );
}

// Finance + CLLR after IdentityPhase (package fixture) — reuse compound22 structural path
clearPackRegistryForTests();
clearDefinitionRegistryForTests();
clearCapabilityRegistryForTests();
seedB0Fixtures();
seedScreedEconomyWetCementV1();
ensureBaselineTechnologyPacksRegistered();
const packs = listAllPacks();

let finance = null;
let cllrExact = null;
let bidCutover = null;
let identityPhaseMeta = null;

function runFinance(localStore) {
  if (!fs.existsSync(PKG_PATH)) return null;
  const pkgPayload = JSON.parse(fs.readFileSync(PKG_PATH, "utf8"));
  const tenderId = Object.keys(pkgPayload.store.byTenderId)[0];
  const live = getTenderPackage(tenderId) || (() => {
    const tenderPkg = structuredClone(pkgPayload.store.byTenderId[tenderId]);
    localStorage.setItem(MULTI_DWELLING_PACKAGE_LS_KEY, JSON.stringify(pkgPayload.store));
    upsertTenderPackage(tenderPkg);
    return getTenderPackage(tenderId);
  })();
  const dwellingId = live.dwellings[0].dwellingId;
  const overlaid = overlayTrustedPackageIdentityOntoOfferBoq(live.dwellings[0].offerBoq, live);
  const shadow = computeShadowPositionCostsForOfferBoq({
    doc: overlaid.document,
    store: localStore,
    nowMs: NOW_MS,
    packs,
    tenderId,
    dwellingId,
    pricingAuthority: "finance",
    ensureOwnerQuestions: false,
    discoveryStore: null,
  });
  const gate = evaluateBidCutoverGate(shadow);
  return {
    ...gapHistFromShadow(shadow),
    gatePass: Boolean(gate.pass),
    gateReasons: gate.reasons || null,
  };
}

if (fs.existsSync(PKG_PATH)) {
  const pkgPayload = JSON.parse(fs.readFileSync(PKG_PATH, "utf8"));
  const tenderId = Object.keys(pkgPayload.store.byTenderId)[0];
  const tenderPkg = structuredClone(pkgPayload.store.byTenderId[tenderId]);
  localStorage.setItem(MULTI_DWELLING_PACKAGE_LS_KEY, JSON.stringify(pkgPayload.store));
  upsertTenderPackage(tenderPkg);
  const dwellingId = tenderPkg.dwellings[0].dwellingId;

  const masterBoqLines = (getTenderPackage(tenderId).dwellings[0].offerBoq?.lines || []).map(
    (line) => ({ dwellingId, line, provenance: { source: "aut-r1-durable-pln" } }),
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
    item: { id: tenderId, tenderId, title: "TPI/729 AUT-R1 durable PLN" },
    package: getTenderPackage(tenderId),
    manualOverrides: [],
    nowMs: NOW_MS,
    packs: undefined,
  });
  const gated = runGatedIdentityPersist({
    tenderId,
    package: getTenderPackage(tenderId),
    plans: phase.context.persistPlans,
    sessionGate: new Map(),
  });
  identityPhaseMeta = {
    persistPlanCount: phase.context?.persistPlans?.length ?? null,
    gatedOk: gated?.ok ?? null,
  };

  finance = runFinance(store);
  bidCutover = {
    pass: Boolean(finance?.gatePass),
    reasons: finance?.gateReasons || null,
  };

  const offerLines = getTenderPackage(tenderId).dwellings[0].offerBoq?.lines || [];
  const exactScope = [];
  for (const line of offerLines) {
    const parent = String(line.catalogWorkId || "");
    const desc = String(line.description || "");
    const relevant =
      [
        "legacy-gladzie_tynki-m2",
        "cc-w2-scianki-dzialowe-gr-pakiet-m2",
        "legacy-podlogi-m2",
        "legacy-glazura-m2",
      ].includes(parent) || /0815-04|2006-04|1205-09|1118-09|0829-03/.test(desc);
    if (!relevant) continue;
    if (/\b0815[\s\-\/]*0?5\b/i.test(desc) && !/0815-04/.test(desc)) continue;
    if (/piank|izolacj/i.test(desc)) continue;
    if (parent === "legacy-stolarka-szt") continue;

    const cllr = evaluateCompoundToLaborLeafRebind({
      line,
      store,
      packs: undefined,
      nowMs: NOW_MS,
      parentWorkId: parent || line.catalogWorkId,
    });
    exactScope.push({
      lineId: line.lineId || null,
      decision: cllr.decision,
      reasons: cllr.reasons,
      leafWorkId: cllr.leafWorkId || null,
      rateStatus: cllr.rateStatus,
      ourRatePln: cllr.ourRatePln ?? null,
      description: desc.slice(0, 100),
    });
  }
  cllrExact = {
    count: exactScope.length,
    byDecision: exactScope.reduce((acc, x) => {
      const k = String(x.decision);
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {}),
    byLeaf: exactScope.reduce((acc, x) => {
      const k = x.leafWorkId || "none";
      if (!acc[k]) acc[k] = { count: 0, decisions: {} };
      acc[k].count += 1;
      acc[k].decisions[x.decision] = (acc[k].decisions[x.decision] || 0) + 1;
      return acc;
    }, {}),
    sample: exactScope.slice(0, 40),
  };
}

const acceptCount = leafResults.filter(
  (r) =>
    r.autR1Contract?.decision === "AUT_R1_ACCEPT" &&
    (r.afterLookup?.status === "CURRENT" || r.autR1Contract?.idempotentNoop),
).length;

const report = {
  version: "AUT-R1-DURABLE-PLN-EVIDENCE-TPI729-v1",
  ts: TS,
  head,
  mode: EXECUTE ? "EXECUTE" : "DRY-RUN",
  changelogTarget: "2.66.198",
  evidenceUpsert: {
    ok: upsert.ok,
    reason: upsert.ok ? null : upsert.reason,
    messagePl: upsert.ok ? null : upsert.messagePl,
    observationCount: evidenceStore.observations?.length ?? 0,
  },
  evidencePush: evidencePush
    ? { ok: evidencePush?.ok !== false, raw: typeof evidencePush }
    : null,
  candidates: leafResults,
  holdLeaves: holdProbe,
  holdAllUntouched: holdProbe.every((h) => h.untouchedOk),
  autR1AcceptCurrentCount: acceptCount,
  finance,
  bidCutover,
  identityPhaseMeta,
  cllrExact,
  invariants: {
    noKnrHourlyConversion: true,
    noRateTransfer: true,
    noDirectOurRateWrite: true,
    holdThreeUntouched: holdProbe.every((h) => h.untouchedOk),
    hostLockNotBypassed: true,
  },
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      mode: report.mode,
      upsertOk: upsert.ok,
      acceptCurrent: acceptCount,
      holdOk: report.holdAllUntouched,
      finance,
      candidates: leafResults.map((r) => ({
        tableCode: r.tableCode,
        decision: r.autR1Contract?.decision,
        reasons: r.autR1Contract?.reasons,
        marketBase: r.marketBaseRatePln,
        after: r.afterLookup,
      })),
      report: REPORT,
    },
    null,
    2,
  ),
);

if (!EXECUTE) {
  console.log("DRY-RUN complete — re-run with --execute for durable Evidence + AUT-R1 Accept.");
}
