/**
 * FND-02b — SHA-256 via Web Crypto (FOUNDATION-09).
 * Zero npm. Wyłącznie crypto.subtle.digest("SHA-256").
 */

import { DIGEST_ALGORITHM, DIGEST_PREFIX_V1, type DigestV1 } from "./types";

/** SHA-256 → 64 lowercase hex. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest(DIGEST_ALGORITHM, bytes);
  const arr = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < arr.length; i++) {
    hex += arr[i]!.toString(16).padStart(2, "0");
  }
  return hex;
}

/** Składa wire format v1: `d1_` + hex64. */
export function toDigestWire(hex: string): DigestV1 {
  return `${DIGEST_PREFIX_V1}${hex}` as DigestV1;
}
