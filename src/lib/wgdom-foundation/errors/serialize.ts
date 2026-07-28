/**
 * FND-03b — serialize / deserialize / errorToJSON (FOUNDATION-16).
 * Bez zmian createError / FoundationError / validate.
 */

import { FND_ERROR_INVALID, isErrorCode } from "./codes";
import { createError, FoundationError } from "./create";
import type { ErrorCategory, ErrorMetadata, ErrorSeverity } from "./types";
import {
  ERROR_CAUSE_MAX_DEPTH,
  ERROR_CATEGORIES,
  ERROR_SCHEMA_VERSION,
  ERROR_SEVERITIES,
} from "./types";
import { isFoundationError } from "./validate";

export type SerializeOptions = {
  /** Dev/test only. Default false — stack poza wire. */
  includeStack?: boolean;
};

export type SerializedForeignCauseV1 = {
  kind: "foreign";
  name?: string;
  message: string;
};

export type SerializedFoundationErrorV1 = {
  schemaVersion: 1;
  name: "FoundationError";
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  meta: ErrorMetadata;
  cause?: SerializedFoundationErrorV1 | SerializedForeignCauseV1;
  /** Obecne tylko gdy includeStack: true */
  stack?: string;
};

function isCategory(value: unknown): value is ErrorCategory {
  return typeof value === "string" && (ERROR_CATEGORIES as readonly string[]).includes(value);
}

function isSeverity(value: unknown): value is ErrorSeverity {
  return typeof value === "string" && (ERROR_SEVERITIES as readonly string[]).includes(value);
}

function foreignFromUnknown(value: unknown): SerializedForeignCauseV1 {
  if (value instanceof Error) {
    return {
      kind: "foreign",
      name: value.name || undefined,
      message: typeof value.message === "string" ? value.message : String(value),
    };
  }
  const message =
    typeof value === "string"
      ? value
      : value === null || value === undefined
        ? String(value)
        : (() => {
            try {
              return JSON.stringify(value) ?? String(value);
            } catch {
              return String(value);
            }
          })();
  return {
    kind: "foreign",
    message: message.length > 512 ? message.slice(0, 512) : message,
  };
}

function serializeCause(
  cause: unknown,
  depth: number,
  seen: Set<object>,
  includeStack: boolean,
): { cause?: SerializedFoundationErrorV1 | SerializedForeignCauseV1; truncated: boolean } {
  if (cause === undefined) return { truncated: false };

  if (depth > ERROR_CAUSE_MAX_DEPTH) {
    return { truncated: true };
  }

  if (typeof cause === "object" && cause !== null) {
    if (seen.has(cause)) {
      return { truncated: true };
    }
  }

  if (isFoundationError(cause)) {
    seen.add(cause);
    const node = serializeFoundationAt(cause, depth, seen, includeStack);
    return { cause: node, truncated: false };
  }

  // Foreign Error: follow .cause only for cycle detection depth, but serialize as foreign leaf
  // (FOUNDATION-16: foreign → name/message; nie rozwijamy pełnego łańcucha foreign jako Foundation)
  if (cause instanceof Error) {
    if (seen.has(cause)) return { truncated: true };
    seen.add(cause);
    // If foreign has nested cause that would exceed — still emit foreign leaf only
    return { cause: foreignFromUnknown(cause), truncated: false };
  }

  return { cause: foreignFromUnknown(cause), truncated: false };
}

function serializeFoundationAt(
  err: FoundationError,
  depth: number,
  seen: Set<object>,
  includeStack: boolean,
): SerializedFoundationErrorV1 {
  const meta: ErrorMetadata = { ...err.meta };
  let causeField: SerializedFoundationErrorV1 | SerializedForeignCauseV1 | undefined;
  let truncated = false;

  if (err.cause !== undefined) {
    const result = serializeCause(err.cause, depth + 1, seen, includeStack);
    truncated = result.truncated;
    causeField = result.cause;
    if (truncated && causeField === undefined) {
      meta.causeTruncated = true;
    }
  }

  const out: SerializedFoundationErrorV1 = {
    schemaVersion: ERROR_SCHEMA_VERSION,
    name: "FoundationError",
    code: err.code,
    category: err.category,
    severity: err.severity,
    message: err.message,
    userMessage: err.userMessage,
    meta,
  };

  if (causeField !== undefined) {
    out.cause = causeField;
  }

  if (includeStack && typeof err.stack === "string" && err.stack.length > 0) {
    out.stack = err.stack;
  }

  return out;
}

export function serializeError(
  err: FoundationError,
  options?: SerializeOptions,
): SerializedFoundationErrorV1 {
  if (!isFoundationError(err)) {
    throw createError({
      code: FND_ERROR_INVALID,
      message: "serializeError requires FoundationError",
      category: "validation",
    });
  }

  const includeStack = options?.includeStack === true;
  const seen = new Set<object>();
  seen.add(err);
  return serializeFoundationAt(err, 0, seen, includeStack);
}

export function errorToJSON(err: FoundationError): SerializedFoundationErrorV1 {
  return serializeError(err);
}

function isForeignCause(value: unknown): value is SerializedForeignCauseV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const o = value as Record<string, unknown>;
  return o.kind === "foreign" && typeof o.message === "string";
}

function isSerializedFoundation(value: unknown): value is SerializedFoundationErrorV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const o = value as Record<string, unknown>;
  return (
    o.schemaVersion === 1 &&
    o.name === "FoundationError" &&
    typeof o.code === "string" &&
    typeof o.message === "string" &&
    typeof o.userMessage === "string" &&
    typeof o.category === "string" &&
    typeof o.severity === "string" &&
    o.meta !== null &&
    typeof o.meta === "object" &&
    !Array.isArray(o.meta)
  );
}

function deserializeCause(
  cause: unknown,
): Error | FoundationError | undefined {
  if (cause === undefined) return undefined;

  if (isForeignCause(cause)) {
    const e = new Error(cause.message);
    if (typeof cause.name === "string" && cause.name.length > 0) {
      e.name = cause.name;
    }
    return e;
  }

  if (isSerializedFoundation(cause)) {
    return deserializeError(cause);
  }

  throw createError({
    code: FND_ERROR_INVALID,
    message: "Invalid serialized cause",
    category: "validation",
  });
}

export function deserializeError(value: unknown): FoundationError {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw createError({
      code: FND_ERROR_INVALID,
      message: "deserializeError expects an object",
      category: "validation",
    });
  }

  const o = value as Record<string, unknown>;

  if (o.schemaVersion !== ERROR_SCHEMA_VERSION) {
    throw createError({
      code: FND_ERROR_INVALID,
      message: `Unsupported error schemaVersion: ${String(o.schemaVersion)}`,
      category: "validation",
      meta: { schemaVersion: typeof o.schemaVersion === "number" ? o.schemaVersion : null },
    });
  }

  if (!isSerializedFoundation(value)) {
    throw createError({
      code: FND_ERROR_INVALID,
      message: "Invalid SerializedFoundationErrorV1 payload",
      category: "validation",
    });
  }

  if (!isErrorCode(value.code) || !isCategory(value.category) || !isSeverity(value.severity)) {
    throw createError({
      code: FND_ERROR_INVALID,
      message: "Invalid code/category/severity in serialized error",
      category: "validation",
    });
  }

  const cause = value.cause !== undefined ? deserializeCause(value.cause) : undefined;

  // Stack z wire nie przywracamy (nie jest częścią createError API).
  return createError({
    code: value.code,
    message: value.message,
    category: value.category,
    severity: value.severity,
    userMessage: value.userMessage,
    meta: value.meta as ErrorMetadata,
    cause,
  });
}
