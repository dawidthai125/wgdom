/**
 * EM-P1.6 — trwały rejestr numerów RAP (1 numer ↔ 1 jobId, bez zwrotu do puli).
 */

import type {
  ElectricalMeasurement,
  ElectricalMeasurementRegistryEntry,
  ElectricalMeasurementRegistryStatus,
} from "@/lib/electrical-measurements/types";

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

export function normalizeElectricalMeasurementRegistry(
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

export function mergeElectricalMeasurementRegistry(
  local: unknown,
  cloud: unknown,
): ElectricalMeasurementRegistryEntry[] {
  const byJobId = new Map<string, ElectricalMeasurementRegistryEntry>();
  for (const e of [
    ...normalizeElectricalMeasurementRegistry(local),
    ...normalizeElectricalMeasurementRegistry(cloud),
  ]) {
    const prev = byJobId.get(e.jobId);
    if (!prev || e.assignedAt >= prev.assignedAt) byJobId.set(e.jobId, e);
  }
  return [...byJobId.values()].sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
}

export function getRegistryEntryForJob(
  registry: ElectricalMeasurementRegistryEntry[],
  jobId: string,
): ElectricalMeasurementRegistryEntry | undefined {
  if (!jobId) return undefined;
  return registry.find((e) => e.jobId === jobId);
}

export function getMaxSequenceForYear(
  registry: ElectricalMeasurementRegistryEntry[],
  year: number,
): number {
  let max = 0;
  for (const e of registry) {
    if (e.year === year && e.sequence > max) max = e.sequence;
  }
  return max;
}

function upsertRegistryEntry(
  registry: ElectricalMeasurementRegistryEntry[],
  entry: ElectricalMeasurementRegistryEntry,
): ElectricalMeasurementRegistryEntry[] {
  const rest = registry.filter((e) => e.jobId !== entry.jobId);
  return [entry, ...rest];
}

/** Przydziel lub odtwórz numer RAP dla roboty (nigdy nowy numer jeśli wpis już istnieje). */
export function assignRapForJob(
  registry: ElectricalMeasurementRegistryEntry[],
  jobId: string,
  options?: { now?: Date },
): { registry: ElectricalMeasurementRegistryEntry[]; entry: ElectricalMeasurementRegistryEntry } {
  const now = options?.now ?? new Date();
  const year = now.getFullYear();
  const existing = getRegistryEntryForJob(registry, jobId);

  if (existing) {
    const next: ElectricalMeasurementRegistryEntry = {
      ...existing,
      status: "ACTIVE",
      assignedAt: now.toISOString(),
    };
    return { registry: upsertRegistryEntry(registry, next), entry: next };
  }

  const sequence = getMaxSequenceForYear(registry, year) + 1;
  const entry: ElectricalMeasurementRegistryEntry = {
    jobId,
    rapNumber: formatRapNumber(sequence, year),
    year,
    sequence,
    assignedAt: now.toISOString(),
    status: "ACTIVE",
  };
  return { registry: upsertRegistryEntry(registry, entry), entry };
}

/** Usunięcie raportu — wpis zostaje, status CANCELLED. */
export function cancelRegistryForJob(
  registry: ElectricalMeasurementRegistryEntry[],
  jobId: string,
): ElectricalMeasurementRegistryEntry[] {
  const existing = getRegistryEntryForJob(registry, jobId);
  if (!existing) return registry;
  return upsertRegistryEntry(registry, { ...existing, status: "CANCELLED" });
}

/** Migracja — istniejące raporty z numerem RAP → wpisy registry (bez utraty). */
export function migrateRegistryFromMeasurements(
  registry: ElectricalMeasurementRegistryEntry[],
  measurements: ElectricalMeasurement[],
): ElectricalMeasurementRegistryEntry[] {
  let next = [...registry];
  const byJob = new Map<string, ElectricalMeasurement[]>();
  for (const m of measurements) {
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
  registry: ElectricalMeasurementRegistryEntry[],
  measurements: ElectricalMeasurement[],
): ElectricalMeasurementRegistryEntry[] {
  return migrateRegistryFromMeasurements(registry, measurements);
}

export function registryNeedsMigrationFromMeasurements(
  registry: ElectricalMeasurementRegistryEntry[],
  measurements: ElectricalMeasurement[],
): boolean {
  for (const m of measurements) {
    if (parseRapNumber(m.reportNumber) && !getRegistryEntryForJob(registry, m.jobId)) return true;
  }
  return false;
}

export function registryStatusLabel(status: ElectricalMeasurementRegistryStatus): string {
  return status === "ACTIVE" ? "Aktywny" : "Anulowany";
}

/** Czy roboty wolno przydzielić nowy numer (vs. tylko odtworzenie istniejącego). */
export function jobHasRegistryEntry(
  registry: ElectricalMeasurementRegistryEntry[],
  jobId: string,
): boolean {
  return getRegistryEntryForJob(registry, jobId) != null;
}

/** Test helper — symulacja resetu rocznego. */
export function allocateFirstRapForYear(
  registry: ElectricalMeasurementRegistryEntry[],
  jobId: string,
  year: number,
): { registry: ElectricalMeasurementRegistryEntry[]; entry: ElectricalMeasurementRegistryEntry } {
  const sequence = getMaxSequenceForYear(registry, year) + 1;
  const entry: ElectricalMeasurementRegistryEntry = {
    jobId,
    rapNumber: formatRapNumber(sequence, year),
    year,
    sequence,
    assignedAt: new Date(`${year}-01-02T12:00:00.000Z`).toISOString(),
    status: "ACTIVE",
  };
  return { registry: upsertRegistryEntry(registry, entry), entry };
}
