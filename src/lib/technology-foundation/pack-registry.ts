/**
 * In-memory Pack registry — keyed by packId + packVersion (TF-8).
 * Durable: registerPack also upserts kw-technology-packs (cloud authority via sync).
 */

import { assertCapabilitiesExist } from "./definition-registry";
import { normalizeTechnologyPack } from "./pack-schema";
import { requireDefinition } from "./technology-definition";
import type { TechnologyPack } from "./types";
import {
  loadTechnologyPackDurableStoreLocal,
  upsertTechnologyPackDurable,
} from "./technology-pack-store";

const BY_KEY = new Map<string, TechnologyPack>();

function packKey(packId: string, packVersion: string): string {
  return `${packId}@@${packVersion}`;
}

export function clearPackRegistryForTests(): void {
  BY_KEY.clear();
}

/**
 * Register pack in memory + durable store.
 * Same packId@@packVersion: idempotent if already registered (no throw on hydrate).
 * New pack: immutable once registered in-memory; durable upsert is append-only for new keys.
 */
export function registerPack(raw: TechnologyPack): TechnologyPack {
  const pack = normalizeTechnologyPack(raw);
  requireDefinition(pack.definitionId);
  assertCapabilitiesExist(pack.packCapabilities);
  const key = packKey(pack.packId, pack.packVersion);
  const existing = BY_KEY.get(key);
  if (existing) {
    return existing;
  }
  BY_KEY.set(key, pack);
  try {
    upsertTechnologyPackDurable(pack);
  } catch {
    /* durable optional in constrained test envs — memory still holds */
  }
  void pushTechnologyPackStoreToCloudSafe();
  return pack;
}

/** Hydrate memory registry from durable LS/cloud store (cold start). */
export function hydratePackRegistryFromDurable(): number {
  const store = loadTechnologyPackDurableStoreLocal();
  let n = 0;
  for (const pack of store.packs) {
    const key = packKey(pack.packId, pack.packVersion);
    if (BY_KEY.has(key)) continue;
    try {
      requireDefinition(pack.definitionId);
      assertCapabilitiesExist(pack.packCapabilities);
      BY_KEY.set(key, normalizeTechnologyPack(pack));
      n += 1;
    } catch {
      /* skip packs whose definitions are not seeded yet */
    }
  }
  return n;
}

async function pushTechnologyPackStoreToCloudSafe(): Promise<void> {
  try {
    const { persistKey, isSupabaseConfigured } = await import("@/lib/cloud-sync");
    if (!isSupabaseConfigured()) return;
    const { TECHNOLOGY_PACK_STORAGE_KEY, loadTechnologyPackDurableStoreLocal: load } =
      await import("./technology-pack-store");
    await persistKey(TECHNOLOGY_PACK_STORAGE_KEY, load());
  } catch {
    /* offline / test — local durable still OK */
  }
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
