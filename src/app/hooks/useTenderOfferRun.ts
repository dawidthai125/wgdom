/**
 * TRE-01 Slice A — cienki hook Offer Run.
 * Obserwuje istniejący useTenderPipelineRuntime — nie zastępuje go.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { TenderPipelineRuntime } from "@/lib/tender-pipeline/tender-pipeline-types";
import { deriveOfferRunSnapshot } from "@/lib/tender-offer-run";
import {
  bootstrapOfferRunFoundation,
  createOfferRunInsufficientError,
  createOfferRunPipelineError,
  digestRecommendationPayload,
  emitOfferRecommendedEvent,
  emitOfferRunDegradedEvent,
  emitOfferRunFailedEvent,
  emitRecommendationIssuedAudit,
} from "@/lib/tender-offer-run-foundation";
import {
  buildTenderRecommendationResult,
  type TenderRecommendationResult,
} from "@/lib/tender-recommendation-result";

export function useTenderOfferRun(opts: {
  enabled: boolean;
  tenderPipelineItemId: string;
  pipelineRuntime: TenderPipelineRuntime;
}): {
  runId: string | null;
  recommendation: TenderRecommendationResult | null;
  snapshotPhase: string | null;
} {
  const { enabled, tenderPipelineItemId, pipelineRuntime } = opts;
  const [runId, setRunId] = useState<string | null>(null);
  const bootstrappedForRef = useRef<string | null>(null);
  const issuedForRunRef = useRef<string | null>(null);
  const degradedForRunRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !tenderPipelineItemId.trim()) {
      setRunId(null);
      bootstrappedForRef.current = null;
      return;
    }
    if (bootstrappedForRef.current === tenderPipelineItemId) return;
    let cancelled = false;
    bootstrappedForRef.current = tenderPipelineItemId;
    issuedForRunRef.current = null;
    degradedForRunRef.current = null;
    void (async () => {
      try {
        const handles = await bootstrapOfferRunFoundation({
          tenderPipelineItemId,
        });
        if (!cancelled) setRunId(handles.runId);
      } catch {
        if (!cancelled) setRunId(null);
        bootstrappedForRef.current = null;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, tenderPipelineItemId]);

  const snapshot = useMemo(() => {
    if (!enabled) return null;
    return deriveOfferRunSnapshot({
      pipelineState: pipelineRuntime.pipelineState,
      autoRunning: pipelineRuntime.autoRunning,
      dossierBuilding: pipelineRuntime.dossierBuilding,
      dossierSaving: pipelineRuntime.dossierSaving,
      dossierParseFailed: pipelineRuntime.dossierParseFailed,
      parseErrorMessage: pipelineRuntime.parseErrorMessage,
      pricingReadyPartial: pipelineRuntime.pricingReadyPartial,
      pricingReadyFinal: pipelineRuntime.pricingReadyFinal,
      bidProposal: pipelineRuntime.bidProposal,
      trustAssessment: pipelineRuntime.trustAssessment,
      discoveryMergedItem: pipelineRuntime.discoveryMergedItem,
    });
  }, [
    enabled,
    pipelineRuntime.pipelineState,
    pipelineRuntime.autoRunning,
    pipelineRuntime.dossierBuilding,
    pipelineRuntime.dossierSaving,
    pipelineRuntime.dossierParseFailed,
    pipelineRuntime.parseErrorMessage,
    pipelineRuntime.pricingReadyPartial,
    pipelineRuntime.pricingReadyFinal,
    pipelineRuntime.bidProposal,
    pipelineRuntime.trustAssessment,
    pipelineRuntime.discoveryMergedItem,
  ]);

  const recommendation = useMemo(() => {
    if (!runId || !snapshot) return null;
    return buildTenderRecommendationResult({
      runId,
      snapshot,
      trustAssessment: pipelineRuntime.trustAssessment,
    });
  }, [runId, snapshot, pipelineRuntime.trustAssessment]);

  /** FND-02/04/05 przy wydanej rekomendacji; FND-03 mapowanie błędów → eventy (bez UI). */
  useEffect(() => {
    if (!enabled || !runId || !recommendation) return;

    if (
      recommendation.hasBidRecommendation &&
      recommendation.recommendedOfferPln != null &&
      issuedForRunRef.current !== runId
    ) {
      issuedForRunRef.current = runId;
      void (async () => {
        try {
          await digestRecommendationPayload({
            runId,
            recommendedOfferPln: recommendation.recommendedOfferPln!,
            tenderPipelineItemId,
          });
          await emitRecommendationIssuedAudit({
            runId,
            tenderPipelineItemId,
            recommendedOfferPln: recommendation.recommendedOfferPln!,
          });
          await emitOfferRecommendedEvent({
            runId,
            recommendedOfferPln: recommendation.recommendedOfferPln!,
          });
        } catch {
          /* spine best-effort — nie blokuj Outcome */
        }
      })();
      return;
    }

    if (
      (recommendation.qualityStatus === "insufficient_data" ||
        recommendation.qualityStatus === "failed") &&
      degradedForRunRef.current !== runId
    ) {
      degradedForRunRef.current = runId;
      const reason = recommendation.statusLabelPl;
      try {
        if (recommendation.qualityStatus === "failed") {
          createOfferRunPipelineError(reason);
          void emitOfferRunFailedEvent({ runId, reason });
        } else {
          createOfferRunInsufficientError(reason);
          void emitOfferRunDegradedEvent({ runId, reason });
        }
      } catch {
        /* ignore */
      }
    }
  }, [enabled, runId, recommendation, tenderPipelineItemId]);

  return {
    runId,
    recommendation,
    snapshotPhase: snapshot?.phase ?? null,
  };
}
