/**
 * PHASE C — Legal PACKAGE → kg conversion (C1–C12).
 * Run: npx vite-node scripts/test-ik-package-to-kg-phase-c.mjs
 *
 * ZERO Accept · ZERO PM · ZERO OUR RATE · ZERO invent mass.
 */
import {
  IK_PHASE_C_PACKAGE_TO_KG,
  PACKAGE_PRICE_NO_CONVERSION_SSOT,
  extractExplicitPackageMassKg,
  roundPricePerKg,
  tryConvertPackagePriceToKg,
  validateResearchCandidate,
  createSelectiveDiyTrioResearchProvider,
  createFixtureDiySelectiveLookup,
} from "../src/lib/price-intelligence/index.ts";

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

console.log("\n=== PHASE C — PACKAGE → KG ===\n");
assert("runtime marker", IK_PHASE_C_PACKAGE_TO_KG === "PHASE_C_PACKAGE_TO_KG");

const baseOk = {
  productIdentityMatched: true,
  sameObservation: true,
  sourceUrl: "https://www.leroymerlin.pl/product/12345678.html",
  sku: "12345678",
  massEvidence: "title_explicit_confirmed",
  priceType: "regular",
  requestUnit: "kg",
  multipackAmbiguous: false,
  priceAmbiguous: false,
};

// C1
{
  const r = tryConvertPackagePriceToKg({
    ...baseOk,
    packagePricePln: 52.98,
    packageMassKg: 20,
  });
  assert("C1 ok", r.ok === true, r);
  assert("C1 2.65", r.ok && r.pricePerKg === 2.65, r);
  assert("C1 autoAccepted false", r.ok && r.autoAccepted === false);
  assert("C1 round helper", roundPricePerKg(52.98, 20) === 2.65);
}

// C2
{
  const r = tryConvertPackagePriceToKg({
    ...baseOk,
    packagePricePln: 55.49,
    packageMassKg: 20,
  });
  assert("C2 2.77", r.ok && r.pricePerKg === 2.77, r);
}

// C3
{
  const r = tryConvertPackagePriceToKg({
    ...baseOk,
    packagePricePln: 49.35,
    packageMassKg: 25,
  });
  assert("C3 1.97", r.ok && r.pricePerKg === 1.97, r);
}

// C4 mass missing
{
  const r = tryConvertPackagePriceToKg({
    ...baseOk,
    packagePricePln: 52.98,
    packageMassKg: null,
    massEvidence: null,
  });
  assert("C4 gap", !r.ok && r.gap === PACKAGE_PRICE_NO_CONVERSION_SSOT, r);
}

// C5 mass inferred — extractor must not invent without explicit evidence
{
  const extracted = extractExplicitPackageMassKg({
    productName: "Gładź gipsowa uniwersalna",
    html: "<html><body>Popularny produkt wykończeniowy</body></html>",
  });
  assert("C5 no invent mass", extracted == null, extracted);
  const r = tryConvertPackagePriceToKg({
    ...baseOk,
    packagePricePln: 52.98,
    packageMassKg: null,
    massEvidence: null,
  });
  assert("C5 blocked", !r.ok && r.gap === PACKAGE_PRICE_NO_CONVERSION_SSOT);
}

// C6 different product identity
{
  const r = tryConvertPackagePriceToKg({
    ...baseOk,
    productIdentityMatched: false,
    packagePricePln: 52.98,
    packageMassKg: 20,
  });
  assert("C6 blocked", !r.ok && r.gap === PACKAGE_PRICE_NO_CONVERSION_SSOT);
}

// C7 different sourceUrl / missing URL
{
  const r = tryConvertPackagePriceToKg({
    ...baseOk,
    sourceUrl: "",
    packagePricePln: 52.98,
    packageMassKg: 20,
  });
  assert("C7 blocked no url", !r.ok && r.gap === PACKAGE_PRICE_NO_CONVERSION_SSOT);
}

// C8 different observation
{
  const r = tryConvertPackagePriceToKg({
    ...baseOk,
    sameObservation: false,
    packagePricePln: 52.98,
    packageMassKg: 20,
  });
  assert("C8 blocked", !r.ok && r.gap === PACKAGE_PRICE_NO_CONVERSION_SSOT);
}

// C9 multipack ambiguous
{
  const extracted = extractExplicitPackageMassKg({
    productName: "Gładź gipsowa 2x20kg",
    html: "<html></html>",
  });
  assert("C9 multipack flag", extracted?.multipackAmbiguous === true, extracted);
  const r = tryConvertPackagePriceToKg({
    ...baseOk,
    packagePricePln: 100,
    packageMassKg: 20,
    multipackAmbiguous: true,
  });
  assert("C9 blocked", !r.ok && r.gap === PACKAGE_PRICE_NO_CONVERSION_SSOT);
}

// C10 promo / unclear price
{
  const r = tryConvertPackagePriceToKg({
    ...baseOk,
    packagePricePln: 52.98,
    packageMassKg: 20,
    priceType: "promo",
  });
  assert("C10 promo blocked", !r.ok && r.gap === PACKAGE_PRICE_NO_CONVERSION_SSOT);
  const r2 = tryConvertPackagePriceToKg({
    ...baseOk,
    packagePricePln: 52.98,
    packageMassKg: 20,
    priceAmbiguous: true,
  });
  assert("C10 ambiguous blocked", !r2.ok && r2.gap === PACKAGE_PRICE_NO_CONVERSION_SSOT);
}

// C11 szt/opak without explicit mass
{
  const r = tryConvertPackagePriceToKg({
    ...baseOk,
    packagePricePln: 52.98,
    packageMassKg: null,
    massEvidence: null,
    observedUnit: "szt",
  });
  assert("C11 blocked", !r.ok && r.gap === PACKAGE_PRICE_NO_CONVERSION_SSOT);
  const validate = validateResearchCandidate({
    requestMaterialKey: "mat.gladz_gipsowa",
    requestUnit: "kg",
    draft: {
      materialKey: "mat.gladz_gipsowa",
      unit: "szt",
      currency: "PLN",
      provenance: "manual_owner",
      priceNet: 52.98,
      isPackagePrice: true,
      packageConversionApproved: false,
    },
  });
  assert(
    "C11 validate SSOT",
    !validate.ok && validate.gap === PACKAGE_PRICE_NO_CONVERSION_SSOT,
    validate,
  );
}

// C12 autoAccepted remains false + DIY provider emits kg candidate
{
  const html = `
    <html><head><title>Knauf Gładź gipsowa 20kg</title></head>
    <body>Sprzedawane i wysyłane przez Leroy Merlin · 52,98 zł</body></html>
  `;
  const lookup = createFixtureDiySelectiveLookup({
    leroy: {
      html,
      finalUrl: "https://www.leroymerlin.pl/product/12345678.html",
      requestUrl: "https://www.leroymerlin.pl/search?q=gladz",
    },
  });
  const provider = createSelectiveDiyTrioResearchProvider({ lookup });
  const result = await provider.research({
    researchJobId: "job-c12",
    demandId: "demand-c12",
    materialKey: "mat.gladz_gipsowa",
    catalogWorkId: "cw.product.gladz_gipsowa",
    namePl: "Gładź gipsowa",
    unit: "kg",
    region: "wroclaw",
    nowIso: "2026-09-07T18:00:00.000Z",
  });
  assert("C12 ok candidate", result.ok === true && result.candidate != null, result);
  assert("C12 unit kg", result.ok && result.candidate.unit === "kg");
  assert("C12 price 2.65", result.ok && result.candidate.priceNet === 2.65, result.candidate);
  assert("C12 autoAccepted false", result.autoAccepted === false);
  assert(
    "C12 conversion note",
    result.ok && String(result.candidate.notes || "").includes("pkg→kg"),
    result.candidate?.notes,
  );

  // mass missing → PACKAGE_PRICE_NO_CONVERSION_SSOT
  const lookupGap = createFixtureDiySelectiveLookup({
    leroy: {
      html: `<html><head><title>Gładź gipsowa uniwersalna</title></head>
        <body>Sprzedawane i wysyłane przez Leroy Merlin · 52,98 zł</body></html>`,
      finalUrl: "https://www.leroymerlin.pl/product/99999999.html",
    },
  });
  const gap = await createSelectiveDiyTrioResearchProvider({ lookup: lookupGap }).research({
    researchJobId: "job-c12b",
    demandId: "demand-c12b",
    materialKey: "mat.gladz_gipsowa",
    catalogWorkId: null,
    namePl: "Gładź gipsowa",
    unit: "kg",
    region: "wroclaw",
    nowIso: "2026-09-07T18:00:00.000Z",
  });
  assert(
    "C12b no mass → PACKAGE_PRICE_NO_CONVERSION_SSOT",
    !gap.ok && gap.error === PACKAGE_PRICE_NO_CONVERSION_SSOT,
    gap,
  );
}

// Mass extract positives
{
  const title = extractExplicitPackageMassKg({
    productName: "Gładź gipsowa 20 kg",
    html: "<html></html>",
  });
  assert(
    "mass title_explicit",
    title && !title.multipackAmbiguous && title.packageMassKg === 20
      && title.massEvidence === "title_explicit_confirmed",
    title,
  );
  const label = extractExplicitPackageMassKg({
    productName: "Gładź",
    html: "<div>Masa netto: 25 kg</div>",
  });
  assert(
    "mass label_explicit",
    label && label.massEvidence === "label_explicit" && label.packageMassKg === 25,
    label,
  );
  const structured = extractExplicitPackageMassKg({
    productName: "Gładź",
    html: `{"weight":{"value":"20","unitCode":"KGM"}}`,
  });
  assert(
    "mass structured_attr",
    structured && structured.massEvidence === "structured_attr" && structured.packageMassKg === 20,
    structured,
  );
}

console.log(`\n=== RESULT pass=${pass} fail=${fail} ===\n`);
if (fail > 0) process.exit(1);
