/**
 * Test helper — active legacy catalog slice (#5C-5C F2: getActiveCatalog removed from store).
 */
import { defaultWgdomCostCatalog } from "../../src/lib/wgdom-cost-catalog.ts";

export function activeCatalogFromStore(store, region = store.activeRegion) {
  return store.catalogs[region] ?? defaultWgdomCostCatalog(region);
}
