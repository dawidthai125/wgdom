/** WM-WORKER-SKETCH-01 / WM-DOKUMENTACJA-SZKICE-01 P0 — Dokumentacja → Szkice Techniczne (Worker). */

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { WmPrintDrawingEditor } from "@/app/WmPrintDrawingEditor";
import { WgButton, WgCard } from "@/app/ui";
import { registerNativeBackHandler } from "@/lib/native-app-bridge";
import { useModalScrollLock } from "@/lib/modal-scroll-lock";
import { recordWmDrukAudit } from "@/lib/wm-druk-audit";
import {
  canWorkerEditJobSketch,
  countPendingJobSketches,
  filterJobSketchesForDokumentacja,
} from "@/lib/wm-technical-drawings/job-sketch-list";
import { getDrawingById } from "@/lib/wm-technical-drawings/merge";
import { SKETCH_WORKFLOW_STATUS_LABELS } from "@/lib/wm-technical-drawings/labels";
import {
  fetchMergeWmTechnicalDrawingsFromCloud,
  pushWmTechnicalDrawingsToCloud,
  readWmTechnicalDrawingsFromLocalStorage,
} from "@/lib/wm-technical-drawings/sync";
import {
  createWorkerSketch,
  resubmitWorkerSketch,
  softDeleteWorkerSketch,
  submitWorkerSketch,
  upsertSketchInList,
} from "@/lib/wm-technical-drawings/workflow";
import type { WmTechnicalDrawing } from "@/lib/wm-technical-drawings/types";

const WORKER_P1_TOOLS = [
  "select",
  "wall",
  "door",
  "window",
  "ventilation",
  "gas_boiler",
  "distribution_board",
  "text",
] as const;

export function WorkerJobSketchesSection({
  jobId,
  jobAddress,
  workerId,
  workerName,
  enabled,
}: {
  jobId: string;
  jobAddress: string;
  workerId: string;
  workerName: string;
  enabled: boolean;
}) {
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

  const mySketches = useMemo(
    () =>
      filterJobSketchesForDokumentacja(drawings, jobId, {
        viewerRole: "worker",
        viewerUserId: workerId,
      }),
    [drawings, jobId, workerId],
  );

  const pending = useMemo(
    () =>
      countPendingJobSketches(drawings, jobId, {
        viewerRole: "worker",
        viewerUserId: workerId,
      }),
    [drawings, jobId, workerId],
  );

  const selected = selectedId ? getDrawingById(drawings, selectedId) ?? null : null;
  const canEditSelected = selected ? canWorkerEditJobSketch(selected, workerId) : false;
  const canSubmit = selected?.workflowStatus === "worker_draft" && canEditSelected;
  const canResubmit = selected?.workflowStatus === "needs_changes" && canEditSelected;

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

  const handleCreate = async () => {
    setBusy(true);
    try {
      const result = createWorkerSketch({
        jobId,
        address: jobAddress,
        workerUserId: workerId,
        workerName,
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
        actor: workerName,
        actorUserId: workerId,
        summary: `Szkic: ${result.drawing.title}`,
        drawingId: result.drawing.id,
        jobId,
      });
      toast.success("Utworzono szkic");
    } finally {
      setBusy(false);
    }
  };

  const handleEditorChange = (nextDrawing: WmTechnicalDrawing) => {
    if (!canEditSelected) return;
    setDrawings((prev) => upsertSketchInList(prev, nextDrawing));
  };

  const handleAutosave = async (nextDrawing: WmTechnicalDrawing) => {
    if (!canEditSelected) return;
    const next = upsertSketchInList(drawings, nextDrawing);
    await persist(next);
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const result = submitWorkerSketch(selected, {
        expectedRevisionNumber: selected.revisionNumber,
        workerUserId: workerId,
        workerName,
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
        action: "sketch_submitted",
        actor: workerName,
        actorUserId: workerId,
        summary: `Przesłano: ${result.drawing.title}`,
        drawingId: result.drawing.id,
        jobId,
      });
      toast.success("Przesłano do weryfikacji");
    } finally {
      setBusy(false);
    }
  };

  const handleResubmit = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const result = resubmitWorkerSketch(selected, {
        expectedRevisionNumber: selected.revisionNumber,
        workerUserId: workerId,
        workerName,
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
        action: "sketch_resubmitted",
        actor: workerName,
        actorUserId: workerId,
        summary: `Ponownie przesłano: ${result.drawing.title}`,
        drawingId: result.drawing.id,
        jobId,
      });
      toast.success("Ponownie przesłano do weryfikacji");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (drawing: WmTechnicalDrawing) => {
    if (!window.confirm(`Usunąć szkic „${drawing.title}”?`)) return;
    setBusy(true);
    try {
      const result = softDeleteWorkerSketch(drawing, {
        expectedRevisionNumber: drawing.revisionNumber,
        workerUserId: workerId,
        workerName,
      });
      if (!result.ok) {
        toast.error(result.message);
        if (result.reason === "stale_revision") await refresh();
        return;
      }
      const next = upsertSketchInList(drawings, result.drawing);
      await persist(next);
      if (selectedId === drawing.id) setSelectedId(null);
      void recordWmDrukAudit({
        module: "drawings",
        action: "sketch_soft_deleted",
        actor: workerName,
        actorUserId: workerId,
        summary: `Usunięto szkic: ${drawing.title}`,
        drawingId: drawing.id,
        jobId,
      });
      toast.success("Usunięto szkic");
    } finally {
      setBusy(false);
    }
  };

  if (!enabled) return null;

  const listUi = (
    <WgCard elevation="soft" padding="sm" radius="lg" className="border-violet-500/25 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold flex items-center gap-2 flex-wrap">
            <Pencil size={16} className="text-violet-500 shrink-0" />
            Szkice Techniczne
            {pending > 0 && (
              <span
                data-testid="worker-sketch-pending-badge"
                className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full"
              >
                {pending} oczekuje
              </span>
            )}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            Edytowalny szkic techniczny (ściana, drzwi, okno, symbole). To nie jest foto Obrys.
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
      ) : mySketches.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Brak szkiców przy tej robocie.</p>
      ) : (
        <ul className="space-y-2">
          {mySketches.map((d) => {
            const editable = canWorkerEditJobSketch(d, workerId) && d.workflowStatus === "worker_draft";
            return (
              <li key={d.id}>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left touch-target"
                    onClick={() => setSelectedId(d.id)}
                  >
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {SKETCH_WORKFLOW_STATUS_LABELS[d.workflowStatus]} · rev {d.revisionNumber}
                    </p>
                  </button>
                  {editable && (
                    <WgButton
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={busy}
                      title="Usuń"
                      onClick={() => void handleDelete(d)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 size={16} />
                    </WgButton>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </WgCard>
  );

  if (!selected || typeof document === "undefined") return listUi;

  const editorPortal = createPortal(
    <div
      data-testid="worker-sketch-fs"
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
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <WgButton type="button" variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="touch-target">
          <ArrowLeft size={16} /> Lista
        </WgButton>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{selected.title}</p>
          <p className="text-[10px] text-muted-foreground">
            {SKETCH_WORKFLOW_STATUS_LABELS[selected.workflowStatus]} · rev {selected.revisionNumber}
          </p>
        </div>
        {canSubmit && (
          <WgButton type="button" size="sm" disabled={busy} onClick={() => void handleSubmit()} className="touch-target shrink-0">
            <Send size={14} /> Prześlij
          </WgButton>
        )}
        {canResubmit && (
          <WgButton type="button" size="sm" disabled={busy} onClick={() => void handleResubmit()} className="touch-target shrink-0">
            <Send size={14} /> Prześlij ponownie
          </WgButton>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden p-2">
        <WmPrintDrawingEditor
          key={selected.id}
          drawing={selected}
          onChange={handleEditorChange}
          onAutosave={(d) => void handleAutosave(d)}
          jobLabel={jobAddress || "Robota"}
          mobileFullscreen
          allowedTools={[...WORKER_P1_TOOLS]}
        />
      </div>
      {!canEditSelected && (
        <p className="text-[11px] text-muted-foreground text-center px-3 pb-2 shrink-0">
          Podgląd — szkic w weryfikacji (edycja po „Do poprawy”).
        </p>
      )}
    </div>,
    document.body,
  );

  return (
    <>
      {listUi}
      {editorPortal}
    </>
  );
}
