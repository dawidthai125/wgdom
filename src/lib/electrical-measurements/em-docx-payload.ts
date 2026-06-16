import { jobDisplayTitle } from "@/app/app-domain";
import type { Job } from "@/app/app-domain";
import type { EmDocxRowCloneSpec } from "@/lib/electrical-measurements/em-docx-xml";
import {
  resolveAdscCircuitValues,
  resolveAdscSupplyValues,
  resolveRcdValues,
  resolveResistanceCircuitValues,
  resolveResistanceSupplyValues,
} from "@/lib/electrical-measurements/measurement-value-engine";
import {
  buildAdscPreview,
  buildRcdPreview,
  buildResistancePreview,
  resistanceRowLabels,
} from "@/lib/electrical-measurements/preview";
import type {
  ElectricalMeasurement,
  ElectricalMeasurementCircuit,
  ResistanceMeasurementValues,
} from "@/lib/electrical-measurements/types";

export interface EmDocxGeneratorOptions {
  defaults?: {
    technicianName?: string;
    meterModel?: string;
    meterSerialNumber?: string;
  };
}

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

function resistanceToRow(prefix: "" | "SUPPLY_", v: ResistanceMeasurementValues): Record<string, string> {
  const p = prefix ? `ROW_${prefix}` : "ROW_";
  return {
    [`${p}L1L2`]: v.l1l2,
    [`${p}L2L3`]: v.l2l3,
    [`${p}L1L3`]: v.l1l3,
    [`${p}L1L2_ALT`]: v.l1l2Alt,
    [`${p}L1PE`]: v.l1pe,
    [`${p}L2PE`]: v.l2pe,
    [`${p}L3PE`]: v.l3pe,
    [`${p}L1N`]: v.l1n,
    [`${p}L2N`]: v.l2n,
    [`${p}L3N`]: v.l3n,
    [`${p}NPE`]: v.npe,
    [`${p}RA`]: v.ra,
    [`${p}U_ISO`]: v.uIso,
    [`${p}ASSESSMENT`]: v.assessment,
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

function buildAdscSupplyRow(measurement: ElectricalMeasurement): Record<string, string> {
  const v = resolveAdscSupplyValues(measurement);
  return {
    ROW_SUPPLY_LP: "1",
    ROW_SUPPLY_SYMBOL: "",
    ROW_SUPPLY_POINT: "Zasilanie",
    ROW_SUPPLY_BREAKER: v.breakerLabel,
    ROW_SUPPLY_BREAKER_TYPE: v.breakerType,
    ROW_SUPPLY_IN: v.inAmps,
    ROW_SUPPLY_IA: v.iaAmps,
    ROW_SUPPLY_ZS: v.zs,
    ROW_SUPPLY_ZA: v.za,
    ROW_SUPPLY_ASSESSMENT: v.assessment,
  };
}

function buildAdscCircuitRow(measurement: ElectricalMeasurement, c: ElectricalMeasurementCircuit): Record<string, string> {
  const v = resolveAdscCircuitValues(measurement, c);
  return {
    ROW_LP: String(c.sortOrder),
    ROW_SYMBOL: "",
    ROW_POINT: c.displayName,
    ROW_BREAKER: v.breakerLabel,
    ROW_BREAKER_TYPE: v.breakerType,
    ROW_IN: v.inAmps,
    ROW_IA: v.iaAmps,
    ROW_ZS: v.zs,
    ROW_ZA: v.za,
    ROW_ASSESSMENT: v.assessment,
  };
}

function buildResistanceSupplyRow(measurement: ElectricalMeasurement, label: string): Record<string, string> {
  const v = resolveResistanceSupplyValues(measurement);
  return {
    ROW_SUPPLY_LP: "1",
    ROW_SUPPLY_CIRCUIT_NAME: label,
    ...resistanceToRow("SUPPLY_", v),
  };
}

function buildResistanceCircuitRow(
  measurement: ElectricalMeasurement,
  lp: number,
  label: string,
  circuit: ElectricalMeasurementCircuit,
): Record<string, string> {
  const v = resolveResistanceCircuitValues(measurement, circuit);
  return {
    ROW_LP: String(lp),
    ROW_CIRCUIT_NAME: label,
    ...resistanceToRow("", v),
  };
}

function buildRcdRow(measurement: ElectricalMeasurement, lp: number, rcd: { id: string; symbol: string; deviceType: string }): Record<string, string> {
  const v = resolveRcdValues(measurement, rcd as import("@/lib/electrical-measurements/types").ElectricalMeasurementRcd);
  return {
    ROW_LP: String(lp),
    ROW_SYMBOL: rcd.symbol,
    ROW_CIRCUIT_NAME: v.circuitName,
    ROW_RCD_TYPE: rcd.deviceType,
    ROW_RCD_AC_TYPE: v.rcdAcType,
    ROW_SELECTIVE: v.selective,
    ROW_IAN: v.ian,
    ROW_IA: v.ia,
    ROW_TA: v.ta,
    ROW_TRCD: v.trcd,
    ROW_UD: v.ud,
    ROW_RS: v.rs,
    ROW_TEST: v.testResult,
    ROW_ASSESSMENT: v.assessment,
  };
}

/** Parity etykiet + kluczowych wartości preview ↔ payload. */
export function assertPreviewParity(measurement: ElectricalMeasurement): boolean {
  const adscPreview = buildAdscPreview(measurement);
  const resistancePreview = buildResistancePreview(measurement);
  const rcdPreview = buildRcdPreview(measurement);
  const payload = buildElectricalMeasurementDocxPayload(measurement, { address: "", flatNumber: "" });
  const internal = payload as EmDocxPayloadInternal;

  const supplyRow = internal._adsc[0]?.rows[0];
  const supply = resolveAdscSupplyValues(measurement);
  if (!supplyRow || supplyRow.ROW_SUPPLY_ZS !== supply.zs) return false;
  if (!adscPreview[0]?.includes(supply.zs)) return false;

  const circuits = sortedCircuits(measurement);
  if (internal._adsc[1]?.rows.length !== circuits.length) return false;

  if (resistancePreview.length !== 1 + circuits.length) return false;
  if (rcdPreview.length !== measurement.rcds.length) return false;

  for (let i = 0; i < measurement.rcds.length; i++) {
    const r = measurement.rcds[i];
    const v = resolveRcdValues(measurement, r);
    const row = internal._rcd[0]?.rows[i];
    if (!row || row.ROW_RS !== v.rs) return false;
    if (!rcdPreview[i]?.includes(v.rs)) return false;
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
  const resistanceLabels = resistanceRowLabels(measurement);

  const adscSupply = buildAdscSupplyRow(measurement);
  const adscCircuits = circuits.map((c) => buildAdscCircuitRow(measurement, c));

  const resistanceSupply = buildResistanceSupplyRow(measurement, resistanceLabels[0] ?? "Obwód YDY 3x4mm²");
  const resistanceCircuits = circuits.map((c, i) =>
    buildResistanceCircuitRow(measurement, i + 2, resistanceLabels[i + 1] ?? c.displayName, c),
  );

  const rcdRows = measurement.rcds.map((r, i) => buildRcdRow(measurement, i + 1, r));

  return {
    scalars,
    rowSpecs: [],
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
