/** WM-RYSUNKI-01 P1+P2 — edytor: toolset · PDF export (Preview/Download/Print). */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Redo2,
  Type,
  Undo2,
  Minus,
  MousePointer2,
  Grid3x3,
  Magnet,
  DoorOpen,
  Square,
  Wind,
  Flame,
  Ruler,
  MoveRight,
  Copy,
  FlipHorizontal2,
  RotateCw,
  FileDown,
  Eye,
  Printer,
} from "lucide-react";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { DrawingUndoStack } from "@/lib/wm-technical-drawings/undo";
import { renderDrawingSvg } from "@/lib/wm-technical-drawings/render-svg";
import { snapCoord } from "@/lib/wm-technical-drawings/normalize";
import {
  duplicateSelectedObjects,
  rotateObjectBy,
  toggleDoorFlipH,
  touchDrawing,
} from "@/lib/wm-technical-drawings/report";
import {
  DrawingPdfError,
  drawingPdfFileName,
  generateDrawingPdf,
} from "@/lib/wm-technical-drawings/export-pdf";
import {
  DRAWING_OBJECTS_SOFT_WARN,
  ROOM_LABEL_DEFAULT_CONTENT,
  ROOM_LABEL_DEFAULT_FONT_SIZE,
  TEXT_DEFAULT_FONT_SIZE,
  type DrawingObject,
  type DrawingWallObject,
  type WmTechnicalDrawing,
} from "@/lib/wm-technical-drawings/types";
import type { OnRecordWmDrukAuditFn } from "@/lib/wm-druk-audit";

type Tool =
  | "select"
  | "wall"
  | "door"
  | "window"
  | "text"
  | "room_label"
  | "dimension"
  | "arrow"
  | "ventilation"
  | "gas_boiler";

const AUTOSAVE_DEBOUNCE_MS = 1000;

function clientToSvgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const loc = pt.matrixTransform(ctm.inverse());
  return { x: loc.x, y: loc.y };
}

function isPointObj(
  o: DrawingObject,
): o is Extract<DrawingObject, { x: number; y: number }> {
  return (
    o.type === "text" ||
    o.type === "door" ||
    o.type === "window" ||
    o.type === "ventilation" ||
    o.type === "gas_boiler"
  );
}

function isLineObj(
  o: DrawingObject,
): o is Extract<DrawingObject, { x1: number; y1: number; x2: number; y2: number }> {
  return o.type === "wall" || o.type === "dimension" || o.type === "arrow";
}

export function WmPrintDrawingEditor({
  drawing,
  onChange,
  onAutosave,
  jobLabel,
  onRecordWmDrukAudit,
}: {
  drawing: WmTechnicalDrawing;
  onChange: (next: WmTechnicalDrawing) => void;
  onAutosave: (next: WmTechnicalDrawing) => void;
  /** D-P2-16 — resolved poza edytorem (nie z global state w lib). */
  jobLabel: string;
  onRecordWmDrukAudit?: OnRecordWmDrukAuditFn;
}) {
  const stackRef = useRef<DrawingUndoStack | null>(null);
  if (!stackRef.current || stackRef.current.getCurrent().id !== drawing.id) {
    stackRef.current = new DrawingUndoStack(drawing);
  }

  const [local, setLocal] = useState<WmTechnicalDrawing>(() => stackRef.current!.getCurrent());
  const localRef = useRef(local);
  localRef.current = local;
  const [tool, setTool] = useState<Tool>("wall");
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [undoTick, setUndoTick] = useState(0);
  const [pdfBusy, setPdfBusy] = useState(false);
  const svgHostRef = useRef<HTMLDivElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragDirtyRef = useRef(false);
  const dragRef = useRef<{
    id: string;
    mode: "move-point" | "move-line";
    ox: number;
    oy: number;
    orig: DrawingObject;
    snapshot: WmTechnicalDrawing;
  } | null>(null);
  /** D-P2-18 — sesja Preview→Download→Print; wygasa po zmianie rysunku. */
  const pdfSessionRef = useRef<{
    fingerprint: string;
    bytes: Uint8Array;
    fileName: string;
  } | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (drawing.id !== local.id) {
      stackRef.current = new DrawingUndoStack(drawing);
      setLocal(stackRef.current.getCurrent());
      setLineStart(null);
      setSelectedId(null);
      return;
    }
    if (drawing.updatedAt > local.updatedAt) {
      stackRef.current?.replace(drawing);
      setLocal(stackRef.current!.getCurrent());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawing.id, drawing.updatedAt]);

  const scheduleAutosave = useCallback(
    (next: WmTechnicalDrawing) => {
      onChange(next);
      setSaveState("saving");
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        onAutosave(next);
        setSaveState("saved");
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [onChange, onAutosave],
  );

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const commit = useCallback(
    (next: WmTechnicalDrawing) => {
      const pushed = stackRef.current!.push(next);
      setLocal(pushed);
      setUndoTick((t) => t + 1);
      scheduleAutosave(pushed);
    },
    [scheduleAutosave],
  );

  const applyWithoutUndo = useCallback(
    (next: WmTechnicalDrawing) => {
      stackRef.current!.replace(next);
      setLocal(next);
      scheduleAutosave(next);
    },
    [scheduleAutosave],
  );

  const svgMarkup = useMemo(() => renderDrawingSvg(local, { showGrid: true }), [local]);

  const pdfFingerprint = useMemo(
    () =>
      [
        local.id,
        local.updatedAt,
        local.documentDate,
        local.title,
        local.page.width,
        local.page.height,
        local.page.format,
        local.page.orientation,
        local.objects.length,
        JSON.stringify(local.objects),
        jobLabel.trim(),
      ].join("|"),
    [local, jobLabel],
  );

  useEffect(() => {
    if (pdfSessionRef.current && pdfSessionRef.current.fingerprint !== pdfFingerprint) {
      pdfSessionRef.current = null;
    }
  }, [pdfFingerprint]);

  const ensurePdfSession = useCallback(async () => {
    const label = jobLabel.trim() || "Bez roboty";
    if (pdfSessionRef.current?.fingerprint === pdfFingerprint) {
      return pdfSessionRef.current;
    }
    const bytes = await generateDrawingPdf(localRef.current, { jobLabel: label });
    const fileName = drawingPdfFileName(localRef.current, label);
    const session = { fingerprint: pdfFingerprint, bytes, fileName };
    pdfSessionRef.current = session;
    return session;
  }, [jobLabel, pdfFingerprint]);

  const runPdfAction = useCallback(
    async (mode: "preview" | "download" | "print") => {
      if (pdfBusy) return;
      setPdfBusy(true);
      try {
        const session = await ensurePdfSession();
        const blob = new Blob([session.bytes], { type: "application/pdf" });
        if (mode === "preview") {
          if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
          const url = URL.createObjectURL(blob);
          previewUrlRef.current = url;
          window.open(url, "_blank", "noopener,noreferrer");
          toast.success("Podgląd PDF otwarty");
          return;
        }
        if (mode === "download") {
          saveAs(blob, session.fileName);
          onRecordWmDrukAudit?.({
            module: "drawings",
            action: "drawing_pdf_exported",
            summary: `Eksport PDF: ${session.fileName}`,
            detail: jobLabel.trim() || "Bez roboty",
            drawingId: localRef.current.id,
            jobId: localRef.current.jobId,
          });
          toast.success(`Pobrano ${session.fileName}`);
          return;
        }
        /* print — D-P2-18 reuse bytes */
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            toast.error("Nie udało się otworzyć okna drukowania");
          }
          setTimeout(() => {
            URL.revokeObjectURL(url);
            iframe.remove();
          }, 60_000);
        };
      } catch (e) {
        const msg =
          e instanceof DrawingPdfError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Błąd eksportu PDF";
        toast.error(msg);
      } finally {
        setPdfBusy(false);
      }
    },
    [ensurePdfSession, jobLabel, onRecordWmDrukAudit, pdfBusy],
  );

  const canUndo = stackRef.current?.canUndo() ?? false;
  const canRedo = stackRef.current?.canRedo() ?? false;
  void undoTick;

  const handleUndo = () => {
    if (!stackRef.current?.canUndo()) return;
    const next = stackRef.current.undo();
    setLocal(next);
    setUndoTick((t) => t + 1);
    scheduleAutosave(next);
  };

  const handleRedo = () => {
    if (!stackRef.current?.canRedo()) return;
    const next = stackRef.current.redo();
    setLocal(next);
    setUndoTick((t) => t + 1);
    scheduleAutosave(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const snap = (x: number, y: number) => ({
    x: snapCoord(x, local.grid.step, local.grid.snap),
    y: snapCoord(y, local.grid.step, local.grid.snap),
  });

  const findSvg = (): SVGSVGElement | null => svgHostRef.current?.querySelector("svg") ?? null;

  const addStamp = (
    type: "door" | "window" | "ventilation" | "gas_boiler",
    p: { x: number; y: number },
  ) => {
    let obj: DrawingObject;
    if (type === "door") {
      obj = {
        id: crypto.randomUUID(),
        type: "door",
        x: p.x,
        y: p.y,
        symbolId: "door-swing",
        flipH: false,
        rotation: 0,
      };
    } else if (type === "window") {
      obj = {
        id: crypto.randomUUID(),
        type: "window",
        x: p.x,
        y: p.y,
        symbolId: "window-rect",
        rotation: 0,
      };
    } else if (type === "ventilation") {
      obj = {
        id: crypto.randomUUID(),
        type: "ventilation",
        x: p.x,
        y: p.y,
        symbolId: "vent-grid",
        rotation: 0,
      };
    } else {
      obj = {
        id: crypto.randomUUID(),
        type: "gas_boiler",
        x: p.x,
        y: p.y,
        symbolId: "gas-boiler",
        rotation: 0,
      };
    }
    commit(touchDrawing(local, { objects: [...local.objects, obj] }));
    setSelectedId(obj.id);
  };

  const finishLine = (
    type: "wall" | "dimension" | "arrow",
    start: { x: number; y: number },
    end: { x: number; y: number },
  ) => {
    let obj: DrawingObject;
    if (type === "wall") {
      const wall: DrawingWallObject = {
        id: crypto.randomUUID(),
        type: "wall",
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        thickness: 4,
        symbolId: "wall-default",
      };
      obj = wall;
    } else if (type === "dimension") {
      obj = {
        id: crypto.randomUUID(),
        type: "dimension",
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        symbolId: "dimension-line",
      };
    } else {
      obj = {
        id: crypto.randomUUID(),
        type: "arrow",
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        symbolId: "arrow-straight",
      };
    }
    commit(touchDrawing(local, { objects: [...local.objects, obj] }));
    setSelectedId(obj.id);
    setLineStart(null);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const svg = findSvg();
    if (!svg) return;
    const raw = clientToSvgPoint(svg, e.clientX, e.clientY);
    const p = snap(raw.x, raw.y);

    if (tool === "wall" || tool === "dimension" || tool === "arrow") {
      if (!lineStart) {
        setLineStart(p);
        return;
      }
      finishLine(tool, lineStart, p);
      return;
    }

    if (tool === "door" || tool === "window" || tool === "ventilation" || tool === "gas_boiler") {
      addStamp(tool, p);
      return;
    }

    if (tool === "text" || tool === "room_label") {
      const isRoom = tool === "room_label";
      const defaultText = isRoom ? ROOM_LABEL_DEFAULT_CONTENT : "Tekst";
      const content = window.prompt(isRoom ? "Opis pomieszczenia:" : "Tekst na rysunku:", defaultText);
      if (content == null) return;
      const textObj: DrawingObject = {
        id: crypto.randomUUID(),
        type: "text",
        x: p.x,
        y: p.y,
        content: content.trim() || defaultText,
        fontSize: isRoom ? ROOM_LABEL_DEFAULT_FONT_SIZE : TEXT_DEFAULT_FONT_SIZE,
        symbolId: "text-label",
      };
      commit(touchDrawing(local, { objects: [...local.objects, textObj] }));
      setSelectedId(textObj.id);
      return;
    }

    const target = (e.target as Element).closest?.("[data-id]");
    const id = target?.getAttribute("data-id") ?? null;
    setSelectedId(id);
    if (!id) return;
    const obj = local.objects.find((o) => o.id === id);
    if (!obj || obj.locked) return;
    if (isPointObj(obj)) {
      dragRef.current = {
        id,
        mode: "move-point",
        ox: p.x,
        oy: p.y,
        orig: { ...obj },
        snapshot: local,
      };
    } else if (isLineObj(obj)) {
      dragRef.current = {
        id,
        mode: "move-line",
        ox: p.x,
        oy: p.y,
        orig: { ...obj },
        snapshot: local,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const svg = findSvg();
    if (!svg) return;
    const raw = clientToSvgPoint(svg, e.clientX, e.clientY);
    const p = snap(raw.x, raw.y);
    const dx = p.x - drag.ox;
    const dy = p.y - drag.oy;
    const orig = drag.orig;
    let nextObj: DrawingObject;
    if (drag.mode === "move-point" && isPointObj(orig)) {
      nextObj = { ...orig, x: orig.x + dx, y: orig.y + dy };
    } else if (drag.mode === "move-line" && isLineObj(orig)) {
      nextObj = {
        ...orig,
        x1: orig.x1 + dx,
        y1: orig.y1 + dy,
        x2: orig.x2 + dx,
        y2: orig.y2 + dy,
      };
    } else {
      return;
    }
    const base = localRef.current;
    const objects = base.objects.map((o) => (o.id === drag.id ? nextObj : o));
    dragDirtyRef.current = true;
    applyWithoutUndo(touchDrawing(base, { objects }));
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (!dragDirtyRef.current) return;
    dragDirtyRef.current = false;
    const final = localRef.current;
    stackRef.current!.replace(drag.snapshot);
    commit(final);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    commit(touchDrawing(local, { objects: local.objects.filter((o) => o.id !== selectedId) }));
    setSelectedId(null);
  };

  const dupSelected = () => {
    if (!selectedId) return;
    const { drawing: next, newIds } = duplicateSelectedObjects(local, [selectedId]);
    commit(next);
    if (newIds[0]) setSelectedId(newIds[0]);
  };

  const applyRotate = (delta: 90 | 180 | 270) => {
    if (!selectedId) return;
    const obj = local.objects.find((o) => o.id === selectedId);
    if (!obj || obj.locked) return;
    const nextObj = rotateObjectBy(obj, delta);
    commit(
      touchDrawing(local, {
        objects: local.objects.map((o) => (o.id === selectedId ? nextObj : o)),
      }),
    );
  };

  const applyFlip = () => {
    if (!selectedId) return;
    const obj = local.objects.find((o) => o.id === selectedId);
    if (!obj || obj.type !== "door") return;
    const nextObj = toggleDoorFlipH(obj);
    commit(
      touchDrawing(local, {
        objects: local.objects.map((o) => (o.id === selectedId ? nextObj : o)),
      }),
    );
  };

  const toggleGrid = () => {
    commit(touchDrawing(local, { grid: { ...local.grid, enabled: !local.grid.enabled } }));
  };

  const toggleSnap = () => {
    commit(touchDrawing(local, { grid: { ...local.grid, snap: !local.grid.snap } }));
  };

  const updateTitle = (title: string) => {
    commit(touchDrawing(local, { title: title.slice(0, 120) }));
  };

  const selected = selectedId ? local.objects.find((o) => o.id === selectedId) : null;
  const softWarn = local.objects.length > DRAWING_OBJECTS_SOFT_WARN;

  const toolBtn = (t: Tool, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      title={label}
      onClick={() => {
        setTool(t);
        setLineStart(null);
      }}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium ${
        tool === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  const lineHint =
    tool === "wall" || tool === "dimension" || tool === "arrow"
      ? lineStart
        ? "Kliknij drugi punkt."
        : "Kliknij pierwszy punkt."
      : null;

  return (
    <div className="flex flex-col gap-3 min-h-0 h-full">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="flex-1 min-w-[12rem] rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          value={local.title}
          onChange={(e) => updateTitle(e.target.value)}
          aria-label="Tytuł rysunku"
        />
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {saveState === "saving" ? "Zapisywanie…" : saveState === "saved" ? "Zapisano" : ""}
        </span>
      </div>

      {softWarn && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          Dużo obiektów ({local.objects.length}). Edycja może spowolnić — rozważ uproszczenie szkicu.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1 border border-border rounded-lg p-1 bg-card">
        {toolBtn("select", "Wybierz", <MousePointer2 size={14} />)}
        {toolBtn("wall", "Ściana", <Minus size={14} />)}
        {toolBtn("door", "Drzwi", <DoorOpen size={14} />)}
        {toolBtn("window", "Okno", <Square size={14} />)}
        {toolBtn("text", "Tekst", <Type size={14} />)}
        {toolBtn("room_label", "Opis pomieszczenia", <Type size={14} />)}
        {toolBtn("dimension", "Wymiar", <Ruler size={14} />)}
        {toolBtn("arrow", "Strzałka", <MoveRight size={14} />)}
        {toolBtn("ventilation", "Wentylacja", <Wind size={14} />)}
        {toolBtn("gas_boiler", "Piec gazowy", <Flame size={14} />)}
        <span className="w-px h-5 bg-border mx-1" />
        <button
          type="button"
          title="Cofnij"
          disabled={!canUndo}
          onClick={handleUndo}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary disabled:opacity-40"
        >
          <Undo2 size={14} />
        </button>
        <button
          type="button"
          title="Ponów"
          disabled={!canRedo}
          onClick={handleRedo}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary disabled:opacity-40"
        >
          <Redo2 size={14} />
        </button>
        <span className="w-px h-5 bg-border mx-1" />
        <button
          type="button"
          title="Siatka"
          onClick={toggleGrid}
          className={`p-1.5 rounded-md ${local.grid.enabled ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
        >
          <Grid3x3 size={14} />
        </button>
        <button
          type="button"
          title="Snap"
          onClick={toggleSnap}
          className={`p-1.5 rounded-md ${local.grid.snap ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
        >
          <Magnet size={14} />
        </button>
        <span className="w-px h-5 bg-border mx-1" />
        <button
          type="button"
          title="Podgląd PDF"
          disabled={pdfBusy}
          onClick={() => void runPdfAction("preview")}
          className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-secondary disabled:opacity-40"
        >
          <Eye size={14} />
          <span className="hidden sm:inline">{pdfBusy ? "PDF…" : "Podgląd PDF"}</span>
        </button>
        <button
          type="button"
          title="Pobierz PDF"
          disabled={pdfBusy}
          onClick={() => void runPdfAction("download")}
          className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-secondary disabled:opacity-40"
        >
          <FileDown size={14} />
          <span className="hidden sm:inline">Pobierz PDF</span>
        </button>
        <button
          type="button"
          title="Drukuj"
          disabled={pdfBusy}
          onClick={() => void runPdfAction("print")}
          className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-secondary disabled:opacity-40"
        >
          <Printer size={14} />
          <span className="hidden sm:inline">Drukuj</span>
        </button>
      </div>

      {selectedId && (
        <div className="flex flex-wrap items-center gap-1 border border-border rounded-lg p-1 bg-card">
          <span className="text-[11px] text-muted-foreground px-1">Obrót</span>
          {([90, 180, 270] as const).map((deg) => (
            <button
              key={deg}
              type="button"
              title={`Obróć ${deg}°`}
              onClick={() => applyRotate(deg)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-secondary"
            >
              <RotateCw size={12} />
              {deg}°
            </button>
          ))}
          {selected?.type === "door" && (
            <button
              type="button"
              title="Odbij drzwi (flipH)"
              onClick={applyFlip}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-secondary"
            >
              <FlipHorizontal2 size={12} /> Odbij
            </button>
          )}
          <button
            type="button"
            title="Duplikuj zaznaczenie"
            onClick={dupSelected}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-secondary"
          >
            <Copy size={12} /> Duplikuj
          </button>
          <button
            type="button"
            onClick={deleteSelected}
            className="ml-auto text-xs text-destructive hover:underline px-2"
          >
            Usuń
          </button>
        </div>
      )}

      {lineHint && <p className="text-[11px] text-muted-foreground">{lineHint}</p>}

      <div
        ref={svgHostRef}
        className="flex-1 min-h-[280px] overflow-auto rounded-xl border border-border bg-slate-100 dark:bg-slate-900/40 p-2"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          className="inline-block shadow-sm"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        Format {local.page.format} {local.page.orientation} · obiektów {local.objects.length} · PDF
        P2
      </p>
    </div>
  );
}
