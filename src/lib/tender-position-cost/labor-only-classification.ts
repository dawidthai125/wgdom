/**
 * OUR-RATE-BOM-COVERAGE-01 — explicit LABOR_ONLY classification (Owner-approved).
 *
 * CRITICAL: MISSING_BOM ≠ LABOR_ONLY.
 * Only workIds on the Owner allowlist (or explicit input override) skip BOM.
 */

import { C2_KNR_WC_PROB_WORK_IDS } from "@/lib/intelligent-estimator/c2-knr-wc-prob-owner-create";

/** Wave 1 — Owner GO 2026-08-13 (WM/239 D01 trusted). */
export const OWNER_APPROVED_LABOR_ONLY_WORK_IDS: ReadonlySet<string> = new Set([
  "cc-w2-przygotowanie-osprzet",
  "cc-w2-przebijanie-otworow",
  "cc-w2-mocowanie-aparatow",
  /** P5.16-B / P5.11 closeout — LABOR only · no TechnologyPack / mat.* / BOM. */
  "cc-p0c-w1-zaprawianie-bruzd",
]);

/**
 * MATERIALS_REQUIRED — BOM mandatory; norms pending Owner (no invent).
 * P5.11: zaprawianie-bruzd removed (Owner GO → LABOR; no TechnologyPack / mat.*).
 */
export const OWNER_MATERIALS_REQUIRED_WORK_IDS: ReadonlySet<string> = new Set([
  "cc-p0c-w1-zabezpieczenie-folia",
]);

/** Unit mismatch HOLD — not LABOR_ONLY until Owner unit RCA. */
export const OWNER_WAVE1_UNIT_HOLD_WORK_IDS: ReadonlySet<string> = new Set([
  "cc-w2-wykucie-wnek",
]);

export type LaborOnlyClassifyOpts = {
  /**
   * Extra Owner-approved IDs for this run (tests / future CatalogWork flag bridge).
   * Does NOT include MISSING_BOM inference.
   */
  extraLaborOnlyWorkIds?: ReadonlySet<string> | readonly string[] | null;
};

function toSet(
  extra: LaborOnlyClassifyOpts["extraLaborOnlyWorkIds"],
): ReadonlySet<string> | null {
  if (!extra) return null;
  if (extra instanceof Set) return extra;
  return new Set(
    [...extra].map((x) => String(x ?? "").trim()).filter(Boolean),
  );
}

/**
 * Jawna klasyfikacja LABOR_ONLY — NEVER derived from missing TechnologyPack.
 */
export function isExplicitLaborOnlyWork(
  workId: string,
  opts?: LaborOnlyClassifyOpts,
): boolean {
  const id = String(workId ?? "").trim();
  if (!id) return false;
  if (C2_KNR_WC_PROB_WORK_IDS.has(id)) return true;
  if (OWNER_APPROVED_LABOR_ONLY_WORK_IDS.has(id)) return true;
  const extra = toSet(opts?.extraLaborOnlyWorkIds);
  return Boolean(extra?.has(id));
}

export function isMaterialsRequiredWork(workId: string): boolean {
  return OWNER_MATERIALS_REQUIRED_WORK_IDS.has(String(workId ?? "").trim());
}
