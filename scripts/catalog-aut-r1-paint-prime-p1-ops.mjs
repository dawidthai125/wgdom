/**
 * MOPS P1 — AUT-R1 verified labor-only PLN Evidence
 *   1204-02 · 1505-01 · 1134-01 · 1134-02
 *
 * Source-observed R PLN/m² (do NOT recompute from r-g).
 * Immutable: 0815-05/04 · 2006-04 · 1118-09 · 0829-03 · P0 1014-07 untouched.
 *
 * Dry-run: npx vite-node scripts/catalog-aut-r1-paint-prime-p1-ops.mjs
 * Execute:  npx vite-node scripts/catalog-aut-r1-paint-prime-p1-ops.mjs --execute
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { loadEnv } from "vite";

const EXECUTE = process.argv.includes("--execute");
const OUT = path.join(process.cwd(), ".tmp");
const REPORT = path.join(OUT, "go-aut-r1-paint-prime-p1-report.json");
const PKG_PATH = path.join(OUT, "goa-tpi729-package-payload-v1.json");
const TS = new Date().toISOString();
const NOW_MS = Date.parse(TS);
const CATALOG_KEY = "kw-wgdom-work-catalog";
const EVIDENCE_KEY = "kw-wgdom-labor-source-evidence";

const IMMUTABLE_RATES = {
  "cw.knr.knr-2-02.0815-05.m2": { ourRatePln: 22.88, sourceType: "AUTO_R1" },
  "cw.knr.knr-2-02.0815-04.m2": { ourRatePln: 13.15, sourceType: "AUTO_R1" },
  "cw.knr.knr-2-02.2006-04.m2": { ourRatePln: 9.62, sourceType: "AUTO_R1" },
  "cw.knr.knr-2-02.1118-09.m2": { ourRatePln: 48.2, sourceType: "AUTO_R1" },
  "cw.knr.knr-2-02.0829-03.m2": { ourRatePln: 61.12, sourceType: "AUTO_R1" },
};

/** Evidence pricePoint = source-observed; OUR RATE = canonical 2-dp round. */
const CANDIDATES = [
  {
    tableCode: "1204-02",
    workId: "cw.knr.knr-4-01.1204-02.m2",
    unit: "m2",
    sourceId: "zsckr_bozkow_1204_02",
    sourceUrl:
      "https://zsckrbozkow.pl/wp-content/uploads/2025/05/Szkola-Bozkow-rem-Ip-kosztorys-inwest-pdf.pdf",
    observedName:
      "Dwukrotne malowanie farbami emulsyjnymi starych tynków wewnętrznych ścian (KNR 4-01 1204-02)",
    pricePoint: 3.721,
    expectedOurRatePln: 3.72,
    observedAt: "2025-05-01T00:00:00.000Z",
  },
  {
    tableCode: "1505-01",
    workId: "cw.knr.knr-2-02.1505-01.m2",
    unit: "m2",
    sourceId: "hbstudio_cypisek_1505_01",
    sourceUrl: "https://hbstudio.pl/wp-content/uploads/2017/10/cypisek-ceny-minimalne.pdf",
    observedName:
      "Dwukrotne malowanie farbami emulsyjnymi powierzchni wewnętrznych — tynków gładkich bez gruntowania (KNR 2-02 1505-01)",
    pricePoint: 1.182,
    expectedOurRatePln: 1.18,
    observedAt: "2017-10-01T00:00:00.000Z",
  },
  {
    tableCode: "1134-01",
    workId: "cw.knr.nnrnkb.1134-01.m2",
    unit: "m2",
    sourceId: "lok_lukow_1134_01",
    sourceUrl:
      "https://www.lok.lukow.pl/pobierz/article-d235da9c67851a0efa42a4993de09cb7",
    observedName:
      "Gruntowanie podłoży preparatami — powierzchnie poziome / sufity (NNRNKB 202 1134-01)",
    pricePoint: 1.044,
    expectedOurRatePln: 1.04,
    observedAt: null,
  },
  {
    tableCode: "1134-02",
    workId: "cw.knr.nnrnkb.1134-02.m2",
    unit: "m2",
    sourceId: "lok_lukow_1134_02",
    sourceUrl:
      "https://www.lok.lukow.pl/pobierz/article-d235da9c67851a0efa42a4993de09cb7",
    observedName:
      "Gruntowanie podłoży preparatami — powierzchnie pionowe — ściany i ościeża (NNRNKB 202 1134-02)",
    pricePoint: 1.392,
    expectedOurRatePln: 1.39,
    observedAt: null,
  },
];

const P0_UNTOUCHED = "knr-wc-p31-prod-1787410090884-m2";

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
  `=== AUT-R1 paint/prime P1 · mode=${EXECUTE ? "EXECUTE" : "DRY-RUN"} · HEAD=${head.slice(0, 8)} ===`,
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
const { CHATGPT_KNR_RESEARCH_TPI729_VERIFIED } = await import(
  "../src/lib/intelligent-estimator/knr-knowledge/chatgpt-knr-research-knowledge-data.ts"
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
let evidenceStore = normalizeLaborSourceEvidenceStore(loadLaborSourceEvidenceStoreLocal());

const immutableBefore = {};
for (const [id, exp] of Object.entries(IMMUTABLE_RATES)) {
  const lr = lookupWorkRate(store, id, "m2", NOW_MS);
  immutableBefore[id] = {
    status: lr.status,
    ourRatePln: lr.ourRatePln ?? null,
    sourceType: lr.sourceType ?? null,
    ok:
      lr.status === "CURRENT" &&
      Math.abs(Number(lr.ourRatePln) - exp.ourRatePln) <= 0.009 &&
      lr.sourceType === exp.sourceType,
  };
}

const p0Before = lookupWorkRate(store, P0_UNTOUCHED, "m2", NOW_MS);

/** Ensure ACLC leaves exist (CREATE or IDEMPOTENT) before Evidence/AUT-R1. */
const { executeAutonomousCanonicalLeafCreateMemorySync } = await import(
  "../src/lib/work-catalog/autonomous-canonical-leaf-create.ts"
);
const aclcResults = [];
let aclcMutatedLocal = false;
for (const c of CANDIDATES) {
  const rec = CHATGPT_KNR_RESEARCH_TPI729_VERIFIED.find((r) => r.tableCode === c.tableCode);
  if (!rec) {
    aclcResults.push({ tableCode: c.tableCode, ok: false, reason: "CKRK_MISSING" });
    continue;
  }
  const existing = getWorkByIdFromStore(store, c.workId);
  if (existing) {
    aclcResults.push({
      tableCode: c.tableCode,
      workId: c.workId,
      decision: "ALREADY_PRESENT",
      productionMutation: false,
    });
    continue;
  }
  // Memory-sync CREATE into local store (needed for identityTrusted + AUT-R1).
  // Cloud push only on --execute.
  const exec = executeAutonomousCanonicalLeafCreateMemorySync({
    record: rec,
    store,
    nowIso: TS,
  });
  store = exec.store;
  if (exec.executed || exec.decision === "CREATE") aclcMutatedLocal = true;
  aclcResults.push({
    tableCode: c.tableCode,
    workId: exec.workId || c.workId,
    decision: exec.decision,
    executed: exec.executed,
    productionMutation: false,
    assertOk: exec.assertOk,
    assertReason: exec.assertReason ?? null,
  });
}
let aclcCloudPush = null;
if (EXECUTE && aclcMutatedLocal) {
  saveWorkCatalogStoreLocal(store, { updatedAtIso: TS });
  aclcCloudPush = await pushWorkCatalogStoreToCloudSafe(store, { mode: "union" });
  store = normalizeWorkCatalogStore(loadWorkCatalogStoreLocal());
  for (const row of aclcResults) {
    if (row.decision === "CREATE") row.productionMutation = aclcCloudPush?.ok !== false;
  }
}

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
    categoryKey: `owner_go_mops_p1_${c.tableCode}`,
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
    sourceUrl: c.sourceUrl,
    pricePointExact: c.pricePoint,
    expectedOurRatePln: c.expectedOurRatePln,
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
    provenanceNote:
      "Source-observed labor unit cost R PLN/m2 — Evidence only; OUR RATE only via AUT-R1 (canonical 2-dp).",
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
  const gatesPass =
    row.hostLockOk &&
    row.observation.qualityStatus === "VALID" &&
    row.leafPresent &&
    upsert.ok &&
    contract.decision === "AUT_R1_ACCEPT" &&
    (contract.mayPersistOurRate || contract.idempotentNoop);

  if (EXECUTE && gatesPass) {
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
  } else if (!gatesPass) {
    acceptResult = {
      ok: false,
      skipped: true,
      reason: !row.hostLockOk
        ? "HOST_LOCK_FAIL"
        : row.observation.qualityStatus !== "VALID"
          ? "EVIDENCE_NOT_VALID"
          : !row.leafPresent
            ? "LEAF_MISSING"
            : !upsert.ok
              ? "UPSERT_FAIL"
              : contract.decision !== "AUT_R1_ACCEPT"
                ? `CONTRACT_${contract.decision}`
                : "GATES_FAIL",
    };
  }

  const after = lookupWorkRate(store, c.workId, c.unit, Date.now());
  row.afterLookup = {
    status: after.status,
    ourRatePln: after.ourRatePln ?? null,
    sourceType: after.sourceType ?? null,
  };
  row.rateExactMatch =
    after.status === "CURRENT" &&
    Math.abs(Number(after.ourRatePln) - c.expectedOurRatePln) <= 0.009;
  row.acceptResult = acceptResult;
}

let evidencePush = null;
if (EXECUTE && upsert.ok) {
  evidencePush = await pushKeysToCloud(
    [LABOR_SOURCE_EVIDENCE_STORAGE_KEY],
    [evidenceStore],
  );
}

const immutableAfter = {};
let immutableOk = true;
for (const [id, exp] of Object.entries(IMMUTABLE_RATES)) {
  const lr = lookupWorkRate(store, id, "m2", Date.now());
  const ok =
    lr.status === "CURRENT" &&
    Math.abs(Number(lr.ourRatePln) - exp.ourRatePln) <= 0.009 &&
    lr.sourceType === exp.sourceType;
  if (!ok) immutableOk = false;
  immutableAfter[id] = {
    status: lr.status,
    ourRatePln: lr.ourRatePln ?? null,
    sourceType: lr.sourceType ?? null,
    ok,
  };
}

const p0After = lookupWorkRate(store, P0_UNTOUCHED, "m2", Date.now());
const p0Untouched =
  (p0Before.status === p0After.status ||
    (p0Before.status === "MISSING" && p0After.status === "MISSING")) &&
  (p0Before.ourRatePln ?? null) === (p0After.ourRatePln ?? null);

clearPackRegistryForTests();
clearDefinitionRegistryForTests();
clearCapabilityRegistryForTests();
seedB0Fixtures();
seedScreedEconomyWetCementV1();
ensureBaselineTechnologyPacksRegistered();
const packs = listAllPacks();

let financeBefore = null;
let financeAfter = null;
let offerBoqIdentityResiduals = null;

if (fs.existsSync(PKG_PATH)) {
  const pkgPayload = JSON.parse(fs.readFileSync(PKG_PATH, "utf8"));
  const tenderId = Object.keys(pkgPayload.store.byTenderId)[0];
  const tenderPkg = structuredClone(pkgPayload.store.byTenderId[tenderId]);
  localStorage.setItem(MULTI_DWELLING_PACKAGE_LS_KEY, JSON.stringify(pkgPayload.store));
  upsertTenderPackage(tenderPkg);
  const dwellingId = tenderPkg.dwellings[0].dwellingId;
  const live = getTenderPackage(tenderId);
  const overlaid = overlayTrustedPackageIdentityOntoOfferBoq(live.dwellings[0].offerBoq, live);
  const offerLines = overlaid.document?.lines || live.dwellings[0].offerBoq?.lines || [];

  // Shadow with ORIGINAL catalog (pre) vs CURRENT store (post) — approximate
  // before = rates missing for paint leaves; after = CURRENT rates on leaves (still wrong parents).
  const shadowAfter = computeShadowPositionCostsForOfferBoq({
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
  financeAfter = gapHistFromShadow(shadowAfter);

  const paintParents = new Set([
    "legacy-gladzie_tynki-m2",
    "legacy-malowanie-m2",
    "cw.knr.knr-4-01.1204-02.m2",
    "cw.knr.knr-2-02.1505-01.m2",
    "cw.knr.nnrnkb.1134-01.m2",
    "cw.knr.nnrnkb.1134-02.m2",
  ]);
  const residuals = [];
  for (const line of offerLines) {
    const parent = String(line.catalogWorkId || "");
    const desc = String(line.description || "");
    const isPaintPrime =
      paintParents.has(parent) ||
      /1204-02|1505-01|1134-01|1134-02|malowan|gruntowan/i.test(desc);
    if (!isPaintPrime) continue;
    residuals.push({
      lineId: line.lineId || null,
      catalogWorkId: parent || null,
      description: desc.slice(0, 120),
      needsExactRebind:
        parent === "legacy-gladzie_tynki-m2" || parent === "legacy-malowanie-m2",
    });
  }
  offerBoqIdentityResiduals = {
    count: residuals.length,
    needsRebind: residuals.filter((r) => r.needsExactRebind).length,
    sample: residuals.slice(0, 24),
    notePl:
      "P1 wave did NOT mutate OfferBoq parents — report residual identity rebind separately.",
  };
  financeBefore = {
    notePl:
      "Before histogram not recomputed from frozen pre-store in this run; use prior RCA (BRAK_STAWKI≈44) as baseline reference.",
  };
}

const acceptCurrent = leafResults.filter((r) => r.afterLookup?.status === "CURRENT").length;
const allRatesOk = leafResults.every((r) => r.rateExactMatch === true);

const report = {
  version: "AUT-R1-PAINT-PRIME-P1-v1",
  ts: TS,
  head,
  mode: EXECUTE ? "EXECUTE" : "DRY-RUN",
  changelogTarget: "2.66.207",
  aclcResults,
  aclcCloudPush: aclcCloudPush ? { ok: aclcCloudPush?.ok !== false } : null,
  evidenceUpsert: {
    ok: upsert.ok,
    reason: upsert.ok ? null : upsert.reason,
    messagePl: upsert.ok ? null : upsert.messagePl,
  },
  evidencePush: evidencePush ? { ok: evidencePush?.ok !== false } : null,
  candidates: leafResults,
  immutableRates: { before: immutableBefore, after: immutableAfter, ok: immutableOk },
  p0_1014_07: {
    workId: P0_UNTOUCHED,
    before: { status: p0Before.status, ourRatePln: p0Before.ourRatePln ?? null },
    after: { status: p0After.status, ourRatePln: p0After.ourRatePln ?? null },
    untouched: p0Untouched,
  },
  autR1AcceptCurrentCount: acceptCurrent,
  allExpectedRatesOk: allRatesOk,
  financeBefore,
  financeAfter,
  offerBoqIdentityResiduals,
  hardRule:
    "Source-observed R PLN/m2 is Evidence; OUR RATE only via existing AUT-R1 + canonical 2-dp roundRatePln.",
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      mode: report.mode,
      upsertOk: upsert.ok,
      acceptCurrent,
      allRatesOk,
      immutableOk,
      p0Untouched,
      financeAfter,
      candidates: leafResults.map((r) => ({
        tableCode: r.tableCode,
        hostLockOk: r.hostLockOk,
        quality: r.observation?.qualityStatus,
        decision: r.autR1Contract?.decision,
        reasons: r.autR1Contract?.reasons,
        pricePoint: r.pricePointExact,
        after: r.afterLookup,
        rateExactMatch: r.rateExactMatch,
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

if (EXECUTE && (!immutableOk || !p0Untouched || !allRatesOk || acceptCurrent < 4)) {
  process.exitCode = 1;
}
