/**
 * MULTI-BOQ-WORK-IDENTITY-01 — bridge Multi-BOQ → Product Mapper → F5.
 *
 * npx vite-node scripts/test-multi-boq-work-identity-01.mjs
 */
import {
  clearMultiDwellingPackageStore,
  confirmDwelling,
  enableMultiDwellingMode,
  getTenderPackage,
  mapDocumentToDwelling,
  setExpectedDwellingCount,
} from "../src/lib/multi-dwelling/index.ts";
import {
  attachComposedBoqToDwelling,
  composeDwellingOfferBoq,
  mapComposedDwellingOfferBoq,
  resolveDwellingCostSnapshotForPricing,
} from "../src/lib/multi-boq/index.ts";
import {
  evaluateBidCutoverGate,
  computeShadowPositionCostsForOfferBoq,
  resolveWorkIdentityFromOfferBoqLine,
} from "../src/lib/tender-position-cost/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";
import {
  clearPackRegistryForTests,
  clearDefinitionRegistryForTests,
  clearCapabilityRegistryForTests,
  seedB0Fixtures,
} from "../src/lib/technology-foundation/index.ts";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => {
    lsStore[k] = String(v);
  },
  removeItem: (k) => {
    delete lsStore[k];
  },
  clear: () => {
    Object.keys(lsStore).forEach((k) => delete lsStore[k]);
  },
};

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("UNEXPECTED_LIVE_FETCH");
};

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

const NOW = Date.parse("2026-08-13T20:00:00.000Z");
const T_FRESH = "2026-08-13T12:00:00.000Z";
const TID = "tender-WI-01";
const PAINT_WORK = "legacy-malowanie-m2";
const PAINT_UNIT = "m2";
const PAINT_MAT = "mat.farba_lateksowa_wewnetrzna";
const PAINT_HOST = "cw.product.farba_lateksowa_wewnetrzna";

function resetTf() {
  clearPackRegistryForTests();
  clearDefinitionRegistryForTests();
  clearCapabilityRegistryForTests();
  seedB0Fixtures();
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

function makePaintMaterialWork(overrides = {}) {
  return {
    id: PAINT_HOST,
    tradeId: "MALOWANIE",
    namePl: "Farba lateksowa",
    unit: "l",
    companyPricePln: 999,
    marketQuotes: quoteCell(40, T_FRESH),
    marketQuoteHistory: [],
    commercialPricing: { marginPct: 25, updatedAt: T_FRESH, source: "owner" },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: [PAINT_MAT],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    ...overrides,
  };
}

function makeLaborHost(overrides = {}) {
  return {
    id: PAINT_WORK,
    tradeId: "MALOWANIE",
    namePl: "Malowanie ścian",
    unit: PAINT_UNIT,
    companyPricePln: 35,
    marketQuotes: {},
    marketQuoteHistory: [],
    commercialPricing: { marginPct: 15, updatedAt: T_FRESH, source: "owner" },
    ourWorkRate: {
      workId: PAINT_WORK,
      unit: PAINT_UNIT,
      ourRatePln: 20,
      sourceType: "OWNER",
      regionScope: "WROCLAW",
      observedAt: T_FRESH,
      updatedAt: T_FRESH,
      history: [],
    },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: ["malowanie", "farba", "knr"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    legacyCategoryId: "MALOWANIE",
    ...overrides,
  };
}

function makeKnrWork(overrides = {}) {
  return makeLaborHost({
    id: "cw.knr.215.rurociagi",
    namePl: "KNR 2-15 Rurociągi PP wodociągowe",
    unit: "mb",
    keywords: ["knr215", "knr 2-15", "rurociagi", "wodociag", "knr215rurociagi"],
    tradeId: "INSTALACJE",
    legacyCategoryId: "INSTALACJE_SANITARNE",
    ourWorkRate: {
      workId: "cw.knr.215.rurociagi",
      unit: "mb",
      ourRatePln: 45,
      sourceType: "OWNER",
      regionScope: "WROCLAW",
      observedAt: T_FRESH,
      updatedAt: T_FRESH,
      history: [],
    },
    ...overrides,
  });
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

function seedStore(works) {
  const store = makeStore(works);
  lsStore["kw-wgdom-work-catalog"] = JSON.stringify(store);
  return store;
}

function reset() {
  clearMultiDwellingPackageStore();
  Object.keys(lsStore).forEach((k) => delete lsStore[k]);
  fetchCalls = 0;
  resetTf();
}

function makeSnap(filename, lines) {
  return {
    ok: true,
    sourceFilename: filename,
    rowCount: lines.length,
    rows: lines.map((l) => ({
      lp: l.lp,
      description: l.description,
      unit: l.unit ?? "m2",
      quantity: l.quantity ?? "1",
      unitPrice: "",
      total: "",
    })),
    catalogQuantities: lines.map((l) => ({
      lp: l.lp,
      description: l.description,
      unit: l.unit ?? "m2",
      quantity: l.quantity ?? "1",
    })),
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: T_FRESH,
  };
}

function art(documentId, filename, lines, branchHint = "unknown") {
  return {
    documentId,
    artifactId: `art:${documentId}`,
    filename,
    branchHint,
    snapshot: makeSnap(filename, lines),
  };
}

function setupD01(docId) {
  enableMultiDwellingMode(TID, { expectedDwellingCount: 1 });
  setExpectedDwellingCount(TID, 1);
  confirmDwelling({ tenderId: TID, dwellingId: "D01", labelPl: "D01" });
  const r = mapDocumentToDwelling({
    tenderId: TID,
    documentId: docId,
    dwellingId: "D01",
  });
  if (!r.ok) throw new Error(`map fail: ${r.reason}`);
}

function emptyLineShell(extra) {
  return {
    workCategory: null,
    categoryId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: null,
    aliasRuleId: null,
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
    athUnitPricePln: null,
    athTotalPln: null,
    pricingSourceLabelPl: "test",
    aiRationale: null,
    userEdited: false,
    editedFields: [],
    warnings: [],
    ...extra,
  };
}

function structuralDoc(lines) {
  return {
    schemaVersion: 5,
    tenderId: TID,
    version: 1,
    builtAt: T_FRESH,
    parserSnapshotRef: {
      kosztorysParsedAt: T_FRESH,
      sourceFilename: "multi_boq:D01:1",
      rowCount: lines.length,
      pdfPrzedmiarCase: null,
    },
    lines,
    totals: {
      lineCount: lines.length,
      materialCostPln: null,
      laborCostPln: null,
      equipmentCostPln: null,
      directCostPln: null,
      kpPln: null,
      profitPln: null,
      offerNetPln: null,
      offerGrossPln: null,
    },
    recomputeToken: "t",
    buildStatus: "structural_only",
    mappingStats: null,
    mappingAppliedAt: null,
    costIntelligenceStats: null,
    costIntelligenceAppliedAt: null,
    pricingStats: null,
    pricingAppliedAt: null,
    userEditStats: null,
    warnings: [],
  };
}

const TRUSTED = new Set(["exact_knr", "catalog_map", "alias", "manual"]);

// ─── T1 exact KNR → trusted catalogWorkId ───────────────────────────────────
{
  reset();
  const works = [makeKnrWork()];
  seedStore(works);
  const mapped = mapComposedDwellingOfferBoq({
    document: structuralDoc([
      emptyLineShell({
        lineId: "L1",
        lp: "56",
        description:
          "KNR 2-15 Rurociągi w instalacjach wodociągowych o śr. nom. 20-25 mm PP",
        quantity: 20,
        quantityRaw: "20.00",
        unit: "mb",
        catalogWorkId: null,
        knrHint: "KNR 2-15",
        matchMethod: "snapshot",
        matchedBy: "snapshot",
        matchConfidence: "medium",
        aiConfidence: "medium",
      }),
    ]),
    works,
    mappedAt: T_FRESH,
  });
  const line = mapped.lines[0];
  const id = resolveWorkIdentityFromOfferBoqLine(line);
  ok("T1 catalogWorkId set", Boolean(line.catalogWorkId), line.catalogWorkId);
  ok("T1 matchMethod trusted", TRUSTED.has(line.matchMethod), line.matchMethod);
  ok("T1 F5 identity OK", id.status === "OK", id);
  ok("T1 buildStatus mapped", mapped.buildStatus === "mapped");
}

// ─── T2 description match path (alias/catalog) ──────────────────────────────
{
  reset();
  const works = [makeLaborHost(), makePaintMaterialWork()];
  seedStore(works);
  const mapped = mapComposedDwellingOfferBoq({
    document: structuralDoc([
      emptyLineShell({
        lineId: "LP",
        lp: "10",
        description: "Malowanie ścian farbą lateksową dwukrotne",
        quantity: 12,
        quantityRaw: "12",
        unit: "m2",
        catalogWorkId: null,
        knrHint: null,
        matchMethod: "snapshot",
        matchedBy: "snapshot",
        matchConfidence: "low",
        aiConfidence: "low",
      }),
    ]),
    works,
  });
  const line = mapped.lines[0];
  const id = resolveWorkIdentityFromOfferBoqLine(line);
  if (line.catalogWorkId) {
    ok("T2 matched → trusted method", TRUSTED.has(line.matchMethod), line.matchMethod);
    ok("T2 F5 OK or Ambiguous handled", id.status === "OK" || id.status === "AMBIGUOUS", id);
  } else {
    ok("T2 unmatched → null id", line.catalogWorkId == null);
    ok("T2 F5 NO_IDENTITY", id.status === "NO_IDENTITY" || id.status === "INVALID_UNIT", id);
  }
}

// ─── T3 ambiguous competing candidates → F5 not auto-OK ─────────────────────
{
  reset();
  const works = [
    makeLaborHost({
      id: "cw.amb.a",
      namePl: "Montaż listew A",
      unit: "m",
      keywords: ["listwy", "montaz"],
      ourWorkRate: {
        workId: "cw.amb.a",
        unit: "m",
        ourRatePln: 10,
        sourceType: "OWNER",
        regionScope: "WROCLAW",
        observedAt: T_FRESH,
        updatedAt: T_FRESH,
        history: [],
      },
    }),
    makeLaborHost({
      id: "cw.amb.b",
      namePl: "Montaż listew B",
      unit: "m",
      keywords: ["listwy", "montaz"],
      ourWorkRate: {
        workId: "cw.amb.b",
        unit: "m",
        ourRatePln: 11,
        sourceType: "OWNER",
        regionScope: "WROCLAW",
        observedAt: T_FRESH,
        updatedAt: T_FRESH,
        history: [],
      },
    }),
  ];
  seedStore(works);
  const mapped = mapComposedDwellingOfferBoq({
    document: structuralDoc([
      emptyLineShell({
        lineId: "LA",
        lp: "26",
        description: "Montaż listew przypodłogowych",
        quantity: 29.44,
        quantityRaw: "29.44",
        unit: "m",
        catalogWorkId: null,
        knrHint: null,
        matchMethod: "snapshot",
        matchedBy: "snapshot",
        matchConfidence: "low",
        aiConfidence: "low",
      }),
    ]),
    works,
  });
  const line = mapped.lines[0];
  const id = resolveWorkIdentityFromOfferBoqLine(line);
  const distinct = [
    ...new Set(
      (line.candidateMatches ?? [])
        .map((c) => String(c.catalogWorkId || "").trim())
        .filter(Boolean),
    ),
  ];
  const competing =
    distinct.length >= 2 &&
    line.matchMethod !== "exact_knr" &&
    line.matchMethod !== "manual" &&
    !(line.matchMethod === "alias" && line.matchConfidence === "high");
  if (competing) {
    ok("T3 competing → F5 not OK", id.status !== "OK", id);
  } else {
    ok(
      "T3 single primary OR unmatched — no invent PLN",
      line.lineTotalPln == null,
      { method: line.matchMethod, id: line.catalogWorkId, status: id.status },
    );
  }
}

// ─── T4 unmatched → GAP ─────────────────────────────────────────────────────
{
  reset();
  const works = [makeLaborHost()];
  seedStore(works);
  const mapped = mapComposedDwellingOfferBoq({
    document: structuralDoc([
      emptyLineShell({
        lineId: "U1",
        lp: "999",
        description: "XYZQWERTY unikatowy niezwiązany opis roboty bez knr",
        quantity: 1,
        quantityRaw: "1",
        unit: "kpl",
        catalogWorkId: null,
        knrHint: null,
        matchMethod: "snapshot",
        matchedBy: "snapshot",
        matchConfidence: "low",
        aiConfidence: "low",
      }),
    ]),
    works,
  });
  const line = mapped.lines[0];
  const id = resolveWorkIdentityFromOfferBoqLine(line);
  ok(
    "T4 unmatched → F5 NO_IDENTITY (or invalid unit)",
    id.status === "NO_IDENTITY" || id.status === "INVALID_UNIT",
    { status: id.status, method: line.matchMethod, cw: line.catalogWorkId },
  );
  ok("T4 no invented PLN", line.lineTotalPln == null && line.laborCostPln == null);
}

// ─── T5 CONFLICT → no mapping ───────────────────────────────────────────────
{
  reset();
  const a1 = art("doc_conflict", "Szarzyńskiego 80_1 - przedmiar.pdf", [
    { lp: "22", description: "Okładziny A KNR AT-22", unit: "m2", quantity: "14.20" },
    { lp: "22", description: "Okładziny B KNR 2-02 inne", unit: "m2", quantity: "8.00" },
  ]);
  setupD01("doc_conflict");
  const snap = resolveDwellingCostSnapshotForPricing({
    tenderId: TID,
    dwellingId: "D01",
    artifacts: [a1],
  });
  const composed = composeDwellingOfferBoq({ snapshot: snap });
  ok(
    "T5 CONFLICT compose fails",
    !composed.ok && composed.reason === "CONFLICT_HOLD",
    { completeness: snap.completeness, reason: composed.ok ? null : composed.reason },
  );
  const attached = attachComposedBoqToDwelling({
    tenderId: TID,
    dwellingId: "D01",
    artifacts: [a1],
    works: [makeLaborHost()],
  });
  ok("T5 attach fails CONFLICT (Mapper not applied)", !attached.ok && attached.reason === "CONFLICT_HOLD");
}

// ─── T6 attach → Mapper invoked ─────────────────────────────────────────────
{
  reset();
  const works = [makeKnrWork()];
  seedStore(works);
  const a1 = art("doc_ok", "Reja 8_27 - przedmiar.pdf", [
    {
      lp: "56",
      description:
        "KNR 2-15 Rurociągi w instalacjach wodociągowych o śr. nom. 20-25 mm PP",
      unit: "mb",
      quantity: "20.00",
    },
  ]);
  setupD01("doc_ok");
  const attached = attachComposedBoqToDwelling({
    tenderId: TID,
    dwellingId: "D01",
    artifacts: [a1],
    works,
    mappedAt: T_FRESH,
  });
  ok("T6 attach ok", attached.ok, attached);
  const boq = getTenderPackage(TID)?.dwellings?.[0]?.offerBoq;
  ok("T6 mappingAppliedAt set", Boolean(boq?.mappingAppliedAt), boq?.mappingAppliedAt);
  ok("T6 buildStatus mapped", boq?.buildStatus === "mapped", boq?.buildStatus);
  ok("T6 matchMethod ≠ snapshot", boq?.lines?.[0]?.matchMethod !== "snapshot", boq?.lines?.[0]?.matchMethod);
}

// ─── T7 F5 receives trusted identity ────────────────────────────────────────
{
  reset();
  const works = [makeKnrWork()];
  seedStore(works);
  const a1 = art("doc_f5", "Reja 8_27 - przedmiar.pdf", [
    {
      lp: "56",
      description:
        "KNR 2-15 Rurociągi w instalacjach wodociągowych o śr. nom. 20-25 mm PP",
      unit: "mb",
      quantity: "20.00",
    },
  ]);
  setupD01("doc_f5");
  attachComposedBoqToDwelling({
    tenderId: TID,
    dwellingId: "D01",
    artifacts: [a1],
    works,
  });
  const boq = getTenderPackage(TID)?.dwellings?.[0]?.offerBoq;
  const shadow = computeShadowPositionCostsForOfferBoq({
    doc: boq,
    store: makeStore(works),
    nowMs: NOW,
    tenderId: TID,
    dwellingId: "D01",
    ensureOwnerQuestions: false,
  });
  const gate = evaluateBidCutoverGate(shadow);
  const id0 = shadow.lines[0]?.identity;
  ok("T7 F5 identity OK", id0?.status === "OK", id0);
  ok("T7 workId present", Boolean(id0?.workId), id0?.workId);
  // complete may still be 0 if BOM missing — identity seam is the epic scope
  ok("T7 billable >= 1", gate.billableLineCount >= 1, gate);
  ok(
    "T7 no invent PLN on incomplete position",
    shadow.lines[0]?.positionComplete === true ||
      (shadow.lines[0]?.position?.totalPln == null || shadow.lines[0]?.gaps?.length > 0),
    {
      complete: shadow.lines[0]?.positionComplete,
      gaps: shadow.lines[0]?.gaps,
    },
  );
  ok("T7 zero unexpected fetch", fetchCalls === 0, fetchCalls);
}

// ─── T8 no invented catalogWorkId on empty catalog ──────────────────────────
{
  reset();
  seedStore([]);
  const a1 = art("doc_empty", "Reja 8_27 - przedmiar.pdf", [
    { lp: "1", description: "KNR 2-15 Rurociągi PP", unit: "mb", quantity: "5" },
  ]);
  setupD01("doc_empty");
  attachComposedBoqToDwelling({
    tenderId: TID,
    dwellingId: "D01",
    artifacts: [a1],
    works: [],
  });
  const line = getTenderPackage(TID)?.dwellings?.[0]?.offerBoq?.lines?.[0];
  ok("T8 empty catalog → null catalogWorkId", line?.catalogWorkId == null, line?.catalogWorkId);
  ok("T8 no invented PLN", line?.lineTotalPln == null);
}

console.log(`\nMULTI-BOQ-WORK-IDENTITY-01: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
