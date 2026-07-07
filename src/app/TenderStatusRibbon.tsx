/**
 * NG-03.2 — Status Ribbon: Trust (collapsible) + Process Strip (zawsze widoczny).
 * NG-06-TEUX-7b — zwijane sygnały zaufania; Process Strip poza collapsible.
 */

import { useCallback, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import type { TenderTrustAssessment } from "@/lib/tender-trust-layer";
import type { TenderDetailV4TabId } from "@/lib/tender-detail-routes-v4";
import type { DecyzjaV4EmbedWorkspace } from "@/lib/tender-detail-routes-v4";
import { TenderWorkflowProcessStrip } from "@/app/TenderWorkflowProcessStrip";
import { TrustChipRow } from "@/app/tenders/trust/TrustChipRow";
import {
  loadTrustRibbonCollapsed,
  saveTrustRibbonCollapsed,
} from "@/lib/tender-command-layer-ux";
import {
  TEUX_DURATION_NORMAL,
  TEUX_FONT_CAPTION,
  TEUX_TRANSITION_FAST,
} from "@/lib/tender-ux-tokens";

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
  const [trustCollapsed, setTrustCollapsed] = useState(loadTrustRibbonCollapsed);

  const handleTrustToggle = useCallback(() => {
    setTrustCollapsed((prev) => {
      const next = !prev;
      saveTrustRibbonCollapsed(next);
      return next;
    });
  }, []);

  return (
    <div
      className="space-y-1.5 max-[390px]:space-y-1 md:max-lg:space-y-2"
      data-tender-status-ribbon
      data-tender-ribbon-density="compact"
    >
      <div
        className="max-[390px]:hidden"
        data-tender-command-collapsible
        data-teux7b-trust-collapsible
      >
        <button
          type="button"
          className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 min-h-[36px] rounded-md border border-border/60 bg-secondary/30 ${TEUX_FONT_CAPTION} font-medium text-muted-foreground touch-manipulation ${TEUX_TRANSITION_FAST} focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
          aria-expanded={!trustCollapsed}
          aria-controls="teux7b-trust-ribbon-panel"
          data-teux7b-trust-toggle
          onClick={handleTrustToggle}
        >
          <span>Sygnały zaufania</span>
          <ChevronDown
            size={14}
            className={`shrink-0 opacity-70 transition-transform ${TEUX_DURATION_NORMAL} motion-reduce:transition-none ${
              trustCollapsed ? "" : "rotate-180"
            }`}
            aria-hidden
          />
        </button>
        {!trustCollapsed && (
          <div
            id="teux7b-trust-ribbon-panel"
            className="pt-1.5 motion-reduce:transition-none"
          >
            <TrustChipRow
              assessment={trustAssessment}
              surfaceId="hub"
              onNavigateTab={(tab) => onNavigateTab(tab)}
              dataAttr="hub"
            />
          </div>
        )}
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
