/**
 * FND-05b — serialize / deserialize + payloadDigest pin.
 * Run: npx vite-node scripts/test-foundation-fnd-05b-serialize.mjs
 */
import { createDigest } from "../src/lib/wgdom-foundation/digest/index.ts";
import { isFoundationError } from "../src/lib/wgdom-foundation/errors/index.ts";
import {
  EVENT_SCHEMA_VERSION,
  FND_EVENT_INVALID,
  FND_EVENT_PAYLOAD_INVALID,
  createEvent,
  isEvent,
  serializeEvent,
  deserializeEvent,
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

console.log("=== FND-05b Foundation Event (serialize + digest pin) ===\n");

assert("EVENT_SCHEMA_VERSION", EVENT_SCHEMA_VERSION === 1);

// --- roundtrip (bez payload) ---
{
  const rec = await createEvent({
    type: "FND_EVENT_EMITTED",
    source: { type: "system", id: "core" },
    subject: { type: "foundation", id: "evt-target-1" },
    meta: { source: "test", n: 1 },
    at: "2026-07-28T06:00:00.000Z",
  });
  const wire = serializeEvent(rec);
  assert("serialize schemaVersion 1", wire.schemaVersion === 1);
  assert("serialize frozen", Object.isFrozen(wire) === true);
  assert("serialize source frozen", Object.isFrozen(wire.source) === true);
  assert("no payload on wire", wire.payload === undefined);
  assert("no digest on wire", wire.payloadDigest === undefined);

  const json = JSON.parse(JSON.stringify(wire));
  const back = await deserializeEvent(json);
  assert("roundtrip isEvent", isEvent(back) === true);
  assert("roundtrip frozen", Object.isFrozen(back) === true);
  assert("roundtrip id", back.id === rec.id);
  assert("roundtrip at", back.at === rec.at);
  assert("roundtrip type", back.type === rec.type);
  assert("roundtrip source id", back.source.id === "core");
  assert(
    "roundtrip subject",
    back.subject.type === "foundation" && back.subject.id === "evt-target-1",
  );
  assert("roundtrip meta", back.meta.source === "test" && back.meta.n === 1);
}

// --- payload (normalize key order) ---
{
  const rec = await createEvent({
    type: "SNAPSHOT_SEALED",
    source: { type: "user", label: "Dawid" },
    subject: { type: "snapshot" },
    payload: { z: 1, a: { c: 3, b: 2 } },
  });
  const wire = serializeEvent(rec);
  assert("payload keys sorted", JSON.stringify(Object.keys(wire.payload)) === JSON.stringify(["a", "z"]));
  assert(
    "payload nested keys sorted",
    JSON.stringify(Object.keys(wire.payload.a)) === JSON.stringify(["b", "c"]),
  );

  const back = await deserializeEvent(JSON.parse(JSON.stringify(wire)));
  assert("payload roundtrip a.b", back.payload.a.b === 2);
  assert("payload roundtrip z", back.payload.z === 1);
  assert("payload null omit digest", back.payloadDigest === undefined);
}

// --- payloadDigest pin ---
{
  const rec = await createEvent({
    type: "OFFER_BOQ_LOCKED",
    source: { type: "service", id: "svc-1" },
    subject: { type: "offer_boq" },
    payload: { items: [{ id: "x", q: 2 }], note: "ok" },
    withPayloadDigest: true,
  });
  assert("create has digest", typeof rec.payloadDigest === "string" && rec.payloadDigest.startsWith("d1_"));

  const wire = serializeEvent(rec);
  assert("wire has digest", wire.payloadDigest === rec.payloadDigest);

  const back = await deserializeEvent(JSON.parse(JSON.stringify(wire)));
  assert("digest roundtrip equal", back.payloadDigest === rec.payloadDigest);
  assert("digest matches recomputed", back.payloadDigest === (await createDigest(back.payload)));
  assert("digest frozen record", Object.isFrozen(back) === true);
}

// --- invalid schemaVersion ---
{
  const rec = await createEvent({
    type: "X",
    source: { type: "system" },
    subject: { type: "foundation" },
  });
  const wire = serializeEvent(rec);
  const bad = { ...JSON.parse(JSON.stringify(wire)), schemaVersion: 2 };
  await throwsCode("reject schemaVersion 2", () => deserializeEvent(bad), FND_EVENT_INVALID);

  const missing = { ...JSON.parse(JSON.stringify(wire)) };
  delete missing.schemaVersion;
  await throwsCode("reject missing schemaVersion", () => deserializeEvent(missing), FND_EVENT_INVALID);
}

// --- invalid payload wire ---
{
  const rec = await createEvent({
    type: "X",
    source: { type: "system" },
    subject: { type: "foundation" },
    payload: { ok: true },
  });
  const wire = serializeEvent(rec);
  const withOversize = JSON.parse(JSON.stringify(wire));
  withOversize.payload = "x".repeat(20_000);
  await throwsCode(
    "reject oversize payload wire",
    () => deserializeEvent(withOversize),
    FND_EVENT_PAYLOAD_INVALID,
  );
}

// --- deserialize validation (shape) ---
{
  await throwsCode("reject null", () => deserializeEvent(null), FND_EVENT_INVALID);
  await throwsCode("reject array", () => deserializeEvent([]), FND_EVENT_INVALID);
  await throwsCode("reject string", () => deserializeEvent("nope"), FND_EVENT_INVALID);

  const rec = await createEvent({
    type: "X",
    source: { type: "system" },
    subject: { type: "foundation" },
  });
  const wire = serializeEvent(rec);
  const badType = { ...JSON.parse(JSON.stringify(wire)), type: "lowercase" };
  await throwsCode("reject bad type on deserialize", () => deserializeEvent(badType), FND_EVENT_INVALID);
}

// --- payloadDigest mismatch ---
{
  const rec = await createEvent({
    type: "X",
    source: { type: "system" },
    subject: { type: "foundation" },
    payload: { v: 1 },
    withPayloadDigest: true,
  });
  const wire = serializeEvent(rec);
  const tampered = JSON.parse(JSON.stringify(wire));
  tampered.payload = { v: 2 };
  await throwsCode(
    "reject digest mismatch",
    () => deserializeEvent(tampered),
    FND_EVENT_PAYLOAD_INVALID,
  );

  const wrongDigest = JSON.parse(JSON.stringify(wire));
  wrongDigest.payloadDigest = await createDigest({ other: true });
  await throwsCode(
    "reject wrong digest wire",
    () => deserializeEvent(wrongDigest),
    FND_EVENT_PAYLOAD_INVALID,
  );
}

// --- serialize rejects invalid record ---
{
  await throwsCode(
    "serialize rejects plain object",
    () =>
      serializeEvent({
        schemaVersion: 1,
        id: "fnd_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        at: "2026-07-28T06:00:00.000Z",
        type: "X",
        source: { type: "system" },
        subject: { type: "foundation" },
      }),
    FND_EVENT_INVALID,
  );
}

// --- payload: null OK ---
{
  const rec = await createEvent({
    type: "X",
    source: { type: "domain", id: "dom-1" },
    subject: { type: "foundation" },
    payload: null,
  });
  const wire = serializeEvent(rec);
  assert("serialize null payload", wire.payload === null);
  const back = await deserializeEvent(JSON.parse(JSON.stringify(wire)));
  assert("deserialize null payload", back.payload === null);
  assert("domain source roundtrip", back.source.type === "domain");
}

console.log(`\n=== RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) {
  console.error(`SUITE FAIL scripts/test-foundation-fnd-05b-serialize.mjs`);
  process.exit(1);
}
console.log(`SUITE PASS scripts/test-foundation-fnd-05b-serialize.mjs`);
