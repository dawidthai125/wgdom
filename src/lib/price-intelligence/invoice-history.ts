/**
 * P0 — historia cen zakupowych z obserwacji faktur (pure, in-memory).
 * Nie tworzy fikcyjnej historii · nie zapisuje KV.
 */

import type {
  InvoicePriceObservation,
  InvoiceProductPriceHistory,
  NormalizedInvoiceProduct,
  ParsedInvoiceLine,
} from "./invoice-types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildInvoiceObservationId(
  productIdentityKey: string,
  invoiceRef: string,
  lineIndex: number,
): string {
  const safe = productIdentityKey.replace(/[^a-z0-9_|:-]/gi, "_").slice(0, 80);
  return `invobs_${safe}_${invoiceRef}_${lineIndex}`.slice(0, 160);
}

export function observationFromParsedLine(
  line: ParsedInvoiceLine,
  product: NormalizedInvoiceProduct,
): InvoicePriceObservation {
  return {
    observationId: buildInvoiceObservationId(
      product.productIdentityKey,
      line.invoiceRef,
      line.lineIndex,
    ),
    productIdentityKey: product.productIdentityKey,
    observedAt: line.invoiceDate,
    netUnitPrice: line.netUnitPrice,
    quantity: line.quantity,
    unit: product.unit,
    productName: line.productName,
    productCode: line.productCode,
    provenance: {
      supplier: line.supplier,
      invoiceDate: line.invoiceDate,
      invoiceRef: line.invoiceRef,
      productCode: line.productCode,
      unit: product.unit,
      quantity: line.quantity,
      netUnitPrice: line.netUnitPrice,
      discountPct: line.discountPct,
      deliveryDate: line.deliveryDate,
      ksefId: line.ksefId,
      ean: line.ean,
    },
  };
}

/** Agregacja historii dla jednego productIdentityKey. */
export function buildInvoiceProductPriceHistory(
  observations: readonly InvoicePriceObservation[],
  productIdentityKey: string,
): InvoiceProductPriceHistory {
  const list = observations
    .filter((o) => o.productIdentityKey === productIdentityKey)
    .slice()
    .sort((a, b) => String(a.observedAt).localeCompare(String(b.observedAt)));

  if (!list.length) {
    return {
      productIdentityKey,
      lastPurchasePrice: null,
      minPrice: null,
      maxPrice: null,
      averagePrice: null,
      weightedAveragePrice: null,
      purchaseCount: 0,
      firstPurchaseDate: null,
      lastPurchaseDate: null,
      observations: [],
    };
  }

  const prices = list.map((o) => o.netUnitPrice);
  const minPrice = round2(Math.min(...prices));
  const maxPrice = round2(Math.max(...prices));
  const averagePrice = round2(prices.reduce((s, p) => s + p, 0) / prices.length);

  let weightSum = 0;
  let weighted = 0;
  for (const o of list) {
    const w = o.quantity > 0 ? o.quantity : 0;
    weighted += o.netUnitPrice * w;
    weightSum += w;
  }
  const weightedAveragePrice = weightSum > 0 ? round2(weighted / weightSum) : averagePrice;

  const last = list[list.length - 1]!;
  return {
    productIdentityKey,
    lastPurchasePrice: last.netUnitPrice,
    minPrice,
    maxPrice,
    averagePrice,
    weightedAveragePrice,
    purchaseCount: list.length,
    firstPurchaseDate: list[0]!.observedAt,
    lastPurchaseDate: last.observedAt,
    observations: list,
  };
}

/** Grupuje obserwacje → historie per identity (bez scalania różnych kluczy). */
export function buildAllInvoiceProductHistories(
  observations: readonly InvoicePriceObservation[],
): InvoiceProductPriceHistory[] {
  const keys = [...new Set(observations.map((o) => o.productIdentityKey))];
  return keys
    .map((k) => buildInvoiceProductPriceHistory(observations, k))
    .sort((a, b) => a.productIdentityKey.localeCompare(b.productIdentityKey));
}
