/**
 * Scope Gap MVP — pack expected + keywords present (scope-gap-mvp-1).
 * DF §5 — bez nowych ScopeGapRuleCode poza allowlist.
 */

import type {
  ScopeGapInvestmentTemplate,
  ScopeGapRuleCode,
  ScopeGapSeverity,
} from "./types";

/** Normalizacja whitespace + lowercase (PL substring match). */
export function normalizeScopeGapText(raw: string): string {
  return String(raw ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tokeny present — doprecyzowane bez nowych kodów (Owner GO residual). */
export const SCOPE_GAP_PRESENT_TOKENS: Record<ScopeGapRuleCode, readonly string[]> = {
  WASTE_DISPOSAL: [
    "wywoz",
    "gruz",
    "kontener",
    "utylizacj",
    "odpad",
    "skladowisk",
    "wysypisk",
  ],
  PREP_WORKS: [
    "przygotowaw",
    "rozebranie",
    "demonta",
    "skucie",
    "rozbiork",
    "rozbior",
  ],
  PROTECTION: ["zabezpiecz", "folia", "oslona", "bariera", "oslon"],
  MEASUREMENTS: ["pomiar", "rcd", "protokol pomiar", "pomiary elektry"],
  SCAFFOLDING: ["rusztowan"],
  TRAFFIC_ORG: [
    "organizacja ruchu",
    "zajecie pasa",
    "oznakowanie drogow",
    "oznakowanie tymczasow",
  ],
};

export const SCOPE_GAP_LABEL_PL: Record<ScopeGapRuleCode, string> = {
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

export function expectedCodesForTemplate(
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

export function hasAnyToken(hayNormalized: string, tokens: readonly string[]): boolean {
  if (!hayNormalized) return false;
  for (const t of tokens) {
    if (hayNormalized.includes(t)) return true;
  }
  return false;
}

export function isCodePresentInBlob(code: ScopeGapRuleCode, blobNormalized: string): boolean {
  return hasAnyToken(blobNormalized, SCOPE_GAP_PRESENT_TOKENS[code]);
}

/**
 * Heurystyka tip RO — tytuł / buyer / opc. kategorie linii.
 * Deterministyczna tabela; bez History.
 */
export function resolveInvestmentTemplate(opts: {
  title: string;
  priorityBuyerLabel?: string | null;
  extraHints?: string | null;
}): ScopeGapInvestmentTemplate {
  const hay = normalizeScopeGapText(
    [opts.title, opts.priorityBuyerLabel ?? "", opts.extraHints ?? ""].join(" "),
  );
  if (!hay) return "generic_unknown";

  if (
    hasAnyToken(hay, [
      "elewac",
      "ocieplen",
      "fasad",
      "tynk zewnetrz",
      "docieplen",
    ])
  ) {
    return "elewacja";
  }
  if (
    hasAnyToken(hay, [
      "instalac",
      "elektry",
      "hydraul",
      "wod-kan",
      "wod kan",
      "c.o.",
      "c o ",
      "gazow",
      "sanitar",
    ])
  ) {
    return "instalacje";
  }
  if (
    hasAnyToken(hay, [
      "pustostan",
      "remont",
      "przebudow",
      "modernizacj",
      "wykoncze",
      "wykonczeni",
      "mieszkan",
      "lokalu",
      "lokale",
    ])
  ) {
    return "pustostan_remont";
  }
  return "generic_unknown";
}

export function severityForGap(opts: {
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

export function rationaleForGap(opts: {
  code: ScopeGapRuleCode;
  template: ScopeGapInvestmentTemplate;
  swzHit: boolean;
}): string {
  const label = SCOPE_GAP_LABEL_PL[opts.code];
  if (opts.swzHit) {
    return `W typowym zakresie (${opts.template}) oczekiwane: ${label}. Brak w przedmiarze, a SWZ sugeruje potrzebę.`;
  }
  return `W typowym zakresie (${opts.template}) zwykle występuje: ${label}. Nie wykryto w opisach pozycji.`;
}
