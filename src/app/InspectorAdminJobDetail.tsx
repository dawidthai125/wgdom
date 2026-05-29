import { useCallback, useState } from "react";
import {
  ArrowLeft, ScrollText, ClipboardCheck, CheckCircle2, Circle, FileText,
} from "lucide-react";
import { JobWmPanel } from "@/app/JobWmPanel";
import { JobInspectorFilesPanel } from "@/app/JobInspectorFilesPanel";
import {
  appendJobActivity,
  isInspectorActivityType,
  type JobActivity,
  type JobWithActivity,
} from "@/lib/job-activity";
import { InspectorJobFileUpload } from "@/app/InspectorJobFileUpload";
import { uploadJobFile, deleteJobFile } from "@/lib/job-file-upload";
import {
  latestJobFile,
  DOC_LABELS,
  removeJobFileAttachment,
  resolveJobFileStoragePath,
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

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length <= 10 ? "T12:00:00" : ""));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
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
  job: JobWithActivity & JobWmJobMutable;
  onUpdate: (job: JobWithActivity & JobWmJobMutable) => void;
  onBack: () => void;
  returnNav?: { label: string; onBack: () => void };
  actorName: string;
  actorAdminRole?: AdminRole;
  contacts: EmailContact[];
  athPreviewEnabled: boolean;
  directory: { name: string; phone: string }[];
}) {
  const [uploadBusy, setUploadBusy] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState("");
  const [stageSuggestion, setStageSuggestion] = useState<JobHandoverStage | null>(null);

  const jobInspectorHistory = useCallback((limit = 8): JobActivity[] => {
    return (job.activityLog || []).filter((ev) => isInspectorActivityType(ev.type)).slice(0, limit);
  }, [job.activityLog]);

  const updateJob = (updated: JobWithActivity & JobWmJobMutable, activity?: { type: import("@/lib/job-activity").JobActivityType; text: string }) => {
    let next = activity
      ? appendJobActivity(updated, activity.type, activity.text, actorName)
      : updated;
    next = normalizeJobMetaFields(normalizeJobWmFields(next) as typeof next);
    onUpdate(next);
  };

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
      <div className="flex-1 w-full overflow-y-auto overscroll-contain">
        <div
          className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-8 space-y-5"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
            <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-primary min-h-[44px] -ml-1">
              <ArrowLeft size={16}/>Lista inspektora
            </button>
            {returnNav && (
              <button type="button" onClick={returnNav.onBack} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary min-h-[44px]">
                <ArrowLeft size={16}/>{returnNav.label}
              </button>
            )}
          </div>
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

        <div className="bg-card border border-border rounded-2xl p-4">
          <h1 className="text-lg font-bold leading-snug">
            {job.address || "Bez adresu"}{job.flatNumber && ` m.${job.flatNumber}`}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{job.client || "—"}</p>
          <JobMetaBadges job={job}/>
          <p className="text-xs text-muted-foreground mt-2">
            {fmtDate(job.startDate)}{job.endDate && ` → ${fmtDate(job.endDate)}`}
            {" · "}{job.status === "completed" ? "Zdana" : "W trakcie"}
          </p>
          <div className="mt-3">
            <JobMetaPickers
              housingType={job.housingType}
              stoveType={job.stoveType}
              onHousingChange={(v) => updateJob({ ...job, housingType: v })}
              onStoveChange={(v) => updateJob({ ...job, stoveType: v })}
            />
          </div>
        </div>

        <JobWmPanel
          job={job}
          onUpdate={(updated) => updateJob(updated)}
          actorName={actorName}
          actorRole="admin"
          directory={directory}
        />

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
                      onClick={() => {
                        const next = !checked;
                        updateJob(
                          { ...job, documents: { ...job.documents, [kind]: next } },
                          { type: "document", text: `${next ? "Zaznaczono" : "Odznaczono"}: ${DOC_LABELS[kind]}` },
                        );
                      }}
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
                          directory={directory}
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
                      directory={directory}
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
        </div>
      </div>
    </div>
  );
}
