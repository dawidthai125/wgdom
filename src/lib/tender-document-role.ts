/** Klasyfikacja roli dokumentu przetargowego (P2-E.0). */

import { isDocxFilename, isXlsxFilename, isZipFilename } from "@/lib/tenders-bzp-filename";
import { isKosztorysPreviewExt, isPdfFilename } from "@/lib/ath-parser";

export type DocumentRole =
  | "swz"
  | "swz_modification"
  | "opz"
  | "stwior"
  | "obmiar"
  | "przedmiar"
  | "kosztorys"
  | "formularz"
  | "unknown";

export function is7zFilename(name: string): boolean {
  return /\.7z$/i.test(name);
}

export function classifyDocumentRole(filename: string): DocumentRole {
  const n = filename.toLowerCase();
  const base = n.split(" → ").pop() ?? n;
  if (/modyfik.*swz|swz.*modyfik|zmian.*swz/.test(base)) return "swz_modification";
  if (/stwior|stwi[^o]|stwi\b/.test(base)) return "stwior";
  if (/przedmiar/.test(base)) return "przedmiar";
  if (/obmiar/.test(base)) return "obmiar";
  if (/kosztorys/.test(base) || isKosztorysPreviewExt(base)) return "kosztorys";
  if (/^opz\b|^opz[_\s.-]|[_\s-]opz[_\s.-]|opis przedmiotu zamówienia|opis przedmiotu/.test(base) && !/modyfik/.test(base)) {
    return "opz";
  }
  if (/^swz\b|[_\s-]swz[_\s.-]|specyfikac/.test(base) && !/modyfik/.test(base)) return "swz";
  if (/formularz|ofert/.test(base) || isDocxFilename(base)) return "formularz";
  if (isXlsxFilename(base)) return "przedmiar";
  if (isPdfFilename(base) && /obmiar|przedmiar/.test(base)) return "obmiar";
  if (isZipFilename(base) || is7zFilename(base)) return "unknown";
  if (isPdfFilename(base)) return "unknown";
  return "unknown";
}

export function roleParsePriority(role: DocumentRole): number {
  switch (role) {
    case "swz_modification": return 0;
    case "swz": return 1;
    case "opz": return 2;
    case "stwior": return 3;
    case "kosztorys": return 4;
    case "przedmiar": return 5;
    case "obmiar": return 6;
    case "formularz": return 7;
    default: return 9;
  }
}

export function shouldParseRoleForDossier(role: DocumentRole, score: number): boolean {
  if (roleParsePriority(role) <= 7) return true;
  return score >= 8;
}
