/** WM-RYSUNKI-01 — CRUD / upsert / hard-delete / duplicate (MR-02) · P1 dup elementów. */

import { parseWmTechnicalDrawing, validateDrawingForFinal } from "@/lib/wm-technical-drawings/normalize";
import type { DrawingDomainReport, DrawingObject, WmTechnicalDrawing } from "@/lib/wm-technical-drawings/types";

export function emptyDrawingDomainReport(): DrawingDomainReport {
  return { added: [], updated: [], removed: [] };
}

export function computeDrawingDomainReport(
  before: WmTechnicalDrawing[],
  after: WmTechnicalDrawing[],
): DrawingDomainReport {
  const beforeMap = new Map(before.map((d) => [d.id, d]));
  const afterMap = new Map(after.map((d) => [d.id, d]));
  const added: string[] = [];
  const updated: string[] = [];
  const removed: string[] = [];

  for (const [id, next] of afterMap) {
    const prev = beforeMap.get(id);
    if (!prev) {
      added.push(id);
      continue;
    }
    if (next.updatedAt !== prev.updatedAt || JSON.stringify(next) !== JSON.stringify(prev)) {
      updated.push(id);
    }
  }
  for (const id of beforeMap.keys()) {
    if (!afterMap.has(id)) removed.push(id);
  }
  return { added, updated, removed };
}

export function touchDrawing(
  drawing: WmTechnicalDrawing,
  patch: Partial<Omit<WmTechnicalDrawing, "id" | "createdAt">>,
): WmTechnicalDrawing {
  const merged = {
    ...drawing,
    ...patch,
    page: patch.page ?? drawing.page,
    grid: patch.grid ?? drawing.grid,
    objects: patch.objects ?? drawing.objects,
    updatedAt: new Date().toISOString(),
  };
  const parsed = parseWmTechnicalDrawing(merged);
  if (!parsed) throw new Error("touchDrawing: normalize failed");
  return parsed;
}

export function upsertDrawing(
  drawings: WmTechnicalDrawing[],
  next: WmTechnicalDrawing,
): { drawings: WmTechnicalDrawing[]; report: DrawingDomainReport } {
  const before = [...drawings];
  const idx = drawings.findIndex((d) => d.id === next.id);
  let after: WmTechnicalDrawing[];
  if (idx >= 0) {
    after = [...drawings];
    after[idx] = { ...next, createdAt: drawings[idx].createdAt };
  } else {
    after = [next, ...drawings];
  }
  return {
    drawings: after,
    report: computeDrawingDomainReport(before, after),
  };
}

/** MR-02: hard-remove z tablicy (bez tombstone). */
export function removeDrawing(
  drawings: WmTechnicalDrawing[],
  id: string,
): { drawings: WmTechnicalDrawing[]; report: DrawingDomainReport } {
  const before = [...drawings];
  const after = drawings.filter((d) => d.id !== id);
  return {
    drawings: after,
    report: computeDrawingDomainReport(before, after),
  };
}

export function duplicateDrawing(source: WmTechnicalDrawing): WmTechnicalDrawing {
  const now = new Date().toISOString();
  const titleBase = source.title.trim() || "Rysunek";
  const title = `${titleBase} (kopia)`.slice(0, 120);
  const objects: DrawingObject[] = source.objects.map((o) => ({
    ...o,
    id: crypto.randomUUID(),
  }));

  const copy: WmTechnicalDrawing = {
    ...source,
    id: crypto.randomUUID(),
    title,
    status: "draft",
    objects,
    renderedSvg: undefined,
    renderVersion: undefined,
    createdAt: now,
    updatedAt: now,
  };
  const parsed = parseWmTechnicalDrawing(copy);
  if (!parsed) throw new Error("duplicateDrawing: normalize failed");
  return parsed;
}

function offsetObject(obj: DrawingObject, dx: number, dy: number): DrawingObject {
  const id = crypto.randomUUID();
  if (obj.type === "wall" || obj.type === "dimension" || obj.type === "arrow") {
    return { ...obj, id, x1: obj.x1 + dx, y1: obj.y1 + dy, x2: obj.x2 + dx, y2: obj.y2 + dy };
  }
  if (
    obj.type === "text" ||
    obj.type === "door" ||
    obj.type === "window" ||
    obj.type === "ventilation" ||
    obj.type === "gas_boiler"
  ) {
    return { ...obj, id, x: obj.x + dx, y: obj.y + dy };
  }
  return { ...obj, id, x: (obj.x ?? 0) + dx, y: (obj.y ?? 0) + dy };
}

/** AC-P1-02: duplikuj zaznaczenie z offsetem grid step. */
export function duplicateSelectedObjects(
  drawing: WmTechnicalDrawing,
  selectedIds: string[],
  offset?: number,
): { drawing: WmTechnicalDrawing; newIds: string[] } {
  const dx = offset ?? drawing.grid.step;
  const dy = offset ?? drawing.grid.step;
  const newIds: string[] = [];
  const extras: DrawingObject[] = [];
  for (const id of selectedIds) {
    const src = drawing.objects.find((o) => o.id === id);
    if (!src || src.locked) continue;
    const copy = offsetObject(src, dx, dy);
    extras.push(copy);
    newIds.push(copy.id);
  }
  return {
    drawing: touchDrawing(drawing, { objects: [...drawing.objects, ...extras] }),
    newIds,
  };
}

/** AC-P1-03: draft → final. */
export function setDrawingFinal(drawing: WmTechnicalDrawing): {
  ok: boolean;
  drawing?: WmTechnicalDrawing;
  missing: string[];
} {
  const check = validateDrawingForFinal(drawing);
  if (!check.ok) return { ok: false, missing: check.missing };
  return {
    ok: true,
    missing: [],
    drawing: touchDrawing(drawing, { status: "final" }),
  };
}

/** D-P1-12: rotate o 90/180/270 względem aktualnego. */
export function rotateObjectBy(
  obj: DrawingObject,
  deltaDeg: 90 | 180 | 270,
): DrawingObject {
  if (obj.type === "wall" || obj.type === "dimension" || obj.type === "arrow") {
    const mx = (obj.x1 + obj.x2) / 2;
    const my = (obj.y1 + obj.y2) / 2;
    const rad = (deltaDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rot = (x: number, y: number) => {
      const dx = x - mx;
      const dy = y - my;
      return { x: mx + dx * cos - dy * sin, y: my + dx * sin + dy * cos };
    };
    const a = rot(obj.x1, obj.y1);
    const b = rot(obj.x2, obj.y2);
    return { ...obj, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
  }
  const cur = obj.rotation ?? 0;
  return { ...obj, rotation: ((cur + deltaDeg) % 360 + 360) % 360 };
}

export function toggleDoorFlipH(obj: DrawingObject): DrawingObject {
  if (obj.type !== "door") return obj;
  return { ...obj, flipH: !obj.flipH };
}
