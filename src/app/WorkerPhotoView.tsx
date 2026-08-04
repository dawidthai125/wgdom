import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";
import { cn } from "@/app/components/ui/utils";
import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import { ThemeToggle } from "@/app/theme/ThemeToggle";
import { useWorkerPrivacyShield } from "@/app/hooks/useWorkerPrivacyShield";
import { useLocalStorage } from "@/app/hooks/useLocalStorage";
import { HiddenFileInput } from "@/app/HiddenFileInput";
import { JobPhotoImg } from "@/app/JobPhotoImg";
import { useMediaFailureRevision } from "@/app/useMediaFailureRevision";
import { WgButton, WgCard, WgEmptyState, WgField, WgKpi } from "@/app/ui";
import { filterAvailablePhotos } from "@/lib/media-filter";
import { removePhotoWithTombstone } from "@/lib/job-photos";
import { appendJobActivity } from "@/lib/job-activity";
import {
  WG_DURATION_HOVER,
  WG_FOCUS_RING,
  WG_RADIUS_LG,
  WG_TOUCH_MIN,
  WG_TYPE_LABEL,
  WG_TYPE_TITLE,
} from "@/lib/wg-ui-tokens";
import {
  Camera, Eye, ImagePlus, Lock, LogOut, MapPin, CalendarDays, Wallet,
  HelpCircle, ChevronUp, ChevronDown, CloudOff, ArrowLeft, Search, Receipt,
  Archive, Edit2, Trash2, CheckCircle2, ClipboardList,
} from "lucide-react";
import {
  fetchKeysFromCloud,
  normalizeJobsValue,
  mergeJobsById,
  mergeWeekEmployees,
  mergeArchive,
  pushKeysToCloudSafe,
  getDeletedJobIds,
  mergeDeletedJobIds,
  saveDeletedJobIds,
  normalizeDeletedJobIds,
  JOBS_DELETED_IDS_KEY,
} from "@/lib/cloud-sync";
import { saveLocalJobsSnapshot } from "@/lib/jobs-safety";
import type {
  WeekEmployee,
  WeekSnapshot,
  PhotoEntry,
  WorkerJobReport,
  Job,
  EmployeeExtraCost,
} from "@/app/app-domain";
import {
  fmt,
  fmtH,
  fmtDate,
  getWeekRange,
  calcWeekEmployee,
  extraCostStatus,
  PHOTO_STATUS_LABELS,
  EXTRA_COST_STATUS_LABELS,
  workerTodayWorkInfo,
  normalizeJobsList,
  jobWorkerReports,
  normalizeWorkerReport,
  fridayIsoOfWeek,
  findWeekEmployeeForWorker,
  workerPayoutHistory,
  weekDayColumns,
  scheduleCellFor,
  todayIsoDate,
  uploadPhoto,
  prepareWatermarkedPhoto,
  uploadReceipt,
  isWorkerOnExecutionTeam,
  resolveWorkerContractStatusLabel,
  resolveWorkerContractDateLabel,
} from "@/app/app-domain";
import { JobReportForm } from "@/app/JobReportForm";
import { WorkerJobProgressFlow } from "@/app/WorkerJobProgressFlow";
import { WorkerEducationBanner, WorkerStepCta } from "@/app/WorkerStepCta";
import { computeWorkerJobProgress } from "@/lib/worker-job-progress";
import { getReportWorkScopeText, reportHasWorkScope } from "@/lib/work-scope-text";
import { syncJobDocuments, clearReportDocSaOverrideFromReport } from "@/lib/job-documents";
import { queuePhoto, listQueuedPhotos, removeQueuedPhoto, queuedPhotoCount } from "@/lib/photo-queue";
import { PwaInstallBanner } from "@/app/PwaInstallBanner";
import { PullToRefreshIndicator, usePullToRefresh } from "@/app/usePullToRefresh";
import { onNativeAppResume, registerNativeBackHandler } from "@/lib/native-app-bridge";

export function WorkerPhotoView({ workerName, workerId, onLogout }: { workerName: string; workerId: string; onLogout: () => void }) {
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

  const activeJobs = useMemo(
    () =>
      jobs
        .filter((j) => j.status === "in_progress")
        .filter(
          (j) =>
            !search.trim() ||
            j.address.toLowerCase().includes(search.toLowerCase()) ||
            (j.client || "").toLowerCase().includes(search.toLowerCase()),
        )
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [jobs, search],
  );

  const myContractJobs = useMemo(
    () => activeJobs.filter((j) => isWorkerOnExecutionTeam(j, workerId)),
    [activeJobs, workerId],
  );

  const selectedJob = jobs.find(j => j.id === selectedJobId) || null;

  const openWorkerJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setUploadedCount(0);
    setUploadError("");
    setEditingReport(null);
  };

  const renderWorkerJobCard = (job: Job, contractMeta = false) => {
    const pending = (job.photos || []).filter((p) => p.status === "pending").length;
    if (contractMeta) {
      const statusLabel = resolveWorkerContractStatusLabel(job);
      const dateLabel = resolveWorkerContractDateLabel(job);
      return (
        <WgCard
          key={job.id}
          as="button"
          type="button"
          elevation="soft"
          padding="sm"
          radius="lg"
          onClick={() => openWorkerJob(job.id)}
          className={cn(
            "w-full text-left touch-manipulation border-primary/20",
            `transition-colors ${WG_DURATION_HOVER}`,
            "hover:border-primary/40 hover:bg-primary/5",
            "active:scale-[0.99] motion-reduce:active:scale-100",
            WG_FOCUS_RING,
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {job.address || "Bez adresu"}
                {job.flatNumber && <span className="text-muted-foreground"> m.{job.flatNumber}</span>}
              </p>
              <p className="text-xs font-medium text-primary mt-1.5">{statusLabel}</p>
              {dateLabel && (
                <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {dateLabel}
                </p>
              )}
            </div>
            {pending > 0 && (
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full shrink-0">
                {pending} oczekuje
              </span>
            )}
          </div>
        </WgCard>
      );
    }
    return (
      <WgCard
        key={job.id}
        as="button"
        type="button"
        elevation="soft"
        padding="sm"
        radius="lg"
        onClick={() => openWorkerJob(job.id)}
        className={cn(
          "w-full text-left touch-manipulation",
          `transition-colors ${WG_DURATION_HOVER}`,
          "hover:border-primary/40 hover:bg-primary/5",
          "active:scale-[0.99] motion-reduce:active:scale-100",
          WG_FOCUS_RING,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              {job.address || "Bez adresu"}
              {job.flatNumber && <span className="text-muted-foreground"> m.{job.flatNumber}</span>}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{job.client || "—"}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-[10px] bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full font-medium">
              W trakcie
            </span>
            {pending > 0 && (
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                {pending} oczekuje
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Rozpoczęto: {fmtDate(job.startDate)}</p>
      </WgCard>
    );
  };

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
    if (!window.confirm("Usunąć tę dokumentację?")) return;
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
      prev.map((j) => {
        if (j.id !== selectedJobId) return j;
        const next = removePhotoWithTombstone(j, photoId, { deletedBy: workerName });
        return { ...next, updatedAt: new Date().toISOString() };
      }),
    );
  };

  const failRev = useMediaFailureRevision();
  void failRev;
  const myPhotos = selectedJob
    ? filterAvailablePhotos((selectedJob.photos || []).filter((p) => p.uploadedBy === workerName))
    : [];
  const myReports = selectedJob ? jobWorkerReports(selectedJob).filter(r => r.workerName === workerName) : [];
  const workerProgress = useMemo(
    () => computeWorkerJobProgress(myPhotos, myReports),
    [myPhotos, myReports],
  );

  return (
    <div
      className="worker-shell flex flex-col bg-background text-foreground select-none [-webkit-touch-callout:none]"
    >
      <div
        className="flex items-center justify-between px-4 py-4 border-b border-border/60 bg-card shrink-0"
        style={{ paddingTop: "max(1rem,env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-7 w-auto object-contain"/>
          <div className="w-px h-5 bg-border"/>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{workerName}</p>
            <p className="text-[10px] text-muted-foreground">Tryb pracownika</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <ThemeToggle />
          <WgButton
            type="button"
            variant="ghost"
            onClick={onLogout}
            className={cn(WG_TOUCH_MIN, "h-11 gap-1.5 px-3 text-xs text-muted-foreground hover:text-foreground rounded-lg")}
          >
            <LogOut size={13}/>Wyloguj
          </WgButton>
        </div>
      </div>

      {!selectedJob && (
        <div className="flex border-b border-border/60 bg-card shrink-0">
          <WgButton
            type="button"
            variant="ghost"
            onClick={() => setWorkerTab("jobs")}
            title="Wybierz robotę, wgrywaj zdjęcia i dokumentację robót"
            className={cn(
              "flex-1 min-h-[48px] h-12 rounded-none gap-1.5 text-sm font-semibold",
              `transition-colors ${WG_DURATION_HOVER}`,
              WG_FOCUS_RING,
              workerTab === "jobs"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground border-b-2 border-transparent",
            )}
          >
            <MapPin size={14}/>Roboty
          </WgButton>
          <WgButton
            type="button"
            variant="ghost"
            onClick={() => setWorkerTab("schedule")}
            title="Twój grafik na ten tydzień — godziny i adresy robót"
            className={cn(
              "flex-1 min-h-[48px] h-12 rounded-none gap-1.5 text-sm font-semibold",
              `transition-colors ${WG_DURATION_HOVER}`,
              WG_FOCUS_RING,
              workerTab === "schedule"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground border-b-2 border-transparent",
            )}
          >
            <CalendarDays size={14}/>Grafik
          </WgButton>
          <WgButton
            type="button"
            variant="ghost"
            onClick={() => setWorkerTab("pay")}
            title="Twoja wypłata w piątek — tylko po logowaniu telefonem i kodem"
            className={cn(
              "flex-1 min-h-[48px] h-12 rounded-none gap-1.5 text-sm font-semibold",
              `transition-colors ${WG_DURATION_HOVER}`,
              WG_FOCUS_RING,
              workerTab === "pay"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground border-b-2 border-transparent",
            )}
          >
            <Wallet size={14}/>Wypłata
          </WgButton>
        </div>
      )}

      {!selectedJob && (
        <div className="mx-4 mt-3 shrink-0">
          <WgButton
            type="button"
            variant="ghost"
            onClick={() => setWorkerHelpOpen((v) => !v)}
            className={cn(
              "w-full h-auto justify-between gap-2 px-3 py-2 rounded-xl border border-border bg-secondary/30",
              "text-xs text-muted-foreground hover:text-foreground",
              WG_FOCUS_RING,
            )}
          >
            <span className="flex items-center gap-1.5"><HelpCircle size={13} className="text-primary shrink-0"/>Co mogę tu zrobić?</span>
            {workerHelpOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </WgButton>
          {workerHelpOpen && (
            <div className={cn("mt-1.5 px-3 py-2.5 border border-border bg-card text-[11px] text-muted-foreground leading-relaxed space-y-1.5", WG_RADIUS_LG)}>
              <p><strong className="text-foreground/90">Roboty</strong> — na górze lista <strong>Twoje kontrakty</strong> (gdy admin przypisał Cię do planowej ekipy), poniżej wszystkie roboty w toku. Wybierz robotę → zdjęcia (galeria lub aparat), dokumentacja robót (zakres, wymiary, obrys).</p>
              <p><strong className="text-foreground/90">Grafik</strong> — Twój tydzień Pn–So: godziny z listy płac i adresy z wpisów na robotach.</p>
              <p><strong className="text-foreground/90">Wypłata</strong> — kwota na piątek, skan paragonu (chemia, paliwo) trafia do kosztów do zwrotu po akceptacji admina.</p>
              <p><strong className="text-foreground/90">Offline</strong> — zdjęcia bez sieci trafiają do kolejki i wysyłają się po powrocie zasięgu.</p>
            </div>
          )}
        </div>
      )}

      <PwaInstallBanner compact/>

      {(queueCount > 0 || flushingQueue) && (
        <div className={cn("mx-4 mb-2 flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-xs", WG_RADIUS_LG)}>
          <CloudOff size={13} className="text-amber-400 shrink-0"/>
          <span className="text-amber-400 font-medium">
            {flushingQueue ? "Wysyłanie kolejki…" : `${queueCount} zdjęć w kolejce offline`}
          </span>
          {!flushingQueue && navigator.onLine && (
            <WgButton
              type="button"
              variant="ghost"
              onClick={() => flushQueue()}
              className="ml-auto h-auto w-auto p-0 text-xs text-primary hover:underline shrink-0"
            >
              Wyślij teraz
            </WgButton>
          )}
        </div>
      )}

      <div ref={workerScrollRef} className="mobile-view-scroll" data-keyboard-aware style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <PullToRefreshIndicator pull={workerPull.pull} refreshing={workerPull.refreshing || payrollLoading || jobsLoading} ready={workerPull.ready}/>
        {selectedJob && (
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/60 px-4 py-2.5">
            <WgButton
              type="button"
              variant="ghost"
              onClick={() => setSelectedJobId(null)}
              className={cn(
                "gap-2 text-sm font-medium text-primary h-11 px-1 -ml-1",
                WG_TOUCH_MIN,
                WG_FOCUS_RING,
              )}
            >
              <ArrowLeft size={16}/>Roboty · Grafik · Wypłata
            </WgButton>
          </div>
        )}
        {!selectedJob && workerTab === "schedule" ? (
          <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
            <div>
              <p className={cn(WG_TYPE_TITLE, "text-lg mb-0.5")}>Twój grafik</p>
              <p className="text-xs text-muted-foreground">
                {weekFrom ? `Tydzień ${fmtDate(weekFrom)} – ${fmtDate(weekTo)}` : "Ładowanie…"}
              </p>
            </div>
            {payrollLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : !currentWeekEmp ? (
              <WgEmptyState
                icon={CalendarDays}
                title="Brak wpisu w tym tygodniu"
                description="Administrator musi dodać Cię do listy płac — wtedy grafik pojawi się tutaj."
                className="bg-card border border-border/60 rounded-2xl"
              />
            ) : (
              <div className="space-y-2">
                {scheduleColumns.map((col) => {
                  const cell = scheduleCellFor(currentWeekEmp, col.key, col.iso, jobs, []);
                  const isToday = col.iso === todayIsoDate();
                  return (
                    <WgCard
                      key={col.key}
                      elevation="soft"
                      padding="sm"
                      radius="lg"
                      className={cn(
                        "px-4 py-3.5",
                        isToday ? "border-primary/40 bg-primary/5" : "",
                        cell.working ? "" : "opacity-50",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={cn("text-sm font-semibold", isToday ? "text-primary" : "")}>
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
                    </WgCard>
                  );
                })}
              </div>
            )}
          </div>
        ) : !selectedJob && workerTab === "pay" ? (
          <div className="max-w-lg mx-auto px-4 pt-6 space-y-4 worker-pay-sensitive">
            <WgCard elevation="soft" padding="sm" radius="md" className="flex items-start gap-2 bg-amber-500/10 border-amber-500/25 px-3 py-2.5">
              <Lock size={14} className="text-amber-400 shrink-0 mt-0.5"/>
              <p className="text-[11px] text-amber-400/90 leading-relaxed">
                Kwoty wypłat są poufne. Zakaz zrzutów ekranu i udostępniania. Przy przełączeniu aplikacji dane są ukrywane.
              </p>
            </WgCard>

            {payrollLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : (
              <>
                {currentPay && weekFrom ? (
                  <WgKpi
                    label="Ten tydzień"
                    value={`${fmt(currentPay.netPay)} PLN`}
                    hint={`Wypłata w piątek · ${fmtDate(fridayPayDate)}`}
                    icon={Wallet}
                    status={currentWeekEmp?.settled ? "ok" : "info"}
                    className="bg-primary/5"
                  >
                    <p className="text-xs text-muted-foreground">
                      Tydzień {fmtDate(weekFrom)} – {fmtDate(weekTo)} · {fmtH(currentPay.totalHours)}
                      {currentPay.rateNum > 0 && ` · ${fmt(currentPay.rateNum)} PLN/h`}
                    </p>
                    {currentPay.totalZaliczka > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Zaliczki: −{fmt(currentPay.totalZaliczka)} PLN · brutto {fmt(currentPay.grossPay)} PLN
                      </p>
                    )}
                    {currentPay.totalExtraCosts > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Koszty do zwrotu (zaakceptowane): +{fmt(currentPay.totalExtraCosts)} PLN
                      </p>
                    )}
                    {pendingExtraCosts.length > 0 && (
                      <p className="text-xs text-yellow-400/90">
                        Oczekuje na akceptację: {pendingExtraCosts.length} paragon(ów)
                      </p>
                    )}
                    {currentWeekEmp?.settled && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/15 text-green-400 w-fit">
                        <CheckCircle2 size={11}/> Rozliczone
                      </span>
                    )}
                  </WgKpi>
                ) : (
                  <WgCard elevation="soft" padding="md" radius="lg" className="border-primary/25 bg-primary/5">
                    <p className={cn(WG_TYPE_LABEL, "text-primary mb-2 flex items-center gap-2")}>
                      <Wallet size={14}/>Ten tydzień
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Nie ma Cię jeszcze na liście płac w tym tygodniu. Administrator musi dodać Cię w panelu — wtedy kwota pojawi się tutaj automatycznie.
                    </p>
                  </WgCard>
                )}

                <WgCard elevation="soft" padding="sm" radius="lg" className="overflow-hidden !p-0">
                  <div className="px-4 py-3.5 border-b border-border/60">
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
                        <WgField
                          type="text"
                          value={receiptDesc}
                          onChange={(e) => setReceiptDesc(e.target.value)}
                          placeholder="Opis (np. chemia, paliwo)"
                          className="!space-y-0"
                          controlClassName="h-11 bg-secondary/50 text-sm"
                        />
                        <div className="flex gap-2 items-stretch">
                          <WgField
                            type="number"
                            min={0}
                            step={1}
                            value={receiptAmount}
                            onChange={(e) => setReceiptAmount(e.target.value)}
                            placeholder="Kwota PLN"
                            className="flex-1 !space-y-0"
                            controlClassName="h-11 bg-secondary/50 text-sm font-mono"
                          />
                          <label
                            className={cn(
                              "inline-flex items-center justify-center gap-2 h-11 px-4 shrink-0 cursor-pointer",
                              "rounded-2xl bg-primary text-primary-foreground text-sm font-semibold",
                              `transition-all ${WG_DURATION_HOVER}`,
                              WG_FOCUS_RING,
                              WG_TOUCH_MIN,
                              receiptUploading ? "opacity-50 pointer-events-none" : "hover:bg-primary/90",
                            )}
                          >
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
                          <p className={cn("text-xs text-destructive bg-destructive/10 px-3 py-2", WG_RADIUS_LG)}>{receiptError}</p>
                        )}
                      </>
                    )}
                    {myExtraCosts.length > 0 && (
                      <div className={cn("divide-y divide-border border border-border/60 overflow-hidden", WG_RADIUS_LG)}>
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
                                <span className={cn(
                                  "inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                                  st === "approved" ? "bg-green-500/15 text-green-400"
                                  : st === "pending" ? "bg-yellow-500/15 text-yellow-400"
                                  : "bg-red-500/15 text-red-400",
                                )}>
                                  {EXTRA_COST_STATUS_LABELS[st]}
                                </span>
                                {st === "rejected" && cost.rejectReason && (
                                  <p className="text-[10px] text-red-400/90 mt-1 italic">Powód: {cost.rejectReason}</p>
                                )}
                              </div>
                              {(st === "pending" || st === "rejected") && (
                                <WgButton
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeMyExtraCost(cost.id)}
                                  className="text-muted-foreground hover:text-destructive shrink-0"
                                  aria-label="Usuń koszt"
                                >
                                  <Trash2 size={13}/>
                                </WgButton>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </WgCard>

                <WgCard elevation="soft" padding="sm" radius="lg" className="overflow-hidden !p-0">
                  <WgButton
                    type="button"
                    variant="ghost"
                    onClick={() => setShowPayHistory((v) => !v)}
                    className={cn(
                      "w-full h-auto min-h-[48px] px-4 py-3.5 justify-between rounded-none",
                      `transition-colors ${WG_DURATION_HOVER}`,
                      "hover:bg-secondary/30",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Archive size={14} className="text-muted-foreground"/>
                      <span className="text-sm font-semibold text-foreground">Archiwum wypłat</span>
                      {payHistory.length > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{payHistory.length}</span>
                      )}
                    </div>
                    {showPayHistory ? <ChevronUp size={16} className="text-muted-foreground"/> : <ChevronDown size={16} className="text-muted-foreground"/>}
                  </WgButton>
                  {showPayHistory && (
                    <div className="border-t border-border/60 divide-y divide-border">
                      {payHistory.length === 0 ? (
                        <WgEmptyState
                          icon={Archive}
                          title="Brak zapisanych tygodni w archiwum."
                          className="py-8"
                        />
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
                </WgCard>
              </>
            )}
          </div>
        ) : !selectedJob ? (
          <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
            {todayWork.working ? (
              <div className={cn("bg-primary/10 border border-primary/25 px-4 py-3.5 space-y-1.5", WG_RADIUS_LG)}>
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
              <div className={cn("bg-secondary/40 border border-border px-4 py-3 text-xs text-muted-foreground", WG_RADIUS_LG)}>
                <span className="font-medium text-foreground/80">Gdzie dziś pracuję?</span> — brak wpisu na dziś w grafiku i na robotach.
              </div>
            )}
            <div>
              <p className={cn(WG_TYPE_TITLE, "text-lg mb-0.5")}>Wybierz robotę</p>
              <p className="text-xs text-muted-foreground">Zdjęcia, zakres prac i wymiary mieszkania</p>
            </div>
            <WgField
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj adresu lub klienta..."
              aria-label="Szukaj adresu lub klienta"
              className="relative w-full !space-y-0"
              controlClassName="h-11 min-h-[44px] rounded-xl bg-secondary/50"
              leading={
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  aria-hidden
                />
              }
            />
            {jobsLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : activeJobs.length === 0 ? (
              <WgEmptyState
                icon={MapPin}
                title="Brak aktywnych robót"
                description="Administrator musi dodać robotę ze statusem „w trakcie” w panelu."
              />
            ) : (
              <div className="space-y-6">
                {myContractJobs.length > 0 && (
                  <div className="space-y-2">
                    <div className="border-b border-border pb-2">
                      <p className="text-sm font-bold text-foreground">Twoje kontrakty</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Przypisane do planowej ekipy realizacji
                      </p>
                    </div>
                    <div className="space-y-2">{myContractJobs.map((j) => renderWorkerJobCard(j, true))}</div>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="border-b border-border pb-2">
                    <p className="text-sm font-bold text-foreground">Wszystkie roboty w toku</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Zdjęcia i dokumentacja — jak dotychczas
                    </p>
                  </div>
                  <div className="space-y-2">{activeJobs.map(renderWorkerJobCard)}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-lg mx-auto px-4 pt-4 space-y-5">
            <WgCard elevation="soft" padding="md" radius="lg" className="px-5 py-4">
              <p className={cn(WG_TYPE_TITLE, "text-base font-bold")}>{selectedJob.address||"Bez adresu"}{selectedJob.flatNumber&&` m.${selectedJob.flatNumber}`}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedJob.client||"—"} · Rozpoczęto {fmtDate(selectedJob.startDate)}</p>
            </WgCard>

            <WorkerEducationBanner />
            <WorkerJobProgressFlow steps={workerProgress.steps} />
            <WorkerStepCta allComplete={workerProgress.allComplete} nextStep={workerProgress.nextStep} mode="action" />

            {uploading && (
              <div className={cn("bg-primary/10 border border-primary/20 px-4 py-3 flex items-center gap-3", WG_RADIUS_LG)}>
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0"/>
                <p className="text-sm text-primary">
                  Wgrywanie… {uploadedCount}{uploadTotal > 0 ? ` / ${uploadTotal}` : ""} zdjęć
                </p>
              </div>
            )}
            {uploadError && <p className={cn("text-xs text-destructive bg-destructive/10 px-3 py-2", WG_RADIUS_LG)}>{uploadError}</p>}

            <div id="worker-section-photos" className="scroll-mt-4 space-y-5">
            <WgCard elevation="soft" padding="sm" radius="lg" className="border-primary/25 space-y-4">
              <div>
                <p className="text-sm font-semibold flex items-center gap-2"><ImagePlus size={16} className="text-primary"/>Galeria — wiele zdjęć</p>
                <p className="text-xs text-muted-foreground mt-1">Zaznacz wiele zdjęć z telefonu naraz, podejrzyj i wyślij jednym kliknięciem.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {LABELS.map((lbl) => (
                  <WgButton
                    key={lbl.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setGalleryLabel(lbl.value)}
                    className={cn(
                      "rounded-full text-sm px-3 min-h-[44px] h-11 touch-manipulation",
                      `transition-colors ${WG_DURATION_HOVER}`,
                      galleryLabel === lbl.value
                        ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15"
                        : "text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {lbl.title}
                  </WgButton>
                ))}
              </div>
              <HiddenFileInput multiple onPick={onGalleryPick}>
                {(open) => (
                  <WgButton
                    type="button"
                    variant={galleryPicks.length > 0 ? "secondary" : "primary"}
                    size="lg"
                    onClick={open}
                    className={cn(
                      "w-full gap-2 text-sm font-semibold",
                      "active:scale-[0.98] motion-reduce:active:scale-100",
                      `transition-all ${WG_DURATION_HOVER}`,
                    )}
                  >
                    <ImagePlus size={18}/>
                    Wybierz z galerii ({galleryPicks.length || "wiele"})
                  </WgButton>
                )}
              </HiddenFileInput>
              {galleryPicks.length > 0 && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {galleryPicks.map((pick, i) => (
                      <div key={pick.preview} className={cn("flex gap-2 items-start bg-secondary/40 p-2", WG_RADIUS_LG)}>
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary border border-border shrink-0">
                          <img src={pick.preview} alt="" className="w-full h-full object-cover"/>
                        </div>
                        <WgField
                          type="text"
                          value={pick.caption}
                          onChange={(e) => setGalleryPicks((prev) => prev.map((p, j) => j === i ? { ...p, caption: e.target.value } : p))}
                          placeholder="Opis zdjęcia (opcjonalnie)"
                          className="flex-1 !space-y-0"
                          controlClassName="h-10 bg-background px-2.5 py-2 text-xs rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <WgButton
                      type="button"
                      variant="primary"
                      size="lg"
                      onClick={submitGallery}
                      disabled={uploading}
                      className="flex-1 text-sm font-semibold"
                    >
                      Wyślij {galleryPicks.length} zdjęć
                    </WgButton>
                    <WgButton
                      type="button"
                      variant="outline"
                      onClick={clearGallery}
                      disabled={uploading}
                      className="px-4 h-14 text-sm text-muted-foreground"
                    >
                      Anuluj
                    </WgButton>
                  </div>
                </div>
              )}
            </WgCard>

            <div>
              <p className={cn(WG_TYPE_LABEL, "mb-2")}>Szybki aparat (pojedynczo)</p>
              <WgField
                type="text"
                value={quickPhotoCaption}
                onChange={(e) => setQuickPhotoCaption(e.target.value)}
                placeholder="Opis do następnych zdjęć z aparatu (opcjonalnie)"
                className="mb-2 !space-y-0"
                controlClassName="h-11 bg-secondary/50 text-xs"
              />
              <div className="space-y-2">
                {LABELS.map(lbl => (
                  <label
                    key={lbl.value}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3 border cursor-pointer",
                      `transition-all ${WG_DURATION_HOVER}`,
                      "hover:opacity-90 active:scale-[0.98] motion-reduce:active:scale-100",
                      WG_RADIUS_LG,
                      lbl.color,
                    )}
                  >
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
                    <WgCard key={p.id} elevation="soft" padding="sm" radius="md" className="flex gap-3 !p-3">
                      <div className={cn("w-20 h-20 overflow-hidden bg-secondary shrink-0", WG_RADIUS_LG)}>
                        <JobPhotoImg src={p.publicUrl} alt={p.label} className="w-full h-full object-cover"/>
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            {p.label==="before"?"Przed":p.label==="after"?"Po":"W trakcie"} · {fmtDate(p.uploadedAt.slice(0,10))}
                          </span>
                          <span className={cn(
                            "text-[9px] font-bold px-2 py-0.5 rounded-full",
                            p.status==="approved"?"bg-green-500/15 text-green-400"
                            :p.status==="rejected"?"bg-red-500/15 text-red-400"
                            :"bg-yellow-500/15 text-yellow-400",
                          )}>
                            {PHOTO_STATUS_LABELS[p.status]}
                          </span>
                        </div>
                        {p.status==="rejected" && p.rejectReason && (
                          <p className="text-[10px] text-red-400/90 italic leading-snug">Powód odrzucenia: {p.rejectReason}</p>
                        )}
                        <WgField
                          type="text"
                          defaultValue={p.caption || ""}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (v !== (p.caption || "")) updateMyPhoto(p.id, { caption: v });
                          }}
                          placeholder="Opis zdjęcia (opcjonalnie)"
                          className="!space-y-0"
                          controlClassName="h-9 bg-secondary/50 px-2.5 py-1.5 text-xs rounded-lg"
                        />
                        <WgButton
                          type="button"
                          variant="ghost"
                          onClick={() => deleteMyPhoto(p.id)}
                          className={cn("text-xs text-muted-foreground hover:text-destructive gap-1.5 px-1 -ml-1 h-11", WG_TOUCH_MIN)}
                        >
                          <Trash2 size={14}/>Usuń zdjęcie
                        </WgButton>
                      </div>
                    </WgCard>
                  ))}
                </div>
              </div>
            )}
            </div>

            <div id="worker-section-documentation" className="scroll-mt-4 space-y-4">
            {myReports.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-3">Twoja dokumentacja ({myReports.length})</p>
                <div className="space-y-2">
                  {[...myReports].reverse().map((r) => (
                    <WgCard
                      key={r.id}
                      elevation="soft"
                      padding="sm"
                      radius="md"
                      className={cn(
                        "px-4 py-3 text-sm",
                        editingReport?.id === r.id ? "border-primary/50" : "",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{fmtDate(r.submittedAt.slice(0, 10))}{r.updatedAt && " · edyt."}</p>
                          {reportHasWorkScope(r) && (
                            <p className="text-xs text-foreground/90 mt-1 line-clamp-3 whitespace-pre-wrap">{getReportWorkScopeText(r)}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <WgButton
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingReport(normalizeWorkerReport(r))}
                            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title="Edytuj"
                          >
                            <Edit2 size={16}/>
                          </WgButton>
                          <WgButton
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMyReport(r.id)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Usuń"
                          >
                            <Trash2 size={16}/>
                          </WgButton>
                        </div>
                      </div>
                    </WgCard>
                  ))}
                </div>
              </div>
            )}

            <WgCard elevation="soft" padding="sm" radius="lg" className="border-primary/25">
              <p className="text-sm font-semibold flex items-center gap-2 mb-3">
                <ClipboardList size={16} className="text-primary"/>
                {editingReport ? "Edytuj dokumentację" : "Dokumentacja robót"}
              </p>
              <JobReportForm
                key={`${selectedJob.id}-${editingReport?.id || "new"}`}
                jobId={selectedJob.id}
                authorName={workerName}
                editReport={editingReport}
                onCancelEdit={() => setEditingReport(null)}
                onSaved={handleReportSaved}
                submitLabel={editingReport ? "Zapisz zmiany" : "Wyślij dokumentację do admina"}
                description={editingReport ? undefined : "Zakres prac, wymiary i obrys lokalu — admin zobaczy przy tej robocie."}
                disabled={uploading}
                layout="worker"
              />
            </WgCard>
            </div>

            <WorkerStepCta allComplete={workerProgress.allComplete} nextStep={workerProgress.nextStep} mode="complete" />
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
