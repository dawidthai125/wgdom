/**
 * COST-PARSER-01 ZIP-UNPACK — stany A/B/C + copy + HeavyDone gate (pure).
 * REUSE CR-02 archive_candidate — bez redefinicji.
 * P0-RETRY — soft-invalidate F2 Ponów (DF AI-COST-PARSER-01-P0-RETRY).
 */

import { classifyCostDocumentType } from "@/lib/tender-cost-discovery";
import { is7zFilename, isZipFilename } from "@/lib/tenders-bzp-filename";
import {
  DOC_DETECTION_UX_C_ZIP_NOT_FOUND_HINT,
  DOC_DETECTION_UX_C_ZIP_NOT_FOUND_LABEL,
  DOC_DETECTION_UX_C_ZIP_PARSE_FAILED_HINT,
  DOC_DETECTION_UX_C_ZIP_PARSE_FAILED_LABEL,
} from "@/lib/doc-detection";

/** DF §3 — data-cost-parser-zip-state */
export type CostParserZipState = "unpack_failed" | "no_cost_inner" | "parse_failed";

export type CostParserZipUnpackFailReason =
  | "edge_empty"
  | "download_failed"
  | "open_failed"
  | "unknown";

export interface CostParserZipStateInput {
  hasTopLevelZip: boolean;
  /** undefined = legacy dossier bez sygnału → null (CR-02 legacy copy) */
  zipUnpackOk?: boolean | null;
  zipCostInnerPresent?: boolean | null;
  kosztorysOk?: boolean;
}

/** Czy wśród kandydatów jest inner ZIP/7Z o typie kosztowym. */
export function hasZipCostInnerFromCandidates(
  candidates: ReadonlyArray<{ filename: string; zipInnerPath?: string }>,
): boolean {
  for (const c of candidates) {
    if (!c.zipInnerPath) continue;
    const { type } = classifyCostDocumentType(c.filename);
    if (type !== "none") return true;
  }
  return false;
}

/**
 * Klasyfikacja A/B/C (DF §3).
 * null = brak ZIP / sukces kosztorysu / legacy bez zipUnpackOk.
 */
export function resolveCostParserZipState(
  input: CostParserZipStateInput,
): CostParserZipState | null {
  if (!input.hasTopLevelZip) return null;
  if (input.kosztorysOk) return null;
  if (input.zipUnpackOk == null) return null;
  if (input.zipUnpackOk === false) return "unpack_failed";
  if (!input.zipCostInnerPresent) return "no_cost_inner";
  return "parse_failed";
}

export function resolveCostParserZipUiOverlay(state: CostParserZipState): {
  phaseLabelPl: string;
  hintPl: string;
} {
  switch (state) {
    case "unpack_failed":
      return {
        phaseLabelPl: "Nie udało się odczytać archiwum ZIP",
        hintPl:
          "System nie otworzył zawartości ZIP (sieć / katalog / pobranie). To nie oznacza, że w archiwum nie ma kosztorysu. Ponów analizę.",
      };
    case "no_cost_inner":
      return {
        phaseLabelPl: DOC_DETECTION_UX_C_ZIP_NOT_FOUND_LABEL,
        hintPl: DOC_DETECTION_UX_C_ZIP_NOT_FOUND_HINT,
      };
    case "parse_failed":
      return {
        phaseLabelPl: DOC_DETECTION_UX_C_ZIP_PARSE_FAILED_LABEL,
        hintPl: DOC_DETECTION_UX_C_ZIP_PARSE_FAILED_HINT,
      };
    default: {
      const _e: never = state;
      return _e;
    }
  }
}

/**
 * DF §4 — czy wolno stemplować terminalne parsedAt / HeavyDone.
 * false gdy ZIP ∧ !zipUnpackOk ∧ retry jeszcze niezużyty.
 */
export function canStampHeavyParsedAtForZipUnpack(input: {
  hasTopLevelZip: boolean;
  zipUnpackOk: boolean;
  zipUnpackRetryUsed: boolean;
}): boolean {
  if (!input.hasTopLevelZip) return true;
  if (input.zipUnpackOk) return true;
  return input.zipUnpackRetryUsed;
}

/** Minimalny kształt dossier dla P0-RETRY predykatu (bez importu pipeline — ZERO cyklu). */
export interface SoftInvalidateF2ZipRetryDossier {
  scanSummary?: { zipUnpackOk?: boolean | null } | null;
  kosztorys?: { ok?: boolean } | null;
  forceHeavyRescanAt?: string;
}

/**
 * AI-COST-PARSER-01 P0-RETRY DF §4.1 —
 * Czy F2 „Ponów” ma ustawić applyForceHeavyRescanAt (REUSE Force path).
 *
 * `heavyParseDone` MUSI pochodzić z SSOT `tenderDossierHeavyParseDone(dossier)`
 * (przekazywane z zewnątrz — unik cyklu importów z tender-dossier-pipeline).
 */
export function shouldSoftInvalidateOnF2ZipRetry(
  dossier: SoftInvalidateF2ZipRetryDossier | null | undefined,
  docs: ReadonlyArray<{ filename?: string }>,
  heavyParseDone: boolean,
): boolean {
  if (!dossier) return false;
  const hasArchive = docs.some((d) => {
    const name = d.filename?.trim() ?? "";
    return Boolean(name) && (isZipFilename(name) || is7zFilename(name));
  });
  if (!hasArchive) return false;
  if (dossier.scanSummary?.zipUnpackOk !== false) return false;
  if (!heavyParseDone) return false;
  if (dossier.kosztorys?.ok === true) return false;
  if (dossier.forceHeavyRescanAt) return false;
  return true;
}
