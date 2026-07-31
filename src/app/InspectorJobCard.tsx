import { MessageSquare } from "lucide-react";
import { JobMetaBadges } from "@/app/JobMetaPickers";
import { JobListPrimaryBadge } from "@/app/JobListStatus";
import { JobWmStageBadge, JobWmPlannedBadge } from "@/app/JobWmPanel";
import { InspectorProgressBar } from "@/app/InspectorProgressBar";
import { WgCard } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import { WG_DURATION_HOVER, WG_FOCUS_RING } from "@/lib/wg-ui-tokens";
import {
  collectMissingHandoverItems,
  computeInspectionProgress,
  getLastInspectorActivity,
  type InspectorDashboardJob,
} from "@/lib/inspector-dashboard";

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function fmtActivityTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InspectorJobCard({
  job,
  hasAdminReply,
  onSelect,
  compact = false,
  recoverableUnsettledCount,
  recoverableToRecoverAmount,
}: {
  job: InspectorDashboardJob & {
    inspectorPhotos?: { id: string }[];
    activityLog?: import("@/lib/job-activity").JobActivity[];
    jobNotes?: { id: string }[];
  };
  hasAdminReply?: boolean;
  onSelect: () => void;
  compact?: boolean;
  recoverableUnsettledCount?: number;
  recoverableToRecoverAmount?: number;
}) {
  const progress = computeInspectionProgress(job);
  const missing = collectMissingHandoverItems(job, 3);
  const lastActivity = getLastInspectorActivity(job);

  return (
    <WgCard
      as="button"
      type="button"
      elevation="soft"
      padding="sm"
      radius="md"
      onClick={onSelect}
      className={cn(
        "w-full text-left touch-manipulation",
        `transition-colors ${WG_DURATION_HOVER}`,
        "motion-reduce:transition-none",
        "active:scale-[0.99] motion-reduce:active:scale-100",
        WG_FOCUS_RING,
        hasAdminReply
          ? "border-violet-500/40 ring-1 ring-violet-500/20 hover:border-violet-500/50"
          : "hover:border-primary/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate leading-tight">
            {job.address || "Bez adresu"}
            {job.flatNumber && <span className="text-muted-foreground font-normal"> m.{job.flatNumber}</span>}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{job.client || "—"}</p>
          {!compact && <div className="mt-1"><JobMetaBadges job={job}/></div>}
        </div>
        <JobListPrimaryBadge job={job}/>
      </div>

      <div className="mt-2.5">
        <InspectorProgressBar percent={progress.percent}/>
      </div>

      <p className="text-xs text-muted-foreground mt-1.5 tabular-nums">
        Dokumenty {progress.docsDone}/{progress.docsTotal}
        {!compact && job.startDate && ` · Start ${fmtDate(job.startDate)}`}
      </p>

      {missing.length > 0 && job.status === "in_progress" && (
        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1.5 leading-snug">
          Brakuje do odbioru: {missing.join(", ")}
        </p>
      )}

      {hasAdminReply && (
        <p className="text-xs text-violet-600 dark:text-violet-400 font-medium mt-1.5 flex items-center gap-1">
          <MessageSquare size={10}/> Nowa odpowiedź admina
        </p>
      )}

      {lastActivity && !compact && (
        <p className="text-xs text-muted-foreground mt-1.5 truncate" title={lastActivity.text}>
          {lastActivity.actor} · {fmtActivityTime(lastActivity.at)} · {lastActivity.text}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 mt-2 items-center">
        <JobWmStageBadge job={job}/>
        <JobWmPlannedBadge job={job}/>
        {(recoverableUnsettledCount ?? 0) > 0 && (
          <span
            title={
              (recoverableToRecoverAmount ?? 0) > 0
                ? `Do odzyskania: ${recoverableToRecoverAmount!.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} PLN`
                : "Pozycje do rozliczenia"
            }
            className="text-xs bg-amber-500/12 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-md font-medium shrink-0"
          >
            💰 {recoverableUnsettledCount}
          </span>
        )}
      </div>
    </WgCard>
  );
}
