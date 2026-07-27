/**
 * AI-COST-01 / COST-S4 — AI Pricing Engine (pure).
 * Jeden silnik z modułami M/R/S/transport/pomocnicze — bez Kp, marży i ceny ofertowej.
 */

import { defaultCostModelFromPayroll, fullyLoadedHourly } from "@/lib/company-labor-cost";
import {
  defaultWgdomCostCatalog,
  getCategoryRate,
  normalizeWgdomCostUnit,
  type WgdomCostCatalog,
  type WgdomCostCategoryId,
} from "@/lib/wgdom-cost-catalog";
import type { CatalogWork } from "@/lib/work-catalog/types";
import {
  deriveCostSplitFromLegacyRate,
  normalizeCostSplit,
  resolveReferenceHourlyPln,
  splitCompanyPrice,
} from "@/lib/work-catalog/cost-split";
import type { TenderCompanyCostModel } from "@/lib/tenders-bzp-company";
import {
  computeOfferBoqRecomputeToken,
  emptyOfferBoqTotals,
  type OfferBoqConfidence,
  type OfferBoqDecompositionElement,
  type OfferBoqDocument,
  type OfferBoqLine,
  type OfferBoqLinePricing,
  type OfferBoqLinePricingAggregates,
  type OfferBoqPriceOrigin,
  type OfferBoqPricedComponent,
  type OfferBoqPricedComponentCategory,
  type OfferBoqPricingComponent,
  type OfferBoqPricingStats,
  UNKNOWN_PRICE_SOURCE,
} from "@/lib/tender-offer-boq";

export interface OfferBoqPriceLookupRequest {
  category: OfferBoqPricedComponentCategory;
  namePl: string;
  unit: string;
  quantity: number;
  line: OfferBoqLine;
  pricingComponentKind?: OfferBoqPricingComponent;
  decompositionElement?: OfferBoqDecompositionElement;
}

export interface OfferBoqPriceLookupResult {
  unitPricePln: number | null;
  origin: OfferBoqPriceOrigin;
  confidence: OfferBoqConfidence;
  rationale: string;
}

/** Interfejs źródła ceny — rozszerzalny (katalog, model firmy, przyszłe feedy). */
export interface OfferBoqPriceSourceProvider {
  id: string;
  labelPl: string;
  /** null = provider nie obsługuje tego komponentu. */
  lookup(req: OfferBoqPriceLookupRequest): OfferBoqPriceLookupResult | null;
}

export interface OfferBoqPricingContext {
  works?: CatalogWork[];
  costCatalog?: WgdomCostCatalog;
  costModel?: TenderCompanyCostModel;
  /** Dodatkowe / zamienne providery (po domyślnych lub zamiast). */
  providers?: OfferBoqPriceSourceProvider[];
  /** Gdy true — użyj tylko `providers` (bez domyślnego łańcucha). */
  replaceDefaultProviders?: boolean;
  pricedAt?: string;
  documentContext?: string | null;
}

function roundPln(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function mapKindToCategory(kind: OfferBoqPricingComponent): OfferBoqPricedComponentCategory {
  switch (kind) {
    case "material":
    case "purchase":
      return "material";
    case "labor":
    case "installation":
    case "commissioning":
    case "configuration":
    case "acceptance":
    case "wiring":
    case "test":
    case "carry_in":
      return "labor";
    case "measurement_equipment":
      return "equipment";
    case "transport":
      return "transport";
    case "auxiliary_material":
      return "auxiliary";
    default:
      return "material";
  }
}

function componentLabelPl(kind: OfferBoqPricingComponent): string {
  const labels: Record<OfferBoqPricingComponent, string> = {
    material: "Materiał",
    labor: "Robocizna",
    auxiliary_material: "Materiały pomocnicze",
    purchase: "Zakup",
    transport: "Transport",
    carry_in: "Wniesienie",
    installation: "Montaż",
    commissioning: "Uruchomienie",
    measurement_equipment: "Sprzęt pomiarowy",
    configuration: "Konfiguracja",
    acceptance: "Odbiory",
    wiring: "Okablowanie",
    test: "Testy",
  };
  return labels[kind] ?? kind;
}

/** Moduł materiałów — lookup z Work Catalog / stawek kategorii. */
export function createWorkCatalogPriceProvider(
  works: CatalogWork[],
  hourlyPln: number,
): OfferBoqPriceSourceProvider {
  const byId = new Map(works.filter((w) => w.active).map((w) => [w.id, w]));
  return {
    id: "work_catalog",
    labelPl: "Biblioteka Robót WGDOM",
    lookup(req) {
      const workId = req.line.catalogWorkId;
      if (!workId) return null;
      const work = byId.get(workId);
      if (!work || !(work.companyPricePln > 0)) return null;

      const hourly = resolveReferenceHourlyPln(hourlyPln);
      const split =
        work.costSplit ??
        deriveCostSplitFromLegacyRate(work.companyPricePln * 0.55, 0.2, hourly);
      const parts = splitCompanyPrice(work.companyPricePln, normalizeCostSplit(split), hourly);

      let unitPrice: number | null = null;
      if (req.category === "material") {
        unitPrice = parts.materialPlnPerUnit;
      } else if (req.category === "labor") {
        unitPrice = parts.laborCostPlnPerUnit;
      } else if (req.category === "equipment" && req.pricingComponentKind === "purchase") {
        unitPrice = work.companyPricePln;
      } else {
        return null;
      }

      if (!(unitPrice > 0)) return null;

      return {
        unitPricePln: roundPln(unitPrice),
        origin: {
          kind: "work_catalog",
          refId: work.id,
          labelPl: `Biblioteka Robót — ${work.namePl}`,
        },
        confidence: req.line.matchConfidence === "high" ? "high" : "medium",
        rationale: `Cena z wpisu katalogowego „${work.namePl}” (podział M/R wg costSplit).`,
      };
    },
  };
}

/** Moduł stawek kategorii legacy. */
export function createCategoryRatePriceProvider(
  catalog: WgdomCostCatalog,
  hourlyPln: number,
): OfferBoqPriceSourceProvider {
  return {
    id: "category_rate",
    labelPl: "Stawki kategorii WGDOM",
    lookup(req) {
      const categoryId = (req.line.categoryId ?? "UNKNOWN") as WgdomCostCategoryId;
      if (categoryId === "UNKNOWN") return null;
      const unit = normalizeWgdomCostUnit(req.unit);
      if (!unit) return null;
      const rate = getCategoryRate(catalog, categoryId, unit);
      if (!rate) return null;

      if (req.category === "material" && rate.materialPlnPerUnit > 0) {
        return {
          unitPricePln: roundPln(rate.materialPlnPerUnit),
          origin: {
            kind: "category_rate",
            refId: categoryId,
            labelPl: `Stawka kategorii ${categoryId}`,
          },
          confidence: "medium",
          rationale: `Materiał ze stawki kategorii ${categoryId} (katalog legacy).`,
        };
      }
      if (req.category === "labor" && rate.laborRbhPerUnit > 0) {
        const laborUnit = roundPln(rate.laborRbhPerUnit * hourlyPln);
        return {
          unitPricePln: laborUnit,
          origin: {
            kind: "category_rate",
            refId: categoryId,
            labelPl: `Robocizna kategorii ${categoryId}`,
          },
          confidence: "medium",
          rationale: `RBH ${rate.laborRbhPerUnit} × stawka firmowa ${roundPln(hourlyPln)} zł/h.`,
        };
      }
      return null;
    },
  };
}

/** Moduł modelu kosztów firmy (robocizna godzinowa). */
export function createCompanyModelPriceProvider(
  model: TenderCompanyCostModel,
): OfferBoqPriceSourceProvider {
  const hourly = fullyLoadedHourly(model);
  return {
    id: "company_model",
    labelPl: "Model kosztów firmy",
    lookup(req) {
      if (req.category !== "labor") return null;
      if (!(hourly > 0)) return null;
      // Szacunek: 0.15–0.5 h na jednostkę gdy brak normy — niska pewność
      const rbhGuess =
        req.pricingComponentKind === "installation" || req.pricingComponentKind === "commissioning"
          ? 0.5
          : req.pricingComponentKind === "carry_in"
            ? 0.25
            : 0.35;
      return {
        unitPricePln: roundPln(hourly * rbhGuess),
        origin: {
          kind: "company_model",
          refId: "avgGrossHourlyPln",
          labelPl: "Stawka godzinowa firmy (model kosztów)",
        },
        confidence: "low",
        rationale: `Szacunek robocizny: ${rbhGuess} RBH × ${roundPln(hourly)} zł/h z modelu firmy — wymaga weryfikacji.`,
      };
    },
  };
}

/**
 * Moduł heurystyk (transport, pomocnicze, sprzęt) — niskiej pewności.
 * Nie scrapuje Internetu; tylko lokalne proporcje.
 */
export function createHeuristicPriceProvider(): OfferBoqPriceSourceProvider {
  return {
    id: "heuristic_estimate",
    labelPl: "Heurystyka domenowa (szacunek)",
    lookup(req) {
      if (req.category === "transport") {
        return {
          unitPricePln: 85,
          origin: {
            kind: "heuristic_estimate",
            labelPl: "Heurystyka transportu",
          },
          confidence: "low",
          rationale: "Szacunkowa stawka transportu lokalnego — brak oficjalnego feedu; do korekty.",
        };
      }
      if (req.category === "auxiliary") {
        return {
          unitPricePln: 12,
          origin: {
            kind: "heuristic_estimate",
            labelPl: "Heurystyka materiałów pomocniczych",
          },
          confidence: "low",
          rationale: "Ryczałt na drobne materiały pomocnicze — weryfikacja użytkownika zalecana.",
        };
      }
      if (req.category === "equipment" && req.pricingComponentKind === "measurement_equipment") {
        return {
          unitPricePln: 45,
          origin: {
            kind: "heuristic_estimate",
            labelPl: "Heurystyka sprzętu pomiarowego",
          },
          confidence: "low",
          rationale: "Szacunek użycia sprzętu pomiarowego (dzień/pozycja) — do kalibracji.",
        };
      }
      return null;
    },
  };
}

/** Placeholder pod przyszłe oficjalne integracje (zawsze null). */
export function createExternalFuturePriceProvider(): OfferBoqPriceSourceProvider {
  return {
    id: "external_future",
    labelPl: "Przyszła integracja oficjalna",
    lookup() {
      return null;
    },
  };
}

export function buildDefaultPriceProviders(ctx: {
  works: CatalogWork[];
  costCatalog: WgdomCostCatalog;
  costModel: TenderCompanyCostModel;
}): OfferBoqPriceSourceProvider[] {
  const hourly = fullyLoadedHourly(ctx.costModel);
  return [
    createWorkCatalogPriceProvider(ctx.works, hourly),
    createCategoryRatePriceProvider(ctx.costCatalog, hourly),
    createCompanyModelPriceProvider(ctx.costModel),
    createHeuristicPriceProvider(),
    createExternalFuturePriceProvider(),
  ];
}

function resolvePrice(
  req: OfferBoqPriceLookupRequest,
  providers: OfferBoqPriceSourceProvider[],
): OfferBoqPriceLookupResult {
  for (const p of providers) {
    const hit = p.lookup(req);
    if (hit) return hit;
  }
  return {
    unitPricePln: null,
    origin: {
      kind: "unknown",
      labelPl: "Brak źródła ceny",
    },
    confidence: "low",
    rationale: "Nie znaleziono ceny w dostępnych źródłach — komponent bez kwoty, wymaga uzupełnienia.",
  };
}

function buildComponentSpecs(line: OfferBoqLine): Array<{
  namePl: string;
  category: OfferBoqPricedComponentCategory;
  quantity: number;
  unit: string;
  pricingComponentKind?: OfferBoqPricingComponent;
  fromDecompositionElementId?: string;
  decompositionElement?: OfferBoqDecompositionElement;
}> {
  const qty = line.quantity > 0 ? line.quantity : 1;
  const unit = line.unit || "kpl";
  const ci = line.costIntelligence;

  if (ci?.requiresDecomposition && ci.decompositionElements.length > 0) {
    return ci.decompositionElements.map((el) => {
      const kind = el.pricingComponents[0] ?? "material";
      return {
        namePl: el.labelPl,
        category: mapKindToCategory(kind),
        quantity: qty,
        unit,
        pricingComponentKind: kind,
        fromDecompositionElementId: el.elementId,
        decompositionElement: el,
      };
    });
  }

  const kinds = ci?.pricingComponents?.length
    ? ci.pricingComponents
    : (["material", "labor"] as OfferBoqPricingComponent[]);

  return kinds.map((kind) => ({
    namePl: componentLabelPl(kind),
    category: mapKindToCategory(kind),
    quantity: qty,
    unit,
    pricingComponentKind: kind,
  }));
}

function aggregateComponents(components: OfferBoqPricedComponent[]): OfferBoqLinePricingAggregates {
  const sum = (cat: OfferBoqPricedComponentCategory): number | null => {
    const vals = components.filter((c) => c.category === cat && c.totalPln != null).map((c) => c.totalPln!);
    if (vals.length === 0) return null;
    return roundPln(vals.reduce((a, b) => a + b, 0));
  };
  const materialsPln = sum("material");
  const laborPln = sum("labor");
  const equipmentPln = sum("equipment");
  const transportPln = sum("transport");
  const auxiliaryPln = sum("auxiliary");
  const parts = [materialsPln, laborPln, equipmentPln, transportPln, auxiliaryPln].filter(
    (v): v is number => v != null,
  );
  return {
    materialsPln,
    laborPln,
    equipmentPln,
    transportPln,
    auxiliaryPln,
    lineDirectPln: parts.length ? roundPln(parts.reduce((a, b) => a + b, 0)) : null,
  };
}

/** REUSE COST-S5 — agregacja komponentów bez przebudowy silnika wyceny. */
export function aggregateOfferBoqPricedComponents(
  components: OfferBoqPricedComponent[],
): OfferBoqLinePricingAggregates {
  return aggregateComponents(components);
}

function overallConfidence(components: OfferBoqPricedComponent[]): OfferBoqConfidence {
  if (components.length === 0) return "low";
  if (components.every((c) => c.confidence === "high")) return "high";
  if (components.some((c) => c.confidence === "low" || c.unitPricePln == null)) return "low";
  return "medium";
}

/**
 * Wycena pojedynczej linii — propozycja komponentowa.
 */
export function priceOfferBoqLine(
  line: OfferBoqLine,
  ctx: OfferBoqPricingContext = {},
): OfferBoqLine {
  const pricedAt = ctx.pricedAt ?? new Date().toISOString();
  const works = ctx.works ?? [];
  const costCatalog = ctx.costCatalog ?? defaultWgdomCostCatalog();
  const costModel = ctx.costModel ?? defaultCostModelFromPayroll();
  const providers = ctx.replaceDefaultProviders
    ? (ctx.providers ?? [])
    : [...buildDefaultPriceProviders({ works, costCatalog, costModel }), ...(ctx.providers ?? [])];

  const specs = buildComponentSpecs(line);
  const components: OfferBoqPricedComponent[] = specs.map((spec, index) => {
    const lookup = resolvePrice(
      {
        category: spec.category,
        namePl: spec.namePl,
        unit: spec.unit,
        quantity: spec.quantity,
        line,
        pricingComponentKind: spec.pricingComponentKind,
        decompositionElement: spec.decompositionElement,
      },
      providers,
    );
    const unitPricePln = lookup.unitPricePln;
    const totalPln =
      unitPricePln != null && spec.quantity > 0 ? roundPln(unitPricePln * spec.quantity) : null;
    const requiresUserReview =
      lookup.confidence === "low" ||
      unitPricePln == null ||
      lookup.origin.kind === "heuristic_estimate" ||
      lookup.origin.kind === "unknown";

    return {
      componentId: `pc_${line.lineId}_${index}_${spec.category}`,
      namePl: spec.namePl,
      category: spec.category,
      quantity: spec.quantity,
      unit: spec.unit,
      unitPricePln,
      totalPln,
      priceOrigin: lookup.origin,
      confidence: lookup.confidence,
      aiRationale: lookup.rationale,
      requiresUserReview,
      fromDecompositionElementId: spec.fromDecompositionElementId,
      pricingComponentKind: spec.pricingComponentKind,
    };
  });

  const aggregates = aggregateComponents(components);
  const confidence = overallConfidence(components);
  const pricedCount = components.filter((c) => c.totalPln != null).length;
  const reviewCount = components.filter((c) => c.requiresUserReview).length;

  const linePricing: OfferBoqLinePricing = {
    components,
    aggregates,
    pricedAt,
    confidence,
    aiRationale:
      `Propozycja wyceny: ${components.length} komponentów` +
      ` (${pricedCount} z ceną, ${reviewCount} do weryfikacji).` +
      (line.costIntelligence
        ? ` Strategia: ${line.costIntelligence.pricingStrategyLabelPl}.`
        : " Brak Cost Intelligence — komponenty domyślne M+R.") +
      " To nie jest cena ofertowa — tylko koszt bezpośredni pozycji.",
    componentCount: components.length,
    pricedComponentCount: pricedCount,
  };

  const materialComps = components.filter((c) => c.category === "material" && c.unitPricePln != null);
  const laborComps = components.filter((c) => c.category === "labor" && c.unitPricePln != null);
  const equipComps = components.filter((c) => c.category === "equipment" && c.unitPricePln != null);

  return {
    ...line,
    linePricing,
    materialUnitPln: materialComps[0]?.unitPricePln ?? null,
    materialCostPln: aggregates.materialsPln,
    materialSource:
      materialComps[0]
        ? {
            kind:
              materialComps[0].priceOrigin.kind === "work_catalog"
                ? "work_catalog"
                : materialComps[0].priceOrigin.kind === "company_model"
                  ? "company_model"
                  : "unknown",
            refId: materialComps[0].priceOrigin.refId,
            labelPl: materialComps[0].priceOrigin.labelPl,
          }
        : { ...UNKNOWN_PRICE_SOURCE },
    laborCostPln: aggregates.laborPln,
    laborRatePlnPerH: fullyLoadedHourly(costModel),
    laborSource:
      laborComps[0]
        ? {
            kind:
              laborComps[0].priceOrigin.kind === "company_model"
                ? "company_model"
                : laborComps[0].priceOrigin.kind === "work_catalog"
                  ? "work_catalog"
                  : "unknown",
            refId: laborComps[0].priceOrigin.refId,
            labelPl: laborComps[0].priceOrigin.labelPl,
          }
        : { ...UNKNOWN_PRICE_SOURCE },
    equipmentUnitPln: equipComps[0]?.unitPricePln ?? null,
    equipmentCostPln: aggregates.equipmentPln,
    equipmentSource:
      equipComps[0]
        ? {
            kind: "unknown",
            refId: equipComps[0].priceOrigin.refId,
            labelPl: equipComps[0].priceOrigin.labelPl,
          }
        : { ...UNKNOWN_PRICE_SOURCE },
    directCostPln: aggregates.lineDirectPln,
    // Zakaz S4: nie wypełniać Kp / marży
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: aggregates.lineDirectPln,
    pricingSourceLabelPl: "AI Pricing Engine — propozycja (bez marży / oferty)",
    aiConfidence: confidence,
    aiRationale: linePricing.aiRationale,
  };
}

export function computeOfferBoqPricingStats(lines: OfferBoqLine[]): OfferBoqPricingStats {
  let withPricing = 0;
  let componentCount = 0;
  let pricedComponentCount = 0;
  let unpricedComponentCount = 0;
  let reviewRequiredCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const l of lines) {
    const p = l.linePricing;
    if (!p) continue;
    withPricing += 1;
    componentCount += p.componentCount;
    pricedComponentCount += p.pricedComponentCount;
    unpricedComponentCount += p.componentCount - p.pricedComponentCount;
    reviewRequiredCount += p.components.filter((c) => c.requiresUserReview).length;
    if (p.confidence === "high") highCount += 1;
    else if (p.confidence === "medium") mediumCount += 1;
    else lowCount += 1;
  }

  return {
    lineCount: lines.length,
    withPricing,
    componentCount,
    pricedComponentCount,
    unpricedComponentCount,
    reviewRequiredCount,
    highCount,
    mediumCount,
    lowCount,
  };
}

/**
 * Nakłada AI Pricing Engine na dokument OfferBoq.
 * Nie liczy Kp, marży ani recommendedBid.
 */
export function applyOfferBoqPricing(
  doc: OfferBoqDocument,
  ctx: OfferBoqPricingContext = {},
): OfferBoqDocument {
  const pricedAt = ctx.pricedAt ?? new Date().toISOString();
  const lines = doc.lines.map((line) =>
    priceOfferBoqLine(line, { ...ctx, pricedAt }),
  );
  const pricingStats = computeOfferBoqPricingStats(lines);

  let materials = 0;
  let labor = 0;
  let equipment = 0;
  let direct = 0;
  let hasM = false;
  let hasL = false;
  let hasE = false;
  let hasD = false;
  let pricedLineCount = 0;

  for (const l of lines) {
    if (l.linePricing?.aggregates.materialsPln != null) {
      materials += l.linePricing.aggregates.materialsPln;
      hasM = true;
    }
    if (l.linePricing?.aggregates.laborPln != null) {
      labor += l.linePricing.aggregates.laborPln;
      hasL = true;
    }
    if (l.linePricing?.aggregates.equipmentPln != null) {
      equipment += l.linePricing.aggregates.equipmentPln;
      hasE = true;
    }
    // transport + auxiliary wchodzą w direct
    if (l.linePricing?.aggregates.lineDirectPln != null) {
      direct += l.linePricing.aggregates.lineDirectPln;
      hasD = true;
      pricedLineCount += 1;
    }
  }

  const totals = {
    ...emptyOfferBoqTotals(lines.length),
    materialsPln: hasM ? roundPln(materials) : null,
    laborPln: hasL ? roundPln(labor) : null,
    equipmentPln: hasE ? roundPln(equipment) : null,
    directPln: hasD ? roundPln(direct) : null,
    // Zakaz: Kp / marża / oferta
    kpPln: null,
    overheadPln: null,
    marginPln: null,
    recommendedBidPln: null,
    costPricePln: hasD ? roundPln(direct) : null,
    pricedLineCount,
  };

  const buildStatus: OfferBoqDocument["buildStatus"] =
    lines.length === 0
      ? "empty"
      : pricedLineCount > 0
        ? "partially_priced"
        : doc.buildStatus === "analyzed"
          ? "analyzed"
          : "mapped";

  return {
    ...doc,
    lines,
    totals,
    pricingStats,
    pricingAppliedAt: pricedAt,
    userEditStats: null,
    recomputeToken: computeOfferBoqRecomputeToken(lines),
    buildStatus,
    version: doc.version + 1,
  };
}

/** Etykiety kategorii komponentów (UI / raporty). */
export const OFFER_BOQ_PRICED_CATEGORY_LABELS_PL: Record<OfferBoqPricedComponentCategory, string> = {
  material: "Materiały",
  labor: "Robocizna",
  equipment: "Sprzęt",
  transport: "Transport",
  auxiliary: "Pomocnicze",
};
