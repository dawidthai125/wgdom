import { ChevronDown } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderFitAssessment } from "@/lib/tenders-bzp-fit";
import { TenderParticipationPanel } from "@/app/TenderParticipationPanel";
import { TenderWorksRegisterPanel } from "@/app/TenderWorksRegisterPanel";
import { TenderFitPanel } from "@/app/TenderFitPanel";
import { TENDER_QUALIFICATION_SECTION_ID } from "@/lib/tender-workspace-ux";

export function TenderQualificationSection({
  item,
  swz,
  fit,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
  fit: TenderFitAssessment | null | undefined;
}) {
  return (
    <details
      id={TENDER_QUALIFICATION_SECTION_ID}
      open
      className="rounded-xl border border-border overflow-hidden group"
    >
      <summary className="px-3 py-2.5 text-xs font-semibold bg-secondary/40 hover:bg-secondary/60 cursor-pointer list-none flex items-center justify-between">
        <span>Kwalifikacja ofertowa</span>
        <ChevronDown size={14} className="transition-transform group-open:rotate-180 shrink-0" />
      </summary>
      <div className="px-3 pb-3 pt-2 space-y-3 border-t border-border">
        <TenderParticipationPanel swz={swz} />
        <TenderWorksRegisterPanel tenderId={item.tenderId ?? item.id} swz={swz} />
        <TenderFitPanel fit={fit} awardCriteria={swz?.awardCriteria} />
      </div>
    </details>
  );
}
