/**
 * FND-03a — Foundation Error: typy, limity, schema (FOUNDATION-16/17).
 * Serialize = FND-03b.
 */

export type ErrorCategory =
  | "validation"
  | "invariant"
  | "unsupported"
  | "limit"
  | "conflict"
  | "internal";

export type ErrorSeverity = "warn" | "error" | "fatal";

export type ErrorMetaValue = string | number | boolean | null;

export type ErrorMetadata = Record<string, ErrorMetaValue>;

/** Wersja envelope serialize (deklaratywna; wire w FND-03b). */
export const ERROR_SCHEMA_VERSION = 1 as const;

/** Max głębokość cause (serialize / future); create anti-cycle osobno. */
export const ERROR_CAUSE_MAX_DEPTH = 8;

/** Limity ErrorMetadata (FOUNDATION-16 lock). */
export const ERROR_META_MAX_KEYS = 32;
export const ERROR_META_KEY_MAX_LENGTH = 64;
export const ERROR_META_STRING_MAX_LENGTH = 512;

export const ERROR_CATEGORIES: readonly ErrorCategory[] = [
  "validation",
  "invariant",
  "unsupported",
  "limit",
  "conflict",
  "internal",
] as const;

export const ERROR_SEVERITIES: readonly ErrorSeverity[] = ["warn", "error", "fatal"] as const;

export type CreateErrorInput = {
  code: string;
  message: string;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  userMessage?: string;
  meta?: ErrorMetadata;
  cause?: unknown;
};
