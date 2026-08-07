/**
 * CATALOG-COVERAGE — Alias Resolver (pure / ephemeral).
 * Wave1 then Wave2 (DF CATALOG-WAVE-2) · DATA FIRST · Quotes gate.
 */

import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import {
  CATALOG_COVERAGE_P0C_WAVE1_PACK,
  type CatalogCoverageAliasPackRule,
} from "@/lib/catalog-coverage/alias-pack-wave1";
import {
  buildCatalogCoverageAliasPackCombined,
  CATALOG_COVERAGE_WAVE2_PACK,
} from "@/lib/catalog-coverage/alias-pack-wave2";
import type { CatalogWork } from "@/lib/work-catalog/types";

export interface CatalogCoverageAliasResolveResult {
  /** Trafienie Pack (tekst) — niezależnie od istnienia work. */
  matched: boolean;
  aliasRuleId: string | null;
  /** Product ID z Pack (1:1) — null gdy brak match. */
  packProductId: string | null;
  /**
   * Product ID do bindu Mappera — tylko gdy work aktywny + useful Quotes.
   * DATA FIRST + Quotes gate: brak work/Quotes ⇒ null (no-op).
   */
  resolvedProductId: string | null;
  labelPl: string | null;
  /** Diagnostyka: match tekstowy, ale brak work w Library. */
  missingWork: boolean;
  /** Diagnostyka: work jest, ale brak useful Quotes. */
  missingQuotes: boolean;
}

export interface CatalogCoverageAliasResolveOpts {
  /** Opis po Normalizer (preferowany) lub oryginał. */
  description: string;
  /** false / undefined ⇒ eligible; true ⇒ Resolver nie ewaluuje Pack. */
  isNoise?: boolean;
  /** Aktywne roboty z Library (odczyt) — do weryfikacji Product ID. */
  works?: readonly CatalogWork[] | null;
  /** Override Pack (testy) — domyślnie Wave1+Wave2. */
  pack?: readonly CatalogCoverageAliasPackRule[];
  /**
   * DF Wave2 Quotes gate. Default true.
   * false = tylko DATA FIRST (istnienie work) — legacy testy.
   */
  requireQuotes?: boolean;
}

const EMPTY: CatalogCoverageAliasResolveResult = {
  matched: false,
  aliasRuleId: null,
  packProductId: null,
  resolvedProductId: null,
  labelPl: null,
  missingWork: false,
  missingQuotes: false,
};

export const CATALOG_COVERAGE_ALIAS_PACK_DEFAULT = buildCatalogCoverageAliasPackCombined(
  CATALOG_COVERAGE_P0C_WAVE1_PACK,
  CATALOG_COVERAGE_WAVE2_PACK,
);

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

/** Useful Product Quotes (controlled_market / any origin with price&gt;0). */
export function catalogWorkHasUsefulQuotes(work: CatalogWork | null | undefined): boolean {
  const mq = work?.marketQuotes;
  if (!mq || typeof mq !== "object" || Array.isArray(mq)) return false;
  for (const byR of Object.values(mq)) {
    if (!byR || typeof byR !== "object" || Array.isArray(byR)) continue;
    for (const s of Object.values(byR as Record<string, unknown>)) {
      if (
        s &&
        typeof s === "object" &&
        typeof (s as { price?: unknown }).price === "number" &&
        ((s as { price: number }).price as number) > 0
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Deterministyczny Alias Resolver — first match w kolejności Pack.
 * Pure · idempotentny · bez I/O / zapisu.
 */
export function resolveCatalogCoverageAlias(
  opts: CatalogCoverageAliasResolveOpts,
): CatalogCoverageAliasResolveResult {
  if (opts.isNoise) return { ...EMPTY };

  const pack = opts.pack ?? CATALOG_COVERAGE_ALIAS_PACK_DEFAULT;
  const requireQuotes = opts.requireQuotes !== false;
  const folded = foldPolishText(opts.description || "");
  if (!folded) return { ...EMPTY };

  let hit: CatalogCoverageAliasPackRule | null = null;
  for (const rule of pack) {
    if (rule.test(folded)) {
      hit = rule;
      break;
    }
  }
  if (!hit) return { ...EMPTY };

  const byId = indexActiveWorks(opts.works);
  const work = byId.get(hit.productId) ?? null;
  const missingWork = !work;
  const missingQuotes = !!work && !catalogWorkHasUsefulQuotes(work);
  const resolvedProductId =
    work && (!requireQuotes || catalogWorkHasUsefulQuotes(work)) ? hit.productId : null;

  return {
    matched: true,
    aliasRuleId: hit.aliasRuleId,
    packProductId: hit.productId,
    resolvedProductId,
    labelPl: hit.labelPl,
    missingWork,
    missingQuotes,
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
 * Diagnostyka overlap: ile reguł Pack trafia w ten sam hay.
 * Nie używane w torze mapowania — tylko testy / OV.
 */
export function countCatalogCoverageAliasHits(
  description: string,
  pack: readonly CatalogCoverageAliasPackRule[] = CATALOG_COVERAGE_ALIAS_PACK_DEFAULT,
): number {
  const folded = foldPolishText(description || "");
  let n = 0;
  for (const rule of pack) {
    if (rule.test(folded)) n += 1;
  }
  return n;
}
