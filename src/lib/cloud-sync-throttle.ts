/**
 * PR-PAY-S7-4A — Cloud Sync Optimization (frequency).
 *
 * Czysta warstwa harmonogramu/transportu synchronizacji. Redukuje liczbę i
 * rozmiar żądań batch-get / batch-set (przyczyna Supabase resource exhaustion),
 * BEZ zmian merge / LWW / Payroll / tombstones / Edge / kv.mset.
 *
 * Zakres bundla: G1 debounce · G2 minimum interval · G3/G4 focus+visibility
 * throttle · AC4 no-change=no-push (fingerprint całego bundla — NIE delta push) ·
 * AC5 production metrics (batch-get / batch-set).
 */

/** G1 — okno grupowania zmian użytkownika przed auto-sync. */
export const AUTO_SYNC_DEBOUNCE_MS = 2_000;

/** G2/G3/G4 — minimalny odstęp między pull (batch-get) z focus/visibility/resume. */
export const MIN_PULL_INTERVAL_MS = 15_000;

/**
 * G2/G3/G4 — czy pull (batch-get) może się teraz wykonać.
 * Leading-edge throttle: pierwszy pull przechodzi, kolejne w oknie są odrzucane.
 * focus + visibilitychange w krótkim oknie → maks. 1 pull (AC3).
 */
export function shouldPullNow(
  lastPullAt: number,
  now: number,
  minIntervalMs: number = MIN_PULL_INTERVAL_MS,
): boolean {
  if (!Number.isFinite(lastPullAt) || lastPullAt <= 0) return true;
  return now - lastPullAt >= minIntervalMs;
}

/**
 * AC4 — fingerprint całego wychodzącego bundla (poziom bundla, NIE per-klucz delta).
 * Jeśli fingerprint == ostatnio wypchnięty → brak realnej zmiany → pomijamy batch-set.
 * Deterministyczny hash (cyrb53) + długość ładunku jako zabezpieczenie kolizji.
 * Kierunek bezpieczny: przy jakiejkolwiek różnicy serializacji → push (nigdy fałszywy skip).
 */
export function bundleFingerprint(values: unknown[]): string {
  const json = JSON.stringify(values);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < json.length; i++) {
    const ch = json.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return `${hash.toString(36)}:${json.length.toString(36)}`;
}

// ─── AC5 — production metrics (batch-get / batch-set) ────────────────────────
export interface SyncMetrics {
  batchGet: number;
  batchSet: number;
  /** CLOUD-P0-DEADLOCK-N1 — ile razy batch-set był ponawiany (transient 40P01). */
  batchSetRetries: number;
  pushSkipped: number;
  since: number;
}

let metrics: SyncMetrics = {
  batchGet: 0,
  batchSet: 0,
  batchSetRetries: 0,
  pushSkipped: 0,
  since: Date.now(),
};

export function recordBatchGet(): void {
  metrics.batchGet += 1;
}

export function recordBatchSet(): void {
  metrics.batchSet += 1;
}

/** CLOUD-P0-DEADLOCK-N1 — jeden retry po transient deadlock. */
export function recordBatchSetRetry(): void {
  metrics.batchSetRetries += 1;
}

/** AC4 — zliczaj pominięte pushe (brak zmian). */
export function recordPushSkipped(): void {
  metrics.pushSkipped += 1;
}

export function getSyncMetrics(): SyncMetrics {
  return { ...metrics };
}

export function resetSyncMetrics(): void {
  metrics = {
    batchGet: 0,
    batchSet: 0,
    batchSetRetries: 0,
    pushSkipped: 0,
    since: Date.now(),
  };
}
