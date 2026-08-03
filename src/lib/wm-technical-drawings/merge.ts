/** WM-RYSUNKI-01 P0 — LWW merge per id (wzorzec Schematy). MR-02: hard-remove (brak tombstone). */

import { normalizeWmTechnicalDrawings } from "@/lib/wm-technical-drawings/normalize";
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
    .filter((d) => d.jobId === jobId)
    .sort((a, b) => b.documentDate.localeCompare(a.documentDate) || b.updatedAt.localeCompare(a.updatedAt));
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
