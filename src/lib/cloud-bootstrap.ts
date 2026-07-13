/** Po udanym batch-get + merge w CloudLoader — wycisz auto runCloudSync (debounce 2 s). */
export const BOOTSTRAP_AUTO_SYNC_SUPPRESS_MS = 60_000;

let lastSuccessfulBootstrapAt = 0;

/**
 * PAYROLL-P0-FIX-01 — in-memory handoff po udanym merge payroll,
 * gdy localStorage.setItem padnie (QuotaExceeded). App czyta to w useLocalStorage.init.
 */
export type BootstrapPayrollHandoff = {
  weekEmployees: unknown[];
  weekFrom: string;
  weekTo: string;
};

let bootstrapPayrollHandoff: BootstrapPayrollHandoff | null = null;

/** Wywołaj po pomyślnym bootstrapie CloudLoader (batch-get + merge do LS). */
export function markCloudBootstrapSuccess(): void {
  lastSuccessfulBootstrapAt = Date.now();
}

/** Zwraca timestamp do którego auto runCloudSync ma być wstrzymany (0 = brak bootstrapu). */
export function initialAutoSyncSuppressUntil(): number {
  if (lastSuccessfulBootstrapAt <= 0) return 0;
  return lastSuccessfulBootstrapAt + BOOTSTRAP_AUTO_SYNC_SUPPRESS_MS;
}

/** Publikuj zmergowany roster przed open SUCCESS — niezależnie od wyniku setItem. */
export function publishBootstrapPayrollHandoff(input: BootstrapPayrollHandoff): void {
  if (!Array.isArray(input.weekEmployees) || input.weekEmployees.length === 0) return;
  bootstrapPayrollHandoff = {
    weekEmployees: input.weekEmployees,
    weekFrom: input.weekFrom || "",
    weekTo: input.weekTo || "",
  };
}

/** Odczyt bez kasowania — trzy klucze (employees/from/to) mogą czytać w dowolnej kolejności. */
export function peekBootstrapPayrollHandoff(): BootstrapPayrollHandoff | null {
  return bootstrapPayrollHandoff;
}

/** Tylko testy. */
export function clearBootstrapPayrollHandoffForTests(): void {
  bootstrapPayrollHandoff = null;
}
