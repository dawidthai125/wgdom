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

function effectiveRowCount(k: TenderKosztorysSnapshot): number {
  return k.rowCount ?? k.rows?.length ?? k.catalogQuantities?.length ?? 0;
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

function compareKosztorys(
  a: TenderKosztorysSnapshot | null | undefined,
  b: TenderKosztorysSnapshot | null | undefined,
): KosztorysPickWinner {
  const tierA = kosztorysSourceQualityTier(a);
  const tierB = kosztorysSourceQualityTier(b);
  if (tierA > tierB) return "a";
  if (tierB > tierA) return "b";
  if (tierA === KOSZTORYS_SOURCE_TIER.absent) return null;

  const rowsA = a ? effectiveRowCount(a) : 0;
  const rowsB = b ? effectiveRowCount(b) : 0;
  if (rowsA > rowsB) return "a";
  if (rowsB > rowsA) return "b";

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
): TenderKosztorysSnapshot | null {
  const winner = compareKosztorys(a, b);
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
  const kosztorys = pickBetterKosztorys(dossierA.kosztorys, dossierB.kosztorys);
  const kosztorysSide = kosztorysWinner === "b" ? dossierB : dossierA;
  const newerBuilt = parseTs(dossierA.builtAt) >= parseTs(dossierB.builtAt) ? dossierA : dossierB;
  const olderBuilt = newerBuilt === dossierA ? dossierB : dossierA;

  return {
    brief: newerBuilt.brief?.fields?.length ? newerBuilt.brief : olderBuilt.brief,
    kosztorys,
    scanSummary: kosztorysSide.scanSummary ?? newerBuilt.scanSummary ?? olderBuilt.scanSummary ?? null,
    estimatePln: newerBuilt.estimatePln ?? olderBuilt.estimatePln ?? null,
    bidProposal: newerBuilt.bidProposal ?? olderBuilt.bidProposal ?? null,
    builtAt: newerBuilt.builtAt,
  };
}
