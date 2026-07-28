/**
 * FND-05c — Final Suite: root exports · compatibility · smoke API · coexistence.
 * Run: npx vite-node scripts/test-foundation-fnd-05-final.mjs
 */
import * as FoundationRoot from "../src/lib/wgdom-foundation/index.ts";
import * as EventsBarrel from "../src/lib/wgdom-foundation/events/index.ts";

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
  EVENT_SPEC_VERSION,
  EVENT_SCHEMA_VERSION,
  EVENT_PAYLOAD_MAX_BYTES,
  EVENT_META_MAX_KEYS,
  FND_EVENT_INVALID,
  FND_EVENT_PAYLOAD_INVALID,
  FND_EVENT_ID_INVALID,
  BUILTIN_EVENT_CODES,
  createEvent,
  isEvent,
  assertEvent,
  validateEvent,
  serializeEvent,
  deserializeEvent,
  // coexistence FND-01 / 02 / 03 / 04
  createId,
  PREFIX,
  createDigest,
  canonicalize,
  createError,
  isFoundationError,
  serializeError,
  deserializeError,
  createAuditRecord,
  isAuditRecord,
  serializeAudit,
  deserializeAudit,
  FND_AUDIT_INVALID,
} = FoundationRoot;

console.log("=== FND-05c Final Suite (Public API + compatibility) ===\n");

const REQUIRED_EXPORTS = [
  "EVENT_SPEC_VERSION",
  "EVENT_SCHEMA_VERSION",
  "EVENT_PAYLOAD_MAX_BYTES",
  "EVENT_TYPE_MAX_LENGTH",
  "EVENT_SUBJECT_TYPE_MAX",
  "EVENT_SOURCE_ID_MAX",
  "EVENT_SOURCE_LABEL_MAX",
  "EVENT_SUBJECT_ID_MAX",
  "EVENT_META_MAX_KEYS",
  "EVENT_META_KEY_MAX_LENGTH",
  "EVENT_META_STRING_MAX_LENGTH",
  "EVENT_SOURCE_TYPES",
  "EVENT_TYPE_RE",
  "EVENT_SUBJECT_TYPE_RE",
  "FND_EVENT_INVALID",
  "FND_EVENT_PAYLOAD_INVALID",
  "FND_EVENT_ID_INVALID",
  "BUILTIN_EVENT_CODES",
  "createEvent",
  "isEvent",
  "assertEvent",
  "validateEvent",
  "validateSource",
  "validateEventType",
  "validateSubject",
  "validateEventId",
  "normalizePayload",
  "deepFreeze",
  "isIsoUtcZ",
  "serializeEvent",
  "deserializeEvent",
];

for (const name of REQUIRED_EXPORTS) {
  assert(`root export ${name}`, typeof FoundationRoot[name] !== "undefined");
  assert(`events barrel export ${name}`, typeof EventsBarrel[name] !== "undefined");
}

assert("EVENT_SPEC_VERSION", EVENT_SPEC_VERSION === 1);
assert("EVENT_SCHEMA_VERSION", EVENT_SCHEMA_VERSION === 1);
assert("EVENT_PAYLOAD_MAX_BYTES", EVENT_PAYLOAD_MAX_BYTES === 16_384);
assert("EVENT_META_MAX_KEYS", EVENT_META_MAX_KEYS === 32);
assert("FND_EVENT_INVALID", FND_EVENT_INVALID === "FND_EVENT_INVALID");
assert("FND_EVENT_PAYLOAD_INVALID", FND_EVENT_PAYLOAD_INVALID === "FND_EVENT_PAYLOAD_INVALID");
assert("FND_EVENT_ID_INVALID", FND_EVENT_ID_INVALID === "FND_EVENT_ID_INVALID");
assert(
  "BUILTIN_EVENT_CODES includes FND_EVENT_INVALID",
  Array.isArray(BUILTIN_EVENT_CODES) && BUILTIN_EVENT_CODES.includes(FND_EVENT_INVALID),
);

// --- FND-01 / 02 / 03 / 04 still on root ---
assert("root createId (FND-01)", typeof createId === "function");
assert("root PREFIX (FND-01)", typeof PREFIX === "object");
assert("root PREFIX.event", PREFIX.event === "evt_");
assert("root createDigest (FND-02)", typeof createDigest === "function");
assert("root canonicalize (FND-02)", typeof canonicalize === "function");
assert("root createError (FND-03)", typeof createError === "function");
assert("root isFoundationError (FND-03)", typeof isFoundationError === "function");
assert("root serializeError (FND-03)", typeof serializeError === "function");
assert("root deserializeError (FND-03)", typeof deserializeError === "function");
assert("root createAuditRecord (FND-04)", typeof createAuditRecord === "function");
assert("root isAuditRecord (FND-04)", typeof isAuditRecord === "function");
assert("root serializeAudit (FND-04)", typeof serializeAudit === "function");
assert("root deserializeAudit (FND-04)", typeof deserializeAudit === "function");

// --- no name collision: Audit vs Event APIs distinct ---
assert("createEvent ≠ createAuditRecord", createEvent !== createAuditRecord);
assert("isEvent ≠ isAuditRecord", isEvent !== isAuditRecord);
assert("serializeEvent ≠ serializeAudit", serializeEvent !== serializeAudit);
assert("FND_EVENT_INVALID ≠ FND_AUDIT_INVALID", FND_EVENT_INVALID !== FND_AUDIT_INVALID);

// --- smoke create → serialize → deserialize via root ---
{
  const rec = await createEvent({
    type: "FND_EVENT_EMITTED",
    source: { type: "system", id: "fnd-05c" },
    subject: { type: "foundation" },
    payload: { step: "05c", ok: true },
    meta: { suite: "final" },
    withPayloadDigest: true,
  });
  assert("smoke isEvent", isEvent(rec) === true);
  assert("smoke frozen", Object.isFrozen(rec) === true);
  assert("smoke evt_ id", rec.id.startsWith("evt_") === true);
  assert("smoke digest", typeof rec.payloadDigest === "string" && rec.payloadDigest.startsWith("d1_"));

  const wire = serializeEvent(rec);
  assert("smoke serialize schema", wire.schemaVersion === 1);
  assert("smoke serialize frozen", Object.isFrozen(wire) === true);

  const back = await deserializeEvent(JSON.parse(JSON.stringify(wire)));
  assert("smoke roundtrip id", back.id === rec.id);
  assert("smoke roundtrip digest", back.payloadDigest === rec.payloadDigest);
  assert("smoke roundtrip payload", back.payload.step === "05c" && back.payload.ok === true);
  assert("smoke roundtrip meta", back.meta.suite === "final");
  assert("smoke roundtrip frozen", Object.isFrozen(back) === true);
}

// --- assert / validate via root ---
{
  const rec = await createEvent({
    type: "X",
    source: { type: "user" },
    subject: { type: "snapshot" },
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
{
  let code = "";
  try {
    assertEvent({ schemaVersion: 1 });
  } catch (e) {
    code = codeOf(e);
  }
  assert("assertEvent fail", code === FND_EVENT_INVALID || code === FND_EVENT_ID_INVALID);
}

// --- reject non-event id via create (root) ---
{
  let code = "";
  try {
    await createEvent({
      id: createId("foundation"),
      type: "X",
      source: { type: "system" },
      subject: { type: "foundation" },
    });
  } catch (e) {
    code = codeOf(e);
  }
  assert("create rejects non-event id", code === FND_EVENT_ID_INVALID);
}

// --- digest pin via root deserialize ---
{
  const rec = await createEvent({
    type: "SNAPSHOT_SEALED",
    source: { type: "domain", id: "snap" },
    subject: { type: "snapshot" },
    payload: { n: 1 },
    withPayloadDigest: true,
  });
  const wire = serializeEvent(rec);
  const tampered = JSON.parse(JSON.stringify(wire));
  tampered.payload = { n: 2 };
  let code = "";
  try {
    await deserializeEvent(tampered);
  } catch (e) {
    code = codeOf(e);
  }
  assert("digest pin via root", code === FND_EVENT_PAYLOAD_INVALID);
}

// --- Audit still works via root (coexistence) ---
{
  const audit = await createAuditRecord({
    actor: { type: "system" },
    action: "X",
    target: { type: "foundation" },
    payload: { from: "05c" },
  });
  assert("audit coexist isAuditRecord", isAuditRecord(audit) === true);
  assert("audit coexist not isEvent", isEvent(audit) === false);
  const back = await deserializeAudit(serializeAudit(audit));
  assert("audit coexist roundtrip", back.payload.from === "05c");
}

// --- FND-03 error with FND_EVENT_* code ---
{
  const err = createError({
    code: "FND_EVENT_INVALID",
    message: "coexist",
    category: "validation",
  });
  assert("error code event coexist", isFoundationError(err) && err.code === "FND_EVENT_INVALID");
  const back = deserializeError(serializeError(err));
  assert("error serialize event coexist", back.code === "FND_EVENT_INVALID");
}

console.log(`\n=== FND-05c RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
console.log("SUITE PASS scripts/test-foundation-fnd-05-final.mjs");
