/**
 * IK-HISTORICAL-EXECUTED-ATH — normalize keys + query extract (pure).
 */

import type { CatalogBasis } from "@/lib/tenders-bzp-swz";

export function normSpace(s: string): string {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

export function normalizeHistoricalDisplayCode(code: string): string {
  return normSpace(code).toUpperCase();
}

/** family + catalogId + tableCode → "KNR 2-02 1505-01" */
export function buildDisplayKeyFromParts(
  family: string | null | undefined,
  catalogId: string | null | undefined,
  tableCode: string | null | undefined,
): string | null {
  const f = normSpace(family ?? "").toUpperCase();
  const c = normSpace(catalogId ?? "");
  const t = normSpace(tableCode ?? "");
  if (!f || !c || !t) return null;
  if (f === "OTHER") return null;
  return normalizeHistoricalDisplayCode(`${f} ${c} ${t}`);
}

export function buildFamilyCatalogKey(
  family: string | null | undefined,
  catalogId: string | null | undefined,
): string | null {
  const f = normSpace(family ?? "").toUpperCase();
  const c = normSpace(catalogId ?? "");
  if (!f || !c || f === "OTHER") return null;
  return `${f} ${c}`;
}

export function parseDisplayCodeParts(displayCode: string): {
  family: string;
  catalogId: string;
  tableCode: string;
} | null {
  const d = normSpace(displayCode);
  const m = d.match(/^(KNR(?:-W)?|KNNR|NNRNKB)\s+([\d.-]+)\s+(\d{3,4}-\d{2})$/i);
  if (!m) return null;
  return {
    family: m[1].toUpperCase(),
    catalogId: m[2],
    tableCode: m[3],
  };
}

/** Extract table tokens like 1505-01 from PDF description noise. */
export function extractTableTokensFromText(...parts: Array<string | null | undefined>): string[] {
  const blob = parts.map((p) => normSpace(p ?? "")).join(" ");
  const found = new Set<string>();
  for (const m of blob.matchAll(/\b(\d{3,4}-\d{2})\b/g)) {
    found.add(m[1]);
  }
  return [...found];
}

export function displayKeysFromCatalogBasis(
  basis: CatalogBasis | null | undefined,
  description?: string | null,
): string[] {
  const keys: string[] = [];
  const primary = buildDisplayKeyFromParts(basis?.family, basis?.catalogId, basis?.tableCode);
  if (primary) keys.push(primary);

  const family = basis?.family ? String(basis.family).toUpperCase() : "";
  const catalogId = basis?.catalogId ? String(basis.catalogId) : "";
  if (family && catalogId && !basis?.tableCode) {
    for (const t of extractTableTokensFromText(description, basis?.rawCode, basis?.display)) {
      const k = buildDisplayKeyFromParts(family, catalogId, t);
      if (k) keys.push(k);
    }
  }
  return [...new Set(keys.map(normalizeHistoricalDisplayCode))];
}

export function summarizeMaterialNorms(
  norms: { materialNorms: Array<{ description: string; quantity: number }> } | null,
): string | null {
  if (!norms?.materialNorms?.length) return null;
  return norms.materialNorms
    .slice(0, 3)
    .map((m) => `${m.description}:${m.quantity}`)
    .join(" | ");
}
