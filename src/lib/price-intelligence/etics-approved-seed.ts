/**
 * PRICE-INTELLIGENCE-01 P3.1 — WGDOM approved price specs (ETICS × 4).
 * Origin = wgdom · nie live external market · confidence medium.
 * Pure data — bez I/O.
 */

import { mapMaterialToMarketWork } from "@/lib/pricing-expert/material-market-map";

/** Stała data zatwierdzenia P3.1 (Owner GO). */
export const PI31_APPROVED_AT_ISO = "2026-08-09T12:00:00.000Z";

/** Confidence: WGDOM approved own — nie multi-source HIGH. */
export const PI31_WGDOM_CONFIDENCE = 0.7;

export interface Pi31ApprovedMaterialSpec {
  materialKey: string;
  namePl: string;
  unit: string;
  /** Purchase / material unit price (PLN / unit). */
  purchaseUnitPricePln: number;
  /** Primary catalogWorkId (P2 candidate). */
  catalogWorkId: string;
  /** Market quote on catalog work (WGDOM approved). */
  marketQuotePln: number;
  workNamePl: string;
  workUnit: string;
}

export interface Pi31ApprovedEquipmentSpec {
  equipmentKey: string;
  namePl: string;
  unit: string;
  unitPricePln: number;
}

/**
 * Zatwierdzone ceny WGDOM dla 4 materiałów ETICS (fixture TF names).
 * Nie są live Castorama/Leroy/Sekocenbud.
 */
export const PI31_APPROVED_MATERIALS: readonly Pi31ApprovedMaterialSpec[] = [
  {
    materialKey: "mat.eps_graph",
    namePl: "Płyta EPS grafit",
    unit: "m2",
    purchaseUnitPricePln: 45,
    catalogWorkId: "cw.etics.boards",
    marketQuotePln: 45,
    workNamePl: "Płyta EPS grafit (WGDOM approved)",
    workUnit: "m2",
  },
  {
    materialKey: "mat.glue_etics",
    namePl: "Klej do ETICS",
    unit: "kg",
    purchaseUnitPricePln: 3.2,
    catalogWorkId: "cw.etics.substrate",
    marketQuotePln: 3.2,
    workNamePl: "Klej do ETICS (WGDOM approved)",
    // CatalogWork units = WgdomCostUnit (bez kg) — Quotes na work; Purchase zostaje kg.
    workUnit: "m2",
  },
  {
    materialKey: "mat.mesh",
    namePl: "Siatka zbrojąca",
    unit: "m2",
    purchaseUnitPricePln: 4.5,
    catalogWorkId: "cw.etics.mesh",
    marketQuotePln: 4.5,
    workNamePl: "Siatka zbrojąca (WGDOM approved)",
    workUnit: "m2",
  },
  {
    materialKey: "mat.render",
    namePl: "Tynk mineralny",
    unit: "kg",
    purchaseUnitPricePln: 2.8,
    catalogWorkId: "cw.etics.render",
    marketQuotePln: 2.8,
    workNamePl: "Tynk mineralny (WGDOM approved)",
    workUnit: "m2",
  },
] as const;

/**
 * Minimalne stawki sprzętu ETICS — bez nich assemble Real Cost = null
 * (equipment lines) mimo Purchase 4/4. WGDOM approved · nie zewnętrzne.
 */
export const PI31_APPROVED_EQUIPMENT: readonly Pi31ApprovedEquipmentSpec[] = [
  {
    equipmentKey: "eq.scaffold",
    namePl: "Rusztowanie elewacyjne",
    unit: "m2",
    unitPricePln: 8,
  },
  {
    equipmentKey: "eq.mixer",
    namePl: "Mieszarka",
    unit: "szt",
    unitPricePln: 120,
  },
] as const;

export function assertPi31MaterialMapAligned(): void {
  for (const m of PI31_APPROVED_MATERIALS) {
    const map = mapMaterialToMarketWork(m.materialKey);
    if (!map) {
      throw new Error(`P3.1: brak P2 map dla ${m.materialKey}`);
    }
    const candidates = [map.workId, ...(map.candidateWorkIds ?? [])];
    if (!candidates.includes(m.catalogWorkId)) {
      throw new Error(
        `P3.1: catalogWorkId ${m.catalogWorkId} nie jest w P2 candidates dla ${m.materialKey}`,
      );
    }
  }
}
