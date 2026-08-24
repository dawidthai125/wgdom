/**
 * IK-OWNER-A01-LP4-QUOTES OPS — single-work marketQuotes merge (no KV I/O).
 * Prerequisite: `applyA01Lp4CatalogSeed` — work must exist in both regions.
 * REUSE wave-2 CSV + `applyMarketQuotesFromPreview` · mirror wroclaw → dolnyslask.
 */

import { catalogWorkHasUsefulQuotes } from "@/lib/catalog-coverage/alias-resolver";
import { applyMarketQuotesFromPreview } from "@/lib/work-catalog/apply-market-quotes";
import {
  IK_OWNER_CREATE_A01_LP4_WORK_ID,
  buildIkOwnerCreateA01Lp4CatalogWork,
} from "@/lib/work-catalog/ik-owner-create-a01-lp4-catalog";
import {
  IK_OWNER_A01_LP4_OPS_REGIONS,
  workMatchesOwnerApprovedA01Lp4Spec,
} from "@/lib/work-catalog/ik-owner-create-a01-lp4-ops";
import { previewMarketCsvImport } from "@/lib/work-catalog/market-csv-preview";
import type { MarketCsvPreviewReport } from "@/lib/work-catalog/market-csv-preview";
import type { WgdomCostRegion } from "@/lib/wgdom-cost-catalog";
import { getWorkByIdFromStore } from "@/lib/work-catalog/catalog-work-utils";
import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";

export {
  IK_OWNER_CREATE_A01_LP4_WORK_ID,
} from "@/lib/work-catalog/ik-owner-create-a01-lp4-catalog";

export { IK_OWNER_A01_LP4_OPS_REGIONS } from "@/lib/work-catalog/ik-owner-create-a01-lp4-ops";

/** SSOT quote cell — wave-2 OPS precedent (`catalog-wave-2-ops.mjs`). */
export const IK_OWNER_A01_LP4_QUOTES_ORIGIN = "wgdom" as const;
export const IK_OWNER_A01_LP4_QUOTES_REGION: WgdomCostRegion = "wroclaw";
export const IK_OWNER_A01_LP4_QUOTES_CONFIDENCE = 0.92;

export const IK_OWNER_A01_LP4_QUOTES_OPS_EXPECTED = Object.freeze({
  workId: IK_OWNER_CREATE_A01_LP4_WORK_ID,
  origin: IK_OWNER_A01_LP4_QUOTES_ORIGIN,
  region: IK_OWNER_A01_LP4_QUOTES_REGION,
  confidence: IK_OWNER_A01_LP4_QUOTES_CONFIDENCE,
});

export type A01Lp4QuotesRegionStatus = "ABSENT_WORK" | "MISSING_QUOTES" | "PRESENT_OK";

export function workHasA01Lp4UsefulQuotes(work: CatalogWork | null | undefined): boolean {
  return catalogWorkHasUsefulQuotes(work);
}

export function probeA01Lp4QuotesRegion(
  store: WorkCatalogStore,
  region: (typeof IK_OWNER_A01_LP4_OPS_REGIONS)[number],
): A01Lp4QuotesRegionStatus {
  const work = getWorkByIdFromStore(store, IK_OWNER_CREATE_A01_LP4_WORK_ID, region);
  if (!workMatchesOwnerApprovedA01Lp4Spec(work)) return "ABSENT_WORK";
  return workHasA01Lp4UsefulQuotes(work) ? "PRESENT_OK" : "MISSING_QUOTES";
}

export function probeA01Lp4QuotesPerRegion(
  store: WorkCatalogStore,
): Record<(typeof IK_OWNER_A01_LP4_OPS_REGIONS)[number], A01Lp4QuotesRegionStatus> {
  return {
    wroclaw: probeA01Lp4QuotesRegion(store, "wroclaw"),
    dolnyslask: probeA01Lp4QuotesRegion(store, "dolnyslask"),
  };
}

/** Assert catalog work seed present — quotes OPS never creates the work. */
export function assertA01Lp4WorkPresentForQuotesOrStop(
  store: WorkCatalogStore,
): void {
  for (const region of IK_OWNER_A01_LP4_OPS_REGIONS) {
    const status = probeA01Lp4QuotesRegion(store, region);
    if (status === "ABSENT_WORK") {
      throw new Error(
        `ABSENT_WORK ${IK_OWNER_CREATE_A01_LP4_WORK_ID} in ${region} — run catalog-ik-owner-a01-lp4-ops first`,
      );
    }
  }
}

function resolveQuotePricePln(store: WorkCatalogStore): number {
  const w =
    getWorkByIdFromStore(store, IK_OWNER_CREATE_A01_LP4_WORK_ID, IK_OWNER_A01_LP4_QUOTES_REGION) ??
    buildIkOwnerCreateA01Lp4CatalogWork(new Date().toISOString());
  const price = Number(w.companyPricePln);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`INVALID companyPricePln for ${IK_OWNER_CREATE_A01_LP4_WORK_ID}: ${w.companyPricePln}`);
  }
  return price;
}

/** Single-row CSV — wave-2 format (`workId,origin,region,price,updatedAt,confidence`). */
export function buildIkOwnerA01Lp4QuotesCsv(
  nowIso: string,
  store?: WorkCatalogStore,
  pricePln?: number,
): string {
  const price =
    pricePln ??
    (store ? resolveQuotePricePln(store) : buildIkOwnerCreateA01Lp4CatalogWork(nowIso).companyPricePln);
  const lines = [
    "workId,origin,region,price,updatedAt,confidence",
    [
      IK_OWNER_CREATE_A01_LP4_WORK_ID,
      IK_OWNER_A01_LP4_QUOTES_ORIGIN,
      IK_OWNER_A01_LP4_QUOTES_REGION,
      price,
      nowIso,
      IK_OWNER_A01_LP4_QUOTES_CONFIDENCE,
    ].join(","),
  ];
  return `${lines.join("\n")}\n`;
}

export function previewIkOwnerA01Lp4QuotesImport(
  nowIso: string,
  store?: WorkCatalogStore,
): MarketCsvPreviewReport {
  const csv = buildIkOwnerA01Lp4QuotesCsv(nowIso, store);
  const preview = previewMarketCsvImport(csv, {
    fallbackUpdatedAt: nowIso,
    defaultOrigin: IK_OWNER_A01_LP4_QUOTES_ORIGIN,
  });
  const matched = preview.matched.some((r) => r.workId === IK_OWNER_CREATE_A01_LP4_WORK_ID);
  if (!matched) {
    throw new Error(
      `PREVIEW_UNMATCHED ${IK_OWNER_CREATE_A01_LP4_WORK_ID} — matched=${preview.matched.length}`,
    );
  }
  return preview;
}

function stableQuotesJson(work: CatalogWork | null | undefined): string {
  return JSON.stringify(work?.marketQuotes ?? null);
}

/**
 * Copy marketQuotes wroclaw → dolnyslask ONLY for LP4 target work.
 * Other works in dolnyslask remain untouched.
 */
export function syncA01Lp4QuotesWroclawToDolnySlask(
  store: WorkCatalogStore,
  nowIso: string,
): { store: WorkCatalogStore; synced: boolean } {
  const src = getWorkByIdFromStore(store, IK_OWNER_CREATE_A01_LP4_WORK_ID, "wroclaw");
  if (!src?.marketQuotes) {
    return { store, synced: false };
  }

  const dsSlice = store.catalogs.dolnyslask;
  let synced = false;
  const dsWorks = dsSlice.works.map((w) => {
    if (w.id !== IK_OWNER_CREATE_A01_LP4_WORK_ID) return w;
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
export function applyA01Lp4QuotesSeed(
  store: WorkCatalogStore,
  nowIso: string,
): {
  changed: boolean;
  store: WorkCatalogStore;
  perRegion: Record<(typeof IK_OWNER_A01_LP4_OPS_REGIONS)[number], A01Lp4QuotesRegionStatus>;
  preview: MarketCsvPreviewReport;
  applyReport: ReturnType<typeof applyMarketQuotesFromPreview>["report"] | null;
} {
  assertA01Lp4WorkPresentForQuotesOrStop(store);

  const before = probeA01Lp4QuotesPerRegion(store);
  if (before.wroclaw === "PRESENT_OK" && before.dolnyslask === "PRESENT_OK") {
    const preview = previewIkOwnerA01Lp4QuotesImport(nowIso, store);
    return {
      changed: false,
      store,
      perRegion: before,
      preview,
      applyReport: null,
    };
  }

  const preview = previewIkOwnerA01Lp4QuotesImport(nowIso, store);
  let next = store;
  let applyReport: ReturnType<typeof applyMarketQuotesFromPreview>["report"] | null = null;

  if (before.wroclaw !== "PRESENT_OK") {
    const applied = applyMarketQuotesFromPreview(next, preview, {
      region: IK_OWNER_A01_LP4_QUOTES_REGION,
    });
    next = applied.store;
    applyReport = applied.report;
  }

  const synced = syncA01Lp4QuotesWroclawToDolnySlask(next, nowIso);
  next = synced.store;

  const after = probeA01Lp4QuotesPerRegion(next);
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
