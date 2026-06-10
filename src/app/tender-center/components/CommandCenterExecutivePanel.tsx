import { useMemo } from "react";
import { AlertTriangle, Briefcase, ChevronRight, ExternalLink, Zap } from "lucide-react";
import { COMMAND_CENTER_BRAND } from "@/app/tender-center/branding";
import { useCommandCenterContext } from "@/app/tender-center/context/CommandCenterContext";
import { useTenderJobFromPipeline } from "@/app/tender-center/hooks/useTenderJobFromPipeline";
import {
  isWonRealizationAction,
  TenderJobLinkButtons,
} from "@/app/tender-center/components/TenderJobLinkButtons";
import type { Job } from "@/app/app-domain";
import { jobDraftFromTender, type TenderPipelineItem } from "@/lib/tenders-bzp";
import type { ActionCenterResult, OwnerActionItem } from "@/lib/tender-center-action-center";
import { ACTION_PRIORITY_LABEL_PL, priorityTone } from "@/lib/tender-center-action-center";

const EXECUTIVE_ACTION_MAX = 3;
const SHORTCUT_TITLE = "Przetargi — skrót";

function resolveTenderItem(
  tenderId: string | undefined,
  pipelineItems: TenderPipelineItem[],
): TenderPipelineItem | null {
  if (!tenderId || !pipelineItems.length) return null;
  return pipelineItems.find((i) => i.id === tenderId) ?? null;
}

function pickExecutiveActions(center: ActionCenterResult, maxItems: number): OwnerActionItem[] {
  const urgent = new Set(["CRITICAL", "HIGH"] as const);
  const seen = new Set<string>();
  const out: OwnerActionItem[] = [];

  const push = (item: OwnerActionItem | null | undefined) => {
    if (!item || !urgent.has(item.priority as "CRITICAL" | "HIGH") || seen.has(item.id)) return;
    seen.add(item.id);
    out.push(item);
  };

  push(center.primaryAction);
  for (const a of center.actions) {
    push(a);
    if (out.length >= maxItems) break;
  }
  return out.slice(0, maxItems);
}

export function CommandCenterExecutivePanel({
  onOpenCommandCenter,
  onOpenTender,
  setJobs,
  tenderJobUploadedBy = "Administrator",
  onNavigateToJobFromTender,
  onOpenJob,
  onCreateJobFromTender,
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
  void onCreateJobFromTender;

  const { snapshot } = useCommandCenterContext();
  const { pipeline, marketKpi, actionCenter } = snapshot;

  const tenderJobEnabled = Boolean(
    setJobs && onNavigateToJobFromTender && onOpenJob && onCreateJobFromTender,
  );

  const ccJobActions = useTenderJobFromPipeline({
    setJobs: setJobs ?? (() => {}),
    uploadedBy: tenderJobUploadedBy,
    onNavigateToJob: onNavigateToJobFromTender ?? (() => {}),
    onOpenJob: onOpenJob ?? (() => {}),
    pipeline: tenderJobEnabled ? pipeline : undefined,
  });

  const handleCreateJobFromTenderItem = tenderJobEnabled
    ? (item: TenderPipelineItem) => {
        ccJobActions.createJobFromTender(jobDraftFromTender(item), item);
      }
    : undefined;

  const openLinkedJob = tenderJobEnabled ? ccJobActions.openLinkedJob : undefined;

  const wonWithoutJobCount = useMemo(
    () => pipeline.items.filter((i) => i.status === "won" && !i.linkedJobId).length,
    [pipeline.items],
  );

  const executiveActions = useMemo(
    () => pickExecutiveActions(actionCenter, EXECUTIVE_ACTION_MAX),
    [actionCenter],
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
              Pilne terminy i akcje — pełna analiza w {COMMAND_CENTER_BRAND.togglePro}
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

        {executiveActions.length > 0 && (
          <div className="rounded-xl border border-primary/20 bg-card/60 overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2 bg-primary/5">
              <div className="flex items-center gap-1.5">
                <Zap size={14} className="text-primary" />
                <span className="text-xs font-semibold">Najważniejsze akcje</span>
                <span className="text-[9px] text-muted-foreground">
                  {ACTION_PRIORITY_LABEL_PL.CRITICAL} · {ACTION_PRIORITY_LABEL_PL.HIGH}
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenCommandCenter}
                className="text-[10px] font-medium text-primary hover:underline min-h-[32px] px-2"
              >
                Pokaż wszystkie →
              </button>
            </div>
            <ul className="divide-y divide-border">
              {executiveActions.map((item) => {
                const tenderItem = isWonRealizationAction(item.id)
                  ? resolveTenderItem(item.tenderId, pipeline.items)
                  : null;
                return (
                  <li key={item.id} className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className={`text-[8px] font-bold px-1 py-0.5 rounded border ${priorityTone(item.priority)}`}>
                        {ACTION_PRIORITY_LABEL_PL[item.priority]}
                      </span>
                      <p className="text-xs font-semibold flex-1 min-w-0">{item.title}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{item.recommendedAction}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {tenderItem && (
                        <TenderJobLinkButtons
                          item={tenderItem}
                          onCreateJob={handleCreateJobFromTenderItem}
                          onOpenJob={openLinkedJob}
                          size="compact"
                        />
                      )}
                      {item.tenderId && onOpenTender && (
                        <button
                          type="button"
                          onClick={() => onOpenTender(item.tenderId!)}
                          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline min-h-[32px]"
                        >
                          <ExternalLink size={10} />
                          Otwórz przetarg
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

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
