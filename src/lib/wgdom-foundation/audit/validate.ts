/**
 * FND-04a — walidacja AuditRecord (FOUNDATION-23).
 */

import { canonicalize } from "../digest/canonicalize";
import { isDigest } from "../digest/validate";
import { createError } from "../errors/create";
import { isValidId } from "../id/validate";
import {
  FND_AUDIT_ID_INVALID,
  FND_AUDIT_INVALID,
  FND_AUDIT_PAYLOAD_INVALID,
} from "./codes";
import type {
  AuditActor,
  AuditMetadata,
  AuditMetaValue,
  AuditRecordV1,
  AuditTarget,
} from "./types";
import {
  AUDIT_ACTION_MAX_LENGTH,
  AUDIT_ACTION_RE,
  AUDIT_ACTOR_ID_MAX,
  AUDIT_ACTOR_LABEL_MAX,
  AUDIT_ACTOR_TYPES,
  AUDIT_META_KEY_MAX_LENGTH,
  AUDIT_META_MAX_KEYS,
  AUDIT_META_STRING_MAX_LENGTH,
  AUDIT_PAYLOAD_MAX_BYTES,
  AUDIT_SCHEMA_VERSION,
  AUDIT_TARGET_ID_MAX,
  AUDIT_TARGET_TYPE_MAX,
  AUDIT_TARGET_TYPE_RE,
} from "./types";

const utf8 = new TextEncoder();

function isMetaValue(value: unknown): value is AuditMetaValue {
  if (value === null) return true;
  const t = typeof value;
  return t === "string" || t === "number" || t === "boolean";
}

export function isIsoUtcZ(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 20) return false;
  if (!value.endsWith("Z")) return false;
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return false;
  // Canonical shape: must round-trip toISOString for the same instant
  // (accepts .sssZ from Date.toISOString()).
  return new Date(t).toISOString() === value || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value);
}

export function normalizeAndCheckMeta(meta: unknown): AuditMetadata {
  if (meta === undefined) return {};
  if (meta === null || typeof meta !== "object" || Array.isArray(meta)) {
    throw createError({
      code: FND_AUDIT_INVALID,
      message: "Audit meta must be a plain object",
      category: "validation",
    });
  }
  const keys = Object.keys(meta as Record<string, unknown>);
  if (keys.length > AUDIT_META_MAX_KEYS) {
    throw createError({
      code: FND_AUDIT_INVALID,
      message: `Audit meta exceeds max keys (${AUDIT_META_MAX_KEYS})`,
      category: "validation",
    });
  }
  const out: AuditMetadata = {};
  for (const key of keys) {
    if (key.length === 0 || key.length > AUDIT_META_KEY_MAX_LENGTH) {
      throw createError({
        code: FND_AUDIT_INVALID,
        message: "Audit meta key length invalid",
        category: "validation",
      });
    }
    const val = (meta as Record<string, unknown>)[key];
    if (val === undefined || !isMetaValue(val)) {
      throw createError({
        code: FND_AUDIT_INVALID,
        message: "Audit meta values must be string | number | boolean | null",
        category: "validation",
      });
    }
    if (typeof val === "string" && val.length > AUDIT_META_STRING_MAX_LENGTH) {
      throw createError({
        code: FND_AUDIT_INVALID,
        message: "Audit meta string too long",
        category: "validation",
      });
    }
    if (typeof val === "number" && !Number.isFinite(val)) {
      throw createError({
        code: FND_AUDIT_INVALID,
        message: "Audit meta rejects NaN/Infinity",
        category: "validation",
      });
    }
    out[key] = val;
  }
  return out;
}

export function validateActor(actor: unknown): AuditActor {
  if (actor === null || typeof actor !== "object" || Array.isArray(actor)) {
    throw createError({
      code: FND_AUDIT_INVALID,
      message: "Audit actor must be an object",
      category: "validation",
    });
  }
  const a = actor as Record<string, unknown>;
  if (typeof a.type !== "string" || !(AUDIT_ACTOR_TYPES as readonly string[]).includes(a.type)) {
    throw createError({
      code: FND_AUDIT_INVALID,
      message: "Invalid AuditActor.type",
      category: "validation",
    });
  }
  const out: AuditActor = { type: a.type as AuditActor["type"] };
  if (a.id !== undefined) {
    if (typeof a.id !== "string" || a.id.length === 0 || a.id.length > AUDIT_ACTOR_ID_MAX) {
      throw createError({
        code: FND_AUDIT_INVALID,
        message: "Invalid AuditActor.id",
        category: "validation",
      });
    }
    out.id = a.id;
  }
  if (a.label !== undefined) {
    if (
      typeof a.label !== "string" ||
      a.label.length === 0 ||
      a.label.length > AUDIT_ACTOR_LABEL_MAX
    ) {
      throw createError({
        code: FND_AUDIT_INVALID,
        message: "Invalid AuditActor.label",
        category: "validation",
      });
    }
    out.label = a.label;
  }
  return out;
}

export function validateAction(action: unknown): string {
  if (typeof action !== "string" || action.length === 0 || action.length > AUDIT_ACTION_MAX_LENGTH) {
    throw createError({
      code: FND_AUDIT_INVALID,
      message: "Invalid Audit action length",
      category: "validation",
    });
  }
  if (!AUDIT_ACTION_RE.test(action)) {
    throw createError({
      code: FND_AUDIT_INVALID,
      message: "Invalid Audit action format (UPPER_SNAKE)",
      category: "validation",
    });
  }
  return action;
}

export function validateTarget(target: unknown): AuditTarget {
  if (target === null || typeof target !== "object" || Array.isArray(target)) {
    throw createError({
      code: FND_AUDIT_INVALID,
      message: "Audit target must be an object",
      category: "validation",
    });
  }
  const t = target as Record<string, unknown>;
  if (
    typeof t.type !== "string" ||
    t.type.length === 0 ||
    t.type.length > AUDIT_TARGET_TYPE_MAX ||
    !AUDIT_TARGET_TYPE_RE.test(t.type)
  ) {
    throw createError({
      code: FND_AUDIT_INVALID,
      message: "Invalid AuditTarget.type",
      category: "validation",
    });
  }
  const out: AuditTarget = { type: t.type };
  if (t.id !== undefined) {
    if (typeof t.id !== "string" || t.id.length === 0 || t.id.length > AUDIT_TARGET_ID_MAX) {
      throw createError({
        code: FND_AUDIT_INVALID,
        message: "Invalid AuditTarget.id",
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
      code: FND_AUDIT_PAYLOAD_INVALID,
      message: "Audit payload is not JSON-compatible",
      category: "validation",
      cause: e,
    });
  }
  const bytes = utf8.encode(canonical).length;
  if (bytes > AUDIT_PAYLOAD_MAX_BYTES) {
    throw createError({
      code: FND_AUDIT_PAYLOAD_INVALID,
      message: `Audit payload exceeds max bytes (${AUDIT_PAYLOAD_MAX_BYTES})`,
      category: "validation",
      meta: { bytes },
    });
  }
  return JSON.parse(canonical) as unknown;
}

export function validateAuditId(id: unknown): string {
  if (typeof id !== "string" || !isValidId(id, "foundation")) {
    throw createError({
      code: FND_AUDIT_ID_INVALID,
      message: "AuditId must be a foundation PublicId (fnd_ + ULID)",
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

export function isAuditRecord(value: unknown): value is AuditRecordV1 {
  try {
    validateAuditRecord(value);
    return true;
  } catch {
    return false;
  }
}

export function assertAuditRecord(value: unknown): asserts value is AuditRecordV1 {
  validateAuditRecord(value);
}

export function validateAuditRecord(value: unknown): asserts value is AuditRecordV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw createError({
      code: FND_AUDIT_INVALID,
      message: "AuditRecord must be an object",
      category: "validation",
    });
  }
  const r = value as Record<string, unknown>;

  if (r.schemaVersion !== AUDIT_SCHEMA_VERSION) {
    throw createError({
      code: FND_AUDIT_INVALID,
      message: `Unsupported audit schemaVersion: ${String(r.schemaVersion)}`,
      category: "validation",
    });
  }

  validateAuditId(r.id);

  if (!isIsoUtcZ(r.at)) {
    throw createError({
      code: FND_AUDIT_INVALID,
      message: "Audit at must be ISO-8601 UTC ending with Z",
      category: "validation",
    });
  }

  validateActor(r.actor);
  validateAction(r.action);
  validateTarget(r.target);

  if (r.payload !== undefined) {
    normalizePayload(r.payload);
  }

  if (r.meta !== undefined) {
    normalizeAndCheckMeta(r.meta);
  }

  if (r.payloadDigest !== undefined) {
    if (!isDigest(r.payloadDigest)) {
      throw createError({
        code: FND_AUDIT_INVALID,
        message: "Invalid payloadDigest",
        category: "validation",
      });
    }
    if (r.payload === undefined) {
      throw createError({
        code: FND_AUDIT_PAYLOAD_INVALID,
        message: "payloadDigest requires payload",
        category: "validation",
      });
    }
  }
}
