/**
 * PAYROLL AKORD Phase 1 — compensation model (Kadry / directory).
 * Missing / invalid → hourly. No destructive migration.
 */

export type PayrollCompensationModel = "hourly" | "akord";

export const PAYROLL_COMPENSATION_MODEL_HOURLY: PayrollCompensationModel = "hourly";
export const PAYROLL_COMPENSATION_MODEL_AKORD: PayrollCompensationModel = "akord";

export function normalizePayrollCompensationModel(raw: unknown): PayrollCompensationModel {
  return raw === "akord" ? "akord" : "hourly";
}

export function directoryCompensationModel(
  emp: { compensationModel?: unknown } | null | undefined,
): PayrollCompensationModel {
  return normalizePayrollCompensationModel(emp?.compensationModel);
}

/** Snapshot on WeekEmployee: missing = hourly (legacy weeks stay hourly). */
export function weekEmployeeCompensationModel(
  emp: { compensationModel?: unknown } | null | undefined,
): PayrollCompensationModel {
  return normalizePayrollCompensationModel(emp?.compensationModel);
}

export function isAkordWeekEmployee(
  emp: { compensationModel?: unknown } | null | undefined,
): boolean {
  return weekEmployeeCompensationModel(emp) === "akord";
}

function parseIsoTs(v: unknown): number {
  if (typeof v !== "string" || !v) return 0;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Stamp compensationModel + compensationModelUpdatedAt when the model changes.
 * Does not bump unrelated fields. Caller still relies on directory `updatedAt` via persist.
 */
export function stampDirectoryCompensationModel<T extends {
  compensationModel?: unknown;
  compensationModelUpdatedAt?: string;
}>(
  prev: T | null | undefined,
  next: T,
  nowIso: string,
): T {
  const from = directoryCompensationModel(prev);
  const to = directoryCompensationModel(next);
  if (from === to) {
    return {
      ...next,
      compensationModel: prev?.compensationModel,
      compensationModelUpdatedAt: prev?.compensationModelUpdatedAt,
    };
  }
  return {
    ...next,
    compensationModel: to,
    compensationModelUpdatedAt: nowIso,
  };
}

/** Whole-record directory LWW helper for tests / docs — newer compensationModelUpdatedAt wins the model field. */
export function pickCompensationModelForMerge(
  local: { compensationModel?: unknown; compensationModelUpdatedAt?: string; updatedAt?: string },
  cloud: { compensationModel?: unknown; compensationModelUpdatedAt?: string; updatedAt?: string },
): PayrollCompensationModel {
  const lField = parseIsoTs(local.compensationModelUpdatedAt);
  const cField = parseIsoTs(cloud.compensationModelUpdatedAt);
  if (lField && cField && lField !== cField) {
    return lField > cField ? directoryCompensationModel(local) : directoryCompensationModel(cloud);
  }
  if (lField && !cField) return directoryCompensationModel(local);
  if (cField && !lField) return directoryCompensationModel(cloud);
  const lRec = parseIsoTs(local.updatedAt);
  const cRec = parseIsoTs(cloud.updatedAt);
  if (lRec && cRec && lRec !== cRec) {
    return lRec > cRec ? directoryCompensationModel(local) : directoryCompensationModel(cloud);
  }
  return directoryCompensationModel(local);
}
