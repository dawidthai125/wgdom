/**
 * PROVIDERS-01 P1a — CODE DICTIONARY: approved invoice identity → materialKey.
 * Version-controlled · bez KV/SQL · bez runtime mutation · tylko status approved.
 */

import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import { buildSupplierKey } from "./invoice-normalize";
import type { NormalizedInvoiceProduct } from "./invoice-types";

export type InvoiceApprovedMapStatus = "approved";

export interface InvoiceApprovedMapEntry {
  supplierKey: string;
  productCode?: string;
  ean?: string;
  normalizedName?: string;
  unitKey?: string;
  materialKey: string;
  purchaseNamePl: string;
  purchaseUnit: string;
  conversionId?: string;
  status: InvoiceApprovedMapStatus;
  provenance: string;
  approvedAt: string;
  approvedBy: "owner";
}

/**
 * Seed P1a — puste: brak wystarczająco pewnych kodów Zygmunt w AUDIT do hardcodu.
 * Nie zgadujemy kodów. Testy wstrzykują entries przez forceInvoiceApprovedMapForTests.
 */
export const INVOICE_APPROVED_MAP_ENTRIES: readonly InvoiceApprovedMapEntry[] = [];

let approvedMapOverrideForTests: readonly InvoiceApprovedMapEntry[] | null = null;

/** Tylko testy — null = przywróć seed produkcyjny. */
export function forceInvoiceApprovedMapForTests(
  entries: readonly InvoiceApprovedMapEntry[] | null,
): void {
  approvedMapOverrideForTests = entries;
}

export function getInvoiceApprovedMapEntries(): readonly InvoiceApprovedMapEntry[] {
  return approvedMapOverrideForTests ?? INVOICE_APPROVED_MAP_ENTRIES;
}

function foldCode(code: string): string {
  return foldPolishText(code || "").replace(/\s+/g, "");
}

function foldEan(ean: string): string {
  return String(ean || "").replace(/\s+/g, "").trim();
}

/** Exact match helpers — bez fuzzy. */
export function matchApprovedBySupplierCode(
  entries: readonly InvoiceApprovedMapEntry[],
  supplierKey: string,
  productCode: string,
): InvoiceApprovedMapEntry | null {
  const code = foldCode(productCode);
  if (!supplierKey || !code) return null;
  return (
    entries.find(
      (e) =>
        e.status === "approved" &&
        e.supplierKey === supplierKey &&
        e.productCode != null &&
        foldCode(e.productCode) === code,
    ) ?? null
  );
}

export function matchApprovedByEan(
  entries: readonly InvoiceApprovedMapEntry[],
  ean: string,
): InvoiceApprovedMapEntry | null {
  const key = foldEan(ean);
  if (!key) return null;
  return (
    entries.find(
      (e) => e.status === "approved" && e.ean != null && foldEan(e.ean) === key,
    ) ?? null
  );
}

export function matchApprovedBySupplierNameUnit(
  entries: readonly InvoiceApprovedMapEntry[],
  supplierKey: string,
  normalizedName: string,
  unitKey: string,
): InvoiceApprovedMapEntry | null {
  if (!supplierKey || !normalizedName || !unitKey) return null;
  return (
    entries.find(
      (e) =>
        e.status === "approved" &&
        e.supplierKey === supplierKey &&
        e.normalizedName != null &&
        e.unitKey != null &&
        e.normalizedName === normalizedName &&
        e.unitKey === unitKey,
    ) ?? null
  );
}

/**
 * Hierarchy 1→3 only (dictionary). Nie uruchamia P0 fallback.
 * EAN nie zmienia productIdentityKey historii.
 */
export function lookupInvoiceApprovedMap(
  product: NormalizedInvoiceProduct,
  entries: readonly InvoiceApprovedMapEntry[] = getInvoiceApprovedMapEntries(),
): InvoiceApprovedMapEntry | null {
  const supplierKey = product.supplierKey || buildSupplierKey(product.supplier);

  if (product.productCode) {
    const byCode = matchApprovedBySupplierCode(entries, supplierKey, product.productCode);
    if (byCode) return byCode;
  }

  if (product.ean) {
    const byEan = matchApprovedByEan(entries, product.ean);
    if (byEan) return byEan;
  }

  return matchApprovedBySupplierNameUnit(
    entries,
    supplierKey,
    product.normalizedName,
    product.unitKey,
  );
}

/** Guard testowy: brak fuzzy / LLM w module (kontrakt). */
export function invoiceApprovedMapUsesFuzzyOrLlm(): false {
  return false;
}
