/**
 * FND-05a — createEvent + validate (bez serialize).
 * Run: npx vite-node scripts/test-foundation-fnd-05a-create.mjs
 */
import { createId } from "../src/lib/wgdom-foundation/id/index.ts";
import { isValidId } from "../src/lib/wgdom-foundation/id/index.ts";
import { isDigest } from "../src/lib/wgdom-foundation/digest/index.ts";
import { isFoundationError } from "../src/lib/wgdom-foundation/errors/index.ts";
import {
  EVENT_SPEC_VERSION,
  EVENT_SCHEMA_VERSION,
  EVENT_PAYLOAD_MAX_BYTES,
  EVENT_META_MAX_KEYS,
  FND_EVENT_INVALID,
  FND_EVENT_PAYLOAD_INVALID,
  FND_EVENT_ID_INVALID,
  createEvent,
  isEvent,
  assertEvent,
  validateEvent,
} from "../src/lib/wgdom-foundation/events/index.ts";

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

console.log("=== FND-05a Foundation Event (create + validate) ===\n");

assert("EVENT_SPEC_VERSION", EVENT_SPEC_VERSION === 1);
assert("EVENT_SCHEMA_VERSION", EVENT_SCHEMA_VERSION === 1);
assert("EVENT_PAYLOAD_MAX_BYTES", EVENT_PAYLOAD_MAX_BYTES === 16_384);
assert("EVENT_META_MAX_KEYS", EVENT_META_MAX_KEYS === 32);

// --- create defaults ---
{
  const rec = await createEvent({
    type: "FND_EVENT_EMITTED",
    source: { type: "system" },
    subject: { type: "foundation" },
  });
  assert("schemaVersion 1", rec.schemaVersion === 1);
  assert("id is event", isValidId(rec.id, "event") === true);
  assert("id starts evt_", rec.id.startsWith("evt_") === true);
  assert("at ends with Z", typeof rec.at === "string" && rec.at.endsWith("Z"));
  assert("source type", rec.source.type === "system");
  assert("type", rec.type === "FND_EVENT_EMITTED");
  assert("subject type", rec.subject.type === "foundation");
  assert("no payload by default", rec.payload === undefined);
  assert("frozen record", Object.isFrozen(rec) === true);
  assert("frozen source", Object.isFrozen(rec.source) === true);
  assert("frozen subject", Object.isFrozen(rec.subject) === true);
  assert("isEvent", isEvent(rec) === true);
}

// --- custom id / at / meta / payload / domain source ---
{
  const id = createId("event");
  const at = "2026-07-28T06:00:00.000Z";
  const rec = await createEvent({
    id,
    at,
    type: "SNAPSHOT_SEALED",
    source: { type: "domain", id: "snap-svc", label: "Snapshot" },
    subject: { type: "snapshot", id: "snap_test" },
    payload: { b: 2, a: 1 },
    meta: { source: "test", n: 1 },
  });
  assert("custom id", rec.id === id);
  assert("custom at", rec.at === at);
  assert("domain source", rec.source.type === "domain");
  assert(
    "payload normalized key order",
    JSON.stringify(rec.payload) === JSON.stringify({ a: 1, b: 2 }),
  );
  assert("meta frozen", Object.isFrozen(rec.meta) === true);
  assert("meta source", rec.meta.source === "test");
}

// --- withPayloadDigest (create only; pin = 05b) ---
{
  const rec = await createEvent({
    type: "PAYLOAD_PINNED",
    source: { type: "service", id: "svc-1" },
    subject: { type: "foundation" },
    payload: { x: true },
    withPayloadDigest: true,
  });
  assert("payloadDigest present", isDigest(rec.payloadDigest) === true);
}

await throwsCode(
  "withPayloadDigest without payload",
  () =>
    createEvent({
      type: "X",
      source: { type: "system" },
      subject: { type: "foundation" },
      withPayloadDigest: true,
    }),
  FND_EVENT_PAYLOAD_INVALID,
);

// --- id validation ---
await throwsCode(
  "reject foundation id",
  () =>
    createEvent({
      id: createId("foundation"),
      type: "X",
      source: { type: "system" },
      subject: { type: "foundation" },
    }),
  FND_EVENT_ID_INVALID,
);

await throwsCode(
  "reject snapshot id",
  () =>
    createEvent({
      id: "snap_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      type: "X",
      source: { type: "system" },
      subject: { type: "foundation" },
    }),
  FND_EVENT_ID_INVALID,
);

// --- source ---
await throwsCode(
  "reject bad source type",
  () =>
    createEvent({
      type: "X",
      source: { type: "admin" },
      subject: { type: "foundation" },
    }),
  FND_EVENT_INVALID,
);

// --- type ---
await throwsCode(
  "reject lowercase type",
  () =>
    createEvent({
      type: "sealed",
      source: { type: "system" },
      subject: { type: "foundation" },
    }),
  FND_EVENT_INVALID,
);

// --- subject ---
await throwsCode(
  "reject bad subject type",
  () =>
    createEvent({
      type: "X",
      source: { type: "system" },
      subject: { type: "OfferBoq" },
    }),
  FND_EVENT_INVALID,
);

// --- payload ---
await throwsCode(
  "reject Date payload",
  () =>
    createEvent({
      type: "X",
      source: { type: "system" },
      subject: { type: "foundation" },
      payload: new Date(0),
    }),
  FND_EVENT_PAYLOAD_INVALID,
);

await throwsCode(
  "reject oversize payload",
  () =>
    createEvent({
      type: "X",
      source: { type: "system" },
      subject: { type: "foundation" },
      payload: "x".repeat(EVENT_PAYLOAD_MAX_BYTES),
    }),
  FND_EVENT_PAYLOAD_INVALID,
);

// --- meta limits ---
await throwsCode(
  "reject meta nested",
  () =>
    createEvent({
      type: "X",
      source: { type: "system" },
      subject: { type: "foundation" },
      meta: { a: { b: 1 } },
    }),
  FND_EVENT_INVALID,
);

await throwsCode(
  "reject too many meta keys",
  () => {
    const meta = {};
    for (let i = 0; i < EVENT_META_MAX_KEYS + 1; i++) meta[`k${i}`] = i;
    return createEvent({
      type: "X",
      source: { type: "system" },
      subject: { type: "foundation" },
      meta,
    });
  },
  FND_EVENT_INVALID,
);

// --- payload null edge ---
{
  const rec = await createEvent({
    type: "X",
    source: { type: "user", label: "Dawid" },
    subject: { type: "bid" },
    payload: null,
  });
  assert("payload null OK", rec.payload === null);
}

// --- assert / validate ---
{
  const rec = await createEvent({
    type: "OK",
    source: { type: "system" },
    subject: { type: "foundation" },
  });
  let ok = true;
  try {
    assertEvent(rec);
    validateEvent(rec);
  } catch {
    ok = false;
  }
  assert("assert/validate ok", ok === true);
}

await throwsCode(
  "assert rejects plain object",
  () => {
    assertEvent({ foo: 1 });
  },
  FND_EVENT_INVALID,
);

assert("isEvent false", isEvent(null) === false);

console.log(`\n=== RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
console.log("SUITE PASS scripts/test-foundation-fnd-05a-create.mjs");
