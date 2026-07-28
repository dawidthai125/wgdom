/**
 * FND-02b — createDigest / digestObject / digestCanonical / digestBytes.
 */

import { canonicalize } from "./canonicalize";
import { sha256Hex, toDigestWire } from "./hash";
import type { DigestV1 } from "./types";

const utf8 = new TextEncoder();

/** Hash gotowych bajtów → wire `d1_<hex64>`. */
export async function digestBytes(bytes: Uint8Array): Promise<DigestV1> {
  const hex = await sha256Hex(bytes);
  return toDigestWire(hex);
}

/** Hash kanonicznego stringa UTF-8. */
export async function digestCanonical(canonical: string): Promise<DigestV1> {
  return digestBytes(utf8.encode(canonical));
}

/** canonicalize(value) + SHA-256 → DigestV1. Główne API domen. */
export async function digestObject(value: unknown): Promise<DigestV1> {
  return digestCanonical(canonicalize(value));
}

/** Alias `digestObject` (parity z FND-01 createId). */
export async function createDigest(value: unknown): Promise<DigestV1> {
  return digestObject(value);
}
