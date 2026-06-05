/**
 * Tender Center PRO — Kondycja Firmy / Health Index (ETAP 2A).
 */

import type {
  DirectoryEmployee,
  Job,
  WeekEmployee,
  WeekSnapshot,
} from "@/app/app-domain";
import {
  calcWeekEmployee,
  filterProductionActiveDirectory,
  filterProductionWeekEmployees,
  jobTotalCost,
  payrollJobConsistencyAlerts,
  todayFieldWorkStats,
} from "@/app/app-domain";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  computePipelineFunnel,
  isActionableTender,
  isTenderOpenForOffers,
} from "@/lib/tenders-bzp";
import type { TenderCompanyProfile } from "@/lib/tenders-bzp-company";
import { extractRequiredReferencePln } from "@/lib/tenders-bzp-fit";
import { stripHtmlToText } from "@/lib/tenders-bzp-swz";
import { aggregateMarketKpi, type TenderCenterMarketKpi } from "@/lib/tender-center-kpi";
import {
  type GrowthMode,
  healthWeightsForMode,
  type HealthDimensionWeights,
  suggestGrowthMode,
} from "@/lib/tender-center-growth-mode";
import { wmJobsPlannedThisWeek, wmJobsWithOverduePlanned } from "@/lib/job-wm";

export type HealthDimension = "O" | "Z" | "F" | "R" | "D";

export type HealthLabel = "healthy" | "stable" | "strained" | "at_risk";

export const HEALTH_LABEL_PL: Record<HealthLabel, string> = {
  healthy: "Zdrowa",
  stable: "Stabilna",
  strained: "Napięta",
  at_risk: "Ryzyko",
};

export interface CompanyHealthDimensions {
  O: number;
  Z: number;
  F: number;
  R: number;
  D: number;
}

export interface CompanyHealthResult {
  index: number;
  label: HealthLabel;
  dimensions: CompanyHealthDimensions;
  recommendation: string;
  weights: HealthDimensionWeights;
  suggestedGrowthMode: GrowthMode;
  freeSlots: number;
  overloadIndex: number;
}

export interface CompanyHealthInput {
  items: TenderPipelineItem[];
  jobs: Job[];
  directory: DirectoryEmployee[];
  weekEmployees: WeekEmployee[];
  weekFrom: string;
  weekTo: string;
  profile: TenderCompanyProfile;
  growthMode: GrowthMode;
  savedWeeks?: WeekSnapshot[];
  now?: Date;
  /** Precomputed KPI — pomija redundantne aggregateMarketKpi (Performance 2.1A). */
  marketKpi?: TenderCenterMarketKpi;
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
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

function itemHasReferenceGap(item: TenderPipelineItem, profile: TenderCompanyProfile): boolean {
  const requiredPln = extractRequiredReferencePln(tenderReferenceText(item));
  if (requiredPln == null) return false;
  return requiredPln > profile.referenceExperiencePln && requiredPln > profile.totalReferencesPln;
}

function healthLabelFromIndex(index: number): HealthLabel {
  if (index >= 80) return "healthy";
  if (index >= 60) return "stable";
  if (index >= 40) return "strained";
  return "at_risk";
}

function recommendationFor(label: HealthLabel, overloadIndex: number): string {
  if (label === "at_risk") {
    return "Nie startuj nowych ofert — dokończ roboty i odciąż pipeline.";
  }
  if (label === "strained") {
    return overloadIndex >= 1
      ? "Tryb Stabilizacja — max 1 nowa oferta równolegle."
      : "Selekcja oportunistyczna — tylko przetargi o wysokiej trafności.";
  }
  if (label === "stable") {
    return "Utrzymaj tryb Wyważony; unikaj przekraczania limitu równoległych ofert.";
  }
  return "Firma gotowa na tryb Wzrost — rozważ ekspansję portfolio publicznego.";
}

function parseInvoicePln(job: Job): number | null {
  const n = parseFloat(String(job.invoiceAmount || "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function computeOperationsScore(
  jobs: Job[],
  profile: TenderCompanyProfile,
): number {
  const activeJobs = jobs.filter((j) => j.status === "in_progress");
  const maxConcurrent = Math.max(profile.maxConcurrentProjects, 1);
  const capacityUsed = activeJobs.length / maxConcurrent;
  const overdue = wmJobsWithOverduePlanned(jobs).length;
  const overdueRatio = activeJobs.length > 0 ? overdue / activeJobs.length : 0;
  const activeWorkers = Math.max(profile.costModel.activeWorkersOnSite, 1);
  const handoverPressure = wmJobsPlannedThisWeek(jobs).length / Math.max(activeWorkers / 3, 1);

  const allHaveKosztorysDoc = activeJobs.length > 0
    && activeJobs.every((j) => j.documents?.kosztorys === true);

  let score = 100;
  score -= Math.min(40, capacityUsed * 40);
  score -= Math.min(25, overdueRatio * 25);
  score -= Math.min(15, Math.max(0, handoverPressure - 1) * 15);
  if (allHaveKosztorysDoc) score += 5;
  return clamp(Math.round(score), 0, 100);
}

function computeWorkforceScore(
  jobs: Job[],
  directory: DirectoryEmployee[],
  weekEmployees: WeekEmployee[],
  weekFrom: string,
  weekTo: string,
  profile: TenderCompanyProfile,
  now: Date,
): { score: number; freeSlots: number } {
  const productionWeek = filterProductionWeekEmployees(weekEmployees, directory);
  const totalHours = productionWeek.reduce((s, e) => s + calcWeekEmployee(e).totalHours, 0);
  const capacityHours = Math.max(profile.costModel.activeWorkersOnSite, 1) * 8 * 5;
  const utilization = totalHours / capacityHours;

  const consistencyPenalty = payrollJobConsistencyAlerts(
    productionWeek,
    jobs,
    weekFrom,
    weekTo,
    directory,
  ).length * 8;

  const todayIso = now.toISOString().slice(0, 10);
  const todayStats = todayFieldWorkStats(jobs, todayIso, directory, productionWeek, weekFrom);
  const freeSlots = Math.max(0, profile.costModel.activeWorkersOnSite - todayStats.people);

  let score = 100;
  score -= Math.min(30, Math.max(0, utilization - 0.85) * 100);
  score -= Math.min(25, Math.max(0, 0.5 - utilization) * 50);
  score -= Math.min(25, consistencyPenalty);
  score += Math.min(10, freeSlots * 3);
  return { score: clamp(Math.round(score), 0, 100), freeSlots };
}

function computeFinancialScore(
  items: TenderPipelineItem[],
  jobs: Job[],
  profile: TenderCompanyProfile,
  marketKpi?: TenderCenterMarketKpi,
): number {
  const kpi = marketKpi ?? aggregateMarketKpi(items, profile);
  const completed = jobs.filter((j) => j.status === "completed");
  const margins: number[] = [];
  for (const j of completed) {
    const inv = parseInvoicePln(j);
    const cost = jobTotalCost(j);
    if (inv != null && inv > 0 && cost > 0) {
      margins.push((inv - cost) / inv);
    }
  }
  const marginProxy = margins.length > 0
    ? margins.reduce((a, b) => a + b, 0) / margins.length
    : 0;

  let atRiskPln = 0;
  const now = new Date();
  for (const item of items) {
    if (!isTenderOpenForOffers(item.submittingOffersDate, now)) continue;
    if (item.status === "ignored" || item.status === "won" || item.status === "lost") continue;
    const d = item.submittingOffersDate ? new Date(item.submittingOffersDate).getTime() : NaN;
    if (!Number.isFinite(d)) continue;
    const days = Math.ceil((d - now.getTime()) / 86400000);
    if (days >= 0 && days <= 7 && item.ourEstimatePln == null) {
      const est = item.swzAnalysis?.estimatedValuePln;
      if (est != null) atRiskPln += est;
    }
  }

  const pendingInvoices = jobs.filter((j) => j.invoiceStatus === "pending").length;

  let score = 100;
  if (profile.maxWadiumPln > 0) {
    score -= Math.min(25, (kpi.wadiumRequiredPln / profile.maxWadiumPln) * 25);
  }
  score -= Math.min(20, (atRiskPln / 500_000) * 20);
  score += Math.min(20, marginProxy * 100);
  if (pendingInvoices > 3) score -= 10;
  return clamp(Math.round(score), 0, 100);
}

function computeMarketScore(items: TenderPipelineItem[], profile: TenderCompanyProfile): number {
  const funnel = computePipelineFunnel(items);
  const open = items.filter((i) => isTenderOpenForOffers(i.submittingOffersDate));
  const actionable = items.filter((i) => isActionableTender(i)).length;
  const marketCoverage = open.length > 0 ? actionable / open.length : 0;
  const withFit = open.filter((i) => i.tenderFit != null).length;
  const analysisFreshness = open.length > 0 ? withFit / open.length : 0;

  let referenceGapCount = 0;
  for (const item of open) {
    if (itemHasReferenceGap(item, profile)) referenceGapCount += 1;
  }

  let score = 40;
  score += Math.min(25, (funnel.winRate ?? 50) * 0.25);
  score += Math.min(20, marketCoverage * 20);
  score += Math.min(15, analysisFreshness * 15);
  score -= Math.min(20, referenceGapCount * 4);
  return clamp(Math.round(score), 0, 100);
}

function computeExperienceScore(
  items: TenderPipelineItem[],
  profile: TenderCompanyProfile,
  savedWeeks: WeekSnapshot[] | undefined,
  now: Date,
): number {
  const refStrength = Math.min(1, profile.totalReferencesPln / 5_000_000);
  const year = now.getFullYear();
  const winsYtd = items.filter((i) => {
    if (i.status === "won" || i.awardResult?.isUs) {
      const d = i.awardResult?.fetchedAt || i.updatedAt || i.addedAt;
      return d.startsWith(String(year));
    }
    return false;
  }).length;

  let archiveGrowthPct = 0;
  if (savedWeeks && savedWeeks.length > 0) {
    const hoursInYear = (y: number) => savedWeeks
      .filter((w) => w.weekFrom.startsWith(String(y)))
      .reduce((s, w) => s + (w.totalHours ?? 0), 0);
    const cur = hoursInYear(year);
    const prev = hoursInYear(year - 1);
    if (prev > 0 && cur > 0) archiveGrowthPct = ((cur - prev) / prev) * 100;
  }

  let score = 50;
  score += refStrength * 25;
  score += Math.min(15, winsYtd * 5);
  score += Math.min(10, archiveGrowthPct * 0.1);
  return clamp(Math.round(score), 0, 100);
}

export function computeCompanyHealth(input: CompanyHealthInput): CompanyHealthResult {
  const now = input.now ?? new Date();
  const weights = healthWeightsForMode(input.growthMode);

  const O = computeOperationsScore(input.jobs, input.profile);
  const { score: Z, freeSlots } = computeWorkforceScore(
    input.jobs,
    input.directory,
    input.weekEmployees,
    input.weekFrom,
    input.weekTo,
    input.profile,
    now,
  );
  const F = computeFinancialScore(input.items, input.jobs, input.profile, input.marketKpi);
  const R = computeMarketScore(input.items, input.profile);
  const D = computeExperienceScore(input.items, input.profile, input.savedWeeks, now);

  const index = Math.round(
    O * weights.O + Z * weights.Z + F * weights.F + R * weights.R + D * weights.D,
  );
  const clampedIndex = clamp(index, 0, 100);
  const label = healthLabelFromIndex(clampedIndex);

  const kpi = input.marketKpi ?? aggregateMarketKpi(input.items, input.profile);
  const wmOverdueCount = wmJobsWithOverduePlanned(input.jobs).length;

  const suggestedGrowthMode = suggestGrowthMode({
    healthIndex: clampedIndex,
    overloadIndex: kpi.overloadIndex,
    wmOverdueCount,
    wadiumHeadroomPln: kpi.wadiumHeadroomPln,
    winRate: kpi.winRate,
    freeSlots,
  });

  return {
    index: clampedIndex,
    label,
    dimensions: { O, Z, F, R, D },
    recommendation: recommendationFor(label, kpi.overloadIndex),
    weights,
    suggestedGrowthMode,
    freeSlots,
    overloadIndex: kpi.overloadIndex,
  };
}

/** Aktywni pracownicy produkcyjni (bez kont testowych). */
export function countActiveProductionWorkers(directory: DirectoryEmployee[]): number {
  return filterProductionActiveDirectory(directory).length;
}
