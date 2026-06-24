import type { SchematicLayoutProfile, SchematicStartTemplateId, SchematicStatus } from "@/lib/electrical-schematics/types";
import { CIRCUIT_PRESETS, type CircuitPresetId } from "@/lib/electrical-schematics/circuit-presets";
import { SCHEMATIC_START_TEMPLATES } from "@/lib/electrical-schematics/start-templates";

/** Layouty z rendererem MVP (bez commercial / R1 / R6). */
export const SCHEMATIC_UI_LAYOUT_PROFILES: SchematicLayoutProfile[] = [
  "apartment-1f-v1",
  "apartment-3f-v1",
];

export const SCHEMATIC_UI_START_TEMPLATE_IDS: SchematicStartTemplateId[] = [
  "template-apartment-3f-default",
  "template-apartment-1f-default",
];

export const SCHEMATIC_STATUS_LABELS: Record<SchematicStatus, string> = {
  draft: "Roboczy",
  final: "Finalny",
};

export const SCHEMATIC_LAYOUT_PROFILE_LABELS: Record<SchematicLayoutProfile, string> = {
  "apartment-1f-v1": "Mieszkanie 1F",
  "apartment-3f-v1": "Mieszkanie 3F",
  "commercial-3f-v1": "Lokal użytkowy 3F",
  "distribution-r1-v1": "Rozdzielnia R1",
  "distribution-r6-v1": "Rozdzielnia R6",
};

export function schematicStartTemplateLabel(templateId: SchematicStartTemplateId): string {
  return SCHEMATIC_START_TEMPLATES[templateId]?.label ?? templateId;
}

export function circuitPresetLabel(presetId: CircuitPresetId): string {
  return CIRCUIT_PRESETS[presetId]?.name ?? presetId;
}
