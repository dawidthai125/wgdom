/**
 * PAYROLL AKORD Phase 4C — commit piecework mutations via Phase 4A CAS only.
 */

import {
  PieceworkCloudUnreadableError,
  PieceworkStaleRevisionError,
  pushPayrollPieceworkToCloudSafe,
} from "@/lib/payroll-piecework-cloud-push";
import { PieceworkInvariantViolatedError } from "@/lib/payroll-piecework-invariant";
import type { PieceworkOpResult } from "@/lib/payroll-piecework";
import {
  emptyPayrollPieceworkState,
  normalizePayrollPieceworkState,
  type PayrollPieceworkState,
} from "@/lib/payroll-piecework-types";

export type PieceworkCommitFailure = {
  ok: false;
  code:
    | "local_reject"
    | "piecework_invariant_violated"
    | "piecework_stale_revision"
    | "piecework_cloud_unreadable"
    | "unknown";
  message: string;
  localError?: string;
};

export type PieceworkCommitSuccess = {
  ok: true;
  state: PayrollPieceworkState;
};

export type PieceworkCommitResult = PieceworkCommitSuccess | PieceworkCommitFailure;

const LOCAL_ERROR_PL: Record<string, string> = {
  invalid_agreed_amount: "Nieprawidłowa uzgodniona kwota.",
  advance_exceeds_agreed: "Suma zaliczek przekracza uzgodnioną kwotę.",
  invalid_amount: "Nieprawidłowa kwota zaliczki.",
  invalid_job_id: "Wybierz robotę z listy.",
  invalid_directory_id: "Brak pracownika (directoryId).",
  invalid_id: "Nieprawidłowy identyfikator.",
  not_found: "Nie znaleziono rekordu.",
  already_deleted: "Rekord jest już usunięty.",
  duplicate_job: "PieceworkJob dla tej roboty już istnieje.",
};

export function pieceworkLocalErrorMessage(code: string | undefined): string {
  if (!code) return "Operacja odrzucona.";
  return LOCAL_ERROR_PL[code] ?? `Operacja odrzucona (${code}).`;
}

/**
 * Apply a pure domain op, then CAS-push. Never silently succeeds.
 */
export async function commitPieceworkOp(
  current: PayrollPieceworkState | null | undefined,
  apply: (state: PayrollPieceworkState) => PieceworkOpResult,
): Promise<PieceworkCommitResult> {
  const base = normalizePayrollPieceworkState(current ?? emptyPayrollPieceworkState());
  const local = apply(base);
  if (!local.ok) {
    return {
      ok: false,
      code: "local_reject",
      message: pieceworkLocalErrorMessage(local.error),
      localError: local.error,
    };
  }
  return commitPieceworkState(local.state);
}

export async function commitPieceworkState(
  candidate: PayrollPieceworkState,
): Promise<PieceworkCommitResult> {
  try {
    const state = await pushPayrollPieceworkToCloudSafe(candidate);
    return { ok: true, state };
  } catch (e) {
    if (e instanceof PieceworkInvariantViolatedError) {
      return {
        ok: false,
        code: "piecework_invariant_violated",
        message: `Limit uzgodnionej kwoty: zaliczki ${e.activeAdvancesSum} PLN > ${e.agreedAmount} PLN.`,
      };
    }
    if (e instanceof PieceworkStaleRevisionError) {
      return {
        ok: false,
        code: "piecework_stale_revision",
        message: "Konflikt zapisu (inny urządzenie). Odśwież listę i spróbuj ponownie.",
      };
    }
    if (e instanceof PieceworkCloudUnreadableError) {
      return {
        ok: false,
        code: "piecework_cloud_unreadable",
        message: "Chmura niedostępna — zapis akordu zablokowany (fail closed).",
      };
    }
    const msg = e instanceof Error ? e.message : "Nieznany błąd zapisu akordu.";
    return { ok: false, code: "unknown", message: msg };
  }
}
