/**
 * GO38 — Isolation: IdentityCandidate writers must not touch Work Catalog / rates / packs.
 */

import { IDENTITY_CANDIDATE_STORAGE_KEY } from "@/lib/work-catalog/identity-candidate-types";
import { WORK_CATALOG_STORAGE_KEY } from "@/lib/work-catalog/work-catalog-store";

export const IDENTITY_CANDIDATE_FORBIDDEN_WRITE_KEYS = Object.freeze([
  WORK_CATALOG_STORAGE_KEY,
  "kw-wgdom-work-bundles",
  "kw-wgdom-labor-source-evidence",
] as const);

export function isIdentityCandidateAllowedWriteKey(key: string): boolean {
  return key === IDENTITY_CANDIDATE_STORAGE_KEY;
}

export function assertIdentityCandidateDoesNotTouchWorkCatalog(
  beforeCatalogJson: string | null,
  afterCatalogJson: string | null,
): boolean {
  return beforeCatalogJson === afterCatalogJson;
}
