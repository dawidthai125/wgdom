/**
 * TP200A — wersjonowanie parsera dossier; invalidacja legacy snapshotów KV/LS.
 *
 * Bump CURRENT_PARSER_VERSION gdy zmienia się logika parse/merge kosztorysu
 * (PDF recovery TP198, pickBetter TP190A, ATH discovery, …).
 */

import type { TenderDossier } from "@/lib/tenders-bzp-brief";

/** v2 = PDF WM Recovery TP196–198C + merge quality TP190A (baseline prod 2.62.10). */
/** v3 = TP201B layout PDF recovery + TP190B anti-downgrade merge (PDF vs ATH). */
/** v4 = TP200B snapshot fidelity — priced rows cap 500; lazy rescan legacy truncated snapshots. */
export const CURRENT_PARSER_VERSION = 4;

/** @deprecated alias — używaj CURRENT_PARSER_VERSION */
export const DOSSIER_PARSER_VERSION = CURRENT_PARSER_VERSION;

/** Czy dossier ma artefakty ciężkiego parsowania (kosztorys lub scanSummary). */
export function dossierHasHeavyParseArtifacts(dossier: TenderDossier | null | undefined): boolean {
  if (!dossier) return false;
  if (dossier.kosztorys?.ok) return true;
  if (dossier.scanSummary?.parsedAt) return true;
  return false;
}

/** Legacy lub starsza wersja parsera — wymaga reskanu przy lazy dossier. */
export function isDossierParserStale(dossier: TenderDossier | null | undefined): boolean {
  if (!dossier || !dossierHasHeavyParseArtifacts(dossier)) return false;
  return dossier.parserVersion !== CURRENT_PARSER_VERSION;
}

/** Istniejący kosztorys do pickBetter — null gdy dossier wymaga świeżego parse. */
export function existingKosztorysUnlessStale(
  dossier: TenderDossier | null | undefined,
  kosztorys: import("@/lib/tenders-bzp-brief").TenderKosztorysSnapshot | null | undefined,
): import("@/lib/tenders-bzp-brief").TenderKosztorysSnapshot | null {
  if (isDossierParserStale(dossier)) return null;
  return kosztorys ?? dossier?.kosztorys ?? null;
}

/**
 * TP190C-1 — kosztorys do pickBetter po świeżym parse (również gdy dossier stale).
 * Stale wymusza rebuild, ale nie odrzuca istniejącego snapshotu przed quality gate.
 */
export function existingKosztorysForRebuildPick(
  dossier: TenderDossier | null | undefined,
  kosztorys: import("@/lib/tenders-bzp-brief").TenderKosztorysSnapshot | null | undefined,
): import("@/lib/tenders-bzp-brief").TenderKosztorysSnapshot | null {
  const k = kosztorys ?? dossier?.kosztorys ?? null;
  return k?.ok ? k : null;
}

export function stampDossierParserVersion(dossier: TenderDossier): TenderDossier {
  return { ...dossier, parserVersion: CURRENT_PARSER_VERSION };
}
