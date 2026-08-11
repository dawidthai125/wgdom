/**
 * Invoice lines → Price Memory (marketQuotes[wgdom] + history).
 * HISTORICAL PURCHASE only · REUSE CatalogWork SSOT · ZERO live research · ZERO invent PLN.
 */

import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import { normalizeWorkCatalogStore } from "@/lib/work-catalog/work-catalog-store";
import type { WgdomCostRegion } from "@/lib/wgdom-cost-catalog";
import type { MaterialMarketMapEntry } from "@/lib/pricing-expert/types";
import type { MarketSourceSnapshot } from "@/lib/work-catalog/market-sources";
import { roundMarketPricePln } from "@/lib/work-catalog/market-sources";
import {
  appendMarketQuoteHistoryEntry,
  MARKET_QUOTE_HISTORY_CAP,
  snapshotToHistoryEntry,
} from "./price-memory";
import { parseInvoiceLines } from "./invoice-parse";
import { normalizeInvoiceProduct } from "./invoice-normalize";
import type { ParsedInvoiceLine, RawInvoiceLineInput } from "./invoice-types";
import {
  buildInvoicePurchaseMapEntry,
  resolveInvoicePurchaseHost,
  type InvoicePurchaseHostResolution,
} from "./invoice-purchase-host";

const CATALOG_REGIONS: readonly WgdomCostRegion[] = ["wroclaw", "dolnyslask"];
const PURCHASE_CONFIDENCE = 0.75;

export interface InvoicePriceMemorySeedObservation {
  materialKey: string;
  catalogWorkId: string;
  productIdentityKey: string;
  productName: string;
  productCode?: string;
  unit: string;
  netUnitPrice: number;
  quantity: number;
  discountPct: number;
  invoiceDate: string;
  invoiceRef: string;
  observedAt: string;
}

export interface InvoicePriceMemorySeedReport {
  store: WorkCatalogStore;
  mapEntries: MaterialMarketMapEntry[];
  observations: InvoicePriceMemorySeedObservation[];
  seededLineCount: number;
  uniqueMaterialCount: number;
  worksUpserted: number;
  historyEntriesWritten: number;
  gapCount: number;
  gapReasons: string[];
  rejectedParseCount: number;
  changed: boolean;
}

function toObservedAt(invoiceDate: string): string {
  const d = String(invoiceDate || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return `${d}T12:00:00.000Z`;
  if (d.includes("T")) return d;
  return new Date().toISOString();
}

function purchaseSnapshot(price: number, observedAt: string, regionCode: "wroclaw" | "dolnyslask"): MarketSourceSnapshot {
  return {
    price: roundMarketPricePln(price),
    regionCode,
    coverage: "indicative",
    updatedAt: observedAt,
    confidence: PURCHASE_CONFIDENCE,
    origin: "wgdom",
  };
}

function ensureWorkShell(opts: {
  existing?: CatalogWork;
  catalogWorkId: string;
  namePl: string;
  unit: CatalogWork["unit"];
  observedAt: string;
}): CatalogWork {
  if (opts.existing) {
    return {
      ...opts.existing,
      active: true,
      namePl: opts.existing.namePl?.trim() ? opts.existing.namePl : opts.namePl,
      unit: opts.existing.unit || opts.unit,
    };
  }
  return {
    id: opts.catalogWorkId,
    tradeId: "POZOSTALE",
    namePl: opts.namePl,
    unit: opts.unit,
    companyPricePln: 0,
    updatedAt: opts.observedAt,
    freshnessStatus: "ok",
    keywords: [opts.namePl.toLowerCase(), opts.catalogWorkId, "invoice-purchase", "price-memory-seed"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    descriptionPl:
      "HISTORICAL PURCHASE · faktura W&G DOM → Price Memory (origin wgdom) · nie research sklepowy",
  };
}

function applyObsToWork(
  work: CatalogWork,
  obs: InvoicePriceMemorySeedObservation,
): { work: CatalogWork; historyAdded: number } {
  const snapW = purchaseSnapshot(obs.netUnitPrice, obs.observedAt, "wroclaw");
  const snapD = purchaseSnapshot(obs.netUnitPrice, obs.observedAt, "dolnyslask");
  let history = [...(work.marketQuoteHistory ?? [])];
  let historyAdded = 0;

  for (const regionCode of ["wroclaw", "dolnyslask"] as const) {
    const snap = regionCode === "wroclaw" ? snapW : snapD;
    const prev = work.marketQuotes?.wgdom?.[regionCode];
    if (prev && prev.price > 0) {
      const before = history.length;
      history = appendMarketQuoteHistoryEntry(history, snapshotToHistoryEntry(work.id, prev));
      if (history.length !== before) historyAdded += 1;
    }
    const beforeSelf = history.length;
    history = appendMarketQuoteHistoryEntry(history, snapshotToHistoryEntry(work.id, snap));
    if (history.length !== beforeSelf) historyAdded += 1;
  }

  // Cap total history length defensively (append helper already caps per cell).
  if (history.length > MARKET_QUOTE_HISTORY_CAP * 4) {
    history = history.slice(history.length - MARKET_QUOTE_HISTORY_CAP * 4);
  }

  const prevQuotes = work.marketQuotes ?? {};
  return {
    work: {
      ...work,
      marketQuotes: {
        ...prevQuotes,
        wgdom: {
          ...(prevQuotes.wgdom ?? {}),
          wroclaw: snapW,
          dolnyslask: snapD,
        },
      },
      marketQuoteHistory: history.length > 0 ? history : undefined,
      updatedAt: obs.observedAt,
      freshnessStatus: "ok",
    },
    historyAdded,
  };
}

/**
 * Seed Price Memory from invoice raw lines (Owner GO / harness).
 * Does NOT call live providers. Does NOT invent prices.
 */
export function seedInvoiceLinesToPriceMemory(
  rawStore: WorkCatalogStore,
  rawLines: readonly RawInvoiceLineInput[],
): InvoicePriceMemorySeedReport {
  const parsed = parseInvoiceLines(rawLines);
  const okLines = parsed.filter((p): p is ParsedInvoiceLine => p.status === "ok");
  const rejectedParseCount = parsed.length - okLines.length;

  type Prepared = {
    host: Extract<InvoicePurchaseHostResolution, { status: "ok" }>;
    productIdentityKey: string;
    line: ParsedInvoiceLine;
    obs: InvoicePriceMemorySeedObservation;
  };

  const prepared: Prepared[] = [];
  const gapReasons: string[] = [];
  const slugOwners = new Map<string, string>(); // materialKey → productIdentityKey

  for (const line of okLines) {
    const product = normalizeInvoiceProduct(line);
    const host = resolveInvoicePurchaseHost(product, {
      netUnitPrice: line.netUnitPrice,
      quantity: line.quantity,
    });
    if (host.status !== "ok") {
      gapReasons.push(`${line.productName}: ${host.reasonPl}`);
      continue;
    }
    const owner = slugOwners.get(host.materialKey);
    if (owner && owner !== product.productIdentityKey) {
      gapReasons.push(
        `${line.productName}: slug collision ${host.materialKey} (${owner} vs ${product.productIdentityKey}) — IDENTITY GAP`,
      );
      continue;
    }
    slugOwners.set(host.materialKey, product.productIdentityKey);

    const observedAt = toObservedAt(line.invoiceDate);
    const displayName =
      host.via === "invoice_host" ? line.productName : host.purchaseNamePl;
    prepared.push({
      host: { ...host, purchaseNamePl: displayName },
      productIdentityKey: product.productIdentityKey,
      line,
      obs: {
        materialKey: host.materialKey,
        catalogWorkId: host.catalogWorkId,
        productIdentityKey: product.productIdentityKey,
        productName: line.productName,
        productCode: line.productCode,
        unit: host.purchaseUnit,
        netUnitPrice: line.netUnitPrice,
        quantity: line.quantity,
        discountPct: line.discountPct,
        invoiceDate: line.invoiceDate,
        invoiceRef: line.invoiceRef,
        observedAt,
      },
    });
  }

  // Chronological apply so LAST = latest purchase
  prepared.sort((a, b) => {
    const d = a.obs.observedAt.localeCompare(b.obs.observedAt);
    if (d !== 0) return d;
    return a.line.lineIndex - b.line.lineIndex;
  });

  let store = normalizeWorkCatalogStore(rawStore);
  let worksUpserted = 0;
  let historyEntriesWritten = 0;
  let changed = false;
  const mapByKey = new Map<string, MaterialMarketMapEntry>();

  for (const region of CATALOG_REGIONS) {
    const slice = store.catalogs[region] ?? {
      region,
      works: [],
      updatedAt: new Date().toISOString(),
    };
    const byId = new Map(slice.works.map((w) => [w.id, w] as const));

    for (const row of prepared) {
      const prev = byId.get(row.host.catalogWorkId);
      const shell = ensureWorkShell({
        existing: prev,
        catalogWorkId: row.host.catalogWorkId,
        namePl: row.host.purchaseNamePl,
        unit: row.host.purchaseUnit,
        observedAt: row.obs.observedAt,
      });
      if (!prev) worksUpserted += 1;
      const applied = applyObsToWork(shell, row.obs);
      historyEntriesWritten += applied.historyAdded;
      byId.set(row.host.catalogWorkId, applied.work);
      changed = true;
      mapByKey.set(
        row.host.materialKey,
        buildInvoicePurchaseMapEntry({
          materialKey: row.host.materialKey,
          catalogWorkId: row.host.catalogWorkId,
          purchaseNamePl: row.host.purchaseNamePl,
        }),
      );
    }

    store = {
      ...store,
      catalogs: {
        ...store.catalogs,
        [region]: {
          region,
          works: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, "pl")),
          updatedAt: changed ? prepared[prepared.length - 1]?.obs.observedAt ?? slice.updatedAt : slice.updatedAt,
        },
      },
      updatedAt: changed
        ? prepared[prepared.length - 1]?.obs.observedAt ?? store.updatedAt
        : store.updatedAt,
    };
  }

  const uniqueMaterialCount = new Set(prepared.map((p) => p.obs.materialKey)).size;

  return {
    store: normalizeWorkCatalogStore(store),
    mapEntries: [...mapByKey.values()].sort((a, b) => a.materialKey.localeCompare(b.materialKey)),
    observations: prepared.map((p) => p.obs),
    seededLineCount: prepared.length,
    uniqueMaterialCount,
    worksUpserted: Math.floor(worksUpserted / CATALOG_REGIONS.length),
    historyEntriesWritten,
    gapCount: gapReasons.length,
    gapReasons,
    rejectedParseCount,
    changed,
  };
}

/** Fixture shape — load via fs/JSON in harness (avoid bundling 0.5MB into app-core). */
export interface ZygmuntInvoiceSeedFixtureFile {
  schemaVersion: number;
  seedKind: string;
  supplier: string;
  lines: RawInvoiceLineInput[];
  lineCount: number;
  uniqueProductCount: number;
  rejectedParseCount?: number;
  integrityFailCount?: number;
}

export function normalizeZygmuntInvoiceSeedFixture(
  raw: ZygmuntInvoiceSeedFixtureFile,
): {
  lines: RawInvoiceLineInput[];
  meta: {
    lineCount: number;
    uniqueProductCount: number;
    rejectedParseCount: number;
    integrityFailCount: number;
  };
} {
  return {
    lines: raw.lines ?? [],
    meta: {
      lineCount: raw.lineCount ?? raw.lines?.length ?? 0,
      uniqueProductCount: raw.uniqueProductCount ?? 0,
      rejectedParseCount: raw.rejectedParseCount ?? 0,
      integrityFailCount: raw.integrityFailCount ?? 0,
    },
  };
}
