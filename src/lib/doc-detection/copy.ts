/**
 * AI-DOC-DETECTION — copy UX_A–D (Thin DF copyVersion).
 */

import { DOC_DETECTION_COPY_VERSION } from "./types";

export { DOC_DETECTION_COPY_VERSION };

export type DocDetectionUxCause = "UX_A" | "UX_B" | "UX_C" | "UX_D";

export const DOC_DETECTION_UX_A_LABEL = "Brak przedmiaru w dokumentach";
export const DOC_DETECTION_UX_A_HINT =
  "Dołącz przedmiar, BOQ, obmiar, ATH lub XLSX z pozycjami.";

export const DOC_DETECTION_UX_B_LABEL = "Przedmiar PDF bez tekstu (wymaga OCR)";
export const DOC_DETECTION_UX_B_HINT =
  "Brak warstwy tekstowej — dołącz ATH/XLSX lub PDF z tekstem. OCR w aplikacji niedostępne.";

/** UX_C — warianty */
export const DOC_DETECTION_UX_C_CANDIDATE_LABEL = "Przedmiar wykryty — brak odczytu pozycji";
export const DOC_DETECTION_UX_C_CANDIDATE_HINT =
  "W dokumentach jest kandydat przedmiaru — uruchom ponownie analizę dokumentów.";

export const DOC_DETECTION_UX_C_ARCHIVE_READY_LABEL = "W dokumentach jest archiwum ZIP";
export const DOC_DETECTION_UX_C_ARCHIVE_READY_HINT =
  "Uruchom analizę dokumentów — system przeszuka ZIP pod kątem ATH/XLSX/PDF przedmiaru. To nie gwarantuje ceny oferty.";

export const DOC_DETECTION_UX_C_RUNNING_LABEL = "Trwa odczyt przedmiaru…";
export const DOC_DETECTION_UX_C_RUNNING_HINT =
  "Po zakończeniu możliwa wycena ofertowa.";

export const DOC_DETECTION_UX_C_FAILED_LABEL = "Nie udało się odczytać przedmiaru";
export const DOC_DETECTION_UX_C_FAILED_HINT =
  "Sprawdź plik lub ponów analizę. To nie awaria kalkulatora oferty.";

export const DOC_DETECTION_UX_C_ZIP_NOT_FOUND_LABEL = "Nie znaleziono przedmiaru w archiwum ZIP";
export const DOC_DETECTION_UX_C_ZIP_NOT_FOUND_HINT =
  "Heavy przeanalizował załączniki ZIP, ale nie wykryto ATH/XLSX/PDF przedmiaru. Sprawdź zawartość lub dołącz inny plik. To nie awaria kalkulatora oferty.";

export const DOC_DETECTION_UX_C_ZIP_PARSE_FAILED_LABEL =
  "Nie udało się odczytać przedmiaru z archiwum";
export const DOC_DETECTION_UX_C_ZIP_PARSE_FAILED_HINT =
  "W ZIP był kandydat przedmiaru, ale nie powstał snapshot. Sprawdź plik lub ponów analizę. To nie awaria kalkulatora oferty.";

export const DOC_DETECTION_UX_D_LABEL = "Brak kosztorysu ofertowego";
export const DOC_DETECTION_UX_D_HINT =
  "Uruchom / dokończ wycenę oferty — przedmiar jest dostępny.";

export const DOC_DETECTION_UX_F1_LABEL = "Przedmiar bez pozycji";
export const DOC_DETECTION_UX_F1_HINT =
  "Plik przedmiaru jest, ale bez pozycji / ilości do wyceny. To nie brak dokumentu.";
