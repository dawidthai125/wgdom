import type { CircuitType } from "@/lib/electrical-measurements/types";
import type { SchematicCircuit, SchematicLoadKind } from "@/lib/electrical-schematics/types";

/** SSOT presetów obwodów — DESIGN FREEZE § B.1 */
export type CircuitPresetId =
  | "socket-230v"
  | "lighting"
  | "washer"
  | "dishwasher"
  | "oven"
  | "induction-hob"
  | "electric-stove-3p"
  | "boiler"
  | "convector"
  | "doorbell"
  | "reserve"
  | "socket-400v";

/** Pola obwodu z presetu — bez id/sortOrder (caller ustawia). */
export type SchematicCircuitPresetPayload = Omit<SchematicCircuit, "id" | "sortOrder">;

export interface CircuitPresetDefinition {
  presetId: CircuitPresetId;
  name: string;
  loadKind: SchematicLoadKind;
  breakerType: "B";
  ratedCurrentA: number;
  poles: 1 | 3;
  breakingCapacityKa: number;
  cableLabel: string;
}

export const CIRCUIT_PRESET_IDS: CircuitPresetId[] = [
  "socket-230v",
  "lighting",
  "washer",
  "dishwasher",
  "oven",
  "induction-hob",
  "electric-stove-3p",
  "boiler",
  "convector",
  "doorbell",
  "reserve",
  "socket-400v",
];

/** DESIGN FREEZE § B.1 — 12 presetów zamrożonych. */
export const CIRCUIT_PRESETS: Record<CircuitPresetId, CircuitPresetDefinition> = {
  "socket-230v": {
    presetId: "socket-230v",
    name: "GN 230V",
    loadKind: "socket-1f",
    breakerType: "B",
    ratedCurrentA: 16,
    poles: 1,
    breakingCapacityKa: 6,
    cableLabel: "YDYp 3x2,5mm²",
  },
  lighting: {
    presetId: "lighting",
    name: "OŚWIETLENIE",
    loadKind: "lighting-1f",
    breakerType: "B",
    ratedCurrentA: 10,
    poles: 1,
    breakingCapacityKa: 6,
    cableLabel: "YDYp 3x1,5mm²",
  },
  washer: {
    presetId: "washer",
    name: "GN 230V Pralka",
    loadKind: "socket-1f",
    breakerType: "B",
    ratedCurrentA: 16,
    poles: 1,
    breakingCapacityKa: 6,
    cableLabel: "YDYp 3x2,5mm²",
  },
  dishwasher: {
    presetId: "dishwasher",
    name: "GN 230V Zmywarka",
    loadKind: "socket-1f",
    breakerType: "B",
    ratedCurrentA: 16,
    poles: 1,
    breakingCapacityKa: 6,
    cableLabel: "YDYp 3x2,5mm²",
  },
  oven: {
    presetId: "oven",
    name: "GN 230V Piekarnik",
    loadKind: "socket-1f",
    breakerType: "B",
    ratedCurrentA: 16,
    poles: 1,
    breakingCapacityKa: 6,
    cableLabel: "YDYp 3x2,5mm²",
  },
  "induction-hob": {
    presetId: "induction-hob",
    name: "GN 230V Płyta indukcyjna",
    loadKind: "socket-1f",
    breakerType: "B",
    ratedCurrentA: 16,
    poles: 1,
    breakingCapacityKa: 6,
    cableLabel: "YDYp 3x2,5mm²",
  },
  "electric-stove-3p": {
    presetId: "electric-stove-3p",
    name: "Kuchenka Elektryczna",
    loadKind: "cable-outlet-3f",
    breakerType: "B",
    ratedCurrentA: 16,
    poles: 3,
    breakingCapacityKa: 6,
    cableLabel: "YDYp 5x2,5mm²",
  },
  boiler: {
    presetId: "boiler",
    name: "GN 230V Bojler",
    loadKind: "socket-1f",
    breakerType: "B",
    ratedCurrentA: 16,
    poles: 1,
    breakingCapacityKa: 6,
    cableLabel: "YDYp 3x2,5mm²",
  },
  convector: {
    presetId: "convector",
    name: "GN 230V Konwektor",
    loadKind: "socket-1f",
    breakerType: "B",
    ratedCurrentA: 16,
    poles: 1,
    breakingCapacityKa: 6,
    cableLabel: "YDYp 3x2,5mm²",
  },
  doorbell: {
    presetId: "doorbell",
    name: "Dzwonek",
    loadKind: "lighting-1f",
    breakerType: "B",
    ratedCurrentA: 10,
    poles: 1,
    breakingCapacityKa: 6,
    cableLabel: "YDYp 3x1,5mm²",
  },
  reserve: {
    presetId: "reserve",
    name: "REZERWA",
    loadKind: "reserve",
    breakerType: "B",
    ratedCurrentA: 16,
    poles: 1,
    breakingCapacityKa: 6,
    cableLabel: "YDYp 3x2,5mm²",
  },
  "socket-400v": {
    presetId: "socket-400v",
    name: "GN 400V",
    loadKind: "socket-3f",
    breakerType: "B",
    ratedCurrentA: 32,
    poles: 3,
    breakingCapacityKa: 6,
    cableLabel: "YDY 5x2,5mm²",
  },
};

export function isCircuitPresetId(value: string): value is CircuitPresetId {
  return (CIRCUIT_PRESET_IDS as string[]).includes(value);
}

export function getCircuitPreset(presetId: CircuitPresetId): CircuitPresetDefinition {
  return CIRCUIT_PRESETS[presetId];
}

/**
 * DESIGN FREEZE § B — kontrakt applyPreset.
 * Zwraca pola obwodu z presetu + opcjonalne overrides.
 * Nie ustawia id ani sortOrder — caller je dodaje.
 */
export function applyPreset(
  presetId: CircuitPresetId,
  overrides?: Partial<Omit<SchematicCircuit, "id" | "sortOrder">>,
): SchematicCircuitPresetPayload {
  const preset = getCircuitPreset(presetId);
  const base: SchematicCircuitPresetPayload = {
    presetId: preset.presetId,
    name: preset.name,
    loadKind: preset.loadKind,
    breakerType: preset.breakerType,
    ratedCurrentA: preset.ratedCurrentA,
    poles: preset.poles,
    breakingCapacityKa: preset.breakingCapacityKa,
    cableLabel: preset.cableLabel,
  };
  if (!overrides) return base;
  return {
    ...base,
    ...overrides,
    presetId: overrides.presetId ?? base.presetId,
  };
}

/** DESIGN FREEZE § B.4 — mapowanie typu obwodu EM → presetId. */
export function resolveEmCircuitPresetId(type: CircuitType, displayName = ""): CircuitPresetId {
  if (type === "lighting-1f") return "lighting";
  if (type === "socket-1f") return "socket-230v";
  const lower = displayName.toLowerCase();
  if (lower.includes("kuchenk")) return "electric-stove-3p";
  return "socket-400v";
}
