import { TEUX_FONT_BODY, TEUX_FONT_CAPTION, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";
import type { DecisionWorkspaceViewModel } from "@/lib/decision-workspace-ui";

export function DecisionFindingsPanel({
  vm,
}: {
  vm: DecisionWorkspaceViewModel;
}) {
  if (
    vm.uiPhase === "hidden" ||
    vm.uiPhase === "no_dossier" ||
    vm.uiPhase === "process_running"
  ) {
    return null;
  }

  return (
    <section
      className="rounded-lg border border-border/60 px-3 py-2.5 space-y-2"
      data-decision-findings-panel
    >
      <p className={TEUX_SECTION_TITLE}>Findings QA</p>
      {vm.findingRows.length === 0 ? (
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
          Brak Findings QA
        </p>
      ) : (
        <ul className="space-y-2">
          {vm.findingRows.map((row) => (
            <li
              key={row.id}
              className="rounded-md border border-border/50 bg-background/40 px-2.5 py-2"
              data-decision-finding={row.code}
              data-decision-finding-severity={row.severity}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase ${
                    row.severity === "hard"
                      ? "text-destructive"
                      : "text-amber-700 dark:text-amber-400"
                  }`}
                >
                  {row.severity}
                </span>
                <span className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
                  {row.code}
                </span>
              </div>
              <p className={`${TEUX_FONT_BODY} mt-1`}>{row.messagePl}</p>
              {row.recommendationPl && (
                <p className={`${TEUX_FONT_CAPTION} mt-1 text-muted-foreground`}>
                  {row.recommendationPl}
                </p>
              )}
              {row.evidencePath && (
                <p className={`${TEUX_FONT_CAPTION} mt-0.5 text-muted-foreground/80`}>
                  {row.evidencePath}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
