/** Wersja UI — zsynchronizowana z CHANGELOG[0] przez vite define przy buildzie. */
declare const __APP_VERSION__: string;
/** Build Identity — short git commit HEAD (vite define przy buildzie). Detekcja „nowy build". */
declare const __APP_COMMIT__: string;

export const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";

export const APP_COMMIT =
  typeof __APP_COMMIT__ !== "undefined" ? __APP_COMMIT__ : "unknown";

/** OD-OCR-34 — first capable lean+guard + 29B writer-routing release. */
export const PIPELINE_CLOUD_LEAN_MIN_APP_VERSION = "2.66.145" as const;

const APP_VERSION_TRIPLE_RE = /^(\d+)\.(\d+)\.(\d+)$/;

/** Parse `major.minor.patch` only. Incomplete / garbage → null. */
export function parseAppVersionTriple(raw: unknown): [number, number, number] | null {
  if (typeof raw !== "string") return null;
  const m = APP_VERSION_TRIPLE_RE.exec(raw.trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Numeric compare. null if either side is unparseable. */
export function compareAppVersion(a: unknown, b: unknown): number | null {
  const pa = parseAppVersionTriple(a);
  const pb = parseAppVersionTriple(b);
  if (!pa || !pb) return null;
  if (pa[0] !== pb[0]) return pa[0] - pb[0];
  if (pa[1] !== pb[1]) return pa[1] - pb[1];
  return pa[2] - pb[2];
}

/** Fail-closed: invalid / `0.0.0` → false. */
export function isAppVersionAtLeast(appVersion: unknown, minVersion: string): boolean {
  if (typeof appVersion !== "string") return false;
  if (appVersion.trim() === "0.0.0") return false;
  const cmp = compareAppVersion(appVersion, minVersion);
  return cmp !== null && cmp >= 0;
}
