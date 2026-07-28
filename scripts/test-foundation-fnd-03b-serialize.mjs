/**
 * FND-03b — serialize / deserialize / cause chaining.
 * Run: npx vite-node scripts/test-foundation-fnd-03b-serialize.mjs
 */
import {
  ERROR_SCHEMA_VERSION,
  ERROR_CAUSE_MAX_DEPTH,
  FND_ERROR_INVALID,
  createError,
  isFoundationError,
  serializeError,
  deserializeError,
  errorToJSON,
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

async function throwsCode(name, fn, expected) {
  try {
    await fn();
    fail++;
    console.log("FAIL", name, "(no throw)");
  } catch (e) {
    assert(name, codeOf(e) === expected && isFoundationError(e));
  }
}

console.log("=== FND-03b Foundation Error (serialize) ===\n");

assert("ERROR_SCHEMA_VERSION", ERROR_SCHEMA_VERSION === 1);
assert("ERROR_CAUSE_MAX_DEPTH", ERROR_CAUSE_MAX_DEPTH === 8);

// --- roundtrip ---
{
  const err = createError({
    code: "FND_DIGEST_CYCLE",
    message: "dev cycle",
    category: "invariant",
    severity: "error",
    userMessage: "Wykryto cykl.",
    meta: { path: "a.b", n: 2 },
  });
  const json = serializeError(err);
  assert("schemaVersion 1", json.schemaVersion === 1);
  assert("name FoundationError", json.name === "FoundationError");
  assert("no stack default", json.stack === undefined);
  assert("code", json.code === "FND_DIGEST_CYCLE");
  assert("userMessage", json.userMessage === "Wykryto cykl.");
  assert("meta path", json.meta.path === "a.b");

  const back = deserializeError(json);
  assert("roundtrip instanceof", isFoundationError(back));
  assert("roundtrip code", back.code === err.code);
  assert("roundtrip category", back.category === err.category);
  assert("roundtrip severity", back.severity === err.severity);
  assert("roundtrip message", back.message === err.message);
  assert("roundtrip userMessage", back.userMessage === err.userMessage);
  assert("roundtrip meta", back.meta.path === "a.b" && back.meta.n === 2);
}

// --- errorToJSON ≡ serialize without stack ---
{
  const err = createError({ code: "FND_ERROR_INVALID", message: "x" });
  const a = errorToJSON(err);
  const b = serializeError(err);
  assert("errorToJSON ≡ serializeError", JSON.stringify(a) === JSON.stringify(b));
  assert("errorToJSON no stack", a.stack === undefined);
}

// --- includeStack ---
{
  const err = createError({ code: "FND_ERROR_INVALID", message: "stack me" });
  const withStack = serializeError(err, { includeStack: true });
  assert("includeStack present", typeof withStack.stack === "string" && withStack.stack.length > 0);
  const back = deserializeError(withStack);
  assert("deserialize ignores stack field", isFoundationError(back));
  // stack not restored by design
  assert("restored has runtime stack", typeof back.stack === "string");
}

// --- Foundation cause ---
{
  const root = createError({
    code: "FND_ID_INVALID",
    message: "bad id",
    category: "validation",
  });
  const child = createError({
    code: "FND_DIGEST_CYCLE",
    message: "wrapped",
    category: "invariant",
    cause: root,
  });
  const json = serializeError(child);
  assert("cause is Foundation envelope", json.cause?.name === "FoundationError");
  assert("cause code", json.cause && "code" in json.cause && json.cause.code === "FND_ID_INVALID");

  const back = deserializeError(json);
  assert("cause restored Foundation", isFoundationError(back.cause));
  assert("cause code restored", isFoundationError(back.cause) && back.cause.code === "FND_ID_INVALID");
}

// --- foreign Error ---
{
  const foreign = new Error("boom");
  foreign.name = "TypeError";
  const err = createError({
    code: "FND_ERROR_INVALID",
    message: "wrap",
    cause: foreign,
  });
  const json = serializeError(err);
  assert("foreign kind", json.cause && "kind" in json.cause && json.cause.kind === "foreign");
  assert(
    "foreign message",
    json.cause && "message" in json.cause && json.cause.message === "boom",
  );
  assert("foreign name", json.cause && "name" in json.cause && json.cause.name === "TypeError");

  const back = deserializeError(json);
  assert("foreign restored Error", back.cause instanceof Error);
  assert("foreign restored message", back.cause instanceof Error && back.cause.message === "boom");
  assert("foreign restored name", back.cause instanceof Error && back.cause.name === "TypeError");
  assert("foreign not Foundation", !isFoundationError(back.cause));
}

// --- cause depth truncate ---
{
  let chain = createError({ code: "FND_ERROR_INVALID", message: "d0" });
  for (let i = 1; i <= ERROR_CAUSE_MAX_DEPTH + 2; i++) {
    chain = createError({
      code: "FND_ERROR_INVALID",
      message: `d${i}`,
      cause: chain,
    });
  }
  const json = serializeError(chain);
  let depth = 0;
  let cur = json;
  while (cur.cause && cur.cause.name === "FoundationError") {
    depth += 1;
    cur = cur.cause;
  }
  assert("cause depth capped", depth <= ERROR_CAUSE_MAX_DEPTH);
  // Walk to find causeTruncated somewhere near leaf
  let foundTrunc = false;
  let node = json;
  for (let i = 0; i < 20; i++) {
    if (node.meta && node.meta.causeTruncated === true) foundTrunc = true;
    if (!node.cause || node.cause.name !== "FoundationError") break;
    node = node.cause;
  }
  assert("causeTruncated meta set", foundTrunc === true);
}

// --- cause cycle truncate on serialize ---
{
  const a = createError({ code: "FND_ERROR_INVALID", message: "a" });
  const b = createError({ code: "FND_ERROR_INVALID", message: "b", cause: a });
  // Runtime cycle (TS readonly nie blokuje JS):
  a.cause = b;
  const json = serializeError(b);
  const text = JSON.stringify(json);
  assert("cycle serialize finite", typeof text === "string" && text.length > 0);
  assert("cycle no blow up", text.length < 50_000);
  let foundTrunc = false;
  let node = json;
  for (let i = 0; i < 20; i++) {
    if (node.meta && node.meta.causeTruncated === true) foundTrunc = true;
    if (!node.cause || node.cause.name !== "FoundationError") break;
    node = node.cause;
  }
  assert("cycle sets causeTruncated", foundTrunc === true);
}

// --- unknown schemaVersion ---
await throwsCode(
  "unknown schemaVersion",
  () =>
    deserializeError({
      schemaVersion: 99,
      name: "FoundationError",
      code: "FND_ERROR_INVALID",
      category: "validation",
      severity: "error",
      message: "x",
      userMessage: "y",
      meta: {},
    }),
  FND_ERROR_INVALID,
);

// --- invalid payload ---
await throwsCode("invalid null", () => deserializeError(null), FND_ERROR_INVALID);
await throwsCode("invalid array", () => deserializeError([]), FND_ERROR_INVALID);
await throwsCode(
  "invalid missing fields",
  () => deserializeError({ schemaVersion: 1, name: "FoundationError" }),
  FND_ERROR_INVALID,
);
await throwsCode(
  "serialize non-Foundation",
  () => serializeError(new Error("nope")),
  FND_ERROR_INVALID,
);

console.log(`\n=== RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
console.log("SUITE PASS scripts/test-foundation-fnd-03b-serialize.mjs");
