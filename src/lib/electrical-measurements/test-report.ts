/**
 * EM-P2.5 — raporty testowe (TEST-RAP-NNN), izolacja od registry RAP.
 */

import type { ElectricalMeasurement } from "@/lib/electrical-measurements/types";
import {
  createEmptyElectricalMeasurement,
  touchElectricalMeasurement,
} from "@/lib/electrical-measurements/report";
import type { ElectricalMeasurementSettings } from "@/lib/electrical-measurements/types";

const TEST_RAP_RE = /^TEST-RAP-(\d+)$/i;

export function isTestReportNumber(reportNumber: string): boolean {
  return TEST_RAP_RE.test(String(reportNumber ?? "").trim());
}

export function parseTestReportNumber(reportNumber: string): { sequence: number } | null {
  const m = String(reportNumber ?? "").trim().match(TEST_RAP_RE);
  if (!m) return null;
  const sequence = parseInt(m[1], 10);
  if (!Number.isFinite(sequence) || sequence < 1) return null;
  return { sequence };
}

export function formatTestReportNumber(sequence: number): string {
  return `TEST-RAP-${String(Math.max(1, Math.floor(sequence))).padStart(3, "0")}`;
}

export function isTestMeasurement(
  m: Pick<ElectricalMeasurement, "flags" | "reportNumber"> | null | undefined,
): boolean {
  if (!m) return false;
  if (m.flags?.test === true) return true;
  return isTestReportNumber(m.reportNumber);
}

export function getMaxTestReportSequence(measurements: ElectricalMeasurement[]): number {
  let max = 0;
  for (const m of measurements) {
    const parsed = parseTestReportNumber(m.reportNumber);
    if (parsed && parsed.sequence > max) max = parsed.sequence;
  }
  return max;
}

export function allocateNextTestReportNumber(measurements: ElectricalMeasurement[]): string {
  return formatTestReportNumber(getMaxTestReportSequence(measurements) + 1);
}

export function createTestElectricalMeasurement(
  jobId: string,
  allMeasurements: ElectricalMeasurement[],
  settings?: Pick<ElectricalMeasurementSettings, "technicianName" | "meterModel" | "meterSerialNumber">,
): ElectricalMeasurement {
  const reportNumber = allocateNextTestReportNumber(allMeasurements);
  const base = createEmptyElectricalMeasurement(jobId.trim(), reportNumber, settings);
  return touchElectricalMeasurement(base, { flags: { test: true } });
}

export function filterProductionMeasurements(measurements: ElectricalMeasurement[]): ElectricalMeasurement[] {
  return measurements.filter((m) => !isTestMeasurement(m));
}

export function filterTestMeasurements(measurements: ElectricalMeasurement[]): ElectricalMeasurement[] {
  return measurements.filter((m) => isTestMeasurement(m));
}

export function jobHasProductionMeasurement(
  measurements: ElectricalMeasurement[],
  jobId: string,
): boolean {
  return measurements.some((m) => m.jobId === jobId && !isTestMeasurement(m));
}
