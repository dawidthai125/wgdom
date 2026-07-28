/**
 * FND-03c — Final Suite: root exports · compatibility · smoke API.
 * Run: npx vite-node scripts/test-foundation-fnd-03-final.mjs
 */
import * as FoundationRoot from "../src/lib/wgdom-foundation/index.ts";
import * as ErrorsBarrel from "../src/lib/wgdom-foundation/errors/index.ts";

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
  ERROR_SCHEMA_VERSION,
  ERROR_CAUSE_MAX_DEPTH,
  ERROR_META_MAX_KEYS,
  FND_ERROR_INVALID,
  FND_ERROR_META_INVALID,
  FND_ERROR_CAUSE_CYCLE,
  FND_ERROR_SERIALIZE_FAILED,
  isErrorCode,
  FoundationError,
  createError,
  throwError,
  isFoundationError,
  assertFoundationError,
  getErrorCode,
  serializeError,
  deserializeError,
  errorToJSON,
  // coexistence
  createId,
  PREFIX,
  createDigest,
  canonicalize,
} = FoundationRoot;

console.log("=== FND-03c Final Suite (Public API + compatibility) ===\n");

const REQUIRED_EXPORTS = [
  "ERROR_SCHEMA_VERSION",
  "ERROR_CAUSE_MAX_DEPTH",
  "ERROR_META_MAX_KEYS",
  "ERROR_META_KEY_MAX_LENGTH",
  "ERROR_META_STRING_MAX_LENGTH",
  "ERROR_CATEGORIES",
  "ERROR_SEVERITIES",
  "ERROR_CODE_RE",
  "FND_ERROR_INVALID",
  "FND_ERROR_META_INVALID",
  "FND_ERROR_CAUSE_CYCLE",
  "FND_ERROR_SERIALIZE_FAILED",
  "BUILTIN_ERROR_CODES",
  "isErrorCode",
  "FoundationError",
  "createError",
  "throwError",
  "isFoundationError",
  "assertFoundationError",
  "getErrorCode",
  "serializeError",
  "deserializeError",
  "errorToJSON",
];

for (const name of REQUIRED_EXPORTS) {
  assert(`root export ${name}`, typeof FoundationRoot[name] !== "undefined");
  assert(`errors barrel export ${name}`, typeof ErrorsBarrel[name] !== "undefined");
}

assert("ERROR_SCHEMA_VERSION", ERROR_SCHEMA_VERSION === 1);
assert("ERROR_CAUSE_MAX_DEPTH", ERROR_CAUSE_MAX_DEPTH === 8);
assert("ERROR_META_MAX_KEYS", ERROR_META_MAX_KEYS === 32);
assert("FND_ERROR_INVALID", FND_ERROR_INVALID === "FND_ERROR_INVALID");
assert("FND_ERROR_SERIALIZE_FAILED reserved", FND_ERROR_SERIALIZE_FAILED === "FND_ERROR_SERIALIZE_FAILED");

// --- FND-01 / FND-02 still on root ---
assert("root createId (FND-01)", typeof createId === "function");
assert("root PREFIX (FND-01)", typeof PREFIX === "object");
assert("root createDigest (FND-02)", typeof createDigest === "function");
assert("root canonicalize (FND-02)", typeof canonicalize === "function");

// --- smoke create → serialize → deserialize via root ---
{
  const err = createError({
    code: "FND_DIGEST_CYCLE",
    message: "final smoke",
    category: "invariant",
    meta: { step: "03c" },
  });
  assert("smoke instanceof", err instanceof FoundationError);
  assert("smoke isFoundationError", isFoundationError(err) === true);
  assert("smoke getErrorCode", getErrorCode(err) === "FND_DIGEST_CYCLE");

  const json = serializeError(err);
  assert("smoke no stack", json.stack === undefined);
  assert("smoke schema", json.schemaVersion === 1);

  const back = deserializeError(json);
  assert("smoke roundtrip code", back.code === "FND_DIGEST_CYCLE");
  assert("smoke roundtrip meta", back.meta.step === "03c");

  const viaJson = errorToJSON(err);
  assert("smoke errorToJSON", viaJson.code === err.code && viaJson.stack === undefined);
}

// --- getErrorCode duck (legacy bridge, no migration) ---
assert(
  "getErrorCode duck FND_ID_INVALID",
  getErrorCode({ code: "FND_ID_INVALID" }) === "FND_ID_INVALID",
);
assert("isErrorCode FND_DIGEST_DEPTH", isErrorCode("FND_DIGEST_DEPTH") === true);

// --- assert / throw via root ---
{
  let ok = true;
  try {
    assertFoundationError(createError({ code: "FND_ERROR_INVALID", message: "ok" }));
  } catch {
    ok = false;
  }
  assert("assertFoundationError ok", ok === true);
}
{
  let code = "";
  try {
    assertFoundationError(new Error("x"));
  } catch (e) {
    code = codeOf(e);
  }
  assert("assertFoundationError fail", code === FND_ERROR_INVALID);
}
{
  let code = "";
  try {
    throwError({ code: "FND_ERROR_META_INVALID", message: "meta" });
  } catch (e) {
    code = codeOf(e);
  }
  assert("throwError via root", code === FND_ERROR_META_INVALID);
}

// --- cause + foreign via root serialize ---
{
  const foreign = new Error("foreign");
  foreign.name = "RangeError";
  const wrapped = createError({
    code: "FND_ERROR_INVALID",
    message: "wrap",
    cause: foreign,
  });
  const json = serializeError(wrapped);
  assert("foreign cause kind", json.cause && json.cause.kind === "foreign");
  const back = deserializeError(json);
  assert("foreign restored", back.cause instanceof Error && back.cause.name === "RangeError");
}

// --- nested Foundation cause ---
{
  const rootErr = createError({ code: "FND_ID_INVALID", message: "id" });
  const child = createError({
    code: "FND_ERROR_CAUSE_CYCLE",
    message: "note: not a cycle, just code reuse",
    cause: rootErr,
  });
  const back = deserializeError(serializeError(child));
  assert("nested cause Foundation", isFoundationError(back.cause));
  assert(
    "nested cause code",
    isFoundationError(back.cause) && back.cause.code === "FND_ID_INVALID",
  );
}

// silence unused
assert("FND_ERROR_CAUSE_CYCLE exported", FND_ERROR_CAUSE_CYCLE === "FND_ERROR_CAUSE_CYCLE");

console.log(`\n=== FND-03c RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
console.log("SUITE PASS scripts/test-foundation-fnd-03-final.mjs");
