/**
 * REAL-SOURCE-LIVE-ADAPTERS-08 — selective DIY lookup ports (Edge proxy + fixtures).
 * NEVER catalogue harvest · ONE URL per shop call · allowlisted hosts only.
 */

import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";
import {
  buildDiySelectiveRequestUrl,
  identityMatchesQuery,
  isDiySelectiveUrlAllowed,
} from "./diy-shop-html-parse";
import type {
  DiySelectiveLookupPort,
  DiySelectiveLookupRequest,
  DiySelectiveLookupResult,
  DiySelectiveRawPage,
  DiyShopProviderId,
} from "./diy-selective-lookup-types";

/** Null port — PRICE_GAP without HTTP (harness / Legal-only regressions). */
export function createNullDiySelectiveLookup(): DiySelectiveLookupPort {
  return {
    async lookup(): Promise<DiySelectiveLookupResult> {
      return { ok: false, error: "DIY_LOOKUP_NULL", httpFetchCount: 0, priceGap: true };
    },
  };
}

/** Fixture map: provider → HTML body (tests). */
export function createFixtureDiySelectiveLookup(
  fixtures: Partial<Record<DiyShopProviderId, { html: string; finalUrl?: string }>>,
): DiySelectiveLookupPort {
  return {
    async lookup(req: DiySelectiveLookupRequest): Promise<DiySelectiveLookupResult> {
      const fx = fixtures[req.provider];
      if (!fx?.html) {
        return { ok: false, error: "FIXTURE_MISS", httpFetchCount: 0, priceGap: true };
      }
      const requestUrl =
        buildDiySelectiveRequestUrl({
          provider: req.provider,
          query: req.query,
          sku: req.sku,
          ean: req.ean,
        }) || `https://www.example.invalid/${req.provider}`;
      const page: DiySelectiveRawPage = {
        provider: req.provider,
        requestUrl,
        finalUrl: fx.finalUrl ?? requestUrl,
        status: 200,
        bodyText: fx.html,
        fetchedAtIso: new Date().toISOString(),
      };
      return { ok: true, page, httpFetchCount: 0 };
    },
  };
}

/**
 * Production selective lookup via Edge proxy (CORS-safe).
 * Server builds allowlisted URL from provider+query — client cannot pass arbitrary URLs.
 */
export function createEdgeDiySelectiveLookup(opts?: {
  fetchImpl?: typeof fetch;
  apiBase?: string;
}): DiySelectiveLookupPort {
  const fetchImpl = opts?.fetchImpl ?? fetch;
  return {
    async lookup(req: DiySelectiveLookupRequest): Promise<DiySelectiveLookupResult> {
      const base = opts?.apiBase ?? API_BASE;
      if (!base) {
        return { ok: false, error: "NO_API_BASE", httpFetchCount: 0, priceGap: true };
      }
      const query = String(req.query || "").trim();
      if (!query && !req.sku && !req.ean) {
        return { ok: false, error: "EMPTY_QUERY", httpFetchCount: 0, priceGap: true };
      }
      // Client-side URL preview for diagnostics only — Edge rebuilds from fields.
      const preview = buildDiySelectiveRequestUrl({
        provider: req.provider,
        query,
        sku: req.sku,
        ean: req.ean,
      });
      if (!preview || !isDiySelectiveUrlAllowed(preview)) {
        return { ok: false, error: "URL_NOT_ALLOWED", httpFetchCount: 0, priceGap: true };
      }
      try {
        const res = await fetchImpl(`${base}/mmr-diy-selective-lookup`, {
          method: "POST",
          headers: { ...API_HEADERS, "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: req.provider,
            query,
            materialKey: req.materialKey,
            sku: req.sku || undefined,
            ean: req.ean || undefined,
          }),
          signal: AbortSignal.timeout(14_000),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          page?: DiySelectiveRawPage;
        };
        if (!res.ok || !data.ok || !data.page) {
          return {
            ok: false,
            error: data.error || `HTTP_${res.status}`,
            httpFetchCount: 1,
            priceGap: true,
          };
        }
        if (!isDiySelectiveUrlAllowed(data.page.requestUrl)) {
          return { ok: false, error: "EDGE_URL_REJECT", httpFetchCount: 1, priceGap: true };
        }
        return { ok: true, page: data.page, httpFetchCount: 1 };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "LOOKUP_FETCH_FAIL",
          httpFetchCount: 1,
          priceGap: true,
        };
      }
    },
  };
}

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function extractAllowlistedProductUrls(
  html: string,
  baseUrl: string,
  provider: DiyShopProviderId,
  query: string,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  const qFold = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l");
  const tokens = qFold.split(/\s+/).filter((t) => t.length >= 4);
  while ((m = re.exec(html)) && out.length < 6) {
    const raw = m[1]!;
    let abs: string;
    try {
      abs = new URL(raw, baseUrl).href.split("#")[0]!;
    } catch {
      continue;
    }
    if (!isDiySelectiveUrlAllowed(abs)) continue;
    const path = abs.toLowerCase();
    const looksPdp =
      (provider === "castorama" && /_capl\.prd/i.test(path))
      || (provider === "obi" && /\/p\/\d+\//i.test(path))
      || (provider === "leroy" && /\d{8}\.html/i.test(path));
    if (!looksPdp) continue;
    if (tokens.length && !tokens.some((t) => path.includes(t.slice(0, Math.min(6, t.length))))) {
      // soft filter — still allow if path has construction material tokens
      if (
        !/panel|podlog|plyt|cegl|silka|silikat|bloczek|pustak|gladz|gips|szpachl|farba|tynk|grunt|jastrych/i.test(
          path,
        )
      ) {
        continue;
      }
    }
    if (seen.has(abs)) continue;
    seen.add(abs);
    out.push(abs);
  }
  return out;
}

/**
 * Direct browser/Node fetch of allowlisted DIY search (+ optional first PDP follow).
 * Used when Edge shop proxy is blocked (403/503). Same legal public catalogs — no paywall bypass.
 */
export function createDirectDiySelectiveLookup(opts?: {
  fetchImpl?: typeof fetch;
  /** Follow first identity-matching PDP from search HTML (still ONE product URL). */
  followFirstMatchingPdp?: boolean;
  userAgent?: string;
}): DiySelectiveLookupPort {
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const follow = opts?.followFirstMatchingPdp !== false;
  const ua = opts?.userAgent ?? DEFAULT_UA;
  return {
    async lookup(req: DiySelectiveLookupRequest): Promise<DiySelectiveLookupResult> {
      const query = String(req.query || "").trim();
      if (!query && !req.sku && !req.ean) {
        return { ok: false, error: "EMPTY_QUERY", httpFetchCount: 0, priceGap: true };
      }
      const requestUrl = buildDiySelectiveRequestUrl({
        provider: req.provider,
        query,
        sku: req.sku,
        ean: req.ean,
      });
      if (!requestUrl || !isDiySelectiveUrlAllowed(requestUrl)) {
        return { ok: false, error: "URL_NOT_ALLOWED", httpFetchCount: 0, priceGap: true };
      }
      let httpFetchCount = 0;
      try {
        const res = await fetchImpl(requestUrl, {
          redirect: "follow",
          headers: { "User-Agent": ua, Accept: "text/html,application/xhtml+xml" },
          signal: AbortSignal.timeout(16_000),
        });
        httpFetchCount += 1;
        const bodyText = await res.text();
        if (!res.ok) {
          return {
            ok: false,
            error: `UPSTREAM_${res.status}`,
            httpFetchCount,
            priceGap: true,
          };
        }
        let finalUrl = res.url || requestUrl;
        let pageBody = bodyText;

        if (follow) {
          const pdps = extractAllowlistedProductUrls(
            bodyText,
            requestUrl,
            req.provider,
            query,
          );
          for (const pdp of pdps.slice(0, 2)) {
            const pRes = await fetchImpl(pdp, {
              redirect: "follow",
              headers: { "User-Agent": ua, Accept: "text/html,application/xhtml+xml" },
              signal: AbortSignal.timeout(16_000),
            });
            httpFetchCount += 1;
            if (!pRes.ok) continue;
            const pHtml = await pRes.text();
            const title = (pHtml.match(/<title[^>]*>([^<]+)/i) || [])[1] || "";
            if (!identityMatchesQuery(title, query) && !identityMatchesQuery(pdp, query)) {
              continue;
            }
            pageBody = pHtml;
            finalUrl = pRes.url || pdp;
            break;
          }
        }

        const page: DiySelectiveRawPage = {
          provider: req.provider,
          requestUrl,
          finalUrl,
          status: 200,
          bodyText: pageBody,
          fetchedAtIso: new Date().toISOString(),
        };
        return { ok: true, page, httpFetchCount };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "DIRECT_FETCH_FAIL",
          httpFetchCount,
          priceGap: true,
        };
      }
    },
  };
}

/**
 * Edge first; on fail (403/503/circuit) OR search-results SERP (no PDP),
 * fall back to direct allowlisted fetch with PDP follow.
 */
export function createFallbackDiySelectiveLookup(opts?: {
  primary?: DiySelectiveLookupPort;
  fallback?: DiySelectiveLookupPort;
}): DiySelectiveLookupPort {
  const primary = opts?.primary ?? createEdgeDiySelectiveLookup();
  const fallback = opts?.fallback ?? createDirectDiySelectiveLookup();
  return {
    async lookup(req: DiySelectiveLookupRequest): Promise<DiySelectiveLookupResult> {
      const first = await primary.lookup(req);
      const firstUrl = first.ok
        ? String(first.page.finalUrl || first.page.requestUrl || "")
        : "";
      const edgeSerpOk =
        first.ok
        && /\/search(?:\/|\?)|search\?term=/i.test(firstUrl);
      if (first.ok && !edgeSerpOk) return first;
      const err = first.ok
        ? "EDGE_SERP_NO_PDP"
        : String(first.error || "");
      const retry =
        edgeSerpOk
        || /403|503|404|UPSTREAM|CIRCUIT|LOOKUP_FETCH|NO_API|EDGE/i.test(err)
        || first.priceGap === true;
      if (!retry && !first.ok) return first;
      const second = await fallback.lookup(req);
      if (second.ok) {
        return {
          ...second,
          httpFetchCount: first.httpFetchCount + second.httpFetchCount,
        };
      }
      // Prefer Direct gap; if Edge had SERP body keep Edge only when Direct hard-fails.
      if (first.ok && edgeSerpOk) {
        return {
          ok: false,
          error: `${err}|FALLBACK:${second.error}`,
          httpFetchCount: first.httpFetchCount + second.httpFetchCount,
          priceGap: true,
        };
      }
      return {
        ok: false,
        error: `${err}|FALLBACK:${second.error}`,
        httpFetchCount: first.httpFetchCount + second.httpFetchCount,
        priceGap: true,
      };
    },
  };
}
