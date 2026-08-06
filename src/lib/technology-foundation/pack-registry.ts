/**
 * In-memory Pack registry — keyed by packId + packVersion (TF-8).
 */

import { assertCapabilitiesExist } from "./definition-registry";
import { normalizeTechnologyPack } from "./pack-schema";
import { requireDefinition } from "./technology-definition";
import type { TechnologyPack } from "./types";

const BY_KEY = new Map<string, TechnologyPack>();

function packKey(packId: string, packVersion: string): string {
  return `${packId}@@${packVersion}`;
}

export function clearPackRegistryForTests(): void {
  BY_KEY.clear();
}

export function registerPack(raw: TechnologyPack): TechnologyPack {
  const pack = normalizeTechnologyPack(raw);
  requireDefinition(pack.definitionId);
  assertCapabilitiesExist(pack.packCapabilities);
  const key = packKey(pack.packId, pack.packVersion);
  if (BY_KEY.has(key)) {
    throw new Error(`TF-8: pack already registered ${key} — immutable, use createNextVersion`);
  }
  BY_KEY.set(key, pack);
  return pack;
}

export function getPack(packId: string, packVersion: string): TechnologyPack | undefined {
  return BY_KEY.get(packKey(packId, packVersion));
}

export function requirePack(packId: string, packVersion: string): TechnologyPack {
  const p = getPack(packId, packVersion);
  if (!p) throw new Error(`unknown pack ${packId}@${packVersion}`);
  return p;
}

export function listPackVersions(packId: string): TechnologyPack[] {
  const id = String(packId || "").trim();
  return [...BY_KEY.values()]
    .filter((p) => p.packId === id)
    .sort((a, b) => a.packVersion.localeCompare(b.packVersion));
}

export function listAllPacks(): TechnologyPack[] {
  return [...BY_KEY.values()].sort((a, b) =>
    `${a.packId}@${a.packVersion}`.localeCompare(`${b.packId}@${b.packVersion}`),
  );
}
