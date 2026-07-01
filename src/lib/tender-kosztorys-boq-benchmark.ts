/**
 * NG-04.2 — BOQ labor benchmark presentation helpers (#004 · #005 · #006).
 * resolve + cache builder only — UI consumes cache via BoqLaborBenchmarkBadge.
 */

import type { KosztorysBoqRowViewModel } from "@/lib/tender-kosztorys-boq-explorer";
import {
  compareLaborRateToBenchmark,
  type LaborBenchmarkComparison,
} from "@/lib/labor-benchmark";
import { normalizeWgdomCostUnit } from "@/lib/wgdom-cost-catalog";

/** Pure resolve — wołany wyłącznie z buildBoqLaborBenchmarkCache (nie z UI). */
export function resolveBoqRowLaborBenchmark(
  row: KosztorysBoqRowViewModel,
): LaborBenchmarkComparison | null {
  if (row.isUnknown || !row.pricing) return null;

  const labor = row.pricing.laborPlnPerUnit;
  if (labor == null || labor <= 0) return null;

  const unit = normalizeWgdomCostUnit(row.pricing.unit);
  if (!unit) return null;

  const comparison = compareLaborRateToBenchmark(
    labor,
    row.pricing.categoryId,
    unit,
  );
  if (comparison.status === "unavailable") return null;

  return comparison;
}

/** Derived UI cache — jedyny punkt masowego wyliczenia benchmarków (#005 · #006). */
export function buildBoqLaborBenchmarkCache(
  rows: readonly KosztorysBoqRowViewModel[],
): ReadonlyMap<string, LaborBenchmarkComparison> {
  const map = new Map<string, LaborBenchmarkComparison>();
  for (const row of rows) {
    const comparison = resolveBoqRowLaborBenchmark(row);
    if (comparison) map.set(row.rowKey, comparison);
  }
  return map;
}
