import { TEUX_FONT_CAPTION, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";
import { labelActionPl, type DecisionWorkspaceViewModel } from "@/lib/decision-workspace-ui";
import type { DecydentActionId } from "@/lib/decision-workspace-ui";

export function DecisionActionsBar({
  vm,
  onAction,
}: {
  vm: DecisionWorkspaceViewModel;
  onAction: (action: DecydentActionId) => void;
}) {
  if (vm.uiPhase === "hidden") return null;

  const buttons: Array<{
    id: DecydentActionId;
    enabled: boolean;
  }> = [
    { id: "approve", enabled: vm.canApprove },
    { id: "reject", enabled: vm.canReject },
    { id: "needs_review", enabled: vm.canNeedsReview },
    { id: "return", enabled: vm.canReturn },
  ];

  return (
    <section
      className="rounded-lg border border-border bg-secondary/20 px-3 py-2.5 space-y-2"
      data-decision-actions-bar
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className={TEUX_SECTION_TITLE}>Akcje Decydenta</p>
        <span
          className="rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold"
          data-decision-chip-business
        >
          {vm.businessDecisionChipPl}
        </span>
      </div>
      {vm.disabledReasonPl && (
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
          {vm.disabledReasonPl}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {buttons.map((b) => (
          <button
            key={b.id}
            type="button"
            disabled={!b.enabled}
            data-decision-action={b.id}
            className={`min-h-[44px] rounded-md px-3 py-2 text-[12px] font-semibold border transition-colors ${
              b.enabled
                ? "border-primary/40 bg-primary text-primary-foreground hover:opacity-90"
                : "border-border/50 bg-muted text-muted-foreground cursor-not-allowed opacity-60"
            } ${b.id === "reject" && b.enabled ? "bg-destructive text-destructive-foreground border-destructive/40" : ""} ${
              b.id === "return" && b.enabled
                ? "bg-background text-foreground border-border"
                : ""
            }`}
            onClick={() => onAction(b.id)}
          >
            {labelActionPl(b.id)}
          </button>
        ))}
      </div>
      <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`} data-decision-tre01-note>
        {vm.tre01NotePl}
      </p>
    </section>
  );
}
