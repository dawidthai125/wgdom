/**
 * FND-03a — isFoundationError / assertFoundationError / getErrorCode.
 */

import { FND_ERROR_INVALID, isErrorCode } from "./codes";
import { createError, FoundationError } from "./create";

export function isFoundationError(value: unknown): value is FoundationError {
  return value instanceof FoundationError;
}

export function assertFoundationError(value: unknown): asserts value is FoundationError {
  if (!isFoundationError(value)) {
    throw createError({
      code: FND_ERROR_INVALID,
      message: "Expected FoundationError",
      category: "validation",
    });
  }
}

/**
 * FoundationError → code.
 * Duck `{ code: string }` z legalnym ErrorCode → code.
 * Inaczej null.
 */
export function getErrorCode(value: unknown): string | null {
  if (isFoundationError(value)) return value.code;
  if (value !== null && typeof value === "object" && "code" in value) {
    const code = (value as { code: unknown }).code;
    if (isErrorCode(code)) return code;
  }
  return null;
}
