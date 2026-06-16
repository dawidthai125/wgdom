import type { CircuitType, ElectricalMeasurement, SupplyType } from "@/lib/electrical-measurements/types";
import { EM_DOCUMENT_COUNT } from "@/lib/electrical-measurements/types";

export interface ElectricalMeasurementPreviewSummary {
  documentCount: number;
  circuitCount: number;
  rcdCount: number;
}

export interface JobElectricalMeasurementsSummary {
  reportCount: number;
  circuitCount: number;
  rcdCount: number;
}

export interface ElectricalMeasurementPreviewBundle {
  summary: ElectricalMeasurementPreviewSummary;
  adsc: string[];
  resistance: string[];
  rcd: string[];
}

function sortedCircuits(measurement: ElectricalMeasurement) {
  return [...measurement.circuits].sort((a, b) => a.sortOrder - b.sortOrder);
}

function supplyResistanceLabel(supplyType: SupplyType): string {
  return supplyType === "ydy-5x4" ? "Obwód YDY 5x4mm²" : "Obwód YDY 3x4mm²";
}

function circuitResistanceLabel(type: CircuitType, supplyType: SupplyType): string {
  if (type === "lighting-1f") return "Obwód Oświetlenia YDY 3x1,5mm²";
  if (type === "socket-3f") return "Obwód Gniazd YDY 5x2,5mm²";
  if (supplyType === "ydy-5x4") return "Obwód Gniazd YDY 5x2,5mm²";
  return "Obwód Gniazd YDY 3x2,5mm²";
}

/** SSOT — ochrona przed porażeniem (ADSC). UI + EM-P1 DOCX. */
export function buildAdscPreview(measurement: ElectricalMeasurement): string[] {
  const lines: string[] = ["1. Zasilanie"];
  for (const c of sortedCircuits(measurement)) {
    lines.push(`${c.sortOrder}. ${c.displayName}`);
  }
  return lines;
}

/** SSOT — rezystancja obwodów. UI + EM-P1 DOCX. */
export function buildResistancePreview(measurement: ElectricalMeasurement): string[] {
  const lines: string[] = [supplyResistanceLabel(measurement.supplyType)];
  for (const c of sortedCircuits(measurement)) {
    lines.push(circuitResistanceLabel(c.type, measurement.supplyType));
  }
  return lines;
}

/** SSOT — parametry RCD. UI + EM-P1 DOCX. */
export function buildRcdPreview(measurement: ElectricalMeasurement): string[] {
  return measurement.rcds.map((r) => `${r.symbol} → ${r.deviceType}`);
}

export function buildElectricalMeasurementPreviewSummary(
  measurement: ElectricalMeasurement,
): ElectricalMeasurementPreviewSummary {
  return {
    documentCount: EM_DOCUMENT_COUNT,
    circuitCount: measurement.circuits.length,
    rcdCount: measurement.rcds.length,
  };
}

/** Podsumowanie job — widoczne w panelu nawet przy zwiniętej liście raportów. */
export function buildJobElectricalMeasurementsSummary(
  reports: ElectricalMeasurement[],
): JobElectricalMeasurementsSummary {
  return {
    reportCount: reports.length,
    circuitCount: reports.reduce((sum, r) => sum + r.circuits.length, 0),
    rcdCount: reports.reduce((sum, r) => sum + r.rcds.length, 0),
  };
}

export function buildElectricalMeasurementPreview(
  measurement: ElectricalMeasurement,
): ElectricalMeasurementPreviewBundle {
  return {
    summary: buildElectricalMeasurementPreviewSummary(measurement),
    adsc: buildAdscPreview(measurement),
    resistance: buildResistancePreview(measurement),
    rcd: buildRcdPreview(measurement),
  };
}
