/** WM-DOKUMENTACJA-SZKICE-01 P2a — Dashboard sekcja Szkice Techniczne (job-centric). */

import { Pencil, ChevronRight } from "lucide-react";
import { WgButton, WgCard } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import { WG_FOCUS_RING, WG_TOUCH_MIN } from "@/lib/wg-ui-tokens";
import {
  formatJobSketchRelativeTime,
  jobSketchActorRoleLabel,
  jobSketchKindLabel,
  type JobSketchDashboardJobGroup,
} from "@/lib/wm-technical-drawings/job-sketch-dashboard";
import { JOB_SKETCH_DASHBOARD_DEEP_LINK } from "@/lib/wm-technical-drawings/job-sketch-dashboard";

export function DashboardJobSketchesSection({
  groups,
  pendingTotal,
  onOpenSketch,
  onOpenJob,
}: {
  groups: JobSketchDashboardJobGroup[];
  pendingTotal: number;
  /** MUST: jobs → reports → drawingId (never wm_print). */
  onOpenSketch: (jobId: string, drawingId: string) => void;
  onOpenJob: (jobId: string) => void;
}) {
  if (groups.length === 0) return null;

  return (
    <WgCard elevation="soft" padding="sm" radius="lg" className="border-violet-500/25 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold flex items-center gap-2 flex-wrap">
            <Pencil size={16} className="text-violet-500 shrink-0" />
            Szkice Techniczne
            {pendingTotal > 0 && (
              <span
                data-testid="dashboard-job-sketch-pending"
                className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full"
              >
                {pendingTotal} oczekuje
              </span>
            )}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            Dokumentacja robót · nie Odbiory WM → Rysunki
          </p>
        </div>
      </div>

      <div className="space-y-3" data-testid="dashboard-job-sketch-groups">
        {groups.map((group) => (
          <div
            key={group.jobId}
            data-testid="dashboard-job-sketch-group"
            data-priority={group.priority}
            className={cn(
              "rounded-lg border px-3 py-2.5 space-y-2",
              group.priority === "HIGH"
                ? "border-rose-500/30 bg-rose-500/5"
                : "border-border/60 bg-muted/20",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{group.jobLabel}</p>
                <p className="text-[11px] text-muted-foreground">
                  {group.attentionCount}{" "}
                  {group.attentionCount === 1 ? "szkic wymaga uwagi" : "szkice wymagają uwagi"}
                  {group.priority === "HIGH" ? " · HIGH" : ""}
                </p>
              </div>
              <WgButton
                type="button"
                variant="secondary"
                size="sm"
                className={cn(WG_TOUCH_MIN, "shrink-0")}
                data-testid="dashboard-job-sketch-open-job"
                onClick={() => onOpenJob(group.jobId)}
              >
                Otwórz
                <ChevronRight size={14} className="ml-0.5" />
              </WgButton>
            </div>

            <ul className="space-y-1.5">
              {group.sketches.map((row) => (
                <li key={row.drawingId}>
                  <button
                    type="button"
                    data-testid="dashboard-job-sketch-row"
                    data-drawing-id={row.drawingId}
                    data-deep-link-section={JOB_SKETCH_DASHBOARD_DEEP_LINK.section}
                    className={cn(
                      "w-full text-left rounded-md px-2.5 py-2 border border-transparent",
                      "hover:border-violet-500/30 hover:bg-violet-500/5",
                      WG_FOCUS_RING,
                      WG_TOUCH_MIN,
                    )}
                    onClick={() => onOpenSketch(group.jobId, row.drawingId)}
                  >
                    <p className="text-xs font-medium truncate">
                      {row.actorName}
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        · {jobSketchActorRoleLabel(row.actorRole)}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                      <span
                        className={cn(
                          "font-semibold",
                          row.kind === "needs_changes" ? "text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-300",
                        )}
                      >
                        {jobSketchKindLabel(row.kind)}
                      </span>
                      <span>{formatJobSketchRelativeTime(row.at)}</span>
                      {row.title ? <span className="truncate">· {row.title}</span> : null}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </WgCard>
  );
}
