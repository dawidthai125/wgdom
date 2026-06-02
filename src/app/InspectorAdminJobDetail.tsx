import { useCallback, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ScrollText, ClipboardCheck, CheckCircle2, Circle, FileText,
  ClipboardList, Users, Phone, Ruler, ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react";
import { JobWmPanel, JobWmStageBadge, JobWmPlannedBadge } from "@/app/JobWmPanel";
import { JobInspectorFilesPanel } from "@/app/JobInspectorFilesPanel";
import {
  appendJobActivity,
  isInspectorActivityType,
  type JobActivity,
  type JobWithActivity,
} from "@/lib/job-activity";
import { InspectorJobFileUpload } from "@/app/InspectorJobFileUpload";
import { JobPhotoImg } from "@/app/JobPhotoImg";
import { isMediaAttachmentAvailable } from "@/lib/media-filter";
import { uploadJobFile, deleteJobFile } from "@/lib/job-file-upload";
import {
  latestJobFile,
  DOC_LABELS,
  DOCUMENT_TYPES,
  REQUIRED_DOCS,
  removeJobFileAttachment,
  resolveJobFileStoragePath,
  type DocType,
} from "@/lib/job-documents";
import {
  applyHandoverStageToJob,
  inferHandoverStage,
  HANDOVER_STAGE_LABELS,
  normalizeJobWmFields,
  removeInspectorPhoto,
  type JobHandoverStage,
} from "@/lib/job-wm";
import { JobMetaPickers, JobMetaBadges } from "@/app/JobMetaPickers";
import { normalizeJobMetaFields } from "@/lib/job-meta";
import type { EmailContact } from "@/lib/email-contacts";
import { AuthorAttribution } from "@/app/AuthorAttribution";
import type { AdminRole } from "@/lib/admin-auth";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import {
  InspectorJobSectionNav,
  type InspectorJobSection,
} from "@/app/InspectorNavigation";
import { InspectorPhotoGallery } from "@/app/InspectorPhotoGallery";
import { WorkScopeDisplay } from "@/app/WorkScopeEditor";
import { getReportWorkScopeText, reportHasWorkScope, scopeTextLineCount } from "@/lib/work-scope-text";

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length <= 10 ? "T12:00:00" : ""));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function uniqueWorkersOnJob(
  job: { workEntries?: { directoryId?: string; employeeName: string }[] },
  directory: { id: string; name: string; phone: string; position?: string }[],
): { name: string; phone: string; position: string }[] {
  const seen = new Set<string>();
  const out: { name: string; phone: string; position: string }[] = [];
  for (const e of job.workEntries || []) {
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

export function InspectorAdminJobDetail({
  job,
  onUpdate,
  onBack,
  returnNav,
  actorName,
  actorAdminRole = "admin",
  contacts,
  athPreviewEnabled,
  directory,
}: {
  job: JobWithActivity & import("@/app/JobWmPanel").JobWmJobMutable;
  onUpdate: (job: JobWithActivity & import("@/app/JobWmPanel").JobWmJobMutable) => void;
  onBack: () => void;
  returnNav?: { label: string; onBack: () => void };
  actorName: string;
  actorAdminRole?: AdminRole;
  contacts: EmailContact[];
  athPreviewEnabled: boolean;
  directory: { id: string; name: string; phone: string; position?: string }[];
}) {
  const [uploadBusy, setUploadBusy] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState("");
  const [stageSuggestion, setStageSuggestion] = useState<JobHandoverStage | null>(null);
  const [jobSection, setJobSection] = useState<InspectorJobSection>("wm");
  const [openReportId, setOpenReportId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const directoryContacts = useMemo(
    () => directory.map((d) => ({ name: d.name, phone: d.phone })),
    [directory],
  );

  const selectSection = (id: InspectorJobSection) => {
    setJobSection(id);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const jobInspectorHistory = useCallback((limit = 8): JobActivity[] => {
    return (job.activityLog || []).filter((ev) => isInspectorActivityType(ev.type)).slice(0, limit);
  }, [job.activityLog]);

  const updateJob = (
    updated: JobWithActivity & import("@/app/JobWmPanel").JobWmJobMutable,
    activity?: { type: import("@/lib/job-activity").JobActivityType; text: string },
  ) => {
    let next = activity
      ? appendJobActivity(updated, activity.type, activity.text, actorName)
      : updated;
    next = normalizeJobMetaFields(normalizeJobWmFields(next) as typeof next);
    onUpdate(next);
  };

  const toggleDoc = (doc: DocType) => {
    const next = !job.documents[doc];
    updateJob(
      { ...job, documents: { ...job.documents, [doc]: next } },
      { type: "document", text: `${next ? "Zaznaczono" : "Odznaczono"}: ${DOC_LABELS[doc]}` },
    );
  };

  const jobSectionBadges = useMemo((): Partial<Record<InspectorJobSection, number>> => {
    const badges: Partial<Record<InspectorJobSection, number>> = {};
    const missingFiles = (!job.documents.zlecenie ? 1 : 0) + (!job.documents.kosztorys ? 1 : 0);
    if (missingFiles) badges.files = missingFiles;
    const missingDocs = REQUIRED_DOCS.filter((d) => !job.documents[d]).length;
    if (missingDocs) badges.docs = missingDocs;
    const reportCount = (job.workerReports || []).length;
    if (reportCount) badges.reports = reportCount;
    const photoCount = (job.photos || []).filter((p) => p.status === "approved").length
      + (job.inspectorPhotos || []).length;
    if (photoCount) badges.photos = photoCount;
    return badges;
  }, [job]);

  const handleFileUpload = async (kind: "zlecenie" | "kosztorys", file: File) => {
    setUploadMsg("");
    setUploadBusy(kind);
    const { attachment } = await uploadJobFile(job.id, file, kind, actorName);
    if (!attachment) {
      setUploadBusy(null);
      return;
    }
    updateJob(
      appendJobActivity(
        {
          ...job,
          jobFiles: [...(job.jobFiles || []).filter((f) => f.kind !== kind), attachment],
          documents: { ...job.documents, [kind]: true },
        },
        "inspector_file",
        `Admin wgrał ${kind === "zlecenie" ? "zlecenie PDF" : "kosztorys"}: ${file.name}`,
        actorName,
      ),
    );
    if (kind === "zlecenie" && inferHandoverStage(job) === "awaiting_order") {
      setStageSuggestion("in_progress");
    }
    setUploadBusy(null);
  };

  const handleDeleteFile = async (item: InspectorFileItem) => {
    const label = item.kind === "jobFile"
      ? item.file.filename
      : (item.file.caption || "zdjęcie inspektora");
    if (!window.confirm(`Usunąć „${label}”?\n\nPlik zostanie usunięty ze storage i zniknie wszędzie w aplikacji.`)) {
      return;
    }
    const path = item.kind === "jobFile"
      ? resolveJobFileStoragePath(item.file)
      : item.file.path;
    if (path) {
      const { ok, error } = await deleteJobFile(path);
      if (!ok) {
        window.alert(error || "Nie udało się usunąć pliku ze storage");
        return;
      }
    }
    const now = new Date().toISOString();
    const next = item.kind === "jobFile"
      ? removeJobFileAttachment({ ...job, updatedAt: now }, item.file.id)
      : { ...removeInspectorPhoto({ ...job, updatedAt: now }, item.file.id), updatedAt: now };
    updateJob(next, {
      type: item.kind === "jobFile" ? "inspector_file" : "inspector_photo",
      text: `Usunięto ${item.kind === "jobFile" ? "plik" : "zdjęcie"}: ${label}`,
    });
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 w-full overflow-hidden">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border shrink-0">
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 pt-4 pb-2 space-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-primary min-h-[44px] -ml-1">
              <ArrowLeft size={16}/>Lista inspektora
            </button>
            {returnNav && (
              <button type="button" onClick={returnNav.onBack} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary min-h-[44px]">
                <ArrowLeft size={16}/>{returnNav.label}
              </button>
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold leading-snug truncate">
              {job.address || "Bez adresu"}{job.flatNumber && ` m.${job.flatNumber}`}
            </h1>
            <p className="text-sm text-muted-foreground truncate">{job.client || "—"}</p>
            <JobMetaBadges job={job}/>
          </div>
          <InspectorJobSectionNav
            active={jobSection}
            badges={jobSectionBadges}
            onSelect={selectSection}
          />
          <p className="text-[10px] text-muted-foreground px-0.5 pb-1">
            {jobSection === "wm" && "Etap odbioru WM, notatki i historia inspektora"}
            {jobSection === "files" && "Zlecenie, kosztorys — wgraj pliki lub wyślij mailem"}
            {jobSection === "docs" && "Checklist dokumentów wymaganych przy odbiorze"}
            {jobSection === "team" && "Kto pracował na robocie — numery telefonów"}
            {jobSection === "reports" && "Raporty ekipy: zakres prac, wymiary, rysunki"}
            {jobSection === "photos" && "Zdjęcia ekipy i inspektora"}
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 w-full overflow-y-auto overscroll-contain"
      >
        <div
          className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-6 space-y-5"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          {jobSection === "wm" && (
            <>
              {stageSuggestion && (
                <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 flex-1">
                    Zlecenie wgrane — zmienić etap na <strong>{HANDOVER_STAGE_LABELS[stageSuggestion]}</strong>?
                  </p>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        updateJob(
                          appendJobActivity(
                            applyHandoverStageToJob(job, stageSuggestion),
                            "inspector_stage",
                            `Etap: ${HANDOVER_STAGE_LABELS[stageSuggestion]}`,
                            actorName,
                          ),
                        );
                        setStageSuggestion(null);
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
                  <JobWmStageBadge job={job}/>
                  <JobWmPlannedBadge job={job}/>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${job.status === "completed" ? "bg-green-500/15 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                    {job.status === "completed" ? "Zdana" : "W trakcie"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {fmtDate(job.startDate)}{job.endDate && ` → ${fmtDate(job.endDate)}`}
                </p>
                <JobMetaPickers
                  housingType={job.housingType}
                  stoveType={job.stoveType}
                  onHousingChange={(v) => updateJob({ ...job, housingType: v })}
                  onStoveChange={(v) => updateJob({ ...job, stoveType: v })}
                />
              </div>

              <JobWmPanel
                job={job}
                onUpdate={(updated) => updateJob(updated)}
                actorName={actorName}
                actorRole="admin"
                directory={directoryContacts}
                onGoToPhotos={() => selectSection("photos")}
              />

              {jobInspectorHistory().length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-4">
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <ScrollText size={15}/> Historia inspektora
                  </p>
                  <div className="space-y-2">
                    {jobInspectorHistory().map((ev) => (
                      <div key={ev.id} className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-3 py-0.5">
                        <span className="text-foreground/90 font-medium">
                          <AuthorAttribution
                            name={ev.actor}
                            directory={directoryContacts}
                            accentClass="text-foreground/90 font-medium"
                          />
                        </span>
                        {" · "}
                        {ev.text}
                        {" · "}
                        {new Date(ev.at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {job.notes && (
                <div className="bg-card border border-border rounded-2xl p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notatki</p>
                  <p className="text-sm whitespace-pre-wrap">{job.notes}</p>
                </div>
              )}
            </>
          )}

          {jobSection === "files" && (
            <>
              <div className="bg-card rounded-xl border border-emerald-500/25 overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                  <ClipboardCheck size={13} className="text-emerald-600 dark:text-emerald-400"/>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Zlecenie · Kosztorys</span>
                </div>
                <div className="p-4 grid sm:grid-cols-2 gap-3">
                  {(["zlecenie", "kosztorys"] as const).map((kind) => {
                    const checked = job.documents[kind];
                    const file = latestJobFile(job, kind);
                    const label = kind === "zlecenie" ? "Zlecenie" : "Kosztorys";
                    return (
                      <div
                        key={kind}
                        className={`rounded-xl border p-4 space-y-2 ${checked ? "border-green-500/30 bg-green-500/5" : "border-border bg-secondary/20"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">{label}</p>
                          <button
                            type="button"
                            onClick={() => toggleDoc(kind)}
                            className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full transition-colors ${checked ? "bg-green-500/15 text-green-400" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                          >
                            {checked ? <CheckCircle2 size={12}/> : <Circle size={12}/>}
                            {checked ? "Jest" : "Brak"}
                          </button>
                        </div>
                        {file ? (
                          <>
                            <a href={file.publicUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 truncate">
                              <FileText size={12} className="shrink-0"/>{file.filename}
                            </a>
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
                          <p className="text-xs text-muted-foreground">Brak pliku — wgraj poniżej lub poczekaj na inspektora</p>
                        )}
                        <InspectorJobFileUpload
                          kind={kind}
                          busy={uploadBusy === kind}
                          hasFile={!!file}
                          className="py-2"
                          onPick={(f) => handleFileUpload(kind, f)}
                          onError={(msg) => setUploadMsg(msg)}
                        />
                      </div>
                    );
                  })}
                </div>
                {uploadMsg && (
                  <p className="px-4 pb-3 text-xs text-destructive">{uploadMsg}</p>
                )}
              </div>

              <JobInspectorFilesPanel
                jobId={job.id}
                jobAddress={job.address}
                jobFlat={job.flatNumber}
                jobFiles={job.jobFiles || []}
                inspectorPhotos={job.inspectorPhotos || []}
                athPreviewEnabled={athPreviewEnabled}
                contacts={contacts}
                packSource={job}
                onEmailSent={(to) => updateJob(job, { type: "email_sent", text: `Wysłano pliki inspektora na ${to}` })}
                onDeleteFile={handleDeleteFile}
              />
            </>
          )}

          {jobSection === "docs" && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ClipboardList size={15}/> Dokumentacja robót
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DOCUMENT_TYPES.map((doc) => {
                  const checked = job.documents[doc];
                  const required = (REQUIRED_DOCS as readonly string[]).includes(doc);
                  return (
                    <button
                      key={doc}
                      type="button"
                      onClick={() => toggleDoc(doc)}
                      className={`flex items-center gap-2 text-left text-xs px-3 py-2.5 rounded-xl border transition-colors min-h-[44px] ${checked ? "border-green-500/30 bg-green-500/10 text-green-400" : required ? "border-amber-500/20 bg-amber-500/5 text-muted-foreground" : "border-border bg-secondary/30 text-muted-foreground"}`}
                    >
                      {checked ? <CheckCircle2 size={14} className="shrink-0"/> : <Circle size={14} className="shrink-0"/>}
                      <span className="leading-tight">{DOC_LABELS[doc]}</span>
                    </button>
                  );
                })}
              </div>
              {REQUIRED_DOCS.filter((d) => !job.documents[d]).length > 0 && (
                <p className="text-[11px] text-amber-400/90 mt-3 flex items-start gap-1.5">
                  <AlertCircle size={12} className="shrink-0 mt-0.5"/>
                  Brakuje: {REQUIRED_DOCS.filter((d) => !job.documents[d]).map((d) => DOC_LABELS[d]).join(", ")}
                </p>
              )}
            </div>
          )}

          {jobSection === "team" && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Users size={15}/> Pracownicy na robocie
              </p>
              {uniqueWorkersOnJob(job, directory).length === 0 ? (
                <p className="text-xs text-muted-foreground">Brak wpisów czasu pracy</p>
              ) : (
                <div className="space-y-2">
                  {uniqueWorkersOnJob(job, directory).map((w) => (
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
                </p>
              </div>
              {(job.workerReports || []).length === 0 ? (
                <p className="px-4 py-6 text-xs text-muted-foreground text-center">Brak raportów od pracowników</p>
              ) : (
                <div className="divide-y divide-border">
                  {[...(job.workerReports || [])].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).map((report) => {
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
                            {report.sketch && isMediaAttachmentAvailable(report.sketch) && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Rysunek / wymiary (foto)</p>
                                <button type="button" onClick={() => setLightbox({ url: report.sketch!.publicUrl, label: "Rysunek" })} className="block w-full max-w-xs rounded-xl overflow-hidden border border-border">
                                  <JobPhotoImg src={report.sketch.publicUrl} alt="Rysunek" className="w-full h-auto object-cover"/>
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
              jobAddress={job.address || "robota"}
              crewPhotos={job.photos || []}
              inspectorPhotos={job.inspectorPhotos || []}
              directory={directoryContacts}
            />
          )}
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button type="button" className="absolute top-4 right-4 p-2 text-white" style={{ top: "max(1rem, env(safe-area-inset-top))" }} onClick={() => setLightbox(null)}>
            ×
          </button>
          <p className="text-white text-sm mb-3">{lightbox.label}</p>
          <JobPhotoImg src={lightbox.url} alt={lightbox.label} className="max-w-full max-h-[85dvh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()}/>
        </div>
      )}
    </div>
  );
}
