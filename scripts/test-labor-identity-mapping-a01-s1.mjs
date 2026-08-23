/**
 * IK-OWNER-MAP A01-S1 — WM LP4 oczyszczenie identity (exact_normalized · LP5 excluded).
 *
 * npx vite-node scripts/test-labor-identity-mapping-a01-s1.mjs
 */
import {
  WORK_RATE_IDENTITY_MAPPINGS,
  listExactIdentityAliasesForWork,
  matchLaborIdentityMappingForWork,
  resolveLaborIdentityMapping,
  setWorkRateIdentityMappingsForTests,
  validateLaborIdentityMappingRegistry,
} from "../src/lib/work-catalog/index.ts";

const WORK_OCZYSZCZENIE = "cc-w2-oczyszczenie-podloza";
const WORK_IMPREGNACJA = "cc-w2-impregnacja-biobojcza-m2";
const MAPPING_ID = "lim-ik-a01-lp4-oczyszczenie-wm";
const ALIAS_LP4 =
  "Przygotowanie i naprawa podłoża-oczyszczenie powierzchni muru";
const LP5_IMPREGNACJA =
  "Impregnacja biobójcza ręczna m2 d.1.1 0103-01 Krotność = 2 .2 poz.4";

let passed = 0;
let failed = 0;
function ok(name, cond, extra) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

setWorkRateIdentityMappingsForTests(null);

const KNOWN = new Set([
  WORK_OCZYSZCZENIE,
  WORK_IMPREGNACJA,
  "p2b-tablica-rozdzielcza-mieszkaniowa-szt",
  "p2b-podejscie-wod-kan-mb",
]);

// A01-1 exactly one A01 row in production registry
{
  const a01 = WORK_RATE_IDENTITY_MAPPINGS.filter(
    (r) => r.mappingId === MAPPING_ID,
  );
  ok(
    "A01-1 single A01-S1 row in registry",
    a01.length === 1 &&
      a01[0].workId === WORK_OCZYSZCZENIE &&
      a01[0].observedNameAliases.length === 1 &&
      a01[0].observedNameAliases[0] === ALIAS_LP4,
    a01,
  );
}

// A01-2 registry validates
{
  const v = validateLaborIdentityMappingRegistry(
    WORK_RATE_IDENTITY_MAPPINGS,
    KNOWN,
  );
  ok("A01-2 registry validate ok", v.ok, v.issues);
}

// A01-3 LP4 → HIT
{
  const r = resolveLaborIdentityMapping({
    observedName: ALIAS_LP4,
    observedUnit: "m2",
    catalogUnit: "m2",
    sourceId: "kb_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
  ok(
    "A01-3 LP4 oczyszczenie HIT",
    r.status === "HIT" &&
      r.workId === WORK_OCZYSZCZENIE &&
      r.mappingId === MAPPING_ID &&
      r.matchedAlias === ALIAS_LP4,
    r,
  );
}

// A01-4 LP5 impregnacja → MISS on oczyszczenie workId (A01-S1 exclusion preserved)
{
  const r = matchLaborIdentityMappingForWork({
    workId: WORK_OCZYSZCZENIE,
    catalogUnit: "m2",
    observedName: LP5_IMPREGNACJA,
    observedUnit: "m2",
    sourceId: "kb_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
  ok("A01-4 LP5 MISS on oczyszczenie workId", r.status === "MISS", r);
}

// A01-5 zmywanie catalog label → MISS
{
  const r = resolveLaborIdentityMapping({
    observedName: "Oczyszczenie / zmywanie podłoża",
    observedUnit: "m2",
    catalogUnit: "m2",
    sourceId: "*",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
  ok("A01-5 zmywanie label NO HIT", r.status === "MISS", r);
}

// A01-6 hypothetical zmywanie BOQ fragment → MISS
{
  const r = resolveLaborIdentityMapping({
    observedName: "Przygotowanie i naprawa podłoża-zmywanie powierzchni muru",
    observedUnit: "m2",
    catalogUnit: "m2",
    sourceId: "*",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
  ok("A01-6 zmywanie variant NO HIT", r.status === "MISS", r);
}

// A01-7 listExactIdentityAliasesForWork exposes LP4 only
{
  const aliases = listExactIdentityAliasesForWork({
    workId: WORK_OCZYSZCZENIE,
    catalogUnit: "m2",
  });
  ok(
    "A01-7 exact alias list LP4 only",
    aliases.length === 1 && aliases[0] === ALIAS_LP4,
    aliases,
  );
}

// A01-8 Wave-1 rows still present (append-only)
{
  const ids = new Set(WORK_RATE_IDENTITY_MAPPINGS.map((r) => r.mappingId));
  ok(
    "A01-8 Wave-1 mappings retained",
    ids.has("lim-w1-tablica-rozdzielcza-cr") &&
      ids.has("lim-w1-podejscie-wod-kan-cr"),
    [...ids],
  );
}

console.log(`\nA01-S1: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
