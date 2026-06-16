import { CIRCUIT_TYPE_LABELS } from "@/lib/electrical-measurements/types";
import type { CircuitType, ElectricalMeasurement, SupplyType } from "@/lib/electrical-measurements/types";
import { EM_DOCUMENT_COUNT } from "@/lib/electrical-measurements/types";

export interface ElectricalMeasurementPreviewSummary {
  documentCount: number;
  circuitCount: number;
  rcdCount: number;
}

export interface ElectricalMeasurementPreviewBundle {
  summary: ElectricalMeasurementPreviewSummary;
  adscLines: string[];
  resistanceLines: string[];
  rcdLines: string[];
}

const ADSC_LABELS: Record<CircuitType, string> = {
  "socket-1f": "Obwód gniazd 230V",
  "lighting-1f": "Oświetlenie 230V",
  "socket-3f": "Obwód gniazd 400V",
};

function supplyResistanceLabel(supplyType: SupplyType): string {
  return supplyType === "ydy-5x4" ? "Obwód YDY 5x4mm²" : "Obwód YDY 3x4mm²";
}

function circuitResistanceLabel(type: CircuitType, supplyType: SupplyType): string {
  if (type === "lighting-1f") return "Obwód Oświetlenia YDY 3x1,5mm²";
  if (type === "socket-3f") return "Obwód Gniazd YDY 5x2,5mm²";
  if (supplyType === "ydy-5x4") return "Obwód Gniazd YDY 5x2,5mm²";
  return "Obwód Gniazd YDY 3x2,5mm²";
}

export function buildAdscPreviewLines(measurement: ElectricalMeasurement): string[] {
  const lines: string[] = ["1. Zasilanie"];
  let lp = 2;
  for (const c of measurement.circuits) {
    lines.push(`${lp}. ${ADSC_LABELS[c.type]}`);
    lp++;
  }
  return lines;
}

export function buildResistancePreviewLines(measurement: ElectricalMeasurement): string[] {
  const lines: string[] = [supplyResistanceLabel(measurement.supplyType)];
  for (const c of measurement.circuits) {
    lines.push(circuitResistanceLabel(c.type, measurement.supplyType));
  }
  return lines;
}

export function buildRcdPreviewLines(measurement: ElectricalMeasurement): string[] {
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

export function buildElectricalMeasurementPreview(
  measurement: ElectricalMeasurement,
): ElectricalMeasurementPreviewBundle {
  return {
    summary: buildElectricalMeasurementPreviewSummary(measurement),
    adscLines: buildAdscPreviewLines(measurement),
    resistanceLines: buildResistancePreviewLines(measurement),
    rcdLines: buildRcdPreviewLines(measurement),
  };
}

/** Etykieta obwodu do listy UI (debug). */
export function circuitTypeShortLabel(type: CircuitType): string {
  return CIRCUIT_TYPE_LABELS[type];
}
