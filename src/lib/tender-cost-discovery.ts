/**
 * P2-E.1 — uniwersalne wykrywanie dokumentów kosztorysowych (ATH/NOR/XML/XLS/ZIP).
 */

import { isKosztorysPreviewExt } from "@/lib/ath-parser";
import { is7zFilename, isXlsxFilename, isZipFilename } from "@/lib/tenders-bzp-filename";

export type TenderCostDocumentType =
  | "ath"
  | "nor"
  | "xml"
  | "xls"
  | "xlsx"
  | "zip_ath"
  | "zip_nor"
  | "zip_xml"
  | "zip_xls"
  | "zip_xlsx"
  | "none";

export interface TenderCostDiscoveryResult {
  found: boolean;
  type: TenderCostDocumentType;
  source: string;
  confidence: number;
}

export interface TenderCostCandidate {
  filename: string;
  score?: number;
  zipInnerPath?: string;
  documentIndex?: number;
}

function baseName(filename: string): string {
  return (filename.split(" → ").pop() ?? filename).toLowerCase();
}

function isNorFilename(name: string): boolean {
  return /\.nor$/i.test(name);
}

function isXmlKosztorysFilename(name: string): boolean {
  return /\.xml$/i.test(name);
}

function isXlsOnlyFilename(name: string): boolean {
  return /\.xls$/i.test(name) && !/\.xlsx$/i.test(name);
}

/** Klasyfikacja pojedynczego pliku (outer lub inner w ZIP). */
export function classifyCostDocumentType(filename: string): {
  type: TenderCostDocumentType;
  confidence: number;
} {
  const base = baseName(filename);
  const inZip = filename.includes(" → ");

  if (isNorFilename(base)) {
    const t: TenderCostDocumentType = inZip ? "zip_nor" : "nor";
    return { type: t, confidence: 0.95 };
  }
  if (isXmlKosztorysFilename(base)) {
    const t: TenderCostDocumentType = inZip ? "zip_xml" : "xml";
    return { type: t, confidence: 0.9 };
  }
  if (/\.ath$/i.test(base)) {
    const t: TenderCostDocumentType = inZip ? "zip_ath" : "ath";
    return { type: t, confidence: 0.98 };
  }
  if (isXlsxFilename(base)) {
    const t: TenderCostDocumentType = inZip ? "zip_xlsx" : "xlsx";
    return { type: t, confidence: /koszt|przedm|obmiar/i.test(base) ? 0.88 : 0.72 };
  }
  if (isXlsOnlyFilename(base)) {
    const t: TenderCostDocumentType = inZip ? "zip_xls" : "xls";
    return { type: t, confidence: /koszt|przedm|obmiar/i.test(base) ? 0.85 : 0.68 };
  }
  if (isKosztorysPreviewExt(base)) {
    return { type: inZip ? "zip_ath" : "ath", confidence: 0.85 };
  }
  if ((isZipFilename(base) || is7zFilename(base)) && !inZip) {
    return { type: "none", confidence: 0.3 };
  }
  return { type: "none", confidence: 0 };
}

const COST_TYPE_PRIORITY: Record<TenderCostDocumentType, number> = {
  ath: 0,
  nor: 1,
  xml: 2,
  zip_ath: 3,
  zip_nor: 4,
  zip_xml: 5,
  xlsx: 6,
  zip_xlsx: 7,
  xls: 8,
  zip_xls: 9,
  none: 99,
};

/** Priorytet: ATH/NOR/XML > XLS/XLSX > ZIP zawierający powyższe. */
export function discoverBestCostDocument(
  candidates: TenderCostCandidate[],
): TenderCostDiscoveryResult {
  let best: TenderCostDiscoveryResult = {
    found: false,
    type: "none",
    source: "",
    confidence: 0,
  };

  for (const cand of candidates) {
    const { type, confidence } = classifyCostDocumentType(cand.filename);
    if (type === "none") continue;
    const scoreBoost = (cand.score ?? 0) / 100;
    const effective = Math.min(0.99, confidence + scoreBoost * 0.05);
    const priority = COST_TYPE_PRIORITY[type];
    const bestPriority = COST_TYPE_PRIORITY[best.type];
    const better =
      priority < bestPriority
      || (priority === bestPriority && effective > best.confidence);
    if (better) {
      best = { found: true, type, source: cand.filename, confidence: effective };
    }
  }

  return best;
}

export function costTypeDisplayLabel(type: TenderCostDocumentType): string {
  switch (type) {
    case "ath": return "ATH";
    case "nor": return "NOR";
    case "xml": return "XML";
    case "xls": return "XLS";
    case "xlsx": return "XLSX";
    case "zip_ath": return "ATH (w ZIP)";
    case "zip_nor": return "NOR (w ZIP)";
    case "zip_xml": return "XML (w ZIP)";
    case "zip_xls": return "XLS (w ZIP)";
    case "zip_xlsx": return "XLSX (w ZIP)";
    default: return "";
  }
}
