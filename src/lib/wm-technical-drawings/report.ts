/** WM-RYSUNKI-01 P0 — CRUD raport / upsert / hard-delete / duplicate (MR-02). */

import { parseWmTechnicalDrawing } from "@/lib/wm-technical-drawings/normalize";
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

/** MR-02: hard-remove z tablicy (bez tombstone) — jak Schematy. */
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
