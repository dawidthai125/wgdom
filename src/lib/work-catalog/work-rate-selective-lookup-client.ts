/**
 * WORK-RATE-SELECTIVE-RESEARCH-02 — selective lookup ports (Edge + fixtures).
 * NEVER catalogue · ONE URL · allowlisted hosts only · client nie podaje URL.
 */

import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";
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

export function createFixtureWorkRateSelectiveLookup(
  fixtures: Partial<Record<WorkRateSourceId, { html: string; finalUrl?: string }>>,
): WorkRateSelectiveLookupPort {
  return {
    async lookup(req: WorkRateSelectiveLookupRequest): Promise<WorkRateSelectiveLookupResult> {
      const fx = fixtures[req.sourceId];
      if (!fx?.html) {
        return { ok: false, error: "FIXTURE_MISS", httpFetchCount: 0, rateGap: true };
      }
      const requestUrl =
        buildWorkRateSelectiveRequestUrl({ sourceId: req.sourceId, query: req.query }) ||
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
 * Production: Edge proxy buduje URL z sourceId+query (anti-SSRF).
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
      const preview = buildWorkRateSelectiveRequestUrl({
        sourceId: req.sourceId,
        query,
      });
      if (!preview || !isWorkRateSelectiveUrlAllowed(preview)) {
        return { ok: false, error: "URL_NOT_ALLOWED", httpFetchCount: 0, rateGap: true };
      }
      try {
        const res = await fetchImpl(`${base}/work-rate-selective-lookup`, {
          method: "POST",
          headers: { ...API_HEADERS, "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceId: req.sourceId,
            query,
            workId: req.workId,
            unit: req.unit,
            regionScope: req.regionScope,
          }),
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
