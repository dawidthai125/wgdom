/**
 * NG-TENDERS-KNOWLEDGE-FOUNDATION-01 TS-A1 — Match Depth / false-map probes.
 * Pure fixtures — nie silnik matchera WC.
 */

import { foldPlToken } from "@/lib/cost-knowledge/keyword-hygiene";

export interface FalseMapProbe {
  id: string;
  /** Bare / weak surface that must NOT alone map to target work. */
  probeSurface: string;
  /** Work id that must not be claimed from bare probe alone. */
  mustNotMapToWorkId: string;
  reason: string;
}

/**
 * False-map protection probes (Library Depth companions).
 * Matcher / ops must treat bare probe as insufficient for these works.
 */
export const FOUNDATION_FALSE_MAP_PROBES: readonly FalseMapProbe[] = [
  {
    id: "fm-rura",
    probeSurface: "rura",
    mustNotMapToWorkId: "ck-a1-rura-winidur",
    reason: "bare rura ≠ Winidur install",
  },
  {
    id: "fm-gzyms",
    probeSurface: "gzyms",
    mustNotMapToWorkId: "ck-a1-gzyms-elewacyjny",
    reason: "bare gzyms ≠ elewacyjny pack",
  },
  {
    id: "fm-tynk",
    probeSurface: "tynk",
    mustNotMapToWorkId: "kf-a1-tynk-cementowo-wapienny",
    reason: "bare tynk ≠ cementowo-wapienny",
  },
  {
    id: "fm-farba",
    probeSurface: "farba",
    mustNotMapToWorkId: "kf-a1-malowanie-scian-dwukrotne",
    reason: "bare farba ≠ malowanie ścian",
  },
  {
    id: "fm-kabla",
    probeSurface: "kabla",
    mustNotMapToWorkId: "kf-a1-ukladanie-kabla-ydy",
    reason: "bare kabla ≠ YDY run",
  },
] as const;

/**
 * Bare probe must not equal any full multi-word keyword (token-set equality).
 * Returns true when mapping would be a false-map risk.
 */
export function isFalseMapBareProbe(
  probeSurface: string,
  workKeywords: readonly string[],
): boolean {
  const probe = foldPlToken(probeSurface).trim();
  if (!probe || probe.includes(" ")) return false;
  for (const kw of workKeywords) {
    const tokens = foldPlToken(kw).split(/\s+/).filter(Boolean);
    if (tokens.length === 1 && tokens[0] === probe) return true;
    // Bare probe alone matching first token of multi-word is still insufficient —
    // flag as false-map risk when probe equals any single token but keyword is multi-word.
    if (tokens.length >= 2 && tokens.includes(probe)) return true;
  }
  return false;
}

export function assertFalseMapProbeProtected(
  probe: FalseMapProbe,
  workKeywords: readonly string[],
): void {
  if (!isFalseMapBareProbe(probe.probeSurface, workKeywords)) {
    throw new Error(
      `false-map: probe "${probe.probeSurface}" not protected vs keywords for ${probe.mustNotMapToWorkId}`,
    );
  }
}
