import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { FileText, ClipboardList, FileCheck, MessageSquare } from "lucide-react";
import { InspectorCommandLayer } from "@/app/inspector/InspectorCommandLayer";
import { InspectorShell } from "@/app/inspector/InspectorShell";
import { InspectorSidebar } from "@/app/inspector/InspectorSidebar";
import { InspectorViewRouter } from "@/app/inspector/InspectorViewRouter";
import { InspectorJobWorkspace } from "@/app/inspector/InspectorJobWorkspace";
import { InspectorOverlays } from "@/app/inspector/InspectorOverlays";
import { useInspectorDataSync, type InspectorJob } from "@/app/inspector/useInspectorDataSync";
import type { AdminSession } from "@/lib/admin-auth";
import {
  filterJobsForInspector,
  isJobVisibleToInspector,
} from "@/lib/inspector-job-assignment";
import { countUnreadOperationalNotes } from "@/lib/operational-notes-read-state";
import {
  buildRecoverableStatsByJobId,
  recoverableChargeDescriptionLine,
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
import {
  DOC_LABELS,
  REQUIRED_DOCS,
  type DocType,
  type JobFileAttachment,
  isReportSyncedDocLocked,
  applyJobFileKindUpload,
  resolveJobFileStoragePath,
} from "@/lib/job-documents";
import { computeInspectorDashboardStats } from "@/lib/inspector-dashboard";
import { uploadJobFile, deleteJobFile } from "@/lib/job-file-upload";
import { uploadInspectorPhoto } from "@/lib/job-photo-upload";
import {
  inferHandoverStage,
  plannedHandoverStatus,
  jobsWithAdminNotesNeedingInspector,
  type InspectorPhotoLabel,
  type JobHandoverStage,
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
import { PwaInstallBanner } from "@/app/PwaInstallBanner";
import { queuePhoto, listQueuedPhotos, removeQueuedPhoto } from "@/lib/photo-queue";
import { onNativeAppResume, registerNativeBackHandler } from "@/lib/native-app-bridge";
import { usePullToRefresh } from "@/app/usePullToRefresh";
import { toast } from "sonner";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { loadAppSettingsLocal, syncAppSettingsFromCloud } from "@/lib/app-settings";

const TAB_RETURN_LABELS: Record<InspectorMainTab, string> = {
  dashboard: "Pulpitu",
  jobs: "listy robót",
  gallery: "Galerii",
  files: "Plików",
  portfolio: "Portfolio WM",
};

export function InspectorPanel({
  session,
  onLogout,
}: {
  session: AdminSession;
  onLogout: () => void;
}) {
  const inspectorId = session.id;
  const displayName = session.displayName;
  const [msg, setMsg] = useState("");
  const {
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
  } = useInspectorDataSync({ onRefreshError: setMsg });
  const [packageDownloadBusy, setPackageDownloadBusy] = useState(false);
  const [operationalNotesOpen, setOperationalNotesOpen] = useState(false);
  const [mainTab, setMainTab] = useState<InspectorMainTab>("dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const prevAdminNotesCountRef = useRef<number | null>(null);
  const [notesSeenTick, setNotesSeenTick] = useState(0);
  const [stageSuggestion, setStageSuggestion] = useState<{ jobId: string; stage: JobHandoverStage } | null>(null);
  const jobScrollRef = useRef<HTMLDivElement>(null);
  const jobsSnapshotRef = useRef(jobsAll);
  jobsSnapshotRef.current = jobsAll;
  const flushingPhotoQueueRef = useRef(false);
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

  const scrollToJobSection = useCallback((id: InspectorJobSection) => {
    setJobSection(id);
    jobScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const directoryContacts = useMemo(
    () => directory.map((d) => ({ name: d.name, phone: d.phone })),
    [directory],
  );

  const operationalNotesUnread = useMemo(
    () => countUnreadOperationalNotes(operationalNotes, operationalNotesReadState, session, { visibleJobIds }),
    [operationalNotes, operationalNotesReadState, session, visibleJobIds],
  );

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

  const recoverableStatsByJobId = useMemo(
    () => buildRecoverableStatsByJobId(jobsVisible, recoverableCharges),
    [jobsVisible, recoverableCharges],
  );

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
    const job = jobsSnapshotRef.current.find((j) => j.id === selectedId);
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
    const job = jobsSnapshotRef.current.find((j) => j.id === selectedId);
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
        const job = jobsSnapshotRef.current.find((j) => j.id === item.jobId);
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
    const job = jobsSnapshotRef.current.find((j) => j.id === jobId);
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
    <div className="relative min-h-0">
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
            cloudStatus={cloudStatus}
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
          inspectorUserId={inspectorId}
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

      <InspectorOverlays
        selectedJob={selectedJob}
        loading={loading}
        syncing={syncing}
        lightbox={lightbox}
        onCloseLightbox={() => setLightbox(null)}
        previewItem={previewItem}
        athPreviewEnabled={athPreviewEnabled}
        onClosePreview={() => setPreviewItem(null)}
        jobs={jobsVisible}
        onQuickPhotoUpload={handleQuickPhotoUpload}
        operationalNotesOpen={operationalNotesOpen}
        onCloseOperationalNotes={() => setOperationalNotesOpen(false)}
        session={session}
        operationalNotes={operationalNotes}
        operationalNotesReadState={operationalNotesReadState}
        operationalNotesAuditLog={operationalNotesAuditLog}
        onChangeNotes={setOperationalNotes}
        onChangeReadState={setOperationalNotesReadState}
        onChangeAuditLog={setOperationalNotesAuditLog}
        onCommitOperationalNotes={commitOperationalNotes}
      />
    </div>
  );
}
