/** WM-DOKUMENTACJA-SZKICE-01 P0 + -02 Publication Workflow — Dokumentacja → Szkice Techniczne. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, FileText, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { WmPrintDrawingEditor } from "@/app/WmPrintDrawingEditor";
import { WgButton, WgCard } from "@/app/ui";
import { registerNativeBackHandler } from "@/lib/native-app-bridge";
import { useModalScrollLock } from "@/lib/modal-scroll-lock";
import { recordWmDrukAudit } from "@/lib/wm-druk-audit";
import {
  canMarkNeedsChanges,
  canPublishJobSketch,
  countPendingJobSketches,
  filterJobSketchesForDokumentacja,
  type JobSketchViewerRole,
} from "@/lib/wm-technical-drawings/job-sketch-list";
import { applyJobSketchPlacement } from "@/lib/wm-technical-drawings/placement";
import { getDrawingById } from "@/lib/wm-technical-drawings/merge";
import { SKETCH_WORKFLOW_STATUS_LABELS } from "@/lib/wm-technical-drawings/labels";
import {
  fetchMergeWmTechnicalDrawingsFromCloud,
  pushWmTechnicalDrawingsToCloud,
  readWmTechnicalDrawingsFromLocalStorage,
} from "@/lib/wm-technical-drawings/sync";
import {
  createJobSketch,
  markJobSketchNeedsChanges,
  softDeleteDrawing,
  upsertSketchInList,
} from "@/lib/wm-technical-drawings/workflow";
import type { SketchActorRole, SketchPlacement, WmTechnicalDrawing } from "@/lib/wm-technical-drawings/types";
import { loadAppSettingsLocal } from "@/lib/app-settings";
import { isWmWorkerSketchEnabled } from "@/lib/wm-technical-drawings/flag";

const REVIEWER_TOOLS = [
  "select",
  "wall",
  "door",
  "window",
  "ventilation",
  "gas_boiler",
  "distribution_board",
  "text",
] as const;

function toSketchRole(role: JobSketchViewerRole): SketchActorRole {
  if (role === "super_admin") return "super_admin";
  if (role === "inspector") return "inspector";
  if (role === "moderator") return "moderator";
  return "admin";
}

function toOrigin(role: JobSketchViewerRole): "inspector" | "admin" {
  return role === "inspector" ? "inspector" : "admin";
}

export function JobTechnicalSketchesPanel({
  jobId,
  jobAddress,
  viewerRole,
  viewerUserId,
  viewerName,
  initialDrawingId = null,
  onInitialDrawingConsumed,
}: {
  jobId: string;
  jobAddress: string;
  viewerRole: JobSketchViewerRole;
  viewerUserId: string;
  viewerName: string;
  initialDrawingId?: string | null;
  onInitialDrawingConsumed?: () => void;
}) {
  const enabled = isWmWorkerSketchEnabled(loadAppSettingsLocal());
  const [drawings, setDrawings] = useState<WmTechnicalDrawing[]>(() =>
    readWmTechnicalDrawingsFromLocalStorage(),
  );
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const merged = await fetchMergeWmTechnicalDrawingsFromCloud();
      setDrawings(merged);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, jobId, refresh]);

  useEffect(() => {
    if (!initialDrawingId) return;
    setSelectedId(initialDrawingId);
    onInitialDrawingConsumed?.();
  }, [initialDrawingId, onInitialDrawingConsumed]);

  const list = useMemo(
    () =>
      filterJobSketchesForDokumentacja(drawings, jobId, {
        viewerRole,
        viewerUserId,
      }),
    [drawings, jobId, viewerRole, viewerUserId],
  );

  const pending = useMemo(
    () =>
      countPendingJobSketches(drawings, jobId, {
        viewerRole,
        viewerUserId,
      }),
    [drawings, jobId, viewerRole, viewerUserId],
  );

  const selected = selectedId ? getDrawingById(drawings, selectedId) ?? null : null;
  const canEdit =
    selected &&
    selected.domain === "job_sketch" &&
    (viewerRole === "inspector" ||
      viewerRole === "admin" ||
      viewerRole === "super_admin");

  useModalScrollLock(Boolean(selected));

  useEffect(() => {
    if (!selectedId) return;
    return registerNativeBackHandler(() => {
      setSelectedId(null);
      return true;
    });
  }, [selectedId]);

  const persist = async (next: WmTechnicalDrawing[]) => {
    setDrawings(next);
    await pushWmTechnicalDrawingsToCloud(next);
  };

  const actorRole = toSketchRole(viewerRole);

  const handleCreate = async () => {
    setBusy(true);
    try {
      const result = createJobSketch({
        jobId,
        address: jobAddress,
        actorUserId: viewerUserId,
        actorName: viewerName,
        actorRole,
        origin: toOrigin(viewerRole),
        templateId: "works_sketch",
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const next = upsertSketchInList(drawings, result.drawing);
      await persist(next);
      setSelectedId(result.drawing.id);
      void recordWmDrukAudit({
        module: "drawings",
        action: "sketch_created",
        actor: viewerName,
        actorUserId: viewerUserId,
        summary: `Szkic techniczny: ${result.drawing.title}`,
        drawingId: result.drawing.id,
        jobId,
      });
      toast.success("Utworzono szkic techniczny");
    } finally {
      setBusy(false);
    }
  };

  const handleEditorChange = (nextDrawing: WmTechnicalDrawing) => {
    if (!canEdit) return;
    setDrawings((prev) => upsertSketchInList(prev, nextDrawing));
  };

  const handleAutosave = async (nextDrawing: WmTechnicalDrawing) => {
    if (!canEdit) return;
    const next = upsertSketchInList(drawings, nextDrawing);
    await persist(next);
  };

  const handleNeedsChanges = async () => {
    if (!selected || !canMarkNeedsChanges(viewerRole)) return;
    setBusy(true);
    try {
      const result = markJobSketchNeedsChanges(selected, {
        expectedRevisionNumber: selected.revisionNumber,
        actorUserId: viewerUserId,
        actorName: viewerName,
        actorRole,
      });
      if (!result.ok) {
        toast.error(result.message);
        if (result.reason === "stale_revision") await refresh();
        return;
      }
      const next = upsertSketchInList(drawings, result.drawing);
      await persist(next);
      setSelectedId(null);
      void recordWmDrukAudit({
        module: "drawings",
        action: "sketch_needs_changes",
        actor: viewerName,
        actorUserId: viewerUserId,
        summary: `Do poprawy: ${result.drawing.title}`,
        drawingId: result.drawing.id,
        jobId,
      });
      toast.success("Odesłano do poprawy");
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async (placement: SketchPlacement, label: string) => {
    if (!selected || !canPublishJobSketch(viewerRole)) return;
    setBusy(true);
    try {
      const result = applyJobSketchPlacement(drawings, selected, {
        expectedRevisionNumber: selected.revisionNumber,
        actorUserId: viewerUserId,
        actorName: viewerName,
        actorRole,
        placement,
      });
      if (!result.ok) {
        toast.error(result.message);
        if (result.reason === "stale_revision") await refresh();
        return;
      }
      await persist(result.drawings);
      setSelectedId(null);
      void recordWmDrukAudit({
        module: "drawings",
        action: "sketch_published",
        actor: viewerName,
        actorUserId: viewerUserId,
        summary: `${label}: ${result.sketch.title}`,
        drawingId: result.sketch.id,
        jobId,
      });
      toast.success(label);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selected || !canPublishJobSketch(viewerRole)) return;
    if (!window.confirm("Usunąć szkic? Zniknie z Dokumentacji i Pulpitu.")) return;
    setBusy(true);
    try {
      const result = softDeleteDrawing(selected, {
        expectedRevisionNumber: selected.revisionNumber,
        userId: viewerUserId,
        role: actorRole,
        name: viewerName,
      });
      if (!result.ok) {
        toast.error(result.message);
        if (result.reason === "stale_revision") await refresh();
        return;
      }
      const next = upsertSketchInList(drawings, result.drawing);
      await persist(next);
      setSelectedId(null);
      void recordWmDrukAudit({
        module: "drawings",
        action: "sketch_soft_deleted",
        actor: viewerName,
        actorUserId: viewerUserId,
        summary: `Usunięto szkic: ${selected.title}`,
        drawingId: selected.id,
        jobId,
      });
      toast.success("Usunięto szkic");
    } finally {
      setBusy(false);
    }
  };

  if (!enabled) return null;

  const decisionOpen =
    selected &&
    (selected.workflowStatus === "submitted" ||
      selected.workflowStatus === "in_review" ||
      selected.workflowStatus === "resolved");
  const showNeeds =
    selected &&
    canMarkNeedsChanges(viewerRole) &&
    (selected.workflowStatus === "submitted" || selected.workflowStatus === "in_review");
  const showPublish =
    selected &&
    canPublishJobSketch(viewerRole) &&
    decisionOpen;
  const showDeleteAdmin =
    selected &&
    canPublishJobSketch(viewerRole) &&
    (selected.workflowStatus === "submitted" ||
      selected.workflowStatus === "in_review" ||
      selected.workflowStatus === "resolved" ||
      selected.workflowStatus === "needs_changes");

  const panel = (
    <WgCard elevation="soft" padding="sm" radius="lg" className="border-violet-500/25 space-y-3 mt-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold flex items-center gap-2 flex-wrap">
            <Pencil size={16} className="text-violet-500 shrink-0" />
            Szkice Techniczne
            {pending > 0 && (
              <span
                data-testid="job-sketch-pending-badge"
                className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full"
              >
                {pending} oczekuje
              </span>
            )}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            Szkice z Dokumentacji robót (≠ Odbiory WM → Rysunki).
          </p>
        </div>
        <WgButton
          type="button"
          size="sm"
          disabled={busy || loading}
          onClick={() => void handleCreate()}
          className="shrink-0 touch-target"
        >
          <Plus size={14} /> Nowy
        </WgButton>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground py-2">Ładowanie szkiców…</p>
      ) : list.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Brak szkiców technicznych przy tej robocie.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                className="w-full flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-left touch-target hover:bg-secondary/50"
                onClick={() => setSelectedId(d.id)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{d.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {SKETCH_WORKFLOW_STATUS_LABELS[d.workflowStatus]}
                    {d.createdByName ? ` · ${d.createdByName}` : ""}
                    {` · rev ${d.revisionNumber}`}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </WgCard>
  );

  if (!selected || typeof document === "undefined") return panel;

  const editorPortal = createPortal(
    <div
      data-testid="job-sketch-review-fs"
      className="fixed inset-0 z-50 modal-overlay flex flex-col bg-background overscroll-none"
      style={{
        height: "var(--app-height, 100dvh)",
        maxHeight: "var(--app-height, 100dvh)",
        paddingTop: "max(0.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(0.5rem, env(safe-area-inset-left))",
        paddingRight: "max(0.5rem, env(safe-area-inset-right))",
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0 flex-wrap">
        <WgButton type="button" variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="touch-target">
          <ArrowLeft size={16} /> Lista
        </WgButton>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{selected.title}</p>
          <p className="text-[10px] text-muted-foreground">
            {SKETCH_WORKFLOW_STATUS_LABELS[selected.workflowStatus]} · rev {selected.revisionNumber}
            {selected.createdByName ? ` · ${selected.createdByName}` : ""}
          </p>
        </div>
        {showNeeds && (
          <WgButton
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void handleNeedsChanges()}
            className="touch-target shrink-0"
            data-testid="job-sketch-needs-changes"
          >
            <RotateCcw size={14} /> Do poprawy
          </WgButton>
        )}
        {showDeleteAdmin && (
          <WgButton
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void handleDelete()}
            className="touch-target shrink-0 text-rose-600"
            data-testid="job-sketch-delete"
          >
            <Trash2 size={14} /> Usuń
          </WgButton>
        )}
      </div>
      {showPublish && (
        <div
          className="flex flex-wrap gap-2 px-3 py-2 border-b border-border shrink-0 bg-muted/30"
          data-testid="job-sketch-publish-actions"
        >
          <WgButton
            type="button"
            size="sm"
            disabled={busy}
            variant="secondary"
            className="touch-target"
            data-testid="job-sketch-publish-docs"
            onClick={() =>
              void handlePublish(
                { documentation: true, reception: false },
                "Zapisano w Dokumentacji",
              )
            }
          >
            <FileText size={14} /> Dokumentacja
          </WgButton>
          <WgButton
            type="button"
            size="sm"
            disabled={busy}
            variant="secondary"
            className="touch-target"
            data-testid="job-sketch-publish-reception"
            onClick={() =>
              void handlePublish(
                { documentation: false, reception: true },
                "Dodano do Odbiorów",
              )
            }
          >
            Odbiory
          </WgButton>
          <WgButton
            type="button"
            size="sm"
            disabled={busy}
            className="touch-target"
            data-testid="job-sketch-publish-both"
            onClick={() =>
              void handlePublish(
                { documentation: true, reception: true },
                "Dokumentacja + Odbiory",
              )
            }
          >
            Dokumentacja + Odbiory
          </WgButton>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-hidden p-2">
        <WmPrintDrawingEditor
          key={selected.id}
          drawing={selected}
          onChange={handleEditorChange}
          onAutosave={(d) => void handleAutosave(d)}
          jobLabel={jobAddress || "Robota"}
          mobileFullscreen
          allowedTools={[...REVIEWER_TOOLS]}
        />
      </div>
    </div>,
    document.body,
  );

  return (
    <>
      {panel}
      {editorPortal}
    </>
  );
}
