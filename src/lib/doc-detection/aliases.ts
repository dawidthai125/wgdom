/**
 * AI-DOC-DETECTION — aliasy filename → Doc.D1 (Thin DF aliasVersion).
 * Tylko nazwy plików — bez zmiany scoringu treści / parserów.
 */

import { DOC_DETECTION_ALIAS_VERSION } from "./types";

export { DOC_DETECTION_ALIAS_VERSION };

/** Fold nazwy (bez diakrytyków, lowercase). */
export function foldDocDetectionFilename(filename: string): string {
  return (filename.split(" → ").pop() ?? filename)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

/**
 * Nowe aliasy Doc.D1 (BOQ / Bill of Quantities / kosztorys ślepy).
 * Przedmiar / obmiar / ATH — osobne reguły tip (zachowane).
 */
export function matchesDocD1NewAlias(foldedFilename: string): boolean {
  const f = foldedFilename;
  if (!f) return false;
  if (/\bboq\b/.test(f)) return true;
  if (/bill[_\s.-]*of[_\s.-]*quantit/.test(f)) return true;
  if (/kosztorys[_\s.-]*slep/.test(f) || /slep[yiae]?[_\s.-]*kosztorys/.test(f)) return true;
  if (/\bslepy\b/.test(f) && /koszt|przedm|obmiar|boq/.test(f)) return true;
  if (/\bslepy\b/.test(f) && /\.pdf$/i.test(f)) return true;
  return false;
}

/** Hint kosztowy w nazwie XLS/XLSX (rozszerza koszt|przedm|obmiar). */
export function hasDocD1CostFilenameHint(filename: string): boolean {
  const f = foldDocDetectionFilename(filename);
  if (/koszt|przedm|obmiar/.test(f)) return true;
  return matchesDocD1NewAlias(f);
}

/**
 * Czy nazwa PDF wygląda na przedmiar Doc.D1 (w tym nowe aliasy).
 * REUSE + rozszerzenie tip `isPdfPrzedmiarCostFilename`.
 */
export function isDocD1PdfFilename(filename: string): boolean {
  const base = foldDocDetectionFilename(filename);
  if (!/\.pdf$/i.test(base)) return false;
  if (/przedmiar\.pdf$/.test(base) || /obmiar\.pdf$/.test(base) || /kosztorys\.pdf$/.test(base)) {
    return true;
  }
  // bez \b po tokenie — `_` jest word-char (`przedmiar_robot.pdf`)
  if (/przedmiar/.test(base) || /obmiar/.test(base)) return true;
  if (/_pr(?:\.pdf$|_| |\d)/.test(base)) return true;
  if (/kosztorys/.test(base)) return true;
  return matchesDocD1NewAlias(base);
}

/** Fragment RE dla F2 / candidate (łączy tip + aliasy). */
export const DOC_D1_PDF_NAME_RE =
  /przedmiar|kosztorys|obmiar|ath|norma|stwior|formularz.?cen|\bboq\b|bill[_\s.-]*of[_\s.-]*quantit|slep/i;
