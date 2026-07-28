/**
 * FND-02b — SHA-256 + createDigest / digestObject / compareDigest.
 * Run: npx vite-node scripts/test-foundation-fnd-02b-hash.mjs
 */
import {
  DIGEST_PREFIX_V1,
  DIGEST_HEX_LENGTH,
  canonicalize,
  isDigest,
  digestBytes,
  digestCanonical,
  digestObject,
  createDigest,
  compareDigest,
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

/** SHA-256("") — wektor NIST / empty message. */
const EMPTY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const EMPTY_WIRE = `${DIGEST_PREFIX_V1}${EMPTY_SHA256}`;

console.log("=== FND-02b Canonical Digest (hash + create) ===\n");

const utf8 = new TextEncoder();

// --- SHA-256 empty ---
{
  const d = await digestBytes(utf8.encode(""));
  assert("SHA-256 empty wire prefix", d.startsWith(DIGEST_PREFIX_V1));
  assert("SHA-256 empty hex length", d.length === DIGEST_PREFIX_V1.length + DIGEST_HEX_LENGTH);
  assert("SHA-256 empty golden", d === EMPTY_WIRE);
  assert("isDigest empty golden", isDigest(d) === true);
}

// --- digestCanonical / digestObject null ---
{
  const canonNull = canonicalize(null);
  assert("canon null string", canonNull === "null");
  const fromCanon = await digestCanonical(canonNull);
  const fromObj = await digestObject(null);
  const fromCreate = await createDigest(null);
  assert("digestCanonical isDigest", isDigest(fromCanon) === true);
  assert("digestObject === digestCanonical(null)", fromObj === fromCanon);
  assert("createDigest === digestObject", fromCreate === fromObj);
}

// --- digestBytes === digestCanonical for same utf8 ---
{
  const s = canonicalize({ a: 1, b: [true, null] });
  const a = await digestCanonical(s);
  const b = await digestBytes(utf8.encode(s));
  assert("digestBytes ≡ digestCanonical", a === b);
}

// --- wire lowercase hex only ---
{
  const d = await digestObject({ x: "test" });
  const hex = d.slice(DIGEST_PREFIX_V1.length);
  assert("hex lowercase", /^[0-9a-f]{64}$/.test(hex) === true);
}

// --- determinism 100× ---
{
  const payload = { z: [1, { b: true, a: null }], m: "x", n: -0 };
  const first = await digestObject(payload);
  let allSame = true;
  for (let i = 0; i < 100; i++) {
    if ((await digestObject(payload)) !== first) {
      allSame = false;
      break;
    }
  }
  assert("determinism 100× digestObject", allSame === true);
}

// --- key permutation ---
{
  const a = await digestObject({ b: 1, a: 2, c: { z: 9, y: 8 } });
  const b = await digestObject({ c: { y: 8, z: 9 }, a: 2, b: 1 });
  assert("key permutation same digest", a === b);
}

// --- array order sensitivity ---
{
  const a = await digestObject([1, 2, 3]);
  const b = await digestObject([3, 2, 1]);
  assert("array order different digest", a !== b);
}

// --- -0 ≡ 0 in digest ---
{
  const a = await digestObject(-0);
  const b = await digestObject(0);
  assert("-0 and 0 same digest", a === b);
}

// --- compareDigest ---
{
  const a = await digestObject({ k: 1 });
  const b = await digestObject({ k: 1 });
  const c = await digestObject({ k: 2 });
  assert("compareDigest equal", compareDigest(a, b) === true);
  assert("compareDigest different", compareDigest(a, c) === false);
  assert("compareDigest invalid a", compareDigest("nope", a) === false);
  assert("compareDigest invalid b", compareDigest(a, "nope") === false);
  assert("compareDigest both invalid", compareDigest("x", "y") === false);
  assert(
    "compareDigest uppercase hex invalid",
    compareDigest(`${DIGEST_PREFIX_V1}${"A".repeat(64)}`, a) === false,
  );
}

// --- createDigest rejects unsupported (propagate canonicalize) ---
{
  let threw = false;
  try {
    await createDigest(new Date(0));
  } catch {
    threw = true;
  }
  assert("createDigest rejects Date", threw === true);
}

console.log(`\n=== RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
console.log("SUITE PASS scripts/test-foundation-fnd-02b-hash.mjs");
