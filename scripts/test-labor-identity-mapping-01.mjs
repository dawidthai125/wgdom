/**
 * WR-LABOR-IDENTITY-MAPPING-01 — T1–T20 (deterministic · ZERO live HTTP · ZERO KV).
 *
 * npx vite-node scripts/test-labor-identity-mapping-01.mjs
 */
import {
  LABOR_IDENTITY_MAPPING_MATCH_MODE,
  LABOR_IDENTITY_MAPPING_MAX_ALIASES,
  WORK_RATE_IDENTITY_MAPPINGS,
  buildLaborIdentityMappingFixture,
  classifyWorkRateEvidenceScopeTag,
  isForbiddenLegacyBucketWorkId,
  isWorkRateEvidenceScopeAllowed,
  laborIdentityNamesExactNormalizedMatch,
  listAllowedWorkRateEvidenceScopeTags,
  listExactIdentityAliasesForWork,
  listWorkRateMatchNamesPl,
  namesExactNormalizedMatch,
  namesLooselyMatch,
  parseWorkRateOffersFromHtml,
  resolveLaborIdentityMapping,
  setWorkRateIdentityMappingsForTests,
  unitsCompatibleExact,
  validateLaborIdentityMappingRow,
  WORK_RATE_OWNER_SYNONYMS,
  normalizeWorkCatalogStore,
} from "../src/lib/work-catalog/index.ts";
import {
  buildLaborSourceEvidenceObservation,
  resolveLaborSourceEvidenceSourceRole,
} from "../src/lib/labor-source-evidence/index.ts";

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

const WORK_OPRAWA = "p2b-punkt-elektryczny-oswietleniowy-szt";
const WORK_TABLICA = "p2b-tablica-rozdzielcza-mieszkaniowa-szt";
const KNOWN = new Set([WORK_OPRAWA, WORK_TABLICA, "cc-p0c-w1-zaprawianie-bruzd"]);

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};
let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("UNEXPECTED_LIVE_FETCH");
};

setWorkRateIdentityMappingsForTests(null);

// --- T1 exact_normalized match
{
  const row = buildLaborIdentityMappingFixture({
    mappingId: "lim-t1",
    workId: WORK_OPRAWA,
    observedNameAliases: ["Montaż oprawy oświetleniowej punktowej"],
    catalogUnit: "szt",
    observedUnit: "szt",
    categoryKey: "electrical",
  });
  setWorkRateIdentityMappingsForTests([row]);
  const r = resolveLaborIdentityMapping({
    observedName: "Montaż oprawy oświetleniowej punktowej",
    observedUnit: "szt",
    catalogUnit: "szt",
    sourceId: "cennikremontow_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
  ok("T1 exact_normalized match", r.status === "HIT" && r.workId === WORK_OPRAWA, r);
}

// --- T2 normalization (diacritics / case / spaces)
{
  const r = resolveLaborIdentityMapping({
    observedName: "  montaz   OPRAWY oswietleniowej punktowej ",
    observedUnit: "szt",
    catalogUnit: "szt",
    sourceId: "kb_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
  ok(
    "T2 normalization",
    r.status === "HIT" &&
      laborIdentityNamesExactNormalizedMatch(
        "Montaż oprawy oświetleniowej punktowej",
        "  montaz   OPRAWY oswietleniowej punktowej ",
      ),
    r,
  );
}

// --- T3 unit match
{
  ok(
    "T3 unit match",
    unitsCompatibleExact("szt", "szt", "szt", "szt") === true,
  );
}

// --- T4 unit mismatch
{
  const r = resolveLaborIdentityMapping({
    observedName: "Montaż oprawy oświetleniowej punktowej",
    observedUnit: "mb",
    catalogUnit: "szt",
    sourceId: "kb_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
  ok("T4 unit mismatch", r.status === "MISS", r);
  ok("T4b unitsCompatibleExact false", unitsCompatibleExact("szt", "mb", "szt", "szt") === false);
}

// --- T5 concrete operation mapping
{
  const html = `
  <table><tr><td>Montaż oprawy oświetleniowej punktowej</td><td>80 zł/szt</td></tr>
  <tr><td>Montaż gniazd i łączników</td><td>40 zł/szt</td></tr></table>`;
  const offers = parseWorkRateOffersFromHtml({
    sourceId: "cennikremontow_pl",
    html,
    sourceUrl: "https://cennikremontow.pl/instalacje-elektryczne-cennik",
    expectedNamePl: "Oprawa oświetleniowa punktowa",
    expectedUnit: "szt",
    alternateNamesPl: [],
    exactIdentityAliasesPl: listExactIdentityAliasesForWork({
      workId: WORK_OPRAWA,
      catalogUnit: "szt",
    }),
  });
  ok(
    "T5 concrete operation mapping",
    offers.length === 1 &&
      /opraw/i.test(offers[0].workNamePl) &&
      !/gniazd/i.test(offers.map((o) => o.workNamePl).join(" ")),
    offers.map((o) => o.workNamePl),
  );
}

// --- T6 legacy bucket forbidden
{
  ok("T6a isForbiddenLegacyBucketWorkId", isForbiddenLegacyBucketWorkId("legacy-elektryka-szt"));
  const bad = buildLaborIdentityMappingFixture({
    mappingId: "lim-bucket",
    workId: "legacy-elektryka-szt",
    observedNameAliases: ["Montaż gniazd"],
    catalogUnit: "szt",
    observedUnit: "szt",
  });
  const issues = validateLaborIdentityMappingRow(bad, KNOWN);
  ok(
    "T6 legacy bucket forbidden",
    issues.some((i) => i.code === "legacy_bucket_forbidden"),
    issues,
  );
  setWorkRateIdentityMappingsForTests([bad]);
  const aliases = listExactIdentityAliasesForWork({
    workId: "legacy-elektryka-szt",
    catalogUnit: "szt",
  });
  ok("T6b no aliases for bucket work", aliases.length === 0, aliases);
}

// --- T7 alias cap <=12
{
  const aliases = Array.from({ length: 12 }, (_, i) => `Alias operacji numer ${i + 1}`);
  const row = buildLaborIdentityMappingFixture({
    mappingId: "lim-cap12",
    workId: WORK_OPRAWA,
    observedNameAliases: aliases,
    catalogUnit: "szt",
    observedUnit: "szt",
  });
  const v = validateLaborIdentityMappingRow(row, KNOWN);
  ok("T7 alias cap <=12", !v.some((i) => i.code === "alias_cap_exceeded"), v);
}

// --- T8 alias cap >12 rejected
{
  const aliases = Array.from({ length: 13 }, (_, i) => `Alias operacji numer ${i + 1}`);
  const row = buildLaborIdentityMappingFixture({
    mappingId: "lim-cap13",
    workId: WORK_OPRAWA,
    observedNameAliases: aliases,
    catalogUnit: "szt",
    observedUnit: "szt",
  });
  const v = validateLaborIdentityMappingRow(row, KNOWN);
  ok(
    "T8 alias cap >12 rejected",
    v.some((i) => i.code === "alias_cap_exceeded") &&
      LABOR_IDENTITY_MAPPING_MAX_ALIASES === 12,
    v,
  );
}

// --- T9 laborOnly preserved
{
  const row = buildLaborIdentityMappingFixture({
    mappingId: "lim-lab",
    workId: WORK_OPRAWA,
    observedNameAliases: ["Montaż lamp stropowych"],
    catalogUnit: "szt",
    observedUnit: "szt",
    laborOnlyRequired: true,
    includesMaterialPolicy: "reject",
  });
  setWorkRateIdentityMappingsForTests([row]);
  const r = resolveLaborIdentityMapping({
    observedName: "Montaż lamp stropowych",
    observedUnit: "szt",
    catalogUnit: "szt",
    sourceId: "kb_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
  ok("T9 laborOnly preserved", r.status === "HIT" && r.laborOnly === true, r);
}

// --- T10 includesMaterial preserved / reject
{
  const rOk = resolveLaborIdentityMapping({
    observedName: "Montaż lamp stropowych",
    observedUnit: "szt",
    catalogUnit: "szt",
    sourceId: "kb_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
  const rBad = resolveLaborIdentityMapping({
    observedName: "Montaż lamp stropowych",
    observedUnit: "szt",
    catalogUnit: "szt",
    sourceId: "kb_pl",
    laborOnly: true,
    includesMaterial: true,
    knownWorkIds: KNOWN,
  });
  ok(
    "T10 includesMaterial preserved",
    rOk.status === "HIT" &&
      rOk.includesMaterial === false &&
      rBad.status === "BLOCKED" &&
      rBad.reason === "material_policy" &&
      rBad.includesMaterial === true,
    { rOk, rBad },
  );
}

// --- T11 D1 scope cannot be bypassed
{
  // painting work with walls_ceilings pool — joinery row still rejected by D1
  const allowed = listAllowedWorkRateEvidenceScopeTags({
    workId: "legacy-malowanie-m2",
    namePl: "Malowanie (m2)",
  });
  const joinery = classifyWorkRateEvidenceScopeTag("Malowanie drzwi drewnianych");
  ok(
    "T11 D1 scope cannot be bypassed",
    allowed != null &&
      !isWorkRateEvidenceScopeAllowed(joinery, allowed) &&
      LABOR_IDENTITY_MAPPING_MATCH_MODE === "exact_normalized",
    { allowed, joinery },
  );
}

// --- T12 source role preserved (mapping does not change roles)
{
  ok(
    "T12 source role preserved",
    resolveLaborSourceEvidenceSourceRole("kb_pl") === "PRIMARY" &&
      resolveLaborSourceEvidenceSourceRole("cennikremontow_pl") === "PRIMARY" &&
      resolveLaborSourceEvidenceSourceRole("extradom") === "PRIMARY" &&
      resolveLaborSourceEvidenceSourceRole("sccot") === "SECONDARY" &&
      resolveLaborSourceEvidenceSourceRole("zleca") === "REFERENCE",
  );
}

// --- T13 region preserved
{
  const r = resolveLaborIdentityMapping({
    observedName: "Montaż lamp stropowych",
    observedUnit: "szt",
    catalogUnit: "szt",
    sourceId: "kb_pl",
    laborOnly: true,
    includesMaterial: false,
    regionScope: "POLSKA",
    knownWorkIds: KNOWN,
  });
  ok(
    "T13 region preserved",
    r.status === "HIT" && r.regionScope === "POLSKA",
    r,
  );
}

// --- T14 ambiguous mapping → UNMATCHED
{
  const a = buildLaborIdentityMappingFixture({
    mappingId: "lim-a",
    workId: WORK_OPRAWA,
    observedNameAliases: ["Montaż urządzenia X"],
    catalogUnit: "szt",
    observedUnit: "szt",
  });
  const b = buildLaborIdentityMappingFixture({
    mappingId: "lim-b",
    workId: WORK_TABLICA,
    observedNameAliases: ["Montaż urządzenia X"],
    catalogUnit: "szt",
    observedUnit: "szt",
  });
  setWorkRateIdentityMappingsForTests([a, b]);
  const r = resolveLaborIdentityMapping({
    observedName: "Montaż urządzenia X",
    observedUnit: "szt",
    catalogUnit: "szt",
    sourceId: "kb_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
  ok("T14 ambiguous mapping → UNMATCHED", r.status === "AMBIGUOUS", r);
}

// --- T15 unknown workId → BLOCKED
{
  const bad = buildLaborIdentityMappingFixture({
    mappingId: "lim-unk",
    workId: "does-not-exist-work",
    observedNameAliases: ["Coś konkretnego"],
    catalogUnit: "szt",
    observedUnit: "szt",
  });
  const issues = validateLaborIdentityMappingRow(bad, KNOWN);
  ok(
    "T15 unknown workId → BLOCKED",
    issues.some((i) => i.code === "unknown_workId"),
    issues,
  );
}

// --- T16 existing workId required
{
  const good = buildLaborIdentityMappingFixture({
    mappingId: "lim-exist",
    workId: WORK_OPRAWA,
    observedNameAliases: ["Montaż oprawy test"],
    catalogUnit: "szt",
    observedUnit: "szt",
  });
  const issues = validateLaborIdentityMappingRow(good, KNOWN);
  ok(
    "T16 existing workId required",
    !issues.some((i) => i.code === "unknown_workId"),
    issues,
  );
}

// --- T17 mapping does not mutate Work Catalog
{
  const before = normalizeWorkCatalogStore({
    schemaVersion: 1,
    updatedAt: "2026-08-14T00:00:00.000Z",
    catalogs: {
      wroclaw: {
        works: [
          {
            id: WORK_OPRAWA,
            namePl: "Oprawa oświetleniowa punktowa",
            unit: "szt",
            companyPricePln: 35,
            active: true,
            source: "custom",
            updatedAt: "2026-08-14T00:00:00.000Z",
          },
        ],
      },
    },
  });
  const snap = JSON.stringify(before);
  resolveLaborIdentityMapping({
    observedName: "Montaż lamp stropowych",
    observedUnit: "szt",
    catalogUnit: "szt",
    sourceId: "kb_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
  ok("T17 mapping does not mutate Work Catalog", JSON.stringify(before) === snap);
}

// --- T18 mapping does not touch OUR RATE / Accept (no accept import side effects)
{
  ok("T18 no live fetch / OUR RATE", fetchCalls === 0);
}

// --- T19 mapping does not alter marketBase / median (namesLooselyMatch unchanged)
{
  const a = namesLooselyMatch("Zaprawianie bruzd", "Zaprawianie / zamurowanie bruzd");
  const b = namesExactNormalizedMatch("Foo", "foo");
  const c = namesExactNormalizedMatch("Montaż gniazd", "Montaż wyłącznika");
  ok(
    "T19 mapping does not alter marketBase / median",
    a === true && b === true && c === false,
    { a, b, c },
  );
}

// --- T20 mapping integrates with Evidence DB (identityMethod · no KV write)
{
  setWorkRateIdentityMappingsForTests([
    buildLaborIdentityMappingFixture({
      mappingId: "lim-ev",
      workId: WORK_OPRAWA,
      observedNameAliases: ["Montaż lamp stropowych i kinkietów"],
      catalogUnit: "szt",
      observedUnit: "szt",
      categoryKey: "electrical",
    }),
  ]);
  const hit = resolveLaborIdentityMapping({
    observedName: "Montaż lamp stropowych i kinkietów",
    observedUnit: "szt",
    catalogUnit: "szt",
    sourceId: "cennikremontow_pl",
    laborOnly: true,
    includesMaterial: false,
    regionScope: "POLSKA",
    knownWorkIds: KNOWN,
  });
  ok("T20a resolve HIT", hit.status === "HIT", hit);
  const obs = buildLaborSourceEvidenceObservation({
    workId: hit.status === "HIT" ? hit.workId : null,
    sourceId: "cennikremontow_pl",
    sourceUrl: "https://cennikremontow.pl/instalacje-elektryczne-cennik",
    observedName: "Montaż lamp stropowych i kinkietów",
    unit: "szt",
    pricePoint: 80,
    priceKind: "point",
    region: "POLSKA",
    identityMatched: hit.status === "HIT",
    identityMethod: "owner_identity_mapping",
    synonymUsed: hit.status === "HIT" ? hit.matchedAlias : null,
    laborOnly: true,
    includesMaterial: false,
  });
  ok(
    "T20 mapping integrates with Evidence DB",
    obs.identityMethod === "owner_identity_mapping" &&
      obs.workId === WORK_OPRAWA &&
      obs.region === "POLSKA" &&
      obs.laborOnly === true &&
      obs.includesMaterial === false &&
      fetchCalls === 0,
    obs,
  );
}

// Production registry Wave-1 + A01-S1 (3 Owner-approved) + match mode lock
{
  setWorkRateIdentityMappingsForTests(null);
  const ids = WORK_RATE_IDENTITY_MAPPINGS.map((r) => r.mappingId).sort();
  ok(
    "PROD registry exactly 3 approved",
    WORK_RATE_IDENTITY_MAPPINGS.length === 3 &&
      ids[0] === "lim-ik-a01-lp4-oczyszczenie-wm" &&
      ids[1] === "lim-w1-podejscie-wod-kan-cr" &&
      ids[2] === "lim-w1-tablica-rozdzielcza-cr",
    ids,
  );
  ok(
    "PROD registry has no Oprawa / HOLD seeds",
    listExactIdentityAliasesForWork({
      workId: WORK_OPRAWA,
      catalogUnit: "szt",
    }).length === 0,
  );
  ok(
    "PROD tablica alias present",
    listExactIdentityAliasesForWork({
      workId: WORK_TABLICA,
      catalogUnit: "szt",
      sourceId: "cennikremontow_pl",
    }).includes("Montaż skrzynki rozdzielczej"),
  );
  ok(
    "OWNER_SYNONYMS still present (A path)",
    WORK_RATE_OWNER_SYNONYMS.some((r) =>
      /szpachlowanie bruzd po kablach/i.test(r.synonym),
    ),
  );
  const grooves = listWorkRateMatchNamesPl("Zaprawianie / zamurowanie bruzd");
  ok(
    "D1 synonym fallback intact",
    grooves.some((n) => /szpachlowanie bruzd po kablach/i.test(n)),
    grooves,
  );
}

setWorkRateIdentityMappingsForTests(null);

console.log(`\nRESULT passed=${passed} failed=${failed} fetchCalls=${fetchCalls}`);
if (failed > 0) process.exit(1);
