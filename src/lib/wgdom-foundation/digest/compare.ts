/**
 * FND-02b — compareDigest (FOUNDATION-09).
 * Invalid wire → false (bez throw).
 */

import { isDigest } from "./validate";

/**
 * Porównuje dwa digesty.
 * true tylko gdy oba valid i równe (hex/wire).
 */
export function compareDigest(a: string, b: string): boolean {
  if (!isDigest(a) || !isDigest(b)) return false;
  if (a.length !== b.length) return false;

  // Stałoczasowe porównanie znaków (best-effort w JS).
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
