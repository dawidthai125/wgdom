/**
 * EM-CATALOG-001 — tombstone usuniętych raportów (sync między urządzeniami).
 * Wzorzec: WM Druk deleted-template-ids / operational-notes-deleted-ids.
 */

export const ELECTRICAL_MEASUREMENTS_DELETED_IDS_KEY = "kw-electrical-measurements-deleted-ids";

const MAX_TOMBSTONES = 2000;

function normalizeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
}

export function getDeletedElectricalMeasurementIds(): string[] {
  try {
    const raw = localStorage.getItem(ELECTRICAL_MEASUREMENTS_DELETED_IDS_KEY);
    if (!raw) return [];
    return normalizeIds(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveDeletedElectricalMeasurementIds(ids: string[]): void {
  const next = [...new Set(ids)].slice(-MAX_TOMBSTONES);
  try {
    localStorage.setItem(ELECTRICAL_MEASUREMENTS_DELETED_IDS_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

export function mergeDeletedElectricalMeasurementIds(local: unknown, cloud: unknown): string[] {
  return [...new Set([...normalizeIds(local), ...normalizeIds(cloud)])].slice(-MAX_TOMBSTONES);
}

export function addDeletedElectricalMeasurementIds(ids: string[]): string[] {
  const next = mergeDeletedElectricalMeasurementIds(getDeletedElectricalMeasurementIds(), ids);
  saveDeletedElectricalMeasurementIds(next);
  return next;
}
