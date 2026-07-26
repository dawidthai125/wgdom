import { useMemo, useState } from "react";
import {
  MessageSquare, CalendarDays, Wallet, MapPin, Bell, LayoutGrid,
  FileText, CheckCircle2, Circle, Archive, Calendar, HardHat, KeyRound, TrendingUp,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { jobDraftFromTender, type TenderPipelineItem } from "@/lib/tenders-bzp";
import { TendersShortcutPanel } from "@/app/tenders/components/TendersShortcutPanel";
import { appendJobActivity } from "@/lib/job-activity";
import { adminIsSuperAdmin } from "@/lib/admin-auth";
import type {
  DirectoryEmployee, WeekEmployee, WeekSnapshot, DocType, Job, PayrollJobConsistencyAlert,
} from "@/app/app-domain";
import type { EmployeeLeave } from "@/lib/employee-leaves";
import {
  MONTH_NAMES, DOCUMENT_TYPES, REQUIRED_DOCS, DOC_LABELS,
  filterProductionActiveDirectory, hoursWorked, dayTotalHours,
  payrollJobConsistencyAlerts, consistencyAlertMessage,
  fmt, fmtH, fmtDate, getWeekRange, calcWeekEmployee, extraCostStatus,
  fixJobsForConsistencyAlert, jobDaysSinceStart, jobWorkerReports,
  reportNeedsAdminAttention, jobTotalCost, todayDayKey, todayIsoDate,
  jobsForEmployeeOnDashboard, formatJobStreet,
} from "@/app/app-domain";
import type { JobDetailSection } from "@/app/JobDetailSectionNav";
import { useAdminAccess } from "@/app/admin-access";
import { isMediaAttachmentAvailable } from "@/lib/media-filter";
import {
  confirmReportSyncedDocUncheck,
  applyReportDocDocumentToggle,
  isReportSyncedDocLocked,
} from "@/lib/job-documents";
import {
  markInspectorFeedSeen,
  markAdminJobNotesSeen,
  getUnseenInspectorFeed,
  getAdminJobNotesSeenAt,
} from "@/lib/inspector-stats";
import {
  isWmClient,
  wmJobsWithOverduePlanned,
  wmJobsPlannedThisWeek,
  computeWmPortfolioStats,
  jobsWithInspectorNotesNeedingAdmin,
} from "@/lib/job-wm";
import {
  jobMatchesListFilter,
  jobMissingRequiredDocs,
} from "@/lib/job-list-status";
import { computePayrollCashSplitWithCarry } from "@/lib/payroll-carry-forward";
import {
  biweeklyCashContextLine,
  getPayrollClosingWeekRange,
  PAYROLL_WEEK_ROLLOVER_HOUR,
} from "@/lib/payroll-cycle";
import { listPayrollRolloverBlockers } from "@/lib/payroll-rollover";
import type { RecoverableCharge } from "@/lib/recoverable-charges";
import { computeRecoverableChargesAlerts } from "@/lib/recoverable-charges";
import {
  buildUrgentTodayCategories,
  type UrgentCategoryId,
} from "@/lib/dashboard-urgent-today";
import { DashboardPilneUwagiSection } from "@/app/DashboardPilneUwagiSection";
import { DashboardOperationalNotesWidget } from "@/app/DashboardOperationalNotesWidget";
import {
  canShowOperationalNotesDashboardWidget,
  computeOperationalNotesDashboardSummary,
} from "@/lib/operational-notes-dashboard";
import type { OperationalNote } from "@/lib/operational-notes";
import type { OperationalNoteReadReceipt } from "@/lib/operational-notes-read-state";
import { WgButton, WgCard, WgEmptyState, WgKpi } from "@/app/ui";
import { WG_TOUCH_MIN, WG_TYPE_TITLE } from "@/lib/wg-ui-tokens";
import { cn } from "@/app/components/ui/utils";

export function DashboardView({
  jobs, directory, weekEmployees, weekFrom, weekTo, savedWeeks,
  employeeLeaves = [],
  recoverableCharges = [],
  operationalNotes = [],
  operationalNotesReadState = [],
  onNavigate, onFixJobs, adminUserId, alertsSeenTick, onAlertsSeen, onOpenSms,
  onOpenTenders,
  onOpenTender,
  canViewTenders,
  setJobs,
  onOpenJobFromTender,
  onNavigateToJobFromTender,
  onCreateJobFromTender,
  tenderJobUploadedBy,
}: {
  jobs: Job[];
  directory: DirectoryEmployee[];
  weekEmployees: WeekEmployee[];
  weekFrom: string; weekTo: string;
  savedWeeks: WeekSnapshot[];
  employeeLeaves?: EmployeeLeave[];
  recoverableCharges?: RecoverableCharge[];
  operationalNotes?: OperationalNote[];
  operationalNotesReadState?: OperationalNoteReadReceipt[];
  onNavigate: (v: "payroll" | "directory" | "archive" | "jobs" | "schedule" | "inspector" | "recoverablecharges" | "operationalnotes", jobId?: string, payrollEmpId?: string, jobSection?: JobDetailSection) => void;
  onFixJobs: (updater: (prev: Job[]) => Job[]) => void;
  adminUserId?: string;
  alertsSeenTick: number;
  onAlertsSeen: () => void;
  onOpenSms?: () => void;
  onOpenTenders?: () => void;
  onOpenTender?: (tenderId: string) => void;
  canViewTenders?: boolean;
  setJobs?: (updater: Job[] | ((prev: Job[]) => Job[])) => void;
  onOpenJobFromTender?: (jobId: string) => void;
  onNavigateToJobFromTender?: (jobId: string) => void;
  onCreateJobFromTender?: (
    draft: ReturnType<typeof jobDraftFromTender>,
    item: TenderPipelineItem,
  ) => string | void;
  tenderJobUploadedBy?: string;
}) {
  const { session: adminSession } = useAdminAccess();
  const createdByName = adminSession?.displayName || "Administrator";
  const isSuperAdmin = adminSession ? adminIsSuperAdmin(adminSession.role) : false;
  const showOperationalNotesWidget = canShowOperationalNotesDashboardWidget(adminSession);
  const operationalNotesSummary = useMemo(
    () => computeOperationalNotesDashboardSummary(operationalNotes, operationalNotesReadState, adminSession),
    [operationalNotes, operationalNotesReadState, adminSession],
  );
  const todayKey = todayDayKey();
  const todayIso = todayIsoDate();
  const workingToday = weekEmployees.filter((e) => todayKey && dayTotalHours(e.days[todayKey]) > 0);
  const offToday = weekEmployees.filter((e) => !(todayKey && dayTotalHours(e.days[todayKey]) > 0));

  const activeJobs = jobs.filter((j) => j.status === "in_progress");
  const completedJobs = jobs.filter((j) => j.status === "completed");
  const jobsMissingDocs = jobs.filter(
    (j) => j.status === "in_progress" && jobMissingRequiredDocs(j).length > 0,
  );
  const staleDocsJobs = jobsMissingDocs.filter((j) => jobDaysSinceStart(j) >= 7);
  const jobsMissingDocsSorted = useMemo(
    () =>
      [...jobsMissingDocs].sort((a, b) => {
        const staleA = jobDaysSinceStart(a) >= 7 ? 1 : 0;
        const staleB = jobDaysSinceStart(b) >= 7 ? 1 : 0;
        if (staleB !== staleA) return staleB - staleA;
        const missDiff = jobMissingRequiredDocs(a).length - jobMissingRequiredDocs(b).length;
        if (missDiff !== 0) return missDiff;
        return (a.address || "").localeCompare(b.address || "", "pl");
      }),
    [jobsMissingDocs],
  );
  const jobsReadyToClose = jobs.filter(
    (j) => j.status === "in_progress" && DOCUMENT_TYPES.every((d) => j.documents[d]),
  );

  const payrollCash = useMemo(
    () => computePayrollCashSplitWithCarry(weekEmployees, directory, weekFrom, weekTo, savedWeeks),
    [weekEmployees, directory, weekFrom, weekTo, savedWeeks],
  );
  const weekTotal = payrollCash.totalSaturdayCash;
  const weekHours = weekEmployees.reduce((s, e) => s + calcWeekEmployee(e).totalHours, 0);
  const payrollContextLine = biweeklyCashContextLine(payrollCash, weekTo);

  const yearNow = new Date().getFullYear();
  const yearWeeks = savedWeeks.filter((w) => new Date(w.weekFrom).getFullYear() === yearNow);
  const yearTotal = yearWeeks.reduce((s, w) => s + w.totalNet, 0);
  const monthNow = new Date().getMonth();
  const monthWeeks = yearWeeks.filter((w) => new Date(w.weekFrom).getMonth() === monthNow);
  const monthTotal = monthWeeks.reduce((s, w) => s + w.totalNet, 0);

  const recentJobs = [...activeJobs].sort((a, b) => b.startDate.localeCompare(a.startDate)).slice(0, 6);
  const recentWeeks = [...savedWeeks].sort((a, b) => b.weekFrom.localeCompare(a.weekFrom)).slice(0, 3);

  const pendingPhotos = useMemo(
    () =>
      jobs
        .flatMap((j) =>
          (j.photos || [])
            .filter((p) => p.status === "pending" && isMediaAttachmentAvailable(p))
            .map((p) => ({ photo: p, job: j })),
        )
        .sort((a, b) => b.photo.uploadedAt.localeCompare(a.photo.uploadedAt)),
    [jobs],
  );

  const pendingReceipts = useMemo(
    () =>
      weekEmployees.flatMap((emp) =>
        (emp.extraCosts ?? [])
          .filter((c) => extraCostStatus(c) === "pending")
          .map((cost) => ({ cost, emp })),
      ),
    [weekEmployees],
  );

  const pendingReports = useMemo(
    () =>
      jobs
        .filter((j) => j.status === "in_progress")
        .flatMap((j) =>
          jobWorkerReports(j)
            .filter((r) => reportNeedsAdminAttention(r))
            .map((report) => ({ report, job: j })),
        )
        .sort((a, b) =>
          (b.report.updatedAt || b.report.submittedAt).localeCompare(
            a.report.updatedAt || a.report.submittedAt,
          ),
        ),
    [jobs],
  );

  const totalReportsActive = useMemo(
    () => activeJobs.reduce((s, j) => s + jobWorkerReports(j).length, 0),
    [activeJobs],
  );

  const consistencyAlerts = useMemo(
    () => payrollJobConsistencyAlerts(weekEmployees, jobs, weekFrom, weekTo, directory),
    [weekEmployees, jobs, weekFrom, weekTo, directory],
  );

  const unseenInspectorFeed = useMemo(
    () => getUnseenInspectorFeed(jobs, undefined, adminUserId),
    [jobs, adminUserId, alertsSeenTick],
  );

  const inspectorNotesPending = useMemo(
    () => jobsWithInspectorNotesNeedingAdmin(jobs, getAdminJobNotesSeenAt(adminUserId)),
    [jobs, adminUserId, alertsSeenTick],
  );

  const wmPortfolioStats = useMemo(
    () => computeWmPortfolioStats(jobs, { notesNeedingAdminAttention: inspectorNotesPending.length }),
    [jobs, inspectorNotesPending.length],
  );

  const wmOverdueJobs = useMemo(() => wmJobsWithOverduePlanned(jobs), [jobs]);
  const wmThisWeekJobs = useMemo(() => wmJobsPlannedThisWeek(jobs), [jobs]);

  const handoverJobs = useMemo(
    () =>
      [...jobs.filter((j) => jobMatchesListFilter(j, "handover"))].sort((a, b) => {
        const pa = a.plannedHandoverDate || "";
        const pb = b.plannedHandoverDate || "";
        if (pa && pb) return pa.localeCompare(pb);
        if (pa) return -1;
        if (pb) return 1;
        return (b.startDate || "").localeCompare(a.startDate || "");
      }),
    [jobs],
  );
  const handoverJobCount = handoverJobs.length;

  const markInspectorAlertsSeen = () => {
    const ts = new Date().toISOString();
    markInspectorFeedSeen(adminUserId, ts).catch(() => {});
    markAdminJobNotesSeen(adminUserId, ts).catch(() => {});
    onAlertsSeen();
  };

  const currentWeekRange = getWeekRange();
  const closingWeekRange = getPayrollClosingWeekRange();
  const isCurrentPayrollWeek = weekFrom === currentWeekRange.from && weekTo === currentWeekRange.to;
  const isOnClosingWeek = weekFrom === closingWeekRange.from && weekTo === closingWeekRange.to;
  const payrollWeekBehind = weekFrom !== currentWeekRange.from || weekTo !== currentWeekRange.to;
  const weekSaved = savedWeeks.some((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
  const payrollRolloverCtx = useMemo(
    () => ({ employeeLeaves, savedWeeks }),
    [employeeLeaves, savedWeeks],
  );
  const payrollRolloverBlockers = useMemo(
    () => listPayrollRolloverBlockers(weekEmployees, weekFrom, weekTo, directory, payrollRolloverCtx),
    [weekEmployees, weekFrom, weekTo, directory, payrollRolloverCtx],
  );
  const dayOfWeek = new Date().getDay();
  const isFriday = dayOfWeek === 5;
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;
  const showSaturdayBanner =
    isSaturday && isOnClosingWeek && weekEmployees.length > 0 && (!weekSaved || payrollRolloverBlockers.length > 0);

  // Auto-zapis w niedzielę (nie w sobotę — wypłaty ukraińców w sobotę popołudniu)
  const needsUnsavedWeekAlert =
    weekEmployees.length > 0 && !weekSaved && isOnClosingWeek && isSunday;
  // Rozliczenie: przypomnienie od piątku; także gdy tydzień zostaje w tyle (np. Nd po 20:00 bez przejścia)
  const needsPayrollBlockerAlert =
    payrollRolloverBlockers.length > 0 && (
      payrollWeekBehind
      || (isCurrentPayrollWeek && (isFriday || isSaturday || isSunday))
    );

  const recoverableAlertStats = useMemo(
    () => computeRecoverableChargesAlerts(recoverableCharges),
    [recoverableCharges],
  );

  const urgentToday = useMemo(
    () =>
      buildUrgentTodayCategories({
        needsUnsavedWeekAlert,
        payrollRolloverBlockersCount: needsPayrollBlockerAlert ? payrollRolloverBlockers.length : 0,
        consistencyAlertsCount: consistencyAlerts.length,
        pendingReceiptsCount: pendingReceipts.length,
        pendingReportsCount: pendingReports.length,
        pendingPhotosCount: pendingPhotos.length,
        unseenInspectorFeedCount: unseenInspectorFeed.length,
        inspectorNotesPendingCount: inspectorNotesPending.length,
        wmOverdueJobsCount: wmOverdueJobs.length,
        wmThisWeekJobsCount: wmThisWeekJobs.length,
        handoverJobCount,
        recoverableAlertsCount: recoverableAlertStats.alerts.length,
      }),
    [
      needsUnsavedWeekAlert,
      needsPayrollBlockerAlert,
      payrollRolloverBlockers.length,
      consistencyAlerts.length,
      pendingReceipts.length,
      pendingReports.length,
      pendingPhotos.length,
      unseenInspectorFeed.length,
      inspectorNotesPending.length,
      wmOverdueJobs.length,
      wmThisWeekJobs.length,
      handoverJobCount,
      recoverableAlertStats.alerts.length,
    ],
  );

  const handleFixConsistency = (alert: PayrollJobConsistencyAlert) => {
    onFixJobs((prev) =>
      fixJobsForConsistencyAlert(prev, alert, weekEmployees, weekFrom, weekTo, directory, createdByName),
    );
  };

  const acknowledgeReport = (jobId: string, reportId: string) => {
    const now = new Date().toISOString();
    onFixJobs((prev) =>
      prev.map((j) =>
        j.id !== jobId
          ? j
          : {
              ...j,
              workerReports: jobWorkerReports(j).map((r) =>
                r.id === reportId ? { ...r, adminReviewedAt: now } : r,
              ),
            },
      ),
    );
  };

  const toggleJobDocumentOnDashboard = (job: Job, doc: DocType) => {
    const nextChecked = !job.documents[doc];
    if (!nextChecked && !confirmReportSyncedDocUncheck(job, doc, isSuperAdmin)) return;
    onFixJobs((prev) =>
      prev.map((j) => {
        if (j.id !== job.id) return j;
        let next = applyReportDocDocumentToggle(j, doc, nextChecked, isSuperAdmin);
        next = appendJobActivity(
          next,
          "document",
          `${nextChecked ? "Zaznaczono" : "Odznaczono"}: ${DOC_LABELS[doc]}`,
          createdByName,
        );
        if (!isWmClient(next.client)) {
          const allDone = REQUIRED_DOCS.every((d) => next.documents[d]);
          if (allDone && next.status === "in_progress") {
            next = appendJobActivity(
              { ...next, status: "completed" as const },
              "status_change",
              "Automatycznie oznaczono jako zdane (komplet dokumentów)",
              "System",
            );
          }
        }
        return next;
      }),
    );
  };

  const todayLabel = new Date().toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const [brakiExpanded, setBrakiExpanded] = useState(false);
  const [pilneExpanded, setPilneExpanded] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<UrgentCategoryId>>(new Set());

  const toggleCategory = (id: UrgentCategoryId) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pilneCollapsedSummary = useMemo(
    () =>
      urgentToday.categories
        .filter((c) => c.count > 0)
        .map((c) => `${c.label} (${c.count})`)
        .join(" · "),
    [urgentToday.categories],
  );

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      data-mobile-scroll-root="dashboard"
      className="mobile-view-scroll flex-1 min-w-0 overflow-y-auto overscroll-contain"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-8 sm:space-y-10">

        {/* Nagłówek — DF-03/04: typography + ≤1 Primary · mobile icon-only */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className={cn(WG_TYPE_TITLE, "text-2xl font-semibold tracking-tight")}>Pulpit</h1>
            <p className="text-sm text-muted-foreground leading-relaxed capitalize mt-1">{todayLabel}</p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              Tydzień listy płac: {fmtDate(weekFrom)} – {fmtDate(weekTo)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {onOpenSms && (
              <WgButton
                type="button"
                variant="outline"
                onClick={onOpenSms}
                aria-label="SMS pilne"
                title="SMS pilne"
                className={cn(WG_TOUCH_MIN, "h-11 gap-1.5 text-xs px-3 sm:px-4")}
              >
                <MessageSquare size={13} />
                <span className="hidden sm:inline">SMS pilne</span>
              </WgButton>
            )}
            <WgButton
              type="button"
              variant="secondary"
              onClick={() => onNavigate("schedule")}
              aria-label="Grafik"
              title="Grafik"
              className={cn(WG_TOUCH_MIN, "h-11 gap-1.5 text-xs px-3 sm:px-4")}
            >
              <CalendarDays size={13} className="text-primary" />
              <span className="hidden sm:inline">Grafik</span>
            </WgButton>
            <WgButton
              type="button"
              variant="secondary"
              onClick={() => onNavigate("payroll")}
              aria-label="Lista płac"
              title="Lista płac"
              className={cn(WG_TOUCH_MIN, "h-11 gap-1.5 text-xs px-3 sm:px-4")}
            >
              <Wallet size={13} className="text-primary" />
              <span className="hidden sm:inline">Lista płac</span>
            </WgButton>
            {!showSaturdayBanner && (
              <WgButton
                type="button"
                variant="primary"
                onClick={() => onNavigate("jobs")}
                className={cn(WG_TOUCH_MIN, "h-11 gap-1.5 text-sm")}
              >
                <MapPin size={13} />
                Przejdź do Robot
              </WgButton>
            )}
            {showSaturdayBanner && (
              <WgButton
                type="button"
                variant="secondary"
                onClick={() => onNavigate("jobs")}
                aria-label="Roboty"
                title="Roboty"
                className={cn(WG_TOUCH_MIN, "h-11 gap-1.5 text-xs px-3 sm:px-4")}
              >
                <MapPin size={13} className="text-primary" />
                <span className="hidden sm:inline">Roboty</span>
              </WgButton>
            )}
          </div>
        </div>

        {showSaturdayBanner && (
          <WgCard elevation="soft" padding="md" radius="md" className="border-primary/30 bg-primary/10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <Bell size={18} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-primary">Sobota — czas zamknąć tydzień</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {!weekSaved && "Tydzień zapisze się automatycznie dziś przy otwarciu aplikacji — możesz też zapisać ręcznie. "}
                    {payrollRolloverBlockers.length > 0 && (
                      <>{payrollRolloverBlockers.length} {payrollRolloverBlockers.length === 1 ? "osoba ma" : "osób ma"} nierozliczoną kasę sobotnią: {payrollRolloverBlockers.slice(0, 4).map((e) => e.name.split(" ")[0]).join(", ")}{payrollRolloverBlockers.length > 4 ? "…" : ""}.</>
                    )}
                    {weekSaved && payrollRolloverBlockers.length === 0 && "Tydzień zapisany — brak blokad wypłaty sobotniej."}
                  </p>
                </div>
              </div>
              <WgButton
                type="button"
                variant="primary"
                onClick={() => onNavigate("payroll")}
                className={cn(WG_TOUCH_MIN, "h-11 shrink-0")}
              >
                {!weekSaved ? "Zapisz tydzień →" : "Lista płac →"}
              </WgButton>
            </div>
          </WgCard>
        )}

        {/* KPI — DF-05 3+2 wrap · DF-10 equal height via WgKpi h-full */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 items-stretch">
          <WgKpi
            label={`Wypłata · sob. ${fmtDate(weekTo).slice(0, 5)}`}
            value={fmt(weekTotal)}
            hint={`${fmtH(weekHours)} · ${weekEmployees.length} os.${payrollContextLine ? ` · ${payrollContextLine}` : ""}`}
            status="info"
            onClick={() => onNavigate("payroll")}
          >
            {payrollCash.hasBiweeklyEmployees ? (
              <div className="text-xs text-muted-foreground mt-1 pt-1 border-t border-border/60 space-y-0.5">
                <div className="flex justify-between gap-2 line-clamp-1">
                  <span className="truncate">Tygodniówki ({payrollCash.weeklyCount})</span>
                  <span className="font-medium text-foreground shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(payrollCash.weeklyNet)}</span>
                </div>
                <div className="flex justify-between gap-2 line-clamp-1">
                  <span className="truncate">
                    {payrollCash.isAnyBiweeklyPayoutWeek
                      ? `Co 2 tyg. (${payrollCash.biweeklyCount})`
                      : `Co 2 tyg. → ${fmtDate(payrollCash.nextBiweeklyPayoutDate).slice(0, 5)}`}
                  </span>
                  <span className="font-medium text-foreground shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmt(payrollCash.isAnyBiweeklyPayoutWeek ? payrollCash.biweeklyPayoutNet : payrollCash.biweeklyAccruedNet)}
                  </span>
                </div>
              </div>
            ) : null}
          </WgKpi>
          <WgKpi
            label="Ekipa dziś"
            value={String(workingToday.length)}
            hint={weekEmployees.length > 0 ? `${offToday.length} wolne · ${filterProductionActiveDirectory(directory).length} w kartotece` : "brak w liście płac"}
            onClick={() => onNavigate("directory")}
          />
          <WgKpi
            label="Aktywne WM"
            value={String(wmPortfolioStats.total)}
            hint={wmPortfolioStats.overduePlanned > 0 ? `${wmPortfolioStats.overduePlanned} po terminie` : "Roboty →"}
            icon={LayoutGrid}
            status="ok"
            onClick={() => onNavigate("jobs")}
          />
          <WgKpi
            label="Braki dokumentów"
            value={String(jobsMissingDocs.length)}
            hint={jobsMissingDocs.length > 0 ? "roboty bez kompletu" : "wszystko OK"}
            status={jobsMissingDocs.length > 0 ? "warn" : "neutral"}
            onClick={() => {
              scrollToSection("dashboard-braki-dokumentow");
              if (jobsMissingDocs.length > 0) setBrakiExpanded(true);
            }}
          />
          <WgKpi
            label="Pilne uwagi"
            value={String(urgentToday.urgentTodayTotal)}
            hint={urgentToday.urgentTodayTotal > 0 ? "kategorie poniżej" : "wszystko OK"}
            status={urgentToday.urgentTodayTotal > 0 ? "warn" : "neutral"}
            onClick={() => {
              scrollToSection("dashboard-pilne-uwagi");
              if (urgentToday.urgentTodayTotal > 0) setPilneExpanded(true);
            }}
          />
        </div>

        {showOperationalNotesWidget && (
          <DashboardOperationalNotesWidget
            summary={operationalNotesSummary}
            onOpen={() => onNavigate("operationalnotes")}
          />
        )}

        {/* Roboty → Braki dokumentów */}
        {jobsMissingDocs.length > 0 && (
          <div
            id="dashboard-braki-dokumentow"
            className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
            aria-label="Roboty — braki dokumentów"
          >
            <div className="px-5 py-3.5 border-b border-border/50 bg-secondary/20">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText size={14} className="text-amber-600 dark:text-amber-400 shrink-0"/>
                  <span className="text-sm font-semibold text-foreground">Roboty → Braki dokumentów</span>
                  <span className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                    {jobsMissingDocs.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setBrakiExpanded((v) => !v)}
                  aria-expanded={brakiExpanded}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline min-h-[44px] px-2 shrink-0 touch-manipulation transition-colors duration-150 motion-reduce:transition-none"
                >
                  {brakiExpanded ? "Ukryj szczegóły" : "Pokaż szczegóły"}
                  {brakiExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>
            {brakiExpanded && (
              <div className="px-4 sm:px-5 py-4 border-l-4 border-l-amber-500/50">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      <span className="text-foreground/90">Kliknij dokument</span> — czerwony = brak, zielony = odebrany.
                      Kliknij adres robota — pełna karta w Robotach. Wymagane: {REQUIRED_DOCS.length} poz.
                      {staleDocsJobs.length > 0 && (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          {" "}· {staleDocsJobs.length} {staleDocsJobs.length === 1 ? "trwa" : "trwają"} &gt;7 dni bez kompletu
                        </span>
                      )}
                    </p>
                  </div>
                  <button type="button" onClick={() => onNavigate("jobs")} className="text-xs font-medium text-primary hover:underline shrink-0 px-2 py-1">
                    Wszystkie roboty →
                  </button>
                </div>
                <div className="space-y-2.5 pr-0.5">
                  {jobsMissingDocsSorted.map((job) => {
                    const missing = jobMissingRequiredDocs(job);
                    const done = REQUIRED_DOCS.length - missing.length;
                    const pct = Math.round((done / REQUIRED_DOCS.length) * 100);
                    const days = jobDaysSinceStart(job);
                    const isStale = days >= 7;
                    return (
                      <div
                        key={job.id}
                        className={`rounded-xl border px-3.5 py-3 transition-colors ${
                          isStale ? "border-amber-500/35 bg-amber-500/5" : "border-border bg-card/80"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onNavigate("jobs", job.id)}
                          className="w-full text-left hover:opacity-90 transition-opacity"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground leading-snug truncate">
                                {job.address || "Bez adresu"}
                                {job.flatNumber ? ` · m.${job.flatNumber}` : ""}
                              </p>
                              {(job.client || job.startDate) && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                  {job.client ? job.client : ""}
                                  {job.client && job.startDate ? " · " : ""}
                                  {job.startDate ? `od ${fmtDate(job.startDate)}` : ""}
                                  {isStale && (
                                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                                      {" "}· {days} dni w toku
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 text-right">
                              <span
                                className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-lg ${
                                  pct === 100
                                    ? "bg-green-500/15 text-green-600 dark:text-green-400"
                                    : pct >= 75
                                      ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300"
                                      : "bg-red-500/15 text-red-600 dark:text-red-400"
                                }`}
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                              >
                                {done}/{REQUIRED_DOCS.length}
                              </span>
                            </div>
                          </div>
                        </button>
                        <div className="mt-2.5 h-1.5 rounded-full bg-border overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              pct === 100 ? "bg-green-500" : pct >= 75 ? "bg-yellow-500" : "bg-red-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {REQUIRED_DOCS.map((doc) => {
                            const checked = job.documents[doc];
                            const reportLocked = checked && isReportSyncedDocLocked(job, doc);
                            const locked = reportLocked && !isSuperAdmin;
                            return (
                              <button
                                key={doc}
                                type="button"
                                title={
                                  reportLocked && isSuperAdmin
                                    ? `${DOC_LABELS[doc]} — z dokumentacji ekipy (Super Admin: kliknij, aby zmienić status)`
                                    : locked
                                      ? `${DOC_LABELS[doc]} — potwierdzone dokumentacją ekipy (nie można odznaczyć)`
                                      : checked
                                        ? `${DOC_LABELS[doc]} — odebrane (kliknij, aby odznaczyć)`
                                        : `Oznacz jako odebrane: ${DOC_LABELS[doc]}`
                                }
                                onClick={() => toggleJobDocumentOnDashboard(job, doc)}
                                className={`inline-flex items-center gap-1 text-[11px] font-medium px-3 py-2.5 min-h-[44px] rounded-md border transition-all touch-manipulation ${
                                  locked
                                    ? "bg-green-500/12 text-green-700 dark:text-green-300 border-green-500/35 cursor-default"
                                    : checked
                                      ? "bg-green-500/12 text-green-700 dark:text-green-300 border-green-500/35 hover:bg-green-500/20 active:scale-[0.97]"
                                      : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/25 hover:bg-green-500/15 hover:text-green-700 hover:border-green-500/30 dark:hover:text-green-300 active:scale-[0.97]"
                                }`}
                              >
                                {checked ? (
                                  <CheckCircle2 size={10} className="shrink-0"/>
                                ) : (
                                  <Circle size={10} className="shrink-0 opacity-70"/>
                                )}
                                {DOC_LABELS[doc]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {jobsReadyToClose.length > 0 && (
                  <p className="text-[11px] text-green-600 dark:text-green-400 mt-2 flex items-center gap-1.5">
                    <CheckCircle2 size={12}/>
                    {jobsReadyToClose.length} {jobsReadyToClose.length === 1 ? "robota gotowa" : "roboty gotowe"} do zdania (pełny komplet dokumentów)
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <DashboardPilneUwagiSection
          urgentTodayTotal={urgentToday.urgentTodayTotal}
          categories={urgentToday.categories}
          pilneExpanded={pilneExpanded}
          setPilneExpanded={setPilneExpanded}
          expandedCategories={expandedCategories}
          toggleCategory={toggleCategory}
          pilneCollapsedSummary={pilneCollapsedSummary}
          needsUnsavedWeekAlert={needsUnsavedWeekAlert}
          needsPayrollBlockerAlert={needsPayrollBlockerAlert}
          weekFrom={weekFrom}
          weekTo={weekTo}
          payrollRolloverBlockers={payrollRolloverBlockers}
          consistencyAlerts={consistencyAlerts}
          pendingPhotos={pendingPhotos}
          pendingReceipts={pendingReceipts}
          pendingReports={pendingReports}
          handoverJobs={handoverJobs}
          unseenInspectorFeed={unseenInspectorFeed}
          wmOverdueJobs={wmOverdueJobs}
          wmThisWeekJobs={wmThisWeekJobs}
          inspectorNotesPending={inspectorNotesPending}
          recoverableAlertStats={recoverableAlertStats}
          jobs={jobs}
          onNavigate={onNavigate}
          acknowledgeReport={acknowledgeReport}
          markInspectorAlertsSeen={markInspectorAlertsSeen}
          handleFixConsistency={handleFixConsistency}
        />

        {canViewTenders && onOpenTenders && (
          <TendersShortcutPanel onOpenTendersStrategy={onOpenTenders} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Pracuje dziś */}
          <WgCard elevation="soft" padding="sm" radius="md" className="lg:col-span-2 overflow-hidden !p-0">
            <div className="px-5 py-3.5 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardHat size={13} className="text-primary"/>
                <span className="text-sm font-semibold text-foreground">Pracuje dziś</span>
              </div>
              <WgButton type="button" variant="ghost" onClick={() => onNavigate("schedule")} className="h-auto w-auto p-0 text-xs text-primary hover:underline">
                Grafik →
              </WgButton>
            </div>
            {weekEmployees.length === 0 ? (
              <WgEmptyState
                icon={HardHat}
                title="Brak pracowników w tym tygodniu"
                description="Dodaj ekipę na liście płac, aby zobaczyć plan na dziś."
                className="py-12 sm:py-14 gap-4"
                action={
                  <WgButton type="button" variant="primary" onClick={() => onNavigate("payroll")} className={cn(WG_TOUCH_MIN, "h-11")}>
                    Otwórz listę płac
                  </WgButton>
                }
              />
            ) : workingToday.length === 0 ? (
              <WgEmptyState
                icon={HardHat}
                title={todayKey ? "Nikt nie jest zaplanowany na dziś" : "Niedziela — wolne"}
                description={offToday.length > 0 ? `${offToday.length} w ekipie tygodnia` : undefined}
                className="py-12 sm:py-14 gap-4"
              />
            ) : (
              <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
                {workingToday.map((emp) => {
                  const { netPay } = calcWeekEmployee(emp);
                  const todayDay = todayKey ? emp.days[todayKey] : null;
                  const todayTimeParts: string[] = [];
                  if (todayDay?.active) todayTimeParts.push(`${todayDay.from}–${todayDay.to}`);
                  for (const ex of todayDay?.extraHours ?? []) {
                    if (hoursWorked(ex.from, ex.to) > 0) todayTimeParts.push(`${ex.from}–${ex.to}`);
                  }
                  const todayH = todayKey ? dayTotalHours(emp.days[todayKey]) : 0;
                  const todayJobs = jobsForEmployeeOnDashboard(emp, jobs, todayIso, weekFrom, weekTo, directory);
                  const streets = todayJobs.map(formatJobStreet);
                  return (
                    <div key={emp.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-secondary/25 transition-colors duration-150 motion-reduce:transition-none">
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                        {emp.name ? emp.name[0].toUpperCase() : "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold truncate">{emp.name || "Bez nazwy"}</p>
                          <p className="text-sm font-semibold shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {fmtH(todayH)}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {todayTimeParts.length > 0 ? todayTimeParts.join(" + ") : "—"}
                          {emp.position ? ` · ${emp.position}` : ""}
                        </p>
                        {streets.length > 0 ? (
                          <p className="text-xs text-primary mt-1 flex items-start gap-1 leading-snug">
                            <MapPin size={11} className="shrink-0 mt-0.5"/>
                            <span>{streets.join(" · ")}</span>
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1 italic">Brak wpisu na robocie na dziś</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">Tydz.: {fmt(netPay)} PLN</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </WgCard>

          {/* Aktywne roboty */}
          <WgCard elevation="soft" padding="sm" radius="md" className="lg:col-span-3 overflow-hidden !p-0">
            <div className="px-5 py-3.5 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-muted-foreground"/>
                <span className="text-sm font-semibold text-foreground">Roboty w trakcie</span>
                {totalReportsActive > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                    {totalReportsActive} dok.
                  </span>
                )}
              </div>
              <WgButton type="button" variant="ghost" onClick={() => onNavigate("jobs")} className="h-auto w-auto p-0 text-xs text-primary hover:underline">
                Wszystkie →
              </WgButton>
            </div>
            {recentJobs.length === 0 ? (
              <WgEmptyState
                icon={MapPin}
                title="Brak aktywnych robót"
                description="Dodaj robotę, aby śledzić postęp na pulpicie."
                className="py-12 sm:py-14 gap-4"
                action={
                  <WgButton type="button" variant="primary" onClick={() => onNavigate("jobs")} className={cn(WG_TOUCH_MIN, "h-11")}>
                    Przejdź do Robot
                  </WgButton>
                }
              />
            ) : (
              <div className="divide-y divide-border">
                {recentJobs.map((job) => {
                  const docsOk = DOCUMENT_TYPES.filter((d) => job.documents[d]).length;
                  const cost = jobTotalCost(job);
                  const reportsN = jobWorkerReports(job).length;
                  const pendingN = (job.photos || []).filter((p) => p.status === "pending").length;
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => onNavigate("jobs", job.id)}
                      className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-secondary/25 transition-colors duration-150 motion-reduce:transition-none text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate">
                            {job.address || "Bez adresu"}
                            {job.flatNumber && <span className="text-muted-foreground font-normal"> m.{job.flatNumber}</span>}
                          </p>
                          {job.keysHandedOver && <KeyRound size={11} className="text-blue-400 shrink-0"/>}
                          {pendingN > 0 && (
                            <span className="text-xs bg-amber-500/15 text-amber-500 px-1.5 py-0.5 rounded-full">{pendingN} zdj.</span>
                          )}
                          {reportsN > 0 && (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{reportsN} dok.</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{job.client || "—"} · od {fmtDate(job.startDate)}</p>
                      </div>
                      <div className="shrink-0 text-right space-y-1.5 min-w-[88px]">
                        <div className="flex items-center gap-1.5 justify-end">
                          <div className="w-14 bg-border rounded-full h-1 overflow-hidden">
                            <div className="bg-primary h-1 rounded-full" style={{ width: `${(docsOk / DOCUMENT_TYPES.length) * 100}%` }}/>
                          </div>
                          <span className="text-xs text-muted-foreground">{docsOk}/{DOCUMENT_TYPES.length}</span>
                        </div>
                        {cost > 0 && (
                          <p className="text-xs font-semibold text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {fmt(cost)} PLN
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </WgCard>
        </div>

        {/* Podsumowanie finansowe + archiwum */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-stretch">
          <WgKpi
            label={`Wypłaty · ${MONTH_NAMES[monthNow]}`}
            value={`${fmt(monthTotal)} PLN`}
            hint={`${monthWeeks.length} tyg. w archiwum`}
            icon={TrendingUp}
            status="info"
          />
          <WgKpi
            label={`Wypłaty · ${yearNow}`}
            value={`${fmt(yearTotal)} PLN`}
            hint={`${yearWeeks.length} tyg. zapisanych`}
            icon={Calendar}
          />
          <WgCard
            as="button"
            type="button"
            elevation="soft"
            padding="sm"
            radius="md"
            onClick={() => onNavigate("archive")}
            className="text-left w-full h-full hover:border-primary/30 transition-colors duration-150 motion-reduce:transition-none"
          >
            <div className="flex items-center gap-2 mb-2">
              <Archive size={14} className="text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Ostatnie tygodnie</span>
            </div>
            {recentWeeks.length === 0 ? (
              <p className="text-xs text-muted-foreground">Brak archiwum — zapisz tydzień w liście płac</p>
            ) : (
              <div className="space-y-1">
                {recentWeeks.map((w) => (
                  <div key={w.id} className="flex justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{fmtDate(w.weekFrom)} – {fmtDate(w.weekTo)}</span>
                    <span className="font-semibold text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(w.totalNet)}</span>
                  </div>
                ))}
              </div>
            )}
          </WgCard>
        </div>

      </div>
    </div>
  );
}

