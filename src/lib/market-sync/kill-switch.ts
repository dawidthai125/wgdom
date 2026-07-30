/**
 * MARKET-SYNC-01 P1 — Kill Switch Publish (FEATURE LS).
 * Default OFF · fail-closed · NIE w DATA_KEYS / cloud-sync.
 */

export const MARKET_SYNC_PUBLISH_ENABLED_KEY = "MARKET_SYNC_PUBLISH_ENABLED";

function isBrowserStorage(): boolean {
  return typeof localStorage !== "undefined";
}

/** Default false — brak publish bez świadomego ON. */
export function isMarketSyncPublishEnabled(): boolean {
  if (!isBrowserStorage()) return false;
  try {
    const raw = localStorage.getItem(MARKET_SYNC_PUBLISH_ENABLED_KEY);
    return raw === "true" || raw === "1";
  } catch {
    return false;
  }
}

export function setMarketSyncPublishEnabled(enabled: boolean): void {
  if (!isBrowserStorage()) return;
  try {
    if (enabled) {
      localStorage.setItem(MARKET_SYNC_PUBLISH_ENABLED_KEY, "true");
    } else {
      localStorage.removeItem(MARKET_SYNC_PUBLISH_ENABLED_KEY);
    }
  } catch {
    /* ignore */
  }
}
