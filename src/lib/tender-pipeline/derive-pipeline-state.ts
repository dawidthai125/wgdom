/**
 * NG-02 — derive PipelineState z sygnałów hooków (pure, testowalne).
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
  pricingReady: boolean;
}): PipelineState {
  const {
    item,
    autoRunning,
    externalRunning = false,
    dossierBuilding,
    dossierSaving,
    dossierParseFailed,
    pricingReady,
  } = opts;

  if (dossierParseFailed) return PipelineState.Failed;

  const heavyDone = tenderDossierHeavyParseDone(item.tenderDossier);
  if (heavyDone && pricingReady) return PipelineState.Ready;
  if (heavyDone && !pricingReady) return PipelineState.Pricing;

  if (dossierBuilding || dossierSaving) return PipelineState.Heavy;
  if (externalRunning) return PipelineState.External;

  if (autoRunning) {
    const loadingNotice = Boolean(item.noticeNumber?.trim()) && !item.noticeHtml?.trim();
    return loadingNotice ? PipelineState.Notice : PipelineState.Discovery;
  }

  const docCount = item.bzpDocuments?.length ?? 0;
  if (docCount > 0 && !heavyDone) return PipelineState.Heavy;

  return PipelineState.Idle;
}
