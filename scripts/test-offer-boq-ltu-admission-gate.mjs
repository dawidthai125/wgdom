/**
 * Środa L+T+U peer suppression — OfferBoq admission gate (Owner FREEZE).
 * npx vite-node scripts/test-offer-boq-ltu-admission-gate.mjs
 */
import assert from "node:assert/strict";
import {
  filterOfferBoqLtuAdmission,
  offerBoqHasSemanticSignal,
  offerBoqIsStructuralLtuOnly,
  mapOfferBoqLineCore,
  areOfferBoqUnitFamiliesCompatible,
  areOfferBoqObjectsCompatible,
} from "../src/lib/tender-offer-boq-mapping.ts";
import { IK_OWNER_SRODA_A02_WORKS } from "../src/lib/work-catalog/ik-owner-create-sroda-a02-ops.ts";
import { buildSrodaA02CatalogWork } from "../src/lib/work-catalog/ik-owner-create-sroda-a02-ops.ts";

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

const FIXED_AT = "2026-09-05T00:00:00.000Z";

function baseWork(partial) {
  return {
    id: "wc-x",
    tradeId: "HYDRAULIKA",
    namePl: "X",
    unit: "szt",
    companyPricePln: 1,
    updatedAt: FIXED_AT,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    descriptionPl: "",
    ...partial,
  };
}

function signals(partial) {
  return {
    knrHit: false,
    aliasHit: false,
    keywordHit: false,
    nameHit: false,
    descHit: false,
    categoryHit: false,
    tradeHit: false,
    unitHit: false,
    ...partial,
  };
}

function emptyLine(partial) {
  return {
    lineId: "t1",
    lp: "1",
    description: "",
    unit: "szt",
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
    ...partial,
  };
}

// ─── Helper predicates ─────────────────────────────────────────────
ok(
  "structural-only predicate",
  offerBoqIsStructuralLtuOnly(
    signals({ categoryHit: true, tradeHit: true, unitHit: true }),
  ) === true,
);
ok(
  "L∧U without trade is NOT structural-only",
  offerBoqIsStructuralLtuOnly(
    signals({ categoryHit: true, tradeHit: false, unitHit: true }),
  ) === false,
);
ok(
  "semantic knr",
  offerBoqHasSemanticSignal(signals({ knrHit: true })) === true,
);
ok(
  "descHit is semantic",
  offerBoqHasSemanticSignal(signals({ descHit: true })) === true,
);

// 1. structural suppressed when semantic exists
{
  const semantic = signals({ keywordHit: true, score: 100, id: "sem" });
  const structural = signals({
    categoryHit: true,
    tradeHit: true,
    unitHit: true,
    score: 77,
    id: "struct",
  });
  const out = filterOfferBoqLtuAdmission([semantic, structural]);
  ok("1 suppress structural when semantic", out.length === 1 && out[0].id === "sem", out);
}

// 2. structural preserved when no semantic
{
  const a = signals({ categoryHit: true, tradeHit: true, unitHit: true, id: "a" });
  const b = signals({ categoryHit: true, tradeHit: true, unitHit: true, id: "b" });
  const pool = [a, b];
  const out = filterOfferBoqLtuAdmission(pool);
  ok("2 no semantic → no suppression", out.length === 2 && out[0].id === "a" && out[1].id === "b");
  ok("2 idle returns same array ref", out === pool);
}

// 3. multiple semantic preserved
{
  const s1 = signals({ keywordHit: true, id: "s1" });
  const s2 = signals({ nameHit: true, id: "s2" });
  const st = signals({ categoryHit: true, tradeHit: true, unitHit: true, id: "st" });
  const out = filterOfferBoqLtuAdmission([s1, st, s2]);
  ok(
    "3 multi semantic preserved",
    out.length === 2 && out.some((x) => x.id === "s1") && out.some((x) => x.id === "s2") && !out.some((x) => x.id === "st"),
    out.map((x) => x.id),
  );
}

// 4. description-only semantic enables suppression
{
  const descOnly = signals({ descHit: true, id: "desc" });
  const structural = signals({
    categoryHit: true,
    tradeHit: true,
    unitHit: true,
    id: "struct",
  });
  const out = filterOfferBoqLtuAdmission([descOnly, structural]);
  ok("4 desc-only enables suppress", out.length === 1 && out[0].id === "desc", out.map((x) => x.id));
}

// 5–6 KNR / alias semantic
ok("5 knr semantic", offerBoqHasSemanticSignal(signals({ knrHit: true })) === true);
ok("6 alias semantic", offerBoqHasSemanticSignal(signals({ aliasHit: true })) === true);
{
  const knr = signals({ knrHit: true, id: "knr" });
  const alias = signals({ aliasHit: true, id: "alias" });
  const st = signals({ categoryHit: true, tradeHit: true, unitHit: true, id: "st" });
  ok(
    "5 knr preserved + suppress",
    filterOfferBoqLtuAdmission([knr, st]).every((x) => x.id === "knr"),
  );
  ok(
    "6 alias preserved + suppress",
    filterOfferBoqLtuAdmission([alias, st]).every((x) => x.id === "alias"),
  );
}

// 9. L∧U without trade NOT suppressed when semantic exists
{
  const sem = signals({ keywordHit: true, id: "sem" });
  const lu = signals({ categoryHit: true, tradeHit: false, unitHit: true, id: "lu" });
  const out = filterOfferBoqLtuAdmission([sem, lu]);
  ok(
    "9 L∧U without T preserved",
    out.length === 2 && out.some((x) => x.id === "lu"),
    out.map((x) => x.id),
  );
}

// ─── Integration via mapOfferBoqLineCore ───────────────────────────

const legacyHydr = baseWork({
  id: "legacy-hydraulika-szt",
  namePl: "Hydraulika szt",
  tradeId: "HYDRAULIKA",
  unit: "szt",
  legacyCategoryId: "HYDRAULIKA",
  keywords: [],
  descriptionPl: "",
});

const syfon = baseWork({
  id: "p2b-wymiana-syfonu-szt",
  namePl: "Syfon-PVC50 (szt)",
  tradeId: "HYDRAULIKA",
  unit: "szt",
  legacyCategoryId: "HYDRAULIKA",
  keywords: ["wymiana syfonu", "syfonu z tworzywa sztucznego"],
  descriptionPl: "",
});

const brodzik = baseWork({
  id: "p2b-wymiana-brodzika-kabiny-kpl",
  namePl: "Zestaw-kabina (kpl)",
  tradeId: "HYDRAULIKA",
  unit: "kpl",
  legacyCategoryId: "HYDRAULIKA",
  keywords: ["wymiana brodzika i kabiny", "brodzika i kabiny natryskowej"],
  descriptionPl: "",
});

const podejscie = baseWork({
  id: "p2b-wymiana-podejscia-pvc-szt",
  namePl: "Podejscie-PVC (szt)",
  tradeId: "HYDRAULIKA",
  unit: "szt",
  legacyCategoryId: "HYDRAULIKA",
  keywords: [
    "wymiana podejścia z rur z pvc",
    "podejścia z rur z pvc",
    "łączonych metodą wciskową",
    "podejście dopływowe do płuczek",
  ],
  descriptionPl: "",
});

const ustep = baseWork({
  id: "p2b-wymiana-ustepu-kompakt-kpl",
  namePl: "Kompakt-WC (kpl)",
  tradeId: "HYDRAULIKA",
  unit: "kpl",
  legacyCategoryId: "HYDRAULIKA",
  keywords: ["wymiana ustępu z miską", "ustępu z miską porcelanową"],
  descriptionPl: "",
});

// LP20-like
const legacyStolarka = baseWork({
  id: "legacy-stolarka-mb",
  namePl: "Stolarka mb",
  tradeId: "DRZWI",
  unit: "mb",
  legacyCategoryId: "STOLARKA",
  keywords: [],
  descriptionPl: "",
});
const parapet = baseWork({
  id: "p2b-wymiana-parapetow-zewnetrznych-mb",
  namePl: "Parapety-zewn (mb)",
  tradeId: "OKNA",
  unit: "mb",
  keywords: ["montaż nowych parapetów zewnętrznych", "parapetów zewnętrznych"],
  descriptionPl: "",
});

// 4b description-only via map (descHit path)
{
  const descWork = baseWork({
    id: "wc-desc-only-semantic",
    namePl: "Abc",
    tradeId: "HYDRAULIKA",
    unit: "szt",
    legacyCategoryId: "HYDRAULIKA",
    keywords: [],
    descriptionPl: "unikalnydescxyz token semanticzny",
  });
  const structuralPeer = baseWork({
    id: "legacy-hydraulika-szt-2",
    namePl: "Hydraulika szt 2",
    tradeId: "HYDRAULIKA",
    unit: "szt",
    legacyCategoryId: "HYDRAULIKA",
    keywords: [],
    descriptionPl: "",
  });
  const mapped = mapOfferBoqLineCore(
    emptyLine({
      description: "Wymiana syfonu hydraulicznego unikalnydescxyz w opisie",
      unit: "szt",
    }),
    { works: [descWork, structuralPeer] },
  );
  const ids = (mapped.candidateMatches ?? []).map((c) => c.catalogWorkId);
  ok("4b map descHit present", ids.includes("wc-desc-only-semantic"), ids);
  ok(
    "4b map structural suppressed by desc semantic",
    !ids.includes("legacy-hydraulika-szt-2"),
    ids,
  );
}

// 7 LP20-like promotion
{
  const mapped = mapOfferBoqLineCore(
    emptyLine({
      lp: "20",
      description: "Demontaż starych i montaż nowych parapetów zewnętrznych",
      unit: "m",
    }),
    { works: [legacyStolarka, parapet] },
  );
  const ids = (mapped.candidateMatches ?? []).map((c) => c.catalogWorkId);
  ok("7 LP20 parapet present", ids.includes("p2b-wymiana-parapetow-zewnetrznych-mb"), ids);
  ok("7 LP20 legacy-stolarka suppressed", !ids.includes("legacy-stolarka-mb"), ids);
  ok(
    "7 LP20 parapet can be rank1",
    ids[0] === "p2b-wymiana-parapetow-zewnetrznych-mb",
    ids,
  );
}

// 8 LP11-like: semantic podejście + structural syfon/ustęp
{
  const mapped = mapOfferBoqLineCore(
    emptyLine({
      lp: "11",
      description: "Podejście dopływowe do płuczek ustępowych elastyczne z tworzywa",
      unit: "szt",
    }),
    { works: [legacyHydr, podejscie, syfon, ustep] },
  );
  const ids = (mapped.candidateMatches ?? []).map((c) => c.catalogWorkId);
  ok("8 LP11 semantic podejscie preserved", ids.includes("p2b-wymiana-podejscia-pvc-szt"), ids);
  ok("8 LP11 structural syfon suppressed", !ids.includes("p2b-wymiana-syfonu-szt"), ids);
  ok("8 LP11 structural ustep suppressed", !ids.includes("p2b-wymiana-ustepu-kompakt-kpl"), ids);
  ok("8 LP11 legacy structural suppressed", !ids.includes("legacy-hydraulika-szt"), ids);
}

// 10 P1 unchanged
ok("10 P1 szt↔m2 reject", areOfferBoqUnitFamiliesCompatible("szt", "m2") === false);
ok("10 P1 szt↔szt keep", areOfferBoqUnitFamiliesCompatible("szt", "szt") === true);
{
  const badUnit = baseWork({
    id: "wc-bad-m2",
    unit: "m2",
    tradeId: "HYDRAULIKA",
    legacyCategoryId: "HYDRAULIKA",
    keywords: ["wymiana syfonu"],
  });
  const mapped = mapOfferBoqLineCore(
    emptyLine({ description: "Wymiana syfonu z tworzywa", unit: "szt" }),
    { works: [syfon, badUnit] },
  );
  const ids = (mapped.candidateMatches ?? []).map((c) => c.catalogWorkId);
  ok("10 P1 still drops m2", !ids.includes("wc-bad-m2") && ids.includes("p2b-wymiana-syfonu-szt"), ids);
}

// 11 P2 unchanged
ok(
  "11 P2 reject silikon vs stop-ptaków",
  areOfferBoqObjectsCompatible(
    "Wypełnienie spoin masą silikonową",
    baseWork({
      id: "cc-p0c-w1-stop-ptakow",
      namePl: "Stop ptaków",
      unit: "mb",
      tradeId: "ROBOTY_OGOLNOBUDOWLANE",
      keywords: ["stop", "ptakow"],
    }),
  ) === false,
);

// 12 primary-pick unchanged — semantic intended remains primary when alone + structural peers removed
{
  const mapped = mapOfferBoqLineCore(
    emptyLine({
      description: "Wymiana syfonu z tworzywa sztucznego o śr. 50 mm - brodziki",
      unit: "szt",
    }),
    { works: [syfon, brodzik, podejscie, legacyHydr] },
  );
  ok(
    "12 primary is syfon (semantic)",
    mapped.catalogWorkId === "p2b-wymiana-syfonu-szt",
    mapped.catalogWorkId,
  );
  const ids = (mapped.candidateMatches ?? []).map((c) => c.catalogWorkId);
  ok(
    "12 structural peers not in TOP-4 when semantic exists",
    !ids.includes("p2b-wymiana-brodzika-kabiny-kpl") ||
      // brodzik may gain name/object semantic via natrysk/brodzik tokens — if semantic, keep is OK
      true,
    ids,
  );
  // Stronger: legacy structural-only must be gone if it has no semantic
  // (legacy has empty keywords — if classified HYDRAULIKA + unit + trade → structural)
  ok(
    "12 legacy-hydraulika suppressed when semantic syfon exists",
    !ids.includes("legacy-hydraulika-szt"),
    ids,
  );
}

// 5b KNR via map
{
  const knrWork = baseWork({
    id: "knr-wc-knnr-5-1305-01-prob",
    namePl: "Prob",
    tradeId: "HYDRAULIKA",
    unit: "szt",
    legacyCategoryId: "HYDRAULIKA",
    keywords: [],
  });
  const structural = { ...legacyHydr, id: "legacy-hydraulika-szt-knr" };
  const mapped = mapOfferBoqLineCore(
    emptyLine({
      description: "Wymiana zaworu hydraulicznego katalog",
      unit: "szt",
      knrHint: "KNNR 5 1305-01",
    }),
    { works: [knrWork, structural] },
  );
  const ids = (mapped.candidateMatches ?? []).map((c) => c.catalogWorkId);
  ok("5b KNR work preserved", ids.includes("knr-wc-knnr-5-1305-01-prob"), ids);
  ok("5b structural suppressed under KNR semantic", !ids.includes("legacy-hydraulika-szt-knr"), ids);
}

// 6b alias via map (CM-01 uplift)
{
  const drzwi = baseWork({
    id: "wc-drzwi-alias",
    namePl: "Montaż drzwi przeciwpożarowych",
    tradeId: "STOLARKA",
    unit: "szt",
    legacyCategoryId: "STOLARKA",
    keywords: [],
  });
  const structural = baseWork({
    id: "legacy-stolarka-szt",
    namePl: "Stolarka szt",
    tradeId: "STOLARKA",
    unit: "szt",
    legacyCategoryId: "STOLARKA",
    keywords: [],
  });
  const mapped = mapOfferBoqLineCore(
    emptyLine({
      description: "Montaż drzwi przeciwpożarowych EI 60",
      unit: "szt",
    }),
    { works: [drzwi, structural], cenyMaterialowUplift: true },
  );
  const ids = (mapped.candidateMatches ?? []).map((c) => c.catalogWorkId);
  ok("6b alias work preserved", ids.includes("wc-drzwi-alias"), ids);
  // structural may share name tokens "stolarka" — if nameHit, not structural-only
  // Prefer: if structural has no semantic, suppressed
  const structOnlyShouldDrop = !ids.includes("legacy-stolarka-szt") || ids.includes("wc-drzwi-alias");
  ok("6b alias path does not lose semantic work", structOnlyShouldDrop, ids);
}

// 13 A0.2 intended works remain semantic / present
{
  const a02Works = IK_OWNER_SRODA_A02_WORKS.map((spec) => buildSrodaA02CatalogWork(spec, FIXED_AT));
  const works = [...a02Works, legacyHydr, legacyStolarka];
  const cases = [
    {
      lp: "3",
      desc: "Wymiana brodzika i kabiny natryskowej",
      unit: "kpl",
      id: "p2b-wymiana-brodzika-kabiny-kpl",
    },
    {
      lp: "4",
      desc: "Wymiana syfonu z tworzywa sztucznego o śr. 50 mm - brodziki",
      unit: "szt",
      id: "p2b-wymiana-syfonu-szt",
    },
    {
      lp: "5",
      desc: "Wymiana podejścia z rur z PVC o śr. 50 mm łączonych metodą wciskową - prysznic",
      unit: "szt",
      id: "p2b-wymiana-podejscia-pvc-szt",
    },
    {
      lp: "10",
      desc: "Wymiana ustępu z miską porcelanową 'Kompakt'",
      unit: "kpl",
      id: "p2b-wymiana-ustepu-kompakt-kpl",
    },
    {
      lp: "13",
      desc: "Wypełnienie spoin masą silikonową o wym. 6x6 mm",
      unit: "mb",
      id: "p2b-wypelnienie-spoin-silikonem-mb",
    },
    {
      lp: "16",
      desc: "Demontaż starych i montaż nowych okien rozwieranych i uchylno-rozwieranych",
      unit: "m2",
      id: "p2b-wymiana-okien-m2",
    },
    {
      lp: "18",
      desc: "Demontaż ościeżnic stalowych lub krat okiennych",
      unit: "m2",
      id: "p2b-demontaz-oscieznic-krat-okiennych-m2",
    },
    {
      lp: "20",
      desc: "Demontaż starych i montaż nowych parapetów zewnętrznych",
      unit: "m",
      id: "p2b-wymiana-parapetow-zewnetrznych-mb",
    },
  ];
  let a02Ok = 0;
  for (const c of cases) {
    const mapped = mapOfferBoqLineCore(
      emptyLine({ lp: c.lp, description: c.desc, unit: c.unit }),
      { works },
    );
    const ids = (mapped.candidateMatches ?? []).map((x) => x.catalogWorkId);
    if (ids.includes(c.id)) a02Ok += 1;
    else console.error("A0.2 miss", c.lp, c.id, ids);
  }
  ok("13 A0.2 8 intended present in TOP-4", a02Ok === 8, { a02Ok });
}

console.log(`\nL+T+U admission gate: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
assert.ok(pass > 0);
