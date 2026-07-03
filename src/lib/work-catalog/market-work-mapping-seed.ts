/**
 * P3.1-S4 — seed słownika mapowań (decyzja architekta D1: seed należy do S4).
 *
 * SSOT-safe · ZERO fabrykacji: seed zawiera wyłącznie self-mapping origin `wgdom`
 * (externalId = workId — kontraktowo tożsame dla adaptera wgdom) dla aktywnych
 * robót katalogu (SSOT: seed-manifest). Origin produktowe kb_pl/interbud/sekocenbud
 * pozostają PUSTE do czasu realnego importu CSV — nie wprowadzamy zmyślonych kodów.
 *
 * Pure · deterministyczny · bez I/O — `works` dostarcza wołający z załadowanego katalogu.
 */

import {
  createEmptyMarketWorkMappingStore,
  registerMapping,
  type MarketWorkMappingStore,
} from "@/lib/work-catalog/market-work-mapping";

export interface SeedCatalogWorkRef {
  id: string;
  active?: boolean;
}

export interface CreateSeededMappingOptions {
  /** Roboty katalogu (SSOT). Bez nich seed jest pusty — brak fabrykowanych danych. */
  works?: readonly SeedCatalogWorkRef[];
  updatedAtIso?: string;
}

/** Origin migracyjny/produktowy self-map: adapter wgdom używa workId jako tożsamości. */
const SEED_ORIGIN = "wgdom" as const;
const SEED_UPDATED_AT = "2026-06-13T00:00:00.000Z";
const SEED_SELF_MAP_CONFIDENCE = 1;

/**
 * Buduje store mapowań zasilony self-mappingami `wgdom` (externalId = workId) dla
 * aktywnych robót. Nie tworzy żadnych mapowań dla origin produktowych bez danych.
 */
export function createSeededMarketWorkMappingStore(
  options: CreateSeededMappingOptions = {},
): MarketWorkMappingStore {
  const updatedAtIso = options.updatedAtIso ?? SEED_UPDATED_AT;
  let store = createEmptyMarketWorkMappingStore(updatedAtIso);

  for (const work of options.works ?? []) {
    if (work.active === false) continue;
    const id = typeof work.id === "string" ? work.id.trim() : "";
    if (!id) continue;

    const { store: next, result } = registerMapping(
      store,
      {
        origin: SEED_ORIGIN,
        externalId: id,
        workId: id,
        confidence: SEED_SELF_MAP_CONFIDENCE,
        aliases: [],
        updatedAt: updatedAtIso,
      },
      { updatedAtIso },
    );
    if (result.ok) store = next;
  }

  return store;
}
