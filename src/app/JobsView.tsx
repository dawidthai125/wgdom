import { useState, useCallback, useMemo, useEffect, useRef, Fragment } from "react";
import {
  Plus, Trash2, ChevronRight, ChevronLeft, FileText, FileDown, CheckCircle2, Archive,
  ChevronDown, ChevronUp, Calendar, CalendarDays, X, Phone, Edit2, Check, Building2,
  MapPin, KeyRound, HardHat, StickyNote, Cloud, Download, Upload, Mail, Send,
  Camera, ImagePlus, Eye, ArrowLeft, ClipboardList, Ruler, Images, FolderOpen, Package,
  Receipt, AlertTriangle, Copy, Sparkles, Clock, Users, Banknote, Scale, Briefcase, MessageSquare, ScrollText,
  ClipboardCheck, Bell, Circle,
} from "lucide-react";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { useWheelScrollForward } from "@/lib/wheel-scroll-forward";
import { registerNativeBackHandler } from "@/lib/native-app-bridge";
import { useAdminAccess } from "@/app/admin-access";
import { adminIsSuperAdmin } from "@/lib/admin-auth";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";
import { JobCostBreakdownPanel } from "@/app/JobCostBreakdownPanel";
import { JobRecoverableChargesPanel, type BillingNotePendingFiles } from "@/app/JobRecoverableChargesPanel";
import {
  JobOperationalNotesPanel,
  operationalNoteCreatePresetForJob,
} from "@/app/JobOperationalNotesPanel";
import { JobWmPrintHistoryPanel } from "@/app/JobWmPrintHistoryPanel";
import type { AdminSession } from "@/lib/admin-auth";
import type { OperationalNote } from "@/lib/operational-notes";
import { JobCreateRecoverableChargeModal } from "@/app/JobCreateRecoverableChargeModal";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { JobInspectorFilesPanel } from "@/app/JobInspectorFilesPanel";
import { collectActiveJobAttachments } from "@/lib/job-attachments-pack";
import { JobListPrimaryBadge, JobPhasePicker, applyJobPhase } from "@/app/JobListStatus";
import { JobListCardV2 } from "@/app/JobListCardV2";
import { JobListPanelHeader } from "@/app/JobListPanelHeader";
import { JobQueueSections } from "@/app/JobQueueSections";
import { JobListGuidePanel } from "@/app/JobListGuidePanel";
import { JobAllFilesView } from "@/app/JobAllFilesView";
import { JobFilesHub } from "@/app/JobFilesHub";
import { JobDetailSectionNav, JobsDetailEmptyState, type JobDetailSection } from "@/app/JobDetailSectionNav";
import { InspectorJobFileUpload } from "@/app/InspectorJobFileUpload";
import { JobMetaPickers, JobMetaBadges } from "@/app/JobMetaPickers";
import { WorkScopeEditor, WorkScopeDisplay } from "@/app/WorkScopeEditor";
import { JobWorkerReportsPanel } from "@/app/JobWorkerReportsPanel";
import { JobPhotoGallery } from "@/app/JobPhotoGallery";
import { JobPhotoImg } from "@/app/JobPhotoImg";
import { filterAvailablePhotos, isMediaAttachmentAvailable } from "@/lib/media-filter";
import { uploadPhoto, prepareWatermarkedPhoto } from "@/app/app-domain";
import { JobWmStageBadge, JobWmPlannedBadge } from "@/app/JobWmPanel";
import { HiddenFileInput } from "@/app/HiddenFileInput";
import { LabelWithHint, VoiceNoteButton } from "@/app/app-ui";
import { appendJobActivity, isInspectorActivityType, type JobActivityType } from "@/lib/job-activity";
import { countBrowserFiles, jobHasBrowserFiles } from "@/lib/job-files-browser";
import { countFilesHubItems, countAllFilesHubItems } from "@/lib/files-hub-index";
import { downloadJobGalleryZip } from "@/lib/photo-download";
import { isPdfFilename, isKosztorysPreviewExt } from "@/lib/ath-parser";
import {
  latestJobFile, syncJobDocuments, isReportSyncedDocLocked, confirmReportSyncedDocUncheck,
  applyReportDocDocumentToggle, clearReportDocSaOverrideFromReport, removeJobFileAttachmentWithTombstone,
  applyJobFileKindUpload,
  resolveJobFileStoragePath,
  jobFileUploadActivityText,
  RYSUNEK_PLAN_CHECKLIST_HELP,
  type JobFileKind,
  type JobFileAttachment,
} from "@/lib/job-documents";
import { deleteJobFile, uploadJobFile } from "@/lib/job-file-upload";
import { collectJobFileCatalog, type JobFileCatalogItem } from "@/lib/job-files-index";
import { countJobImages } from "@/lib/media-separation";
import {
  countJobsByListFilter, inferJobPhase, jobMissingRequiredDocs,
  JOB_PHASE_LABELS, type JobListFilter, type JobPhase,
} from "@/lib/job-list-status";
import {
  buildJobQueueSections,
  computeJobListOpsKpi,
  filterJobsForListView,
  sortJobsInMonthGroup,
  wmOverdueJobIdSet,
  type JobListViewMode,
  type JobOpsChip,
} from "@/lib/job-list-ops";
import {
  normalizeJobMetaFields,
  isJobHousingSet,
  HOUSING_TYPE_LABELS,
  STOVE_TYPE_LABELS_FULL,
  GAS_FURNACE_STATUS_LABELS,
} from "@/lib/job-meta";
import {
  getReportWorkScopeText, reportHasWorkScope, scopeTextHasContent, scopeTextLineCount,
  scopeTextToWorkItems, workItemsToScopeText,
} from "@/lib/work-scope-text";
import { contactsForJobs, contactAllowsJobs, type EmailContact } from "@/lib/email-contacts";
import { JobInspectorContactModal } from "@/app/JobInspectorContactModal";
import { inspectorTemplateActivityText, type InspectorTemplateId } from "@/lib/inspector-message-templates";
import { API_BASE, API_HEADERS, addDeletedJobId, getDeletedJobIds, pushJobsAfterDelete } from "@/lib/cloud-sync";
import {
  normalizeJobWmFields, isWmClient, fmtPlannedHandover, HANDOVER_STAGE_LABELS,
  inferHandoverStage, removeInspectorPhoto, canShowStartExecutionButton, startJobExecution,
  assignExecutionTeam, appendBillingJobNote, buildBillingJobNote,
  approveBillingProposalNote, rejectBillingProposalNote, updateJobBillingProposalNote,
  billingProposalApprovedActivityText, billingProposalRejectedActivityText,
  isBillingProposalNote, isBillingProposalPending, normalizeBillingProposalNote,
} from "@/lib/job-wm";
import {
  recoverableChargeDescriptionLine,
  createChargeDraftFromProposal,
  finalizeRecoverableChargeDraftForSave,
  findRecoverableChargeByProposalId,
} from "@/lib/recoverable-charges";
import {
  type Job, type WeekEmployee, type DirectoryEmployee, type PhotoEntry, type WorkEntry, type DocType,
  DOCUMENT_TYPES, DOC_LABELS, REQUIRED_DOCS, DEFAULT_JOB_ENTRY_HOURS,
  fmt, fmtDate, fmtH, localIsoDate, defaultJob, normalizeJob, jobDisplayTitle, jobTotalHours,
  jobCost, jobTotalCost, jobMaterialsCost, jobApprovedPhotos, jobWorkerReports, reportNeedsAdminAttention,
  jobDaysSinceStart, jobDuration, jobGalleryBucket, galleryDaysUntilArchive,
  formatJobStreet, clientShareUrl, clientShareToken, workEntriesFromPayrollForDate,
  duplicateWorkEntryWithPayrollHours, collectEntriesFromYesterday, groupWorkEntriesByEmployee, ACTIVITY_LABELS,
  calcWeekEmployee, workItemHasContent, roomHasContent, jobAddressKey, roomDisplayName,
  duplicateWorkEntry, payrollHoursForDirectoryOnDate, DEFAULT_MULTI_SITE_VISIT_HOURS,
  jobActiveWorkerCountOnDate,
  PHOTO_LABEL_NAMES, PHOTO_LABEL_ORDER, getAppPhotoLabelSection, filterProductionActiveDirectory, MONTH_NAMES,
} from "@/app/app-domain";
import {
  type RecoverableCharge,
  type RecoverableChargeJobStats,
  appendRecoverableChargeCreate,
  getRecoverableChargeJobStats,
  validateRecoverableChargeDraft,
} from "@/lib/recoverable-charges";

export function jobEmailDefaultSubject(job: Job): string {
  const addr = `${job.address || "Robota"}${job.flatNumber ? ` m.${job.flatNumber}` : ""}`;
  return `W&G DOM — ${addr}`;
}

export function collectJobEmailSelectableKeys(job: Job): EmailSelectKey[] {
  const keys: EmailSelectKey[] = [];
  for (const p of filterAvailablePhotos((job.photos || []).filter((ph) => ph.status !== "rejected"))) {
    keys.push(`p:${p.id}`);
  }
  for (const report of jobWorkerReports(job)) {
    if (reportHasWorkScope(report)) keys.push(`ws:${report.id}`);
    for (const item of report.workItems.filter(workItemHasContent)) {
      keys.push(`wi:${report.id}:${item.id}`);
    }
    if (report.generalNote?.trim()) keys.push(`gn:${report.id}`);
    let pokojIdx = 0;
    for (const room of report.rooms.filter(roomHasContent)) {
      const idx = room.roomType === "pokoj" ? pokojIdx++ : 0;
      void idx;
      keys.push(`rm:${report.id}:${room.id}`);
    }
    if (report.sketch && isMediaAttachmentAvailable(report.sketch)) keys.push(`sk:${report.id}`);
  }
  return keys;
}

export function buildJobEmailPayload(
  job: Job,
  selected: Set<EmailSelectKey>,
  to: string,
  toName: string,
  subject: string,
  introMessage: string,
) {
  const photos = filterAvailablePhotos(
    (job.photos || []).filter((p) => selected.has(`p:${p.id}`)),
  ).map((p) => ({
      publicUrl: p.publicUrl,
      label: p.label,
      caption: p.caption,
      uploadedBy: p.uploadedBy,
    }));

  const reportMap = new Map<string, {
    workerName: string;
    date: string;
    workItems: { text: string; note?: string }[];
    rooms: { name: string; length: string; width: string; height: string; note?: string }[];
    sketch?: { publicUrl: string; note?: string };
    generalNote?: string;
  }>();

  for (const report of jobWorkerReports(job)) {
    const scopeSelected = selected.has(`ws:${report.id}`);
    const workItems = report.workItems
      .filter((item) => workItemHasContent(item) && (scopeSelected || selected.has(`wi:${report.id}:${item.id}`)))
      .map((item) => ({ text: item.text, note: item.note || undefined }));

    const rooms: { name: string; length: string; width: string; height: string; note?: string }[] = [];
    let pokojIdx = 0;
    for (const room of report.rooms.filter(roomHasContent)) {
      const idx = room.roomType === "pokoj" ? pokojIdx++ : 0;
      if (selected.has(`rm:${report.id}:${room.id}`)) {
        rooms.push({
          name: roomDisplayName(room, idx),
          length: room.length,
          width: room.width,
          height: room.height,
          note: room.note || undefined,
        });
      }
    }

    const sketch = selected.has(`sk:${report.id}`) && report.sketch && isMediaAttachmentAvailable(report.sketch)
      ? { publicUrl: report.sketch.publicUrl, note: report.sketchNote || undefined }
      : undefined;

    const generalNote = selected.has(`gn:${report.id}`) && report.generalNote?.trim()
      ? report.generalNote.trim()
      : undefined;

    if (workItems.length > 0 || rooms.length > 0 || sketch || generalNote) {
      reportMap.set(report.id, {
        workerName: report.workerName,
        date: fmtDate(report.submittedAt.slice(0, 10)),
        workItems,
        rooms,
        sketch,
        generalNote,
      });
    }
  }

  const reportSections = Array.from(reportMap.values()).map((sec) => ({
    workerName: sec.workerName,
    date: sec.date,
    workItems: sec.workItems.length > 0 ? sec.workItems : undefined,
    rooms: sec.rooms.length > 0 ? sec.rooms : undefined,
    sketch: sec.sketch,
    generalNote: sec.generalNote,
  }));

  return {
    to,
    toName: toName || undefined,
    subject: subject.trim() || jobEmailDefaultSubject(job),
    introMessage: introMessage.trim() || undefined,
    jobHeader: {
      address: job.address,
      flatNumber: job.flatNumber,
      client: job.client,
    },
    photos,
    reportSections,
  };
}

export function JobEmailModal({
  job,
  contacts,
  onClose,
  onManageContacts,
  onSent,
}: {
  job: Job;
  contacts: EmailContact[];
  onClose: () => void;
  onManageContacts: () => void;
  onSent?: (to: string) => void;
}) {
  const allKeys = useMemo(() => collectJobEmailSelectableKeys(job), [job]);
  const [selected, setSelected] = useState<Set<EmailSelectKey>>(() => new Set(allKeys));
  const [contactId, setContactId] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [subject, setSubject] = useState(() => jobEmailDefaultSubject(job));
  const [introMessage, setIntroMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const validContacts = contactsForJobs(contacts);
  const useManual = contactId === "__manual__";
  const selectedContact = validContacts.find((c) => c.id === contactId) || null;
  const recipientEmail = useManual ? manualEmail.trim() : (selectedContact?.email.trim() || "");

  const toggleKey = (key: EmailSelectKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allKeys));
  const selectNone = () => setSelected(new Set());

  const selectionCount = selected.size;
  const canSend = recipientEmail.length > 0 && selectionCount > 0 && !sending;

  const handleSend = async () => {
    setError("");
    if (!recipientEmail) {
      setError("Wybierz odbiorcę lub wpisz adres email.");
      return;
    }
    if (selectionCount === 0) {
      setError("Zaznacz co najmniej jedną pozycję do wysłania.");
      return;
    }

    const payload = buildJobEmailPayload(
      job,
      selected,
      recipientEmail,
      selectedContact?.name || "",
      subject,
      introMessage,
    );

    const hasContent = payload.photos.length > 0 || payload.reportSections.some(
      (s) => (s.workItems?.length || 0) > 0 || (s.rooms?.length || 0) > 0 || s.sketch || s.generalNote,
    );
    if (!hasContent) {
      setError("Wybrane pozycje nie zawierają treści — zaznacz coś innego.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/send-job-email`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Błąd wysyłki (${res.status})`);
      }
      setSuccess(true);
      onSent?.(recipientEmail);
      setTimeout(onClose, 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się wysłać emaila.");
    } finally {
      setSending(false);
    }
  };

  if (allKeys.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
        <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Wyślij email z roboty</p>
              <p className="text-xs text-muted-foreground mt-1">Na tej robocie nie ma jeszcze zdjęć ani raportów do wysłania.</p>
            </div>
            <button type="button" onClick={onClose} className="touch-target p-1 rounded-lg hover:bg-secondary text-muted-foreground"><X size={16}/></button>
          </div>
          <button type="button" onClick={onClose} className="w-full py-2.5 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors">Zamknij</button>
        </div>
      </div>
    );
  }

  const reports = jobWorkerReports(job);
  const photos = filterAvailablePhotos(
    (job.photos || []).filter((p) => p.status !== "rejected"),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="bg-card rounded-t-2xl md:rounded-2xl border border-border w-full max-w-lg shadow-2xl max-h-[92dvh] flex flex-col">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <p className="text-sm font-semibold flex items-center gap-2"><Mail size={15} className="text-primary"/>Wyślij email</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{job.address || "Robota"}{job.flatNumber && ` m.${job.flatNumber}`}</p>
          </div>
          <button type="button" onClick={onClose} className="touch-target p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X size={16}/></button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 size={40} className="text-green-400"/>
              <p className="text-sm font-semibold">Wysłano na {recipientEmail}</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground block">Odbiorca (kontakty z uprawnieniem Roboty)</label>
                {validContacts.length === 0 ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-xs text-yellow-400/90">
                    Brak kontaktów z uprawnieniem „Roboty”.{" "}
                    <button type="button" onClick={onManageContacts} className="underline font-medium hover:text-yellow-300">Dodaj w Kontaktach</button>
                  </div>
                ) : (
                  <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none">
                    <option value="">— Wybierz z listy —</option>
                    {validContacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name || c.email}{c.company ? ` (${c.company})` : ""} — {c.email}</option>
                    ))}
                    <option value="__manual__">Inny adres…</option>
                  </select>
                )}
                {(useManual || validContacts.length === 0) && (
                  <input type="email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="email@example.com" className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"/>
                )}
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Temat</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"/>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Wiadomość (opcjonalnie)</label>
                <textarea value={introMessage} onChange={(e) => setIntroMessage(e.target.value)} rows={2} placeholder="Krótka wiadomość na początku maila..." className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none resize-none"/>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Co wysłać</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={selectAll} className="text-[10px] text-primary hover:underline">Wszystko</button>
                    <span className="text-muted-foreground/30">·</span>
                    <button type="button" onClick={selectNone} className="text-[10px] text-muted-foreground hover:underline">Nic</button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">Zaznaczono: {selectionCount} z {allKeys.length}</p>

                {photos.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Camera size={12}/>Zdjęcia ({photos.length})</p>
                    <div className="space-y-2">
                      {photos.map((p) => {
                        const key = `p:${p.id}`;
                        return (
                          <label key={p.id} className={`flex items-center gap-3 p-2 rounded-xl border cursor-pointer transition-colors ${selected.has(key) ? "border-primary/40 bg-primary/5" : "border-border hover:bg-secondary/40"}`}>
                            <input type="checkbox" checked={selected.has(key)} onChange={() => toggleKey(key)} className="shrink-0 accent-primary"/>
                            <JobPhotoImg src={p.publicUrl} alt="" className="w-12 h-12 rounded-lg object-cover bg-secondary shrink-0"/>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium">{PHOTO_LABEL_NAMES[p.label]}</p>
                              {p.caption && <p className="text-[10px] text-muted-foreground truncate">{p.caption}</p>}
                              <p className="text-[10px] text-muted-foreground">{p.uploadedBy} · {fmtDate(p.uploadedAt.slice(0, 10))}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {reports.map((report) => {
                  const reportKeys = allKeys.filter((k) => k.includes(`:${report.id}`) || k.endsWith(`:${report.id}`));
                  if (reportKeys.length === 0) return null;
                  let pokojIdx = 0;
                  return (
                    <div key={report.id} className="mb-4 border border-border rounded-xl overflow-hidden">
                      <div className="px-3 py-2 bg-secondary/40 border-b border-border">
                        <p className="text-xs font-semibold">{report.workerName}</p>
                        <p className="text-[10px] text-muted-foreground">{fmtDate(report.submittedAt.slice(0, 10))}</p>
                      </div>
                      <div className="p-2 space-y-1">
                        {reportHasWorkScope(report) && (
                          <label className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer ${selected.has(`ws:${report.id}`) ? "bg-violet-500/10" : "hover:bg-secondary/30"}`}>
                            <input type="checkbox" checked={selected.has(`ws:${report.id}`)} onChange={() => toggleKey(`ws:${report.id}`)} className="mt-0.5 shrink-0 accent-primary"/>
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Zakres wykonanych prac</p>
                              <p className="text-xs line-clamp-4 whitespace-pre-wrap">{getReportWorkScopeText(report)}</p>
                            </div>
                          </label>
                        )}
                        {!reportHasWorkScope(report) && report.workItems.filter(workItemHasContent).map((item) => {
                          const key = `wi:${report.id}:${item.id}`;
                          return (
                            <label key={item.id} className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer ${selected.has(key) ? "bg-violet-500/10" : "hover:bg-secondary/30"}`}>
                              <input type="checkbox" checked={selected.has(key)} onChange={() => toggleKey(key)} className="mt-0.5 shrink-0 accent-primary"/>
                              <div className="min-w-0">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Zakres</p>
                                <p className="text-xs">{item.text}</p>
                                {item.note && <p className="text-[10px] text-muted-foreground italic">{item.note}</p>}
                              </div>
                            </label>
                          );
                        })}
                        {report.generalNote?.trim() && (
                          <label className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer ${selected.has(`gn:${report.id}`) ? "bg-violet-500/10" : "hover:bg-secondary/30"}`}>
                            <input type="checkbox" checked={selected.has(`gn:${report.id}`)} onChange={() => toggleKey(`gn:${report.id}`)} className="mt-0.5 shrink-0 accent-primary"/>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Wiadomość</p>
                              <p className="text-xs line-clamp-2">{report.generalNote}</p>
                            </div>
                          </label>
                        )}
                        {report.rooms.filter(roomHasContent).map((room) => {
                          const idx = room.roomType === "pokoj" ? pokojIdx++ : 0;
                          const key = `rm:${report.id}:${room.id}`;
                          return (
                            <label key={room.id} className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer ${selected.has(key) ? "bg-violet-500/10" : "hover:bg-secondary/30"}`}>
                              <input type="checkbox" checked={selected.has(key)} onChange={() => toggleKey(key)} className="mt-0.5 shrink-0 accent-primary"/>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Wymiary — {roomDisplayName(room, idx)}</p>
                                <p className="text-xs font-mono">{room.length || "—"} × {room.width || "—"} × {room.height || "—"} m</p>
                              </div>
                            </label>
                          );
                        })}
                        {report.sketch && isMediaAttachmentAvailable(report.sketch) && (
                          <label className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer ${selected.has(`sk:${report.id}`) ? "bg-violet-500/10" : "hover:bg-secondary/30"}`}>
                            <input type="checkbox" checked={selected.has(`sk:${report.id}`)} onChange={() => toggleKey(`sk:${report.id}`)} className="mt-0.5 shrink-0 accent-primary"/>
                            <div className="flex items-center gap-2">
                              <JobPhotoImg src={report.sketch.publicUrl} alt="" className="w-10 h-10 rounded object-cover bg-secondary"/>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rysunek z wymiarami</p>
                                {report.sketchNote && <p className="text-[10px] text-muted-foreground italic">{report.sketchNote}</p>}
                              </div>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5"/>
                  <span>{error}</span>
                </div>
              )}
            </>
          )}
        </div>

        {!success && (
          <div className="px-5 py-4 border-t border-border flex gap-2 shrink-0" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors">Anuluj</button>
            <button type="button" onClick={handleSend} disabled={!canSend} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {sending ? <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"/>Wysyłanie…</> : <><Send size={14}/>Wyślij</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Jobs View ────────────────────────────────────────────────────────────────

export function JobsView({
  jobs,
  setJobs,
  onDeleteJobs,
  directory,
  contacts,
  onManageContacts,
  initialJobId,
  initialJobSection,
  onInitialJobConsumed,
  weekEmployees,
  weekFrom,
  onGoToInspector,
  athPreviewEnabled,
  returnNav,
  onOpenTender,
  recoverableCharges = [],
  onOpenRecoverableCharge,
  onChangeRecoverableCharges,
  onCommitRecoverableCharges,
  operationalNotes = [],
  operationalNotesReadState = [],
  adminSession: adminSessionProp,
  onOpenOperationalNote,
  onCreateOperationalNoteFromJob,
  wmPrintHistory = [],
  onOpenWmPrint,
}: {
  jobs: Job[];
  setJobs: (v: Job[] | ((p: Job[]) => Job[])) => void;
  onDeleteJobs?: (ids: string[]) => Promise<void>;
  directory: DirectoryEmployee[];
  contacts: EmailContact[];
  onManageContacts: () => void;
  initialJobId?: string | null;
  initialJobSection?: JobDetailSection | null;
  onInitialJobConsumed?: () => void;
  weekEmployees: WeekEmployee[];
  weekFrom: string;
  onGoToInspector?: () => void;
  athPreviewEnabled: boolean;
  returnNav?: { label: string; onBack: () => void };
  onOpenTender?: (tenderId: string) => void;
  recoverableCharges?: RecoverableCharge[];
  onOpenRecoverableCharge?: (chargeId: string) => void;
  onChangeRecoverableCharges?: (next: RecoverableCharge[]) => void;
  onCommitRecoverableCharges?: (next: RecoverableCharge[]) => void;
  operationalNotes?: OperationalNote[];
  operationalNotesReadState?: import("@/lib/operational-notes-read-state").OperationalNoteReadReceipt[];
  adminSession?: AdminSession | null;
  onOpenOperationalNote?: (noteId: string, fromJobId?: string) => void;
  onCreateOperationalNoteFromJob?: (preset: { linkedJobId?: string; linkedJobNameSnapshot?: string }) => void;
  wmPrintHistory?: import("@/lib/wm-print/history").WmPrintHistoryEntry[];
  onOpenWmPrint?: () => void;
}) {
  const { canViewRates, session: adminSessionFromCtx } = useAdminAccess();
  const adminSession = adminSessionProp ?? adminSessionFromCtx;
  const createdByName = adminSession?.displayName || "Administrator";
  const isSuperAdmin = adminSession ? adminIsSuperAdmin(adminSession.role) : false;
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<JobListFilter>("in_progress");
  const [opsChip, setOpsChip] = useState<JobOpsChip | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmListId, setDeleteConfirmListId] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(() => new Set());
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [workerFilter, setWorkerFilter] = useState<string>("");
  const [leadFilter, setLeadFilter] = useState<string>("");
  const [listViewMode, setListViewMode] = useState<JobListViewMode>("list");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showInspectorContactModal, setShowInspectorContactModal] = useState(false);
  const [packBusy, setPackBusy] = useState(false);
  const [fileDeleteBusy, setFileDeleteBusy] = useState<string | null>(null);

  // Work entry add form state
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [entryDirId, setEntryDirId] = useState("");
  const [entryDate, setEntryDate] = useState(localIsoDate());
  const [entryHours, setEntryHours] = useState(String(DEFAULT_JOB_ENTRY_HOURS));
  const [entryRate, setEntryRate] = useState("");

  const [teamLeadId, setTeamLeadId] = useState("");
  const [teamAssigneeIds, setTeamAssigneeIds] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [expandedWorkerKeys, setExpandedWorkerKeys] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<InspectorFileItem | null>(null);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [detailSection, setDetailSection] = useState<JobDetailSection>("summary");
  const [showCreateRecoverableCharge, setShowCreateRecoverableCharge] = useState(false);
  const [approveProposalContext, setApproveProposalContext] = useState<{
    proposalId: string;
    draft: RecoverableCharge;
  } | null>(null);
  const [uploadBusy, setUploadBusy] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState("");
  const [photoUploadBusy, setPhotoUploadBusy] = useState(false);
  const jobsListHeaderRef = useRef<HTMLDivElement>(null);
  const jobDetailHeaderRef = useRef<HTMLDivElement>(null);
  useWheelScrollForward(jobsListHeaderRef);
  useWheelScrollForward(jobDetailHeaderRef);
  const [photoUploadLabel, setPhotoUploadLabel] = useState<PhotoEntry["label"]>("progress");
  const jobNotesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!initialJobId) return;
    if (jobs.some((j) => j.id === initialJobId)) {
      setSelectedJobId(initialJobId);
      if (initialJobSection) setDetailSection(initialJobSection);
    }
    onInitialJobConsumed?.();
  }, [initialJobId, initialJobSection, jobs, onInitialJobConsumed]);

  const selectedJob = jobs.find(j=>j.id===selectedJobId)||null;
  const productionDirectory = useMemo(
    () => filterProductionActiveDirectory(directory),
    [directory],
  );
  const savedExecutionLeadName = useMemo(() => {
    if (!selectedJob?.executionLeadDirectoryId) return null;
    return directory.find((d) => d.id === selectedJob.executionLeadDirectoryId)?.name ?? null;
  }, [selectedJob?.executionLeadDirectoryId, directory]);
  const companyWeekHours = useMemo(
    () => {
      const h = weekEmployees.reduce((s, e) => s + calcWeekEmployee(e).totalHours, 0);
      return h > 0 ? h : undefined;
    },
    [weekEmployees],
  );
  const todayIso = localIsoDate();

  const yesterdayEntriesToCopy = useMemo(
    () => (selectedJob ? collectEntriesFromYesterday(selectedJob, todayIso, weekEmployees, weekFrom, directory) : []),
    [selectedJob, todayIso, weekEmployees, weekFrom, directory],
  );

  const payrollEntriesForToday = useMemo(
    () => (selectedJob ? workEntriesFromPayrollForDate(selectedJob, weekEmployees, weekFrom, todayIso) : []),
    [selectedJob, weekEmployees, weekFrom, todayIso],
  );

  const workerGroups = useMemo(
    () => groupWorkEntriesByEmployee(selectedJob?.workEntries ?? []),
    [selectedJob?.workEntries],
  );

  const duplicateJobAddressKeys = useMemo(() => {
    const counts = new Map<string, number>();
    for (const j of jobs) {
      const key = jobAddressKey(j);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k));
  }, [jobs]);

  const isDuplicateJob = (job: Job) => duplicateJobAddressKeys.has(jobAddressKey(job));

  useEffect(() => {
    setExpandedWorkerKeys(new Set());
  }, [selectedJobId]);

  useEffect(() => {
    if (!selectedJob) {
      setTeamLeadId("");
      setTeamAssigneeIds([]);
      return;
    }
    setTeamLeadId(selectedJob.executionLeadDirectoryId || "");
    setTeamAssigneeIds(selectedJob.executionAssigneeDirectoryIds || []);
  }, [selectedJobId, selectedJob?.executionLeadDirectoryId, selectedJob?.executionAssigneeDirectoryIds]);

  const markedReportsForJobRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedJobId) {
      markedReportsForJobRef.current = null;
      return;
    }
    if (markedReportsForJobRef.current === selectedJobId) return;
    setJobs((prev) => {
      const job = prev.find((j) => j.id === selectedJobId);
      if (!job) return prev;
      const unreviewed = jobWorkerReports(job).filter(reportNeedsAdminAttention);
      if (unreviewed.length === 0) {
        markedReportsForJobRef.current = selectedJobId;
        return prev;
      }
      markedReportsForJobRef.current = selectedJobId;
      const now = new Date().toISOString();
      return prev.map((j) =>
        j.id !== selectedJobId
          ? j
          : {
              ...j,
              workerReports: jobWorkerReports(j).map((r) =>
                reportNeedsAdminAttention(r) ? { ...r, adminReviewedAt: now } : r,
              ),
            },
      );
    });
  }, [selectedJobId, setJobs]);

  const toggleWorkerGroup = (key: string) => {
    setExpandedWorkerKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const docsCount = (job: Job) => DOCUMENT_TYPES.filter(d=>job.documents[d]).length;
  const allDocsDone = (job: Job) => REQUIRED_DOCS.every(d=>job.documents[d]);

  const updateJob = (updated: Job, activity?: { type: JobActivityType; text: string; actor?: string }) => {
    let next = syncJobDocuments(updated);
    next = activity
      ? appendJobActivity(next, activity.type, activity.text, activity.actor || "Administrator")
      : next;

    if (next.jobPhase) {
      next = applyJobPhase(next, next.jobPhase);
    } else if (isWmClient(next.client)) {
      next = normalizeJobWmFields(next);
    }

    setJobs((prev) => prev.map((j) => (j.id === next.id ? next : j)));
  };

  const handleAddBillingNote = useCallback((chargeId: string, text: string, _files?: BillingNotePendingFiles) => {
    if (!selectedJob) return;
    const charge = recoverableCharges.find((c) => c.id === chargeId);
    const title = charge?.title.trim() || (charge ? recoverableChargeDescriptionLine(charge) : "Pozycja");
    const note = buildBillingJobNote({
      chargeId,
      text,
      author: createdByName,
      authorRole: "admin",
    });
    updateJob(appendBillingJobNote(selectedJob, note, title));
    toast.success("Odpowiedź wysłana do inspektora");
  }, [selectedJob, recoverableCharges, createdByName]);

  const handleApproveBillingProposal = useCallback((proposalId: string) => {
    if (!selectedJob) return;
    const liveJob = jobs.find((j) => j.id === selectedJob.id) ?? selectedJob;
    const proposal = (liveJob.jobNotes || []).find((n) => n.id === proposalId);
    if (!proposal || !isBillingProposalNote(proposal)) return;
    if (!isBillingProposalPending(proposal)) {
      const n = normalizeBillingProposalNote(proposal);
      toast.info(
        n.proposalStatus === "approved" && n.approvedChargeId
          ? "Zgłoszenie zostało już zatwierdzone"
          : "Zgłoszenie nie oczekuje na zatwierdzenie",
      );
      return;
    }
    const existingCharge = findRecoverableChargeByProposalId(recoverableCharges, proposalId);
    if (existingCharge) {
      toast.info(`Pozycja już istnieje dla tego zgłoszenia (tag proposal:${proposalId})`);
      return;
    }
    const draft = createChargeDraftFromProposal(proposal, liveJob, directory, createdByName);
    setApproveProposalContext({ proposalId, draft });
  }, [selectedJob, jobs, directory, createdByName, recoverableCharges]);

  const handleRejectBillingProposal = useCallback((proposalId: string, reason: string) => {
    if (!selectedJob) return;
    const proposal = (selectedJob.jobNotes || []).find((n) => n.id === proposalId);
    if (!proposal) return;
    let job = updateJobBillingProposalNote(selectedJob, proposalId, (n) =>
      rejectBillingProposalNote(n, reason, createdByName),
    );
    job = appendJobActivity(
      job,
      "billing_proposal_rejected",
      billingProposalRejectedActivityText(proposal, reason),
      createdByName,
    );
    updateJob(job);
    toast.success("Zgłoszenie odrzucone");
  }, [selectedJob, createdByName]);

  const appendJobPhotos = (entries: PhotoEntry[], activityText: string) => {
    if (!selectedJobId || entries.length === 0) return;
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== selectedJobId) return j;
        let next = syncJobDocuments({
          ...j,
          photos: [...(j.photos || []), ...entries],
        });
        next = appendJobActivity(next, "photo_upload", activityText);
        if (next.jobPhase) next = applyJobPhase(next, next.jobPhase);
        else if (isWmClient(next.client)) next = normalizeJobWmFields(next);
        return next;
      }),
    );
  };

  const setJobPhase = (job: Job, phase: JobPhase) => {
    const next = applyJobPhase(job, phase);
    updateJob(next, {
      type: "status_change",
      text: `Status: ${JOB_PHASE_LABELS[phase]}`,
    });
  };

  const handleStartContractExecution = () => {
    if (!selectedJob || !canShowStartExecutionButton(selectedJob)) return;
    const actor = adminSession?.displayName || "Administrator";
    updateJob(startJobExecution(selectedJob, actor));
    toast.success("Rozpoczęto realizację kontraktu");
  };

  const handleSaveExecutionTeam = () => {
    if (!selectedJob) return;
    if (!teamLeadId && teamAssigneeIds.length === 0) return;
    const actor = adminSession?.displayName || "Administrator";
    updateJob(assignExecutionTeam(selectedJob, teamLeadId || undefined, teamAssigneeIds, actor));
    toast.success("Zapisano ekipę realizacyjną");
  };

  const toggleTeamAssignee = (id: string) => {
    setTeamAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleDeleteJobFile = async (file: JobFileAttachment, busyKey?: string) => {
    if (!selectedJob) return;
    if (!window.confirm(`Usunąć „${file.filename}”?\n\nPlik zostanie usunięty ze storage i zniknie wszędzie w aplikacji.`)) {
      return;
    }
    setFileDeleteBusy(busyKey ?? file.id);
    try {
      const path = resolveJobFileStoragePath(file);
      if (path) {
        const { ok, error } = await deleteJobFile(path);
        if (!ok) {
          toast.error(error || "Nie udało się usunąć pliku ze storage");
          return;
        }
      }
      const next = removeJobFileAttachmentWithTombstone(
        { ...selectedJob, updatedAt: new Date().toISOString() },
        file.id,
        { deletedBy: adminSession?.displayName || "Administrator", reason: "delete" },
      );
      updateJob(next, {
        type: "inspector_file",
        text: `Usunięto plik: ${file.filename}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Nie udało się usunąć pliku";
      toast.error(msg);
    } finally {
      setFileDeleteBusy(null);
    }
  };

  const handleDeleteCatalogItem = async (item: JobFileCatalogItem) => {
    if (!selectedJob) return;
    if (item.previewItem.kind === "jobFile") {
      await handleDeleteJobFile(item.previewItem.file, item.id);
    }
  };

  const handleDeleteInspectorFileItem = async (item: InspectorFileItem) => {
    if (!selectedJob) return;
    const label = item.kind === "jobFile"
      ? item.file.filename
      : (item.file.caption || "zdjęcie inspektora");
    if (!window.confirm(`Usunąć „${label}”?\n\nPlik zostanie usunięty ze storage i zniknie wszędzie w aplikacji.`)) {
      return;
    }
    try {
      const path = item.kind === "jobFile"
        ? resolveJobFileStoragePath(item.file)
        : item.file.path;
      if (path) {
        const { ok, error } = await deleteJobFile(path);
        if (!ok) {
          toast.error(error || "Nie udało się usunąć pliku ze storage");
          return;
        }
      }
      const now = new Date().toISOString();
      if (item.kind === "jobFile") {
        updateJob(
          removeJobFileAttachmentWithTombstone(
            { ...selectedJob, updatedAt: now },
            item.file.id,
            { deletedBy: adminSession?.displayName || "Administrator", reason: "delete" },
          ),
          { type: "inspector_file", text: `Usunięto plik: ${label}` },
        );
      } else if (item.kind === "inspectorPhoto") {
        updateJob(
          { ...removeInspectorPhoto({ ...selectedJob, updatedAt: now }, item.file.id), updatedAt: now },
          { type: "inspector_photo", text: `Usunięto zdjęcie: ${label}` },
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Nie udało się usunąć pliku";
      toast.error(msg);
    }
  };

  const handleJobFileUpload = async (kind: JobFileKind, file: File) => {
    if (!selectedJob) return;
    setUploadBusy(kind);
    const actor = adminSession?.displayName || "Administrator";
    const previousFile = (selectedJob.jobFiles || []).find((f) => f.kind === kind);
    const { attachment } = await uploadJobFile(selectedJob.id, file, kind, actor);
    setUploadBusy(null);
    if (!attachment) return;
    const next = applyJobFileKindUpload(selectedJob, kind, attachment, {
      deletedBy: actor,
      previousFile,
    });
    updateJob(next, {
      type: "inspector_file",
      text: jobFileUploadActivityText(kind, file.name),
      actor,
    });
    if (previousFile) {
      const oldPath = resolveJobFileStoragePath(previousFile);
      if (oldPath) void deleteJobFile(oldPath).catch(() => {});
    }
  };

  const selectedJobCatalog = useMemo(
    () => (selectedJob ? collectJobFileCatalog(selectedJob) : []),
    [selectedJob],
  );

  const selectedHubCount = useMemo(
    () => (selectedJob ? countFilesHubItems(selectedJob) : 0),
    [selectedJob],
  );

  const selectedJobImageCount = useMemo(
    () => (selectedJob ? countJobImages(selectedJob) : 0),
    [selectedJob],
  );

  const totalJobFilesCount = useMemo(() => countAllFilesHubItems(jobs), [jobs]);

  const openJob = (id: string, tab: JobDetailSection = "summary") => {
    setSelectedJobId(id);
    setDetailSection(tab);
    setShowHistory(false);
  };

  const addJob = () => {
    const j = defaultJob();
    setJobs(prev=>[j,...prev]);
    openJob(j.id);
  };

  const deleteJob = async (id: string) => {
    if (deleteBusy) return;
    setDeleteBusy(true);
    setDeleteConfirmId(null);
    setDeleteConfirmListId(null);
    if (selectedJobId === id) setSelectedJobId(null);
    setBulkSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    try {
      if (onDeleteJobs) {
        await onDeleteJobs([id]);
      } else {
        const deletedIds = addDeletedJobId(id);
        setJobs((prev) => {
          const updated = prev.filter((j) => j.id !== id);
          pushJobsAfterDelete(updated, deletedIds).catch(() => {});
          return updated;
        });
      }
    } finally {
      setDeleteBusy(false);
    }
  };

  const deleteBulkSelected = async () => {
    if (deleteBusy || bulkSelectedIds.size === 0) return;
    const ids = [...bulkSelectedIds];
    if (!window.confirm(`Usunąć ${ids.length} ${ids.length === 1 ? "robotę" : "robot"}?`)) return;
    setDeleteBusy(true);
    setBulkSelectedIds(new Set());
    setDeleteConfirmId(null);
    setDeleteConfirmListId(null);
    if (selectedJobId && ids.includes(selectedJobId)) setSelectedJobId(null);
    try {
      if (onDeleteJobs) {
        await onDeleteJobs(ids);
      } else {
        let deletedIds = getDeletedJobIds();
        for (const id of ids) deletedIds = addDeletedJobId(id);
        const idSet = new Set(ids);
        setJobs((prev) => {
          const updated = prev.filter((j) => !idSet.has(j.id));
          pushJobsAfterDelete(updated, deletedIds).catch(() => {});
          return updated;
        });
      }
    } finally {
      setDeleteBusy(false);
    }
  };

  const toggleBulkSelect = (id: string) => {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportJobPDF = async (job: Job) => {
    const pdfMake = await loadPdfMake();
    const C2 = { navy:"#344254", red:"#C0392B", light:"#EDF1F6", white:"#FFFFFF", muted:"#8A9BB0" };
    const title = `${job.address||"Bez adresu"}${job.flatNumber?` m.${job.flatNumber}`:""}`;
    const docsChecked = DOCUMENT_TYPES.filter(d=>job.documents[d]);
    const workerRows = job.workEntries.map(e=> canViewRates
      ? [
          {text:fmtDate(e.date),fontSize:9,color:C2.muted},{text:e.employeeName||"—",fontSize:9},
          {text:fmtH(e.hours),fontSize:9,alignment:"right"},{text:`${fmt(e.rate)} PLN/h`,fontSize:9,color:C2.muted,alignment:"right"},
          {text:`${fmt(e.hours*e.rate)} PLN`,fontSize:9,bold:true,alignment:"right",color:C2.red},
        ]
      : [
          {text:fmtDate(e.date),fontSize:9,color:C2.muted},{text:e.employeeName||"—",fontSize:9},
          {text:fmtH(e.hours),fontSize:9,alignment:"right"},
          {text:`${fmt(e.hours*e.rate)} PLN`,fontSize:9,bold:true,alignment:"right",color:C2.red},
        ]
    );
    const matRows = (job.materials||[]).map(m=>[
      {text:m.description||"—",fontSize:9},{text:fmtDate(m.date),fontSize:9,color:C2.muted,alignment:"right"},
      {text:`${fmt(m.cost)} PLN`,fontSize:9,bold:true,alignment:"right",color:C2.red},
    ]);
    const dd: PdfDocDef = {
      pageSize:"A4", pageOrientation:"portrait",
      pageMargins:[40,60,40,60],
      defaultStyle:{font:"Roboto",fontSize:10,lineHeight:1.3},
      content:[
        {canvas:[{type:"rect",x:0,y:0,w:515,h:50,color:C2.navy}]},
        {text:"W&G DOM", fontSize:22, bold:true, color:C2.white, absolutePosition:{x:40,y:20}},
        {text:"Karta Roboty", fontSize:11, color:C2.red, absolutePosition:{x:40,y:46}},
        {text:`Wygenerowano: ${new Date().toLocaleDateString("pl-PL")}`, fontSize:8, color:C2.muted, absolutePosition:{x:350,y:52}},
        {text:" ", fontSize:6, margin:[0,20,0,0]},
        // Job header
        {text:title, fontSize:18, bold:true, color:C2.navy, margin:[0,8,0,2]},
        {text:job.client||"—", fontSize:11, color:C2.muted, margin:[0,0,0,10]},
        {
          columns:[
            {stack:[
              {text:"Data rozpoczęcia", fontSize:8, color:C2.muted},
              {text:fmtDate(job.startDate)||"—", fontSize:10, bold:true, color:C2.navy},
            ]},
            {stack:[
              {text:"Data zakończenia", fontSize:8, color:C2.muted},
              {text:fmtDate(job.endDate)||"—", fontSize:10, bold:true, color:C2.navy},
            ]},
            {stack:[
              {text:"Status", fontSize:8, color:C2.muted},
              {text:job.status==="completed"?"Zdane":"W trakcie", fontSize:10, bold:true, color:job.status==="completed"?"#1E7E34":C2.red},
            ]},
            {stack:[
              {text:"Klucze", fontSize:8, color:C2.muted},
              {text:job.keysHandedOver?"Zdane":"Nie zdane", fontSize:10, bold:true, color:job.keysHandedOver?"#1E7E34":C2.muted},
            ]},
            {stack:[
              {text:"Lokal", fontSize:8, color:C2.muted},
              {text:isJobHousingSet(job)?HOUSING_TYPE_LABELS[job.housingType]:"—", fontSize:10, bold:true, color:C2.navy},
            ]},
            {stack:[
              {text:"Kuchenka", fontSize:8, color:C2.muted},
              {text:job.stoveType?STOVE_TYPE_LABELS_FULL[job.stoveType]:"—", fontSize:10, bold:true, color:C2.navy},
            ]},
            {stack:[
              {text:"Piec gazowy", fontSize:8, color:C2.muted},
              {text:job.gasFurnaceStatus?GAS_FURNACE_STATUS_LABELS[job.gasFurnaceStatus]:"—", fontSize:10, bold:true, color:C2.navy},
            ]},
          ],
          margin:[0,0,0,14],
        },
        // Documents
        {text:"DOKUMENTY DO ODBIORU", fontSize:8, bold:true, color:C2.muted, margin:[0,0,0,6]},
        {
          columns: DOCUMENT_TYPES.map(d=>({
            stack:[
              {canvas:[{type:"rect",x:0,y:0,w:55,h:32,color:job.documents[d]?"#D4EFDF":"#F8F9FB",r:4}]},
              {text:DOC_LABELS[d], fontSize:7, color:job.documents[d]?"#1E7E34":C2.muted, absolutePosition:{x:0,y:0}, margin:[4,10,4,0], alignment:"center"},
            ],
            width:"auto",margin:[0,0,6,0],
          })),
          columnGap:0,
          margin:[0,0,0,16],
        },
        // Workers
        ...(job.workEntries.length>0 ? [
          {text:"CZAS PRACY PRACOWNIKÓW", fontSize:8, bold:true, color:C2.muted, margin:[0,0,0,4]},
          {
            table:{
              headerRows:1,
              widths: canViewRates ? ["auto","*","auto","auto","auto"] : ["auto","*","auto","auto"],
              body:[
                canViewRates
                  ? [{text:"Data",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8},{text:"Pracownik",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8},{text:"Godz.",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8,alignment:"right"},{text:"Stawka",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8,alignment:"right"},{text:"Koszt",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8,alignment:"right"}]
                  : [{text:"Data",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8},{text:"Pracownik",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8},{text:"Godz.",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8,alignment:"right"},{text:"Koszt",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8,alignment:"right"}],
                ...workerRows,
                canViewRates
                  ? [{text:"Suma",bold:true,fillColor:C2.light,colSpan:2,fontSize:9},{},
                     {text:fmtH(jobTotalHours(job)),bold:true,fillColor:C2.light,alignment:"right",fontSize:9},
                     {text:"",fillColor:C2.light},
                     {text:`${fmt(jobCost(job))} PLN`,bold:true,fillColor:C2.light,color:C2.red,alignment:"right",fontSize:9}]
                  : [{text:"Suma",bold:true,fillColor:C2.light,colSpan:2,fontSize:9},{},
                     {text:fmtH(jobTotalHours(job)),bold:true,fillColor:C2.light,alignment:"right",fontSize:9},
                     {text:`${fmt(jobCost(job))} PLN`,bold:true,fillColor:C2.light,color:C2.red,alignment:"right",fontSize:9}],
              ],
            },
            layout:{hLineColor:()=>"#E5E7EB",vLineColor:()=>"#E5E7EB"},
            margin:[0,0,0,12],
          },
        ] : []),
        // Materials
        ...(matRows.length>0 ? [
          {text:"MATERIAŁY", fontSize:8, bold:true, color:C2.muted, margin:[0,0,0,4]},
          {
            table:{
              headerRows:1,
              widths:["*","auto","auto"],
              body:[
                [{text:"Opis",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8},{text:"Data",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8,alignment:"right"},{text:"Koszt",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8,alignment:"right"}],
                ...matRows,
                [{text:"Suma materiałów",bold:true,fillColor:C2.light,colSpan:2,fontSize:9},{},{text:`${fmt(jobMaterialsCost(job))} PLN`,bold:true,fillColor:C2.light,color:C2.red,alignment:"right",fontSize:9}],
              ],
            },
            layout:{hLineColor:()=>"#E5E7EB",vLineColor:()=>"#E5E7EB"},
            margin:[0,0,0,12],
          },
        ] : []),
        // Total
        ...((job.workEntries.length>0||(job.materials||[]).length>0) ? [
          {canvas:[{type:"rect",x:0,y:0,w:515,h:40,color:C2.navy}]},
          {columns:[
            {text:"ŁĄCZNY KOSZT REMONTU", fontSize:9, bold:true, color:C2.white, margin:[0,12,0,0]},
            {text:`${fmt(jobTotalCost(job))} PLN`, fontSize:18, bold:true, color:C2.red, alignment:"right", margin:[0,6,0,0]},
          ], absolutePosition:{x:40,y:-40+2}},
          {text:" ", fontSize:6, margin:[0,24,0,0]},
        ] : []),
        // Notes
        ...(job.notes ? [
          {text:"NOTATKI", fontSize:8, bold:true, color:C2.muted, margin:[0,8,0,4]},
          {text:job.notes, fontSize:9, color:C2.navy, margin:[0,0,0,0]},
        ] : []),
      ],
    };
    pdfMake.createPdf(dd).download(`robota-${(job.address||"bez-adresu").replace(/\s+/g,"-").toLowerCase()}.pdf`);
  };

  const filterCounts = useMemo(() => ({
    all: countJobsByListFilter(jobs, "all"),
    in_progress: countJobsByListFilter(jobs, "in_progress"),
    handover: countJobsByListFilter(jobs, "handover"),
    completed: countJobsByListFilter(jobs, "completed"),
  }), [jobs]);

  const wmOverdueIds = useMemo(() => wmOverdueJobIdSet(jobs), [jobs]);
  const opsKpi = useMemo(() => computeJobListOpsKpi(jobs), [jobs]);

  const recoverableStatsByJobId = useMemo(() => {
    const map = new Map<string, RecoverableChargeJobStats>();
    const jobIds = new Set(jobs.map((j) => j.id));
    for (const jobId of jobIds) {
      const stats = getRecoverableChargeJobStats(recoverableCharges, jobId);
      if (stats.chargeCount > 0 || stats.recoveredCount > 0) {
        map.set(jobId, stats);
      }
    }
    return map;
  }, [jobs, recoverableCharges]);

  const toggleOpsChip = (chip: JobOpsChip) => {
    setOpsChip((current) => (current === chip ? null : chip));
  };

  const togglePhaseFilterFromKpi = (phase: "in_progress" | "handover") => {
    setFilter((current) => (current === phase ? "all" : phase));
  };

  const filtered = useMemo(
    () =>
      filterJobsForListView(jobs, {
        phaseFilter: filter,
        opsChip,
        overdueIds: wmOverdueIds,
        workerDirectoryId: workerFilter,
        leadFilter,
        searchQuery: search,
      }),
    [jobs, filter, opsChip, wmOverdueIds, workerFilter, leadFilter, search],
  );

  const queueSections = useMemo(
    () => buildJobQueueSections(filtered, wmOverdueIds),
    [filtered, wmOverdueIds],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Job[]>();
    filtered.forEach((j) => {
      const d = new Date(j.startDate);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(j);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, groupJobs]) => [key, sortJobsInMonthGroup(groupJobs, wmOverdueIds)] as const);
  }, [filtered, wmOverdueIds]);

  const groupLabel = (key: string) => {
    const [y,m] = key.split("-");
    return `${MONTH_NAMES[parseInt(m)]} ${y}`;
  };

  // Work entry form helpers
  const selectedDirEmp = directory.find(d=>d.id===entryDirId)||null;

  const handleAddEntry = () => {
    if(!selectedJob||!entryDirId||!entryDate||!entryHours) return;
    const emp = directory.find(d=>d.id===entryDirId);
    const weekEmp = weekEmployees.find((e) => e.directoryId === entryDirId);
    const entry: WorkEntry = {
      id: crypto.randomUUID(),
      directoryId: entryDirId,
      employeeName: emp?.name||"—",
      date: entryDate,
      hours: parseFloat(entryHours)||0,
      rate: parseFloat(entryRate) || parseFloat(weekEmp?.rate || "") || parseFloat(emp?.defaultRate||"0")||0,
      notes: "",
    };
    updateJob(
      {...selectedJob, workEntries:[...selectedJob.workEntries,entry]},
      { type: "work_entry", text: `${entry.employeeName} — ${fmtDate(entry.date)}, ${fmtH(entry.hours)}` },
    );
    setShowAddEntry(false);
    setEntryDirId("");
    setEntryHours(String(DEFAULT_JOB_ENTRY_HOURS));
    setEntryRate("");
  };

  const appendWorkEntries = (newEntries: WorkEntry[], label: string) => {
    if (!selectedJob || newEntries.length === 0) return;
    updateJob(
      { ...selectedJob, workEntries: [...selectedJob.workEntries, ...newEntries] },
      { type: "work_entry", text: label },
    );
  };

  const copyYesterdayToToday = () => {
    appendWorkEntries(
      yesterdayEntriesToCopy,
      `Skopiowano wczoraj → dziś (${yesterdayEntriesToCopy.length} os.)`,
    );
  };

  const fillTodayFromPayroll = () => {
    appendWorkEntries(
      payrollEntriesForToday,
      `Z listy płac na dziś (${payrollEntriesForToday.length} os.)`,
    );
  };

  const syncEntryHoursFromPayroll = (dirId: string, dateIso: string) => {
    const dirEmp = directory.find((d) => d.id === dirId);
    const weekEmp = weekEmployees.find((e) => e.directoryId === dirId);
    if (dirEmp?.multiSiteDaily) {
      setEntryHours(String(DEFAULT_MULTI_SITE_VISIT_HOURS));
      if (weekEmp?.rate) setEntryRate(weekEmp.rate);
      else if (dirEmp.defaultRate) setEntryRate(dirEmp.defaultRate);
      return;
    }
    const payH = payrollHoursForDirectoryOnDate(dirId, dateIso, weekEmployees, weekFrom);
    if (payH > 0) {
      setEntryHours(String(payH));
      if (weekEmp?.rate) setEntryRate(weekEmp.rate);
      else if (dirEmp?.defaultRate) setEntryRate(dirEmp.defaultRate);
    } else {
      setEntryHours(String(DEFAULT_JOB_ENTRY_HOURS));
    }
    if (weekEmp?.rate) setEntryRate(weekEmp.rate);
    else if (dirEmp?.defaultRate) setEntryRate(dirEmp.defaultRate);
  };

  const copyEntryToToday = (entry: WorkEntry) => {
    if (!selectedJob) return;
    if (selectedJob.workEntries.some(
      (e) => e.date === todayIso && (e.directoryId === entry.directoryId || e.employeeName === entry.employeeName),
    )) return;
    appendWorkEntries(
      [duplicateWorkEntryWithPayrollHours(entry, todayIso, weekEmployees, weekFrom, directory)],
      `${entry.employeeName} skopiowany na ${fmtDate(todayIso)}`,
    );
  };

  const openAddEntry = () => {
    setEntryDirId("");
    setEntryDate(todayIso);
    setEntryHours(String(DEFAULT_JOB_ENTRY_HOURS));
    setEntryRate("");
    setShowAddEntry(true);
  };

  const selectedMissingDocCount = selectedJob ? jobMissingRequiredDocs(selectedJob).length : 0;
  const selectedPendingPhotoCount = selectedJob ? (selectedJob.photos || []).filter((p) => p.status === "pending").length : 0;
  const selectedReportCount = selectedJob ? jobWorkerReports(selectedJob).length : 0;
  const selectedJobTitle = selectedJob
    ? `${selectedJob.address || "Bez adresu"}${selectedJob.flatNumber ? ` m.${selectedJob.flatNumber}` : ""}`
    : "";

  const resolveLeadName = (job: Job) => {
    const leadId = job.executionLeadDirectoryId?.trim();
    if (!leadId) return null;
    return directory.find((d) => d.id === leadId)?.name ?? null;
  };

  const renderJobListCard = (job: Job) => {
    const cost = jobCost(job);
    const isSelected = job.id === selectedJobId;
    const isDupe = isDuplicateJob(job);
    const workerCount = new Set(job.workEntries.map((e) => e.directoryId || e.employeeName)).size;
    const activeTodayCount =
      inferJobPhase(job) !== "completed"
        ? jobActiveWorkerCountOnDate(job, todayIso, directory)
        : 0;
    const rcStats = recoverableStatsByJobId.get(job.id);
    return (
      <JobListCardV2
        key={job.id}
        job={job}
        selected={isSelected}
        isDuplicate={isDupe}
        workerCount={workerCount}
        activeTodayCount={activeTodayCount}
        totalHoursLabel={fmtH(jobTotalHours(job))}
        costLabel={cost > 0 ? `${fmt(cost)} PLN` : null}
        bulkMode={bulkMode}
        bulkSelected={bulkSelectedIds.has(job.id)}
        onBulkToggle={() => toggleBulkSelect(job.id)}
        onSelect={() => openJob(job.id)}
        onDeleteRequest={() => { setDeleteConfirmListId(job.id); setDeleteConfirmId(null); }}
        deleteConfirm={deleteConfirmListId === job.id}
        onDeleteConfirm={() => void deleteJob(job.id)}
        onDeleteCancel={() => setDeleteConfirmListId(null)}
        deleteBusy={deleteBusy}
        recoverableUnsettledCount={rcStats?.unsettledCount}
        recoverableToRecoverAmount={rcStats?.toRecoverAmount}
        leadName={resolveLeadName(job)}
      />
    );
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      {showAllFiles ? (
        <JobAllFilesView
          jobs={jobs}
          athPreviewEnabled={athPreviewEnabled}
          onBack={() => setShowAllFiles(false)}
          onOpenJob={(jobId, section = "files") => {
            setShowAllFiles(false);
            openJob(jobId, section);
          }}
        />
      ) : (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      {/* 2.1B STREFA A — toolbar pełna szerokość (KPI, szukaj, filtry) */}
      <div ref={jobsListHeaderRef} className="shrink-0 w-full border-b border-border bg-card">
        <JobListPanelHeader
          returnNav={returnNav ? { label: returnNav.label, onBack: () => { setSelectedJobId(null); returnNav.onBack(); } } : undefined}
          onAddJob={addJob}
          onShowAllFiles={() => setShowAllFiles(true)}
          totalJobFilesCount={totalJobFilesCount}
          search={search}
          onSearchChange={setSearch}
          opsKpi={opsKpi}
          filter={filter}
          opsChip={opsChip}
          onTogglePhaseFilterFromKpi={togglePhaseFilterFromKpi}
          onToggleOpsChip={toggleOpsChip}
          filterCounts={filterCounts}
          onFilterChange={setFilter}
          listViewMode={listViewMode}
          onListViewModeChange={setListViewMode}
          directory={directory}
          workerFilter={workerFilter}
          onWorkerFilterChange={setWorkerFilter}
          leadFilter={leadFilter}
          onLeadFilterChange={setLeadFilter}
          bulkMode={bulkMode}
          onBulkModeToggle={() => {
            setBulkMode((v) => !v);
            setBulkSelectedIds(new Set());
            setDeleteConfirmListId(null);
          }}
          bulkSelectedCount={bulkSelectedIds.size}
          onBulkDelete={() => void deleteBulkSelected()}
          onBulkClear={() => setBulkSelectedIds(new Set())}
          deleteBusy={deleteBusy}
        />
      </div>

      {/* STREFA B — lista (~35%) | szczegóły (~65%) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
      <div
        className={`flex flex-col min-w-0 min-h-0 border-r border-border bg-card overflow-hidden transition-all duration-300 ${
          selectedJob ? "hidden sm:flex sm:flex-[7]" : "flex flex-1 sm:flex-[7]"
        }`}
      >
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {jobs.length===0&&(
            <div className="p-8 text-center space-y-2 text-muted-foreground">
              <MapPin size={32} className="mx-auto opacity-20"/>
              <p className="text-sm">Brak robót. Kliknij "Nowa robota".</p>
            </div>
          )}
          {listViewMode === "queues" ? (
            <JobQueueSections sections={queueSections} renderJob={renderJobListCard} />
          ) : (
            grouped.map(([key, groupJobs]) => (
              <div key={key}>
                <div className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground bg-background/50 border-b border-border sticky top-0">
                  {groupLabel(key)}
                </div>
                {groupJobs.map((job) => renderJobListCard(job))}
              </div>
            ))
          )}
          {jobs.length>0&&filtered.length===0&&(
            <div className="p-8 text-center text-muted-foreground text-sm">Brak wyników.</div>
          )}
        </div>
      </div>

      {/* Szczegóły roboty */}
      {selectedJob ? (
        <div className="flex flex-col flex-[13] min-w-0 min-h-0 overflow-hidden">
          <div ref={jobDetailHeaderRef} className="shrink-0 border-b border-border bg-background/95 backdrop-blur z-10">
            <div className="w-full max-w-3xl md:max-w-none mx-auto px-4 sm:px-6 pt-3 pb-2 space-y-3 md:pt-2 md:pb-1.5 md:space-y-2">
              <button onClick={()=>setSelectedJobId(null)} className="sm:hidden flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight size={14} className="rotate-180"/>Powrót do listy
              </button>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <h2 className="text-base font-semibold truncate leading-tight">{selectedJobTitle}</h2>
                  {selectedJob.client && (
                    <p className="text-xs text-muted-foreground truncate">{selectedJob.client}</p>
                  )}
                  <JobListPrimaryBadge job={selectedJob}/>
                </div>
                {detailSection !== "files" && (
                  <button
                    type="button"
                    onClick={() => setDetailSection("files")}
                    className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white font-medium transition-colors"
                  >
                    <FolderOpen size={12}/>
                    Pliki{selectedHubCount > 0 ? ` (${selectedHubCount})` : ""}
                  </button>
                )}
              </div>
              <JobDetailSectionNav
                active={detailSection}
                onSelect={setDetailSection}
                fileCount={selectedHubCount}
                imageCount={selectedJobImageCount}
                missingDocCount={selectedMissingDocCount}
                pendingPhotoCount={selectedPendingPhotoCount}
                reportCount={selectedReportCount}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="w-full max-w-3xl md:max-w-none mx-auto px-4 sm:px-6 py-4 space-y-4 md:py-3 md:space-y-3">

            {detailSection === "summary" && (
            <>
            <div className="bg-card rounded-xl border border-border p-5 space-y-4 md:p-4 md:space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Adres</label>
                      <input type="text" value={selectedJob.address} onChange={e=>updateJob({...selectedJob,address:e.target.value})} placeholder="ul. Przykładowa 12" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Nr mieszkania</label>
                      <input type="text" value={selectedJob.flatNumber} onChange={e=>updateJob({...selectedJob,flatNumber:e.target.value})} placeholder="np. 5A" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Klient / Zleceniodawca</label>
                      <input type="text" value={selectedJob.client} onChange={e=>updateJob({...selectedJob,client:e.target.value})} placeholder="np. Wrocławskie Mieszkania" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground block mb-1">Data rozpoczęcia</label>
                        <input type="date" value={selectedJob.startDate} onChange={e=>updateJob({...selectedJob,startDate:e.target.value})} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors" style={{fontFamily:"'JetBrains Mono', monospace"}}/>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground block mb-1">Data zakończenia</label>
                        <input type="date" value={selectedJob.endDate} onChange={e=>updateJob({...selectedJob,endDate:e.target.value})} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors" style={{fontFamily:"'JetBrains Mono', monospace"}}/>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <JobMetaPickers
                        housingType={selectedJob.housingType}
                        stoveType={selectedJob.stoveType}
                        gasFurnaceStatus={selectedJob.gasFurnaceStatus}
                        onHousingChange={(v) => updateJob({ ...selectedJob, housingType: v })}
                        onStoveChange={(v) => updateJob({ ...selectedJob, stoveType: v })}
                        onGasFurnaceChange={(v) => updateJob({ ...selectedJob, gasFurnaceStatus: v })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-3">
                <JobPhasePicker
                  job={selectedJob}
                  onPhaseChange={(phase) => setJobPhase(selectedJob, phase)}
                />
                <div className="flex items-center gap-3 flex-wrap">
                  {isWmClient(selectedJob.client) && selectedJob.plannedHandoverDate && (
                    <JobWmPlannedBadge job={selectedJob}/>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock size={13}/>
                    <span>Czas remontu: <span className="font-semibold text-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{jobDuration(selectedJob)} dni</span></span>
                  </div>
                </div>
                {isDuplicateJob(selectedJob) && (
                  <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-4 py-2.5 text-sm">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5"/>
                    <div>
                      <p className="font-medium text-amber-700 dark:text-amber-300">Ten adres jest zdublowany</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Masz więcej niż jedną robotę pod tym samym adresem. Usuń pustą lub niepotrzebną kopię — kosz „Usuń robotę” u góry albo kosz na liście po lewej.
                      </p>
                    </div>
                  </div>
                )}
                {selectedJob.linkedTenderId && (
                  <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-4 py-3 text-sm space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <Briefcase size={14} className="shrink-0" />
                          Realizacja kontraktu (przetarg BZP)
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {selectedJob.linkedTenderBzpNumber || selectedJob.linkedTenderId}
                        </p>
                      </div>
                      {onOpenTender && (
                        <button
                          type="button"
                          onClick={() => onOpenTender(selectedJob.linkedTenderId!)}
                          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/15 text-violet-700 dark:text-violet-300 text-xs font-medium hover:bg-violet-500/25"
                        >
                          <Scale size={12} /> Otwórz przetarg
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {parseFloat(selectedJob.invoiceAmount || "0") > 0 && (
                        <p>
                          <span className="text-muted-foreground">Wartość kontraktu: </span>
                          <span className="font-semibold text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {fmt(parseFloat(selectedJob.invoiceAmount))} PLN
                          </span>
                        </p>
                      )}
                      {selectedJob.startDate && (
                        <p>
                          <span className="text-muted-foreground">Start: </span>
                          <span className="font-medium">{fmtPlannedHandover(selectedJob.startDate)}</span>
                        </p>
                      )}
                      {selectedJob.endDate && (
                        <p>
                          <span className="text-muted-foreground">Koniec realizacji: </span>
                          <span className="font-medium">{fmtPlannedHandover(selectedJob.endDate)}</span>
                        </p>
                      )}
                      {selectedJob.plannedHandoverDate && (
                        <p>
                          <span className="text-muted-foreground">Planowany odbiór WM: </span>
                          <span className="font-medium">{fmtPlannedHandover(selectedJob.plannedHandoverDate)}</span>
                        </p>
                      )}
                    </div>
                    {(savedExecutionLeadName || (selectedJob.executionAssigneeDirectoryIds?.length ?? 0) > 0) && (
                      <div className="text-xs space-y-0.5 pt-0.5">
                        {savedExecutionLeadName && (
                          <p>
                            <span className="text-muted-foreground">Lider: </span>
                            <span className="font-medium text-foreground">{savedExecutionLeadName}</span>
                          </p>
                        )}
                        {(selectedJob.executionAssigneeDirectoryIds?.length ?? 0) > 0 && (
                          <p>
                            <span className="text-muted-foreground">Ekipa: </span>
                            <span className="font-medium text-foreground">
                              {selectedJob.executionAssigneeDirectoryIds!.length}{" "}
                              {selectedJob.executionAssigneeDirectoryIds!.length === 1
                                ? "osoba"
                                : selectedJob.executionAssigneeDirectoryIds!.length < 5
                                  ? "osoby"
                                  : "osób"}
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                    <div className="border-t border-emerald-500/20 pt-2 space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Users size={11} className="shrink-0" />
                        Plan ekipy realizacyjnej
                      </p>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Lider</label>
                        <select
                          value={teamLeadId}
                          onChange={(e) => setTeamLeadId(e.target.value)}
                          className="w-full bg-background rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none transition-colors"
                        >
                          <option value="">Wybierz lidera…</option>
                          {productionDirectory.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}{d.position ? ` — ${d.position}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Ekipa</label>
                        <div className="max-h-36 overflow-y-auto overscroll-contain rounded-lg border border-border bg-background/70 p-2 space-y-0.5">
                          {productionDirectory.length === 0 ? (
                            <p className="text-xs text-muted-foreground px-1 py-2">Brak aktywnych pracowników w kartotece.</p>
                          ) : (
                            productionDirectory.map((d) => (
                              <label
                                key={d.id}
                                className="flex items-center gap-2 text-xs cursor-pointer py-1 px-1 rounded hover:bg-secondary/50"
                              >
                                <input
                                  type="checkbox"
                                  checked={teamAssigneeIds.includes(d.id)}
                                  onChange={() => toggleTeamAssignee(d.id)}
                                  className="rounded border-border"
                                />
                                <span className="min-w-0 truncate">
                                  {d.name}{d.position ? ` — ${d.position}` : ""}
                                </span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveExecutionTeam}
                        disabled={!teamLeadId && teamAssigneeIds.length === 0}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                      >
                        <Check size={14} className="shrink-0" />
                        Zapisz ekipę
                      </button>
                    </div>
                    {canShowStartExecutionButton(selectedJob) && (
                      <button
                        type="button"
                        onClick={handleStartContractExecution}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors touch-manipulation"
                      >
                        <HardHat size={16} className="shrink-0" />
                        Rozpocznij realizację
                      </button>
                    )}
                  </div>
                )}
                {!allDocsDone(selectedJob) && inferJobPhase(selectedJob) === "in_progress" && jobDaysSinceStart(selectedJob) >= 7 && (
                  <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-4 py-3 text-sm">
                    <Bell size={14} className="text-amber-400 shrink-0 mt-0.5"/>
                    <div>
                      <p className="font-medium text-amber-400">Przypomnienie — brakujące dokumenty</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Robota trwa już {jobDaysSinceStart(selectedJob)} dni. Brakuje:{" "}
                        {jobMissingRequiredDocs(selectedJob).map((d) => DOC_LABELS[d]).join(", ")}.
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 justify-end flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowHistory((v) => !v)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-secondary hover:bg-secondary/70 border border-border rounded-lg font-medium transition-colors"
                  >
                    <ScrollText size={12}/>{showHistory ? "Ukryj historię" : "Historia"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(true)}
                    disabled={collectJobEmailSelectableKeys(selectedJob).length === 0}
                    title={collectJobEmailSelectableKeys(selectedJob).length === 0 ? "Brak zdjęć ani raportów do wysłania" : "Wyślij wybrane materiały emailem"}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary/90 hover:bg-primary text-primary-foreground rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Mail size={12}/>Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInspectorContactModal(true)}
                    title="Wyślij wiadomość do inspektora (szablony A–D)"
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-700/90 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <MessageSquare size={12}/>Kontakt z inspektorem
                  </button>
                  <button
                    type="button"
                    disabled={packBusy}
                    title="ZIP: zlecenie, kosztorys, zdjęcia, checklist dokumentów"
                    onClick={async () => {
                      setPackBusy(true);
                      try {
                        await downloadJobDocumentsPack(selectedJob);
                      } finally {
                        setPackBusy(false);
                      }
                    }}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <Package size={12}/>{packBusy ? "Pakowanie…" : "Dokumenty ZIP"}
                  </button>
                  <button onClick={()=>exportJobPDF(selectedJob)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-destructive/80 hover:bg-destructive text-white rounded-lg font-medium transition-colors">
                    <FileDown size={12}/>PDF
                  </button>
                  {deleteConfirmId===selectedJob.id?(
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Usunąć całą robotę?</span>
                      <button type="button" disabled={deleteBusy} onClick={() => void deleteJob(selectedJob.id)} className="text-xs bg-destructive text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50">{deleteBusy ? "Usuwanie…" : "Usuń"}</button>
                      <button type="button" onClick={()=>setDeleteConfirmId(null)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg"><X size={12}/></button>
                    </div>
                  ):(
                    <button type="button" onClick={()=>{ setDeleteConfirmId(selectedJob.id); setDeleteConfirmListId(null); }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 text-destructive hover:bg-destructive/10 border border-destructive/30 rounded-lg font-medium transition-colors">
                      <Trash2 size={12}/>Usuń robotę
                    </button>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-xs text-muted-foreground flex-1">Uwagi wewnętrzne (robota)</label>
                  <VoiceNoteButton focusRef={jobNotesRef} onResult={text=>updateJob({...selectedJob,notes:(selectedJob.notes?selectedJob.notes+" ":"")+text})}/>
                </div>
                <textarea ref={jobNotesRef} value={selectedJob.notes} onChange={e=>updateJob({...selectedJob,notes:e.target.value})} placeholder="Uwagi, informacje dodatkowe..." rows={3} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors resize-none"/>
              </div>

              {/* Link podglądu dla klienta */}
              <div className="bg-secondary/30 rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Eye size={13} className="text-primary"/>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Podgląd dla klienta</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Klient zobaczy tylko zaakceptowane zdjęcia i raporty — bez kosztów ani notatek wewnętrznych.
                </p>
                {selectedJob.clientShare?.enabled ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={clientShareUrl(selectedJob.clientShare.token)}
                        className="flex-1 bg-background rounded-lg px-3 py-2 text-xs border border-border font-mono truncate"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(clientShareUrl(selectedJob.clientShare!.token)).catch(() => {});
                          setShareCopied(true);
                          setTimeout(() => setShareCopied(false), 2000);
                        }}
                        className="flex items-center gap-1.5 text-xs px-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium shrink-0"
                      >
                        <Copy size={12}/>{shareCopied ? "Skopiowano" : "Kopiuj"}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateJob(
                        { ...selectedJob, clientShare: { ...selectedJob.clientShare!, enabled: false } },
                        { type: "share_link", text: "Wyłączono link podglądu dla klienta" },
                      )}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Wyłącz link
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const token = selectedJob.clientShare?.token || clientShareToken();
                      updateJob(
                        {
                          ...selectedJob,
                          clientShare: {
                            token,
                            createdAt: selectedJob.clientShare?.createdAt || new Date().toISOString(),
                            enabled: true,
                          },
                        },
                        { type: "share_link", text: "Wygenerowano link podglądu dla klienta" },
                      );
                    }}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 bg-primary/90 hover:bg-primary text-primary-foreground rounded-lg font-medium"
                  >
                    <Eye size={12}/>Utwórz link podglądu
                  </button>
                )}
              </div>
            </div>

            <JobRecoverableChargesPanel
              jobId={selectedJob.id}
              charges={recoverableCharges}
              jobNotes={selectedJob.jobNotes}
              onOpenCharge={onOpenRecoverableCharge}
              onCreateCharge={
                onChangeRecoverableCharges && onCommitRecoverableCharges
                  ? () => setShowCreateRecoverableCharge(true)
                  : undefined
              }
              onApproveBillingProposal={
                onChangeRecoverableCharges && onCommitRecoverableCharges
                  ? handleApproveBillingProposal
                  : undefined
              }
              onRejectBillingProposal={
                onChangeRecoverableCharges && onCommitRecoverableCharges
                  ? handleRejectBillingProposal
                  : undefined
              }
              onAddBillingNote={handleAddBillingNote}
              billingNoteActorName={createdByName}
              billingNoteActorRole="admin"
              directory={directory}
              viewerRole={adminSession?.role ?? "admin"}
            />

            {onOpenOperationalNote && onCreateOperationalNoteFromJob && (
              <JobOperationalNotesPanel
                job={selectedJob}
                notes={operationalNotes}
                session={adminSession}
                readState={operationalNotesReadState}
                onOpenNote={(noteId) => onOpenOperationalNote(noteId, selectedJob.id)}
                onCreateNote={() => onCreateOperationalNoteFromJob(operationalNoteCreatePresetForJob(selectedJob))}
                onOpenModule={() => onOpenOperationalNote("", selectedJob.id)}
              />
            )}

            {onOpenWmPrint && (
              <JobWmPrintHistoryPanel
                job={selectedJob}
                history={wmPrintHistory}
                onOpenModule={onOpenWmPrint}
              />
            )}

            {approveProposalContext && selectedJob && onChangeRecoverableCharges && onCommitRecoverableCharges && (
              <JobCreateRecoverableChargeModal
                key={approveProposalContext.proposalId}
                job={selectedJob}
                directory={directory}
                createdByName={createdByName}
                title="Zatwierdź zgłoszenie inspektora"
                submitLabel="Zatwierdź i utwórz pozycję"
                initialDraft={approveProposalContext.draft}
                onClose={() => setApproveProposalContext(null)}
                onSave={(draft) => {
                  const validation = validateRecoverableChargeDraft(draft);
                  if (!validation.ok) return false;
                  const proposalId = approveProposalContext.proposalId;
                  const liveJob = jobs.find((j) => j.id === selectedJob.id) ?? selectedJob;
                  const proposal = (liveJob.jobNotes || []).find((n) => n.id === proposalId);
                  if (!proposal || !isBillingProposalNote(proposal)) {
                    toast.error("Nie znaleziono zgłoszenia");
                    setApproveProposalContext(null);
                    return false;
                  }
                  if (!isBillingProposalPending(proposal)) {
                    const n = normalizeBillingProposalNote(proposal);
                    toast.info(
                      n.proposalStatus === "approved" && n.approvedChargeId
                        ? "Zgłoszenie zostało już zatwierdzone"
                        : "Zgłoszenie nie oczekuje na zatwierdzenie",
                    );
                    setApproveProposalContext(null);
                    return false;
                  }
                  const existingCharge = findRecoverableChargeByProposalId(recoverableCharges, proposalId);
                  if (existingCharge) {
                    toast.info(
                      `Pozycja już istnieje dla tego zgłoszenia (tag proposal:${proposalId}, id ${existingCharge.id})`,
                    );
                    setApproveProposalContext(null);
                    return false;
                  }
                  const normalized = finalizeRecoverableChargeDraftForSave(draft);
                  const next = appendRecoverableChargeCreate(recoverableCharges, normalized);
                  onChangeRecoverableCharges(next);
                  onCommitRecoverableCharges(next);
                  try {
                    let job = updateJobBillingProposalNote(
                      liveJob,
                      proposalId,
                      (n) => approveBillingProposalNote(n, normalized.id, createdByName),
                    );
                    job = appendJobActivity(
                      job,
                      "billing_proposal_approved",
                      billingProposalApprovedActivityText(proposal),
                      createdByName,
                    );
                    updateJob(job);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Nie udało się zaktualizować zgłoszenia");
                    return false;
                  }
                  setApproveProposalContext(null);
                  toast.success("Pozycja utworzona z zgłoszenia inspektora");
                  return true;
                }}
              />
            )}

            {showCreateRecoverableCharge && selectedJob && onChangeRecoverableCharges && onCommitRecoverableCharges && (
              <JobCreateRecoverableChargeModal
                job={selectedJob}
                directory={directory}
                createdByName={createdByName}
                onClose={() => setShowCreateRecoverableCharge(false)}
                onSave={(draft) => {
                  const validation = validateRecoverableChargeDraft(draft);
                  if (!validation.ok) return false;
                  const next = appendRecoverableChargeCreate(recoverableCharges, draft);
                  onChangeRecoverableCharges(next);
                  onCommitRecoverableCharges(next);
                  return true;
                }}
              />
            )}

            {showHistory && (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center gap-2 flex-wrap">
                  <ScrollText size={13} className="text-muted-foreground"/>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Historia roboty</span>
                  <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
                    {(selectedJob.activityLog || []).filter((ev) => !isInspectorActivityType(ev.type)).length}
                  </span>
                  {(() => {
                    const inspectorCount = collectInspectorFeed([selectedJob]).length;
                    if (inspectorCount === 0 || !onGoToInspector) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => onGoToInspector()}
                        className="ml-auto text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <ClipboardCheck size={11}/>
                        {inspectorCount} zmian inspektora → zakładka Inspektor
                      </button>
                    );
                  })()}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-border">
                  {(selectedJob.activityLog || []).filter((ev) => !isInspectorActivityType(ev.type)).length === 0 ? (
                    <p className="px-5 py-8 text-sm text-muted-foreground text-center">Brak wpisów — aktywność pojawi się po zmianach na robocie.</p>
                  ) : (
                    (selectedJob.activityLog || []).filter((ev) => !isInspectorActivityType(ev.type)).map((ev) => (
                      <div key={ev.id} className="px-5 py-3 flex gap-3">
                        <div className="shrink-0 w-16 text-[10px] text-muted-foreground pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {new Date(ev.at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs">
                            <span className="text-primary font-medium">{ACTIVITY_LABELS[ev.type]}</span>
                            <span className="text-muted-foreground"> · {ev.actor}</span>
                          </p>
                          <p className="text-xs text-foreground/90 mt-0.5">{ev.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {selectedJob && isWmClient(selectedJob.client) && onGoToInspector && (
              <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                  <ClipboardCheck size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0"/>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Odbiór WM</span>
                  <JobWmStageBadge job={selectedJob}/>
                  <JobWmPlannedBadge job={selectedJob}/>
                  {(selectedJob.jobNotes || []).length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-500">
                      {(selectedJob.jobNotes || []).length} not.
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onGoToInspector()}
                  className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-600/90 font-medium"
                >
                  Szczegóły w Inspektorze
                  <ChevronRight size={12}/>
                </button>
              </div>
            )}

            </>
            )}

            {detailSection === "documents" && (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={13} className="text-muted-foreground"/>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Dokumenty do odbioru</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{REQUIRED_DOCS.filter(d=>selectedJob.documents[d]).length}</span>/{REQUIRED_DOCS.length} wymaganych
                </span>
              </div>
              <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DOCUMENT_TYPES.map(doc=>{
                  const checked = selectedJob.documents[doc];
                  const optional = doc === "zdjecia";
                  const inspectorFile = doc === "rysunek"
                    ? latestJobFile(selectedJob, "plan_techniczny")
                    : (doc === "zlecenie" || doc === "kosztorys")
                      ? latestJobFile(selectedJob, doc)
                      : undefined;
                  return (
                    <button key={doc} onClick={()=>{
                      const next = !checked;
                      if (!next && !confirmReportSyncedDocUncheck(selectedJob, doc, isSuperAdmin)) return;
                      updateJob(
                        applyReportDocDocumentToggle(selectedJob, doc, next, isSuperAdmin),
                        { type: "document", text: `${next ? "Zaznaczono" : "Odznaczono"}: ${DOC_LABELS[doc]}` },
                      );
                    }}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${checked?"bg-green-500/10 border-green-500/20":optional?"bg-secondary border-dashed border-border hover:border-muted-foreground/30":"bg-secondary border-border hover:border-muted-foreground/30"} ${checked && isReportSyncedDocLocked(selectedJob, doc) && !isSuperAdmin ? "cursor-default" : ""}`}>
                      {checked
                        ? <CheckCircle2 size={15} className="text-green-400 shrink-0"/>
                        : <Circle size={15} className="text-muted-foreground/40 shrink-0"/>
                      }
                      <div className="min-w-0">
                        <span className={`text-xs font-medium leading-tight ${checked?"text-green-400":"text-muted-foreground"}`}>{DOC_LABELS[doc]}</span>
                        {optional&&<p className="text-[10px] text-muted-foreground/50 leading-none mt-0.5">opcjonalne</p>}
                        {checked && isReportSyncedDocLocked(selectedJob, doc) && (
                          <p className="text-[10px] text-green-600/80 dark:text-green-400/80 leading-none mt-0.5">
                            {isSuperAdmin ? "z dokumentacji ekipy · SA może zmienić" : "z dokumentacji ekipy"}
                          </p>
                        )}
                        {doc === "rysunek" && (
                          <p className="text-[10px] text-muted-foreground/80 leading-snug mt-1" title={RYSUNEK_PLAN_CHECKLIST_HELP}>
                            {RYSUNEK_PLAN_CHECKLIST_HELP}
                          </p>
                        )}
                        {inspectorFile && (
                          <p className="text-[10px] text-primary/80 leading-tight mt-0.5 truncate flex items-center gap-0.5" title={inspectorFile.filename}>
                            <FileText size={9} className="shrink-0"/>{inspectorFile.filename}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            )}

            {detailSection === "files" && selectedJob && (
            <JobFilesHub
              job={selectedJob}
              mode="full"
              contractItems={selectedJobCatalog}
              onPreviewContract={(item) => setPreviewItem(item.previewItem)}
              onDeleteContract={handleDeleteCatalogItem}
              contractDeleteBusyId={fileDeleteBusy}
              contractUploadSlot={(
                <>
                  <p className="text-[11px] text-muted-foreground mb-2">Wgraj zlecenie (PDF), kosztorys (.ath / .nor / PDF) lub plan techniczny (PDF):</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(["zlecenie", "kosztorys", "plan_techniczny"] as const).map((kind) => (
                      <InspectorJobFileUpload
                        key={kind}
                        kind={kind}
                        busy={uploadBusy === kind}
                        hasFile={!!latestJobFile(selectedJob, kind)}
                        buttonLabel={kind === "plan_techniczny" ? (latestJobFile(selectedJob, kind) ? "Wgraj nową wersję planu" : "Dodaj plan techniczny") : undefined}
                        onPick={(f) => void handleJobFileUpload(kind, f)}
                        onError={(msg) => setUploadMsg(msg)}
                      />
                    ))}
                  </div>
                </>
              )}
              contractUploadMsg={uploadMsg}
              packBusy={packBusy}
              onDownloadDocumentsPack={() => downloadJobDocumentsPack(selectedJob)}
              emailPanel={(
                <JobInspectorFilesPanel
                  jobId={selectedJob.id}
                  jobAddress={selectedJob.address}
                  jobFlat={selectedJob.flatNumber}
                  jobFiles={selectedJob.jobFiles || []}
                  inspectorPhotos={selectedJob.inspectorPhotos || []}
                  athPreviewEnabled={athPreviewEnabled}
                  contacts={contacts}
                  packSource={selectedJob}
                  hidePackButton
                  genericAttachments={collectActiveJobAttachments(selectedJob)}
                  title="Wyślij pliki emailem"
                  onEmailSent={(to, meta) => {
                    const suffix = meta?.genericCount ? ` (+ ${meta.genericCount} załączników)` : "";
                    updateJob(selectedJob, { type: "email_sent", text: `Wysłano pliki inspektora na ${to}${suffix}` });
                  }}
                  onDeleteFile={handleDeleteInspectorFileItem}
                />
              )}
              uploadedBy={adminSession?.displayName || "Administrator"}
              athPreviewEnabled={athPreviewEnabled}
              onJobUpdated={(next, activity) => updateJob(next as Job, activity ? { type: "inspector_file", text: activity.text } : undefined)}
              onGoToReports={() => setDetailSection("reports")}
              onGoToDocuments={() => setDetailSection("documents")}
            />
            )}

            {detailSection === "workers" && (
            <>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Users size={13} className="text-muted-foreground"/>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pracownicy na robocie</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {yesterdayEntriesToCopy.length > 0 && (
                    <button
                      type="button"
                      onClick={copyYesterdayToToday}
                      title="Skopiuj wszystkich z wczoraj na dziś (9 h / te same stawki)"
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-lg font-medium transition-colors"
                    >
                      <Copy size={11}/>Wczoraj → dziś ({yesterdayEntriesToCopy.length})
                    </button>
                  )}
                  {payrollEntriesForToday.length > 0 && (
                    <button
                      type="button"
                      onClick={fillTodayFromPayroll}
                      title="Dodaj pracowników zaznaczonych dziś w liście płac"
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 bg-secondary hover:bg-secondary/70 border border-border rounded-lg font-medium transition-colors"
                    >
                      <CalendarDays size={11}/>Z listy płac ({payrollEntriesForToday.length})
                    </button>
                  )}
                  <button onClick={openAddEntry} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-secondary hover:bg-secondary/70 border border-border rounded-lg font-medium transition-colors">
                    <Plus size={12}/>Dodaj wpis
                  </button>
                </div>
              </div>

              {/* Add entry form */}
              {showAddEntry&&(
                <div className="px-5 py-4 bg-secondary/40 border-b border-border space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nowy wpis pracy</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Pracownik</label>
                      <select value={entryDirId} onChange={e=>{
                        const id = e.target.value;
                        setEntryDirId(id);
                        const emp=directory.find(d=>d.id===id);
                        if(emp) setEntryRate(emp.defaultRate);
                        if(id) syncEntryHoursFromPayroll(id, entryDate);
                      }} className="w-full bg-background rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none transition-colors">
                        <option value="">Wybierz pracownika...</option>
                        {filterProductionActiveDirectory(directory).map(d=>(
                          <option key={d.id} value={d.id}>{d.name} — {d.position}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Data</label>
                      <input type="date" value={entryDate} onChange={e=>{
                        const d = e.target.value;
                        setEntryDate(d);
                        if(entryDirId) syncEntryHoursFromPayroll(entryDirId, d);
                      }} className="w-full bg-background rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none transition-colors" style={{fontFamily:"'JetBrains Mono', monospace"}}/>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">
                        Godziny{" "}
                        <span className="text-muted-foreground/70">
                          {selectedDirEmp?.multiSiteDaily
                            ? "(na tej robocie, nie cały dzień)"
                            : "(domyślnie 9 h lub z listy płac)"}
                        </span>
                      </label>
                      <input type="number" min="0.5" step="0.5" value={entryHours} onChange={e=>setEntryHours(e.target.value)} className="w-full bg-background rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none transition-colors" style={{fontFamily:"'JetBrains Mono', monospace"}}/>
                    </div>
                    {canViewRates && (
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Stawka (PLN/h)</label>
                      <input type="number" min="0" step="0.5" value={entryRate} onChange={e=>setEntryRate(e.target.value)} placeholder={selectedDirEmp?.defaultRate||"0"} className="w-full bg-background rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none transition-colors" style={{fontFamily:"'JetBrains Mono', monospace"}}/>
                    </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleAddEntry} disabled={!entryDirId||!entryHours} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      <Check size={13}/>Dodaj
                    </button>
                    <button onClick={()=>setShowAddEntry(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Anuluj</button>
                    {canViewRates && entryDirId&&entryHours&&entryRate&&(
                      <span className="ml-auto text-xs text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                        = {fmt((parseFloat(entryHours)||0)*(parseFloat(entryRate)||0))} PLN
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Work entries table */}
              {selectedJob.workEntries.length===0&&!showAddEntry&&(
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Brak wpisów. Kliknij "Dodaj wpis" aby dodać czas pracy.
                </div>
              )}
              {selectedJob.workEntries.length>0&&(
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-border" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                        <th className="px-5 py-2.5 text-left">Pracownik</th>
                        <th className="px-3 py-2.5 text-right">Dni</th>
                        <th className="px-3 py-2.5 text-right">Godziny</th>
                        <th className="px-3 py-2.5 text-right">Koszt</th>
                        <th className="px-3 py-2.5 w-16"/>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {workerGroups.map((group) => {
                        const isMulti = group.entries.length > 1;
                        const isExpanded = isMulti && expandedWorkerKeys.has(group.key);
                        const canCopyToday = !selectedJob.workEntries.some(
                          (e) => e.date === todayIso && (e.directoryId === group.directoryId || e.employeeName === group.employeeName),
                        ) && group.entries.some((e) => e.date !== todayIso);

                        if (!isMulti) {
                          const entry = group.entries[0];
                          return (
                            <tr key={group.key} className="hover:bg-secondary/20">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-3.5 shrink-0"/>
                                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                                    {group.employeeName ? group.employeeName[0].toUpperCase() : "?"}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-sm font-medium block truncate">{group.employeeName || "—"}</span>
                                    <span className="text-[11px] text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtDate(entry.date)}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right text-xs text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>1</td>
                              <td className="px-3 py-3 text-right font-medium" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(entry.hours)}</td>
                              <td className="px-3 py-3 text-right">
                                {canViewRates && (
                                <span className="text-xs text-muted-foreground block" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(entry.rate)} PLN/h</span>
                                )}
                                <span className="text-sm font-semibold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(entry.hours * entry.rate)}</span>
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center justify-end gap-0.5">
                                  {canCopyToday && (
                                    <button type="button" onClick={() => copyEntryToToday(entry)} title="Kopiuj na dziś" className="p-1 text-primary hover:text-primary/80 transition-colors rounded">
                                      <Copy size={12}/>
                                    </button>
                                  )}
                                  <button onClick={() => updateJob({ ...selectedJob, workEntries: selectedJob.workEntries.filter((e) => e.id !== entry.id) })} className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded">
                                    <Trash2 size={12}/>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <Fragment key={group.key}>
                            <tr
                              className={`cursor-pointer hover:bg-secondary/30 ${isExpanded ? "bg-secondary/15" : ""}`}
                              onClick={() => toggleWorkerGroup(group.key)}
                            >
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  {isExpanded
                                    ? <ChevronDown size={14} className="text-muted-foreground shrink-0"/>
                                    : <ChevronRight size={14} className="text-muted-foreground shrink-0"/>}
                                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                                    {group.employeeName ? group.employeeName[0].toUpperCase() : "?"}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-sm font-medium block truncate">{group.employeeName || "—"}</span>
                                    <span className="text-[10px] text-muted-foreground/70">
                                      {group.entries.length} wpis{group.entries.length < 5 ? "y" : "ów"} · kliknij aby rozwinąć
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right text-xs text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{group.dayCount}</td>
                              <td className="px-3 py-3 text-right font-medium" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(group.totalHours)}</td>
                              <td className="px-3 py-3 text-right font-semibold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(group.totalCost)}</td>
                              <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                                {canCopyToday && (
                                  <div className="flex items-center justify-end">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const last = group.entries.find((e) => e.date !== todayIso);
                                        if (last) copyEntryToToday(last);
                                      }}
                                      title="Kopiuj ostatni wpis na dziś"
                                      className="p-1 text-primary hover:text-primary/80 transition-colors rounded"
                                    >
                                      <Copy size={12}/>
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                            {isExpanded && group.entries.map((entry) => (
                              <tr key={entry.id} className="bg-secondary/10 hover:bg-secondary/20 border-t border-border/50">
                                <td className="pl-12 pr-3 py-2.5">
                                  <span className="text-xs text-muted-foreground block" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtDate(entry.date)}</span>
                                  <input
                                    type="text"
                                    placeholder="Notatka..."
                                    value={entry.notes || ""}
                                    onChange={(e) => updateJob({
                                      ...selectedJob,
                                      workEntries: selectedJob.workEntries.map((we) => we.id === entry.id ? { ...we, notes: e.target.value } : we),
                                    })}
                                    className="w-full mt-1 bg-transparent text-[11px] text-muted-foreground placeholder:text-muted-foreground/30 border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors py-0.5"
                                  />
                                </td>
                                <td className="px-3 py-2.5 text-right text-[11px] text-muted-foreground">—</td>
                                <td className="px-3 py-2.5 text-right text-xs" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(entry.hours)}</td>
                                <td className="px-3 py-2.5 text-right">
                                  {canViewRates && (
                                  <span className="text-xs text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(entry.rate)} PLN/h · </span>
                                  )}
                                  <span className="text-xs font-medium text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(entry.hours * entry.rate)}</span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center justify-end gap-0.5">
                                    {entry.date !== todayIso && !selectedJob.workEntries.some(
                                      (e) => e.date === todayIso && (e.directoryId === entry.directoryId || e.employeeName === entry.employeeName),
                                    ) && (
                                      <button type="button" onClick={() => copyEntryToToday(entry)} title="Kopiuj na dziś" className="p-1 text-primary hover:text-primary/80 transition-colors rounded">
                                        <Copy size={11}/>
                                      </button>
                                    )}
                                    <button onClick={() => updateJob({ ...selectedJob, workEntries: selectedJob.workEntries.filter((e) => e.id !== entry.id) })} className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded">
                                      <Trash2 size={11}/>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-secondary/30">
                        <td className="px-5 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Suma · {workerGroups.length} os.
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs font-bold" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                          {new Set(selectedJob.workEntries.map((e) => e.date)).size}
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs font-bold" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(jobTotalHours(selectedJob))}</td>
                        <td className="px-3 py-2.5 text-right text-sm font-bold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(jobCost(selectedJob))}</td>
                        <td/>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Cost summary card */}
              {selectedJob.workEntries.length>0&&(
                <div className="px-5 pb-2">
                  <div className="bg-secondary/50 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Koszt pracowników (brutto wpisów)</p>
                      <p className="text-xs text-muted-foreground">{jobTotalHours(selectedJob).toFixed(1)}h · {new Set(selectedJob.workEntries.map(e=>e.date)).size} dni</p>
                    </div>
                    <span className="text-lg font-bold text-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(jobCost(selectedJob))} PLN</span>
                  </div>
                </div>
              )}

              {selectedJob.workEntries.length > 0 && (
                <div className="px-5 pb-3">
                  <JobCostBreakdownPanel
                    workEntries={selectedJob.workEntries.map((e) => ({
                      date: e.date,
                      hours: e.hours,
                      rate: e.rate,
                    }))}
                    materialsCost={jobMaterialsCost(selectedJob)}
                    companyHoursSameWeek={companyWeekHours}
                  />
                </div>
              )}
            </div>

            {/* Materials */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2"><Package size={13} className="text-muted-foreground"/><span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Materiały</span></div>
                <button onClick={()=>{
                  const desc=window.prompt("Opis materiału:");
                  if(!desc) return;
                  const costStr=window.prompt("Koszt (PLN):");
                  const cost=parseFloat(costStr||"0")||0;
                  const m:MaterialEntry={id:crypto.randomUUID(),description:desc,cost,date:new Date().toISOString().slice(0,10)};
                  updateJob({...selectedJob,materials:[...(selectedJob.materials||[]),m]});
                }} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                  <Plus size={13}/>Dodaj
                </button>
              </div>
              {(selectedJob.materials||[]).length===0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground">Brak wpisów materiałów.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-muted-foreground border-b border-border" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                      <th className="px-5 py-2 text-left">Opis</th><th className="px-3 py-2 text-right">Data</th><th className="px-5 py-2 text-right">Koszt</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                      {(selectedJob.materials||[]).map(m=>(
                        <tr key={m.id} className="hover:bg-secondary/20 group">
                          <td className="px-5 py-2.5 font-medium">{m.description}</td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground text-xs" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtDate(m.date)}</td>
                          <td className="px-5 py-2.5 text-right font-semibold" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                            <span>{fmt(m.cost)} PLN</span>
                            <button onClick={()=>updateJob({...selectedJob,materials:(selectedJob.materials||[]).filter(x=>x.id!==m.id)})} className="ml-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"><Trash2 size={12}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="border-t border-border bg-secondary/20">
                      <td colSpan={2} className="px-5 py-2.5 text-xs font-bold text-muted-foreground uppercase">Suma materiałów</td>
                      <td className="px-5 py-2.5 text-right font-bold text-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(jobMaterialsCost(selectedJob))} PLN</td>
                    </tr></tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Total cost summary */}
            {(selectedJob.workEntries.length>0||(selectedJob.materials||[]).length>0)&&(
              <div className="bg-primary/10 border border-primary/20 rounded-xl px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Łączny koszt remontu</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Pracownicy: {fmt(jobCost(selectedJob))} PLN</span>
                    <span>Materiały: {fmt(jobMaterialsCost(selectedJob))} PLN</span>
                  </div>
                </div>
                <span className="text-2xl font-bold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(jobTotalCost(selectedJob))} <span className="text-base font-normal">PLN</span></span>
              </div>
            )}

            </>
            )}

            {detailSection === "photos" && (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Camera size={13} className="text-muted-foreground"/>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Zdjęcia</span>
                    {selectedPendingPhotoCount > 0 && (
                      <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {selectedPendingPhotoCount} nowych
                      </span>
                    )}
                  </div>
                  <HiddenFileInput multiple onPick={async (files) => {
                    if (!files?.length || !selectedJob || photoUploadBusy) return;
                    const fileList = Array.from(files);
                    const label = photoUploadLabel;
                    setPhotoUploadBusy(true);
                    const newPhotos: PhotoEntry[] = [];
                    try {
                      for (const file of fileList) {
                        const wm = await prepareWatermarkedPhoto(selectedJob, file);
                        const { entry, error } = await uploadPhoto(selectedJob.id, wm, label, "admin");
                        if (entry) {
                          newPhotos.push({ ...entry, status: "approved" });
                        } else if (error) {
                          window.alert(error);
                          break;
                        }
                      }
                      if (newPhotos.length > 0) {
                        const cat = PHOTO_LABEL_NAMES[label];
                        appendJobPhotos(
                          newPhotos,
                          newPhotos.length === 1
                            ? `Admin dodał zdjęcie (${cat})`
                            : `Admin dodał ${newPhotos.length} zdjęć (${cat})`,
                        );
                        toast.success(
                          newPhotos.length === 1
                            ? `Dodano zdjęcie (${cat})`
                            : `Dodano ${newPhotos.length} zdjęć (${cat})`,
                        );
                      }
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : "Błąd wgrywania zdjęcia";
                      toast.error("Nie udało się wgrać zdjęcia", { description: msg });
                    } finally {
                      setPhotoUploadBusy(false);
                    }
                  }}>
                    {(open) => (
                      <button
                        type="button"
                        onClick={open}
                        disabled={photoUploadBusy}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 shrink-0"
                      >
                        <ImagePlus size={13}/>{photoUploadBusy ? "Wgrywanie…" : "Dodaj zdjęcia"}
                      </button>
                    )}
                  </HiddenFileInput>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-muted-foreground shrink-0">Kategoria:</span>
                  {PHOTO_LABEL_ORDER.map((label) => {
                    const meta = getAppPhotoLabelSection()[label];
                    const Icon = meta.icon;
                    const active = photoUploadLabel === label;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setPhotoUploadLabel(label)}
                        disabled={photoUploadBusy}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors disabled:opacity-50 ${
                          active
                            ? `${meta.accent} bg-secondary border-current`
                            : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        }`}
                      >
                        <Icon size={12}/>
                        {PHOTO_LABEL_NAMES[label]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="p-4">
                <JobPhotoGallery
                  photos={selectedJob.photos||[]}
                  onUpdate={(photos, activity) => {
                    updateJob({ ...selectedJob, photos }, activity);
                  }}
                />
              </div>
            </div>
            )}

            {detailSection === "reports" && (
            <JobWorkerReportsPanel
              jobId={selectedJob.id}
              job={selectedJob}
              authorName={adminSession?.displayName || "Administrator"}
              authorAdminRole={adminSession?.role && adminSession.role !== "inspector" ? adminSession.role : "admin"}
              reports={jobWorkerReports(selectedJob)}
              onAddReport={(report) => updateJob({
                ...selectedJob,
                workerReports: [...jobWorkerReports(selectedJob), report],
                reportDocSaOverride: clearReportDocSaOverrideFromReport(selectedJob.reportDocSaOverride, report),
              }, { type: "report_add", text: `Dodano dokumentację (${scopeTextLineCount(getReportWorkScopeText(report))} linii)` })}
              onDelete={(reportId) => updateJob({
                ...selectedJob,
                workerReports: jobWorkerReports(selectedJob).filter(r => r.id !== reportId),
              }, { type: "report_delete", text: "Usunięto dokumentację" })}
            />
            )}

          </div>
        </div>
        </div>
      ) : (
        <div className="hidden sm:flex flex-col flex-[13] min-w-0 min-h-0 overflow-hidden">
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-3 sm:py-4">
            <div className="shrink-0 w-full max-w-3xl md:max-w-none mx-auto">
              <JobsDetailEmptyState
                onNewJob={addJob}
                onAllFiles={() => setShowAllFiles(true)}
                fileCount={totalJobFilesCount}
                jobCount={jobs.length}
              />
            </div>
            <div
              className="shrink-0 w-full max-w-3xl md:max-w-none mx-auto mt-3 pt-3 border-t border-border
                [&_aside]:h-auto [&_aside]:min-h-0 [&_aside]:bg-transparent
                [&_aside>div:first-child]:hidden
                [&_aside>div:last-child]:flex-none [&_aside>div:last-child]:overflow-visible [&_aside>div:last-child]:px-0 [&_aside>div:last-child]:pt-2 [&_aside>div:last-child]:pb-0"
            >
              <JobListGuidePanel />
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
      )}
      {showEmailModal && selectedJob && (
        <JobEmailModal
          job={selectedJob}
          contacts={contacts}
          onClose={() => setShowEmailModal(false)}
          onManageContacts={() => { setShowEmailModal(false); onManageContacts(); }}
          onSent={(to) => updateJob(selectedJob, { type: "email_sent", text: `Wysłano materiały na ${to}` })}
        />
      )}
      {showInspectorContactModal && selectedJob && (
        <JobInspectorContactModal
          job={selectedJob}
          contacts={contacts}
          senderName={createdByName}
          onClose={() => setShowInspectorContactModal(false)}
          onManageContacts={() => { setShowInspectorContactModal(false); onManageContacts(); }}
          onSent={(templateId: InspectorTemplateId, to) =>
            updateJob(selectedJob, {
              type: "email_sent",
              text: inspectorTemplateActivityText(templateId, to),
              actor: createdByName,
            })
          }
        />
      )}
      {previewItem && (
        <JobFilePreviewModal
          item={previewItem}
          athPreviewEnabled={athPreviewEnabled}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
}

