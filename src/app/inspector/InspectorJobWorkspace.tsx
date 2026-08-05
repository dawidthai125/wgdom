import { useState } from "react";
import type { RefObject } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Eye,
  FileText,
  MessageSquare,
  Phone,
  Ruler,
  ScrollText,
  Users,
} from "lucide-react";
import { JobPhotoImg } from "@/app/JobPhotoImg";
import { isMediaAttachmentAvailable } from "@/lib/media-filter";
import { InspectorBillingProposalModal } from "@/app/InspectorBillingProposalModal";
import { InspectorDocChecklist } from "@/app/InspectorDocChecklist";
import { InspectorDeliveryPackagePanel } from "@/app/InspectorDeliveryPackagePanel";
import { InspectorHandoverQuickBar } from "@/app/InspectorHandoverQuickBar";
import { InspectorHint } from "@/app/InspectorHelp";
import { InspectorJobFileUpload } from "@/app/InspectorJobFileUpload";
import { InspectorPhotoGallery } from "@/app/InspectorPhotoGallery";
import { InspectorProgressBar } from "@/app/InspectorProgressBar";
import {
  InspectorJobSectionNav,
  InspectorQuickActions,
  type InspectorJobSection,
} from "@/app/InspectorNavigation";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { JobInspectorFilesPanel } from "@/app/JobInspectorFilesPanel";
import { JobListPrimaryBadge } from "@/app/JobListStatus";
import { DeliveryPackageStatusBadge } from "@/app/DeliveryPackageStatusBadge";
import { JobMetaBadges, JobMetaPickers } from "@/app/JobMetaPickers";
import { JobRecoverableChargesPanel } from "@/app/JobRecoverableChargesPanel";
import { JobWmPanel, JobWmPlannedBadge, JobWmStageBadge } from "@/app/JobWmPanel";
import { WorkScopeDisplay } from "@/app/WorkScopeEditor";
import { AuthorAttribution } from "@/app/AuthorAttribution";
import { PullToRefreshIndicator } from "@/app/usePullToRefresh";
import type { BillingNotePendingFiles } from "@/app/JobRecoverableChargesPanel";
import type { JobActivity } from "@/lib/job-activity";
import { appendJobActivity } from "@/lib/job-activity";
import { computeInspectionProgress } from "@/lib/inspector-dashboard";
import type { InspectorHandoverQuickActionId } from "@/lib/inspector-handover-ux";
import {
  applyHandoverStageToJob,
  HANDOVER_STAGE_LABELS,
  type InspectorPhotoLabel,
  type JobHandoverStage,
  type JobWmJob,
} from "@/lib/job-wm";
import type { DocType, JobFileAttachment } from "@/lib/job-documents";
import { latestJobFile } from "@/lib/job-documents";
import { isPdfFilename, isKosztorysPreviewExt } from "@/lib/ath-parser";
import type { RecoverableCharge } from "@/lib/recoverable-charges";
import type { DeliveryPackagePublication } from "@/lib/delivery-package-publications/types";
import type { HousingType, StoveType, GasFurnaceStatus } from "@/lib/job-meta";
import { getReportWorkScopeText, reportHasWorkScope, scopeTextLineCount } from "@/lib/work-scope-text";
import type { AdminRole } from "@/lib/admin-auth";
import { WgButton } from "@/app/ui";
import { JobTechnicalSketchesPanel } from "@/app/JobTechnicalSketchesPanel";
import { cn } from "@/app/components/ui/utils";
import { WG_TOUCH_MIN, WG_TYPE_TITLE } from "@/lib/wg-ui-tokens";

type DirectoryContact = { name: string; phone: string };

type DirectoryEmployee = {
  id: string;
  name: string;
  phone: string;
  position: string;
};

type WorkReportItem = {
  id: string;
  text: string;
  note: string;
};

type RoomDimension = {
  id: string;
  roomType: string;
  customLabel: string;
  length: string;
  width: string;
  height: string;
  note?: string;
};

type WorkerJobReport = {
  id: string;
  workerName: string;
  authorAdminRole?: AdminRole | "worker";
  submittedAt: string;
  updatedAt?: string;
  workItems: WorkReportItem[];
  rooms: RoomDimension[];
  generalNote?: string;
  sketchNote?: string;
  sketch?: { path: string; publicUrl: string } | null;
};

export type InspectorJobWorkspaceJob = JobWmJob & {
  endDate: string;
  workEntries: {
    id: string;
    directoryId: string;
    employeeName: string;
    date: string;
    hours: number;
  }[];
  photos: {
    id: string;
    publicUrl: string;
    label: "before" | "after" | "progress";
    uploadedBy: string;
    uploadedAt: string;
    status: "pending" | "approved" | "rejected";
    caption?: string;
  }[];
  workerReports?: WorkerJobReport[];
  jobFiles?: JobFileAttachment[];
  activityLog?: JobActivity[];
  housingType?: HousingType | "";
  stoveType?: StoveType | "";
  gasFurnaceStatus?: GasFurnaceStatus | "";
  notes?: string;
};

export type InspectorJobWorkspaceProps = {
  job: InspectorJobWorkspaceJob;
  jobSection: InspectorJobSection;
  jobReturnLabel: string;
  displayName: string;
  /** Id konta inspektora (ACL szkiców). */
  inspectorUserId?: string;
  msg: string;
  onClose: () => void;
  onJobSectionChange: (section: InspectorJobSection) => void;
  jobSectionBadges: Partial<Record<InspectorJobSection, number>>;
  jobQuickActions: { section: InspectorJobSection; label: string; icon: typeof MessageSquare }[];
  deliveryPackageReady: boolean | null;
  deliveryPackagePublications: DeliveryPackagePublication[];
  packageDownloadBusy: boolean;
  onHandoverQuickAction: (id: InspectorHandoverQuickActionId) => void;
  onPackageDownload: () => void;
  updateJob: (job: InspectorJobWorkspaceJob) => void;
  recoverableCharges: RecoverableCharge[];
  directoryContacts: DirectoryContact[];
  directory: DirectoryEmployee[];
  jobsById: Map<string, { id: string; address: string; flatNumber?: string; client?: string }>;
  athPreviewEnabled: boolean;
  uploadBusy: string | null;
  onToggleDoc: (job: InspectorJobWorkspaceJob, doc: DocType) => void;
  onFileUpload: (job: InspectorJobWorkspaceJob, kind: JobFileAttachment["kind"], file: File) => void | Promise<void>;
  onStatusMessage: (msg: string) => void;
  onPreview: (item: InspectorFileItem) => void;
  onLightbox: (url: string, label: string) => void;
  onInspectorPhotoUpload: (file: File, label: InspectorPhotoLabel, caption: string) => Promise<boolean>;
  onAddBillingNote: (chargeId: string, text: string, files?: BillingNotePendingFiles) => Promise<void>;
  onSubmitBillingProposal: (payload: {
    title: string;
    description: string;
    amount: number;
    files?: BillingNotePendingFiles;
  }) => Promise<void>;
  jobInspectorHistory: (job: InspectorJobWorkspaceJob, limit?: number) => JobActivity[];
  stageSuggestion: { jobId: string; stage: JobHandoverStage } | null;
  onStageSuggestionChange: (value: { jobId: string; stage: JobHandoverStage } | null) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
  pull: { pull: number; refreshing: boolean; ready: boolean };
  initialSketchDrawingId?: string | null;
  onInitialSketchDrawingConsumed?: () => void;
};

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function uniqueWorkersOnJob(
  job: InspectorJobWorkspaceJob,
  directory: DirectoryEmployee[],
): { name: string; phone: string; position: string }[] {
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

export function InspectorJobWorkspace({
  job,
  jobSection,
  jobReturnLabel,
  displayName,
  inspectorUserId,
  msg,
  onClose,
  onJobSectionChange,
  jobSectionBadges,
  jobQuickActions,
  deliveryPackageReady,
  deliveryPackagePublications,
  packageDownloadBusy,
  onHandoverQuickAction,
  onPackageDownload,
  updateJob,
  recoverableCharges,
  directoryContacts,
  directory,
  jobsById,
  athPreviewEnabled,
  uploadBusy,
  onToggleDoc,
  onFileUpload,
  onStatusMessage,
  onPreview,
  onLightbox,
  onInspectorPhotoUpload,
  onAddBillingNote,
  onSubmitBillingProposal,
  jobInspectorHistory,
  stageSuggestion,
  onStageSuggestionChange,
  scrollRef,
  pull,
  initialSketchDrawingId = null,
  onInitialSketchDrawingConsumed,
}: InspectorJobWorkspaceProps) {
  const [showBillingProposalModal, setShowBillingProposalModal] = useState(false);
  const [openReportId, setOpenReportId] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/60 shrink-0">
        <div className="w-full max-w-3xl md:max-w-none mx-auto px-4 sm:px-6 pt-3 pb-2 space-y-3 md:pt-2 md:pb-1.5 md:space-y-2">
          <WgButton
            type="button"
            variant="ghost"
            onClick={onClose}
            className={cn(WG_TOUCH_MIN, "h-11 gap-1.5 px-2 text-sm text-muted-foreground hover:text-foreground")}
          >
            <ArrowLeft size={16} />
            Wróć do {jobReturnLabel}
          </WgButton>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className={cn(WG_TYPE_TITLE, "text-base truncate leading-tight")}>
                {job.address || "Bez adresu"}
                {job.flatNumber && ` m.${job.flatNumber}`}
              </h2>
              {job.client && (
                <p className="text-xs text-muted-foreground truncate">{job.client}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <JobListPrimaryBadge job={job} />
                {deliveryPackageReady !== null && (
                  <DeliveryPackageStatusBadge ready={deliveryPackageReady} />
                )}
              </div>
              <InspectorProgressBar percent={computeInspectionProgress(job).percent} className="pt-1" />
              <JobMetaBadges job={job} />
            </div>
          </div>
          <InspectorHandoverQuickBar
            packageReady={deliveryPackageReady ?? false}
            downloadBusy={packageDownloadBusy}
            onAction={onHandoverQuickAction}
          />
          <InspectorJobSectionNav
            active={jobSection}
            badges={jobSectionBadges}
            onSelect={onJobSectionChange}
          />
          <p className="text-xs text-muted-foreground px-0.5 pb-1">
            {jobSection === "wm" && "Etap odbioru WM, do rozliczenia, notatki i odpowiedzi od admina"}
            {jobSection === "files" && "Zlecenie, kosztorys i wszystkie pliki — pobierz pojedynczo lub ZIP"}
            {jobSection === "docs" && "Checklist dokumentów wymaganych przy odbiorze"}
            {jobSection === "team" && "Kto pracował na robocie — numery telefonów"}
            {jobSection === "reports" && "Dokumentacja ekipy: zakres prac, wymiary, obrys lokalu"}
            {jobSection === "photos" && "Zdjęcia ekipy i własne zdjęcia inspektora"}
          </p>
        </div>
      </div>

      <PullToRefreshIndicator pull={pull.pull} refreshing={pull.refreshing} ready={pull.ready} />
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-4 max-w-3xl md:max-w-none mx-auto w-full md:py-3 md:space-y-3"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        {msg && <p className="text-xs text-primary bg-primary/10 rounded-lg px-3 py-2">{msg}</p>}

        <InspectorDeliveryPackagePanel
          jobId={job.id}
          publications={deliveryPackagePublications}
          downloadBusy={packageDownloadBusy}
          onDownload={onPackageDownload}
        />

        {jobSection === "wm" && (
          <>
            {stageSuggestion?.jobId === job.id && (
              <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 flex-1">
                  Zlecenie wgrane — zmienić etap na <strong>{HANDOVER_STAGE_LABELS[stageSuggestion.stage]}</strong>?
                </p>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = appendJobActivity(
                        applyHandoverStageToJob(job, stageSuggestion.stage),
                        "inspector_stage",
                        `Etap: ${HANDOVER_STAGE_LABELS[stageSuggestion.stage]}`,
                        displayName,
                      );
                      updateJob(updated);
                      onStageSuggestionChange(null);
                      onStatusMessage("Etap zaktualizowany");
                    }}
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium"
                  >
                    Tak, ustaw
                  </button>
                  <button
                    type="button"
                    onClick={() => onStageSuggestionChange(null)}
                    className="px-3 py-2 rounded-lg bg-secondary text-xs text-muted-foreground"
                  >
                    Później
                  </button>
                </div>
              </div>
            )}

            <div className="bg-card border border-border rounded-xl p-5 space-y-4 md:p-4 md:space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <JobWmStageBadge job={job} />
                <JobWmPlannedBadge job={job} />
                <JobListPrimaryBadge job={job} />
              </div>
              <p className="text-xs text-muted-foreground">
                Start {fmtDate(job.startDate)}
                {job.endDate && ` · koniec ${fmtDate(job.endDate)}`}
              </p>
              <JobMetaPickers
                housingType={job.housingType}
                stoveType={job.stoveType}
                gasFurnaceStatus={job.gasFurnaceStatus}
                onHousingChange={(v) => updateJob({ ...job, housingType: v })}
                onStoveChange={(v) => updateJob({ ...job, stoveType: v })}
                onGasFurnaceChange={(v) => updateJob({ ...job, gasFurnaceStatus: v })}
              />
              <InspectorQuickActions items={jobQuickActions} onSelect={onJobSectionChange} />
            </div>

            <div className="space-y-3 md:space-y-2">
              <p className="text-sm font-semibold px-0.5">Odbiór WM — etap, notatki, zdjęcia</p>
              <JobWmPanel
                job={job}
                onUpdate={updateJob}
                actorName={displayName}
                actorRole="inspector"
                directory={directoryContacts}
                viewerRole="inspector"
                onGoToPhotos={() => onJobSectionChange("photos")}
              />
            </div>

            <JobRecoverableChargesPanel
              jobId={job.id}
              charges={recoverableCharges}
              jobNotes={job.jobNotes}
              variant="inspector"
              viewerRole="inspector"
              jobsById={jobsById}
              onCreateBillingProposal={() => setShowBillingProposalModal(true)}
              onAddBillingNote={onAddBillingNote}
              billingNoteActorName={displayName}
              billingNoteActorRole="inspector"
              directory={directoryContacts}
            />

            {showBillingProposalModal && (
              <InspectorBillingProposalModal
                job={job}
                directory={directory}
                authorName={displayName}
                onClose={() => setShowBillingProposalModal(false)}
                onSubmit={onSubmitBillingProposal}
              />
            )}

            {jobInspectorHistory(job).length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <ScrollText size={15} /> Ostatnie zmiany
                </p>
                <div className="space-y-2">
                  {jobInspectorHistory(job).map((ev) => (
                    <div key={ev.id} className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-3 py-0.5">
                      <AuthorAttribution
                        name={ev.actor}
                        directory={directoryContacts}
                        viewerRole="inspector"
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
            <p className="text-sm font-semibold px-0.5">Zlecenie i kosztorys</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {(["zlecenie", "kosztorys"] as const).map((kind) => {
                const label = kind === "zlecenie" ? "Zlecenie (PDF)" : "Kosztorys (NORMA/ATH/PDF)";
                const hint = kind === "zlecenie"
                  ? "Zaznacz „Jest” gdy wystawiłeś zlecenie (np. mailem) — plik PDF opcjonalny. Firma zobaczy status w Robotach."
                  : "Kosztorys NORMA (.ath, .nor, .xml) lub PDF. Zaznacz „Jest” po dostarczeniu — wgrywanie pliku nie jest wymagane.";
                const file = latestJobFile(job, kind);
                const checked = job.documents[kind];
                return (
                  <div
                    key={kind}
                    className={`rounded-xl border p-4 space-y-3 ${checked ? "border-green-500/30 bg-green-500/5" : "border-border bg-card"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold flex items-center">
                        {label}
                        <InspectorHint text={hint} />
                      </p>
                      <button
                        type="button"
                        onClick={() => onToggleDoc(job, kind)}
                        className={`flex items-center gap-1 text-xs font-medium px-3 py-2 min-h-[44px] rounded-full ${checked ? "bg-green-500/15 text-green-400" : "bg-secondary text-muted-foreground"}`}
                        title={checked ? "Oznacz jako brak" : "Oznacz jako jest"}
                      >
                        {checked ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                        {checked ? "Jest" : "Brak"}
                      </button>
                    </div>
                    {file ? (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={file.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 truncate min-w-0"
                          >
                            <FileText size={12} />
                            {file.filename}
                          </a>
                          {(isPdfFilename(file.filename) || isKosztorysPreviewExt(file.filename)) && (
                            <button
                              type="button"
                              onClick={() => onPreview({ kind: "jobFile", file })}
                              className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 font-medium shrink-0"
                            >
                              <Eye size={12} /> Podgląd
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Dodał:{" "}
                          <AuthorAttribution
                            name={file.uploadedBy}
                            directory={directoryContacts}
                            viewerRole="inspector"
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
                      onPick={(f) => onFileUpload(job, kind, f)}
                      onError={onStatusMessage}
                    />
                  </div>
                );
              })}
            </div>
            {(() => {
              const planFile = latestJobFile(job, "plan_techniczny");
              if (!planFile) {
                return (
                  <div className="rounded-xl border border-dashed border-border bg-card/50 p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Plan techniczny (PDF)</p>
                    <p className="text-[11px] text-muted-foreground">
                      Plan techniczny wgrywa administrator w Robotach — tutaj tylko podgląd i pobranie.
                    </p>
                  </div>
                );
              }
              return (
                <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 space-y-2">
                  <p className="text-xs font-semibold">Plan techniczny (PDF)</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={planFile.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={planFile.filename}
                      className="text-xs text-primary hover:underline flex items-center gap-1 truncate min-w-0"
                    >
                      <FileText size={12} />
                      {planFile.filename}
                    </a>
                    {isPdfFilename(planFile.filename) && (
                      <button
                        type="button"
                        onClick={() => onPreview({ kind: "jobFile", file: planFile })}
                        className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 font-medium shrink-0"
                      >
                        <Eye size={12} /> Podgląd
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Dodał:{" "}
                    <AuthorAttribution
                      name={planFile.uploadedBy}
                      directory={directoryContacts}
                      viewerRole="inspector"
                      accentClass="text-muted-foreground font-medium"
                    />
                    {" · "}
                    {new Date(planFile.uploadedAt).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              );
            })()}
            <JobInspectorFilesPanel
              jobId={job.id}
              jobAddress={job.address}
              jobFlat={job.flatNumber}
              jobFiles={job.jobFiles || []}
              inspectorPhotos={job.inspectorPhotos || []}
              athPreviewEnabled={athPreviewEnabled}
              contacts={[]}
              readOnly
              packSource={job}
              title="Wszystkie pliki roboty"
            />
          </div>
        )}

        {jobSection === "docs" && (
          <InspectorDocChecklist job={job} onToggle={(doc) => onToggleDoc(job, doc)} />
        )}

        {jobSection === "team" && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users size={15} /> Pracownicy na robocie
              <InspectorHint text="Kto był przypisany do tego adresu — możesz zadzwonić. Bez wypłat i stawek." />
            </p>
            {uniqueWorkersOnJob(job, directory).length === 0 ? (
              <p className="text-xs text-muted-foreground">Brak wpisów czasu pracy</p>
            ) : (
              <div className="space-y-2">
                {uniqueWorkersOnJob(job, directory).map((w) => (
                  <div key={`${w.name}-${w.phone}`} className="flex items-center justify-between gap-3 bg-secondary/40 rounded-xl px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{w.name}</p>
                      <p className="text-[11px] text-muted-foreground">{w.position}</p>
                    </div>
                    {w.phone && w.phone !== "—" && (
                      <a href={`tel:${w.phone.replace(/\s/g, "")}`} className="flex items-center gap-1 text-xs text-primary shrink-0">
                        <Phone size={12} />
                        {w.phone}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {jobSection === "reports" && (
          <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Ruler size={15} /> Dokumentacja robót
                <InspectorHint text="Dokumentacja ekipy z budowy — zakres prac, metraże, foto obrysu lokalu. Rozwiń strzałką. Ważne przy odbiorze WM i kosztorysie. To nie jest plan techniczny PDF." />
              </p>
            </div>
            {(job.workerReports || []).length === 0 ? (
              <p className="px-4 py-6 text-xs text-muted-foreground text-center">Brak dokumentacji od ekipy</p>
            ) : (
              <div className="divide-y divide-border">
                {[...(job.workerReports || [])]
                  .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
                  .map((report) => {
                    const open = openReportId === report.id;
                    return (
                      <div key={report.id}>
                        <button
                          type="button"
                          onClick={() => setOpenReportId(open ? null : report.id)}
                          className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-secondary/30 text-left"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              <AuthorAttribution
                                name={report.workerName}
                                reportAdminRole={report.authorAdminRole || "worker"}
                                directory={directoryContacts}
                                viewerRole="inspector"
                                accentClass="text-sm font-medium text-foreground"
                              />
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {fmtDate(report.submittedAt.slice(0, 10))}
                              {reportHasWorkScope(report) && ` · ${scopeTextLineCount(getReportWorkScopeText(report))} linii`}
                              {report.rooms.length > 0 && ` · ${report.rooms.length} pom.`}
                            </p>
                          </div>
                          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {open && (
                          <div className="px-4 pb-4 space-y-4 bg-secondary/10">
                            {reportHasWorkScope(report) && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Zakres wykonanych prac</p>
                                <WorkScopeDisplay text={getReportWorkScopeText(report)} className="text-sm" />
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
                                <button
                                  type="button"
                                  onClick={() => onLightbox(report.sketch!.publicUrl, "Rysunek")}
                                  className="block w-full max-w-xs rounded-xl overflow-hidden border border-border"
                                >
                                  <JobPhotoImg src={report.sketch.publicUrl} alt="Rysunek" className="w-full h-auto object-cover" />
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
          <JobTechnicalSketchesPanel
            jobId={job.id}
            jobAddress={job.address || ""}
            viewerRole="inspector"
            viewerUserId={inspectorUserId || displayName}
            viewerName={displayName}
            initialDrawingId={initialSketchDrawingId}
            onInitialDrawingConsumed={onInitialSketchDrawingConsumed}
          />
          </div>
        )}

        {jobSection === "photos" && (
          <InspectorPhotoGallery
            jobAddress={job.address || "robota"}
            crewPhotos={job.photos || []}
            inspectorPhotos={job.inspectorPhotos || []}
            directory={directoryContacts}
            viewerRole="inspector"
            onStatusMessage={onStatusMessage}
            canUpload
            onUploadInspectorPhoto={onInspectorPhotoUpload}
          />
        )}

        {job.notes && jobSection === "wm" && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Notatki</p>
            <p className="text-sm whitespace-pre-wrap">{job.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
