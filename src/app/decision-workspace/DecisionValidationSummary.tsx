import { TEUX_FONT_BODY, TEUX_FONT_CAPTION, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";
import type { DecisionWorkspaceViewModel } from "@/lib/decision-workspace-ui";

export function DecisionValidationSummary({
  vm,
}: {
  vm: DecisionWorkspaceViewModel;
}) {
  if (vm.uiPhase === "hidden" || vm.uiPhase === "no_dossier") return null;
  if (vm.verdict == null && vm.uiPhase !== "error") return null;

  return (
    <section
      className="rounded-lg border border-border/60 bg-background/50 px-3 py-2.5 space-y-2"
      data-decision-validation-summary
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className={TEUX_SECTION_TITLE}>Walidacja QA</p>
        <span
          className="rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold"
          data-decision-chip-qa
        >
          {vm.qaChipPl}
        </span>
      </div>
      {vm.reportSummaryPl && (
        <p className={TEUX_FONT_BODY}>{vm.reportSummaryPl}</p>
      )}
      <p className={TEUX_FONT_CAPTION}>
        Hard: {vm.hardCount} · Soft: {vm.softCount} / limit {vm.softLimit}
      </p>
      {vm.chainCoverage && (
        <ul className={`${TEUX_FONT_CAPTION} grid grid-cols-2 gap-1 text-muted-foreground`}>
          <li>EE: {vm.chainCoverage.execution ? "✓" : "—"}</li>
          <li>ME: {vm.chainCoverage.materials ? "✓" : "—"}</li>
          <li>PE: {vm.chainCoverage.pricing ? "✓" : "—"}</li>
          <li>Cost: {vm.chainCoverage.cost ? "✓" : "—"}</li>
          <li>Offer: {vm.chainCoverage.offer ? "✓" : "—"}</li>
        </ul>
      )}
      {vm.notesPl.length > 0 && (
        <ul className={`${TEUX_FONT_CAPTION} list-disc pl-4 space-y-0.5`}>
          {vm.notesPl.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
