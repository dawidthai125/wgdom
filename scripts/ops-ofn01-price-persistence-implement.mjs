/**
 * OFN-01 — PRICE PERSISTENCE IMPLEMENT (Owner GO)
 * CASE A: derived Evidence 55.77 on cw.knr.knr-2-02.1118-09.m2
 * CASE B: CREATE leaf 2003-03 + derived Evidence 118.72
 * ZERO Accept · ZERO OUR RATE write · ZERO compound/package mutate
 *
 * npx vite-node scripts/ops-ofn01-price-persistence-implement.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { loadEnv } from "vite";

const OUT_JSON = path.join(process.cwd(), ".tmp", "ofn01-price-persistence-implement.json");
const OUT_MD = path.join(process.cwd(), ".tmp", "OFN-01-PRICE-PERSISTENCE-IMPLEMENT-REPORT.md");

const CATALOG_KEY = "kw-wgdom-work-catalog";
const META_KEY = "kw-wgdom-work-catalog-meta";
const EVIDENCE_KEY = "kw-wgdom-labor-source-evidence";
const SETTINGS_KEY = "kw-app-settings";

const LEAF_A = "cw.knr.knr-2-02.1118-09.m2";
const LEAF_B = "cw.knr.knr-2-02.2003-03.m2";
const COMPOUND_PODLOGI = "legacy-podlogi-m2";
const PACKAGE_SCIANKI = "cc-w2-scianki-dzialowe-gr-pakiet-m2";
const COMPOUND_GLADZIE = "legacy-gladzie_tynki-m2";
const LEAF_0815 = "cw.knr.knr-2-02.0815-04.m2";

const NAME_B =
  "Ścianki działowe GR z płyt gipsowo-kartonowych na rusztach metalowych z pokryciem obustronnym jednowarstwowym (KNR-W 2-02 2003-03)";

const NOW_ISO = new Date().toISOString();
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
if (!anon) {
  console.error("STOP: brak VITE_SUPABASE_ANON_KEY");
  process.exit(2);
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

async function batchGet(keys) {
  const res = await fetch(`${edge}/batch-get`, {
    method: "POST",
    headers: { Authorization: `Bearer ${anon}`, apikey: anon, "Content-Type": "application/json" },
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

function gitHead() {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function snapshotRates(store, lookupWorkRate, getWorkByIdFromStore) {
  const ids = [LEAF_A, LEAF_B, COMPOUND_PODLOGI, PACKAGE_SCIANKI, COMPOUND_GLADZIE, LEAF_0815];
  const out = {};
  for (const id of ids) {
    const work = getWorkByIdFromStore(store, id);
    const rate = work ? lookupWorkRate(store, id, { region: "WROCLAW" }) : null;
    out[id] = {
      exists: !!work,
      companyPricePln: work?.companyPricePln ?? null,
      ourRate:
        rate?.currentOurRatePln ?? rate?.ourRatePln ?? work?.ourRatePln ?? null,
      unit: work?.unit ?? null,
      namePl: work?.namePl ?? null,
    };
  }
  return out;
}

function obsFor(evidenceStore, workId) {
  return (evidenceStore.observations || []).filter(
    (o) => String(o.workId || "").trim() === workId,
  );
}

function buildProposal(workId, namePl, unit) {
  const now = new Date().toISOString();
  return {
    proposalId: `ofn01-pp-${workId}-${Date.now()}`,
    tenderId: "ocds-148610-15299a87-45b5-465d-872c-6aa6f11f076c",
    normalizedKey: "KNR|knr-2-02|2003-03",
    identityKeyV2: `knr:knr-2-02:2003-03:${unit}`,
    displayCode: "KNR-W 2-02 2003-03",
    family: "knr-2-02",
    catalogId: null,
    tableCode: "2003-03",
    officialNamePl: namePl,
    descriptionPl: namePl,
    unitRaw: unit,
    proposedUnit: unit,
    proposedTradeId: null,
    proposedWorkId: null,
    knrEvidenceRefs: [
      {
        kind: "ownerGo",
        refId: "OFN01_PRICE_PERSISTENCE",
        detail: "Owner GO CREATE exact leaf 2003-03 · no OUR RATE",
      },
    ],
    verificationState: "PENDING_VERIFY",
    similarWorks: [],
    duplicateRisk: "NONE",
    recommendation: "CREATE_NEW",
    ownerDecision: "CREATE_NEW",
    sourceStatus: "TENDER",
    discoveryStatus: "NOT_NEEDED",
    unitStatus: "OK",
    lineRefs: [],
    notes: ["OFN-01 PRICE PERSISTENCE · CREATE leaf · companyPricePln=0 · no Accept"],
    createdAt: now,
    updatedAt: now,
  };
}

const head = gitHead();
console.log("=== OFN-01 PRICE PERSISTENCE IMPLEMENT ===");
console.log(`HEAD=${head}`);
console.log("Accept=NIE · OUR RATE write=NIE · compound/package=NIE");

const {
  normalizeWorkCatalogStore,
  saveWorkCatalogStoreLocal,
  loadWorkCatalogStoreLocal,
  WORK_CATALOG_STORAGE_KEY,
} = await import("../src/lib/work-catalog/work-catalog-store.ts");
const { getWorkByIdFromStore } = await import("../src/lib/work-catalog/catalog-work-utils.ts");
const { lookupWorkRate } = await import("../src/lib/work-catalog/work-rate-lookup.ts");
const {
  normalizeWorkCatalogMeta,
  writeWorkCatalogMetaToLs,
} = await import("../src/lib/work-catalog/work-catalog-meta.ts");
const { pushWorkCatalogStoreToCloudSafe } = await import(
  "../src/lib/work-catalog/work-catalog-cloud-push.ts"
);
const { executeKnrWcCatalogWorkCreate } = await import(
  "../src/lib/intelligent-estimator/knr-wc-identity-bridge-create.ts"
);
const { canWriteWorkCatalog } = await import("../src/lib/catalog-write-router.ts");
const { pushKeysToCloud } = await import("../src/lib/cloud-sync.ts");
const {
  normalizeLaborSourceEvidenceStore,
  saveLaborSourceEvidenceStoreLocal,
  LABOR_SOURCE_EVIDENCE_STORAGE_KEY,
  buildDerivedLaborSourceEvidenceObservation,
  upsertLaborSourceEvidenceObservations,
  assertDerivedLaborEvidenceHostLock,
  resolveOwnerDerivedLaborInputRoute,
  FORMULA_LABOR_NORM_X_RATE,
  FORMULA_LABOR_NORM_X_RATE_VERSION,
} = await import("../src/lib/labor-source-evidence/index.ts");
const { evaluateLaborEvidenceReuseSufficiency } = await import(
  "../src/lib/work-catalog/labor-evidence-reuse-sufficiency.ts"
);

const keys = [CATALOG_KEY, META_KEY, EVIDENCE_KEY, SETTINGS_KEY];
const kv0 = await batchGet(keys);
const picked0 = pickByKeyOrder(kv0, keys);
if (!picked0[CATALOG_KEY]) throw new Error("brak kw-wgdom-work-catalog");

localStorage.setItem(WORK_CATALOG_STORAGE_KEY, JSON.stringify(picked0[CATALOG_KEY]));
writeWorkCatalogMetaToLs(normalizeWorkCatalogMeta(picked0[META_KEY]));
localStorage.setItem(
  LABOR_SOURCE_EVIDENCE_STORAGE_KEY,
  JSON.stringify(picked0[EVIDENCE_KEY] || { schemaVersion: 2, observations: [], revision: 0, etag: "", updatedAt: NOW_ISO }),
);

let store = normalizeWorkCatalogStore(loadWorkCatalogStoreLocal());
let evidenceStore = normalizeLaborSourceEvidenceStore(
  JSON.parse(localStorage.getItem(LABOR_SOURCE_EVIDENCE_STORAGE_KEY) || "null"),
);
const settings = picked0[SETTINGS_KEY] || undefined;
const writeOk = canWriteWorkCatalog(settings);

const ratesBefore = snapshotRates(store, lookupWorkRate, getWorkByIdFromStore);
const evidenceBeforeA = obsFor(evidenceStore, LEAF_A);
const evidenceBeforeB = obsFor(evidenceStore, LEAF_B);
const evidenceBefore0815 = obsFor(evidenceStore, LEAF_0815);

const KOB = resolveOwnerDerivedLaborInputRoute("bip_kobylin_1118_09_labor_norm");
const ZG = resolveOwnerDerivedLaborInputRoute("sr_zielona_gora_2003_03_labor_norm");
const BZG = resolveOwnerDerivedLaborInputRoute("bzg_tynkarskie_cr_q2_2026");
if (!KOB || !ZG || !BZG) throw new Error("missing derived input routes — code not loaded?");

const report = {
  packageId: "OFN-01-PRICE-PERSISTENCE-IMPLEMENT",
  at: NOW_ISO,
  head,
  CASE_A: {},
  CASE_B: {},
  CONFLICT_0815: {},
  REGRESSION: {},
  mutations: [],
};

// ——— CASE B CREATE (before Evidence B) ———
let leafCreated = false;
if (getWorkByIdFromStore(store, LEAF_B)) {
  leafCreated = false;
  report.CASE_B.LEAF_CREATED = "ALREADY_EXISTS";
  console.log("CASE B leaf already exists");
} else if (!writeOk) {
  report.CASE_B.LEAF_CREATED = "BLOCKED_LEGACY_ONLY";
  console.error("CASE B CREATE blocked: catalog write legacy_only");
} else {
  const proposal = buildProposal(LEAF_B, NAME_B, "m2");
  const createResult = await executeKnrWcCatalogWorkCreate({
    proposal,
    workId: LEAF_B,
    store,
    settings,
    ownerDecision: "CREATE_NEW",
    runtimeP3Enabled: true,
    persistMode: "memory_only",
    nowIso: NOW_ISO,
  });
  if (!createResult.ok) {
    report.CASE_B.LEAF_CREATED = `FAIL:${createResult.reason}`;
    report.CASE_B.createMessage = createResult.message;
    console.error("CREATE FAIL", createResult);
  } else {
    store = normalizeWorkCatalogStore(createResult.store);
    saveWorkCatalogStoreLocal(store, { updatedAtIso: NOW_ISO });
    const push = await pushWorkCatalogStoreToCloudSafe(store, {
      mode: "union",
      reason: `ofn01-price-persistence-create:${LEAF_B}`,
    });
    leafCreated = true;
    report.CASE_B.LEAF_CREATED = "YES";
    report.CASE_B.catalogPush = { ok: push?.ok !== false, detail: push };
    report.mutations.push({ action: "CREATE_LEAF", workId: LEAF_B, ourRate: null });
    console.log("CASE B CREATE OK", LEAF_B);
  }
}

// refresh catalog from cloud after create
{
  const kvC = await batchGet([CATALOG_KEY]);
  const live = normalizeWorkCatalogStore(unwrap(kvC.values?.[0]));
  store = live;
  localStorage.setItem(WORK_CATALOG_STORAGE_KEY, JSON.stringify(live));
}

async function persistDerived({ leaf, namePl, observedName, normRoute, normValue, pricePoint, notesPl }) {
  const already = obsFor(evidenceStore, leaf).some(
    (o) =>
      o.priceKind === "derived" &&
      o.derivation?.formulaId === FORMULA_LABOR_NORM_X_RATE &&
      Math.abs(Number(o.pricePoint) - pricePoint) < 0.005,
  );
  if (already) {
    return { status: "SKIP_ALREADY", observation: null };
  }
  const built = buildDerivedLaborSourceEvidenceObservation({
    workId: leaf,
    workNamePl: namePl,
    observedName,
    unit: "m2",
    region: "POLSKA",
    identityMatched: true,
    identityMethod: "exact_name",
    laborOnly: true,
    includesMaterial: false,
    formulaId: FORMULA_LABOR_NORM_X_RATE,
    formulaVersion: FORMULA_LABOR_NORM_X_RATE_VERSION,
    inputs: [
      {
        inputId: "norm_rg",
        role: "labor_norm",
        inputValue: normValue,
        inputUnit: "r-g/m2",
        sourceId: normRoute.sourceId,
        sourceUrl: normRoute.url,
        host: normRoute.host,
        observedAt: NOW_ISO,
        retrievedAt: NOW_ISO,
        identityRef: leaf,
        periodLabel: null,
      },
      {
        inputId: "cost_rate_cr",
        role: "labor_cost_rate",
        inputValue: 52.3,
        inputUnit: "PLN/r-g",
        sourceId: BZG.sourceId,
        sourceUrl: BZG.url,
        host: BZG.host,
        observedAt: BZG.documentObservedAt || "2026-04-01T00:00:00.000Z",
        retrievedAt: NOW_ISO,
        identityRef: leaf,
        periodLabel: BZG.periodLabel,
        publisher: "INTERCENBUD",
      },
    ],
    calculatedAt: NOW_ISO,
    retrievedAt: NOW_ISO,
    pricePoint,
    sourceUrl: normRoute.url,
    categoryKey: `OFN01_PRICE_PERSISTENCE|notesPl=${notesPl}|capturedAt=${NOW_ISO}`,
  });
  if (!built.ok) {
    return { status: "BUILD_FAIL", message: built.messagePl, reason: built.reason };
  }
  const host = assertDerivedLaborEvidenceHostLock(built.observation);
  if (!host.ok) {
    return { status: "HOST_FAIL", message: host.messagePl };
  }
  // stamp provenance audit fields already on observation
  built.observation.provenance = {
    ...built.observation.provenance,
    sectionHint: notesPl,
    pageTitle: `OFN-01 PRICE PERSISTENCE · capturedAt=${NOW_ISO}`,
  };
  const upsert = upsertLaborSourceEvidenceObservations({
    observations: [built.observation],
    nowIso: NOW_ISO,
  });
  if (!upsert.ok) {
    return { status: "UPSERT_FAIL", message: upsert.messagePl, reason: upsert.reason };
  }
  evidenceStore = upsert.store;
  saveLaborSourceEvidenceStoreLocal(evidenceStore);
  const push = await pushKeysToCloud([LABOR_SOURCE_EVIDENCE_STORAGE_KEY], [evidenceStore]);
  return {
    status: "PERSISTED",
    pricePoint: built.observation.pricePoint,
    priceKind: built.observation.priceKind,
    evidenceId: built.observation.evidenceId,
    derivation: built.observation.derivation,
    provenance: built.observation.provenance,
    pushOk: push?.ok !== false,
    push,
  };
}

// ——— CASE A ———
console.log("CASE A persist 55.77…");
const resA = await persistDerived({
  leaf: LEAF_A,
  namePl: "Okładziny z płytek kamienia sztucznego 30×30 (KNR 2-02 1118-09)",
  observedName: "KNR 2-02 1118-09 · BIP Kobylin 1.0664 r-g/m2 × Cr 52.30",
  normRoute: KOB,
  normValue: 1.0664,
  pricePoint: 55.77,
  notesPl: "1.0664×52.30=55.77 · PARTITION/HOLD ok · ≠ OUR RATE Accept",
});
report.CASE_A.persist = resA;
report.mutations.push({ action: "EVIDENCE_DERIVED", workId: LEAF_A, result: resA.status });

// ——— CASE B Evidence ———
console.log("CASE B persist 118.72…");
const leafBExists = !!getWorkByIdFromStore(store, LEAF_B);
let resB = { status: "SKIP_NO_LEAF" };
if (leafBExists) {
  resB = await persistDerived({
    leaf: LEAF_B,
    namePl: NAME_B,
    observedName: "KNR-W 2-02 2003-03 · SR Zielona Góra 2.27 r-g/m2 × Cr 52.30",
    normRoute: ZG,
    normValue: 2.27,
    pricePoint: 118.72,
    notesPl: "2.27×52.30=118.72 · PACKAGE_MISMATCH ok · ≠ package OUR RATE",
  });
  report.mutations.push({ action: "EVIDENCE_DERIVED", workId: LEAF_B, result: resB.status });
}
report.CASE_B.persist = resB;

// ——— Live read-back ———
const kvRb = await batchGet([CATALOG_KEY, EVIDENCE_KEY]);
const pickedRb = pickByKeyOrder(kvRb, [CATALOG_KEY, EVIDENCE_KEY]);
store = normalizeWorkCatalogStore(pickedRb[CATALOG_KEY]);
evidenceStore = normalizeLaborSourceEvidenceStore(pickedRb[EVIDENCE_KEY]);
const ratesAfter = snapshotRates(store, lookupWorkRate, getWorkByIdFromStore);

const afterA = obsFor(evidenceStore, LEAF_A);
const afterB = obsFor(evidenceStore, LEAF_B);
const after0815 = obsFor(evidenceStore, LEAF_0815);
const derivedA = afterA.find(
  (o) => o.priceKind === "derived" && Math.abs(Number(o.pricePoint) - 55.77) < 0.005,
);
const derivedB = afterB.find(
  (o) => o.priceKind === "derived" && Math.abs(Number(o.pricePoint) - 118.72) < 0.005,
);

const prices0815 = after0815
  .filter((o) => o.qualityStatus === "VALID")
  .map((o) => Number(o.pricePoint))
  .filter((n) => Number.isFinite(n));
const has1315 = prices0815.some((p) => Math.abs(p - 13.15) < 0.005);
const has2664 = prices0815.some((p) => Math.abs(p - 26.64) < 0.005);
const suf0815 = evaluateLaborEvidenceReuseSufficiency({
  workId: LEAF_0815,
  unit: "m2",
  namePl: "gładzie",
  ourRateFreshness: "MISSING",
  observations: after0815,
});

report.CASE_A = {
  ...report.CASE_A,
  LEAF: LEAF_A,
  LEAF_EXISTS: ratesAfter[LEAF_A].exists,
  PRICE: derivedA?.pricePoint ?? null,
  PRICE_KIND: derivedA?.priceKind ?? null,
  EVIDENCE: derivedA ? "YES" : "NO",
  PROVENANCE: derivedA
    ? {
        sourceId: derivedA.sourceId,
        sourceUrl: derivedA.sourceUrl,
        observedAt: derivedA.observedAt,
        retrievedAt: derivedA.retrievedAt,
        calculatedAt: derivedA.derivation?.calculatedAt,
        formulaId: derivedA.derivation?.formulaId,
        formulaVersion: derivedA.derivation?.formulaVersion,
        inputs: derivedA.derivation?.inputs?.map((i) => ({
          role: i.role,
          value: i.inputValue,
          sourceId: i.sourceId,
          sourceUrl: i.sourceUrl,
        })),
        notesPl: derivedA.provenance?.sectionHint || derivedA.categoryKey,
      }
    : null,
  OUR_RATE_BEFORE: ratesBefore[LEAF_A].ourRate,
  OUR_RATE_AFTER: ratesAfter[LEAF_A].ourRate,
  OUR_RATE_CHANGED: ratesBefore[LEAF_A].ourRate !== ratesAfter[LEAF_A].ourRate,
  COMPOUND_PODLOGI_RATE_BEFORE: ratesBefore[COMPOUND_PODLOGI].ourRate,
  COMPOUND_PODLOGI_RATE_AFTER: ratesAfter[COMPOUND_PODLOGI].ourRate,
  COMPOUND_CHANGED:
    ratesBefore[COMPOUND_PODLOGI].ourRate !== ratesAfter[COMPOUND_PODLOGI].ourRate,
};

report.CASE_B = {
  ...report.CASE_B,
  LEAF: LEAF_B,
  LEAF_EXISTS: ratesAfter[LEAF_B].exists,
  PRICE: derivedB?.pricePoint ?? null,
  PRICE_KIND: derivedB?.priceKind ?? null,
  EVIDENCE: derivedB ? "YES" : "NO",
  PROVENANCE: derivedB
    ? {
        sourceId: derivedB.sourceId,
        sourceUrl: derivedB.sourceUrl,
        observedAt: derivedB.observedAt,
        retrievedAt: derivedB.retrievedAt,
        calculatedAt: derivedB.derivation?.calculatedAt,
        formulaId: derivedB.derivation?.formulaId,
        formulaVersion: derivedB.derivation?.formulaVersion,
        inputs: derivedB.derivation?.inputs?.map((i) => ({
          role: i.role,
          value: i.inputValue,
          sourceId: i.sourceId,
          sourceUrl: i.sourceUrl,
        })),
        notesPl: derivedB.provenance?.sectionHint || derivedB.categoryKey,
      }
    : null,
  OUR_RATE_AFTER: ratesAfter[LEAF_B].ourRate,
  OUR_RATE_CHANGED: ratesAfter[LEAF_B].ourRate != null,
  PACKAGE_RATE_BEFORE: ratesBefore[PACKAGE_SCIANKI].ourRate,
  PACKAGE_RATE_AFTER: ratesAfter[PACKAGE_SCIANKI].ourRate,
  PACKAGE_CHANGED:
    ratesBefore[PACKAGE_SCIANKI].ourRate !== ratesAfter[PACKAGE_SCIANKI].ourRate,
  companyPricePln: ratesAfter[LEAF_B].companyPricePln,
};

report.CONFLICT_0815 = {
  "13_15": has1315,
  "26_64": has2664,
  CONFLICT: suf0815.status,
  sufficient: suf0815.sufficient,
  OUR_RATE: ratesAfter[LEAF_0815].ourRate,
  obsCount: after0815.length,
};

report.REGRESSION = {
  TPI729: "ocds-148610-15299a87-45b5-465d-872c-6aa6f11f076c",
  legacy_podlogi_unchanged:
    ratesBefore[COMPOUND_PODLOGI].ourRate === ratesAfter[COMPOUND_PODLOGI].ourRate,
  package_scianki_unchanged:
    ratesBefore[PACKAGE_SCIANKI].ourRate === ratesAfter[PACKAGE_SCIANKI].ourRate,
  legacy_gladzie_unchanged:
    ratesBefore[COMPOUND_GLADZIE].ourRate === ratesAfter[COMPOUND_GLADZIE].ourRate,
};

report.HOLD_DOES_NOT_DELETE_PRICE =
  Boolean(derivedA) || Boolean(derivedB) ? "PASS" : "FAIL";

report.OFN01_PRICE_PERSISTENCE_IMPLEMENT =
  derivedA &&
  derivedB &&
  ratesAfter[LEAF_B].exists &&
  !report.CASE_A.OUR_RATE_CHANGED &&
  !report.CASE_A.COMPOUND_CHANGED &&
  !report.CASE_B.OUR_RATE_CHANGED &&
  !report.CASE_B.PACKAGE_CHANGED &&
  has1315 &&
  has2664 &&
  suf0815.status === "CONFLICT"
    ? "COMPLETE"
    : "BLOCKED";

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
fs.writeFileSync(
  OUT_MD,
  `# OFN-01 PRICE PERSISTENCE IMPLEMENT\n\n\`\`\`\n${report.OFN01_PRICE_PERSISTENCE_IMPLEMENT}\n\`\`\`\n\nSee \`${path.basename(OUT_JSON)}\`.\n`,
);

console.log(JSON.stringify({
  OFN01_PRICE_PERSISTENCE_IMPLEMENT: report.OFN01_PRICE_PERSISTENCE_IMPLEMENT,
  CASE_A: {
    EVIDENCE: report.CASE_A.EVIDENCE,
    PRICE: report.CASE_A.PRICE,
    OUR_RATE_CHANGED: report.CASE_A.OUR_RATE_CHANGED,
  },
  CASE_B: {
    LEAF_CREATED: report.CASE_B.LEAF_CREATED,
    EVIDENCE: report.CASE_B.EVIDENCE,
    PRICE: report.CASE_B.PRICE,
  },
  CONFLICT_0815: report.CONFLICT_0815,
}, null, 2));

if (report.OFN01_PRICE_PERSISTENCE_IMPLEMENT !== "COMPLETE") process.exit(1);
