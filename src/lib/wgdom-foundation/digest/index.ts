/**
 * Publiczny barrel Canonical Digest — FND-02 COMPLETE (02a+02b+02c).
 */

export type { DigestV1, ParsedDigest } from "./types";
export {
  DIGEST_PREFIX_V1,
  DIGEST_HEX_LENGTH,
  DIGEST_ALGORITHM,
  DIGEST_SPEC_VERSION,
  DIGEST_MAX_DEPTH,
  DIGEST_MAX_NODES,
  FND_DIGEST_INVALID,
} from "./types";

export {
  FND_DIGEST_UNSUPPORTED_TYPE,
  FND_DIGEST_INVALID_NUMBER,
  FND_DIGEST_CYCLE,
  FND_DIGEST_DEPTH,
  FND_DIGEST_TOO_LARGE,
  createDigestError,
  throwDigestError,
} from "./errors";

export { isPlainObject, normalizeFiniteNumber, assertPlainObject } from "./normalize";

export { canonicalize } from "./canonicalize";

export { isDigest, parseDigest, assertDigest } from "./validate";

export { sha256Hex, toDigestWire } from "./hash";

export {
  digestBytes,
  digestCanonical,
  digestObject,
  createDigest,
} from "./create";

export { compareDigest } from "./compare";
