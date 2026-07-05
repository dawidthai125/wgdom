/**
 * P2.10 — mutacja ulubionej roboty (app layer; P1 lib zamrożony).
 */

import {
  withFreshnessStatus,
  type CatalogWork,
  type WorkCatalogStore,
} from "@/lib/work-catalog";

/** Immutable patch pola `favorite` jednej roboty w aktywnym regionie store. */
export function patchWorkFavoriteInStore(
  store: WorkCatalogStore,
  workId: string,
  favorite: boolean,
  updatedAtIso: string,
  nowMs: number = Date.now(),
): WorkCatalogStore | null {
  const region = store.activeRegion;
  const slice = store.catalogs[region];
  const index = slice.works.findIndex((work) => work.id === workId);
  if (index < 0) return null;

  const previous = slice.works[index];
  if (previous.favorite === favorite) {
    return store;
  }

  const updatedWork: CatalogWork = withFreshnessStatus(
    {
      ...previous,
      favorite,
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
