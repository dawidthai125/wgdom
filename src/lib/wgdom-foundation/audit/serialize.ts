/**
 * FND-04b — serializeAudit / deserializeAudit + payloadDigest pin (FOUNDATION-23).
 * Bez zmian createAuditRecord / validateAuditRecord.
 */

import { compareDigest } from "../digest/compare";
import { createDigest } from "../digest/create";
import type { DigestV1 } from "../digest/types";
import { createError } from "../errors/create";
import { FND_AUDIT_INVALID, FND_AUDIT_PAYLOAD_INVALID } from "./codes";
import type { AuditRecordV1 } from "./types";
import { AUDIT_SCHEMA_VERSION } from "./types";
import {
  deepFreeze,
  normalizeAndCheckMeta,
  normalizePayload,
  validateAction,
  validateActor,
  validateAuditId,
  validateAuditRecord,
  validateTarget,
} from "./validate";

/** Wire envelope = AuditRecordV1 (schemaVersion: 1). */
export type SerializedAuditV1 = AuditRecordV1;

/**
 * Serializuje rekord do JSON-safe envelope.
 * Payload → wynik JSON.parse(canonicalize). Output frozen.
 */
export function serializeAudit(record: AuditRecordV1): SerializedAuditV1 {
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    throw createError({
      code: FND_AUDIT_INVALID,
      message: "serializeAudit requires AuditRecordV1",
      category: "validation",
    });
  }

  try {
    validateAuditRecord(record);
  } catch (e) {
    throw createError({
      code: FND_AUDIT_INVALID,
      message: "serializeAudit requires a valid AuditRecordV1",
      category: "validation",
      cause: e,
    });
  }

  const out: AuditRecordV1 = {
    schemaVersion: AUDIT_SCHEMA_VERSION,
    id: validateAuditId(record.id) as AuditRecordV1["id"],
    at: record.at,
    actor: validateActor(record.actor),
    action: validateAction(record.action),
    target: validateTarget(record.target),
  };

  if (record.payload !== undefined) {
    out.payload = normalizePayload(record.payload);
  }
  if (record.meta !== undefined) {
    out.meta = normalizeAndCheckMeta(record.meta);
  }
  if (record.payloadDigest !== undefined) {
    out.payloadDigest = record.payloadDigest;
  }

  return deepFreeze(out);
}

/**
 * Deserializuje wire → frozen AuditRecordV1.
 * Gdy payloadDigest obecny — pin FND-02: createDigest(payload) musi się zgadzać.
 * async: Web Crypto (jak createAuditRecord).
 */
export async function deserializeAudit(value: unknown): Promise<AuditRecordV1> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw createError({
      code: FND_AUDIT_INVALID,
      message: "deserializeAudit expects an object",
      category: "validation",
    });
  }

  const o = value as Record<string, unknown>;

  if (o.schemaVersion !== AUDIT_SCHEMA_VERSION) {
    throw createError({
      code: FND_AUDIT_INVALID,
      message: `Unsupported audit schemaVersion: ${String(o.schemaVersion)}`,
      category: "validation",
      meta: {
        schemaVersion: typeof o.schemaVersion === "number" ? o.schemaVersion : null,
      },
    });
  }

  validateAuditRecord(value);

  const out: AuditRecordV1 = {
    schemaVersion: AUDIT_SCHEMA_VERSION,
    id: validateAuditId(o.id) as AuditRecordV1["id"],
    at: o.at as string,
    actor: validateActor(o.actor),
    action: validateAction(o.action),
    target: validateTarget(o.target),
  };

  if (o.payload !== undefined) {
    out.payload = normalizePayload(o.payload);
  }
  if (o.meta !== undefined) {
    out.meta = normalizeAndCheckMeta(o.meta);
  }

  if (o.payloadDigest !== undefined) {
    const wireDigest = o.payloadDigest as DigestV1;
    if (out.payload === undefined) {
      throw createError({
        code: FND_AUDIT_PAYLOAD_INVALID,
        message: "payloadDigest requires payload",
        category: "validation",
      });
    }
    const expected = await createDigest(out.payload);
    if (!compareDigest(wireDigest, expected)) {
      throw createError({
        code: FND_AUDIT_PAYLOAD_INVALID,
        message: "payloadDigest does not match payload",
        category: "validation",
      });
    }
    out.payloadDigest = wireDigest;
  }

  return deepFreeze(out);
}
