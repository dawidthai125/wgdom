/**
 * EM-UX-002 — powiązanie raportu RAP z robotą vs samodzielny pomiar.
 */

import type { Job } from "@/app/app-domain";
import { jobDisplayTitle } from "@/app/app-domain";
import type { ElectricalMeasurement } from "@/lib/electrical-measurements/types";
import { isTestMeasurement } from "@/lib/electrical-measurements/test-report";

export type ElectricalMeasurementLinkStatus = "linked" | "detached";

/** Alias historyczny / spec — traktowany jak detached. */
export type ElectricalMeasurementLinkStatusInput = ElectricalMeasurementLinkStatus | "manual";

export function normalizeMeasurementLinkStatus(
  raw: unknown,
): ElectricalMeasurementLinkStatus | undefined {
  if (raw === "linked" || raw === "detached" || raw === "manual") {
    return raw === "manual" ? "detached" : raw;
  }
  return undefined;
}

export function isDetachedMeasurement(
  m: Pick<ElectricalMeasurement, "linkStatus" | "jobId" | "flags" | "reportNumber"> | null | undefined,
): boolean {
  if (!m || isTestMeasurement(m)) return false;
  if (m.linkStatus === "detached") return true;
  return !String(m.jobId ?? "").trim();
}

export function isLinkedMeasurement(
  m: Pick<ElectricalMeasurement, "linkStatus" | "jobId" | "flags" | "reportNumber"> | null | undefined,
): boolean {
  if (!m || isTestMeasurement(m)) return false;
  return !isDetachedMeasurement(m) && Boolean(String(m.jobId ?? "").trim());
}

/** Klucz rejestru RAP — jobId (powiązany) lub measurement.id (samodzielny). */
export function getMeasurementRegistryKey(
  m: Pick<ElectricalMeasurement, "id" | "jobId" | "linkStatus" | "flags" | "reportNumber">,
): string {
  if (isTestMeasurement(m)) return "";
  if (isDetachedMeasurement(m)) return m.id;
  return String(m.jobId ?? "").trim();
}

export function measurementAddressLine(
  m: Pick<ElectricalMeasurement, "manualAddress" | "manualFlatNumber">,
): string {
  const addr = String(m.manualAddress ?? "").trim() || "—";
  const flat = String(m.manualFlatNumber ?? "").trim();
  return flat ? `${addr} m.${flat}` : addr;
}

export function resolveMeasurementExportJob(
  measurement: ElectricalMeasurement,
  jobs: Pick<Job, "id" | "address" | "flatNumber">[] = [],
): Pick<Job, "id" | "address" | "flatNumber"> {
  if (isDetachedMeasurement(measurement)) {
    return {
      id: measurement.id,
      address: measurement.manualAddress ?? "",
      flatNumber: measurement.manualFlatNumber ?? "",
    };
  }
  const job = jobs.find((j) => j.id === measurement.jobId);
  if (job) return { id: job.id, address: job.address, flatNumber: job.flatNumber };
  return {
    id: measurement.jobId,
    address: "",
    flatNumber: "",
  };
}

export function measurementCatalogTitle(
  measurement: ElectricalMeasurement,
  job: Pick<Job, "address" | "flatNumber"> | undefined,
): string {
  if (isDetachedMeasurement(measurement)) return measurementAddressLine(measurement);
  if (job) return jobDisplayTitle(job as Job);
  return measurement.jobId || "—";
}

export function measurementCatalogScopeLabel(
  measurement: ElectricalMeasurement,
  job: Pick<Job, "notes" | "client" | "id"> | undefined,
  jobScopeLabelFn: (j: Pick<Job, "notes" | "client" | "id"> | undefined) => string,
): string {
  if (isDetachedMeasurement(measurement)) return "Samodzielny pomiar";
  return jobScopeLabelFn(job);
}
