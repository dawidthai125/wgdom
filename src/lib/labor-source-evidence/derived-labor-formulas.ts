/**
 * OFN-01 — Closed Derived Labor Formula Registry.
 * ZERO eval() · ZERO new Function() · ZERO agent-executable expressions.
 * formulaExpression is audit/display metadata only.
 */

export const DERIVED_LABOR_CALCULATOR_VERSION = "derived-labor-v1" as const;

/** Owner GO formula id — LABOR_NORM_X_RATE (versioned). */
export const FORMULA_LABOR_NORM_X_RATE = "LABOR_NORM_X_RATE" as const;
export const FORMULA_LABOR_NORM_X_RATE_VERSION = "v1" as const;

export type DerivedLaborFormulaId = typeof FORMULA_LABOR_NORM_X_RATE;

export type DerivedLaborFormulaDefinition = {
  formulaId: DerivedLaborFormulaId;
  formulaVersion: string;
  /** Audit/display only — NEVER executed. */
  formulaExpression: string;
  calculatorVersion: typeof DERIVED_LABOR_CALCULATOR_VERSION;
  requiredRoles: readonly ["labor_norm", "labor_cost_rate"];
};

export const DERIVED_LABOR_FORMULA_REGISTRY: Readonly<
  Record<DerivedLaborFormulaId, DerivedLaborFormulaDefinition>
> = Object.freeze({
  [FORMULA_LABOR_NORM_X_RATE]: Object.freeze({
    formulaId: FORMULA_LABOR_NORM_X_RATE,
    formulaVersion: FORMULA_LABOR_NORM_X_RATE_VERSION,
    formulaExpression: "normRgPerUnit * costRatePlnPerRg → PLN/unit",
    calculatorVersion: DERIVED_LABOR_CALCULATOR_VERSION,
    requiredRoles: Object.freeze(["labor_norm", "labor_cost_rate"] as const),
  }),
});

export function resolveDerivedLaborFormula(
  formulaId: string,
  formulaVersion?: string | null,
): DerivedLaborFormulaDefinition | null {
  const id = String(formulaId || "").trim();
  if (id !== FORMULA_LABOR_NORM_X_RATE) return null;
  const def = DERIVED_LABOR_FORMULA_REGISTRY[FORMULA_LABOR_NORM_X_RATE];
  if (formulaVersion != null && String(formulaVersion).trim()) {
    if (String(formulaVersion).trim() !== def.formulaVersion) return null;
  }
  return def;
}

export function isRegisteredDerivedLaborFormulaId(formulaId: string): boolean {
  return resolveDerivedLaborFormula(formulaId) != null;
}

/**
 * Normalize unit tokens for algebra (r-g family + catalog unit).
 * No silent conversion between incompatible units.
 */
export function normalizeDerivedLaborUnitToken(raw: string): string {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, "")
    .replace(/²/g, "2")
    .replace(/³/g, "3")
    .replace(/zł/g, "pln")
    .replace(/rob-?g/g, "r-g")
    .replace(/r\.g/g, "r-g")
    .replace(/rg\//g, "r-g/")
    .replace(/^rg$/, "r-g");
  if (s === "r-g/m2" || s === "rg/m2" || s === "r-g/m²") return "r-g/m2";
  if (s === "pln/r-g" || s === "pln/rg" || s === "zl/r-g") return "PLN/r-g";
  if (s === "m2" || s === "m²") return "m2";
  if (s === "m3" || s === "m³") return "m3";
  if (s === "szt" || s === "sztuka") return "szt";
  if (s === "mb") return "mb";
  if (s === "kpl") return "kpl";
  if (s === "pomiar") return "pomiar";
  if (s === "prob" || s === "prob.") return "prob";
  if (s === "r-g" || s === "rg") return "r-g";
  return s;
}

export type LaborNormXRateEvalInput = {
  normRgPerUnit: number;
  normUnit: string;
  costRatePlnPerRg: number;
  costRateUnit: string;
  /** Catalog result unit expected (e.g. m2). */
  resultUnit: string;
};

export type LaborNormXRateEvalResult =
  | {
      ok: true;
      resultPln: number;
      resultUnit: string;
      formulaId: typeof FORMULA_LABOR_NORM_X_RATE;
      formulaVersion: typeof FORMULA_LABOR_NORM_X_RATE_VERSION;
    }
  | { ok: false; reason: string; messagePl: string };

/**
 * Deterministic closed eval: r-g/unit × PLN/r-g = PLN/unit.
 * No arbitrary expressions.
 */
export function evalLaborNormXRate(input: LaborNormXRateEvalInput): LaborNormXRateEvalResult {
  const norm = Number(input.normRgPerUnit);
  const rate = Number(input.costRatePlnPerRg);
  if (!Number.isFinite(norm) || !(norm > 0)) {
    return { ok: false, reason: "INVALID_NORM", messagePl: "labor_norm value must be finite > 0." };
  }
  if (!Number.isFinite(rate) || !(rate > 0)) {
    return {
      ok: false,
      reason: "INVALID_RATE",
      messagePl: "labor_cost_rate value must be finite > 0.",
    };
  }

  const normU = normalizeDerivedLaborUnitToken(input.normUnit);
  const rateU = normalizeDerivedLaborUnitToken(input.costRateUnit);
  const resultU = normalizeDerivedLaborUnitToken(input.resultUnit);

  // Expect r-g/<catalogUnit> × PLN/r-g → PLN/<catalogUnit>
  const normMatch = /^r-g\/(.+)$/.exec(normU);
  if (!normMatch) {
    return {
      ok: false,
      reason: "UNIT_HOLD",
      messagePl: `labor_norm unit „${input.normUnit}” not r-g/<catalogUnit> — HOLD.`,
    };
  }
  if (rateU !== "PLN/r-g") {
    return {
      ok: false,
      reason: "UNIT_HOLD",
      messagePl: `labor_cost_rate unit „${input.costRateUnit}” must be PLN/r-g — HOLD.`,
    };
  }
  const catalogFromNorm = normMatch[1]!;
  if (catalogFromNorm !== resultU) {
    return {
      ok: false,
      reason: "UNIT_HOLD",
      messagePl: `Norm unit r-g/${catalogFromNorm} incompatible with result unit ${resultU} — HOLD.`,
    };
  }

  const resultPln = Math.round(norm * rate * 100) / 100;
  if (!(resultPln > 0)) {
    return { ok: false, reason: "INVALID_RESULT", messagePl: "Derived result must be > 0." };
  }

  return {
    ok: true,
    resultPln,
    resultUnit: resultU,
    formulaId: FORMULA_LABOR_NORM_X_RATE,
    formulaVersion: FORMULA_LABOR_NORM_X_RATE_VERSION,
  };
}

/**
 * Dispatch by formulaId — closed set only.
 */
export function evalDerivedLaborFormula(input: {
  formulaId: string;
  formulaVersion?: string | null;
  normRgPerUnit: number;
  normUnit: string;
  costRatePlnPerRg: number;
  costRateUnit: string;
  resultUnit: string;
}): LaborNormXRateEvalResult {
  const def = resolveDerivedLaborFormula(input.formulaId, input.formulaVersion);
  if (!def) {
    return {
      ok: false,
      reason: "UNKNOWN_FORMULA",
      messagePl: `formulaId „${input.formulaId}” not in closed registry — HOLD.`,
    };
  }
  if (def.formulaId === FORMULA_LABOR_NORM_X_RATE) {
    return evalLaborNormXRate({
      normRgPerUnit: input.normRgPerUnit,
      normUnit: input.normUnit,
      costRatePlnPerRg: input.costRatePlnPerRg,
      costRateUnit: input.costRateUnit,
      resultUnit: input.resultUnit,
    });
  }
  return {
    ok: false,
    reason: "UNKNOWN_FORMULA",
    messagePl: `formulaId „${input.formulaId}” not executable — HOLD.`,
  };
}
