/**
 * Hero DZIŚ — unified action ranker for Admin Dashboard (20.7C.2A).
 * Lib-only foundation: types, mappers, ranker. No UI.
 */

import type {
  DirectoryEmployee,
  Job,
  PayrollJobConsistencyAlert,
  WeekEmployee,
  WeekSnapshot,
} from "@/app/app-domain";
import {
  extraCostStatus,
  jobDaysSinceStart,
  jobWorkerReports,
  payrollJobConsistencyAlerts,
  reportNeedsAdminAttention,
} from "@/app/app-domain";
import type { EmployeeLeave } from "@/lib/employee-leaves";
import { isMediaAttachmentAvailable } from "@/lib/media-filter";
import {
  buildReadyNoDateAlerts,
  type InspectorDashboardJob,
} from "@/lib/inspector-dashboard";
import {
  getAdminJobNotesSeenAt,
  getUnseenInspectorFeed,
} from "@/lib/inspector-stats";
import { jobMissingRequiredDocs, jobMatchesListFilter } from "@/lib/job-list-status";
import { DOC_LABELS } from "@/lib/job-documents";
import {
  fmtPlannedHandover,
  jobsWithInspectorNotesNeedingAdmin,
  wmJobsPlannedThisWeek,
  wmJobsWithOverduePlanned,
} from "@/lib/job-wm";
import { getPayrollClosingWeekRange, getPayrollWeekRange } from "@/lib/payroll-cycle";
import { listPayrollRolloverBlockers } from "@/lib/payroll-rollover";
import {
  computeRecoverableChargesAlerts,
  fmtRecoverableAmount,
  type RecoverableCharge,
} from "@/lib/recoverable-charges";
import type {
  ActionCenterResult,
  ActionCategory,
  OwnerActionItem,
} from "@/lib/tender-center-action-center";
import type { ActionPriority } from "@/lib/tender-center-action-center";
import type { SummaryTone } from "@/lib/tender-center-morning-briefing";
import type { CompanyHealthResult } from "@/lib/tender-center-health";
import { primaryForecastScenario, type Forecast90DaysResult } from "@/lib/tender-center-forecast-90d";
import type { FinancialCapacityResult } from "@/lib/tender-center-financial-capacity";

export type HeroTodayPriority = ActionPriority;

export type HeroTodayDomain =
  | "jobs"
  | "documents"
  | "payroll"
  | "recoverable"
  | "tenders"
  | "inspector"
  | "planning";

export type HeroTodayNavTarget =
  | "jobs"
  | "payroll"
  | "inspector"
  | "recoverablecharges"
  | "schedule"
  | "archive"
  | "directory"
  | "tenders";

export interface HeroTodayItem {
  id: string;
  priority: HeroTodayPriority;
  domain: HeroTodayDomain;
  title: string;
  subtitle: string;
  recommendedAction: string;
  navTarget?: HeroTodayNavTarget;
  jobId?: string;
  tenderId?: string;
  chargeId?: string;
  payrollEmpId?: string;
  sourceIds: string[];
  /** Ranking helper — higher sorts first within same priority. */
  urgency?: number;
  /** Days until deadline; lower sorts first. Null = no deadline pressure. */
  deadlineDays?: number | null;
  /** Dedupe group key — items with same key merge into one Hero row. */
  mergeKey?: string;
}

export interface HeroTodayResult {
  items: HeroTodayItem[];
  urgentCount: number;
  criticalCount: number;
  highCount: number;
  summaryTone: SummaryTone;
  headline: string;
}

export interface OperationalAlertsInput {
  jobs: Job[];
  weekEmployees: WeekEmployee[];
  weekFrom: string;
  weekTo: string;
  directory: DirectoryEmployee[];
  savedWeeks: WeekSnapshot[];
  employeeLeaves?: EmployeeLeave[];
  recoverableCharges?: RecoverableCharge[];
  adminUserId?: string;
  now?: Date;
}

export interface HeroTodayInput {
  operational: OperationalAlertsInput;
  actionCenter?: ActionCenterResult | null;
  morningBriefingTone?: SummaryTone | null;
  health?: CompanyHealthResult | null;
  financialCapacity?: FinancialCapacityResult | null;
  forecast?: Forecast90DaysResult | null;
  now?: Date;
}

export const HERO_TODAY_MAX_ITEMS = 5;

const PRIORITY_RANK: Record<HeroTodayPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const BASE_URGENCY: Record<HeroTodayPriority, number> = {
  CRITICAL: 2000,
  HIGH: 1500,
  MEDIUM: 1000,
  LOW: 500,
};

/** Canonical merge groups per HERO-DZIS-PLAN-20.7C.2 */
export const HERO_MERGE_WM_OVERDUE = "wm-overdue";

function jobAddress(job: Job): string {
  const base = job.address || "Bez adresu";
  return job.flatNumber ? `${base} · m.${job.flatNumber}` : base;
}

function parseDeadlineDaysFromTitle(title: string): number | null {
  const m = title.match(/za (\d+) dni/i);
  if (m) return parseInt(m[1], 10);
  if (/termin dziś/i.test(title)) return 0;
  if (/termin jutro/i.test(title)) return 1;
  if (/termin minął/i.test(title) || /minął/i.test(title)) return -1;
  return null;
}

function inferOwnerActionMergeKey(action: OwnerActionItem): string | undefined {
  if (action.id === "alert-wm-overdue" || action.id.includes("wm-overdue")) {
    return HERO_MERGE_WM_OVERDUE;
  }
  if (action.id.startsWith("overdue-")) return HERO_MERGE_WM_OVERDUE;
  return undefined;
}

function inferOwnerActionSourceIds(action: OwnerActionItem): string[] {
  const ids: string[] = [];
  if (action.id === "alert-wm-overdue") ids.push("T10");
  if (action.id.startsWith("radar-deadline-3d")) ids.push("T01");
  if (action.id.startsWith("radar-deadline-7d")) ids.push("T02");
  if (action.id.startsWith("radar-preparing")) ids.push("T03");
  if (action.id.startsWith("won-realization-create")) ids.push("T04");
  if (action.id.startsWith("won-realization-open")) ids.push("T05");
  if (action.id.startsWith("owner-undecided-go")) ids.push("T06");
  if (action.id.startsWith("owner-hold-vs-system-go")) ids.push("T07");
  if (action.id.startsWith("health-critical")) ids.push("C01");
  if (action.id.startsWith("health-below-60")) ids.push("C02");
  if (action.id.startsWith("health-overload")) ids.push("C03");
  if (action.id.startsWith("health-no-free-slots")) ids.push("C04");
  if (action.id.startsWith("forecast-30-critical")) ids.push("C05");
  if (action.id.startsWith("forecast-60-overload")) ids.push("C06");
  if (action.id.startsWith("forecast-90")) ids.push("C07");
  if (action.id === "capacity-one-contract") ids.push("C09");
  if (ids.length === 0) ids.push(`AC:${action.id}`);
  return ids;
}

function mapCategoryToDomain(category: ActionCategory, action: OwnerActionItem): HeroTodayDomain {
  if (action.tenderId) return "tenders";
  switch (category) {
    case "TENDERS":
      return "tenders";
    case "FINANCE":
      return action.id.includes("recoverable") ? "recoverable" : "payroll";
    case "STAFF":
      return "planning";
    case "PLANNING":
      return "planning";
    case "BUSINESS":
      return action.id.includes("won") ? "tenders" : "jobs";
    default:
      return "jobs";
  }
}

function domainDefaultNav(domain: HeroTodayDomain): HeroTodayNavTarget | undefined {
  switch (domain) {
    case "jobs":
      return "jobs";
    case "documents":
      return "jobs";
    case "payroll":
      return "payroll";
    case "recoverable":
      return "recoverablecharges";
    case "tenders":
      return "tenders";
    case "inspector":
      return "inspector";
    case "planning":
      return "jobs";
    default:
      return undefined;
  }
}

/** Maps Tender Center Action Center item → Hero row (transform only). */
export function mapOwnerActionToHeroItem(action: OwnerActionItem): HeroTodayItem {
  const domain = mapCategoryToDomain(action.category, action);
  const deadlineDays = parseDeadlineDaysFromTitle(action.title);
  const urgency =
    BASE_URGENCY[action.priority]
    + (deadlineDays != null ? Math.max(0, 100 - deadlineDays * 15) : 0);

  return {
    id: `hero-ac-${action.id}`,
    priority: action.priority,
    domain,
    title: action.title,
    subtitle: action.description,
    recommendedAction: action.recommendedAction,
    navTarget: action.tenderId ? "tenders" : domainDefaultNav(domain),
    tenderId: action.tenderId,
    sourceIds: inferOwnerActionSourceIds(action),
    urgency,
    deadlineDays,
    mergeKey: inferOwnerActionMergeKey(action),
  };
}

function makeHeroItem(
  partial: Omit<HeroTodayItem, "sourceIds"> & { sourceIds?: string[] },
): HeroTodayItem {
  return {
    ...partial,
    sourceIds: partial.sourceIds ?? [],
    subtitle: partial.subtitle ?? "",
  };
}

/** Maps operational dashboard signals → Hero rows (transform only). */
export function mapOperationalAlertsToHeroItems(input: OperationalAlertsInput): HeroTodayItem[] {
  const now = input.now ?? new Date();
  const items: HeroTodayItem[] = [];
  const jobs = input.jobs;
  const weekEmployees = input.weekEmployees;
  const { weekFrom, weekTo, directory, savedWeeks } = input;
  const employeeLeaves = input.employeeLeaves ?? [];
  const recoverableCharges = input.recoverableCharges ?? [];

  const wmOverdue = wmJobsWithOverduePlanned(jobs);
  if (wmOverdue.length > 0) {
    const top = wmOverdue[0];
    items.push(
      makeHeroItem({
        id: "hero-wm-overdue",
        mergeKey: HERO_MERGE_WM_OVERDUE,
        priority: "CRITICAL",
        domain: "jobs",
        title:
          wmOverdue.length === 1
            ? "WM — termin odbioru minął"
            : `WM — ${wmOverdue.length} roboty po terminie odbioru`,
        subtitle: jobAddress(top),
        recommendedAction: "Uporządkuj terminy odbiorów WM natychmiast.",
        navTarget: "jobs",
        jobId: top.id,
        sourceIds: ["J01"],
        urgency: 2100,
        deadlineDays: -1,
      }),
    );
  }

  const wmThisWeek = wmJobsPlannedThisWeek(jobs);
  if (wmThisWeek.length > 0) {
    const top = wmThisWeek[0];
    items.push(
      makeHeroItem({
        id: "hero-wm-this-week",
        mergeKey: "wm-this-week",
        priority: "HIGH",
        domain: "jobs",
        title:
          wmThisWeek.length === 1
            ? "WM — odbiór w tym tygodniu"
            : `WM — ${wmThisWeek.length} odbiorów w tym tygodniu`,
        subtitle: `${jobAddress(top)} · ${fmtPlannedHandover(top.plannedHandoverDate || "")}`,
        recommendedAction: "Potwierdź gotowę i zaplanuj odbiór z WM.",
        navTarget: "jobs",
        jobId: top.id,
        sourceIds: ["J02"],
        urgency: 1600,
        deadlineDays: 7,
      }),
    );
  }

  const handoverJobs = jobs.filter((j) => jobMatchesListFilter(j, "handover"));
  if (handoverJobs.length > 0) {
    const top = handoverJobs[0];
    items.push(
      makeHeroItem({
        id: "hero-handover",
        mergeKey: "handover-jobs",
        priority: "HIGH",
        domain: "jobs",
        title:
          handoverJobs.length === 1
            ? "Robota do odbioru"
            : `${handoverJobs.length} roboty do odbioru`,
        subtitle: jobAddress(top),
        recommendedAction: "Sprawdź dokumenty i ustaw termin odbioru.",
        navTarget: "jobs",
        jobId: top.id,
        sourceIds: ["J03"],
        urgency: 1550,
      }),
    );
  }

  const readyNoDate = buildReadyNoDateAlerts(jobs as InspectorDashboardJob[]);
  if (readyNoDate.length > 0) {
    const top = readyNoDate[0].job;
    items.push(
      makeHeroItem({
        id: "hero-ready-no-date",
        mergeKey: "ready-no-handover-date",
        priority: "HIGH",
        domain: "jobs",
        title:
          readyNoDate.length === 1
            ? "Gotowa do odbioru — brak daty"
            : `${readyNoDate.length} roboty gotowe bez daty odbioru`,
        subtitle: jobAddress(top),
        recommendedAction: "Ustaw planowany termin odbioru WM.",
        navTarget: "jobs",
        jobId: top.id,
        sourceIds: ["J04"],
        urgency: 1520,
      }),
    );
  }

  const jobsMissingDocs = jobs.filter(
    (j) => j.status === "in_progress" && jobMissingRequiredDocs(j).length > 0,
  );
  if (jobsMissingDocs.length > 0) {
    const sorted = [...jobsMissingDocs].sort((a, b) => {
      const staleA = jobDaysSinceStart(a) >= 7 ? 1 : 0;
      const staleB = jobDaysSinceStart(b) >= 7 ? 1 : 0;
      if (staleB !== staleA) return staleB - staleA;
      return jobMissingRequiredDocs(b).length - jobMissingRequiredDocs(a).length;
    });
    const top = sorted[0];
    const missing = jobMissingRequiredDocs(top);
    const stale = jobDaysSinceStart(top) >= 7;
    items.push(
      makeHeroItem({
        id: "hero-missing-docs",
        mergeKey: "missing-docs",
        priority: stale ? "HIGH" : "MEDIUM",
        domain: "documents",
        title:
          jobsMissingDocs.length === 1
            ? "Braki dokumentów na robocie"
            : `${jobsMissingDocs.length} roboty z brakami dokumentów`,
        subtitle: `${jobAddress(top)} · brakuje: ${missing.map((d) => DOC_LABELS[d]).slice(0, 3).join(", ")}`,
        recommendedAction: "Oznacz odebrane dokumenty lub uzupełnij braki.",
        navTarget: "jobs",
        jobId: top.id,
        sourceIds: stale ? ["D01", "D02"] : ["D01"],
        urgency: stale ? 1580 : 1100,
      }),
    );
  }

  const pendingReports = jobs
    .filter((j) => j.status === "in_progress")
    .flatMap((j) =>
      jobWorkerReports(j)
        .filter((r) => reportNeedsAdminAttention(r))
        .map((report) => ({ report, job: j })),
    );
  if (pendingReports.length > 0) {
    const { report, job } = pendingReports[0];
    items.push(
      makeHeroItem({
        id: "hero-pending-reports",
        mergeKey: "pending-reports",
        priority: "MEDIUM",
        domain: "documents",
        title:
          pendingReports.length === 1
            ? "Nowa dokumentacja od ekipy"
            : `${pendingReports.length} dokumentacji do przejrzenia`,
        subtitle: `${report.workerName} · ${jobAddress(job)}`,
        recommendedAction: "Przejrzyj dokumentację ekipy w Robotach.",
        navTarget: "jobs",
        jobId: job.id,
        sourceIds: ["D05"],
        urgency: 1050,
      }),
    );
  }

  const pendingPhotos = jobs.flatMap((j) =>
    (j.photos || [])
      .filter((p) => p.status === "pending" && isMediaAttachmentAvailable(p))
      .map((photo) => ({ photo, job: j })),
  );
  if (pendingPhotos.length > 0) {
    const { photo, job } = pendingPhotos[0];
    items.push(
      makeHeroItem({
        id: "hero-pending-photos",
        mergeKey: "pending-photos",
        priority: "MEDIUM",
        domain: "documents",
        title:
          pendingPhotos.length === 1
            ? "Zdjęcie do akceptacji"
            : `${pendingPhotos.length} zdjęć do akceptacji`,
        subtitle: `${jobAddress(job)} · ${photo.uploadedBy}`,
        recommendedAction: "Akceptuj lub odrzuć zdjęcie w Robotach.",
        navTarget: "jobs",
        jobId: job.id,
        sourceIds: ["D06"],
        urgency: 1020,
      }),
    );
  }

  const pendingReceipts = weekEmployees.flatMap((emp) =>
    (emp.extraCosts ?? [])
      .filter((c) => extraCostStatus(c) === "pending")
      .map((cost) => ({ cost, emp })),
  );
  if (pendingReceipts.length > 0) {
    const { cost, emp } = pendingReceipts[0];
    items.push(
      makeHeroItem({
        id: "hero-pending-receipts",
        mergeKey: "pending-receipts",
        priority: "MEDIUM",
        domain: "payroll",
        title:
          pendingReceipts.length === 1
            ? "Paragon do akceptacji"
            : `${pendingReceipts.length} paragonów do akceptacji`,
        subtitle: `${emp.name || "—"}${cost.description ? ` · ${cost.description}` : ""}`,
        recommendedAction: "Rozlicz paragon w liście płac.",
        navTarget: "payroll",
        payrollEmpId: emp.id,
        sourceIds: ["P05"],
        urgency: 1010,
      }),
    );
  }

  const currentWeekRange = getPayrollWeekRange(now);
  const closingWeekRange = getPayrollClosingWeekRange(now);
  const isOnClosingWeek =
    weekFrom === closingWeekRange.from && weekTo === closingWeekRange.to;
  const weekSaved = savedWeeks.some((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
  const payrollRolloverCtx = { employeeLeaves, savedWeeks };
  const payrollRolloverBlockers = listPayrollRolloverBlockers(
    weekEmployees,
    weekFrom,
    weekTo,
    directory,
    payrollRolloverCtx,
  );
  const dayOfWeek = now.getDay();
  const isFriday = dayOfWeek === 5;
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;
  const payrollWeekBehind =
    weekFrom !== currentWeekRange.from || weekTo !== currentWeekRange.to;
  const isCurrentPayrollWeek =
    weekFrom === currentWeekRange.from && weekTo === currentWeekRange.to;

  const needsUnsavedWeekAlert =
    weekEmployees.length > 0 && !weekSaved && isOnClosingWeek && isSunday;
  if (needsUnsavedWeekAlert) {
    items.push(
      makeHeroItem({
        id: "hero-payroll-unsaved-week",
        mergeKey: "payroll-unsaved-week",
        priority: "HIGH",
        domain: "payroll",
        title: "Tydzień niezapisany w archiwum",
        subtitle: `${weekFrom} – ${weekTo}`,
        recommendedAction: "Zapisz tydzień w liście płac przed przejściem na nowy.",
        navTarget: "payroll",
        sourceIds: ["P01"],
        urgency: 1650,
      }),
    );
  }

  const needsPayrollBlockerAlert =
    payrollRolloverBlockers.length > 0
    && (payrollWeekBehind || (isCurrentPayrollWeek && (isFriday || isSaturday || isSunday)));
  if (needsPayrollBlockerAlert) {
    const top = payrollRolloverBlockers[0];
    items.push(
      makeHeroItem({
        id: "hero-payroll-blockers",
        mergeKey: "payroll-saturday-blockers",
        priority: isSaturday ? "CRITICAL" : "HIGH",
        domain: "payroll",
        title: "Wypłata sobotnia bez rozliczenia",
        subtitle: `${payrollRolloverBlockers.length} os. · ${top.name || "—"}`,
        recommendedAction: "Rozlicz kasę sobotnią w liście płac.",
        navTarget: "payroll",
        payrollEmpId: top.id,
        sourceIds: ["P02"],
        urgency: isSaturday ? 2050 : 1700,
        deadlineDays: isSaturday ? 0 : 1,
      }),
    );
  }

  if (
    isSaturday
    && isOnClosingWeek
    && weekEmployees.length > 0
    && (!weekSaved || payrollRolloverBlockers.length > 0)
  ) {
    items.push(
      makeHeroItem({
        id: "hero-saturday-close-week",
        mergeKey: "payroll-saturday-blockers",
        priority: "CRITICAL",
        domain: "payroll",
        title: "Sobota — czas zamknąć tydzień",
        subtitle: !weekSaved
          ? "Tydzień wymaga zapisu lub auto-zapisu"
          : `${payrollRolloverBlockers.length} blokad wypłaty sobotniej`,
        recommendedAction: !weekSaved ? "Zapisz tydzień w liście płac." : "Rozlicz wypłaty sobotnie.",
        navTarget: "payroll",
        sourceIds: ["P03"],
        urgency: 2080,
        deadlineDays: 0,
      }),
    );
  }

  const consistencyAlerts = payrollJobConsistencyAlerts(
    weekEmployees,
    jobs,
    weekFrom,
    weekTo,
    directory,
  );
  if (consistencyAlerts.length > 0) {
    const top: PayrollJobConsistencyAlert = consistencyAlerts[0];
    items.push(
      makeHeroItem({
        id: "hero-payroll-consistency",
        mergeKey: "payroll-consistency",
        priority: "HIGH",
        domain: "payroll",
        title: "Spójność listy płac ↔ roboty",
        subtitle: `${consistencyAlerts.length} rozbieżności · ${top.name || "—"}`,
        recommendedAction: "Popraw godziny lub przypisanie do roboty.",
        navTarget: "payroll",
        sourceIds: ["P04"],
        urgency: 1530,
      }),
    );
  }

  const unseenFeed = getUnseenInspectorFeed(jobs, undefined, input.adminUserId);
  if (unseenFeed.length > 0) {
    const top = unseenFeed[0];
    items.push(
      makeHeroItem({
        id: "hero-inspector-feed",
        mergeKey: "inspector-feed",
        priority: "MEDIUM",
        domain: "inspector",
        title:
          unseenFeed.length === 1
            ? "Inspektor — nowa zmiana"
            : `Inspektor — ${unseenFeed.length} nowych zmian`,
        subtitle: `${top.actor} · ${top.jobAddress || "Bez adresu"}`,
        recommendedAction: "Sprawdź feed inspektora i odpowiedz jeśli trzeba.",
        navTarget: "inspector",
        jobId: top.jobId,
        sourceIds: ["I01"],
        urgency: 1080,
      }),
    );
  }

  const notesSeenAt = getAdminJobNotesSeenAt(input.adminUserId);
  const inspectorNotesPending = jobsWithInspectorNotesNeedingAdmin(jobs, notesSeenAt);
  if (inspectorNotesPending.length > 0) {
    const top = inspectorNotesPending[0];
    const last = (top.jobNotes || [])[0];
    items.push(
      makeHeroItem({
        id: "hero-inspector-notes",
        mergeKey: "inspector-notes",
        priority: "HIGH",
        domain: "inspector",
        title:
          inspectorNotesPending.length === 1
            ? "Notatka inspektora wymaga odpowiedzi"
            : `${inspectorNotesPending.length} notatek inspektora`,
        subtitle: `${jobAddress(top)} · ${last?.author ?? "Inspektor"}`,
        recommendedAction: "Odpowiedz w karcie robota lub w Inspektorze.",
        navTarget: "inspector",
        jobId: top.id,
        sourceIds: ["I02"],
        urgency: 1570,
      }),
    );
  }

  const recoverableAlertResult = computeRecoverableChargesAlerts(recoverableCharges, now);
  if (recoverableAlertResult.alerts.length > 0) {
    const top = recoverableAlertResult.alerts[0];
    const isCritical = top.primaryType === "wiek" || top.primaryType === "kwota";
    items.push(
      makeHeroItem({
        id: "hero-recoverable",
        mergeKey: `recoverable-${top.chargeId}`,
        priority: isCritical ? "HIGH" : "MEDIUM",
        domain: "recoverable",
        title: "Do odzyskania — wymaga uwagi",
        subtitle: `${top.title} · ${fmtRecoverableAmount(top.amountRemaining)}`,
        recommendedAction: "Rozlicz lub odśwież status pozycji do odzyskania.",
        navTarget: "recoverablecharges",
        chargeId: top.chargeId,
        sourceIds: ["R01", "R02", "R03", "R04"].filter((id) => {
          if (id === "R01") return top.types.includes("kwota");
          if (id === "R02") return top.types.includes("wiek");
          if (id === "R03") return top.types.includes("częściowe");
          if (id === "R04") return top.types.includes("aktywność");
          return false;
        }),
        urgency: isCritical ? 1590 : 1090,
      }),
    );
  }

  return items;
}

function resolveMergeKey(item: HeroTodayItem): string {
  if (item.mergeKey) return item.mergeKey;
  return item.id;
}

function mergeHeroGroup(group: HeroTodayItem[]): HeroTodayItem {
  const sorted = [...group].sort(compareHeroItems);
  const primary = sorted[0];
  const sourceIds = [...new Set(group.flatMap((g) => g.sourceIds))];
  return {
    ...primary,
    sourceIds,
    subtitle: primary.subtitle,
    urgency: Math.max(...group.map((g) => g.urgency ?? 0)),
    deadlineDays: group.reduce<number | null>((best, g) => {
      if (g.deadlineDays == null) return best;
      if (best == null) return g.deadlineDays;
      return Math.min(best, g.deadlineDays);
    }, primary.deadlineDays ?? null),
  };
}

/** Sort: priority → urgency (higher first) → deadline proximity (lower days first). */
export function compareHeroItems(a: HeroTodayItem, b: HeroTodayItem): number {
  const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (pr !== 0) return pr;
  const ua = a.urgency ?? 0;
  const ub = b.urgency ?? 0;
  if (ub !== ua) return ub - ua;
  const da = a.deadlineDays ?? 9999;
  const db = b.deadlineDays ?? 9999;
  return da - db;
}

/** Dedupe by mergeKey, sort, slice to maxItems. */
export function mergeAndRankHeroItems(
  items: HeroTodayItem[],
  maxItems = HERO_TODAY_MAX_ITEMS,
): HeroTodayItem[] {
  const groups = new Map<string, HeroTodayItem[]>();
  for (const item of items) {
    const key = resolveMergeKey(item);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const merged = [...groups.values()].map(mergeHeroGroup);
  merged.sort(compareHeroItems);
  return merged.slice(0, maxItems);
}

function countByPriority(items: HeroTodayItem[]): {
  criticalCount: number;
  highCount: number;
  urgentCount: number;
} {
  const criticalCount = items.filter((i) => i.priority === "CRITICAL").length;
  const highCount = items.filter((i) => i.priority === "HIGH").length;
  return {
    criticalCount,
    highCount,
    urgentCount: criticalCount + highCount,
  };
}

function computeHeroSummaryTone(
  input: HeroTodayInput,
  criticalCount: number,
  highCount: number,
): SummaryTone {
  if (input.morningBriefingTone) return input.morningBriefingTone;

  let riskScore = 0;
  const health = input.health;
  if (health?.label === "at_risk") riskScore += 3;
  else if (health?.label === "strained") riskScore += 2;
  else if (health?.label === "stable") riskScore += 1;

  if (criticalCount > 0) riskScore += 3;
  else if (highCount >= 2) riskScore += 2;
  else if (highCount > 0) riskScore += 1;

  if (input.financialCapacity?.liquidityRisk === "KRYTYCZNE") riskScore += 3;
  else if (input.financialCapacity?.liquidityRisk === "WYSOKIE") riskScore += 2;

  const h90 = input.forecast
    ? primaryForecastScenario(input.forecast).horizons.find((h) => h.days === 90)
    : undefined;
  if (h90?.risk === "BRAK_LUDZI" || h90?.risk === "PRZECIAZENIE") riskScore += 2;

  if (riskScore >= 5) return "WYSOKIE RYZIKO";
  if (riskScore >= 3) return "OSTROŻNIE";
  if (health?.label === "healthy" && riskScore <= 1) return "ŚWIETNY DZIEŃ";
  return "DOBRY DZIEŃ";
}

function buildHeroHeadline(tone: SummaryTone, top: HeroTodayItem | undefined): string {
  if (!top) {
    return "Brak pilnych akcji — utrzymaj bieżący rytm operacyjny.";
  }
  switch (tone) {
    case "WYSOKIE RYZIKO":
      return "Krytyczny dzień — zacznij od priorytetu #1.";
    case "OSTROŻNIE":
      return "Dzień wymaga uwagi — priorytetyzuj zadania przed nowymi ofertami.";
    case "ŚWIETNY DZIEŃ":
      return "Wszystko ogarnięte — skup się na najważniejszej akcji.";
    case "DOBRY DZIEŃ":
      return top.recommendedAction.endsWith(".")
        ? top.recommendedAction
        : `${top.recommendedAction}.`;
  }
}

/** Pełna lista po rankingu (dedupe Uwaga dziś) — bez slice do 5. */
export function buildHeroTodayRankedAll(input: HeroTodayInput): HeroTodayItem[] {
  const now = input.now ?? new Date();
  const operational = mapOperationalAlertsToHeroItems({ ...input.operational, now });
  return mergeAndRankHeroItems(operational, 999);
}

/** Public API — unified Hero DZIŚ ranker (max 5 items). */
export function buildHeroToday(input: HeroTodayInput): HeroTodayResult {
  const now = input.now ?? new Date();
  const operational = mapOperationalAlertsToHeroItems({ ...input.operational, now });
  const allMerged = mergeAndRankHeroItems(operational, 999);
  const items = allMerged.slice(0, HERO_TODAY_MAX_ITEMS);
  const { criticalCount, highCount, urgentCount } = countByPriority(allMerged);
  const summaryTone = computeHeroSummaryTone(input, criticalCount, highCount);
  const headline = buildHeroHeadline(summaryTone, items[0]);

  return {
    items,
    urgentCount,
    criticalCount,
    highCount,
    summaryTone,
    headline,
  };
}
