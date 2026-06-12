import type {
  DirectoryEmployee,
  Job,
  WeekEmployee,
  WeekSnapshot,
} from "@/app/app-domain";
import type { CompanyHealthResult } from "@/lib/tender-center-health";
import type { ActionCenterResult } from "@/lib/tender-center-action-center";
import type { FinancialCapacityResult } from "@/lib/tender-center-financial-capacity";
import type { Forecast90DaysResult, Forecast90DaysInput } from "@/lib/tender-center-forecast-90d";
import type { TenderScoringBundle } from "@/lib/tender-center-decision";
import type { UseTendersPipelineOptions } from "@/app/tender-center/hooks/useTendersPipeline";
import { useTendersPipeline } from "@/app/tender-center/hooks/useTendersPipeline";
import type { GrowthModeState, GrowthMode } from "@/lib/tender-center-growth-mode";
import type { CompanyHealthInput } from "@/lib/tender-center-health";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { useCommandCenterContextOptional } from "@/app/tender-center/context/CommandCenterContext";

/** @deprecated ETAP 7H — pola wejściowe ignorowane przy aktywnym Providerze; zachowane dla typów. */
export type CommandCenterExecutiveSnapshotInput = {
  jobs: Job[];
  directory: DirectoryEmployee[];
  productionWeekEmployees: WeekEmployee[];
  weekFrom: string;
  weekTo: string;
  savedWeeks: WeekSnapshot[];
  financialCapacityEnabled?: boolean;
} & UseTendersPipelineOptions;

export type CommandCenterExecutiveSnapshot = {
  pipeline: ReturnType<typeof useTendersPipeline>;
  growthModeState: GrowthModeState;
  setGrowthMode: (mode: GrowthMode) => void;
  profile: ReturnType<typeof loadCompanyProfileLocal>;
  health: CompanyHealthResult;
  healthInput: CompanyHealthInput;
  actionCenter: ActionCenterResult;
  forecast90: Forecast90DaysResult;
  forecastInput: Forecast90DaysInput;
  bestOpportunity: TenderScoringBundle | null;
  financialCapacity: FinancialCapacityResult | null;
  marketKpi: ReturnType<typeof import("@/lib/tender-center-kpi").aggregateMarketKpi>;
  radarTop: TenderScoringBundle[];
  portfolioCounts: ReturnType<typeof import("@/lib/tender-center-decision").countPortfolioDecisions>;
  ownerAlerts: ReturnType<typeof import("@/lib/tenders-strategy-alerts").buildOwnerStrategicAlerts>;
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

/**
 * ETAP 7H — odczyt ze wspólnego CommandCenterProvider.
 * Parametr `input` jest ignorowany gdy Provider jest aktywny.
 */
export function useCommandCenterExecutiveSnapshot(
  _input?: CommandCenterExecutiveSnapshotInput,
): CommandCenterExecutiveSnapshot {
  const ctx = useCommandCenterContextOptional();
  if (!ctx) {
    throw new Error(
      "useCommandCenterExecutiveSnapshot wymaga CommandCenterProvider — Pulpit lub Przetargi (Performance 2.1B).",
    );
  }
  return ctx.snapshot;
}
