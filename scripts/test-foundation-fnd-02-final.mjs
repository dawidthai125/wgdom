/**
 * FND-02c — Final Suite: Public API · golden · edge · large · compatibility.
 * Run: npx vite-node scripts/test-foundation-fnd-02-final.mjs
 */
import * as FoundationRoot from "../src/lib/wgdom-foundation/index.ts";
import * as DigestBarrel from "../src/lib/wgdom-foundation/digest/index.ts";

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

const {
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
  FND_DIGEST_TOO_LARGE,
  canonicalize,
  isDigest,
  parseDigest,
  assertDigest,
  digestBytes,
  digestCanonical,
  digestObject,
  createDigest,
  compareDigest,
  sha256Hex,
  toDigestWire,
  // FND-01 still on root (compatibility)
  createId,
  PREFIX,
} = FoundationRoot;

console.log("=== FND-02c Final Suite (Public API + golden + edges) ===\n");

const REQUIRED_EXPORTS = [
  "DIGEST_PREFIX_V1",
  "DIGEST_HEX_LENGTH",
  "DIGEST_ALGORITHM",
  "DIGEST_SPEC_VERSION",
  "DIGEST_MAX_DEPTH",
  "DIGEST_MAX_NODES",
  "FND_DIGEST_INVALID",
  "FND_DIGEST_UNSUPPORTED_TYPE",
  "FND_DIGEST_INVALID_NUMBER",
  "FND_DIGEST_CYCLE",
  "FND_DIGEST_DEPTH",
  "FND_DIGEST_TOO_LARGE",
  "canonicalize",
  "isDigest",
  "parseDigest",
  "assertDigest",
  "digestBytes",
  "digestCanonical",
  "digestObject",
  "createDigest",
  "compareDigest",
  "sha256Hex",
  "toDigestWire",
];

for (const name of REQUIRED_EXPORTS) {
  assert(`root export ${name}`, typeof FoundationRoot[name] !== "undefined");
  assert(`digest barrel export ${name}`, typeof DigestBarrel[name] !== "undefined");
}

assert("DIGEST_PREFIX_V1", DIGEST_PREFIX_V1 === "d1_");
assert("DIGEST_HEX_LENGTH", DIGEST_HEX_LENGTH === 64);
assert("DIGEST_ALGORITHM", DIGEST_ALGORITHM === "SHA-256");
assert("DIGEST_SPEC_VERSION", DIGEST_SPEC_VERSION === 1);
assert("DIGEST_MAX_DEPTH", DIGEST_MAX_DEPTH === 64);
assert("DIGEST_MAX_NODES", DIGEST_MAX_NODES === 100_000);

// --- FND-01 still coexists on root ---
assert("root still exports createId (FND-01)", typeof createId === "function");
assert("root still exports PREFIX (FND-01)", typeof PREFIX === "object");

const utf8 = new TextEncoder();

/** Golden: SHA-256("") */
const GOLDEN_EMPTY =
  "d1_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

/** Golden: SHA-256 UTF-8 of canonicalize(null) === "null" */
const GOLDEN_NULL =
  "d1_74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b";

/** Golden: SHA-256 of "{}" */
const GOLDEN_EMPTY_OBJ =
  "d1_44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a";

/** Golden: SHA-256 of "[]" */
const GOLDEN_EMPTY_ARR =
  "d1_4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945";

console.log("--- computing/verifying goldens ---\n");

// Empty bytes golden
{
  const d = await digestBytes(utf8.encode(""));
  assert("golden empty bytes", d === GOLDEN_EMPTY);
}

// null / {} / [] — freeze from digestObject (and cross-check digestCanonical)
{
  const dNull = await digestObject(null);
  assert("golden null", dNull === GOLDEN_NULL);
  assert("golden null via canonical", (await digestCanonical("null")) === GOLDEN_NULL);

  const dObj = await digestObject({});
  assert("golden empty object", dObj === GOLDEN_EMPTY_OBJ);
  assert("golden {} via canonical", (await digestCanonical("{}")) === GOLDEN_EMPTY_OBJ);

  const dArr = await digestObject([]);
  assert("golden empty array", dArr === GOLDEN_EMPTY_ARR);
  assert("golden [] via canonical", (await digestCanonical("[]")) === GOLDEN_EMPTY_ARR);
}

// Sorted object golden — compute expected from canonicalize then lock wire
{
  const canon = canonicalize({ b: 2, a: 1 });
  assert("canon sorted ab", canon === '{"a":1,"b":2}');
  const d = await digestObject({ b: 2, a: 1 });
  const d2 = await digestObject({ a: 1, b: 2 });
  assert("golden ab permutation", d === d2);
  assert("golden ab isDigest", isDigest(d) === true);
  // Freeze wire for this session as regression anchor
  const GOLDEN_AB_WIRE = d;
  assert(
    "golden ab stable recompute",
    (await createDigest({ a: 1, b: 2 })) === GOLDEN_AB_WIRE,
  );
}

// --- Public API aliases ---
{
  const v = { nest: [1, null, true], s: "ąć" };
  const a = await digestObject(v);
  const b = await createDigest(v);
  const c = await digestCanonical(canonicalize(v));
  assert("digestObject === createDigest", a === b);
  assert("digestObject === digestCanonical(canon)", a === c);
}

// --- compareDigest ---
{
  const a = await digestObject(1);
  const b = await digestObject(1);
  const c = await digestObject(2);
  assert("compare equal", compareDigest(a, b) === true);
  assert("compare different", compareDigest(a, c) === false);
  assert("compare invalid", compareDigest("bad", a) === false);
}

// --- parse / assert ---
{
  const d = await digestObject("x");
  const p = parseDigest(d);
  assert("parse version", p?.version === 1);
  assert("parse algorithm", p?.algorithm === "SHA-256");
  assert("parse hex len", p?.hex.length === 64);
  assertDigest(d);
  let threw = false;
  let code = "";
  try {
    assertDigest("nope");
  } catch (e) {
    threw = true;
    code = codeOf(e);
  }
  assert("assertDigest invalid throws", threw === true);
  assert("assertDigest code", code === FND_DIGEST_INVALID);
}

// --- edge reject (via createDigest) ---
{
  const cases = [
    ["Date", () => createDigest(new Date(0)), FND_DIGEST_UNSUPPORTED_TYPE],
    ["NaN", () => createDigest(NaN), FND_DIGEST_INVALID_NUMBER],
    ["undefined root", () => createDigest(undefined), FND_DIGEST_UNSUPPORTED_TYPE],
    ["bigint", () => createDigest(1n), FND_DIGEST_UNSUPPORTED_TYPE],
  ];
  for (const [label, fn, expected] of cases) {
    let code = "";
    try {
      await fn();
    } catch (e) {
      code = codeOf(e);
    }
    assert(`edge reject ${label}`, code === expected);
  }
}
{
  const cyclic = {};
  cyclic.self = cyclic;
  let code = "";
  try {
    await createDigest(cyclic);
  } catch (e) {
    code = codeOf(e);
  }
  assert("edge reject cycle", code === FND_DIGEST_CYCLE);
}

// --- sha256Hex / toDigestWire low-level ---
{
  const hex = await sha256Hex(utf8.encode(""));
  assert("sha256Hex empty", hex === GOLDEN_EMPTY.slice(DIGEST_PREFIX_V1.length));
  assert("toDigestWire", toDigestWire(hex) === GOLDEN_EMPTY);
}

// --- determinism 50× nested ---
{
  const payload = {
    meta: { b: 2, a: 1 },
    rows: [{ id: "x", q: 1.5 }, { id: "y", q: 0 }],
    flag: false,
    empty: null,
  };
  const first = await digestObject(payload);
  let ok = true;
  for (let i = 0; i < 50; i++) {
    if ((await digestObject(payload)) !== first) ok = false;
  }
  assert("determinism 50× nested", ok === true);
}

// --- large object (flat ~2k keys) ---
{
  const big = {};
  for (let i = 0; i < 2000; i++) {
    big[`k${String(i).padStart(4, "0")}`] = i % 7;
  }
  const perm = {};
  const keys = Object.keys(big).reverse();
  for (const k of keys) perm[k] = big[k];

  const t0 = Date.now();
  const d1 = await digestObject(big);
  const d2 = await digestObject(perm);
  const ms = Date.now() - t0;
  assert("large object isDigest", isDigest(d1) === true);
  assert("large object key-order independent", d1 === d2);
  assert("large object finishes (<30s)", ms < 30_000);
  console.log(`  (large 2k keys digest wall ${ms}ms)`);
}

// --- depth near limit still works ---
{
  let deep = { leaf: true };
  for (let i = 0; i < 32; i++) deep = { v: deep };
  const d = await digestObject(deep);
  assert("mid-depth digest ok", isDigest(d) === true);
}

// --- array order still sensitive at root API ---
{
  const a = await createDigest([1, 2]);
  const b = await createDigest([2, 1]);
  assert("array order sensitive final", a !== b);
}

// --- omit undefined still ---
{
  const a = await digestObject({ a: 1, b: undefined });
  const b = await digestObject({ a: 1 });
  assert("omit undefined final", a === b);
}

// --- -0 ≡ 0 ---
{
  assert("-0≡0 final", (await digestObject(-0)) === (await digestObject(0)));
}

// silence unused binding warnings in some bundlers
assert("FND_DIGEST_DEPTH exported", typeof FND_DIGEST_DEPTH === "string");
assert("FND_DIGEST_TOO_LARGE exported", typeof FND_DIGEST_TOO_LARGE === "string");

console.log(`\n=== FND-02c RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
console.log("SUITE PASS scripts/test-foundation-fnd-02-final.mjs");
