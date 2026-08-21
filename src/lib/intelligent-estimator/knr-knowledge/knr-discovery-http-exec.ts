/**
 * KL-7-P2B — Execute planned discovery HTTP (Edge-shaped · injectable fetch).
 * Production path: planner denies before this runs → 0 requests.
 */

import {
  isKnrDiscoveryHostnameAllowlisted,
  type KnrDiscoveryAllowlistEntry,
} from "./knr-discovery-allowlist";
import {
  KNR_DISCOVERY_HTTP_MAX_BYTES,
  KNR_DISCOVERY_HTTP_TIMEOUT_MS,
  emptyKnrDiscoveryHttpAccounting,
  type KnrDiscoveryHttpExecuteResult,
  type KnrDiscoveryHttpPlan,
} from "./knr-discovery-http-types";
import { assertKnrDiscoveryUrlSafeForFetch } from "./knr-discovery-ssrf";

export type KnrDiscoveryHttpFetchLike = (
  url: string,
  init: { signal: AbortSignal; redirect: "follow"; headers: Record<string, string> },
) => Promise<{
  ok: boolean;
  status: number;
  url: string;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}>;

function contentTypeAllowed(ct: string): {
  ok: boolean;
  deny: "UNSUPPORTED_CONTENT_TYPE" | "PDF_UNSUPPORTED" | null;
} {
  const c = ct.toLowerCase();
  if (c.includes("pdf") || c.includes("application/pdf")) {
    return { ok: false, deny: "PDF_UNSUPPORTED" };
  }
  if (c.includes("text/html") || c.includes("text/plain") || c.includes("xhtml")) {
    return { ok: true, deny: null };
  }
  if (!c.trim()) {
    // Missing CT — fail closed in P2B
    return { ok: false, deny: "UNSUPPORTED_CONTENT_TYPE" };
  }
  return { ok: false, deny: "UNSUPPORTED_CONTENT_TYPE" };
}

/**
 * Execute a plan. If plan.allowed=false → never calls fetch · httpRequestCount=0.
 */
export async function executeKnrDiscoveryHttpPlan(
  plan: KnrDiscoveryHttpPlan,
  options: {
    fetchImpl?: KnrDiscoveryHttpFetchLike;
    allowlistOverride?: readonly KnrDiscoveryAllowlistEntry[] | null;
    nowIso?: string;
  } = {},
): Promise<KnrDiscoveryHttpExecuteResult> {
  if (!plan.allowed || !plan.requestUrl) {
    return {
      jobStatus: plan.jobStatus,
      denyCode: plan.denyCode,
      accounting: emptyKnrDiscoveryHttpAccounting(),
      finalUrl: null,
      contentType: null,
      bodyText: null,
      fetchedAtIso: null,
      evidenceWritable: false,
    };
  }

  const pre = assertKnrDiscoveryUrlSafeForFetch(plan.requestUrl);
  if (!pre.ok) {
    return {
      jobStatus: pre.reason === "SSRF_DENIED" ? "SSRF_DENIED" : "DENIED",
      denyCode: pre.reason === "SSRF_DENIED" ? "SSRF_DENIED" : "INVALID_URL",
      accounting: emptyKnrDiscoveryHttpAccounting(),
      finalUrl: null,
      contentType: null,
      bodyText: null,
      fetchedAtIso: null,
      evidenceWritable: false,
    };
  }

  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as KnrDiscoveryHttpFetchLike);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), KNR_DISCOVERY_HTTP_TIMEOUT_MS);

  let accounting = { httpRequestCount: 0, attemptedFetch: false };

  try {
    accounting = { httpRequestCount: 1, attemptedFetch: true };
    const res = await fetchImpl(plan.requestUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,text/plain",
        "User-Agent": "WGDOM/2.66 knr-discovery-selective",
      },
    });

    const finalUrl = String(res.url || plan.requestUrl);
    const finalSafe = assertKnrDiscoveryUrlSafeForFetch(finalUrl);
    if (!finalSafe.ok) {
      return {
        jobStatus: "SSRF_DENIED",
        denyCode: "SSRF_DENIED",
        accounting,
        finalUrl,
        contentType: null,
        bodyText: null,
        fetchedAtIso: null,
        evidenceWritable: false,
      };
    }
    if (
      !isKnrDiscoveryHostnameAllowlisted(
        finalSafe.url.hostname,
        options.allowlistOverride,
      )
    ) {
      return {
        jobStatus: "REDIRECT_DENIED",
        denyCode: "REDIRECT_DENIED",
        accounting,
        finalUrl,
        contentType: null,
        bodyText: null,
        fetchedAtIso: null,
        evidenceWritable: false,
      };
    }

    const ct = res.headers.get("content-type") || "";
    const ctCheck = contentTypeAllowed(ct);
    if (!ctCheck.ok) {
      return {
        jobStatus:
          ctCheck.deny === "PDF_UNSUPPORTED"
            ? "UNSUPPORTED_CONTENT_TYPE"
            : "UNSUPPORTED_CONTENT_TYPE",
        denyCode: ctCheck.deny ?? "UNSUPPORTED_CONTENT_TYPE",
        accounting,
        finalUrl,
        contentType: ct,
        bodyText: null,
        fetchedAtIso: null,
        evidenceWritable: false,
      };
    }

    if (!res.ok) {
      return {
        jobStatus: "FAILED",
        denyCode: "UPSTREAM_ERROR",
        accounting,
        finalUrl,
        contentType: ct,
        bodyText: null,
        fetchedAtIso: null,
        evidenceWritable: false,
      };
    }

    const text = await res.text();
    if (text.length > KNR_DISCOVERY_HTTP_MAX_BYTES) {
      return {
        jobStatus: "TOO_LARGE",
        denyCode: "TOO_LARGE",
        accounting,
        finalUrl,
        contentType: ct,
        bodyText: null,
        fetchedAtIso: null,
        evidenceWritable: false,
      };
    }
    if (text.length < 40) {
      return {
        jobStatus: "FAILED",
        denyCode: "EMPTY_BODY",
        accounting,
        finalUrl,
        contentType: ct,
        bodyText: null,
        fetchedAtIso: null,
        evidenceWritable: false,
      };
    }

    return {
      jobStatus: "SUCCEEDED",
      denyCode: null,
      accounting,
      finalUrl,
      contentType: ct,
      bodyText: text,
      fetchedAtIso: options.nowIso ?? new Date().toISOString(),
      evidenceWritable: true,
    };
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    const timedOut = name === "AbortError" || controller.signal.aborted;
    return {
      jobStatus: timedOut ? "TIMEOUT" : "FAILED",
      denyCode: timedOut ? "TIMEOUT" : "UPSTREAM_ERROR",
      accounting,
      finalUrl: null,
      contentType: null,
      bodyText: null,
      fetchedAtIso: null,
      evidenceWritable: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

export const KNR_DISCOVERY_HTTP_EXEC_P2B_IMPLEMENTED = true as const;
