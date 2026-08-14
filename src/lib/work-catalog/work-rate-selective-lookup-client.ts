/**
 * WORK-RATE-SELECTIVE-RESEARCH-02 / DISCOVERY-01 — selective lookup ports.
 * NEVER catalogue · ONE URL per call · allowlisted hosts only · client nie podaje URL.
 */

import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";
import {
  resolveWorkRatePass2Url,
} from "@/lib/work-catalog/work-rate-discovery-allowlist";
import {
  buildWorkRateSelectiveRequestUrl,
  isWorkRateSelectiveUrlAllowed,
} from "@/lib/work-catalog/work-rate-source-html-parse";
import type {
  WorkRateSelectiveLookupPort,
  WorkRateSelectiveLookupRequest,
  WorkRateSelectiveLookupResult,
  WorkRateSelectiveRawPage,
  WorkRateSourceId,
} from "@/lib/work-catalog/work-rate-selective-lookup-types";

export function createNullWorkRateSelectiveLookup(): WorkRateSelectiveLookupPort {
  return {
    async lookup(): Promise<WorkRateSelectiveLookupResult> {
      return { ok: false, error: "WORK_RATE_LOOKUP_NULL", httpFetchCount: 0, rateGap: true };
    },
  };
}

function fixtureKey(sourceId: WorkRateSourceId, categoryKey?: string | null): string {
  const cat = String(categoryKey || "").trim();
  if (cat && cat !== "default") return `${sourceId}::${cat}`;
  return sourceId;
}

export function createFixtureWorkRateSelectiveLookup(
  fixtures: Partial<
    Record<string, { html: string; finalUrl?: string; requestUrl?: string }>
  >,
): WorkRateSelectiveLookupPort {
  return {
    async lookup(req: WorkRateSelectiveLookupRequest): Promise<WorkRateSelectiveLookupResult> {
      const cat = String(req.categoryKey || "").trim();
      if (cat && cat !== "default") {
        const pass2 = resolveWorkRatePass2Url(req.sourceId, cat);
        if (!pass2) {
          return {
            ok: false,
            error: "unknown_category_key",
            httpFetchCount: 0,
            rateGap: true,
          };
        }
      }
      const key = fixtureKey(req.sourceId, req.categoryKey);
      const fx = fixtures[key] ?? (cat ? undefined : fixtures[req.sourceId]);
      if (!fx?.html) {
        return { ok: false, error: "FIXTURE_MISS", httpFetchCount: 0, rateGap: true };
      }
      const requestUrl =
        fx.requestUrl ||
        (cat && cat !== "default"
          ? resolveWorkRatePass2Url(req.sourceId, cat)
          : buildWorkRateSelectiveRequestUrl({
              sourceId: req.sourceId,
              query: req.query,
            })) ||
        `https://kb.pl/?s=fixture`;
      const page: WorkRateSelectiveRawPage = {
        sourceId: req.sourceId,
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
 * Production: Edge proxy buduje URL z sourceId (+ optional categoryKey) — anti-SSRF.
 * Arbitrary `url` in body is rejected by Edge.
 */
export function createEdgeWorkRateSelectiveLookup(opts?: {
  fetchImpl?: typeof fetch;
  apiBase?: string;
}): WorkRateSelectiveLookupPort {
  const fetchImpl = opts?.fetchImpl ?? fetch;
  return {
    async lookup(req: WorkRateSelectiveLookupRequest): Promise<WorkRateSelectiveLookupResult> {
      const base = opts?.apiBase ?? API_BASE;
      if (!base) {
        return { ok: false, error: "NO_API_BASE", httpFetchCount: 0, rateGap: true };
      }
      const query = String(req.query || "").trim();
      if (query.length < 2) {
        return { ok: false, error: "EMPTY_QUERY", httpFetchCount: 0, rateGap: true };
      }
      const categoryKey = String(req.categoryKey || "").trim() || null;
      if (categoryKey && categoryKey !== "default") {
        const pass2 = resolveWorkRatePass2Url(req.sourceId, categoryKey);
        if (!pass2 || !isWorkRateSelectiveUrlAllowed(pass2)) {
          return {
            ok: false,
            error: "unknown_category_key",
            httpFetchCount: 0,
            rateGap: true,
          };
        }
      } else {
        const preview = buildWorkRateSelectiveRequestUrl({
          sourceId: req.sourceId,
          query,
        });
        if (!preview || !isWorkRateSelectiveUrlAllowed(preview)) {
          return { ok: false, error: "URL_NOT_ALLOWED", httpFetchCount: 0, rateGap: true };
        }
      }
      try {
        const body: Record<string, unknown> = {
          sourceId: req.sourceId,
          query,
          workId: req.workId,
          unit: req.unit,
          regionScope: req.regionScope,
        };
        if (categoryKey && categoryKey !== "default") {
          body.categoryKey = categoryKey;
        }
        const res = await fetchImpl(`${base}/work-rate-selective-lookup`, {
          method: "POST",
          headers: { ...API_HEADERS, "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(14_000),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          page?: WorkRateSelectiveRawPage;
        };
        if (!res.ok || !data.ok || !data.page) {
          return {
            ok: false,
            error: data.error || `HTTP_${res.status}`,
            httpFetchCount: 1,
            rateGap: true,
          };
        }
        if (!isWorkRateSelectiveUrlAllowed(data.page.requestUrl)) {
          return { ok: false, error: "EDGE_URL_REJECT", httpFetchCount: 1, rateGap: true };
        }
        return { ok: true, page: data.page, httpFetchCount: 1 };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "LOOKUP_FETCH_FAIL",
          httpFetchCount: 1,
          rateGap: true,
        };
      }
    },
  };
}
