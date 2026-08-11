/**
 * Apply compact Zygmunt HISTORICAL PURCHASE seed → Price Memory (marketQuotes.wgdom).
 * Idempotent · never invent PLN · never touch leroy/castorama cells.
 */

import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import { normalizeWorkCatalogStore } from "@/lib/work-catalog/work-catalog-store";
import type { WgdomCostRegion } from "@/lib/wgdom-cost-catalog";
import {
  ZYGMUNT_INVOICE_PURCHASE_SEED,
  ZYGMUNT_INVOICE_PURCHASE_SEED_GENERATED_AT,
  type ZygmuntInvoicePurchaseSeedRow,
} from "./zygmunt-invoice-purchase-seed-data";
import { appendMarketQuoteHistoryEntry, snapshotToHistoryEntry } from "./price-memory";

const CATALOG_REGIONS: readonly WgdomCostRegion[] = ["wroclaw", "dolnyslask"];
const CONFIDENCE = 0.75;

function buildSnap(row: ZygmuntInvoicePurchaseSeedRow, regionCode: "wroclaw" | "dolnyslask") {
  return {
    price: row.netUnitPricePln,
    regionCode,
    coverage: "indicative" as const,
    updatedAt: row.observedAt,
    confidence: CONFIDENCE,
    origin: "wgdom" as const,
  };
}

function upsertWork(existing: CatalogWork | undefined, row: ZygmuntInvoicePurchaseSeedRow): {
  work: CatalogWork;
  changed: boolean;
  historyAdded: number;
} {
  const snapW = buildSnap(row, "wroclaw");
  const snapD = buildSnap(row, "dolnyslask");
  const base: CatalogWork =
    existing ??
    ({
      id: row.catalogWorkId,
      tradeId: "POZOSTALE",
      namePl: row.namePl,
      unit: row.unit,
      companyPricePln: 0,
      updatedAt: row.observedAt,
      freshnessStatus: "ok",
      keywords: [row.namePl.toLowerCase(), row.materialKey, row.catalogWorkId, "invoice-purchase"],
      active: true,
      favorite: false,
      usageCount: 0,
      source: "custom",
      descriptionPl:
        "HISTORICAL PURCHASE · faktura Zygmunt → Price Memory (wgdom) · nie research sklepowy",
    } satisfies CatalogWork);

  const prevW = base.marketQuotes?.wgdom?.wroclaw;
  const alreadySame =
    prevW &&
    prevW.price === snapW.price &&
    prevW.updatedAt === snapW.updatedAt &&
    prevW.origin === "wgdom";

  if (alreadySame && existing) {
    return { work: base, changed: false, historyAdded: 0 };
  }

  let history = [...(base.marketQuoteHistory ?? [])];
  let historyAdded = 0;
  for (const regionCode of ["wroclaw", "dolnyslask"] as const) {
    const prev = base.marketQuotes?.wgdom?.[regionCode];
    const next = regionCode === "wroclaw" ? snapW : snapD;
    if (prev && prev.price > 0) {
      const before = history.length;
      history = appendMarketQuoteHistoryEntry(history, snapshotToHistoryEntry(base.id, prev));
      if (history.length !== before) historyAdded += 1;
    }
    const beforeSelf = history.length;
    history = appendMarketQuoteHistoryEntry(history, snapshotToHistoryEntry(base.id, next));
    if (history.length !== beforeSelf) historyAdded += 1;
  }

  const prevQuotes = base.marketQuotes ?? {};
  return {
    work: {
      ...base,
      namePl: base.namePl?.trim() ? base.namePl : row.namePl,
      unit: base.unit || row.unit,
      active: true,
      marketQuotes: {
        ...prevQuotes,
        wgdom: {
          ...(prevQuotes.wgdom ?? {}),
          wroclaw: snapW,
          dolnyslask: snapD,
        },
      },
      marketQuoteHistory: history.length > 0 ? history : undefined,
      updatedAt: row.observedAt,
      freshnessStatus: "ok",
    },
    changed: true,
    historyAdded,
  };
}

export interface ApplyZygmuntInvoicePurchaseSeedResult {
  store: WorkCatalogStore;
  worksUpserted: number;
  worksUpdated: number;
  historyEntriesWritten: number;
  changed: boolean;
  seedCount: number;
  generatedAt: string;
}

/** Pure apply — HISTORICAL PURCHASE into marketQuotes[wgdom] only. */
export function applyZygmuntInvoicePurchaseSeedToWorkCatalog(
  rawStore: WorkCatalogStore,
  rows: readonly ZygmuntInvoicePurchaseSeedRow[] = ZYGMUNT_INVOICE_PURCHASE_SEED,
): ApplyZygmuntInvoicePurchaseSeedResult {
  let store = normalizeWorkCatalogStore(rawStore);
  let worksUpserted = 0;
  let worksUpdated = 0;
  let historyEntriesWritten = 0;
  let changed = false;

  for (const region of CATALOG_REGIONS) {
    const slice = store.catalogs[region] ?? {
      region,
      works: [],
      updatedAt: ZYGMUNT_INVOICE_PURCHASE_SEED_GENERATED_AT,
    };
    const byId = new Map(slice.works.map((w) => [w.id, w] as const));
    let regionChanged = false;

    for (const row of rows) {
      if (!(row.netUnitPricePln > 0)) continue;
      const prev = byId.get(row.catalogWorkId);
      const next = upsertWork(prev, row);
      if (!next.changed) continue;
      if (!prev) worksUpserted += 1;
      else worksUpdated += 1;
      historyEntriesWritten += next.historyAdded;
      byId.set(row.catalogWorkId, next.work);
      regionChanged = true;
      changed = true;
    }

    if (regionChanged) {
      store = {
        ...store,
        catalogs: {
          ...store.catalogs,
          [region]: {
            region,
            works: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, "pl")),
            updatedAt: ZYGMUNT_INVOICE_PURCHASE_SEED_GENERATED_AT,
          },
        },
        updatedAt: ZYGMUNT_INVOICE_PURCHASE_SEED_GENERATED_AT,
      };
    }
  }

  return {
    store: normalizeWorkCatalogStore(store),
    worksUpserted: Math.floor(worksUpserted / CATALOG_REGIONS.length),
    worksUpdated: Math.floor(worksUpdated / CATALOG_REGIONS.length),
    historyEntriesWritten,
    changed,
    seedCount: rows.length,
    generatedAt: ZYGMUNT_INVOICE_PURCHASE_SEED_GENERATED_AT,
  };
}
