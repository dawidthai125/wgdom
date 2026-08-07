/**
 * DECISION-WORKSPACE-01 — READ ONLY surface + Dual Outcome.
 * Jedyny input render: DecisionWorkspaceViewModel.
 */

import { TEUX_FONT_BODY, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";
import type {
  DecydentActionId,
  DecisionWorkspaceViewModel,
} from "@/lib/decision-workspace-ui";
import { DecisionActionsBar } from "./DecisionActionsBar";
import { DecisionFindingsPanel } from "./DecisionFindingsPanel";
import { DecisionProcessStatusBar } from "./DecisionProcessStatusBar";
import { DecisionRecommendationPanel } from "./DecisionRecommendationPanel";
import { DecisionValidationSummary } from "./DecisionValidationSummary";

export function DecisionWorkspaceSurface({
  vm,
  selectedScenarioStrategy,
  onSelectScenario,
  onAction,
}: {
  vm: DecisionWorkspaceViewModel;
  selectedScenarioStrategy: string | null;
  onSelectScenario: (strategy: string | null) => void;
  onAction: (action: DecydentActionId) => void;
}) {
  if (vm.uiPhase === "hidden") return null;

  return (
    <section
      id="decision-workspace-surface"
      data-decision-workspace-surface
      data-decision-ui-phase={vm.uiPhase}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="px-4 py-2.5 border-b border-border/60 bg-secondary/30">
        <h2 className={`${TEUX_SECTION_TITLE} text-foreground`}>{vm.titlePl}</h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">{vm.subtitlePl}</p>
      </div>

      <div className="px-4 py-3 space-y-3">
        <DecisionProcessStatusBar vm={vm} />

        {vm.emptyMessagePl && (
          <p
            className={`${TEUX_FONT_BODY} text-muted-foreground`}
            data-decision-empty-message
          >
            {vm.emptyMessagePl}
          </p>
        )}

        <DecisionValidationSummary vm={vm} />
        <DecisionRecommendationPanel
          vm={vm}
          selectedScenarioStrategy={selectedScenarioStrategy}
          onSelectScenario={onSelectScenario}
        />
        <DecisionFindingsPanel vm={vm} />
        <DecisionActionsBar vm={vm} onAction={onAction} />
      </div>
    </section>
  );
}
