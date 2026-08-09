/**
 * PROVIDERS-01 P1 — zatwierdzone konwersje jednostek faktury (deterministyczne).
 * Bez smart converter · bez zgadywania opakowań.
 */

export interface InvoiceApprovedConversion {
  conversionId: string;
  fromUnit: string;
  toUnit: string;
  /** qty_to = qty_from * factor · price_to = price_from / factor */
  factor: number;
  /** Exact substring guards na normalizedName (fold) — nie fuzzy. */
  requireNameTokens?: readonly string[];
  provenance: string;
}

/** Jedyna zatwierdzona konwersja P1a. */
export const MAPETHERM_SZT_25KG_CONVERSION_ID = "mapetherm_szt_25kg";

export const INVOICE_APPROVED_CONVERSIONS: readonly InvoiceApprovedConversion[] = [
  {
    conversionId: MAPETHERM_SZT_25KG_CONVERSION_ID,
    fromUnit: "szt",
    toUnit: "kg",
    factor: 25,
    requireNameTokens: ["25", "kg"],
    provenance: "Owner DF P1a · MAPETHERM 1 szt = 25 kg",
  },
] as const;

export function getInvoiceApprovedConversion(
  conversionId: string,
): InvoiceApprovedConversion | null {
  const id = String(conversionId || "").trim();
  if (!id) return null;
  return INVOICE_APPROVED_CONVERSIONS.find((c) => c.conversionId === id) ?? null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type ApplyInvoiceConversionResult =
  | { ok: true; quantity: number; netUnitPrice: number; conversionId: string }
  | { ok: false; reasonPl: string };

/**
 * Stosuje approved conversion. Brak pewności → ok:false (caller → NEEDS_REVIEW).
 */
export function applyInvoiceUnitConversion(opts: {
  conversionId: string;
  fromUnit: string;
  toUnit: string;
  quantity: number;
  netUnitPrice: number;
  normalizedName?: string;
}): ApplyInvoiceConversionResult {
  const conv = getInvoiceApprovedConversion(opts.conversionId);
  if (!conv) {
    return { ok: false, reasonPl: `Brak approved conversion: ${opts.conversionId}` };
  }
  if (conv.fromUnit !== opts.fromUnit || conv.toUnit !== opts.toUnit) {
    return {
      ok: false,
      reasonPl: `Conversion ${conv.conversionId}: jednostki ${opts.fromUnit}→${opts.toUnit} ≠ ${conv.fromUnit}→${conv.toUnit}`,
    };
  }
  if (!(conv.factor > 0) || !Number.isFinite(conv.factor)) {
    return { ok: false, reasonPl: `Conversion ${conv.conversionId}: nieprawidłowy factor` };
  }
  if (!(opts.quantity > 0) || !(opts.netUnitPrice > 0)) {
    return { ok: false, reasonPl: "Conversion wymaga quantity > 0 i netUnitPrice > 0" };
  }
  const name = opts.normalizedName || "";
  for (const token of conv.requireNameTokens ?? []) {
    if (!name.includes(token)) {
      return {
        ok: false,
        reasonPl: `Conversion ${conv.conversionId}: brak exact tokenu «${token}» w nazwie`,
      };
    }
  }
  return {
    ok: true,
    conversionId: conv.conversionId,
    quantity: round2(opts.quantity * conv.factor),
    netUnitPrice: round2(opts.netUnitPrice / conv.factor),
  };
}
