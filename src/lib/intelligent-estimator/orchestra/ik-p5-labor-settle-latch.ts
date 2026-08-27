/**
 * P5 Labor settle latch — pure predicates for cancel / sticky-key race.
 *
 * Root cause addressed:
 * cleanup sets cancelled → skip setLabor/onSettled → same laborKey sticky
 * → permanent labor=null → UI "pending".
 *
 * REUSE pattern: ik-entry-p2-ingest-latch generation + invalidate.
 * ZERO APF / P7 / P8 / CatalogWork semantics.
 */

/** Stale when effect cleanup fired or a newer generation superseded this attempt. */
export function isP5LaborAttemptStale(opts: {
  cancelled: boolean;
  generation: number;
  runGenerationCurrent: number;
}): boolean {
  return opts.cancelled || opts.generation !== opts.runGenerationCurrent;
}

/**
 * Effect cleanup invalidate.
 * - Bump run generation when this attempt is still current (block late authoritative settle).
 * - Clear sticky laborAttemptedKey only when the attempt did not settle — enables same-key retry.
 * - Keep sticky after successful settle — blocks duplicate Labor for the same laborKey.
 */
export function p5LaborCleanupInvalidate(opts: {
  generation: number;
  runGenerationCurrent: number;
  settled: boolean;
  laborKey: string;
  laborAttemptedKey: string | null;
}): {
  nextRunGeneration: number;
  nextLaborAttemptedKey: string | null;
} {
  let nextRunGeneration = opts.runGenerationCurrent;
  if (opts.runGenerationCurrent === opts.generation) {
    nextRunGeneration = opts.generation + 1;
  }
  let nextLaborAttemptedKey = opts.laborAttemptedKey;
  if (!opts.settled && opts.laborAttemptedKey === opts.laborKey) {
    nextLaborAttemptedKey = null;
  }
  return { nextRunGeneration, nextLaborAttemptedKey };
}

/** Sticky skip — same content key already claimed (in-flight or settled). */
export function shouldSkipP5LaborRestart(opts: {
  laborKey: string;
  laborAttemptedKey: string | null;
}): boolean {
  return (
    opts.laborAttemptedKey != null && opts.laborAttemptedKey === opts.laborKey
  );
}
