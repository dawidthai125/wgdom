import { useMemo } from "react";
import { computeBidPrepChecks } from "@/app/TenderBidPrepPanel";
import { useTendersContext } from "@/app/tenders/context/TendersContext";
import { buildTenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import { checkTenderParticipation } from "@/lib/tender-participation-check";
import { extractExperienceRequirements } from "@/lib/tender-experience-requirements";
import { extractParticipationRequirements } from "@/lib/tender-participation-requirements";
import { loadCompanyQualificationProfileLocal } from "@/lib/company-qualification-profile";
import { loadOwnerDecisions } from "@/lib/tenders-strategy-owner-decisions";
import { tenderDossierHeavyParseDone } from "@/lib/tender-dossier-pipeline";
import { getTenderMonitoringCounts } from "@/lib/tender-workspace-ux";
import type { TenderPipelineRuntime } from "@/lib/tender-pipeline/tender-pipeline-types";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";

/**
 * NG-03.2 — SSOT intelligence + decyzje dla Command Layer (Przetarg).
 * Prezentacja only — reuse logiki z TenderDetailPanel.
 */
export function useTenderPrzetargCommandContext(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
  pipelineRuntime: TenderPipelineRuntime,
) {
  const { snapshot } = useTendersContext();
  const scoringContext = snapshot.scoringContext;
  const {
    ownerFinanceProposal,
    kosztorysProcessSession,
    pricingReadyPartial,
    pricingReadyFinal,
  } = pipelineRuntime;

  const heavyDone = tenderDossierHeavyParseDone(item.tenderDossier);
  const pricingDeferred = !ownerFinanceProposal && !heavyDone;

  const bidPrepChecks = useMemo(
    () => computeBidPrepChecks(item, swz, item.tenderFit, ownerFinanceProposal, {
      pricingDeferred,
      kosztorysSession: kosztorysProcessSession,
    }),
    [item, swz, ownerFinanceProposal, pricingDeferred, kosztorysProcessSession],
  );

  const ownerDecision = useMemo(
    () => loadOwnerDecisions().byId[item.id] ?? null,
    [item.id],
  );

  const participationResult = useMemo(() => {
    const combinedText = [item.title, item.noticeHtml ?? ""].join("\n");
    const requirements = swz?.participationRequirements?.length
      ? swz.participationRequirements
      : extractParticipationRequirements(combinedText);
    const experienceRequirements = swz?.experienceRequirements?.length
      ? swz.experienceRequirements
      : extractExperienceRequirements(combinedText);
    if (requirements.length === 0 && experienceRequirements.length === 0) return null;
    return checkTenderParticipation(
      requirements,
      loadCompanyQualificationProfileLocal(),
      experienceRequirements,
    );
  }, [
    item.title,
    item.noticeHtml,
    swz?.participationRequirements,
    swz?.experienceRequirements,
  ]);

  const monitoringCounts = useMemo(() => getTenderMonitoringCounts(item), [item]);

  const intelligenceCtx = useMemo(() => {
    if (!scoringContext) return null;
    return buildTenderIntelligenceContext({
      item,
      scoringContext,
      ownerFinanceProposal,
      ownerDecision,
      monitoringCounts,
      bidPrepChecks,
      participationResult,
      swz,
      fit: item.tenderFit,
      kosztorysProcessSession,
      pricingReadyPartial,
      pricingReadyFinal,
    });
  }, [
    item,
    scoringContext,
    ownerFinanceProposal,
    ownerDecision,
    monitoringCounts,
    bidPrepChecks,
    participationResult,
    swz,
    kosztorysProcessSession,
    pricingReadyPartial,
    pricingReadyFinal,
  ]);

  return {
    intelligenceCtx,
    ownerDecision,
    participationResult,
    bidPrepChecks,
  };
}
