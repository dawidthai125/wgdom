/**
 * FND-04b — serialize / deserialize + payloadDigest pin.
 * Run: npx vite-node scripts/test-foundation-fnd-04b-serialize.mjs
 */
import { createDigest } from "../src/lib/wgdom-foundation/digest/index.ts";
import { isFoundationError } from "../src/lib/wgdom-foundation/errors/index.ts";
import {
  AUDIT_SCHEMA_VERSION,
  FND_AUDIT_INVALID,
  FND_AUDIT_PAYLOAD_INVALID,
  createAuditRecord,
  isAuditRecord,
  serializeAudit,
  deserializeAudit,
} from "../src/lib/wgdom-foundation/audit/index.ts";

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

console.log("=== FND-04b Foundation Audit (serialize + digest pin) ===\n");

assert("AUDIT_SCHEMA_VERSION", AUDIT_SCHEMA_VERSION === 1);

// --- roundtrip (bez payload) ---
{
  const rec = await createAuditRecord({
    actor: { type: "system", id: "core" },
    action: "FND_AUDIT_RECORD_CREATED",
    target: { type: "foundation", id: "fnd-target-1" },
    meta: { source: "test", n: 1 },
    at: "2026-07-28T05:00:00.000Z",
  });
  const wire = serializeAudit(rec);
  assert("serialize schemaVersion 1", wire.schemaVersion === 1);
  assert("serialize frozen", Object.isFrozen(wire) === true);
  assert("serialize actor frozen", Object.isFrozen(wire.actor) === true);
  assert("no payload on wire", wire.payload === undefined);
  assert("no digest on wire", wire.payloadDigest === undefined);

  const json = JSON.parse(JSON.stringify(wire));
  const back = await deserializeAudit(json);
  assert("roundtrip isAuditRecord", isAuditRecord(back) === true);
  assert("roundtrip frozen", Object.isFrozen(back) === true);
  assert("roundtrip id", back.id === rec.id);
  assert("roundtrip at", back.at === rec.at);
  assert("roundtrip action", back.action === rec.action);
  assert("roundtrip actor id", back.actor.id === "core");
  assert("roundtrip target", back.target.type === "foundation" && back.target.id === "fnd-target-1");
  assert("roundtrip meta", back.meta.source === "test" && back.meta.n === 1);
}

// --- payload (normalize key order) ---
{
  const rec = await createAuditRecord({
    actor: { type: "user", label: "Dawid" },
    action: "SNAPSHOT_SEALED",
    target: { type: "snapshot" },
    payload: { z: 1, a: { c: 3, b: 2 } },
  });
  const wire = serializeAudit(rec);
  assert("payload keys sorted", JSON.stringify(Object.keys(wire.payload)) === JSON.stringify(["a", "z"]));
  assert("payload nested keys sorted", JSON.stringify(Object.keys(wire.payload.a)) === JSON.stringify(["b", "c"]));

  const back = await deserializeAudit(JSON.parse(JSON.stringify(wire)));
  assert("payload roundtrip a.b", back.payload.a.b === 2);
  assert("payload roundtrip z", back.payload.z === 1);
  assert("payload null omit digest", back.payloadDigest === undefined);
}

// --- payloadDigest pin ---
{
  const rec = await createAuditRecord({
    actor: { type: "service", id: "svc-1" },
    action: "OFFER_BOQ_LOCKED",
    target: { type: "offer_boq" },
    payload: { items: [{ id: "x", q: 2 }], note: "ok" },
    withPayloadDigest: true,
  });
  assert("create has digest", typeof rec.payloadDigest === "string" && rec.payloadDigest.startsWith("d1_"));

  const wire = serializeAudit(rec);
  assert("wire has digest", wire.payloadDigest === rec.payloadDigest);

  const back = await deserializeAudit(JSON.parse(JSON.stringify(wire)));
  assert("digest roundtrip equal", back.payloadDigest === rec.payloadDigest);
  assert("digest matches recomputed", back.payloadDigest === (await createDigest(back.payload)));
  assert("digest frozen record", Object.isFrozen(back) === true);
}

// --- invalid schemaVersion ---
{
  const rec = await createAuditRecord({
    actor: { type: "system" },
    action: "X",
    target: { type: "foundation" },
  });
  const wire = serializeAudit(rec);
  const bad = { ...JSON.parse(JSON.stringify(wire)), schemaVersion: 2 };
  await throwsCode("reject schemaVersion 2", () => deserializeAudit(bad), FND_AUDIT_INVALID);

  const missing = { ...JSON.parse(JSON.stringify(wire)) };
  delete missing.schemaVersion;
  await throwsCode("reject missing schemaVersion", () => deserializeAudit(missing), FND_AUDIT_INVALID);
}

// --- invalid payload wire ---
{
  const rec = await createAuditRecord({
    actor: { type: "system" },
    action: "X",
    target: { type: "foundation" },
    payload: { ok: true },
  });
  const wire = serializeAudit(rec);
  const withDateLike = JSON.parse(JSON.stringify(wire));
  // Non-canonical / non-JSON-compatible after tamper: function can't survive JSON;
  // use oversize string instead.
  withDateLike.payload = "x".repeat(20_000);
  await throwsCode(
    "reject oversize payload wire",
    () => deserializeAudit(withDateLike),
    FND_AUDIT_PAYLOAD_INVALID,
  );
}

// --- deserialize validation (shape) ---
{
  await throwsCode("reject null", () => deserializeAudit(null), FND_AUDIT_INVALID);
  await throwsCode("reject array", () => deserializeAudit([]), FND_AUDIT_INVALID);
  await throwsCode("reject string", () => deserializeAudit("nope"), FND_AUDIT_INVALID);

  const rec = await createAuditRecord({
    actor: { type: "system" },
    action: "X",
    target: { type: "foundation" },
  });
  const wire = serializeAudit(rec);
  const badAction = { ...JSON.parse(JSON.stringify(wire)), action: "lowercase" };
  await throwsCode("reject bad action on deserialize", () => deserializeAudit(badAction), FND_AUDIT_INVALID);
}

// --- payloadDigest mismatch ---
{
  const rec = await createAuditRecord({
    actor: { type: "system" },
    action: "X",
    target: { type: "foundation" },
    payload: { v: 1 },
    withPayloadDigest: true,
  });
  const wire = serializeAudit(rec);
  const tampered = JSON.parse(JSON.stringify(wire));
  tampered.payload = { v: 2 };
  await throwsCode(
    "reject digest mismatch",
    () => deserializeAudit(tampered),
    FND_AUDIT_PAYLOAD_INVALID,
  );

  const wrongDigest = JSON.parse(JSON.stringify(wire));
  wrongDigest.payloadDigest = await createDigest({ other: true });
  await throwsCode(
    "reject wrong digest wire",
    () => deserializeAudit(wrongDigest),
    FND_AUDIT_PAYLOAD_INVALID,
  );
}

// --- serialize rejects invalid record ---
{
  await throwsCode(
    "serialize rejects plain object",
    () =>
      serializeAudit({
        schemaVersion: 1,
        id: "not-a-foundation-id",
        at: "2026-07-28T05:00:00.000Z",
        actor: { type: "system" },
        action: "X",
        target: { type: "foundation" },
      }),
    FND_AUDIT_INVALID,
  );
}

// --- payload: null OK ---
{
  const rec = await createAuditRecord({
    actor: { type: "system" },
    action: "X",
    target: { type: "foundation" },
    payload: null,
  });
  const wire = serializeAudit(rec);
  assert("serialize null payload", wire.payload === null);
  const back = await deserializeAudit(JSON.parse(JSON.stringify(wire)));
  assert("deserialize null payload", back.payload === null);
}

console.log(`\n=== RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) {
  console.error(`SUITE FAIL scripts/test-foundation-fnd-04b-serialize.mjs`);
  process.exit(1);
}
console.log(`SUITE PASS scripts/test-foundation-fnd-04b-serialize.mjs`);
