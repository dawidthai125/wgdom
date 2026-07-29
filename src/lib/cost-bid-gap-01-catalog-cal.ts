/**
 * COST-BID-GAP-01 / GAP-A — kalibracja direct katalogowego (upstream Bid).
 * REUSE: classifyAthLineCategory · computeMarketAverageForWork · Work Catalog odczyt.
 * Zakaz: Bid tail / costModel / MULTI / Discovery / parsers / hardcode 1,6M.
 * DF: docs/architecture/COST-BID-GAP-01-DESIGN-FREEZE.md
 */

import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import { classifyAthLineCategory } from "@/lib/wgdom-ath-classifier";
import type {
  WgdomCostCatalog,
  WgdomCostCategoryId,
  WgdomCostUnit,
  WgdomCategoryRate,
} from "@/lib/wgdom-cost-catalog";
import {
  getCategoryRate,
  getUnknownFallbackRate,
  normalizeWgdomCostUnit,
} from "@/lib/wgdom-cost-catalog";
import type { CatalogWork } from "@/lib/work-catalog/types";
import { computeMarketAverageForWork } from "@/lib/work-catalog";
import {
  deriveCostSplitFromLegacyRate,
  normalizeCostSplit,
  resolveReferenceHourlyPln,
  splitCompanyPrice,
} from "@/lib/work-catalog/cost-split";
import type { MarketRegionCode } from "@/lib/work-catalog";
import { isMarketRegionCode } from "@/lib/work-catalog";

/** Dodatkowe keywords GAP-A — tylko gdy flaga ON (nie zmienia seed katalogu przy OFF). */
export const GAP_A_EXTRA_CLASSIFICATION_KEYWORDS: {
  id: WgdomCostCategoryId;
  keywords: string[];
}[] = [
  {
    id: "HYDRAULIKA",
    keywords: [
      "hydrant",
      "hydrantow",
      "ppoz",
      "p.poz",
      "p poz",
      "przeciwpozar",
      "gasnic",
      "tryskacz",
      "instalacja hydrant",
      "zawor hydrant",
      "szafa hydrant",
    ],
  },
  {
    id: "ROBOTY_OGOLNOBUDOWLANE",
    keywords: [
      "murowan",
      "murowanie",
      "zelbet",
      "zbrojen",
      "betonowan",
      "fundament",
      "wykop",
      "zasypk",
      "zasypanie",
      "sciana konstrukcyj",
      "strop",
      "plyta stropow",
      "izolacja przeciwwilg",
      "izolacje przeciwwilg",
      "papa termozgrzew",
      "termoizolac",
      "wełna mineralna",
      "welna mineralna",
      "styropian",
      "tynk cementowo",
      "tynk cementowowapien",
      "roboty ziemne",
      "roboty betonowe",
      "roboty murowe",
    ],
  },
  {
    id: "ELEKTRYKA",
    keywords: [
      "kabel",
      "kable",
      "puszka",
      "puszki",
      "tablica rozdziel",
      "rozdzielnica",
      "oprawa",
      "oprawy",
      "led",
      "nlk",
      "instalacja elektryczna",
      "obwod",
      "obwody",
      "gniazdo",
      "wlacznik",
    ],
  },
  {
    id: "INSTALACJE_CO",
    keywords: [
      "c.o.",
      "c.o,",
      " centralnego ogrzew",
      "instalacja c.o",
      "instalacji c.o",
      "ogrzewanie podlogowe",
      "ogrzewania podlogowego",
    ],
  },
  {
    id: "WENTYLACJA",
    keywords: ["rekuper", "centrala wentyl", "kanal wentylacyjny", "kratka wentyl"],
  },
  {
    id: "TRANSPORT_UTYLIZACJA",
    keywords: ["wywoz gruzu", "wywiezienie gruzu", "kontener na gruz", "utylizacja odpad"],
  },
  {
    id: "ROZBIORKI",
    keywords: ["rozbiorka", "rozbiórka", "demontaz konstrukc", "skucie tynkow"],
  },
];

/**
 * Mnożniki materiału vs seed (kalibracja stawek za flagą).
 * Świadomie umiarkowane — nie target-hack do 1,6M.
 */
export const GAP_A_MATERIAL_RATE_MULTIPLIER: Partial<Record<WgdomCostCategoryId, number>> = {
  ROBOTY_OGOLNOBUDOWLANE: 1.28,
  ELEKTRYKA: 1.22,
  HYDRAULIKA: 1.25,
  INSTALACJE_CO: 1.2,
  INSTALACJE_GAZ: 1.18,
  WENTYLACJA: 1.18,
  GLADZIE_TYNKI: 1.15,
  MALOWANIE: 1.12,
  GLAZURA: 1.15,
  PODLOGI: 1.15,
  GK: 1.15,
  STOLARKA: 1.12,
  ROZBIORKI: 1.1,
  TRANSPORT_UTYLIZACJA: 1.08,
  WYPOSAZENIE: 1.1,
};

/** Lepszy fallback UNKNOWN (tylko gdy nadal UNKNOWN po GAP-A classify). */
export const GAP_A_UNKNOWN_FALLBACK = {
  materialPlnPerUnit: 42,
  laborRbhPerUnit: 0.35,
  defaultUnit: "m2" as WgdomCostUnit,
};

function keywordMatches(haystack: string, keyword: string): boolean {
  const k = foldPolishText(keyword.trim());
  if (!k) return false;
  if (k.includes(".*")) {
    try {
      return new RegExp(k, "i").test(haystack);
    } catch {
      return haystack.includes(k.replace(/\.\*/g, ""));
    }
  }
  return haystack.includes(k);
}

/**
 * Klasyfikacja GAP-A: najpierw SSOT classifier, potem dodatkowe keywords (bez parsera).
 */
export function classifyAthLineCategoryGapA(
  description: string,
  unit?: string,
  catalog?: WgdomCostCatalog,
): WgdomCostCategoryId {
  const base = classifyAthLineCategory(description, unit, catalog);
  if (base !== "UNKNOWN") return base;

  const hay = foldPolishText(description || "");
  if (!hay.trim()) return "UNKNOWN";

  for (const rule of GAP_A_EXTRA_CLASSIFICATION_KEYWORDS) {
    for (const kw of rule.keywords) {
      if (keywordMatches(hay, kw)) return rule.id;
    }
  }
  return "UNKNOWN";
}

export interface GapAResolvedRate {
  rate: WgdomCategoryRate;
  unit: WgdomCostUnit;
  usedFallback: boolean;
  materialSource: "base" | "catalog" | "market";
  marketWorkId?: string;
}

/**
 * Thin match Work Catalog (REUSE logiki podobnej do mapping — bez edycji OfferBoq).
 */
export function scoreCatalogWorkForGapA(opts: {
  description: string;
  unit: string | undefined;
  categoryId: WgdomCostCategoryId;
  work: CatalogWork;
}): number {
  const hay = foldPolishText(opts.description || "");
  const unitNorm = normalizeWgdomCostUnit(opts.unit);
  let score = 0;
  if (opts.work.legacyCategoryId && opts.work.legacyCategoryId === opts.categoryId && opts.categoryId !== "UNKNOWN") {
    score += 40;
  }
  const workUnit = normalizeWgdomCostUnit(opts.work.unit);
  if (unitNorm && workUnit && unitNorm === workUnit) score += 25;
  for (const kw of opts.work.keywords ?? []) {
    const k = foldPolishText(kw.trim());
    if (k.length >= 3 && hay.includes(k)) score += 12;
  }
  const nameFold = foldPolishText(opts.work.namePl || "");
  for (const token of nameFold.split(/\s+/)) {
    if (token.length >= 4 && hay.includes(token)) score += 8;
  }
  return score;
}

export function pickBestCatalogWorkForGapA(opts: {
  description: string;
  unit: string | undefined;
  categoryId: WgdomCostCategoryId;
  works: CatalogWork[];
  minScore?: number;
}): CatalogWork | null {
  const minScore = opts.minScore ?? 40;
  let best: CatalogWork | null = null;
  let bestScore = 0;
  for (const work of opts.works) {
    if (!work.active) continue;
    const score = scoreCatalogWorkForGapA({
      description: opts.description,
      unit: opts.unit,
      categoryId: opts.categoryId,
      work,
    });
    if (score > bestScore) {
      bestScore = score;
      best = work;
    }
  }
  return bestScore >= minScore ? best : null;
}

/**
 * REUSE marketQuotes → material PLN / j.m. (bez Kp/marży).
 */
export function lookupMarketMaterialPlnPerUnit(opts: {
  work: CatalogWork;
  hourlyPln: number;
  startRegionCode?: string | null;
  computedAtIso?: string;
}): { materialPlnPerUnit: number; workId: string } | null {
  const startRegion = isMarketRegionCode(opts.startRegionCode)
    ? (opts.startRegionCode as MarketRegionCode)
    : undefined;
  const avg = computeMarketAverageForWork(opts.work, {
    context: startRegion ? { startRegionCode: startRegion } : undefined,
    computedAtIso: opts.computedAtIso,
  });
  if (avg.pricePln == null || !(avg.pricePln > 0)) return null;

  const hourly = resolveReferenceHourlyPln(opts.hourlyPln);
  const split =
    opts.work.costSplit ??
    deriveCostSplitFromLegacyRate(avg.pricePln * 0.55, 0.2, hourly);
  const parts = splitCompanyPrice(avg.pricePln, normalizeCostSplit(split), hourly);
  if (!(parts.materialPlnPerUnit > 0)) return null;
  return { materialPlnPerUnit: parts.materialPlnPerUnit, workId: opts.work.id };
}

/**
 * Stawka katalogowa + kalibracja GAP-A + opcjonalny overlay market.
 */
export function resolveGapACatalogRate(opts: {
  catalog: WgdomCostCatalog;
  category: WgdomCostCategoryId;
  unitRaw: string | undefined;
  description: string;
  works?: CatalogWork[] | null;
  hourlyPln: number;
  startRegionCode?: string | null;
  computedAtIso?: string;
}): GapAResolvedRate {
  const { catalog, category, unitRaw, description } = opts;
  const normalized = normalizeWgdomCostUnit(unitRaw);
  const unit: WgdomCostUnit = normalized ?? catalog.unknownFallback.defaultUnit;

  let rate: WgdomCategoryRate;
  let usedFallback = false;

  if (category !== "UNKNOWN") {
    const matched = normalized ? getCategoryRate(catalog, category, normalized) : null;
    if (matched) {
      rate = { ...matched };
    } else {
      const def = catalog.categories.find((c) => c.id === category);
      const firstRate = def?.rates[0];
      const fromCatalog = firstRate ? getCategoryRate(catalog, category, firstRate.unit) : null;
      if (fromCatalog) {
        rate = { ...fromCatalog };
        usedFallback = true;
      } else {
        rate = getUnknownFallbackRate(catalog);
        usedFallback = true;
      }
    }
    const mult = GAP_A_MATERIAL_RATE_MULTIPLIER[category];
    if (mult != null && mult > 1) {
      rate = {
        ...rate,
        materialPlnPerUnit: rate.materialPlnPerUnit * mult,
      };
    }
  } else {
    const fb = GAP_A_UNKNOWN_FALLBACK;
    rate = {
      unit: fb.defaultUnit,
      materialPlnPerUnit: fb.materialPlnPerUnit * catalog.regionMultiplier,
      laborRbhPerUnit: fb.laborRbhPerUnit,
    };
    usedFallback = true;
  }

  let materialSource: "base" | "catalog" | "market" = usedFallback ? "catalog" : "base";
  let marketWorkId: string | undefined;

  const works = opts.works?.filter((w) => w.active) ?? [];
  if (works.length > 0 && category !== "UNKNOWN") {
    const work = pickBestCatalogWorkForGapA({
      description,
      unit: unitRaw,
      categoryId: category,
      works,
    });
    if (work) {
      const market = lookupMarketMaterialPlnPerUnit({
        work,
        hourlyPln: opts.hourlyPln,
        startRegionCode: opts.startRegionCode,
        computedAtIso: opts.computedAtIso,
      });
      if (market && market.materialPlnPerUnit > rate.materialPlnPerUnit) {
        rate = {
          ...rate,
          materialPlnPerUnit: market.materialPlnPerUnit,
        };
        materialSource = "market";
        marketWorkId = market.workId;
      }
    }
  }

  return {
    rate: {
      unit: rate.unit,
      materialPlnPerUnit: rate.materialPlnPerUnit,
      laborRbhPerUnit: rate.laborRbhPerUnit,
    },
    unit: rate.unit,
    usedFallback,
    materialSource,
    marketWorkId,
  };
}
