/**
 * Pass-4 Negative signals (COND-8a soft-by-filename; mixed SWZ+WYKAZ → content mandatory).
 */

import { createEvidence } from "./evidence";
import type { DiEvidence, FilenamePriority } from "./types";

const NEGATIVE_STRONG_RE =
  /\bumow[ay]\b|pe[łl]nomocnictwo|o[sś]wiadczenie|wadium|gwarancja\s+bankowa|formularz\s+ofertowy|klauzul[ay]\s+umown/i;

const NEGATIVE_FORMAL_RE = /\bswz\b|\bsiwz\b|\bopz\b|og[łl]oszenie\s+o\s+zam[oó]wieniu/i;

const QUANTITY_CUE_RE =
  /wykaz|zakres\s+rzeczowo|przedmiar|kosztorys|rzeczowo[\s-]*finansow|formularz\s+cenow/i;

export interface NegativeSignalResult {
  /** Soft dampen for ranking (0..1 multiplier applied later). */
  dampen: number;
  forceContentMandatory: boolean;
  rankAsFormal: boolean;
  reasons: string[];
  evidence: DiEvidence[];
}

export function detectNegativeSignals(input: {
  filename: string;
  text: string;
  filenamePriority: FilenamePriority;
}): NegativeSignalResult {
  const name = String(input.filename || "");
  const text = String(input.text || "");
  const reasons: string[] = [];
  const evidence: DiEvidence[] = [];
  let dampen = 1;
  let forceContentMandatory = false;
  let rankAsFormal = false;

  const nameHasFormal = NEGATIVE_FORMAL_RE.test(name) || NEGATIVE_STRONG_RE.test(name);
  const nameHasQuantity = QUANTITY_CUE_RE.test(name);
  const textHasFormal = NEGATIVE_FORMAL_RE.test(text) || NEGATIVE_STRONG_RE.test(text);
  const textHasQuantity = QUANTITY_CUE_RE.test(text) || /ilo[sś][cć].{0,40}jednost/i.test(text);

  // COND-8a: mixed SWZ + WYKAZ → content mandatory (do not reject by filename)
  if (nameHasFormal && nameHasQuantity) {
    forceContentMandatory = true;
    reasons.push("mixed formal+quantity filename → content mandatory");
    evidence.push(
      createEvidence({
        source: "Negative",
        polarity: "neutral",
        evidenceStrength: "MEDIUM",
        summary: "Mixed SWZ/formal + quantity cue — content decides",
        atPass: "P4-8a",
      }),
    );
  } else if (nameHasFormal && !nameHasQuantity && input.filenamePriority === "penalty") {
    // Soft dampen only — never hard reject
    dampen = Math.min(dampen, 0.55);
    rankAsFormal = true;
    reasons.push("filename formal soft penalty");
    evidence.push(
      createEvidence({
        source: "Negative",
        polarity: "contradict",
        evidenceStrength: "LOW",
        summary: "Filename formal soft dampen (never reject)",
        atPass: "P4-8a",
      }),
    );
  }

  if (textHasFormal && !textHasQuantity && !forceContentMandatory) {
    dampen = Math.min(dampen, 0.7);
    reasons.push("content formal without quantity");
    evidence.push(
      createEvidence({
        source: "Negative",
        polarity: "contradict",
        evidenceStrength: "MEDIUM",
        summary: "Content formal without quantity cues",
        atPass: "P4",
      }),
    );
    if (!nameHasQuantity) rankAsFormal = true;
  }

  if (NEGATIVE_STRONG_RE.test(name) && !nameHasQuantity) {
    dampen = Math.min(dampen, 0.4);
    rankAsFormal = true;
    reasons.push("strong contract/form filename");
    evidence.push(
      createEvidence({
        source: "Negative",
        polarity: "contradict",
        evidenceStrength: "HIGH",
        summary: "Strong contract/form filename soft dampen",
        atPass: "P4",
      }),
    );
  }

  return { dampen, forceContentMandatory, rankAsFormal, reasons, evidence };
}
