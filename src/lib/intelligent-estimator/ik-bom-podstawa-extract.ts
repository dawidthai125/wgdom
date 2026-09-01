/**
 * Extract normative podstawa / table codes from BOQ description — EVIDENCE only.
 * NEVER invents qtyFactor / materialKey / workId.
 */

import {
  buildCatalogBasisFromRawCode,
  extractSecondaryDsecTableCodeHint,
  type CatalogBasis,
} from "@/lib/tenders-bzp-brief";

export type IkBomPodstawaExtract = {
  rawHints: string[];
  catalogBasis: CatalogBasis | null;
  tableCodes: string[];
  familyHints: string[];
  /** Diagnostic only — known conflict hints from description vs wrong workId families. */
  notesPl: string[];
};

const FAMILY_IN_TEXT_RE =
  /\b(KNR-W|KNNR|NNRNKB|ZKNR|KSNR|KNR)\s+(\d{1,4}(?:-\d{1,2})?)?\s*(\d{3,4}-\d{2})?\b/gi;
const TABLE_ONLY_RE = /\b(\d{3,4}-\d{2})\b/g;
const DSEC_TABLE_RE = /\bd\.\d+(?:\.\d+)?\s+(\d{3,4}-\d{2})\b/gi;

/**
 * Parse podstawa signals from line description / optional catalogBasis.
 */
export function extractIkBomPodstawaEvidence(opts: {
  description: string;
  catalogBasisRaw?: string | null;
}): IkBomPodstawaExtract {
  const description = String(opts.description ?? "");
  const rawHints: string[] = [];
  const tableCodes = new Set<string>();
  const familyHints = new Set<string>();
  const notesPl: string[] = [];

  const fromRaw = opts.catalogBasisRaw
    ? buildCatalogBasisFromRawCode(opts.catalogBasisRaw)
    : null;
  if (fromRaw) {
    rawHints.push(fromRaw.rawCode);
    if (fromRaw.tableCode) tableCodes.add(fromRaw.tableCode);
    if (fromRaw.family) familyHints.add(fromRaw.family);
  }

  for (const m of description.matchAll(FAMILY_IN_TEXT_RE)) {
    const fam = String(m[1] ?? "").toUpperCase();
    const catalogId = m[2] ? String(m[2]).trim() : "";
    const table = m[3] ? String(m[3]).trim() : "";
    familyHints.add(fam);
    if (table) tableCodes.add(table);
    const rebuilt = [fam, catalogId, table].filter(Boolean).join(" ");
    if (rebuilt) rawHints.push(rebuilt);
  }

  for (const m of description.matchAll(DSEC_TABLE_RE)) {
    tableCodes.add(m[1]!);
  }
  for (const m of description.matchAll(TABLE_ONLY_RE)) {
    tableCodes.add(m[1]!);
  }

  const secondary = extractSecondaryDsecTableCodeHint(description);
  if (secondary.kind === "token") tableCodes.add(secondary.token);
  if (secondary.kind === "ambiguous") {
    notesPl.push("AMBIGUOUS_TABLECODE_IN_DESCRIPTION");
  }

  // Prefer richest raw hint for CatalogBasis
  let catalogBasis: CatalogBasis | null = fromRaw;
  for (const hint of rawHints) {
    const b = buildCatalogBasisFromRawCode(hint);
    if (b && b.tableCode) {
      catalogBasis = b;
      break;
    }
    if (!catalogBasis && b) catalogBasis = b;
  }
  if (!catalogBasis && tableCodes.size === 1) {
    const only = [...tableCodes][0]!;
    catalogBasis = buildCatalogBasisFromRawCode(`KNR ${only}`);
    notesPl.push("TABLE_CODE_ONLY_ASSUMED_FAMILY_KNR_FOR_LOOKUP_KEY");
  }

  if (tableCodes.has("1124-01")) {
    notesPl.push("HINT_KNR_1124-01_DEMONTAGE_SWITCH_NOT_ETICS");
  }
  if (tableCodes.has("0402-03")) {
    notesPl.push("HINT_KNR_0402-03_RCD_TEST");
  }

  return {
    rawHints: [...new Set(rawHints)],
    catalogBasis,
    tableCodes: [...tableCodes],
    familyHints: [...familyHints],
    notesPl,
  };
}

export function normativeLookupKey(basis: CatalogBasis | null): string | null {
  if (!basis) return null;
  const fam = basis.family || "OTHER";
  const cat = basis.catalogId || "";
  const table = basis.tableCode || "";
  if (!table && !cat) return null;
  return `${fam}|${cat}|${table}`.toUpperCase();
}
