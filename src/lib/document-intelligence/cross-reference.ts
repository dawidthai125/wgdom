/**
 * COND-8e — Cross-reference boost only (limited Phase A sources).
 */

import { normalizeAttachmentToken } from "./attachment-ref";
import { createEvidence } from "./evidence";
import type { DiEvidence } from "./types";
import { DI_XREF_SOURCE_CAP } from "./types";

const REF_IN_TEXT =
  /za[łl][aą]cznik(?:u|iem)?\s*(?:nr\.?\s*)?([0-9]+[A-Za-z]?)/gi;

export function collectCrossRefBoost(input: {
  attachmentRef: string | null;
  crossRefSourceTexts?: readonly { filename: string; text: string }[];
}): { boost: number; evidence: DiEvidence[] } {
  const ref = input.attachmentRef ? normalizeAttachmentToken(input.attachmentRef) : null;
  if (!ref) return { boost: 0, evidence: [] };

  const sources = (input.crossRefSourceTexts ?? []).slice(0, DI_XREF_SOURCE_CAP);
  let hits = 0;
  const fromFiles: string[] = [];

  for (const src of sources) {
    const text = String(src.text || "");
    let m: RegExpExecArray | null;
    const re = new RegExp(REF_IN_TEXT.source, "gi");
    while ((m = re.exec(text)) !== null) {
      if (normalizeAttachmentToken(m[1]) === ref) {
        hits += 1;
        fromFiles.push(src.filename);
        break;
      }
    }
  }

  if (hits === 0) return { boost: 0, evidence: [] };

  const boost = Math.min(0.15, hits * 0.08);
  return {
    boost,
    evidence: [
      createEvidence({
        source: "CrossReference",
        polarity: "support",
        evidenceStrength: hits >= 2 ? "HIGH" : "MEDIUM",
        summary: `XRef mentions AttachmentRef=${ref}`,
        detail: fromFiles.slice(0, 3).join(", "),
        atPass: "P5-xref",
      }),
    ],
  };
}
