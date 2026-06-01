/** Po udanym batch-get + merge w CloudLoader — wycisz auto runCloudSync (debounce 2 s). */
export const BOOTSTRAP_AUTO_SYNC_SUPPRESS_MS = 60_000;

let lastSuccessfulBootstrapAt = 0;

/** Wywołaj po pomyślnym bootstrapie CloudLoader (batch-get + merge do LS). */
export function markCloudBootstrapSuccess(): void {
  lastSuccessfulBootstrapAt = Date.now();
}

/** Zwraca timestamp do którego auto runCloudSync ma być wstrzymany (0 = brak bootstrapu). */
export function initialAutoSyncSuppressUntil(): number {
  if (lastSuccessfulBootstrapAt <= 0) return 0;
  return lastSuccessfulBootstrapAt + BOOTSTRAP_AUTO_SYNC_SUPPRESS_MS;
}
