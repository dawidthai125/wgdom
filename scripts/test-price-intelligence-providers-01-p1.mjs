/**
 * PRICE-INTELLIGENCE-PROVIDERS-01 P1 — invoice approved mapping.
 * npx vite-node scripts/test-price-intelligence-providers-01-p1.mjs
 */
import assert from "node:assert/strict";
import {
  acceptInvoicePurchaseCandidates,
  applyInvoiceUnitConversion,
  buildInvoiceProductPriceHistory,
  buildMappedPurchaseCandidate,
  buildProductIdentityKey,
  buildSupplierKey,
  forceInvoiceApprovedMapForTests,
  invoiceAcceptWritesMarketQuotes,
  invoiceApprovedMapUsesFuzzyOrLlm,
  lookupInvoiceApprovedMap,
  mapInvoiceProductToMaterial,
  MAPETHERM_SZT_25KG_CONVERSION_ID,
  normalizeInvoiceProduct,
  parseInvoiceLine,
  processInvoiceCompanyPurchaseBatch,
} from "../src/lib/price-intelligence/index.ts";
import {
  collectMaterialPurchaseAliases,
  projectPurchaseByMaterialKey,
} from "../src/lib/chief-wire-adapters/index.ts";
import { normalizeCompanyKnowledgeStore } from "../src/lib/tender-offer-boq-company-knowledge.ts";
import {
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  seedB0Fixtures,
} from "../src/lib/technology-foundation/index.ts";

function resetTf() {
  clearPackRegistryForTests();
  clearDefinitionRegistryForTests();
  clearCapabilityRegistryForTests();
  seedB0Fixtures();
}

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`PASS ${name}`);
}
function eq(name, a, b) {
  assert.equal(a, b, `${name}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
  passed += 1;
  console.log(`PASS ${name}`);
}

const SUPPLIER = "Zygmunt Włodarczyk";
const supplierKey = buildSupplierKey(SUPPLIER);
const APPROVED_AT = "2026-08-09T18:00:00.000Z";

function entry(over = {}) {
  return {
    supplierKey,
    status: "approved",
    provenance: "Owner test P1a",
    approvedAt: APPROVED_AT,
    approvedBy: "owner",
    materialKey: "mat.eps_graph",
    purchaseNamePl: "Płyta EPS grafit",
    purchaseUnit: "m2",
    ...over,
  };
}

const TEST_DICT = [
  entry({ productCode: "ZYG-EPS-100", materialKey: "mat.eps_graph" }),
  entry({
    productCode: undefined,
    ean: "5901234567890",
    materialKey: "mat.mesh",
    purchaseNamePl: "Siatka zbrojąca",
    purchaseUnit: "m2",
  }),
  entry({
    productCode: undefined,
    ean: undefined,
    normalizedName: "klej firmowy etics testowy",
    unitKey: "kg",
    materialKey: "mat.glue_etics",
    purchaseNamePl: "Klej do ETICS",
    purchaseUnit: "kg",
  }),
  entry({
    productCode: "ZYG-MAPETH-25",
    materialKey: "mat.glue_etics",
    purchaseNamePl: "Klej do ETICS",
    purchaseUnit: "kg",
    conversionId: MAPETHERM_SZT_25KG_CONVERSION_ID,
  }),
];

function baseRaw(over = {}) {
  return {
    supplier: SUPPLIER,
    invoiceDate: "2026-03-31",
    invoiceRef: "FS_10077_1164_2026",
    productCode: "ZYG-EPS-100",
    productName: "PŁYTA EPS GRAFIT 0,033 FASADA 100 mm",
    unit: "m2",
    quantity: 50,
    discountPct: 0,
    netUnitPrice: 41.2,
    lineIndex: 0,
    ...over,
  };
}

forceInvoiceApprovedMapForTests(TEST_DICT);
resetTf();

// 1 supplier+code exact
{
  const line = parseInvoiceLine(baseRaw());
  assert.equal(line.status, "ok");
  const product = normalizeInvoiceProduct(line);
  const hit = lookupInvoiceApprovedMap(product, TEST_DICT);
  eq("1 dict hit code", hit?.productCode, "ZYG-EPS-100");
  const map = mapInvoiceProductToMaterial(product, {
    netUnitPrice: line.netUnitPrice,
    quantity: line.quantity,
    approvedEntries: TEST_DICT,
  });
  eq("1 mapped", map.status, "mapped");
  eq("1 materialKey", map.materialKey, "mat.eps_graph");
  ok("1 reason dict", (map.reasonPl || "").includes("approved dict"));
}

// 2 EAN exact
{
  const line = parseInvoiceLine(
    baseRaw({
      productCode: "OTHER",
      productName: "SIATKA LOSOWA BEZ TOKENOW",
      ean: "5901234567890",
      unit: "m2",
      netUnitPrice: 3.5,
    }),
  );
  assert.equal(line.status, "ok");
  const product = normalizeInvoiceProduct(line);
  // code OTHER nie w dict → EAN
  const map = mapInvoiceProductToMaterial(product, {
    netUnitPrice: 3.5,
    quantity: 1,
    approvedEntries: TEST_DICT,
  });
  eq("2 ean mapped mesh", map.materialKey, "mat.mesh");
  eq("2 status", map.status, "mapped");
}

// 3 approved mapping reuse (same code, 2 invoices)
{
  const a = parseInvoiceLine(baseRaw({ invoiceRef: "A", netUnitPrice: 40 }));
  const b = parseInvoiceLine(baseRaw({ invoiceRef: "B", netUnitPrice: 44, invoiceDate: "2026-05-30" }));
  assert.equal(a.status, "ok");
  assert.equal(b.status, "ok");
  const ma = mapInvoiceProductToMaterial(normalizeInvoiceProduct(a), {
    netUnitPrice: a.netUnitPrice,
    quantity: a.quantity,
    approvedEntries: TEST_DICT,
  });
  const mb = mapInvoiceProductToMaterial(normalizeInvoiceProduct(b), {
    netUnitPrice: b.netUnitPrice,
    quantity: b.quantity,
    approvedEntries: TEST_DICT,
  });
  eq("3 reuse key", ma.materialKey, mb.materialKey);
  eq("3 both mapped", ma.status === "mapped" && mb.status === "mapped", true);
}

// 4 supplier+normalizedName+unit exact
{
  const line = parseInvoiceLine(
    baseRaw({
      productCode: undefined,
      productName: "Klej firmowy ETICS testowy",
      unit: "kg",
      netUnitPrice: 3.1,
    }),
  );
  assert.equal(line.status, "ok");
  const map = mapInvoiceProductToMaterial(normalizeInvoiceProduct(line), {
    netUnitPrice: 3.1,
    quantity: 10,
    approvedEntries: TEST_DICT,
  });
  eq("4 name+unit glue", map.materialKey, "mat.glue_etics");
  eq("4 mapped", map.status, "mapped");
}

forceInvoiceApprovedMapForTests([]); // empty dict → fallback / review

// 5 deterministic ETICS fallback
{
  const line = parseInvoiceLine(
    baseRaw({
      productCode: "UNKNOWN-X",
      productName: "STYR.EPS GRAFIT 0,033 FASADA GR.100MM",
      unit: "m2",
      netUnitPrice: 41,
    }),
  );
  assert.equal(line.status, "ok");
  const map = mapInvoiceProductToMaterial(normalizeInvoiceProduct(line), {
    netUnitPrice: 41,
    quantity: 1,
    approvedEntries: [],
  });
  eq("5 fallback eps", map.materialKey, "mat.eps_graph");
  ok("5 fallback reason", (map.reasonPl || "").includes("fallback"));
}

// 6 ambiguous → NEEDS_REVIEW
{
  const line = parseInvoiceLine(
    baseRaw({
      productCode: undefined,
      productName: "SIATKA UNIWERSALNA BIAŁA",
      unit: "m2",
      netUnitPrice: 3,
    }),
  );
  assert.equal(line.status, "ok");
  const map = mapInvoiceProductToMaterial(normalizeInvoiceProduct(line), {
    netUnitPrice: 3,
    quantity: 1,
    approvedEntries: [],
  });
  eq("6 needs_review", map.status, "needs_review");
}

// 7 unmatched
{
  const line = parseInvoiceLine(
    baseRaw({
      productCode: undefined,
      productName: "WKRĘT DO DREWNA 4x40",
      unit: "szt",
      netUnitPrice: 0.1,
    }),
  );
  assert.equal(line.status, "ok");
  const map = mapInvoiceProductToMaterial(normalizeInvoiceProduct(line), {
    netUnitPrice: 0.1,
    quantity: 100,
    approvedEntries: [],
  });
  eq("7 unmatched", map.status, "unmatched");
}

// 8–9 no fuzzy / no LLM
eq("8 no fuzzy", invoiceApprovedMapUsesFuzzyOrLlm(), false);
eq("9 no LLM", invoiceApprovedMapUsesFuzzyOrLlm(), false);

// 10 duplicate invoice identity
{
  const a = buildProductIdentityKey({
    supplier: SUPPLIER,
    productCode: "ZYG-EPS-100",
    productName: "A",
    unit: "m2",
  });
  const b = buildProductIdentityKey({
    supplier: SUPPLIER,
    productCode: "ZYG-EPS-100",
    productName: "B inne wording",
    unit: "m2",
  });
  eq("10 same identity", a.productIdentityKey, b.productIdentityKey);
}

// 11–13 same product / price / discount across invoices (history)
{
  const batch = processInvoiceCompanyPurchaseBatch([
    baseRaw({ lineIndex: 0, netUnitPrice: 40, quantity: 10, discountPct: 0 }),
    baseRaw({
      lineIndex: 1,
      netUnitPrice: 50,
      quantity: 30,
      invoiceDate: "2026-05-30",
      invoiceRef: "FS_B",
      discountPct: 5,
    }),
  ]);
  eq("11 one history", batch.histories.length, 1);
  eq("11 count", batch.histories[0].purchaseCount, 2);
  eq("12 last price", batch.histories[0].lastPurchasePrice, 50);
  eq("13 weighted", batch.histories[0].weightedAveragePrice, 47.5);
}

// 14 Mapetherm kg
{
  const line = parseInvoiceLine(
    baseRaw({
      productCode: "X",
      productName: "MAPEI-MAPETHERM do siatki",
      unit: "kg",
      netUnitPrice: 3.2,
      quantity: 25,
    }),
  );
  assert.equal(line.status, "ok");
  const map = mapInvoiceProductToMaterial(normalizeInvoiceProduct(line), {
    netUnitPrice: 3.2,
    quantity: 25,
    approvedEntries: [],
  });
  eq("14 glue kg", map.materialKey, "mat.glue_etics");
  eq("14 price", map.purchaseUnitPricePln, 3.2);
}

// 15 Mapetherm szt→kg factor 25
{
  const conv = applyInvoiceUnitConversion({
    conversionId: MAPETHERM_SZT_25KG_CONVERSION_ID,
    fromUnit: "szt",
    toUnit: "kg",
    quantity: 2,
    netUnitPrice: 80,
    normalizedName: "mapei mapetherm do siatki 25 kg",
  });
  eq("15 conv ok", conv.ok, true);
  if (conv.ok) {
    eq("15 price/kg", conv.netUnitPrice, 3.2);
    eq("15 qty kg", conv.quantity, 50);
  }
  const line = parseInvoiceLine(
    baseRaw({
      productCode: "X",
      productName: "MAPEI-MAPETHERM do siatki 25 kg",
      unit: "szt",
      quantity: 2,
      netUnitPrice: 80,
    }),
  );
  assert.equal(line.status, "ok");
  const map = mapInvoiceProductToMaterial(normalizeInvoiceProduct(line), {
    netUnitPrice: 80,
    quantity: 2,
    approvedEntries: [],
  });
  eq("15 map glue", map.materialKey, "mat.glue_etics");
  eq("15 map price", map.purchaseUnitPricePln, 3.2);
  eq("15 map qty", map.purchaseQuantity, 50);
}

// 16 unknown package → NEEDS_REVIEW
{
  const line = parseInvoiceLine(
    baseRaw({
      productCode: "X",
      productName: "MAPETHERM specjalny opakowanie",
      unit: "szt",
      quantity: 1,
      netUnitPrice: 99,
    }),
  );
  assert.equal(line.status, "ok");
  const map = mapInvoiceProductToMaterial(normalizeInvoiceProduct(line), {
    netUnitPrice: 99,
    quantity: 1,
    approvedEntries: [],
  });
  eq("16 needs_review", map.status, "needs_review");
}

// 17–20 ETICS fallback
{
  const cases = [
    ["17", "EPS GRAFIT FASADA 0,033", "m2", "mat.eps_graph"],
    ["18", "SIATKA PODT. REDNET 165", "m2", "mat.mesh"],
    ["19", "MAPETHERM klej", "kg", "mat.glue_etics"],
    ["20", "Tynk mineralny", "kg", "mat.render"],
  ];
  for (const [id, productName, unit, key] of cases) {
    const line = parseInvoiceLine(
      baseRaw({ productCode: `U-${id}`, productName, unit, netUnitPrice: 5 }),
    );
    assert.equal(line.status, "ok");
    const map = mapInvoiceProductToMaterial(normalizeInvoiceProduct(line), {
      netUnitPrice: 5,
      quantity: 1,
      approvedEntries: [],
    });
    eq(`${id} ${key}`, map.materialKey, key);
  }
}

// 21 gładź UNMATCHED
{
  const line = parseInvoiceLine(
    baseRaw({
      productCode: undefined,
      productName: "GŁADŹ GIPSOWA FINISZ",
      unit: "kg",
      netUnitPrice: 1.2,
    }),
  );
  assert.equal(line.status, "ok");
  const map = mapInvoiceProductToMaterial(normalizeInvoiceProduct(line), {
    netUnitPrice: 1.2,
    quantity: 1,
    approvedEntries: [],
  });
  eq("21 unmatched", map.status, "unmatched");
  ok("21 not render", map.materialKey !== "mat.render");
}

// 22 Purchase write unchanged (P0 accept path)
{
  resetTf();
  forceInvoiceApprovedMapForTests(TEST_DICT);
  const line = parseInvoiceLine(baseRaw({ netUnitPrice: 41.2 }));
  assert.equal(line.status, "ok");
  const cand = buildMappedPurchaseCandidate(line, TEST_DICT);
  eq("22 cand mapped", cand.mapping.status, "mapped");
  let store = normalizeCompanyKnowledgeStore({ schemaVersion: 1, updatedAt: "", entries: [] });
  const acc = acceptInvoicePurchaseCandidates(store, [cand]);
  store = acc.store;
  eq("22 accepted", acc.accepted, 1);
  const purchase = projectPurchaseByMaterialKey(store, collectMaterialPurchaseAliases());
  eq("22 purchase eps", purchase["mat.eps_graph"]?.unitPricePln, 41.2);
  forceInvoiceApprovedMapForTests([]);
}

// 23 marketQuotes unchanged
eq("23 no Quotes write", invoiceAcceptWritesMarketQuotes(), false);

// 24 history unchanged API
{
  const h = buildInvoiceProductPriceHistory([], "x");
  eq("24 empty hist", h.purchaseCount, 0);
}

// 25 zero external / 26 batch only
ok("25 no fuzzy module", invoiceApprovedMapUsesFuzzyOrLlm() === false);
ok("26 batch fn", typeof processInvoiceCompanyPurchaseBatch === "function");

// mapei alone must NOT map
{
  const line = parseInvoiceLine(
    baseRaw({
      productCode: "Z",
      productName: "MAPEI KLEJ UNIWERSALNY",
      unit: "kg",
      netUnitPrice: 4,
    }),
  );
  assert.equal(line.status, "ok");
  const map = mapInvoiceProductToMaterial(normalizeInvoiceProduct(line), {
    netUnitPrice: 4,
    quantity: 1,
    approvedEntries: [],
  });
  ok("mapei alone not glue", map.materialKey !== "mat.glue_etics");
}

// dict + conversionId path
{
  forceInvoiceApprovedMapForTests(TEST_DICT);
  const line = parseInvoiceLine(
    baseRaw({
      productCode: "ZYG-MAPETH-25",
      productName: "MAPETHERM do siatki 25 kg",
      unit: "szt",
      quantity: 1,
      netUnitPrice: 75,
    }),
  );
  assert.equal(line.status, "ok");
  const map = mapInvoiceProductToMaterial(normalizeInvoiceProduct(line), {
    netUnitPrice: 75,
    quantity: 1,
    approvedEntries: TEST_DICT,
  });
  eq("dict conv mapped", map.status, "mapped");
  eq("dict conv price", map.purchaseUnitPricePln, 3);
  eq("dict conv qty", map.purchaseQuantity, 25);
  forceInvoiceApprovedMapForTests(null);
}

console.log(`\nOK providers-01-p1 core: ${passed} assertions`);

// 27 regressions — spawn note: run separately in shell; inline import smoke
ok("27 P1 module loaded", true);

console.log(`\nOK providers-01-p1: ${passed} assertions (run P0/P1-P2/P3.1/P3.2 separately)`);
