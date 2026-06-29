/**
 * NG-02 — jedyny facade runtime pipeline (mount: TenderDetailPage / legacy accordion).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { tenderDossierHeavyParseDone } from "@/lib/tender-dossier-pipeline";
import { buildKosztorysProcessSession } from "@/lib/tender-kosztorys-process-phase";
import { derivePipelineState } from "@/lib/tender-pipeline/derive-pipeline-state";
import { deriveUnifiedAttachmentGate } from "@/lib/tender-pipeline/unified-attachment-gate";
import {
  PipelineState,
  type PipelineTimelineEntry,
  type TenderPipelineRuntime,
} from "@/lib/tender-pipeline/tender-pipeline-types";
import {
  isPipelineTimelineEnabled,
  readPipelineTimeline,
  recordPipelineTimelineEvent,
  resetPipelineTimelineForTests,
} from "@/lib/tender-pipeline/tender-pipeline-timeline";
import {
  resetTenderDocumentsBootstrapForItem,
  resetTenderDocumentsBootstrapForTests,
  useTenderDocumentsBootstrap,
} from "@/app/hooks/useTenderDocumentsBootstrap";
import { useTenderDossierHeavyLazy } from "@/app/hooks/useTenderDossierHeavyLazy";
import { useTenderPricingAuto } from "@/app/hooks/useTenderPricingAuto";
import { useTenderTrustAssessment } from "@/app/hooks/useTenderTrustAssessment";
import { resetDossierHeavyLazyForTests } from "@/app/hooks/useTenderDossierHeavyLazy";

export function useTenderPipelineRuntime(opts: {
  item: TenderPipelineItem;
  onUpdate: (patch: Partial<TenderPipelineItem>) => void;
  swz?: TenderSwzAnalysis | null;
  athPreviewEnabled?: boolean;
  enabled?: boolean;
  priceOverridesRevision?: number;
}): TenderPipelineRuntime {
  const {
    item,
    onUpdate,
    swz,
    athPreviewEnabled = true,
    enabled = true,
    priceOverridesRevision = 0,
  } = opts;

  const [externalRunning, setExternalRunning] = useState(false);
  const [bootstrapRetryNonce, setBootstrapRetryNonce] = useState(0);
  const [timeline, setTimeline] = useState<PipelineTimelineEntry[]>(() =>
    readPipelineTimeline(item.id),
  );
  const prevStateRef = useRef<PipelineState | null>(null);
  const prevGateFingerprintRef = useRef<string | null>(null);

  const attachmentGate = useMemo(
    () => deriveUnifiedAttachmentGate(item),
    [
      item.id,
      item.tenderId,
      item.bzpDocuments,
      item.externalDocDiscovery?.files,
      item.uploadedFile?.id,
      item.uploadedFile?.filename,
      item.tenderDossier?.builtAt,
      item.tenderDossier?.parserVersion,
      item.tenderDossier?.kosztorys?.ok,
      item.tenderDossier?.scanSummary?.parsedAt,
    ],
  );

  const { autoRunning } = useTenderDocumentsBootstrap({
    item,
    onUpdate,
    enabled,
    retryNonce: bootstrapRetryNonce,
    onExternalRunning: setExternalRunning,
  });

  const {
    dossierBuilding,
    dossierSaving,
    dossierParseFailed,
    parseErrorMessage,
    retryDossierParse: retryHeavyOnly,
    retryNonce,
  } = useTenderDossierHeavyLazy({
    item,
    enabled: enabled && Boolean(item.tenderId),
    onUpdate,
    athPreviewEnabled,
  });

  const heavyDone = tenderDossierHeavyParseDone(item.tenderDossier);
  const pipelineQueued = attachmentGate.canStartHeavyParse
    && !heavyDone
    && !dossierBuilding
    && !dossierSaving
    && !autoRunning
    && !externalRunning;

  const kosztorysProcessSession = useMemo(
    () => buildKosztorysProcessSession({
      autoRunning,
      dossierBuilding,
      dossierSaving,
      dossierParseFailed,
      parseErrorMessage,
      lazyEnabled: true,
      pipelineQueued,
    }),
    [
      autoRunning,
      dossierBuilding,
      dossierSaving,
      dossierParseFailed,
      parseErrorMessage,
      pipelineQueued,
    ],
  );

  const trustAssessment = useTenderTrustAssessment({
    item,
    swz: swz ?? item.swzAnalysis ?? null,
    kosztorysSession: kosztorysProcessSession,
    loadingDocs: autoRunning,
  });

  const { ownerFinanceProposal, bidProposal } = useTenderPricingAuto({
    item,
    swz: swz ?? item.swzAnalysis ?? null,
    priceOverridesRevision,
    enabled,
  });

  const pricingReady = heavyDone && (
    ownerFinanceProposal?.ok === true
    || ownerFinanceProposal?.recommendedBidPln != null
    || item.ourEstimatePln != null
  );

  const pipelineState = derivePipelineState({
    item,
    autoRunning,
    externalRunning,
    dossierBuilding,
    dossierSaving,
    dossierParseFailed,
    pricingReady,
    canStartHeavyParse: attachmentGate.canStartHeavyParse,
  });

  useEffect(() => {
    if (!isPipelineTimelineEnabled()) return;
    const stateChanged = prevStateRef.current !== pipelineState;
    const gateChanged = prevGateFingerprintRef.current !== attachmentGate.fingerprint;
    if (!stateChanged && !gateChanged) return;
    prevStateRef.current = pipelineState;
    prevGateFingerprintRef.current = attachmentGate.fingerprint;
    setTimeline(recordPipelineTimelineEvent(item.id, pipelineState, {
      gateStatus: attachmentGate.gateStatus,
      gateReason: attachmentGate.gateReason,
    }));
  }, [item.id, pipelineState, attachmentGate.fingerprint, attachmentGate.gateStatus, attachmentGate.gateReason]);

  const retryDossierParse = useCallback(() => {
    resetTenderDocumentsBootstrapForItem(item.id);
    setBootstrapRetryNonce((n) => n + 1);
    retryHeavyOnly();
  }, [item.id, retryHeavyOnly]);

  return {
    pipelineState,
    autoRunning,
    dossierBuilding,
    dossierSaving,
    dossierParseFailed,
    parseErrorMessage,
    retryDossierParse,
    retryNonce,
    kosztorysProcessSession,
    ownerFinanceProposal,
    bidProposal,
    trustAssessment,
    timeline,
    attachmentGateFingerprint: attachmentGate.fingerprint,
    attachmentGateStatus: attachmentGate.gateStatus,
    attachmentGateReason: attachmentGate.gateReason,
  };
}

/** Test-only reset. */
export function resetTenderPipelineRuntimeForTests(): void {
  resetTenderDocumentsBootstrapForTests();
  resetDossierHeavyLazyForTests();
  resetPipelineTimelineForTests();
}
