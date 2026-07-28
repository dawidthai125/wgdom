/**
 * COST-MULTI-01 — klasyfikacja branż / relacji (Design Freeze §5–§6).
 */

import {
  classifyCostDocumentType,
  isFormalOfferCostFilename,
  type TenderCostDocumentType,
} from "@/lib/tender-cost-discovery";
import type {
  BranchCode,
  ClassificationConfidence,
  CostDocumentInput,
  CostDocumentRef,
  RelationHint,
  RelationType,
} from "@/lib/cost-multi-01-types";

function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

export function costDocumentDisplayBase(filename: string): string {
  return (filename.split(" → ").pop() ?? filename).trim();
}

export function stableCostDocumentId(input: CostDocumentInput): string {
  const idx = input.documentIndex != null ? String(input.documentIndex) : "x";
  const path = input.zipInnerPath?.trim() || costDocumentDisplayBase(input.filename);
  return `${idx}::${path}`;
}

/** DF §5.2 — heurystyka nazwy → BranchCode. */
export function inferBranchHint(filename: string): BranchCode {
  const h = fold(costDocumentDisplayBase(filename));
  if (/budowlana|ogolnobudowl|konstrukcy/.test(h)) return "construction";
  if (/elektrycz|elektro|teletech/.test(h)) return "electrical";
  if (/sanitar|hydraul|wod[.\s-]?kan|wodkan/.test(h)) return "sanitary";
  if (/hydrant|ppoz|ppoż|tryskacz/.test(h)) return "fire";
  if (/wentyl|klimatyz|\bhvac\b/.test(h)) return "hvac";
  if (/mieszkan|lokal|wytchnieni|wykonc/.test(h)) return "finishes";
  return "unknown";
}

export function collectRelationHints(filename: string): RelationHint[] {
  const h = fold(costDocumentDisplayBase(filename));
  const hints: RelationHint[] = [];
  if (/prawo[\s_]*opcji|\bopcja\b|opcjonaln/.test(h)) hints.push("option");
  if (/wariant|alternatyw|zamienn/.test(h)) hints.push("variant");
  if (/\betap\b|\bfaza\b|czesc\s*[i1]\b|część\s*[i1]\b|\bstage\b/.test(h)) hints.push("stage");
  if (/\brev\b|wersja|_v\d+|v\d+(?:_|\.)|poprawion|aktualiz/.test(h)) hints.push("revision");
  const branch = inferBranchHint(filename);
  if (branch !== "unknown") hints.push(`branch:${branch}`);
  return hints;
}

export function costTypeQualityTier(type: TenderCostDocumentType | "unknown"): number {
  switch (type) {
    case "ath":
    case "zip_ath":
      return 6;
    case "nor":
    case "zip_nor":
      return 5;
    case "xml":
    case "zip_xml":
      return 4;
    case "pdf_przedmiar":
      return 3;
    case "zip_pdf_przedmiar":
      return 2;
    case "xlsx":
    case "zip_xlsx":
    case "xls":
    case "zip_xls":
      return 1;
    default:
      return 0;
  }
}

export function toCostDocumentRef(input: CostDocumentInput): CostDocumentRef {
  const { type } = classifyCostDocumentType(input.filename);
  const costType: TenderCostDocumentType | "unknown" = type === "none" ? "unknown" : type;
  return {
    id: stableCostDocumentId(input),
    filename: input.filename,
    zipInnerPath: input.zipInnerPath,
    costType,
    parseOk: input.parseOk ?? null,
    rowCount: input.rowCount ?? null,
    totalValuePln: input.totalValuePln ?? null,
    branchHint: inferBranchHint(input.filename),
    relationHints: collectRelationHints(input.filename),
    roleInPackage: "held",
    lotKey: input.lotKey ?? null,
  };
}

function basenameKey(filename: string): string {
  return fold(costDocumentDisplayBase(filename))
    .replace(/[^a-z0-9]+/g, "")
    .replace(/(v\d+|rev\d+|wersja\d+)/g, "");
}

function hasHint(doc: CostDocumentRef, hint: RelationHint): boolean {
  return doc.relationHints.includes(hint);
}

/**
 * DF §6.3 — relacja pary. formal_offer obsługiwane poza (exclude), tu zwraca unknown.
 */
export function classifyRelation(
  a: CostDocumentRef,
  b: CostDocumentRef,
): { type: RelationType; confidence: ClassificationConfidence } {
  if (isFormalOfferCostFilename(a.filename) || isFormalOfferCostFilename(b.filename)) {
    return { type: "unknown", confidence: "low" };
  }

  const lotA = a.lotKey?.trim() || null;
  const lotB = b.lotKey?.trim() || null;
  if (lotA && lotB && lotA !== lotB) {
    return { type: "unrelated_lot", confidence: "high" };
  }

  if (hasHint(a, "option") || hasHint(b, "option")) {
    return { type: "option", confidence: "high" };
  }
  if (hasHint(a, "variant") || hasHint(b, "variant")) {
    return { type: "variant", confidence: "high" };
  }
  if (hasHint(a, "stage") || hasHint(b, "stage")) {
    return { type: "stage", confidence: "medium" };
  }

  const ba = a.branchHint;
  const bb = b.branchHint;
  if (ba !== "unknown" && bb !== "unknown" && ba === bb) {
    const ka = basenameKey(a.filename);
    const kb = basenameKey(b.filename);
    if (ka && kb && ka === kb) {
      return { type: "duplicate", confidence: "high" };
    }
    if (hasHint(a, "revision") || hasHint(b, "revision")) {
      return { type: "revision", confidence: "high" };
    }
    return { type: "same_branch", confidence: "high" };
  }

  if (ba !== "unknown" && bb !== "unknown" && ba !== bb) {
    return { type: "other_branch", confidence: "high" };
  }

  if (ba === "unknown" || bb === "unknown") {
    return { type: "unknown", confidence: "low" };
  }

  return { type: "unknown", confidence: "low" };
}

export function branchCodeLabelPl(branch: BranchCode): string {
  switch (branch) {
    case "construction":
      return "budowlana";
    case "electrical":
      return "elektryczna";
    case "sanitary":
      return "sanitarna";
    case "fire":
      return "hydrant/ppoż";
    case "hvac":
      return "HVAC";
    case "finishes":
      return "wykończenia/lokale";
    case "other":
      return "inna";
    default:
      return "nieznana";
  }
}
