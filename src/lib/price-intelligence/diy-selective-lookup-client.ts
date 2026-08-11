/**
 * REAL-SOURCE-LIVE-ADAPTERS-08 — selective DIY lookup ports (Edge proxy + fixtures).
 * NEVER catalogue harvest · ONE URL per shop call · allowlisted hosts only.
 */

import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";
import {
  buildDiySelectiveRequestUrl,
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
