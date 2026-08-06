/**
 * COND-8 — Filename Priority ONLY (never reject).
 * COND-8d — Family Priority (detect / shared priority; no merge Phase A).
 */

import type { FilenamePriority } from "./types";
import { createEvidence } from "./evidence";
import type { DiEvidence } from "./types";
import { isDocD1PdfFilename } from "../doc-detection/aliases";
import { isFormalOfferCostFilename } from "../tender-cost-discovery";

const BOOST_RE =
  /przedmiar|kosztorys|\bboq\b|ath|norma|wykaz\s+zakres|zakres\s+rzeczowo|rzeczowo[\s-]*finansow|formularz\s+cenow|oferta\s+cenow/i;

const PENALTY_RE =
  /umow[ay]|(\bswz\b)|(\bopz\b)|siwz|og[łl]oszenie|pe[łl]nomocnictwo|o[sś]wiadczenie|wadium|gwarancja|bankowa|formularz\s+ofert/i;

export function classifyFilenamePriority(filename: string): {
  priority: FilenamePriority;
  reason: string;
} {
  const name = String(filename || "");
  if (isDocD1PdfFilename(name) || isFormalOfferCostFilename(name)) {
    return { priority: "boost", reason: "Doc.D1 / formal cost alias" };
  }
  if (BOOST_RE.test(name)) {
    return { priority: "boost", reason: "quantity/cost keyword in filename" };
  }
  if (PENALTY_RE.test(name) && !/wykaz|przedmiar|kosztorys|zakres\s+rzeczowo/i.test(name)) {
    return { priority: "penalty", reason: "formal/contract keyword without BOQ cue" };
  }
  return { priority: "neutral", reason: "no strong filename cue" };
}

export function filenamePriorityEvidence(
  priority: FilenamePriority,
  reason: string,
): DiEvidence {
  return createEvidence({
    source: "FilenamePriority",
    polarity: priority === "boost" ? "support" : priority === "penalty" ? "contradict" : "neutral",
    evidenceStrength: priority === "boost" ? "MEDIUM" : priority === "penalty" ? "LOW" : "LOW",
    summary: `FilenamePriority=${priority}`,
    detail: reason,
    atPass: "P1",
  });
}

/** Family id from AttachmentRef familyKey + sibling co-occurrence (detect only). */
export function detectFamilyId(input: {
  attachmentRef: string | null;
  familyKey: string | null;
  siblingFilenames?: readonly string[];
}): string | null {
  if (input.familyKey) return input.familyKey;
  if (!input.attachmentRef) return null;
  return `att:${input.attachmentRef.replace(/[A-Z]+$/i, "")}`;
}

export function familyEvidence(familyId: string | null): DiEvidence | null {
  if (!familyId) return null;
  return createEvidence({
    source: "Family",
    polarity: "support",
    evidenceStrength: "LOW",
    summary: `Family=${familyId}`,
    detail: "Phase A detect-only; no composite merge",
    atPass: "P5-family",
  });
}
