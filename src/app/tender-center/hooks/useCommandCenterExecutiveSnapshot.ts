import { useMemo, useState } from "react";
import type {
  DirectoryEmployee,
  Job,
  WeekEmployee,
  WeekSnapshot,
} from "@/app/app-domain";
import { useTendersPipeline } from "@/app/tender-center/hooks/useTendersPipeline";
import { useOwnerTenderDecisions } from "@/app/tender-center/hooks/useOwnerTenderDecisions";
import { computeCompanyHealth, type CompanyHealthInput } from "@/lib/tender-center-health";
import { aggregateMarketKpi } from "@/lib/tender-center-kpi";
import {
  loadGrowthMode,
  setGrowthMode,
  type GrowthMode,
  type GrowthModeState,
} from "@/lib/tender-center-growth-mode";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import {
  countPortfolioDecisions,
  rankTopTenderOpportunities,
} from "@/lib/tender-center-decision";
import {
  collectGoCandidates,
  computeForecast90Days,
  type Forecast90DaysInput,
} from "@/lib/tender-center-forecast-90d";
import {
  explainHealth,
  buildForecastExplainContext,
  explainAllForecastHorizons,
  buildOwnerStrategicAlerts,
} from "@/lib/tender-center-explain";
import { computeAiInsights } from "@/lib/tender-center-ai-insights";
import { computeOwnerProfile } from "@/lib/tender-center-owner-profile";
import { loadTenderLearning } from "@/lib/tender-center-learning";
import { buildMorningBriefing, type MorningBriefing } from "@/lib/tender-center-morning-briefing";
import { buildActionCenter, type ActionCenterResult } from "@/lib/tender-center-action-center";
import {
  computeFinancialCapacity,
  type FinancialCapacityResult,
} from "@/lib/tender-center-financial-capacity";
import { computeTenderImpact } from "@/lib/tender-center-impact";
import type { CompanyHealthResult } from "@/lib/tender-center-health";
import type { Forecast90DaysResult } from "@/lib/tender-center-forecast-90d";
import type { TenderScoringBundle } from "@/lib/tender-center-decision";
import type { UseTendersPipelineOptions } from "@/app/tender-center/hooks/useTendersPipeline";

export type CommandCenterExecutiveSnapshotInput = {
  jobs: Job[];
  directory: DirectoryEmployee[];
  productionWeekEmployees: WeekEmployee[];
  weekFrom: string;
  weekTo: string;
  savedWeeks: WeekSnapshot[];
  /** Inkrement po zapisie profilu / learning — przelicza scoring. */
  learningRevision?: number;
  /**
   * true = licz capacity z impact najlepszej okazji (OwnerDashboard od 7G.1, Pulpit executive).
   * false = wyłącz panel (np. testy izolowane).
   */
  financialCapacityEnabled?: boolean;
} & UseTendersPipelineOptions;

export type CommandCenterExecutiveSnapshot = {
  pipeline: ReturnType<typeof useTendersPipeline>;
  growthModeState: GrowthModeState;
  setGrowthMode: (mode: GrowthMode) => void;
  profile: ReturnType<typeof loadCompanyProfileLocal>;
  health: CompanyHealthResult;
  healthInput: CompanyHealthInput;
  healthExplanation: ReturnType<typeof explainHealth>;
  morningBriefing: MorningBriefing;
  actionCenter: ActionCenterResult;
  forecast90: Forecast90DaysResult;
  forecastInput: Forecast90DaysInput;
  forecastHorizonExplanations: ReturnType<typeof explainAllForecastHorizons>;
  forecastExplainContext: ReturnType<typeof buildForecastExplainContext>;
  bestOpportunity: TenderScoringBundle | null;
  financialCapacity: FinancialCapacityResult | null;
  marketKpi: ReturnType<typeof aggregateMarketKpi>;
  radarTop: TenderScoringBundle[];
  portfolioCounts: ReturnType<typeof countPortfolioDecisions>;
  ownerAlerts: ReturnType<typeof buildOwnerStrategicAlerts>;
  goCandidates: TenderScoringBundle[];
  scoredForForecast: TenderScoringBundle[];
  scoringContext: {
    health: CompanyHealthResult;
    growthMode: GrowthModeState["mode"];
    jobs: Job[];
    items: ReturnType<typeof useTendersPipeline>["items"];
    profile: ReturnType<typeof loadCompanyProfileLocal>;
  };
};

export function useCommandCenterExecutiveSnapshot(
  input: CommandCenterExecutiveSnapshotInput,
): CommandCenterExecutiveSnapshot {
  const {
    jobs,
    directory,
    productionWeekEmployees,
    weekFrom,
    weekTo,
    savedWeeks,
    learningRevision = 0,
    financialCapacityEnabled = false,
    profileVersion = 0,
  } = input;

  const [growthModeState, setGrowthModeState] = useState<GrowthModeState>(loadGrowthMode);
  const handleSetGrowthMode = (mode: GrowthMode) => {
    setGrowthModeState(setGrowthMode(mode));
  };
  const pipeline = useTendersPipeline({ profileVersion });
  const ownerDecisions = useOwnerTenderDecisions();

  const profile = useMemo(() => loadCompanyProfileLocal(), []);

  const healthInput = useMemo(
    (): CompanyHealthInput => ({
      items: pipeline.items,
      jobs,
      directory,
      weekEmployees: productionWeekEmployees,
      weekFrom,
      weekTo,
      profile,
      growthMode: growthModeState.mode,
      savedWeeks,
    }),
    [
      pipeline.items,
      jobs,
      directory,
      productionWeekEmployees,
      weekFrom,
      weekTo,
      profile,
      growthModeState.mode,
      savedWeeks,
    ],
  );

  const health = useMemo(
    () => computeCompanyHealth(healthInput),
    [healthInput],
  );

  const scoringContext = useMemo(
    () => ({
      health,
      growthMode: growthModeState.mode,
      jobs,
      items: pipeline.items,
      profile,
    }),
    [health, growthModeState.mode, jobs, pipeline.items, profile],
  );

  const marketKpi = useMemo(
    () => aggregateMarketKpi(pipeline.items, profile),
    [pipeline.items, profile],
  );

  const radarTop = useMemo(
    () => rankTopTenderOpportunities(pipeline.items, profile, scoringContext, 5),
    [pipeline.items, profile, scoringContext],
  );

  const bestOpportunity = radarTop[0] ?? null;

  const portfolioCounts = useMemo(
    () => countPortfolioDecisions(pipeline.items, profile, scoringContext),
    [pipeline.items, profile, scoringContext],
  );

  const scoredForForecast = useMemo(
    () => rankTopTenderOpportunities(pipeline.items, profile, scoringContext, 40),
    [pipeline.items, profile, scoringContext],
  );

  const goCandidates = useMemo(
    () =>
      collectGoCandidates(scoredForForecast, ownerDecisions.store)
        .sort((a, b) => b.opportunity.score - a.opportunity.score),
    [scoredForForecast, ownerDecisions.store],
  );

  const forecastInput = useMemo(
    (): Forecast90DaysInput => ({
      jobs,
      savedWeeks,
      weekEmployees: productionWeekEmployees,
      directory,
      weekFrom,
      weekTo,
      profile,
      goBundles: scoredForForecast,
      ownerStore: ownerDecisions.store,
    }),
    [
      jobs,
      savedWeeks,
      productionWeekEmployees,
      directory,
      weekFrom,
      weekTo,
      profile,
      scoredForForecast,
      ownerDecisions.store,
    ],
  );

  const forecast90 = useMemo(
    () => computeForecast90Days(forecastInput),
    [forecastInput],
  );

  const healthExplanation = useMemo(
    () => explainHealth(healthInput, health, forecast90),
    [healthInput, health, forecast90],
  );

  const forecastExplainContext = useMemo(() => {
    const goItems = goCandidates.map((b) => b.item);
    return buildForecastExplainContext(jobs, goItems);
  }, [jobs, goCandidates]);

  const forecastHorizonExplanations = useMemo(
    () => explainAllForecastHorizons(forecast90, forecastExplainContext),
    [forecast90, forecastExplainContext],
  );

  const ownerAlerts = useMemo(
    () =>
      buildOwnerStrategicAlerts({
        jobs,
        items: pipeline.items,
        goBundles: scoredForForecast,
        forecast: forecast90,
        forecastContext: forecastExplainContext,
        profile,
        ownerStore: ownerDecisions.store,
        savedWeeks,
      }),
    [
      jobs,
      pipeline.items,
      scoredForForecast,
      forecast90,
      forecastExplainContext,
      profile,
      ownerDecisions.store,
      savedWeeks,
    ],
  );

  const actionCenter = useMemo(
    () =>
      buildActionCenter({
        radarTop,
        scoredBundles: scoredForForecast,
        health,
        forecast: forecast90,
        ownerStore: ownerDecisions.store,
        strategicAlerts: ownerAlerts,
      }),
    [radarTop, scoredForForecast, health, forecast90, ownerDecisions.store, ownerAlerts],
  );

  const ownerDecisionProfile = useMemo(() => {
    const { entries } = loadTenderLearning();
    return computeOwnerProfile(entries);
  }, [learningRevision]);

  const aiInsights = useMemo(
    () =>
      computeAiInsights({
        learningEntries: loadTenderLearning().entries,
        ownerProfile: ownerDecisionProfile,
      }),
    [learningRevision, ownerDecisionProfile],
  );

  const financialCapacityComputed = useMemo((): FinancialCapacityResult | null => {
    if (!financialCapacityEnabled || !bestOpportunity) return null;
    const impact = computeTenderImpact({
      bundle: bestOpportunity,
      health,
      healthInput,
      forecastInput,
      forecast: forecast90,
      growthMode: growthModeState.mode,
      jobs,
      weekEmployees: productionWeekEmployees,
      directory,
      goCandidates,
      profile,
    });
    if (!impact) return null;
    return computeFinancialCapacity({
      bundle: bestOpportunity,
      profile,
      health,
      impact,
      jobs,
      growthMode: growthModeState.mode,
      pipelineItems: pipeline.items,
    });
  }, [
    financialCapacityEnabled,
    bestOpportunity,
    health,
    healthInput,
    forecastInput,
    forecast90,
    growthModeState.mode,
    jobs,
    productionWeekEmployees,
    directory,
    goCandidates,
    profile,
    pipeline.items,
  ]);

  const financialCapacity = financialCapacityEnabled ? financialCapacityComputed : null;

  const morningBriefing = useMemo(
    () =>
      buildMorningBriefing({
        health,
        actionCenter,
        forecast: forecast90,
        financialCapacity,
        ownerProfile: ownerDecisionProfile,
        aiInsights,
        bestOpportunity,
        ownerName: profile.ownerName,
      }),
    [
      health,
      actionCenter,
      forecast90,
      financialCapacity,
      ownerDecisionProfile,
      aiInsights,
      bestOpportunity,
      profile.ownerName,
    ],
  );

  return {
    pipeline,
    growthModeState,
    setGrowthMode: handleSetGrowthMode,
    profile,
    health,
    healthInput,
    healthExplanation,
    morningBriefing,
    actionCenter,
    forecast90,
    forecastInput,
    forecastHorizonExplanations,
    forecastExplainContext,
    bestOpportunity,
    financialCapacity,
    marketKpi,
    radarTop,
    portfolioCounts,
    ownerAlerts,
    goCandidates,
    scoredForForecast,
    scoringContext,
  };
}
