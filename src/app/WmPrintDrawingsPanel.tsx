/** WM-RYSUNKI-01 P1 — lista + CRUD + szablony + edytor + draft→final. */

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Plus, Search, Trash2, CheckCircle2 } from "lucide-react";
import { registerNativeBackHandler } from "@/lib/native-app-bridge";
import { toast } from "sonner";
import type { Job } from "@/app/app-domain";
import { jobDisplayTitle } from "@/app/app-domain";
import { WmPrintDrawingEditor } from "@/app/WmPrintDrawingEditor";
import { getDrawingById } from "@/lib/wm-technical-drawings/merge";
import {
  duplicateDrawing,
  removeDrawing,
  setDrawingFinal,
  upsertDrawing,
} from "@/lib/wm-technical-drawings/report";
import {
  buildDrawingFromTemplate,
  drawingTemplateLabel,
} from "@/lib/wm-technical-drawings/templates";
import { DRAWING_STATUS_LABELS } from "@/lib/wm-technical-drawings/labels";
import type {
  DrawingStatus,
  DrawingTemplateId,
  WmTechnicalDrawing,
} from "@/lib/wm-technical-drawings/types";
import { DRAWING_OBJECTS_SOFT_WARN, DRAWING_TEMPLATE_IDS } from "@/lib/wm-technical-drawings/types";
import type { OnRecordWmDrukAuditFn } from "@/lib/wm-druk-audit";

type StatusFilter = "all" | DrawingStatus;

function matchesSearch(d: WmTechnicalDrawing, q: string): boolean {
  if (!q) return true;
  const hay = [d.title, d.address ?? "", d.notes ?? "", d.templateId].join(" ").toLowerCase();
  return hay.includes(q);
}

function statusBadgeClass(status: DrawingStatus): string {
  return status === "final"
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
    : "bg-amber-500/15 text-amber-700 dark:text-amber-400";
}

export function WmPrintDrawingsPanel({
  jobs,
  drawings,
  onChangeDrawings,
  onCommitDrawings,
  onRecordWmDrukAudit,
  initialJobId,
}: {
  jobs: Job[];
  drawings: WmTechnicalDrawing[];
  onChangeDrawings: (next: WmTechnicalDrawing[]) => void;
  onCommitDrawings: (next?: WmTechnicalDrawing[]) => void;
  onRecordWmDrukAudit?: OnRecordWmDrukAuditFn;
  initialJobId?: string | null;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [createJobId, setCreateJobId] = useState<string>(initialJobId ?? "");

  useEffect(() => {
    if (initialJobId) setCreateJobId(initialJobId);
  }, [initialJobId]);

  const sorted = useMemo(
    () => [...drawings].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [drawings],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      return matchesSearch(d, q);
    });
  }, [sorted, search, statusFilter]);

  const selected = selectedId ? getDrawingById(drawings, selectedId) ?? null : null;
  const mobileDetailOpen = Boolean(selectedId);

  useEffect(() => {
    if (!mobileDetailOpen) return;
    return registerNativeBackHandler(() => {
      setSelectedId(null);
      return true;
    });
  }, [mobileDetailOpen]);

  const persist = (next: WmTechnicalDrawing[]) => {
    onChangeDrawings(next);
    onCommitDrawings(next);
  };

  const createFromTemplate = (templateId: DrawingTemplateId) => {
    const job = createJobId ? jobs.find((j) => j.id === createJobId) : undefined;
    if (!job) {
      toast.error("Wybierz robotę przed utworzeniem rysunku.");
      return;
    }
    const diagram = buildDrawingFromTemplate(templateId, {
      jobId: job.id,
      address: jobDisplayTitle(job),
    });
    const { drawings: next } = upsertDrawing(drawings, diagram);
    persist(next);
    setSelectedId(diagram.id);
    setShowCreateMenu(false);
    onRecordWmDrukAudit?.({
      module: "drawings",
      action: "drawing_created",
      summary: `Utworzono: ${drawingTemplateLabel(templateId)}`,
      drawingId: diagram.id,
      jobId: diagram.jobId,
    });
    toast.success(`Utworzono: ${drawingTemplateLabel(templateId)}`);
  };

  const handleDuplicate = () => {
    if (!selected) return;
    const copy = duplicateDrawing(selected);
    const { drawings: next } = upsertDrawing(drawings, copy);
    persist(next);
    setSelectedId(copy.id);
    onRecordWmDrukAudit?.({
      module: "drawings",
      action: "drawing_duplicated",
      summary: `Duplikacja: ${copy.title}`,
      drawingId: copy.id,
      detail: selected.id,
      jobId: copy.jobId,
    });
    toast.success("Zduplikowano rysunek");
  };

  const handleDelete = () => {
    if (!selected) return;
    if (!window.confirm(`Usunąć rysunek „${selected.title}”?`)) return;
    const deletedId = selected.id;
    const deletedJobId = selected.jobId;
    const { drawings: next } = removeDrawing(drawings, deletedId);
    persist(next);
    setSelectedId(null);
    onRecordWmDrukAudit?.({
      module: "drawings",
      action: "drawing_deleted",
      summary: `Usunięto: ${selected.title}`,
      drawingId: deletedId,
      jobId: deletedJobId,
    });
    toast.success("Usunięto rysunek");
  };

  const handleMarkFinal = () => {
    if (!selected) return;
    const result = setDrawingFinal(selected);
    if (!result.ok || !result.drawing) {
      toast.error(
        result.missing.includes("jobId_or_address")
          ? "Final wymaga powiązanej roboty lub adresu."
          : `Brakuje: ${result.missing.join(", ")}`,
      );
      return;
    }
    const { drawings: next } = upsertDrawing(drawings, result.drawing);
    persist(next);
    toast.success("Oznaczono jako finalny");
  };

  const handleEditorChange = (diagram: WmTechnicalDrawing) => {
    const { drawings: next } = upsertDrawing(drawings, diagram);
    onChangeDrawings(next);
  };

  const handleEditorAutosave = (diagram: WmTechnicalDrawing) => {
    const { drawings: next } = upsertDrawing(drawings, diagram);
    onChangeDrawings(next);
    onCommitDrawings(next);
  };

  if (selected) {
    return (
      <div className="flex flex-col gap-3 min-h-[70vh]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} /> Lista
          </button>
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusBadgeClass(selected.status)}`}>
            {DRAWING_STATUS_LABELS[selected.status]}
          </span>
          <div className="ml-auto flex gap-1">
            {selected.status === "draft" && (
              <button
                type="button"
                onClick={handleMarkFinal}
                className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs border border-border hover:bg-secondary"
              >
                <CheckCircle2 size={14} /> Final
              </button>
            )}
            <button
              type="button"
              onClick={handleDuplicate}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs border border-border hover:bg-secondary"
            >
              <Copy size={14} /> Duplikuj
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs border border-border text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={14} /> Usuń
            </button>
          </div>
        </div>
        {selected.objects.length > DRAWING_OBJECTS_SOFT_WARN && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            Uwaga: {selected.objects.length} obiektów (próg {DRAWING_OBJECTS_SOFT_WARN}).
          </p>
        )}
        <WmPrintDrawingEditor
          key={selected.id}
          drawing={selected}
          onChange={handleEditorChange}
          onAutosave={handleEditorAutosave}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[12rem]">
          <label className="text-[11px] text-muted-foreground">Szukaj</label>
          <div className="relative mt-0.5">
            <Search size={14} className="absolute left-2 top-2.5 text-muted-foreground" />
            <input
              className="w-full rounded-md border border-border bg-background pl-7 pr-2 py-1.5 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tytuł, adres…"
            />
          </div>
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground">Status</label>
          <select
            className="mt-0.5 block rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">Wszystkie</option>
            <option value="draft">Robocze</option>
            <option value="final">Finalne</option>
          </select>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCreateMenu((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground"
          >
            <Plus size={16} /> Nowy rysunek
          </button>
          {showCreateMenu && (
            <div className="absolute right-0 z-20 mt-1 w-72 rounded-xl border border-border bg-card shadow-lg p-3 space-y-2">
              <label className="text-[11px] text-muted-foreground">Robota (wymagana)</label>
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={createJobId}
                onChange={(e) => setCreateJobId(e.target.value)}
              >
                <option value="">— wybierz —</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {jobDisplayTitle(j)}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">Szablon</p>
              <div className="max-h-56 overflow-y-auto space-y-1">
                {DRAWING_TEMPLATE_IDS.map((tid) => (
                  <button
                    key={tid}
                    type="button"
                    onClick={() => createFromTemplate(tid)}
                    className="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-secondary"
                  >
                    {drawingTemplateLabel(tid)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Rysunki techniczne (Odbiory) — szybkie szkice powiązane z robotą. Flaga{" "}
        <code className="text-[10px]">kw-wm-rysunki-01</code>. PDF/ZIP w późniejszych slice.
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Brak rysunków.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
          {filtered.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => setSelectedId(d.id)}
                className="w-full text-left px-4 py-3 hover:bg-secondary/60 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{d.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {d.address || "—"} · {drawingTemplateLabel(d.templateId)} · {d.objects.length} obj.
                  </div>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${statusBadgeClass(d.status)}`}>
                  {DRAWING_STATUS_LABELS[d.status]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
