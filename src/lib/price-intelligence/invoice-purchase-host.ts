/**
 * Invoice → Price Memory host identity (HISTORICAL PURCHASE).
 * Exact productIdentityKey · ZERO fuzzy merge · mat.inv.* / cw.inv.* convention.
 */

import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import type { MaterialMarketMapEntry } from "@/lib/pricing-expert/types";
import type { NormalizedInvoiceProduct } from "./invoice-types";
import { normalizeInvoiceUnit } from "./invoice-parse";
import { mapInvoiceProductToMaterial } from "./invoice-etics-map";
import { mapMaterialToMarketWork, preferProductCatalogWorkId } from "@/lib/pricing-expert/material-market-map";

export const INVOICE_PURCHASE_MATERIAL_PREFIX = "mat.inv." as const;
export const INVOICE_PURCHASE_WORK_PREFIX = "cw.inv." as const;

export type InvoicePurchaseHostResolution =
  | {
      status: "ok";
      materialKey: string;
      catalogWorkId: string;
      purchaseNamePl: string;
      purchaseUnit: WgdomCostUnit;
      via: "approved_or_etics" | "invoice_host";
      reasonPl: string;
    }
  | {
      status: "gap";
      reason: "unit_unsupported" | "identity_collision" | "empty_identity";
      reasonPl: string;
    };

/** Stable short hash — identity only, not a second materialKey SSOT. */
export function stableInvoiceSlugHash(input: string, len = 10): string {
  let h = 2166136261;
  const s = String(input || "");
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).padStart(len, "0").slice(0, len);
}

export function slugifyInvoiceProductCode(code: string): string {
  const raw = foldPolishText(code || "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return raw || stableInvoiceSlugHash(code);
}

export function isInvoicePurchaseMaterialKey(materialKey: string): boolean {
  return String(materialKey || "").trim().startsWith(INVOICE_PURCHASE_MATERIAL_PREFIX);
}

export function isInvoicePurchaseCatalogWorkId(catalogWorkId: string): boolean {
  return String(catalogWorkId || "").trim().startsWith(INVOICE_PURCHASE_WORK_PREFIX);
}

export function invoicePurchaseWorkIdFromMaterialKey(materialKey: string): string | null {
  const mk = String(materialKey || "").trim();
  if (!isInvoicePurchaseMaterialKey(mk)) return null;
  const slug = mk.slice(INVOICE_PURCHASE_MATERIAL_PREFIX.length);
  if (!slug) return null;
  return `${INVOICE_PURCHASE_WORK_PREFIX}${slug}`;
}

export function invoicePurchaseMaterialKeyFromWorkId(catalogWorkId: string): string | null {
  const id = String(catalogWorkId || "").trim();
  if (!isInvoicePurchaseCatalogWorkId(id)) return null;
  const slug = id.slice(INVOICE_PURCHASE_WORK_PREFIX.length);
  if (!slug) return null;
  return `${INVOICE_PURCHASE_MATERIAL_PREFIX}${slug}`;
}

/** Map invoice unit keys onto CatalogWork units — unsupported → GAP. */
export function toInvoiceCatalogWorkUnit(unitKey: string): WgdomCostUnit | null {
  const u = normalizeInvoiceUnit(unitKey);
  if (u === "m2" || u === "mb" || u === "szt" || u === "m3" || u === "kpl" || u === "kg" || u === "l" || u === "rbh") {
    return u;
  }
  if (u === "wor" || u === "para" || u === "opak" || u === "op") return "szt";
  return null;
}

function hostMaterialKeyFromProduct(product: NormalizedInvoiceProduct): string {
  if (product.productCode?.trim()) {
    return `${INVOICE_PURCHASE_MATERIAL_PREFIX}${slugifyInvoiceProductCode(product.productCode)}`;
  }
  return `${INVOICE_PURCHASE_MATERIAL_PREFIX}h${stableInvoiceSlugHash(product.productIdentityKey)}`;
}

/**
 * Resolve host for one normalized invoice product.
 * Prefer existing approved/ETICS materialKey; else create deterministic invoice host.
 */
export function resolveInvoicePurchaseHost(
  product: NormalizedInvoiceProduct,
  opts?: { netUnitPrice?: number; quantity?: number },
): InvoicePurchaseHostResolution {
  if (!product.productIdentityKey?.trim()) {
    return {
      status: "gap",
      reason: "empty_identity",
      reasonPl: "Brak productIdentityKey — IDENTITY GAP.",
    };
  }

  const unit = toInvoiceCatalogWorkUnit(product.unitKey || product.unit);
  if (!unit) {
    return {
      status: "gap",
      reason: "unit_unsupported",
      reasonPl: `Jednostka «${product.unitKey || product.unit}» nie mapuje się na CatalogWork — PRICE/IDENTITY GAP.`,
    };
  }

  const mapped = mapInvoiceProductToMaterial(product, {
    netUnitPrice: opts?.netUnitPrice ?? 0,
    quantity: opts?.quantity ?? 0,
  });
  // Only hard-mapped TF/approved keys — needs_review/unmatched stay on invoice host
  // (wrong product > missing: never force ambiguous ETICS onto a different SKU).
  if (mapped.status === "mapped" && mapped.materialKey && mapped.purchaseNamePl && mapped.purchaseUnit) {
    const map = mapMaterialToMarketWork(mapped.materialKey);
    const catalogWorkId = map
      ? preferProductCatalogWorkId(map)
      : `cw.market.${mapped.materialKey.replace(/^mat\./, "")}`;
    const purchaseUnit = toInvoiceCatalogWorkUnit(mapped.purchaseUnit) ?? unit;
    return {
      status: "ok",
      materialKey: mapped.materialKey,
      catalogWorkId,
      purchaseNamePl: mapped.purchaseNamePl,
      purchaseUnit,
      via: "approved_or_etics",
      reasonPl: mapped.reasonPl,
    };
  }

  const materialKey = hostMaterialKeyFromProduct(product);
  const catalogWorkId = invoicePurchaseWorkIdFromMaterialKey(materialKey)!;
  return {
    status: "ok",
    materialKey,
    catalogWorkId,
    purchaseNamePl: product.normalizedName || product.productCode || materialKey,
    purchaseUnit: unit,
    via: "invoice_host",
    reasonPl: "Invoice purchase host · productIdentityKey exact",
  };
}

/** Thin MaterialMarketMapEntry for invoice hosts (lookup / Demand identity). */
export function buildInvoicePurchaseMapEntry(host: {
  materialKey: string;
  catalogWorkId: string;
  purchaseNamePl: string;
}): MaterialMarketMapEntry {
  return {
    materialKey: host.materialKey,
    workId: host.catalogWorkId,
    candidateWorkIds: [host.catalogWorkId],
    marketProductId: `mp.inv.${host.materialKey.slice(INVOICE_PURCHASE_MATERIAL_PREFIX.length)}`,
    labelPl: host.purchaseNamePl,
  };
}
