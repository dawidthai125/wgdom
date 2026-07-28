/**
 * FND-02a — canonicalize + validate (bez hash / Web Crypto).
 * Run: npx vite-node scripts/test-foundation-fnd-02a-canonicalize.mjs
 */
import {
  DIGEST_PREFIX_V1,
  DIGEST_HEX_LENGTH,
  DIGEST_ALGORITHM,
  DIGEST_SPEC_VERSION,
  DIGEST_MAX_DEPTH,
  DIGEST_MAX_NODES,
  FND_DIGEST_INVALID,
  FND_DIGEST_UNSUPPORTED_TYPE,
  FND_DIGEST_INVALID_NUMBER,
  FND_DIGEST_CYCLE,
  FND_DIGEST_DEPTH,
  canonicalize,
  isDigest,
  parseDigest,
  assertDigest,
  normalizeFiniteNumber,
  isPlainObject,
} from "../src/lib/wgdom-foundation/digest/index.ts";

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

function codeOf(e) {
  return e && typeof e === "object" && "code" in e ? e.code : "";
}

function throwsCode(name, fn, expectedCode) {
  try {
    fn();
    fail++;
    console.log("FAIL", name, "(no throw)");
  } catch (e) {
    assert(name, codeOf(e) === expectedCode);
  }
}

/** Synthetic wire (FND-02a — bez realnego SHA-256). */
const HEX64 = "a".repeat(DIGEST_HEX_LENGTH);
const WIRE_OK = `${DIGEST_PREFIX_V1}${HEX64}`;

console.log("=== FND-02a Canonical Digest (canonicalize + validate) ===\n");

// --- constants lock (FOUNDATION-10) ---
assert("DIGEST_PREFIX_V1", DIGEST_PREFIX_V1 === "d1_");
assert("DIGEST_HEX_LENGTH", DIGEST_HEX_LENGTH === 64);
assert("DIGEST_ALGORITHM", DIGEST_ALGORITHM === "SHA-256");
assert("DIGEST_SPEC_VERSION", DIGEST_SPEC_VERSION === 1);
assert("DIGEST_MAX_DEPTH locked", DIGEST_MAX_DEPTH === 64);
assert("DIGEST_MAX_NODES locked", DIGEST_MAX_NODES === 100_000);

// --- primitives ---
assert("canon null", canonicalize(null) === "null");
assert("canon true", canonicalize(true) === "true");
assert("canon false", canonicalize(false) === "false");
assert("canon string", canonicalize("ab") === '"ab"');
assert("canon empty string", canonicalize("") === '""');
assert("canon int", canonicalize(1) === "1");
assert("canon float", canonicalize(1.5) === "1.5");
assert("canon -0 → 0", canonicalize(-0) === "0");
assert("canon 0", canonicalize(0) === "0");
{
  const n = normalizeFiniteNumber(-0);
  assert("normalizeFiniteNumber -0", n === 0 && Object.is(n, 0) === true && Object.is(n, -0) === false);
}
assert("canon empty object", canonicalize({}) === "{}");
assert("canon empty array", canonicalize([]) === "[]");

// --- stable object ordering ---
assert(
  "stable key order",
  canonicalize({ b: 1, a: 2 }) === canonicalize({ a: 2, b: 1 }),
);
assert("stable key order shape", canonicalize({ b: 1, a: 2 }) === '{"a":2,"b":1}');
assert(
  "nested stable",
  canonicalize({ z: { b: 1, a: 2 }, y: 0 }) === '{"y":0,"z":{"a":2,"b":1}}',
);

// --- array order preserved ---
assert("array order", canonicalize([2, 1]) === "[2,1]");
assert(
  "array order sensitive",
  canonicalize([1, 2]) !== canonicalize([2, 1]),
);

// --- undefined omit in objects ---
assert(
  "omit undefined object value",
  canonicalize({ a: 1, b: undefined }) === '{"a":1}',
);
assert(
  "omit only undefined keeps others",
  canonicalize({ b: undefined, a: null }) === '{"a":null}',
);

// --- plain object / null proto ---
assert("isPlainObject {}", isPlainObject({}) === true);
assert("isPlainObject null proto", isPlainObject(Object.create(null)) === true);
assert(
  "null proto object",
  canonicalize(Object.assign(Object.create(null), { a: 1 })) === '{"a":1}',
);

// --- unicode / escape ---
assert("unicode", canonicalize("ęć") === JSON.stringify("ęć"));
assert("quote escape", canonicalize('a"b') === JSON.stringify('a"b'));

// --- reject matrix ---
throwsCode("reject root undefined", () => canonicalize(undefined), FND_DIGEST_UNSUPPORTED_TYPE);
throwsCode("reject array undefined", () => canonicalize([1, undefined]), FND_DIGEST_UNSUPPORTED_TYPE);
throwsCode("reject NaN", () => canonicalize(NaN), FND_DIGEST_INVALID_NUMBER);
throwsCode("reject Infinity", () => canonicalize(Infinity), FND_DIGEST_INVALID_NUMBER);
throwsCode("reject -Infinity", () => canonicalize(-Infinity), FND_DIGEST_INVALID_NUMBER);
throwsCode("reject Date", () => canonicalize(new Date(0)), FND_DIGEST_UNSUPPORTED_TYPE);
throwsCode("reject bigint", () => canonicalize(1n), FND_DIGEST_UNSUPPORTED_TYPE);
throwsCode("reject function", () => canonicalize(() => 1), FND_DIGEST_UNSUPPORTED_TYPE);
throwsCode("reject symbol", () => canonicalize(Symbol("x")), FND_DIGEST_UNSUPPORTED_TYPE);
throwsCode("reject Map", () => canonicalize(new Map()), FND_DIGEST_UNSUPPORTED_TYPE);
throwsCode("reject Set", () => canonicalize(new Set()), FND_DIGEST_UNSUPPORTED_TYPE);
throwsCode("reject Uint8Array", () => canonicalize(new Uint8Array([1])), FND_DIGEST_UNSUPPORTED_TYPE);
throwsCode("reject Number box", () => canonicalize(Object(1)), FND_DIGEST_UNSUPPORTED_TYPE);

{
  const a = {};
  a.self = a;
  throwsCode("reject cycle object", () => canonicalize(a), FND_DIGEST_CYCLE);
}
{
  const a = [];
  a.push(a);
  throwsCode("reject cycle array", () => canonicalize(a), FND_DIGEST_CYCLE);
}
{
  const sparse = [];
  sparse.length = 2;
  sparse[1] = 1;
  throwsCode("reject sparse array", () => canonicalize(sparse), FND_DIGEST_UNSUPPORTED_TYPE);
}

// --- depth limit ---
{
  // walk depths: 0..MAX+1 → throw when depth > MAX
  let deep = "leaf";
  for (let i = 0; i < DIGEST_MAX_DEPTH + 1; i++) {
    deep = { v: deep };
  }
  throwsCode("reject depth > 64", () => canonicalize(deep), FND_DIGEST_DEPTH);
}
{
  // leaf at depth == MAX allowed
  let deep = "leaf";
  for (let i = 0; i < DIGEST_MAX_DEPTH; i++) {
    deep = { v: deep };
  }
  let ok = false;
  try {
    const s = canonicalize(deep);
    ok = typeof s === "string" && s.includes("leaf");
  } catch {
    ok = false;
  }
  assert("depth == 64 allowed", ok);
}

// --- isDigest / parseDigest / assertDigest ---
assert("isDigest ok", isDigest(WIRE_OK) === true);
assert("isDigest empty", isDigest("") === false);
assert("isDigest missing prefix", isDigest(HEX64) === false);
assert("isDigest uppercase hex", isDigest(`${DIGEST_PREFIX_V1}${"A".repeat(64)}`) === false);
assert("isDigest short hex", isDigest(`${DIGEST_PREFIX_V1}${"a".repeat(63)}`) === false);
assert("isDigest long hex", isDigest(`${DIGEST_PREFIX_V1}${"a".repeat(65)}`) === false);
assert("isDigest null", isDigest(null) === false);
assert("isDigest number", isDigest(1) === false);

const parsed = parseDigest(WIRE_OK);
assert("parseDigest version", parsed?.version === 1);
assert("parseDigest algorithm", parsed?.algorithm === "SHA-256");
assert("parseDigest hex", parsed?.hex === HEX64);
assert("parseDigest wire", parsed?.wire === WIRE_OK);
assert("parseDigest bad", parseDigest("nope") === null);

let assertThrew = false;
let assertCode = "";
try {
  assertDigest("bad");
} catch (e) {
  assertThrew = true;
  assertCode = codeOf(e);
}
assert("assertDigest throws", assertThrew === true);
assert("assertDigest code", assertCode === FND_DIGEST_INVALID);

let assertOk = true;
try {
  assertDigest(WIRE_OK);
} catch {
  assertOk = false;
}
assert("assertDigest ok", assertOk === true);

// --- determinism smoke ---
const payload = { z: [1, { b: true, a: null }], m: "x" };
assert(
  "determinism 20x",
  Array.from({ length: 20 }, () => canonicalize(payload)).every(
    (s) => s === canonicalize(payload),
  ),
);

console.log(`\n=== RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
console.log("SUITE PASS scripts/test-foundation-fnd-02a-canonicalize.mjs");
