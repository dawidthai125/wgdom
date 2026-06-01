import { useState, useCallback, useMemo, useEffect, useRef, Fragment, createContext, useContext, lazy, Suspense, type RefObject } from "react";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";
import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import { AdminSidebar } from "@/app/admin/AdminSidebar";
import { AdminTopbar } from "@/app/admin/AdminTopbar";
import { GlobalSearchPanel } from "@/app/admin/GlobalSearchPanel";
import { AdminViewRouter } from "@/app/admin/AdminViewRouter";
import { AdminMobileNav } from "@/app/admin/AdminMobileNav";
import { buildAdminNavItems, splitMobileNav, type View } from "@/app/admin/admin-nav";
import { ClientShareView } from "@/app/ClientShareView";
import { ContactsView } from "@/app/ContactsView";
import { DirectoryView } from "@/app/DirectoryView";
import { ArchiveView } from "@/app/ArchiveView";
import { ScheduleView } from "@/app/ScheduleView";
import { useWorkerPrivacyShield } from "@/app/hooks/useWorkerPrivacyShield";
import { EmployeeSmsModal } from "@/app/EmployeeSmsModal";
import { SmsModalErrorBoundary } from "@/app/SmsModalErrorBoundary";
import { HiddenFileInput } from "@/app/HiddenFileInput";
import type { TendersDashboardStats } from "@/lib/tenders-bzp";
import { appendJobActivity } from "@/lib/job-activity";
import { useWheelScrollForward } from "@/lib/wheel-scroll-forward";
import { countBrowserFiles, jobHasBrowserFiles } from "@/lib/job-files-browser";
import { downloadJobGalleryZip } from "@/lib/photo-download";
import type { CrewPhotoLabel } from "@/lib/photo-labels";
import {
  Calculator, Clock, Banknote, User, Plus, Trash2,
  ChevronRight, ChevronLeft, Users, FileText, FileDown, CheckCircle2,
  Circle, Archive, ChevronDown, ChevronUp,
  Calendar, CalendarDays, TrendingUp, Wallet, X, Phone,
  UserPlus, Edit2, Check, Search, Building2, MapPin, KeyRound,
  LayoutDashboard, Package, Receipt, AlertTriangle, Download, Upload,
  HardHat, StickyNote, Cloud, CloudUpload, CloudOff,
  Mic, MicOff, Bell, Copy, ScrollText, Sparkles,
  BookOpen, ChevronDown as ChevDown, HelpCircle, Smartphone, Monitor,
  Camera, ImagePlus, Lock, LogOut, Eye, ArrowLeft, ShieldCheck, ThumbsUp, ThumbsDown, Clock3,
  ClipboardList, Ruler, Mail, Send, RotateCcw, BarChart3, Scale, Images, Settings, Menu, ClipboardCheck, MessageSquare, LayoutGrid, FolderOpen, PanelLeft,
} from "lucide-react";
import {
  API_BASE,
  API_HEADERS,
  DATA_KEYS,
  pushKeysToCloud,
  pushAllDataToCloud,
  fetchKeysFromCloud,
  normalizeJobsValue,
  mergeJobsById,
  fetchJobsBackupStatus,
  restoreCloudJobsBackup,
  mergeWeekEmployees,
  weekEmployeesSamePerson,
  mergeArchive,
  mergeDirectory,
  mergeContacts,
  mergeDataKey,
  readLocalStorageDataKey,
  isDataKey,
  isValidJobRecord,
  pushKeysToCloudSafe,
  pullAndMergeDataBundle,
  pushMergedDataBundleToCloud,
  type DataKey,
  weekEmployeesListRichness,
  fetchPayrollBackupStatus,
  restoreCloudPayrollBackup,
  fetchFullDataBackupStatus,
  restoreAllCloudDataBackup,
  addDeletedJobId,
  pushJobsAfterDelete,
  getDeletedJobIds,
  mergeDeletedJobIds,
  saveDeletedJobIds,
  normalizeDeletedJobIds,
  JOBS_DELETED_IDS_KEY,
  DIRECTORY_DELETED_IDS_KEY,
  getDeletedDirectoryIds,
  saveDeletedDirectoryIds,
  mergeDeletedDirectoryIds,
  mergeDeletedContactsIds,
  mergeDeletedArchiveIds,
  saveDeletedContactsIds,
  saveDeletedArchiveIds,
  getDeletedContactsIds,
  getDeletedArchiveIds,
  normalizeDeletedDirectoryIds,
  CONTACTS_DELETED_IDS_KEY,
  ARCHIVE_DELETED_IDS_KEY,
  addDeletedDirectoryId,
  addDeletedContactId,
  addDeletedArchiveId,
  pushDirectoryToCloud,
  pushWeekEmployeesToCloud,
  stripWorkerPinHashesFromDirectory,
  WORKER_PINS_RESET_FLAG,
  ADMIN_PASSWORDS_KEY,
  ADMIN_USERS_CONFIG_KEY,
  APP_SETTINGS_KEY,
  isSupabaseConfigured,
} from "@/lib/cloud-sync";
import { saveLocalDataSnapshot, restoreLocalDataSnapshot, listLocalDataSnapshots, readLocalDataBundle } from "@/lib/local-data-backup";
import { saveLocalJobsSnapshot, restoreLocalJobsSnapshot, listLocalJobsSnapshots } from "@/lib/jobs-safety";
import {
  type AdminSession,
  listAdminUsersForLogin,
  listInspectorUsersForLogin,
  verifyAdminLogin,
  adminCanViewRates,
  adminRoleLabel,
  adminIsSuperAdmin,
  adminCanViewTendersTab,
  loadAdminSessionFromStorage,
  saveAdminSessionToStorage,
  adminRememberEnabled,
  saveRememberedAdminPassword,
  loadRememberedAdminPassword,
  clearRememberedAdminPassword,
  setAdminUserPassword,
  resetAdminUserPassword,
  loadAdminPasswordOverrides,
  mergeAdminPasswordOverrides,
  loadAdminUsersConfig,
  mergeAdminUsersConfig,
  listAdminUsersForManagement,
  setAdminUserRole,
  createAdminUser,
  deleteAdminUser,
  setAdminUserPhone,
  digestSha256Hex,
  type AdminAssignableRole,
} from "@/lib/admin-auth";
const InspectorPanel = lazy(() =>
  import("@/app/InspectorPanel").then((m) => ({ default: m.InspectorPanel })),
);
import type { DayKey, DirectoryEmployee, DayData, EmployeeExtraCost, WeekEmployee, WeekSnapshot, DocType, PhotoEntry, RoomTypeKey, RoomDimension, WorkerJobReport, Job, PayrollJobConsistencyAlert, JobGalleryBucket } from "@/app/app-domain";
import { DAYS, MULTI_SITE_SCHEDULE_LABEL, MONTH_NAMES, DOCUMENT_TYPES, REQUIRED_DOCS, DOC_LABELS, ROOM_TYPE_LABELS, defaultDirEmployee, isTestDirectoryEmployee, isProductionDirectoryEmployee, filterProductionDirectory, filterProductionActiveDirectory, filterProductionWeekEmployees, normalizeDirectoryTestFlags, PHOTO_LABEL_NAMES, PHOTO_LABEL_ORDER, PHOTO_LABEL_SECTION, weekEmployeeFromDir, hoursWorked, dayTotalHours, payrollJobConsistencyAlerts, buildEmployeeArchiveStats, consistencyAlertMessage, fmt, fmtH, fmtDate, getWeekRange, calcWeekEmployee, extraCostStatus, PHOTO_STATUS_LABELS, EXTRA_COST_STATUS_LABELS, workerTodayWorkInfo, fixJobsForConsistencyAlert, defaultJob, normalizeJobsList, jobDaysSinceStart, jobWorkerReports, reportNeedsAdminAttention, normalizeWorkerReport, workItemHasContent, roomHasContent, roomDisplayName, defaultRoom, jobCost, jobMaterialsCost, jobTotalCost, GALLERY_ARCHIVE_DAYS, jobDisplayTitle, jobApprovedPhotos, jobHandoverIso, jobGalleryBucket, galleryDaysUntilArchive, todayDayKey, localIsoDate, todayIsoDate, fridayIsoOfWeek, findWeekEmployeeForWorker, workerPayoutHistory, todayFieldWorkStats, jobsForEmployeeOnDashboard, weekDayColumns, scheduleCellFor, buildWeekSnapshot, scheduleCellFromArchive, formatJobStreet, workerHasPhonePin, workerPhonePinValid, workerHasPersonalPin, workerPinTooWeak, applyWriteTimestamps } from "@/app/app-domain";
import { AdminAccessContext, useAdminAccess } from "@/app/admin-access";
import { Checkbox, StatCard, NavItemWithHint, LabelWithHint, VoiceNoteButton, PayrollDayCellDisplay } from "@/app/app-ui";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";
import { JobCostBreakdownPanel } from "@/app/JobCostBreakdownPanel";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { isPdfFilename, isKosztorysPreviewExt } from "@/lib/ath-parser";
import {
  appendJobActivity,
  collectInspectorFeed,
  isInspectorActivityType,
  type JobActivity,
  type JobActivityType,
} from "@/lib/job-activity";
import {
  latestJobFile,
  syncJobDocuments,
  isReportSyncedDocLocked,
  confirmReportSyncedDocUncheck,
  applyReportDocDocumentToggle,
  clearReportDocSaOverrideFromReport,
  removeJobFileAttachment,
  resolveJobFileStoragePath,
  type InspectorJobFileKind,
} from "@/lib/job-documents";
import { deleteJobFile, uploadJobFile } from "@/lib/job-file-upload";
import {
  recordInspectorEvent,
  markInspectorFeedSeen,
  markAdminJobNotesSeen,
  getUnseenInspectorFeed,
  getAdminJobNotesSeenAt,
  syncAlertsSeenFromCloud,
  countUnseenInspectorAlerts,
} from "@/lib/inspector-stats";
import {
  normalizeJobWmFields,
  jobsWithInspectorNotesNeedingAdmin,
  isWmClient,
  wmJobsWithOverduePlanned,
  wmJobsPlannedThisWeek,
  fmtPlannedHandover,
  HANDOVER_STAGE_LABELS,
  inferHandoverStage,
  computeWmPortfolioStats,
  removeInspectorPhoto,
} from "@/lib/job-wm";
import { JobWmStageBadge, JobWmPlannedBadge } from "@/app/JobWmPanel";
import { JobListFilterBar, JobListLegend, JobListPrimaryBadge, JobPhasePicker, applyJobPhase } from "@/app/JobListStatus";
import { JobListCard } from "@/app/JobListCard";
import { JobAllFilesView, JobFileCatalogList } from "@/app/JobAllFilesView";
import { JobDetailSectionNav, JobsDetailEmptyState, type JobDetailSection } from "@/app/JobDetailSectionNav";
import { InspectorJobFileUpload } from "@/app/InspectorJobFileUpload";
import { collectJobFileCatalog, countJobFiles, type JobFileCatalogItem } from "@/lib/job-files-index";
import {
  countJobsByListFilter,
  inferJobPhase,
  jobMatchesListFilter,
  jobMissingRequiredDocs,
  JOB_PHASE_LABELS,
  type JobListFilter,
  type JobPhase,
} from "@/lib/job-list-status";
import { JobMetaPickers, JobMetaBadges } from "@/app/JobMetaPickers";
import { normalizeJobMetaFields, isJobHousingSet, HOUSING_TYPE_LABELS, STOVE_TYPE_LABELS_FULL, type HousingType, type StoveType } from "@/lib/job-meta";
import { syncAppSettingsFromCloud, saveAppSettings, loadAppSettingsLocal, mergeAppSettings, type AppSettings } from "@/lib/app-settings";
import {
  resetTendersPipeline,
  resetTendersKeywords,
  resetTendersCompanyProfile,
  resetAllTendersSection,
} from "@/lib/tenders-admin";
import {
  mergeTenderDataKey,
  TENDERS_PIPELINE_KEY,
  TENDERS_COMPANY_PROFILE_KEY,
  TENDERS_CUSTOM_KEYWORDS_KEY,
} from "@/lib/tenders-sync";
import { WorkScopeEditor, WorkScopeDisplay } from "@/app/WorkScopeEditor";
import { JobReportForm } from "@/app/JobReportForm";
import {
  getReportWorkScopeText,
  reportHasWorkScope,
  scopeTextHasContent,
  scopeTextLineCount,
  scopeTextToWorkItems,
  workItemsToScopeText,
} from "@/lib/work-scope-text";
import { saveAs } from "file-saver";
import { watermarkedFile, jobWatermarkLines } from "@/lib/photo-watermark";
import { queuePhoto, listQueuedPhotos, removeQueuedPhoto, queuedPhotoCount } from "@/lib/photo-queue";
import { consumePendingDeepLink, type DeepLinkRoute } from "@/lib/deep-link";
import { markCloudBootstrapSuccess, initialAutoSyncSuppressUntil } from "@/lib/cloud-bootstrap";
import { PwaInstallBanner } from "@/app/PwaInstallBanner";
import { PullToRefreshIndicator, usePullToRefresh } from "@/app/usePullToRefresh";
import { onNativeAppResume, registerNativeBackHandler } from "@/lib/native-app-bridge";
import { Toaster, toast } from "sonner";
import {
  type EmailContact,
  defaultEmailContact,
  contactsForJobs,
  contactsForPayroll,
  contactAllowsJobs,
  contactAllowsPayroll,
} from "@/lib/email-contacts";
import {
  type PayrollCalcRow,
  type PayrollExportTotals,
  type PayrollWeeklyGrid,
  buildPayrollEmailHtml,
  generatePayrollPdfBlob,
  generatePayrollWordBlob,
  buildPayrollExtraCostLines,
  type PayrollJobWorkLine,
  blobToBase64,
} from "@/lib/payroll-export";
import {
  computePayrollCashSplit,
  biweeklyMissingPrevWeekArchive,
  biweeklyCashContextLine,
  calcWeekNetNoPrevSat,
  getPayrollWeekRange,
  getPayrollClosingWeekRange,
  PAYROLL_WEEK_ROLLOVER_HOUR,
} from "@/lib/payroll-cycle";

/** Sync z chmury — nie nadpisuj settledUpdatedAt przy apply merge (unikaj fałszywego „cofnięcia” rozliczenia). */
let skipApplyWriteTimestamps = false;

function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback((v: T | ((p: T) => T)) => {
    setState((prev) => {
      const incoming = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      if (Object.is(prev, incoming)) return prev;
      if (!isDataKey(key)) {
        try { localStorage.setItem(key, JSON.stringify(incoming)); } catch { /* ignore */ }
        return incoming;
      }
      const next = (skipApplyWriteTimestamps ? incoming : applyWriteTimestamps(key, prev, incoming)) as T;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [key]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue == null) return;
      try { setState(JSON.parse(e.newValue) as T); } catch { /* ignore */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);
  return [state, set];
}

const KW_LAST_BACKUP_WEEK_KEY = "kw-last-backup-week";

function collectLocalBackupData(overrides?: Partial<Record<string, unknown>>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const k of DATA_KEYS) {
    const v = localStorage.getItem(k);
    if (v) {
      try { data[k] = JSON.parse(v); } catch { /* ignore */ }
    }
  }
  if (overrides) Object.assign(data, overrides);
  return data;
}

/** Email backup — w niedzielę, raz na zarchiwizowany tydzień (po zapisie listy płac). */
function triggerWeeklyBackupEmail(
  archivedWeekFrom: string,
  archivedWeekTo: string,
  jobsForSnapshot: Job[],
  archiveOverride?: WeekSnapshot[],
): void {
  if (new Date().getDay() !== 0) return;
  if (localStorage.getItem(KW_LAST_BACKUP_WEEK_KEY) === archivedWeekFrom) return;

  const data = collectLocalBackupData(
    archiveOverride ? { "kw-archive": archiveOverride } : undefined,
  );
  if (Object.keys(data).length === 0) return;

  localStorage.setItem(KW_LAST_BACKUP_WEEK_KEY, archivedWeekFrom);
  if (jobsForSnapshot.length > 0) saveLocalJobsSnapshot(jobsForSnapshot);

  fetch(`${API_BASE}/send-backup-email`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({
      data,
      date: localIsoDate(),
      weekFrom: archivedWeekFrom,
      weekTo: archivedWeekTo,
    }),
  }).catch(() => {});
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardView({
  jobs, directory, weekEmployees, weekFrom, weekTo, savedWeeks,
  onNavigate, onFixJobs, adminUserId, alertsSeenTick, onAlertsSeen, onOpenSms,
  tendersStats, onOpenTenders, onOpenTender, canViewTenders,
}: {
  jobs: Job[];
  directory: DirectoryEmployee[];
  weekEmployees: WeekEmployee[];
  weekFrom: string; weekTo: string;
  savedWeeks: WeekSnapshot[];
  onNavigate: (v: "payroll" | "directory" | "archive" | "jobs" | "schedule" | "inspector", jobId?: string, payrollEmpId?: string, inspectorTab?: "activity" | "portfolio") => void;
  onFixJobs: (updater: (prev: Job[]) => Job[]) => void;
  adminUserId?: string;
  alertsSeenTick: number;
  onAlertsSeen: () => void;
  onOpenSms?: () => void;
  tendersStats?: TendersDashboardStats | null;
  onOpenTenders?: () => void;
  onOpenTender?: (tenderId: string) => void;
  canViewTenders?: boolean;
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
    () => computePayrollCashSplit(weekEmployees, directory, weekFrom, weekTo, savedWeeks, (e) => calcWeekEmployee(e).netPay),
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
            .filter((p) => p.status === "pending")
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
  const unsettledEmployees = weekEmployees.filter((e) => !e.settled);
  const dayOfWeek = new Date().getDay();
  const isFriday = dayOfWeek === 5;
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;
  const showSaturdayBanner =
    isSaturday && isOnClosingWeek && weekEmployees.length > 0 && (!weekSaved || unsettledEmployees.length > 0);

  // Auto-zapis w niedzielę (nie w sobotę — wypłaty ukraińców w sobotę popołudniu)
  const needsUnsavedWeekAlert =
    weekEmployees.length > 0 && !weekSaved && isOnClosingWeek && isSunday;
  // Rozliczenie: przypomnienie od piątku; także gdy tydzień zostaje w tyle (np. Nd po 20:00 bez przejścia)
  const needsUnsettledAlert =
    unsettledEmployees.length > 0 && (
      payrollWeekBehind
      || (isCurrentPayrollWeek && (isFriday || isSaturday || isSunday))
    );

  const attentionCount =
    (needsUnsavedWeekAlert ? 1 : 0) +
    (needsUnsettledAlert ? unsettledEmployees.length : 0) +
    consistencyAlerts.length +
    jobsMissingDocs.length +
    pendingPhotos.length +
    pendingReceipts.length +
    pendingReports.length +
    unseenInspectorFeed.length +
    inspectorNotesPending.length +
    wmOverdueJobs.length +
    wmThisWeekJobs.length;

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
    <div className="flex-1 overflow-y-auto overscroll-contain">
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
                  {unsettledEmployees.length > 0 && (
                    <>{unsettledEmployees.length} {unsettledEmployees.length === 1 ? "osoba oczekuje" : "osób oczekuje"} na rozliczenie: {unsettledEmployees.slice(0, 4).map((e) => e.name.split(" ")[0]).join(", ")}{unsettledEmployees.length > 4 ? "…" : ""}.</>
                  )}
                  {weekSaved && unsettledEmployees.length === 0 && "Tydzień zapisany — sprawdź, czy wszyscy mają status Rozliczony."}
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
            onClick={() => onNavigate("inspector", undefined, undefined, "portfolio")}
            className="bg-card border border-emerald-500/20 rounded-xl px-4 py-3 text-left hover:border-emerald-500/40 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <LayoutGrid size={10} className="text-emerald-500"/> Aktywne WM
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {wmPortfolioStats.total}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {wmPortfolioStats.overduePlanned > 0 ? `${wmPortfolioStats.overduePlanned} po terminie` : "Portfolio WM →"}
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

        {canViewTenders && tendersStats && onOpenTenders && (
          <button
            type="button"
            onClick={onOpenTenders}
            className="w-full bg-card border border-violet-500/25 rounded-xl px-4 py-3 text-left hover:border-violet-500/50 transition-colors flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                <Scale size={18} className="text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">Przetargi BZP</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tendersStats.actionable} do zgłoszenia
                  {tendersStats.interested > 0 && ` · ${tendersStats.interested} w analizie`}
                  {tendersStats.funnel.winRate != null && ` · skuteczność ${tendersStats.funnel.winRate}%`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {tendersStats.urgent > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
                  {tendersStats.urgent} termin ≤7 dni
                </span>
              )}
              {(tendersStats.alerts?.length ?? 0) > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 font-medium">
                  {tendersStats.alerts!.length} do ogarnięcia
                </span>
              )}
              <span className="px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">Otwórz →</span>
            </div>
          </button>
        )}

        {canViewTenders && tendersStats && onOpenTender && (tendersStats.alerts?.length ?? 0) > 0 && (
          <div className="bg-card border border-violet-500/20 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-violet-500/15 bg-violet-500/5 flex items-center gap-2">
              <Scale size={14} className="text-violet-600 dark:text-violet-400 shrink-0" />
              <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">Przetargi — wymaga działania</span>
            </div>
            <ul className="divide-y divide-border">
              {tendersStats.alerts!.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onOpenTender(a.tenderId)}
                    className="w-full text-left px-4 py-2.5 hover:bg-secondary/40 transition-colors"
                  >
                    <p className={`text-xs font-medium ${a.tone === "red" ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}`}>
                      {a.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{a.message}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
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
                        Zakres i rysunek/wymiary z raportu ekipy zaznaczają się same (Super Admin może zmienić po potwierdzeniu).
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
                                      ? `${DOC_LABELS[doc]} — z raportu (Super Admin: kliknij, aby zmienić status)`
                                      : locked
                                        ? `${DOC_LABELS[doc]} — potwierdzone raportem (nie można odznaczyć)`
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
              {needsUnsettledAlert && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Wallet size={14} className="text-yellow-400"/>
                      Nierozliczeni pracownicy
                      <span className="text-[10px] bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">
                        {unsettledEmployees.length}
                      </span>
                    </p>
                    <button type="button" onClick={() => onNavigate("payroll")} className="text-xs text-primary hover:underline">
                      Lista płac →
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {unsettledEmployees.slice(0, 8).map((e) => (
                      <span key={e.id} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{e.name || "—"}</span>
                    ))}
                    {unsettledEmployees.length > 8 && (
                      <span className="text-[10px] text-muted-foreground">+ {unsettledEmployees.length - 8}</span>
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
                      Nowe raporty od pracowników
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
                        onClick={() => onNavigate("inspector", item.jobId)}
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
                    <button type="button" onClick={() => onNavigate("inspector", undefined, undefined, "portfolio")} className="text-xs text-primary hover:underline shrink-0">
                      Portfolio WM →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {wmOverdueJobs.slice(0, 5).map((job) => (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => onNavigate("inspector", job.id, undefined, "portfolio")}
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
                    <button type="button" onClick={() => onNavigate("inspector", undefined, undefined, "portfolio")} className="text-xs text-primary hover:underline shrink-0">
                      Portfolio WM →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {wmThisWeekJobs.slice(0, 5).map((job) => (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => onNavigate("inspector", job.id, undefined, "portfolio")}
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
                          onClick={() => onNavigate("inspector", job.id)}
                          className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <span className="text-foreground">{job.address || "Bez adresu"}</span>
                          {" · "}
                          <span className="text-emerald-600 dark:text-emerald-400">{last.author}</span>
                          {": "}
                          {last.text.length > 60 ? `${last.text.slice(0, 60)}…` : last.text}
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
                    {totalReportsActive} rap.
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
                            <span className="text-[9px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full">{reportsN} rap.</span>
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

// ─── Ustawienia admina (Super Administrator) ───────────────────────────────────

interface AdminBackupTools {
  exportBackup: () => void;
  importBackup: (file: File) => void;
  restoreAllDataFromCloud: (source: "prev" | "prev2" | "today") => void;
  restoreAllDataFromLocal: () => void;
  restorePayrollFromCloud: (source?: "prev" | "prev2") => void;
  restoreJobsFromCloud: (source: "prev" | "prev2" | "today") => void;
  restoreJobsFromLocal: () => void;
  restoreBusy: boolean;
  jobsBackupStatus: { current: number; prev: number; prev2: number; today: number } | null;
  payrollBackupStatus: { employeesPrev: number; employeesPrev2: number; archivePrev: number } | null;
  fullDataBackupStatus: { dailyBackupDate: string | null; hasPrev: boolean } | null;
  localDataSnapshotLabel: string | null;
}

function AdminSettingsModal({
  onClose,
  appSettings,
  onAppSettingsChange,
  backupTools,
}: {
  onClose: () => void;
  appSettings: AppSettings;
  onAppSettingsChange: (next: AppSettings) => void;
  backupTools: AdminBackupTools;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const users = useMemo(() => listAdminUsersForManagement(), [refreshKey]);
  const [drafts, setDrafts] = useState<Record<string, { pw: string; pw2: string; show: boolean }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ userId: string; text: string; ok: boolean } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLogin, setNewLogin] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [newRole, setNewRole] = useState<AdminAssignableRole>("moderator");
  const [newShow, setNewShow] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addMsg, setAddMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [phoneDrafts, setPhoneDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const u of users) {
        if (!next[u.id]) next[u.id] = { pw: "", pw2: "", show: false };
      }
      return next;
    });
    setPhoneDrafts((prev) => {
      const next = { ...prev };
      for (const u of users) {
        if (!(u.id in next)) next[u.id] = u.phone;
      }
      return next;
    });
  }, [users]);

  const reload = () => setRefreshKey((k) => k + 1);

  const updateDraft = (userId: string, patch: Partial<{ pw: string; pw2: string; show: boolean }>) => {
    setDrafts((prev) => ({ ...prev, [userId]: { ...prev[userId], ...patch } }));
    setMsg(null);
  };

  const handlePhoneSave = async (userId: string) => {
    setBusyId(userId);
    setMsg(null);
    try {
      await setAdminUserPhone(userId, phoneDrafts[userId] ?? "");
      reload();
      setMsg({ userId, text: "Numer zapisany", ok: true });
    } catch (err) {
      setMsg({ userId, text: err instanceof Error ? err.message : "Nie udało się zapisać numeru", ok: false });
    } finally {
      setBusyId(null);
    }
  };

  const handleRoleChange = async (userId: string, role: AdminAssignableRole) => {
    setBusyId(userId);
    setMsg(null);
    try {
      await setAdminUserRole(userId, role);
      reload();
      setMsg({ userId, text: `Rola zmieniona na ${adminRoleLabel(role)}`, ok: true });
    } catch (err) {
      setMsg({ userId, text: err instanceof Error ? err.message : "Nie udało się zmienić roli", ok: false });
    } finally {
      setBusyId(null);
    }
  };

  const handleSave = async (userId: string) => {
    const d = drafts[userId];
    if (!d) return;
    if (d.pw.length < 6) {
      setMsg({ userId, text: "Hasło musi mieć co najmniej 6 znaków", ok: false });
      return;
    }
    if (d.pw !== d.pw2) {
      setMsg({ userId, text: "Hasła nie pasują", ok: false });
      return;
    }
    setBusyId(userId);
    setMsg(null);
    try {
      await setAdminUserPassword(userId, d.pw);
      setDrafts((prev) => ({ ...prev, [userId]: { pw: "", pw2: "", show: false } }));
      reload();
      setMsg({ userId, text: "Hasło zmienione — działa na wszystkich urządzeniach po sync", ok: true });
    } catch (err) {
      setMsg({ userId, text: err instanceof Error ? err.message : "Nie udało się zapisać", ok: false });
    } finally {
      setBusyId(null);
    }
  };

  const handleReset = async (userId: string) => {
    if (!window.confirm("Przywrócić hasło fabryczne (startowe) dla tego użytkownika?")) return;
    setBusyId(userId);
    setMsg(null);
    try {
      await resetAdminUserPassword(userId);
      setDrafts((prev) => ({ ...prev, [userId]: { pw: "", pw2: "", show: false } }));
      reload();
      setMsg({ userId, text: "Przywrócono hasło startowe", ok: true });
    } catch (err) {
      setMsg({ userId, text: err instanceof Error ? err.message : "Nie udało się przywrócić", ok: false });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (userId: string, displayName: string) => {
    if (!window.confirm(`Usunąć użytkownika ${displayName}?`)) return;
    setBusyId(userId);
    setMsg(null);
    try {
      await deleteAdminUser(userId);
      reload();
      setMsg(null);
    } catch (err) {
      setMsg({ userId, text: err instanceof Error ? err.message : "Nie udało się usunąć", ok: false });
    } finally {
      setBusyId(null);
    }
  };

  const handleAddUser = async () => {
    setAddMsg(null);
    if (newLogin.trim().length < 2) {
      setAddMsg({ text: "Login musi mieć co najmniej 2 znaki", ok: false });
      return;
    }
    if (newPw.length < 6) {
      setAddMsg({ text: "Hasło musi mieć co najmniej 6 znaków", ok: false });
      return;
    }
    if (newPw !== newPw2) {
      setAddMsg({ text: "Hasła nie pasują", ok: false });
      return;
    }
    setAddBusy(true);
    try {
      await createAdminUser({ login: newLogin.trim(), password: newPw, role: newRole });
      setNewLogin("");
      setNewPw("");
      setNewPw2("");
      setNewRole("moderator");
      setShowAddForm(false);
      reload();
      setAddMsg({ text: "Użytkownik dodany", ok: true });
    } catch (err) {
      setAddMsg({ text: err instanceof Error ? err.message : "Nie udało się dodać użytkownika", ok: false });
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="bg-card rounded-t-2xl md:rounded-2xl border border-border w-full max-w-lg shadow-2xl max-h-[92dvh] flex flex-col" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-primary"/>
            <span className="text-sm font-semibold">Ustawienia administratorów</span>
          </div>
          <button type="button" onClick={onClose} className="touch-target p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X size={16}/>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tylko Super Administrator. Hasła i role synchronizowane w chmurze — obowiązują na telefonie i komputerze.
          </p>

          <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
              Funkcje aplikacji
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={appSettings.athPreviewEnabled}
                onChange={async (e) => {
                  const next = { ...appSettings, athPreviewEnabled: e.target.checked };
                  onAppSettingsChange(next);
                  await saveAppSettings(next);
                }}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">Podgląd kosztorysów ATH/NOR w przeglądarce</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                  Włączone domyślnie (best-effort dla plików .ath z NORMA). Super Admin może wyłączyć.
                  PDF zawsze można podglądać; pobieranie i email działają niezależnie od tego przełącznika.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={appSettings.tendersTabForStaffEnabled}
                onChange={async (e) => {
                  const next = { ...appSettings, tendersTabForStaffEnabled: e.target.checked };
                  onAppSettingsChange(next);
                  await saveAppSettings(next);
                }}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">Zakładka Przetargi dla administratorów i moderatorów</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                  Wyłączone domyślnie. Super Administrator zawsze widzi Przetargi w menu.
                  Po włączeniu — Administrator i Moderator też mają dostęp do pipeline BZP (wspólna chmura).
                </p>
              </div>
            </label>
          </div>

          <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
              Przetargi BZP — skan i reset
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {([
                ["bzpScanDays", "Dni wstecz", 7, 365],
                ["bzpScanPages", "Strony PL02", 1, 20],
                ["bzpScanOrgPages", "Strony / org", 1, 20],
                ["bzpAutoRefreshHours", "Auto-sync (h)", 1, 168],
              ] as const).map(([key, label, min, max]) => (
                <label key={key} className="text-[10px] text-muted-foreground">
                  {label}
                  <input
                    type="number"
                    min={min}
                    max={max}
                    value={appSettings[key]}
                    onChange={async (e) => {
                      const v = Math.max(min, Math.min(max, parseInt(e.target.value, 10) || min));
                      const next = { ...appSettings, [key]: v };
                      onAppSettingsChange(next);
                      await saveAppSettings(next);
                    }}
                    className="mt-0.5 w-full bg-secondary rounded-lg px-2 py-1.5 text-xs border border-border"
                  />
                </label>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Pipeline, profil firmy i słownik synchronizują się w chmurze (<code>kw-tenders-*</code>) — backup JSON je obejmuje.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {([
                ["Wyczyść pipeline", resetTendersPipeline],
                ["Reset słownika", resetTendersKeywords],
                ["Reset profilu firmy", resetTendersCompanyProfile],
                ["Reset całej sekcji", resetAllTendersSection],
              ] as const).map(([label, fn]) => (
                <button
                  key={label}
                  type="button"
                  onClick={async () => {
                    if (!window.confirm(`${label}? Tej operacji nie można cofnąć.`)) return;
                    try {
                      await fn();
                      alert(`${label} — gotowe. Odśwież zakładkę Przetargi.`);
                    } catch (e) {
                      alert(e instanceof Error ? e.message : "Błąd resetu");
                    }
                  }}
                  className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-[10px] font-medium"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Kopie zapasowe
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Przywracanie scala dane z chmurą — bogatsze wpisy wygrywają (jak przy starcie aplikacji). Eksport / import dostępny też w górnym pasku dla wszystkich adminów.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={backupTools.exportBackup} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-medium transition-colors">
                <Download size={13}/>Eksportuj backup
              </button>
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-medium transition-colors cursor-pointer">
                <Upload size={13}/>Importuj backup
                <input type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) backupTools.importBackup(f); e.target.value = ""; }}/>
              </label>
            </div>
            {(backupTools.jobsBackupStatus || backupTools.fullDataBackupStatus || backupTools.localDataSnapshotLabel) && (
              <p className="text-[10px] text-muted-foreground leading-snug">
                {backupTools.jobsBackupStatus && (backupTools.jobsBackupStatus.prev > 0 || backupTools.jobsBackupStatus.prev2 > 0) && (
                  <>Kopie chmury (roboty): {backupTools.jobsBackupStatus.prev} / {backupTools.jobsBackupStatus.prev2}</>
                )}
                {backupTools.fullDataBackupStatus?.dailyBackupDate && (
                  <>{backupTools.jobsBackupStatus ? " · " : ""}Kopia dzienna: {backupTools.fullDataBackupStatus.dailyBackupDate}</>
                )}
                {backupTools.localDataSnapshotLabel && (
                  <>{backupTools.jobsBackupStatus || backupTools.fullDataBackupStatus?.dailyBackupDate ? " · " : ""}Lokalnie: {backupTools.localDataSnapshotLabel}</>
                )}
              </p>
            )}
            <div className="space-y-1.5 pt-1 border-t border-amber-500/15">
              <button type="button" disabled={backupTools.restoreBusy || !backupTools.fullDataBackupStatus?.hasPrev} onClick={() => backupTools.restoreAllDataFromCloud("prev")} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10 transition-colors disabled:opacity-40">
                <RotateCcw size={13}/>Przywróć wszystkie dane (chmura)
              </button>
              <button type="button" disabled={backupTools.restoreBusy || !backupTools.localDataSnapshotLabel} onClick={() => backupTools.restoreAllDataFromLocal()} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40">
                <RotateCcw size={13}/>Przywróć wszystkie dane (lokalnie)
              </button>
              <button type="button" disabled={backupTools.restoreBusy || !backupTools.payrollBackupStatus?.employeesPrev} onClick={() => backupTools.restorePayrollFromCloud("prev")} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10 transition-colors disabled:opacity-40">
                <RotateCcw size={13}/>Przywróć listę płac (chmura)
              </button>
              <button type="button" disabled={backupTools.restoreBusy || !backupTools.jobsBackupStatus?.prev} onClick={() => backupTools.restoreJobsFromCloud("prev")} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10 transition-colors disabled:opacity-40">
                <RotateCcw size={13}/>Przywróć roboty (chmura)
              </button>
              <button type="button" disabled={backupTools.restoreBusy || listLocalJobsSnapshots().length === 0} onClick={() => backupTools.restoreJobsFromLocal()} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40">
                <RotateCcw size={13}/>Przywróć roboty (lokalnie)
              </button>
            </div>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Numery kontaktowe użytkowników
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Przy każdym koncie poniżej wpisz numer — inspektor zobaczy go po najechaniu na imię autora treści.
            </p>
          </div>

          {/* Kreator — nowy użytkownik */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
            <button
              type="button"
              onClick={() => { setShowAddForm((v) => !v); setAddMsg(null); }}
              className="w-full flex items-center justify-between gap-2 text-sm font-semibold text-primary"
            >
              <span className="flex items-center gap-2"><UserPlus size={15}/> Dodaj użytkownika</span>
              <ChevronDown size={14} className={`transition-transform ${showAddForm ? "rotate-180" : ""}`}/>
            </button>
            {showAddForm && (
              <div className="space-y-3 pt-1 border-t border-primary/10">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Login (wyświetlany przy logowaniu)</label>
                  <input
                    value={newLogin}
                    onChange={(e) => setNewLogin(e.target.value)}
                    placeholder="np. Jan"
                    className="w-full bg-background rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Poziom dostępu</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as AdminAssignableRole)}
                    className="w-full bg-background rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none"
                  >
                    <option value="admin">Administrator</option>
                    <option value="moderator">Moderator</option>
                    <option value="inspector">Inspektor</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Hasło</label>
                  <div className="relative">
                    <input
                      type={newShow ? "text" : "password"}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="Min. 6 znaków"
                      className="w-full bg-background rounded-lg px-3 py-2.5 pr-10 text-sm border border-border focus:border-primary focus:outline-none"
                    />
                    <button type="button" onClick={() => setNewShow((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <Eye size={14}/>
                    </button>
                  </div>
                  <input
                    type={newShow ? "text" : "password"}
                    value={newPw2}
                    onChange={(e) => setNewPw2(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddUser()}
                    placeholder="Powtórz hasło"
                    className="w-full bg-background rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none"
                  />
                </div>
                {addMsg && <p className={`text-xs ${addMsg.ok ? "text-green-500" : "text-destructive"}`}>{addMsg.text}</p>}
                <button
                  type="button"
                  disabled={addBusy || !newLogin.trim() || !newPw || !newPw2}
                  onClick={handleAddUser}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  {addBusy ? "…" : <><Plus size={12}/> Utwórz konto</>}
                </button>
              </div>
            )}
          </div>

          {users.map((u) => {
            const d = drafts[u.id] ?? { pw: "", pw2: "", show: false };
            const isBusy = busyId === u.id;
            const userMsg = msg?.userId === u.id ? msg : null;
            return (
              <div key={u.id} className="bg-secondary/40 rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{u.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">login: {u.login}{u.isCustom && " · dodany"}</p>
                  </div>
                  {u.role === "super_admin" ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 bg-primary/15 text-primary">
                      Super Admin
                    </span>
                  ) : u.role === "inspector" ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      Inspektor
                    </span>
                  ) : (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${u.passwordCustomized ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {u.passwordCustomized ? "Hasło zmienione" : "Hasło startowe"}
                    </span>
                  )}
                </div>

                {u.canChangeRole && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Poziom dostępu</label>
                    <select
                      value={u.role === "super_admin" ? "admin" : u.role}
                      disabled={isBusy}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as AdminAssignableRole)}
                      className="w-full bg-background rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none disabled:opacity-50"
                    >
                      <option value="admin">Administrator</option>
                      <option value="moderator">Moderator</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      Moderator — bez stawek PLN/h. Administrator — pełny dostęp (na razie).
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Numer telefonu (dla inspektora)</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phoneDrafts[u.id] ?? u.phone}
                      disabled={isBusy}
                      onChange={(e) => setPhoneDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))}
                      onBlur={() => {
                        if ((phoneDrafts[u.id] ?? u.phone) !== u.phone) handlePhoneSave(u.id);
                      }}
                      placeholder="+48 …"
                      className="flex-1 bg-background rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none disabled:opacity-50"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Inspektor zobaczy ten numer po najechaniu na imię {u.displayName} przy treściach w aplikacji.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Nowe hasło</label>
                  <div className="relative">
                    <input
                      type={d.show ? "text" : "password"}
                      value={d.pw}
                      onChange={(e) => updateDraft(u.id, { pw: e.target.value })}
                      placeholder="Min. 6 znaków"
                      className="w-full bg-background rounded-lg px-3 py-2.5 pr-10 text-sm border border-border focus:border-primary focus:outline-none"
                    />
                    <button type="button" onClick={() => updateDraft(u.id, { show: !d.show })} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <Eye size={14}/>
                    </button>
                  </div>
                  <label className="text-xs text-muted-foreground">Potwierdź hasło</label>
                  <input
                    type={d.show ? "text" : "password"}
                    value={d.pw2}
                    onChange={(e) => updateDraft(u.id, { pw2: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && handleSave(u.id)}
                    placeholder="Powtórz hasło"
                    className="w-full bg-background rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none"
                  />
                </div>
                {userMsg && (
                  <p className={`text-xs ${userMsg.ok ? "text-green-500" : "text-destructive"}`}>{userMsg.text}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isBusy || !d.pw || !d.pw2}
                    onClick={() => handleSave(u.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
                  >
                    {isBusy ? "…" : <><Lock size={12}/> Zmień hasło</>}
                  </button>
                  {u.isBuiltin && u.passwordCustomized && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleReset(u.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                    >
                      <RotateCcw size={12}/> Przywróć startowe
                    </button>
                  )}
                  {u.canDelete && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleDelete(u.id, u.displayName)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-xs font-medium text-destructive disabled:opacity-40 transition-colors"
                    >
                      <Trash2 size={12}/> Usuń
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

function CloudLoader({children}: {children: React.ReactNode}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const keys = [...DATA_KEYS];
    const fallback = setTimeout(() => setReady(true), 3000);

    fetchKeysFromCloud([
      ...keys,
      JOBS_DELETED_IDS_KEY,
      DIRECTORY_DELETED_IDS_KEY,
      CONTACTS_DELETED_IDS_KEY,
      ARCHIVE_DELETED_IDS_KEY,
      ADMIN_PASSWORDS_KEY,
      ADMIN_USERS_CONFIG_KEY,
      APP_SETTINGS_KEY,
    ])
      .then(async (allValues) => {
        const values = allValues.slice(0, keys.length);
        const cloudDeleted = normalizeDeletedJobIds(allValues[keys.length]);
        const cloudDirDeleted = normalizeDeletedDirectoryIds(allValues[keys.length + 1]);
        const cloudContactsDeleted = normalizeDeletedJobIds(allValues[keys.length + 2]);
        const cloudArchiveDeleted = normalizeDeletedJobIds(allValues[keys.length + 3]);
        const cloudAdminPw = allValues[keys.length + 4];
        const cloudAdminUsers = allValues[keys.length + 5];
        const mergedDeleted = mergeDeletedJobIds(getDeletedJobIds(), cloudDeleted);
        saveDeletedJobIds(mergedDeleted);
        const mergedDirDeleted = mergeDeletedDirectoryIds(getDeletedDirectoryIds(), cloudDirDeleted);
        saveDeletedDirectoryIds(mergedDirDeleted);
        const mergedContactsDeleted = mergeDeletedContactsIds(getDeletedContactsIds(), cloudContactsDeleted);
        saveDeletedContactsIds(mergedContactsDeleted);
        const mergedArchiveDeleted = mergeDeletedArchiveIds(getDeletedArchiveIds(), cloudArchiveDeleted);
        saveDeletedArchiveIds(mergedArchiveDeleted);

        const localAdminPw = loadAdminPasswordOverrides();
        const mergedAdminPw = mergeAdminPasswordOverrides(localAdminPw, cloudAdminPw);
        if (Object.keys(mergedAdminPw).length > 0) {
          localStorage.setItem(ADMIN_PASSWORDS_KEY, JSON.stringify(mergedAdminPw));
        } else if (cloudAdminPw == null && Object.keys(localAdminPw).length > 0) {
          localStorage.setItem(ADMIN_PASSWORDS_KEY, JSON.stringify(localAdminPw));
        }

        const localAdminUsers = loadAdminUsersConfig();
        const mergedAdminUsers = mergeAdminUsersConfig(localAdminUsers, cloudAdminUsers);
        localStorage.setItem(ADMIN_USERS_CONFIG_KEY, JSON.stringify(mergedAdminUsers));

        const cloudAppSettings = allValues[keys.length + 6];
        if (cloudAppSettings && typeof cloudAppSettings === "object") {
          const localSettings = loadAppSettingsLocal();
          const cloudS = cloudAppSettings as AppSettings;
          const mergedSettings: AppSettings = mergeAppSettings(cloudS, localSettings);
          localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(mergedSettings));
        }

        const pushKeys: string[] = [];
        const pushValues: unknown[] = [];

        if (isSupabaseConfigured() && Object.keys(localAdminPw).length > 0 && JSON.stringify(mergedAdminPw) !== JSON.stringify(cloudAdminPw ?? {})) {
          pushKeys.push(ADMIN_PASSWORDS_KEY);
          pushValues.push(mergedAdminPw);
        }
        if (isSupabaseConfigured() && JSON.stringify(mergedAdminUsers) !== JSON.stringify(cloudAdminUsers ?? { roleOverrides: {}, customUsers: [] })) {
          pushKeys.push(ADMIN_USERS_CONFIG_KEY);
          pushValues.push(mergedAdminUsers);
        }

        keys.forEach((key, i) => {
          let cloudVal = values[i];
          let localVal: unknown = null;
          try {
            const raw = localStorage.getItem(key);
            if (raw) localVal = JSON.parse(raw);
          } catch { /* ignore */ }

          const merged = mergeDataKey(
            key,
            localVal,
            cloudVal,
            mergedDeleted,
            mergedDirDeleted,
            mergedContactsDeleted,
            mergedArchiveDeleted,
          );
          const hasRealData = merged != null && !(Array.isArray(merged) && merged.length === 0) && merged !== "";
          if (hasRealData || (key === "kw-weekFrom" || key === "kw-weekTo") && merged) {
            localStorage.setItem(key, JSON.stringify(merged));
          }

          if (!isSupabaseConfigured()) return;

          const cloudEmpty = cloudVal == null || (Array.isArray(cloudVal) && cloudVal.length === 0);
          const richnessIncreased =
            key === "kw-week-employees"
              ? weekEmployeesListRichness(merged) > weekEmployeesListRichness(cloudVal) + 1
              : key === "kw-jobs"
                ? normalizeJobsValue(merged).length > normalizeJobsValue(cloudVal).length
                : Array.isArray(merged) && Array.isArray(cloudVal) && merged.length > cloudVal.length;

          const shouldPush =
            (cloudEmpty && hasRealData) ||
            richnessIncreased ||
            (hasRealData && JSON.stringify(merged) !== JSON.stringify(cloudVal));

          if (shouldPush) {
            pushKeys.push(key);
            pushValues.push(merged);
          }
        });

        if (localStorage.getItem(WORKER_PINS_RESET_FLAG) !== "1") {
          try {
            const raw = localStorage.getItem("kw-directory");
            const parsed = raw ? JSON.parse(raw) : [];
            const arr = Array.isArray(parsed) ? parsed : [];
            const { directory: stripped } = stripWorkerPinHashesFromDirectory(arr);
            localStorage.setItem("kw-directory", JSON.stringify(stripped));
            if (isSupabaseConfigured()) {
              await pushKeysToCloud(
                ["kw-directory", DIRECTORY_DELETED_IDS_KEY],
                [stripped, mergedDirDeleted],
                { replaceDirectoryKeys: ["kw-directory"] },
              );
            }
            localStorage.setItem(WORKER_PINS_RESET_FLAG, "1");
          } catch {
            /* ponowi przy następnym wejściu */
          }
        }

        if (pushKeys.length > 0) {
          // Push w tle — nie blokuj startu UI (batch-get ~2–3 s wystarczy)
          void pushKeysToCloud(
            [...pushKeys, JOBS_DELETED_IDS_KEY, DIRECTORY_DELETED_IDS_KEY, CONTACTS_DELETED_IDS_KEY, ARCHIVE_DELETED_IDS_KEY],
            [...pushValues, mergedDeleted, mergedDirDeleted, mergedContactsDeleted, mergedArchiveDeleted],
            {
              replaceJobsKeys: pushKeys.includes("kw-jobs") ? ["kw-jobs"] : [],
              replaceDirectoryKeys: pushKeys.includes("kw-directory") ? ["kw-directory"] : [],
              replaceWeekEmployeesKeys: pushKeys.includes("kw-week-employees") ? ["kw-week-employees"] : [],
            },
          ).catch(() => {});
        }

        markCloudBootstrapSuccess();
      })
      .catch(() => {})
      .finally(() => { clearTimeout(fallback); setReady(true); });
  }, []);

  if (!ready) return (
    <div style={{fontFamily:"'Inter',sans-serif", height:"100dvh"}} className="flex bg-background text-foreground items-center justify-center flex-col gap-4">
      <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-10 w-auto object-contain"/>
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
        Ładowanie danych...
      </div>
    </div>
  );

  return <>{children}</>;
}

function AppInner({onLogout}: {onLogout?: ()=>void}) {
  const { session: adminSession, canViewRates } = useAdminAccess();
  const week = getWeekRange();
  const [directory, setDirectory] = useLocalStorage<DirectoryEmployee[]>("kw-directory", []);
  const [weekEmployees, setWeekEmployees] = useLocalStorage<WeekEmployee[]>("kw-week-employees", []);
  const [savedWeeks, setSavedWeeks] = useLocalStorage<WeekSnapshot[]>("kw-archive", []);
  const [weekFrom, setWeekFrom] = useLocalStorage("kw-weekFrom", week.from);
  const [weekTo, setWeekTo] = useLocalStorage("kw-weekTo", week.to);
  const [jobs, setJobs] = useLocalStorage<Job[]>("kw-jobs", []);
  const [contacts, setContacts] = useLocalStorage<EmailContact[]>("kw-contacts", []);
  const [view, setView] = useState<View>("dashboard");
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [pendingTenderId, setPendingTenderId] = useState<string | null>(null);
  const [tenderDashStats, setTenderDashStats] = useState<TendersDashboardStats | null>(null);
  const [pendingInspectorJobId, setPendingInspectorJobId] = useState<string | null>(null);
  const [inspectorInitialTab, setInspectorInitialTab] = useState<"activity" | "portfolio">("activity");
  const [alertsSeenTick, setAlertsSeenTick] = useState(0);
  const [pendingPayrollEmpId, setPendingPayrollEmpId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(() => loadAppSettingsLocal());
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [payrollDetailOpen, setPayrollDetailOpen] = useState(false);
  const [viewReturn, setViewReturn] = useState<{ view: View; label: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle"|"saving"|"saved"|"error"|"offline">("idle");
  const [syncError, setSyncError] = useState("");
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const settledSyncTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const tabVisibleRef = useRef(typeof document !== "undefined" ? !document.hidden : true);
  const initialSyncDone = useRef(false);
  const suppressAutoSyncUntilRef = useRef(initialAutoSyncSuppressUntil());
  const pullInFlightRef = useRef(false);
  const pendingAutoSyncRef = useRef(false);
  const suppressWakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteMergeInFlightRef = useRef(false);
  const payrollRosterPushRef = useRef(false);
  const autoSyncMountSettledRef = useRef(false);
  const deleteJobsInFlightRef = useRef(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [jobsBackupStatus, setJobsBackupStatus] = useState<{ current: number; prev: number; prev2: number; today: number } | null>(null);
  const [payrollBackupStatus, setPayrollBackupStatus] = useState<{ employeesPrev: number; employeesPrev2: number; archivePrev: number } | null>(null);
  const [fullDataBackupStatus, setFullDataBackupStatus] = useState<{ dailyBackupDate: string | null; hasPrev: boolean } | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);

  const productionWeekEmployees = useMemo(
    () => filterProductionWeekEmployees(weekEmployees, directory),
    [weekEmployees, directory],
  );

  useEffect(() => {
    syncAlertsSeenFromCloud().catch(() => {});
  }, []);

  useEffect(() => {
    syncAppSettingsFromCloud().then(setAppSettings).catch(() => {});
  }, []);

  useEffect(() => {
    const normalized = normalizeDirectoryTestFlags(directory);
    if (normalized !== directory) {
      remoteMergeInFlightRef.current = true;
      setDirectory(normalized);
    }
  }, [directory, setDirectory]);

  useEffect(() => {
    setWeekEmployees((prev) => {
      const next = filterProductionWeekEmployees(prev, directory);
      if (next.length === prev.length) return prev;
      remoteMergeInFlightRef.current = true;
      return next;
    });
  }, [directory, setWeekEmployees]);

  useEffect(() => {
    fetchJobsBackupStatus().then(setJobsBackupStatus).catch(() => {});
    fetchPayrollBackupStatus().then((s) => {
      if (s) setPayrollBackupStatus({ employeesPrev: s.employeesPrev, employeesPrev2: s.employeesPrev2, archivePrev: s.archivePrev });
    }).catch(() => {});
    fetchFullDataBackupStatus().then((s) => {
      if (!s?.keys) return;
      const hasPrev = Object.values(s.keys).some((k) => k.prev > 0 || k.prev2 > 0);
      setFullDataBackupStatus({ dailyBackupDate: s.dailyBackupDate, hasPrev });
    }).catch(() => {});
  }, [jobs.length, weekEmployees.length, savedWeeks.length, directory.length, contacts.length]);

  const commitDirectory = useCallback(() => {
    pushDirectoryToCloud(directory).catch(() => {});
  }, [directory]);

  const clearAutoSyncTimers = useCallback(() => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    if (suppressWakeTimerRef.current) {
      clearTimeout(suppressWakeTimerRef.current);
      suppressWakeTimerRef.current = null;
    }
  }, []);

  const clearPendingAutoSync = useCallback(() => {
    pendingAutoSyncRef.current = false;
    clearAutoSyncTimers();
  }, [clearAutoSyncTimers]);

  const adminDataBundle = useCallback(
    () => [directory, weekEmployees, savedWeeks, weekFrom, weekTo, jobs, contacts] as unknown[],
    [directory, weekEmployees, savedWeeks, weekFrom, weekTo, jobs, contacts],
  );

  const applyAdminDataBundle = useCallback((merged: unknown[]) => {
    const [dir, emps, arch, wf, wt, jbs, cont] = merged;
    suppressAutoSyncUntilRef.current = Date.now() + 4500;
    remoteMergeInFlightRef.current = true;
    skipApplyWriteTimestamps = true;
    try {
      if (Array.isArray(dir)) setDirectory(dir as DirectoryEmployee[]);
      if (Array.isArray(emps)) setWeekEmployees(emps as WeekEmployee[]);
      if (Array.isArray(arch)) setSavedWeeks(arch as WeekSnapshot[]);
      if (typeof wf === "string" && wf) setWeekFrom(wf);
      if (typeof wt === "string" && wt) setWeekTo(wt);
      if (Array.isArray(jbs)) {
        const tombstones = new Set(getDeletedJobIds());
        const withoutDeleted = tombstones.size
          ? (jbs as Job[]).filter((j) => !tombstones.has(j.id))
          : (jbs as Job[]);
        setJobs(normalizeJobsList(withoutDeleted as unknown[]));
      }
      if (Array.isArray(cont)) setContacts(cont as EmailContact[]);
    } finally {
      skipApplyWriteTimestamps = false;
    }
  }, [setDirectory, setWeekEmployees, setSavedWeeks, setWeekFrom, setWeekTo, setJobs, setContacts]);

  const deleteJobsByIds = useCallback(async (ids: string[]) => {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return;
    deleteJobsInFlightRef.current = true;
    clearPendingAutoSync();
    suppressAutoSyncUntilRef.current = Date.now() + 12_000;
    let deletedIds = getDeletedJobIds();
    for (const id of unique) {
      deletedIds = addDeletedJobId(id);
    }
    let updated: Job[] = [];
    setJobs((prev) => {
      updated = prev.filter((j) => !unique.includes(j.id));
      return updated;
    });
    try {
      await pushJobsAfterDelete(updated, deletedIds);
      toast.success(unique.length === 1 ? "Robota usunięta" : `Usunięto ${unique.length} robot`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Błąd zapisu do chmury";
      toast.error("Usunięto lokalnie, ale sync chmury nie powiódł się", { description: msg });
    } finally {
      deleteJobsInFlightRef.current = false;
    }
  }, [clearPendingAutoSync, setJobs]);

  const pullFromCloudAndMerge = useCallback(async () => {
    if (!tabVisibleRef.current || !isSupabaseConfigured() || pullInFlightRef.current) return;
    if (deleteJobsInFlightRef.current) return;
    pullInFlightRef.current = true;
    clearAutoSyncTimers();
    try {
      const merged = await pullAndMergeDataBundle(adminDataBundle());
      applyAdminDataBundle(merged);
    } catch {
      /* offline — zostaw lokalne dane */
    } finally {
      pullInFlightRef.current = false;
    }
  }, [adminDataBundle, applyAdminDataBundle, clearAutoSyncTimers]);

  const pushToCloud = pushAllDataToCloud;

  const runCloudSync = useCallback(async (opts?: { toastSuccess?: boolean }) => {
    if (!tabVisibleRef.current) return;
    if (pullInFlightRef.current) return;
    if (deleteJobsInFlightRef.current) return;
    if (!isSupabaseConfigured()) {
      setSyncStatus("offline");
      setSyncError("Brak VITE_SUPABASE_* w Vercel — ustaw zmienne i zrób redeploy");
      return;
    }
    pendingAutoSyncRef.current = false;
    if (suppressWakeTimerRef.current) {
      clearTimeout(suppressWakeTimerRef.current);
      suppressWakeTimerRef.current = null;
    }
    if (jobs.length > 0) saveLocalJobsSnapshot(jobs);
    saveLocalDataSnapshot();
    setSyncStatus("saving");
    setSyncError("");
    try {
      const merged = await pullAndMergeDataBundle(adminDataBundle());
      applyAdminDataBundle(merged);
      await pushMergedDataBundleToCloud(merged);
      setSyncStatus("saved");
      if (opts?.toastSuccess) toast.success("Zsynchronizowano z chmurą");
      setTimeout(() => setSyncStatus("idle"), 2500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Błąd połączenia z chmurą";
      setSyncStatus("error");
      setSyncError(msg);
      toast.error("Nie udało się wysłać do chmury", { description: msg, id: "admin-cloud-sync" });
    }
  }, [adminDataBundle, applyAdminDataBundle, jobs]);

  const fireDeferredAutoSync = useCallback(() => {
    suppressWakeTimerRef.current = null;
    if (remoteMergeInFlightRef.current) {
      return;
    }
    if (Date.now() < suppressAutoSyncUntilRef.current) {
      const delay = suppressAutoSyncUntilRef.current - Date.now();
      suppressWakeTimerRef.current = setTimeout(() => {
        suppressWakeTimerRef.current = null;
        fireDeferredAutoSync();
      }, delay);
      return;
    }
    if (!pendingAutoSyncRef.current) {
      return;
    }
    if (!tabVisibleRef.current) {
      return;
    }
    if (pullInFlightRef.current) {
      return;
    }
    pendingAutoSyncRef.current = false;
    void runCloudSync();
  }, [runCloudSync]);

  const scheduleWakeAtSuppressExpiry = useCallback(() => {
    const delay = suppressAutoSyncUntilRef.current - Date.now();
    if (suppressWakeTimerRef.current) {
      clearTimeout(suppressWakeTimerRef.current);
      suppressWakeTimerRef.current = null;
    }
    if (delay <= 0) {
      fireDeferredAutoSync();
      return;
    }
    suppressWakeTimerRef.current = setTimeout(() => {
      suppressWakeTimerRef.current = null;
      fireDeferredAutoSync();
    }, delay);
  }, [fireDeferredAutoSync]);

  const scheduleAutoCloudSync = useCallback(() => {
    if (!initialSyncDone.current) {
      return;
    }
    if (remoteMergeInFlightRef.current) {
      return;
    }
    if (payrollRosterPushRef.current) {
      return;
    }

    const suppressed = Date.now() < suppressAutoSyncUntilRef.current;

    if (suppressed) {
      if (!autoSyncMountSettledRef.current) {
        return;
      }
      pendingAutoSyncRef.current = true;
      scheduleWakeAtSuppressExpiry();
      return;
    }

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      if (!tabVisibleRef.current) return;
      if (pullInFlightRef.current) return;
      if (Date.now() < suppressAutoSyncUntilRef.current) {
        pendingAutoSyncRef.current = true;
        scheduleWakeAtSuppressExpiry();
        return;
      }
      pendingAutoSyncRef.current = false;
      void runCloudSync();
    }, 2000);
  }, [scheduleWakeAtSuppressExpiry, runCloudSync]);

  useEffect(() => {
    return registerNativeBackHandler(() => {
      if (showAdminSettings) { setShowAdminSettings(false); return true; }
      if (showSmsModal) { setShowSmsModal(false); return true; }
      if (showSaveConfirm) { setShowSaveConfirm(false); return true; }
      if (mobileMoreOpen) { setMobileMoreOpen(false); return true; }
      if (showSearch) { setShowSearch(false); setGlobalSearch(""); return true; }
      return false;
    });
  }, [showAdminSettings, showSmsModal, showSaveConfirm, mobileMoreOpen, showSearch]);

  useEffect(() => {
    return onNativeAppResume(() => {
      if (tabVisibleRef.current) void pullFromCloudAndMerge();
    });
  }, [pullFromCloudAndMerge]);

  // Po CloudLoader (merge chmura↔local) — zapis tylko przy zmianach użytkownika
  useEffect(() => {
    initialSyncDone.current = true;
    queueMicrotask(() => { autoSyncMountSettledRef.current = true; });
  }, []);

  // Auto-save to cloud on any data change (debounced 2s, only after initial sync; nie w ukrytej karcie)
  useEffect(() => {
    scheduleAutoCloudSync();
    remoteMergeInFlightRef.current = false;
  }, [directory, weekEmployees, savedWeeks, weekFrom, weekTo, jobs, contacts, scheduleAutoCloudSync]);

  useEffect(() => () => clearAutoSyncTimers(), [clearAutoSyncTimers]);

  useEffect(() => {
    const onVis = () => {
      tabVisibleRef.current = !document.hidden;
      if (!document.hidden) void pullFromCloudAndMerge();
    };
    const onFocus = () => {
      tabVisibleRef.current = true;
      void pullFromCloudAndMerge();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    tabVisibleRef.current = !document.hidden;
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
  }, [pullFromCloudAndMerge]);

  // Backup
  const exportBackup = () => {
    const data: Record<string,unknown> = {};
    [...DATA_KEYS, ADMIN_PASSWORDS_KEY, ADMIN_USERS_CONFIG_KEY].forEach(k=>{
      const v=localStorage.getItem(k); if(v) data[k]=JSON.parse(v);
    });
    saveAs(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),`backup-${new Date().toISOString().slice(0,10)}.json`);
  };
  const importBackup = (file: File) => {
    const reader=new FileReader();
    reader.onload=async (e)=>{
      try {
        const data=JSON.parse(e.target?.result as string);
        if (data["kw-jobs"] != null) {
          const local = normalizeJobsValue(JSON.parse(localStorage.getItem("kw-jobs") || "[]"));
          data["kw-jobs"] = mergeJobsById(local, normalizeJobsValue(data["kw-jobs"]));
        }
        if (data["kw-week-employees"] != null) {
          const local = JSON.parse(localStorage.getItem("kw-week-employees") || "[]");
          data["kw-week-employees"] = mergeWeekEmployees(local, data["kw-week-employees"]);
        }
        if (data["kw-archive"] != null) {
          const local = JSON.parse(localStorage.getItem("kw-archive") || "[]");
          data["kw-archive"] = mergeArchive(local, data["kw-archive"], getDeletedArchiveIds());
        }
        if (data["kw-directory"] != null) {
          const local = JSON.parse(localStorage.getItem("kw-directory") || "[]");
          data["kw-directory"] = mergeDirectory(local, data["kw-directory"], getDeletedDirectoryIds());
        }
        if (data["kw-contacts"] != null) {
          const local = JSON.parse(localStorage.getItem("kw-contacts") || "[]");
          data["kw-contacts"] = mergeContacts(local, data["kw-contacts"], getDeletedContactsIds());
        }
        if (data[TENDERS_PIPELINE_KEY] != null) {
          const local = JSON.parse(localStorage.getItem(TENDERS_PIPELINE_KEY) || "[]");
          data[TENDERS_PIPELINE_KEY] = mergeTenderDataKey(TENDERS_PIPELINE_KEY, local, data[TENDERS_PIPELINE_KEY]);
        }
        if (data[TENDERS_COMPANY_PROFILE_KEY] != null) {
          const local = JSON.parse(localStorage.getItem(TENDERS_COMPANY_PROFILE_KEY) || "null");
          data[TENDERS_COMPANY_PROFILE_KEY] = mergeTenderDataKey(TENDERS_COMPANY_PROFILE_KEY, local, data[TENDERS_COMPANY_PROFILE_KEY]);
        }
        if (data[TENDERS_CUSTOM_KEYWORDS_KEY] != null) {
          const local = JSON.parse(localStorage.getItem(TENDERS_CUSTOM_KEYWORDS_KEY) || "null");
          data[TENDERS_CUSTOM_KEYWORDS_KEY] = mergeTenderDataKey(TENDERS_CUSTOM_KEYWORDS_KEY, local, data[TENDERS_CUSTOM_KEYWORDS_KEY]);
        }
        Object.entries(data).forEach(([k,v])=>localStorage.setItem(k,JSON.stringify(v)));
        try {
          const bundle = DATA_KEYS.map((k) => {
            try {
              const raw = localStorage.getItem(k);
              return raw ? JSON.parse(raw) : null;
            } catch {
              return null;
            }
          });
          await pushAllDataToCloud(bundle);
        } catch { /* reload i tak wczyta */ }
        window.location.reload();
      } catch { alert("Błąd importu pliku."); }
    };
    reader.readAsText(file);
  };

  const restoreJobsFromCloud = async (source: "prev" | "prev2" | "today") => {
    const labels = { prev: "poprzedni zapis", prev2: "starszą kopię", today: "zapis z dziś" };
    if (!window.confirm(`Przywrócić roboty z chmury (${labels[source]})? Obecna lista zostanie zachowana w kopii.`)) return;
    setRestoreBusy(true);
    try {
      const { count } = await restoreCloudJobsBackup(source);
      const [cloudJobs] = await fetchKeysFromCloud(["kw-jobs"]);
      const merged = mergeJobsById(jobs, normalizeJobsValue(cloudJobs), getDeletedJobIds()) as Job[];
      const synced = normalizeJobsList(merged as unknown[]);
      localStorage.setItem("kw-jobs", JSON.stringify(synced));
      setJobs(synced);
      await pushKeysToCloud(["kw-jobs"], [synced], { replaceJobsKeys: ["kw-jobs"] });
      alert(`Przywrócono ${count} robót z kopii chmurowej. Łącznie w aplikacji: ${synced.length}.`);
      fetchJobsBackupStatus().then(setJobsBackupStatus).catch(() => {});
    } catch (err) {
      alert(err instanceof Error ? err.message : "Nie udało się przywrócić kopii z chmury.");
    } finally {
      setRestoreBusy(false);
    }
  };

  const restoreJobsFromLocal = () => {
    const snaps = listLocalJobsSnapshots();
    if (snaps.length === 0) {
      alert("Brak lokalnych kopii robót na tym urządzeniu.");
      return;
    }
    const latest = snaps[0];
    const when = new Date(latest.at).toLocaleString("pl-PL");
    if (!window.confirm(`Przywrócić ${latest.jobs.length} robót z lokalnej kopii (${when})?`)) return;
    const restored = restoreLocalJobsSnapshot(0);
    if (!restored) { alert("Błąd odczytu lokalnej kopii."); return; }
    const merged = mergeJobsById(jobs, restored, getDeletedJobIds()) as Job[];
    const synced = normalizeJobsList(merged as unknown[]);
    setJobs(synced);
    pushKeysToCloudSafe(["kw-jobs"], [synced]).catch(() => {});
    alert(`Przywrócono lokalną kopię. Łącznie robot: ${synced.length}.`);
  };

  const restorePayrollFromCloud = async (source: "prev" | "prev2" = "prev") => {
    const label = source === "prev2" ? "starszą kopię" : "poprzedni zapis";
    if (!window.confirm(`Przywrócić listę płac i archiwum z chmury (${label})? Połączy z obecnymi danymi — bogatsze wpisy wygrywają.`)) return;
    setRestoreBusy(true);
    try {
      await restoreCloudPayrollBackup(source);
      const [cloudEmps, cloudArch] = await fetchKeysFromCloud(["kw-week-employees", "kw-archive"]);
      const mergedEmps = mergeWeekEmployees(weekEmployees, cloudEmps ?? []) as WeekEmployee[];
      const mergedArch = mergeArchive(savedWeeks, cloudArch ?? []) as WeekSnapshot[];
      localStorage.setItem("kw-week-employees", JSON.stringify(mergedEmps));
      localStorage.setItem("kw-archive", JSON.stringify(mergedArch));
      setWeekEmployees(mergedEmps);
      setSavedWeeks(mergedArch);
      await pushKeysToCloudSafe(["kw-week-employees", "kw-archive"], [mergedEmps, mergedArch]);
      alert(`Przywrócono listę płac (${mergedEmps.length} prac.) i archiwum (${mergedArch.length} tyg.).`);
      fetchPayrollBackupStatus().then((s) => {
        if (s) setPayrollBackupStatus({ employeesPrev: s.employeesPrev, employeesPrev2: s.employeesPrev2, archivePrev: s.archivePrev });
      }).catch(() => {});
    } catch (err) {
      alert(err instanceof Error ? err.message : "Nie udało się przywrócić listy płac z chmury.");
    } finally {
      setRestoreBusy(false);
    }
  };

  const restoreWeekFromArchive = useCallback(() => {
    const snap = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
    if (!snap?.weekEmployees?.length) {
      alert("Brak pełnego archiwum dla tego tygodnia. Sprawdź zakładkę Archiwum lub import backup JSON (górny pasek / ⚙ Ustawienia).");
      return;
    }
    if (!window.confirm(`Przywrócić godziny, Sob.pr. i dodatkowe wpisy z archiwum (${fmtDate(weekFrom)} – ${fmtDate(weekTo)})?`)) return;
    setWeekEmployees(JSON.parse(JSON.stringify(snap.weekEmployees)) as WeekEmployee[]);
  }, [savedWeeks, weekFrom, weekTo, setWeekEmployees]);

  const restoreAllDataFromCloud = async (source: "prev" | "prev2" | "today" = "prev") => {
    const labels = { prev: "poprzedni zapis", prev2: "starszą kopię", today: "zapis z dziś" };
    if (!window.confirm(`Przywrócić WSZYSTKIE dane firmy z chmury (${labels[source]})? Scalą się z obecnymi — bogatsze wpisy wygrywają.`)) return;
    setRestoreBusy(true);
    try {
      saveLocalDataSnapshot();
      const { restoredKeys } = await restoreAllCloudDataBackup(source);
      const cloudValues = await fetchKeysFromCloud([...DATA_KEYS]);
      const localBundle = readLocalDataBundle();
      const merged = DATA_KEYS.map((key, i) => mergeDataKey(key, localBundle[key], cloudValues[i]));
      for (let i = 0; i < DATA_KEYS.length; i++) {
        localStorage.setItem(DATA_KEYS[i], JSON.stringify(merged[i]));
      }
      await pushAllDataToCloud(merged);
      alert(`Przywrócono z chmury: ${restoredKeys.join(", ")}. Strona się odświeży.`);
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Nie udało się przywrócić danych z chmury.");
    } finally {
      setRestoreBusy(false);
    }
  };

  const restoreAllDataFromLocal = (usePrev = false) => {
    const snaps = listLocalDataSnapshots();
    const pick = snaps.find((s) => s.usePrev === usePrev) ?? snaps[0];
    if (!pick) {
      alert("Brak lokalnej kopii danych na tym urządzeniu.");
      return;
    }
    if (!window.confirm(`Przywrócić dane z kopii lokalnej (${new Date(pick.at).toLocaleString("pl-PL")})?`)) return;
    restoreLocalDataSnapshot(pick.usePrev);
    window.location.reload();
  };

  // Auto-backup email — w niedzielę, po zapisie tygodnia do archiwum (patrz triggerWeeklyBackupEmail)

  // Global search results
  const searchResults = useMemo(()=>{
    if(!globalSearch.trim()) return {employees:[],jobs:[]};
    const q=globalSearch.toLowerCase();
    return {
      employees: filterProductionDirectory(directory).filter((d)=>d.name.toLowerCase().includes(q)||d.phone.includes(q)||d.position.toLowerCase().includes(q)),
      jobs: jobs.filter(j=>j.address.toLowerCase().includes(q)||j.client.toLowerCase().includes(q)||j.flatNumber.toLowerCase().includes(q)),
    };
  },[globalSearch,directory,jobs]);

  const persistPayrollRoster = useCallback((next: WeekEmployee[]) => {
    suppressAutoSyncUntilRef.current = Date.now() + 6000;
    payrollRosterPushRef.current = true;
    void pushWeekEmployeesToCloud(next)
      .finally(() => { payrollRosterPushRef.current = false; })
      .catch(() => {});
  }, []);

  const addFromDirectory = (ids: string[]) => {
    setWeekEmployees((prev) => {
      const toAdd = directory.filter((d) => ids.includes(d.id) && isProductionDirectoryEmployee(d));
      const newEmps = toAdd.map(weekEmployeeFromDir);
      const next = [...prev, ...newEmps];
      if (newEmps.length > 0) persistPayrollRoster(next);
      return next;
    });
  };

  const removeWeekEmployee = (id: string) => {
    setWeekEmployees((prev) => {
      const next = prev.filter((e) => e.id !== id);
      if (next.length !== prev.length) persistPayrollRoster(next);
      return next;
    });
  };

  const clearAllWeekEmployees = () => {
    setWeekEmployees([]);
    persistPayrollRoster([]);
  };

  const replaceWeekWithAllActive = () => {
    const newEmps = filterProductionActiveDirectory(directory)
      .filter(isProductionDirectoryEmployee)
      .map(weekEmployeeFromDir);
    setWeekEmployees(newEmps);
    persistPayrollRoster(newEmps);
  };

  const updateWeekEmployee = useCallback((updated:WeekEmployee)=>{
    setWeekEmployees((prev)=>prev.map((e)=>{
      if (e.id !== updated.id) return e;
      const now = new Date().toISOString();
      const rateChanged = updated.rate !== e.rate;
      const dataChanged =
        JSON.stringify({ days: updated.days, prevSaturday: updated.prevSaturday, extraCosts: updated.extraCosts })
        !== JSON.stringify({ days: e.days, prevSaturday: e.prevSaturday, extraCosts: e.extraCosts });
      return {
        ...updated,
        settled: updated.settled ?? e.settled,
        settledUpdatedAt: updated.settledUpdatedAt ?? e.settledUpdatedAt,
        rateUpdatedAt: rateChanged ? now : updated.rateUpdatedAt ?? e.rateUpdatedAt,
        dataUpdatedAt: dataChanged ? now : updated.dataUpdatedAt ?? e.dataUpdatedAt,
      };
    }));
  },[setWeekEmployees]);

  const syncWeekRatesFromDirectory = useCallback(() => {
    const now = new Date().toISOString();
    const byId = new Map(directory.map((d) => [d.id, d]));
    setWeekEmployees((prev) => {
      const next = prev.map((emp) => {
        if (!emp.directoryId) return emp;
        const dir = byId.get(emp.directoryId);
        if (!dir?.defaultRate) return emp;
        return { ...emp, rate: dir.defaultRate, rateUpdatedAt: now };
      });
      void (async () => {
        payrollRosterPushRef.current = true;
        try {
          let archive = savedWeeks;
          const existing = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
          if (existing) {
            const snapshot = buildWeekSnapshot(weekFrom, weekTo, next, jobs, existing);
            archive = savedWeeks.map((w) => (w.id === existing.id ? snapshot : w));
            try { localStorage.setItem("kw-archive", JSON.stringify(archive)); } catch { /* ignore */ }
            setSavedWeeks(archive);
          }
          await pushAllDataToCloud([directory, next, archive, weekFrom, weekTo, jobs, contacts]);
        } catch { /* auto-sync ponowi */ }
        finally { payrollRosterPushRef.current = false; }
      })();
      return next;
    });
  }, [directory, savedWeeks, weekFrom, weekTo, jobs, contacts, setWeekEmployees, setSavedWeeks]);

  const patchArchiveWeek = useCallback((weekId: string, patchEmployees: (emps: WeekEmployee[]) => WeekEmployee[]) => {
    setSavedWeeks((prev) => {
      const week = prev.find((w) => w.id === weekId);
      if (!week?.weekEmployees?.length) return prev;
      const nextEmployees = patchEmployees(week.weekEmployees);
      const snapshot = buildWeekSnapshot(week.weekFrom, week.weekTo, nextEmployees, jobs, week);
      return prev.map((w) => (w.id === weekId ? snapshot : w));
    });
  }, [jobs, setSavedWeeks]);

  const updateArchiveWeekEmployee = useCallback((weekId: string, updatedEmp: WeekEmployee) => {
    patchArchiveWeek(weekId, (emps) => emps.map((e) => (e.id === updatedEmp.id ? updatedEmp : e)));
  }, [patchArchiveWeek]);

  const toggleArchiveSettled = useCallback((weekId: string, empId: string) => {
    const now = new Date().toISOString();
    patchArchiveWeek(weekId, (emps) => emps.map((e) => (e.id === empId ? { ...e, settled: !e.settled, settledUpdatedAt: now } : e)));
  }, [patchArchiveWeek]);

  const toggleSettled = useCallback((id: string) => {
    const now = new Date().toISOString();
    const emp = weekEmployees.find((e) => e.id === id);
    if (!emp) return;
    const newSettled = !emp.settled;
    setWeekEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, settled: newSettled, settledUpdatedAt: now } : e)),
    );
    const archived = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
    if (archived) {
      patchArchiveWeek(archived.id, (emps) =>
        emps.map((e) =>
          weekEmployeesSamePerson(e, emp) ? { ...e, settled: newSettled, settledUpdatedAt: now } : e,
        ),
      );
    }
    if (settledSyncTimerRef.current) clearTimeout(settledSyncTimerRef.current);
    settledSyncTimerRef.current = setTimeout(() => {
      clearPendingAutoSync();
      suppressAutoSyncUntilRef.current = 0;
      void runCloudSync();
    }, 400);
  }, [weekEmployees, savedWeeks, weekFrom, weekTo, patchArchiveWeek, setWeekEmployees, runCloudSync, clearPendingAutoSync]);

  const saveBiweeklyBacklogWeek = useCallback((backlogFrom: string, backlogTo: string, employees: WeekEmployee[]) => {
    if (employees.length === 0) return;
    const existing = savedWeeks.find((w) => w.weekFrom === backlogFrom && w.weekTo === backlogTo);
    const snapshot = buildWeekSnapshot(backlogFrom, backlogTo, employees, jobs, existing);
    snapshot.backlog = true;
    snapshot.backlogNote = "Zaległa lista płac — wypłata co 2 tygodnie";
    const nextArchive = existing
      ? savedWeeks.map((w) => (w.id === existing.id ? snapshot : w))
      : [...savedWeeks, snapshot];
    setSavedWeeks(nextArchive);
  }, [savedWeeks, jobs, setSavedWeeks]);

  const doSaveWeek = useCallback(() => {
    if (weekEmployees.length === 0) return;
    const existing = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
    const snapshot = buildWeekSnapshot(weekFrom, weekTo, weekEmployees, jobs, existing);
    const nextArchive = existing
      ? savedWeeks.map((w) => (w.id === existing.id ? snapshot : w))
      : [...savedWeeks, snapshot];
    setSavedWeeks(nextArchive);
    setShowSaveConfirm(false);
    toast.success(`Tydzień zapisany · ${fmtDate(weekFrom)}–${fmtDate(weekTo)}`);
    triggerWeeklyBackupEmail(weekFrom, weekTo, jobs, nextArchive);
  }, [weekFrom, weekTo, weekEmployees, jobs, savedWeeks, setSavedWeeks]);

  const saveWeek = () => {
    if (weekEmployees.length === 0) return;
    const alreadyExists = savedWeeks.some((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
    if (alreadyExists) { setShowSaveConfirm(true); return; }
    doSaveWeek();
  };

  const autoArchiveAndAdvance = useCallback((targetFrom: string, targetTo: string) => {
    if (weekEmployees.length > 0) {
      const existing = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
      const snapshot = buildWeekSnapshot(weekFrom, weekTo, weekEmployees, jobs, existing);
      if (existing) setSavedWeeks((prev) => prev.map((w) => (w.id === existing.id ? snapshot : w)));
      else setSavedWeeks((prev) => [...prev, snapshot]);
    }
    setWeekFrom(targetFrom);
    setWeekTo(targetTo);
    setWeekEmployees([]);
  }, [weekEmployees, weekFrom, weekTo, savedWeeks, jobs, setSavedWeeks, setWeekFrom, setWeekTo, setWeekEmployees]);

  const goToCurrent = useCallback(() => {
    const c = getWeekRange();
    if (weekFrom === c.from) return;
    if (weekEmployees.some((e) => !e.settled)) {
      if (!window.confirm(
        "Są nierozliczeni pracownicy (wypłata w sobotę?). Przejść do bieżącego tygodnia mimo to? Obecna lista trafi do archiwum.",
      )) return;
    }
    autoArchiveAndAdvance(c.from, c.to);
  }, [weekFrom, weekEmployees, autoArchiveAndAdvance]);

  // Auto-przejście tygodnia płac: Nd ≥20:00 lub Pn+ (gdy wszyscy rozliczeni) + auto-archiwum w Nd
  const payrollWeekCycleRef = useRef<() => void>(() => {});
  const payrollWeekAdvancedToastRef = useRef<string | null>(null);

  const trySundayArchiveOnly = useCallback(() => {
    const now = new Date();
    if (now.getDay() !== 0) return;
    const closing = getPayrollClosingWeekRange(now);
    if (weekFrom !== closing.from || weekTo !== closing.to) return;
    if (weekEmployees.some((e) => !e.settled)) return;
    const today = localIsoDate(now);
    if (localStorage.getItem("kw-last-week-auto-archive") === today) return;
    localStorage.setItem("kw-last-week-auto-archive", today);
    if (weekEmployees.length === 0) {
      const archived = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
      if (archived) triggerWeeklyBackupEmail(weekFrom, weekTo, jobs, savedWeeks);
      return;
    }
    const existing = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
    const snapshot = buildWeekSnapshot(weekFrom, weekTo, weekEmployees, jobs, existing);
    const nextArchive = existing
      ? savedWeeks.map((w) => (w.id === existing.id ? snapshot : w))
      : [...savedWeeks, snapshot];
    setSavedWeeks(nextArchive);
    triggerWeeklyBackupEmail(weekFrom, weekTo, jobs, nextArchive);
  }, [weekFrom, weekTo, weekEmployees, savedWeeks, jobs, setSavedWeeks]);

  const tryPayrollWeekCycle = useCallback(() => {
    const current = getPayrollWeekRange();
    const onCurrentRange = weekFrom === current.from && weekTo === current.to;

    if (!onCurrentRange) {
      if (weekEmployees.length > 0 && weekEmployees.some((e) => !e.settled)) return;
      autoArchiveAndAdvance(current.from, current.to);
      if (payrollWeekAdvancedToastRef.current !== current.from) {
        payrollWeekAdvancedToastRef.current = current.from;
        toast.success(`Nowy tydzień listy płac · ${fmtDate(current.from)}–${fmtDate(current.to)}`, {
          id: "payroll-week-advance",
          description: "Poprzedni tydzień zapisany w archiwum. Dodaj pracowników i godziny od poniedziałku.",
        });
      }
      return;
    }

    trySundayArchiveOnly();
  }, [weekFrom, weekTo, weekEmployees, autoArchiveAndAdvance, trySundayArchiveOnly]);

  payrollWeekCycleRef.current = tryPayrollWeekCycle;

  useEffect(() => {
    payrollWeekCycleRef.current();
    const tick = () => payrollWeekCycleRef.current();
    const id = setInterval(tick, 60_000);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Odzyskaj listę płac z archiwum gdy bieżący tydzień pusty (np. po auto-przejściu)
  const payrollRestoredRef = useRef(false);
  useEffect(() => {
    if (payrollRestoredRef.current || weekEmployees.length > 0) return;
    const snap = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
    const emps = snap?.weekEmployees;
    if (!emps?.length) return;
    payrollRestoredRef.current = true;
    setWeekEmployees(JSON.parse(JSON.stringify(emps)) as WeekEmployee[]);
    toast.info("Przywrócono listę płac z archiwum", {
      description: `${fmtDate(weekFrom)} – ${fmtDate(weekTo)} · ${emps.length} os.`,
      id: "payroll-auto-restore",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canViewTendersNav = adminSession
    ? adminCanViewTendersTab(adminSession.role, appSettings)
    : false;

  useEffect(() => {
    if (!canViewTendersNav) return;
    if (view !== "dashboard" && view !== "tenders") return;
    let cancelled = false;
    void Promise.all([
      import("@/lib/tenders-bzp"),
      import("@/lib/tenders-actions"),
    ]).then(([{ loadTendersPipeline, computeTendersDashboardStats }, { enrichTendersDashboardStats }]) =>
      loadTendersPipeline()
        .then((items) => {
          if (!cancelled) {
            setTenderDashStats(enrichTendersDashboardStats(computeTendersDashboardStats(items), items));
          }
        })
        .catch(() => { if (!cancelled) setTenderDashStats(null); }),
    );
    return () => { cancelled = true; };
  }, [canViewTendersNav, view]);

  const navItems = useMemo(
    () =>
      buildAdminNavItems({
        canViewTendersNav,
        productionWeekEmployees,
        directory,
        contacts,
        savedWeeks,
        jobs,
        adminUserId: adminSession?.id,
      }),
    [canViewTendersNav, productionWeekEmployees, directory, contacts, savedWeeks, jobs, adminSession?.id],
  );

  const { mobileNavPrimary, mobileNavMore } = useMemo(() => splitMobileNav(navItems), [navItems]);
  const mobileMoreActive = mobileNavMore.some((n) => n.key === view);

  const totalNet = useMemo(
    () => computePayrollCashSplit(productionWeekEmployees, directory, weekFrom, weekTo, savedWeeks, (e) => calcWeekEmployee(e).netPay).totalSaturdayCash,
    [productionWeekEmployees, directory, weekFrom, weekTo, savedWeeks],
  );

  const payrollCashSplitSidebar = useMemo(
    () => computePayrollCashSplit(productionWeekEmployees, directory, weekFrom, weekTo, savedWeeks, (e) => calcWeekEmployee(e).netPay),
    [productionWeekEmployees, directory, weekFrom, weekTo, savedWeeks],
  );

  const todayFieldStats = useMemo(() => {
    const iso = todayIsoDate();
    return {
      iso,
      label: new Date(iso + "T12:00:00").toLocaleDateString("pl-PL", {
        weekday: "short",
        day: "numeric",
        month: "numeric",
      }),
      ...todayFieldWorkStats(jobs, iso, directory, productionWeekEmployees, weekFrom),
    };
  }, [jobs, directory, productionWeekEmployees, weekFrom]);

  const handleNavigate = useCallback((v: View | "payroll" | "directory" | "archive" | "jobs" | "schedule", jobId?: string, payrollEmpId?: string, inspectorTab?: "activity" | "portfolio") => {
    const dest = v as View;
    const returnLabels: Partial<Record<View, string>> = {
      dashboard: "Pulpit",
      payroll: "Lista płac",
      schedule: "Grafik",
      directory: "Kartoteka",
      inspector: "Inspektor",
      archive: "Archiwum",
      jobs: "Roboty",
    };
    if ((dest === "jobs" || dest === "inspector") && view !== dest) {
      setViewReturn({ view, label: returnLabels[view] ?? "Wstecz" });
    } else if (dest !== "jobs" && dest !== "inspector") {
      setViewReturn(null);
    }
    if (jobId) {
      if (v === "inspector") setPendingInspectorJobId(jobId);
      else setPendingJobId(jobId);
    }
    if (payrollEmpId) setPendingPayrollEmpId(payrollEmpId);
    if (inspectorTab) setInspectorInitialTab(inspectorTab);
    else if (v !== "inspector") setInspectorInitialTab("activity");
    setView(dest);
    setMobileMoreOpen(false);
  }, [view]);

  const goToView = useCallback((v: View) => {
    setViewReturn(null);
    setView(v);
    setMobileMoreOpen(false);
  }, []);

  const applyDeepLink = useCallback((route: DeepLinkRoute) => {
    if (route.type === "job") {
      setPendingJobId(route.jobId);
      setView("jobs");
      setMobileMoreOpen(false);
    } else if (route.type === "payroll") {
      if (route.empId) setPendingPayrollEmpId(route.empId);
      setView("payroll");
      setMobileMoreOpen(false);
    }
  }, []);

  useEffect(() => {
    if (view === "tenders" && !canViewTendersNav) setView("dashboard");
  }, [view, canViewTendersNav]);

  useEffect(() => {
    const pending = consumePendingDeepLink();
    if (pending) applyDeepLink(pending);
    const onLink = (e: Event) => {
      const route = (e as CustomEvent<DeepLinkRoute>).detail;
      if (route) applyDeepLink(route);
    };
    window.addEventListener("wgdom-deeplink", onLink);
    return () => window.removeEventListener("wgdom-deeplink", onLink);
  }, [applyDeepLink]);

  return (
    <div className="admin-app-shell flex bg-background text-foreground overflow-hidden min-h-0" style={{fontFamily:"'Inter', sans-serif"}}>

      <AdminSidebar
        sidebarOpen={sidebarOpen}
        view={view}
        navItems={navItems}
        onGoToView={goToView}
        productionWeekEmployees={productionWeekEmployees}
        weekFrom={weekFrom}
        weekTo={weekTo}
        todayFieldStats={todayFieldStats}
        totalNet={totalNet}
        payrollCashSplitSidebar={payrollCashSplitSidebar}
      />

      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
        <AdminTopbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          view={view}
          navItems={navItems}
          onGoToView={goToView}
          adminSession={adminSession}
          canViewRates={canViewRates}
          totalNet={totalNet}
          productionWeekEmployees={productionWeekEmployees}
          weekFrom={weekFrom}
          weekTo={weekTo}
          jobs={jobs}
          exportBackup={exportBackup}
          importBackup={importBackup}
          syncStatus={syncStatus}
          syncError={syncError}
          onRetrySync={() => runCloudSync({ toastSuccess: true })}
          onToggleSearch={() => setShowSearch((v) => !v)}
          onOpenAdminSettings={() => setShowAdminSettings(true)}
          onLogout={onLogout}
        />

        {showSearch && (
          <GlobalSearchPanel
            globalSearch={globalSearch}
            onGlobalSearchChange={setGlobalSearch}
            searchResults={searchResults}
            onNavigate={setView}
            onClose={() => setShowSearch(false)}
          />
        )}

        <AdminViewRouter
          view={view}
          payrollDetailOpen={payrollDetailOpen}
          canViewTendersNav={canViewTendersNav}
          embedded={{
            DashboardView,
            ScheduleView,
            DirectoryView,
            ContactsView,
            ArchiveView,
          }}
          jobs={jobs}
          directory={directory}
          productionWeekEmployees={productionWeekEmployees}
          weekFrom={weekFrom}
          weekTo={weekTo}
          savedWeeks={savedWeeks}
          contacts={contacts}
          adminSession={adminSession}
          alertsSeenTick={alertsSeenTick}
          onAlertsSeen={() => setAlertsSeenTick((t) => t + 1)}
          onOpenSms={() => setShowSmsModal(true)}
          tenderDashStats={tenderDashStats}
          onOpenTenders={() => setView("tenders")}
          onOpenTender={(tid) => { setPendingTenderId(tid); setView("tenders"); }}
          handleNavigate={handleNavigate}
          onFixJobs={setJobs}
          setWeekFrom={setWeekFrom}
          setWeekTo={setWeekTo}
          toggleSettled={toggleSettled}
          saveWeek={saveWeek}
          addFromDirectory={addFromDirectory}
          removeWeekEmployee={removeWeekEmployee}
          clearAllWeekEmployees={clearAllWeekEmployees}
          replaceWeekWithAllActive={replaceWeekWithAllActive}
          updateWeekEmployee={updateWeekEmployee}
          syncWeekRatesFromDirectory={syncWeekRatesFromDirectory}
          goToCurrent={goToCurrent}
          restoreWeekFromArchive={restoreWeekFromArchive}
          saveBiweeklyBacklogWeek={saveBiweeklyBacklogWeek}
          pendingPayrollEmpId={pendingPayrollEmpId}
          onInitialPayrollEmpConsumed={() => setPendingPayrollEmpId(null)}
          onPayrollDetailOpenChange={setPayrollDetailOpen}
          setDirectory={setDirectory}
          commitDirectory={commitDirectory}
          setContacts={setContacts}
          onArchiveDelete={(id) => { addDeletedArchiveId(id); setSavedWeeks((prev) => prev.filter((w) => w.id !== id)); }}
          updateArchiveWeekEmployee={updateArchiveWeekEmployee}
          toggleArchiveSettled={toggleArchiveSettled}
          setJobs={setJobs}
          deleteJobsByIds={deleteJobsByIds}
          pendingJobId={pendingJobId}
          onInitialJobConsumed={() => setPendingJobId(null)}
          onGoToInspector={(jobId) => { if (jobId) setPendingInspectorJobId(jobId); setViewReturn({ view: "jobs", label: "Roboty" }); setView("inspector"); }}
          appSettings={appSettings}
          onOpenTenderFromJobs={(tid) => { setPendingTenderId(tid); setViewReturn({ view: "jobs", label: "Roboty" }); setView("tenders"); }}
          jobsReturnNav={viewReturn && viewReturn.view !== "jobs" ? { label: viewReturn.label, onBack: () => { setView(viewReturn.view); setViewReturn(null); setPendingJobId(null); } } : undefined}
          inspectorInitialTab={inspectorInitialTab}
          pendingInspectorJobId={pendingInspectorJobId}
          onInitialInspectorJobConsumed={() => setPendingInspectorJobId(null)}
          inspectorReturnNav={viewReturn && viewReturn.view !== "inspector" ? { label: viewReturn.label, onBack: () => { setView(viewReturn.view); setViewReturn(null); setPendingInspectorJobId(null); } } : undefined}
          onOpenJobFromGallery={(id) => { setPendingJobId(id); setView("jobs"); }}
          onOpenJobFromFiles={(id) => { setPendingJobId(id); setView("jobs"); }}
          pendingTenderId={pendingTenderId}
          onOpenJobFromTender={(id) => { setPendingJobId(id); setView("jobs"); }}
          onSetPendingJobId={setPendingJobId}
          onSetView={setView}
        />

        <AdminMobileNav
          view={view}
          payrollDetailOpen={payrollDetailOpen}
          mobileNavPrimary={mobileNavPrimary}
          mobileNavMore={mobileNavMore}
          mobileMoreActive={mobileMoreActive}
          mobileMoreOpen={mobileMoreOpen}
          navItems={navItems}
          todayFieldStats={todayFieldStats}
          onGoToView={goToView}
          onOpenMore={() => setMobileMoreOpen(true)}
          onCloseMore={() => setMobileMoreOpen(false)}
        />
      </div>

      {/* Overwrite archive confirm */}
      {showAdminSettings && (
        <AdminSettingsModal
          onClose={() => setShowAdminSettings(false)}
          appSettings={appSettings}
          onAppSettingsChange={setAppSettings}
          backupTools={{
            exportBackup,
            importBackup,
            restoreAllDataFromCloud,
            restoreAllDataFromLocal: () => restoreAllDataFromLocal(false),
            restorePayrollFromCloud,
            restoreJobsFromCloud,
            restoreJobsFromLocal,
            restoreBusy,
            jobsBackupStatus,
            payrollBackupStatus,
            fullDataBackupStatus,
            localDataSnapshotLabel: listLocalDataSnapshots().length > 0
              ? new Date(listLocalDataSnapshots()[0].at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })
              : null,
          }}
        />
      )}
      {showSmsModal && (
        <SmsModalErrorBoundary onClose={() => setShowSmsModal(false)}>
          <EmployeeSmsModal
            open={showSmsModal}
            onClose={() => setShowSmsModal(false)}
            directory={directory}
            sender={adminSession}
          />
        </SmsModalErrorBoundary>
      )}
      {showSaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4" style={{background:"rgba(0,0,0,0.7)"}} onClick={()=>setShowSaveConfirm(false)}>
          <div className="bg-card rounded-t-2xl md:rounded-2xl border border-border w-full max-w-sm shadow-2xl p-6 space-y-4 modal-sheet" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-yellow-400"/>
              </div>
              <div>
                <p className="text-sm font-semibold">Nadpisać zapisany tydzień?</p>
                <p className="text-xs text-muted-foreground mt-1">Ten tydzień ({fmtDate(weekFrom)}–{fmtDate(weekTo)}) jest już zapisany w archiwum. Dane zostaną nadpisane aktualnymi wartościami.</p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button onClick={()=>setShowSaveConfirm(false)} className="flex-1 min-h-[48px] py-3 rounded-xl bg-secondary text-muted-foreground text-sm font-medium hover:text-foreground transition-colors">
                Anuluj
              </button>
              <button onClick={doSaveWeek} className="flex-1 min-h-[48px] py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                Tak, nadpisz
              </button>
            </div>
          </div>
        </div>
      )}
      <Toaster
        position="top-center"
        richColors
        closeButton
        duration={4000}
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 3.5rem)" }}
      />
    </div>
  );
}

function LoginScreen({onAdmin, onInspector, onWorker}: {onAdmin:(session: AdminSession)=>void; onInspector:(session: AdminSession)=>void; onWorker:(emp:DirectoryEmployee)=>void}) {
  const adminUsers = useMemo(() => listAdminUsersForLogin(), []);
  const inspectorUsers = useMemo(() => listInspectorUsersForLogin(), []);
  const [mode, setMode] = useState<"pick"|"admin"|"worker"|"inspector">("pick");

  const [selectedAdminId, setSelectedAdminId] = useState(adminUsers[0]?.id ?? "");
  const [selectedInspectorId, setSelectedInspectorId] = useState(inspectorUsers[0]?.id ?? "");
  const [password, setPassword] = useState("");
  const [passShow, setPassShow] = useState(false);
  const [passError, setPassError] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);

  const [directory, setDirectory] = useState<DirectoryEmployee[]>([]);
  const [dirLoading, setDirLoading] = useState(false);
  const [workerSearch, setWorkerSearch] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [phonePin, setPhonePin] = useState("");
  const [workerCode, setWorkerCode] = useState("");
  const [workerStep, setWorkerStep] = useState<"login" | "setup-pin">("login");
  const [setupPin1, setSetupPin1] = useState("");
  const [setupPin2, setSetupPin2] = useState("");
  const [setupPinLoading, setSetupPinLoading] = useState(false);
  const [workerError, setWorkerError] = useState("");

  const selectedAdmin = adminUsers.find((u) => u.id === selectedAdminId) ?? adminUsers[0] ?? null;
  const selectedInspector = inspectorUsers.find((u) => u.id === selectedInspectorId) ?? inspectorUsers[0] ?? null;
  const activeLoginUserId = mode === "inspector" ? selectedInspectorId : selectedAdminId;

  useEffect(() => {
    if (mode !== "admin" && mode !== "inspector") return;
    if (!activeLoginUserId) return;
    let cancelled = false;
    (async () => {
      const enabled = adminRememberEnabled();
      if (!cancelled) setRememberPassword(enabled);
      if (enabled) {
        const saved = await loadRememberedAdminPassword(activeLoginUserId);
        if (!cancelled && saved) setPassword(saved);
      }
    })();
    return () => { cancelled = true; };
  }, [mode, activeLoginUserId]);

  const handleAdminLogin = async () => {
    if (!selectedAdmin) { setPassError("Brak kont administratora"); return; }
    if (!password) { setPassError("Wpisz hasło"); return; }
    setPassLoading(true);
    const session = await verifyAdminLogin(selectedAdmin.login, password);
    if (session) {
      if (session.role === "inspector") { setPassLoading(false); setPassError("Użyj logowania Inspektor"); setPassword(""); return; }
      if (rememberPassword) await saveRememberedAdminPassword(selectedAdmin.id, password);
      else clearRememberedAdminPassword();
      setPassLoading(false);
      onAdmin(session);
      return;
    }
    setPassLoading(false);
    setPassError("Błędne hasło");
    setPassword("");
  };

  const handleInspectorLogin = async () => {
    if (!selectedInspector) { setPassError("Brak kont inspektorów"); return; }
    if (!password) { setPassError("Wpisz hasło"); return; }
    setPassLoading(true);
    const session = await verifyAdminLogin(selectedInspector.login, password);
    if (session && session.role === "inspector") {
      if (rememberPassword) await saveRememberedAdminPassword(selectedInspector.id, password);
      else clearRememberedAdminPassword();
      setPassLoading(false);
      onInspector(session);
      return;
    }
    setPassLoading(false);
    setPassError("Błędne hasło");
    setPassword("");
  };

  useEffect(() => {
    if (mode !== "worker") return;
    setDirLoading(true);
    setWorkerError("");
    fetchKeysFromCloud(["kw-directory", DIRECTORY_DELETED_IDS_KEY])
      .then((values) => {
        const [cloudRaw, cloudDeletedRaw] = values;
        const mergedDirDeleted = mergeDeletedDirectoryIds(getDeletedDirectoryIds(), normalizeDeletedDirectoryIds(cloudDeletedRaw));
        saveDeletedDirectoryIds(mergedDirDeleted);
        if (Array.isArray(cloudRaw)) {
          let local: DirectoryEmployee[] = [];
          try {
            local = JSON.parse(localStorage.getItem("kw-directory") || "[]");
          } catch { /* ignore */ }
          const merged = mergeDirectory(local, cloudRaw, mergedDirDeleted) as DirectoryEmployee[];
          setDirectory(merged);
          try { localStorage.setItem("kw-directory", JSON.stringify(merged)); } catch { /* ignore */ }
        } else {
          try {
            const local = localStorage.getItem("kw-directory");
            if (local) setDirectory(JSON.parse(local));
          } catch { /* ignore */ }
        }
      })
      .catch(() => {
        try {
          const local = localStorage.getItem("kw-directory");
          if (local) setDirectory(JSON.parse(local));
        } catch { /* ignore */ }
      })
      .finally(() => setDirLoading(false));
  }, [mode]);

  const activeWorkers = useMemo(() => {
    const q = workerSearch.trim().toLowerCase();
    return directory
      .filter((d) => d.active)
      .filter((d) => !q || d.name.toLowerCase().includes(q) || d.position.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [directory, workerSearch]);

  const selectedWorker = directory.find((d) => d.id === selectedWorkerId) || null;

  const handleWorkerSubmit = async () => {
    setWorkerError("");
    if (!selectedWorker) { setWorkerError("Wybierz siebie z listy"); return; }
    if (!workerHasPhonePin(selectedWorker)) {
      setWorkerError("Brak numeru w kartotece — poproś administratora o wpisanie telefonu (+48…).");
      return;
    }
    const pin = phonePin.replace(/\D/g, "");
    if (pin.length !== 9) { setWorkerError("Wpisz 9 cyfr telefonu (bez +48)"); return; }
    if (!workerPhonePinValid(selectedWorker, pin)) {
      setWorkerError("Błędny numer — wpisz 9 ostatnich cyfr swojego telefonu");
      setPhonePin("");
      return;
    }

    const emp = directory.find((d) => d.id === selectedWorkerId) || selectedWorker;

    if (!workerHasPersonalPin(emp)) {
      setWorkerStep("setup-pin");
      setSetupPin1("");
      setSetupPin2("");
      return;
    }

    const code = workerCode.replace(/\D/g, "");
    if (code.length !== 4) { setWorkerError("Wpisz swój 4-cyfrowy kod"); return; }
    try {
      const ok = await verifyWorkerPin(emp, code);
      if (!ok) {
        setWorkerError("Błędny kod pracownika");
        setWorkerCode("");
        return;
      }
      onWorker(emp);
    } catch {
      setWorkerError("Błąd logowania — odśwież stronę i spróbuj ponownie");
    }
  };

  const handleWorkerSetupPin = async () => {
    setWorkerError("");
    const emp = directory.find((d) => d.id === selectedWorkerId);
    if (!emp) { setWorkerError("Wybierz siebie z listy"); return; }
    const c1 = setupPin1.replace(/\D/g, "").slice(0, 4);
    const c2 = setupPin2.replace(/\D/g, "").slice(0, 4);
    if (c1.length !== 4) { setWorkerError("Kod musi mieć 4 cyfry"); return; }
    if (c1 !== c2) { setWorkerError("Kody nie pasują — wpisz ponownie"); setSetupPin2(""); return; }
    if (workerPinTooWeak(emp, c1)) {
      setWorkerError("Kod nie może być ostatnimi 4 cyframi telefonu — wybierz inny");
      return;
    }
    setSetupPinLoading(true);
    try {
      const hash = await hashWorkerPin(c1);
      const updated = directory.map((d) => (d.id === emp.id ? { ...d, workerPinHash: hash } : d));
      setDirectory(updated);
      try {
        localStorage.setItem("kw-directory", JSON.stringify(updated));
        await pushDirectoryToCloud(updated);
      } catch { /* offline — zapis lokalny */ }
      onWorker(updated.find((d) => d.id === emp.id)!);
    } catch {
      setWorkerError("Nie udało się zapisać kodu — spróbuj ponownie");
    } finally {
      setSetupPinLoading(false);
    }
  };

  const resetWorkerLogin = () => {
    setMode("pick");
    setSelectedWorkerId("");
    setPhonePin("");
    setWorkerCode("");
    setWorkerStep("login");
    setSetupPin1("");
    setSetupPin2("");
    setWorkerSearch("");
    setWorkerError("");
  };

  const PasswordField = ({value, show, onToggle, onChange, onEnter, placeholder, autoFocus}: {
    value:string; show:boolean; onToggle:()=>void; onChange:(v:string)=>void;
    onEnter?:()=>void; placeholder?:string; autoFocus?:boolean;
  }) => (
    <div className="relative">
      <input type={show?"text":"password"} placeholder={placeholder||"Wpisz hasło..."} value={value} autoFocus={autoFocus}
        onChange={e=>onChange(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&onEnter?.()}
        className="w-full bg-secondary rounded-xl px-4 py-3 pr-10 text-base border border-transparent focus:border-primary focus:outline-none transition-colors"/>
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
        <Eye size={15}/>
      </button>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-4 py-8 overflow-y-auto" style={{fontFamily:"'Inter',sans-serif", paddingTop:"max(2rem, env(safe-area-inset-top))", paddingBottom:"max(2rem, env(safe-area-inset-bottom))"}}>
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="text-center space-y-2">
          <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-10 w-auto object-contain mx-auto"/>
          <p className="text-xs text-muted-foreground">System zarządzania robotami</p>
        </div>

        {/* Mode: pick */}
        {mode === "pick" && (
          <div className="space-y-3">
            <button onClick={()=>setMode("admin")}
              className="w-full bg-primary text-primary-foreground rounded-2xl px-6 py-5 flex items-center gap-4 hover:bg-primary/90 active:scale-[0.98] transition-all">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><ShieldCheck size={22}/></div>
              <div className="text-left">
                <p className="font-semibold text-base">Panel administracyjny</p>
                <p className="text-xs opacity-70 mt-0.5">Wybierz użytkownika i wpisz hasło</p>
              </div>
            </button>
            <button onClick={()=>setMode("inspector")}
              className="w-full bg-card border border-border rounded-2xl px-6 py-5 flex items-center gap-4 hover:border-emerald-500/40 hover:bg-emerald-500/5 active:scale-[0.98] transition-all">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0"><ClipboardCheck size={22} className="text-emerald-600 dark:text-emerald-400"/></div>
              <div className="text-left">
                <p className="font-semibold text-base">Inspektor</p>
                <p className="text-xs text-muted-foreground mt-0.5">Roboty, dokumenty, zlecenia — Wrocławskie Mieszkania</p>
              </div>
            </button>
            <button onClick={()=>setMode("worker")}
              className="w-full bg-card border border-border rounded-2xl px-6 py-5 flex items-center gap-4 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all">
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0"><HardHat size={22} className="text-muted-foreground"/></div>
              <div className="text-left">
                <p className="font-semibold text-base">Pracownik</p>
                <p className="text-xs text-muted-foreground mt-0.5">Zdjęcia, raport · telefon + kod 4 cyfry</p>
              </div>
            </button>
          </div>
        )}

        {/* Mode: admin login */}
        {mode === "admin" && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={()=>{setMode("pick");setPassword("");setPassError("");}} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground transition-colors"><ArrowLeft size={16}/></button>
              <div className="flex items-center gap-2"><Lock size={14} className="text-primary"/><span className="text-sm font-semibold">Logowanie administratora</span></div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Użytkownik</label>
              <select
                value={selectedAdminId}
                onChange={(e) => {
                  setSelectedAdminId(e.target.value);
                  setPassword("");
                  setPassError("");
                }}
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"
              >
                {adminUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Hasło</label>
              <PasswordField value={password} show={passShow} onToggle={()=>setPassShow(v=>!v)}
                onChange={v=>{setPassword(v);setPassError("");}} onEnter={handleAdminLogin} autoFocus/>
              {passError && <p className="text-xs text-destructive">{passError}</p>}
              <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={rememberPassword}
                  onChange={(e) => setRememberPassword(e.target.checked)}
                  className="mt-0.5 rounded border-border accent-primary shrink-0"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Zapamiętaj hasło na tym urządzeniu
                  <span className="block text-[10px] text-muted-foreground/60 mt-0.5">Tylko lokalnie w przeglądarce — nie trafia do chmury</span>
                </span>
              </label>
            </div>
            <button onClick={handleAdminLogin} disabled={passLoading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {passLoading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>}
              Zaloguj
            </button>
          </div>
        )}

        {/* Mode: inspector login */}
        {mode === "inspector" && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={()=>{setMode("pick");setPassword("");setPassError("");}} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground transition-colors"><ArrowLeft size={16}/></button>
              <div className="flex items-center gap-2"><ClipboardCheck size={14} className="text-emerald-600 dark:text-emerald-400"/><span className="text-sm font-semibold">Logowanie inspektora</span></div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Użytkownik</label>
              <select
                value={selectedInspectorId}
                onChange={(e) => {
                  setSelectedInspectorId(e.target.value);
                  setPassword("");
                  setPassError("");
                }}
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"
              >
                {inspectorUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Hasło</label>
              <PasswordField value={password} show={passShow} onToggle={()=>setPassShow(v=>!v)}
                onChange={v=>{setPassword(v);setPassError("");}} onEnter={handleInspectorLogin} autoFocus/>
              {passError && <p className="text-xs text-destructive">{passError}</p>}
              <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={rememberPassword}
                  onChange={(e) => setRememberPassword(e.target.checked)}
                  className="mt-0.5 rounded border-border accent-primary shrink-0"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Zapamiętaj hasło na tym urządzeniu
                  <span className="block text-[10px] text-muted-foreground/60 mt-0.5">Tylko lokalnie w przeglądarce — nie trafia do chmury</span>
                </span>
              </label>
            </div>
            <button onClick={handleInspectorLogin} disabled={passLoading}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-600/90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {passLoading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>}
              Wejdź do panelu
            </button>
          </div>
        )}

        {/* Mode: worker */}
        {mode === "worker" && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={resetWorkerLogin} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground transition-colors"><ArrowLeft size={16}/></button>
              <div className="flex items-center gap-2"><HardHat size={14} className="text-muted-foreground"/><span className="text-sm font-semibold">{workerStep === "setup-pin" ? "Ustaw kod pracownika" : "Logowanie pracownika"}</span></div>
            </div>

            {dirLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : workerStep === "setup-pin" && selectedWorker ? (
              <>
                <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 space-y-1">
                  <p className="text-sm font-semibold">{selectedWorker.name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    To pierwsze logowanie — ustaw <strong>osobisty kod 4 cyfry</strong> (jak PIN do karty). Zapamiętaj go — chroni Twoją wypłatę przed podglądem przez innych. Nie podawaj kodu kolegom.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Nowy kod (4 cyfry)</label>
                    <input type="tel" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="••••" value={setupPin1}
                      onChange={e=>{setSetupPin1(e.target.value.replace(/\D/g,"").slice(0,4));setWorkerError("");}}
                      className="w-full bg-secondary rounded-xl px-4 py-3 text-sm tracking-[0.4em] text-center border border-transparent focus:border-primary focus:outline-none transition-colors" autoFocus/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Powtórz kod</label>
                    <input type="tel" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="••••" value={setupPin2}
                      onChange={e=>{setSetupPin2(e.target.value.replace(/\D/g,"").slice(0,4));setWorkerError("");}}
                      onKeyDown={e=>e.key==="Enter"&&handleWorkerSetupPin()}
                      className="w-full bg-secondary rounded-xl px-4 py-3 text-sm tracking-[0.4em] text-center border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                  </div>
                </div>
                {workerError && <p className="text-xs text-destructive">{workerError}</p>}
                <button onClick={handleWorkerSetupPin} disabled={setupPinLoading || setupPin1.length !== 4 || setupPin2.length !== 4}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {setupPinLoading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>}
                  Zapisz kod i wejdź
                </button>
                <button type="button" onClick={()=>{setWorkerStep("login");setSetupPin1("");setSetupPin2("");setWorkerError("");}}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Wróć
                </button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Wybierz siebie z listy</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                    <input type="search" placeholder="Szukaj imienia..." value={workerSearch}
                      onChange={e=>{setWorkerSearch(e.target.value);setWorkerError("");}}
                      className="w-full bg-secondary rounded-xl pl-9 pr-4 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"/>
                  </div>
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                    {activeWorkers.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">Brak aktywnych pracowników w kartotece.</p>
                    ) : activeWorkers.map((emp) => {
                      const hasPin = workerHasPhonePin(emp);
                      const sel = selectedWorkerId === emp.id;
                      return (
                        <button key={emp.id} type="button" disabled={!hasPin}
                          onClick={()=>{setSelectedWorkerId(emp.id);setWorkerError("");setWorkerCode("");}}
                          className={`w-full px-4 py-3 text-left transition-colors ${sel?"bg-primary/10":"hover:bg-secondary/50"} ${!hasPin?"opacity-50 cursor-not-allowed":""}`}>
                          <p className="text-sm font-medium">{emp.name||"Bez nazwy"}</p>
                          {!hasPin && <p className="text-[10px] text-amber-400 mt-0.5">Brak numeru — poproś admina</p>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedWorker && workerHasPhonePin(selectedWorker) && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Telefon — 9 cyfr (bez +48)</label>
                      <input type="tel" inputMode="numeric" autoComplete="off" maxLength={11}
                        placeholder="np. 501234567" value={phonePin}
                        onChange={e=>{setPhonePin(e.target.value.replace(/\D/g,"").slice(0,9));setWorkerError("");}}
                        className="w-full bg-secondary rounded-xl px-4 py-3 text-sm tracking-widest border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                    </div>
                    {workerHasPersonalPin(selectedWorker) && (
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Twój kod pracownika (4 cyfry)</label>
                        <input type="tel" inputMode="numeric" autoComplete="off" maxLength={4}
                          placeholder="••••" value={workerCode}
                          onChange={e=>{setWorkerCode(e.target.value.replace(/\D/g,"").slice(0,4));setWorkerError("");}}
                          onKeyDown={e=>e.key==="Enter"&&handleWorkerSubmit()}
                          className="w-full bg-secondary rounded-xl px-4 py-3 text-sm tracking-[0.4em] text-center border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                        <p className="text-[10px] text-muted-foreground">Osobisty kod — nie taki sam jak u kolegów. Zapomniałeś? Poproś administratora o reset w kartotece.</p>
                      </div>
                    )}
                    {!workerHasPersonalPin(selectedWorker) && phonePin.replace(/\D/g,"").length === 9 && workerPhonePinValid(selectedWorker, phonePin) && (
                      <p className="text-[11px] text-primary/90 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                        Pierwsze logowanie — po potwierdzeniu telefonu ustawisz osobisty kod 4 cyfry.
                      </p>
                    )}
                  </>
                )}

                {workerError && <p className="text-xs text-destructive">{workerError}</p>}

                {selectedWorker && workerHasPhonePin(selectedWorker) && phonePin.replace(/\D/g, "").length !== 9 && (
                  <p className="text-[11px] text-muted-foreground">Wpisz 9 cyfr telefonu, żeby kontynuować.</p>
                )}
                {selectedWorker && workerHasPhonePin(selectedWorker) && workerHasPersonalPin(selectedWorker) && phonePin.replace(/\D/g, "").length === 9 && workerCode.length !== 4 && (
                  <p className="text-[11px] text-muted-foreground">Wpisz swój 4-cyfrowy kod pracownika.</p>
                )}

                <button
                  type="button"
                  onClick={handleWorkerSubmit}
                  disabled={!selectedWorker || !workerHasPhonePin(selectedWorker)}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {selectedWorker && workerHasPersonalPin(selectedWorker) ? "Zaloguj" : "Dalej — ustaw kod"}
                </button>
              </>
            )}
          </div>
        )}

        <PwaInstallBanner/>
      </div>
    </div>
  );
}

// ─── Worker Photo View ────────────────────────────────────────────────────────

function WorkerPhotoView({ workerName, workerId, onLogout }: { workerName: string; workerId: string; onLogout: () => void }) {
  const [jobs, setJobsLocal] = useLocalStorage<Job[]>("kw-jobs", []);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string|null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [search, setSearch] = useState("");
  const [galleryLabel, setGalleryLabel] = useState<PhotoEntry["label"]>("progress");
  const [galleryPicks, setGalleryPicks] = useState<{ file: File; preview: string; caption: string }[]>([]);
  const [quickPhotoCaption, setQuickPhotoCaption] = useState("");
  const [editingReport, setEditingReport] = useState<WorkerJobReport | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [flushingQueue, setFlushingQueue] = useState(false);
  const [weekEmployees, setWeekEmployees] = useState<WeekEmployee[]>([]);
  const [savedWeeks, setSavedWeeks] = useState<WeekSnapshot[]>([]);
  const [weekFrom, setWeekFrom] = useState("");
  const [weekTo, setWeekTo] = useState("");
  const [payrollLoading, setPayrollLoading] = useState(true);
  const [showPayHistory, setShowPayHistory] = useState(false);
  const [workerTab, setWorkerTab] = useState<"jobs" | "pay" | "schedule">("jobs");
  const [workerHelpOpen, setWorkerHelpOpen] = useState(false);
  const [receiptDesc, setReceiptDesc] = useState("");
  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptError, setReceiptError] = useState("");
  const privacyShield = useWorkerPrivacyShield(true);

  const currentWeekEmp = useMemo(
    () => findWeekEmployeeForWorker(weekEmployees, workerId, workerName),
    [weekEmployees, workerId, workerName],
  );
  const currentPay = useMemo(
    () => (currentWeekEmp ? calcWeekEmployee(currentWeekEmp) : null),
    [currentWeekEmp],
  );
  const payHistory = useMemo(
    () => workerPayoutHistory(savedWeeks, workerId, workerName).filter((row) => row.weekFrom !== weekFrom),
    [savedWeeks, workerId, workerName, weekFrom],
  );
  const fridayPayDate = weekFrom ? fridayIsoOfWeek(weekFrom) : "";
  const todayWork = useMemo(
    () => workerTodayWorkInfo(currentWeekEmp, jobs, weekFrom, weekTo),
    [currentWeekEmp, jobs, weekFrom, weekTo],
  );
  const scheduleColumns = useMemo(() => (weekFrom ? weekDayColumns(weekFrom) : []), [weekFrom]);
  const myExtraCosts = currentWeekEmp?.extraCosts ?? [];
  const pendingExtraCosts = myExtraCosts.filter((c) => extraCostStatus(c) === "pending");
  const approvedExtraCosts = myExtraCosts.filter((c) => extraCostStatus(c) === "approved");
  const rejectedExtraCosts = myExtraCosts.filter((c) => extraCostStatus(c) === "rejected");

  useEffect(() => {
    return () => { galleryPicks.forEach((p) => URL.revokeObjectURL(p.preview)); };
  }, [galleryPicks]);

  const refreshQueueCount = useCallback(() => {
    queuedPhotoCount("worker").then(setQueueCount).catch(() => {});
  }, []);

  useEffect(() => { refreshQueueCount(); }, [refreshQueueCount]);

  const flushQueue = useCallback(async () => {
    if (!navigator.onLine || flushingQueue) return;
    setFlushingQueue(true);
    try {
      const items = await listQueuedPhotos("worker");
      for (const item of items) {
        const job = jobs.find((j) => j.id === item.jobId);
        if (!job) {
          await removeQueuedPhoto(item.id);
          continue;
        }
        const file = new File([item.blob], item.filename, { type: item.blob.type || "image/jpeg" });
        const { entry, error } = await uploadPhoto(item.jobId, file, item.label as PhotoEntry["label"], item.uploadedBy, item.caption);
        if (entry) {
          setJobsLocal((prev) => {
            const updated = prev.map((j) =>
              j.id === item.jobId
                ? appendJobActivity(
                    { ...j, photos: [...(j.photos || []), entry] },
                    "photo_upload",
                    `${item.uploadedBy} wgrał zdjęcie z kolejki (${item.label})`,
                    item.uploadedBy,
                  )
                : j,
            );
            pushKeysToCloudSafe(["kw-jobs"], [updated]).catch(() => {});
            try { localStorage.setItem("kw-jobs", JSON.stringify(updated)); } catch { /* ignore */ }
            return updated;
          });
          await removeQueuedPhoto(item.id);
        } else if (error?.includes("internet")) {
          break;
        }
      }
    } finally {
      setFlushingQueue(false);
      refreshQueueCount();
    }
  }, [jobs, flushingQueue, refreshQueueCount, setJobsLocal]);

  useEffect(() => {
    const onOnline = () => { flushQueue(); };
    window.addEventListener("online", onOnline);
    if (navigator.onLine) flushQueue();
    return () => window.removeEventListener("online", onOnline);
  }, [flushQueue]);

  const loadWorkerLocal = useCallback(<T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }, []);

  const mergeWorkerCloudPayload = useCallback(
    (values: unknown[]) => {
      const [cloudJobs, cloudDeletedRaw, cloudWeekEmps, cloudArchive, cloudFrom, cloudTo] = values;
      const mergedDeleted = mergeDeletedJobIds(getDeletedJobIds(), normalizeDeletedJobIds(cloudDeletedRaw));
      saveDeletedJobIds(mergedDeleted);
      if (cloudJobs != null) {
        let localJobs: Job[] = [];
        try {
          localJobs = normalizeJobsValue(JSON.parse(localStorage.getItem("kw-jobs") || "[]")) as Job[];
        } catch { /* ignore */ }
        const cloudJobsNorm = normalizeJobsValue(cloudJobs) as Job[];
        const merged = mergeJobsById(localJobs, cloudJobsNorm, mergedDeleted) as Job[];
        const synced = normalizeJobsList(merged as unknown[]);
        setJobsLocal(synced);
        try { localStorage.setItem("kw-jobs", JSON.stringify(synced)); } catch { /* ignore */ }
      }
      const week = getWeekRange();
      const mergedWeekEmps = mergeWeekEmployees(
        loadWorkerLocal<WeekEmployee[]>("kw-week-employees", []),
        (cloudWeekEmps as WeekEmployee[] | null) ?? [],
      ) as WeekEmployee[];
      const mergedArch = mergeArchive(
        loadWorkerLocal<WeekSnapshot[]>("kw-archive", []),
        (cloudArchive as WeekSnapshot[] | null) ?? [],
      ) as WeekSnapshot[];
      const mergedFrom = typeof cloudFrom === "string" && cloudFrom ? cloudFrom : loadWorkerLocal("kw-weekFrom", week.from);
      const mergedTo = typeof cloudTo === "string" && cloudTo ? cloudTo : loadWorkerLocal("kw-weekTo", week.to);
      setWeekEmployees(mergedWeekEmps);
      setSavedWeeks(mergedArch);
      setWeekFrom(mergedFrom);
      setWeekTo(mergedTo);
      try {
        localStorage.setItem("kw-week-employees", JSON.stringify(mergedWeekEmps));
        localStorage.setItem("kw-archive", JSON.stringify(mergedArch));
        localStorage.setItem("kw-weekFrom", JSON.stringify(mergedFrom));
        localStorage.setItem("kw-weekTo", JSON.stringify(mergedTo));
      } catch { /* ignore */ }
    },
    [loadWorkerLocal, setJobsLocal],
  );

  useEffect(() => {
    fetchKeysFromCloud(["kw-jobs", JOBS_DELETED_IDS_KEY, "kw-week-employees", "kw-archive", "kw-weekFrom", "kw-weekTo"])
      .then(mergeWorkerCloudPayload)
      .catch(() => {
        setWeekEmployees(loadWorkerLocal<WeekEmployee[]>("kw-week-employees", []));
        setSavedWeeks(loadWorkerLocal<WeekSnapshot[]>("kw-archive", []));
        const week = getWeekRange();
        setWeekFrom(loadWorkerLocal("kw-weekFrom", week.from));
        setWeekTo(loadWorkerLocal("kw-weekTo", week.to));
      })
      .finally(() => {
        setJobsLoading(false);
        setPayrollLoading(false);
      });
  }, [mergeWorkerCloudPayload, loadWorkerLocal]);

  const activeJobs = jobs
    .filter(j => j.status === "in_progress")
    .filter(j => !search.trim() || j.address.toLowerCase().includes(search.toLowerCase()) || (j.client||"").toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => b.startDate.localeCompare(a.startDate));

  const selectedJob = jobs.find(j => j.id === selectedJobId) || null;

  const LABELS: {value: PhotoEntry["label"]; icon: React.ElementType; title: string; desc: string; color: string}[] = [
    {value:"before", icon:Camera,    title:"Przed remontem", desc:"Stan mieszkania przed rozpoczęciem prac",  color:"bg-blue-500/10 border-blue-500/25 text-blue-400"},
    {value:"after",  icon:Eye,       title:"Po remoncie",    desc:"Stan mieszkania po zakończeniu prac",       color:"bg-green-500/10 border-green-500/25 text-green-400"},
    {value:"progress",icon:ImagePlus,title:"W trakcie prac", desc:"Postęp prac — można wgrać wiele zdjęć",    color:"bg-yellow-500/10 border-yellow-500/20 text-yellow-400"},
  ];

  const syncJobs = (updater: (prev: Job[]) => Job[]) => {
    setJobsLocal((prev) => {
      const updated = updater(prev);
      saveLocalJobsSnapshot(updated);
      pushKeysToCloudSafe(["kw-jobs"], [updated]).catch(() => {});
      return updated;
    });
  };

  const syncWeekEmployees = (updater: (prev: WeekEmployee[]) => WeekEmployee[]) => {
    setWeekEmployees((prev) => {
      const now = new Date().toISOString();
      const incoming = updater(prev);
      const updated = incoming.map((emp) => {
        const old = prev.find((e) => e.id === emp.id);
        if (!old) return emp;
        const rateChanged = emp.rate !== old.rate;
        const dataChanged =
          JSON.stringify({ days: emp.days, prevSaturday: emp.prevSaturday, extraCosts: emp.extraCosts })
          !== JSON.stringify({ days: old.days, prevSaturday: old.prevSaturday, extraCosts: old.extraCosts });
        if (!rateChanged && !dataChanged) return emp;
        return {
          ...emp,
          rateUpdatedAt: rateChanged ? now : emp.rateUpdatedAt ?? old.rateUpdatedAt,
          dataUpdatedAt: dataChanged ? now : emp.dataUpdatedAt ?? old.dataUpdatedAt,
        };
      });
      try { localStorage.setItem("kw-week-employees", JSON.stringify(updated)); } catch { /* ignore */ }
      pushKeysToCloudSafe(["kw-week-employees"], [updated]).catch(() => {});
      return updated;
    });
  };

  const reloadWorkerData = useCallback(() => {
    fetchKeysFromCloud(["kw-jobs", JOBS_DELETED_IDS_KEY, "kw-week-employees", "kw-archive", "kw-weekFrom", "kw-weekTo"])
      .then(mergeWorkerCloudPayload)
      .catch(() => {
        try {
          const localJobs = normalizeJobsValue(JSON.parse(localStorage.getItem("kw-jobs") || "[]")) as Job[];
          setJobsLocal(localJobs);
        } catch { /* ignore */ }
        setWeekEmployees(loadWorkerLocal<WeekEmployee[]>("kw-week-employees", []));
        setSavedWeeks(loadWorkerLocal<WeekSnapshot[]>("kw-archive", []));
        const wf = loadWorkerLocal<string>("kw-weekFrom", "");
        const wt = loadWorkerLocal<string>("kw-weekTo", "");
        if (wf) setWeekFrom(wf);
        if (wt) setWeekTo(wt);
      });
  }, [mergeWorkerCloudPayload, loadWorkerLocal, setJobsLocal]);

  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) reloadWorkerData();
    };
    window.addEventListener("focus", reloadWorkerData);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", reloadWorkerData);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reloadWorkerData]);

  const workerScrollRef = useRef<HTMLDivElement>(null);
  const workerPull = usePullToRefresh(workerScrollRef, reloadWorkerData, !selectedJobId);

  useEffect(() => {
    return onNativeAppResume(() => { reloadWorkerData(); });
  }, [reloadWorkerData]);

  useEffect(() => {
    if (!selectedJobId) return;
    return registerNativeBackHandler(() => {
      setSelectedJobId(null);
      return true;
    });
  }, [selectedJobId]);

  const submitReceipt = async (file: File) => {
    if (!currentWeekEmp) {
      setReceiptError("Nie ma Cię na liście płac w tym tygodniu — poproś admina o dodanie.");
      return;
    }
    const desc = receiptDesc.trim();
    const amount = receiptAmount.trim();
    if (!desc || !amount || !(parseFloat(amount) > 0)) {
      setReceiptError("Podaj opis i kwotę większą od zera.");
      return;
    }
    setReceiptUploading(true);
    setReceiptError("");
    const { publicUrl, error } = await uploadReceipt(workerId || workerName, file);
    if (!publicUrl) {
      setReceiptError(error || "Nie udało się wgrać paragonu.");
      setReceiptUploading(false);
      return;
    }
    const newCost: EmployeeExtraCost = {
      id: crypto.randomUUID(),
      description: desc,
      amount,
      receiptUrl: publicUrl,
      status: "pending",
      submittedAt: new Date().toISOString(),
      submittedBy: workerName,
    };
    syncWeekEmployees((prev) =>
      prev.map((e) =>
        e.id === currentWeekEmp.id
          ? { ...e, extraCosts: [...(e.extraCosts ?? []), newCost] }
          : e,
      ),
    );
    setReceiptDesc("");
    setReceiptAmount("");
    setReceiptUploading(false);
  };

  const removeMyExtraCost = (costId: string) => {
    if (!currentWeekEmp || !window.confirm("Usunąć ten koszt?")) return;
    syncWeekEmployees((prev) =>
      prev.map((e) =>
        e.id === currentWeekEmp.id
          ? { ...e, extraCosts: (e.extraCosts ?? []).filter((c) => c.id !== costId) }
          : e,
      ),
    );
  };

  const uploadFilesBatch = async (
    picks: { file: File; caption: string }[],
    label: PhotoEntry["label"],
  ) => {
    if (!selectedJob || picks.length === 0) return;
    setUploading(true);
    setUploadError("");
    setUploadedCount(0);
    setUploadTotal(picks.length);
    const newPhotos: PhotoEntry[] = [];
    let queued = 0;
    let failMsg = "";
    for (const pick of picks) {
      const wm = await prepareWatermarkedPhoto(selectedJob, pick.file);
      const { entry, error } = await uploadPhoto(selectedJob.id, wm, label, workerName, pick.caption);
      if (entry) {
        newPhotos.push(entry);
        setUploadedCount((p) => p + 1);
      } else {
        try {
          await queuePhoto({
            kind: "worker",
            jobId: selectedJob.id,
            label,
            caption: pick.caption,
            uploadedBy: workerName,
            blob: wm,
            filename: wm.name,
          });
          queued += 1;
          refreshQueueCount();
        } catch {
          failMsg = error || "Nie udało się wgrać zdjęcia.";
        }
        if (!failMsg) failMsg = error || "Brak sieci — zdjęcie zapisane w kolejce offline.";
      }
    }
    if (newPhotos.length > 0) {
      syncJobs((prev) =>
        prev.map((j) =>
          j.id === selectedJobId
            ? appendJobActivity(
                { ...j, photos: [...(j.photos || []), ...newPhotos] },
                "photo_upload",
                `${workerName} wgrał ${newPhotos.length} zdjęć (${label})`,
                workerName,
              )
            : j,
        ),
      );
    }
    if (failMsg || queued > 0) {
      setUploadError(
        [
          newPhotos.length > 0 ? `Wgrano ${newPhotos.length} z ${picks.length}.` : "",
          queued > 0 ? `${queued} w kolejce offline — wyśle się po powrocie sieci.` : failMsg,
        ].filter(Boolean).join(" "),
      );
    }
    setUploading(false);
    setUploadTotal(0);
  };

  const uploadFilesBatchLegacy = async (files: File[], label: PhotoEntry["label"], caption = "") => {
    await uploadFilesBatch(files.map((file) => ({ file, caption })), label);
  };

  const handleFiles = async (files: FileList | null, label: PhotoEntry["label"]) => {
    if (!files?.length) return;
    await uploadFilesBatchLegacy(Array.from(files), label, quickPhotoCaption);
    setQuickPhotoCaption("");
  };

  const onGalleryPick = (files: FileList | null) => {
    if (!files?.length) {
      setUploadError("Nie wybrano zdjęć — spróbuj ponownie.");
      return;
    }
    galleryPicks.forEach((p) => URL.revokeObjectURL(p.preview));
    setGalleryPicks(Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      caption: "",
    })));
    setUploadError("");
  };

  const clearGallery = () => {
    galleryPicks.forEach((p) => URL.revokeObjectURL(p.preview));
    setGalleryPicks([]);
  };

  const submitGallery = async () => {
    if (galleryPicks.length === 0) return;
    await uploadFilesBatch(galleryPicks.map((p) => ({ file: p.file, caption: p.caption })), galleryLabel);
    clearGallery();
  };

  const handleReportSaved = async (report: WorkerJobReport) => {
    if (editingReport) {
      syncJobs((prev) =>
        prev.map((j) =>
          j.id === selectedJobId
            ? syncJobDocuments({
                ...j,
                workerReports: jobWorkerReports(j).map((r) => (r.id === report.id ? report : r)),
                reportDocSaOverride: clearReportDocSaOverrideFromReport(j.reportDocSaOverride, report),
              })
            : j,
        ),
      );
      setEditingReport(null);
    } else {
      syncJobs((prev) =>
        prev.map((j) =>
          j.id === selectedJobId
            ? syncJobDocuments({
                ...j,
                workerReports: [...jobWorkerReports(j), report],
                reportDocSaOverride: clearReportDocSaOverrideFromReport(j.reportDocSaOverride, report),
              })
            : j,
        ),
      );
    }
  };

  const deleteMyReport = (reportId: string) => {
    if (!window.confirm("Usunąć ten raport?")) return;
    syncJobs((prev) =>
      prev.map((j) =>
        j.id === selectedJobId
          ? { ...j, workerReports: jobWorkerReports(j).filter((r) => r.id !== reportId) }
          : j,
      ),
    );
    if (editingReport?.id === reportId) setEditingReport(null);
  };

  const updateMyPhoto = (photoId: string, patch: Partial<PhotoEntry>) => {
    syncJobs((prev) =>
      prev.map((j) =>
        j.id === selectedJobId
          ? { ...j, photos: (j.photos || []).map((p) => (p.id === photoId ? { ...p, ...patch } : p)) }
          : j,
      ),
    );
  };

  const deleteMyPhoto = (photoId: string) => {
    if (!window.confirm("Usunąć to zdjęcie z listy?")) return;
    syncJobs((prev) =>
      prev.map((j) =>
        j.id === selectedJobId
          ? { ...j, photos: (j.photos || []).filter((p) => p.id !== photoId) }
          : j,
      ),
    );
  };

  const myPhotos = selectedJob ? (selectedJob.photos||[]).filter(p=>p.uploadedBy===workerName) : [];
  const myReports = selectedJob ? jobWorkerReports(selectedJob).filter(r => r.workerName === workerName) : [];

  return (
    <div
      className="flex flex-col bg-background text-foreground select-none [-webkit-touch-callout:none]"
      style={{ fontFamily: "'Inter',sans-serif", height: "100dvh" }}
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-card shrink-0" style={{paddingTop:"max(1rem,env(safe-area-inset-top))"}}>
        <div className="flex items-center gap-3">
          <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-7 w-auto object-contain"/>
          <div className="w-px h-5 bg-border"/>
          <div>
            <p className="text-xs font-semibold">{workerName}</p>
            <p className="text-[10px] text-muted-foreground">Tryb pracownika</p>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-2.5 min-h-[44px] rounded-lg hover:bg-secondary transition-colors">
          <LogOut size={13}/>Wyloguj
        </button>
      </div>

      {!selectedJob && (
        <div className="flex border-b border-border bg-card shrink-0">
          <button
            type="button"
            onClick={() => setWorkerTab("jobs")}
            title="Wybierz robotę, wgrywaj zdjęcia i raporty z budowy"
            className={`flex-1 min-h-[48px] py-3.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${workerTab === "jobs" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            <MapPin size={14}/>Roboty
          </button>
          <button
            type="button"
            onClick={() => setWorkerTab("schedule")}
            title="Twój grafik na ten tydzień — godziny i adresy robót"
            className={`flex-1 min-h-[48px] py-3.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${workerTab === "schedule" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            <CalendarDays size={14}/>Grafik
          </button>
          <button
            type="button"
            onClick={() => setWorkerTab("pay")}
            title="Twoja wypłata w piątek — tylko po logowaniu telefonem i kodem"
            className={`flex-1 min-h-[48px] py-3.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${workerTab === "pay" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            <Wallet size={14}/>Wypłata
          </button>
        </div>
      )}

      {!selectedJob && (
        <div className="mx-4 mt-3 shrink-0">
          <button
            type="button"
            onClick={() => setWorkerHelpOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border bg-secondary/30 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-1.5"><HelpCircle size={13} className="text-primary shrink-0"/>Co mogę tu zrobić?</span>
            {workerHelpOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
          {workerHelpOpen && (
            <div className="mt-1.5 px-3 py-2.5 rounded-xl border border-border bg-card text-[11px] text-muted-foreground leading-relaxed space-y-1.5">
              <p><strong className="text-foreground/90">Roboty</strong> — wybierz aktywną robotę, dodaj zdjęcia (galeria lub aparat), wyślij raport z wymiarami. Status zdjęć i powód odrzucenia widać przy każdym zdjęciu.</p>
              <p><strong className="text-foreground/90">Grafik</strong> — Twój tydzień Pn–So: godziny z listy płac i adresy z wpisów na robotach.</p>
              <p><strong className="text-foreground/90">Wypłata</strong> — kwota na piątek, skan paragonu (chemia, paliwo) trafia do kosztów do zwrotu po akceptacji admina.</p>
              <p><strong className="text-foreground/90">Offline</strong> — zdjęcia bez sieci trafiają do kolejki i wysyłają się po powrocie zasięgu.</p>
            </div>
          )}
        </div>
      )}

      <PwaInstallBanner compact/>

      {(queueCount > 0 || flushingQueue) && (
        <div className="mx-4 mb-2 flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2 text-xs">
          <CloudOff size={13} className="text-amber-400 shrink-0"/>
          <span className="text-amber-400 font-medium">
            {flushingQueue ? "Wysyłanie kolejki…" : `${queueCount} zdjęć w kolejce offline`}
          </span>
          {!flushingQueue && navigator.onLine && (
            <button type="button" onClick={() => flushQueue()} className="ml-auto text-primary hover:underline shrink-0">
              Wyślij teraz
            </button>
          )}
        </div>
      )}

      <div ref={workerScrollRef} className="flex-1 overflow-y-auto overscroll-contain" data-keyboard-aware style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <PullToRefreshIndicator pull={workerPull.pull} refreshing={workerPull.refreshing || payrollLoading || jobsLoading} ready={workerPull.ready}/>
        {selectedJob && (
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2.5">
            <button type="button" onClick={() => setSelectedJobId(null)} className="flex items-center gap-2 text-sm font-medium text-primary min-h-[44px] px-1 -ml-1">
              <ArrowLeft size={16}/>Roboty · Grafik · Wypłata
            </button>
          </div>
        )}
        {!selectedJob && workerTab === "schedule" ? (
          <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
            <div>
              <p className="text-lg font-bold mb-0.5">Twój grafik</p>
              <p className="text-xs text-muted-foreground">
                {weekFrom ? `Tydzień ${fmtDate(weekFrom)} – ${fmtDate(weekTo)}` : "Ładowanie…"}
              </p>
            </div>
            {payrollLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : !currentWeekEmp ? (
              <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-2xl px-4">
                <CalendarDays size={36} className="mx-auto opacity-20 mb-2"/>
                <p className="text-sm">Brak wpisu w tym tygodniu</p>
                <p className="text-xs mt-2">Administrator musi dodać Cię do listy płac — wtedy grafik pojawi się tutaj.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {scheduleColumns.map((col) => {
                  const cell = scheduleCellFor(currentWeekEmp, col.key, col.iso, jobs, []);
                  const isToday = col.iso === todayIsoDate();
                  return (
                    <div
                      key={col.key}
                      className={`rounded-2xl border px-4 py-3.5 ${isToday ? "border-primary/40 bg-primary/5" : "border-border bg-card"} ${cell.working ? "" : "opacity-50"}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>
                          {col.shortLabel} · {col.dateLabel}
                          {isToday && <span className="ml-1.5 text-[10px] font-bold text-primary">DZIŚ</span>}
                        </span>
                        {cell.hoursLabel && (
                          <span className="text-xs font-semibold text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {cell.hoursLabel}
                          </span>
                        )}
                      </div>
                      {cell.working ? (
                        <div className="space-y-1">
                          {cell.timeRange && (
                            <p className="text-xs text-green-400/90 font-medium">{cell.timeRange}</p>
                          )}
                          {cell.locations.length > 0 ? (
                            cell.locations.map((loc, i) => (
                              <p key={i} className="text-xs text-primary flex items-start gap-1">
                                <MapPin size={11} className="shrink-0 mt-0.5"/>
                                {loc}
                              </p>
                            ))
                          ) : cell.timeRange ? (
                            <p className="text-[11px] text-muted-foreground italic">Godziny z listy płac — bez przypisanej roboty</p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Wolne</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : !selectedJob && workerTab === "pay" ? (
          <div className="max-w-lg mx-auto px-4 pt-6 space-y-4 worker-pay-sensitive">
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2.5">
              <Lock size={14} className="text-amber-400 shrink-0 mt-0.5"/>
              <p className="text-[11px] text-amber-400/90 leading-relaxed">
                Kwoty wypłat są poufne. Zakaz zrzutów ekranu i udostępniania. Przy przełączeniu aplikacji dane są ukrywane.
              </p>
            </div>

            {payrollLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/25 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet size={16} className="text-primary"/>
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">Ten tydzień</span>
                  </div>
                  {currentPay && weekFrom ? (
                    <>
                      <p className="text-3xl font-bold text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmt(currentPay.netPay)} <span className="text-lg font-normal text-muted-foreground">PLN</span>
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Wypłata w piątek · <span className="font-medium text-foreground">{fmtDate(fridayPayDate)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tydzień {fmtDate(weekFrom)} – {fmtDate(weekTo)} · {fmtH(currentPay.totalHours)}
                        {currentPay.rateNum > 0 && ` · ${fmt(currentPay.rateNum)} PLN/h`}
                      </p>
                      {currentPay.totalZaliczka > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Zaliczki: −{fmt(currentPay.totalZaliczka)} PLN · brutto {fmt(currentPay.grossPay)} PLN
                        </p>
                      )}
                      {currentPay.totalExtraCosts > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Koszty do zwrotu (zaakceptowane): +{fmt(currentPay.totalExtraCosts)} PLN
                        </p>
                      )}
                      {pendingExtraCosts.length > 0 && (
                        <p className="text-xs text-yellow-400/90 mt-1">
                          Oczekuje na akceptację: {pendingExtraCosts.length} paragon(ów)
                        </p>
                      )}
                      {currentWeekEmp?.settled && (
                        <span className="inline-flex items-center gap-1 mt-3 text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/15 text-green-400">
                          <CheckCircle2 size={11}/> Rozliczone
                        </span>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Nie ma Cię jeszcze na liście płac w tym tygodniu. Administrator musi dodać Cię w panelu — wtedy kwota pojawi się tutaj automatycznie.
                    </p>
                  )}
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-border">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Receipt size={15} className="text-primary"/>
                      Paragon / faktura — koszt do zwrotu
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Chemia, paliwo, zakupy na budowę — zdjęcie paragonu trafia do admina. Kwota w wypłacie po akceptacji.
                    </p>
                  </div>
                  <div className="px-4 py-4 space-y-3">
                    {!currentWeekEmp ? (
                      <p className="text-xs text-muted-foreground">Najpierw admin musi dodać Cię do listy płac w tym tygodniu.</p>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={receiptDesc}
                          onChange={(e) => setReceiptDesc(e.target.value)}
                          placeholder="Opis (np. chemia, paliwo)"
                          className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={receiptAmount}
                            onChange={(e) => setReceiptAmount(e.target.value)}
                            placeholder="Kwota PLN"
                            className="flex-1 bg-secondary rounded-xl px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          />
                          <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold cursor-pointer shrink-0 ${receiptUploading ? "opacity-50 pointer-events-none" : "hover:bg-primary/90"}`}>
                            {receiptUploading ? (
                              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"/>
                            ) : (
                              <Camera size={16}/>
                            )}
                            Skan
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              capture="environment"
                              className="sr-only"
                              disabled={receiptUploading}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) submitReceipt(f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                        {receiptError && (
                          <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{receiptError}</p>
                        )}
                      </>
                    )}
                    {myExtraCosts.length > 0 && (
                      <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                        {[...approvedExtraCosts, ...pendingExtraCosts, ...rejectedExtraCosts].map((cost) => {
                          const st = extraCostStatus(cost);
                          return (
                            <div key={cost.id} className="px-3 py-2.5 flex items-start gap-2">
                              {cost.receiptUrl && (
                                <a href={cost.receiptUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-lg overflow-hidden bg-secondary shrink-0 border border-border flex items-center justify-center">
                                  {/\.pdf(\?|$)/i.test(cost.receiptUrl) ? (
                                    <Receipt size={18} className="text-primary"/>
                                  ) : (
                                    <img src={cost.receiptUrl} alt="" className="w-full h-full object-cover"/>
                                  )}
                                </a>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{cost.description || "—"}</p>
                                <p className="text-sm font-bold text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                  {fmt(parseFloat(cost.amount) || 0)} PLN
                                </p>
                                <span className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                  st === "approved" ? "bg-green-500/15 text-green-400"
                                  : st === "pending" ? "bg-yellow-500/15 text-yellow-400"
                                  : "bg-red-500/15 text-red-400"
                                }`}>
                                  {EXTRA_COST_STATUS_LABELS[st]}
                                </span>
                                {st === "rejected" && cost.rejectReason && (
                                  <p className="text-[10px] text-red-400/90 mt-1 italic">Powód: {cost.rejectReason}</p>
                                )}
                              </div>
                              {(st === "pending" || st === "rejected") && (
                                <button type="button" onClick={() => removeMyExtraCost(cost.id)}
                                  className="p-1.5 text-muted-foreground hover:text-destructive shrink-0">
                                  <Trash2 size={13}/>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowPayHistory((v) => !v)}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Archive size={14} className="text-muted-foreground"/>
                      <span className="text-sm font-semibold">Archiwum wypłat</span>
                      {payHistory.length > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{payHistory.length}</span>
                      )}
                    </div>
                    {showPayHistory ? <ChevronUp size={16} className="text-muted-foreground"/> : <ChevronDown size={16} className="text-muted-foreground"/>}
                  </button>
                  {showPayHistory && (
                    <div className="border-t border-border divide-y divide-border">
                      {payHistory.length === 0 ? (
                        <p className="px-4 py-6 text-xs text-muted-foreground text-center">Brak zapisanych tygodni w archiwum.</p>
                      ) : (
                        payHistory.map((row) => (
                          <div key={row.weekFrom} className="px-4 py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-medium">{fmtDate(row.weekFrom)} – {fmtDate(row.weekTo)}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Piątek {fmtDate(fridayIsoOfWeek(row.weekFrom))} · {fmtH(row.totalHours)}
                                {row.settled && " · rozliczone"}
                              </p>
                            </div>
                            <p className="text-sm font-bold text-primary shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              {fmt(row.netPay)} PLN
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : !selectedJob ? (
          <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
            {todayWork.working ? (
              <div className="bg-primary/10 border border-primary/25 rounded-2xl px-4 py-3.5 space-y-1.5">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={13}/> Gdzie dziś pracuję?
                </p>
                {todayWork.timeRange && (
                  <p className="text-sm font-medium text-green-400/90">{todayWork.timeRange}{todayWork.hoursLabel ? ` · ${todayWork.hoursLabel}` : ""}</p>
                )}
                {todayWork.locations.length > 0 ? (
                  todayWork.locations.map((loc, i) => (
                    <p key={i} className="text-sm font-semibold text-foreground">{loc}</p>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Masz wpis w grafiku — adres pojawi się po przypisaniu do roboty</p>
                )}
              </div>
            ) : currentWeekEmp && (
              <div className="bg-secondary/40 border border-border rounded-2xl px-4 py-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">Gdzie dziś pracuję?</span> — brak wpisu na dziś w grafiku i na robotach.
              </div>
            )}
            <div>
              <p className="text-lg font-bold mb-0.5">Wybierz robotę</p>
              <p className="text-xs text-muted-foreground">Zdjęcia, zakres prac i wymiary mieszkania</p>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input type="text" placeholder="Szukaj adresu lub klienta..." value={search} onChange={e=>setSearch(e.target.value)}
                className="w-full bg-secondary rounded-xl pl-9 pr-4 py-3 text-sm border border-transparent focus:border-primary focus:outline-none"/>
            </div>
            {jobsLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : activeJobs.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <MapPin size={40} className="mx-auto opacity-20 mb-3"/>
                <p className="text-sm">Brak aktywnych robót</p>
                <p className="text-xs mt-2 max-w-xs mx-auto">Administrator musi dodać robotę ze statusem „w trakcie” w panelu.</p>
              </div>
            ) : null}
            <div className="space-y-2">
              {activeJobs.map(job => {
                const pending = (job.photos||[]).filter(p=>p.status==="pending").length;
                return (
                  <button key={job.id} onClick={()=>{setSelectedJobId(job.id);setUploadedCount(0);setUploadError("");setEditingReport(null);}}
                    className="w-full bg-card border border-border rounded-2xl px-5 py-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{job.address||"Bez adresu"}{job.flatNumber&&<span className="text-muted-foreground"> m.{job.flatNumber}</span>}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{job.client||"—"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[10px] bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full font-medium">W trakcie</span>
                        {pending > 0 && <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">{pending} oczekuje</span>}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Rozpoczęto: {fmtDate(job.startDate)}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="max-w-lg mx-auto px-4 pt-4 space-y-5">
            <div className="bg-card border border-border rounded-2xl px-5 py-4">
              <p className="text-base font-bold">{selectedJob.address||"Bez adresu"}{selectedJob.flatNumber&&` m.${selectedJob.flatNumber}`}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedJob.client||"—"} · Rozpoczęto {fmtDate(selectedJob.startDate)}</p>
            </div>

            {uploading && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0"/>
                <p className="text-sm text-primary">
                  Wgrywanie… {uploadedCount}{uploadTotal > 0 ? ` / ${uploadTotal}` : ""} zdjęć
                </p>
              </div>
            )}
            {uploadError && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{uploadError}</p>}

            <div className="bg-card border border-primary/25 rounded-2xl p-4 space-y-4">
              <div>
                <p className="text-sm font-semibold flex items-center gap-2"><ImagePlus size={16} className="text-primary"/>Galeria — wiele zdjęć</p>
                <p className="text-xs text-muted-foreground mt-1">Zaznacz wiele zdjęć z telefonu naraz, podejrzyj i wyślij jednym kliknięciem.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {LABELS.map((lbl) => (
                  <button key={lbl.value} type="button" onClick={() => setGalleryLabel(lbl.value)}
                    className={`text-sm px-3 py-2.5 min-h-[44px] rounded-full border transition-colors touch-manipulation ${galleryLabel === lbl.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                    {lbl.title}
                  </button>
                ))}
              </div>
              <HiddenFileInput multiple onPick={onGalleryPick}>
                {(open) => (
                  <button
                    type="button"
                    onClick={open}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
                  >
                    <ImagePlus size={18}/>
                    Wybierz z galerii ({galleryPicks.length || "wiele"})
                  </button>
                )}
              </HiddenFileInput>
              {galleryPicks.length > 0 && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {galleryPicks.map((pick, i) => (
                      <div key={pick.preview} className="flex gap-2 items-start bg-secondary/40 rounded-xl p-2">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary border border-border shrink-0">
                          <img src={pick.preview} alt="" className="w-full h-full object-cover"/>
                        </div>
                        <input
                          type="text"
                          value={pick.caption}
                          onChange={(e) => setGalleryPicks((prev) => prev.map((p, j) => j === i ? { ...p, caption: e.target.value } : p))}
                          placeholder="Opis zdjęcia (opcjonalnie)"
                          className="flex-1 bg-background rounded-lg px-2.5 py-2 text-xs border border-border focus:border-primary focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={submitGallery} disabled={uploading}
                      className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                      Wyślij {galleryPicks.length} zdjęć
                    </button>
                    <button type="button" onClick={clearGallery} disabled={uploading}
                      className="px-4 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary">
                      Anuluj
                    </button>
                  </div>
                </div>
              )}
            </div>

            {myReports.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-3">Twoje raporty ({myReports.length})</p>
                <div className="space-y-2">
                  {[...myReports].reverse().map((r) => (
                    <div key={r.id} className={`bg-card border rounded-xl px-4 py-3 text-sm ${editingReport?.id === r.id ? "border-violet-500/50" : "border-border"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{fmtDate(r.submittedAt.slice(0, 10))}{r.updatedAt && " · edyt."}</p>
                          {reportHasWorkScope(r) && (
                            <p className="text-xs text-foreground/90 mt-1 line-clamp-3 whitespace-pre-wrap">{getReportWorkScopeText(r)}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button type="button" onClick={() => setEditingReport(normalizeWorkerReport(r))}
                            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10" title="Edytuj">
                            <Edit2 size={16}/>
                          </button>
                          <button type="button" onClick={() => deleteMyReport(r.id)}
                            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Usuń">
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-card border border-violet-500/25 rounded-2xl p-4">
              <p className="text-sm font-semibold flex items-center gap-2 mb-3">
                <ClipboardList size={16} className="text-violet-400"/>
                {editingReport ? "Edytuj raport" : "Raport z budowy"}
              </p>
              <JobReportForm
                key={`${selectedJob.id}-${editingReport?.id || "new"}`}
                jobId={selectedJob.id}
                authorName={workerName}
                editReport={editingReport}
                onCancelEdit={() => setEditingReport(null)}
                onSaved={handleReportSaved}
                submitLabel={editingReport ? "Zapisz zmiany" : "Wyślij raport do admina"}
                description={editingReport ? undefined : "Zakres prac, wymiary i opisy — admin zobaczy przy tej robocie."}
                disabled={uploading}
              />
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Szybki aparat (pojedynczo)</p>
              <input
                type="text"
                value={quickPhotoCaption}
                onChange={(e) => setQuickPhotoCaption(e.target.value)}
                placeholder="Opis do następnych zdjęć z aparatu (opcjonalnie)"
                className="w-full bg-secondary rounded-xl px-3 py-2.5 text-xs border border-transparent focus:border-primary focus:outline-none mb-2"
              />
              <div className="space-y-2">
                {LABELS.map(lbl => (
                  <label key={lbl.value} className={`flex items-center gap-4 px-4 py-3 rounded-xl border cursor-pointer transition-all hover:opacity-90 active:scale-[0.98] ${lbl.color}`}>
                    <lbl.icon size={18} className="shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{lbl.title}</p>
                    </div>
                    <input type="file" accept="image/*" multiple capture="environment" className="sr-only"
                      onChange={e=>{handleFiles(e.target.files, lbl.value); e.target.value = "";}}/>
                    <Camera size={16} className="shrink-0 opacity-60"/>
                  </label>
                ))}
              </div>
            </div>

            {myPhotos.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-3">Twoje wgrane zdjęcia ({myPhotos.length})</p>
                <div className="space-y-3">
                  {myPhotos.map(p=>(
                    <div key={p.id} className="flex gap-3 bg-card border border-border rounded-xl p-3">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-secondary shrink-0">
                        <img src={p.publicUrl} alt={p.label} className="w-full h-full object-cover"/>
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            {p.label==="before"?"Przed":p.label==="after"?"Po":"W trakcie"} · {fmtDate(p.uploadedAt.slice(0,10))}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            p.status==="approved"?"bg-green-500/15 text-green-400"
                            :p.status==="rejected"?"bg-red-500/15 text-red-400"
                            :"bg-yellow-500/15 text-yellow-400"
                          }`}>
                            {PHOTO_STATUS_LABELS[p.status]}
                          </span>
                        </div>
                        {p.status==="rejected" && p.rejectReason && (
                          <p className="text-[10px] text-red-400/90 italic leading-snug">Powód odrzucenia: {p.rejectReason}</p>
                        )}
                        <input
                          type="text"
                          defaultValue={p.caption || ""}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (v !== (p.caption || "")) updateMyPhoto(p.id, { caption: v });
                          }}
                          placeholder="Opis zdjęcia (opcjonalnie)"
                          className="w-full bg-secondary rounded-lg px-2.5 py-1.5 text-xs border border-transparent focus:border-primary focus:outline-none"
                        />
                        <button type="button" onClick={() => deleteMyPhoto(p.id)}
                          className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1.5 min-h-[44px] px-1 -ml-1">
                          <Trash2 size={14}/>Usuń zdjęcie
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {privacyShield && (
        <div className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center px-6" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
          <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-12 w-auto object-contain opacity-40"/>
          <p className="text-sm text-muted-foreground mt-4 text-center">W&G DOM</p>
          <p className="text-xs text-muted-foreground/60 mt-2 text-center">Dane wypłat ukryte</p>
        </div>
      )}
    </div>
  );
}

// ─── App with auth ─────────────────────────────────────────────────────────────

function AppInnerWithAuth() {
  const shareToken = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("podglad")?.trim() || "";
  }, []);

  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => {
    const mode = sessionStorage.getItem("wg-session-mode");
    if (mode !== "admin") return null;
    const s = loadAdminSessionFromStorage();
    return s && s.role !== "inspector" ? s : null;
  });

  const [inspectorSession, setInspectorSession] = useState<AdminSession | null>(() => {
    const mode = sessionStorage.getItem("wg-session-mode");
    if (mode !== "inspector") return null;
    const s = loadAdminSessionFromStorage();
    return s?.role === "inspector" ? s : null;
  });

  const [appMode, setAppMode] = useState<"login"|"admin"|"worker"|"inspector">(() => {
    const s = sessionStorage.getItem("wg-session-mode");
    const stored = loadAdminSessionFromStorage();
    if (s === "admin" && stored && stored.role !== "inspector") return "admin";
    if (s === "inspector" && stored?.role === "inspector") return "inspector";
    if (s === "worker") return "worker";
    return "login";
  });
  const [workerName, setWorkerName] = useState(() => sessionStorage.getItem("wg-worker-name") || "");
  const [workerId, setWorkerId] = useState(() => sessionStorage.getItem("wg-worker-id") || "");

  const adminAccess = useMemo(
    () => ({
      session: adminSession,
      canViewRates: adminSession ? adminCanViewRates(adminSession.role) : true,
    }),
    [adminSession],
  );

  const enterAdmin = (session: AdminSession) => {
    if (session.role === "inspector") return;
    saveAdminSessionToStorage(session);
    setAdminSession(session);
    setInspectorSession(null);
    sessionStorage.setItem("wg-session-mode", "admin");
    setAppMode("admin");
  };
  const enterInspector = (session: AdminSession) => {
    if (session.role !== "inspector") return;
    saveAdminSessionToStorage(session);
    setInspectorSession(session);
    setAdminSession(null);
    sessionStorage.setItem("wg-session-mode", "inspector");
    sessionStorage.removeItem("wg-inspector-visit-recorded");
    setAppMode("inspector");
    recordInspectorEvent(session.id, session.displayName, "login").catch(() => {});
  };
  const enterWorker = (emp: DirectoryEmployee) => {
    sessionStorage.setItem("wg-session-mode","worker");
    sessionStorage.setItem("wg-worker-name", emp.name);
    sessionStorage.setItem("wg-worker-id", emp.id);
    setWorkerName(emp.name);
    setWorkerId(emp.id);
    setAppMode("worker");
  };
  const logout = () => {
    sessionStorage.removeItem("wg-session-mode");
    sessionStorage.removeItem("wg-worker-name");
    sessionStorage.removeItem("wg-worker-id");
    sessionStorage.removeItem("wg-inspector-visit-recorded");
    saveAdminSessionToStorage(null);
    setAdminSession(null);
    setInspectorSession(null);
    setAppMode("login"); setWorkerName(""); setWorkerId("");
  };

  if (shareToken) return <ClientShareView token={shareToken}/>;
  if (appMode === "login") return <LoginScreen onAdmin={enterAdmin} onInspector={enterInspector} onWorker={enterWorker}/>;
  if (appMode === "worker") return <WorkerPhotoView workerName={workerName} workerId={workerId} onLogout={logout}/>;
  if (appMode === "inspector" && inspectorSession) {
    return (
      <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center bg-background"><p className="text-sm text-muted-foreground">Ładowanie panelu inspektora…</p></div>}>
        <InspectorPanel inspectorId={inspectorSession.id} displayName={inspectorSession.displayName} onLogout={logout}/>
      </Suspense>
    );
  }
  if (!adminSession) return <LoginScreen onAdmin={enterAdmin} onInspector={enterInspector} onWorker={enterWorker}/>;
  return (
    <AdminAccessContext.Provider value={adminAccess}>
      <AppInner onLogout={logout}/>
    </AdminAccessContext.Provider>
  );
}

export default function App() {
  return <CloudLoader><AppInnerWithAuth/></CloudLoader>;
}
