/**
 * FND-03a — built-in FND_ERROR_* + walidacja ErrorCode (FOUNDATION-16).
 */

/** ErrorCode: FND_<AREA>_<DETAIL> (UPPER_SNAKE). */
export const ERROR_CODE_RE = /^FND_[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/;

export const FND_ERROR_INVALID = "FND_ERROR_INVALID";
export const FND_ERROR_META_INVALID = "FND_ERROR_META_INVALID";
export const FND_ERROR_CAUSE_CYCLE = "FND_ERROR_CAUSE_CYCLE";
/** Zarezerwowane pod FND-03b serialize. */
export const FND_ERROR_SERIALIZE_FAILED = "FND_ERROR_SERIALIZE_FAILED";

export const BUILTIN_ERROR_CODES = [
  FND_ERROR_INVALID,
  FND_ERROR_META_INVALID,
  FND_ERROR_CAUSE_CYCLE,
  FND_ERROR_SERIALIZE_FAILED,
] as const;

export function isErrorCode(value: unknown): value is string {
  return typeof value === "string" && ERROR_CODE_RE.test(value);
}
