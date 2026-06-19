/**
 * TP200A.1 — merge external discovery into existing dossier without dropping TP200A fields.
 */

import type { TenderBrief, TenderDossier, TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";

export type ExternalDiscoveryDossierUpdates = {
  brief: TenderBrief;
  kosztorys: TenderKosztorysSnapshot | null;
  builtAt: string;
};

/** Zachowuje parserVersion, scanSummary, bidProposal, estimatePln i pozostałe pola dossier. */
export function mergeExternalDiscoveryDossierPatch(
  existing: TenderDossier | null | undefined,
  updates: ExternalDiscoveryDossierUpdates,
): TenderDossier {
  if (existing) {
    return {
      ...existing,
      brief: updates.brief,
      kosztorys: updates.kosztorys,
      builtAt: updates.builtAt,
    };
  }
  return {
    brief: updates.brief,
    kosztorys: updates.kosztorys,
    builtAt: updates.builtAt,
  };
}
