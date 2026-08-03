/** WM-RYSUNKI-01 P0 — push / read LS + cloud AUX. */

import { pushKeysToCloud } from "@/lib/cloud-sync";
import { mergeWmTechnicalDrawings } from "@/lib/wm-technical-drawings/merge";
import { normalizeWmTechnicalDrawings } from "@/lib/wm-technical-drawings/normalize";
import {
  WM_TECHNICAL_DRAWINGS_KEY,
  type WmTechnicalDrawing,
} from "@/lib/wm-technical-drawings/types";

export { WM_TECHNICAL_DRAWINGS_KEY, mergeWmTechnicalDrawings, normalizeWmTechnicalDrawings };

export async function pushWmTechnicalDrawingsToCloud(drawings: WmTechnicalDrawing[]): Promise<void> {
  const normalized = normalizeWmTechnicalDrawings(drawings);
  try {
    localStorage.setItem(WM_TECHNICAL_DRAWINGS_KEY, JSON.stringify(normalized));
  } catch {
    /* ignore quota */
  }
  await pushKeysToCloud([WM_TECHNICAL_DRAWINGS_KEY], [normalized]);
}

export function readWmTechnicalDrawingsFromLocalStorage(): WmTechnicalDrawing[] {
  try {
    const raw = localStorage.getItem(WM_TECHNICAL_DRAWINGS_KEY);
    if (!raw) return [];
    return normalizeWmTechnicalDrawings(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function mergeWmTechnicalDrawingsFromSources(local: unknown, cloud: unknown): WmTechnicalDrawing[] {
  return mergeWmTechnicalDrawings(local, cloud);
}
