/**
 * OUR-RATE-BOM-COVERAGE-01 Wave 1 — MATERIALS_REQUIRED packs.
 *
 * Owner GO: folia + zaprawianie-bruzd require TechnologyPack + BOM.
 * NO invent norms — without Owner-approved qtyFactor → GAP (no pack registered).
 *
 * Do NOT add to seedB0Fixtures (fixtures ≠ production coverage).
 */

import { OWNER_MATERIALS_REQUIRED_WORK_IDS } from "@/lib/tender-position-cost/labor-only-classification";

export type Wave1MaterialsRequiredPending = {
  workId: string;
  namePl: string;
  unit: string;
  status: "PENDING_OWNER_NORM";
  reasonPl: string;
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
    },
    {
      workId: "cc-p0c-w1-zaprawianie-bruzd",
      namePl: "Zaprawianie / zamurowanie bruzd",
      unit: "mb",
      status: "PENDING_OWNER_NORM",
      reasonPl:
        "Brak Owner-approved normy zaprawy (mb BOQ → materialKey). Bez invent qtyFactor → BOM GAP.",
    },
  ] as const;

export function isWave1MaterialsRequiredPending(workId: string): boolean {
  const id = String(workId ?? "").trim();
  return (
    OWNER_MATERIALS_REQUIRED_WORK_IDS.has(id) &&
    WAVE1_MATERIALS_REQUIRED_PENDING.some((r) => r.workId === id)
  );
}

/** Explicit: no Wave 1 materials packs are registered until Owner norms exist. */
export function listWave1RegisteredMaterialsPacks(): readonly never[] {
  return [];
}
