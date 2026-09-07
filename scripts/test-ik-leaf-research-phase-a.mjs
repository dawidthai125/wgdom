/**
 * PHASE A — Leaf Research under COMPOUND (tests A1–A11).
 * Run: npx vite-node scripts/test-ik-leaf-research-phase-a.mjs
 *
 * ZERO Owner Accept · ZERO OUR RATE / PM write · ZERO pack create · ZERO Phase C.
 */
import {
  IK_LEAF_RESEARCH_CALL_SITE,
  IK_RESEARCH_HELD_COMPOUND_STATUS,
  assertLaborResearchAllowed,
  assertLeafLaborResearchAllowed,
  assertLeafMaterialResearchAllowed,
  buildIkLeafResearchDedupeKey,
  clearIkLeafResearchSessionDedupeForTests,
  classifyEstimatorPricingPlane,
  resolveLeafResearchPacksForParent,
  runIkLeafLaborResearch,
  runIkLeafMaterialResearch,
  runIkMasterBoqMaterialExpert,
} from "../src/lib/intelligent-estimator/index.ts";
import {
  clearWorkRateResearchAntiStormState,
  createFixtureWorkRateSelectiveLookup,
  normalizeWorkCatalogStore,
  runSelectiveWorkRateResearch,
} from "../src/lib/work-catalog/index.ts";
import {
  canPackFeedProductionBom,
  normalizeTechnologyPack,
} from "../src/lib/technology-foundation/index.ts";
import {
  findActiveTechnologyPacksForWorkId,
  findTechnologyPacksForWorkId,
  LEAF_RESEARCH_PACK_LIFECYCLES,
  resolveTechnologyBomForWork,
} from "../src/lib/tender-position-cost/index.ts";
import { resetMaterialResearchSessionCooldownForTests } from "../src/lib/price-intelligence/market-material-research-wire.ts";
import { clearIkLaborResearchSessionDedupeForTests } from "../src/lib/ik-pricing-orchestrator/labor-research-bridge.ts";

let pass = 0;
let fail = 0;
function assert(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra ?? "");
  }
}

const mem = new Map();
globalThis.localStorage = {
  getItem(k) {
    return mem.has(k) ? mem.get(k) : null;
  },
  setItem(k, v) {
    mem.set(String(k), String(v));
  },
  removeItem(k) {
    mem.delete(k);
  },
  clear() {
    mem.clear();
  },
};

let liveFetch = 0;
globalThis.fetch = async () => {
  liveFetch += 1;
  return { ok: true, json: async () => ({}), text: async () => "" };
};

const NOW = Date.parse("2026-08-15T01:00:00.000Z");
const T_FRESH = "2026-08-14T12:00:00.000Z";
const PARENT = "legacy-gladzie_tynki-m2";
const MAT = "mat.gladz_gipsowa";
const OTHER = "legacy-other-compound-m2";

function makeWork(overrides = {}) {
  return {
    id: PARENT,
    tradeId: "MALOWANIE",
    namePl: "Gładzie / tynki",
    unit: "m2",
    companyPricePln: 0,
    marketQuotes: {},
    marketQuoteHistory: [],
    commercialPricing: null,
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: ["gladzie", "tynki"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    ourWorkRate: undefined,
    ...overrides,
  };
}

function makeStore(works) {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: { region: "wroclaw", works, updatedAt: T_FRESH },
      dolnyslask: { region: "dolnyslask", works: [...works], updatedAt: T_FRESH },
    },
    updatedAt: T_FRESH,
  });
}

function emptyLookup() {
  return createFixtureWorkRateSelectiveLookup({
    kb_pl: { html: "<html></html>" },
    cennikremontow_pl: { html: "<html></html>" },
    sccot: { html: "<html></html>" },
    extradom: { html: "<html></html>" },
  });
}

function makeGladziePack(overrides = {}) {
  const lifecycle = overrides.lifecycle ?? "DRAFT";
  const parentWorkId = overrides.parentWorkId ?? PARENT;
  const labourKey = overrides.labourKey ?? PARENT;
  const includeLabour = overrides.includeLabour !== false;
  const materialKey = overrides.materialKey ?? MAT;
  return normalizeTechnologyPack({
    packId: overrides.packId ?? "pack.tpi.gladzie.draft",
    packVersion: overrides.packVersion ?? "0.1.0",
    definitionId: "def.gladzie.test",
    packCapabilities: ["cap.finishing"],
    lifecycle,
    namePl: "Gładzie TPI test pack",
    stages: [{ stageId: "s1", order: 1, namePl: "Gładzie" }],
    steps: [
      {
        stepId: "st1",
        stageId: "s1",
        order: 1,
        namePl: "Gładzie / tynki",
        catalogWorkId: parentWorkId,
        quantityFromBoq: true,
      },
    ],
    dependencies: [],
    materials: [
      {
        materialKey,
        namePl: "Gładź gipsowa",
        unit: "kg",
        qtyFactor: 4,
        factorSourceKind: "fixture_legacy",
        wastePolicy: "included_in_factor",
      },
    ],
    equipment: [],
    labour: includeLabour
      ? [
          {
            labourKey,
            namePl: "Gładzie robocizna",
            hoursPerUnit: 0.5,
            factorSourceKind: "fixture_legacy",
            wastePolicy: "included_in_factor",
          },
        ]
      : [],
    regulatory: [],
  });
}

function minimalLine(opts = {}) {
  return {
    lineId: opts.lineId ?? "L-gladzie",
    lp: opts.lp ?? "13",
    description: opts.description ?? "Gładź gipsowa ścian i sufitów",
    quantity: opts.quantity ?? 13,
    quantityRaw: String(opts.quantity ?? 13),
    unit: opts.unit ?? "m2",
    catalogWorkId: opts.catalogWorkId ?? PARENT,
    workCategory: "construction",
    categoryId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: null,
    aliasRuleId: null,
    knrHint: null,
    matchMethod: "manual",
    matchedBy: "manual",
    matchConfidence: "high",
    candidateMatches: [],
    costIntelligence: null,
    linePricing: null,
    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { kind: "unknown", labelPl: "Brak źródła" },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { kind: "unknown", labelPl: "Brak źródła" },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "unknown", labelPl: "Brak źródła" },
    directCostPln: null,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: null,
    aiConfidence: "medium",
    warnings: [],
  };
}

function provenance(lineId) {
  return {
    lineId,
    sourceDocumentId: "doc-construction",
    sourceDocumentIds: ["doc-construction"],
    sourceArtifactId: "art-construction",
    sourceArtifactIds: ["art-construction"],
    branchHint: "construction",
    sourceLineKey: `lp:${lineId}`,
    contentHash: `h-${lineId}`,
  };
}

function readyExpert(lines) {
  const masterBoqLines = lines.map((L) => ({
    dwellingId: L.dwellingId,
    line: L.line,
    provenance: L.provenance,
  }));
  return {
    tenderId: "t-leaf-a",
    discoverySettled: true,
    attachmentCount: 1,
    documents: [],
    costDocuments: [],
    przedmiary: [],
    extraction: {
      detectedRowCount: lines.length,
      extractedCount: lines.length,
      validCount: lines.length,
      executed: true,
      gaps: [],
    },
    validation: {
      missingDescription: 0,
      missingQuantity: 0,
      missingUnit: 0,
      missingLineage: 0,
      duplicateSuspicion: 0,
      reasons: [],
    },
    dwellingMapping: {
      artifactCount: 1,
      mappedCount: 1,
      unmappedCount: 0,
      allMapped: true,
      ownerMapRequired: false,
      sharedCandidateCount: 0,
      ambiguousCount: 0,
      coverage: [],
      dwellings: [],
      reasons: [],
    },
    lineIntegrity: {
      ok: true,
      sourceLineCount: lines.length,
      composedLineCount: lines.length,
      keepOneCollapsed: 0,
      unexplainedLoss: 0,
      unexplainedDuplication: 0,
      reasons: [],
    },
    dwellings: [],
    masterBoq: {
      mode: "multi",
      schemaVersion: 5,
      lineCount: lines.length,
      composedLineCount: lines.length,
      sourceLineCount: lines.length,
      dwellingCount: 1,
      branchCount: 1,
      sourceCount: 1,
      hasLineProvenance: true,
      status: "ready",
      readyForExperts: true,
    },
    status: "ready",
    reasons: [],
    offerBoq: { schemaVersion: 5, lines: lines.map((L) => L.line) },
    lineProvenance: Object.fromEntries(lines.map((L) => [L.line.lineId, L.provenance])),
    masterBoqLines,
  };
}

clearWorkRateResearchAntiStormState();
resetMaterialResearchSessionCooldownForTests();
clearIkLeafResearchSessionDedupeForTests();
clearIkLaborResearchSessionDedupeForTests();
liveFetch = 0;

console.log("\n=== PHASE A — Leaf Research under COMPOUND ===\n");

// Parent plane sanity
{
  const c = classifyEstimatorPricingPlane({ workId: PARENT });
  assert("parent plane COMPOUND", c.plane === "COMPOUND", c);
}

// A1 — parent direct block
{
  const gate = assertLaborResearchAllowed({ workId: PARENT, namePl: "Gładzie", unit: "m2" });
  assert("A1 assertLabor BLOCKED", !gate.ok && gate.blockReason === "CLASSIFICATION_GATE", gate);

  const store = makeStore([makeWork()]);
  const r = await runSelectiveWorkRateResearch({
    workId: PARENT,
    namePl: "Gładzie / tynki",
    unit: "m2",
    store,
    nowMs: NOW,
    lookupPort: emptyLookup(),
  });
  assert(
    "A1 direct selective BLOCKED",
    r.status === "BLOCKED" && r.reason === "CLASSIFICATION_GATE",
    r,
  );
  assert("A1 no HTTP", liveFetch === 0, { liveFetch });
}

// A2 — self-bind authorized
{
  const pack = makeGladziePack({ lifecycle: "DRAFT" });
  const gate = assertLeafLaborResearchAllowed({
    leafWorkId: PARENT,
    parentWorkId: PARENT,
    pack,
    callSite: IK_LEAF_RESEARCH_CALL_SITE,
    namePl: "Gładzie",
    unit: "m2",
  });
  assert("A2 leaf gate ALLOW", gate.ok === true, gate);
  assert(
    "A2 auth self-bind",
    gate.ok
      && gate.auth.kind === "LEAF_PACK_AUTHORIZED"
      && gate.auth.leafWorkId === PARENT
      && gate.auth.parentWorkId === PARENT,
    gate,
  );

  const store = makeStore([makeWork()]);
  clearIkLeafResearchSessionDedupeForTests();
  clearIkLaborResearchSessionDedupeForTests();
  const orch = await runIkLeafLaborResearch({
    item: { id: "t-leaf-a", tenderId: "t-leaf-a" },
    parentWorkId: PARENT,
    leafWorkId: PARENT,
    unit: "m2",
    namePl: "Gładzie / tynki",
    pack,
    store,
    executeLeafResearch: true,
    nowMs: NOW,
    lookupPort: emptyLookup(),
    bypassCooldown: true,
  });
  assert(
    "A2 orchestrator EXECUTED or research terminal",
    orch.status === "EXECUTED"
      && orch.research
      && ["GAP", "CANDIDATE", "REUSE", "COOLDOWN", "BLOCKED"].includes(orch.research.status),
    orch,
  );
  assert("A2 autoAccept false", orch.autoAcceptExecuted === false);
  assert("A2 ourRateWrite false", orch.ourRateWrite === false);
  assert("A2 DRAFT not production BOM", orch.productionBomFeedAllowed === false);
}

// A3 — self-bind without pack context (direct call)
{
  const store = makeStore([makeWork()]);
  liveFetch = 0;
  const r = await runSelectiveWorkRateResearch({
    workId: PARENT,
    namePl: "Gładzie / tynki",
    unit: "m2",
    store,
    nowMs: NOW,
    lookupPort: emptyLookup(),
  });
  assert("A3 no-pack still BLOCKED", r.status === "BLOCKED", r);

  const stepsOnly = makeGladziePack({ includeLabour: false, lifecycle: "DRAFT" });
  const gate = assertLeafLaborResearchAllowed({
    leafWorkId: PARENT,
    parentWorkId: PARENT,
    pack: stepsOnly,
    callSite: IK_LEAF_RESEARCH_CALL_SITE,
  });
  assert(
    "A3 steps-only self-bind BLOCKED",
    !gate.ok && gate.blockReason === "LEAF_SELF_BIND_REQUIRES_LABOUR",
    gate,
  );
}

// A4 — forged leaf
{
  const pack = makeGladziePack();
  const gate = assertLeafLaborResearchAllowed({
    leafWorkId: "legacy-forged-leaf-m2",
    parentWorkId: PARENT,
    pack,
    callSite: IK_LEAF_RESEARCH_CALL_SITE,
  });
  assert("A4 forged leaf BLOCKED", !gate.ok && gate.blockReason === "LEAF_NOT_IN_PACK", gate);
}

// A5 — wrong pack parent
{
  const pack = makeGladziePack({ parentWorkId: OTHER, labourKey: OTHER });
  const gate = assertLeafLaborResearchAllowed({
    leafWorkId: PARENT,
    parentWorkId: PARENT,
    pack,
    callSite: IK_LEAF_RESEARCH_CALL_SITE,
  });
  assert("A5 wrong pack BLOCKED", !gate.ok && gate.blockReason === "LEAF_PACK_NOT_BOUND", gate);
}

// A6 — material leaf eligible
{
  const pack = makeGladziePack({ lifecycle: "DRAFT" });
  const gate = assertLeafMaterialResearchAllowed({
    materialKey: MAT,
    parentWorkId: PARENT,
    pack,
    callSite: IK_LEAF_RESEARCH_CALL_SITE,
    namePl: "Gładź gipsowa",
    unit: "kg",
  });
  assert("A6 material leaf ALLOW", gate.ok === true, gate);

  clearIkLeafResearchSessionDedupeForTests();
  resetMaterialResearchSessionCooldownForTests();
  const orch = await runIkLeafMaterialResearch({
    item: { id: "t-leaf-a", tenderId: "t-leaf-a" },
    parentWorkId: PARENT,
    materialKey: MAT,
    pack,
    demand: {
      demandId: `${MAT}|null|wroclaw|MARKET_QUOTE_MISSING`,
      materialKey: MAT,
      catalogWorkId: null,
      normalizedName: "gladz gipsowa",
      unit: "kg",
      region: "wroclaw",
      missingLayer: "MARKET_QUOTE_MISSING",
      status: "QUEUED",
      priority: "MEDIUM",
      occurrenceCount: 1,
      tenderIds: ["t-leaf-a"],
      firstRequestedAt: T_FRESH,
      lastRequestedAt: T_FRESH,
      reason: "leaf-research-phase-a",
    },
    claimantId: "test-leaf-a",
    executeLeafResearch: true,
    nowMs: NOW,
    useMockForTests: true,
    mockPriceNet: 2.65,
  });
  assert(
    "A6 material orch EXECUTED",
    orch.status === "EXECUTED" && orch.research != null,
    orch,
  );
  assert("A6 no PM write", orch.priceMemoryWrite === false);
  assert("A6 no autoAccept", orch.autoAcceptExecuted === false);
  assert("A6 DRAFT not BOM feed", orch.productionBomFeedAllowed === false);
}

// A7 — parent material Expert remains HOLD
{
  const works = [makeWork()];
  const store = makeStore(works);
  const fixtureLines = [
    {
      dwellingId: "kotlarska",
      line: minimalLine({ lineId: "L-gladzie", lp: "13", quantity: 13 }),
      provenance: provenance("L-gladzie"),
    },
  ];
  const material = await runIkMasterBoqMaterialExpert({
    item: {
      id: "t-leaf-a",
      tenderId: "t-leaf-a",
      title: "PHASE A leaf",
      status: "seen",
      updatedAt: new Date().toISOString(),
    },
    expert: readyExpert(fixtureLines),
    store,
    works,
    executeResearch: true,
    nowMs: NOW,
  });
  const matRow = material.lines.find((l) => l.lineId === "L-gladzie");
  assert(
    "A7 parent material HOLD",
    matRow?.priceStatus === IK_RESEARCH_HELD_COMPOUND_STATUS,
    matRow?.priceStatus,
  );
  assert("A7 no material researchCalls", material.counts.researchCalls === 0, material.counts);
}

// A8 — DRAFT leaf identity OK · production BOM forbidden
{
  const draft = makeGladziePack({ lifecycle: "DRAFT" });
  const foundLeaf = findTechnologyPacksForWorkId(
    PARENT,
    [draft],
    LEAF_RESEARCH_PACK_LIFECYCLES,
  );
  assert("A8 DRAFT in leaf lookup", foundLeaf.length === 1, foundLeaf);
  const foundActive = findActiveTechnologyPacksForWorkId(PARENT, [draft]);
  assert("A8 DRAFT not ACTIVE lookup", foundActive.length === 0, foundActive);
  assert("A8 canPackFeedProductionBom false", canPackFeedProductionBom(draft) === false);
  const bom = resolveTechnologyBomForWork({
    workId: PARENT,
    unit: "m2",
    positionQuantity: 13,
    packs: [draft],
  });
  assert(
    "A8 DRAFT → production BOM MISSING/not feed",
    bom.status === "MISSING_BOM" || bom.components.length === 0,
    bom,
  );
  const resolved = resolveLeafResearchPacksForParent({
    parentWorkId: PARENT,
    packs: [draft],
  });
  assert("A8 resolveLeafResearchPacks finds DRAFT", resolved.length === 1);
}

// A9 — ACTIVE Composite pricing unchanged
{
  const active = makeGladziePack({
    lifecycle: "ACTIVE",
    packId: "pack.tpi.gladzie.active",
  });
  // ACTIVE pack needs production-ready provenance for BOM feed — fixture_legacy ok
  assert("A9 ACTIVE leaf lookup", findActiveTechnologyPacksForWorkId(PARENT, [active]).length === 1);
  const bom = resolveTechnologyBomForWork({
    workId: PARENT,
    unit: "m2",
    positionQuantity: 13,
    packs: [active],
  });
  assert(
    "A9 ACTIVE Composite BOM resolves",
    bom.status === "OK" || bom.status === "READY" || (bom.components && bom.components.length > 0),
    bom,
  );
  assert("A9 canPackFeedProductionBom true", canPackFeedProductionBom(active) === true, active.lifecycle);
}

// A10 — loop safety (one pass per leaf context)
{
  clearIkLeafResearchSessionDedupeForTests();
  clearIkLaborResearchSessionDedupeForTests();
  clearWorkRateResearchAntiStormState();
  const pack = makeGladziePack({ lifecycle: "DRAFT" });
  const store = makeStore([makeWork()]);
  const input = {
    item: { id: "t-leaf-a", tenderId: "t-leaf-a" },
    parentWorkId: PARENT,
    leafWorkId: PARENT,
    unit: "m2",
    namePl: "Gładzie / tynki",
    pack,
    store,
    executeLeafResearch: true,
    nowMs: NOW,
    lookupPort: emptyLookup(),
    bypassCooldown: true,
  };
  const first = await runIkLeafLaborResearch(input);
  const second = await runIkLeafLaborResearch(input);
  assert("A10 first EXECUTED", first.status === "EXECUTED", first);
  assert("A10 second SKIPPED_SESSION_DONE", second.status === "SKIPPED_SESSION_DONE", second);
  assert(
    "A10 dedupe key shape",
    buildIkLeafResearchDedupeKey({
      tenderId: "t-leaf-a",
      packId: pack.packId,
      packVersion: pack.packVersion,
      domain: "labor",
      leafId: PARENT,
      unit: "m2",
    }).includes(pack.packId),
  );
}

// A11 — no Owner mutation + executeLeafResearch default off
{
  const pack = makeGladziePack();
  const store = makeStore([makeWork()]);
  clearIkLeafResearchSessionDedupeForTests();
  const held = await runIkLeafLaborResearch({
    item: { id: "t-leaf-a", tenderId: "t-leaf-a" },
    parentWorkId: PARENT,
    leafWorkId: PARENT,
    unit: "m2",
    namePl: "Gładzie / tynki",
    pack,
    store,
    // executeLeafResearch omitted → false
    nowMs: NOW,
    lookupPort: emptyLookup(),
  });
  assert("A11 default HOLD_EXECUTE_OFF", held.status === "HOLD_EXECUTE_OFF", held);
  assert("A11 research null", held.research === null);
  assert("A11 Accept 0", held.autoAcceptExecuted === false);
  assert("A11 OUR RATE write 0", held.ourRateWrite === false);

  const wrongSite = assertLeafLaborResearchAllowed({
    leafWorkId: PARENT,
    parentWorkId: PARENT,
    pack,
    callSite: "LABOR_EXPERT",
  });
  assert("A11 forged callSite BLOCKED", !wrongSite.ok && wrongSite.blockReason === "LEAF_CALL_SITE");
}

console.log(`\n=== RESULT pass=${pass} fail=${fail} liveFetch=${liveFetch} ===\n`);
if (fail > 0) process.exit(1);
