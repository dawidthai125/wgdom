/**
 * P3-F1 + P3-F2 — object-consistency admission refinements.
 * npx vite-node scripts/test-offer-boq-object-consistency-p3-f1-f2.mjs
 */
import assert from "node:assert/strict";
import {
  areOfferBoqObjectsCompatible,
  detectOfferBoqLineObjectMarkers,
  detectOfferBoqWorkObjectMarkers,
} from "../src/lib/tender-offer-boq-object-consistency.ts";
import { mapOfferBoqLineCore } from "../src/lib/tender-offer-boq-mapping.ts";

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

// ─── P3-F1 positive: shared bateria keeps despite fixture variants ───
{
  const w = work({
    id: "p2b-demontaz-baterii-armatury-szt",
    namePl: "Demontaż baterii / armatury (szt)",
    descriptionPl:
      "Demontaż baterii zlewozmywakowej, umywalkowej lub wannowej wraz z armaturą.",
    tradeId: "HYDRAULIKA",
  });
  const wm = detectOfferBoqWorkObjectMarkers(w);
  const lm = detectOfferBoqLineObjectMarkers("Wymiana baterii natryskowej");
  ok("F1 markers line bateria+natrysk", lm.bateria === true && lm.fixtures.has("natrysk"));
  ok(
    "F1 markers work bateria+fixture variants",
    wm.bateria === true && wm.fixtures.has("zlew") && wm.fixtures.has("umywalka") && wm.fixtures.has("wanna"),
  );
  ok(
    "F1 KEEP bateria line ↔ bateria work with fixture variants",
    areOfferBoqObjectsCompatible("Wymiana baterii natryskowej", w) === true,
  );
}

// ─── P3-F1 negative: fixture mutex still rejects zlew vs wanna ───
ok(
  "F1 preserve mutex zlew vs wanna",
  areOfferBoqObjectsCompatible(
    "Wymiana zlewozmywaka blaszanego",
    work({ id: "p2b-demontaz-wanny-kpl", namePl: "Demontaż wanny komplet", unit: "kpl" }),
  ) === false,
);

// ─── P3-F1: bateria line vs fixture work WITHOUT bateria → reject ───
ok(
  "F1 reject bateria vs zlew without bateria",
  areOfferBoqObjectsCompatible(
    "Wymiana baterii natryskowej",
    work({
      id: "p2b-montaz-zlewozmywaka-szt",
      namePl: "Montaż zlewozmywaka",
      descriptionPl: "Montaż zlewozmywaka stalowego",
    }),
  ) === false,
);
ok(
  "F1 reject bateria vs wanna whose description only cites baterii sibling id",
  areOfferBoqObjectsCompatible(
    "Wymiana baterii natryskowej",
    work({
      id: "p2b-demontaz-wanny-kpl",
      namePl: "Demontaż wanny (kpl)",
      descriptionPl:
        "Demontaż wanny (komplet) — ≠ p2b-demontaz-baterii-armatury-szt · ≠ legacy-rozbiorki-m2",
      unit: "kpl",
    }),
  ) === false,
);

// ─── P3-F2: sanitary + legacy-elektryka → REJECT ───
ok(
  "F2 reject bateria vs legacy-elektryka",
  areOfferBoqObjectsCompatible(
    "Wymiana baterii natryskowej",
    work({
      id: "legacy-elektryka-szt",
      namePl: "Elektryka (szt)",
      tradeId: "ELEKTRYKA",
      legacyCategoryId: "ELEKTRYKA",
    }),
  ) === false,
);
ok(
  "F2 reject umywalka vs legacy-elektryka",
  areOfferBoqObjectsCompatible(
    "Wymiana umywalki porcelanowej",
    work({ id: "legacy-elektryka-szt", namePl: "Elektryka (szt)", tradeId: "ELEKTRYKA" }),
  ) === false,
);
ok(
  "F2 reject podejście vs legacy-elektryka",
  areOfferBoqObjectsCompatible(
    "Podejście dopływowe do płuczek ustępowych",
    work({ id: "legacy-elektryka-szt", namePl: "Elektryka (szt)", tradeId: "ELEKTRYKA" }),
  ) === false,
);

// ─── P3-F2: sanitary + gniazdo / oprawa → REJECT ───
ok(
  "F2 reject syfon vs gniazdo",
  areOfferBoqObjectsCompatible(
    "Wymiana syfonu z tworzywa do brodzika",
    work({
      id: "p2b-montaz-gniazd-lacznikow-szt",
      namePl: "Montaż gniazd i łączników",
      tradeId: "ELEKTRYKA",
    }),
  ) === false,
);
ok(
  "F2 reject ustęp vs oprawa",
  areOfferBoqObjectsCompatible(
    "Wymiana ustępu z miską porcelanową Kompakt",
    work({
      id: "p2b-montaz-opraw-oswietleniowych-szt",
      namePl: "Montaż opraw oświetleniowych",
      tradeId: "ELEKTRYKA",
    }),
  ) === false,
);

// ─── FALSE-REJECT GUARDS ───
ok(
  "guard kuchenka ↔ gniazda KEEP",
  areOfferBoqObjectsCompatible(
    "Wymiana kuchenki elektrycznej czteropalnikowej",
    work({
      id: "p2b-montaz-gniazd-lacznikow-szt",
      namePl: "Montaż gniazd i łączników",
      tradeId: "ELEKTRYKA",
    }),
  ) === true,
);
ok(
  "guard bateria ↔ bateria work KEEP",
  areOfferBoqObjectsCompatible(
    "Wymiana baterii natryskowej",
    work({
      id: "p2b-demontaz-baterii-armatury-szt",
      namePl: "Demontaż baterii / armatury",
      descriptionPl: "baterii zlewozmywakowej umywalkowej wannowej",
    }),
  ) === true,
);
ok(
  "guard drzwi ↔ impregnacja KEEP",
  areOfferBoqObjectsCompatible(
    "Demontaż starych i montaż nowych drzwi balkonowych",
    work({
      id: "cc-w2-impregnacja-biobojcza-m2",
      namePl: "Impregnacja biobójcza",
      unit: "m2",
      tradeId: "STOLARKA",
    }),
  ) === true,
);
ok(
  "guard gruz ↔ rozbiórki KEEP",
  areOfferBoqObjectsCompatible(
    "Wywiezienie gruzu spryzmowanego",
    work({
      id: "legacy-rozbiorki-m3",
      namePl: "Rozbiórki (m3)",
      unit: "m3",
      tradeId: "ROZBIORKI",
      legacyCategoryId: "ROZBIORKI",
    }),
  ) === true,
);
ok(
  "guard sanitary ↔ legacy-hydraulika KEEP",
  areOfferBoqObjectsCompatible(
    "Wymiana baterii natryskowej",
    work({
      id: "legacy-hydraulika-szt",
      namePl: "Hydraulika / wod-kan (szt)",
      tradeId: "HYDRAULIKA",
      legacyCategoryId: "HYDRAULIKA",
    }),
  ) === true,
);
ok(
  "guard sanitary ↔ legacy-instalacje_co KEEP (not electrical)",
  areOfferBoqObjectsCompatible(
    "Wymiana baterii natryskowej",
    work({
      id: "legacy-instalacje_co-szt",
      namePl: "Instalacje CO (szt)",
      tradeId: "INSTALACJE_CO",
      legacyCategoryId: "INSTALACJE_CO",
    }),
  ) === true,
);
ok(
  "guard LP14 zawór ↔ zlew KEEP",
  areOfferBoqObjectsCompatible(
    "Zawory kątowe instalacji wodociągowych 1/2 3/4",
    work({ id: "p2b-montaz-zlewozmywaka-szt", namePl: "Montaż zlewozmywaka" }),
  ) === true,
);
ok(
  "guard LP14 zawór ↔ bateria KEEP",
  areOfferBoqObjectsCompatible(
    "Zawory kątowe instalacji wodociągowych",
    work({
      id: "p2b-demontaz-baterii-armatury-szt",
      namePl: "Demontaż baterii armatury",
      descriptionPl: "baterii",
    }),
  ) === true,
);

// ─── mapOfferBoqLineCore integration: LP2 restores bateria work ───
{
  const works = [
    work({
      id: "legacy-hydraulika-szt",
      namePl: "Hydraulika / wod-kan (szt)",
      legacyCategoryId: "HYDRAULIKA",
      tradeId: "HYDRAULIKA",
      keywords: ["hydrau", "armatur", "bater"],
    }),
    work({
      id: "p2b-demontaz-baterii-armatury-szt",
      namePl: "Demontaż baterii / armatury (szt)",
      descriptionPl: "baterii zlewozmywakowej umywalkowej wannowej",
      tradeId: "HYDRAULIKA",
      legacyCategoryId: "HYDRAULIKA",
      keywords: ["baterii", "armatury", "demontaż"],
    }),
    work({
      id: "legacy-elektryka-szt",
      namePl: "Elektryka (szt)",
      tradeId: "ELEKTRYKA",
      legacyCategoryId: "ELEKTRYKA",
      keywords: ["elektr"],
    }),
    work({
      id: "legacy-instalacje_co-szt",
      namePl: "Instalacje CO (szt)",
      tradeId: "INSTALACJE_CO",
      legacyCategoryId: "INSTALACJE_CO",
      keywords: ["co"],
    }),
    work({
      id: "p2b-montaz-gniazd-lacznikow-szt",
      namePl: "Montaż gniazd",
      tradeId: "ELEKTRYKA",
      keywords: ["gniazd"],
    }),
  ];
  const mapped = mapOfferBoqLineCore(
    baseLine({ description: "Wymiana baterii natryskowej", unit: "szt.", lp: "2" }),
    { works },
  );
  const ids = (mapped.candidateMatches || []).map((c) => c.catalogWorkId);
  ok("map F1 restores demontaz-baterii in candidates", ids.includes("p2b-demontaz-baterii-armatury-szt"));
  ok("map F2 drops legacy-elektryka on bateria line", !ids.includes("legacy-elektryka-szt"));
  ok("map F2 drops gniazda on bateria line", !ids.includes("p2b-montaz-gniazd-lacznikow-szt"));
  ok("map keeps legacy-hydraulika", ids.includes("legacy-hydraulika-szt"));
}

console.log(`\nP3-F1/F2 object-consistency: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
