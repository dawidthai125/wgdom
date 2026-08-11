/**
 * P0 — walidacja / parse linii faktury W&G DOM (COMPANY PURCHASE).
 * Pure · bez I/O · bez EAN invention.
 */

import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import type {
  ParseInvoiceLineResult,
  RawInvoiceLineInput,
  RejectedInvoiceLine,
} from "./invoice-types";

function reject(
  raw: RawInvoiceLineInput,
  reason: RejectedInvoiceLine["reason"],
  messagePl: string,
): RejectedInvoiceLine {
  return { status: "rejected", reason, messagePl, raw };
}

function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v)
    .trim()
    .replace(/\s+/g, "")
    .replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Normalizacja jednostki PL (Jm.) → klucz porównywalny. */
export function normalizeInvoiceUnit(unit: string): string {
  const u = foldPolishText(unit || "")
    .replace(/\./g, "")
    .replace(/\s+/g, "");
  if (u === "m2" || u === "m²" || u === "mkw" || u === "sqm") return "m2";
  if (u === "m3" || u === "m³" || u === "m3") return "m3";
  if (u === "kg" || u === "kilogram" || u === "kilogramy") return "kg";
  if (
    u === "szt" ||
    u === "sztuka" ||
    u === "sztuki" ||
    u === "op" ||
    u === "opak" ||
    u === "wor" ||
    u === "worek" ||
    u === "para" ||
    u === "pary"
  ) {
    return "szt";
  }
  if (u === "kpl" || u === "komplet") return "kpl";
  if (u === "mb" || u === "m" || u === "mbiezacym") return "mb";
  if (u === "l" || u === "ltr" || u === "litr") return "l";
  return u || "";
}

/**
 * Efektywna cena netto jedn.:
 * 1) netUnitPrice gdy > 0 (już po upuście — typowa faktura PL)
 * 2) inaczej listNetUnitPrice × (1 − discount/100)
 */
export function resolveEffectiveNetUnitPrice(input: {
  netUnitPrice?: number | string;
  listNetUnitPrice?: number | string;
  discountPct?: number | string;
}): { ok: true; netUnitPrice: number; discountPct: number } | { ok: false; reason: RejectedInvoiceLine["reason"]; messagePl: string } {
  const discountRaw = toNum(input.discountPct);
  const discountPct = discountRaw == null ? 0 : discountRaw;
  if (discountPct < 0 || discountPct > 100) {
    return { ok: false, reason: "invalid_discount", messagePl: "Upust % poza zakresem 0–100." };
  }

  const net = toNum(input.netUnitPrice);
  if (net != null && net > 0) {
    return { ok: true, netUnitPrice: round2(net), discountPct };
  }

  const list = toNum(input.listNetUnitPrice);
  if (list != null && list > 0) {
    const effective = round2(list * (1 - discountPct / 100));
    if (!(effective > 0)) {
      return { ok: false, reason: "missing_price", messagePl: "Cena po upuście ≤ 0." };
    }
    return { ok: true, netUnitPrice: effective, discountPct };
  }

  return { ok: false, reason: "missing_price", messagePl: "Brak ceny netto jednostkowej." };
}

/** Parse + walidacja jednej linii faktury. */
export function parseInvoiceLine(raw: RawInvoiceLineInput): ParseInvoiceLineResult {
  const supplier = String(raw.supplier || "").trim();
  const invoiceDate = String(raw.invoiceDate || "").trim();
  const invoiceRef = String(raw.invoiceRef || "").trim();
  const productCode = String(raw.productCode || "").trim() || undefined;
  const productName = String(raw.productName || "").trim();
  const unitRaw = String(raw.unit || "").trim();
  const unit = normalizeInvoiceUnit(unitRaw);

  if (!productName && !productCode) {
    return reject(raw, "missing_product", "Brak nazwy i kodu produktu.");
  }
  if (!unit) {
    return reject(raw, "invalid_unit", "Brak lub niepoprawna jednostka (Jm.).");
  }

  const quantity = toNum(raw.quantity);
  if (quantity == null || !(quantity > 0)) {
    return reject(raw, "invalid_quantity", "Ilość musi być > 0.");
  }

  const price = resolveEffectiveNetUnitPrice(raw);
  if (!price.ok) {
    return reject(raw, price.reason, price.messagePl);
  }

  const ean = String(raw.ean || "").trim() || undefined;
  const manufacturer = String(raw.manufacturer || "").trim() || undefined;
  const deliveryDate = String(raw.deliveryDate || "").trim() || undefined;
  const ksefId = String(raw.ksefId || "").trim() || undefined;
  const netValue = toNum(raw.netValue) ?? undefined;
  const vatPct = toNum(raw.vatPct) ?? undefined;
  const grossValue = toNum(raw.grossValue) ?? undefined;

  return {
    status: "ok",
    supplier: supplier || "UNKNOWN_SUPPLIER",
    invoiceDate: invoiceDate || "1970-01-01",
    invoiceRef: invoiceRef || "UNKNOWN_INVOICE",
    deliveryDate,
    productCode,
    productName: productName || productCode || "UNKNOWN",
    unit,
    quantity,
    discountPct: price.discountPct,
    netUnitPrice: price.netUnitPrice,
    netValue,
    vatPct,
    grossValue,
    ksefId,
    ean,
    manufacturer,
    lineIndex: typeof raw.lineIndex === "number" ? raw.lineIndex : 0,
  };
}

/** Batch parse — lokalnie, bez requestów per linia. */
export function parseInvoiceLines(rawLines: readonly RawInvoiceLineInput[]): ParseInvoiceLineResult[] {
  return rawLines.map((r, i) =>
    parseInvoiceLine({ ...r, lineIndex: r.lineIndex ?? i }),
  );
}
