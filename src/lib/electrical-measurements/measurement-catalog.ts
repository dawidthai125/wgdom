/**
 * EM-P2 — Katalog Pomiarów (lista, filtry, status, INDEX).
 */

import type { Job } from "@/app/app-domain";
import { jobDisplayTitle } from "@/app/app-domain";
import type {
  ElectricalMeasurement,
  ElectricalMeasurementCatalogStatus,
  ElectricalMeasurementRegistryState,
  ElectricalMeasurementRegistryStatus,
} from "@/lib/electrical-measurements/types";
import { getRegistryEntryForJob, parseRapNumber } from "@/lib/electrical-measurements/registry";
import { filterElectricalMeasurementsForJob } from "@/lib/electrical-measurements/merge";
import { isTestMeasurement, parseTestReportNumber } from "@/lib/electrical-measurements/test-report";
import { catalogZipFolderName } from "@/lib/electrical-measurements/measurement-docx-names";

export { catalogZipFolderName };

export interface MeasurementCatalogRow {
  /** Id raportu (measurement.id) lub syntetyczny dla wpisu registry-only. */
  id: string;
  rapNumber: string;
  year: number;
  sequence: number;
  measurementDate: string;
  address: string;
  /** Nazwa / zakres roboty (notes, klient lub id). */
  jobName: string;
  jobTitle: string;
  jobId: string;
  technicianName: string;
  meterModel: string;
  meterSerialNumber: string;
  status: ElectricalMeasurementCatalogStatus;
  /** null = anulowany wpis registry bez raportu. */
  measurement: ElectricalMeasurement | null;
}

export interface MeasurementCatalogFilters {
  year?: string;
  rapQuery?: string;
  addressQuery?: string;
  jobQuery?: string;
  status?: ElectricalMeasurementCatalogStatus | "ALL";
}

export interface RapRegistryRow {
  id: string;
  rapNumber: string;
  year: number;
  sequence: number;
  address: string;
  jobName: string;
  jobId: string;
  status: ElectricalMeasurementRegistryStatus;
  date: string;
}

export interface RapRegistryFilters {
  year?: string;
  rapQuery?: string;
  addressQuery?: string;
  jobQuery?: string;
  status?: ElectricalMeasurementRegistryStatus | "ALL";
}

export const RAP_REGISTRY_STATUS_LABELS: Record<ElectricalMeasurementRegistryStatus, string> = {
  ACTIVE: "AKTYWNY",
  CANCELLED: "ANULOWANY",
};

export const MEASUREMENT_CATALOG_STATUS_LABELS: Record<ElectricalMeasurementCatalogStatus, string> = {
  ACTIVE: "AKTYWNY",
  CANCELLED: "ANULOWANY",
  TEST: "TESTOWY",
};

export function resolveMeasurementCatalogStatus(
  measurement: ElectricalMeasurement | null | undefined,
  registryStatus?: "ACTIVE" | "CANCELLED",
): ElectricalMeasurementCatalogStatus {
  if (isTestMeasurement(measurement ?? undefined)) return "TEST";
  if (!measurement && registryStatus === "CANCELLED") return "CANCELLED";
  if (registryStatus === "CANCELLED") return "CANCELLED";
  if (measurement) return "ACTIVE";
  return "CANCELLED";
}

function jobAddressLine(job: Pick<Job, "address" | "flatNumber"> | undefined): string {
  if (!job) return "—";
  const flat = job.flatNumber ? ` m.${job.flatNumber}` : "";
  return `${job.address || "—"}${flat}`.trim();
}

/** Nazwa roboty do katalogu / rejestru — pierwsza linia notes, potem klient, na końcu id. */
export function jobScopeLabel(job: Pick<Job, "notes" | "client" | "id"> | undefined): string {
  if (!job) return "—";
  const notesLine = job.notes?.trim().split("\n").map((l) => l.trim()).find(Boolean);
  if (notesLine) return notesLine;
  const client = job.client?.trim();
  if (client) return client;
  return job.id;
}

/** Wyszukiwanie RAP: 45, RAP-45, RAP-45-2026. */
export function matchesRapSearchQuery(
  rapNumber: string,
  sequence: number,
  year: number,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const rapLower = rapNumber.toLowerCase();
  if (rapLower.includes(q)) return true;
  const normalized = q.replace(/^rap-?/i, "");
  if (normalized && rapLower.includes(normalized)) return true;
  if (/^\d+$/.test(q) && String(sequence).includes(q)) return true;
  if (/^\d{4}$/.test(q) && String(year) === q) return true;
  const seqYear = `${sequence}-${year}`;
  if (q.includes("-") && seqYear.includes(q.replace(/^rap-?/i, ""))) return true;
  return false;
}

function compareCatalogRows(a: MeasurementCatalogRow, b: MeasurementCatalogRow): number {
  if (a.year !== b.year) return b.year - a.year;
  if (a.sequence !== b.sequence) return b.sequence - a.sequence;
  return b.measurementDate.localeCompare(a.measurementDate);
}

export function buildMeasurementCatalogRows(
  measurements: ElectricalMeasurement[],
  registry: ElectricalMeasurementRegistryState,
  jobs: Pick<Job, "id" | "address" | "flatNumber" | "notes" | "client">[],
): MeasurementCatalogRow[] {
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const measurementByJobId = new Map<string, ElectricalMeasurement>();
  for (const m of measurements) {
    if (!measurementByJobId.has(m.jobId)) measurementByJobId.set(m.jobId, m);
  }

  const rows: MeasurementCatalogRow[] = [];
  const seenJobIds = new Set<string>();

  for (const m of measurements) {
    const job = jobById.get(m.jobId);
    const reg = getRegistryEntryForJob(registry, m.jobId);
    const parsed = parseRapNumber(m.reportNumber);
    const testParsed = parseTestReportNumber(m.reportNumber);
    rows.push({
      id: m.id,
      rapNumber: m.reportNumber,
      year: parsed?.year ?? (testParsed ? new Date(m.measurementDate).getFullYear() : new Date(m.measurementDate).getFullYear()),
      sequence: parsed?.sequence ?? testParsed?.sequence ?? 0,
      measurementDate: m.measurementDate,
      address: jobAddressLine(job),
      jobName: jobScopeLabel(job),
      jobTitle: job ? jobDisplayTitle(job as Job) : m.jobId,
      jobId: m.jobId,
      technicianName: m.technicianName,
      meterModel: m.meterModel,
      meterSerialNumber: m.meterSerialNumber,
      status: resolveMeasurementCatalogStatus(m, reg?.status),
      measurement: m,
    });
    seenJobIds.add(m.jobId);
  }

  for (const entry of registry.entries) {
    if (seenJobIds.has(entry.jobId)) continue;
    if (entry.status !== "CANCELLED") continue;
    const job = jobById.get(entry.jobId);
    rows.push({
      id: `registry-${entry.jobId}`,
      rapNumber: entry.rapNumber,
      year: entry.year,
      sequence: entry.sequence,
      measurementDate: entry.assignedAt.slice(0, 10),
      address: jobAddressLine(job),
      jobName: jobScopeLabel(job),
      jobTitle: job ? jobDisplayTitle(job as Job) : entry.jobId,
      jobId: entry.jobId,
      technicianName: "—",
      meterModel: "—",
      meterSerialNumber: "—",
      status: "CANCELLED",
      measurement: null,
    });
  }

  return rows.sort(compareCatalogRows);
}

export function filterMeasurementCatalogRows(
  rows: MeasurementCatalogRow[],
  filters: MeasurementCatalogFilters,
): MeasurementCatalogRow[] {
  const year = filters.year?.trim();
  const rapQ = filters.rapQuery?.trim();
  const addrQ = filters.addressQuery?.trim().toLowerCase();
  const jobQ = filters.jobQuery?.trim().toLowerCase();
  const status = filters.status ?? "ALL";

  return rows.filter((row) => {
    if (year && String(row.year) !== year) return false;
    if (rapQ && !matchesRapSearchQuery(row.rapNumber, row.sequence, row.year, rapQ)) return false;
    if (addrQ && !row.address.toLowerCase().includes(addrQ)) return false;
    if (
      jobQ &&
      !row.jobName.toLowerCase().includes(jobQ) &&
      !row.jobId.toLowerCase().includes(jobQ) &&
      !row.jobTitle.toLowerCase().includes(jobQ)
    ) {
      return false;
    }
    if (status !== "ALL" && row.status !== status) return false;
    return true;
  });
}

function compareRapRegistryRows(a: RapRegistryRow, b: RapRegistryRow): number {
  if (a.year !== b.year) return b.year - a.year;
  if (a.sequence !== b.sequence) return b.sequence - a.sequence;
  return b.date.localeCompare(a.date);
}

/** SSOT rejestru RAP — wyłącznie wpisy kw-electrical-measurement-registry. */
export function buildRapRegistryRows(
  registry: ElectricalMeasurementRegistryState,
  measurements: ElectricalMeasurement[],
  jobs: Pick<Job, "id" | "address" | "flatNumber" | "notes" | "client">[],
): RapRegistryRow[] {
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const measurementByJobId = new Map<string, ElectricalMeasurement>();
  for (const m of measurements) {
    if (isTestMeasurement(m)) continue;
    if (!measurementByJobId.has(m.jobId)) measurementByJobId.set(m.jobId, m);
  }

  const rows: RapRegistryRow[] = registry.entries.map((entry) => {
    const job = jobById.get(entry.jobId);
    const measurement = measurementByJobId.get(entry.jobId);
    return {
      id: entry.jobId,
      rapNumber: entry.rapNumber,
      year: entry.year,
      sequence: entry.sequence,
      address: jobAddressLine(job),
      jobName: jobScopeLabel(job),
      jobId: entry.jobId,
      status: entry.status,
      date: measurement?.measurementDate ?? entry.assignedAt.slice(0, 10),
    };
  });

  return rows.sort(compareRapRegistryRows);
}

export function filterRapRegistryRows(rows: RapRegistryRow[], filters: RapRegistryFilters): RapRegistryRow[] {
  const year = filters.year?.trim();
  const rapQ = filters.rapQuery?.trim();
  const addrQ = filters.addressQuery?.trim().toLowerCase();
  const jobQ = filters.jobQuery?.trim().toLowerCase();
  const status = filters.status ?? "ALL";

  return rows.filter((row) => {
    if (year && String(row.year) !== year) return false;
    if (rapQ && !matchesRapSearchQuery(row.rapNumber, row.sequence, row.year, rapQ)) return false;
    if (addrQ && !row.address.toLowerCase().includes(addrQ)) return false;
    if (
      jobQ &&
      !row.jobName.toLowerCase().includes(jobQ) &&
      !row.jobId.toLowerCase().includes(jobQ)
    ) {
      return false;
    }
    if (status !== "ALL" && row.status !== status) return false;
    return true;
  });
}

export function rapRegistryAvailableYears(rows: RapRegistryRow[]): number[] {
  const years = new Set<number>();
  for (const r of rows) years.add(r.year);
  return [...years].sort((a, b) => b - a);
}

/**
 * EM-P3 — aktywny raport produkcyjny roboty (bez TEST-RAP, bez ANULOWANY registry).
 * SSOT lookup dla ZIP odbiorowego WM Druk.
 */
export function getProductionMeasurementForJob(
  measurements: ElectricalMeasurement[],
  registry: ElectricalMeasurementRegistryState,
  jobId: string,
): ElectricalMeasurement | null {
  if (!jobId) return null;
  const reg = getRegistryEntryForJob(registry, jobId);
  if (reg?.status === "CANCELLED") return null;

  for (const m of filterElectricalMeasurementsForJob(measurements, jobId)) {
    if (isTestMeasurement(m)) continue;
    if (!parseRapNumber(m.reportNumber)) continue;
    return m;
  }
  return null;
}

export function hasActiveProductionMeasurementForJob(
  measurements: ElectricalMeasurement[],
  registry: ElectricalMeasurementRegistryState,
  jobId: string,
): boolean {
  return getProductionMeasurementForJob(measurements, registry, jobId) != null;
}

export function catalogAvailableYears(rows: MeasurementCatalogRow[]): number[] {
  const years = new Set<number>();
  for (const r of rows) years.add(r.year);
  return [...years].sort((a, b) => b - a);
}

/** INDEX.txt — linia katalogu. */
export function catalogIndexLine(row: Pick<MeasurementCatalogRow, "rapNumber" | "address" | "measurementDate">): string {
  return `${row.rapNumber} | ${row.address} | ${row.measurementDate}`;
}

export function buildCatalogIndexTxt(rows: MeasurementCatalogRow[]): string {
  const sorted = [...rows].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.sequence - a.sequence;
  });
  return sorted.map(catalogIndexLine).join("\n") + (sorted.length ? "\n" : "");
}

export function catalogRowsWithDocuments(rows: MeasurementCatalogRow[]): MeasurementCatalogRow[] {
  return rows.filter((r) => r.measurement != null && r.status !== "CANCELLED");
}
