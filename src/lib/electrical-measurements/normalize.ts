import type {
  BreakerType,
  CircuitType,
  ElectricalMeasurement,
  ElectricalMeasurementCircuit,
  ElectricalMeasurementRcd,
  RcdDeviceType,
  SupplyType,
} from "@/lib/electrical-measurements/types";
import {
  BREAKER_TYPES,
  CIRCUIT_TYPES,
  defaultCircuitDisplayName,
  RCD_DEVICE_TYPES,
  SUPPLY_TYPES,
} from "@/lib/electrical-measurements/types";

function renumberCircuitSortOrder(circuits: ElectricalMeasurementCircuit[]): ElectricalMeasurementCircuit[] {
  const sorted = [...circuits].sort((a, b) => a.sortOrder - b.sortOrder);
  return sorted.map((c, i) => ({ ...c, sortOrder: i + 2 }));
}

function parseCircuit(raw: unknown, fallbackOrder: number): ElectricalMeasurementCircuit | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<ElectricalMeasurementCircuit>;
  if (!r.id || !r.type || !CIRCUIT_TYPES.includes(r.type as CircuitType)) return null;
  const type = r.type as CircuitType;
  const breakerType = BREAKER_TYPES.includes(r.breakerType as BreakerType) ? (r.breakerType as BreakerType) : "B";
  const sortOrder =
    typeof r.sortOrder === "number" && Number.isFinite(r.sortOrder) ? Math.max(2, Math.floor(r.sortOrder)) : fallbackOrder;
  const displayName = String(r.displayName ?? "").trim() || defaultCircuitDisplayName(type);
  return { id: String(r.id), type, breakerType, displayName, sortOrder };
}

function parseRcd(raw: unknown): ElectricalMeasurementRcd | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<ElectricalMeasurementRcd>;
  if (!r.id || !r.symbol) return null;
  const deviceType = RCD_DEVICE_TYPES.includes(r.deviceType as RcdDeviceType)
    ? (r.deviceType as RcdDeviceType)
    : "P302";
  return { id: String(r.id), symbol: String(r.symbol), deviceType };
}

export function parseElectricalMeasurement(raw: unknown): ElectricalMeasurement | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<ElectricalMeasurement>;
  if (!r.id || !r.jobId) return null;
  const supplyType = SUPPLY_TYPES.includes(r.supplyType as SupplyType) ? (r.supplyType as SupplyType) : "ydy-3x4";
  const circuits: ElectricalMeasurementCircuit[] = [];
  if (Array.isArray(r.circuits)) {
    r.circuits.forEach((c, i) => {
      const parsed = parseCircuit(c, i + 2);
      if (parsed) circuits.push(parsed);
    });
  }
  const rcds: ElectricalMeasurementRcd[] = [];
  if (Array.isArray(r.rcds)) {
    for (const item of r.rcds) {
      const parsed = parseRcd(item);
      if (parsed) rcds.push(parsed);
    }
  }
  const now = new Date().toISOString();
  return {
    id: String(r.id),
    jobId: String(r.jobId),
    reportNumber: String(r.reportNumber ?? ""),
    measurementDate: String(r.measurementDate ?? "").slice(0, 10),
    technicianName: String(r.technicianName ?? ""),
    meterModel: String(r.meterModel ?? ""),
    meterSerialNumber: String(r.meterSerialNumber ?? ""),
    supplyType,
    circuits: renumberCircuitSortOrder(circuits),
    rcds,
    createdAt: String(r.createdAt ?? now),
    updatedAt: String(r.updatedAt ?? r.createdAt ?? now),
  };
}

export function normalizeElectricalMeasurements(raw: unknown): ElectricalMeasurement[] {
  if (!Array.isArray(raw)) return [];
  const out: ElectricalMeasurement[] = [];
  for (const item of raw) {
    const parsed = parseElectricalMeasurement(item);
    if (parsed) out.push(parsed);
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
