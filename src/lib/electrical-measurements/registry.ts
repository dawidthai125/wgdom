/**
 * EM-P1.6 — trwały rejestr numerów RAP (1 numer ↔ 1 jobId, bez zwrotu do puli).
 * EM-P1.6B — baseline roczny (ostatni numer poza WGDOM).
 */

import type {
  ElectricalMeasurement,
  ElectricalMeasurementRegistryEntry,
  ElectricalMeasurementRegistryState,
  ElectricalMeasurementRegistryStatus,
} from "@/lib/electrical-measurements/types";
import { isTestMeasurement } from "@/lib/electrical-measurements/test-report";

const RAP_RE = /^RAP-(\d+)-(\d{4})$/i;

export function formatRapNumber(sequence: number, year: number): string {
  return `RAP-${sequence}-${year}`;
}

export function parseRapNumber(rapNumber: string): { sequence: number; year: number } | null {
  const m = String(rapNumber ?? "").trim().match(RAP_RE);
  if (!m) return null;
  const sequence = parseInt(m[1], 10);
  const year = parseInt(m[2], 10);
  if (!Number.isFinite(sequence) || sequence < 1 || !Number.isFinite(year)) return null;
  return { sequence, year };
}

export function createEmptyRegistryState(): ElectricalMeasurementRegistryState {
  return { v: 1, baselineByYear: {}, entries: [], repairVersion: 0 };
}

export function normalizeElectricalMeasurementRegistryEntries(
  raw: unknown,
): ElectricalMeasurementRegistryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ElectricalMeasurementRegistryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Partial<ElectricalMeasurementRegistryEntry>;
    const jobId = String(r.jobId ?? "").trim();
    const rapNumber = String(r.rapNumber ?? "").trim();
    const parsed = parseRapNumber(rapNumber);
    if (!jobId || !parsed) continue;
    const status: ElectricalMeasurementRegistryStatus =
      r.status === "CANCELLED" ? "CANCELLED" : "ACTIVE";
    out.push({
      jobId,
      rapNumber: formatRapNumber(parsed.sequence, parsed.year),
      year: parsed.year,
      sequence: parsed.sequence,
      assignedAt: String(r.assignedAt ?? new Date().toISOString()),
      status,
    });
  }
  return out;
}

/** @deprecated alias — użyj normalizeElectricalMeasurementRegistryState */
export function normalizeElectricalMeasurementRegistry(raw: unknown): ElectricalMeasurementRegistryEntry[] {
  return normalizeElectricalMeasurementRegistryState(raw).entries;
}

export function normalizeElectricalMeasurementRegistryState(
  raw: unknown,
): ElectricalMeasurementRegistryState {
  if (Array.isArray(raw)) {
    return {
      v: 1,
      baselineByYear: {},
      entries: normalizeElectricalMeasurementRegistryEntries(raw),
      repairVersion: 0,
    };
  }
  if (!raw || typeof raw !== "object") return createEmptyRegistryState();
  const r = raw as Partial<ElectricalMeasurementRegistryState>;
  const baselineByYear: Record<string, number> = {};
  if (r.baselineByYear && typeof r.baselineByYear === "object") {
    for (const [k, v] of Object.entries(r.baselineByYear)) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) baselineByYear[String(k)] = Math.floor(n);
    }
  }
  return {
    v: 1,
    baselineByYear,
    entries: normalizeElectricalMeasurementRegistryEntries(r.entries ?? []),
    repairVersion: typeof r.repairVersion === "number" ? r.repairVersion : 0,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : undefined,
  };
}

export function mergeElectricalMeasurementRegistry(
  local: unknown,
  cloud: unknown,
): ElectricalMeasurementRegistryState {
  const l = normalizeElectricalMeasurementRegistryState(local);
  const c = normalizeElectricalMeasurementRegistryState(cloud);
  const baselineByYear: Record<string, number> = { ...l.baselineByYear };
  for (const [year, seq] of Object.entries(c.baselineByYear)) {
    baselineByYear[year] = Math.max(baselineByYear[year] ?? 0, seq);
  }

  const byJobId = new Map<string, ElectricalMeasurementRegistryEntry>();
  for (const e of [...l.entries, ...c.entries]) {
    const prev = byJobId.get(e.jobId);
    if (!prev || e.assignedAt >= prev.assignedAt) byJobId.set(e.jobId, e);
  }

  const repairVersion = Math.max(l.repairVersion ?? 0, c.repairVersion ?? 0);
  const updatedAt = [l.updatedAt, c.updatedAt].filter(Boolean).sort().pop();

  return {
    v: 1,
    baselineByYear,
    entries: [...byJobId.values()].sort((a, b) => b.assignedAt.localeCompare(a.assignedAt)),
    repairVersion,
    updatedAt,
  };
}

export function getRegistryEntryForJob(
  state: ElectricalMeasurementRegistryState,
  jobId: string,
): ElectricalMeasurementRegistryEntry | undefined {
  if (!jobId) return undefined;
  return state.entries.find((e) => e.jobId === jobId);
}

export function getMaxSequenceForYear(
  state: ElectricalMeasurementRegistryState,
  year: number,
): number {
  let max = state.baselineByYear[String(year)] ?? 0;
  for (const e of state.entries) {
    if (e.year === year && e.sequence > max) max = e.sequence;
  }
  return max;
}

function upsertRegistryEntry(
  state: ElectricalMeasurementRegistryState,
  entry: ElectricalMeasurementRegistryEntry,
): ElectricalMeasurementRegistryState {
  return {
    ...state,
    entries: [entry, ...state.entries.filter((e) => e.jobId !== entry.jobId)],
    updatedAt: new Date().toISOString(),
  };
}

/** Przydziel lub odtwórz numer RAP dla roboty (nigdy nowy numer jeśli wpis już istnieje). */
export function assignRapForJob(
  state: ElectricalMeasurementRegistryState,
  jobId: string,
  options?: { now?: Date },
): { registry: ElectricalMeasurementRegistryState; entry: ElectricalMeasurementRegistryEntry } {
  const now = options?.now ?? new Date();
  const year = now.getFullYear();
  const existing = getRegistryEntryForJob(state, jobId);

  if (existing) {
    const next: ElectricalMeasurementRegistryEntry = {
      ...existing,
      status: "ACTIVE",
      assignedAt: now.toISOString(),
    };
    return { registry: upsertRegistryEntry(state, next), entry: next };
  }

  const sequence = getMaxSequenceForYear(state, year) + 1;
  const entry: ElectricalMeasurementRegistryEntry = {
    jobId,
    rapNumber: formatRapNumber(sequence, year),
    year,
    sequence,
    assignedAt: now.toISOString(),
    status: "ACTIVE",
  };
  return { registry: upsertRegistryEntry(state, entry), entry };
}

/** Usunięcie raportu — wpis zostaje, status CANCELLED. */
export function cancelRegistryForJob(
  state: ElectricalMeasurementRegistryState,
  jobId: string,
): ElectricalMeasurementRegistryState {
  const existing = getRegistryEntryForJob(state, jobId);
  if (!existing) return state;
  return upsertRegistryEntry(state, { ...existing, status: "CANCELLED" });
}

/** Migracja — istniejące raporty z numerem RAP → wpisy registry (bez utraty). */
export function migrateRegistryFromMeasurements(
  state: ElectricalMeasurementRegistryState,
  measurements: ElectricalMeasurement[],
): ElectricalMeasurementRegistryState {
  let next = { ...state, entries: [...state.entries] };
  const byJob = new Map<string, ElectricalMeasurement[]>();
  for (const m of measurements) {
    if (isTestMeasurement(m)) continue;
    const parsed = parseRapNumber(m.reportNumber);
    if (!parsed || !m.jobId) continue;
    const list = byJob.get(m.jobId) ?? [];
    list.push(m);
    byJob.set(m.jobId, list);
  }

  for (const [jobId, reports] of byJob) {
    if (getRegistryEntryForJob(next, jobId)) continue;
    const sorted = [...reports].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const primary = sorted[0];
    const parsed = parseRapNumber(primary.reportNumber)!;
    next = upsertRegistryEntry(next, {
      jobId,
      rapNumber: formatRapNumber(parsed.sequence, parsed.year),
      year: parsed.year,
      sequence: parsed.sequence,
      assignedAt: primary.createdAt || new Date().toISOString(),
      status: "ACTIVE",
    });
  }

  return next;
}

export function ensureRegistryWithMigration(
  state: ElectricalMeasurementRegistryState,
  measurements: ElectricalMeasurement[],
): ElectricalMeasurementRegistryState {
  return migrateRegistryFromMeasurements(state, measurements);
}

export function registryNeedsMigrationFromMeasurements(
  state: ElectricalMeasurementRegistryState,
  measurements: ElectricalMeasurement[],
): boolean {
  for (const m of measurements) {
    if (isTestMeasurement(m)) continue;
    if (parseRapNumber(m.reportNumber) && !getRegistryEntryForJob(state, m.jobId)) return true;
  }
  return false;
}

export function registryStatusLabel(status: ElectricalMeasurementRegistryStatus): string {
  return status === "ACTIVE" ? "Aktywny" : "Anulowany";
}

export function jobHasRegistryEntry(
  state: ElectricalMeasurementRegistryState,
  jobId: string,
): boolean {
  return getRegistryEntryForJob(state, jobId) != null;
}

/** Test helper — symulacja resetu rocznego. */
export function allocateFirstRapForYear(
  state: ElectricalMeasurementRegistryState,
  jobId: string,
  year: number,
): { registry: ElectricalMeasurementRegistryState; entry: ElectricalMeasurementRegistryEntry } {
  const sequence = getMaxSequenceForYear(state, year) + 1;
  const entry: ElectricalMeasurementRegistryEntry = {
    jobId,
    rapNumber: formatRapNumber(sequence, year),
    year,
    sequence,
    assignedAt: new Date(`${year}-01-02T12:00:00.000Z`).toISOString(),
    status: "ACTIVE",
  };
  return { registry: upsertRegistryEntry(state, entry), entry };
}
