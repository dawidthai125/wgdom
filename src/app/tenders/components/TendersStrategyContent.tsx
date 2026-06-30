import { useMemo } from "react";
import { RefreshCw, AlertCircle, Activity, Landmark, CalendarRange, GitBranch, Briefcase } from "lucide-react";
import { jobDraftFromTender, type TenderPipelineItem } from "@/lib/tenders-bzp";
import type { GrowthModeState } from "@/lib/tenders-strategy-growth-mode";
import type { TenderScoringBundle } from "@/lib/tenders-strategy-decision";
import { useTendersContext, useTendersContextOptional } from "@/app/tenders/context/TendersContext";
import { useTenderJobFromPipeline } from "@/app/tenders/strategy/hooks/useTenderJobFromPipeline";
import { ActionCenter } from "@/app/tenders/strategy/components/ActionCenter";
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
import { StrategyGuidanceSection } from "@/app/tenders/strategy/components/StrategyGuidanceSection";
import { StrategyGuidanceWhy } from "@/app/tenders/strategy/components/StrategyGuidanceWhy";
import { StrategyGuidanceRisks } from "@/app/tenders/strategy/components/StrategyGuidanceRisks";
import { TenderStrategyFocusCard } from "@/app/tenders/strategy/components/TenderStrategyFocusCard";
import { formatActionCenterItemTitle } from "@/lib/tenders-strategy-action-center-display";
import {
  buildStrategyKpiCounts,
  buildStrategyMonitoringFeed,
  buildStrategyHealthSummary,
  buildStrategyFinancialSummary,
  buildStrategyForecastSummary,
  buildStrategyWhatIfSummary,
  buildStrategyPortfolioSummary,
  buildStrategyWhyBullets,
  buildStrategyRiskBullets,
  buildTenderPortfolioPositionView,
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
  const { snapshot, ownerDecisions, strategyFocusTenderId, clearStrategyFocus } = useTendersContext();
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
    health,
    forecast90,
    forecastInput,
    bestOpportunity,
    financialCapacity,
    marketKpi,
    portfolioCounts,
    goCandidates,
    scoredForForecast,
    actionCenter,
    ownerAlerts,
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

  const whyBullets = useMemo(
    () => buildStrategyWhyBullets(bestOpportunity, actionCenter.primaryAction),
    [bestOpportunity, actionCenter.primaryAction],
  );

  const riskBullets = useMemo(
    () => buildStrategyRiskBullets({
      health,
      financialCapacity,
      ownerAlerts,
      marketKpi,
      bestOpportunity,
    }),
    [health, financialCapacity, ownerAlerts, marketKpi, bestOpportunity],
  );

  const healthSummary = buildStrategyHealthSummary(health, growthModeState.mode);
  const financialSummary = buildStrategyFinancialSummary(financialCapacity);
  const forecastSummary = buildStrategyForecastSummary(forecast90);
  const whatIfSummary = buildStrategyWhatIfSummary();
  const portfolioSummary = buildStrategyPortfolioSummary(portfolioCounts);

  const strategyFocusItem = useMemo(() => {
    if (!strategyFocusTenderId) return null;
    return pipeline.items.find((i) => i.id === strategyFocusTenderId) ?? null;
  }, [strategyFocusTenderId, pipeline.items]);

  const strategyFocusPosition = useMemo(() => {
    if (!strategyFocusItem || !snapshot.scoringContext) return null;
    return buildTenderPortfolioPositionView({
      item: strategyFocusItem,
      scoringContext: snapshot.scoringContext,
      scoredBundles: scoredForForecast,
      ownerRecord: ownerDecisions.store.byId[strategyFocusItem.id],
    });
  }, [strategyFocusItem, snapshot.scoringContext, scoredForForecast, ownerDecisions.store.byId]);

  const handleGrowthModeChange = (mode: GrowthModeState["mode"]) => {
    applyGrowthMode(mode);
  };

  const handleSetDecision = (
    bundle: TenderScoringBundle,
    decision: Parameters<typeof ownerDecisions.setOwnerDecision>[1],
  ) => {
    ownerDecisions.setOwnerDecision(bundle, decision);
  };

  const primaryAction = actionCenter.primaryAction;

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

      <div className="px-4 sm:px-6 py-3 space-y-5">
        {pipeline.error && (
          <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {pipeline.error}
          </div>
        )}

        {pipeline.autoAwardRunning && (
          <p className="text-[10px] text-muted-foreground">Sprawdzam wyniki zakończonych postępowań…</p>
        )}

        {strategyFocusItem && strategyFocusPosition && handleOpenTender && (
          <TenderStrategyFocusCard
            item={strategyFocusItem}
            position={strategyFocusPosition}
            onOpenTender={() => handleOpenTender(strategyFocusItem.id)}
            onDismiss={clearStrategyFocus}
          />
        )}

        <div className="space-y-5" data-testid="strategy-guidance-zone">
          <StrategyGuidanceSection
            title="Najważniejsza rekomendacja"
            subtitle="Czy warto startować — werdykt systemu i najlepsza okazja"
            testId="strategy-guidance-primary"
          >
            {primaryAction ? (
              <div
                className="rounded-xl border-2 border-primary/35 bg-primary/10 px-4 py-3.5 space-y-1.5"
                data-testid="strategy-guidance-primary-action"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Dzisiaj system rekomenduje
                </p>
                <p className="text-base font-semibold leading-snug">
                  {formatActionCenterItemTitle(primaryAction, forecast90)}
                </p>
                <p className="text-sm text-foreground/90 leading-snug">
                  {primaryAction.recommendedAction}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground rounded-lg border border-border/70 bg-secondary/20 px-3 py-3">
                {actionCenter.headline}
              </p>
            )}

            <BestOpportunityCard
              bundle={bestOpportunity}
              ownerRecord={bestOpportunity ? ownerDecisions.getOwnerDecision(bestOpportunity.item.id) : null}
              onSetDecision={handleSetDecision}
              onOpenTender={handleOpenTender}
              onCreateJobFromTender={handleCreateJobFromTenderItem}
              onOpenJob={openLinkedJob}
              liteDefault={false}
            />
          </StrategyGuidanceSection>

          <StrategyGuidanceSection
            title="Dlaczego"
            subtitle="Najważniejsze powody rekomendacji"
            testId="strategy-guidance-why"
          >
            <StrategyGuidanceWhy bullets={whyBullets} />
          </StrategyGuidanceSection>

          <StrategyGuidanceSection
            title="Co zrobić teraz"
            subtitle="Lista działań z Centrum działań — w kolejności priorytetu"
            testId="strategy-guidance-actions"
          >
            <ActionCenter
              center={actionCenter}
              variant="full"
              forecast={forecast90}
              onOpenTender={handleOpenTender}
              pipelineItems={pipeline.items}
              onCreateJobFromTender={handleCreateJobFromTenderItem}
              onOpenJob={openLinkedJob}
            />
          </StrategyGuidanceSection>

          <StrategyGuidanceSection
            title="Największe ryzyka"
            subtitle="Finanse, kondycja firmy i sygnały strategiczne"
            testId="strategy-guidance-risks"
          >
            <StrategyGuidanceRisks risks={riskBullets} />
          </StrategyGuidanceSection>
        </div>

        <div className="space-y-3 pt-2 border-t border-border/60" data-testid="strategy-guidance-details">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Pozostałe informacje</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Może poczekać — monitoring, kolejki, prognozy i analityka
            </p>
          </div>

          <StrategyCollapsibleSection
            title="Liczniki i kolejki"
            icon={<Activity size={14} className="text-primary shrink-0" />}
            summary={(
              <>
                <p>
                  <span className="text-foreground font-medium">Decyzje:</span> {kpiCounts.pendingDecisions}
                  {" · "}
                  <span className="text-foreground font-medium">Termin ≤7d:</span> {kpiCounts.urgentDeadlines}
                </p>
                <p>
                  <span className="text-foreground font-medium">Monitoring:</span> {kpiCounts.monitoring}
                  {" · "}
                  <span className="text-foreground font-medium">Wygrane bez roboty:</span> {kpiCounts.wonWithoutJob}
                </p>
              </>
            )}
            defaultExpanded={false}
            testId="strategy-details-queues"
          >
            <div className="space-y-4">
              <StrategyKpiStrip counts={kpiCounts} />
              <StrategyDecisionsTodayPanel
                scoredBundles={scoredForForecast}
                ownerStore={ownerDecisions.store}
                onOpenTender={handleOpenTender}
              />
              <StrategyUrgentDeadlinesPanel
                items={pipeline.items}
                onOpenTender={handleOpenTender}
              />
            </div>
          </StrategyCollapsibleSection>

          <StrategyCollapsibleSection
            title="Monitoring"
            icon={<Activity size={14} className="text-primary shrink-0" />}
            summary={(
              <p>
                <span className="text-foreground font-medium">Sygnały (7 dni):</span> {kpiCounts.monitoring}
              </p>
            )}
            defaultExpanded={false}
            testId="strategy-details-monitoring"
          >
            <StrategyMonitoringFeedPanel
              items={pipeline.items}
              onOpenTender={handleOpenTender}
            />
          </StrategyCollapsibleSection>

          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-0.5 pt-1">
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
              <p>
                <span className="text-foreground font-medium">GO</span> {portfolioSummary.go}
                {" · "}
                <span className="text-foreground font-medium">HOLD</span> {portfolioSummary.hold}
                {" · "}
                <span className="text-foreground font-medium">NO-GO</span> {portfolioSummary.noGo}
              </p>
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
