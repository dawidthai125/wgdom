import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";
import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import {
  MapPin, LogOut, Search, ArrowLeft, FileText, ClipboardList, Ruler,
  CheckCircle2, Circle, ImagePlus, Phone, Users,
  ChevronDown, ChevronUp, Camera, X, FileCheck, AlertCircle, BookOpen, RefreshCw, MessageSquare, ScrollText,
  Cloud, CloudOff, Eye,
} from "lucide-react";
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
} from "@/lib/cloud-sync";
import {
  DOCUMENT_TYPES,
  DOC_LABELS,
  REQUIRED_DOCS,
  type DocType,
  type JobFileAttachment,
  latestJobFile,
  syncJobDocuments,
  isReportSyncedDocLocked,
} from "@/lib/job-documents";
import { InspectorJobFileUpload } from "@/app/InspectorJobFileUpload";
import { InspectorDashboard } from "@/app/InspectorDashboard";
import { InspectorPhotoGallery } from "@/app/InspectorPhotoGallery";
import { uploadJobFile } from "@/lib/job-file-upload";
import { uploadInspectorPhoto } from "@/lib/job-photo-upload";
import { computeInspectorDashboardStats } from "@/lib/inspector-dashboard";
import {
  inferHandoverStage,
  plannedHandoverStatus,
  normalizeJobWmFields,
  jobsWithAdminNotesNeedingInspector,
  applyHandoverStageToJob,
  HANDOVER_STAGE_LABELS,
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
import { InspectorHelpBanner, InspectorHelpModal, InspectorHint } from "@/app/InspectorHelp";
import { JobMetaPickers, JobMetaBadges } from "@/app/JobMetaPickers";
import { normalizeJobMetaFields, type HousingType, type StoveType } from "@/lib/job-meta";
import { WmPortfolioView } from "@/app/WmPortfolioView";
import { JobWmPanel, JobWmStageBadge, JobWmPlannedBadge } from "@/app/JobWmPanel";
import { WorkScopeDisplay } from "@/app/WorkScopeEditor";
import { AuthorAttribution } from "@/app/AuthorAttribution";
import { getReportWorkScopeText, reportHasWorkScope, scopeTextLineCount } from "@/lib/work-scope-text";
import { mergeAdminUsersConfig, loadAdminUsersConfig } from "@/lib/admin-auth";
import {
  InspectorBottomNav,
  InspectorJobSectionNav,
  InspectorQuickActions,
  type InspectorJobSection,
  type InspectorMainTab,
} from "@/app/InspectorNavigation";
import { PwaInstallBanner } from "@/app/PwaInstallBanner";
import { queuePhoto, listQueuedPhotos, removeQueuedPhoto, queuedPhotoCount } from "@/lib/photo-queue";
import { onNativeAppResume, registerNativeBackHandler } from "@/lib/native-app-bridge";
import { PullToRefreshIndicator, usePullToRefresh } from "@/app/usePullToRefresh";
import { Toaster, toast } from "sonner";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { isPdfFilename, isKosztorysPreviewExt } from "@/lib/ath-parser";
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
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
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

function uniqueWorkersOnJob(job: InspectorJob, directory: DirectoryEmployee[]): { name: string; phone: string; position: string }[] {
  const seen = new Set<string>();
  const out: { name: string; phone: string; position: string }[] = [];
  for (const e of job.workEntries) {
    const key = e.directoryId || e.employeeName;
    if (seen.has(key)) continue;
    seen.add(key);
    const dir = directory.find((d) => d.id === e.directoryId);
    out.push({
      name: e.employeeName || dir?.name || "—",
      phone: dir?.phone || "—",
      position: dir?.position || "—",
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "pl"));
}

export function InspectorPanel({
  inspectorId,
  displayName,
  onLogout,
}: {
  inspectorId: string;
  displayName: string;
  onLogout: () => void;
}) {
  const [jobs, setJobs] = useState<InspectorJob[]>([]);
  const [directory, setDirectory] = useState<DirectoryEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("active");
  const [mainTab, setMainTab] = useState<InspectorMainTab>("dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [openReportId, setOpenReportId] = useState<string | null>(null);
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
  const listScrollRef = useRef<HTMLDivElement>(null);
  const dashboardScrollRef = useRef<HTMLDivElement>(null);
  const portfolioScrollRef = useRef<HTMLDivElement>(null);
  const [photoQueueCount, setPhotoQueueCount] = useState(0);
  const [flushingPhotoQueue, setFlushingPhotoQueue] = useState(false);
  const [previewItem, setPreviewItem] = useState<InspectorFileItem | null>(null);
  const [athPreviewEnabled, setAthPreviewEnabled] = useState(() => loadAppSettingsLocal().athPreviewEnabled);
  const [jobSection, setJobSection] = useState<InspectorJobSection>("wm");

  useEffect(() => {
    syncAppSettingsFromCloud()
      .then((s) => setAthPreviewEnabled(s.athPreviewEnabled))
      .catch(() => {});
  }, []);

  const refreshPhotoQueueCount = useCallback(() => {
    queuedPhotoCount("inspector").then(setPhotoQueueCount).catch(() => {});
  }, []);

  useEffect(() => { refreshPhotoQueueCount(); }, [refreshPhotoQueueCount]);

  const scrollToJobSection = useCallback((id: InspectorJobSection) => {
    setJobSection(id);
    jobScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const directoryContacts = useMemo(
    () => directory.map((d) => ({ name: d.name, phone: d.phone })),
    [directory],
  );

  const persistJobs = useCallback((next: InspectorJob[]) => {
    setJobs(next);
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

  const updateJob = useCallback((updated: InspectorJob) => {
    const normalized = normalizeJob(updated);
    setJobs((prev) => {
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
    () => jobsWithAdminNotesNeedingInspector(jobs, getInspectorJobNotesSeenAt(inspectorId)),
    [jobs, inspectorId, notesSeenTick],
  );

  const markAdminNotesSeen = () => {
    markInspectorJobNotesSeen(inspectorId).then(() => setNotesSeenTick((t) => t + 1)).catch(() => {});
  };

  const openJob = useCallback((jobId: string, section?: InspectorJobSection) => {
    setSelectedId(jobId);
    setMainTab("jobs");
    setMsg("");
    setOpenReportId(null);
    if (section) setJobSection(section);
    else setJobSection("wm");
    if (adminNotesPending.some((j) => j.id === jobId)) markAdminNotesSeen();
  }, [adminNotesPending]);

  const dashboardAlertCount = useMemo(() => {
    const stats = computeInspectorDashboardStats(jobs, adminNotesPending.length);
    const ids = new Set<string>();
    adminNotesPending.forEach((j) => ids.add(j.id));
    stats.fileAlerts.forEach((a) => ids.add(a.job.id));
    stats.docAlerts.forEach((a) => ids.add(a.job.id));
    stats.readyNoDate.forEach((a) => ids.add(a.job.id));
    for (const j of jobs) {
      if (j.status !== "in_progress" || !j.plannedHandoverDate) continue;
      if (plannedHandoverStatus(j.plannedHandoverDate, inferHandoverStage(j)) === "overdue") ids.add(j.id);
    }
    return ids.size;
  }, [jobs, adminNotesPending]);

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
    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.documents[doc]) return;
    if (isReportSyncedDocLocked(job, doc)) {
      toast.error("Ten dokument jest powiązany z raportem — nie można go cofnąć");
      return;
    }
    updateJob(
      appendJobActivity(
        { ...job, documents: { ...job.documents, [doc]: true } },
        "inspector_document",
        inspectorDocToggleText(doc, true),
        displayName,
      ),
    );
    const label = DOC_LABELS[doc];
    if (doc === "zlecenie" || doc === "kosztorys") {
      toast.success(`Zapisano · ${label} — firma widzi w Robotach`);
    } else {
      toast.success(`Zapisano · ${label}`);
    }
  }, [jobs, updateJob, displayName]);

  const jobInspectorHistory = useCallback((job: InspectorJob, limit = 5): JobActivity[] => {
    return (job.activityLog || []).filter((ev) => isInspectorActivityType(ev.type)).slice(0, limit);
  }, []);

  const refreshFromCloud = useCallback(async (silent = false) => {
    if (!silent) setSyncing(true);
    try {
      const [cloudJobs, cloudDir, cloudJobsDeletedRaw, cloudDirDeletedRaw] = await fetchKeysFromCloud([
        "kw-jobs",
        "kw-directory",
        JOBS_DELETED_IDS_KEY,
        DIRECTORY_DELETED_IDS_KEY,
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
      setJobs(normalized);
      try { localStorage.setItem("kw-jobs", JSON.stringify(normalized)); } catch { /* ignore */ }
      if (cloudDir && Array.isArray(cloudDir)) {
        let localDir: DirectoryEmployee[] = [];
        try {
          localDir = JSON.parse(localStorage.getItem("kw-directory") || "[]");
        } catch { /* ignore */ }
        const mergedDir = mergeDirectory(localDir, cloudDir as DirectoryEmployee[], mergedDirDeleted) as DirectoryEmployee[];
        setDirectory(mergedDir);
        try { localStorage.setItem("kw-directory", JSON.stringify(mergedDir)); } catch { /* ignore */ }
      } else {
        try {
          setDirectory(JSON.parse(localStorage.getItem("kw-directory") || "[]"));
        } catch { setDirectory([]); }
      }
      setLastSyncedAt(new Date());
      setPushFailed(false);
      if (pushPendingRef.current <= 0) setSyncPending(false);
      const [cloudAdminUsers] = await fetchKeysFromCloud([ADMIN_USERS_CONFIG_KEY]);
      const mergedAdminUsers = mergeAdminUsersConfig(loadAdminUsersConfig(), cloudAdminUsers);
      try { localStorage.setItem(ADMIN_USERS_CONFIG_KEY, JSON.stringify(mergedAdminUsers)); } catch { /* ignore */ }
    } catch {
      try {
        setJobs(normalizeJobsValue(JSON.parse(localStorage.getItem("kw-jobs") || "[]")).map(normalizeJob));
        setDirectory(JSON.parse(localStorage.getItem("kw-directory") || "[]"));
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
    }, 45000);
    return () => window.clearInterval(id);
  }, [refreshFromCloud]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs
      .filter((j) => {
        if (filter === "active" && j.status !== "in_progress") return false;
        if (filter === "completed" && j.status !== "completed") return false;
        if (!q) return true;
        return (
          j.address.toLowerCase().includes(q)
          || j.client.toLowerCase().includes(q)
          || (j.flatNumber || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [jobs, search, filter]);

  const selectedJob = jobs.find((j) => j.id === selectedId) || null;

  const flushInspectorPhotoQueue = useCallback(async () => {
    if (!navigator.onLine || flushingPhotoQueue) return;
    setFlushingPhotoQueue(true);
    try {
      const items = await listQueuedPhotos("inspector");
      for (const item of items) {
        const job = jobs.find((j) => j.id === item.jobId);
        if (!job) {
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
      setFlushingPhotoQueue(false);
      refreshPhotoQueueCount();
    }
  }, [jobs, flushingPhotoQueue, updateJob, refreshPhotoQueueCount]);

  const handleInspectorPhotoUpload = useCallback(async (file: File, label: InspectorPhotoLabel, caption: string) => {
    if (!selectedJob) return false;
    const { entry, error } = await uploadInspectorPhoto(selectedJob.id, file, displayName, caption, label);
    if (!entry) {
      try {
        await queuePhoto({
          kind: "inspector",
          jobId: selectedJob.id,
          label,
          caption,
          uploadedBy: displayName,
          blob: file,
          filename: file.name,
        });
        refreshPhotoQueueCount();
        setMsg("Brak sieci — zdjęcie zapisane w kolejce offline.");
        return true;
      } catch {
        setMsg(error || "Nie udało się wgrać zdjęcia");
        return false;
      }
    }
    updateJob(
      appendJobActivity(
        { ...selectedJob, inspectorPhotos: [entry, ...(selectedJob.inspectorPhotos || [])] },
        "inspector_photo",
        `Zdjęcie inspektora (${label})${entry.caption ? `: ${entry.caption}` : ""}`,
        displayName,
      ),
    );
    return true;
  }, [selectedJob, displayName, updateJob, refreshPhotoQueueCount]);

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
      setSelectedId(null);
      return true;
    });
  }, [selectedId]);

  const pullRefresh = useCallback(() => refreshFromCloud(false), [refreshFromCloud]);
  const dashboardPull = usePullToRefresh(dashboardScrollRef, pullRefresh, !selectedId && mainTab === "dashboard");
  const listPull = usePullToRefresh(listScrollRef, pullRefresh, !selectedId && mainTab === "jobs");
  const jobPull = usePullToRefresh(jobScrollRef, pullRefresh, Boolean(selectedId));
  const portfolioPull = usePullToRefresh(portfolioScrollRef, pullRefresh, !selectedId && mainTab === "portfolio");

  const jobSectionBadges = useMemo((): Partial<Record<InspectorJobSection, number>> => {
    if (!selectedJob) return {};
    const badges: Partial<Record<InspectorJobSection, number>> = {};
    if (adminNotesPending.some((j) => j.id === selectedJob.id)) badges.wm = 1;
    const missingFiles = (!selectedJob.documents.zlecenie ? 1 : 0) + (!selectedJob.documents.kosztorys ? 1 : 0);
    if (missingFiles) badges.files = missingFiles;
    const missingDocs = REQUIRED_DOCS.filter((d) => !selectedJob.documents[d]).length;
    if (missingDocs) badges.docs = missingDocs;
    const reportCount = (selectedJob.workerReports || []).length;
    if (reportCount) badges.reports = reportCount;
    const photoCount = (selectedJob.photos || []).filter((p) => p.status === "approved").length;
    if (photoCount) badges.photos = photoCount;
    return badges;
  }, [selectedJob, adminNotesPending]);

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
    const { attachment, error } = await uploadJobFile(job.id, file, kind, displayName);
    if (!attachment) {
      setMsg(error || "Nie udało się wgrać pliku");
      setUploadBusy(null);
      return;
    }
    const docKey = kind as DocType;
    updateJob(
      appendJobActivity(
        {
          ...job,
          jobFiles: [...(job.jobFiles || []).filter((f) => f.kind !== kind), attachment],
          documents: { ...job.documents, [docKey]: true },
        },
        "inspector_file",
        inspectorFileUploadText(kind, file.name),
        displayName,
      ),
    );
    setMsg(kind === "zlecenie" ? "Zlecenie wgrane" : "Kosztorys wgrany");
    if (kind === "zlecenie" && inferHandoverStage(job) === "awaiting_order") {
      setStageSuggestion({ jobId: job.id, stage: "in_progress" });
    }
    setUploadBusy(null);
  };

  return (
    <div className="flex flex-col bg-background text-foreground" style={{ fontFamily: "'Inter', sans-serif", height: "100dvh" }}>
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0 gap-2" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-2 min-w-0">
          <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-7 w-auto shrink-0"/>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate">Inspektor WM · W&G DOM</p>
            <SyncStatusBadge syncing={syncing} syncPending={syncPending} pushFailed={pushFailed} lastSyncedAt={lastSyncedAt} onRetry={() => refreshFromCloud(false)}/>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => refreshFromCloud(false)}
            disabled={syncing}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-3 py-2.5 min-h-[44px] rounded-lg hover:bg-secondary disabled:opacity-50"
            title={lastSyncedAt ? `Ostatnio: ${lastSyncedAt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}` : "Odśwież dane z chmury"}
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""}/>
            <span className="hidden sm:inline">{syncing ? "…" : "Odśwież"}</span>
          </button>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 px-3 py-2.5 min-h-[44px] rounded-lg"
            title="Instrukcja"
          >
            <BookOpen size={14}/><span className="hidden sm:inline">Pomoc</span>
          </button>
          <button type="button" onClick={onLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-2.5 min-h-[44px] rounded-lg hover:bg-secondary">
            <LogOut size={14}/>Wyloguj
          </button>
        </div>
      </header>

      <InspectorHelpBanner onOpenHelp={() => setHelpOpen(true)}/>
      <InspectorHelpModal open={helpOpen} onClose={() => setHelpOpen(false)}/>

      <div className="px-4 shrink-0">
        <PwaInstallBanner compact dismissKey="wg-pwa-inspector-dismiss" persist="local" className="mb-0 mt-2"/>
      </div>

      {(photoQueueCount > 0 || flushingPhotoQueue) && (
        <div className="mx-4 mt-2 flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2 text-xs shrink-0">
          <CloudOff size={13} className="text-amber-400 shrink-0"/>
          <span className="text-amber-400 font-medium">
            {flushingPhotoQueue ? "Wysyłanie zdjęć z kolejki…" : `${photoQueueCount} zdjęć inspektora w kolejce offline`}
          </span>
          {!flushingPhotoQueue && navigator.onLine && (
            <button type="button" onClick={() => void flushInspectorPhotoQueue()} className="ml-auto text-primary hover:underline shrink-0 min-h-[44px] px-2 touch-manipulation">
              Wyślij teraz
            </button>
          )}
        </div>
      )}

      {adminNotesPending.length > 0 && !selectedJob && (
        <div className="mx-4 mt-2 mb-1 bg-violet-500/10 border border-violet-500/25 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
              <MessageSquare size={14}/> Odpowiedź od admina ({adminNotesPending.length})
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {adminNotesPending.slice(0, 2).map((j) => j.address || "Bez adresu").join(" · ")}
              {adminNotesPending.length > 2 ? "…" : ""}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => { setSelectedId(adminNotesPending[0].id); setMsg(""); markAdminNotesSeen(); }}
              className="px-3 py-2.5 min-h-[44px] rounded-lg bg-violet-600 text-white text-xs font-medium touch-manipulation"
            >
              Otwórz
            </button>
            <button type="button" onClick={markAdminNotesSeen} className="px-3 py-2.5 min-h-[44px] rounded-lg bg-secondary text-xs text-muted-foreground touch-manipulation">
              OK
            </button>
          </div>
        </div>
      )}

      {!selectedJob && mainTab === "dashboard" ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <PullToRefreshIndicator pull={dashboardPull.pull} refreshing={dashboardPull.refreshing || syncing} ready={dashboardPull.ready}/>
          <div ref={dashboardScrollRef} className="flex-1 overflow-y-auto overscroll-contain">
            <div
              className="max-w-2xl mx-auto w-full px-4 py-4"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
                </div>
              ) : (
                <InspectorDashboard
                  jobs={jobs}
                  displayName={displayName}
                  adminNotesPending={adminNotesPending}
                  onOpenJob={openJob}
                  onMarkDoc={markDocFromDashboard}
                />
              )}
            </div>
          </div>
          <InspectorBottomNav
            active={mainTab}
            alertCount={dashboardAlertCount}
            onDashboard={() => setMainTab("dashboard")}
            onJobs={() => setMainTab("jobs")}
            onPortfolio={() => setMainTab("portfolio")}
            onHelp={() => setHelpOpen(true)}
          />
        </div>
      ) : !selectedJob && mainTab === "portfolio" ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <PullToRefreshIndicator pull={portfolioPull.pull} refreshing={portfolioPull.refreshing || syncing} ready={portfolioPull.ready}/>
          <WmPortfolioView jobs={jobs} scrollRef={portfolioScrollRef} onOpenJob={(id) => openJob(id)}/>
          <InspectorBottomNav
            active={mainTab}
            alertCount={dashboardAlertCount}
            onDashboard={() => setMainTab("dashboard")}
            onJobs={() => setMainTab("jobs")}
            onPortfolio={() => setMainTab("portfolio")}
            onHelp={() => setHelpOpen(true)}
          />
        </div>
      ) : !selectedJob ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-3 space-y-3 border-b border-border bg-card/50 shrink-0">
            <div className="flex items-end justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">Roboty WM</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {filter === "active" ? "Aktywne remonty" : filter === "completed" ? "Zdane klucze" : "Pełna lista"}
                  {" · "}{filteredJobs.length} {filteredJobs.length === 1 ? "adres" : "adresów"}
                </p>
              </div>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukaj adresu, klienta…"
                className="w-full bg-secondary rounded-xl pl-9 pr-3 py-2.5 border border-transparent focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
                Status<InspectorHint text="Aktywne = remont trwa. Zdane = klucze oddane. Wszystkie = pełna lista."/>
              </span>
              {(["active", "completed", "all"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-2.5 min-h-[44px] rounded-lg text-xs font-medium transition-colors touch-manipulation ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                >
                  {f === "active" ? "Aktywne" : f === "completed" ? "Zdane" : "Wszystkie"}
                </button>
              ))}
            </div>
          </div>

          <PullToRefreshIndicator pull={listPull.pull} refreshing={listPull.refreshing || syncing} ready={listPull.ready}/>
          <div ref={listScrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-2">
                <MapPin size={28} className="mx-auto text-muted-foreground/40"/>
                <p className="text-sm font-medium text-muted-foreground">Brak robót w tym filtrze</p>
                <p className="text-xs text-muted-foreground/80">Zmień filtr na „Wszystkie” lub użyj wyszukiwarki</p>
              </div>
            ) : (
              filteredJobs.map((job) => {
                const reqDone = REQUIRED_DOCS.filter((d) => job.documents[d]).length;
                const hasZlecenie = job.documents.zlecenie;
                const hasKosztorys = job.documents.kosztorys;
                const photoCount = (job.photos || []).filter((p) => p.status === "approved").length;
                const hasAdminReply = adminNotesPending.some((j) => j.id === job.id);
                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => { setSelectedId(job.id); setMsg(""); setOpenReportId(null); if (hasAdminReply) markAdminNotesSeen(); }}
                    className={`w-full text-left bg-card border rounded-2xl p-4 hover:border-primary/40 transition-colors active:scale-[0.99] ${hasAdminReply ? "border-violet-500/40 ring-1 ring-violet-500/20" : "border-border"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {job.address || "Bez adresu"}{job.flatNumber && <span className="text-muted-foreground"> m.{job.flatNumber}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{job.client || "—"}</p>
                        <div className="mt-1"><JobMetaBadges job={job}/></div>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${job.status === "completed" ? "bg-green-500/15 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                        {job.status === "completed" ? "Zdana" : "W trakcie"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">Start: {fmtDate(job.startDate)}</p>
                    {hasAdminReply && (
                      <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium mt-1.5 flex items-center gap-1">
                        <MessageSquare size={10}/> Nowa odpowiedź admina — kliknij, aby otworzyć
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <JobWmStageBadge job={job}/>
                      <JobWmPlannedBadge job={job}/>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full ${hasZlecenie ? "bg-green-500/15 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                        <FileText size={10}/> Zlecenie {hasZlecenie ? "✓" : "—"}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full ${hasKosztorys ? "bg-green-500/15 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                        <FileCheck size={10}/> Kosztorys {hasKosztorys ? "✓" : "—"}
                      </span>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                        Dok. {reqDone}/{REQUIRED_DOCS.length}
                      </span>
                      {photoCount > 0 && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                          {photoCount} zdjęć
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <InspectorBottomNav
            active={mainTab}
            alertCount={dashboardAlertCount}
            onDashboard={() => setMainTab("dashboard")}
            onJobs={() => setMainTab("jobs")}
            onPortfolio={() => setMainTab("portfolio")}
            onHelp={() => setHelpOpen(true)}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-2 shrink-0 space-y-2">
            <button type="button" onClick={() => setSelectedId(null)} className="flex items-center gap-2 text-sm font-medium text-primary min-h-[44px]">
              <ArrowLeft size={16}/>Wróć do listy robót
            </button>
            <div className="pb-1">
              <p className="text-sm font-semibold truncate leading-snug">
                {selectedJob.address || "Bez adresu"}{selectedJob.flatNumber && ` m.${selectedJob.flatNumber}`}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{selectedJob.client || "—"}</p>
              <JobMetaBadges job={selectedJob}/>
            </div>
            <InspectorJobSectionNav
              active={jobSection}
              badges={jobSectionBadges}
              onSelect={scrollToJobSection}
            />
            <p className="text-[10px] text-muted-foreground px-0.5 pb-1">
              {jobSection === "wm" && "Etap odbioru WM, notatki i odpowiedzi od admina"}
              {jobSection === "files" && "Zlecenie PDF i kosztorys — oznacz „Jest” lub wgraj plik"}
              {jobSection === "docs" && "Checklist dokumentów wymaganych przy odbiorze"}
              {jobSection === "team" && "Kto pracował na robocie — numery telefonów"}
              {jobSection === "reports" && "Raporty ekipy: zakres prac, wymiary, rysunki"}
              {jobSection === "photos" && "Zdjęcia ekipy i własne zdjęcia inspektora"}
            </p>
          </div>

          <div ref={jobScrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-5 max-w-2xl mx-auto w-full" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
            <PullToRefreshIndicator pull={jobPull.pull} refreshing={jobPull.refreshing || syncing} ready={jobPull.ready}/>
            {msg && <p className="text-xs text-primary bg-primary/10 rounded-lg px-3 py-2">{msg}</p>}

            {jobSection === "wm" && (
            <>
            {stageSuggestion?.jobId === selectedJob.id && (
              <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 flex-1">
                  Zlecenie wgrane — zmienić etap na <strong>{HANDOVER_STAGE_LABELS[stageSuggestion.stage]}</strong>?
                </p>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = appendJobActivity(
                        applyHandoverStageToJob(selectedJob, stageSuggestion.stage),
                        "inspector_stage",
                        `Etap: ${HANDOVER_STAGE_LABELS[stageSuggestion.stage]}`,
                        displayName,
                      );
                      updateJob(updated);
                      setStageSuggestion(null);
                      setMsg("Etap zaktualizowany");
                    }}
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium"
                  >
                    Tak, ustaw
                  </button>
                  <button type="button" onClick={() => setStageSuggestion(null)} className="px-3 py-2 rounded-lg bg-secondary text-xs text-muted-foreground">
                    Później
                  </button>
                </div>
              </div>
            )}

            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <JobWmStageBadge job={selectedJob}/>
                <JobWmPlannedBadge job={selectedJob}/>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${selectedJob.status === "completed" ? "bg-green-500/15 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                  {selectedJob.status === "completed" ? "Zdana" : "W trakcie"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Start {fmtDate(selectedJob.startDate)}{selectedJob.endDate && ` · koniec ${fmtDate(selectedJob.endDate)}`}
              </p>
              <JobMetaPickers
                housingType={selectedJob.housingType}
                stoveType={selectedJob.stoveType}
                onHousingChange={(v) => updateJob({ ...selectedJob, housingType: v })}
                onStoveChange={(v) => updateJob({ ...selectedJob, stoveType: v })}
              />
              <InspectorQuickActions items={jobQuickActions} onSelect={scrollToJobSection}/>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 px-0.5">Odbiór WM — etap, notatki, zdjęcia</p>
            <JobWmPanel
              job={selectedJob}
              onUpdate={updateJob}
              actorName={displayName}
              actorRole="inspector"
              directory={directoryContacts}
              onGoToPhotos={() => scrollToJobSection("photos")}
            />
            </div>

            {jobInspectorHistory(selectedJob).length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <ScrollText size={15}/> Ostatnie zmiany
                </p>
                <div className="space-y-2">
                  {jobInspectorHistory(selectedJob).map((ev) => (
                    <div key={ev.id} className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-3 py-0.5">
                      <AuthorAttribution
                        name={ev.actor}
                        directory={directoryContacts}
                        accentClass="text-foreground/90 font-medium"
                      />
                      {" · "}
                      {ev.text}
                      {" · "}
                      {new Date(ev.at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  ))}
                </div>
              </div>
            )}
            </>
            )}

            {jobSection === "files" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">Zlecenie i kosztorys</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {(["zlecenie", "kosztorys"] as const).map((kind) => {
                const label = kind === "zlecenie" ? "Zlecenie (PDF)" : "Kosztorys (NORMA/ATH/PDF)";
                const hint = kind === "zlecenie"
                  ? "Zaznacz „Jest” gdy wystawiłeś zlecenie (np. mailem) — plik PDF opcjonalny. Firma zobaczy status w Robotach."
                  : "Kosztorys NORMA (.ath, .nor, .xml) lub PDF. Zaznacz „Jest” po dostarczeniu — wgrywanie pliku nie jest wymagane.";
                const file = latestJobFile(selectedJob, kind);
                const checked = selectedJob.documents[kind];
                return (
                  <div key={kind} className={`rounded-2xl border p-4 space-y-3 ${checked ? "border-green-500/30 bg-green-500/5" : "border-border bg-card"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold flex items-center">{label}<InspectorHint text={hint}/></p>
                      <button
                        type="button"
                        onClick={() => toggleDoc(selectedJob, kind)}
                        className={`flex items-center gap-1 text-xs font-medium px-3 py-2 min-h-[44px] rounded-full ${checked ? "bg-green-500/15 text-green-400" : "bg-secondary text-muted-foreground"}`}
                        title={checked ? "Oznacz jako brak" : "Oznacz jako jest"}
                      >
                        {checked ? <CheckCircle2 size={12}/> : <Circle size={12}/>}
                        {checked ? "Jest" : "Brak"}
                      </button>
                    </div>
                    {file ? (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <a href={file.publicUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 truncate min-w-0">
                            <FileText size={12}/>{file.filename}
                          </a>
                          {(isPdfFilename(file.filename) || isKosztorysPreviewExt(file.filename)) && (
                            <button
                              type="button"
                              onClick={() => setPreviewItem({ kind: "jobFile", file })}
                              className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 font-medium shrink-0"
                            >
                              <Eye size={12}/> Podgląd
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Dodał:{" "}
                          <AuthorAttribution
                            name={file.uploadedBy}
                            directory={directoryContacts}
                            accentClass="text-muted-foreground font-medium"
                          />
                          {" · "}
                          {new Date(file.uploadedAt).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">Brak pliku — wgraj poniżej</p>
                    )}
                    <InspectorJobFileUpload
                      kind={kind}
                      busy={uploadBusy === kind}
                      hasFile={!!file}
                      onPick={(f) => handleFileUpload(selectedJob, kind, f)}
                      onError={(msg) => setMsg(msg)}
                    />
                  </div>
                );
              })}
            </div>
            </div>
            )}

            {jobSection === "docs" && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ClipboardList size={15}/> Dokumentacja robót
                <InspectorHint text="Kliknij pole — zaznaczasz że mamy ten dokument. Żółte = wymagane przy odbiorze. Admin widzi to samo w Robotach."/>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DOCUMENT_TYPES.map((doc) => {
                  const checked = selectedJob.documents[doc];
                  const required = (REQUIRED_DOCS as readonly string[]).includes(doc);
                  return (
                    <button
                      key={doc}
                      type="button"
                      onClick={() => toggleDoc(selectedJob, doc)}
                      className={`flex items-center gap-2 text-left text-xs px-3 py-2.5 rounded-xl border transition-colors min-h-[44px] ${checked ? "border-green-500/30 bg-green-500/10 text-green-400" : required ? "border-amber-500/20 bg-amber-500/5 text-muted-foreground" : "border-border bg-secondary/30 text-muted-foreground"}`}
                    >
                      {checked ? <CheckCircle2 size={14} className="shrink-0"/> : <Circle size={14} className="shrink-0"/>}
                      <span className="leading-tight">{DOC_LABELS[doc]}</span>
                    </button>
                  );
                })}
              </div>
              {REQUIRED_DOCS.filter((d) => !selectedJob.documents[d]).length > 0 && (
                <p className="text-[11px] text-amber-400/90 mt-3 flex items-start gap-1.5">
                  <AlertCircle size={12} className="shrink-0 mt-0.5"/>
                  Brakuje: {REQUIRED_DOCS.filter((d) => !selectedJob.documents[d]).map((d) => DOC_LABELS[d]).join(", ")}
                </p>
              )}
            </div>
            )}

            {jobSection === "team" && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Users size={15}/> Pracownicy na robocie
                <InspectorHint text="Kto był przypisany do tego adresu — możesz zadzwonić. Bez wypłat i stawek."/>
              </p>
              {uniqueWorkersOnJob(selectedJob, directory).length === 0 ? (
                <p className="text-xs text-muted-foreground">Brak wpisów czasu pracy</p>
              ) : (
                <div className="space-y-2">
                  {uniqueWorkersOnJob(selectedJob, directory).map((w) => (
                    <div key={w.name + w.phone} className="flex items-center justify-between gap-3 bg-secondary/40 rounded-xl px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{w.name}</p>
                        <p className="text-[11px] text-muted-foreground">{w.position}</p>
                      </div>
                      {w.phone && w.phone !== "—" && (
                        <a href={`tel:${w.phone.replace(/\s/g, "")}`} className="flex items-center gap-1 text-xs text-primary shrink-0">
                          <Phone size={12}/>{w.phone}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {jobSection === "reports" && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Ruler size={15}/> Zakresy i wymiary
                  <InspectorHint text="Raporty ekipy z budowy — zakres prac, metraże, zdjęcia rysunków. Rozwiń strzałką. Ważne przy odbiorze WM."/>
                </p>
              </div>
              {(selectedJob.workerReports || []).length === 0 ? (
                <p className="px-4 py-6 text-xs text-muted-foreground text-center">Brak raportów od pracowników</p>
              ) : (
                <div className="divide-y divide-border">
                  {[...(selectedJob.workerReports || [])].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).map((report) => {
                    const open = openReportId === report.id;
                    return (
                      <div key={report.id}>
                        <button type="button" onClick={() => setOpenReportId(open ? null : report.id)} className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-secondary/30 text-left">
                          <div>
                            <p className="text-sm font-medium">
                              <AuthorAttribution
                                name={report.workerName}
                                reportAdminRole={report.authorAdminRole || "worker"}
                                directory={directoryContacts}
                                accentClass="text-sm font-medium text-foreground"
                              />
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {fmtDate(report.submittedAt.slice(0, 10))}
                              {reportHasWorkScope(report) && ` · ${scopeTextLineCount(getReportWorkScopeText(report))} linii`}
                              {report.rooms.length > 0 && ` · ${report.rooms.length} pom.`}
                            </p>
                          </div>
                          {open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </button>
                        {open && (
                          <div className="px-4 pb-4 space-y-4 bg-secondary/10">
                            {reportHasWorkScope(report) && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Zakres wykonanych prac</p>
                                <WorkScopeDisplay text={getReportWorkScopeText(report)} className="text-sm"/>
                              </div>
                            )}
                            {report.rooms.length > 0 && (
                              <div className="overflow-x-auto rounded-lg border border-border">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-secondary/50 text-muted-foreground">
                                      <th className="px-2 py-1.5 text-left">Pomieszczenie</th>
                                      <th className="px-2 py-1.5 text-right">Dł.</th>
                                      <th className="px-2 py-1.5 text-right">Szer.</th>
                                      <th className="px-2 py-1.5 text-right">Wys.</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {report.rooms.map((room) => (
                                      <tr key={room.id}>
                                        <td className="px-2 py-1.5">{room.customLabel || room.roomType}</td>
                                        <td className="px-2 py-1.5 text-right font-mono">{room.length || "—"}</td>
                                        <td className="px-2 py-1.5 text-right font-mono">{room.width || "—"}</td>
                                        <td className="px-2 py-1.5 text-right font-mono">{room.height || "—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            {report.sketch?.publicUrl && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Rysunek / wymiary (foto)</p>
                                <button type="button" onClick={() => setLightbox({ url: report.sketch!.publicUrl, label: "Rysunek" })} className="block w-full max-w-xs rounded-xl overflow-hidden border border-border">
                                  <img src={report.sketch.publicUrl} alt="Rysunek" className="w-full h-auto object-cover"/>
                                </button>
                                {report.sketchNote && <p className="text-xs text-muted-foreground mt-1 italic">{report.sketchNote}</p>}
                              </div>
                            )}
                            {report.generalNote && (
                              <p className="text-xs bg-primary/5 border border-primary/15 rounded-lg px-3 py-2">{report.generalNote}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            )}

            {jobSection === "photos" && (
              <InspectorPhotoGallery
                jobAddress={selectedJob.address || "robota"}
                crewPhotos={selectedJob.photos || []}
                inspectorPhotos={selectedJob.inspectorPhotos || []}
                directory={directoryContacts}
                onStatusMessage={setMsg}
                canUpload
                onUploadInspectorPhoto={handleInspectorPhotoUpload}
              />
            )}

            {selectedJob.notes && jobSection === "wm" && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Notatki</p>
                <p className="text-sm whitespace-pre-wrap">{selectedJob.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button type="button" className="absolute top-4 right-4 p-2 text-white" style={{ top: "max(1rem, env(safe-area-inset-top))" }} onClick={() => setLightbox(null)}>
            <X size={24}/>
          </button>
          <p className="text-white text-sm mb-3">{lightbox.label}</p>
          <img src={lightbox.url} alt={lightbox.label} className="max-w-full max-h-[85dvh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()}/>
        </div>
      )}

      {previewItem && (
        <JobFilePreviewModal
          item={previewItem}
          athPreviewEnabled={athPreviewEnabled}
          onClose={() => setPreviewItem(null)}
        />
      )}

      <Toaster
        position="top-center"
        richColors
        closeButton
        duration={4000}
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 4.25rem)" }}
      />
    </div>
  );
}

function SyncStatusBadge({
  syncing,
  syncPending,
  pushFailed,
  lastSyncedAt,
  onRetry,
}: {
  syncing: boolean;
  syncPending: boolean;
  pushFailed: boolean;
  lastSyncedAt: Date | null;
  onRetry?: () => void;
}) {
  if (syncing) {
    return (
      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
        <RefreshCw size={10} className="animate-spin shrink-0"/>
        Odświeżam z chmury…
      </p>
    );
  }
  if (pushFailed) {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5 touch-manipulation min-h-[28px]"
        title="Dotknij, aby ponowić wysłanie do chmury"
      >
        <CloudOff size={10} className="shrink-0"/>
        Czeka na wysłanie — dotknij
      </button>
    );
  }
  if (syncPending) {
    return (
      <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
        <Cloud size={10} className="shrink-0"/>
        Zapisywanie…
      </p>
    );
  }
  return (
    <p className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1 mt-0.5" title={lastSyncedAt ? `Ostatnio: ${lastSyncedAt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}` : undefined}>
      <Cloud size={10} className="shrink-0"/>
      Zsynchronizowano
    </p>
  );
}
