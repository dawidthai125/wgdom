/**
 * TP192A/TP192B — host detection + parallel probe helpers.
 * Keep in sync with src/lib/tender-platform-adapters.ts
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
  "smartpzp",
];

export function shouldSkipReadmodelsProbe(text: string): boolean {
  if (!text?.trim()) return false;
  return READMODELS_PROBE_SKIP_HOSTS.some((host) => OFF_PLATFORM_HOST_PATTERNS[host].test(text));
}

/** TP192B — równoległe probe meta dokumentów platformazakupowa (limit 6–8). */
export const PZ_DOCUMENT_PROBE_CONCURRENCY = 6;

/**
 * TP192B — mapWithConcurrency z zachowaniem kolejności wyników (indeks = indeks wejścia).
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const limit = Math.max(1, Math.min(concurrency, items.length));
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = next;
      next += 1;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}
