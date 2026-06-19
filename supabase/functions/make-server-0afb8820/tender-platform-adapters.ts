/**
 * TP192A — host detection dla discoverTenderDocuments.
 * Keep in sync with src/lib/tender-platform-adapters.ts (READMODELS_PROBE_SKIP_HOSTS, shouldSkipReadmodelsProbe).
 */

export type OffPlatformHost =
  | "ezamawiajacy"
  | "logintrade"
  | "platformazakupowa"
  | "smartpzp"
  | "opennexus";

const OFF_PLATFORM_HOST_PATTERNS: Record<OffPlatformHost, RegExp> = {
  ezamawiajacy: /\.ezamawiajacy\.pl/i,
  logintrade: /logintrade\.net/i,
  platformazakupowa: /platformazakupowa\.pl/i,
  smartpzp: /smartpzp\.pl/i,
  opennexus: /opennexus\.pl|open-nexus/i,
};

export const READMODELS_PROBE_SKIP_HOSTS: OffPlatformHost[] = [
  "ezamawiajacy",
  "logintrade",
  "platformazakupowa",
];

export function shouldSkipReadmodelsProbe(text: string): boolean {
  if (!text?.trim()) return false;
  return READMODELS_PROBE_SKIP_HOSTS.some((host) => OFF_PLATFORM_HOST_PATTERNS[host].test(text));
}
