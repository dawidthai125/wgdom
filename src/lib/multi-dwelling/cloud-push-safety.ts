/**
 * Fail-closed live-cloud guard for multi-dwelling package pushes.
 * Browser production: allowed. Node/scripts/tests: require explicit opt-in.
 * Does NOT change browser production behavior.
 */

/**
 * True when running outside the browser app shell (vite-node scripts, node tests, CI).
 */
export function isWgdomNonBrowserRuntime(): boolean {
  if (typeof window !== "undefined") return false;
  return true;
}

/**
 * Live multi-dwelling cloud write/read allowed?
 * - Browser (production UI): YES
 * - Node / vite-node / CI: only when WGDOM_ALLOW_LIVE_MULTI_DWELLING_CLOUD_PUSH=1
 */
export function isMultiDwellingLiveCloudWriteAllowed(): boolean {
  if (process.env.WGDOM_ALLOW_LIVE_MULTI_DWELLING_CLOUD_PUSH === "1") {
    return true;
  }
  if (!isWgdomNonBrowserRuntime()) {
    return true;
  }
  return false;
}

/**
 * Soft skip (no network) — test harness / offline.
 * Takes precedence after allow-check for intentional dry runs.
 */
export function isMultiDwellingCloudPushSoftDisabled(): boolean {
  return process.env.WGDOM_DISABLE_MULTI_DWELLING_CLOUD_PUSH === "1";
}

/**
 * Throw before any live persistKey / pushKeysToCloudSafe for this key.
 */
export function assertMultiDwellingLiveCloudWriteAllowed(operation: string): void {
  if (isMultiDwellingCloudPushSoftDisabled()) {
    return; // soft skip path — caller must not hit network
  }
  if (isMultiDwellingLiveCloudWriteAllowed()) {
    return;
  }
  throw new Error(
    `[WGDOM_LIVE_CLOUD_BLOCKED] ${operation} blocked outside browser without ` +
      `WGDOM_ALLOW_LIVE_MULTI_DWELLING_CLOUD_PUSH=1`,
  );
}
