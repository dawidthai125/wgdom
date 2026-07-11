/**
 * NG-02 — derive PipelineState z sygnałów hooków (pure, testowalne).
 * NG11-A1 — partialDossierReady · dossierEnriching · pricingReadyPartial/Final.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { tenderDossierHeavyParseDone } from "@/lib/tender-dossier-pipeline";
import { PipelineState } from "@/lib/tender-pipeline/tender-pipeline-types";

export function derivePipelineState(opts: {
  item: TenderPipelineItem;
  autoRunning: boolean;
  externalRunning?: boolean;
  dossierBuilding: boolean;
  dossierSaving: boolean;
  dossierParseFailed: boolean;
  /** Legacy — mapowane na pricingReadyFinal gdy brak jawnego final. */
  pricingReady: boolean;
  /** NG11-A1 */
  partialDossierReady?: boolean;
  dossierEnriching?: boolean;
  pricingReadyPartial?: boolean;
  pricingReadyFinal?: boolean;
  /** NG-02.1A — z deriveUnifiedAttachmentGate (jedyny SSOT startu heavy). */
  canStartHeavyParse?: boolean;
}): PipelineState {
  const {
    item,
    autoRunning,
    externalRunning = false,
    dossierBuilding,
    dossierSaving,
    dossierParseFailed,
    pricingReady,
    partialDossierReady = false,
    dossierEnriching = false,
    pricingReadyPartial = false,
    pricingReadyFinal = pricingReady,
    canStartHeavyParse = false,
  } = opts;

  if (dossierParseFailed) return PipelineState.Failed;

  const heavyDone = tenderDossierHeavyParseDone(item.tenderDossier);
  if (heavyDone && pricingReadyFinal) return PipelineState.Ready;
  if (partialDossierReady && !pricingReadyFinal) return PipelineState.Pricing;
  if (heavyDone && !pricingReadyFinal) return PipelineState.Pricing;

  if (dossierBuilding || dossierSaving || dossierEnriching) return PipelineState.Heavy;
  if (externalRunning) return PipelineState.External;

  if (autoRunning) {
    const loadingNotice = Boolean(item.noticeNumber?.trim()) && !item.noticeHtml?.trim();
    return loadingNotice ? PipelineState.Notice : PipelineState.Discovery;
  }

  if (canStartHeavyParse && !heavyDone) return PipelineState.Heavy;

  return PipelineState.Idle;
}
