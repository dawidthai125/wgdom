/**
 * OUR RATE persistence guard — preserve valid ourWorkRate across whole-store LWW / stale writes.
 * NIE syntetyzuje z companyPricePln. NIE nadpisuje świeższego / obecnego ourWorkRate w target.
 */

import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import { normalizeOurWorkRate } from "@/lib/work-catalog/work-rate-normalize";
import { isOurRatePresent } from "@/lib/work-catalog/work-rate-freshness";

function workHasUsableOurRate(work: CatalogWork): boolean {
  const rate = work.ourWorkRate;
  return Boolean(rate && isOurRatePresent(rate.ourRatePln));
}

/**
 * Dla każdego workId+unit w target: jeśli target nie ma usable OUR RATE,
 * a donor ma — skopiuj znormalizowane ourWorkRate (additive preserve).
 */
export function preserveOurWorkRatesFromDonor(
  target: WorkCatalogStore,
  donor: WorkCatalogStore,
): WorkCatalogStore {
  let changed = false;
  const catalogs = { ...target.catalogs };

  for (const region of ["wroclaw", "dolnyslask"] as const) {
    const slice = catalogs[region];
    const donorSlice = donor.catalogs[region];
    if (!slice?.works?.length || !donorSlice?.works?.length) continue;

    const donorById = new Map(donorSlice.works.map((w) => [w.id, w]));
    let regionChanged = false;
    const works = slice.works.map((work) => {
      if (workHasUsableOurRate(work)) return work;
      const donorWork = donorById.get(work.id);
      if (!donorWork || donorWork.unit !== work.unit) return work;
      if (!workHasUsableOurRate(donorWork)) return work;
      const normalized = normalizeOurWorkRate(donorWork.ourWorkRate, work.id, work.unit);
      if (!normalized) return work;
      regionChanged = true;
      return { ...work, ourWorkRate: normalized };
    });

    if (regionChanged) {
      catalogs[region] = { ...slice, works };
      changed = true;
    }
  }

  return changed ? { ...target, catalogs } : target;
}
