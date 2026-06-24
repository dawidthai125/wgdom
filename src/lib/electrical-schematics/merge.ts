import { normalizeElectricalSchematics } from "@/lib/electrical-schematics/normalize";
import type { SingleLineDiagram } from "@/lib/electrical-schematics/types";

/** LWW merge per id — wzorzec electrical-measurements. */
export function mergeElectricalSchematics(local: unknown, cloud: unknown): SingleLineDiagram[] {
  const byId = new Map<string, SingleLineDiagram>();
  for (const item of normalizeElectricalSchematics(local)) byId.set(item.id, item);
  for (const item of normalizeElectricalSchematics(cloud)) {
    const prev = byId.get(item.id);
    if (!prev || item.updatedAt >= prev.updatedAt) byId.set(item.id, item);
  }
  return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function filterSchematicsForJob(schematics: SingleLineDiagram[], jobId: string): SingleLineDiagram[] {
  if (!jobId) return [];
  return schematics
    .filter((d) => d.jobId === jobId)
    .sort((a, b) => b.documentDate.localeCompare(a.documentDate) || b.updatedAt.localeCompare(a.updatedAt));
}

/** Test helper — roundtrip przez JSON jak localStorage. */
export function serializeElectricalSchematicsForStorage(schematics: SingleLineDiagram[]): SingleLineDiagram[] {
  return normalizeElectricalSchematics(JSON.parse(JSON.stringify(schematics)));
}

export function getSchematicById(
  schematics: SingleLineDiagram[],
  id: string,
): SingleLineDiagram | undefined {
  return schematics.find((d) => d.id === id);
}

export function getSchematicBySourceMeasurementId(
  schematics: SingleLineDiagram[],
  measurementId: string,
): SingleLineDiagram | undefined {
  if (!measurementId) return undefined;
  return schematics.find((d) => d.linkStatus === "linked" && d.sourceMeasurementId === measurementId);
}
