/** Pomiary elektryczne — typy domeny (≠ WM Druk). */

export const ELECTRICAL_MEASUREMENTS_KEY = "kw-electrical-measurements";

/** Docelowo: domyślne wartości z ustawień firmy (EM-P0.5). */
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
