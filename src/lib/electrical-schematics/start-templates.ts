import { applyPreset, type CircuitPresetId } from "@/lib/electrical-schematics/circuit-presets";
import { parseSingleLineDiagram } from "@/lib/electrical-schematics/normalize";
import type { SchematicCircuit, SingleLineDiagram } from "@/lib/electrical-schematics/types";
import {
  DEFAULT_SCHEMATIC_TITLE,
  SCHEMATIC_SCHEMA_VERSION,
} from "@/lib/electrical-schematics/types";

/** SSOT szablonów startowych — DESIGN FREEZE § C */
export type SchematicStartTemplateId =
  | "template-apartment-3f-default"
  | "template-apartment-1f-default"
  | "template-commercial-3f-default";

export const SCHEMATIC_START_TEMPLATE_IDS: SchematicStartTemplateId[] = [
  "template-apartment-3f-default",
  "template-apartment-1f-default",
  "template-commercial-3f-default",
];

export interface SchematicStartTemplateCircuitSpec {
  sortOrder: number;
  presetId: CircuitPresetId;
  nameOverride?: string;
}

export interface SchematicStartTemplateDefinition {
  templateId: SchematicStartTemplateId;
  label: string;
  diagram: Omit<
    SingleLineDiagram,
    "id" | "address" | "documentDate" | "circuits" | "createdAt" | "updatedAt" | "jobId"
  >;
  circuits: SchematicStartTemplateCircuitSpec[];
}

function localIsoDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildCircuitFromSpec(spec: SchematicStartTemplateCircuitSpec): SchematicCircuit {
  const overrides = spec.nameOverride ? { name: spec.nameOverride } : undefined;
  return {
    id: crypto.randomUUID(),
    sortOrder: spec.sortOrder,
    ...applyPreset(spec.presetId, overrides),
  };
}

/** DESIGN FREEZE § C.1–C.3 — zamrożone definicje szablonów. */
export const SCHEMATIC_START_TEMPLATES: Record<SchematicStartTemplateId, SchematicStartTemplateDefinition> = {
  "template-apartment-3f-default": {
    templateId: "template-apartment-3f-default",
    label: "Mieszkanie 3F (domyślny)",
    diagram: {
      schemaVersion: SCHEMATIC_SCHEMA_VERSION,
      title: DEFAULT_SCHEMATIC_TITLE,
      status: "draft",
      linkStatus: "manual",
      layoutProfile: "apartment-3f-v1",
      supply: {
        phase: "3f",
        busLabel: "L1, L2, L3, N, PE",
        mainCableLabel: "YDYp 5x6mm²",
      },
      mainSwitch: { label: "FR 100A", ratedCurrentA: 100 },
      meter: { phases: 3, label: "KWh" },
      mainBreaker: {
        breakerType: "C",
        ratedCurrentA: 25,
        poles: 3,
        breakingCapacityKa: 6,
      },
      mainRcd: {
        ratedCurrentA: 25,
        sensitivityMa: 30,
        poles: 4,
        rcdType: "AC",
      },
    },
    circuits: [
      { sortOrder: 1, presetId: "electric-stove-3p" },
      { sortOrder: 2, presetId: "socket-230v", nameOverride: "GN 230V Salon" },
      { sortOrder: 3, presetId: "socket-230v", nameOverride: "GN 230V Pokój 1" },
      { sortOrder: 4, presetId: "socket-230v", nameOverride: "GN 230V Pokój 2" },
      { sortOrder: 5, presetId: "socket-230v", nameOverride: "GN 230V Kuchnia" },
      { sortOrder: 6, presetId: "lighting" },
    ],
  },
  "template-apartment-1f-default": {
    templateId: "template-apartment-1f-default",
    label: "Mieszkanie 1F (domyślny)",
    diagram: {
      schemaVersion: SCHEMATIC_SCHEMA_VERSION,
      title: DEFAULT_SCHEMATIC_TITLE,
      status: "draft",
      linkStatus: "manual",
      layoutProfile: "apartment-1f-v1",
      supply: {
        phase: "1f",
        busLabel: "L, N, PE",
        mainCableLabel: "YDYp 3x4mm²",
      },
      meter: { phases: 1, label: "KWh" },
      mainBreaker: {
        breakerType: "C",
        ratedCurrentA: 25,
        poles: 1,
        breakingCapacityKa: 6,
      },
      mainRcd: {
        ratedCurrentA: 25,
        sensitivityMa: 30,
        poles: 2,
        rcdType: "AC",
      },
    },
    circuits: [
      { sortOrder: 1, presetId: "socket-230v", nameOverride: "GN 230V Salon" },
      { sortOrder: 2, presetId: "socket-230v", nameOverride: "GN 230V Kuchnia" },
      { sortOrder: 3, presetId: "lighting", nameOverride: "OŚWIETLENIE" },
      { sortOrder: 4, presetId: "lighting", nameOverride: "OŚWIETLENIE" },
    ],
  },
  "template-commercial-3f-default": {
    templateId: "template-commercial-3f-default",
    label: "Lokal użytkowy 3F (domyślny)",
    diagram: {
      schemaVersion: SCHEMATIC_SCHEMA_VERSION,
      title: DEFAULT_SCHEMATIC_TITLE,
      status: "draft",
      linkStatus: "manual",
      layoutProfile: "commercial-3f-v1",
      supply: {
        phase: "3f",
        busLabel: "L1, L2, L3, N, PE",
        mainCableLabel: "YDYp 5x6mm²",
      },
      meter: { phases: 3, label: "KWh" },
      mainBreaker: {
        breakerType: "C",
        ratedCurrentA: 25,
        poles: 3,
        breakingCapacityKa: 6,
      },
      mainRcd: {
        ratedCurrentA: 63,
        sensitivityMa: 30,
        poles: 4,
        rcdType: "AC",
      },
    },
    circuits: [
      { sortOrder: 1, presetId: "socket-400v", nameOverride: "GN 400V" },
      { sortOrder: 2, presetId: "socket-400v", nameOverride: "GN 400V" },
      { sortOrder: 3, presetId: "socket-230v", nameOverride: "GN 230V" },
      { sortOrder: 4, presetId: "socket-230v", nameOverride: "GN 230V" },
      { sortOrder: 5, presetId: "lighting", nameOverride: "OŚWIETLENIE" },
    ],
  },
};

export function isSchematicStartTemplateId(value: string): value is SchematicStartTemplateId {
  return (SCHEMATIC_START_TEMPLATE_IDS as string[]).includes(value);
}

export function getSchematicStartTemplate(templateId: SchematicStartTemplateId): SchematicStartTemplateDefinition {
  return SCHEMATIC_START_TEMPLATES[templateId];
}

export interface BuildSchematicFromTemplateOptions {
  diagramId?: string;
  address?: string;
  jobId?: string;
  documentDate?: string;
}

/** Tworzy nowy `SingleLineDiagram` z szablonu startowego (znormalizowany). */
export function buildSchematicFromTemplate(
  templateId: SchematicStartTemplateId,
  options: BuildSchematicFromTemplateOptions = {},
): SingleLineDiagram {
  const template = getSchematicStartTemplate(templateId);
  const now = new Date().toISOString();
  const raw: SingleLineDiagram = {
    id: options.diagramId ?? crypto.randomUUID(),
    ...template.diagram,
    address: options.address ?? "",
    documentDate: options.documentDate ?? localIsoDate(),
    ...(options.jobId ? { jobId: options.jobId } : {}),
    circuits: template.circuits.map(buildCircuitFromSpec),
    createdAt: now,
    updatedAt: now,
  };
  const parsed = parseSingleLineDiagram(raw);
  if (!parsed) {
    throw new Error(`buildSchematicFromTemplate: failed to normalize ${templateId}`);
  }
  return parsed;
}
