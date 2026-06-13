import { useMemo } from "react";
import { RefreshCw, AlertCircle, Activity, Landmark, CalendarRange, GitBranch, Briefcase } from "lucide-react";
import { jobDraftFromTender, type TenderPipelineItem } from "@/lib/tenders-bzp";
import type { GrowthModeState } from "@/lib/tenders-strategy-growth-mode";
import type { TenderScoringBundle } from "@/lib/tenders-strategy-decision";
import { useTendersContext, useTendersContextOptional } from "@/app/tenders/context/TendersContext";
import { useTenderJobFromPipeline } from "@/app/tenders/strategy/hooks/useTenderJobFromPipeline";
import { BestOpportunityCard } from "@/app/tenders/strategy/components/BestOpportunityCard";
import { TendersStrategyForecastStrip } from "@/app/tenders/strategy/components/TendersStrategyForecastStrip";
import { WhatIfPanel } from "@/app/tenders/strategy/components/WhatIfPanel";
import { FinancialCapacityPanel } from "@/app/tenders/strategy/components/FinancialCapacityPanel";
import { TenderPortfolioPanel } from "@/app/tenders/strategy/components/TenderPortfolioCounters";
import { TendersStrategyHero } from "@/app/tenders/strategy/components/TendersStrategyHero";
import { StrategyKpiStrip } from "@/app/tenders/strategy/components/StrategyKpiStrip";
import { StrategyDecisionsTodayPanel } from "@/app/tenders/strategy/components/StrategyDecisionsTodayPanel";
import { StrategyUrgentDeadlinesPanel } from "@/app/tenders/strategy/components/StrategyUrgentDeadlinesPanel";
import { StrategyMonitoringFeedPanel } from "@/app/tenders/strategy/components/StrategyMonitoringFeedPanel";
import { StrategyCollapsibleSection } from "@/app/tenders/strategy/components/StrategyCollapsibleSection";
import {
  buildStrategyKpiCounts,
  buildStrategyMonitoringFeed,
  buildStrategyHealthSummary,
  buildStrategyFinancialSummary,
  buildStrategyForecastSummary,
  buildStrategyWhatIfSummary,
  buildStrategyPortfolioSummary,
} from "@/lib/tender-strategy-ux";
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
    forecast90,
    forecastInput,
    bestOpportunity,
    financialCapacity,
    marketKpi,
    portfolioCounts,
    goCandidates,
    scoredForForecast,
  } = snapshot;

  const monitoringFeed = useMemo(
    () => buildStrategyMonitoringFeed(pipeline.items),
    [pipeline.items],
  );

  const kpiCounts = useMemo(
    () => buildStrategyKpiCounts({
      scoredBundles: scoredForForecast,
      ownerStore: ownerDecisions.store,
      marketKpi,
      pipelineItems: pipeline.items,
      monitoringFeed,
    }),
    [scoredForForecast, ownerDecisions.store, marketKpi, pipeline.items, monitoringFeed],
  );

  const healthSummary = buildStrategyHealthSummary(health, growthModeState.mode);
  const financialSummary = buildStrategyFinancialSummary(financialCapacity);
  const forecastSummary = buildStrategyForecastSummary(forecast90);
  const whatIfSummary = buildStrategyWhatIfSummary();
  const portfolioSummary = buildStrategyPortfolioSummary(portfolioCounts);

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
      data-testid="tenders-strategy-content"
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

        <StrategyKpiStrip counts={kpiCounts} />

        <div className="space-y-4" data-testid="strategy-decision-zone">
          <StrategyDecisionsTodayPanel
            scoredBundles={scoredForForecast}
            ownerStore={ownerDecisions.store}
            onOpenTender={handleOpenTender}
          />

          <StrategyUrgentDeadlinesPanel
            items={pipeline.items}
            onOpenTender={handleOpenTender}
          />

          <StrategyMonitoringFeedPanel
            items={pipeline.items}
            onOpenTender={handleOpenTender}
          />

          <BestOpportunityCard
            bundle={bestOpportunity}
            ownerRecord={bestOpportunity ? ownerDecisions.getOwnerDecision(bestOpportunity.item.id) : null}
            onSetDecision={handleSetDecision}
            onOpenTender={handleOpenTender}
            onCreateJobFromTender={handleCreateJobFromTenderItem}
            onOpenJob={openLinkedJob}
            liteDefault
          />
        </div>

        <div className="space-y-3 pt-1 border-t border-border/60" data-testid="strategy-analytics-zone">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
            Analityka
          </p>

          <StrategyCollapsibleSection
            title="Kondycja firmy"
            icon={<Activity size={14} className="text-primary shrink-0" />}
            summary={(
              <>
                <p><span className="text-foreground font-medium">Kondycja:</span> {healthSummary.index} · {healthSummary.label}</p>
                <p><span className="text-foreground font-medium">Tryb:</span> {healthSummary.growthMode}</p>
              </>
            )}
            defaultExpanded={false}
            testId="strategy-analytics-health"
          >
            <TendersStrategyHero
              health={health}
              growthMode={growthModeState.mode}
              suggestedMode={health.suggestedGrowthMode}
              onGrowthModeChange={handleGrowthModeChange}
            />
          </StrategyCollapsibleSection>

          <StrategyCollapsibleSection
            title="Zdolność finansowa"
            icon={<Landmark size={14} className="text-primary shrink-0" />}
            summary={(
              <>
                <p><span className="text-foreground font-medium">Wadium:</span> {financialSummary.wadiumLabel}</p>
                <p><span className="text-foreground font-medium">Wpływ:</span> {financialSummary.impactLabel}</p>
              </>
            )}
            defaultExpanded={false}
            testId="strategy-analytics-financial"
          >
            <FinancialCapacityPanel capacity={financialCapacity} />
          </StrategyCollapsibleSection>

          <StrategyCollapsibleSection
            title="Prognoza 30/60/90"
            icon={<CalendarRange size={14} className="text-primary shrink-0" />}
            summary={(
              <>
                <p><span className="text-foreground font-medium">30d:</span> {forecastSummary.h30}</p>
                <p><span className="text-foreground font-medium">60d:</span> {forecastSummary.h60}</p>
                <p><span className="text-foreground font-medium">90d:</span> {forecastSummary.h90}</p>
              </>
            )}
            defaultExpanded={false}
            testId="strategy-analytics-forecast"
          >
            <TendersStrategyForecastStrip forecast={forecast90} />
          </StrategyCollapsibleSection>

          <StrategyCollapsibleSection
            title="Co jeśli"
            icon={<GitBranch size={14} className="text-primary shrink-0" />}
            summary={<p><span className="text-foreground font-medium">Scenariusz:</span> {whatIfSummary}</p>}
            defaultExpanded={false}
            testId="strategy-analytics-whatif"
          >
            <WhatIfPanel forecastInput={forecastInput} goCandidates={goCandidates} />
          </StrategyCollapsibleSection>

          <StrategyCollapsibleSection
            title="Portfel"
            icon={<Briefcase size={14} className="text-primary shrink-0" />}
            summary={(
              <>
                <p>
                  <span className="text-foreground font-medium">GO</span> {portfolioSummary.go}
                  {" · "}
                  <span className="text-foreground font-medium">HOLD</span> {portfolioSummary.hold}
                  {" · "}
                  <span className="text-foreground font-medium">NO-GO</span> {portfolioSummary.noGo}
                </p>
              </>
            )}
            defaultExpanded={false}
            testId="strategy-analytics-portfolio"
          >
            <TenderPortfolioPanel
              systemCounts={portfolioCounts}
              ownerStats={ownerDecisions.stats}
              snapshotAlignment={ownerDecisions.snapshotAlignment}
              recent={ownerDecisions.recent}
              pipelineItems={pipeline.items}
            />
          </StrategyCollapsibleSection>
        </div>
      </div>
    </div>
  );
}
