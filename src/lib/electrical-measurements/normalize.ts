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
  RCD_DEVICE_TYPES,
  SUPPLY_TYPES,
} from "@/lib/electrical-measurements/types";

function parseCircuit(raw: unknown): ElectricalMeasurementCircuit | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<ElectricalMeasurementCircuit>;
  if (!r.id || !r.type || !CIRCUIT_TYPES.includes(r.type as CircuitType)) return null;
  const breakerType = BREAKER_TYPES.includes(r.breakerType as BreakerType) ? (r.breakerType as BreakerType) : "B";
  return { id: String(r.id), type: r.type as CircuitType, breakerType };
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
    for (const c of r.circuits) {
      const parsed = parseCircuit(c);
      if (parsed) circuits.push(parsed);
    }
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
    circuits,
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
