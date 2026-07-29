/**
 * COST-MULTI-02 Force Heavy Rescan — CTA + soft invalidate (DF RCA-MULTI-02-NO-UI-PONOW).
 * Nie zmienia Discovery / parserów / Bid / Aggregate.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderDossier } from "@/lib/tenders-bzp-brief";
import { COST_MULTI_02_AGGREGATE_BID } from "@/lib/cost-multi-02";
import { CURRENT_PARSER_VERSION } from "@/lib/tender-dossier-parser-version";

/** Rollback: `false` → brak CTA / brak force path (tip 2.65.75). */
export const COST_MULTI_02_FORCE_RESCAN_CTA = true;

export const FORCE_HEAVY_RESCAN_CTA_LABEL = "Uzupełnij odczyty branż";

export const FORCE_HEAVY_RESCAN_CONFIRM = {
  title: "Uzupełnij odczyty branż",
  body:
    "System ponownie przeanalizuje dokumenty kosztowe.\n"
    + "Nie zmienia wyboru głównego kosztorysu (ONE).\n"
    + "Może potrwać przy dużym ZIP.",
} as const;

export function hasMulti02CostSources(dossier: TenderDossier | null | undefined): boolean {
  const s = dossier?.scanSummary?.costCandidateSources;
  return Array.isArray(s) && s.length >= 1;
}

export function hasMulti02BranchArtifacts(dossier: TenderDossier | null | undefined): boolean {
  const a = dossier?.scanSummary?.branchWinnerArtifacts;
  return Array.isArray(a) && a.length >= 1;
}

/** Brak pełnych pól MULTI-02 (DF §3.2 #5). */
export function isMissingMulti02HeavyFields(dossier: TenderDossier | null | undefined): boolean {
  return !hasMulti02CostSources(dossier) || !hasMulti02BranchArtifacts(dossier);
}

/**
 * Czy pokazać CTA force na healthy dossier.
 * `heavyDoneForCta` — wynik `tenderDossierHeavyParseDone` **bez** aktywnego force
 * (gdy force już ustawiony, heavyDone=false i CTA i tak znika przez busy).
 */
export function shouldShowForceHeavyRescanCta(opts: {
  item: TenderPipelineItem;
  dossierBuilding?: boolean;
  dossierSaving?: boolean;
  forceHandlerAvailable?: boolean;
}): boolean {
  if (!COST_MULTI_02_FORCE_RESCAN_CTA) return false;
  if (!COST_MULTI_02_AGGREGATE_BID) return false;
  if (opts.forceHandlerAvailable === false) return false;
  if (opts.dossierBuilding || opts.dossierSaving) return false;

  const dossier = opts.item.tenderDossier;
  if (!dossier) return false;
  if (!dossier.kosztorys?.ok) return false;
  // F2 (brak kosztorysu) ma własne „Ponów” — nie dublujemy (kosztorys.ok już powyżej).
  // Aktywny force → Heavy w toku / zaraz start — nie pokazuj CTA
  if (dossier.forceHeavyRescanAt) return false;
  // Healthy Heavy (bez force) — inline, bez importu pipeline (unik cyklu).
  if (dossier.parserVersion !== CURRENT_PARSER_VERSION) return false;
  if (!dossier.kosztorys?.ok && !dossier.scanSummary?.parsedAt) return false;
  if (!isMissingMulti02HeavyFields(dossier)) return false;
  return true;
}

/** Patch dossier: ustawia forceHeavyRescanAt (nie rusza kosztorys / parserVersion). */
export function applyForceHeavyRescanAt(
  dossier: TenderDossier,
  atIso: string = new Date().toISOString(),
): TenderDossier {
  return {
    ...dossier,
    forceHeavyRescanAt: atIso,
  };
}

export function clearForceHeavyRescanAt(dossier: TenderDossier): TenderDossier {
  if (!dossier.forceHeavyRescanAt) return dossier;
  const { forceHeavyRescanAt: _drop, ...rest } = dossier;
  return { ...rest };
}

export function traceForceHeavyRescan(
  event:
    | "force_heavy_rescan_click"
    | "force_heavy_rescan_confirm"
    | "force_heavy_rescan_start"
    | "force_heavy_rescan_done"
    | "force_heavy_rescan_fail",
  payload: Record<string, unknown>,
): void {
  try {
    // eslint-disable-next-line no-console
    console.info("[FORCE-HEAVY-RESCAN]", event, payload);
  } catch {
    /* ignore */
  }
}
