/**
 * APF Owner-nominated + Owner-authorized source routes.
 *
 * NOMINATION registry = historical design gate + Owner evidence SSOT.
 * EXECUTION authorization = `APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES` in
 * `apf-source-authorization.ts` (APF-only · NOT KEEP-4).
 */

import { WORK_RATE_ALLOWED_HOSTS } from "@/lib/work-catalog/work-rate-source-html-parse";
import type { WorkRateAuthorizedSourceId } from "@/lib/work-catalog/work-rate-legal";
import {
  APF_OWNER_STATUS_AUTHORIZED,
  APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES,
} from "./apf-source-authorization";
import {
  APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
  type ApfSourcePricingBasis,
} from "./apf-pricing-basis";

export const APF_NOMINATION_STATUS_OWNER_NOMINATED_PENDING_KEEP4 =
  "OWNER_NOMINATED_PENDING_KEEP4" as const;

export const APF_NOMINATION_STATUS_OWNER_AUTHORIZED_APF_SOURCE =
  "OWNER_AUTHORIZED_APF_SOURCE" as const;

export type ApfSourceNominationStatus =
  | typeof APF_NOMINATION_STATUS_OWNER_NOMINATED_PENDING_KEEP4
  | typeof APF_NOMINATION_STATUS_OWNER_AUTHORIZED_APF_SOURCE;

export type ApfNominatedSourceId = "energospin_pl" | "electrico_pomiary_pl";

export type ApfNominatedCategoryKey =
  | "electrical_measurement"
  | "electrical_measurement_secondary";

export type ApfOwnerNominatedSourceRoute = {
  nominationId: string;
  sourceId: ApfNominatedSourceId;
  categoryKey: ApfNominatedCategoryKey;
  url: string;
  host: string;
  status: ApfSourceNominationStatus;
  pricingBasis: ApfSourcePricingBasis;
  /** APF-only authorization — no KEEP-4 amendment required. */
  keep4AmendmentRequired: false;
  distinctFromPass2Electrical: true;
  legalExecutionAuthorized: boolean;
  contentVerification: "OWNER_EXTERNAL_SOURCE_EVIDENCE";
  observedAt: string;
  role: "PRIMARY" | "SECONDARY";
};

export const APF_OWNER_NOMINATED_SOURCE_ROUTES = Object.freeze([
  Object.freeze({
    nominationId: "APF-NOM-ENERGOSPIN-ELECTRICAL-MEASUREMENT-2026-08-27",
    sourceId: "energospin_pl",
    categoryKey: "electrical_measurement",
    url: "https://www.energospin.pl/cennik/",
    host: "energospin.pl",
    status: APF_NOMINATION_STATUS_OWNER_AUTHORIZED_APF_SOURCE,
    pricingBasis: APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
    keep4AmendmentRequired: false,
    distinctFromPass2Electrical: true,
    legalExecutionAuthorized: true,
    contentVerification: "OWNER_EXTERNAL_SOURCE_EVIDENCE",
    observedAt: "2026-08-27",
    role: "PRIMARY",
  }),
  Object.freeze({
    nominationId: "APF-NOM-ELECTRICO-ELECTRICAL-MEASUREMENT-SECONDARY-2026-08-27",
    sourceId: "electrico_pomiary_pl",
    categoryKey: "electrical_measurement_secondary",
    url: "https://electrico-pomiary.pl/cennik/",
    host: "electrico-pomiary.pl",
    status: APF_NOMINATION_STATUS_OWNER_AUTHORIZED_APF_SOURCE,
    pricingBasis: APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
    keep4AmendmentRequired: false,
    distinctFromPass2Electrical: true,
    legalExecutionAuthorized: true,
    contentVerification: "OWNER_EXTERNAL_SOURCE_EVIDENCE",
    observedAt: "2026-08-27",
    role: "SECONDARY",
  }),
] satisfies readonly ApfOwnerNominatedSourceRoute[]);

const KEEP4_SOURCE_IDS = new Set<WorkRateAuthorizedSourceId>([
  "kb_pl",
  "sccot",
  "extradom",
  "cennikremontow_pl",
]);

export function listApfOwnerNominatedSourceRoutes(): readonly ApfOwnerNominatedSourceRoute[] {
  return APF_OWNER_NOMINATED_SOURCE_ROUTES;
}

export function resolveApfOwnerNominatedRoute(
  sourceId: string,
  categoryKey: string,
): ApfOwnerNominatedSourceRoute | null {
  return (
    APF_OWNER_NOMINATED_SOURCE_ROUTES.find(
      (r) => r.sourceId === sourceId && r.categoryKey === categoryKey,
    ) ?? null
  );
}

export function isApfNominatedSourceId(
  sourceId: string,
): sourceId is ApfNominatedSourceId {
  return APF_OWNER_NOMINATED_SOURCE_ROUTES.some((r) => r.sourceId === sourceId);
}

export function isKeep4WorkRateSourceId(
  sourceId: string,
): sourceId is WorkRateAuthorizedSourceId {
  return KEEP4_SOURCE_IDS.has(sourceId as WorkRateAuthorizedSourceId);
}

export function isApfNominatedHostInKeep4(host: string): boolean {
  const h = String(host || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  return WORK_RATE_ALLOWED_HOSTS.has(h) || WORK_RATE_ALLOWED_HOSTS.has(`www.${h}`);
}

export function isApfNominatedSourceEligibleForNormalWorkRate(
  sourceId: string,
): boolean {
  if (isApfNominatedSourceId(sourceId)) return false;
  return isKeep4WorkRateSourceId(sourceId);
}

export function isApfNominatedRouteExecutionAuthorized(
  sourceId: string,
  categoryKey: string,
): boolean {
  const nom = resolveApfOwnerNominatedRoute(sourceId, categoryKey);
  if (!nom || !nom.legalExecutionAuthorized) return false;
  return APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES.some(
    (r) => r.sourceId === sourceId && r.categoryKey === categoryKey,
  );
}

export { APF_OWNER_STATUS_AUTHORIZED };
