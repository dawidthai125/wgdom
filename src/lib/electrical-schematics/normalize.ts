import type {
  SchematicBreakerType,
  SchematicLayoutProfile,
  SchematicLinkStatus,
  SchematicLoadKind,
  SchematicMainBreaker,
  SchematicMainRcd,
  SchematicMainSwitch,
  SchematicMeter,
  SchematicRcdType,
  SchematicStatus,
  SchematicSupply,
  SchematicSupplyPhase,
  SchematicCircuit,
  SchematicExportValidationResult,
  SchematicFlags,
  SingleLineDiagram,
} from "@/lib/electrical-schematics/types";
import {
  DEFAULT_SCHEMATIC_TITLE,
  SCHEMATIC_BREAKER_TYPES,
  SCHEMATIC_LAYOUT_PROFILES,
  SCHEMATIC_LINK_STATUSES,
  SCHEMATIC_LOAD_KINDS,
  SCHEMATIC_MVP_LAYOUT_PROFILES,
  SCHEMATIC_RCD_TYPES,
  SCHEMATIC_SCHEMA_VERSION,
  SCHEMATIC_STATUSES,
  SCHEMATIC_SUPPLY_PHASES,
} from "@/lib/electrical-schematics/types";

function parseStringField(raw: unknown, fallback = ""): string {
  return typeof raw === "string" ? raw : fallback;
}

function parsePositiveInt(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  return Math.max(1, Math.floor(raw));
}

function parseBreakerPoles(raw: unknown, fallback: 1 | 2 | 3): 1 | 2 | 3 {
  if (raw === 1 || raw === 2 || raw === 3) return raw;
  return fallback;
}

function parseCircuitPoles(raw: unknown, fallback: 1 | 3): 1 | 3 {
  if (raw === 1 || raw === 3) return raw;
  return fallback;
}

function parseMeterPhases(raw: unknown, supplyPhase: SchematicSupplyPhase): 1 | 3 {
  if (raw === 1 || raw === 3) return raw;
  return supplyPhase === "3f" ? 3 : 1;
}

function parseRcdPoles(raw: unknown, supplyPhase: SchematicSupplyPhase): 2 | 4 {
  if (raw === 2 || raw === 4) return raw;
  return supplyPhase === "3f" ? 4 : 2;
}

function parseIsoDate(raw: unknown): string {
  const s = parseStringField(raw);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function parseIsoDateTime(raw: unknown, fallback: string): string {
  const s = parseStringField(raw);
  if (s && !Number.isNaN(Date.parse(s))) return s;
  return fallback;
}

function renumberCircuitSortOrder(circuits: SchematicCircuit[]): SchematicCircuit[] {
  const sorted = [...circuits].sort((a, b) => a.sortOrder - b.sortOrder);
  return sorted.map((c, i) => ({ ...c, sortOrder: i + 1 }));
}

function parseSupply(raw: unknown, layoutProfile: SchematicLayoutProfile): SchematicSupply {
  const is3f =
    layoutProfile === "apartment-3f-v1" ||
    layoutProfile === "commercial-3f-v1" ||
    layoutProfile === "distribution-r6-v1";
  const defaultPhase: SchematicSupplyPhase = is3f ? "3f" : "1f";
  if (!raw || typeof raw !== "object") {
    return {
      phase: defaultPhase,
      busLabel: defaultPhase === "3f" ? "L1, L2, L3, N, PE" : "L, N, PE",
      mainCableLabel: defaultPhase === "3f" ? "YDYp 5x6mm²" : "YDYp 3x4mm²",
    };
  }
  const r = raw as Partial<SchematicSupply>;
  const phase = SCHEMATIC_SUPPLY_PHASES.includes(r.phase as SchematicSupplyPhase)
    ? (r.phase as SchematicSupplyPhase)
    : defaultPhase;
  return {
    phase,
    busLabel: parseStringField(
      r.busLabel,
      phase === "3f" ? "L1, L2, L3, N, PE" : "L, N, PE",
    ),
    mainCableLabel: parseStringField(
      r.mainCableLabel,
      phase === "3f" ? "YDYp 5x6mm²" : "YDYp 3x4mm²",
    ),
  };
}

function parseMainSwitch(raw: unknown): SchematicMainSwitch | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Partial<SchematicMainSwitch>;
  const label = parseStringField(r.label).trim();
  if (!label) return undefined;
  return {
    label,
    ratedCurrentA: parsePositiveInt(r.ratedCurrentA, 63),
  };
}

function parseMeter(raw: unknown, supply: SchematicSupply): SchematicMeter {
  if (!raw || typeof raw !== "object") {
    return {
      phases: supply.phase === "3f" ? 3 : 1,
      label: "KWh",
    };
  }
  const r = raw as Partial<SchematicMeter>;
  return {
    phases: parseMeterPhases(r.phases, supply.phase),
    label: parseStringField(r.label, "KWh"),
  };
}

function parseMainBreaker(raw: unknown, supply: SchematicSupply): SchematicMainBreaker {
  const defaultPoles: 1 | 2 | 3 = supply.phase === "3f" ? 3 : 1;
  if (!raw || typeof raw !== "object") {
    return {
      breakerType: "C",
      ratedCurrentA: 25,
      poles: defaultPoles,
      breakingCapacityKa: 6,
    };
  }
  const r = raw as Partial<SchematicMainBreaker>;
  const breakerType = SCHEMATIC_BREAKER_TYPES.includes(r.breakerType as SchematicBreakerType)
    ? (r.breakerType as SchematicBreakerType)
    : "C";
  return {
    breakerType,
    ratedCurrentA: parsePositiveInt(r.ratedCurrentA, 25),
    poles: parseBreakerPoles(r.poles, defaultPoles),
    breakingCapacityKa: parsePositiveInt(r.breakingCapacityKa, 6),
  };
}

function parseMainRcd(raw: unknown, supply: SchematicSupply): SchematicMainRcd {
  if (!raw || typeof raw !== "object") {
    return {
      ratedCurrentA: 25,
      sensitivityMa: 30,
      poles: parseRcdPoles(undefined, supply.phase),
      rcdType: "AC",
    };
  }
  const r = raw as Partial<SchematicMainRcd>;
  const rcdType = SCHEMATIC_RCD_TYPES.includes(r.rcdType as SchematicRcdType)
    ? (r.rcdType as SchematicRcdType)
    : "AC";
  const symbol = parseStringField(r.symbol).trim();
  return {
    ...(symbol ? { symbol } : {}),
    ratedCurrentA: parsePositiveInt(r.ratedCurrentA, 25),
    sensitivityMa: parsePositiveInt(r.sensitivityMa, 30),
    poles: parseRcdPoles(r.poles, supply.phase),
    rcdType,
  };
}

function parseCircuit(raw: unknown, fallbackOrder: number): SchematicCircuit | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<SchematicCircuit>;
  if (!r.id) return null;
  const loadKind = SCHEMATIC_LOAD_KINDS.includes(r.loadKind as SchematicLoadKind)
    ? (r.loadKind as SchematicLoadKind)
    : "socket-1f";
  const breakerType = SCHEMATIC_BREAKER_TYPES.includes(r.breakerType as SchematicBreakerType)
    ? (r.breakerType as SchematicBreakerType)
    : "B";
  const sortOrder =
    typeof r.sortOrder === "number" && Number.isFinite(r.sortOrder)
      ? Math.max(1, Math.floor(r.sortOrder))
      : fallbackOrder;
  const name = parseStringField(r.name).trim();
  const cableLabel = parseStringField(r.cableLabel).trim();
  const presetId = parseStringField(r.presetId).trim();
  const description = parseStringField(r.description).trim();
  return {
    id: String(r.id),
    sortOrder,
    name,
    ...(presetId ? { presetId } : {}),
    loadKind,
    breakerType,
    ratedCurrentA: parsePositiveInt(r.ratedCurrentA, 16),
    poles: parseCircuitPoles(r.poles, loadKind === "cable-outlet-3f" || loadKind === "socket-3f" ? 3 : 1),
    breakingCapacityKa: parsePositiveInt(r.breakingCapacityKa, 6),
    cableLabel,
    ...(description ? { description } : {}),
  };
}

function parseLayoutProfile(raw: unknown): SchematicLayoutProfile {
  if (SCHEMATIC_LAYOUT_PROFILES.includes(raw as SchematicLayoutProfile)) {
    return raw as SchematicLayoutProfile;
  }
  return "apartment-3f-v1";
}

function normalizeLinkFields(
  linkStatus: SchematicLinkStatus,
  sourceMeasurementId: string | undefined,
  sourceMeasurementRef: string | undefined,
): Pick<SingleLineDiagram, "linkStatus" | "sourceMeasurementId" | "sourceMeasurementRef"> {
  if (linkStatus === "linked") {
    const id = sourceMeasurementId?.trim();
    if (!id) {
      return {
        linkStatus: "manual",
        sourceMeasurementRef: sourceMeasurementRef?.trim() || undefined,
      };
    }
    return {
      linkStatus: "linked",
      sourceMeasurementId: id,
      sourceMeasurementRef: sourceMeasurementRef?.trim() || undefined,
    };
  }
  if (linkStatus === "detached") {
    return {
      linkStatus: "detached",
      sourceMeasurementRef: sourceMeasurementRef?.trim() || undefined,
    };
  }
  return {
    linkStatus: "manual",
    ...(sourceMeasurementRef?.trim() ? { sourceMeasurementRef: sourceMeasurementRef.trim() } : {}),
  };
}

/** DESIGN FREEZE § A.4 + § D.3 — pola wymagane do eksportu PDF / oznaczenia final. */
export function validateSchematicForExport(diagram: SingleLineDiagram): SchematicExportValidationResult {
  const missing: string[] = [];
  if (!diagram.address.trim()) missing.push("address");
  if (!diagram.layoutProfile) missing.push("layoutProfile");
  if (!diagram.supply?.phase) missing.push("supply.phase");
  if (!diagram.mainBreaker) missing.push("mainBreaker");
  if (!diagram.mainRcd) missing.push("mainRcd");
  if (!diagram.circuits.length) missing.push("circuits");
  diagram.circuits.forEach((c, i) => {
    if (!c.name.trim()) missing.push(`circuits[${i}].name`);
    if (!c.cableLabel.trim()) missing.push(`circuits[${i}].cableLabel`);
  });
  return { ok: missing.length === 0, missing };
}

export function parseSingleLineDiagram(raw: unknown): SingleLineDiagram | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<SingleLineDiagram>;
  if (!r.id) return null;

  const now = new Date().toISOString();
  const layoutProfile = parseLayoutProfile(r.layoutProfile);
  const supply = parseSupply(r.supply, layoutProfile);
  const status = SCHEMATIC_STATUSES.includes(r.status as SchematicStatus)
    ? (r.status as SchematicStatus)
    : "draft";
  const linkStatusRaw = SCHEMATIC_LINK_STATUSES.includes(r.linkStatus as SchematicLinkStatus)
    ? (r.linkStatus as SchematicLinkStatus)
    : "manual";
  const linkFields = normalizeLinkFields(
    linkStatusRaw,
    r.sourceMeasurementId ? String(r.sourceMeasurementId) : undefined,
    r.sourceMeasurementRef ? String(r.sourceMeasurementRef) : undefined,
  );

  const circuits: SchematicCircuit[] = [];
  if (Array.isArray(r.circuits)) {
    r.circuits.forEach((c, i) => {
      const parsed = parseCircuit(c, i + 1);
      if (parsed) circuits.push(parsed);
    });
  }

  const mainSwitch = parseMainSwitch(r.mainSwitch);
  const notes = parseStringField(r.notes).trim();
  const jobId = parseStringField(r.jobId).trim();
  const isTestFlag =
    r.flags && typeof r.flags === "object" && (r.flags as SchematicFlags).test === true;
  const renderedSvg = parseStringField(r.renderedSvg).trim();
  const renderVersion =
    typeof r.renderVersion === "number" && Number.isFinite(r.renderVersion)
      ? Math.floor(r.renderVersion)
      : undefined;

  const schemaVersion =
    r.schemaVersion === SCHEMATIC_SCHEMA_VERSION ? SCHEMATIC_SCHEMA_VERSION : SCHEMATIC_SCHEMA_VERSION;

  const titleRaw = parseStringField(r.title, DEFAULT_SCHEMATIC_TITLE);
  const addressRaw = parseStringField(r.address);

  return {
    id: String(r.id),
    schemaVersion,
    title: titleRaw.trim() === "" ? DEFAULT_SCHEMATIC_TITLE : titleRaw,
    address: addressRaw,
    documentDate: parseIsoDate(r.documentDate),
    ...(notes ? { notes } : {}),
    ...(isTestFlag ? { flags: { test: true } } : {}),
    status,
    ...(jobId ? { jobId } : {}),
    ...linkFields,
    layoutProfile,
    supply,
    ...(mainSwitch ? { mainSwitch } : {}),
    meter: parseMeter(r.meter, supply),
    mainBreaker: parseMainBreaker(r.mainBreaker, supply),
    mainRcd: parseMainRcd(r.mainRcd, supply),
    circuits: renumberCircuitSortOrder(circuits),
    ...(renderedSvg ? { renderedSvg } : {}),
    ...(renderVersion !== undefined ? { renderVersion } : {}),
    createdAt: parseIsoDateTime(r.createdAt, now),
    updatedAt: parseIsoDateTime(r.updatedAt, r.createdAt ? String(r.createdAt) : now),
  };
}

export function normalizeElectricalSchematics(raw: unknown): SingleLineDiagram[] {
  if (!Array.isArray(raw)) return [];
  const out: SingleLineDiagram[] = [];
  for (const item of raw) {
    const parsed = parseSingleLineDiagram(item);
    if (parsed) out.push(parsed);
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Czy profil ma renderer w MVP (Faza 2). */
export function isMvpLayoutProfile(profile: SchematicLayoutProfile): boolean {
  return SCHEMATIC_MVP_LAYOUT_PROFILES.includes(profile);
}
