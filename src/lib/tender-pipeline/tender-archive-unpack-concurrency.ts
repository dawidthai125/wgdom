/**
 * NG11-Q2 — bounded parallel archive unpack for dossier ZIP/7Z branches.
 * Workers return immutable outcomes; candidate merge stays serial in resolver.
 */

import { mapWithConcurrency } from "@/lib/tender-platform-adapters";
import { isPipelinePerfUnpackParallelEnabled } from "@/lib/app-settings";

/** Frozen NG11-Q2 — osobna pula unpack archiwów. */
export const DOSSIER_ARCHIVE_UNPACK_CONCURRENCY = 2;

let testForceFlag: boolean | null = null;
let activeWorkers = 0;
let maxActiveWorkers = 0;

/** Test-only — override feature flag read. */
export function forcePipelineUnpackParallelForTests(value: boolean | null): void {
  testForceFlag = value;
}

/** Test-only — reset worker telemetry. */
export function resetUnpackConcurrencyTelemetryForTests(): void {
  activeWorkers = 0;
  maxActiveWorkers = 0;
}

/** Test-only — peak concurrent workers in last run. */
export function getMaxUnpackConcurrencyForTests(): number {
  return maxActiveWorkers;
}

/** NG11-Q2 — parallel archive unpack (default OFF). */
export function isPipelineUnpackParallelEnabled(): boolean {
  if (testForceFlag !== null) return testForceFlag;
  return isPipelinePerfUnpackParallelEnabled();
}

export interface ImmutableArchiveUnpackOutcome<R> {
  index: number;
  value: R | null;
  error: string | null;
}

/**
 * Run archive unpack workers with bounded concurrency.
 * Results preserve input order (deterministic serial merge).
 */
export async function runArchiveUnpackWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<{ value: R | null; error: string | null }>,
): Promise<ImmutableArchiveUnpackOutcome<R>[]> {
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
