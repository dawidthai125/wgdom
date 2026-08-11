/**
 * PRICE-PATH-01 — apply product hosts (structure) + optional Owner-approved prices.
 * Host ensure NEVER invents PLN.
 * Approved apply REQUIRES explicit positive prices from caller (Owner Accept / test inject).
 */

import {
  buildCompanyKnowledgeEntryId,
  buildCompanyKnowledgeNameKey,
  normalizeCompanyKnowledgeStore,
  type CompanyKnowledgeEntry,
  type CompanyKnowledgeStore,
} from "@/lib/tender-offer-boq-company-knowledge";
import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import { normalizeWorkCatalogStore } from "@/lib/work-catalog/work-catalog-store";
import type { WgdomCostRegion } from "@/lib/wgdom-cost-catalog";
import type { MarketQuoteOriginId } from "@/lib/work-catalog/market-sources";
import type { MarketRegionCode } from "@/lib/work-catalog/market-regions";
import {
  ECONOMY_PRODUCT_HOSTS_ENSURED_AT,
  ECONOMY_PRODUCT_HOST_SPECS,
  economyProductHostByMaterialKey,
  type EconomyProductHostSpec,
} from "./economy-product-hosts-seed";

const CATALOG_REGIONS: readonly WgdomCostRegion[] = ["wroclaw", "dolnyslask"];

function buildHostWork(spec: EconomyProductHostSpec, existing?: CatalogWork): CatalogWork {
  if (existing) {
    return {
      ...existing,
      unit: spec.unit,
      active: true,
      namePl: existing.namePl?.trim() ? existing.namePl : spec.workNamePl,
      // Preserve any Owner-accepted Quotes / companyPrice — never invent
    };
  }
  return {
    id: spec.catalogWorkId,
    tradeId: "POZOSTALE",
    namePl: spec.workNamePl,
    unit: spec.unit,
    companyPricePln: 0,
    updatedAt: ECONOMY_PRODUCT_HOSTS_ENSURED_AT,
    freshnessStatus: "missing",
    keywords: [
      spec.namePl.toLowerCase(),
      spec.materialKey,
      spec.catalogWorkId,
      "price-path-01",
      "product-host",
    ],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    descriptionPl:
      "PRICE-PATH-01 product host · Quotes/Purchase only after Owner Accept · ZERO invent PLN",
  };
}

export interface ApplyEconomyHostsCatalogResult {
  store: WorkCatalogStore;
  worksUpserted: number;
  changed: boolean;
}

/** Upsert 3 product hosts — structure only (no marketQuotes invent). */
export function applyEconomyProductHostsToWorkCatalog(
  rawStore: WorkCatalogStore,
): ApplyEconomyHostsCatalogResult {
  const store = normalizeWorkCatalogStore(rawStore);
  let worksUpserted = 0;
  let changed = false;
  const catalogs = { ...store.catalogs };

  for (const region of CATALOG_REGIONS) {
    const slice = catalogs[region] ?? {
      region,
      works: [],
      updatedAt: ECONOMY_PRODUCT_HOSTS_ENSURED_AT,
    };
    const byId = new Map(slice.works.map((w) => [w.id, w] as const));
    for (const spec of ECONOMY_PRODUCT_HOST_SPECS) {
      const prev = byId.get(spec.catalogWorkId);
      const next = buildHostWork(spec, prev);
      const unitFixed = !prev || prev.unit !== spec.unit || prev.active !== true;
      const created = !prev;
      if (created || unitFixed || prev.namePl !== next.namePl) {
        changed = true;
        if (created) worksUpserted += 1;
      }
      byId.set(spec.catalogWorkId, next);
    }
    catalogs[region] = {
      region,
      works: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, "pl")),
      updatedAt: changed ? ECONOMY_PRODUCT_HOSTS_ENSURED_AT : slice.updatedAt,
    };
  }

  const out: WorkCatalogStore = {
    ...store,
    catalogs,
    updatedAt: changed ? ECONOMY_PRODUCT_HOSTS_ENSURED_AT : store.updatedAt,
  };
  return {
    store: normalizeWorkCatalogStore(out),
    worksUpserted,
    changed,
  };
}

export interface EconomyOwnerApprovedPriceInput {
  materialKey: string;
  /** Must be > 0 — caller supplies real / Owner-accepted / test-injected value. */
  purchaseUnitPricePln: number;
  /** Must be > 0 for market Quotes cell. */
  marketQuotePln: number;
  acceptedAtIso: string;
  origin?: MarketQuoteOriginId;
  regionCode?: MarketRegionCode;
  confidence?: number;
}

export type ApplyEconomyApprovedResult =
  | {
      ok: true;
      catalogStore: WorkCatalogStore;
      knowledgeStore: CompanyKnowledgeStore;
      materialKey: string;
      unit: "l" | "kg";
    }
  | {
      ok: false;
      reason:
        | "unknown_material"
        | "invalid_price"
        | "unit_mismatch"
        | "missing_accepted_at";
      messagePl: string;
    };

/**
 * Apply Owner-approved Purchase + Market Quote for one economy material.
 * Rejects unknown identity, non-positive prices, missing acceptedAt.
 * Does NOT invent defaults.
 */
export function applyEconomyOwnerApprovedPrices(opts: {
  catalogStore: WorkCatalogStore;
  knowledgeStore: CompanyKnowledgeStore;
  approval: EconomyOwnerApprovedPriceInput;
  /** Optional wrong unit probe — if set and ≠ host unit → unit_mismatch */
  forceQuoteUnit?: string;
}): ApplyEconomyApprovedResult {
  const host = economyProductHostByMaterialKey(opts.approval.materialKey);
  if (!host) {
    return {
      ok: false,
      reason: "unknown_material",
      messagePl: `Nieznany materialKey poza PRICE-PATH-01 hosts: ${opts.approval.materialKey}`,
    };
  }
  if (!opts.approval.acceptedAtIso?.trim()) {
    return {
      ok: false,
      reason: "missing_accepted_at",
      messagePl: "Brak acceptedAt — PRICE_GAP (wymagany Owner Accept provenance).",
    };
  }
  const purchase = Number(opts.approval.purchaseUnitPricePln);
  const market = Number(opts.approval.marketQuotePln);
  if (!(purchase > 0) || !(market > 0) || !Number.isFinite(purchase) || !Number.isFinite(market)) {
    return {
      ok: false,
      reason: "invalid_price",
      messagePl: "Cena musi być liczbą > 0 — brak invent/default.",
    };
  }
  if (opts.forceQuoteUnit != null && opts.forceQuoteUnit !== host.unit) {
    return {
      ok: false,
      reason: "unit_mismatch",
      messagePl: `Unit mismatch: host=${host.unit} forced=${opts.forceQuoteUnit} — PRICE_GAP.`,
    };
  }

  const hosts = applyEconomyProductHostsToWorkCatalog(opts.catalogStore);
  const origin: MarketQuoteOriginId = opts.approval.origin ?? "wgdom";
  const confidence = opts.approval.confidence ?? 0.7;
  const acceptedAt = opts.approval.acceptedAtIso;

  const store = normalizeWorkCatalogStore(hosts.store);
  const catalogs = { ...store.catalogs };
  for (const region of CATALOG_REGIONS) {
    const slice = catalogs[region] ?? { region, works: [], updatedAt: acceptedAt };
    const byId = new Map(slice.works.map((w) => [w.id, w] as const));
    const prev = byId.get(host.catalogWorkId);
    const base = buildHostWork(host, prev);
    const prevQuotes = base.marketQuotes ?? {};
    const snapWroclaw = {
      price: market,
      regionCode: "wroclaw" as const,
      coverage: "indicative" as const,
      updatedAt: acceptedAt,
      confidence,
      origin,
    };
    const snapDolny = { ...snapWroclaw, regionCode: "dolnyslask" as const };
    byId.set(host.catalogWorkId, {
      ...base,
      unit: host.unit,
      marketQuotes: {
        ...prevQuotes,
        [origin]: {
          ...(prevQuotes[origin] ?? {}),
          wroclaw: snapWroclaw,
          dolnyslask: snapDolny,
        },
      },
      updatedAt: acceptedAt,
      freshnessStatus: "ok",
      companyPricePln: base.companyPricePln > 0 ? base.companyPricePln : 0,
    });
    catalogs[region] = {
      region,
      works: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, "pl")),
      updatedAt: acceptedAt,
    };
  }

  const knowledge = normalizeCompanyKnowledgeStore(opts.knowledgeStore);
  const namedEntry: CompanyKnowledgeEntry = {
    entryId: buildCompanyKnowledgeEntryId(host.namePl, "material", host.unit),
    namePl: host.namePl,
    nameKey: buildCompanyKnowledgeNameKey(host.namePl),
    category: "material",
    unit: host.unit,
    occurrenceCount: 1,
    approvedCount: 1,
    changedCount: 0,
    lastUnitPricePln: purchase,
    avgUnitPricePln: purchase,
    lastUsedAt: acceptedAt,
    lastSourceKind: "user",
    lastSourceLabelPl: "PRICE-PATH-01 Owner Accept",
    primarilyFromUser: true,
    observations: [],
  };
  const directEntry: CompanyKnowledgeEntry = {
    ...namedEntry,
    entryId: buildCompanyKnowledgeEntryId(host.materialKey, "material", host.unit),
    namePl: host.materialKey,
    nameKey: buildCompanyKnowledgeNameKey(host.materialKey),
  };
  const byId = new Map(knowledge.entries.map((e) => [e.entryId, e] as const));
  byId.set(namedEntry.entryId, namedEntry);
  byId.set(directEntry.entryId, directEntry);

  return {
    ok: true,
    catalogStore: normalizeWorkCatalogStore({
      ...store,
      catalogs,
      updatedAt: acceptedAt,
    }),
    knowledgeStore: normalizeCompanyKnowledgeStore({
      ...knowledge,
      updatedAt: acceptedAt,
      entries: [...byId.values()],
    }),
    materialKey: host.materialKey,
    unit: host.unit,
  };
}
