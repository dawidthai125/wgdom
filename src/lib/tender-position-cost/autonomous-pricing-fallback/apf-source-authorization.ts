/**
 * APF-only source authorization — Owner GO 2026-08-27.
 *
 * Separate from KEEP-4 / WORK_RATE_ALLOWED_HOSTS.
 * NORMAL work-rate MUST NOT use these hosts or sourceIds.
 */

import { WORK_RATE_ALLOWED_HOSTS } from "@/lib/work-catalog/work-rate-source-html-parse";
import {
  APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
  type ApfSourcePricingBasis,
} from "./apf-pricing-basis";

export const APF_OWNER_STATUS_AUTHORIZED = "OWNER_AUTHORIZED_APF_SOURCE" as const;

export type ApfAuthorizedSourceRole = "PRIMARY" | "SECONDARY" | "BENCHMARK_ONLY";

export type ApfAuthorizedSourceId = "energospin_pl" | "electrico_pomiary_pl";

export type ApfAuthorizedCategoryKey =
  | "electrical_measurement"
  | "electrical_measurement_secondary";

export type ApfEphemeralSelectiveAuthorizedRoute = {
  sourceId: ApfAuthorizedSourceId;
  categoryKey: ApfAuthorizedCategoryKey;
  url: string;
  host: string;
  role: ApfAuthorizedSourceRole;
  pricingBasis: ApfSourcePricingBasis;
  ownerStatus: typeof APF_OWNER_STATUS_AUTHORIZED;
  observedAt: string;
};

/** Exact authorized APF execution routes — no wildcards · no subpaths. */
export const APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES = Object.freeze([
  Object.freeze({
    sourceId: "energospin_pl",
    categoryKey: "electrical_measurement",
    url: "https://www.energospin.pl/cennik/",
    host: "energospin.pl",
    role: "PRIMARY",
    pricingBasis: APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
    ownerStatus: APF_OWNER_STATUS_AUTHORIZED,
    observedAt: "2026-08-27",
  }),
  Object.freeze({
    sourceId: "electrico_pomiary_pl",
    categoryKey: "electrical_measurement_secondary",
    url: "https://electrico-pomiary.pl/cennik/",
    host: "electrico-pomiary.pl",
    role: "SECONDARY",
    pricingBasis: APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
    ownerStatus: APF_OWNER_STATUS_AUTHORIZED,
    observedAt: "2026-08-27",
  }),
] satisfies readonly ApfEphemeralSelectiveAuthorizedRoute[]);

/** APF-only hosts — NOT added to WORK_RATE_ALLOWED_HOSTS. */
export const APF_AUTHORIZED_HOSTS = Object.freeze(
  new Set([
    "energospin.pl",
    "www.energospin.pl",
    "electrico-pomiary.pl",
    "www.electrico-pomiary.pl",
  ]),
);

/** KB benchmark context — NOT an APF execution route. */
export const APF_KB_BENCHMARK_MEASUREMENT_URL =
  "https://kb.pl/remont-i-wykonczenie/instalacje-elektryczne/ile-kosztuja-pomiary-elektryczne-cennik-uslug-elektrycznych-w-roznych-regionach-polski/" as const;

export const APF_KB_BENCHMARK_SOURCE_ID = "kb_pl" as const;

export const APF_HTTP_MAX_REQUESTS_PER_RESEARCH = 1 as const;

export const APF_HTTP_TIMEOUT_MS = 12_000 as const;

/** Pick fetch URL that avoids known same-site redirects (budget=1). */
export function resolveApfFetchUrlForRoute(
  route: ApfEphemeralSelectiveAuthorizedRoute,
): string {
  try {
    const u = new URL(route.url);
    const bare = u.hostname.replace(/^www\./i, "");
    if (
      u.hostname.toLowerCase().startsWith("www.") &&
      APF_AUTHORIZED_HOSTS.has(bare) &&
      APF_AUTHORIZED_HOSTS.has(u.hostname.toLowerCase())
    ) {
      u.hostname = bare;
      return u.href;
    }
    return route.url;
  } catch {
    return route.url;
  }
}

export function apfAuthorizedRouteHostsMatch(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    const ha = ua.hostname.toLowerCase().replace(/^www\./, "");
    const hb = ub.hostname.toLowerCase().replace(/^www\./, "");
    if (ua.protocol !== ub.protocol || ha !== hb) return false;
    const pa = ua.pathname.replace(/\/+$/, "") || "/";
    const pb = ub.pathname.replace(/\/+$/, "") || "/";
    return pa === pb && ua.search.length === 0 && ub.search.length === 0;
  } catch {
    return false;
  }
}

export function normalizeApfAuthorizedUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr.trim());
    u.hash = "";
    let path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.protocol}//${u.hostname.toLowerCase()}${path}${path.endsWith("/") ? "" : ""}/`.replace(
      /([^:]\/)\/+/g,
      "$1",
    );
  } catch {
    return urlStr.trim();
  }
}

/** Canonical compare — trailing slash normalized. */
export function apfAuthorizedUrlsMatch(a: string, b: string): boolean {
  const na = normalizeApfAuthorizedUrl(a);
  const nb = normalizeApfAuthorizedUrl(b);
  return na === nb || na.replace(/\/$/, "") === nb.replace(/\/$/, "");
}

export function isApfAuthorizedHost(hostname: string): boolean {
  const h = String(hostname || "").trim().toLowerCase();
  return APF_AUTHORIZED_HOSTS.has(h);
}

export function isApfHostBlockedFromNormalWorkRate(hostname: string): boolean {
  return isApfAuthorizedHost(hostname);
}

export function isApfAuthorizedSourceId(
  sourceId: string,
): sourceId is ApfAuthorizedSourceId {
  return APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES.some(
    (r) => r.sourceId === sourceId,
  );
}

export function resolveApfAuthorizedRoute(
  sourceId: string,
  categoryKey?: string | null,
): ApfEphemeralSelectiveAuthorizedRoute | null {
  const rows = APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES.filter(
    (r) => r.sourceId === sourceId,
  );
  if (!rows.length) return null;
  if (categoryKey) {
    return rows.find((r) => r.categoryKey === categoryKey) ?? null;
  }
  return rows[0] ?? null;
}

export function resolveApfAuthorizedRouteByUrl(
  urlStr: string,
): ApfEphemeralSelectiveAuthorizedRoute | null {
  return (
    APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES.find(
      (r) =>
        apfAuthorizedUrlsMatch(r.url, urlStr) ||
        apfAuthorizedRouteHostsMatch(r.url, urlStr),
    ) ?? null
  );
}

export function listApfPrimaryAuthorizedRoutes(): readonly ApfEphemeralSelectiveAuthorizedRoute[] {
  return APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES.filter(
    (r) => r.role === "PRIMARY",
  );
}

export function listApfSecondaryAuthorizedRoutes(): readonly ApfEphemeralSelectiveAuthorizedRoute[] {
  return APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES.filter(
    (r) => r.role === "SECONDARY",
  );
}

/** FAIL-CLOSED: APF hosts must never appear in NORMAL KEEP-4 allowlist. */
export function assertApfHostsNotInKeep4(): boolean {
  for (const h of APF_AUTHORIZED_HOSTS) {
    if (WORK_RATE_ALLOWED_HOSTS.has(h)) return false;
  }
  return true;
}
