import type {
  DirectoryEmployee,
  Job,
  WeekEmployee,
  WeekSnapshot,
} from "@/app/app-domain";
import type { CompanyHealthResult } from "@/lib/tender-center-health";
import type { ActionCenterResult } from "@/lib/tender-center-action-center";
import type { FinancialCapacityResult } from "@/lib/tender-center-financial-capacity";
import type { Forecast90DaysInput, Forecast90DaysResult } from "@/lib/tender-center-forecast-90d";
import type { TenderScoringBundle } from "@/lib/tender-center-decision";
import type { UseTendersPipelineOptions } from "@/app/tender-center/hooks/useTendersPipeline";
import { useTendersPipeline } from "@/app/tender-center/hooks/useTendersPipeline";
import type { GrowthMode, GrowthModeState } from "@/lib/tender-center-growth-mode";
import type { CompanyHealthInput } from "@/lib/tender-center-health";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";

export type TendersProviderInput = {
  jobs: Job[];
  directory: DirectoryEmployee[];
  productionWeekEmployees: WeekEmployee[];
  weekFrom: string;
  weekTo: string;
  savedWeeks: WeekSnapshot[];
};

export type TendersStrategySnapshot = {
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
  portfolioCounts: ReturnType<typeof import("@/lib/tender-center-decision").portfolioCountsFromScoredBundles>;
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

export type TendersStrategySnapshotOptions = TendersProviderInput & UseTendersPipelineOptions;
