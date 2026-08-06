/**
 * TechnologyDefinition store — TF-2 (in-memory B0).
 */

import { requireCapability } from "./definition-registry";
import type { TechnologyDefinition } from "./types";

const BY_ID = new Map<string, TechnologyDefinition>();

export function clearDefinitionRegistryForTests(): void {
  BY_ID.clear();
}

export function registerDefinition(def: TechnologyDefinition): TechnologyDefinition {
  const definitionId = String(def.definitionId || "").trim();
  const capabilityId = String(def.capabilityId || "").trim();
  if (!definitionId) throw new Error("definitionId required");
  requireCapability(capabilityId);
  const entry: TechnologyDefinition = {
    definitionId,
    capabilityId,
    namePl: String(def.namePl || definitionId).trim(),
    descriptionPl: def.descriptionPl?.trim() || undefined,
  };
  BY_ID.set(definitionId, entry);
  return entry;
}

export function getDefinition(definitionId: string): TechnologyDefinition | undefined {
  return BY_ID.get(String(definitionId || "").trim());
}

export function listDefinitions(): TechnologyDefinition[] {
  return [...BY_ID.values()].sort((a, b) => a.definitionId.localeCompare(b.definitionId));
}

export function requireDefinition(definitionId: string): TechnologyDefinition {
  const d = getDefinition(definitionId);
  if (!d) throw new Error(`unknown definitionId: ${definitionId}`);
  return d;
}
