/**
 * FND-02a — Canonical Digest: typy, stałe wersji i limity (FOUNDATION-09/10).
 * Hash / createDigest = FND-02b (poza zakresem).
 */

/** Wire digest v1: `d1_` + 64 lowercase hex. */
export type DigestV1 = string & { readonly __brand: "DigestV1" };

export type ParsedDigest = {
  version: 1;
  algorithm: "SHA-256";
  hex: string;
  wire: DigestV1;
};

/** Prefiks wire format v1 (FOUNDATION-09). */
export const DIGEST_PREFIX_V1 = "d1_";

/** Długość hex SHA-256. */
export const DIGEST_HEX_LENGTH = 64;

/** Algorytm (deklaratywny w parse; hash w FND-02b). */
export const DIGEST_ALGORITHM = "SHA-256" as const;

/** Wersja specyfikacji kanonu / wire. */
export const DIGEST_SPEC_VERSION = 1 as const;

/**
 * Max głębokość zagnieżdżenia (FOUNDATION-10 lock).
 * Root = depth 0; depth > DIGEST_MAX_DEPTH → FND_DIGEST_DEPTH.
 */
export const DIGEST_MAX_DEPTH = 64;

/**
 * Max liczba odwiedzonych węzłów w jednym canonicalize (FOUNDATION-10 lock).
 */
export const DIGEST_MAX_NODES = 100_000;

/** Kod błędu formatu wire / assertDigest. */
export const FND_DIGEST_INVALID = "FND_DIGEST_INVALID";
