import { RefreshCw, AlertCircle, Layers } from "lucide-react";
import type {
  DirectoryEmployee,
  Job,
  WeekEmployee,
  WeekSnapshot,
} from "@/app/app-domain";
import { useCommandCenterContext } from "@/app/tender-center/context/CommandCenterContext";
import { useTenderJobFromPipeline } from "@/app/tender-center/hooks/useTenderJobFromPipeline";
import { jobDraftFromTender, type TenderPipelineItem } from "@/lib/tenders-bzp";
import type { GrowthModeState } from "@/lib/tender-center-growth-mode";
import type { TenderScoringBundle } from "@/lib/tender-center-decision";
import { ActionCenter } from "@/app/tender-center/components/ActionCenter";
import { OpportunityOverview } from "@/app/tender-center/components/OpportunityOverview";
import { CommandCenterHero } from "@/app/tender-center/components/CommandCenterHero";
import { BestOpportunityCard } from "@/app/tender-center/components/BestOpportunityCard";
import { ForecastCommandStrip } from "@/app/tender-center/components/ForecastCommandStrip";
import { WhatIfPanel } from "@/app/tender-center/components/WhatIfPanel";
import { FinancialCapacityPanel } from "@/app/tender-center/components/FinancialCapacityPanel";
import { TenderPortfolioPanel } from "@/app/tender-center/components/TenderPortfolioCounters";
import { TENDERS_MODULE_LABELS } from "@/lib/tenders-module-labels";
import { SECTION_LABEL_PL } from "@/lib/tender-center-ui-labels-pl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion";

export function OwnerDashboard({
  jobs: _jobs,
  directory: _directory,
  productionWeekEmployees: _productionWeekEmployees,
  weekFrom: _weekFrom,
  weekTo: _weekTo,
  savedWeeks: _savedWeeks,
  showTestBadge = false,
  onOpenTender,
  setJobs,
  tenderJobUploadedBy = "Administrator",
  onNavigateToJobFromTender,
  onOpenJob,
  onCreateJobFromTender,
}: {
  /** @deprecated ETAP 7H — dane operacyjne z CommandCenterProvider. */
  jobs: Job[];
  directory: DirectoryEmployee[];
  productionWeekEmployees: WeekEmployee[];
  weekFrom: string;
  weekTo: string;
  savedWeeks: WeekSnapshot[];
  showTestBadge?: boolean;
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
  void _jobs;
  void _directory;
  void _productionWeekEmployees;
  void _weekFrom;
  void _weekTo;
  void _savedWeeks;

  const { snapshot, ownerDecisions } = useCommandCenterContext();

  const tenderJobEnabled = Boolean(
    setJobs && onNavigateToJobFromTender && onOpenJob && onCreateJobFromTender,
  );

  const ccJobActions = useTenderJobFromPipeline({
    setJobs: setJobs ?? (() => {}),
    uploadedBy: tenderJobUploadedBy,
    onNavigateToJob: onNavigateToJobFromTender ?? (() => {}),
    onOpenJob: onOpenJob ?? (() => {}),
    pipeline: tenderJobEnabled ? snapshot.pipeline : undefined,
  });

  const handleCreateJobFromTenderItem = tenderJobEnabled
    ? (item: TenderPipelineItem) => {
        ccJobActions.createJobFromTender(jobDraftFromTender(item), item);
      }
    : undefined;

  const openLinkedJob = tenderJobEnabled ? ccJobActions.openLinkedJob : undefined;

  const {
    pipeline,
    growthModeState,
    setGrowthMode: applyGrowthMode,
    profile,
    health,
    actionCenter,
    forecast90,
    forecastInput,
    bestOpportunity,
    financialCapacity,
    marketKpi,
    portfolioCounts,
    goCandidates,
  } = snapshot;

  const handleGrowthModeChange = (mode: GrowthModeState["mode"]) => {
    applyGrowthMode(mode);
  };

  const handleSetDecision = (bundle: TenderScoringBundle, decision: Parameters<typeof ownerDecisions.setOwnerDecision>[1]) => {
    ownerDecisions.setOwnerDecision(bundle, decision);
  };

  if (pipeline.loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        {TENDERS_MODULE_LABELS.loading}
      </div>
    );
  }

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="px-4 sm:px-6 py-3 border-b border-border bg-secondary/30 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            {TENDERS_MODULE_LABELS.strategyView}
          </h1>
          {showTestBadge && (
            <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
              TEST
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void pipeline.refreshFromBzp()}
          disabled={pipeline.syncing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 min-h-[44px] shrink-0"
        >
          <RefreshCw size={16} className={pipeline.syncing || pipeline.autoSyncing ? "animate-spin" : ""} />
          {pipeline.syncing ? "Pobieranie…" : pipeline.autoSyncing ? SECTION_LABEL_PL.autoSync : "Odśwież z BZP"}
        </button>
      </div>

      <div className="px-4 sm:px-6 py-3 space-y-4">
        {pipeline.error && (
          <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {pipeline.error}
          </div>
        )}

        {pipeline.autoAwardRunning && (
          <p className="text-[10px] text-muted-foreground">Sprawdzam wyniki zakończonych postępowań…</p>
        )}

        <BestOpportunityCard
          bundle={bestOpportunity}
          ownerRecord={bestOpportunity ? ownerDecisions.getOwnerDecision(bestOpportunity.item.id) : null}
          onSetDecision={handleSetDecision}
          onOpenTender={onOpenTender}
          onCreateJobFromTender={handleCreateJobFromTenderItem}
          onOpenJob={openLinkedJob}
        />

        <FinancialCapacityPanel capacity={financialCapacity} />

        <CommandCenterHero
          health={health}
          growthMode={growthModeState.mode}
          suggestedMode={health.suggestedGrowthMode}
          onGrowthModeChange={handleGrowthModeChange}
        />

        <ActionCenter
          center={actionCenter}
          variant="urgent"
          forecast={forecast90}
          onOpenTender={onOpenTender}
          pipelineItems={pipeline.items}
          onCreateJobFromTender={handleCreateJobFromTenderItem}
          onOpenJob={openLinkedJob}
        />

        <ForecastCommandStrip forecast={forecast90} />

        <WhatIfPanel forecastInput={forecastInput} goCandidates={goCandidates} />

        <TenderPortfolioPanel
          systemCounts={portfolioCounts}
          ownerStats={ownerDecisions.stats}
          snapshotAlignment={ownerDecisions.snapshotAlignment}
          recent={ownerDecisions.recent}
          pipelineItems={pipeline.items}
        />

        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Layers size={16} className="text-primary" />
            <h2 className="text-sm font-semibold">Pozostałe analizy</h2>
          </div>
          <Accordion type="multiple" className="px-4">
            <AccordionItem value="kpi">
              <AccordionTrigger>KPI rynku</AccordionTrigger>
              <AccordionContent>
                <OpportunityOverview
                  kpi={marketKpi}
                  maxConcurrentProjects={profile.maxConcurrentProjects}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <p className="text-[11px] text-muted-foreground text-center pb-2">
          Pełna lista przetargów, filtry i SWZ — w{" "}
          <strong className="text-foreground">{TENDERS_MODULE_LABELS.classicView}</strong> (przełącznik u góry ekranu).
        </p>
      </div>
    </div>
  );
}
