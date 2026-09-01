/**
 * IK FULL PIPELINE E2E — CHROBREGO G1 read-only validation (56/0 CLOSED).
 *
 * OWNER_GO_FULL_IK_E2E_TEST · ZERO production writes · ZERO Research HTTP · ZERO Accept.
 * Continuity: Master SSOT Decision Tree · current repo code · cloud batch-get READ only.
 *
 * Run: npx vite-node scripts/test-ik-full-pipeline-e2e.mjs
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadEnv } from "vite";

Object.assign(process.env, loadEnv("", process.cwd(), ""));

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, ".tmp-chrobrego-g1-audit");
const GATE_FIXTURE = join(OUT, "owner-decision-gate-v2.json");

const PIPE = "08df0363-7b22-e462-ab56-940001283cba";
const OCDS = "ocds-148610-6f859612-6631-426b-83fc-830bfec1c888";
const BILLABLE = 56;

const PRIOR_OWNER = [
  { lineId: "obl_fb589a5", catalogWorkId: "legacy-stolarka-szt" },
  { lineId: "obl_cd09c493", catalogWorkId: "legacy-transport_utylizacja-m3" },
  { lineId: "obl_a0670147", catalogWorkId: "legacy-hydraulika-szt" },
  { lineId: "obl_89ec929d", catalogWorkId: "legacy-hydraulika-szt" },
  { lineId: "obl_2bab1159", catalogWorkId: "legacy-hydraulika-szt" },
  { lineId: "obl_56d7a90b", catalogWorkId: "legacy-hydraulika-szt" },
  { lineId: "obl_b243d765", catalogWorkId: "legacy-hydraulika-szt" },
];

const PROTECTED = [
  { id: "legacy-malowanie-m2", unit: "m2", rate: 22.9, lo: true, marginLocal: 20 },
  { id: "p2b-montaz-wylacznikow-szt", unit: "szt", rate: 19, lo: true },
  { id: "p2b-montaz-gniazd-lacznikow-szt", unit: "szt", rate: 63, lo: true },
  { id: "p2b-montaz-opraw-oswietleniowych-szt", unit: "szt", rate: 193, lo: true },
  { id: "p2b-podlaczenie-kuchenki-elektrycznej-szt", unit: "szt", rate: 286, lo: true },
  { id: "p2b-demontaz-baterii-armatury-szt", unit: "szt", rate: 49, lo: true },
  { id: "p2b-montaz-zlewozmywaka-szt", unit: "szt", rate: 234, lo: true },
  { id: "p2b-demontaz-wanny-kpl", unit: "kpl", rate: 200, lo: true },
  { id: "legacy-malowanie-rur-mb", unit: "mb", rate: 31.25, lo: true },
  { id: "p2b-listwa-wykonczajaca-prog-plytki-mb", unit: "mb", rate: 80, lo: true },
];

const LP22_WORK = "p2b-skrzydla-drzwiowe-wewnetrzne-m2";

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

/** Production-write guard telemetry */
const writes = {
  batchGet: 0,
  batchSet: 0,
  researchHttp: 0,
  accept: 0,
  ourRateWrite: 0,
  candidatePersist: 0,
  identityCreate: 0,
  identityRebind: 0,
  catalogMutation: 0,
  laborOnlyWrite: 0,
  bomManualWrite: 0,
  priceMemoryWrite: 0,
  workQuotesWrite: 0,
  g2: 0,
  p7: 0,
  g3: 0,
  tree: 0,
  payroll: 0,
  commit: 0,
  push: 0,
  deploy: 0,
};

const stages = {};
const warnings = [];
const failures = [];
/** Filled later on full READY path; empty when BLOCKED_PARTIAL_DOC_EXPERT exits early. */
let protectedResults = {};

let catalogFingerprintBefore = null;
let catalogRevisionBefore = null;

const realFetch = globalThis.fetch?.bind(globalThis);
globalThis.fetch = async (input, init) => {
  const url = String(input instanceof Request ? input.url : input);
  if (/\/batch-set\b/i.test(url)) {
    writes.batchSet += 1;
    throw new Error(`FORBIDDEN_BATCH_SET ${url}`);
  }
  if (/batch-get/i.test(url)) {
    writes.batchGet += 1;
  } else if (
    /work-rate|mmr-diy|PRICE_DEMAND|research|lease|tenders-bzp/i.test(url) &&
    !/batch-get/i.test(url)
  ) {
    writes.researchHttp += 1;
    throw new Error(`FORBIDDEN_RESEARCH_HTTP ${url}`);
  }
  if (!realFetch) throw new Error("NO_FETCH");
  return realFetch(input, init);
};

function stage(name, pass, detail) {
  stages[name] = { pass: !!pass, ...(detail ?? {}) };
  if (!pass) failures.push(name);
}

function warn(msg) {
  warnings.push(msg);
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
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!anon) throw new Error("missing VITE_SUPABASE_ANON_KEY");
  const edge =
    "https://bdpygdvfgbggermvqtys.supabase.co/functions/v1/make-server-0afb8820";
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

function catalogFingerprint(store) {
  const wro = store?.catalogs?.wroclaw?.works?.length ?? 0;
  const rev = store?.catalogRevision ?? store?.updatedAt ?? "";
  return `${wro}|${rev}`;
}

function runChildSuite(rel) {
  const r = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["vite-node", rel],
    { cwd: ROOT, encoding: "utf8", shell: true },
  );
  const out = (r.stdout || "") + (r.stderr || "");
  const ok = r.status === 0;
  return { ok, status: r.status ?? 1, out: out.slice(-1200) };
}

// --- imports (after fetch guard) ---
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";
import {
  getWorkByIdFromStore,
  listActiveWorksForRegion,
} from "../src/lib/work-catalog/catalog-work-utils.ts";
import { lookupWorkRate } from "../src/lib/work-catalog/work-rate-lookup.ts";
import { resolveLaborInputFromOurWorkRate } from "../src/lib/tender-position-cost/our-rate-labor-adapter.ts";
import {
  isExplicitLaborOnlyWork,
  isMaterialsRequiredWork,
} from "../src/lib/tender-position-cost/labor-only-classification.ts";
import { resolveLaborOnlyBomForWork } from "../src/lib/tender-position-cost/bom-technology-adapter.ts";
import { classifyEstimatorPricingPlane } from "../src/lib/intelligent-estimator/classification-gate.ts";
import { getOwnerClassificationPlane } from "../src/lib/intelligent-estimator/owner-classification-map.ts";
import {
  computeSellPricePln,
  resolveMarginPct,
} from "../src/lib/price-intelligence/our-price-catalog.ts";
import {
  defaultAppSettings,
  loadAppSettingsLocal,
  syncAppSettingsFromCloud,
} from "../src/lib/app-settings.ts";
import {
  forceIkEntryEnabledForTests,
  forceIkLaborResearchForTests,
  forceIkMaterialResearchForTests,
  forceIkF5E2eForTests,
  isIkP5LaborExecuteResearchActive,
  isIkP6MaterialExecuteResearchActive,
  isIkP7F5E2eActive,
} from "../src/lib/intelligent-estimator/ik-entry-flag.ts";
import { runIkDocumentExpert } from "../src/lib/intelligent-estimator/ik-document-expert.ts";
import { mapOfferBoqLine } from "../src/lib/tender-offer-boq-mapping.ts";
import { buildG1ManualOverride } from "../src/lib/intelligent-estimator/orchestra/ik-owner-gate-actions.ts";
import { runIkIdentityPhase } from "../src/lib/intelligent-estimator/orchestra/ik-identity-phase.ts";
import {
  computeShadowPositionCostsForOfferBoq,
  evaluateBidCutoverGate,
  resolveMaterialSellFromCatalogWorkQuotes,
} from "../src/lib/tender-position-cost/index.ts";
import {
  listChrobregoSplitRebinds,
  listChrobregoPollutionUnbinds,
} from "../src/lib/work-catalog/ik-owner-create-chrobrego-elec-hydro-split.ts";
import { listChrobregoClassifyRebinds } from "../src/lib/work-catalog/ik-owner-create-chrobrego-classification-lp22-30-48.ts";
import { runIkCompositeBothHold } from "../src/lib/intelligent-estimator/ik-composite-both-hold.ts";

function buildManuals(gate) {
  const splitByLine = new Map(listChrobregoSplitRebinds().map((r) => [r.lineId, r]));
  const unbindByLine = new Map(
    listChrobregoPollutionUnbinds().map((u) => [u.lineId, u]),
  );
  const classifyByLine = new Map(
    listChrobregoClassifyRebinds().map((r) => [r.lineId, r]),
  );
  const map = new Map();
  for (const ov of [
    ...(gate.overrides || []).map((o) => ({
      dwellingId: o.dwellingId || "legacy_single",
      lineId: o.lineId,
      catalogWorkId: o.catalogWorkId,
    })),
    ...PRIOR_OWNER.map((o) => ({ dwellingId: "legacy_single", ...o })),
    ...[...unbindByLine.values()].map((u) => ({
      dwellingId: "legacy_single",
      lineId: u.lineId,
      catalogWorkId: u.toWorkId,
    })),
    ...[...classifyByLine.values()].map((r) => ({
      dwellingId: "legacy_single",
      lineId: r.lineId,
      catalogWorkId: r.newWorkId,
    })),
  ]) {
    const unbind = unbindByLine.get(ov.lineId);
    const split = splitByLine.get(ov.lineId);
    const classify = classifyByLine.get(ov.lineId);
    map.set(
      ov.lineId,
      buildG1ManualOverride({
        dwellingId: ov.dwellingId,
        lineId: ov.lineId,
        catalogWorkId: unbind
          ? unbind.toWorkId
          : classify
            ? classify.newWorkId
            : split
              ? split.newWorkId
              : ov.catalogWorkId,
      }),
    );
  }
  return [...map.values()];
}

function snapRate(store, workId, unit) {
  const r = lookupWorkRate(store, workId, unit, Date.now());
  const labor = resolveLaborInputFromOurWorkRate(store, workId, unit, Date.now());
  const w = getWorkByIdFromStore(store, workId);
  return {
    ourRatePln: r.ourRatePln ?? labor.ourRatePln ?? null,
    status: r.status,
    sourceType: r.sourceType ?? null,
    lo: isExplicitLaborOnlyWork(workId),
    companyPricePln: w?.companyPricePln ?? 0,
    marginLocal: w?.commercialPricing?.marginPct ?? null,
  };
}

console.log("=== IK FULL PIPELINE E2E (CHROBREGO G1 · READ-ONLY) ===");
const t0 = Date.now();

mkdirSync(OUT, { recursive: true });

// Decision Tree compliance — fixture present (identity config, not report SSOT)
stage(
  "decisionTreeFixture",
  existsSync(GATE_FIXTURE),
  { path: GATE_FIXTURE, note: "Owner Decision Gate v2 identity fixture" },
);
if (!existsSync(GATE_FIXTURE)) {
  writeReport(t0, 1);
  process.exit(1);
}

forceIkEntryEnabledForTests(false);
forceIkLaborResearchForTests(false);
forceIkMaterialResearchForTests(false);
forceIkF5E2eForTests(false);

await syncAppSettingsFromCloud();
console.log("[stage] settings synced");
const settings = loadAppSettingsLocal();
localStorage.setItem("kw-app-settings", JSON.stringify(settings));

stage(
  "p5p6ExecuteResearchOff",
  !isIkP5LaborExecuteResearchActive() &&
    !isIkP6MaterialExecuteResearchActive() &&
    !isIkP7F5E2eActive(),
  {
    ikEntry: settings.ikEntryEnabled,
    laborE2e: settings.ikLaborE2eEnabled,
    materialE2e: settings.ikMaterialE2eEnabled,
    f5: settings.ikF5E2eEnabled,
  },
);

const gate = JSON.parse(readFileSync(GATE_FIXTURE, "utf8"));
stage(
  "decisionTreeTenderMatch",
  gate.tenderId === PIPE && gate.ocds === OCDS,
  { tenderId: gate.tenderId, ocds: gate.ocds },
);

const bg1 = await batchGet(["kw-tenders-pipeline", "kw-wgdom-work-catalog"]);
console.log("[stage] batch-get pipeline + catalog");
let pipe = unwrap(bg1.values[0]);
if (pipe?.items) pipe = pipe.items;
const item = pipe.find((x) => x?.id === PIPE);
stage("documentFetchTender", !!item && item.tenderId === OCDS, {
  found: !!item,
  tenderId: item?.tenderId ?? null,
});

let store = normalizeWorkCatalogStore(unwrap(bg1.values[1]));
catalogFingerprintBefore = catalogFingerprint(store);
catalogRevisionBefore = store.catalogRevision ?? null;
localStorage.setItem("kw-wgdom-work-catalog", JSON.stringify(store));

// 1–3 Document expert / BOQ extraction
const expert = runIkDocumentExpert({ item, package: null });
console.log("[stage] document expert", expert.status, expert.masterBoq?.lineCount);
stage(
  "documentDiscovery",
  expert.status === "ready" || expert.status === "partial",
  { status: expert.status, reasons: expert.reasons?.length ?? 0 },
);
stage(
  "boqExtraction",
  expert.masterBoq?.readyForExperts === true && (expert.masterBoq?.lineCount ?? 0) >= BILLABLE,
  {
    lineCount: expert.masterBoq?.lineCount ?? 0,
    readyForExperts: expert.masterBoq?.readyForExperts,
  },
);

const offerBoqRaw = expert.offerBoq;
stage(
  "offerBoqPresent",
  !!offerBoqRaw?.lines?.length && offerBoqRaw.lines.length >= BILLABLE,
  { lines: offerBoqRaw?.lines?.length ?? 0 },
);

// 4 BOQ mapping sample
let mapOk = true;
let mapCount = 0;
for (const line of (offerBoqRaw?.lines ?? []).slice(0, 8)) {
  try {
    const mapped = mapOfferBoqLine(line, listActiveWorksForRegion(store, store.activeRegion));
    if (mapped) mapCount += 1;
  } catch {
    mapOk = false;
  }
}
stage("boqMapping", mapOk && mapCount >= 4, { sampleMapped: mapCount });

// Hard-stop: Document Expert not READY → no Identity / persist / shadow cascade.
// package:null + multi-source without dwelling map ⇒ partial + masterBoqLines=[] is
// a harness contract blocker, not Identity/Document Expert runtime defect.
if (expert.masterBoq?.readyForExperts !== true) {
  const blockDetail = {
    blocked: true,
    classification: "BLOCKED_PARTIAL_DOC_EXPERT",
    reason: "Document Expert not ready — Identity/shadow path requires readyForExperts===true",
    status: expert.status,
    readyForExperts: expert.masterBoq?.readyForExperts === true,
    reasons: expert.reasons ?? [],
    masterBoqLineCount: expert.masterBoq?.lineCount ?? 0,
    masterBoqLinesLength: expert.masterBoqLines?.length ?? 0,
    offerBoqLinesLength: expert.offerBoq?.lines?.length ?? 0,
    dwellingMappingAllMapped: expert.dwellingMapping?.allMapped ?? null,
    packagePassed: null,
  };
  stage("BLOCKED_PARTIAL_DOC_EXPERT", false, blockDetail);
  console.log("FULL PIPELINE BLOCKED");
  console.log("reason:", blockDetail.reason);
  console.log("status:", blockDetail.status);
  console.log("readyForExperts:", blockDetail.readyForExperts);
  console.log("reasons:", JSON.stringify(blockDetail.reasons, null, 2));
  console.log("masterBoq.lineCount:", blockDetail.masterBoqLineCount);
  console.log("masterBoqLines.length:", blockDetail.masterBoqLinesLength);
  console.log("offerBoq.lines.length:", blockDetail.offerBoqLinesLength);
  console.log("dwellingMapping.allMapped:", blockDetail.dwellingMappingAllMapped);
  console.log("=== IK FULL PIPELINE E2E BLOCKED_PARTIAL_DOC_EXPERT ===");
  writeReport(t0, 2);
  process.exit(2);
}

// 5 Identity
const works = listActiveWorksForRegion(store, store.activeRegion);
const manuals = buildManuals(gate);
const phase = runIkIdentityPhase({
  structuralReport: expert,
  sliceDExpert: expert,
  item,
  package: null,
  manualOverrides: manuals,
  works,
});
console.log("[stage] identity phase");
const offerBoq = phase.context.persistPlans[0]?.offerBoq;
const identityRows = offerBoq?.lines ?? [];
stage(
  "identitySummary",
  identityRows.length >= BILLABLE,
  {
    lines: identityRows.length,
    withCatalogWorkId: identityRows.filter((l) => l.catalogWorkId).length,
    persistPlanCount: phase.context.persistPlans?.length ?? 0,
  },
);

if (!offerBoq?.lines) {
  console.error(
    "[stage] shadow BLOCKED — persistPlans[0]?.offerBoq undefined/empty; not calling computeShadowPositionCostsForOfferBoq",
    {
      persistPlanCount: phase.context.persistPlans?.length ?? 0,
      postIdentityLineRefs: phase.postIdentityExpert?.masterBoqLines?.length ?? 0,
      ambiguousCount: phase.context?.ambiguousCount,
      noIdentityCount: phase.context?.noIdentityCount,
    },
  );
  stage("shadowOfferBoqPresent", false, {
    blocked: true,
    reason: "NO_PERSIST_OFFER_BOQ",
  });
  console.log("=== IK FULL PIPELINE E2E BLOCKED (harness — missing OfferBoq from persistPlans) ===");
  writeReport(t0, 2);
  process.exit(2);
}

const noFabricatedIdentity = identityRows.every(
  (l) => !l.catalogWorkId || works.some((w) => w.id === l.catalogWorkId),
);
stage("negativeNoAutoIdentityFabrication", noFabricatedIdentity, {
  unknownWorkIds: identityRows
    .filter((l) => l.catalogWorkId && !works.some((w) => w.id === l.catalogWorkId))
    .map((l) => l.catalogWorkId),
});

// 6 Classification
const planeCounts = { LABOR: 0, MATERIAL: 0, COMPOSITE: 0, OTHER: 0 };
for (const line of identityRows) {
  if (!line.catalogWorkId) continue;
  const p =
    getOwnerClassificationPlane(line.catalogWorkId) ||
    classifyEstimatorPricingPlane({
      workId: line.catalogWorkId,
      unit: line.unit,
    }).plane;
  if (p === "LABOR") planeCounts.LABOR += 1;
  else if (p === "MATERIAL") planeCounts.MATERIAL += 1;
  else if (p === "COMPOSITE") planeCounts.OTHER += 1;
  else planeCounts.OTHER += 1;
}
stage("classification", planeCounts.LABOR + planeCounts.MATERIAL > 0, planeCounts);

// 7–8 Research gates (no execution this GO)
stage(
  "laborResearchGuard",
  writes.researchHttp === 0 && !isIkP5LaborExecuteResearchActive(),
  { researchHttp: writes.researchHttp },
);
stage(
  "materialResearchGuard",
  writes.researchHttp === 0 && !isIkP6MaterialExecuteResearchActive(),
  { researchHttp: writes.researchHttp },
);

// 9 Composite — silent accept forbidden (fixture adapter, no HTTP)
const compositeItem = { id: "t-ik-e2e-composite", tenderId: "t-ik-e2e-composite", title: "IK E2E composite guard" };
const compositeHold = runIkCompositeBothHold({
  item: compositeItem,
  lines: [
    {
      lp: "1",
      lineId: "obl_e2e_composite",
      description: "zabezpieczenie folią",
      unit: "m2",
      quantity: 1,
      catalogWorkId: "cc-p0c-w1-zabezpieczenie-folia",
      plane: "COMPOUND",
      classify: { plane: "COMPOUND", hold: true },
      handoff: { allowLaborResearch: false, allowMaterialResearch: false },
      identityStatus: "HAS_WORK_ID",
    },
  ],
  store,
  p5LaborActive: true,
  p6MaterialActive: true,
  executeLaborResearch: false,
  executeMaterialResearch: false,
});
stage(
  "compositeHandling",
  compositeHold.autoAcceptExecuted === false &&
    compositeHold.catalogWorkWrite === false &&
    compositeHold.researchHttpExecuted === false,
  {
    autoAcceptExecuted: compositeHold.autoAcceptExecuted,
    catalogWorkWrite: compositeHold.catalogWorkWrite,
    researchHttpExecuted: compositeHold.researchHttpExecuted,
    gapLineCount: compositeHold.gapLineCount,
  },
);

// 10 BOM LABOR_ONLY resolver (LP20)
const lp20Bom = resolveLaborOnlyBomForWork({
  workId: "p2b-listwa-wykonczajaca-prog-plytki-mb",
  unit: "mb",
  positionQuantity: 1,
});
stage(
  "bomLaborOnlyResolver",
  lp20Bom.status === "LABOR_ONLY" &&
    (lp20Bom.materials?.length ?? lp20Bom.components?.length ?? 0) === 0,
  { status: lp20Bom.status },
);

// 11–13 Shadow pricing + completeness + cutover
const laborPolicy = {
  defaultLaborCommercialMarginPct: settings.defaultLaborCommercialMarginPct,
};
const shadow = computeShadowPositionCostsForOfferBoq({
  doc: offerBoq,
  store,
  nowMs: Date.now(),
  tenderId: PIPE,
  dwellingId: "legacy_single",
  ensureOwnerQuestions: false,
});
const cutover = evaluateBidCutoverGate(shadow);
console.log("[stage] shadow + cutover", cutover.completeLineCount, cutover.gapLineCount, cutover.pass);

const incomplete = shadow.lines.filter((l) => !l.positionComplete);
stage(
  "positionCompleteness",
  incomplete.length === 0 && shadow.lines.length >= BILLABLE,
  {
    total: shadow.lines.length,
    incomplete: incomplete.length,
    incompleteLps: incomplete.map((l) => l.lp).slice(0, 5),
  },
);

stage(
  "pricingMarginResolution",
  settings.defaultLaborCommercialMarginPct === 25,
  { globalLaborMarginPct: settings.defaultLaborCommercialMarginPct },
);

stage(
  "cutoverEvaluation",
  cutover.pass === true &&
    cutover.completeLineCount === BILLABLE &&
    cutover.gapLineCount === 0,
  {
    pass: cutover.pass,
    completeLineCount: cutover.completeLineCount,
    gapLineCount: cutover.gapLineCount,
    billableLineCount: cutover.billableLineCount,
  },
);

// Negative: C-NO-SEED — companyPricePln nie jest źródłem OUR RATE (lookup + paint canonical)
const lookupSrc = readFileSync(join(ROOT, "src/lib/work-catalog/work-rate-lookup.ts"), "utf8");
const lookupBody = lookupSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const cNoSeedStatic = !/companyPricePln/.test(lookupBody);
const paintCanon = snapRate(store, "legacy-malowanie-m2", "m2");
const cNoSeedBehavioral =
  paintCanon.ourRatePln === 22.9 &&
  paintCanon.companyPricePln === 21.6 &&
  paintCanon.ourRatePln !== paintCanon.companyPricePln;
stage("negativeNoCompanyPriceAsOurRate", cNoSeedStatic && cNoSeedBehavioral, {
  cNoSeedStatic,
  paintOurRate: paintCanon.ourRatePln,
  paintCompanyPrice: paintCanon.companyPricePln,
  canonicalSeparation: paintCanon.ourRatePln !== paintCanon.companyPricePln,
});

// Negative: UNKNOWN identity — brak research HTTP w tym GO
const unknownLines = identityRows.filter((l) => !l.catalogWorkId);
stage("negativeNoResearchForUnknownIdentity", unknownLines.length === 0 && writes.researchHttp === 0, {
  unknownCount: unknownLines.length,
  researchHttp: writes.researchHttp,
});

// Negative: MATERIAL plane — brak labor ourRate jako źródła kosztu (poza explicit LO)
const materialLaborResearch = shadow.lines.filter((row) => {
  const wid = row.identity?.workId;
  if (!wid || getOwnerClassificationPlane(wid) !== "MATERIAL") return false;
  if (isExplicitLaborOnlyWork(wid)) return false;
  const lr = lookupWorkRate(store, wid, row.identity?.unit ?? "szt", Date.now());
  return lr.status !== "MISSING" && (lr.ourRatePln ?? 0) > 0;
});
stage("negativeNoLaborResearchForMaterial", materialLaborResearch.length === 0, {
  count: materialLaborResearch.length,
  sample: materialLaborResearch.slice(0, 3).map((l) => l.lp),
});

// Negative: no unit conversion invent (LP20 stays mb)
const lp20 = shadow.lines.find((l) => String(l.lp) === "20");
stage(
  "negativeNoUnitConversion",
  lp20?.identity?.unit === "mb" && lp20?.identity?.workId === "p2b-listwa-wykonczajaca-prog-plytki-mb",
  {
    unit: lp20?.identity?.unit,
    workId: lp20?.identity?.workId,
  },
);

// Negative: MATERIAL lines — no labor research rate bleed
const materialLaborBleed = shadow.lines.filter((row) => {
  const wid = row.identity?.workId;
  if (!wid) return false;
  if (getOwnerClassificationPlane(wid) !== "MATERIAL") return false;
  return row.laborCostPln != null && row.laborCostPln > 0 && !isExplicitLaborOnlyWork(wid);
});
if (materialLaborBleed.length > 0) {
  warn(`materialLaborBleed lines: ${materialLaborBleed.map((l) => l.lp).join(",")}`);
}

// Protected regression
protectedResults = {};
let protectedPass = true;
for (const p of PROTECTED) {
  const s = snapRate(store, p.id, p.unit);
  const sell =
    p.id === LP22_WORK
      ? null
      : computeSellPricePln(p.rate, resolveMarginPct(getWorkByIdFromStore(store, p.id), { laborPolicy }));
  let ok = s.ourRatePln === p.rate && s.lo === p.lo;
  if (p.marginLocal != null) ok = ok && s.marginLocal === p.marginLocal;
  if (p.id === "p2b-listwa-wykonczajaca-prog-plytki-mb") {
    ok = ok && s.sourceType === "ACCEPT" && s.status === "CURRENT";
  }
  protectedResults[p.id] = { ...s, expectedRate: p.rate, pass: ok };
  if (!ok) protectedPass = false;
}
const lp22Sell = resolveMaterialSellFromCatalogWorkQuotes(store, LP22_WORK, 1, "m2", Date.now());
const lp22w = getWorkByIdFromStore(store, LP22_WORK);
const lp22Ok =
  lp22Sell.basePricePln === 200 &&
  lp22Sell.sellPricePln === 200 &&
  (lp22w?.commercialPricing?.marginPct ?? null) === 0;
protectedResults[LP22_WORK] = {
  materialBase: lp22Sell.basePricePln,
  materialSell: lp22Sell.sellPricePln,
  marginLocal: lp22w?.commercialPricing?.marginPct ?? null,
  pass: lp22Ok,
};
if (!lp22Ok) protectedPass = false;

stage("protectedRegression", protectedPass, protectedResults);

// CLOSED gates unchanged (paint + LP20)
const paint = snapRate(store, "legacy-malowanie-m2", "m2");
const lp20Snap = snapRate(store, "p2b-listwa-wykonczajaca-prog-plytki-mb", "mb");
stage(
  "closedGatesNotReopened",
  paint.ourRatePln === 22.9 &&
    paint.sourceType === "ACCEPT" &&
    lp20Snap.ourRatePln === 80 &&
    lp20Snap.sourceType === "ACCEPT",
  { paint, lp20: lp20Snap },
);

// Production readback — catalog unchanged
const bg2 = await batchGet(["kw-wgdom-work-catalog"]);
const storeAfter = normalizeWorkCatalogStore(unwrap(bg2.values[0]));
const fpAfter = catalogFingerprint(storeAfter);
stage(
  "productionWriteGuardCatalog",
  fpAfter === catalogFingerprintBefore &&
    (storeAfter.catalogRevision ?? null) === catalogRevisionBefore,
  {
    before: catalogFingerprintBefore,
    after: fpAfter,
    revisionBefore: catalogRevisionBefore,
    revisionAfter: storeAfter.catalogRevision ?? null,
  },
);

// Child suites — optional regression (skipped in default E2E to keep deterministic runtime)
const RUN_CHILD_SUITES = process.env.IK_E2E_CHILD_SUITES === "1";
const childSuites = [
  ["compositeOrchestration", "scripts/test-ik-composite-position-orchestration.mjs"],
  ["autonomyP0DocumentsBoq", "scripts/test-ik-autonomy-08-p0-documents-boq.mjs"],
  ["bomCoverage", "scripts/test-our-rate-bom-coverage-01.mjs"],
];
if (RUN_CHILD_SUITES) {
  for (const [label, rel] of childSuites) {
    if (!existsSync(join(ROOT, rel))) {
      stage(`child_${label}`, false, { missing: rel });
      continue;
    }
    console.log(`[child] ${label}…`);
    const r = runChildSuite(rel);
    stage(`child_${label}`, r.ok, { exitCode: r.status, tail: r.out });
    if (!r.ok) warn(`${label} child suite exit ${r.status}`);
  }
} else {
  for (const [label] of childSuites) {
    stage(`child_${label}`, true, { skipped: true, reason: "IK_E2E_CHILD_SUITES!=1" });
  }
}

const allStagesPass = failures.length === 0;
const exitCode = allStagesPass ? 0 : 1;
writeReport(t0, exitCode);
process.exit(exitCode);

function writeReport(t0, exitCode) {
  const durationMs = Date.now() - t0;
  const blockedStage = stages.BLOCKED_PARTIAL_DOC_EXPERT ?? null;
  const report = {
    mode: "OWNER_GO_FULL_IK_E2E_TEST",
    command: "npx vite-node scripts/test-ik-full-pipeline-e2e.mjs",
    pass: exitCode === 0,
    exitCode,
    blocked: exitCode === 2 || blockedStage?.blocked === true,
    blockedClassification: blockedStage?.classification ?? null,
    durationMs,
    durationHuman: `${(durationMs / 1000).toFixed(1)}s`,
    stages,
    writeCounters: writes,
    productionWriteGuard: {
      batchGetOnly: writes.batchSet === 0 && writes.researchHttp === 0,
      catalogFingerprintStable: stages.productionWriteGuardCatalog?.pass ?? false,
      batchSet: writes.batchSet,
      researchHttp: writes.researchHttp,
    },
    protectedRegression: protectedResults,
    decisionTreeCompliance: {
      fixture: GATE_FIXTURE,
      tenderPipeline: PIPE,
      ocds: OCDS,
      expectedCutover: `${BILLABLE}/0`,
      actualCutover: stages.cutoverEvaluation ?? null,
      chrobregoClosed: stages.cutoverEvaluation?.pass === true,
    },
    warnings,
    failures,
    ikE2eGreen: exitCode === 0,
    at: new Date().toISOString(),
  };
  writeFileSync(
    join(OUT, "ik-full-pipeline-e2e-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
}
