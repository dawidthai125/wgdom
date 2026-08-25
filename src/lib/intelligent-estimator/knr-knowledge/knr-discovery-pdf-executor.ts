/**
 * IK-KNR Phase 2D — PDF L3 discovery executor (fail-closed · no OCR · no crawl).
 *
 * Input: allowlist-resolved plan URL only (never raw client URL).
 * HTTPS · SSRF · CT=pdf · size · timeout · redirect host check · text extract.
 * Production: unused while FEATURE_DEFAULT=false · allowlist=[].
 */

import {
  isKnrDiscoveryHostnameAllowlisted,
  type KnrDiscoveryAllowlistEntry,
} from "./knr-discovery-allowlist";
import {
  getKnrDiscoveryCachedDocument,
  setKnrDiscoveryCachedDocument,
} from "./knr-discovery-document-cache";
import {
  KNR_DISCOVERY_HTTP_MAX_BYTES,
  KNR_DISCOVERY_HTTP_TIMEOUT_MS,
  emptyKnrDiscoveryHttpAccounting,
  type KnrDiscoveryHttpExecuteResult,
  type KnrDiscoveryHttpPlan,
} from "./knr-discovery-http-types";
import {
  extractKnrDiscoveryPdfTextFromBytes,
  type KnrDiscoveryPdfTextExtractFn,
} from "./knr-discovery-pdf-text";
import { assertKnrDiscoveryUrlSafeForFetch } from "./knr-discovery-ssrf";

export type KnrDiscoveryPdfFetchLike = (
  url: string,
  init: { signal: AbortSignal; redirect: "follow"; headers: Record<string, string> },
) => Promise<{
  ok: boolean;
  status: number;
  url: string;
  headers: { get(name: string): string | null };
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

function isPdfContentType(ct: string): boolean {
  const c = String(ct ?? "").toLowerCase();
  return c.includes("application/pdf") || /(^|\/|\+|;\s*)pdf\b/.test(c);
}

/**
 * Execute PDF discovery for an already-planned allowlisted URL.
 * plan.allowed=false → never fetch · HTTP=0.
 */
export async function executeKnrDiscoveryPdfPlan(
  plan: KnrDiscoveryHttpPlan,
  options: {
    fetchImpl?: KnrDiscoveryPdfFetchLike;
    allowlistOverride?: readonly KnrDiscoveryAllowlistEntry[] | null;
    nowIso?: string;
    extractFn?: KnrDiscoveryPdfTextExtractFn;
    /** Skip shared URL cache (tests). */
    skipCache?: boolean;
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

  if (!options.skipCache) {
    const cached = getKnrDiscoveryCachedDocument(plan.requestUrl);
    if (cached) {
      return {
        jobStatus: "SUCCEEDED",
        denyCode: null,
        accounting: emptyKnrDiscoveryHttpAccounting(),
        finalUrl: cached.finalUrl,
        contentType: cached.contentType,
        bodyText: cached.bodyText,
        fetchedAtIso: cached.fetchedAtIso,
        evidenceWritable: true,
      };
    }
  }

  const fetchImpl =
    options.fetchImpl ?? (globalThis.fetch as unknown as KnrDiscoveryPdfFetchLike);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), KNR_DISCOVERY_HTTP_TIMEOUT_MS);
  let accounting = { httpRequestCount: 0, attemptedFetch: false };

  try {
    accounting = { httpRequestCount: 1, attemptedFetch: true };
    const res = await fetchImpl(plan.requestUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "application/pdf",
        "User-Agent": "WGDOM/2.66 knr-discovery-selective-pdf",
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
    if (!isPdfContentType(ct)) {
      return {
        jobStatus: "UNSUPPORTED_CONTENT_TYPE",
        denyCode: "UNSUPPORTED_CONTENT_TYPE",
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

    const buf = await res.arrayBuffer();
    if (buf.byteLength > KNR_DISCOVERY_HTTP_MAX_BYTES) {
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

    const extracted = await extractKnrDiscoveryPdfTextFromBytes(new Uint8Array(buf), {
      sourceId: plan.sourceId,
      contentType: ct,
      extractFn: options.extractFn,
    });

    if (!extracted.ok) {
      return {
        jobStatus: "UNSUPPORTED_CONTENT_TYPE",
        denyCode:
          extracted.reason === "PDF_TEXT_UNAVAILABLE"
            ? "PDF_TEXT_UNAVAILABLE"
            : "PDF_EXTRACT_ERROR",
        accounting,
        finalUrl,
        contentType: ct,
        bodyText: null,
        fetchedAtIso: null,
        evidenceWritable: false,
      };
    }

    const fetchedAtIso = options.nowIso ?? new Date().toISOString();
    if (!options.skipCache) {
      setKnrDiscoveryCachedDocument(plan.requestUrl, {
        finalUrl,
        contentType: ct,
        bodyText: extracted.text,
        fetchedAtIso,
        byteLength: buf.byteLength,
      });
    }

    return {
      jobStatus: "SUCCEEDED",
      denyCode: null,
      accounting,
      finalUrl,
      contentType: ct,
      bodyText: extracted.text,
      fetchedAtIso,
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

export const KNR_DISCOVERY_PDF_EXECUTOR_P2D_IMPLEMENTED = true as const;
