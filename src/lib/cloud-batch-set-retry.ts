/**
 * CLOUD-P0-DEADLOCK-N1 — pure helpers for transient batch-set retry.
 * Jedyny punkt klasyfikacji błędów retryable (#CORE-013 N1).
 */

/** Opóźnienia przed attempt 2 / 3 / 4 (ms). Attempt 1 = 0. Max 4 HTTP. */
export const BATCH_SET_TRANSIENT_RETRY_DELAYS_MS = [250, 500, 1000] as const;

/** Liczba wywołań HTTP = 1 + delays.length. */
export const BATCH_SET_MAX_ATTEMPTS = BATCH_SET_TRANSIENT_RETRY_DELAYS_MS.length + 1;

/**
 * Transient ⇔ status ≥ 500 ∧ (deadlock detected | 40P01).
 * Pure — bez I/O. Jedyna funkcja rozpoznająca błędy retryable w N1.
 */
export function isTransientBatchSetError(status: number, errText: string): boolean {
  if (!Number.isFinite(status) || status < 500) return false;
  const t = String(errText ?? "").toLowerCase();
  return t.includes("deadlock detected") || t.includes("40p01");
}

export function delayBeforeBatchSetAttempt(attemptNo: number): number {
  if (attemptNo <= 1) return 0;
  const idx = attemptNo - 2;
  return BATCH_SET_TRANSIENT_RETRY_DELAYS_MS[idx] ?? 0;
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
