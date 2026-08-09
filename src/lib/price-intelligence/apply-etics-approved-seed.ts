/**
 * PRICE-INTELLIGENCE-01 P3.1 — pure apply WGDOM approved seed → catalog + knowledge.
 * REUSE marketQuotes contract (origin wgdom) · bez zewnętrznych providerów.
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
import {
  PI31_APPROVED_AT_ISO,
  PI31_APPROVED_EQUIPMENT,
  PI31_APPROVED_MATERIALS,
  PI31_WGDOM_CONFIDENCE,
} from "./etics-approved-seed";

const CATALOG_REGIONS: readonly WgdomCostRegion[] = ["wroclaw", "dolnyslask"];

function wgdomSnapshot(price: number) {
  return {
    price,
    regionCode: "wroclaw" as const,
    coverage: "indicative" as const,
    updatedAt: PI31_APPROVED_AT_ISO,
    confidence: PI31_WGDOM_CONFIDENCE,
    origin: "wgdom" as const,
  };
}

function ensureWork(spec: (typeof PI31_APPROVED_MATERIALS)[number], existing?: CatalogWork): CatalogWork {
  const snap = wgdomSnapshot(spec.marketQuotePln);
  const prevQuotes = existing?.marketQuotes ?? {};
  const wgdomCell = {
    ...(prevQuotes.wgdom ?? {}),
    wroclaw: snap,
    dolnyslask: { ...snap, regionCode: "dolnyslask" as const },
  };
  return {
    id: spec.catalogWorkId,
    tradeId: existing?.tradeId ?? "POZOSTALE",
    namePl: existing?.namePl?.trim() ? existing.namePl : spec.workNamePl,
    unit: (existing?.unit as CatalogWork["unit"]) || (spec.workUnit as CatalogWork["unit"]),
    companyPricePln:
      existing && existing.companyPricePln > 0 ? existing.companyPricePln : spec.marketQuotePln,
    marketQuotes: {
      ...prevQuotes,
      wgdom: wgdomCell,
    },
    updatedAt: PI31_APPROVED_AT_ISO,
    freshnessStatus: "ok",
    keywords: existing?.keywords?.length
      ? existing.keywords
      : [spec.namePl.toLowerCase(), spec.materialKey, "etics", "wgdom approved"],
    active: true,
    favorite: existing?.favorite ?? false,
    usageCount: existing?.usageCount ?? 0,
    source: existing?.source ?? "custom",
    descriptionPl:
      existing?.descriptionPl ??
      `WGDOM approved P3.1 · ${spec.materialKey} · nie live market zewnętrzny`,
  };
}

export interface ApplyPi31CatalogResult {
  store: WorkCatalogStore;
  worksUpserted: number;
  quotesCellsWritten: number;
  changed: boolean;
}

/** Upsert 4 robót ETICS + marketQuotes[wgdom] w obu regionach katalogu. */
export function applyPi31ApprovedQuotesToWorkCatalog(
  rawStore: WorkCatalogStore,
): ApplyPi31CatalogResult {
  const store = normalizeWorkCatalogStore(rawStore);
  let worksUpserted = 0;
  let quotesCellsWritten = 0;
  let changed = false;

  const catalogs = { ...store.catalogs };
  for (const region of CATALOG_REGIONS) {
    const slice = catalogs[region] ?? { region, works: [], updatedAt: PI31_APPROVED_AT_ISO };
    const byId = new Map(slice.works.map((w) => [w.id, w] as const));
    for (const spec of PI31_APPROVED_MATERIALS) {
      const prev = byId.get(spec.catalogWorkId);
      const next = ensureWork(spec, prev);
      const prevJson = JSON.stringify(prev?.marketQuotes?.wgdom ?? null);
      const nextJson = JSON.stringify(next.marketQuotes?.wgdom ?? null);
      if (!prev || prevJson !== nextJson || prev.active !== true) {
        changed = true;
        if (!prev) worksUpserted += 1;
        quotesCellsWritten += 2; // wroclaw + dolnyslask cells
      }
      byId.set(spec.catalogWorkId, next);
    }
    catalogs[region] = {
      region,
      works: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, "pl")),
      updatedAt: changed ? PI31_APPROVED_AT_ISO : slice.updatedAt,
    };
  }

  const out: WorkCatalogStore = {
    ...store,
    catalogs,
    updatedAt: changed ? PI31_APPROVED_AT_ISO : store.updatedAt,
  };
  return {
    store: normalizeWorkCatalogStore(out),
    worksUpserted,
    quotesCellsWritten,
    changed,
  };
}

export interface ApplyPi31KnowledgeResult {
  store: CompanyKnowledgeStore;
  entriesUpserted: number;
  changed: boolean;
}

function approvedKnowledgeEntry(spec: (typeof PI31_APPROVED_MATERIALS)[number]): CompanyKnowledgeEntry {
  return {
    entryId: buildCompanyKnowledgeEntryId(spec.namePl, "material", spec.unit),
    namePl: spec.namePl,
    nameKey: buildCompanyKnowledgeNameKey(spec.namePl),
    category: "material",
    unit: spec.unit,
    occurrenceCount: 1,
    approvedCount: 1,
    changedCount: 0,
    lastUnitPricePln: spec.purchaseUnitPricePln,
    avgUnitPricePln: spec.purchaseUnitPricePln,
    lastUsedAt: PI31_APPROVED_AT_ISO,
    lastSourceKind: "user",
    lastSourceLabelPl: "WGDOM approved P3.1",
    primarilyFromUser: true,
    observations: [],
  };
}

/** Upsert 4 wpisów Purchase (company knowledge) — bez nadpisywania droższych user entries. */
export function applyPi31ApprovedPurchaseToKnowledge(
  rawStore: CompanyKnowledgeStore,
): ApplyPi31KnowledgeResult {
  const store = normalizeCompanyKnowledgeStore(rawStore);
  const byId = new Map(store.entries.map((e) => [e.entryId, e] as const));
  let entriesUpserted = 0;
  let changed = false;

  for (const spec of PI31_APPROVED_MATERIALS) {
    const next = approvedKnowledgeEntry(spec);
    const prev = byId.get(next.entryId);
    if (!prev) {
      byId.set(next.entryId, next);
      entriesUpserted += 1;
      changed = true;
      continue;
    }
    const prevPrice = prev.lastUnitPricePln ?? prev.avgUnitPricePln;
    if (!(typeof prevPrice === "number" && prevPrice > 0)) {
      byId.set(next.entryId, { ...prev, ...next, observations: prev.observations });
      entriesUpserted += 1;
      changed = true;
    }
  }

  return {
    store: normalizeCompanyKnowledgeStore({
      ...store,
      updatedAt: changed ? PI31_APPROVED_AT_ISO : store.updatedAt,
      entries: [...byId.values()],
    }),
    entriesUpserted,
    changed,
  };
}

export function buildPi31EquipmentRateByKey(): Readonly<
  Record<string, { unitPricePln: number; labelPl?: string }>
> {
  const out: Record<string, { unitPricePln: number; labelPl?: string }> = {};
  for (const e of PI31_APPROVED_EQUIPMENT) {
    out[e.equipmentKey] = { unitPricePln: e.unitPricePln, labelPl: e.namePl };
  }
  return Object.freeze(out);
}
