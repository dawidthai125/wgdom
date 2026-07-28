/**
 * FND-02a — normalizacja primitywów / plain object (FOUNDATION-09).
 */

import {
  FND_DIGEST_INVALID_NUMBER,
  FND_DIGEST_UNSUPPORTED_TYPE,
  throwDigestError,
} from "./errors";

/** Plain object: Object.prototype lub null prototype. */
export function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Finite number → wartość kanoniczna (−0 → 0).
 * NaN / ±Infinity → throw.
 */
export function normalizeFiniteNumber(value: number): number {
  if (!Number.isFinite(value)) {
    throwDigestError(FND_DIGEST_INVALID_NUMBER, "Canonical digest rejects NaN and Infinity");
  }
  return Object.is(value, -0) ? 0 : value;
}

/** Reject Date / Map / Set / class instances / boxed objects. */
export function assertPlainObject(value: object): void {
  if (!isPlainObject(value)) {
    throwDigestError(
      FND_DIGEST_UNSUPPORTED_TYPE,
      "Canonical digest requires plain objects (no Date/Map/Set/class instances)",
    );
  }
}
