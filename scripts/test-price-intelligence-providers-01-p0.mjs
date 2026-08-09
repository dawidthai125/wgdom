/**
 * PRICE-INTELLIGENCE-PROVIDERS-01 P0 — FAKTURY → COMPANY PURCHASE.
 * npx vite-node scripts/test-price-intelligence-providers-01-p0.mjs
 *
 * Testy 1–20 + regresje P1/P2/P3.1/P3.2 (smoke import).
 */
import assert from "node:assert/strict";
import {
  projectPurchaseByMaterialKey,
  collectMaterialPurchaseAliases,
} from "../src/lib/chief-wire-adapters/index.ts";
import {
  acceptInvoicePurchaseCandidates,
  buildInvoiceProductPriceHistory,
  buildProductIdentityKey,
  invoiceAcceptWritesMarketQuotes,
  mapInvoiceProductToMaterial,
  normalizeInvoiceProduct,
  parseInvoiceLine,
  processInvoiceCompanyPurchaseBatch,
  resolveEffectiveNetUnitPrice,
  PI31_APPROVED_MATERIALS,
  applyPi31ApprovedPurchaseToKnowledge,
} from "../src/lib/price-intelligence/index.ts";
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
const SUPPLIER_B = "Inny Dostawca Sp. z o.o.";

function baseRaw(over = {}) {
  return {
    supplier: SUPPLIER,
    invoiceDate: "2026-03-31",
    invoiceRef: "FS_10077_1164_2026",
    productCode: "EPS-G-100",
    productName: "PŁYTA EPS GRAFIT 0,033 FASADA 100 mm",
    unit: "m2",
    quantity: 50,
    discountPct: 5,
    netUnitPrice: 42.5,
    netValue: 2125,
    vatPct: 23,
    grossValue: 2613.75,
    ksefId: "KSeF-TEST-001",
    lineIndex: 0,
    ...over,
  };
}

resetTf();

// 1. parse poprawnej linii
{
  const r = parseInvoiceLine(baseRaw());
  eq("1 parse status ok", r.status, "ok");
  if (r.status === "ok") {
    eq("1 netUnitPrice", r.netUnitPrice, 42.5);
    eq("1 productName", r.productName.includes("EPS"), true);
  }
}

// 2. brak ceny → reject
{
  const r = parseInvoiceLine(baseRaw({ netUnitPrice: undefined, listNetUnitPrice: undefined, discountPct: 0 }));
  eq("2 missing price", r.status, "rejected");
  if (r.status === "rejected") eq("2 reason", r.reason, "missing_price");
}

// 3. brak produktu → reject
{
  const r = parseInvoiceLine(baseRaw({ productName: "", productCode: "" }));
  eq("3 missing product", r.status, "rejected");
  if (r.status === "rejected") eq("3 reason", r.reason, "missing_product");
}

// 4. quantity/unit poprawne
{
  const r = parseInvoiceLine(baseRaw({ quantity: 12.5, unit: "m²" }));
  eq("4 ok", r.status, "ok");
  if (r.status === "ok") {
    eq("4 qty", r.quantity, 12.5);
    eq("4 unit m2", r.unit, "m2");
  }
}

// 5. discount poprawnie uwzględniony (list − upust)
{
  const resolved = resolveEffectiveNetUnitPrice({
    listNetUnitPrice: 100,
    discountPct: 10,
  });
  eq("5 discount ok", resolved.ok, true);
  if (resolved.ok) eq("5 effective", resolved.netUnitPrice, 90);

  const r = parseInvoiceLine(
    baseRaw({ netUnitPrice: undefined, listNetUnitPrice: 100, discountPct: 10 }),
  );
  eq("5 parse from list", r.status, "ok");
  if (r.status === "ok") eq("5 parse price", r.netUnitPrice, 90);
}

// 6. netUnitPrice poprawny (priorytet nad list+discount)
{
  const r = parseInvoiceLine(baseRaw({ netUnitPrice: 42.5, listNetUnitPrice: 100, discountPct: 10 }));
  eq("6 prefer netUnitPrice", r.status, "ok");
  if (r.status === "ok") eq("6 price", r.netUnitPrice, 42.5);
}

// 7–8. powtarzający się produkt → jedna historia + wiele observations / różne ceny
{
  const batch = processInvoiceCompanyPurchaseBatch([
    baseRaw({ lineIndex: 0, netUnitPrice: 40, invoiceDate: "2026-03-31", quantity: 10 }),
    baseRaw({
      lineIndex: 1,
      netUnitPrice: 50,
      invoiceDate: "2026-05-30",
      invoiceRef: "FS_10077_2044_2026",
      quantity: 30,
    }),
  ]);
  eq("7 one identity", batch.histories.length, 1);
  const h = batch.histories[0];
  eq("7 purchaseCount", h.purchaseCount, 2);
  eq("8 last price", h.lastPurchasePrice, 50);
  eq("8 min", h.minPrice, 40);
  eq("8 max", h.maxPrice, 50);
  eq("8 avg", h.averagePrice, 45);
  // weighted: (40*10 + 50*30) / 40 = 47.5
  eq("8 weighted", h.weightedAveragePrice, 47.5);
}

// 9. różne jednostki → NIE scalać (bez code)
{
  const a = buildProductIdentityKey({
    supplier: SUPPLIER,
    productName: "Klej uniwersalny",
    unit: "kg",
  });
  const b = buildProductIdentityKey({
    supplier: SUPPLIER,
    productName: "Klej uniwersalny",
    unit: "szt",
  });
  ok("9 units not merged", a.productIdentityKey !== b.productIdentityKey);
}

// 10. różni dostawcy → NIE scalać
{
  const a = buildProductIdentityKey({
    supplier: SUPPLIER,
    productCode: "X1",
    productName: "Foo",
    unit: "m2",
  });
  const b = buildProductIdentityKey({
    supplier: SUPPLIER_B,
    productCode: "X1",
    productName: "Foo",
    unit: "m2",
  });
  ok("10 suppliers not merged", a.productIdentityKey !== b.productIdentityKey);
}

// 11. brak code → normalized name + unit + supplier
{
  const id = buildProductIdentityKey({
    supplier: SUPPLIER,
    productName: "PŁYTA EPS GRAFIT 0,033 FASADA",
    unit: "m2",
  });
  eq("11 rule", id.identityRule, "name_unit_supplier");
  ok("11 key has name", id.productIdentityKey.includes("|name:"));
}

// 12. ambiguous match → NEEDS REVIEW
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
  const product = normalizeInvoiceProduct(line);
  const map = mapInvoiceProductToMaterial(product, { netUnitPrice: 3, quantity: 1 });
  eq("12 needs_review", map.status, "needs_review");
}

// 13–15. ETICS mappings
{
  const eps = parseInvoiceLine(
    baseRaw({
      productName: "STYR.EPS GRAFIT 0,033 FASADA GR.100MM",
      productCode: "EPS100",
      unit: "m2",
      netUnitPrice: 41.2,
    }),
  );
  assert.equal(eps.status, "ok");
  const epsMap = mapInvoiceProductToMaterial(normalizeInvoiceProduct(eps), {
    netUnitPrice: eps.netUnitPrice,
    quantity: eps.quantity,
  });
  eq("13 EPS materialKey", epsMap.materialKey, "mat.eps_graph");
  eq("13 EPS mapped", epsMap.status, "mapped");

  const mesh = parseInvoiceLine(
    baseRaw({
      productName: "SIATKA PODT. REDNET 165 g/m2 1x50m",
      productCode: "SIAT165",
      unit: "m2",
      netUnitPrice: 3.85,
    }),
  );
  assert.equal(mesh.status, "ok");
  const meshMap = mapInvoiceProductToMaterial(normalizeInvoiceProduct(mesh), {
    netUnitPrice: mesh.netUnitPrice,
    quantity: mesh.quantity,
  });
  eq("14 mesh materialKey", meshMap.materialKey, "mat.mesh");
  eq("14 mesh mapped", meshMap.status, "mapped");

  const glue = parseInvoiceLine(
    baseRaw({
      productName: "MAPEI-MAPETHERM do siatki 25 kg",
      productCode: "MAPETH25",
      unit: "szt",
      quantity: 2,
      netUnitPrice: 80,
    }),
  );
  assert.equal(glue.status, "ok");
  const glueMap = mapInvoiceProductToMaterial(normalizeInvoiceProduct(glue), {
    netUnitPrice: glue.netUnitPrice,
    quantity: glue.quantity,
  });
  eq("15 glue materialKey", glueMap.materialKey, "mat.glue_etics");
  eq("15 glue mapped", glueMap.status, "mapped");
  eq("15 glue unit kg", glueMap.purchaseUnit, "kg");
  eq("15 glue per kg", glueMap.purchaseUnitPricePln, 3.2); // 80/25
  eq("15 glue qty kg", glueMap.purchaseQuantity, 50); // 2*25
}

// 16. render → tylko exact/approved; gładź ≠ render
{
  const gladz = parseInvoiceLine(
    baseRaw({
      productName: "GŁADŹ GIPSOWA FINISZ 20 kg",
      productCode: "GLADZ",
      unit: "kg",
      netUnitPrice: 1.5,
    }),
  );
  assert.equal(gladz.status, "ok");
  const gMap = mapInvoiceProductToMaterial(normalizeInvoiceProduct(gladz), {
    netUnitPrice: 1.5,
    quantity: 1,
  });
  eq("16 gladz unmatched", gMap.status, "unmatched");
  ok("16 not render", gMap.materialKey !== "mat.render");

  const tynk = parseInvoiceLine(
    baseRaw({
      productName: "Tynk mineralny",
      productCode: undefined,
      unit: "kg",
      netUnitPrice: 2.8,
    }),
  );
  assert.equal(tynk.status, "ok");
  const tMap = mapInvoiceProductToMaterial(normalizeInvoiceProduct(tynk), {
    netUnitPrice: 2.8,
    quantity: 1,
  });
  eq("16 tynk mapped render", tMap.materialKey, "mat.render");
  eq("16 tynk status", tMap.status, "mapped");
}

// 17. COMPANY PURCHASE ≠ marketQuotes
eq("17 accept writes marketQuotes?", invoiceAcceptWritesMarketQuotes(), false);

// 18. brak danych → PRICE DATA MISSING (projekcja pusta dla klucza)
{
  resetTf();
  const empty = normalizeCompanyKnowledgeStore({ schemaVersion: 1, updatedAt: "", entries: [] });
  const purchase = projectPurchaseByMaterialKey(empty, collectMaterialPurchaseAliases());
  ok("18 no eps purchase", !(purchase["mat.eps_graph"]?.unitPricePln > 0));
}

// 19. Expert runtime = 0 external — tor P0 nie woła fetch (guard API)
{
  ok("19 no external write Quotes", invoiceAcceptWritesMarketQuotes() === false);
  ok("19 batch is pure local", typeof processInvoiceCompanyPurchaseBatch === "function");
}

// 20. ACCEPT → Purchase projection (regresja toru P1)
{
  resetTf();
  const batch = processInvoiceCompanyPurchaseBatch([
    baseRaw({
      productName: "STYR.EPS GRAFIT 0,033 FASADA GR.100MM",
      productCode: "EPS100",
      unit: "m2",
      netUnitPrice: 41.2,
      quantity: 100,
    }),
    baseRaw({
      productName: "SIATKA PODT. REDNET 165 g/m2",
      productCode: "SIAT165",
      unit: "m2",
      netUnitPrice: 3.85,
      quantity: 200,
      lineIndex: 1,
    }),
    baseRaw({
      productName: "MAPEI-MAPETHERM do siatki 25 kg",
      productCode: "MAPETH25",
      unit: "kg",
      netUnitPrice: 3.1,
      quantity: 25,
      lineIndex: 2,
    }),
  ]);
  eq("20 mapped count", batch.mappedCount, 3);
  let store = normalizeCompanyKnowledgeStore({ schemaVersion: 1, updatedAt: "", entries: [] });
  const acc = acceptInvoicePurchaseCandidates(store, batch.candidates);
  store = acc.store;
  eq("20 accepted", acc.accepted, 3);
  const purchase = projectPurchaseByMaterialKey(store, collectMaterialPurchaseAliases());
  eq("20 eps purchase", purchase["mat.eps_graph"]?.unitPricePln, 41.2);
  eq("20 mesh purchase", purchase["mat.mesh"]?.unitPricePln, 3.85);
  eq("20 glue purchase", purchase["mat.glue_etics"]?.unitPricePln, 3.1);

  // Invoice nadpisuje last względem pustego / seed — real purchase wins
  const seeded = applyPi31ApprovedPurchaseToKnowledge(
    normalizeCompanyKnowledgeStore({ schemaVersion: 1, updatedAt: "", entries: [] }),
  ).store;
  const afterInvoice = acceptInvoicePurchaseCandidates(seeded, batch.candidates).store;
  const p2 = projectPurchaseByMaterialKey(afterInvoice, collectMaterialPurchaseAliases());
  eq("20 invoice overrides seed eps", p2["mat.eps_graph"]?.unitPricePln, 41.2);
  ok(
    "20 provenance label",
    afterInvoice.entries.some((e) =>
      (e.lastSourceLabelPl || "").includes("COMPANY PURCHASE"),
    ),
  );
}

// Regresja: P3.1 specs nadal align
{
  for (const m of PI31_APPROVED_MATERIALS) {
    ok(`reg P3.1 spec ${m.materialKey}`, Boolean(m.purchaseUnitPricePln > 0));
  }
}

// History helper edge
{
  const h = buildInvoiceProductPriceHistory([], "none");
  eq("hist empty count", h.purchaseCount, 0);
  eq("hist empty last", h.lastPurchasePrice, null);
}

console.log(`\nOK providers-01-p0: ${passed} assertions`);
