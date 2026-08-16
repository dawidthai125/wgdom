/**
 * P5.26-E — INTERNAL-FIRST matcher safety regression (A–O).
 * ZERO HTTP · ZERO KV write · ZERO Accept · ZERO invent.
 *
 * npx vite-node scripts/test-ik-migration-01-p526e-matcher-safety.mjs
 */
import fs from "node:fs";
import {
  hostObjectSafetyGate,
  lookupInternalFirst,
  scoreInternalFirstSemantic,
  wouldRejectCrossDomainPriceReuse,
  P526E_MONTAZ_GRZEJNIKA_WORK_ID,
  P526E_MALOWANIE_EMULSJA_WORK_ID,
  P526E_WYKUCIE_BRUZD_WORK_ID,
  P526E_ZAPRAWIANIE_BRUZD_WORK_ID,
} from "../src/lib/intelligent-estimator/index.ts";

let passed = 0;
let failed = 0;
const results = [];

function ok(name, cond, extra) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
    results.push({ name, pass: true });
  } else {
    failed += 1;
    console.error(`FAIL ${name}`, extra ?? "");
    results.push({ name, pass: false, extra: extra ?? null });
  }
}

function row(id, namePl, unit, classHint, base) {
  return {
    id,
    namePl,
    unit,
    classHint,
    base,
    work: { id, namePl, keywords: [], descriptionPl: "" },
  };
}

const GRZEJNIK = row(
  P526E_MONTAZ_GRZEJNIKA_WORK_ID,
  "Montaż grzejnika",
  "szt",
  "LABOR_MATERIAL_PACKAGE",
  97.3,
);
const EMULSJA = row(
  P526E_MALOWANIE_EMULSJA_WORK_ID,
  "Malowanie emulsją",
  "m2",
  "LABOR_MATERIAL_PACKAGE",
  21.8,
);
const WYKUCIE = row(P526E_WYKUCIE_BRUZD_WORK_ID, "Wykucie bruzd", "mb", "LABOR", 72.5);
const ZAPRAWIANIE = row(P526E_ZAPRAWIANIE_BRUZD_WORK_ID, "Zaprawianie bruzd", "mb", "LABOR", 20);

function isSafeHit(lookup, expectedId) {
  return (
    (lookup.outcome === "INTERNAL_SEMANTIC_HIT" || lookup.outcome === "INTERNAL_EXACT_HIT") &&
    lookup.match?.id === expectedId
  );
}

function isNotSafe(lookup, forbiddenId) {
  if (lookup.outcome === "NO_INTERNAL_MATCH") return true;
  if (lookup.match?.id === forbiddenId) return false;
  return lookup.outcome !== "INTERNAL_SEMANTIC_HIT" && lookup.outcome !== "INTERNAL_EXACT_HIT";
}

// ——— A ———
ok(
  "A Montaż grzejnika → SAFE",
  isSafeHit(
    lookupInternalFirst({
      description: "Montaż grzejnika",
      unit: "szt",
      sourceDomain: "LABOR_MATERIAL_PACKAGE",
      index: [GRZEJNIK],
    }),
    P526E_MONTAZ_GRZEJNIKA_WORK_ID,
  ),
);

// ——— B ———
ok(
  "B Montaż grzejnika stalowego → SAFE",
  isSafeHit(
    lookupInternalFirst({
      description: "Montaż grzejnika stalowego",
      unit: "szt",
      sourceDomain: "LABOR_MATERIAL_PACKAGE",
      index: [GRZEJNIK],
    }),
    P526E_MONTAZ_GRZEJNIKA_WORK_ID,
  ),
);

// ——— C ———
{
  const L = lookupInternalFirst({
    description: "Montaż głowicy termostatycznej grzejnika",
    unit: "szt",
    sourceDomain: "LABOR_MATERIAL_PACKAGE",
    index: [GRZEJNIK],
  });
  ok("C Montaż głowicy termostatycznej grzejnika → NOT SAFE", isNotSafe(L, P526E_MONTAZ_GRZEJNIKA_WORK_ID), L);
  ok(
    "C gate reject głowica≠grzejnik",
    scoreInternalFirstSemantic({
      queryDesc: "Montaż głowicy termostatycznej grzejnika",
      candidate: GRZEJNIK,
      sourceDomain: "LABOR_MATERIAL_PACKAGE",
    }).reject === "głowica≠grzejnik",
  );
}

// ——— D ———
ok(
  "D Montaż głowicy do grzejnika → NOT SAFE",
  isNotSafe(
    lookupInternalFirst({
      description: "Montaż głowicy do grzejnika",
      unit: "szt",
      sourceDomain: "LABOR_MATERIAL_PACKAGE",
      index: [GRZEJNIK],
    }),
    P526E_MONTAZ_GRZEJNIKA_WORK_ID,
  ),
);

// ——— E ———
ok(
  "E Wymiana głowicy termostatycznej → NOT SAFE",
  isNotSafe(
    lookupInternalFirst({
      description: "Wymiana głowicy termostatycznej",
      unit: "szt",
      sourceDomain: "LABOR_MATERIAL_PACKAGE",
      index: [GRZEJNIK],
    }),
    P526E_MONTAZ_GRZEJNIKA_WORK_ID,
  ),
);

// ——— F ———
ok(
  "F Malowanie emulsją → SAFE",
  isSafeHit(
    lookupInternalFirst({
      description: "Malowanie emulsją",
      unit: "m2",
      sourceDomain: "LABOR_MATERIAL_PACKAGE",
      index: [EMULSJA],
    }),
    P526E_MALOWANIE_EMULSJA_WORK_ID,
  ),
);

// ——— G ———
ok(
  "G Dwukrotne malowanie farbami emulsyjnymi → SAFE",
  isSafeHit(
    lookupInternalFirst({
      description: "Dwukrotne malowanie farbami emulsyjnymi powierzchni wewnętrznych",
      unit: "m2",
      sourceDomain: "LABOR_MATERIAL_PACKAGE",
      index: [EMULSJA],
    }),
    P526E_MALOWANIE_EMULSJA_WORK_ID,
  ),
);

// ——— H ———
ok(
  "H Malowanie wapienne → NOT SAFE",
  isNotSafe(
    lookupInternalFirst({
      description: "Malowanie wapienne",
      unit: "m2",
      sourceDomain: "LABOR_MATERIAL_PACKAGE",
      index: [EMULSJA],
    }),
    P526E_MALOWANIE_EMULSJA_WORK_ID,
  ),
);

// ——— I ———
ok(
  "I Malowanie farbą wapienną → NOT SAFE",
  isNotSafe(
    lookupInternalFirst({
      description: "Dwukrotne malowanie farbami wapiennymi starych tynków",
      unit: "m2",
      sourceDomain: "LABOR_MATERIAL_PACKAGE",
      index: [EMULSJA],
    }),
    P526E_MALOWANIE_EMULSJA_WORK_ID,
  ),
);

// ——— J ———
ok(
  "J Malowanie olejne → NOT SAFE",
  isNotSafe(
    lookupInternalFirst({
      description: "Malowanie olejne",
      unit: "m2",
      sourceDomain: "LABOR_MATERIAL_PACKAGE",
      index: [EMULSJA],
    }),
    P526E_MALOWANIE_EMULSJA_WORK_ID,
  ),
);

// ——— K ———
ok(
  "K Malowanie stolarki olejną → NOT SAFE",
  isNotSafe(
    lookupInternalFirst({
      description: "Dwukrotne malowanie farbą olejną uprzednio malowanej stolarki okiennej",
      unit: "m2",
      sourceDomain: "LABOR_MATERIAL_PACKAGE",
      index: [EMULSJA],
    }),
    P526E_MALOWANIE_EMULSJA_WORK_ID,
  ),
);

// ——— L ———
ok(
  "L Malowanie elewacyjne → NOT SAFE",
  isNotSafe(
    lookupInternalFirst({
      description: "Malowanie elewacyjne",
      unit: "m2",
      sourceDomain: "LABOR_MATERIAL_PACKAGE",
      index: [EMULSJA],
    }),
    P526E_MALOWANIE_EMULSJA_WORK_ID,
  ),
);

// ——— M ———
{
  const L = lookupInternalFirst({
    description: "Zaprawianie bruzd",
    unit: "mb",
    sourceDomain: "LABOR",
    index: [WYKUCIE, ZAPRAWIANIE],
  });
  ok(
    "M Zaprawianie bruzd → NOT SAFE for wykucie",
    L.match?.id !== P526E_WYKUCIE_BRUZD_WORK_ID,
    L,
  );
  ok(
    "M Zaprawianie bruzd → may hit zaprawianie host",
    L.match?.id === P526E_ZAPRAWIANIE_BRUZD_WORK_ID || L.outcome === "NO_INTERNAL_MATCH",
    L,
  );
}

// ——— N ———
ok(
  "N Wykucie bruzd → SAFE for wykucie",
  isSafeHit(
    lookupInternalFirst({
      description: "Wykucie bruzd",
      unit: "mb",
      sourceDomain: "LABOR",
      index: [WYKUCIE, ZAPRAWIANIE],
    }),
    P526E_WYKUCIE_BRUZD_WORK_ID,
  ),
);

// ——— O ———
ok(
  "O Wykucie bruzd w ścianie → SAFE",
  isSafeHit(
    lookupInternalFirst({
      description: "Wykucie bruzd w ścianie",
      unit: "mb",
      sourceDomain: "LABOR",
      index: [WYKUCIE, ZAPRAWIANIE],
    }),
    P526E_WYKUCIE_BRUZD_WORK_ID,
  ),
);

// Domain / package-material sanity
ok("domain PACKAGE↛MATERIAL", wouldRejectCrossDomainPriceReuse("LABOR_MATERIAL_PACKAGE", "MATERIAL"));
ok("domain LABOR↛PACKAGE", wouldRejectCrossDomainPriceReuse("LABOR", "LABOR_MATERIAL_PACKAGE"));

ok(
  "host gate glowica",
  hostObjectSafetyGate({
    queryDesc: "Montaż głowicy termostatycznej do grzejnika",
    candidateId: P526E_MONTAZ_GRZEJNIKA_WORK_ID,
    candidateName: "Montaż grzejnika",
  }).ok === false,
);

ok(
  "host gate wapienne",
  hostObjectSafetyGate({
    queryDesc: "Malowanie wapienne",
    candidateId: P526E_MALOWANIE_EMULSJA_WORK_ID,
    candidateName: "Malowanie emulsją",
  }).ok === false,
);

const summary = {
  phase: "P5.26-E",
  ok: failed === 0,
  passed,
  failed,
  results,
  matrix: "A–O",
  updatedAt: new Date().toISOString(),
};

fs.mkdirSync(".tmp", { recursive: true });
fs.writeFileSync(".tmp/p526-e-matcher-safety-results.json", JSON.stringify(summary, null, 2));

console.log(`\nSUMMARY pass=${passed} fail=${failed}`);
if (failed) process.exit(1);
