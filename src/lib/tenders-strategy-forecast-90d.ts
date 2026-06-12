/**
 * Tender Center PRO — prognoza obłożenia 90 dni (ETAP 3B).
 * Runtime only — bez KV i synchronizacji.
 */

import type {
  DirectoryEmployee,
  Job,
  WeekEmployee,
  WeekSnapshot,
} from "@/app/app-domain";
import {
  filterProductionWeekEmployees,
  todayFieldWorkStats,
} from "@/app/app-domain";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderCompanyProfile } from "@/lib/tenders-bzp-company";
import type { TenderScoringBundle } from "@/lib/tenders-strategy-decision";
import type { OwnerDecisionsStore } from "@/lib/tenders-strategy-owner-decisions";
import { loadOwnerDecisions } from "@/lib/tenders-strategy-owner-decisions";

export type ForecastScenarioId = "none" | "all_go" | "half_go" | "custom";

export type ForecastRiskLevel =
  | "BRAK_ROBOT"
  | "NISKIE_OBCIAZENIE"
  | "STABILNIE"
  | "PRZECIAZENIE"
  | "BRAK_LUDZI";

export const FORECAST_RISK_LABEL_PL: Record<ForecastRiskLevel, string> = {
  BRAK_ROBOT: "Brak robót",
  NISKIE_OBCIAZENIE: "Niskie obciążenie",
  STABILNIE: "Stabilnie",
  PRZECIAZENIE: "Przeciążenie",
  BRAK_LUDZI: "Brak ludzi",
};

export const FORECAST_SCENARIO_LABEL_PL: Record<ForecastScenarioId, string> = {
  none: "A — nic nie wygrywamy",
  all_go: "B — wygrywamy wszystkie GO",
  half_go: "C — wygrywamy 50% GO",
  custom: "Własny wybór GO",
};

export interface SimulatedJobSpan {
  id: string;
  label: string;
  startIso: string;
  endIso: string;
  source: "active" | "won_go";
}

export interface ForecastHorizon {
  days: 30 | 60 | 90;
  utilizationPct: number;
  activeJobs: number;
  risk: ForecastRiskLevel;
}

export interface ForecastScenarioResult {
  id: ForecastScenarioId;
  label: string;
  horizons: ForecastHorizon[];
  alert: string | null;
}

export interface Forecast90DaysResult {
  asOf: string;
  activeJobsNow: number;
  maxConcurrentProjects: number;
  activeWorkersOnSite: number;
  freeSlotsToday: number;
  avgWeeklyHoursArchive: number | null;
  endingJobs: { id: string; label: string; endIso: string }[];
  simulatedWinsCount: number;
  scenarios: ForecastScenarioResult[];
}

const DEFAULT_JOB_DURATION_DAYS = 90;
const WIN_MOBILIZATION_DAYS = 14;
const DEFAULT_WON_DURATION_DAYS = 75;

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseIsoDate(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00.000Z` : iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function jobLabel(job: Job): string {
  const addr = job.address?.trim() || "Robota";
  return addr.length > 48 ? `${addr.slice(0, 48)}…` : addr;
}

function jobStartDate(job: Job, now: Date): Date {
  return parseIsoDate(job.startDate) ?? now;
}

function jobEndDate(job: Job, now: Date): Date {
  const planned = parseIsoDate(job.plannedHandoverDate);
  if (planned) return planned;
  const end = parseIsoDate(job.endDate);
  if (end) return end;
  const start = jobStartDate(job, now);
  return addDays(start, DEFAULT_JOB_DURATION_DAYS);
}

function activeJobSpans(jobs: Job[], now: Date): SimulatedJobSpan[] {
  return jobs
    .filter((j) => j.status === "in_progress")
    .map((j) => ({
      id: j.id,
      label: jobLabel(j),
      startIso: toIsoDate(jobStartDate(j, now)),
      endIso: toIsoDate(jobEndDate(j, now)),
      source: "active" as const,
    }));
}

function wonDurationDays(item: TenderPipelineItem): number {
  const d = item.swzAnalysis?.implementationDays;
  if (d != null && d >= 14 && d <= 365) return d;
  return DEFAULT_WON_DURATION_DAYS;
}

function wonJobSpans(
  items: TenderPipelineItem[],
  now: Date,
): SimulatedJobSpan[] {
  const today = toIsoDate(now);
  return items.map((item) => {
    const offerEnd = parseIsoDate(item.submittingOffersDate);
    const mobilizeFrom = offerEnd && offerEnd > now
      ? addDays(offerEnd, WIN_MOBILIZATION_DAYS)
      : addDays(now, WIN_MOBILIZATION_DAYS);
    const start = mobilizeFrom;
    const end = addDays(start, wonDurationDays(item));
    return {
      id: `won-${item.id}`,
      label: item.title.length > 48 ? `${item.title.slice(0, 48)}…` : item.title,
      startIso: toIsoDate(start < now ? now : start),
      endIso: toIsoDate(end),
      source: "won_go" as const,
    };
  });
}

function countActiveOnDate(spans: SimulatedJobSpan[], date: Date): number {
  const iso = toIsoDate(date);
  return spans.filter((s) => s.startIso <= iso && s.endIso >= iso).length;
}

function utilizationPct(active: number, maxConcurrent: number): number {
  const cap = Math.max(maxConcurrent, 1);
  return Math.round((active / cap) * 100);
}

function riskFromUtilization(
  pct: number,
  freeSlots: number,
): ForecastRiskLevel {
  if (pct < 25) return "BRAK_ROBOT";
  if (pct < 50) return "NISKIE_OBCIAZENIE";
  if (pct <= 100) return "STABILNIE";
  if (pct > 120 || (pct > 100 && freeSlots <= 0)) return "BRAK_LUDZI";
  return "PRZECIAZENIE";
}

function alertForScenario(horizons: ForecastHorizon[]): string | null {
  const h90 = horizons.find((h) => h.days === 90);
  const h30 = horizons.find((h) => h.days === 30);
  const worst = horizons.reduce((a, b) => (a.utilizationPct >= b.utilizationPct ? a : b));

  if (horizons.some((h) => h.risk === "BRAK_ROBOT" || h.risk === "NISKIE_OBCIAZENIE")) {
    return "Potrzebne nowe kontrakty.";
  }
  if (worst.utilizationPct >= 120 || horizons.some((h) => h.risk === "BRAK_LUDZI")) {
    return "Brakuje zasobów. Rozważ zatrudnienie.";
  }
  if (worst.utilizationPct > 100 || worst.risk === "PRZECIAZENIE") {
    return "Ryzyko przeciążenia — ogranicz nowe oferty lub rozłóż terminy.";
  }
  if (h90 && h90.utilizationPct >= 50 && h90.utilizationPct <= 100) {
    return null;
  }
  if (h30 && h30.utilizationPct < 50) {
    return "Potrzebne nowe kontrakty.";
  }
  return null;
}

function avgWeeklyHoursFromArchive(savedWeeks: WeekSnapshot[]): number | null {
  const weeks = savedWeeks.filter((w) => !w.backlog).slice(-12);
  if (weeks.length === 0) return null;
  const sum = weeks.reduce((s, w) => s + (w.totalHours ?? 0), 0);
  return Math.round(sum / weeks.length);
}

/** Kandydaci GO: decyzja właściciela GO lub brak decyzji przy systemie GO. */
export function collectGoCandidates(
  bundles: TenderScoringBundle[],
  ownerStore: OwnerDecisionsStore = loadOwnerDecisions(),
): TenderScoringBundle[] {
  return bundles.filter((b) => {
    const owner = ownerStore.byId[b.item.id];
    if (owner?.decision === "GO") return true;
    if (owner?.decision === "NO-GO" || owner?.decision === "HOLD") return false;
    return b.decision === "GO";
  });
}

function buildScenarioFromWonItems(
  wonItems: TenderPipelineItem[],
  baseSpans: SimulatedJobSpan[],
  now: Date,
  maxConcurrent: number,
  freeSlots: number,
  meta: { id: ForecastScenarioId; label: string },
): ForecastScenarioResult {
  const spans = [...baseSpans, ...wonJobSpans(wonItems, now)];
  const horizons: ForecastHorizon[] = ([30, 60, 90] as const).map((days) => {
    const target = addDays(now, days);
    const active = countActiveOnDate(spans, target);
    const pct = utilizationPct(active, maxConcurrent);
    return {
      days,
      utilizationPct: pct,
      activeJobs: active,
      risk: riskFromUtilization(pct, freeSlots),
    };
  });

  return {
    id: meta.id,
    label: meta.label,
    horizons,
    alert: alertForScenario(horizons),
  };
}

function resolveWonItems(
  id: ForecastScenarioId,
  goItems: TenderPipelineItem[],
): TenderPipelineItem[] {
  if (id === "all_go") return goItems;
  if (id === "half_go") return goItems.slice(0, Math.ceil(goItems.length * 0.5));
  if (id === "custom") return goItems;
  return [];
}

function buildScenario(
  id: ForecastScenarioId,
  baseSpans: SimulatedJobSpan[],
  goItems: TenderPipelineItem[],
  now: Date,
  maxConcurrent: number,
  freeSlots: number,
): ForecastScenarioResult {
  const wonItems = resolveWonItems(id, goItems);
  return buildScenarioFromWonItems(
    wonItems,
    baseSpans,
    now,
    maxConcurrent,
    freeSlots,
    { id, label: FORECAST_SCENARIO_LABEL_PL[id] },
  );
}

export interface Forecast90DaysInput {
  jobs: Job[];
  savedWeeks: WeekSnapshot[];
  weekEmployees: WeekEmployee[];
  directory: DirectoryEmployee[];
  weekFrom: string;
  weekTo: string;
  profile: TenderCompanyProfile;
  goBundles: TenderScoringBundle[];
  ownerStore?: OwnerDecisionsStore;
  now?: Date;
}

interface ForecastRunContext {
  now: Date;
  maxConcurrent: number;
  freeSlots: number;
  baseSpans: SimulatedJobSpan[];
  goItems: TenderPipelineItem[];
}

function prepareForecastRunContext(input: Forecast90DaysInput): ForecastRunContext {
  const now = input.now ?? new Date();
  const maxConcurrent = Math.max(input.profile.maxConcurrentProjects, 1);
  const ownerStore = input.ownerStore ?? loadOwnerDecisions();
  const productionWeek = filterProductionWeekEmployees(input.weekEmployees, input.directory);
  const todayIso = toIsoDate(now);
  const todayStats = todayFieldWorkStats(
    input.jobs,
    todayIso,
    input.directory,
    productionWeek,
    input.weekFrom,
  );
  const freeSlots = Math.max(
    0,
    input.profile.costModel.activeWorkersOnSite - todayStats.people,
  );
  const baseSpans = activeJobSpans(input.jobs, now);
  const goItems = collectGoCandidates(input.goBundles, ownerStore)
    .sort((a, b) => b.opportunity.score - a.opportunity.score)
    .map((b) => b.item);
  return { now, maxConcurrent, freeSlots, baseSpans, goItems };
}

export interface ForecastScenarioRunOptions {
  scenarioId?: ForecastScenarioId;
  maxConcurrentDelta?: number;
  /** ETAP 6B — wygrane GO = dokładnie te id (z goCandidates, kolejność z rankingu). */
  customWinTenderIds?: string[];
}

/** Pojedynczy scenariusz prognozy — używane przez moduł Co jeśli (ETAP 6A/6B). */
export function computeSingleForecastScenario(
  input: Forecast90DaysInput,
  options: ForecastScenarioRunOptions,
): ForecastScenarioResult {
  const ctx = prepareForecastRunContext(input);
  const maxConcurrent = Math.max(
    1,
    ctx.maxConcurrent + (options.maxConcurrentDelta ?? 0),
  );

  if (options.customWinTenderIds != null) {
    const idSet = new Set(options.customWinTenderIds);
    const wonItems = ctx.goItems.filter((i) => idSet.has(i.id));
    const n = wonItems.length;
    const total = ctx.goItems.length;
    return buildScenarioFromWonItems(
      wonItems,
      ctx.baseSpans,
      ctx.now,
      maxConcurrent,
      ctx.freeSlots,
      {
        id: "custom",
        label: n === 0
          ? "Własny — brak wygranych GO"
          : `Własny — ${n} z ${total} GO`,
      },
    );
  }

  const scenarioId = options.scenarioId ?? "half_go";
  return buildScenario(
    scenarioId,
    ctx.baseSpans,
    ctx.goItems,
    ctx.now,
    maxConcurrent,
    ctx.freeSlots,
  );
}

export function computeForecast90Days(input: Forecast90DaysInput): Forecast90DaysResult {
  const ctx = prepareForecastRunContext(input);
  const now = ctx.now;
  const maxConcurrent = ctx.maxConcurrent;

  const endingJobs = [...ctx.baseSpans]
    .sort((a, b) => a.endIso.localeCompare(b.endIso))
    .slice(0, 6)
    .map((s) => ({ id: s.id, label: s.label, endIso: s.endIso }));

  const scenarios: ForecastScenarioResult[] = (
    ["none", "all_go", "half_go"] as ForecastScenarioId[]
  ).map((id) =>
    buildScenario(id, ctx.baseSpans, ctx.goItems, now, maxConcurrent, ctx.freeSlots),
  );

  return {
    asOf: now.toISOString(),
    activeJobsNow: ctx.baseSpans.length,
    maxConcurrentProjects: maxConcurrent,
    activeWorkersOnSite: input.profile.costModel.activeWorkersOnSite,
    freeSlotsToday: ctx.freeSlots,
    avgWeeklyHoursArchive: avgWeeklyHoursFromArchive(input.savedWeeks),
    endingJobs,
    simulatedWinsCount: ctx.goItems.length,
    scenarios,
  };
}

/** Scenariusz C (50% GO) — domyślny do skróconego podsumowania UI. */
export function primaryForecastScenario(result: Forecast90DaysResult): ForecastScenarioResult {
  return result.scenarios.find((s) => s.id === "half_go") ?? result.scenarios[0];
}

export function riskTone(risk: ForecastRiskLevel): string {
  switch (risk) {
    case "BRAK_ROBOT":
    case "NISKIE_OBCIAZENIE":
      return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25";
    case "STABILNIE":
      return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25";
    case "PRZECIAZENIE":
      return "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/25";
    case "BRAK_LUDZI":
      return "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/25";
  }
}

export function utilizationBarTone(pct: number): string {
  if (pct < 50) return "bg-amber-500";
  if (pct <= 100) return "bg-emerald-500";
  if (pct <= 120) return "bg-orange-500";
  return "bg-red-500";
}
