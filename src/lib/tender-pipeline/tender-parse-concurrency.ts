/**
 * NG11-Q1 — bounded parallel parse for dossier cost/metadata phases.
 * Workers return immutable outcomes; session merge stays serial in resolver.
 */

import { mapWithConcurrency } from "@/lib/tender-platform-adapters";
import { isPipelinePerfParseConcurrencyEnabled } from "@/lib/app-settings";

/** Frozen NG11-Q1 — osobna pula cost. */
export const DOSSIER_PARSE_COST_CONCURRENCY = 3;

/** Frozen NG11-Q1 — osobna pula metadata. */
export const DOSSIER_PARSE_METADATA_CONCURRENCY = 3;

let testForceFlag: boolean | null = null;
let activeWorkers = 0;
let maxActiveWorkers = 0;

/** Test-only — override feature flag read. */
export function forcePipelineParseConcurrencyForTests(value: boolean | null): void {
  testForceFlag = value;
}

/** Test-only — reset worker telemetry. */
export function resetParseConcurrencyTelemetryForTests(): void {
  activeWorkers = 0;
  maxActiveWorkers = 0;
}

/** Test-only — peak concurrent workers in last run. */
export function getMaxParseConcurrencyForTests(): number {
  return maxActiveWorkers;
}

/** NG11-Q1 — parallel parse loops (default OFF). */
export function isPipelineParseConcurrencyEnabled(): boolean {
  if (testForceFlag !== null) return testForceFlag;
  return isPipelinePerfParseConcurrencyEnabled();
}

export interface ImmutableParseWorkerOutcome<R> {
  index: number;
  value: R | null;
  error: string | null;
}

/**
 * Run parse workers with bounded concurrency.
 * Results preserve input order (deterministic serial merge).
 */
export async function runParseCandidatesWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<{ value: R | null; error: string | null }>,
): Promise<ImmutableParseWorkerOutcome<R>[]> {
  if (items.length === 0) return [];

  const results = await mapWithConcurrency(items, concurrency, async (item, index) => {
    activeWorkers += 1;
    maxActiveWorkers = Math.max(maxActiveWorkers, activeWorkers);
    try {
      const outcome = await fn(item, index);
      return { index, value: outcome.value, error: outcome.error };
    } finally {
      activeWorkers -= 1;
    }
  });
  return results;
}
