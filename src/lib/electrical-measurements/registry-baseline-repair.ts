/**
 * EM-P1.6B — naprawa baseline RAP (usunięcie raportów testowych, start od RAP-44-2026).
 * EM-P1.6C — repair v2 (prod KV: RAP-2 + Cygan bez numeru, registry legacy []).
 */

import type { ElectricalMeasurement } from "@/lib/electrical-measurements/types";
import type { ElectricalMeasurementRegistryState } from "@/lib/electrical-measurements/types";
import { parseRapNumber } from "@/lib/electrical-measurements/registry";

/** EM-P1.6B — historyczna wersja naprawy (testy regresji). */
export const RAP_BASELINE_REPAIR_VERSION_P16B = 1;
/** EM-P1.6C — aktualna wersja naprawy uruchamiana w App.tsx. */
export const RAP_BASELINE_REPAIR_VERSION = 2;
export const RAP_BASELINE_YEAR_2026 = 2026;
export const RAP_BASELINE_LAST_SEQUENCE_2026 = 44;
export const TEST_RAP_NUMBERS_TO_PURGE = ["RAP-1-2026", "RAP-2-2026"] as const;

const TEST_RAP_SET = new Set<string>(TEST_RAP_NUMBERS_TO_PURGE);

function normalizePl(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

/** Roboty testowe EM-P1.6B — Kleczkowska 26 m.3 · Brochów m. Cyganka */
export function isRapRegistryTestJob(job: { address?: string; flatNumber?: string }): boolean {
  const addr = normalizePl(job.address ?? "");
  const flat = normalizePl(job.flatNumber ?? "");

  if (addr.includes("kleczkowska") && (flat === "3" || flat.includes("26") || addr.includes("26/3") || addr.includes("26 m 3"))) {
    return true;
  }
  if (addr.includes("brochow") && flat.includes("cyganka")) {
    return true;
  }
  return false;
}

/** EM-P1.6C — sierocy raport bez numeru RAP (prod: Cygan Nowowiej). */
export function isCyganNowowiejRepairJob(job: { address?: string }): boolean {
  const addr = normalizePl(job.address ?? "");
  return addr.includes("cygan") && addr.includes("nowowiej");
}

export function collectCyganNowowiejRepairJobIds(
  jobs: { id: string; address?: string }[],
): Set<string> {
  const ids = new Set<string>();
  for (const j of jobs) {
    if (isCyganNowowiejRepairJob(j)) ids.add(j.id);
  }
  return ids;
}

export function isTestRapNumber(rapNumber: string): boolean {
  const n = String(rapNumber ?? "").trim().toUpperCase();
  return TEST_RAP_SET.has(n);
}

export function shouldPurgeMeasurement(
  m: ElectricalMeasurement,
  testJobIds: Set<string>,
): boolean {
  if (testJobIds.has(m.jobId)) return true;
  return isTestRapNumber(m.reportNumber);
}

export function shouldPurgeMeasurementP16C(
  m: ElectricalMeasurement,
  testJobIds: Set<string>,
  cyganJobIds: Set<string>,
): boolean {
  if (shouldPurgeMeasurement(m, testJobIds)) return true;
  if (cyganJobIds.has(m.jobId) && !String(m.reportNumber ?? "").trim()) return true;
  return false;
}

export function collectRapRegistryTestJobIds(
  jobs: { id: string; address?: string; flatNumber?: string }[],
): Set<string> {
  const ids = new Set<string>();
  for (const j of jobs) {
    if (isRapRegistryTestJob(j)) ids.add(j.id);
  }
  return ids;
}

export function applyRapRegistryBaselineRepairP16B(
  state: ElectricalMeasurementRegistryState,
  measurements: ElectricalMeasurement[],
  jobs: { id: string; address?: string; flatNumber?: string }[],
): { state: ElectricalMeasurementRegistryState; measurements: ElectricalMeasurement[]; changed: boolean } {
  if ((state.repairVersion ?? 0) >= RAP_BASELINE_REPAIR_VERSION_P16B) {
    return { state, measurements, changed: false };
  }

  const testJobIds = collectRapRegistryTestJobIds(jobs);
  let changed = false;

  const nextMeasurements = measurements.filter((m) => {
    const purge = shouldPurgeMeasurement(m, testJobIds);
    if (purge) changed = true;
    return !purge;
  });

  const nextEntries = state.entries.filter((e) => {
    const purge = testJobIds.has(e.jobId) || isTestRapNumber(e.rapNumber);
    if (purge) changed = true;
    return !purge;
  });

  const baselineByYear = { ...state.baselineByYear };
  const yearKey = String(RAP_BASELINE_YEAR_2026);
  if ((baselineByYear[yearKey] ?? 0) < RAP_BASELINE_LAST_SEQUENCE_2026) {
    baselineByYear[yearKey] = RAP_BASELINE_LAST_SEQUENCE_2026;
    changed = true;
  }

  const nextState: ElectricalMeasurementRegistryState = {
    v: 1,
    baselineByYear,
    entries: nextEntries,
    repairVersion: RAP_BASELINE_REPAIR_VERSION_P16B,
    updatedAt: new Date().toISOString(),
  };

  if (!changed) {
    return {
      state: { ...state, repairVersion: RAP_BASELINE_REPAIR_VERSION_P16B, updatedAt: new Date().toISOString() },
      measurements: nextMeasurements,
      changed: true,
    };
  }

  return { state: nextState, measurements: nextMeasurements, changed: true };
}

/**
 * EM-P1.6C — jednorazowa naprawa prod (repairVersion < 2).
 * Usuwa RAP-1/RAP-2, roboty testowe, sierocy Cygan bez numeru; baseline 44; pusty rejestr.
 */
export function applyRapRegistryBaselineRepairP16C(
  state: ElectricalMeasurementRegistryState,
  measurements: ElectricalMeasurement[],
  jobs: { id: string; address?: string; flatNumber?: string }[],
): { state: ElectricalMeasurementRegistryState; measurements: ElectricalMeasurement[]; changed: boolean } {
  if ((state.repairVersion ?? 0) >= RAP_BASELINE_REPAIR_VERSION) {
    return { state, measurements, changed: false };
  }

  const testJobIds = collectRapRegistryTestJobIds(jobs);
  const cyganJobIds = collectCyganNowowiejRepairJobIds(jobs);
  let changed = false;

  const nextMeasurements = measurements.filter((m) => {
    const purge = shouldPurgeMeasurementP16C(m, testJobIds, cyganJobIds);
    if (purge) changed = true;
    return !purge;
  });

  const nextEntries = state.entries.filter((e) => {
    const purge =
      testJobIds.has(e.jobId) || cyganJobIds.has(e.jobId) || isTestRapNumber(e.rapNumber);
    if (purge) changed = true;
    return !purge;
  });

  const baselineByYear = { ...state.baselineByYear };
  const yearKey = String(RAP_BASELINE_YEAR_2026);
  if ((baselineByYear[yearKey] ?? 0) < RAP_BASELINE_LAST_SEQUENCE_2026) {
    baselineByYear[yearKey] = RAP_BASELINE_LAST_SEQUENCE_2026;
    changed = true;
  }

  const nextState: ElectricalMeasurementRegistryState = {
    v: 1,
    baselineByYear,
    entries: nextEntries,
    repairVersion: RAP_BASELINE_REPAIR_VERSION,
    updatedAt: new Date().toISOString(),
  };

  if (!changed) {
    return {
      state: { ...state, repairVersion: RAP_BASELINE_REPAIR_VERSION, updatedAt: new Date().toISOString() },
      measurements: nextMeasurements,
      changed: true,
    };
  }

  return { state: nextState, measurements: nextMeasurements, changed: true };
}

/** Alias SSOT — App.tsx wywołuje tę funkcję. */
export const applyRapRegistryBaselineRepair = applyRapRegistryBaselineRepairP16C;

/** Weryfikacja — brak testowych numerów w danych. */
export function registryStateHasTestRapNumbers(state: ElectricalMeasurementRegistryState): boolean {
  return state.entries.some((e) => isTestRapNumber(e.rapNumber));
}

export function measurementsHaveTestRapNumbers(measurements: ElectricalMeasurement[]): boolean {
  return measurements.some((m) => isTestRapNumber(m.reportNumber));
}

export function getBaselineSequenceForYear(
  state: ElectricalMeasurementRegistryState,
  year: number,
): number {
  return state.baselineByYear[String(year)] ?? 0;
}

export function nextRapSequencePreview(
  state: ElectricalMeasurementRegistryState,
  year: number,
): number {
  let max = getBaselineSequenceForYear(state, year);
  for (const e of state.entries) {
    if (e.year === year && e.sequence > max) max = e.sequence;
  }
  return max + 1;
}
