/** WM-RYSUNKI-01 P0 — LWW merge per id (wzorzec Schematy). */
/** WM-WORKER-SKETCH-01: soft-delete via deletedAt — prefer softDelete* helpers. */

import {
  isDrawingSoftDeleted,
  isDrawingVisibleInRysunkiTab,
  normalizeWmTechnicalDrawings,
} from "@/lib/wm-technical-drawings/normalize";
import type { WmTechnicalDrawing } from "@/lib/wm-technical-drawings/types";

export function mergeWmTechnicalDrawings(local: unknown, cloud: unknown): WmTechnicalDrawing[] {
  const byId = new Map<string, WmTechnicalDrawing>();
  for (const item of normalizeWmTechnicalDrawings(local)) byId.set(item.id, item);
  for (const item of normalizeWmTechnicalDrawings(cloud)) {
    const prev = byId.get(item.id);
    if (!prev || item.updatedAt >= prev.updatedAt) byId.set(item.id, item);
  }
  return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function filterDrawingsForJob(drawings: WmTechnicalDrawing[], jobId: string): WmTechnicalDrawing[] {
  if (!jobId) return [];
  return drawings
    .filter((d) => d.jobId === jobId && !isDrawingSoftDeleted(d))
    .sort((a, b) => b.documentDate.localeCompare(a.documentDate) || b.updatedAt.localeCompare(a.updatedAt));
}

/** Docs → Szkice (Worker) — origin worker / domain job_sketch, active. */
export function filterWorkerSketchesForJob(
  drawings: WmTechnicalDrawing[],
  jobId: string,
  workerUserId?: string,
): WmTechnicalDrawing[] {
  return filterDrawingsForJob(drawings, jobId)
    .filter((d) => d.domain === "job_sketch" || d.origin === "worker")
    .filter((d) => !workerUserId || !d.createdByUserId || d.createdByUserId === workerUserId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** A2 — lista Odbiory → Rysunki. */
export function filterDrawingsForRysunkiTab(drawings: WmTechnicalDrawing[]): WmTechnicalDrawing[] {
  return drawings
    .filter(isDrawingVisibleInRysunkiTab)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getDrawingById(
  drawings: WmTechnicalDrawing[],
  id: string,
): WmTechnicalDrawing | undefined {
  return drawings.find((d) => d.id === id);
}

export function serializeWmTechnicalDrawingsForStorage(drawings: WmTechnicalDrawing[]): WmTechnicalDrawing[] {
  return normalizeWmTechnicalDrawings(JSON.parse(JSON.stringify(drawings)));
}
