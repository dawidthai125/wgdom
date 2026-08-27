/**
 * Semantic match APF BOQ description → parsed measurement row.
 * No automatic KNR/tableCode binding.
 */

import { isApfBoqUnitQualifiedByPricingBasis } from "./apf-pricing-basis";
import type { ApfParsedMeasurementRow } from "./apf-measurement-html-parse";

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const TOKEN_GROUPS: readonly (readonly string[])[] = [
  ["impedancj", "petli", "petl", "zwarci"],
  ["rezystancj", "izolacj", "izolacji"],
  ["rezystancj", "uziemien", "uziom"],
  ["rcd", "roznico", "roznicow", "wylacznik"],
  ["ciagl", "przewod", "ochronn", "wyrównaw", "wyrównaw"],
  ["obwod", "jednofaz", "1 faz"],
  ["obwod", "trojfaz", "3 faz"],
  ["zerowan", "skuteczn"],
  ["sprawdzen", "pomiar", "obwod"],
];

function scoreSemanticMatch(queryDesc: string, rowDesc: string): number {
  const q = norm(queryDesc);
  const r = norm(rowDesc);
  if (!q || !r) return 0;
  if (q === r) return 100;
  if (r.includes(q) || q.includes(r)) return 90;

  let score = 0;
  for (const group of TOKEN_GROUPS) {
    const qHit = group.some((t) => q.includes(t));
    const rHit = group.some((t) => r.includes(t));
    if (qHit && rHit) score += 15;
  }

  const qTokens = q.split(" ").filter((t) => t.length > 3);
  const rTokens = r.split(" ").filter((t) => t.length > 3);
  for (const t of qTokens) {
    if (rTokens.some((w) => w === t || w.startsWith(t) || t.startsWith(w))) {
      score += 4;
    }
  }
  return score;
}

export function selectApfMeasurementRowsForQuery(input: {
  queryDescription: string;
  queryUnit: string;
  rows: readonly ApfParsedMeasurementRow[];
  minScore?: number;
}): ApfParsedMeasurementRow[] {
  const minScore = input.minScore ?? 12;
  const qualified = input.rows.filter((row) =>
    isApfBoqUnitQualifiedByPricingBasis({
      boqUnit: input.queryUnit,
      pricingBasis: row.pricingBasis,
      sourceDescriptionPl: row.descriptionPl,
    }),
  );
  if (!qualified.length) return [];

  const scored = qualified
    .map((row) => ({
      row,
      score: scoreSemanticMatch(input.queryDescription, row.descriptionPl),
    }))
    .filter((x) => x.score >= minScore)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return [];
  const top = scored[0]!.score;
  return scored.filter((x) => x.score >= top - 5).map((x) => x.row);
}

/** Explicitly absent KNR codes — never inferred from source price alone. */
export const APF_NEVER_INFER_TABLE_CODES = Object.freeze([
  "1202-01",
  "1205-05",
  "1205-06",
  "1303-01",
  "1303-02",
  "1303-03",
  "1303-04",
  "1305-01",
  "1305-02",
] as const);

export function apfObservationHasInferredKnrTableCode(
  tableCode: string | null | undefined,
): boolean {
  if (!tableCode) return false;
  return APF_NEVER_INFER_TABLE_CODES.some((tc) => tableCode.includes(tc));
}
