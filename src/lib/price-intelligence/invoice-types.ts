/**
 * PRICE-INTELLIGENCE-PROVIDERS-01 P0 — FAKTURY W&G DOM → COMPANY PURCHASE.
 * Semantyka: COMPANY PURCHASE only · ≠ marketQuotes · bez wymyślania EAN.
 */

/** Status walidacji / mapowania linii faktury. */
export type InvoiceLineStatus =
  | "ok"
  | "rejected"
  | "unmatched"
  | "needs_review"
  | "mapped";

export type InvoiceRejectReason =
  | "missing_product"
  | "missing_price"
  | "invalid_quantity"
  | "invalid_unit"
  | "invalid_discount";

/** Surowa linia faktury (po ekstrakcji PDF/tekst / ręcznym imporcie). */
export interface RawInvoiceLineInput {
  supplier: string;
  invoiceDate: string;
  invoiceRef: string;
  deliveryDate?: string;
  productCode?: string;
  productName?: string;
  unit?: string;
  quantity?: number | string;
  /** Upust % (0–100). */
  discountPct?: number | string;
  /** Cena netto jedn. (po upuście, jak na fakturze PL). */
  netUnitPrice?: number | string;
  /** Opcjonalnie cena przed upustem — gdy brak netUnitPrice. */
  listNetUnitPrice?: number | string;
  netValue?: number | string;
  vatPct?: number | string;
  grossValue?: number | string;
  ksefId?: string;
  /** EAN tylko gdy jawnie na dokumencie — NIE generować. */
  ean?: string;
  manufacturer?: string;
  lineIndex?: number;
}

/** Zwalidowana linia z efektywną ceną netto jednostkową. */
export interface ParsedInvoiceLine {
  status: "ok";
  supplier: string;
  invoiceDate: string;
  invoiceRef: string;
  deliveryDate?: string;
  productCode?: string;
  productName: string;
  unit: string;
  quantity: number;
  discountPct: number;
  netUnitPrice: number;
  netValue?: number;
  vatPct?: number;
  grossValue?: number;
  ksefId?: string;
  ean?: string;
  manufacturer?: string;
  lineIndex: number;
}

export interface RejectedInvoiceLine {
  status: "rejected";
  reason: InvoiceRejectReason;
  messagePl: string;
  raw: RawInvoiceLineInput;
}

export type ParseInvoiceLineResult = ParsedInvoiceLine | RejectedInvoiceLine;

/** Tożsamość produktu zakupowego (bez LLM / fuzzy SSOT). */
export interface NormalizedInvoiceProduct {
  productIdentityKey: string;
  identityRule: "code_supplier" | "name_unit_supplier";
  supplierKey: string;
  supplier: string;
  productCode?: string;
  normalizedName: string;
  unitKey: string;
  unit: string;
  ean?: string;
  manufacturer?: string;
}

export interface InvoicePriceProvenance {
  supplier: string;
  invoiceDate: string;
  invoiceRef: string;
  productCode?: string;
  unit: string;
  quantity: number;
  netUnitPrice: number;
  discountPct?: number;
  deliveryDate?: string;
  ksefId?: string;
  ean?: string;
}

/** Obserwacja ceny zakupu (in-memory / przed ACCEPT). */
export interface InvoicePriceObservation {
  observationId: string;
  productIdentityKey: string;
  observedAt: string;
  netUnitPrice: number;
  quantity: number;
  unit: string;
  provenance: InvoicePriceProvenance;
  productName: string;
  productCode?: string;
}

export type InvoiceMapStatus = "mapped" | "unmatched" | "needs_review";

export interface InvoiceMaterialMapping {
  status: InvoiceMapStatus;
  materialKey?: string;
  /** Nazwa TF / company knowledge (P1 alias). */
  purchaseNamePl?: string;
  purchaseUnit?: string;
  /** Cena w jednostce Purchase (po ewentualnej konwersji szt→kg). */
  purchaseUnitPricePln?: number;
  /** Ilość w jednostce Purchase. */
  purchaseQuantity?: number;
  reasonPl: string;
}

export interface MappedInvoicePurchaseCandidate {
  observation: InvoicePriceObservation;
  product: NormalizedInvoiceProduct;
  mapping: InvoiceMaterialMapping;
  parsed: ParsedInvoiceLine;
}

export interface InvoiceProductPriceHistory {
  productIdentityKey: string;
  lastPurchasePrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  averagePrice: number | null;
  weightedAveragePrice: number | null;
  purchaseCount: number;
  firstPurchaseDate: string | null;
  lastPurchaseDate: string | null;
  observations: InvoicePriceObservation[];
}
