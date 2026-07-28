/**
 * COST-PARSER-01 ZIP-UNPACK — stany A/B/C + copy + HeavyDone gate (pure).
 * REUSE CR-02 archive_candidate — bez redefinicji.
 */

import { classifyCostDocumentType } from "@/lib/tender-cost-discovery";

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
        phaseLabelPl: "Nie znaleziono kosztorysu w archiwum ZIP",
        hintPl:
          "Heavy przeanalizował załączniki ZIP, ale nie wykryto ATH/XLSX/PDF przedmiaru. Sprawdź zawartość lub dołącz inny plik. To nie awaria kalkulatora oferty.",
      };
    case "parse_failed":
      return {
        phaseLabelPl: "Nie udało się odczytać kosztorysu z archiwum",
        hintPl:
          "W ZIP był kandydat kosztowy, ale nie powstał snapshot kosztorysu. Sprawdź plik lub ponów analizę. To nie awaria kalkulatora oferty.",
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
