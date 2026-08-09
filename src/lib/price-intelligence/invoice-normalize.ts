/**
 * P0 — normalizacja tożsamości produktu zakupowego.
 * Preferencja: productCode+supplier · inaczej name+unit+supplier.
 * Bez LLM / fuzzy SSOT · bez scalania po podobieństwie nazwy.
 */

import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import type { NormalizedInvoiceProduct, ParsedInvoiceLine } from "./invoice-types";
import { normalizeInvoiceUnit } from "./invoice-parse";

export function buildSupplierKey(supplier: string): string {
  return foldPolishText(supplier || "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildNormalizedProductName(namePl: string): string {
  return foldPolishText(namePl || "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Klucz tożsamości:
 * 1) code + supplier
 * 2) normalized name + unit + supplier
 */
export function buildProductIdentityKey(opts: {
  supplier: string;
  productCode?: string;
  productName: string;
  unit: string;
}): { productIdentityKey: string; identityRule: NormalizedInvoiceProduct["identityRule"]; supplierKey: string; normalizedName: string; unitKey: string } {
  const supplierKey = buildSupplierKey(opts.supplier);
  const unitKey = normalizeInvoiceUnit(opts.unit);
  const code = String(opts.productCode || "").trim();
  if (code) {
    const codeKey = foldPolishText(code).replace(/\s+/g, "");
    return {
      productIdentityKey: `sup:${supplierKey}|code:${codeKey}`,
      identityRule: "code_supplier",
      supplierKey,
      normalizedName: buildNormalizedProductName(opts.productName),
      unitKey,
    };
  }
  const normalizedName = buildNormalizedProductName(opts.productName);
  return {
    productIdentityKey: `sup:${supplierKey}|name:${normalizedName}|unit:${unitKey}`,
    identityRule: "name_unit_supplier",
    supplierKey,
    normalizedName,
    unitKey,
  };
}

/** Producent tylko gdy jednoznacznie z nazwy/kodu — bez zgadywania. */
export function inferManufacturerIfExplicit(productName: string, productCode?: string): string | undefined {
  const blob = `${productName || ""} ${productCode || ""}`;
  const folded = foldPolishText(blob);
  if (/\bmapei\b/.test(folded) || /\bmapetherm\b/.test(folded)) return "MAPEI";
  if (/\brednet\b/.test(folded)) return "REDNET";
  return undefined;
}

export function normalizeInvoiceProduct(line: ParsedInvoiceLine): NormalizedInvoiceProduct {
  const id = buildProductIdentityKey({
    supplier: line.supplier,
    productCode: line.productCode,
    productName: line.productName,
    unit: line.unit,
  });
  const manufacturer =
    line.manufacturer ||
    inferManufacturerIfExplicit(line.productName, line.productCode);
  return {
    productIdentityKey: id.productIdentityKey,
    identityRule: id.identityRule,
    supplierKey: id.supplierKey,
    supplier: line.supplier,
    productCode: line.productCode,
    normalizedName: id.normalizedName,
    unitKey: id.unitKey,
    unit: id.unitKey,
    ean: line.ean,
    manufacturer,
  };
}
