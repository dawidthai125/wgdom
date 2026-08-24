/**
 * IK-OWNER-A01-LP5-QUOTES OPS — single-work marketQuotes merge (no KV I/O).
 * Prerequisite: `applyA01Lp5CatalogSeed` — work must exist in both regions.
 * REUSE wave-2 CSV + `applyMarketQuotesFromPreview` · mirror wroclaw → dolnyslask.
 * Target: cc-w2-impregnacja-biobojcza-m2 (WM Paczka V LP5/LP10).
 */

import { catalogWorkHasUsefulQuotes } from "@/lib/catalog-coverage/alias-resolver";
import { applyMarketQuotesFromPreview } from "@/lib/work-catalog/apply-market-quotes";
import {
  IK_OWNER_CREATE_A01_LP5_WORK_ID,
  buildIkOwnerCreateA01Lp5CatalogWork,
} from "@/lib/work-catalog/ik-owner-create-a01-lp5-catalog";
import {
  IK_OWNER_A01_LP5_OPS_REGIONS,
  workMatchesOwnerApprovedA01Lp5Spec,
} from "@/lib/work-catalog/ik-owner-create-a01-lp5-ops";
import { previewMarketCsvImport } from "@/lib/work-catalog/market-csv-preview";
import type { MarketCsvPreviewReport } from "@/lib/work-catalog/market-csv-preview";
import type { WgdomCostRegion } from "@/lib/wgdom-cost-catalog";
import { getWorkByIdFromStore } from "@/lib/work-catalog/catalog-work-utils";
import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";

export {
  IK_OWNER_CREATE_A01_LP5_WORK_ID,
} from "@/lib/work-catalog/ik-owner-create-a01-lp5-catalog";

export { IK_OWNER_A01_LP5_OPS_REGIONS } from "@/lib/work-catalog/ik-owner-create-a01-lp5-ops";

/** SSOT quote cell — wave-2 OPS precedent (`catalog-wave-2-ops.mjs`). */
export const IK_OWNER_A01_LP5_QUOTES_ORIGIN = "wgdom" as const;
export const IK_OWNER_A01_LP5_QUOTES_REGION: WgdomCostRegion = "wroclaw";
export const IK_OWNER_A01_LP5_QUOTES_CONFIDENCE = 0.92;
export const IK_OWNER_A01_LP5_QUOTES_EXPECTED_PRICE_PLN = 22;

export const IK_OWNER_A01_LP5_QUOTES_OPS_EXPECTED = Object.freeze({
  workId: IK_OWNER_CREATE_A01_LP5_WORK_ID,
  origin: IK_OWNER_A01_LP5_QUOTES_ORIGIN,
  region: IK_OWNER_A01_LP5_QUOTES_REGION,
  confidence: IK_OWNER_A01_LP5_QUOTES_CONFIDENCE,
  pricePln: IK_OWNER_A01_LP5_QUOTES_EXPECTED_PRICE_PLN,
});

export type A01Lp5QuotesRegionStatus =
  | "ABSENT_WORK"
  | "MISSING_QUOTES"
  | "PRESENT_OK"
  | "UNEXPECTED_QUOTES";

export function workHasA01Lp5UsefulQuotes(work: CatalogWork | null | undefined): boolean {
  return catalogWorkHasUsefulQuotes(work);
}

function quoteCellMatchesExpected(work: CatalogWork | null | undefined): boolean {
  const cell = work?.marketQuotes?.[IK_OWNER_A01_LP5_QUOTES_ORIGIN]?.[
    IK_OWNER_A01_LP5_QUOTES_REGION
  ];
  if (!cell) return false;
  return (
    Number(cell.price) === IK_OWNER_A01_LP5_QUOTES_EXPECTED_PRICE_PLN &&
    Number(cell.confidence) === IK_OWNER_A01_LP5_QUOTES_CONFIDENCE &&
    cell.origin === IK_OWNER_A01_LP5_QUOTES_ORIGIN
  );
}

export function workHasExpectedA01Lp5Quotes(work: CatalogWork | null | undefined): boolean {
  return workHasA01Lp5UsefulQuotes(work) && quoteCellMatchesExpected(work);
}

export function probeA01Lp5QuotesRegion(
  store: WorkCatalogStore,
  region: (typeof IK_OWNER_A01_LP5_OPS_REGIONS)[number],
): A01Lp5QuotesRegionStatus {
  const work = getWorkByIdFromStore(store, IK_OWNER_CREATE_A01_LP5_WORK_ID, region);
  if (!workMatchesOwnerApprovedA01Lp5Spec(work)) return "ABSENT_WORK";
  if (workHasExpectedA01Lp5Quotes(work)) return "PRESENT_OK";
  if (workHasA01Lp5UsefulQuotes(work)) return "UNEXPECTED_QUOTES";
  return "MISSING_QUOTES";
}

export function probeA01Lp5QuotesPerRegion(
  store: WorkCatalogStore,
): Record<(typeof IK_OWNER_A01_LP5_OPS_REGIONS)[number], A01Lp5QuotesRegionStatus> {
  return {
    wroclaw: probeA01Lp5QuotesRegion(store, "wroclaw"),
    dolnyslask: probeA01Lp5QuotesRegion(store, "dolnyslask"),
  };
}

/** Safety gate — quotes OPS never creates the work. */
export function assertA01Lp5WorkPresentForQuotesOrStop(store: WorkCatalogStore): void {
  for (const region of IK_OWNER_A01_LP5_OPS_REGIONS) {
    const work = getWorkByIdFromStore(store, IK_OWNER_CREATE_A01_LP5_WORK_ID, region);
    const status = probeA01Lp5QuotesRegion(store, region);
    if (status === "ABSENT_WORK") {
      throw new Error(
        `ABSENT_WORK ${IK_OWNER_CREATE_A01_LP5_WORK_ID} in ${region} — run catalog-ik-owner-a01-lp5-ops first`,
      );
    }
    if (!work) {
      throw new Error(`MISSING_TARGET ${IK_OWNER_CREATE_A01_LP5_WORK_ID} in ${region}`);
    }
    if (work.id !== IK_OWNER_CREATE_A01_LP5_WORK_ID) {
      throw new Error(`WRONG_WORK_ID ${work.id} !== ${IK_OWNER_CREATE_A01_LP5_WORK_ID}`);
    }
    if (work.active !== true) {
      throw new Error(`INACTIVE_WORK ${IK_OWNER_CREATE_A01_LP5_WORK_ID} in ${region}`);
    }
    if (work.unit !== "m2") {
      throw new Error(`WRONG_UNIT ${work.unit} for ${IK_OWNER_CREATE_A01_LP5_WORK_ID}`);
    }
    if (Number(work.companyPricePln) !== IK_OWNER_A01_LP5_QUOTES_EXPECTED_PRICE_PLN) {
      throw new Error(
        `WRONG_COMPANY_PRICE ${work.companyPricePln} for ${IK_OWNER_CREATE_A01_LP5_WORK_ID} (expected ${IK_OWNER_A01_LP5_QUOTES_EXPECTED_PRICE_PLN})`,
      );
    }
    if (status === "UNEXPECTED_QUOTES") {
      throw new Error(
        `UNEXPECTED_QUOTES ${IK_OWNER_CREATE_A01_LP5_WORK_ID} in ${region} — manual review required`,
      );
    }
  }
}

function resolveQuotePricePln(store: WorkCatalogStore): number {
  const w =
    getWorkByIdFromStore(store, IK_OWNER_CREATE_A01_LP5_WORK_ID, IK_OWNER_A01_LP5_QUOTES_REGION) ??
    buildIkOwnerCreateA01Lp5CatalogWork(new Date().toISOString());
  const price = Number(w.companyPricePln);
  if (price !== IK_OWNER_A01_LP5_QUOTES_EXPECTED_PRICE_PLN) {
    throw new Error(
      `WRONG_COMPANY_PRICE ${w.companyPricePln} for ${IK_OWNER_CREATE_A01_LP5_WORK_ID} (expected ${IK_OWNER_A01_LP5_QUOTES_EXPECTED_PRICE_PLN})`,
    );
  }
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`INVALID companyPricePln for ${IK_OWNER_CREATE_A01_LP5_WORK_ID}: ${w.companyPricePln}`);
  }
  return price;
}

/** Single-row CSV — wave-2 format (`workId,origin,region,price,updatedAt,confidence`). */
export function buildIkOwnerA01Lp5QuotesCsv(
  nowIso: string,
  store?: WorkCatalogStore,
  pricePln?: number,
): string {
  const price =
    pricePln ??
    (store
      ? resolveQuotePricePln(store)
      : buildIkOwnerCreateA01Lp5CatalogWork(nowIso).companyPricePln);
  if (price !== IK_OWNER_A01_LP5_QUOTES_EXPECTED_PRICE_PLN) {
    throw new Error(`CSV_PRICE_MISMATCH ${price} !== ${IK_OWNER_A01_LP5_QUOTES_EXPECTED_PRICE_PLN}`);
  }
  const lines = [
    "workId,origin,region,price,updatedAt,confidence",
    [
      IK_OWNER_CREATE_A01_LP5_WORK_ID,
      IK_OWNER_A01_LP5_QUOTES_ORIGIN,
      IK_OWNER_A01_LP5_QUOTES_REGION,
      price,
      nowIso,
      IK_OWNER_A01_LP5_QUOTES_CONFIDENCE,
    ].join(","),
  ];
  return `${lines.join("\n")}\n`;
}

export function previewIkOwnerA01Lp5QuotesImport(
  nowIso: string,
  store?: WorkCatalogStore,
): MarketCsvPreviewReport {
  const csv = buildIkOwnerA01Lp5QuotesCsv(nowIso, store);
  const preview = previewMarketCsvImport(csv, {
    fallbackUpdatedAt: nowIso,
    defaultOrigin: IK_OWNER_A01_LP5_QUOTES_ORIGIN,
  });
  const matchedTarget = preview.matched.filter((r) => r.workId === IK_OWNER_CREATE_A01_LP5_WORK_ID);
  if (matchedTarget.length !== 1) {
    throw new Error(
      `PREVIEW_UNMATCHED ${IK_OWNER_CREATE_A01_LP5_WORK_ID} — matched=${matchedTarget.length} (expected 1)`,
    );
  }
  if (preview.summary.matched !== 1 || preview.summary.totalInputRows !== 1) {
    throw new Error(
      `PREVIEW_NOT_1_OF_1 matched=${preview.summary.matched} rows=${preview.summary.totalInputRows}`,
    );
  }
  return preview;
}

function stableQuotesJson(work: CatalogWork | null | undefined): string {
  return JSON.stringify(work?.marketQuotes ?? null);
}

/**
 * Copy marketQuotes wroclaw → dolnyslask ONLY for LP5 target work.
 * Other works in dolnyslask remain untouched.
 */
export function syncA01Lp5QuotesWroclawToDolnySlask(
  store: WorkCatalogStore,
  nowIso: string,
): { store: WorkCatalogStore; synced: boolean } {
  const src = getWorkByIdFromStore(store, IK_OWNER_CREATE_A01_LP5_WORK_ID, "wroclaw");
  if (!src?.marketQuotes) {
    return { store, synced: false };
  }

  const dsSlice = store.catalogs.dolnyslask;
  let synced = false;
  const dsWorks = dsSlice.works.map((w) => {
    if (w.id !== IK_OWNER_CREATE_A01_LP5_WORK_ID) return w;
    if (stableQuotesJson(w) === stableQuotesJson(src)) return w;
    synced = true;
    return { ...w, marketQuotes: src.marketQuotes, updatedAt: nowIso };
  });

  if (!synced) {
    return { store, synced: false };
  }

  return {
    synced: true,
    store: {
      ...store,
      catalogs: {
        ...store.catalogs,
        dolnyslask: { ...dsSlice, works: dsWorks, updatedAt: nowIso },
      },
      updatedAt: nowIso,
    },
  };
}

/**
 * Pure quotes apply: preview → wroclaw merge → dolnyslask mirror.
 * Idempotent when both regions PRESENT_OK.
 */
export function applyA01Lp5QuotesSeed(
  store: WorkCatalogStore,
  nowIso: string,
): {
  changed: boolean;
  store: WorkCatalogStore;
  perRegion: Record<(typeof IK_OWNER_A01_LP5_OPS_REGIONS)[number], A01Lp5QuotesRegionStatus>;
  preview: MarketCsvPreviewReport;
  applyReport: ReturnType<typeof applyMarketQuotesFromPreview>["report"] | null;
} {
  assertA01Lp5WorkPresentForQuotesOrStop(store);

  const before = probeA01Lp5QuotesPerRegion(store);
  if (before.wroclaw === "PRESENT_OK" && before.dolnyslask === "PRESENT_OK") {
    const preview = previewIkOwnerA01Lp5QuotesImport(nowIso, store);
    return {
      changed: false,
      store,
      perRegion: before,
      preview,
      applyReport: null,
    };
  }

  const preview = previewIkOwnerA01Lp5QuotesImport(nowIso, store);
  let next = store;
  let applyReport: ReturnType<typeof applyMarketQuotesFromPreview>["report"] | null = null;

  if (before.wroclaw !== "PRESENT_OK") {
    const applied = applyMarketQuotesFromPreview(next, preview, {
      region: IK_OWNER_A01_LP5_QUOTES_REGION,
    });
    next = applied.store;
    applyReport = applied.report;
    if (applyReport.worksTouched !== 1) {
      throw new Error(`WORKS_TOUCHED_NOT_1 got=${applyReport.worksTouched}`);
    }
  }

  const synced = syncA01Lp5QuotesWroclawToDolnySlask(next, nowIso);
  next = synced.store;

  const after = probeA01Lp5QuotesPerRegion(next);
  if (after.wroclaw !== "PRESENT_OK" || after.dolnyslask !== "PRESENT_OK") {
    throw new Error(
      `POST_APPLY_VERIFY_FAIL wroclaw=${after.wroclaw} dolnyslask=${after.dolnyslask}`,
    );
  }

  const changed =
    before.wroclaw !== after.wroclaw ||
    before.dolnyslask !== after.dolnyslask ||
    (applyReport?.worksTouched ?? 0) > 0 ||
    synced.synced;

  return {
    changed,
    store: changed ? { ...next, updatedAt: nowIso } : store,
    perRegion: after,
    preview,
    applyReport,
  };
}
