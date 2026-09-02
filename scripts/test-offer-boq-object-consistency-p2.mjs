/**
 * P2 — OfferBoq object-consistency candidate admission gate.
 * npx vite-node scripts/test-offer-boq-object-consistency-p2.mjs
 */
import assert from "node:assert/strict";
import {
  areOfferBoqObjectsCompatible,
  detectOfferBoqLineObjectMarkers,
} from "../src/lib/tender-offer-boq-object-consistency.ts";
import {
  mapOfferBoqLineCore,
  areOfferBoqUnitFamiliesCompatible,
} from "../src/lib/tender-offer-boq-mapping.ts";
import { normalizeWgdomCostUnit } from "../src/lib/wgdom-cost-catalog.ts";
import {
  buildCanonicalFieldsForReconciledPair,
  normalizeBoqLineForMerge,
  canReconcileAthPdfPair,
} from "../src/lib/multi-boq/boq-line-normalize.ts";
import { parseCanonicalQuantity } from "../src/lib/multi-boq/index.ts";

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

const FIXED_AT = "2026-09-02T00:00:00.000Z";
function work(partial) {
  return {
    tradeId: "HYDRAULIKA",
    unit: "szt",
    companyPricePln: 10,
    updatedAt: FIXED_AT,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    ...partial,
  };
}

function baseLine(partial) {
  return {
    lineId: "t",
    lp: "1",
    quantity: 1,
    quantityRaw: "1",
    knrHint: null,
    catalogWorkId: null,
    workCategory: null,
    categoryId: null,
    matchMethod: "unmatched",
    matchedBy: "snapshot",
    matchConfidence: "low",
    aiRationale: "",
    materialCostPln: null,
    laborCostPln: null,
    lineTotalPln: null,
    candidateMatches: [],
    reviewRequired: false,
    editableFields: [],
    unit: "szt",
    description: "",
    ...partial,
  };
}

// ─── A. Fixture mutex ──────────────────────────────────────────────
ok(
  "A reject zlew vs wanna",
  areOfferBoqObjectsCompatible(
    "Wymiana zlewozmywaka blaszanego",
    work({ id: "p2b-demontaz-wanny-kpl", namePl: "Demontaż wanny komplet", unit: "kpl" }),
  ) === false,
);
ok(
  "A keep zlew vs zlew",
  areOfferBoqObjectsCompatible(
    "Wymiana zlewozmywaka",
    work({ id: "p2b-montaz-zlewozmywaka-szt", namePl: "Montaż zlewozmywaka", keywords: ["zlewozmywak"] }),
  ) === true,
);
ok(
  "A reject ustep vs zlew",
  areOfferBoqObjectsCompatible(
    "Wymiana ustępu z miską porcelanową Kompakt",
    work({ id: "p2b-montaz-zlewozmywaka-szt", namePl: "Montaż zlewozmywaka", keywords: ["zlewozmywak"] }),
  ) === false,
);
ok(
  "A reject brodzik vs zlew",
  areOfferBoqObjectsCompatible(
    "Wymiana brodzika i kabiny natryskowej",
    work({ id: "p2b-montaz-zlewozmywaka-szt", namePl: "Montaż zlewozmywaka", keywords: ["zlewozmywak"] }),
  ) === false,
);

// ─── B. Bateria ────────────────────────────────────────────────────
ok(
  "B keep bateria ↔ demontaż baterii",
  areOfferBoqObjectsCompatible(
    "Wymiana baterii natryskowej",
    work({
      id: "p2b-demontaz-baterii-armatury-szt",
      namePl: "Demontaż baterii armatury",
      keywords: ["baterii", "armatury"],
    }),
  ) === true,
);
ok(
  "B reject bateria line vs zlew work",
  areOfferBoqObjectsCompatible(
    "Wymiana baterii natryskowej",
    work({ id: "p2b-montaz-zlewozmywaka-szt", namePl: "Montaż zlewozmywaka", keywords: ["zlewozmywak"] }),
  ) === false,
);

// ─── C/D. Lighting / gniazda ───────────────────────────────────────
ok(
  "C reject kuchenka vs oprawa",
  areOfferBoqObjectsCompatible(
    "Wymiana kuchenki elektrycznej czteropalnikowej",
    work({
      id: "p2b-montaz-opraw-oswietleniowych-szt",
      namePl: "Montaż opraw oświetleniowych",
      tradeId: "ELEKTRYKA",
      keywords: ["opraw", "oswietleniowych"],
    }),
  ) === false,
);
ok(
  "D KEEP kuchenka ↔ gniazda",
  areOfferBoqObjectsCompatible(
    "Wymiana kuchenki elektrycznej czteropalnikowej",
    work({
      id: "p2b-montaz-gniazd-lacznikow-szt",
      namePl: "Montaż gniazd i łączników",
      tradeId: "ELEKTRYKA",
      keywords: ["gniazd", "lacznikow"],
    }),
  ) === true,
);
ok(
  "C reject zlew vs oprawa",
  areOfferBoqObjectsCompatible(
    "Wymiana zlewozmywaka",
    work({
      id: "p2b-montaz-opraw-oswietleniowych-szt",
      namePl: "Montaż opraw oświetleniowych",
      tradeId: "ELEKTRYKA",
      keywords: ["opraw"],
    }),
  ) === false,
);

// ─── E. Window vs ETICS ────────────────────────────────────────────
ok(
  "E reject okno vs cw.etics.boards",
  areOfferBoqObjectsCompatible(
    "Demontaż starych i montaż nowych okien rozwieranych",
    work({
      id: "cw.etics.boards",
      namePl: "Płyty ETICS",
      unit: "m2",
      tradeId: "ELEWACJE",
      keywords: ["etics"],
    }),
  ) === false,
);

// ─── F. Door ───────────────────────────────────────────────────────
ok(
  "F reject drzwi vs etics",
  areOfferBoqObjectsCompatible(
    "Demontaż starych i montaż nowych drzwi balkonowych",
    work({ id: "cw.etics.boards", namePl: "Płyty ETICS", unit: "m2", tradeId: "ELEWACJE" }),
  ) === false,
);
ok(
  "F reject drzwi vs ścianki",
  areOfferBoqObjectsCompatible(
    "Drzwi zewnętrzne pełne jednoskrzydłowe",
    work({
      id: "cc-w2-scianki-dzialowe-gr-pakiet-m2",
      namePl: "Ścianki działowe pakiet",
      unit: "m2",
      keywords: ["scianki", "dzialowe"],
    }),
  ) === false,
);
ok(
  "F KEEP drzwi ↔ impregnacja",
  areOfferBoqObjectsCompatible(
    "Demontaż starych i montaż nowych drzwi balkonowych",
    work({
      id: "cc-w2-impregnacja-biobojcza-m2",
      namePl: "Impregnacja biobójcza drewna",
      unit: "m2",
      keywords: ["impregnacja", "biobojcza"],
    }),
  ) === true,
);

// ─── G. Frame / ościeżnica ─────────────────────────────────────────
ok(
  "G reject ościeżnica vs skrzydło drzwiowe",
  areOfferBoqObjectsCompatible(
    "Demontaż ościeżnic stalowych lub krat okiennych",
    work({
      id: "p2b-skrzydla-drzwiowe-wewnetrzne-m2",
      namePl: "Skrzydła drzwiowe wewnętrzne",
      unit: "m2",
      keywords: ["skrzydla", "drzwiowe"],
    }),
  ) === false,
);
ok(
  "G reject ościeżnica vs impregnacja",
  areOfferBoqObjectsCompatible(
    "Demontaż ościeżnic stalowych",
    work({
      id: "cc-w2-impregnacja-biobojcza-m2",
      namePl: "Impregnacja biobójcza",
      unit: "m2",
      keywords: ["impregnacja"],
    }),
  ) === false,
);

// ─── H. Silicone ───────────────────────────────────────────────────
ok(
  "H reject silikon vs stop-ptaków",
  areOfferBoqObjectsCompatible(
    "Wypełnienie spoin masą silikonową",
    work({
      id: "cc-p0c-w1-stop-ptakow",
      namePl: "Stop ptaków",
      unit: "mb",
      keywords: ["stop", "ptakow"],
    }),
  ) === false,
);
ok(
  "H reject silikon vs gładzie",
  areOfferBoqObjectsCompatible(
    "Wypełnienie spoin masą silikonową",
    work({
      id: "legacy-gladzie_tynki-mb",
      namePl: "Gładzie tynki mb",
      unit: "mb",
      legacyCategoryId: "GLADZIE_TYNKI",
      keywords: ["gladzie"],
    }),
  ) === false,
);

// ─── I. Parapet ────────────────────────────────────────────────────
ok(
  "I reject parapet vs stop-ptaków",
  areOfferBoqObjectsCompatible(
    "Montaż nowych parapetów zewnętrznych",
    work({ id: "cc-p0c-w1-stop-ptakow", namePl: "Stop ptaków", unit: "mb" }),
  ) === false,
);
ok(
  "I reject parapet vs legacy-elektryka",
  areOfferBoqObjectsCompatible(
    "Montaż nowych parapetów zewnętrznych",
    work({
      id: "legacy-elektryka-mb",
      namePl: "Elektryka mb",
      unit: "mb",
      tradeId: "ELEKTRYKA",
      legacyCategoryId: "ELEKTRYKA",
    }),
  ) === false,
);

// ─── J. Valve — electrical only; sanitary KEEP ─────────────────────
ok(
  "J reject zawór vs legacy-elektryka",
  areOfferBoqObjectsCompatible(
    "Zawory ścienne o śr. nominalnej 20 mm",
    work({
      id: "legacy-elektryka-szt",
      namePl: "Elektryka szt",
      tradeId: "ELEKTRYKA",
      legacyCategoryId: "ELEKTRYKA",
    }),
  ) === false,
);
ok(
  "J KEEP zawór kątowy ↔ zlew (LP14 guard)",
  areOfferBoqObjectsCompatible(
    "Zawory kątowe instalacji wodociągowych 1/2 3/4",
    work({ id: "p2b-montaz-zlewozmywaka-szt", namePl: "Montaż zlewozmywaka", keywords: ["zlewozmywak"] }),
  ) === true,
);
ok(
  "J KEEP zawór ↔ bateria (LP14 guard)",
  areOfferBoqObjectsCompatible(
    "Zawory kątowe instalacji wodociągowych",
    work({
      id: "p2b-demontaz-baterii-armatury-szt",
      namePl: "Demontaż baterii",
      keywords: ["baterii"],
    }),
  ) === true,
);

// ─── K. Pipe / siphon — not against legacy ─────────────────────────
ok(
  "K reject podejście vs zlew p2b",
  areOfferBoqObjectsCompatible(
    "Wymiana podejścia z rur z PVC o śr. 110 mm",
    work({ id: "p2b-montaz-zlewozmywaka-szt", namePl: "Montaż zlewozmywaka", keywords: ["zlewozmywak"] }),
  ) === false,
);
ok(
  "K KEEP podejście ↔ legacy-hydraulika",
  areOfferBoqObjectsCompatible(
    "Wymiana podejścia z rur z PVC o śr. 110 mm",
    work({
      id: "legacy-hydraulika-szt",
      namePl: "Hydraulika szt",
      legacyCategoryId: "HYDRAULIKA",
    }),
  ) === true,
);
ok(
  "K KEEP syfon+zlew ↔ montaż zlewozmywaka",
  areOfferBoqObjectsCompatible(
    "Wymiana syfonu zlewozmywaki",
    work({ id: "p2b-montaz-zlewozmywaka-szt", namePl: "Montaż zlewozmywaka", keywords: ["zlewozmywak"] }),
  ) === true,
);

// ─── L. Gruz ───────────────────────────────────────────────────────
ok(
  "L KEEP gruz ↔ rozbiórki",
  areOfferBoqObjectsCompatible(
    "Wywiezienie gruzu spryzmowanego samochodami",
    work({
      id: "legacy-rozbiorki-m3",
      namePl: "Rozbiórki m3",
      unit: "m3",
      legacyCategoryId: "ROZBIORKI",
    }),
  ) === true,
);
ok(
  "L KEEP gruz ↔ transport",
  areOfferBoqObjectsCompatible(
    "Wywiezienie gruzu spryzmowanego",
    work({
      id: "legacy-transport_utylizacja-m3",
      namePl: "Transport utylizacja m3",
      unit: "m3",
      legacyCategoryId: "TRANSPORT_UTYLIZACJA",
    }),
  ) === true,
);

// ─── Legacy generic keep ───────────────────────────────────────────
ok(
  "legacy KEEP without object contradiction",
  areOfferBoqObjectsCompatible(
    "Wymiana zlewozmywaka",
    work({
      id: "legacy-hydraulika-szt",
      namePl: "Hydraulika szt",
      legacyCategoryId: "HYDRAULIKA",
    }),
  ) === true,
);

// ─── Unknown → KEEP ────────────────────────────────────────────────
ok(
  "unknown markers KEEP",
  areOfferBoqObjectsCompatible(
    "Roboty ogólnobudowlane różne",
    work({ id: "wc-x", namePl: "Prace różne", keywords: ["prace"] }),
  ) === true,
);

// ─── Mapping admission integration ─────────────────────────────────
{
  const works = [
    work({
      id: "p2b-podlaczenie-kuchenki-elektrycznej-szt",
      namePl: "Podłączenie kuchenki elektrycznej",
      keywords: ["kuchenki", "elektrycznej"],
      tradeId: "ELEKTRYKA",
      legacyCategoryId: "ELEKTRYKA",
    }),
    work({
      id: "p2b-montaz-gniazd-lacznikow-szt",
      namePl: "Montaż gniazd i łączników",
      keywords: ["gniazd", "lacznikow", "kuchenki"],
      tradeId: "ELEKTRYKA",
      legacyCategoryId: "ELEKTRYKA",
    }),
    work({
      id: "p2b-montaz-opraw-oswietleniowych-szt",
      namePl: "Montaż opraw oświetleniowych",
      keywords: ["opraw", "oswietleniowych", "kuchenki"],
      tradeId: "ELEKTRYKA",
      legacyCategoryId: "ELEKTRYKA",
    }),
    work({
      id: "legacy-elektryka-szt",
      namePl: "Elektryka szt",
      keywords: ["elektryka", "kuchenki"],
      tradeId: "ELEKTRYKA",
      legacyCategoryId: "ELEKTRYKA",
    }),
  ];
  const mapped = mapOfferBoqLineCore(
    baseLine({
      description: "Wymiana kuchenki elektrycznej czteropalnikowej",
      unit: "szt",
      lp: "1",
    }),
    { works },
  );
  const ids = (mapped.candidateMatches ?? []).map((c) => c.catalogWorkId);
  ok("map LP1 keeps kuchenka", ids.includes("p2b-podlaczenie-kuchenki-elektrycznej-szt"), ids);
  ok("map LP1 keeps gniazda", ids.includes("p2b-montaz-gniazd-lacznikow-szt"), ids);
  ok("map LP1 drops oprawy", !ids.includes("p2b-montaz-opraw-oswietleniowych-szt"), ids);
  ok("map LP1 keeps legacy elektr without lighting marker", ids.includes("legacy-elektryka-szt"), ids);
  ok("map LP1 still ambiguous (≥2)", ids.length >= 2, ids);
}

{
  const works = [
    work({
      id: "p2b-demontaz-baterii-armatury-szt",
      namePl: "Demontaż baterii armatury",
      keywords: ["baterii", "natryskowej", "armatury"],
    }),
    work({
      id: "p2b-montaz-zlewozmywaka-szt",
      namePl: "Montaż zlewozmywaka",
      keywords: ["zlewozmywak", "natrysk"],
    }),
    work({
      id: "legacy-hydraulika-szt",
      namePl: "Hydraulika szt",
      keywords: ["hydraulika", "natrysk", "bater"],
      legacyCategoryId: "HYDRAULIKA",
    }),
  ];
  const mapped = mapOfferBoqLineCore(
    baseLine({ description: "Wymiana baterii natryskowej", unit: "szt", lp: "2" }),
    { works },
  );
  const ids = (mapped.candidateMatches ?? []).map((c) => c.catalogWorkId);
  ok("map LP2 keeps bateria work", ids.includes("p2b-demontaz-baterii-armatury-szt"), ids);
  ok("map LP2 drops zlew", !ids.includes("p2b-montaz-zlewozmywaka-szt"), ids);
  ok("map LP2 keeps legacy", ids.includes("legacy-hydraulika-szt"), ids);
  ok("map LP2 still ≥2", ids.length >= 2, ids);
}

{
  const works = [
    work({
      id: "p2b-skrzydla-drzwiowe-wewnetrzne-m2",
      namePl: "Skrzydła drzwiowe wewnętrzne",
      unit: "m2",
      keywords: ["skrzydla", "drzwiowe", "drzwi"],
      tradeId: "STOLARKA",
    }),
    work({
      id: "cc-w2-impregnacja-biobojcza-m2",
      namePl: "Impregnacja biobójcza",
      unit: "m2",
      keywords: ["impregnacja", "drzwi"],
      tradeId: "STOLARKA",
    }),
    work({
      id: "cw.etics.boards",
      namePl: "Płyty ETICS",
      unit: "m2",
      keywords: ["etics", "drzwi"],
      tradeId: "ELEWACJE",
    }),
  ];
  const mapped = mapOfferBoqLineCore(
    baseLine({
      description: "Demontaż starych i montaż nowych drzwi balkonowych z PCV",
      unit: "m2",
      lp: "17",
    }),
    { works },
  );
  const ids = (mapped.candidateMatches ?? []).map((c) => c.catalogWorkId);
  ok("map LP17 keeps skrzydła", ids.includes("p2b-skrzydla-drzwiowe-wewnetrzne-m2"), ids);
  ok("map LP17 keeps impregnacja", ids.includes("cc-w2-impregnacja-biobojcza-m2"), ids);
  ok("map LP17 drops etics", !ids.includes("cw.etics.boards"), ids);
  ok("map LP17 still ≥2", ids.length >= 2, ids);
}

{
  const works = [
    work({
      id: "legacy-transport_utylizacja-m3",
      namePl: "Transport utylizacja",
      unit: "m3",
      keywords: ["gruz", "transport"],
      legacyCategoryId: "TRANSPORT_UTYLIZACJA",
    }),
    work({
      id: "legacy-rozbiorki-m3",
      namePl: "Rozbiórki",
      unit: "m3",
      keywords: ["gruz", "rozbiorki"],
      legacyCategoryId: "ROZBIORKI",
    }),
  ];
  const mapped = mapOfferBoqLineCore(
    baseLine({
      description: "Wywiezienie gruzu spryzmowanego samochodami",
      unit: "m3",
      lp: "21",
    }),
    { works },
  );
  const ids = (mapped.candidateMatches ?? []).map((c) => c.catalogWorkId);
  ok("map LP21 keeps transport", ids.includes("legacy-transport_utylizacja-m3"), ids);
  ok("map LP21 keeps rozbiórki", ids.includes("legacy-rozbiorki-m3"), ids);
  ok("map LP21 still ≥2 Owner", ids.length >= 2, ids);
}

// ─── P1 still active ───────────────────────────────────────────────
ok("P1 still rejects szt↔m2", areOfferBoqUnitFamiliesCompatible("szt", "m2") === false);
ok("P1 kpl.↔kpl keep", areOfferBoqUnitFamiliesCompatible("kpl.", "kpl") === true);
ok("norm kpl. → szt", normalizeWgdomCostUnit("kpl.") === "szt");

{
  const athDesc =
    "Wymiana wyłączników i gniazd wtykowych wraz z osprzętem instalacyjnym";
  const athNorm = normalizeBoqLineForMerge({
    lp: "5",
    description: athDesc,
    unit: "msc.",
    quantityRaw: "4",
    sourceKind: "ath",
  });
  const pdfNorm = normalizeBoqLineForMerge({
    lp: "5",
    description: "Wymiana",
    unit: "szt",
    quantityRaw: "4,00",
    sourceKind: "pdf",
  });
  const ath = {
    sourceKind: "ath",
    lp: "5",
    description: athDesc,
    unit: "msc.",
    quantityRaw: "4",
    normalized: athNorm,
  };
  const pdf = {
    sourceKind: "pdf",
    lp: "5",
    description: "Wymiana",
    unit: "szt",
    quantityRaw: "4,00",
    normalized: pdfNorm,
  };
  ok("P1 ATH/PDF stub canReconcile", canReconcileAthPdfPair(ath, pdf));
  const fields = buildCanonicalFieldsForReconciledPair(ath, pdf);
  ok("P1 ATH/PDF stub unit szt", fields.unit === "szt", fields);
  ok(
    "P1 ATH/PDF stub qty",
    parseCanonicalQuantity(fields.quantityRaw).canonical === "4",
    fields,
  );
}

ok(
  "line markers detect kuchenka",
  detectOfferBoqLineObjectMarkers("Wymiana kuchenki elektrycznej").kuchenka === true,
);

console.log(`\nP2 object-consistency: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
assert.ok(pass > 0);
