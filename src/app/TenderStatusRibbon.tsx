/**
 * NG-03.2 — Status Ribbon: Trust + Process Strip (prezentacja).
 * P0 — Analysis Strip w accordion „Szczegóły postępu”; compact / ultra-compact ≤390px.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import type { TenderTrustAssessment } from "@/lib/tender-trust-layer";
import type { TenderDetailV4TabId } from "@/lib/tender-detail-routes-v4";
import type { DecyzjaV4EmbedWorkspace } from "@/lib/tender-detail-routes-v4";
import { TenderWorkflowProcessStrip } from "@/app/TenderWorkflowProcessStrip";
import { TrustChipRow } from "@/app/tenders/trust/TrustChipRow";

export function TenderStatusRibbon({
  item,
  swz,
  intelligenceCtx,
  trustAssessment,
  onNavigateTab,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
  intelligenceCtx: TenderIntelligenceContext;
  trustAssessment: TenderTrustAssessment;
  onNavigateTab: (
    tab: TenderDetailV4TabId,
    opts?: { decyzjaWorkspace?: DecyzjaV4EmbedWorkspace },
  ) => void;
}) {
  return (
    <div
      className="space-y-1.5 max-[390px]:space-y-1"
      data-tender-status-ribbon
      data-tender-ribbon-density="compact"
    >
      <div className="max-[390px]:hidden">
        <TrustChipRow
          assessment={trustAssessment}
          surfaceId="hub"
          onNavigateTab={(tab) => onNavigateTab(tab)}
          dataAttr="hub"
        />
      </div>

      <TenderWorkflowProcessStrip
        item={item}
        swz={swz}
        intelligenceCtx={intelligenceCtx}
        trustAssessment={trustAssessment}
        onNavigateTab={onNavigateTab}
        variant="ribbon"
      />
    </div>
  );
}
