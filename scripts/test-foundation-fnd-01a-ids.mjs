/**
 * FND-01a — prefiksy + typy + walidacja (bez generatora ULID).
 * Run: npx vite-node scripts/test-foundation-fnd-01a-ids.mjs
 */
import {
  PREFIX,
  ID_TYPES,
  FND_ID_INVALID,
  ULID_LENGTH,
  parseId,
  isValidId,
  isValidUlidBody,
  assertId,
  asSnapshotId,
} from "../src/lib/wgdom-foundation/id/index.ts";

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

/** Fixture ULID (26 Crockford) — nie z generatora FND-01b. */
const ULID_OK = "01ARZ3NDEKTSV4RRFFQ69G5FAV";

console.log("=== FND-01a Foundation IDs (prefixes + validate) ===\n");

assert("fixture ulid length", ULID_OK.length === ULID_LENGTH);
assert("isValidUlidBody OK", isValidUlidBody(ULID_OK) === true);
assert("isValidUlidBody lowercase reject", isValidUlidBody(ULID_OK.toLowerCase()) === false);
assert("isValidUlidBody short", isValidUlidBody("01ARZ3NDEKTSV4RRFFQ69G5FA") === false);
assert("isValidUlidBody long", isValidUlidBody(`${ULID_OK}A`) === false);
assert("isValidUlidBody forbidden I", isValidUlidBody("01ARZ3NDEKTSV4RRFFQ69G5FAI") === false);
assert("isValidUlidBody forbidden L", isValidUlidBody("01ARZ3NDEKTSV4RRFFQ69G5FAL") === false);
assert("isValidUlidBody forbidden O", isValidUlidBody("01ARZ3NDEKTSV4RRFFQ69G5FAO") === false);
assert("isValidUlidBody forbidden U", isValidUlidBody("01ARZ3NDEKTSV4RRFFQ69G5FAU") === false);

assert("PREFIX snapshot", PREFIX.snapshot === "snap_");
assert("PREFIX offerBoq", PREFIX.offerBoq === "obq_");
assert("PREFIX productKey", PREFIX.productKey === "pk_");
assert("ID_TYPES count", ID_TYPES.length === 14);

const snapId = `${PREFIX.snapshot}${ULID_OK}`;
const parsed = parseId(snapId);
assert("parse snapshot type", parsed?.type === "snapshot");
assert("parse snapshot ulid", parsed?.ulid === ULID_OK);
assert("isValidId snapshot", isValidId(snapId) === true);
assert("isValidId snapshot typed", isValidId(snapId, "snapshot") === true);
assert("isValidId wrong type", isValidId(snapId, "bid") === false);

const obqId = `${PREFIX.offerBoq}${ULID_OK}`;
assert("parse offerBoq", parseId(obqId)?.type === "offerBoq");

const aggId = `${PREFIX.aggregate}${ULID_OK}`;
assert("parse aggregate not analysis", parseId(aggId)?.type === "aggregate");

assert("parse empty", parseId("") === null);
assert("parse bare ulid", parseId(ULID_OK) === null);
assert("invalid prefix", parseId(`nope_${ULID_OK}`) === null);
assert("invalid alphabet in body", parseId(`${PREFIX.snapshot}01ARZ3NDEKTSV4RRFFQ69G5FAI`) === null);
assert("invalid length short body", parseId(`${PREFIX.snapshot}01ARZ3NDEKTSV4RRFFQ69G5FA`) === null);
assert(
  "double prefix snap_snap_",
  parseId(`${PREFIX.snapshot}${PREFIX.snapshot}${ULID_OK}`) === null,
);
assert("legacy uuid reject", isValidId("550e8400-e29b-41d4-a716-446655440000") === false);
assert("legacy uuid with prefix reject", isValidId(`snap_550e8400-e29b-41d4-a716-446655440000`) === false);

let threw = false;
let code = "";
try {
  assertId("bad", "snapshot");
} catch (e) {
  threw = true;
  code = e && typeof e === "object" && "code" in e ? String(e.code) : "";
}
assert("assertId throws", threw);
assert("assertId code FND_ID_INVALID", code === FND_ID_INVALID);

assert("assertId ok no throw", (() => {
  assertId(snapId, "snapshot");
  return true;
})());

assert("asSnapshotId brands", asSnapshotId(snapId) === snapId);

let brandThrew = false;
try {
  asSnapshotId(obqId);
} catch {
  brandThrew = true;
}
assert("asSnapshotId rejects other type", brandThrew);

console.log(`\n=== RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
