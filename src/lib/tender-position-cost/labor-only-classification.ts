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
  /**
   * CHROBREGO STEP 1 Owner GO 2026-08-30 — G2 Labor m² F5 unlock.
   * OUR RATE 22.90 already accepted · no TechnologyPack · ≠ LP48 mb.
   */
  "legacy-malowanie-m2",
  /**
   * CHROBREGO OWNER_GO_LABOR_ONLY_BOM_4_ELECTRICAL 2026-08-30.
   * OUR RATE Accept BASE already CURRENT · CR labor-only rows · no TechnologyPack / mat.*.
   * BOM status = LABOR_ONLY (empty materials) — ≠ MISSING_BOM invent.
   */
  "p2b-montaz-wylacznikow-szt",
  "p2b-montaz-gniazd-lacznikow-szt",
  "p2b-montaz-opraw-oswietleniowych-szt",
  "p2b-podlaczenie-kuchenki-elektrycznej-szt",
  /**
   * CHROBREGO OWNER_GO_LABOR_ONLY_BOM_HYDRAULIC_DEMONTAGE 2026-08-30.
   * OUR RATE Accept BASE 49 CURRENT · LP28/31 only · CR labor-only · no TechnologyPack.
   */
  "p2b-demontaz-baterii-armatury-szt",
  /**
   * CHROBREGO OWNER_GO_BATCH_SAFE 2026-08-30.
   * Montaż zlewozmywaka · LP42 only · after Accept BASE · CR white_install · no TechnologyPack.
   */
  "p2b-montaz-zlewozmywaka-szt",
  /**
   * CHROBREGO OWNER_GO_LABOR_ONLY_BOM_LP48 2026-08-30.
   * Malowanie rur mb · LP48 · OUR RATE Accept BASE 31.25 CURRENT · sccot labor-only · ≠ paint m².
   * BOM status = LABOR_ONLY (empty materials) — ≠ MISSING_BOM invent · ≠ TechnologyPack.
   */
  "legacy-malowanie-rur-mb",
  /**
   * CHROBREGO OWNER_GO_RESOLVE_LP30_UNIT_AND_CLOSE_IF_LEGAL 2026-08-30.
   * Demontaż wanny kpl · OUR RATE Accept BASE 200 · Owner unit policy kpl↔szt 1:1 · kb_pl labor-only.
   * BOM status = LABOR_ONLY (empty materials) — ≠ MISSING_BOM invent · ≠ TechnologyPack.
   */
  "p2b-demontaz-wanny-kpl",
  /**
   * CHROBREGO OWNER_GO_LABOR_ONLY_BOM_LP20 2026-08-31.
   * Listwa wykańczająca prog/płytki mb · LP20 · OUR RATE Accept BASE 80 CURRENT · APM remonty_apm labor-only.
   * BOM status = LABOR_ONLY (empty materials) — ≠ MISSING_BOM invent · ≠ TechnologyPack.
   */
  "p2b-listwa-wykonczajaca-prog-plytki-mb",
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
