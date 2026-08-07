import { TEUX_FONT_CAPTION, TEUX_FONT_MONO } from "@/lib/tender-ux-tokens";
import type { DecisionWorkspaceViewModel } from "@/lib/decision-workspace-ui";

export function DecisionProcessStatusBar({
  vm,
}: {
  vm: DecisionWorkspaceViewModel;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 text-[11px]"
      data-decision-process-status
    >
      <span
        className="rounded-md border border-border/60 bg-secondary/40 px-2 py-1 font-semibold"
        data-decision-chip-process
      >
        {vm.processChipPl}
      </span>
      {vm.caseIdShort && (
        <span className={`${TEUX_FONT_MONO} text-muted-foreground`}>
          Case {vm.caseIdShort}
        </span>
      )}
      {vm.readyForDecisionProcess && (
        <span className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
          ready_for_decydent
        </span>
      )}
    </div>
  );
}
