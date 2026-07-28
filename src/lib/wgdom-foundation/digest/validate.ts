/**
 * FND-02a — walidacja / parse wire format digestu (bez hashowania).
 */

import { createDigestError } from "./errors";
import {
  DIGEST_ALGORITHM,
  DIGEST_HEX_LENGTH,
  DIGEST_PREFIX_V1,
  DIGEST_SPEC_VERSION,
  FND_DIGEST_INVALID,
  type DigestV1,
  type ParsedDigest,
} from "./types";

const DIGEST_V1_RE = new RegExp(
  `^${DIGEST_PREFIX_V1}[0-9a-f]{${DIGEST_HEX_LENGTH}}$`,
);

export function isDigest(value: unknown): value is DigestV1 {
  return typeof value === "string" && DIGEST_V1_RE.test(value);
}

export function parseDigest(value: unknown): ParsedDigest | null {
  if (!isDigest(value)) return null;
  return {
    version: DIGEST_SPEC_VERSION,
    algorithm: DIGEST_ALGORITHM,
    hex: value.slice(DIGEST_PREFIX_V1.length),
    wire: value,
  };
}

export function assertDigest(value: unknown): asserts value is DigestV1 {
  if (!isDigest(value)) {
    throw createDigestError(FND_DIGEST_INVALID, "Invalid foundation digest wire format");
  }
}
