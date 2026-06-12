import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { WGDOM_DEFERRED_BOOTSTRAP_EVENT } from "@/lib/cloud-sync";
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
  portfolioCountsFromScoredBundles,
  scoreAllActionableTenderOpportunities,
} from "@/lib/tender-center-decision";
import {
  collectGoCandidates,
  computeForecast90Days,
  type Forecast90DaysInput,
} from "@/lib/tender-center-forecast-90d";
import { buildOwnerStrategicAlerts } from "@/lib/tenders-strategy-alerts";
import { buildActionCenter } from "@/lib/tender-center-action-center";
import {
  computeFinancialCapacity,
  type FinancialCapacityResult,
} from "@/lib/tender-center-financial-capacity";
import { computeTenderImpact } from "@/lib/tender-center-impact";

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
  /** Alerty strategiczne — karmią Action Center (Priorytety). */
  strategicAlerts: CommandCenterExecutiveSnapshot["ownerAlerts"];
  profileVersion: number;
  bumpProfileVersion: () => void;
};

const CommandCenterContext = createContext<CommandCenterContextValue | null>(null);

function useCommandCenterSnapshot(
  input: CommandCenterProviderInput,
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

  const marketKpi = useMemo(
    () => aggregateMarketKpi(pipeline.items, profile),
    [pipeline.items, profile],
  );

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
      marketKpi,
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
      marketKpi,
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
      marketKpi,
    }),
    [health, growthModeState.mode, jobs, pipeline.items, profile, marketKpi],
  );

  const scoredOpportunities = useMemo(
    () => scoreAllActionableTenderOpportunities(pipeline.items, profile, scoringContext),
    [pipeline.items, profile, scoringContext],
  );

  const radarTop = useMemo(
    () => scoredOpportunities.slice(0, 5),
    [scoredOpportunities],
  );

  const bestOpportunity = radarTop[0] ?? null;

  const portfolioCounts = useMemo(
    () => portfolioCountsFromScoredBundles(scoredOpportunities),
    [scoredOpportunities],
  );

  const scoredForForecast = useMemo(
    () => scoredOpportunities.slice(0, 40),
    [scoredOpportunities],
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

  const ownerAlerts = useMemo(
    () =>
      buildOwnerStrategicAlerts({
        jobs,
        items: pipeline.items,
        goBundles: scoredForForecast,
        forecast: forecast90,
        profile,
        ownerStore: ownerDecisions.store,
        savedWeeks,
      }),
    [
      jobs,
      pipeline.items,
      scoredForForecast,
      forecast90,
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

  const financialCapacityComputed = useMemo((): FinancialCapacityResult | null => {
    if (!bestOpportunity) return null;
    const beforeForecastScenario = forecast90.scenarios.find((s) => s.id === "none");
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
      marketKpi,
      beforeForecastScenario,
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
      marketKpi,
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
    marketKpi,
  ]);

  return {
    pipeline,
    growthModeState,
    setGrowthMode: handleSetGrowthMode,
    profile,
    health,
    healthInput,
    actionCenter,
    forecast90,
    forecastInput,
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

  const [profileVersion, setProfileVersion] = useState(0);

  const bumpProfileVersion = useCallback(() => {
    setProfileVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onDeferredBootstrap = () => {
      bumpProfileVersion();
    };
    window.addEventListener(WGDOM_DEFERRED_BOOTSTRAP_EVENT, onDeferredBootstrap);
    return () => window.removeEventListener(WGDOM_DEFERRED_BOOTSTRAP_EVENT, onDeferredBootstrap);
  }, [enabled, bumpProfileVersion]);

  const ownerDecisions = useOwnerTenderDecisions();
  const snapshot = useCommandCenterSnapshot(
    input,
    profileVersion,
    ownerDecisions,
  );

  const value = useMemo(
    (): CommandCenterContextValue => ({
      snapshot,
      ownerDecisions,
      strategicAlerts: snapshot.ownerAlerts,
      profileVersion,
      bumpProfileVersion,
    }),
    [snapshot, ownerDecisions, profileVersion, bumpProfileVersion],
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
