/**
 * W&G DOM COMMAND CENTER AI — Financial Command Center (ETAP 6E).
 * Runtime only — zdolność finansowa względem wadium i skali firmy.
 */

import type { Job } from "@/app/app-domain";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderCompanyProfile } from "@/lib/tenders-bzp-company";
import type { GrowthMode } from "@/lib/tender-center-growth-mode";
import type { CompanyHealthResult } from "@/lib/tender-center-health";
import { aggregateMarketKpi, type TenderCenterMarketKpi } from "@/lib/tender-center-kpi";
import type { TenderScoringBundle } from "@/lib/tender-center-decision";
import type { TenderImpactResult, ContractScale } from "@/lib/tender-center-impact";

export type FinancialCapacityClass =
  | "BARDZO WYSOKA"
  | "WYSOKA"
  | "ŚREDNIA"
  | "NISKA"
  | "KRYTYCZNA";

export type DepositImpactLevel =
  | "NISKI WPŁYW"
  | "ŚREDNI WPŁYW"
  | "WYSOKI WPŁYW"
  | "KRYTYCZNY WPŁYW";

export type LiquidityRiskLevel = "NISKIE" | "ŚREDNIE" | "WYSOKIE" | "KRYTYCZNE";

export type FinancialRecommendation =
  | "MOŻESZ STARTOWAĆ"
  | "STARTUJ PO ZABEZPIECZENIU FINANSOWANIA"
  | "ZBYT DUŻE RYZYKO FINANSOWE";

export interface FinancialCapacityResult {
  contractValue: number | null;
  depositValue: number | null;
  financialCapacityScore: number;
  capacityClass: FinancialCapacityClass;
  depositImpact: DepositImpactLevel;
  liquidityRisk: LiquidityRiskLevel;
  estimatedBuffer: number;
  fundingGap: number | null;
  recommendation: FinancialRecommendation;
  recommendationDetail: string[];
  warnings: string[];
  strengths: string[];
}

export interface FinancialCapacityInput {
  bundle: TenderScoringBundle;
  profile: TenderCompanyProfile;
  health: CompanyHealthResult;
  impact: TenderImpactResult;
  jobs: Job[];
  growthMode: GrowthMode;
  pipelineItems: TenderPipelineItem[];
  /** Precomputed KPI (Performance 2.1A). */
  marketKpi?: TenderCenterMarketKpi;
}

const GROWTH_BUFFER_MULT: Record<GrowthMode, number> = {
  stabilize: 0.72,
  balanced: 1,
  growth: 1.12,
  expansion: 1.22,
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function classifyCapacityScore(score: number): FinancialCapacityClass {
  if (score >= 90) return "BARDZO WYSOKA";
  if (score >= 75) return "WYSOKA";
  if (score >= 55) return "ŚREDNIA";
  if (score >= 40) return "NISKA";
  return "KRYTYCZNA";
}

function classifyDepositImpact(
  depositValue: number | null,
  contractValue: number | null,
  profile: TenderCompanyProfile,
  impact: TenderImpactResult,
  growthMode: GrowthMode,
): DepositImpactLevel {
  if (depositValue == null || depositValue <= 0) return "NISKI WPŁYW";

  const headroomPct = profile.maxWadiumPln > 0
    ? (depositValue / profile.maxWadiumPln) * 100
    : 100;
  const contractPct =
    contractValue != null && contractValue > 0
      ? (depositValue / contractValue) * 100
      : 0;
  const cashLevel = impact.cashFlowImpact.level;
  const impactPenalty = impact.impactScore.score < 55 ? 1 : 0;
  const growthPenalty = growthMode === "stabilize" && impact.contractScale !== "SMALL" ? 1 : 0;

  if (
    impact.revenueImpact.wadiumBlocked
    || cashLevel === "KRYTYCZNY"
    || headroomPct > 100
  ) {
    return "KRYTYCZNY WPŁYW";
  }
  if (
    cashLevel === "WYSOKI"
    || headroomPct >= 50
    || depositValue >= 150_000
    || (contractPct >= 5 && depositValue >= 40_000)
  ) {
    return "WYSOKI WPŁYW";
  }
  if (
    cashLevel === "ŚREDNI"
    || headroomPct >= 25
    || depositValue >= 25_000
    || impactPenalty + growthPenalty >= 1
  ) {
    return "ŚREDNI WPŁYW";
  }
  return "NISKI WPŁYW";
}

const MOBILIZATION_PCT: Record<ContractScale, number> = {
  SMALL: 0.008,
  MEDIUM: 0.025,
  LARGE: 0.045,
  STRATEGIC: 0.075,
};

function computeEstimatedBuffer(
  profile: TenderCompanyProfile,
  health: CompanyHealthResult,
  impact: TenderImpactResult,
  growthMode: GrowthMode,
  jobs: Job[],
  pipelineItems: TenderPipelineItem[],
  contractValue: number | null,
  marketKpi?: TenderCenterMarketKpi,
): number {
  const kpi = marketKpi ?? aggregateMarketKpi(pipelineItems, profile);
  const wadiumHeadroom = Math.max(0, kpi.wadiumHeadroomPln);
  const healthFactor = health.index / 100;
  const { companyScale, freeSlotsBefore, forecastAfter, contractScale } = impact;

  const activeJobs = jobs.filter((j) => j.status === "in_progress").length;
  const loadFactor = clamp(1 - activeJobs / Math.max(profile.maxConcurrentProjects, 1), 0.35, 1);
  const forecastFactor = forecastAfter <= 100 ? 1 : clamp(1 - (forecastAfter - 100) / 80, 0.5, 1);

  const operationalReserve =
    companyScale.typicalContractPln * 0.1 * healthFactor * loadFactor
    + freeSlotsBefore * companyScale.typicalContractPln * 0.03;

  const grossBuffer = (wadiumHeadroom + operationalReserve) * GROWTH_BUFFER_MULT[growthMode] * forecastFactor;

  const mobilizationPct = MOBILIZATION_PCT[contractScale];
  const mobilizationReserve =
    contractValue != null && contractValue > 0
      ? contractValue * mobilizationPct
      : 0;

  return Math.round(Math.max(0, grossBuffer - mobilizationReserve));
}

function computeFinancialCapacityScore(
  health: CompanyHealthResult,
  impact: TenderImpactResult,
  depositValue: number | null,
  estimatedBuffer: number,
  fundingGap: number | null,
  growthMode: GrowthMode,
): number {
  let score = 55;

  score += (health.index - 50) * 0.35;
  score += (impact.impactScore.cashFlowComponent - 50) * 0.25;
  score += (impact.impactScore.score - 50) * 0.15;

  if (depositValue != null && estimatedBuffer > 0) {
    const coverage = estimatedBuffer / Math.max(depositValue, 1);
    if (coverage >= 2) score += 18;
    else if (coverage >= 1.2) score += 12;
    else if (coverage >= 0.8) score += 4;
    else if (coverage >= 0.5) score -= 8;
    else score -= 18;
  }

  if (fundingGap != null && fundingGap > 0) {
    score -= Math.min(25, Math.round((fundingGap / Math.max(estimatedBuffer, 1)) * 30));
  }

  if (impact.contractScale === "STRATEGIC") score -= 8;
  if (impact.contractScale === "SMALL") score += 4;
  if (impact.teamImpact.level === "WYMAGA REKRUTACJI") score -= 12;
  if (impact.cashFlowImpact.level === "KRYTYCZNY") score -= 20;
  if (growthMode === "stabilize" && impact.contractScale !== "SMALL") score -= 6;
  if (growthMode === "expansion" && impact.contractScale === "STRATEGIC") score -= 4;

  return clamp(Math.round(score), 0, 100);
}

function classifyLiquidityRisk(
  score: number,
  depositImpact: DepositImpactLevel,
  fundingGap: number | null,
): LiquidityRiskLevel {
  if (depositImpact === "KRYTYCZNY WPŁYW" || (fundingGap != null && fundingGap > 0 && score < 45)) {
    return "KRYTYCZNE";
  }
  if (depositImpact === "WYSOKI WPŁYW" || score < 55) return "WYSOKIE";
  if (depositImpact === "ŚREDNI WPŁYW" || score < 75) return "ŚREDNIE";
  return "NISKIE";
}

function resolveFinancialRecommendation(
  score: number,
  fundingGap: number | null,
  depositImpact: DepositImpactLevel,
  impact: TenderImpactResult,
): { recommendation: FinancialRecommendation; detail: string[] } {
  const detail: string[] = [];

  if (
    score < 40
    || depositImpact === "KRYTYCZNY WPŁYW"
    || impact.revenueImpact.wadiumBlocked
  ) {
    detail.push("Wadium lub skala kontraktu przekraczają bezpieczną pojemność finansową firmy.");
    if (fundingGap != null && fundingGap > 0) {
      detail.push(`Szacowany brak: ${fundingGap.toLocaleString("pl-PL")} zł na pokrycie wadium.`);
    }
    return { recommendation: "ZBYT DUŻE RYZYKO FINANSOWE", detail };
  }

  if (
    fundingGap != null && fundingGap > 0
    || depositImpact === "WYSOKI WPŁYW"
    || score < 75
  ) {
    detail.push("Przetarg możliwy, ale wymaga rezerwy lub zabezpieczenia wadium.");
    if (fundingGap != null && fundingGap > 0) {
      detail.push(`Brakujące środki: ok. ${fundingGap.toLocaleString("pl-PL")} zł.`);
    }
    return { recommendation: "STARTUJ PO ZABEZPIECZENIU FINANSOWANIA", detail };
  }

  detail.push("Szacowany bufor finansowy pokrywa wadium i koszty startu postępowania.");
  detail.push("Płynność operacyjna na obecnym poziomie obciążenia pozwala startować.");
  return { recommendation: "MOŻESZ STARTOWAĆ", detail };
}

function buildWarnings(
  impact: TenderImpactResult,
  depositImpact: DepositImpactLevel,
  fundingGap: number | null,
): string[] {
  const warnings: string[] = [];

  if (depositImpact === "WYSOKI WPŁYW" || depositImpact === "KRYTYCZNY WPŁYW") {
    warnings.push("Wysokie wadium");
  }
  if (
    impact.cashFlowImpact.level === "WYSOKI"
    || impact.cashFlowImpact.level === "KRYTYCZNY"
    || (fundingGap != null && fundingGap > 0)
  ) {
    warnings.push("Możliwe przeciążenie płynności");
  }
  if (
    impact.contractScale === "LARGE"
    || impact.contractScale === "STRATEGIC"
  ) {
    warnings.push("Kontrakt większy niż typowa realizacja firmy");
  }
  if (impact.forecastAfter > 100) {
    warnings.push("Prognoza wskazuje ryzyko przeciążenia operacyjnego");
  }

  return warnings.slice(0, 5);
}

function buildStrengths(
  health: CompanyHealthResult,
  impact: TenderImpactResult,
): string[] {
  const strengths: string[] = [];

  if (health.index >= 70) strengths.push("Wysoki Health Index");
  if (impact.risks.some((r) => r.tone === "positive" && r.text.includes("profil"))) {
    strengths.push("Dobra zgodność z profilem");
  }
  if (
    impact.teamImpact.level === "BRAK WPŁYWU"
    || impact.teamImpact.level === "LEKKIE OBCIĄŻENIE"
  ) {
    strengths.push("Wolne zasoby zespołu");
  }
  if (impact.forecastAfter >= 45 && impact.forecastAfter <= 100 && impact.forecastDelta >= 0) {
    strengths.push("Stabilna prognoza 90 dni");
  }
  if (impact.cashFlowImpact.level === "NISKI" && impact.revenueImpact.wadiumPln != null) {
    strengths.push("Niskie obciążenie wadium");
  }

  return strengths.slice(0, 5);
}

export function computeFinancialCapacity(
  input: FinancialCapacityInput,
): FinancialCapacityResult | null {
  const { profile, health, impact, jobs, growthMode, pipelineItems, marketKpi } = input;

  const contractValue = impact.revenueImpact.contractValuePln;
  const depositValue = impact.revenueImpact.wadiumPln;

  const estimatedBuffer = computeEstimatedBuffer(
    profile,
    health,
    impact,
    growthMode,
    jobs,
    pipelineItems,
    contractValue,
    marketKpi,
  );
  const fundingGap =
    depositValue != null && depositValue > estimatedBuffer
      ? Math.round(depositValue - estimatedBuffer)
      : null;

  const depositImpact = classifyDepositImpact(
    depositValue,
    contractValue,
    profile,
    impact,
    growthMode,
  );

  const financialCapacityScore = computeFinancialCapacityScore(
    health,
    impact,
    depositValue,
    estimatedBuffer,
    fundingGap,
    growthMode,
  );

  const capacityClass = classifyCapacityScore(financialCapacityScore);
  const liquidityRisk = classifyLiquidityRisk(financialCapacityScore, depositImpact, fundingGap);
  const { recommendation, detail } = resolveFinancialRecommendation(
    financialCapacityScore,
    fundingGap,
    depositImpact,
    impact,
  );

  return {
    contractValue,
    depositValue,
    financialCapacityScore,
    capacityClass,
    depositImpact,
    liquidityRisk,
    estimatedBuffer,
    fundingGap,
    recommendation,
    recommendationDetail: detail,
    warnings: buildWarnings(impact, depositImpact, fundingGap),
    strengths: buildStrengths(health, impact),
  };
}

export function capacityScoreTone(score: number): string {
  if (score >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 75) return "text-blue-600 dark:text-blue-400";
  if (score >= 55) return "text-amber-600 dark:text-amber-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

export function liquidityRiskTone(level: LiquidityRiskLevel): string {
  switch (level) {
    case "NISKIE":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "ŚREDNIE":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "WYSOKIE":
      return "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400";
    case "KRYTYCZNE":
      return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400";
  }
}

export function depositImpactTone(level: DepositImpactLevel): string {
  switch (level) {
    case "NISKI WPŁYW":
      return "text-emerald-700 dark:text-emerald-400";
    case "ŚREDNI WPŁYW":
      return "text-amber-700 dark:text-amber-400";
    case "WYSOKI WPŁYW":
      return "text-orange-700 dark:text-orange-400";
    case "KRYTYCZNY WPŁYW":
      return "text-red-700 dark:text-red-400";
  }
}

export function financialRecommendationTone(rec: FinancialRecommendation): string {
  switch (rec) {
    case "MOŻESZ STARTOWAĆ":
      return "border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-card to-card text-emerald-700 dark:text-emerald-300";
    case "STARTUJ PO ZABEZPIECZENIU FINANSOWANIA":
      return "border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-card to-card text-amber-700 dark:text-amber-300";
    case "ZBYT DUŻE RYZYKO FINANSOWE":
      return "border-red-500/35 bg-gradient-to-br from-red-500/10 via-card to-card text-red-700 dark:text-red-400";
  }
}
