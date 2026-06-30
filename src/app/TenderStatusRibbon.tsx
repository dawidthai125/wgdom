/**
 * NG-03.2 — Status Ribbon: Trust + Process Strip + Analysis Status (prezentacja).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { TenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import type { TenderTrustAssessment } from "@/lib/tender-trust-layer";
import type { TenderDetailV4TabId } from "@/lib/tender-detail-routes-v4";
import type { DecyzjaV4EmbedWorkspace } from "@/lib/tender-detail-routes-v4";
import type { KosztorysProcessSession } from "@/lib/tender-kosztorys-process-phase";
import { TenderWorkflowProcessStrip } from "@/app/TenderWorkflowProcessStrip";
import { TenderAnalysisStatusStrip } from "@/app/TenderAnalysisStatusStrip";
import { TrustBanner } from "@/app/tenders/trust/TrustBanner";
import { TrustChipRow } from "@/app/tenders/trust/TrustChipRow";
import { shouldRenderHubTrustBanner } from "@/lib/tender-trust-ui";

export function TenderStatusRibbon({
  item,
  swz,
  intelligenceCtx,
  trustAssessment,
  bidProposal,
  kosztorysSession,
  autoRunning,
  dossierBuilding,
  dossierSaving,
  onNavigateTab,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
  intelligenceCtx: TenderIntelligenceContext;
  trustAssessment: TenderTrustAssessment;
  bidProposal?: TenderBidProposal | null;
  kosztorysSession?: KosztorysProcessSession;
  autoRunning?: boolean;
  dossierBuilding?: boolean;
  dossierSaving?: boolean;
  onNavigateTab: (
    tab: TenderDetailV4TabId,
    opts?: { decyzjaWorkspace?: DecyzjaV4EmbedWorkspace },
  ) => void;
}) {
  return (
    <div className="space-y-1.5 sm:space-y-2" data-tender-status-ribbon>
      {shouldRenderHubTrustBanner(trustAssessment) && (
        <TrustBanner assessment={trustAssessment} variant="overall" />
      )}

      <TrustChipRow
        assessment={trustAssessment}
        surfaceId="hub"
        onNavigateTab={(tab) => onNavigateTab(tab)}
        dataAttr="hub"
      />

      <TenderWorkflowProcessStrip
        item={item}
        swz={swz}
        intelligenceCtx={intelligenceCtx}
        trustAssessment={trustAssessment}
        onNavigateTab={onNavigateTab}
      />

      <TenderAnalysisStatusStrip
        item={item}
        swz={swz}
        bidProposal={bidProposal}
        dossierBuilding={dossierBuilding}
        dossierSaving={dossierSaving}
        autoRunning={autoRunning}
        kosztorysSession={kosztorysSession}
        ribbonCompact
      />
    </div>
  );
}
