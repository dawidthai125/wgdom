import { useState, useEffect, useCallback, useRef, type Dispatch, type SetStateAction } from "react";
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
import {
  mergeOperationalNotes,
  normalizeOperationalNotes,
  type OperationalNote,
} from "@/lib/operational-notes";
import type { OperationalNoteAuditEntry } from "@/lib/operational-notes-audit";
import { mergeOperationalNotesAuditLog, normalizeOperationalNotesAuditLog } from "@/lib/operational-notes-audit";
import {
  mergeOperationalNotesReadState,
  normalizeOperationalNotesReadState,
  type OperationalNoteReadReceipt,
} from "@/lib/operational-notes-read-state";
import type { RecoverableCharge } from "@/lib/recoverable-charges";
import {
  mergeRecoverableCharges,
  normalizeRecoverableCharges,
} from "@/lib/recoverable-charges";
import type { JobFileAttachment } from "@/lib/job-documents";
import { syncJobDocuments } from "@/lib/job-documents";
import { normalizeJobWmFields, type JobWmJob } from "@/lib/job-wm";
import type { JobActivity } from "@/lib/job-activity";
import { normalizeJobMetaFields, type HousingType, type StoveType, type GasFurnaceStatus } from "@/lib/job-meta";
import { mergeAdminUsersConfig, loadAdminUsersConfig } from "@/lib/admin-auth";
import {
  DELIVERY_PACKAGE_PUBLICATIONS_KEY,
  type DeliveryPackagePublication,
} from "@/lib/delivery-package-publications/types";
import { mergeDeliveryPackagePublications } from "@/lib/delivery-package-publications/merge";
import { normalizeDeliveryPackagePublications } from "@/lib/delivery-package-publications/normalize";

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

export interface InspectorJob extends JobWmJob {
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

export type InspectorCloudStatus = "idle" | "saving" | "saved" | "error";

export type UseInspectorDataSyncOptions = {
  onRefreshError?: (message: string) => void;
};

export type UseInspectorDataSyncResult = {
  jobsAll: InspectorJob[];
  directory: DirectoryEmployee[];
  recoverableCharges: RecoverableCharge[];
  operationalNotes: OperationalNote[];
  operationalNotesReadState: OperationalNoteReadReceipt[];
  operationalNotesAuditLog: OperationalNoteAuditEntry[];
  deliveryPackagePublications: DeliveryPackagePublication[];
  loading: boolean;
  syncing: boolean;
  syncPending: boolean;
  pushFailed: boolean;
  lastSyncedAt: Date | null;
  cloudStatus: InspectorCloudStatus;
  cloudSyncTitle: string;
  updateJob: (updated: InspectorJob) => void;
  commitOperationalNotes: (
    nextNotes?: OperationalNote[],
    nextAudit?: OperationalNoteAuditEntry[],
    deletedId?: string,
    nextReadState?: OperationalNoteReadReceipt[],
  ) => void;
  setOperationalNotes: Dispatch<SetStateAction<OperationalNote[]>>;
  setOperationalNotesReadState: Dispatch<SetStateAction<OperationalNoteReadReceipt[]>>;
  setOperationalNotesAuditLog: Dispatch<SetStateAction<OperationalNoteAuditEntry[]>>;
  refreshFromCloud: (silent?: boolean) => Promise<void>;
  pullRefresh: () => void;
  handleCloudSyncClick: () => void;
};

export function useInspectorDataSync(
  options?: UseInspectorDataSyncOptions,
): UseInspectorDataSyncResult {
  const onRefreshErrorRef = useRef(options?.onRefreshError);
  onRefreshErrorRef.current = options?.onRefreshError;

  const [jobsAll, setJobsAll] = useState<InspectorJob[]>([]);
  const [directory, setDirectory] = useState<DirectoryEmployee[]>([]);
  const [recoverableCharges, setRecoverableCharges] = useState<RecoverableCharge[]>([]);
  const [operationalNotes, setOperationalNotes] = useState<OperationalNote[]>([]);
  const [operationalNotesReadState, setOperationalNotesReadState] = useState<OperationalNoteReadReceipt[]>([]);
  const [operationalNotesAuditLog, setOperationalNotesAuditLog] = useState<OperationalNoteAuditEntry[]>([]);
  const [deliveryPackagePublications, setDeliveryPackagePublications] = useState<DeliveryPackagePublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncPending, setSyncPending] = useState(false);
  const [pushFailed, setPushFailed] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const pushPendingRef = useRef(0);
  const jobsRef = useRef(jobsAll);
  jobsRef.current = jobsAll;
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

  const commitOperationalNotes = useCallback((
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
      if (!silent) onRefreshErrorRef.current?.("Nie udało się odświeżyć danych");
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

  const cloudStatus: InspectorCloudStatus = syncing || syncPending ? "saving" : pushFailed ? "error" : lastSyncedAt ? "saved" : "idle";

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

  return {
    jobsAll,
    directory,
    recoverableCharges,
    operationalNotes,
    operationalNotesReadState,
    operationalNotesAuditLog,
    deliveryPackagePublications,
    loading,
    syncing,
    syncPending,
    pushFailed,
    lastSyncedAt,
    cloudStatus,
    cloudSyncTitle,
    updateJob,
    commitOperationalNotes,
    setOperationalNotes,
    setOperationalNotesReadState,
    setOperationalNotesAuditLog,
    refreshFromCloud,
    pullRefresh,
    handleCloudSyncClick,
  };
}
