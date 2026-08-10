/**
 * Filter TechnologyPack materials to a single materialKey (electrical V1).
 */

import type { TechnologyPack } from "./types";

export function filterPackRecipeForMaterialKey(
  pack: TechnologyPack,
  materialKey: string | null | undefined,
): TechnologyPack {
  if (!materialKey) return pack;
  const materials = pack.materials.filter((m) => m.materialKey === materialKey);
  return { ...pack, materials };
}
