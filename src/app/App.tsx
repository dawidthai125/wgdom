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
import { DashboardView } from "@/app/DashboardView";
import { AdminSettingsModal } from "@/app/AdminSettingsModal";
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
  Edit2, Check, Search, Building2, MapPin, KeyRound,
  LayoutDashboard, Package, Receipt, AlertTriangle,
  HardHat, StickyNote, Cloud, CloudUpload, CloudOff,
  Mic, MicOff, Bell, Copy, ScrollText, Sparkles,
  BookOpen, ChevronDown as ChevDown, HelpCircle, Smartphone, Monitor,
  Camera, ImagePlus, Lock, LogOut, Eye, ArrowLeft, ThumbsUp, ThumbsDown, Clock3,
  ClipboardList, Ruler, Mail, Send, BarChart3, Scale, Images, Menu, MessageSquare, LayoutGrid, FolderOpen, PanelLeft,
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
  adminCanViewRates,
  adminIsSuperAdmin,
  adminCanViewTendersTab,
  loadAdminPasswordOverrides,
  mergeAdminPasswordOverrides,
  loadAdminUsersConfig,
  mergeAdminUsersConfig,
} from "@/lib/admin-auth";
import type { DayKey, DirectoryEmployee, DayData, EmployeeExtraCost, WeekEmployee, WeekSnapshot, DocType, PhotoEntry, RoomTypeKey, RoomDimension, WorkerJobReport, Job, PayrollJobConsistencyAlert, JobGalleryBucket } from "@/app/app-domain";
import { DAYS, MULTI_SITE_SCHEDULE_LABEL, MONTH_NAMES, DOCUMENT_TYPES, REQUIRED_DOCS, DOC_LABELS, ROOM_TYPE_LABELS, defaultDirEmployee, isTestDirectoryEmployee, isProductionDirectoryEmployee, filterProductionDirectory, filterProductionActiveDirectory, filterProductionWeekEmployees, normalizeDirectoryTestFlags, PHOTO_LABEL_NAMES, PHOTO_LABEL_ORDER, PHOTO_LABEL_SECTION, weekEmployeeFromDir, hoursWorked, dayTotalHours, payrollJobConsistencyAlerts, buildEmployeeArchiveStats, consistencyAlertMessage, fmt, fmtH, fmtDate, getWeekRange, calcWeekEmployee, extraCostStatus, PHOTO_STATUS_LABELS, EXTRA_COST_STATUS_LABELS, workerTodayWorkInfo, fixJobsForConsistencyAlert, defaultJob, normalizeJobsList, jobDaysSinceStart, jobWorkerReports, reportNeedsAdminAttention, normalizeWorkerReport, workItemHasContent, roomHasContent, roomDisplayName, defaultRoom, jobCost, jobMaterialsCost, jobTotalCost, GALLERY_ARCHIVE_DAYS, jobDisplayTitle, jobApprovedPhotos, jobHandoverIso, jobGalleryBucket, galleryDaysUntilArchive, todayDayKey, localIsoDate, todayIsoDate, fridayIsoOfWeek, findWeekEmployeeForWorker, workerPayoutHistory, todayFieldWorkStats, jobsForEmployeeOnDashboard, weekDayColumns, scheduleCellFor, buildWeekSnapshot, scheduleCellFromArchive, formatJobStreet, applyWriteTimestamps } from "@/app/app-domain";
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
import { syncAppSettingsFromCloud, loadAppSettingsLocal, mergeAppSettings, type AppSettings } from "@/lib/app-settings";
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
import { AppInnerWithAuth } from "@/app/AppInnerWithAuth";
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

export { LoginScreen } from "@/app/LoginScreen";
export { AppInner, WorkerPhotoView };

export default function App() {
  return <CloudLoader><AppInnerWithAuth/></CloudLoader>;
}
