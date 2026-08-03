/** WM-RYSUNKI-01 P0 — edytor: ściana · tekst · grid · snap · undo · autosave. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Redo2,
  Type,
  Undo2,
  Minus,
  MousePointer2,
  Grid3x3,
  Magnet,
} from "lucide-react";
import { DrawingUndoStack } from "@/lib/wm-technical-drawings/undo";
import { renderDrawingSvg } from "@/lib/wm-technical-drawings/render-svg";
import { snapCoord } from "@/lib/wm-technical-drawings/normalize";
import { touchDrawing } from "@/lib/wm-technical-drawings/report";
import type { DrawingObject, DrawingWallObject, WmTechnicalDrawing } from "@/lib/wm-technical-drawings/types";

type Tool = "select" | "wall" | "text";

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

export function WmPrintDrawingEditor({
  drawing,
  onChange,
  onAutosave,
}: {
  drawing: WmTechnicalDrawing;
  onChange: (next: WmTechnicalDrawing) => void;
  onAutosave: (next: WmTechnicalDrawing) => void;
}) {
  const stackRef = useRef<DrawingUndoStack | null>(null);
  if (!stackRef.current || stackRef.current.getCurrent().id !== drawing.id) {
    stackRef.current = new DrawingUndoStack(drawing);
  }

  const [local, setLocal] = useState<WmTechnicalDrawing>(() => stackRef.current!.getCurrent());
  const localRef = useRef(local);
  localRef.current = local;
  const [tool, setTool] = useState<Tool>("wall");
  const [wallStart, setWallStart] = useState<{ x: number; y: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [undoTick, setUndoTick] = useState(0);
  const svgHostRef = useRef<HTMLDivElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragDirtyRef = useRef(false);
  const dragRef = useRef<{
    id: string;
    mode: "move-text" | "move-wall";
    ox: number;
    oy: number;
    orig: DrawingObject;
    snapshot: WmTechnicalDrawing;
  } | null>(null);

  /* Sync zewnętrzny (lista → ten sam id z nowszym updatedAt) */
  useEffect(() => {
    if (drawing.id !== local.id) {
      stackRef.current = new DrawingUndoStack(drawing);
      setLocal(stackRef.current.getCurrent());
      setWallStart(null);
      setSelectedId(null);
      return;
    }
    if (drawing.updatedAt > local.updatedAt) {
      stackRef.current?.replace(drawing);
      setLocal(stackRef.current!.getCurrent());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- porównanie updatedAt
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

  const svgMarkup = useMemo(
    () => renderDrawingSvg(local, { showGrid: true }),
    [local],
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

  const findSvg = (): SVGSVGElement | null =>
    svgHostRef.current?.querySelector("svg") ?? null;

  const onPointerDown = (e: React.PointerEvent) => {
    const svg = findSvg();
    if (!svg) return;
    const raw = clientToSvgPoint(svg, e.clientX, e.clientY);
    const p = snap(raw.x, raw.y);

    if (tool === "wall") {
      if (!wallStart) {
        setWallStart(p);
        return;
      }
      const wall: DrawingWallObject = {
        id: crypto.randomUUID(),
        type: "wall",
        x1: wallStart.x,
        y1: wallStart.y,
        x2: p.x,
        y2: p.y,
        thickness: 4,
        symbolId: "wall-default",
      };
      commit(
        touchDrawing(local, {
          objects: [...local.objects, wall],
        }),
      );
      setWallStart(null);
      setSelectedId(wall.id);
      return;
    }

    if (tool === "text") {
      const content = window.prompt("Tekst na rysunku:", "Opis");
      if (content == null) return;
      const textObj: DrawingObject = {
        id: crypto.randomUUID(),
        type: "text",
        x: p.x,
        y: p.y,
        content: content.trim() || "Tekst",
        fontSize: 14,
        symbolId: "text-label",
      };
      commit(
        touchDrawing(local, {
          objects: [...local.objects, textObj],
        }),
      );
      setSelectedId(textObj.id);
      return;
    }

    /* select */
    const target = (e.target as Element).closest?.("[data-id]");
    const id = target?.getAttribute("data-id") ?? null;
    setSelectedId(id);
    if (!id) return;
    const obj = local.objects.find((o) => o.id === id);
    if (!obj || obj.locked) return;
    if (obj.type === "text") {
      dragRef.current = {
        id,
        mode: "move-text",
        ox: p.x,
        oy: p.y,
        orig: { ...obj },
        snapshot: local,
      };
    } else if (obj.type === "wall") {
      dragRef.current = {
        id,
        mode: "move-wall",
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
    if (drag.mode === "move-text" && orig.type === "text") {
      nextObj = { ...orig, x: orig.x + dx, y: orig.y + dy };
    } else if (drag.mode === "move-wall" && orig.type === "wall") {
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
    /* MR-06: podczas drag — replace bez undo per frame */
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
    commit(
      touchDrawing(local, {
        objects: local.objects.filter((o) => o.id !== selectedId),
      }),
    );
    setSelectedId(null);
  };

  const toggleGrid = () => {
    commit(
      touchDrawing(local, {
        grid: { ...local.grid, enabled: !local.grid.enabled },
      }),
    );
  };

  const toggleSnap = () => {
    commit(
      touchDrawing(local, {
        grid: { ...local.grid, snap: !local.grid.snap },
      }),
    );
  };

  const updateTitle = (title: string) => {
    commit(touchDrawing(local, { title: title.slice(0, 120) }));
  };

  const toolBtn = (t: Tool, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      title={label}
      onClick={() => {
        setTool(t);
        setWallStart(null);
      }}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium ${
        tool === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"
      }`}
    >
      {icon}
      {label}
    </button>
  );

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

      <div className="flex flex-wrap items-center gap-1 border border-border rounded-lg p-1 bg-card">
        {toolBtn("select", "Wybierz", <MousePointer2 size={14} />)}
        {toolBtn("wall", "Ściana", <Minus size={14} />)}
        {toolBtn("text", "Tekst", <Type size={14} />)}
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
        {selectedId && (
          <button
            type="button"
            onClick={deleteSelected}
            className="ml-auto text-xs text-destructive hover:underline px-2"
          >
            Usuń zaznaczenie
          </button>
        )}
      </div>

      {tool === "wall" && (
        <p className="text-[11px] text-muted-foreground">
          {wallStart ? "Kliknij drugi punkt ściany." : "Kliknij pierwszy punkt ściany."}
        </p>
      )}

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
        Format {local.page.format} {local.page.orientation} · obiektów {local.objects.length} · P0:
        ściana + tekst
      </p>
    </div>
  );
}
