import { useMemo } from "react";
import { AlertTriangle, Briefcase, ChevronRight } from "lucide-react";
import { COMMAND_CENTER_BRAND } from "@/app/tender-center/branding";
import { useCommandCenterContext } from "@/app/tender-center/context/CommandCenterContext";
import type { Job } from "@/app/app-domain";
import { jobDraftFromTender, type TenderPipelineItem } from "@/lib/tenders-bzp";

const SHORTCUT_TITLE = "Przetargi — skrót";

export function CommandCenterExecutivePanel({
  onOpenCommandCenter,
  onOpenTender: _onOpenTender,
  setJobs: _setJobs,
  tenderJobUploadedBy: _tenderJobUploadedBy = "Administrator",
  onNavigateToJobFromTender: _onNavigateToJobFromTender,
  onOpenJob: _onOpenJob,
  onCreateJobFromTender: _onCreateJobFromTender,
}: {
  /** @deprecated ETAP 7H — dane z CommandCenterContext; props zachowane w DashboardView bez zmian sygnatury. */
  jobs?: unknown;
  directory?: unknown;
  weekEmployees?: unknown;
  weekFrom?: string;
  weekTo?: string;
  savedWeeks?: unknown;
  onOpenCommandCenter: () => void;
  onOpenTender?: (tenderId: string) => void;
  setJobs?: (updater: Job[] | ((prev: Job[]) => Job[])) => void;
  tenderJobUploadedBy?: string;
  onNavigateToJobFromTender?: (jobId: string) => void;
  onOpenJob?: (jobId: string) => void;
  onCreateJobFromTender?: (
    draft: ReturnType<typeof jobDraftFromTender>,
    item: TenderPipelineItem,
  ) => string | void;
}) {
  void _onOpenTender;
  void _setJobs;
  void _tenderJobUploadedBy;
  void _onNavigateToJobFromTender;
  void _onOpenJob;
  void _onCreateJobFromTender;

  const { snapshot } = useCommandCenterContext();
  const { pipeline, marketKpi } = snapshot;

  const wonWithoutJobCount = useMemo(
    () => pipeline.items.filter((i) => i.status === "won" && !i.linkedJobId).length,
    [pipeline.items],
  );

  if (pipeline.loading) {
    return (
      <section className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
        Ładowanie przetargów…
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-border bg-secondary/30">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-wide text-foreground">{SHORTCUT_TITLE}</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Pilne terminy i wygrane bez roboty — pełna analiza w {COMMAND_CENTER_BRAND.togglePro}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {pipeline.error && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {pipeline.error}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div
            className={`rounded-xl border px-3 py-2.5 ${
              marketKpi.urgentCount > 0
                ? "border-amber-500/35 bg-amber-500/5"
                : "border-border bg-secondary/20"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <AlertTriangle size={11} className={marketKpi.urgentCount > 0 ? "text-amber-500" : "text-muted-foreground"} />
              Pilne terminy
            </p>
            <p
              className="text-2xl font-bold tabular-nums mt-0.5"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {marketKpi.urgentCount}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Termin składania ≤7 dni</p>
          </div>

          <div
            className={`rounded-xl border px-3 py-2.5 ${
              wonWithoutJobCount > 0
                ? "border-amber-500/35 bg-amber-500/5"
                : "border-border bg-secondary/20"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Briefcase size={11} className={wonWithoutJobCount > 0 ? "text-amber-500" : "text-muted-foreground"} />
              Wygrane bez roboty
            </p>
            <p
              className="text-2xl font-bold tabular-nums mt-0.5"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {wonWithoutJobCount}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Wymagają utworzenia roboty</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenCommandCenter}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors min-h-[44px]"
        >
          Otwórz Command Center
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}
