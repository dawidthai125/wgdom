import { lazy, Suspense, type Dispatch, type SetStateAction } from "react";
import { X } from "lucide-react";
import { JobPhotoImg } from "@/app/JobPhotoImg";
import { InspectorQuickPhotoFab } from "@/app/InspectorQuickPhotoFab";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import type { InspectorJob, UseInspectorDataSyncResult } from "@/app/inspector/useInspectorDataSync";
import type { AdminSession } from "@/lib/admin-auth";
import type { InspectorDashboardJob } from "@/lib/inspector-dashboard";
import type { InspectorPhotoLabel } from "@/lib/job-wm";
import type { OperationalNote } from "@/lib/operational-notes";
import type { OperationalNoteAuditEntry } from "@/lib/operational-notes-audit";
import type { OperationalNoteReadReceipt } from "@/lib/operational-notes-read-state";
import { Toaster } from "sonner";

const OperationalNotesView = lazy(() =>
  import("@/app/OperationalNotesView").then((m) => ({ default: m.OperationalNotesView })),
);

export type InspectorOverlaysProps = {
  selectedJob: InspectorJob | null;
  loading: boolean;
  syncing: boolean;

  lightbox: { url: string; label: string } | null;
  onCloseLightbox: () => void;

  previewItem: InspectorFileItem | null;
  athPreviewEnabled: boolean;
  onClosePreview: () => void;

  jobs: InspectorDashboardJob[];
  onQuickPhotoUpload: (jobId: string, file: File, label: InspectorPhotoLabel) => Promise<boolean>;

  operationalNotesOpen: boolean;
  onCloseOperationalNotes: () => void;
  session: AdminSession;
  operationalNotes: OperationalNote[];
  operationalNotesReadState: OperationalNoteReadReceipt[];
  operationalNotesAuditLog: OperationalNoteAuditEntry[];
  onChangeNotes: Dispatch<SetStateAction<OperationalNote[]>>;
  onChangeReadState: Dispatch<SetStateAction<OperationalNoteReadReceipt[]>>;
  onChangeAuditLog: Dispatch<SetStateAction<OperationalNoteAuditEntry[]>>;
  onCommitOperationalNotes: UseInspectorDataSyncResult["commitOperationalNotes"];
};

export function InspectorOverlays({
  selectedJob,
  loading,
  syncing,
  lightbox,
  onCloseLightbox,
  previewItem,
  athPreviewEnabled,
  onClosePreview,
  jobs,
  onQuickPhotoUpload,
  operationalNotesOpen,
  onCloseOperationalNotes,
  session,
  operationalNotes,
  operationalNotesReadState,
  operationalNotesAuditLog,
  onChangeNotes,
  onChangeReadState,
  onChangeAuditLog,
  onCommitOperationalNotes,
}: InspectorOverlaysProps) {
  return (
    <>
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4" onClick={onCloseLightbox}>
          <button type="button" className="absolute top-4 right-4 p-2 text-white" style={{ top: "max(1rem, env(safe-area-inset-top))" }} onClick={onCloseLightbox}>
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
          onClose={onClosePreview}
        />
      )}

      {!selectedJob && (
        <InspectorQuickPhotoFab
          jobs={jobs}
          onUpload={onQuickPhotoUpload}
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
              jobs={jobs}
              session={session}
              auditLog={operationalNotesAuditLog}
              readState={operationalNotesReadState}
              onChangeReadState={onChangeReadState}
              onChangeNotes={onChangeNotes}
              onChangeAuditLog={onChangeAuditLog}
              onCommit={onCommitOperationalNotes}
              returnNav={{
                label: "inspektora",
                onBack: onCloseOperationalNotes,
              }}
            />
          </Suspense>
        </div>
      )}
    </>
  );
}
