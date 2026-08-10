/**
 * TechnologyCapability registry — TF-6 (in-memory B0; no KV).
 */

import type { TechnologyCapability } from "./types";

const BY_ID = new Map<string, TechnologyCapability>();

export function clearCapabilityRegistryForTests(): void {
  BY_ID.clear();
}

export function registerCapability(cap: TechnologyCapability): TechnologyCapability {
  const capabilityId = String(cap.capabilityId || "").trim();
  if (!capabilityId) throw new Error("capabilityId required");
  const entry: TechnologyCapability = {
    capabilityId,
    namePl: String(cap.namePl || capabilityId).trim(),
    descriptionPl: cap.descriptionPl?.trim() || undefined,
  };
  BY_ID.set(capabilityId, entry);
  return entry;
}

export function getCapability(capabilityId: string): TechnologyCapability | undefined {
  return BY_ID.get(String(capabilityId || "").trim());
}

export function listCapabilities(): TechnologyCapability[] {
  return [...BY_ID.values()].sort((a, b) => a.capabilityId.localeCompare(b.capabilityId));
}

export function requireCapability(capabilityId: string): TechnologyCapability {
  const c = getCapability(capabilityId);
  if (!c) throw new Error(`unknown capabilityId: ${capabilityId}`);
  return c;
}

export function assertCapabilitiesExist(ids: string[]): void {
  for (const id of ids) {
    requireCapability(id);
  }
}

/** Seed B0 baseline capabilities (idempotent). */
export function seedBaselineCapabilities(): void {
  const seeds: TechnologyCapability[] = [
    {
      capabilityId: "cap.external_thermal_insulation",
      namePl: "Ocieplenie ścian zewnętrznych (ETICS)",
    },
    {
      capabilityId: "cap.paving_cubes",
      namePl: "Nawierzchnie z kostki brukowej",
    },
    {
      capabilityId: "cap.substrate_prep",
      namePl: "Przygotowanie podłoża",
    },
    {
      capabilityId: "cap.finishing_coat",
      namePl: "Warstwa wykończeniowa elewacji",
    },
    {
      capabilityId: "cap.interior_painting",
      namePl: "Malowanie wnętrz (emulsja/lateks)",
    },
  ];
  for (const s of seeds) registerCapability(s);
}
