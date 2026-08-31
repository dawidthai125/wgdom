/**
 * IK-ANALYSIS-DECISION-BID-HANDOFF-01 — presentation strip (outside Expert Room chrome).
 * Pure props · ZERO orchestra · ZERO Observation mutation · ZERO pricing.
 */

import type { IkAnalysisHandoffViewModel } from "@/lib/intelligent-estimator/ik-analysis-handoff-ui";
import { TEUX_FONT_CAPTION } from "@/lib/tender-ux-tokens";
import { cn } from "@/app/components/ui/utils";
import { WG_TOUCH_MIN, WG_DURATION_ENTER } from "@/lib/wg-ui-tokens";
import { WgButton } from "@/app/ui";

const BUCKET_TONE: Record<IkAnalysisHandoffViewModel["bucket"], string> = {
  completed: "border-emerald-500/30 bg-emerald-500/5",
  in_progress: "border-primary/30 bg-primary/5",
  hold: "border-amber-500/40 bg-amber-500/5",
  pending: "border-border bg-secondary/30",
  requires_owner: "border-amber-500/40 bg-amber-500/5",
  ready_for_next: "border-emerald-500/30 bg-emerald-500/5",
};

export function IkAnalysisHandoffStrip({
  vm,
  onHandoffCta,
}: {
  vm: IkAnalysisHandoffViewModel;
  onHandoffCta?: () => void;
}) {
  const showCta = vm.cta.kind !== "none" && Boolean(vm.cta.labelPl) && onHandoffCta;

  return (
    <section
      className={cn(
        "shrink-0 mx-4 sm:mx-6 mt-0 mb-0 rounded-xl border px-3 py-2.5 space-y-2",
        BUCKET_TONE[vm.bucket],
      )}
      data-ik-analysis-handoff="1"
      data-ik-analysis-handoff-bucket={vm.bucket}
      data-ik-analysis-handoff-overall={vm.overallStatus}
      data-ik-analysis-handoff-cta={vm.cta.kind}
      data-ik-analysis-handoff-final-null={vm.observationFinalIsNull ? "1" : "0"}
      data-ik-analysis-handoff-eta-null={vm.observationEtaIsNull ? "1" : "0"}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>
            {vm.titlePl}
            <span className="ml-2 font-normal text-muted-foreground tabular-nums">
              {vm.progressPercent}%
            </span>
          </p>
          <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
            {vm.summaryPl}
          </p>
          {vm.g3FinalBidNotePl ? (
            <p
              className={`${TEUX_FONT_CAPTION} text-emerald-900 dark:text-emerald-100 font-medium`}
              data-ik-analysis-handoff-g3-final-bid
              data-ik-g3-persisted="1"
            >
              {vm.g3FinalBidNotePl}
            </p>
          ) : null}
          {vm.bidGapNotePl ? (
            <p
              className={`${TEUX_FONT_CAPTION} text-amber-900 dark:text-amber-100`}
              data-ik-analysis-handoff-bid-gap
              data-ik-g3-persisted={vm.g3Persisted ? "1" : "0"}
            >
              {vm.g3Persisted ? "P7: " : "Bid: "}
              {vm.bidGapNotePl}
            </p>
          ) : null}
        </div>
        {showCta ? (
          <WgButton
            type="button"
            variant="primary"
            onClick={onHandoffCta}
            className={cn(
              "rounded-xl shrink-0",
              WG_TOUCH_MIN,
              "h-11 px-3 text-sm",
              `transition-colors ${WG_DURATION_ENTER}`,
            )}
            data-ik-analysis-handoff-cta-btn
          >
            {vm.cta.labelPl}
          </WgButton>
        ) : null}
      </div>
      <p className={`${TEUX_FONT_CAPTION} text-[10px] text-muted-foreground`}>
        IK analiza → Workspace (Decyzja / Wycena). Bez Phase 5 · bez nowego silnika.
      </p>
    </section>
  );
}
