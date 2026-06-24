import type { SchematicCircuit, SchematicDomainReport, SingleLineDiagram } from "@/lib/electrical-schematics/types";
import { parseSingleLineDiagram } from "@/lib/electrical-schematics/normalize";

export function localIsoDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function emptySchematicDomainReport(): SchematicDomainReport {
  return { added: [], updated: [], removed: [] };
}

/** Diff list schematów po id — raport added / updated / removed. */
export function computeSchematicDomainReport(
  before: SingleLineDiagram[],
  after: SingleLineDiagram[],
): SchematicDomainReport {
  const beforeMap = new Map(before.map((d) => [d.id, d]));
  const afterMap = new Map(after.map((d) => [d.id, d]));

  const added: string[] = [];
  const updated: string[] = [];
  const removed: string[] = [];

  for (const [id, next] of afterMap) {
    const prev = beforeMap.get(id);
    if (!prev) {
      added.push(id);
      continue;
    }
    if (next.updatedAt !== prev.updatedAt || JSON.stringify(next) !== JSON.stringify(prev)) {
      updated.push(id);
    }
  }

  for (const id of beforeMap.keys()) {
    if (!afterMap.has(id)) removed.push(id);
  }

  return { added, updated, removed };
}

export function touchSchematic(
  diagram: SingleLineDiagram,
  patch: Partial<Omit<SingleLineDiagram, "id" | "createdAt">>,
): SingleLineDiagram {
  const merged = {
    ...diagram,
    ...patch,
    circuits: patch.circuits ?? diagram.circuits,
    supply: patch.supply ?? diagram.supply,
    meter: patch.meter ?? diagram.meter,
    mainBreaker: patch.mainBreaker ?? diagram.mainBreaker,
    mainRcd: patch.mainRcd ?? diagram.mainRcd,
    updatedAt: new Date().toISOString(),
  };
  const parsed = parseSingleLineDiagram(merged);
  if (!parsed) throw new Error("touchSchematic: normalize failed");
  return parsed;
}

export function upsertSchematic(
  schematics: SingleLineDiagram[],
  next: SingleLineDiagram,
): { schematics: SingleLineDiagram[]; report: SchematicDomainReport } {
  const before = [...schematics];
  const idx = schematics.findIndex((d) => d.id === next.id);
  let after: SingleLineDiagram[];
  if (idx >= 0) {
    after = [...schematics];
    after[idx] = { ...next, createdAt: schematics[idx].createdAt };
  } else {
    after = [next, ...schematics];
  }
  return {
    schematics: after,
    report: computeSchematicDomainReport(before, after),
  };
}

export function removeSchematic(
  schematics: SingleLineDiagram[],
  id: string,
): { schematics: SingleLineDiagram[]; report: SchematicDomainReport } {
  const before = [...schematics];
  const after = schematics.filter((d) => d.id !== id);
  return {
    schematics: after,
    report: computeSchematicDomainReport(before, after),
  };
}

/** DESIGN FREEZE § E — duplikacja schematu. */
export function duplicateSchematic(
  source: SingleLineDiagram,
  options: { jobId?: string; address?: string; sourceRefNote?: string } = {},
): SingleLineDiagram {
  const now = new Date().toISOString();
  const hadLink = source.linkStatus === "linked" || source.linkStatus === "detached";
  const sourceRef =
    options.sourceRefNote ??
    (hadLink && source.sourceMeasurementRef
      ? `Kopia z: ${source.sourceMeasurementRef}`
      : undefined);

  const {
    sourceMeasurementId: _sourceMeasurementId,
    jobId: _jobId,
    renderedSvg: _renderedSvg,
    renderVersion: _renderVersion,
    ...base
  } = source;

  const circuits: SchematicCircuit[] = source.circuits.map((c) => ({
    ...c,
    id: crypto.randomUUID(),
  }));

  const raw: SingleLineDiagram = {
    ...base,
    id: crypto.randomUUID(),
    address: options.address ?? "",
    documentDate: localIsoDate(),
    status: "draft",
    linkStatus: "manual",
    ...(options.jobId ? { jobId: options.jobId } : {}),
    ...(sourceRef ? { sourceMeasurementRef: sourceRef } : {}),
    circuits,
    createdAt: now,
    updatedAt: now,
  };

  const parsed = parseSingleLineDiagram(raw);
  if (!parsed) throw new Error("duplicateSchematic: normalize failed");
  return parsed;
}

/** DESIGN FREEZE § E.5 — odłączenie od pomiaru (bez auto-sync). */
export function detachSchematicFromMeasurement(diagram: SingleLineDiagram): SingleLineDiagram {
  const ref = diagram.sourceMeasurementRef ?? diagram.sourceMeasurementId;
  const { sourceMeasurementId: _omit, ...withoutLink } = diagram;
  const parsed = parseSingleLineDiagram({
    ...withoutLink,
    linkStatus: "detached",
    sourceMeasurementRef: ref || undefined,
    updatedAt: new Date().toISOString(),
  });
  if (!parsed) throw new Error("detachSchematicFromMeasurement: normalize failed");
  return parsed;
}

export function markSchematicFinal(diagram: SingleLineDiagram): SingleLineDiagram {
  return touchSchematic(diagram, { status: "final" });
}

export function markSchematicDraft(diagram: SingleLineDiagram): SingleLineDiagram {
  return touchSchematic(diagram, { status: "draft" });
}

export function filterSchematicsByStatus(
  schematics: SingleLineDiagram[],
  status: "all" | "draft" | "final",
): SingleLineDiagram[] {
  if (status === "all") return schematics;
  return schematics.filter((d) => d.status === status);
}
