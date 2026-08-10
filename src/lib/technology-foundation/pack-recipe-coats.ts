/**
 * Filter TechnologyPack recipe materials by resolved coats (01B).
 * Legacy lines (no coats) always included.
 */

import type { TechnologyPack } from "./types";

export type PaintCoats = 1 | 2;

/**
 * Returns a pack view with materials filtered for projection.
 * Does not mutate the registry pack.
 */
export function filterPackRecipeForCoats(
  pack: TechnologyPack,
  coats: PaintCoats | null | undefined,
): TechnologyPack {
  if (coats !== 1 && coats !== 2) {
    // No coats context: keep only legacy lines (undefined coats) so dual coat lines are not double-counted.
    const legacyOnly = pack.materials.filter((m) => m.coats !== 1 && m.coats !== 2);
    if (legacyOnly.length === pack.materials.length) return pack;
    return { ...pack, materials: legacyOnly };
  }
  const materials = pack.materials.filter(
    (m) => m.coats === undefined || m.coats === coats,
  );
  return { ...pack, materials };
}
