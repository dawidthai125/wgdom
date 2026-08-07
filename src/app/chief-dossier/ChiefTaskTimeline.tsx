import { TEUX_FONT_BODY, TEUX_FONT_CAPTION, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";
import type { ChiefTaskRowView } from "@/lib/chief-dossier-ui";
import { chiefDossierColorClass, chiefDossierIcon } from "./chiefDossierUiTokens";

export function ChiefTaskTimeline({ rows }: { rows: ChiefTaskRowView[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-2" data-chief-task-timeline>
      <p className={TEUX_SECTION_TITLE}>Timeline Task</p>
      <ol className="space-y-1.5">
        {rows.map((row) => {
          const Icon = chiefDossierIcon(row.statusIconKey);
          return (
            <li
              key={row.id}
              className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/40 px-2.5 py-2"
              data-chief-task-id={row.id}
              data-chief-task-status={row.status}
            >
              <Icon size={14} className="shrink-0 mt-0.5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`${TEUX_FONT_CAPTION} font-semibold`}>{row.labelPl}</span>
                  <span
                    className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${chiefDossierColorClass(row.statusColor)}`}
                  >
                    {row.statusLabelPl}
                  </span>
                </div>
                {row.failReasonPl && (
                  <p className={`${TEUX_FONT_BODY} text-red-700 dark:text-red-300 mt-1`}>
                    {row.failReasonPl}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
