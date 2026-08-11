/**
 * Catalog → PricingExpertCatalogRo.worksById.
 * READ ONLY · REUSE work-catalog loaders + indexWorksById.
 * P3.1 — ensure WGDOM approved ETICS Quotes before RO projection.
 * PRICE-PATH-01 — ensure economy product hosts (structure only · no invent PLN).
 */

import type { AnalyzeMarketPricingOptions } from "@/lib/pricing-expert";
import {
  ensureEconomyProductHostsLocal,
  ensurePi31EticsApprovedDataLocal,
  ensureZygmuntInvoicePurchaseSeedLocal,
} from "@/lib/price-intelligence";
import {
  indexWorksById,
  listActiveWorksForRegion,
} from "@/lib/work-catalog";
import type { BuildChiefPricingOptionsRoResult, ChiefWireAdapterGap } from "./types";

export function buildChiefPricingOptionsRo(): BuildChiefPricingOptionsRoResult {
  const gaps: ChiefWireAdapterGap[] = [];
  try {
    ensurePi31EticsApprovedDataLocal({ pushCloud: true });
    // HISTORICAL PURCHASE seed (Zygmunt invoices) → Price Memory wgdom
    ensureZygmuntInvoicePurchaseSeedLocal({ pushCloud: true });
    // PRICE-PATH-01 — structure-only hosts (no invent PLN)
    const ensured = ensureEconomyProductHostsLocal({ pushCloud: true });
    const store = ensured.catalogStore;
    const works = listActiveWorksForRegion(store, store.activeRegion);
    const worksById = indexWorksById(works);
    if (worksById.size === 0) {
      gaps.push({
        code: "CATALOG_EMPTY",
        field: "pricing.catalog.worksById",
        messagePl: "Katalog robót aktywnych jest pusty dla aktywnego regionu.",
        severity: "info",
      });
    }
    const pricing: AnalyzeMarketPricingOptions = {
      catalog: { worksById },
    };
    return {
      pricing,
      gaps,
      source: "kw-wgdom-work-catalog",
    };
  } catch {
    gaps.push({
      code: "CATALOG_UNAVAILABLE",
      field: "pricing",
      messagePl: "Nie udało się odczytać kw-wgdom-work-catalog.",
      severity: "warn",
    });
    return {
      pricing: null,
      gaps,
      source: "unavailable",
    };
  }
}
