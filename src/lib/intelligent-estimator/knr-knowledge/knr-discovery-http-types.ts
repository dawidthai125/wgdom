/**
 * KL-7-P2B — HTTP discovery types (job metadata ≠ discoveryStatus ≠ verification).
 * Production default: HTTP OFF · allowlist EMPTY · request count 0.
 */

export const KNR_DISCOVERY_HTTP_TIMEOUT_MS = 12_000 as const;
export const KNR_DISCOVERY_HTTP_MAX_BYTES = 400_000 as const;

/**
 * Production feature gate.
 * Controlled L3 PDF pilot GO (2026-08-25): ON with single allowlist + single selection key.
 */
export const KNR_DISCOVERY_HTTP_FEATURE_DEFAULT = true as const;

/**
 * Fetch job status — NEVER mix with KnrDiscoveryStatus / KnrVerificationStatus /
 * ops freshness / lifecycle.
 */
export type KnrDiscoveryHttpJobStatus =
  | "IDLE"
  | "PLANNED"
  | "FETCHING"
  | "SUCCEEDED"
  | "DENIED"
  | "FAILED"
  | "TIMEOUT"
  | "TOO_LARGE"
  | "UNSUPPORTED_CONTENT_TYPE"
  | "REDIRECT_DENIED"
  | "SSRF_DENIED"
  | "LEGAL_DENIED"
  | "FEATURE_OFF"
  | "ALLOWLIST_EMPTY"
  | "SOURCE_DENIED";

export type KnrDiscoveryHttpDenyCode =
  | "FEATURE_OFF"
  | "ALLOWLIST_EMPTY"
  | "UNKNOWN_SOURCE"
  | "SOURCE_INACTIVE"
  | "HOST_NOT_ALLOWLISTED"
  | "ARBITRARY_URL_FORBIDDEN"
  | "SSRF_DENIED"
  | "LEGAL_DENIED"
  | "REDIRECT_DENIED"
  | "UNSUPPORTED_CONTENT_TYPE"
  | "PDF_UNSUPPORTED"
  /** PDF opened but no extractable text layer (scan) — no OCR. */
  | "PDF_TEXT_UNAVAILABLE"
  | "PDF_EXTRACT_ERROR"
  | "TOO_LARGE"
  | "TIMEOUT"
  | "EMPTY_BODY"
  | "UPSTREAM_ERROR"
  | "INVALID_URL";

export type KnrDiscoveryHttpAccounting = {
  /** Deterministic — must be 0 whenever gate denies before fetch. */
  httpRequestCount: number;
  attemptedFetch: boolean;
};

export type KnrDiscoveryHttpPlan = {
  allowed: boolean;
  sourceId: string | null;
  /** Resolved only when allowed; never from client raw URL. */
  requestUrl: string | null;
  hostname: string | null;
  originId: string | null;
  jobStatus: KnrDiscoveryHttpJobStatus;
  denyCode: KnrDiscoveryHttpDenyCode | null;
  accounting: KnrDiscoveryHttpAccounting;
  /** Feature flag snapshot used for this plan. */
  featureEnabled: boolean;
};

export type KnrDiscoveryHttpExecuteResult = {
  jobStatus: KnrDiscoveryHttpJobStatus;
  denyCode: KnrDiscoveryHttpDenyCode | null;
  accounting: KnrDiscoveryHttpAccounting;
  finalUrl: string | null;
  contentType: string | null;
  bodyText: string | null;
  fetchedAtIso: string | null;
  /** True only when body accepted for evidence ingest. */
  evidenceWritable: boolean;
};

export function emptyKnrDiscoveryHttpAccounting(): KnrDiscoveryHttpAccounting {
  return { httpRequestCount: 0, attemptedFetch: false };
}

export function knrDiscoveryHttpPlanDenied(
  denyCode: KnrDiscoveryHttpDenyCode,
  jobStatus: KnrDiscoveryHttpJobStatus,
  extras?: Partial<Pick<KnrDiscoveryHttpPlan, "sourceId" | "featureEnabled">>,
): KnrDiscoveryHttpPlan {
  return {
    allowed: false,
    sourceId: extras?.sourceId ?? null,
    requestUrl: null,
    hostname: null,
    originId: null,
    jobStatus,
    denyCode,
    accounting: emptyKnrDiscoveryHttpAccounting(),
    featureEnabled: extras?.featureEnabled === true,
  };
}

export const KNR_DISCOVERY_HTTP_P2B_IMPLEMENTED = true as const;
