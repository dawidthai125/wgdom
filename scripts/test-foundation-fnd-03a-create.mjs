/**
 * FND-03a — FoundationError create + validate (bez serialize).
 * Run: npx vite-node scripts/test-foundation-fnd-03a-create.mjs
 */
import {
  ERROR_SCHEMA_VERSION,
  ERROR_META_MAX_KEYS,
  ERROR_META_KEY_MAX_LENGTH,
  ERROR_META_STRING_MAX_LENGTH,
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
} from "../src/lib/wgdom-foundation/errors/index.ts";

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

function throwsCode(name, fn, expected) {
  try {
    fn();
    fail++;
    console.log("FAIL", name, "(no throw)");
  } catch (e) {
    assert(name, codeOf(e) === expected && isFoundationError(e));
  }
}

console.log("=== FND-03a Foundation Error (create + validate) ===\n");

assert("ERROR_SCHEMA_VERSION", ERROR_SCHEMA_VERSION === 1);
assert("META max keys", ERROR_META_MAX_KEYS === 32);
assert("META key max", ERROR_META_KEY_MAX_LENGTH === 64);
assert("META string max", ERROR_META_STRING_MAX_LENGTH === 512);
assert("builtin FND_ERROR_INVALID", FND_ERROR_INVALID === "FND_ERROR_INVALID");
assert("builtin SERIALIZE reserved", FND_ERROR_SERIALIZE_FAILED === "FND_ERROR_SERIALIZE_FAILED");

// --- isErrorCode ---
assert("isErrorCode FND_ID_INVALID", isErrorCode("FND_ID_INVALID") === true);
assert("isErrorCode FND_DIGEST_CYCLE", isErrorCode("FND_DIGEST_CYCLE") === true);
assert("isErrorCode FND_ERROR_INVALID", isErrorCode("FND_ERROR_INVALID") === true);
assert("isErrorCode reject lowercase", isErrorCode("fnd_error_invalid") === false);
assert("isErrorCode reject no area", isErrorCode("FND_") === false);
assert("isErrorCode reject single token", isErrorCode("FND_ERROR") === false);
assert("isErrorCode reject empty", isErrorCode("") === false);
assert("isErrorCode reject null", isErrorCode(null) === false);

// --- createError defaults ---
{
  const err = createError({
    code: "FND_DIGEST_CYCLE",
    message: "cycle detected",
  });
  assert("instanceof FoundationError", err instanceof FoundationError);
  assert("instanceof Error", err instanceof Error);
  assert("name FoundationError", err.name === "FoundationError");
  assert("code", err.code === "FND_DIGEST_CYCLE");
  assert("message developer", err.message === "cycle detected");
  assert("default category validation", err.category === "validation");
  assert("default severity error", err.severity === "error");
  assert("default userMessage", err.userMessage === "Wystąpił błąd. Kod: FND_DIGEST_CYCLE");
  assert("default meta empty", Object.keys(err.meta).length === 0);
  assert("isFoundationError", isFoundationError(err) === true);
}

// --- explicit fields ---
{
  const err = createError({
    code: "FND_ERROR_INVALID",
    message: "dev detail",
    category: "invariant",
    severity: "fatal",
    userMessage: "Coś poszło nie tak.",
    meta: { field: "code", n: 1, ok: true, x: null },
  });
  assert("explicit category", err.category === "invariant");
  assert("explicit severity", err.severity === "fatal");
  assert("explicit userMessage", err.userMessage === "Coś poszło nie tak.");
  assert("meta field", err.meta.field === "code");
  assert("meta n", err.meta.n === 1);
  assert("meta ok", err.meta.ok === true);
  assert("meta null", err.meta.x === null);
}

// --- cause ok (no cycle) ---
{
  const root = createError({ code: "FND_ERROR_INVALID", message: "root" });
  const child = createError({
    code: "FND_DIGEST_CYCLE",
    message: "child",
    cause: root,
  });
  assert("cause preserved", child.cause === root);
}

// --- reject bad code / message / enums ---
throwsCode(
  "reject bad code",
  () => createError({ code: "BAD", message: "x" }),
  FND_ERROR_INVALID,
);
throwsCode(
  "reject empty message",
  () => createError({ code: "FND_ERROR_INVALID", message: "" }),
  FND_ERROR_INVALID,
);
throwsCode(
  "reject bad category",
  () =>
    createError({
      code: "FND_ERROR_INVALID",
      message: "x",
      category: "nope",
    }),
  FND_ERROR_INVALID,
);
throwsCode(
  "reject bad severity",
  () =>
    createError({
      code: "FND_ERROR_INVALID",
      message: "x",
      severity: "info",
    }),
  FND_ERROR_INVALID,
);
throwsCode(
  "reject empty userMessage",
  () =>
    createError({
      code: "FND_ERROR_INVALID",
      message: "x",
      userMessage: "",
    }),
  FND_ERROR_INVALID,
);

// --- metadata validation ---
throwsCode(
  "reject meta nested",
  () =>
    createError({
      code: "FND_ERROR_INVALID",
      message: "x",
      meta: { a: { b: 1 } },
    }),
  FND_ERROR_META_INVALID,
);
throwsCode(
  "reject meta undefined value",
  () =>
    createError({
      code: "FND_ERROR_INVALID",
      message: "x",
      meta: { a: undefined },
    }),
  FND_ERROR_META_INVALID,
);
throwsCode(
  "reject meta NaN",
  () =>
    createError({
      code: "FND_ERROR_INVALID",
      message: "x",
      meta: { a: NaN },
    }),
  FND_ERROR_META_INVALID,
);
throwsCode(
  "reject meta too many keys",
  () => {
    const meta = {};
    for (let i = 0; i < ERROR_META_MAX_KEYS + 1; i++) meta[`k${i}`] = i;
    createError({ code: "FND_ERROR_INVALID", message: "x", meta });
  },
  FND_ERROR_META_INVALID,
);
throwsCode(
  "reject meta key too long",
  () =>
    createError({
      code: "FND_ERROR_INVALID",
      message: "x",
      meta: { ["k".repeat(ERROR_META_KEY_MAX_LENGTH + 1)]: 1 },
    }),
  FND_ERROR_META_INVALID,
);
throwsCode(
  "reject meta string too long",
  () =>
    createError({
      code: "FND_ERROR_INVALID",
      message: "x",
      meta: { s: "x".repeat(ERROR_META_STRING_MAX_LENGTH + 1) },
    }),
  FND_ERROR_META_INVALID,
);

// --- cause cycle (foreign Error self-cause) ---
throwsCode(
  "reject foreign Error self-cause cycle",
  () => {
    const foreign = new Error("f");
    foreign.cause = foreign;
    createError({ code: "FND_ERROR_INVALID", message: "x", cause: foreign });
  },
  FND_ERROR_CAUSE_CYCLE,
);

// --- throwError ---
throwsCode(
  "throwError throws FoundationError",
  () => throwError({ code: "FND_DIGEST_DEPTH", message: "too deep" }),
  "FND_DIGEST_DEPTH",
);

// --- isFoundationError ---
assert("isFoundationError plain Error", isFoundationError(new Error("x")) === false);
assert("isFoundationError null", isFoundationError(null) === false);
assert("isFoundationError duck", isFoundationError({ code: "FND_ERROR_INVALID" }) === false);

// --- assertFoundationError ---
{
  const err = createError({ code: "FND_ERROR_INVALID", message: "ok" });
  let ok = true;
  try {
    assertFoundationError(err);
  } catch {
    ok = false;
  }
  assert("assertFoundationError ok", ok === true);
}
throwsCode(
  "assertFoundationError throws",
  () => assertFoundationError(new Error("nope")),
  FND_ERROR_INVALID,
);

// --- getErrorCode ---
{
  const err = createError({ code: "FND_DIGEST_CYCLE", message: "c" });
  assert("getErrorCode FoundationError", getErrorCode(err) === "FND_DIGEST_CYCLE");
  assert(
    "getErrorCode duck FND_ID_INVALID",
    getErrorCode({ code: "FND_ID_INVALID" }) === "FND_ID_INVALID",
  );
  assert(
    "getErrorCode duck digest",
    getErrorCode({ code: "FND_DIGEST_CYCLE", message: "x" }) === "FND_DIGEST_CYCLE",
  );
  assert("getErrorCode reject bad duck", getErrorCode({ code: "NOPE" }) === null);
  assert("getErrorCode plain Error", getErrorCode(new Error("x")) === null);
  assert("getErrorCode null", getErrorCode(null) === null);
}

console.log(`\n=== RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
console.log("SUITE PASS scripts/test-foundation-fnd-03a-create.mjs");
