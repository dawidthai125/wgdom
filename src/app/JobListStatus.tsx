import { HelpCircle, CheckCircle2, Circle, FileWarning } from "lucide-react";
import { DOC_LABELS, REQUIRED_DOCS } from "@/lib/job-documents";
import {
  JOB_LIST_STATUS_CONFIG,
  JOB_PHASE_HINTS,
  JOB_PHASE_LABELS,
  applyJobPhase,
  inferJobPhase,
  jobMissingRequiredDocs,
  resolveJobListStatus,
  type JobListFilter,
  type JobPhase,
  type JobListStatusJob,
  type JobListStatusKind,
} from "@/lib/job-list-status";

const PHASE_BUTTON_CLASS: Record<JobPhase, { active: string; idle: string }> = {
  in_progress: {
    active: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
    idle: "bg-secondary text-muted-foreground border-border hover:border-yellow-500/25",
  },
  handover: {
    active: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
    idle: "bg-secondary text-muted-foreground border-border hover:border-orange-500/25",
  },
  completed: {
    active: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
    idle: "bg-secondary text-muted-foreground border-border hover:border-green-500/25",
  },
};

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

export function JobPhasePicker({
  job,
  onPhaseChange,
}: {
  job: JobListStatusJob;
  onPhaseChange: (phase: JobPhase) => void;
}) {
  const phase = inferJobPhase(job);
  const missing = jobMissingRequiredDocs(job);
  const phases: JobPhase[] = ["in_progress", "handover", "completed"];

  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status roboty</p>
      <div className="flex flex-wrap gap-2">
        {phases.map((p) => {
          const active = phase === p;
          const cls = PHASE_BUTTON_CLASS[p];
          return (
            <button
              key={p}
              type="button"
              title={JOB_PHASE_HINTS[p]}
              onClick={() => onPhaseChange(p)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors touch-manipulation ${
                active ? cls.active : cls.idle
              }`}
            >
              {active ? <CheckCircle2 size={14}/> : <Circle size={14} className="opacity-50"/>}
              {JOB_PHASE_LABELS[p]}
            </button>
          );
        })}
      </div>

      {phase !== "completed" && missing.length > 0 && (
        <div className="rounded-lg border border-orange-500/25 bg-orange-500/8 px-3 py-2.5 space-y-1.5">
          <p className="text-xs font-medium text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
            <FileWarning size={14} className="shrink-0"/>
            Do zdania brakuje {missing.length} z {REQUIRED_DOCS.length} dokumentów:
          </p>
          <ul className="text-xs text-muted-foreground space-y-0.5 pl-5 list-disc">
            {missing.map((d) => (
              <li key={d}>{DOC_LABELS[d]}</li>
            ))}
          </ul>
        </div>
      )}

      {phase === "handover" && missing.length === 0 && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <CheckCircle2 size={13}/>
          Wszystkie wymagane dokumenty są — możesz oznaczyć robotę jako <strong>Zdane</strong>.
        </p>
      )}

      {phase === "completed" && missing.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Oznaczono jako zdane, ale nadal brakuje: {missing.map((d) => DOC_LABELS[d]).join(", ")}.
        </p>
      )}
    </div>
  );
}

export function JobListLegend({ compact = false }: { compact?: boolean }) {
  const items: { kind: JobListStatusKind; label: string; hint: string }[] = [
    { kind: "in_progress", label: JOB_PHASE_LABELS.in_progress, hint: JOB_PHASE_HINTS.in_progress },
    { kind: "docs_pending", label: JOB_LIST_STATUS_CONFIG.docs_pending.label, hint: JOB_LIST_STATUS_CONFIG.docs_pending.hint },
    { kind: "ready_handover", label: JOB_LIST_STATUS_CONFIG.ready_handover.label, hint: JOB_LIST_STATUS_CONFIG.ready_handover.hint },
    { kind: "completed", label: JOB_PHASE_LABELS.completed, hint: JOB_PHASE_HINTS.completed },
  ];
  return (
    <div
      className={`rounded-xl border border-border bg-secondary/30 ${compact ? "px-3 py-2" : "px-3 py-3"} space-y-2`}
      title="Legenda statusów na liście robót"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <HelpCircle size={11}/>
        Statusy robót — ustawiasz ręcznie w szczegółach roboty
      </p>
      <ul className={`space-y-1.5 ${compact ? "text-[10px]" : "text-[11px]"}`}>
        {items.map(({ kind, label, hint }) => {
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
                <strong className="text-foreground/90 font-medium">{label}</strong>
                {" — "}
                {hint}
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
    <div className="-mx-1 px-1 overflow-x-auto overscroll-x-contain">
      <div className="flex gap-1.5 min-w-max pb-0.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onFilter(t.id)}
            aria-pressed={filter === t.id}
            className={`shrink-0 text-xs py-2 md:py-1.5 px-3 min-h-[44px] md:min-h-[32px] rounded-lg font-medium transition-colors touch-manipulation border whitespace-nowrap ${
              filter === t.id
                ? "bg-primary/10 text-foreground border-primary/35"
                : "text-muted-foreground border-border/60 hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            {t.label}
            <span className="ml-1 opacity-70 tabular-nums">({counts[t.id]})</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export { applyJobPhase };
