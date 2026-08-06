/**
 * COND-6 — Duplicate detection minimal (fingerprint); no second SSOT.
 */

import { createEvidence } from "./evidence";
import type { DiEvidence } from "./types";

export function duplicateFingerprint(input: {
  filename: string;
  byteLength?: number;
  textHead?: string;
}): string {
  const name = String(input.filename || "")
    .toLowerCase()
    .replace(/^.*[\\/]/, "")
    .replace(/\s+/g, " ")
    .trim();
  const len = input.byteLength ?? 0;
  const head = String(input.textHead || "")
    .slice(0, 120)
    .toLowerCase()
    .replace(/\s+/g, " ");
  return `${name}|${len}|${head.length}:${simpleHash(head)}`;
}

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

export function detectDuplicate(
  fp: string,
  seen: Map<string, string>,
  candidateKey: string,
): { duplicateOf: string | null; evidence: DiEvidence | null } {
  const prev = seen.get(fp);
  if (prev && prev !== candidateKey) {
    return {
      duplicateOf: prev,
      evidence: createEvidence({
        source: "Duplicate",
        polarity: "neutral",
        evidenceStrength: "MEDIUM",
        summary: `Duplicate of ${prev}`,
        atPass: "P5-dup",
      }),
    };
  }
  seen.set(fp, candidateKey);
  return { duplicateOf: null, evidence: null };
}
