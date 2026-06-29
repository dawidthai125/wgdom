/**
 * P2.4 — grupowa zmiana cen firmy (pure, app layer).
 */

import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog";
import { withFreshnessStatus } from "@/lib/work-catalog";
import { validateCompanyPricePlnInput } from "@/app/work-catalog/work-catalog-price";

export type BulkPriceOperationKind =
  | "percent_add"
  | "percent_sub"
  | "amount_add"
  | "amount_sub"
  | "set_price";

export interface BulkPriceOperation {
  kind: BulkPriceOperationKind;
  value: number;
}

export interface BulkPricePreviewRow {
  workId: string;
  namePl: string;
  unit: string;
  oldPricePln: number;
  newPricePln: number;
}

export type ValidateBulkOperationResult =
  | { ok: true; operation: BulkPriceOperation }
  | { ok: false; message: string };

const PERCENT_INPUT_RE = /^\d+(\.\d{1,2})?$/;

export function roundCompanyPricePln(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, value) * 100) / 100;
}

export function formatCompanyPricePlnLabel(companyPricePln: number): string {
  const value = roundCompanyPricePln(companyPricePln);
  return `${value.toFixed(2).replace(".", ",")} zł`;
}

export function bulkOperationLabelPl(kind: BulkPriceOperationKind): string {
  switch (kind) {
    case "percent_add":
      return "Podnieś o %";
    case "percent_sub":
      return "Obniż o %";
    case "amount_add":
      return "Dodaj zł";
    case "amount_sub":
      return "Odejmij zł";
    case "set_price":
      return "Ustaw cenę";
    default:
      return kind;
  }
}

export function validateBulkOperationValue(
  kind: BulkPriceOperationKind,
  raw: string,
): ValidateBulkOperationResult {
  const normalized = raw.trim().replace(",", ".");

  if (kind === "set_price") {
    const price = validateCompanyPricePlnInput(normalized);
    if (!price.ok) return price;
    return { ok: true, operation: { kind, value: price.valuePln } };
  }

  if (!normalized) {
    return { ok: false, message: "Podaj wartość" };
  }
  if (!PERCENT_INPUT_RE.test(normalized)) {
    return { ok: false, message: "Wartość ≥ 0 z maks. 2 miejscami po przecinku" };
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false, message: "Wartość musi być ≥ 0" };
  }

  if ((kind === "percent_add" || kind === "percent_sub") && value > 500) {
    return { ok: false, message: "Procent nie może przekraczać 500" };
  }

  return {
    ok: true,
    operation: { kind, value: roundCompanyPricePln(value) },
  };
}

export function applyBulkPriceOperation(
  currentPricePln: number,
  operation: BulkPriceOperation,
): number {
  const current = roundCompanyPricePln(
    Number.isFinite(currentPricePln) ? currentPricePln : 0,
  );

  switch (operation.kind) {
    case "percent_add":
      return roundCompanyPricePln(current * (1 + operation.value / 100));
    case "percent_sub":
      return roundCompanyPricePln(current * (1 - operation.value / 100));
    case "amount_add":
      return roundCompanyPricePln(current + operation.value);
    case "amount_sub":
      return roundCompanyPricePln(current - operation.value);
    case "set_price":
      return roundCompanyPricePln(operation.value);
    default:
      return current;
  }
}

export function computeBulkPricePreview(
  works: CatalogWork[],
  selectedWorkIds: Set<string>,
  operation: BulkPriceOperation,
): BulkPricePreviewRow[] {
  const idSet = selectedWorkIds;
  const rows: BulkPricePreviewRow[] = [];

  for (const work of works) {
    if (!idSet.has(work.id)) continue;
    const oldPricePln = roundCompanyPricePln(work.companyPricePln);
    const newPricePln = applyBulkPriceOperation(oldPricePln, operation);
    rows.push({
      workId: work.id,
      namePl: work.namePl,
      unit: work.unit,
      oldPricePln,
      newPricePln,
    });
  }

  return rows.sort((a, b) => a.namePl.localeCompare(b.namePl, "pl"));
}

export function previewToPriceMap(
  preview: BulkPricePreviewRow[],
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of preview) {
    map[row.workId] = row.newPricePln;
  }
  return map;
}

export interface BulkPricePatchResult {
  store: WorkCatalogStore;
  updatedIds: string[];
}

/** Immutable patch wielu robót w aktywnym regionie — jeden zapis store. */
export function patchBulkCompanyPricesInStore(
  store: WorkCatalogStore,
  priceByWorkId: Record<string, number>,
  updatedAtIso: string,
  nowMs: number = Date.now(),
): BulkPricePatchResult | null {
  const region = store.activeRegion;
  const slice = store.catalogs[region];
  const targetIds = new Set(Object.keys(priceByWorkId));
  if (targetIds.size === 0) {
    return { store, updatedIds: [] };
  }

  const works = [...slice.works];
  const updatedIds: string[] = [];

  for (const workId of targetIds) {
    if (!works.some((work) => work.id === workId)) {
      return null;
    }
  }

  for (let index = 0; index < works.length; index += 1) {
    const work = works[index];
    if (!targetIds.has(work.id)) continue;

    const nextPrice = roundCompanyPricePln(priceByWorkId[work.id]);
    if (work.companyPricePln === nextPrice) continue;

    works[index] = withFreshnessStatus(
      {
        ...work,
        companyPricePln: nextPrice,
        updatedAt: updatedAtIso,
      },
      nowMs,
    );
    updatedIds.push(work.id);
  }

  if (updatedIds.length === 0) {
    return { store, updatedIds: [] };
  }

  return {
    store: {
      ...store,
      updatedAt: updatedAtIso,
      catalogs: {
        ...store.catalogs,
        [region]: {
          ...slice,
          works,
          updatedAt: updatedAtIso,
        },
      },
    },
    updatedIds,
  };
}
