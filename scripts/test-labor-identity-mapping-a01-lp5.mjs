/**
 * IK-OWNER-CREATE A01-LP5 — WM LP5/LP10 impregnacja identity + A01-S1 protection.
 *
 * npx vite-node scripts/test-labor-identity-mapping-a01-lp5.mjs
 */
import {
  IK_OWNER_CREATE_A01_LP5_ALIAS_LP10,
  IK_OWNER_CREATE_A01_LP5_ALIAS_LP5,
  IK_OWNER_CREATE_A01_LP5_WORK_ID,
  buildIkOwnerCreateA01Lp5CatalogWork,
} from "../src/lib/work-catalog/ik-owner-create-a01-lp5-catalog.ts";
import {
  WORK_RATE_IDENTITY_MAPPINGS,
  listExactIdentityAliasesForWork,
  normalizeLaborIdentityName,
  resolveLaborIdentityMapping,
  setWorkRateIdentityMappingsForTests,
  validateLaborIdentityMappingRegistry,
} from "../src/lib/work-catalog/index.ts";

const WORK_OCZYSZCZENIE = "cc-w2-oczyszczenie-podloza";
const WORK_IMPREGNACJA = IK_OWNER_CREATE_A01_LP5_WORK_ID;
const MAPPING_S1 = "lim-ik-a01-lp4-oczyszczenie-wm";
const MAPPING_LP5 = "lim-ik-a01-lp5-impregnacja-wm";
const ALIAS_LP4 =
  "Przygotowanie i naprawa podłoża-oczyszczenie powierzchni muru";

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

function resolve(name, observedName) {
  return resolveLaborIdentityMapping({
    observedName,
    observedUnit: "m2",
    catalogUnit: "m2",
    sourceId: "kb_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
}

// LP5-0 catalog work draft
{
  const work = buildIkOwnerCreateA01Lp5CatalogWork("2026-08-23T20:00:00.000Z");
  ok(
    "LP5-0 catalog work draft",
    work.id === WORK_IMPREGNACJA &&
      work.tradeId === "PRZYGOTOWANIE" &&
      work.unit === "m2" &&
      work.namePl === "Impregnacja biobójcza ręczna",
    work,
  );
}

// LP5-1 single A01-LP5 row
{
  const rows = WORK_RATE_IDENTITY_MAPPINGS.filter((r) => r.mappingId === MAPPING_LP5);
  ok(
    "LP5-1 single A01-LP5 row",
    rows.length === 1 &&
      rows[0].workId === WORK_IMPREGNACJA &&
      rows[0].observedNameAliases.length === 2,
    rows,
  );
}

// LP5-2 registry validate
{
  const v = validateLaborIdentityMappingRegistry(WORK_RATE_IDENTITY_MAPPINGS, KNOWN);
  ok("LP5-2 registry validate ok", v.ok, v.issues);
}

// T1 LP4 → oczyszczenie HIT
{
  const r = resolve("T1", ALIAS_LP4);
  ok(
    "T1 LP4 → cc-w2-oczyszczenie-podloza",
    r.status === "HIT" && r.workId === WORK_OCZYSZCZENIE && r.mappingId === MAPPING_S1,
    r,
  );
}

// T2 LP5 → impregnacja HIT
{
  const r = resolve("T2", IK_OWNER_CREATE_A01_LP5_ALIAS_LP5);
  ok(
    "T2 LP5 → cc-w2-impregnacja-biobojcza-m2",
    r.status === "HIT" && r.workId === WORK_IMPREGNACJA && r.mappingId === MAPPING_LP5,
    r,
  );
}

// T3 LP10 → impregnacja HIT
{
  const r = resolve("T3", IK_OWNER_CREATE_A01_LP5_ALIAS_LP10);
  ok(
    "T3 LP10 → cc-w2-impregnacja-biobojcza-m2",
    r.status === "HIT" && r.workId === WORK_IMPREGNACJA && r.mappingId === MAPPING_LP5,
    r,
  );
}

// T4 LP5 → oczyszczenie MISS
{
  const r = resolve("T4", IK_OWNER_CREATE_A01_LP5_ALIAS_LP5);
  ok("T4 LP5 → oczyszczenie MISS", r.workId !== WORK_OCZYSZCZENIE, r);
}

// T5 LP10 → oczyszczenie MISS
{
  const r = resolve("T5", IK_OWNER_CREATE_A01_LP5_ALIAS_LP10);
  ok("T5 LP10 → oczyszczenie MISS", r.workId !== WORK_OCZYSZCZENIE, r);
}

// T6 zmywanie → MISS
{
  const r = resolve("T6a", "Oczyszczenie / zmywanie podłoża");
  const r2 = resolve(
    "T6b",
    "Przygotowanie i naprawa podłoża-zmywanie powierzchni muru",
  );
  ok("T6 zmywanie → MISS", r.status === "MISS" && r2.status === "MISS", { r, r2 });
}

// T7 gruntowanie → MISS on impregnacja
{
  const r = resolve("T7", "Warstwa gruntująca podłoża przed posadzką");
  ok("T7 gruntowanie → MISS", r.status === "MISS", r);
}

// T8 unit m2
{
  const row = WORK_RATE_IDENTITY_MAPPINGS.find((r) => r.mappingId === MAPPING_LP5);
  ok(
    "T8 unit m2 parity",
    row?.catalogUnit === "m2" && row?.observedUnit === "m2",
    row,
  );
}

// T9 dual-bind — no alias normalized collision across mappingIds
{
  const seen = new Map();
  let dual = false;
  for (const row of WORK_RATE_IDENTITY_MAPPINGS) {
    for (const alias of row.observedNameAliases) {
      const n = normalizeLaborIdentityName(alias);
      if (seen.has(n) && seen.get(n) !== row.mappingId) {
        dual = true;
      }
      seen.set(n, row.mappingId);
    }
  }
  ok("T9 dual-bind detection", dual === false, [...seen.entries()]);
}

// T10 Wave-1 + A01-S1 unchanged
{
  const ids = new Set(WORK_RATE_IDENTITY_MAPPINGS.map((r) => r.mappingId));
  const s1 = WORK_RATE_IDENTITY_MAPPINGS.find((r) => r.mappingId === MAPPING_S1);
  ok(
    "T10 Wave-1 + A01-S1 retained",
    ids.has("lim-w1-tablica-rozdzielcza-cr") &&
      ids.has("lim-w1-podejscie-wod-kan-cr") &&
      s1?.workId === WORK_OCZYSZCZENIE &&
      s1?.observedNameAliases[0] === ALIAS_LP4,
    [...ids],
  );
}

// LP5-3 exact aliases list
{
  const aliases = listExactIdentityAliasesForWork({
    workId: WORK_IMPREGNACJA,
    catalogUnit: "m2",
  });
  ok(
    "LP5-3 exact alias list LP5+LP10",
    aliases.length === 2 &&
      aliases.includes(IK_OWNER_CREATE_A01_LP5_ALIAS_LP5) &&
      aliases.includes(IK_OWNER_CREATE_A01_LP5_ALIAS_LP10),
    aliases,
  );
}

console.log(`\nA01-LP5: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
