import type {
  BreakerType,
  CircuitType,
  ElectricalMeasurement,
  ElectricalMeasurementCircuit,
  ElectricalMeasurementRcd,
  ElectricalMeasurementValueSet,
  AdscMeasurementValues,
  ResistanceMeasurementValues,
  RcdMeasurementValues,
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
import { EM_VALUE_SET_VERSION } from "@/lib/electrical-measurements/measurement-value-engine";

function renumberCircuitSortOrder(circuits: ElectricalMeasurementCircuit[]): ElectricalMeasurementCircuit[] {
  const sorted = [...circuits].sort((a, b) => a.sortOrder - b.sortOrder);
  return sorted.map((c, i) => ({ ...c, sortOrder: i + 2 }));
}

function parseStringField(raw: unknown, fallback = ""): string {
  return typeof raw === "string" ? raw : fallback;
}

function parseAdscValues(raw: unknown): AdscMeasurementValues | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<AdscMeasurementValues>;
  if (!r.zs) return null;
  const breakerType = BREAKER_TYPES.includes(r.breakerType as BreakerType) ? (r.breakerType as BreakerType) : "B";
  return {
    zs: parseStringField(r.zs),
    za: parseStringField(r.za),
    inAmps: parseStringField(r.inAmps),
    iaAmps: parseStringField(r.iaAmps),
    breakerType,
    breakerLabel: parseStringField(r.breakerLabel, "S301 1p"),
    assessment: parseStringField(r.assessment, "POZYTYWNA"),
  };
}

function parseResistanceValues(raw: unknown): ResistanceMeasurementValues | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<ResistanceMeasurementValues>;
  return {
    l1l2: parseStringField(r.l1l2),
    l2l3: parseStringField(r.l2l3),
    l1l3: parseStringField(r.l1l3),
    l1l2Alt: parseStringField(r.l1l2Alt),
    l1pe: parseStringField(r.l1pe),
    l2pe: parseStringField(r.l2pe),
    l3pe: parseStringField(r.l3pe),
    l1n: parseStringField(r.l1n),
    l2n: parseStringField(r.l2n),
    l3n: parseStringField(r.l3n),
    npe: parseStringField(r.npe),
    ra: parseStringField(r.ra),
    uIso: parseStringField(r.uIso, "500"),
    assessment: parseStringField(r.assessment, "Pozytywna"),
  };
}

function parseRcdValues(raw: unknown): RcdMeasurementValues | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<RcdMeasurementValues>;
  if (!r.rs) return null;
  return {
    circuitName: parseStringField(r.circuitName, "Obwody gniazd"),
    rs: parseStringField(r.rs),
    ian: parseStringField(r.ian, "30"),
    ia: parseStringField(r.ia, "18"),
    ta: parseStringField(r.ta, "300"),
    trcd: parseStringField(r.trcd, "13"),
    ud: parseStringField(r.ud, "2"),
    testResult: parseStringField(r.testResult, "Pozytywna"),
    assessment: parseStringField(r.assessment, "Pozytywna"),
    rcdAcType: parseStringField(r.rcdAcType, "AC"),
    selective: parseStringField(r.selective, "NIE"),
  };
}

function parseRecordValues<T>(
  raw: unknown,
  parser: (v: unknown) => T | null,
): Record<string, T> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const parsed = parser(v);
    if (parsed) out[k] = parsed;
  }
  return out;
}

function parseValueSet(raw: unknown): ElectricalMeasurementValueSet | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Partial<ElectricalMeasurementValueSet>;
  if (r.v !== EM_VALUE_SET_VERSION) return undefined;
  const adscSupply = parseAdscValues(r.adscSupply);
  if (!adscSupply) return undefined;
  const resistanceSupply = parseResistanceValues(r.resistanceSupply);
  if (!resistanceSupply) return undefined;
  return {
    v: EM_VALUE_SET_VERSION,
    seed: parseStringField(r.seed),
    generatedAt: parseStringField(r.generatedAt),
    adscSupply,
    adscByCircuitId: parseRecordValues(r.adscByCircuitId, parseAdscValues),
    resistanceSupply,
    resistanceByCircuitId: parseRecordValues(r.resistanceByCircuitId, parseResistanceValues),
    rcdByRcdId: parseRecordValues(r.rcdByRcdId, parseRcdValues),
  };
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
  const valueSet = parseValueSet(r.valueSet);
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
    valueSet,
    metaFieldsOverridden: r.metaFieldsOverridden === true ? true : r.metaFieldsOverridden === false ? false : undefined,
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
