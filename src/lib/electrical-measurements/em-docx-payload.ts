import { jobDisplayTitle } from "@/app/app-domain";
import type { Job } from "@/app/app-domain";
import type { EmDocxRowCloneSpec } from "@/lib/electrical-measurements/em-docx-xml";
import {
  buildAdscPreview,
  buildResistancePreview,
  buildRcdPreview,
} from "@/lib/electrical-measurements/preview";
import type {
  CircuitType,
  ElectricalMeasurement,
  ElectricalMeasurementCircuit,
} from "@/lib/electrical-measurements/types";
export interface EmDocxGeneratorOptions {
  defaults?: {
    technicianName?: string;
    meterModel?: string;
    meterSerialNumber?: string;
  };
}

/** EM-P1B — payload generatora DOCX (SSOT między preview a szablonami). */
export interface ElectricalMeasurementDocxPayload {
  scalars: Record<string, string>;
  rowSpecs: EmDocxRowCloneSpec[];
}

const DEFAULT_EXECUTOR = "W&G DOM";
const DEFAULT_TECHNICIAN_LICENSE = "E/516/374/22, D/517/374/22";
const DEFAULT_EARTHING = "TN-S";
const DEFAULT_MEASUREMENT_CAUSE = "instalacja istniejąca";
const DEFAULT_VERDICT =
  "INSTALACJA SPEŁNIA WYMAGANE NORMY I PARAMETRY NADAJE SIĘ DO UŻYTKOWANIA";
const DEFAULT_INSPECTIONS = [
  "WŁAŚCIWY",
  "WŁAŚCIWY",
  "WŁAŚCIWE",
  "POPRAWNE",
  "WŁAŚCIWE",
  "TAK",
  "ZAPEWNIONY",
];

function sortedCircuits(measurement: ElectricalMeasurement) {
  return [...measurement.circuits].sort((a, b) => a.sortOrder - b.sortOrder);
}

function formatPlDate(iso: string): string {
  const d = iso?.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return iso || "";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}r.`;
}

function formatPlDateSpaced(iso: string): string {
  const d = iso?.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return iso || "";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y} r.`;
}

function addYearsIso(iso: string, years: number): string {
  const d = iso?.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "";
  const y = parseInt(d.slice(0, 4), 10) + years;
  return formatPlDate(`${y}${d.slice(4)}`);
}

function circuitInAmps(type: CircuitType): string {
  if (type === "lighting-1f") return "10";
  return "16";
}

function circuitIaAmps(breakerType: string, type: CircuitType): string {
  if (breakerType === "C") return "250";
  return type === "lighting-1f" ? "50" : "80";
}

function circuitZaOhm(type: CircuitType): string {
  return type === "lighting-1f" ? "4,88" : "2,88";
}

function defaultRcdCircuitName(measurement: ElectricalMeasurement): string {
  const circuits = sortedCircuits(measurement);
  if (circuits.length === 0) return "Obwody gniazd";
  const names = [...new Set(circuits.map((c) => c.displayName))];
  return names.length === 1 ? names[0] : "Obwody gniazd";
}

function resistanceDefaults() {
  return {
    ROW_L1L2: "",
    ROW_L2L3: "",
    ROW_L1L3: "",
    ROW_L1L2_ALT: "",
    ROW_L1PE: ">50",
    ROW_L2PE: "",
    ROW_L3PE: "",
    ROW_L1N: ">50",
    ROW_L2N: "",
    ROW_L3N: "",
    ROW_NPE: ">50",
    ROW_RA: ">50",
    ROW_U_ISO: "500",
    ROW_ASSESSMENT: "Pozytywna",
  };
}

function buildBaseScalars(
  measurement: ElectricalMeasurement,
  job: Pick<Job, "address" | "flatNumber">,
  options?: EmDocxGeneratorOptions,
): Record<string, string> {
  const datePl = formatPlDate(measurement.measurementDate);
  const scalars: Record<string, string> = {
    RAP_NO: measurement.reportNumber.trim() || "RAP-00-0000",
    EXECUTOR: DEFAULT_EXECUTOR,
    MEASUREMENT_DATE: datePl,
    PROTOCOL_DATE: formatPlDateSpaced(measurement.measurementDate),
    NEXT_MEASUREMENT_DATE: addYearsIso(measurement.measurementDate, 5),
    TECHNICIAN: measurement.technicianName.trim() || options?.defaults?.technicianName || "",
    TECHNICIAN_LICENSE: DEFAULT_TECHNICIAN_LICENSE,
    ADDRESS: jobDisplayTitle(job as Job),
    METER_MODEL: measurement.meterModel.trim() || options?.defaults?.meterModel || "",
    METER_SERIAL: measurement.meterSerialNumber.trim() || options?.defaults?.meterSerialNumber || "",
    EARTHING_SYSTEM: DEFAULT_EARTHING,
    YEAR: measurement.measurementDate.slice(0, 4) || String(new Date().getFullYear()),
    MEASUREMENT_CAUSE: DEFAULT_MEASUREMENT_CAUSE,
    VERDICT_TEXT: DEFAULT_VERDICT,
  };
  DEFAULT_INSPECTIONS.forEach((val, i) => {
    scalars[`INSPECTION_${i + 1}`] = val;
  });
  return scalars;
}

function buildAdscSupplyRow(): Record<string, string> {
  return {
    ROW_SUPPLY_LP: "1",
    ROW_SUPPLY_SYMBOL: "",
    ROW_SUPPLY_POINT: "Zasilanie",
    ROW_SUPPLY_BREAKER: "S301 1p",
    ROW_SUPPLY_BREAKER_TYPE: "C",
    ROW_SUPPLY_IN: "25",
    ROW_SUPPLY_IA: "250",
    ROW_SUPPLY_ZS: "0,34",
    ROW_SUPPLY_ZA: "0,92",
    ROW_SUPPLY_ASSESSMENT: "POZYTYWNA",
  };
}

function buildAdscCircuitRow(c: ElectricalMeasurementCircuit): Record<string, string> {
  return {
    ROW_LP: String(c.sortOrder),
    ROW_SYMBOL: "",
    ROW_POINT: c.displayName,
    ROW_BREAKER: "S301 1p",
    ROW_BREAKER_TYPE: c.breakerType,
    ROW_IN: circuitInAmps(c.type),
    ROW_IA: circuitIaAmps(c.breakerType, c.type),
    ROW_ZS: "0,33",
    ROW_ZA: circuitZaOhm(c.type),
    ROW_ASSESSMENT: "POZYTYWNA",
  };
}

function buildResistanceSupplyRow(label: string): Record<string, string> {
  return {
    ROW_SUPPLY_LP: "1",
    ROW_SUPPLY_CIRCUIT_NAME: label,
    ...Object.fromEntries(
      Object.entries(resistanceDefaults()).map(([k, v]) => [k.replace("ROW_", "ROW_SUPPLY_"), v]),
    ),
  };
}

function buildResistanceCircuitRow(lp: number, label: string): Record<string, string> {
  return {
    ROW_LP: String(lp),
    ROW_CIRCUIT_NAME: label,
    ...resistanceDefaults(),
  };
}

function buildRcdRow(lp: number, symbol: string, deviceType: string, circuitName: string): Record<string, string> {
  return {
    ROW_LP: String(lp),
    ROW_SYMBOL: symbol,
    ROW_CIRCUIT_NAME: circuitName,
    ROW_RCD_TYPE: deviceType,
    ROW_RCD_AC_TYPE: "AC",
    ROW_SELECTIVE: "NIE",
    ROW_IAN: "30",
    ROW_IA: "18",
    ROW_TA: "300",
    ROW_TRCD: "13",
    ROW_UD: "2",
    ROW_RS: "0,33",
    ROW_TEST: "Zadziałał",
    ROW_ASSESSMENT: "Pozytywna",
  };
}

/** Weryfikacja parity z preview.ts — etykiety wierszy muszą się zgadzać. */
export function assertPreviewParity(measurement: ElectricalMeasurement): boolean {
  const adsc = buildAdscPreview(measurement);
  const resistance = buildResistancePreview(measurement);
  const rcd = buildRcdPreview(measurement);
  const circuits = sortedCircuits(measurement);
  if (adsc[0] !== "1. Zasilanie") return false;
  for (let i = 0; i < circuits.length; i++) {
    const expected = `${circuits[i].sortOrder}. ${circuits[i].displayName}`;
    if (adsc[i + 1] !== expected) return false;
  }
  if (resistance.length !== 1 + circuits.length) return false;
  for (let i = 0; i < measurement.rcds.length; i++) {
    const r = measurement.rcds[i];
    if (rcd[i] !== `${r.symbol} → ${r.deviceType}`) return false;
  }
  return true;
}

export function buildElectricalMeasurementDocxPayload(
  measurement: ElectricalMeasurement,
  job: Pick<Job, "address" | "flatNumber">,
  options?: EmDocxGeneratorOptions,
): ElectricalMeasurementDocxPayload {
  const scalars = buildBaseScalars(measurement, job, options);
  const circuits = sortedCircuits(measurement);
  const resistanceLabels = buildResistancePreview(measurement);
  const rcdCircuitName = defaultRcdCircuitName(measurement);

  const adscSupply = buildAdscSupplyRow();
  const adscCircuits = circuits.map((c) => buildAdscCircuitRow(c));

  const resistanceSupply = buildResistanceSupplyRow(resistanceLabels[0] ?? "Obwód YDY 3x4mm²");
  const resistanceCircuits = resistanceLabels.slice(1).map((label, i) =>
    buildResistanceCircuitRow(i + 2, label),
  );

  const rcdRows = measurement.rcds.map((r, i) =>
    buildRcdRow(i + 1, r.symbol, r.deviceType, rcdCircuitName),
  );

  return {
    scalars,
    rowSpecs: [],
    /** Rozszerzone spec per dokument — ustawiane w generate-em-docx per kind */
    _adsc: [
      { marker: "ROW_SUPPLY_LP", rows: [adscSupply], substituteInPlace: true },
      { marker: "ROW_LP", rows: adscCircuits },
    ],
    _resistance: [
      { marker: "ROW_SUPPLY_LP", rows: [resistanceSupply], substituteInPlace: true },
      { marker: "ROW_LP", rows: resistanceCircuits },
    ],
    _rcd: [{ marker: "ROW_LP", rows: rcdRows }],
  } as ElectricalMeasurementDocxPayload & {
    _adsc: EmDocxRowCloneSpec[];
    _resistance: EmDocxRowCloneSpec[];
    _rcd: EmDocxRowCloneSpec[];
  };
}

export type EmDocxPayloadInternal = ReturnType<typeof buildElectricalMeasurementDocxPayload> & {
  _adsc: EmDocxRowCloneSpec[];
  _resistance: EmDocxRowCloneSpec[];
  _rcd: EmDocxRowCloneSpec[];
};

export function rowSpecsForKind(
  payload: EmDocxPayloadInternal,
  kind: "badanie-adsc" | "badanie-rezystancji" | "parametry-rcd",
): EmDocxRowCloneSpec[] {
  if (kind === "badanie-adsc") return payload._adsc;
  if (kind === "badanie-rezystancji") return payload._resistance;
  return payload._rcd;
}
