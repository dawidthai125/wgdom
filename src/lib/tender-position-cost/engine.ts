/**
 * TENDER-BOQ-PRICING-REBUILD-01 FAZA 0 — Pure Position Cost Engine.
 *
 * PURE · DETERMINISTIC · ZERO HTTP · ZERO storage · ZERO side effects.
 * Nie podłącza Bid/Offer · katalogów cen · stawek robót · legacy mixed price.
 *
 * Rounding: semantyka jak `roundWorkCatalogPln` (2 dp) — lokalna kopia helpera,
 * bez importu `cost-split` (moduł legacy mixed price). Per component, then total.
 * STALE (C-STALE-1): domyślnie NIE wliczany — tylko issue.
 */

import type {
  PositionCostInput,
  PositionCostIssue,
  PositionCostResult,
  PositionLaborInput,
  PositionMaterialInput,
} from "@/lib/tender-position-cost/types";

/** Semantyka jak roundWorkCatalogPln — 2 miejsca po przecinku. */
function roundPositionCostPln(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function pushIssue(issues: PositionCostIssue[], issue: PositionCostIssue): void {
  issues.push(issue);
}

/**
 * Labor: CURRENT + finite ourRatePln ≥ 0 → quantity × rate.
 * STALE → issue, not computable (C-STALE-1 default).
 */
function computeLaborCost(
  lineQuantity: number,
  labor: PositionLaborInput,
  issues: PositionCostIssue[],
): { cost: number | null; computable: boolean } {
  if (labor.status === "NO_IDENTITY") {
    pushIssue(issues, {
      code: "BRAK_IDENTITY_ROBOTY",
      messagePl: "Brak tożsamości roboty (workId) — nie można policzyć robocizny.",
    });
    return { cost: null, computable: false };
  }

  if (labor.status === "MISSING") {
    pushIssue(issues, {
      code: "BRAK_OUR_RATE",
      messagePl: "Brak OUR RATE — nie można policzyć robocizny.",
    });
    return { cost: null, computable: false };
  }

  if (labor.status === "STALE") {
    pushIssue(issues, {
      code: "STALE_OUR_RATE",
      messagePl:
        "OUR RATE przeterminowana — Faza 0 nie wlicza STALE do kosztu (C-STALE-1: domyślnie blokada).",
    });
    return { cost: null, computable: false };
  }

  if (labor.ourRatePln == null) {
    pushIssue(issues, {
      code: "BRAK_OUR_RATE",
      messagePl: "Status CURRENT, ale brak wartości OUR RATE.",
    });
    return { cost: null, computable: false };
  }

  if (!isFiniteNumber(labor.ourRatePln)) {
    pushIssue(issues, {
      code: "INVALID_LABOR_RATE",
      messagePl: "OUR RATE nie jest prawidłową liczbą.",
    });
    return { cost: null, computable: false };
  }

  if (labor.ourRatePln < 0) {
    pushIssue(issues, {
      code: "INVALID_LABOR_RATE",
      messagePl: "OUR RATE nie może być ujemna.",
    });
    return { cost: null, computable: false };
  }

  return {
    cost: roundPositionCostPln(lineQuantity * labor.ourRatePln),
    computable: true,
  };
}

function computeMaterialLineCost(
  mat: PositionMaterialInput,
  index: number,
  issues: PositionCostIssue[],
): { cost: number | null; computable: boolean } {
  if (mat.status === "NO_KEY") {
    pushIssue(issues, {
      code: "BRAK_MATERIAL_KEY",
      messagePl: "Brak materialKey — nie można policzyć materiału.",
      materialIndex: index,
    });
    return { cost: null, computable: false };
  }

  if (mat.status === "NO_BOM") {
    pushIssue(issues, {
      code: "BRAK_BOM",
      messagePl: "Brak BOM / Technology — nie wolno inventować ilości materiałów.",
      materialIndex: index,
    });
    return { cost: null, computable: false };
  }

  if (mat.status === "NO_NORM") {
    pushIssue(issues, {
      code: "BRAK_NORMY_MATERIALU",
      messagePl: "Brak normy ilości materiału — nie wolno inventować.",
      materialIndex: index,
    });
    return { cost: null, computable: false };
  }

  if (mat.status === "MISSING") {
    pushIssue(issues, {
      code: "BRAK_CENY_MATERIALU",
      messagePl: "Brak ceny sprzedaży materiału (SELL).",
      materialIndex: index,
    });
    return { cost: null, computable: false };
  }

  if (mat.status === "STALE") {
    pushIssue(issues, {
      code: "STALE_MATERIAL_PRICE",
      messagePl:
        "Cena materiału przeterminowana — Faza 0 nie wlicza STALE do kosztu (C-STALE-1: domyślnie blokada).",
      materialIndex: index,
    });
    return { cost: null, computable: false };
  }

  if (mat.quantity == null) {
    pushIssue(issues, {
      code: "BRAK_NORMY_MATERIALU",
      messagePl: "Brak ilości materiału.",
      materialIndex: index,
    });
    return { cost: null, computable: false };
  }

  if (!isFiniteNumber(mat.quantity)) {
    pushIssue(issues, {
      code: "INVALID_MATERIAL_QUANTITY",
      messagePl: "Ilość materiału nie jest prawidłową liczbą.",
      materialIndex: index,
    });
    return { cost: null, computable: false };
  }

  if (mat.quantity < 0) {
    pushIssue(issues, {
      code: "INVALID_MATERIAL_QUANTITY",
      messagePl: "Ilość materiału nie może być ujemna.",
      materialIndex: index,
    });
    return { cost: null, computable: false };
  }

  if (mat.sellPricePln == null) {
    pushIssue(issues, {
      code: "BRAK_CENY_MATERIALU",
      messagePl: "Status CURRENT, ale brak SELL PRICE.",
      materialIndex: index,
    });
    return { cost: null, computable: false };
  }

  if (!isFiniteNumber(mat.sellPricePln)) {
    pushIssue(issues, {
      code: "INVALID_MATERIAL_PRICE",
      messagePl: "SELL PRICE nie jest prawidłową liczbą.",
      materialIndex: index,
    });
    return { cost: null, computable: false };
  }

  if (mat.sellPricePln < 0) {
    pushIssue(issues, {
      code: "INVALID_MATERIAL_PRICE",
      messagePl: "SELL PRICE nie może być ujemna.",
      materialIndex: index,
    });
    return { cost: null, computable: false };
  }

  return {
    cost: roundPositionCostPln(mat.quantity * mat.sellPricePln),
    computable: true,
  };
}

/**
 * Pure Position Cost Engine — jedyny publiczny entry Fazy 0.
 *
 * - `labor === null` → material-only (laborCost = 0)
 * - `materials.length === 0` → labor-only (materialCost = 0)
 * - STALE nie wliczany (C-STALE-1 default)
 */
export function computePositionCost(input: PositionCostInput): PositionCostResult {
  const issues: PositionCostIssue[] = [];

  if (!isFiniteNumber(input.quantity)) {
    pushIssue(issues, {
      code: "INVALID_QUANTITY",
      messagePl: "Ilość pozycji nie jest prawidłową liczbą.",
    });
    return emptyFail(issues);
  }

  if (input.quantity < 0) {
    pushIssue(issues, {
      code: "INVALID_QUANTITY",
      messagePl: "Ilość pozycji nie może być ujemna.",
    });
    return emptyFail(issues);
  }

  const materials = Array.isArray(input.materials) ? input.materials : [];
  const laborOmitted = input.labor === null;
  const materialsEmpty = materials.length === 0;

  let laborCostPln: number | null;
  let laborComputable: boolean;

  if (laborOmitted) {
    laborCostPln = 0;
    laborComputable = true;
  } else {
    const laborResult = computeLaborCost(input.quantity, input.labor, issues);
    laborCostPln = laborResult.computable ? laborResult.cost : null;
    laborComputable = laborResult.computable;
  }

  let materialCostPln: number | null;
  let materialsComputable: boolean;

  if (materialsEmpty) {
    materialCostPln = 0;
    materialsComputable = true;
  } else {
    let sum = 0;
    let allOk = true;
    let anyOk = false;
    for (let i = 0; i < materials.length; i++) {
      const line = computeMaterialLineCost(materials[i]!, i, issues);
      if (line.computable && line.cost != null) {
        sum = roundPositionCostPln(sum + line.cost);
        anyOk = true;
      } else {
        allOk = false;
      }
    }
    materialsComputable = allOk;
    materialCostPln = allOk ? sum : anyOk ? sum : null;
  }

  const positionComplete = laborComputable && materialsComputable;
  const totalPositionCostPln =
    positionComplete && laborCostPln != null && materialCostPln != null
      ? roundPositionCostPln(laborCostPln + materialCostPln)
      : null;

  return {
    laborCostPln,
    materialCostPln,
    totalPositionCostPln,
    laborComputable,
    materialsComputable,
    positionComplete,
    issues,
  };
}

function emptyFail(issues: PositionCostIssue[]): PositionCostResult {
  return {
    laborCostPln: null,
    materialCostPln: null,
    totalPositionCostPln: null,
    laborComputable: false,
    materialsComputable: false,
    positionComplete: false,
    issues,
  };
}
