/** Schematy jednokreskowe — typy domeny (≠ Pomiary EM, ≠ WM Druk ZI). WM-SCHEMATY-V1 */

export const ELECTRICAL_SCHEMATICS_KEY = "kw-electrical-schematics";

export const SCHEMATIC_SCHEMA_VERSION = 1 as const;

/** Domyślny nagłówek dokumentu (DESIGN FREEZE § A.5). */
export const DEFAULT_SCHEMATIC_TITLE = "SCHEMAT JEDNOKRESKOWY INSTALACJI ELEKTRYCZNEJ";

export type SchematicStatus = "draft" | "final";

export type SchematicLinkStatus = "linked" | "detached" | "manual";

/** MVP: apartment-* + commercial-3f-v1. V2: distribution-* (parse only, no renderer in MVP). */
export type SchematicLayoutProfile =
  | "apartment-1f-v1"
  | "apartment-3f-v1"
  | "commercial-3f-v1"
  | "distribution-r1-v1"
  | "distribution-r6-v1";

export type SchematicSupplyPhase = "1f" | "3f";

export type SchematicLoadKind =
  | "socket-1f"
  | "lighting-1f"
  | "cable-outlet-3f"
  | "socket-3f"
  | "reserve"
  | "other";

export type SchematicBreakerType = "B" | "C";

export type SchematicRcdType = "AC" | "A";

/** Import TEST-RAP — badge TEST w UI (DESIGN FREEZE § A.6). */
export interface SchematicFlags {
  test?: boolean;
}

/** V1.1 — nie w normalizacji MVP (schemaVersion 1). */
export type SchematicCircuitFeedFrom = "main-bus" | "rcd-bus";

/** V1.1 — nie w normalizacji MVP (schemaVersion 1). */
export type SchematicCircuitPosition = "before-rcd" | "after-rcd";

export const SCHEMATIC_STATUSES: SchematicStatus[] = ["draft", "final"];

export const SCHEMATIC_LINK_STATUSES: SchematicLinkStatus[] = ["linked", "detached", "manual"];

export const SCHEMATIC_LAYOUT_PROFILES: SchematicLayoutProfile[] = [
  "apartment-1f-v1",
  "apartment-3f-v1",
  "commercial-3f-v1",
  "distribution-r1-v1",
  "distribution-r6-v1",
];

/** Profile obsługiwane w rendererze MVP. */
export const SCHEMATIC_MVP_LAYOUT_PROFILES: SchematicLayoutProfile[] = [
  "apartment-1f-v1",
  "apartment-3f-v1",
  "commercial-3f-v1",
];

export const SCHEMATIC_SUPPLY_PHASES: SchematicSupplyPhase[] = ["1f", "3f"];

export const SCHEMATIC_LOAD_KINDS: SchematicLoadKind[] = [
  "socket-1f",
  "lighting-1f",
  "cable-outlet-3f",
  "socket-3f",
  "reserve",
  "other",
];

export const SCHEMATIC_BREAKER_TYPES: SchematicBreakerType[] = ["B", "C"];

export const SCHEMATIC_RCD_TYPES: SchematicRcdType[] = ["AC", "A"];

export interface SchematicSupply {
  phase: SchematicSupplyPhase;
  busLabel: string;
  mainCableLabel: string;
}

export interface SchematicMainSwitch {
  label: string;
  ratedCurrentA: number;
}

export interface SchematicMeter {
  phases: 1 | 3;
  label: string;
}

export interface SchematicMainBreaker {
  breakerType: SchematicBreakerType;
  ratedCurrentA: number;
  poles: 1 | 2 | 3;
  breakingCapacityKa: number;
}

export interface SchematicMainRcd {
  symbol?: string;
  ratedCurrentA: number;
  sensitivityMa: number;
  poles: 2 | 4;
  rcdType: SchematicRcdType;
}

/** SSOT modelu — WM-SCHEMATY-V1 DESIGN FREEZE § A.3 */
export interface SingleLineDiagram {
  id: string;
  schemaVersion: typeof SCHEMATIC_SCHEMA_VERSION;

  title: string;
  address: string;
  documentDate: string;
  notes?: string;
  status: SchematicStatus;
  flags?: SchematicFlags;

  jobId?: string;
  linkStatus: SchematicLinkStatus;
  sourceMeasurementId?: string;
  sourceMeasurementRef?: string;

  layoutProfile: SchematicLayoutProfile;

  supply: SchematicSupply;

  mainSwitch?: SchematicMainSwitch;

  meter: SchematicMeter;

  mainBreaker: SchematicMainBreaker;

  mainRcd: SchematicMainRcd;

  circuits: SchematicCircuit[];

  renderedSvg?: string;
  renderVersion?: number;

  createdAt: string;
  updatedAt: string;
}

export interface SchematicCircuit {
  id: string;
  sortOrder: number;
  name: string;
  presetId?: string;
  loadKind: SchematicLoadKind;
  breakerType: SchematicBreakerType;
  ratedCurrentA: number;
  poles: 1 | 3;
  breakingCapacityKa: number;
  cableLabel: string;
  description?: string;
}

export interface SchematicExportValidationResult {
  ok: boolean;
  missing: string[];
}

/** Raport zmian listy schematów (domena / sync). */
export interface SchematicDomainReport {
  added: string[];
  updated: string[];
  removed: string[];
}
