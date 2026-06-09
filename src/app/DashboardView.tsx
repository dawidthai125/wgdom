import { useMemo } from "react";
import {
  MessageSquare, CalendarDays, Wallet, MapPin, Bell, LayoutGrid, Scale, AlertTriangle,
  FileText, CheckCircle2, Circle, Archive, Camera, Receipt, ClipboardList, ClipboardCheck,
  Calendar, HardHat, KeyRound, TrendingUp,
} from "lucide-react";
import { jobDraftFromTender, type TenderPipelineItem } from "@/lib/tenders-bzp";
import { CommandCenterExecutivePanel } from "@/app/tender-center/components/CommandCenterExecutivePanel";
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
  fmtPlannedHandover,
  HANDOVER_STAGE_LABELS,
  inferHandoverStage,
  computeWmPortfolioStats,
  jobsWithInspectorNotesNeedingAdmin,
} from "@/lib/job-wm";
import { resolveInspectorFeedDeepLink } from "@/lib/inspector-feed-deeplink";
import { jobMissingRequiredDocs } from "@/lib/job-list-status";
import { getReportWorkScopeText } from "@/lib/work-scope-text";
import { computePayrollCashSplitWithCarry } from "@/lib/payroll-carry-forward";
import {
  biweeklyCashContextLine,
  getPayrollClosingWeekRange,
  PAYROLL_WEEK_ROLLOVER_HOUR,
} from "@/lib/payroll-cycle";
import { listPayrollRolloverBlockers } from "@/lib/payroll-rollover";
import type { RecoverableCharge } from "@/lib/recoverable-charges";
import { computeRecoverableChargesAlerts } from "@/lib/recoverable-charges";
import { RecoverableChargesDashboardCard } from "@/app/RecoverableChargesDashboardCard";

export function DashboardView({
  jobs, directory, weekEmployees, weekFrom, weekTo, savedWeeks,
  employeeLeaves = [],
  recoverableCharges = [],
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
  onNavigate: (v: "payroll" | "directory" | "archive" | "jobs" | "schedule" | "inspector" | "recoverablecharges", jobId?: string, payrollEmpId?: string, jobSection?: JobDetailSection) => void;
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
  const isSuperAdmin = adminSession ? adminIsSuperAdmin(adminSession.role) : false;
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
        const missDiff = jobMissingRequiredDocs(b).length - jobMissingRequiredDocs(a).length;
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

  const recoverableChargesAttention = useMemo(
    () => computeRecoverableChargesAlerts(recoverableCharges).attentionCount,
    [recoverableCharges],
  );

  const attentionCount =
    (needsUnsavedWeekAlert ? 1 : 0) +
    (needsPayrollBlockerAlert ? payrollRolloverBlockers.length : 0) +
    consistencyAlerts.length +
    jobsMissingDocs.length +
    pendingPhotos.length +
    pendingReceipts.length +
    pendingReports.length +
    unseenInspectorFeed.length +
    inspectorNotesPending.length +
    wmOverdueJobs.length +
    wmThisWeekJobs.length +
    recoverableChargesAttention;

  const handleFixConsistency = (alert: PayrollJobConsistencyAlert) => {
    onFixJobs((prev) => fixJobsForConsistencyAlert(prev, alert, weekEmployees, weekFrom, weekTo, directory));
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
          "Administrator",
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

  return (
    <div className="flex-1 min-w-0 overflow-y-auto overscroll-contain">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">

        {/* Nagłówek */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Pulpit</h1>
            <p className="text-sm text-muted-foreground capitalize mt-0.5">{todayLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tydzień listy płac: {fmtDate(weekFrom)} – {fmtDate(weekTo)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onOpenSms && (
              <button
                type="button"
                onClick={onOpenSms}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 transition-colors"
              >
                <MessageSquare size={13}/>
                SMS pilne
              </button>
            )}
            {(
              [
                { v: "schedule" as const, icon: CalendarDays, label: "Grafik" },
                { v: "payroll" as const, icon: Wallet, label: "Lista płac" },
                { v: "jobs" as const, icon: MapPin, label: "Roboty" },
              ] as const
            ).map(({ v, icon: Icon, label }) => (
              <button
                key={v}
                type="button"
                onClick={() => onNavigate(v)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border transition-colors"
              >
                <Icon size={13} className="text-primary"/>
                {label}
              </button>
            ))}
          </div>
        </div>

        {showSaturdayBanner && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Bell size={18} className="text-primary shrink-0 mt-0.5"/>
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
            <button
              type="button"
              onClick={() => onNavigate("payroll")}
              className="shrink-0 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {!weekSaved ? "Zapisz tydzień →" : "Lista płac →"}
            </button>
          </div>
        )}

        {/* Skróty liczbowe */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => onNavigate("jobs")}
            className="bg-card border border-border rounded-xl px-4 py-3 text-left hover:border-primary/30 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Roboty w trakcie</p>
            <p className="text-2xl font-bold text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {activeJobs.length}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{completedJobs.length} zdanych</p>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("payroll")}
            className="bg-card border border-border rounded-xl px-4 py-3 text-left hover:border-primary/30 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Wypłata · sob. {fmtDate(weekTo).slice(0, 5)}
            </p>
            <p className="text-2xl font-bold text-primary leading-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {fmt(weekTotal)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {fmtH(weekHours)} · {weekEmployees.length} os.
            </p>
            {payrollContextLine && (
              <p className="text-[10px] text-muted-foreground/90 mt-1 leading-snug">
                {payrollContextLine}
              </p>
            )}
            {payrollCash.hasBiweeklyEmployees && (
              <div className="text-[10px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/60 space-y-0.5">
                <div className="flex justify-between gap-2">
                  <span>Tygodniówki ({payrollCash.weeklyCount} os.)</span>
                  <span className="font-medium text-foreground shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(payrollCash.weeklyNet)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>
                    {payrollCash.isAnyBiweeklyPayoutWeek
                      ? `Co 2 tyg. (${payrollCash.biweeklyCount} os.)`
                      : `Co 2 tyg. (${payrollCash.biweeklyCount} os.) → ${fmtDate(payrollCash.nextBiweeklyPayoutDate).slice(0, 5)}`}
                  </span>
                  <span className="font-medium text-foreground shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmt(payrollCash.isAnyBiweeklyPayoutWeek ? payrollCash.biweeklyPayoutNet : payrollCash.biweeklyAccruedNet)}
                  </span>
                </div>
              </div>
            )}
          </button>
          <button
            type="button"
            onClick={() => onNavigate("directory")}
            className="bg-card border border-border rounded-xl px-4 py-3 text-left hover:border-primary/30 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Ekipa dziś</p>
            <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {workingToday.length}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {weekEmployees.length > 0 ? `${offToday.length} wolne · ${filterProductionActiveDirectory(directory).length} w kartotece` : "brak w liście płac"}
            </p>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("jobs")}
            className="bg-card border border-emerald-500/20 rounded-xl px-4 py-3 text-left hover:border-emerald-500/40 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <LayoutGrid size={10} className="text-emerald-500"/> Aktywne WM
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {wmPortfolioStats.total}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {wmPortfolioStats.overduePlanned > 0 ? `${wmPortfolioStats.overduePlanned} po terminie` : "Roboty →"}
            </p>
          </button>
          <div
            className={`rounded-xl px-4 py-3 border ${
              attentionCount > 0
                ? "bg-amber-500/5 border-amber-500/25"
                : "bg-card border-border"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Do ogarnięcia</p>
            <p
              className={`text-2xl font-bold ${attentionCount > 0 ? "text-amber-400" : "text-muted-foreground"}`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {attentionCount}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {attentionCount > 0 ? "patrz sekcja poniżej" : "wszystko OK"}
            </p>
          </div>
        </div>

        <RecoverableChargesDashboardCard
          charges={recoverableCharges}
          onOpenModule={() => onNavigate("recoverablecharges")}
        />

        {canViewTenders && onOpenTenders && (
          <CommandCenterExecutivePanel
            jobs={jobs}
            directory={directory}
            weekEmployees={weekEmployees}
            weekFrom={weekFrom}
            weekTo={weekTo}
            savedWeeks={savedWeeks}
            onOpenCommandCenter={onOpenTenders}
            onOpenTender={onOpenTender}
            setJobs={setJobs}
            tenderJobUploadedBy={tenderJobUploadedBy}
            onNavigateToJobFromTender={onNavigateToJobFromTender}
            onOpenJob={onOpenJobFromTender}
            onCreateJobFromTender={onCreateJobFromTender}
          />
        )}

        {/* Uwaga dziś */}
        {attentionCount > 0 && (
          <div className="bg-card border border-amber-500/20 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-amber-500/15 flex items-center gap-2 bg-amber-500/5">
              <AlertTriangle size={14} className="text-amber-400 shrink-0"/>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Uwaga dziś</span>
              <span className="text-[10px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full font-bold ml-auto">{attentionCount}</span>
            </div>
            <div className="divide-y divide-border">
              {jobsMissingDocs.length > 0 && (
                <div className="px-4 sm:px-5 py-4 bg-yellow-500/[0.07] border-b border-yellow-500/15">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                        <FileText size={15} className="shrink-0"/>
                        Braki dokumentów — roboty aktywne
                        <span className="text-[10px] bg-yellow-500/20 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded-full font-bold">
                          {jobsMissingDocs.length} {jobsMissingDocs.length === 1 ? "robota" : jobsMissingDocs.length < 5 ? "roboty" : "robót"}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        <span className="text-foreground/90">Kliknij dokument</span> — czerwony = brak, zielony = odebrany.
                        Zakres i obrys/wymiary z dokumentacji ekipy zaznaczają się same (Super Admin może zmienić po potwierdzeniu).
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
                  <div className="space-y-2.5 max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain pr-0.5">
                    {jobsMissingDocsSorted.slice(0, 12).map((job) => {
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
                  {jobsMissingDocsSorted.length > 12 && (
                    <p className="text-[11px] text-muted-foreground mt-2.5">
                      + {jobsMissingDocsSorted.length - 12} kolejnych — zobacz w zakładce Roboty
                    </p>
                  )}
                  {jobsReadyToClose.length > 0 && (
                    <p className="text-[11px] text-green-600 dark:text-green-400 mt-2 flex items-center gap-1.5">
                      <CheckCircle2 size={12}/>
                      {jobsReadyToClose.length} {jobsReadyToClose.length === 1 ? "robota gotowa" : "roboty gotowe"} do zdania (pełny komplet dokumentów)
                    </p>
                  )}
                </div>
              )}
              {needsUnsavedWeekAlert && (
                <div className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
                      <Archive size={14} className="text-primary shrink-0"/>
                      Tydzień niezapisany w archiwum
                      <span className="text-xs text-muted-foreground font-normal">({fmtDate(weekFrom)} – {fmtDate(weekTo)})</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      W niedzielę (po {PAYROLL_WEEK_ROLLOVER_HOUR}:00 — nowy tydzień) tydzień zapisuje się automatycznie, gdy wszyscy rozliczeni. Zapisz ręcznie, jeśli auto-zapis nie zadziałał.
                    </p>
                  </div>
                  <button type="button" onClick={() => onNavigate("payroll")} className="text-xs text-primary hover:underline shrink-0">
                    Zapisz tydzień →
                  </button>
                </div>
              )}
              {needsPayrollBlockerAlert && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Wallet size={14} className="text-yellow-400"/>
                      Wypłata sobotnia bez rozliczenia
                      <span className="text-[10px] bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">
                        {payrollRolloverBlockers.length}
                      </span>
                    </p>
                    <button type="button" onClick={() => onNavigate("payroll")} className="text-xs text-primary hover:underline">
                      Lista płac →
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {payrollRolloverBlockers.slice(0, 8).map((e) => (
                      <span key={e.id} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{e.name || "—"}</span>
                    ))}
                    {payrollRolloverBlockers.length > 8 && (
                      <span className="text-[10px] text-muted-foreground">+ {payrollRolloverBlockers.length - 8}</span>
                    )}
                  </div>
                </div>
              )}
              {consistencyAlerts.length > 0 && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Scale size={14} className="text-orange-400"/>
                      Spójność listy płac ↔ roboty
                      <span className="text-[10px] bg-orange-500/15 text-orange-400 px-1.5 py-0.5 rounded-full font-bold">
                        {consistencyAlerts.length}
                      </span>
                    </p>
                    <button type="button" onClick={() => onNavigate("payroll")} className="text-xs text-primary hover:underline">
                      Lista płac →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {consistencyAlerts.slice(0, 8).map((a, i) => {
                      const canFix =
                        a.kind !== "payroll_only" ||
                        jobs.some((j) => j.status === "in_progress");
                      return (
                        <div key={`${a.name}-${a.dateIso}-${i}`} className="flex items-start justify-between gap-3">
                          <p className="text-xs text-muted-foreground leading-relaxed min-w-0 flex-1">
                            {consistencyAlertMessage(a)}
                          </p>
                          <button
                            type="button"
                            disabled={!canFix}
                            title={
                              canFix
                                ? a.multiSite
                                  ? "Dopasuj sumę godzin — rozdziel między roboty (lista płac ma pierwszeństwo)"
                                  : "Dopasuj roboty do godzin z listy płac"
                                : "Brak aktywnej roboty — dodaj wpis ręcznie w Roboty"
                            }
                            onClick={() => handleFixConsistency(a)}
                            className="shrink-0 text-[10px] px-2.5 py-1 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Popraw
                          </button>
                        </div>
                      );
                    })}
                    {consistencyAlerts.length > 8 && (
                      <p className="text-[10px] text-muted-foreground">+ {consistencyAlerts.length - 8} więcej rozbieżności</p>
                    )}
                  </div>
                </div>
              )}
              {pendingPhotos.length > 0 && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Camera size={14} className="text-yellow-400"/>
                      Zdjęcia od pracowników — do akceptacji
                      <span className="text-[10px] bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">
                        {pendingPhotos.length}
                      </span>
                    </p>
                    <button type="button" onClick={() => onNavigate("jobs")} className="text-xs text-primary hover:underline">
                      Roboty →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {pendingPhotos.slice(0, 5).map(({ photo, job }) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => onNavigate("jobs", job.id)}
                        className="w-full text-left text-xs text-muted-foreground truncate hover:text-foreground transition-colors"
                      >
                        <span className="text-foreground">{job.address || "Bez adresu"}</span>
                        {" · "}
                        <span className="text-foreground/90">{photo.uploadedBy}</span>
                        {photo.caption ? ` — ${photo.caption}` : ""}
                        {" · "}
                        {fmtDate(photo.uploadedAt.slice(0, 10))}
                      </button>
                    ))}
                    {pendingPhotos.length > 5 && (
                      <p className="text-[10px] text-muted-foreground">+ {pendingPhotos.length - 5} więcej</p>
                    )}
                  </div>
                </div>
              )}
              {pendingReceipts.length > 0 && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Receipt size={14} className="text-emerald-400"/>
                      Paragony / faktury do akceptacji
                      <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
                        {pendingReceipts.length}
                      </span>
                    </p>
                    <button type="button" onClick={() => onNavigate("payroll")} className="text-xs text-primary hover:underline">
                      Lista płac →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {pendingReceipts.slice(0, 5).map(({ cost, emp }) => (
                      <button
                        key={cost.id}
                        type="button"
                        onClick={() => onNavigate("payroll", undefined, emp.id)}
                        className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="text-foreground">{emp.name || "—"}</span>
                        {cost.description ? ` — ${cost.description}` : ""}
                        {" · "}
                        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(parseFloat(cost.amount) || 0)} PLN</span>
                        {cost.submittedBy && cost.submittedBy !== emp.name && (
                          <span className="text-muted-foreground"> · od {cost.submittedBy}</span>
                        )}
                      </button>
                    ))}
                    {pendingReceipts.length > 5 && (
                      <p className="text-[10px] text-muted-foreground">+ {pendingReceipts.length - 5} więcej</p>
                    )}
                  </div>
                </div>
              )}
              {pendingReports.length > 0 && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <ClipboardList size={14} className="text-violet-400"/>
                      Nowa dokumentacja od ekipy
                      <span className="text-[10px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full font-bold">
                        {pendingReports.length}
                      </span>
                    </p>
                    <button type="button" onClick={() => onNavigate("jobs")} className="text-xs text-primary hover:underline">
                      Roboty →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {pendingReports.slice(0, 5).map(({ report, job }) => (
                      <button
                        key={report.id}
                        type="button"
                        onClick={() => {
                          acknowledgeReport(job.id, report.id);
                          onNavigate("jobs", job.id);
                        }}
                        className="w-full text-left text-xs text-muted-foreground truncate hover:text-foreground transition-colors"
                      >
                        <span className="text-foreground">{report.workerName}</span>
                        {" · "}
                        {job.address || "Bez adresu"}
                        {getReportWorkScopeText(report).split("\n").find((l) => l.trim()) && ` — ${getReportWorkScopeText(report).split("\n").find((l) => l.trim())!.trim()}`}
                        {" · "}
                        {fmtDate((report.updatedAt || report.submittedAt).slice(0, 10))}
                        {report.updatedAt && report.adminReviewedAt && report.updatedAt > report.adminReviewedAt && (
                          <span className="text-violet-400"> · edyt.</span>
                        )}
                      </button>
                    ))}
                    {pendingReports.length > 5 && (
                      <p className="text-[10px] text-muted-foreground">+ {pendingReports.length - 5} więcej</p>
                    )}
                  </div>
                </div>
              )}
              {unseenInspectorFeed.length > 0 && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <ClipboardCheck size={14} className="text-emerald-500"/>
                      Inspektor — nowe zmiany
                      <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
                        {unseenInspectorFeed.length}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={markInspectorAlertsSeen} className="text-[10px] text-muted-foreground hover:text-foreground">
                        Oznacz przeczytane
                      </button>
                      <button type="button" onClick={() => onNavigate("inspector")} className="text-xs text-primary hover:underline">
                        Inspektor →
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {unseenInspectorFeed.slice(0, 6).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onNavigate("jobs", item.jobId, undefined, resolveInspectorFeedDeepLink(item).section)}
                        className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{item.actor}</span>
                        {" · "}
                        <span className="text-foreground/90">{item.text}</span>
                        {" · "}
                        <span className="text-foreground">{item.jobAddress || "Bez adresu"}</span>
                        {" · "}
                        {fmtDate(item.at.slice(0, 10))}
                      </button>
                    ))}
                    {unseenInspectorFeed.length > 6 && (
                      <p className="text-[10px] text-muted-foreground">+ {unseenInspectorFeed.length - 6} więcej w zakładce Inspektor</p>
                    )}
                  </div>
                </div>
              )}
              {wmOverdueJobs.length > 0 && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Calendar size={14} className="text-red-400"/>
                      WM — termin odbioru minął
                      <span className="text-[10px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full font-bold">
                        {wmOverdueJobs.length}
                      </span>
                    </p>
                    <button type="button" onClick={() => onNavigate("jobs")} className="text-xs text-primary hover:underline shrink-0">
                      Roboty →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {wmOverdueJobs.slice(0, 5).map((job) => (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => onNavigate("jobs", job.id, undefined, "summary")}
                        className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="text-foreground">{job.address || "Bez adresu"}</span>
                        {job.flatNumber ? ` m.${job.flatNumber}` : ""}
                        {" · "}
                        <span className="text-red-400">{fmtPlannedHandover(job.plannedHandoverDate || "")}</span>
                        {" · "}
                        {HANDOVER_STAGE_LABELS[inferHandoverStage(job)]}
                      </button>
                    ))}
                    {wmOverdueJobs.length > 5 && (
                      <p className="text-[10px] text-muted-foreground">+ {wmOverdueJobs.length - 5} więcej</p>
                    )}
                  </div>
                </div>
              )}
              {wmThisWeekJobs.length > 0 && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <CalendarDays size={14} className="text-amber-400"/>
                      WM — odbiór w tym tygodniu
                      <span className="text-[10px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">
                        {wmThisWeekJobs.length}
                      </span>
                    </p>
                    <button type="button" onClick={() => onNavigate("jobs")} className="text-xs text-primary hover:underline shrink-0">
                      Roboty →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {wmThisWeekJobs.slice(0, 5).map((job) => (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => onNavigate("jobs", job.id, undefined, "summary")}
                        className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="text-foreground">{job.address || "Bez adresu"}</span>
                        {job.flatNumber ? ` m.${job.flatNumber}` : ""}
                        {" · "}
                        <span className="text-amber-400">{fmtPlannedHandover(job.plannedHandoverDate || "")}</span>
                        {" · "}
                        {HANDOVER_STAGE_LABELS[inferHandoverStage(job)]}
                      </button>
                    ))}
                    {wmThisWeekJobs.length > 5 && (
                      <p className="text-[10px] text-muted-foreground">+ {wmThisWeekJobs.length - 5} więcej</p>
                    )}
                  </div>
                </div>
              )}
              {inspectorNotesPending.length > 0 && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare size={14} className="text-violet-400"/>
                      Notatki od inspektora
                      <span className="text-[10px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full font-bold">
                        {inspectorNotesPending.length}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={markInspectorAlertsSeen} className="text-[10px] text-muted-foreground hover:text-foreground">
                        Oznacz przeczytane
                      </button>
                      <button type="button" onClick={() => onNavigate("inspector")} className="text-xs text-primary hover:underline">
                        Inspektor →
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {inspectorNotesPending.slice(0, 5).map((job) => {
                      const last = (job.jobNotes || [])[0];
                      if (!last) return null;
                      return (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() => onNavigate("jobs", job.id, undefined, "summary")}
                          className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <span className="text-foreground">{job.address || "Bez adresu"}</span>
                          {" · "}
                          <span className="text-emerald-600 dark:text-emerald-400">{last.author}</span>
                          {": "}
                          {(last.context === "billing" || last.recoverableChargeId)
                            ? `Do rozliczenia: ${last.text.length > 50 ? `${last.text.slice(0, 50)}…` : last.text}`
                            : last.text.length > 60 ? `${last.text.slice(0, 60)}…` : last.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Pracuje dziś — szersza kolumna */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardHat size={13} className="text-primary"/>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pracuje dziś</span>
              </div>
              <button type="button" onClick={() => onNavigate("schedule")} className="text-xs text-primary hover:underline">
                Grafik →
              </button>
            </div>
            {weekEmployees.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Brak pracowników w tym tygodniu.
                <button type="button" onClick={() => onNavigate("payroll")} className="block mx-auto mt-2 text-xs text-primary hover:underline">
                  Otwórz listę płac
                </button>
              </div>
            ) : workingToday.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                {todayKey ? "Nikt nie jest zaplanowany na dziś." : "Niedziela — wolne"}
                {offToday.length > 0 && (
                  <p className="text-xs mt-2">{offToday.length} w ekipie tygodnia</p>
                )}
              </div>
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
                    <div key={emp.id} className="px-5 py-3.5 flex items-start gap-3">
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
                          <p className="text-[10px] text-muted-foreground mt-1 italic">Brak wpisu na robocie na dziś</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">Tydz.: {fmt(netPay)} PLN</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Aktywne roboty */}
          <div className="lg:col-span-3 bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-muted-foreground"/>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Roboty w trakcie</span>
                {totalReportsActive > 0 && (
                  <span className="text-[10px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full font-medium">
                    {totalReportsActive} dok.
                  </span>
                )}
              </div>
              <button type="button" onClick={() => onNavigate("jobs")} className="text-xs text-primary hover:underline">
                Wszystkie →
              </button>
            </div>
            {recentJobs.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">
                Brak aktywnych robót.
                <button type="button" onClick={() => onNavigate("jobs")} className="block mx-auto mt-2 text-xs text-primary hover:underline">
                  Dodaj robotę
                </button>
              </div>
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
                      className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-secondary/20 transition-colors text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate">
                            {job.address || "Bez adresu"}
                            {job.flatNumber && <span className="text-muted-foreground font-normal"> m.{job.flatNumber}</span>}
                          </p>
                          {job.keysHandedOver && <KeyRound size={11} className="text-blue-400 shrink-0"/>}
                          {pendingN > 0 && (
                            <span className="text-[9px] bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded-full">{pendingN} zdj.</span>
                          )}
                          {reportsN > 0 && (
                            <span className="text-[9px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full">{reportsN} dok.</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{job.client || "—"} · od {fmtDate(job.startDate)}</p>
                      </div>
                      <div className="shrink-0 text-right space-y-1.5 min-w-[88px]">
                        <div className="flex items-center gap-1.5 justify-end">
                          <div className="w-14 bg-border rounded-full h-1 overflow-hidden">
                            <div className="bg-primary h-1 rounded-full" style={{ width: `${(docsOk / DOCUMENT_TYPES.length) * 100}%` }}/>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{docsOk}/{DOCUMENT_TYPES.length}</span>
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
          </div>
        </div>

        {/* Podsumowanie finansowe + archiwum */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingUp size={16} className="text-primary"/>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Wypłaty · {MONTH_NAMES[monthNow]}</p>
              <p className="text-lg font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(monthTotal)} PLN</p>
              <p className="text-[10px] text-muted-foreground">{monthWeeks.length} tyg. w archiwum</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <Calendar size={16} className="text-muted-foreground"/>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Wypłaty · {yearNow}</p>
              <p className="text-lg font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(yearTotal)} PLN</p>
              <p className="text-[10px] text-muted-foreground">{yearWeeks.length} tyg. zapisanych</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("archive")}
            className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <Archive size={14} className="text-muted-foreground"/>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Ostatnie tygodnie</span>
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
          </button>
        </div>

      </div>
    </div>
  );
}

