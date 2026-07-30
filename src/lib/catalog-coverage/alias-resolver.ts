/**
 * CATALOG-COVERAGE-01 P0c — Alias Resolver (pure / ephemeral).
 * DF: Alias → Product ID · deterministyczny · first match · eligible only.
 * Zakaz: zapis Library/Quotes · heurystyki · AI · rankingi · Wave 2/BIZ/HIGH.
 */

import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import {
  CATALOG_COVERAGE_P0C_WAVE1_PACK,
  type CatalogCoverageAliasPackRule,
  type CatalogCoverageAliasRuleId,
} from "@/lib/catalog-coverage/alias-pack-wave1";
import type { CatalogWork } from "@/lib/work-catalog/types";

export interface CatalogCoverageAliasResolveResult {
  /** Trafienie Pack (tekst) — niezależnie od istnienia work. */
  matched: boolean;
  aliasRuleId: CatalogCoverageAliasRuleId | null;
  /** Product ID z Pack (1:1) — null gdy brak match. */
  packProductId: string | null;
  /**
   * Product ID do bindu Mappera — tylko gdy work aktywny istnieje w Library.
   * DATA FIRST: brak work ⇒ null (no-op).
   */
  resolvedProductId: string | null;
  labelPl: string | null;
  /** Diagnostyka: match tekstowy, ale brak work w Library. */
  missingWork: boolean;
}

export interface CatalogCoverageAliasResolveOpts {
  /** Opis po Normalizer (preferowany) lub oryginał. */
  description: string;
  /** false / undefined ⇒ eligible; true ⇒ Resolver nie ewaluuje Pack. */
  isNoise?: boolean;
  /** Aktywne roboty z Library (odczyt) — do weryfikacji Product ID. */
  works?: readonly CatalogWork[] | null;
  /** Override Pack (testy) — domyślnie Wave 1 SSOT. */
  pack?: readonly CatalogCoverageAliasPackRule[];
}

const EMPTY: CatalogCoverageAliasResolveResult = {
  matched: false,
  aliasRuleId: null,
  packProductId: null,
  resolvedProductId: null,
  labelPl: null,
  missingWork: false,
};

function indexActiveWorks(
  works: readonly CatalogWork[] | null | undefined,
): Map<string, CatalogWork> {
  const map = new Map<string, CatalogWork>();
  if (!works) return map;
  for (const w of works) {
    if (w?.id && w.active !== false) map.set(w.id, w);
  }
  return map;
}

/**
 * Deterministyczny Alias Resolver — first match w kolejności Pack.
 * Pure · idempotentny · bez I/O / zapisu.
 */
export function resolveCatalogCoverageAlias(
  opts: CatalogCoverageAliasResolveOpts,
): CatalogCoverageAliasResolveResult {
  if (opts.isNoise) return { ...EMPTY };

  const pack = opts.pack ?? CATALOG_COVERAGE_P0C_WAVE1_PACK;
  const folded = foldPolishText(opts.description || "");
  if (!folded) return { ...EMPTY };

  let hit: CatalogCoverageAliasPackRule | null = null;
  for (const rule of pack) {
    if (rule.test(folded)) {
      hit = rule;
      break; // first match wins — bez rankingu
    }
  }
  if (!hit) return { ...EMPTY };

  const byId = indexActiveWorks(opts.works);
  const work = byId.get(hit.productId) ?? null;
  const resolvedProductId = work ? hit.productId : null;

  return {
    matched: true,
    aliasRuleId: hit.aliasRuleId,
    packProductId: hit.productId,
    resolvedProductId,
    labelPl: hit.labelPl,
    missingWork: !work,
  };
}

/** Idempotencja: podwójny resolve na tym samym wejściu. */
export function resolveCatalogCoverageAliasStable(
  opts: CatalogCoverageAliasResolveOpts,
): CatalogCoverageAliasResolveResult {
  const a = resolveCatalogCoverageAlias(opts);
  const b = resolveCatalogCoverageAlias({
    ...opts,
    description: opts.description,
  });
  if (
    a.aliasRuleId !== b.aliasRuleId ||
    a.resolvedProductId !== b.resolvedProductId ||
    a.packProductId !== b.packProductId
  ) {
    return a;
  }
  return b;
}

/**
 * Diagnostyka overlap: ile reguł Pack trafia w ten sam hay (powinno być ≤1 na Wave 1).
 * Nie używane w torze mapowania — tylko testy / OV.
 */
export function countCatalogCoverageAliasHits(
  description: string,
  pack: readonly CatalogCoverageAliasPackRule[] = CATALOG_COVERAGE_P0C_WAVE1_PACK,
): number {
  const folded = foldPolishText(description || "");
  let n = 0;
  for (const rule of pack) {
    if (rule.test(folded)) n += 1;
  }
  return n;
}
