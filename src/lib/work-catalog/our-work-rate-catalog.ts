/**
 * WORK-CATALOG-REBUILD-01 P1 — view-model Nasz Katalog Robót.
 * Lista = definicje CatalogWork · cena = wyłącznie OUR RATE (nie companyPricePln).
 */

import { listWorksForRegion } from "@/lib/work-catalog/catalog-work-utils";
import {
  deriveOurWorkRateFreshness,
  workRateFreshnessLabelPl,
} from "@/lib/work-catalog/work-rate-freshness";
import {
  WORK_RATE_FRESHNESS_LABELS_PL,
  WORK_RATE_REGION_SCOPE_LABELS_PL,
  buildWorkRateIdentityKey,
  type OurWorkRate,
  type OurWorkRateHistoryEntry,
  type WorkRateFreshnessStatus,
  type WorkRateRegionScope,
  type WorkRateSourceType,
} from "@/lib/work-catalog/work-rate-types";
import type { CatalogWork, CommercialPricing, WorkCatalogStore } from "@/lib/work-catalog/types";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import {
  computeSellPricePln,
  isOurPriceCatalogMaterialHost,
  resolveMarginPct,
} from "@/lib/price-intelligence/our-price-catalog";

export type OurWorkRateCatalogFreshnessFilter =
  | "ALL"
  | "CURRENT"
  | "STALE"
  | "MISSING";

export type OurWorkRatePriceChange = {
  status: "KNOWN" | "UNKNOWN";
  deltaPln: number | null;
  /** Etykieta PL — nigdy z companyPricePln. */
  labelPl: string;
};

export type OurWorkRateCatalogRow = {
  workId: string;
  unit: WgdomCostUnit;
  identityKey: string;
  namePl: string;
  unitLabelPl: string;
  active: boolean;
  freshness: WorkRateFreshnessStatus;
  freshnessLabelPl: string;
  ourRatePln: number | null;
  observedAt: string | null;
  observedAtLabelPl: string;
  sourceType: WorkRateSourceType | null;
  sourceLabelPl: string;
  regionScope: WorkRateRegionScope | null;
  regionLabelPl: string;
  priceChange: OurWorkRatePriceChange;
  history: OurWorkRateHistoryEntry[];
  /**
   * WGDOM commercial margin (REUSE material commercialPricing).
   * null / marginUnset = UNKNOWN — never invent default from companyPrice / Bid.
   */
  marginPct: number | null;
  marginUnset: boolean;
  /**
   * Derived sell = computeSellPricePln(ourRate, marginPct).
   * NEVER written to OUR RATE / companyPricePln.
   */
  sellPricePln: number | null;
  commercialPricing: CommercialPricing | undefined;
  /** TECHNICAL LEGACY — tylko do asercji testowych; UI NIE pokazuje jako stawki. */
  companyPricePlnLegacy: number;
};

export type OurWorkRateCatalogSummary = {
  total: number;
  current: number;
  stale: number;
  missing: number;
};

const UNIT_LABELS_PL: Record<string, string> = {
  m2: "m²",
  mb: "mb",
  szt: "szt.",
  rbh: "rbh",
  m3: "m³",
  kpl: "kpl.",
  kg: "kg",
  prob: "próba",
  pomiar: "pomiar",
};

export function workRateUnitLabelPl(unit: string): string {
  return UNIT_LABELS_PL[unit] ?? unit;
}

export function workRateSourceTypeLabelPl(
  sourceType: WorkRateSourceType | null | undefined,
): string {
  switch (sourceType) {
    case "OWNER":
      return "WŁASNA STAWKA";
    case "ACCEPT":
      return "ZAAKCEPTOWANA";
    case "CALCULATED":
      return "WYLICZONA";
    case "RESEARCH":
      return "BADANIE RYNKU";
    default:
      return "—";
  }
}

export function formatOurWorkRateObservedAtPl(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatOurWorkRatePln(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} zł`;
}

/**
 * Zmiana = obecna OUR RATE vs poprzednia obserwacja OUR w historii.
 * NIE porównuje z companyPricePln / marketQuotes / Bid.
 */
export function computeOurWorkRatePriceChange(
  rate: OurWorkRate | undefined | null,
): OurWorkRatePriceChange {
  if (!rate || !(rate.ourRatePln > 0)) {
    return {
      status: "UNKNOWN",
      deltaPln: null,
      labelPl: "BRAK DANYCH PORÓWNAWCZYCH",
    };
  }
  const ourEntries = (rate.history ?? []).filter((h) => h.kind === "OUR" && h.ratePln > 0);
  if (ourEntries.length < 2) {
    return {
      status: "UNKNOWN",
      deltaPln: null,
      labelPl: "BRAK DANYCH PORÓWNAWCZYCH",
    };
  }
  const prev = ourEntries[ourEntries.length - 2]!;
  const curr = ourEntries[ourEntries.length - 1]!;
  const delta =
    curr.changePln != null && Number.isFinite(curr.changePln)
      ? curr.changePln
      : Math.round((curr.ratePln - prev.ratePln) * 100) / 100;
  const sign = delta > 0 ? "+" : "";
  return {
    status: "KNOWN",
    deltaPln: delta,
    labelPl: `${sign}${delta.toLocaleString("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} zł`,
  };
}

function buildRow(work: CatalogWork, nowMs: number): OurWorkRateCatalogRow {
  const rate = work.ourWorkRate;
  const freshness = deriveOurWorkRateFreshness(rate, nowMs);
  const hasRate = freshness !== "MISSING" && rate != null && rate.ourRatePln > 0;
  const marginPct = resolveMarginPct(work);

  return {
    workId: work.id,
    unit: work.unit,
    identityKey: buildWorkRateIdentityKey(work.id, work.unit),
    namePl: work.namePl,
    unitLabelPl: workRateUnitLabelPl(work.unit),
    active: work.active,
    freshness,
    freshnessLabelPl: workRateFreshnessLabelPl(freshness),
    ourRatePln: hasRate ? rate!.ourRatePln : null,
    observedAt: hasRate ? rate!.observedAt : null,
    observedAtLabelPl: hasRate
      ? formatOurWorkRateObservedAtPl(rate!.observedAt)
      : "—",
    sourceType: hasRate ? rate!.sourceType : null,
    sourceLabelPl: hasRate ? workRateSourceTypeLabelPl(rate!.sourceType) : "—",
    regionScope: hasRate ? rate!.regionScope : null,
    regionLabelPl:
      hasRate && rate!.regionScope
        ? WORK_RATE_REGION_SCOPE_LABELS_PL[rate!.regionScope]
        : "—",
    priceChange: computeOurWorkRatePriceChange(hasRate ? rate : undefined),
    history: hasRate ? [...(rate!.history ?? [])] : [],
    marginPct,
    marginUnset: marginPct == null,
    sellPricePln: computeSellPricePln(hasRate ? rate!.ourRatePln : null, marginPct),
    commercialPricing: work.commercialPricing,
    companyPricePlnLegacy: work.companyPricePln,
  };
}

export function summarizeOurWorkRateCatalogRows(
  rows: readonly OurWorkRateCatalogRow[],
): OurWorkRateCatalogSummary {
  let current = 0;
  let stale = 0;
  let missing = 0;
  for (const r of rows) {
    if (r.freshness === "CURRENT") current += 1;
    else if (r.freshness === "STALE") stale += 1;
    else missing += 1;
  }
  return { total: rows.length, current, stale, missing };
}

export type BuildOurWorkRateCatalogRowsInput = {
  store: WorkCatalogStore;
  search?: string;
  freshnessFilter?: OurWorkRateCatalogFreshnessFilter;
  /** Domyślnie tylko aktywne definicje Biblioteki. */
  activeOnly?: boolean;
  unitFilter?: WgdomCostUnit | "all";
  nowMs?: number;
};

/**
 * Buduje wiersze katalogu. NIGDY nie używa companyPricePln jako OUR RATE.
 */
export function buildOurWorkRateCatalogRows(
  input: BuildOurWorkRateCatalogRowsInput,
): OurWorkRateCatalogRow[] {
  const nowMs = input.nowMs ?? Date.now();
  const activeOnly = input.activeOnly !== false;
  const freshnessFilter = input.freshnessFilter ?? "ALL";
  const unitFilter = input.unitFilter ?? "all";
  const search = (input.search ?? "").trim().toLocaleLowerCase("pl-PL");

  let works = listWorksForRegion(input.store);
  if (activeOnly) works = works.filter((w) => w.active);
  works = works.filter((w) => !isOurPriceCatalogMaterialHost(w.id));

  const rows: OurWorkRateCatalogRow[] = [];
  for (const work of works) {
    if (unitFilter !== "all" && work.unit !== unitFilter) continue;
    if (search) {
      const hay = `${work.namePl} ${work.id} ${work.keywords?.join(" ") ?? ""}`.toLocaleLowerCase(
        "pl-PL",
      );
      if (!hay.includes(search)) continue;
    }
    const row = buildRow(work, nowMs);
    if (freshnessFilter !== "ALL" && row.freshness !== freshnessFilter) continue;
    rows.push(row);
  }

  rows.sort((a, b) => a.namePl.localeCompare(b.namePl, "pl"));
  return rows;
}

export const OUR_WORK_RATE_CATALOG_FRESHNESS_FILTERS: {
  id: OurWorkRateCatalogFreshnessFilter;
  label: string;
}[] = [
  { id: "ALL", label: "Wszystkie" },
  { id: "CURRENT", label: "Aktualne" },
  { id: "STALE", label: "Przeterminowane" },
  { id: "MISSING", label: "Brak stawki" },
];

/**
 * Same validation as Nasz katalog cen (finite, >= 0). Clamp 0…1000 is in patchWorkCommercialPricing.
 */
export function parseOwnerCommercialMarginPctInput(raw: string): number | null {
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Active labor CatalogWork IDs for global MIN floor.
 * Excludes material hosts (SSOT: isOurPriceCatalogMaterialHost). Inactive skipped.
 */
export function listLaborWorkIdsForCommercialMarginFloor(
  store: WorkCatalogStore,
): string[] {
  return buildOurWorkRateCatalogRows({
    store,
    search: "",
    freshnessFilter: "ALL",
    activeOnly: true,
  }).map((r) => r.workId);
}

/** Sanity: etykiety PL nie zawierają surowych enumów w UI copy. */
export function ourWorkRateCatalogUiUsesPolishLabelsOnly(): boolean {
  const labels = Object.values(WORK_RATE_FRESHNESS_LABELS_PL);
  return (
    labels.includes("AKTUALNA") &&
    labels.includes("PRZETERMINOWANA") &&
    labels.includes("BRAK STAWKI") &&
    !labels.includes("CURRENT") &&
    !labels.includes("STALE") &&
    !labels.includes("MISSING")
  );
}
