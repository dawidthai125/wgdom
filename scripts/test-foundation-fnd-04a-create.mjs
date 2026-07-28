/**
 * FND-04a — createAuditRecord + validate (bez serialize).
 * Run: npx vite-node scripts/test-foundation-fnd-04a-create.mjs
 */
import { createId } from "../src/lib/wgdom-foundation/id/index.ts";
import { isValidId } from "../src/lib/wgdom-foundation/id/index.ts";
import { isDigest } from "../src/lib/wgdom-foundation/digest/index.ts";
import { isFoundationError } from "../src/lib/wgdom-foundation/errors/index.ts";
import {
  AUDIT_SCHEMA_VERSION,
  AUDIT_PAYLOAD_MAX_BYTES,
  AUDIT_META_MAX_KEYS,
  FND_AUDIT_INVALID,
  FND_AUDIT_PAYLOAD_INVALID,
  FND_AUDIT_ID_INVALID,
  createAuditRecord,
  isAuditRecord,
  assertAuditRecord,
  validateAuditRecord,
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

console.log("=== FND-04a Foundation Audit (create + validate) ===\n");

assert("AUDIT_SCHEMA_VERSION", AUDIT_SCHEMA_VERSION === 1);
assert("AUDIT_PAYLOAD_MAX_BYTES", AUDIT_PAYLOAD_MAX_BYTES === 16_384);
assert("AUDIT_META_MAX_KEYS", AUDIT_META_MAX_KEYS === 32);

// --- create defaults ---
{
  const rec = await createAuditRecord({
    actor: { type: "system" },
    action: "FND_AUDIT_RECORD_CREATED",
    target: { type: "foundation" },
  });
  assert("schemaVersion 1", rec.schemaVersion === 1);
  assert("id is foundation", isValidId(rec.id, "foundation") === true);
  assert("at ends with Z", typeof rec.at === "string" && rec.at.endsWith("Z"));
  assert("actor type", rec.actor.type === "system");
  assert("action", rec.action === "FND_AUDIT_RECORD_CREATED");
  assert("target type", rec.target.type === "foundation");
  assert("no payload by default", rec.payload === undefined);
  assert("frozen record", Object.isFrozen(rec) === true);
  assert("frozen actor", Object.isFrozen(rec.actor) === true);
  assert("frozen target", Object.isFrozen(rec.target) === true);
  assert("isAuditRecord", isAuditRecord(rec) === true);
}

// --- custom id / at / meta / payload ---
{
  const id = createId("foundation");
  const at = "2026-07-28T05:00:00.000Z";
  const rec = await createAuditRecord({
    id,
    at,
    actor: { type: "user", id: "dawid", label: "Dawid" },
    action: "SNAPSHOT_SEALED",
    target: { type: "snapshot", id: "snap_test" },
    payload: { b: 2, a: 1 },
    meta: { source: "test", n: 1 },
  });
  assert("custom id", rec.id === id);
  assert("custom at", rec.at === at);
  assert("payload normalized key order", JSON.stringify(rec.payload) === JSON.stringify({ a: 1, b: 2 }));
  assert("meta frozen", Object.isFrozen(rec.meta) === true);
  assert("meta source", rec.meta.source === "test");
}

// --- withPayloadDigest ---
{
  const rec = await createAuditRecord({
    actor: { type: "service", id: "svc-1" },
    action: "PAYLOAD_PINNED",
    target: { type: "foundation" },
    payload: { x: true },
    withPayloadDigest: true,
  });
  assert("payloadDigest present", isDigest(rec.payloadDigest) === true);
}

await throwsCode(
  "withPayloadDigest without payload",
  () =>
    createAuditRecord({
      actor: { type: "system" },
      action: "X",
      target: { type: "foundation" },
      withPayloadDigest: true,
    }),
  FND_AUDIT_PAYLOAD_INVALID,
);

// --- id validation ---
await throwsCode(
  "reject non-foundation id",
  () =>
    createAuditRecord({
      id: "snap_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      actor: { type: "system" },
      action: "X",
      target: { type: "foundation" },
    }),
  FND_AUDIT_ID_INVALID,
);

// --- actor ---
await throwsCode(
  "reject bad actor type",
  () =>
    createAuditRecord({
      actor: { type: "admin" },
      action: "X",
      target: { type: "foundation" },
    }),
  FND_AUDIT_INVALID,
);

// --- action ---
await throwsCode(
  "reject lowercase action",
  () =>
    createAuditRecord({
      actor: { type: "system" },
      action: "sealed",
      target: { type: "foundation" },
    }),
  FND_AUDIT_INVALID,
);

// --- target ---
await throwsCode(
  "reject bad target type",
  () =>
    createAuditRecord({
      actor: { type: "system" },
      action: "X",
      target: { type: "OfferBoq" },
    }),
  FND_AUDIT_INVALID,
);

// --- payload ---
await throwsCode(
  "reject Date payload",
  () =>
    createAuditRecord({
      actor: { type: "system" },
      action: "X",
      target: { type: "foundation" },
      payload: new Date(0),
    }),
  FND_AUDIT_PAYLOAD_INVALID,
);

await throwsCode(
  "reject oversize payload",
  () =>
    createAuditRecord({
      actor: { type: "system" },
      action: "X",
      target: { type: "foundation" },
      payload: "x".repeat(AUDIT_PAYLOAD_MAX_BYTES),
    }),
  FND_AUDIT_PAYLOAD_INVALID,
);

// --- meta limits ---
await throwsCode(
  "reject meta nested",
  () =>
    createAuditRecord({
      actor: { type: "system" },
      action: "X",
      target: { type: "foundation" },
      meta: { a: { b: 1 } },
    }),
  FND_AUDIT_INVALID,
);

await throwsCode(
  "reject too many meta keys",
  () => {
    const meta = {};
    for (let i = 0; i < AUDIT_META_MAX_KEYS + 1; i++) meta[`k${i}`] = i;
    return createAuditRecord({
      actor: { type: "system" },
      action: "X",
      target: { type: "foundation" },
      meta,
    });
  },
  FND_AUDIT_INVALID,
);

// --- assert / validate ---
{
  const rec = await createAuditRecord({
    actor: { type: "system" },
    action: "OK",
    target: { type: "foundation" },
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

await throwsCode(
  "assert rejects plain object",
  () => {
    assertAuditRecord({ foo: 1 });
  },
  FND_AUDIT_INVALID,
);

assert("isAuditRecord false", isAuditRecord(null) === false);

console.log(`\n=== RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
console.log("SUITE PASS scripts/test-foundation-fnd-04a-create.mjs");
