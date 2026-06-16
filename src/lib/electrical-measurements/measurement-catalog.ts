/**
 * EM-P2 — Katalog Pomiarów (lista, filtry, status, INDEX).
 */

import type { Job } from "@/app/app-domain";
import { jobDisplayTitle } from "@/app/app-domain";
import type {
  ElectricalMeasurement,
  ElectricalMeasurementCatalogStatus,
  ElectricalMeasurementRegistryState,
} from "@/lib/electrical-measurements/types";
import { getRegistryEntryForJob, parseRapNumber } from "@/lib/electrical-measurements/registry";

export interface MeasurementCatalogRow {
  /** Id raportu (measurement.id) lub syntetyczny dla wpisu registry-only. */
  id: string;
  rapNumber: string;
  year: number;
  sequence: number;
  measurementDate: string;
  address: string;
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
  status?: ElectricalMeasurementCatalogStatus | "ALL";
}

export const MEASUREMENT_CATALOG_STATUS_LABELS: Record<ElectricalMeasurementCatalogStatus, string> = {
  ACTIVE: "AKTYWNY",
  CANCELLED: "ANULOWANY",
  TEST: "TESTOWY",
};

export function resolveMeasurementCatalogStatus(
  measurement: ElectricalMeasurement | null | undefined,
  registryStatus?: "ACTIVE" | "CANCELLED",
): ElectricalMeasurementCatalogStatus {
  if (measurement?.flags?.test) return "TEST";
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

function compareCatalogRows(a: MeasurementCatalogRow, b: MeasurementCatalogRow): number {
  if (a.year !== b.year) return b.year - a.year;
  if (a.sequence !== b.sequence) return b.sequence - a.sequence;
  return b.measurementDate.localeCompare(a.measurementDate);
}

/** SSOT listy katalogu — raporty + anulowane wpisy registry bez raportu. */
export function buildMeasurementCatalogRows(
  measurements: ElectricalMeasurement[],
  registry: ElectricalMeasurementRegistryState,
  jobs: Pick<Job, "id" | "address" | "flatNumber">[],
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
    rows.push({
      id: m.id,
      rapNumber: m.reportNumber,
      year: parsed?.year ?? new Date(m.measurementDate).getFullYear(),
      sequence: parsed?.sequence ?? 0,
      measurementDate: m.measurementDate,
      address: jobAddressLine(job),
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
  const rapQ = filters.rapQuery?.trim().toLowerCase();
  const addrQ = filters.addressQuery?.trim().toLowerCase();
  const status = filters.status ?? "ALL";

  return rows.filter((row) => {
    if (year && String(row.year) !== year) return false;
    if (rapQ && !row.rapNumber.toLowerCase().includes(rapQ)) return false;
    if (addrQ && !row.address.toLowerCase().includes(addrQ) && !row.jobTitle.toLowerCase().includes(addrQ)) {
      return false;
    }
    if (status !== "ALL" && row.status !== status) return false;
    return true;
  });
}

export function catalogAvailableYears(rows: MeasurementCatalogRow[]): number[] {
  const years = new Set<number>();
  for (const r of rows) years.add(r.year);
  return [...years].sort((a, b) => b - a);
}

/** Nazwa folderu w archiwum ZIP: RAP-45-2026_Kleczkowska_26_m3 */
export function catalogZipFolderName(rapNumber: string, address: string): string {
  const rap = String(rapNumber || "RAP")
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const addr = String(address || "adres")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return `${rap}_${addr || "adres"}`;
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
