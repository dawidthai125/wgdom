import { HelpCircle } from "lucide-react";
import {
  JOB_LIST_STATUS_CONFIG,
  resolveJobListStatus,
  type JobListFilter,
  type JobListStatusJob,
  type JobListStatusKind,
} from "@/lib/job-list-status";

export function JobListPrimaryBadge({ job }: { job: JobListStatusJob }) {
  const kind = resolveJobListStatus(job);
  const cfg = JOB_LIST_STATUS_CONFIG[kind];
  return (
    <span
      title={cfg.hint}
      className={`inline-flex items-center text-[11px] px-2.5 py-1 rounded-full font-semibold border shrink-0 ${cfg.badgeClass}`}
    >
      {cfg.label}
    </span>
  );
}

export function JobListLegend({ compact = false }: { compact?: boolean }) {
  const items: JobListStatusKind[] = ["in_progress", "docs_pending", "ready_handover", "completed"];
  return (
    <div
      className={`rounded-xl border border-border bg-secondary/30 ${compact ? "px-3 py-2" : "px-3 py-3"} space-y-2`}
      title="Legenda statusów na liście robót"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <HelpCircle size={11}/>
        Statusy robót
      </p>
      <ul className={`space-y-1.5 ${compact ? "text-[10px]" : "text-[11px]"}`}>
        {items.map((kind) => {
          const cfg = JOB_LIST_STATUS_CONFIG[kind];
          const dotClass: Record<JobListStatusKind, string> = {
            in_progress: "bg-yellow-400",
            docs_pending: "bg-orange-400",
            ready_handover: "bg-emerald-400",
            completed: "bg-green-400",
          };
          return (
            <li key={kind} className="flex items-start gap-2">
              <span className={`shrink-0 mt-1 inline-block w-2 h-2 rounded-full ${dotClass[kind]}`}/>
              <span className="text-muted-foreground leading-snug">
                <strong className="text-foreground/90 font-medium">{cfg.label}</strong>
                {" — "}
                {cfg.hint}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function JobListFilterBar({
  filter,
  onFilter,
  counts,
}: {
  filter: JobListFilter;
  onFilter: (f: JobListFilter) => void;
  counts: Record<JobListFilter, number>;
}) {
  const tabs: { id: JobListFilter; label: string }[] = [
    { id: "all", label: "Wszystkie" },
    { id: "in_progress", label: "W trakcie" },
    { id: "handover", label: "Do odbioru" },
    { id: "completed", label: "Zdane" },
  ];
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onFilter(t.id)}
          className={`text-xs py-2 min-h-[40px] rounded-lg font-medium transition-colors touch-manipulation border ${
            filter === t.id
              ? "bg-primary/10 text-foreground border-primary/35"
              : "text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          {t.label}
          <span className="ml-1 opacity-70">({counts[t.id]})</span>
        </button>
      ))}
    </div>
  );
}
