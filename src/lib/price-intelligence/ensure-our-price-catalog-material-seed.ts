/**
 * PRICE-MEMORY-CATALOG-03 — thin shared entry for Zygmunt purchase seed.
 * REUSE ensureZygmuntInvoicePurchaseSeedLocal · ZERO live HTTP · idempotent.
 * UI catalog path: pushCloud=false · Chief: pushCloud=true.
 */

import {
  ensureZygmuntInvoicePurchaseSeedLocal,
  type EnsureZygmuntInvoicePurchaseSeedResult,
} from "./ensure-zygmunt-invoice-purchase-seed";

/**
 * Shared initializer (PLAN A+D): Chief + Firma → Nasz katalog cen.
 * Does not invent materials · does not live-fetch · upsert-only.
 */
export function ensureOurPriceCatalogMaterialPurchaseSeed(opts?: {
  /** Default false — catalog UI open must not storm cloud. */
  pushCloud?: boolean;
}): EnsureZygmuntInvoicePurchaseSeedResult {
  return ensureZygmuntInvoicePurchaseSeedLocal({
    pushCloud: opts?.pushCloud === true,
  });
}
