import { useMemo, type RefObject } from "react";
import {
  LayoutGrid, ChevronRight, AlertTriangle, FileText, ClipboardList,
} from "lucide-react";
import {
  computeWmPortfolioStats,
  HANDOVER_STAGES,
  HANDOVER_STAGE_LABELS,
  inferHandoverStage,
  stageBadgeClass,
  fmtPlannedHandover,
  plannedHandoverStatus,
  isWmClient,
  type JobWmJob,
} from "@/lib/job-wm";
import { REQUIRED_DOCS, DOC_LABELS, type DocType } from "@/lib/job-documents";

export function WmPortfolioView({
  jobs,
  onOpenJob,
  notesNeedingAdmin = 0,
  embedded = false,
  scrollRef,
}: {
  jobs: JobWmJob[];
  onOpenJob: (jobId: string) => void;
  notesNeedingAdmin?: number;
  /** Bez własnego scrolla — treść w środku zakładki Inspektor (admin). */
  embedded?: boolean;
  scrollRef?: RefObject<HTMLDivElement | null>;
}) {
  const wmJobs = useMemo(
    () => jobs.filter((j) => isWmClient(j.client) && inferHandoverStage(j) !== "handed_over"),
    [jobs],
  );

  const stats = useMemo(
    () => computeWmPortfolioStats(jobs, { notesNeedingAdminAttention: notesNeedingAdmin }),
    [jobs, notesNeedingAdmin],
  );

  const missingByDoc = useMemo(() => {
    const counts: Partial<Record<DocType, number>> = {};
    for (const d of REQUIRED_DOCS) counts[d] = 0;
    for (const job of wmJobs) {
      for (const d of REQUIRED_DOCS) {
        if (!job.documents[d]) counts[d]! += 1;
      }
    }
    return counts;
  }, [wmJobs]);

  const sorted = useMemo(() => {
    return [...wmJobs].sort((a, b) => {
      const ao = plannedHandoverStatus(a.plannedHandoverDate || "", inferHandoverStage(a));
      const bo = plannedHandoverStatus(b.plannedHandoverDate || "", inferHandoverStage(b));
      if (ao === "overdue" && bo !== "overdue") return -1;
      if (bo === "overdue" && ao !== "overdue") return 1;
      if (a.plannedHandoverDate && b.plannedHandoverDate) {
        return a.plannedHandoverDate.localeCompare(b.plannedHandoverDate);
      }
      return b.startDate.localeCompare(a.startDate);
    });
  }, [wmJobs]);

  const content = (
    <>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <LayoutGrid size={20} className="text-primary"/>
            </div>
            <div>
              <h2 className="text-base font-semibold">Portfolio WM</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Wrocławskie Mieszkania — zbiorczy widok remontów pustostanów</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatBox label="Aktywne WM" value={stats.total}/>
            <StatBox label="Gotowe do odbioru" value={stats.readyForHandover} accent="emerald"/>
            <StatBox label="Bez zlecenia" value={stats.missingZlecenie} accent="red"/>
            <StatBox label="Termin minął" value={stats.overduePlanned} accent="amber"/>
          </div>

          <div className="flex flex-wrap gap-2">
            {HANDOVER_STAGES.filter((s) => s !== "handed_over").map((s) => (
              stats.byStage[s] > 0 ? (
                <span key={s} className={`text-[10px] px-2 py-1 rounded-full font-medium ${stageBadgeClass(s)}`}>
                  {HANDOVER_STAGE_LABELS[s]}: {stats.byStage[s]}
                </span>
              ) : null
            ))}
          </div>

          {stats.missingAnyDoc > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle size={12}/> Braki dokumentów (ile robót)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {REQUIRED_DOCS.map((d) => (
                  (missingByDoc[d] ?? 0) > 0 ? (
                    <span key={d} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                      {DOC_LABELS[d]}: {missingByDoc[d]}
                    </span>
                  ) : null
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {sorted.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">Brak aktywnych robót WM</p>
            ) : (
              sorted.map((job) => {
            const stage = inferHandoverStage(job);
            const plan = plannedHandoverStatus(job.plannedHandoverDate || "", stage);
            const missing = REQUIRED_DOCS.filter((d) => !job.documents[d]);
            return (
              <button
                key={job.id}
                type="button"
                onClick={() => onOpenJob(job.id)}
                className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {job.address || "Bez adresu"}
                      {job.flatNumber && <span className="text-muted-foreground"> m.{job.flatNumber}</span>}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${stageBadgeClass(stage)}`}>
                        {HANDOVER_STAGE_LABELS[stage]}
                      </span>
                      {job.plannedHandoverDate && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${plan === "overdue" ? "bg-red-500/15 text-red-400" : plan === "soon" ? "bg-amber-500/15 text-amber-400" : "bg-secondary text-muted-foreground"}`}>
                          Odbiór: {fmtPlannedHandover(job.plannedHandoverDate)}
                        </span>
                      )}
                      {!job.documents.zlecenie && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 flex items-center gap-0.5">
                          <FileText size={9}/> brak zlec.
                        </span>
                      )}
                      {!job.documents.kosztorys && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 flex items-center gap-0.5">
                          <ClipboardList size={9}/> brak kosz.
                        </span>
                      )}
                    </div>
                    {missing.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-2 truncate">
                        Brakuje: {missing.slice(0, 4).map((d) => DOC_LABELS[d]).join(", ")}{missing.length > 4 ? "…" : ""}
                      </p>
                    )}
                    {(job.jobNotes || []).length > 0 && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                        {(job.jobNotes || [])[0].author}: {(job.jobNotes || [])[0].text}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-1"/>
                </div>
              </button>
            );
          })
            )}
          </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-6">{content}</div>;
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 w-full overflow-hidden">
      <div ref={scrollRef} className="flex-1 w-full overflow-y-auto overscroll-contain">
        <div
          className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          {content}
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald" | "red" | "amber";
}) {
  const accentCls = accent === "emerald"
    ? "text-emerald-600 dark:text-emerald-400"
    : accent === "red"
      ? "text-red-400"
      : accent === "amber"
        ? "text-amber-400"
        : "text-foreground";
  return (
    <div className="bg-secondary/50 rounded-xl px-3 py-2.5 border border-border">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold mt-0.5 ${accentCls}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>{value}</p>
    </div>
  );
}
