/**
 * OUR-RATE-BOM-COVERAGE-01 Wave 1 — MATERIALS_REQUIRED packs.
 *
 * Owner GO: folia + zaprawianie-bruzd require TechnologyPack + BOM.
 * NO invent norms — without Owner-approved qtyFactor → GAP (no pack registered).
 *
 * P5.9: investigated TechnologyPack path — repo has NO trusted materialKey+qtyFactor
 * for these workIds (TECHNOLOGY-RECIPE DF · Owner norm catalog absent). Packs stay [].
 *
 * Do NOT add to seedB0Fixtures (fixtures ≠ production coverage).
 */

import { OWNER_MATERIALS_REQUIRED_WORK_IDS } from "@/lib/tender-position-cost/labor-only-classification";

/** Norm fields that must be Owner-approved before TechnologyPack registration. */
export type Wave1PendingMissingNormField = "materialKey" | "qtyFactor";

export type Wave1MaterialsRequiredPending = {
  workId: string;
  namePl: string;
  unit: string;
  status: "PENDING_OWNER_NORM";
  reasonPl: string;
  /** Explicit gaps — both required; neither may be invented. */
  missing: readonly Wave1PendingMissingNormField[];
};

/**
 * Wave 1 MATERIALS_REQUIRED awaiting Owner-approved material norms.
 * Register TechnologyPack only after Owner provides credible qtyFactor + materialKey.
 */
export const WAVE1_MATERIALS_REQUIRED_PENDING: readonly Wave1MaterialsRequiredPending[] =
  [
    {
      workId: "cc-p0c-w1-zabezpieczenie-folia",
      namePl: "Zabezpieczenie powierzchni folią",
      unit: "m2",
      status: "PENDING_OWNER_NORM",
      reasonPl:
        "Brak Owner-approved normy zużycia folii (m2 BOQ → materialKey). Bez invent qtyFactor → BOM GAP.",
      missing: ["materialKey", "qtyFactor"],
    },
    {
      workId: "cc-p0c-w1-zaprawianie-bruzd",
      namePl: "Zaprawianie / zamurowanie bruzd",
      unit: "mb",
      status: "PENDING_OWNER_NORM",
      reasonPl:
        "Brak Owner-approved normy zaprawy (mb BOQ → materialKey). Bez invent qtyFactor → BOM GAP.",
      missing: ["materialKey", "qtyFactor"],
    },
  ] as const;

export function isWave1MaterialsRequiredPending(workId: string): boolean {
  const id = String(workId ?? "").trim();
  return (
    OWNER_MATERIALS_REQUIRED_WORK_IDS.has(id) &&
    WAVE1_MATERIALS_REQUIRED_PENDING.some((r) => r.workId === id)
  );
}

export function getWave1MaterialsRequiredPendingRow(
  workId: string,
): Wave1MaterialsRequiredPending | null {
  const id = String(workId ?? "").trim();
  if (!id || !OWNER_MATERIALS_REQUIRED_WORK_IDS.has(id)) return null;
  return WAVE1_MATERIALS_REQUIRED_PENDING.find((r) => r.workId === id) ?? null;
}

/**
 * Explicit: no Wave 1 materials packs are registered until Owner norms exist.
 * P5.9 MUST NOT invent qtyFactor/materialKey to populate this list.
 */
export function listWave1RegisteredMaterialsPacks(): readonly never[] {
  return [];
}

/** Pack count SSOT for P5.9 integrity (before === after when no Owner norm). */
export function countWave1RegisteredMaterialsPacks(): number {
  return listWave1RegisteredMaterialsPacks().length;
}
