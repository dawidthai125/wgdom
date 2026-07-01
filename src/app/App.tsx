import { useState, useCallback, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { AdminSidebar } from "@/app/admin/AdminSidebar";
import { AdminTopbar } from "@/app/admin/AdminTopbar";
import { GlobalSearchPanel } from "@/app/admin/GlobalSearchPanel";
import { AdminViewRouter } from "@/app/admin/AdminViewRouter";
import { AdminMobileNav } from "@/app/admin/AdminMobileNav";
import { buildAdminNavItems, splitMobileNav, isNavItemActive, type View } from "@/app/admin/admin-nav";
import { ContactsView } from "@/app/ContactsView";
import { DirectoryView } from "@/app/DirectoryView";
import { ArchiveView } from "@/app/ArchiveView";
import { DashboardView } from "@/app/DashboardView";
import { AdminSettingsModal } from "@/app/AdminSettingsModal";
import { ScheduleView } from "@/app/ScheduleView";
import { EmployeeSmsModal } from "@/app/EmployeeSmsModal";
import { SmsModalErrorBoundary } from "@/app/SmsModalErrorBoundary";
import { AlertTriangle } from "lucide-react";
import { triggerWeeklyBackupEmail } from "@/lib/weekly-backup-email";
import {
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
  pushKeysToCloudSafe,
  pullAndMergeDataBundle,
  pushMergedDataBundleToCloud,
  fetchPayrollBackupStatus,
  restoreCloudPayrollBackup,
  fetchFullDataBackupStatus,
  restoreAllCloudDataBackup,
  addDeletedJobId,
  pushJobsAfterDelete,
  getDeletedJobIds,
  getDeletedDirectoryIds,
  getDeletedContactsIds,
  getDeletedArchiveIds,
  getDeletedEmployeeLeaveIds,
  addDeletedEmployeeLeaveId,
  getDeletedRecoverableChargeIds,
  addDeletedRecoverableChargeId,
  addDeletedArchiveId,
  pushDirectoryToCloud,
  pushWeekEmployeesToCloud,
  pushPayrollWeekAfterRollover,
  pushEmployeeLeavesToCloud,
  pushRecoverableChargesToCloud,
  pushOperationalNotesToCloud,
  pullOperationalNotesAuxFromCloud,
  pullSecurityAuditLogFromCloud,
  pullWmDrukAuditLogFromCloud,
  getDeletedOperationalNoteIds,
  addDeletedOperationalNoteId,
  mergeDeletedOperationalNoteIds,
  normalizeDeletedOperationalNoteIds,
  OPERATIONAL_NOTES_BACKUP_AUX_KEYS,
  WGDOM_DEFERRED_BOOTSTRAP_EVENT,
  ADMIN_PASSWORDS_KEY,
  ADMIN_USERS_CONFIG_KEY,
  isSupabaseConfigured,
  isPayrollGuardBlockedError,
} from "@/lib/cloud-sync";
import { mergeOperationalNotesAuditLog } from "@/lib/operational-notes-audit";
import {
  SECURITY_AUDIT_LOG_KEY,
  normalizeSecurityAuditLog,
  recordSecurityAudit,
  type RecordSecurityAuditInput,
  type SecurityAuditEntry,
} from "@/lib/security-audit-log";
import {
  WM_DRUK_AUDIT_LOG_KEY,
  normalizeWmDrukAuditLog,
  recordWmDrukAudit,
  type RecordWmDrukAuditInput,
  type WmDrukAuditEntry,
} from "@/lib/wm-druk-audit";
import { mergeOperationalNotesReadState } from "@/lib/operational-notes-read-state";
import { saveLocalDataSnapshot, restoreLocalDataSnapshot, listLocalDataSnapshots, readLocalDataBundle } from "@/lib/local-data-backup";
import { saveLocalJobsSnapshot, restoreLocalJobsSnapshot, listLocalJobsSnapshots } from "@/lib/jobs-safety";
import { adminCanViewTendersTab, adminCanViewWorkCatalog, adminCanViewInstructions, adminCanViewChanges } from "@/lib/admin-auth";
import { canAccessAuditHub } from "@/lib/audit-hub/acl";
import { resolveAuditHubNavigation } from "@/lib/audit-hub/deeplink";
import type { AuditFeedDeepLink } from "@/lib/audit-hub/types";
import type { DirectoryEmployee, WeekEmployee, WeekSnapshot, Job, DayKey, DayData } from "@/app/app-domain";
import type { PayrollCarryForward } from "@/lib/payroll-carry-forward";
import {
  isProductionDirectoryEmployee,
  filterProductionDirectory,
  filterProductionActiveDirectory,
  filterProductionWeekEmployees,
  normalizeDirectoryTestFlags,
  weekEmployeeFromDir,
  filterDirectoryForPayrollWeekAdd,
  fmtDate,
  getWeekRange,
  normalizeJobsList,
  localIsoDate,
  todayIsoDate,
  todayFieldWorkStats,
  buildWeekSnapshot,
} from "@/app/app-domain";
import { useAdminAccess } from "@/app/admin-access";
import { syncAlertsSeenFromCloud } from "@/lib/inspector-stats";
import { syncAppSettingsFromCloud, loadAppSettingsLocal, type AppSettings } from "@/lib/app-settings";
import {
  mergeTenderDataKey,
  TENDERS_PIPELINE_KEY,
  TENDERS_COMPANY_PROFILE_KEY,
  TENDERS_CUSTOM_KEYWORDS_KEY,
} from "@/lib/tenders-sync";
import { saveAs } from "file-saver";
import { consumePendingDeepLink, type DeepLinkRoute } from "@/lib/deep-link";
import { initialAutoSyncSuppressUntil } from "@/lib/cloud-bootstrap";
import { cloudSyncMutationGuard, withKwWeekEmployeesAsyncMutation } from "@/lib/cloud-sync-mutation-guard";
import { openTendersAtStrategyTab, openTendersAtWorkCatalogTab } from "@/lib/tenders-module-nav";
import { onNativeAppResume, registerNativeBackHandler } from "@/lib/native-app-bridge";
import { useModalScrollLock } from "@/lib/modal-scroll-lock";
import { Toaster, toast } from "sonner";
import { AppInnerWithAuth } from "@/app/AppInnerWithAuth";
import { CloudLoader } from "@/app/CloudLoader";
import { useLocalStorage, setSkipApplyWriteTimestamps } from "@/app/hooks/useLocalStorage";
import type { EmailContact } from "@/lib/email-contacts";
import type { EmployeeLeave } from "@/lib/employee-leaves";
import { mergeEmployeeLeaves } from "@/lib/employee-leaves";
import type { RecoverableCharge } from "@/lib/recoverable-charges";
import { mergeRecoverableCharges } from "@/lib/recoverable-charges";
import { mergeOperationalNotes, jobLabelForOperationalNote, type OperationalNote } from "@/lib/operational-notes";
import type { OperationalNoteAuditEntry } from "@/lib/operational-notes-audit";
import type { OperationalNoteReadReceipt } from "@/lib/operational-notes-read-state";
import { countUnreadOperationalNotes } from "@/lib/operational-notes-read-state";
import { OperationalNotesUnreadBanner } from "@/app/OperationalNotesUnreadBanner";
import { computePayrollCashSplitWithCarry } from "@/lib/payroll-carry-forward";
import { getPayrollWeekRange, getPayrollClosingWeekRange, isPayrollWeekClosedForUi } from "@/lib/payroll-cycle";
import { hasPayrollRolloverBlockers } from "@/lib/payroll-rollover";
import { normalizeWmPrintJobDocuments } from "@/lib/wm-print/job-documents";
import { DEFAULT_WM_PRINT_SETTINGS, normalizeWmPrintSettings } from "@/lib/wm-print/settings";
import type { WmPrintHistoryEntry } from "@/lib/wm-print/history";
import { normalizeWmPrintHistory, WM_PRINT_HISTORY_KEY } from "@/lib/wm-print/history";
import type { WmPrintJobDocument, WmPrintSettings, WmPrintTemplate } from "@/lib/wm-print/types";
import {
  addDeletedWmPrintJobDocId,
  addDeletedWmPrintTemplateId,
  getDeletedWmPrintJobDocIds,
  getDeletedWmPrintTemplateIds,
  maybeExecuteWmPrintSeed,
  pushWmPrintToCloud,
} from "@/lib/wm-print/wm-print-sync";
import type { ElectricalMeasurement, ElectricalMeasurementRegistryState, ElectricalMeasurementSettings } from "@/lib/electrical-measurements/types";
import {
  ELECTRICAL_MEASUREMENT_REGISTRY_KEY,
  ELECTRICAL_MEASUREMENT_SETTINGS_KEY,
  ELECTRICAL_MEASUREMENTS_KEY,
} from "@/lib/electrical-measurements/types";
import {
  pushElectricalMeasurementsBundleToCloud,
  pushElectricalMeasurementSettingsToCloud,
} from "@/lib/electrical-measurements/sync";
import {
  createEmptyRegistryState,
  ensureRegistryWithMigration,
  normalizeElectricalMeasurementRegistryState,
  registryNeedsMigrationFromMeasurements,
} from "@/lib/electrical-measurements/registry";
import { applyRapRegistryBaselineRepairP16C } from "@/lib/electrical-measurements/registry-baseline-repair";
import { DEFAULT_ELECTRICAL_MEASUREMENT_SETTINGS } from "@/lib/electrical-measurements/settings";
import type { SingleLineDiagram } from "@/lib/electrical-schematics/types";
import { ELECTRICAL_SCHEMATICS_KEY } from "@/lib/electrical-schematics/types";
import { pushElectricalSchematicsToCloud } from "@/lib/electrical-schematics/sync";
import type { DeliveryPackagePublication } from "@/lib/delivery-package-publications/types";
import { DELIVERY_PACKAGE_PUBLICATIONS_KEY } from "@/lib/delivery-package-publications/types";
import { pushDeliveryPackagePublicationsToCloud } from "@/lib/delivery-package-publications/publication";
import { useLocation, useNavigate } from "react-router";
import { TENDERS_V4_ROUTING } from "@/lib/tenders-v4-config";
import {
  buildTenderDetailPath,
  isTenderV4Path,
  TENDERS_LIST_PATH,
} from "@/lib/tender-detail-routes-v4";

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
  const [employeeLeaves, setEmployeeLeaves] = useLocalStorage<EmployeeLeave[]>("kw-employee-leaves", []);
  const [recoverableCharges, setRecoverableCharges] = useLocalStorage<RecoverableCharge[]>("kw-recoverable-charges", []);
  const [operationalNotes, setOperationalNotes] = useLocalStorage<OperationalNote[]>("kw-operational-notes", []);
  const [operationalNotesReadState, setOperationalNotesReadState] = useLocalStorage<OperationalNoteReadReceipt[]>(
    "kw-operational-notes-read-state",
    [],
  );
  const [operationalNotesAuditLog, setOperationalNotesAuditLog] = useLocalStorage<OperationalNoteAuditEntry[]>(
    "kw-operational-notes-audit-log",
    [],
  );
  const [securityAuditLog, setSecurityAuditLog] = useLocalStorage<SecurityAuditEntry[]>(
    SECURITY_AUDIT_LOG_KEY,
    [],
  );
  const [wmDrukAuditLog, setWmDrukAuditLog] = useLocalStorage<WmDrukAuditEntry[]>(
    WM_DRUK_AUDIT_LOG_KEY,
    [],
  );
  const [wmPrintTemplates, setWmPrintTemplates] = useLocalStorage<WmPrintTemplate[]>("kw-wm-print-templates", []);
  const [wmPrintJobDocs, setWmPrintJobDocs] = useLocalStorage<WmPrintJobDocument[]>("kw-wm-print-job-docs", []);
  const [wmPrintSettings, setWmPrintSettings] = useLocalStorage<WmPrintSettings>(
    "kw-wm-print-settings",
    DEFAULT_WM_PRINT_SETTINGS,
  );
  const [wmPrintHistory, setWmPrintHistory] = useLocalStorage<WmPrintHistoryEntry[]>(WM_PRINT_HISTORY_KEY, []);
  const [deliveryPackagePublications, setDeliveryPackagePublications] = useLocalStorage<DeliveryPackagePublication[]>(
    DELIVERY_PACKAGE_PUBLICATIONS_KEY,
    [],
  );
  const [electricalMeasurements, setElectricalMeasurements] = useLocalStorage<ElectricalMeasurement[]>(
    ELECTRICAL_MEASUREMENTS_KEY,
    [],
  );
  const [electricalMeasurementRegistry, setElectricalMeasurementRegistry] = useLocalStorage<
    ElectricalMeasurementRegistryState
  >(ELECTRICAL_MEASUREMENT_REGISTRY_KEY, createEmptyRegistryState());
  const [electricalMeasurementSettings, setElectricalMeasurementSettings] =
    useLocalStorage<ElectricalMeasurementSettings>(
      ELECTRICAL_MEASUREMENT_SETTINGS_KEY,
      DEFAULT_ELECTRICAL_MEASUREMENT_SETTINGS,
    );
  const [electricalSchematics, setElectricalSchematics] = useLocalStorage<SingleLineDiagram[]>(
    ELECTRICAL_SCHEMATICS_KEY,
    [],
  );
  const [view, setView] = useState<View>("dashboard");
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [pendingJobSection, setPendingJobSection] = useState<import("@/app/JobDetailSectionNav").JobDetailSection | null>(null);
  const [pendingTenderId, setPendingTenderId] = useState<string | null>(null);
  const [alertsSeenTick, setAlertsSeenTick] = useState(0);
  const [pendingPayrollEmpId, setPendingPayrollEmpId] = useState<string | null>(null);
  const [pendingRecoverableChargeId, setPendingRecoverableChargeId] = useState<string | null>(null);
  const [pendingRecoverableChargeCreatePreset, setPendingRecoverableChargeCreatePreset] =
    useState<Partial<RecoverableCharge> | null>(null);
  const [pendingOperationalNoteId, setPendingOperationalNoteId] = useState<string | null>(null);
  const [pendingOperationalNotesAuditOpen, setPendingOperationalNotesAuditOpen] = useState(false);
  const [pendingOperationalNoteCreatePreset, setPendingOperationalNoteCreatePreset] = useState<{
    linkedJobId?: string;
    linkedJobNameSnapshot?: string;
    title?: string;
  } | null>(null);
  const [pendingWmPrintNav, setPendingWmPrintNav] = useState<
    import("@/lib/wm-print/wm-print-tabs").WmPrintPendingNavigation | null
  >(null);
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
  const syncInFlightRef = useRef(false);
  const pendingCloudSyncRef = useRef(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  useModalScrollLock(showSaveConfirm);
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

  const commitEmployeeLeaves = useCallback((next?: EmployeeLeave[], deletedId?: string) => {
    const payload = next ?? employeeLeaves;
    let deletedIds = getDeletedEmployeeLeaveIds();
    if (deletedId) deletedIds = addDeletedEmployeeLeaveId(deletedId);
    suppressAutoSyncUntilRef.current = Date.now() + 4500;
    pushEmployeeLeavesToCloud(payload, deletedIds).catch(() => {});
  }, [employeeLeaves]);

  const commitRecoverableCharges = useCallback((next?: RecoverableCharge[], deletedId?: string) => {
    const payload = next ?? recoverableCharges;
    let deletedIds = getDeletedRecoverableChargeIds();
    if (deletedId) deletedIds = addDeletedRecoverableChargeId(deletedId);
    suppressAutoSyncUntilRef.current = Date.now() + 4500;
    pushRecoverableChargesToCloud(payload, deletedIds).catch(() => {});
  }, [recoverableCharges]);

  const commitOperationalNotes = useCallback((
    nextNotes?: OperationalNote[],
    nextAudit?: OperationalNoteAuditEntry[],
    deletedId?: string,
    nextReadState?: OperationalNoteReadReceipt[],
  ) => {
    const notesPayload = nextNotes ?? operationalNotes;
    const auditPayload = nextAudit ?? operationalNotesAuditLog;
    const readStatePayload = nextReadState ?? operationalNotesReadState;
    if (nextReadState) setOperationalNotesReadState(nextReadState);
    let deletedIds = getDeletedOperationalNoteIds();
    if (deletedId) deletedIds = addDeletedOperationalNoteId(deletedId);
    suppressAutoSyncUntilRef.current = Date.now() + 4500;
    pushOperationalNotesToCloud(notesPayload, deletedIds, readStatePayload, auditPayload).catch(() => {});
  }, [operationalNotes, operationalNotesAuditLog, operationalNotesReadState, setOperationalNotesReadState]);

  const commitWmPrint = useCallback((
    nextTemplates?: WmPrintTemplate[],
    nextJobDocs?: WmPrintJobDocument[],
    nextSettings?: WmPrintSettings,
    deletedTemplateId?: string,
    deletedJobDocId?: string,
    nextHistory?: WmPrintHistoryEntry[],
  ) => {
    const tpl = nextTemplates ?? wmPrintTemplates;
    const docs = nextJobDocs ?? wmPrintJobDocs;
    const sett = nextSettings ?? wmPrintSettings;
    const hist = normalizeWmPrintHistory(nextHistory ?? wmPrintHistory);
    let delTpl = getDeletedWmPrintTemplateIds();
    let delDoc = getDeletedWmPrintJobDocIds();
    if (deletedTemplateId) delTpl = addDeletedWmPrintTemplateId(deletedTemplateId);
    if (deletedJobDocId) delDoc = addDeletedWmPrintJobDocId(deletedJobDocId);
    suppressAutoSyncUntilRef.current = Date.now() + 4500;
    pushWmPrintToCloud(tpl, docs, sett, delTpl, delDoc, hist).catch(() => {});
  }, [wmPrintTemplates, wmPrintJobDocs, wmPrintSettings, wmPrintHistory]);

  const commitDeliveryPackagePublications = useCallback((next?: DeliveryPackagePublication[]) => {
    const payload = next ?? deliveryPackagePublications;
    suppressAutoSyncUntilRef.current = Date.now() + 4500;
    pushDeliveryPackagePublicationsToCloud(payload)
      .then((merged) => setDeliveryPackagePublications(merged))
      .catch(() => {});
  }, [deliveryPackagePublications, setDeliveryPackagePublications]);

  const commitElectricalMeasurementSettings = useCallback(
    (next?: ElectricalMeasurementSettings) => {
      const payload = next ?? electricalMeasurementSettings;
      suppressAutoSyncUntilRef.current = Date.now() + 4500;
      setElectricalMeasurementSettings(payload);
      pushElectricalMeasurementSettingsToCloud(payload).catch(() => {});
    },
    [electricalMeasurementSettings, setElectricalMeasurementSettings],
  );

  const commitElectricalMeasurements = useCallback(
    (nextMeasurements?: ElectricalMeasurement[], nextRegistry?: ElectricalMeasurementRegistryState) => {
      const payload = nextMeasurements ?? electricalMeasurements;
      const registryPayload = ensureRegistryWithMigration(
        normalizeElectricalMeasurementRegistryState(nextRegistry ?? electricalMeasurementRegistry),
        payload,
      );
      if (nextRegistry !== undefined || registryNeedsMigrationFromMeasurements(electricalMeasurementRegistry, payload)) {
        setElectricalMeasurementRegistry(registryPayload);
      }
      suppressAutoSyncUntilRef.current = Date.now() + 4500;
      pushElectricalMeasurementsBundleToCloud(payload, registryPayload).catch(() => {});
    },
    [electricalMeasurements, electricalMeasurementRegistry, setElectricalMeasurementRegistry],
  );

  const commitElectricalSchematics = useCallback(
    (next?: SingleLineDiagram[]) => {
      const payload = next ?? electricalSchematics;
      if (next !== undefined) {
        setElectricalSchematics(payload);
      }
      suppressAutoSyncUntilRef.current = Date.now() + 4500;
      pushElectricalSchematicsToCloud(payload).catch(() => {});
    },
    [electricalSchematics, setElectricalSchematics],
  );

  useEffect(() => {
    if (Array.isArray(electricalMeasurementRegistry)) {
      const normalized = normalizeElectricalMeasurementRegistryState(electricalMeasurementRegistry);
      setElectricalMeasurementRegistry(ensureRegistryWithMigration(normalized, electricalMeasurements));
      return;
    }
    if (!registryNeedsMigrationFromMeasurements(electricalMeasurementRegistry, electricalMeasurements)) return;
    setElectricalMeasurementRegistry(
      ensureRegistryWithMigration(electricalMeasurementRegistry, electricalMeasurements),
    );
  }, [electricalMeasurements, electricalMeasurementRegistry, setElectricalMeasurementRegistry]);

  const rapBaselineRepairDoneRef = useRef(false);
  useEffect(() => {
    if (rapBaselineRepairDoneRef.current) return;
    if (jobs.length === 0) return;
    rapBaselineRepairDoneRef.current = true;
    const normalizedRegistry = normalizeElectricalMeasurementRegistryState(electricalMeasurementRegistry);
    const normalizedMeasurements = electricalMeasurements;
    const repaired = applyRapRegistryBaselineRepairP16C(normalizedRegistry, normalizedMeasurements, jobs);
    if (!repaired.changed) return;
    const registryPayload = ensureRegistryWithMigration(repaired.state, repaired.measurements);
    setElectricalMeasurements(repaired.measurements);
    setElectricalMeasurementRegistry(registryPayload);
    suppressAutoSyncUntilRef.current = Date.now() + 4500;
    pushElectricalMeasurementsBundleToCloud(repaired.measurements, registryPayload).catch(() => {});
  }, [jobs, electricalMeasurements, electricalMeasurementRegistry, setElectricalMeasurements, setElectricalMeasurementRegistry]);

  const onInitialWmPrintNavigationConsumed = useCallback(() => setPendingWmPrintNav(null), []);

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
    () => [directory, weekEmployees, savedWeeks, weekFrom, weekTo, jobs, contacts, employeeLeaves, recoverableCharges, operationalNotes] as unknown[],
    [directory, weekEmployees, savedWeeks, weekFrom, weekTo, jobs, contacts, employeeLeaves, recoverableCharges, operationalNotes],
  );

  const applyAdminDataBundle = useCallback((merged: unknown[]) => {
    const opNotesIdx = DATA_KEYS.indexOf("kw-operational-notes");
    const [dir, emps, arch, wf, wt, jbs, cont, leaves, charges] = merged;
    suppressAutoSyncUntilRef.current = Date.now() + 4500;
    remoteMergeInFlightRef.current = true;
    setSkipApplyWriteTimestamps(true);
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
      if (Array.isArray(leaves)) {
        const tombstones = new Set(getDeletedEmployeeLeaveIds());
        const filtered = tombstones.size
          ? (leaves as EmployeeLeave[]).filter((l) => !tombstones.has(l.id))
          : (leaves as EmployeeLeave[]);
        setEmployeeLeaves(filtered);
      }
      if (Array.isArray(charges)) {
        const tombstones = new Set(getDeletedRecoverableChargeIds());
        const filtered = tombstones.size
          ? (charges as RecoverableCharge[]).filter((c) => !tombstones.has(c.id))
          : (charges as RecoverableCharge[]);
        setRecoverableCharges(filtered);
      }
      if (opNotesIdx >= 0 && Array.isArray(merged[opNotesIdx])) {
        const tombstones = new Set(getDeletedOperationalNoteIds());
        const raw = merged[opNotesIdx] as OperationalNote[];
        const filtered = tombstones.size ? raw.filter((n) => !tombstones.has(n.id)) : raw;
        setOperationalNotes(filtered);
      }
    } finally {
      setSkipApplyWriteTimestamps(false);
    }
  }, [setDirectory, setWeekEmployees, setSavedWeeks, setWeekFrom, setWeekTo, setJobs, setContacts, setEmployeeLeaves, setRecoverableCharges, setOperationalNotes]);

  const logSecurityAudit = useCallback((input: RecordSecurityAuditInput) => {
    void recordSecurityAudit({
      ...input,
      actor: input.actor ?? adminSession?.displayName ?? "Administrator",
      actorUserId: input.actorUserId ?? adminSession?.id,
    })
      .then(() => {
        try {
          const raw = localStorage.getItem(SECURITY_AUDIT_LOG_KEY);
          if (raw) setSecurityAuditLog(normalizeSecurityAuditLog(JSON.parse(raw)));
        } catch { /* ignore */ }
      })
      .catch(() => {});
  }, [adminSession, setSecurityAuditLog]);

  const onRecordWmDrukAudit = useCallback((input: RecordWmDrukAuditInput) => {
    void recordWmDrukAudit({
      ...input,
      actor: input.actor ?? adminSession?.displayName ?? "Administrator",
      actorUserId: input.actorUserId ?? adminSession?.id,
    })
      .then(() => {
        try {
          const raw = localStorage.getItem(WM_DRUK_AUDIT_LOG_KEY);
          if (raw) setWmDrukAuditLog(normalizeWmDrukAuditLog(JSON.parse(raw)));
        } catch { /* ignore */ }
      })
      .catch(() => {});
  }, [adminSession, setWmDrukAuditLog]);

  const auditRestoreBackup = useCallback((
    phase: "started" | "completed" | "failed",
    opts: {
      scope: "jobs" | "payroll" | "all";
      source: "cloud" | "local";
      backupSlot?: string;
      count?: number;
      message?: string;
    },
  ) => {
    const scopePl = { jobs: "roboty", payroll: "lista płac", all: "wszystkie dane" };
    const sourcePl = { cloud: "chmura", local: "lokalnie" };
    const action = phase === "started"
      ? "restore_backup_started"
      : phase === "completed"
        ? "restore_backup_completed"
        : "restore_backup_failed";
    const severity = phase === "started" ? "info" : "high";
    const verb = phase === "started"
      ? "Rozpoczęto przywracanie"
      : phase === "completed"
        ? "Przywrócono"
        : "Błąd przywracania";
    logSecurityAudit({
      category: "RECOVERY",
      action,
      severity,
      summary: `${verb}: ${scopePl[opts.scope]} (${sourcePl[opts.source]})`,
      detail: JSON.stringify({
        scope: opts.scope,
        source: opts.source,
        ...(opts.backupSlot ? { backupSlot: opts.backupSlot } : {}),
        ...(opts.count != null ? { count: opts.count } : {}),
        ...(opts.message ? { message: opts.message } : {}),
      }),
    });
  }, [logSecurityAudit]);

  const auditDataImport = useCallback((
    phase: "started" | "completed" | "failed",
    opts?: { count?: number; message?: string },
  ) => {
    const action = phase === "started"
      ? "data_import_started"
      : phase === "completed"
        ? "data_import_completed"
        : "data_import_failed";
    const severity = phase === "started" ? "info" : phase === "completed" ? "warn" : "high";
    const verb = phase === "started"
      ? "Rozpoczęto import backupu"
      : phase === "completed"
        ? "Import backupu zakończony"
        : "Błąd importu backupu";
    logSecurityAudit({
      category: "DATA",
      action,
      severity,
      summary: verb,
      detail: JSON.stringify({
        source: "file",
        ...(opts?.count != null ? { count: opts.count } : {}),
        ...(opts?.message ? { message: opts.message } : {}),
      }),
    });
  }, [logSecurityAudit]);

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
      logSecurityAudit({
        category: "DATA",
        action: "job_delete",
        severity: "high",
        summary: unique.length === 1 ? "Usunięto 1 robotę" : `Usunięto ${unique.length} robot`,
        detail: JSON.stringify({ ids: unique, count: unique.length }),
      });
      toast.success(unique.length === 1 ? "Robota usunięta" : `Usunięto ${unique.length} robot`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Błąd zapisu do chmury";
      toast.error("Usunięto lokalnie, ale sync chmury nie powiódł się", { description: msg });
    } finally {
      deleteJobsInFlightRef.current = false;
    }
  }, [clearPendingAutoSync, setJobs, logSecurityAudit]);

  const pullFromCloudAndMerge = useCallback(async () => {
    if (!tabVisibleRef.current || !isSupabaseConfigured() || pullInFlightRef.current) return;
    if (deleteJobsInFlightRef.current) return;
    if (payrollRosterPushRef.current) return;
    if (cloudSyncMutationGuard.isBlocked()) return;
    if (Date.now() < suppressAutoSyncUntilRef.current) return;
    pullInFlightRef.current = true;
    clearAutoSyncTimers();
    try {
      const merged = await pullAndMergeDataBundle(adminDataBundle());
      applyAdminDataBundle(merged);
      try {
        const aux = await pullOperationalNotesAuxFromCloud();
        setOperationalNotesReadState(aux.readState);
        setOperationalNotesAuditLog(aux.auditLog);
      } catch { /* offline */ }
      try {
        const securityLog = await pullSecurityAuditLogFromCloud();
        setSecurityAuditLog(securityLog);
      } catch { /* offline */ }
      try {
        const wmDrukLog = await pullWmDrukAuditLogFromCloud();
        setWmDrukAuditLog(wmDrukLog);
      } catch { /* offline */ }
    } catch {
      /* offline — zostaw lokalne dane */
    } finally {
      pullInFlightRef.current = false;
    }
  }, [adminDataBundle, applyAdminDataBundle, clearAutoSyncTimers, setOperationalNotesReadState, setOperationalNotesAuditLog, setSecurityAuditLog, setWmDrukAuditLog]);

  const pushToCloud = pushAllDataToCloud;

  const runCloudSync = useCallback(async (opts?: { toastSuccess?: boolean }) => {
    if (!tabVisibleRef.current) return;
    if (pullInFlightRef.current) return;
    if (deleteJobsInFlightRef.current) return;
    if (payrollRosterPushRef.current) return;
    if (cloudSyncMutationGuard.isBlocked()) return;
    if (Date.now() < suppressAutoSyncUntilRef.current) return;
    if (syncInFlightRef.current) {
      pendingCloudSyncRef.current = true;
      return;
    }
    if (!isSupabaseConfigured()) {
      setSyncStatus("offline");
      setSyncError("Brak VITE_SUPABASE_* w Vercel — ustaw zmienne i zrób redeploy");
      return;
    }
    syncInFlightRef.current = true;
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
      let opReadState = operationalNotesReadState;
      let opAuditLog = operationalNotesAuditLog;
      try {
        const aux = await pullOperationalNotesAuxFromCloud();
        opReadState = aux.readState;
        opAuditLog = aux.auditLog;
        setOperationalNotesReadState(aux.readState);
        setOperationalNotesAuditLog(aux.auditLog);
      } catch { /* offline */ }
      await pushMergedDataBundleToCloud(merged);
      const opIdx = DATA_KEYS.indexOf("kw-operational-notes");
      await pushOperationalNotesToCloud(
        opIdx >= 0 ? merged[opIdx] : operationalNotes,
        getDeletedOperationalNoteIds(),
        opReadState,
        opAuditLog,
      );
      setSyncStatus("saved");
      if (opts?.toastSuccess) toast.success("Zsynchronizowano z chmurą");
      setTimeout(() => setSyncStatus("idle"), 2500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Błąd połączenia z chmurą";
      setSyncStatus("error");
      setSyncError(msg);
      if (isPayrollGuardBlockedError(e)) {
        toast.error("Zapis listy płac zablokowany", { description: msg, id: "admin-cloud-sync-payroll-guard" });
      } else {
        toast.error("Nie udało się wysłać do chmury", { description: msg, id: "admin-cloud-sync" });
      }
    } finally {
      syncInFlightRef.current = false;
      if (pendingCloudSyncRef.current) {
        pendingCloudSyncRef.current = false;
        void runCloudSync(opts);
      }
    }
  }, [adminDataBundle, applyAdminDataBundle, jobs, operationalNotes, operationalNotesReadState, operationalNotesAuditLog]);

  const fireDeferredAutoSync = useCallback(() => {
    suppressWakeTimerRef.current = null;
    if (remoteMergeInFlightRef.current) {
      return;
    }
    const guardDelay = cloudSyncMutationGuard.msUntilUnblocked();
    const appDelay = suppressAutoSyncUntilRef.current - Date.now();
    const deferDelay = Math.max(guardDelay, appDelay);
    if (deferDelay > 0) {
      suppressWakeTimerRef.current = setTimeout(() => {
        suppressWakeTimerRef.current = null;
        fireDeferredAutoSync();
      }, deferDelay);
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
    if (cloudSyncMutationGuard.isBlocked()) {
      if (!autoSyncMountSettledRef.current) {
        return;
      }
      pendingAutoSyncRef.current = true;
      const guardDelay = cloudSyncMutationGuard.msUntilUnblocked();
      const appDelay = suppressAutoSyncUntilRef.current - Date.now();
      const delay = Math.max(guardDelay, appDelay, 0);
      if (delay > 0) {
        if (suppressWakeTimerRef.current) {
          clearTimeout(suppressWakeTimerRef.current);
        }
        suppressWakeTimerRef.current = setTimeout(() => {
          suppressWakeTimerRef.current = null;
          fireDeferredAutoSync();
        }, delay);
      }
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
      if (cloudSyncMutationGuard.isBlocked()) {
        pendingAutoSyncRef.current = true;
        const guardDelay = cloudSyncMutationGuard.msUntilUnblocked();
        const appDelay = suppressAutoSyncUntilRef.current - Date.now();
        const delay = Math.max(guardDelay, appDelay, 0);
        if (delay > 0) {
          if (suppressWakeTimerRef.current) clearTimeout(suppressWakeTimerRef.current);
          suppressWakeTimerRef.current = setTimeout(() => {
            suppressWakeTimerRef.current = null;
            fireDeferredAutoSync();
          }, delay);
        }
        return;
      }
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

  /** Deferred bootstrap scala kw-operational-notes w LS — odśwież notes + read-state w React. */
  useEffect(() => {
    const onDeferredBootstrap = () => {
      void (async () => {
        try {
          const rawNotes = localStorage.getItem("kw-operational-notes");
          if (rawNotes) {
            setOperationalNotes(normalizeOperationalNotes(JSON.parse(rawNotes)));
          }
          const aux = await pullOperationalNotesAuxFromCloud();
          setOperationalNotesReadState(aux.readState);
          setOperationalNotesAuditLog(aux.auditLog);
        } catch { /* offline */ }
      })();
    };
    window.addEventListener(WGDOM_DEFERRED_BOOTSTRAP_EVENT, onDeferredBootstrap);
    return () => window.removeEventListener(WGDOM_DEFERRED_BOOTSTRAP_EVENT, onDeferredBootstrap);
  }, [setOperationalNotes, setOperationalNotesReadState, setOperationalNotesAuditLog]);

  const wmPrintSeedCheckedRef = useRef(false);

  useEffect(() => {
    if (wmPrintSeedCheckedRef.current) return;
    wmPrintSeedCheckedRef.current = true;
    void (async () => {
      const result = await maybeExecuteWmPrintSeed();
      if (!result.seeded) return;
      setWmPrintTemplates(result.templates);
      suppressAutoSyncUntilRef.current = Date.now() + 4500;
      pushWmPrintToCloud(
        result.templates,
        normalizeWmPrintJobDocuments(wmPrintJobDocs),
        normalizeWmPrintSettings(wmPrintSettings),
        getDeletedWmPrintTemplateIds(),
        getDeletedWmPrintJobDocIds(),
        normalizeWmPrintHistory(wmPrintHistory),
      ).catch(() => {});
    })();
  }, [setWmPrintTemplates, wmPrintJobDocs, wmPrintSettings, wmPrintHistory]);

  // Auto-save to cloud on any data change (debounced 2s, only after initial sync; nie w ukrytej karcie)
  useEffect(() => {
    scheduleAutoCloudSync();
    remoteMergeInFlightRef.current = false;
  }, [directory, weekEmployees, savedWeeks, weekFrom, weekTo, jobs, contacts, employeeLeaves, recoverableCharges, operationalNotes, wmPrintTemplates, wmPrintJobDocs, wmPrintSettings, wmPrintHistory, deliveryPackagePublications, electricalMeasurements, electricalMeasurementRegistry, electricalMeasurementSettings, electricalSchematics, scheduleAutoCloudSync]);

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
    [...DATA_KEYS, ...OPERATIONAL_NOTES_BACKUP_AUX_KEYS, ADMIN_PASSWORDS_KEY, ADMIN_USERS_CONFIG_KEY].forEach((k) => {
      const v = localStorage.getItem(k);
      if (v) data[k] = JSON.parse(v);
    });
    saveAs(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),`backup-${new Date().toISOString().slice(0,10)}.json`);
  };
  const importBackup = (file: File) => {
    const reader=new FileReader();
    reader.onload=async (e)=>{
      auditDataImport("started");
      try {
        const data=JSON.parse(e.target?.result as string);
        const keyCount = Object.keys(data).length;
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
        if (data["kw-employee-leaves"] != null) {
          const local = JSON.parse(localStorage.getItem("kw-employee-leaves") || "[]");
          data["kw-employee-leaves"] = mergeEmployeeLeaves(local, data["kw-employee-leaves"], getDeletedEmployeeLeaveIds());
        }
        if (data["kw-recoverable-charges"] != null) {
          const local = JSON.parse(localStorage.getItem("kw-recoverable-charges") || "[]");
          data["kw-recoverable-charges"] = mergeRecoverableCharges(local, data["kw-recoverable-charges"], getDeletedRecoverableChargeIds());
        }
        let mergedOpDeleted = getDeletedOperationalNoteIds();
        if (data["kw-operational-notes-deleted-ids"] != null) {
          mergedOpDeleted = mergeDeletedOperationalNoteIds(
            mergedOpDeleted,
            normalizeDeletedOperationalNoteIds(data["kw-operational-notes-deleted-ids"]),
          );
          data["kw-operational-notes-deleted-ids"] = mergedOpDeleted;
        }
        if (data["kw-operational-notes"] != null) {
          const local = JSON.parse(localStorage.getItem("kw-operational-notes") || "[]");
          data["kw-operational-notes"] = mergeOperationalNotes(local, data["kw-operational-notes"], mergedOpDeleted);
        }
        if (data["kw-operational-notes-read-state"] != null) {
          const local = JSON.parse(localStorage.getItem("kw-operational-notes-read-state") || "[]");
          data["kw-operational-notes-read-state"] = mergeOperationalNotesReadState(
            local,
            data["kw-operational-notes-read-state"],
          );
        }
        if (data["kw-operational-notes-audit-log"] != null) {
          const local = JSON.parse(localStorage.getItem("kw-operational-notes-audit-log") || "[]");
          data["kw-operational-notes-audit-log"] = mergeOperationalNotesAuditLog(
            local,
            data["kw-operational-notes-audit-log"],
          );
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
          const opNotesRaw = localStorage.getItem("kw-operational-notes");
          if (opNotesRaw != null || data["kw-operational-notes-read-state"] != null || data["kw-operational-notes-audit-log"] != null) {
            await pushOperationalNotesToCloud(
              opNotesRaw ? JSON.parse(opNotesRaw) : [],
              getDeletedOperationalNoteIds(),
              JSON.parse(localStorage.getItem("kw-operational-notes-read-state") || "[]"),
              JSON.parse(localStorage.getItem("kw-operational-notes-audit-log") || "[]"),
            );
          }
        } catch { /* reload i tak wczyta */ }
        auditDataImport("completed", { count: keyCount });
        window.location.reload();
      } catch (err) {
        auditDataImport("failed", {
          message: err instanceof Error ? err.message : "Błąd importu pliku",
        });
        alert("Błąd importu pliku.");
      }
    };
    reader.readAsText(file);
  };

  const restoreJobsFromCloud = async (source: "prev" | "prev2" | "today") => {
    const labels = { prev: "poprzedni zapis", prev2: "starszą kopię", today: "zapis z dziś" };
    if (!window.confirm(`Przywrócić roboty z chmury (${labels[source]})? Obecna lista zostanie zachowana w kopii.`)) return;
    auditRestoreBackup("started", { scope: "jobs", source: "cloud", backupSlot: source });
    setRestoreBusy(true);
    try {
      const { count } = await restoreCloudJobsBackup(source);
      const [cloudJobs] = await fetchKeysFromCloud(["kw-jobs"]);
      const merged = mergeJobsById(jobs, normalizeJobsValue(cloudJobs), getDeletedJobIds()) as Job[];
      const synced = normalizeJobsList(merged as unknown[]);
      localStorage.setItem("kw-jobs", JSON.stringify(synced));
      setJobs(synced);
      await pushKeysToCloud(["kw-jobs"], [synced], { replaceJobsKeys: ["kw-jobs"] });
      auditRestoreBackup("completed", { scope: "jobs", source: "cloud", backupSlot: source, count: synced.length });
      alert(`Przywrócono ${count} robót z kopii chmurowej. Łącznie w aplikacji: ${synced.length}.`);
      fetchJobsBackupStatus().then(setJobsBackupStatus).catch(() => {});
    } catch (err) {
      auditRestoreBackup("failed", {
        scope: "jobs",
        source: "cloud",
        backupSlot: source,
        message: err instanceof Error ? err.message : "Nie udało się przywrócić kopii z chmury",
      });
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
    auditRestoreBackup("started", { scope: "jobs", source: "local" });
    const restored = restoreLocalJobsSnapshot(0);
    if (!restored) {
      auditRestoreBackup("failed", {
        scope: "jobs",
        source: "local",
        message: "Błąd odczytu lokalnej kopii",
      });
      alert("Błąd odczytu lokalnej kopii.");
      return;
    }
    const merged = mergeJobsById(jobs, restored, getDeletedJobIds()) as Job[];
    const synced = normalizeJobsList(merged as unknown[]);
    setJobs(synced);
    pushKeysToCloudSafe(["kw-jobs"], [synced]).catch(() => {});
    auditRestoreBackup("completed", { scope: "jobs", source: "local", count: synced.length });
    alert(`Przywrócono lokalną kopię. Łącznie robot: ${synced.length}.`);
  };

  const restorePayrollFromCloud = async (source: "prev" | "prev2" = "prev") => {
    const label = source === "prev2" ? "starszą kopię" : "poprzedni zapis";
    if (!window.confirm(`Przywrócić listę płac i archiwum z chmury (${label})? Połączy z obecnymi danymi — bogatsze wpisy wygrywają.`)) return;
    auditRestoreBackup("started", { scope: "payroll", source: "cloud", backupSlot: source });
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
      auditRestoreBackup("completed", {
        scope: "payroll",
        source: "cloud",
        backupSlot: source,
        count: mergedEmps.length,
      });
      alert(`Przywrócono listę płac (${mergedEmps.length} prac.) i archiwum (${mergedArch.length} tyg.).`);
      fetchPayrollBackupStatus().then((s) => {
        if (s) setPayrollBackupStatus({ employeesPrev: s.employeesPrev, employeesPrev2: s.employeesPrev2, archivePrev: s.archivePrev });
      }).catch(() => {});
    } catch (err) {
      auditRestoreBackup("failed", {
        scope: "payroll",
        source: "cloud",
        backupSlot: source,
        message: err instanceof Error ? err.message : "Nie udało się przywrócić listy płac z chmury",
      });
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
    auditRestoreBackup("started", { scope: "all", source: "cloud", backupSlot: source });
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
      auditRestoreBackup("completed", {
        scope: "all",
        source: "cloud",
        backupSlot: source,
        count: restoredKeys.length,
      });
      alert(`Przywrócono z chmury: ${restoredKeys.join(", ")}. Strona się odświeży.`);
      window.location.reload();
    } catch (err) {
      auditRestoreBackup("failed", {
        scope: "all",
        source: "cloud",
        backupSlot: source,
        message: err instanceof Error ? err.message : "Nie udało się przywrócić danych z chmury",
      });
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
    auditRestoreBackup("started", { scope: "all", source: "local" });
    restoreLocalDataSnapshot(pick.usePrev);
    auditRestoreBackup("completed", { scope: "all", source: "local" });
    window.location.reload();
  };

  // Auto-backup email — w niedzielę, po zapisie tygodnia do archiwum (patrz triggerWeeklyBackupEmail)

  // Global search results
  const searchResults = useMemo(()=>{
    if(!globalSearch.trim()) return {employees:[],jobs:[]};
    const q=globalSearch.toLowerCase();
    return {
      employees: filterProductionDirectory(directory).filter((d)=>d.name.toLowerCase().includes(q)||(d.phone ?? "").includes(q)||d.position.toLowerCase().includes(q)),
      jobs: jobs.filter(j=>j.address.toLowerCase().includes(q)||j.client.toLowerCase().includes(q)||j.flatNumber.toLowerCase().includes(q)),
    };
  },[globalSearch,directory,jobs]);

  const persistPayrollRoster = useCallback((next: WeekEmployee[]) => {
    suppressAutoSyncUntilRef.current = Date.now() + 6000;
    payrollRosterPushRef.current = true;
    void withKwWeekEmployeesAsyncMutation(() =>
      pushWeekEmployeesToCloud(next, { skipPayrollGuard: true }),
    )
      .finally(() => { payrollRosterPushRef.current = false; })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "Błąd połączenia z chmurą";
        toast.error("Nie udało się zapisać składu do chmury", {
          description: msg,
          id: "payroll-roster-push",
        });
      });
  }, []);

  const refreshSavedActiveWeekSnapshot = useCallback((nextEmployees: WeekEmployee[]) => {
    const blockers = hasPayrollRolloverBlockers(nextEmployees, weekFrom, weekTo, directory, {
      employeeLeaves,
      savedWeeks,
    });
    if (isPayrollWeekClosedForUi(weekFrom, weekTo, blockers)) return;
    setSavedWeeks((prev) => {
      const existing = prev.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
      if (!existing) return prev;
      const snapshot = buildWeekSnapshot(weekFrom, weekTo, nextEmployees, jobs, existing, employeeLeaves, prev);
      return prev.map((w) => (w.id === existing.id ? snapshot : w));
    });
  }, [weekFrom, weekTo, jobs, employeeLeaves, savedWeeks, directory, setSavedWeeks]);

  const addFromDirectory = (ids: string[]) => {
    setWeekEmployees((prev) => {
      const toAdd = filterDirectoryForPayrollWeekAdd(directory, ids, prev);
      const newEmps = toAdd.map(weekEmployeeFromDir);
      const next = [...prev, ...newEmps];
      if (newEmps.length > 0) {
        persistPayrollRoster(next);
        refreshSavedActiveWeekSnapshot(next);
      }
      return next;
    });
  };

  const removeWeekEmployee = (id: string) => {
    setWeekEmployees((prev) => {
      const next = prev.filter((e) => e.id !== id);
      if (next.length !== prev.length) {
        persistPayrollRoster(next);
        refreshSavedActiveWeekSnapshot(next);
      }
      return next;
    });
  };

  const clearAllWeekEmployees = () => {
    setWeekEmployees([]);
    persistPayrollRoster([]);
    refreshSavedActiveWeekSnapshot([]);
  };

  const replaceWeekWithAllActive = () => {
    const newEmps = filterProductionActiveDirectory(directory)
      .filter(isProductionDirectoryEmployee)
      .map(weekEmployeeFromDir);
    setWeekEmployees(newEmps);
    persistPayrollRoster(newEmps);
    refreshSavedActiveWeekSnapshot(newEmps);
  };

  const updateWeekEmployee = useCallback((updated:WeekEmployee)=>{
    setWeekEmployees((prev)=>{
      const next = prev.map((e)=>{
        if (e.id !== updated.id) return e;
        const now = new Date().toISOString();
        const rateChanged = updated.rate !== e.rate;
        const dataChanged =
          JSON.stringify({ days: updated.days, prevSaturday: updated.prevSaturday, extraCosts: updated.extraCosts, payrollCarryForward: updated.payrollCarryForward })
          !== JSON.stringify({ days: e.days, prevSaturday: e.prevSaturday, extraCosts: e.extraCosts, payrollCarryForward: e.payrollCarryForward });
        return {
          ...updated,
          settled: updated.settled ?? e.settled,
          settledUpdatedAt: updated.settledUpdatedAt ?? e.settledUpdatedAt,
          rateUpdatedAt: rateChanged ? now : updated.rateUpdatedAt ?? e.rateUpdatedAt,
          dataUpdatedAt: dataChanged ? now : updated.dataUpdatedAt ?? e.dataUpdatedAt,
        };
      });
      refreshSavedActiveWeekSnapshot(next);
      return next;
    });
  },[setWeekEmployees, refreshSavedActiveWeekSnapshot]);

  /** ETAP 1 — koszty do zwrotu: patch na prev state (bez stale safeEmp snapshot). */
  const updateWeekEmployeeExtraCosts = useCallback((empId: string, nextExtraCosts: WeekEmployee["extraCosts"]) => {
    setWeekEmployees((prev) => {
      const now = new Date().toISOString();
      const next = prev.map((e) => {
        if (e.id !== empId) return e;
        const dataChanged = JSON.stringify(e.extraCosts) !== JSON.stringify(nextExtraCosts);
        if (!dataChanged) return e;
        return {
          ...e,
          extraCosts: nextExtraCosts,
          dataUpdatedAt: now,
        };
      });
      refreshSavedActiveWeekSnapshot(next);
      return next;
    });
  }, [setWeekEmployees, refreshSavedActiveWeekSnapshot]);

  /** ETAP 1 — godziny dnia: patch na prev state (bez stale safeEmp snapshot). */
  const updateWeekEmployeeDay = useCallback((empId: string, key: DayKey, nextDay: DayData) => {
    setWeekEmployees((prev) => {
      const now = new Date().toISOString();
      const next = prev.map((e) => {
        if (e.id !== empId) return e;
        const days = { ...e.days, [key]: nextDay };
        const dataChanged = JSON.stringify(e.days) !== JSON.stringify(days);
        if (!dataChanged) return e;
        return { ...e, days, dataUpdatedAt: now };
      });
      refreshSavedActiveWeekSnapshot(next);
      return next;
    });
  }, [setWeekEmployees, refreshSavedActiveWeekSnapshot]);

  const updateWeekEmployeeRate = useCallback((empId: string, rate: string) => {
    setWeekEmployees((prev) => {
      const now = new Date().toISOString();
      const next = prev.map((e) => {
        if (e.id !== empId) return e;
        if (e.rate === rate) return e;
        return { ...e, rate, rateUpdatedAt: now };
      });
      refreshSavedActiveWeekSnapshot(next);
      return next;
    });
  }, [setWeekEmployees, refreshSavedActiveWeekSnapshot]);

  const updateWeekEmployeePrevSaturday = useCallback((empId: string, nextPrevSaturday: DayData) => {
    const prevSaturday = { ...nextPrevSaturday, extraHours: undefined };
    setWeekEmployees((prev) => {
      const now = new Date().toISOString();
      const next = prev.map((e) => {
        if (e.id !== empId) return e;
        const dataChanged = JSON.stringify(e.prevSaturday) !== JSON.stringify(prevSaturday);
        if (!dataChanged) return e;
        return { ...e, prevSaturday, dataUpdatedAt: now };
      });
      refreshSavedActiveWeekSnapshot(next);
      return next;
    });
  }, [setWeekEmployees, refreshSavedActiveWeekSnapshot]);

  const updateWeekEmployeePayrollCarryForward = useCallback((
    empId: string,
    payrollCarryForward: PayrollCarryForward | undefined,
  ) => {
    setWeekEmployees((prev) => {
      const now = new Date().toISOString();
      const next = prev.map((e) => {
        if (e.id !== empId) return e;
        const dataChanged = JSON.stringify(e.payrollCarryForward) !== JSON.stringify(payrollCarryForward);
        if (!dataChanged) return e;
        return { ...e, payrollCarryForward, dataUpdatedAt: now };
      });
      refreshSavedActiveWeekSnapshot(next);
      return next;
    });
  }, [setWeekEmployees, refreshSavedActiveWeekSnapshot]);

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
        suppressAutoSyncUntilRef.current = Date.now() + 6000;
        payrollRosterPushRef.current = true;
        try {
          await withKwWeekEmployeesAsyncMutation(async () => {
            let archive = savedWeeks;
            const existing = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
            if (
              existing
              && !isPayrollWeekClosedForUi(
                weekFrom,
                weekTo,
                hasPayrollRolloverBlockers(next, weekFrom, weekTo, directory, {
                  employeeLeaves,
                  savedWeeks: archive,
                }),
              )
            ) {
              const snapshot = buildWeekSnapshot(weekFrom, weekTo, next, jobs, existing, employeeLeaves, savedWeeks);
              archive = savedWeeks.map((w) => (w.id === existing.id ? snapshot : w));
              try { localStorage.setItem("kw-archive", JSON.stringify(archive)); } catch { /* ignore */ }
              setSavedWeeks(archive);
            }
            await pushAllDataToCloud([directory, next, archive, weekFrom, weekTo, jobs, contacts, employeeLeaves, recoverableCharges]);
          });
        } catch { /* auto-sync ponowi */ }
        finally { payrollRosterPushRef.current = false; }
      })();
      return next;
    });
  }, [directory, savedWeeks, weekFrom, weekTo, jobs, contacts, employeeLeaves, recoverableCharges, setWeekEmployees, setSavedWeeks]);

  const patchArchiveWeek = useCallback((weekId: string, patchEmployees: (emps: WeekEmployee[]) => WeekEmployee[]) => {
    setSavedWeeks((prev) => {
      const week = prev.find((w) => w.id === weekId);
      if (!week?.weekEmployees?.length) return prev;
      const nextEmployees = patchEmployees(week.weekEmployees);
      const snapshot = buildWeekSnapshot(week.weekFrom, week.weekTo, nextEmployees, jobs, week, employeeLeaves, savedWeeks);
      return prev.map((w) => (w.id === weekId ? snapshot : w));
    });
  }, [jobs, setSavedWeeks]);

  const updateArchiveWeekEmployee = useCallback((weekId: string, updatedEmp: WeekEmployee) => {
    patchArchiveWeek(weekId, (emps) => emps.map((e) => (e.id === updatedEmp.id ? updatedEmp : e)));
  }, [patchArchiveWeek]);

  const updateArchiveWeekEmployeeExtraCosts = useCallback((
    weekId: string,
    empId: string,
    nextExtraCosts: WeekEmployee["extraCosts"],
  ) => {
    patchArchiveWeek(weekId, (emps) => {
      const now = new Date().toISOString();
      return emps.map((e) => {
        if (e.id !== empId) return e;
        const dataChanged = JSON.stringify(e.extraCosts) !== JSON.stringify(nextExtraCosts);
        if (!dataChanged) return e;
        return { ...e, extraCosts: nextExtraCosts, dataUpdatedAt: now };
      });
    });
  }, [patchArchiveWeek]);

  const updateArchiveWeekEmployeeDay = useCallback((
    weekId: string,
    empId: string,
    key: DayKey,
    nextDay: DayData,
  ) => {
    patchArchiveWeek(weekId, (emps) => {
      const now = new Date().toISOString();
      return emps.map((e) => {
        if (e.id !== empId) return e;
        const days = { ...e.days, [key]: nextDay };
        const dataChanged = JSON.stringify(e.days) !== JSON.stringify(days);
        if (!dataChanged) return e;
        return { ...e, days, dataUpdatedAt: now };
      });
    });
  }, [patchArchiveWeek]);

  const updateArchiveWeekEmployeeRate = useCallback((weekId: string, empId: string, rate: string) => {
    patchArchiveWeek(weekId, (emps) => {
      const now = new Date().toISOString();
      return emps.map((e) => {
        if (e.id !== empId) return e;
        if (e.rate === rate) return e;
        return { ...e, rate, rateUpdatedAt: now };
      });
    });
  }, [patchArchiveWeek]);

  const updateArchiveWeekEmployeePrevSaturday = useCallback((
    weekId: string,
    empId: string,
    nextPrevSaturday: DayData,
  ) => {
    const prevSaturday = { ...nextPrevSaturday, extraHours: undefined };
    patchArchiveWeek(weekId, (emps) => {
      const now = new Date().toISOString();
      return emps.map((e) => {
        if (e.id !== empId) return e;
        const dataChanged = JSON.stringify(e.prevSaturday) !== JSON.stringify(prevSaturday);
        if (!dataChanged) return e;
        return { ...e, prevSaturday, dataUpdatedAt: now };
      });
    });
  }, [patchArchiveWeek]);

  const updateArchiveWeekEmployeePayrollCarryForward = useCallback((
    weekId: string,
    empId: string,
    payrollCarryForward: PayrollCarryForward | undefined,
  ) => {
    patchArchiveWeek(weekId, (emps) => {
      const now = new Date().toISOString();
      return emps.map((e) => {
        if (e.id !== empId) return e;
        const dataChanged = JSON.stringify(e.payrollCarryForward) !== JSON.stringify(payrollCarryForward);
        if (!dataChanged) return e;
        return { ...e, payrollCarryForward, dataUpdatedAt: now };
      });
    });
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
    setWeekEmployees((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, settled: newSettled, settledUpdatedAt: now } : e));
      refreshSavedActiveWeekSnapshot(next);
      return next;
    });
    if (settledSyncTimerRef.current) clearTimeout(settledSyncTimerRef.current);
    settledSyncTimerRef.current = setTimeout(() => {
      clearPendingAutoSync();
      suppressAutoSyncUntilRef.current = 0;
      void runCloudSync();
    }, 400);
  }, [weekEmployees, weekFrom, weekTo, refreshSavedActiveWeekSnapshot, setWeekEmployees, runCloudSync, clearPendingAutoSync]);

  const saveBiweeklyBacklogWeek = useCallback((backlogFrom: string, backlogTo: string, employees: WeekEmployee[]) => {
    if (employees.length === 0) return;
    const existing = savedWeeks.find((w) => w.weekFrom === backlogFrom && w.weekTo === backlogTo);
    const snapshot = buildWeekSnapshot(backlogFrom, backlogTo, employees, jobs, existing, employeeLeaves, savedWeeks);
    snapshot.backlog = true;
    snapshot.backlogNote = "Zaległa lista płac — wypłata co 2 tygodnie";
    const nextArchive = existing
      ? savedWeeks.map((w) => (w.id === existing.id ? snapshot : w))
      : [...savedWeeks, snapshot];
    setSavedWeeks(nextArchive);
  }, [savedWeeks, jobs, setSavedWeeks, employeeLeaves]);

  const doSaveWeek = useCallback(() => {
    if (weekEmployees.length === 0) return;
    const existing = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
    const snapshot = buildWeekSnapshot(weekFrom, weekTo, weekEmployees, jobs, existing, employeeLeaves, savedWeeks);
    const nextArchive = existing
      ? savedWeeks.map((w) => (w.id === existing.id ? snapshot : w))
      : [...savedWeeks, snapshot];
    setSavedWeeks(nextArchive);
    setShowSaveConfirm(false);
    toast.success(`Tydzień zapisany · ${fmtDate(weekFrom)}–${fmtDate(weekTo)}`);
    triggerWeeklyBackupEmail(weekFrom, weekTo, jobs, nextArchive);
  }, [weekFrom, weekTo, weekEmployees, jobs, savedWeeks, setSavedWeeks, employeeLeaves]);

  const saveWeek = () => {
    if (weekEmployees.length === 0) return;
    const alreadyExists = savedWeeks.some((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
    if (alreadyExists) { setShowSaveConfirm(true); return; }
    doSaveWeek();
  };

  const autoArchiveAndAdvance = useCallback((targetFrom: string, targetTo: string) => {
    let nextArchive = savedWeeks;
    if (weekEmployees.length > 0) {
      const existing = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
      const snapshot = buildWeekSnapshot(weekFrom, weekTo, weekEmployees, jobs, existing, employeeLeaves, savedWeeks);
      nextArchive = existing
        ? savedWeeks.map((w) => (w.id === existing.id ? snapshot : w))
        : [...savedWeeks, snapshot];
      setSavedWeeks(nextArchive);
    }
    setWeekFrom(targetFrom);
    setWeekTo(targetTo);
    setWeekEmployees([]);
    suppressAutoSyncUntilRef.current = Date.now() + 6000;
    void pushPayrollWeekAfterRollover({
      weekFrom: targetFrom,
      weekTo: targetTo,
      weekEmployees: [],
      archive: nextArchive,
    }).catch(() => {});
  }, [weekEmployees, weekFrom, weekTo, savedWeeks, jobs, setSavedWeeks, setWeekFrom, setWeekTo, setWeekEmployees, employeeLeaves]);

  const payrollRolloverCtx = useMemo(
    () => ({ employeeLeaves, savedWeeks }),
    [employeeLeaves, savedWeeks],
  );

  const goToCurrent = useCallback(() => {
    const c = getWeekRange();
    if (weekFrom === c.from) return;
    if (hasPayrollRolloverBlockers(weekEmployees, weekFrom, weekTo, directory, payrollRolloverCtx)) {
      if (!window.confirm(
        "Są nierozliczone wypłaty w sobotę. Przejść do bieżącego tygodnia mimo to? Obecna lista trafi do archiwum.",
      )) return;
    }
    autoArchiveAndAdvance(c.from, c.to);
  }, [weekFrom, weekTo, weekEmployees, directory, payrollRolloverCtx, autoArchiveAndAdvance]);

  // Auto-przejście tygodnia płac: Nd ≥20:00 lub Pn+ (gdy wszyscy rozliczeni) + auto-archiwum w Nd
  const payrollWeekCycleRef = useRef<() => void>(() => {});
  const payrollWeekAdvancedToastRef = useRef<string | null>(null);

  const trySundayArchiveOnly = useCallback(() => {
    const now = new Date();
    if (now.getDay() !== 0) return;
    const closing = getPayrollClosingWeekRange(now);
    if (weekFrom !== closing.from || weekTo !== closing.to) return;
    if (hasPayrollRolloverBlockers(weekEmployees, weekFrom, weekTo, directory, payrollRolloverCtx)) return;
    const today = localIsoDate(now);
    if (localStorage.getItem("kw-last-week-auto-archive") === today) return;
    localStorage.setItem("kw-last-week-auto-archive", today);
    if (weekEmployees.length === 0) {
      const archived = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
      if (archived) triggerWeeklyBackupEmail(weekFrom, weekTo, jobs, savedWeeks);
      return;
    }
    const existing = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
    const snapshot = buildWeekSnapshot(weekFrom, weekTo, weekEmployees, jobs, existing, employeeLeaves, savedWeeks);
    const nextArchive = existing
      ? savedWeeks.map((w) => (w.id === existing.id ? snapshot : w))
      : [...savedWeeks, snapshot];
    setSavedWeeks(nextArchive);
    triggerWeeklyBackupEmail(weekFrom, weekTo, jobs, nextArchive);
  }, [weekFrom, weekTo, weekEmployees, directory, payrollRolloverCtx, savedWeeks, jobs, setSavedWeeks, employeeLeaves]);

  const tryPayrollWeekCycle = useCallback(() => {
    const current = getPayrollWeekRange();
    const onCurrentRange = weekFrom === current.from && weekTo === current.to;

    if (!onCurrentRange) {
      if (
        weekEmployees.length > 0
        && hasPayrollRolloverBlockers(weekEmployees, weekFrom, weekTo, directory, payrollRolloverCtx)
      ) return;
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
  }, [weekFrom, weekTo, weekEmployees, directory, payrollRolloverCtx, autoArchiveAndAdvance, trySundayArchiveOnly]);

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

  const canViewWorkCatalog = adminSession
    ? adminCanViewWorkCatalog(adminSession.role, appSettings)
    : false;

  const canViewInstructions = adminSession
    ? adminCanViewInstructions(adminSession.role, appSettings)
    : false;

  const canViewChanges = adminSession
    ? adminCanViewChanges(adminSession.role, appSettings)
    : false;

  const navItems = useMemo(
    () =>
      buildAdminNavItems({
        canViewTendersNav,
        canViewInstructionsNav: canViewInstructions,
        canViewChangesNav: canViewChanges,
        productionWeekEmployees,
        directory,
        contacts,
        savedWeeks,
        jobs,
        recoverableCharges,
        adminUserId: adminSession?.id,
        operationalNotes,
        operationalNotesReadState,
        adminSession,
      }),
    [
      canViewTendersNav,
      canViewInstructions,
      canViewChanges,
      productionWeekEmployees,
      directory,
      contacts,
      savedWeeks,
      jobs,
      recoverableCharges,
      adminSession,
      operationalNotes,
      operationalNotesReadState,
    ],
  );

  const operationalNotesUnreadCount = useMemo(
    () => countUnreadOperationalNotes(operationalNotes, operationalNotesReadState, adminSession),
    [operationalNotes, operationalNotesReadState, adminSession],
  );

  const { mobileNavPrimary, mobileNavMore } = useMemo(() => splitMobileNav(navItems), [navItems]);
  const mobileMoreActive = mobileNavMore.some((n) => isNavItemActive(n.key, view));

  const payrollCashSplitSidebar = useMemo(
    () => computePayrollCashSplitWithCarry(productionWeekEmployees, directory, weekFrom, weekTo, savedWeeks),
    [productionWeekEmployees, directory, weekFrom, weekTo, savedWeeks],
  );

  const totalNet = payrollCashSplitSidebar.totalSaturdayCash;

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

  const openJobInJobs = useCallback((
    jobId: string,
    section: import("@/app/JobDetailSectionNav").JobDetailSection = "summary",
  ) => {
    const returnLabels: Partial<Record<View, string>> = {
      dashboard: "Pulpit",
      payroll: "Lista płac",
      schedule: "Grafik",
      directory: "Kadry",
      inspector: "Inspektor",
      archive: "Archiwum",
      jobs: "Roboty",
      media: "Zdjęcia i pliki",
      recoverablecharges: "Do rozliczenia",
      operationalnotes: "Notatki operacyjne",
      audit: "Audit Hub",
      guide: "Instrukcja",
      changelog: "Zmiany",
      tenders: "Przetargi",
      workcatalog: "Biblioteka Robót",
    };
    if (view !== "jobs") {
      setViewReturn({ view, label: returnLabels[view] ?? "Wstecz" });
    }
    setPendingJobId(jobId);
    setPendingJobSection(section);
    setView("jobs");
    setMobileMoreOpen(false);
  }, [view]);

  const handleNavigate = useCallback((
    v: View | "payroll" | "directory" | "archive" | "jobs" | "schedule" | "operationalnotes",
    jobId?: string,
    payrollEmpId?: string,
    jobSection?: import("@/app/JobDetailSectionNav").JobDetailSection,
  ) => {
    const dest = v as View;
    const returnLabels: Partial<Record<View, string>> = {
      dashboard: "Pulpit",
      payroll: "Lista płac",
      schedule: "Grafik",
      directory: "Kadry",
      inspector: "Inspektor",
      archive: "Archiwum",
      jobs: "Roboty",
      operationalnotes: "Notatki operacyjne",
      audit: "Audit Hub",
      workcatalog: "Biblioteka Robót",
    };
    if ((dest === "jobs" || dest === "inspector") && view !== dest) {
      setViewReturn({ view, label: returnLabels[view] ?? "Wstecz" });
    } else if (dest !== "jobs" && dest !== "inspector") {
      setViewReturn(null);
    }
    if (jobId && dest === "jobs") {
      setPendingJobId(jobId);
      setPendingJobSection(jobSection ?? "summary");
    }
    if (payrollEmpId) setPendingPayrollEmpId(payrollEmpId);
    setView(dest);
    setMobileMoreOpen(false);
  }, [view]);

  const goToView = useCallback((v: View) => {
    setViewReturn(null);
    setView(v);
    setMobileMoreOpen(false);
    if (TENDERS_V4_ROUTING) {
      if (v === "tenders") {
        navigate(TENDERS_LIST_PATH);
      } else if (isTenderV4Path(location.pathname)) {
        navigate("/");
      }
    }
  }, [navigate, location.pathname]);

  const openTenderById = useCallback((tid: string) => {
    setView("tenders");
    if (TENDERS_V4_ROUTING) {
      navigate(buildTenderDetailPath(tid, "decyzja"));
    } else {
      setPendingTenderId(tid);
    }
  }, [navigate]);

  const handleAuditHubDeepLink = useCallback((deepLink: AuditFeedDeepLink) => {
    const nav = resolveAuditHubNavigation(deepLink);
    if (!nav) return;
    setViewReturn({ view: "audit", label: "Audit Hub" });
    setMobileMoreOpen(false);
    if (nav.view === "operationalnotes") {
      setPendingOperationalNoteId(nav.noteId);
      setPendingOperationalNotesAuditOpen(!!nav.openAudit);
      setView("operationalnotes");
      return;
    }
    if (nav.view === "inspector") {
      setView("inspector");
      return;
    }
    if (nav.view === "jobs") {
      setPendingJobId(nav.jobId);
      setPendingJobSection(nav.section);
      setView("jobs");
      return;
    }
    if (nav.view === "wmprint") {
      setPendingWmPrintNav({ tab: nav.tab, jobId: nav.jobId });
      setView("wmprint");
    }
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

  useLayoutEffect(() => {
    if (view !== "workcatalog") return;
    if (canViewTendersNav) {
      if (canViewWorkCatalog) openTendersAtWorkCatalogTab();
      setView("tenders");
    } else {
      setView("dashboard");
    }
  }, [view, canViewTendersNav, canViewWorkCatalog]);

  useEffect(() => {
    if (view === "tenders" && !canViewTendersNav) setView("dashboard");
  }, [view, canViewTendersNav]);

  useEffect(() => {
    if (view === "guide" && !canViewInstructions) setView("dashboard");
  }, [view, canViewInstructions]);

  useEffect(() => {
    if (view === "changelog" && !canViewChanges) setView("dashboard");
  }, [view, canViewChanges]);

  useEffect(() => {
    if (view === "audit" && !canAccessAuditHub(adminSession)) setView("dashboard");
  }, [view, adminSession]);

  useEffect(() => {
    if (!TENDERS_V4_ROUTING) return;
    if (isTenderV4Path(location.pathname)) {
      setView("tenders");
    }
  }, [location.pathname]);

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

        <OperationalNotesUnreadBanner
          count={operationalNotesUnreadCount}
          onGoToNotes={() => goToView("operationalnotes")}
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
          canViewWorkCatalog={canViewWorkCatalog}
          canViewInstructions={canViewInstructions}
          canViewChanges={canViewChanges}
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
          employeeLeaves={employeeLeaves}
          setEmployeeLeaves={setEmployeeLeaves}
          commitEmployeeLeaves={commitEmployeeLeaves}
          recoverableCharges={recoverableCharges}
          setRecoverableCharges={setRecoverableCharges}
          commitRecoverableCharges={commitRecoverableCharges}
          operationalNotes={operationalNotes}
          setOperationalNotes={setOperationalNotes}
          operationalNotesReadState={operationalNotesReadState}
          setOperationalNotesReadState={setOperationalNotesReadState}
          operationalNotesAuditLog={operationalNotesAuditLog}
          setOperationalNotesAuditLog={setOperationalNotesAuditLog}
          securityAuditLog={securityAuditLog}
          wmDrukAuditLog={wmDrukAuditLog}
          onRecordWmDrukAudit={onRecordWmDrukAudit}
          commitOperationalNotes={commitOperationalNotes}
          wmPrintTemplates={wmPrintTemplates}
          setWmPrintTemplates={setWmPrintTemplates}
          wmPrintJobDocs={wmPrintJobDocs}
          setWmPrintJobDocs={setWmPrintJobDocs}
          wmPrintSettings={wmPrintSettings}
          setWmPrintSettings={setWmPrintSettings}
          wmPrintHistory={wmPrintHistory}
          setWmPrintHistory={setWmPrintHistory}
          commitWmPrint={commitWmPrint}
          deliveryPackagePublications={deliveryPackagePublications}
          setDeliveryPackagePublications={setDeliveryPackagePublications}
          commitDeliveryPackagePublications={commitDeliveryPackagePublications}
          electricalMeasurements={electricalMeasurements}
          setElectricalMeasurements={setElectricalMeasurements}
          electricalMeasurementRegistry={electricalMeasurementRegistry}
          setElectricalMeasurementRegistry={setElectricalMeasurementRegistry}
          electricalMeasurementSettings={electricalMeasurementSettings}
          setElectricalMeasurementSettings={setElectricalMeasurementSettings}
          commitElectricalMeasurementSettings={commitElectricalMeasurementSettings}
          commitElectricalMeasurements={commitElectricalMeasurements}
          electricalSchematics={electricalSchematics}
          setElectricalSchematics={setElectricalSchematics}
          commitElectricalSchematics={commitElectricalSchematics}
          pendingWmPrintNav={pendingWmPrintNav}
          onInitialWmPrintNavigationConsumed={onInitialWmPrintNavigationConsumed}
          onOpenWmPrintMeasurements={(jobId) => {
            setPendingWmPrintNav({ tab: "pomiary", jobId });
            setViewReturn({ view: "jobs", label: "Roboty" });
            setView("wmprint");
          }}
          adminSession={adminSession}
          alertsSeenTick={alertsSeenTick}
          onAlertsSeen={() => setAlertsSeenTick((t) => t + 1)}
          onOpenSms={() => setShowSmsModal(true)}
          onOpenTenders={() => {
            if (TENDERS_V4_ROUTING) {
              navigate(TENDERS_LIST_PATH);
              setView("tenders");
            } else {
              openTendersAtStrategyTab();
              setView("tenders");
            }
          }}
          onOpenTender={openTenderById}
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
          updateWeekEmployeeExtraCosts={updateWeekEmployeeExtraCosts}
          updateWeekEmployeeDay={updateWeekEmployeeDay}
          updateWeekEmployeeRate={updateWeekEmployeeRate}
          updateWeekEmployeePrevSaturday={updateWeekEmployeePrevSaturday}
          updateWeekEmployeePayrollCarryForward={updateWeekEmployeePayrollCarryForward}
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
          updateArchiveWeekEmployeeExtraCosts={updateArchiveWeekEmployeeExtraCosts}
          updateArchiveWeekEmployeeDay={updateArchiveWeekEmployeeDay}
          updateArchiveWeekEmployeeRate={updateArchiveWeekEmployeeRate}
          updateArchiveWeekEmployeePrevSaturday={updateArchiveWeekEmployeePrevSaturday}
          updateArchiveWeekEmployeePayrollCarryForward={updateArchiveWeekEmployeePayrollCarryForward}
          toggleArchiveSettled={toggleArchiveSettled}
          setJobs={setJobs}
          deleteJobsByIds={deleteJobsByIds}
          pendingJobId={pendingJobId}
          pendingJobSection={pendingJobSection}
          onInitialJobConsumed={() => { setPendingJobId(null); setPendingJobSection(null); }}
          onOpenJobInJobs={openJobInJobs}
          onGoToInspector={() => { setViewReturn({ view: "jobs", label: "Roboty" }); setView("inspector"); }}
          appSettings={appSettings}
          onOpenTenderFromJobs={(tid) => { setViewReturn({ view: "jobs", label: "Roboty" }); openTenderById(tid); }}
          jobsReturnNav={viewReturn && viewReturn.view !== "jobs" ? { label: viewReturn.label, onBack: () => { setView(viewReturn.view); setViewReturn(null); setPendingJobId(null); setPendingJobSection(null); } } : undefined}
          inspectorReturnNav={viewReturn && viewReturn.view !== "inspector" ? { label: viewReturn.label, onBack: () => { setView(viewReturn.view); setViewReturn(null); } } : undefined}
          onOpenJobFromGallery={(id) => { setPendingJobId(id); setPendingJobSection("photos"); setView("jobs"); }}
          onOpenJobFromFiles={(id) => { setPendingJobId(id); setPendingJobSection("files"); setView("jobs"); }}
          pendingTenderId={pendingTenderId}
          onOpenJobFromTender={(id) => { setPendingJobId(id); setView("jobs"); }}
          onSetPendingJobId={setPendingJobId}
          onSetView={setView}
          pendingRecoverableChargeId={pendingRecoverableChargeId}
          onInitialRecoverableChargeConsumed={() => setPendingRecoverableChargeId(null)}
          pendingRecoverableChargeCreatePreset={pendingRecoverableChargeCreatePreset}
          onInitialRecoverableChargeCreatePresetConsumed={() => setPendingRecoverableChargeCreatePreset(null)}
          onOpenRecoverableChargeFromJobs={(chargeId) => {
            setPendingRecoverableChargeId(chargeId);
            setViewReturn({ view: "jobs", label: "Roboty" });
            setView("recoverablecharges");
          }}
          onOpenRecoverableChargeCreateFromJobs={(preset) => {
            setPendingRecoverableChargeCreatePreset(preset);
            setViewReturn({ view: "jobs", label: "Roboty" });
            setView("recoverablecharges");
          }}
          pendingOperationalNoteId={pendingOperationalNoteId}
          pendingOperationalNotesAuditOpen={pendingOperationalNotesAuditOpen}
          onInitialOperationalNoteConsumed={() => setPendingOperationalNoteId(null)}
          onInitialOperationalNotesAuditOpenConsumed={() => setPendingOperationalNotesAuditOpen(false)}
          onAuditHubDeepLink={handleAuditHubDeepLink}
          pendingOperationalNoteCreatePreset={pendingOperationalNoteCreatePreset}
          onInitialOperationalNoteCreatePresetConsumed={() => setPendingOperationalNoteCreatePreset(null)}
          onOpenOperationalNoteFromJobs={(noteId, fromJobId) => {
            if (noteId) setPendingOperationalNoteId(noteId);
            else setPendingOperationalNoteId(null);
            if (fromJobId) {
              setPendingJobId(fromJobId);
              const job = jobs.find((j) => j.id === fromJobId);
              setViewReturn({ view: "jobs", label: job ? jobLabelForOperationalNote(job) : "Roboty" });
            } else {
              setViewReturn({ view: "jobs", label: "Roboty" });
            }
            setView("operationalnotes");
          }}
          onOpenOperationalNoteCreateFromJobs={(preset) => {
            setPendingOperationalNoteCreatePreset(preset);
            const jobId = preset.linkedJobId;
            if (jobId) {
              setPendingJobId(jobId);
              const job = jobs.find((j) => j.id === jobId);
              setViewReturn({
                view: "jobs",
                label: job ? jobLabelForOperationalNote(job) : preset.linkedJobNameSnapshot?.trim() || "Roboty",
              });
            } else {
              setViewReturn({ view: "jobs", label: "Roboty" });
            }
            setView("operationalnotes");
          }}
          operationalNotesReturnNav={
            viewReturn?.view === "jobs"
              ? {
                  label: viewReturn.label,
                  onBack: () => {
                    setView("jobs");
                    setViewReturn(null);
                    setPendingOperationalNoteId(null);
                    setPendingOperationalNoteCreatePreset(null);
                  },
                }
              : undefined
          }
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
          adminSession={adminSession}
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
        <div className="fixed inset-0 z-50 modal-overlay flex items-end md:items-center justify-center p-0 md:p-4" style={{background:"rgba(0,0,0,0.7)"}} onClick={()=>setShowSaveConfirm(false)}>
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

export { LoginScreen } from "@/app/LoginScreen";
export { WorkerPhotoView } from "@/app/WorkerPhotoView";
export { AppInner };

export default function App() {
  return <CloudLoader><AppInnerWithAuth/></CloudLoader>;
}
