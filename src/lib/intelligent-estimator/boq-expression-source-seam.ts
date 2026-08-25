/**
 * IK S4-A — Expression source seam (Document Expert / BOQ ingest).
 * ATH przedmiar formula/calc → OfferBoqLine.quantityExpressionRaw (metadata only).
 * Does NOT mutate line.quantity.
 */

export type AthPrzedmiarFormulaSource = {
  quantity: string;
  formula?: string;
};

/** Normalize lp for stable join (catalog row ↔ ATH preview row). */
export function normalizeBoqPositionLp(lp: string | null | undefined): string {
  const t = String(lp ?? "").trim();
  if (!t) return "";
  const digits = t.replace(/\D/g, "");
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) && n > 0 ? String(n) : t;
}

export function isBoqExpressionLike(raw: string | null | undefined): boolean {
  const t = String(raw ?? "").trim();
  if (!t) return false;
  if (/^poz\.?\s*\d+$/i.test(t)) return true;
  if (/krotność\s*=/i.test(t)) return true;
  if (/[+\-*/()]/.test(t)) return true;
  if (/poz\.?\s*\d+/i.test(t)) return true;
  return false;
}

/**
 * Best-effort formula from ATH [PRZEDMIAR] lines attached to a catalog row.
 * Returns null when only a final numeric quantity is available (backward compatible).
 */
export function resolveQuantityExpressionFromPrzedmiar(
  przedmiar?: readonly AthPrzedmiarFormulaSource[] | null,
): string | null {
  if (!przedmiar?.length) return null;

  const parts: string[] = [];
  for (const row of przedmiar) {
    const formula = String(row.formula ?? "").trim();
    const qty = String(row.quantity ?? "").trim();
    if (formula && isBoqExpressionLike(formula)) {
      parts.push(formula);
    } else if (formula && qty && formula !== qty.replace(/\s/g, "")) {
      parts.push(formula);
    } else if (!formula && qty && isBoqExpressionLike(qty)) {
      parts.push(qty);
    }
  }

  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0]!;
  return parts.join(" + ");
}

export function buildQuantityExpressionsByLpFromAthRows(
  rows: ReadonlyArray<{ lp?: string; przedmiar?: readonly AthPrzedmiarFormulaSource[] }>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    const lp = normalizeBoqPositionLp(row.lp);
    if (!lp) continue;
    const expr = resolveQuantityExpressionFromPrzedmiar(row.przedmiar);
    if (expr) out[lp] = expr;
  }
  return out;
}
