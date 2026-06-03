import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  DirectoryEmployee,
  Job,
  WeekEmployee,
  WeekSnapshot,
} from "@/app/app-domain";
import { useTendersPipeline } from "@/app/tender-center/hooks/useTendersPipeline";
import { useOwnerTenderDecisions } from "@/app/tender-center/hooks/useOwnerTenderDecisions";
import type { CommandCenterExecutiveSnapshot } from "@/app/tender-center/hooks/useCommandCenterExecutiveSnapshot";
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
import { computeAiInsights, type AiInsightsResult } from "@/lib/tender-center-ai-insights";
import { computeOwnerProfile, type OwnerProfile } from "@/lib/tender-center-owner-profile";
import {
  getLearningStats,
  loadTenderLearning,
  type LearningStats,
} from "@/lib/tender-center-learning";
import { buildMorningBriefing } from "@/lib/tender-center-morning-briefing";
import { buildActionCenter } from "@/lib/tender-center-action-center";
import {
  computeFinancialCapacity,
  type FinancialCapacityResult,
} from "@/lib/tender-center-financial-capacity";
import { computeTenderImpact } from "@/lib/tender-center-impact";
import type { useOwnerTenderDecisions } from "@/app/tender-center/hooks/useOwnerTenderDecisions";

export type CommandCenterProviderInput = {
  jobs: Job[];
  directory: DirectoryEmployee[];
  productionWeekEmployees: WeekEmployee[];
  weekFrom: string;
  weekTo: string;
  savedWeeks: WeekSnapshot[];
};

export type CommandCenterContextValue = {
  snapshot: CommandCenterExecutiveSnapshot;
  ownerDecisions: ReturnType<typeof useOwnerTenderDecisions>;
  /** strategicAlerts z explain — alias dla dokumentacji 7H */
  strategicAlerts: CommandCenterExecutiveSnapshot["ownerAlerts"];
  learningStats: LearningStats;
  ownerProfile: OwnerProfile;
  aiInsights: AiInsightsResult;
  learningRevision: number;
  profileVersion: number;
  bumpLearningRevision: () => void;
  bumpProfileVersion: () => void;
};

const CommandCenterContext = createContext<CommandCenterContextValue | null>(null);

function useCommandCenterSnapshot(
  input: CommandCenterProviderInput,
  learningRevision: number,
  profileVersion: number,
  ownerDecisions: ReturnType<typeof useOwnerTenderDecisions>,
): CommandCenterExecutiveSnapshot {
  const {
    jobs,
    directory,
    productionWeekEmployees,
    weekFrom,
    weekTo,
    savedWeeks,
  } = input;

  const [growthModeState, setGrowthModeState] = useState<GrowthModeState>(loadGrowthMode);
  const handleSetGrowthMode = (mode: GrowthMode) => {
    setGrowthModeState(setGrowthMode(mode));
  };
  const pipeline = useTendersPipeline({ profileVersion });

  const profile = useMemo(() => loadCompanyProfileLocal(), [profileVersion]);

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

  const health = useMemo(() => computeCompanyHealth(healthInput), [healthInput]);

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
    if (!bestOpportunity) return null;
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

  const morningBriefing = useMemo(
    () =>
      buildMorningBriefing({
        health,
        actionCenter,
        forecast: forecast90,
        financialCapacity: financialCapacityComputed,
        ownerProfile: ownerDecisionProfile,
        aiInsights,
        bestOpportunity,
        ownerName: profile.ownerName,
      }),
    [
      health,
      actionCenter,
      forecast90,
      financialCapacityComputed,
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
    financialCapacity: financialCapacityComputed,
    marketKpi,
    radarTop,
    portfolioCounts,
    ownerAlerts,
    goCandidates,
    scoredForForecast,
    scoringContext,
  };
}

export function CommandCenterProvider({
  enabled,
  children,
  jobs,
  directory,
  productionWeekEmployees,
  weekFrom,
  weekTo,
  savedWeeks,
}: CommandCenterProviderInput & {
  enabled: boolean;
  children: ReactNode;
}) {
  const input = useMemo(
    (): CommandCenterProviderInput => ({
      jobs,
      directory,
      productionWeekEmployees,
      weekFrom,
      weekTo,
      savedWeeks,
    }),
    [jobs, directory, productionWeekEmployees, weekFrom, weekTo, savedWeeks],
  );

  const [learningRevision, setLearningRevision] = useState(0);
  const [profileVersion, setProfileVersion] = useState(0);

  const bumpLearningRevision = useCallback(() => {
    setLearningRevision((v) => v + 1);
  }, []);

  const bumpProfileVersion = useCallback(() => {
    setProfileVersion((v) => v + 1);
  }, []);

  const ownerDecisions = useOwnerTenderDecisions();
  const snapshot = useCommandCenterSnapshot(
    input,
    learningRevision,
    profileVersion,
    ownerDecisions,
  );

  const learningStats = useMemo(() => getLearningStats(), [learningRevision]);

  const ownerProfile = useMemo(() => {
    const { entries } = loadTenderLearning();
    return computeOwnerProfile(entries);
  }, [learningRevision]);

  const aiInsights = useMemo(
    () =>
      computeAiInsights({
        learningEntries: loadTenderLearning().entries,
        ownerProfile,
      }),
    [learningRevision, ownerProfile],
  );

  const value = useMemo(
    (): CommandCenterContextValue => ({
      snapshot,
      ownerDecisions,
      strategicAlerts: snapshot.ownerAlerts,
      learningStats,
      ownerProfile,
      aiInsights,
      learningRevision,
      profileVersion,
      bumpLearningRevision,
      bumpProfileVersion,
    }),
    [
      snapshot,
      ownerDecisions,
      learningStats,
      ownerProfile,
      aiInsights,
      learningRevision,
      profileVersion,
      bumpLearningRevision,
      bumpProfileVersion,
    ],
  );

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <CommandCenterContext.Provider value={value}>{children}</CommandCenterContext.Provider>
  );
}

export function useCommandCenterContext(): CommandCenterContextValue {
  const ctx = useContext(CommandCenterContext);
  if (!ctx) {
    throw new Error(
      "useCommandCenterContext wymaga CommandCenterProvider (canViewTendersNav).",
    );
  }
  return ctx;
}

/** Opcjonalny odczyt — null poza Providerem. */
export function useCommandCenterContextOptional(): CommandCenterContextValue | null {
  return useContext(CommandCenterContext);
}
