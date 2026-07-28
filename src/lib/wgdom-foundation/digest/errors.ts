/**
 * FND-02a — kody błędów Canonical Digest + factory (FOUNDATION-09).
 */

export const FND_DIGEST_UNSUPPORTED_TYPE = "FND_DIGEST_UNSUPPORTED_TYPE";
export const FND_DIGEST_INVALID_NUMBER = "FND_DIGEST_INVALID_NUMBER";
export const FND_DIGEST_CYCLE = "FND_DIGEST_CYCLE";
export const FND_DIGEST_DEPTH = "FND_DIGEST_DEPTH";
export const FND_DIGEST_TOO_LARGE = "FND_DIGEST_TOO_LARGE";

export function createDigestError(code: string, message: string): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

export function throwDigestError(code: string, message: string): never {
  throw createDigestError(code, message);
}
