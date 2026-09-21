/**
 * OFN-01 — Derived Labor Evidence validation (pure · fail-closed).
 * Identity · unit · formula · freshness · provenance completeness.
 * ZERO invent · ZERO silent winner · ZERO OUR RATE write.
 */

import {
  DERIVED_LABOR_CALCULATOR_VERSION,
  evalDerivedLaborFormula,
  resolveDerivedLaborFormula,
} from "@/lib/labor-source-evidence/derived-labor-formulas";
import { ESTIMATOR_OWNER_CLASSIFICATION_MAP } from "@/lib/intelligent-estimator/owner-classification-map";
import type {
  DerivedLaborEvidenceInput,
  LaborSourceEvidenceDerivation,
  LaborSourceEvidenceObservation,
} from "@/lib/labor-source-evidence/types";

/** Max span between input observedAt timestamps before HOLD (ms). Owner policy v1. */
export const DERIVED_LABOR_FRESHNESS_MAX_SPAN_MS = 24 * 30 * 24 * 60 * 60 * 1000; // ~24 months

export type DerivedLaborValidateRejectReason =
  | "MISSING_WORK_ID"
  | "IDENTITY_AMBIGUOUS"
  | "IDENTITY_COMPOUND"
  | "MISSING_DERIVATION"
  | "UNKNOWN_FORMULA"
  | "FORMULA_VERSION_MISMATCH"
  | "MISSING_INPUT"
  | "MISSING_INPUT_PROVENANCE"
  | "INVALID_INPUT_VALUE"
  | "UNIT_HOLD"
  | "RESULT_MISMATCH"
  | "FRESHNESS_HOLD"
  | "CALCULATOR_VERSION_MISMATCH";

export type DerivedLaborValidateResult =
  | { ok: true; resultPln: number; resultUnit: string }
  | {
      ok: false;
      reason: DerivedLaborValidateRejectReason;
      messagePl: string;
    };

/**
 * Exact leaf eligible for derived Evidence.
 * Compound (Owner classification COMPOUND) → HOLD.
 */
export function isDerivedLaborEvidenceIdentityEligible(workId: string | null | undefined): {
  ok: boolean;
  reason?: DerivedLaborValidateRejectReason;
  messagePl?: string;
} {
  const id = String(workId || "").trim();
  if (!id) {
    return { ok: false, reason: "MISSING_WORK_ID", messagePl: "Derived Evidence requires workId." };
  }
  const plane = ESTIMATOR_OWNER_CLASSIFICATION_MAP[id];
  if (plane === "COMPOUND") {
    return {
      ok: false,
      reason: "IDENTITY_COMPOUND",
      messagePl: `workId „${id}” is COMPOUND — derived Evidence attaches to exact leaf only — HOLD.`,
    };
  }
  // Canonical KNR leaf pattern preferred; unknown legacy without COMPOUND still fail-closed for derived
  // unless it is a cw.* exact leaf (ACLC / knr leaf).
  if (id.startsWith("legacy-") || id.startsWith("cc-w2-") || id.startsWith("cc-p0c-")) {
    if (plane !== "LABOR" && plane !== "MATERIAL") {
      // UNKNOWN / missing on ambiguous parents
      if (plane === "COMPOUND" || plane === "UNKNOWN" || plane == null) {
        return {
          ok: false,
          reason: "IDENTITY_AMBIGUOUS",
          messagePl: `workId „${id}” is not an exact leaf for derived Evidence — HOLD.`,
        };
      }
    }
    // Even LABOR legacy seeds are not exact KNR leaves for OFN-01 derived attach
    return {
      ok: false,
      reason: "IDENTITY_AMBIGUOUS",
      messagePl: `workId „${id}” is legacy/seed — derived Evidence requires exact cw.* leaf — HOLD.`,
    };
  }
  if (!id.startsWith("cw.")) {
    return {
      ok: false,
      reason: "IDENTITY_AMBIGUOUS",
      messagePl: `workId „${id}” is not an exact cw.* leaf — HOLD.`,
    };
  }
  return { ok: true };
}

function asIsoOk(v: string | null | undefined): boolean {
  if (typeof v !== "string" || !v.trim()) return false;
  return !Number.isNaN(Date.parse(v));
}

function findInput(
  inputs: readonly DerivedLaborEvidenceInput[],
  role: DerivedLaborEvidenceInput["role"],
): DerivedLaborEvidenceInput | null {
  return inputs.find((i) => i.role === role) ?? null;
}

/**
 * Freshness policy v1 (OFN-01 ARCH REVIEW AR-09):
 *  - each input requires observedAt
 *  - derivation requires calculatedAt
 *  - no newest-wins
 *  - if rate has periodLabel and norm lacks observedAt → already caught by provenance
 *  - if input observedAt span > 24 months → HOLD
 *  - if rate periodLabel present and norm observedAt differs by > 24 months from calculatedAt → HOLD
 */
export function validateDerivedLaborFreshness(input: {
  derivation: LaborSourceEvidenceDerivation;
}): DerivedLaborValidateResult | { ok: true } {
  const { derivation } = input;
  if (!asIsoOk(derivation.calculatedAt)) {
    return {
      ok: false,
      reason: "FRESHNESS_HOLD",
      messagePl: "derived.calculatedAt missing/invalid — HOLD.",
    };
  }
  const times: number[] = [];
  for (const inp of derivation.inputs) {
    if (!asIsoOk(inp.observedAt)) {
      return {
        ok: false,
        reason: "FRESHNESS_HOLD",
        messagePl: `input ${inp.inputId} observedAt missing/invalid — HOLD.`,
      };
    }
    times.push(Date.parse(inp.observedAt));
  }
  if (times.length >= 2) {
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    if (maxT - minT > DERIVED_LABOR_FRESHNESS_MAX_SPAN_MS) {
      return {
        ok: false,
        reason: "FRESHNESS_HOLD",
        messagePl:
          "Derived input observedAt span exceeds 24 months — mixed-period HOLD / OWNER EXCEPTION.",
      };
    }
  }
  const calcT = Date.parse(derivation.calculatedAt);
  const rate = findInput(derivation.inputs, "labor_cost_rate");
  const norm = findInput(derivation.inputs, "labor_norm");
  if (rate?.periodLabel && norm && asIsoOk(norm.observedAt)) {
    const normT = Date.parse(norm.observedAt);
    if (Math.abs(calcT - normT) > DERIVED_LABOR_FRESHNESS_MAX_SPAN_MS) {
      return {
        ok: false,
        reason: "FRESHNESS_HOLD",
        messagePl:
          "labor_cost_rate periodLabel present but norm observedAt far from calculatedAt — HOLD.",
      };
    }
  }
  return { ok: true };
}

/**
 * Full derived observation validation (pre-upsert / builder).
 */
export function validateDerivedLaborEvidence(input: {
  workId: string | null;
  unit: string;
  pricePoint: number | null;
  priceKind: string;
  derivation: LaborSourceEvidenceDerivation | null | undefined;
}): DerivedLaborValidateResult {
  if (input.priceKind !== "derived") {
    return {
      ok: false,
      reason: "MISSING_DERIVATION",
      messagePl: "validateDerivedLaborEvidence requires priceKind=derived.",
    };
  }
  const idCheck = isDerivedLaborEvidenceIdentityEligible(input.workId);
  if (!idCheck.ok) {
    return {
      ok: false,
      reason: idCheck.reason!,
      messagePl: idCheck.messagePl!,
    };
  }
  const der = input.derivation;
  if (!der || !Array.isArray(der.inputs) || der.inputs.length === 0) {
    return {
      ok: false,
      reason: "MISSING_DERIVATION",
      messagePl: "priceKind=derived requires derivation.inputs[] — HOLD.",
    };
  }

  const formulaDef = resolveDerivedLaborFormula(der.formulaId, der.formulaVersion);
  if (!formulaDef) {
    // Distinguish unknown id vs version mismatch
    const byId = resolveDerivedLaborFormula(der.formulaId, null);
    if (byId && der.formulaVersion && der.formulaVersion !== byId.formulaVersion) {
      return {
        ok: false,
        reason: "FORMULA_VERSION_MISMATCH",
        messagePl: `formulaVersion „${der.formulaVersion}” ≠ registry ${byId.formulaVersion} — HOLD.`,
      };
    }
    return {
      ok: false,
      reason: "UNKNOWN_FORMULA",
      messagePl: `Unknown formulaId „${der.formulaId}” — HOLD.`,
    };
  }

  if (
    der.calculatorVersion
    && der.calculatorVersion !== DERIVED_LABOR_CALCULATOR_VERSION
    && der.calculatorVersion !== formulaDef.calculatorVersion
  ) {
    return {
      ok: false,
      reason: "CALCULATOR_VERSION_MISMATCH",
      messagePl: `calculatorVersion „${der.calculatorVersion}” mismatch — HOLD.`,
    };
  }

  for (const inp of der.inputs) {
    if (
      !inp
      || !String(inp.inputId || "").trim()
      || !String(inp.sourceId || "").trim()
      || !String(inp.sourceUrl || "").trim()
      || !String(inp.host || "").trim()
      || !asIsoOk(inp.observedAt)
      || !asIsoOk(inp.retrievedAt)
      || !String(inp.inputUnit || "").trim()
    ) {
      return {
        ok: false,
        reason: "MISSING_INPUT_PROVENANCE",
        messagePl: "Each derived input requires full provenance — HOLD.",
      };
    }
    if (!Number.isFinite(inp.inputValue) || !(inp.inputValue > 0)) {
      return {
        ok: false,
        reason: "INVALID_INPUT_VALUE",
        messagePl: `input ${inp.inputId} value must be finite > 0 — HOLD.`,
      };
    }
  }

  const norm = findInput(der.inputs, "labor_norm");
  const rate = findInput(der.inputs, "labor_cost_rate");
  if (!norm || !rate) {
    return {
      ok: false,
      reason: "MISSING_INPUT",
      messagePl: "LABOR_NORM_X_RATE requires labor_norm + labor_cost_rate inputs — HOLD.",
    };
  }

  // Identity refs when present must agree with workId
  for (const inp of der.inputs) {
    if (inp.identityRef && String(inp.identityRef).trim()) {
      const ref = String(inp.identityRef).trim();
      if (ref !== input.workId && !ref.includes("0815-04") && !String(input.workId).includes(ref)) {
        // Allow KNR tableCode refs that match leaf; strict: if looks like workId and differs → HOLD
        if (ref.startsWith("cw.") && ref !== input.workId) {
          return {
            ok: false,
            reason: "IDENTITY_AMBIGUOUS",
            messagePl: `input identityRef „${ref}” ≠ workId „${input.workId}” — HOLD.`,
          };
        }
      }
    }
  }

  const fresh = validateDerivedLaborFreshness({ derivation: der });
  if (!fresh.ok) return fresh;

  const evalResult = evalDerivedLaborFormula({
    formulaId: der.formulaId,
    formulaVersion: der.formulaVersion,
    normRgPerUnit: norm.inputValue,
    normUnit: norm.inputUnit,
    costRatePlnPerRg: rate.inputValue,
    costRateUnit: rate.inputUnit,
    resultUnit: input.unit,
  });
  if (!evalResult.ok) {
    return {
      ok: false,
      reason: evalResult.reason === "UNIT_HOLD" ? "UNIT_HOLD" : "UNKNOWN_FORMULA",
      messagePl: evalResult.messagePl,
    };
  }

  const claimed = Number(input.pricePoint);
  if (!Number.isFinite(claimed) || Math.abs(claimed - evalResult.resultPln) > 0.01) {
    return {
      ok: false,
      reason: "RESULT_MISMATCH",
      messagePl: `pricePoint ${claimed} ≠ formula result ${evalResult.resultPln} — HOLD.`,
    };
  }

  return { ok: true, resultPln: evalResult.resultPln, resultUnit: evalResult.resultUnit };
}

/**
 * Validate a fully built observation (including host-lock caller).
 */
export function validateDerivedLaborObservation(
  o: LaborSourceEvidenceObservation,
): DerivedLaborValidateResult {
  return validateDerivedLaborEvidence({
    workId: o.workId,
    unit: o.unit,
    pricePoint: o.pricePoint,
    priceKind: o.priceKind,
    derivation: o.derivation,
  });
}
