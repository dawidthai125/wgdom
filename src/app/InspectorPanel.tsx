import { useState, useMemo, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { JobPhotoImg } from "@/app/JobPhotoImg";
import { FileText, ClipboardList, X, FileCheck, MessageSquare } from "lucide-react";
import { InspectorCommandLayer } from "@/app/inspector/InspectorCommandLayer";
import { InspectorShell } from "@/app/inspector/InspectorShell";
import { InspectorSidebar } from "@/app/inspector/InspectorSidebar";
import { InspectorViewRouter } from "@/app/inspector/InspectorViewRouter";
import { InspectorJobWorkspace } from "@/app/inspector/InspectorJobWorkspace";
import {
  fetchKeysFromCloud,
  pushKeysToCloudSafe,
  normalizeJobsValue,
  mergeJobsById,
  mergeDirectory,
  getDeletedJobIds,
  getDeletedDirectoryIds,
  mergeDeletedJobIds,
  mergeDeletedDirectoryIds,
  saveDeletedJobIds,
  saveDeletedDirectoryIds,
  normalizeDeletedJobIds,
  normalizeDeletedDirectoryIds,
  JOBS_DELETED_IDS_KEY,
  DIRECTORY_DELETED_IDS_KEY,
  ADMIN_USERS_CONFIG_KEY,
  RECOVERABLE_CHARGES_DELETED_IDS_KEY,
  getDeletedRecoverableChargeIds,
  mergeDeletedRecoverableChargeIds,
  saveDeletedRecoverableChargeIds,
  normalizeDeletedRecoverableChargeIds,
  pushOperationalNotesToCloud,
  getDeletedOperationalNoteIds,
  mergeDeletedOperationalNoteIds,
  saveDeletedOperationalNoteIds,
  normalizeDeletedOperationalNoteIds,
  OPERATIONAL_NOTES_KEY,
  OPERATIONAL_NOTES_DELETED_IDS_KEY,
  OPERATIONAL_NOTES_READ_STATE_KEY,
  OPERATIONAL_NOTES_AUDIT_LOG_KEY,
  addDeletedOperationalNoteId,
} from "@/lib/cloud-sync";
import type { Job } from "@/app/app-domain";
import type { AdminSession } from "@/lib/admin-auth";
import {
  mergeOperationalNotes,
  normalizeOperationalNotes,
  type OperationalNote,
} from "@/lib/operational-notes";
import type { OperationalNoteAuditEntry } from "@/lib/operational-notes-audit";
import { mergeOperationalNotesAuditLog, normalizeOperationalNotesAuditLog } from "@/lib/operational-notes-audit";
import {
  filterJobsForInspector,
  isJobVisibleToInspector,
} from "@/lib/inspector-job-assignment";
import {
  countUnreadOperationalNotes,
  mergeOperationalNotesReadState,
  normalizeOperationalNotesReadState,
  type OperationalNoteReadReceipt,
} from "@/lib/operational-notes-read-state";
import type { RecoverableCharge } from "@/lib/recoverable-charges";
import {
  getRecoverableChargeJobStats,
  mergeRecoverableCharges,
  normalizeRecoverableCharges,
  type RecoverableChargeJobStats,
} from "@/lib/recoverable-charges";
import type { BillingNotePendingFiles } from "@/app/JobRecoverableChargesPanel";
import {
  appendBillingJobNote,
  appendBillingProposalNote,
  buildBillingJobNote,
  buildBillingProposalNote,
  type JobNoteAttachment,
} from "@/lib/job-wm";
import { uploadBillingEvidence, uploadBillingProposalEvidence } from "@/lib/billing-evidence-upload";
import { recoverableChargeDescriptionLine } from "@/lib/recoverable-charges";
import {
  DOC_LABELS,
  REQUIRED_DOCS,
  type DocType,
  type JobFileAttachment,
  syncJobDocuments,
  isReportSyncedDocLocked,
  applyJobFileKindUpload,
  resolveJobFileStoragePath,
} from "@/lib/job-documents";
import { InspectorQuickPhotoFab } from "@/app/InspectorQuickPhotoFab";
import { computeInspectorDashboardStats } from "@/lib/inspector-dashboard";
import { uploadJobFile, deleteJobFile } from "@/lib/job-file-upload";
import { uploadInspectorPhoto } from "@/lib/job-photo-upload";
import {
  inferHandoverStage,
  plannedHandoverStatus,
  normalizeJobWmFields,
  jobsWithAdminNotesNeedingInspector,
  type InspectorPhotoLabel,
  type JobHandoverStage,
  type JobWmJob,
} from "@/lib/job-wm";
import {
  appendJobActivity,
  inspectorDocToggleText,
  inspectorFileUploadText,
  isInspectorActivityType,
  type JobActivity,
} from "@/lib/job-activity";
import { recordInspectorEvent, getInspectorJobNotesSeenAt, markInspectorJobNotesSeen, syncAlertsSeenFromCloud } from "@/lib/inspector-stats";
import { InspectorHelpBanner, InspectorHelpModal } from "@/app/InspectorHelp";
import { normalizeJobMetaFields, type HousingType, type StoveType, type GasFurnaceStatus } from "@/lib/job-meta";
import { mergeAdminUsersConfig, loadAdminUsersConfig } from "@/lib/admin-auth";
import {
  InspectorBottomNav,
  INSPECTOR_MAIN_TAB_LABELS,
  type InspectorJobSection,
  type InspectorMainTab,
} from "@/app/InspectorNavigation";
import {
  downloadPublishedDeliveryPackageZip,
  inspectorDeliveryPackageForJob,
} from "@/lib/delivery-package-publications/inspector-access";
import {
  inspectorDeliveryPackageStatusDisplay,
  INSPECTOR_DELIVERY_PACKAGE_PANEL_ID,
  type InspectorHandoverQuickActionId,
} from "@/lib/inspector-handover-ux";
import {
  DELIVERY_PACKAGE_PUBLICATIONS_KEY,
  type DeliveryPackagePublication,
} from "@/lib/delivery-package-publications/types";
import { mergeDeliveryPackagePublications } from "@/lib/delivery-package-publications/merge";
import { normalizeDeliveryPackagePublications } from "@/lib/delivery-package-publications/normalize";

const OperationalNotesView = lazy(() =>
  import("@/app/OperationalNotesView").then((m) => ({ default: m.OperationalNotesView })),
);

const TAB_RETURN_LABELS: Record<InspectorMainTab, string> = {
  dashboard: "Pulpitu",
  jobs: "listy robót",
  gallery: "Galerii",
  files: "Plików",
  portfolio: "Portfolio WM",
};
import { PwaInstallBanner } from "@/app/PwaInstallBanner";
import { queuePhoto, listQueuedPhotos, removeQueuedPhoto } from "@/lib/photo-queue";
import { onNativeAppResume, registerNativeBackHandler } from "@/lib/native-app-bridge";
import { usePullToRefresh } from "@/app/usePullToRefresh";
import { Toaster, toast } from "sonner";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { loadAppSettingsLocal, syncAppSettingsFromCloud } from "@/lib/app-settings";

type JobStatus = "in_progress" | "completed";

interface DirectoryEmployee {
  id: string;
  name: string;
  phone: string;
  position: string;
}

interface WorkReportItem {
  id: string;
  text: string;
  note: string;
}

interface RoomDimension {
  id: string;
  roomType: string;
  customLabel: string;
  length: string;
  width: string;
  height: string;
  note?: string;
}

interface WorkerJobReport {
  id: string;
  workerName: string;
  authorAdminRole?: import("@/lib/admin-auth").AdminRole | "worker";
  submittedAt: string;
  updatedAt?: string;
  workItems: WorkReportItem[];
  rooms: RoomDimension[];
  generalNote?: string;
  sketchNote?: string;
  sketch?: { path: string; publicUrl: string } | null;
}

interface PhotoEntry {
  id: string;
  publicUrl: string;
  label: "before" | "after" | "progress";
  uploadedBy: string;
  uploadedAt: string;
  status: "pending" | "approved" | "rejected";
  caption?: string;
}

interface WorkEntry {
  id: string;
  directoryId: string;
  employeeName: string;
  date: string;
  hours: number;
}

interface InspectorJob extends JobWmJob {
  endDate: string;
  workEntries: WorkEntry[];
  photos: PhotoEntry[];
  workerReports?: WorkerJobReport[];
  jobFiles?: JobFileAttachment[];
  activityLog?: JobActivity[];
  housingType?: HousingType | "";
  stoveType?: StoveType | "";
  gasFurnaceStatus?: GasFurnaceStatus | "";
}

function normalizeJob(raw: InspectorJob): InspectorJob {
  return normalizeJobMetaFields(normalizeJobWmFields(syncJobDocuments({
    ...raw,
    photos: raw.photos || [],
    workerReports: raw.workerReports || [],
    workEntries: raw.workEntries || [],
    jobFiles: raw.jobFiles || [],
    activityLog: raw.activityLog || [],
  })));
}

export function InspectorPanel({
  session,
  onLogout,
}: {
  session: AdminSession;
  onLogout: () => void;
}) {
  const inspectorId = session.id;
  const displayName = session.displayName;
  const [jobsAll, setJobsAll] = useState<InspectorJob[]>([]);
  const [directory, setDirectory] = useState<DirectoryEmployee[]>([]);
  const [recoverableCharges, setRecoverableCharges] = useState<RecoverableCharge[]>([]);
  const [operationalNotes, setOperationalNotes] = useState<OperationalNote[]>([]);
  const [operationalNotesReadState, setOperationalNotesReadState] = useState<OperationalNoteReadReceipt[]>([]);
  const [operationalNotesAuditLog, setOperationalNotesAuditLog] = useState<OperationalNoteAuditEntry[]>([]);
  const [deliveryPackagePublications, setDeliveryPackagePublications] = useState<DeliveryPackagePublication[]>([]);
  const [packageDownloadBusy, setPackageDownloadBusy] = useState(false);
  const [operationalNotesOpen, setOperationalNotesOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<InspectorMainTab>("dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncPending, setSyncPending] = useState(false);
  const [pushFailed, setPushFailed] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const pushPendingRef = useRef(0);
  const prevAdminNotesCountRef = useRef<number | null>(null);
  const [notesSeenTick, setNotesSeenTick] = useState(0);
  const [stageSuggestion, setStageSuggestion] = useState<{ jobId: string; stage: JobHandoverStage } | null>(null);
  const jobScrollRef = useRef<HTMLDivElement>(null);
  const jobsRef = useRef(jobsAll);
  jobsRef.current = jobsAll;
  const flushingPhotoQueueRef = useRef(false);
  const lastAppliedJobsJsonRef = useRef<string | null>(null);
  const lastAppliedDirJsonRef = useRef<string | null>(null);
  const lastAppliedChargesJsonRef = useRef<string | null>(null);
  const lastAppliedOpNotesJsonRef = useRef<string | null>(null);
  const lastAppliedDeliveryPubsJsonRef = useRef<string | null>(null);
  const operationalNotesRef = useRef(operationalNotes);
  operationalNotesRef.current = operationalNotes;
  const operationalNotesReadStateRef = useRef(operationalNotesReadState);
  operationalNotesReadStateRef.current = operationalNotesReadState;
  const operationalNotesAuditLogRef = useRef(operationalNotesAuditLog);
  operationalNotesAuditLogRef.current = operationalNotesAuditLog;
  const [previewItem, setPreviewItem] = useState<InspectorFileItem | null>(null);
  const [athPreviewEnabled, setAthPreviewEnabled] = useState(() => loadAppSettingsLocal().athPreviewEnabled);
  const [jobSection, setJobSection] = useState<InspectorJobSection>("wm");
  const [jobReturnNav, setJobReturnNav] = useState<{ tab: InspectorMainTab; label: string } | null>(null);

  const jobsVisible = useMemo(
    () => filterJobsForInspector(jobsAll, inspectorId),
    [jobsAll, inspectorId],
  );

  const visibleJobIds = useMemo(
    () => new Set(jobsVisible.map((j) => j.id)),
    [jobsVisible],
  );

  useEffect(() => {
    syncAppSettingsFromCloud()
      .then((s) => setAthPreviewEnabled(s.athPreviewEnabled))
      .catch(() => {});
  }, []);

  /** Natychmiast pokaż dane z pamięci przeglądarki — zanim skończy się sync z chmurą. */
  useEffect(() => {
    try {
      const cachedJobs = normalizeJobsValue(JSON.parse(localStorage.getItem("kw-jobs") || "[]")).map(normalizeJob) as InspectorJob[];
      if (cachedJobs.length > 0) {
        const json = JSON.stringify(cachedJobs);
        lastAppliedJobsJsonRef.current = json;
        setJobsAll(cachedJobs);
      }
    } catch { /* ignore */ }
    try {
      const cachedDir = JSON.parse(localStorage.getItem("kw-directory") || "[]");
      if (Array.isArray(cachedDir) && cachedDir.length > 0) {
        const json = JSON.stringify(cachedDir);
        lastAppliedDirJsonRef.current = json;
        setDirectory(cachedDir);
      }
    } catch { /* ignore */ }
    try {
      const cachedCharges = normalizeRecoverableCharges(JSON.parse(localStorage.getItem("kw-recoverable-charges") || "[]"));
      if (cachedCharges.length > 0) {
        const json = JSON.stringify(cachedCharges);
        lastAppliedChargesJsonRef.current = json;
        setRecoverableCharges(cachedCharges);
      }
    } catch { /* ignore */ }
    try {
      const cachedOpNotes = normalizeOperationalNotes(JSON.parse(localStorage.getItem(OPERATIONAL_NOTES_KEY) || "[]"));
      if (cachedOpNotes.length > 0) {
        const json = JSON.stringify(cachedOpNotes);
        lastAppliedOpNotesJsonRef.current = json;
        setOperationalNotes(cachedOpNotes);
      }
    } catch { /* ignore */ }
    try {
      const cachedRead = normalizeOperationalNotesReadState(
        JSON.parse(localStorage.getItem(OPERATIONAL_NOTES_READ_STATE_KEY) || "[]"),
      );
      if (cachedRead.length > 0) setOperationalNotesReadState(cachedRead);
    } catch { /* ignore */ }
    try {
      const cachedAudit = normalizeOperationalNotesAuditLog(
        JSON.parse(localStorage.getItem(OPERATIONAL_NOTES_AUDIT_LOG_KEY) || "[]"),
      );
      if (cachedAudit.length > 0) setOperationalNotesAuditLog(cachedAudit);
    } catch { /* ignore */ }
    try {
      const cachedPubs = normalizeDeliveryPackagePublications(
        JSON.parse(localStorage.getItem(DELIVERY_PACKAGE_PUBLICATIONS_KEY) || "[]"),
      );
      if (cachedPubs.length > 0) {
        const json = JSON.stringify(cachedPubs);
        lastAppliedDeliveryPubsJsonRef.current = json;
        setDeliveryPackagePublications(cachedPubs);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const scrollToJobSection = useCallback((id: InspectorJobSection) => {
    setJobSection(id);
    jobScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const directoryContacts = useMemo(
    () => directory.map((d) => ({ name: d.name, phone: d.phone })),
    [directory],
  );

  const persistJobs = useCallback((next: InspectorJob[]) => {
    setJobsAll(next);
    try {
      localStorage.setItem("kw-jobs", JSON.stringify(next));
    } catch { /* ignore */ }
    pushPendingRef.current += 1;
    setSyncPending(true);
    setPushFailed(false);
    pushKeysToCloudSafe(["kw-jobs"], [next])
      .then(() => {
        pushPendingRef.current -= 1;
        if (pushPendingRef.current <= 0) {
          pushPendingRef.current = 0;
          setSyncPending(false);
          setPushFailed(false);
          setLastSyncedAt(new Date());
        }
      })
      .catch(() => {
        pushPendingRef.current -= 1;
        if (pushPendingRef.current <= 0) pushPendingRef.current = 0;
        setSyncPending(true);
        setPushFailed(true);
      });
  }, []);

  const operationalNotesUnread = useMemo(
    () => countUnreadOperationalNotes(operationalNotes, operationalNotesReadState, session, { visibleJobIds }),
    [operationalNotes, operationalNotesReadState, session, visibleJobIds],
  );

  const commitInspectorOperationalNotes = useCallback((
    nextNotes?: OperationalNote[],
    nextAudit?: OperationalNoteAuditEntry[],
    deletedId?: string,
    nextReadState?: OperationalNoteReadReceipt[],
  ) => {
    const notesPayload = nextNotes ?? operationalNotesRef.current;
    const auditPayload = nextAudit ?? operationalNotesAuditLogRef.current;
    const readStatePayload = nextReadState ?? operationalNotesReadStateRef.current;
    if (nextNotes) setOperationalNotes(nextNotes);
    if (nextAudit) setOperationalNotesAuditLog(nextAudit);
    if (nextReadState) setOperationalNotesReadState(nextReadState);
    let deletedIds = getDeletedOperationalNoteIds();
    if (deletedId) deletedIds = addDeletedOperationalNoteId(deletedId);
    pushPendingRef.current += 1;
    setSyncPending(true);
    setPushFailed(false);
    pushOperationalNotesToCloud(notesPayload, deletedIds, readStatePayload, auditPayload)
      .then(() => {
        pushPendingRef.current -= 1;
        if (pushPendingRef.current <= 0) {
          pushPendingRef.current = 0;
          setSyncPending(false);
          setPushFailed(false);
          setLastSyncedAt(new Date());
        }
        try {
          lastAppliedOpNotesJsonRef.current = JSON.stringify(notesPayload);
        } catch { /* ignore */ }
      })
      .catch(() => {
        pushPendingRef.current -= 1;
        if (pushPendingRef.current <= 0) pushPendingRef.current = 0;
        setSyncPending(true);
        setPushFailed(true);
      });
  }, []);

  const updateJob = useCallback((updated: InspectorJob) => {
    const normalized = normalizeJob(updated);
    setJobsAll((prev) => {
      const next = prev.map((j) => (j.id === normalized.id ? normalized : j));
      persistJobs(next);
      return next;
    });
  }, [persistJobs]);

  useEffect(() => {
    if (sessionStorage.getItem("wg-inspector-visit-recorded") === inspectorId) return;
    sessionStorage.setItem("wg-inspector-visit-recorded", inspectorId);
    recordInspectorEvent(inspectorId, displayName, "visit").catch(() => {});
  }, [inspectorId, displayName]);

  useEffect(() => {
    syncAlertsSeenFromCloud().catch(() => {});
  }, []);

  const adminNotesPending = useMemo(
    () => jobsWithAdminNotesNeedingInspector(jobsVisible, getInspectorJobNotesSeenAt(inspectorId)),
    [jobsVisible, inspectorId, notesSeenTick],
  );

  const markAdminNotesSeen = () => {
    markInspectorJobNotesSeen(inspectorId).then(() => setNotesSeenTick((t) => t + 1)).catch(() => {});
  };

  const openJob = useCallback((jobId: string, section?: InspectorJobSection, fromTab?: InspectorMainTab) => {
    const job = jobsAll.find((j) => j.id === jobId);
    if (!job || !isJobVisibleToInspector(job, inspectorId)) {
      toast.error("Brak dostępu do tej roboty.");
      return;
    }
    const tab = fromTab ?? mainTab;
    setJobReturnNav({ tab, label: TAB_RETURN_LABELS[tab] });
    setSelectedId(jobId);
    setMsg("");
    if (section) setJobSection(section);
    else setJobSection("wm");
    if (adminNotesPending.some((j) => j.id === jobId)) markAdminNotesSeen();
  }, [jobsAll, inspectorId, adminNotesPending, mainTab]);

  const closeJob = useCallback(() => {
    if (jobReturnNav) setMainTab(jobReturnNav.tab);
    setSelectedId(null);
    setJobReturnNav(null);
  }, [jobReturnNav]);

  const switchMainTab = useCallback((tab: InspectorMainTab) => {
    setMainTab(tab);
    setSelectedId(null);
    setJobReturnNav(null);
  }, []);

  const renderBottomNav = () => (
    <InspectorBottomNav
      active={mainTab}
      alertCount={dashboardAlertCount}
      onDashboard={() => switchMainTab("dashboard")}
      onJobs={() => switchMainTab("jobs")}
      onGallery={() => switchMainTab("gallery")}
      onFiles={() => switchMainTab("files")}
      onPortfolio={() => switchMainTab("portfolio")}
    />
  );

  const dashboardAlertCount = useMemo(() => {
    const stats = computeInspectorDashboardStats(jobsVisible, adminNotesPending.length);
    const ids = new Set<string>();
    adminNotesPending.forEach((j) => ids.add(j.id));
    stats.fileAlerts.forEach((a) => ids.add(a.job.id));
    stats.docAlerts.forEach((a) => ids.add(a.job.id));
    stats.readyNoDate.forEach((a) => ids.add(a.job.id));
    for (const j of jobsVisible) {
      if (j.status !== "in_progress" || !j.plannedHandoverDate) continue;
      if (plannedHandoverStatus(j.plannedHandoverDate, inferHandoverStage(j)) === "overdue") ids.add(j.id);
    }
    return ids.size;
  }, [jobsVisible, adminNotesPending]);

  useEffect(() => {
    const prev = prevAdminNotesCountRef.current;
    if (prev !== null && adminNotesPending.length > prev && adminNotesPending.length > 0) {
      const first = adminNotesPending[0];
      toast.info(`Odpowiedź od admina (${adminNotesPending.length})`, {
        description: first?.address || "Sprawdź notatki w Odbiorze WM",
        action: {
          label: "Otwórz",
          onClick: () => openJob(first.id, "wm"),
        },
      });
    }
    prevAdminNotesCountRef.current = adminNotesPending.length;
  }, [adminNotesPending, openJob]);

  const markDocFromDashboard = useCallback((jobId: string, doc: DocType) => {
    const job = jobsAll.find((j) => j.id === jobId);
    if (!job) return;
    const next = !job.documents[doc];
    if (!next && isReportSyncedDocLocked(job, doc)) {
      toast.error("Ten dokument jest powiązany z raportem — nie można go cofnąć");
      return;
    }
    updateJob(
      appendJobActivity(
        { ...job, documents: { ...job.documents, [doc]: next } },
        "inspector_document",
        inspectorDocToggleText(doc, next),
        displayName,
      ),
    );
    const label = DOC_LABELS[doc];
    if (doc === "zlecenie" || doc === "kosztorys") {
      toast.success(next ? `Zapisano · ${label} — firma widzi w Robotach` : `Odznaczono · ${label}`);
    } else {
      toast.success(next ? `Zapisano · ${label}` : `Odznaczono · ${label}`);
    }
  }, [jobsAll, updateJob, displayName]);

  const jobInspectorHistory = useCallback((job: InspectorJob, limit = 5): JobActivity[] => {
    return (job.activityLog || []).filter((ev) => isInspectorActivityType(ev.type)).slice(0, limit);
  }, []);

  const refreshFromCloud = useCallback(async (silent = false) => {
    if (!silent) setSyncing(true);
    try {
      const [
        cloudJobs,
        cloudDir,
        cloudJobsDeletedRaw,
        cloudDirDeletedRaw,
        cloudChargesRaw,
        cloudChargesDeletedRaw,
        cloudOpNotesRaw,
        cloudOpNotesDeletedRaw,
        cloudOpReadRaw,
        cloudOpAuditRaw,
        cloudDeliveryPubsRaw,
      ] = await fetchKeysFromCloud([
        "kw-jobs",
        "kw-directory",
        JOBS_DELETED_IDS_KEY,
        DIRECTORY_DELETED_IDS_KEY,
        "kw-recoverable-charges",
        RECOVERABLE_CHARGES_DELETED_IDS_KEY,
        OPERATIONAL_NOTES_KEY,
        OPERATIONAL_NOTES_DELETED_IDS_KEY,
        OPERATIONAL_NOTES_READ_STATE_KEY,
        OPERATIONAL_NOTES_AUDIT_LOG_KEY,
        DELIVERY_PACKAGE_PUBLICATIONS_KEY,
      ]);
      const mergedJobsDeleted = mergeDeletedJobIds(getDeletedJobIds(), normalizeDeletedJobIds(cloudJobsDeletedRaw));
      saveDeletedJobIds(mergedJobsDeleted);
      const mergedDirDeleted = mergeDeletedDirectoryIds(getDeletedDirectoryIds(), normalizeDeletedDirectoryIds(cloudDirDeletedRaw));
      saveDeletedDirectoryIds(mergedDirDeleted);
      let localJobs: InspectorJob[] = [];
      try {
        localJobs = normalizeJobsValue(JSON.parse(localStorage.getItem("kw-jobs") || "[]")) as InspectorJob[];
      } catch { /* ignore */ }
      const merged = mergeJobsById(localJobs, normalizeJobsValue(cloudJobs), mergedJobsDeleted) as InspectorJob[];
      const normalized = merged.map(normalizeJob);
      const nextJobsJson = JSON.stringify(normalized);
      if (lastAppliedJobsJsonRef.current !== nextJobsJson) {
        lastAppliedJobsJsonRef.current = nextJobsJson;
        setJobsAll(normalized);
        try { localStorage.setItem("kw-jobs", nextJobsJson); } catch { /* ignore */ }
      }
      if (cloudDir && Array.isArray(cloudDir)) {
        let localDir: DirectoryEmployee[] = [];
        try {
          localDir = JSON.parse(localStorage.getItem("kw-directory") || "[]");
        } catch { /* ignore */ }
        const mergedDir = mergeDirectory(localDir, cloudDir as DirectoryEmployee[], mergedDirDeleted) as DirectoryEmployee[];
        const nextDirJson = JSON.stringify(mergedDir);
        if (lastAppliedDirJsonRef.current !== nextDirJson) {
          lastAppliedDirJsonRef.current = nextDirJson;
          setDirectory(mergedDir);
          try { localStorage.setItem("kw-directory", nextDirJson); } catch { /* ignore */ }
        }
      } else {
        try {
          setDirectory(JSON.parse(localStorage.getItem("kw-directory") || "[]"));
        } catch { setDirectory([]); }
      }
      const mergedChargesDeleted = mergeDeletedRecoverableChargeIds(
        getDeletedRecoverableChargeIds(),
        normalizeDeletedRecoverableChargeIds(cloudChargesDeletedRaw),
      );
      saveDeletedRecoverableChargeIds(mergedChargesDeleted);
      let localCharges: RecoverableCharge[] = [];
      try {
        localCharges = normalizeRecoverableCharges(JSON.parse(localStorage.getItem("kw-recoverable-charges") || "[]"));
      } catch { /* ignore */ }
      const mergedCharges = mergeRecoverableCharges(
        localCharges,
        normalizeRecoverableCharges(cloudChargesRaw),
        mergedChargesDeleted,
      );
      const nextChargesJson = JSON.stringify(mergedCharges);
      if (lastAppliedChargesJsonRef.current !== nextChargesJson) {
        lastAppliedChargesJsonRef.current = nextChargesJson;
        setRecoverableCharges(mergedCharges);
        try { localStorage.setItem("kw-recoverable-charges", nextChargesJson); } catch { /* ignore */ }
      }
      const mergedOpNotesDeleted = mergeDeletedOperationalNoteIds(
        getDeletedOperationalNoteIds(),
        normalizeDeletedOperationalNoteIds(cloudOpNotesDeletedRaw),
      );
      saveDeletedOperationalNoteIds(mergedOpNotesDeleted);
      let localOpNotes: OperationalNote[] = [];
      try {
        localOpNotes = normalizeOperationalNotes(JSON.parse(localStorage.getItem(OPERATIONAL_NOTES_KEY) || "[]"));
      } catch { /* ignore */ }
      const mergedOpNotes = mergeOperationalNotes(localOpNotes, cloudOpNotesRaw, mergedOpNotesDeleted);
      const nextOpNotesJson = JSON.stringify(mergedOpNotes);
      if (lastAppliedOpNotesJsonRef.current !== nextOpNotesJson) {
        lastAppliedOpNotesJsonRef.current = nextOpNotesJson;
        setOperationalNotes(mergedOpNotes);
        try { localStorage.setItem(OPERATIONAL_NOTES_KEY, nextOpNotesJson); } catch { /* ignore */ }
      }
      let localOpRead: OperationalNoteReadReceipt[] = [];
      try {
        localOpRead = normalizeOperationalNotesReadState(
          JSON.parse(localStorage.getItem(OPERATIONAL_NOTES_READ_STATE_KEY) || "[]"),
        );
      } catch { /* ignore */ }
      const mergedOpRead = mergeOperationalNotesReadState(localOpRead, cloudOpReadRaw);
      setOperationalNotesReadState(mergedOpRead);
      try { localStorage.setItem(OPERATIONAL_NOTES_READ_STATE_KEY, JSON.stringify(mergedOpRead)); } catch { /* ignore */ }
      let localOpAudit: OperationalNoteAuditEntry[] = [];
      try {
        localOpAudit = normalizeOperationalNotesAuditLog(
          JSON.parse(localStorage.getItem(OPERATIONAL_NOTES_AUDIT_LOG_KEY) || "[]"),
        );
      } catch { /* ignore */ }
      const mergedOpAudit = mergeOperationalNotesAuditLog(localOpAudit, cloudOpAuditRaw);
      setOperationalNotesAuditLog(mergedOpAudit);
      try { localStorage.setItem(OPERATIONAL_NOTES_AUDIT_LOG_KEY, JSON.stringify(mergedOpAudit)); } catch { /* ignore */ }
      let localDeliveryPubs: DeliveryPackagePublication[] = [];
      try {
        localDeliveryPubs = normalizeDeliveryPackagePublications(
          JSON.parse(localStorage.getItem(DELIVERY_PACKAGE_PUBLICATIONS_KEY) || "[]"),
        );
      } catch { /* ignore */ }
      const mergedDeliveryPubs = mergeDeliveryPackagePublications(
        localDeliveryPubs,
        normalizeDeliveryPackagePublications(cloudDeliveryPubsRaw),
      );
      const nextDeliveryPubsJson = JSON.stringify(mergedDeliveryPubs);
      if (lastAppliedDeliveryPubsJsonRef.current !== nextDeliveryPubsJson) {
        lastAppliedDeliveryPubsJsonRef.current = nextDeliveryPubsJson;
        setDeliveryPackagePublications(mergedDeliveryPubs);
        try { localStorage.setItem(DELIVERY_PACKAGE_PUBLICATIONS_KEY, nextDeliveryPubsJson); } catch { /* ignore */ }
      }
      setLastSyncedAt(new Date());
      setPushFailed(false);
      if (pushPendingRef.current <= 0) setSyncPending(false);
      const [cloudAdminUsers] = await fetchKeysFromCloud([ADMIN_USERS_CONFIG_KEY]);
      const mergedAdminUsers = mergeAdminUsersConfig(loadAdminUsersConfig(), cloudAdminUsers);
      try { localStorage.setItem(ADMIN_USERS_CONFIG_KEY, JSON.stringify(mergedAdminUsers)); } catch { /* ignore */ }
    } catch {
      try {
        setJobsAll(normalizeJobsValue(JSON.parse(localStorage.getItem("kw-jobs") || "[]")).map(normalizeJob));
        setDirectory(JSON.parse(localStorage.getItem("kw-directory") || "[]"));
        setRecoverableCharges(normalizeRecoverableCharges(JSON.parse(localStorage.getItem("kw-recoverable-charges") || "[]")));
        setOperationalNotes(normalizeOperationalNotes(JSON.parse(localStorage.getItem(OPERATIONAL_NOTES_KEY) || "[]")));
        setOperationalNotesReadState(normalizeOperationalNotesReadState(
          JSON.parse(localStorage.getItem(OPERATIONAL_NOTES_READ_STATE_KEY) || "[]"),
        ));
        setOperationalNotesAuditLog(normalizeOperationalNotesAuditLog(
          JSON.parse(localStorage.getItem(OPERATIONAL_NOTES_AUDIT_LOG_KEY) || "[]"),
        ));
        setDeliveryPackagePublications(normalizeDeliveryPackagePublications(
          JSON.parse(localStorage.getItem(DELIVERY_PACKAGE_PUBLICATIONS_KEY) || "[]"),
        ));
      } catch { /* ignore */ }
      if (!silent) setMsg("Nie udało się odświeżyć danych");
    } finally {
      if (!silent) setSyncing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFromCloud(true);
  }, [refreshFromCloud]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.newValue == null) return;
      if (e.key === "kw-jobs") {
        try {
          const parsed = normalizeJobsValue(JSON.parse(e.newValue)).map(normalizeJob) as InspectorJob[];
          const json = JSON.stringify(parsed);
          if (lastAppliedJobsJsonRef.current !== json) {
            lastAppliedJobsJsonRef.current = json;
            setJobsAll(parsed);
          }
        } catch { /* ignore */ }
      } else if (e.key === "kw-directory") {
        try {
          const parsed = JSON.parse(e.newValue) as DirectoryEmployee[];
          const json = JSON.stringify(parsed);
          if (lastAppliedDirJsonRef.current !== json) {
            lastAppliedDirJsonRef.current = json;
            setDirectory(parsed);
          }
        } catch { /* ignore */ }
      } else if (e.key === "kw-recoverable-charges") {
        try {
          const parsed = normalizeRecoverableCharges(JSON.parse(e.newValue));
          const json = JSON.stringify(parsed);
          if (lastAppliedChargesJsonRef.current !== json) {
            lastAppliedChargesJsonRef.current = json;
            setRecoverableCharges(parsed);
          }
        } catch { /* ignore */ }
      } else if (e.key === DELIVERY_PACKAGE_PUBLICATIONS_KEY) {
        try {
          const parsed = normalizeDeliveryPackagePublications(JSON.parse(e.newValue));
          const json = JSON.stringify(parsed);
          if (lastAppliedDeliveryPubsJsonRef.current !== json) {
            lastAppliedDeliveryPubsJsonRef.current = json;
            setDeliveryPackagePublications(parsed);
          }
        } catch { /* ignore */ }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") refreshFromCloud(true);
    };
    const onFocus = () => { refreshFromCloud(true); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshFromCloud]);

  useEffect(() => {
    if (document.visibilityState !== "visible") return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshFromCloud(true);
    }, 120_000);
    return () => window.clearInterval(id);
  }, [refreshFromCloud]);

  const recoverableStatsByJobId = useMemo(() => {
    const map = new Map<string, RecoverableChargeJobStats>();
    for (const job of jobsVisible) {
      const stats = getRecoverableChargeJobStats(recoverableCharges, job.id);
      if (stats.chargeCount > 0 || stats.recoveredCount > 0) {
        map.set(job.id, stats);
      }
    }
    return map;
  }, [jobsVisible, recoverableCharges]);

  const jobsById = useMemo(
    () => new Map(jobsVisible.map((j) => [j.id, { id: j.id, address: j.address, flatNumber: j.flatNumber, client: j.client }])),
    [jobsVisible],
  );

  const selectedJob = jobsVisible.find((j) => j.id === selectedId) || null;

  const deliveryPackageStatus = useMemo(
    () =>
      selectedJob
        ? inspectorDeliveryPackageStatusDisplay(deliveryPackagePublications, selectedJob.id)
        : null,
    [selectedJob, deliveryPackagePublications],
  );

  const handlePackageDownload = useCallback(async () => {
    if (!selectedJob) return;
    const publication = inspectorDeliveryPackageForJob(deliveryPackagePublications, selectedJob.id);
    if (!publication) {
      document.getElementById(INSPECTOR_DELIVERY_PACKAGE_PANEL_ID)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
    setPackageDownloadBusy(true);
    const res = await downloadPublishedDeliveryPackageZip(publication);
    setPackageDownloadBusy(false);
    if (res.ok) {
      toast.success(`Pobrano: ${publication.fileName}`);
    } else {
      toast.error(res.error);
    }
  }, [selectedJob, deliveryPackagePublications]);

  const handleHandoverQuickAction = useCallback(
    (id: InspectorHandoverQuickActionId) => {
      if (id === "download_package") {
        void handlePackageDownload();
        return;
      }
      if (id === "checklist") {
        scrollToJobSection("docs");
        return;
      }
      if (id === "photos") {
        scrollToJobSection("photos");
      }
    },
    [handlePackageDownload, scrollToJobSection],
  );

  const handleAddBillingNote = useCallback(async (chargeId: string, text: string, files?: BillingNotePendingFiles) => {
    const job = jobsRef.current.find((j) => j.id === selectedId);
    if (!job) throw new Error("Brak roboty");
    const charge = recoverableCharges.find((c) => c.id === chargeId);
    const title = charge?.title.trim() || (charge ? recoverableChargeDescriptionLine(charge) : "Pozycja");

    const attachments: JobNoteAttachment[] = [];
    if (files) {
      for (const img of files.images) {
        const { attachment, error } = await uploadBillingEvidence(job.id, chargeId, img, displayName);
        if (error || !attachment) {
          setMsg(error || "Błąd wgrywania zdjęcia");
          throw new Error(error || "upload failed");
        }
        attachments.push(attachment);
      }
      if (files.pdf) {
        const { attachment, error } = await uploadBillingEvidence(job.id, chargeId, files.pdf, displayName);
        if (error || !attachment) {
          setMsg(error || "Błąd wgrywania PDF");
          throw new Error(error || "upload failed");
        }
        attachments.push(attachment);
      }
    }

    const note = buildBillingJobNote({
      chargeId,
      text,
      author: displayName,
      authorRole: "inspector",
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    updateJob(appendBillingJobNote(job, note, title));
    setMsg("Uwaga wysłana do administratora");
  }, [displayName, recoverableCharges, selectedId, updateJob]);

  const handleSubmitBillingProposal = useCallback(async (payload: {
    title: string;
    description: string;
    amount: number;
    files?: BillingNotePendingFiles;
  }) => {
    const job = jobsRef.current.find((j) => j.id === selectedId);
    if (!job) throw new Error("Brak roboty");
    const proposalId = crypto.randomUUID();

    const attachments: JobNoteAttachment[] = [];
    if (payload.files) {
      for (const img of payload.files.images) {
        const { attachment, error } = await uploadBillingProposalEvidence(job.id, proposalId, img, displayName);
        if (error || !attachment) {
          setMsg(error || "Błąd wgrywania zdjęcia");
          throw new Error(error || "upload failed");
        }
        attachments.push(attachment);
      }
      if (payload.files.pdf) {
        const { attachment, error } = await uploadBillingProposalEvidence(job.id, proposalId, payload.files.pdf, displayName);
        if (error || !attachment) {
          setMsg(error || "Błąd wgrywania PDF");
          throw new Error(error || "upload failed");
        }
        attachments.push(attachment);
      }
    }

    const note = buildBillingProposalNote({
      id: proposalId,
      jobId: job.id,
      text: payload.description,
      title: payload.title,
      amount: payload.amount,
      author: displayName,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    updateJob(appendBillingProposalNote(job, note));
    setMsg("Zgłoszenie wysłane do administratora");
  }, [displayName, selectedId, updateJob]);

  const flushInspectorPhotoQueue = useCallback(async () => {
    if (!navigator.onLine || flushingPhotoQueueRef.current) return;
    flushingPhotoQueueRef.current = true;
    try {
      const items = await listQueuedPhotos("inspector");
      for (const item of items) {
        const job = jobsRef.current.find((j) => j.id === item.jobId);
        if (!job || !isJobVisibleToInspector(job, inspectorId)) {
          await removeQueuedPhoto(item.id);
          continue;
        }
        const file = new File([item.blob], item.filename, { type: item.blob.type || "image/jpeg" });
        const { entry, error } = await uploadInspectorPhoto(
          job.id,
          file,
          item.uploadedBy,
          item.caption,
          item.label as InspectorPhotoLabel,
        );
        if (entry) {
          updateJob(
            appendJobActivity(
              { ...job, inspectorPhotos: [entry, ...(job.inspectorPhotos || [])] },
              "inspector_photo",
              `Zdjęcie inspektora (${item.label})${entry.caption ? `: ${entry.caption}` : ""} — z kolejki offline`,
              item.uploadedBy,
            ),
          );
          await removeQueuedPhoto(item.id);
        } else if (error?.toLowerCase().includes("internet") || error?.toLowerCase().includes("połączenia")) {
          break;
        }
      }
    } finally {
      flushingPhotoQueueRef.current = false;
    }
  }, [updateJob, inspectorId]);

  const uploadInspectorPhotoForJob = useCallback(async (
    jobId: string,
    file: File,
    label: InspectorPhotoLabel,
    caption = "",
  ): Promise<boolean> => {
    const job = jobsRef.current.find((j) => j.id === jobId);
    if (!job || !isJobVisibleToInspector(job, inspectorId)) return false;
    const { entry, error } = await uploadInspectorPhoto(job.id, file, displayName, caption, label);
    if (!entry) {
      try {
        await queuePhoto({
          kind: "inspector",
          jobId: job.id,
          label,
          caption,
          uploadedBy: displayName,
          blob: file,
          filename: file.name,
        });
        setMsg("Brak sieci — zdjęcie zapisane lokalnie, wyśle się po powrocie sieci.");
        return true;
      } catch {
        setMsg(error || "Nie udało się wgrać zdjęcia");
        return false;
      }
    }
    updateJob(
      appendJobActivity(
        { ...job, inspectorPhotos: [entry, ...(job.inspectorPhotos || [])] },
        "inspector_photo",
        `Zdjęcie inspektora (${label})${entry.caption ? `: ${entry.caption}` : ""}`,
        displayName,
      ),
    );
    return true;
  }, [displayName, updateJob, inspectorId]);

  const handleInspectorPhotoUpload = useCallback(async (file: File, label: InspectorPhotoLabel, caption: string) => {
    if (!selectedJob) return false;
    return uploadInspectorPhotoForJob(selectedJob.id, file, label, caption);
  }, [selectedJob, uploadInspectorPhotoForJob]);

  const handleQuickPhotoUpload = useCallback(async (jobId: string, file: File, label: InspectorPhotoLabel) => {
    const ok = await uploadInspectorPhotoForJob(jobId, file, label);
    if (ok) toast.success("Zdjęcie wgrane");
    return ok;
  }, [uploadInspectorPhotoForJob]);

  useEffect(() => {
    const onOnline = () => { void flushInspectorPhotoQueue(); };
    window.addEventListener("online", onOnline);
    if (navigator.onLine) void flushInspectorPhotoQueue();
    return () => window.removeEventListener("online", onOnline);
  }, [flushInspectorPhotoQueue]);

  useEffect(() => {
    return onNativeAppResume(() => { void flushInspectorPhotoQueue(); });
  }, [flushInspectorPhotoQueue]);

  useEffect(() => {
    if (!selectedId) return;
    return registerNativeBackHandler(() => {
      closeJob();
      return true;
    });
  }, [selectedId, closeJob]);

  const pullRefresh = useCallback(() => refreshFromCloud(false), [refreshFromCloud]);

  const retryCloudPush = useCallback(() => {
    pushPendingRef.current = 1;
    setSyncPending(true);
    setPushFailed(false);
    pushKeysToCloudSafe(["kw-jobs"], [jobsRef.current])
      .then(() => {
        pushPendingRef.current = 0;
        setSyncPending(false);
        setPushFailed(false);
        setLastSyncedAt(new Date());
      })
      .catch(() => {
        pushPendingRef.current = 0;
        setSyncPending(true);
        setPushFailed(true);
      });
  }, []);

  const inspectorCloudStatus = syncing || syncPending ? "saving" : pushFailed ? "error" : lastSyncedAt ? "saved" : "idle";

  const handleCloudSyncClick = useCallback(() => {
    if (pushFailed) retryCloudPush();
    else if (!syncing) refreshFromCloud(false);
  }, [pushFailed, syncing, retryCloudPush, refreshFromCloud]);

  const cloudSyncTitle = syncing || syncPending
    ? "Zapisywanie do chmury…"
    : pushFailed
      ? "Błąd zapisu — dotknij, aby ponowić"
      : lastSyncedAt
        ? `Zsynchronizowano · ${lastSyncedAt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`
        : "Synchronizacja z chmurą";

  const jobPull = usePullToRefresh(jobScrollRef, pullRefresh, Boolean(selectedId));

  const jobSectionBadges = useMemo((): Partial<Record<InspectorJobSection, number>> => {
    if (!selectedJob) return {};
    const badges: Partial<Record<InspectorJobSection, number>> = {};
    if (adminNotesPending.some((j) => j.id === selectedJob.id)) badges.wm = 1;
    const rcStats = recoverableStatsByJobId.get(selectedJob.id);
    if (rcStats && rcStats.unsettledCount > 0) {
      badges.wm = (badges.wm ?? 0) + rcStats.unsettledCount;
    }
    const missingFiles = (!selectedJob.documents.zlecenie ? 1 : 0) + (!selectedJob.documents.kosztorys ? 1 : 0);
    if (missingFiles) badges.files = missingFiles;
    const missingDocs = REQUIRED_DOCS.filter((d) => !selectedJob.documents[d]).length;
    if (missingDocs) badges.docs = missingDocs;
    const reportCount = (selectedJob.workerReports || []).length;
    if (reportCount) badges.reports = reportCount;
    const photoCount = (selectedJob.photos || []).filter((p) => p.status === "approved").length;
    if (photoCount) badges.photos = photoCount;
    return badges;
  }, [selectedJob, adminNotesPending, recoverableStatsByJobId]);

  const jobQuickActions = useMemo(() => {
    if (!selectedJob) return [];
    const out: { section: InspectorJobSection; label: string; icon: typeof MessageSquare }[] = [];
    if (adminNotesPending.some((j) => j.id === selectedJob.id)) {
      out.push({ section: "wm", label: "Odpowiedź admina", icon: MessageSquare });
    }
    if (!selectedJob.documents.zlecenie) {
      out.push({ section: "files", label: "Brak zlecenia — oznacz Jest", icon: FileText });
    }
    if (!selectedJob.documents.kosztorys) {
      out.push({ section: "files", label: "Brak kosztorysu — oznacz Jest", icon: FileCheck });
    }
    const missingDocs = REQUIRED_DOCS.filter((d) => !selectedJob.documents[d]).length;
    if (missingDocs > 0) {
      out.push({ section: "docs", label: `Brakuje ${missingDocs} dok.`, icon: ClipboardList });
    }
    return out.slice(0, 3);
  }, [selectedJob, adminNotesPending]);

  const toggleDoc = (job: InspectorJob, doc: DocType) => {
    const next = !job.documents[doc];
    if (!next && isReportSyncedDocLocked(job, doc)) return;
    updateJob(
      appendJobActivity(
        { ...job, documents: { ...job.documents, [doc]: next } },
        "inspector_document",
        inspectorDocToggleText(doc, next),
        displayName,
      ),
    );
  };

  const handleFileUpload = async (job: InspectorJob, kind: JobFileAttachment["kind"], file: File) => {
    setUploadBusy(kind);
    setMsg("");
    const previousFile = (job.jobFiles || []).find((f) => f.kind === kind);
    const { attachment, error } = await uploadJobFile(job.id, file, kind, displayName);
    if (!attachment) {
      setMsg(error || "Nie udało się wgrać pliku");
      setUploadBusy(null);
      return;
    }
    const docKey = kind as DocType;
    const next = applyJobFileKindUpload(
      {
        ...job,
        documents: { ...job.documents, [docKey]: true },
      },
      kind,
      attachment,
      { deletedBy: displayName, previousFile },
    );
    updateJob(
      appendJobActivity(
        next,
        "inspector_file",
        inspectorFileUploadText(kind, file.name),
        displayName,
      ),
    );
    if (previousFile) {
      const oldPath = resolveJobFileStoragePath(previousFile);
      if (oldPath) void deleteJobFile(oldPath).catch(() => {});
    }
    setMsg(kind === "zlecenie" ? "Zlecenie wgrane" : "Kosztorys wgrany");
    if (kind === "zlecenie" && inferHandoverStage(job) === "awaiting_order") {
      setStageSuggestion({ jobId: job.id, stage: "in_progress" });
    }
    setUploadBusy(null);
  };

  const commandPrimaryLine = selectedJob
    ? `${selectedJob.address || "Bez adresu"}${selectedJob.flatNumber ? ` m.${selectedJob.flatNumber}` : ""}`
    : displayName;
  const commandSecondaryLine = selectedJob
    ? (selectedJob.client || displayName)
    : "Inspektor WM · W&G DOM";

  return (
    <div className="relative h-[100dvh]">
      <InspectorShell
        jobDetailOpen={Boolean(selectedJob)}
        commandLayer={
          <InspectorCommandLayer
            primaryLine={commandPrimaryLine}
            secondaryLine={commandSecondaryLine}
            activeTabLabel={selectedJob ? undefined : INSPECTOR_MAIN_TAB_LABELS[mainTab]}
            syncing={syncing}
            syncPending={syncPending}
            pushFailed={pushFailed}
            lastSyncedAt={lastSyncedAt}
            cloudStatus={inspectorCloudStatus}
            cloudSyncTitle={cloudSyncTitle}
            onCloudSyncClick={handleCloudSyncClick}
            onRefreshFromCloud={() => refreshFromCloud(false)}
            operationalNotesUnread={operationalNotesUnread}
            onOpenNotes={() => setOperationalNotesOpen(true)}
            onOpenHelp={() => setHelpOpen(true)}
            onLogout={onLogout}
          />
        }
        sidebar={
          <InspectorSidebar
            active={mainTab}
            dashboardAlertCount={dashboardAlertCount}
            onSelect={switchMainTab}
          />
        }
        beforeWorkspace={
          <>
            <InspectorHelpBanner onOpenHelp={() => setHelpOpen(true)} />
            <InspectorHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
            <div className="px-4 shrink-0">
              <PwaInstallBanner compact dismissKey="wg-pwa-inspector-dismiss" persist="local" className="mb-0 mt-2" />
            </div>
            {adminNotesPending.length > 0 && !selectedJob && (
              <div className="mx-4 mt-2 mb-1 bg-violet-500/10 border border-violet-500/25 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                    <MessageSquare size={14} /> Odpowiedź od admina ({adminNotesPending.length})
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {adminNotesPending.slice(0, 2).map((j) => j.address || "Bez adresu").join(" · ")}
                    {adminNotesPending.length > 2 ? "…" : ""}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openJob(adminNotesPending[0].id, "wm")}
                    className="px-3 py-2.5 min-h-[44px] rounded-lg bg-violet-600 text-white text-xs font-medium touch-manipulation"
                  >
                    Otwórz
                  </button>
                  <button
                    type="button"
                    onClick={markAdminNotesSeen}
                    className="px-3 py-2.5 min-h-[44px] rounded-lg bg-secondary text-xs text-muted-foreground touch-manipulation"
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </>
        }
        bottomNav={renderBottomNav()}
      >
      {selectedJob ? (
        <InspectorJobWorkspace
          job={selectedJob}
          jobSection={jobSection}
          jobReturnLabel={jobReturnNav?.label ?? "listy robót"}
          displayName={displayName}
          msg={msg}
          onClose={closeJob}
          onJobSectionChange={scrollToJobSection}
          jobSectionBadges={jobSectionBadges}
          jobQuickActions={jobQuickActions}
          deliveryPackageReady={deliveryPackageStatus?.ready ?? null}
          deliveryPackagePublications={deliveryPackagePublications}
          packageDownloadBusy={packageDownloadBusy}
          onHandoverQuickAction={handleHandoverQuickAction}
          onPackageDownload={handlePackageDownload}
          updateJob={updateJob}
          recoverableCharges={recoverableCharges}
          directoryContacts={directoryContacts}
          directory={directory}
          jobsById={jobsById}
          athPreviewEnabled={athPreviewEnabled}
          uploadBusy={uploadBusy}
          onToggleDoc={toggleDoc}
          onFileUpload={handleFileUpload}
          onStatusMessage={setMsg}
          onPreview={setPreviewItem}
          onLightbox={(url, label) => setLightbox({ url, label })}
          onInspectorPhotoUpload={handleInspectorPhotoUpload}
          onAddBillingNote={handleAddBillingNote}
          onSubmitBillingProposal={handleSubmitBillingProposal}
          jobInspectorHistory={jobInspectorHistory}
          stageSuggestion={stageSuggestion}
          onStageSuggestionChange={setStageSuggestion}
          scrollRef={jobScrollRef}
          pull={jobPull}
        />
) : (
        <InspectorViewRouter
          tab={mainTab}
          loading={loading}
          jobs={jobsVisible}
          displayName={displayName}
          adminNotesPending={adminNotesPending}
          recoverableCharges={recoverableCharges}
          athPreviewEnabled={athPreviewEnabled}
          onPullRefresh={pullRefresh}
          onOpenJob={openJob}
          onMarkDoc={markDocFromDashboard}
        />
      )}

      </InspectorShell>

      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button type="button" className="absolute top-4 right-4 p-2 text-white" style={{ top: "max(1rem, env(safe-area-inset-top))" }} onClick={() => setLightbox(null)}>
            <X size={24}/>
          </button>
          <p className="text-white text-sm mb-3">{lightbox.label}</p>
          <JobPhotoImg src={lightbox.url} alt={lightbox.label} className="max-w-full max-h-[85dvh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()}/>
        </div>
      )}

      {previewItem && (
        <JobFilePreviewModal
          item={previewItem}
          athPreviewEnabled={athPreviewEnabled}
          onClose={() => setPreviewItem(null)}
        />
      )}

      {!selectedJob && (
        <InspectorQuickPhotoFab
          jobs={jobsVisible}
          onUpload={handleQuickPhotoUpload}
          disabled={loading || syncing}
        />
      )}

      <Toaster
        position="top-center"
        richColors
        closeButton
        duration={4000}
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 4.25rem)" }}
      />

      {operationalNotesOpen && (
        <div
          className="absolute inset-0 z-40 flex flex-col bg-background"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <Suspense fallback={<div className="flex-1 flex items-center justify-center"><p className="text-sm text-muted-foreground">Ładowanie notatek…</p></div>}>
            <OperationalNotesView
              variant="inspector"
              notes={operationalNotes}
              jobs={jobsVisible}
              session={session}
              auditLog={operationalNotesAuditLog}
              readState={operationalNotesReadState}
              onChangeReadState={setOperationalNotesReadState}
              onChangeNotes={setOperationalNotes}
              onChangeAuditLog={setOperationalNotesAuditLog}
              onCommit={commitInspectorOperationalNotes}
              returnNav={{
                label: "inspektora",
                onBack: () => setOperationalNotesOpen(false),
              }}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}
