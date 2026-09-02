/**
 * ATH/PDF autonomous reconciliation — canonical normalization before merge hash.
 * Parser representation differences (qty tab/comma, unit punct, KNR suffix) must not
 * trigger CONFLICT_HOLD when semantic content matches.
 */

import { foldContentHash } from "@/lib/multi-boq/line-id";
import { normalizeWgdomCostUnit } from "@/lib/wgdom-cost-catalog";

export type BoqLineSourceKind = "ath" | "pdf" | "other";

export type NormalizeBoqLineInput = {
  lp: string;
  description: string;
  unit: string;
  quantityRaw: string;
  sourceKind?: BoqLineSourceKind;
};

export type NormalizedBoqLine = {
  lp: string;
  description: string;
  descriptionCore: string;
  unit: string;
  unitFamily: string;
  quantityRaw: string;
  quantityCanonical: string;
  quantityNumeric: number | null;
  reconciliationKey: string;
  canonicalContentHash: string;
};

function parseDecimalToken(raw: string): number | null {
  const t = String(raw ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?[\d]+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function formatCanonicalQty(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const fixed = n.toFixed(4).replace(/\.?0+$/, "");
  return fixed || String(n);
}

/** Canonical comparable quantity (ATH tab fields, PL decimal comma). */
export function parseCanonicalQuantity(quantityRaw: string): {
  canonical: string;
  numeric: number | null;
} {
  const s = String(quantityRaw ?? "").trim();
  if (!s) return { canonical: "", numeric: null };

  if (s.includes("\t")) {
    for (const part of s.split(/\t+/).map((p) => p.trim()).filter(Boolean)) {
      const n = parseDecimalToken(part);
      if (n !== null) return { canonical: formatCanonicalQty(n), numeric: n };
    }
  }

  const n = parseDecimalToken(s);
  if (n !== null) return { canonical: formatCanonicalQty(n), numeric: n };
  return { canonical: s, numeric: null };
}

/** Unit family — punctuation only; never merge szt/msc/m2/m3. */
export function normalizeUnitFamily(unit: string): string {
  let u = String(unit ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\.$/, "");
  u = u.replace("²", "2").replace("³", "3");
  if (u === "m" || u === "metr" || u.startsWith("metrbie")) return "mb";
  if (u === "pom") return "pomiar";
  return u;
}

/** Strip proven PDF parser noise (KNR/analogia suffix) — not fuzzy matching. */
export function normalizeDescriptionCore(description: string): string {
  let d = String(description ?? "").trim();
  d = d.replace(/^BC-\d+\s+/i, "");
  d = d.replace(/\s+szt\s+d\.\d+.*$/i, "");
  d = d.replace(/\s+kpl\s+d\.\d+.*$/i, "");
  d = d.replace(/\s+(?:m2|m3|mb|m|szt|kpl)\.?\s+d\.\s*\d+(?:\.\d+)?\s+[\d\-]+(?:\s+[\d\-]+)?\s*/gi, " ");
  d = d.replace(/\s+KNR[\s\d\-AT\.r]+.*$/i, "");
  d = d.replace(/\s+analogia\s*.*$/i, "");
  d = d.replace(/\s+R\*[\d,\.]+\s*.*$/i, "");
  d = d.replace(/\s+[\d,.]+\s*\*\s*[\d,.]+(?:\s*\*\s*[\d,.]+)?\s*$/i, "");
  d = d.replace(/\s+(?:m2|m3|mb|m|szt|kpl)\.?\s+d\.\s*\d+\.?\s*$/i, "");
  d = d.replace(/\s+\d+[,.]\d+\s*\*\s*\d+.*$/i, "");
  d = d.replace(/\s+/g, " ").trim().toLowerCase();
  d = d.replace(/[.,;:\-–—]/g, " ").replace(/\s+/g, " ").trim();
  return d;
}

export function inferBoqLineSourceKind(filenameOrDocId: string): BoqLineSourceKind {
  const f = String(filenameOrDocId ?? "").toLowerCase();
  if (f.includes(".ath")) return "ath";
  if (f.includes(".pdf")) return "pdf";
  return "other";
}

/** PDF line split defect — verb-only stub (RCA Środa LP 5/9/12). */
export function isPdfParserStubDescription(
  description: string,
  descriptionCore?: string,
): boolean {
  const t = String(description ?? "").trim();
  if (/^(?:Wymiana|Montaż|Montaz|Demontaż|Demontaz|Dostawa)$/i.test(t)) return true;
  const core = descriptionCore ?? normalizeDescriptionCore(t);
  return core.length > 0 && core.length < 8;
}

function descriptionCoresSemanticallySame(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 8 && b.startsWith(a)) return true;
  if (b.length >= 8 && a.startsWith(b)) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;
  if (shorter.length >= 12 && longer.startsWith(shorter)) return true;
  const shorterWords = shorter.split(" ").filter((w) => w.length > 2);
  if (shorterWords.length >= 3) {
    const overlap = shorterWords.filter((w) => longer.includes(w)).length;
    if (overlap >= Math.min(shorterWords.length, 4)) return true;
  }
  return false;
}

export function normalizeBoqLineForMerge(input: NormalizeBoqLineInput): NormalizedBoqLine {
  const lp = String(input.lp ?? "").trim();
  const description = String(input.description ?? "").trim();
  const { canonical: quantityCanonical, numeric: quantityNumeric } = parseCanonicalQuantity(
    input.quantityRaw,
  );
  const unitFamily = normalizeUnitFamily(input.unit);
  const descriptionCore = normalizeDescriptionCore(description);
  const reconciliationKey = [lp, descriptionCore, unitFamily, quantityCanonical].join("|");
  const canonicalContentHash = foldContentHash([
    lp,
    descriptionCore,
    unitFamily,
    quantityCanonical,
  ]);

  return {
    lp,
    description,
    descriptionCore,
    unit: String(input.unit ?? "").trim(),
    unitFamily,
    quantityRaw: String(input.quantityRaw ?? "").trim(),
    quantityCanonical,
    quantityNumeric,
    reconciliationKey,
    canonicalContentHash,
  };
}

export function canReconcileAthPdfPair(
  ath: RawSourceLineLike,
  pdf: RawSourceLineLike,
): boolean {
  if (ath.sourceKind !== "ath" || pdf.sourceKind !== "pdf") return false;
  if (ath.lp !== pdf.lp) return false;
  if (ath.normalized.quantityCanonical !== pdf.normalized.quantityCanonical) return false;

  const athCore = ath.normalized.descriptionCore;
  const pdfCore = pdf.normalized.descriptionCore;
  const pdfStub = isPdfParserStubDescription(pdf.description, pdfCore);

  if (ath.normalized.unitFamily !== pdf.normalized.unitFamily) {
    if (!pdfStub) return false;
  }

  if (descriptionCoresSemanticallySame(athCore, pdfCore)) return true;

  if (pdfStub && athCore.length >= 8) {
    if (pdfCore === "wymiana" || athCore.startsWith("wymiana")) return true;
    if (athCore.includes(pdfCore) && pdfCore.length >= 4) return true;
  }

  return false;
}

export type RawSourceLineLike = {
  sourceKind: BoqLineSourceKind;
  lp: string;
  description: string;
  unit: string;
  normalized: NormalizedBoqLine;
};

export function pickPrimaryBoqSourceLine<T extends RawSourceLineLike>(group: T[]): T {
  return [...group].sort((a, b) => {
    const descLen = b.description.length - a.description.length;
    if (descLen !== 0) return descLen;
    const rank = (k: BoqLineSourceKind) => (k === "ath" ? 0 : k === "pdf" ? 1 : 2);
    return rank(a.sourceKind) - rank(b.sourceKind);
  })[0]!;
}

export function buildCanonicalFieldsForReconciledPair(
  ath: RawSourceLineLike,
  pdf: RawSourceLineLike,
): NormalizeBoqLineInput {
  const primary = pickPrimaryBoqSourceLine([ath, pdf]);
  const pdfStub = isPdfParserStubDescription(pdf.description, pdf.normalized.descriptionCore);
  // Default: stub + ATH unit present → keep ATH representation (historical).
  let unit = pdfStub && ath.unit.trim() ? ath.unit : primary.unit;
  // Narrow exception: accepted stub reconciliation with invalid ATH unit + valid PDF unit
  // → use PDF unit (qty unchanged). Not a global PDF-wins / ATH-wins rule.
  if (
    pdfStub &&
    normalizeWgdomCostUnit(ath.unit) === null &&
    normalizeWgdomCostUnit(pdf.unit) !== null
  ) {
    unit = pdf.unit;
  }
  return {
    lp: ath.lp,
    description: primary.description,
    unit,
    quantityRaw: primary.quantityRaw,
    sourceKind: primary.sourceKind,
  };
}
