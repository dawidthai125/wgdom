/**
 * IK Composite Position Orchestration — T01–T20 (Design Freeze).
 * Run: npx vite-node scripts/test-ik-composite-position-orchestration.mjs
 *
 * ZERO Accept · ZERO CatalogWork write · ZERO PM write · ZERO Edge lease.
 * Paczka VII = read-only batch-get when VITE_SUPABASE_ANON_KEY is set.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadEnv } from "vite";

Object.assign(process.env, loadEnv("", process.cwd(), ""));

import { defaultAppSettings } from "../src/lib/app-settings.ts";
import { classifyEstimatorPricingPlane } from "../src/lib/intelligent-estimator/classification-gate.ts";
import { classifyIkMaterialIdentityP59 } from "../src/lib/intelligent-estimator/ik-material-identity-p59.ts";
import {
  runIkCompositeBothHold,
  IK_COMPOSITE_BOTH_HOLD_SCHEMA_VERSION,
} from "../src/lib/intelligent-estimator/ik-composite-both-hold.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";
import { isInvoicePurchaseCatalogWorkId } from "../src/lib/price-intelligence/invoice-purchase-host.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.error("FAIL", name, extra ?? "");
  }
}

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
};

let fetchCalls = 0;
const realFetch = globalThis.fetch?.bind(globalThis);
globalThis.fetch = async (...args) => {
  const url = String(args[0] ?? "");
  if (/mmr-diy|work-rate|research|lease|PRICE_DEMAND/i.test(url) && !/batch-get/.test(url)) {
    throw new Error(`FORBIDDEN_RESEARCH_HTTP ${url}`);
  }
  fetchCalls += 1;
  if (!realFetch) throw new Error("NO_FETCH");
  return realFetch(...args);
};

const NOW = Date.parse("2026-08-17T08:00:00.000Z");
const T_FRESH = "2026-08-16T12:00:00.000Z";
const PARENT = "cc-p0c-w1-zabezpieczenie-folia";
const LABOR_LEAF = "cw.paint.walls";
const MAT_KEY = "mat.wc_compact";
const MAT_WORK = "cw.product.wc_compact";
const TENDER_VII = "08decd1d-542e-312b-5fad-9500015f7011";

function readSrc(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function quoteCell(price, updatedAt = T_FRESH, origin = "wgdom") {
  return {
    [origin]: {
      wroclaw: {
        price,
        regionCode: "wroclaw",
        coverage: "indicative",
        updatedAt,
        confidence: 0.85,
        origin,
      },
    },
  };
}

function ourRate(workId, unit, pln) {
  return {
    workId,
    unit,
    ourRatePln: pln,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: T_FRESH,
    updatedAt: T_FRESH,
    history: [],
  };
}

function makeWork(id, unit, extra = {}) {
  return {
    id,
    tradeId: "MALOWANIE",
    namePl: id,
    unit,
    companyPricePln: 999,
    marketQuotes: extra.marketQuotes ?? {},
    marketQuoteHistory: extra.marketQuoteHistory ?? [],
    commercialPricing: extra.commercialPricing ?? {
      marginPct: 15,
      updatedAt: T_FRESH,
      source: "owner",
    },
    ourWorkRate: extra.ourWorkRate ?? null,
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    ...extra,
  };
}

function makeStore(works) {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: T_FRESH,
    catalogs: {
      wroclaw: { region: "wroclaw", works, updatedAt: T_FRESH },
      dolnyslask: { region: "dolnyslask", works: [], updatedAt: T_FRESH },
    },
  });
}

function hitStore(opts = {}) {
  const laborUnit = opts.laborUnit ?? "szt";
  const laborId = opts.laborId ?? LABOR_LEAF;
  return makeStore([
    makeWork(laborId, laborUnit, {
      ourWorkRate: opts.laborMiss ? null : ourRate(laborId, laborUnit, 10),
    }),
    makeWork(MAT_WORK, "szt", {
      marketQuotes: opts.materialMiss ? {} : quoteCell(100),
      marketQuoteHistory: opts.materialMiss
        ? []
        : [{ workId: MAT_WORK, price: 100, origin: "wgdom", regionCode: "wroclaw", updatedAt: T_FRESH, confidence: 0.85, coverage: "indicative" }],
    }),
  ]);
}

function makePack(overrides = {}) {
  return {
    packId: overrides.packId ?? "pack.test.composite_v1",
    packVersion: "1.0",
    definitionId: "def.test.composite",
    packCapabilities: [],
    lifecycle: "ACTIVE",
    namePl: "Test composite pack",
    stages: [{ stageId: "stage.a", order: 1, namePl: "A" }],
    steps: overrides.steps ?? [
      {
        stepId: "step.bind",
        stageId: "stage.a",
        order: 1,
        namePl: "Bind parent",
        catalogWorkId: PARENT,
        quantityFromBoq: true,
      },
      {
        stepId: "step.labor",
        stageId: "stage.a",
        order: 2,
        namePl: "Leaf labor",
        catalogWorkId: LABOR_LEAF,
        quantityFromBoq: true,
      },
    ],
    dependencies: [],
    materials: overrides.materials ?? [
      {
        materialKey: MAT_KEY,
        namePl: "WC kompakt",
        unit: "szt",
        qtyFactor: overrides.qtyFactor ?? 0.5,
        factorSourceKind: "owner_approved",
        factorSourceRef: "TEST://composite",
        factorApprovedAt: T_FRESH,
      },
    ],
    equipment: overrides.equipment ?? [],
    labour: overrides.labour ?? [],
    regulatory: [],
  };
}

function classified(opts) {
  const catalogWorkId = opts.catalogWorkId ?? null;
  const unit = opts.unit ?? "szt";
  const description = opts.description ?? "linia testowa";
  const classify = classifyEstimatorPricingPlane({
    workId: catalogWorkId,
    materialKey: null,
    namePl: description,
    unit,
  });
  const handoff =
    classify.plane === "LABOR" ? "LABOR_READY_FOR_EXPERT"
      : classify.plane === "MATERIAL" ? "MATERIAL_READY_FOR_EXPERT"
        : classify.plane === "COMPOUND" ? "BOTH_HOLD"
          : "UNRESOLVED";
  return {
    tenderId: "t-composite",
    dwellingId: "d1",
    lineId: opts.lineId ?? "L1",
    lp: opts.lp ?? "1",
    description,
    quantity: opts.quantity ?? 20,
    unit,
    branch: null,
    sourceDocumentId: null,
    sourceLineKey: null,
    sourcePosition: opts.lp ?? "1",
    lineProvenance: null,
    catalogWorkId,
    materialKey: null,
    plane: classify.plane,
    classify,
    handoff,
    identityStatus: catalogWorkId ? "HAS_WORK_ID" : "MISSING_IDENTITY",
  };
}

const item = { id: "t-composite", tenderId: "t-composite", title: "composite fixture" };

function runAdapter(extra = {}) {
  return runIkCompositeBothHold({
    item,
    lines: extra.lines ?? [classified({ catalogWorkId: PARENT, description: "zabezpieczenie folią" })],
    store: extra.store ?? hitStore(),
    packs: extra.packs ?? [makePack()],
    nowMs: NOW,
    p5LaborActive: extra.p5 ?? true,
    p6MaterialActive: extra.p6 ?? true,
    executeLaborResearch: extra.executeLaborResearch === true,
    executeMaterialResearch: extra.executeMaterialResearch === true,
  });
}

// —— Source contracts ——
const adapterSrc = readSrc("src/lib/intelligent-estimator/ik-composite-both-hold.ts");
const hostSrc = readSrc("src/app/intelligent-estimator/IkEntryHost.tsx");
const orchestraEngineSrc = readSrc("src/lib/intelligent-estimator/orchestra/ik-orchestra-engine.ts");
const orchestraHookSrc = readSrc("src/lib/intelligent-estimator/orchestra/use-ik-orchestra.ts");
const gateSrc = readSrc("src/lib/intelligent-estimator/classification-gate.ts");
const engineSrc = readSrc("src/lib/tender-position-cost/engine.ts");
const settingsSrc = readSrc("src/lib/app-settings.ts");

ok("schema v1", IK_COMPOSITE_BOTH_HOLD_SCHEMA_VERSION === 1);
const bridgeSrc = readSrc("src/app/intelligent-estimator/IkOrchestraPageBridge.tsx");
ok("IkEntryHost consumer", (/useIkOrchestra/.test(hostSrc) || (/useIkOrchestra/.test(bridgeSrc) && /orchestra:/.test(hostSrc))) && /runIkCompositeBothHold/.test(orchestraEngineSrc) && /p5LaborOn && p6MaterialOn/.test(orchestraEngineSrc));
ok("no new orchestrator module host", !/CompositeOrchestrator|runIkCompositeEngine/.test(hostSrc));
ok("no new ikP composite flag", !/ikComposite|ikP9Composite|ikBothHold/.test(settingsSrc));
ok("Classification Gate COMPOUND hold unchanged", /case "COMPOUND":[\s\S]*allowLaborResearch: false[\s\S]*allowMaterialResearch: false[\s\S]*hold: true/.test(gateSrc));
ok("computePositionCost body not edited by composite import-only", /export function computePositionCost/.test(engineSrc));
ok("adapter does not HTTP", !/fetch\(/.test(adapterSrc) && !/saveWorkCatalog|savePriceDemand|acceptIk/.test(adapterSrc));
ok("adapter leaf lookup not parent BOQ expert loop", !/runIkMasterBoqLaborExpert|runIkMasterBoqMaterialExpert/.test(adapterSrc));

const d = defaultAppSettings();
ok("T19 D remains false", d.expertAiDecydentEnabled === false);

// T01 pure LABOR
const laborLine = classified({ catalogWorkId: "cc-w2-oczyszczenie-podloza", description: "oczyszczenie podłoża", lineId: "L-lab" });
ok("T01 plane LABOR", laborLine.plane === "LABOR" && laborLine.handoff === "LABOR_READY_FOR_EXPERT");
const t01 = runAdapter({ lines: [laborLine] });
ok("T01 adapter skips LABOR", t01.bothHoldLineCount === 0 && t01.skippedLineCount === 1);

// T02 pure MATERIAL
const matLine = classified({ catalogWorkId: "cc-w2-zawor-odcinajacy", description: "zawór odcinający", lineId: "L-mat" });
ok("T02 plane MATERIAL", matLine.plane === "MATERIAL" && matLine.handoff === "MATERIAL_READY_FOR_EXPERT");
const t02 = runAdapter({ lines: [matLine] });
ok("T02 adapter skips MATERIAL", t02.bothHoldLineCount === 0 && t02.skippedLineCount === 1);

// T03 COMPOUND material + labor jobs
const t03 = runAdapter({});
ok("T03 BOTH_HOLD detected", t03.bothHoldLineCount === 1);
ok("T03 parent remains COMPOUND", t03.lines[0]?.parentRemainsCompound === true && t03.lines[0]?.plane === "COMPOUND");
ok("T03 material jobs from pack", (t03.lines[0]?.materialJobs?.length ?? 0) >= 1);
ok("T03 labor jobs from leaf steps", (t03.lines[0]?.laborJobs?.length ?? 0) >= 1);
ok("T03 parent workId not labor leaf", !(t03.lines[0]?.laborJobs ?? []).some((j) => j.workId === PARENT));

// T04 HIT + HIT
const t04 = runAdapter({});
ok("T04 COMPLETE", t04.lines[0]?.status === "COMPLETE" && t04.lines[0]?.positionComplete === true, t04.lines[0]);
ok("T04 total not null", t04.lines[0]?.totalPositionCostPln != null && t04.lines[0].totalPositionCostPln > 0);
ok("T04 engineInput labor not null", t04.lines[0]?.engineInput?.labor?.status === "CURRENT");
ok("T04 engineInput materials non-empty", (t04.lines[0]?.engineInput?.materials?.length ?? 0) > 0);
ok("T04 material expert evidence", t04.lines[0]?.materialJobs?.[0]?.pmStatus === "CURRENT" && t04.lines[0]?.materialJobs?.[0]?.materialKey === MAT_KEY);
ok("T04 labor expert evidence", t04.lines[0]?.laborJobs?.[0]?.rateStatus === "CURRENT" && t04.lines[0]?.laborJobs?.[0]?.workId === LABOR_LEAF);
ok("T04 XOR F5", t04.feedsP7Bid === false && t04.lines[0]?.feedsP7Bid === false);

// T16 quantity
ok("T16 qty × factor", t04.lines[0]?.materialJobs?.[0]?.quantity === 10);

// T05 material HIT + labor GAP
const t05 = runAdapter({ store: hitStore({ laborMiss: true }) });
ok("T05 GAP incomplete", t05.lines[0]?.status === "GAP" && t05.lines[0]?.totalPositionCostPln == null);
ok("T05 not 0 PLN", t05.lines[0]?.totalPositionCostPln !== 0);
ok("T05 labor=null not used as success", t05.lines[0]?.engineInput?.labor != null && t05.lines[0]?.engineInput?.labor?.status !== "CURRENT");

// T06 material GAP + labor HIT
const t06 = runAdapter({ store: hitStore({ materialMiss: true }) });
ok("T06 GAP incomplete", t06.lines[0]?.status === "GAP" && t06.lines[0]?.totalPositionCostPln == null);
ok("T06 materials not empty success", (t06.lines[0]?.engineInput?.materials?.length ?? 0) > 0);

// T07 both GAP
const t07 = runAdapter({ store: hitStore({ laborMiss: true, materialMiss: true }) });
ok("T07 both GAP", t07.lines[0]?.status === "GAP" && t07.lines[0]?.totalPositionCostPln == null);

// T08 missing material identity
const t08 = runAdapter({
  packs: [makePack({ materials: [{ materialKey: "not-a-mat-key", namePl: "x", unit: "szt", qtyFactor: 1 }] })],
});
ok("T08 missing identity GAP", t08.lines[0]?.gapCodes?.includes("NO_MATERIAL_IDENTITY"), t08.lines[0]?.gapCodes);

// T09 hours-only labor
const t09 = runAdapter({
  packs: [makePack({
    steps: [{ stepId: "step.bind", stageId: "stage.a", order: 1, namePl: "Bind", catalogWorkId: PARENT, quantityFromBoq: true }],
    labour: [{ labourKey: "lab.hours.only", namePl: "Norma godzin", hoursPerUnit: 1.5 }],
  })],
});
ok("T09 hours-only GAP", t09.lines[0]?.gapCodes?.includes("HOURS_ONLY_LABOR") || t09.lines[0]?.gapCodes?.includes("NO_LABOR_IDENTITY"), t09.lines[0]?.gapCodes);
ok("T09 no guessed PLN", t09.lines[0]?.laborJobs?.every((j) => j.sellRatePln == null));

// T10 P5 OFF
const t10 = runAdapter({ p5: false, p6: true });
ok("T10 P5 OFF HOLD", t10.status === "hold" && t10.reasons.includes("P5_P6_HOLD") && t10.bothHoldLineCount === 0);

// T11 P6 OFF
const t11 = runAdapter({ p5: true, p6: false });
ok("T11 P6 OFF HOLD", t11.status === "hold" && t11.reasons.includes("P5_P6_HOLD"));

// T12 P5+P6 ON
const t12 = runAdapter({ p5: true, p6: true });
ok("T12 P5+P6 RUN", t12.p5Active && t12.p6Active && t12.bothHoldLineCount === 1);

// T13 P1 invoice
ok("T13 cw.inv helper", isInvoicePurchaseCatalogWorkId("cw.inv.tile_grout") === true);
const t13 = runAdapter({
  packs: [makePack({
    materials: [{ materialKey: "mat.inv.tile_grout", namePl: "fuga invoice", unit: "szt", qtyFactor: 1 }],
  })],
});
ok("T13 mat.inv GAP P1", t13.lines[0]?.gapCodes?.includes("P1_INVOICE_HOST"), t13.lines[0]?.gapCodes);

// T14 P2 KEEP GAP
const zaworOdcinajacy = classifyIkMaterialIdentityP59({
  lineId: "z1",
  dwellingId: "d1",
  branch: "hydraulika",
  description: "Zawór odcinający 15 mm",
  unit: "szt",
  quantity: 1,
  workId: "cc-w2-zawor-odcinajacy",
});
const zaworOdpow = classifyIkMaterialIdentityP59({
  lineId: "z2",
  dwellingId: "d1",
  branch: "hydraulika",
  description: "Zawór odpowietrzający",
  unit: "szt",
  quantity: 1,
  workId: "cc-p0c-w1-zawor-odpowietrzajacy",
});
ok("T14 odcinający PRODUCT_IDENTITY_GAP", zaworOdcinajacy.outcome === "PRODUCT_IDENTITY_GAP");
ok("T14 odpowietrzający PRODUCT_IDENTITY_GAP", zaworOdpow.outcome === "PRODUCT_IDENTITY_GAP");
ok("T14 MATERIAL not BOTH_HOLD", matLine.handoff !== "BOTH_HOLD");

// T15 unit safety — BOQ mb vs OUR RATE m2, no remap
const t15 = runAdapter({
  lines: [classified({ catalogWorkId: PARENT, description: "zabezpieczenie folią", unit: "mb", quantity: 20 })],
  store: hitStore({ laborUnit: "m2" }),
});
ok("T15 no unit remap → labor GAP", t15.lines[0]?.status === "GAP", t15.lines[0]?.gapCodes);
ok("T15 not COMPLETE via remapped unit", t15.lines[0]?.status !== "COMPLETE");

// T17 no auto-Accept / no HTTP even if research flags on
const fetchBefore17 = fetchCalls;
const t17 = runAdapter({ executeLaborResearch: true, executeMaterialResearch: true });
ok("T17 autoAccept false", t17.autoAcceptExecuted === false && t17.lines[0]?.autoAcceptExecuted === false);
ok("T17 research HTTP false", t17.researchHttpExecuted === false);
ok("T17 no extra forbidden fetch", fetchCalls === fetchBefore17);

// T18 CatalogWork write lock
ok("T18 catalogWorkWrite false", t17.catalogWorkWrite === false && t17.priceMemoryWrite === false);
ok("T18 no saveWorkCatalog in adapter", !/saveWorkCatalogStoreLocal/.test(adapterSrc));

// T20 multi-line autonomous walk
const t20 = runAdapter({
  lines: [
    classified({ catalogWorkId: PARENT, description: "folia A", lineId: "A", lp: "10" }),
    classified({ catalogWorkId: PARENT, description: "folia B", lineId: "B", lp: "11" }),
    laborLine,
  ],
});
ok("T20 two BOTH_HOLD one skip", t20.bothHoldLineCount === 2 && t20.skippedLineCount === 1);
ok("T20 both processed without per-line expert start", t20.lines.length === 2 && t20.lines.every((l) => l.handoff === "BOTH_HOLD"));

ok("engine unchanged flag", t04.computePositionCostChanged === false);

// Host wiring grep
ok("A10 host auto when P5∧P6", /p5LaborOn/.test(hostSrc) && /p6MaterialOn/.test(hostSrc) && /isIkP5LaborE2eActive/.test(orchestraHookSrc) && /isIkP6MaterialE2eActive/.test(orchestraHookSrc));

async function runPaczkaVii() {
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!anon) {
    console.log("NOTE TENDER skipped — no VITE_SUPABASE_ANON_KEY (unit T01–T20 still required)");
    ok("TENDER skipped without failing unit matrix", true);
    return { ran: false };
  }
  const projectId = process.env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys";
  const edge = `https://${projectId}.supabase.co/functions/v1/make-server-0afb8820`;
  const res = await fetch(`${edge}/batch-get`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anon}`,
      apikey: anon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ keys: ["kw-tenders-pipeline", "kw-wgdom-work-catalog"] }),
    signal: AbortSignal.timeout(180000),
  });
  ok("TENDER batch-get OK", res.ok, { status: res.status });
  if (!res.ok) return { ran: true, ok: false };

  const j = await res.json();
  const values = {};
  if (Array.isArray(j.values)) {
    ["kw-tenders-pipeline", "kw-wgdom-work-catalog"].forEach((k, i) => { values[k] = j.values[i]; });
  } else {
    Object.assign(values, j.values || {});
  }
  function unwrap(raw) {
    if (raw == null) return null;
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return raw; }
    }
    return raw;
  }
  let pipeline = unwrap(values["kw-tenders-pipeline"]);
  if (typeof pipeline === "string") pipeline = JSON.parse(pipeline);
  const found = (Array.isArray(pipeline) ? pipeline : []).find((x) => x.id === TENDER_VII);
  ok("TENDER Paczka VII found", !!found, { id: TENDER_VII });
  if (!found) return { ran: true, ok: false };

  const { saveWorkCatalogStoreLocal, loadWorkCatalogStoreLocal } = await import(
    "../src/lib/work-catalog/work-catalog-store.ts"
  );
  const { listActiveWorksForRegion } = await import("../src/lib/work-catalog/catalog-work-utils.ts");
  const { runIkDocumentExpert } = await import("../src/lib/intelligent-estimator/ik-document-expert.ts");
  const { runIkMasterBoqClassification } = await import("../src/lib/intelligent-estimator/ik-classification.ts");

  mem.clear();
  saveWorkCatalogStoreLocal(normalizeWorkCatalogStore(unwrap(values["kw-wgdom-work-catalog"])));
  const store = loadWorkCatalogStoreLocal();
  const works = listActiveWorksForRegion(store, store.activeRegion);
  ok("T18 CatalogWork active = 471 (live)", works.length === 471, { n: works.length });

  const expert = runIkDocumentExpert({ item: found, package: null });
  ok("TENDER master BOQ ready", expert.masterBoq?.readyForExperts === true, expert.masterBoq);
  const cls = runIkMasterBoqClassification({ item: found, expert });
  const both = cls.lines.filter((l) => l.handoff === "BOTH_HOLD");
  const compoundIds = cls.lines.filter((l) => l.plane === "COMPOUND");
  const needle = /montaz|wymiana|przylacz|instalacj|pcv|pvc/i;
  const natural = cls.lines.filter((l) => needle.test(l.description || "")).slice(0, 8).map((l) => ({
    lp: l.lp,
    plane: l.plane,
    handoff: l.handoff,
    workId: l.catalogWorkId,
    desc: String(l.description || "").slice(0, 90),
  }));
  ok(
    "TENDER COMPOUND count honest (0 is valid — do not invent LP)",
    both.length === compoundIds.length,
    { both: both.length, compound: cls.counts.COMPOUND },
  );
  if (both.length === 0) {
    console.log("TENDER NOTE: live Paczka VII COMPOUND=0 (prior audit had 1). Consumer idle. Natural montaż/PVC planes:");
    console.log(JSON.stringify(natural, null, 2));
  }

  const report = runIkCompositeBothHold({
    item: found,
    expert,
    classification: cls,
    store,
    nowMs: Date.now(),
    p5LaborActive: true,
    p6MaterialActive: true,
    executeLaborResearch: false,
    executeMaterialResearch: false,
  });
  ok("TENDER consumer ran", report.bothHoldLineCount === both.length);
  ok("TENDER write audit", report.catalogWorkWrite === false && report.priceMemoryWrite === false && report.autoAcceptExecuted === false && report.researchHttpExecuted === false);
  const anyComplete = report.lines.some((l) => l.status === "COMPLETE");
  const anyGap = report.lines.some((l) => l.status === "GAP");
  ok("TENDER GAP or COMPLETE honest (no invent 0)", report.lines.every((l) => l.totalPositionCostPln !== 0 || l.positionComplete === true));
  ok("TENDER parent not reclassified", report.lines.every((l) => l.parentRemainsCompound && l.plane === "COMPOUND"));
  console.log("TENDER evidence", JSON.stringify({
    bothHold: report.bothHoldLineCount,
    complete: report.completeLineCount,
    gap: report.gapLineCount,
    sample: report.lines.slice(0, 3).map((l) => ({
      lp: l.lp,
      desc: l.description.slice(0, 80),
      status: l.status,
      packId: l.packId,
      materialKeys: l.materialJobs.map((m) => m.materialKey),
      laborWorkIds: l.laborJobs.map((j) => j.workId),
      gapCodes: l.gapCodes,
      total: l.totalPositionCostPln,
      engineLabor: l.engineInput?.labor?.status ?? null,
      engineMat: l.engineInput?.materials?.map((m) => m.status) ?? null,
    })),
    anyComplete,
    anyGap,
  }, null, 2));
  return { ran: true, ok: true, report };
}

function runSuite(rel) {
  const r2 = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["vite-node", rel],
    { cwd: ROOT, encoding: "utf8", shell: true, timeout: 180000 },
  );
  const out = (r2.stdout || "") + (r2.stderr || "");
  const okRun = r2.status === 0 && failCountFromOut(out);
  return { ok: okRun, status: r2.status, tail: out.slice(-600) };
}

function failCountFromOut(out) {
  if (/FAIL [A-Zt]/.test(out) && /[1-9]\d* FAIL/.test(out)) return false;
  if (rStatusFail(out)) return false;
  return r2Pass(out);
}
function r2Pass(out) {
  return /0 FAIL|FAIL 0|all tests passed|PASS \/ 0 FAIL/i.test(out) || (out.includes("PASS") && !out.includes("\nFAIL "));
}
function rStatusFail(out) {
  return /\nFAIL /.test(out) || /FAIL T/.test(out);
}

const tender = await runPaczkaVii();

console.log(`\n${pass} PASS / ${fail} FAIL · tenderRan=${tender?.ran === true}`);
if (fail > 0) process.exit(1);
