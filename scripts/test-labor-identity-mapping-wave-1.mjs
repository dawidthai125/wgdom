/**
 * WR-LABOR-IDENTITY-MAPPING-WAVE-1 — regression (deterministic · ZERO live HTTP · ZERO KV).
 *
 * npx vite-node scripts/test-labor-identity-mapping-wave-1.mjs
 */
import {
  WORK_RATE_IDENTITY_MAPPINGS,
  buildLaborIdentityMappingFixture,
  classifyWorkRateEvidenceScopeTag,
  isForbiddenLegacyBucketWorkId,
  isWorkRateEvidenceScopeAllowed,
  listAllowedWorkRateEvidenceScopeTags,
  listExactIdentityAliasesForWork,
  listWorkRateMatchNamesPl,
  namesLooselyMatch,
  resolveLaborIdentityMapping,
  setWorkRateIdentityMappingsForTests,
  validateLaborIdentityMappingRow,
  validateLaborIdentityMappingRegistry,
} from "../src/lib/work-catalog/index.ts";

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

const WORK_TABLICA = "p2b-tablica-rozdzielcza-mieszkaniowa-szt";
const WORK_PODEJSCIE = "p2b-podejscie-wod-kan-mb";
const WORK_OPRAWA = "p2b-punkt-elektryczny-oswietleniowy-szt";
const ALIAS_TABLICA = "Montaż skrzynki rozdzielczej";
const ALIAS_PODEJSCIE =
  "Wykonanie podejścia wodno - kanalizacyjnego plastik i miedź";

const KNOWN = new Set([
  WORK_TABLICA,
  WORK_PODEJSCIE,
  WORK_OPRAWA,
  "cc-p0c-w1-zaprawianie-bruzd",
  "legacy-malowanie-m2",
  "cc-w2-oczyszczenie-podloza",
]);

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("UNEXPECTED_LIVE_FETCH");
};

setWorkRateIdentityMappingsForTests(null);

// W1-1 registry Wave-1 + A01-S1 (3 Owner-approved)
{
  const ids = WORK_RATE_IDENTITY_MAPPINGS.map((r) => r.mappingId).sort();
  ok(
    "W1-1 registry exactly 3",
    WORK_RATE_IDENTITY_MAPPINGS.length === 3 &&
      ids.join("|") ===
        "lim-ik-a01-lp4-oczyszczenie-wm|lim-w1-podejscie-wod-kan-cr|lim-w1-tablica-rozdzielcza-cr",
    ids,
  );
}

// W1-2 no HOLD seeds
{
  const workIds = new Set(WORK_RATE_IDENTITY_MAPPINGS.map((r) => r.workId));
  ok(
    "W1-2 no HOLD workIds seeded",
    !workIds.has(WORK_OPRAWA) &&
      !workIds.has("cc-w2-zawor-odcinajacy") &&
      ![...workIds].some((id) => isForbiddenLegacyBucketWorkId(id)),
    [...workIds],
  );
}

// W1-3 tablica resolves
{
  const r = resolveLaborIdentityMapping({
    observedName: ALIAS_TABLICA,
    observedUnit: "szt",
    catalogUnit: "szt",
    sourceId: "cennikremontow_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
  ok(
    "W1-3 tablica mapping HIT",
    r.status === "HIT" &&
      r.workId === WORK_TABLICA &&
      r.mappingId === "lim-w1-tablica-rozdzielcza-cr" &&
      r.matchedAlias === ALIAS_TABLICA,
    r,
  );
}

// W1-4 podejście resolves (exact CR spelling with spaced hyphen)
{
  const r = resolveLaborIdentityMapping({
    observedName: ALIAS_PODEJSCIE,
    observedUnit: "mb",
    catalogUnit: "mb",
    sourceId: "cennikremontow_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
  ok(
    "W1-4 podejście mapping HIT",
    r.status === "HIT" &&
      r.workId === WORK_PODEJSCIE &&
      r.mappingId === "lim-w1-podejscie-wod-kan-cr",
    r,
  );
}

// W1-5 normalization still exact_normalized (case/diacritics)
{
  const r = resolveLaborIdentityMapping({
    observedName: "  montaz   SKRZYNKI  rozdzielczej ",
    observedUnit: "szt",
    catalogUnit: "szt",
    sourceId: "cennikremontow_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
  ok("W1-5 tablica normalized HIT", r.status === "HIT" && r.workId === WORK_TABLICA, r);
}

// W1-6 wrong operation does NOT map
{
  const r = resolveLaborIdentityMapping({
    observedName: "Montaż gniazd i łączników",
    observedUnit: "szt",
    catalogUnit: "szt",
    sourceId: "cennikremontow_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
  ok("W1-6 wrong electrical op MISS", r.status === "MISS", r);
}

// W1-7 wrong unit does NOT map
{
  const rTab = resolveLaborIdentityMapping({
    observedName: ALIAS_TABLICA,
    observedUnit: "mb",
    catalogUnit: "szt",
    sourceId: "cennikremontow_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
  const rPod = resolveLaborIdentityMapping({
    observedName: ALIAS_PODEJSCIE,
    observedUnit: "szt",
    catalogUnit: "mb",
    sourceId: "cennikremontow_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
  ok(
    "W1-7 wrong unit MISS",
    rTab.status === "MISS" && rPod.status === "MISS",
    { rTab, rPod },
  );
}

// W1-8 wrong sourceId does NOT map (source-role / source bind)
{
  const r = resolveLaborIdentityMapping({
    observedName: ALIAS_TABLICA,
    observedUnit: "szt",
    catalogUnit: "szt",
    sourceId: "kb_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
  ok("W1-8 wrong sourceId MISS", r.status === "MISS", r);
}

// W1-9 nonexistent workId does NOT map (validate + resolve with known set)
{
  const bad = buildLaborIdentityMappingFixture({
    mappingId: "lim-w1-bad",
    workId: "does-not-exist-wave1",
    observedNameAliases: ["Coś"],
    catalogUnit: "szt",
    observedUnit: "szt",
  });
  const issues = validateLaborIdentityMappingRow(bad, KNOWN);
  ok(
    "W1-9 unknown workId blocked in validate",
    issues.some((i) => i.code === "unknown_workId"),
    issues,
  );
}

// W1-10 ambiguous remains AMBIGUOUS
{
  const a = buildLaborIdentityMappingFixture({
    mappingId: "lim-w1-amb-a",
    workId: WORK_TABLICA,
    observedNameAliases: ["Montaż urządzenia testowego Y"],
    catalogUnit: "szt",
    observedUnit: "szt",
    sourceId: "*",
  });
  const b = buildLaborIdentityMappingFixture({
    mappingId: "lim-w1-amb-b",
    workId: WORK_OPRAWA,
    observedNameAliases: ["Montaż urządzenia testowego Y"],
    catalogUnit: "szt",
    observedUnit: "szt",
    sourceId: "*",
  });
  setWorkRateIdentityMappingsForTests([a, b]);
  const r = resolveLaborIdentityMapping({
    observedName: "Montaż urządzenia testowego Y",
    observedUnit: "szt",
    catalogUnit: "szt",
    sourceId: "cennikremontow_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
  ok("W1-10 ambiguous AMBIGUOUS", r.status === "AMBIGUOUS", r);
  setWorkRateIdentityMappingsForTests(null);
}

// W1-11 bucket mapping FORBIDDEN
{
  ok(
    "W1-11a bucket forbidden helper",
    isForbiddenLegacyBucketWorkId("legacy-elektryka-szt") &&
      isForbiddenLegacyBucketWorkId("legacy-hydraulika-szt"),
  );
  const bad = buildLaborIdentityMappingFixture({
    mappingId: "lim-w1-bucket",
    workId: "legacy-elektryka-szt",
    observedNameAliases: [ALIAS_TABLICA],
    catalogUnit: "szt",
    observedUnit: "szt",
  });
  ok(
    "W1-11b bucket validate fail",
    validateLaborIdentityMappingRow(bad, KNOWN).some(
      (i) => i.code === "legacy_bucket_forbidden",
    ),
  );
  setWorkRateIdentityMappingsForTests([bad]);
  ok(
    "W1-11c bucket yields no aliases",
    listExactIdentityAliasesForWork({
      workId: "legacy-elektryka-szt",
      catalogUnit: "szt",
    }).length === 0,
  );
  setWorkRateIdentityMappingsForTests(null);
}

// W1-12 D1 scope cannot be bypassed
{
  const allowed = listAllowedWorkRateEvidenceScopeTags({
    workId: "legacy-malowanie-m2",
    namePl: "Malowanie (m2)",
  });
  const joinery = classifyWorkRateEvidenceScopeTag("Malowanie drzwi drewnianych");
  ok(
    "W1-12 D1 scope not bypassed",
    allowed != null && !isWorkRateEvidenceScopeAllowed(joinery, allowed),
    { allowed, joinery },
  );
}

// W1-13 D1 grooves synonym intact (no mapping for grooves)
{
  const names = listWorkRateMatchNamesPl("Zaprawianie / zamurowanie bruzd");
  ok(
    "W1-13 D1 grooves synonym",
    names.some((n) => /szpachlowanie bruzd po kablach/i.test(n)) &&
      namesLooselyMatch(
        "szpachlowanie bruzd po kablach",
        "szpachlowanie bruzd po kablach",
      ),
    names,
  );
}

// W1-14 HOLD oprawa still MISS on production registry
{
  const r = resolveLaborIdentityMapping({
    observedName: "Montaż lamp stropowych i kinkietów",
    observedUnit: "szt",
    catalogUnit: "szt",
    sourceId: "cennikremontow_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: KNOWN,
  });
  ok("W1-14 HOLD oprawa remains MISS", r.status === "MISS", r);
}

// W1-15 registry validate OK against known ids
{
  const v = validateLaborIdentityMappingRegistry(
    WORK_RATE_IDENTITY_MAPPINGS,
    KNOWN,
  );
  ok("W1-15 registry validate OK", v.ok === true, v.issues);
}

// W1-16 listExact aliases for approved works
{
  const tab = listExactIdentityAliasesForWork({
    workId: WORK_TABLICA,
    catalogUnit: "szt",
    sourceId: "cennikremontow_pl",
  });
  const pod = listExactIdentityAliasesForWork({
    workId: WORK_PODEJSCIE,
    catalogUnit: "mb",
    sourceId: "cennikremontow_pl",
  });
  ok(
    "W1-16 exact aliases for approved works",
    tab.length === 1 &&
      tab[0] === ALIAS_TABLICA &&
      pod.length === 1 &&
      pod[0] === ALIAS_PODEJSCIE,
    { tab, pod },
  );
}

console.log(
  `\nWAVE-1 RESULT passed=${passed} failed=${failed} fetchCalls=${fetchCalls}`,
);
if (failed > 0 || fetchCalls > 0) process.exit(1);
