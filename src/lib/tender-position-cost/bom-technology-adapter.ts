/**
 * TENDER-BOQ-PRICING-REBUILD-01 FAZA 3 — BOM / Technology → material quantities → Position Cost.
 *
 * REUSE: TechnologyPack registry · filterPackRecipeForCoats · deriveExecutionPlan · projectBom
 *        · resolveLaborInputFromOurWorkRate (F1) · resolveMaterialInputFromPriceMemory (F2)
 *
 * ZERO invent norm · ZERO HTTP · ZERO research · ZERO companyPricePln · ZERO Bid cutover
 * Engine pozostaje pure — lookup/BOM PRZED `computePositionCost`.
 */

import {
  deriveExecutionPlan,
  filterPackRecipeForCoats,
  listAllPacks,
  projectBom,
  type GeneratedBom,
  type PackMaterialRecipeLine,
  type TechnologyPack,
} from "@/lib/technology-foundation";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import { computePositionCost } from "@/lib/tender-position-cost/engine";
import {
  resolveLaborInputFromOurWorkRate,
  type OurRateLaborResolve,
} from "@/lib/tender-position-cost/our-rate-labor-adapter";
import {
  resolveMaterialInputFromPriceMemory,
  type MaterialSellResolve,
} from "@/lib/tender-position-cost/material-sell-adapter";
import type {
  PositionCostInput,
  PositionCostResult,
  PositionMaterialInput,
} from "@/lib/tender-position-cost/types";

export type BomTechnologyStatus =
  | "OK"
  | "NO_IDENTITY"
  | "MISSING_BOM"
  | "AMBIGUOUS_BOM"
  | "INVALID_COMPONENT"
  | "INVALID_POSITION_QUANTITY"
  | "EMPTY_RECIPE"
  | "UNIT_CONVERSION_GAP"
  /** OUR-RATE-BOM-COVERAGE-01 — explicit Owner LABOR_ONLY (≠ MISSING_BOM). */
  | "LABOR_ONLY";

export type BomComponentResolved = {
  materialKey: string;
  quantityPerUnit: number;
  unit: string;
  totalQuantity: number;
  namePl: string;
  factorSourceKind: string | null;
  factorSourceRef: string | null;
  factorApprovedAt: string | null;
};

export type BomTechnologyResolve = {
  status: BomTechnologyStatus;
  statusLabelPl: string;
  workId: string;
  unit: string;
  positionQuantity: number;
  packId: string | null;
  packVersion: string | null;
  packNamePl: string | null;
  provenanceRef: string | null;
  components: BomComponentResolved[];
  generatedBom: GeneratedBom | null;
  /** Specy do F2 (tylko gdy status OK). */
  materialSpecs: Array<{ materialKey: string; quantity: number; quantityUnit: string }>;
};

const STATUS_LABEL: Record<BomTechnologyStatus, string> = {
  OK: "BOM OK",
  NO_IDENTITY: "BRAK TOŻSAMOŚCI ROBOTY",
  MISSING_BOM: "BRAK BOM / BRAK DANYCH TECHNOLOGICZNYCH",
  AMBIGUOUS_BOM: "NIEJEDNOZNACZNY BOM",
  INVALID_COMPONENT: "NIEPEŁNY KOMPONENT BOM",
  INVALID_POSITION_QUANTITY: "NIEPRAWIDŁOWA ILOŚĆ POZYCJI",
  EMPTY_RECIPE: "BRAK NORMY MATERIAŁOWEJ",
  UNIT_CONVERSION_GAP: "BRAK KONWERSJI JEDNOSTEK",
  LABOR_ONLY: "LABOR ONLY — BOM NIE WYMAGANY (Owner)",
};

/**
 * Explicit LABOR_ONLY resolve — materials[] empty · no TechnologyPack required.
 * NEVER use for MISSING_BOM inference.
 */
export function resolveLaborOnlyBomForWork(opts: {
  workId: string;
  unit: string;
  positionQuantity: number;
}): BomTechnologyResolve {
  const workId = String(opts.workId ?? "").trim();
  const unit = String(opts.unit ?? "").trim();
  const qty = opts.positionQuantity;
  if (!workId) {
    return emptyBom("NO_IDENTITY", "", unit, Number.isFinite(qty) ? qty : 0);
  }
  return {
    ...emptyBom("LABOR_ONLY", workId, unit, Number.isFinite(qty) ? qty : 0),
    statusLabelPl: STATUS_LABEL.LABOR_ONLY,
  };
}

function foldUnit(u: string): string {
  return String(u || "")
    .trim()
    .toLowerCase()
    .replace(/²/g, "2")
    .replace(/m\^?2\b/g, "m2")
    .replace(/\s+/g, "");
}

function unitsCompatible(a: string, b: string): boolean {
  const fa = foldUnit(a);
  const fb = foldUnit(b);
  if (!fa || !fb) return false;
  return fa === fb;
}

/** Exact workId ↔ TechnologyPack.steps.catalogWorkId (C-BOM-1 · bez heurystyki tekstowej). */
export function findActiveTechnologyPacksForWorkId(
  workId: string,
  packs?: readonly TechnologyPack[],
): TechnologyPack[] {
  const id = String(workId ?? "").trim();
  if (!id) return [];
  const all = packs ?? listAllPacks();
  return all
    .filter((p) => p.lifecycle === "ACTIVE")
    .filter((p) => p.steps.some((s) => s.catalogWorkId === id))
    .sort((a, b) =>
      `${a.packId}@${a.packVersion}`.localeCompare(`${b.packId}@${b.packVersion}`),
    );
}

function validateRecipeLine(line: PackMaterialRecipeLine): string | null {
  if (!String(line.materialKey ?? "").trim()) return "brak materialKey";
  if (!String(line.unit ?? "").trim()) return "brak unit";
  if (line.qtyFactor == null || !Number.isFinite(line.qtyFactor)) return "brak quantityPerUnit";
  if (line.qtyFactor < 0) return "quantityPerUnit < 0";
  return null;
}

function emptyBom(
  status: BomTechnologyStatus,
  workId: string,
  unit: string,
  positionQuantity: number,
): BomTechnologyResolve {
  return {
    status,
    statusLabelPl: STATUS_LABEL[status],
    workId,
    unit,
    positionQuantity,
    packId: null,
    packVersion: null,
    packNamePl: null,
    provenanceRef: null,
    components: [],
    generatedBom: null,
    materialSpecs: [],
  };
}

/**
 * workId + unit + quantity → BOM components (quantityPerUnit × positionQuantity).
 * Nie inventuje materiałów ani norm. Nie HTTP.
 */
export function resolveTechnologyBomForWork(opts: {
  workId: string;
  unit: string;
  positionQuantity: number;
  /** Wymagane dla packów z coats (np. malowanie) — bez invent default. */
  paintCoats?: 1 | 2 | null;
  packs?: readonly TechnologyPack[];
  /**
   * C-BOM-4: gdy ustawione i różni się od unit materiału w BOM
   * bez reguły konwersji → UNIT_CONVERSION_GAP.
   */
  targetMaterialUnit?: string | null;
}): BomTechnologyResolve {
  const workId = String(opts.workId ?? "").trim();
  const unit = String(opts.unit ?? "").trim();
  const qty = opts.positionQuantity;

  if (!workId) {
    return emptyBom("NO_IDENTITY", "", unit, Number.isFinite(qty) ? qty : 0);
  }

  if (!Number.isFinite(qty) || qty < 0) {
    return emptyBom("INVALID_POSITION_QUANTITY", workId, unit, Number.isFinite(qty) ? qty : NaN);
  }

  const matches = findActiveTechnologyPacksForWorkId(workId, opts.packs);
  if (matches.length === 0) {
    return emptyBom("MISSING_BOM", workId, unit, qty);
  }
  if (matches.length > 1) {
    return emptyBom("AMBIGUOUS_BOM", workId, unit, qty);
  }

  const rawPack = matches[0]!;
  const pack = filterPackRecipeForCoats(rawPack, opts.paintCoats ?? null);

  if (pack.materials.length === 0) {
    return {
      ...emptyBom("EMPTY_RECIPE", workId, unit, qty),
      packId: rawPack.packId,
      packVersion: rawPack.packVersion,
      packNamePl: rawPack.namePl,
    };
  }

  for (const line of pack.materials) {
    const err = validateRecipeLine(line);
    if (err) {
      return {
        ...emptyBom("INVALID_COMPONENT", workId, unit, qty),
        packId: pack.packId,
        packVersion: pack.packVersion,
        packNamePl: pack.namePl,
      };
    }
  }

  const targetUnit = opts.targetMaterialUnit?.trim() || null;
  if (targetUnit) {
    for (const line of pack.materials) {
      if (!unitsCompatible(line.unit, targetUnit)) {
        return {
          ...emptyBom("UNIT_CONVERSION_GAP", workId, unit, qty),
          packId: pack.packId,
          packVersion: pack.packVersion,
          packNamePl: pack.namePl,
        };
      }
    }
  }

  const ctx = {
    lines: [
      {
        lineKey: `f3:${workId}`,
        quantity: qty,
        unit,
        catalogWorkIdHint: workId,
      },
    ],
  };
  const plan = deriveExecutionPlan(pack, ctx);
  const generatedBom = projectBom(pack, plan, ctx);

  const components: BomComponentResolved[] = [];
  const materialSpecs: BomTechnologyResolve["materialSpecs"] = [];

  // Map by materialKey+unit from recipe (qtyFactor) + projected totals — C-BOM-3
  for (const line of pack.materials) {
    const projected = generatedBom.materials.find(
      (m) => m.materialKey === line.materialKey && m.unit === line.unit,
    );
    const totalQuantity =
      projected != null
        ? projected.quantity
        : Number((qty * line.qtyFactor).toFixed(6));

    components.push({
      materialKey: line.materialKey,
      quantityPerUnit: line.qtyFactor,
      unit: line.unit,
      totalQuantity,
      namePl: line.namePl,
      factorSourceKind: line.factorSourceKind ?? null,
      factorSourceRef: line.factorSourceRef ?? null,
      factorApprovedAt: line.factorApprovedAt ?? null,
    });
    materialSpecs.push({
      materialKey: line.materialKey,
      quantity: totalQuantity,
      quantityUnit: line.unit,
    });
  }

  const provenanceRef =
    components.map((c) => c.factorSourceRef).find((r) => r && r.trim()) ??
    `TechnologyPack=${pack.packId}@${pack.packVersion}`;

  return {
    status: "OK",
    statusLabelPl: STATUS_LABEL.OK,
    workId,
    unit,
    positionQuantity: qty,
    packId: pack.packId,
    packVersion: pack.packVersion,
    packNamePl: pack.namePl,
    provenanceRef,
    components,
    generatedBom,
    materialSpecs,
  };
}

function noBomMaterialPlaceholder(): PositionMaterialInput {
  return {
    materialKey: null,
    status: "NO_BOM",
    quantity: null,
    quantityUnit: null,
    sellPricePln: null,
  };
}

export type ComputePositionCostWithBomInput = {
  store: WorkCatalogStore;
  workId: string;
  unit: WgdomCostUnit;
  quantity: number;
  nowMs: number;
  paintCoats?: 1 | 2 | null;
  packs?: readonly TechnologyPack[];
  targetMaterialUnit?: string | null;
  /** false = nie wymagaj labor (material-only z BOM). Default true. */
  includeLabor?: boolean;
};

export type ComputePositionCostWithBomResult = {
  bom: BomTechnologyResolve;
  ourRate: OurRateLaborResolve | null;
  materialsResolved: MaterialSellResolve[];
  position: PositionCostResult;
  engineInput: PositionCostInput;
};

/**
 * F3 orkiestracja: BOM → F2 SELL (+ opcjonalnie F1 OUR RATE) → pure engine.
 */
export function computePositionCostWithBomTechnology(
  input: ComputePositionCostWithBomInput,
): ComputePositionCostWithBomResult {
  const includeLabor = input.includeLabor !== false;

  const bom = resolveTechnologyBomForWork({
    workId: input.workId,
    unit: input.unit,
    positionQuantity: input.quantity,
    paintCoats: input.paintCoats,
    packs: input.packs,
    targetMaterialUnit: input.targetMaterialUnit,
  });

  const ourRate = includeLabor
    ? resolveLaborInputFromOurWorkRate(
        input.store,
        input.workId,
        input.unit,
        input.nowMs,
      )
    : null;

  let materialsResolved: MaterialSellResolve[] = [];
  let materials: PositionMaterialInput[];

  if (bom.status === "OK") {
    materialsResolved = bom.materialSpecs.map((spec) =>
      resolveMaterialInputFromPriceMemory(input.store, spec, input.nowMs),
    );
    materials = materialsResolved.map((m) => m.material);
  } else if (
    bom.status === "MISSING_BOM" ||
    bom.status === "AMBIGUOUS_BOM" ||
    bom.status === "EMPTY_RECIPE" ||
    bom.status === "INVALID_COMPONENT" ||
    bom.status === "UNIT_CONVERSION_GAP" ||
    bom.status === "NO_IDENTITY" ||
    bom.status === "INVALID_POSITION_QUANTITY"
  ) {
    materials = [noBomMaterialPlaceholder()];
  } else {
    materials = [noBomMaterialPlaceholder()];
  }

  const engineInput: PositionCostInput = {
    quantity: input.quantity,
    unit: input.unit,
    labor: includeLabor && ourRate ? ourRate.labor : null,
    materials,
  };

  const position = computePositionCost(engineInput);
  return { bom, ourRate, materialsResolved, position, engineInput };
}
