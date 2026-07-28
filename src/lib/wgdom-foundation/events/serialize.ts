/**
 * FND-05b — serializeEvent / deserializeEvent + payloadDigest pin (FOUNDATION-31).
 * Bez zmian createEvent / validateEvent.
 */

import { compareDigest } from "../digest/compare";
import { createDigest } from "../digest/create";
import type { DigestV1 } from "../digest/types";
import { createError } from "../errors/create";
import { FND_EVENT_INVALID, FND_EVENT_PAYLOAD_INVALID } from "./codes";
import type { EventRecordV1 } from "./types";
import { EVENT_SCHEMA_VERSION } from "./types";
import {
  deepFreeze,
  normalizeAndCheckMeta,
  normalizePayload,
  validateEvent,
  validateEventId,
  validateEventType,
  validateSource,
  validateSubject,
} from "./validate";

/** Wire envelope = EventRecordV1 (schemaVersion: 1). */
export type SerializedEventV1 = EventRecordV1;

/**
 * Serializuje rekord do JSON-safe envelope.
 * Payload → wynik JSON.parse(canonicalize). Output frozen.
 */
export function serializeEvent(record: EventRecordV1): SerializedEventV1 {
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    throw createError({
      code: FND_EVENT_INVALID,
      message: "serializeEvent requires EventRecordV1",
      category: "validation",
    });
  }

  try {
    validateEvent(record);
  } catch (e) {
    throw createError({
      code: FND_EVENT_INVALID,
      message: "serializeEvent requires a valid EventRecordV1",
      category: "validation",
      cause: e,
    });
  }

  const out: EventRecordV1 = {
    schemaVersion: EVENT_SCHEMA_VERSION,
    id: validateEventId(record.id) as EventRecordV1["id"],
    at: record.at,
    type: validateEventType(record.type),
    source: validateSource(record.source),
    subject: validateSubject(record.subject),
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
 * Deserializuje wire → frozen EventRecordV1.
 * Gdy payloadDigest obecny — pin FND-02: createDigest(payload) musi się zgadzać.
 * async: Web Crypto (FOUNDATION-32).
 */
export async function deserializeEvent(value: unknown): Promise<EventRecordV1> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw createError({
      code: FND_EVENT_INVALID,
      message: "deserializeEvent expects an object",
      category: "validation",
    });
  }

  const o = value as Record<string, unknown>;

  if (o.schemaVersion !== EVENT_SCHEMA_VERSION) {
    throw createError({
      code: FND_EVENT_INVALID,
      message: `Unsupported event schemaVersion: ${String(o.schemaVersion)}`,
      category: "validation",
      meta: {
        schemaVersion: typeof o.schemaVersion === "number" ? o.schemaVersion : null,
      },
    });
  }

  validateEvent(value);

  const out: EventRecordV1 = {
    schemaVersion: EVENT_SCHEMA_VERSION,
    id: validateEventId(o.id) as EventRecordV1["id"],
    at: o.at as string,
    type: validateEventType(o.type),
    source: validateSource(o.source),
    subject: validateSubject(o.subject),
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
        code: FND_EVENT_PAYLOAD_INVALID,
        message: "payloadDigest requires payload",
        category: "validation",
      });
    }
    const expected = await createDigest(out.payload);
    if (!compareDigest(wireDigest, expected)) {
      throw createError({
        code: FND_EVENT_PAYLOAD_INVALID,
        message: "payloadDigest does not match payload",
        category: "validation",
      });
    }
    out.payloadDigest = wireDigest;
  }

  return deepFreeze(out);
}
