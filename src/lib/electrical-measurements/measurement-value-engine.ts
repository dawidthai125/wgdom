/**
 * EM-P1.5 — Measurement Value Engine (SSOT).
 * Losowanie TYLKO w generateElectricalMeasurementValues — nigdy w preview/DOCX.
 */

import type {
  CircuitType,
  ElectricalMeasurement,
  ElectricalMeasurementCircuit,
  ElectricalMeasurementRcd,
  ElectricalMeasurementValueSet,
  AdscMeasurementValues,
  ResistanceMeasurementValues,
  RcdMeasurementValues,
} from "@/lib/electrical-measurements/types";

export const EM_VALUE_SET_VERSION = 1 as const;

const ADSC_SUPPLY_ZS_MIN = 0.25;
const ADSC_SUPPLY_ZS_MAX = 0.48;
const ADSC_CIRCUIT_ZS_MIN = 0.23;
const ADSC_CIRCUIT_ZS_MAX = 0.49;
const RCD_RS_MIN = 0.28;
const RCD_RS_MAX = 0.45;

/** Klucz seed — powtarzalność per raport (id + numer). */
export function seedKeyForMeasurement(m: ElectricalMeasurement): string {
  return `${m.id}:${(m.reportNumber || "draft").trim()}`;
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createSeededRandom(seed: string): () => number {
  let a = hashSeed(seed) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function roundOhm(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatOhmPl(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

export function parseOhmPl(s: string): number | null {
  const t = String(s ?? "").trim().replace(",", ".");
  if (!t || t.startsWith(">")) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? roundOhm(n) : null;
}

/** Unikalne wartości Ω po zaokrągleniu do 0,01 — korekta ±0,01…0,05 w zakresie. */
export function generateUniqueOhmValues(
  rng: () => number,
  count: number,
  min: number,
  max: number,
): number[] {
  if (count <= 0) return [];
  const used = new Set<number>();
  const out: number[] = [];

  for (let i = 0; i < count; i++) {
    let v = roundOhm(min + rng() * (max - min));
    let attempts = 0;
    while (used.has(v) && attempts < 300) {
      const delta = roundOhm(0.01 + rng() * 0.04);
      const dir = rng() < 0.5 ? -1 : 1;
      v = roundOhm(Math.min(max, Math.max(min, v + dir * delta)));
      attempts++;
    }
    if (used.has(v)) {
      for (let x = min; x <= max + 1e-9; x = roundOhm(x + 0.01)) {
        if (!used.has(x)) {
          v = x;
          break;
        }
      }
    }
    used.add(v);
    out.push(v);
  }
  return out;
}

function adscCircuitFixed(type: CircuitType): Pick<AdscMeasurementValues, "inAmps" | "iaAmps" | "za"> {
  if (type === "lighting-1f") {
    return { inAmps: "10", iaAmps: "50", za: "4,88" };
  }
  return { inAmps: "16", iaAmps: "80", za: "2,88" };
}

function buildAdscSupply(zs: number): AdscMeasurementValues {
  return {
    zs: formatOhmPl(zs),
    za: "0,92",
    inAmps: "25",
    iaAmps: "250",
    breakerType: "C",
    breakerLabel: "S301 1p",
    assessment: "POZYTYWNA",
  };
}

function buildAdscCircuit(circuit: ElectricalMeasurementCircuit, zs: number): AdscMeasurementValues {
  const fixed = adscCircuitFixed(circuit.type);
  return {
    zs: formatOhmPl(zs),
    za: fixed.za,
    inAmps: fixed.inAmps,
    iaAmps: fixed.iaAmps,
    breakerType: circuit.breakerType,
    breakerLabel: "S301 1p",
    assessment: "POZYTYWNA",
  };
}

function resistance1fDefaults(): ResistanceMeasurementValues {
  return {
    l1l2: "",
    l2l3: "",
    l1l3: "",
    l1l2Alt: "",
    l1pe: ">50",
    l2pe: "",
    l3pe: "",
    l1n: ">50",
    l2n: "",
    l3n: "",
    npe: ">50",
    ra: ">50",
    uIso: "500",
    assessment: "Pozytywna",
  };
}

function resistance3fAllHigh(): ResistanceMeasurementValues {
  return {
    l1l2: ">50",
    l2l3: ">50",
    l1l3: ">50",
    l1l2Alt: ">50",
    l1pe: ">50",
    l2pe: ">50",
    l3pe: ">50",
    l1n: ">50",
    l2n: ">50",
    l3n: ">50",
    npe: ">50",
    ra: ">50",
    uIso: "500",
    assessment: "Pozytywna",
  };
}

function buildRcdValues(rs: number, circuitName: string): RcdMeasurementValues {
  return {
    circuitName,
    rs: formatOhmPl(rs),
    ian: "30",
    ia: "18",
    ta: "300",
    trcd: "13",
    ud: "2",
    testResult: "Pozytywna",
    assessment: "Pozytywna",
    rcdAcType: "AC",
    selective: "NIE",
  };
}

function defaultRcdCircuitName(measurement: ElectricalMeasurement): string {
  const circuits = [...measurement.circuits].sort((a, b) => a.sortOrder - b.sortOrder);
  if (circuits.length === 0) return "Obwody gniazd";
  const names = [...new Set(circuits.map((c) => c.displayName))];
  return names.length === 1 ? names[0] : "Obwody gniazd";
}

/** Jednorazowe losowanie — zapis do raportu. */
export function generateElectricalMeasurementValueSet(
  measurement: ElectricalMeasurement,
): ElectricalMeasurementValueSet {
  const seed = seedKeyForMeasurement(measurement);
  const rng = createSeededRandom(seed);
  const circuits = [...measurement.circuits].sort((a, b) => a.sortOrder - b.sortOrder);
  const rcdCircuitName = defaultRcdCircuitName(measurement);

  const supplyZs = generateUniqueOhmValues(rng, 1, ADSC_SUPPLY_ZS_MIN, ADSC_SUPPLY_ZS_MAX)[0];
  const circuitZsList = generateUniqueOhmValues(rng, circuits.length, ADSC_CIRCUIT_ZS_MIN, ADSC_CIRCUIT_ZS_MAX);
  const rcdRsList = generateUniqueOhmValues(rng, measurement.rcds.length, RCD_RS_MIN, RCD_RS_MAX);

  const adscByCircuitId: Record<string, AdscMeasurementValues> = {};
  circuits.forEach((c, i) => {
    adscByCircuitId[c.id] = buildAdscCircuit(c, circuitZsList[i]);
  });

  const resistanceByCircuitId: Record<string, ResistanceMeasurementValues> = {};
  for (const c of circuits) {
    resistanceByCircuitId[c.id] = c.type === "socket-3f" ? resistance3fAllHigh() : resistance1fDefaults();
  }

  const rcdByRcdId: Record<string, RcdMeasurementValues> = {};
  measurement.rcds.forEach((r, i) => {
    rcdByRcdId[r.id] = buildRcdValues(rcdRsList[i], rcdCircuitName);
  });

  return {
    v: EM_VALUE_SET_VERSION,
    seed,
    generatedAt: new Date().toISOString(),
    adscSupply: buildAdscSupply(supplyZs),
    adscByCircuitId,
    resistanceSupply: resistance1fDefaults(),
    resistanceByCircuitId,
    rcdByRcdId,
  };
}

export function hasGeneratedMeasurementValues(m: ElectricalMeasurement): boolean {
  return m.valueSet != null && m.valueSet.v === EM_VALUE_SET_VERSION;
}

export function applyGeneratedValuesToMeasurement(m: ElectricalMeasurement): ElectricalMeasurement {
  return {
    ...m,
    valueSet: generateElectricalMeasurementValueSet(m),
    updatedAt: new Date().toISOString(),
  };
}

/** --- Legacy fallback (raporty EM-P0/P1 bez valueSet) --- */

function legacyAdscSupply(): AdscMeasurementValues {
  return buildAdscSupply(0.34);
}

function legacyAdscCircuit(c: ElectricalMeasurementCircuit): AdscMeasurementValues {
  return buildAdscCircuit(c, 0.33);
}

function legacyRcd(r: ElectricalMeasurementRcd, circuitName: string): RcdMeasurementValues {
  return {
    ...buildRcdValues(0.33, circuitName),
    testResult: "Zadziałał",
  };
}

export function resolveAdscSupplyValues(m: ElectricalMeasurement): AdscMeasurementValues {
  if (m.valueSet?.adscSupply) return m.valueSet.adscSupply;
  return legacyAdscSupply();
}

export function resolveAdscCircuitValues(m: ElectricalMeasurement, circuit: ElectricalMeasurementCircuit): AdscMeasurementValues {
  const stored = m.valueSet?.adscByCircuitId?.[circuit.id];
  if (stored) return stored;
  return legacyAdscCircuit(circuit);
}

export function resolveResistanceSupplyValues(m: ElectricalMeasurement): ResistanceMeasurementValues {
  if (m.valueSet?.resistanceSupply) return m.valueSet.resistanceSupply;
  return resistance1fDefaults();
}

export function resolveResistanceCircuitValues(
  m: ElectricalMeasurement,
  circuit: ElectricalMeasurementCircuit,
): ResistanceMeasurementValues {
  const stored = m.valueSet?.resistanceByCircuitId?.[circuit.id];
  if (stored) return stored;
  return circuit.type === "socket-3f" ? resistance3fAllHigh() : resistance1fDefaults();
}

export function resolveRcdValues(m: ElectricalMeasurement, rcd: ElectricalMeasurementRcd): RcdMeasurementValues {
  const stored = m.valueSet?.rcdByRcdId?.[rcd.id];
  if (stored) return stored;
  return legacyRcd(rcd, defaultRcdCircuitName(m));
}

export function patchAdscSupplyValues(
  m: ElectricalMeasurement,
  patch: Partial<AdscMeasurementValues>,
): ElectricalMeasurement {
  if (!m.valueSet) return m;
  return {
    ...m,
    valueSet: {
      ...m.valueSet,
      adscSupply: { ...m.valueSet.adscSupply, ...patch },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function patchAdscCircuitValues(
  m: ElectricalMeasurement,
  circuitId: string,
  patch: Partial<AdscMeasurementValues>,
): ElectricalMeasurement {
  if (!m.valueSet) return m;
  const prev = m.valueSet.adscByCircuitId[circuitId];
  if (!prev) return m;
  return {
    ...m,
    valueSet: {
      ...m.valueSet,
      adscByCircuitId: {
        ...m.valueSet.adscByCircuitId,
        [circuitId]: { ...prev, ...patch },
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function patchRcdValues(
  m: ElectricalMeasurement,
  rcdId: string,
  patch: Partial<RcdMeasurementValues>,
): ElectricalMeasurement {
  if (!m.valueSet) return m;
  const prev = m.valueSet.rcdByRcdId[rcdId];
  if (!prev) return m;
  return {
    ...m,
    valueSet: {
      ...m.valueSet,
      rcdByRcdId: {
        ...m.valueSet.rcdByRcdId,
        [rcdId]: { ...prev, ...patch },
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

/** Eksport do testów — wykrywanie duplikatów Zs/Rs po zaokrągleniu. */
export function collectAdscZsValues(m: ElectricalMeasurement): number[] {
  if (!m.valueSet) return [];
  const out: number[] = [];
  const s = parseOhmPl(m.valueSet.adscSupply.zs);
  if (s != null) out.push(s);
  for (const c of m.circuits) {
    const v = m.valueSet.adscByCircuitId[c.id];
    if (v) {
      const n = parseOhmPl(v.zs);
      if (n != null) out.push(n);
    }
  }
  return out;
}

export function collectRcdRsValues(m: ElectricalMeasurement): number[] {
  if (!m.valueSet) return [];
  return m.rcds
    .map((r) => m.valueSet!.rcdByRcdId[r.id])
    .filter(Boolean)
    .map((v) => parseOhmPl(v!.rs))
    .filter((n): n is number => n != null);
}
