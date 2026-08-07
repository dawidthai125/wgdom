import { TEUX_FONT_CAPTION, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";
import type { ChiefDossierViewModel } from "@/lib/chief-dossier-ui";
import { chiefDossierColorClass, chiefDossierIcon } from "./chiefDossierUiTokens";

export function ChiefSessionStatusBar({ vm }: { vm: ChiefDossierViewModel }) {
  const Icon = chiefDossierIcon(vm.statusIconKey);
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-chief-session-status-bar
      data-chief-ui-phase={vm.uiPhase}
    >
      <span
        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold ${chiefDossierColorClass(vm.statusColor)}`}
      >
        <Icon
          size={12}
          className={vm.uiPhase === "running" || vm.uiPhase === "checking" ? "animate-spin" : ""}
        />
        {vm.sessionStatusLabelPl}
      </span>
      {vm.caseStatusLabelPl && (
        <span className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
          Case: <span className="font-medium text-foreground">{vm.caseStatusLabelPl}</span>
        </span>
      )}
      {vm.caseIdShort && (
        <span className={`${TEUX_FONT_CAPTION} font-mono text-muted-foreground truncate max-w-[14rem]`}>
          {vm.caseIdShort}
        </span>
      )}
      {vm.uiPhase === "ready" && (
        <span className={`${TEUX_SECTION_TITLE} text-emerald-700 dark:text-emerald-300`}>
          Gotowe dla Decydenta
        </span>
      )}
    </div>
  );
}
