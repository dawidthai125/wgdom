/**
 * W&G DOM COMMAND CENTER AI — Impact Engine V2 (ETAP 6C/6D).
 * Runtime only — symulacja wpływu wygranej względem skali firmy.
 */

import type {
  DirectoryEmployee,
  Job,
  WeekEmployee,
  WeekSnapshot,
} from "@/app/app-domain";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderCompanyProfile } from "@/lib/tenders-bzp-company";
import { estimatedValuePlnFromItem, extractRequiredReferencePln } from "@/lib/tenders-bzp-fit";
import { daysUntilTenderDeadline } from "@/lib/tenders-bzp";
import {
  type TenderDecision,
  type TenderScoringBundle,
  DECISION_LABEL_PL,
} from "@/lib/tender-center-decision";
import type { GrowthMode } from "@/lib/tender-center-growth-mode";
import {
  type CompanyHealthInput,
  type CompanyHealthResult,
} from "@/lib/tender-center-health";
import { aggregateMarketKpi, type TenderCenterMarketKpi } from "@/lib/tender-center-kpi";
import {
  type Forecast90DaysInput,
  type Forecast90DaysResult,
  type ForecastScenarioResult,
  computeSingleForecastScenario,
} from "@/lib/tender-center-forecast-90d";
import { stripHtmlToText } from "@/lib/tenders-bzp-swz";
import { computeWadiumInfo } from "@/lib/tenders-wadium";

export type ImpactRiskLevel = "low" | "medium" | "high";

export type ContractScale = "SMALL" | "MEDIUM" | "LARGE" | "STRATEGIC";

export type CashFlowImpactLevel = "NISKI" | "ŚREDNI" | "WYSOKI" | "KRYTYCZNY";

export type TeamImpactLevel =
  | "BRAK WPŁYWU"
  | "LEKKIE OBCIĄŻENIE"
  | "DUŻE OBCIĄŻENIE"
  | "WYMAGA REKRUTACJI";

export type ImpactScoreClass =
  | "STRATEGIC OPPORTUNITY"
  | "HIGH IMPACT"
  | "MODERATE IMPACT"
  | "LOW IMPACT";

export type ImpactRiskItem = {
  tone: "warning" | "positive";
  text: string;
};

export interface TenderImpactRevenue {
  contractValuePln: number | null;
  valueSource: "ourEstimate" | "swzValue" | null;
  wadiumPln: number | null;
  wadiumBlocked: boolean;
  marginPct: number | null;
  displayLabel: string;
}

export interface CompanyScaleContext {
  annualThroughputPln: number;
  activePortfolioPln: number;
  pipelineValuePln: number;
  typicalContractPln: number;
  relativeToFirm: number;
}

export interface CashFlowImpact {
  level: CashFlowImpactLevel;
  wadiumPln: number | null;
  wadiumToContractPct: number | null;
  wadiumToHeadroomPct: number | null;
  note: string;
}

export interface TeamImpact {
  level: TeamImpactLevel;
  note: string;
}

export interface ImpactScoreResult {
  score: number;
  label: ImpactScoreClass;
  healthComponent: number;
  forecastComponent: number;
  cashFlowComponent: number;
  teamComponent: number;
}

export interface TenderImpactResult {
  tenderId: string;
  tenderTitle: string;
  revenueImpact: TenderImpactRevenue;
  contractScale: ContractScale;
  companyScale: CompanyScaleContext;
  healthBefore: number;
  healthAfter: number;
  healthDelta: number;
  forecastBefore: number;
  forecastAfter: number;
  forecastDelta: number;
  freeSlotsBefore: number;
  freeSlotsAfter: number;
  workforceNote: string;
  cashFlowImpact: CashFlowImpact;
  teamImpact: TeamImpact;
  impactScore: ImpactScoreResult;
  riskLevel: ImpactRiskLevel;
  risks: ImpactRiskItem[];
  recommendation: TenderDecision;
  recommendationLabel: string;
  summary: string;
  recommendationDetail: string[];
}

export interface TenderImpactInput {
  bundle: TenderScoringBundle;
  health: CompanyHealthResult;
  healthInput: CompanyHealthInput;
  forecastInput: Forecast90DaysInput;
  forecast: Forecast90DaysResult;
  growthMode: GrowthMode;
  jobs: Job[];
  weekEmployees: WeekEmployee[];
  directory: DirectoryEmployee[];
  goCandidates: TenderScoringBundle[];
  profile: TenderCompanyProfile;
  now?: Date;
  /** Precomputed KPI (Performance 2.1A). */
  marketKpi?: TenderCenterMarketKpi;
  /** Scenariusz „none” z computeForecast90Days — pomija redundantny pass (Performance 2.1A). */
  beforeForecastScenario?: ForecastScenarioResult;
}

export const CONTRACT_SCALE_LABEL_PL: Record<ContractScale, string> = {
  SMALL: "Mały kontrakt",
  MEDIUM: "Średni kontrakt",
  LARGE: "Duży kontrakt",
  STRATEGIC: "Strategiczny kontrakt",
};

export const IMPACT_SCORE_CLASS_PL: Record<ImpactScoreClass, string> = {
  "STRATEGIC OPPORTUNITY": "Okazja strategiczna",
  "HIGH IMPACT": "Wysoki wpływ",
  "MODERATE IMPACT": "Umiarkowany wpływ",
  "LOW IMPACT": "Niski wpływ",
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function horizon90Pct(
  scenario: ReturnType<typeof computeSingleForecastScenario>,
): number {
  return scenario.horizons.find((h) => h.days === 90)?.utilizationPct ?? 0;
}

function ensureBundleInForecastInput(
  input: Forecast90DaysInput,
  bundle: TenderScoringBundle,
): Forecast90DaysInput {
  if (input.goBundles.some((b) => b.item.id === bundle.item.id)) return input;
  return { ...input, goBundles: [...input.goBundles, bundle] };
}

function activeJobsValuePln(jobs: Job[]): number {
  return jobs
    .filter((j) => j.status === "in_progress")
    .reduce((sum, j) => {
      const n = parseFloat(j.invoiceAmount || "0");
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
}

function annualThroughputFromArchive(
  savedWeeks: WeekSnapshot[] | undefined,
  profile: TenderCompanyProfile,
): number {
  const weeks = (savedWeeks ?? []).filter((w) => !w.backlog).slice(-26);
  if (weeks.length >= 4) {
    const totalHours = weeks.reduce((s, w) => s + (w.totalHours ?? 0), 0);
    const avgWeeklyHours = totalHours / weeks.length;
    const dayRate = profile.costModel.avgGrossHourlyPln * 8
      * (1 + profile.costModel.employerBurdenPct / 100);
    const weeklyRevenue = avgWeeklyHours * (dayRate / 8);
    return Math.round(weeklyRevenue * 48);
  }
  return Math.round(profile.totalReferencesPln / 5);
}

export function computeCompanyScaleContext(
  contractValuePln: number | null,
  jobs: Job[],
  items: TenderPipelineItem[],
  profile: TenderCompanyProfile,
  savedWeeks?: WeekSnapshot[],
  marketKpi?: TenderCenterMarketKpi,
): CompanyScaleContext {
  const activePortfolioPln = activeJobsValuePln(jobs);
  const kpi = marketKpi ?? aggregateMarketKpi(items, profile);
  const pipelineValuePln = Math.round(kpi.pipelineBidValuePln + kpi.marketValuePln * 0.25);
  const annualThroughputPln = Math.max(
    annualThroughputFromArchive(savedWeeks, profile),
    activePortfolioPln * 1.2,
    profile.referenceExperiencePln,
  );
  const activeCount = Math.max(jobs.filter((j) => j.status === "in_progress").length, 1);
  const typicalContractPln = Math.max(
    profile.minOrderValuePln,
    profile.referenceExperiencePln,
    activePortfolioPln / activeCount,
    annualThroughputPln / Math.max(profile.maxConcurrentProjects, 1),
  );
  const relativeToFirm =
    contractValuePln != null && annualThroughputPln > 0
      ? contractValuePln / annualThroughputPln
      : 0;

  return {
    annualThroughputPln,
    activePortfolioPln,
    pipelineValuePln,
    typicalContractPln,
    relativeToFirm,
  };
}

export function classifyContractScale(
  contractValuePln: number | null,
  companyScale: CompanyScaleContext,
  profile: TenderCompanyProfile,
): ContractScale {
  if (contractValuePln == null || contractValuePln <= 0) return "SMALL";

  const { relativeToFirm, typicalContractPln } = companyScale;
  const vsTypical = contractValuePln / Math.max(typicalContractPln, 1);

  if (
    contractValuePln >= profile.maxOrderValuePln * 0.85
    || relativeToFirm >= 1.4
    || vsTypical >= 2
  ) {
    return "STRATEGIC";
  }
  if (relativeToFirm >= 0.88 || vsTypical >= 1.35) return "LARGE";
  if (relativeToFirm >= 0.12 || vsTypical >= 0.3) return "MEDIUM";
  return "SMALL";
}

const SCALE_FORECAST_WEIGHT: Record<ContractScale, number> = {
  SMALL: 0.22,
  MEDIUM: 0.55,
  LARGE: 0.82,
  STRATEGIC: 1.12,
};

const SCALE_HEALTH_BOOST: Record<ContractScale, number> = {
  SMALL: 1,
  MEDIUM: 3,
  LARGE: 6,
  STRATEGIC: 9,
};

const GROWTH_MODE_HEALTH_MULT: Record<GrowthMode, number> = {
  stabilize: 0.55,
  balanced: 1,
  growth: 1.15,
  expansion: 1.3,
};

function scaleForecastImpact(
  forecastBefore: number,
  rawDelta: number,
  scale: ContractScale,
): { forecastAfter: number; forecastDelta: number } {
  let delta = Math.round(rawDelta * SCALE_FORECAST_WEIGHT[scale]);
  if (scale === "SMALL") delta = Math.min(delta, 8);
  if (scale === "MEDIUM") delta = clamp(delta, 4, 22);
  if (scale === "LARGE") delta = clamp(delta, 12, 35);
  if (scale === "STRATEGIC") delta = clamp(delta, 18, 45);
  const forecastAfter = clamp(forecastBefore + delta, 0, 160);
  return { forecastAfter, forecastDelta: forecastAfter - forecastBefore };
}

function computeHealthImpactV2(
  healthBefore: number,
  scale: ContractScale,
  forecastAfter: number,
  freeSlotsBefore: number,
  growthMode: GrowthMode,
  overloadIndex: number,
): { healthAfter: number; healthDelta: number } {
  const baseBoost = SCALE_HEALTH_BOOST[scale];
  const utilizationPenalty =
    forecastAfter > 100 ? Math.min(8, Math.round((forecastAfter - 100) * 0.35)) : 0;
  const slotPenalty =
    freeSlotsBefore <= 0 ? 5 : freeSlotsBefore === 1 ? 2 : 0;
  const overloadPenalty = overloadIndex >= 1 ? 3 : overloadIndex >= 0.75 ? 1 : 0;

  let delta = Math.round(
    (baseBoost - utilizationPenalty - slotPenalty - overloadPenalty)
      * GROWTH_MODE_HEALTH_MULT[growthMode],
  );

  if (scale === "SMALL") delta = clamp(delta, -2, 2);
  if (scale === "MEDIUM") delta = clamp(delta, -1, 5);
  if (scale === "LARGE") delta = clamp(delta, 0, 8);
  if (scale === "STRATEGIC") delta = clamp(delta, 1, 12);

  const healthAfter = clamp(healthBefore + delta, 0, 100);
  return { healthAfter, healthDelta: healthAfter - healthBefore };
}

function computeCashFlowImpact(
  revenue: TenderImpactRevenue,
  contractValuePln: number | null,
  profile: TenderCompanyProfile,
): CashFlowImpact {
  const wadiumPln = revenue.wadiumPln;
  const wadiumToContractPct =
    wadiumPln != null && contractValuePln != null && contractValuePln > 0
      ? Math.round((wadiumPln / contractValuePln) * 1000) / 10
      : null;
  const wadiumToHeadroomPct =
    wadiumPln != null && profile.maxWadiumPln > 0
      ? Math.round((wadiumPln / profile.maxWadiumPln) * 100)
      : null;

  let level: CashFlowImpactLevel = "NISKI";
  let note = "Wadium w normie — niski wpływ na płynność.";

  if (revenue.wadiumBlocked || (wadiumToHeadroomPct != null && wadiumToHeadroomPct > 100)) {
    level = "KRYTYCZNY";
    note = "⚠ Wadium przekracza limit profilu — konieczne dodatkowe finansowanie.";
  } else if (
    (wadiumToHeadroomPct != null && wadiumToHeadroomPct >= 50)
    || (wadiumPln != null && wadiumPln >= 150_000)
  ) {
    level = "WYSOKI";
    note = "⚠ Może wymagać dodatkowego finansowania na okres trwania postępowania.";
  } else if (
    (wadiumToHeadroomPct != null && wadiumToHeadroomPct >= 25)
    || (
      wadiumPln != null
      && wadiumPln >= 25_000
      && wadiumToContractPct != null
      && wadiumToContractPct >= 4
    )
  ) {
    level = "ŚREDNI";
    note = "Umiarkowany wpływ na gotówkę operacyjną — zaplanuj rezerwę.";
  }

  return { level, wadiumPln, wadiumToContractPct, wadiumToHeadroomPct, note };
}

function computeTeamImpact(
  scale: ContractScale,
  forecastAfter: number,
  freeSlotsBefore: number,
  freeSlotsAfter: number,
  maxConcurrent: number,
): TeamImpact {
  const slotDrop = freeSlotsBefore - freeSlotsAfter;

  if (forecastAfter > 115 || freeSlotsAfter <= 0 || (scale !== "SMALL" && maxConcurrent <= 2)) {
    return {
      level: "WYMAGA REKRUTACJI",
      note: "Brak wolnych slotów produkcyjnych — konieczne wzmocnienie ekipy.",
    };
  }
  if (
    forecastAfter > 100
    || (scale === "STRATEGIC" && freeSlotsAfter <= 1)
    || (scale === "LARGE" && slotDrop >= 2)
  ) {
    return {
      level: "DUŻE OBCIĄŻENIE",
      note: "Zespół pracuje na granicy pojemności — rozważ rozłożenie terminów.",
    };
  }
  if (scale === "SMALL" && forecastAfter <= 85 && slotDrop <= 1) {
    return {
      level: "BRAK WPŁYWU",
      note: "Kontrakt mieści się w obecnej pojemności bez istotnej zmiany obciążenia.",
    };
  }
  return {
    level: "LEKKIE OBCIĄŻENIE",
    note: "Niewielkie obciążenie dodatkowe — obecny zespół powinien obsłużyć kontrakt.",
  };
}

function componentFromDelta(delta: number, maxPositive: number): number {
  return clamp(Math.round(50 + (delta / maxPositive) * 45), 5, 95);
}

function cashFlowComponent(level: CashFlowImpactLevel): number {
  switch (level) {
    case "NISKI":
      return 88;
    case "ŚREDNI":
      return 62;
    case "WYSOKI":
      return 38;
    case "KRYTYCZNY":
      return 12;
  }
}

function teamComponent(level: TeamImpactLevel): number {
  switch (level) {
    case "BRAK WPŁYWU":
      return 90;
    case "LEKKIE OBCIĄŻENIE":
      return 68;
    case "DUŻE OBCIĄŻENIE":
      return 38;
    case "WYMAGA REKRUTACJI":
      return 15;
  }
}

function classifyImpactScore(score: number): ImpactScoreClass {
  if (score >= 90) return "STRATEGIC OPPORTUNITY";
  if (score >= 75) return "HIGH IMPACT";
  if (score >= 55) return "MODERATE IMPACT";
  return "LOW IMPACT";
}

function computeImpactScore(
  healthDelta: number,
  forecastDelta: number,
  scale: ContractScale,
  cashFlow: CashFlowImpact,
  team: TeamImpact,
): ImpactScoreResult {
  const healthComponent = componentFromDelta(healthDelta, 10);
  const forecastComponent = componentFromDelta(forecastDelta, 35);
  const cash = cashFlowComponent(cashFlow.level);
  const teamC = teamComponent(team.level);

  const scaleWeights: Record<ContractScale, [number, number, number, number]> = {
    SMALL: [0.15, 0.15, 0.35, 0.35],
    MEDIUM: [0.25, 0.25, 0.25, 0.25],
    LARGE: [0.3, 0.3, 0.2, 0.2],
    STRATEGIC: [0.35, 0.35, 0.15, 0.15],
  };
  const [wh, wf, wc, wt] = scaleWeights[scale];

  let score = Math.round(
    healthComponent * wh
      + forecastComponent * wf
      + cash * wc
      + teamC * wt,
  );

  if (scale === "STRATEGIC" && healthDelta > 0 && forecastDelta > 15) {
    score = Math.min(100, score + 5);
  }
  if (scale === "SMALL") {
    score = Math.min(score, 72);
  }

  score = clamp(score, 0, 100);
  return {
    score,
    label: classifyImpactScore(score),
    healthComponent,
    forecastComponent,
    cashFlowComponent: cash,
    teamComponent: teamC,
  };
}

function buildRevenueImpact(
  item: TenderPipelineItem,
  profile: TenderCompanyProfile,
): TenderImpactRevenue {
  const swz = item.swzAnalysis ?? null;
  const swzValue = estimatedValuePlnFromItem(item, swz);
  const ourEstimate = item.ourEstimatePln ?? null;
  const wadium = computeWadiumInfo(item, swz, profile.maxWadiumPln);

  let contractValuePln: number | null = null;
  let valueSource: TenderImpactRevenue["valueSource"] = null;

  if (ourEstimate != null) {
    contractValuePln = ourEstimate;
    valueSource = "ourEstimate";
  } else if (swzValue != null) {
    contractValuePln = swzValue;
    valueSource = "swzValue";
  }

  let marginPct: number | null = null;
  if (ourEstimate != null && swzValue != null && swzValue > 0) {
    marginPct = Math.round(Math.max(0, (1 - ourEstimate / swzValue) * 100));
  }

  return {
    contractValuePln,
    valueSource,
    wadiumPln: wadium.amountPln,
    wadiumBlocked: wadium.blocked,
    marginPct,
    displayLabel: contractValuePln != null ? "value" : "Brak wyceny",
  };
}

function tenderReferenceText(item: TenderPipelineItem): string {
  const swz = item.swzAnalysis;
  return [
    item.title,
    item.noticeHtml ? stripHtmlToText(item.noticeHtml) : "",
    swz?.referenceRequirement ?? "",
    swz?.estimatedValueRaw ?? "",
  ].join("\n");
}

function hasReferenceGap(item: TenderPipelineItem, profile: TenderCompanyProfile): boolean {
  const required = extractRequiredReferencePln(tenderReferenceText(item));
  if (required == null) return false;
  return required > profile.referenceExperiencePln && required > profile.totalReferencesPln;
}

function buildRisks(
  bundle: TenderScoringBundle,
  health: CompanyHealthResult,
  forecastAfterPct: number,
  freeSlotsAfter: number,
  cashFlow: CashFlowImpact,
  team: TeamImpact,
  profile: TenderCompanyProfile,
  now: Date,
): ImpactRiskItem[] {
  const item = bundle.item;
  const warnings: ImpactRiskItem[] = [];
  const positives: ImpactRiskItem[] = [];

  const daysLeft = daysUntilTenderDeadline(item.submittingOffersDate, now);
  if (daysLeft != null && daysLeft <= 7) {
    warnings.push({ tone: "warning", text: "krótki termin" });
  }
  if (forecastAfterPct > 100 || team.level === "DUŻE OBCIĄŻENIE") {
    warnings.push({ tone: "warning", text: "przeciążenie" });
  }
  if (hasReferenceGap(item, profile)) {
    warnings.push({ tone: "warning", text: "brak referencji" });
  }
  if (cashFlow.level === "WYSOKI" || cashFlow.level === "KRYTYCZNY") {
    warnings.push({ tone: "warning", text: "wysokie wadium" });
  }
  if (team.level === "WYMAGA REKRUTACJI") {
    warnings.push({ tone: "warning", text: "brak zasobów zespołu" });
  }

  const fit = item.tenderFit;
  if (fit && fit.score >= 60 && fit.blockingIssues.length === 0) {
    positives.push({ tone: "positive", text: "dobra zgodność z profilem" });
  }
  if (health.index >= 70) {
    positives.push({ tone: "positive", text: "wysoki Health Index" });
  }
  if (freeSlotsAfter >= 1 && forecastAfterPct <= 100 && team.level !== "WYMAGA REKRUTACJI") {
    positives.push({ tone: "positive", text: "wolne zasoby" });
  }

  return [...warnings, ...positives].slice(0, 6);
}

function riskLevelFrom(
  forecastAfterPct: number,
  healthDelta: number,
  impactScore: number,
  warnings: number,
): ImpactRiskLevel {
  if (forecastAfterPct > 120 || warnings >= 3 || healthDelta <= -5 || impactScore < 40) return "high";
  if (forecastAfterPct > 100 || warnings >= 2 || healthDelta < 0 || impactScore < 55) return "medium";
  return "low";
}

function buildWorkforceNote(freeBefore: number, freeAfter: number, team: TeamImpact): string {
  if (team.level === "WYMAGA REKRUTACJI") {
    return "Wymagane będzie zwiększenie zasobów.";
  }
  const delta = freeAfter - freeBefore;
  if (freeAfter <= 0) return "Wymagane będzie zwiększenie zasobów.";
  if (delta < 0) {
    return `Po wygraniu pozostanie ${freeAfter} ${freeAfter === 1 ? "wolny slot" : "wolne sloty"}.`;
  }
  if (delta === 0) {
    return `Po wygraniu nadal ${freeAfter} ${freeAfter === 1 ? "wolny slot" : "wolne sloty"} — bez zmiany obciążenia.`;
  }
  return team.note;
}

function resolveRecommendationV2(
  bundle: TenderScoringBundle,
  impactScore: ImpactScoreResult,
  cashFlow: CashFlowImpact,
  team: TeamImpact,
  healthDelta: number,
  forecastAfterPct: number,
): { recommendation: TenderDecision; detail: string[] } {
  const opp = bundle.opportunity.score;
  const strat = bundle.strategic.score;
  const detail: string[] = [];

  if (team.level === "WYMAGA REKRUTACJI" || forecastAfterPct > 120) {
    detail.push("Przeciążenie firmy — brak pojemności operacyjnej.");
    return {
      recommendation: "NO-GO",
      detail: [...detail, "Odpuszczamy lub odkładamy do czasu rekrutacji / zakończenia robót."],
    };
  }

  if (cashFlow.level === "KRYTYCZNY") {
    detail.push("Dobra okazja rynkowa, ale ryzyko płynności finansowej.");
    return {
      recommendation: opp >= 60 ? "HOLD" : "NO-GO",
      detail: [...detail, "Analizuj finansowanie wadium przed startem."],
    };
  }

  if (impactScore.score >= 75 && opp >= 55 && strat >= 50 && cashFlow.level !== "WYSOKI") {
    detail.push("Dobra okazja + pozytywny wpływ na firmę.");
    if (healthDelta > 0) detail.push("Poprawia kondycję finansową i obłożenie.");
    if (forecastAfterPct <= 100) detail.push("Nie powoduje przeciążenia.");
    return { recommendation: "GO", detail };
  }

  if (impactScore.score >= 55 && opp >= 50 && cashFlow.level === "WYSOKI") {
    detail.push("Dobra okazja, ale ryzyko płynności (wadium).");
    return {
      recommendation: "HOLD",
      detail: [...detail, "Zweryfikuj rezerwę gotówki przed złożeniem oferty."],
    };
  }

  if (impactScore.score >= 55 && opp >= 45) {
    detail.push("Umiarkowany wpływ — wymaga decyzji właściciela.");
    if (team.level === "DUŻE OBCIĄŻENIE") {
      detail.push("Duże obciążenie zespołu — rozważ harmonogram.");
    }
    return { recommendation: "HOLD", detail };
  }

  if (impactScore.score < 45 || (opp < 45 && strat < 40)) {
    detail.push("Korzyści nie rekompensują ryzyk tego kontraktu.");
    return { recommendation: "NO-GO", detail };
  }

  return {
    recommendation: bundle.decision,
    detail: ["Wpływ neutralny względem skali firmy — zgodnie ze scoringiem systemowym."],
  };
}

function buildSummary(
  bundle: TenderScoringBundle,
  scale: ContractScale,
  impactScore: ImpactScoreResult,
  recommendation: TenderDecision,
): string {
  const title = bundle.item.title.length > 48
    ? `${bundle.item.title.slice(0, 48)}…`
    : bundle.item.title;
  return `„${title}” (${CONTRACT_SCALE_LABEL_PL[scale]}) — Impact Score ${impactScore.score}/100 (${IMPACT_SCORE_CLASS_PL[impactScore.label]}). Rekomendacja: ${DECISION_LABEL_PL[recommendation]}.`;
}

export function computeTenderImpact(input: TenderImpactInput): TenderImpactResult | null {
  const { bundle, health, healthInput, forecastInput, forecast, profile, growthMode } = input;
  const now = input.now ?? new Date();
  const item = bundle.item;

  const revenueImpact = buildRevenueImpact(item, profile);
  const companyScale = computeCompanyScaleContext(
    revenueImpact.contractValuePln,
    input.jobs,
    healthInput.items,
    profile,
    healthInput.savedWeeks,
    input.marketKpi,
  );
  const contractScale = classifyContractScale(
    revenueImpact.contractValuePln,
    companyScale,
    profile,
  );

  const forecastInputReady = ensureBundleInForecastInput(forecastInput, bundle);
  const beforeScenario =
    input.beforeForecastScenario
    ?? forecast.scenarios.find((s) => s.id === "none")
    ?? computeSingleForecastScenario(forecastInputReady, { scenarioId: "none" });
  const afterScenario = computeSingleForecastScenario(forecastInputReady, {
    customWinTenderIds: [item.id],
  });

  const forecastBefore = horizon90Pct(beforeScenario);
  const rawForecastDelta = horizon90Pct(afterScenario) - forecastBefore;
  const { forecastAfter, forecastDelta } = scaleForecastImpact(
    forecastBefore,
    rawForecastDelta,
    contractScale,
  );

  const kpi = input.marketKpi ?? aggregateMarketKpi(healthInput.items, profile);
  const { healthAfter, healthDelta } = computeHealthImpactV2(
    health.index,
    contractScale,
    forecastAfter,
    health.freeSlots,
    growthMode,
    kpi.overloadIndex,
  );
  const healthBefore = health.index;

  const maxConcurrent = Math.max(forecast.maxConcurrentProjects, 1);
  const slotWeight = { SMALL: 0, MEDIUM: 1, LARGE: 1, STRATEGIC: 2 }[contractScale];
  const freeSlotsBefore = Math.max(0, maxConcurrent - forecast.activeJobsNow);
  const freeSlotsAfter = Math.max(0, freeSlotsBefore - slotWeight);

  const cashFlowImpact = computeCashFlowImpact(
    revenueImpact,
    revenueImpact.contractValuePln,
    profile,
  );
  const teamImpact = computeTeamImpact(
    contractScale,
    forecastAfter,
    freeSlotsBefore,
    freeSlotsAfter,
    maxConcurrent,
  );
  const impactScore = computeImpactScore(
    healthDelta,
    forecastDelta,
    contractScale,
    cashFlowImpact,
    teamImpact,
  );

  const risks = buildRisks(
    bundle,
    health,
    forecastAfter,
    freeSlotsAfter,
    cashFlowImpact,
    teamImpact,
    profile,
    now,
  );
  const warningCount = risks.filter((r) => r.tone === "warning").length;
  const riskLevel = riskLevelFrom(forecastAfter, healthDelta, impactScore.score, warningCount);

  const { recommendation, detail } = resolveRecommendationV2(
    bundle,
    impactScore,
    cashFlowImpact,
    teamImpact,
    healthDelta,
    forecastAfter,
  );

  return {
    tenderId: item.id,
    tenderTitle: item.title,
    revenueImpact,
    contractScale,
    companyScale,
    healthBefore,
    healthAfter,
    healthDelta,
    forecastBefore,
    forecastAfter,
    forecastDelta,
    freeSlotsBefore,
    freeSlotsAfter,
    workforceNote: buildWorkforceNote(freeSlotsBefore, freeSlotsAfter, teamImpact),
    cashFlowImpact,
    teamImpact,
    impactScore,
    riskLevel,
    risks,
    recommendation,
    recommendationLabel: DECISION_LABEL_PL[recommendation],
    summary: buildSummary(bundle, contractScale, impactScore, recommendation),
    recommendationDetail: detail,
  };
}

export function deltaTone(delta: number): "up" | "flat" | "down" {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

export function deltaColorClass(delta: number): string {
  const tone = deltaTone(delta);
  if (tone === "up") return "text-emerald-600 dark:text-emerald-400";
  if (tone === "down") return "text-red-600 dark:text-red-400";
  return "text-amber-600 dark:text-amber-400";
}

export function riskLevelLabel(level: ImpactRiskLevel): string {
  switch (level) {
    case "low":
      return "Niskie";
    case "medium":
      return "Średnie";
    case "high":
      return "Wysokie";
  }
}

export function contractScaleTone(scale: ContractScale): string {
  switch (scale) {
    case "SMALL":
      return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300";
    case "MEDIUM":
      return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "LARGE":
      return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "STRATEGIC":
      return "border-primary/40 bg-primary/15 text-primary";
  }
}

export function cashFlowTone(level: CashFlowImpactLevel): string {
  switch (level) {
    case "NISKI":
      return "text-emerald-700 dark:text-emerald-400";
    case "ŚREDNI":
      return "text-amber-700 dark:text-amber-400";
    case "WYSOKI":
      return "text-orange-700 dark:text-orange-400";
    case "KRYTYCZNY":
      return "text-red-700 dark:text-red-400";
  }
}

export function teamImpactTone(level: TeamImpactLevel): string {
  switch (level) {
    case "BRAK WPŁYWU":
      return "text-emerald-700 dark:text-emerald-400";
    case "LEKKIE OBCIĄŻENIE":
      return "text-blue-700 dark:text-blue-400";
    case "DUŻE OBCIĄŻENIE":
      return "text-orange-700 dark:text-orange-400";
    case "WYMAGA REKRUTACJI":
      return "text-red-700 dark:text-red-400";
  }
}

export function impactScoreTone(score: number): string {
  if (score >= 90) return "text-primary";
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 55) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}
