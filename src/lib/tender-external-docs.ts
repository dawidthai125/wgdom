/**
 * Dokumenty przetargowe poza e-Zamówieniami — linki z ogłoszenia BZP, BIP, platformy zamawiającego.
 */

import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";
import { scoreTenderFilename } from "@/lib/tenders-bzp-filename";

export interface TenderExternalPageLink {
  url: string;
  label: string;
  source: "notice" | "bip_portal" | "bip_search" | "crawl";
  score: number;
  matchedTender?: boolean;
}

export interface TenderExternalFetchedFile {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  storagePath: string;
  publicUrl: string;
  isSwzHint: boolean;
  score: number;
  sourcePageUrl?: string;
  fromNotice?: boolean;
  matchedTender?: boolean;
  fetchedAt: string;
}

export interface TenderExternalDocDiscovery {
  builtAt: string;
  status: "running" | "done" | "partial" | "empty" | "failed";
  message?: string;
  searchQuery?: string;
  pageLinks: TenderExternalPageLink[];
  files: TenderExternalFetchedFile[];
}

/** Portale BIP / zamawiających we Wrocławiu — punkty startowe crawla. */
export const WROCLAW_BUYER_PORTALS: Record<
  string,
  { label: string; seedUrls: string[] }
> = {
  wm: {
    label: "BIP — Wrocławskie Mieszkania / miasto",
    seedUrls: [
      "https://bip.wroclaw.pl/",
      "https://bip.wroclaw.pl/search/document?q=przetarg",
    ],
  },
  zik: {
    label: "BIP — Zarząd Zasobu Komunalnego",
    seedUrls: ["https://bip.wroclaw.pl/", "https://bip.wroclaw.pl/search/document?q=ZIK"],
  },
  zim: {
    label: "BIP — Zarząd Inwestycji Miejskich",
    seedUrls: ["https://bip.wroclaw.pl/", "https://bip.wroclaw.pl/search/document?q=ZIM"],
  },
  gmina: {
    label: "BIP — Gmina Wrocław",
    seedUrls: ["https://bip.wroclaw.pl/", "https://bip.wroclaw.pl/search/document?q=zam%C3%B3wienia%20publiczne"],
  },
  mops: {
    label: "BIP MOPS Wrocław",
    seedUrls: [
      "https://bip.mops.wroclaw.pl/",
      "https://bip.mops.wroclaw.pl/?cat=przetargi",
    ],
  },
  tbs: {
    label: "TBS Wrocław",
    seedUrls: ["https://bip.tbs.wroclaw.pl/"],
  },
  mpwik: {
    label: "MPWiK Wrocław — przetargi",
    seedUrls: ["https://mpwik.wroc.pl/", "https://mpwik.wroc.pl/pl/przetargi"],
  },
};

const DOC_EXT_RE = /\.(pdf|docx?|xlsx?|ath|nor|xml|zip)(\?|#|$)/i;

const BLOCKED_HOST_RE =
  /facebook|twitter|instagram|youtube|linkedin|google\.|cookie|gdpr|privacy|recaptcha|cloudflare/i;

export function foldPolishExternal(s: string): string {
  return s.toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z");
}

export function isSafeExternalUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host.startsWith("127.") || host.startsWith("192.168.") || host.startsWith("10.")) {
      return false;
    }
    if (BLOCKED_HOST_RE.test(host + u.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

export function resolveExternalUrl(base: string, href: string): string | null {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Wyciąga linki z HTML ogłoszenia BZP (href + gołe URL). */
export function extractExternalLinksFromNoticeHtml(
  html: string,
  baseUrl = "https://ezamowienia.gov.pl/",
): TenderExternalPageLink[] {
  const out = new Map<string, TenderExternalPageLink>();

  const add = (url: string, label: string, source: TenderExternalPageLink["source"]) => {
    if (!isSafeExternalUrl(url)) return;
    const score = scoreExternalLink(url, label);
    if (score <= 0) return;
    const prev = out.get(url);
    if (!prev || score > prev.score) {
      out.set(url, { url, label: label.slice(0, 240) || url, source, score });
    }
  };

  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = m[1].trim();
    const label = stripHtmlTags(m[2]);
    const url = resolveExternalUrl(baseUrl, href);
    if (url) add(url, label, "notice");
  }

  for (const m of html.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    const raw = m[0].replace(/[.,;)]+$/g, "");
    add(raw, raw, "notice");
  }

  return [...out.values()].sort((a, b) => b.score - a.score);
}

export function scoreExternalLink(url: string, label: string): number {
  const hay = foldPolishExternal(`${url} ${label}`);
  let s = 0;

  if (DOC_EXT_RE.test(url)) {
    s += scoreTenderFilename(decodeURIComponent(url.split("/").pop()?.split("?")[0] || ""));
  }

  if (/bip\.|\.gov\.|wroclaw|mpwik|mops|egospodarka|platformazakupowa|ezamowienia\.com|logintrade|e-propublico|smartpzp/.test(hay)) {
    s += 12;
  }
  if (/przetarg|zamowien|postepow|dokumentac|swz|specyfikac|kosztorys|platforma|ofert/.test(hay)) {
    s += 18;
  }
  if (/facebook|twitter|instagram|youtube|polityka-prywatnosci|klauzula|rodo|mapy\.google|fonts\.google/.test(hay)) {
    return -20;
  }
  if (/\.(css|js|png|jpe?g|gif|svg|woff2?|ico)(\?|$)/i.test(url)) {
    return -10;
  }

  return s;
}

export function titleKeywordsForExternalMatch(title: string, bzpNumber: string): string[] {
  const stop = new Set([
    "wroclaw", "wroclawiu", "remont", "robot", "budowl", "lokal", "mieszkan",
    "wykonanie", "przebudowa", "modernizacja", "zamowienia", "publiczne",
  ]);
  const words = foldPolishExternal(title)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stop.has(w));
  const uniq = new Set<string>(words.slice(0, 6));
  if (bzpNumber) {
    const num = bzpNumber.replace(/\D/g, "");
    if (num.length >= 4) uniq.add(num);
    uniq.add(foldPolishExternal(bzpNumber));
  }
  return [...uniq];
}

export function externalLinkMatchesTender(
  url: string,
  label: string,
  title: string,
  bzpNumber: string,
): boolean {
  const kws = titleKeywordsForExternalMatch(title, bzpNumber);
  if (kws.length === 0) return false;
  const hay = foldPolishExternal(`${url} ${label}`);
  return kws.some((kw) => kw.length >= 4 && hay.includes(kw));
}

export function portalSeedsForBuyer(_priorityBuyerId: string | null | undefined): TenderExternalPageLink[] {
  // Celowe wyszukiwanie robi serwer (tenders-external-discover) — bez ogólnych stron BIP.
  return [];
}

export async function discoverExternalTenderDocs(opts: {
  tenderId: string;
  noticeHtml?: string | null;
  organizationName: string;
  priorityBuyerId?: string | null;
  title: string;
  bzpNumber: string;
}): Promise<TenderExternalDocDiscovery> {
  if (!API_BASE) throw new Error("Brak konfiguracji Supabase");
  const res = await fetch(`${API_BASE}/tenders-external-discover`, {
    method: "POST",
    headers: { ...API_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !(data as { ok?: boolean }).ok) {
    throw new Error((data as { error?: string }).error || `Błąd odkrywania dokumentów (${res.status})`);
  }
  return (data as { discovery: TenderExternalDocDiscovery }).discovery;
}

export async function loadExternalTenderFileBytes(file: TenderExternalFetchedFile): Promise<Uint8Array> {
  const res = await fetch(file.publicUrl);
  if (!res.ok) throw new Error(`Nie udało się pobrać ${file.filename}`);
  return new Uint8Array(await res.arrayBuffer());
}
