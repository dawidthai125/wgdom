/**
 * KL-7-P2B — Legal gate before discovery HTTP (REUSE scrape deny default).
 */

import { isOriginDenied } from "@/lib/global-knowledge/legal-gate";
import { isKnrScraperOrigin } from "./knr-legal-gate-types";

/** Origins explicitly eligible for discovery HTTP after Owner allowlist entry. */
const HTTP_DISCOVERY_ORIGINS = new Set([
  "knr_government_public",
  "knr_official_public_document",
  "knr_university_public",
]);

export type KnrDiscoveryHttpLegalResult = {
  ok: boolean;
  codes: string[];
};

/**
 * Fail-closed legal gate for discovery HTTP.
 * scrape_* always denied. Unknown origins denied.
 */
export function evaluateKnrDiscoveryHttpLegalGate(
  originId: string | null | undefined,
): KnrDiscoveryHttpLegalResult {
  const id = String(originId ?? "").trim();
  const codes: string[] = [];
  if (!id) {
    codes.push("ORIGIN_MISSING");
    return { ok: false, codes };
  }
  if (isKnrScraperOrigin(id) || isOriginDenied(id)) {
    codes.push("ORIGIN_DENIED");
    return { ok: false, codes };
  }
  if (!HTTP_DISCOVERY_ORIGINS.has(id)) {
    codes.push("ORIGIN_NOT_ALLOWED_FOR_HTTP");
    return { ok: false, codes };
  }
  return { ok: true, codes: [] };
}

export const KNR_DISCOVERY_HTTP_LEGAL_P2B_IMPLEMENTED = true as const;
