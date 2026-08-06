/**
 * Immutable Pack versioning — TF-8.
 * No in-place edit of an existing version. Only createNextVersion.
 */

import { normalizeTechnologyPack } from "./pack-schema";
import type { TechnologyPack } from "./types";

export type PackVersionPatch = Partial<
  Omit<TechnologyPack, "packId" | "packVersion">
>;

/**
 * Attempt to mutate fields of an existing pack object in place — FORBIDDEN.
 * Always throws (contract test R7).
 */
export function attemptEditPackInPlace(
  _pack: TechnologyPack,
  _patch: PackVersionPatch,
): never {
  throw new Error("TF-8: ACTIVE/any Pack version is immutable — use createNextVersion");
}

function bumpPatchVersion(version: string): string {
  const m = String(version).trim().match(/^(\d+)\.(\d+)(?:\.(\d+))?$/);
  if (!m) {
    return `${version}.1`;
  }
  const major = Number(m[1]);
  const minor = Number(m[2]);
  return `${major}.${minor + 1}`;
}

/**
 * Clone pack into a new immutable version (e.g. 1.0 → 1.1).
 * Does not mutate `previous`.
 */
export function createNextVersion(
  previous: TechnologyPack,
  patch: PackVersionPatch = {},
  nextVersion?: string,
): TechnologyPack {
  const version = nextVersion?.trim() || bumpPatchVersion(previous.packVersion);
  if (version === previous.packVersion) {
    throw new Error("TF-8: next packVersion must differ from previous");
  }

  const merged: TechnologyPack = {
    ...previous,
    ...patch,
    packId: previous.packId,
    packVersion: version,
    // New version starts DRAFT unless patch sets lifecycle
    lifecycle: patch.lifecycle ?? "DRAFT",
    packCapabilities: patch.packCapabilities ?? previous.packCapabilities,
    stages: patch.stages ?? previous.stages,
    steps: patch.steps ?? previous.steps,
    dependencies: patch.dependencies ?? previous.dependencies,
    materials: patch.materials ?? previous.materials,
    equipment: patch.equipment ?? previous.equipment,
    labour: patch.labour ?? previous.labour,
    regulatory: patch.regulatory ?? previous.regulatory,
  };

  return normalizeTechnologyPack(merged);
}
