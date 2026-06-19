/**
 * P2-A.3 — wykrywanie hostów platform zamówień poza e-Zamówieniami (notice HTML / plain URL).
 */

export type OffPlatformHost =
  | "ezamawiajacy"
  | "logintrade"
  | "platformazakupowa"
  | "smartpzp"
  | "opennexus";

export const OFF_PLATFORM_HOST_PATTERNS: Record<OffPlatformHost, RegExp> = {
  ezamawiajacy: /\.ezamawiajacy\.pl/i,
  logintrade: /logintrade\.net/i,
  platformazakupowa: /platformazakupowa\.pl/i,
  smartpzp: /smartpzp\.pl/i,
  opennexus: /opennexus\.pl|open-nexus/i,
};

/** Kolejność priorytetu adapterów (P2-H.1: ezamawiajacy przed logintrade). */
export const OFF_PLATFORM_HOST_PRIORITY: OffPlatformHost[] = [
  "ezamawiajacy",
  "logintrade",
  "platformazakupowa",
  "smartpzp",
  "opennexus",
];

export function detectOffPlatformHosts(text: string): OffPlatformHost[] {
  if (!text?.trim()) return [];
  return OFF_PLATFORM_HOST_PRIORITY.filter((host) => OFF_PLATFORM_HOST_PATTERNS[host].test(text));
}

/** TP192A — hosty, dla których readmodels nie zwróci załączników (pomiń probe 1..50). */
export const READMODELS_PROBE_SKIP_HOSTS: OffPlatformHost[] = [
  "ezamawiajacy",
  "logintrade",
  "platformazakupowa",
  "smartpzp",
];

/**
 * TP192A — true gdy ogłoszenie wskazuje dokumenty poza BZP readmodels.
 * Używane przed probeTenderDocuments(1..50) w discoverTenderDocuments.
 */
export function shouldSkipReadmodelsProbe(text: string): boolean {
  if (!text?.trim()) return false;
  return READMODELS_PROBE_SKIP_HOSTS.some((host) => OFF_PLATFORM_HOST_PATTERNS[host].test(text));
}

/** TP192B — równoległe probe meta dokumentów platformazakupowa (limit 6–8). */
export const PZ_DOCUMENT_PROBE_CONCURRENCY = 6;

/**
 * TP192B — mapWithConcurrency z zachowaniem kolejności wyników (indeks = indeks wejścia).
 * Keep in sync with supabase/functions/.../tender-platform-adapters.ts
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

export function extractPlainUrls(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^\s<>"']+/gi)]
    .map((m) => m[0].replace(/[.,;)]+$/g, ""))
    .filter(Boolean);
}

const LOGINTRADE_PAGE_RE =
  /https?:\/\/[^\s"'<>]*logintrade\.net[^\s"'<>]*(?:zapytania_email|zapytania_oferta|bez_logowania)[^\s"'<>]*/gi;

/** Strony postępowania Logintrade z ogłoszenia BZP (zapytania_email / oferta bez logowania). */
export function extractLogintradePageUrls(noticeHtml: string): string[] {
  const out = new Set<string>();
  for (const m of noticeHtml.matchAll(LOGINTRADE_PAGE_RE)) {
    out.add(m[0].replace(/[.,;)]+$/g, ""));
  }
  for (const url of extractPlainUrls(noticeHtml)) {
    if (!OFF_PLATFORM_HOST_PATTERNS.logintrade.test(url)) continue;
    if (/\/rejestracja\//i.test(url)) continue;
    if (/zapytania_email|zapytania_oferta|bez_logowania|DocumentService/i.test(url)) {
      out.add(url);
    }
  }
  return [...out];
}

export function extractPlatformaZakupowaUrls(noticeHtml: string): string[] {
  return extractPlainUrls(noticeHtml).filter((u) => OFF_PLATFORM_HOST_PATTERNS.platformazakupowa.test(u));
}

/** ID postępowania z linku transakcja/{id} w ogłoszeniu BZP. */
export function extractPlatformazakupowaTransakcjaId(text: string): string | null {
  if (!text?.trim()) return null;
  const m = text.match(/platformazakupowa\.pl\/transakcja\/(\d+)/i);
  return m?.[1] ?? null;
}

export const LOGINTRADE_ATTACHMENT_RE = /DocumentService,getAttachmentUnlogged[^"'<\s]+/gi;
