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
import { WgCard, WgEmptyState, WgKpi, type WgKpiStatus } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import {
  WG_DURATION_HOVER,
  WG_FOCUS_RING,
  WG_RADIUS_SM,
  WG_TYPE_TITLE,
} from "@/lib/wg-ui-tokens";

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

  const kpiTiles: { label: string; value: number; status: WgKpiStatus }[] = [
    { label: "Aktywne WM", value: stats.total, status: "info" },
    { label: "Gotowe do odbioru", value: stats.readyForHandover, status: "ok" },
    { label: "Bez zlecenia", value: stats.missingZlecenie, status: stats.missingZlecenie > 0 ? "danger" : "neutral" },
    { label: "Bez kosztorysu", value: stats.missingKosztorys, status: stats.missingKosztorys > 0 ? "danger" : "neutral" },
    { label: "Termin minął", value: stats.overduePlanned, status: stats.overduePlanned > 0 ? "warn" : "neutral" },
  ];

  const content = (
    <>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <LayoutGrid size={20} className="text-primary"/>
            </div>
            <div>
              <h2 className={cn(WG_TYPE_TITLE, "text-base")}>Portfolio WM</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Wrocławskie Mieszkania — zbiorczy widok remontów pustostanów</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {kpiTiles.map((tile) => (
              <WgKpi
                key={tile.label}
                label={tile.label}
                value={String(tile.value)}
                status={tile.status}
                className="min-w-0"
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {HANDOVER_STAGES.filter((s) => s !== "handed_over").map((s) => (
              stats.byStage[s] > 0 ? (
                <span key={s} className={cn("text-[10px] px-2 py-1 font-medium", WG_RADIUS_SM, stageBadgeClass(s))}>
                  {HANDOVER_STAGE_LABELS[s]}: {stats.byStage[s]}
                </span>
              ) : null
            ))}
          </div>

          {stats.missingAnyDoc > 0 && (
            <WgCard elevation="soft" padding="sm" radius="md" className="border-amber-500/20 bg-amber-500/5 space-y-2">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle size={12}/> Braki dokumentów (ile robót)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {REQUIRED_DOCS.map((d) => (
                  (missingByDoc[d] ?? 0) > 0 ? (
                    <span key={d} className={cn("text-[10px] bg-secondary px-2 py-0.5 text-muted-foreground", WG_RADIUS_SM)}>
                      {DOC_LABELS[d]}: {missingByDoc[d]}
                    </span>
                  ) : null
                ))}
              </div>
            </WgCard>
          )}

          <div className="space-y-2">
            {sorted.length === 0 ? (
              <WgEmptyState
                icon={LayoutGrid}
                title="Brak aktywnych robót WM"
              />
            ) : (
              sorted.map((job) => {
            const stage = inferHandoverStage(job);
            const plan = plannedHandoverStatus(job.plannedHandoverDate || "", stage);
            const missing = REQUIRED_DOCS.filter((d) => !job.documents[d]);
            return (
              <WgCard
                key={job.id}
                as="button"
                type="button"
                elevation="soft"
                padding="sm"
                radius="md"
                onClick={() => onOpenJob(job.id)}
                className={cn(
                  "w-full text-left hover:border-primary/40",
                  `transition-colors ${WG_DURATION_HOVER}`,
                  WG_FOCUS_RING,
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {job.address || "Bez adresu"}
                      {job.flatNumber && <span className="text-muted-foreground"> m.{job.flatNumber}</span>}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className={cn("text-[10px] px-2 py-0.5 font-medium", WG_RADIUS_SM, stageBadgeClass(stage))}>
                        {HANDOVER_STAGE_LABELS[stage]}
                      </span>
                      {job.plannedHandoverDate && (
                        <span className={cn(
                          "text-[10px] px-2 py-0.5",
                          WG_RADIUS_SM,
                          plan === "overdue" ? "bg-red-500/15 text-red-400" : plan === "soon" ? "bg-amber-500/15 text-amber-400" : "bg-secondary text-muted-foreground",
                        )}>
                          Odbiór: {fmtPlannedHandover(job.plannedHandoverDate)}
                        </span>
                      )}
                      {!job.documents.zlecenie && (
                        <span className={cn("text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 flex items-center gap-0.5", WG_RADIUS_SM)}>
                          <FileText size={9}/> brak zlec.
                        </span>
                      )}
                      {!job.documents.kosztorys && (
                        <span className={cn("text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 flex items-center gap-0.5", WG_RADIUS_SM)}>
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
              </WgCard>
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
