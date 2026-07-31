/**
 * AP2-S1 — DocumentRole rozszerzony (filename + opcjonalne hinty z dossier).
 * REUSE: istniejące ATH/PDF/ZIP helpers — bez nowego parsera treści.
 */

import { is7zFilename, isDocxFilename, isXlsxFilename, isZipFilename } from "@/lib/tenders-bzp-filename";
import { isKosztorysPreviewExt, isPdfFilename } from "@/lib/ath-parser";

export { is7zFilename };

export type DocumentRole =
  | "swz"
  | "swz_modification"
  | "opz"
  | "stwior"
  | "obmiar"
  | "przedmiar"
  | "kosztorys"
  | "kosztorys_ofertowy"
  | "formularz"
  | "umowa"
  | "projekt_wykonawczy"
  | "projekt_budowlany"
  | "dokumentacja_techniczna"
  | "rysunki"
  | "oswiadczenia"
  | "zalacznik_formalny"
  | "odpowiedzi_pytania"
  | "aneks"
  | "unknown";

/** Opcjonalne sygnały z już sparsowanego dossier / SWZ (nie raw PDF). */
export interface DocumentRoleContentHints {
  /** Źródło kosztorysu/przedmiaru z costDiscovery. */
  costDiscoverySource?: string | null;
  costDiscoveryType?: string | null;
  /** true gdy resolvedCostStatus === FOUND_WITH_VALUE dla tego źródła. */
  pricedKosztorys?: boolean;
  /** true gdy FOUND_NO_VALUE / pdf_przedmiar. */
  przedmiarParsed?: boolean;
  isSwzHint?: boolean;
  /** Fragmenty / flagi z analizy SWZ (już w item.swzAnalysis). */
  hasSwzAnalysis?: boolean;
}

function foldName(filename: string): string {
  return (filename.split(" → ").pop() ?? filename)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/**
 * Klasyfikacja roli po nazwie pliku (SSOT).
 * Kolejność: najbardziej specyficzne wzorce pierwsze.
 */
export function classifyDocumentRole(filename: string): DocumentRole {
  const base = foldName(filename);

  if (/modyfik.*swz|swz.*modyfik|zmian.*swz|zmiana\s+swz/.test(base)) return "swz_modification";
  if (/\baneks\b|aneks[_\s.-]?\d/.test(base)) return "aneks";
  if (/odpowiedz.*(pytan|wyjasn)|wyjasnien.*(swz|zamawia)|pytania[_\s.-]*i[_\s.-]*odpowiedzi|\bq&a\b|qa[_\s.-]*wykonaw|odpowiedzi[_\s.-]*na[_\s.-]*pytan/.test(base)) {
    return "odpowiedzi_pytania";
  }
  if (/stwior|stwi[^o]|stwi\b/.test(base)) return "stwior";
  if (/przedmiar|\bboq\b|bill[_\s.-]*of[_\s.-]*quantit|kosztorys[_\s.-]*slep|\bslepy\b/.test(base)) {
    return "przedmiar";
  }
  if (/obmiar/.test(base)) return "obmiar";
  if (/kosztorys.*ofert|ofertow.*kosztorys/.test(base)) return "kosztorys_ofertowy";
  if (/kosztorys/.test(base) || isKosztorysPreviewExt(base)) return "kosztorys";
  if (/^opz\b|^opz[_\s.-]|[_\s-]opz[_\s.-]|opis przedmiotu zamowienia|opis przedmiotu/.test(base) && !/modyfik/.test(base)) {
    return "opz";
  }
  if (/^swz\b|[_\s-]swz[_\s.-]|specyfikac/.test(base) && !/modyfik/.test(base)) return "swz";
  if (/projekt[_\s.-]*wykonaw|p\.?\s*wykonawcz/.test(base)) return "projekt_wykonawczy";
  if (/projekt[_\s.-]*budowl|p\.?\s*budowlany/.test(base)) return "projekt_budowlany";
  if (/dokumentac(ja|ji)[_\s.-]*techn/.test(base)) return "dokumentacja_techniczna";
  if (/\brysun|\brzut\b|schemat|\.dwg\b|\.dxf\b|plan[_\s.-]*sytuac/.test(base)) return "rysunki";
  if (/oswiadczen|oswiadczenie|jednolite[_\s.-]*europejskie|jesp\b|espd\b|jedz\b/.test(base)) return "oswiadczenia";
  if (/pelnomocnictw|referencj|polisa|wadium.*gwaranc|zalacznik[_\s.-]*formal/.test(base)) {
    return "zalacznik_formalny";
  }
  if (/wzor[_\s.-]*umow|umow[_\s.-]*wzor|projekt[_\s.-]*umow|umowa[_\s.-]*wzor/.test(base)) return "umowa";
  if (/formularz|ofert/.test(base) || isDocxFilename(base)) return "formularz";
  if (isXlsxFilename(base)) return "przedmiar";
  if (isPdfFilename(base) && /obmiar|przedmiar/.test(base)) return "obmiar";
  if (isZipFilename(base) || is7zFilename(base)) return "unknown";
  if (isPdfFilename(base)) return "unknown";
  return "unknown";
}

/**
 * AP2-S1 — rola z uwzględnieniem sygnałów dossier (REUSE parse results).
 * Nie czyta raw PDF — tylko już wyliczone hinty.
 */
export function classifyDocumentRoleWithHints(
  filename: string,
  hints?: DocumentRoleContentHints | null,
): DocumentRole {
  const fromName = classifyDocumentRole(filename);
  if (!hints) return fromName;

  const base = foldName(filename);
  const costSrc = (hints.costDiscoverySource ?? "").toLowerCase();
  const matchesCostSrc = Boolean(costSrc && (base.includes(foldName(costSrc)) || costSrc.includes(base)));

  if (hints.isSwzHint || hints.hasSwzAnalysis) {
    if (fromName === "unknown" && (hints.isSwzHint || /swz|specyfikac/.test(base))) return "swz";
  }

  if (matchesCostSrc || (hints.costDiscoverySource && foldName(hints.costDiscoverySource) === base)) {
    if (hints.pricedKosztorys) return "kosztorys";
    if (hints.przedmiarParsed) {
      if (fromName === "kosztorys") return "kosztorys";
      return "przedmiar";
    }
    const t = (hints.costDiscoveryType ?? "").toLowerCase();
    if (/pdf_przedmiar|przedmiar/.test(t)) return "przedmiar";
    if (/ath|nor|xml|xls/.test(t) && hints.pricedKosztorys) return "kosztorys";
  }

  return fromName;
}

export function roleParsePriority(role: DocumentRole): number {
  switch (role) {
    case "swz_modification": return 0;
    case "swz": return 1;
    case "opz": return 2;
    case "stwior": return 3;
    case "kosztorys": return 4;
    case "kosztorys_ofertowy": return 4;
    case "przedmiar": return 5;
    case "obmiar": return 6;
    case "formularz": return 7;
    case "umowa": return 7;
    case "odpowiedzi_pytania": return 7;
    case "aneks": return 7;
    case "projekt_wykonawczy":
    case "projekt_budowlany":
    case "dokumentacja_techniczna":
    case "rysunki":
      return 8;
    case "oswiadczenia":
    case "zalacznik_formalny":
      return 8;
    default: return 9;
  }
}

export function shouldParseRoleForDossier(role: DocumentRole, score: number): boolean {
  if (roleParsePriority(role) <= 8) return true;
  return score >= 8;
}

export const DOCUMENT_ROLE_LABEL_PL: Record<DocumentRole, string> = {
  swz: "SWZ",
  swz_modification: "Zmiany SWZ",
  opz: "OPZ",
  stwior: "STWiOR",
  obmiar: "Obmiar",
  przedmiar: "Przedmiar",
  kosztorys: "Kosztorys inwestorski",
  kosztorys_ofertowy: "Kosztorys ofertowy",
  formularz: "Formularz ofertowy",
  umowa: "Umowa",
  projekt_wykonawczy: "Projekt wykonawczy",
  projekt_budowlany: "Projekt budowlany",
  dokumentacja_techniczna: "Dokumentacja techniczna",
  rysunki: "Rysunki",
  oswiadczenia: "Oświadczenia",
  zalacznik_formalny: "Załącznik formalny",
  odpowiedzi_pytania: "Odpowiedzi na pytania",
  aneks: "Aneks",
  unknown: "Inny dokument",
};
