import { isTestMeasurement } from "@/lib/electrical-measurements/test-report";
import type {
  ElectricalMeasurement,
  ElectricalMeasurementCircuit,
  ElectricalMeasurementRcd,
  SupplyType,
} from "@/lib/electrical-measurements/types";
import { applyPreset, resolveEmCircuitPresetId } from "@/lib/electrical-schematics/circuit-presets";
import { parseSingleLineDiagram } from "@/lib/electrical-schematics/normalize";
import type {
  SchematicCircuit,
  SchematicLayoutProfile,
  SchematicMainRcd,
  SchematicSupply,
  SingleLineDiagram,
} from "@/lib/electrical-schematics/types";
import {
  DEFAULT_SCHEMATIC_TITLE,
  SCHEMATIC_SCHEMA_VERSION,
} from "@/lib/electrical-schematics/types";

export interface ImportSchematicFromMeasurementOptions {
  diagramId?: string;
  address?: string;
}

function localIsoDateFromMeasurement(measurement: ElectricalMeasurement): string {
  const d = String(measurement.measurementDate ?? "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return new Date().toISOString().slice(0, 10);
}

function resolveSupplyFromMeasurement(supplyType: SupplyType): {
  layoutProfile: SchematicLayoutProfile;
  supply: SchematicSupply;
} {
  if (supplyType === "ydy-5x4") {
    return {
      layoutProfile: "apartment-3f-v1",
      supply: {
        phase: "3f",
        busLabel: "L1, L2, L3, N, PE",
        mainCableLabel: "YDYp 5x4mm²",
      },
    };
  }
  return {
    layoutProfile: "apartment-1f-v1",
    supply: {
      phase: "1f",
      busLabel: "L, N, PE",
      mainCableLabel: "YDYp 3x4mm²",
    },
  };
}

function mapMainRcdFromMeasurement(
  rcd: ElectricalMeasurementRcd | undefined,
  supply: SchematicSupply,
): SchematicMainRcd {
  const poles: 2 | 4 = supply.phase === "3f" ? 4 : 2;
  const symbol = rcd?.symbol?.trim();
  return {
    ...(symbol ? { symbol } : {}),
    ratedCurrentA: 25,
    sensitivityMa: 30,
    poles,
    rcdType: "AC",
  };
}

function mapCircuitFromMeasurement(
  circuit: ElectricalMeasurementCircuit,
  fallbackOrder: number,
): SchematicCircuit {
  const presetId = resolveEmCircuitPresetId(circuit.type, circuit.displayName);
  const displayName = String(circuit.displayName ?? "").trim();
  const overrides = {
    name: displayName || undefined,
    breakerType: circuit.breakerType,
  };
  return {
    id: crypto.randomUUID(),
    sortOrder:
      typeof circuit.sortOrder === "number" && Number.isFinite(circuit.sortOrder)
        ? Math.max(1, Math.floor(circuit.sortOrder))
        : fallbackOrder,
    ...applyPreset(presetId, overrides),
    name: displayName || applyPreset(presetId).name,
  };
}

/**
 * DESIGN FREEZE § A.6 — jednorazowy import EM → SingleLineDiagram.
 * Nie importuje valueSet, technicianName, meter serial ani wyników pomiarów.
 */
export function importSchematicFromMeasurement(
  measurement: ElectricalMeasurement,
  options: ImportSchematicFromMeasurementOptions = {},
): SingleLineDiagram {
  const now = new Date().toISOString();
  const { layoutProfile, supply } = resolveSupplyFromMeasurement(measurement.supplyType);
  const isTest = isTestMeasurement(measurement);
  const meterPhases: 1 | 3 = supply.phase === "3f" ? 3 : 1;
  const mainBreakerPoles: 1 | 2 | 3 = supply.phase === "3f" ? 3 : 1;

  const sortedCircuits = [...measurement.circuits].sort((a, b) => a.sortOrder - b.sortOrder);
  const circuits = sortedCircuits.map((c, i) => mapCircuitFromMeasurement(c, i + 1));

  const raw: SingleLineDiagram = {
    id: options.diagramId ?? crypto.randomUUID(),
    schemaVersion: SCHEMATIC_SCHEMA_VERSION,
    title: DEFAULT_SCHEMATIC_TITLE,
    address: options.address ?? "",
    documentDate: localIsoDateFromMeasurement(measurement),
    status: "draft",
    ...(isTest ? { flags: { test: true } } : {}),
    jobId: measurement.jobId,
    linkStatus: "linked",
    sourceMeasurementId: measurement.id,
    sourceMeasurementRef: measurement.reportNumber || undefined,
    layoutProfile,
    supply,
    meter: { phases: meterPhases, label: "KWh" },
    mainBreaker: {
      breakerType: "C",
      ratedCurrentA: 25,
      poles: mainBreakerPoles,
      breakingCapacityKa: 6,
    },
    mainRcd: mapMainRcdFromMeasurement(measurement.rcds[0], supply),
    circuits,
    createdAt: now,
    updatedAt: now,
  };

  const parsed = parseSingleLineDiagram(raw);
  if (!parsed) {
    throw new Error("importSchematicFromMeasurement: normalize failed");
  }
  return parsed;
}

export function isTestSchematic(
  diagram: Pick<SingleLineDiagram, "flags" | "sourceMeasurementRef"> | null | undefined,
): boolean {
  if (!diagram) return false;
  if (diagram.flags?.test === true) return true;
  const ref = String(diagram.sourceMeasurementRef ?? "").trim();
  return /^TEST-RAP-/i.test(ref);
}
