/**
 * WIRE-CHIEF-UI-DOSSIER-01 — READ ONLY surface.
 * Jedyny input: ChiefDossierViewModel (z Session output).
 */

import { TEUX_FONT_BODY, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";
import type { ChiefDossierViewModel } from "@/lib/chief-dossier-ui";
import type { ExpertWorkspaceViewModel } from "@/lib/expert-workspace-ui";
import { ExpertWorkspaceSurface } from "@/app/expert-workspace";
import { ChiefBlockersPanel, ChiefLoopReturnBadge } from "./ChiefBlockersPanel";
import { ChiefExpertTraceList } from "./ChiefExpertTraceCard";
import { ChiefOfferRecommendation } from "./ChiefOfferRecommendation";
import { ChiefSessionStatusBar } from "./ChiefSessionStatusBar";
import { ChiefTaskTimeline } from "./ChiefTaskTimeline";

const EMPTY_PHASES = new Set([
  "no_case",
  "not_ready",
  "cancelled",
  "error",
  "checking",
  "running",
]);

export function ChiefDossierSurface({
  vm,
  expertWorkspaceVm = null,
}: {
  vm: ChiefDossierViewModel;
  /** WIRE-EXPERTS-UI-01 — Slot A under Trace. */
  expertWorkspaceVm?: ExpertWorkspaceViewModel | null;
}) {
  const isEmptyish = EMPTY_PHASES.has(vm.uiPhase);

  return (
    <section
      id="chief-dossier-surface"
      data-chief-dossier-surface
      data-chief-ui-phase={vm.uiPhase}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="px-4 py-2.5 border-b border-border/60 bg-secondary/30">
        <h2 className={`${TEUX_SECTION_TITLE} text-foreground`}>{vm.titlePl}</h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">{vm.subtitlePl}</p>
      </div>

      <div className="px-4 py-3 space-y-3" data-s4-chief-order="trace-ew-offer">
        <ChiefSessionStatusBar vm={vm} />

        {isEmptyish && vm.emptyMessagePl && (
          <p className={`${TEUX_FONT_BODY} text-muted-foreground`} data-chief-empty-message>
            {vm.emptyMessagePl}
          </p>
        )}

        {vm.showBlockers && <ChiefBlockersPanel blockersPl={vm.blockersPl} />}

        {vm.showLoopReturn && (
          <ChiefLoopReturnBadge
            loopCount={vm.loopCount}
            returnToMaterialExpert={vm.returnToMaterialExpert}
            requiresReanalysis={vm.requiresReanalysis}
            orchestrationNotesPl={vm.orchestrationNotesPl}
          />
        )}

        {vm.showTimeline && <ChiefTaskTimeline rows={vm.taskRows} />}

        {/* S4 LOCKED: Trace → Expert Workspace → Offer Recommendation */}
        {vm.showTraces && <ChiefExpertTraceList slots={vm.traceSlots} />}

        {expertWorkspaceVm != null && (
          <ExpertWorkspaceSurface vm={expertWorkspaceVm} />
        )}

        {vm.showOffer && vm.primaryRecommendation && (
          <div data-s4-step="rekomendacja">
            <ChiefOfferRecommendation
              primaryRecommendation={vm.primaryRecommendation}
              scenarios={vm.scenarios}
              decisionMakerPayload={vm.decisionMakerPayload}
              offerHandoffPayload={vm.offerHandoffPayload}
            />
          </div>
        )}
      </div>
    </section>
  );
}
