/** Pomiary elektryczne — typy domeny (≠ WM Druk). */

export const ELECTRICAL_MEASUREMENTS_KEY = "kw-electrical-measurements";
export const ELECTRICAL_MEASUREMENT_REGISTRY_KEY = "kw-electrical-measurement-registry";
export const ELECTRICAL_MEASUREMENT_SETTINGS_KEY = "kw-electrical-measurement-settings";

export type ElectricalMeasurementRegistryStatus = "ACTIVE" | "CANCELLED";

export interface ElectricalMeasurementRegistryEntry {
  jobId: string;
  rapNumber: string;
  year: number;
  sequence: number;
  assignedAt: string;
  status: ElectricalMeasurementRegistryStatus;
}

/** EM-P1.7 — globalne ustawienia domyślne (WM Druk → Ustawienia). */
export interface ElectricalMeasurementSettings {
  technicianName: string;
  meterModel: string;
  meterSerialNumber: string;
  updatedAt: string;
}

/** @deprecated użyj ElectricalMeasurementSettings — alias kompatybilności */
export interface ElectricalMeasurementDefaultsHint {
  technicianName?: string;
  meterModel?: string;
  meterSerialNumber?: string;
}

export type SupplyType = "ydy-3x4" | "ydy-5x4";

export type CircuitType = "socket-1f" | "lighting-1f" | "socket-3f";

export type BreakerType = "B" | "C";

export type RcdDeviceType = "P302" | "P304";

export interface ElectricalMeasurementCircuit {
  id: string;
  type: CircuitType;
  breakerType: BreakerType;
  /** Etykieta wiersza ADSC/DOCX — domyślnie z typu, edytowalna w EM-P1. */
  displayName: string;
  /** Kolejność w dokumentach (2+; 1 = Zasilanie). */
  sortOrder: number;
}

export interface ElectricalMeasurementRcd {
  id: string;
  symbol: string;
  deviceType: RcdDeviceType;
}

/** EM-P1.5 — wartości ADSC (zapisane po generowaniu / korekcie ręcznej). */
export interface AdscMeasurementValues {
  zs: string;
  za: string;
  inAmps: string;
  iaAmps: string;
  breakerType: BreakerType;
  breakerLabel: string;
  assessment: string;
}

/** EM-P1.5 — macierz rezystancji jednego wiersza tabeli. */
export interface ResistanceMeasurementValues {
  l1l2: string;
  l2l3: string;
  l1l3: string;
  l1l2Alt: string;
  l1pe: string;
  l2pe: string;
  l3pe: string;
  l1n: string;
  l2n: string;
  l3n: string;
  npe: string;
  ra: string;
  uIso: string;
  assessment: string;
}

/** EM-P1.5 — parametry RCD jednego wiersza. */
export interface RcdMeasurementValues {
  circuitName: string;
  rs: string;
  ian: string;
  ia: string;
  ta: string;
  trcd: string;
  ud: string;
  testResult: string;
  assessment: string;
  rcdAcType: string;
  selective: string;
}

/** EM-P1.5 — zestaw wartości wygenerowanych raz (seed) i zapisywany w raporcie. */
export interface ElectricalMeasurementValueSet {
  v: 1;
  seed: string;
  generatedAt: string;
  adscSupply: AdscMeasurementValues;
  adscByCircuitId: Record<string, AdscMeasurementValues>;
  resistanceSupply: ResistanceMeasurementValues;
  resistanceByCircuitId: Record<string, ResistanceMeasurementValues>;
  rcdByRcdId: Record<string, RcdMeasurementValues>;
}

export interface ElectricalMeasurement {
  id: string;
  jobId: string;
  reportNumber: string;
  measurementDate: string;
  technicianName: string;
  meterModel: string;
  meterSerialNumber: string;
  supplyType: SupplyType;
  circuits: ElectricalMeasurementCircuit[];
  rcds: ElectricalMeasurementRcd[];
  /** Wartości pomiarowe — generowane raz, edytowalne ręcznie (EM-P1.5). */
  valueSet?: ElectricalMeasurementValueSet;
  /** EM-P1.7 — false = pola pomiarowiec/miernik tylko odczyt (domyślnie przy nowym raporcie). */
  metaFieldsOverridden?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const SUPPLY_TYPES: SupplyType[] = ["ydy-3x4", "ydy-5x4"];

export const SUPPLY_TYPE_LABELS: Record<SupplyType, string> = {
  "ydy-3x4": "YDY 3×4 mm²",
  "ydy-5x4": "YDY 5×4 mm²",
};

export const CIRCUIT_TYPES: CircuitType[] = ["socket-1f", "lighting-1f", "socket-3f"];

export const CIRCUIT_TYPE_LABELS: Record<CircuitType, string> = {
  "socket-1f": "Gniazdo 1F",
  "lighting-1f": "Oświetlenie 1F",
  "socket-3f": "Gniazdo 3F",
};

/** Domyślne etykiety ADSC/DOCX per typ obwodu (EM-P1 SSOT). */
export const CIRCUIT_ADSC_DISPLAY_NAMES: Record<CircuitType, string> = {
  "socket-1f": "Obwód gniazd 230V",
  "lighting-1f": "Oświetlenie 230V",
  "socket-3f": "Obwód gniazd 400V",
};

export function defaultCircuitDisplayName(type: CircuitType): string {
  return CIRCUIT_ADSC_DISPLAY_NAMES[type];
}

export const BREAKER_TYPES: BreakerType[] = ["B", "C"];

export const RCD_DEVICE_TYPES: RcdDeviceType[] = ["P302", "P304"];

/** Stała liczba docelowych dokumentów EM (EM-P1). */
export const EM_DOCUMENT_COUNT = 5;
