import type { CircuitType, ElectricalMeasurement, SupplyType } from "@/lib/electrical-measurements/types";
import { EM_DOCUMENT_COUNT } from "@/lib/electrical-measurements/types";
import {
  resolveAdscCircuitValues,
  resolveAdscSupplyValues,
  resolveRcdValues,
  resolveResistanceCircuitValues,
  resolveResistanceSupplyValues,
} from "@/lib/electrical-measurements/measurement-value-engine";

export interface ElectricalMeasurementPreviewSummary {
  documentCount: number;
  circuitCount: number;
  rcdCount: number;
  hasGeneratedValues: boolean;
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

function formatAdscLine(label: string, zs: string, za: string, inA: string, ia: string): string {
  return `${label} — Zs=${zs} Ω, Za=${za} Ω, I=${inA} A, Ia=${ia} A`;
}

function formatResistanceLine(label: string, ra: string, l1n: string): string {
  const parts = [`Ra=${ra} MΩ`];
  if (l1n) parts.push(`L1-N=${l1n} MΩ`);
  return `${label} — ${parts.join(", ")}`;
}

function formatRcdLine(symbol: string, deviceType: string, rs: string): string {
  return `${symbol} → ${deviceType} — Rs=${rs} Ω`;
}

/** SSOT preview — tylko zapisane wartości (resolve, bez losowania). */
export function buildAdscPreview(measurement: ElectricalMeasurement): string[] {
  const supply = resolveAdscSupplyValues(measurement);
  const lines: string[] = [
    formatAdscLine("1. Zasilanie", supply.zs, supply.za, supply.inAmps, supply.iaAmps),
  ];
  for (const c of sortedCircuits(measurement)) {
    const v = resolveAdscCircuitValues(measurement, c);
    lines.push(formatAdscLine(`${c.sortOrder}. ${c.displayName}`, v.zs, v.za, v.inAmps, v.iaAmps));
  }
  return lines;
}

export function buildResistancePreview(measurement: ElectricalMeasurement): string[] {
  const supplyLabel = supplyResistanceLabel(measurement.supplyType);
  const supply = resolveResistanceSupplyValues(measurement);
  const lines: string[] = [formatResistanceLine(supplyLabel, supply.ra, supply.l1n)];

  for (const c of sortedCircuits(measurement)) {
    const label = circuitResistanceLabel(c.type, measurement.supplyType);
    const v = resolveResistanceCircuitValues(measurement, c);
    lines.push(formatResistanceLine(label, v.ra, v.l1n));
  }
  return lines;
}

export function buildRcdPreview(measurement: ElectricalMeasurement): string[] {
  return measurement.rcds.map((r) => {
    const v = resolveRcdValues(measurement, r);
    return formatRcdLine(r.symbol, r.deviceType, v.rs);
  });
}

export function buildElectricalMeasurementPreviewSummary(
  measurement: ElectricalMeasurement,
): ElectricalMeasurementPreviewSummary {
  return {
    documentCount: EM_DOCUMENT_COUNT,
    circuitCount: measurement.circuits.length,
    rcdCount: measurement.rcds.length,
    hasGeneratedValues: measurement.valueSet != null,
  };
}

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

/** Etykiety wierszy rezystancji (DOCX ROW_CIRCUIT_NAME) — bez wartości. */
export function resistanceRowLabels(measurement: ElectricalMeasurement): string[] {
  const lines: string[] = [supplyResistanceLabel(measurement.supplyType)];
  for (const c of sortedCircuits(measurement)) {
    lines.push(circuitResistanceLabel(c.type, measurement.supplyType));
  }
  return lines;
}
