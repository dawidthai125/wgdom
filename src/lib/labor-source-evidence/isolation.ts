/**
 * WR-SOURCE-EVIDENCE-DB-01 — isolation helpers (tests / guards).
 * Evidence module MUST NOT write these keys.
 */

import { LABOR_SOURCE_EVIDENCE_STORAGE_KEY } from "@/lib/labor-source-evidence/types";
import { WORK_CATALOG_STORAGE_KEY } from "@/lib/work-catalog/work-catalog-store";

/** Keys that Evidence writers are forbidden to mutate. */
export const LABOR_SOURCE_EVIDENCE_FORBIDDEN_WRITE_KEYS = Object.freeze([
  WORK_CATALOG_STORAGE_KEY,
  "kw-wgdom-work-bundles",
] as const);

export function isLaborSourceEvidenceAllowedWriteKey(key: string): boolean {
  return key === LABOR_SOURCE_EVIDENCE_STORAGE_KEY;
}

export function assertLaborSourceEvidenceDoesNotTouchWorkCatalog(
  beforeCatalogJson: string | null,
  afterCatalogJson: string | null,
): boolean {
  return beforeCatalogJson === afterCatalogJson;
}
