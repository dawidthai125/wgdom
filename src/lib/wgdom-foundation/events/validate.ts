/**
 * FND-05a — walidacja EventRecord (FOUNDATION-31).
 */

import { canonicalize } from "../digest/canonicalize";
import { isDigest } from "../digest/validate";
import { createError } from "../errors/create";
import { isValidId } from "../id/validate";
import {
  FND_EVENT_ID_INVALID,
  FND_EVENT_INVALID,
  FND_EVENT_PAYLOAD_INVALID,
} from "./codes";
import type {
  EventMetadata,
  EventMetaValue,
  EventRecordV1,
  EventSource,
  EventSubject,
} from "./types";
import {
  EVENT_META_KEY_MAX_LENGTH,
  EVENT_META_MAX_KEYS,
  EVENT_META_STRING_MAX_LENGTH,
  EVENT_PAYLOAD_MAX_BYTES,
  EVENT_SCHEMA_VERSION,
  EVENT_SOURCE_ID_MAX,
  EVENT_SOURCE_LABEL_MAX,
  EVENT_SOURCE_TYPES,
  EVENT_SUBJECT_ID_MAX,
  EVENT_SUBJECT_TYPE_MAX,
  EVENT_SUBJECT_TYPE_RE,
  EVENT_TYPE_MAX_LENGTH,
  EVENT_TYPE_RE,
} from "./types";

const utf8 = new TextEncoder();

function isMetaValue(value: unknown): value is EventMetaValue {
  if (value === null) return true;
  const t = typeof value;
  return t === "string" || t === "number" || t === "boolean";
}

export function isIsoUtcZ(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 20) return false;
  if (!value.endsWith("Z")) return false;
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return false;
  return (
    new Date(t).toISOString() === value ||
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value)
  );
}

export function normalizeAndCheckMeta(meta: unknown): EventMetadata {
  if (meta === undefined) return {};
  if (meta === null || typeof meta !== "object" || Array.isArray(meta)) {
    throw createError({
      code: FND_EVENT_INVALID,
      message: "Event meta must be a plain object",
      category: "validation",
    });
  }
  const keys = Object.keys(meta as Record<string, unknown>);
  if (keys.length > EVENT_META_MAX_KEYS) {
    throw createError({
      code: FND_EVENT_INVALID,
      message: `Event meta exceeds max keys (${EVENT_META_MAX_KEYS})`,
      category: "validation",
    });
  }
  const out: EventMetadata = {};
  for (const key of keys) {
    if (key.length === 0 || key.length > EVENT_META_KEY_MAX_LENGTH) {
      throw createError({
        code: FND_EVENT_INVALID,
        message: "Event meta key length invalid",
        category: "validation",
      });
    }
    const val = (meta as Record<string, unknown>)[key];
    if (val === undefined || !isMetaValue(val)) {
      throw createError({
        code: FND_EVENT_INVALID,
        message: "Event meta values must be string | number | boolean | null",
        category: "validation",
      });
    }
    if (typeof val === "string" && val.length > EVENT_META_STRING_MAX_LENGTH) {
      throw createError({
        code: FND_EVENT_INVALID,
        message: "Event meta string too long",
        category: "validation",
      });
    }
    if (typeof val === "number" && !Number.isFinite(val)) {
      throw createError({
        code: FND_EVENT_INVALID,
        message: "Event meta rejects NaN/Infinity",
        category: "validation",
      });
    }
    out[key] = val;
  }
  return out;
}

export function validateSource(source: unknown): EventSource {
  if (source === null || typeof source !== "object" || Array.isArray(source)) {
    throw createError({
      code: FND_EVENT_INVALID,
      message: "Event source must be an object",
      category: "validation",
    });
  }
  const s = source as Record<string, unknown>;
  if (
    typeof s.type !== "string" ||
    !(EVENT_SOURCE_TYPES as readonly string[]).includes(s.type)
  ) {
    throw createError({
      code: FND_EVENT_INVALID,
      message: "Invalid EventSource.type",
      category: "validation",
    });
  }
  const out: EventSource = { type: s.type as EventSource["type"] };
  if (s.id !== undefined) {
    if (typeof s.id !== "string" || s.id.length === 0 || s.id.length > EVENT_SOURCE_ID_MAX) {
      throw createError({
        code: FND_EVENT_INVALID,
        message: "Invalid EventSource.id",
        category: "validation",
      });
    }
    out.id = s.id;
  }
  if (s.label !== undefined) {
    if (
      typeof s.label !== "string" ||
      s.label.length === 0 ||
      s.label.length > EVENT_SOURCE_LABEL_MAX
    ) {
      throw createError({
        code: FND_EVENT_INVALID,
        message: "Invalid EventSource.label",
        category: "validation",
      });
    }
    out.label = s.label;
  }
  return out;
}

export function validateEventType(type: unknown): string {
  if (typeof type !== "string" || type.length === 0 || type.length > EVENT_TYPE_MAX_LENGTH) {
    throw createError({
      code: FND_EVENT_INVALID,
      message: "Invalid EventType length",
      category: "validation",
    });
  }
  if (!EVENT_TYPE_RE.test(type)) {
    throw createError({
      code: FND_EVENT_INVALID,
      message: "Invalid EventType format (UPPER_SNAKE)",
      category: "validation",
    });
  }
  return type;
}

export function validateSubject(subject: unknown): EventSubject {
  if (subject === null || typeof subject !== "object" || Array.isArray(subject)) {
    throw createError({
      code: FND_EVENT_INVALID,
      message: "Event subject must be an object",
      category: "validation",
    });
  }
  const t = subject as Record<string, unknown>;
  if (
    typeof t.type !== "string" ||
    t.type.length === 0 ||
    t.type.length > EVENT_SUBJECT_TYPE_MAX ||
    !EVENT_SUBJECT_TYPE_RE.test(t.type)
  ) {
    throw createError({
      code: FND_EVENT_INVALID,
      message: "Invalid EventSubject.type",
      category: "validation",
    });
  }
  const out: EventSubject = { type: t.type };
  if (t.id !== undefined) {
    if (typeof t.id !== "string" || t.id.length === 0 || t.id.length > EVENT_SUBJECT_ID_MAX) {
      throw createError({
        code: FND_EVENT_INVALID,
        message: "Invalid EventSubject.id",
        category: "validation",
      });
    }
    out.id = t.id;
  }
  return out;
}

/**
 * Waliduje payload: canonicalize + size.
 * Zwraca znormalizowaną wartość JSON (JSON.parse(canonicalize)).
 */
export function normalizePayload(payload: unknown): unknown {
  let canonical: string;
  try {
    canonical = canonicalize(payload);
  } catch (e) {
    throw createError({
      code: FND_EVENT_PAYLOAD_INVALID,
      message: "Event payload is not JSON-compatible",
      category: "validation",
      cause: e,
    });
  }
  const bytes = utf8.encode(canonical).length;
  if (bytes > EVENT_PAYLOAD_MAX_BYTES) {
    throw createError({
      code: FND_EVENT_PAYLOAD_INVALID,
      message: `Event payload exceeds max bytes (${EVENT_PAYLOAD_MAX_BYTES})`,
      category: "validation",
      meta: { bytes },
    });
  }
  return JSON.parse(canonical) as unknown;
}

export function validateEventId(id: unknown): string {
  if (typeof id !== "string" || !isValidId(id, "event")) {
    throw createError({
      code: FND_EVENT_ID_INVALID,
      message: "EventId must be an event PublicId (evt_ + ULID)",
      category: "validation",
    });
  }
  return id;
}

export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Object.isFrozen(value)) return value;
  for (const key of Object.keys(value as object)) {
    const child = (value as Record<string, unknown>)[key];
    if (child !== null && typeof child === "object") {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

export function isEvent(value: unknown): value is EventRecordV1 {
  try {
    validateEvent(value);
    return true;
  } catch {
    return false;
  }
}

export function assertEvent(value: unknown): asserts value is EventRecordV1 {
  validateEvent(value);
}

export function validateEvent(value: unknown): asserts value is EventRecordV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw createError({
      code: FND_EVENT_INVALID,
      message: "EventRecord must be an object",
      category: "validation",
    });
  }
  const r = value as Record<string, unknown>;

  if (r.schemaVersion !== EVENT_SCHEMA_VERSION) {
    throw createError({
      code: FND_EVENT_INVALID,
      message: `Unsupported event schemaVersion: ${String(r.schemaVersion)}`,
      category: "validation",
    });
  }

  validateEventId(r.id);

  if (!isIsoUtcZ(r.at)) {
    throw createError({
      code: FND_EVENT_INVALID,
      message: "Event at must be ISO-8601 UTC ending with Z",
      category: "validation",
    });
  }

  validateEventType(r.type);
  validateSource(r.source);
  validateSubject(r.subject);

  if (r.payload !== undefined) {
    normalizePayload(r.payload);
  }

  if (r.meta !== undefined) {
    normalizeAndCheckMeta(r.meta);
  }

  if (r.payloadDigest !== undefined) {
    if (!isDigest(r.payloadDigest)) {
      throw createError({
        code: FND_EVENT_INVALID,
        message: "Invalid payloadDigest",
        category: "validation",
      });
    }
    if (r.payload === undefined) {
      throw createError({
        code: FND_EVENT_PAYLOAD_INVALID,
        message: "payloadDigest requires payload",
        category: "validation",
      });
    }
  }
}
