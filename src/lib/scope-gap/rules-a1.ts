/**
 * SCOPE-COMPLETENESS-01 Stage A — rules pack a1 (RO).
 * DF: depth tokenów/templates na allowlist 6 kodów MVP — bez nowych RuleCode.
 * REUSE: normalize + resolveInvestmentTemplate z rules-mvp-1.
 */

import type {
  ScopeGapInvestmentTemplate,
  ScopeGapRuleCode,
  ScopeGapSeverity,
} from "./types";
import {
  hasAnyToken,
  normalizeScopeGapText,
  resolveInvestmentTemplate,
} from "./rules-mvp-1";

export { normalizeScopeGapText, resolveInvestmentTemplate, hasAnyToken };

/** Tokeny present — depth Stage A (synonimy PL, bez nowych kodów). */
export const SCOPE_GAP_A1_PRESENT_TOKENS: Record<ScopeGapRuleCode, readonly string[]> = {
  WASTE_DISPOSAL: [
    "wywoz",
    "wywóz",
    "gruz",
    "gruzu",
    "kontener",
    "utylizacj",
    "utylizacja",
    "odpad",
    "odpady",
    "odpadow",
    "skladowisk",
    "wysypisk",
    "nieczystosc",
    "pobranie odpad",
  ],
  PREP_WORKS: [
    "przygotowaw",
    "przygotowanie podloza",
    "przygotowanie podłoża",
    "rozebranie",
    "demonta",
    "demontaz",
    "skucie",
    "odkucie",
    "rozbiork",
    "rozbior",
    "zerwanie",
  ],
  PROTECTION: [
    "zabezpiecz",
    "zabezpieczenie",
    "folia",
    "foliowan",
    "oslona",
    "oslony",
    "bariera",
    "oslon",
    "ochrona powierzchni",
  ],
  MEASUREMENTS: [
    "pomiar",
    "pomiary",
    "rcd",
    "protokol pomiar",
    "pomiary elektry",
    "pomiary ochronne",
    "sprawdzenie rcd",
  ],
  SCAFFOLDING: ["rusztowan", "rusztowanie", "podest roboczy", "podesty robocze"],
  TRAFFIC_ORG: [
    "organizacja ruchu",
    "organizacje ruchu",
    "zajecie pasa",
    "zajęcie pasa",
    "oznakowanie drogow",
    "oznakowanie tymczasow",
    "tymczasowa organizacja",
  ],
};

export const SCOPE_GAP_A1_LABEL_PL: Record<ScopeGapRuleCode, string> = {
  WASTE_DISPOSAL: "Wywóz / utylizacja odpadów",
  PREP_WORKS: "Roboty przygotowawcze / demontaż",
  PROTECTION: "Zabezpieczenie powierzchni / obiektu",
  MEASUREMENTS: "Pomiary / protokoły",
  SCAFFOLDING: "Rusztowania",
  TRAFFIC_ORG: "Organizacja ruchu",
};

const EXPECTED_BY_TEMPLATE: Record<ScopeGapInvestmentTemplate, readonly ScopeGapRuleCode[]> = {
  pustostan_remont: ["WASTE_DISPOSAL", "PREP_WORKS", "PROTECTION", "MEASUREMENTS"],
  elewacja: ["SCAFFOLDING", "PROTECTION", "WASTE_DISPOSAL", "TRAFFIC_ORG"],
  instalacje: ["MEASUREMENTS", "PREP_WORKS"],
  generic_unknown: [],
};

const DEMOL_HINT_TOKENS = [
  "demol",
  "rozbior",
  "rozbiork",
  "wyburz",
  "skucie",
  "rozebran",
] as const;

export function expectedCodesForTemplateA1(
  template: ScopeGapInvestmentTemplate,
  presentNormalized: string,
): readonly ScopeGapRuleCode[] {
  if (template === "generic_unknown") {
    if (hasAnyToken(presentNormalized, DEMOL_HINT_TOKENS)) {
      return ["WASTE_DISPOSAL"];
    }
    return [];
  }
  return EXPECTED_BY_TEMPLATE[template];
}

export function isCodePresentInBlobA1(code: ScopeGapRuleCode, blobNormalized: string): boolean {
  return hasAnyToken(blobNormalized, SCOPE_GAP_A1_PRESENT_TOKENS[code]);
}

export function severityForGapA1(opts: {
  template: ScopeGapInvestmentTemplate;
  code: ScopeGapRuleCode;
  swzHit: boolean;
}): { severity: ScopeGapSeverity; confidence: number } {
  if (opts.template === "generic_unknown" && opts.code === "WASTE_DISPOSAL") {
    return { severity: "warn", confidence: 0.45 };
  }
  if (opts.swzHit) {
    return { severity: "high", confidence: 0.75 };
  }
  return { severity: "warn", confidence: 0.55 };
}

export function rationaleForGapA1(opts: {
  code: ScopeGapRuleCode;
  template: ScopeGapInvestmentTemplate;
  swzHit: boolean;
}): string {
  const label = SCOPE_GAP_A1_LABEL_PL[opts.code];
  if (opts.swzHit) {
    return `W typowym zakresie (${opts.template}) oczekiwane: ${label}. Brak w przedmiarze, a SWZ sugeruje potrzebę.`;
  }
  return `W typowym zakresie (${opts.template}) zwykle występuje: ${label}. Nie wykryto w opisach pozycji.`;
}
