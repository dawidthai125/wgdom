import { RefreshCw, AlertCircle, Layers } from "lucide-react";
import { jobDraftFromTender, type TenderPipelineItem } from "@/lib/tenders-bzp";
import type { GrowthModeState } from "@/lib/tenders-strategy-growth-mode";
import type { TenderScoringBundle } from "@/lib/tenders-strategy-decision";
import { useTendersContext, useTendersContextOptional } from "@/app/tenders/context/TendersContext";
import { useTenderJobFromPipeline } from "@/app/tenders/strategy/hooks/useTenderJobFromPipeline";
import { ActionCenter } from "@/app/tenders/strategy/components/ActionCenter";
import { OpportunityOverview } from "@/app/tenders/strategy/components/OpportunityOverview";
import { TendersStrategyHero } from "@/app/tenders/strategy/components/TendersStrategyHero";
import { BestOpportunityCard } from "@/app/tenders/strategy/components/BestOpportunityCard";
import { TendersStrategyForecastStrip } from "@/app/tenders/strategy/components/TendersStrategyForecastStrip";
import { WhatIfPanel } from "@/app/tenders/strategy/components/WhatIfPanel";
import { FinancialCapacityPanel } from "@/app/tenders/strategy/components/FinancialCapacityPanel";
import { TenderPortfolioPanel } from "@/app/tenders/strategy/components/TenderPortfolioCounters";
import { TenderChangeMonitorPanel } from "@/app/tenders/strategy/components/TenderChangeMonitorPanel";
import { SECTION_LABEL_PL } from "@/lib/tenders-strategy-ui-labels-pl";
import type { Job } from "@/app/app-domain";

export function TendersStrategyContent({
  showHeader = true,
  onOpenTender,
  setJobs,
  tenderJobUploadedBy = "Administrator",
  onNavigateToJobFromTender,
  onOpenJob,
  onCreateJobFromTender,
}: {
  showHeader?: boolean;
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
  const { snapshot, ownerDecisions } = useTendersContext();
  const tendersUi = useTendersContextOptional();

  const handleOpenTender = onOpenTender ?? tendersUi?.openTenderInList;

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

  const handleSetDecision = (
    bundle: TenderScoringBundle,
    decision: Parameters<typeof ownerDecisions.setOwnerDecision>[1],
  ) => {
    ownerDecisions.setOwnerDecision(bundle, decision);
  };

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      {showHeader && (
        <div className="px-4 sm:px-6 py-3 border-b border-border bg-secondary/30 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight text-foreground">Strategia przetargów</h2>
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
      )}

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
          onOpenTender={handleOpenTender}
          onCreateJobFromTender={handleCreateJobFromTenderItem}
          onOpenJob={openLinkedJob}
        />

        <FinancialCapacityPanel capacity={financialCapacity} />

        <TendersStrategyHero
          health={health}
          growthMode={growthModeState.mode}
          suggestedMode={health.suggestedGrowthMode}
          onGrowthModeChange={handleGrowthModeChange}
        />

        <ActionCenter
          center={actionCenter}
          variant="urgent"
          forecast={forecast90}
          onOpenTender={handleOpenTender}
          pipelineItems={pipeline.items}
          onCreateJobFromTender={handleCreateJobFromTenderItem}
          onOpenJob={openLinkedJob}
        />

        <TenderChangeMonitorPanel
          items={pipeline.items}
          onOpenTender={handleOpenTender}
        />

        <TendersStrategyForecastStrip forecast={forecast90} />

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
            <h2 className="text-sm font-semibold">KPI rynku</h2>
          </div>
          <div className="p-4">
            <OpportunityOverview
              kpi={marketKpi}
              maxConcurrentProjects={profile.maxConcurrentProjects}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
