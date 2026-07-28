/**
 * FND-03a — FoundationError + createError / throwError (FOUNDATION-16).
 */

import {
  FND_ERROR_CAUSE_CYCLE,
  FND_ERROR_INVALID,
  FND_ERROR_META_INVALID,
  isErrorCode,
} from "./codes";
import type {
  CreateErrorInput,
  ErrorCategory,
  ErrorMetadata,
  ErrorMetaValue,
  ErrorSeverity,
} from "./types";
import {
  ERROR_CATEGORIES,
  ERROR_META_KEY_MAX_LENGTH,
  ERROR_META_MAX_KEYS,
  ERROR_META_STRING_MAX_LENGTH,
  ERROR_SEVERITIES,
} from "./types";

function defaultUserMessage(code: string): string {
  return `Wystąpił błąd. Kod: ${code}`;
}

function isErrorCategory(value: unknown): value is ErrorCategory {
  return typeof value === "string" && (ERROR_CATEGORIES as readonly string[]).includes(value);
}

function isErrorSeverity(value: unknown): value is ErrorSeverity {
  return typeof value === "string" && (ERROR_SEVERITIES as readonly string[]).includes(value);
}

function isMetaValue(value: unknown): value is ErrorMetaValue {
  if (value === null) return true;
  const t = typeof value;
  return t === "string" || t === "number" || t === "boolean";
}

function normalizeMeta(meta: ErrorMetadata | undefined): ErrorMetadata {
  if (meta === undefined) return {};

  if (meta === null || typeof meta !== "object" || Array.isArray(meta)) {
    throw createBootstrapError(FND_ERROR_META_INVALID, "Error metadata must be a plain object");
  }

  const keys = Object.keys(meta);
  if (keys.length > ERROR_META_MAX_KEYS) {
    throw createBootstrapError(
      FND_ERROR_META_INVALID,
      `Error metadata exceeds max keys (${ERROR_META_MAX_KEYS})`,
    );
  }

  const out: ErrorMetadata = {};
  for (const key of keys) {
    if (key.length === 0 || key.length > ERROR_META_KEY_MAX_LENGTH) {
      throw createBootstrapError(
        FND_ERROR_META_INVALID,
        `Error metadata key length invalid (1..${ERROR_META_KEY_MAX_LENGTH})`,
      );
    }
    const val = meta[key];
    if (val === undefined) {
      throw createBootstrapError(FND_ERROR_META_INVALID, "Error metadata rejects undefined values");
    }
    if (!isMetaValue(val)) {
      throw createBootstrapError(
        FND_ERROR_META_INVALID,
        "Error metadata values must be string | number | boolean | null",
      );
    }
    if (typeof val === "string" && val.length > ERROR_META_STRING_MAX_LENGTH) {
      throw createBootstrapError(
        FND_ERROR_META_INVALID,
        `Error metadata string exceeds max length (${ERROR_META_STRING_MAX_LENGTH})`,
      );
    }
    if (typeof val === "number" && !Number.isFinite(val)) {
      throw createBootstrapError(FND_ERROR_META_INVALID, "Error metadata rejects NaN/Infinity");
    }
    out[key] = val;
  }
  return out;
}

/**
 * Bootstrap bez rekurencji createError (gdy walidacja createError failuje).
 */
function createBootstrapError(code: string, message: string): FoundationError {
  const category: ErrorCategory =
    code === FND_ERROR_CAUSE_CYCLE ? "invariant" : "validation";
  return new FoundationError({
    code,
    message,
    category,
    severity: "error",
    userMessage: defaultUserMessage(code),
    meta: {},
    cause: undefined,
  });
}

export class FoundationError extends Error {
  readonly name = "FoundationError" as const;
  readonly code: string;
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly userMessage: string;
  readonly meta: Readonly<ErrorMetadata>;
  override readonly cause?: unknown;

  constructor(args: {
    code: string;
    message: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    userMessage: string;
    meta: ErrorMetadata;
    cause?: unknown;
  }) {
    super(args.message);
    this.code = args.code;
    this.category = args.category;
    this.severity = args.severity;
    this.userMessage = args.userMessage;
    this.meta = Object.freeze({ ...args.meta });
    if (args.cause !== undefined) {
      this.cause = args.cause;
    }
    Object.setPrototypeOf(this, FoundationError.prototype);
  }
}

function assertNoCauseCycle(root: FoundationError, cause: unknown): void {
  const seen = new Set<object>();
  seen.add(root);
  let cur: unknown = cause;
  while (cur !== undefined && cur !== null) {
    if (typeof cur === "object") {
      if (seen.has(cur as object)) {
        throw createBootstrapError(FND_ERROR_CAUSE_CYCLE, "Error cause chain contains a cycle");
      }
      seen.add(cur as object);
    }
    if (cur instanceof FoundationError) {
      cur = cur.cause;
      continue;
    }
    if (cur instanceof Error && "cause" in cur) {
      cur = (cur as Error & { cause?: unknown }).cause;
      continue;
    }
    break;
  }
}

export function createError(input: CreateErrorInput): FoundationError {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw createBootstrapError(FND_ERROR_INVALID, "createError input must be an object");
  }

  if (!isErrorCode(input.code)) {
    throw createBootstrapError(FND_ERROR_INVALID, "Invalid Foundation ErrorCode");
  }

  if (typeof input.message !== "string" || input.message.length === 0) {
    throw createBootstrapError(FND_ERROR_INVALID, "createError requires non-empty message");
  }

  const category: ErrorCategory =
    input.category === undefined ? "validation" : input.category;
  if (!isErrorCategory(category)) {
    throw createBootstrapError(FND_ERROR_INVALID, "Invalid ErrorCategory");
  }

  const severity: ErrorSeverity =
    input.severity === undefined ? "error" : input.severity;
  if (!isErrorSeverity(severity)) {
    throw createBootstrapError(FND_ERROR_INVALID, "Invalid ErrorSeverity");
  }

  const userMessage =
    input.userMessage === undefined
      ? defaultUserMessage(input.code)
      : input.userMessage;

  if (typeof userMessage !== "string" || userMessage.length === 0) {
    throw createBootstrapError(FND_ERROR_INVALID, "userMessage must be a non-empty string");
  }

  const meta = normalizeMeta(input.meta);

  const err = new FoundationError({
    code: input.code,
    message: input.message,
    category,
    severity,
    userMessage,
    meta,
    cause: input.cause,
  });

  if (input.cause !== undefined) {
    assertNoCauseCycle(err, input.cause);
  }

  return err;
}

export function throwError(input: CreateErrorInput): never {
  throw createError(input);
}
