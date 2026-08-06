/**
 * Pack lifecycle transitions — TF-7 (contract only, no UI).
 */

import type { TechnologyPack, TechnologyPackLifecycle } from "./types";

const ALLOWED: Record<TechnologyPackLifecycle, readonly TechnologyPackLifecycle[]> = {
  DRAFT: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["DEPRECATED", "ARCHIVED"],
  DEPRECATED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransitionLifecycle(
  from: TechnologyPackLifecycle,
  to: TechnologyPackLifecycle,
): boolean {
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}

export function transitionPackLifecycle(
  pack: TechnologyPack,
  to: TechnologyPackLifecycle,
): TechnologyPack {
  if (!canTransitionLifecycle(pack.lifecycle, to)) {
    throw new Error(`illegal lifecycle transition ${pack.lifecycle} → ${to}`);
  }
  return { ...pack, lifecycle: to };
}
