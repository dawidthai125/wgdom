/**
 * P0 — merge jakościowy tenderDossier.kosztorys (local ↔ cloud).
 * updatedAt rekordu pipeline NIE decyduje o wyborze kosztorysu.
 */

import type { CostBranchArtifact } from "@/lib/cost-multi-02-types";
import type { TenderDossierScanSummary } from "@/lib/tender-dossier-pipeline";
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

function kosztorysHasHeavyRows(k: TenderKosztorysSnapshot | null | undefined): boolean {
  return Boolean(k?.rows && k.rows.length > 0);
}

/** OD-OCR-25 — rows omitted in lean cloud body (FIELD_ABSENT ≠ deletion). */
export function kosztorysRowsFieldAbsent(
  k: TenderKosztorysSnapshot | null | undefined,
  leanRowsOmitted?: boolean,
): boolean {
  if (!k) return false;
  if (leanRowsOmitted) return true;
  if ((k as { _rowsOmitted?: boolean })._rowsOmitted) return true;
  const rc = effectiveRowCount(k);
  return rc > 0 && !kosztorysHasHeavyRows(k);
}

function kosztorysMetaShell(k: TenderKosztorysSnapshot): TenderKosztorysSnapshot {
  return { ...k, rows: [] };
}

function combineKosztorysHeavyWithMeta(
  heavy: TenderKosztorysSnapshot,
  meta: TenderKosztorysSnapshot,
): TenderKosztorysSnapshot {
  return {
    ...meta,
    ...heavy,
    rows: heavy.rows,
    rowCount: heavy.rowCount ?? heavy.rows?.length ?? meta.rowCount,
    catalogQuantities: heavy.catalogQuantities?.length
      ? heavy.catalogQuantities
      : meta.catalogQuantities,
    quantityExpressionsByLp: heavy.quantityExpressionsByLp?.length
      ? heavy.quantityExpressionsByLp
      : meta.quantityExpressionsByLp,
  };
}

/**
 * OD-OCR-25 — preserve heavy rows when merging FULL ↔ LEAN cloud snapshots.
 * Lean absent rows never beat FULL rows at compatible tier.
 */
export function mergeKosztorysPreserveHeavy(
  a: TenderKosztorysSnapshot | null | undefined,
  b: TenderKosztorysSnapshot | null | undefined,
  opts?: { leanRowsOmittedA?: boolean; leanRowsOmittedB?: boolean },
): TenderKosztorysSnapshot | null {
  if (!a && !b) return null;
  if (!a) return b ?? null;
  if (!b) return a ?? null;

  const aHeavy = kosztorysHasHeavyRows(a);
  const bHeavy = kosztorysHasHeavyRows(b);
  const aAbsent = kosztorysRowsFieldAbsent(a, opts?.leanRowsOmittedA);
  const bAbsent = kosztorysRowsFieldAbsent(b, opts?.leanRowsOmittedB);
  const tierA = kosztorysSourceQualityTier(a);
  const tierB = kosztorysSourceQualityTier(b);

  if (aHeavy && bAbsent && tierA >= tierB) {
    const meta = pickBetterKosztorys(kosztorysMetaShell(a), kosztorysMetaShell(b)) ?? a;
    return combineKosztorysHeavyWithMeta(a, meta);
  }
  if (bHeavy && aAbsent && tierB >= tierA) {
    const meta = pickBetterKosztorys(kosztorysMetaShell(a), kosztorysMetaShell(b)) ?? b;
    return combineKosztorysHeavyWithMeta(b, meta);
  }
  if (aHeavy && bHeavy) {
    const winner = pickBetterKosztorys(a, b) ?? a;
    const meta = pickBetterKosztorys(kosztorysMetaShell(a), kosztorysMetaShell(b)) ?? winner;
    return combineKosztorysHeavyWithMeta(winner, meta);
  }

  const metaWinner = pickBetterKosztorys(
    aAbsent ? kosztorysMetaShell(a) : a,
    bAbsent ? kosztorysMetaShell(b) : b,
  );
  if (!metaWinner) return null;
  const fromA = metaWinner === a || (aAbsent && metaWinner.sourceFilename === a.sourceFilename);
  const base = fromA ? a : b;
  return {
    ...base,
    rows: [],
    rowCount: base.rowCount ?? effectiveRowCount(base),
  };
}

function artifactIdentityKey(a: CostBranchArtifact): string {
  return String(a.documentId || a.filename || "").trim();
}

function mergeArtifactPair(
  a: CostBranchArtifact,
  b: CostBranchArtifact,
  leanSnapshotOmittedA?: boolean,
  leanSnapshotOmittedB?: boolean,
): CostBranchArtifact {
  const aSnap = a.snapshot;
  const bSnap = b.snapshot;
  const aHasSnap = Boolean(aSnap && (aSnap.ok || (aSnap.rows?.length ?? 0) > 0));
  const bHasSnap = Boolean(bSnap && (bSnap.ok || (bSnap.rows?.length ?? 0) > 0));
  const aSnapAbsent = (leanSnapshotOmittedA || !aSnap) && !aHasSnap;
  const bSnapAbsent = (leanSnapshotOmittedB || !bSnap) && !bHasSnap;

  let snapshot: CostBranchArtifact["snapshot"] | undefined;
  if (aHasSnap && (bSnapAbsent || !bHasSnap)) snapshot = aSnap;
  else if (bHasSnap && (aSnapAbsent || !aHasSnap)) snapshot = bSnap;
  else if (aHasSnap && bHasSnap) snapshot = pickBetterKosztorys(aSnap, bSnap) ?? aSnap;
  else snapshot = aSnap ?? bSnap;

  const merged: CostBranchArtifact = {
    filename: a.filename || b.filename,
    documentId: a.documentId || b.documentId,
    branch: a.branch ?? b.branch,
    snapshot: snapshot ?? {
      ok: false,
      sourceFilename: a.filename || b.filename,
      rowCount: 0,
      rows: [],
      catalogQuantities: [],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: new Date(0).toISOString(),
    },
  };
  return merged;
}

function unionArtifacts(
  listA: CostBranchArtifact[] | undefined,
  listB: CostBranchArtifact[] | undefined,
  leanOmittedA?: boolean,
  leanOmittedB?: boolean,
): CostBranchArtifact[] | undefined {
  const a = listA ?? [];
  const b = listB ?? [];
  if (a.length === 0 && b.length === 0) return undefined;
  const map = new Map<string, CostBranchArtifact>();
  for (const art of a) {
    const k = artifactIdentityKey(art);
    if (k) map.set(k, art);
  }
  for (const art of b) {
    const k = artifactIdentityKey(art);
    if (!k) continue;
    const prev = map.get(k);
    map.set(
      k,
      prev
        ? mergeArtifactPair(prev, art, leanOmittedA, leanOmittedB)
        : art,
    );
  }
  return [...map.values()];
}

/** OD-OCR-25 — union artifacts; never wholesale-replace scanSummary from single winner. */
export function mergeScanSummaryPreserveArtifacts(
  a: TenderDossierScanSummary | null | undefined,
  b: TenderDossierScanSummary | null | undefined,
  opts?: { leanArtifactSnapshotOmittedA?: boolean; leanArtifactSnapshotOmittedB?: boolean },
): TenderDossierScanSummary | null | undefined {
  if (!a && !b) return null;
  if (!a) return b ?? null;
  if (!b) return a;

  const newer = parseTs(a.parsedAt) >= parseTs(b.parsedAt) ? a : b;
  const older = newer === a ? b : a;
  const branchWinnerArtifacts = unionArtifacts(
    a.branchWinnerArtifacts,
    b.branchWinnerArtifacts,
    opts?.leanArtifactSnapshotOmittedA,
    opts?.leanArtifactSnapshotOmittedB,
  );
  const costBranchArtifacts = unionArtifacts(
    a.costBranchArtifacts ?? a.branchWinnerArtifacts,
    b.costBranchArtifacts ?? b.branchWinnerArtifacts,
    opts?.leanArtifactSnapshotOmittedA,
    opts?.leanArtifactSnapshotOmittedB,
  );

  return {
    ...older,
    ...newer,
    branchWinnerArtifacts: branchWinnerArtifacts ?? newer.branchWinnerArtifacts ?? older.branchWinnerArtifacts,
    costBranchArtifacts: costBranchArtifacts ?? newer.costBranchArtifacts ?? older.costBranchArtifacts,
    parsedAt: newer.parsedAt ?? older.parsedAt,
  };
}

export interface MergeTenderDossierByQualityOptions {
  leanRowsOmittedA?: boolean;
  leanRowsOmittedB?: boolean;
  leanArtifactSnapshotOmittedA?: boolean;
  leanArtifactSnapshotOmittedB?: boolean;
}

/** Merge dossier — kosztorys po jakości + preserve-heavy (OD-OCR-25). */
export function mergeTenderDossierByQuality(
  dossierA: TenderDossier | null | undefined,
  dossierB: TenderDossier | null | undefined,
  opts?: MergeTenderDossierByQualityOptions,
): TenderDossier | null | undefined {
  if (!dossierA && !dossierB) return null;
  if (!dossierA) return dossierB ?? null;
  if (!dossierB) return dossierA;

  const kosztorys = mergeKosztorysPreserveHeavy(dossierA.kosztorys, dossierB.kosztorys, {
    leanRowsOmittedA: opts?.leanRowsOmittedA,
    leanRowsOmittedB: opts?.leanRowsOmittedB,
  });
  const newerBuilt = parseTs(dossierA.builtAt) >= parseTs(dossierB.builtAt) ? dossierA : dossierB;
  const olderBuilt = newerBuilt === dossierA ? dossierB : dossierA;
  const scanSummary = mergeScanSummaryPreserveArtifacts(
    dossierA.scanSummary,
    dossierB.scanSummary,
    {
      leanArtifactSnapshotOmittedA: opts?.leanArtifactSnapshotOmittedA,
      leanArtifactSnapshotOmittedB: opts?.leanArtifactSnapshotOmittedB,
    },
  );

  return {
    brief: newerBuilt.brief?.fields?.length ? newerBuilt.brief : olderBuilt.brief,
    kosztorys,
    scanSummary: scanSummary ?? newerBuilt.scanSummary ?? olderBuilt.scanSummary ?? null,
    estimatePln: newerBuilt.estimatePln ?? olderBuilt.estimatePln ?? null,
    bidProposal: newerBuilt.bidProposal ?? olderBuilt.bidProposal ?? null,
    parserVersion: newerBuilt.parserVersion ?? olderBuilt.parserVersion ?? olderBuilt.parserVersion,
    builtAt: newerBuilt.builtAt,
  };
}
