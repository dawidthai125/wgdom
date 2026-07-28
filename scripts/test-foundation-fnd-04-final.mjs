/**
 * FND-04c — Final Suite: root exports · compatibility · smoke API.
 * Run: npx vite-node scripts/test-foundation-fnd-04-final.mjs
 */
import * as FoundationRoot from "../src/lib/wgdom-foundation/index.ts";
import * as AuditBarrel from "../src/lib/wgdom-foundation/audit/index.ts";

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
  AUDIT_SPEC_VERSION,
  AUDIT_SCHEMA_VERSION,
  AUDIT_PAYLOAD_MAX_BYTES,
  AUDIT_META_MAX_KEYS,
  FND_AUDIT_INVALID,
  FND_AUDIT_PAYLOAD_INVALID,
  FND_AUDIT_ID_INVALID,
  BUILTIN_AUDIT_CODES,
  createAuditRecord,
  isAuditRecord,
  assertAuditRecord,
  validateAuditRecord,
  serializeAudit,
  deserializeAudit,
  // coexistence FND-01 / 02 / 03
  createId,
  PREFIX,
  createDigest,
  canonicalize,
  createError,
  isFoundationError,
  serializeError,
  deserializeError,
} = FoundationRoot;

console.log("=== FND-04c Final Suite (Public API + compatibility) ===\n");

const REQUIRED_EXPORTS = [
  "AUDIT_SPEC_VERSION",
  "AUDIT_SCHEMA_VERSION",
  "AUDIT_PAYLOAD_MAX_BYTES",
  "AUDIT_ACTION_MAX_LENGTH",
  "AUDIT_TARGET_TYPE_MAX",
  "AUDIT_ACTOR_ID_MAX",
  "AUDIT_ACTOR_LABEL_MAX",
  "AUDIT_TARGET_ID_MAX",
  "AUDIT_META_MAX_KEYS",
  "AUDIT_META_KEY_MAX_LENGTH",
  "AUDIT_META_STRING_MAX_LENGTH",
  "AUDIT_ACTOR_TYPES",
  "AUDIT_ACTION_RE",
  "AUDIT_TARGET_TYPE_RE",
  "FND_AUDIT_INVALID",
  "FND_AUDIT_PAYLOAD_INVALID",
  "FND_AUDIT_ID_INVALID",
  "BUILTIN_AUDIT_CODES",
  "createAuditRecord",
  "isAuditRecord",
  "assertAuditRecord",
  "validateAuditRecord",
  "validateActor",
  "validateAction",
  "validateTarget",
  "validateAuditId",
  "normalizePayload",
  "deepFreeze",
  "isIsoUtcZ",
  "serializeAudit",
  "deserializeAudit",
];

for (const name of REQUIRED_EXPORTS) {
  assert(`root export ${name}`, typeof FoundationRoot[name] !== "undefined");
  assert(`audit barrel export ${name}`, typeof AuditBarrel[name] !== "undefined");
}

assert("AUDIT_SPEC_VERSION", AUDIT_SPEC_VERSION === 1);
assert("AUDIT_SCHEMA_VERSION", AUDIT_SCHEMA_VERSION === 1);
assert("AUDIT_PAYLOAD_MAX_BYTES", AUDIT_PAYLOAD_MAX_BYTES === 16_384);
assert("AUDIT_META_MAX_KEYS", AUDIT_META_MAX_KEYS === 32);
assert("FND_AUDIT_INVALID", FND_AUDIT_INVALID === "FND_AUDIT_INVALID");
assert("FND_AUDIT_PAYLOAD_INVALID", FND_AUDIT_PAYLOAD_INVALID === "FND_AUDIT_PAYLOAD_INVALID");
assert("FND_AUDIT_ID_INVALID", FND_AUDIT_ID_INVALID === "FND_AUDIT_ID_INVALID");
assert(
  "BUILTIN_AUDIT_CODES includes FND_AUDIT_INVALID",
  Array.isArray(BUILTIN_AUDIT_CODES) && BUILTIN_AUDIT_CODES.includes(FND_AUDIT_INVALID),
);

// --- FND-01 / 02 / 03 still on root ---
assert("root createId (FND-01)", typeof createId === "function");
assert("root PREFIX (FND-01)", typeof PREFIX === "object");
assert("root createDigest (FND-02)", typeof createDigest === "function");
assert("root canonicalize (FND-02)", typeof canonicalize === "function");
assert("root createError (FND-03)", typeof createError === "function");
assert("root isFoundationError (FND-03)", typeof isFoundationError === "function");
assert("root serializeError (FND-03)", typeof serializeError === "function");
assert("root deserializeError (FND-03)", typeof deserializeError === "function");

// --- smoke create → serialize → deserialize via root ---
{
  const rec = await createAuditRecord({
    actor: { type: "system", id: "fnd-04c" },
    action: "FND_AUDIT_RECORD_CREATED",
    target: { type: "foundation" },
    payload: { step: "04c", ok: true },
    meta: { suite: "final" },
    withPayloadDigest: true,
  });
  assert("smoke isAuditRecord", isAuditRecord(rec) === true);
  assert("smoke frozen", Object.isFrozen(rec) === true);
  assert("smoke digest", typeof rec.payloadDigest === "string" && rec.payloadDigest.startsWith("d1_"));

  const wire = serializeAudit(rec);
  assert("smoke serialize schema", wire.schemaVersion === 1);
  assert("smoke serialize frozen", Object.isFrozen(wire) === true);

  const back = await deserializeAudit(JSON.parse(JSON.stringify(wire)));
  assert("smoke roundtrip id", back.id === rec.id);
  assert("smoke roundtrip digest", back.payloadDigest === rec.payloadDigest);
  assert("smoke roundtrip payload", back.payload.step === "04c" && back.payload.ok === true);
  assert("smoke roundtrip meta", back.meta.suite === "final");
  assert("smoke roundtrip frozen", Object.isFrozen(back) === true);
}

// --- assert / validate via root ---
{
  const rec = await createAuditRecord({
    actor: { type: "user" },
    action: "X",
    target: { type: "snapshot" },
  });
  let ok = true;
  try {
    assertAuditRecord(rec);
    validateAuditRecord(rec);
  } catch {
    ok = false;
  }
  assert("assert/validate ok", ok === true);
}
{
  let code = "";
  try {
    assertAuditRecord({ schemaVersion: 1 });
  } catch (e) {
    code = codeOf(e);
  }
  assert("assertAuditRecord fail", code === FND_AUDIT_INVALID || code === FND_AUDIT_ID_INVALID);
}

// --- reject non-foundation id via create (root) ---
{
  let code = "";
  try {
    await createAuditRecord({
      id: "job_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      actor: { type: "system" },
      action: "X",
      target: { type: "foundation" },
    });
  } catch (e) {
    code = codeOf(e);
  }
  assert("create rejects non-foundation id", code === FND_AUDIT_ID_INVALID);
}

// --- digest pin via root deserialize ---
{
  const rec = await createAuditRecord({
    actor: { type: "service" },
    action: "SNAPSHOT_SEALED",
    target: { type: "snapshot" },
    payload: { n: 1 },
    withPayloadDigest: true,
  });
  const wire = serializeAudit(rec);
  const tampered = JSON.parse(JSON.stringify(wire));
  tampered.payload = { n: 2 };
  let code = "";
  try {
    await deserializeAudit(tampered);
  } catch (e) {
    code = codeOf(e);
  }
  assert("digest pin via root", code === FND_AUDIT_PAYLOAD_INVALID);
}

// --- FND-03 error still roundtrips (no collision) ---
{
  const err = createError({
    code: "FND_AUDIT_INVALID",
    message: "coexist",
    category: "validation",
  });
  assert("error code audit coexist", isFoundationError(err) && err.code === "FND_AUDIT_INVALID");
  const back = deserializeError(serializeError(err));
  assert("error serialize coexist", back.code === "FND_AUDIT_INVALID");
}

console.log(`\n=== FND-04c RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
console.log("SUITE PASS scripts/test-foundation-fnd-04-final.mjs");
