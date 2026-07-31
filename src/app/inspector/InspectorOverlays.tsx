import { lazy, Suspense, useEffect, type Dispatch, type SetStateAction } from "react";
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
import { useModalScrollLock } from "@/lib/modal-scroll-lock";
import { cn } from "@/app/components/ui/utils";
import { WgButton } from "@/app/ui";
import { WG_TOUCH_MIN, WG_TYPE_BODY } from "@/lib/wg-ui-tokens";
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
  useModalScrollLock(lightbox != null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, onCloseLightbox]);

  return (
    <>
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] modal-overlay modal-sheet bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={onCloseLightbox}
          role="dialog"
          aria-modal="true"
        >
          <WgButton
            type="button"
            variant="ghost"
            size="icon"
            className={cn(WG_TOUCH_MIN, "absolute right-4 p-2 text-white hover:bg-white/10 h-11 w-11")}
            style={{ top: "max(1rem, env(safe-area-inset-top))" }}
            onClick={(e) => {
              e.stopPropagation();
              onCloseLightbox();
            }}
            aria-label="Zamknij"
          >
            <X size={24}/>
          </WgButton>
          <p className={cn(WG_TYPE_BODY, "text-white mb-3")}>{lightbox.label}</p>
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
