/**
 * FND-01c — Final Suite + edge cases + Public API (root barrel).
 * Run: npx vite-node scripts/test-foundation-fnd-01-final.mjs
 */
import * as FoundationRoot from "../src/lib/wgdom-foundation/index.ts";
import * as IdBarrel from "../src/lib/wgdom-foundation/id/index.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

const {
  PREFIX,
  ID_TYPES,
  FND_ID_INVALID,
  ULID_LENGTH,
  ULID_ALPHABET,
  createId,
  createUlid,
  encodeUlid,
  decodeUlidTime,
  parseId,
  isValidId,
  isValidUlidBody,
  assertId,
  resetUlidMonotonicStateForTests,
  asSnapshotId,
  asRecipeId,
  asVariantId,
  asProductKeyId,
  asObservationId,
  asAggregateId,
  asAnalysisId,
  asOfferBoqId,
  asBidId,
  asDecisionId,
  asStartId,
  asProjectCaseId,
  asEventId,
  asFoundationId,
} = FoundationRoot;

console.log("=== FND-01c Final Suite (Public API + edges) ===\n");

// --- Root barrel ≡ id barrel surface (key functions) ---
const REQUIRED_EXPORTS = [
  "PREFIX",
  "ID_TYPES",
  "FND_ID_INVALID",
  "ULID_LENGTH",
  "ULID_ALPHABET",
  "createId",
  "createUlid",
  "encodeUlid",
  "decodeUlidTime",
  "parseId",
  "isValidId",
  "isValidUlidBody",
  "assertId",
  "resetUlidMonotonicStateForTests",
  "asSnapshotId",
  "asBidId",
  "asFoundationId",
];

for (const name of REQUIRED_EXPORTS) {
  assert(`root export ${name}`, typeof FoundationRoot[name] !== "undefined");
  assert(`id barrel export ${name}`, typeof IdBarrel[name] !== "undefined");
}

assert("ID_TYPES length 14", ID_TYPES.length === 14);
assert("ULID_ALPHABET length 32", ULID_ALPHABET.length === 32);
assert("no I in alphabet", !ULID_ALPHABET.includes("I"));
assert("no L in alphabet", !ULID_ALPHABET.includes("L"));
assert("no O in alphabet", !ULID_ALPHABET.includes("O"));
assert("no U in alphabet", !ULID_ALPHABET.includes("U"));

// --- All IdTypes: create → parse → isValid → assert ---
resetUlidMonotonicStateForTests();
for (const type of ID_TYPES) {
  const id = createId(type);
  const parsed = parseId(id);
  assert(`roundtrip ${type} prefix`, id.startsWith(PREFIX[type]));
  assert(`roundtrip ${type} parse type`, parsed?.type === type);
  assert(`roundtrip ${type} isValid`, isValidId(id, type) === true);
  assert(`roundtrip ${type} assert`, (() => {
    assertId(id, type);
    return true;
  })());
}

// --- Brand helpers all types ---
const brandMap = {
  snapshot: asSnapshotId,
  recipe: asRecipeId,
  variant: asVariantId,
  productKey: asProductKeyId,
  observation: asObservationId,
  aggregate: asAggregateId,
  analysis: asAnalysisId,
  offerBoq: asOfferBoqId,
  bid: asBidId,
  decision: asDecisionId,
  start: asStartId,
  projectCase: asProjectCaseId,
  event: asEventId,
  foundation: asFoundationId,
};

resetUlidMonotonicStateForTests();
for (const type of ID_TYPES) {
  const id = createId(type);
  const branded = brandMap[type](id);
  assert(`brand ${type}`, branded === id);
}

// --- Edge: non-strings / empty ---
assert("parseId nullish-like undefined", parseId(undefined) === null);
assert("parseId null", parseId(null) === null);
assert("parseId number", parseId(123) === null);
assert("parseId empty", parseId("") === null);
assert("isValidId undefined", isValidId(undefined) === false);
assert("isValidUlidBody empty", isValidUlidBody("") === false);

// --- Edge: whitespace / mixed case / separator abuse ---
resetUlidMonotonicStateForTests();
const good = createId("snapshot");
assert("reject leading space", isValidId(` ${good}`) === false);
assert("reject trailing space", isValidId(`${good} `) === false);
assert("reject lowercase body", isValidId(good.toLowerCase()) === false);
assert("reject internal underscore ulid", isValidId(`snap_01ARZ3NDEKTSV4RRFFQ69G5_AV`) === false);

// --- Edge: prefix collisions aggregate vs analysis ---
const SPEC_TIME = 1469918176385;
const zeros = new Uint8Array(16);
const ulid = encodeUlid(SPEC_TIME, zeros);
assert("agg_ not parsed as an_", parseId(`agg_${ulid}`)?.type === "aggregate");
assert("an_ parsed as analysis", parseId(`an_${ulid}`)?.type === "analysis");
assert("obq_ vs obs_", parseId(`obq_${ulid}`)?.type === "offerBoq");
assert("obs_ type", parseId(`obs_${ulid}`)?.type === "observation");

// --- Edge: assertId wrong type + code ---
let code = "";
try {
  assertId(createId("bid"), "snapshot");
} catch (e) {
  code = e && typeof e === "object" && "code" in e ? String(e.code) : "";
}
assert("assertId cross-type FND_ID_INVALID", code === FND_ID_INVALID);

// --- Spec: PublicId = prefix + ulid; createUlid alone not a PublicId ---
const raw = createUlid();
assert("raw ulid not PublicId", isValidId(raw) === false);
assert("raw ulid body ok", isValidUlidBody(raw) === true);
assert("decodeUlidTime finite", Number.isFinite(decodeUlidTime(raw)));

// --- Unknown IdType runtime ---
let unknownThrew = false;
try {
  createId(/** @type {any} */ ("notAType"));
} catch {
  unknownThrew = true;
}
assert("createId unknown type throws", unknownThrew);

console.log(`\n=== FND-01c RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
