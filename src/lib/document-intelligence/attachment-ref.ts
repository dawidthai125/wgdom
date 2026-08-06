/**
 * COND-8g — AttachmentRef normalization (2E, Załącznik nr …).
 */

import type { AttachmentRefResult } from "./types";
import { createEvidence } from "./evidence";
import type { DiEvidence } from "./types";

const REF_PATTERNS: RegExp[] = [
  /\bza[łl][aą]cznik\s*(?:nr\.?\s*)?([0-9]+[A-Za-z]?)\b/i,
  /\bzal\.?\s*(?:nr\.?\s*)?([0-9]+[A-Za-z]?)\b/i,
  /\bannex\s*(?:no\.?\s*)?([0-9]+[A-Za-z]?)\b/i,
  /\b(?:nr\.?\s*)?([0-9]+[A-Za-z])\b(?=.*(?:wykaz|zakres|przedmiar|kosztorys|swz|opz))/i,
];

export function normalizeAttachmentToken(raw: string): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function extractAttachmentRef(filename: string): AttachmentRefResult {
  const name = String(filename || "");
  const aliases: string[] = [];
  let best: string | null = null;
  let confidence: AttachmentRefResult["confidence"] = "low";

  for (const re of REF_PATTERNS) {
    const m = name.match(re);
    if (m?.[1]) {
      const tok = normalizeAttachmentToken(m[1]);
      if (!best) {
        best = tok;
        confidence = /za[łl][aą]cznik|zal\.?/i.test(m[0]) ? "high" : "medium";
      }
      aliases.push(tok);
    }
  }

  // Explicit "2E" / "_2E_" style near WYKAZ / zakres (UX_A case)
  if (!best) {
    const m2 = name.match(/(?:^|[^A-Za-z0-9])([0-9]{1,2}[A-Za-z])(?:[^A-Za-z0-9]|$)/);
    if (m2?.[1] && /wykaz|zakres|rzeczowo|finansow|za[łl][aą]cznik/i.test(name)) {
      best = normalizeAttachmentToken(m2[1]);
      confidence = "medium";
      aliases.push(best);
    }
  }

  const uniqueAliases = [...new Set(aliases)];
  const ambiguous = uniqueAliases.length > 1 && new Set(uniqueAliases).size > 1;

  return {
    attachmentRef: best,
    familyKey: best ? `att:${best.replace(/[A-Z]+$/i, "")}` : null,
    memberKey: best,
    aliases: uniqueAliases,
    confidence: best ? confidence : "low",
    ambiguous,
  };
}

export function attachmentRefEvidence(ref: AttachmentRefResult): DiEvidence | null {
  if (!ref.attachmentRef) return null;
  return createEvidence({
    source: "AttachmentRef",
    polarity: "support",
    evidenceStrength: ref.confidence === "high" ? "HIGH" : ref.confidence === "medium" ? "MEDIUM" : "LOW",
    summary: `AttachmentRef=${ref.attachmentRef}`,
    detail: ref.ambiguous ? "ambiguous aliases" : undefined,
    atPass: "P0-ref",
  });
}
