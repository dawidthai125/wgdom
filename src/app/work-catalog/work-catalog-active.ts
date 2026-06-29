/**
 * P2.3 — mutacja aktywności roboty (app layer; P1 lib zamrożony).
 */

import {
  withFreshnessStatus,
  type CatalogWork,
  type WorkCatalogStore,
} from "@/lib/work-catalog";

/** Immutable patch pola `active` jednej roboty w aktywnym regionie store. */
export function patchWorkActiveInStore(
  store: WorkCatalogStore,
  workId: string,
  active: boolean,
  updatedAtIso: string,
  nowMs: number = Date.now(),
): WorkCatalogStore | null {
  const region = store.activeRegion;
  const slice = store.catalogs[region];
  const index = slice.works.findIndex((work) => work.id === workId);
  if (index < 0) return null;

  const previous = slice.works[index];
  if (previous.active === active) {
    return store;
  }

  const updatedWork: CatalogWork = withFreshnessStatus(
    {
      ...previous,
      active,
      updatedAt: updatedAtIso,
    },
    nowMs,
  );

  const works = [...slice.works];
  works[index] = updatedWork;

  return {
    ...store,
    updatedAt: updatedAtIso,
    catalogs: {
      ...store.catalogs,
      [region]: {
        ...slice,
        works,
        updatedAt: updatedAtIso,
      },
    },
  };
}
