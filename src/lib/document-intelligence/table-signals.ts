/**
 * Pass-3 Table signals + COND-5 Active Search dictionary (REUSE SIGNAL_CHECKS).
 */

import { detectPdfPrzedmiarSignals } from "../pdf-przedmiar-heuristic";
import { createEvidence } from "./evidence";
import type { DiEvidence } from "./types";

/** COND-5 Active Search — extra BOQ tokens beyond SIGNAL_CHECKS. */
export const ACTIVE_SEARCH_TOKENS: readonly string[] = [
  "podstawa",
  "nakład",
  "naklad",
  "robocizna",
  "materiał",
  "material",
  "sprzęt",
  "sprzet",
  "r-m-s",
  "rms",
  "jednostka",
  "j.m.",
  "jm.",
  "ilość",
  "ilosc",
  "pozycja",
  "lp.",
];

const SIGNAL_CHECK_COUNT = 5;

export function scoreTableSignals(text: string): {
  tableScore: number;
  matchedLabels: string[];
  evidence: DiEvidence[];
} {
  const raw = String(text || "");
  if (!raw.trim()) {
    return { tableScore: 0, matchedLabels: [], evidence: [] };
  }

  // REUSE detectPdfPrzedmiarSignals → SIGNAL_CHECKS ids
  const matchedLabels = detectPdfPrzedmiarSignals(raw);
  const base = Math.min(1, matchedLabels.length / SIGNAL_CHECK_COUNT);

  const lower = raw.toLowerCase();
  let activeHits = 0;
  const activeMatched: string[] = [];
  for (const tok of ACTIVE_SEARCH_TOKENS) {
    if (lower.includes(tok.toLowerCase())) {
      activeHits += 1;
      activeMatched.push(tok);
    }
  }
  const activeBoost = Math.min(0.25, activeHits * 0.04);
  const tableScore = Math.min(
    1,
    base * 0.85 + activeBoost + (matchedLabels.length >= 3 ? 0.1 : 0),
  );

  const evidence: DiEvidence[] = [];
  if (matchedLabels.length > 0) {
    evidence.push(
      createEvidence({
        source: "Table",
        polarity: "support",
        evidenceStrength: matchedLabels.length >= 3 ? "HIGH" : "MEDIUM",
        summary: `Table signals: ${matchedLabels.slice(0, 5).join(", ")}`,
        detail: activeMatched.length
          ? `ActiveSearch: ${activeMatched.slice(0, 6).join(", ")}`
          : undefined,
        atPass: "P3",
      }),
    );
  } else if (activeHits >= 2) {
    evidence.push(
      createEvidence({
        source: "Table",
        polarity: "support",
        evidenceStrength: "LOW",
        summary: `ActiveSearch soft hits: ${activeMatched.slice(0, 5).join(", ")}`,
        atPass: "P3",
      }),
    );
  }

  return { tableScore, matchedLabels, evidence };
}
