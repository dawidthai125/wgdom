/**
 * P0 — merge jakościowy tenderDossier.kosztorys (local ↔ cloud).
 * updatedAt rekordu pipeline NIE decyduje o wyborze kosztorysu.
 */

import type { TenderDossier, TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";
import {
  classifyCostDocumentType,
  isFormalOfferCostFilename,
  type TenderCostDocumentType,
} from "@/lib/tender-cost-discovery";
import { isDossierParserStale } from "@/lib/tender-dossier-parser-version";

/** Wyższa wartość = lepsze źródło kosztorysu. */
const KOSZTORYS_SOURCE_TIER: Record<string, number> = {
  absent: 0,
  formularz: 1,
  xlsx_kosztorys: 2,
  zip_pdf_przedmiar: 3,
  pdf_przedmiar: 4,
  nor: 5,
  ath: 6,
};

function parseTs(iso: string | undefined | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** SSOT liczby pozycji kosztorysu — rowCount przed rows.length (TP200B). */
export function kosztorysEffectiveRowCount(
  k: TenderKosztorysSnapshot | null | undefined,
): number {
  if (!k) return 0;
  return k.rowCount ?? k.rows?.length ?? k.catalogQuantities?.length ?? 0;
}

function effectiveRowCount(k: TenderKosztorysSnapshot): number {
  return kosztorysEffectiveRowCount(k);
}

function mapCostTypeToTier(type: TenderCostDocumentType): number {
  switch (type) {
    case "ath":
    case "zip_ath":
      return KOSZTORYS_SOURCE_TIER.ath;
    case "nor":
    case "zip_nor":
      return KOSZTORYS_SOURCE_TIER.nor;
    case "pdf_przedmiar":
      return KOSZTORYS_SOURCE_TIER.pdf_przedmiar;
    case "zip_pdf_przedmiar":
      return KOSZTORYS_SOURCE_TIER.zip_pdf_przedmiar;
    case "xlsx":
    case "zip_xlsx":
    case "xls":
    case "zip_xls":
    case "xml":
    case "zip_xml":
      return KOSZTORYS_SOURCE_TIER.xlsx_kosztorys;
    default:
      return KOSZTORYS_SOURCE_TIER.absent;
  }
}

/** Ranking źródła kosztorysu dla merge (wyższy = lepszy). */
export function kosztorysSourceQualityTier(
  k: TenderKosztorysSnapshot | null | undefined,
): number {
  if (!k?.ok) return KOSZTORYS_SOURCE_TIER.absent;
  if (isFormalOfferCostFilename(k.sourceFilename)) {
    return KOSZTORYS_SOURCE_TIER.formularz;
  }
  const tier = mapCostTypeToTier(classifyCostDocumentType(k.sourceFilename).type);
  if (tier > KOSZTORYS_SOURCE_TIER.absent) return tier;
  if (/\.xlsx?$/i.test(k.sourceFilename) && effectiveRowCount(k) > 0) {
    return KOSZTORYS_SOURCE_TIER.formularz;
  }
  return KOSZTORYS_SOURCE_TIER.absent;
}

export type KosztorysPickWinner = "a" | "b" | null;

/** TP190C-2C — opcje pickBetter przy parse loop dossier. */
export interface PickBetterKosztorysOptions {
  /** Przy remisie tier+rowCount preferuj źródło z discoverBestCostDocument (pełna lub bazowa nazwa). */
  discoveryWinnerSource?: string | null;
}

function kosztorysSourceBaseName(filename: string): string {
  return (filename.split(" → ").pop() ?? filename).trim().toLowerCase();
}

/** Czy snapshot pochodzi z discovery winner (dopasowanie po bazowej nazwie pliku). */
export function kosztorysMatchesDiscoveryWinner(
  k: TenderKosztorysSnapshot | null | undefined,
  discoveryWinnerSource: string | null | undefined,
): boolean {
  if (!k?.sourceFilename?.trim() || !discoveryWinnerSource?.trim()) return false;
  return kosztorysSourceBaseName(k.sourceFilename) === kosztorysSourceBaseName(discoveryWinnerSource);
}

/** TP190B — silny PDF WM CASE 1: dużo pozycji po recovery. */
const PDF_STRONG_RECOVERY_MIN_ROWS = 120;
/**
 * R1-FIX / TP190B — silny PDF wygrywa nad ATH tier gdy ma >5% więcej pozycji.
 * PDF 132 vs ATH 128 (ratio 1.031) → ATH tier; PDF 150 vs ATH 128 → PDF recovery.
 */
const STRONG_PDF_VS_ATH_ROW_MARGIN = 1.05;

function isPdfPrzedmiarTier(tier: number): boolean {
  return tier === KOSZTORYS_SOURCE_TIER.pdf_przedmiar
    || tier === KOSZTORYS_SOURCE_TIER.zip_pdf_przedmiar;
}

/** TP190B — PDF przedmiar CASE 1 z wysokim rowCount (dobry recovery). */
export function isStrongPdfPrzedmiarRecovery(
  k: TenderKosztorysSnapshot | null | undefined,
): boolean {
  if (!k?.ok) return false;
  const tier = kosztorysSourceQualityTier(k);
  if (!isPdfPrzedmiarTier(tier)) return false;
  if (k.pdfPrzedmiarCase !== 1) return false;
  return effectiveRowCount(k) >= PDF_STRONG_RECOVERY_MIN_ROWS;
}

function isAthTierSnapshot(k: TenderKosztorysSnapshot | null | undefined): boolean {
  if (!k?.ok) return false;
  return kosztorysSourceQualityTier(k) === KOSZTORYS_SOURCE_TIER.ath;
}

/** TP190B — tier ATH nie powinien zdegradować silnego PDF recovery. */
function athWouldDowngradeStrongPdf(
  pdfSide: TenderKosztorysSnapshot,
  athSide: TenderKosztorysSnapshot,
): boolean {
  if (!isStrongPdfPrzedmiarRecovery(pdfSide)) return false;
  if (!isAthTierSnapshot(athSide)) return false;
  const pdfRows = effectiveRowCount(pdfSide);
  const athRows = effectiveRowCount(athSide);
  return pdfRows > athRows * STRONG_PDF_VS_ATH_ROW_MARGIN;
}

function compareKosztorys(
  a: TenderKosztorysSnapshot | null | undefined,
  b: TenderKosztorysSnapshot | null | undefined,
  opts?: PickBetterKosztorysOptions,
): KosztorysPickWinner {
  const tierA = kosztorysSourceQualityTier(a);
  const tierB = kosztorysSourceQualityTier(b);
  if (tierA > tierB) {
    if (a && b && athWouldDowngradeStrongPdf(b, a)) return "b";
    return "a";
  }
  if (tierB > tierA) {
    if (a && b && athWouldDowngradeStrongPdf(a, b)) return "a";
    return "b";
  }
  if (tierA === KOSZTORYS_SOURCE_TIER.absent) return null;

  const rowsA = a ? effectiveRowCount(a) : 0;
  const rowsB = b ? effectiveRowCount(b) : 0;
  if (rowsA > rowsB) return "a";
  if (rowsB > rowsA) return "b";

  if (opts?.discoveryWinnerSource) {
    const aDisc = kosztorysMatchesDiscoveryWinner(a, opts.discoveryWinnerSource);
    const bDisc = kosztorysMatchesDiscoveryWinner(b, opts.discoveryWinnerSource);
    if (aDisc && !bDisc) return "a";
    if (bDisc && !aDisc) return "b";
  }

  const parsedA = a ? parseTs(a.parsedAt) : 0;
  const parsedB = b ? parseTs(b.parsedAt) : 0;
  if (parsedA > parsedB) return "a";
  if (parsedB > parsedA) return "b";

  return "a";
}

/** Wybiera lepszy snapshot kosztorysu (ATH > NOR > PDF > XLSX > formularz > brak). */
export function pickBetterKosztorys(
  a: TenderKosztorysSnapshot | null | undefined,
  b: TenderKosztorysSnapshot | null | undefined,
  opts?: PickBetterKosztorysOptions,
): TenderKosztorysSnapshot | null {
  const winner = compareKosztorys(a, b, opts);
  if (winner === "a") return a ?? null;
  if (winner === "b") return b ?? null;
  return null;
}

/** Merge dossier — kosztorys po jakości; pozostałe pola z dossier z nowszym builtAt. */
export function mergeTenderDossierByQuality(
  dossierA: TenderDossier | null | undefined,
  dossierB: TenderDossier | null | undefined,
): TenderDossier | null | undefined {
  if (!dossierA && !dossierB) return null;
  if (!dossierA) return dossierB ?? null;
  if (!dossierB) return dossierA;

  const kosztorysWinner = compareKosztorys(dossierA.kosztorys, dossierB.kosztorys);
  const staleA = isDossierParserStale(dossierA);
  const staleB = isDossierParserStale(dossierB);
  let kosztorys = pickBetterKosztorys(dossierA.kosztorys, dossierB.kosztorys);
  if (staleA && !staleB && dossierB.kosztorys?.ok) {
    kosztorys = dossierB.kosztorys;
  } else if (staleB && !staleA && dossierA.kosztorys?.ok) {
    kosztorys = dossierA.kosztorys;
  }
  const kosztorysSide = kosztorysWinner === "b" ? dossierB : dossierA;
  const newerBuilt = parseTs(dossierA.builtAt) >= parseTs(dossierB.builtAt) ? dossierA : dossierB;
  const olderBuilt = newerBuilt === dossierA ? dossierB : dossierA;
  const freshSide = !staleA ? dossierA : !staleB ? dossierB : newerBuilt;

  return {
    brief: newerBuilt.brief?.fields?.length ? newerBuilt.brief : olderBuilt.brief,
    kosztorys,
    scanSummary: kosztorysSide.scanSummary ?? newerBuilt.scanSummary ?? olderBuilt.scanSummary ?? null,
    estimatePln: newerBuilt.estimatePln ?? olderBuilt.estimatePln ?? null,
    bidProposal: newerBuilt.bidProposal ?? olderBuilt.bidProposal ?? null,
    parserVersion: freshSide.parserVersion ?? newerBuilt.parserVersion ?? olderBuilt.parserVersion,
    builtAt: newerBuilt.builtAt,
  };
}
