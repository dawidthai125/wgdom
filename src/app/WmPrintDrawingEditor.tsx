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
  RectangleHorizontal,
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
  Box,
  ZoomIn,
  ZoomOut,
  LocateFixed,
  Eraser,
  ImagePlus,
  Paperclip,
} from "lucide-react";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { DrawingUndoStack } from "@/lib/wm-technical-drawings/undo";
import {
  DRAWING_DIMENSION_FONT_SIZE,
  DRAWING_DIMENSION_FONT_SIZES,
  renderDrawingSvg,
} from "@/lib/wm-technical-drawings/render-svg";
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
  findNearestWall,
  projectPointOnSegment,
  WALL_DOOR_MAX_DIST_PX,
} from "@/lib/wm-technical-drawings/wall-gap";
import {
  isWallPreviewTooShort,
  wallPreviewMetrics,
} from "@/lib/wm-technical-drawings/wall-preview";
import {
  applyRectangleSquareConstraint,
  buildRectangleWalls,
  isRectangleAreaTooSmall,
} from "@/lib/wm-technical-drawings/rectangle-walls";
import {
  buildDimensionOwnerLabel,
  type DimensionUnit,
} from "@/lib/wm-technical-drawings/dimension-label-format";
import {
  constrainDimensionEndpointDrag,
  type DimensionEndpointWhich,
} from "@/lib/wm-technical-drawings/dimension-range";
import { rasterizeDrawingSvgToPng } from "@/lib/wm-technical-drawings/svg-raster";
import {
  collectWallEndpoints,
  snapDrawEnd,
  snapDrawStart,
} from "@/lib/wm-technical-drawings/snap-draw";
import {
  clampDrawingPan,
  clampDrawingZoom,
  DRAWING_ZOOM_DEFAULT,
  nextZoomIn,
  nextZoomOut,
} from "@/lib/wm-technical-drawings/drawing-viewport";
import {
  DRAWING_OBJECTS_SOFT_WARN,
  DRAWING_WALL_THICKNESS_EXTERNAL,
  DRAWING_WALL_THICKNESS_PARTITION,
  TEXT_DEFAULT_FONT_SIZE,
  type DrawingObject,
  type DrawingWallObject,
  type WmTechnicalDrawing,
} from "@/lib/wm-technical-drawings/types";
import { uploadJobAttachment } from "@/lib/job-attachment-upload";
import type { JobAttachment } from "@/lib/job-attachments";
import { uploadPhoto, type PhotoEntry } from "@/app/app-domain";
import type { OnRecordWmDrukAuditFn } from "@/lib/wm-druk-audit";

export type DrawingJobPatch = {
  /** Append one attachment (PDF copy). */
  appendAttachment?: JobAttachment;
  /** Append one photo (PNG copy). */
  appendPhoto?: PhotoEntry;
};
/** Toolbar — jeden tool drzwi (canonical door-swing). */
type Tool =
  | "select"
  | "wall"
  | "rectangle"
  | "door"
  | "window"
  | "text"
  | "eraser"
  | "dimension"
  | "arrow"
  | "ventilation"
  | "gas_boiler"
  | "distribution_board";

type WallDraftKind = "external" | "partition";

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
    o.type === "gas_boiler" ||
    o.type === "distribution_board"
  );
}

function isDoorTool(t: Tool): boolean {
  return t === "door";
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
  /** WM-RYSUNKI-MOBILE-01 P0 — layout FS: overflow-hidden + app pan (nie page scroll). */
  mobileFullscreen = false,
  /** WM-WORKER-SKETCH-01 — allowlist narzędzi (P1: ściana/drzwi/okno/…). */
  allowedTools,
  /** DIMENSION-RANGE-JOB-EXPORT — thin jobs mutate (attachments / photos only). */
  onPatchJob,
  uploadedBy = "Administrator",
}: {
  drawing: WmTechnicalDrawing;
  onChange: (next: WmTechnicalDrawing) => void;
  onAutosave: (next: WmTechnicalDrawing) => void;
  /** D-P2-16 — resolved poza edytorem (nie z global state w lib). */
  jobLabel: string;
  onRecordWmDrukAudit?: OnRecordWmDrukAuditFn;
  /** Mobile Chrome (layout only) — NIE zmienia gestu Drawing Engine. */
  mobileFullscreen?: boolean;
  allowedTools?: Tool[];
  onPatchJob?: (jobId: string, patch: DrawingJobPatch) => void;
  uploadedBy?: string;
}) {
  const stackRef = useRef<DrawingUndoStack | null>(null);
  if (!stackRef.current || stackRef.current.getCurrent().id !== drawing.id) {
    stackRef.current = new DrawingUndoStack(drawing);
  }

  const [local, setLocal] = useState<WmTechnicalDrawing>(() => stackRef.current!.getCurrent());
  const localRef = useRef(local);
  localRef.current = local;
  const [tool, setTool] = useState<Tool>("wall");
  /** Session only — wall/rectangle create thickness (nie JSON wallType). Default działowa. */
  const [wallDraftKind, setWallDraftKind] = useState<WallDraftKind>("partition");
  /** Session only — D-UNIT-02 · default cm. */
  const [dimensionUnit, setDimensionUnit] = useState<DimensionUnit>("cm");
  /** Session only — D-LF-05/06 · independent of textFontSize. */
  const [dimensionFontSize, setDimensionFontSize] = useState(DRAWING_DIMENSION_FONT_SIZE);
  /** Session only — D-TEXT-05/06 · applies to NEW text only. */
  const [textFontSize, setTextFontSize] = useState(TEXT_DEFAULT_FONT_SIZE);
  const [textBold, setTextBold] = useState(false);
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
  /** P3B — koniec Ghost (snapped); UI only. */
  const [previewEnd, setPreviewEnd] = useState<{ x: number; y: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverWallId, setHoverWallId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [undoTick, setUndoTick] = useState(0);
  const [pdfBusy, setPdfBusy] = useState(false);
  /** D-M0-16 — ephemeral zoom/pan (nie JSON). */
  const [viewScale, setViewScale] = useState(DRAWING_ZOOM_DEFAULT);
  const [viewPan, setViewPan] = useState({ x: 0, y: 0 });
  /** D-M1-06 — zamiast window.prompt. */
  const [inputDialog, setInputDialog] = useState<
    | { kind: "text"; x: number; y: number; value: string }
    | { kind: "dimension"; wallId: string; x1: number; y1: number; x2: number; y2: number; value: string }
    | null
  >(null);
  const viewScaleRef = useRef(viewScale);
  const viewPanRef = useRef(viewPan);
  viewPanRef.current = viewPan;
  viewScaleRef.current = viewScale;
  const svgHostRef = useRef<HTMLDivElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragDirtyRef = useRef(false);
  const previewRafRef = useRef<number | null>(null);
  const pendingPreviewEndRef = useRef<{ x: number; y: number } | null>(null);
  const captureActiveRef = useRef(false);
  const panRef = useRef<{
    ox: number;
    oy: number;
    origX: number;
    origY: number;
  } | null>(null);
  const dragRef = useRef<{
    id: string;
    mode: "move-point" | "move-line" | "dim-handle";
    which?: DimensionEndpointWhich;
    ox: number;
    oy: number;
    orig: DrawingObject;
    snapshot: WmTechnicalDrawing;
  } | null>(null);
  const [jobExportBusy, setJobExportBusy] = useState(false);
  /** P1 — wall/arrow/rectangle: press → drag → release (jeden SM · ZERO two-click). */
  const lineDrawRef = useRef<{
    type: "wall" | "arrow" | "rectangle";
    start: { x: number; y: number };
  } | null>(null);
  /** Desktop Shift square — tylko tool rectangle. */
  const rectShiftRef = useRef(false);
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
      setPreviewEnd(null);
      setSelectedId(null);
      setViewScale(DRAWING_ZOOM_DEFAULT);
      setViewPan({ x: 0, y: 0 });
      return;
    }
    if (drawing.updatedAt > local.updatedAt) {
      stackRef.current?.replace(drawing);
      setLocal(stackRef.current!.getCurrent());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawing.id, drawing.updatedAt]);

  const clearWallPreview = useCallback(() => {
    setLineStart(null);
    setPreviewEnd(null);
    pendingPreviewEndRef.current = null;
    lineDrawRef.current = null;
    rectShiftRef.current = false;
    if (previewRafRef.current != null) {
      cancelAnimationFrame(previewRafRef.current);
      previewRafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (previewRafRef.current != null) cancelAnimationFrame(previewRafRef.current);
    };
  }, []);

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

  const svgMarkup = useMemo(() => {
    const previewWall =
      tool === "wall" && lineStart && previewEnd
        ? {
            x1: lineStart.x,
            y1: lineStart.y,
            x2: previewEnd.x,
            y2: previewEnd.y,
            lengthLabel: wallPreviewMetrics(
              lineStart.x,
              lineStart.y,
              previewEnd.x,
              previewEnd.y,
              local.grid.step,
            ).lengthLabel,
          }
        : null;
    let previewRectangle: { x1: number; y1: number; x2: number; y2: number } | null = null;
    if (tool === "rectangle" && lineStart && previewEnd) {
      let x1 = lineStart.x;
      let y1 = lineStart.y;
      let x2 = previewEnd.x;
      let y2 = previewEnd.y;
      if (rectShiftRef.current && !mobileFullscreen) {
        const sq = applyRectangleSquareConstraint(x1, y1, x2, y2);
        x2 = sq.x2;
        y2 = sq.y2;
      }
      previewRectangle = { x1, y1, x2, y2 };
    }
    return renderDrawingSvg(local, {
      mode: "edit",
      showGrid: true,
      highlightWallId: isDoorTool(tool) ? hoverWallId : null,
      previewWall,
      previewRectangle,
      selectedObjectId: selectedId,
    });
  }, [local, tool, hoverWallId, lineStart, previewEnd, mobileFullscreen, selectedId]);

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

  const savePdfToJobFiles = useCallback(async () => {
    if (jobExportBusy) return;
    const jobId = String(localRef.current.jobId || "").trim();
    if (!jobId) {
      toast.error("Brak przypisanej roboty — nie można zapisać.");
      return;
    }
    if (!onPatchJob) {
      toast.error("Brak połączenia z zapisem roboty.");
      return;
    }
    setJobExportBusy(true);
    try {
      const session = await ensurePdfSession();
      const file = new File([session.bytes], session.fileName, { type: "application/pdf" });
      const { attachment, error } = await uploadJobAttachment(jobId, file, uploadedBy);
      if (!attachment || error) {
        toast.error(error || "Nie udało się zapisać PDF do plików roboty.");
        return;
      }
      onPatchJob(jobId, { appendAttachment: attachment });
      toast.success("Zapisano PDF do plików roboty.");
      onRecordWmDrukAudit?.({
        module: "drawings",
        action: "drawing_pdf_exported",
        summary: `PDF → pliki roboty: ${localRef.current.title}`,
        detail: session.fileName,
        drawingId: localRef.current.id,
        jobId,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd zapisu PDF");
    } finally {
      setJobExportBusy(false);
    }
  }, [ensurePdfSession, jobExportBusy, onPatchJob, onRecordWmDrukAudit, uploadedBy]);

  const savePngToJobPhotos = useCallback(async () => {
    if (jobExportBusy) return;
    const jobId = String(localRef.current.jobId || "").trim();
    if (!jobId) {
      toast.error("Brak przypisanej roboty — nie można zapisać.");
      return;
    }
    if (!onPatchJob) {
      toast.error("Brak połączenia z zapisem roboty.");
      return;
    }
    setJobExportBusy(true);
    try {
      const d = localRef.current;
      const svg = renderDrawingSvg(d, { mode: "export", showGrid: false });
      if (svg.includes("data-dim-handle") || svg.includes("data-ghost") || svg.includes('data-hit="1"')) {
        toast.error("Internal: UI overlays w PNG");
        return;
      }
      const pngBytes = await rasterizeDrawingSvgToPng(svg, d.page.width, d.page.height);
      const safeTitle = (d.title || "rysunek").replace(/[^\w.\-ąćęłńóśźżĄĆĘŁŃÓŚŹŻ ]+/gi, "_").slice(0, 40);
      const fileName = `RYSUNEK_${safeTitle}.png`;
      const file = new File([new Blob([pngBytes])], fileName, { type: "image/png" });
      const caption = `Rysunek: ${d.title || "bez tytułu"}`;
      const { entry, error } = await uploadPhoto(jobId, file, "progress", uploadedBy, caption);
      if (!entry || error) {
        toast.error(error || "Nie udało się zapisać PNG do zdjęć roboty.");
        return;
      }
      onPatchJob(jobId, { appendPhoto: entry });
      toast.success("Zapisano PNG do zdjęć roboty.");
      onRecordWmDrukAudit?.({
        module: "drawings",
        action: "drawing_pdf_exported",
        summary: `PNG → zdjęcia roboty: ${d.title}`,
        detail: fileName,
        drawingId: d.id,
        jobId,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd zapisu PNG");
    } finally {
      setJobExportBusy(false);
    }
  }, [jobExportBusy, onPatchJob, onRecordWmDrukAudit, uploadedBy]);

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
      /* Esc anuluje Ghost wall/arrow mid-draw (P1 drag-release). */
      if (
        e.key === "Escape" &&
        lineStart &&
        (tool === "wall" || tool === "arrow" || tool === "rectangle")
      ) {
        e.preventDefault();
        clearWallPreview();
        return;
      }
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

  const snapOpts = () => ({
    snapEnabled: local.grid.snap,
    step: local.grid.step,
    endpoints: collectWallEndpoints(local.objects),
  });

  /** Place (stamps/select): Endpoint→Grid gdy Snap ON (bez kąta). */
  const snapPlace = (x: number, y: number) => snapDrawStart({ x, y }, snapOpts());

  const findSvg = (): SVGSVGElement | null => svgHostRef.current?.querySelector("svg") ?? null;

  const wallDraftThickness =
    wallDraftKind === "external" ? DRAWING_WALL_THICKNESS_EXTERNAL : DRAWING_WALL_THICKNESS_PARTITION;

  /** Canonical door-swing — bez width, bez P/W. */
  const addDoor = (p: { x: number; y: number }) => {
    const obj: DrawingObject = {
      id: crypto.randomUUID(),
      type: "door",
      x: p.x,
      y: p.y,
      symbolId: "door-swing",
      flipH: false,
      rotation: 0,
    };
    commit(touchDrawing(local, { objects: [...local.objects, obj] }));
    setSelectedId(obj.id);
    setHoverWallId(null);
  };

  const addStamp = (
    type: "window" | "ventilation" | "gas_boiler" | "distribution_board",
    p: { x: number; y: number },
  ) => {
    let obj: DrawingObject;
    if (type === "window") {
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
    } else if (type === "gas_boiler") {
      obj = {
        id: crypto.randomUUID(),
        type: "gas_boiler",
        x: p.x,
        y: p.y,
        symbolId: "gas-boiler",
        rotation: 0,
      };
    } else {
      obj = {
        id: crypto.randomUUID(),
        type: "distribution_board",
        x: p.x,
        y: p.y,
        symbolId: "distribution-board",
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
    /* D-P3B-12 — reject zero-length wall; P1: clear Ghost po reject. */
    if (type === "wall") {
      const { lengthPx } = wallPreviewMetrics(start.x, start.y, end.x, end.y);
      if (isWallPreviewTooShort(lengthPx)) {
        toast.error("Ściana zbyt krótka — przeciągnij dalej i puść.");
        clearWallPreview();
        return;
      }
    }
    let obj: DrawingObject;
    if (type === "wall") {
      const wall: DrawingWallObject = {
        id: crypto.randomUUID(),
        type: "wall",
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        thickness: wallDraftThickness,
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
        fontSize: dimensionFontSize,
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
    /* D-P3B1-01 / MR-P3B1-01 — po SUCCESS idle preview (wall: STOP chain; arrow/dimension jak P3B). */
    clearWallPreview();
  };

  const finishRectangle = (start: { x: number; y: number }, end: { x: number; y: number }, square: boolean) => {
    let x1 = start.x;
    let y1 = start.y;
    let x2 = end.x;
    let y2 = end.y;
    if (square && !mobileFullscreen) {
      const sq = applyRectangleSquareConstraint(x1, y1, x2, y2);
      x2 = sq.x2;
      y2 = sq.y2;
    }
    if (isRectangleAreaTooSmall(x1, y1, x2, y2)) {
      toast.error("Prostokąt zbyt mały — przeciągnij dalej i puść.");
      clearWallPreview();
      rectShiftRef.current = false;
      return;
    }
    const walls = buildRectangleWalls(x1, y1, x2, y2, wallDraftThickness);
    commit(touchDrawing(local, { objects: [...local.objects, ...walls] }));
    setSelectedId(walls[0]?.id ?? null);
    clearWallPreview();
    rectShiftRef.current = false;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const svg = findSvg();
    if (!svg) return;
    const raw = clientToSvgPoint(svg, e.clientX, e.clientY);

    const beginCapture = () => {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
        captureActiveRef.current = true;
      } catch {
        captureActiveRef.current = false;
      }
    };

    /* P1 — wall/arrow: press → drag → release (ZERO two-click). */
    if (tool === "wall" || tool === "arrow") {
      const start = snapDrawStart(raw, snapOpts());
      setLineStart(start);
      setPreviewEnd(null);
      lineDrawRef.current = { type: tool, start };
      beginCapture();
      return;
    }

    /* Prostokąt — corner A → ghost → 4 walls. */
    if (tool === "rectangle") {
      const start = snapDrawStart(raw, snapOpts());
      setLineStart(start);
      setPreviewEnd(null);
      rectShiftRef.current = !mobileFullscreen && e.shiftKey;
      lineDrawRef.current = { type: "rectangle", start };
      beginCapture();
      return;
    }

    /* CREATE door: raw → wall projection (24 px) → MISS → snapPlace. Grid never after HIT. */
    if (tool === "door") {
      const walls = local.objects.filter((o): o is DrawingWallObject => o.type === "wall");
      const hit = findNearestWall(walls, raw.x, raw.y, WALL_DOOR_MAX_DIST_PX);
      if (hit) {
        const proj = projectPointOnSegment(
          raw.x,
          raw.y,
          hit.wall.x1,
          hit.wall.y1,
          hit.wall.x2,
          hit.wall.y2,
        );
        addDoor({ x: proj.qx, y: proj.qy });
        return;
      }
      addDoor(snapPlace(raw.x, raw.y));
      return;
    }

    const p = snapPlace(raw.x, raw.y);

    /* D-P3A-19 / MR-P3A-07 — primary: klik ściany → popup Długość; secondary: 2-click. */
    if (tool === "dimension") {
      const walls = local.objects.filter((o): o is DrawingWallObject => o.type === "wall");
      const hit = findNearestWall(walls, raw.x, raw.y, 28);
      if (hit) {
        setLineStart(null);
        const w = hit.wall;
        setInputDialog({
          kind: "dimension",
          wallId: w.id,
          x1: w.x1,
          y1: w.y1,
          x2: w.x2,
          y2: w.y2,
          value: "",
        });
        return;
      }
      if (!lineStart) {
        setLineStart(p);
        return;
      }
      finishLine("dimension", lineStart, p);
      return;
    }

    if (
      tool === "window" ||
      tool === "ventilation" ||
      tool === "gas_boiler" ||
      tool === "distribution_board"
    ) {
      addStamp(tool, p);
      return;
    }

    if (tool === "text") {
      setInputDialog({ kind: "text", x: p.x, y: p.y, value: "Tekst" });
      return;
    }

    /* WM-RYSUNKI-TEXT-ERASER-UX-01 — one click ≤ one object · skip locked · stay eraser. */
    if (tool === "eraser") {
      const target = (e.target as Element).closest?.("[data-id]");
      const id = target?.getAttribute("data-id") ?? null;
      if (!id) return;
      const obj = local.objects.find((o) => o.id === id);
      if (!obj) return;
      if (obj.locked === true) return;
      commit(touchDrawing(local, { objects: local.objects.filter((o) => o.id !== id) }));
      if (selectedId === id) setSelectedId(null);
      return;
    }

    /* Dimension endpoint handle — before body select/move-line. */
    const handleEl = (e.target as Element).closest?.("[data-dim-handle]");
    if (handleEl) {
      const id = handleEl.getAttribute("data-id");
      const which = handleEl.getAttribute("data-dim-handle") as DimensionEndpointWhich | null;
      if (id && (which === "start" || which === "end")) {
        const obj = local.objects.find((o) => o.id === id);
        if (obj && obj.type === "dimension" && !obj.locked) {
          setSelectedId(id);
          dragRef.current = {
            id,
            mode: "dim-handle",
            which,
            ox: raw.x,
            oy: raw.y,
            orig: { ...obj },
            snapshot: local,
          };
          beginCapture();
          return;
        }
      }
    }

    const target = (e.target as Element).closest?.("[data-id]");
    const id = target?.getAttribute("data-id") ?? null;
    setSelectedId(id);

    if (!id) {
      /* D-M0-08 — pan na pustym tle (select). */
      if (tool === "select") {
        panRef.current = {
          ox: e.clientX,
          oy: e.clientY,
          origX: viewPanRef.current.x,
          origY: viewPanRef.current.y,
        };
        beginCapture();
      }
      return;
    }

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
      beginCapture();
    } else if (isLineObj(obj)) {
      dragRef.current = {
        id,
        mode: "move-line",
        ox: p.x,
        oy: p.y,
        orig: { ...obj },
        snapshot: local,
      };
      beginCapture();
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (pan) {
      const host = svgHostRef.current;
      const w = host?.clientWidth ?? 320;
      const h = host?.clientHeight ?? 280;
      const scale = viewScaleRef.current;
      const nx = clampDrawingPan(pan.origX + (e.clientX - pan.ox), w, scale);
      const ny = clampDrawingPan(pan.origY + (e.clientY - pan.oy), h, scale);
      setViewPan({ x: nx, y: ny });
      return;
    }

    const svg = findSvg();
    if (!svg) return;
    const raw = clientToSvgPoint(svg, e.clientX, e.clientY);

    /* P1 — Ghost preview podczas drag wall/arrow/rectangle. */
    const lineDraw = lineDrawRef.current;
    if (lineDraw && !dragRef.current) {
      if (lineDraw.type === "rectangle") {
        rectShiftRef.current = !mobileFullscreen && e.shiftKey;
        /* Corner B: Endpoint→Grid (bez angle snap — axis-aligned rect). */
        const end = snapDrawStart(raw, snapOpts());
        pendingPreviewEndRef.current = end;
      } else {
        const p = snapDrawEnd(raw, lineDraw.start, snapOpts());
        pendingPreviewEndRef.current = p;
      }
      if (previewRafRef.current == null) {
        previewRafRef.current = requestAnimationFrame(() => {
          previewRafRef.current = null;
          const next = pendingPreviewEndRef.current;
          if (next) setPreviewEnd(next);
        });
      }
      return;
    }

    /* D-P3A-22 — hover ściany przy wstawianiu drzwi (tylko wizualnie). */
    if (isDoorTool(tool) && !dragRef.current) {
      const walls = localRef.current.objects.filter(
        (o): o is DrawingWallObject => o.type === "wall",
      );
      const hit = findNearestWall(walls, raw.x, raw.y, 28);
      const nextId = hit?.wall.id ?? null;
      setHoverWallId((prev) => (prev === nextId ? prev : nextId));
    }

    const drag = dragRef.current;
    if (!drag) return;
    const p = snapPlace(raw.x, raw.y);
    const dx = p.x - drag.ox;
    const dy = p.y - drag.oy;
    const orig = drag.orig;
    let nextObj: DrawingObject;
    if (drag.mode === "dim-handle" && orig.type === "dimension" && drag.which) {
      const walls = localRef.current.objects.filter(
        (o): o is DrawingWallObject => o.type === "wall",
      );
      const nextCoords = constrainDimensionEndpointDrag({
        dim: { x1: orig.x1, y1: orig.y1, x2: orig.x2, y2: orig.y2 },
        which: drag.which,
        pointer: raw,
        walls,
      });
      if (!nextCoords) return;
      nextObj = { ...orig, ...nextCoords };
    } else if (drag.mode === "move-point" && isPointObj(orig)) {
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

  const completeLineDraw = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = lineDrawRef.current;
    if (!g) return;
    lineDrawRef.current = null;
    const svg = findSvg();
    if (!svg) {
      clearWallPreview();
      rectShiftRef.current = false;
      return;
    }
    const raw = clientToSvgPoint(svg, e.clientX, e.clientY);
    if (g.type === "rectangle") {
      const end =
        pendingPreviewEndRef.current ??
        previewEnd ??
        snapDrawStart(raw, snapOpts());
      const square = !mobileFullscreen && (e.shiftKey || rectShiftRef.current);
      finishRectangle(g.start, end, square);
      return;
    }
    const end =
      pendingPreviewEndRef.current ??
      previewEnd ??
      snapDrawEnd(raw, g.start, snapOpts());
    finishLine(g.type, g.start, end);
  };

  const endPointerGesture = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (panRef.current) {
      panRef.current = null;
    }
    const drag = dragRef.current;
    if (drag) {
      dragRef.current = null;
      if (dragDirtyRef.current) {
        dragDirtyRef.current = false;
        const final = localRef.current;
        stackRef.current!.replace(drag.snapshot);
        commit(final);
      } else {
        dragDirtyRef.current = false;
      }
    }
    if (e && captureActiveRef.current) {
      try {
        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        /* ignore */
      }
    }
    captureActiveRef.current = false;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lineDrawRef.current) {
      completeLineDraw(e);
    }
    endPointerGesture(e);
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lineDrawRef.current) {
      clearWallPreview();
    }
    endPointerGesture(e);
  };

  const onPointerLeave = () => {
    /* D-M0-07 — leave NIE kończy drag gdy capture; tylko hover cleanup. */
    setHoverWallId(null);
  };

  const resetView = () => {
    setViewScale(DRAWING_ZOOM_DEFAULT);
    setViewPan({ x: 0, y: 0 });
  };

  const zoomIn = () => setViewScale((z) => nextZoomIn(z));
  const zoomOut = () => setViewScale((z) => nextZoomOut(z));


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
  const selectedDimension = selected?.type === "dimension" ? selected : null;
  const showDimensionFontUi = tool === "dimension" || selectedDimension != null;
  const dimensionFontControlValue =
    selectedDimension != null
      ? Number.isFinite(selectedDimension.fontSize) && (selectedDimension.fontSize as number) > 0
        ? (selectedDimension.fontSize as number)
        : DRAWING_DIMENSION_FONT_SIZE
      : dimensionFontSize;

  const applyDimensionFontSize = (size: number) => {
    if (!(DRAWING_DIMENSION_FONT_SIZES as readonly number[]).includes(size)) return;
    setDimensionFontSize(size);
    if (!selectedDimension) return;
    const id = selectedDimension.id;
    commit(
      touchDrawing(local, {
        objects: local.objects.map((o) =>
          o.id === id && o.type === "dimension" ? { ...o, fontSize: size } : o,
        ),
      }),
    );
  };

  const softWarn = local.objects.length > DRAWING_OBJECTS_SOFT_WARN;

  const lineHint =
    tool === "wall"
      ? lineStart
        ? "Przeciągnij i puść · Esc anuluje podgląd."
        : "Przytrzymaj i przeciągnij, aby narysować ścianę."
      : tool === "rectangle"
        ? lineStart
          ? mobileFullscreen
            ? "Przeciągnij i puść · Esc anuluje."
            : "Przeciągnij i puść · Shift = kwadrat · Esc anuluje."
          : mobileFullscreen
            ? "Przytrzymaj i przeciągnij prostokąt (4 ściany)."
            : "Przytrzymaj i przeciągnij prostokąt · Shift = kwadrat."
        : tool === "arrow"
          ? lineStart
            ? "Przeciągnij i puść · Esc anuluje."
            : "Przytrzymaj i przeciągnij strzałkę."
          : tool === "dimension"
            ? lineStart
              ? "Kliknij drugi punkt (wymiar swobodny)."
              : "Kliknij ścianę (popup Długość) albo pierwszy punkt."
            : isDoorTool(tool)
              ? "Kliknij, aby wstawić drzwi (podświetlenie ściany = tylko podgląd)."
              : tool === "eraser"
                ? "Kliknij obiekt, aby usunąć (zablokowane pomijane)."
                : tool === "text"
                  ? "Kliknij, aby wstawić tekst."
                  : null;

  /** Mobile Chrome: duże cele; Desktop: kompakt jak dotychczas. */
  const chromeIcon = mobileFullscreen
    ? "touch-target min-h-11 min-w-11 shrink-0 p-0 rounded-md text-muted-foreground hover:bg-secondary disabled:opacity-40 inline-flex items-center justify-center"
    : "touch-target shrink-0 p-0 rounded-md text-muted-foreground hover:bg-secondary disabled:opacity-40";
  const chromeAction = mobileFullscreen
    ? "touch-target min-h-11 shrink-0 gap-1 px-3 rounded-md text-xs font-medium text-muted-foreground hover:bg-secondary disabled:opacity-40 inline-flex items-center justify-center"
    : "touch-target shrink-0 gap-1 px-2 rounded-md text-xs text-muted-foreground hover:bg-secondary disabled:opacity-40";

  const toolAllowed = (t: Tool) => !allowedTools || allowedTools.includes(t);

  const toolBtn = (t: Tool, label: string, icon: React.ReactNode) => {
    if (!toolAllowed(t)) return null;
    return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => {
        setTool(t);
        clearWallPreview();
        if (!isDoorTool(t)) setHoverWallId(null);
      }}
      className={`${mobileFullscreen ? "touch-target min-h-11 min-w-[4.5rem] flex-col gap-0.5 px-2 py-1" : "touch-target shrink-0 gap-1 px-2"} rounded-md text-xs font-medium inline-flex items-center justify-center ${
        tool === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"
      }`}
    >
      {icon}
      <span className={mobileFullscreen ? "text-[10px] leading-tight" : "hidden sm:inline"}>{label}</span>
    </button>
    );
  };

  const confirmInputDialog = () => {
    if (!inputDialog) return;
    if (inputDialog.kind === "text") {
      const content = inputDialog.value.trim() || "Tekst";
      const size = Number.isFinite(textFontSize) && textFontSize > 0 ? textFontSize : TEXT_DEFAULT_FONT_SIZE;
      const textObj: DrawingObject = {
        id: crypto.randomUUID(),
        type: "text",
        x: inputDialog.x,
        y: inputDialog.y,
        content,
        fontSize: size,
        ...(textBold ? { fontWeight: "bold" as const } : {}),
        symbolId: "text-label",
      };
      commit(touchDrawing(local, { objects: [...local.objects, textObj] }));
      setSelectedId(textObj.id);
      setInputDialog(null);
      /* D-TEXT-08 — tool remains "text" (do not setTool). */
      return;
    }
    const labelRaw = inputDialog.value.trim();
    if (!labelRaw) {
      toast.error("Podaj długość (np. 420)");
      return;
    }
    /* Numeric → format z session unit; non-numeric → keep as typed (T-U3). */
    let label = labelRaw;
    const built = buildDimensionOwnerLabel(labelRaw, dimensionUnit);
    if (built.ok) {
      label = built.label;
    } else if (built.reason === "out_of_range") {
      toast.error(
        dimensionUnit === "cm"
          ? "Długość cm: zakres 1…99999"
          : "Długość m: zakres 0,01…999",
      );
      return;
    } else if (built.reason === "nonnumeric") {
      /* keep free-text label as-is */
      label = labelRaw;
    } else {
      toast.error("Podaj długość (np. 420)");
      return;
    }
    const obj: DrawingObject = {
      id: crypto.randomUUID(),
      type: "dimension",
      x1: inputDialog.x1,
      y1: inputDialog.y1,
      x2: inputDialog.x2,
      y2: inputDialog.y2,
      label,
      fontSize: dimensionFontSize,
      symbolId: "dimension-line",
    };
    commit(touchDrawing(local, { objects: [...local.objects, obj] }));
    setSelectedId(obj.id);
    setInputDialog(null);
  };

  return (
    <div className={`flex flex-col gap-3 min-h-0 ${mobileFullscreen ? "h-full flex-1" : "h-full"}`}>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
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
        <p className="text-[11px] text-amber-700 dark:text-amber-400 shrink-0">
          Dużo obiektów ({local.objects.length}). Edycja może spowolnić — rozważ uproszczenie szkicu.
        </p>
      )}

      {/* P1 Mobile Chrome vs Desktop — tylko UI; gest Drawing Engine wspólny */}
      {mobileFullscreen ? (
        <div className="flex flex-col gap-1.5 shrink-0">
          <div
            className="border border-border rounded-lg p-1 bg-card flex flex-wrap items-stretch gap-1"
            role="toolbar"
            aria-label="Narzędzia główne"
          >
            {toolBtn("wall", "Ściana", <Minus size={18} />)}
            {toolBtn("rectangle", "Prostokąt", <RectangleHorizontal size={18} />)}
            {toolBtn("text", "Tekst", <Type size={18} />)}
            {toolBtn("eraser", "Gumka", <Eraser size={18} />)}
            {toolBtn("select", "Zaznacz", <MousePointer2 size={18} />)}
            <button type="button" title="Cofnij" aria-label="Cofnij" disabled={!canUndo} onClick={handleUndo} className={chromeIcon}>
              <Undo2 size={18} />
            </button>
            <button type="button" title="Ponów" aria-label="Ponów" disabled={!canRedo} onClick={handleRedo} className={chromeIcon}>
              <Redo2 size={18} />
            </button>
            <button
              type="button"
              title="Snap (siatka · kąt · punkty)"
              aria-label="Snap"
              onClick={toggleSnap}
              className={`${chromeIcon} ${local.grid.snap ? "bg-primary/15 text-primary" : ""}`}
            >
              <Magnet size={18} />
            </button>
            <button
              type="button"
              title="Siatka"
              aria-label="Siatka"
              onClick={toggleGrid}
              className={`${chromeIcon} ${local.grid.enabled ? "bg-primary/15 text-primary" : ""}`}
            >
              <Grid3x3 size={18} />
            </button>
            <button
              type="button"
              title="Zapisz do plików roboty"
              aria-label="Zapisz do plików roboty"
              disabled={pdfBusy || jobExportBusy}
              onClick={() => void savePdfToJobFiles()}
              className={chromeIcon}
            >
              <Paperclip size={18} />
            </button>
            <button
              type="button"
              title="Zapisz jako zdjęcie"
              aria-label="Zapisz jako zdjęcie"
              disabled={pdfBusy || jobExportBusy}
              onClick={() => void savePngToJobPhotos()}
              className={chromeIcon}
            >
              <ImagePlus size={18} />
            </button>
          </div>
          <div
            className="border border-border rounded-lg p-1 bg-card flex flex-wrap items-stretch gap-1"
            role="toolbar"
            aria-label="Elementy"
          >
            {toolBtn("wall", "Ściana", <Minus size={18} />)}
            {toolBtn("rectangle", "Prostokąt", <RectangleHorizontal size={18} />)}
            {toolBtn("door", "Drzwi", <DoorOpen size={18} />)}
            {toolBtn("window", "Okno", <Square size={18} />)}
            {toolBtn("ventilation", "Wentyl.", <Wind size={18} />)}
            {toolBtn("distribution_board", "Rozdz.", <Box size={18} />)}
            {toolBtn("gas_boiler", "Piec", <Flame size={18} />)}
          </div>
        </div>
      ) : (
      <div
        className="border border-border rounded-lg p-1 bg-card shrink-0 flex flex-wrap items-center gap-1"
        role="toolbar"
        aria-label="Narzędzia rysunku"
      >
        {toolBtn("select", "Wybierz", <MousePointer2 size={14} />)}
        {toolBtn("wall", "Ściana", <Minus size={14} />)}
        {toolBtn("rectangle", "Prostokąt", <RectangleHorizontal size={14} />)}
        {toolBtn("door", "Drzwi", <DoorOpen size={14} />)}
        {toolBtn("window", "Okno", <Square size={14} />)}
        {toolBtn("dimension", "Wymiar", <Ruler size={14} />)}
        {toolBtn("arrow", "Strzałka", <MoveRight size={14} />)}
        {toolBtn("ventilation", "Wentylacja", <Wind size={14} />)}
        {toolBtn("gas_boiler", "Piec", <Flame size={14} />)}
        {toolBtn("distribution_board", "Rozdzielnia", <Box size={14} />)}
        {toolBtn("text", "Tekst", <Type size={14} />)}
        {toolBtn("eraser", "Gumka", <Eraser size={14} />)}
        <span className="w-px h-5 bg-border mx-1 shrink-0" />
        <button type="button" title="Cofnij" aria-label="Cofnij" disabled={!canUndo} onClick={handleUndo} className={chromeIcon}>
          <Undo2 size={14} />
        </button>
        <button type="button" title="Ponów" aria-label="Ponów" disabled={!canRedo} onClick={handleRedo} className={chromeIcon}>
          <Redo2 size={14} />
        </button>
        <span className="w-px h-5 bg-border mx-1 shrink-0" />
        <button
          type="button"
          title="Siatka"
          aria-label="Siatka"
          onClick={toggleGrid}
          className={`${chromeIcon} ${local.grid.enabled ? "bg-primary/15 text-primary" : ""}`}
        >
          <Grid3x3 size={14} />
        </button>
        <button
          type="button"
          title="Snap (siatka · kąt · punkty)"
          aria-label="Snap"
          onClick={toggleSnap}
          className={`${chromeIcon} ${local.grid.snap ? "bg-primary/15 text-primary" : ""}`}
        >
          <Magnet size={14} />
        </button>
        <span className="w-px h-5 bg-border mx-1 shrink-0" />
        <button type="button" title="Pomniejsz" aria-label="Pomniejsz" onClick={zoomOut} className={chromeIcon}>
          <ZoomOut size={14} />
        </button>
        <button type="button" title="Powiększ" aria-label="Powiększ" onClick={zoomIn} className={chromeIcon}>
          <ZoomIn size={14} />
        </button>
        <button type="button" title="Reset widoku" aria-label="Reset widoku" onClick={resetView} className={chromeIcon}>
          <LocateFixed size={14} />
        </button>
        <span className="text-[10px] text-muted-foreground tabular-nums px-1 shrink-0">
          {Math.round(clampDrawingZoom(viewScale) * 100)}%
        </span>
        <span className="w-px h-5 bg-border mx-1 shrink-0" />
        <button
          type="button"
          title="Podgląd PDF"
          aria-label="Podgląd PDF"
          disabled={pdfBusy}
          onClick={() => void runPdfAction("preview")}
          className={chromeAction}
        >
          <Eye size={14} />
          <span className="hidden sm:inline">{pdfBusy ? "PDF…" : "Podgląd PDF"}</span>
        </button>
        <button
          type="button"
          title="Pobierz PDF"
          aria-label="Pobierz PDF"
          disabled={pdfBusy}
          onClick={() => void runPdfAction("download")}
          className={chromeAction}
        >
          <FileDown size={14} />
          <span className="hidden sm:inline">Pobierz PDF</span>
        </button>
        <button
          type="button"
          title="Drukuj"
          aria-label="Drukuj"
          disabled={pdfBusy}
          onClick={() => void runPdfAction("print")}
          className={chromeAction}
        >
          <Printer size={14} />
          <span className="hidden sm:inline">Drukuj</span>
        </button>
        <button
          type="button"
          title="Zapisz do plików roboty"
          aria-label="Zapisz do plików roboty"
          disabled={pdfBusy || jobExportBusy}
          onClick={() => void savePdfToJobFiles()}
          className={chromeAction}
        >
          <Paperclip size={14} />
          <span className="hidden sm:inline">{jobExportBusy ? "Zapis…" : "Do plików"}</span>
        </button>
        <button
          type="button"
          title="Zapisz jako zdjęcie"
          aria-label="Zapisz jako zdjęcie"
          disabled={pdfBusy || jobExportBusy}
          onClick={() => void savePngToJobPhotos()}
          className={chromeAction}
        >
          <ImagePlus size={14} />
          <span className="hidden sm:inline">Jako zdjęcie</span>
        </button>
      </div>
      )}

      {(tool === "wall" || tool === "rectangle") && (toolAllowed("wall") || toolAllowed("rectangle")) && (
        <div
          className="border border-border rounded-lg p-1 bg-card shrink-0 flex flex-wrap items-center gap-1"
          role="toolbar"
          aria-label="Rodzaj ściany"
        >
          <span className="text-[11px] text-muted-foreground px-1 shrink-0">Ściana</span>
          <button
            type="button"
            title="Ściana zewnętrzna"
            aria-label="Ściana zewnętrzna"
            aria-pressed={wallDraftKind === "external"}
            onClick={() => setWallDraftKind("external")}
            className={`${chromeAction} ${wallDraftKind === "external" ? "bg-primary/15 text-primary" : ""}`}
          >
            Zewnętrzna
          </button>
          <button
            type="button"
            title="Ściana działowa"
            aria-label="Ściana działowa"
            aria-pressed={wallDraftKind === "partition"}
            onClick={() => setWallDraftKind("partition")}
            className={`${chromeAction} ${wallDraftKind === "partition" ? "bg-primary/15 text-primary" : ""}`}
          >
            Działowa
          </button>
        </div>
      )}

      {showDimensionFontUi && (
        <div
          className="border border-border rounded-lg p-1 bg-card shrink-0 flex flex-wrap items-center gap-1"
          role="toolbar"
          aria-label="Rozmiar czcionki wymiaru"
        >
          <span className="text-[11px] text-muted-foreground px-1 shrink-0">Rozmiar czcionki wymiaru</span>
          {DRAWING_DIMENSION_FONT_SIZES.map((n) => (
            <button
              key={n}
              type="button"
              title={`Rozmiar ${n}`}
              aria-label={`Rozmiar czcionki wymiaru ${n}`}
              aria-pressed={dimensionFontControlValue === n}
              onClick={() => applyDimensionFontSize(n)}
              className={`${chromeAction} min-w-[2.25rem] justify-center tabular-nums ${
                dimensionFontControlValue === n ? "bg-primary/15 text-primary" : ""
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {selectedId && (
        <div
          className={`border border-border rounded-lg p-1 bg-card shrink-0 ${
            mobileFullscreen
              ? "flex flex-nowrap items-center gap-1 overflow-x-auto overscroll-x-contain"
              : "flex flex-wrap items-center gap-1"
          }`}
          role="toolbar"
          aria-label="Zaznaczenie"
        >
          <span className="text-[11px] text-muted-foreground px-1 shrink-0">Obrót</span>
          {([90, 180, 270] as const).map((deg) => (
            <button
              key={deg}
              type="button"
              title={`Obróć ${deg}°`}
              aria-label={`Obróć ${deg}°`}
              onClick={() => applyRotate(deg)}
              className={chromeAction}
            >
              <RotateCw size={12} />
              {deg}°
            </button>
          ))}
          {selected?.type === "door" && (
            <button type="button" title="Odbij drzwi (flipH)" aria-label="Odbij drzwi" onClick={applyFlip} className={chromeAction}>
              <FlipHorizontal2 size={12} /> Odbij
            </button>
          )}
          <button type="button" title="Duplikuj zaznaczenie" aria-label="Duplikuj" onClick={dupSelected} className={chromeAction}>
            <Copy size={12} /> Duplikuj
          </button>
          <button
            type="button"
            title="Usuń"
            aria-label="Usuń"
            onClick={deleteSelected}
            className={`${chromeAction} ml-auto text-destructive`}
          >
            Usuń
          </button>
        </div>
      )}

      {lineHint && <p className="text-[11px] text-muted-foreground shrink-0">{lineHint}</p>}

      {/* D-M1-06 — thin modal zamiast window.prompt */}
      {inputDialog && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-3"
          role="dialog"
          aria-modal="true"
          aria-label={inputDialog.kind === "text" ? "Tekst na rysunku" : "Długość wymiaru"}
          onClick={() => setInputDialog(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-lg space-y-3 mb-[env(safe-area-inset-bottom)]"
            onClick={(ev) => ev.stopPropagation()}
          >
            <p className="text-sm font-medium">
              {inputDialog.kind === "text" ? "Tekst na rysunku" : "Długość"}
            </p>
            {inputDialog.kind === "dimension" && (
              <div className="flex gap-4 text-sm" role="radiogroup" aria-label="Jednostka wymiaru">
                <label className="inline-flex items-center gap-2 touch-target cursor-pointer">
                  <input
                    type="radio"
                    name="dimension-unit"
                    checked={dimensionUnit === "cm"}
                    onChange={() => setDimensionUnit("cm")}
                  />
                  cm
                </label>
                <label className="inline-flex items-center gap-2 touch-target cursor-pointer">
                  <input
                    type="radio"
                    name="dimension-unit"
                    checked={dimensionUnit === "m"}
                    onChange={() => setDimensionUnit("m")}
                  />
                  m
                </label>
              </div>
            )}
            {inputDialog.kind === "text" && (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="inline-flex items-center gap-2">
                  <span className="text-muted-foreground">Rozmiar</span>
                  <select
                    className="min-h-[44px] rounded-md border border-border bg-background px-2"
                    value={textFontSize}
                    onChange={(e) => setTextFontSize(Number(e.target.value) || TEXT_DEFAULT_FONT_SIZE)}
                    aria-label="Rozmiar czcionki"
                  >
                    {[12, 14, 18, 24].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="inline-flex items-center gap-2 touch-target cursor-pointer">
                  <input
                    type="checkbox"
                    checked={textBold}
                    onChange={(e) => setTextBold(e.target.checked)}
                    aria-label="Pogrubienie"
                  />
                  Pogrubienie
                </label>
              </div>
            )}
            <input
              autoFocus
              className="w-full min-h-[44px] rounded-md border border-border bg-background px-3 text-sm"
              value={inputDialog.value}
              onChange={(e) =>
                setInputDialog((prev) => (prev ? { ...prev, value: e.target.value } : prev))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmInputDialog();
                }
                if (e.key === "Escape") setInputDialog(null);
              }}
              placeholder={
                inputDialog.kind === "text"
                  ? "Tekst…"
                  : dimensionUnit === "m"
                    ? "np. 1,10"
                    : "np. 110"
              }
              aria-label={inputDialog.kind === "text" ? "Treść tekstu" : "Długość"}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="touch-target px-3 rounded-md text-sm border border-border hover:bg-secondary"
                onClick={() => setInputDialog(null)}
              >
                Anuluj
              </button>
              <button
                type="button"
                className="touch-target px-3 rounded-md text-sm bg-primary text-primary-foreground"
                onClick={confirmInputDialog}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={svgHostRef}
        className={`wm-drawing-surface flex-1 min-h-[280px] rounded-xl border border-border bg-slate-100 dark:bg-slate-900/40 p-2 ${
          mobileFullscreen ? "overflow-hidden touch-none" : "overflow-auto"
        }`}
        style={mobileFullscreen ? { touchAction: "none" } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerLeave}
      >
        <div
          className="inline-block shadow-sm origin-top-left"
          style={{
            transform: `translate(${viewPan.x}px, ${viewPan.y}px) scale(${clampDrawingZoom(viewScale)})`,
          }}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground shrink-0">
        Format {local.page.format} {local.page.orientation} · obiektów {local.objects.length}
        {mobileFullscreen ? " · Ściana: przeciągnij i puść" : " · PDF P2"}
      </p>
    </div>
  );
}
